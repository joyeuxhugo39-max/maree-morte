// Multijoueur sans serveur pour la page publique (github.io) : les navigateurs
// se connectent directement entre eux (WebRTC), le service public PeerJS ne sert
// qu'à les mettre en relation. Le premier pirate arrivé héberge le monde avec le
// même code que le serveur Node ; s'il part, un autre reprend la main.
// Chaque pirate garde sa progression dans son propre navigateur.
import { Peer } from 'peerjs';
import { BrowserStorage } from './net.js';

export const WORLD_ID = 'mmorte-7f3k2-monde-v100';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rnd = (a, b) => a + Math.random() * (b - a);
const dbg = (...a) => { if (window.MM_DEBUG) console.log('[pair]', ...a); };

// l'hôte reçoit la sauvegarde de chaque pirate à la connexion et lui renvoie les nouvelles
class PeerStorage {
  constructor(net) { this.net = net; this.pending = new Map(); }
  async auth(key) { return { ok: true, data: this.pending.get(key) || null }; }
  async save(key, data) { const c = this.net.connByKey.get(key); if (c) c.send({ t: 'save', data }); }
}

export class PeerNet {
  constructor(opts = {}) {
    this.kind = 'peer';
    this.world = opts.world || WORLD_ID;
    this.peerOpts = Object.assign({ debug: 0 }, opts.peer || {});
    this.onmsg = () => {}; this.onclose = () => {}; this.onhost = () => {};
    this.local = new BrowserStorage();
    this.peer = null; this.dc = null; this.isHost = false; this.game = null; this.selfConn = null;
    this.queue = []; this.lastLogin = null; this.welcomed = false; this.closed = false; this.busy = false;
    this.conns = new Map(); this.connByKey = new Map();
    this.flushT = setInterval(() => this.flush(), 50);
    document.addEventListener('visibilitychange', () => this.onVisibility());
    window.addEventListener('beforeunload', () => { try { if (this.game) this.game.saveAll(); this.flush(); } catch (e) { /* */ } });
  }
  // première connexion : hôte si le monde est libre, sinon on rejoint l'hôte
  async connect(timeout = 10000) {
    const t0 = performance.now();
    for (let k = 0; performance.now() - t0 < timeout && !this.closed; k++) {
      if (await this.tryHost()) return this;
      if (await this.tryJoin()) return this;
      await wait(rnd(300, 900));
    }
    this.close();
    throw new Error('multijoueur injoignable');
  }
  // l'hôte est parti : on retente sans limite (quelqu'un reprend le monde)
  async reattach(preferJoin = false) {
    dbg('reattach', this.busy, this.closed);
    if (this.busy || this.closed) return;
    this.busy = true;
    this.onhost(null);
    for (let k = 0; !this.closed; k++) {
      if (preferJoin && k < 3) { if (await this.tryJoin()) break; await wait(800); continue; }
      if (await this.tryHost()) break;
      if (await this.tryJoin()) break;
      await wait(rnd(400, 1200) * Math.min(4, 1 + k * 0.5));
    }
    this.busy = false;
  }
  tryHost() {
    dbg('tryHost');
    return new Promise((resolve) => {
      let settled = false;
      const p = new Peer(this.world, this.peerOpts);
      const fin = (ok) => { if (settled) return; settled = true; clearTimeout(t); if (!ok) { try { p.destroy(); } catch (e) { /* */ } } resolve(ok); };
      const t = setTimeout(() => fin(false), 5000);
      p.on('open', async () => { if (settled) return; clearTimeout(t); this.peer = p; await this.startHosting(); fin(true); });
      p.on('connection', (dc) => this.accept(dc));
      p.on('disconnected', () => { if (this.peer === p && this.isHost && !this.closed) setTimeout(() => { try { if (!p.destroyed) p.reconnect(); } catch (e) { /* */ } }, 1500); });
      p.on('error', (e) => { dbg('host error', e && e.type); if (!settled) fin(false); });
    });
  }
  tryJoin() {
    dbg('tryJoin');
    return new Promise((resolve) => {
      let settled = false;
      const p = new Peer(this.peerOpts);
      const fin = (ok) => { if (settled) return; settled = true; clearTimeout(t); if (!ok) { try { p.destroy(); } catch (e) { /* */ } } resolve(ok); };
      const t = setTimeout(() => fin(false), 6000);
      p.on('open', () => {
        const dc = p.connect(this.world, { reliable: true, serialization: 'json' });
        dc.on('open', () => {
          if (settled) return;
          this.peer = p; this.dc = dc; this.isHost = false; this.welcomed = false; this.lastRx = performance.now(); this.lastTx = 0;
          fin(true);
          this.onhost(false);
          if (this.lastLogin) this.relogin();
        });
        dc.on('data', (d) => { this.lastRx = performance.now(); if (d && Array.isArray(d.b)) for (const m of d.b) this.deliver(m); });
        dc.on('close', () => { if (this.dc === dc) this.lostHost(); });
        dc.on('error', () => { if (this.dc === dc) this.lostHost(); });
      });
      p.on('error', (e) => { if (!settled) fin(false); else if (this.peer === p && e && e.type === 'peer-unavailable') this.lostHost(); });
    });
  }
  lostHost() {
    dbg('lostHost', this.closed, this.isHost);
    if (this.closed || this.isHost) return;
    const p = this.peer; this.peer = null; this.dc = null; this.welcomed = false;
    try { if (p) p.destroy(); } catch (e) { /* */ }
    setTimeout(() => this.reattach(), rnd(150, 1200));
  }
  // ---- hôte
  async startHosting() {
    this.isHost = true; this.dc = null;
    const { Game } = await import('../server/game.js');
    this.storage = new PeerStorage(this);
    this.game = new Game({ storage: this.storage, solo: true, log: () => {} });
    this.selfConn = { send: (o) => { const c = JSON.parse(JSON.stringify(o)); queueMicrotask(() => this.deliver(c)); }, close: () => {} };
    this.game.addClient(this.selfConn);
    for (const e of this.conns.values()) this.game.addClient(e.conn);
    let last = performance.now(), acc = 0;
    this.tickT = setInterval(() => {
      const now = performance.now();
      acc += Math.min(250, now - last); last = now;
      while (acc >= 50) { this.game.tick(); acc -= 50; }
    }, 25);
    this.saveT = setInterval(() => this.game && this.game.saveAll(), 10000);
    this.onhost(true);
    if (this.lastLogin) { this.welcomed = false; this.relogin(); }
    const pending = this.queue; this.queue = [];
    for (const m of pending) this.hostReceive(this.selfConn, m);
  }
  stopHosting() {
    clearInterval(this.tickT); clearInterval(this.saveT);
    if (this.game) { try { this.game.saveAll(); } catch (e) { /* */ } }
    this.flush();
    for (const e of this.conns.values()) { try { e.dc.close(); } catch (err) { /* */ } }
    this.game = null; this.conns.clear(); this.connByKey.clear(); this.isHost = false;
  }
  accept(dc) {
    const conn = { q: [], send: (o) => conn.q.push(o), close: () => { try { dc.close(); } catch (e) { /* */ } } };
    dc.on('open', () => {
      this.conns.set(dc.connectionId, { dc, conn, lastRx: performance.now() });
      if (this.game) this.game.addClient(conn);
    });
    dc.on('data', (d) => {
      const e = this.conns.get(dc.connectionId); if (e) e.lastRx = performance.now();
      if (!this.game || !d || !Array.isArray(d.m)) return;
      for (const m of d.m.slice(0, 60)) if (m && typeof m === 'object' && typeof m.t === 'string') this.hostReceive(conn, m);
    });
    const gone = () => {
      const e = this.conns.get(dc.connectionId);
      if (!e) return;
      this.conns.delete(dc.connectionId);
      for (const [k, c] of this.connByKey) if (c === conn) this.connByKey.delete(k);
      if (this.game) this.game.removeClient(conn);
    };
    dc.on('close', gone); dc.on('error', gone);
  }
  hostReceive(conn, m) {
    if (m.t === 'login') {
      const key = String(m.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      this.storage.pending.set(key, m.save && typeof m.save === 'object' ? m.save : null);
      this.connByKey.set(key, conn);
    }
    this.game.onMessage(conn, m);
  }
  // un hôte dont l'onglet est caché ralentit tout le monde : il passe la main
  onVisibility() {
    clearTimeout(this.hideT);
    if (!document.hidden || !this.isHost) return;
    this.hideT = setTimeout(() => {
      if (!document.hidden || !this.isHost || !this.conns.size) return;
      this.stopHosting();
      const p = this.peer; this.peer = null;
      try { if (p) p.destroy(); } catch (e) { /* */ }
      setTimeout(() => this.reattach(true), 1500);
    }, 15000);
  }
  // ---- commun
  relogin() {
    const send = () => {
      if (this.welcomed || !this.lastLogin || this.closed) return;
      this.send(this.lastLogin);
      setTimeout(send, 2500);
    };
    setTimeout(send, this.isHost ? 200 : 500);
  }
  deliver(m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'welcome') this.welcomed = true;
    if (m.t === 'save') { if (this.lastLogin) this.local.save(String(this.lastLogin.name).toLowerCase(), m.data); return; }
    this.onmsg(m);
  }
  async send(m) {
    if (m.t === 'login') {
      const save = (await this.local.auth(String(m.name).toLowerCase())).data;
      m = Object.assign({}, m, { save });
      this.lastLogin = m;
    }
    if (this.isHost && this.game) { this.hostReceive(this.selfConn, m); return; }
    if (m.t === 'mv') this.queue = this.queue.filter((q) => q.t !== 'mv');
    this.queue.push(m);
    if (this.queue.length > 200) this.queue.splice(0, this.queue.length - 200);
  }
  flush() {
    const now = performance.now();
    if (this.isHost) {
      for (const e of [...this.conns.values()]) {
        const { dc, conn } = e;
        // un pirate muet depuis longtemps a fermé son onglet sans prévenir
        if (now - e.lastRx > 12000) { try { dc.close(); } catch (err) { /* */ } this.conns.delete(dc.connectionId); if (this.game) this.game.removeClient(conn); continue; }
        if (!conn.q.length || !dc.open) continue;
        let q = conn.q; conn.q = [];
        const ch = dc.dataChannel;
        if (ch && ch.bufferedAmount > 1500000) q = q.filter((m) => m.t !== 's'); // client saturé : on saute des images
        if (q.length) { try { dc.send({ b: q }); } catch (e) { /* */ } }
      }
    } else if (this.dc) {
      // l'hôte envoie le monde 20 fois par seconde : un silence prolongé veut dire qu'il est parti
      if (now - this.lastRx > (this.welcomed ? 4000 : 9000)) { this.lostHost(); return; }
      if (!this.dc.open) return;
      if (this.queue.length || now - this.lastTx > 2000) {
        const m = this.queue; this.queue = []; this.lastTx = now;
        try { this.dc.send({ m }); } catch (e) { this.queue = m.concat(this.queue); }
      }
    }
  }
  close() {
    this.closed = true;
    clearInterval(this.flushT);
    if (this.isHost) this.stopHosting();
    try { if (this.peer) this.peer.destroy(); } catch (e) { /* */ }
    this.peer = null; this.dc = null;
  }
}
