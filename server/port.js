// 1.8 : Port-Lanterne, côté serveur.
//  - Les points d'apparition : une vingtaine autour de la Flamme ; on prend le plus dégagé des autres joueurs, on
//    vérifie à chaque fois qu'il est praticable (une construction a pu pousser), et l'ancien point reste le recours.
//  - Les événements du port : le calendrier est partagé (shared/port-events.js) ; le serveur ne fait que valider les
//    gestes des joueurs — porter une caisse du navire marchand au dépôt, barrer la route au voleur — et payer.
//    Les personnages d'événement (crieur, colporteur, négociante) ne sont « là » que pendant leur événement.
import { canStand, zoneAt, Z } from '../shared/world.js';
import { TILE } from '../shared/constants.js';
import { NPCS } from '../shared/data/npcs.js';
import { portEventAt, portNpcAt, thiefAt, THIEF, PORT_SPOTS, SHIP, PORT_PERIOD } from '../shared/port-events.js';

const CRATE_MAX = 3, CRATE_GOLD = 12, THIEF_GOLD = 30, NEAR = 30;

export const portLogic = {
  // ------------------------------------------------------------ apparition
  // un point d'apparition libre : praticable, et le plus loin possible des autres pirates (jamais l'un sur l'autre)
  spawnSpot(p) {
    const W = this.world, pts = W.spawnPoints || [];
    const others = [...this.players.values()].filter((q) => q !== p && q.room === -1 && !q.dead && Math.abs(q.x - W.spawnPoint.x) < 260 && Math.abs(q.y - W.spawnPoint.y) < 200);
    let best = null, bestD = -1;
    const start = Math.floor(Math.random() * Math.max(1, pts.length));
    for (let k = 0; k < pts.length; k++) {
      const s = pts[(start + k) % pts.length];
      if (!canStand(W, s.x, s.y, false, p && p.key)) continue;
      let d = 1e9; for (const q of others) d = Math.min(d, Math.hypot(q.x - s.x, q.y - s.y));
      if (d >= 40) return { x: s.x, y: s.y }; // assez de place : on le prend (au hasard parmi les libres)
      if (d > bestD) { bestD = d; best = s; }
    }
    if (best && bestD >= 16) return { x: best.x, y: best.y };
    // tous les points sont pris (une foule autour de la Flamme) : on se pose à côté du plus dégagé, jamais sur quelqu'un,
    // ni au milieu d'un grand passage
    const lane = (x, y) => { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return ((W.port && W.port.lanes) || []).some(([x0, y0, x1, y1]) => tx >= x0 && tx <= x1 && ty >= y0 && ty <= y1); };
    if (best) {
      for (let r = 16; r <= 40; r += 8) for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + r, x = best.x + Math.cos(a) * r, y = best.y + Math.sin(a) * r * 0.7;
        if (!canStand(W, x, y, false, p && p.key) || zoneAt(W, x, y) !== Z.TOWN || lane(x, y)) continue;
        if (others.every((q) => Math.hypot(q.x - x, q.y - y) >= 16)) return { x, y };
      }
      return { x: best.x, y: best.y };
    }
    return { x: W.spawnPoint.x, y: W.spawnPoint.y };
  },
  // ------------------------------------------------------------ événements
  portClosed() { return !!(this.fs && this.fs.ed && this.fs.ed.open); }, // la fête est ouverte : certains événements lui laissent la place
  portEvent() { return portEventAt(this.worldTime, this.portClosed()); },
  portNpcHere(id) { const N = NPCS[id]; if (!N || !N.ev) return true; return !!portNpcAt(id, this.worldTime, this.portClosed()); },
  portTick() {
    const e = this.portEvent();
    // les personnages d'événement suivent le calendrier (le colporteur fait le tour de la place)
    for (const id of ['crieur_pl', 'colporteur_pl', 'negociante_pl']) {
      const n = this.npcPos.get(id); if (!n) continue;
      const at = portNpcAt(id, this.worldTime, this.portClosed());
      if (at) { n.x = at.x; n.y = at.y; }
    }
    if (!e) { this.portCur = null; return; }
    if (!this.portCur || this.portCur.c !== e.c) this.portCur = { c: e.c, k: e.k, caught: null, crates: new Map() };
    const S = this.portCur;
    // le voleur : un pirate qui se tient sur son chemin l'arrête ; le serveur seul en décide
    if (e.k === 'voleur' && !S.caught && e.t >= THIEF.start + 1) { // (pas à l'étal même : il faut lui barrer la route)
      const th = thiefAt(e.t);
      if (!th.done) for (const p of this.players.values()) {
        if (p.dead || p.room !== -1 || p.ship || Math.hypot(p.x - th.x, p.y - th.y) > 14) continue;
        S.caught = { t: e.t, who: p.name, id: p.id };
        p.gold += THIEF_GOLD; p.dirtyMe = true;
        this.addRep(p, 'port', 3);
        this.toast(p, `Vous avez barré la route au voleur ! Le guet vous remet ${THIEF_GOLD} doublons.`, 'quest');
        this.audit && this.audit('port_voleur', { who: p.key, gold: THIEF_GOLD });
        this.portBroadcast({ t: 'port', a: 'voleur', c: e.c, at: e.t, who: p.name, x: Math.round(th.x), y: Math.round(th.y) });
        break;
      }
    }
  },
  // un message à tous ceux qui sont dehors, à Port-Lanterne (un seul par événement : rien en continu)
  portBroadcast(msg) { for (const p of this.players.values()) if (p.room === -1 && p.zone === Z.TOWN) this.send(p, msg); },
  // l'état du port pour un pirate qui arrive (un voleur déjà pris, une caisse sur l'épaule)
  portState(p) {
    const S = this.portCur;
    this.send(p, { t: 'port', a: 'etat', caught: S && S.caught ? { c: S.c, at: S.caught.t, who: S.caught.who } : null, carry: p.portCarry && S && p.portCarry === S.c ? 1 : 0 });
  },
  portMsg(p, m) {
    if (!m || m.a !== 'caisse' || p.dead || p.room !== -1 || p.ship) return;
    const e = this.portEvent();
    const moored = e && e.k === 'navire' && e.t >= SHIP.arrive + 4 && e.t < e.dur - SHIP.leave - 2;
    if (!moored) { if (p.portCarry) { p.portCarry = 0; this.send(p, { t: 'port', a: 'porte', on: 0 }); } return this.toast(p, 'Il n’y a rien à décharger pour l’instant.', 'warn'); }
    if (!this.portCur || this.portCur.c !== e.c) this.portCur = { c: e.c, k: e.k, caught: null, crates: new Map() };
    const S = this.portCur, n = S.crates.get(p.key) || 0;
    const [px, py] = PORT_SPOTS.pile, [dx, dy] = PORT_SPOTS.depot;
    if (p.portCarry === e.c) { // livrer au dépôt
      if (Math.hypot(p.x - dx, p.y - dy) > NEAR + 10) return this.toast(p, 'Portez la caisse au dépôt, devant la Douane.', 'info');
      p.portCarry = 0; S.crates.set(p.key, n + 1);
      p.gold += CRATE_GOLD; p.dirtyMe = true; this.addRep(p, 'port', 1);
      this.send(p, { t: 'port', a: 'porte', on: 0, n: n + 1, max: CRATE_MAX, gold: CRATE_GOLD });
      this.ev(p.x, p.y, ['port', 'caisse', p.id, 0]);
      this.audit && this.audit('port_caisse', { who: p.key, n: n + 1 });
      return;
    }
    if (Math.hypot(p.x - px, p.y - py) > NEAR) return this.toast(p, 'Les caisses du navire sont sur la pile, au bout du quai du Levant.', 'info');
    if (n >= CRATE_MAX) return this.toast(p, `Vous avez déjà porté ${CRATE_MAX} caisses pour ce navire. Laissez-en aux autres !`, 'info');
    p.portCarry = e.c;
    this.send(p, { t: 'port', a: 'porte', on: 1, n, max: CRATE_MAX });
    this.ev(p.x, p.y, ['port', 'caisse', p.id, 1]);
  },
  // un porteur qui lâche sa caisse (navire reparti, mort, voyage) : elle retourne sur la pile, sans gain
  portDrop(p) { if (p.portCarry) { p.portCarry = 0; this.send(p, { t: 'port', a: 'porte', on: 0 }); this.ev(p.x, p.y, ['port', 'caisse', p.id, 0]); } },
  portPlayerTick(p) {
    if (!p.portCarry) return;
    const e = this.portEvent();
    if (!e || e.k !== 'navire' || e.c !== p.portCarry || p.dead || p.room !== -1 || p.ship || zoneAt(this.world, p.x, p.y) !== Z.TOWN) this.portDrop(p);
  },
};
export { CRATE_MAX, CRATE_GOLD, THIEF_GOLD, PORT_PERIOD, TILE };
