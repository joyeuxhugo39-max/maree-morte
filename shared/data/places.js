// 1.0 : les lieux et leur réputation — chaque grande ville se souvient de vous : ce que vous y avez fait,
// les morts abattus alentour, les quêtes rendues, l'or dépensé… ou les crimes commis. La réputation fait
// baisser les prix chez ses marchands et la taxe que la ville prélève sur vos ventes.
import { Z, roomIdAt, zoneAt } from '../world.js';
import { TILE } from '../constants.js';

export const PLACES = {
  port: { name: 'Port-Lanterne', zone: Z.TOWN, key: 'town', tax: 0.05 },
  rade: { name: 'Rade-aux-Flibustiers', zone: Z.RADE, key: 'rade', tax: 0.08 },
  havre: { name: 'Havre-des-Brumes', zone: Z.HAVRE, key: 'havre', tax: 0.08 },
  anse: { name: 'Anse-Tranquille', zone: Z.ANSE, key: 'anse', tax: 0.05 },
  lib: { name: 'Libertalia', zone: Z.LIBERTALIA, key: 'libertalia', tax: 0.12 },
};
export const PLACE_ORDER = ['port', 'rade', 'havre', 'anse', 'lib'];
export const REP_LEVELS = [[0, 'Inconnu'], [50, 'Connu'], [200, 'Apprécié'], [500, 'Respecté'], [1000, 'Honoré'], [2000, 'Héros']];
const DISCOUNT = [0, 0, 0.03, 0.06, 0.1, 0.15];
export function repLevel(pts) { let l = 0; for (let i = 0; i < REP_LEVELS.length; i++) if ((pts || 0) >= REP_LEVELS[i][0]) l = i; return l; }
export const buyPrice = (value, lvl) => Math.max(1, Math.ceil(value * (1 - DISCOUNT[lvl || 0])));
export const taxOf = (place, lvl) => (PLACES[place] ? PLACES[place].tax * Math.max(0, 1 - 0.2 * (lvl || 0)) : 0);
export const sellPrice = (value, place, lvl) => Math.max(1, Math.floor(value * 0.35 * (1 - taxOf(place, lvl))));
export const discountOf = (lvl) => DISCOUNT[lvl || 0];
// le lieu d'un point du monde : sa ville, ou la ville la plus proche (à moins de 140 cases) ; un intérieur compte pour sa porte
export function placeOf(world, x, y) {
  const r = roomIdAt(world, x, y);
  if (r >= 0) { const d = world.doors.find((q) => q.room === r); if (!d) return null; x = d.ox; y = d.oy; }
  const z = zoneAt(world, x, y);
  for (const k of PLACE_ORDER) if (PLACES[k].zone === z) return k;
  let best = null, bd = 140;
  for (const k of PLACE_ORDER) {
    const c = world[PLACES[k].key]; if (!c) continue;
    const d = Math.hypot(c.x - x / TILE, c.y - y / TILE);
    if (d < bd) { bd = d; best = k; }
  }
  return best;
}
