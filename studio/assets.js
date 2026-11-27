// LStudio — les images importées (lot 3). On importe son propre pixel art (PNG, GIF, WebP) : LStudio le vérifie (au plus
// 256 × 256 pixels, au plus 255 couleurs, des pixels opaques ou transparents), le ramène à l'échelle 1 s'il a été agrandi,
// et le range dans le document. Rien n'est dessiné ni retouché à votre place. Une image se pose comme un décor, ou
// « habille » un élément du jeu (tous ses exemplaires prennent ce dessin). La remplacer garde son identifiant : les décors
// qui s'en servent suivent.
import { encodeAsset, ASSET_MAX } from '../shared/studio-world.js';

// ---------------------------------------------------------------- l'analyse (sans le navigateur : les tests s'en servent)
// rgba : les pixels d'une image ; renvoie l'image ramenée à l'échelle 1 et ce qu'il faut en dire
export function analyzeImage(rgba, w, h) {
  const notes = [];
  if (w > ASSET_MAX * 8 || h > ASSET_MAX * 8) throw new Error(`L’image fait ${w} × ${h} pixels : bien trop grande pour un décor de pixel art.`);
  // agrandie ? (chaque pixel d'origine devenu un carré de k × k pixels identiques)
  const same = (a, b) => (rgba[a * 4 + 3] < 128 && rgba[b * 4 + 3] < 128) || (rgba[a * 4] === rgba[b * 4] && rgba[a * 4 + 1] === rgba[b * 4 + 1] && rgba[a * 4 + 2] === rgba[b * 4 + 2] && (rgba[a * 4 + 3] >= 128) === (rgba[b * 4 + 3] >= 128));
  let k = 1;
  for (const s of [8, 6, 5, 4, 3, 2]) {
    if (w % s || h % s || w / s < 2 || h / s < 2) continue;
    let ok = true;
    for (let y = 0; y < h && ok; y++) for (let x = 0; x < w && ok; x++) if (!same(y * w + x, Math.floor(y / s) * s * w + Math.floor(x / s) * s)) ok = false;
    if (ok) { k = s; break; }
  }
  let px = rgba, W1 = w, H1 = h;
  if (k > 1) {
    W1 = w / k; H1 = h / k; px = new Uint8ClampedArray(W1 * H1 * 4);
    for (let y = 0; y < H1; y++) for (let x = 0; x < W1; x++) { const a = (y * k * w + x * k) * 4, b = (y * W1 + x) * 4; for (let c = 0; c < 4; c++) px[b + c] = rgba[a + c]; }
    notes.push(`Agrandie ${k} fois : ramenée à l’échelle du jeu (${W1} × ${H1} pixels, un pixel de l’image = un pixel du jeu).`);
  }
  if (W1 > ASSET_MAX || H1 > ASSET_MAX) throw new Error(`L’image fait ${W1} × ${H1} pixels : au plus ${ASSET_MAX} × ${ASSET_MAX} (un décor de ${ASSET_MAX / 16} × ${ASSET_MAX / 16} cases).`);
  let semi = 0; for (let i = 0; i < W1 * H1; i++) { const a = px[i * 4 + 3]; if (a > 0 && a < 255) semi++; }
  if (semi) notes.push(`${semi} pixel(s) à demi transparents : chacun devient opaque ou transparent (le jeu ne mélange pas les pixels).`);
  const enc = encodeAsset(px, W1, H1); // (lève une erreur au-delà de 255 couleurs)
  if (enc.pal.length > 48) notes.push(`${enc.pal.length} couleurs : c’est beaucoup pour du pixel art (les sprites du jeu en ont rarement plus de 30).`);
  if (W1 % 16 && H1 > 16) notes.push(`Largeur de ${W1} pixels : une case du jeu fait 16 pixels.`);
  return { enc, k, notes, w: W1, h: H1 };
}
// ---------------------------------------------------------------- lire un fichier (navigateur)
export async function readImageFile(file) {
  if (!/^image\/(png|gif|webp)$/.test(file.type)) throw new Error('Choisissez une image PNG, GIF ou WebP (le pixel art s’enregistre sans perte dans ces formats ; pas de JPEG).');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Image illisible.')); i.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight;
    if (w > ASSET_MAX * 8 || h > ASSET_MAX * 8) throw new Error(`L’image fait ${w} × ${h} pixels : bien trop grande pour un décor de pixel art.`);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; x.drawImage(img, 0, 0);
    return analyzeImage(x.getImageData(0, 0, w, h).data, w, h);
  } finally { URL.revokeObjectURL(url); }
}
export const newAssetId = () => 'img' + Date.now().toString(36) + Math.floor(Math.random() * 46656).toString(36);
// un aperçu agrandi (pixels nets) sur un damier, pour la fenêtre d'import
export function bigPreview(spr, scale = 4) {
  const cv = document.createElement('canvas'); cv.width = spr.w * scale; cv.height = spr.h * scale;
  const x = cv.getContext('2d'); for (let y = 0; y < cv.height; y += 8) for (let xx = 0; xx < cv.width; xx += 8) { x.fillStyle = ((xx + y) / 8) % 2 ? '#2a3140' : '#1e2430'; x.fillRect(xx, y, 8, 8); }
  x.imageSmoothingEnabled = false; x.drawImage(spr.cv, 0, 0, cv.width, cv.height);
  cv.style.maxWidth = '100%'; cv.style.imageRendering = 'pixelated'; return cv;
}
