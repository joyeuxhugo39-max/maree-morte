// 1.8 : les événements du port de Port-Lanterne. Un calendrier DÉTERMINISTE, calculé sur l'heure du monde que le
// serveur et tous les clients partagent déjà : chacun voit le même navire accoster au même moment, le même voleur
// filer par la même rue, sans un seul message réseau de plus. Seuls les gestes des joueurs (porter une caisse,
// barrer la route au voleur, acheter au colporteur) passent par le serveur, qui les valide.
// Pas systématique : un créneau sur quatre reste calme, chaque sorte d'événement a ses heures, et le même ne revient
// pas deux créneaux de suite. Pendant la Nuit des Mille Voiles (quatre jours sur sept), la fête a sa musique, sa boutique et
// sa foule : les musiciens, le colporteur et le voleur lui laissent la place ; le reste du port continue de vivre.
import { TILE, dayFrac } from './constants.js';
import { hash2 } from './rng.js';

export const PORT_PERIOD = 240; // un créneau (en secondes du monde ; une journée en dure 960)
// w : poids du tirage ; dur : durée ; when : les moments de la journée où il peut avoir lieu ; play : interactif
export const PORT_KINDS = {
  navire: { w: 3, dur: 200, when: 'jour', play: 1, name: 'Un navire marchand accoste au quai du Levant' },
  colporteur: { w: 2, dur: 150, when: 'jour soir', play: 1, name: 'Un colporteur fait le tour de la place' },
  voleur: { w: 2, dur: 46, when: 'jour soir', play: 1, name: 'Au voleur !' },
  annonce: { w: 2, dur: 96, when: 'jour soir', play: 1, name: 'Le crieur annonce une expédition' },
  rixe: { w: 2, dur: 48, when: 'soir nuit', name: 'Une bagarre devant la Sirène Borgne' },
  depart: { w: 2, dur: 110, when: 'aube jour soir nuit', name: 'Un équipage prend la mer' },
  reparation: { w: 2, dur: 140, when: 'jour', name: 'On radoube une coque au chantier' },
  musique: { w: 2, dur: 104, when: 'jour soir', name: 'Des musiciens sur la place' },
  dispute: { w: 2, dur: 40, when: 'jour', name: 'Une dispute à la halle aux poissons' },
};
const KEYS = Object.keys(PORT_KINDS);
export const phaseOfDay = (f) => (f < 0.5 ? 'jour' : f < 0.667 ? 'soir' : f < 0.917 ? 'nuit' : 'aube');

// la sorte d'événement d'un créneau (ou null s'il est calme)
const FEST_OFF = new Set(['musique', 'colporteur', 'voleur']);
// le tirage d'un créneau, connaissant l'événement du créneau d'avant (exclu : jamais deux fois de suite le même)
function pickKind(c, fest, prev) {
  if (hash2(c, 17, 901) < 0.25) return null;
  const ph = phaseOfDay(dayFrac(c * PORT_PERIOD + PORT_PERIOD / 2));
  if (ph === 'nuit' && hash2(c, 19, 905) < 0.6) return null; // la nuit, le port dort (presque)
  const list = KEYS.filter((k) => PORT_KINDS[k].when.includes(ph) && k !== prev && !(fest && FEST_OFF.has(k)));
  if (!list.length) return null;
  let tot = 0; for (const k of list) tot += PORT_KINDS[k].w;
  let r = hash2(c, 23, 902) * tot;
  for (const k of list) { r -= PORT_KINDS[k].w; if (r < 0) return k; }
  return list[list.length - 1];
}
// la suite des créneaux se calcule depuis l'origine des temps du monde, une fois (mémorisée) : le serveur et chaque client
// retrouvent exactement la même suite, quel que soit le moment où ils la demandent
const SEQ = [[], []];
export function portKindOf(c, fest = false) {
  if (c < 0) return null;
  if (c > 400000) { let k = null; for (let i = c - 64; i <= c; i++) k = pickKind(i, fest, k); return k; } // une heure du monde absurde (outils) : une suite locale, sans tout mémoriser
  const S = SEQ[fest ? 1 : 0];
  for (let i = S.length; i <= c; i++) S.push(pickKind(i, fest, i > 0 ? S[i - 1] : null));
  return S[c];
}
// l'événement en cours à l'heure wt : { k, c, t (depuis le début), dur, start, seed } — ou null
export function portEventAt(wt, fest = false) {
  const c = Math.floor(wt / PORT_PERIOD), k = portKindOf(c, fest);
  if (!k) return null;
  const d = PORT_KINDS[k], start = c * PORT_PERIOD + 10 + Math.floor(hash2(c, 29, 903) * Math.max(1, PORT_PERIOD - d.dur - 20));
  if (wt < start || wt >= start + d.dur) return null;
  return { k, c, t: wt - start, dur: d.dur, start, seed: hash2(c, 31, 904) };
}
// le prochain événement après wt (pour le capitaine du port, et pour les tests)
export function portNextEvent(wt, fest = false, horizon = 8) {
  const c0 = Math.floor(wt / PORT_PERIOD);
  for (let c = c0; c < c0 + horizon; c++) {
    const k = portKindOf(c, fest); if (!k) continue;
    const d = PORT_KINDS[k], start = c * PORT_PERIOD + 10 + Math.floor(hash2(c, 29, 903) * Math.max(1, PORT_PERIOD - d.dur - 20));
    if (start + d.dur > wt) return { k, c, start, dur: d.dur };
  }
  return null;
}

// ------------------------------------------------------------------ trajets (en pixels, d'après les repères du port)
// un point le long d'une suite de points, à vitesse constante (px/s), avec des haltes ({ at: indice, dur })
export function alongPath(pts, t, speed, stops = null) {
  let left = Math.max(0, t);
  for (let i = 0; i < pts.length - 1; i++) {
    const s = stops && stops[i]; if (s) { if (left < s) return { x: pts[i][0], y: pts[i][1], dir: 0, moving: false, i, done: false }; left -= s; }
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], L = Math.hypot(x1 - x0, y1 - y0), need = L / speed;
    if (left < need) { const f = left / need, dx = x1 - x0, dy = y1 - y0; return { x: x0 + dx * f, y: y0 + dy * f, dir: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0), moving: true, i, done: false }; }
    left -= need;
  }
  const e = pts[pts.length - 1]; return { x: e[0], y: e[1], dir: 0, moving: false, i: pts.length - 1, done: true };
}
export function pathLength(pts) { let L = 0; for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); return L; }
const px = (p) => [p[0] * TILE + 8, p[1] * TILE + 10];

// les trajets, définis en cases (le serveur et le client les lisent ici)
export const PORT_ROUTES = {
  voleur: [[147, 101], [145, 98], [138, 98], [127, 96.6], [115.5, 96.6], [114.5, 92], [114.5, 87.5], [111, 86.5]].map(px),
  colporteur: [[147.5, 95.5], [148.5, 93.6], [151.5, 93.6], [152.5, 95.5], [151.5, 97.6], [148.5, 97.6], [147.5, 95.5]].map(px),
  colpStops: [14, 0, 16, 0, 14, 0],
  depart: [[138, 92], [138, 96], [127, 97], [127, 104], [127, 108], [127.5, 113], [127, 117], [126.5, 121], [126.3, 124.6]].map(px),
  caisse: [[175, 104], [173, 104.6], [167, 104.6], [163, 105.6]].map(px), // de la pile du quai du Levant au dépôt de la Douane
};
export const PORT_SPOTS = {
  pile: px([175, 103]), depot: px([163, 106]), negociante: px([175, 108]), crieur: px([154, 99]),
  shipFrom: [216 * TILE, 103 * TILE], shipAt: [182 * TILE, 104 * TILE + 4], shipTo: [216 * TILE, 97 * TILE],
};
// la course du voleur : 6 s de larcin à l'étal, puis il file ; le guet suit à 1,4 s
export const THIEF = { start: 6, speed: 62, guardLag: 1.4 };
export function thiefAt(t) { return alongPath(PORT_ROUTES.voleur, t - THIEF.start, THIEF.speed); }
// le colporteur : un tour de place, des haltes, et il recommence
export function colporteurAt(t) {
  const L = pathLength(PORT_ROUTES.colporteur) / 16 + PORT_ROUTES.colpStops.reduce((a, b) => a + b, 0);
  return alongPath(PORT_ROUTES.colporteur, t % L, 16, PORT_ROUTES.colpStops);
}
// le navire marchand : il arrive (35 s), reste à quai, repart (30 s)
export const SHIP = { arrive: 35, leave: 30 };
export function merchantShipAt(t, dur = PORT_KINDS.navire.dur) {
  const [x0, y0] = PORT_SPOTS.shipFrom, [x1, y1] = PORT_SPOTS.shipAt, [x2, y2] = PORT_SPOTS.shipTo;
  if (t < SHIP.arrive) { const f = 1 - Math.pow(1 - t / SHIP.arrive, 2.2); return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f, dir: 1, moored: false }; }
  if (t < dur - SHIP.leave) return { x: x1, y: y1, dir: 1, moored: true };
  const f = Math.pow((t - (dur - SHIP.leave)) / SHIP.leave, 1.6); return { x: x1 + (x2 - x1) * f, y: y1 + (y2 - y1) * f, dir: 2, moored: false };
}
// où se tient un personnage d'événement à l'heure wt (null : il n'est pas là)
export function portNpcAt(id, wt, fest = false) {
  const e = portEventAt(wt, fest); if (!e) return null;
  if (id === 'crieur_pl' && e.k === 'annonce') return { x: PORT_SPOTS.crieur[0], y: PORT_SPOTS.crieur[1], dir: 0 };
  if (id === 'colporteur_pl' && e.k === 'colporteur') return colporteurAt(e.t);
  if (id === 'negociante_pl' && e.k === 'navire' && e.t >= SHIP.arrive + 4 && e.t < e.dur - SHIP.leave - 2) return { x: PORT_SPOTS.negociante[0], y: PORT_SPOTS.negociante[1], dir: 0 };
  return null;
}
// les annonces du crieur : chacune montre un vrai lieu de l'archipel
export const ANNONCES = [
  { t: 'OYEZ ! La Capitainerie paie double les avis de prime de la semaine ! Voir le tableau, sur la place !', lieu: 'Le tableau des primes', at: [141, 100] },
  { t: 'OYEZ ! Le Roi des Os s’est réveillé dans l’Antre du Crâne ! On cherche des lames, au sud-est !', lieu: 'L’Île au Crâne', zone: 9 },
  { t: 'OYEZ ! Un galion fantôme croise au large des Brumes ! Équipages aguerris seulement !', lieu: 'Les Brumes Éternelles', zone: 23 },
  { t: 'OYEZ ! Les pêcheurs de Havre-des-Brumes demandent de l’aide contre les noyés du marais !', lieu: 'Havre-des-Brumes', zone: 8 },
  { t: 'OYEZ ! Libertalia ouvre son port à tous les pavillons ! Plein sud-est, au bout du monde !', lieu: 'Libertalia', zone: 25 },
  { t: 'OYEZ ! On a vu des coffres sur la plage ouest, à marée basse ! Premiers arrivés, premiers servis !', lieu: 'La Plage des Os Blanchis', zone: 2 },
];
export function annonceOf(e) { return ANNONCES[Math.floor((e ? e.seed : 0) * ANNONCES.length) % ANNONCES.length]; }
// le prochain créneau où a lieu un événement de sorte k (outils de test et console de développement)
export function portFind(k, wt0 = 0, fest = false, max = 4000) {
  const c0 = Math.floor(wt0 / PORT_PERIOD);
  for (let c = c0; c < c0 + max; c++) if (portKindOf(c, fest) === k) { const d = PORT_KINDS[k]; return c * PORT_PERIOD + 10 + Math.floor(hash2(c, 29, 903) * Math.max(1, PORT_PERIOD - d.dur - 20)); }
  return null;
}
