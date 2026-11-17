// 1.0 : saisons et activités — la pêche a ses tailles et ses records, la Course des Cannaies ses chronos.
// Une saison dure un mois : à la fin, le podium de chaque concours reçoit sa récompense.
import { Z, zoneAt, canStand } from '../world.js';
import { TILE } from '../constants.js';

// tailles des poissons (kg) ; un spécimen exceptionnel est rare (courbe en puissance)
export const FISH_KG = { sardine: [0.05, 0.35], bar: [0.6, 4.5], dorade: [0.8, 5.2], espadon: [30, 160], poisson_lanterne: [0.2, 1.8], thon_rouge: [40, 320], coelacanthe: [20, 95], poisson_or: [0.4, 3] };
export const FISH_NAMES = { sardine: 'Sardine', bar: 'Bar', dorade: 'Dorade', espadon: 'Espadon', poisson_lanterne: 'Poisson-lanterne', thon_rouge: 'Thon rouge', coelacanthe: 'Cœlacanthe', poisson_or: 'Poisson d’or' };
export const fishKg = (id, r) => { const [a, b] = FISH_KG[id]; return Math.round((a + (b - a) * Math.pow(r, 2.2)) * 100) / 100; };
// le score du concours : pour chaque espèce, la plus belle prise rapportée à la plus grande possible
export const fishScore = (rec) => Math.round(Object.entries(rec || {}).reduce((s, [id, kg]) => s + (FISH_KG[id] ? kg / FISH_KG[id][1] : 0), 0) * 100);
export const seasonKey = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
export const SEASON_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const seasonName = (k) => { const [y, m] = k.split('-'); return `${SEASON_NAMES[(+m - 1) % 12]} ${y}`; };

// le Grand Tour de Libertalia : six portes autour de la grande île, à franchir dans l'ordre, en selle,
// puis retour à la première. Chaque porte est posée sur la terre ferme la plus proche de son repère.
const RACE_ANCHORS = [['Les Cannaies', 800, 98], ['Baie des Naufrageurs', 886, 112], ['Jungle Écarlate', 892, 272], ['Les Bas-Fonds', 842, 290], ['Mangrove des Contrebandiers', 708, 336], ['Fort des Hauts', 726, 140]];
export function raceCourse(world) {
  if (world._race) return world._race;
  const pts = [];
  for (const [name, ax, ay] of RACE_ANCHORS) {
    let best = null;
    for (let r = 0; r < 40 && !best; r++) for (let k = 0; k < 24 && !best; k++) {
      const a = k / 24 * Math.PI * 2, x = (ax + Math.cos(a) * r) * TILE + 8, y = (ay + Math.sin(a) * r) * TILE + 8;
      if (zoneAt(world, x, y) !== Z.LIBERTALIA && canStand(world, x, y) && canStand(world, x + 12, y) && canStand(world, x - 12, y) && canStand(world, x, y + 10)) best = { x, y, name };
    }
    if (best) pts.push(best);
  }
  return (world._race = pts);
}
