// 1.0 : la marine — navires partagés et coques. Un compagnon (même groupe ou même équipage) monte à bord
// du navire d'un capitaine comme canonnier : il tire en bordée, à bâbord ou à tribord, et chaque bras de plus
// fait filer le navire un peu plus vite. Les navires ont une coque : elle encaisse une part des coups, peut
// sombrer (tout le monde est rejeté sur la côte), et se répare au chantier naval.
import { canStand, roomIdAt, zoneAt } from '../shared/world.js';
import { T } from '../shared/constants.js';
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';
import { tileAt } from '../shared/world.js';

export const HULL = { radeau: 60, barque: 100, sloop: 180, brick: 260, goelette: 300, galion: 420, veuve: 520, spectre: 320 };
const REPAIR_COST = 3; // doublons par point de coque
const angDiff = (a, b) => { let d = Math.abs(a - b) % (Math.PI * 2); return d > Math.PI ? Math.PI * 2 - d : d; };
export const isShipwright = (id) => !!(NPCS[id] && (NPCS[id].repair || (NPCS[id].shop || []).some((i) => ITEMS[i] && ITEMS[i].boat)));

export const naval = {
  navalLoad(p, d) {
    p.hulls = {};
    if (d && d.hulls && typeof d.hulls === 'object') for (const k in d.hulls) if (ITEMS[k] && ITEMS[k].boat) p.hulls[k] = Math.max(0, Math.min(this.hullMax(k), d.hulls[k] | 0));
    p.aboard = 0;
  },
  hullMax(id) { const b = ITEMS[id] && ITEMS[id].boat; return b ? HULL[b.kind] || 120 : 0; },
  hullOf(p, id = p.boat) { return p.hulls[id] == null ? this.hullMax(id) : p.hulls[id]; },
  navalMe(p) {
    const cap = p.boat ? p : p.aboard ? this.players.get(p.aboard) : null, id = cap && cap.boat;
    return { hull: id ? this.hullOf(cap) : 0, hullMax: id ? this.hullMax(id) : 0, crewN: p.boat ? this.passengers(p).length : 0, ab: p.aboard || 0, repairCost: this.repairCost(p) };
  },
  passengers(cap) { const out = []; for (const q of this.players.values()) if (q.aboard === cap.id) out.push(q); return out; },
  seats(cap) { const b = cap.boat && ITEMS[cap.boat].boat; return b ? Math.max(1, b.cannon || 0) : 0; },
  mates(a, b) { return (a.group && a.group === b.group) || (a.crew && a.crew === b.crew); },
  // monter à bord du navire d'un compagnon
  embark(p, name) {
    const cap = this.byName(name);
    if (!cap || cap === p || !cap.boat || p.dead || p.boat || p.aboard || p.room >= 0) return this.toast(p, 'Aucun navire où monter.', 'warn');
    if (!this.mates(p, cap)) return this.toast(p, 'Seuls les membres de son groupe ou de son équipage montent à bord.', 'warn');
    if (Math.hypot(cap.x - p.x, cap.y - p.y) > 56) return this.toast(p, 'Approchez-vous du navire.', 'warn');
    if (this.passengers(cap).length >= this.seats(cap)) return this.toast(p, `Plus de place à bord (${this.seats(cap)} canonnier${this.seats(cap) > 1 ? 's' : ''} au plus).`, 'warn');
    if (p.riding) this.dismount(p);
    p.aboard = cap.id; p.lookVer++; p.dirtyMe = true; cap.dirtyMe = true;
    this.teleport(p, cap.x, cap.y, { aboard: cap.id });
    this.toast(p, `À bord du navire de ${cap.name} (${ITEMS[cap.boat].name.toLowerCase()}) ! Visez à bâbord ou à tribord et tirez (clic droit) ; E pour débarquer.`, 'quest');
    this.toast(cap, `${p.name} monte à bord comme canonnier.`, 'info');
  },
  shoreNear(x, y, maxR = 420) {
    for (let r = 14; r <= maxR; r += 8) for (let k = 0; k < 20; k++) {
      const a = k / 20 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.85;
      const t = tileAt(this.world, px, py);
      if (t === T.WATER || t === T.DEEP || t === T.SWAMP || !canStand(this.world, px, py) || roomIdAt(this.world, px, py) !== -1) continue;
      return [px, py];
    }
    return null;
  },
  disembark(p, why) {
    if (!p.aboard) return;
    const at = this.shoreNear(p.x, p.y, why ? 1200 : 90);
    if (!at && !why) return this.toast(p, 'Pas de rivage où débarquer ici : demandez au capitaine d’accoster.', 'warn');
    const cap = this.players.get(p.aboard);
    p.aboard = 0; p.lookVer++; p.dirtyMe = true; if (cap) cap.dirtyMe = true;
    const [x, y] = at || [this.world.spawnPoint.x, this.world.spawnPoint.y];
    this.teleport(p, x, y, { land: 1 });
    if (why) this.toast(p, why, 'warn');
  },
  // chaque tick : les canonniers suivent le navire ; la coque se refait un peu au calme (jusqu'à la moitié)
  navalTick() {
    for (const p of this.players.values()) {
      if (p.aboard) {
        const cap = this.players.get(p.aboard);
        if (!cap || !cap.boat || cap.dead || p.dead) { this.disembark(p, cap && cap.dead ? 'Votre capitaine est tombé : vous regagnez la côte à la nage.' : 'Le navire n’est plus là : vous regagnez la côte à la nage.'); continue; }
        const i = this.passengers(cap).indexOf(p), side = i % 2 ? 1 : -1;
        p.x = cap.x + side * (8 + 4 * Math.floor(i / 2)); p.y = cap.y - 2; p.room = cap.room; p.zone = cap.zone; p.moving = false;
      }
      if (this.tickCount % 20 === 0 && p.boat && this.time - p.lastHurt > 10) {
        const max = this.hullMax(p.boat), cur = this.hullOf(p);
        if (cur < max * 0.5) { p.hulls[p.boat] = Math.min(Math.round(max * 0.5), cur + 1); p.dirtyMe = true; }
      }
    }
  },
  // la coque prend 70 % des coups portés au navire (au capitaine ou à ses canonniers)
  hullHit(p, dmg) {
    const cap = p.boat ? p : p.aboard ? this.players.get(p.aboard) : null;
    if (!cap || !cap.boat) return dmg;
    const h = Math.round(dmg * 0.7);
    cap.hulls[cap.boat] = this.hullOf(cap) - h; cap.dirtyMe = true; cap.lastHurt = this.time;
    if (cap.hulls[cap.boat] <= 0) { cap.hulls[cap.boat] = 0; this.sinkShip(cap); }
    return Math.max(1, dmg - h);
  },
  sinkShip(cap) {
    const name = ITEMS[cap.boat].name;
    this.ev(cap.x, cap.y, ['fx', 'splash', cap.x, cap.y]); this.ev(cap.x, cap.y, ['boom', Math.round(cap.x), Math.round(cap.y), 30, 1]);
    for (const q of this.passengers(cap)) this.disembark(q, `Le navire de ${cap.name} (${name.toLowerCase()}) sombre ! Vous regagnez la côte à la nage.`);
    const at = this.shoreNear(cap.x, cap.y, 1200) || [this.world.spawnPoint.x, this.world.spawnPoint.y];
    cap.boat = null; cap.lookVer++;
    cap.hp = Math.max(1, Math.min(cap.hp, Math.round(cap.stats.maxHp * 0.3)));
    this.teleport(cap, at[0], at[1], { land: 1 });
    this.toast(cap, `Votre navire (${name.toLowerCase()}) a sombré ! Vous regagnez la côte à la nage. Faites réparer sa coque au chantier naval avant de reprendre la mer.`, 'warn');
  },
  repairCost(p) { let c = 0; for (const s of p.inv) if (s && ITEMS[s.id].boat) c += (this.hullMax(s.id) - this.hullOf(p, s.id)) * REPAIR_COST; return c; },
  repair(p) {
    const near = Object.keys(NPCS).find((id) => isShipwright(id) && this.nearNpc(p, id, 110));
    if (!near) return this.toast(p, 'Les coques se réparent au chantier naval.', 'warn');
    const cost = this.repairCost(p);
    if (!cost) return this.toast(p, 'Vos coques sont en parfait état.', 'info');
    if (p.gold < cost) return this.toast(p, `La réparation coûte ${cost} doublons.`, 'warn');
    p.gold -= cost; for (const s of p.inv) if (s && ITEMS[s.id].boat) p.hulls[s.id] = this.hullMax(s.id);
    p.dirtyMe = true; this.audit && this.audit('reparation', { who: p.key, cost });
    this.toast(p, `Coques remises à neuf (−${cost} doublons). Bon vent !`, 'quest');
  },
  // la bordée d'un canonnier : perpendiculaire au cap du navire, du côté où il vise
  broadside(p, a) {
    const cap = this.players.get(p.aboard), b = cap && cap.boat && ITEMS[cap.boat].boat;
    if (!b) return false;
    const h = cap.headA || 0, left = h - Math.PI / 2, right = h + Math.PI / 2;
    const side = angDiff(a, left) < angDiff(a, right) ? left : right;
    const aa = angDiff(a, side) > 0.6 ? side + Math.sign(Math.sin(a - side)) * 0.6 : a;
    const n = Math.max(1, b.cannon || 1), pvp = true;
    this.ev(p.x, p.y, ['atk', p.id, +aa.toFixed(2), 3]);
    for (let k = 0; k < n; k++) {
      const off = n > 1 ? (k - (n - 1) / 2) * 0.12 : 0;
      const [v, crit] = this.rollDamage(p, 24 + p.level * 4);
      this.spawnProj(p.x + Math.cos(aa) * 12, p.y - 8 + Math.sin(aa) * 8, aa + off, 250, 240, v, 'p', p.id, 'cball', 1, crit, pvp);
    }
    return true;
  },
};
