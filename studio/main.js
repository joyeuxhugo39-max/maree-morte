// LStudio — le studio de création de Marée Morte. Démarrage, outils, panneaux, sauvegardes, aperçu, publication.
import { generateWorld, PROPS, ZONES, canStand } from '../shared/world.js';
import { T } from '../shared/constants.js';
import { emptyDoc, normalizeDoc, checkStudio, key, unkey, BUILDING_PROPS, TILE_NAMES } from '../shared/studio-world.js';
import { Renderer } from '../client/render/renderer.js';
import { MINI_COL } from '../client/render/terrain.js';
import { Editor } from './editor.js';
import { MapView, ZOOMS, zoneColor } from './view.js';
import { CATEGORIES, HORS_BIBLIOTHEQUE, nomDe, SOLS, STYLES_BATIMENT } from './catalogue.js';
import { store, stats, github, guessRepo, PUB_PATH } from './store.js';

const $ = (id) => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const APERCU_KEY = 'lstudio:apercu';
const S = { tool: 'select', armed: null, armedV: 0, paintKind: 'sol', paintVal: { sol: 'SAND', regions: 1, collisions: 1, navigation: 1 }, brush: 1, erase: false, activeLayer: 'decors', clip: null, dirty: false, lastSaved: null, qc: null, space: false };
let ED, VIEW, R, WORLD;

// ------------------------------------------------------------------ messages
function toast(msg, kind = '') { const e = h('div', { class: 'toast ' + kind }, msg); $('toasts').append(e); setTimeout(() => e.remove(), kind === 'err' ? 6000 : 3200); }
function modal(title, body, actions = [{ label: 'Fermer' }]) {
  $('m-title').textContent = title; const B = $('m-body'); B.innerHTML = ''; if (typeof body === 'string') B.innerHTML = body; else B.append(body);
  const A = $('m-actions'); A.innerHTML = '';
  return new Promise((ok) => {
    const close = (v) => { $('modal').classList.add('hidden'); ok(v); };
    $('m-close').onclick = () => close(null);
    for (const a of actions) A.append(h('button', { class: a.cls || '', on: { click: async () => { if (a.run) { const r = await a.run(); if (r === false) return; } close(a.value ?? a.label); } } }, a.label));
    $('modal').classList.remove('hidden');
  });
}
const confirmBox = (title, text, yes = 'Confirmer', cls = 'primary') => modal(title, `<p>${text}</p>`, [{ label: 'Annuler', value: false }, { label: yes, value: true, cls }]);

// ------------------------------------------------------------------ démarrage
async function boot() {
  const msg = (t, p) => { $('boot-msg').textContent = t; $('boot-bar').style.width = p + '%'; };
  msg('Génération du monde de Marée Morte…', 10); await frame(); await sleep(30);
  WORLD = generateWorld(7, { studio: null }); // le vrai monde du jeu, sans aucune modification de LStudio
  msg('Préparation des décors…', 45); await frame(); await sleep(30);
  R = new Renderer(document.createElement('canvas'), WORLD);
  msg('Ouverture du brouillon…', 70); await frame();
  let doc = null, from = '';
  try { const b = await store.get('brouillon'); if (b && b.doc) { doc = normalizeDoc(b.doc); from = 'brouillon'; S.lastSaved = b.date; } } catch (e) { toast('Brouillon illisible : on repart du monde publié. ' + e.message, 'err'); }
  if (!doc) { try { const r = await fetch('monde-studio.json', { cache: 'no-cache' }); if (r.ok) { doc = normalizeDoc(await r.json()); from = 'publié'; } } catch (e) { /* */ } }
  if (!doc) { doc = emptyDoc('Mon monde'); from = 'neuf'; }
  ED = new Editor(WORLD, doc, PROPS);
  msg('Mise en place…', 90); await frame();
  VIEW = new MapView($('map'), ED, R);
  $('boot').classList.add('hidden'); $('app').classList.remove('hidden');
  VIEW.resize(); window.addEventListener('resize', () => VIEW.resize());
  wire();
  ED.on((ch) => { if (ch.dirty) markDirty(); if (ch.layers) renderLayers(); if (ch.reperes) renderReperes(); schedulePanel(); });
  renderAll();
  if (ED.report.ecartes.length) toast(`${ED.report.ecartes.length} modification(s) du brouillon n’ont pas pu être appliquées : voir « Contrôle ».`, 'warn');
  toast(from === 'brouillon' ? 'Brouillon rouvert : vous reprenez où vous en étiez.' : from === 'publié' ? 'Nouveau brouillon, à partir du monde publié.' : 'Nouveau brouillon : le monde d’origine du jeu.');
  setSaveState();
  window.LS = { ED, VIEW, S, store }; // pour les vérifications automatiques
}

// ------------------------------------------------------------------ l'état de l'enregistrement
let saveTimer = null, autoVersionAt = Date.now();
function markDirty() { S.dirty = true; setSaveState(); clearTimeout(saveTimer); saveTimer = setTimeout(() => autosave(), 1200); }
async function autosave() {
  try {
    ED.doc.meta.modifie = new Date().toISOString();
    await store.put('brouillon', { doc: ED.doc, date: ED.doc.meta.modifie });
    S.dirty = false; S.lastSaved = ED.doc.meta.modifie; setSaveState();
    if (Date.now() - autoVersionAt > 10 * 60 * 1000) { autoVersionAt = Date.now(); await store.addVersion('auto', 'Enregistrement automatique', ED.doc); }
  } catch (e) { toast('Impossible d’enregistrer le brouillon dans ce navigateur : ' + e.message + ' — exportez votre travail (menu ☰).', 'err'); }
}
function setSaveState() {
  const e = $('save-state');
  if (S.dirty) { e.textContent = '● Modifications en cours d’enregistrement…'; e.className = 'state dirty'; return; }
  e.textContent = S.lastSaved ? `Brouillon enregistré à ${new Date(S.lastSaved).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : 'Brouillon';
  e.className = 'state';
}
window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
async function saveVersion(nom) { clearTimeout(saveTimer); await autosave(); const id = await store.addVersion('manuel', nom || `Version du ${new Date().toLocaleString('fr-FR')}`, ED.doc); toast('Version enregistrée.'); return id; }
// remplacer le brouillon (restauration, import, nouveau) : jamais sans garder une copie de l'actuel
async function replaceDraft(doc, why) {
  clearTimeout(saveTimer);
  await store.addVersion('copie', `Avant : ${why}`, ED.doc);
  doc.meta = { ...(doc.meta || {}), modifie: new Date().toISOString() };
  await store.put('brouillon', { doc, date: doc.meta.modifie });
  S.dirty = false; location.reload();
}

// ------------------------------------------------------------------ les outils et la souris
function setTool(t) {
  S.tool = t; for (const b of document.querySelectorAll('#tools button')) b.classList.toggle('on', b.dataset.tool === t);
  if (t !== 'place') { VIEW.ghost = null; } if (t !== 'paint') VIEW.brush = null;
  if (t === 'paint') showTab('left', 'paint');
  $('map').style.cursor = t === 'pan' ? 'grab' : t === 'select' ? 'default' : 'crosshair'; VIEW.dirty = true; status();
}
function arm(type, v = 0) { S.armed = type; S.armedV = v; setTool('place'); renderLib(); toast(`« ${nomDe(type)} » : cliquez sur la carte pour le poser (Échap pour arrêter).`); }
const cellAt = (wx, wy) => [Math.floor(wx / 16), Math.floor(wy / 16)];
function brushCells(tx, ty) { const n = S.brush, o = Math.floor((n - 1) / 2), out = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push([tx - o + x, ty - o + y]); return out; }
function paintAt(tx, ty) {
  const v = S.erase ? undefined : S.paintKind === 'sol' ? S.paintVal.sol : S.paintKind === 'regions' ? S.paintVal.regions : S.paintVal[S.paintKind];
  ED.paint(S.paintKind, brushCells(tx, ty), v);
}
function line(x0, y0, x1, y1, fn) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) fn(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)); }
function selected() { return VIEW.sel.filter((r) => { const p = ED.propOf(r); return p && WORLD.props.includes(p); }); }
function select(refs) { VIEW.sel = refs; VIEW.dirty = true; renderProps(); }
const refEq = (a, b) => a.k === b.k && (a.k === 'd' ? a.uid === b.uid : a.id === b.id);
function wireMap() {
  const cv = $('map'); let drag = null;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { e.preventDefault(); VIEW.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1 : -1); zoomLabel(); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => {
    cv.focus(); cv.setPointerCapture(e.pointerId);
    const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY), [tx, ty] = cellAt(wx, wy);
    if (e.button === 1 || e.button === 2 && S.tool !== 'paint' || S.tool === 'pan' || S.space) { drag = { k: 'pan', sx: e.offsetX, sy: e.offsetY, cx: VIEW.cam.x, cy: VIEW.cam.y }; cv.style.cursor = 'grabbing'; if (e.button === 2 && S.tool === 'place') { S.armed = null; setTool('select'); renderLib(); } return; }
    if (S.tool === 'place' && S.armed) { placeArmed(tx, ty, e.altKey ? wx : null, e.altKey ? wy : null); return; }
    if (S.tool === 'paint') { const er = S.erase; if (e.button === 2) S.erase = true; ED.begin(paintLabel()); paintAt(tx, ty); drag = { k: 'paint', tx, ty, er }; return; }
    // la sélection
    const p = VIEW.pick(wx, wy);
    if (p && !ED.locked(p)) {
      const ref = ED.refOf(p), has = VIEW.sel.some((r) => refEq(r, ref));
      if (e.shiftKey) { select(has ? VIEW.sel.filter((r) => !refEq(r, ref)) : [...VIEW.sel, ref]); return; }
      if (!has) select([ref]);
      drag = { k: 'move', wx, wy, dxT: 0, dyT: 0, dxP: 0, dyP: 0, started: false };
      return;
    }
    if (p && ED.locked(p)) toast('Cet élément est verrouillé (ou sa couche l’est).', 'warn');
    drag = { k: 'marquee', wx, wy, add: e.shiftKey }; VIEW.marquee = { x0: wx, y0: wy, x1: wx, y1: wy };
  });
  cv.addEventListener('pointermove', (e) => {
    const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY), [tx, ty] = cellAt(wx, wy);
    S.mouse = [tx, ty];
    if (!drag) {
      if (S.tool === 'select') { const p = VIEW.pick(wx, wy); if (p !== VIEW.hover) { VIEW.hover = p; VIEW.dirty = true; } }
      if (S.tool === 'place' && S.armed) ghostAt(tx, ty, e.altKey ? wx : null, e.altKey ? wy : null);
      if (S.tool === 'paint') { const n = S.brush, o = Math.floor((n - 1) / 2); VIEW.brush = { x: tx - o, y: ty - o, n, col: S.erase ? '#ff9a9a' : '#ffffff' }; VIEW.dirty = true; }
      status(); return;
    }
    if (drag.k === 'pan') { const z = VIEW.cam.z; VIEW.cam.x = drag.cx - (e.offsetX - drag.sx) / z; VIEW.cam.y = drag.cy - (e.offsetY - drag.sy) / z; VIEW.clamp(); VIEW.dirty = true; return; }
    if (drag.k === 'paint') { line(drag.tx, drag.ty, tx, ty, (x, y) => paintAt(x, y)); drag.tx = tx; drag.ty = ty; const n = S.brush, o = Math.floor((n - 1) / 2); VIEW.brush = { x: tx - o, y: ty - o, n, col: S.erase ? '#ff9a9a' : '#fff' }; return; }
    if (drag.k === 'marquee') { VIEW.marquee.x1 = wx; VIEW.marquee.y1 = wy; VIEW.dirty = true; return; }
    if (drag.k === 'move') {
      // par cases entières ; avec Alt, au pixel près
      const dx = wx - drag.wx, dy = wy - drag.wy;
      let nT = [Math.round(dx / 16), Math.round(dy / 16)], nP = [0, 0];
      if (e.altKey) { nT = [0, 0]; nP = [Math.round(dx), Math.round(dy)]; }
      const ddT = [nT[0] - drag.dxT, nT[1] - drag.dyT], ddP = [nP[0] - drag.dxP, nP[1] - drag.dyP];
      if (ddT[0] || ddT[1] || ddP[0] || ddP[1]) { if (!drag.started) { ED.begin('Déplacer'); drag.started = true; } ED.move(selected(), ddT[0], ddT[1], ddP[0], ddP[1]); drag.dxT = nT[0]; drag.dyT = nT[1]; drag.dxP = nP[0]; drag.dyP = nP[1]; }
    }
  });
  const up = () => {
    if (!drag) return;
    if (drag.k === 'paint') { ED.end(); if (drag.er !== undefined) S.erase = drag.er; renderPaint(); }
    if (drag.k === 'move' && drag.started) ED.end();
    if (drag.k === 'marquee') { const m = VIEW.marquee; VIEW.marquee = null; const found = VIEW.inRect(m.x0, m.y0, m.x1, m.y1).map((p) => ED.refOf(p)); if (Math.abs(m.x1 - m.x0) > 3 || Math.abs(m.y1 - m.y0) > 3) select(drag.add ? [...VIEW.sel, ...found.filter((f) => !VIEW.sel.some((r) => refEq(r, f)))] : found); else if (!drag.add) select([]); }
    if (drag.k === 'pan') $('map').style.cursor = S.tool === 'pan' ? 'grab' : S.tool === 'select' ? 'default' : 'crosshair';
    drag = null; VIEW.dirty = true;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { VIEW.hover = null; VIEW.brush = null; if (S.tool === 'place') VIEW.ghost = null; VIEW.dirty = true; });
  // glisser-déposer depuis la bibliothèque
  cv.addEventListener('dragover', (e) => { e.preventDefault(); const t = e.dataTransfer.types.includes('text/lstudio') ? S.dragType : null; if (!t) return; const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY); const [tx, ty] = cellAt(wx, wy); S.armed = t; S.armedV = 0; ghostAt(tx, ty); });
  cv.addEventListener('drop', (e) => { e.preventDefault(); const t = S.dragType; if (!t) return; const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY), [tx, ty] = cellAt(wx, wy); S.armed = t; placeArmed(tx, ty); VIEW.ghost = null; S.dragType = null; if (S.tool !== 'place') S.armed = null; });
}
function ghostAt(tx, ty, wx = null, wy = null) {
  const type = S.armed; if (!type) return;
  const d = { type, v: S.armedV, tx, ty, x: 0, y: 0 };
  const isB = BUILDING_PROPS.has(type);
  const fake = { type, v: S.armedV, tx, ty, w: isB ? 5 : undefined, h: isB ? 4 : undefined, door: isB ? 2 : undefined, style: isB ? 'maison' : undefined };
  const s = VIEW.spr(fake);
  fake.x = isB ? tx * 16 + 8 + 5 * 8 - 8 : (wx != null ? Math.round(wx) : tx * 16 + 8); fake.y = isB ? ty * 16 + 14 + 4 * 16 - 14 : (wy != null ? Math.round(wy) : ty * 16 + 14);
  VIEW.ghost = { spr: s, x: fake.x, y: fake.y, tx, ty, w: isB ? 5 : 1, h: isB ? 4 : 1, ok: tx >= 0 && ty >= 0 && tx < WORLD.W && ty < WORLD.H };
  VIEW.dirty = true; void d;
}
function placeArmed(tx, ty, wx = null, wy = null) {
  if (tx < 0 || ty < 0 || tx >= WORLD.W || ty >= WORLD.H) return toast('Hors de la carte.', 'warn');
  const L = ED.layer(S.activeLayer); if (!L || L.origine) S.activeLayer = 'decors';
  if (ED.layer(S.activeLayer) && ED.layer(S.activeLayer).verrou) return toast('La couche active est verrouillée.', 'warn');
  const d = ED.placeDecor(S.armed, tx, ty, { v: S.armedV, couche: S.activeLayer });
  if (wx != null) ED.change({ k: 'd', uid: d.uid }, { dx: Math.round(wx - (tx * 16 + 8)), dy: Math.round(wy - (ty * 16 + 14)) });
  select([{ k: 'd', uid: d.uid }]);
}
const paintLabel = () => (S.erase ? 'Gommer ' : 'Peindre ') + { sol: 'le sol', regions: 'les régions', collisions: 'les collisions', navigation: 'la navigation' }[S.paintKind];

// ------------------------------------------------------------------ le clavier
function wireKeys() {
  window.addEventListener('keydown', (e) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox';
    if (!$('modal').classList.contains('hidden')) { if (e.key === 'Escape') $('m-close').click(); return; }
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); saveVersion(); return; }
    if (typing) return;
    if (ctrl && e.key.toLowerCase() === 'z') { e.preventDefault(); const l = e.shiftKey ? ED.redo() : ED.undo(); if (l) toast((e.shiftKey ? 'Rétabli : ' : 'Annulé : ') + l); return; }
    if (ctrl && e.key.toLowerCase() === 'y') { e.preventDefault(); const l = ED.redo(); if (l) toast('Rétabli : ' + l); return; }
    if (ctrl && e.key.toLowerCase() === 'c') { copySel(); return; }
    if (ctrl && e.key.toLowerCase() === 'x') { if (copySel()) ED.remove(selected()); select([]); return; }
    if (ctrl && e.key.toLowerCase() === 'v') { pasteAt(); return; }
    if (ctrl && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return; }
    if (ctrl && e.key.toLowerCase() === 'a') { e.preventDefault(); return; }
    if (e.key === ' ') { S.space = true; $('map').style.cursor = 'grab'; return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { const s = selected(); if (s.length) { ED.remove(s); select([]); toast(`${s.length} élément(s) supprimé(s) (Ctrl+Z pour annuler).`); } return; }
    if (e.key === 'Escape') { if (S.tool === 'place') { S.armed = null; setTool('select'); renderLib(); } else select([]); return; }
    if (e.key.startsWith('Arrow')) { const s = selected(); if (!s.length) { const k = e.shiftKey ? 160 : 48; VIEW.cam.x += e.key === 'ArrowLeft' ? -k : e.key === 'ArrowRight' ? k : 0; VIEW.cam.y += e.key === 'ArrowUp' ? -k : e.key === 'ArrowDown' ? k : 0; VIEW.clamp(); VIEW.dirty = true; return; } e.preventDefault(); const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (e.altKey) ED.move(s, 0, 0, d[0], d[1]); else ED.move(s, d[0], d[1]); return; }
    const k = e.key.toLowerCase();
    if (k === 'v') setTool('select'); else if (k === 'p') { if (S.armed) setTool('place'); else showTab('left', 'lib'); } else if (k === 'b') setTool('paint'); else if (k === 'h') setTool('pan');
    else if (k === 'm') { const s = selected(); if (s.length) { ED.begin('Miroir'); for (const r of s) { const d = ED.describe(r); ED.change(r, { miroir: !d.miroir }); } ED.end(); } }
    else if (k === 'l') { const s = selected().filter((r) => r.k === 'd'); if (s.length) { ED.begin('Verrouiller'); for (const r of s) { const d = ED.describe(r); ED.change(r, { verrou: !d.verrou }); } ED.end(); renderProps(); } }
    else if (k === ']' || k === 'pagedown') variant(+1); else if (k === '[' || k === 'pageup') variant(-1);
    else if (k === '+' || k === '=') { VIEW.zoomAt($('map').clientWidth / 2, $('map').clientHeight / 2, 1); zoomLabel(); } else if (k === '-') { VIEW.zoomAt($('map').clientWidth / 2, $('map').clientHeight / 2, -1); zoomLabel(); }
    else if (k === 'f') { const s = selected(); if (s.length) { const p = ED.propOf(s[0]); VIEW.goTo(p.tx, p.ty); } }
    else if (k === 'g') { VIEW.show.grille = !VIEW.show.grille; VIEW.dirty = true; renderShow(); }
  });
  window.addEventListener('keyup', (e) => { if (e.key === ' ') { S.space = false; $('map').style.cursor = S.tool === 'pan' ? 'grab' : S.tool === 'select' ? 'default' : 'crosshair'; } });
}
function variant(dir) {
  if (S.tool === 'place' && S.armed) { const n = (R.env[S.armed] || [1]).length; S.armedV = (S.armedV + dir + n) % n; if (S.mouse) ghostAt(...S.mouse); return; }
  const s = selected(); if (!s.length) return;
  ED.begin('Variante'); for (const r of s) { const p = ED.propOf(r), n = BUILDING_PROPS.has(p.type) ? 1 : (R.env[p.type] || [1]).length, d = ED.describe(r); ED.change(r, { v: ((d.v | 0) + dir + n) % n }); } ED.end();
}
function copySel() { const s = selected(); const c = ED.copy(s); if (!c) return false; S.clip = c; try { localStorage.setItem('lstudio:presse-papiers', JSON.stringify(c)); } catch (e) { /* */ } toast(`${c.length} élément(s) copié(s).`); return true; }
function pasteAt() {
  let c = S.clip; if (!c) { try { c = JSON.parse(localStorage.getItem('lstudio:presse-papiers') || 'null'); } catch (e) { c = null; } }
  if (!c || !c.length) return toast('Rien à coller.', 'warn');
  const [tx, ty] = S.mouse || [Math.floor(VIEW.cam.x / 16), Math.floor(VIEW.cam.y / 16)];
  const out = ED.paste(c, tx, ty, S.activeLayer); select(out); toast(`${out.length} élément(s) collé(s).`);
}
function duplicate() { const s = selected(); const c = ED.copy(s); if (!c) return; const p0 = ED.describe(s[0]); const x0 = Math.min(...s.map((r) => ED.describe(r).x)), y0 = Math.min(...s.map((r) => ED.describe(r).y)); void p0; const out = ED.paste(c, x0 + 1, y0 + 1, S.activeLayer); select(out); }

// ------------------------------------------------------------------ les onglets
function showTab(side, tab) {
  for (const b of document.querySelectorAll(`.tabs[data-for="${side}"] button`)) b.classList.toggle('on', b.dataset.tab === tab);
  const root = $(side); for (const p of root.querySelectorAll('.pane')) p.classList.toggle('on', p.dataset.pane === tab);
}
// ------------------------------------------------------------------ la bibliothèque
const libCanvas = new Map();
function preview(type, v = 0, size = 56) {
  const k = type + '|' + v; if (libCanvas.has(k)) return libCanvas.get(k).cloneNode ? cloneCanvas(libCanvas.get(k)) : null;
  const isB = BUILDING_PROPS.has(type), s = VIEW.spr({ type, v, w: isB ? 5 : undefined, h: isB ? 4 : undefined, door: isB ? 2 : undefined, style: isB ? 'maison' : undefined });
  const cv = document.createElement('canvas'); cv.width = s ? s.w : 16; cv.height = s ? s.h : 16;
  if (s) cv.getContext('2d').drawImage(s.cv, 0, 0);
  cv.dataset.dim = s ? `${s.w} × ${s.h} px` : '?'; libCanvas.set(k, cv); return cloneCanvas(cv); void size;
}
function cloneCanvas(c) { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); n.dataset.dim = c.dataset.dim; return n; }
function usage() { const u = {}; for (const p of WORLD.props) u[p.type] = (u[p.type] || 0) + 1; return u; }
function renderLib() {
  const L = $('lib-list'), q = $('lib-search').value.trim().toLowerCase(), cat = $('lib-cat').value, onlyUsed = $('lib-used').checked, U = usage();
  L.innerHTML = '';
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const C of CATEGORIES) {
    if (cat && cat !== C.id) continue;
    const items = C.types.filter((t) => PROPS[t] && R.env[t] || t === 'cite').filter((t) => !q || norm(nomDe(t)).includes(norm(q)) || t.includes(q)).filter((t) => !onlyUsed || U[t]);
    if (!items.length) continue;
    L.append(h('div', { class: 'cat' }, C.nom));
    for (const t of items) {
      const cv = preview(t), n = BUILDING_PROPS.has(t) ? 'variable' : (R.env[t] || []).length;
      const it = h('div', { class: 'it' + (S.armed === t ? ' on' : ''), draggable: 'true', title: `${nomDe(t)} — ${cv.dataset.dim}${n > 1 ? `, ${n} variantes` : ''} — utilisé ${U[t] || 0} fois dans le monde\nCliquer pour choisir, puis cliquer sur la carte (ou glisser-déposer).`,
        on: { click: () => arm(t), dragstart: (e) => { S.dragType = t; e.dataTransfer.setData('text/lstudio', t); e.dataTransfer.effectAllowed = 'copy'; } } }, cv, h('div', { class: 'n' }, nomDe(t)), h('div', { class: 'd' }, `${cv.dataset.dim}${U[t] ? ' · ' + U[t] + '×' : ''}`));
      L.append(it);
    }
  }
  if (!L.children.length) L.append(h('p', { class: 'hint' }, 'Aucun élément ne correspond.'));
}
// ------------------------------------------------------------------ la peinture
function renderPaint() {
  for (const b of document.querySelectorAll('#paint-kind button')) b.classList.toggle('on', b.dataset.k === S.paintKind);
  for (const b of document.querySelectorAll('#paint-size button')) b.classList.toggle('on', +b.dataset.n === S.brush);
  $('paint-erase').checked = S.erase;
  const L = $('paint-list'); L.innerHTML = '';
  const item = (on, col, label, x, fn) => L.append(h('div', { class: 'li' + (on ? ' on' : ''), on: { click: fn } }, h('span', { class: 'sw', style: `background:${col}` }), label, x ? h('span', { class: 'x' }, x) : null));
  if (S.paintKind === 'sol') for (const [n, label] of SOLS) item(S.paintVal.sol === n, '#' + (MINI_COL[T[n]] || 0).toString(16).padStart(6, '0'), label, '', () => { S.paintVal.sol = n; renderPaint(); setTool('paint'); });
  if (S.paintKind === 'regions') ZONES.forEach((z, i) => item(S.paintVal.regions === i, zoneColor(i), z.name, z.safe ? 'sûre' : '', () => { S.paintVal.regions = i; renderPaint(); setTool('paint'); }));
  if (S.paintKind === 'collisions') { item(S.paintVal.collisions === 1, '#ff3a3a', 'Bloquer le passage', '', () => { S.paintVal.collisions = 1; renderPaint(); setTool('paint'); }); item(S.paintVal.collisions === 0, '#3aff7a', 'Libérer le passage', '', () => { S.paintVal.collisions = 0; renderPaint(); setTool('paint'); }); }
  if (S.paintKind === 'navigation') { item(S.paintVal.navigation === 1, '#3aa0ff', 'Les bateaux passent', '', () => { S.paintVal.navigation = 1; renderPaint(); setTool('paint'); }); item(S.paintVal.navigation === 0, '#5a6a7a', 'Les bateaux ne passent pas', '', () => { S.paintVal.navigation = 0; renderPaint(); setTool('paint'); }); }
  $('paint-hint').textContent = { sol: 'Le sol repeint change aussi ce qui bloque : la roche et la mer profonde arrêtent les pirates, l’eau peu profonde se traverse.', regions: 'La région donne son nom au lieu, ses monstres, sa musique, et dit si l’on y est en sûreté.', collisions: 'Le dernier mot sur ce qui bloque : un cadre rouge bloque, un cadre vert libère, quoi qu’il y ait dessous. Le calque « Collisions » les montre.', navigation: 'Où un navire peut aller. Peindre l’eau suffit en général ; ceci corrige les cas particuliers.' }[S.paintKind] + ' Clic droit ou « Gomme » : revenir au monde d’origine.';
  VIEW.show.collisions = VIEW.show.collisions || S.paintKind === 'collisions'; VIEW.show.regions = S.paintKind === 'regions' ? true : VIEW.show.regions; VIEW.show.navigation = S.paintKind === 'navigation' ? true : VIEW.show.navigation; VIEW.dirty = true; renderShow();
}
// ------------------------------------------------------------------ la carte : repères, régions, intérieurs
let zoneCenters = null;
function renderMapPane() {
  if (!zoneCenters) { const acc = ZONES.map(() => [0, 0, 0]); for (let y = 0; y < WORLD.OVER_H; y += 2) for (let x = 0; x < WORLD.W; x += 2) { const z = WORLD.zones[y * WORLD.W + x]; if (z > 0 && acc[z]) { acc[z][0] += x; acc[z][1] += y; acc[z][2]++; } } zoneCenters = acc.map(([x, y, n]) => (n ? [Math.round(x / n), Math.round(y / n), n] : null)); }
  const ZL = $('zone-list'); ZL.innerHTML = '';
  ZONES.forEach((z, i) => { const c = zoneCenters[i]; if (!c || i === 0) return; ZL.append(h('div', { class: 'li', on: { click: () => { VIEW.goTo(c[0], c[1], 1); zoomLabel(); } } }, h('span', { class: 'sw', style: `background:${zoneColor(i)}` }), z.name, h('span', { class: 'x' }, z.lvl || ''))); });
  renderRooms(); renderReperes();
}
function renderRooms() {
  const q = $('room-search').value.trim().toLowerCase(), RL = $('room-list'); RL.innerHTML = '';
  for (const r of WORLD.rooms) { if (q && !r.name.toLowerCase().includes(q)) continue; RL.append(h('div', { class: 'li', on: { click: () => { VIEW.goTo(r.x0 + (r.w >> 1), r.y0 + (r.h >> 1), 1); zoomLabel(); } } }, r.name, h('span', { class: 'x' }, `${r.w} × ${r.h}`))); }
}
function renderReperes() {
  const L = $('rep-list'); L.innerHTML = '';
  if (!(ED.doc.reperes || []).length) L.append(h('p', { class: 'hint' }, 'Aucun repère. Un repère marque un endroit où vous travaillez (une future île, un quartier…).'));
  (ED.doc.reperes || []).forEach((r, k) => L.append(h('div', { class: 'li', on: { click: () => { VIEW.goTo(r.x, r.y); } } }, '📍', r.nom, h('span', { class: 'x' }, `${r.x}, ${r.y}`), h('button', { class: 'mini', title: 'Retirer ce repère', on: { click: (e) => { e.stopPropagation(); const L2 = ED.doc.reperes.slice(); L2.splice(k, 1); ED.set('reperes', '', L2); } } }, '✕'))));
}
// ------------------------------------------------------------------ les couches et l'affichage
function renderLayers() {
  const L = $('layer-list'); L.innerHTML = '';
  const count = {}; for (const d of ED.doc.decors) count[d.couche || 'decors'] = (count[d.couche || 'decors'] || 0) + 1;
  for (const c of ED.doc.couches) {
    const n = c.origine ? WORLD.props.filter((p) => !p.studio).length : count[c.id] || 0;
    L.append(h('div', { class: 'layer' + (S.activeLayer === c.id ? ' on' : '') },
      h('button', { title: c.visible === false ? 'Afficher' : 'Masquer (en édition seulement)', on: { click: () => setLayer(c.id, { visible: c.visible === false }) } }, c.visible === false ? '🙈' : '👁'),
      h('button', { title: c.verrou ? 'Déverrouiller' : 'Verrouiller (plus de sélection ni de déplacement)', on: { click: () => setLayer(c.id, { verrou: !c.verrou }) } }, c.verrou ? '🔒' : '🔓'),
      h('span', { class: 'nm', title: c.origine ? 'Les décors du jeu tel qu’il est' : 'Cliquer : couche active (les nouveaux décors y vont). Double-clic : renommer.', on: { click: () => { if (!c.origine) { S.activeLayer = c.id; renderLayers(); } }, dblclick: async () => { if (c.origine) return; const n2 = prompt('Nom de la couche', c.nom); if (n2) setLayer(c.id, { nom: n2.slice(0, 40) }); } } }, c.nom),
      h('span', { class: 'ct' }, String(n)),
      !c.origine && n === 0 && ED.doc.couches.filter((x) => !x.origine).length > 1 ? h('button', { title: 'Supprimer cette couche vide', on: { click: () => { ED.set('couches', '', ED.doc.couches.filter((x) => x.id !== c.id)); if (S.activeLayer === c.id) S.activeLayer = 'decors'; } } }, '✕') : null));
  }
}
function setLayer(id, f) { ED.set('couches', '', ED.doc.couches.map((c) => (c.id === id ? { ...c, ...f } : c))); VIEW.dirty = true; }
function renderShow() {
  const L = $('show-list'); L.innerHTML = '';
  for (const [k, label] of [['grille', 'Quadrillage (G)'], ['collisions', 'Collisions (rouge : bloque)'], ['regions', 'Régions'], ['navigation', 'Navigation (bleu : les bateaux passent)'], ['portes', 'Portes (vert : dehors, bleu : dedans)'], ['pnj', 'Personnages']]) L.append(h('label', { class: 'chk li' }, h('input', { type: 'checkbox', checked: VIEW.show[k], on: { change: (e) => { VIEW.show[k] = e.target.checked; VIEW.dirty = true; } } }), label));
}
// ------------------------------------------------------------------ les propriétés
let panelT = null;
function schedulePanel() { clearTimeout(panelT); panelT = setTimeout(() => { renderProps(); }, 60); }
function field(label, input) { return h('div', { class: 'field' }, h('span', {}, label), input); }
function num(v, on, step = 1) { return h('input', { type: 'number', value: v, step, on: { change: (e) => on(+e.target.value) } }); }
function sel(v, opts, on) { const s = h('select', { on: { change: (e) => on(e.target.value) } }); for (const [k, l] of opts) s.append(h('option', { value: k, selected: String(k) === String(v) }, l)); return s; }
function renderProps() {
  const P = $('props'); P.innerHTML = '';
  const s = selected();
  if (!s.length) {
    const st = stats(ED.doc);
    P.append(h('p', { class: 'hint' }, 'Cliquez sur un élément de la carte pour le sélectionner (Maj : plusieurs ; glisser dans le vide : un cadre).'),
      h('h3', {}, 'Ce monde'), field('Décors ajoutés', h('b', {}, st.decors)), field('Décors retouchés', h('b', {}, st.retouches)), field('Cases repeintes', h('b', {}, st.sol)), field('Régions peintes', h('b', {}, st.regions)), field('Collisions', h('b', {}, st.collisions)), field('Navigation', h('b', {}, st.navigation)),
      h('h3', {}, 'Raccourcis'), h('p', { class: 'hint', html: 'Ctrl+Z / Ctrl+Y : annuler, rétablir · Ctrl+C / Ctrl+V : copier, coller · Ctrl+D : dupliquer · Suppr : supprimer · flèches : déplacer d’une case (Alt : d’un pixel) · [ et ] : variante · M : miroir · L : verrouiller · molette : zoom · Espace + glisser : se déplacer · Ctrl+S : enregistrer une version' }));
    return;
  }
  if (s.length > 1) {
    P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, `${s.length} éléments sélectionnés`), h('div', { class: 's' }, [...new Set(s.map((r) => nomDe(ED.propOf(r).type)))].slice(0, 4).join(', ')))));
    const studio = s.filter((r) => r.k === 'd');
    if (studio.length) P.append(field('Couche', sel('', [['', '—'], ...ED.doc.couches.filter((c) => !c.origine).map((c) => [c.id, c.nom])], (v) => { if (!v) return; ED.begin('Changer de couche'); for (const r of studio) ED.change(r, { couche: v }); ED.end(); })));
    P.append(h('div', { class: 'btns' }, h('button', { on: { click: duplicate } }, 'Dupliquer'), h('button', { on: { click: copySel } }, 'Copier'), studio.length ? h('button', { on: { click: () => { ED.begin('Verrouiller'); for (const r of studio) ED.change(r, { verrou: true }); ED.end(); } } }, 'Verrouiller') : null, h('button', { class: 'danger', on: { click: () => { ED.remove(s); select([]); } } }, 'Supprimer')));
    return;
  }
  const r = s[0], p = ED.propOf(r), d = ED.describe(r), isD = r.k === 'd', isB = BUILDING_PROPS.has(p.type);
  const cv = preview(p.type, p.v);
  P.append(h('div', { class: 'head' }, cv, h('div', {}, h('div', { class: 't' }, (d.nom ? d.nom + ' — ' : '') + nomDe(p.type)), h('div', { class: 's' }, isD ? 'Ajouté dans LStudio' : `Décor d’origine n° ${p.id}${ED.doc.retouches[p.id] ? ' (retouché)' : ''}`), h('div', { class: 's' }, cv.dataset.dim))));
  const ch = (f) => (v) => ED.change(r, { [f]: v });
  P.append(field('Case (x, y)', h('div', { class: 'two' }, num(d.x, ch('x')), num(d.y, ch('y')))));
  P.append(field('Décalage (px)', h('div', { class: 'two' }, num(d.dx || 0, ch('dx')), num(d.dy || 0, ch('dy')))));
  const nv = isB ? 1 : (R.env[p.type] || [1]).length;
  if (nv > 1) P.append(field('Variante', h('div', { class: 'two' }, h('button', { on: { click: () => variant(-1) } }, '◀'), h('span', { style: 'flex:1;text-align:center;padding-top:5px' }, `${(d.v | 0) + 1} / ${nv}`), h('button', { on: { click: () => variant(1) } }, '▶'))));
  P.append(field('Plan', sel(d.plan || 'auto', [['auto', 'Automatique'], ['sol', 'Au sol (sous les personnages)'], ['normal', 'Normal (trié en profondeur)'], ['dessus', 'Au-dessus des personnages']], ch('plan'))));
  P.append(field('Miroir', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!d.miroir, on: { change: (e) => ED.change(r, { miroir: e.target.checked }) } }), 'retourné (M)')));
  if (isD) {
    P.append(field('Solidité', sel(d.solide || 'auto', [['auto', 'Selon l’élément'], ['aucune', 'On passe au travers'], ['tout', 'Toute son emprise bloque']], ch('solide'))));
    if (isB) {
      const D = d.donnees || {};
      P.append(h('h3', {}, 'Bâtiment'), field('Largeur × hauteur', h('div', { class: 'two' }, num(D.w || 5, (v) => ED.change(r, { 'donnees.w': Math.max(2, Math.min(16, v | 0)) })), num(D.h || 4, (v) => ED.change(r, { 'donnees.h': Math.max(2, Math.min(10, v | 0)) })))),
        field('Porte (colonne)', num(D.door ?? 2, (v) => ED.change(r, { 'donnees.door': Math.max(-1, Math.min((D.w || 5) - 1, v | 0)) }))),
        field('Style', sel(D.style || 'maison', STYLES_BATIMENT, (v) => ED.change(r, { 'donnees.style': v }))),
        h('p', { class: 'hint' }, 'Une façade, pour l’instant sans intérieur : relier une porte à un intérieur viendra avec l’éditeur de bâtiments (lot 2).'));
    }
    P.append(field('Couche', sel(d.couche || 'decors', ED.doc.couches.filter((c) => !c.origine).map((c) => [c.id, c.nom]), ch('couche'))));
    P.append(field('Nom', h('input', { value: d.nom || '', placeholder: 'facultatif', on: { change: (e) => ED.change(r, { nom: e.target.value.slice(0, 60) }) } })));
    P.append(field('Verrouillé', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!d.verrou, on: { change: (e) => ED.change(r, { verrou: e.target.checked }) } }), 'plus de déplacement (L)')));
  }
  P.append(h('div', { class: 'btns' }, h('button', { on: { click: duplicate } }, 'Dupliquer'), h('button', { on: { click: copySel } }, 'Copier'),
    !isD && ED.doc.retouches[p.id] ? h('button', { on: { click: () => { ED.set('retouche', String(p.id), undefined); renderProps(); } } }, 'Rétablir l’original') : null,
    h('button', { class: 'danger', on: { click: () => { ED.remove([r]); select([]); } } }, isD ? 'Supprimer' : 'Retirer du monde')));
  if (!isD) P.append(h('p', { class: 'hint' }, 'Un décor du jeu : vos changements sont gardés comme des retouches, et « Rétablir l’original » le remet tel qu’il était.'));
}
// ------------------------------------------------------------------ la barre d'état, le zoom, la carte réduite
function status() {
  const [tx, ty] = S.mouse || [0, 0]; if (tx < 0 || ty < 0 || tx >= WORLD.W || ty >= WORLD.H) return;
  const i = ty * WORLD.W + tx, room = WORLD.roomGrid[i] >= 0 ? WORLD.rooms[WORLD.roomGrid[i]].name : null;
  const sol = SOLS.find(([n]) => T[n] === WORLD.tiles[i]);
  const tool = { select: 'Sélection', place: S.armed ? `Poser « ${nomDe(S.armed)} » (variante ${S.armedV + 1}, [ ] pour changer ; Alt : au pixel)` : 'Poser', paint: paintLabel() + ` (pinceau ${S.brush})`, pan: 'Main' }[S.tool];
  $('status').textContent = `Case ${tx}, ${ty} · ${sol ? sol[1] : TILE_NAMES[WORLD.tiles[i]]} · ${ZONES[WORLD.zones[i]] ? ZONES[WORLD.zones[i]].name : 'région ' + WORLD.zones[i]}${room ? ' · ' + room : ''} · ${WORLD.solid[i] ? 'bloque' : 'libre'}${WORLD.sail[i] ? ' · navigable' : ''} — ${tool}`;
}
function zoomLabel() { $('z-val').textContent = Math.round(VIEW.cam.z * 100) + ' %'; }
function drawMinimap() {
  const m = $('minimap'), c = m.getContext('2d'), W = WORLD.W, H = WORLD.OVER_H, k = Math.min(m.width / W, m.height / H);
  c.imageSmoothingEnabled = false; c.fillStyle = '#0b1420'; c.fillRect(0, 0, m.width, m.height); c.drawImage(VIEW.mini, 0, 0, W, H, 0, 0, W * k, H * k);
  const vw = $('map').clientWidth / VIEW.cam.z / 16, vh = $('map').clientHeight / VIEW.cam.z / 16;
  c.strokeStyle = '#ffd84a'; c.lineWidth = 1; c.strokeRect((VIEW.cam.x / 16 - vw / 2) * k, (VIEW.cam.y / 16 - vh / 2) * k, vw * k, vh * k);
}
// ------------------------------------------------------------------ le contrôle qualité
async function runQC() {
  $('qc-list').innerHTML = '<p class="hint">Vérification : le monde est régénéré avec vos modifications, comme le fera le jeu…</p>'; showTab('right', 'qc');
  await frame(); await sleep(20);
  const t0 = performance.now(), W2 = generateWorld(7, { studio: ED.doc });
  const issues = checkStudio(W2, ED.doc, { PROPS, canStand });
  S.qc = issues; renderQC(Math.round(performance.now() - t0)); return issues;
}
function renderQC(ms) {
  const L = $('qc-list'), I = S.qc || [], nb = I.filter((i) => i.niveau === 'bloquant').length;
  $('qc-count').textContent = I.length ? String(I.length) : '';
  L.innerHTML = '';
  L.append(h('p', { class: 'hint' }, I.length ? `${nb} problème(s) bloquant(s), ${I.length - nb} avertissement(s)${ms ? ` (vérifié en ${ms} ms)` : ''}. Les problèmes bloquants empêchent la publication.` : `Aucun problème trouvé${ms ? ` (vérifié en ${ms} ms)` : ''}.`));
  for (const it of I.slice(0, 200)) {
    L.append(h('div', { class: 'qc' + (it.niveau === 'bloquant' ? ' b' : '') }, h('div', { class: 'm' }, (it.niveau === 'bloquant' ? '⛔ ' : '⚠ ') + it.msg), h('div', { class: 'w' }, `case ${it.x}, ${it.y}`),
      h('div', { class: 'btns' }, h('button', { class: 'mini', on: { click: () => { VIEW.goTo(it.x, it.y, Math.max(1, VIEW.cam.z)); zoomLabel(); } } }, 'Aller voir'), it.fix ? h('button', { class: 'mini', on: { click: () => { fix(it.fix); runQC(); } } }, fixLabel(it.fix)) : null)));
  }
}
const fixLabel = (f) => ({ supprimer: 'Supprimer ce décor', retirer_sol: 'Annuler ce sol', liberer: 'Libérer la case' }[f.op] || 'Corriger');
function fix(f) {
  if (f.op === 'supprimer') ED.set('decor', f.uid, undefined);
  else if (f.op === 'retirer_sol') ED.set('sol', f.k, undefined);
  else if (f.op === 'liberer') ED.set('collisions', key(f.x, f.y), 0);
}
// ------------------------------------------------------------------ l'aperçu dans le vrai jeu
async function testInGame() {
  clearTimeout(saveTimer); await autosave();
  const I = await runQC(), nb = I.filter((i) => i.niveau === 'bloquant').length;
  if (nb && !(await confirmBox('Tester malgré tout ?', `Le contrôle a trouvé ${nb} problème(s) bloquant(s). Vous pouvez tester quand même, pour voir.`, 'Tester'))) return;
  await store.put('test', { doc: ED.doc, date: new Date().toISOString() });
  try { localStorage.setItem(APERCU_KEY, JSON.stringify(ED.doc)); } catch (e) { return toast('Ce monde est trop gros pour l’aperçu dans ce navigateur (' + e.message + ').', 'err'); }
  const w = window.open('index.html?apercu=1', 'lstudio-apercu');
  if (!w) toast('Le navigateur a bloqué la fenêtre : autorisez les fenêtres de cette page, ou ouvrez index.html?apercu=1.', 'warn');
  else toast('Version de test ouverte dans un nouvel onglet : le vrai jeu, en solo, avec vos modifications.');
}
// ------------------------------------------------------------------ les versions
async function showVersions() {
  const list = await store.versions(), body = h('div');
  const T2 = { manuel: 'Enregistrée', auto: 'Automatique', copie: 'Copie de sécurité', publication: 'Publiée', import: 'Importée' };
  const nameIn = h('input', { placeholder: 'Nom de la version (facultatif)', style: 'flex:1' });
  body.append(h('div', { class: 'row' }, nameIn, h('button', { class: 'primary', on: { click: async () => { await saveVersion(nameIn.value.trim()); showVersions(); } } }, 'Enregistrer une version maintenant')));
  if (!list.length) body.append(h('p', { class: 'hint' }, 'Aucune version encore. Le brouillon, lui, est enregistré automatiquement à chaque modification.'));
  else {
    const t = h('table', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'Nom'), h('th', {}, 'Genre'), h('th', {}, 'Contenu'), h('th', {}, '')));
    for (const v of list) t.append(h('tr', {}, h('td', {}, new Date(v.date).toLocaleString('fr-FR')), h('td', {}, v.nom), h('td', {}, T2[v.type] || v.type), h('td', {}, `${v.stats.decors} décors, ${v.stats.sol} cases`),
      h('td', {}, h('button', { class: 'mini', on: { click: async () => { if (await confirmBox('Restaurer cette version ?', 'Le brouillon actuel sera d’abord gardé en copie de sécurité (dans cette même liste).', 'Restaurer')) { const full = await store.version(v.id); replaceDraft(normalizeDoc(full.doc), `restauration de « ${v.nom} »`); } } } }, 'Restaurer'), ' ',
        h('button', { class: 'mini', on: { click: async () => { const full = await store.version(v.id); download(full.doc, v.nom); } } }, 'Exporter'), ' ',
        v.type !== 'publication' ? h('button', { class: 'mini', on: { click: async () => { if (await confirmBox('Supprimer cette version ?', `« ${esc(v.nom)} » sera effacée de ce navigateur.`, 'Supprimer', 'danger')) { await store.delVersion(v.id); showVersions(); } } } }, '✕') : null)));
    body.append(t);
  }
  modal('Versions de ce monde', body);
}
function download(doc, name = 'monde') { const b = new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }); const a = h('a', { href: URL.createObjectURL(b), download: `lstudio-${String(name).replace(/[^\w-]+/g, '_').slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.json` }); document.body.append(a); a.click(); a.remove(); }
async function importFile(file) {
  try { const doc = normalizeDoc(JSON.parse(await file.text())); const st = stats(doc); if (await confirmBox('Importer ce monde ?', `« ${esc(doc.meta.nom)} » : ${st.decors} décors, ${st.sol} cases repeintes, ${st.retouches} retouches. Il remplacera le brouillon, qui sera d’abord gardé en copie de sécurité.`, 'Importer')) { await store.addVersion('import', `Import : ${doc.meta.nom}`, doc); replaceDraft(doc, 'import d’un fichier'); } }
  catch (e) { toast('Import impossible : ' + e.message, 'err'); }
}
// ------------------------------------------------------------------ la publication (GitHub)
async function showPublish() {
  const cfg = { ...guessRepo(), ...((await store.get('github')) || {}) }, saved = await store.get('github_cle');
  const body = h('div');
  const I = { owner: h('input', { value: cfg.owner }), repo: h('input', { value: cfg.repo }), branch: h('input', { value: cfg.branch || 'main' }), token: h('input', { type: 'password', value: saved || '', placeholder: 'github_pat_…', autocomplete: 'off' }), keep: h('input', { type: 'checkbox', checked: !!saved }), msg: h('input', { value: `LStudio : ${ED.doc.meta.nom}` }) };
  const out = h('div');
  body.append(h('p', {}, 'Publier écrit ce monde dans le dépôt du jeu (', h('code', {}, PUB_PATH), '). Le site du jeu se met à jour tout seul, en une à deux minutes, pour tous les joueurs.'),
    field('Propriétaire', I.owner), field('Dépôt', I.repo), field('Branche', I.branch), field('Clé GitHub', I.token), field('', h('label', { class: 'chk' }, I.keep, 'Mémoriser la clé sur cet ordinateur')), field('Message', I.msg),
    h('details', {}, h('summary', {}, 'Comment obtenir une clé GitHub (une seule fois)'), h('ol', {}, h('li', {}, 'Sur github.com : votre photo → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.'), h('li', {}, 'Repository access : « Only select repositories », choisissez ', h('b', {}, cfg.repo), '.'), h('li', {}, 'Permissions → Repository permissions → Contents : « Read and write ».'), h('li', {}, 'Copiez la clé ici. Elle reste dans votre navigateur : elle n’est jamais écrite dans le jeu ni dans le dépôt. Seul quelqu’un qui a le droit d’écrire dans le dépôt peut publier.'))),
    out);
  const conf = () => ({ owner: I.owner.value.trim(), repo: I.repo.value.trim(), branch: I.branch.value.trim() || 'main' });
  const keepKey = async () => { await store.put('github', conf()); if (I.keep.checked) await store.put('github_cle', I.token.value.trim()); else await store.del('github_cle'); };
  modal('Publier dans le jeu', body, [
    { label: 'Publications précédentes', run: async () => { try { await keepKey(); const hist = await github.history(conf(), I.token.value.trim()); out.innerHTML = ''; if (!hist.length) out.append(h('p', { class: 'hint' }, 'Aucune publication encore.')); for (const c of hist) out.append(h('div', { class: 'row' }, h('span', { style: 'flex:1' }, `${new Date(c.date).toLocaleString('fr-FR')} — ${c.message.split('\n')[0]}`), h('button', { class: 'mini', on: { click: async () => { const d = await github.at(conf(), I.token.value.trim(), c.sha); if (await confirmBox('Ouvrir cette publication ?', 'Elle deviendra votre brouillon (l’actuel est gardé en copie). Pour la remettre en ligne, publiez-la ensuite.', 'Ouvrir')) replaceDraft(normalizeDoc(d), 'ouverture d’une ancienne publication'); } } }, 'Ouvrir comme brouillon'))); } catch (e) { out.innerHTML = ''; out.append(h('p', { style: 'color:var(--danger)' }, e.message)); } return false; } },
    { label: 'Vérifier l’accès', run: async () => { try { await keepKey(); const r = await github.check(conf(), I.token.value.trim()); out.innerHTML = ''; out.append(h('p', { style: `color:var(--${r.ecriture ? 'ok' : 'danger'})` }, r.ecriture ? `Accès vérifié : ${r.nom}, droit d’écriture.` : `${r.nom} : cette clé ne peut pas écrire dans le dépôt.`)); } catch (e) { out.innerHTML = ''; out.append(h('p', { style: 'color:var(--danger)' }, e.message)); } return false; } },
    { label: 'Publier', cls: 'primary', run: async () => {
      const issues = await runQC(), nb = issues.filter((i) => i.niveau === 'bloquant').length;
      if (nb) { out.innerHTML = ''; out.append(h('p', { style: 'color:var(--danger)' }, `${nb} problème(s) bloquant(s) : corrigez-les d’abord (onglet « Contrôle »).`)); return false; }
      try {
        await keepKey(); clearTimeout(saveTimer); await autosave();
        const doc = JSON.parse(JSON.stringify(ED.doc)); doc.meta.publie = new Date().toISOString();
        const r = await github.publish(conf(), I.token.value.trim(), doc, I.msg.value.trim() || 'LStudio : publication');
        await store.addVersion('publication', `Publiée : ${ED.doc.meta.nom}`, doc); await store.put('publie', { doc, date: doc.meta.publie, commit: r.commit });
        out.innerHTML = ''; out.append(h('p', { style: 'color:var(--ok)' }, 'Publié ! Le site du jeu se met à jour dans une à deux minutes. '), r.url ? h('a', { href: r.url, target: '_blank', style: 'color:var(--accent)' }, 'Voir la publication sur GitHub') : '');
        toast('Monde publié.');
      } catch (e) { out.innerHTML = ''; out.append(h('p', { style: 'color:var(--danger)' }, 'Publication impossible : ' + e.message)); }
      return false;
    } },
    { label: 'Fermer' },
  ]);
}
// ------------------------------------------------------------------ le menu, l'aide
function showMenu() {
  const M = $('menu'); if (!M.classList.contains('hidden')) { M.classList.add('hidden'); return; }
  M.innerHTML = '';
  const item = (label, fn) => M.append(h('button', { on: { click: () => { M.classList.add('hidden'); fn(); } } }, label));
  item('🆕 Nouveau brouillon (monde d’origine)', async () => { if (await confirmBox('Repartir de zéro ?', 'Un brouillon vide : le monde du jeu tel qu’il est, sans vos modifications. L’actuel est gardé en copie de sécurité (Versions).', 'Repartir de zéro')) replaceDraft(emptyDoc('Mon monde'), 'nouveau brouillon'); });
  item('🌐 Repartir du monde publié', async () => { try { const r = await fetch('monde-studio.json', { cache: 'no-cache' }); const d = normalizeDoc(await r.json()); if (await confirmBox('Repartir du monde publié ?', 'Le brouillon actuel est gardé en copie de sécurité.', 'Repartir du publié')) replaceDraft(d, 'reprise du monde publié'); } catch (e) { toast('Monde publié introuvable : ' + e.message, 'err'); } });
  item('⬇ Exporter ce monde (fichier)', () => download(ED.doc, ED.doc.meta.nom));
  item('⬆ Importer un monde (fichier)', () => $('file-in').click());
  item('❓ Aide', showHelp);
  M.classList.remove('hidden');
}
function showHelp() {
  modal('Bienvenue dans LStudio', `<p><b>LStudio</b> modifie le vrai monde de Marée Morte. Ce que vous voyez ici, c’est le jeu, dessiné par le jeu.</p>
  <ol>
  <li><b>Se déplacer</b> : molette pour zoomer, Espace + glisser (ou clic molette) pour bouger, onglet « Carte » pour aller à une région, un intérieur ou un repère.</li>
  <li><b>Poser</b> : choisissez un élément dans la Bibliothèque, puis cliquez sur la carte (ou glissez-le). <b>[</b> et <b>]</b> changent la variante, Alt place au pixel près.</li>
  <li><b>Modifier</b> : outil Sélection (V), cliquez sur un élément ; ses propriétés s’affichent à droite. Glissez pour déplacer, flèches pour ajuster, Suppr pour supprimer. Les décors d’origine du jeu peuvent aussi être déplacés ou retirés, et « Rétablir l’original » les remet.</li>
  <li><b>Peindre</b> : onglet « Peinture » — le sol (sable, herbe, pavés, eau…), les régions, les collisions (ce qui bloque), la navigation des bateaux. Clic droit : gomme.</li>
  <li><b>Couches</b> : rangez vos ajouts, masquez-les, verrouillez-les.</li>
  <li><b>Vérifier</b> : le contrôle cherche ce qui serait cassé (un décor inconnu, une porte bouchée, un personnage muré…) et propose une correction.</li>
  <li><b>Tester dans le jeu</b> : le vrai jeu s’ouvre, en solo, avec vos modifications. Votre pirate y est copié : sa vraie sauvegarde n’est jamais touchée.</li>
  <li><b>Publier</b> : vos modifications partent dans le jeu pour tout le monde (il faut une clé GitHub qui a le droit d’écrire dans le dépôt).</li>
  </ol>
  <p>Tout est enregistré automatiquement dans ce navigateur. « Enregistrer » garde en plus une version nommée ; « Versions » permet de revenir en arrière. Exportez de temps en temps un fichier : c’est votre copie de sécurité hors du navigateur.</p>`);
}
// ------------------------------------------------------------------ le câblage
function wire() {
  wireMap(); wireKeys();
  for (const b of document.querySelectorAll('#tools button')) b.onclick = () => { if (b.dataset.tool === 'place' && !S.armed) { showTab('left', 'lib'); toast('Choisissez d’abord un élément dans la bibliothèque.'); return; } setTool(b.dataset.tool); };
  for (const nav of document.querySelectorAll('.tabs')) for (const b of nav.querySelectorAll('button')) b.onclick = () => { showTab(nav.dataset.for, b.dataset.tab); if (b.dataset.tab === 'paint') setTool('paint'); };
  $('b-undo').onclick = () => { const l = ED.undo(); toast(l ? 'Annulé : ' + l : 'Rien à annuler.'); };
  $('b-redo').onclick = () => { const l = ED.redo(); toast(l ? 'Rétabli : ' + l : 'Rien à rétablir.'); };
  $('b-save').onclick = () => saveVersion(); $('b-versions').onclick = showVersions; $('b-check').onclick = runQC; $('qc-run').onclick = runQC;
  $('b-test').onclick = testInGame; $('b-publish').onclick = showPublish; $('b-menu').onclick = showMenu;
  $('file-in').onchange = (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; };
  $('doc-name').value = ED.doc.meta.nom; $('doc-name').onchange = (e) => { ED.set('meta', 'nom', e.target.value.trim().slice(0, 60) || 'Mon monde'); };
  $('lib-search').oninput = renderLib; $('lib-used').onchange = renderLib;
  const C = $('lib-cat'); C.append(h('option', { value: '' }, 'Toutes les catégories')); for (const c of CATEGORIES) C.append(h('option', { value: c.id }, c.nom)); C.onchange = renderLib;
  for (const b of document.querySelectorAll('#paint-kind button')) b.onclick = () => { S.paintKind = b.dataset.k; renderPaint(); setTool('paint'); };
  for (const b of document.querySelectorAll('#paint-size button')) b.onclick = () => { S.brush = +b.dataset.n; renderPaint(); };
  $('paint-erase').onchange = (e) => { S.erase = e.target.checked; };
  $('go-btn').onclick = () => { VIEW.goTo(+$('go-x').value | 0, +$('go-y').value | 0); };
  $('rep-add').onclick = () => { const n = prompt('Nom du repère', 'Ma nouvelle île'); if (!n) return; ED.set('reperes', '', [...(ED.doc.reperes || []), { nom: n.slice(0, 40), x: Math.floor(VIEW.cam.x / 16), y: Math.floor(VIEW.cam.y / 16) }]); };
  $('room-search').oninput = renderRooms;
  $('layer-add').onclick = () => { const n = prompt('Nom de la nouvelle couche', 'Nouvelle couche'); if (!n) return; const id = 'c' + Date.now().toString(36); ED.set('couches', '', [...ED.doc.couches, { id, nom: n.slice(0, 40), visible: true, verrou: false }]); S.activeLayer = id; renderLayers(); };
  $('z-in').onclick = () => { VIEW.zoomAt($('map').clientWidth / 2, $('map').clientHeight / 2, 1); zoomLabel(); };
  $('z-out').onclick = () => { VIEW.zoomAt($('map').clientWidth / 2, $('map').clientHeight / 2, -1); zoomLabel(); };
  const mm = $('minimap'); mm.onclick = (e) => { const k = Math.min(mm.width / WORLD.W, mm.height / WORLD.OVER_H), r = mm.getBoundingClientRect(); VIEW.goTo(Math.floor((e.clientX - r.left) * (mm.width / r.width) / k), Math.floor((e.clientY - r.top) * (mm.height / r.height) / k)); };
  setInterval(() => { drawMinimap(); zoomLabel(); }, 250);
  document.addEventListener('click', (e) => { if (!$('menu').contains(e.target) && e.target !== $('b-menu')) $('menu').classList.add('hidden'); });
}
function renderAll() { renderLib(); renderPaint(); renderMapPane(); renderLayers(); renderShow(); renderProps(); setTool('select'); zoomLabel(); }

boot().catch((e) => { console.error(e); $('boot-msg').textContent = 'LStudio n’a pas pu démarrer : ' + e.message; });
export { ZOOMS, unkey };
