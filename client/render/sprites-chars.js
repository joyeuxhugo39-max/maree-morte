// Personnages : pirate modulaire (peau, cheveux, chapeau, vêtements) en 4 directions
// x 4 images, morts-vivants, squelettes, crabes, boss (Scale2x), perroquet, armes.
import { PB, mix, shade, rnd } from './pixel.js';

export const FW = 20, FH = 28, AX = 10, AY = 26;

export const SKINS = [
  [0xa8664e, 0xd38f72, 0xf0bd9a, 0xffdcc2],
  [0x8f5236, 0xb8744c, 0xd99a68, 0xf0bc8a],
  [0x633620, 0x8a5232, 0xab6e44, 0xc88c5c],
  [0x38200f, 0x56321e, 0x744a2c, 0x91623e],
];
export const UNDEAD_SKINS = {
  zombie: [0x3f5233, 0x5a7446, 0x7b9a5c, 0x9fbe7a],
  drowned: [0x2f5050, 0x447070, 0x60948e, 0x86bcb0],
  ghoul: [0x3e3450, 0x564a6e, 0x726690, 0x948ab0],
  ash: [0x3a3438, 0x56505a, 0x787078, 0x9a929a],
  peste: [0x4e5226, 0x6e7234, 0x8e9448, 0xb0b664],
  damne: [0x24263a, 0x383c54, 0x525874, 0x707894],
  tanne: [0x5a3a1e, 0x7a5430, 0x9a7044, 0xba8c5a],
};
export const HAIRS = [
  [0x1e140e, 0x34221a, 0x523828],
  [0x4e2a12, 0x74421e, 0x9c642e],
  [0x7a3010, 0xae4c20, 0xd8743a],
  [0x9a7632, 0xc9a24c, 0xeccd78],
  [0x6a6a74, 0xa2a2ae, 0xdcdce4],
  [0x1a2648, 0x2a4074, 0x4864a6],
  [0x1a3a26, 0x2a5a34, 0x3e7a46],
];
export const CLOTH = {
  red: [0x521216, 0x821f26, 0xb03232, 0xd44e46],
  navy: [0x121a34, 0x1c284e, 0x2a3c70, 0x405696],
  green: [0x16341f, 0x224e30, 0x326c44, 0x48895a],
  brown: [0x352112, 0x55351e, 0x754b2a, 0x966438],
  white: [0x86806f, 0xb4ad9c, 0xd9d2c2, 0xf5f1e6],
  purple: [0x2a183a, 0x422656, 0x5e387a, 0x7a509a],
  yellow: [0x745412, 0xa2781c, 0xcf9e2c, 0xebc24c],
  black: [0x100e12, 0x1c1820, 0x2a2430, 0x3c3444],
  teal: [0x0c3636, 0x144e4e, 0x1e6a66, 0x328c86],
  grey: [0x2e2e34, 0x46464e, 0x62626c, 0x82828c],
  orange: [0x6a2c0c, 0x9a4414, 0xc8621e, 0xe8883a],
};
export const CLOTH_KEYS = ['red', 'navy', 'green', 'brown', 'purple', 'yellow', 'teal', 'black', 'orange', 'white'];
const GOLDC = [0x8a5a14, 0xc8901e, 0xf0c040, 0xfff0a0];
const BELT = 0x2e1c10;
const EYE = 0x1c1424;
const clampi = (v, a, b) => Math.max(a, Math.min(b, v));

function skinOf(look) { return typeof look.skin === 'string' ? UNDEAD_SKINS[look.skin] : SKINS[look.skin || 0]; }
function clothOf(k) { return CLOTH[k] || CLOTH.brown; }

const HEAD_ROWS = [[6, 13], [5, 14], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15], [4, 15], [5, 14], [6, 13]];

// Dessine un personnage orienté vers le bas (dir 0), la droite (2) ou le haut (3).
function paintRight(look, dir, frame) {
  const side = dir === 2, back = dir === 3;
  const SK = skinOf(look), HR = HAIRS[look.hair ?? 1], TOP = clothOf(look.topCol), PANTS = clothOf(look.pants || 'brown'), BOOTS = clothOf(look.boots || 'black');
  const und = !!look.undead, hunch = (look.hunch || 0) + (und ? 1 : 0);
  const bob = (frame === 1 || frame === 3) ? -1 : 0;
  const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const style = look.top || 'chemise';
  const coat = style === 'manteau' || style === 'capitaine' || style === 'vareuse';
  const body = new PB(FW, FH), arms = new PB(FW, FH), head = new PB(FW, FH);
  const tT = 14 + bob + hunch;
  const legTop = 20 + bob;
  const meta = { eyes: [], hand: [0, 0] };

  // ---- jambes ----
  if (!side) {
    const liftL = step === -1 ? (und ? 1 : 2) : 0, liftR = step === 1 ? (und ? 1 : 2) : 0;
    for (const [x0, lift, inner] of [[6, liftL, 9], [10, liftR, 10]]) {
      const bootTop = 23 - lift;
      for (let y = legTop; y < bootTop; y++) for (let x = x0; x < x0 + 4; x++) body.set(x, y, PANTS[x === inner ? 1 : x === x0 ? 3 : 2]);
      for (let y = bootTop; y < bootTop + 3; y++) for (let x = x0; x < x0 + 4; x++) body.set(x, y, BOOTS[y === bootTop ? 3 : (x === inner ? 1 : 2)]);
    }
  } else {
    if (step === 0) {
      for (let y = legTop; y < 23; y++) for (let x = 8; x < 12; x++) body.set(x, y, PANTS[x === 11 ? 1 : 2]);
      for (let y = 23; y < 26; y++) for (let x = 8; x < 13; x++) body.set(x, y, BOOTS[y === 23 ? 3 : x === 12 ? 1 : 2]);
    } else {
      const back = step === 1 ? 1 : 2, front = step === 1 ? 2 : 1;
      for (let y = legTop; y < 23; y++) for (let x = 6; x < 9; x++) body.set(x, y, PANTS[back - 1 >= 0 ? back - 1 : 0]);
      for (let y = 23; y < 26; y++) for (let x = 5; x < 9; x++) body.set(x, y, BOOTS[y === 23 ? 2 : back - 1]);
      for (let y = legTop; y < 23; y++) for (let x = 10; x < 13; x++) body.set(x, y, PANTS[front]);
      for (let y = 23; y < 26; y++) for (let x = 10; x < 14; x++) body.set(x, y, BOOTS[y === 23 ? 3 : front]);
    }
  }
  if (style === 'squelette') { /* jambes d'os gérées ailleurs */ }

  // ---- cape (dessinée avant le torse : elle passe derrière) ----
  if (look.cape) {
    const CP = clothOf(look.cape);
    if (back) for (let y = tT - 1; y < 25; y++) for (let x = 5; x < 15; x++) { const flare = y > 20 ? 1 : 0; if (x < 5 - flare || x > 14 + flare) continue; body.set(x, y, CP[(x === 5 || x === 14) ? 1 : (x + (y >> 2)) % 4 === 0 ? 1 : 2]); }
    else if (side) for (let y = tT; y < 25; y++) { const w = 2 + (y > 19 ? 1 : 0); for (let k = 0; k < w; k++) body.set(6 - k, y, CP[k === w - 1 ? 0 : 2]); body.set(7, y, CP[1]); }
    else for (let y = tT; y < 24; y++) { body.set(4, y, CP[1]); body.set(15, y, CP[0]); if (y > 19) { body.set(3, y, CP[0]); body.set(16, y, CP[0]); } }
  }
  // ---- torse ----
  const tx0 = side ? 7 : 6, tw = side ? 6 : 8;
  const shirt = style === 'gilet' ? CLOTH.white : TOP;
  for (let y = tT; y < tT + 6; y++) for (let x = tx0; x < tx0 + tw; x++) {
    const u = (x - tx0) / (tw - 1);
    let k = u < 0.25 ? 3 : u > 0.75 ? 1 : 2;
    if (y === tT + 5) k = Math.min(k, 1);
    let c = shirt[k];
    if (style === 'rayee') c = ((y - tT) % 2 === 0) ? CLOTH.white[Math.min(3, k + 0)] : CLOTH.navy[k];
    if (style === 'gilet' && !back) {
      const vest = side ? (x <= tx0 + 2) : (x <= tx0 + 2 || x >= tx0 + tw - 3);
      if (vest) c = TOP[k];
    }
    if (style === 'gilet' && back) c = TOP[k];
    body.set(x, y, c);
  }
  if (style === 'haillons') {
    for (let k = 0; k < 4; k++) { const x = tx0 + Math.floor(rnd(k, dir, 7 + (look.seed || 0)) * tw), y = tT + 1 + Math.floor(rnd(k, dir, 9) * 4); body.set(x, y, SK[1]); }
    for (let x = tx0; x < tx0 + tw; x++) if (rnd(x, 3, 5) > 0.55) body.set(x, tT + 5, SK[1]);
  }
  if (coat) {
    const trim = style === 'capitaine' ? GOLDC[2] : null;
    if (!back && !side) {
      body.vl(9, tT, 5, TOP[3]); body.vl(10, tT, 5, TOP[3]);
      body.vl(8, tT, 4, shade(TOP[3], 1.12)); body.vl(11, tT, 4, TOP[1]);
      body.set(9, tT, shirtCol()); body.set(10, tT, shirtCol()); body.set(9, tT + 1, shirtCol()); body.set(10, tT + 1, shirtCol());
      for (const by of [tT + 2, tT + 4]) { body.set(8, by, GOLDC[2]); body.set(11, by, GOLDC[2]); }
      if (trim) { body.vl(6, tT, 6, trim); body.vl(13, tT, 6, GOLDC[1]); }
      for (let y = tT + 6; y < tT + 9; y++) { body.set(5, y, TOP[2]); body.set(6, y, TOP[3]); body.set(13, y, TOP[1]); body.set(14, y, TOP[1]); }
    } else if (side) {
      for (let y = tT + 6; y < tT + 9; y++) { body.set(6, y, TOP[2]); body.set(7, y, TOP[2]); body.set(5, y + 1 > tT + 8 ? y : y, TOP[1]); }
      body.set(12, tT + 2, GOLDC[2]); body.set(12, tT + 4, GOLDC[2]);
      if (trim) body.vl(12, tT, 6, trim);
    } else {
      for (let y = tT + 6; y < tT + 9; y++) for (let x = 6; x < 14; x++) body.set(x, y, TOP[x < 10 ? 2 : 1]);
      body.vl(9, tT + 6, 3, TOP[0]);
    }
  }
  function shirtCol() { return CLOTH.white[2]; }
  if (style === 'armure') { // plastron bombé, arête centrale, rivets
    for (let y = tT; y < tT + 6; y++) for (let x = tx0; x < tx0 + tw; x++) {
      const u = (x - tx0) / (tw - 1);
      body.set(x, y, TOP[u < 0.2 ? 3 : u > 0.8 ? 0 : u < 0.45 ? 3 : 2]);
    }
    if (!side && !back) { body.vl(9, tT, 5, mix(TOP[3], 0xffffff, 0.35)); body.vl(10, tT, 5, TOP[1]); for (const [x, y] of [[7, tT + 1], [12, tT + 1], [7, tT + 4], [12, tT + 4]]) body.set(x, y, GOLDC[2]); }
    else if (side) { body.vl(tx0 + 4, tT, 5, mix(TOP[3], 0xffffff, 0.35)); body.set(tx0 + 2, tT + 2, GOLDC[2]); }
    else for (let x = tx0 + 1; x < tx0 + tw - 1; x++) body.set(x, tT + 2, TOP[1]);
    for (let y = tT + 6; y < tT + 8; y++) for (let x = tx0; x < tx0 + tw; x++) if ((x - tx0) % 2 === 0) body.set(x, y, TOP[1]); // tassettes
  }
  if (style === 'tablier') {
    for (let y = tT + 1; y < tT + 9; y++) for (let x = tx0 + 1; x < tx0 + tw - 1; x++) if (!back) body.set(x, y, x === tx0 + 1 ? 0xf0e8d8 : 0xd8ccb4);
  }
  // ceinture
  if (style !== 'tablier' || back) {
    for (let x = tx0; x < tx0 + tw; x++) body.set(x, tT + 5, BELT);
    if (!back) { if (!side) { body.set(9, tT + 5, GOLDC[2]); body.set(10, tT + 5, GOLDC[3]); } else body.set(tx0 + tw - 2, tT + 5, GOLDC[2]); }
  }
  if (style === 'capitaine') {
    if (!side) { body.set(5, tT, GOLDC[2]); body.set(14, tT, GOLDC[2]); }
  }
  body.outline('auto');

  // ---- bras ----
  const SL = style === 'gilet' ? CLOTH.white : style === 'rayee' ? CLOTH.white : TOP;
  const bare = style === 'haillons' && (look.seed || 0) % 2 === 0;
  const sl = (k) => bare ? SK[k] : SL[k];
  if (!side) {
    if (und && !back) {
      arms.rect(4, tT, 2, 2, sl(3)); arms.rect(5, tT + 2, 2, 2, sl(2)); arms.rect(6, tT + 3, 2, 2, SK[2]);
      arms.rect(14, tT, 2, 2, sl(1)); arms.rect(13, tT + 2, 2, 2, sl(1)); arms.rect(12, tT + 3, 2, 2, SK[1]);
      if (look.claws) { arms.set(6, tT + 5, 0xe8e0d0); arms.set(13, tT + 5, 0xe8e0d0); }
      meta.hand = [13, tT + 4];
    } else {
      const sL = und ? 0 : Math.max(0, step) - Math.max(0, -step), sR = -sL;
      arms.rect(4, tT + Math.max(0, sL), 2, 4, sl(3)); arms.rect(4, tT + 4 + sL, 2, 2, SK[2]);
      arms.rect(14, tT + Math.max(0, sR), 2, 4, sl(1)); arms.rect(14, tT + 4 + sR, 2, 2, SK[1]);
      if (coat) { arms.hl(4, tT + 3 + Math.max(0, sL), 2, TOP[0]); arms.hl(14, tT + 3 + Math.max(0, sR), 2, TOP[0]); }
      meta.hand = back ? [5, tT + 5 + sL] : [14.5, tT + 5 + sR];
    }
  } else {
    if (und) { arms.rect(10, tT + 1, 4, 2, sl(2)); arms.hl(10, tT + 1, 4, sl(3)); arms.rect(14, tT + 1, 2, 2, SK[2]); if (look.claws) arms.set(16, tT + 2, 0xe8e0d0); meta.hand = [15, tT + 2]; }
    else if (step === 0) { arms.rect(9, tT, 2, 4, sl(2)); arms.rect(9, tT + 4, 2, 2, SK[2]); meta.hand = [10, tT + 5]; }
    else if (step === 1) { arms.rect(10, tT, 2, 3, sl(2)); arms.rect(11, tT + 3, 2, 2, SK[2]); meta.hand = [12, tT + 4]; }
    else { arms.rect(8, tT, 2, 3, sl(2)); arms.rect(7, tT + 3, 2, 2, SK[2]); meta.hand = [8, tT + 4]; }
  }
  arms.outline('auto');

  // ---- tête ----
  const hy = 3 + bob + hunch, hx = side && und ? 1 : 0;
  for (let j = 0; j < 11; j++) {
    const [a, b] = HEAD_ROWS[j];
    for (let x = a; x <= b; x++) {
      let k = 2;
      if (x >= 13 || j >= 9) k = 1;
      if (x <= 6 && j <= 4) k = 3;
      head.set(x + hx, hy + j, SK[k]);
    }
  }
  if (side) head.set(16 + hx, hy + 7, SK[2]);
  if (!back) {
    const ec = look.eyeCol != null ? look.eyeCol : EYE;
    if (side) { head.set(13 + hx, hy + 6, ec); head.set(13 + hx, hy + 7, ec); meta.eyes.push([13 + hx, hy + 6]); }
    else { for (const ex of [7, 12]) { head.set(ex, hy + 6, ec); head.set(ex, hy + 7, ec); meta.eyes.push([ex, hy + 6]); } }
    if (look.eyeCol == null) {
      const bl = mix(SK[2], 0xff6060, 0.35);
      if (side) head.set(12 + hx, hy + 8, bl); else { head.set(6, hy + 8, bl); head.set(13, hy + 8, bl); }
    }
    if (und) {
      if (side) { head.set(14 + hx, hy + 9, 0x2a1418); head.set(15 + hx, hy + 9, 0x2a1418); }
      else { head.set(9, hy + 9, 0x2a1418); head.set(10, hy + 9, 0x2a1418); head.set(9, hy + 9, 0xe8e0c8); }
      for (let k = 0; k < 3; k++) { const x = 5 + Math.floor(rnd(k, look.seed || 1, 3) * 9), y = hy + 2 + Math.floor(rnd(k, 2, look.seed || 1) * 7); if (head.get(x, y) === SK[2] || head.get(x, y) === SK[1]) head.set(x, y, SK[0]); }
    } else if (!look.beard) {
      if (side) head.set(14 + hx, hy + 9, SK[1]); else { head.set(9, hy + 9, SK[1]); head.set(10, hy + 9, SK[1]); }
    }
  }
  // cheveux
  const hs = look.hairStyle || 'court';
  const hair = (x, y, k) => head.set(x + hx, hy + y, HR[clampi(k, 0, 2)]);
  if (hs !== 'chauve') {
    if (back) {
      for (let j = 0; j < 11; j++) { const [a, b] = HEAD_ROWS[j]; for (let x = a; x <= b; x++) hair(x, j, (x <= 6 ? 2 : x >= 13 ? 0 : 1) - ((x + j) % 4 === 0 ? 1 : 0)); }
    } else {
      for (let j = 0; j < 4; j++) { const [a, b] = HEAD_ROWS[j]; for (let x = a; x <= b; x++) hair(x, j, (x <= 7 && j <= 1) ? 2 : (x >= 13 ? 0 : 1)); }
      if (!side) {
        for (const x of [4, 5, 6, 9, 13, 14, 15]) hair(x, 4, x === 9 ? 1 : 1);
        for (const x of [4, 5, 14, 15]) hair(x, 5, 0);
        for (const x of [4, 15]) { hair(x, 6, 0); hair(x, 7, 0); }
      } else {
        for (let j = 4; j < 10; j++) for (let x = 4; x <= (j < 6 ? 9 : 8); x++) hair(x, j, x <= 5 ? 1 : 0);
        for (const x of [10, 11, 12, 13, 14]) hair(x, 4, 1);
        hair(15, 4, 0); hair(4, 10, 0); hair(5, 10, 0);
      }
    }
    if (hs === 'long') {
      if (back) { for (let j = 10; j < 15; j++) for (let x = 5; x <= 14; x++) hair(x, j, x < 8 ? 2 : x > 11 ? 0 : 1); }
      else if (side) { for (let j = 6; j < 14; j++) for (let x = 3; x <= 7; x++) hair(x, j, x < 5 ? 1 : 0); }
      else { for (let j = 5; j < 14; j++) { hair(3, j, 1); hair(4, j, 1); hair(15, j, 0); hair(16, j, 0); } }
    }
    if (hs === 'queue') {
      if (back) { for (let j = 10; j < 15; j++) { hair(9, j, 1); hair(10, j, 0); } hair(9, 10, 2); }
      else if (side) { for (let j = 5; j < 10; j++) { hair(2, j, 1); hair(3, j, 0); } }
    }
    if (hs === 'hirsute') { hair(6, -1, 1); hair(9, -1, 2); hair(12, -1, 1); hair(9, -2, 1); hair(4, 0, 1); hair(15, 0, 0); }
  } else if (!back) { head.set(6 + hx, hy + 1, SK[3]); head.set(7 + hx, hy + 1, SK[3]); head.set(6 + hx, hy + 2, SK[3]); }
  // barbe
  if (look.beard && !back) {
    const BH = look.beardCol != null ? HAIRS[look.beardCol] : HR;
    if (side) { for (let j = 8; j < 12; j++) for (let x = 10; x <= 15; x++) if (j < 11 || x > 11) head.set(x + hx, hy + j, BH[x > 13 ? 1 : 0]); head.set(14 + hx, hy + 9, 0x3a2418); }
    else {
      for (let j = 8; j < 12; j++) { const [a, b] = j === 11 ? [6, 13] : [5, 14]; for (let x = a; x <= b; x++) head.set(x, hy + j, BH[(x + j) % 3 === 0 ? 0 : 1]); }
      head.set(9, hy + 9, 0x3a2418); head.set(10, hy + 9, 0x3a2418);
      if (look.beard === 2) for (let j = 12; j < 15; j++) { head.set(8, hy + j, BH[1]); head.set(9, hy + j, BH[2]); head.set(10, hy + j, BH[1]); head.set(11, hy + j, BH[0]); }
    }
  }
  // bandeau sur l'œil
  if (look.eye === 'patch' && !back) {
    if (!side) { head.rect(11, hy + 5, 3, 3, 0x141014); head.hl(4, hy + 4, 12, 0x241a1a); meta.eyes = meta.eyes.filter((e) => e[0] !== 12); }
    else head.hl(6 + hx, hy + 4, 10, 0x241a1a);
  }
  paintHat(head, look, dir, hx, hy);
  head.outline('auto');

  const out = new PB(FW, FH);
  if (back) { out.paste(arms, 0, 0); out.paste(body, 0, 0); out.paste(head, 0, 0); }
  else { out.paste(body, 0, 0); out.paste(arms, 0, 0); out.paste(head, 0, 0); }
  return { pb: out, meta };
}

function paintHat(h, look, dir, hx, hy) {
  const hat = look.hat; if (!hat) return;
  const side = dir === 2, back = dir === 3;
  const C = clothOf(look.hatCol || (hat === 'bandana' ? 'red' : hat === 'bonnet' ? 'navy' : 'black'));
  const s = (x, y, c) => h.set(x + hx, hy + y, c);
  if (hat === 'bandana') {
    for (let j = 0; j < 4; j++) { const [a, b] = HEAD_ROWS[j]; for (let x = a; x <= b; x++) s(x, j, C[(x <= 7 && j <= 1) ? 3 : x >= 13 ? 1 : 2]); }
    for (let x = 4; x <= 15; x++) s(x, 4, C[1]);
    for (let j = 0; j < 4; j++) for (let x = 5 + (j % 2); x <= 14; x += 3) s(x, j, 0xf5ecdc);
    if (back) { s(9, 5, C[2]); s(10, 5, C[1]); s(8, 6, C[2]); s(11, 6, C[1]); s(8, 7, C[1]); s(11, 7, C[0]); }
    else if (side) { s(3, 4, C[2]); s(2, 5, C[2]); s(3, 5, C[1]); s(1, 6, C[1]); s(2, 6, C[0]); }
    else { s(15, 5, C[1]); s(16, 5, C[2]); s(16, 6, C[1]); s(17, 6, C[0]); }
  } else if (hat === 'tricorne' || hat === 'capitaine') {
    const big = hat === 'capitaine';
    const G = big ? GOLDC : [0x6a5a3a, 0x9a8456, 0xc4ae78, 0xe0cc98];
    const top = big ? -3 : -2;
    for (let y = top; y < 3; y++) { const ins = y === top ? 3 : y === top + 1 ? 2 : 1; for (let x = 4 + ins; x <= 15 - ins; x++) s(x, y, C[x < 8 ? 3 : x > 12 ? 1 : 2]); }
    if (back) {
      for (let x = 2; x <= 17; x++) { s(x, 3, C[2]); s(x, 4, x % 2 ? C[1] : C[2]); }
      for (let x = 2; x <= 17; x++) s(x, 5, G[1]);
      s(9, 6, C[1]); s(10, 6, C[1]);
    } else if (side) {
      for (let x = 1; x <= 18; x++) { s(x, 3, C[2]); s(x, 4, C[1]); }
      s(18, 2, C[2]); s(1, 2, C[2]); s(0, 2, C[1]); s(19, 1, C[1]);
      for (let x = 1; x <= 18; x++) s(x, 5, G[2]);
    } else {
      for (let x = 1; x <= 18; x++) s(x, 3, C[x < 6 ? 3 : 2]);
      for (let x = 2; x <= 17; x++) s(x, 4, C[1]);
      for (let x = 6; x <= 13; x++) s(x, 5, C[1]);
      s(9, 6, C[1]); s(10, 6, C[1]);
      for (let x = 1; x <= 18; x++) if (h.get(x + hx, hy + 4) === C[1] && (x < 6 || x > 13)) s(x, 4, G[2]);
      for (let x = 6; x <= 13; x++) s(x, 5, G[2]);
      s(9, 6, G[3]); s(10, 6, G[2]);
      s(0, 2, C[2]); s(19, 2, C[1]);
    }
    if (big) {
      if (!back && !side) { s(8, 0, 0xf0ece0); s(9, 0, 0xf0ece0); s(10, 0, 0xf0ece0); s(11, 0, 0xf0ece0); s(8, 1, 0xf0ece0); s(11, 1, 0xf0ece0); s(9, 1, 0x141014); s(10, 1, 0x141014); }
      const plume = [[3, 1], [2, 0], [2, -1], [3, -2], [4, -3], [5, -4], [6, -4], [3, -1], [4, -2], [5, -3]];
      for (const [px, py] of plume) s(side ? px + 1 : px, py + 1, py < -2 ? 0xe04a3a : 0xf6f0e2);
    }
  } else if (hat === 'paille') {
    const S = [0x8a6a2a, 0xb8923e, 0xe0c060, 0xf6e08a];
    for (let y = -1; y < 3; y++) { const ins = y === -1 ? 3 : 1; for (let x = 5 + ins; x <= 14 - ins; x++) s(x, y, S[x < 9 ? 3 : 2]); }
    for (let x = 6; x <= 13; x++) s(x, 2, 0xc0302a);
    for (let x = 1; x <= 18; x++) { s(x, 3, S[(x % 2) ? 2 : 3]); s(x, 4, S[1]); }
    for (let x = 2; x <= 17; x++) s(x, 5, S[0]);
  } else if (hat === 'crane') {
    const B = [0x9a9076, 0xc8bfa2, 0xeee6cc, 0xfffbe8];
    for (let j = -1; j < 5; j++) { const [a, b] = HEAD_ROWS[Math.max(0, j)]; for (let x = a; x <= b; x++) s(x, j, B[(x <= 7 && j <= 1) ? 3 : x >= 13 ? 1 : 2]); }
    if (!back) { if (side) { s(13, 3, 0x141014); s(14, 3, 0x141014); } else { s(7, 3, 0x141014); s(8, 3, 0x141014); s(11, 3, 0x141014); s(12, 3, 0x141014); } for (let x = 5; x <= 14; x += 2) s(x, 5, B[0]); }
  } else if (hat === 'couronne') {
    const G = [0x8a5a14, 0xc8901e, 0xf0c040, 0xfff0a0];
    for (let x = 5; x <= 14; x++) { s(x, 1, G[x < 8 ? 3 : 2]); s(x, 2, G[x < 8 ? 2 : 1]); }
    for (const px of [5, 8, 11, 14]) { s(px, 0, G[2]); s(px, -1, G[3]); }
    s(9, 1, 0xd8303a); s(10, 1, 0xd8303a); s(6, 2, 0x3a8ad8); s(13, 2, 0x3ad86a);
  } else if (hat === 'foulard') { // foulard noué, deux pans qui pendent derrière
    for (let j = 0; j < 4; j++) { const [a, b] = HEAD_ROWS[j]; for (let x = a; x <= b; x++) s(x, j, C[(x <= 7 && j <= 1) ? 3 : x >= 13 ? 1 : 2]); }
    for (let x = 4; x <= 15; x++) s(x, 4, C[1]);
    if (back) { s(9, 4, C[3]); s(10, 4, C[3]); for (let k = 0; k < 4; k++) { s(8 - (k >> 1), 5 + k, C[2]); s(11 + (k >> 1), 5 + k, C[1]); } }
    else if (side) { s(3, 4, C[3]); s(2, 5, C[2]); s(2, 6, C[1]); s(1, 7, C[1]); s(3, 6, C[2]); s(2, 8, C[0]); }
    else { s(15, 3, C[3]); s(16, 4, C[2]); s(16, 5, C[1]); s(17, 6, C[1]); }
  } else if (hat === 'plume') { // grand chapeau de mousquetaire, plume blanche
    const G = GOLDC;
    for (let y = -2; y < 3; y++) { const ins = y === -2 ? 3 : y === -1 ? 2 : 1; for (let x = 4 + ins; x <= 15 - ins; x++) s(x, y, C[x < 8 ? 3 : x > 12 ? 1 : 2]); }
    for (let x = 6; x <= 13; x++) s(x, 2, G[2]);
    for (let x = 0; x <= 19; x++) { s(x, 3, C[x < 6 ? 3 : 2]); s(x, 4, C[1]); }
    if (!back) for (let x = 2; x <= 17; x++) s(x, 5, C[0]);
    const pl = side ? [[13, 1], [14, 0], [15, -1], [16, -2], [17, -3], [17, -4], [16, -5], [15, -5]] : [[14, 1], [15, 0], [16, -1], [17, -2], [18, -3], [18, -4], [17, -5], [16, -5], [15, 2]];
    for (const [px, py] of pl) { s(px, py, 0xf6f0e2); s(px - 1, py + 1, 0xd8d0c0); }
  } else if (hat === 'bec') { // masque de médecin de peste : bec, verres ronds, chapeau plat
    for (let y = -1; y < 2; y++) { const ins = y === -1 ? 2 : 1; for (let x = 4 + ins; x <= 15 - ins; x++) s(x, y, C[x < 8 ? 3 : 2]); }
    for (let x = 0; x <= 19; x++) { s(x, 2, C[2]); s(x, 3, C[1]); }
    const M = [0x2a2420, 0x4a3e34, 0x6a5a48, 0x8a7860];
    for (let j = 4; j < 10; j++) { const [a, b] = HEAD_ROWS[Math.min(10, j)]; for (let x = a; x <= b; x++) s(x, j, M[x < 8 ? 2 : 1]); }
    if (!back) {
      if (side) { for (let k = 0; k < 6; k++) { s(14 + k, 6 + (k >> 1), M[3 - (k >> 1)]); s(14 + k, 7 + (k >> 1), M[1]); } s(13, 5, 0xc8e8ff); s(12, 5, 0x6a8aa0); }
      else { s(7, 5, 0xc8e8ff); s(12, 5, 0xc8e8ff); s(6, 5, 0x6a8aa0); s(13, 5, 0x6a8aa0); for (let k = 0; k < 5; k++) { s(9, 7 + k, M[3]); s(10, 7 + k, M[2]); } s(9, 12, M[1]); }
    }
  } else if (hat === 'morion') { // casque d'acier à crête
    const S2 = [0x3a3a46, 0x5a5a6c, 0x8a8a9c, 0xc8c8d6];
    for (let y = -1; y < 3; y++) { const ins = y === -1 ? 3 : y === 0 ? 2 : 1; for (let x = 4 + ins; x <= 15 - ins; x++) s(x, y, S2[x < 8 ? 3 : x > 12 ? 1 : 2]); }
    for (let x = 8; x <= 11; x++) s(x, -2, S2[3]); s(9, -3, S2[3]); s(10, -3, S2[2]);
    for (let x = 1; x <= 18; x++) s(x, 3, S2[(x + 1) % 5 === 0 ? 3 : 2]);
    s(0, 2, S2[2]); s(19, 2, S2[1]); s(1, 4, S2[1]); s(18, 4, S2[1]);
    if (!back && !side) { s(6, 2, GOLDC[2]); s(13, 2, GOLDC[2]); }
  } else if (hat === 'cagoule') { // cagoule de bourreau
    for (let j = -2; j < 11; j++) { const [a, b] = HEAD_ROWS[Math.max(0, Math.min(10, j))]; for (let x = a; x <= b; x++) s(x, j, C[(x <= 7 && j <= 3) ? 2 : x >= 13 ? 0 : 1]); }
    s(9, -3, C[1]); s(10, -3, C[0]);
    if (!back) { if (side) { s(13, 5, 0x141014); s(14, 5, 0xff3a3a); } else { s(7, 5, 0xff3a3a); s(12, 5, 0xff3a3a); s(6, 5, 0x141014); s(13, 5, 0x141014); } }
  } else if (hat === 'bonnet') {
    for (let y = -1; y < 5; y++) { const ins = y === -1 ? 3 : y === 0 ? 1 : 0; for (let x = 5 + ins; x <= 14 - ins; x++) s(x, y, C[y >= 3 ? 1 : (x < 8 ? 3 : 2)]); }
    for (let x = 4; x <= 15; x++) { s(x, 4, C[1]); s(x, 5, C[0]); }
    s(9, -2, 0xf0ece0); s(10, -2, 0xd8d0c0); s(9, -3, 0xf0ece0);
  }
}

// ---------- squelette ----------
function paintSkeletonRight(look, dir, frame) {
  const side = dir === 2, back = dir === 3;
  const B = look.bones || [0x6c6450, 0x9a9076, 0xc8bfa2, 0xeee6cc];
  const pb = new PB(FW, FH), head = new PB(FW, FH);
  const bob = (frame === 1 || frame === 3) ? -1 : 0, step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  const meta = { eyes: [], hand: [14, 18] };
  const tT = 14 + bob;
  // jambes
  if (!side) {
    for (const [x, lift] of [[7, step === -1 ? 2 : 0], [11, step === 1 ? 2 : 0]]) { pb.vl(x, 20 + bob, 5 - lift, B[2]); pb.vl(x + 1, 20 + bob, 5 - lift, B[1]); pb.rect(x - (x === 7 ? 1 : 0), 25 - lift, 3, 1, B[3]); }
  } else {
    if (step === 0) { pb.vl(9, 20 + bob, 5, B[2]); pb.vl(10, 20 + bob, 5, B[1]); pb.hl(9, 25, 3, B[3]); }
    else { pb.line(9, 20 + bob, 7, 25, B[1]); pb.line(10, 20 + bob, 12, 25, B[2]); pb.hl(5, 25, 3, B[2]); pb.hl(12, 25, 3, B[3]); }
  }
  // bassin + côtes
  pb.hl(7, 19 + bob, 6, B[2]); pb.hl(8, 20 + bob, 4, B[1]);
  pb.vl(9, tT, 5, B[2]); pb.vl(10, tT, 5, B[1]);
  for (const y of [tT + 1, tT + 3]) { if (side) pb.hl(8, y, 4, B[3]); else pb.hl(7, y, 6, B[3]); }
  if (!side) { pb.set(7, tT + 2, B[1]); pb.set(12, tT + 2, B[1]); }
  // écharpe rouge
  const sash = clothOf(look.topCol || 'red');
  pb.hl(side ? 8 : 7, 19 + bob, side ? 5 : 6, sash[2]); pb.set(side ? 7 : 12, 20 + bob, sash[1]); pb.set(side ? 7 : 12, 21 + bob, sash[0]);
  // bras
  if (!side) {
    const sw = step;
    pb.vl(5, tT + Math.max(0, sw), 4, B[3]); pb.rect(5, tT + 4 + sw, 2, 1, B[2]);
    pb.vl(14, tT + Math.max(0, -sw), 4, B[2]); pb.rect(13, tT + 4 - sw, 2, 1, B[2]);
    meta.hand = back ? [5, tT + 5] : [14, tT + 5 - sw];
  } else {
    pb.line(10, tT, 12, tT + 4, B[3]); pb.set(12, tT + 5, B[2]);
    meta.hand = [12, tT + 5];
  }
  pb.outline('auto');
  // crâne
  const hy = 4 + bob;
  for (let j = 0; j < 9; j++) {
    const a = j === 0 ? 7 : j === 1 ? 6 : j < 6 ? 5 : j === 6 ? 6 : 7, b = 19 - a - 0;
    for (let x = a; x < b; x++) head.set(x + (side ? 1 : 0), hy + j, B[x < 8 && j < 4 ? 3 : x > 11 ? 1 : 2]);
  }
  if (!back) {
    const glow = look.eyeCol || 0xff4a3a;
    if (side) { head.rect(12, hy + 3, 2, 2, 0x140c10); head.set(12, hy + 3, glow); meta.eyes.push([12, hy + 3]); head.set(14, hy + 5, 0x140c10); for (let x = 11; x < 15; x += 2) head.set(x, hy + 7, 0x140c10); }
    else {
      head.rect(6, hy + 3, 3, 2, 0x140c10); head.rect(11, hy + 3, 3, 2, 0x140c10);
      head.set(7, hy + 3, glow); head.set(12, hy + 3, glow); meta.eyes.push([7, hy + 3], [12, hy + 3]);
      head.set(9, hy + 5, 0x140c10); head.set(10, hy + 5, 0x140c10);
      for (let x = 7; x < 13; x++) head.set(x, hy + 7, x % 2 ? 0x140c10 : B[3]);
    }
  }
  paintHat(head, look, dir, side ? 1 : 0, hy - 1);
  head.outline('auto');
  pb.paste(head, 0, 0);
  return { pb, meta };
}

// ---------- crabe ----------
function paintCrab(frame, pal) {
  const pb = new PB(FW, FH);
  const S = pal || [0x3a1420, 0x6a2430, 0x9a3640, 0xc85a56, 0xe8867a];
  const cy = 19, open = frame % 2 === 0;
  for (let k = 0; k < 3; k++) {
    const up = (frame + k) % 2 ? 1 : 0;
    pb.line(5, cy + k, 1, cy + 3 + k - up, S[1]); pb.line(14, cy + k, 18, cy + 3 + k - up, S[1]);
  }
  pb.blob(9.5, cy, 7, 4.6, S, { noise: 0.15 });
  for (const [x, y] of [[7, cy - 1], [12, cy + 1], [9, cy + 2]]) { pb.set(x, y, 0x6a8a4a); pb.set(x + 1, y, 0x4e6e3a); }
  for (const ex of [7, 12]) { pb.vl(ex, cy - 7, 3, S[1]); pb.set(ex, cy - 8, 0xffe14a); pb.set(ex, cy - 7, 0x141014); }
  for (const [x, d] of [[3, -1], [16, 1]]) {
    pb.blob(x, cy - 4, 2.8, 2.4, S, {});
    pb.set(x + d * 2, cy - 6 - (open ? 1 : 0), S[3]); pb.set(x + d * 3, cy - 6 - (open ? 1 : 0), S[3]);
    pb.set(x + d * 2, cy - 3 + (open ? 1 : 0), S[2]); pb.set(x + d * 3, cy - 3 + (open ? 1 : 0), S[2]);
    pb.line(x - d, cy - 2, x - d * 3, cy, S[1]);
  }
  pb.outline('auto');
  return { pb, meta: { eyes: [[7, cy - 8], [12, cy - 8]], hand: [16, cy - 4] } };
}

// ---------- Scale2x pour le boss ----------
function scale2x(src) {
  const out = new PB(src.w * 2, src.h * 2);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const E = src.get(x, y), B = src.get(x, y - 1), D = src.get(x - 1, y), F = src.get(x + 1, y), H = src.get(x, y + 1);
    let e0 = E, e1 = E, e2 = E, e3 = E;
    if (B !== H && D !== F) {
      e0 = D === B ? D : E; e1 = B === F ? F : E; e2 = D === H ? D : E; e3 = H === F ? F : E;
    }
    out.p[(y * 2) * out.w + x * 2] = e0; out.p[(y * 2) * out.w + x * 2 + 1] = e1;
    out.p[(y * 2 + 1) * out.w + x * 2] = e2; out.p[(y * 2 + 1) * out.w + x * 2 + 1] = e3;
  }
  return out;
}

// ---------- perroquet ----------
export function parrotSheet() {
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(14, 14);
    const R = [0x7a1414, 0xb02424, 0xe03a32, 0xff6a50];
    pb.blob(7, 8, 3.5, 4.5, R, {});
    pb.disc(7, 3.5, 2.6, R[2]); pb.set(6, 2, R[3]);
    pb.set(9, 3, 0xf8e8a0); pb.set(10, 4, 0xf8e8a0); pb.set(9, 4, 0x2a2424);
    pb.set(7, 3, 0xffffff); pb.set(7, 3, 0x141014);
    const flap = f === 2;
    if (flap) { pb.line(4, 7, 0, 3, 0x2a6ad0, 2); pb.line(10, 7, 13, 3, 0x2a6ad0, 2); pb.set(0, 3, 0xffd84a); pb.set(13, 3, 0xffd84a); }
    else { pb.rect(3, 7, 2, 5, 0x2a6ad0); pb.rect(10, 7, 2, 5, 0x1a4aa0); pb.set(3, 11, 0xffd84a); pb.set(11, 11, 0xffd84a); }
    pb.vl(7, 12, 2, 0x2a6ad0); pb.set(6, 13, 0x1a4aa0);
    if (f === 1) { pb.clear(9, 3); pb.set(9, 2, 0xf8e8a0); }
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}

// ---------- feuilles d'animation ----------
const sheetCache = new Map();
function compose(paint, look) {
  const cv = document.createElement('canvas');
  cv.width = FW * 4; cv.height = FH * 4;
  const ctx = cv.getContext('2d');
  const meta = [];
  for (let d = 0; d < 4; d++) {
    meta[d] = [];
    for (let f = 0; f < 4; f++) {
      let r;
      if (d === 1) { r = paint(look, 2, f); r = { pb: r.pb.mirror(), meta: { eyes: r.meta.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - r.meta.hand[0], r.meta.hand[1]] } }; }
      else r = paint(look, d, f);
      ctx.drawImage(r.pb.toCanvas(), f * FW, d * FH);
      meta[d][f] = r.meta;
    }
  }
  return { cv, meta, fw: FW, fh: FH, ax: AX, ay: AY, white: null };
}
export function humanSheet(look) {
  const key = 'h' + JSON.stringify(look);
  let s = sheetCache.get(key);
  if (!s) { s = compose(paintRight, look); sheetCache.set(key, s); }
  return s;
}
export function mobSheet(kind) {
  const key = 'm' + kind;
  let s = sheetCache.get(key);
  if (s) return s;
  if (kind.endsWith(':sun')) { // mort résistant au soleil : peau tannée et chapeau de paille
    const base = kind.slice(0, -4), L0 = MOB_LOOKS[base];
    if (!L0 || L0.skel || L0.dog) return mobSheet(base);
    MOB_LOOKS[kind] = Object.assign({}, L0, { skin: L0.skin === 'ghoul' ? 'ghoul' : 'tanne', hat: 'paille', eyeCol: 0xffb04a });
    s = mobSheet2(kind, MOB_LOOKS[kind]); sheetCache.set(key, s); return s;
  }
  s = mobSheet2(kind, MOB_LOOKS[kind]);
  sheetCache.set(key, s);
  return s;
}
// planche « grande » : un personnage peint puis agrandi deux fois (Scale2x)
function bigSheet(paint, L) {
  const cv = document.createElement('canvas'); cv.width = FW * 8; cv.height = FH * 8;
  const ctx = cv.getContext('2d'); const meta = [];
  for (let d = 0; d < 4; d++) {
    meta[d] = [];
    for (let f = 0; f < 4; f++) {
      let r = paint(L, d === 1 ? 2 : d, f), pb = r.pb, m = r.meta;
      if (d === 1) { pb = pb.mirror(); m = { eyes: m.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - m.hand[0], m.hand[1]] }; }
      const big = scale2x(pb);
      for (const [ex, ey] of m.eyes) { big.rect(ex * 2, ey * 2, 2, 2, L.eyeCol || 0xff4a3a); big.set(ex * 2, ey * 2, 0xffffff); }
      ctx.drawImage(big.toCanvas(), f * FW * 2, d * FH * 2);
      meta[d][f] = { eyes: m.eyes.map(([x, y]) => [x * 2, y * 2]), hand: [m.hand[0] * 2, m.hand[1] * 2] };
    }
  }
  return { cv, meta, fw: FW * 2, fh: FH * 2, ax: AX * 2, ay: AY * 2, white: null };
}
// chien mort, de profil (on garde le profil pour toutes les directions)
function paintDog(L, dir, frame) {
  const pb = new PB(FW, FH), st = frame % 2, B = L.fur;
  const y0 = 16;
  pb.ellipse(9, y0 + 3, 6, 3, B[2]); pb.hl(5, y0 + 1, 8, B[3]);
  for (let k = 0; k < 4; k++) pb.set(5 + k * 2, y0 + 3 + (k % 2), B[0]); // côtes saillantes
  pb.disc(15.5, y0, 3, B[2]); pb.rect(16, y0, 4, 2, B[3]); pb.set(19, y0 + 1, 0x1a1014);
  pb.rect(14, y0 - 4, 2, 3, B[0]);
  for (const [x, o] of [[5, st], [7, 1 - st], [11, st], [13, 1 - st]]) pb.vl(x, y0 + 5, 4 - o, B[1]);
  pb.line(3, y0 + 2, 0, y0 - 1 + st, B[1]);
  for (const [x, y] of [[9, y0 + 2], [12, y0 + 4]]) pb.set(x, y, L.wound || 0x8a2a2a);
  pb.outline('auto');
  return { pb: dir === 1 ? pb : pb, meta: { eyes: [[16, y0 - 1]], hand: [18, y0 + 1] } };
}
function dogSheet(L) {
  const cv = document.createElement('canvas'); cv.width = FW * 4; cv.height = FH * 4;
  const ctx = cv.getContext('2d'), meta = [];
  for (let d = 0; d < 4; d++) {
    meta[d] = [];
    for (let f = 0; f < 4; f++) {
      let r = paintDog(L, d, f);
      let pb = r.pb, m = r.meta;
      if (d === 1) { pb = pb.mirror(); m = { eyes: m.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - m.hand[0], m.hand[1]] }; }
      for (const [ex, ey] of m.eyes) pb.set(ex, ey, L.eyeCol);
      ctx.drawImage(pb.toCanvas(), f * FW, d * FH);
      meta[d][f] = m;
    }
  }
  return { cv, meta, fw: FW, fh: FH, ax: AX, ay: AY, white: null };
}
// golem de lave : un amas de roches noires veinées de feu
function paintGolem(L, dir, frame) {
  const pb = new PB(FW, FH), st = frame === 1 ? 1 : frame === 3 ? -1 : 0, side = dir === 2, back = dir === 3;
  const R2 = L.rock, F = L.fire;
  for (const [x0, lift] of [[6, st === -1 ? 1 : 0], [11, st === 1 ? 1 : 0]]) { pb.rect(x0, 20 - lift, 4, 6, R2[1]); pb.hl(x0, 20 - lift, 4, R2[2]); }
  pb.blob(10, 15, 7, 5.5, R2, { noise: 0.35 });
  pb.blob(side ? 11 : 10, 7, 4.5, 4, R2, { noise: 0.3 });
  for (const [ax, ay] of side ? [[14, 15]] : [[3, 15], [17, 15]]) { pb.blob(ax, ay + st, 2.6, 4, R2, { noise: 0.3 }); }
  const cracks = [[8, 13, 12, 17], [11, 12, 9, 16], [7, 16, 10, 18], [13, 14, 12, 18]];
  for (const [x0, y0, x1, y1] of cracks) pb.line(x0, y0, x1, y1, F[1]);
  pb.set(10, 15, F[2]); pb.set(9, 14, F[3]);
  const meta = { eyes: [], hand: [side ? 15 : 17, 18 + st] };
  if (!back) { if (side) { pb.set(13, 7, F[3]); meta.eyes.push([13, 7]); } else { pb.set(8, 7, F[3]); pb.set(12, 7, F[3]); meta.eyes.push([8, 7], [12, 7]); } }
  pb.outline('auto');
  return { pb, meta };
}
function mobSheet2(kind, L) {
  let s;
  if (kind === 'crab' || (L && L.crab)) {
    const cv = document.createElement('canvas'); cv.width = FW * 4; cv.height = FH * 4;
    const ctx = cv.getContext('2d'); const meta = [];
    for (let d = 0; d < 4; d++) { meta[d] = []; for (let f = 0; f < 4; f++) { const r = paintCrab(f, L && L.crab); ctx.drawImage(r.pb.toCanvas(), f * FW, d * FH); meta[d][f] = r.meta; } }
    s = { cv, meta, fw: FW, fh: FH, ax: AX, ay: AY, white: null };
  } else if (L && L.dog) s = dogSheet(L);
  else if (L && L.golem) s = bigSheet(paintGolem, L);
  else if (L && L.skel && L.big) s = bigSheet(paintSkeletonRight, L);
  else if (kind === 'skelgun' || (L && L.skel)) s = compose(paintSkeletonRight, L);
  else if (kind === 'roi_squelette') {
    const cv = document.createElement('canvas'); cv.width = FW * 8; cv.height = FH * 8;
    const ctx = cv.getContext('2d'); const meta = [];
    for (let d = 0; d < 4; d++) {
      meta[d] = [];
      for (let f = 0; f < 4; f++) {
        let r = paintSkeletonRight(L, d === 1 ? 2 : d, f), pb = r.pb, m = r.meta;
        if (d === 1) { pb = pb.mirror(); m = { eyes: m.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - m.hand[0], m.hand[1]] }; }
        const big = scale2x(pb);
        for (const [ex, ey] of m.eyes) { big.rect(ex * 2, ey * 2, 2, 2, L.eyeCol); big.set(ex * 2, ey * 2, 0xffffff); }
        ctx.drawImage(big.toCanvas(), f * FW * 2, d * FH * 2);
        meta[d][f] = { eyes: m.eyes.map(([x, y]) => [x * 2, y * 2]), hand: [m.hand[0] * 2, m.hand[1] * 2] };
      }
    }
    s = { cv, meta, fw: FW * 2, fh: FH * 2, ax: AX * 2, ay: AY * 2, white: null };
  }
  else if (kind === 'crabroi') {
    const cv = document.createElement('canvas'); cv.width = FW * 8; cv.height = FH * 8;
    const ctx = cv.getContext('2d'); const meta = [];
    for (let d = 0; d < 4; d++) {
      meta[d] = [];
      for (let f = 0; f < 4; f++) {
        const r = paintCrab(f);
        const big = scale2x(r.pb);
        const C = [0x8a5a14, 0xc8901e, 0xf0c040, 0xfff0a0];
        for (let x = 13; x <= 26; x++) { big.set(x, 26, C[1]); big.set(x, 25, C[2]); }
        for (const px of [13, 17, 21, 25]) { big.set(px, 24, C[2]); big.set(px, 23, C[3]); big.set(px + 1, 24, C[1]); }
        big.set(19, 25, 0xd8303a); big.set(20, 25, 0xd8303a);
        ctx.drawImage(big.toCanvas(), f * FW * 2, d * FH * 2);
        meta[d][f] = { eyes: r.meta.eyes.map(([x, y]) => [x * 2, y * 2]), hand: [r.meta.hand[0] * 2, r.meta.hand[1] * 2] };
      }
    }
    s = { cv, meta, fw: FW * 2, fh: FH * 2, ax: AX * 2, ay: AY * 2, white: null };
  } else if (L && L.big) {
    const cv = document.createElement('canvas'); cv.width = FW * 8; cv.height = FH * 8;
    const ctx = cv.getContext('2d'); const meta = [];
    for (let d = 0; d < 4; d++) {
      meta[d] = [];
      for (let f = 0; f < 4; f++) {
        let r = paintRight(L, d === 1 ? 2 : d, f), pb = r.pb, m = r.meta;
        if (d === 1) { pb = pb.mirror(); m = { eyes: m.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - m.hand[0], m.hand[1]] }; }
        const big = scale2x(pb);
        for (const [ex, ey] of m.eyes) { big.rect(ex * 2, ey * 2, 2, 3, L.eyeCol); big.set(ex * 2, ey * 2, 0xffffff); }
        ctx.drawImage(big.toCanvas(), f * FW * 2, d * FH * 2);
        meta[d][f] = { eyes: m.eyes.map(([x, y]) => [x * 2, y * 2]), hand: [m.hand[0] * 2, m.hand[1] * 2] };
      }
    }
    s = { cv, meta, fw: FW * 2, fh: FH * 2, ax: AX * 2, ay: AY * 2, white: null };
  }
  else if (kind === 'boss') {
    const cv = document.createElement('canvas'); cv.width = FW * 8; cv.height = FH * 8;
    const ctx = cv.getContext('2d'); const meta = [];
    for (let d = 0; d < 4; d++) {
      meta[d] = [];
      for (let f = 0; f < 4; f++) {
        let r = paintRight(L, d === 1 ? 2 : d, f);
        let pb = r.pb, m = r.meta;
        if (d === 1) { pb = pb.mirror(); m = { eyes: m.eyes.map(([x, y]) => [FW - 1 - x, y]), hand: [FW - m.hand[0], m.hand[1]] }; }
        const big = scale2x(pb);
        for (const [ex, ey] of m.eyes) { big.rect(ex * 2, ey * 2, 2, 3, 0x9dff6a); big.set(ex * 2, ey * 2, 0xeaffd0); }
        ctx.drawImage(big.toCanvas(), f * FW * 2, d * FH * 2);
        meta[d][f] = { eyes: m.eyes.map(([x, y]) => [x * 2, y * 2]), hand: [m.hand[0] * 2, m.hand[1] * 2] };
      }
    }
    s = { cv, meta, fw: FW * 2, fh: FH * 2, ax: AX * 2, ay: AY * 2, white: null };
  } else s = compose(paintRight, L);
  return s;
}

export const MOB_LOOKS = {
  zsailor: { skin: 'zombie', undead: 1, hair: 1, hairStyle: 'hirsute', top: 'rayee', pants: 'navy', boots: 'brown', eyeCol: 0xffe14a, seed: 3, hat: 'bonnet', hatCol: 'red' },
  buccaneer: { skin: 'zombie', undead: 1, hair: 0, top: 'haillons', topCol: 'red', pants: 'black', boots: 'black', eyeCol: 0xff5a3a, eye: 'patch', hat: 'bandana', hatCol: 'black', beard: 1, seed: 2 },
  ghoul: { skin: 'ghoul', undead: 1, hunch: 1, hair: 4, hairStyle: 'hirsute', top: 'haillons', topCol: 'grey', pants: 'grey', boots: 'grey', eyeCol: 0xd28aff, claws: 1, seed: 4 },
  drowned: { skin: 'drowned', undead: 1, hair: 6, hairStyle: 'long', top: 'haillons', topCol: 'teal', pants: 'navy', boots: 'teal', eyeCol: 0xc8fff4, seed: 5 },
  skelgun: { hat: 'tricorne', hatCol: 'black', topCol: 'red', eyeCol: 0xff4a3a },
  goule_alpha: { skin: 'ghoul', undead: 1, hunch: 1, hair: 0, hairStyle: 'hirsute', top: 'haillons', topCol: 'red', pants: 'black', boots: 'black', eyeCol: 0xff3a3a, claws: 1, seed: 8, big: 1 },
  capitaine_noye: { skin: 'drowned', undead: 1, hair: 6, hairStyle: 'long', top: 'capitaine', topCol: 'teal', pants: 'navy', boots: 'black', eyeCol: 0xc8fff4, hat: 'tricorne', hatCol: 'teal', beard: 1, beardCol: 6, seed: 9, big: 1 },
  boss: { skin: 'ash', undead: 1, hair: 4, top: 'capitaine', topCol: 'black', pants: 'black', boots: 'black', eyeCol: 0x9dff6a, hat: 'capitaine', hatCol: 'black', beard: 2, beardCol: 4, seed: 6 },
  roi_squelette: { hat: 'couronne', topCol: 'purple', eyeCol: 0xb8ff6a },
  // 0.7 : les morts du Grand Large
  flibustier: { skin: 'zombie', undead: 1, hair: 0, hairStyle: 'long', top: 'manteau', topCol: 'black', pants: 'brown', boots: 'black', eyeCol: 0xff8a3a, hat: 'tricorne', hatCol: 'red', beard: 1, seed: 11 },
  chien_mort: { dog: 1, fur: [0x2a2418, 0x4a3e2a, 0x6a5a3e, 0x8a7a58], eyeCol: 0xffe14a },
  molosse_damne: { dog: 1, fur: [0x101018, 0x1e1e2a, 0x30303e, 0x484858], eyeCol: 0x6aff9a, wound: 0x3a8a5a },
  pendu: { skin: 'ghoul', undead: 1, hunch: 1, hair: 4, hairStyle: 'long', top: 'haillons', topCol: 'black', pants: 'black', boots: 'grey', eyeCol: 0xd8e0ff, hat: 'foulard', hatCol: 'brown', seed: 12 },
  sorciere: { skin: 'zombie', hair: 4, hairStyle: 'long', top: 'vareuse', topCol: 'purple', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'purple', eyeCol: 0xc86aff, seed: 13 },
  sirene: { skin: 'drowned', undead: 1, hair: 6, hairStyle: 'long', top: 'vareuse', topCol: 'teal', pants: 'teal', boots: 'teal', eyeCol: 0x9fffe8, seed: 14 },
  crabe_corail: { crab: [0x5a1830, 0x9a2a48, 0xd84a62, 0xff7a84, 0xffb0a8] },
  legionnaire: { skel: 1, hat: 'morion', topCol: 'red', eyeCol: 0xff6a3a },
  pestifere: { skin: 'peste', undead: 1, hair: 4, hairStyle: 'hirsute', top: 'haillons', topCol: 'white', pants: 'grey', boots: 'grey', eyeCol: 0xd8ff6a, seed: 15 },
  medecin_peste: { skin: 0, top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'bec', hatCol: 'black', eyeCol: 0xff3a2a, seed: 16 },
  calcine: { skin: 'ash', undead: 1, hair: 0, hairStyle: 'chauve', top: 'haillons', topCol: 'black', pants: 'black', boots: 'black', eyeCol: 0xffa030, hat: 'tricorne', hatCol: 'black', seed: 17 },
  golem_lave: { golem: 1, rock: [0x141014, 0x241c20, 0x3a2e30, 0x524244, 0x6a5656], fire: [0x8a1a0a, 0xe0501a, 0xff9a2a, 0xffe070], eyeCol: 0xffe070 },
  damne: { skin: 'damne', undead: 1, hair: 4, hairStyle: 'long', top: 'armure', topCol: 'black', pants: 'black', boots: 'black', eyeCol: 0x6aff9a, hat: 'crane', seed: 18 },
  arquebusier_damne: { skel: 1, bones: [0x2a2a34, 0x44444e, 0x62626e, 0x84848e], hat: 'tricorne', hatCol: 'black', topCol: 'black', eyeCol: 0x6aff9a },
  bourreau: { big: 1, skin: 'ghoul', undead: 1, hair: 0, hairStyle: 'chauve', top: 'haillons', topCol: 'black', pants: 'black', boots: 'black', hat: 'cagoule', hatCol: 'black', eyeCol: 0xff3a3a, seed: 19 },
  reine_sirenes: { big: 1, skin: 'drowned', undead: 1, hair: 6, hairStyle: 'long', top: 'vareuse', topCol: 'teal', pants: 'teal', boots: 'teal', hat: 'couronne', eyeCol: 0x9fffe8, seed: 20 },
  general_os: { skel: 1, big: 1, hat: 'morion', topCol: 'red', eyeCol: 0xff6a3a },
  docteur_corbeau: { big: 1, skin: 0, top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'bec', hatCol: 'black', cape: 'black', eyeCol: 0xff3a2a, seed: 21 },
  brasier: { golem: 1, rock: [0x2a0a06, 0x4a1a0e, 0x6a2a14, 0x8a3a1a, 0xa84a22], fire: [0xe0501a, 0xff9a2a, 0xffd860, 0xfff6c0], eyeCol: 0xfff6c0 },
  frere_fer: { big: 1, skin: 'zombie', undead: 1, hair: 0, hairStyle: 'chauve', beard: 2, top: 'armure', topCol: 'grey', pants: 'black', boots: 'black', hat: 'morion', eyeCol: 0xffe14a, seed: 22 },
  frere_rouille: { big: 1, skin: 'zombie', undead: 1, hair: 2, hairStyle: 'hirsute', beard: 1, top: 'armure', topCol: 'orange', pants: 'brown', boots: 'brown', eyeCol: 0xffe14a, seed: 23 },
  comte_vespere: { big: 1, skin: 'damne', undead: 1, hair: 4, hairStyle: 'long', top: 'capitaine', topCol: 'black', pants: 'black', boots: 'black', hat: 'capitaine', hatCol: 'black', cape: 'purple', eyeCol: 0xff3a6a, beard: 1, beardCol: 4, seed: 24 },
  // 0.8 : l'île de Libertalia
  epouvantail: { skin: 'ghoul', undead: 1, hunch: 1, hair: 5, hairStyle: 'hirsute', top: 'haillons', topCol: 'brown', pants: 'brown', boots: 'brown', hat: 'paille', eyeCol: 0xffa030, seed: 25 },
  coupe_jarret: { skin: 2, hair: 0, hairStyle: 'court', top: 'manteau', topCol: 'grey', pants: 'black', boots: 'black', hat: 'cagoule', hatCol: 'black', eyeCol: 0xffe14a, seed: 26 },
  contrebandier: { skin: 'zombie', undead: 1, hair: 2, hairStyle: 'queue', top: 'gilet', topCol: 'green', pants: 'brown', boots: 'brown', hat: 'bandana', hatCol: 'green', beard: 1, eyeCol: 0x9dff6a, seed: 27 },
  naufrageur: { skin: 3, hair: 4, hairStyle: 'hirsute', top: 'vareuse', topCol: 'orange', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'orange', beard: 2, eyeCol: 0xffd24a, seed: 28 },
  garde_maudit: { skin: 'drowned', undead: 1, hair: 4, hairStyle: 'queue', top: 'manteau', topCol: 'red', pants: 'white', boots: 'black', hat: 'tricorne', hatCol: 'black', eyeCol: 0x9fffe8, seed: 29 },
  goule_ecarlate: { skin: 'ghoul', undead: 1, hunch: 1, hair: 0, hairStyle: 'hirsute', top: 'haillons', topCol: 'red', pants: 'red', boots: 'red', eyeCol: 0xff3a3a, claws: 1, seed: 30 },
  ame_anselme: { big: 1, skin: 'ash', undead: 1, hair: 6, hairStyle: 'long', beard: 2, beardCol: 6, top: 'manteau', topCol: 'white', pants: 'black', boots: 'black', eyeCol: 0xffb03a, cape: 'red', seed: 41 }, // 1.0 : l'âme d'Anselme
  reine_mangrove: { big: 1, skin: 'drowned', undead: 1, hair: 4, hairStyle: 'long', top: 'vareuse', topCol: 'green', pants: 'green', boots: 'teal', hat: 'couronne', cape: 'green', eyeCol: 0x9dff6a, seed: 31 },
  capitaine_naufrageur: { big: 1, skin: 3, hair: 2, hairStyle: 'long', top: 'capitaine', topCol: 'orange', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black', beard: 2, beardCol: 2, eye: 'patch', eyeCol: 0xffb04a, seed: 32 },
  roi_sans_couronne: { skel: 1, big: 1, bones: [0x5a4a2a, 0x8a7444, 0xb89e62, 0xe0c88a], topCol: 'purple', cape: 'red', eyeCol: 0xffd24a },
};

export function whiteSheet(s) {
  if (!s.white) {
    const c = document.createElement('canvas'); c.width = s.cv.width; c.height = s.cv.height;
    const x = c.getContext('2d'); x.drawImage(s.cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff6ec'; x.fillRect(0, 0, c.width, c.height);
    s.white = c;
  }
  return s.white;
}

// ---------- armes tenues en main (pointent vers +x, poignée en (gx, gy)) ----------
const BLADES = {
  rust: [0x5a3a2a, 0x8a5a3a, 0xb07a52, 0xcfa078],
  steel: [0x4a4c5a, 0x7c8090, 0xb4b8c6, 0xeef0f8],
  gold: [0x5a5c6a, 0x8c90a0, 0xc4c8d6, 0xffffff],
  coral: [0x7a1e3a, 0xc23a5a, 0xff6a84, 0xffc0c8],
  bone: [0x6c6450, 0x9a9076, 0xc8bfa2, 0xeee6cc],
  dark: [0x1c1820, 0x34303c, 0x5a5668, 0x8a8698],
};
export function weaponSprite(kind, tint = 'steel') {
  const key = 'w' + kind + tint;
  let s = sheetCache.get(key);
  if (s) return s;
  let pb, gx, gy;
  if (kind === 'saber' || kind === 'bigsaber') {
    const L = kind === 'bigsaber' ? 22 : 15;
    pb = new PB(L + 2, 8); gx = 2; gy = 4;
    const Bl = BLADES[tint] || BLADES.steel;
    const hilt = tint === 'gold' || tint === 'coral' ? GOLDC : [0x3a2a1a, 0x5a3e24, 0x7a5432, 0x9a6c40];
    for (let x = 4; x < L + 1; x++) {
      const t = (x - 4) / (L - 3), curve = Math.round(t * t * 2.4);
      pb.set(x, 4 - curve, Bl[3]); pb.set(x, 5 - curve, Bl[2]);
      if (t < 0.85) pb.set(x, 6 - curve, Bl[1]);
    }
    pb.vl(3, 2, 6, hilt[2]); pb.set(3, 2, hilt[3]);
    pb.hl(0, 4, 3, 0x5a3420); pb.hl(0, 5, 3, 0x3a2214);
    pb.set(4, 6, hilt[1]); pb.set(4, 7, hilt[1]); pb.set(5, 7, hilt[1]);
    if (tint === 'coral') { pb.set(8, 3, 0xffe0e8); pb.set(12, 2, 0xffe0e8); }
  } else if (kind === 'pistol' || kind === 'blunder') {
    const big = kind === 'blunder';
    pb = new PB(big ? 15 : 12, 7); gx = 2; gy = 4;
    const W = [0x3a2214, 0x5a3820, 0x7a4f2c, 0x9c683a];
    const M = BLADES[tint === 'rust' ? 'rust' : 'steel'];
    pb.hl(4, 2, big ? 9 : 7, M[2]); pb.hl(4, 3, big ? 9 : 7, M[1]);
    if (big) { pb.vl(13, 1, 4, M[2]); pb.vl(14, 0, 6, M[1]); }
    pb.rect(1, 3, 4, 2, W[2]); pb.hl(1, 3, 4, W[3]); pb.rect(0, 4, 2, 3, W[1]);
    pb.set(4, 5, M[1]); pb.set(5, 4, W[1]);
  } else if (kind === 'axe') { // hache à double tranchant
    pb = new PB(18, 12); gx = 2; gy = 7;
    const Bl = BLADES[tint] || BLADES.steel;
    pb.hl(0, 7, 15, 0x5a3420); pb.hl(0, 8, 15, 0x3a2214);
    for (let y = 1; y <= 11; y++) { const w = 4 - Math.round(Math.abs(y - 6) * 0.45); for (let k = 0; k < w; k++) pb.set(13 + k, y, Bl[k === w - 1 ? 3 : 2]); pb.set(12, y, Bl[1]); }
    for (let y = 3; y <= 9; y++) pb.set(11, y, Bl[1]);
  } else if (kind === 'musket') {
    pb = new PB(20, 6); gx = 4; gy = 3;
    const W = [0x3a2214, 0x5a3820, 0x7a4f2c, 0x9c683a];
    pb.hl(6, 2, 13, BLADES.steel[2]); pb.hl(6, 3, 13, BLADES.steel[1]);
    pb.rect(0, 3, 8, 2, W[2]); pb.hl(0, 3, 8, W[3]); pb.rect(0, 4, 3, 2, W[1]);
  }
  pb.outline('auto');
  s = { cv: pb.toCanvas(), gx, gy, w: pb.w, h: pb.h };
  sheetCache.set(key, s);
  return s;
}

// portrait (tête et buste agrandis) pour les dialogues
export function portraitOf(sheet) {
  const c = document.createElement('canvas');
  c.width = sheet.fw; c.height = Math.round(sheet.fh * 0.78);
  c.getContext('2d').drawImage(sheet.cv, 0, 0, sheet.fw, c.height, 0, 0, sheet.fw, c.height);
  return c;
}

// petits chats du port (2 directions x 2 images)
export function catSheet(col) {
  const cols = col === 'black' ? [0x1a1620, 0x2a2430, 0x3e3646, 0x5a5066] : col === 'white' ? [0x8a8478, 0xc4bdae, 0xe8e2d6, 0xfaf6ee] : [0x6a3410, 0xa85a20, 0xe08a3a, 0xf6b870];
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const pb = new PB(14, 11);
    const step = f % 2;
    pb.ellipse(6, 6, 4.5, 2.6, cols[2]); pb.hl(3, 4, 6, cols[3]);
    pb.disc(10.5, 4, 2.4, cols[2]); pb.set(9, 1, cols[1]); pb.set(12, 1, cols[1]); pb.set(9, 2, cols[2]); pb.set(12, 2, cols[2]);
    pb.set(11, 4, 0x2a6a3a); pb.set(12, 4, 0x141014);
    for (const [x, o] of [[3, step], [5, 1 - step], [7, step], [9, 1 - step]]) pb.vl(x, 8, 2 - (f >= 2 ? 0 : o), cols[1]);
    pb.line(1, 5, 0, 1 + step, cols[1]);
    if (col === 'orange') { pb.set(5, 5, cols[1]); pb.set(7, 5, cols[1]); }
    pb.outline('auto');
    frames.push(pb.toCanvas());
  }
  return frames;
}
