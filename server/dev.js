// Lot 2 — outils développeur : déverrouillage, personnage laboratoire, commandes de test, journal.
//
// Ce module ne tourne QUE sur le serveur Node (server/index.js l'installe). Il n'est inclus ni dans la page
// claude.ai ni dans la page GitHub : là, le moteur tourne dans le navigateur d'un joueur, aucun secret ne peut y
// être gardé, et le jeu répond « Accès refusé » à toute demande.
//
// Sécurité :
// - le compte doit figurer dans DEV_ACCOUNTS (variable d'environnement du serveur) ET présenter DEV_SECRET
//   (16 caractères au moins), comparé en temps constant. Ni l'un ni l'autre n'est dans le dépôt ni chez le client ;
// - cinq essais ratés par compte ou par adresse : quinze minutes d'attente ;
// - le jeton remis est signé (HMAC-SHA256), lié au compte, valable DEV_TTL_MIN minutes (120 par défaut), révocable
//   (déconnexion, révocation générale par la console d'administration, ou changement de DEV_SECRET) ;
// - CHAQUE commande revérifie le jeton, le compte connecté et la liste ; tout est journalisé (auteur, personnage,
//   date, commande, résultat, erreur) ; un joueur ordinaire reçoit « Accès refusé », quoi qu'il envoie.
//
// Le personnage laboratoire : un autre personnage (sauvegarde à part, clé « labo~compte~n », trois emplacements),
// qui ne peut ni échanger, ni grouper, ni se battre contre de vrais pirates, ni lâcher ou ramasser leur butin, ni
// acheter de propriété, ni entrer dans les classements. Les commandes qui modifient un personnage ne s'appliquent
// qu'à lui : le personnage principal n'est jamais touché.
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ITEMS, reqLevel } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { QUESTS, QUEST_ORDER, questState } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { SKILLS } from '../shared/data/skills.js';
import { PLACES, PLACE_ORDER } from '../shared/data/places.js';
import { shipOf, shipFits, BERTHS, findBerth } from '../shared/data/ships.js';
import { ZONES, canStand, zoneAt } from '../shared/world.js';
import { TILE, SLOTS, DAY_LENGTH, WX, WEATHER_NAMES, clockString, dayFrac, isFullMoon } from '../shared/constants.js';
import { MAX_LEVEL, GLORY_MAX } from '../shared/formulas.js';
import { CINEMAS } from '../shared/data/cinemas.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const LAB_SLOTS = 3, MAX_FAILS = 5, LOCK_MS = 15 * 60000, CMD_BURST = 30;
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const b64 = (b) => Buffer.from(b).toString('base64url');
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").toLowerCase().trim();
const int = (v, d) => { const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : d; };
const fail = (msg) => { const e = new Error(msg); e.dev = true; throw e; };

export const labKey = (owner, slot) => `labo~${owner}~${slot}`;

export function installDev(game, { env = process.env, panelFile = path.join(DIR, 'dev-panel.js') } = {}) {
  const accounts = new Set(String(env.DEV_ACCOUNTS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean));
  const secret = String(env.DEV_SECRET || '');
  const ttl = Math.max(5, Math.min(24 * 60, int(env.DEV_TTL_MIN, 120))) * 60000;
  const on = accounts.size > 0 && secret.length >= 16;
  if (!on && (accounts.size || secret)) game.log('[dev] outils développeur désactivés : DEV_ACCOUNTS et DEV_SECRET (16 caractères au moins) sont tous deux nécessaires');
  else if (on) game.log(`[dev] outils développeur actifs pour ${accounts.size} compte(s)`);
  const D = { on, accounts, ttl, fails: new Map(), burst: new Map(), hist: [], meta: { epoch: 1, revoked: [], salt: '' }, dests: null, ready: null };
  game.devTools = D;
  // l'état persistant (époque de révocation, sel) : dans les métadonnées du serveur, jamais le secret lui-même
  D.ready = Promise.resolve(game.storage.loadMeta ? game.storage.loadMeta('dev') : null).catch(() => null).then((m) => {
    if (m && typeof m.epoch === 'number') D.meta = { epoch: m.epoch, revoked: Array.isArray(m.revoked) ? m.revoked.slice(-200) : [], salt: String(m.salt || '') };
    if (!D.meta.salt) { D.meta.salt = crypto.randomBytes(16).toString('hex'); storeMeta(); }
  });
  const storeMeta = () => { if (game.storage.saveMeta) Promise.resolve(game.storage.saveMeta('dev', D.meta)).catch(() => {}); };
  const hkey = () => sha('mm-dev|' + secret + '|' + D.meta.salt);
  const sign = (body) => b64(crypto.createHmac('sha256', hkey()).update(body).digest());
  const audit = (kind, data) => game.audit(kind, data);

  // ------------------------------------------------------------ jetons
  const makeTok = (key) => {
    const body = b64(JSON.stringify({ k: key, u: Date.now() + ttl, n: crypto.randomBytes(9).toString('hex'), e: D.meta.epoch }));
    return { tok: 'v1.' + body + '.' + sign(body), until: Date.now() + ttl };
  };
  const readTok = (tok) => {
    try {
      const [v, body, sig] = String(tok || '').split('.');
      if (v !== 'v1' || !body || !sig) return null;
      const want = Buffer.from(sign(body)), got = Buffer.from(sig);
      if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
      const t = JSON.parse(Buffer.from(body, 'base64url').toString());
      if (!(t.u > Date.now()) || t.e !== D.meta.epoch || D.meta.revoked.includes(t.n) || !accounts.has(t.k)) return null;
      return t;
    } catch (e) { return null; }
  };
  D.revokeAll = () => { D.meta.epoch++; D.meta.revoked = []; storeMeta(); audit('dev-revocation', { epoch: D.meta.epoch }); return { ok: true, epoch: D.meta.epoch }; };
  const ownerOf = (p) => (p ? (p.lab ? p.labOf : p.key) : null);
  // essais limités : par compte et par adresse
  const blocked = (keys) => { const now = Date.now(); let w = 0; for (const k of keys) { const f = D.fails.get(k); if (f && f.until > now) w = Math.max(w, f.until - now); } return w; };
  const failed = (keys) => { const now = Date.now(); for (const k of keys) { const f = D.fails.get(k) || { n: 0, until: 0, since: now }; if (now - f.since > LOCK_MS) { f.n = 0; f.since = now; } if (++f.n >= MAX_FAILS) { f.until = now + LOCK_MS; f.n = 0; f.since = now; } D.fails.set(k, f); } };

  // ------------------------------------------------------------ messages
  game.devHook = (conn, s, m) => { handle(conn, s, m).catch((e) => { game.log('[dev] erreur', e && e.message); conn.send({ t: 'dev', a: 'res', ok: false, err: 'Erreur du serveur.' }); }); };
  async function handle(conn, s, m) {
    await D.ready;
    const reply = (o) => conn.send(Object.assign({ t: 'dev' }, o));
    const p = s.player, who = ownerOf(p), ip = conn.ip || 'local', a = String(m.a || '');
    const refuse = (why, extra) => { audit('dev-refus', { who: who || '?', ip, a, why }); reply(Object.assign({ a: 'refus', msg: 'Accès refusé.' }, extra || {})); };
    if (!on) return refuse('désactivé');
    if (a === 'hello') return p && accounts.has(who) ? reply({ a: 'ask' }) : refuse('compte non autorisé');
    if (a === 'unlock') {
      const keys = ['ip:' + ip, 'k:' + (who || '?')];
      const w = blocked(keys);
      if (w) return refuse('essais épuisés', { msg: `Trop d’essais. Réessayez dans ${Math.ceil(w / 60000)} min.` });
      const okSecret = crypto.timingSafeEqual(sha(m.s), sha(secret)); // toujours calculé : même durée pour tous
      if (!p || !accounts.has(who) || !okSecret) { failed(keys); return refuse(!p ? 'non connecté' : !accounts.has(who) ? 'compte non autorisé' : 'secret faux'); }
      D.fails.delete('k:' + who);
      const t = makeTok(who);
      audit('dev-ouverture', { who, ip });
      return reply({ a: 'ok', tok: t.tok, until: t.until, lab: p.lab ? p.labSlot : 0 });
    }
    const t = readTok(m.tok);
    // à l'accueil, avant toute connexion : seule la réinitialisation du laboratoire, jeton à l'appui
    if (!p) {
      if (a !== 'labreset' || !t) return refuse(t ? 'non connecté' : 'jeton');
      const slot = Math.max(1, Math.min(LAB_SLOTS, m.slot | 0 || 1));
      if (!m.confirm) return reply({ a: 'res', ok: false, need: 'confirm', err: `Réinitialiser le laboratoire ${slot} ? Tout son contenu sera effacé.` });
      await resetLabData(t.k, slot);
      logCmd(t.k, '(accueil)', `lab reset ${slot}`, true, 'laboratoire remis à neuf', ip);
      return reply({ a: 'res', ok: true, out: `Laboratoire ${slot} remis à neuf.` });
    }
    if (!t || t.k !== who) return refuse('jeton');
    if (a === 'logout') { D.meta.revoked.push(t.n); D.meta.revoked = D.meta.revoked.slice(-200); storeMeta(); audit('dev-fermeture', { who, ip }); return reply({ a: 'bye' }); }
    if (a === 'panel') { let code = ''; try { code = fs.readFileSync(panelFile, 'utf8'); } catch (e) { code = ''; } return reply({ a: 'panel', code, cat: catalog(), lab: p.lab ? p.labSlot : 0 }); }
    if (a === 'cmd') {
      const b = D.burst.get(who) || { n: 0, at: Date.now() };
      if (Date.now() - b.at > 10000) { b.n = 0; b.at = Date.now(); }
      if (++b.n > CMD_BURST) { D.burst.set(who, b); return reply({ a: 'res', ok: false, err: 'Trop de commandes à la fois : patientez quelques secondes.' }); }
      D.burst.set(who, b);
      const line = String(m.c || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 300);
      let res;
      try { res = await run(conn, s, p, line, !!m.confirm); } catch (e) { res = { ok: false, err: e.dev ? e.message : 'Erreur : ' + (e && e.message) }; if (!e.dev) game.log('[dev] commande en erreur', line, e && e.stack); }
      if (res.need) return reply({ a: 'res', id: m.id, ok: false, need: 'confirm', err: res.err, c: line });
      logCmd(who, p.name, line, res.ok, res.ok ? res.out : res.err, ip);
      if (res.logout) { D.meta.revoked.push(t.n); D.meta.revoked = D.meta.revoked.slice(-200); storeMeta(); audit('dev-fermeture', { who, ip }); reply({ a: 'res', id: m.id, ok: true, out: res.out, c: line }); return reply({ a: 'bye' }); }
      return reply({ a: 'res', id: m.id, ok: res.ok, out: res.out, err: res.err, c: line, lab: s.player && s.player.lab ? s.player.labSlot : 0 });
    }
    return refuse('action inconnue');
  }
  function logCmd(who, char, cmd, ok, msg, ip) {
    const e = { at: new Date().toISOString(), who, char, cmd, ok: !!ok, res: ok ? String(msg || '').slice(0, 200) : undefined, err: ok ? undefined : String(msg || '').slice(0, 200) };
    D.hist.push(e); if (D.hist.length > 500) D.hist.shift();
    audit('dev', Object.assign({ ip }, e));
  }

  // ------------------------------------------------------------ personnage laboratoire
  const st = () => game.storage;
  async function readData(key, name) {
    const S = st();
    if (S.read && S.write) { const acc = await S.read(key); return acc ? acc.data : undefined; }
    if (S.loadData) { const d = await S.loadData(key); return d == null ? undefined : d; }
    const r = await S.auth(key, name, ''); return r && r.data ? r.data : undefined;
  }
  async function writeFresh(key, name) {
    const S = st();
    if (S.read && S.write) return S.write(key, { name, lab: true, created: Date.now(), data: null }); // l'ancienne version reste en .bak
    return S.save(key, null);
  }
  const labName = (ownerName, slot) => `${ownerName} [labo${slot > 1 ? ' ' + slot : ''}]`;
  async function resetLabData(owner, slot) {
    const key = labKey(owner, slot);
    for (const q of [...game.players.values()]) if (q.key === key) { game.send(q, { t: 'kick', msg: 'Laboratoire réinitialisé.' }); game.dropConn(q); }
    const acc = await readData(key, owner);
    await writeFresh(key, (acc && acc.name) || labName(owner, slot));
  }
  async function enterLab(conn, s, p, slot) {
    const owner = ownerOf(p), ownerName = p.lab ? p.ownerName : p.name, key = labKey(owner, slot);
    if (p.key === key) return 'Vous êtes déjà dans ce laboratoire.';
    const name = labName(ownerName, slot);
    let raw = await readData(key, name);
    if (raw === undefined) { await writeFresh(key, name); raw = null; }
    if (!game.sessions.has(conn) || s.player !== p) return 'Connexion perdue.';
    const look = p.base;
    game.logout(p, true); s.player = null;
    await game.enterWorld(conn, s, { name, key, raw, look, ip: conn.ip, lab: { lab: true, labOf: owner, labSlot: slot, ownerName } });
    return `Laboratoire ${slot} : vous jouez « ${name} ». Votre vrai personnage est sauvegardé et n’est pas touché.`;
  }
  async function leaveLab(conn, s, p) {
    if (!p.lab) return 'Vous êtes déjà sur votre vrai personnage.';
    const owner = p.labOf, ownerName = p.ownerName;
    game.logout(p, true); s.player = null;
    const raw = await readData(owner, ownerName);
    if (!game.sessions.has(conn)) return 'Connexion perdue.';
    await game.enterWorld(conn, s, { name: ownerName, key: owner, raw: raw === undefined ? null : raw, look: undefined, ip: conn.ip });
    return 'Retour au vrai personnage.';
  }
  // des configurations prêtes : un niveau, de l'or et le meilleur équipement accessible à ce niveau
  const SCEN = {
    debutant: { level: 3, gold: 300, txt: 'débutant (niveau 3)' },
    aventurier: { level: 12, gold: 5000, ship: 'sloop', txt: 'aventurier (niveau 12, un sloop)' },
    veteran: { level: 22, gold: 40000, ship: 'brick', txt: 'vétéran (niveau 22, un brick)' },
    legende: { level: MAX_LEVEL, glory: 20, gold: 250000, ship: 'galion', txt: 'légende (niveau 30, Gloire 20, un galion)' },
  };
  function bestGear(level) {
    const out = {};
    for (const slot of SLOTS) {
      if (slot === 'outfit' || slot === 'mount') continue;
      let best = null;
      for (const [id, it] of Object.entries(ITEMS)) {
        if (it.slot !== slot || it.quest || it.rep || reqLevel(it) > level) continue;
        const score = (it.rarity || 0) * 1e6 + reqLevel(it) * 1e3 + (it.value || 0) / 1e3;
        if (!best || score > best[1]) best = [id, score];
      }
      if (best) out[slot] = best[0];
    }
    return out;
  }

  // ------------------------------------------------------------ résolution des noms
  const named = (table, label) => (txt) => {
    const q = norm(txt); if (!q) fail(`Précisez ${label}.`);
    if (table[txt]) return txt;
    const all = Object.entries(table);
    const exact = all.filter(([id, v]) => norm(id) === q || norm(v.name) === q);
    if (exact.length === 1) return exact[0][0];
    const part = all.filter(([id, v]) => norm(id).includes(q) || norm(v.name).includes(q));
    if (part.length === 1) return part[0][0];
    if (!part.length) fail(`${label[0].toUpperCase() + label.slice(1)} inconnu : « ${txt} ». Essayez « chercher ${txt} ».`);
    fail(`Plusieurs ${label}s possibles : ${part.slice(0, 8).map(([id, v]) => `${id} (${v.name})`).join(', ')}${part.length > 8 ? '…' : ''}`);
  };
  const itemOf = named(ITEMS, 'objet'), mobOf = named(MOBS, 'monstre'), questOf = named(QUESTS, 'quête'), achOf = named(ACHIEVEMENTS, 'succès'), npcOf = named(NPCS, 'personnage');
  const splitN = (args, d = 1) => { const last = args[args.length - 1]; if (args.length > 1 && /^-?\d+$/.test(last)) return [args.slice(0, -1).join(' '), +last]; return [args.join(' '), d]; };
  const isBoss = (m) => !!(m.boss || m.elite || m.title);

  // ------------------------------------------------------------ destinations
  function nearStand(x, y, r = 200) {
    const W = game.world;
    if (canStand(W, x, y)) return [x, y];
    for (let d = 8; d <= r; d += 8) for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, xx = x + Math.cos(a) * d, yy = y + Math.sin(a) * d; if (canStand(W, xx, yy)) return [xx, yy]; }
    return null;
  }
  function dests() {
    if (D.dests) return D.dests;
    const W = game.world, out = [];
    const add = (id, name, kind, x, y) => { const at = nearStand(x, y, 640); if (at) out.push({ id, name, kind, x: Math.round(at[0]), y: Math.round(at[1]) }); };
    const tile = (v) => (v.x < W.W && v.y < W.H ? [v.x * TILE + 8, v.y * TILE + 8] : [v.x, v.y]);
    add('port', 'Port-Lanterne (point d’arrivée)', 'ville', W.spawnPoint.x, W.spawnPoint.y);
    for (const id of PLACE_ORDER) { const c = W[PLACES[id].key]; if (c && id !== 'port') add('ville-' + id, PLACES[id].name, 'ville', ...tile(c)); }
    const LM = { lighthouse: 'Le phare', ruins: 'Les ruines', cemetery: 'Le cimetière', wreck: 'L’épave du Léviathan', ermite: 'L’île de l’Ermite', volcan: 'Le Volcan de Cendrelune', quarantaine: 'L’île de la Quarantaine', ossements: 'Les Ossements', damnes: 'L’île des Damnés', lagon: 'Le Lagon', pendus: 'L’île des Pendus', fort: 'Le Fort', brumes: 'Les Brumes', libFort: 'Le fort de Libertalia', kraken: 'Le Gouffre du Kraken' };
    for (const [k, name] of Object.entries(LM)) if (W[k] && typeof W[k] === 'object' && W[k].x != null) add('lieu-' + k, name, 'lieu', ...tile(W[k]));
    // zones : un point marchable proche du centre de chaque zone
    const acc = ZONES.map(() => [0, 0, 0]);
    for (let ty = 0; ty < W.H; ty += 3) for (let tx = 0; tx < W.W; tx += 3) { const z = W.zones[ty * W.W + tx]; if (acc[z] && !W.solid[ty * W.W + tx]) { acc[z][0] += tx; acc[z][1] += ty; acc[z][2]++; } }
    ZONES.forEach((Zn, z) => { if (!acc[z][2] || Zn.name === 'Intérieur') return; let cx = acc[z][0] / acc[z][2] * TILE + 8, cy = acc[z][1] / acc[z][2] * TILE + 8; let at = nearStand(cx, cy, 400); if (at && zoneAt(W, at[0], at[1]) === z) out.push({ id: 'zone-' + z, name: Zn.name, kind: 'zone', x: Math.round(at[0]), y: Math.round(at[1]) }); });
    // intérieurs, donjon, lieux secrets (portes cachées), fonds marins
    for (const d of W.doors) out.push({ id: 'salle-' + d.room, name: d.name, kind: d.secret ? 'secret' : W.rooms[d.room] && W.rooms[d.room].kind === 'underwater' ? 'fonds' : 'intérieur', x: d.ix, y: d.iy, door: d.id });
    (W.bells || []).forEach((b, i) => add('cloche-' + (i + 1), `Cloche marine ${i + 1}`, 'secret', b.x, b.y + 14));
    return (D.dests = out);
  }
  const destOf = (txt) => {
    const q = norm(txt), L = dests();
    const ex = L.filter((d) => norm(d.id) === q || norm(d.name) === q); if (ex.length) return ex[0];
    const part = L.filter((d) => norm(d.id).includes(q) || norm(d.name).includes(q));
    if (part.length === 1) return part[0];
    if (!part.length) fail(`Lieu inconnu : « ${txt} ». Tapez « lieux » pour la liste.`);
    fail(`Plusieurs lieux : ${part.slice(0, 8).map((d) => `${d.id} (${d.name})`).join(', ')}`);
  };

  // ------------------------------------------------------------ cinématiques et scènes
  function scenes() {
    const out = [];
    for (const qid of QUEST_ORDER) {
      const q = QUESTS[qid];
      if (q.scene) out.push({ id: `q:${qid}`, name: `${q.name} — proposition`, npc: q.giver, path: ['scene'], q: qid });
      if (q.sceneDone) out.push({ id: `q:${qid}:fin`, name: `${q.name} — dénouement`, npc: q.turnin, path: ['sceneDone'], q: qid });
      q.goals.forEach((g, i) => { if (g.scene) out.push({ id: `q:${qid}:${i + 1}`, name: `${q.name} — ${g.text}`, npc: g.npc, path: ['goals', i, 'scene'], q: qid }); });
    }
    for (const [id, m] of Object.entries(MOBS)) if (isBoss(m) && !m.sea) { out.push({ id: `boss:${id}`, name: `Entrée de ${m.name}`, kind: 'boss', type: id }); out.push({ id: `vaincu:${id}`, name: `${m.name} vaincu`, kind: 'down', type: id }); }
    out.push({ id: 'kraken', name: 'Le réveil du Kraken', kind: 'kraken' }, { id: 'kraken:vaincu', name: 'Le Kraken vaincu', kind: 'krakendown' });
    for (const [id, c] of Object.entries(CINEMAS)) out.push({ id: `film:${id}`, name: `Mise en scène : ${c.name}`, kind: 'film', film: id }); // lot 4
    return out;
  }

  // ------------------------------------------------------------ le catalogue (pour le panneau et l'autocomplétion)
  function catalog() {
    return {
      items: Object.entries(ITEMS).map(([id, it]) => [id, it.name, it.slot || (it.boat ? 'navire' : ''), it.rarity || 0, reqLevel(it)]),
      mobs: Object.entries(MOBS).map(([id, m]) => [id, m.name, m.level || 0, isBoss(m) ? 1 : 0, m.sea ? 1 : 0]),
      quests: QUEST_ORDER.map((id) => [id, QUESTS[id].name, QUESTS[id].level || 1]),
      dests: dests().map((d) => [d.id, d.name, d.kind]),
      scenes: scenes().map((c) => [c.id, c.name]),
      ach: Object.entries(ACHIEVEMENTS).map(([id, a]) => [id, a.name]),
      ships: Object.entries(ITEMS).filter(([, it]) => it.boat).map(([id, it]) => [id, it.name]),
      places: PLACE_ORDER.map((id) => [id, PLACES[id].name]),
      cmds: CMDS.map((c) => [c.n, c.al || [], c.u, c.h, c.cat]),
    };
  }

  // ------------------------------------------------------------ les commandes
  const others = (p) => [...game.players.values()].filter((q) => q !== p && !q.lab).length;
  const worldConfirm = (p, confirm, what) => (others(p) && !confirm ? { need: true, err: `${what} touche tout le serveur (${others(p)} vrai(s) pirate(s) en ligne). Confirmez.` } : null);
  const fmtGold = (n) => Math.round(n).toLocaleString('fr-FR');
  const refresh = (p) => { game.recalc(p); p.dirtyMe = true; p.dirtyInv = true; p.dirtyQ = true; p.lookVer++; };
  function setLevel(p, n) { p.level = n; p.xp = 0; refresh(p); p.hp = p.stats.maxHp; p.en = p.stats.maxEn; game.ev(p.x, p.y, ['lvl', p.id, p.level]); }
  function giveGoalItems(p, q, i) { const g = q.goals[i]; if (g.type === 'collect') { const need = g.n - game.countItem(p, g.item); if (need > 0) game.addItem(p, g.item, need); } }
  function completeGoal(p, qid, i) {
    const q = QUESTS[qid], stt = p.quests[qid], g = q.goals[i];
    stt.p[i] = g.n || 1; giveGoalItems(p, q, i); p.dirtyQ = true;
    return `Objectif ${i + 1} accompli : ${g.text}`;
  }
  function startQuest(p, qid) {
    const q = QUESTS[qid];
    p.quests[qid] = { s: 'active', p: q.goals.map(() => 0) };
    q.goals.forEach((g, i) => { if (g.type === 'explore' && p.zone === g.zone) p.quests[qid].p[i] = 1; });
    p.track = [qid, ...(p.track || []).filter((x) => x !== qid && p.quests[x] && p.quests[x].s === 'active')].slice(0, 4);
    p.dirtyQ = true;
  }
  function prepareQuest(p, qid, seen = new Set()) { // termine (sans récompense) toute la chaîne de prérequis
    if (seen.has(qid)) return 0; seen.add(qid);
    let n = 0;
    for (const r of QUESTS[qid].requires || []) { if (!QUESTS[r]) continue; n += prepareQuest(p, r, seen); if (!p.quests[r] || p.quests[r].s !== 'done') { p.quests[r] = { s: 'done', p: [] }; n++; } }
    return n;
  }
  function stateFr(p, qid) { return { locked: 'verrouillée', available: 'disponible', active: 'en cours', ready: 'prête à rendre', done: 'terminée' }[questState(qid, p.quests, p.level)]; }
  function placeShip(sh, x, y) {
    const S = shipOf(sh.kind), oth = [...game.ships.values()].filter((o) => o !== sh);
    for (let r = 0; r <= 600; r += 16) for (let k = 0; k < (r ? 20 : 1); k++) {
      const xx = x + Math.cos(k / 20 * Math.PI * 2) * r, yy = y + Math.sin(k / 20 * Math.PI * 2) * r;
      for (const a of [sh.a, 0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (shipFits(game.world, S, xx, yy, a, oth)) return [xx, yy, a];
    }
    return null;
  }
  const nearestBerth = (x, y) => BERTHS.reduce((a, b) => (Math.hypot(b.tx * TILE - x, b.ty * TILE - y) < Math.hypot(a.tx * TILE - x, a.ty * TILE - y) ? b : a), BERTHS[0]);
  const helpOf = (c) => `${c.u}${c.al && c.al.length ? `  (aussi : ${c.al.join(', ')})` : ''}\n  ${c.h}`;

  const CMDS = [
    // ---- aide et recherche
    { n: 'aide', al: ['help', '?'], cat: 'Aide', u: 'aide [commande]', h: 'La liste des commandes, ou le détail de l’une d’elles.', free: true,
      run: (p, a) => { if (a[0]) { const c = find(a[0]); if (!c) fail(`Commande inconnue : ${a[0]}`); return helpOf(c); } const cats = {}; for (const c of CMDS) (cats[c.cat] = cats[c.cat] || []).push(c.n); return Object.entries(cats).map(([k, v]) => `${k} : ${v.join(', ')}`).join('\n') + '\nTapez « aide <commande> » pour le détail. Les commandes qui modifient un personnage exigent le laboratoire (« lab »).'; } },
    { n: 'chercher', al: ['search', 'find'], cat: 'Aide', u: 'chercher <texte>', h: 'Cherche dans les objets, monstres, quêtes, lieux, scènes et succès.', free: true,
      run: (p, a) => {
        const q = norm(a.join(' ')); if (q.length < 2) fail('Au moins deux lettres.');
        const hit = (id, name) => norm(id).includes(q) || norm(name).includes(q), out = [];
        for (const [id, it] of Object.entries(ITEMS)) if (hit(id, it.name)) out.push(`objet   ${id} — ${it.name}`);
        for (const [id, m] of Object.entries(MOBS)) if (hit(id, m.name)) out.push(`monstre ${id} — ${m.name} (niv. ${m.level || '?'})${isBoss(m) ? ' [boss]' : ''}`);
        for (const id of QUEST_ORDER) if (hit(id, QUESTS[id].name)) out.push(`quête   ${id} — ${QUESTS[id].name}`);
        for (const d of dests()) if (hit(d.id, d.name)) out.push(`lieu    ${d.id} — ${d.name}`);
        for (const c of scenes()) if (hit(c.id, c.name)) out.push(`scène   ${c.id} — ${c.name}`);
        for (const [id, x] of Object.entries(ACHIEVEMENTS)) if (hit(id, x.name)) out.push(`succès  ${id} — ${x.name}`);
        return out.length ? out.slice(0, 40).join('\n') + (out.length > 40 ? `\n… ${out.length - 40} de plus` : '') : 'Rien trouvé.';
      } },
    { n: 'historique', al: ['log', 'journal'], cat: 'Aide', u: 'historique [nombre]', h: 'Les dernières commandes développeur (auteur, personnage, date, résultat).', free: true,
      run: (p, a) => { const n = Math.max(1, Math.min(50, int(a[0], 15))); const L = D.hist.filter((e) => e.who === ownerOf(p)).slice(-n); return L.length ? L.map((e) => `${e.at.slice(5, 19).replace('T', ' ')}  ${e.char}  ${e.ok ? '✓' : '✗'} ${e.cmd}${e.ok ? '' : ' — ' + e.err}`).join('\n') : 'Aucune commande pour l’instant.'; } },
    { n: 'deconnexion', al: ['logout'], cat: 'Aide', u: 'deconnexion', h: 'Ferme la session développeur (le jeton est révoqué).', free: true, run: () => ({ logout: true }) },
    // ---- laboratoire
    { n: 'lab', al: ['labo'], cat: 'Laboratoire', u: 'lab [1-3 | sortir | reset [1-3] | scenario <nom>]', h: 'Entrer dans un personnage laboratoire (séparé du vrai), en sortir, le remettre à neuf, ou lui appliquer un scénario : debutant, aventurier, veteran, legende.', free: true,
      run: async (p, a, ctx) => {
        const sub = norm(a[0] || '');
        if (!sub) return p.lab ? `Vous êtes dans le laboratoire ${p.labSlot} (« ${p.name} »). « lab sortir » pour revenir.` : 'Vous êtes sur votre vrai personnage. « lab 1 » (ou 2, 3) pour entrer dans un laboratoire.';
        if (/^[1-9]$/.test(sub) || sub === 'entrer') { const n = /^\d$/.test(sub) ? +sub : int(a[1], 1); if (n < 1 || n > LAB_SLOTS) fail(`Laboratoires : 1 à ${LAB_SLOTS}.`); return enterLab(ctx.conn, ctx.s, p, n); }
        if (sub === 'sortir' || sub === 'quitter') return leaveLab(ctx.conn, ctx.s, p);
        if (sub === 'reset' || sub === 'reinitialiser') {
          const n = a[1] ? int(a[1], 0) : p.lab ? p.labSlot : 1; if (!(n >= 1 && n <= LAB_SLOTS)) fail(`Laboratoires : 1 à ${LAB_SLOTS}.`);
          if (!ctx.confirm) return { need: true, err: `Réinitialiser le laboratoire ${n} ? Son personnage, son inventaire et sa progression seront effacés (le vrai personnage n’est pas touché).` };
          const inside = p.lab && p.labSlot === n;
          if (inside) { await leaveLab(ctx.conn, ctx.s, p); }
          await resetLabData(ownerOf(p), n);
          if (inside) { await enterLab(ctx.conn, ctx.s, ctx.s.player, n); return `Laboratoire ${n} remis à neuf : vous y êtes, au point d’arrivée.`; }
          return `Laboratoire ${n} remis à neuf.`;
        }
        if (sub === 'scenario' || sub === 'scénario') {
          if (!p.lab) fail('Entrez d’abord dans un laboratoire (« lab 1 »).');
          const k = norm(a[1] || ''), S = SCEN[k]; if (!S) fail(`Scénarios : ${Object.keys(SCEN).join(', ')}.`);
          setLevel(p, S.level); p.glory = S.glory || 0; p.gxp = 0; p.gold = S.gold;
          const gear = bestGear(S.level); for (const slot of Object.keys(gear)) p.eq[slot] = gear[slot];
          if (S.ship && ITEMS[S.ship] && !game.countItem(p, S.ship)) game.addItem(p, S.ship, 1);
          p.tut = 99; refresh(p); p.hp = p.stats.maxHp; p.en = p.stats.maxEn;
          return `Scénario ${S.txt} appliqué : ${fmtGold(S.gold)} doublons, équipement : ${Object.values(gear).map((i) => ITEMS[i].name).join(', ')}.`;
        }
        fail('Usage : lab [1-3 | sortir | reset [1-3] | scenario <nom>]');
      } },
    // ---- personnage
    { n: 'niveau', al: ['level', 'lvl'], cat: 'Personnage', u: 'niveau <1-30>', h: 'Fixe le niveau (les compétences suivent le niveau).',
      run: (p, a) => { const n = int(a[0], NaN); if (!(n >= 1 && n <= MAX_LEVEL) || n % 1) fail(`Niveau entre 1 et ${MAX_LEVEL}.`); setLevel(p, n); return `Niveau ${n}. PV ${Math.round(p.hp)}, énergie ${Math.round(p.en)}.`; } },
    { n: 'gloire', al: ['glory'], cat: 'Personnage', u: `gloire <0-${GLORY_MAX}>`, h: 'Fixe la Gloire (au-delà du niveau 30).',
      run: (p, a) => { const n = int(a[0], NaN); if (!(n >= 0 && n <= GLORY_MAX) || n % 1) fail(`Gloire entre 0 et ${GLORY_MAX}.`); p.glory = n; p.gxp = 0; refresh(p); return `Gloire ${n}.`; } },
    { n: 'xp', al: [], cat: 'Personnage', u: 'xp <quantité>', h: 'Donne de l’expérience comme en jeu (montées de niveau comprises), 1 000 000 au plus.',
      run: (p, a) => { const n = int(a[0], NaN); if (!(n >= 1 && n <= 1e6)) fail('Entre 1 et 1 000 000.'); game.giveXp(p, Math.round(n)); return `+${fmtGold(n)} XP : niveau ${p.level}${p.level >= MAX_LEVEL ? `, Gloire ${p.glory | 0}` : ''}.`; } },
    { n: 'pv', al: ['hp', 'vie'], cat: 'Personnage', u: 'pv [nombre | max]', h: 'Fixe les points de vie.',
      run: (p, a) => { const n = !a[0] || norm(a[0]) === 'max' ? p.stats.maxHp : int(a[0], NaN); if (!(n >= 1 && n <= p.stats.maxHp)) fail(`Entre 1 et ${p.stats.maxHp}.`); p.hp = n; p.dirtyMe = true; return `PV ${Math.round(p.hp)} / ${p.stats.maxHp}.`; } },
    { n: 'energie', al: ['en', 'energy'], cat: 'Personnage', u: 'energie [nombre | max]', h: 'Fixe l’énergie.',
      run: (p, a) => { const n = !a[0] || norm(a[0]) === 'max' ? p.stats.maxEn : int(a[0], NaN); if (!(n >= 0 && n <= p.stats.maxEn)) fail(`Entre 0 et ${p.stats.maxEn}.`); p.en = n; p.dirtyMe = true; return `Énergie ${Math.round(p.en)} / ${p.stats.maxEn}.`; } },
    { n: 'stats', al: ['statistiques'], cat: 'Personnage', u: 'stats', h: 'Niveau, Gloire, PV, énergie, statistiques et compétences du personnage.', free: true,
      run: (p) => { const S = p.stats; return `${p.name}${p.lab ? ' (laboratoire)' : ''} — niveau ${p.level}, Gloire ${p.glory | 0}, ${fmtGold(p.gold)} doublons\nPV ${Math.round(p.hp)}/${S.maxHp}, énergie ${Math.round(p.en)}/${S.maxEn}\n${Object.entries(S).filter(([k]) => !/^max/.test(k)).map(([k, v]) => `${k} ${typeof v === 'number' ? +v.toFixed(2) : v}`).join(', ')}\nCompétences : ${Object.values(SKILLS).map((k) => `${k.name} (niv. ${k.lvl || 1}${p.level >= (k.lvl || 1) ? ', acquise' : ''})`).join(', ')}\nInvincible : ${game.time < p.invulnUntil ? Math.ceil(p.invulnUntil - game.time) + ' s' : 'non'}`; } },
    { n: 'invincible', al: ['god', 'dieu'], cat: 'Personnage', u: 'invincible [secondes | off]', h: 'Invincibilité temporaire (600 s par défaut, une heure au plus).',
      run: (p, a) => { if (norm(a[0]) === 'off' || norm(a[0]) === 'non') { p.invulnUntil = 0; return 'Invincibilité retirée.'; } const n = a[0] ? int(a[0], NaN) : 600; if (!(n >= 1 && n <= 3600)) fail('Entre 1 et 3600 secondes.'); p.invulnUntil = game.time + n; return `Invincible pendant ${Math.round(n)} s.`; } },
    { n: 'normal', al: ['restaurer'], cat: 'Personnage', u: 'normal', h: 'Restaure les valeurs normales : plus d’invincibilité ni d’effets, PV et énergie pleins.',
      run: (p) => { p.invulnUntil = 0; p.buffs = {}; p.dot = null; p.cds = {}; refresh(p); p.hp = p.stats.maxHp; p.en = p.stats.maxEn; return 'Valeurs normales restaurées.'; } },
    // ---- objets
    { n: 'objet', al: ['item', 'give', 'donner'], cat: 'Objets', u: 'objet <id ou nom> [quantité]', h: 'Ajoute un objet (999 au plus ; un seul pour les objets uniques).',
      run: (p, a) => { const [t, n0] = splitN(a); const id = itemOf(t), it = ITEMS[id]; const n = it.unique ? 1 : n0; if (!(n >= 1 && n <= 999)) fail('Quantité entre 1 et 999.'); const left = game.addItem(p, id, n); p.dirtyInv = true; return left ? `${it.name} : ${n - left} ajouté(s), inventaire plein pour ${left}.` : `${it.name} ×${n} ajouté.`; } },
    { n: 'retirer', al: ['remove', 'take'], cat: 'Objets', u: 'retirer <id ou nom> [quantité | tout]', h: 'Retire un objet de l’inventaire.',
      run: (p, a) => { const all = norm(a[a.length - 1]) === 'tout'; const [t, n0] = all ? [a.slice(0, -1).join(' '), 0] : splitN(a); const id = itemOf(t), have = game.countItem(p, id); if (!have) fail(`Pas de ${ITEMS[id].name} dans l’inventaire.`); const n = all ? have : Math.min(have, n0); game.removeItem(p, id, n); p.dirtyInv = true; return `${ITEMS[id].name} ×${n} retiré.`; } },
    { n: 'equiper', al: ['equip'], cat: 'Objets', u: 'equiper <id ou nom>', h: 'Équipe directement (sans condition de niveau) ; l’objet est créé s’il manque.',
      run: (p, a) => { const id = itemOf(a.join(' ')), it = ITEMS[id]; if (!it.slot) fail(`${it.name} ne s’équipe pas.`); let i = p.inv.findIndex((s) => s && s.id === id); if (i < 0) { if (game.addItem(p, id, 1)) fail('Inventaire plein.'); i = p.inv.findIndex((s) => s && s.id === id); } const prev = p.eq[it.slot]; p.eq[it.slot] = id; p.inv[i].n > 1 ? p.inv[i].n-- : (p.inv[i] = null); if (prev) game.addItem(p, prev, 1); refresh(p); return `${it.name} équipé (${it.slot}).`; } },
    { n: 'desequiper', al: ['unequip'], cat: 'Objets', u: `desequiper <${SLOTS.join('|')}|tout>`, h: 'Retire une pièce d’équipement (dans l’inventaire).',
      run: (p, a) => { const s = norm(a[0]); const list = s === 'tout' ? SLOTS.filter((k) => p.eq[k]) : [s]; if (!list.every((k) => SLOTS.includes(k))) fail(`Emplacements : ${SLOTS.join(', ')}.`); for (const k of list) game.unequip(p, k); refresh(p); return `Déséquipé : ${list.join(', ') || 'rien'}.`; } },
    { n: 'inspecter', al: ['inspect', 'info'], cat: 'Objets', u: 'inspecter <objet ou monstre>', h: 'Les caractéristiques et effets d’un objet ou d’un monstre.', free: true,
      run: (p, a) => { const t = a.join(' '); let id; try { id = itemOf(t); } catch (e) { id = null; } if (id) { const it = ITEMS[id]; return `${id} — ${it.name}\n${Object.entries(it).filter(([k]) => k !== 'name' && k !== 'desc').map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')}\nNiveau requis : ${reqLevel(it)}${it.desc ? '\n« ' + it.desc + ' »' : ''}`; } const mid = mobOf(t), m = MOBS[mid]; return `${mid} — ${m.name}\n${Object.entries(m).filter(([k, v]) => k !== 'name' && typeof v !== 'function').map(([k, v]) => `${k} : ${typeof v === 'object' ? JSON.stringify(v).slice(0, 160) : v}`).join('\n')}`; } },
    { n: 'vider', al: ['clear'], cat: 'Objets', u: 'vider', h: 'Vide l’inventaire (l’équipement porté reste). Demande confirmation.',
      run: (p, a, ctx) => { if (!ctx.confirm) return { need: true, err: 'Vider tout l’inventaire du personnage laboratoire ?' }; let n = 0; for (let i = 0; i < p.inv.length; i++) if (p.inv[i]) { n++; p.inv[i] = null; } p.dirtyInv = true; p.dirtyQ = true; return `${n} emplacement(s) vidé(s).`; } },
    // ---- économie et progression
    { n: 'doublons', al: ['gold', 'or'], cat: 'Économie', u: 'doublons <n | +n | -n>', h: 'Fixe ou change les doublons (0 à 10 000 000).',
      run: (p, a) => { const s = String(a[0] || ''); const v = int(s, NaN); if (!Number.isFinite(v)) fail('Usage : doublons 5000, doublons +500, doublons -200'); const n = /^[+-]/.test(s) ? p.gold + v : v; if (!(n >= 0 && n <= 1e7)) fail('Entre 0 et 10 000 000 doublons.'); p.gold = Math.round(n); p.dirtyMe = true; return `${fmtGold(p.gold)} doublons.`; } },
    { n: 'succes', al: ['ach', 'achievement'], cat: 'Économie', u: 'succes <id ou nom | tous> | succes retirer <id>', h: 'Débloque (ou retire) un succès. Le jeu n’a plus de recettes d’artisanat depuis la 0.8.',
      run: (p, a) => { if (norm(a[0]) === 'retirer') { const id = achOf(a.slice(1).join(' ')); delete p.ach[id]; game.send(p, { t: 'ach', id: null, ach: p.ach }); return `Succès retiré : ${ACHIEVEMENTS[id].name}.`; } if (norm(a[0]) === 'tous') { let n = 0; for (const id of Object.keys(ACHIEVEMENTS)) if (!p.ach[id]) { p.ach[id] = Date.now(); n++; } game.send(p, { t: 'ach', id: null, ach: p.ach }); return `${n} succès débloqués.`; } const id = achOf(a.join(' ')); game.unlock(p, id); return `Succès : ${ACHIEVEMENTS[id].name}.`; } },
    { n: 'recompense', al: ['reward'], cat: 'Économie', u: 'recompense <quête>', h: 'Donne seulement les récompenses d’une quête (or, objets, XP), pour les tester.',
      run: (p, a) => { const qid = questOf(a.join(' ')), r = QUESTS[qid].rewards || {}; p.gold += r.gold || 0; for (const [id, n] of r.items || []) game.giveOrDrop(p, id, n); game.giveXp(p, r.xp || 0); p.dirtyMe = true; return `Récompenses de « ${QUESTS[qid].name} » : ${r.gold || 0} doublons, ${r.xp || 0} XP${(r.items || []).length ? ', ' + r.items.map(([id, n]) => `${ITEMS[id] ? ITEMS[id].name : id} ×${n}`).join(', ') : ''}.`; } },
    // ---- quêtes
    { n: 'quete', al: ['quest', 'q'], cat: 'Quêtes', free: (a) => ['liste', 'list', 'info', ''].includes(norm(a[0])), u: 'quete <liste [texte] | info | demarrer | preparer | objectif <n> | suivante | terminer | reset> <id>', h: 'Inspecter et piloter les quêtes : « preparer » termine sa chaîne de prérequis (sans récompense) pour tester un embranchement ou une fin ; « terminer » la rend avec ses récompenses ; « reset tout » efface toutes les quêtes (confirmation).',
      run: (p, a, ctx) => {
        const sub = norm(a[0] || 'liste'), rest = a.slice(1);
        if (sub === 'liste' || sub === 'list') { const f = norm(rest.join(' ')); const L = QUEST_ORDER.filter((id) => !f || norm(id).includes(f) || norm(QUESTS[id].name).includes(f)); return L.slice(0, 60).map((id) => `${id} — ${QUESTS[id].name} (niv. ${QUESTS[id].level || 1}) : ${stateFr(p, id)}`).join('\n') + (L.length > 60 ? `\n… ${L.length - 60} de plus` : '') || 'Aucune quête.'; }
        if (!['info', 'demarrer', 'start', 'preparer', 'reset', 'objectif', 'goal', 'suivante', 'next', 'terminer', 'finish', 'done'].includes(sub)) fail('Sous-commandes : liste, info, demarrer, preparer, objectif, suivante, terminer, reset.');
        if (sub === 'reset' && norm(rest[0]) === 'tout') { if (!ctx.confirm) return { need: true, err: 'Effacer TOUTES les quêtes du personnage laboratoire ?' }; p.quests = {}; p.track = []; p.dirtyQ = true; return 'Toutes les quêtes sont effacées.'; }
        const qid = questOf(sub === 'objectif' || sub === 'goal' ? rest.slice(0, -1).join(' ') || rest.join(' ') : rest.join(' ')), q = QUESTS[qid];
        if (sub === 'info') {
          const stt = p.quests[qid];
          const goals = q.goals.map((g, i) => `  ${i + 1}. ${g.text} [${g.type}${g.mob ? ' ' + g.mob : g.item ? ' ' + g.item : g.npc ? ' ' + g.npc : ''}] ${stt && stt.s === 'active' ? `${stt.p[i] || 0}/${g.n || 1}` : ''}${g.scene ? ' (scène)' : ''}`).join('\n');
          const excl = [].concat(q.excl || []); const r = q.rewards || {};
          return `${qid} — ${q.name} (niveau ${q.level || 1}) : ${stateFr(p, qid)}\nDonneur : ${q.giver} · rendu : ${q.turnin}\nPrérequis : ${(q.requires || []).join(', ') || 'aucun'}${excl.length ? `\nEmbranchement — exclut : ${excl.join(', ')}` : ''}\nObjectifs :\n${goals}\nRécompenses : ${r.gold || 0} doublons, ${r.xp || 0} XP${(r.items || []).length ? ', ' + r.items.map(([id, n]) => `${id} ×${n}`).join(', ') : ''}${q.ach ? `, succès ${q.ach}` : ''}${q.scene || q.sceneDone ? `\nScènes : ${[q.scene ? `q:${qid}` : '', q.sceneDone ? `q:${qid}:fin` : ''].filter(Boolean).join(', ')}` : ''}`;
        }
        if (sub === 'demarrer' || sub === 'start') { startQuest(p, qid); return `Quête démarrée : ${q.name} (sans condition).`; }
        if (sub === 'preparer') { const n = prepareQuest(p, qid); if (p.level < (q.level || 1) - 1) setLevel(p, Math.max(1, (q.level || 1) - 1)); p.dirtyQ = true; return `${n} prérequis marqué(s) comme terminés. « ${q.name} » est ${stateFr(p, qid)}.`; }
        if (sub === 'reset') { const had = p.quests[qid]; delete p.quests[qid]; for (const g of q.goals) if (g.type === 'collect' && ITEMS[g.item] && ITEMS[g.item].quest) game.removeItem(p, g.item, game.countItem(p, g.item)); p.track = (p.track || []).filter((x) => x !== qid); p.dirtyQ = true; p.dirtyInv = true; return had ? `Quête remise à zéro : ${q.name} (${stateFr(p, qid)}).` : `${q.name} n’avait pas été commencée.`; }
        const stt = p.quests[qid];
        if (sub === 'objectif' || sub === 'goal') { if (!stt || stt.s !== 'active') startQuest(p, qid); const n = int(rest[rest.length - 1], NaN); if (!(n >= 1 && n <= q.goals.length)) fail(`Objectif entre 1 et ${q.goals.length}.`); return completeGoal(p, qid, n - 1); }
        if (sub === 'suivante' || sub === 'next') { if (!stt || stt.s !== 'active') { startQuest(p, qid); return `Quête démarrée : ${q.name}.`; } const i = q.goals.findIndex((g, k) => (g.type === 'collect' ? game.countItem(p, g.item) < g.n : (stt.p[k] || 0) < (g.n || 1))); if (i < 0) return 'Tous les objectifs sont remplis : « quete terminer » pour la rendre.'; return completeGoal(p, qid, i); }
        if (sub === 'terminer' || sub === 'finish' || sub === 'done') { if (!stt || stt.s !== 'active') startQuest(p, qid); q.goals.forEach((g, i) => completeGoal(p, qid, i)); game.turnIn(p, qid, true); return p.quests[qid] && p.quests[qid].s === 'done' ? `Quête terminée et rendue : ${q.name} (récompenses données).` : `La quête n’a pas pu être rendue.`; }
        fail('Sous-commandes : liste, info, demarrer, preparer, objectif, suivante, terminer, reset.');
      } },
    // ---- ennemis et boss
    { n: 'monstre', al: ['spawn', 'invoquer'], cat: 'Ennemis', u: 'monstre <id ou nom> [quantité] [xPV]', h: 'Fait apparaître des monstres près de soi (20 au plus). « x2 » double leurs PV (de x0.25 à x5) ; les dégâts restent ceux du jeu.',
      run: (p, a) => { let mult = 1; if (/^x[\d.,]+$/i.test(a[a.length - 1] || '')) { mult = int(a.pop().slice(1), 1); if (!(mult >= 0.25 && mult <= 5)) fail('Multiplicateur de PV entre x0.25 et x5.'); } const [t, n] = splitN(a); const id = mobOf(t); if (!(n >= 1 && n <= 20)) fail('Entre 1 et 20 monstres.'); return spawnMobs(p, id, n, mult); } },
    { n: 'boss', al: [], cat: 'Ennemis', u: 'boss <id ou nom> [xPV]', h: 'Fait apparaître un boss ou une élite près de soi.',
      run: (p, a) => { let mult = 1; if (/^x[\d.,]+$/i.test(a[a.length - 1] || '')) { mult = int(a.pop().slice(1), 1); if (!(mult >= 0.25 && mult <= 5)) fail('Multiplicateur entre x0.25 et x5.'); } const id = mobOf(a.join(' ')); if (!isBoss(MOBS[id])) fail(`${MOBS[id].name} n’est ni un boss ni une élite (« monstre » pour les autres).`); return spawnMobs(p, id, 1, mult); } },
    { n: 'nettoyer', al: ['despawn', 'killall'], cat: 'Ennemis', u: 'nettoyer', h: 'Supprime tous les monstres que vous avez fait apparaître.',
      run: (p) => { let n = 0; for (const m of game.mobs) if (m.dev === ownerOf(p) && m.state !== 'dead') { game.despawnAdds(m); m.state = 'dead'; m.summoned = true; game.ev(m.x, m.y, ['die', m.id]); n++; } return `${n} monstre(s) supprimé(s).`; } },
    { n: 'monstres', al: ['mobs'], cat: 'Ennemis', u: 'monstres [texte | boss]', h: 'La liste des monstres (ou des seuls boss).', free: true,
      run: (p, a) => { const f = norm(a.join(' ')); return Object.entries(MOBS).filter(([id, m]) => (f === 'boss' ? isBoss(m) : !f || norm(id).includes(f) || norm(m.name).includes(f))).map(([id, m]) => `${id} — ${m.name} (niv. ${m.level || '?'}, ${m.hp} PV)${isBoss(m) ? ' [boss]' : ''}${m.sea ? ' [mer]' : ''}`).join('\n') || 'Aucun.'; } },
    // ---- téléportation
    { n: 'tp', al: ['teleport', 'aller'], cat: 'Téléportation', u: 'tp <lieu | x y | pnj <id> | port>', h: 'Téléporte vers un lieu valide (« lieux » pour la liste), des cases (x y), ou un personnage. « tp port » ramène à Port-Lanterne.',
      run: (p, a) => {
        if (!a.length) fail('Où ? « lieux » pour la liste.');
        let x, y, name;
        if (a.length === 2 && /^\d+$/.test(a[0]) && /^\d+$/.test(a[1])) { const W = game.world; const tx = +a[0], ty = +a[1]; if (tx >= W.W || ty >= W.H) fail(`Cases entre 0,0 et ${W.W - 1},${W.H - 1}.`); const at = nearStand(tx * TILE + 8, ty * TILE + 8, 64); if (!at) fail('Aucun sol praticable à cet endroit.'); [x, y] = at; name = `case ${tx}, ${ty}`; }
        else if (norm(a[0]) === 'pnj') { const id = npcOf(a.slice(1).join(' ')), n = game.npcPos.get(id); if (!n) fail(`${NPCS[id].name} n’est pas dans le monde en ce moment.`); const at = nearStand(n.x, n.y + 18, 80); if (!at) fail('Pas de place à côté.'); [x, y] = at; name = NPCS[id].name; }
        else { const d = destOf(a.join(' ')); x = d.x; y = d.y; name = d.name; }
        if (p.dead) fail('Vous êtes à terre.');
        if (p.riding) game.dismount(p);
        game.teleport(p, x, y, { travel: 1 });
        return `Téléporté : ${name} (${Math.floor(x / TILE)}, ${Math.floor(y / TILE)}).`;
      } },
    { n: 'lieux', al: ['places', 'destinations'], cat: 'Téléportation', u: 'lieux [texte | ville | zone | intérieur | secret | fonds | lieu]', h: 'Les destinations de téléportation.', free: true,
      run: (p, a) => { const f = norm(a.join(' ')); const L = dests().filter((d) => !f || norm(d.kind) === f || norm(d.id).includes(f) || norm(d.name).includes(f)); return L.map((d) => `${d.id} — ${d.name} [${d.kind}]`).join('\n') || 'Aucun.'; } },
    // ---- navires
    { n: 'navire', al: ['ship', 'bateau'], cat: 'Navires', free: (a) => ['liste', ''].includes(norm(a[0])), u: 'navire <modèle | reparer | ici | degager | port | liste>', h: 'Fait apparaître un modèle au quai le plus proche, répare la coque, ramène le navire près de soi, le dégage, ou le ramène au port, sans délai.',
      run: (p, a) => {
        const sub = norm(a[0] || 'liste');
        if (sub === 'liste') return Object.entries(ITEMS).filter(([, it]) => it.boat).map(([id, it]) => `${id} — ${it.name} (${it.boat.kind})`).join('\n');
        const sh = game.ownShip(p.key);
        if (sub === 'reparer' || sub === 'repair') { let n = 0; for (const s of p.inv) if (s && ITEMS[s.id].boat) { p.hulls[s.id] = game.hullMax(s.id); n++; } if (sh) { sh.hull = game.hullMax(sh.item); sh.ver++; } p.dirtyMe = true; p.dirtyInv = true; return `Coques réparées (${n}${sh ? ', navire armé compris' : ''}).`; }
        if (sub === 'ici' || sub === 'here') { if (!sh) fail('Aucun navire armé.'); const at = placeShip(sh, p.x, p.y); if (!at) fail('Pas d’eau libre assez grande près d’ici.'); [sh.x, sh.y, sh.a] = at; sh.vx = sh.vy = sh.w = 0; sh.anchor = 2; sh.anchorP = 0; sh.sail = sh.sailT = 0; sh.ver++; for (const id of sh.crew) { const q = game.players.get(id); if (q) game.sendPos(q, { travel: 1 }); } return `Navire déplacé près de vous (${Math.round(Math.hypot(sh.x - p.x, sh.y - p.y))} px).`; }
        if (sub === 'degager' || sub === 'unstick') { if (!sh) fail('Aucun navire armé.'); sh.unstickAt = 0; if (p.ship !== sh.id) fail('Montez à bord d’abord (ou « navire ici »).'); game.unstickShip(p); sh.unstickAt = 0; return 'Navire dégagé (si un passage existait).'; }
        if (sub === 'port') { if (!sh) fail('Aucun navire armé.'); sh.homeAt = 0; p.homing = { until: game.time, hp: p.hp, sid: sh.id }; p.lastHurt = -99; game.homeTick(p); sh.homeAt = 0; return 'Navire amarré au quai le plus proche.'; }
        const id = itemOf(a.join(' ')); if (!ITEMS[id].boat) fail(`${ITEMS[id].name} n’est pas un navire.`);
        if (p.ship) fail('Descendez d’abord à terre.');
        if (!game.countItem(p, id) && game.addItem(p, id, 1)) fail('Inventaire plein.');
        const b = nearestBerth(p.x, p.y), S = shipOf(ITEMS[id].boat.kind);
        const spot = findBerth(game.world, S, b, [...game.ships.values()].filter((s) => s !== sh));
        if (!spot) fail(`Le ${b.name.toLowerCase()} est encombré.`);
        if (sh) game.removeShip(sh, null);
        const ns = game.createShip(p, id, spot.x, spot.y, spot.a, { anchor: 2 }); ns.berth = b.key; ns.hull = game.hullMax(id);
        p.dirtyMe = true;
        return `${ITEMS[id].name} armé au ${b.name.toLowerCase()} (« tp » pour s’y rendre, ou « navire ici »).`;
      } },
    // ---- environnement
    { n: 'temps', al: ['time', 'heure'], cat: 'Environnement', u: 'temps <hh:mm | aube | jour | midi | crepuscule | nuit | minuit | pleine-lune>', h: 'Avance l’heure du monde jusqu’au moment voulu (tout le serveur).',
      run: (p, a, ctx) => {
        const k = norm(a.join(' ')); const H = { aube: 6, jour: 9, midi: 12, crepuscule: 19.5, nuit: 22, minuit: 0 };
        let h = H[k]; const full = k === 'pleine-lune' || k === 'pleine lune';
        if (full) h = 22; else if (h == null) { const m = /^(\d{1,2})(?:[:h](\d{2}))?$/.exec(k); if (!m || +m[1] > 23 || +(m[2] || 0) > 59) fail('Usage : temps 22:30, temps nuit, temps pleine-lune…'); h = +m[1] + (+(m[2] || 0)) / 60; }
        const w = worldConfirm(p, ctx.confirm, 'Changer l’heure'); if (w) return w;
        const f = (((h - 7) % 24) + 24) % 24 / 24; let day = Math.floor(game.worldTime / DAY_LENGTH);
        let t = day * DAY_LENGTH + f * DAY_LENGTH; if (t <= game.worldTime) t += DAY_LENGTH;
        if (full) for (let k2 = 0; k2 < 4 && !isFullMoon(t); k2++) t += DAY_LENGTH;
        game.worldTime = t; game.hordeAt = 0;
        return `Il est ${clockString(dayFrac(t))}${isFullMoon(t) ? ', pleine lune' : ''}.`;
      } },
    { n: 'meteo', al: ['weather', 'météo'], cat: 'Environnement', u: 'meteo <clair | pluie | orage | auto> [minutes]', h: 'Impose une météo (30 min par défaut, 3 h au plus), ou rend la main au ciel (tout le serveur).',
      run: (p, a, ctx) => { const k = norm(a[0]); if (k === 'auto') { WX.force = null; return 'La météo suit de nouveau son cours.'; } const kind = { clair: 0, pluie: 1, orage: 2 }[k]; if (kind == null) fail('Usage : meteo clair | pluie | orage | auto [minutes]'); const min = a[1] ? int(a[1], NaN) : 30; if (!(min >= 1 && min <= 180)) fail('Entre 1 et 180 minutes.'); const w = worldConfirm(p, ctx.confirm, 'Changer la météo'); if (w) return w; WX.force = { kind, until: game.worldTime + min * 60 }; return `${WEATHER_NAMES[kind]} pendant ${min} min.`; } },
    { n: 'evenement', al: ['event', 'événement'], cat: 'Environnement', u: 'evenement <invasion [lieu] | eruption | horde | fin>', h: 'Déclenche une invasion (dans 5 s), une éruption (au prochain passage sur le volcan), une horde (nuit de pleine lune), ou termine l’invasion en cours.',
      run: (p, a, ctx) => {
        const k = norm(a[0]);
        if (k === 'fin') { if (!game.wevt) fail('Aucune invasion en cours.'); game.endWorldEvent(false); return 'Invasion terminée.'; }
        const w = worldConfirm(p, ctx.confirm, 'Un événement'); if (w) return w;
        if (k === 'invasion') { const pl = a[1] ? norm(a[1]) : ''; if (pl && !PLACES[pl]) fail(`Lieux : ${PLACE_ORDER.join(', ')}.`); const r = game.startWorldEvent(pl, 'now'); if (r.err) fail(r.err); return `Invasion : ${PLACES[r.place].name}, débarquement dans 5 s.`; }
        if (k === 'eruption') { game.erupt.nextAt = game.time; game.erupt.until = 0; return 'Le volcan entre en éruption dès qu’un pirate est sur son île (« tp lieu-volcan »).'; }
        if (k === 'horde') { let t = Math.floor(game.worldTime / DAY_LENGTH) * DAY_LENGTH + ((22 - 7) / 24) * DAY_LENGTH; if (t <= game.worldTime) t += DAY_LENGTH; for (let i = 0; i < 4 && !isFullMoon(t); i++) t += DAY_LENGTH; game.worldTime = t; game.hordeAt = 0; return `Nuit de pleine lune (${clockString(dayFrac(t))}) : la horde se lève.`; }
        fail('Usage : evenement invasion [lieu] | eruption | horde | fin');
      } },
    // ---- cinématiques
    { n: 'cine', al: ['cinematic', 'cinematique', 'scene'], cat: 'Cinématiques', u: 'cine <id | liste [texte] | passer | oublier <scène | tout>>', h: 'Lance (ou relance) une scène de quête ou une cinématique de boss ; « passer » coupe celle en cours. Sur le personnage laboratoire seulement : une scène à choix s’en souvient.', free: (a) => ['liste', 'list', 'passer', 'skip', ''].includes(norm(a[0])),
      run: (p, a) => {
        const k = norm(a[0] || 'liste');
        if (k === 'liste') { const f = norm(a.slice(1).join(' ')); return scenes().filter((c) => !f || norm(c.id).includes(f) || norm(c.name).includes(f)).slice(0, 80).map((c) => `${c.id} — ${c.name}`).join('\n') || 'Aucune.'; }
        if (k === 'passer' || k === 'skip') { game.send(p, { t: 'dev', a: 'cine', skip: 1 }); return 'Cinématique passée.'; }
        if (k === 'oublier') { const ids = Object.keys(CINEMAS), L = norm(a[1]) === 'tout' ? ids : ids.filter((i) => norm(i) === norm(String(a[1] || '').replace(/^film:/, ''))); if (!L.length) fail(`Usage : cine oublier <${ids.join(' | ')} | tout>`); for (const i of L) p.mem.delete('vu:' + i); return `Oubliée(s) : ${L.join(', ')} — elle(s) se déclenchera(ont) de nouveau.`; }
        const c = scenes().find((x) => norm(x.id) === norm(a.join(' ')));
        if (!c) fail('Cinématique inconnue : « cine liste » pour les voir.');
        if (c.kind === 'film') { // lot 4 : une scène mise en scène se lance depuis le serveur, dans son lieu, comme en jeu
          const def = CINEMAS[c.film];
          if (game.inCinema(p)) game.endCinema(p, 'remplacée');
          if (def.room) {
            const r = game.world.rooms.findIndex((q) => q.name === def.room), d = game.world.doors.find((q) => q.room === r && !q.secret);
            if (r < 0 || !d) fail(`La pièce « ${def.room} » est introuvable.`);
            if (p.room !== r) game.teleport(p, d.ix, d.iy, { door: d.id });
          }
          game.startCinema([p], c.film, { replay: 1 });
          return `Lecture : ${def.name}${def.room ? ' — ' + def.room : ''} (Échap pour passer).`;
        }
        game.send(p, { t: 'dev', a: 'cine', c });
        return `Lecture : ${c.name}.`;
      } },
  ];
  function find(n) { const q = norm(n); return CMDS.find((c) => c.n === q || (c.al || []).includes(q)); }
  function spawnMobs(p, id, n, mult) {
    if (p.room >= 0 && MOBS[id].sea) fail('Un monstre marin ne vit pas ici.');
    let made = 0;
    for (let k = 0; k < n; k++) {
      let at = null;
      for (let t = 0; t < 30 && !at; t++) { const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 70, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r; if (MOBS[id].sea ? !canStand(game.world, x, y) : canStand(game.world, x, y)) at = [x, y]; }
      if (!at) continue;
      const m = game.addMob(id, at[0], at[1], true);
      m.dev = ownerOf(p); m.sunproof = true;
      if (mult !== 1) { m.maxHp = Math.max(1, Math.round(m.def.hp * mult)); m.hp = m.maxHp; }
      game.ev(m.x, m.y, ['fx', 'rise', m.x, m.y]);
      made++;
    }
    if (!made) fail('Pas de place autour de vous.');
    return `${made} × ${MOBS[id].name}${mult !== 1 ? ` (PV x${mult})` : ''} près de vous. « nettoyer » pour les retirer.`;
  }
  async function run(conn, s, p, line, confirm) {
    if (!line) return { ok: false, err: 'Commande vide : tapez « aide ».' };
    const [head, ...args] = line.replace(/^\//, '').split(/\s+/);
    const c = find(head);
    if (!c) return { ok: false, err: `Commande inconnue : « ${head} ». Tapez « aide ».` };
    const free = typeof c.free === 'function' ? c.free(args) : c.free;
    if (!free && !p.lab) return { ok: false, err: 'Cette commande ne s’applique qu’au personnage laboratoire : « lab 1 » pour y entrer. Votre vrai personnage n’est jamais modifié.' };
    const out = await c.run(p, args, { conn, s, confirm });
    if (out && typeof out === 'object' && out.need) return { need: true, err: out.err };
    if (out && typeof out === 'object' && out.logout) return { ok: true, out: 'Session développeur fermée.', logout: true };
    return { ok: true, out: String(out) };
  }
  D.commands = CMDS; D.catalog = catalog;
  return D;
}
