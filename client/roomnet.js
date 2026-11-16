// Multijoueur dans une page claude.ai via la capacité `room` : le navigateur d'un
// joueur (l'hôte, élu automatiquement) fait tourner la simulation du serveur ;
// les autres lui envoient leurs actions. Si l'hôte part, un autre prend le relais.
import { BrowserStorage } from './net.js';

const PROTO = 1;
const MAX_BYTES = 3600;
const enc = new TextEncoder();
const bytes = (o) => enc.encode(JSON.stringify(o)).length;

// Les sauvegardes voyagent avec les joueurs : l'hôte les reçoit à la connexion
// et renvoie chaque sauvegarde à son propriétaire, qui la garde dans son navigateur.
class RoomStorage {
  constructor(net) { this.net = net; this.pending = new Map(); }
  async auth(key) { return { ok: true, data: this.pending.get(key) || null }; }
  async save(key, data) {
    const conn = this.net.connByKey.get(key);
    if (conn) conn.send({ t: 'save', data });
  }
}

export class RoomNet {
  constructor(room) {
    this.room = room; this.kind = 'room';
    this.onmsg = () => {}; this.onclose = () => {}; this.onhost = () => {};
    this.since = Date.now() + Math.random();
    this.queue = []; this.outbox = new Map(); this.conns = new Map(); this.connByKey = new Map();
    this.hostPeer = null; this.isHost = false; this.game = null; this.lastLogin = null; this.welcomed = false;
    this.local = new BrowserStorage();
  }
  myPeer() { const me = this.room.peers().find((p) => p.sameTab); return me ? me.peer : null; }
  async connect() {
    const room = this.room;
    // vérifie qu'on a le droit d'envoyer (accès « contributeur » minimum)
    try { await room.emit('c2h', { to: null, m: [] }); } catch (e) { if (e && e.code === 'not_permitted') throw new Error('lecture seule'); }
    this.setPresence();
    document.addEventListener('visibilitychange', () => this.setPresence());
    room.onPeers(() => this.elect());
    room.on('c2h', (msg) => this.onC2H(msg));
    room.on('h2c', (msg) => this.onH2C(msg));
    this.flushT = setInterval(() => this.flush(), 100);
    await new Promise((r) => setTimeout(r, 1500)); // laisse les autres se présenter
    this.elect();
    return this;
  }
  setPresence() { this.room.presence({ mm: { v: PROTO, since: this.since, vis: !document.hidden } }).catch(() => {}); }
  candidates() {
    return this.room.peers().filter((p) => p.presence && p.presence.mm && p.presence.mm.v === PROTO && p.kind !== 'agent')
      .sort((a, b) => (b.presence.mm.vis - a.presence.mm.vis) || (a.presence.mm.since - b.presence.mm.since) || (a.peer < b.peer ? -1 : 1));
  }
  elect() {
    const me = this.myPeer();
    const best = this.candidates()[0];
    const host = best ? best.peer : me;
    if (!host || host === this.hostPeer) {
      if (this.isHost) for (const peer of [...this.conns.keys()]) if (peer !== 'self' && !this.room.peers().some((p) => p.peer === peer)) this.dropPeer(peer);
      return;
    }
    const wasHost = this.isHost;
    this.hostPeer = host;
    this.isHost = host === me;
    if (wasHost && !this.isHost) this.stopHosting();
    if (this.isHost) this.startHosting();
    this.onhost(this.isHost, host);
    // (re)connexion auprès du nouvel hôte
    this.welcomed = false;
    if (this.lastLogin) this.relogin();
  }
  async startHosting() {
    const { Game } = await import('../server/game.js');
    this.storage = new RoomStorage(this);
    this.game = new Game({ storage: this.storage, solo: true, log: () => {} });
    this.selfConn = { send: (o) => { const c = JSON.parse(JSON.stringify(o)); queueMicrotask(() => this.deliver(c)); }, close: () => {} };
    this.conns.set('self', this.selfConn);
    this.game.addClient(this.selfConn);
    let last = performance.now(), acc = 0;
    this.tickT = setInterval(() => {
      const now = performance.now();
      acc += Math.min(250, now - last); last = now;
      while (acc >= 50) { this.game.tick(); acc -= 50; }
    }, 25);
    this.saveT = setInterval(() => this.game && this.game.saveAll(), 10000);
    const pending = this.queue; this.queue = [];
    for (const m of pending) this.hostReceive('self', m);
  }
  stopHosting() {
    clearInterval(this.tickT); clearInterval(this.saveT);
    if (this.game) this.game.saveAll();
    this.game = null; this.conns.clear(); this.connByKey.clear(); this.outbox.clear();
  }
  dropPeer(peer) {
    const c = this.conns.get(peer);
    if (c && this.game) this.game.removeClient(c);
    this.conns.delete(peer); this.outbox.delete(peer);
  }
  relogin() {
    const send = () => {
      if (this.welcomed || !this.lastLogin) return;
      this.send(this.lastLogin);
      setTimeout(send, 2500);
    };
    setTimeout(send, this.isHost ? 300 : 900);
  }
  deliver(m) {
    if (m.t === 'welcome') this.welcomed = true;
    if (m.t === 'save') { if (this.lastLogin) this.local.save(this.lastLogin.name.toLowerCase(), m.data); return; }
    this.onmsg(m);
  }
  // ---- côté client
  async send(m) {
    if (m.t === 'login') {
      const save = (await this.local.auth(String(m.name).toLowerCase())).data;
      m = Object.assign({}, m, { save });
      this.lastLogin = m;
    }
    if (this.isHost && this.game) { this.hostReceive('self', m); return; }
    if (m.t === 'mv') this.queue = this.queue.filter((q) => q.t !== 'mv');
    this.queue.push(m);
  }
  // ---- côté hôte
  hostReceive(peer, m) {
    let conn = this.conns.get(peer);
    if (!conn) {
      conn = { send: (o) => { const q = this.outbox.get(peer) || []; q.push(o); this.outbox.set(peer, q); }, close: () => this.dropPeer(peer) };
      this.conns.set(peer, conn);
      this.game.addClient(conn);
    }
    if (m && m.t === 'login') {
      const key = String(m.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
      this.storage.pending.set(key, m.save && typeof m.save === 'object' ? m.save : null);
      this.connByKey.set(key, conn);
    }
    this.game.onMessage(conn, m);
  }
  onC2H(msg) {
    if (!this.isHost || !this.game || !msg.data || msg.data.to !== this.myPeer() || msg.sameTab) return;
    const list = Array.isArray(msg.data.m) ? msg.data.m.slice(0, 40) : [];
    for (const m of list) if (m && typeof m === 'object') this.hostReceive(msg.peer, m);
  }
  onH2C(msg) {
    if (msg.sameTab || msg.peer !== this.hostPeer || !msg.data || !msg.data.b) return;
    const mine = msg.data.b[this.myPeer()];
    if (Array.isArray(mine)) for (const m of mine) this.deliver(m);
  }
  compact(q) {
    const out = []; let s = null; const latest = {};
    for (const m of q) {
      if (m.t === 'me' || m.t === 'inv' || m.t === 'q') { latest[m.t] = m; continue; }
      if (m.t !== 's') { out.push(m); continue; }
      if (!s) { s = { t: 's', T: m.T, e: m.e, n: m.n ? [...m.n] : [], r: m.r ? [...m.r] : [], ev: m.ev ? [...m.ev] : [] }; if (m.wt != null) { s.wt = m.wt; s.on = m.on; } out.push(s); continue; }
      s.T = m.T; s.e = m.e;
      if (m.n) { const ids = new Set(m.n.map((x) => x.id)); s.r = s.r.filter((id) => !ids.has(id)); s.n = s.n.filter((x) => !ids.has(x.id)).concat(m.n); }
      if (m.r) { const ids = new Set(m.r); s.n = s.n.filter((x) => !ids.has(x.id)); s.r = s.r.concat(m.r); }
      if (m.ev) s.ev = s.ev.concat(m.ev);
      if (m.wt != null) { s.wt = m.wt; s.on = m.on; }
    }
    for (const k of ['me', 'inv', 'q']) if (latest[k]) out.push(latest[k]);
    // découpe un instantané trop gros
    const res = [];
    for (const m of out) {
      if (m.t !== 's' || bytes(m) <= MAX_BYTES) { res.push(m); continue; }
      const parts = [];
      const n = m.n || [], ev = m.ev || [];
      for (let i = 0; i < n.length; i += 18) parts.push({ t: 's', T: m.T, e: [], n: n.slice(i, i + 18) });
      for (let i = 0; i < ev.length; i += 30) parts.push({ t: 's', T: m.T, e: [], ev: ev.slice(i, i + 30) });
      parts.push({ t: 's', T: m.T, e: m.e, r: m.r, wt: m.wt, on: m.on });
      res.push(...parts);
    }
    return res;
  }
  flush() {
    const room = this.room;
    if (this.isHost) {
      let cur = {}, size = 16;
      const emit = () => { if (size > 16) room.emit('h2c', { b: cur }).catch(() => {}); cur = {}; size = 16; };
      for (const [peer, q] of this.outbox) {
        if (!q.length) continue;
        this.outbox.set(peer, []);
        for (const m of this.compact(q)) {
          const b = bytes(m) + 4;
          if (b > MAX_BYTES) continue;
          if (size + b + peer.length + 6 > MAX_BYTES) emit();
          if (!cur[peer]) { cur[peer] = []; size += peer.length + 6; }
          cur[peer].push(m); size += b;
        }
      }
      emit();
    } else if (this.queue.length && this.hostPeer) {
      const msgs = this.queue; this.queue = [];
      let cur = [], size = 40;
      for (const m of msgs) {
        const b = bytes(m) + 1;
        if (size + b > MAX_BYTES && cur.length) { room.emit('c2h', { to: this.hostPeer, m: cur }).catch(() => {}); cur = []; size = 40; }
        cur.push(m); size += b;
      }
      if (cur.length) room.emit('c2h', { to: this.hostPeer, m: cur }).catch(() => {});
    }
  }
  close() { clearInterval(this.flushT); this.stopHosting(); }
}
