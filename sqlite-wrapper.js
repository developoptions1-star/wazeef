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
    const wasmPath = path.join(path.dirname(process.argv[1] || __dirname), 'sql-wasm.wasm');
    const locFile = fs.existsSync(wasmPath) ? wasmPath : undefined;
    const SQL = await initSqlJs(locFile ? { locateFile: () => wasmPath } : undefined);
    if (fs.existsSync(this.dbPath)) {
      const buf = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(buf);
    } else {
      this.db = new SQL.Database();
    }
    this._save();
    return this;
  }

  _save() {
    try {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    } catch (e) { console.error('DB save error:', e.message); }
  }

  _markDirty() {
    this._dirty = true;
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
      if (e.message.includes('duplicate') || e.message.includes('already exists')) return { changes: 0, lastInsertRowid: null };
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
