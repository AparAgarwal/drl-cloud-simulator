const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  constructor() {
    this.level = LEVELS.debug;
    this.buffer = this._load() || [];
    this.socket = null;
  }

  _now() {
    return new Date().toISOString();
  }

  _save() {
    try { localStorage.setItem('drl_logs', JSON.stringify(this.buffer.slice(-1000))); } catch (e) {}
  }

  _load() {
    try { return JSON.parse(localStorage.getItem('drl_logs') || '[]'); } catch (e) { return []; }
  }

  setLevel(lvl) {
    if (typeof lvl === 'string' && LEVELS[lvl] !== undefined) this.level = LEVELS[lvl];
  }

  setSocket(sock) {
    this.socket = sock;
  }

  _push(entry) {
    this.buffer.push(entry);
    this._save();
    if (this.socket && this.socket.connected) {
      try { this.socket.emit('log', { level: entry.level, msg: entry.msg, time: entry.time }); } catch (e) {}
    }
  }

  log(level, msg, meta) {
    const lvl = typeof level === 'string' ? level : 'info';
    if (LEVELS[lvl] < this.level) return;
    const entry = { time: this._now(), level: lvl, msg: String(msg), meta: meta || null };
    // Console mirror for developer
    const out = `[${entry.time}] [${entry.level.toUpperCase()}] ${entry.msg}` + (meta ? ` ${JSON.stringify(meta)}` : '');
    if (lvl === 'error') console.error(out);
    else if (lvl === 'warn') console.warn(out);
    else if (lvl === 'debug') console.debug(out);
    else console.log(out);
    this._push(entry);
  }

  debug(msg, meta) { this.log('debug', msg, meta); }
  info(msg, meta) { this.log('info', msg, meta); }
  warn(msg, meta) { this.log('warn', msg, meta); }
  error(msg, meta) { this.log('error', msg, meta); }

  getEntries() { return this.buffer.slice(); }

  exportText() {
    return this.buffer.map(e => `[${e.time}] [${e.level.toUpperCase()}] ${e.msg}` + (e.meta ? ` ${JSON.stringify(e.meta)}` : '')).join('\n');
  }
}

const logger = new Logger();
export default logger;
