// LStudio, côté jeu : charger le monde écrit dans l'éditeur, avant de générer la carte.
//  - aperçu (?apercu=1) : le document envoyé par LStudio dans ce navigateur (jeu solo, sauvegardes à part) ;
//  - sinon, le monde publié : monde-studio.json, à côté de la page (GitHub Pages) ;
//  - sinon, celui embarqué dans la page au moment de sa fabrication (la page claude.ai), ou aucun.
// Un document illisible est ignoré (le jeu démarre sur son monde d'origine) : jamais de monde à moitié appliqué.
import { setStudioDoc, normalizeDoc } from '../shared/studio-world.js';

export const APERCU_KEY = 'lstudio:apercu';
export async function loadStudioWorld() {
  const q = new URLSearchParams(location.search);
  if (q.get('apercu') === '1') {
    try {
      const raw = localStorage.getItem(APERCU_KEY);
      if (raw) { const d = normalizeDoc(JSON.parse(raw)); setStudioDoc(d); return { mode: 'apercu', doc: d }; }
    } catch (e) { console.warn('LStudio : aperçu illisible', e); }
  }
  try {
    const pages = /github\.io$/.test(location.hostname) || location.hostname === '127.0.0.1' || location.hostname === 'localhost';
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null, t = ac && setTimeout(() => ac.abort(), pages ? 15000 : 3000); // 2.4 : sur GitHub Pages, on attend le monde publié (un monde lourd met du temps à venir) ; ailleurs (claude.ai), le fichier n'est pas joignable : trois secondes
    const r = await fetch('monde-studio.json', { cache: 'no-cache', signal: ac ? ac.signal : undefined }); if (t) clearTimeout(t);
    if (r.ok) { const d = normalizeDoc(await r.json()); setStudioDoc(d); return { mode: 'publie', doc: d }; }
  } catch (e) { /* pas de fichier publié à côté de la page */ }
  // eslint-disable-next-line no-undef
  const emb = typeof __MM_STUDIO__ !== 'undefined' ? __MM_STUDIO__ : null;
  if (emb) { try { const d = normalizeDoc(emb); setStudioDoc(d); return { mode: 'embarque', doc: d }; } catch (e) { /* */ } }
  setStudioDoc(null);
  return { mode: 'aucun', doc: null };
}
