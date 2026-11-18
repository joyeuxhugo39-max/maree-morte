// Simulation autoritaire du monde. Aucune dépendance à Node : ce module tourne
// aussi dans le navigateur pour le mode solo.
import {
  TILE, TICK_RATE, AOI_X, AOI_Y, INV_SIZE, SLOTS, DAY_LENGTH, ROLL_TIME, ROLL_SPEED,
  INTERACT_RANGE, PICKUP_RANGE, T, dayFrac, isNight, weatherAt, DAY_LENGTH as DAYLEN, isFullMoon,
  SAVE_VERSION, PROTOCOL, GAME_VERSION, SEEN_CELL,
} from '../shared/constants.js';
// 1.0 : la brume — un bit par carré de 8 cases de l'archipel, encodé en base64 dans la sauvegarde
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
const unb64 = (s, len) => { const out = new Uint8Array(len); try { const r = atob(String(s)); for (let i = 0; i < Math.min(len, r.length); i++) out[i] = r.charCodeAt(i); } catch (e) { /* illisible : tout est brume */ } return out; };
// 1.0 : migrations des sauvegardes — chaque étape amène une sauvegarde d'une version à la suivante.
// Une sauvegarde sans numéro date d'avant la 1.0 (version 8). Rien n'est jamais retiré : ce que ce
// serveur ne connaît pas est conservé tel quel et réécrit à l'identique.
const MIGRATIONS = {
  8: (d) => { d.sv = 10; return d; }, // 0.8 → 1.0 : mêmes champs, de nouveaux s'ajoutent avec des valeurs par défaut
};
export function migrateSave(d) {
  if (!d || typeof d !== 'object') return d;
  let v = d.sv | 0 || 8, guard = 0;
  while (v < SAVE_VERSION && guard++ < 50) { const step = MIGRATIONS[v]; if (!step) { d.sv = SAVE_VERSION; break; } d = step(d) || d; v = d.sv | 0; }
  return d;
}
// les champs qu'écrit serialize() : tout autre champ d'une sauvegarde est conservé à part
const SAVE_KEYS = new Set(['ship', 'deck', 'fishRec', 'hulls', 'mem', 'songs', 'rep', 'inf', 'jail', 'hon', 'pvph', 'glory', 'gxp', 'friends', 'blocked', 'tradeLog', 'seen', 'st', 'kc', 'met', 'col', 'tut', 'name', 'look', 'level', 'xp', 'gold', 'hp', 'inv', 'eq', 'quests', 'track', 'chests', 'x', 'y', 'kills', 'upg', 'treasure', 'ach', 'title', 'cnt', 'respawnAt', 'found', 'boat', 'pk', 'caches', 'zs', 'pet', 'home', 'base', 'saved', 'sv', 'held']);
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { STRUCTS, PLANTER_GROW, HOME_OK, HOME_MAX, HOME_PRICE, QUEST_PICK, PROPERTY, HOME_LIMIT, RESALE, plotCategory } from '../shared/data/craft.js';
import { social } from './social.js';
import { justice, SHIELD_AFTER_DEATH } from './justice.js';
import { events } from './events.js';
import { arena } from './arena.js';
import { tavern } from './tavern.js';
import { naval } from './naval.js';
import { shipsLogic } from './ships.js';
import { shipOf, mobShipKind, hullHit as hullPointHit } from '../shared/data/ships.js';
import { dungeonLogic } from './dungeon.js';
import { sea } from './sea.js';
import { seasons } from './seasons.js';
import { MEM_KEYS } from '../shared/data/scenes.js';
import { repLevel, buyPrice, sellPrice } from '../shared/data/places.js';
import { LEGACY_VALUE, LEGACY_STRUCT, QUEST_ITEM_OLD_VALUE } from '../shared/data/legacy.js';
import { generateWorld, canStand, moveWithCollision, moveBoat, zoneAt, tileAt, blocksShot, canSail, roomIdAt, Z, ZONES, SAFE } from '../shared/world.js';
import { ITEMS, STACK_MAX, isStackable } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { QUESTS, questState, goalsMet, npcVisible } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS } from '../shared/data/skills.js';
import { computeStats, xpToNext, mitigate, displayLook, sanitizeLook, MAX_LEVEL, GLORY_XP, GLORY_MAX, UPG_SLOTS, UPG_MAX, upgradeCost, reqLevel } from '../shared/formulas.js';

const DT = 1 / TICK_RATE;
const PVP_MUL = 0.6; // les dégâts entre joueurs sont réduits
const NAME_RE = /^[\p{L}0-9][\p{L}0-9 _'-]{1,14}[\p{L}0-9]$/u;
const rand = (a, b) => a + Math.random() * (b - a);
// 0.8 : les élites (hors navires et créatures d'événement) mettent une demi-heure à revenir
const respawnDelay = (def) => (def.elite && !def.sea && !def.ship && def.respawn < 9999 ? Math.max(1800, def.respawn * 5) : def.respawn);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const dirOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);

const CHEST_LOOT = [
  { gold: [15, 35], items: [['banane', 0.8, 2, 4], ['noix_coco', 0.5, 1, 2], ['bandana', 0.15, 1, 1], ['chapeau_paille', 0.15, 1, 1], ['bottes_usees', 0.2, 1, 1], ['carte_dechiree', 0.3, 1, 1], ['poignard', 0.12, 1, 1]] },
  { gold: [40, 80], items: [['poisson_grille', 0.8, 2, 3], ['grog', 0.6, 1, 2], ['coutelas', 0.2, 1, 1], ['gilet_cuir', 0.15, 1, 1], ['collier_requin', 0.1, 1, 1], ['carte_dechiree', 0.4, 1, 1], ['pistolet_double', 0.06, 1, 1], ['machette', 0.08, 1, 1], ['poivriere', 0.03, 1, 1]] },
  { gold: [150, 240], items: [['rhum', 0.9, 1, 3], ['tromblon', 0.12, 1, 1], ['manteau_corsaire', 0.15, 1, 1], ['amulette_lanterne', 0.08, 1, 1], ['carte_dechiree', 0.5, 1, 2], ['cimeterre', 0.1, 1, 1], ['poivriere', 0.08, 1, 1], ['carabine', 0.06, 1, 1], ['crache_feu', 0.04, 1, 1]] },
  { gold: [160, 260], items: [['rhum', 0.8, 1, 2], ['carte_dechiree', 0.5, 1, 2], ['elixir_flamme', 0.45, 1, 2]] },
];
CHEST_LOOT[4] = { gold: [800, 1300], items: [['elixir_flamme', 0.8, 1, 3], ['faux_damnee', 0.06, 1, 1], ['canon_damne', 0.06, 1, 1], ['armure_damnee', 0.05, 1, 1], ['tenue_comte', 0.04, 1, 1], ['dent_comte', 0.04, 1, 1], ['carte_tresor', 0.4, 1, 1]] };
const CHEST_COOLDOWN_MS = 15 * 60 * 1000;
// les îles du Grand Large, pour le haut fait d'explorateur
const LAVA_BOMB = { id: 0, name: 'une bombe de lave' }; // la « source » des dégâts du volcan
const FAR_ZONES = [Z.RADE, Z.COLLINES, Z.PENDUS, Z.SIRENES, Z.ANSE, Z.OSSEMENTS, Z.QUARANTAINE, Z.VOLCAN, Z.DAMNES, Z.BRUMES, Z.ERMITE];
// cambriolage : les objets très rares qu'on ne trouve que chez les autres
const BURGLE_RARE = [['montre_gousset', 30], ['bague_capitaine', 25], ['coffret_bijoux', 25], ['collier_perles_noires', 12], ['tableau_maitre', 8]];
const HOME_STORE = 48; // le coffre de la maison (0.8 : il remplace les coffres des bases)
// 1.0 : la boîte à musique (les airs de l'archipel) et les pages des bibliothèques
const HOUSE_MUSIC = [['', 'silence'], ['day', 'Airs de Port-Lanterne'], ['sea', 'Chant du grand large'], ['cite', 'Gigue de Libertalia'], ['night', 'Nocturne des Brumes'], ['naval', 'Bordée de combat'], ['swamp', 'Souffle des marais'], ['epic', 'Charge de la pleine lune'], ['boss', 'Duel des capitaines']];
// 1.0 : la collection d'airs — chaque musique entendue pour la première fois est notée dans le carnet du pirate
const LORE_PAGES = [
  '« Carnet d’un sonneur » : Trois cloches marines dorment sur trois îles : chez l’ermite, sur l’atoll des os, au-dessus du lagon. Qui les fait chanter toutes trois dans la même journée, la mer lui ouvre sa bourse.',
  '« Journal d’un mousse » : Le capitaine dit que la mer ne garde pas ses morts depuis que le Cœur de Corail a disparu. Moi, j’ai vu ma mère sur la plage, cette nuit. Elle ne m’a pas reconnu.',
  '« Traité des marées » : Les anciens parlaient d’une cité sous la mer, au large du Gouffre. On n’y entrait qu’avec de l’air enfermé dans une cloche de bronze.',
  '« Registre de Libertalia, an I » : Ni roi, ni maître. Le premier qui posera une couronne sur sa tête sera jeté à la mer. — Aubin Sans-Maître.',
  '« Lettre non envoyée » : Vespère, mon frère, tu as échangé ton âme contre la marée. Je prie pour que quelqu’un te rende ce que tu as perdu. Ou qu’on te l’arrache.',
  '« Carnet de Barbe-Cendre » (page brûlée) : …le Cœur ne m’appartient pas. Je le sais. Mais quelqu’un, en dessous, me l’a demandé. Quelqu’un qui chante…',
  '« Manuel du canonnier » : Bâbord à gauche, tribord à droite, et le capitaine au milieu qui hurle. Un bon équipage tire ensemble, ou coule ensemble.',
  '« Herbier de la Quarantaine » : La peste n’est pas venue par les rats. Elle est venue par un médecin qui portait un masque d’oiseau et ne dormait jamais.',
  '« Légende des îlots » : Certains îlots n’apparaissent sur aucune carte. On dit que la brume les cache à ceux qui ne les cherchent pas.',
];
// répliques des boss quand ils changent de phase
const BOSS_LINES = {
  cendre: [null, 'Vous allez goûter à ma bordée !', 'Brûlez avec moi, chiens de terre !'],
  roi: [null, 'Levez-vous, mes sujets !', 'Mon royaume sera votre tombeau !'],
  crabe: [null, '*Les pinces du Crabe-Roi claquent de rage*'],
  goule: [null, 'AOUUUUH ! La meute a faim !', '*La Goule Alpha entre en frénésie*'],
  noye: [null, 'La mer réclame son dû !'],
  bourreau: [null, 'Le tribunal est ouvert !', 'Plus de grâce pour personne !'],
  sirene: [null, 'Vous n’entendrez plus jamais la mer !'],
  general: [null, 'Deuxième ligne, en avant !', 'Toute la Légion, à l’assaut !'],
  corbeau: [null, 'Votre maladie s’aggrave, je le crains.', 'Il est l’heure de votre dernier traitement.'],
  brasier: [null, 'LE VOLCAN SE RÉVEILLE !', 'TOUT BRÛLERA !'],
  frere: [null, 'Tu vas le regretter !'],
  vespere: [null, 'Vous osez profaner ma crypte ?', 'La Couronne ne quittera pas ma tête !', 'Si je tombe, la mer tombera avec moi !'],
};
// distance d'un point à un segment
const segDist = (px, py, x0, y0, x1, y1) => {
  const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L)) : 0;
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
};

export class Game {
  constructor({ storage, log = console.log, seed = 7, solo = false }) {
    this.world = generateWorld(seed);
    this.storage = storage;
    this.log = log;
    this.solo = solo;
    this.nextId = 1;
    this.players = new Map();
    this.sessions = new Map(); // conn -> session { player, bucket, lastMsg }
    this.version = GAME_VERSION;
    this.socialInit();
    this.justiceInit();
    this.eventsInit();
    this.arenaInit();
    this.tavernInit();
    this.dungeonInit();
    this.seasonsInit();
    this.shipsInit();
    this.seenW = Math.ceil(this.world.W / SEEN_CELL); this.seenH = Math.ceil(this.world.OVER_H / SEEN_CELL); this.seenBytes = Math.ceil(this.seenW * this.seenH / 8);
    this.usedTokens = new Set(); this.fails = new Map(); this.bans = {}; this.reports = []; this.maintenance = null; // 1.0
    if (storage && storage.loadMeta) { Promise.resolve(storage.loadMeta('bans')).then((b) => { if (b) this.bans = b; }).catch(() => {}); Promise.resolve(storage.loadMeta('reports')).then((r) => { if (Array.isArray(r)) this.reports = r; }).catch(() => {}); }
    this.mobs = [];
    this.drops = new Map();
    this.projs = [];
    this.bombs = [];
    this.teles = []; this.lteles = []; this.allies = []; this.kraken = null;
    this.erupt = { nextAt: 0, until: 0, bombAt: 0, who: new Set() }; // le Volcan de Cendrelune
    this.timers = [];
    this.time = 0;
    this.worldTime = DAY_LENGTH * 0.08;
    this.events = [];
    this.night = isNight(dayFrac(this.worldTime));
    this.propById = new Map(this.world.props.map((p) => [p.id, p]));
    this.npcPos = new Map(this.world.npcs.map((n) => [n.id, n]));
    this.secretDoors = this.world.doors.filter((d) => d.secret);
    this.world.spawns.forEach((s, k) => { const m = this.addMob(s.mob, s.x, s.y); m.sunproof = MOBS[s.mob].night ? ((k * 2654435761) >>> 0) % 1000 < 180 : true; });
    this.night = isNight(dayFrac(this.worldTime));
    if (!this.night) for (const m of this.mobs) if (!m.sunproof) this.bury(m); // le jour, la plupart des morts dorment sous terre
    this.clouds = []; this.hordeAt = 0;
    for (const r of this.world.seaRoutes || []) for (let k = 0; k < r.n; k++) { // navires maudits sur leurs routes
      const wp = Math.floor(k * r.pts.length / r.n), [x, y] = r.pts[wp];
      const m = this.addMob(r.ship, x, y, true);
      m.summoned = false; m.route = r.pts; m.wp = (wp + 1) % r.pts.length; m.sx = x; m.sy = y; m.room = -1; m.state = 'idle';
    }
    this.tickCount = 0;
    // emplacements possibles des trésors enterrés
    const W = this.world;
    this.digSpots = [];
    for (let y = 4; y < W.H - 4; y += 2) for (let x = 4; x < W.W - 4; x += 2) {
      const i = y * W.W + x, t = W.tiles[i], z = W.zones[i];
      if (SAFE.has(z) || z === Z.SEA || z === Z.CAVE || W.solid[i]) continue;
      if (t !== T.SAND && t !== T.GRASS && t !== T.JUNGLE && t !== T.MARSH) continue;
      let ok = true;
      for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1; dx++) { const j = (y + dy) * W.W + x + dx; if (W.solid[j] || W.tiles[j] === T.WATER || W.tiles[j] === T.SWAMP) { ok = false; break; } }
      if (ok) this.digSpots.push([x * TILE + 8, y * TILE + 10]);
    }
    // point d'arrivée de la Marée Morte : la plage au sud-ouest du port
    // artisanat et bases
    this.depleted = new Map();
    this.homes = new Map(); this.plotByRoom = new Map(this.world.plots.map((pl) => [pl.room, pl.k])); this.seals = Object.fromEntries((this.world.seals || []).map((s) => [s.id, 0]));
    this.structs = new Map(); this.floors = new Map(); this.bases = new Map();
    this.worldPersist = !!(storage && typeof storage.saveWorld === 'function');
    this.worldDirty = false; this.lastWorldSave = 0;
    const at = (type) => this.world.props.filter((pp) => pp.type === type).map((pp) => [pp.x, pp.y]);
    this.refunds = new Map(); // 0.8 : ce que valaient les bases et les matériaux, en attendant que leur pirate revienne
    if (this.worldPersist && storage.loadWorld) Promise.resolve(storage.loadWorld()).then((w) => this.importWorld(w)).catch((e) => this.log('[monde] chargement impossible', e && e.message));
  }

  // ------------------------------------------------------------ connexions
  addClient(conn) { this.sessions.set(conn, { player: null, bucket: 120, lastRefill: this.time, pending: false }); }
  removeClient(conn) {
    const s = this.sessions.get(conn);
    this.sessions.delete(conn);
    if (s && s.player) this.logout(s.player);
  }
  logout(p) {
    if (!this.players.has(p.id)) return;
    this.socialLogout(p);
    this.save(p);
    this.shipLogout(p);
    this.players.delete(p.id);
    if (!this.worldPersist) { this.removeBase(p.key); this.removeHome(p.key); }
    for (const m of this.mobs) if (m.target === p.id) m.target = 0;
    this.broadcastChat(null, `${p.name} a quitté l'archipel.`, 'sys');
    this.log(`[jeu] ${p.name} déconnecté (${this.players.size} en ligne)`);
  }
  send(p, msg) { try { p.conn.send(msg); } catch (e) { /* connexion fermée */ } }

  onMessage(conn, m) {
    const s = this.sessions.get(conn);
    if (!s || !m || typeof m.t !== 'string') return;
    // limitation de débit (jeton)
    s.bucket = Math.min(120, s.bucket + (this.time - s.lastRefill) * 60);
    s.lastRefill = this.time;
    if (s.bucket < 1) return;
    s.bucket -= 1;
    if (!s.player) { if (m.t === 'login' && !s.pending) this.login(conn, s, m); return; }
    const p = s.player;
    switch (m.t) {
      case 'mv': return this.onMove(p, m);
      case 'atk': return this.onAttack(p, +m.a);
      case 'sk': return this.onSkill(p, m);
      case 'talk': return this.onTalk(p, String(m.npc));
      case 'qa': return this.acceptQuest(p, String(m.q));
      case 'dice': return this.playDice(p, +m.bet);
      case 'tut': p.tut = Math.max(p.tut | 0, Math.min(99, m.s | 0)); return;
      case 'qt': return this.turnIn(p, String(m.q));
      case 'track': return this.trackQuest(p, String(m.q), !!m.on);
      case 'qab': return this.abandonQuest(p, String(m.q));
      case 'sort': return this.sortInv(p);
      case 'buy': return this.buy(p, String(m.npc), String(m.item));
      case 'sell': return this.sell(p, m.slot | 0);
      case 'use': return this.useSlot(p, m.slot | 0);
      case 'eat': return this.eatBest(p);
      case 'equip': return this.equip(p, m.slot | 0);
      case 'unequip': return this.unequip(p, String(m.s));
      case 'swap': return this.swap(p, m.a | 0, m.b | 0);
      case 'drop': return this.dropSlot(p, m.slot | 0, m.n == null ? 0 : m.n | 0);
      case 'pick': return this.pick(p, m.id | 0);
      case 'open': return this.openProp(p, m.id | 0);
      case 'chat': return this.chat(p, String(m.m || ''), String(m.ch || 'local'));
      case 'soc': return this.socAction(p, String(m.a), String(m.name || ''));
      case 'crew': return this.crewAction(p, String(m.a), m);
      case 'trade': return this.tradeAction(p, String(m.a), m);
      case 'bail': return this.bail(p);
      case 'post': return m.off ? this.leavePost(p) : this.takePost(p, String(m.k || ''), m.i | 0); // 1.1 : les postes du navire
      case 'ctl': return this.postInput(p, m.x, m.y);
      case 'gun': return this.fireGun(p, +m.a);
      case 'ship': return m.a === 'stow' ? this.stowShip(p) : this.armShip(p, String(m.item || ''));
      case 'repair': return this.repair(p);
      case 'lever': return this.pullLever(p, m.i | 0);
      case 'dive': return this.dive(p);
      case 'race': return this.raceStart(p);
      case 'bell': return this.ringBell(p, m.i | 0);
      case 'season': this.seasonRoll(); return this.send(p, this.seasonState());
      case 'arena': return this.arenaAction(p, String(m.a), m);
      case 'tav': return this.tavernAction(p, String(m.a), m);
      case 'mem': { const k = String(m.k); if (MEM_KEYS.has(k) && p.mem.size < 200) p.mem.add(k); return; }
      case 'song': { const k = String(m.k), s = HOUSE_MUSIC.find(([x]) => x && x === k); if (!s || p.songs.has(k)) return; p.songs.add(k); p.dirtyMe = true; const n = HOUSE_MUSIC.length - 1; if (p.songs.size >= n) this.unlock(p, 'melomane'); return this.toast(p, `♪ Nouvel air noté dans votre carnet : « ${s[1]} » (${p.songs.size}/${n}). La boîte à musique de votre maison saura le jouer.`, 'quest'); }
      case 'ladder': return this.send(p, { t: 'ladder', top: this.ladderTop(), hist: p.pvpHist, me: [p.honor | 0, Math.floor(p.infamy || 0)] });
      case 'respawn': return this.respawn(p);
      case 'ping': return this.send(p, { t: 'pong', c: m.c });
      case 'fish': return this.onFish(p, +m.a);
      case 'dig': return this.dig(p);
      case 'upg': return this.upgrade(p, String(m.s));
      case 'title': return this.setTitle(p, m.id == null ? null : String(m.id));
      case 'harvest': return this.questPick(p, m.id | 0);
      case 'ride': return this.toggleRide(p);
      case 'emote': { // 0.8 : émotes de la barre (2 à 5)
        const k = String(m.k);
        if (!['danse', 'salut', 'doigt', 'salto'].includes(k) || p.dead || (p.cds.emote || 0) > this.time) return;
        p.cds.emote = this.time + 1.2;
        return this.ev(p.x, p.y, ['emote', p.id, k]);
      }
      case 'place': return this.place(p, m.slot | 0, m.tx | 0, m.ty | 0);
      case 'unplace': return this.unplace(p, m.tx | 0, m.ty | 0);
      case 'sint': return this.structInteract(p, m.tx | 0, m.ty | 0);
      case 'stor': return this.chestAction(p, String(m.a), m.slot | 0);
      case 'door': return this.onDoor(p, m.id | 0, !!m.out);
      case 'board': return this.armShip(p, '');
      case 'home': return this.homeAction(p, String(m.a), m.k | 0);
      case 'lock': return this.pickLock(p, m.k | 0, !!m.ok);
    }
  }

  async login(conn, s, m) {
    const name = String(m.name || '').trim().replace(/\s+/g, ' ');
    const pass = String(m.pass || '');
    if ((m.v | 0) !== PROTOCOL) return conn.send({ t: 'err', msg: 'Une nouvelle version du jeu est disponible : rechargez la page.', reload: 1 });
    if (this.maintenance && this.maintenance.closed) return conn.send({ t: 'err', msg: 'Maintenance en cours : ' + (this.maintenance.msg || 'revenez dans quelques minutes.') });
    if (!NAME_RE.test(name)) return conn.send({ t: 'err', msg: 'Nom invalide : 3 à 16 lettres ou chiffres.' });
    const key = name.toLowerCase(), ip = conn.ip || 'local';
    const ban = this.banOf(key);
    if (ban) return conn.send({ t: 'err', msg: `Ce pirate est banni${ban.until < 9e15 ? " jusqu'au " + new Date(ban.until).toLocaleString('fr-FR') : ''}. Motif : ${ban.reason || 'non précisé'}.` });
    const wait = this.loginBlocked(key, ip);
    if (wait) return conn.send({ t: 'err', msg: `Trop d'essais. Réessayez dans ${Math.ceil(wait / 60)} minute${wait > 60 ? 's' : ''}.` });
    const rt = typeof m.rt === 'string' && !this.usedTokens.has(m.rt) ? await this.checkToken(m.rt) : null; // reprise après une coupure, sans redemander le mot de passe
    if (!rt && !this.solo && (pass.length < 4 || pass.length > 64)) return conn.send({ t: 'err', msg: 'Mot de passe : 4 caractères minimum.' });
    s.pending = true;
    let res;
    try {
      if (rt && rt.key === key && rt.until > Date.now() && this.storage.loadData) res = { ok: true, data: await this.storage.loadData(key) };
      else res = await this.storage.auth(key, name, pass);
    } catch (e) { res = { ok: false, err: 'Erreur du serveur de sauvegarde.' }; }
    s.pending = false;
    if (!this.sessions.has(conn)) return;
    if (!res.ok) { this.loginFailed(key, ip); this.audit('connexion-refusee', { who: key, ip }); return conn.send({ t: 'err', msg: res.err || 'Mot de passe incorrect.' }); }
    if (rt) { this.usedTokens.add(m.rt); if (this.usedTokens.size > 5000) this.usedTokens.clear(); }
    if (res.data && (res.data.sv | 0) > SAVE_VERSION) { // jamais d'écrasement par une version plus ancienne
      this.log(`[sauvegarde] ${name} : sauvegarde v${res.data.sv} plus récente que le serveur (v${SAVE_VERSION}), connexion refusée`);
      return conn.send({ t: 'err', msg: 'Ce pirate a été sauvegardé par une version plus récente du jeu. Revenez quand le serveur sera à jour.' });
    }
    let data = migrateSave(res.data);
    for (const other of [...this.players.values()]) {
      if (other.key !== key) continue;
      data = this.serialize(other); // l'état vivant est plus récent que la sauvegarde
      if (other.dead) { data.hp = 0; data.x = this.world.spawnPoint.x; data.y = this.world.spawnPoint.y; }
      this.send(other, { t: 'kick', msg: 'Connexion depuis un autre endroit.' });
      const os = [...this.sessions.entries()].find(([, v]) => v.player === other);
      this.logout(other);
      if (os) { os[1].player = null; try { os[0].close(); } catch (e) { /* déjà fermée */ } }
    }
    res = { ok: true, data };
    const p = this.createPlayer(conn, name, key, data, m.look);
    s.player = p;
    this.players.set(p.id, p);
    this.shipLogin(p); // 1.1 : son navire (et son pont, s'il y était)
    if (p.pendingBase) { this.refundBase(p.key, p.pendingBase); p.pendingBase = null; }
    if (p.pendingHome) { this.importHome(p.key, p.name, p.pendingHome); p.pendingHome = null; }
    this.convertLegacy(p);
    const token = await this.makeToken(key);
    p.ip = ip; this.audit('connexion', { who: key, ip });
    this.send(p, {
      t: 'welcome', id: p.id, seed: this.world.seed, wt: this.worldTime, solo: this.solo, rt: token, ver: GAME_VERSION, maint: this.maintenance || null, seen: b64(p.seen),
      codex: { kc: p.kc, met: [...p.met], col: [...p.col], st: p.st }, tut: p.tut,
      me: this.meState(p), inv: p.inv, eq: p.eq, q: p.quests, tr: p.track || [], chests: p.chests, look: p.look, base: p.base,
      name: p.name, x: p.x, y: p.y, isNew: !res.data, ach: p.ach, treasure: p.treasure,
      history: (this.chatLog || []).slice(-12),
      build: this.buildSnapshot(p.key), dep: [...this.depleted].filter(([, t]) => t > this.time).map(([id, t]) => [id, Math.round(t - this.time)]),
      respawnAt: p.respawnAt, found: [...p.found], boat: p.boat, room: p.room, s: p.ship || 0, lx: p.lx, ly: p.ly,
      kr: this.kraken ? 1 : 0, mem: [...p.mem], homes: this.homesList(), seals: Object.fromEntries(Object.entries(this.seals).map(([k, v]) => [k, Math.max(0, Math.round(v - this.time))])), pet: p.pet,
    });
    this.broadcastChat(null, `${p.name} accoste à Port-Lanterne.`, 'sys');
    this.socialLogin(p);
    this.justiceLogin(p);
    if (this.wevt) this.pushEvent(p);
    this.seasonPrizes(p);
    if (this.inDungeon(p)) this.pushDng(p);
    if (this.fosseBoard && this.fosseBoard.champ === p.key) this.unlock(p, 'champion_fosse');
    if (!res.data) this.toast(p, 'Bienvenue ! Parlez à la Capitaine Morgane, près des quais (touche E).', 'quest');
    this.log(`[jeu] ${p.name} connecté (${this.players.size} en ligne)`);
  }

  // ------------------------------------------------------------ 1.0 : sécurité et administration
  newToken() { const a = new Uint8Array(18); globalThis.crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
  // jeton de reprise signé (HMAC) : il survit à un redémarrage du serveur, valable vingt minutes
  async hmacKey() {
    if (!this._hk) this._hk = (async () => {
      let sec = this.storage.loadMeta ? await Promise.resolve(this.storage.loadMeta('secret')).catch(() => null) : null;
      if (!sec || !sec.k) { sec = { k: this.newToken() + this.newToken() }; if (this.storage.saveMeta) await Promise.resolve(this.storage.saveMeta('secret', sec)).catch(() => {}); }
      return globalThis.crypto.subtle.importKey('raw', new TextEncoder().encode(sec.k), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    })();
    return this._hk;
  }
  async sign(s) { const sig = await globalThis.crypto.subtle.sign('HMAC', await this.hmacKey(), new TextEncoder().encode(s)); return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
  async makeToken(key) { if (!(globalThis.crypto && globalThis.crypto.subtle)) return null; const body = key + '|' + (Date.now() + 20 * 60 * 1000); return encodeURIComponent(body) + '.' + await this.sign(body); }
  async checkToken(tok) {
    if (!(globalThis.crypto && globalThis.crypto.subtle)) return null;
    try {
      const [b, sig] = String(tok).split('.'); const body = decodeURIComponent(b);
      if (!sig || (await this.sign(body)) !== sig) return null;
      const [key, until] = body.split('|');
      return +until > Date.now() ? { key, until: +until } : null;
    } catch (e) { return null; }
  }
  // cinq essais ratés par nom, ou vingt par adresse, en dix minutes : on patiente un quart d'heure
  loginFailed(key, ip) {
    const now = Date.now();
    for (const [k, max] of [['n:' + key, 5], ['ip:' + ip, 20]]) {
      const e = this.fails.get(k) || { n: 0, since: now, until: 0 };
      if (now - e.since > 600000) { e.n = 0; e.since = now; }
      if (++e.n >= max) { e.until = now + 900000; e.n = 0; e.since = now; }
      this.fails.set(k, e);
    }
  }
  loginBlocked(key, ip) { const now = Date.now(); let w = 0; for (const k of ['n:' + key, 'ip:' + ip]) { const e = this.fails.get(k); if (e && e.until > now) w = Math.max(w, (e.until - now) / 1000); } return w; }
  banOf(key) { const b = this.bans[key]; if (!b) return null; if (b.until && b.until < Date.now()) { delete this.bans[key]; this.storeBans(); return null; } return b; }
  storeBans() { if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('bans', this.bans)).catch(() => {}); }
  audit(kind, data) { if (this.storage.audit) this.storage.audit(Object.assign({ t: new Date().toISOString(), kind }, data)); }
  report(p, target, reason) {
    const r = { at: Date.now(), from: p.name, who: String(target).slice(0, 20), reason: String(reason || '').slice(0, 200), chat: (this.chatLog || []).slice(-15) };
    this.reports.push(r); if (this.reports.length > 500) this.reports.shift();
    if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('reports', this.reports)).catch(() => {});
    this.audit('signalement', { from: p.key, who: r.who, reason: r.reason });
    this.toast(p, 'Signalement transmis aux administrateurs. Merci.', 'info');
  }
  // commandes réservées aux administrateurs (voir server/index.js : /admin, protégé par ADMIN_TOKEN)
  admin(cmd, a = {}) {
    const findP = (n) => [...this.players.values()].find((q) => q.key === String(n || '').toLowerCase());
    this.audit('admin', { cmd, a });
    switch (cmd) {
      case 'status': {
        const mem = typeof process !== 'undefined' && process.memoryUsage ? process.memoryUsage() : {};
        return { version: GAME_VERSION, protocol: PROTOCOL, players: this.players.size, mobs: this.mobs.length, alive: this.mobs.filter((m) => m.state !== 'dead').length, drops: this.drops.size, projs: this.projs.length,
          tickMs: +(this.tickMs || 0).toFixed(2), tickMax: +(this.tickMax || 0).toFixed(2), uptime: Math.round(this.time), mem: Math.round((mem.heapUsed || 0) / 1048576), homes: this.homes.size, maintenance: this.maintenance || null, night: this.night };
      }
      case 'players': return [...this.players.values()].map((q) => ({ name: q.name, level: q.level, gold: q.gold, zone: ZONES[q.zone] ? ZONES[q.zone].name : q.zone, x: Math.round(q.x / TILE), y: Math.round(q.y / TILE), ip: q.ip, pk: q.pk }));
      case 'reports': return this.reports.slice(-100).reverse();
      case 'bans': return this.bans;
      case 'ban': {
        const key = String(a.name || '').toLowerCase(); if (!key) return { err: 'nom manquant' };
        this.bans[key] = { reason: String(a.reason || '').slice(0, 200), until: a.hours ? Date.now() + a.hours * 3600000 : 9e15, at: Date.now() };
        this.storeBans();
        const q = findP(key); if (q) { this.send(q, { t: 'kick', msg: 'Vous avez été banni : ' + this.bans[key].reason }); this.dropConn(q); }
        return { ok: true };
      }
      case 'unban': delete this.bans[String(a.name || '').toLowerCase()]; this.storeBans(); return { ok: true };
      case 'kick': { const q = findP(a.name); if (!q) return { err: 'absent' }; this.send(q, { t: 'kick', msg: a.msg || 'Déconnecté par un administrateur.' }); this.dropConn(q); return { ok: true }; }
      case 'announce': this.broadcastChat(null, '📣 ' + String(a.msg || '').slice(0, 200), 'boss'); for (const q of this.players.values()) this.toast(q, String(a.msg || '').slice(0, 200), 'quest'); return { ok: true };
      case 'maintenance': { // annonce un arrêt dans N minutes ; closed : refuse les nouvelles connexions
        const min = Math.max(0, +a.minutes || 0);
        this.maintenance = min || a.closed ? { at: Date.now() + min * 60000, msg: String(a.msg || 'Mise à jour du serveur.').slice(0, 200), closed: !!a.closed } : null;
        this.broadcastAll({ t: 'maint', m: this.maintenance });
        return { ok: true, maintenance: this.maintenance };
      }
      case 'event': return this.startWorldEvent(String(a.kind || ''), a.now ? 'now' : true);
      case 'save': return Promise.resolve(this.saveAll()).then(() => ({ ok: true }));
      case 'mute': { const key = String(a.name || '').toLowerCase(); this.mutes[key] = Date.now() + (+a.minutes || 30) * 60000; if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('mutes', this.mutes)).catch(() => {}); const q = findP(key); if (q) this.toast(q, 'Un administrateur vous a réduit au silence.', 'warn'); return { ok: true }; }
      default: return { err: 'commande inconnue' };
    }
  }
  dropConn(p) {
    const os = [...this.sessions.entries()].find(([, v]) => v.player === p);
    this.logout(p);
    if (os) { os[1].player = null; try { os[0].close(); } catch (e) { /* déjà fermée */ } }
  }

  createPlayer(conn, name, key, d, look) {
    const sp = this.world.spawnPoint;
    const p = {
      id: this.nextId++, conn, name: d && d.name ? d.name : name, key,
      base: sanitizeLook(d ? d.look : look),
      x: sp.x, y: sp.y, dir: 0, moving: false,
      level: 1, xp: 0, gold: 15, hp: 0, en: 60,
      inv: new Array(INV_SIZE).fill(null),
      eq: { weapon: 'sabre_rouille', gun: null, hat: null, body: 'chemise', boots: null, trinket: null, outfit: null },
      quests: {}, chests: {}, cds: {}, cry: 0, rumUntil: 0, rumRate: 0, drunkUntil: 0,
      dead: false, deathAt: 0, moveBudget: 80, lastMoveAt: this.time, invulnUntil: this.time + 2,
      known: new Map(), dirtyMe: true, dirtyInv: false, dirtyQ: false, lastSave: this.time,
      lastHurt: -99, lastChat: -9, zone: Z.TOWN, lookVer: 0, kills: 0,
      upg: {}, treasure: null, ach: {}, title: null, cnt: { crab: 0, fish: 0, ships: 0, horde: 0, dice: 0 }, zs: new Set(), fishing: null, respawnAt: null,
      found: new Set(), boat: null, room: -1, pk: 0, pvpLog: new Map(), caches: {}, pet: null, burgle: null, thiefUntil: 0, robbed: {},
    };
    p.held = []; p.heldQ = {}; p.heldA = {}; p.heldF = {}; // 1.0 : ce que ce serveur ne connaît pas, gardé intact
    p.seen = d && d.seen ? unb64(d.seen, this.seenBytes) : new Uint8Array(this.seenBytes);
    // 1.0 : statistiques personnelles et codex (monstres, personnages rencontrés, objets obtenus)
    const st0 = d && d.st && typeof d.st === 'object' ? d.st : {};
    p.st = { time: +st0.time || 0, boss: st0.boss | 0, gin: +st0.gin || 0, gout: +st0.gout || 0, sea: +st0.sea || 0, deaths: st0.deaths | 0, quests: st0.quests | 0, since: +st0.since || Date.now() };
    p.kc = d && d.kc && typeof d.kc === 'object' ? { ...d.kc } : {};
    p.met = new Set(d && Array.isArray(d.met) ? d.met.filter((x) => typeof x === 'string') : []);
    p.col = new Set(d && Array.isArray(d.col) ? d.col.filter((x) => typeof x === 'string') : []);
    p.tut = d ? (d.tut == null ? 99 : d.tut | 0) : 0; // tutoriel : les anciens pirates le connaissent déjà
    this.socialLoad(p, d);
    this.justiceLoad(p, d);
    this.navalLoad(p, d);
    this.shipLoad(p, d);
    this.seasonsLoad(p, d);
    p.mem = new Set(d && Array.isArray(d.mem) ? d.mem.filter((k) => MEM_KEYS.has(k)) : []); // 1.0 : les choix qui comptent
    p.songs = new Set(['day', ...(d && Array.isArray(d.songs) ? d.songs.filter((k) => HOUSE_MUSIC.some(([x]) => x && x === k)) : [])]);
    if (d) {
      for (const k in d) if (!SAVE_KEYS.has(k)) p.heldF[k] = d[k];
      if (Array.isArray(d.held)) for (const it of d.held) if (it && typeof it.id === 'string') p.held.push({ id: it.id, n: Math.max(1, it.n | 0) });
      if (d.quests && typeof d.quests === 'object') for (const q in d.quests) if (!QUESTS[q]) p.heldQ[q] = d.quests[q];
      if (d.ach && typeof d.ach === 'object') for (const k in d.ach) if (!ACHIEVEMENTS[k]) p.heldA[k] = d.ach[k];
      if (d.eq) for (const s in d.eq) if (d.eq[s] && !ITEMS[d.eq[s]] && !LEGACY_VALUE[d.eq[s]]) p.held.push({ id: d.eq[s], n: 1 });
      p.level = Math.max(1, Math.min(MAX_LEVEL, d.level | 0 || 1));
      p.xp = Math.max(0, d.xp | 0); p.gold = Math.max(0, d.gold | 0);
      if (Array.isArray(d.inv)) for (let i = 0; i < INV_SIZE; i++) {
        const it = d.inv[i];
        p.inv[i] = it && ITEMS[it.id] ? { id: it.id, n: Math.max(1, Math.min(STACK_MAX, it.n | 0)) } : null;
        if (it && !ITEMS[it.id] && LEGACY_VALUE[it.id]) p.legacyGold = (p.legacyGold || 0) + LEGACY_VALUE[it.id] * Math.max(1, it.n | 0); // 0.8 : matériaux et outils revendus
        else if (it && it.id && !ITEMS[it.id]) p.held.push({ id: String(it.id), n: Math.max(1, it.n | 0) }); // inconnu ici : mis de côté, pas perdu
      }
      if (d.eq) for (const s of SLOTS) p.eq[s] = d.eq[s] && ITEMS[d.eq[s]] && ITEMS[d.eq[s]].slot === s ? d.eq[s] : null;
      if (d.quests && typeof d.quests === 'object') for (const q in d.quests) if (QUESTS[q]) p.quests[q] = { s: d.quests[q].s === 'done' ? 'done' : 'active', p: Array.isArray(d.quests[q].p) ? d.quests[q].p.map((v) => v | 0) : [], t: +d.quests[q].t || 0 };
      if (d.chests) p.chests = d.chests;
      if (Array.isArray(d.track)) p.track = d.track.filter((q) => QUESTS[q] && p.quests[q] && p.quests[q].s === 'active').slice(0, 4);
      p.kills = d.kills | 0;
      if (d.upg) for (const k of UPG_SLOTS) p.upg[k] = Math.max(0, Math.min(UPG_MAX, d.upg[k] | 0));
      if (d.treasure && typeof d.treasure.x === 'number') p.treasure = { x: d.treasure.x, y: d.treasure.y };
      if (d.ach && typeof d.ach === 'object') for (const k in d.ach) if (ACHIEVEMENTS[k]) p.ach[k] = d.ach[k];
      if (d.title && p.ach[d.title]) p.title = d.title;
      if (d.cnt && typeof d.cnt === 'object') for (const k in d.cnt) if (/^[a-z]{2,12}$/.test(k)) p.cnt[k] = Math.max(0, d.cnt[k] | 0); // 1.0 : tous les compteurs
      if (d.respawnAt && typeof d.respawnAt.tx === 'number') p.respawnAt = { tx: d.respawnAt.tx | 0, ty: d.respawnAt.ty | 0 };
      if (!this.worldPersist && d.base) p.pendingBase = d.base; // 0.8 : remboursée à la connexion
      if (!this.worldPersist && d.home) p.pendingHome = d.home;
      if (typeof d.pet === 'string') p.pet = d.pet;
      if (Array.isArray(d.found)) for (const id of d.found) if (this.world.doors[id | 0] && this.world.doors[id | 0].secret) p.found.add(id | 0);
      p.pk = d.pk | 0;
      if (d.caches && typeof d.caches === 'object') for (const k in d.caches) if (String(k).startsWith('i:')) p.caches[k] = 1;
      if (Array.isArray(d.zs)) for (const z of d.zs) if (FAR_ZONES.includes(z | 0)) p.zs.add(z | 0);
      if (typeof d.x === 'number' && typeof d.y === 'number') {
        if (canStand(this.world, d.x, d.y, false, key)) { p.x = d.x; p.y = d.y; }
      }
    } else {
      this.addItem(p, 'banane', 3);
    }
    // ce qui était mis de côté et que ce serveur connaît désormais revient dans le sac
    p.held = p.held.filter((it) => !(ITEMS[it.id] && this.addItem(p, it.id, it.n) === 0));
    this.recalc(p);
    p.hp = d && d.hp > 0 ? Math.min(p.stats.maxHp, d.hp) : p.stats.maxHp;
    p.en = p.stats.maxEn;
    p.zone = zoneAt(this.world, p.x, p.y);
    p.room = roomIdAt(this.world, p.x, p.y);
    this.markSeen(p, true); // on voit au moins là où l'on se tient
    if (d && !d.seen) this.revealKnown(p); // sauvegarde d'avant la 1.0 : les îles déjà parcourues sortent de la brume
    if (!d) { const sp0 = this.world.spawnPoint; const keep = [p.x, p.y]; p.x = sp0.x; p.y = sp0.y; this.markSeen(p, true); [p.x, p.y] = keep; }
    return p;
  }
  // 0.8 : les anciens matériaux de quête au-delà de ce que réclament les quêtes en cours, et tout ce qui
  // ne sert plus, sont revendus ; le pirate en est averti dans le chat
  convertLegacy(p) {
    let gold = p.legacyGold || 0; p.legacyGold = 0;
    for (let i = 0; i < p.inv.length; i++) {
      const s = p.inv[i];
      if (!s || !QUEST_ITEM_OLD_VALUE[s.id]) continue;
      let need = 0;
      for (const [qid, st] of Object.entries(p.quests)) if (st.s === 'active' && QUESTS[qid]) for (const g of QUESTS[qid].goals) if (g.type === 'collect' && g.item === s.id) need += g.n;
      const have = this.countItem(p, s.id), extra = Math.min(s.n, Math.max(0, have - need));
      if (extra > 0) { gold += extra * QUEST_ITEM_OLD_VALUE[s.id]; s.n -= extra; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true; }
    }
    if (gold > 0) this.addRefund(p.key, gold);
    this.applyRefund(p);
  }
  serialize(p) {
    return { ...(p.heldF || {}), ...this.socialSave(p), ...this.justiceSave(p), ...this.shipSave(p), songs: [...(p.songs || [])], mem: [...(p.mem || [])], hulls: p.hulls, fishRec: p.fishRec, sv: SAVE_VERSION, held: p.held || [], seen: p.seen ? b64(p.seen) : undefined, st: p.st, kc: p.kc, met: p.met ? [...p.met] : [], col: p.col ? [...p.col] : [], tut: p.tut, name: p.name, look: p.base, level: p.level, xp: p.xp, gold: p.gold, hp: Math.round(p.hp), inv: p.inv, eq: p.eq, quests: { ...(p.heldQ || {}), ...p.quests }, track: p.track || [], chests: p.chests, x: Math.round(p.x), y: Math.round(p.y), kills: p.kills, upg: p.upg, treasure: p.treasure, ach: { ...(p.heldA || {}), ...p.ach }, title: p.title, cnt: p.cnt, respawnAt: p.respawnAt, found: [...p.found], boat: null, pk: p.pk, caches: p.caches, zs: [...p.zs], pet: p.pet, home: this.worldPersist ? undefined : this.exportHome(p.key), base: this.worldPersist ? undefined : this.exportBase(p.key), saved: Date.now() };
  }
  save(p) {
    p.lastSave = this.time;
    const data = this.serialize(p);
    if (p.dead) { data.x = this.world.spawnPoint.x; data.y = this.world.spawnPoint.y; data.hp = 0; }
    Promise.resolve(this.storage.save(p.key, data)).catch((e) => this.log('[sauvegarde] échec', p.name, e && e.message));
  }
  saveAll() { // renvoie une promesse : l'arrêt du serveur attend la fin des écritures
    for (const p of this.players.values()) this.save(p);
    const w = this.worldPersist && !this.worldFrozen ? Promise.resolve(this.storage.saveWorld(this.exportWorld())).catch(() => {}) : Promise.resolve();
    return Promise.all([w, this.storage.flush ? this.storage.flush() : null]);
  }

  recalc(p) {
    p.stats = computeStats(p.level, p.eq, p.upg, !!p.riding, this.activeBuffs(p), p.glory);
    const L = displayLook(p.base, p.eq);
    if (JSON.stringify(L) !== JSON.stringify(p.look)) { p.look = L; p.lookVer++; }
    if (p.hp > p.stats.maxHp) p.hp = p.stats.maxHp;
    p.dirtyMe = true;
  }
  activeBuffs(p) {
    if (!p.buffs) return null;
    const b = {};
    for (const [k, v] of Object.entries(p.buffs)) if (v.until > this.time) { const s = k === 'chant' ? 'atk' : k; b[s] = (b[s] || 0) + v.v; } // l'entrain d'une chanson s'ajoute à la force
    return b;
  }
  updateBuffs(p) {
    if (p.buffs) for (const [k, v] of Object.entries(p.buffs)) if (v.until <= this.time) { delete p.buffs[k]; this.recalc(p); }
    if (p.recallAt && this.time >= p.recallAt && !p.dead) { // la conque a parlé : à la maison, ou en ville
      p.recallAt = 0;
      if (this.countItem(p, p.recallSlot || 'conque_rappel') < 1) return;
      this.removeItem(p, p.recallSlot || 'conque_rappel', 1);
      const h = this.homeOf(p.key), d = h ? this.world.doors[this.world.plots[h.k].door] : null;
      const [x, y] = d ? [d.ox, d.oy + 14] : [this.world.spawnPoint.x, this.world.spawnPoint.y];
      if (p.riding) this.dismount(p);
      this.teleport(p, x, y, { travel: 'recall' });
      this.toast(p, d ? 'Vous voilà devant chez vous.' : 'Vous voilà à Port-Lanterne.', 'quest');
    }
  }
  // ------------------------------------------------------------ montures (touche C)
  toggleRide(p) {
    if (p.riding) return this.dismount(p);
    const it = p.eq.mount && ITEMS[p.eq.mount];
    if (!it || !it.mount || p.dead) return this.toast(p, 'Équipez d’abord une monture (emplacement Monture), puis appuyez sur C.', 'warn');
    if (p.ship) return this.toast(p, 'Pas de monture sur un pont !', 'warn');
    if (p.room !== -1) return this.toast(p, 'Pas à l’intérieur !', 'warn');
    if (this.time - p.lastHurt < 1.5) return this.toast(p, 'Pas en plein combat !', 'warn');
    p.riding = true; p.lookVer++;
    this.recalc(p); p.dirtyMe = true;
    this.ev(p.x, p.y, ['ride', p.id, 1, it.mount.kind]);
  }
  dismount(p) {
    if (!p.riding) return;
    p.riding = false; p.lookVer++;
    this.recalc(p); p.dirtyMe = true;
    this.ev(p.x, p.y, ['ride', p.id, 0]);
  }
  meState(p) {
    return {
      hp: Math.ceil(p.hp), maxHp: p.stats.maxHp, en: Math.floor(p.en), maxEn: p.stats.maxEn,
      lvl: p.level, xp: p.xp, xpNext: xpToNext(p.level), gold: p.gold,
      st: { atk: p.stats.atk, gun: p.stats.gun, def: p.stats.def, crit: Math.round(p.stats.crit * 100), speed: p.stats.speed, regen: +p.stats.regen.toFixed(1) },
      cry: Math.max(0, +(p.cry - this.time).toFixed(1)), drunk: Math.max(0, +(p.drunkUntil - this.time).toFixed(1)),
      dead: p.dead, kills: p.kills, upg: p.upg, title: p.title, boat: p.boat, room: p.room, pk: p.pk, pet: p.pet || '', vo: this.time < p.thiefUntil ? 1 : 0,
      ...this.justiceMe(p), gxpNext: GLORY_XP, ...this.shipMe(p), air: this.seaRoom(p) ? Math.ceil(p.air || 0) : -1, airMax: this.airMax(p), songs: [...(p.songs || [])],
      ride: p.riding && p.eq.mount ? ITEMS[p.eq.mount].mount.kind : '', cnt: p.cnt, zsn: p.zs.size, zst: FAR_ZONES.length, cch: Object.keys(p.caches).length, bf: p.buffs ? Object.entries(p.buffs).filter(([, v]) => v.until > this.time).map(([k, v]) => [k, Math.ceil(v.until - this.time)]) : [], rc: p.recallAt ? +(p.recallAt - this.time).toFixed(1) : 0,
    };
  }
  toast(p, msg, kind = 'info') { this.send(p, { t: 'toast', msg, kind }); }
  broadcastChat(from, msg, kind = 'chat', lvl = 0) {
    const m = { t: 'chat', from: from ? from.name : null, lvl, m: msg, kind, pid: from ? from.id : 0 };
    this.chatLog = this.chatLog || [];
    this.chatLog.push(m); if (this.chatLog.length > 40) this.chatLog.shift();
    for (const p of this.players.values()) this.send(p, m);
  }
  ev(x, y, e) { this.events.push({ x, y, e, r: roomIdAt(this.world, x, y) }); }

  // ------------------------------------------------------------ monstres
  addMob(type, x, y, summoned = false) {
    const def = MOBS[type];
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    let sx = tx * TILE + 8, sy = ty * TILE + 10;
    if (summoned) { sx = x; sy = y; }
    const m = {
      id: this.nextId++, type, def, x: sx, y: sy, sx, sy, hp: def.hp, maxHp: def.hp, dir: 0,
      state: 'idle', target: 0, nextAtk: 0, windup: 0, atkA: 0, wanderAt: this.time + rand(1, 6), wx: sx, wy: sy,
      deadUntil: 0, tags: new Map(), moving: false, summoned, boss: !!def.boss, nextSummon: 0, nextVolley: 0, adds: [], phase: 0, cd: {}, pauseUntil: 0,
      room: roomIdAt(this.world, sx, sy),
    };
    this.mobs.push(m);
    return m;
  }
  // ------------------------------------------------------------ navires maudits
  shipAI(m) {
    const def = m.def, now = this.time;
    let near = false;
    for (const p of this.players.values()) if (p.room === -1 && Math.abs(p.x - m.x) < 950 && Math.abs(p.y - m.y) < 750) { near = true; break; }
    if (!near) { m.moving = false; return; }
    if (m.pauseUntil > now) { m.moving = false; return; }
    const ph = def.phases || [];
    if (m.phase < ph.length && m.hp < m.maxHp * ph[m.phase]) {
      m.phase++; m.pauseUntil = now + 1.4;
      this.ev(m.x, m.y, ['phase', m.id, m.phase]);
      this.ev(m.x, m.y, ['shout', m.id, 'Feu des âmes ! Coulez-les tous !']);
      return;
    }
    const valid = (p) => p && !p.dead && p.room === -1 && !SAFE.has(p.zone) && Math.hypot(p.x - m.x, p.y - m.y) < def.aggro * (m.target === p.id ? 1.4 : 1);
    let t = m.target ? this.players.get(m.target) : null;
    if (!valid(t)) {
      t = null; m.target = 0;
      let bd = 1e9;
      for (const p of this.players.values()) { if (!valid(p)) continue; const d = Math.hypot(p.x - m.x, p.y - m.y) * (p.boat ? 1 : 1.5); if (d < bd) { bd = d; t = p; } }
      if (t) {
        m.target = t.id; m.state = 'chase';
        if (def.ai && this.time - (m.introAt || -1e9) > 120) { this.bossIntro(m); return; }
      } else m.state = 'idle';
    }
    let gx = 0, gy = 0, sp = def.speed;
    if (t) {
      const dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy) || 1;
      const radial = Math.max(-1, Math.min(1, (d - 175) / 60)), o = m.orbitDir || 1;
      const vx = dx / d * radial - dy / d * o * 0.9, vy = dy / d * radial + dx / d * o * 0.9, L = Math.hypot(vx, vy) || 1;
      gx = vx / L; gy = vy / L;
      if (now >= m.nextAtk && d < def.range) {
        m.nextAtk = now + def.atkCd * rand(0.85, 1.15);
        const guns = def.ship.guns || 1, a0 = Math.atan2(t.y - m.y, t.x - m.x);
        this.ev(m.x, m.y, ['atk', m.id, +a0.toFixed(2), 3]);
        for (let k = 0; k < guns; k++) {
          const off = (k - (guns - 1) / 2) * 0.13 + rand(-0.04, 0.04);
          this.later(k * 0.14, () => { if (m.state !== 'dead') this.spawnProj(m.x + Math.cos(a0) * 16, m.y - 8 + Math.sin(a0) * 10, a0 + off, 210, def.range * 1.15, def.dmg * rand(0.9, 1.1), 'm', m.id, 'cball', 0); });
        }
      }
      if (def.ai === 'galion' && m.phase >= 1 && now >= (m.cd.ghost || 0)) { // feu fantôme autour de la cible
        m.cd.ghost = now + 9;
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.tele(t.x + Math.cos(a) * rand(20, 60), t.y + Math.sin(a) * rand(16, 48), 26, 1.4, 52, m, 8); }
        this.tele(t.x, t.y, 30, 1.6, 60, m, 8);
      }
    } else {
      const [wx, wy] = m.route ? m.route[m.wp] : [m.sx, m.sy];
      const dx = wx - m.x, dy = wy - m.y, d = Math.hypot(dx, dy) || 1;
      if (d < 26 && m.route) m.wp = (m.wp + 1) % m.route.length;
      gx = dx / d; gy = dy / d; sp *= 0.6;
    }
    m.vx = (m.vx || 0) + (gx * sp - (m.vx || 0)) * 0.06;
    m.vy = (m.vy || 0) + (gy * sp - (m.vy || 0)) * 0.06;
    const [nx, ny] = moveBoat(this.world, m.x, m.y, m.vx * DT, m.vy * DT);
    if (Math.abs(nx - m.x) + Math.abs(ny - m.y) < 0.02 && Math.hypot(m.vx, m.vy) > 10) { // coincé contre la côte : on vire de bord
      m.orbitDir = -(m.orbitDir || 1); m.vx *= -0.5; m.vy *= -0.5;
      if (!t && m.route) m.wp = (m.wp + 1) % m.route.length;
    }
    m.moving = Math.abs(nx - m.x) + Math.abs(ny - m.y) > 0.02;
    m.x = nx; m.y = ny;
    if (Math.hypot(m.vx, m.vy) > 8) m.dir = dirOf(m.vx, m.vy);
  }
  // Fer et Rouille : tant qu'ils se tiennent côte à côte, leurs armures se renvoient les coups
  updateLink(m) {
    const tw = m.twinRef || (m.twinRef = this.mobs.find((o) => o !== m && o.type === m.def.twin && o.room === m.room));
    const linked = !!tw && tw.state !== 'dead' && !tw.fallen && dist(m, tw) < 150;
    if (linked !== !!m.linked) { m.linked = linked; this.ev(m.x, m.y, ['link', m.id, linked ? 1 : 0]); if (linked && m.state === 'chase') this.ev(m.x, m.y, ['shout', m.id, 'Ensemble, on est invincibles !']); }
    if (linked) m.shieldUntil = this.time + 0.3;
  }
  // nuages de peste : ils empoisonnent ceux qui s'y attardent
  addCloud(x, y, r, dur, dps) { this.clouds.push({ x, y, r, until: this.time + dur, dps }); this.ev(x, y, ['cloud', Math.round(x), Math.round(y), r, dur]); }
  updateClouds() {
    this.clouds = this.clouds.filter((c) => c.until > this.time);
    for (const c of this.clouds) for (const p of this.players.values()) if (!p.dead && !SAFE.has(p.zone) && Math.hypot(p.x - c.x, p.y - c.y) < c.r) this.damagePlayer(p, c.dps * 0.5, null, false, 'p');
  }
  mobSplash(pr) {
    const r = pr.fx.msplash, src = this.mobs.find((m) => m.id === pr.owner) || null;
    this.ev(pr.x, pr.y, ['boom', Math.round(pr.x), Math.round(pr.y + 8), r, 1]);
    for (const q of this.players.values()) if (!q.dead && !SAFE.has(q.zone) && q.id !== pr.hitP && Math.hypot(q.x - pr.x, q.y - 9 - pr.y) < r) this.damagePlayer(q, pr.dmg * 0.6, src);
    this.addCloud(pr.x, pr.y + 8, r * 0.8, 3, 8);
  }
  // ------------------------------------------------------------ soleil, lune et Horde
  bury(m) { m.state = 'dead'; m.buried = true; m.deadUntil = Infinity; m.hp = m.maxHp; m.target = 0; m.windup = 0; m.burnAt = 0; }
  rise(m) {
    m.buried = false;
    if (m.summoned) return;
    this.respawnMob(m, true);
  }
  burnInSun(m) {
    m.burnAt = 0;
    if (m.state === 'dead') return;
    this.ev(m.x, m.y, ['burn', m.id]);
    if (m.summoned) { m.state = 'dead'; return; }
    this.bury(m);
  }
  updateHorde() {
    this.hordeAt = this.time + 18;
    const pool = (z) => z === Z.DAMNES ? ['damne', 'molosse_damne'] : z === Z.VOLCAN ? ['calcine', 'pestifere'] : z === Z.QUARANTAINE ? ['pestifere', 'pestifere', 'chien_mort'] : z === Z.OSSEMENTS ? ['legionnaire', 'flibustier'] : z === Z.PENDUS ? ['pendu', 'chien_mort'] : z === Z.COLLINES || z === Z.SIRENES || z === Z.ERMITE ? ['flibustier', 'chien_mort', 'zsailor'] : z === Z.SWAMP || z === Z.WRECK || z === Z.CRANE ? ['drowned', 'buccaneer', 'ghoul'] : ['zsailor', 'zsailor', 'buccaneer', 'ghoul'];
    for (const p of this.players.values()) {
      if (p.dead || p.room !== -1 || p.boat || SAFE.has(p.zone) || p.zone === Z.SEA) continue;
      const mine = this.mobs.filter((m) => m.horde && m.state !== 'dead' && m.hordeFor === p.id).length;
      if (mine >= 8) continue;
      const list = pool(p.zone), n = Math.min(8 - mine, 3 + Math.floor(Math.random() * 3));
      let made = 0;
      for (let k = 0; k < n * 4 && made < n; k++) {
        const a = Math.random() * Math.PI * 2, r = rand(150, 230);
        const x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r * 0.75;
        if (!canStand(this.world, x, y, true) || roomIdAt(this.world, x, y) !== -1 || SAFE.has(zoneAt(this.world, x, y))) continue;
        const m = this.addMob(list[Math.floor(Math.random() * list.length)], x, y, true);
        m.horde = true; m.hordeFor = p.id; m.state = 'chase'; m.target = p.id; m.sx = x; m.sy = y;
        this.ev(x, y, ['fx', 'rise', x, y]);
        made++;
      }
      if (made) this.toast(p, '🌕 La Horde vous a repéré !', 'warn');
    }
  }
  respawnMob(m, rising = false) {
    if (m.scale) { m.maxHp = m.baseHp; m.scale = 0; }
    m.x = m.sx; m.y = m.sy; m.hp = m.maxHp; m.state = 'idle'; m.target = 0; m.tags.clear(); m.windup = 0;
    m.phase = 0; m.cd = {}; m.frenzy = 0; m.shieldUntil = 0; m.dash = null; m.leap = null; m.pauseUntil = 0;
    m.id = this.nextId++; // nouvel identifiant : les clients le voient « apparaître »
    if (m.def.night && !m.sunproof && !this.night) { this.bury(m); return; } // le jour, il reste sous terre
    this.ev(m.x, m.y, ['fx', rising ? 'rise' : 'spawn', m.x, m.y]);
    if (m.def.elite && this.players.size) this.broadcastChat(null, `☠ ${m.def.name} rôde à nouveau : ${m.room >= 0 ? this.world.rooms[m.room].name : ZONES[zoneAt(this.world, m.x, m.y)].name}.`, 'night');
  }
  // un mort ne poursuit pas un pirate en zone sûre, dans une autre pièce, ou en mer (sauf s'il tire)
  mobCanTarget(m, p) { return !p.dead && !SAFE.has(p.zone) && p.room === m.room && (!p.boat || !!m.def.ranged) && !(this.time < (p.smokeUntil || 0) && !m.def.ai); }
  nearestTarget(m, range) {
    let best = null, bd = range;
    for (const p of this.players.values()) {
      if (!this.mobCanTarget(m, p)) continue;
      const d = dist(m, p);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  stepMob(m, tx, ty, speed) {
    const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
    if (d < 0.5) { m.moving = false; return d; }
    let sp = speed * DT;
    const t = tileAt(this.world, m.x, m.y);
    if ((t === T.WATER || t === T.SWAMP) && !m.def.swims) sp *= 0.7;
    const s = Math.min(sp, d);
    const [nx, ny] = moveWithCollision(this.world, m.x, m.y, dx / d * s, dy / d * s, true);
    m.moving = nx !== m.x || ny !== m.y;
    m.x = nx; m.y = ny;
    if (m.moving) m.dir = dirOf(dx, dy);
    return d;
  }
  updateMobs() {
    const night = this.night;
    const spdMul = night ? 1.1 : 1;
    const active = [];
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];
      if (m.state === 'dead') {
        if (m.summoned) { this.mobs.splice(i, 1); continue; }
        if (this.time >= m.deadUntil) this.respawnMob(m);
        continue;
      }
      if (m.burnAt && this.time >= m.burnAt) { this.burnInSun(m); continue; }
      if (m.def.twin) this.updateLink(m);
      if (m.def.ship) { this.shipAI(m); continue; }
      if (m.def.sea) { if (m.def.ai === 'kraken') this.krakenAI(m); else this.tentacleAI(m); continue; }
      // seuls les monstres proches d'un joueur réfléchissent
      let awake = false;
      for (const p of this.players.values()) if (Math.abs(p.x - m.x) < 700 && Math.abs(p.y - m.y) < 500) { awake = true; break; }
      if (!awake) { if (m.state !== 'idle') { m.x = m.sx; m.y = m.sy; m.hp = m.maxHp; m.state = 'idle'; m.target = 0; } m.moving = false; continue; }
      active.push(m);
      const def = m.def;
      const speed = def.speed * spdMul * (m.boss && m.hp < m.maxHp * 0.25 ? 1.25 : 1) * (m.frenzy ? 1.3 : 1) * (m.slowUntil > this.time ? m.slowMul : 1);
      if (m.stunUntil > this.time) { m.moving = false; continue; } // étourdi
      if (m.fearUntil > this.time) { this.stepMob(m, m.x + (m.x - m.fearX) * 4, m.y + (m.y - m.fearY) * 4, speed * 1.15); continue; } // il s'enfuit
      if (m.state === 'idle') {
        const t = this.nearestTarget(m, def.aggro);
        if (t) { m.state = 'chase'; m.target = t.id; if (def.groan) this.ev(m.x, m.y, ['groan', m.id]); if (def.ai) this.bossIntro(m); }
        else {
          if (this.time >= m.wanderAt) {
            const a = Math.random() * Math.PI * 2, r = rand(10, 46);
            m.wx = m.sx + Math.cos(a) * r; m.wy = m.sy + Math.sin(a) * r;
            m.wanderAt = this.time + rand(3, 7);
          }
          this.stepMob(m, m.wx, m.wy, speed * 0.4);
        }
      } else if (m.state === 'return') {
        const d = this.stepMob(m, m.sx, m.sy, speed * 1.3);
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.05);
        if (d < 6) { if (m.scale) { m.maxHp = m.baseHp; m.scale = 0; } m.state = 'idle'; m.hp = m.maxHp; m.tags.clear(); m.phase = 0; m.frenzy = 0; m.shieldUntil = 0; }
      } else if (m.state === 'chase') {
        const t = this.players.get(m.target);
        const leashed = Math.hypot(m.x - m.sx, m.y - m.sy) > def.leash;
        if (!t || !this.mobCanTarget(m, t) || leashed) {
          const other = !leashed && this.nearestTarget(m, def.aggro);
          if (other) m.target = other.id; else { m.state = 'return'; m.target = 0; m.windup = 0; m.dash = null; m.leap = null; m.pauseUntil = 0; this.despawnAdds(m); }
          continue;
        }
        const d = dist(m, t);
        if (m.pauseUntil > this.time) { m.moving = false; continue; }
        if (m.dash) { this.updateDash(m); continue; }
        if (m.leap) { this.updateLeap(m); continue; }
        if (m.windup) {
          m.moving = false;
          if (this.time >= m.windup) {
            m.windup = 0;
            m.nextAtk = this.time + def.atkCd * (m.boss && m.hp < m.maxHp * 0.25 ? 0.7 : 1) * (m.frenzy ? 0.6 : 1) * (m.frostUntil > this.time ? 1.6 : 1);
            this.resolveMobAttack(m, t, night);
          }
        } else if (def.ranged) {
          if (d < def.keep) {
            const ax = m.x - (t.x - m.x), ay = m.y - (t.y - m.y);
            this.stepMob(m, ax, ay, speed * 0.8);
          } else if (d > def.range * 0.85) this.stepMob(m, t.x, t.y, speed);
          else m.moving = false;
          if (d <= def.range && this.time >= m.nextAtk && this.lineOfSight(m.x, m.y - 9, t.x, t.y - 9)) {
            m.windup = this.time + def.windup; m.atkA = Math.atan2(t.y - m.y, t.x - m.x); m.dir = dirOf(t.x - m.x, t.y - m.y);
            this.ev(m.x, m.y, ['aim', m.id, +m.atkA.toFixed(2), def.windup]);
          }
        } else {
          if (d > def.range * 0.8) this.stepMob(m, t.x, t.y, speed);
          else m.moving = false;
          if (d <= def.range + 4 && this.time >= m.nextAtk) {
            m.windup = this.time + def.windup; m.atkA = Math.atan2(t.y - m.y, t.x - m.x); m.dir = dirOf(t.x - m.x, t.y - m.y);
            this.ev(m.x, m.y, ['wind', m.id, +m.atkA.toFixed(2), def.windup]);
          }
        }
        if (def.ai) this.bossAI(m, t);
      }
    }
    // séparation légère pour éviter les empilements
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
      if (a.leap || b.leap) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), min = (a.def.r + b.def.r) * 0.9;
      if (d > 0.01 && d < min) {
        const push = (min - d) * 0.25;
        const [ax, ay] = moveWithCollision(this.world, a.x, a.y, -dx / d * push, -dy / d * push, true);
        const [bx, by] = moveWithCollision(this.world, b.x, b.y, dx / d * push, dy / d * push, true);
        a.x = ax; a.y = ay; b.x = bx; b.y = by;
      }
    }
  }
  resolveMobAttack(m, t, night) {
    const def = m.def;
    const dmg = def.dmg * (night ? (isFullMoon(this.worldTime) ? 1.3 : 1.15) : 1) * rand(0.9, 1.1);
    if (def.ranged) {
      const sp = def.ranged.speed;
      this.spawnProj(m.x, m.y - 9, m.atkA, sp, sp * def.ranged.life, dmg, 'm', m.id, def.ranged.kind || 'ball', 0, false, false, def.ranged.splash ? { msplash: def.ranged.splash } : null);
      this.ev(m.x, m.y, ['atk', m.id, +m.atkA.toFixed(2), 1]);
      return;
    }
    this.ev(m.x, m.y, ['atk', m.id, +m.atkA.toFixed(2), m.boss ? 2 : 0]);
    const arc = m.boss ? 1.4 : 1.0;
    for (const p of this.players.values()) {
      if (p.dead || SAFE.has(p.zone) || p.room !== m.room) continue;
      const d = dist(m, p);
      if (d > def.range + 8 + (m.boss ? 6 : 0)) continue;
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      if (d > 10 && angDiff(a, m.atkA) > arc) continue;
      this.damagePlayer(p, dmg, m);
      if (def.burnHit) this.addDot(p, 'f', dmg * def.burnHit, m);
      if (!m.boss) break;
    }
  }
  // ------------------------------------------------------------ boss : entrée, phases, attaques
  bossIntro(m) {
    if (this.time - (m.introAt || -1e9) < 120) return;
    m.introAt = this.time; m.pauseUntil = this.time + 2.4; m.windup = 0; m.cd = {};
    this.ev(m.x, m.y, ['cine', 'boss', m.id, m.type]);
    for (const p of this.players.values()) if (p.room === m.room && dist(p, m) < 360) p.invulnUntil = Math.max(p.invulnUntil, this.time + 2.4);
  }
  tele(x, y, r, dur, dmg, src, style = 0) {
    this.teles.push({ x, y, r, at: this.time + dur, dmg, src });
    this.ev(x, y, ['tele', Math.round(x), Math.round(y), r, dur, style]);
  }
  lineTele(x0, y0, x1, y1, w, dur, dmg, src, style = 0) {
    if (dmg) this.lteles.push({ x0, y0, x1, y1, w, at: this.time + dur, dmg, src });
    this.ev(x0, y0, ['teleL', Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), w, dur, style]);
  }
  // ------------------------------------------------------------ le Volcan de Cendrelune : éruptions
  // Tant que des pirates foulent l'île, la montagne se réveille de temps en temps : elle tremble,
  // crache des bombes de lave (annoncées au sol) pendant une vingtaine de secondes, puis se rendort.
  updateVolcano() {
    const V = this.world.volcano, E = this.erupt, t = this.time;
    if (!V) return;
    const here = [];
    for (const p of this.players.values()) if (!p.dead && p.room === -1 && !p.boat && p.zone === Z.VOLCAN) here.push(p);
    if (t < E.until) { // l'éruption bat son plein
      for (const p of here) E.who.add(p);
      if (t >= E.bombAt) {
        E.bombAt = t + rand(0.35, 0.6);
        for (const p of here) if (Math.random() < 0.8) this.lavaBomb(p.x + rand(-80, 80), p.y + rand(-60, 60));
        const a = Math.random() * Math.PI * 2, e = rand(0.98, 1.6); // et un peu partout autour du cône
        this.lavaBomb(V.cx + Math.cos(a) * V.rx * e, V.cy + Math.sin(a) * V.ry * e);
      }
      return;
    }
    if (E.who.size) { // c'est fini : ceux qui sont restés debout sur l'île l'ont bien mérité
      for (const p of E.who) if (!p.dead && p.zone === Z.VOLCAN && this.players.has(p.id)) { this.unlock(p, 'eruption'); this.toast(p, 'Le volcan se calme… pour l’instant.', 'info'); }
      E.who.clear();
    }
    if (!here.length) return;
    if (!E.nextAt || E.nextAt < t - 600) E.nextAt = t + rand(25, 45); // on arrive : il grondera bientôt
    if (t < E.nextAt) return;
    E.until = t + 22; E.bombAt = t + 2.5; E.nextAt = E.until + rand(80, 130);
    for (const p of here) {
      E.who.add(p);
      this.send(p, { t: 'erupt', dur: 22 });
      this.send(p, { t: 'chat', from: null, lvl: 0, m: '🌋 Le Volcan de Cendrelune entre en éruption ! Fuyez les bombes de lave !', kind: 'boss', pid: 0 });
    }
  }
  // une bombe de lave : un cercle au sol, la bombe qui vole depuis le cratère, puis l'impact
  lavaBomb(x, y) {
    if (zoneAt(this.world, x, y) !== Z.VOLCAN || !canStand(this.world, x, y)) return;
    const dur = rand(1.5, 2.1);
    this.tele(x, y, 24, dur, 34, LAVA_BOMB, 3);
    this.ev(x, y, ['lavabomb', Math.round(x), Math.round(y), +dur.toFixed(2)]);
  }
  // les cibles d'un boss : les pirates proches, dans la même pièce
  bossTargets(m, r) { return [...this.players.values()].filter((p) => !p.dead && !SAFE.has(p.zone) && p.room === m.room && dist(p, m) < r); }
  summonAdds(m, t, type, n, max, line) {
    m.adds = m.adds.filter((a) => a.state !== 'dead' && this.mobs.includes(a));
    if (m.adds.length >= max) return;
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const x = m.x + Math.cos(a) * 28, y = m.y + Math.sin(a) * 22;
      if (!canStand(this.world, x, y, true) || roomIdAt(this.world, x, y) !== m.room) continue;
      const add = this.addMob(type, x, y, true);
      add.state = 'chase'; add.target = t.id; add.sx = m.sx; add.sy = m.sy;
      m.adds.push(add);
      this.ev(x, y, ['fx', 'summon', x, y]);
    }
    if (line) this.ev(m.x, m.y, ['shout', m.id, line]);
  }
  // charge en ligne droite, annoncée par une bande au sol
  startDash(m, t, len, speed, dmg, warn = 0.8) {
    const a = Math.atan2(t.y - m.y, t.x - m.x);
    const x1 = m.x + Math.cos(a) * len, y1 = m.y + Math.sin(a) * len;
    this.lineTele(m.x, m.y, x1, y1, m.def.r * 2 + 6, warn, 0, m, 1);
    m.dash = { at: this.time + warn, until: this.time + warn + len / speed, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg, hit: new Set() };
    m.windup = 0; m.dir = dirOf(t.x - m.x, t.y - m.y);
    this.ev(m.x, m.y, ['dash', m.id, +a.toFixed(2), warn]);
  }
  updateDash(m) {
    const D = m.dash;
    if (this.time < D.at) { m.moving = false; return; }
    if (this.time >= D.until) { m.dash = null; m.moving = false; return; }
    const [nx, ny] = moveWithCollision(this.world, m.x, m.y, D.vx * DT, D.vy * DT, true);
    if (Math.abs(nx - m.x) + Math.abs(ny - m.y) < 0.2) { m.dash = null; m.moving = false; return; }
    m.x = nx; m.y = ny; m.moving = true; m.dir = dirOf(D.vx, D.vy);
    for (const p of this.players.values()) {
      if (p.dead || SAFE.has(p.zone) || p.room !== m.room || D.hit.has(p.id) || Math.hypot(p.x - m.x, p.y - m.y) > m.def.r + 10) continue;
      D.hit.add(p.id); this.damagePlayer(p, D.dmg, m);
    }
  }
  updateLeap(m) {
    const L = m.leap, k = Math.min(1, (this.time - L.at) / (L.until - L.at));
    m.x = L.x0 + (L.x1 - L.x0) * k; m.y = L.y0 + (L.y1 - L.y0) * k; m.moving = true;
    if (k >= 1) { m.leap = null; m.moving = false; m.pauseUntil = this.time + 0.35; }
  }
  bossAI(m, t) {
    const def = m.def, ph = def.phases || [], now = this.time;
    if (m.phase < ph.length && m.hp < m.maxHp * ph[m.phase]) {
      m.phase++;
      m.windup = 0; m.pauseUntil = now + 1.2;
      this.ev(m.x, m.y, ['phase', m.id, m.phase]);
      const line = BOSS_LINES[def.ai] && BOSS_LINES[def.ai][m.phase];
      if (line) this.ev(m.x, m.y, ['shout', m.id, line]);
      if (def.ai === 'goule' && m.phase === 2) m.frenzy = 1;
      return;
    }
    if (m.windup) return;
    // une capacité n'est prête qu'après la moitié de son temps de recharge au début du combat
    const ready = (k, s) => { if (m.cd[k] == null) { m.cd[k] = now + s * 0.5; return false; } if (m.cd[k] > now) return false; m.cd[k] = now + s; return true; };
    const P = m.phase;
    switch (def.ai) {
      case 'cendre': { // Capitaine Barbe-Cendre
        if (ready('sum', P >= 2 ? 10 : 15)) this.summonAdds(m, t, 'zsailor', 2, 4, 'À moi, mes morts !');
        if (P >= 1 && ready('vol', 8)) {
          for (const p of this.bossTargets(m, 260)) for (let k = 0; k < 2; k++) this.tele(p.x + rand(-28, 28) * k, p.y + rand(-20, 20) * k, 26, 1.3, 34, m, 2);
          this.ev(m.x, m.y, ['shout', m.id, 'Feu à volonté !']);
        } else if (P >= 1 && ready('dash', 9)) { this.startDash(m, t, 150, 270, 32); this.ev(m.x, m.y, ['shout', m.id, 'À l’abordage !']); }
        else if (P >= 2 && ready('ring', 11)) { // cercles de cendre
          for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 52, m.y + Math.sin(a) * 40, 20, 0.9, 30, m, 3); }
          for (let k = 0; k < 9; k++) { const a = (k + 0.5) / 9 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 100, m.y + Math.sin(a) * 76, 22, 1.6, 30, m, 3); }
          m.pauseUntil = now + 0.9;
          this.ev(m.x, m.y, ['shout', m.id, 'Que la cendre vous recouvre !']);
        }
        break;
      }
      case 'roi': { // Roi des Os
        if (ready('spk', P >= 2 ? 4 : 6)) {
          for (const p of this.bossTargets(m, 230)) { this.tele(p.x, p.y, 18, 1.0, 28, m, 4); for (let k = 0; k < 2; k++) this.tele(p.x + rand(-30, 30), p.y + rand(-22, 22), 18, 1.0 + k * 0.25, 28, m, 4); }
          this.ev(m.x, m.y, ['fx', 'bones', m.x, m.y]);
        } else if (P >= 1 && ready('rise', 14)) this.summonAdds(m, t, 'skelgun', 2, 3, 'Levez-vous, canonniers !');
        else if (P >= 2 && ready('storm', 7)) {
          m.pauseUntil = now + 1.4;
          this.ev(m.x, m.y, ['shout', m.id, 'Tempête d’os !']);
          for (let w = 0; w < 2; w++) this.later(0.5 + w * 0.6, () => {
            if (m.state === 'dead') return;
            this.ev(m.x, m.y, ['atk', m.id, 0, 2]);
            for (let k = 0; k < 12; k++) this.spawnProj(m.x, m.y - 10, (k + w * 0.5) / 12 * Math.PI * 2, 120, 210, 20, 'm', m.id, 'bone', 0);
          });
        }
        break;
      }
      case 'crabe': { // Crabe-Roi
        if (P >= 1 && ready('shell', 11)) { // carapace puis onde de choc
          m.shieldUntil = now + 3; m.pauseUntil = now + 3;
          this.ev(m.x, m.y, ['shield', m.id, 3]);
          this.tele(m.x, m.y, 66, 3, 22, m, 5);
        } else if (ready('dash', P >= 1 ? 5 : 7)) this.startDash(m, t, 130, 240, 18, 0.7);
        break;
      }
      case 'goule': { // Goule Alpha
        if (ready('leap', P >= 2 ? 4.5 : 7)) {
          const tx = t.x, ty = t.y;
          if (canStand(this.world, tx, ty, true) && roomIdAt(this.world, tx, ty) === m.room && dist(m, t) > 30) {
            m.leap = { x0: m.x, y0: m.y, x1: tx, y1: ty, at: now, until: now + 0.9 };
            this.tele(tx, ty, 30, 0.9, 26, m, 6);
            this.ev(m.x, m.y, ['leap', m.id, Math.round(tx), Math.round(ty), 0.9]);
          }
        } else if (P >= 1 && ready('howl', 15)) { this.ev(m.x, m.y, ['howl', m.id]); this.summonAdds(m, t, 'ghoul', 2, 3, 'AOUUUUH !'); m.pauseUntil = now + 0.8; }
        break;
      }
      case 'bourreau': { // Le Bourreau
        const cleave = (a, dmg) => { for (const [d, r, o] of [[22, 22, 0], [42, 26, 0], [34, 20, 0.55], [34, 20, -0.55]]) this.tele(m.x + Math.cos(a + o) * d, m.y + Math.sin(a + o) * d * 0.8, r, 0.9, dmg, m, 1); };
        if (P >= 1 && ready('sum', 15)) this.summonAdds(m, t, 'pendu', 2, 3, 'Que la sentence soit exécutée !');
        else if (P >= 2 && ready('spin', 11)) {
          this.ev(m.x, m.y, ['shout', m.id, 'À genoux, tous !']);
          this.startDash(m, t, 130, 280, 40, 0.7);
          for (const k of [1, 2]) this.later(k * 1.25, () => { const q = this.players.get(m.target); if (m.state !== 'dead' && q && !q.dead) this.startDash(m, q, 130, 280, 40, 0.55); });
        } else if (ready('cleave', 6)) { cleave(Math.atan2(t.y - m.y, t.x - m.x), 42); m.pauseUntil = now + 0.9; }
        else if (P >= 1 && ready('rope', 9)) { const a = Math.atan2(t.y - m.y, t.x - m.x); this.lineTele(m.x, m.y - 6, m.x + Math.cos(a) * 180, m.y - 6 + Math.sin(a) * 180, 22, 0.9, 34, m, 2); this.ev(m.x, m.y, ['shout', m.id, 'La corde !']); }
        break;
      }
      case 'sirene': { // La Reine des Sirènes
        if (ready('song', 8)) { for (const p of this.bossTargets(m, 280)) this.tele(p.x, p.y, 30, 1.2, 30, m, 9); this.ev(m.x, m.y, ['shout', m.id, '♪ Viens... viens sous les flots... ♪']); }
        else if (P >= 1 && ready('tide', 13)) {
          this.summonAdds(m, t, 'sirene', 2, 3, 'Mes sœurs, chantez !');
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 70, m.y + Math.sin(a) * 56, 22, 1.3, 30, m, 7); }
        }
        break;
      }
      case 'general': { // Le Général d'Os
        const S = m.def.shouts || {}; // 0.8 : le Roi sans Couronne reprend la tactique, avec sa propre garde
        if (ready('sum', 14)) this.summonAdds(m, t, m.def.adds || 'legionnaire', 2, 4, S.sum || 'Légion ! En rang !');
        else if (ready('line', 7)) {
          const a = Math.atan2(t.y - m.y, t.x - m.x), nx = -Math.sin(a), ny = Math.cos(a);
          for (const o of [-26, 0, 26]) this.lineTele(m.x + nx * o, m.y + ny * o, m.x + nx * o + Math.cos(a) * 200, m.y + ny * o + Math.sin(a) * 200, 18, 1.0, 34, m, 4);
          this.ev(m.x, m.y, ['shout', m.id, S.line || 'Lances, en avant !']);
        } else if (P >= 1 && ready('charge', 9)) { this.startDash(m, t, 170, 260, 38); this.ev(m.x, m.y, ['shout', m.id, S.charge || 'Chargez !']); }
        else if (P >= 2 && ready('volley', 10)) {
          for (const p of this.bossTargets(m, 300)) for (let k = 0; k < 5; k++) this.tele(p.x + rand(-50, 50), p.y + rand(-38, 38), 18, 1.2 + k * 0.1, 30, m, 4);
          this.ev(m.x, m.y, ['shout', m.id, S.volley || 'Archers ! Tirez !']);
        }
        break;
      }
      case 'corbeau': { // Le Docteur Corbeau
        if (ready('bomb', 5)) {
          const spots = [[t.x, t.y], [t.x + rand(-40, 40), t.y + rand(-30, 30)], [t.x + rand(-40, 40), t.y + rand(-30, 30)]];
          for (const [x, y] of spots) { this.tele(x, y, 24, 1.1, 32, m, 6); this.later(1.1, () => { if (m.state !== 'dead') this.addCloud(x, y, 26, 4, 12); }); }
          this.ev(m.x, m.y, ['atk', m.id, +Math.atan2(t.y - m.y, t.x - m.x).toFixed(2), 2]);
        } else if (P >= 1 && ready('crows', 8)) {
          this.ev(m.x, m.y, ['shout', m.id, 'Mes petits, à table !']);
          for (let k = 0; k < 12; k++) this.spawnProj(m.x, m.y - 12, k / 12 * Math.PI * 2, 130, 220, 26, 'm', m.id, 'crow', 0);
        } else if (ready('sum', 15)) this.summonAdds(m, t, 'pestifere', 2, 3, 'Levez-vous, mes patients !');
        else if (P >= 2 && ready('blink', 7)) {
          for (let k = 0; k < 10; k++) {
            const a = Math.random() * Math.PI * 2, x = t.x + Math.cos(a) * rand(60, 90), y = t.y + Math.sin(a) * rand(50, 70);
            if (!canStand(this.world, x, y, true) || roomIdAt(this.world, x, y) !== m.room) continue;
            this.ev(m.x, m.y, ['fx', 'blink', m.x, m.y]); m.x = x; m.y = y; this.ev(x, y, ['fx', 'blink', x, y]);
            this.tele(t.x, t.y, 30, 1.0, 36, m, 6); m.pauseUntil = now + 0.6;
            break;
          }
        }
        break;
      }
      case 'brasier': { // Le Brasier
        if (ready('erupt', 6)) { for (const p of this.bossTargets(m, 300)) { this.tele(p.x, p.y, 26, 1.0, 44, m, 3); this.tele(p.x + rand(-50, 50), p.y + rand(-40, 40), 24, 1.3, 40, m, 3); } }
        else if (ready('wave', 9)) {
          const a0 = Math.random() * Math.PI / 2;
          for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; this.lineTele(m.x, m.y, m.x + Math.cos(a) * 220, m.y + Math.sin(a) * 220, 28, 1.2, 46, m, 1); }
          m.pauseUntil = now + 1.2; this.ev(m.x, m.y, ['shout', m.id, 'BRÛLEZ !']);
        } else if (P >= 1 && ready('meteor', 11)) { for (let k = 0; k < 9; k++) this.tele(m.x + rand(-160, 160), m.y + rand(-120, 120), 24, 1.4 + k * 0.08, 42, m, 3); this.ev(m.x, m.y, ['roar', m.id]); }
        else if (P >= 2 && ready('ring', 12)) {
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 80, m.y + Math.sin(a) * 62, 22, 1.2, 44, m, 3); }
          this.summonAdds(m, t, 'calcine', 2, 3, 'Que la cendre vous engloutisse !');
        }
        break;
      }
      case 'frere': { // Fer et Rouille : côte à côte, invulnérables
        const tw = m.twinRef;
        if (tw && tw.state !== 'dead' && tw.target === m.target && ready('swap', 2.5)) { const other = this.bossTargets(m, def.aggro).find((p) => p.id !== tw.target); if (other) m.target = other.id; }
        if (def.twin === 'frere_rouille' ? ready('slam', 6) : ready('chain', 7)) {
          if (def.twin === 'frere_rouille') { this.tele(t.x, t.y, 30, 1.0, 38, m, 5); this.ev(m.x, m.y, ['atk', m.id, 0, 2]); }
          else { const a = Math.atan2(t.y - m.y, t.x - m.x); this.lineTele(m.x, m.y - 6, m.x + Math.cos(a) * 170, m.y - 6 + Math.sin(a) * 170, 22, 0.9, 34, m, 2); }
        }
        if (P >= 1 && !m.frenzy) { m.frenzy = 1; this.ev(m.x, m.y, ['shout', m.id, 'Tu vas payer pour mon frère !']); }
        break;
      }
      case 'vespere': { // Vespère, Comte des Marées
        if (ready('blood', 6)) {
          for (const p of this.bossTargets(m, 320)) { const a = Math.atan2(p.y - m.y, p.x - m.x); this.lineTele(m.x, m.y, m.x + Math.cos(a) * 280, m.y + Math.sin(a) * 280, 34, 1.1, 74, m, 10); }
          this.ev(m.x, m.y, ['shout', m.id, 'La marée de sang monte !']);
        } else if (ready('sum', 16)) this.summonAdds(m, t, 'damne', 2, 3, 'Mes damnés, levez-vous !');
        else if (P >= 1 && ready('tide', 14)) {
          this.ev(m.x, m.y, ['pull', Math.round(m.x), Math.round(m.y), 240, 62, 4]);
          for (const q of this.bossTargets(m, 240)) q.pullUntil = now + 4.5;
          for (let k = 1; k <= 4; k++) this.later(k, () => { if (m.state !== 'dead') for (const q of this.bossTargets(m, 64)) this.damagePlayer(q, 55, m); });
          m.pauseUntil = now + 4;
        } else if (P >= 2 && ready('blink', 8)) {
          const a = Math.atan2(m.y - t.y, m.x - t.x) + Math.PI, x = t.x + Math.cos(a) * 40, y = t.y + Math.sin(a) * 32;
          if (canStand(this.world, x, y, true) && roomIdAt(this.world, x, y) === m.room) {
            this.ev(m.x, m.y, ['fx', 'blink', m.x, m.y]); m.x = x; m.y = y; this.ev(x, y, ['fx', 'blink', x, y]);
            const b = Math.atan2(t.y - y, t.x - x);
            for (const [d, r, o] of [[24, 24, 0], [46, 28, 0], [36, 22, 0.6], [36, 22, -0.6]]) this.tele(x + Math.cos(b + o) * d, y + Math.sin(b + o) * d * 0.8, r, 0.8, 84, m, 10);
            m.pauseUntil = now + 0.8;
          }
        } else if (P >= 3 && ready('storm', 10)) {
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 60, m.y + Math.sin(a) * 46, 22, 1.0, 70, m, 10); this.tele(m.x + Math.cos(a + 0.4) * 120, m.y + Math.sin(a + 0.4) * 92, 24, 1.6, 70, m, 10); }
          for (let k = 0; k < 16; k++) this.spawnProj(m.x, m.y - 12, k / 16 * Math.PI * 2, 140, 260, 60, 'm', m.id, 'curse', 0);
          this.ev(m.x, m.y, ['roar', m.id]);
        }
        break;
      }
      case 'amiral': { // 1.0 : l'Amiral Englouti — geysers, ruées, son équipage, et la marée qui monte
        if (ready('gey', P >= 2 ? 4 : 6)) { for (const p of this.bossTargets(m, 240)) { this.tele(p.x, p.y, 22, 1.1, 30, m, 7); this.tele(p.x + rand(-30, 30), p.y + rand(-24, 24), 20, 1.4, 26, m, 7); } }
        else if (P >= 1 && ready('wave', 11)) { const a = Math.atan2(t.y - m.y, t.x - m.x); this.lineTele(m.x, m.y - 6, m.x + Math.cos(a) * 180, m.y - 6 + Math.sin(a) * 180, 26, 0.9, 36, m, 2); this.ev(m.x, m.y, ['shout', m.id, 'Par le fond !']); m.pauseUntil = now + 1.0; }
        else if (P >= 1 && ready('sum', 16)) this.summonAdds(m, t, 'naufrageur', 2, 3, 'Équipage, à vos postes !');
        break;
      }
      case 'flamme': { // 1.0 : l'Âme du Père Anselme — le feu qui chasse les morts brûle aussi les vivants
        if (ready('ring', 6)) {
          for (const p of this.bossTargets(m, 260)) { this.tele(p.x, p.y, 26, 1.2, 40, m, 3); this.tele(p.x + rand(-40, 40), p.y + rand(-30, 30), 20, 1.5, 32, m, 3); }
          this.ev(m.x, m.y, ['shout', m.id, 'Brûlez, et reposez en paix !']);
        } else if (P >= 1 && ready('nova', 11)) {
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 64, m.y + Math.sin(a) * 50, 22, 1.4, 38, m, 3); }
          for (let k = 0; k < 14; k++) { const a = (k + 0.5) / 14 * Math.PI * 2; this.tele(m.x + Math.cos(a) * 118, m.y + Math.sin(a) * 90, 22, 2.0, 34, m, 3); }
          this.ev(m.x, m.y, ['shout', m.id, 'La Flamme ne s’éteindra jamais !']); m.pauseUntil = now + 1.2;
        } else if (P >= 2 && ready('sum', 18)) this.summonAdds(m, t, 'calcine', 2, 3, 'Mes ouailles, debout !');
        break;
      }
      case 'noye': { // Capitaine Noyé
        if (ready('gey', 6)) {
          for (const p of this.bossTargets(m, 240)) { this.tele(p.x, p.y, 22, 1.1, 26, m, 7); for (let k = 0; k < 2; k++) this.tele(p.x + rand(-34, 34), p.y + rand(-26, 26), 22, 1.3, 26, m, 7); }
        } else if (P >= 1 && ready('anchor', 9)) {
          const a = Math.atan2(t.y - m.y, t.x - m.x);
          this.lineTele(m.x, m.y - 6, m.x + Math.cos(a) * 170, m.y - 6 + Math.sin(a) * 170, 24, 0.9, 34, m, 2);
          this.ev(m.x, m.y, ['shout', m.id, 'Par le fond !']);
          m.pauseUntil = now + 1.0;
        } else if (P >= 1 && ready('sum', 16)) this.summonAdds(m, t, 'drowned', 2, 3, 'L’équipage, à moi !');
        break;
      }
    }
  }
  // ------------------------------------------------------------ le Kraken
  seaPoint(cx, cy, r) {
    for (let k = 0; k < 24; k++) { const a = Math.random() * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.85; if (canSail(this.world, x, y)) return [x, y]; }
    return [cx + r, cy];
  }
  blowConch(p, i) {
    if (!p.boat) return this.toast(p, 'Soufflez dans la conque à bord d’un navire.', 'warn');
    if (p.zone !== Z.GOUFFRE) return this.toast(p, 'Rien ne répond. Il faut être au-dessus du Gouffre du Kraken, au sud-est de Port-Lanterne.', 'warn');
    if (this.kraken) return this.toast(p, 'Le Kraken est déjà là !', 'warn');
    const s = p.inv[i]; s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
    this.startKraken(p);
  }
  startKraken(p) {
    const K = this.world.kraken, now = this.time;
    const a = Math.atan2(p.y - K.y, p.x - K.x);
    const sx = K.x + Math.cos(a) * 62, sy = K.y + Math.sin(a) * 52;
    const kr = this.kraken = { t0: now, mob: null, tents: [], parts: new Set([p.id]), emptySince: 0, phase: 0, mouette: null };
    // le Goéland d'Elouan ouvre la route... et paie le prix
    const goe = this.addAlly('Le Goéland', 'Capitaine Elouan', sx + Math.cos(a) * 70, sy + Math.sin(a) * 60);
    goe.path = { x: sx, y: sy, speed: 34 };
    for (const q of this.players.values()) if (q.room === -1 && Math.hypot(q.x - K.x, q.y - K.y) < 900) this.send(q, { t: 'cine', id: 'kraken', x: Math.round(K.x), y: Math.round(K.y), sx: Math.round(sx), sy: Math.round(sy) });
    this.broadcastAll({ t: 'kr', on: 1 });
    this.broadcastChat(null, `🐚 ${p.name} a soufflé dans la Conque des Abysses... Le Gouffre se met à bouillonner !`, 'boss');
    this.later(0.9, () => this.allyShout(goe, 'Le voilà ! Tenez-vous prêts !'));
    this.later(3.0, () => { goe.sink = 1; goe.ver++; goe.path = null; this.allyShout(goe, 'Il nous tient ! Abandonnez le navire !'); this.ev(goe.x, goe.y, ['sink', goe.id]); });
    this.later(5.2, () => this.removeAlly(goe));
    this.later(4.4, () => {
      if (this.kraken !== kr) return;
      const n = Math.max(1, [...this.players.values()].filter((q) => !q.dead && q.room === -1 && Math.hypot(q.x - K.x, q.y - K.y) < 600).length);
      const m = this.addMob('kraken', K.x, K.y, true);
      m.bossEvent = true; m.state = 'chase';
      m.hp = m.maxHp = Math.min(10000, 3500 + 2500 * (n - 1));
      m.pauseUntil = this.time + 2.6;
      kr.mob = m;
      this.ev(m.x, m.y, ['cine', 'krakenrise', m.id]);
    });
    this.later(6.2, () => { if (this.kraken === kr) for (let k = 0; k < 4; k++) this.spawnTentacle(kr, (k + 0.5) / 4 * Math.PI * 2 + rand(-0.3, 0.3)); });
    this.later(8.5, () => {
      if (this.kraken !== kr) return;
      const [mx, my] = this.seaPoint(K.x, K.y, 250);
      const mo = this.addAlly('La Mouette Écarlate', 'Capitaine Morgane', mx, my);
      const a0 = Math.atan2(my - K.y, mx - K.x);
      mo.path = { x: K.x + Math.cos(a0) * 140, y: K.y + Math.sin(a0) * 112, speed: 70 };
      mo.orbit = { r: 140, a: a0, speed: 0.2 }; mo.fireAt = this.time + 4;
      kr.mouette = mo;
      this.allyShout(mo, 'Tenez bon ! La Mouette Écarlate arrive !');
      this.later(3, () => this.allyShout(mo, 'Feu à volonté sur la bête !'));
    });
  }
  spawnTentacle(kr, a) {
    if (!kr.mob || kr.mob.state === 'dead') return;
    const K = this.world.kraken;
    for (let k = 0; k < 8; k++) {
      const r = rand(68, 98), x = K.x + Math.cos(a) * r, y = K.y + Math.sin(a) * r * 0.85;
      if (!canSail(this.world, x, y)) { a += 0.7; continue; }
      const t = this.addMob('tentacule', x, y, true);
      t.bossEvent = true; t.state = 'chase'; t.pauseUntil = this.time + 1.2;
      t.cd = { slam: this.time + rand(1.8, 3.6), grab: this.time + rand(4, 8) };
      kr.tents.push(t);
      this.ev(x, y, ['rise', t.id]);
      return t;
    }
    return null;
  }
  krakenTargets(r = 430) { const K = this.world.kraken; return [...this.players.values()].filter((p) => !p.dead && p.room === -1 && Math.hypot(p.x - K.x, p.y - K.y) < r); }
  krakenAI(m) {
    const kr = this.kraken, now = this.time;
    m.moving = false;
    if (!kr || kr.mob !== m) return;
    if (m.under) { if (now >= m.under) { m.under = 0; m.x = m.nx; m.y = m.ny; this.ev(m.x, m.y, ['emerge', m.id, Math.round(m.x), Math.round(m.y)]); } return; }
    if (m.pauseUntil > now) return;
    const ph = m.def.phases;
    if (m.phase < ph.length && m.hp < m.maxHp * ph[m.phase]) {
      m.phase++; kr.phase = m.phase; m.pauseUntil = now + 1.8;
      this.ev(m.x, m.y, ['phase', m.id, m.phase]);
      this.ev(m.x, m.y, ['roar', m.id]);
      if (kr.mouette) this.allyShout(kr.mouette, m.phase === 1 ? 'Il creuse un tourbillon ! Ne vous laissez pas aspirer !' : 'Il est furieux ! Gare aux vagues !');
      if (m.phase === 2) for (let k = 0; k < 2; k++) this.spawnTentacle(kr, Math.random() * Math.PI * 2);
      return;
    }
    const T = this.krakenTargets();
    if (!T.length) return;
    const ready = (k, s) => { if (m.cd[k] == null) { m.cd[k] = now + s * 0.5; return false; } if (m.cd[k] > now) return false; m.cd[k] = now + s; return true; };
    const P = m.phase, pick = () => T[Math.floor(Math.random() * T.length)];
    const close = T.filter((p) => Math.hypot(p.x - m.x, p.y - m.y) < 100);
    if (close.length && ready('bite', 3.5)) { for (const p of close) this.tele(p.x, p.y, 30, 0.8, 40, m, 8); this.ev(m.x, m.y, ['atk', m.id, 0, 2]); return; }
    if (ready('ink', P >= 2 ? 11 : 13)) {
      const p = pick();
      this.ev(m.x, m.y, ['ink', Math.round(p.x), Math.round(p.y), 130, 4.5, m.id]);
      for (const q of T) if (Math.hypot(q.x - p.x, q.y - p.y) < 130) q.inkUntil = now + 4.5;
      return;
    }
    if (P >= 1 && ready('pull', 14)) {
      this.ev(m.x, m.y, ['pull', Math.round(m.x), Math.round(m.y), 270, 70, 5]);
      this.whirl = { x: m.x, y: m.y, r: 270, v: 70, until: now + 5.5 }; // 1.1 : il aspire les navires
      for (const q of T) if (Math.hypot(q.x - m.x, q.y - m.y) < 270) q.pullUntil = now + 5.5;
      for (let k = 1; k <= 5; k++) this.later(k, () => { if (this.kraken === kr && m.state !== 'dead') for (const q of this.krakenTargets(70)) this.damagePlayer(q, 26, m); });
      return;
    }
    if (P >= 2 && ready('dive', 22)) {
      const [nx, ny] = this.seaPoint(this.world.kraken.x, this.world.kraken.y, rand(20, 55));
      m.under = now + 3; m.nx = nx; m.ny = ny;
      this.ev(m.x, m.y, ['dive', m.id, 3]);
      this.later(1.8, () => { if (m.state === 'dead') return; this.tele(nx, ny, 40, 1.2, 38, m, 8); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; this.tele(nx + Math.cos(a) * 74, ny + Math.sin(a) * 60, 20, 1.2, 30, m, 8); } });
      return;
    }
    if (P >= 2 && ready('wave', 10)) {
      const p = pick(), a = Math.atan2(p.y - m.y, p.x - m.x);
      this.lineTele(m.x, m.y, m.x + Math.cos(a) * 330, m.y + Math.sin(a) * 330, 46, 1.4, 42, m, 9);
      this.ev(m.x, m.y, ['roar', m.id]);
    }
  }
  tentacleAI(m) {
    const kr = this.kraken, now = this.time;
    m.moving = false;
    if (!kr) return;
    if (m.grab) {
      const q = this.players.get(m.grab.pid);
      if (!q || q.dead || now >= m.grab.until || m.grab.dmg >= 80) this.releaseGrab(m);
      else if (now >= m.grab.tick) { m.grab.tick = now + 1; this.damagePlayer(q, 12, m, false, 'g'); }
      return;
    }
    if (m.pauseUntil > now || (kr.mob && kr.mob.under > now)) return;
    const T = this.krakenTargets().filter((p) => Math.hypot(p.x - m.x, p.y - m.y) < 160);
    if (!T.length) return;
    T.sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
    const p = T[0], d = Math.hypot(p.x - m.x, p.y - m.y);
    if (kr.phase >= 1 && d < 64 && now >= m.cd.grab && now >= (p.grabbedUntil || 0)) {
      m.cd.grab = now + rand(10, 14);
      m.grab = { pid: p.id, until: now + 4, dmg: 0, tick: now + 1 };
      p.grabbedUntil = now + 4;
      this.ev(m.x, m.y, ['grab', m.id, p.id]);
      return;
    }
    if (now >= m.cd.slam) {
      m.cd.slam = now + rand(3.4, 5);
      const a = Math.atan2(p.y - m.y, p.x - m.x);
      this.lineTele(m.x, m.y, m.x + Math.cos(a) * 135, m.y + Math.sin(a) * 135, 28, 1.0, 30, m, 10);
      this.ev(m.x, m.y, ['slam', m.id, +a.toFixed(2), 1.0]);
    }
  }
  releaseGrab(m) {
    if (!m.grab) return;
    const q = this.players.get(m.grab.pid);
    if (q) q.grabbedUntil = 0;
    this.ev(m.x, m.y, ['ungrab', m.id, m.grab.pid]);
    m.grab = null;
  }
  allyHit(m, v) {
    if (!m || m.state === 'dead' || m.under) return;
    const nv = Math.min(v, Math.floor(m.hp - m.maxHp * 0.1));
    this.ev(m.x, m.y, ['boom', Math.round(m.x + rand(-14, 14)), Math.round(m.y - 6 + rand(-8, 8)), 16, 0]);
    if (nv <= 0) return;
    m.hp -= nv;
    this.ev(m.x, m.y, ['dmg', m.id, nv, 0, 0]);
  }
  addAlly(name, cap, x, y) { const a = { id: this.nextId++, name, cap, x, y, dir: 0, ver: 1, sink: 0, room: -1, moving: false }; this.allies.push(a); return a; }
  removeAlly(a) { const i = this.allies.indexOf(a); if (i >= 0) this.allies.splice(i, 1); }
  allyShout(a, text) { if (this.allies.includes(a)) this.ev(a.x, a.y, ['shout', a.id, text]); }
  updateAllies() {
    const K = this.world.kraken;
    for (const a of this.allies) {
      a.moving = false;
      if (a.sink) continue;
      if (a.path) {
        const dx = a.path.x - a.x, dy = a.path.y - a.y, d = Math.hypot(dx, dy);
        if (d > 1.5) { const s = Math.min(d, a.path.speed * DT); a.x += dx / d * s; a.y += dy / d * s; a.dir = dirOf(dx, dy); a.moving = true; } else a.path = null;
      } else if (a.orbit) {
        a.orbit.a += a.orbit.speed * DT;
        const nx = K.x + Math.cos(a.orbit.a) * a.orbit.r, ny = K.y + Math.sin(a.orbit.a) * a.orbit.r * 0.8;
        a.dir = dirOf(nx - a.x, ny - a.y); a.x = nx; a.y = ny; a.moving = true;
      }
      const kr = this.kraken;
      if (a.fireAt && kr && kr.mob && kr.mob.state !== 'dead' && !kr.mob.under && this.time >= a.fireAt) {
        a.fireAt = this.time + 5;
        const m = kr.mob, ang = Math.atan2(m.y - 8 - a.y, m.x - a.x), dd = Math.hypot(m.x - a.x, m.y - 8 - a.y);
        this.ev(a.x, a.y, ['proj', this.nextId++, Math.round(a.x), Math.round(a.y - 8), +ang.toFixed(3), 240, Math.round(dd), 'cball', a.id]);
        this.ev(a.x, a.y, ['atk', a.id, +ang.toFixed(2), 3]);
        this.later(dd / 240, () => this.allyHit(m, 40));
      }
    }
  }
  updateKraken() {
    const kr = this.kraken;
    if (!kr) return;
    const T = this.krakenTargets(480);
    for (const p of T) kr.parts.add(p.id);
    if (T.length) kr.emptySince = 0; else if (!kr.emptySince) kr.emptySince = this.time;
    if ((kr.emptySince && this.time - kr.emptySince > 30 && this.time - kr.t0 > 10) || this.time - kr.t0 > 900) this.endKraken(false);
  }
  endKraken(won) {
    const kr = this.kraken;
    if (!kr) return;
    this.kraken = null;
    for (const t of kr.tents) if (t.state !== 'dead') { this.releaseGrab(t); t.state = 'dead'; this.ev(t.x, t.y, ['die', t.id]); }
    const m = kr.mob;
    if (!won && m && m.state !== 'dead') {
      this.ev(m.x, m.y, ['dive', m.id, 2.5]);
      m.under = this.time + 99;
      this.later(2.5, () => { m.state = 'dead'; });
      this.broadcastChat(null, 'Le Kraken retourne dans les abysses... La mer garde son secret.', 'night');
    }
    const mo = kr.mouette;
    if (mo) {
      mo.orbit = null; mo.fireAt = 0;
      const [fx, fy] = this.seaPoint(this.world.kraken.x, this.world.kraken.y, 320);
      this.later(won ? 4 : 1, () => { mo.path = { x: fx, y: fy, speed: 55 }; });
      this.later(won ? 12 : 8, () => this.removeAlly(mo));
    }
    this.broadcastAll({ t: 'kr', on: 0 });
  }
  krakenDown(m) {
    const kr = this.kraken;
    const ids = new Set([...m.tags.keys(), ...(kr ? kr.parts : [])]);
    const heroes = [...ids].map((id) => this.players.get(id)).filter((q) => q && Math.hypot(q.x - m.x, q.y - m.y) < 700);
    this.ev(m.x, m.y, ['cine', 'krakendown', m.id, Math.round(m.x), Math.round(m.y)]);
    for (const q of heroes) this.unlock(q, 'kraken');
    const names = heroes.filter((q) => m.tags.has(q.id)).map((q) => q.name);
    this.broadcastChat(null, `🐙 ${names.join(', ') || 'Des pirates'} ${names.length > 1 ? 'ont' : 'a'} renvoyé le Kraken au fond des abysses !`, 'boss');
    if (kr && kr.mouette) this.allyShout(kr.mouette, 'Victoire ! La mer est à nous !');
    this.endKraken(true);
  }
  despawnAdds(m) {
    if (!m.adds || !m.adds.length) return;
    for (const a of m.adds) if (a.state !== 'dead') { a.state = 'dead'; this.ev(a.x, a.y, ['die', a.id]); }
    m.adds = [];
  }
  lineOfSight(x0, y0, x1, y1) {
    const d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 6);
    for (let i = 1; i < n; i++) { const t = i / n; if (blocksShot(this.world, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  }

  // ------------------------------------------------------------ combat
  dmgMul(p) { return this.time < p.cry ? 1.3 : 1; }
  // 1.0 : les boss et les grandes élites se renforcent selon le nombre de pirates engagés (+60 % de PV par pirate, jusqu'à six)
  bossLike(m) { const d = m.def; return (m.boss || (d.ai && !d.sea) || (d.elite && d.big)) && !m.bossEvent && !m.summoned && d.ai !== 'tentacle' && d.ai !== 'kraken'; }
  bossScale(m, n) {
    const f = 1 + 0.6 * (Math.min(6, n) - 1);
    if (f <= (m.scale || 1)) return;
    if (!m.scale) m.baseHp = m.maxHp;
    m.hp = Math.round(m.hp * f / (m.scale || 1)); m.maxHp = Math.round(m.baseHp * f); m.scale = f;
  }
  rollDamage(p, base) {
    const crit = Math.random() < p.stats.crit;
    const v = Math.max(1, Math.round(base * this.dmgMul(p) * rand(0.9, 1.1) * (crit ? 1.8 : 1)));
    return [v, crit];
  }
  damageMob(m, amount, p, crit, kx = 0, ky = 0, dot = 0) {
    if (m.state === 'dead' || m.under) return;
    if (m.linked) { // les Frères Ferrailleurs côte à côte : rien ne passe
      if (this.time - (m.immT || 0) > 0.6) { m.immT = this.time; this.ev(m.x, m.y, ['immune', m.id]); }
      if (m.state !== 'chase') { m.state = 'chase'; m.target = p.id; }
      return;
    }
    if (m.shieldUntil > this.time) amount = Math.max(1, Math.round(amount * 0.3));
    if (m.curseUntil > this.time) amount = Math.round(amount * m.curseMul);
    if (m.grab) m.grab.dmg += amount;
    if (!m.tags.has(p.id) && this.bossLike(m)) this.bossScale(m, m.tags.size + 1); // 1.0 : plus on est nombreux, plus il tient
    m.hp -= amount;
    m.tags.set(p.id, (m.tags.get(p.id) || 0) + amount);
    this.ev(m.x, m.y, dot ? ['dmg', m.id, amount, 0, p.id, dot] : ['dmg', m.id, amount, crit ? 1 : 0, p.id]);
    if (m.state !== 'chase') { m.state = 'chase'; m.target = p.id; }
    if (!m.boss && !m.def.ai && (kx || ky)) { const [nx, ny] = moveWithCollision(this.world, m.x, m.y, kx, ky, true); m.x = nx; m.y = ny; }
    if (m.hp <= 0) this.killMob(m, p);
  }
  killMob(m, killer, force = false) {
    m.state = 'dead'; m.hp = 0;
    m.deadUntil = this.time + respawnDelay(m.def) * rand(0.85, 1.15);
    this.ev(m.x, m.y, ['die', m.id]);
    const def = m.def;
    if (def.ai === 'frere' && !force) { // il faut abattre les deux frères presque en même temps
      const tw = this.mobs.find((o) => o !== m && o.type === def.twin && o.room === m.room);
      if (tw && tw.state !== 'dead') {
        m.fallen = this.time; m.deadUntil = Infinity;
        this.ev(tw.x, tw.y, ['shout', tw.id, 'Frangin ! Tiens bon, j’arrive !']);
        this.later(8, () => {
          if (m.state !== 'dead' || !m.fallen || tw.state === 'dead') return;
          m.fallen = 0; m.state = 'chase'; m.hp = Math.round(m.maxHp * 0.45); m.tags.clear(); m.target = tw.target; m.id = this.nextId++;
          this.ev(m.x, m.y, ['fx', 'rise', m.x, m.y]); this.ev(tw.x, tw.y, ['shout', tw.id, 'Debout, frangin ! On n’a pas fini !']);
        });
        return;
      }
      if (tw && tw.fallen) { // victoire : chaque pirate qui a frappé l'un des frères compte pour les deux
        for (const [pid] of tw.tags) if (!m.tags.has(pid)) m.tags.set(pid, 1);
        for (const [pid] of m.tags) if (!tw.tags.has(pid)) tw.tags.set(pid, 1);
        tw.fallen = 0; tw.deadUntil = this.time + respawnDelay(tw.def); this.killMob(tw, killer, true);
      }
    }
    if (def.plague && !m.summoned) this.addCloud(m.x, m.y, 30, 5, 10);
    if (def.ai && !def.sea) { this.despawnAdds(m); this.ev(m.x, m.y, ['cine', 'bossdown', m.id, m.type, Math.round(m.x), Math.round(m.y)]); }
    if (def.ai === 'kraken') this.krakenDown(m);
    if (def.ai === 'tentacle') {
      this.releaseGrab(m);
      const kr = this.kraken;
      if (kr) this.later(10, () => { if (this.kraken === kr && kr.tents.filter((t) => t.state !== 'dead').length < (kr.phase >= 2 ? 6 : 4)) this.spawnTentacle(kr, Math.random() * Math.PI * 2); });
    }
    if (m.boss) {
      this.despawnAdds(m);
      const names = [...m.tags.keys()].map((id) => this.players.get(id)).filter(Boolean).map((p) => p.name);
      this.broadcastChat(null, `⚔ ${names.join(', ')} ${names.length > 1 ? 'ont' : 'a'} vaincu le Capitaine Barbe-Cendre ! La marée recule...`, 'boss');
    }
    if (def.elite && !m.event && !def.sea) this.broadcastChat(null, `⚔ ${killer.name} a terrassé ${def.name} !`, 'boss');
    if (m.type === 'roi_squelette') for (const pid of m.tags.keys()) { const q = this.players.get(pid); if (q) this.unlock(q, 'roi_os'); }
    if (m.summoned && !m.event && !m.bossEvent && !m.horde) return;
    let top = killer, topD = 0;
    const tags = this.expandTags(m); // 1.0 : le groupe proche partage l'expérience et les objectifs (+10 % par compagnon)
    for (const [pid, d] of tags) {
      const p = this.players.get(pid);
      if (!p || p.dead || dist(p, m) > 700) continue;
      if (d > topD) { topD = d; top = p; }
      const diff = p.level - def.level;
      const xp = Math.max(1, Math.round(def.xp * (diff > 3 ? Math.max(0.15, 1 - (diff - 3) * 0.25) : 1) * ((m.gbonus && m.gbonus.get(pid)) || 1)));
      this.giveXp(p, xp);
      p.kills++;
      this.questKill(p, m.type);
      p.kc[m.type] = (p.kc[m.type] || 0) + 1; p.dirtyCodex = true;
      if (m.boss || (def.elite && def.big)) p.st.boss++;
      this.unlock(p, 'premier_sang');
      if (m.type === 'crab' && ++p.cnt.crab >= 50) this.unlock(p, 'crabes');
      if (p.kills >= 250) this.unlock(p, 'faucheur');
      if (def.elite) this.unlock(p, 'elite');
      if (m.horde && ++p.cnt.horde >= 30) this.unlock(p, 'horde');
      if (def.level >= p.level - 5) this.addRep(p, this.placeAt(m.x, m.y), m.boss || def.elite ? 10 : 1); // 1.0 : la région vous en sait gré
      if (def.ship && ++p.cnt.ships >= 10) this.unlock(p, 'naufrageur');
      if (m.boss) this.unlock(p, 'boss');
    }
    if (m.event || m.horde) { if (Math.random() < 0.5) this.spawnDrop(m.x, m.y, 'or', Math.round(rand(def.gold[0], def.gold[1]) / 2), top.id); if (!def.elite) return; }
    // butin — 1.0 : contre un boss ou une élite, chaque pirate qui a vraiment pris part au combat a son propre butin
    const [g0, g1] = def.gold;
    const personal = this.bossLike(m) || !!def.elite;
    const winners = personal ? [...tags.keys()].map((id) => this.players.get(id)).filter((q) => q && !q.dead && dist(q, m) <= 700 && ((m.tags.get(q.id) || 0) >= m.maxHp * 0.03 || (m.gbonus && m.gbonus.has(q.id)))) : [];
    if (!winners.length && top) winners.push(top);
    const share = winners.length > 1 ? 0.7 : 1;
    for (const w of winners) {
      const midas = w.eq && ITEMS[w.eq.weapon] && ITEMS[w.eq.weapon].midas ? 0.5 : 0;
      const gold = Math.round(rand(g0, g1) * share * (1 + (w.stats ? w.stats.goldFind || 0 : 0) + midas));
      if (gold > 0) this.spawnDrop(m.x + (winners.length > 1 ? rand(-8, 8) : 0), m.y, 'or', gold, w.id);
      for (const [item, ch, a, b] of def.loot) if (ITEMS[item] && !ITEMS[item].quest && Math.random() < ch) this.spawnDrop(m.x + (winners.length > 1 ? rand(-10, 10) : 0), m.y, item, Math.round(rand(a, b)), w.id);
    }
    for (const [item, ch, a, b] of def.loot) {
      if (!ITEMS[item]) continue;
      if (ITEMS[item].quest) { // objet de quête : seulement pour un pirate qui en réclame encore (en comptant ce qui l'attend au sol)
        const owed = (q) => { let n = this.questNeeds(q, item); for (const d of this.drops.values()) if (d.item === item && d.owner === q.id) n -= d.n; return n; };
        const who = [top, ...[...m.tags.keys()].map((id) => this.players.get(id))].find((q) => q && !q.dead && owed(q) > 0);
        if (who && Math.random() < Math.min(1, ch * 1.4)) this.spawnDrop(m.x, m.y, item, Math.min(owed(who), Math.max(1, Math.round(rand(a, b)))), who.id);
      }
    }
  }
  // combien d'exemplaires de cet objet les quêtes en cours réclament-elles encore ?
  questNeeds(p, item) {
    let need = 0;
    for (const [qid, st] of Object.entries(p.quests)) {
      if (st.s !== 'active' || !QUESTS[qid]) continue;
      for (const g of QUESTS[qid].goals) if (g.type === 'collect' && g.item === item) need += g.n;
    }
    return Math.max(0, need - this.countItem(p, item));
  }
  // ---- effets des armes : saignement (b), brûlure (f), vol de vie
  addDot(t, kind, total, src, dur = 3, stack = 1) {
    if (!t || total < 1 || t.dead || t.state === 'dead') return;
    const same = (t.dots || []).filter((d) => d.kind === kind && d.src === src.id);
    const drop = same.slice(0, Math.max(0, same.length - stack + 1));
    t.dots = (t.dots || []).filter((d) => !drop.includes(d));
    t.dots.push({ kind, left: total, dps: total / dur, src: src.id });
  }
  hitEffects(p, t, v, fx, chained = false) {
    if (fx.bleed) this.addDot(t, 'b', v * fx.bleed, p);
    if (fx.burn) this.addDot(t, 'f', v * fx.burn, p);
    if (fx.poison) this.addDot(t, 'p', v * fx.poison, p, 4, 3); // le poison se cumule (trois doses)
    const leech = (fx.leech || 0) + (p.stats.leech || 0);
    if (leech && !p.dead) { const h = Math.min(p.stats.maxHp - p.hp, v * leech); if (h >= 1) { p.hp += h; p.dirtyMe = true; } }
    if (!t.def || t.state === 'dead') return; // les effets qui suivent ne touchent que les morts
    const T = this.time, big = !!(t.boss || t.def.ai || t.def.elite);
    if (fx.slow) { t.slowUntil = T + fx.slow[1]; t.slowMul = Math.max(big ? 0.75 : 0, 1 - fx.slow[0]); this.ev(t.x, t.y, ['cc', t.id, 's', fx.slow[1]]); }
    if (fx.frost) { t.slowUntil = t.frostUntil = T + fx.frost[1]; t.slowMul = Math.max(big ? 0.7 : 0, 1 - fx.frost[0]); this.ev(t.x, t.y, ['cc', t.id, 'g', fx.frost[1]]); }
    if (fx.stun && !big && Math.random() < fx.stun[0]) { t.stunUntil = T + fx.stun[1]; t.windup = 0; this.ev(t.x, t.y, ['cc', t.id, 'e', fx.stun[1]]); }
    if (fx.fear && !big && Math.random() < fx.fear[0]) { t.fearUntil = T + fx.fear[1]; t.fearX = p.x; t.fearY = p.y; t.windup = 0; this.ev(t.x, t.y, ['cc', t.id, 'f', fx.fear[1]]); }
    const curse = fx.curse || (p.stats.curseOnHit && Math.random() < p.stats.curseOnHit ? [3, 0.2] : null);
    if (curse) { t.curseUntil = T + curse[0]; t.curseMul = 1 + curse[1]; this.ev(t.x, t.y, ['cc', t.id, 'm', curse[0]]); }
    if (fx.midas && Math.random() < fx.midas) this.spawnDrop(t.x, t.y, 'or', Math.max(1, Math.round(v / 4)), p.id);
    if (fx.chain && !chained) this.chainZap(p, t, v, fx.chain[0], fx.chain[1]);
    if (fx.pull && !big) this.pullMob(p, t);
  }
  // la foudre saute d'un mort à l'autre
  chainZap(p, t, v, jumps, part) {
    let from = t; const hit = new Set([t.id]);
    for (let k = 0; k < jumps; k++) {
      let best = null, bd = 80;
      for (const m of this.mobs) { if (m.state === 'dead' || hit.has(m.id) || m.room !== from.room || m.under) continue; const d = Math.hypot(m.x - from.x, m.y - from.y); if (d < bd) { bd = d; best = m; } }
      if (!best) break;
      hit.add(best.id);
      this.ev(from.x, from.y, ['zap', Math.round(from.x), Math.round(from.y - 10), Math.round(best.x), Math.round(best.y - 10)]);
      this.damageMob(best, Math.max(1, Math.round(v * part)), p, false, 0, 0);
      from = best;
    }
  }
  // le grappin ramène la cible jusqu'à vous
  pullMob(p, t) {
    const a = Math.atan2(p.y - t.y, p.x - t.x), d = Math.hypot(p.x - t.x, p.y - t.y);
    if (d < 30) return;
    const [nx, ny] = moveWithCollision(this.world, t.x, t.y, Math.cos(a) * (d - 22), Math.sin(a) * (d - 22), true);
    this.ev(t.x, t.y, ['hookfx', Math.round(p.x), Math.round(p.y - 9), Math.round(t.x), Math.round(t.y - 9)]);
    t.x = nx; t.y = ny; t.stunUntil = Math.max(t.stunUntil || 0, this.time + 0.5); t.windup = 0;
  }
  updateDots() {
    const tick = (t, isMob) => {
      if (!t.dots || !t.dots.length) return;
      for (const d of t.dots) {
        const v = Math.min(d.left, d.dps * 0.5);
        d.left -= v;
        const src = this.players.get(d.src);
        if (isMob) { if (src && t.state !== 'dead') this.damageMob(t, Math.max(1, Math.round(v)), src, false, 0, 0, d.kind); }
        else if (!t.dead && !SAFE.has(t.zone) && !(src && src !== t && !this.canPvp(src, t))) this.damagePlayer(t, v, src || null, false, d.kind);
      }
      t.dots = t.dots.filter((d) => d.left >= 0.5);
    };
    for (const m of this.mobs) if (m.state !== 'dead') tick(m, true); else if (m.dots) m.dots.length = 0;
    for (const p of this.players.values()) if (!p.dead) tick(p, false); else if (p.dots) p.dots.length = 0;
  }
  later(delay, fn) { this.timers.push({ at: this.time + delay, fn }); }
  explode(x, y, r, dmg, owner, pvp) {
    this.ev(x, y, ['boom', Math.round(x), Math.round(y), r, 0]);
    if (!owner) return;
    for (const m of this.mobs) {
      if (m.state === 'dead') continue;
      const d = Math.hypot(m.x - x, m.y - y);
      if (d > r + m.def.r) continue;
      const [v, crit] = this.rollDamage(owner, dmg * (1 - 0.45 * Math.min(1, d / r)));
      this.damageMob(m, v, owner, crit, (m.x - x) / (d || 1) * 8, (m.y - y) / (d || 1) * 8);
    }
    if (pvp) for (const q of this.players.values()) {
      if (!this.canPvp(owner, q)) continue;
      const d = Math.hypot(q.x - x, q.y - y);
      if (d > r + 4) continue;
      const [v, crit] = this.rollDamage(owner, dmg * 0.5 * (1 - 0.45 * Math.min(1, d / r)));
      this.damagePlayer(q, v, owner, crit);
    }
  }
  // JcJ : partout, sauf dans les zones sûres (villes, intérieurs)
  canPvp(a, b) { return !!a && !!b && a !== b && !a.dead && !b.dead && !SAFE.has(a.zone) && !SAFE.has(b.zone) && a.room === b.room && this.pvpAllowed(a, b); }
  damagePlayer(p, raw, src, crit = false, dot = 0) {
    if (p.dead) return;
    if (this.time < p.invulnUntil && !dot) { this.ev(p.x, p.y, ['dodge', p.id]); return; }
    let dmg = dot ? Math.max(1, Math.round(raw)) : mitigate(raw, p.stats.def);
    if (!dot && p.ship) dmg = this.hullHit(p, dmg); // la coque encaisse
    p.hp -= dmg; p.lastHurt = this.time; p.dirtyMe = true;
    if (p.recallAt && !dot) { p.recallAt = 0; this.toast(p, 'Rappel interrompu !', 'warn'); }
    if (src && src.key && src !== p) { p.lastPvp = this.time; src.lastPvp = this.time; this.onPvpHit(p, src); }
    this.ev(p.x, p.y, dot ? ['dmg', p.id, dmg, 0, src ? src.id : 0, dot] : ['dmg', p.id, dmg, crit ? 1 : 0, src ? src.id : 0]);
    if (p.hp <= 0) this.killPlayer(p, src);
  }
  killPlayer(p, src) {
    if ((p.arena || p.duel) && this.inFosse(p)) return this.arenaKnockout(p); // 1.0 : dans la Fosse, on est mis à terre
    if (p.st) p.st.deaths++;
    if (p.riding) this.dismount(p);
    p.recallAt = 0;
    p.hp = 0; p.dead = true; p.deathAt = this.time; p.moving = false;
    if (p.ship) this.leaveDeck(p);
    p.fishing = null;
    const pk = src && src.key && src !== p && this.players.has(src.id) ? src : null;
    const lost = pk ? this.pvpLoss(p, pk) : Math.floor(p.gold * 0.1); // 1.0 : en duel, pertes limitées
    p.gold -= lost;
    this.ev(p.x, p.y, ['die', p.id]);
    if (pk) this.onPvpKill(p, pk, lost);
    this.onDeathJustice(p); // forban recherché ou cambrioleur : direction la Geôle
    this.send(p, { t: 'dead', lost, by: src ? (src.def ? src.def.name : src.name || '') : '', pk: pk ? 1 : 0, jail: p.jail | 0 });
    p.dirtyMe = true;
    for (const m of this.mobs) if (m.target === p.id) { m.target = 0; }
    if (pk) {
      if (lost > 0) this.spawnDrop(p.x, p.y, 'or', lost, pk.id);
      const recent = this.time - (pk.pvpLog.get(p.key) || -1e9) < 180;
      pk.pvpLog.set(p.key, this.time);
      if (!recent) {
        this.giveXp(pk, Math.round((25 + p.level * 14) * (p.level < pk.level - 3 ? 0.25 : 1)));
        pk.pk++; pk.dirtyMe = true;
      }
      this.unlock(pk, 'duel');
      this.broadcastChat(null, `⚔ ${pk.name} a envoyé ${p.name} par le fond !`, 'pvp');
    }
  }
  respawn(p) {
    if (!p.dead || this.time - p.deathAt < 1.5) return;
    p.dead = false; p.hp = p.stats.maxHp; p.en = p.stats.maxEn;
    if (p.ship) this.leaveDeck(p);
    p.diveBoat = null; p.air = null;
    if (p.shieldNext) { p.shieldNext = false; p.shieldUntil = this.time + SHIELD_AFTER_DEATH; p.lookVer++; this.toast(p, `Pavillon blanc : personne ne peut vous attaquer pendant ${SHIELD_AFTER_DEATH / 60} minutes (et vous n’attaquez personne).`, 'info'); }
    if (p.jail > 0) { p.invulnUntil = this.time + 3; this.imprison(p, 0); this.ev(p.x, p.y, ['fx', 'respawn', p.x, p.y]); return; }
    const sp = this.world.spawnPoint;
    p.x = sp.x + rand(-12, 12); p.y = sp.y + rand(-4, 4);
    const bed = p.respawnAt && this.structs.get(p.respawnAt.ty * this.world.W + p.respawnAt.tx);
    if (bed && bed.type === 'lit' && bed.owner === p.key) {
      for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) { const x = (bed.tx + dx) * TILE + 8, y = (bed.ty + dy) * TILE + 10; if (canStand(this.world, x, y, false, p.key)) { p.x = x; p.y = y; break; } }
    } else if (!canStand(this.world, p.x, p.y, false, p.key)) { p.x = sp.x; p.y = sp.y; }
    p.invulnUntil = this.time + 3; p.moveBudget = 0;
    p.zone = zoneAt(this.world, p.x, p.y); p.room = roomIdAt(this.world, p.x, p.y);
    this.sendPos(p, { respawn: 1 });
    this.ev(p.x, p.y, ['fx', 'respawn', p.x, p.y]);
    p.dirtyMe = true;
  }
  giveXp(p, xp) {
    if (p.level >= MAX_LEVEL) return this.giveGlory(p, xp);
    p.xp += xp; p.dirtyMe = true;
    this.ev(p.x, p.y, ['xp', p.id, xp]);
    while (p.level < MAX_LEVEL && p.xp >= xpToNext(p.level)) {
      p.xp -= xpToNext(p.level); p.level++;
      this.recalc(p);
      p.hp = p.stats.maxHp; p.en = p.stats.maxEn;
      this.ev(p.x, p.y, ['lvl', p.id, p.level]);
      const unlock = Object.values(SKILLS).find((s) => s.lvl === p.level);
      this.toast(p, `Niveau ${p.level} !${unlock ? ` Nouvelle compétence : ${unlock.name} (${unlock.key})` : ''}`, 'level');
      if (p.level % 5 === 0) this.broadcastChat(null, `${p.name} atteint le niveau ${p.level} !`, 'sys');
      p.lookVer++;
      if (p.level >= 10) this.unlock(p, 'niveau10');
    }
  }
  // 1.0 : un secret — les trois cloches marines, à faire sonner dans la même journée
  ringBell(p, i) {
    const b = this.world.bells[i];
    if (!b || p.dead || p.room >= 0 || Math.hypot(b.x - p.x, b.y - p.y) > 40) return;
    if ((p.bellAt || 0) > this.time) return; p.bellAt = this.time + 2;
    this.ev(b.x, b.y, ['fx', 'bell', b.x, b.y]);
    p.bells = p.bells || {}; p.bells[i] = this.time;
    const rung = Object.values(p.bells).filter((t) => this.time - t < DAY_LENGTH).length;
    if (rung >= this.world.bells.length && !p.ach.secret_cloches) {
      p.gold += 3000; p.dirtyMe = true; this.giveOrDrop(p, 'boussole_maudite', 1); this.unlock(p, 'secret_cloches');
      this.toast(p, 'Les trois cloches chantent ensemble… La mer vous ouvre sa bourse : +3000 doublons et une boussole qui ne montre pas le nord.', 'quest');
      this.broadcastChat(null, `🔔 Quelque part, trois cloches marines ont sonné ensemble. ${p.name} a percé un secret de l’archipel.`, 'sys');
    } else this.toast(p, `La cloche marine sonne, grave et lointaine… (${rung}/${this.world.bells.length} aujourd’hui)`, 'info');
  }
  // 1.0 : Acte III — l'Âme d'Anselme vient à qui la cherche, devant l'épave du Léviathan
  act3Tick(p) {
    const st = p.quests.a3_ame;
    if (!st || st.s !== 'active' || (st.p[0] || 0) >= 1 || p.dead || p.room >= 0 || !this.world.wreck) return;
    const wx = this.world.wreck.x * TILE + 8, wy = this.world.wreck.y * TILE + 8;
    if (Math.hypot(p.x - wx, p.y - wy) > 260) return;
    if (this.mobs.some((m) => m.type === 'ame_anselme' && m.state !== 'dead')) return;
    if ((this.animeAt || 0) > this.time) return;
    this.animeAt = this.time + 20;
    let at = null; for (let k = 0; k < 30 && !at; k++) { const x = p.x + rand(-90, 90), y = p.y + rand(-70, 70); if (canStand(this.world, x, y) && Math.hypot(x - p.x, y - p.y) > 50) at = [x, y]; }
    if (!at) return;
    const m = this.addMob('ame_anselme', at[0], at[1], true);
    m.event = true; m.sunproof = true; m.state = 'chase'; m.target = p.id;
    this.ev(m.x, m.y, ['fx', 'rise', m.x, m.y]); this.ev(m.x, m.y, ['shout', m.id, 'Qui ose approcher du feu ?']);
    for (const q of this.players.values()) if (q.room < 0 && Math.hypot(q.x - m.x, q.y - m.y) < 600) this.toast(q, 'Une lueur monte de l’épave… L’Âme du Père Anselme se dresse !', 'warn');
  }
  // 1.0 : au-delà du niveau 30, l'expérience devient de la Gloire
  giveGlory(p, xp) {
    if ((p.glory | 0) >= GLORY_MAX) return;
    p.gxp = (p.gxp | 0) + xp; p.dirtyMe = true;
    this.ev(p.x, p.y, ['xp', p.id, xp]);
    while (p.glory < GLORY_MAX && p.gxp >= GLORY_XP) {
      p.gxp -= GLORY_XP; p.glory++;
      this.recalc(p); p.hp = p.stats.maxHp;
      this.ev(p.x, p.y, ['lvl', p.id, p.level]);
      this.toast(p, `Gloire ${p.glory} ! +1 % de PV et +0,5 % de dégâts (total : +${p.glory} % PV, +${(p.glory * 0.5).toFixed(1).replace('.', ',')} % dégâts).`, 'level');
      if (p.glory % 10 === 0) this.broadcastChat(null, `★ ${p.name} atteint la Gloire ${p.glory} !`, 'sys');
      if (p.glory >= 10) this.unlock(p, 'gloire');
      if (p.glory >= GLORY_MAX) { this.unlock(p, 'gloire_max'); p.gxp = 0; }
      p.lookVer++;
    }
  }
  spawnProj(x, y, a, speed, range, dmg, team, owner, kind, pierce = 0, crit = false, pvp = false, fx = null) {
    const pr = { id: this.nextId++, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, left: range, dmg, team, owner, kind, pierce, hit: new Set(), crit, pvp, fx };
    this.projs.push(pr);
    this.ev(x, y, ['proj', pr.id, Math.round(x), Math.round(y), +a.toFixed(3), speed, Math.round(range), kind, owner]);
    return pr;
  }
  // ---- trajectoires vivantes : le client suit grâce aux événements « pv »
  ricochet(pr, from) {
    let best = null, bd = 130;
    for (const m of this.mobs) { if (m.state === 'dead' || pr.hit.has(m.id) || m.under || m.room !== from.room) continue; const d = Math.hypot(m.x - from.x, m.y - from.y); if (d < bd) { bd = d; best = m; } }
    if (!best) return false;
    pr.rico = (pr.rico || 0) + 1;
    const a = Math.atan2(best.y - 8 - pr.y, best.x - pr.x), sp = Math.hypot(pr.vx, pr.vy);
    pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp; pr.left = Math.max(pr.left, bd + 30);
    this.ev(pr.x, pr.y, ['pv', pr.id, Math.round(pr.x), Math.round(pr.y), +a.toFixed(3), Math.round(pr.left)]);
    return true;
  }
  turnBack(pr) { // le boomerang fait demi-tour, et peut frapper de nouveau
    pr.back = true; pr.hit.clear(); pr.left = 600; pr.nextPv = 0;
    this.steerProj(pr, true);
  }
  steerProj(pr, force = false) {
    const sp = Math.hypot(pr.vx, pr.vy);
    let tx = null, ty = null;
    if (pr.back) { const o = this.players.get(pr.owner); if (!o) return; tx = o.x; ty = o.y - 9; }
    else { // balle chercheuse : le mort le plus proche, devant elle
      let bd = 190; const a0 = Math.atan2(pr.vy, pr.vx);
      for (const m of this.mobs) {
        if (m.state === 'dead' || m.under || pr.hit.has(m.id)) continue;
        const d = Math.hypot(m.x - pr.x, m.y - 8 - pr.y);
        if (d < bd && angDiff(Math.atan2(m.y - 8 - pr.y, m.x - pr.x), a0) < 1.3) { bd = d; tx = m.x; ty = m.y - 8; }
      }
    }
    if (tx === null) return;
    const a0 = Math.atan2(pr.vy, pr.vx), want = Math.atan2(ty - pr.y, tx - pr.x);
    let da = want - a0; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const turn = pr.back ? 9 : 4.5, a = force ? want : a0 + Math.max(-turn * DT, Math.min(turn * DT, da));
    pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
    if (force || this.time >= (pr.nextPv || 0)) { pr.nextPv = this.time + 0.12; this.ev(pr.x, pr.y, ['pv', pr.id, Math.round(pr.x), Math.round(pr.y), +a.toFixed(3), Math.round(pr.left)]); }
  }
  updateProjs() {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i];
      if (pr.fx && (pr.fx.homing || pr.back)) this.steerProj(pr);
      const sp = Math.hypot(pr.vx, pr.vy) * DT;
      const steps = Math.max(1, Math.ceil(sp / 4));
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        pr.x += pr.vx * DT / steps; pr.y += pr.vy * DT / steps; pr.left -= sp / steps;
        if (pr.left <= 0) { if (pr.fx && pr.fx.boomer && !pr.back) { this.turnBack(pr); continue; } dead = true; break; }
        if (blocksShot(this.world, pr.x, pr.y + 8)) { if (pr.fx && pr.fx.boomer && !pr.back) { this.turnBack(pr); continue; } dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; }
        if (pr.back) { const o = this.players.get(pr.owner); if (!o || Math.hypot(o.x - pr.x, o.y - 9 - pr.y) < 14) { dead = true; this.ev(pr.x, pr.y, ['pd', pr.id]); break; } }
        if (pr.team === 'p') {
          const owner = this.players.get(pr.owner), fx = pr.fx || {};
          const kb = 3 * (fx.kb || 1);
          for (const m of this.mobs) {
            if (m.state === 'dead' || pr.hit.has(m.id) || m.under) continue;
            if (m.def.ship ? hullPointHit(shipOf(mobShipKind(m.def)), m.x, m.y, Math.atan2(m.vy || 0, m.vx || 1), pr.x, pr.y + 8) : Math.hypot(m.x - pr.x, m.y - 8 - pr.y) < m.def.r + 4) { // 1.1 : un navire, on vise sa coque
              pr.hit.add(m.id);
              if (owner) { const n = Math.hypot(pr.vx, pr.vy); this.damageMob(m, pr.dmg, owner, pr.crit, pr.vx / n * kb, pr.vy / n * kb); this.hitEffects(owner, m, pr.dmg, fx); }
              if (fx.ricochet && (pr.rico || 0) < fx.ricochet && this.ricochet(pr, m)) break; // la balle rebondit vers un autre mort
              if (pr.pierce > 0 && !fx.explode) pr.pierce--; else { dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; }
            }
          }
          if (!dead && pr.kind === 'cball') { const sh = this.projShip(pr); if (sh) { this.shipStruck(sh, pr, owner); dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; } } // 1.1
          if (!dead && pr.pvp && owner) for (const q of this.players.values()) {
            if (q === owner || pr.hit.has(q.id) || !this.canPvp(owner, q)) continue;
            if (Math.hypot(q.x - pr.x, q.y - 9 - pr.y) < (q.boat ? 11 : 8)) {
              pr.hit.add(q.id);
              const v = Math.max(1, Math.round(pr.dmg * PVP_MUL));
              this.damagePlayer(q, v, owner, pr.crit); this.hitEffects(owner, q, v, fx);
              if (pr.pierce > 0 && !fx.explode) pr.pierce--; else { dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; }
            }
          }
        } else {
          if (pr.kind === 'cball') { const sh = this.projShip(pr); if (sh) { this.shipStruck(sh, pr, this.mobs.find((m) => m.id === pr.owner)); dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; } } // 1.1 : la coque d'abord
          for (const p of this.players.values()) {
            if (p.dead || SAFE.has(p.zone)) continue;
            if (Math.hypot(p.x - pr.x, p.y - 9 - pr.y) < 8) {
              const src = this.mobs.find((m) => m.id === pr.owner);
              this.damagePlayer(p, pr.dmg, src); pr.hitP = p.id;
              dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break;
            }
          }
        }
      }
      if (dead || pr.left <= 0) {
        if (pr.fx && pr.fx.explode) this.explode(pr.x, pr.y + 6, pr.fx.explode, pr.dmg, this.players.get(pr.owner), pr.pvp);
        if (pr.team === 'm' && pr.fx && pr.fx.msplash) this.mobSplash(pr);
        this.projs.splice(i, 1);
      }
    }
    for (let i = this.timers.length - 1; i >= 0; i--) { const t = this.timers[i]; if (this.time >= t.at) { this.timers.splice(i, 1); try { t.fn(); } catch (e) { /* */ } } }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      if (this.time < b.at) continue;
      this.bombs.splice(i, 1);
      this.ev(b.x, b.y, ['boom', Math.round(b.x), Math.round(b.y), b.r, 0]);
      const owner = this.players.get(b.owner);
      if (!owner) continue;
      for (const m of this.mobs) {
        if (m.state === 'dead') continue;
        const d = Math.hypot(m.x - b.x, m.y - b.y);
        if (d > b.r + m.def.r) continue;
        const [v, crit] = this.rollDamage(owner, b.dmg * (1 - 0.4 * Math.min(1, d / b.r)));
        this.damageMob(m, v, owner, crit, (m.x - b.x) / (d || 1) * 10, (m.y - b.y) / (d || 1) * 10);
      }
      if (b.pvp) for (const q of this.players.values()) {
        if (!this.canPvp(owner, q)) continue;
        const d = Math.hypot(q.x - b.x, q.y - b.y);
        if (d > b.r + 4) continue;
        const [v, crit] = this.rollDamage(owner, b.dmg * 0.5 * (1 - 0.4 * Math.min(1, d / b.r)));
        this.damagePlayer(q, v, owner, crit);
      }
    }
    for (let i = this.teles.length - 1; i >= 0; i--) {
      const t = this.teles[i];
      if (this.time < t.at) continue;
      this.teles.splice(i, 1);
      this.ev(t.x, t.y, ['boom', Math.round(t.x), Math.round(t.y), t.r, 1]);
      for (const p of this.players.values()) if (!p.dead && !SAFE.has(p.zone) && Math.hypot(p.x - t.x, p.y - t.y) < t.r + 4) this.damagePlayer(p, t.dmg, t.src || null);
    }
    for (let i = this.lteles.length - 1; i >= 0; i--) {
      const t = this.lteles[i];
      if (this.time < t.at) continue;
      this.lteles.splice(i, 1);
      this.ev(t.x1, t.y1, ['boomL', Math.round(t.x0), Math.round(t.y0), Math.round(t.x1), Math.round(t.y1), t.w]);
      for (const p of this.players.values()) if (!p.dead && !SAFE.has(p.zone) && segDist(p.x, p.y - 4, t.x0, t.y0, t.x1, t.y1) < t.w / 2 + 5) this.damagePlayer(p, t.dmg, t.src || null);
    }
  }

  onAttack(p, a) {
    if (p.dead || !isFinite(a)) return;
    if (p.post) { if (p.post.startsWith('gun')) this.fireGun(p, a); return; } // 1.1 : à son poste
    const cd = p.stats.atkSpeed;
    if ((p.cds.slash || 0) > this.time + 0.04) return;
    p.cds.slash = this.time + cd;
    const Wp = ITEMS[p.eq.weapon] || {};
    const mounted = p.riding && Wp.charge; // la lance de cavalerie se manie en selle
    if (p.riding && !mounted) this.dismount(p);
    if (Wp.charge) p.moveBudget += Wp.charge + 14; // l'élan de la lance : le client fait la ruée, on l'autorise
    p.dir = dirOf(Math.cos(a), Math.sin(a));
    this.ev(p.x, p.y, ['atk', p.id, +a.toFixed(2), 0]);
    const W = ITEMS[p.eq.weapon] || {};
    const range = W.reach || 27, arc = W.arc || 1.15, kb = 5 * (W.kb || 1);
    for (const m of this.mobs) {
      if (m.state === 'dead' || m.room !== p.room) continue;
      const dx = m.x - p.x, dy = (m.y - 6) - (p.y - 8);
      const d = Math.hypot(dx, dy);
      if (d > range + m.def.r) continue;
      if (d > 8 && angDiff(Math.atan2(dy, dx), a) > arc) continue;
      let [v, crit] = this.rollDamage(p, p.stats.atk);
      if (W.execute && m.hp < m.maxHp * W.execute[0]) v = Math.round(v * (1 + W.execute[1])); // l'exécuteur achève
      if (mounted) v = Math.round(v * 1.5);
      this.damageMob(m, v, p, crit, Math.cos(a) * kb, Math.sin(a) * kb);
      this.hitEffects(p, m, v, W);
    }
    for (const q of this.players.values()) {
      if (!this.canPvp(p, q)) continue;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > range + 6) continue;
      if (d > 8 && angDiff(Math.atan2(dy, dx), a) > arc) continue;
      const [v, crit] = this.rollDamage(p, p.stats.atk * PVP_MUL);
      this.damagePlayer(q, v, p, crit);
      this.hitEffects(p, q, v, W);
    }
  }
  onSkill(p, m) {
    const id = String(m.s), sk = SKILLS[id];
    if (!sk || p.dead) return;
    if (p.riding) this.dismount(p);
    if (p.level < sk.lvl) return this.toast(p, `${sk.name} : niveau ${sk.lvl} requis.`, 'warn');
    if (p.post) { if (id === 'shot' && p.post.startsWith('gun')) this.fireGun(p, +m.a); return; } // 1.1 : au canon, on tire le canon
    if (sk.needGun && !p.eq.gun) return this.toast(p, "Il vous faut une arme à feu (emplacement Pistolet).", 'warn');
    const cd = sk.cd * (id === 'shot' ? p.stats.gunCd : 1);
    if ((p.cds[id] || 0) > this.time + 0.05) return;
    if (p.en < sk.cost) return this.toast(p, "Pas assez d'énergie.", 'warn');
    const a = isFinite(+m.a) ? +m.a : 0;
    p.cds[id] = this.time + cd;
    p.en -= sk.cost; p.dirtyMe = true;
    switch (id) {
      case 'shot': {
        p.dir = dirOf(Math.cos(a), Math.sin(a));
        const pvp = !SAFE.has(p.zone);
        const gun = ITEMS[p.eq.gun];
        const s = gun.shot;
        const fx = s.explode || s.burn || s.bleed || s.kb || s.poison || s.frost || s.stun || s.chain || s.pull || s.curse || s.ricochet || s.boomer || s.homing
          ? { explode: s.explode, burn: s.burn, bleed: s.bleed, kb: s.kb, poison: s.poison, frost: s.frost, stun: s.stun, chain: s.chain, pull: s.pull, curse: s.curse, ricochet: s.ricochet, boomer: s.boomer, homing: s.homing } : null;
        const fire = (aa) => {
          this.ev(p.x, p.y, ['atk', p.id, +aa.toFixed(2), 1]);
          for (let k = 0; k < s.n; k++) {
            const off = (s.n > 1 ? (k / (s.n - 1) - 0.5) * s.spread : 0) + (s.n > 1 || s.burst ? rand(-0.04, 0.04) : 0);
            const [v, crit] = this.rollDamage(p, p.stats.gun);
            this.spawnProj(p.x + Math.cos(aa) * 8, p.y - 9 + Math.sin(aa) * 6, aa + off, s.speed, s.range, v, 'p', p.id, s.kind || (s.n > 1 ? 'pellet' : 'bullet'), s.pierce || 0, crit, pvp, fx);
          }
        };
        fire(a);
        for (let b = 1; b < (s.burst || 1); b++) this.later(s.gap * b, () => { if (!p.dead && this.players.has(p.id)) fire(a + rand(-0.05, 0.05)); });
        break;
      }
      case 'whirl': {
        this.ev(p.x, p.y, ['whirl', p.id]);
        for (const mob of this.mobs) {
          if (mob.state === 'dead') continue;
          const d = Math.hypot(mob.x - p.x, mob.y - p.y);
          if (d > 36 + mob.def.r) continue;
          const [v, crit] = this.rollDamage(p, p.stats.atk * 1.5);
          this.damageMob(mob, v, p, crit, (mob.x - p.x) / (d || 1) * 8, (mob.y - p.y) / (d || 1) * 8);
        }
        for (const q of this.players.values()) {
          if (!this.canPvp(p, q) || dist(p, q) > 42) continue;
          const [v, crit] = this.rollDamage(p, p.stats.atk * 1.5 * PVP_MUL);
          this.damagePlayer(q, v, p, crit);
        }
        break;
      }
      case 'rum': {
        p.rumUntil = this.time + 5; p.rumRate = p.stats.maxHp * 0.35 / 5;
        this.ev(p.x, p.y, ['fx', 'rum', p.x, p.y, p.id]);
        break;
      }
      case 'bomb': {
        let tx = +m.x, ty = +m.y;
        if (!isFinite(tx) || !isFinite(ty)) { tx = p.x + Math.cos(a) * 80; ty = p.y + Math.sin(a) * 80; }
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
        if (d > 130) { tx = p.x + dx / d * 130; ty = p.y + dy / d * 130; }
        this.bombs.push({ x: tx, y: ty, at: this.time + 1.0, dmg: p.stats.atk * 2.5, r: 42, owner: p.id, pvp: !SAFE.has(p.zone) });
        this.ev(p.x, p.y, ['bomb', Math.round(p.x), Math.round(p.y - 10), Math.round(tx), Math.round(ty), 1.0]);
        break;
      }
      case 'cry': {
        for (const q of this.players.values()) if (!q.dead && dist(q, p) < 130) { q.cry = this.time + 8; q.dirtyMe = true; if (q !== p) this.toast(q, `${p.name} pousse un cri d'abordage ! +30 % de dégâts.`, 'buff'); }
        this.ev(p.x, p.y, ['cry', p.id]);
        break;
      }
      case 'roll': {
        p.invulnUntil = Math.max(p.invulnUntil, this.time + ROLL_TIME + 0.08);
        p.moveBudget += ROLL_SPEED * ROLL_TIME + 12;
        this.ev(p.x, p.y, ['roll', p.id, +a.toFixed(2)]);
        break;
      }
    }
  }

  // ------------------------------------------------------------ déplacement
  onMove(p, m) {
    if (p.dead) return;
    if (this.deckMoveMsg(p, m)) return; // 1.1 : sur un pont, à l'abordage, ou à terre
    if (p.race) this.raceCheck(p); // 1.0 : le Grand Tour
    const x = +m.x, y = +m.y;
    if (!isFinite(x) || !isFinite(y)) return;
    if (this.time < (p.grabbedUntil || 0)) { p.lastMoveAt = this.time; if (Math.hypot(x - p.x, y - p.y) > 3) this.sendPos(p); return; }
    const dt = Math.min(0.6, this.time - p.lastMoveAt);
    p.lastMoveAt = this.time;
    const spd = p.stats.speed * (this.time < p.cry ? 1.2 : 1);
    const pull = this.time < (p.pullUntil || 0) ? 95 : 0;
    p.moveBudget = Math.min(spd * 1.2 + ROLL_SPEED * ROLL_TIME + 30 + pull, p.moveBudget + (spd * 1.3 + pull) * dt + 3);
    const d = Math.hypot(x - p.x, y - p.y);
    const ok = canStand(this.world, x, y, false, p.key) && roomIdAt(this.world, x, y) === p.room && !(p.room === -1 && this.pointOnShip(x, y));
    if (d > p.moveBudget || !ok) {
      this.sendPos(p);
      p.moveBudget *= 0.5;
      return;
    }
    p.moveBudget -= d;
    p.x = x; p.y = y;
    p.dir = (m.d | 0) & 3;
    p.moving = !!m.m;
    this.setZone(p, zoneAt(this.world, x, y));
    if (p.room < 0) for (const dr of this.secretDoors) if (!p.found.has(dr.id) && Math.abs(dr.ox - x) < 44 && Math.abs(dr.oy - y) < 40) this.discover(p, dr);
    // ramassage automatique
    for (const dr of this.drops.values()) if (Math.abs(dr.x - p.x) < PICKUP_RANGE && Math.abs(dr.y - p.y) < PICKUP_RANGE) this.pick(p, dr.id, true);
  }

  revealIsland(p, isl) {
    const W = this.world;
    for (let y = isl.y0; y <= isl.y1; y++) for (let x = isl.x0; x <= isl.x1; x++) if (W.islandOf[y * W.W + x] === isl.id) { const c = Math.floor(y / SEEN_CELL) * this.seenW + Math.floor(x / SEEN_CELL); p.seen[c >> 3] |= 1 << (c & 7); }
  }
  revealKnown(p) {
    const known = new Set([...p.zs, Z.TOWN]);
    if (p.ach.navigateur) known.add(Z.HAVRE); if (p.ach.rade) known.add(Z.RADE); if (p.ach.citoyen) known.add(Z.LIBERTALIA);
    for (const h of this.homesOf(p.key)) { const pl = this.world.plots[h.k]; const isl = this.world.islands[this.world.islandOf[pl.ty * this.world.W + pl.tx] - 1]; if (isl) this.revealIsland(p, isl); }
    for (const isl of this.world.islands) if (isl.zones.some((z) => known.has(z))) this.revealIsland(p, isl);
  }
  // 1.0 : la brume se lève autour du pirate (rayon de deux carrés, soit une quinzaine de cases)
  markSeen(p, quiet = false) {
    if (p.room >= 0 || !p.seen) return;
    const cx = Math.floor(p.x / TILE / SEEN_CELL), cy = Math.floor(p.y / TILE / SEEN_CELL), fresh = [];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (dx * dx + dy * dy > 5) continue;
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= this.seenW || y >= this.seenH) continue;
      const c = y * this.seenW + x; if (p.seen[c >> 3] & (1 << (c & 7))) continue;
      p.seen[c >> 3] |= 1 << (c & 7); fresh.push(c);
    }
    if (fresh.length && !quiet) this.send(p, { t: 'seen', c: fresh });
  }
  sendPos(p, extra) { this.send(p, Object.assign({ t: 'pos', x: p.x, y: p.y, boat: p.boat || null, room: p.room, s: p.ship || 0, lx: p.lx, ly: p.ly }, extra)); }
  setZone(p, z) {
    if (z === p.zone) return;
    p.zone = z;
    this.questZone(p, z);
    if (z === Z.HAVRE) this.unlock(p, 'navigateur');
    if (z === Z.RADE) this.unlock(p, 'rade');
    if (z === Z.LIBERTALIA) this.unlock(p, 'citoyen');
    if (FAR_ZONES.includes(z) && !p.zs.has(z)) { p.zs.add(z); if (p.zs.size >= FAR_ZONES.length) this.unlock(p, 'explorateur'); }
    if (ZONES[z] && ZONES[z].hard && !p.hardWarned) { p.hardWarned = 1; this.toast(p, 'Île des Damnés : zone extrême. Ici, même les morts ont peur.', 'warn'); }
  }
  teleport(p, x, y, extra) {
    if (p.ship && !(extra && extra.deck)) this.leaveDeck(p); // 1.1 : on quitte le pont
    p.x = x; p.y = y; p.moveBudget = 0; p.moving = false; p.lastMoveAt = this.time;
    p.room = roomIdAt(this.world, x, y);
    this.setZone(p, zoneAt(this.world, x, y));
    if (p.fishing) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); }
    this.sendPos(p, extra);
  }
  // ------------------------------------------------------------ portes, intérieurs et grottes
  discover(p, d) {
    if (p.found.has(d.id)) return;
    p.found.add(d.id);
    this.send(p, { t: 'found', id: d.id, found: [...p.found] });
    this.toast(p, `Passage secret découvert : ${d.name}.`, 'quest');
    if (this.secretDoors.every((s) => p.found.has(s.id))) this.unlock(p, 'speleo');
  }
  onDoor(p, id, out) {
    if (p.riding) this.dismount(p);
    const d = this.world.doors[id];
    if (!d || p.dead || p.boat || (p.cds.door || 0) > this.time) return;
    if (out) {
      if (p.room !== d.room || Math.abs(p.x - d.ex) > 18 || Math.abs(p.y - d.ey) > 24) return;
      if (d.jail && this.jailBlocks(p)) { p.cds.door = this.time + 1.5; return; }
      p.cds.door = this.time + 0.6;
      if (d.dive) return this.surface(p, d); // 1.0 : la corde de l'ancre remonte à la surface
      this.teleport(p, d.rx, d.ry + 2, { door: d.id, out: 1 });
    } else {
      if (p.room !== -1 || Math.abs(p.x - d.ox) > 18 || Math.abs(p.y - d.oy) > 28) return;
      if (d.jail || d.dive) return; // on n'entre à la Geôle que conduit par la garde ; dans les fonds, qu'avec la cloche
      if (d.seal && (this.seals[d.seal] || 0) < this.time) { p.cds.door = this.time + 1.5; return this.toast(p, 'La porte est scellée. Deux dalles, deux pirates…', 'warn'); }
      if (d.plot != null) {
        const h = this.homes.get(d.plot);
        if (!h) { p.cds.door = this.time + 1.5; const C = this.catOf(d.plot); return this.toast(p, `${C.name} à vendre : ${C.price} doublons (E devant la porte : visiter ou acheter).`, 'info'); }
        const thief = p.burgle && p.burgle.k === d.plot && this.time < p.burgle.until;
        if (h.key !== p.key && !thief) { p.cds.door = this.time + 1.5; return this.toast(p, `Maison de ${h.name} : fermée à clé.`, 'warn'); }
      }
      p.cds.door = this.time + 0.6;
      if (d.secret) this.discover(p, d);
      this.teleport(p, d.ix, d.iy, { door: d.id });
      if (d.dungeon) { this.pushDng(p); this.toast(p, 'Le Bastion Englouti : deux leviers par grille, à tirer ensemble — à plusieurs. Et méfiez-vous de l’Écluse.', 'quest'); }
    }
  }
  // ------------------------------------------------------------ navigation
  boatSlot(p, slot) {
    if (slot >= 0 && p.inv[slot] && ITEMS[p.inv[slot].id].boat) return p.inv[slot].id;
    let best = null;
    for (const s of p.inv) if (s && ITEMS[s.id].boat && (!best || ITEMS[s.id].boat.speed > ITEMS[best].boat.speed)) best = s.id;
    return best;
  }
  // ------------------------------------------------------------ objets
  addItem(p, id, n) {
    if (!ITEMS[id]) return n;
    if (p.col && !p.col.has(id)) { p.col.add(id); p.dirtyCodex = true; }
    if (isStackable(id)) {
      for (const s of p.inv) if (s && s.id === id && s.n < STACK_MAX) { const k = Math.min(n, STACK_MAX - s.n); s.n += k; n -= k; if (!n) break; }
    }
    for (let i = 0; i < INV_SIZE && n > 0; i++) if (!p.inv[i]) { const k = isStackable(id) ? Math.min(n, STACK_MAX) : 1; p.inv[i] = { id, n: k }; n -= k; }
    p.dirtyInv = true; p.dirtyQ = true;
    return n;
  }
  countItem(p, id) { let c = 0; for (const s of p.inv) if (s && s.id === id) c += s.n; return c; }
  boatInUse(p, id) { const sh = this.ownShip(p.key); return !!sh && sh.item === id && this.countItem(p, id) <= 1; } // 1.1 : armé, il ne se vend ni ne se donne
  removeItem(p, id, n) {
    for (let i = INV_SIZE - 1; i >= 0 && n > 0; i--) { const s = p.inv[i]; if (s && s.id === id) { const k = Math.min(n, s.n); s.n -= k; n -= k; if (!s.n) p.inv[i] = null; } }
    p.dirtyInv = true; p.dirtyQ = true;
  }
  giveOrDrop(p, id, n) {
    const left = this.addItem(p, id, n);
    if (left > 0) { this.spawnDrop(p.x, p.y, id, left, p.id); this.toast(p, 'Inventaire plein : objet déposé au sol.', 'warn'); }
  }
  spawnDrop(x, y, item, n, owner) {
    const id = this.nextId++;
    const a = Math.random() * Math.PI * 2, r = rand(2, 12);
    let dx = x + Math.cos(a) * r, dy = y + Math.sin(a) * r * 0.7;
    if (!canStand(this.world, dx, dy)) { dx = x; dy = y; }
    this.drops.set(id, { id, x: dx, y: dy, item, n, owner, ownUntil: this.time + 30, expire: this.time + 120, born: this.time, room: roomIdAt(this.world, dx, dy) });
  }
  pick(p, id, auto = false) {
    const d = this.drops.get(id);
    if (!d || p.dead) return;
    if (Math.hypot(d.x - p.x, d.y - p.y) > PICKUP_RANGE + 14) return;
    if (this.time - d.born < 0.5) return;
    if (d.owner && d.owner !== p.id && this.time < d.ownUntil && this.players.has(d.owner)) { if (!auto) this.toast(p, "Ce butin appartient à un autre pirate (encore un peu).", 'warn'); return; }
    if (d.item === 'or') {
      p.gold += d.n; p.dirtyMe = true;
      this.send(p, { t: 'loot', id: 'or', n: d.n });
    } else {
      const left = this.addItem(p, d.item, d.n);
      if (left === d.n) { if (!auto) this.toast(p, 'Inventaire plein !', 'warn'); return; }
      this.send(p, { t: 'loot', id: d.item, n: d.n - left });
      if (left > 0) { d.n = left; return; }
    }
    this.drops.delete(id);
    this.ev(d.x, d.y, ['pick', id, p.id]);
  }
  useSlot(p, i) {
    const s = p.inv[i];
    if (!s || p.dead) return;
    const it = ITEMS[s.id];
    if (it.slot) return this.equip(p, i);
    if (it.tool === 'fish') return this.toast(p, 'Face à l’eau, appuyez sur R pour pêcher.', 'info');
    if (it.boat) return this.armShip(p, s.id); // 1.1 : un navire s'arme à quai
    if (it.pet) { // animal de compagnie : il vous suit, ou il se repose dans le sac
      p.pet = p.pet === it.pet ? null : it.pet; p.lookVer++; p.dirtyMe = true;
      return this.toast(p, p.pet ? `${it.name} vous suit.` : `${it.name} se repose.`, 'info');
    }
    if (!it.use) return this.toast(p, `${it.name} ne s'utilise pas.`, 'warn');
    if (it.use.combine) {
      if (this.countItem(p, s.id) < it.use.combine) return this.toast(p, `Il faut ${it.use.combine} fragments pour reconstituer une carte (vous en avez ${this.countItem(p, s.id)}).`, 'warn');
      this.removeItem(p, s.id, it.use.combine);
      this.giveOrDrop(p, 'carte_tresor', 1);
      return this.toast(p, 'Les fragments s’assemblent : une carte au trésor ! Clic droit dessus pour la lire.', 'quest');
    }
    if (it.use.treasure) {
      if (p.treasure) return this.toast(p, 'Vous suivez déjà une carte : creusez d’abord ce trésor-là (croix rouge sur la carte).', 'warn');
      const [x, y] = this.digSpots[Math.floor(Math.random() * this.digSpots.length)];
      p.treasure = { x, y };
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
      this.send(p, { t: 'treasure', x, y });
      return this.toast(p, `X marque l’emplacement : ${ZONES[zoneAt(this.world, x, y)].name}. Une flèche vous guide.`, 'quest');
    }
    if (it.use.lock) {
      const h = this.homeAt(p);
      if (!h) return this.toast(p, 'Utilisez-la chez vous, dans votre maison.', 'warn');
      if (h.lock >= 2) return this.toast(p, 'Votre porte a déjà la meilleure serrure.', 'warn');
      h.lock++; s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true; this.worldDirty = true; this.broadcastHomes();
      return this.toast(p, `Serrure renforcée posée (niveau ${h.lock}/2).`, 'quest');
    }
    if (it.use.conch) return this.blowConch(p, i);
    if (it.use.travel) {
      const dest = this.world.docks && this.world.docks[it.use.travel];
      if (!dest || this.jailBlocks(p)) return;
      if (!SAFE.has(p.zone) || p.boat) return this.toast(p, 'Le passeur n’embarque que depuis une ville, à pied.', 'warn');
      if (this.time - p.lastHurt < 8) return this.toast(p, 'Pas en plein combat !', 'warn');
      let tx = dest.x, ty = dest.y;
      for (let r = 0; r < 60 && !canStand(this.world, tx, ty, false, p.key); r += 6) { tx = dest.x + (Math.random() - 0.5) * r; ty = dest.y - r; }
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
      this.teleport(p, tx, ty, { travel: it.use.travel });
      return this.toast(p, `Le passeur vous dépose à ${ZONES[zoneAt(this.world, tx, ty)].name}.`, 'quest');
    }
    if (it.use.bottle) {
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
      const gold = Math.round(rand(8, 40)); p.gold += gold; p.dirtyMe = true;
      const MSG = ['« Si vous lisez ceci, je suis coincé sur un rocher. Apportez du rhum. »', '« Le trésor n’est pas là où vous croyez. Il n’est jamais là. »', '« Ne faites pas confiance au perroquet. »', '« Barbe-Cendre craint la lumière du phare. »', '« Je lègue mes doublons à qui trouvera cette bouteille. »'];
      if (Math.random() < 0.3) this.giveOrDrop(p, 'carte_dechiree', 1);
      return this.toast(p, `${MSG[Math.floor(Math.random() * MSG.length)]} (+${gold} doublons)`, 'quest');
    }
    if (it.use.dive) return this.dive(p); // 1.0 : la cloche de plongée
    if (it.use.recall) {
      if (p.ship) return this.toast(p, 'Descendez d’abord à terre.', 'warn');
      if (this.jailBlocks(p)) return;
      if (p.recallAt) return;
      p.recallAt = this.time + 3; p.recallSlot = s.id; p.dirtyMe = true;
      this.ev(p.x, p.y, ['fx', 'recall', p.x, p.y, p.id]);
      return this.toast(p, 'La conque résonne… ne bougez pas trop, et ne vous faites pas frapper.', 'info');
    }
    if (it.use.spy) {
      if ((p.cds.spy || 0) > this.time) return;
      p.cds.spy = this.time + 18;
      return this.send(p, { t: 'spy', dur: 15 });
    }
    if (it.use.smoke) {
      p.smokeUntil = this.time + it.use.smoke;
      for (const m of this.mobs) if (m.target === p.id && !m.def.ai) { m.target = 0; m.state = 'return'; m.windup = 0; }
      this.ev(p.x, p.y, ['fx', 'smoke', p.x, p.y, p.id]);
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
      return;
    }
    if (it.use.buff) {
      p.buffs = p.buffs || {};
      p.buffs[it.use.buff] = { v: it.use.v, until: this.time + it.use.dur };
      this.recalc(p);
      this.ev(p.x, p.y, ['fx', 'buff', p.x, p.y, p.id, it.use.buff]);
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true; p.dirtyMe = true;
      return;
    }
    if ((p.cds.food || 0) > this.time) return;
    p.cds.food = this.time + 0.8;
    const u = it.use;
    if (u.cleanse && p.dots) p.dots.length = 0;
    if (u.heal) { const before = p.hp; p.hp = Math.min(p.stats.maxHp, p.hp + u.heal); this.ev(p.x, p.y, ['heal', p.id, Math.round(p.hp - before)]); }
    if (u.en) p.en = Math.min(p.stats.maxEn, p.en + u.en);
    if (u.drunk) p.drunkUntil = this.time + u.drunk;
    this.ev(p.x, p.y, ['fx', u.drunk ? 'drink' : 'eat', p.x, p.y, p.id]);
    s.n--; if (s.n <= 0) p.inv[i] = null;
    p.dirtyInv = true; p.dirtyMe = true;
  }
  eatBest(p) {
    let best = -1, bv = 1e9;
    const missing = p.stats.maxHp - p.hp;
    for (let i = 0; i < INV_SIZE; i++) {
      const s = p.inv[i]; if (!s) continue;
      const it = ITEMS[s.id]; if (!it.use || !it.use.heal) continue;
      const score = Math.abs(it.use.heal - missing) + (it.use.drunk ? 30 : 0);
      if (score < bv) { bv = score; best = i; }
    }
    if (best < 0) return this.toast(p, "Vous n'avez rien à manger.", 'warn');
    this.useSlot(p, best);
  }
  equip(p, i) {
    const s = p.inv[i];
    if (!s) return;
    const it = ITEMS[s.id];
    if (!it.slot) return;
    const need = reqLevel(it);
    if (p.level < need) return this.toast(p, `${it.name} : niveau ${need} requis.`, 'warn');
    const prev = p.eq[it.slot];
    p.eq[it.slot] = s.id;
    p.inv[i] = prev ? { id: prev, n: 1 } : null;
    this.recalc(p);
    p.dirtyInv = true;
    if (it.slot === 'outfit') { this.toast(p, `Vous enfilez : ${it.name}.`, 'info'); if ((it.rarity || 0) >= 3) this.unlock(p, 'elegance'); }
  }
  unequip(p, slot) {
    if (slot === 'mount' && p.riding) this.dismount(p);
    if (!SLOTS.includes(slot) || !p.eq[slot]) return;
    const free = p.inv.findIndex((s) => !s);
    if (free < 0) return this.toast(p, 'Inventaire plein !', 'warn');
    p.inv[free] = { id: p.eq[slot], n: 1 };
    p.eq[slot] = null;
    this.recalc(p);
    p.dirtyInv = true;
  }
  swap(p, a, b) {
    if (a < 0 || b < 0 || a >= INV_SIZE || b >= INV_SIZE || a === b) return;
    const A = p.inv[a], B = p.inv[b];
    if (A && B && A.id === B.id && isStackable(A.id)) {
      const k = Math.min(A.n, STACK_MAX - B.n); B.n += k; A.n -= k; if (!A.n) p.inv[a] = null;
    } else { p.inv[a] = B; p.inv[b] = A; }
    p.dirtyInv = true;
  }
  dropSlot(p, i, n = 0) { // n : combien en lâcher (0 = toute la pile)
    const s = p.inv[i];
    if (!s || p.dead) return;
    if (ITEMS[s.id].quest) return this.toast(p, "Vous ne pouvez pas jeter un objet de quête.", 'warn');
    if (this.boatInUse(p, s.id)) return this.toast(p, 'Vous êtes à bord !', 'warn');
    const k = n > 0 ? Math.min(n, s.n) : s.n;
    s.n -= k; if (s.n <= 0) p.inv[i] = null;
    p.dirtyInv = true; p.dirtyQ = true;
    this.spawnDrop(p.x, p.y + 4, s.id, k, 0);
    this.send(p, { t: 'dropped', id: s.id, n: k });
  }
  // ranger le sac : équipement, montures, consommables, objets de quête, le reste ; les plus rares d'abord
  sortInv(p) {
    if (p.dead || (p.cds.sort || 0) > this.time) return;
    p.cds.sort = this.time + 0.5;
    const order = (id) => { const it = ITEMS[id]; return it.slot === 'weapon' ? 0 : it.slot === 'gun' ? 1 : it.slot === 'outfit' ? 2 : it.slot ? 3 : it.mount ? 4 : it.boat ? 5 : it.use ? 6 : it.quest ? 8 : 7; };
    const items = p.inv.filter(Boolean);
    // regroupe les piles d'un même objet
    const merged = [];
    for (const s of items) { const m = isStackable(s.id) && merged.find((o) => o.id === s.id && o.n < STACK_MAX); if (m) { const k = Math.min(s.n, STACK_MAX - m.n); m.n += k; if (s.n - k > 0) merged.push({ id: s.id, n: s.n - k }); } else merged.push({ id: s.id, n: s.n }); }
    merged.sort((a, b) => order(a.id) - order(b.id) || (ITEMS[b.id].rarity || 0) - (ITEMS[a.id].rarity || 0) || ITEMS[a.id].name.localeCompare(ITEMS[b.id].name, 'fr'));
    for (let k = 0; k < p.inv.length; k++) p.inv[k] = merged[k] || null;
    p.dirtyInv = true;
  }
  // quêtes suivies à l'écran (quatre au plus), et abandon d'une quête en cours
  trackQuest(p, qid, on) {
    if (!QUESTS[qid]) return;
    p.track = (p.track || []).filter((q) => q !== qid && p.quests[q] && p.quests[q].s === 'active');
    if (on && p.quests[qid] && p.quests[qid].s === 'active') { p.track.unshift(qid); p.track = p.track.slice(0, 4); }
    p.dirtyQ = true;
  }
  abandonQuest(p, qid) {
    const q = QUESTS[qid], st = p.quests[qid];
    if (!q || !st || st.s !== 'active' || q.noAbandon) return;
    delete p.quests[qid];
    for (const g of q.goals) if (g.type === 'collect' && ITEMS[g.item] && ITEMS[g.item].quest && g.item !== 'conque_abysses') this.removeItem(p, g.item, this.countItem(p, g.item));
    p.track = (p.track || []).filter((x) => x !== qid);
    p.dirtyQ = true; p.dirtyInv = true;
    this.toast(p, `Quête abandonnée : ${q.name}. Vous pourrez la reprendre auprès de ${NPCS[q.giver].name}.`, 'info');
  }
  nearNpc(p, id, range = INTERACT_RANGE + 16) {
    const n = this.npcPos.get(id);
    return n && Math.hypot(n.x - p.x, n.y - p.y) <= range && npcVisible(NPCS[id], p.quests, p.level);
  }
  buy(p, npc, item) {
    const N = NPCS[npc];
    if (!N || !N.shop || !N.shop.includes(item) || !this.nearNpc(p, npc, 90)) return;
    const np = this.npcPos.get(npc), place = np ? this.placeAt(np.x, np.y) : null;
    const it = ITEMS[item], price = buyPrice(it.value, repLevel(p.rep[place] || 0)); // 1.0 : remise de réputation
    if (it.rep && repLevel(p.rep[it.rep[0]] || 0) < it.rep[1]) return this.toast(p, `${it.name} ne se vend qu’aux Héros de Libertalia (réputation la plus haute).`, 'warn'); // 1.0 : un navire légendaire
    if (it.unique && (this.countItem(p, item) > 0 || Object.values(p.eq).includes(item))) return this.toast(p, 'Vous possédez déjà cet objet unique.', 'warn');
    if (p.gold < price) return this.toast(p, 'Pas assez de doublons !', 'warn');
    const left = this.addItem(p, item, 1);
    if (left) return this.toast(p, 'Inventaire plein !', 'warn');
    p.gold -= price; p.dirtyMe = true;
    this.audit('achat', { who: p.key, item, price, npc, gold: p.gold });
    this.addRep(p, place, price / 100);
    this.send(p, { t: 'loot', id: item, n: 1, buy: price });
  }
  sell(p, i) {
    const s = p.inv[i];
    if (!s) return;
    const near = Object.keys(NPCS).find((id) => NPCS[id].shop && this.nearNpc(p, id, 90));
    if (!near) return this.toast(p, 'Il faut être près d’un marchand pour vendre.', 'warn');
    const np = this.npcPos.get(near), place = np ? this.placeAt(np.x, np.y) : null;
    const it = ITEMS[s.id];
    if (it.quest) return this.toast(p, 'Un objet de quête ne se vend pas.', 'warn');
    if (this.boatInUse(p, s.id)) return this.toast(p, 'Vous êtes à bord !', 'warn');
    const price = sellPrice(it.value, place, repLevel(p.rep[place] || 0)); // 1.0 : la ville prélève sa taxe
    s.n--; if (!s.n) p.inv[i] = null;
    p.gold += price; p.dirtyMe = true; p.dirtyInv = true; p.dirtyQ = true;
    this.audit('vente', { who: p.key, item: s.id, price, gold: p.gold });
    this.send(p, { t: 'sold', id: s.id, price });
  }
  openProp(p, id) {
    const pr = this.propById.get(id);
    if (!pr || p.dead || Math.hypot(pr.x - p.x, pr.y - p.y) > INTERACT_RANGE + 10) return;
    if (pr.type === 'chest') {
      const now = Date.now();
      const ck = 'i:' + pr.cache; // clé stable d'une version du monde à l'autre
      if (pr.cache && !p.caches[ck]) { // une cachette : l'arme est à vous, une fois
        p.caches[ck] = 1;
        this.giveOrDrop(p, pr.cache, 1);
        this.send(p, { t: 'loot', id: pr.cache, n: 1 });
        this.toast(p, `Cachette découverte : ${ITEMS[pr.cache].name} !`, 'quest');
        if (Object.keys(p.caches).filter((k) => k.startsWith('i:')).length >= 3) this.unlock(p, 'fouineur');
      }
      if ((p.chests[id] || 0) > now) return this.toast(p, `Ce coffre est vide. Il se remplira dans ${Math.ceil((p.chests[id] - now) / 60000)} min.`, 'warn');
      const L = CHEST_LOOT[pr.chest || 0];
      const gold = Math.round(rand(L.gold[0], L.gold[1]));
      p.gold += gold; p.dirtyMe = true;
      const got = [];
      for (const [item, ch, a, b] of L.items) if (Math.random() < ch) { const n = Math.round(rand(a, b)); this.giveOrDrop(p, item, n); got.push(`${ITEMS[item].name}${n > 1 ? ' x' + n : ''}`); }
      p.chests[id] = now + CHEST_COOLDOWN_MS;
      this.send(p, { t: 'chest', id, until: p.chests[id], gold, got });
      this.ev(pr.x, pr.y, ['fx', 'chest', pr.x, pr.y]);
    } else if (pr.type === 'tonnelet') {
      const st = p.quests.tonnelet;
      if (!st || st.s !== 'active') return this.toast(p, 'Un tonnelet de rhum... Il porte la marque de La Sirène Borgne.', 'info');
      if (this.countItem(p, 'tonnelet') > 0) return this.toast(p, 'Vous avez déjà le tonnelet.', 'info');
      if (this.addItem(p, 'tonnelet', 1)) return this.toast(p, 'Inventaire plein !', 'warn');
      this.send(p, { t: 'loot', id: 'tonnelet', n: 1 });
      this.toast(p, 'Tonnelet récupéré ! Rapportez-le à Bartholomé.', 'quest');
    }
  }

  // ------------------------------------------------------------ quêtes et PNJ
  onTalk(p, npc) {
    if (!NPCS[npc] || !this.nearNpc(p, npc)) return;
    if (!p.met.has(npc)) { p.met.add(npc); p.dirtyCodex = true; }
    for (const qid in p.quests) {
      const st = p.quests[qid];
      if (st.s !== 'active') continue;
      QUESTS[qid].goals.forEach((g, i) => { if (g.type === 'talk' && g.npc === npc && !st.p[i]) { st.p[i] = 1; p.dirtyQ = true; this.toast(p, `Objectif accompli : ${g.text}`, 'quest'); } });
    }
    this.flush(p);
    this.send(p, { t: 'talk', npc });
  }
  acceptQuest(p, qid) {
    const q = QUESTS[qid];
    if (!q || questState(qid, p.quests, p.level) !== 'available' || !this.nearNpc(p, q.giver)) return;
    p.quests[qid] = { s: 'active', p: q.goals.map(() => 0) };
    q.goals.forEach((g, i) => { if (g.type === 'explore' && p.zone === g.zone) p.quests[qid].p[i] = 1; });
    p.track = (p.track || []).filter((x) => p.quests[x] && p.quests[x].s === 'active' && x !== qid);
    if (p.track.length < 4) p.track.unshift(qid); // une nouvelle quête est suivie d'office (s'il reste de la place)
    p.dirtyQ = true;
    this.toast(p, `Nouvelle quête : ${q.name}`, 'quest');
  }
  turnIn(p, qid) {
    const q = QUESTS[qid], st = p.quests[qid];
    if (!q || !st || st.s !== 'active' || !this.nearNpc(p, q.turnin)) return;
    if (!goalsMet(qid, st, (id) => this.countItem(p, id))) return this.toast(p, 'Les objectifs ne sont pas remplis.', 'warn');
    for (const g of q.goals) if (g.type === 'collect') this.removeItem(p, g.item, g.n);
    p.quests[qid] = q.repeat ? { s: 'done', p: [], t: Date.now() } : { s: 'done', p: [] };
    p.st.quests++;
    p.track = (p.track || []).filter((x) => x !== qid);
    p.gold += q.rewards.gold || 0;
    for (const [id, n] of q.rewards.items || []) this.giveOrDrop(p, id, n);
    this.giveXp(p, q.rewards.xp || 0);
    const np = this.npcPos.get(q.turnin); if (np) this.addRep(p, this.placeAt(np.x, np.y), 30);
    if (q.ach) this.unlock(p, q.ach); // 1.0 : une fin choisie, un titre
    p.dirtyQ = true; p.dirtyMe = true;
    this.send(p, { t: 'qdone', q: qid });
    this.ev(p.x, p.y, ['fx', 'quest', p.x, p.y, p.id]);
    if (q.ach) this.unlock(p, q.ach);
  }
  questKill(p, type) {
    for (const qid in p.quests) {
      const st = p.quests[qid];
      if (st.s !== 'active') continue;
      QUESTS[qid].goals.forEach((g, i) => {
        if (g.type === 'kill' && g.mob === type && (st.p[i] || 0) < g.n) {
          st.p[i] = (st.p[i] || 0) + 1; p.dirtyQ = true;
          if (st.p[i] === g.n) this.toast(p, `Objectif accompli : ${g.text}`, 'quest');
        }
      });
    }
  }
  questAct(p, act) { // 0.8 : objectifs d'action (gagner aux dés...)
    for (const qid in p.quests) {
      const st = p.quests[qid];
      if (st.s !== 'active') continue;
      QUESTS[qid].goals.forEach((g, i) => {
        if (g.type === 'act' && g.act === act && (st.p[i] || 0) < g.n) {
          st.p[i] = (st.p[i] || 0) + 1; p.dirtyQ = true;
          if (st.p[i] === g.n) this.toast(p, `Objectif accompli : ${g.text}`, 'quest');
        }
      });
    }
  }
  // 0.8 : La Bourse aux Dés — deux dés chacun ; le plus haut total gagne la mise ; double six : le triple ; égalité : la maison gagne
  playDice(p, bet) {
    if (p.dead || !this.nearNpc(p, 'croupier', 110)) return;
    bet = Math.max(10, Math.min(500, Math.floor(bet) || 0));
    if (this.time - (p.lastDice || 0) < 1.0) return;
    if (p.gold < bet) return this.toast(p, 'Pas assez de doublons pour cette mise.', 'warn');
    p.lastDice = this.time;
    const r = () => 1 + Math.floor(Math.random() * 6);
    const a = [r(), r()], b = [r(), r()], sa = a[0] + a[1], sb = b[0] + b[1];
    const gain = sa > sb ? (sa === 12 ? bet * 2 : bet) : -bet;
    p.gold += gain; p.dirtyMe = true;
    this.audit('des', { who: p.key, bet, gain, gold: p.gold });
    if (gain > 0) { p.cnt.dice = (p.cnt.dice || 0) + 1; if (p.cnt.dice >= 10) this.unlock(p, 'flambeur'); this.questAct(p, 'dice_win'); }
    this.flush(p);
    this.send(p, { t: 'dice', a, b, gain, bet });
  }
  questZone(p, z) {
    for (const qid in p.quests) {
      const st = p.quests[qid];
      if (st.s !== 'active') continue;
      QUESTS[qid].goals.forEach((g, i) => { if (g.type === 'explore' && g.zone === z && !st.p[i]) { st.p[i] = 1; p.dirtyQ = true; this.toast(p, `Objectif accompli : ${g.text}`, 'quest'); } });
    }
  }

  // ------------------------------------------------------------ chat
  isSafeAt(p) { return SAFE.has(p.zone); }
  chat(p, msg, ch = 'local') {
    msg = msg.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
    if (!msg) return;
    if (this.time - p.lastChat < 0.7) return this.toast(p, 'Doucement, moussaillon !', 'warn');
    p.lastChat = this.time;
    if (msg[0] === '/') {
      const [cmd] = msg.slice(1).split(' ');
      const args = msg.slice(1).split(' ').slice(1), rest = (n) => args.slice(n).join(' ');
      // 1.0 : canaux, messages privés, amis, blocages, groupes, équipages, échanges
      const CH = { g: 'global', global: 'global', l: 'local', local: 'local', p: 'groupe', groupe: 'groupe', e: 'equipage', equipage: 'equipage', 'équipage': 'equipage' };
      if (CH[cmd] && cmd !== 'equipage' && cmd !== 'équipage') return rest(0) ? this.chatChannel(p, rest(0), CH[cmd]) : null;
      if (cmd === 'mp' || cmd === 'w' || cmd === 'chuchoter') return args[0] && rest(1) ? this.privateMsg(p, args[0], rest(1)) : this.sysTo(p, 'Usage : /mp <pirate> <message>');
      if (cmd === 'r') return p.replyTo && rest(0) ? this.privateMsg(p, p.replyTo, rest(0)) : this.sysTo(p, 'Personne à qui répondre.');
      if (cmd === 'ami') return this.socAction(p, 'friend', args[0]);
      if (cmd === 'amis') return this.sysTo(p, p.friends.size ? 'Amis : ' + [...p.friends].map((k) => `${k}${this.byName(k) ? ' (en mer)' : ''}`).join(', ') : 'Aucun ami pour l’instant : /ami <pirate>.');
      if (cmd === 'bloquer') return this.socAction(p, 'block', args[0]);
      if (cmd === 'debloquer' || cmd === 'débloquer') return this.socAction(p, 'unblock', args[0]);
      if (cmd === 'inviter') return this.socAction(p, 'invite', args[0]);
      if (cmd === 'quitter') return this.socAction(p, 'leave', '');
      if (cmd === 'echanger' || cmd === 'échanger') return this.tradeAction(p, 'ask', { name: args[0] });
      if (cmd === 'equipage' || cmd === 'équipage') {
        const sub = (args[0] || '').toLowerCase();
        if (sub === 'creer' || sub === 'créer') return this.crewAction(p, 'create', { name: args.slice(2).join(' '), tag: args[1] });
        if (['inviter', 'accepter', 'quitter', 'exclure', 'promouvoir', 'retrograder', 'rétrograder'].includes(sub)) return this.crewAction(p, { inviter: 'invite', accepter: 'accept', quitter: 'leave', exclure: 'kick', promouvoir: 'promote', retrograder: 'demote', 'rétrograder': 'demote' }[sub], { name: args[1] });
        return rest(0) ? this.chatChannel(p, rest(0), 'equipage') : this.sysTo(p, 'Usage : /equipage creer <SIGLE> <nom> · inviter · accepter · quitter · exclure · promouvoir · retrograder ; /e <message>');
      }
      if (cmd === 'who' || cmd === 'qui') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: `En ligne (${this.players.size}) : ${[...this.players.values()].map((q) => `${q.name} (niv. ${q.level})`).join(', ')}` });
      if (cmd === 'aide' || cmd === 'help') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: 'Canaux : /l local, /g global, /p groupe, /e équipage, /mp <pirate> privé, /r répondre. Social : /ami, /amis, /bloquer, /inviter, /quitter, /echanger <pirate>, /equipage. Divers : /qui, /pos, /suicide, /signaler <pirate> <motif>. Émotes : /danse /salut /rire /joie /colere /assis /doigt /salto (ou les touches 2 à 5).' });
      if (cmd === 'pos') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: `Position : ${Math.floor(p.x / TILE)}, ${Math.floor(p.y / TILE)} — ${p.room >= 0 ? this.world.rooms[p.room].name : ZONES[p.zone].name}${SAFE.has(p.zone) ? ' (zone sûre)' : ''}` });
      if (cmd === 'suicide' || cmd === 'unstuck') { if (!p.dead) this.killPlayer(p, null); return; }
      if (cmd === 'signaler' || cmd === 'report') { const [, who, ...why] = msg.slice(1).split(' '); if (!who) return this.send(p, { t: 'chat', from: null, kind: 'sys', m: 'Usage : /signaler <pirate> <motif>' }); return this.report(p, who, why.join(' ')); }
      const EMOTES = { danse: 'danse', salut: 'salut', rire: 'rire', colere: 'colere', 'colère': 'colere', joie: 'joie', assis: 'assis', doigt: 'doigt', salto: 'salto' };
      if (EMOTES[cmd]) { this.ev(p.x, p.y, ['emote', p.id, EMOTES[cmd]]); return; }
      return this.send(p, { t: 'chat', from: null, kind: 'sys', m: 'Commande inconnue. Tapez /aide.' });
    }
    this.chatChannel(p, msg, ['local', 'global', 'groupe', 'equipage'].includes(ch) ? ch : 'local');
  }

  // ------------------------------------------------------------ hauts faits
  unlock(p, id) {
    if (!ACHIEVEMENTS[id] || p.ach[id]) return;
    p.ach[id] = Date.now();
    this.send(p, { t: 'ach', id, ach: p.ach });
    this.ev(p.x, p.y, ['ach', p.id]);
    if (id === 'boss' || id === 'espadon') this.broadcastChat(null, `🏆 ${p.name} obtient le haut fait « ${ACHIEVEMENTS[id].name} » !`, 'sys');
  }
  setTitle(p, id) {
    if (id !== null && !p.ach[id]) return;
    p.title = id; p.lookVer++; p.dirtyMe = true;
  }
  // ------------------------------------------------------------ pêche
  onFish(p, a) {
    if (p.dead) return;
    if (p.fishing) return this.reel(p);
    if (!this.countItem(p, 'canne_peche')) return this.toast(p, 'Il vous faut une canne à pêche (Bartholomé en vend).', 'warn');
    if (!isFinite(a)) a = 0;
    let fx = 0, fy = 0, ok = false;
    for (const r of [26, 34, 20, 42]) {
      fx = p.x + Math.cos(a) * r; fy = p.y - 4 + Math.sin(a) * r;
      const t = tileAt(this.world, fx, fy);
      if ((t === T.WATER || t === T.DEEP || t === T.SWAMP) && !this.pointOnShip(fx, fy + 4)) { ok = true; break; }
    }
    if (!ok) return this.toast(p, 'Tournez-vous vers l’eau pour lancer la ligne.', 'warn');
    p.fishing = { x: fx, y: fy, px: p.x, py: p.y, lx: p.lx, ly: p.ly, sh: p.ship || 0, biteAt: this.time + rand(2.5, 7.5), state: 'wait', deep: tileAt(this.world, fx, fy) === T.DEEP };
    this.ev(p.x, p.y, ['fish', p.id, Math.round(fx), Math.round(fy)]);
  }
  updateFishing(p) {
    const f = p.fishing;
    if (f.sh ? (p.ship !== f.sh || Math.hypot(p.lx - f.lx, p.ly - f.ly) > 6 || Math.hypot(p.x - f.x, p.y - f.y) > 70) : Math.hypot(p.x - f.px, p.y - f.py) > 6) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); return; }
    if (f.state === 'wait' && this.time >= f.biteAt) { f.state = 'bite'; f.until = this.time + 1.0; this.send(p, { t: 'bite' }); this.ev(f.x, f.y, ['bite', p.id]); }
    else if (f.state === 'bite' && this.time > f.until) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); this.toast(p, 'Le poisson s’est échappé !', 'warn'); }
  }
  reel(p) {
    const f = p.fishing; p.fishing = null;
    if (f.state !== 'bite') { this.ev(p.x, p.y, ['fishend', p.id, 0]); return this.toast(p, 'Trop tôt ! Attendez que ça morde (!).', 'warn'); }
    const night = this.night, w = weatherAt(this.worldTime);
    const table = [['sardine', 40], ['bar', 26], ['dorade', 11 * (f.deep ? 1.6 : 1)], ['botte_rouillee', 8], ['bouteille_mer', 6], ['carte_dechiree', 3],
      ['espadon', (2 + w.storm * 7) * (f.deep ? 1.8 : 1)], ['poisson_lanterne', night ? 14 : 0],
      ['thon_rouge', f.deep ? 4 : 0], ['coelacanthe', f.deep && night ? 0.8 : 0], ['poisson_or', 0.35]]; // 1.0 : de nouvelles prises
    const tot = table.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * tot, item = 'sardine';
    for (const [id, wgt] of table) { if ((r -= wgt) <= 0) { item = id; break; } }
    this.giveOrDrop(p, item, 1);
    this.send(p, { t: 'loot', id: item, n: 1 });
    this.ev(f.x, f.y, ['fishend', p.id, 1, item]);
    if (ITEMS[item].use && ITEMS[item].use.heal || item === 'espadon') { p.cnt.fish++; this.unlock(p, 'peche'); }
    if (item === 'espadon') this.unlock(p, 'espadon');
    this.fishCaught(p, item); // 1.0 : la taille, les records, le concours
  }
  // ------------------------------------------------------------ trésors
  dig(p) {
    if (p.dead || !p.treasure) return;
    if (p.ship) return this.toast(p, 'Descendez d’abord à terre.', 'warn');
    if (Math.hypot(p.treasure.x - p.x, p.treasure.y - p.y) > 26) return this.toast(p, 'Ce n’est pas ici. Suivez la flèche jusqu’à la croix.', 'warn');
    const t = p.treasure; p.treasure = null;
    const gold = Math.round(rand(220, 420)); p.gold += gold; p.dirtyMe = true;
    const got = [];
    for (const [item, ch, a, b] of [['elixir_flamme', 0.5, 1, 2], ['rhum', 0.7, 1, 2], ['collier_requin', 0.15, 1, 1], ['boussole_maudite', 0.06, 1, 1], ['tromblon', 0.1, 1, 1], ['manteau_corsaire', 0.12, 1, 1], ['chapeau_capitaine', 0.05, 1, 1], ['carte_dechiree', 0.35, 1, 1], ['cimeterre', 0.08, 1, 1], ['pistolet_duel', 0.04, 1, 1], ['faux', 0.03, 1, 1], ['couleuvrine', 0.02, 1, 1]]) {
      if (Math.random() < ch) { const n = Math.round(rand(a, b)); this.giveOrDrop(p, item, n); got.push(ITEMS[item].name + (n > 1 ? ' x' + n : '')); }
    }
    this.send(p, { t: 'treasure', x: null });
    this.send(p, { t: 'chest', id: -1, until: 0, gold, got });
    this.ev(t.x, t.y, ['fx', 'dig', t.x, t.y]);
    this.unlock(p, 'tresor');
  }
  // ------------------------------------------------------------ forge
  upgrade(p, slot) {
    if (!UPG_SLOTS.includes(slot) || !this.nearNpc(p, 'isa', 90)) return;
    const L = p.upg[slot] || 0;
    if (L >= UPG_MAX) return this.toast(p, 'Déjà renforcé au maximum.', 'warn');
    if (!p.eq[slot]) return this.toast(p, 'Équipez d’abord un objet à cet emplacement.', 'warn');
    const c = upgradeCost(slot, L);
    if (p.gold < c.gold) return this.toast(p, 'Pas assez de doublons.', 'warn');
    for (const [id, n] of c.mats) if (this.countItem(p, id) < n) return this.toast(p, `Il manque : ${ITEMS[id].name} (${this.countItem(p, id)}/${n}).`, 'warn');
    p.gold -= c.gold;
    for (const [id, n] of c.mats) this.removeItem(p, id, n);
    p.upg[slot] = L + 1;
    this.recalc(p);
    const n = this.npcPos.get('isa');
    this.ev(n.x, n.y, ['fx', 'forge', n.x - 16, n.y - 2]);
    this.toast(p, `${ITEMS[p.eq[slot]].name} renforcé à +${L + 1} !`, 'level');
    if (L + 1 >= 3) this.unlock(p, 'forge');
  }
  // ------------------------------------------------------------ récolte
  bestTool(p, kind) { let t = 0; for (const s of p.inv) if (s && ITEMS[s.id].tool === kind) t = Math.max(t, ITEMS[s.id].tier || 1); return t; }
  broadcastAll(msg) { for (const q of this.players.values()) this.send(q, msg); }
  // 0.8 : plus de récolte. Seuls quelques décors donnent un objet de quête, à qui en réclame un.
  questPick(p, id) {
    const pr = this.propById.get(id);
    if (!pr || p.dead) return;
    const Q = QUEST_PICK[pr.type];
    if (!Q || Math.hypot(pr.x - p.x, pr.y - p.y) > 34 || this.questNeeds(p, Q.item) <= 0) return;
    if ((this.depleted.get(id) || 0) > this.time) return this.toast(p, 'Il n’y a plus rien ici pour l’instant.', 'warn');
    if ((p.cds.harvest || 0) > this.time) return;
    p.cds.harvest = this.time + 0.45;
    this.giveOrDrop(p, Q.item, 1);
    this.depleted.set(id, this.time + Q.regrow);
    this.broadcastAll({ t: 'dep', id, s: Q.regrow });
    this.send(p, { t: 'gather', got: [[Q.item, 1]] });
    this.ev(pr.x, pr.y, ['harv', p.id, id, pr.type]);
  }
  // ------------------------------------------------------------ bases
  structEntry(st) { return [st.type, st.tx, st.ty, st.oname || (this.bases.get(st.owner) ? this.bases.get(st.owner).name : ''), st.data && st.data.t ? Math.round((Date.now() - st.data.t) / 1000) : 0]; }
  buildSnapshot(key) {
    return {
      s: [...this.structs.values()].map((st) => this.structEntry(st)),
      f: [...this.floors.values()].map((f) => [f.type, f.tx, f.ty]),
      b: [...this.bases.values()].map((b) => [b.name, b.tx, b.ty, b.key === key ? 1 : 0]),
    };
  }
  addStruct(key, type, tx, ty, data = {}, broadcast = true, homeK = null) {
    const W = this.world, i = ty * W.W + tx, def = STRUCTS[type];
    if (!def) return false;
    const home = homeK != null ? this.homes.get(homeK) : null;
    if (def.floor) { if (this.floors.has(i)) return false; this.floors.set(i, { type, tx, ty, owner: key, home: homeK }); }
    else {
      if (this.structs.has(i) || W.solid[i]) return false;
      const st = { id: this.nextId++, type, tx, ty, x: tx * TILE + 8, y: ty * TILE + 14, owner: key, data, home: homeK, oname: home ? home.name : null };
      this.structs.set(i, st);
      if (def.solid) W.block[i] = def.solid;
      if (def.solid === 2) W.doorOwner.set(i, key);
    }
    if (home) home.count++;
    else { const b = this.bases.get(key); if (b) b.count++; }
    if (broadcast) { const st = this.structs.get(i); this.broadcastAll({ t: 'st', a: def.floor ? [] : [this.structEntry(st)], af: def.floor ? [[type, tx, ty]] : [] }); }
    this.worldDirty = true;
    return true;
  }
  removeStruct(i, floor = false, broadcast = true) {
    const W = this.world;
    const map = floor ? this.floors : this.structs;
    const st = map.get(i);
    if (!st) return null;
    map.delete(i);
    if (!floor) { W.block[i] = 0; W.doorOwner.delete(i); }
    if (st.home != null) { const h = this.homes.get(st.home); if (h) h.count--; }
    else { const b = this.bases.get(st.owner); if (b) b.count--; }
    if (broadcast) this.broadcastAll({ t: 'st', r: [[st.tx, st.ty, floor ? 1 : 0]] });
    this.worldDirty = true;
    return st;
  }
  place(p, slot, tx, ty) {
    const s = p.inv[slot];
    if (!s || p.dead || p.boat) return;
    const it = ITEMS[s.id];
    if (!it.place) return;
    const here = this.homeAt(p);
    if (here) return this.placeHome(p, slot, tx, ty, here);
    return this.toast(p, this.homeOf(p.key) ? 'Le mobilier s’installe chez vous : entrez dans une de vos propriétés.' : 'Le mobilier s’installe dans une maison : achetez-en une.', 'warn');
  }
  placeHome(p, slot, tx, ty, h) {
    const s = p.inv[slot], it = ITEMS[s.id], type = it.place, def = STRUCTS[type], W = this.world;
    if (!def.home && !HOME_OK.has(type)) return this.toast(p, 'Pas dans une maison !', 'warn');
    const r = W.rooms[W.plots[h.k].room];
    if (tx < r.x0 || ty < r.y0 || tx >= r.x0 + r.w || ty >= r.y0 + r.h) return this.toast(p, 'Hors de la pièce.', 'warn');
    const exx = r.x0 + (r.w >> 1);
    if (ty === r.y0 + r.h - 1 && Math.abs(tx - exx) <= 1) return this.toast(p, 'Laissez l’entrée libre.', 'warn');
    if (W.tiles[ty * W.W + tx] !== T.FLOOR) return this.toast(p, 'Impossible ici.', 'warn');
    if (h.count >= this.catOf(h.k).furniture) return this.toast(p, `${this.catOf(h.k).name} : ${this.catOf(h.k).furniture} meubles au plus.`, 'warn');
    if (type === 'coffre' && [...this.structs.values()].filter((st) => st.home === h.k && st.type === 'coffre' && !(st.data && st.data.free)).length >= this.catOf(h.k).extra) return this.toast(p, `Pas plus de ${this.catOf(h.k).extra} coffre(s) supplémentaire(s) ici.`, 'warn');
    if (!def.floor) for (const q of this.players.values()) if (q.room === p.room && Math.abs(q.x - (tx * TILE + 8)) < 12 && Math.abs(q.y - (ty * TILE + 10)) < 12) return this.toast(p, 'Quelqu’un se tient là.', 'warn');
    if (!this.addStruct(p.key, type, tx, ty, def.planter ? { t: Date.now() } : {}, true, h.k)) return this.toast(p, 'Emplacement occupé.', 'warn');
    s.n--; if (s.n <= 0) p.inv[slot] = null;
    p.dirtyInv = true;
    this.ev(tx * TILE + 8, ty * TILE + 10, ['fx', 'build', tx * TILE + 8, ty * TILE + 12]);
  }
  // ------------------------------------------------------------ maisons
  // 1.0 : jusqu'à deux propriétés par pirate, de huit catégories
  homesOf(key) { return [...this.homes.values()].filter((h) => h.key === key).sort((a, b) => (a.bought || 0) - (b.bought || 0)); }
  homeOf(key) { return this.homesOf(key)[0] || null; } // la première achetée : la conque de rappel y ramène
  homeAt(p) { for (const h of this.homes.values()) if (h.key === p.key && p.room >= 0 && this.world.plots[h.k].room === p.room) return h; return null; }
  catOf(k) { return PROPERTY[plotCategory(this.world.plots[k])] || PROPERTY.ville; }
  storeMax(k) { const c = this.catOf(k); return c.store + 16 * c.extra; }
  // places utilisables : celles de la catégorie, plus 16 par coffre supplémentaire installé (dans la limite de la catégorie)
  homeCap(h) { const c = this.catOf(h.k); const extra = [...this.structs.values()].filter((st) => st.home === h.k && st.type === 'coffre' && !(st.data && st.data.free)).length; return c.store + 16 * Math.min(extra, c.extra); }
  homeTraps(k) { return [...this.structs.values()].filter((st) => st.home === k && STRUCTS[st.type] && STRUCTS[st.type].trap); }
  homeVault(k) { return [...this.structs.values()].some((st) => st.home === k && STRUCTS[st.type] && STRUCTS[st.type].vault); }
  burgleChance(h) { // la chance qu'a un crocheteur adroit d'ouvrir la porte
    const dog = [...this.structs.values()].some((st) => st.home === h.k && st.type === 'pet_chien');
    return Math.max(0.08, 0.85 - 0.22 * h.lock - (dog ? 0.2 : 0) - 0.06 * Math.min(3, this.homeTraps(h.k).length) - this.catOf(h.k).guard);
  }
  deed(p, k) { // le titre de propriété : de quoi décider avant d'acheter, et de quoi gérer après
    const pl = this.world.plots[k]; if (!pl) return;
    const cat = plotCategory(pl), C = PROPERTY[cat], h = this.homes.get(k);
    const mine = h && h.key === p.key;
    const info = { t: 'deed', k, cat, name: pl.name, price: C.price, resale: Math.floor(((h && h.paid) || C.price) * RESALE), owner: h ? h.name : null, mine, owned: this.homesOf(p.key).length, limit: HOME_LIMIT,
      furniture: C.furniture, store: C.store, extra: C.extra, perk: C.perk };
    if (mine) Object.assign(info, { used: h.count, cap: this.homeCap(h), lock: h.lock, traps: this.homeTraps(k).length, vault: this.homeVault(k), risk: Math.round(this.burgleChance(h) * 100), items: h.storage.filter(Boolean).length });
    else if (!h) info.risk = Math.round(Math.max(0.08, 0.85 - C.guard) * 100);
    this.send(p, info);
  }
  homesList() { return [...this.homes.values()].map((h) => [h.k, h.name, h.lock, h.music || '']); }
  broadcastHomes() { this.broadcastAll({ t: 'homes', list: this.homesList() }); }
  homeAction(p, a, k) {
    const pl = this.world.plots[k];
    if (!pl || p.dead) return;
    const d = this.world.doors[pl.door];
    const C = this.catOf(k);
    if (a === 'info') return this.deed(p, k);
    if (a === 'buy') {
      if (p.room !== -1 || Math.hypot(p.x - d.ox, p.y - d.oy) > 40) return;
      if (this.homes.has(k)) return this.toast(p, 'Cette propriété a déjà un propriétaire.', 'warn');
      if (this.homesOf(p.key).length >= HOME_LIMIT) return this.toast(p, `Vous possédez déjà ${HOME_LIMIT} propriétés : revendez-en une d'abord.`, 'warn');
      if (p.gold < C.price) return this.toast(p, `Il vous faut ${C.price} doublons.`, 'warn');
      p.gold -= C.price; p.dirtyMe = true;
      this.homes.set(k, { k, key: p.key, name: p.name, storage: new Array(this.storeMax(k)).fill(null), lock: 0, count: 0, burgledAt: 0, bought: Date.now(), paid: C.price });
      this.freeChest(k);
      this.broadcastHomes(); this.worldDirty = true;
      this.audit('propriete-achat', { who: p.key, k, cat: plotCategory(pl), price: C.price, gold: p.gold });
      this.unlock(p, 'proprietaire');
      if (this.homesOf(p.key).length >= 2) this.unlock(p, 'notable');
      this.toast(p, `Vous voilà propriétaire : ${C.name} ! Un coffre vous attend à l'intérieur (${C.store} places). Meublez avec la touche B.`, 'quest');
      this.ev(d.ox, d.oy, ['fx', 'quest', d.ox, d.oy, p.id]);
    } else if (a === 'visit') { // aperçu avant achat : on entre visiter une propriété libre
      if (this.homes.has(k) || p.room !== -1 || p.boat || Math.hypot(p.x - d.ox, p.y - d.oy) > 40) return;
      p.cds.door = 0; p.visit = k;
      this.teleport(p, d.ix, d.iy, { door: d.id });
      this.toast(p, `Visite libre : ${C.name}. ${C.furniture} meubles, coffre de ${C.store} places. Sortez par la porte.`, 'info');
    } else if (a === 'sell') {
      const h = this.homes.get(k);
      if (!h || h.key !== p.key) return;
      if (h.storage.some(Boolean)) return this.toast(p, 'Videz d’abord vos coffres.', 'warn');
      for (const [i, st] of [...this.structs]) if (st.home === k) { this.removeStruct(i, false); if (!(st.data && st.data.free)) this.giveOrDrop(p, STRUCTS[st.type].item, 1); }
      for (const [i, f] of [...this.floors]) if (f.home === k) { this.removeStruct(i, true); this.giveOrDrop(p, STRUCTS[f.type].item, 1); }
      const back = Math.floor((h.paid || C.price) * RESALE);
      this.homes.delete(k); p.gold += back; p.dirtyMe = true;
      for (const q of this.players.values()) if (q.room === pl.room) this.teleport(q, d.rx, d.ry + 2, { door: d.id, out: 1 });
      this.broadcastHomes(); this.worldDirty = true;
      this.audit('propriete-vente', { who: p.key, k, back, gold: p.gold });
      this.toast(p, `${C.name} revendue : +${back} doublons. Votre mobilier est revenu dans votre sac.`, 'info');
    }
  }
  // le coffre offert avec la maison : contre le mur du fond, il ne se démonte pas
  freeChest(k) {
    const W = this.world, r = W.rooms[W.plots[k].room];
    if ([...this.structs.values()].some((st) => st.home === k && st.type === 'coffre')) return;
    const h = this.homes.get(k);
    for (const dx of [1, 2, r.w - 2, 3, r.w - 3, 0, r.w - 1]) {
      const tx = r.x0 + dx, ty = r.y0;
      if (tx < r.x0 || tx >= r.x0 + r.w || W.tiles[ty * W.W + tx] !== T.FLOOR) continue;
      if (this.addStruct(h.key, 'coffre', tx, ty, { free: 1 }, true, k)) return;
    }
  }
  // 0.8 : un pirate revient ; on lui rend ce que valaient sa base et ses matériaux
  addRefund(key, gold = 0, items = []) {
    if (!key || (!gold && !items.length)) return;
    const r = this.refunds.get(key) || { gold: 0, items: [] };
    r.gold += Math.round(gold); for (const it of items) r.items.push(it);
    this.refunds.set(key, r); this.worldDirty = true;
  }
  refundBase(key, d) { // une ancienne base : ses constructions en or, son coffre rapatrié
    if (!d) return;
    let gold = 0; const items = [];
    for (const [type] of [...(d.s || []), ...(d.f || [])]) { const it = STRUCTS[type] ? STRUCTS[type].item : LEGACY_STRUCT[type]; gold += (it && ITEMS[it] ? ITEMS[it].value : LEGACY_VALUE[it] || 0); }
    for (const c of d.storage || []) { if (!c) continue; if (ITEMS[c.id] && !ITEMS[c.id].quest) items.push({ id: c.id, n: Math.max(1, Math.min(STACK_MAX, c.n | 0)) }); else gold += (LEGACY_VALUE[c.id] || QUEST_ITEM_OLD_VALUE[c.id] || 0) * (c.n | 0); }
    this.addRefund(key, gold, items);
  }
  applyRefund(p) {
    const r = this.refunds.get(p.key);
    if (!r) return;
    this.refunds.delete(p.key); this.worldDirty = true;
    let gold = r.gold;
    const h = this.homeOf(p.key);
    for (const it of r.items) {
      let left = this.addItem(p, it.id, it.n);
      if (left && h) { const free = h.storage.findIndex((c) => !c); if (free >= 0) { h.storage[free] = { id: it.id, n: left }; left = 0; } }
      if (left) gold += Math.floor(ITEMS[it.id].value * 0.5) * left;
    }
    p.gold += gold; p.dirtyMe = true; p.dirtyInv = true;
    this.send(p, { t: 'chat', from: null, lvl: 0, m: `⚓ Les bases et l’artisanat ont disparu de l’archipel : vos constructions et vos matériaux ont été revendus (+${gold} doublons)${r.items.length ? ', le contenu de votre coffre vous est rendu' : ''}.`, kind: 'sys', pid: 0 });
  }
  exportHome(key) { const all = this.homesOf(key).map((h) => this.exportHomeData(h)); return all.length ? all : null; }
  exportHomeData(h) {
    const r = this.world.rooms[this.world.plots[h.k].room];
    return {
      k: h.k, storage: h.storage, lock: h.lock, bought: h.bought || 0, paid: h.paid || 0,
      s: [...this.structs.values()].filter((st) => st.home === h.k).map((st) => [st.type, st.tx - r.x0, st.ty - r.y0, st.data && st.data.t ? st.data.t : 0]),
      f: [...this.floors.values()].filter((f) => f.home === h.k).map((f) => [f.type, f.tx - r.x0, f.ty - r.y0]),
    };
  }
  importHome(key, name, d) {
    if (Array.isArray(d)) { for (const one of d) this.importHome(key, name, one); return; } // 1.0 : plusieurs propriétés
    if (!d || this.homesOf(key).length >= HOME_LIMIT) return;
    if (typeof d.k === 'number' && this.homes.has(d.k) && this.homes.get(d.k).key === key) return; // déjà chargée
    let k = typeof d.k === 'number' && this.world.plots[d.k] && !this.homes.has(d.k) ? d.k : -1;
    if (k < 0) k = this.world.plots.findIndex((pl) => !this.homes.has(pl.k) && plotCategory(pl) === 'ville');
    if (k < 0) return;
    const storage = new Array(Math.max(this.storeMax(k), Array.isArray(d.storage) ? d.storage.length : 0)).fill(null);
    let refund = 0;
    if (Array.isArray(d.storage)) d.storage.forEach((c, j) => { if (!c) return; if (ITEMS[c.id] && !ITEMS[c.id].quest) storage[j] = { id: c.id, n: Math.max(1, Math.min(STACK_MAX, c.n | 0)) }; else refund += (LEGACY_VALUE[c.id] || QUEST_ITEM_OLD_VALUE[c.id] || 0) * (c.n | 0); });
    for (const [type] of [...(d.s || []), ...(d.f || [])]) if (!STRUCTS[type] && LEGACY_STRUCT[type]) refund += LEGACY_VALUE[LEGACY_STRUCT[type]] || 0;
    if (refund) this.addRefund(key, refund);
    this.homes.set(k, { k, key, name, storage, lock: Math.max(0, Math.min(2, d.lock | 0)), count: 0, burgledAt: 0, bought: +d.bought || Date.now() - 1e9 + k, paid: +d.paid || 0 });
    const r = this.world.rooms[this.world.plots[k].room];
    const add = [], addf = [];
    for (const [type, dx, dy, t] of d.s || []) { const def = STRUCTS[type]; if (!def || def.floor) continue; const tx = r.x0 + (dx | 0), ty = r.y0 + (dy | 0); if (tx < r.x0 || ty < r.y0 || tx >= r.x0 + r.w || ty >= r.y0 + r.h) continue; if (this.addStruct(key, type, tx, ty, def.planter ? { t: t || Date.now() } : {}, false, k)) add.push(this.structEntry(this.structs.get(ty * this.world.W + tx))); }
    for (const [type, dx, dy] of d.f || []) { const def = STRUCTS[type]; if (!def || !def.floor) continue; const tx = r.x0 + (dx | 0), ty = r.y0 + (dy | 0); if (this.addStruct(key, type, tx, ty, {}, false, k)) addf.push([type, tx, ty]); }
    this.broadcastAll({ t: 'st', a: add, af: addf });
    this.freeChest(k);
    this.broadcastHomes();
  }
  removeHome(key) {
    const all = this.homesOf(key);
    if (all.length > 1) { for (const one of all) this.removeHomeK(one); return; }
    const h = all[0];
    if (!h) return;
    this.removeHomeK(h);
  }
  removeHomeK(h) {
    const r = [];
    for (const [i, st] of [...this.structs]) if (st.home === h.k) { this.structs.delete(i); this.world.block[i] = 0; this.world.doorOwner.delete(i); r.push([st.tx, st.ty, 0]); }
    for (const [i, f] of [...this.floors]) if (f.home === h.k) { this.floors.delete(i); r.push([f.tx, f.ty, 1]); }
    this.homes.delete(h.k);
    // les visiteurs (et voleurs) sortent
    const pl = this.world.plots[h.k], d = this.world.doors[pl.door];
    for (const q of this.players.values()) if (q.room === pl.room) this.teleport(q, d.rx, d.ry + 2, { door: d.id, out: 1 });
    this.broadcastAll({ t: 'st', r });
    this.broadcastHomes();
  }
  // ------------------------------------------------------------ cambriolage
  pickLock(p, k, ok) {
    const pl = this.world.plots[k], h = this.homes.get(k);
    if (!pl || !h || p.dead || p.boat || h.key === p.key) return;
    const d = this.world.doors[pl.door];
    if (p.room !== -1 || Math.hypot(p.x - d.ox, p.y - d.oy) > 44) return;
    if ((p.cds.pick || 0) > this.time) return;
    p.cds.pick = this.time + 4;
    if (!this.countItem(p, 'crochets')) return this.toast(p, 'Il vous faut des crochets de serrurier.', 'warn');
    if (Date.now() - (h.burgledAt || 0) < 10 * 60000) return this.toast(p, 'Cette maison vient d’être cambriolée : les volets sont cloués.', 'warn');
    if (Date.now() - (p.robbed[k] || 0) < 30 * 60000) return this.toast(p, 'Vous avez déjà cambriolé cette maison. Faites-vous oublier.', 'warn');
    const owner = [...this.players.values()].find((q) => q.key === h.key);
    const dog = [...this.structs.values()].some((st) => st.home === k && st.type === 'pet_chien');
    const chance = ok ? this.burgleChance(h) : 0;
    if (Math.random() >= chance) {
      this.removeItem(p, 'crochets', 1);
      if (dog) { this.ev(d.ox, d.oy, ['shout', 0, 'Ouaf ! Ouaf !']); if (owner) this.toast(owner, `Votre chien aboie : ${p.name} rôde autour de votre maison !`, 'warn'); }
      return this.send(p, { t: 'lock', ok: 0, msg: ok ? 'La serrure résiste : votre crochet casse.' : 'Raté : votre crochet casse.' });
    }
    if (Math.random() < 0.5) this.removeItem(p, 'crochets', 1);
    p.burgle = { k, until: this.time + 40, looted: false };
    p.thiefUntil = this.time + 300; p.lookVer++; p.dirtyMe = true;
    p.infamy = Math.min(20, (p.infamy || 0) + 1); // 1.0 : la Capitainerie note le crochetage
    this.send(p, { t: 'lock', ok: 1, msg: 'Clic ! La porte cède. 40 secondes pour fouiller un coffre.' });
    if (owner) this.toast(owner, `⚠ ${p.name} a crocheté la porte de votre maison !`, 'warn');
    p.cds.door = 0;
    this.teleport(p, d.ix, d.iy, { door: d.id });
    const traps = this.homeTraps(k); // un piège sur le passage : blessé, immobilisé, et le propriétaire prévenu
    if (traps.length && Math.random() < 0.25 + 0.15 * Math.min(3, traps.length)) {
      const tr = traps[Math.floor(Math.random() * traps.length)];
      this.teleport(p, tr.x, tr.y);
      p.grabbedUntil = this.time + 3;
      this.damagePlayer(p, Math.round(p.stats.maxHp * 0.3), null, false, 1); // les mâchoires ne se trompent pas (ni esquive ni armure)
      this.ev(tr.x, tr.y, ['shout', 0, 'CLAC !']);
      this.toast(p, 'Un piège à loup se referme sur votre cheville !', 'warn');
      if (owner) this.toast(owner, `Votre piège a attrapé ${p.name} chez vous !`, 'quest');
    }
  }
  burgleChest(p, st) {
    const h = this.homes.get(st.home);
    if (!h || !p.burgle || p.burgle.k !== st.home) return;
    if (p.burgle.looted) return this.toast(p, 'Vous avez déjà fouillé. Filez !', 'warn');
    p.burgle.looted = true; p.robbed[st.home] = Date.now(); h.burgledAt = Date.now();
    const got = [];
    const guarded = this.homeVault(st.home) ? 12 : 0; // le coffre-fort protège les 12 premières places ; les objets irremplaçables ne se volent jamais
    const full = h.storage.map((c, j) => [c, j]).filter(([c, j]) => c && j >= guarded && ITEMS[c.id] && !ITEMS[c.id].unique && (ITEMS[c.id].rarity || 0) < 3);
    if (full.length) {
      const [c, j] = full[Math.floor(Math.random() * full.length)];
      const n = Math.max(1, Math.ceil(c.n / 2));
      c.n -= n; if (c.n <= 0) h.storage[j] = null;
      this.giveOrDrop(p, c.id, n); got.push([c.id, n]);
    }
    if (Math.random() < (full.length ? 0.2 : 0.4)) {
      const tot = BURGLE_RARE.reduce((s2, [, w]) => s2 + w, 0);
      let r = Math.random() * tot, pick = BURGLE_RARE[0][0];
      for (const [id, w] of BURGLE_RARE) { if ((r -= w) <= 0) { pick = id; break; } }
      this.giveOrDrop(p, pick, 1); got.push([pick, 1]);
    }
    if (!got.length) { const gold = Math.round(rand(20, 60)); p.gold += gold; p.dirtyMe = true; got.push(['or', gold]); }
    this.send(p, { t: 'gather', got: got.filter(([id]) => id !== 'or') });
    if (got.some(([id]) => id === 'or')) this.send(p, { t: 'loot', id: 'or', n: got.find(([id]) => id === 'or')[1] });
    this.unlock(p, 'cambrioleur');
    this.worldDirty = true;
    this.broadcastChat(null, `🗝 ${p.name} a cambriolé la maison de ${h.name} !`, 'pvp');
    const owner = [...this.players.values()].find((q) => q.key === h.key);
    if (owner) this.toast(owner, `Votre maison a été cambriolée par ${p.name} !`, 'warn');
  }
  updateBurglars() {
    for (const p of this.players.values()) {
      if (!p.burgle) continue;
      if (this.time < p.burgle.until && !p.dead) continue;
      const pl = this.world.plots[p.burgle.k];
      p.burgle = null;
      if (pl && p.room === pl.room && !p.dead) { const d = this.world.doors[pl.door]; this.teleport(p, d.rx, d.ry + 2, { door: d.id, out: 1 }); this.toast(p, 'Vous filez par la fenêtre !', 'info'); }
    }
  }
  // ------------------------------------------------------------ les dalles des Jumeaux
  updateSeals() {
    for (const S of this.world.seals || []) {
      if (!S.plates || S.plates.length < 2) continue;
      const on = S.plates.map((pl) => [...this.players.values()].filter((q) => !q.dead && q.room === -1 && Math.hypot(q.x - pl.x, q.y - pl.y) < 11));
      const both = on[0].length && on[1].length && (on[0].some((a2) => on[1].some((b2) => b2 !== a2)));
      if (!both || this.seals[S.id] >= this.time + 5) continue;
      const was = this.seals[S.id] > this.time;
      this.seals[S.id] = this.time + S.open;
      this.broadcastAll({ t: 'seal', id: S.id, open: S.open });
      if (was) continue;
      const d = this.world.doors[S.door];
      this.ev(d.ox, d.oy, ['fx', 'seal', d.ox, d.oy - 16]);
      const names = [...new Set([...on[0], ...on[1]])].map((q) => { if (S.id === 'jumeaux') this.unlock(q, 'jumeaux'); return q.name; });
      this.broadcastChat(null, S.id === 'jumeaux' ? `🌗 ${names.join(' et ')} ont ouvert le Sanctuaire des Jumeaux !` : `🗝 ${names.join(' et ')} ont ouvert le Fort des Deux Clés !`, 'boss');
    }
  }
  unplace(p, tx, ty) {
    const W = this.world, i = ty * W.W + tx;
    let floor = false, st = this.structs.get(i);
    if (!st) { st = this.floors.get(i); floor = true; }
    if (!st || st.owner !== p.key || p.dead) return;
    if (Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 10 - p.y) > 96) return this.toast(p, 'Trop loin.', 'warn');
    const base = this.bases.get(p.key);
    if (st.type === 'coffre' && st.home != null) { const h = this.homes.get(st.home); const others = [...this.structs.values()].filter((o) => o.home === st.home && o.type === 'coffre').length; if (h && others <= 1 && h.storage.some(Boolean)) return this.toast(p, 'Videz d’abord votre coffre.', 'warn'); }
    if (st.data && st.data.free) return this.toast(p, 'Ce coffre fait partie de la maison.', 'info');
    this.removeStruct(i, floor);
    this.giveOrDrop(p, STRUCTS[st.type].item, 1);
    if (st.type === 'lit' && p.respawnAt && p.respawnAt.tx === tx && p.respawnAt.ty === ty) p.respawnAt = null;
  }
  structInteract(p, tx, ty) {
    const W = this.world, st = this.structs.get(ty * W.W + tx);
    if (!st || p.dead || Math.hypot(st.x - p.x, st.y - p.y) > 40) return;
    const mine = st.owner === p.key;
    if (st.home != null && !mine && st.type === 'coffre') return this.burgleChest(p, st);
    // 1.0 : on s'assoit, on lit, on choisit la musique de la maison
    if (st.type === 'chaise_h') { this.ev(p.x, p.y, ['emote', p.id, 'assis']); return; }
    if (st.type === 'biblio_h') { const L = LORE_PAGES[Math.floor(Math.random() * LORE_PAGES.length)]; return this.send(p, { t: 'chat', from: null, kind: 'sys', m: `📖 ${L}` }); }
    if (STRUCTS[st.type].music && st.home != null) {
      const h = this.homes.get(st.home); if (!h) return;
      if (!mine) return this.toast(p, 'La boîte à musique n’obéit qu’à son propriétaire.', 'info');
      const known = HOUSE_MUSIC.filter(([k]) => !k || p.songs.has(k)); // seulement les airs notés dans le carnet
      const i = known.findIndex(([k]) => k === (h.music || '')); const nx = known[(i + 1) % known.length];
      h.music = nx[0]; this.worldDirty = true; this.broadcastHomes();
      return this.toast(p, `Boîte à musique : ${nx[1]}.${known.length < HOUSE_MUSIC.length ? ` (${known.length - 1}/${HOUSE_MUSIC.length - 1} airs dans votre carnet : écoutez le monde pour en noter d’autres)` : ''}`, 'info');
    }
    if (STRUCTS[st.type].pet) {
      if (!mine) return this.toast(p, 'Il vous regarde de travers.', 'info');
      p.pet = p.pet === STRUCTS[st.type].pet ? null : STRUCTS[st.type].pet; p.lookVer++; p.dirtyMe = true;
      return this.toast(p, p.pet ? 'Votre compagnon vous suit.' : 'Votre compagnon reste à la maison.', 'info');
    }
    if (st.type === 'lit') {
      if (!mine) return this.toast(p, 'Ce n’est pas votre lit.', 'warn');
      p.respawnAt = { tx, ty }; p.hp = p.stats.maxHp; p.dirtyMe = true;
      return this.toast(p, 'Vous vous reposez. Vous réapparaîtrez ici.', 'quest');
    }
    if (st.type === 'coffre') { if (!mine || st.home == null) return this.toast(p, 'Ce coffre est verrouillé.', 'warn'); p.store = { home: st.home }; return this.chestAction(p, 'open', 0); }
    if (st.type === 'jardiniere') {
      const ready = Date.now() - (st.data.t || 0) >= PLANTER_GROW * 1000;
      if (!ready) return this.toast(p, `Ça pousse… encore ${Math.ceil((PLANTER_GROW * 1000 - (Date.now() - st.data.t)) / 60000)} min.`, 'info');
      st.data.t = Date.now();
      const got = [['banane', Math.floor(rand(1, 4))], ['baies', Math.floor(rand(1, 4))]];
      if (Math.random() < 0.4) got.push(['noix_coco', 1]);
      for (const [id, n] of got) if (n > 0) this.giveOrDrop(p, id, n);
      this.send(p, { t: 'gather', got: got.filter(([, n]) => n > 0) });
      this.broadcastAll({ t: 'st', a: [this.structEntry(st)] });
      this.worldDirty = true;
    }
  }
  chestAction(p, a, slot) {
    if (p.dead) return;
    const homeK = p.store && p.store.home != null ? p.store.home : null;
    const h = homeK != null ? this.homes.get(homeK) : null;
    if (!h || h.key !== p.key) return;
    let near = false;
    for (const st of this.structs.values()) if (st.type === 'coffre' && st.owner === p.key && (st.home ?? null) === homeK && Math.hypot(st.x - p.x, st.y - p.y) < 48) near = true;
    if (!near) return;
    const S = h.storage, cap = this.homeCap(h);
    while (S.length < this.storeMax(h.k)) S.push(null);
    if (a === 'put') {
      const it = p.inv[slot];
      if (!it || ITEMS[it.id].quest || this.boatInUse(p, it.id)) return;
      let n = it.n;
      if (isStackable(it.id)) for (let j = 0; j < cap && n; j++) { const c = S[j]; if (c && c.id === it.id && c.n < STACK_MAX) { const k = Math.min(n, STACK_MAX - c.n); c.n += k; n -= k; } }
      if (n > 0) { let free = -1; for (let j = 0; j < cap; j++) if (!S[j]) { free = j; break; } if (free < 0) { it.n = n; p.dirtyInv = true; return this.toast(p, 'Le coffre est plein. Un coffre supplémentaire ajoute 16 places.', 'warn'); } S[free] = { id: it.id, n }; }
      p.inv[slot] = null; p.dirtyInv = true; p.dirtyQ = true;
    } else if (a === 'take') {
      const c = S[slot];
      if (!c) return;
      const left = this.addItem(p, c.id, c.n);
      if (left) { c.n = left; this.toast(p, 'Inventaire plein !', 'warn'); } else S[slot] = null;
    }
    this.worldDirty = true;
    this.send(p, { t: 'stor', items: S, cap, vault: this.homeVault(h.k) ? 12 : 0 });
  }
  updateTurrets() {
    for (const st of this.structs.values()) {
      if (st.type !== 'canon_def') continue;
      let owner = null;
      for (const q of this.players.values()) if (q.key === st.owner) owner = q;
      if (!owner || owner.dead || (st.data.cd || 0) > this.time) continue;
      let best = null, bd = 150;
      for (const m of this.mobs) { if (m.state === 'dead') continue; const d = Math.hypot(m.x - st.x, m.y - st.y); if (d < bd) { bd = d; best = m; } }
      if (!best) continue;
      st.data.cd = this.time + 2.2;
      const a = Math.atan2(best.y - 8 - (st.y - 12), best.x - st.x);
      this.spawnProj(st.x, st.y - 12, a, 240, 175, 18 + owner.level * 2, 'p', owner.id, 'cball', 0, false, false);
    }
  }
  // persistance des bases
  exportBase(key) {
    const b = this.bases.get(key);
    if (!b) return null;
    return {
      tx: b.tx, ty: b.ty, storage: b.storage,
      s: [...this.structs.values()].filter((st) => st.owner === key).map((st) => [st.type, st.tx, st.ty, st.data && st.data.t ? st.data.t : 0]),
      f: [...this.floors.values()].filter((f) => f.owner === key).map((f) => [f.type, f.tx, f.ty]),
    };
  }
  importBase(key, name, d) { this.refundBase(key, d); } // 0.8 : les bases ont disparu
  removeBase(key) {
    const b = this.bases.get(key);
    if (!b) return;
    const r = [];
    for (const [i, st] of [...this.structs]) if (st.owner === key) { this.structs.delete(i); this.world.block[i] = 0; this.world.doorOwner.delete(i); r.push([st.tx, st.ty, 0]); }
    for (const [i, f] of [...this.floors]) if (f.owner === key) { this.floors.delete(i); r.push([f.tx, f.ty, 1]); }
    this.bases.delete(key);
    this.broadcastAll({ t: 'st', r, rb: [b.name] });
  }
  exportWorld() { return { v: 2, sv: SAVE_VERSION, bases: [], homes: [...this.homes.values()].map((h) => ({ ...this.exportHomeData(h), key: h.key, name: h.name })), refunds: [...this.refunds].map(([key, r]) => [key, r.gold, r.items]) }; }
  importWorld(w) {
    if (!w) return;
    if ((w.sv | 0) > SAVE_VERSION) { this.worldFrozen = true; this.log(`[monde] sauvegarde du monde v${w.sv} plus récente que le serveur : chargée en lecture seule, jamais écrasée`); }
    for (const b of w.bases || []) this.refundBase(b.key, b);
    for (const h of w.homes || []) this.importHome(h.key, h.name, h);
    for (const [key, gold, items] of w.refunds || []) this.addRefund(key, gold | 0, Array.isArray(items) ? items.filter((it) => it && ITEMS[it.id]) : []);
    this.log(`[monde] ${this.homes.size} maison(s) chargée(s), ${this.refunds.size} remboursement(s) en attente`);
  }

  // ------------------------------------------------------------ boucle
  tick() { // 1.0 : durée de chaque tour mesurée (moyenne glissante et pire cas sur 10 s)
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    this.tickInner();
    this.socialTick();
    if (t0) { const ms = performance.now() - t0; this.tickMs = (this.tickMs || ms) * 0.95 + ms * 0.05; if (this.tickCount % 200 === 0) this.tickMax = 0; this.tickMax = Math.max(this.tickMax || 0, ms); }
  }
  tickInner() {
    this.time += DT;
    this.tickCount++;
    this.worldTime += DT;
    const f = dayFrac(this.worldTime), n = isNight(f);
    if (n !== this.night) {
      this.night = n;
      const full = isFullMoon(this.worldTime);
      if (n) {
        this.broadcastChat(null, full ? '🌕 La pleine lune se lève : la Horde des morts déferle sur l’archipel !' : 'La nuit tombe... Les morts sortent de terre et deviennent plus forts.', full ? 'boss' : 'night');
        for (const m of this.mobs) if (m.buried) this.later(rand(0.5, 9), () => { if (m.buried && this.night) this.rise(m); });
        this.hordeAt = this.time + 6;
      } else {
        this.broadcastChat(null, 'Le soleil se lève : les morts qui ne le supportent pas brûlent et retournent sous terre.', 'night');
        for (const m of this.mobs) if (m.state !== 'dead' && ((m.def.night && !m.sunproof) || m.horde)) m.burnAt = this.time + rand(0.3, 7);
      }
    }
    if (this.night && isFullMoon(this.worldTime) && this.time >= this.hordeAt) this.updateHorde();
    // joueurs : régénération, effets
    for (const p of this.players.values()) {
      if (p.dead) continue;
      const inTown = SAFE.has(p.zone);
      const ooc = this.time - p.lastHurt > 6;
      const reg = p.stats.regen * (inTown ? 5 : ooc ? 2 : 1);
      const before = Math.ceil(p.hp), beforeEn = Math.floor(p.en);
      if (p.hp < p.stats.maxHp) p.hp = Math.min(p.stats.maxHp, p.hp + reg * DT);
      if (this.time < p.rumUntil) p.hp = Math.min(p.stats.maxHp, p.hp + p.rumRate * DT);
      if (p.en < p.stats.maxEn) p.en = Math.min(p.stats.maxEn, p.en + 7 * DT);
      if (Math.ceil(p.hp) !== before || Math.floor(p.en) !== beforeEn) p.dirtyMe = true;
      if (this.time - p.lastSave > 30) this.save(p);
      if ((this.tickCount + p.id) % 20 === 0) {
        this.markSeen(p);
        p.st.time += 1;
        if (p.goldLast != null) { const dg = p.gold - p.goldLast; if (dg > 0) p.st.gin += dg; else p.st.gout -= dg; }
        p.goldLast = p.gold;
        if (p.dirtyCodex) { p.dirtyCodex = false; this.send(p, { t: 'codex', kc: p.kc, met: [...p.met], col: [...p.col], st: p.st }); }
        this.justiceTick(p);
        this.act3Tick(p);
        this.seaTick(p);
        if (p.race) this.raceCheck(p);
      }
      if (p.fishing) this.updateFishing(p);
      if (p.gold >= 1000 && !p.ach.riche) this.unlock(p, 'riche');
    }
    if (this.tickCount % 10 === 0) { this.updateDots(); this.updateClouds(); }
    if (this.tickCount % 5 === 0) { this.updateSeals(); this.updateBurglars(); }
    if (this.tickCount % 10 === 0) this.updateKraken();
    if (this.tickCount % 5 === 0) for (const p of this.players.values()) this.updateBuffs(p);
    if (this.tickCount % 5 === 0) this.updateVolcano();
    if (this.tickCount % 20 === 0) { this.justiceGlobalTick(); this.eventTick(); }
    if (this.tickCount % 1200 === 0) this.seasonRoll(); // une fois par minute : la saison a-t-elle changé ?
    if (this.tickCount % 5 === 0) { this.arenaTick(); this.dungeonTick(); }
    this.shipsTick();
    if (this.tickCount % 40 === 0 && this.players.size > 1) { // les autres pirates sur la carte
      const pl = [...this.players.values()].map((q) => [q.id, q.name, Math.round(q.x), Math.round(q.y), q.room, q.dead ? 1 : 0, this.isWanted(q) ? 1 : 0]);
      for (const p of this.players.values()) this.send(p, { t: 'map', pl });
    }
    this.updateAllies();
    if (this.worldPersist && !this.worldFrozen && this.worldDirty && this.time - this.lastWorldSave > 8) { this.worldDirty = false; this.lastWorldSave = this.time; Promise.resolve(this.storage.saveWorld(this.exportWorld())).catch(() => {}); }
    this.updateMobs();
    this.updateProjs();
    for (const [id, d] of this.drops) if (this.time > d.expire) this.drops.delete(id);
    this.broadcastState();
    this.events.length = 0;
  }
  flush(p) {
    if (p.dirtyMe) { p.dirtyMe = false; this.send(p, Object.assign({ t: 'me' }, this.meState(p))); }
    if (p.dirtyInv) { p.dirtyInv = false; this.send(p, { t: 'inv', inv: p.inv, eq: p.eq }); }
    if (p.dirtyQ) { p.dirtyQ = false; this.send(p, { t: 'q', q: p.quests, tr: p.track || [] }); }
  }
  entMeta(e, kind) {
    if (kind === 'p') return { cw: e.crew && this.crews.get(e.crew) ? this.crews.get(e.crew).tag : '', id: e.id, k: 'p', name: e.name, look: e.look, lvl: e.level, x: Math.round(e.x), y: Math.round(e.y), w: e.eq.weapon, g: e.eq.gun, dead: e.dead, ti: e.title ? ACHIEVEMENTS[e.title].title : '', bt: e.boat ? ITEMS[e.boat].boat.kind : '', pt: e.pet || '', vo: this.time < e.thiefUntil ? 1 : 0, rd: e.riding && e.eq.mount ? ITEMS[e.eq.mount].mount.kind : '', wd: this.isWanted(e) ? 1 : 0, pr: this.isProtected(e) ? 1 : 0, gl: e.glory | 0, ab: e.aboard || 0 };
    if (kind === 'm') return { id: e.id, k: 'm', type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp), mhp: e.maxHp, sun: e.def.night && e.sunproof && !e.horde ? 1 : 0, hd: e.horde ? 1 : 0 };
    return { id: e.id, k: 'd', item: e.item, n: e.n, x: Math.round(e.x), y: Math.round(e.y), own: e.owner, ou: Math.max(0, +(e.ownUntil - this.time).toFixed(1)) };
  }
  broadcastState() {
    const T = Math.round(this.time * 1000);
    const sendTime = this.tickCount % 20 === 0;
    for (const p of this.players.values()) {
      const ent = [], pos = [], seen = new Map();
      const near = (o) => o.room === p.room && Math.abs(o.x - p.x) < AOI_X && Math.abs(o.y - p.y) < AOI_Y;
      for (const q of this.players.values()) {
        if (q === p || !near(q)) continue;
        seen.set(q.id, q.lookVer + 1000 * q.level);
        if (p.known.get(q.id) !== q.lookVer + 1000 * q.level) ent.push(this.entMeta(q, 'p'));
        const fl = (q.moving ? 1 : 0) | (q.dead ? 2 : 0) | (this.time < q.invulnUntil ? 4 : 0) | (this.time < q.cry ? 8 : 0) | (q.ship ? 16 : 0), hp = Math.round(q.hp / q.stats.maxHp * 100);
        pos.push(q.ship ? [q.id, Math.round(q.lx), Math.round(q.ly), q.dir, fl, hp, q.ship] : [q.id, Math.round(q.x), Math.round(q.y), q.dir, fl, hp]);
      }
      for (const m of this.mobs) {
        if (m.state === 'dead' || !near(m)) continue;
        seen.set(m.id, 0);
        if (!p.known.has(m.id)) ent.push(this.entMeta(m, 'm'));
        pos.push([m.id, Math.round(m.x), Math.round(m.y), m.dir, (m.moving ? 1 : 0) | (m.windup ? 2 : 0) | (m.state === 'return' ? 4 : 0) | (m.under ? 8 : 0) | (m.shieldUntil > this.time ? 16 : 0) | (m.phase ? m.phase << 5 : 0), Math.round(m.hp / m.maxHp * 100)]);
      }
      for (const a of this.allies) {
        if (!near(a)) continue;
        seen.set(a.id, a.ver);
        if (p.known.get(a.id) !== a.ver) ent.push({ id: a.id, k: 'a', name: a.name, cap: a.cap, x: Math.round(a.x), y: Math.round(a.y), sink: a.sink });
        pos.push([a.id, Math.round(a.x), Math.round(a.y), a.dir, (a.moving ? 1 : 0) | (a.sink ? 2 : 0), 100]);
      }
      const shp = [];
      if (p.room === -1) for (const sh of this.ships.values()) { // 1.1 : les navires (de plus loin : ils sont grands)
        if (Math.abs(sh.x - p.x) > AOI_X + 160 || Math.abs(sh.y - p.y) > AOI_Y + 160) continue;
        seen.set(sh.id, sh.ver);
        if (p.known.get(sh.id) !== sh.ver) ent.push(this.shipMeta(sh));
        shp.push(this.shipLine(sh));
      }
      for (const d of this.drops.values()) {
        if (!near(d)) continue;
        seen.set(d.id, d.n);
        if (p.known.get(d.id) !== d.n) ent.push(this.entMeta(d, 'd'));
      }
      const rm = [];
      for (const id of p.known.keys()) if (!seen.has(id)) rm.push(id);
      p.known = seen;
      const ev = [];
      for (const e of this.events) if (e.r === p.room && Math.abs(e.x - p.x) < AOI_X + 60 && Math.abs(e.y - p.y) < AOI_Y + 60) ev.push(e.e);
      const msg = { t: 's', T, e: pos };
      if (shp.length) msg.sh = shp;
      if (ent.length) msg.n = ent;
      if (rm.length) msg.r = rm;
      if (ev.length) msg.ev = ev;
      if (sendTime) { msg.wt = +this.worldTime.toFixed(2); msg.on = this.players.size; msg.wd = [+this.wind.a.toFixed(2), +this.wind.s.toFixed(2)]; }
      this.send(p, msg);
      this.flush(p);
    }
  }
}
// 1.0 : discussions, groupes, équipages et échanges (server/social.js)
Object.assign(Game.prototype, social);
Object.assign(Game.prototype, justice); // 1.0 : protection, infamie, primes, honneur, Geôle
Object.assign(Game.prototype, events); // 1.0 : les invasions rares et annoncées
Object.assign(Game.prototype, arena); // 1.0 : l'Arène de la Fosse
Object.assign(Game.prototype, tavern); // 1.0 : les jeux de taverne
Object.assign(Game.prototype, naval); // 1.0 : les coques
Object.assign(Game.prototype, shipsLogic); // 1.1 : les vrais navires (à quai, sur le pont, aux postes)
Object.assign(Game.prototype, dungeonLogic); // 1.0 : le Bastion Englouti
Object.assign(Game.prototype, sea); // 1.0 : les fonds marins
Object.assign(Game.prototype, seasons); // 1.0 : saisons, concours de pêche, Grand Tour
