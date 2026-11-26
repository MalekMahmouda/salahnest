'use strict';

/**
 * Tiny synchronous JSON file store — no external dependency.
 * Lazily resolves its directory (Electron app.getPath may not be available
 * before app is ready, so `dir` is passed as a function).
 */

const fs = require('fs');
const path = require('path');

class JsonStore {
  constructor({ dir, name = 'store', defaults = {} }) {
    this._dirFn = dir;
    this._name = name;
    this._defaults = { ...defaults };
    this._data = { ...this._defaults };
    this._loaded = false;
    this.lastError = null;
  }

  get file() {
    return path.join(this._dirFn(), `${this._name}.json`);
  }

  _load() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      const raw = fs.readFileSync(this.file, 'utf8');
      this._data = { ...this._defaults, ...JSON.parse(raw) };
    } catch (e) {
      if (e && e.code === 'ENOENT') return; // first run: keep defaults
      // Unreadable or corrupt file: keep a copy so the data is not lost when
      // the next save overwrites it, and remember the error for diagnostics.
      this.lastError = e;
      try { console.error(`[JsonStore] cannot read ${this.file}: ${e && e.message}`); } catch (e2) { /* ignore */ }
      try { fs.copyFileSync(this.file, `${this.file}.corrupt-${Date.now()}`); } catch (e3) { /* ignore */ }
    }
  }

  _save() {
    try {
      const dir = this._dirFn();
      fs.mkdirSync(dir, { recursive: true });
      // v1.4.0: write to a temp file then rename — a crash mid-write used to
      // truncate the real file and silently reset every setting.
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this._data, null, 2), 'utf8');
      fs.renameSync(tmp, this.file);
    } catch (e) {
      // Persistence stays best-effort (never throws into the app), but the
      // failure is recorded and logged instead of being swallowed silently.
      this.lastError = e;
      try { console.error(`[JsonStore] cannot save ${this.file}: ${e && e.message}`); } catch (e2) { /* ignore */ }
    }
  }

  get(key, defaultValue) {
    this._load();
    return key in this._data ? this._data[key] : defaultValue;
  }

  set(key, value) {
    this._load();
    this._data[key] = value;
    this._save();
  }

  delete(key) {
    this._load();
    delete this._data[key];
    this._save();
  }

  has(key) {
    this._load();
    return key in this._data;
  }

  get store() {
    this._load();
    return { ...this._data };
  }
}

module.exports = JsonStore;
