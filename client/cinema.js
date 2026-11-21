// Lot 4 : le moteur des cinématiques mises en scène. Il joue les scripts de shared/data/cinemas.js : des étapes
// datées sur une horloge de scène (qui s'arrête pendant les conversations). Il ne démarre que sur ordre du serveur
// ({ t: 'cinema', a: 'play' }), et il RESTAURE toujours tout : caméra, zoom, commandes, musique, PNJ, interface —
// à la fin, quand on la passe (Échap ou le bouton), si une étape échoue, si l'on change de lieu, meurt ou se reconnecte.
// Les acteurs sont des silhouettes du décor (comme les habitants) : la partie, elle, reste au serveur.
import { CINEMAS, SILAS_PITCH, SILAS_AGAIN, THEMES } from '../shared/data/cinemas.js';
import { NPCS } from '../shared/data/npcs.js';
import { TILE } from '../shared/constants.js';

const LINES = { pitch: SILAS_PITCH, again: SILAS_AGAIN }; // les conversations ; d'autres modules en ajoutent (client/heist.js)
export const CINE_LINES = LINES, CINE_ENDS = {}, CINE_THEMES = {};
const ease = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0));
const nowS = () => performance.now() / 1000;
const $ = (id) => document.getElementById(id);
const voiceOf = (id) => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 150 + (h % 170); };
// ce qui interrompt un instant le récit : la conversation (attend le joueur) et la reprise en main
const PAUSES = new Set(['talk', 'release']);

export class Cinema {
  constructor(G) { this.G = G; this.cur = null; this.restoreFade = null; this.log = []; }
  get on() { return !!this.cur; }
  locked() { return !!this.cur && this.cur.locked; }
  theme() { return this.cur && this.cur.theme != null ? this.cur.theme : null; }
  takeFade() { const f = this.restoreFade; this.restoreFade = null; return f; }
  reduced() { return this.G.cineMode === 'reduit'; }

  onMsg(m) {
    if (m.a === 'play') {
      if (this.G.mem) this.G.mem.add('vu:' + m.id);
      this.start(m.id, { seed: m.seed, n: m.n, opts: m.opts });
    }
  }
  // ------------------------------------------------------------------ démarrage
  start(id, opts = {}) {
    const G = this.G, def = CINEMAS[id];
    if (!def || !G.player) return false;
    if (this.cur) this.abort('une autre scène commence');
    if (G.scene && G.scene.on) G.scene.stop();
    const roomId = def.room ? G.world.rooms.findIndex((r) => r.name === def.room) : -1;
    const room = roomId >= 0 ? G.world.rooms[roomId] : null;
    const c = this.cur = {
      id, def, roomId, room, t: 0, last: nowS(), started: nowS(), idx: 0, locked: true, paused: false, waiting: roomId >= 0 && G.room !== roomId,
      steps: def.steps.map((s, i) => ({ ...s, i })).sort((a, b) => a.at - b.at || a.i - b.i),
      actors: new Map(), taken: [], items: new Map(), cam: null, follow: null, theme: null, sent: false, faced: new Map(), seed: opts.seed || 1,
      opts: opts.opts || {}, vars: {},
    };
    G.ui.close(true);
    G.ui.cine(true);
    document.body.classList.add('cinema');
    $('cine-skip').classList.remove('hidden');
    for (const [aid, a] of Object.entries(def.actors || {})) this.makeActor(aid, a);
    // les habitués que la scène fait parler sont à leur place (et y restent : personne ne disparaît à la fin)
    for (const s of def.steps) if (s.who && s.who.seat) { const f = G.folk.find((q) => q.seat === `${roomId}:${s.who.seat[0]},${s.who.seat[1]}`); if (f) { f.hidden = false; f.stay = 0; } }
    this.log.push(`${id} : début`);
    return c;
  }
  // un PNJ « incarné » : on le cache, une silhouette identique joue à sa place ; à la fin, il retrouve sa place
  makeActor(aid, a) {
    const G = this.G, c = this.cur;
    let e;
    if (a.npc) {
      const n = G.allNpcs.find((q) => q.id === a.npc) || G.npcs.find((q) => q.id === a.npc);
      if (!n) { this.log.push(`acteur ${aid} : PNJ ${a.npc} absent`); return; }
      n.hidden = true; c.taken.push(n);
      e = { k: 'f', id: -9000 - c.actors.size, x: n.x, y: n.y, dir: n.dir0 ?? n.dir ?? 0, look: NPCS[a.npc].look, lookKey: 'npc:' + a.npc, moving: false, walk: 0, sitUntil: n.sit ? Infinity : 0, cine: true, npc: n, voice: voiceOf(a.npc) };
    } else {
      const P0 = a.pos !== undefined ? a.pos : a.at; // une apparition en cours de scène : « pos » (« at » est son instant)
      const p = P0 === 'opts' ? { x: c.opts.x || G.player.x, y: c.opts.y || G.player.y } : this.at(P0 || [0, 0]);
      const look = a.lookOf ? NPCS[a.lookOf].look : a.look;
      e = { k: 'f', id: -9000 - c.actors.size, x: p.x, y: p.y, dir: a.dir || 0, look, lookKey: JSON.stringify(look), moving: false, walk: 0, sitUntil: a.sit ? Infinity : 0, cine: true, voice: voiceOf(a.lookOf || aid) };
    }
    c.actors.set(aid, e); G.folk.push(e);
  }
  // ------------------------------------------------------------------ repères
  at(pt, self) { // [x, y] en cases de la pièce ; 'player' / 'self' : la position du joueur / de l'acteur ; ['player', dx, dy] en pixels
    const G = this.G, r = this.cur && this.cur.room, p = G.player;
    if (pt[0] === 'player' || pt[0] === 'self') { const o = pt[0] === 'self' ? self : p; return { x: o.x + (pt[1] || 0), y: o.y + (pt[2] || 0) }; }
    const X = (v) => (v === 'player' ? p.x : v === 'self' ? self.x : ((r ? r.x0 : 0) + v) * TILE + 8);
    const Y = (v) => (v === 'player' ? p.y : v === 'self' ? self.y : ((r ? r.y0 : 0) + v) * TILE + 12);
    return { x: X(pt[0]), y: Y(pt[1]) };
  }
  who(ref) {
    const G = this.G, c = this.cur;
    if (!ref) return null;
    if (ref === 'player') return G.player;
    if (typeof ref === 'string') return c.actors.get(ref) || null;
    if (ref.seat) { const k = `${c.roomId}:${ref.seat[0]},${ref.seat[1]}`; return G.folk.find((f) => f.seat === k && !f.hidden) || null; } // un client attablé (s'il est là à cette heure)
    if (ref.npc) return G.npcs.find((n) => n.id === ref.npc) || null;
    if (ref.mob) { for (const e of G.ents.values()) if (e.type === ref.mob && !e.dyingT) return e; return null; } // lot 5 : un monstre bien réel (Silas sur son pont)
    if (ref.crowd != null) return G.folk.find((f) => f.crowd === ref.crowd && !f.hidden) || null; // lot 5 : un invité de la réception
    return null;
  }
  target(spec) { // où regarde la caméra (centre de l'image)
    if (!spec) return null;
    if (spec === 'player' || spec.player) { const p = this.G.player; return { x: p.x, y: p.y - 12 }; }
    if (spec.actor || spec.npc || spec.mob) { const e = this.who(spec.actor || spec); return e ? { x: e.x + (spec.dx || 0), y: e.y + (spec.dy ?? -12) } : null; }
    if (spec.tile) return this.at(spec.tile);
    if (spec.world) return { x: spec.world[0] * TILE + 8, y: spec.world[1] * TILE + 8 };
    if (spec.between) { const [a, b] = spec.between.map((w) => this.who(w)).filter(Boolean); if (!a) return null; if (!b) return { x: a.x, y: a.y - 12 }; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 14 }; }
    return null;
  }
  // ------------------------------------------------------------------ chaque image
  tick(now, dt) {
    const c = this.cur, G = this.G, R = G.renderer;
    if (!c) { R.camExact = false; return null; }
    try {
      if (c.waiting) { // le serveur a pu lancer la scène juste avant que l'on soit entré : on attend la pièce, pas plus de 3 s
        if (G.room === c.roomId) { c.waiting = false; c.last = now; G.snapCam = true; } else if (now - c.started > 3) { this.abort('le lieu de la scène n’est pas atteint'); return null; } else return null;
      }
      if (c.roomId >= 0 && G.room !== c.roomId && !c.waiting) { this.abort('on a quitté le lieu de la scène'); return null; }
      if (G.me && G.me.dead) { this.abort('mort'); return null; }
      if (c.locked && c.t > (c.def.maxDur || 30) + 5) { this.log.push(`${c.id} : trop longue, rendue`); this.release(); }
      if (!c.paused) { c.t += Math.min(0.1, now - c.last); }
      c.last = now;
      while (!c.paused && c.idx < c.steps.length && c.steps[c.idx].at <= c.t) {
        const s = c.steps[c.idx++];
        this.run(s, now);
        if (!this.cur) return null;
      }
      this.moveActors(dt, now);
      if (!c.paused && c.idx >= c.steps.length && !this.busy()) { this.end(); return null; }
      if (c.paused || !c.locked) { R.camExact = false; return c.locked ? null : (c.camBack ? this.camBack(now) : null); }
      R.camExact = true;
      return this.camera(now);
    } catch (e) {
      console.error('[cinéma]', e);
      this.log.push(`${c && c.id} : erreur « ${e.message} », scène interrompue`);
      this.abort('erreur');
      return null;
    }
  }
  busy() { for (const a of this.cur.actors.values()) if (a.path && a.path.length) return true; return false; }
  camera(now) {
    const c = this.cur, R = this.G.renderer;
    if (c.follow) { const e = this.who(c.follow.who); if (e) { const t = { x: e.x, y: e.y + (c.follow.dy ?? -12) }; c.camPos = c.camPos ? { x: c.camPos.x + (t.x - c.camPos.x) * 0.18, y: c.camPos.y + (t.y - c.camPos.y) * 0.18 } : t; return c.camPos; } }
    const m = c.cam;
    if (m) {
      const to = (m.live ? this.target(m.spec) : null) || m.to;
      const k = m.dur > 0 ? ease((now - m.t0) / m.dur) : 1;
      c.camPos = { x: m.from.x + (to.x - m.from.x) * k, y: m.from.y + (to.y - m.from.y) * k };
      return c.camPos;
    }
    return c.camPos || { x: R.cam.x, y: R.cam.y };
  }
  camBack(now) { // après la reprise en main : la caméra revient doucement au joueur
    const c = this.cur, p = this.G.player, b = c.camBack, k = ease((now - b.t0) / b.dur);
    if (k >= 1) { c.camBack = null; return null; }
    return { x: b.from.x + (p.x - b.from.x) * k, y: b.from.y + (p.y - 12 - b.from.y) * k };
  }
  moveActors(dt, now) {
    for (const a of this.cur.actors.values()) {
      if (!a.path || !a.path.length) { a.moving = false; continue; }
      const [tx, ty] = a.path[0], dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy), sp = a.speed * dt;
      if (d <= sp) { a.x = tx; a.y = ty; a.path.shift(); if (!a.path.length) { a.moving = false; if (a.endDir != null) a.dir = a.endDir; } continue; }
      a.x += dx / d * sp; a.y += dy / d * sp; a.moving = true; a.walk = (a.walk || 0) + dt * (a.speed / 30); a.dir = dirOf(dx, dy);
      if (a.lastStep == null || now - a.lastStep > 0.42 * 40 / a.speed) { a.lastStep = now; this.G.sfx.play('step', 0.25); }
    }
  }
  // ------------------------------------------------------------------ les étapes
  run(s, now, ff = false) {
    const G = this.G, R = G.renderer, c = this.cur, red = this.reduced(), ui = G.ui;
    if (s.when && c.vars.fin !== s.when) return; // lot 5 : une étape propre à un choix
    const real = nowS();
    switch (s.do) {
      case 'bars': if (!ff) ui.cine(!!s.on); break;
      case 'fade': if (!ff) this.fade(s.to, red ? Math.min(0.25, s.dur || 0) : s.dur || 0, s.col); else this.fade(0, 0); break;
      case 'title': if (!ff) ui.cineTitle(s.name || null, s.tag || '', s.cls || ''); break;
      case 'sub': if (!ff) this.sub(s.who, s.text); break;
      case 'say': { if (ff) break; const e = this.who(s.who); if (!e) break; // une réplique sans arrêt : une bulle, sa voix, et le sous-titre
        R.addFx({ kind: 'bubble', text: s.text, follow: () => e, dur: s.dur || 2.4, h: 34 });
        for (let k = 0; k < 4; k++) setTimeout(() => G.sfx.voice(e.voice || 220), k * 90);
        break; }
      case 'grade': R.grade = { c: s.col || (R.grade && R.grade.c) || '0,0,0', a: ff ? s.a || 0 : (R.grade ? R.grade.a : 0), to: s.a || 0, tau: ff ? 0.01 : (s.dur || 1) / 3, mode: s.mode }; break;
      case 'vignette': if (red || ff) { R.vignette = null; break; } { const e = s.who ? this.who(s.who) : null, prev = R.vignette; R.vignette = { a: prev ? prev.a : 0, to: s.a || 0, r: s.r || (prev && prev.r) || 70, tau: (s.dur || 1) / 3, follow: e ? () => e : prev ? prev.follow : null }; } break;
      case 'view': R.viewRoom = s.room == null ? null : s.room; G.viewFocus = null; G.snapCam = true; break;
      case 'cam': {
        const to = this.target(s.to); if (!to) break;
        const from = c.camPos || { x: R.cam.x, y: R.cam.y };
        const dur = ff || red ? 0 : s.dur || 0;
        c.follow = null; c.cam = { from, to, spec: s.to, live: !!(s.to.actor || s.to.between || s.to.mob), t0: real, dur };
        if (!dur) { c.camPos = to; G.snapCam = true; }
        if (s.room === -1 || R.viewRoom === -1) G.viewFocus = to;
        break; }
      case 'follow': c.follow = s.who ? { who: s.who, dy: s.dy } : null; if (!s.who) { const p = c.camPos || { x: R.cam.x, y: R.cam.y }; c.cam = { from: p, to: p, t0: real, dur: 0 }; } break;
      case 'zoom': { const cur = R.cineZoom || 0, base = R.scaleFor(0), want = s.h ? Math.max(0, Math.round(R.lastH / (s.h * TILE)) - base) : 0; if (want !== cur) R.zoomTo(want, ff || red ? 0 : s.dur || 0); break; }
      case 'shake': if (!ff && !red) R.shake(s.a || 3, s.t || 0.4); break;
      case 'spawn': this.makeActor(s.id, s); break;
      case 'remove': {
        for (const k of [].concat(s.item || [])) { const f = c.items.get(k); if (f) { const i = R.fx.indexOf(f); if (i >= 0) R.fx.splice(i, 1); c.items.delete(k); } }
        if (s.id) { const a = c.actors.get(s.id); if (a) this.dropActor(s.id, a); }
        break; }
      case 'walk': {
        const a = c.actors.get(s.id); if (!a) break;
        a.sitUntil = 0;
        const pts = s.path.map((pt) => this.at(pt, a)).map((q) => [q.x, q.y]);
        if (ff) { const last = pts[pts.length - 1]; a.x = last[0]; a.y = last[1]; a.path = null; a.moving = false; break; }
        a.path = pts; a.speed = (s.speed || 40) * (s.run ? 2 : 1); a.endDir = s.dir ?? null;
        break; }
      case 'face': {
        const e = s.id === 'player' ? G.player : c.actors.get(s.id); if (!e) break;
        if (s.dir != null) e.dir = s.dir; else { const t = this.who(s.to); if (t) e.dir = dirOf(t.x - e.x, t.y - e.y); }
        if (s.id === 'player') c.faced.set('player', e.dir);
        break; }
      case 'sit': { const a = c.actors.get(s.id); if (!a) break; a.sitUntil = s.on ? Infinity : 0; if (s.dir != null) a.dir = s.dir; break; }
      case 'gesture': { if (ff) break; const a = this.who(s.id); if (a) this.gesture(a, s.g, s); break; }
      case 'emo': { if (ff) break; const e = this.who(s.who); if (e) R.addFx({ kind: 'emo', e: s.e, follow: () => e, dur: s.dur || 1.2, h: 36 }); break; }
      case 'coin': { if (ff) break; const a = this.who(s.id); if (a) this.gesture(a, 'coin', s); break; }
      case 'item': {
        if (c.items.has(s.key)) break;
        const p = this.at(s.pos);
        const f = { kind: 'item', icon: s.icon, tint: s.tint, mini: s.mini, x: p.x, y: p.y, z: s.z || 0, glint: s.glint, dur: 1e9 };
        R.addFx(f); if (ff) f.t0 -= 1; c.items.set(s.key, f);
        break; }
      case 'theme': { const nm = String(s.name || '').startsWith('$') ? (CINE_THEMES[c.vars[s.name.slice(1)]] || c.theme || '') : s.name || ''; c.theme = nm; G.sfx.setTheme(nm, s.fade ?? (THEMES[nm] ? 1.0 : 0.8)); break; }
      case 'sfx': if (!ff) G.sfx.play(s.name, s.vol ?? 1); break;
      case 'duck': G.sfx.duck(s.k ?? 1, ff ? 0.05 : (s.dur || 1) / 3); break;
      case 'talk': if (!ff) this.talk(s); break;
      case 'release': this.release(); break;
      default: this.log.push(`${c.id} : étape inconnue « ${s.do} »`);
    }
  }
  gesture(a, g, s = {}) {
    const G = this.G, R = G.renderer, t = nowS();
    if (g === 'wave') a.waveUntil = t + (s.dur || 1.2);
    else if (g === 'dance') a.danceUntil = t + (s.dur || 2);
    else if (g === 'flip') a.flipT = t;
    else if (g === 'reach' || g === 'atk') { const q = s.to ? this.at(s.to) : { x: a.x + [0, -10, 10, 0][a.dir], y: a.y + [10, 0, 0, -10][a.dir] }; a.atkT = t; a.atkA = Math.atan2(q.y - (a.y - 6), q.x - a.x); }
    else if (g === 'coin') { // la pièce : lancée du pouce, elle monte, tinte et retombe dans la main
      const hx = a.x + (a.dir === 1 ? -6 : a.dir === 2 ? 6 : 3), hy = a.y - 10;
      R.burst(hx, hy, 1, { z: 8, col: '#ffd23a', up: s.high ? 150 : 110, speed: 2, life: s.high ? 0.95 : 0.75, g: 300, size: 2, drag: 0 });
      R.burst(hx, hy, 3, { z: 9, col: ['#fff2a0', '#ffd23a'], up: 30, speed: 10, life: 0.25, g: 80 });
      G.sfx.play('coin', 0.55); setTimeout(() => G.sfx.play('coin', 0.35), (s.high ? 950 : 750));
    }
  }
  // une conversation au milieu d'une scène : l'horloge s'arrête, la caméra se pose entre les deux, l'acteur joue ses gestes
  talk(s) {
    const G = this.G, c = this.cur, actor = s.actor ? c.actors.get(s.actor) : null;
    c.paused = true;
    if (actor && actor.path && actor.path.length) { const last = actor.path[actor.path.length - 1]; actor.x = last[0]; actor.y = last[1]; actor.path = null; actor.moving = false; }
    const key = String(s.lines || ''), L = key.startsWith('$') ? LINES[c.vars[key.slice(1)]] : LINES[key];
    const steps = typeof L === 'function' ? L(G, c) : L || [];
    const end = s.end && CINE_ENDS[s.end] ? CINE_ENDS[s.end](G, c, this) : null;
    if (end && end.timeout) setTimeout(() => { if (this.cur === c && G.scene.on && G.scene.choices) { const b = document.getElementById('sc-choices').children[end.def || 0]; if (b) b.click(); } }, end.timeout * 1000);
    G.scene.play(s.npc, steps, end ? end.list : null, { actor, alone: !actor && !G.npcs.some((n) => n.id === s.npc && G.player && Math.hypot(n.x - G.player.x, n.y - G.player.y) < 360), onLine: (who, x) => { if (who !== 'npc' || !actor || !this.cur) return; if (x.g) this.gesture(actor, x.g, x); if (x.e) G.renderer.addFx({ kind: 'emo', e: x.e, follow: () => actor, dur: 1.4, h: 36 }); } })
      .then(() => { if (this.cur === c) { c.paused = false; c.last = nowS(); } });
  }
  sub(who, text) {
    if (!text) { this.G.ui.cineSub(''); return; }
    const n = who && NPCS[who] ? NPCS[who].name : who && this.cur.def.actors && this.cur.def.actors[who] && NPCS[this.cur.def.actors[who].npc] ? NPCS[this.cur.def.actors[who].npc].name : '';
    this.G.ui.cineSub(n ? `${n} : « ${text} »` : text);
    const e = who ? this.who(who) : null;
    if (e) for (let k = 0; k < 5; k++) setTimeout(() => this.G.sfx.voice(e.voice || 220), k * 85);
  }
  fade(to, dur, col) {
    const el = $('cine-fade'); if (!el) return;
    el.style.transition = `opacity ${Math.max(0, dur)}s ease`;
    if (col) el.style.background = col;
    el.style.opacity = String(to ? 1 : 0);
  }
  // ------------------------------------------------------------------ passer, rendre la main, finir
  skip() { // on saute jusqu'à la prochaine conversation (ou la fin) : chaque étape sautée laisse le monde dans son état final
    const c = this.cur;
    if (!c || !c.locked || c.paused) return;
    this.log.push(`${c.id} : passée à ${c.t.toFixed(1)} s`);
    c.skipped = true;
    while (c.idx < c.steps.length) {
      const s = c.steps[c.idx];
      if (PAUSES.has(s.do)) { c.t = s.at; break; }
      c.idx++; this.run(s, nowS(), true);
      if (!this.cur) return;
    }
    this.fade(0, 0); this.G.ui.cineTitle(null); this.G.ui.cineSub(''); this.G.snapCam = true;
    if (c.idx >= c.steps.length) this.end();
  }
  done() { // le serveur lève la protection dès que le joueur a de nouveau la main
    const c = this.cur;
    if (c && !c.sent) { c.sent = true; this.G.send({ t: 'cinema', a: 'done', id: c.id, skip: c.skipped ? 1 : 0 }); }
  }
  release() {
    const c = this.cur, G = this.G, R = G.renderer;
    if (!c || !c.locked) return;
    c.locked = false;
    this.done();
    G.ui.cine(false); this.fade(0, 0.3); this.G.ui.cineSub('');
    $('cine-skip').classList.add('hidden');
    document.body.classList.remove('cinema');
    R.zoomTo(0, this.reduced() ? 0 : 0.6); R.vignette = null; R.viewRoom = null; G.viewFocus = null;
    if (R.grade) R.grade.to = 0;
    c.camBack = { from: c.camPos || { x: R.cam.x, y: R.cam.y }, t0: nowS(), dur: this.reduced() ? 0.01 : 0.7 };
    c.follow = null; c.cam = null;
    if (c.theme != null) { c.theme = null; this.restoreFade = 2.0; }
  }
  dropActor(aid, a) {
    const G = this.G, i = G.folk.indexOf(a);
    if (i >= 0) G.folk.splice(i, 1);
    if (a.npc) { a.npc.hidden = false; a.npc.dir = a.npc.dir0 ?? a.npc.dir; }
    this.cur.actors.delete(aid);
  }
  end() { this.finish('fin'); }
  abort(why) { if (this.cur) this.log.push(`${this.cur.id} : interrompue (${why})`); this.finish(why); }
  finish(why) {
    const c = this.cur, G = this.G, R = G.renderer;
    if (!c) return;
    if (c.locked) this.release();
    if (G.scene && G.scene.on && why !== 'fin') G.scene.stop();
    for (const [aid, a] of [...c.actors]) this.dropActor(aid, a);
    for (const n of c.taken) n.hidden = false;
    for (const f of c.items.values()) { const i = R.fx.indexOf(f); if (i >= 0) R.fx.splice(i, 1); }
    R.zoomTo(0, 0); R.camExact = false; R.viewRoom = null; R.vignette = null; R.grade = null; G.viewFocus = null;
    this.fade(0, 0); G.ui.cine(false);
    $('cine-skip').classList.add('hidden'); document.body.classList.remove('cinema');
    G.sfx.duck(1, 0.4);
    if (c.theme != null) this.restoreFade = 2.0;
    this.cur = null;
    this.log.push(`${c.id} : terminée (${why})`);
    if (this.log.length > 40) this.log.splice(0, this.log.length - 40);
  }
}
