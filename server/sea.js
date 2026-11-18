// 1.0 : les fonds marins — sur le pont d'un navire, au-dessus d'un site de plongée, la cloche descend le pirate
// dans les fonds (l'épave du Léviathan, les Grottes des Abysses, Ys-la-Noyée). Sous l'eau, l'air s'épuise :
// les poches d'air le rendent, le casque de scaphandrier le double ; à bout d'air, on se noie. On remonte par
// la corde de l'ancre, et l'on retrouve le pont de son navire (1.1 : qui a jeté l'ancre au-dessus du site).
import { ITEMS } from '../shared/data/items.js';
import { shipOf, nearestDeck } from '../shared/data/ships.js';

const AIR_BASE = 45, POCKET_RANGE = 34;

export const sea = {
  seaRoom(p) { return p.room >= 0 && this.world.rooms[p.room] && this.world.rooms[p.room].kind === 'underwater' ? this.world.rooms[p.room] : null; },
  airMax(p) { return AIR_BASE + (p.eq.hat && ITEMS[p.eq.hat] && ITEMS[p.eq.hat].air || 0); },
  diveSpotNear(p) { for (const s of this.world.diveSpots) if (Math.hypot(s.x - p.x, s.y - p.y) < 110) return s; return null; },
  dive(p) {
    const sh = this.myShip(p);
    if (p.dead || !sh) return this.toast(p, 'On plonge depuis le pont d’un navire, au-dessus d’un site de plongée (des bulles remontent à la surface).', 'warn');
    if (this.countItem(p, 'cloche_plongee') < 1) return this.toast(p, 'Il vous faut une cloche de plongée (Ysaline, au chantier naval de Havre-des-Brumes).', 'warn');
    const s = this.diveSpotNear(p);
    if (!s) return this.toast(p, 'Pas de site de plongée ici : cherchez les bulles qui remontent à la surface.', 'warn');
    const d = this.world.doors[s.door];
    if (!sh.anchor) { sh.anchor = 1; sh.anchorAt = this.time + 1.1; this.ev(sh.x, sh.y, ['fx', 'anchor', sh.id, 1]); this.toast(p, 'Vous jetez l’ancre avant de plonger.', 'info'); }
    p.diveBoat = sh.id; p.air = this.airMax(p);
    this.teleport(p, d.ix, d.iy, { door: d.id });
    this.questAct(p, 'plonge_' + s.key);
    const seen = (p.cnt.dives || 0) | (1 << ['leviathan', 'grottes', 'ys'].indexOf(s.key)); p.cnt.dives = seen; if (seen === 7) this.unlock(p, 'plongeur');
    this.toast(p, `La cloche descend… ${s.name}. Surveillez votre air : les bulles le rendent. La corde de l’ancre (en bas) vous remonte.`, 'quest');
  },
  // remonter : on retrouve son navire là où on l'a laissé (ou, sans navire, la côte la plus proche)
  surface(p, d) {
    const sh = this.ships.get(p.diveBoat) || this.ownShip(p.key);
    p.diveBoat = null; p.air = 0;
    if (sh && !sh.sinkT && this.canBoard(p, sh) && Math.hypot(sh.x - d.ox, sh.y - d.oy) < 700) { // la corde de l'ancre : retour sur le pont
      const S = shipOf(sh.kind), [lx, ly] = nearestDeck(S, S.cap - 14, 0);
      this.teleport(p, sh.x, sh.y, { door: d.id, out: 1, deck: 1 });
      this.joinDeck(p, sh, lx, ly);
      this.sendPos(p);
      return;
    }
    const at = this.shoreNear(d.ox, d.oy, 1600) || [this.world.spawnPoint.x, this.world.spawnPoint.y];
    this.teleport(p, at[0], at[1], { door: d.id, out: 1 });
    this.toast(p, 'Sans navire pour vous attendre, vous regagnez la côte à la nage.', 'warn');
  },
  // chaque seconde : l'air
  seaTick(p) {
    const r = this.seaRoom(p);
    if (!r) { if (p.air) { p.air = 0; p.dirtyMe = true; } return; }
    if (p.dead) return;
    const max = this.airMax(p);
    if (p.air == null || p.air <= 0 && !p.drowning) p.air = p.air == null ? max : p.air;
    const pocket = this.world.airPockets.some((a) => a.room === p.room && Math.hypot(a.x - p.x, a.y - p.y) < POCKET_RANGE);
    p.air = pocket ? Math.min(max, p.air + 9) : p.air - 1;
    if (p.air <= 0) { p.air = 0; this.damagePlayer(p, p.stats.maxHp * 0.08, null, false, 'w'); if (p.air === 0 && Math.random() < 0.3) this.toast(p, 'Vous vous noyez ! Une poche d’air, vite, ou remontez.', 'warn'); }
    else if (p.air === 10) this.toast(p, 'Plus que dix secondes d’air !', 'warn');
    p.dirtyMe = true;
  },
};
