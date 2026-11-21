// Lot 6 : La Nuit des Mille Voiles, côté serveur. Tout est décidé ici, rien ne l'est par le client :
//  - le calendrier (une édition par semaine, du jeudi midi au lundi midi, trois variantes qui tournent) ;
//  - les jetons (gagnés, jamais achetés ; plafonnés par jour quand on rejoue ; gardés d'une édition à l'autre) ;
//  - les cinq épreuves : les canonniers (des cibles calculées des deux côtés à partir d'une graine), la chasse au
//    trésor (des indices, un cadenas à symboles), le défi des tavernes (dés, mémoire, réflexes), le parcours du gabier
//    (tonneaux, bôme, chrono), le duel des capitaines (la Lice : on y est mis à terre, on n'y meurt pas) ;
//  - la course des Mille Voiles : des cotres de location, des bouées, des courants et des vents, des rivaux qui
//    courent vraiment, un départ commun, une arrivée saluée au canon et aux feux d'artifice ;
//  - le spectacle de chaque nuit, la boutique de Zéphyrine, le classement de la semaine, les secrets.
// Seul ou à plusieurs : chaque épreuve se fait seul ; un groupe court ensemble, chasse le trésor ensemble, se défie
// dans la Lice. Une déconnexion n'en bloque aucune : la course continue sans le parti, le duel s'arrête, l'or reste.
import { ITEMS } from '../shared/data/items.js';
import { TILE, DAY_LENGTH } from '../shared/constants.js';
import { SAFE, zoneAt } from '../shared/world.js';
import { windFactor, stations, shipFits, shipOf } from '../shared/data/ships.js';
import { festEdition, dayKey, TOK, EPREUVES, EP_ORDER, SHOP, SHOP_BY, FEST_EMOTES, SECRETS, CANON, CLUES, CHEST_AT, SYMBOLS, ROMAN, TAV, GABIER, CHAMPIONS,
  RACE, BUOYS, SECRET_BUOY, CURRENTS, WINDS, RIVALS, SHOW, MIRA_SHOW, MIRA, VARIANTS } from '../shared/data/festival.js';
import { canonTargets, canonHit, gabBarrels, gabBoom, segDist, BARREL_R, seaPath } from '../shared/fest-sim.js';
import { T } from '../shared/constants.js';

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = (s) => `${Math.floor(s / 60)} min ${(s % 60).toFixed(1).replace('.', ',')} s`;
const shuffled = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const BEACH = { x0: 120 * TILE, x1: 172 * TILE, y0: 94 * TILE, y1: 128 * TILE }; // là où l'on « est au festival »
const inBox = (p, B) => p.x >= B.x0 && p.x < B.x1 && p.y >= B.y0 && p.y < B.y1;
const BOARDS = ['canon', 'taverne', 'gabier', 'course'];
const LOW_FIRST = { gabier: 1, course: 1 }; // un temps : le plus petit gagne
const SAVE_KEYS = ['tok', 'ed', 'st', 'best', 'own', 'eq', 'sec', 'day', 'seen', 'show', 'tr', 'ch', 'done', 'earned'];

export const festival = {
  festInit() {
    this.fs = { force: null, ed: festEdition(Date.now()), rounds: new Map(), start: null, races: new Set(), show: null, lastShow: -1, duels: new Set(), paths: null,
      board: { ed: null, canon: {}, taverne: {}, gabier: {}, course: {}, last: null, pending: {} }, raceId: 1 };
    this.fs.board.ed = this.fs.ed.key;
    if (this.storage && this.storage.loadMeta) Promise.resolve(this.storage.loadMeta('festival')).then((b) => { if (b && b.ed) Object.assign(this.fs.board, b); this.festRoll(); }).catch(() => {});
  },
  festOpen() { return this.fs.ed.open; },
  // pendant une édition, la plage du festival est sûre : ni monstre, ni coup entre pirates (la garde du festival veille)
  festSafe(p) { return !!(this.fs && this.fs.ed.open && p && p.room === -1 && inBox(p, BEACH)); },
  festCalm() { // les monstres qui naissent sur la plage dorment pendant la fête, et reviennent après
    const open = this.fs.ed.open;
    for (const m of this.mobs) {
      if (m.summoned || m.fest || m.boss || m.room !== -1 || !inBox({ x: m.sx, y: m.sy }, BEACH)) continue;
      if (open && m.state !== 'dead') { m.state = 'dead'; m.hp = 0; m.deadUntil = Infinity; m.festSlept = 1; this.ev(m.x, m.y, ['die', m.id]); }
      else if (open && m.state === 'dead' && m.deadUntil !== Infinity) { m.deadUntil = Infinity; m.festSlept = 1; }
      else if (!open && m.festSlept) { m.festSlept = 0; m.deadUntil = this.time + rand(5, 40); }
    }
  },
  storeFest() { if (this.storage && this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('festival', this.fs.board)).catch(() => {}); },
  // ------------------------------------------------------------ sauvegarde : un champ facultatif (une ancienne sauvegarde se charge vierge)
  festLoad(d) {
    const f = { tok: 0, ed: '', st: {}, best: {}, own: [], eq: {}, sec: [], day: { k: 0, n: {} }, seen: 0, show: -1, tr: null, ch: 0, done: '', earned: 0 };
    if (d && typeof d === 'object') for (const k of SAVE_KEYS) if (d[k] != null) f[k] = d[k];
    f.tok = Math.max(0, Math.min(1e6, f.tok | 0)); f.own = Array.isArray(f.own) ? f.own.filter((id) => SHOP_BY[id] || SECRETS[id] || id === 'em_valse') : [];
    f.sec = Array.isArray(f.sec) ? f.sec.filter((k) => SECRETS[k]) : [];
    if (!f.eq || typeof f.eq !== 'object') f.eq = {};
    for (const k of Object.keys(f.eq)) if (!f.own.includes(f.eq[k])) delete f.eq[k];
    return f;
  },
  festSave(p) { const f = p.fest || {}; const o = {}; for (const k of SAVE_KEYS) o[k] = f[k]; return o; },
  // une nouvelle édition : le carnet se vide (les jetons, les parures et les secrets restent)
  festEdFor(p) {
    const f = p.fest, key = this.fs.ed.key;
    if (f.ed !== key) { f.ed = key; f.st = {}; f.ch = 0; f.tr = null; f.done = ''; }
    const dk = dayKey(Date.now()); if (f.day.k !== dk) f.day = { k: dk, n: {} };
  },
  festLogin(p) {
    this.festEdFor(p);
    const F = this.world.fest;
    if (p.room === F.rooms.gabier || p.room === F.rooms.lice) { const b = p.room === F.rooms.gabier ? F.gabier.back : F.lice.back; p.room = -1; p.x = b.x; p.y = b.y; p.zone = zoneAt(this.world, p.x, p.y); } // les épreuves ne se reprennent pas à mi-chemin
    this.festPrizes(p);
    this.send(p, this.festState(p));
  },
  festLogout(p) {
    const fx = p.fx; if (!fx) return;
    if (fx.canon) this.canonEnd(fx.canon, 'parti');
    if (fx.race) this.raceDrop(p, 'déconnexion');
    if (fx.duel) this.fduelEnd(fx.duel, p.id, 'forfait');
    if (fx.champ) this.champEnd(p, false, 'parti');
    p.fx = null;
  },
  fx(p) { return p.fx || (p.fx = {}); },
  // ------------------------------------------------------------ l'état envoyé au client
  festState(p) {
    const E = this.fs.ed, f = p.fest, B = this.fs.board;
    const top = (k) => Object.values(B[k] || {}).sort((a, b) => (LOW_FIRST[k] ? a.v - b.v : b.v - a.v)).slice(0, 8).map((e) => [e.n, e.v]);
    return { t: 'fest', a: 'etat', open: E.open ? 1 : 0, ed: E.key, v: E.variant, vname: VARIANTS[E.variant], start: E.start, end: E.end, next: E.next, now: Date.now(),
      tok: f.tok, st: f.st, best: f.best, own: f.own, eq: f.eq, sec: f.sec, ch: f.ch, tr: this.trView(p), done: f.done === E.key ? 1 : 0, seen: f.seen,
      boards: Object.fromEntries(BOARDS.map((k) => [k, top(k)])), last: B.last, show: this.fs.show ? { id: this.fs.show.id, el: Math.round((this.time - this.fs.show.t0) * 10) / 10, seed: this.fs.show.seed, dur: SHOW.dur } : null,
      start0: this.fs.start ? Math.max(0, Math.round(this.fs.start.at - this.time)) : null, racing: p.fx && p.fx.race ? 1 : 0 };
  },
  festPush(p) { this.send(p, this.festState(p)); },
  festBroadcast() { for (const p of this.players.values()) this.festPush(p); },
  // ------------------------------------------------------------ les jetons
  // ep : l'épreuve (pour le plafond du jour) ; first : la première réussite de l'édition (le tampon) ne compte pas dans le plafond
  festGive(p, n, why, ep = null) {
    if (p.lab && !this.fs.labTokens) n = Math.min(n, 5); // lot 2 : un personnage laboratoire reçoit des jetons de test, sans fausser le classement
    if (ep) { const used = p.fest.day.n[ep] || 0; if (used >= TOK.cap) { this.toast(p, `${why} — plus de jetons pour cette épreuve aujourd’hui (le plaisir, lui, reste entier).`, 'info'); return 0; } p.fest.day.n[ep] = used + 1; }
    n = Math.max(0, Math.round(n)); if (!n) return 0;
    p.fest.tok += n; p.fest.earned += n; p.dirtyMe = true;
    this.send(p, { t: 'fest', a: 'gain', n, why, tok: p.fest.tok });
    return n;
  },
  festStamp(p, ep) { // le tampon du carnet : une fois par édition
    const f = p.fest; this.festEdFor(p);
    if (f.st[ep]) return false;
    f.st[ep] = 1; this.festGive(p, TOK.stamp[ep], `Tampon du carnet : ${EPREUVES[ep].short}`);
    if (EP_ORDER.every((k) => f.st[k]) && f.done !== this.fs.ed.key) {
      f.done = this.fs.ed.key; this.festGive(p, TOK.complete, 'Le carnet complet !'); this.unlock(p, 'fete_carnet');
      this.toast(p, `Mira Bellécume : « ${MIRA.complete} »`, 'quest');
    }
    this.festPush(p); return true;
  },
  festSecret(p, k) {
    const f = p.fest; if (f.sec.includes(k)) return false;
    f.sec.push(k); this.festGive(p, TOK.secret, `Secret découvert : ${SECRETS[k].name}`); this.unlock(p, 'fete_' + k);
    if (k === 'valse' && !f.own.includes('em_valse')) f.own.push('em_valse');
    this.festPush(p); return true;
  },
  festBest(p, ep, v) { // le meilleur de la personne, et le classement de la semaine
    const f = p.fest, low = LOW_FIRST[ep], cur = f.best[ep];
    const better = cur == null || (low ? v < cur : v > cur);
    if (better) f.best[ep] = v;
    if (!p.lab && BOARDS.includes(ep)) { const B = this.fs.board[ep], e = B[p.key]; if (!e || (low ? v < e.v : v > e.v)) { B[p.key] = { n: p.name, v }; this.storeFest(); } }
    return better;
  },
  // la semaine change : le podium de chaque épreuve est retenu, les trois premiers sont récompensés (même absents)
  festRoll() {
    const B = this.fs.board, key = this.fs.ed.key;
    if (B.ed === key) return;
    const last = {};
    for (const k of BOARDS) {
      const pod = Object.entries(B[k] || {}).sort((a, b) => (LOW_FIRST[k] ? a[1].v - b[1].v : b[1].v - a[1].v)).slice(0, 3);
      last[k] = pod.map(([, e]) => [e.n, e.v]);
      pod.forEach(([pk], i) => (B.pending[pk] = B.pending[pk] || []).push([k, i]));
      B[k] = {};
    }
    B.last = { ed: B.ed, ...last }; B.ed = key;
    for (const p of this.players.values()) this.festPrizes(p);
    this.storeFest();
  },
  festPrizes(p) {
    const B = this.fs.board, list = B.pending[p.key]; if (!list || !list.length) return;
    delete B.pending[p.key];
    for (const [k, rank] of list) {
      const n = [60, 40, 25][rank] || 0; p.fest.tok += n; p.dirtyMe = true;
      if (rank === 0) this.unlock(p, k === 'course' ? 'fete_heros' : 'fete_podium');
      this.toast(p, `🏆 La Nuit des Mille Voiles passée — ${EPREUVES[k].short} : ${['premier', 'deuxième', 'troisième'][rank]} du classement ! +${n} jetons.`, 'quest');
    }
    this.storeFest();
  },
  // ------------------------------------------------------------ les messages
  festMsg(p, m) {
    if (p.dead) return;
    this.festEdFor(p);
    const open = this.festOpen(), a = String(m.a || '');
    if (a === 'etat') return this.festPush(p);
    if (a === 'vu') { p.fest.seen = 1; p.dirtyMe = true; return; }
    if (a === 'acheter') return this.festBuy(p, String(m.id || ''));
    if (a === 'porter') return this.festWear(p, String(m.id || ''));
    if (a === 'oter') return this.festUnwear(p, String(m.kind || ''));
    if (a === 'emote') return this.festEmote(p, String(m.k || ''));
    if (a === 'fusee') return this.festRocket(p);
    if (a === 'quitter') { if (p.fx && p.fx.canon) this.canonEnd(p.fx.canon, 'quitté'); return; }
    if (a === 'spot' && (m.i | 0) >= 0) { const s = this.world.fest.spots[m.i | 0]; if (s && (s.k === 'gab_sortie' || s.k === 'lice_sortie')) return this.festSpot(p, m.i | 0); } // on sort toujours
    if (!open) return this.toast(p, 'La Nuit des Mille Voiles est terminée pour cette semaine. Elle revient jeudi midi.', 'info');
    switch (a) {
      case 'spot': return this.festSpot(p, m.i | 0);
      case 'tir': return this.canonShot(p, +m.x, +m.y);
      case 'tresor': return this.trStart(p);
      case 'enigme': return this.trAnswer(p, m.o | 0);
      case 'tav': return this.tavMsg(p, m);
      case 'course': return m.c === 'abandon' ? this.raceDrop(p, 'abandon') : this.raceJoin(p);
      case 'duel': return this.duelMsg(p, m);
    }
  },
  festNear(p, id, r = 90) { return this.nearNpc(p, id, r); },
  festSpot(p, i) {
    const F = this.world.fest, s = F.spots[i];
    if (!s || (s.room >= 0 ? p.room !== s.room : p.room !== -1) || Math.hypot(s.x - p.x, s.y - p.y) > s.r + 12) return;
    if ((p.cds.fspot || 0) > this.time) return; p.cds.fspot = this.time + 0.35;
    switch (s.k) {
      case 'canon': return this.canonStart(p, s.cannon);
      case 'indice': return this.trClue(p, s.clue);
      case 'coffre_mira': return this.trChest(p, s.variant);
      case 'bouteille': return this.festSecret(p, 'bouteille') ? this.toast(p, 'Dans la bouteille, un mot de la grand-mère Bellécume : « Si tu lis ceci, c’est que tu cherches au bon endroit. Garde ce goût-là toute ta vie. »', 'quest') : this.toast(p, 'La bouteille est vide : vous l’avez déjà lue.', 'info');
      case 'gab_entree': return this.gabEnter(p);
      case 'gab_depart': return this.gabArm(p);
      case 'gab_saut': case 'gab_corde': case 'gab_mat': case 'gab_etai': return this.gabMove(p, s);
      case 'gab_cloche': return this.gabFinish(p);
      case 'gab_sortie': { const b = F.gabier.back; if (p.fx) p.fx.gab = null; this.teleport(p, b.x, b.y, {}); return; }
      case 'lice_entree': { const L = F.lice; this.teleport(p, L.in.x, L.in.y, {}); this.toast(p, 'La Lice des Capitaines : défiez un champion auprès du maître d’armes Escarmouche, ou un pirate présent. Personne n’y meurt.', 'quest'); return; }
      case 'lice_sortie': { if (p.fx && p.fx.duel) this.fduelEnd(p.fx.duel, p.id, 'forfait'); if (p.fx && p.fx.champ) this.champEnd(p, false, 'parti'); const b = F.lice.back; this.teleport(p, b.x, b.y, {}); return; }
    }
  },

  // ============================================================ 1. le concours de canonniers
  canonStart(p, k) {
    const F = this.world.fest, c = F.cannons[k];
    if (!c) return;
    const cur = this.fs.rounds.get(k);
    if (cur && cur.pid !== p.id) return this.toast(p, `${cur.name} tient ce canon. Les deux autres sont peut-être libres.`, 'warn');
    if (cur) return;
    if (p.fx && p.fx.canon) this.canonEnd(p.fx.canon, 'changé');
    const r = { k, pid: p.id, name: p.name, seed: (Math.random() * 2 ** 31) | 0, v: this.fs.ed.variant, t0: this.time + 3, end: this.time + 3 + CANON.round, hits: new Set(), score: 0, shots: 0, next: 0 };
    r.targets = canonTargets(r.v, r.seed, c.lane);
    this.fs.rounds.set(k, r); this.fx(p).canon = r;
    const msg = { t: 'fest', a: 'canon', k, seed: r.seed, v: r.v, wait: 3, dur: CANON.round, pid: p.id, name: p.name };
    for (const q of this.players.values()) if (q.room === -1 && dist(q, c) < 900) this.send(q, msg);
    this.toast(p, `Gaston Mèche : « Quarante-cinq secondes ! Visez avec la souris, cliquez pour tirer. Les mouettes valent trois points. »`, 'quest');
  },
  canonShot(p, x, y) {
    const r = p.fx && p.fx.canon; if (!r || !Number.isFinite(x) || !Number.isFinite(y)) return;
    const c = this.world.fest.cannons[r.k], now = this.time;
    if (now < r.t0 || now > r.end || now < r.next) return;
    const d = Math.hypot(x - c.x, y - c.y);
    if (d > CANON.range) { const k = CANON.range / d; x = c.x + (x - c.x) * k; y = c.y + (y - c.y) * k; }
    r.next = now + CANON.reload; r.shots++;
    this.ev(c.x, c.y, ['fx', 'cannon', Math.round(c.x), Math.round(c.y), 0, 0]);
    this.later(CANON.flight, () => {
      if (this.fs.rounds.get(r.k) !== r) return;
      const t = this.time - r.t0, hit = canonHit(r.targets, r.hits, x, y, t);
      let pts = 0;
      if (hit >= 0) { r.hits.add(hit); const tg = r.targets[hit]; pts = tg.pts; r.score += pts; if (tg.kind === 'mouette_or') { const q = this.players.get(r.pid); if (q) this.festSecret(q, 'mouette_or'); } }
      const msg = { t: 'fest', a: 'impact', k: r.k, x: Math.round(x), y: Math.round(y), hit, pts, score: r.score };
      for (const q of this.players.values()) if (q.room === -1 && dist(q, c) < 900) this.send(q, msg);
    });
  },
  canonTick() {
    for (const r of this.fs.rounds.values()) {
      const q = this.players.get(r.pid), c = this.world.fest.cannons[r.k];
      if (!q || q.dead || q.room !== -1 || dist(q, c) > 44) { this.canonEnd(r, 'parti'); continue; }
      if (this.time > r.end + CANON.flight + 0.1) this.canonEnd(r, 'fin');
    }
  },
  canonEnd(r, why) {
    if (this.fs.rounds.get(r.k) !== r) return;
    this.fs.rounds.delete(r.k);
    const p = this.players.get(r.pid);
    const c = this.world.fest.cannons[r.k];
    for (const q of this.players.values()) if (q.room === -1 && dist(q, c) < 900) this.send(q, { t: 'fest', a: 'canonfin', k: r.k, score: r.score });
    if (!p) return;
    if (p.fx) p.fx.canon = null;
    if (why !== 'fin') return this.toast(p, `Manche interrompue : ${r.score} point${r.score > 1 ? 's' : ''}.`, 'info');
    const rec = this.festBest(p, 'canon', r.score);
    this.toast(p, `Fin de la manche : ${r.score} point${r.score > 1 ? 's' : ''} en ${r.shots} tir${r.shots > 1 ? 's' : ''}${rec ? ' — votre record !' : ''}.`, 'quest');
    if (r.score >= CANON.stamp && this.festStamp(p, 'canon')) return;
    if (r.score >= 30) this.unlock(p, 'fete_canonnier');
    this.festGive(p, Math.min(20, 3 + Math.floor(r.score / 2)), 'Le concours de canonniers', 'canon');
  },

  // ============================================================ 2. la chasse au trésor de la grand-mère Bellécume
  trView(p) {
    const t = p.fest.tr; if (!t || t.ed !== this.fs.ed.key) return null;
    const C = (k) => CLUES.find((c) => c.k === k);
    return { i: t.i, n: t.clues.length, riddle: t.i < t.clues.length ? C(t.clues[t.i]).riddle : CHEST_AT[this.fs.ed.variant].riddle,
      found: t.clues.slice(0, t.i).map((k, j) => ({ at: C(k).at, sym: SYMBOLS[t.syms[j]], num: ROMAN[t.nums[j]] })), solved: t.solved ? 1 : 0 };
  },
  trStart(p) {
    if (!this.festNear(p, 'mira', 110)) return;
    const cur = p.fest.tr;
    if (cur && cur.ed === this.fs.ed.key && !cur.solved) return this.toast(p, `Mira : « Vous avez déjà la carte de ma grand-mère ! L’indice : ${this.trView(p).riddle} »`, 'quest');
    // un groupe chasse ensemble : on reprend la chasse d'un compagnon qui a commencé
    const mate = this.hGroup(p).find((q) => q !== p && q.fest && q.fest.tr && q.fest.tr.ed === this.fs.ed.key && !q.fest.tr.solved);
    if (mate) { p.fest.tr = JSON.parse(JSON.stringify(mate.fest.tr)); p.fest.tr.solved = 0; }
    else {
      const clues = shuffled(CLUES.map((c) => c.k)).slice(0, 4), nums = shuffled([0, 1, 2, 3]), syms = shuffled([...SYMBOLS.keys()]).slice(0, 4);
      p.fest.tr = { ed: this.fs.ed.key, clues, nums, syms, i: 0, solved: 0, wrongAt: 0 };
    }
    p.dirtyMe = true;
    this.send(p, { t: 'fest', a: 'tresor', ...this.trView(p), start: 1 });
    this.festPush(p);
  },
  trClue(p, k) {
    const t = p.fest.tr;
    if (!t || t.ed !== this.fs.ed.key || t.solved) return this.toast(p, 'Rien de particulier… Mira Bellécume, près de la scène, a une carte à vous confier.', 'info');
    if (t.i >= t.clues.length || t.clues[t.i] !== k) return this.toast(p, t.clues.includes(k) && t.clues.indexOf(k) < t.i ? 'Vous avez déjà lu cet indice.' : 'Rien ici… pour l’instant.', 'info');
    const adv = (q) => { const u = q.fest.tr; if (!u || u.ed !== t.ed || u.solved || u.clues[u.i] !== k) return; u.i++; q.dirtyMe = true;
      const j = u.i - 1, C = CLUES.find((c) => c.k === k);
      this.send(q, { t: 'fest', a: 'tresor', ...this.trView(q), clue: { at: C.at, sym: SYMBOLS[u.syms[j]], num: ROMAN[u.nums[j]] }, by: q === p ? null : p.name });
      this.festPush(q); };
    adv(p);
    for (const q of this.hGroup(p)) if (q !== p && q.room === p.room && dist(q, p) < 220) adv(q); // ensemble : ceux qui sont là
    this.ev(p.x, p.y, ['fx', 'dig', Math.round(p.x), Math.round(p.y)]);
  },
  trChest(p, v) {
    const t = p.fest.tr;
    if (v !== this.fs.ed.variant) return this.toast(p, 'Un vieux coffre, vide depuis longtemps.', 'info');
    if (!t || t.ed !== this.fs.ed.key || t.solved || t.i < t.clues.length) return this.toast(p, 'Le coffre de la grand-mère Bellécume est fermé par un cadenas à symboles. Il vous faut les quatre indices.', 'info');
    if (this.time < (t.wrongAt || 0)) return this.toast(p, 'Le cadenas est encore grippé. Patientez un peu.', 'warn');
    const correct = t.nums.map((n, j) => [n, t.syms[j]]).sort((a, b) => a[0] - b[0]).map(([, s]) => s);
    const opts = [correct]; let guard = 0;
    while (opts.length < 4 && guard++ < 50) { const o = shuffled(correct); if (!opts.some((q) => q.join() === o.join())) opts.push(o); }
    t.opts = shuffled(opts); t.ok = t.opts.findIndex((o) => o.join() === correct.join());
    this.send(p, { t: 'fest', a: 'enigme', opts: t.opts.map((o) => o.map((s) => SYMBOLS[s])), found: this.trView(p).found });
  },
  trAnswer(p, o) {
    const t = p.fest.tr; if (!t || !t.opts || t.solved) return;
    if (o !== t.ok) { t.wrongAt = this.time + 10; t.opts = null; return this.toast(p, 'Clac… le cadenas résiste. Relisez les chiffres gravés sous chaque symbole.', 'warn'); }
    t.solved = 1; t.opts = null; p.dirtyMe = true;
    p.gold += 120; this.ev(p.x, p.y, ['fx', 'chest', Math.round(p.x), Math.round(p.y)]);
    this.toast(p, 'Le cadenas s’ouvre ! Dans le coffre : 120 doublons, et un mot : « Pour celui qui sait chercher. Le reste du trésor, c’est la fête. »', 'quest');
    if (!this.festStamp(p, 'tresor')) this.festGive(p, 8, 'La chasse au trésor', 'tresor');
    this.festPush(p);
  },

  // ============================================================ 3. le défi des tavernes (Barnabé Tire-Bouchon)
  tavMsg(p, m) {
    const c = String(m.c || ''), fx = this.fx(p);
    if (c === 'start') {
      if (!this.festNear(p, 'barnabe', 110)) return;
      fx.tav = { stage: 'des', pts: { des: 0, mem: 0, ref: 0 }, dice: this.tavRoll(3), rr: TAV.des.rerolls };
      return this.send(p, { t: 'fest', a: 'tav', stage: 'des', dice: fx.tav.dice, rr: fx.tav.rr, twist: this.fs.ed.variant });
    }
    const g = fx.tav; if (!g) return;
    if (c === 'stop') { fx.tav = null; return; }
    if (g.stage === 'des') {
      if (c === 'relancer' && g.rr > 0) { const mask = m.mask | 0; g.dice = g.dice.map((d, i) => (mask & (1 << i) ? this.tavRoll(1)[0] : d)); g.rr--; return this.send(p, { t: 'fest', a: 'tav', stage: 'des', dice: g.dice, rr: g.rr }); }
      if (c === 'garder' || (c === 'relancer' && g.rr <= 0)) {
        const six = this.fs.ed.variant === 0; // l'édition des Lampions : les dés de Barnabé ont un six de plus
        const him = [0, 0, 0].map(() => (six && Math.random() < 0.28 ? 6 : 1 + Math.floor(Math.random() * 6)));
        const sum = (a) => a.reduce((s, d) => s + d, 0), brelan = (a) => a[0] === a[1] && a[1] === a[2];
        const me = sum(g.dice) + (brelan(g.dice) ? 10 : 0), them = sum(him) + (brelan(him) ? 10 : 0);
        g.pts.des = (me > them ? 6 : me === them ? 3 : 1) + (brelan(g.dice) ? 2 : 0);
        g.stage = 'mem'; g.seq = this.tavSeq(3);
        return this.send(p, { t: 'fest', a: 'tav', stage: 'mem', him, me: g.dice, pts: g.pts.des, seq: g.seq, speed: this.fs.ed.variant === 1 ? 0.42 : 0.6 });
      }
      return;
    }
    if (g.stage === 'mem' && c === 'mem') {
      const ans = Array.isArray(m.seq) ? m.seq.map((x) => x | 0) : [];
      if (ans.join() === g.seq.join()) {
        g.pts.mem++;
        if (g.seq.length < TAV.mem.max) { g.seq = [...g.seq, Math.floor(Math.random() * TAV.mem.colors)]; return this.send(p, { t: 'fest', a: 'tav', stage: 'mem', seq: g.seq, ok: 1, pts: g.pts.mem, speed: this.fs.ed.variant === 1 ? 0.42 : 0.6 }); }
      }
      g.stage = 'ref'; g.tries = 0; g.bestRt = 9;
      return this.send(p, { t: 'fest', a: 'tav', stage: 'ref', mem: g.pts.mem, miss: ans.join() !== g.seq.join() ? 1 : 0 });
    }
    if (g.stage === 'ref') {
      if (c === 'pret') { // « Prêt ? » puis, après un temps au hasard, « Tirez ! »
        if (g.waiting || g.tries >= TAV.ref.tries) return;
        g.waiting = true; g.goAt = 0; g.tok = (g.tok || 0) + 1; const tok = g.tok;
        const wait = rand(TAV.ref.min, TAV.ref.max) * (this.fs.ed.variant === 2 ? 1.3 : 1);
        this.later(wait, () => { if (fx.tav !== g || g.tok !== tok || !g.waiting) return; g.goAt = this.time; this.send(p, { t: 'fest', a: 'tav', stage: 'ref', go: 1 }); });
        return this.send(p, { t: 'fest', a: 'tav', stage: 'ref', ready: 1, tries: g.tries });
      }
      if (c === 'tir' && g.waiting) {
        g.waiting = false; g.tries++;
        let rt = g.goAt ? this.time - g.goAt : -1; // mesuré par le serveur (le réseau compte un peu : on l'excuse de 60 ms)
        if (rt >= 0) rt = Math.max(0.1, rt - 0.06);
        if (rt >= 0 && rt < g.bestRt) g.bestRt = rt;
        const done = g.tries >= TAV.ref.tries;
        if (done) return this.tavEnd(p, g);
        return this.send(p, { t: 'fest', a: 'tav', stage: 'ref', rt: rt < 0 ? -1 : Math.round(rt * 1000), tries: g.tries });
      }
    }
  },
  tavRoll(n) { return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)); },
  tavSeq(n) { return Array.from({ length: n }, () => Math.floor(Math.random() * TAV.mem.colors)); },
  tavEnd(p, g) {
    const rt = g.bestRt; g.pts.ref = rt < 0.25 ? 6 : rt < 0.35 ? 4 : rt < 0.5 ? 2 : rt < 9 ? 1 : 0;
    const total = g.pts.des + g.pts.mem + g.pts.ref;
    p.fx.tav = null;
    this.send(p, { t: 'fest', a: 'tav', stage: 'fin', rt: rt < 9 ? Math.round(rt * 1000) : -1, pts: g.pts, total });
    const rec = this.festBest(p, 'taverne', total);
    this.toast(p, `Défi des tavernes : ${total} points (dés ${g.pts.des}, chopes ${g.pts.mem}, bouchon ${g.pts.ref})${rec ? ' — votre record !' : ''}.`, 'quest');
    if (total >= 18) this.unlock(p, 'fete_taverne');
    if (total >= TAV.stamp && this.festStamp(p, 'taverne')) return;
    this.festGive(p, Math.min(15, 2 + Math.floor(total / 2)), 'Le défi des tavernes', 'taverne');
  },

  // ============================================================ 4. le parcours du gabier
  gabEnter(p) {
    const G = this.world.fest.gabier;
    this.teleport(p, G.start.x, G.start.y, {});
    this.fx(p).gab = { armed: false, started: 0, cp: 0 };
    this.send(p, { t: 'fest', a: 'gabier', ht: this.time });
    this.toast(p, 'Pimprenelle : « Prenez le départ au panneau, le chrono part à la ligne. Sautez, grimpez, esquivez, et sonnez la cloche ! »', 'quest');
  },
  gabArm(p) {
    const fx = this.fx(p), G = this.world.fest.gabier;
    fx.gab = { armed: true, started: 0, cp: 0 };
    if (p.x > G.line) this.teleport(p, G.start.x, G.start.y, {});
    this.send(p, { t: 'fest', a: 'gabier', ht: this.time, armed: 1 });
    this.toast(p, 'En place… Le chrono part quand vous franchissez la ligne.', 'info');
  },
  gabMove(p, s) { // sauter, se balancer, grimper, glisser : un geste, et l'on est de l'autre côté
    if (!s.to) return;
    this.ev(p.x, p.y, ['emote', p.id, s.k === 'gab_saut' ? 'salto' : 'salut']);
    this.teleport(p, s.to.x, s.to.y, {});
  },
  gabFinish(p) {
    const g = p.fx && p.fx.gab;
    if (!g || !g.started) return this.toast(p, 'La cloche ne sonne qu’à la fin d’un parcours chronométré : prenez le départ au panneau.', 'info');
    const t = Math.round((this.time - g.started) * 10) / 10;
    p.fx.gab = null;
    this.ev(p.x, p.y, ['fx', 'bell', Math.round(p.x), Math.round(p.y)]);
    this.send(p, { t: 'fest', a: 'gabier', done: 1, time: t });
    const rec = this.festBest(p, 'gabier', t);
    this.toast(p, `Ding ! ${fmt(t)}${rec ? ' — votre meilleur temps !' : ''}`, 'quest');
    if (t <= GABIER.gold) this.unlock(p, 'fete_gabier');
    if (t <= GABIER.stamp && this.festStamp(p, 'gabier')) return;
    this.festGive(p, t <= GABIER.gold ? 12 : t <= GABIER.silver ? 8 : t <= GABIER.stamp ? 5 : 3, 'Le parcours du gabier', 'gabier');
  },
  gabTick() {
    const F = this.world.fest, G = F.gabier, rid = F.rooms.gabier;
    let any = false;
    for (const p of this.players.values()) {
      if (p.room !== rid || p.dead) continue;
      any = true;
      const g = p.fx && p.fx.gab; if (!g) continue;
      if (g.armed && !g.started && p.x > G.line) { g.started = this.time; this.send(p, { t: 'fest', a: 'gabier', go: 1, ht: this.time }); }
      for (let k = G.checkpoints.length - 1; k > g.cp; k--) if (p.x >= G.checkpoints[k].x - 8) { g.cp = k; break; }
      if ((g.hitCd || 0) > this.time) continue;
      let hit = null;
      for (const b of gabBarrels(G, this.time)) if (Math.abs(b.x - p.x) < BARREL_R && Math.abs(b.y - (p.y - 4)) < BARREL_R + 2) { hit = 'Un tonneau vous fauche !'; break; }
      if (!hit) { const B = gabBoom(G, this.time); if (segDist(p.x, p.y - 4, B.x0, B.y0, B.x1, B.y1) < 7) hit = 'La bôme vous balaie !'; }
      if (hit) { g.hitCd = this.time + 1.2; const c = G.checkpoints[g.cp]; this.ev(p.x, p.y, ['fx', 'splinter', Math.round(p.x), Math.round(p.y)]); this.teleport(p, c.x, c.y, {}); this.toast(p, `${hit} Retour au dernier point de reprise.`, 'warn'); }
    }
    return any;
  },

  // ============================================================ 5. le duel des capitaines (la Lice)
  inLice(p) { return p && p.room === this.world.fest.rooms.lice; },
  duelMsg(p, m) {
    const c = String(m.c || ''), F = this.world.fest;
    if (c === 'champion') {
      if (!this.inLice(p) || !this.festNear(p, 'escarmouche', 130)) return;
      const n = Math.max(0, Math.min(2, m.n | 0));
      if (n > p.fest.ch) return this.toast(p, 'Escarmouche : « Un champion à la fois. Battez d’abord celui d’avant. »', 'warn');
      if ((p.fx && (p.fx.champ || p.fx.duel)) || [...this.fs.duels].length > 3) return this.toast(p, 'Un duel à la fois.', 'warn');
      if (this.mobs.some((mm) => mm.fest && mm.fest.duel && mm.state !== 'dead' && mm.fest.duel !== p.id)) return this.toast(p, 'Escarmouche : « La Lice est occupée. Un instant, le combat en cours se termine. »', 'warn');
      return this.champStart(p, n);
    }
    if (c === 'defier') {
      const q = [...this.players.values()].find((x) => x.name === String(m.name || ''));
      if (!q || q === p || !this.inLice(p) || !this.inLice(q)) return this.toast(p, 'Votre adversaire doit être dans la Lice.', 'warn');
      if (this.labWall(p, q)) return;
      if ((p.fx && (p.fx.duel || p.fx.champ)) || (q.fx && (q.fx.duel || q.fx.champ))) return this.toast(p, 'L’un de vous se bat déjà.', 'warn');
      this.fx(q).duelAsk = { from: p.id, until: this.time + 30 };
      this.send(q, { t: 'ask', kind: 'fduel', from: p.name });
      return this.toast(p, `Défi lancé à ${q.name}.`, 'info');
    }
    if (c === 'accepter' || c === 'refuser') {
      const ask = p.fx && p.fx.duelAsk, q = ask && this.players.get(ask.from);
      if (p.fx) p.fx.duelAsk = null;
      if (c === 'refuser') { if (q) this.toast(q, `${p.name} décline le défi.`, 'info'); return; }
      if (!ask || ask.until < this.time || !q || !this.inLice(p) || !this.inLice(q) || (q.fx && (q.fx.duel || q.fx.champ))) return this.toast(p, 'Ce défi a expiré.', 'warn');
      const d = { ids: [q.id, p.id], names: [q.name, p.name], t0: this.time + 3, end: this.time + 3 + 120 };
      this.fs.duels.add(d); this.fx(q).duel = d; this.fx(p).duel = d;
      this.teleport(q, F.lice.a.x, F.lice.a.y, {}); this.teleport(p, F.lice.b.x, F.lice.b.y, {});
      for (const x of [q, p]) { x.hp = x.stats.maxHp; x.invulnUntil = d.t0; x.dirtyMe = true; this.toast(x, `Duel amical : ${q.name} contre ${p.name}. Trois… deux… un… En garde !`, 'quest'); }
    }
  },
  // un champion de la Lice : un vrai combattant, à la mesure du challenger, qui ne vise que lui
  champStart(p, n) {
    const F = this.world.fest, C = CHAMPIONS[n], L = p.level;
    this.teleport(p, F.lice.a.x, F.lice.a.y, {});
    p.hp = p.stats.maxHp; p.invulnUntil = this.time + 2.5; p.dirtyMe = true;
    const m = this.addMob(C.id, F.lice.b.x, F.lice.b.y, true);
    const k = [1, 1.25, 1.55][n];
    m.maxHp = m.hp = Math.round((150 + 34 * L) * k); m.dmgMul = ((5 + L * 1.7) * [1, 1.15, 1.32][n]) / m.def.dmg;
    m.only = p.id; m.fest = { duel: p.id, n }; m.state = 'chase'; m.target = p.id; m.pauseUntil = this.time + 2.5; m.room = F.rooms.lice;
    this.fx(p).champ = m;
    this.ev(m.x, m.y, ['shout', m.id, C.line]);
  },
  champEnd(p, won, why) {
    const m = p.fx && p.fx.champ; if (!m) return;
    p.fx.champ = null;
    if (m.state !== 'dead') { m.state = 'dead'; this.ev(m.x, m.y, ['die', m.id]); }
    const C = CHAMPIONS[m.fest.n];
    if (!won) { if (why === 'touché') this.toast(p, `${C.name} vous a touché. Pas de mal : on se relève, et on recommence quand on veut.`, 'warn'); return; }
    this.toast(p, `${C.name} s’incline : « Bien joué ! » La Lice applaudit.`, 'quest');
    const first = m.fest.n >= p.fest.ch; if (first) p.fest.ch = Math.max(p.fest.ch, m.fest.n + 1);
    if (p.fest.ch >= 3) this.unlock(p, 'fete_maitre');
    if (!this.festStamp(p, 'duel')) this.festGive(p, [5, 8, 12][m.fest.n], 'Le duel des capitaines', 'duel');
    this.festPush(p);
  },
  // mis à terre dans la Lice : ni mort, ni perte d'équipement, la fin du duel
  festKnock(p) {
    if (!this.inLice(p)) return false;
    p.hp = Math.max(1, Math.round(p.stats.maxHp * 0.3)); p.dirtyMe = true; p.invulnUntil = this.time + 2;
    const fx = p.fx || {};
    if (fx.champ) this.champEnd(p, false, 'touché');
    else if (fx.duel) this.fduelEnd(fx.duel, p.id, 'touché');
    else this.toast(p, 'À terre ! Dans la Lice, on ne meurt pas.', 'warn');
    this.ev(p.x, p.y, ['emote', p.id, 'salto']);
    return true;
  },
  festPvp(a, b) { // dans la Lice : seulement entre deux adversaires d'un même duel, une fois le « En garde ! » donné
    if (this.festSafe(a) || this.festSafe(b)) return false; // la plage du festival
    if ((a.fx && a.fx.race && a.fx.race.R) || (b.fx && b.fx.race && b.fx.race.R)) return false; // une régate amicale : on ne se canonne pas
    if (!this.inLice(a) && !this.inLice(b)) return null;
    const d = a.fx && a.fx.duel;
    return !!(d && b.fx && b.fx.duel === d && this.time >= d.t0);
  },
  fduelEnd(d, loserId, why) {
    if (!this.fs.duels.has(d)) return;
    this.fs.duels.delete(d);
    const [A, B] = d.ids.map((id) => this.players.get(id));
    for (const q of [A, B]) if (q && q.fx) q.fx.duel = null;
    if (why === 'temps') { for (const q of [A, B]) if (q) this.toast(q, 'Temps écoulé : match nul, et l’honneur est sauf.', 'info'); return; }
    const W = loserId === d.ids[0] ? B : A, L = loserId === d.ids[0] ? A : B;
    if (W) {
      this.toast(W, `Victoire dans la Lice ${why === 'forfait' ? '(forfait)' : ''} !`, 'quest');
      const fx = this.fx(W), key = L ? L.key : '';
      fx.beat = fx.beat || {};
      if (why !== 'forfait' && (!fx.beat[key] || this.time - fx.beat[key] > 1800)) { fx.beat[key] = this.time; if (!this.festStamp(W, 'duel')) this.festGive(W, 8, 'Le duel des capitaines', 'duel'); } // le même adversaire ne rapporte qu'une fois par demi-heure
    }
    if (L && why === 'touché') this.toast(L, 'Touché ! Une autre fois, peut-être.', 'warn');
  },
  duelTickFest() {
    for (const d of this.fs.duels) {
      const [A, B] = d.ids.map((id) => this.players.get(id));
      if (!A || !this.inLice(A)) { this.fduelEnd(d, d.ids[0], 'forfait'); continue; }
      if (!B || !this.inLice(B)) { this.fduelEnd(d, d.ids[1], 'forfait'); continue; }
      if (this.time > d.end) this.fduelEnd(d, 0, 'temps');
    }
    for (const p of this.players.values()) { const m = p.fx && p.fx.champ; if (m && (m.state === 'dead' || !this.inLice(p))) { if (m.state === 'dead' && m.festWon) this.champEnd(p, true); else this.champEnd(p, false, 'parti'); } }
  },
  festKill(m, killer) { // un champion « tombe » : il s'incline (pas de butin : c'est la fête)
    if (!m.fest) return false;
    m.festWon = 1;
    const p = this.players.get(m.fest.duel);
    if (p && p.fx && p.fx.champ === m) this.champEnd(p, true);
    void killer;
    return true;
  },

  // ============================================================ 6. la course des Mille Voiles
  raceBuoys() { // l'ordre des bouées selon la variante (les Mouettes courent à l'envers)
    const B = this.world.fest.buoys;
    return this.fs.ed.variant === 1 ? B.slice().reverse() : B.slice();
  },
  racePaths() { // les chemins des rivaux, calculés une fois par sens de course
    const v = this.fs.ed.variant === 1 ? 1 : 0;
    this.fs.paths = this.fs.paths || {};
    if (this.fs.paths[v]) return this.fs.paths[v];
    const W = this.world, water = (tx, ty) => { const i = ty * W.W + tx; return tx > 0 && ty > 0 && tx < W.W && (W.tiles[i] === T.DEEP || W.tiles[i] === T.WATER) && W.roomGrid[i] < 0; };
    const L = RACE.line, sx = (L.x0 + L.x1) / 2;
    const pts = [[sx, L.y + 3], [sx, L.y - 6], ...this.raceBuoys().map((b) => [Math.round(b.x / TILE), Math.round(b.y / TILE)]), [sx, L.y + 5], [sx, L.y - 4]];
    let path = [];
    for (let k = 1; k < pts.length; k++) { const seg = seaPath(water, pts[k - 1], pts[k], 3, 2, [100, 90, 440, 290]); path = path.concat(k > 1 ? seg.slice(1) : seg); }
    return (this.fs.paths[v] = path.map(([x, y]) => ({ x: x * TILE + 8, y: y * TILE + 8 })));
  },
  raceJoin(p) {
    if (!this.festNear(p, 'anselin', 120) && !(p.ship && this.myShip(p) && Math.hypot(p.x - (RACE.line.x0 + RACE.line.x1) * 8, p.y - RACE.line.y * TILE) < 500)) return this.toast(p, 'Les inscriptions se font auprès d’Anselin, sur la jetée.', 'warn');
    if (p.fx && p.fx.race) return this.toast(p, 'Vous êtes déjà inscrit.', 'info');
    if (p.room !== -1) return;
    if (!this.fs.start) this.fs.start = { at: this.time + RACE.open, ids: new Set() };
    const st = this.fs.start;
    if (st.at - this.time < 4) return this.toast(p, 'Le départ va être donné : attendez la prochaine course.', 'warn');
    st.ids.add(p.id); this.fx(p).race = { pending: st };
    const n = Math.round(st.at - this.time);
    for (const id of st.ids) { const q = this.players.get(id); if (q) this.send(q, { t: 'fest', a: 'course', wait: Math.max(0, st.at - this.time), n: st.ids.size }); }
    this.toast(p, `Inscrit ! Départ dans ${n} secondes. ${p.ship ? 'Vous courez sur votre navire (temps compensé selon sa vitesse).' : 'Anselin vous prête un cotre des Mille Voiles : il vous attendra sur la ligne.'}`, 'quest');
  },
  raceLaunch(st) {
    this.fs.start = null;
    const racers = [...st.ids].map((id) => this.players.get(id)).filter((q) => q && !q.dead && q.fx && q.fx.race && q.fx.race.pending === st);
    if (!racers.length) return;
    const R = { id: this.fs.raceId++, t0: this.time + 10, buoys: this.raceBuoys(), racers: new Map(), ghosts: [], done: 0, finishers: [], cur: this.fs.ed.variant === 2 ? -1 : 1 };
    const S = shipOf('sloop'), L = RACE.line, slots = [];
    for (let row = 0; row < 3; row++) for (let col = -3; col <= 3; col++) slots.push({ x: (L.x0 + L.x1) * 8 + col * 48, y: (L.y + 6 + row * 4) * TILE });
    const others = () => [...this.ships.values()];
    const place = (o) => { for (const s of slots) { if (s.used) continue; if (shipFits(this.world, S, s.x, s.y, -Math.PI / 2, others())) { s.used = true; return s; } } return null; };
    for (const q of racers) {
      let sh = this.myShip(q);
      if (sh && !sh.rental && sh.own === q.key && Math.hypot(sh.x - (L.x0 + L.x1) * 8, sh.y - L.y * TILE) < 600) { /* son propre navire */ }
      else {
        if (q.ship) this.leaveDeck(q);
        const s = place(); if (!s) { this.toast(q, 'La ligne est encombrée : la course partira sans vous, désolé.', 'warn'); q.fx.race = null; continue; }
        sh = this.createShip({ key: 'loc:' + q.key, name: q.name, id: 0, crew: q.crew || 0 }, 'cotre_fete', s.x, s.y, -Math.PI / 2, { anchor: 2 });
        sh.rental = q.key; sh.cos = this.festShipCos(q); sh.hull = this.hullMax('cotre_fete');
        const st2 = stations(this.spec(sh)).find((x) => x.k === 'helm');
        this.joinDeck(q, sh, st2.x, st2.y); this.sendPos(q); this.takePost(q, 'helm');
      }
      sh.race = R.id;
      const comp = RACE.rentSpeed / Math.max(60, ITEMS[sh.item].boat.speed); // le temps compensé : un navire rapide court avec un handicap
      R.racers.set(q.id, { i: 0, pen: 0, done: false, ship: sh.id, comp: sh.rental ? 1 : comp, name: q.name });
      q.fx.race = { R };
    }
    if (!R.racers.size) return;
    const path = this.racePaths();
    RIVALS.forEach((rv, k) => {
      const s = place(); if (!s) return;
      const sh = this.createShip({ key: 'pnj:' + k, name: rv.name, id: 0 }, 'cotre_fete', s.x, s.y, -Math.PI / 2, { anchor: 2 });
      sh.ghost = { path: [{ x: s.x, y: s.y }, ...path], j: 1, skill: rv.skill * rand(0.96, 1.04) }; sh.race = R.id; sh.pal = rv.pal; sh.npcName = rv.name;
      R.ghosts.push(sh);
    });
    this.fs.races.add(R);
    const names = [...R.racers.values()].map((r) => r.name).concat(R.ghosts.map((g) => g.npcName));
    for (const q of racers) if (q.fx && q.fx.race) this.send(q, { t: 'fest', a: 'course', go: 10, buoys: R.buoys.map((b) => [b.x, b.y, b.n, b.env]), names, cur: R.cur });
    this.broadcastChat(null, `⛵ La Course des Mille Voiles va partir ! ${names.join(', ')} sont sur la ligne.`, 'event');
    for (const k of [3, 2, 1]) this.later(10 - k, () => this.ev((L.x0 + L.x1) * 8, L.y * TILE, ['fx', 'cannon', (L.x0 + L.x1) * 8, L.y * TILE - 30, 0, 0]));
    this.later(10, () => { for (const g of R.ghosts) { g.anchor = 0; g.sail = g.sailT = 1; } this.ev((L.x0 + L.x1) * 8, L.y * TILE, ['fest', 'depart', (L.x0 + L.x1) * 8, L.y * TILE]); });
  },
  raceTarget(R, i) { // la cible numéro i : 0 = la ligne (au départ), 1..n les bouées, n+1 = la ligne (l'arrivée)
    if (i === 0 || i === R.buoys.length + 1) return null;
    return R.buoys[i - 1];
  },
  raceTick() {
    if (this.fs.start && this.time >= this.fs.start.at) this.raceLaunch(this.fs.start);
    const L = RACE.line, ly = L.y * TILE + 8, lx0 = L.x0 * TILE, lx1 = L.x1 * TILE + 16;
    for (const R of this.fs.races) {
      const now = this.time;
      for (const [pid, r] of R.racers) {
        if (r.done) continue;
        const q = this.players.get(pid), sh = this.ships.get(r.ship);
        if (!q || !sh || sh.sinkT || q.ship !== sh.id) { this.raceDrop(q || { id: pid, fx: null }, sh && sh.sinkT ? 'naufrage' : 'parti', R); continue; }
        const prevY = r.py ?? sh.y; r.py = sh.y;
        const crossN = prevY > ly && sh.y <= ly && sh.x > lx0 && sh.x < lx1; // franchir la ligne vers le nord
        if (now < R.t0) { if (crossN || sh.y < ly - 4) { if (!r.fs) { r.fs = 1; r.pen += RACE.falseStart; this.toast(q, `Faux départ ! +${RACE.falseStart} secondes.`, 'warn'); } } continue; }
        if (r.i === 0) { if (crossN || (r.fs && sh.y < ly && sh.x > lx0 && sh.x < lx1)) { r.i = 1; this.send(q, { t: 'fest', a: 'course', i: 1 }); } continue; }
        const b = this.raceTarget(R, r.i);
        if (b) {
          if (Math.hypot(sh.x - b.x, sh.y - b.y) < RACE.r) {
            r.i++; const sp = Math.round((now - R.t0) * 10) / 10;
            this.send(q, { t: 'fest', a: 'course', i: r.i, split: sp, env: this.raceTarget(R, r.i) ? this.raceTarget(R, r.i).env : 'L’arrivée' });
            this.ev(b.x, b.y, ['fest', 'bouee', Math.round(b.x), Math.round(b.y)]);
          }
          if (!r.secret && Math.hypot(sh.x - (SECRET_BUOY.tx * TILE + 8), sh.y - (SECRET_BUOY.ty * TILE + 8)) < SECRET_BUOY.r) { r.secret = 1; this.festSecret(q, 'passe'); }
        } else if (crossN) this.raceFinish(R, q, r);
        if (now - R.t0 > RACE.maxTime) this.raceDrop(q, 'temps', R);
      }
      // les rivaux : ils suivent leur chemin, au gré du vent
      for (const g of R.ghosts) if (!g.ghost.done && now >= R.t0) this.raceGhostCheck(R, g);
      const live = [...R.racers.values()].some((r) => !r.done);
      if (!live || now - R.t0 > RACE.maxTime + 30) this.raceEnd(R);
    }
  },
  raceGhostCheck(R, g) {
    const G = g.ghost; if (G.j >= G.path.length && !G.done) { G.done = 1; R.finishers.push({ name: g.npcName, t: Math.round((this.time - R.t0) * 10) / 10, npc: 1 }); this.ev(g.x, g.y, ['fest', 'arrivee', Math.round(g.x), Math.round(g.y), g.npcName, R.finishers.length]); }
  },
  festGhost(sh, dt) { // un rival de la course : pas de physique, un chemin et le vent (il ne bloque jamais personne)
    const G = sh.ghost; if (!G || G.done || G.j >= G.path.length) { sh.vx = sh.vy = sh.u = 0; return; }
    if (sh.anchor) return;
    const t = G.path[G.j], dx = t.x - sh.x, dy = t.y - sh.y, d = Math.hypot(dx, dy);
    if (d < 20) { G.j++; return; }
    const want = Math.atan2(dy, dx); let da = want - sh.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    sh.a += Math.max(-1.6 * dt, Math.min(1.6 * dt, da));
    const v = RACE.rentSpeed * G.skill * windFactor(sh.a, this.wind.a) * this.wind.s;
    sh.vx = Math.cos(sh.a) * v; sh.vy = Math.sin(sh.a) * v; sh.u = v; sh.sail = 1; sh.rud = Math.max(-1, Math.min(1, da));
    sh.x += sh.vx * dt; sh.y += sh.vy * dt;
  },
  // les courants et les vents de la course (ils ne s'appliquent qu'aux navires qui courent)
  festCurrent(sh, dt) {
    if (!sh.race || sh.ghost) { sh.windMul = 1; return; }
    const flip = this.fs.ed.variant === 2 ? -1 : 1; // l'édition des Étoiles : ce soir, les courants s'inversent
    for (const c of CURRENTS) { const cx = c.tx * TILE + 8, cy = c.ty * TILE + 8, d = Math.hypot(sh.x - cx, sh.y - cy), R = c.r * TILE; if (d < R) { const k = 1 - d / R; sh.vx += c.vx * flip * k * dt * 1.6; sh.vy += c.vy * flip * k * dt * 1.6; } }
    let mul = 1; for (const w of WINDS) { const d = Math.hypot(sh.x - (w.tx * TILE + 8), sh.y - (w.ty * TILE + 8)), R = w.r * TILE; if (d < R) mul *= 1 + (w.mul - 1) * (1 - d / R); }
    sh.windMul = mul;
  },
  raceFinish(R, q, r) {
    r.done = true;
    const raw = Math.round((this.time - R.t0) * 10) / 10, t = Math.round((raw * r.comp + r.pen) * 10) / 10;
    R.finishers.push({ name: q.name, t, pid: q.id });
    const rank = R.finishers.length;
    this.ev(q.x, q.y, ['fest', 'arrivee', Math.round(q.x), Math.round(q.y), q.name, rank]);
    const rec = this.festBest(q, 'course', t);
    this.send(q, { t: 'fest', a: 'course', fin: 1, time: t, raw, rank, of: R.racers.size + R.ghosts.length });
    this.toast(q, `Arrivée ! ${rank === 1 ? 'Premier' : rank + 'e'} en ${fmt(t)}${r.comp !== 1 ? ' (temps compensé)' : ''}${r.pen ? `, dont ${r.pen} s de pénalité` : ''}${rec ? ' — votre meilleur temps !' : ''}.`, 'quest');
    this.broadcastChat(null, `⛵ ${q.name} franchit la ligne de la Course des Mille Voiles : ${rank === 1 ? 'PREMIER' : rank + 'e'} en ${fmt(t)} !`, 'event');
    if (rank === 1) this.unlock(q, 'fete_course');
    if (!this.festStamp(q, 'course')) this.festGive(q, [15, 11, 8][rank - 1] || 5, 'La Course des Mille Voiles', 'course');
    q.fx.race = null;
  },
  raceDrop(q, why, R0 = null) {
    const R = R0 || (q.fx && q.fx.race && q.fx.race.R);
    if (q.fx && q.fx.race && q.fx.race.pending) { q.fx.race.pending.ids.delete(q.id); q.fx.race = null; if (why === 'abandon') this.toast(q, 'Inscription annulée.', 'info'); return; }
    if (!R) return;
    const r = R.racers.get(q.id); if (!r || r.done) return;
    r.done = true; r.out = why;
    if (q.fx) q.fx.race = null;
    if (q.key) { this.send(q, { t: 'fest', a: 'course', out: why }); this.toast(q, why === 'naufrage' ? 'Le cotre a sombré : course perdue. Anselin en a d’autres.' : why === 'temps' ? 'Le temps est écoulé : la course est finie pour vous.' : 'Course abandonnée.', 'warn'); }
  },
  raceEnd(R) {
    this.fs.races.delete(R);
    for (const g of R.ghosts) this.ships.delete(g.id);
    for (const r of R.racers.values()) { const sh = this.ships.get(r.ship); if (sh) { sh.race = 0; if (sh.rental) sh.rentEnd = this.time + 90; } }
  },
  rentalTick() { // un cotre de location retourne à Anselin quand on en descend (ou 90 s après la course)
    for (const sh of this.ships.values()) {
      if (!sh.rental || sh.race) continue;
      if (!sh.crew.size || (sh.rentEnd && this.time > sh.rentEnd && !sh.crew.size)) this.removeShip(sh, null);
      else if (sh.rentEnd && this.time > sh.rentEnd + 300) this.removeShip(sh, 'Le cotre de location rentre au port : tout le monde à terre.');
    }
  },

  // ============================================================ le spectacle de chaque nuit
  showTick() {
    const day = Math.floor(this.worldTime / DAY_LENGTH), f = (this.worldTime % DAY_LENGTH) / DAY_LENGTH;
    if (!this.fs.show && this.festOpen() && f >= SHOW.at && f < SHOW.at + 0.06 && this.fs.lastShow !== day) this.showStart(day);
    const S = this.fs.show; if (!S) return;
    const t = this.time - S.t0;
    for (const [at, i] of [[2, 0], [7, 1], [12, 2], [18, 3]]) if (t >= at && !S.said[i]) { S.said[i] = 1; this.hNpcSay('mira', this.showLine(i)); }
    if (t >= 118 && !S.rewarded) { S.rewarded = 1; for (const p of this.players.values()) if (p.room === -1 && inBox(p, BEACH) && p.fest.show !== S.id) { p.fest.show = S.id; this.festGive(p, TOK.show, 'Le spectacle de la Nuit des Mille Voiles'); } }
    if (t > SHOW.dur) this.fs.show = null;
  },
  showStart(day, force = false) {
    this.fs.lastShow = day;
    this.fs.show = { id: day, t0: this.time, seed: (Math.random() * 2 ** 31) | 0, said: {}, rewarded: 0, force };
    const msg = { t: 'fest', a: 'show', id: day, el: 0, seed: this.fs.show.seed, dur: SHOW.dur }; // el : le temps déjà écoulé du spectacle
    for (const p of this.players.values()) this.send(p, msg);
    this.broadcastChat(null, '🎆 Le spectacle de la Nuit des Mille Voiles commence sur la plage de Port-Lanterne !', 'event');
  },
  showLine(i) {
    if (i !== 2) return MIRA_SHOW[i];
    const heroes = [...this.players.values()].filter((p) => p.fest && p.fest.done === this.fs.ed.key).map((p) => p.name);
    const best = Object.values(this.fs.board.course).sort((a, b) => a.v - b.v)[0];
    return (heroes.length ? `Saluons nos héros, qui ont rempli leur carnet : ${heroes.slice(0, 6).join(', ')} !` : 'Six épreuves vous attendent encore : personne n’a rempli son carnet ce soir. Demain, peut-être ?')
      + (best ? ` Et le meilleur temps de la course, cette semaine : ${best.n}, en ${fmt(best.v)} !` : '');
  },
  // danser sur la scène pendant le bouquet final : un secret
  festDance(p) {
    const S = this.fs.show, st = this.world.fest.stage;
    if (!S || p.room !== -1) return;
    const t = this.time - S.t0;
    if (t >= 112 && t <= SHOW.dur && p.x >= st.x0 && p.x < st.x1 && p.y >= st.y0 - 8 && p.y < st.y1 + 8) this.festSecret(p, 'valse');
  },

  // ============================================================ la boutique, les parures, les émotes
  festBuy(p, id) {
    const it = SHOP_BY[id]; if (!it) return;
    if (!this.festNear(p, 'zephyrine', 120)) return this.toast(p, 'Zéphyrine tient le comptoir des jetons, sur la plage.', 'warn');
    if (it.feat != null && it.feat !== this.fs.ed.variant) return this.toast(p, `${it.name} ne se trouve qu’à ${VARIANTS[it.feat].toLowerCase()}.`, 'warn');
    if (!it.again && p.fest.own.includes(id)) return this.toast(p, 'Vous l’avez déjà.', 'info');
    if (p.fest.tok < it.price) return this.toast(p, `Il vous manque ${it.price - p.fest.tok} jetons.`, 'warn');
    if (it.kind === 'objet' && !this.canTake(p, it.item, it.n)) return this.toast(p, 'Votre sac est plein.', 'warn');
    p.fest.tok -= it.price; p.dirtyMe = true;
    if (it.kind === 'objet') this.giveOrDrop(p, it.item, it.n);
    else { p.fest.own.push(id); if (it.kind === 'titre') this.unlock(p, id === 'titre_ame' ? 'fete_ame' : 'fete_fetard'); }
    this.toast(p, `${it.name} : à vous ! (${it.price} jetons)`, 'quest');
    this.festPush(p);
  },
  canTake(p, id, n) { return p.inv.some((s) => !s || (s.id === id && !ITEMS[id].unique)) || n <= 0; },
  festWear(p, id) {
    const it = SHOP_BY[id]; if (!it || !p.fest.own.includes(id) || !['voile', 'pavillon', 'tenue', 'deco'].includes(it.kind)) return;
    p.fest.eq[it.kind] = id; p.dirtyMe = true;
    if (it.kind === 'tenue') this.recalc(p); else this.festShipUpdate(p);
    this.festPush(p);
  },
  festUnwear(p, kind) { if (!p.fest.eq[kind]) return; delete p.fest.eq[kind]; if (kind === 'tenue') this.recalc(p); else this.festShipUpdate(p); this.festPush(p); },
  festLook(p) { const id = p.fest && p.fest.eq.tenue; return id && SHOP_BY[id] ? SHOP_BY[id].look : null; },
  festShipCos(p) { const e = (p.fest && p.fest.eq) || {}; const o = {}; if (e.voile) o.s = SHOP_BY[e.voile].sail; if (e.pavillon) o.f = SHOP_BY[e.pavillon].flag; if (e.deco) o.d = SHOP_BY[e.deco].deco; return Object.keys(o).length ? o : null; },
  festShipUpdate(p) { for (const sh of this.ships.values()) if (sh.own === p.key || sh.rental === p.key) { sh.cos = this.festShipCos(p); sh.ver++; } },
  festEmote(p, k) {
    if (!(k in FEST_EMOTES) || !p.fest.own.includes(k === 'valse' ? 'em_valse' : FEST_EMOTES[k])) return this.toast(p, 'Cette émote s’obtient au festival (comptoir de Zéphyrine).', 'info');
    if ((p.cds.emote || 0) > this.time) return;
    p.cds.emote = this.time + (k === 'feu' ? 3 : 1.2);
    this.ev(p.x, p.y, ['emote', p.id, k]);
    if (k === 'gigue' || k === 'valse') this.festDance(p);
  },
  festRocket(p) {
    if (!this.countItem(p, 'fusee_fete')) return this.toast(p, 'Plus de fusées : Zéphyrine en vend, cinq pour quinze jetons.', 'info');
    if ((p.cds.rocket || 0) > this.time) return;
    p.cds.rocket = this.time + 1.5;
    this.removeItem(p, 'fusee_fete', 1); p.dirtyInv = true;
    this.ev(p.x, p.y, ['fest', 'fusee', Math.round(p.x), Math.round(p.y), (Math.random() * 1e6) | 0]);
  },

  // ============================================================ chaque demi-seconde (et chaque pas pour le gabier et la course)
  festTick() {
    const ed = festEdition(Date.now(), this.fs.force);
    if (ed.key !== this.fs.ed.key || ed.open !== this.fs.ed.open) {
      const was = this.fs.ed.open; this.fs.ed = ed; this.festRoll();
      if (ed.open && !was) this.broadcastChat(null, `🎉 La Nuit des Mille Voiles commence à Port-Lanterne ! ${VARIANTS[ed.variant]} : six épreuves, une course, et un spectacle chaque nuit.`, 'event');
      if (!ed.open && was) { this.broadcastChat(null, '🌙 La Nuit des Mille Voiles s’achève. Merci, Port-Lanterne ! Rendez-vous jeudi prochain.', 'event'); for (const r of [...this.fs.rounds.values()]) this.canonEnd(r, 'fermé'); }
      for (const p of this.players.values()) this.festEdFor(p);
      this.festBroadcast();
    }
    this.canonTick(); this.showTick(); this.duelTickFest(); this.rentalTick();
    if (this.fs.ed.open) for (const p of this.players.values()) if (!p.dead && p.mem && !p.mem.has('vu:fete_accueil') && ((p.tut | 0) >= 99 || p.level >= 3) && this.festSafe(p) && !this.inCinema(p) && !p.ship && this.tickCount - (p.festSeenAt || 0) > 40) { p.festSeenAt = this.tickCount; this.startCinema([p], 'fete_accueil'); } // la première fois sur la plage en fête (lot 8 : pas avant la fin du tutoriel d'un pirate tout neuf)
    if (this.tickCount % 40 === 0) this.festCalm();
  },
};
