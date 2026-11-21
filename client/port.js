// 1.8 : la vie du port de Port-Lanterne, côté client. Tout ce qui se voit ici se calcule sur l'heure du monde
// (shared/port-events.js) : deux pirates côte à côte voient le même navire accoster, le même voleur détaler, les mêmes
// musiciens sur la place — sans un message réseau de plus. Seuls les gestes des joueurs passent par le serveur.
//  - les navires au mouillage, et deux barques de pêche qui rament dans la baie de l'ouest ;
//  - les événements : le navire marchand et ses dockers, le colporteur, le voleur et le guet, le crieur, la bagarre
//    devant la taverne, l'équipage qui embarque, le radoub au chantier, les musiciens, la dispute à la halle ;
//  - la caisse sur l'épaule (E sur la pile du quai du Levant, puis au dépôt devant la Douane).
// Les figurants sont des habitants de passage (crowd: 'port') : le metteur en scène des bulles les respecte.
import { TILE, dayFrac } from '../shared/constants.js';
import { zoneAt, Z } from '../shared/world.js';
import { mulberry32 } from '../shared/rng.js';
import { portEventAt, PORT_KINDS, PORT_ROUTES, PORT_SPOTS, alongPath, pathLength, thiefAt, THIEF, merchantShipAt, SHIP, annonceOf, phaseOfDay } from '../shared/port-events.js';
import { CLOTH_KEYS } from './render/sprites-chars.js';

const T16 = (x, y) => [x * TILE + 8, y * TILE + 10];
const look = (r, o = {}) => Object.assign({ skin: Math.floor(r() * 4), hair: Math.floor(r() * 7), hairStyle: ['court', 'long', 'queue', 'chauve', 'hirsute'][Math.floor(r() * 5)], top: ['chemise', 'rayee', 'gilet', 'vareuse'][Math.floor(r() * 4)], topCol: CLOTH_KEYS[Math.floor(r() * CLOTH_KEYS.length)], pants: ['brown', 'navy', 'black'][Math.floor(r() * 3)], boots: ['brown', 'black'][Math.floor(r() * 2)], beard: r() < 0.4 ? 1 + Math.floor(r() * 2) : 0 }, o);
const GUARD = { skin: 2, hair: 1, hairStyle: 'court', top: 'manteau', topCol: 'navy', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black', beard: 0 };
const THIEF_LOOK = { skin: 1, hair: 2, hairStyle: 'court', top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'black', beard: 0 };
// les répliques des scènes (une bulle par réplique, à heure fixe dans l'événement)
const LINES = {
  rixe: [[3, 0, 'Tu as triché, sac à vin !'], [6, 1, 'Répète un peu, pour voir ?'], [10, 0, 'TRICHEUR !'], [16, 2, 'Allez ! Allez !'], [24, 3, 'Halte ! On se calme, ou c’est la Geôle !'], [30, 1, 'C’est lui qui a commencé…']],
  dispute: [[2, 0, 'Trois sous pour une sardine ? Elle a vu la lune, celle-là !'], [7, 1, 'Elle est de la nuit, madame ! Fraîche comme la rosée !'], [13, 0, 'Fraîche ? Elle me regarde de travers !'], [20, 1, 'Deux sous, et c’est mon dernier mot.'], [26, 0, 'Marché conclu. Voleuse.']],
  depart: [[2, 0, 'Allez, les gars ! La marée n’attend pas !'], [14, 1, 'Adieu, la Sirène Borgne…'], [50, 0, 'Larguez les amarres !']],
  reparation: [[4, 0, 'Passe-moi le maillet. Non, l’autre.'], [30, 1, 'Encore trois bordages, et elle flottera.'], [70, 2, 'Du brai ! Qui a pris le seau de brai ?'], [110, 0, 'Ça suffira pour aujourd’hui.']],
  musique: [[3, 0, 'Une gigue pour la Flamme !'], [40, 1, 'Plus vite ! Plus vite !'], [80, 0, 'Merci, Port-Lanterne !']],
  navire: [[SHIP.arrive + 2, 0, 'Le Levant est à quai ! Des bras, des bras !'], [SHIP.arrive + 30, 1, 'Celle-là pèse une enclume…'], [SHIP.arrive + 70, 0, 'Au dépôt, devant la Douane !']],
  voleur: [[1, 0, 'Hé ! Mes pommes !'], [THIEF.start + 0.5, 1, 'Au voleur ! Arrêtez-le !']],
  colporteur: [[2, 0, 'Babioles des sept mers ! Tout est vrai, rien n’est cher !'], [60, 0, 'Un perroquet qui jure ? Un collier qui porte chance ?'], [120, 0, 'Dernier tour, je repars ce soir !']],
};

export class PortLife {
  constructor(G) {
    this.G = G; const P = G.world.port; this.P = P;
    this.cast = []; this.cur = null; this.said = new Set(); this.notes = []; this.chips = []; this.sparks = [];
    this.statics = (P && P.ships ? P.ships : []).map((s, k) => ({ id: 9100 + k, x: s.x, y: s.y, dir: s.a === Math.PI ? 1 : 2, kind: s.kind, pal: s.pal, moored: 1 }));
    // deux barques de pêche, qui rament lentement dans la baie de l'ouest (le même chemin pour tous : l'heure du monde)
    this.boats = [{ id: 9150, kind: 'barque', pal: 'barque', pts: [[100, 139], [112, 141], [124, 139], [118, 137.5], [104, 137.5], [100, 139]], sp: 9, off: 0 },
      { id: 9151, kind: 'barque', pal: 'barque', pts: [[96, 131], [104, 131], [106, 138], [97, 139], [96, 131]], sp: 7, off: 40 }].map((b) => Object.assign(b, { P: b.pts.map(([x, y]) => [x * TILE + 8, y * TILE + 8]) }));
    this.carry = false; this.res = null; this.hint = 0; this.shipObj = new Map();
    for (const b of this.boats) b.len = pathLength(b.P);
    G.portShips = [];
  }
  closed() { return !!this.G.festOn; }
  ev() { return portEventAt(this.G.worldTime || 0, this.closed()); }
  figure(role, x, y, L) {
    const f = { k: 'f', id: -8000 - this.cast.length - (this.cur ? (this.cur.c % 50) * 20 : 0), x, y, tx: x, ty: y, dir: 0, moving: false, walk: 0, look: L, lookKey: JSON.stringify(L), weapon: null, crowd: 'port', role, hidden: false };
    this.G.folk.push(f); this.cast.push(f); return f;
  }
  clear() { for (const f of this.cast) { const i = this.G.folk.indexOf(f); if (i >= 0) this.G.folk.splice(i, 1); } this.cast = []; this.said.clear(); this.notes = []; this.chips = []; this.res = null; }
  bubble(f, text, dur = 2.8) { if (!f || f.hidden) return; const T2 = this.G.town; if (T2 && T2.bubblesInView() >= 3) return; this.G.renderer.addFx({ kind: 'bubble', text, follow: () => f, dur, h: 34 }); }
  near(x, y, d) { const p = this.G.player; return p && Math.hypot(p.x - x, p.y - y) < d; }
  // ------------------------------------------------------------------ la distribution des rôles d'un événement
  start(e) {
    this.clear(); this.cur = e;
    const r = mulberry32(e.c * 7919 + 13), F = (role, x, y, o) => this.figure(role, x, y, look(r, o));
    const A = this.P.anchors;
    if (e.k === 'navire') { this.dock = [F('docker', ...PORT_SPOTS.pile, { top: 'rayee', hat: 'bandana', hatCol: 'red' }), F('docker', ...PORT_SPOTS.depot, { top: 'chemise', hat: 'bonnet', hatCol: 'navy' })]; for (const f of this.dock) f.hidden = true; }
    else if (e.k === 'voleur') { this.thief = this.figure('voleur', ...PORT_ROUTES.voleur[0], THIEF_LOOK); this.guards = [this.figure('guet', ...T16(152, 101), GUARD), this.figure('guet', ...T16(153, 102), GUARD)]; this.victim = F('marchand', ...T16(147.5, 100.4), { top: 'tablier' }); this.victim.dir = 3; }
    else if (e.k === 'rixe') { const [bx, by] = [A.brawl.x, A.brawl.y]; this.duo = [F('habitant', bx - 9, by, {}), F('matelot', bx + 9, by, { top: 'rayee' })]; this.duo[0].dir = 2; this.duo[1].dir = 1; this.crowd = [F('client', bx - 6, by + 18, {}), F('habitant', bx + 14, by + 16, {})]; for (const c of this.crowd) c.dir = 3; this.guard = this.figure('guet', ...T16(144, 97), GUARD); }
    else if (e.k === 'dispute') { const [qx, qy] = [A.fishMarket.x, A.fishMarket.y]; this.duo = [F('client', qx - 10, qy + 14, { top: 'gilet', hat: 'paille' }), F('marchand', qx + 8, qy + 12, { top: 'tablier' })]; this.duo[0].dir = 2; this.duo[1].dir = 1; }
    else if (e.k === 'depart') { this.crew = [0, 1, 2, 3].map((k) => F('matelot', ...PORT_ROUTES.depart[0], { top: ['rayee', 'vareuse', 'chemise', 'rayee'][k], hat: ['bandana', 'bonnet', 'tricorne', null][k], hatCol: ['red', 'navy', 'black', 'red'][k] })); for (const f of this.crew) f.hidden = true; }
    else if (e.k === 'reparation') { this.carp = [[114, 120, 2], [123.4, 120.5, 1], [118.5, 117.6, 0]].map(([x, y, d]) => { const f = F('artisan', ...T16(x, y), { top: 'tablier', topCol: 'brown' }); f.dir = d; return f; }); }
    else if (e.k === 'musique') { this.band = [[153.5, 95.2, 1], [153.6, 97.4, 1]].map(([x, y, d]) => { const f = F('musicien', ...T16(x, y), { top: 'gilet', hat: 'plume', hatCol: 'purple' }); f.dir = d; return f; }); this.dancers = [[146.5, 98.8], [148.2, 99.4], [145.6, 96.2]].map(([x, y]) => F('habitant', ...T16(x, y), {})); }
  }
  // ------------------------------------------------------------------ chaque image
  update(dt, now) {
    const G = this.G, p = G.player; if (!p || !this.P) return;
    const wt = G.worldTime || 0;
    // les navires : à quai, les barques, et le marchand du Levant
    const S = (o) => { let s = this.shipObj.get(o.id); if (!s) { s = { id: o.id }; this.shipObj.set(o.id, s); } return Object.assign(s, o); }; // le même objet d'une image à l'autre (le cap, la vitesse)
    const ships = this.statics.map(S);
    for (const b of this.boats) { const pos = alongPath(b.P, ((wt + b.off) * b.sp) % b.len, 1); ships.push(S({ id: b.id, x: pos.x, y: pos.y, dir: pos.dir, kind: b.kind, pal: b.pal })); }
    const e = G.room >= 0 ? null : this.ev();
    if (!e) { if (this.cur) { this.clear(); this.cur = null; } for (const o of ships) if (o.pship) { o.pship.sail = 0; o.pship.rud = 0; } G.portShips = ships; return; }
    if (!this.cur || this.cur.c !== e.c) this.start(e);
    this.cur = e;
    const t = e.t, inTown = zoneAt(G.world, p.x, p.y) === Z.TOWN;
    if (e.k === 'navire') {
      const s = merchantShipAt(t, e.dur); ships.push(S({ id: 9160 + (e.c % 7), x: s.x, y: s.y, dir: s.dir, kind: 'galion', pal: 'galion', merchant: 1, moored: s.moored ? 1 : 0 }));
      // les dockers : de la pile au dépôt, caisse sur l'épaule, tant que le navire est à quai
      const on = t > SHIP.arrive + 3 && t < e.dur - SHIP.leave - 2;
      this.dock.forEach((f, k) => {
        f.hidden = !on; if (!on) return;
        const L = PORT_ROUTES.caisse, per = 26, u = ((t + k * 13) % per) / per, back = u >= 0.5, q = alongPath(back ? L.slice().reverse() : L, ((back ? u - 0.5 : u) * 2) * 11, 1);
        f.x = q.x; f.y = q.y; f.dir = q.dir; f.moving = q.moving; f.carry = !back; f.walk = (f.walk || 0) + (q.moving ? dt * 1.2 : 0);
      });
    } else if (e.k === 'voleur') this.stepThief(e, dt, now);
    else if (e.k === 'rixe') {
      const brawl = t < 26;
      this.duo.forEach((f, k) => { if (brawl && Math.floor(t * 2.2 + k) % 3 === 0 && now - (f.atkT || 0) > 0.4) { f.atkT = now; f.atkA = k ? Math.PI : 0; } f.dir = k ? 1 : 2; });
      const g = this.guard, gt = alongPath([[g.x, g.y], [A2(this.P).brawl.x, A2(this.P).brawl.y + 14]], Math.max(0, t - 20), 40);
      g.x = gt.x; g.y = gt.y; g.moving = gt.moving; g.dir = gt.moving ? gt.dir : 3; g.walk = (g.walk || 0) + (gt.moving ? dt : 0);
      if (t > 34) { this.duo[0].tx = this.duo[0].x - 40; this.duo[1].tx = this.duo[1].x + 40; for (const f of this.duo) { f.moving = true; f.x += Math.sign(f.tx - f.x) * 20 * dt; f.dir = f.tx < f.x ? 1 : 2; f.walk = (f.walk || 0) + dt; } }
    } else if (e.k === 'depart') {
      this.crew.forEach((f, k) => {
        const q = alongPath(PORT_ROUTES.depart, t - k * 1.4, 30);
        f.hidden = t < k * 1.4 || (q.done && t > 58 + k);
        f.x = q.x + (k % 2 ? 5 : -5); f.y = q.y; f.dir = q.dir; f.moving = q.moving; f.walk = (f.walk || 0) + (q.moving ? dt : 0); f.carry = k === 1;
      });
      if (t > 56) { const k2 = Math.min(1, (t - 56) / 50); ships.push(S({ id: 9170 + (e.c % 7), x: (124 - 28 * k2) * TILE, y: (128 + 12 * k2) * TILE, dir: 1, kind: 'barque', pal: 'barque' })); }
    } else if (e.k === 'reparation') {
      this.carp.forEach((f, k) => { if (Math.floor(t * 1.6 + k * 0.7) % 2 === 0 && now - (f.atkT || 0) > 0.55) { f.atkT = now; f.atkA = [0, Math.PI, Math.PI / 2][k]; if (this.near(f.x, f.y, 260) && G.sfx && G.sfx.tone) G.sfx.tone(380 + k * 60, 0.05, { type: 'square', vol: 0.012 }); for (let j = 0; j < 2; j++) this.chips.push({ x: f.x + (k === 1 ? -10 : 10), y: f.y - 8, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 20, t0: now }); } });
    } else if (e.k === 'musique') {
      for (const f of this.dancers) f.danceUntil = now + 0.5;
      this.band.forEach((f, k) => { if (Math.random() < dt * 1.6) this.notes.push({ x: f.x + (k ? -4 : 4), y: f.y - 26, t0: now }); });
      if (this.near(this.P.anchors.square.x, this.P.anchors.square.y, 240) && G.sfx && G.sfx.tone && now > (this.mus || 0)) { // une gigue, note après note (très doucement)
        const sc = [392, 440, 494, 523, 587, 659, 587, 523, 494, 440], i = Math.floor(t * 4) % sc.length; this.mus = now + 0.25;
        G.sfx.tone(sc[i], 0.18, { type: 'triangle', vol: 0.016 }); if (i % 4 === 0) G.sfx.tone(sc[i] / 2, 0.24, { type: 'sine', vol: 0.012 });
      }
    }
    // les répliques
    const lines = LINES[e.k] || [];
    for (const [at, who, txt] of lines) {
      const key = e.c + ':' + at; if (t < at || t > at + 4 || this.said.has(key)) continue;
      this.said.add(key);
      const f = this.speaker(e.k, who); if (f && this.inView(f)) this.bubble(f, txt);
    }
    if (e.k === 'annonce') { // le crieur répète son annonce ; on l'entend jusqu'au bout de la place
      const n = G.allNpcs && G.allNpcs.find((q) => q.id === 'crieur_pl'), key = e.c + ':a' + Math.floor(t / 22);
      if (n && !this.said.has(key) && t % 22 < 4) { this.said.add(key); if (this.inView(n)) G.renderer.addFx({ kind: 'bubble', text: annonceOf(e).t, follow: () => n, dur: 4.2, h: 34 }); }
    }
    if (e.k === 'colporteur') { const n = G.allNpcs && G.allNpcs.find((q) => q.id === 'colporteur_pl'); if (n) { for (const [at, , txt] of LINES.colporteur) { const key = e.c + ':' + at; if (t >= at && t < at + 4 && !this.said.has(key)) { this.said.add(key); if (this.inView(n)) this.bubble(n, txt); } } } }
    // une seule fois par événement, un mot en bas de l'écran quand on est en ville : ce qui se passe, et où
    if (inTown && this.hint !== e.c && t < 30 && PORT_KINDS[e.k].play && G.ui && G.ui.toast) { this.hint = e.c; G.ui.toast(`⚓ ${PORT_KINDS[e.k].name}.`, 'info'); }
    for (const o of ships) if (o.pship) { const still = o.moored || o.kind === 'barque'; o.pship.sail = still ? 0 : 1; if (still) o.pship.rud = 0; } // à quai : voiles ferlées, mâts droits
    G.portShips = ships;
  }
  speaker(k, who) {
    if (k === 'rixe') return who === 3 ? this.guard : who === 2 ? this.crowd[0] : this.duo[who];
    if (k === 'dispute') return this.duo[who];
    if (k === 'depart') return this.crew[who] && !this.crew[who].hidden ? this.crew[who] : null;
    if (k === 'reparation') return this.carp[who];
    if (k === 'musique') return this.band[who];
    if (k === 'navire') return this.dock[who] && !this.dock[who].hidden ? this.dock[who] : null;
    if (k === 'voleur') return who === 0 ? this.victim : this.guards[0];
    return null;
  }
  inView(o) { const R = this.G.renderer; return o.x > R.camX - 20 && o.x < R.camX + R.W + 20 && o.y > R.camY - 20 && o.y < R.camY + R.H + 30; }
  stepThief(e, dt, now) {
    const t = e.t, th = this.thief, caught = this.res && this.res.c === e.c ? this.res : null;
    const tq = caught ? Math.min(t, caught.at) : t;
    const q = thiefAt(tq);
    if (t < THIEF.start) { th.x = PORT_ROUTES.voleur[0][0]; th.y = PORT_ROUTES.voleur[0][1]; th.dir = 3; th.moving = false; if (Math.random() < dt * 3) th.atkT = now, th.atkA = -Math.PI / 2; }
    else { th.x = q.x; th.y = q.y; th.dir = q.dir; th.moving = q.moving && !caught; th.walk = (th.walk || 0) + (th.moving ? dt * 1.6 : 0); th.hidden = q.done && !caught; }
    if (caught) { th.moving = false; th.sitUntil = now + 1; if (!this.said.has('pris')) { this.said.add('pris'); if (this.inView(th)) { this.bubble(th, 'Ça va, ça va… je me rends.'); setTimeout(() => this.bubble(this.guards[0], `Bien joué, ${caught.who} !`), 1400); } } }
    this.guards.forEach((g, k) => {
      const lag = THIEF.guardLag + k * 0.6, gq = caught ? thiefAt(Math.max(THIEF.start, Math.min(t, caught.at) - 0.3)) : thiefAt(Math.max(THIEF.start, t - lag));
      if (t < THIEF.start) { g.moving = false; return; }
      const tx = gq.x + (caught ? (k ? 12 : -12) : 0), ty = gq.y + (caught ? 2 : 0), d = Math.hypot(tx - g.x, ty - g.y);
      if (d > 2) { const s = Math.min(d, (caught ? 40 : 64) * dt); g.x += (tx - g.x) / d * s; g.y += (ty - g.y) / d * s; g.moving = true; g.dir = Math.abs(tx - g.x) > Math.abs(ty - g.y) ? (tx < g.x ? 1 : 2) : (ty < g.y ? 3 : 0); g.walk = (g.walk || 0) + dt; } else g.moving = false;
      g.hidden = !caught && gq.done && d < 3;
    });
  }
  // ------------------------------------------------------------------ les gestes du joueur : la caisse du marchand
  interact() { // E : prendre une caisse sur la pile, ou la poser au dépôt (le serveur valide)
    const e = this.cur, G = this.G, p = G.player;
    if (!e || e.k !== 'navire' || !p || G.room >= 0) return false;
    const [px, py] = PORT_SPOTS.pile, [dx, dy] = PORT_SPOTS.depot;
    const atPile = Math.hypot(p.x - px, p.y - py) < 26, atDepot = this.carry && Math.hypot(p.x - dx, p.y - dy) < 34;
    if (!atPile && !atDepot) return false;
    G.send({ t: 'port', a: 'caisse' }); return true;
  }
  prompt() { // le petit mot au-dessus de la pile ou du dépôt
    const e = this.cur, G = this.G, p = G.player;
    if (!e || e.k !== 'navire' || !p || e.t < SHIP.arrive + 4 || e.t >= e.dur - SHIP.leave - 2) return null;
    const [px, py] = PORT_SPOTS.pile, [dx, dy] = PORT_SPOTS.depot;
    if (!this.carry && Math.hypot(p.x - px, p.y - py) < 26) return { x: px, y: py - 24, text: 'E : prendre une caisse' };
    if (this.carry && Math.hypot(p.x - dx, p.y - dy) < 34) return { x: dx, y: dy - 24, text: 'E : poser la caisse au dépôt' };
    return null;
  }
  onMsg(m) {
    const G = this.G;
    if (m.a === 'porte') {
      this.carry = !!m.on; if (G.player) G.player.carry = this.carry;
      if (!m.on && m.gold && G.ui) G.ui.toast(`Caisse livrée : +${m.gold} doublons (${m.n}/${m.max}).`, 'quest');
      else if (m.on && G.ui) G.ui.toast('Une caisse sur l’épaule : au dépôt, devant la Douane !', 'info');
      return true;
    }
    if (m.a === 'voleur') { this.res = { c: m.c, at: m.at, who: m.who }; return true; }
    if (m.a === 'etat') { if (m.caught) this.res = m.caught; this.carry = !!m.carry; if (G.player) G.player.carry = this.carry; return true; }
    return false;
  }
  onEvent(ev) { // ['port', 'caisse', id, on] : un autre pirate prend ou pose une caisse
    if (ev[0] !== 'port' || ev[1] !== 'caisse') return false;
    const e = this.G.ents.get(ev[2]); if (e) e.carry = !!ev[3];
    return true;
  }
  // ------------------------------------------------------------------ au sol : la pile de caisses, les copeaux, les notes
  drawGround(ctx, camX, camY, now) {
    const e = this.cur;
    if (e && e.k === 'navire' && e.t > SHIP.arrive && e.t < e.dur - SHIP.leave) { // la pile du quai du Levant
      const [px, py] = PORT_SPOTS.pile, X = Math.round(px - camX), Y = Math.round(py - camY);
      for (const [dx, dy] of [[-8, 0], [2, 0], [-3, -7], [10, 2]]) { ctx.fillStyle = '#2a1a0e'; ctx.fillRect(X + dx - 1, Y + dy - 7, 9, 8); ctx.fillStyle = '#8c5c33'; ctx.fillRect(X + dx, Y + dy - 6, 7, 6); ctx.fillStyle = '#ab7643'; ctx.fillRect(X + dx, Y + dy - 6, 7, 1); }
    }
    this.chips = this.chips.filter((c) => now - c.t0 < 0.7);
    for (const c of this.chips) { const k = now - c.t0; ctx.fillStyle = '#d8b07a'; ctx.fillRect(Math.round(c.x + c.vx * k - camX), Math.round(c.y + c.vy * k + 60 * k * k - camY), 1, 1); }
    this.notes = this.notes.filter((n) => now - n.t0 < 1.6);
    for (const n of this.notes) { const k = now - n.t0, X = Math.round(n.x + Math.sin(k * 5) * 3 - camX), Y = Math.round(n.y - k * 12 - camY); ctx.globalAlpha = Math.max(0, 1 - k / 1.6); ctx.fillStyle = '#ffe58a'; ctx.fillRect(X, Y, 2, 2); ctx.fillRect(X + 1, Y - 4, 1, 4); ctx.fillRect(X + 2, Y - 4, 2, 1); ctx.globalAlpha = 1; }
  }
  // l'heure de la journée et l'événement : pour le capitaine du port (et pour les tests)
  status() { const e = this.cur; return { phase: phaseOfDay(dayFrac(this.G.worldTime || 0)), k: e ? e.k : null, t: e ? Math.round(e.t) : 0, carry: this.carry }; }
}
const A2 = (P) => P.anchors;
