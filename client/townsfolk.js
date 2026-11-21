// Les habitants des villes et leur journée. Monde vivant, lot 5 : chacun a un métier et des occupations crédibles.
//  - le marchand tient son étal ; le client va d'un étal à l'autre, entre dans une boutique ;
//  - le docker porte des caisses entre les tas et le bord du quai ; le pêcheur pêche au bord de l'eau ;
//  - l'artisan travaille à son établi ; le guet tient son poste le jour, fait sa ronde le soir, lanterne à la main ;
//  - l'habitant fait ses courses (le puits, un banc, le marché), le voyageur arrive par la route et va à l'auberge ;
//  - le soir, on se retrouve devant la taverne ; la nuit, chacun rentre chez soi.
// Les conversations passent par un « metteur en scène » : une ou deux scènes visibles à la fois, trois personnes au
// plus, des répliques qui se répondent (townsfolk-lines.js), des pauses irrégulières, jamais la même scène à quelques
// minutes d'écart, et beaucoup de silences. Tout se passe chez le client : un décor vivant, sans coût pour le serveur.
import { moveWithCollision, zoneAt, canStand, Z } from '../shared/world.js';
import { TILE, T, dayFrac, weatherAt, isFullMoon } from '../shared/constants.js';
import { mulberry32 } from '../shared/rng.js';
import { CLOTH_KEYS } from './render/sprites-chars.js';
import { SCENES, CRIES, GREET, WANTED } from './townsfolk-lines.js';

// les habitants ne pataugent pas : l'eau peu profonde, praticable pour un joueur, ne l'est pas pour eux
export const dry = (W, x, y) => { const t = W.tiles[Math.floor(y / TILE) * W.W + Math.floor(x / TILE)]; return t !== T.WATER && t !== T.DEEP; };
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0));
// heures : f = 0 → 7h ; 19h → 0,5 ; 23h → 0,667 ; 5h → 0,917
export function phaseOf(f) { return f < 0.5 ? 'jour' : f < 0.667 ? 'soir' : f < 0.917 ? 'nuit' : 'aube'; }
// les villes peuplées et leurs métiers (l'ordre compte : on retire d'abord les derniers si une ville manque de place)
const CITIES = [
  [Z.TOWN, ['guet', 'guet', 'marchand', 'marchand', 'marchand', 'docker', 'docker', 'pecheur', 'pecheur', 'artisan', 'habitant', 'habitant', 'habitant', 'client', 'voyageur']],
  [Z.LIBERTALIA, ['guet', 'guet', 'guet', 'guet', 'marchand', 'marchand', 'marchand', 'marchand', 'marchand', 'marchand', 'marchand', 'client', 'client', 'client', 'client', 'client', 'client', 'docker', 'docker', 'docker', 'pecheur', 'pecheur', 'artisan', 'artisan', 'habitant', 'habitant', 'habitant', 'habitant', 'voyageur', 'voyageur', 'contrebandier']],
  [Z.RADE, ['guet', 'matelot', 'matelot', 'docker', 'pecheur', 'pecheur', 'habitant', 'marchand']],
  [Z.HAVRE, ['pecheur', 'pecheur', 'pecheur', 'habitant', 'habitant', 'marchand']],
  [Z.ANSE, ['habitant', 'habitant', 'habitant', 'pecheur']],
];
const PUBS = ['tavern', 'auberge', 'tripot', 'velours'];
const SHOPS = ['forge', 'armurerie', 'apothicaire', 'couture', 'capitainerie', 'chantier', 'receleur', 'ecurie'];
const PUB_LINES = ['À la tienne !', 'Ha ! Ha ! Ha !', 'Un rhum, Rosalie !']; // les rires isolés dans une taverne pleine (rares)

export class Townsfolk {
  constructor(G) {
    this.G = G; this.folk = G.folk; this.cats = G.cats; this.streets = new Map(); this.poi = new Map();
    this.convs = []; this.recent = new Map(); this.said = new Map(); this.cityNext = new Map(); this.nextTry = 0; this.greetAt = 0; this.cryAt = new Map();
    const W = G.world, rng = mulberry32(4242);
    this.rng = rng;
    const pick = (a) => a[Math.floor(rng() * a.length)];
    // les rues : pavés (et chemins) de chaque ville
    for (const [z] of CITIES) this.streets.set(z, []);
    for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
      const i = y * W.W + x, z = W.zones[i];
      const list = this.streets.get(z);
      if (!list || W.solid[i]) continue;
      const t = W.tiles[i];
      if (t === T.COBBLE || t === T.PLANK || t === T.DIRT || (z !== Z.TOWN && z !== Z.LIBERTALIA && t === T.SAND)) list.push([x * TILE + 8, y * TILE + 10]);
    }
    let id = 0;
    for (const [z, roles0] of CITIES) {
      const st = this.streets.get(z); if (!st || st.length < 10) continue;
      const P = this.buildPoi(z, st); this.poi.set(z, P);
      // une ville sans quai n'a ni docker ni pêcheur ; sans étal, pas de marchand
      let mk = 0; const nFree = P.stalls.filter((s) => !s.held).length;
      const roles = roles0.map((r) => ((r === 'docker' || r === 'pecheur') && !P.quay.length ? 'habitant' : r === 'docker' && !P.crates.length ? 'matelot' : r === 'marchand' && mk++ >= nFree ? 'client' : r === 'artisan' && !P.work.length ? 'habitant' : r));
      let stallK = 0; const freeStalls = P.stalls.filter((s) => !s.held); // un habitant ne s'installe qu'à un étal libre
      for (let i = 0; i < roles.length; i++) {
        const role = roles[i];
        const look = this.lookFor(role, rng, pick);
        const home = P.homes.length ? pick(P.homes) : null, pub = P.pubs.length ? pick(P.pubs) : null;
        const [x, y] = pick(st);
        const f = { k: 'f', id: -100 - id++, x, y, tx: x, ty: y, dir: 0, moving: false, walk: 0, wait: rng() * 4, look, lookKey: JSON.stringify(look), weapon: null,
          role, city: z, home: home ? [home.ox, home.oy + 4] : pick(st), pub: pub ? [pub.ox + (rng() - 0.5) * 50, pub.oy + 14 + rng() * 26] : pick(st), lantern: false, hidden: false, sing: rng() < 0.4,
          seed: rng(), act: null, actUntil: 0 };
        if (role === 'marchand') f.stall = freeStalls[stallK++ % freeStalls.length];
        if (role === 'pecheur') f.spots = this.subset(P.quay, 4, rng);
        if (role === 'docker') { f.spots = this.subset(P.quay, 3, rng); const q0 = f.spots[0]; f.piles = P.crates.slice().sort((a, b) => Math.hypot(a.x - q0.x, a.y - q0.y) - Math.hypot(b.x - q0.x, b.y - q0.y)).slice(0, 2); f.spots = f.spots.filter((s) => Math.hypot(s.x - q0.x, s.y - q0.y) < 220); } // il travaille entre un bout de quai et les tas de caisses les plus proches
        if (role === 'artisan') f.station = pick(P.work);
        if (role === 'guet') { f.posts = this.subset(P.posts.length ? P.posts : st.map(([x, y]) => ({ x, y, dir: 0 })), 2, rng); f.route = this.subset(st.map(([x, y]) => ({ x, y, dir: 0 })), 4, rng); f.ri = 0; }
        if (role === 'voyageur') { f.stage = 0; f.hidden = true; f.hideUntil = rng() * 40; }
        if (role === 'contrebandier') f.spots = this.subset(P.corners.length ? P.corners : st.map(([x, y]) => ({ x, y, dir: 0 })), 2, rng);
        this.folk.push(f);
      }
      for (let c = 0; c < (z === Z.LIBERTALIA ? 4 : z === Z.TOWN ? 3 : 1); c++) { const [cx, cy] = pick(st); this.cats.push({ col: pick(['orange', 'black', 'white']), x: cx, y: cy, tx: cx, ty: cy, dir: 2, moving: false, wait: rng() * 5 }); }
    }
    this.seatPatrons(); // lot 4 (après les autres : les habitants d'avant ne changent pas)
  }
  subset(list, n, rng) { const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, Math.max(1, Math.min(n, a.length))); }
  lookFor(role, rng, pick) { // les vêtements disent le métier
    const L = { skin: Math.floor(rng() * 4), hair: Math.floor(rng() * 7), hairStyle: pick(['court', 'long', 'queue', 'chauve', 'hirsute', 'court']), pants: pick(['brown', 'navy', 'black', 'white']), boots: pick(['brown', 'black']), beard: rng() < 0.35 ? 1 + Math.floor(rng() * 2) : 0, eye: rng() < 0.06 ? 'patch' : undefined };
    const by = {
      guet: { top: 'manteau', topCol: 'navy', hat: 'tricorne', hatCol: 'black' },
      marchand: { top: 'tablier', topCol: pick(CLOTH_KEYS), hat: pick([null, 'foulard', 'paille']), hatCol: pick(['red', 'yellow', 'green']) },
      docker: { top: pick(['chemise', 'rayee']), topCol: pick(['white', 'brown', 'teal', 'red']), hat: pick(['bandana', 'bonnet', null]), hatCol: pick(['red', 'navy', 'black']) },
      pecheur: { top: 'vareuse', topCol: pick(['navy', 'teal', 'brown', 'yellow']), hat: pick(['bonnet', 'paille']), hatCol: pick(['navy', 'red', 'yellow']) },
      artisan: { top: 'tablier', topCol: pick(['brown', 'black']), hat: null, hatCol: 'black' },
      voyageur: { top: 'manteau', topCol: pick(['brown', 'green', 'purple', 'black']), hat: pick(['tricorne', 'paille', 'bonnet']), hatCol: pick(['brown', 'black', 'green']) },
      contrebandier: { top: 'manteau', topCol: 'black', hat: 'foulard', hatCol: 'black' },
      matelot: { top: pick(['rayee', 'vareuse', 'chemise']), topCol: pick(CLOTH_KEYS), hat: pick(['bandana', 'tricorne', 'bonnet', null]), hatCol: pick(['red', 'black', 'navy']) },
    }[role] || { top: pick(['chemise', 'rayee', 'gilet', 'manteau', 'vareuse']), topCol: pick(CLOTH_KEYS), hat: pick([null, 'tricorne', 'bandana', 'foulard', 'paille', 'bonnet', null]), hatCol: pick(['red', 'black', 'navy', 'green', 'purple', 'yellow']) };
    return Object.assign(L, by);
  }
  // les points d'activité d'une ville : étals, puits, bancs, quais, tas de caisses, établis, postes du guet, portes
  buildPoi(z, st) {
    const W = this.G.world, out = { stalls: [], wells: [], benches: [], quay: [], crates: [], work: [], posts: [], corners: [], pubs: [], shops: [], homes: [], edges: [] };
    const stand = (x, y) => canStand(W, x, y);
    const near = (p, offs) => { for (const [dx, dy] of offs) { const x = p.x + dx, y = p.y + dy; if (stand(x, y)) return { x, y, dir: dirOf(-dx, -dy) }; } return null; };
    const DOWN = [[0, 14], [0, 18], [12, 6], [-12, 6], [0, -14]], ANY = [[0, 14], [14, 0], [-14, 0], [0, -14], [12, 12], [-12, 12]];
    for (const p of W.props) {
      if (W.roomGrid[p.ty * W.W + p.tx] >= 0 || W.zones[p.ty * W.W + p.tx] !== z) continue;
      if (p.type === 'stall' || p.type === 'comptoir') { const front = near(p, DOWN); const back = near(p, [[0, -12], [0, -16]]); const held = W.npcs.some((n) => Math.abs(n.x - p.x) < 26 && Math.abs(n.y - p.y) < 30); if (front) out.stalls.push({ front, back: back || front, x: p.x, y: p.y, held }); } // held : un marchand nommé le tient déjà
      else if (p.type === 'well' || p.type === 'fontaine') { const s = near(p, ANY); if (s) out.wells.push(s); }
      else if (p.type === 'bench') { const s = near(p, [[0, -2], [0, 10], [0, -10]]); if (s) out.benches.push(s); }
      else if (p.type === 'crate' || p.type === 'barrel' || p.type === 'tonnelet' || p.type === 'tonneau_d') { const s = near(p, ANY); if (s) out.crates.push(s); }
      else if (p.type === 'anvil' || p.type === 'workbench') { const s = near(p, ANY); if (s) out.work.push(s); }
      else if (p.type === 'statue' || p.type === 'porte_cite' || p.type === 'fontaine') { const s = near(p, DOWN); if (s) out.posts.push(s); }
    }
    for (let y = 1; y < W.OVER_H - 1; y++) for (let x = 1; x < W.W - 1; x++) { // les bords des quais, face à l'eau
      const i = y * W.W + x;
      if (W.tiles[i] !== T.PLANK || W.zones[i] !== z || W.roomGrid[i] >= 0 || W.solid[i]) continue;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const t = W.tiles[i + dx + dy * W.W]; if (t === T.WATER || t === T.DEEP) { const px = x * TILE + 8, py = y * TILE + 10; if (stand(px, py)) out.quay.push({ x: px, y: py, dir: dirOf(dx, dy) }); break; } }
    }
    for (const d of W.doors) {
      if (d.secret || d.jail || zoneAt(W, d.ox, d.oy) !== z) continue;
      const at = { x: d.ox, y: d.oy + 4, dir: 3, door: d };
      if (PUBS.includes(d.kind)) out.pubs.push(d);
      else if (SHOPS.includes(d.kind)) { out.shops.push(at); if (d.kind === 'forge' || d.kind === 'chantier') { const s = near({ x: d.ox, y: d.oy }, [[20, 10], [-20, 10], [24, 4]]); if (s) out.work.push(s); } if (d.kind === 'capitainerie') { const s = near({ x: d.ox, y: d.oy }, [[18, 12], [-18, 12]]); if (s) out.posts.push(s); } }
      else if (d.kind === 'house' || d.plot != null || d.kind === 'home') out.homes.push(d);
    }
    // les bords de la ville (le voyageur arrive par là) et les recoins (le contrebandier y attend la nuit)
    let cx = 0, cy = 0; for (const [x, y] of st) { cx += x; cy += y; } cx /= st.length; cy /= st.length;
    const far = st.map(([x, y]) => [x, y, Math.hypot(x - cx, y - cy)]).sort((a, b) => b[2] - a[2]);
    out.edges = far.slice(0, Math.max(4, Math.floor(far.length * 0.06))).map(([x, y]) => ({ x, y, dir: 0 }));
    out.corners = st.filter(([x, y]) => zoneAt(W, x, y) === z && [[16, 0], [-16, 0], [0, -16]].filter(([dx, dy]) => !canStand(W, x + dx, y + dy)).length >= 2).slice(0, 40).map(([x, y]) => ({ x, y, dir: 0 }));
    out.center = { x: cx, y: cy };
    return out;
  }
  // lot 4 : la taverne vivante — des habitués attablés dans les tavernes et les auberges, plus nombreux le soir.
  // Une table où un personnage attend assis (Silas, à la Sirène Borgne) reste à lui.
  seatPatrons() {
    const W = this.G.world, rng = mulberry32(777), pick = (a) => a[Math.floor(rng() * a.length)];
    this.patrons = [];
    for (const r of W.rooms) {
      if (r.kind !== 'tavern' && r.kind !== 'auberge') continue;
      const inR = (o) => o.x >= r.x0 * TILE && o.x < (r.x0 + r.w) * TILE && o.y >= r.y0 * TILE && o.y < (r.y0 + r.h) * TILE;
      const held = W.npcs.filter((n) => n.sit && inR(n));
      for (const ch of W.props) {
        if (ch.type !== 'chaise' || !inR(ch) || held.some((n) => Math.abs(n.y - ch.y) < 8 && Math.abs(n.x - ch.x) <= 2 * TILE + 4)) continue;
        const look = { skin: Math.floor(rng() * 4), hair: Math.floor(rng() * 7), hairStyle: pick(['court', 'long', 'queue', 'chauve', 'hirsute']), beard: rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0, top: pick(['chemise', 'rayee', 'gilet', 'vareuse', 'manteau']), topCol: pick(CLOTH_KEYS), pants: pick(['brown', 'navy', 'black']), boots: pick(['brown', 'black']), hat: pick([null, null, 'bandana', 'tricorne', 'bonnet', 'foulard']), hatCol: pick(CLOTH_KEYS) };
        const f = { k: 'f', id: -5000 - this.patrons.length, x: ch.x, y: ch.y, dir: ch.v ? 1 : 2, dir0: ch.v ? 1 : 2, moving: false, walk: 0, look, lookKey: JSON.stringify(look), weapon: null,
          sitUntil: Infinity, patron: true, role: 'matelot', room: r.id, seat: `${r.id}:${Math.floor(ch.x / TILE) - r.x0},${Math.floor(ch.y / TILE) - r.y0}`, stay: rng(), hidden: true };
        this.folk.push(f); this.patrons.push(f);
      }
    }
  }
  updatePatrons(now, ph) {
    const G = this.G;
    if (G.cinema && G.cinema.on) return; // pendant une scène, la salle ne change pas
    const share = ph === 'soir' ? 0.95 : ph === 'nuit' ? 0.7 : ph === 'jour' ? 0.45 : 0.15;
    let here = null;
    for (const f of this.patrons) {
      if (f.talk) continue;
      f.hidden = f.stay > share;
      if (!f.hidden && f.room === G.room) (here || (here = [])).push(f);
    }
    // une salle pleine bruisse : des échanges entre voisins de table, mais un seul à la fois, et des silences
    if (here && now > (this.pubTalkAt || 0) && !this.convs.some((c) => c.room === G.room)) {
      this.pubTalkAt = now + 9 + Math.random() * 14;
      const f = here[Math.floor(Math.random() * here.length)];
      const mate = here.find((o) => o !== f && Math.abs(o.y - f.y) < 4 && Math.abs(o.x - f.x) < 40);
      if (mate && Math.random() < 0.7) this.startConv([f, mate], 'taverne', ph, now, G.room);
      else if (Math.random() < 0.3) { this.say(f, PUB_LINES); if (Math.random() < 0.5) setTimeout(() => G.sfx.play('laugh', 0.3), 700); }
    }
  }
  // ------------------------------------------------------------ que fait cet habitant maintenant ? (une activité : où, combien de temps, avec quoi)
  plan(f, ph, now) {
    const P = this.poi.get(f.city), R = Math.random, pick = (a) => a[Math.floor(R() * a.length)], st = this.streets.get(f.city);
    const home = () => ({ x: f.home[0], y: f.home[1], act: 'rentre', hide: 1, dur: 0 });
    const tavern = () => ({ x: f.pub[0] + (R() - 0.5) * 30, y: f.pub[1] + (R() - 0.5) * 14, act: 'boit', dur: 10 + R() * 25, dance: ph === 'soir' && R() < 0.18 });
    const stroll = (r = 140) => { const near = st.filter(([x, y]) => Math.abs(x - f.x) < r && Math.abs(y - f.y) < r * 0.7); const [x, y] = pick(near.length ? near : st); return { x, y, act: 'flâne', dur: 4 + R() * 9 }; };
    const errand = () => { // les courses d'un habitant : chacune avec sa raison
      const opts = [];
      if (P.stalls.length) opts.push(() => { const s = pick(P.stalls); return { x: s.front.x + (R() - 0.5) * 8, y: s.front.y + R() * 4, dir: 3, act: 'achète', dur: 7 + R() * 10 }; });
      if (P.wells.length) opts.push(() => { const s = pick(P.wells); return { x: s.x, y: s.y, dir: s.dir, act: 'puise', dur: 5 + R() * 6 }; });
      if (P.benches.length) opts.push(() => { const s = pick(P.benches); return { x: s.x, y: s.y, dir: 0, act: 'se repose', sit: 1, dur: 18 + R() * 30 }; });
      if (P.shops.length) opts.push(() => { const s = pick(P.shops); return { x: s.x, y: s.y, act: 'entre', hide: 1, dur: 20 + R() * 35 }; });
      opts.push(() => stroll(160));
      return pick(opts)();
    };
    switch (f.role) {
      case 'guet':
        if (ph === 'aube') return home();
        if (ph === 'jour') { const p = f.posts[(R() < 0.75 ? 0 : 1) % f.posts.length]; return { x: p.x, y: p.y, dir: R() < 0.5 ? 0 : p.dir, act: 'surveille', dur: 18 + R() * 30 }; }
        { f.ri = (f.ri + 1) % f.route.length; const p = f.route[f.ri]; return { x: p.x, y: p.y, act: 'fait sa ronde', dur: 1.5 + R() * 3, speed: 17 }; }
      case 'marchand':
        if (ph === 'nuit') return home();
        if (ph === 'soir') return R() < 0.5 ? tavern() : home();
        { const s = f.stall; return { x: s.back.x, y: s.back.y, dir: 0, act: 'vend', dur: 25 + R() * 40 }; }
      case 'docker':
        if (ph === 'nuit') return home();
        if (ph === 'soir') return tavern();
        if (!f.carry) { const s = pick(f.piles); return { x: s.x, y: s.y, dir: s.dir, act: 'charge', dur: 2.5 + R() * 2, then: 'carry' }; }
        { const s = pick(f.spots); return { x: s.x, y: s.y, dir: s.dir, act: 'pose', dur: 2 + R() * 2, then: 'drop', speed: 19 }; }
      case 'pecheur':
        if (ph === 'nuit') return home();
        if (ph === 'soir') return R() < 0.4 ? tavern() : home();
        if (R() < 0.15 && P.stalls.length) { const s = pick(P.stalls); return { x: s.front.x, y: s.front.y, dir: 3, act: 'vend sa pêche', dur: 8 + R() * 8 }; }
        { const s = pick(f.spots); return { x: s.x, y: s.y, dir: s.dir, act: 'pêche', rod: 1, dur: 40 + R() * 70 }; }
      case 'artisan':
        if (ph === 'nuit') return home();
        if (ph === 'soir') return R() < 0.6 ? tavern() : home();
        return { x: f.station.x, y: f.station.y, dir: f.station.dir, act: 'travaille', work: 1, dur: 20 + R() * 30 };
      case 'voyageur': { // il arrive par la route, va à l'auberge, en ressort, repart
        if (f.stage === 0) { const e = pick(P.edges); if (!this.inView(f)) { f.x = e.x; f.y = e.y; } f.stage = 1; /* il « arrive » par la route, hors de la vue du joueur */ const pb = P.pubs.length ? pick(P.pubs) : null; return pb ? { x: pb.ox, y: pb.oy + 4, act: 'cherche l’auberge', hide: 1, dur: 60 + R() * 80, speed: 23, after: 2 } : stroll(); }
        if (f.stage === 2) { const e = pick(P.edges); f.stage = 3; return { x: e.x, y: e.y, act: 'repart', hide: 1, dur: 90 + R() * 150, after: 0 }; }
        return stroll();
      }
      case 'contrebandier':
        if (ph !== 'nuit') return home();
        { const s = pick(f.spots); return { x: s.x, y: s.y, act: 'guette', dur: 30 + R() * 40 }; }
      case 'matelot':
        if (ph === 'nuit') return f.sing ? tavern() : home();
        if (ph === 'soir') return tavern();
        return P.quay.length && R() < 0.5 ? (() => { const s = pick(P.quay); return { x: s.x, y: s.y, dir: s.dir, act: 'regarde la mer', dur: 10 + R() * 15 }; })() : errand();
      default: // habitant, client
        if (ph === 'nuit') return home();
        if (ph === 'aube') return R() < 0.5 ? home() : errand();
        if (ph === 'soir') return R() < 0.55 ? tavern() : R() < 0.5 ? home() : errand();
        if (f.role === 'client' && P.stalls.length && R() < 0.65) { const s = pick(P.stalls); return { x: s.front.x + (R() - 0.5) * 10, y: s.front.y + R() * 4, dir: 3, act: 'achète', dur: 6 + R() * 10 }; }
        if (R() < 0.12) { const mate = this.folk.find((o) => o !== f && o.city === f.city && !o.hidden && !o.moving && !o.patron && o.crowd == null && Math.hypot(o.x - f.x, o.y - f.y) < 150); if (mate) return { x: mate.x + (mate.x < f.x ? 14 : -14), y: mate.y + 2, act: 'rejoint quelqu’un', dur: 6 + R() * 6 }; }
        return errand();
    }
  }
  // une case d'arrivée libre : pas sur la destination d'un autre (sinon on s'empile)
  free(x, y, self) {
    for (let k = 0; k < 5; k++) {
      const jx = x + (k ? (Math.random() - 0.5) * 12 : 0), jy = y + (k ? (Math.random() - 0.5) * 6 : 0);
      if (!this.folk.some((o) => o !== self && !o.hidden && o.crowd == null && Math.abs((o.moving ? o.tx : o.x) - jx) < 9 && Math.abs((o.moving ? o.ty : o.y) - jy) < 6) && canStand(this.G.world, jx, jy) && dry(this.G.world, jx, jy)) return [jx, jy];
    }
    return [x, y];
  }
  update(dt, now) {
    const G = this.G, p = G.player;
    if (!p) return;
    const f0 = dayFrac(G.worldTime || 0), ph = phaseOf(f0);
    const fo = G.viewFocus || p; // lot 4 : une cinématique peut regarder ailleurs que le joueur
    if (this.patrons) this.updatePatrons(now, ph);
    for (const f of this.folk) {
      if (f.cine || f.patron || f.crowd != null) continue; // les acteurs d'une scène, les habitués attablés et les invités de Valdorne ont leur propre vie
      if (Math.abs(f.x - fo.x) > 900 || Math.abs(f.y - fo.y) > 700) continue; // loin des regards : rien ne bouge
      f.lantern = f.role === 'guet' && (ph === 'nuit' || ph === 'soir');
      if (f.talk) { f.moving = false; continue; } // en conversation : on reste, on se regarde
      if (f.hidden) { // chez soi, dans une boutique, à l'auberge
        if (now < (f.hideUntil || 0)) continue;
        if ((ph === 'nuit' && f.role !== 'guet' && f.role !== 'contrebandier' && !(f.role === 'matelot' && f.sing)) || (f.role === 'contrebandier' && ph !== 'nuit')) { f.hideUntil = now + 20; continue; } // la nuit, on reste chez soi
        f.hidden = false; f.act = null; f.actUntil = 0; f.carry = false; f.rod = false;
        if (f.role === 'voyageur' && f.stage === 3) f.stage = 0;
      }
      if (f.act && now < f.actUntil && !f.moving) { // l'activité en cours
        if (f.work && now > (f.workAt || 0)) { f.workAt = now + 1.1 + Math.random() * 0.9; f.atkT = now; f.atkA = [Math.PI / 2, Math.PI, 0, -Math.PI / 2][f.dir & 3]; } // le marteau, l'outil
        if (f.act === 'surveille' && Math.random() < dt * 0.15) f.dir = [0, 1, 2, 0][Math.floor(Math.random() * 4)]; // le guet tourne la tête
        continue;
      }
      if (f.wait > 0) { f.wait -= dt; f.moving = false; continue; }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d < 3 || f.stuck > 30) { // arrivé (ou bloqué) : commencer l'activité prévue, ou en choisir une
        f.stuck = 0;
        if (f.next && d < 3) {
          const a = f.next; f.next = null;
          if (a.hide) { f.hidden = true; f.hideUntil = now + a.dur; f.moving = false; if (a.after != null) f.stage = a.after; continue; }
          f.act = a.act; f.actUntil = now + a.dur; f.moving = false; if (a.dir != null) f.dir = a.dir;
          f.rod = !!a.rod; f.work = !!a.work; f.sitUntil = a.sit ? now + a.dur : 0;
          if (a.dance) f.danceUntil = now + 3 + Math.random() * 3;
          if (a.then === 'carry') f.carryNext = true; else if (a.then === 'drop') f.carryNext = false;
          continue;
        }
        if (f.carryNext != null) { f.carry = f.carryNext; f.carryNext = null; }
        f.rod = false; f.work = false; f.act = null;
        const a = this.plan(f, ph, now);
        const [tx, ty] = a.hide ? [a.x, a.y] : this.free(a.x, a.y, f);
        f.tx = tx; f.ty = ty; f.next = a; f.speed = a.speed || (f.carry ? 19 : a.act === 'rentre' ? 28 : 23);
        f.wait = 0.3 + Math.random() * 1.6; // un temps pour se décider : personne ne repart à l'instant
        continue;
      }
      const sp = (f.speed || 23) * dt;
      let [nx, ny] = moveWithCollision(G.world, f.x, f.y, dx / d * sp, dy / d * sp);
      if (!dry(G.world, nx, ny)) { nx = f.x; ny = f.y; }
      if (Math.hypot(nx - f.x, ny - f.y) < sp * 0.2) { f.stuck = (f.stuck || 0) + 1; if (f.stuck > 30 && f.next && f.next.hide) { f.hidden = true; f.hideUntil = now + 10; f.next = null; } } else f.stuck = 0;
      f.x = nx; f.y = ny; f.moving = true; f.walk = (f.walk || 0) + dt * (f.speed || 23) / 76; f.dir = dirOf(dx, dy); // lot 7 : le pas suit la vitesse (un flâneur ne pédale pas)
    }
    // les chats
    for (const c of this.cats) {
      if (Math.abs(c.x - p.x) > 900 || Math.abs(c.y - p.y) > 700) continue;
      if (c.wait > 0) { c.wait -= dt; c.moving = false; continue; }
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 2) { c.wait = 3 + Math.random() * 10; const st = [...this.streets.values()].flat().filter(([x, y]) => Math.abs(x - c.x) < 120 && Math.abs(y - c.y) < 90); const n = st[Math.floor(Math.random() * st.length)] || [c.x, c.y]; c.tx = n[0]; c.ty = n[1]; continue; }
      const sp = 30 * dt, [nx, ny] = moveWithCollision(G.world, c.x, c.y, dx / d * sp, dy / d * sp);
      if (Math.hypot(nx - c.x, ny - c.y) < sp * 0.2) { c.tx = c.x; c.ty = c.y; }
      c.x = nx; c.y = ny; c.moving = true; c.dir = dx < 0 ? 1 : 2;
    }
    this.direct(now, ph, p);
  }
  // ------------------------------------------------------------ le metteur en scène des conversations
  // combien de bulles se lisent à l'écran en ce moment (toutes origines : habitants, foule du festival, scènes)
  bubblesInView() {
    const R = this.G.renderer; if (!R || !R.fx) return 0;
    const now = performance.now() / 1000; let n = 0;
    for (const fx of R.fx) if (fx.kind === 'bubble' && now - fx.t0 < (fx.dur || 3)) { const o = fx.follow && fx.follow(); if (o && this.inView(o)) n++; }
    return n;
  }
  inView(f) { const R = this.G.renderer; return R && f.x > R.camX - 20 && f.x < R.camX + R.W + 20 && f.y > R.camY - 20 && f.y < R.camY + R.H + 30; }
  whereOf(f) {
    const W = this.G.world, P = this.poi.get(f.city);
    if (f.patron) return 'taverne';
    const tx = Math.floor(f.x / TILE), ty = Math.floor(f.y / TILE), t = (x, y) => W.tiles[y * W.W + x];
    for (const [dx, dy] of [[0, 0], [0, 1], [1, 0], [-1, 0], [0, -1], [0, 2]]) { const k = t(tx + dx, ty + dy); if (k === T.PLANK || k === T.WATER || k === T.DEEP) return 'quai'; }
    if (P && P.stalls.some((s) => Math.hypot(s.x - f.x, s.y - f.y) < 46)) return 'marche';
    if (P && P.pubs.some((d) => Math.hypot(d.ox - f.x, d.oy - f.y) < 70)) return 'taverne';
    return 'rue';
  }
  roleOk(want, f) { return want === 'any' || want.split('|').includes(f.role || 'habitant'); }
  startConv(parts, where, ph, now, room = null) {
    const G = this.G, wt = G.worldTime || 0, w = weatherAt(wt), moon = ph === 'nuit' && isFullMoon(wt);
    const ok = SCENES.filter((s) => s.roles.length === parts.length && (s.where === 'any' || s.where.split('|').includes(where)) && (!s.when || s.when.split('|').includes(ph))
      && (!s.rain || (w && w.rain > 0.3)) && (!s.fest || G.festOn) && (!s.moon || moon) && now - (this.recent.get(s.id) ?? -1e9) > 360
      && (s.mute || s.lines.every(([, t]) => now - (this.said.get(t) ?? -1e9) > 240)));
    // on essaie d'attribuer les rôles dans l'ordre de la scène (le marchand parle comme un marchand)
    const cast = (s) => { const pool = parts.slice(), out = []; for (const want of s.roles) { const k = pool.findIndex((f) => this.roleOk(want, f)); if (k < 0) return null; out.push(pool.splice(k, 1)[0]); } return out; };
    const cands = []; for (const s of ok) { const c = cast(s); if (c) cands.push([s, c]); }
    if (!cands.length) return false;
    // les scènes qui disent quelque chose de précis (un métier, la pluie, le festival) passent avant les génériques
    const score = ([s]) => (s.roles.some((r) => r !== 'any') ? 2 : 0) + (s.rain || s.fest || s.moon ? 3 : 0) + (s.mute ? -0.5 : 0) + Math.random() * 2.5;
    cands.sort((a, b) => score(b) - score(a));
    const [scene, cast2] = cands[0];
    const c = { scene, parts: cast2, i: 0, nextAt: now + 0.4 + Math.random() * 0.8, end: 0, room };
    const cx = cast2.reduce((s, f) => s + f.x, 0) / cast2.length, cy = cast2.reduce((s, f) => s + f.y, 0) / cast2.length;
    for (const f of cast2) { f.talk = c; f.moving = false; if (!f.patron) f.dir = dirOf(cx - f.x, cy - f.y); }
    this.convs.push(c); this.recent.set(scene.id, now);
    return true;
  }
  endConv(c, now) {
    for (const f of c.parts) { f.talk = null; if (f.patron) f.dir = f.dir0; else { f.wait = 0.8 + Math.random() * 2; if (f.act) f.actUntil = Math.max(f.actUntil, now + 2); } }
    this.convs.splice(this.convs.indexOf(c), 1);
    this.cityNext.set(c.parts[0].city ?? 'pub', now + 10 + Math.random() * 16); // un temps de silence avant la scène suivante
  }
  direct(now, ph, p) {
    // les scènes en cours : une réplique à la fois, avec des pauses qui dépendent de la longueur
    for (const c of this.convs.slice()) {
      if (c.parts.some((f) => f.hidden && !f.patron || f.cine)) { this.endConv(c, now); continue; }
      if (now < c.nextAt) continue;
      if (c.scene.mute) { // une scène muette : un signe de tête, un regard, puis chacun repart
        if (c.i >= 3) { this.endConv(c, now); continue; }
        const f = c.parts[c.i % c.parts.length]; f.nodT = now; c.i++; c.nextAt = now + 1.4 + Math.random() * 1.8; continue;
      }
      if (c.i >= c.scene.lines.length) { this.endConv(c, now); continue; }
      const [who, text] = c.scene.lines[c.i], f = c.parts[who];
      const dur = 1.7 + text.length * 0.045;
      this.say(f, [text], dur); this.said.set(text, now); c.i++;
      c.nextAt = now + dur + 0.35 + Math.random() * 1.1;
    }
    if (now < this.nextTry) return;
    this.nextTry = now + 1 + Math.random();
    const G = this.G;
    // une nouvelle scène ? au plus deux visibles à la fois, et pas trop souvent dans une même ville
    const visible = this.convs.filter((c) => c.parts.some((f) => this.inView(f))).length;
    if (visible < 2 && Math.random() < 0.6) {
      const idle = this.folk.filter((f) => !f.patron && f.crowd == null && !f.cine && !f.hidden && !f.talk && !f.moving && !f.carry && f.wait <= 0.2 && this.inView(f) && now > (this.cityNext.get(f.city) || 0));
      for (const a of idle) {
        const near = idle.filter((o) => o !== a && o.city === a.city && Math.hypot(o.x - a.x, o.y - a.y) < 34);
        if (!near.length) continue;
        const parts = near.length >= 2 && Math.random() < 0.25 ? [a, near[0], near[1]] : [a, near[0]];
        if (this.startConv(parts, this.whereOf(a), ph, now)) break;
      }
    }
    // un mot pour le joueur, rarement
    const quiet = this.bubblesInView() === 0;
    if (now > this.greetAt && !G.player.moving && quiet) {
      const close = this.folk.find((f) => !f.patron && f.crowd == null && !f.hidden && !f.talk && !f.moving && Math.hypot(f.x - p.x, f.y - p.y) < 28 && now > (f.greetedAt || 0));
      if (close && Math.random() < (G.me && G.me.wd ? 0.35 : 0.1)) {
        close.dir = dirOf(p.x - close.x, p.y - close.y); close.greetedAt = now + 300; this.greetAt = now + 45;
        this.say(close, G.me && G.me.wd ? WANTED : (GREET[close.role] || GREET.any));
      } else this.greetAt = now + 1.5;
    }
    // le cri d'un marchand, de temps en temps, s'il n'y a pas déjà une scène à côté
    if (ph === 'jour' && !visible && quiet) {
      const m = this.folk.find((f) => f.role === 'marchand' && f.act === 'vend' && !f.talk && this.inView(f));
      if (m && now > (this.cryAt.get(m.city) || 0) && CRIES[m.city]) { this.cryAt.set(m.city, now + 50 + Math.random() * 60); if (Math.random() < 0.6) this.say(m, CRIES[m.city], 2.6); }
    }
  }
  say(f, lines, dur = 3.2) {
    const text = lines[Math.floor(Math.random() * lines.length)];
    this.G.renderer.addFx({ kind: 'bubble', text, follow: () => f, dur, h: 34 });
  }
}
