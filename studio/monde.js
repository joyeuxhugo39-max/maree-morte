// LStudio — le monde (lot 3) : une île neuve dans la mer, une « carte » à part (un lieu de plein air rangé sous l'archipel,
// relié par des portes et des passages), et la vue du monde (les îles, les lieux, ce qui les relie, ce qui est isolé).
// Le jeu n'a qu'une grande carte de 960 × 560 cases : on ne l'agrandit pas, on la remplit. Une île neuve est peinte dans
// la mer ; une carte à part est une pièce de plein air, jusqu'à 200 × 72 cases.
import { T, OVER_H } from '../shared/constants.js';
import { worldGraph, key } from '../shared/studio-world.js';
import { ZONES } from '../shared/world.js';
import { fbm, hash2 } from '../shared/rng.js';

const water = (t) => t === T.WATER || t === T.DEEP;
// ---------------------------------------------------------------- une île neuve
// Une forme ronde, irrégulière (un bruit doux sur son bord, tiré de sa place : la même île à la même place), une plage,
// un haut-fond tout autour ; un peu de végétation du jeu si on le demande. Seulement en pleine mer.
export function islandPlan(world, cx, cy, w, h, o = {}) {
  const rx = w / 2, ry = h / 2, seed = (cx * 7919 + cy * 104729) % 100003, M = 4;
  const x0 = Math.floor(cx - rx - M), x1 = Math.ceil(cx + rx + M), y0 = Math.floor(cy - ry - M), y1 = Math.ceil(cy + ry + M);
  if (x0 < 2 || y0 < 2 || x1 >= world.W - 2 || y1 >= OVER_H - 3) return { err: 'trop près du bord de la carte' };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const i = y * world.W + x; if (!water(world.tiles[i]) || world.roomGrid[i] >= 0) return { err: 'il y a déjà de la terre (ou un haut-fond travaillé) ici : une île neuve se pose en pleine mer' }; }
  const land = o.terrain === 'JUNGLE' ? 'JUNGLE' : o.terrain === 'SAND' ? 'SAND' : o.terrain === 'DIRT' ? 'DIRT' : 'GRASS';
  const sol = new Map(), landCells = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = Math.sqrt(dx * dx + dy * dy) - (fbm(x / 5, y / 5, seed, 3) - 0.5) * 0.45;
    let t = null;
    if (d <= 0.78) t = land; else if (d <= 1) t = 'SAND'; else if (d <= 1 + 2.6 / Math.min(rx, ry) && world.tiles[y * world.W + x] === T.DEEP) t = 'WATER';
    if (!t) continue;
    sol.set(key(x, y), t); if (t !== 'WATER') landCells.push([x, y, t]);
  }
  // la végétation : des palmiers sur la plage, des arbres et des buissons dedans, quelques rochers et des fleurs
  const decors = [];
  if (o.vegetation !== false) {
    const taken = new Set();
    for (const [x, y, t] of landCells) {
      const r = hash2(x, y, seed), r2 = hash2(y, x, seed + 7);
      if ([[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, -1]].some(([a, b]) => taken.has(key(x + a, y + b)))) continue;
      let type = null;
      if (t === 'SAND') { if (r > 0.9 && (sol.get(key(x, y + 1)) || '') !== 'WATER') type = 'palm'; else if (r > 0.86) type = r2 > 0.5 ? 'shell' : 'driftwood'; }
      else if (r > 0.92) type = land === 'JUNGLE' ? 'jtree' : 'tree';
      else if (r > 0.86) type = land === 'JUNGLE' ? 'fern' : 'bush';
      else if (r > 0.84) type = 'rock';
      else if (r > 0.79 && land === 'GRASS') type = 'flower';
      if (type) { decors.push({ type, x, y, v: Math.floor(r2 * 3) }); taken.add(key(x, y)); }
    }
  }
  return { sol, land: landCells, decors, box: { x0, y0, x1, y1 } };
}
export function createIsland(ED, cx, cy, w, h, o = {}) {
  const P = islandPlan(ED.world, cx, cy, w, h, o); if (P.err) return P;
  ED.begin(`Île : ${o.nom || 'nouvelle île'}`);
  const by = new Map(); for (const [k, t] of P.sol) { if (!by.has(t)) by.set(t, []); const c = k.indexOf(','); by.get(t).push([+k.slice(0, c), +k.slice(c + 1)]); }
  for (const [t, cells] of by) ED.paint('sol', cells, t);
  if (o.region != null) ED.paint('regions', P.land.map(([x, y]) => [x, y]), o.region | 0);
  for (const d of P.decors) ED.placeDecor(d.type, d.x, d.y, { v: d.v, couche: ED.layer('nature') ? 'nature' : 'decors' });
  if (o.nom) ED.set('reperes', '', [...(ED.doc.reperes || []), { nom: o.nom.slice(0, 40), x: Math.round(cx), y: Math.round(cy) }]);
  ED.end();
  return P;
}
// ---------------------------------------------------------------- une carte à part (un lieu de plein air, sous l'archipel)
export const CARTE_SOLS = [['GRASS', 'Herbe'], ['SAND', 'Sable'], ['DIRT', 'Terre'], ['JUNGLE', 'Jungle'], ['COBBLE', 'Pavés'], ['CAVE', 'Sol de grotte'], ['PLANK', 'Planches'], ['FLOOR', 'Plancher']];
export function createCarte(ED, o = {}) {
  const w = Math.max(8, Math.min(200, o.w | 0 || 60)), h = Math.max(6, Math.min(72, o.h | 0 || 30));
  const spot = ED.freeSpot(w, h); if (!spot) return { err: `plus de place libre de ${w} × ${h} cases dans la bande des intérieurs` };
  ED.begin(`Carte : ${o.nom || 'nouvelle carte'}`);
  const pc = ED.createPiece({ nom: o.nom || 'Nouvelle carte', w, h, x: spot[0], y: spot[1], genre: o.sol === 'CAVE' ? 'cave' : 'house', dehors: o.dehors !== false, bord: o.bord || 'mer', mur: o.bord === '' ? '' : 'lointain', decoAuto: false, sortie: w >> 1 });
  if (o.sol && o.sol !== 'FLOOR') { const cells = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) cells.push([pc.x + x, pc.y + y]); ED.paint('sol', cells, o.sol); }
  ED.end();
  return { pc };
}
// ---------------------------------------------------------------- la vue du monde
export function installMonde(X) {
  const { ED, VIEW, WORLD, h, toast, modal } = X;
  async function showWorld() {
    const t0 = performance.now(), G = worldGraph(WORLD), ms = Math.round(performance.now() - t0);
    const big = G.islands.filter((i) => i.n >= 40), studioIsl = new Set(); for (const k of Object.keys(ED.doc.sol)) { const c = k.indexOf(','), id = G.islandAt(+k.slice(0, c), +k.slice(c + 1)); if (id) studioIsl.add(id); }
    const SCALE = 1, cw = WORLD.W * SCALE, ch = WORLD.H * SCALE;
    const cv = h('canvas', { width: cw, height: ch, style: 'width:100%;image-rendering:pixelated;cursor:crosshair;border-radius:6px;background:#0b1420' }), c = cv.getContext('2d');
    const show = { portes: true, jeu: false, noms: true };
    const draw = () => {
      c.imageSmoothingEnabled = false; c.clearRect(0, 0, cw, ch); c.drawImage(VIEW.mini, 0, 0, cw, ch);
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(0, OVER_H * SCALE, cw, ch - OVER_H * SCALE); // la bande des intérieurs
      c.fillStyle = '#9fb3c8'; c.font = '10px sans-serif'; c.fillText('Les intérieurs, les grottes et les cartes à part (sous l’archipel)', 6, OVER_H * SCALE + 12);
      for (const r of G.rooms) { if (!r.studio && !show.jeu) continue; c.strokeStyle = r.studio ? (r.reach ? '#ffd84a' : '#ff5a5a') : r.reach ? 'rgba(120,200,140,0.7)' : 'rgba(160,160,180,0.6)'; c.lineWidth = r.studio ? 1.5 : 1; c.strokeRect(r.x0 * SCALE, r.y0 * SCALE, r.w * SCALE, r.h * SCALE); }
      if (show.portes) for (const l of G.links) { if (!l.studio && !show.jeu) continue; c.strokeStyle = l.kind === 'passage' ? 'rgba(192,122,255,0.85)' : l.studio ? 'rgba(255,216,74,0.85)' : 'rgba(120,200,140,0.35)'; c.lineWidth = l.studio ? 1.2 : 0.7; c.beginPath(); c.moveTo(l.ax / 16 * SCALE, l.ay / 16 * SCALE); c.lineTo(l.bx / 16 * SCALE, l.by / 16 * SCALE); c.stroke(); }
      for (const I of big) {
        const col = !I.reach ? '#ff5a5a' : studioIsl.has(I.id) ? '#ffd84a' : '#8fd6a0';
        c.strokeStyle = col; c.lineWidth = studioIsl.has(I.id) || !I.reach ? 1.5 : 0.6; c.strokeRect(I.x0 * SCALE - 1, I.y0 * SCALE - 1, (I.x1 - I.x0 + 3) * SCALE, (I.y1 - I.y0 + 3) * SCALE);
        if (show.noms && I.n >= 300) { const nm = ZONES[I.zone] ? ZONES[I.zone].name : 'Île'; c.font = '10px sans-serif'; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText(nm, I.x0 * SCALE + 2, I.y0 * SCALE - 2); c.fillStyle = col; c.fillText(nm, I.x0 * SCALE + 1, I.y0 * SCALE - 3); }
      }
      const sp = WORLD.spawnPoint; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(sp.x / 16 * SCALE, sp.y / 16 * SCALE, 4, 0, 6.3); c.fill(); c.fillStyle = '#e0a84a'; c.beginPath(); c.arc(sp.x / 16 * SCALE, sp.y / 16 * SCALE, 2.5, 0, 6.3); c.fill();
    };
    draw();
    cv.addEventListener('click', (e) => { const r = cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / r.width * WORLD.W), y = Math.floor((e.clientY - r.top) / r.height * WORLD.H); document.getElementById('m-close').click(); VIEW.goTo(x, y, Math.max(1, VIEW.cam.z)); X.zoomLabel(); });
    // les listes : ce qui est isolé, les lieux de LStudio, les îles
    const lost = [...big.filter((I) => !I.reach).map((I) => ({ t: `Île de ${I.n} cases${I.boat ? '' : ' (sa côte ne touche pas la grande mer)'}`, x: I.cx, y: I.cy, studio: studioIsl.has(I.id) })), ...G.rooms.filter((r) => r.studio && !r.reach).map((r) => ({ t: `« ${r.name} »${r.entries ? ' : son entrée est hors d’atteinte' : ' : aucune entrée'}`, x: r.x0 + (r.w >> 1), y: r.y0 + (r.h >> 1), studio: true }))];
    const go = (x, y) => () => { document.getElementById('m-close').click(); VIEW.goTo(x, y, Math.max(1, VIEW.cam.z)); X.zoomLabel(); };
    const L = h('div', { class: 'plist', style: 'max-height:200px;overflow:auto' });
    if (!lost.length) L.append(h('p', { class: 'hint' }, 'Rien d’isolé : depuis l’arrivée des pirates, chaque île est accostable et chaque lieu de LStudio a une entrée atteignable.'));
    for (const it of lost) L.append(h('div', { class: 'li', on: { click: go(it.x, it.y) } }, h('span', {}, it.studio ? '⚠' : '·'), it.t, h('span', { class: 'x' }, `${it.x}, ${it.y}`)));
    const S2 = h('div', { class: 'plist', style: 'max-height:200px;overflow:auto' });
    const sr = G.rooms.filter((r) => r.studio);
    if (!sr.length) S2.append(h('p', { class: 'hint' }, 'Aucun lieu de LStudio encore.'));
    for (const r of sr) S2.append(h('div', { class: 'li', on: { click: go(r.x0 + (r.w >> 1), r.y0 + (r.h >> 1)) } }, h('span', {}, r.reach ? '🏠' : '⛔'), r.name, h('span', { class: 'x' }, `${r.entries} entrée(s)`)));
    const chk = (k, label) => h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: show[k], on: { change: (e) => { show[k] = e.target.checked; draw(); } } }), label);
    const body = h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:14px;align-items:start' },
      h('div', {}, cv, h('div', { class: 'row', style: 'gap:14px;margin-top:6px' }, chk('portes', 'Portes et passages'), chk('jeu', 'Lieux du jeu'), chk('noms', 'Noms des îles')),
        h('p', { class: 'hint' }, 'Le point blanc : l’arrivée des pirates. Vert : atteignable. Jaune : modifié dans LStudio. Rouge : hors d’atteinte. Traits jaunes : les portes de LStudio ; violets : les passages. Cliquez sur la carte pour vous y rendre.')),
      h('div', {}, h('h3', {}, `Isolé (${lost.length})`), L, h('h3', {}, `Lieux de LStudio (${sr.length})`), S2,
        h('h3', {}, 'Le monde'), h('p', { class: 'hint' }, `${big.length} îles (${big.filter((I) => I.boat).length} accostables), ${G.rooms.length} lieux, ${G.links.length} portes et passages. Calculé en ${ms} ms. Les lieux du jeu où l’on arrive par une mécanique (la plongée, les scènes du braquage, le festival) ne sont pas comptés comme isolés.`)));
    document.getElementById('modal').classList.add('wide');
    await modal('Vue du monde', body, [{ label: 'Fermer' }]);
    document.getElementById('modal').classList.remove('wide');
    void toast; void ED;
  }
  return { showWorld };
}
