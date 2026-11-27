// Transports réseau. Le client parle le même protocole JSON à :
//  - un serveur Node (WebSocket) : le vrai MMO en ligne ;
//  - une simulation locale (solo hors-ligne, même code que le serveur).
export class WSNet {
  constructor(url) { this.url = url; this.ws = null; this.onmsg = () => {}; this.onclose = () => {}; this.kind = 'online'; }
  connect(timeout = 4000) {
    return new Promise((res, rej) => {
      let done = false;
      try { this.ws = new WebSocket(this.url); } catch (e) { rej(e); return; }
      const t = setTimeout(() => { if (!done) { done = true; try { this.ws.close(); } catch (e) { /* */ } rej(new Error('délai dépassé')); } }, timeout);
      this.ws.onopen = () => { if (done) return; done = true; clearTimeout(t); res(this); };
      this.ws.onerror = () => { if (done) return; done = true; clearTimeout(t); rej(new Error('connexion impossible')); };
      this.ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (err) { return; } this.onmsg(m); };
      this.ws.onclose = () => { if (done) this.onclose(); };
    });
  }
  send(m) { if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(m)); }
  close() { try { this.ws.close(); } catch (e) { /* */ } }
}

// Sauvegarde locale du navigateur (mode solo)
// LStudio : pendant un aperçu, les sauvegardes vont dans un espace à part (mm_apercu_…) ; on part d'une copie du vrai
// pirate, qui, lui, n'est jamais réécrit
export class BrowserStorage {
  constructor() { this.prefix = window.MM_APERCU ? 'mm_apercu_' : 'mm_save_'; }
  async auth(key) {
    try {
      let s = localStorage.getItem(this.prefix + key);
      if (!s && this.prefix !== 'mm_save_') s = localStorage.getItem('mm_save_' + key); // la copie du vrai pirate, en lecture seule
      return { ok: true, data: s ? JSON.parse(s) : null };
    } catch (e) { return { ok: true, data: this.mem && this.mem[key] || null }; }
  }
  async save(key, data) {
    try { localStorage.setItem(this.prefix + key, JSON.stringify(data)); } catch (e) { this.mem = this.mem || {}; this.mem[key] = data; }
  }
}

export class LocalNet {
  constructor() { this.onmsg = () => {}; this.onclose = () => {}; this.kind = 'solo'; }
  async connect() {
    const { Game } = await import('../server/game.js');
    this.game = new Game({ storage: new BrowserStorage(), solo: true, log: () => {} });
    this.conn = { send: (o) => { const c = JSON.parse(JSON.stringify(o)); queueMicrotask(() => this.onmsg(c)); }, close: () => {} };
    this.game.addClient(this.conn);
    let last = performance.now(), acc = 0;
    this.timer = setInterval(() => {
      const now = performance.now();
      acc += Math.min(250, now - last); last = now;
      while (acc >= 50) { this.game.tick(); acc -= 50; }
    }, 25);
    window.addEventListener('beforeunload', () => this.game.saveAll());
    setInterval(() => this.game.saveAll(), 10000);
    return this;
  }
  send(m) { const c = JSON.parse(JSON.stringify(m)); queueMicrotask(() => this.game.onMessage(this.conn, c)); }
  close() { clearInterval(this.timer); this.game.saveAll(); }
}
