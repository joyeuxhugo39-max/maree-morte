// LStudio — le studio de création de Marée Morte. Démarrage, outils, panneaux, sauvegardes, aperçu, publication.
import { generateWorld, PROPS, ZONES, canStand } from '../shared/world.js';
import { T } from '../shared/constants.js';
import { emptyDoc, normalizeDoc, checkStudio, key, unkey, BUILDING_PROPS, TILE_NAMES, decodeAsset as decodeAssetPx } from '../shared/studio-world.js';
import { Renderer } from '../client/render/renderer.js';
import { MINI_COL } from '../client/render/terrain.js';
import { Editor } from './editor.js';
import { MapView, ZOOMS, zoneColor } from './view.js';
import { CATEGORIES, HORS_BIBLIOTHEQUE, nomDe, SOLS, STYLES_BATIMENT, EMPRISES } from './catalogue.js';
import { installBatir } from './batir.js';
import { interiorFor } from './modeles.js';
import { installStudioAssets, NOT_REPLACEABLE } from '../client/render/studio-assets.js';
import { readImageFile, newAssetId, bigPreview } from './assets.js';
import { installMonde, createIsland, createCarte, CARTE_SOLS } from './monde.js';
import { captureModel, placeModel, readModelFile } from './prefabs.js';
import { PIECE_BORDS } from '../shared/studio-world.js';
import { NPCS as NPCS_ } from '../shared/data/npcs.js';
import { store, stats, github, guessRepo, PUB_PATH } from './store.js';

const $ = (id) => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'on') for (const [ev, fn] of Object.entries(v)) e.addEventListener(ev, fn); else if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (v != null && v !== false) e.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(String(c))); return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const APERCU_KEY = 'lstudio:apercu';
const S = { tool: 'select', armed: null, armedV: 0, paintKind: 'sol', paintVal: { sol: 'SAND', regions: 1, collisions: 1, navigation: 1 }, brush: 1, erase: false, activeLayer: 'decors', clip: null, dirty: false, lastSaved: null, qc: null, space: false };
let ED, VIEW, R, WORLD, B, MO;

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
  const habilles = installStudioAssets(R.env, ED.doc); // 2.3 : les images importées (et les éléments qu'elles habillent)
  msg('Mise en place…', 90); await frame();
  VIEW = new MapView($('map'), ED, R);
  B = installBatir({ S, ED, VIEW, WORLD, h, toast, field, num, sel, confirmBox, modal, select, setTool, renderProps, zoomLabel, ghostModel });
  MO = installMonde({ ED, VIEW, WORLD, h, toast, modal, zoomLabel });
  VIEW.refreshSprites(habilles, new Set(ED.doc.assets.map((a) => a.id)));
  $('boot').classList.add('hidden'); $('app').classList.remove('hidden');
  VIEW.resize(); window.addEventListener('resize', () => VIEW.resize());
  wire();
  ED.on((ch) => {
    if (ch.dirty) markDirty(); if (ch.layers) renderLayers(); if (ch.reperes) renderReperes(); if (ch.structure || ch.history) S.structDirty = true;
    if (ch.assets) { const t = installStudioAssets(R.env, ED.doc); VIEW.refreshSprites(new Set([...t, ...(ch.assetTypes || [])]), ch.assetIds || new Set()); libCanvas.clear(); renderLib(); }
    schedulePanel();
  });
  renderAll();
  if (ED.report.ecartes.length) toast(`${ED.report.ecartes.length} modification(s) du brouillon n’ont pas pu être appliquées : voir « Contrôle ».`, 'warn');
  try { if (!(await store.get('aide_vue'))) { await store.put('aide_vue', 1); setTimeout(showHelp, 400); } } catch (e) { /* */ } // 2.4 : l'aide, au tout premier lancement
  toast(from === 'brouillon' ? 'Brouillon rouvert : vous reprenez où vous en étiez.' : from === 'publié' ? 'Nouveau brouillon, à partir du monde publié.' : 'Nouveau brouillon : le monde d’origine du jeu.');
  setSaveState();
  window.LS = { ED, VIEW, S, store, B, MO, R }; // pour les vérifications automatiques
  renderPrefabs();
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
  if (t !== 'place') { VIEW.ghost = null; if (S.prefab || S.island) { S.prefab = null; S.island = null; VIEW.pghost = null; } } if (t !== 'paint') VIEW.brush = null;
  if (t !== 'build' && S.build) { S.build.pick = null; S.build.modele = null; VIEW.bhover = null; if (B) B.renderPane(); }
  if (t === 'paint') showTab('left', 'paint');
  if (t === 'build') { showTab('left', 'build'); if (B) B.renderPane(); }
  $('map').style.cursor = t === 'pan' ? 'grab' : t === 'select' ? 'default' : 'crosshair'; VIEW.dirty = true; status();
}
function arm(type, v = 0) { S.prefab = null; S.island = null; S.armed = type; S.armedV = v; setTool('place'); renderLib(); toast(`« ${nomDe2(type)} » : cliquez sur la carte pour le poser (Échap pour arrêter).`); }
// 2.3 : le nom d'un élément de la bibliothèque, une image importée comprise ('image:<id>')
const assetOf = (t) => (t && t.startsWith('image:') ? ED.doc.assets.find((a) => a.id === t.slice(6)) : null);
function nomDe2(t) { const a = assetOf(t); return a ? a.nom || 'Image' : nomDe(t); }
const imageEmprise = (a) => [Math.max(1, Math.ceil(a.w / 16)), 1];
const cellAt = (wx, wy) => [Math.floor(wx / 16), Math.floor(wy / 16)];
function brushCells(tx, ty) { const n = S.brush, o = Math.floor((n - 1) / 2), out = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push([tx - o + x, ty - o + y]); return out; }
function paintAt(tx, ty) {
  const v = S.erase ? undefined : S.paintKind === 'sol' ? S.paintVal.sol : S.paintKind === 'regions' ? S.paintVal.regions : S.paintVal[S.paintKind];
  ED.paint(S.paintKind, brushCells(tx, ty), v);
}
function line(x0, y0, x1, y1, fn) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) fn(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)); }
function selected() { return VIEW.sel.filter((r) => { const p = ED.propOf(r); return p && WORLD.props.includes(p); }); }
function select(refs) { VIEW.sel = refs; if (refs.length && S.struct) { S.struct = null; VIEW.struct = null; } VIEW.dirty = true; renderProps(); }
const refEq = (a, b) => a.k === b.k && (a.k === 'd' ? a.uid === b.uid : a.id === b.id);
function wireMap() {
  const cv = $('map'); let drag = null;
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  cv.addEventListener('wheel', (e) => { e.preventDefault(); VIEW.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1 : -1); zoomLabel(); }, { passive: false });
  cv.addEventListener('pointerdown', (e) => {
    cv.focus(); cv.setPointerCapture(e.pointerId);
    const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY), [tx, ty] = cellAt(wx, wy);
    if (e.button === 1 || e.button === 2 && S.tool !== 'paint' && S.tool !== 'build' || S.tool === 'pan' || S.space) { drag = { k: 'pan', sx: e.offsetX, sy: e.offsetY, cx: VIEW.cam.x, cy: VIEW.cam.y }; cv.style.cursor = 'grabbing'; if (e.button === 2 && S.tool === 'place') { S.armed = null; S.prefab = null; S.island = null; setTool('select'); renderLib(); } return; }
    if (S.tool === 'place' && S.prefab) { const r = placeModel(ED, S.prefab, tx, ty, S.activeLayer); if (r.err) toast('Impossible : ' + r.err, 'err'); else { toast(`Modèle « ${S.prefab.nom} » posé${r.pieces.length ? ` (avec ${r.pieces.length} pièce(s))` : ''} : Ctrl+Z pour l’annuler.`); S.prefab = null; setTool('select'); select(r.refs); } return; }
    if (S.tool === 'place' && S.island) { const o = S.island, r = createIsland(ED, tx, ty, o.w, o.h, o); if (r.err) toast('Impossible : ' + r.err, 'warn'); else { toast(`Île « ${o.nom} » peinte : ${r.land.length} cases de terre${r.decors.length ? `, ${r.decors.length} arbres et rochers` : ''} (Ctrl+Z pour l’annuler). Vérifiez-la dans la vue du monde.`); S.island = null; setTool('select'); } return; }
    if (S.tool === 'place' && S.armed) { placeArmed(tx, ty, e.altKey ? wx : null, e.altKey ? wy : null); return; }
    if (S.tool === 'paint') { const er = S.erase; if (e.button === 2) S.erase = true; ED.begin(paintLabel()); paintAt(tx, ty); drag = { k: 'paint', tx, ty, er }; return; }
    if (S.tool === 'build') { const dr = B.down(e, wx, wy, tx, ty); if (dr) drag = dr; return; }
    // la sélection : l'entrée d'une porte, puis un décor, puis une zone, puis une pièce (lot 2)
    const p = VIEW.pick(wx, wy), st = B.pickStruct(wx, wy, p && !ED.locked(p));
    if (st && st.k === 'porte') { B.selectStruct(st); return; }
    if (st && (st.k === 'personnage' || !(p && !ED.locked(p)))) {
      if (S.struct && S.struct.k === st.k && S.struct.uid === st.uid && st.k !== 'porte') { drag = { k: 'smove', st, wx, wy, dx: 0, dy: 0 }; return; } // une seconde fois : on la déplace
      B.selectStruct(st); drag = { k: 'sclick', wx, wy, add: e.shiftKey }; return;
    }
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
      if (S.tool === 'place' && S.prefab) { VIEW.pghost = { x0: tx, y0: ty, x1: tx + S.prefab.w - 1, y1: ty + S.prefab.h - 1, col: '#ffd84a' }; VIEW.dirty = true; }
      else if (S.tool === 'place' && S.island) { const o = S.island; VIEW.pghost = { x0: tx - Math.ceil(o.w / 2 + 4), y0: ty - Math.ceil(o.h / 2 + 4), x1: tx + Math.ceil(o.w / 2 + 4), y1: ty + Math.ceil(o.h / 2 + 4), col: '#7dd8ff', fill: 'rgba(125,216,255,0.12)' }; VIEW.dirty = true; }
      else if (S.tool === 'place' && S.armed) ghostAt(tx, ty, e.altKey ? wx : null, e.altKey ? wy : null);
      if (S.tool === 'paint') { const n = S.brush, o = Math.floor((n - 1) / 2); VIEW.brush = { x: tx - o, y: ty - o, n, col: S.erase ? '#ff9a9a' : '#ffffff' }; VIEW.dirty = true; }
      if (S.tool === 'build') B.hover(tx, ty);
      status(); return;
    }
    if (drag.k === 'build') { B.move(drag, wx, wy, tx, ty); return; }
    if (drag.k === 'sclick') { if (Math.hypot(wx - drag.wx, wy - drag.wy) > 4 / VIEW.cam.z * 2) { drag = { k: 'marquee', wx: drag.wx, wy: drag.wy, add: drag.add }; VIEW.marquee = { x0: drag.wx, y0: drag.wy, x1: wx, y1: wy }; } return; }
    if (drag.k === 'smove') {
      drag.dx = Math.round((wx - drag.wx) / 16); drag.dy = Math.round((wy - drag.wy) / 16);
      const o = drag.st.k === 'piece' ? ED.piece(drag.st.uid) : drag.st.k === 'personnage' ? ED.perso(drag.st.uid) : ED.zone(drag.st.uid);
      if (o) { const E = drag.st.k === 'piece' ? { x0: o.x - 1, y0: o.y - 2, x1: o.x + o.w, y1: o.y + o.h } : drag.st.k === 'personnage' ? { x0: o.x, y0: o.y, x1: o.x, y1: o.y } : { x0: o.x, y0: o.y, x1: o.x + o.w - 1, y1: o.y + o.h - 1 }; const okp = drag.st.k !== 'piece' || !ED.canPut({ ...o, x: o.x + drag.dx, y: o.y + drag.dy }, o.uid); VIEW.pghost = { x0: E.x0 + drag.dx, y0: E.y0 + drag.dy, x1: E.x1 + drag.dx, y1: E.y1 + drag.dy, col: okp ? '#7dff9a' : '#ff6a6a', fill: okp ? 'rgba(125,255,154,0.1)' : 'rgba(255,106,106,0.12)' }; VIEW.dirty = true; }
      return;
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
    if (drag.k === 'build') B.up(drag);
    if (drag.k === 'smove') { VIEW.pghost = null; if (drag.dx || drag.dy) { if (drag.st.k === 'piece') { const o = ED.piece(drag.st.uid); if (o) B.movePiece(o, o.x + drag.dx, o.y + drag.dy); } else if (drag.st.k === 'personnage') { const c = ED.perso(drag.st.uid); if (c) ED.changePerso(c.uid, { x: c.x + drag.dx, y: c.y + drag.dy }); } else { const z = ED.zone(drag.st.uid); if (z) ED.changeZone(z.uid, { x: z.x + drag.dx, y: z.y + drag.dy }); } } }
    if (drag.k === 'move' && drag.started) ED.end();
    if (drag.k === 'marquee') { const m = VIEW.marquee; VIEW.marquee = null; const found = VIEW.inRect(m.x0, m.y0, m.x1, m.y1).map((p) => ED.refOf(p)); if (Math.abs(m.x1 - m.x0) > 3 || Math.abs(m.y1 - m.y0) > 3) select(drag.add ? [...VIEW.sel, ...found.filter((f) => !VIEW.sel.some((r) => refEq(r, f)))] : found); else if (!drag.add) select([]); }
    if (drag.k === 'pan') $('map').style.cursor = S.tool === 'pan' ? 'grab' : S.tool === 'select' ? 'default' : 'crosshair';
    drag = null; VIEW.dirty = true;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('pointerleave', () => { VIEW.hover = null; VIEW.brush = null; VIEW.bhover = null; if (S.tool === 'place' || (S.build && S.build.modele)) VIEW.ghost = null; VIEW.dirty = true; });
  // glisser-déposer depuis la bibliothèque
  cv.addEventListener('dragover', (e) => { e.preventDefault(); const t = e.dataTransfer.types.includes('text/lstudio') ? S.dragType : null; if (!t) return; const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY); const [tx, ty] = cellAt(wx, wy); S.armed = t; S.armedV = 0; ghostAt(tx, ty); });
  cv.addEventListener('drop', (e) => { e.preventDefault(); const t = S.dragType; if (!t) return; const [wx, wy] = VIEW.toWorld(e.offsetX, e.offsetY), [tx, ty] = cellAt(wx, wy); S.armed = t; placeArmed(tx, ty); VIEW.ghost = null; S.dragType = null; if (S.tool !== 'place') S.armed = null; });
}
function ghostAt(tx, ty, wx = null, wy = null) {
  const type = S.armed; if (!type) return;
  const A = assetOf(type);
  if (A) { const E = imageEmprise(A), s = VIEW.spr({ type: 'image', asset: A.id, v: 0 }); VIEW.ghost = { spr: s, x: tx * 16 + 8 + E[0] * 8 - 8, y: ty * 16 + 14, tx, ty, w: E[0], h: 1, ok: tx >= 0 && ty >= 0 && tx < WORLD.W && ty < WORLD.H }; VIEW.dirty = true; return; }
  const d = { type, v: S.armedV, tx, ty, x: 0, y: 0 };
  const isB = BUILDING_PROPS.has(type), E = EMPRISES[type] || [1, 1];
  const fake = { type, v: S.armedV, tx, ty, w: isB ? 5 : undefined, h: isB ? 4 : undefined, door: isB ? 2 : undefined, style: isB ? 'maison' : undefined };
  const s = VIEW.spr(fake);
  fake.x = isB ? tx * 16 + 8 + 5 * 8 - 8 : (wx != null ? Math.round(wx) : tx * 16 + 8 + E[0] * 8 - 8); fake.y = isB ? ty * 16 + 14 + 4 * 16 - 14 : (wy != null ? Math.round(wy) : ty * 16 + 14 + (E[1] - 1) * 16);
  VIEW.ghost = { spr: s, x: fake.x, y: fake.y, tx, ty, w: isB ? 5 : E[0], h: isB ? 4 : E[1], ok: tx >= 0 && ty >= 0 && tx < WORLD.W && ty < WORLD.H };
  VIEW.dirty = true; void d;
}
// le fantôme d'un bâtiment complet (la façade du modèle) sous le pointeur
function ghostModel(M, tx, ty) {
  if (!M) return; const F = M.facade, fake = { type: 'cite', v: 0, tx, ty, w: F.w, h: F.h, door: F.door, style: F.style };
  VIEW.ghost = { spr: VIEW.spr(fake), x: tx * 16 + 8 + F.w * 8 - 8, y: ty * 16 + 14 + F.h * 16 - 14, tx, ty, w: F.w, h: F.h, ok: ty < WORLD.OVER_H - 4 }; VIEW.dirty = true;
}
function placeArmed(tx, ty, wx = null, wy = null) {
  if (tx < 0 || ty < 0 || tx >= WORLD.W || ty >= WORLD.H) return toast('Hors de la carte.', 'warn');
  const L = ED.layer(S.activeLayer); if (!L || L.origine) S.activeLayer = 'decors';
  if (ED.layer(S.activeLayer) && ED.layer(S.activeLayer).verrou) return toast('La couche active est verrouillée.', 'warn');
  const A = assetOf(S.armed), E = EMPRISES[S.armed];
  const d = A ? ED.placeDecor('image', tx, ty, { couche: S.activeLayer, donnees: { asset: A.id }, emprise: imageEmprise(A), solide: 'tout' }) : ED.placeDecor(S.armed, tx, ty, { v: S.armedV, couche: S.activeLayer, ...(E ? { emprise: [E[0], E[1]], solide: E[2] || 'tout' } : {}) });
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
    if ((e.key === 'Delete' || e.key === 'Backspace') && S.struct) { B.deleteStruct(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { const s = selected(); if (s.length) { ED.remove(s); select([]); toast(`${s.length} élément(s) supprimé(s) (Ctrl+Z pour annuler).`); } return; }
    if (e.key === 'Escape') { if (S.tool === 'place') { S.armed = null; setTool('select'); renderLib(); } else if (S.tool === 'build' && (S.build.pick || S.build.modele)) { setTool('select'); toast('Annulé.'); } else if (S.struct) B.selectStruct(null); else select([]); return; }
    if (e.key.startsWith('Arrow') && S.struct && !selected().length) { e.preventDefault(); const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; B.nudge(d[0], d[1]); return; }
    if (e.key.startsWith('Arrow')) { const s = selected(); if (!s.length) { const k = e.shiftKey ? 160 : 48; VIEW.cam.x += e.key === 'ArrowLeft' ? -k : e.key === 'ArrowRight' ? k : 0; VIEW.cam.y += e.key === 'ArrowUp' ? -k : e.key === 'ArrowDown' ? k : 0; VIEW.clamp(); VIEW.dirty = true; return; } e.preventDefault(); const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (e.altKey) ED.move(s, 0, 0, d[0], d[1]); else ED.move(s, d[0], d[1]); return; }
    const k = e.key.toLowerCase();
    if (k === 'v') setTool('select'); else if (k === 'p') { if (S.armed) setTool('place'); else showTab('left', 'lib'); } else if (k === 'b') setTool('paint'); else if (k === 'h') setTool('pan'); else if (k === 'k') setTool('build');
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
  const A = assetOf(type), isB = BUILDING_PROPS.has(type), s = A ? VIEW.spr({ type: 'image', asset: A.id, v: 0 }) : VIEW.spr({ type, v, w: isB ? 5 : undefined, h: isB ? 4 : undefined, door: isB ? 2 : undefined, style: isB ? 'maison' : undefined });
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
  // 2.3 : vos images importées, en tête
  const imgs = ED.doc.assets.filter((a) => (!cat || cat === 'images') && (!q || norm(a.nom || '').includes(norm(q))) && (!onlyUsed || ED.doc.decors.some((d) => d.type === 'image' && d.donnees && d.donnees.asset === a.id) || a.remplace));
  if (imgs.length) {
    L.append(h('div', { class: 'cat' }, 'Vos images importées'));
    for (const a of imgs) {
      const t = 'image:' + a.id, cv = preview(t), n = ED.doc.decors.filter((d) => d.type === 'image' && d.donnees && d.donnees.asset === a.id).length;
      L.append(h('div', { class: 'it' + (S.armed === t ? ' on' : ''), draggable: 'true', title: `${a.nom} — ${a.w} × ${a.h} px, ${a.pal.length} couleurs — posée ${n} fois${a.remplace ? ` — habille « ${nomDe(a.remplace)} »` : ''}\nCliquer pour la poser ; ⚙ pour la modifier.`,
        on: { click: () => arm(t), dragstart: (e) => { S.dragType = t; e.dataTransfer.setData('text/lstudio', t); e.dataTransfer.effectAllowed = 'copy'; } } }, cv, h('div', { class: 'n' }, a.nom || 'Image'), h('div', { class: 'd' }, `${a.w} × ${a.h} px${n ? ' · ' + n + '×' : ''}${a.remplace ? ' · habille' : ''}`), h('button', { class: 'mini gear', title: 'Modifier cette image', on: { click: (e) => { e.stopPropagation(); assetDialog(a.id); } } }, '⚙')));
    }
  }
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
  for (const r of WORLD.rooms) { if (q && !r.name.toLowerCase().includes(q)) continue; RL.append(h('div', { class: 'li', on: { click: () => { VIEW.goTo(r.x0 + (r.w >> 1), r.y0 + (r.h >> 1), 1); zoomLabel(); } } }, r.studio ? h('span', {}, '🏠') : null, r.name, h('span', { class: 'x' }, `${r.w} × ${r.h}${r.studio ? ' · LStudio' : ''}`))); }
}
function renderReperes() {
  const L = $('rep-list'); L.innerHTML = '';
  if (!(ED.doc.reperes || []).length) L.append(h('p', { class: 'hint' }, 'Aucun repère. Un repère marque un endroit où vous travaillez (une future île, un quartier…).'));
  (ED.doc.reperes || []).forEach((r, k) => L.append(h('div', { class: 'li', on: { click: () => { VIEW.goTo(r.x, r.y); } } }, '📍', r.nom, h('span', { class: 'x' }, `${r.x}, ${r.y}`), h('button', { class: 'mini', title: 'Retirer ce repère', on: { click: (e) => { e.stopPropagation(); const L2 = ED.doc.reperes.slice(); L2.splice(k, 1); ED.set('reperes', '', L2); } } }, '✕'))));
}
// ------------------------------------------------------------------ 2.4 : rechercher dans ce monde
function searchWorld() {
  const L = $('monde-found'); L.innerHTML = '';
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), q = norm($('monde-search').value.trim());
  if (q.length < 2) return;
  const hit = (...t) => t.some((x) => norm(x).includes(q)), out = [];
  for (const pc of ED.doc.pieces) if (hit(pc.nom)) out.push(['🏠', pc.nom, 'pièce', () => { B.selectStruct({ k: 'piece', uid: pc.uid }); B.goPiece(pc); }]);
  for (const c of ED.doc.personnages) if (hit(c.nom, c.titre, ...(c.repliques || []))) out.push(['🧑', c.nom, c.titre || 'personnage', () => { B.selectStruct({ k: 'personnage', uid: c.uid }); VIEW.goTo(c.x, c.y, Math.max(1.5, VIEW.cam.z)); }]);
  for (const z of ED.doc.zones) if (hit(z.bouton, z.titre, z.texte, z.nom)) out.push([z.type === 'passage' ? '⇢' : '✉', z.bouton || z.titre || (z.texte || '').slice(0, 30) || 'Zone', z.type, () => { B.selectStruct({ k: 'zone', uid: z.uid }); VIEW.goTo(z.x, z.y, Math.max(1, VIEW.cam.z)); }]);
  for (const d of ED.doc.portes) if (hit(d.nom)) out.push(['🚪', d.nom, 'porte', () => B.selectStruct({ k: 'porte', uid: d.uid })]);
  for (const d of ED.doc.decors) if (hit(d.nom, d.donnees && d.donnees.nom)) out.push(['◆', d.nom || d.donnees.nom, nomDe(d.type), () => { select([{ k: 'd', uid: d.uid }]); VIEW.goTo(d.x, d.y, Math.max(1, VIEW.cam.z)); }]);
  for (const r of ED.doc.reperes || []) if (hit(r.nom)) out.push(['📍', r.nom, 'repère', () => VIEW.goTo(r.x, r.y)]);
  for (const a of ED.doc.assets) if (hit(a.nom)) out.push(['🖼', a.nom, 'image', () => assetDialog(a.id)]);
  for (const r of WORLD.rooms) if (!r.studio && hit(r.name)) out.push(['▣', r.name, 'lieu du jeu', () => VIEW.goTo(r.x0 + (r.w >> 1), r.y0 + (r.h >> 1), 1)]);
  ZONES.forEach((z, i) => { if (i && hit(z.name) && zoneCenters && zoneCenters[i]) out.push(['◎', z.name, 'région', () => VIEW.goTo(zoneCenters[i][0], zoneCenters[i][1], 1)]); });
  for (const n of WORLD.npcs) if (!n.studio && NPCS_[n.id] && hit(NPCS_[n.id].name, NPCS_[n.id].title)) out.push(['👤', NPCS_[n.id].name, 'personnage du jeu', () => VIEW.goTo(Math.floor(n.x / 16), Math.floor(n.y / 16), 1.5)]);
  if (!out.length) L.append(h('p', { class: 'hint' }, 'Rien ne correspond.'));
  for (const [ic, t, sub, go] of out.slice(0, 40)) L.append(h('div', { class: 'li', on: { click: () => { go(); zoomLabel(); } } }, h('span', {}, ic), t, h('span', { class: 'x' }, sub)));
}
// ------------------------------------------------------------------ 2.3 : les images importées
const HABILLABLES = () => CATEGORIES.flatMap((c) => c.types).filter((t) => PROPS[t] && R.env[t] && !NOT_REPLACEABLE.has(t));
function imageForm(an, A, opts = {}) {
  const spr = { cv: (() => { const c = document.createElement('canvas'); c.width = an.w; c.height = an.h; const dec = new ImageData(decodePx(an.enc || A), an.w, an.h); c.getContext('2d').putImageData(dec, 0, 0); return c; })(), w: an.w, h: an.h };
  const scale = Math.max(1, Math.min(6, Math.floor(240 / Math.max(an.w, an.h))));
  const name = h('input', { value: opts.nom || '' }), hab = sel(opts.remplace || '', [['', '— aucun (un décor à poser) —'], ...HABILLABLES().map((t) => [t, nomDe(t)])], () => {});
  const body = h('div', {}, h('div', { style: 'display:flex;gap:12px;align-items:flex-start' }, h('div', { style: 'flex:none' }, bigPreview(spr, scale)),
    h('div', {}, h('p', {}, `${an.w} × ${an.h} pixels (${Math.ceil(an.w / 16)} × ${Math.ceil(an.h / 16)} cases), ${(an.enc || A).pal.length} couleurs.`), ...(an.notes || []).map((n) => h('p', { class: 'hint' }, n)))),
    field('Nom', name), field('Habiller', hab), h('p', { class: 'hint' }, 'Habiller un élément du jeu : tous ses exemplaires (ceux du jeu et les vôtres) prennent ce dessin ; son nom, sa solidité et son rôle ne changent pas. Sinon, l’image se pose comme un décor, depuis la bibliothèque.'));
  return { body, name, hab };
}
const decodePx = (a) => { const out = new Uint8ClampedArray(a.w * a.h * 4); const enc = a; return decodeAssetPx(enc) || out; };
async function importImage(file) {
  let an; try { an = await readImageFile(file); } catch (e) { return toast('Import impossible : ' + e.message, 'err'); }
  const F = imageForm(an, an.enc, { nom: file.name.replace(/\.[a-z]+$/i, '').replace(/[_-]+/g, ' ').slice(0, 40) });
  const ok = await modal('Importer une image', F.body, [{ label: 'Annuler', value: false }, { label: 'Importer', value: true, cls: 'primary' }]);
  if (!ok) return;
  const id = newAssetId(), a = { id, nom: F.name.value.trim().slice(0, 40) || 'Image', ...an.enc };
  if (F.hab.value) a.remplace = F.hab.value;
  ED.set('asset', id, a);
  toast(a.remplace ? `« ${a.nom} » habille désormais « ${nomDe(a.remplace)} », partout dans le monde.` : `« ${a.nom} » est dans la bibliothèque (Vos images importées) : cliquez dessus, puis sur la carte.`);
  if (!a.remplace) { $('lib-search').value = ''; renderLib(); showTab('left', 'lib'); }
}
async function assetDialog(id) {
  const A = ED.doc.assets.find((a) => a.id === id); if (!A) return;
  const uses = ED.doc.decors.filter((d) => d.type === 'image' && d.donnees && d.donnees.asset === id);
  const F = imageForm({ w: A.w, h: A.h, enc: A }, A, { nom: A.nom, remplace: A.remplace });
  F.body.append(h('p', {}, `Posée ${uses.length} fois${A.remplace ? `, et elle habille les ${WORLD.props.filter((p) => p.type === A.remplace).length} « ${nomDe(A.remplace)} » du monde` : ''}.`));
  let replaced = null;
  const r = await modal(`Image « ${A.nom} »`, F.body, [
    { label: 'Remplacer le dessin…', run: () => new Promise((ok) => { const inp = h('input', { type: 'file', accept: 'image/png,image/gif,image/webp' }); inp.onchange = async () => { try { replaced = await readImageFile(inp.files[0]); toast(`Nouveau dessin prêt (${replaced.w} × ${replaced.h} px) : « Enregistrer » pour l’appliquer partout.`); } catch (e) { toast('Remplacement impossible : ' + e.message, 'err'); } ok(false); }; inp.click(); }) },
    { label: 'Supprimer', cls: 'danger', value: 'suppr' }, { label: 'Annuler', value: false }, { label: 'Enregistrer', cls: 'primary', value: 'ok' }]);
  if (r === 'suppr') {
    if (!(await confirmBox('Supprimer cette image ?', `${uses.length ? `Les ${uses.length} décor(s) qui la montrent seront supprimés aussi. ` : ''}${A.remplace ? `Les « ${esc(nomDe(A.remplace))} » reprendront leur dessin d’origine. ` : ''}Ctrl+Z la fait revenir.`, 'Supprimer', 'danger'))) return;
    ED.begin('Supprimer une image'); for (const d of uses) ED.set('decor', d.uid, undefined); ED.set('asset', id, undefined); ED.end(); select([]); return;
  }
  if (r !== 'ok') return;
  const n = { ...A, nom: F.name.value.trim().slice(0, 40) || A.nom, ...(replaced ? replaced.enc : {}) }; if (F.hab.value) n.remplace = F.hab.value; else delete n.remplace;
  ED.set('asset', id, n); toast(replaced ? `Dessin remplacé : les ${uses.length} décor(s) qui s’en servent ont suivi.` : 'Image modifiée.');
}
// ------------------------------------------------------------------ 2.3 : vos modèles
async function prefabList() { return (await store.get('modeles')) || []; }
async function renderPrefabs() {
  const P = $('prefab-pane'); if (!P) return; const list = await prefabList();
  P.innerHTML = '';
  P.append(h('h3', {}, `Vos modèles (${list.length})`, h('button', { class: 'mini', title: 'Importer un modèle (fichier)', on: { click: () => $('model-in').click() } }, '⬆ importer')));
  if (!list.length) P.append(h('p', { class: 'hint' }, 'Sélectionnez des éléments sur la carte (une maison meublée, un quai, un jardin), puis « ★ Enregistrer comme modèle » dans leurs propriétés : vous pourrez les reposer ailleurs, ici ou dans un autre monde. Un bâtiment emporte son intérieur, ses étages et ses meubles.'));
  const L = h('div', { class: 'plist' });
  for (const M of list) L.append(h('div', { class: 'li' + (S.prefab && S.prefab.id === M.id ? ' on' : ''), title: `${M.w} × ${M.h} cases, ${M.decors.length} élément(s)${M.pieces.length ? `, ${M.pieces.length} pièce(s)` : ''}. Cliquer, puis cliquer sur la carte pour le poser.`, on: { click: () => { S.armed = null; S.island = null; S.prefab = M; setTool('place'); renderPrefabs(); toast(`« ${M.nom} » : cliquez sur la carte pour le poser (son coin en haut à gauche). Clic droit : annuler.`); } } },
    h('span', {}, '★'), M.nom, h('span', { class: 'x' }, `${M.w} × ${M.h}${M.pieces.length ? ' · 🏠' + M.pieces.length : ''}`),
    h('button', { class: 'mini', title: 'Renommer', on: { click: async (e) => { e.stopPropagation(); const n = prompt('Nom du modèle', M.nom); if (!n) return; const l2 = await prefabList(); const m2 = l2.find((x) => x.id === M.id); if (m2) m2.nom = n.slice(0, 40); await store.put('modeles', l2); renderPrefabs(); } } }, '✎'),
    h('button', { class: 'mini', title: 'Exporter (fichier)', on: { click: (e) => { e.stopPropagation(); download(M, 'modele-' + M.nom); } } }, '⬇'),
    h('button', { class: 'mini', title: 'Supprimer ce modèle', on: { click: async (e) => { e.stopPropagation(); if (!(await confirmBox('Supprimer ce modèle ?', `« ${esc(M.nom)} » sera effacé de ce navigateur (ce qui a déjà été posé reste).`, 'Supprimer', 'danger'))) return; await store.put('modeles', (await prefabList()).filter((x) => x.id !== M.id)); renderPrefabs(); } } }, '✕')));
  P.append(L);
}
async function saveModelDialog(refs) {
  const name = h('input', { value: 'Mon modèle' }), peint = h('input', { type: 'checkbox', checked: true });
  const ok = await modal('Enregistrer comme modèle', h('div', {}, h('p', {}, `${refs.length} élément(s) sélectionné(s). Un bâtiment de LStudio emporte son intérieur, ses étages, ses meubles et ses zones.`), field('Nom', name), field('', h('label', { class: 'chk' }, peint, 'avec le sol peint et les collisions dessous')), h('p', { class: 'hint' }, 'Le modèle est rangé dans ce navigateur (pas dans le monde publié) ; « ⬇ » l’exporte en fichier, pour un autre ordinateur.')), [{ label: 'Annuler', value: false }, { label: 'Enregistrer', value: true, cls: 'primary' }]);
  if (!ok) return;
  const r = captureModel(ED, refs, name.value.trim().slice(0, 40) || 'Mon modèle', { peint: peint.checked });
  if (r.err) return toast(r.err, 'warn');
  await store.put('modeles', [...(await prefabList()), r.M]); renderPrefabs(); showTab('left', 'build');
  toast(`Modèle « ${r.M.nom} » enregistré (${r.M.w} × ${r.M.h} cases${r.M.pieces.length ? `, ${r.M.pieces.length} pièce(s)` : ''}) : onglet Bâtiments, « Vos modèles ».`);
}
async function importModelFile(file) {
  try { const M = readModelFile(JSON.parse(await file.text())); await store.put('modeles', [...(await prefabList()), M]); renderPrefabs(); showTab('left', 'build'); toast(`Modèle « ${M.nom} » importé.`); }
  catch (e) { toast('Import impossible : ' + e.message, 'err'); }
}
// ------------------------------------------------------------------ 2.3 : une île neuve, une carte à part
async function islandDialog() {
  const I = { nom: h('input', { value: 'Île nouvelle' }), w: h('input', { type: 'number', value: 30, min: 8, max: 120 }), hh: h('input', { type: 'number', value: 22, min: 6, max: 90 }), t: sel('GRASS', [['GRASS', 'Herbe'], ['JUNGLE', 'Jungle'], ['SAND', 'Sable'], ['DIRT', 'Terre']], () => {}), z: sel(10, ZONES.map((z, i) => [i, z.name]).filter(([i]) => i !== 0 && i !== 11 && i !== 12), () => {}), veg: h('input', { type: 'checkbox', checked: true }) };
  const ok = await modal('Nouvelle île', h('div', {}, h('p', { class: 'hint' }, 'Une île neuve se peint en pleine mer : une plage, un haut-fond autour, de la terre au milieu. Choisissez sa taille, puis cliquez sur la mer pour la poser (son centre). Tout se retouche ensuite au pinceau.'),
    field('Nom', I.nom), field('Largeur × hauteur', h('div', { class: 'two' }, I.w, I.hh)), field('Terre', I.t), field('Région', I.z), field('', h('label', { class: 'chk' }, I.veg, 'un peu de végétation (palmiers, arbres, buissons, rochers du jeu)'))),
  [{ label: 'Annuler', value: false }, { label: 'Choisir sa place', value: true, cls: 'primary' }]);
  if (!ok) return;
  S.armed = null; S.prefab = null; S.island = { nom: I.nom.value.trim().slice(0, 40) || 'Île nouvelle', w: Math.max(8, Math.min(120, +I.w.value | 0)), h: Math.max(6, Math.min(90, +I.hh.value | 0)), terrain: I.t.value, region: +I.z.value, vegetation: I.veg.checked };
  setTool('place'); VIEW.goTo(Math.floor(VIEW.cam.x / 16), Math.floor(VIEW.cam.y / 16), 0.5); zoomLabel(); toast('Cliquez en pleine mer : le centre de l’île (clic droit : annuler).');
}
async function carteDialog() {
  const I = { nom: h('input', { value: 'Nouvelle carte' }), w: h('input', { type: 'number', value: 80, min: 8, max: 200 }), hh: h('input', { type: 'number', value: 40, min: 6, max: 72 }), sol: sel('GRASS', CARTE_SOLS, () => {}), bord: sel('mer', Object.entries(PIECE_BORDS), () => {}), ciel: h('input', { type: 'checkbox', checked: true }) };
  const ok = await modal('Nouvelle carte', h('div', {}, h('p', { class: 'hint' }, 'Le jeu n’a qu’une grande carte (l’archipel, 960 × 448 cases), qu’on ne peut pas agrandir. Une « carte neuve » est un lieu à part, rangé sous l’archipel comme les grottes et les fonds marins du jeu : une crique cachée, un îlot secret, un souterrain. On y va par une porte ou un passage. Elle se peint, se meuble et se bâtit comme le reste.'),
    field('Nom', I.nom), field('Largeur × hauteur', h('div', { class: 'two' }, I.w, I.hh)), field('Sol', I.sol), field('Tout autour', I.bord), field('', h('label', { class: 'chk' }, I.ciel, 'à ciel ouvert (la lumière du jour et de la nuit)'))),
  [{ label: 'Annuler', value: false }, { label: 'Créer la carte', value: true, cls: 'primary' }]);
  if (!ok) return;
  const r = createCarte(ED, { nom: I.nom.value.trim().slice(0, 60) || 'Nouvelle carte', w: +I.w.value, h: +I.hh.value, sol: I.sol.value, bord: I.bord.value, dehors: I.ciel.checked });
  if (r.err) return toast('Impossible : ' + r.err, 'err');
  B.selectStruct({ k: 'piece', uid: r.pc.uid }); B.goPiece(r.pc); VIEW.cam.z = 0.75; zoomLabel();
  toast('Carte créée. Reliez-la au monde : « ＋ Entrée… » (une porte depuis l’archipel), ou une zone de passage.');
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
  for (const [k, label] of [['grille', 'Quadrillage (G)'], ['collisions', 'Collisions (rouge : bloque)'], ['regions', 'Régions'], ['navigation', 'Navigation (bleu : les bateaux passent)'], ['portes', 'Portes (vert : dehors, bleu : dedans)'], ['pieces', 'Pièces de LStudio (contour, nom)'], ['zones', 'Zones (jaune : message, violet : passage)'], ['pnj', 'Personnages']]) L.append(h('label', { class: 'chk li' }, h('input', { type: 'checkbox', checked: VIEW.show[k], on: { change: (e) => { VIEW.show[k] = e.target.checked; VIEW.dirty = true; } } }), label));
}
// ------------------------------------------------------------------ les propriétés
let panelT = null;
function schedulePanel() { clearTimeout(panelT); panelT = setTimeout(() => { renderProps(); if (S.structDirty) { S.structDirty = false; B.renderPane(); renderRooms(); } }, 60); }
function field(label, input) { return h('div', { class: 'field' }, h('span', {}, label), input); }
function num(v, on, step = 1) { return h('input', { type: 'number', value: v, step, on: { change: (e) => on(+e.target.value) } }); }
function sel(v, opts, on) { const s = h('select', { on: { change: (e) => on(e.target.value) } }); for (const [k, l] of opts) s.append(h('option', { value: k, selected: String(k) === String(v) }, l)); return s; }
function renderProps() {
  const P = $('props'); P.innerHTML = '';
  if (S.struct && B && B.renderStruct(P)) return; // lot 2 : une pièce, une porte, une zone
  const s = selected();
  if (!s.length) {
    const st = stats(ED.doc);
    P.append(h('p', { class: 'hint' }, 'Cliquez sur un élément de la carte pour le sélectionner (Maj : plusieurs ; glisser dans le vide : un cadre). Dans une pièce, cliquez sur le sol vide pour choisir la pièce.'),
      h('h3', {}, 'Ce monde'), field('Décors ajoutés', h('b', {}, st.decors)), field('Décors retouchés', h('b', {}, st.retouches)), field('Cases repeintes', h('b', {}, st.sol)), field('Régions peintes', h('b', {}, st.regions)), field('Collisions', h('b', {}, st.collisions)), field('Navigation', h('b', {}, st.navigation)), field('Pièces', h('b', {}, st.pieces)), field('Portes', h('b', {}, st.portes)), field('Zones', h('b', {}, st.zones)), field('Personnages', h('b', {}, (ED.doc.personnages || []).length)), field('Images', h('b', {}, (ED.doc.assets || []).length)),
      h('h3', {}, 'Raccourcis'), h('p', { class: 'hint', html: 'V sélection · P poser · B peindre · K bâtir · H main · Ctrl+Z / Ctrl+Y : annuler, rétablir · Ctrl+C / Ctrl+V : copier, coller · Ctrl+D : dupliquer · Suppr : supprimer · flèches : déplacer d’une case (Alt : d’un pixel) · [ et ] : variante · M : miroir · L : verrouiller · molette : zoom · Espace + glisser : se déplacer · Ctrl+S : enregistrer une version' }));
    return;
  }
  if (s.length > 1) {
    P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, `${s.length} éléments sélectionnés`), h('div', { class: 's' }, [...new Set(s.map((r) => nomDe(ED.propOf(r).type)))].slice(0, 4).join(', ')))));
    const studio = s.filter((r) => r.k === 'd');
    if (studio.length) P.append(field('Couche', sel('', [['', '—'], ...ED.doc.couches.filter((c) => !c.origine).map((c) => [c.id, c.nom])], (v) => { if (!v) return; ED.begin('Changer de couche'); for (const r of studio) ED.change(r, { couche: v }); ED.end(); })));
    P.append(h('div', { class: 'btns' }, h('button', { on: { click: duplicate } }, 'Dupliquer'), h('button', { on: { click: copySel } }, 'Copier'), studio.length ? h('button', { on: { click: () => { ED.begin('Verrouiller'); for (const r of studio) ED.change(r, { verrou: true }); ED.end(); } } }, 'Verrouiller') : null, h('button', { class: 'danger', on: { click: () => { ED.remove(s); select([]); } } }, 'Supprimer')));
    P.append(h('div', { class: 'btns' }, h('button', { on: { click: () => saveModelDialog(s) } }, '★ Enregistrer comme modèle…')));
    return;
  }
  const r = s[0], p = ED.propOf(r), d = ED.describe(r), isD = r.k === 'd', isB = BUILDING_PROPS.has(p.type);
  const cv = preview(p.type === 'image' ? 'image:' + p.asset : p.type, p.v);
  P.append(h('div', { class: 'head' }, cv, h('div', {}, h('div', { class: 't' }, (d.nom ? d.nom + ' — ' : '') + (p.type === 'image' ? nomDe2('image:' + p.asset) : nomDe(p.type))), h('div', { class: 's' }, isD ? 'Ajouté dans LStudio' : `Décor d’origine n° ${p.id}${ED.doc.retouches[p.id] ? ' (retouché)' : ''}`), h('div', { class: 's' }, cv.dataset.dim))));
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
        field('Nom', h('input', { value: D.nom || '', placeholder: 'le nom de l’entrée, en jeu', on: { change: (e) => ED.change(r, { 'donnees.nom': e.target.value.slice(0, 60) }) } })));
      B.buildingSection(P, r, d);
    }
    P.append(field('Couche', sel(d.couche || 'decors', ED.doc.couches.filter((c) => !c.origine).map((c) => [c.id, c.nom]), ch('couche'))));
    P.append(field('Nom', h('input', { value: d.nom || '', placeholder: 'facultatif', on: { change: (e) => ED.change(r, { nom: e.target.value.slice(0, 60) }) } })));
    P.append(field('Verrouillé', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!d.verrou, on: { change: (e) => ED.change(r, { verrou: e.target.checked }) } }), 'plus de déplacement (L)')));
  }
  if (p.type === 'image') { const A = ED.doc.assets.find((a) => a.id === p.asset); P.append(field('Image', h('div', { class: 'two' }, h('span', { style: 'flex:1;padding-top:5px' }, A ? `${A.nom} (${A.w} × ${A.h} px)` : '⛔ introuvable'), A ? h('button', { class: 'mini', on: { click: () => assetDialog(A.id) } }, '⚙ Modifier') : null))); }
  P.append(h('div', { class: 'btns' }, h('button', { on: { click: duplicate } }, 'Dupliquer'), h('button', { on: { click: copySel } }, 'Copier'), h('button', { on: { click: () => saveModelDialog([r]) } }, '★ Modèle…'),
    !isD && ED.doc.retouches[p.id] ? h('button', { on: { click: () => { ED.set('retouche', String(p.id), undefined); renderProps(); } } }, 'Rétablir l’original') : null,
    h('button', { class: 'danger', on: { click: () => { ED.remove([r]); select([]); } } }, isD ? 'Supprimer' : 'Retirer du monde')));
  if (!isD) P.append(h('p', { class: 'hint' }, 'Un décor du jeu : vos changements sont gardés comme des retouches, et « Rétablir l’original » le remet tel qu’il était.'));
}
// ------------------------------------------------------------------ la barre d'état, le zoom, la carte réduite
function status() {
  const [tx, ty] = S.mouse || [0, 0]; if (tx < 0 || ty < 0 || tx >= WORLD.W || ty >= WORLD.H) return;
  const i = ty * WORLD.W + tx, room = WORLD.roomGrid[i] >= 0 ? WORLD.rooms[WORLD.roomGrid[i]].name : null;
  const sol = SOLS.find(([n]) => T[n] === WORLD.tiles[i]);
  const tool = { select: 'Sélection', place: S.prefab ? `Poser le modèle « ${S.prefab.nom} »` : S.island ? `Poser l’île « ${S.island.nom} » (son centre, en pleine mer)` : S.armed ? `Poser « ${nomDe2(S.armed)} » (variante ${S.armedV + 1}, [ ] pour changer ; Alt : au pixel)` : 'Poser', paint: paintLabel() + ` (pinceau ${S.brush})`, pan: 'Main', build: S.build && S.build.pick ? 'Bâtir : choisissez un point sur la carte' : S.build && S.build.modele ? 'Bâtir : posez le bâtiment' : 'Bâtir : ' + ({ murs: 'cloisons', stylesol: 'style du sol', stylemur: 'style des murs', deco: 'décor mural', zone: 'zone' }[S.build && S.build.mode] || '') }[S.tool];
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
  const t0 = performance.now();
  if (!S.qcBase) { S.qcBase = { world: generateWorld(7, { studio: null }) }; } // le monde d'origine, pour voir ce que le document a coupé (une seule fois)
  const W2 = generateWorld(7, { studio: ED.doc });
  const qdeps = { PROPS, canStand, base: S.qcBase.world, baseReach: S.qcBase.reach };
  const issues = checkStudio(W2, ED.doc, qdeps);
  S.qcBase.reach = qdeps.baseReach; // (ce qu'on atteignait à pied dans le monde d'origine : calculé une fois)
  S.qc = issues; renderQC(Math.round(performance.now() - t0)); return issues;
}
function renderQC(ms) {
  const L = $('qc-list'), I = S.qc || [], nb = I.filter((i) => i.niveau === 'bloquant').length;
  $('qc-count').textContent = I.length ? String(I.length) : '';
  L.innerHTML = '';
  L.append(h('p', { class: 'hint' }, I.length ? `${nb} problème(s) bloquant(s), ${I.length - nb} avertissement(s)${ms ? ` (vérifié en ${ms} ms)` : ''}. Les problèmes bloquants empêchent la publication.` : `Aucun problème trouvé${ms ? ` (vérifié en ${ms} ms)` : ''}.`));
  // 2.4 : les références cassées (ce qui désigne quelque chose qui n'existe plus) se corrigent d'un coup, en une action
  const SAFE_REFS = new Set(['retouche', 'porte_ecartee', 'zone_ecartee', 'image_inconnue', 'asset_inconnu', 'decor_hors', 'sol_hors', 'sol_inconnu', 'habillage_inconnu', 'personnage_ecarte']);
  const refs = I.filter((i) => SAFE_REFS.has(i.code) && i.fix && i.fix.op !== 'aller');
  if (refs.length > 1) L.append(h('div', { class: 'btns' }, h('button', { on: { click: () => { ED.begin('Corriger les références cassées'); for (const i of refs) fix(i.fix); ED.end(); toast(`${refs.length} référence(s) cassée(s) corrigée(s) en une action (Ctrl+Z pour annuler).`); runQC(); } } }, `🧹 Corriger les ${refs.length} références cassées`)));
  for (const it of I.slice(0, 200)) {
    L.append(h('div', { class: 'qc' + (it.niveau === 'bloquant' ? ' b' : '') }, h('div', { class: 'm' }, (it.niveau === 'bloquant' ? '⛔ ' : '⚠ ') + it.msg), h('div', { class: 'w' }, `case ${it.x}, ${it.y}`),
      h('div', { class: 'btns' }, h('button', { class: 'mini', on: { click: () => { VIEW.goTo(it.x, it.y, Math.max(1, VIEW.cam.z)); zoomLabel(); } } }, 'Aller voir'), it.fix && it.fix.op !== 'aller' ? h('button', { class: 'mini', on: { click: () => { fix(it.fix); runQC(); } } }, fixLabel(it.fix)) : null)));
  }
}
const fixLabel = (f) => ({ retirer_retouche: 'Rétablir le décor d’origine', supprimer_porte: 'Supprimer cette porte', supprimer_zone: 'Supprimer cette zone', supprimer_image: 'Supprimer cette image', retirer_habillage: 'Retirer l’habillage', retirer_collision: 'Retirer cette collision', supprimer_perso: 'Supprimer ce personnage', supprimer: 'Supprimer ce décor', retirer_sol: 'Annuler ce sol', liberer: 'Libérer la case', interieur: 'Créer son intérieur', retirer_deco: 'Décrocher ce décor' }[f.op] || 'Corriger');
function fix(f) {
  if (f.op === 'supprimer_perso') ED.set('personnage', f.uid, undefined);
  else if (f.op === 'retirer_retouche') ED.set('retouche', String(f.id), undefined);
  else if (f.op === 'supprimer_porte') ED.set('porte', f.uid, undefined);
  else if (f.op === 'supprimer_zone') ED.set('zone', f.uid, undefined);
  else if (f.op === 'retirer_collision') ED.set('collisions', f.k, undefined);
  else if (f.op === 'retirer_habillage') { const a = ED.doc.assets.find((q) => q.id === f.id); if (a) { const n = { ...a }; delete n.remplace; ED.set('asset', a.id, n); } }
  else if (f.op === 'supprimer_image') { ED.begin('Supprimer une image'); for (const d of ED.doc.decors.filter((q) => q.type === 'image' && q.donnees && q.donnees.asset === f.id)) ED.set('decor', d.uid, undefined); ED.set('asset', f.id, undefined); ED.end(); }
  else if (f.op === 'interieur') { const r = interiorFor(ED, f.uid); if (r.err) toast('Impossible : ' + r.err, 'err'); else toast('Intérieur créé, relié à la porte du bâtiment.'); }
  else if (f.op === 'retirer_deco') ED.removeMurDeco(f.uid, f.x, f.y);
  else if (f.op === 'supprimer') ED.set('decor', f.uid, undefined);
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
  <li><b>Bâtir</b> : onglet « Bâtiments » — posez un bâtiment complet (façade, intérieur meublé, porte), ou créez une pièce, dessinez ses cloisons, ses sols et ses murs, accrochez des fenêtres et des tableaux, reliez-la à une entrée dehors, ajoutez un étage, tracez des zones (un message, un passage).</li>
  <li><b>Des personnages</b> : outil Bâtir → « 🧑 Personnage » : un nom, une apparence, ce qu’il dit quand on lui parle, ce qu’il marmonne quand on passe.</li>
  <li><b>Le monde</b> : onglet « Monde » — la vue du monde (les îles, les lieux, ce qui les relie, ce qui est isolé), une île neuve peinte en pleine mer, une carte à part (un lieu de plein air sous l’archipel).</li>
  <li><b>Vos modèles</b> : sélectionnez des éléments, « ★ Enregistrer comme modèle », et reposez-les ailleurs (onglet Bâtiments).</li>
  <li><b>Vos images</b> : « ＋ Image » dans la bibliothèque importe votre pixel art (PNG, GIF, WebP) ; il se pose comme un décor, ou habille un élément du jeu.</li>
  <li><b>Couches</b> : rangez vos ajouts, masquez-les, verrouillez-les.</li>
  <li><b>Vérifier</b> : le contrôle cherche ce qui serait cassé (un décor inconnu, une porte bouchée, un personnage muré, un chemin coupé, un lieu isolé…), dit où, et propose une correction ; les références cassées se corrigent d’un coup.</li>
  <li><b>Tester dans le jeu</b> : le vrai jeu s’ouvre, en solo, avec vos modifications. Votre pirate y est copié : sa vraie sauvegarde n’est jamais touchée.</li>
  <li><b>Publier</b> : vos modifications partent dans le jeu pour tout le monde (il faut une clé GitHub qui a le droit d’écrire dans le dépôt).</li>
  </ol>
  <p>Tout est enregistré automatiquement dans ce navigateur. « Enregistrer » garde en plus une version nommée ; « Versions » permet de revenir en arrière. Exportez de temps en temps un fichier : c’est votre copie de sécurité hors du navigateur.</p>`);
}
// ------------------------------------------------------------------ le câblage
function wire() {
  wireMap(); wireKeys();
  for (const b of document.querySelectorAll('#tools button')) b.onclick = () => { if (b.dataset.tool === 'place' && !S.armed) { showTab('left', 'lib'); toast('Choisissez d’abord un élément dans la bibliothèque.'); return; } setTool(b.dataset.tool); };
  for (const nav of document.querySelectorAll('.tabs')) for (const b of nav.querySelectorAll('button')) b.onclick = () => { showTab(nav.dataset.for, b.dataset.tab); if (b.dataset.tab === 'paint') setTool('paint'); if (b.dataset.tab === 'build') B.renderPane(); };
  $('b-undo').onclick = () => { const l = ED.undo(); toast(l ? 'Annulé : ' + l : 'Rien à annuler.'); };
  $('b-redo').onclick = () => { const l = ED.redo(); toast(l ? 'Rétabli : ' + l : 'Rien à rétablir.'); };
  $('b-save').onclick = () => saveVersion(); $('b-versions').onclick = showVersions; $('b-check').onclick = runQC; $('qc-run').onclick = runQC;
  $('b-test').onclick = testInGame; $('b-publish').onclick = showPublish; $('b-menu').onclick = showMenu;
  $('file-in').onchange = (e) => { const f = e.target.files[0]; if (f) importFile(f); e.target.value = ''; };
  $('doc-name').value = ED.doc.meta.nom; $('doc-name').onchange = (e) => { ED.set('meta', 'nom', e.target.value.trim().slice(0, 60) || 'Mon monde'); };
  $('lib-search').oninput = renderLib; $('lib-used').onchange = renderLib;
  const C = $('lib-cat'); C.append(h('option', { value: '' }, 'Toutes les catégories'), h('option', { value: 'images' }, 'Vos images importées')); for (const c of CATEGORIES) C.append(h('option', { value: c.id }, c.nom)); C.onchange = renderLib;
  $('img-import').onclick = () => $('img-in').click();
  $('img-in').onchange = (e) => { const f = e.target.files[0]; if (f) importImage(f); e.target.value = ''; };
  $('model-in').onchange = (e) => { const f = e.target.files[0]; if (f) importModelFile(f); e.target.value = ''; };
  $('monde-vue').onclick = () => MO.showWorld(); $('monde-ile').onclick = islandDialog; $('monde-carte').onclick = carteDialog;
  $('monde-search').oninput = searchWorld;
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
