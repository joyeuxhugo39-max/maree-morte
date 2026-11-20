// Lot 4 : vérifier une cinématique contre ce que le jeu sait VRAIMENT dessiner et jouer. Rien n'est supposé :
// les costumes contre la feuille de personnages, les sons contre Sfx.play, les thèmes contre le compositeur, les icônes
// contre leur atlas, les lieux contre le monde. Les assets prévus pour plus tard (def.needs) sont listés comme manquants
// tant qu'ils n'existent pas, avec ce qui les remplace en attendant.
import { CINEMAS, THEMES, SILAS_PITCH, SILAS_AGAIN } from '../shared/data/cinemas.js';
import { NPCS } from '../shared/data/npcs.js';
import { SFX_NAMES } from './audio.js';
import { STYLES } from './music.js';
import { hasIcon } from './render/sprites-items.js';
import { LOOK_PARTS, CLOTH_KEYS } from './render/sprites-chars.js';

export const VERBS = new Set(['bars', 'fade', 'title', 'sub', 'say', 'grade', 'vignette', 'view', 'cam', 'follow', 'zoom', 'shake', 'spawn', 'remove', 'walk', 'face', 'sit', 'gesture', 'emo', 'coin', 'item', 'theme', 'sfx', 'duck', 'talk', 'release']);
export const GESTURES = new Set(['wave', 'dance', 'flip', 'reach', 'atk', 'coin']);
export const EMOS = new Set(['!', '?', '…', '♪', 'rire', 'colere', 'coeur', 'sueur']);
export const MINIS = new Set(['plan', 'uniforme', 'cle', 'piece']); // les accessoires dessinés par Renderer.drawMini
const LINES = { pitch: SILAS_PITCH, again: SILAS_AGAIN };

function checkLook(look, where, out) {
  if (!look) return out.push(`${where} : aucun costume`);
  if (look.top && !LOOK_PARTS.top.includes(look.top)) out.push(`${where} : haut « ${look.top} » inconnu de la feuille de personnages`);
  if (look.hat && !LOOK_PARTS.hat.includes(look.hat)) out.push(`${where} : chapeau « ${look.hat} » inconnu`);
  if (look.hairStyle && !LOOK_PARTS.hairStyle.includes(look.hairStyle)) out.push(`${where} : coiffure « ${look.hairStyle} » inconnue`);
  for (const k of ['topCol', 'hatCol']) if (look[k] && !CLOTH_KEYS.includes(look[k])) out.push(`${where} : couleur « ${look[k]} » inconnue`);
}
// renvoie { errors: [...] (le script est faux), missing: [...] (un asset attendu n'existe pas encore) }
export function checkCinema(id, world = null) {
  const def = CINEMAS[id], errors = [], missing = [];
  if (!def) return { errors: [`scène « ${id} » inconnue`], missing };
  const actors = new Set(Object.keys(def.actors || {}));
  for (const [aid, a] of Object.entries(def.actors || {})) {
    if (a.npc) { if (!NPCS[a.npc]) errors.push(`acteur ${aid} : PNJ « ${a.npc} » inconnu`); else checkLook(NPCS[a.npc].look, `acteur ${aid}`, errors); if (world && !world.npcs.some((n) => n.id === a.npc)) errors.push(`acteur ${aid} : « ${a.npc} » n'est placé nulle part dans le monde`); }
    else checkLook(a.look, `acteur ${aid}`, errors);
  }
  if (def.room && world && !world.rooms.some((r) => r.name === def.room)) errors.push(`pièce « ${def.room} » introuvable dans le monde`);
  let last = -1, locked = true;
  for (const s of def.steps) {
    const at = `${s.at.toFixed(1)} s ${s.do}`;
    if (!VERBS.has(s.do)) { errors.push(`${at} : verbe inconnu`); continue; }
    if (s.at < last - 1e-9) errors.push(`${at} : étapes dans le désordre`);
    last = s.at;
    if (s.do === 'spawn') actors.add(s.id);
    const ref = (r) => { if (typeof r === 'string' && r !== 'player' && !actors.has(r)) errors.push(`${at} : acteur « ${r} » inconnu`); };
    ref(s.id); ref(s.who); ref(s.actor);
    if (s.to && typeof s.to === 'object' && s.to.actor) ref(s.to.actor);
    if (s.do === 'sfx' && !SFX_NAMES.has(s.name)) missing.push({ kind: 'son', id: s.name, where: at, fallback: 'silence' });
    if (s.do === 'theme' && s.name && !STYLES[s.name]) missing.push({ kind: 'musique', id: s.name, where: at, fallback: 'silence' });
    if (s.do === 'item' && (s.mini ? !MINIS.has(s.mini) : !hasIcon(s.icon))) missing.push({ kind: s.mini ? 'accessoire' : 'icône', id: s.mini || s.icon, where: at, fallback: 'map' });
    if ((s.do === 'gesture' || s.do === 'coin') && !GESTURES.has(s.g || 'coin')) errors.push(`${at} : geste « ${s.g} » inconnu`);
    if (s.do === 'emo' && !EMOS.has(s.e)) errors.push(`${at} : émotion « ${s.e} » inconnue`);
    if (s.do === 'talk') { if (!LINES[s.lines]) errors.push(`${at} : conversation « ${s.lines} » introuvable`); if (!NPCS[s.npc]) errors.push(`${at} : PNJ « ${s.npc} » inconnu`); }
    if (s.do === 'release') locked = false;
  }
  if (locked) errors.push('la scène ne rend jamais la main (aucune étape « release »)');
  const lockEnd = (def.steps.find((s) => s.do === 'talk' || s.do === 'release') || { at: 0 }).at;
  if (lockEnd > (def.maxDur || 30)) errors.push(`le récit dure ${lockEnd} s avant de rendre la main, plus que sa protection (${def.maxDur} s)`);
  for (const n of def.needs || []) { // ce que la scène attend d'un lot à venir : manquant tant que ça n'existe pas
    const there = n.kind === 'icône' ? hasIcon(n.id) : n.kind === 'lieu' ? !!(world && world.rooms.some((r) => r.key === n.id || r.name === n.id)) : n.kind === 'musique' ? !!STYLES[n.id] : false;
    if (!there) missing.push({ kind: n.kind, id: n.id, where: `prévu au lot ${n.lot}`, fallback: n.fallback });
  }
  for (const s of def.steps) if (s.do === 'theme' && s.name && THEMES[s.name] && !THEMES[s.name].file) missing.push({ kind: 'enregistrement', id: s.name, where: 'musique', fallback: 'musique générée par le code (client/music.js)' });
  return { errors, missing };
}
export function checkAll(world = null) { return Object.fromEntries(Object.keys(CINEMAS).map((id) => [id, checkCinema(id, world)])); }
