// 2.3 : les images importées dans LStudio. Chacune devient un sprite, pixel pour pixel (aucun lissage, rien de généré) :
//  - 'image:<id>' dans les sprites du décor : les décors « image » du document la montrent ;
//  - une image peut aussi « habiller » un élément du jeu (un tonneau, une lanterne…) : tous ses exemplaires, ceux du jeu et
//    ceux de LStudio, prennent alors ce dessin ; le type ne change pas, rien d'autre ne bouge.
// Le jeu l'installe une fois, au démarrage ; l'éditeur la réinstalle à chaque changement d'image.
import { decodeAsset } from '../../shared/studio-world.js';

// les éléments qu'on n'habille pas : ils ne sont pas dessinés comme un sprite de décor (un bâtiment, une maison de joueur,
// le volcan, le phare et son faisceau, les navires)
export const NOT_REPLACEABLE = new Set(['cite', 'propriete', 'volcan', 'lighthouse', 'ship', 'house', 'tavern', 'forge', 'home', 'image']);
export function assetSprite(a) {
  const px = decodeAsset(a); if (!px) return null;
  const cv = document.createElement('canvas'); cv.width = a.w; cv.height = a.h;
  cv.getContext('2d').putImageData(new ImageData(px, a.w, a.h), 0, 0);
  return { cv, w: a.w, h: a.h, ax: a.w >> 1, ay: a.h - 2, asset: a.id }; // le pied au milieu du bas, comme les sprites du jeu
}
export function installStudioAssets(env, doc) {
  if (!Object.prototype.hasOwnProperty.call(env, '__orig')) Object.defineProperty(env, '__orig', { value: {}, enumerable: false, writable: true });
  for (const [t, L] of Object.entries(env.__orig)) env[t] = L; // on défait les habillages d'avant
  env.__orig = {};
  for (const k of Object.keys(env)) if (k.startsWith('image:')) delete env[k];
  const changed = new Set();
  for (const a of (doc && doc.assets) || []) {
    const s = assetSprite(a); if (!s) continue;
    env['image:' + a.id] = [s];
    if (a.remplace && env[a.remplace] && !NOT_REPLACEABLE.has(a.remplace) && !env.__orig[a.remplace]) { env.__orig[a.remplace] = env[a.remplace]; env[a.remplace] = [s]; changed.add(a.remplace); }
  }
  return changed;
}
// la liste des sprites d'un décor (son type, ou son image)
export const envKey = (p) => (p.type === 'image' ? 'image:' + (p.asset || '') : p.type);
