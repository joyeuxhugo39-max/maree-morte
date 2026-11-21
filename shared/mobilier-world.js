// Monde vivant, lot 4 : le mobilier des métiers et les traces de vie des quais. Ajouté en tout dernier (après le
// festival) : aucun identifiant de l'ancien monde ne bouge. Chaque meuble se pose le long d'un mur, sur une case libre,
// loin de la porte ; dehors, on ne pose que des objets au sol, sur lesquels on passe (rien ne bloque).
// Le garde-fou t_monde90 vérifie qu'aucune porte, aucun personnage, aucun coffre n'est muré.
import { T, TILE } from './constants.js';
import { hash2 } from './rng.js';
import { BERTHS } from './data/ships.js';

// par sorte de pièce : [type, dx, dy, variante] — dx, dy depuis le coin haut-gauche ; une valeur négative compte depuis
// la droite ou le bas (-1 = la dernière colonne, la dernière rangée)
const ROOMS = {
  forge: [['meule', -2, 0], ['planches', -1, 1], ['seau', 2, 3], ['tabouret', 4, 3]],
  armurerie: [['mannequin', 0, 1, 1], ['mannequin', 0, 3, 2], ['meule', -1, 2], ['tabouret', 5, 3]],
  ecurie: [['foin', -1, 1, 0], ['foin', -1, 2, 1], ['foin', 0, 2, 1], ['seau', 2, 1], ['sacs', -1, 4, 0]],
  chantier: [['planches', -1, 1], ['planches', -1, 2], ['anchor', 0, 2], ['cordage', 2, -1, 0], ['seau', 4, -1]],
  apothicaire: [['alambic', 5, 0], ['tabouret', 3, 3], ['sacs', -1, 2, 1]],
  capitainerie: [['banniere', 2, 0, 0], ['banniere', -3, 0, 1], ['anchor', 0, -1], ['cordage', -2, -1, 1]],
  couture: [['tabouret', 2, 3], ['sacs', -1, 3, 1]],
  cellier: [['sacs', 0, 1, 0], ['sacs', -1, -1, 1], ['planches', -1, 1]],
  entrepot: [['sacs', 1, -1, 0], ['cordage', 3, -1, 1]],
  receleur: [['sacs', 0, -1, 1]],
};
// les villes dont les quais gardent des traces de vie : cordages, filets à sécher, casiers
const QUAYS = new Set([1, 8, 14, 18, 25]); // Port-Lanterne, Havre-des-Brumes, Rade-aux-Flibustiers, Anse-Tranquille, Libertalia

export function buildMobilier(C) {
  const { W, H, OVER_H, tiles, zones, solid, occ, idx, inMap, rooms, doors, props, addProp, npcs, roomGrid, festBox } = C;
  const placed = [];
  const npcAt = new Set(npcs.map((n) => idx(Math.floor(n.x / TILE), Math.floor(n.y / TILE))));
  // 1. les ateliers
  for (const r of rooms) {
    const list = ROOMS[r.kind]; if (!list) continue;
    const exits = doors.filter((d) => d.room === r.id).map((d) => [Math.floor(d.ix / TILE), Math.floor(d.iy / TILE)]);
    for (const [type, dx, dy, v = 0] of list) {
      const x = dx < 0 ? r.x0 + r.w + dx : r.x0 + dx, y = dy < 0 ? r.y0 + r.h + dy : r.y0 + dy;
      if (x < r.x0 || y < r.y0 || x >= r.x0 + r.w || y >= r.y0 + r.h) continue;
      const i = idx(x, y);
      if (occ[i] || solid[i] || npcAt.has(i) || roomGrid[i] !== r.id) continue;
      if (exits.some(([ex, ey]) => Math.abs(ex - x) <= 2 && Math.abs(ey - y) <= 2)) continue; // jamais devant la porte
      placed.push(addProp(type, x, y, v, 0, -2, { mob: 1 }));
    }
  }
  // 2. les quais : au bord de l'eau, rarement, jamais sur un passage étroit
  const WATERY = (t) => t === T.WATER || t === T.DEEP;
  const taken = new Set(props.map((p) => idx(p.tx, p.ty))); // une case qui porte déjà un décor
  const nearBerth = (x, y) => BERTHS.some((b) => Math.abs(b.tx - x) <= 3 && Math.abs(b.ty - y) <= 3); // le quai d'armement reste dégagé
  for (let y = 2; y < OVER_H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const i = idx(x, y);
    // (les quais sont « réservés » par le générateur contre les décors qui bloquent ; ceux-ci se posent au sol et ne bloquent rien)
    if (tiles[i] !== T.PLANK || !QUAYS.has(zones[i]) || roomGrid[i] >= 0 || taken.has(i) || solid[i] || npcAt.has(i) || nearBerth(x, y)) continue;
    const h = hash2(x, y, 4401); if (h > 0.16) continue;
    const nearWater = WATERY(tiles[idx(x, y + 1)]) || WATERY(tiles[idx(x, y - 1)]) || WATERY(tiles[idx(x + 1, y)]) || WATERY(tiles[idx(x - 1, y)]);
    if (!nearWater) continue;
    let planks = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) if (tiles[idx(x + dx, y + dy)] === T.PLANK) planks++;
    if (planks < 4) continue; // une jetée d'une case de large reste dégagée
    if (doors.some((d) => Math.abs(Math.floor(d.ox / TILE) - x) <= 1 && Math.abs(Math.floor(d.oy / TILE) - y) <= 1)) continue;
    const type = h < 0.06 ? 'cordage' : h < 0.11 ? 'filet_sol' : 'casier';
    const p = addProp(type, x, y, Math.floor(h * 1000) % 2, 0, -2, { mob: 1 }); placed.push(p); taken.add(i);
  }
  return { count: placed.length };
}
