// LStudio — l'éditeur de bâtiments (lot 2) : l'onglet « Bâtiments », l'outil Bâtir et ses modes, la sélection et les
// propriétés des pièces, des portes et des zones. Toutes les modifications passent par l'éditeur (annulables, et
// identiques au jeu : shared/studio-world.js).
import { PIECE_GENRES, PIECE_SOLS, PIECE_MURS, MUR_DECORS, ZONE_TYPES, BUILDING_PROPS, pieceEnvelope, porteExit, PIECE_BORDS, PIECE_MAX_W, PIECE_MAX_H, PERSO_LOOK, persoLook, persoId } from '../shared/studio-world.js';
import { humanSheet, FW, FH } from '../client/render/sprites-chars.js';
import { T, OVER_H } from '../shared/constants.js';
import { MUR_VARIANTES, AMBIANCES } from './catalogue.js';
import { MODELES, buildFromModel, interiorFor, addEtage } from './modeles.js';

const MODES = [
  ['murs', '🧱 Murs', 'Dessinez les cloisons dans une pièce (clic gauche : un mur ; clic droit : l’effacer). Une cloison horizontale se dessine sur deux rangées : la face du mur se voit alors comme dans les intérieurs du jeu. Laissez une ouverture pour passer.'],
  ['stylesol', '▦ Sol', 'Peignez le style du sol, case par case, dans une pièce (clic droit : celui de la pièce). Ce sont les sols du jeu : parquet, marbre, dalles, planches…'],
  ['stylemur', '▥ Style de mur', 'Peignez le style des murs : cliquez sur le sol au pied du mur (ou sur le mur). Clic droit : celui de la pièce.'],
  ['deco', '🖼 Décor mural', 'Accrochez une fenêtre, un tableau, une bibliothèque… : cliquez sur un mur (ou au pied d’un mur). Clic droit : le décrocher.'],
  ['zone', '▭ Zone', 'Tracez un rectangle sur la carte : une zone de message (un panneau, une inscription) ou de passage (un escalier, une trappe, vers un autre point).'],
  ['perso', '🧑 Personnage', 'Cliquez sur la carte pour poser un personnage : son nom, son apparence, ce qu’il dit quand on lui parle (E), et ce qu’il marmonne quand on passe près de lui. Il rejoint les personnages du jeu (et le codex).'],
];
export function installBatir(X) {
  const { S, ED, VIEW, WORLD, h, toast, field, num, sel, confirmBox } = X;
  S.build = { mode: 'murs', sol: 1, mur: 'salon', deco: { k: 'fenetre', n: 2, v: 0 }, zone: 'message', modele: null, pick: null };
  S.struct = null;
  const $ = (id) => document.getElementById(id);
  const cellsOf = (tx, ty) => { const n = S.brush || 1, o = Math.floor((n - 1) / 2), out = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push([tx - o + x, ty - o + y]); return out; };
  // ---------------------------------------------------------------- la sélection d'une pièce, d'une porte, d'une zone
  function selectStruct(st) { S.struct = st; VIEW.struct = st; if (st) VIEW.sel = []; VIEW.dirty = true; X.renderProps(); renderPane(); }
  // sous le pointeur : l'entrée d'une porte de LStudio, puis (si aucun décor n'est visé) une zone, puis une pièce
  function pickStruct(wx, wy, propHit) {
    for (const n of WORLD.npcs) if (n.studio && Math.abs(n.x - wx) < 8 && wy > n.y - 24 && wy < n.y + 2) return { k: 'personnage', uid: n.studio };
    for (const d of ED.doc.portes) { const D = ED.S.doorOf.get(d.uid); if (D && Math.hypot(D.ox - wx, D.oy - 5 - wy) < 9) return { k: 'porte', uid: d.uid }; }
    if (propHit) return null;
    const tx = Math.floor(wx / 16), ty = Math.floor(wy / 16);
    if (VIEW.show.zones) for (let i = ED.doc.zones.length - 1; i >= 0; i--) { const z = ED.doc.zones[i]; if (tx >= z.x && tx < z.x + z.w && ty >= z.y && ty < z.y + z.h) return { k: 'zone', uid: z.uid }; }
    const pc = ED.pieceAt(tx, ty) || ED.doc.pieces.find((p) => { const E = pieceEnvelope(p); return tx >= E.x0 && tx <= E.x1 && ty >= E.y0 && ty <= E.y1; });
    return pc ? { k: 'piece', uid: pc.uid } : null;
  }
  const goPiece = (pc) => { VIEW.goTo(pc.x + (pc.w >> 1), pc.y + (pc.h >> 1), Math.max(1, VIEW.cam.z)); X.zoomLabel(); };
  // ---------------------------------------------------------------- l'outil Bâtir sur la carte
  // ce que vise le décor mural : la case de sol au pied du mur (sous la case visée, ou elle-même), dans une pièce de LStudio
  function wallTarget(tx, ty) {
    const t = (x, y) => WORLD.tiles[y * WORLD.W + x], isF = (v) => v === T.FLOOR || v === T.STONEF;
    let yF = null;
    if (isF(t(tx, ty)) && t(tx, ty - 1) === T.IWALL) yF = ty;
    else if (t(tx, ty) === T.IWALL && isF(t(tx, ty + 1))) yF = ty + 1;
    else if (t(tx, ty) === T.IWALL && t(tx, ty + 1) === T.IWALL && isF(t(tx, ty + 2))) yF = ty + 2;
    if (yF == null) return null;
    const pc = ED.pieceAt(tx, yF); if (!pc) return null;
    return { pc, x: tx - pc.x, y: yF - pc.y };
  }
  function down(e, wx, wy, tx, ty) {
    const B = S.build, right = e.button === 2;
    if (B.pick) { // choisir un point sur la carte (l'arrivée d'un passage, l'entrée d'une porte)
      const P = B.pick; B.pick = null; VIEW.bhover = null;
      if (right) { toast('Choix annulé.'); X.setTool('select'); return null; }
      if (P.k === 'vers') { ED.changeZone(P.uid, { vers: { x: tx, y: ty } }); toast('Arrivée du passage choisie.'); X.setTool('select'); selectStruct({ k: 'zone', uid: P.uid }); }
      if (P.k === 'entree') {
        if (ty >= OVER_H) { toast('L’entrée d’une porte doit être dehors, sur l’archipel.', 'warn'); B.pick = P; return null; }
        const p = VIEW.pick(wx, wy), b = p && p.studio && BUILDING_PROPS.has(p.type) ? p.studio : null;
        const d = ED.addPorte(P.uid, b ? { batiment: b, nom: '' } : { x: tx, y: ty });
        toast(b ? 'Entrée créée : elle part de la porte dessinée du bâtiment.' : 'Entrée créée à cet endroit.'); X.setTool('select'); selectStruct({ k: 'porte', uid: d.uid });
      }
      if (P.k === 'porteDehors') { ED.changePorte(P.uid, { x: tx, y: ty, batiment: null }); X.setTool('select'); selectStruct({ k: 'porte', uid: P.uid }); }
      return null;
    }
    if (B.modele) { // poser un bâtiment complet
      const M = MODELES.find((m) => m.id === B.modele);
      if (right) { B.modele = null; VIEW.ghost = null; X.setTool('select'); renderPane(); return null; }
      if (ty >= OVER_H - 4) { toast('Un bâtiment se pose sur l’archipel ; son intérieur, LStudio le range tout seul dans la bande des intérieurs.', 'warn'); return null; }
      const r = buildFromModel(ED, M, tx, ty);
      if (r.err) { toast('Impossible : ' + r.err, 'err'); return null; }
      B.modele = null; VIEW.ghost = null; X.setTool('select'); X.select([{ k: 'd', uid: r.fac.uid }]);
      toast(`${M.nom} posé : la façade, son intérieur meublé et la porte qui les relie (Ctrl+Z pour tout annuler).`);
      renderPane(); return null;
    }
    if (B.mode === 'murs' || B.mode === 'stylesol' || B.mode === 'stylemur') {
      ED.begin(B.mode === 'murs' ? 'Murs' : 'Style'); const drag = { k: 'build', erase: right, last: [tx, ty] }; paintAt(tx, ty, right); return drag;
    }
    if (B.mode === 'deco') {
      const T0 = wallTarget(tx, ty); if (!T0) { toast('Visez un mur d’une pièce de LStudio (ou la case de sol à son pied).', 'warn'); return null; }
      if (right) { if (!ED.removeMurDeco(T0.pc.uid, T0.x, T0.y)) toast('Rien d’accroché ici.'); return null; }
      const n = Math.max(1, Math.min(6, B.deco.n | 0)), x = Math.min(T0.x, T0.pc.w - n);
      ED.addMurDeco(T0.pc.uid, { x: Math.max(0, x), y: T0.y, k: B.deco.k, n, v: B.deco.v });
      return null;
    }
    if (B.mode === 'perso') {
      if (right) return null;
      const t = WORLD.tiles[ty * WORLD.W + tx];
      if (WORLD.solid[ty * WORLD.W + tx] && t !== T.WATER) { toast('Choisissez une case libre (le personnage doit pouvoir s’y tenir).', 'warn'); return null; }
      const c = ED.addPerso(tx, ty); selectStruct({ k: 'personnage', uid: c.uid }); X.setTool('select');
      toast('Personnage posé : donnez-lui un nom, une apparence et ce qu’il dit (à droite).'); return null;
    }
    if (B.mode === 'zone') { if (right) return null; VIEW.zrect = { x0: tx, y0: ty, x1: tx, y1: ty, col: B.zone === 'passage' ? '#c07aff' : '#ffd84a' }; return { k: 'build', zone: [tx, ty] }; }
    return null;
  }
  function paintAt(tx, ty, erase) {
    const B = S.build, cells = cellsOf(tx, ty);
    if (B.mode === 'murs') {
      const inside = cells.filter(([x, y]) => { const pc = ED.pieceAt(x, y); if (!pc) return false; const E = pieceEnvelope(pc); return x > E.x0 && x < E.x1 && y > E.y0 + 1 && y < E.y1; });
      if (!inside.length) { if (!S._mursWarn) { S._mursWarn = 1; toast('Les cloisons se dessinent dans une pièce de LStudio (onglet Bâtiments : « Nouvelle pièce »).', 'warn'); } return; }
      ED.paint('sol', inside, erase ? undefined : 'IWALL');
    } else if (B.mode === 'stylesol') ED.paintStyle('sols', cells, erase ? null : B.sol | 0);
    else if (B.mode === 'stylemur') {
      const target = cells.map(([x, y]) => { const W0 = wallTarget(x, y); return W0 ? [W0.pc.x + W0.x, W0.pc.y + W0.y] : [x, y]; });
      ED.paintStyle('murs', target, erase ? null : B.mur);
    }
  }
  function move(drag, wx, wy, tx, ty) {
    if (drag.zone) { const [ax, ay] = drag.zone; Object.assign(VIEW.zrect, { x0: Math.min(ax, tx), y0: Math.min(ay, ty), x1: Math.max(ax, tx), y1: Math.max(ay, ty) }); VIEW.dirty = true; return; }
    const [lx, ly] = drag.last; const n = Math.max(Math.abs(tx - lx), Math.abs(ty - ly), 1);
    for (let i = 1; i <= n; i++) paintAt(Math.round(lx + (tx - lx) * i / n), Math.round(ly + (ty - ly) * i / n), drag.erase);
    drag.last = [tx, ty]; hover(tx, ty);
  }
  function up(drag) {
    if (drag.zone) {
      const R = VIEW.zrect; VIEW.zrect = null; if (!R) return;
      const w = R.x1 - R.x0 + 1, hh = R.y1 - R.y0 + 1;
      if (w > 64 || hh > 64) { toast('Une zone fait au plus 64 × 64 cases.', 'warn'); return; }
      const z = ED.addZone({ type: S.build.zone, x: R.x0, y: R.y0, w, h: hh, texte: '', bouton: '' });
      selectStruct({ k: 'zone', uid: z.uid });
      if (z.type === 'passage') { S.build.pick = { k: 'vers', uid: z.uid }; toast('Zone de passage tracée : cliquez maintenant là où elle mène (dans une pièce, ou dehors).'); }
      else toast('Zone de message tracée : écrivez son texte à droite.');
      return;
    }
    ED.end();
  }
  function hover(tx, ty) {
    const B = S.build; VIEW.bhover = null;
    if (B.pick) VIEW.bhover = { cells: [[tx, ty]], col: '#c07aff', fill: 'rgba(192,122,255,0.3)', label: B.pick.k === 'vers' ? 'Arrivée du passage' : 'Entrée de la porte' };
    else if (B.modele) X.ghostModel(MODELES.find((m) => m.id === B.modele), tx, ty);
    else if (B.mode === 'deco') { const T0 = wallTarget(tx, ty); if (T0) { const n = Math.max(1, B.deco.n | 0), x = Math.max(0, Math.min(T0.x, T0.pc.w - n)); VIEW.bhover = { cells: [...Array(n)].map((_, k) => [T0.pc.x + x + k, T0.pc.y + T0.y - 1]), col: '#ffd84a', label: MUR_DECORS[B.deco.k] }; } }
    else if (B.mode === 'perso') VIEW.bhover = { cells: [[tx, ty]], col: '#7dff9a', fill: 'rgba(125,255,154,0.2)', label: 'Personnage' };
    else if (B.mode !== 'zone') VIEW.bhover = { cells: cellsOf(tx, ty), col: B.mode === 'murs' ? '#ffb070' : '#9ad0ff', fill: 'rgba(255,255,255,0.08)' };
    VIEW.dirty = true;
  }
  // ---------------------------------------------------------------- l'onglet « Bâtiments »
  function setMode(m) { S.build.mode = m; S.build.modele = null; S.build.pick = null; VIEW.ghost = null; X.setTool('build'); renderPane(); }
  function renderPane() {
    const P = $('build-pane'); if (!P) return; P.innerHTML = '';
    P.append(h('h3', {}, 'Créer'), h('div', { class: 'btns' }, h('button', { class: 'primary', on: { click: newPieceDialog } }, '＋ Nouvelle pièce…')));
    P.append(h('h3', {}, 'Bâtiments complets'), h('p', { class: 'hint' }, 'Une façade, son intérieur meublé et la porte qui les relie, posés d’un clic sur la carte. Tout se modifie ensuite.'));
    const ML = h('div', { class: 'plist' });
    for (const M of MODELES) ML.append(h('div', { class: 'li' + (S.build.modele === M.id ? ' on' : ''), title: M.desc, on: { click: () => { S.build.modele = M.id; S.build.pick = null; X.setTool('build'); renderPane(); toast(`« ${M.nom} » : cliquez sur l’archipel pour poser la façade (clic droit : annuler).`); } } }, h('span', {}, '🏘'), M.nom, h('span', { class: 'x' }, `${M.piece.w} × ${M.piece.h}`)));
    P.append(ML);
    P.append(h('h3', {}, 'Outils'));
    const seg = h('div', { class: 'seg wrap' }); for (const [m, label] of MODES) seg.append(h('button', { class: S.tool === 'build' && S.build.mode === m && !S.build.modele ? 'on' : '', on: { click: () => setMode(m) } }, label)); P.append(seg);
    const B = S.build, M0 = MODES.find((m) => m[0] === B.mode);
    if (B.mode === 'murs' || B.mode === 'stylesol' || B.mode === 'stylemur') {
      const sz = h('div', { class: 'seg' }); for (const n of [1, 2, 3]) sz.append(h('button', { class: (S.brush || 1) === n ? 'on' : '', on: { click: () => { S.brush = n; renderPane(); } } }, String(n))); P.append(h('div', { class: 'row' }, h('span', {}, 'Pinceau'), sz));
    }
    if (B.mode === 'stylesol') { const L = h('div', { class: 'plist' }); for (const [k, n] of Object.entries(PIECE_SOLS)) L.append(h('div', { class: 'li' + (B.sol === +k ? ' on' : ''), on: { click: () => { B.sol = +k; setMode('stylesol'); } } }, n)); P.append(L); }
    if (B.mode === 'stylemur') { const L = h('div', { class: 'plist' }); for (const [k, n] of Object.entries(PIECE_MURS)) L.append(h('div', { class: 'li' + (B.mur === k ? ' on' : ''), on: { click: () => { B.mur = k; setMode('stylemur'); } } }, n)); P.append(L); }
    if (B.mode === 'deco') {
      const V = MUR_VARIANTES[B.deco.k];
      P.append(field('Décor', sel(B.deco.k, Object.entries(MUR_DECORS), (v) => { B.deco.k = v; B.deco.v = MUR_VARIANTES[v] ? MUR_VARIANTES[v][0][0] : 0; setMode('deco'); })),
        field('Largeur (cases)', num(B.deco.n, (v) => { B.deco.n = Math.max(1, Math.min(6, v | 0)); })),
        V ? field('Variante', sel(B.deco.v, V.map(([k, l]) => [k, l || String(k)]), (v) => { B.deco.v = isNaN(+v) ? v : +v; })) : null);
    }
    if (B.mode === 'zone') P.append(field('Genre', sel(B.zone, Object.entries(ZONE_TYPES), (v) => { B.zone = v; })));
    P.append(h('p', { class: 'hint' }, B.modele ? 'Cliquez sur l’archipel pour poser la façade. Clic droit : annuler.' : M0 ? M0[2] : ''));
    // les pièces de ce monde
    P.append(h('h3', {}, `Pièces de ce monde (${ED.doc.pieces.length})`));
    const L = h('div', { class: 'plist' });
    if (!ED.doc.pieces.length) L.append(h('p', { class: 'hint' }, 'Aucune pièce encore. Une pièce vit dans la bande des intérieurs, sous l’archipel : on y entre par une porte (dehors) ou par un passage.'));
    for (const pc of ED.doc.pieces) {
      const nIn = ED.doc.portes.filter((d) => d.piece === pc.uid).length + ED.doc.zones.filter((z) => z.vers && ED.pieceAt(z.vers.x, z.vers.y) === pc).length, valid = ED.S.pieceRooms.has(pc.uid);
      L.append(h('div', { class: 'li' + (S.struct && S.struct.uid === pc.uid ? ' on' : ''), on: { click: () => { selectStruct({ k: 'piece', uid: pc.uid }); goPiece(pc); } } }, h('span', {}, valid ? '🏠' : '⛔'), pc.nom, h('span', { class: 'x' }, `${pc.w} × ${pc.h}${nIn ? '' : ' · sans entrée'}`)));
    }
    P.append(L);
  }
  async function newPieceDialog() {
    const I = { nom: h('input', { value: 'Nouvelle pièce' }), w: h('input', { type: 'number', value: 12, min: 3, max: PIECE_MAX_W }), hh: h('input', { type: 'number', value: 8, min: 3, max: PIECE_MAX_H }), genre: sel('house', Object.entries(PIECE_GENRES), () => {}), sol: sel('FLOOR', [['FLOOR', 'Plancher'], ['STONEF', 'Dallage']], () => {}), style: sel(0, [[0, 'Celui du genre'], ...Object.entries(PIECE_SOLS)], () => {}), mur: sel('', [['', 'Celui du genre'], ...Object.entries(PIECE_MURS)], () => {}) };
    const body = h('div', {}, h('p', { class: 'hint' }, 'La pièce est rangée toute seule dans la bande des intérieurs, sous l’archipel, là où il y a de la place. Reliez-la ensuite à une entrée (dehors) ou à une autre pièce par un passage.'),
      field('Nom', I.nom), field('Largeur × hauteur (cases)', h('div', { class: 'two' }, I.w, I.hh)), field('Genre', I.genre), field('Sol', I.sol), field('Style du sol', I.style), field('Style des murs', I.mur));
    const r = await X.modal('Nouvelle pièce', body, [{ label: 'Annuler', value: false }, { label: 'Créer la pièce', value: true, cls: 'primary' }]);
    if (!r) return;
    const pc = ED.createPiece({ nom: I.nom.value.trim().slice(0, 60) || 'Nouvelle pièce', w: +I.w.value, h: +I.hh.value, genre: I.genre.value, sol: I.sol.value, style: +I.style.value, mur: I.mur.value });
    if (!pc) return toast('Plus de place libre de cette taille dans la bande des intérieurs.', 'err');
    selectStruct({ k: 'piece', uid: pc.uid }); goPiece(pc);
    toast('Pièce créée. Ajoutez-lui une entrée (à droite), des cloisons, des meubles.');
  }
  // ---------------------------------------------------------------- les propriétés
  function renderStruct(P) {
    const st = S.struct, H3 = (t) => h('h3', {}, t);
    const btns = (...b) => h('div', { class: 'btns' }, ...b);
    if (st.k === 'piece') {
      const pc = ED.piece(st.uid); if (!pc) { S.struct = null; return false; }
      const valid = ED.S.pieceRooms.has(pc.uid), ch = (f) => (v) => ED.changePiece(pc.uid, { [f]: v });
      P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, '🏠 ' + pc.nom), h('div', { class: 's' }, valid ? `Pièce de LStudio, ${pc.w} × ${pc.h} cases` : '⛔ Écartée : voir « Contrôle »'))));
      P.append(field('Nom', h('input', { value: pc.nom, on: { change: (e) => ch('nom')(e.target.value.slice(0, 60) || 'Pièce') } })));
      P.append(field('Genre', sel(pc.genre || 'house', Object.entries(PIECE_GENRES), ch('genre'))));
      P.append(field('Largeur × hauteur', h('div', { class: 'two' }, num(pc.w, (v) => { const why = ED.resizePiece(pc.uid, v | 0, pc.h); if (why) toast('Impossible : ' + why, 'warn'); }), num(pc.h, (v) => { const why = ED.resizePiece(pc.uid, pc.w, v | 0); if (why) toast('Impossible : ' + why, 'warn'); }))));
      P.append(field('Position (coin du sol)', h('div', { class: 'two' }, num(pc.x, (v) => movePiece(pc, v | 0, pc.y)), num(pc.y, (v) => movePiece(pc, pc.x, v | 0)))));
      P.append(field('Sol', sel(pc.sol || 'FLOOR', [['FLOOR', 'Plancher'], ['STONEF', 'Dallage']], ch('sol'))));
      P.append(field('Style du sol', sel(pc.style | 0, [[0, 'Celui du genre'], ...Object.entries(PIECE_SOLS)], (v) => ch('style')(+v))));
      P.append(field('Style des murs', sel(pc.mur || '', [['', 'Celui du genre'], ...Object.entries(PIECE_MURS)], ch('mur'))));
      P.append(field('Décor mural', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: pc.decoAuto !== false, on: { change: (e) => ch('decoAuto')(e.target.checked) } }), 'au hasard, en plus du vôtre')));
      P.append(field('Sortie (colonne)', h('div', { class: 'two' }, num(pc.sortie ?? (pc.w >> 1), (v) => ch('sortie')(v | 0)), h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: pc.sortie < 0, on: { change: (e) => ch('sortie')(e.target.checked ? -1 : pc.w >> 1) } }), 'aucune'))));
      P.append(field('Ambiance', sel(pc.ambiance || '', AMBIANCES, ch('ambiance'))));
      P.append(field('Ciel', h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!pc.dehors, on: { change: (e) => ch('dehors')(e.target.checked) } }), 'à ciel ouvert (une cour, un pont)')));
      P.append(field('Tout autour', sel(pc.bord || '', Object.entries(PIECE_BORDS), ch('bord'))));
      P.append(H3('Entrées'));
      const portes = ED.doc.portes.filter((d) => d.piece === pc.uid), arr = ED.doc.zones.filter((z) => z.vers && ED.pieceAt(z.vers.x, z.vers.y) === pc);
      if (!portes.length && !arr.length) P.append(h('p', { class: 'hint warn' }, 'Aucune entrée : personne ne peut venir ici. Ajoutez une porte (son entrée est dehors) ou un passage depuis une autre pièce.'));
      const EL = h('div', { class: 'plist' }); P.append(EL);
      for (const d of portes) EL.append(h('div', { class: 'li', on: { click: () => selectStruct({ k: 'porte', uid: d.uid }) } }, h('span', {}, '🚪'), d.nom || 'Porte', h('span', { class: 'x' }, d.batiment ? 'depuis un bâtiment' : `dehors (${d.x}, ${d.y})`)));
      for (const z of arr) EL.append(h('div', { class: 'li', on: { click: () => selectStruct({ k: 'zone', uid: z.uid }) } }, h('span', {}, '⇢'), z.bouton || 'Passage', h('span', { class: 'x' }, 'passage')));
      P.append(btns(h('button', { on: { click: () => { S.build.pick = { k: 'entree', uid: pc.uid }; X.setTool('build'); toast('Cliquez dehors, sur l’archipel : sur un bâtiment posé dans LStudio (l’entrée partira de sa porte), ou sur une case libre.'); } } }, '＋ Entrée…'),
        h('button', { on: { click: () => { const r = addEtage(ED, pc.uid); if (r.err) toast('Impossible : ' + r.err, 'err'); else { toast('Étage ajouté : un escalier dans chaque pièce (E pour monter, E pour descendre).'); selectStruct({ k: 'piece', uid: r.pc.uid }); goPiece(r.pc); } } } }, '＋ Étage'),
        h('button', { on: { click: () => goPiece(pc) } }, 'Aller voir')));
      P.append(btns(h('button', { class: 'danger', on: { click: async () => { const C = ED.contentsOf(pc); const n = C.decors.length + C.zones.length; const ans = await X.modal('Supprimer la pièce ?', `<p>« ${esc(pc.nom)} » et ses portes seront supprimées${n ? `, avec ce qu’elle contient (${C.decors.length} décor(s), ${C.zones.length} zone(s))` : ''}. Ctrl+Z la fait revenir.</p>`, [{ label: 'Annuler', value: false }, { label: 'Supprimer', value: true, cls: 'danger' }]); if (ans) { ED.removePiece(pc.uid, true); selectStruct(null); } } } }, 'Supprimer la pièce')));
      P.append(h('p', { class: 'hint' }, 'Glissez la pièce (une fois sélectionnée) pour la déplacer : ses meubles, ses cloisons et ses zones la suivent. Dans la pièce : les meubles viennent de la Bibliothèque (catégorie « Mobilier d’intérieur »), les cloisons, sols et décors muraux de l’outil Bâtir.'));
      return true;
    }
    if (st.k === 'porte') {
      const d = ED.porte(st.uid); if (!d) { S.struct = null; return false; }
      const D = ED.S.doorOf.get(d.uid), target = typeof d.piece === 'string' ? ED.piece(d.piece) : null;
      P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, '🚪 ' + (d.nom || (D && D.name) || 'Porte')), h('div', { class: 's' }, D ? 'Porte de LStudio' : '⛔ Écartée : voir « Contrôle »'))));
      P.append(field('Nom', h('input', { value: d.nom || '', placeholder: 'celui de la pièce', on: { change: (e) => ED.changePorte(d.uid, { nom: e.target.value.slice(0, 60) }) } })));
      const opts = [...ED.doc.pieces.map((p) => [p.uid, '🏠 ' + p.nom]), ...WORLD.rooms.filter((r) => !r.studio && WORLD.doors.slice(0, ED.S.baseDoors).some((q) => q.room === r.id && !q.dive)).map((r) => [String(r.id), r.name + ' (jeu)'])];
      P.append(field('Mène à', sel(typeof d.piece === 'number' ? String(d.piece) : d.piece, opts, (v) => ED.changePorte(d.uid, { piece: /^\d+$/.test(v) ? +v : v }))));
      if (d.batiment) P.append(field('Dehors', h('div', { class: 'two' }, h('span', { style: 'flex:1;padding-top:5px' }, 'devant la porte du bâtiment'), h('button', { class: 'mini', on: { click: () => { const b = ED.decorOf.get(d.batiment); if (b) X.select([{ k: 'd', uid: b.uid }]); } } }, 'Le bâtiment'))));
      else P.append(field('Dehors (case)', h('div', { class: 'two' }, num(d.x, (v) => ED.changePorte(d.uid, { x: v | 0 })), num(d.y, (v) => ED.changePorte(d.uid, { y: v | 0 })))), btns(h('button', { class: 'mini', on: { click: () => { S.build.pick = { k: 'porteDehors', uid: d.uid }; X.setTool('build'); toast('Cliquez sur l’archipel : l’entrée de la porte.'); } } }, 'Choisir sur la carte')));
      if (target) P.append(field('Sortie (colonne)', num(porteExit(target, d), (v) => ED.changePorte(d.uid, { sortie: Math.max(0, Math.min(target.w - 1, v | 0)) }))));
      P.append(btns(D ? h('button', { on: { click: () => { VIEW.goTo(Math.floor(D.ox / 16), Math.floor(D.oy / 16), Math.max(1, VIEW.cam.z)); } } }, 'Aller dehors') : null, D ? h('button', { on: { click: () => { VIEW.goTo(Math.floor(D.ix / 16), Math.floor(D.iy / 16), Math.max(1, VIEW.cam.z)); } } }, 'Aller dedans') : null,
        h('button', { class: 'danger', on: { click: () => { ED.set('porte', d.uid, undefined); selectStruct(null); } } }, 'Supprimer')));
      P.append(h('p', { class: 'hint' }, 'En jeu : on entre en poussant contre la porte (ou avec E), on ressort par le seuil de la pièce. Une porte vers une pièce du jeu en fait une deuxième entrée : on en ressort par l’entrée d’origine.'));
      return true;
    }
    if (st.k === 'personnage') {
      const c = ED.perso(st.uid); if (!c) { S.struct = null; return false; }
      const ch = (f) => (v) => ED.changePerso(c.uid, { [f]: v }), L = persoLook(c.look), setL = (f) => (v) => { const n = { ...L, [f]: /^\d+$/.test(v) ? +v : v }; if (f === 'hat' && !v) delete n.hat; ED.changePerso(c.uid, { look: n }); };
      const cv = document.createElement('canvas'); cv.width = FW * 4; cv.height = FH; cv.style.cssText = 'width:' + FW * 8 + 'px;image-rendering:pixelated;background:#2a3140;border-radius:6px';
      { const sh = humanSheet(L), x = cv.getContext('2d'); x.imageSmoothingEnabled = false; for (let d = 0; d < 4; d++) x.drawImage(sh.cv, 0, [0, 1, 2, 3][d] * FH, FW, FH, d * FW, 0, FW, FH); }
      P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, '🧑 ' + c.nom), h('div', { class: 's' }, (c.titre || 'Personnage de LStudio') + ` · case ${c.x}, ${c.y}`))), cv);
      P.append(field('Nom', h('input', { value: c.nom, on: { change: (e) => ch('nom')(e.target.value.slice(0, 40) || 'Inconnu') } })));
      P.append(field('Titre', h('input', { value: c.titre || '', placeholder: 'Marchande de cordes, vieux loup de mer…', on: { change: (e) => ch('titre')(e.target.value.slice(0, 60)) } })));
      P.append(field('Regarde', sel(c.dir || 0, [[0, 'vers le bas'], [1, 'vers la gauche'], [2, 'vers la droite'], [3, 'vers le haut']], (v) => ch('dir')(+v))));
      P.append(h('h3', {}, 'Apparence'));
      const C = PERSO_LOOK.colors.map((k) => [k, { red: 'rouge', navy: 'marine', green: 'vert', brown: 'brun', purple: 'violet', yellow: 'jaune', teal: 'sarcelle', black: 'noir', orange: 'orange', white: 'blanc' }[k]]);
      P.append(field('Peau', sel(L.skin, PERSO_LOOK.skin.map((k) => [k, ['claire', 'hâlée', 'mate', 'foncée'][k]]), setL('skin'))), field('Cheveux', h('div', { class: 'two' }, sel(L.hairStyle, PERSO_LOOK.hairStyle.map((k) => [k, k]), setL('hairStyle')), sel(L.hair, PERSO_LOOK.hair.map((k) => [k, ['noirs', 'bruns', 'châtains', 'roux', 'blonds', 'gris', 'blancs'][k]]), setL('hair')))),
        field('Barbe', sel(L.beard, [[0, 'aucune'], [1, 'courte'], [2, 'longue']], setL('beard'))), field('Haut', h('div', { class: 'two' }, sel(L.top, PERSO_LOOK.top.map((k) => [k, k]), setL('top')), sel(L.topCol, C, setL('topCol')))),
        field('Pantalon, bottes', h('div', { class: 'two' }, sel(L.pants, C, setL('pants')), sel(L.boots, C, setL('boots')))), field('Chapeau', h('div', { class: 'two' }, sel(L.hat || '', PERSO_LOOK.hat.map((k) => [k, k || 'aucun']), setL('hat')), L.hat ? sel(L.hatCol, C, setL('hatCol')) : null)));
      P.append(h('h3', {}, 'Ce qu’il dit'));
      P.append(field('Répliques', h('textarea', { rows: 3, placeholder: 'Une réplique par ligne : il en dit une au hasard quand on lui parle (E).', on: { change: (e) => ch('repliques')(e.target.value.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 12)) } }, (c.repliques || []).join('\n'))));
      P.append(field('Sujets', h('textarea', { rows: 3, placeholder: 'Une question | sa réponse, par ligne (des choix dans la conversation).', on: { change: (e) => ch('sujets')(e.target.value.split('\n').map((t) => t.split('|')).filter((a) => a.length >= 2 && a[0].trim() && a[1].trim()).map((a) => ({ q: a[0].trim(), a: a.slice(1).join('|').trim() })).slice(0, 8)) } }, (c.sujets || []).map((t) => t.q + ' | ' + t.a).join('\n'))));
      P.append(field('Marmonne', h('textarea', { rows: 2, placeholder: 'Une phrase courte par ligne : une bulle, de temps en temps, quand on passe près de lui.', on: { change: (e) => ch('bulles')(e.target.value.split('\n').map((t) => t.trim()).filter(Boolean).slice(0, 8)) } }, (c.bulles || []).join('\n'))));
      P.append(btns(h('button', { on: { click: () => VIEW.goTo(c.x, c.y, Math.max(1.5, VIEW.cam.z)) } }, 'Aller voir'), h('button', { class: 'danger', on: { click: () => { ED.set('personnage', c.uid, undefined); selectStruct(null); } } }, 'Supprimer')));
      P.append(h('p', { class: 'hint' }, 'Glissez-le (une fois sélectionné) pour le déplacer, ou flèches. En jeu, on lui parle avec E : sa réplique, puis ses sujets. Il rejoint le codex des personnages.'));
      void persoId; return true;
    }
    if (st.k === 'zone') {
      const z = ED.zone(st.uid); if (!z) { S.struct = null; return false; }
      const ch = (f) => (v) => ED.changeZone(z.uid, { [f]: v });
      P.append(h('div', { class: 'head' }, h('div', {}, h('div', { class: 't' }, (z.type === 'passage' ? '⇢ ' : '✉ ') + (z.bouton || ZONE_TYPES[z.type].split(' (')[0])), h('div', { class: 's' }, `Zone de LStudio, ${z.w} × ${z.h} cases`))));
      P.append(field('Genre', sel(z.type, Object.entries(ZONE_TYPES), ch('type'))));
      P.append(field('Bouton (E)', h('input', { value: z.bouton || '', placeholder: z.type === 'passage' ? 'Passer' : 'Lire', on: { change: (e) => ch('bouton')(e.target.value.slice(0, 40)) } })));
      if (z.type === 'message') {
        P.append(field('Titre', h('input', { value: z.titre || '', placeholder: 'Une inscription', on: { change: (e) => ch('titre')(e.target.value.slice(0, 60)) } })));
        P.append(field('Texte', h('textarea', { rows: 4, on: { change: (e) => ch('texte')(e.target.value.slice(0, 600)) } }, z.texte || '')));
      }
      P.append(field('Se déclenche', sel(z.auto ? '1' : '0', [['0', 'avec la touche E'], ['1', 'en entrant dans la zone']], (v) => ch('auto')(v === '1'))));
      P.append(field('Case (x, y)', h('div', { class: 'two' }, num(z.x, (v) => ch('x')(v | 0)), num(z.y, (v) => ch('y')(v | 0)))));
      P.append(field('Largeur × hauteur', h('div', { class: 'two' }, num(z.w, (v) => ch('w')(Math.max(1, Math.min(64, v | 0)))), num(z.h, (v) => ch('h')(Math.max(1, Math.min(64, v | 0)))))));
      if (z.type === 'passage') {
        P.append(field('Arrivée (case)', h('div', { class: 'two' }, num(z.vers ? z.vers.x : 0, (v) => ch('vers')({ x: v | 0, y: z.vers ? z.vers.y : 0 })), num(z.vers ? z.vers.y : 0, (v) => ch('vers')({ x: z.vers ? z.vers.x : 0, y: v | 0 })))));
        P.append(btns(h('button', { on: { click: () => { S.build.pick = { k: 'vers', uid: z.uid }; X.setTool('build'); toast('Cliquez là où le passage mène.'); } } }, 'Choisir l’arrivée sur la carte'), z.vers ? h('button', { on: { click: () => VIEW.goTo(z.vers.x, z.vers.y, Math.max(1, VIEW.cam.z)) } }, 'Aller à l’arrivée') : null));
      }
      P.append(btns(h('button', { class: 'danger', on: { click: () => { ED.set('zone', z.uid, undefined); selectStruct(null); } } }, 'Supprimer la zone')));
      P.append(h('p', { class: 'hint' }, z.type === 'passage' ? 'Un passage mène d’un point à un autre : d’une pièce à une autre (un escalier, une trappe, un étage), ou d’une pièce vers l’archipel. Le moteur du jeu vérifie qu’on part bien de la zone.' : 'Un message s’affiche dans la boîte de dialogue du jeu : un panneau, une inscription, une lettre oubliée.'));
      return true;
    }
    return false;
  }
  // le bâtiment sélectionné : son intérieur
  function buildingSection(P, ref, d) {
    if (ref.k !== 'd' || !d || d.type !== 'cite') return;
    const links = ED.doc.portes.filter((q) => q.batiment === ref.uid);
    P.append(h('h3', {}, 'Intérieur'));
    const LL = h('div', { class: 'plist' }); P.append(LL);
    if (links.length) for (const q of links) { const pc = typeof q.piece === 'string' ? ED.piece(q.piece) : null, r = typeof q.piece === 'number' ? WORLD.rooms[q.piece] : null; LL.append(h('div', { class: 'li', on: { click: () => { if (pc) { selectStruct({ k: 'piece', uid: pc.uid }); goPiece(pc); } else selectStruct({ k: 'porte', uid: q.uid }); } } }, h('span', {}, '🚪'), 'mène à : ' + (pc ? pc.nom : r ? r.name : '?'), h('span', { class: 'x' }, 'aller dedans'))); }
    else P.append(h('p', { class: 'hint' }, 'Sa porte ne mène encore nulle part.'));
    const opts = [['', 'Relier à une pièce existante…'], ...ED.doc.pieces.map((p) => [p.uid, '🏠 ' + p.nom])];
    P.append(h('div', { class: 'btns' }, h('button', { class: links.length ? '' : 'primary', on: { click: () => { const r = interiorFor(ED, ref.uid); if (r.err) return toast('Impossible : ' + r.err, 'err'); toast('Intérieur créé, relié à la porte du bâtiment.'); selectStruct({ k: 'piece', uid: r.pc.uid }); goPiece(r.pc); } } }, links.length ? 'Créer un autre intérieur' : 'Créer son intérieur'),
      ED.doc.pieces.length ? sel('', opts, (v) => { if (!v) return; const q = ED.addPorte(v, { batiment: ref.uid, nom: '' }); toast('Porte reliée.'); selectStruct({ k: 'porte', uid: q.uid }); }) : null));
  }
  function movePiece(pc, x, y) { const why = ED.movePiece(pc.uid, x, y); if (why) toast('Impossible : ' + why, 'warn'); }
  function deleteStruct() {
    const st = S.struct; if (!st) return;
    if (st.k === 'piece') { const pc = ED.piece(st.uid); if (pc) { ED.removePiece(pc.uid, true); toast(`Pièce « ${pc.nom} » supprimée avec son contenu (Ctrl+Z pour annuler).`); } }
    else ED.set(st.k, st.uid, undefined);
    selectStruct(null);
  }
  function nudge(dx, dy) {
    const st = S.struct; if (!st) return false;
    if (st.k === 'piece') { const pc = ED.piece(st.uid); if (pc) movePiece(pc, pc.x + dx, pc.y + dy); return true; }
    if (st.k === 'zone') { const z = ED.zone(st.uid); if (z) ED.changeZone(z.uid, { x: z.x + dx, y: z.y + dy }); return true; }
    if (st.k === 'personnage') { const c = ED.perso(st.uid); if (c) ED.changePerso(c.uid, { x: c.x + dx, y: c.y + dy }); return true; }
    if (st.k === 'porte') { const d = ED.porte(st.uid); if (d && !d.batiment) ED.changePorte(d.uid, { x: d.x + dx, y: d.y + dy }); return true; }
    return false;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return { renderPane, renderStruct, buildingSection, pickStruct, selectStruct, down, move, up, hover, deleteStruct, nudge, movePiece, goPiece };
}
