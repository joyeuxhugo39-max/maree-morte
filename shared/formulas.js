import { ITEMS } from './data/items.js';
import { PLAYER_SPEED, SLOTS } from './constants.js';

export const MAX_LEVEL = 30;
export function xpToNext(level) { return Math.round(50 * Math.pow(level, 1.6) + 30); }

export function computeStats(level, eq, upg = {}) {
  let maxHp = 90 + (level - 1) * 18, maxEn = 60 + (level - 1) * 4;
  let atk = 0, gun = 0, def = 0, spd = 0, crit = 0.05, regen = 0.4 + level * 0.05;
  let atkSpeed = 0.55, gunCd = 1;
  for (const s of SLOTS) {
    const it = eq && eq[s] ? ITEMS[eq[s]] : null;
    if (!it) continue;
    atk += it.atk || 0; gun += it.gun || 0; def += it.def || 0; spd += it.spd || 0;
    crit += it.crit || 0; maxHp += it.hp || 0; regen += it.regen || 0;
    if (s === 'weapon') atkSpeed = it.speed || 0.5;
    if (s === 'gun') gunCd = it.cdMul || 1;
  }
  const mul = 1 + 0.07 * (level - 1);
  const uw = upg.weapon || 0, ug = upg.gun || 0, ub = upg.body || 0;
  maxHp += ub * 5;
  return {
    maxHp, maxEn,
    atk: Math.round((atk || 3) * mul * (1 + 0.1 * uw)),
    gun: Math.round(gun * mul * (1 + 0.1 * ug)),
    def: Math.round(def * (1 + 0.12 * ub)) + ub, crit: Math.min(0.6, crit), regen,
    speed: Math.round(PLAYER_SPEED * (1 + spd)),
    atkSpeed, gunCd,
  };
}
// dégâts reçus après armure
export function mitigate(raw, def) { return Math.max(1, Math.round(raw * 30 / (30 + def * 2))); }

// apparence affichée = apparence de base + équipement visible
export function displayLook(base, eq) {
  const L = Object.assign({}, base);
  const hat = eq && eq.hat && ITEMS[eq.hat];
  const body = eq && eq.body && ITEMS[eq.body];
  const boots = eq && eq.boots && ITEMS[eq.boots];
  L.hat = hat ? hat.look : null;
  if (hat && hat.lookCol) L.hatCol = hat.lookCol;
  if (body) { L.top = body.look; if (body.lookCol) L.topCol = body.lookCol; }
  if (boots && boots.lookCol) L.boots = boots.lookCol;
  const o = eq && eq.outfit && ITEMS[eq.outfit] && ITEMS[eq.outfit].outfit; // une tenue recouvre le reste
  if (o) { for (const k of ['top', 'topCol', 'pants', 'boots', 'hatCol', 'cape']) if (o[k]) L[k] = o[k]; if (o.hat !== undefined) L.hat = o.hat; }
  return L;
}
export function sanitizeLook(l) {
  const n = (v, max, d) => (Number.isInteger(v) && v >= 0 && v <= max ? v : d);
  const styles = ['court', 'long', 'queue', 'chauve', 'hirsute'];
  const cols = ['red', 'navy', 'green', 'brown', 'purple', 'yellow', 'teal', 'black', 'orange', 'white'];
  l = l || {};
  return {
    skin: n(l.skin, 3, 0), hair: n(l.hair, 5, 1),
    hairStyle: styles.includes(l.hairStyle) ? l.hairStyle : 'court',
    beard: l.beard ? 1 : 0,
    topCol: cols.includes(l.topCol) ? l.topCol : 'red',
    pants: ['brown', 'navy', 'black', 'grey'].includes(l.pants) ? l.pants : 'brown',
    top: 'chemise',
  };
}

// Renforcements à la forge d'Isa (sur l'emplacement, ils suivent l'objet équipé)
export const UPG_SLOTS = ['weapon', 'gun', 'body'];
export const UPG_MAX = 5;
export function upgradeCost(slot, L) {
  const n = L + 1;
  const mats = {
    weapon: [['os_maudit', 3 * n], ['dent_zombie', 2 * n]],
    gun: [['poudre_noire', 2 * n], ['os_maudit', 2 * n]],
    body: [['pince_crabe', 4 * n], ['algue_noire', n]],
  }[slot].map((m) => m.slice());
  if (n >= 4) mats.push(['perle_ombre', n - 3]);
  return { gold: 40 * n * n, mats };
}
export const UPG_TEXT = { weapon: '+10 % d’attaque', gun: '+10 % de tir', body: '+12 % de défense, +5 PV' };
