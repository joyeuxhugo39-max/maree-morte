import { hash2 } from './rng.js';

export const TILE = 16;
// 1.0 : versions — le client et le serveur doivent parler le même protocole ; les sauvegardes portent leur version
export const GAME_VERSION = '1.7.0';
export const PROTOCOL = 15;
export const SAVE_VERSION = 10;
// 1.0 : la brume de la carte — ce que chaque pirate a vu, par carrés de 8 cases
export const SEEN_CELL = 8;
export const MAP_W = 960; // 0.8 : l'île de Libertalia s'ajoute à l'est
export const MAP_H = 560;
export const OVER_H = 448; // hauteur de l'archipel ; en dessous : intérieurs et grottes
export const TICK_RATE = 20;
export const PLAYER_SPEED = 76; // pixels / seconde
export const ROLL_SPEED = 210;
export const ROLL_TIME = 0.22;
export const DAY_LENGTH = 16 * 60; // un cycle jour/nuit complet, en secondes
export const INV_SIZE = 24;
export const AOI_X = 440; // demi-largeur de la zone d'intérêt réseau (px)
export const AOI_Y = 300;
export const INTERACT_RANGE = 34;
export const PICKUP_RANGE = 18;

// Types de terrain
export const T = {
  DEEP: 0, WATER: 1, SAND: 2, GRASS: 3, JUNGLE: 4, DIRT: 5, COBBLE: 6,
  PLANK: 7, SWAMP: 8, MARSH: 9, ROCK: 10, MUD: 11,
  VOID: 12, FLOOR: 13, STONEF: 14, CAVE: 15, CWALL: 16, IWALL: 17, EXIT: 18,
  ASH: 19, LAVA: 20, DGRASS: 21,
};

export const SPEED_MUL = { [T.WATER]: 0.62, [T.SWAMP]: 0.55, [T.MUD]: 0.86, [T.ASH]: 0.94 };

export const SLOTS = ['weapon', 'gun', 'hat', 'body', 'boots', 'trinket', 'outfit', 'mount'];
export const SLOT_NAMES = {
  weapon: 'Arme', gun: 'Pistolet', hat: 'Chapeau', body: 'Torse', boots: 'Bottes', trinket: 'Talisman', outfit: 'Tenue', mount: 'Monture',
};
export const RARITY = [
  { name: 'Commun', color: '#efe6d2' },
  { name: 'Rare', color: '#62b8ff' },
  { name: 'Épique', color: '#c98bff' },
  { name: 'Légendaire', color: '#ffae42' },
];

// f : position dans le cycle (0..1). 0 = aube terminée, 0.55 crépuscule, 0.65..0.9 nuit
export function dayFrac(worldTime) {
  return ((worldTime % DAY_LENGTH) + DAY_LENGTH) % DAY_LENGTH / DAY_LENGTH;
}
export function darkness(f) {
  if (f < 0.55) return 0;
  if (f < 0.65) return (f - 0.55) / 0.1;
  if (f < 0.9) return 1;
  return 1 - (f - 0.9) / 0.1;
}
export function isNight(f) { return f > 0.62 && f < 0.92; }
// la lune : pleine une nuit sur trois (le jour du cycle qui suit compte comme la même lune)
export function moonPhase(wt) { return ((Math.floor(wt / DAY_LENGTH) % 3) + 3) % 3; }
export function isFullMoon(wt) { return moonPhase(wt) === 2; }
export function clockString(f) {
  // 0 => 7h00, cycle de 24h
  const h = (7 + f * 24) % 24;
  const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
  return `${String(hh).padStart(2, '0')}h${String(mm).padStart(2, '0')}`;
}

// Météo identique pour tous : dépend uniquement de l'heure du monde.
export const WEATHER_PERIOD = 210;
// lot 2 : météo imposée par les outils développeur (serveur Node seulement) : { kind, until } en heure du monde
export const WX = { force: null };
export function weatherAt(wt) {
  const F = WX.force;
  if (F && wt < F.until) return { kind: F.kind, rain: F.kind === 0 ? 0 : F.kind === 1 ? 0.6 : 1, storm: F.kind === 2 ? 1 : 0 };
  const k = Math.floor(wt / WEATHER_PERIOD), f = (wt - k * WEATHER_PERIOD) / WEATHER_PERIOD;
  const h = hash2(k, 7, 99);
  const kind = k < 1 ? 0 : h < 0.58 ? 0 : h < 0.86 ? 1 : 2;
  const ramp = Math.max(0, Math.min(1, f / 0.12, (1 - f) / 0.12));
  return { kind, rain: kind === 0 ? 0 : (kind === 1 ? 0.6 : 1) * ramp, storm: kind === 2 ? ramp : 0 };
}
export const WEATHER_NAMES = ['Temps clair', 'Pluie', 'Orage'];
