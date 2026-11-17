import { ITEMS } from './data/items.js';
import { PLAYER_SPEED, SLOTS } from './constants.js';

export const MAX_LEVEL = 30;
// 1.0 : passé le niveau 30, l'expérience nourrit la Gloire — cinquante crans, chacun +1 % de PV et +0,5 % de dégâts
export const GLORY_XP = 12000, GLORY_MAX = 50;
// 1.0 : niveau requis pour s'équiper — défini dans items.js (l'équilibrage des armes s'en sert)
export { reqLevel, ROLES } from './data/items.js';
export function xpToNext(level) { return Math.round(50 * Math.pow(level, 1.6) + 30); }

// riding : la monture équipée n'apporte ses bonus qu'en selle ; buffs : potions en cours { spd, atk, def }
export function computeStats(level, eq, upg = {}, riding = false, buffs = null, glory = 0) {
  let maxHp = 90 + (level - 1) * 18, maxEn = 60 + (level - 1) * 4;
  let atk = 0, gun = 0, def = 0, spd = 0, crit = 0.05, regen = 0.4 + level * 0.05, leech = 0, goldFind = 0, curseOnHit = 0;
  let atkSpeed = 0.55, gunCd = 1, mountSpeed = 1;
  for (const s of SLOTS) {
    const it = eq && eq[s] ? ITEMS[eq[s]] : null;
    if (!it) continue;
    if (s === 'mount') { if (riding && it.mount) { def += it.mount.def || 0; regen += it.mount.regen || 0; mountSpeed = it.mount.speed || 1; } continue; }
    leech += it.leech && s !== 'weapon' ? it.leech : 0; goldFind += it.goldFind || 0; curseOnHit += it.curseOnHit || 0;
    atk += it.atk || 0; gun += it.gun || 0; def += it.def || 0; spd += it.spd || 0;
    crit += it.crit || 0; maxHp += it.hp || 0; regen += it.regen || 0;
    if (s === 'weapon') atkSpeed = it.speed || 0.5;
    if (s === 'gun') gunCd = it.cdMul || 1;
  }
  const mul = 1 + 0.07 * (level - 1);
  const uw = upg.weapon || 0, ug = upg.gun || 0, ub = upg.body || 0;
  maxHp += ub * 5;
  const B = buffs || {}, gl = Math.max(0, Math.min(GLORY_MAX, glory | 0));
  maxHp = Math.round(maxHp * (1 + 0.01 * gl));
  return {
    maxHp, maxEn,
    atk: Math.round((atk || 3) * mul * (1 + 0.1 * uw) * (1 + (B.atk || 0)) * (1 + 0.005 * gl)),
    gun: Math.round(gun * mul * (1 + 0.1 * ug) * (1 + (B.atk || 0)) * (1 + 0.005 * gl)),
    def: Math.round((Math.round(def * (1 + 0.12 * ub)) + ub) * (1 + (B.def || 0))), crit: Math.min(0.6, crit), regen,
    speed: Math.round(PLAYER_SPEED * (1 + spd + (B.spd || 0)) * mountSpeed),
    atkSpeed, gunCd, leech, goldFind, curseOnHit, mountSpeed,
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

// Renforcements à la forge d'Isa (sur l'emplacement, ils suivent l'objet équipé). 0.8 : seulement de l'or.
export const UPG_SLOTS = ['weapon', 'gun', 'body'];
export const UPG_MAX = 5;
export function upgradeCost(slot, L) {
  const n = L + 1;
  return { gold: 70 * n * n + (n >= 4 ? 400 * (n - 3) : 0), mats: [] };
}
export const UPG_TEXT = { weapon: '+10 % d’attaque', gun: '+10 % de tir', body: '+12 % de défense, +5 PV' };
