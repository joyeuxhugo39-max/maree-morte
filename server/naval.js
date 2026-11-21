// 1.0 : les coques. Chaque navire possédé a une coque : elle encaisse les coups (ceux qui frappent le navire,
// et 70 % de ceux qui frappent les pirates sur son pont), peut céder (le navire sombre), se refait un peu au
// calme, et se répare au chantier naval. La conduite des navires est dans server/ships.js (1.1).
import { canStand, roomIdAt, tileAt } from '../shared/world.js';
import { T, TILE } from '../shared/constants.js';
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';

import { SHIP_HULL } from '../shared/data/ships.js';

export const HULL = SHIP_HULL; // 1.9 : la table vit dans shared/data/ships.js (les fiches des navires la montrent)
const REPAIR_COST = 3; // doublons par point de coque
export const isShipwright = (id) => !!(NPCS[id] && (NPCS[id].repair || (NPCS[id].shop || []).some((i) => ITEMS[i] && ITEMS[i].boat)));

export const naval = {
  navalLoad(p, d) {
    p.hulls = {};
    if (d && d.hulls && typeof d.hulls === 'object') for (const k in d.hulls) if (ITEMS[k] && ITEMS[k].boat) p.hulls[k] = Math.max(0, Math.min(this.hullMax(k), d.hulls[k] | 0));
  },
  hullMax(id) { const b = ITEMS[id] && ITEMS[id].boat; return b ? HULL[b.kind] || 120 : 0; },
  hullOf(p, id = p.boat) { return p.hulls[id] == null ? this.hullMax(id) : p.hulls[id]; },
  mates(a, b) { return (a.group && a.group === b.group) || (a.crew && a.crew === b.crew); },
  shoreNear(x, y, maxR = 420) {
    for (let r = 14; r <= maxR; r += 8) for (let k = 0; k < 20; k++) {
      const a = k / 20 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.85;
      const t = tileAt(this.world, px, py);
      if (t === T.WATER || t === T.DEEP || t === T.SWAMP || !canStand(this.world, px, py) || roomIdAt(this.world, px, py) !== -1 || this.pointOnShip(px, py)) continue;
      return [px, py];
    }
    return null;
  },
  // les navires à réparer : ceux qui ne sont pas en mer, ou dont le navire armé est à ce port
  repairable(p, id) { const sh = this.ownShip(p.key); if (!sh || sh.item !== id) return true; const b = this.berthFor(p); return !!b && Math.hypot(sh.x - b.tx * TILE, sh.y - b.ty * TILE) < 420; },
  repairCost(p) { let c = 0; for (const s of p.inv) if (s && ITEMS[s.id].boat && this.repairable(p, s.id)) c += (this.hullMax(s.id) - this.hullOf(p, s.id)) * REPAIR_COST; return c; },
  repair(p) {
    const near = Object.keys(NPCS).find((id) => isShipwright(id) && this.nearNpc(p, id, 110));
    if (!near) return this.toast(p, 'Les coques se réparent au chantier naval.', 'warn');
    const cost = this.repairCost(p);
    if (!cost) { const sh = this.ownShip(p.key); return this.toast(p, sh && !this.repairable(p, sh.item) && this.hullOf(p, sh.item) < this.hullMax(sh.item) ? 'Votre navire est en mer : ramenez-le à quai pour le réparer.' : 'Vos coques sont en parfait état.', 'info'); }
    if (p.gold < cost) return this.toast(p, `La réparation coûte ${cost} doublons.`, 'warn');
    p.gold -= cost;
    for (const s of p.inv) if (s && ITEMS[s.id].boat && this.repairable(p, s.id)) p.hulls[s.id] = this.hullMax(s.id);
    const sh = this.ownShip(p.key); if (sh && this.repairable(p, sh.item)) { sh.hull = this.hullMax(sh.item); sh.dmg = { sail: 0, rud: 0 }; } // 1.9 : la toile et le gouvernail aussi
    p.dirtyMe = true; this.audit && this.audit('reparation', { who: p.key, cost });
    this.toast(p, `Coques remises à neuf (−${cost} doublons). Bon vent !`, 'quest');
  },
};
