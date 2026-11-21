// Monde vivant, lot 6 : les petits événements spontanés. Rares, facultatifs, sans marqueur ni récompense : on peut
// s'arrêter pour regarder, ou passer son chemin. Tous sont décoratifs et locaux (chaque joueur voit les siens) :
//  - un docker laisse tomber sa caisse, ramasse ses affaires, repart ;
//  - le guet poursuit un voleur dans les rues — si le joueur lui barre la route, le voleur se rend ;
//  - un recruteur cherche des bras sur le quai, puis s'en va ;
//  - un pêcheur remonte une prise qui frétille ;
//  - à l'aube ou au crépuscule, un navire inconnu passe au loin, sans pavillon.
// Ils respectent le metteur en scène des habitants : pas de bulle s'il y en a déjà deux à l'écran.
import { moveWithCollision, canStand, zoneAt, Z } from '../shared/world.js';
import { TILE, T, dayFrac } from '../shared/constants.js';
import { phaseOf, dry } from './townsfolk.js';
import { CLOTH_KEYS } from './render/sprites-chars.js';

const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0));
const rnd = () => Math.random(); // (un appel, pas une copie : les scripts de contrôle peuvent forcer le hasard)

export class Evenements {
  constructor(G) { this.G = G; this.cool = {}; this.debris = []; this.temp = []; this.ships = []; this.fish = []; this.tryAt = 0; }
  ready(k, now) { return now > (this.cool[k] || 0); }
  rest(k, now, min, max) { this.cool[k] = now + min + rnd() * (max - min); }
  bubble(f, text, dur = 2.6) { const T2 = this.G.town; if (T2 && T2.bubblesInView() >= 2) return; this.G.renderer.addFx({ kind: 'bubble', text, follow: () => f, dur, h: 34 }); }
  inView(o, m = 0) { const R = this.G.renderer; return o.x > R.camX + m && o.x < R.camX + R.W - m && o.y > R.camY + m && o.y < R.camY + R.H - m; }
  person(role, x, y, look) {
    const L = look || { skin: Math.floor(rnd() * 4), hair: Math.floor(rnd() * 7), hairStyle: 'court', top: 'manteau', topCol: CLOTH_KEYS[Math.floor(rnd() * CLOTH_KEYS.length)], pants: 'brown', boots: 'black', hat: 'foulard', hatCol: 'black', beard: 0 };
    const f = { k: 'f', id: -9000 - Math.floor(rnd() * 900), x, y, tx: x, ty: y, dir: 0, moving: false, walk: 0, look: L, lookKey: JSON.stringify(L), weapon: null, crowd: 'evt', role, hidden: false };
    this.G.folk.push(f); this.temp.push(f); return f;
  }
  drop(f) { const i = this.G.folk.indexOf(f); if (i >= 0) this.G.folk.splice(i, 1); const j = this.temp.indexOf(f); if (j >= 0) this.temp.splice(j, 1); }
  walk(f, dt, sp) { const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy); if (d < 3) { f.moving = false; return true; } const s = sp * dt; let [nx, ny] = moveWithCollision(this.G.world, f.x, f.y, dx / d * s, dy / d * s); if (!dry(this.G.world, nx, ny)) { nx = f.x; ny = f.y; } f.moving = Math.hypot(nx - f.x, ny - f.y) > s * 0.2; f.x = nx; f.y = ny; f.walk = (f.walk || 0) + dt; f.dir = dirOf(dx, dy); if (!f.moving) f.stuck = (f.stuck || 0) + 1; return f.stuck > 40; }
  update(dt, now) {
    const G = this.G, p = G.player, T2 = G.town;
    if (!p || !T2 || G.room >= 0 || (G.cinema && G.cinema.on)) return;
    const ph = phaseOf(dayFrac(G.worldTime || 0)), z = zoneAt(G.world, p.x, p.y), city = T2.poi.get(z);
    // ce qui se déroule
    for (const e of this.temp.slice()) this.step(e, dt, now, p);
    this.debris = this.debris.filter((d) => now < d.until);
    this.fish = this.fish.filter((f) => now < f.t0 + 0.9);
    for (const s of this.ships) { s.x += s.vx * dt; }
    this.ships = this.ships.filter((s) => now < s.until);
    if (now < this.tryAt) return;
    this.tryAt = now + 2 + rnd() * 2;
    const folkHere = G.folk.filter((f) => !f.hidden && !f.talk && f.crowd == null && !f.patron && this.inView(f, 20));
    // 1. la caisse qui tombe
    if (this.ready('caisse', now) && rnd() < 0.12) {
      const d = folkHere.find((f) => f.role === 'docker' && f.carry && f.moving);
      if (d) {
        this.rest('caisse', now, 360, 600);
        d.carry = false; d.carryNext = true; d.next = null; d.tx = d.x; d.ty = d.y; d.act = 'ramasse'; d.actUntil = now + 6; d.sitUntil = now + 1.4; d.moving = false;
        for (let k = 0; k < 3; k++) this.debris.push({ x: d.x + (rnd() - 0.5) * 22, y: d.y + 2 + (rnd() - 0.5) * 8, k, until: now + 6 });
        G.sfx.hiss(0.18, { f: 220, q: 0.8, vol: 0.06, type: 'lowpass' });
        setTimeout(() => this.bubble(d, 'Oh non… ma cargaison !'), 500);
      }
    }
    // 2. le pêcheur remonte une prise
    if (this.ready('prise', now) && rnd() < 0.1) {
      const f = folkHere.find((q) => q.role === 'pecheur' && q.rod && !q.moving);
      if (f) { this.rest('prise', now, 240, 420); const [ux, uy] = [[0, 1], [-1, 0], [1, 0], [0, -1]][f.dir & 3]; this.fish.push({ x: f.x + ux * 22, y: f.y + uy * 16 - 4, tx: f.x, ty: f.y - 8, t0: now }); G.sfx.hiss(0.2, { f: 1800, q: 0.7, vol: 0.04, type: 'highpass' }); }
    }
    // 3. la poursuite (le jour, dans les grandes villes)
    if (city && (z === Z.TOWN || z === Z.LIBERTALIA) && ph === 'jour' && this.ready('voleur', now) && rnd() < 0.06) {
      const st = T2.streets.get(z).filter(([x, y]) => Math.hypot(x - p.x, y - p.y) > 90 && Math.hypot(x - p.x, y - p.y) < 160 && this.inView({ x, y }, 30));
      if (st.length && city.edges.length) {
        this.rest('voleur', now, 600, 900);
        const [x, y] = st[Math.floor(rnd() * st.length)], e = city.edges.reduce((b, q) => (Math.hypot(q.x - x, q.y - y) < Math.hypot(b.x - x, b.y - y) && Math.hypot(q.x - x, q.y - y) > 200 ? q : b), city.edges[0]);
        const thief = this.person('voleur', x, y, { skin: 1, hair: 2, hairStyle: 'court', top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'black', beard: 0 });
        thief.tx = e.x; thief.ty = e.y; thief.t0 = now;
        const gx = x - (e.x - x) * 0.12, gy = y - (e.y - y) * 0.12;
        const guard = this.person('poursuivant', canStand(G.world, gx, gy) ? gx : x, canStand(G.world, gx, gy) ? gy : y, { skin: 2, hair: 1, hairStyle: 'court', top: 'manteau', topCol: 'navy', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black', beard: 1 });
        guard.chase = thief; thief.guard = guard; guard.t0 = now;
        setTimeout(() => this.bubble(guard, 'Halte ! Au voleur !', 2.2), 300);
      }
    }
    // 4. le recruteur, sur un quai
    if (city && city.quay.length && ph === 'jour' && (z === Z.TOWN || z === Z.RADE || z === Z.LIBERTALIA) && this.ready('recrue', now) && rnd() < 0.08) {
      const q = city.quay.filter((s) => Math.hypot(s.x - p.x, s.y - p.y) < 150 && this.inView(s, 30));
      if (q.length && city.edges.length) {
        this.rest('recrue', now, 540, 840);
        const s = q[Math.floor(rnd() * q.length)], f = this.person('recruteur', s.x, s.y, { skin: 3, hair: 4, hairStyle: 'queue', top: 'gilet', topCol: 'red', pants: 'navy', boots: 'brown', hat: 'tricorne', hatCol: 'red', beard: 2 });
        f.dir = (s.dir + 2) % 4; f.until = now + 26; f.leave = city.edges[Math.floor(rnd() * city.edges.length)];
        setTimeout(() => this.bubble(f, z === Z.RADE ? 'On cherche des bras pour le Hareng Saur ! Bonne paye !' : 'Qui veut s’engager ? Départ à la marée !', 3.2), 1500);
      }
    }
    // 5. un navire au loin, à l'aube ou au crépuscule
    if ((ph === 'aube' || ph === 'soir') && this.ready('voile', now) && rnd() < 0.05) {
      const R = G.renderer, W = G.world;
      for (let k = 0; k < 8; k++) {
        const y = R.camY + R.H * (0.3 + rnd() * 0.4), x0 = R.camX + 10; // dans la bande du milieu, loin des jauges et de la barre d'action
        let deep = 0; for (let x = x0; x < x0 + R.W - 20; x += 16) { const t = W.tiles[Math.floor(y / TILE) * W.W + Math.floor(x / TILE)]; if (t === T.DEEP) deep++; }
        if (deep * 16 > R.W * 0.7 && Math.abs(y - p.y) > 60) { this.rest('voile', now, 720, 1100); const dirR = rnd() < 0.5; this.ships.push({ x: dirR ? R.camX - 20 : R.camX + R.W + 20, y, vx: dirR ? 9 : -9, until: now + 70 }); break; }
      }
    }
  }
  step(e, dt, now, p) {
    if (e.role === 'voleur') {
      if (e.caught) { if (now > e.caught + 4) { e.tx = e.guard.leave.x; e.ty = e.guard.leave.y; if (this.walk(e, dt, 22) || now > e.caught + 20) this.drop(e); } return; }
      const near = Math.hypot(p.x - e.x, p.y - e.y) < 20;
      if (near && !e.caught) { // le joueur lui barre la route : il se rend
        e.caught = now; e.moving = false; e.dir = dirOf(p.x - e.x, p.y - e.y); const g = e.guard;
        if (g) { g.leave = { x: g.x, y: g.y }; setTimeout(() => this.bubble(g, 'Merci, capitaine ! Je m’en occupe.', 2.6), 900); setTimeout(() => this.bubble(e, 'Ça va, ça va…', 1.8), 300); }
        return;
      }
      if (this.walk(e, dt, 62) || now > e.t0 + 16) this.drop(e);
      return;
    }
    if (e.role === 'poursuivant') {
      const t = e.chase;
      if (!t || !this.G.folk.includes(t)) { if (!e.leave) { const c = this.G.town.poi.get(zoneAt(this.G.world, e.x, e.y)); e.leave = c && c.edges[0] ? c.edges[0] : { x: e.x, y: e.y }; } e.tx = e.leave.x; e.ty = e.leave.y; if (this.walk(e, dt, 30) || now > e.t0 + 40) this.drop(e); return; }
      if (t.caught) { e.tx = t.x + (e.x < t.x ? -12 : 12); e.ty = t.y; if (now > t.caught + 4) { e.tx = e.leave.x; e.ty = e.leave.y; } this.walk(e, dt, 26); return; }
      e.tx = t.x; e.ty = t.y; this.walk(e, dt, 54); return;
    }
    if (e.role === 'recruteur') {
      if (now < e.until) { e.moving = false; if (rnd() < dt * 0.2) e.dir = [0, 1, 2][Math.floor(rnd() * 3)]; return; }
      e.tx = e.leave.x; e.ty = e.leave.y; if (this.walk(e, dt, 24) || now > e.until + 40) this.drop(e);
    }
  }
  // au sol : la cargaison renversée, le poisson qui saute, le navire au loin
  drawGround(ctx, camX, camY, now) {
    for (const d of this.debris) {
      const X = Math.round(d.x - camX), Y = Math.round(d.y - camY);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(X - 3, Y + 2, 8, 2);
      ctx.fillStyle = '#2a1a0e'; ctx.fillRect(X - 3, Y - 4, 8, 7); ctx.fillStyle = d.k === 1 ? '#6d4626' : '#8c5c33'; ctx.fillRect(X - 2, Y - 3, 6, 5); ctx.fillStyle = '#ab7643'; ctx.fillRect(X - 2, Y - 3, 6, 1);
      if (d.k === 2) { ctx.fillStyle = '#f2a03a'; ctx.fillRect(X + 4, Y + 1, 2, 2); ctx.fillRect(X - 5, Y + 2, 2, 2); } // des oranges qui ont roulé
    }
    for (const f of this.fish) {
      const k = (now - f.t0) / 0.9, x = f.x + (f.tx - f.x) * k, y = f.y + (f.ty - f.y) * k - Math.sin(k * Math.PI) * 14;
      const X = Math.round(x - camX), Y = Math.round(y - camY), flip = Math.floor(now * 14) % 2;
      ctx.fillStyle = '#a8c0c8'; ctx.fillRect(X - 2, Y - 1, 5, 2); ctx.fillStyle = '#6a8a98'; ctx.fillRect(flip ? X + 3 : X - 3, Y - 2, 1, 4); ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 1, 1, 1);
    }
    for (const s of this.ships) { // une silhouette, sans couleur ni pavillon : on ne sait pas qui c'est
      const X = Math.round(s.x - camX), Y = Math.round(s.y - camY);
      ctx.fillStyle = 'rgba(16,20,34,0.42)';
      ctx.fillRect(X - 9, Y, 18, 3); ctx.fillRect(X - 7, Y + 3, 14, 1);
      ctx.fillRect(X - 1, Y - 16, 1, 16); ctx.fillRect(X + 4, Y - 11, 1, 11);
      ctx.fillRect(X - 6, Y - 14, 5, 7); ctx.fillRect(X, Y - 13, 6, 8); ctx.fillRect(X + 2, Y - 9, 5, 6);
    }
  }
}
