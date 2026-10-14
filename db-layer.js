// db-layer.js — unified async database layer for Wazeef.
//
// Drivers (selected automatically):
//   * sqljs (default) — local file via sql.js, same behavior as the old wrapper
//   * pg              — cloud PostgreSQL (e.g. Supabase) when DB_DRIVER=pg and DATABASE_URL set
//
// Unified async API used by server.js:
//   db.prepare(sql).run(...params)  -> { changes, lastInsertRowid }
//   db.prepare(sql).get(...params)  -> row object | undefined
//   db.prepare(sql).all(...params)  -> array of row objects
//   db.exec(sql)                    -> run one or many statements (SQLite-style multi-statement OK)
//   db._save() / db.flushNow() / db.reload() -> persistence hooks (no-ops on pg)
//   db.driverName                   -> 'sqljs' | 'pg'

const fs = require('fs');

function flattenParams(args) {
  const flat = [];
  for (const a of args) {
    if (Array.isArray(a)) flat.push(...a);
    else flat.push(a);
  }
  return flat;
}

// Convert `?` placeholders to $1..$n for PostgreSQL, skipping ? inside quotes
function toDollarParams(sql) {
  let out = '';
  let n = 0;
  let inStr = null;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (inStr) {
      out += ch;
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"') { inStr = ch; out += ch; continue; }
    if (ch === '?') { out += '$' + (++n); continue; }
    out += ch;
  }
  return out;
}

// ---------------------------------------------------------------------------
// sql.js driver — local file (dev / fallback). Async façade over the old sync wrapper.
// ---------------------------------------------------------------------------
class SqlJsDriver {
  constructor() {
    this.driverName = 'sqljs';
    this.wrapper = null;
  }
  async init(dbPath) {
    const { openDb } = require('./sqlite-wrapper');
    this.wrapper = await openDb(dbPath);
    return this;
  }
  prepare(sql) {
    const st = this.wrapper.prepare(sql);
    return {
      run: async (...a) => st.run(...flattenParams(a)),
      get: async (...a) => st.get(...flattenParams(a)),
      all: async (...a) => st.all(...flattenParams(a)),
    };
  }
  async exec(sql) { this.wrapper.exec(sql); }
  async _save() { try { this.wrapper._save(); } catch (e) {} }
  async flushNow() { try { this.wrapper.flushNow(); } catch (e) {} }
  async reload() { try { this.wrapper.reload(); } catch (e) {} }
  async close() { try { this.wrapper.close(); } catch (e) {} }
  // Raw sql.js Database handle (used by a few special-case call sites)
  get db() { return this.wrapper ? this.wrapper.db : null; }
}

// ---------------------------------------------------------------------------
// PostgreSQL driver — cloud database. Single pooled connection (max:1) so that
// session-level helpers like lastval() behave like SQLite's last_insert_rowid().
// ---------------------------------------------------------------------------
class PgDriver {
  constructor() {
    this.driverName = 'pg';
    this.pool = null;
  }
  async init(url) {
    const { Pool, types } = require('pg');
    // PG returns bigint (COUNT(*) etc.) as strings — parse to Number like SQLite does
    types.setTypeParser(20, v => (v === null ? null : parseInt(v, 10)));

    // Build a list of connection variants to try
    const variants = [];
    // 1) original URL as-is
    variants.push({ label: 'original', url });
    // 2) sslmode=require variant
    try {
      const u = new URL(url);
      u.searchParams.set('sslmode', 'require');
      variants.push({ label: 'sslmode=require', url: u.toString() });
    } catch (_) {}
    // 3) pooler transaction mode (6543)
    try {
      const u = new URL(url);
      if (u.port === '5432') {
        u.port = '6543';
        u.searchParams.set('sslmode', 'require');
        variants.push({ label: 'pooler-6543', url: u.toString() });
      }
    } catch (_) {}
    // 4) direct db.*.supabase.co (no rewrite — in case pooler IP is blocked but direct works)
    try {
      const u = new URL(process.env.DATABASE_URL || url);
      if (/pooler\.supabase\.co$/i.test(u.hostname)) {
        const ref = u.username.replace(/^postgres\./, '');
        u.hostname = 'db.' + ref + '.supabase.co';
        u.port = '5432';
        u.username = 'postgres';
        u.searchParams.set('sslmode', 'require');
        variants.push({ label: 'direct-db', url: u.toString() });
      }
    } catch (_) {}

    let lastErr;
    for (const v of variants) {
      console.log('PG trying:', v.label);
      let pool;
      try {
        pool = new Pool({
          connectionString: v.url,
          max: 1,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 60000,
          allowExitOnIdle: false,
        });
        pool.on('error', (err) => {
          console.log('PG pool idle error (ignored):', err.message);
        });
        // Quick ping with short timeout
        await Promise.race([
          pool.query('SELECT 1'),
          new Promise((_, rej) => setTimeout(() => rej(new Error('connect timeout')), 15000)),
        ]);
        this.pool = pool;
        console.log('PG connected via:', v.label);
        return this;
      } catch (e) {
        lastErr = e;
        console.log('PG', v.label, 'failed:', (e && e.message) || e);
        try { pool && pool.end(); } catch (_) {}
      }
    }
    throw lastErr || new Error('All PG connection variants failed');
  }

  // Run a query with retry on transient network errors (ECONNREFUSED / ETIMEDOUT / terminate)
  async _query(sql, params) {
    const isNetwork = (e) => /ECONNREFUSED|ETIMEDOUT|ECONNRESET|Connection terminated|timeout|Client has encountered a connection error/i.test((e && e.message) || '');
    let lastErr;
    for (let i = 0; i < 4; i++) {
      try {
        return await this.pool.query(sql, params);
      } catch (e) {
        if (!isNetwork(e) || i === 3) throw e;
        lastErr = e;
        console.log('PG query retry', i + 1, ':', e.message);
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
    throw lastErr;
  }

  // Translate SQLite-flavored SQL to PostgreSQL
  _prep(sql) {
    let s = sql;
    const pragma = s.match(/^\s*PRAGMA\s+table_info\((\w+)\)\s*$/i);
    if (pragma) {
      return toDollarParams(
        "SELECT column_name AS name FROM information_schema.columns WHERE table_name = '" +
        pragma[1] + "' ORDER BY ordinal_position"
      );
    }
    // sqlite_master catalog shim (used by wipeAllData / backup tooling)
    if (/sqlite_master/i.test(s) && /type\s*=\s*'table'/i.test(s)) {
      return toDollarParams(
        "SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE 'sql_%'"
      );
    }
    s = s.replace(/INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    // Keep date columns as TEXT (same on-disk format as SQLite) so all the
    // existing string comparisons / substr() logic keeps working unchanged.
    s = s.replace(/\bDATETIME\s+DEFAULT\s+CURRENT_TIMESTAMP\b/gi, "TEXT DEFAULT to_char(localtimestamp, 'YYYY-MM-DD HH24:MI:SS')");
    s = s.replace(/\bDATETIME\b/gi, 'TEXT');
    s = s.replace(/last_insert_rowid\(\)/gi, 'lastval()');
    s = s.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');
    s = s.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');
    s = s.replace(/\bIFNULL\s*\(/gi, 'COALESCE(');
    // SQLite scalar max(a,b)/min(a,b) -> PG GREATEST/LEAST (1-arg MAX/MIN stays aggregate)
    s = this._replaceFunc(s, /\bMAX\s*\(/gi, (args) => {
      if (args.length >= 2) return 'GREATEST(' + args.join(', ') + ')';
      return 'MAX(' + args.join(', ') + ')';
    });
    s = this._replaceFunc(s, /\bMIN\s*\(/gi, (args) => {
      if (args.length >= 2) return 'LEAST(' + args.join(', ') + ')';
      return 'MIN(' + args.join(', ') + ')';
    });
    s = this._replaceFunc(s, /GROUP_CONCAT\s*\(/gi, (args) => {
      let expr = (args[0] || '').trim();
      const sep = (args[1] || "','").trim() || "','";
      const distinct = /^DISTINCT\s+/i.test(expr);
      if (distinct) expr = expr.replace(/^DISTINCT\s+/i, '');
      return 'STRING_AGG(' + (distinct ? 'DISTINCT ' : '') + '(' + expr + ')::text, ' + sep + ')';
    });
    // strftime('%Y', col) -> CAST(EXTRACT(YEAR FROM col::timestamp) AS INTEGER)-ish
    s = s.replace(/strftime\s*\(\s*'%Y'\s*,\s*/gi, 'EXTRACT(YEAR FROM ');
    s = this._replaceDateTime(s);
    return toDollarParams(s);
  }

  // Generic paren-aware function-call replacer: finds fn( ... ) and rebuilds via cb(args[])
  _replaceFunc(s, re, cb) {
    let out = '';
    let i = 0;
    const src = s;
    while (i < src.length) {
      re.lastIndex = i;
      const m = re.exec(src);
      if (!m) { out += src.slice(i); break; }
      out += src.slice(i, m.index);
      let depth = 0, j = m.index + m[0].length - 1;
      for (; j < src.length; j++) {
        if (src[j] === '(') depth++;
        else if (src[j] === ')') { depth--; if (depth === 0) break; }
      }
      const inner = src.slice(m.index + m[0].length, j);
      const args = [];
      let cur = '', d = 0, inQ = null;
      for (const ch of inner) {
        if (inQ) { cur += ch; if (ch === inQ) inQ = null; continue; }
        if (ch === "'" || ch === '"') { inQ = ch; cur += ch; continue; }
        if (ch === '(') d++;
        if (ch === ')') d--;
        if (ch === ',' && d === 0) { args.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) args.push(cur);
      out += cb(args);
      i = j + 1;
    }
    return out;
  }

  // Paren-aware replacement of sqlite datetime(...) calls
  _replaceDateTime(s) {
    const fmt = "'YYYY-MM-DD HH24:MI:SS'";
    let out = '';
    let i = 0;
    while (i < s.length) {
      const idx = s.toLowerCase().indexOf('datetime(', i);
      if (idx === -1) { out += s.slice(i); break; }
      out += s.slice(i, idx);
      let depth = 0, j = idx + 'datetime('.length - 1;
      for (; j < s.length; j++) {
        if (s[j] === '(') depth++;
        else if (s[j] === ')') { depth--; if (depth === 0) break; }
      }
      const inner = s.slice(idx + 'datetime('.length, j);
      const args = [];
      let cur = '', d = 0, inQ = null;
      for (const ch of inner) {
        if (inQ) { cur += ch; if (ch === inQ) inQ = null; continue; }
        if (ch === "'" || ch === '"') { inQ = ch; cur += ch; continue; }
        if (ch === '(') d++;
        if (ch === ')') d--;
        if (ch === ',' && d === 0) { args.push(cur); cur = ''; continue; }
        cur += ch;
      }
      if (cur.trim()) args.push(cur);
      const first = (args[0] || '').trim();
      if (/^'now'$/i.test(first)) {
        out += 'to_char(localtimestamp, ' + fmt + ')';
      } else {
        out += 'to_char((' + first + ')::timestamp, ' + fmt + ')';
      }
      i = j + 1;
    }
    return out;
  }

  _swallow(err) {
    const msg = (err && err.message) || '';
    return /already exists|duplicate key|unique constraint|multiple default values|cannot change column type/i.test(msg);
  }

  async exec(sql) {
    // SQLite exec() allows many statements separated by ';' — split and run each
    const stmts = String(sql).split(';');
    for (let raw of stmts) {
      const st = raw.trim();
      if (!st) continue;
      if (/^--/.test(st)) continue;
      try {
        await this._query(this._prep(st));
      } catch (e) {
        if (this._swallow(e)) continue;
        throw e;
      }
    }
  }

  prepare(sql) {
    // For INSERT statements, append RETURNING id so lastInsertRowid works like
    // SQLite's last_insert_rowid(). Skip if the SQL already has RETURNING.
    let q = this._prep(sql);
    if (/^\s*INSERT\s+INTO/i.test(sql) && !/\bRETURNING\b/i.test(sql)) {
      q += ' RETURNING id';
    }
    const self = this;
    const sw = (e) => this._swallow(e);
    return {
      async run(...a) {
        try {
          const r = await self._query(q, flattenParams(a));
          let lastInsertRowid = null;
          if (r.rows && r.rows[0] && r.rows[0].id !== undefined) lastInsertRowid = r.rows[0].id;
          return { changes: r.rowCount, lastInsertRowid };
        } catch (e) {
          if (/duplicate key|unique constraint/i.test(e.message || '')) return { changes: 0, lastInsertRowid: null };
          throw e;
        }
      },
      async get(...a) {
        const r = await self._query(q, flattenParams(a));
        return r.rows && r.rows.length ? r.rows[0] : undefined;
      },
      async all(...a) {
        const r = await self._query(q, flattenParams(a));
        return r.rows || [];
      },
    };
  }
  async _save() {}
  async flushNow() {}
  async reload() {}
  // After loading a dump with explicit IDs, bump every serial sequence past MAX(id)
  // so new INSERTs don't collide with restored rows.
  async resetSequences() {
    const r = await this.pool.query(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'"
    );
    for (const row of r.rows) {
      const t = '"' + String(row.table_name).replace(/"/g, '""') + '"';
      const c = '"' + String(row.column_name).replace(/"/g, '""') + '"';
      try {
        await this.pool.query(
          'SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX(' + c + ') FROM ' + t + '), 0) + 1, false)',
          [row.table_name, row.column_name]
        );
      } catch (e) {}
    }
  }
  async close() { try { await this.pool.end(); } catch (e) {} }
  get db() { return null; } // binary sql.js export not available in pg mode
}

let _db = null;

// Rewrite Supabase direct connection (db.*.supabase.co:5432, IPv6-only) to the
// session pooler endpoint (aws-0-eu-west-1.pooler.supabase.com:5432, IPv4+IPv6).
// The pooler uses username `postgres.<project-ref>` instead of `postgres`.
function rewriteSupabaseUrl(url) {
  let u;
  try { u = new URL(url); } catch (_) { return url; }
  if (!/\.supabase\.co$/i.test(u.hostname)) return url;
  if (!/^db\./i.test(u.hostname)) return url;
  const ref = u.hostname.replace(/^db\./i, '').replace(/\.supabase\.co$/i, '');
  u.hostname = 'aws-0-eu-west-1.pooler.supabase.com';
  u.port = '5432';
  if (u.username === 'postgres') u.username = 'postgres.' + ref;
  console.log('DB: rewritten Supabase direct → pooler:', u.hostname + ':' + u.port, 'user=' + u.username);
  return u.toString();
}

async function openUnifiedDb(opts) {
  if (_db) return _db;
  if (process.env.DB_DRIVER === 'pg' && process.env.DATABASE_URL) {
    const url = rewriteSupabaseUrl(process.env.DATABASE_URL);
    // Try session pooler (5432), then transaction pooler (6543), then sqljs fallback
    const hosts = [url];
    try {
      const u2 = new URL(url);
      if (u2.port === '5432') {
        u2.port = '6543';
        hosts.push(u2.toString());
      }
    } catch (_) {}
    let lastErr;
    for (const h of hosts) {
      try {
        _db = await new PgDriver().init(h);
        console.log('DB driver: PostgreSQL (cloud)', new URL(h).port === '6543' ? '(transaction pooler)' : '');
        return _db;
      } catch (e) {
        lastErr = e;
        console.log('PG failed on port', new URL(h).port + ':', e.message);
      }
    }
    // All PG attempts failed — fall back to local sql.js so the server still boots
    console.log('PG unreachable — falling back to sql.js (local file). Error:', lastErr && lastErr.message);
  }
  _db = await new SqlJsDriver().init(opts.dbPath);
  console.log('DB driver: sql.js (local file)');
  return _db;
}

module.exports = { openUnifiedDb, rewriteSupabaseUrl };
