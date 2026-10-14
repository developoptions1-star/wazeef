const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class SqlJsWrapper {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.db = null;
    this._dirty = false;
  }

  async init() {
    const candidates = [
      path.join(path.dirname(process.argv[1] || __dirname), 'sql-wasm.wasm'),
      path.join(__dirname, 'sql-wasm.wasm'),
      path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join(path.dirname(process.argv[1] || __dirname), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      path.join('/app', 'sql-wasm.wasm'),
      path.join('/app', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    ];
    let wasmPath = null;
    for (const c of candidates) {
      if (fs.existsSync(c)) { wasmPath = c; break; }
    }
    console.log('WASM path:', wasmPath || 'NOT FOUND - using default');
    const opts = wasmPath ? { locateFile: () => wasmPath } : undefined;
    const SQL = await initSqlJs(opts);
    this._SQL = SQL;
    if (fs.existsSync(this.dbPath)) {
      const buf = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }
    this._save();
    this._installCrashHandlers();
    return this;
  }

  // Write to a temp file first, then atomically rename over app.db so a crash
  // mid-write can never truncate/corrupt the database file.
  _save() {
    if (this._saving) return;
    this._saving = true;
    try {
      const data = this.db.export();
      const tmp = this.dbPath + '.saving';
      fs.writeFileSync(tmp, Buffer.from(data));
      try {
        fs.renameSync(tmp, this.dbPath);
      } catch (e) {
        // Windows: rename over an existing file can fail; fall back to copy
        fs.copyFileSync(tmp, this.dbPath);
        try { fs.unlinkSync(tmp); } catch (e2) {}
      }
      this._dirty = false;
      this._lastSaveError = null;
    } catch (e) {
      this._lastSaveError = e.message;
      console.error('DB save error:', e.message);
      this._dirty = true;
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => { this._saving = false; this._save(); }, 1000);
    } finally {
      this._saving = false;
    }
  }

  // Synchronous flush used on shutdown / fatal errors.
  flushNow() {
    clearTimeout(this._saveTimer);
    this._save();
  }

  _installCrashHandlers() {
    const flush = () => { try { this.flushNow(); } catch (e) {} };
    process.once('exit', flush);
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGUSR2']) {
      process.once(sig, () => {
        flush();
        try { process.exit(0); } catch (e) {}
      });
    }
  }

  _markDirty() {
    this._dirty = true;
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._save(), 300);
  }

  // Re-read the database file from disk (used after restoring an auto-backup)
  reload() {
    clearTimeout(this._saveTimer);
    if (!this._SQL || !fs.existsSync(this.dbPath)) return;
    const buf = fs.readFileSync(this.dbPath);
    const fresh = new this._SQL.Database(buf);
    try { this.db.close(); } catch (e) {}
    this.db = fresh;
    this._dirty = false;
  }

  exec(sql) {
    try { this.db.exec(sql); } catch (e) { if (!e.message.includes('duplicate') && !e.message.includes('already exists') && !e.message.includes('no such table')) throw e; }
    this._markDirty();
    return [];
  }

  pragma(sql) {
    try { this.db.exec('PRAGMA ' + sql); } catch (e) {}
    return this;
  }

  prepare(sql) {
    return new SqlJsStatement(this, sql);
  }

  close() {
    clearTimeout(this._saveTimer);
    this._save();
    this.db.close();
  }
}

class SqlJsStatement {
  constructor(wrapper, sql) {
    this.wrapper = wrapper;
    this.sql = sql;
    this.params = [];
    this._stmt = null;
  }

  _bindParams(args) {
    const flat = [];
    for (const a of args) {
      if (Array.isArray(a)) flat.push(...a);
      else flat.push(a);
    }
    return flat;
  }

  run(...args) {
    const params = this._bindParams(args);
    try {
      this.wrapper.db.run(this.sql, params);
      this.wrapper._markDirty();
      const changes = this.wrapper.db.getRowsModified();
      let lastInsertRowid = null;
      try {
        const res = this.wrapper.db.exec('SELECT last_insert_rowid() as id');
        if (res.length && res[0].values.length) lastInsertRowid = res[0].values[0][0];
      } catch (e) {}
      return { changes, lastInsertRowid };
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (msg.includes('duplicate') || msg.includes('already exists')) return { changes: 0, lastInsertRowid: null };
      throw e;
    }
  }

  get(...args) {
    const params = this._bindParams(args);
    try {
      const results = this.wrapper.db.exec(this.sql, params);
      if (!results.length || !results[0].values.length) return undefined;
      const cols = results[0].columns;
      const row = results[0].values[0];
      const obj = {};
      cols.forEach((c, i) => obj[c] = row[i]);
      return obj;
    } catch (e) {
      return undefined;
    }
  }

  all(...args) {
    const params = this._bindParams(args);
    try {
      const results = this.wrapper.db.exec(this.sql, params);
      if (!results.length) return [];
      const cols = results[0].columns;
      return results[0].values.map(row => {
        const obj = {};
        cols.forEach((c, i) => obj[c] = row[i]);
        return obj;
      });
    } catch (e) {
      return [];
    }
  }
}

let _wrapper = null;

async function openDb(dbPath) {
  if (!_wrapper) {
    _wrapper = new SqlJsWrapper(dbPath);
    await _wrapper.init();
  }
  return _wrapper;
}

module.exports = { openDb, SqlJsWrapper };
