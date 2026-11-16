// Simulation autoritaire du monde. Aucune dépendance à Node : ce module tourne
// aussi dans le navigateur pour le mode solo.
import {
  TILE, TICK_RATE, AOI_X, AOI_Y, INV_SIZE, SLOTS, DAY_LENGTH, ROLL_TIME, ROLL_SPEED,
  INTERACT_RANGE, PICKUP_RANGE, T, dayFrac, isNight, weatherAt, DAY_LENGTH as DAYLEN,
} from '../shared/constants.js';
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { HARVEST, STRUCTS, RECIPE, STATIONS, CLAIM_R, BASE_MAX, PLANTER_GROW } from '../shared/data/craft.js';
import { generateWorld, canStand, moveWithCollision, zoneAt, tileAt, blocksShot, canSail, roomIdAt, Z, ZONES, SAFE } from '../shared/world.js';
import { ITEMS, STACK_MAX, isStackable } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { QUESTS, questState, goalsMet } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS } from '../shared/data/skills.js';
import { computeStats, xpToNext, mitigate, displayLook, sanitizeLook, MAX_LEVEL, UPG_SLOTS, UPG_MAX, upgradeCost } from '../shared/formulas.js';

const DT = 1 / TICK_RATE;
const PVP_MUL = 0.6; // les dégâts entre joueurs sont réduits
const NAME_RE = /^[\p{L}0-9][\p{L}0-9 _'-]{1,14}[\p{L}0-9]$/u;
const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const dirOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);

const CHEST_LOOT = [
  { gold: [15, 35], items: [['banane', 0.8, 2, 4], ['noix_coco', 0.5, 1, 2], ['bandana', 0.15, 1, 1], ['chapeau_paille', 0.15, 1, 1], ['bottes_usees', 0.2, 1, 1], ['carte_dechiree', 0.3, 1, 1], ['poignard', 0.12, 1, 1]] },
  { gold: [40, 80], items: [['poisson_grille', 0.8, 2, 3], ['grog', 0.6, 1, 2], ['coutelas', 0.2, 1, 1], ['gilet_cuir', 0.15, 1, 1], ['collier_requin', 0.1, 1, 1], ['carte_dechiree', 0.4, 1, 1], ['perle_ombre', 0.15, 1, 1], ['pistolet_double', 0.06, 1, 1], ['machette', 0.08, 1, 1], ['poivriere', 0.03, 1, 1]] },
  { gold: [90, 160], items: [['rhum', 0.9, 1, 3], ['perle_ombre', 0.6, 1, 2], ['tromblon', 0.12, 1, 1], ['manteau_corsaire', 0.15, 1, 1], ['amulette_lanterne', 0.08, 1, 1], ['carte_dechiree', 0.5, 1, 2], ['cimeterre', 0.1, 1, 1], ['poivriere', 0.08, 1, 1], ['carabine', 0.06, 1, 1], ['crache_feu', 0.04, 1, 1]] },
  { gold: [80, 160], items: [['rhum', 0.8, 1, 2], ['perle_ombre', 0.6, 1, 2], ['carte_dechiree', 0.5, 1, 2], ['eclat_cristal', 0.3, 1, 2], ['elixir_flamme', 0.3, 1, 1]] },
];
const CHEST_COOLDOWN_MS = 15 * 60 * 1000;
const INV_WAVES = [[['zsailor', 6], ['crab', 3]], [['drowned', 5], ['buccaneer', 3]], [['capitaine_noye', 1], ['drowned', 3], ['zsailor', 3]]];

export class Game {
  constructor({ storage, log = console.log, seed = 7, solo = false }) {
    this.world = generateWorld(seed);
    this.storage = storage;
    this.log = log;
    this.solo = solo;
    this.nextId = 1;
    this.players = new Map();
    this.sessions = new Map(); // conn -> session { player, bucket, lastMsg }
    this.mobs = [];
    this.drops = new Map();
    this.projs = [];
    this.bombs = [];
    this.teles = [];
    this.timers = [];
    this.time = 0;
    this.worldTime = DAY_LENGTH * 0.08;
    this.events = [];
    this.night = isNight(dayFrac(this.worldTime));
    this.propById = new Map(this.world.props.map((p) => [p.id, p]));
    this.npcPos = new Map(this.world.npcs.map((n) => [n.id, n]));
    this.secretDoors = this.world.doors.filter((d) => d.secret);
    for (const s of this.world.spawns) this.addMob(s.mob, s.x, s.y);
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
    this.invCenter = { x: 124 * TILE + 8, y: 110 * TILE + 8 };
    for (let r = 0; r < 12; r++) { let found = false; for (let a = 0; a < 16 && !found; a++) { const x = 124 * TILE + Math.cos(a / 16 * 6.28) * r * TILE, y = 111 * TILE + Math.sin(a / 16 * 6.28) * r * TILE; if (canStand(W, x, y, true) && tileAt(W, x, y) === T.SAND) { this.invCenter = { x, y }; found = true; } } if (found) break; }
    this.invasion = null; this.invNight = -1;
    // artisanat et bases
    this.depleted = new Map();
    this.structs = new Map(); this.floors = new Map(); this.bases = new Map();
    this.worldPersist = !!(storage && typeof storage.saveWorld === 'function');
    this.worldDirty = false; this.lastWorldSave = 0;
    const at = (type) => this.world.props.filter((pp) => pp.type === type).map((pp) => [pp.x, pp.y]);
    this.townStations = { feu: at('brazier'), etabli: at('workbench'), forge: [...at('anvil'), ...at('forge')] };
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
    this.save(p);
    this.players.delete(p.id);
    if (!this.worldPersist) this.removeBase(p.key);
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
      case 'qt': return this.turnIn(p, String(m.q));
      case 'buy': return this.buy(p, String(m.npc), String(m.item));
      case 'sell': return this.sell(p, m.slot | 0);
      case 'use': return this.useSlot(p, m.slot | 0);
      case 'eat': return this.eatBest(p);
      case 'equip': return this.equip(p, m.slot | 0);
      case 'unequip': return this.unequip(p, String(m.s));
      case 'swap': return this.swap(p, m.a | 0, m.b | 0);
      case 'drop': return this.dropSlot(p, m.slot | 0);
      case 'pick': return this.pick(p, m.id | 0);
      case 'open': return this.openProp(p, m.id | 0);
      case 'chat': return this.chat(p, String(m.m || ''));
      case 'respawn': return this.respawn(p);
      case 'ping': return this.send(p, { t: 'pong', c: m.c });
      case 'fish': return this.onFish(p, +m.a);
      case 'dig': return this.dig(p);
      case 'upg': return this.upgrade(p, String(m.s));
      case 'title': return this.setTitle(p, m.id == null ? null : String(m.id));
      case 'harvest': return this.harvest(p, m.id | 0);
      case 'craft': return this.craft(p, String(m.r), m.n | 0);
      case 'place': return this.place(p, m.slot | 0, m.tx | 0, m.ty | 0);
      case 'unplace': return this.unplace(p, m.tx | 0, m.ty | 0);
      case 'sint': return this.structInteract(p, m.tx | 0, m.ty | 0);
      case 'stor': return this.chestAction(p, String(m.a), m.slot | 0);
      case 'door': return this.onDoor(p, m.id | 0, !!m.out);
      case 'board': return this.board(p, +m.a, m.slot == null ? -1 : m.slot | 0);
      case 'land': return this.land(p, +m.a);
    }
  }

  async login(conn, s, m) {
    const name = String(m.name || '').trim().replace(/\s+/g, ' ');
    const pass = String(m.pass || '');
    if (!NAME_RE.test(name)) return conn.send({ t: 'err', msg: 'Nom invalide : 3 à 16 lettres ou chiffres.' });
    if (!this.solo && (pass.length < 4 || pass.length > 64)) return conn.send({ t: 'err', msg: 'Mot de passe : 4 caractères minimum.' });
    const key = name.toLowerCase();
    s.pending = true;
    let res;
    try { res = await this.storage.auth(key, name, pass); } catch (e) { res = { ok: false, err: 'Erreur du serveur de sauvegarde.' }; }
    s.pending = false;
    if (!this.sessions.has(conn)) return;
    if (!res.ok) return conn.send({ t: 'err', msg: res.err || 'Mot de passe incorrect.' });
    let data = res.data;
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
    if (p.pendingBase) { this.importBase(p.key, p.name, p.pendingBase); p.pendingBase = null; }
    this.send(p, {
      t: 'welcome', id: p.id, seed: this.world.seed, wt: this.worldTime, solo: this.solo,
      me: this.meState(p), inv: p.inv, eq: p.eq, q: p.quests, chests: p.chests, look: p.look, base: p.base,
      name: p.name, x: p.x, y: p.y, isNew: !res.data, ach: p.ach, treasure: p.treasure, evt: this.invasionState(),
      history: (this.chatLog || []).slice(-12),
      build: this.buildSnapshot(p.key), dep: [...this.depleted].filter(([, t]) => t > this.time).map(([id, t]) => [id, Math.round(t - this.time)]),
      respawnAt: p.respawnAt, found: [...p.found], boat: p.boat, room: p.room,
    });
    this.broadcastChat(null, `${p.name} accoste à Port-Lanterne.`, 'sys');
    if (!res.data) this.toast(p, 'Bienvenue ! Parlez à la Capitaine Morgane, près des quais (touche E).', 'quest');
    this.log(`[jeu] ${p.name} connecté (${this.players.size} en ligne)`);
  }

  createPlayer(conn, name, key, d, look) {
    const sp = this.world.spawnPoint;
    const p = {
      id: this.nextId++, conn, name: d && d.name ? d.name : name, key,
      base: sanitizeLook(d ? d.look : look),
      x: sp.x, y: sp.y, dir: 0, moving: false,
      level: 1, xp: 0, gold: 15, hp: 0, en: 60,
      inv: new Array(INV_SIZE).fill(null),
      eq: { weapon: 'sabre_rouille', gun: null, hat: null, body: 'chemise', boots: null, trinket: null },
      quests: {}, chests: {}, cds: {}, cry: 0, rumUntil: 0, rumRate: 0, drunkUntil: 0,
      dead: false, deathAt: 0, moveBudget: 80, lastMoveAt: this.time, invulnUntil: this.time + 2,
      known: new Map(), dirtyMe: true, dirtyInv: false, dirtyQ: false, lastSave: this.time,
      lastHurt: -99, lastChat: -9, zone: Z.TOWN, lookVer: 0, kills: 0,
      upg: {}, treasure: null, ach: {}, title: null, cnt: { crab: 0, fish: 0 }, fishing: null, respawnAt: null,
      found: new Set(), boat: null, room: -1, pk: 0, pvpLog: new Map(), caches: {},
    };
    if (d) {
      p.level = Math.max(1, Math.min(MAX_LEVEL, d.level | 0 || 1));
      p.xp = Math.max(0, d.xp | 0); p.gold = Math.max(0, d.gold | 0);
      if (Array.isArray(d.inv)) for (let i = 0; i < INV_SIZE; i++) { const it = d.inv[i]; p.inv[i] = it && ITEMS[it.id] ? { id: it.id, n: Math.max(1, Math.min(STACK_MAX, it.n | 0)) } : null; }
      if (d.eq) for (const s of SLOTS) p.eq[s] = d.eq[s] && ITEMS[d.eq[s]] && ITEMS[d.eq[s]].slot === s ? d.eq[s] : null;
      if (d.quests && typeof d.quests === 'object') for (const q in d.quests) if (QUESTS[q]) p.quests[q] = { s: d.quests[q].s === 'done' ? 'done' : 'active', p: Array.isArray(d.quests[q].p) ? d.quests[q].p.map((v) => v | 0) : [], t: +d.quests[q].t || 0 };
      if (d.chests) p.chests = d.chests;
      p.kills = d.kills | 0;
      if (d.upg) for (const k of UPG_SLOTS) p.upg[k] = Math.max(0, Math.min(UPG_MAX, d.upg[k] | 0));
      if (d.treasure && typeof d.treasure.x === 'number') p.treasure = { x: d.treasure.x, y: d.treasure.y };
      if (d.ach && typeof d.ach === 'object') for (const k in d.ach) if (ACHIEVEMENTS[k]) p.ach[k] = d.ach[k];
      if (d.title && p.ach[d.title]) p.title = d.title;
      if (d.cnt) { p.cnt.crab = d.cnt.crab | 0; p.cnt.fish = d.cnt.fish | 0; }
      if (d.respawnAt && typeof d.respawnAt.tx === 'number') p.respawnAt = { tx: d.respawnAt.tx | 0, ty: d.respawnAt.ty | 0 };
      if (!this.worldPersist && d.base) p.pendingBase = d.base;
      if (Array.isArray(d.found)) for (const id of d.found) if (this.world.doors[id | 0] && this.world.doors[id | 0].secret) p.found.add(id | 0);
      p.pk = d.pk | 0;
      if (d.caches && typeof d.caches === 'object') for (const k in d.caches) p.caches[k | 0] = 1;
      if (typeof d.x === 'number' && typeof d.y === 'number') {
        const bt = d.boat && ITEMS[d.boat] && ITEMS[d.boat].boat && p.inv.some((s) => s && s.id === d.boat) ? d.boat : null;
        if (bt && canSail(this.world, d.x, d.y)) { p.x = d.x; p.y = d.y; p.boat = bt; }
        else if (canStand(this.world, d.x, d.y, false, key)) { p.x = d.x; p.y = d.y; }
      }
    } else {
      this.addItem(p, 'banane', 3);
    }
    this.recalc(p);
    p.hp = d && d.hp > 0 ? Math.min(p.stats.maxHp, d.hp) : p.stats.maxHp;
    p.en = p.stats.maxEn;
    p.zone = zoneAt(this.world, p.x, p.y);
    p.room = roomIdAt(this.world, p.x, p.y);
    return p;
  }
  serialize(p) {
    return { name: p.name, look: p.base, level: p.level, xp: p.xp, gold: p.gold, hp: Math.round(p.hp), inv: p.inv, eq: p.eq, quests: p.quests, chests: p.chests, x: Math.round(p.x), y: Math.round(p.y), kills: p.kills, upg: p.upg, treasure: p.treasure, ach: p.ach, title: p.title, cnt: p.cnt, respawnAt: p.respawnAt, found: [...p.found], boat: p.boat || null, pk: p.pk, caches: p.caches, base: this.worldPersist ? undefined : this.exportBase(p.key), saved: Date.now() };
  }
  save(p) {
    p.lastSave = this.time;
    const data = this.serialize(p);
    if (p.dead) { data.x = this.world.spawnPoint.x; data.y = this.world.spawnPoint.y; data.hp = 0; }
    Promise.resolve(this.storage.save(p.key, data)).catch((e) => this.log('[sauvegarde] échec', p.name, e && e.message));
  }
  saveAll() { for (const p of this.players.values()) this.save(p); if (this.worldPersist) Promise.resolve(this.storage.saveWorld(this.exportWorld())).catch(() => {}); }

  recalc(p) {
    p.stats = computeStats(p.level, p.eq, p.upg);
    const L = displayLook(p.base, p.eq);
    if (JSON.stringify(L) !== JSON.stringify(p.look)) { p.look = L; p.lookVer++; }
    if (p.hp > p.stats.maxHp) p.hp = p.stats.maxHp;
    p.dirtyMe = true;
  }
  meState(p) {
    return {
      hp: Math.ceil(p.hp), maxHp: p.stats.maxHp, en: Math.floor(p.en), maxEn: p.stats.maxEn,
      lvl: p.level, xp: p.xp, xpNext: xpToNext(p.level), gold: p.gold,
      st: { atk: p.stats.atk, gun: p.stats.gun, def: p.stats.def, crit: Math.round(p.stats.crit * 100), speed: p.stats.speed, regen: +p.stats.regen.toFixed(1) },
      cry: Math.max(0, +(p.cry - this.time).toFixed(1)), drunk: Math.max(0, +(p.drunkUntil - this.time).toFixed(1)),
      dead: p.dead, kills: p.kills, upg: p.upg, title: p.title, boat: p.boat, room: p.room, pk: p.pk,
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
      deadUntil: 0, tags: new Map(), moving: false, summoned, boss: !!def.boss, nextSummon: 0, nextVolley: 0, adds: [],
      room: roomIdAt(this.world, sx, sy),
    };
    this.mobs.push(m);
    return m;
  }
  respawnMob(m) {
    for (const b of this.bases.values()) if (Math.hypot(m.sx / TILE - b.tx, m.sy / TILE - b.ty) < CLAIM_R + 2) { m.deadUntil = this.time + 30; return; }
    m.x = m.sx; m.y = m.sy; m.hp = m.maxHp; m.state = 'idle'; m.target = 0; m.tags.clear(); m.windup = 0;
    m.id = this.nextId++; // nouvel identifiant : les clients le voient « apparaître »
    this.ev(m.x, m.y, ['fx', 'spawn', m.x, m.y]);
    if (m.def.elite && this.players.size) this.broadcastChat(null, `☠ ${m.def.name} rôde à nouveau : ${m.room >= 0 ? this.world.rooms[m.room].name : ZONES[zoneAt(this.world, m.x, m.y)].name}.`, 'night');
  }
  // un mort ne poursuit pas un pirate en zone sûre, dans une autre pièce, ou en mer (sauf s'il tire)
  mobCanTarget(m, p) { return !p.dead && !SAFE.has(p.zone) && p.room === m.room && (!p.boat || !!m.def.ranged); }
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
      // seuls les monstres proches d'un joueur réfléchissent
      let awake = false;
      for (const p of this.players.values()) if (Math.abs(p.x - m.x) < 700 && Math.abs(p.y - m.y) < 500) { awake = true; break; }
      if (!awake) { if (m.state !== 'idle') { m.x = m.sx; m.y = m.sy; m.hp = m.maxHp; m.state = 'idle'; m.target = 0; } m.moving = false; continue; }
      active.push(m);
      const def = m.def;
      const speed = def.speed * spdMul * (m.boss && m.hp < m.maxHp * 0.25 ? 1.25 : 1);
      if (m.state === 'idle') {
        const t = this.nearestTarget(m, def.aggro);
        if (t) { m.state = 'chase'; m.target = t.id; if (def.groan) this.ev(m.x, m.y, ['groan', m.id]); }
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
        if (d < 6) { m.state = 'idle'; m.hp = m.maxHp; m.tags.clear(); }
      } else if (m.state === 'chase') {
        const t = this.players.get(m.target);
        const leashed = Math.hypot(m.x - m.sx, m.y - m.sy) > def.leash;
        if (!t || !this.mobCanTarget(m, t) || leashed) {
          const other = !leashed && this.nearestTarget(m, def.aggro);
          if (other) m.target = other.id; else { m.state = 'return'; m.target = 0; m.windup = 0; this.despawnAdds(m); }
          continue;
        }
        const d = dist(m, t);
        if (m.windup) {
          m.moving = false;
          if (this.time >= m.windup) {
            m.windup = 0;
            m.nextAtk = this.time + def.atkCd * (m.boss && m.hp < m.maxHp * 0.25 ? 0.7 : 1);
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
        if (m.boss) this.bossSpecials(m, t);
      }
    }
    // séparation légère pour éviter les empilements
    for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j];
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
    const dmg = def.dmg * (night ? 1.15 : 1) * rand(0.9, 1.1);
    if (def.ranged) {
      const sp = def.ranged.speed;
      this.spawnProj(m.x, m.y - 9, m.atkA, sp, sp * def.ranged.life, dmg, 'm', m.id, 'ball', 0);
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
      if (!m.boss) break;
    }
  }
  bossSpecials(m, t) {
    if (this.time >= m.nextSummon) {
      m.nextSummon = this.time + 15;
      m.adds = m.adds.filter((a) => a.state !== 'dead' && this.mobs.includes(a));
      if (m.adds.length < 4) {
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * Math.PI * 2;
          const x = m.x + Math.cos(a) * 26, y = m.y + Math.sin(a) * 20;
          if (!canStand(this.world, x, y, true)) continue;
          const add = this.addMob('zsailor', x, y, true);
          add.state = 'chase'; add.target = t.id; add.sx = m.sx; add.sy = m.sy;
          m.adds.push(add);
          this.ev(x, y, ['fx', 'summon', x, y]);
        }
        this.ev(m.x, m.y, ['shout', m.id, 'À moi, mes morts !']);
      }
    }
    if (m.hp < m.maxHp * 0.6 && this.time >= m.nextVolley) {
      m.nextVolley = this.time + 8;
      for (const p of this.players.values()) {
        if (p.dead || SAFE.has(p.zone) || p.room !== m.room || dist(p, m) > 260) continue;
        for (let k = 0; k < 2; k++) {
          const x = p.x + rand(-28, 28) * k, y = p.y + rand(-20, 20) * k;
          this.teles.push({ x, y, r: 26, at: this.time + 1.3, dmg: 34 });
          this.ev(x, y, ['tele', Math.round(x), Math.round(y), 26, 1.3]);
        }
      }
      this.ev(m.x, m.y, ['shout', m.id, 'Feu à volonté !']);
    }
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
  rollDamage(p, base) {
    const crit = Math.random() < p.stats.crit;
    const v = Math.max(1, Math.round(base * this.dmgMul(p) * rand(0.9, 1.1) * (crit ? 1.8 : 1)));
    return [v, crit];
  }
  damageMob(m, amount, p, crit, kx = 0, ky = 0, dot = 0) {
    if (m.state === 'dead') return;
    m.hp -= amount;
    m.tags.set(p.id, (m.tags.get(p.id) || 0) + amount);
    if (m.event && this.invasion) this.invasion.parts.add(p.id);
    this.ev(m.x, m.y, dot ? ['dmg', m.id, amount, 0, p.id, dot] : ['dmg', m.id, amount, crit ? 1 : 0, p.id]);
    if (m.state !== 'chase') { m.state = 'chase'; m.target = p.id; }
    if (!m.boss && (kx || ky)) { const [nx, ny] = moveWithCollision(this.world, m.x, m.y, kx, ky, true); m.x = nx; m.y = ny; }
    if (m.hp <= 0) this.killMob(m, p);
  }
  killMob(m, killer) {
    m.state = 'dead'; m.hp = 0;
    m.deadUntil = this.time + m.def.respawn * rand(0.85, 1.15);
    this.ev(m.x, m.y, ['die', m.id]);
    const def = m.def;
    if (m.boss) {
      this.despawnAdds(m);
      const names = [...m.tags.keys()].map((id) => this.players.get(id)).filter(Boolean).map((p) => p.name);
      this.broadcastChat(null, `⚔ ${names.join(', ')} ${names.length > 1 ? 'ont' : 'a'} vaincu le Capitaine Barbe-Cendre ! La marée recule...`, 'boss');
    }
    if (def.elite && !m.event) this.broadcastChat(null, `⚔ ${killer.name} a terrassé ${def.name} !`, 'boss');
    if (m.type === 'roi_squelette') for (const pid of m.tags.keys()) { const q = this.players.get(pid); if (q) this.unlock(q, 'roi_os'); }
    if (m.summoned && !m.event) return;
    let top = killer, topD = 0;
    for (const [pid, d] of m.tags) {
      const p = this.players.get(pid);
      if (!p || p.dead || dist(p, m) > 700) continue;
      if (d > topD) { topD = d; top = p; }
      const diff = p.level - def.level;
      const xp = Math.max(1, Math.round(def.xp * (diff > 3 ? Math.max(0.15, 1 - (diff - 3) * 0.25) : 1)));
      this.giveXp(p, xp);
      p.kills++;
      this.questKill(p, m.type);
      this.unlock(p, 'premier_sang');
      if (m.type === 'crab' && ++p.cnt.crab >= 50) this.unlock(p, 'crabes');
      if (p.kills >= 250) this.unlock(p, 'faucheur');
      if (def.elite) this.unlock(p, 'elite');
      if (m.boss) this.unlock(p, 'boss');
    }
    if (m.event) { if (Math.random() < 0.5) this.spawnDrop(m.x, m.y, 'or', Math.round(rand(def.gold[0], def.gold[1]) / 2), top.id); if (!def.elite) return; }
    // butin
    const [g0, g1] = def.gold;
    const gold = Math.round(rand(g0, g1));
    if (gold > 0) this.spawnDrop(m.x, m.y, 'or', gold, top.id);
    for (const [item, ch, a, b] of def.loot) {
      if (Math.random() < ch) this.spawnDrop(m.x, m.y, item, Math.round(rand(a, b)), top.id);
    }
  }
  // ---- effets des armes : saignement (b), brûlure (f), vol de vie
  addDot(t, kind, total, src, dur = 3) {
    if (!t || total < 1 || t.dead || t.state === 'dead') return;
    t.dots = (t.dots || []).filter((d) => !(d.kind === kind && d.src === src.id));
    t.dots.push({ kind, left: total, dps: total / dur, src: src.id });
  }
  hitEffects(p, t, v, fx) {
    if (fx.bleed) this.addDot(t, 'b', v * fx.bleed, p);
    if (fx.burn) this.addDot(t, 'f', v * fx.burn, p);
    if (fx.leech && !p.dead) { const h = Math.min(p.stats.maxHp - p.hp, v * fx.leech); if (h >= 1) { p.hp += h; p.dirtyMe = true; } }
  }
  updateDots() {
    const tick = (t, isMob) => {
      if (!t.dots || !t.dots.length) return;
      for (const d of t.dots) {
        const v = Math.min(d.left, d.dps * 0.5);
        d.left -= v;
        const src = this.players.get(d.src);
        if (isMob) { if (src && t.state !== 'dead') this.damageMob(t, Math.max(1, Math.round(v)), src, false, 0, 0, d.kind); }
        else if (!t.dead && !SAFE.has(t.zone)) this.damagePlayer(t, v, src || null, false, d.kind);
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
  canPvp(a, b) { return !!a && !!b && a !== b && !a.dead && !b.dead && !SAFE.has(a.zone) && !SAFE.has(b.zone) && a.room === b.room; }
  damagePlayer(p, raw, src, crit = false, dot = 0) {
    if (p.dead) return;
    if (this.time < p.invulnUntil && !dot) { this.ev(p.x, p.y, ['dodge', p.id]); return; }
    const dmg = dot ? Math.max(1, Math.round(raw)) : mitigate(raw, p.stats.def);
    p.hp -= dmg; p.lastHurt = this.time; p.dirtyMe = true;
    if (src && src.key) { p.lastPvp = this.time; src.lastPvp = this.time; }
    this.ev(p.x, p.y, dot ? ['dmg', p.id, dmg, 0, src ? src.id : 0, dot] : ['dmg', p.id, dmg, crit ? 1 : 0, src ? src.id : 0]);
    if (p.hp <= 0) this.killPlayer(p, src);
  }
  killPlayer(p, src) {
    p.hp = 0; p.dead = true; p.deathAt = this.time; p.moving = false;
    if (p.boat) { p.boat = null; p.lookVer++; }
    p.fishing = null;
    const lost = Math.floor(p.gold * 0.1);
    p.gold -= lost;
    this.ev(p.x, p.y, ['die', p.id]);
    const pk = src && src.key && src !== p && this.players.has(src.id) ? src : null;
    this.send(p, { t: 'dead', lost, by: src ? (src.def ? src.def.name : src.name || '') : '', pk: pk ? 1 : 0 });
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
    if (p.boat) { p.boat = null; p.lookVer++; }
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
    if (p.level >= MAX_LEVEL) return;
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
  spawnProj(x, y, a, speed, range, dmg, team, owner, kind, pierce = 0, crit = false, pvp = false, fx = null) {
    const pr = { id: this.nextId++, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, left: range, dmg, team, owner, kind, pierce, hit: new Set(), crit, pvp, fx };
    this.projs.push(pr);
    this.ev(x, y, ['proj', pr.id, Math.round(x), Math.round(y), +a.toFixed(3), speed, Math.round(range), kind, owner]);
    return pr;
  }
  updateProjs() {
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i];
      const sp = Math.hypot(pr.vx, pr.vy) * DT;
      const steps = Math.max(1, Math.ceil(sp / 4));
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        pr.x += pr.vx * DT / steps; pr.y += pr.vy * DT / steps; pr.left -= sp / steps;
        if (pr.left <= 0) { dead = true; break; }
        if (blocksShot(this.world, pr.x, pr.y + 8)) { dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; }
        if (pr.team === 'p') {
          const owner = this.players.get(pr.owner), fx = pr.fx || {};
          const kb = 3 * (fx.kb || 1);
          for (const m of this.mobs) {
            if (m.state === 'dead' || pr.hit.has(m.id)) continue;
            if (Math.hypot(m.x - pr.x, m.y - 8 - pr.y) < m.def.r + 4) {
              pr.hit.add(m.id);
              if (owner) { const n = Math.hypot(pr.vx, pr.vy); this.damageMob(m, pr.dmg, owner, pr.crit, pr.vx / n * kb, pr.vy / n * kb); this.hitEffects(owner, m, pr.dmg, fx); }
              if (pr.pierce > 0 && !fx.explode) pr.pierce--; else { dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break; }
            }
          }
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
          for (const p of this.players.values()) {
            if (p.dead || SAFE.has(p.zone)) continue;
            if (Math.hypot(p.x - pr.x, p.y - 9 - pr.y) < 8) {
              const src = this.mobs.find((m) => m.id === pr.owner);
              this.damagePlayer(p, pr.dmg, src);
              dead = true; this.ev(pr.x, pr.y, ['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]); break;
            }
          }
        }
      }
      if (dead || pr.left <= 0) {
        if (pr.fx && pr.fx.explode) this.explode(pr.x, pr.y + 6, pr.fx.explode, pr.dmg, this.players.get(pr.owner), pr.pvp);
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
      for (const p of this.players.values()) if (!p.dead && !SAFE.has(p.zone) && Math.hypot(p.x - t.x, p.y - t.y) < t.r + 4) this.damagePlayer(p, t.dmg, null);
    }
  }

  onAttack(p, a) {
    if (p.dead || !isFinite(a)) return;
    if (p.boat) return;
    const cd = p.stats.atkSpeed;
    if ((p.cds.slash || 0) > this.time + 0.04) return;
    p.cds.slash = this.time + cd;
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
      const [v, crit] = this.rollDamage(p, p.stats.atk);
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
    if (p.level < sk.lvl) return this.toast(p, `${sk.name} : niveau ${sk.lvl} requis.`, 'warn');
    const cannon = id === 'shot' && p.boat && ITEMS[p.boat].boat.cannon;
    if (p.boat && (id === 'whirl' || id === 'roll')) return;
    if (sk.needGun && !p.eq.gun && !cannon) return this.toast(p, p.boat ? 'Il vous faut un pistolet, ou un sloop et son canon.' : "Il vous faut une arme à feu (emplacement Pistolet).", 'warn');
    const cd = cannon ? 1.8 : sk.cd * (id === 'shot' ? p.stats.gunCd : 1);
    if ((p.cds[id] || 0) > this.time + 0.05) return;
    if (p.en < sk.cost) return this.toast(p, "Pas assez d'énergie.", 'warn');
    const a = isFinite(+m.a) ? +m.a : 0;
    p.cds[id] = this.time + cd;
    p.en -= sk.cost; p.dirtyMe = true;
    switch (id) {
      case 'shot': {
        p.dir = dirOf(Math.cos(a), Math.sin(a));
        const pvp = !SAFE.has(p.zone);
        if (cannon) { // canon du sloop
          this.ev(p.x, p.y, ['atk', p.id, +a.toFixed(2), 3]);
          const [v, crit] = this.rollDamage(p, 24 + p.level * 4);
          this.spawnProj(p.x + Math.cos(a) * 12, p.y - 8 + Math.sin(a) * 8, a, 250, 240, v, 'p', p.id, 'cball', 1, crit, pvp);
          break;
        }
        const gun = ITEMS[p.eq.gun];
        const s = gun.shot;
        const fx = s.explode || s.burn || s.bleed || s.kb ? { explode: s.explode, burn: s.burn, bleed: s.bleed, kb: s.kb } : null;
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
    const x = +m.x, y = +m.y;
    if (!isFinite(x) || !isFinite(y)) return;
    const dt = Math.min(0.6, this.time - p.lastMoveAt);
    p.lastMoveAt = this.time;
    const boat = p.boat ? ITEMS[p.boat].boat : null;
    const spd = boat ? boat.speed : p.stats.speed * (this.time < p.cry ? 1.2 : 1);
    p.moveBudget = Math.min(spd * 1.2 + ROLL_SPEED * ROLL_TIME + 30, p.moveBudget + spd * dt * 1.3 + 3);
    const d = Math.hypot(x - p.x, y - p.y);
    const ok = (boat ? canSail(this.world, x, y) : canStand(this.world, x, y, false, p.key)) && roomIdAt(this.world, x, y) === p.room;
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

  sendPos(p, extra) { this.send(p, Object.assign({ t: 'pos', x: p.x, y: p.y, boat: p.boat || null, room: p.room }, extra)); }
  setZone(p, z) {
    if (z === p.zone) return;
    p.zone = z;
    this.questZone(p, z);
    if (z === Z.HAVRE) this.unlock(p, 'navigateur');
  }
  teleport(p, x, y, extra) {
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
    const d = this.world.doors[id];
    if (!d || p.dead || p.boat || (p.cds.door || 0) > this.time) return;
    if (out) {
      if (p.room !== d.room || Math.abs(p.x - d.ex) > 18 || Math.abs(p.y - d.ey) > 24) return;
      p.cds.door = this.time + 0.6;
      this.teleport(p, d.rx, d.ry + 2, { door: d.id, out: 1 });
    } else {
      if (p.room !== -1 || Math.abs(p.x - d.ox) > 18 || Math.abs(p.y - d.oy) > 28) return;
      p.cds.door = this.time + 0.6;
      if (d.secret) this.discover(p, d);
      this.teleport(p, d.ix, d.iy, { door: d.id });
    }
  }
  // ------------------------------------------------------------ navigation
  boatSlot(p, slot) {
    if (slot >= 0 && p.inv[slot] && ITEMS[p.inv[slot].id].boat) return p.inv[slot].id;
    let best = null;
    for (const s of p.inv) if (s && ITEMS[s.id].boat && (!best || ITEMS[s.id].boat.speed > ITEMS[best].boat.speed)) best = s.id;
    return best;
  }
  board(p, a, slot = -1) {
    if (p.dead || p.boat || p.room !== -1) return;
    const id = this.boatSlot(p, slot);
    if (!id) return this.toast(p, 'Il vous faut une barque (Corentin, sur le quai, en vend).', 'warn');
    let best = null, bs = 1e9;
    for (const r of [16, 22, 28, 34, 40, 46]) for (let k = 0; k < 16; k++) {
      const ang = k / 16 * Math.PI * 2, x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r * 0.85;
      if (!canSail(this.world, x, y)) continue;
      const sc = r + (isFinite(a) ? angDiff(ang, a) * 10 : 0);
      if (sc < bs) { bs = sc; best = [x, y]; }
    }
    if (!best) return this.toast(p, 'Approchez-vous de l’eau libre (un quai ou une plage) pour mettre à l’eau.', 'warn');
    p.boat = id; p.lookVer++;
    this.teleport(p, best[0], best[1], { board: 1 });
    this.ev(p.x, p.y, ['fx', 'splash', p.x, p.y]);
    if (!p.ach.navigateur && !p.sailedOnce) { p.sailedOnce = true; this.toast(p, 'En mer ! E près du rivage pour accoster.', 'info'); }
  }
  land(p, a) {
    if (p.dead || !p.boat) return;
    let best = null, bs = 1e9;
    for (const r of [14, 20, 26, 32, 38, 44]) for (let k = 0; k < 16; k++) {
      const ang = k / 16 * Math.PI * 2, x = p.x + Math.cos(ang) * r, y = p.y + Math.sin(ang) * r * 0.85;
      const t = tileAt(this.world, x, y);
      if (t === T.WATER || t === T.DEEP || t === T.SWAMP || !canStand(this.world, x, y, false, p.key) || roomIdAt(this.world, x, y) !== -1) continue;
      const sc = r + (isFinite(a) ? angDiff(ang, a) * 8 : 0);
      if (sc < bs) { bs = sc; best = [x, y]; }
    }
    if (!best) return this.toast(p, 'Pas de rivage où accoster ici.', 'warn');
    p.boat = null; p.lookVer++;
    this.teleport(p, best[0], best[1], { land: 1 });
    this.ev(p.x, p.y, ['fx', 'splash', p.x, p.y]);
  }

  // ------------------------------------------------------------ objets
  addItem(p, id, n) {
    if (!ITEMS[id]) return n;
    if (isStackable(id)) {
      for (const s of p.inv) if (s && s.id === id && s.n < STACK_MAX) { const k = Math.min(n, STACK_MAX - s.n); s.n += k; n -= k; if (!n) break; }
    }
    for (let i = 0; i < INV_SIZE && n > 0; i++) if (!p.inv[i]) { const k = isStackable(id) ? Math.min(n, STACK_MAX) : 1; p.inv[i] = { id, n: k }; n -= k; }
    p.dirtyInv = true; p.dirtyQ = true;
    return n;
  }
  countItem(p, id) { let c = 0; for (const s of p.inv) if (s && s.id === id) c += s.n; return c; }
  boatInUse(p, id) { return p.boat === id && this.countItem(p, id) <= 1; }
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
    if (it.boat) return p.boat ? this.land(p, NaN) : this.board(p, NaN, i);
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
    if (it.use.bottle) {
      s.n--; if (s.n <= 0) p.inv[i] = null; p.dirtyInv = true;
      const gold = Math.round(rand(8, 40)); p.gold += gold; p.dirtyMe = true;
      const MSG = ['« Si vous lisez ceci, je suis coincé sur un rocher. Apportez du rhum. »', '« Le trésor n’est pas là où vous croyez. Il n’est jamais là. »', '« Ne faites pas confiance au perroquet. »', '« Barbe-Cendre craint la lumière du phare. »', '« Je lègue mes doublons à qui trouvera cette bouteille. »'];
      if (Math.random() < 0.3) this.giveOrDrop(p, 'carte_dechiree', 1);
      return this.toast(p, `${MSG[Math.floor(Math.random() * MSG.length)]} (+${gold} doublons)`, 'quest');
    }
    if ((p.cds.food || 0) > this.time) return;
    p.cds.food = this.time + 0.8;
    const u = it.use;
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
    const prev = p.eq[it.slot];
    p.eq[it.slot] = s.id;
    p.inv[i] = prev ? { id: prev, n: 1 } : null;
    this.recalc(p);
    p.dirtyInv = true;
  }
  unequip(p, slot) {
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
  dropSlot(p, i) {
    const s = p.inv[i];
    if (!s || p.dead) return;
    if (ITEMS[s.id].quest) return this.toast(p, "Vous ne pouvez pas jeter un objet de quête.", 'warn');
    if (this.boatInUse(p, s.id)) return this.toast(p, 'Vous êtes à bord !', 'warn');
    p.inv[i] = null; p.dirtyInv = true; p.dirtyQ = true;
    this.spawnDrop(p.x, p.y + 4, s.id, s.n, 0);
  }
  nearNpc(p, id, range = INTERACT_RANGE + 16) {
    const n = this.npcPos.get(id);
    return n && Math.hypot(n.x - p.x, n.y - p.y) <= range;
  }
  buy(p, npc, item) {
    const N = NPCS[npc];
    if (!N || !N.shop || !N.shop.includes(item) || !this.nearNpc(p, npc, 90)) return;
    const it = ITEMS[item], price = it.value;
    if (p.gold < price) return this.toast(p, 'Pas assez de doublons !', 'warn');
    const left = this.addItem(p, item, 1);
    if (left) return this.toast(p, 'Inventaire plein !', 'warn');
    p.gold -= price; p.dirtyMe = true;
    this.send(p, { t: 'loot', id: item, n: 1, buy: price });
  }
  sell(p, i) {
    const s = p.inv[i];
    if (!s) return;
    const near = Object.keys(NPCS).some((id) => NPCS[id].shop && this.nearNpc(p, id, 90));
    if (!near) return this.toast(p, 'Il faut être près d’un marchand pour vendre.', 'warn');
    const it = ITEMS[s.id];
    if (it.quest) return this.toast(p, 'Un objet de quête ne se vend pas.', 'warn');
    if (this.boatInUse(p, s.id)) return this.toast(p, 'Vous êtes à bord !', 'warn');
    const price = Math.max(1, Math.floor(it.value * 0.35));
    s.n--; if (!s.n) p.inv[i] = null;
    p.gold += price; p.dirtyMe = true; p.dirtyInv = true; p.dirtyQ = true;
    this.send(p, { t: 'sold', id: s.id, price });
  }
  openProp(p, id) {
    const pr = this.propById.get(id);
    if (!pr || p.dead || Math.hypot(pr.x - p.x, pr.y - p.y) > INTERACT_RANGE + 10) return;
    if (pr.type === 'chest') {
      const now = Date.now();
      if (pr.cache && !p.caches[id]) { // une cachette : l'arme est à vous, une fois
        p.caches[id] = 1;
        this.giveOrDrop(p, pr.cache, 1);
        this.send(p, { t: 'loot', id: pr.cache, n: 1 });
        this.toast(p, `Cachette découverte : ${ITEMS[pr.cache].name} !`, 'quest');
        if (Object.keys(p.caches).length >= 3) this.unlock(p, 'fouineur');
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
    p.dirtyQ = true;
    this.toast(p, `Nouvelle quête : ${q.name}`, 'quest');
  }
  turnIn(p, qid) {
    const q = QUESTS[qid], st = p.quests[qid];
    if (!q || !st || st.s !== 'active' || !this.nearNpc(p, q.turnin)) return;
    if (!goalsMet(qid, st, (id) => this.countItem(p, id))) return this.toast(p, 'Les objectifs ne sont pas remplis.', 'warn');
    for (const g of q.goals) if (g.type === 'collect') this.removeItem(p, g.item, g.n);
    p.quests[qid] = q.repeat ? { s: 'done', p: [], t: Date.now() } : { s: 'done', p: [] };
    p.gold += q.rewards.gold || 0;
    for (const [id, n] of q.rewards.items || []) this.giveOrDrop(p, id, n);
    this.giveXp(p, q.rewards.xp || 0);
    p.dirtyQ = true; p.dirtyMe = true;
    this.send(p, { t: 'qdone', q: qid });
    this.ev(p.x, p.y, ['fx', 'quest', p.x, p.y, p.id]);
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
  questZone(p, z) {
    for (const qid in p.quests) {
      const st = p.quests[qid];
      if (st.s !== 'active') continue;
      QUESTS[qid].goals.forEach((g, i) => { if (g.type === 'explore' && g.zone === z && !st.p[i]) { st.p[i] = 1; p.dirtyQ = true; this.toast(p, `Objectif accompli : ${g.text}`, 'quest'); } });
    }
  }

  // ------------------------------------------------------------ chat
  chat(p, msg) {
    msg = msg.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 160);
    if (!msg) return;
    if (this.time - p.lastChat < 0.7) return this.toast(p, 'Doucement, moussaillon !', 'warn');
    p.lastChat = this.time;
    if (msg[0] === '/') {
      const [cmd] = msg.slice(1).split(' ');
      if (cmd === 'who' || cmd === 'qui') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: `En ligne (${this.players.size}) : ${[...this.players.values()].map((q) => `${q.name} (niv. ${q.level})`).join(', ')}` });
      if (cmd === 'aide' || cmd === 'help') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: 'Commandes : /qui, /pos, /suicide (retour en ville). Émotes : /danse /salut /rire /joie /colere /assis.' });
      if (cmd === 'pos') return this.send(p, { t: 'chat', from: null, kind: 'sys', m: `Position : ${Math.floor(p.x / TILE)}, ${Math.floor(p.y / TILE)} — ${p.room >= 0 ? this.world.rooms[p.room].name : ZONES[p.zone].name}${SAFE.has(p.zone) ? ' (zone sûre)' : ''}` });
      if (cmd === 'suicide' || cmd === 'unstuck') { if (!p.dead) this.killPlayer(p, null); return; }
      const EMOTES = { danse: 'danse', salut: 'salut', rire: 'rire', colere: 'colere', 'colère': 'colere', joie: 'joie', assis: 'assis' };
      if (EMOTES[cmd]) { this.ev(p.x, p.y, ['emote', p.id, EMOTES[cmd]]); return; }
      return this.send(p, { t: 'chat', from: null, kind: 'sys', m: 'Commande inconnue. Tapez /aide.' });
    }
    this.broadcastChat(p, msg, 'chat', p.level);
  }

  // ------------------------------------------------------------ hauts faits
  unlock(p, id) {
    if (!ACHIEVEMENTS[id] || p.ach[id]) return;
    p.ach[id] = Date.now();
    this.send(p, { t: 'ach', id, ach: p.ach });
    this.ev(p.x, p.y, ['ach', p.id]);
    if (id === 'boss' || id === 'invasion' || id === 'espadon') this.broadcastChat(null, `🏆 ${p.name} obtient le haut fait « ${ACHIEVEMENTS[id].name} » !`, 'sys');
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
      if (t === T.WATER || t === T.DEEP || t === T.SWAMP) { ok = true; break; }
    }
    if (!ok) return this.toast(p, 'Tournez-vous vers l’eau pour lancer la ligne.', 'warn');
    p.fishing = { x: fx, y: fy, px: p.x, py: p.y, biteAt: this.time + rand(2.5, 7.5), state: 'wait', deep: tileAt(this.world, fx, fy) === T.DEEP };
    this.ev(p.x, p.y, ['fish', p.id, Math.round(fx), Math.round(fy)]);
  }
  updateFishing(p) {
    const f = p.fishing;
    if (Math.hypot(p.x - f.px, p.y - f.py) > 6) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); return; }
    if (f.state === 'wait' && this.time >= f.biteAt) { f.state = 'bite'; f.until = this.time + 1.0; this.send(p, { t: 'bite' }); this.ev(f.x, f.y, ['bite', p.id]); }
    else if (f.state === 'bite' && this.time > f.until) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); this.toast(p, 'Le poisson s’est échappé !', 'warn'); }
  }
  reel(p) {
    const f = p.fishing; p.fishing = null;
    if (f.state !== 'bite') { this.ev(p.x, p.y, ['fishend', p.id, 0]); return this.toast(p, 'Trop tôt ! Attendez que ça morde (!).', 'warn'); }
    const night = this.night, w = weatherAt(this.worldTime);
    const table = [['sardine', 40], ['bar', 26], ['dorade', 11 * (f.deep ? 1.6 : 1)], ['botte_rouillee', 8], ['bouteille_mer', 6], ['carte_dechiree', 3],
      ['espadon', (2 + w.storm * 7) * (f.deep ? 1.8 : 1)], ['poisson_lanterne', night ? 14 : 0]];
    const tot = table.reduce((a, b) => a + b[1], 0);
    let r = Math.random() * tot, item = 'sardine';
    for (const [id, wgt] of table) { if ((r -= wgt) <= 0) { item = id; break; } }
    this.giveOrDrop(p, item, 1);
    this.send(p, { t: 'loot', id: item, n: 1 });
    this.ev(f.x, f.y, ['fishend', p.id, 1, item]);
    if (ITEMS[item].use && ITEMS[item].use.heal || item === 'espadon') { p.cnt.fish++; this.unlock(p, 'peche'); }
    if (item === 'espadon') this.unlock(p, 'espadon');
  }
  // ------------------------------------------------------------ trésors
  dig(p) {
    if (p.dead || !p.treasure) return;
    if (p.boat) return this.toast(p, 'Accostez d’abord.', 'warn');
    if (Math.hypot(p.treasure.x - p.x, p.treasure.y - p.y) > 26) return this.toast(p, 'Ce n’est pas ici. Suivez la flèche jusqu’à la croix.', 'warn');
    const t = p.treasure; p.treasure = null;
    const gold = Math.round(rand(120, 260)); p.gold += gold; p.dirtyMe = true;
    const got = [];
    for (const [item, ch, a, b] of [['perle_ombre', 0.8, 1, 2], ['rhum', 0.7, 1, 2], ['collier_requin', 0.15, 1, 1], ['boussole_maudite', 0.06, 1, 1], ['tromblon', 0.1, 1, 1], ['manteau_corsaire', 0.12, 1, 1], ['chapeau_capitaine', 0.05, 1, 1], ['carte_dechiree', 0.35, 1, 1], ['cimeterre', 0.08, 1, 1], ['pistolet_duel', 0.04, 1, 1], ['faux', 0.03, 1, 1], ['couleuvrine', 0.02, 1, 1]]) {
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
  // ------------------------------------------------------------ invasion de la Marée Morte
  invasionState() {
    const v = this.invasion;
    if (!v) return null;
    return { state: v.state, wave: v.wave + 1, total: INV_WAVES.length, left: v.mobs.filter((m) => m.state !== 'dead').length, x: Math.round(this.invCenter.x), y: Math.round(this.invCenter.y) };
  }
  broadcastEvt() { const st = this.invasionState(); for (const p of this.players.values()) this.send(p, { t: 'evt', e: st }); }
  updateInvasion(f) {
    const nightIdx = Math.floor(this.worldTime / DAYLEN);
    const v = this.invasion;
    if (!v) {
      if (this.night && f > 0.7 && f < 0.8 && this.invNight !== nightIdx && this.players.size > 0) {
        this.invNight = nightIdx;
        this.invasion = { state: 'on', wave: -1, mobs: [], parts: new Set(), next: this.time + 3 };
        this.broadcastChat(null, '🌊 La Marée Morte déferle sur la plage au sud-ouest du port ! Tous aux armes !', 'boss');
        this.broadcastEvt();
      }
      return;
    }
    if (!this.night) { // l'aube : la marée se retire
      for (const m of v.mobs) if (m.state !== 'dead') { m.state = 'dead'; this.ev(m.x, m.y, ['die', m.id]); }
      this.broadcastChat(null, 'Le jour se lève : la Marée Morte se retire dans les profondeurs…', 'night');
      this.invasion = null; this.broadcastEvt(); return;
    }
    const alive = v.mobs.filter((m) => m.state !== 'dead' && this.mobs.includes(m));
    if (alive.length === 0 && this.time >= v.next) {
      if (v.wave + 1 >= INV_WAVES.length) return this.winInvasion();
      v.wave++;
      v.mobs = [];
      for (const [type, n] of INV_WAVES[v.wave]) for (let k = 0; k < n; k++) {
        let x = this.invCenter.x, y = this.invCenter.y;
        for (let tries = 0; tries < 12; tries++) {
          const a = Math.random() * Math.PI * 2, r = rand(20, 80);
          const tx = this.invCenter.x + Math.cos(a) * r, ty = this.invCenter.y + Math.sin(a) * r * 0.6;
          if (canStand(this.world, tx, ty, true)) { x = tx; y = ty; break; }
        }
        const mob = this.addMob(type, x, y, true);
        mob.event = true; mob.sx = this.invCenter.x; mob.sy = this.invCenter.y;
        v.mobs.push(mob);
        this.ev(x, y, ['fx', 'summon', x, y]);
      }
      v.next = this.time + 4;
      this.broadcastChat(null, v.wave + 1 < INV_WAVES.length ? `Vague ${v.wave + 1}/${INV_WAVES.length} de la Marée Morte !` : 'Le Capitaine Noyé surgit des flots !', 'night');
    } else if (alive.length && v.lastLeft !== alive.length) v.next = this.time + 4;
    v.lastLeft = alive.length;
    if (this.tickCount % 20 === 0) this.broadcastEvt();
  }
  winInvasion() {
    const v = this.invasion;
    const names = [];
    for (const id of v.parts) {
      const p = this.players.get(id);
      if (!p) continue;
      names.push(p.name);
      p.gold += 90; p.dirtyMe = true;
      this.giveXp(p, 260);
      if (Math.random() < 0.2) this.giveOrDrop(p, 'ecaille_leviathan', 1);
      this.giveOrDrop(p, 'rhum', 1);
      this.toast(p, 'La Marée Morte est repoussée ! +260 XP, +90 doublons.', 'level');
      this.unlock(p, 'invasion');
    }
    this.broadcastChat(null, `🏆 La Marée Morte est repoussée${names.length ? ' par ' + names.join(', ') : ''} ! Port-Lanterne est sauf.`, 'boss');
    this.invasion = null;
    this.broadcastEvt();
  }

  // ------------------------------------------------------------ récolte
  bestTool(p, kind) { let t = 0; for (const s of p.inv) if (s && ITEMS[s.id].tool === kind) t = Math.max(t, ITEMS[s.id].tier || 1); return t; }
  broadcastAll(msg) { for (const q of this.players.values()) this.send(q, msg); }
  harvest(p, id) {
    const pr = this.propById.get(id);
    if (!pr || p.dead) return;
    const H = HARVEST[pr.type];
    if (!H || Math.hypot(pr.x - p.x, pr.y - p.y) > 34 || SAFE.has(zoneAt(this.world, pr.x, pr.y))) return;
    if ((this.depleted.get(id) || 0) > this.time) return this.toast(p, 'Déjà récolté. Ça repoussera.', 'warn');
    if ((p.cds.harvest || 0) > this.time) return;
    p.cds.harvest = this.time + 0.45;
    let tool = H.tool ? this.bestTool(p, H.tool) : 0;
    if (H.tool && !tool) return this.toast(p, H.tool === 'axe' ? 'Il vous faut une hache pour abattre cet arbre.' : 'Il vous faut une pioche.', 'warn');
    let give = H.give;
    if (pr.type === 'rock') { const pick = this.bestTool(p, 'pick'); if (pick) { give = H.pick; tool = pick; } }
    const z = zoneAt(this.world, pr.x, pr.y), oreMul = (z === Z.JUNGLE || z === Z.RUINS || z === Z.WRECK) ? 1.6 : 1;
    const got = [];
    for (const g of give) {
      let n = 0;
      if (g.length === 3) n = Math.floor(rand(g[1], g[2] + 1)) + (tool >= 2 ? 1 : 0);
      else if (Math.random() < g[1] * (g[0] === 'minerai_fer' ? oreMul : 1) * (tool >= 2 ? 1.35 : 1)) n = 1;
      if (pr.type === 'mushroom' && g[0] === 'champignon_luisant' && pr.v % 2) n = 1;
      if (n > 0) { this.giveOrDrop(p, g[0], n); got.push([g[0], n]); }
    }
    this.depleted.set(id, this.time + H.regrow);
    this.broadcastAll({ t: 'dep', id, s: H.regrow });
    this.send(p, { t: 'gather', got });
    this.ev(pr.x, pr.y, ['harv', p.id, id, pr.type]);
  }
  // ------------------------------------------------------------ artisanat
  nearStation(p, st) {
    if (st === 'main') return true;
    for (const [x, y] of this.townStations[st] || []) if (Math.hypot(x - p.x, y - p.y) < 52) return true;
    for (const s of this.structs.values()) if (STRUCTS[s.type].station === st && Math.hypot(s.x - p.x, s.y - p.y) < 44) return true;
    return false;
  }
  craft(p, rid, n) {
    const r = RECIPE[rid];
    if (!r || p.dead) return;
    n = Math.max(1, Math.min(20, n || 1));
    if (!this.nearStation(p, r.st)) return this.toast(p, `Il faut être près d’un poste : ${STATIONS[r.st]}.`, 'warn');
    let made = 0;
    for (let k = 0; k < n; k++) {
      if (!r.ing.every(([id, c]) => this.countItem(p, id) >= c)) break;
      for (const [id, c] of r.ing) this.removeItem(p, id, c);
      const left = this.addItem(p, r.out, r.n);
      if (left) this.spawnDrop(p.x, p.y, r.out, left, p.id);
      made++;
    }
    if (!made) return this.toast(p, 'Il vous manque des ingrédients.', 'warn');
    this.send(p, { t: 'crafted', id: r.out, n: made * r.n });
    this.ev(p.x, p.y, ['fx', 'craft', p.x, p.y, p.id]);
  }
  // ------------------------------------------------------------ bases
  structEntry(st) { return [st.type, st.tx, st.ty, this.bases.get(st.owner) ? this.bases.get(st.owner).name : '', st.data && st.data.t ? Math.round((Date.now() - st.data.t) / 1000) : 0]; }
  buildSnapshot(key) {
    return {
      s: [...this.structs.values()].map((st) => this.structEntry(st)),
      f: [...this.floors.values()].map((f) => [f.type, f.tx, f.ty]),
      b: [...this.bases.values()].map((b) => [b.name, b.tx, b.ty, b.key === key ? 1 : 0]),
    };
  }
  addStruct(key, type, tx, ty, data = {}, broadcast = true) {
    const W = this.world, i = ty * W.W + tx, def = STRUCTS[type];
    if (!def) return false;
    if (def.floor) { if (this.floors.has(i)) return false; this.floors.set(i, { type, tx, ty, owner: key }); }
    else {
      if (this.structs.has(i) || W.solid[i]) return false;
      const st = { id: this.nextId++, type, tx, ty, x: tx * TILE + 8, y: ty * TILE + 14, owner: key, data };
      this.structs.set(i, st);
      if (def.solid) W.block[i] = def.solid;
      if (def.solid === 2) W.doorOwner.set(i, key);
    }
    const b = this.bases.get(key); if (b) b.count++;
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
    const b = this.bases.get(st.owner); if (b) b.count--;
    if (broadcast) this.broadcastAll({ t: 'st', r: [[st.tx, st.ty, floor ? 1 : 0]] });
    this.worldDirty = true;
    return st;
  }
  place(p, slot, tx, ty) {
    const s = p.inv[slot];
    if (!s || p.dead || p.boat) return;
    const it = ITEMS[s.id];
    if (!it.place) return;
    if (ty >= this.world.OVER_H) return this.toast(p, 'Impossible de construire ici.', 'warn');
    const type = it.place, def = STRUCTS[type], W = this.world;
    if (tx < 1 || ty < 1 || tx >= W.W - 1 || ty >= W.H - 1) return;
    const i = ty * W.W + tx, t = W.tiles[i], z = W.zones[i];
    if (Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 10 - p.y) > 96) return this.toast(p, 'Trop loin.', 'warn');
    if (W.solid[i] || t === T.DEEP || t === T.WATER || t === T.SWAMP || t === T.ROCK || t === T.PLANK || t === T.COBBLE) return this.toast(p, 'Impossible de construire ici.', 'warn');
    let base = this.bases.get(p.key);
    if (type === 'pavillon') {
      if (base) return this.toast(p, 'Vous avez déjà une base. Démontez son pavillon pour déménager.', 'warn');
      if (SAFE.has(z) || z === Z.WRECK || z === Z.SEA || z === Z.CAVE) return this.toast(p, 'Ce terrain ne peut pas être revendiqué.', 'warn');
      for (const b of this.bases.values()) if (Math.hypot(b.tx - tx, b.ty - ty) < CLAIM_R * 2 + 2) return this.toast(p, 'Trop près de la base d’un autre pirate.', 'warn');
      for (const n of this.world.npcs) if (Math.hypot(n.x / TILE - tx, n.y / TILE - ty) < 10) return this.toast(p, 'Trop près de la ville.', 'warn');
      base = { key: p.key, name: p.name, tx, ty, storage: new Array(24).fill(null), count: 0 };
      this.bases.set(p.key, base);
      this.broadcastAll({ t: 'st', b: [[p.name, tx, ty, 0]] });
      this.send(p, { t: 'st', b: [[p.name, tx, ty, 1]] });
    } else {
      if (!base) return this.toast(p, 'Plantez d’abord un pavillon pirate pour fonder votre base.', 'warn');
      if (Math.hypot(tx - base.tx, ty - base.ty) > CLAIM_R + 0.5) return this.toast(p, 'Hors des limites de votre base.', 'warn');
      if (base.count >= BASE_MAX) return this.toast(p, 'Votre base est pleine.', 'warn');
      if (!def.floor) {
        for (const q of this.players.values()) if (Math.abs(q.x - (tx * TILE + 8)) < 12 && Math.abs(q.y - (ty * TILE + 10)) < 12) return this.toast(p, 'Quelqu’un se tient là.', 'warn');
        for (const m of this.mobs) if (m.state !== 'dead' && Math.abs(m.x - (tx * TILE + 8)) < 12 && Math.abs(m.y - (ty * TILE + 10)) < 12) return this.toast(p, 'Un mort se tient là !', 'warn');
      }
    }
    if (!this.addStruct(p.key, type, tx, ty, def.planter ? { t: Date.now() } : {})) {
      if (type === 'pavillon') this.bases.delete(p.key);
      return this.toast(p, 'Emplacement occupé.', 'warn');
    }
    s.n--; if (s.n <= 0) p.inv[slot] = null;
    p.dirtyInv = true;
    this.ev(tx * TILE + 8, ty * TILE + 10, ['fx', 'build', tx * TILE + 8, ty * TILE + 12]);
    if (type === 'pavillon') this.toast(p, 'Terrain revendiqué ! Construisez dans le cercle autour du pavillon (touche B).', 'quest');
  }
  unplace(p, tx, ty) {
    const W = this.world, i = ty * W.W + tx;
    let floor = false, st = this.structs.get(i);
    if (!st) { st = this.floors.get(i); floor = true; }
    if (!st || st.owner !== p.key || p.dead) return;
    if (Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 10 - p.y) > 96) return this.toast(p, 'Trop loin.', 'warn');
    const base = this.bases.get(p.key);
    if (st.type === 'pavillon') {
      if (base && base.count > 1) return this.toast(p, 'Démontez d’abord le reste de votre base.', 'warn');
      if (base && base.storage.some(Boolean)) return this.toast(p, 'Videz d’abord votre coffre.', 'warn');
    }
    this.removeStruct(i, floor);
    this.giveOrDrop(p, STRUCTS[st.type].item, 1);
    if (st.type === 'lit' && p.respawnAt && p.respawnAt.tx === tx && p.respawnAt.ty === ty) p.respawnAt = null;
    if (st.type === 'pavillon') { this.bases.delete(p.key); this.broadcastAll({ t: 'st', rb: [p.name] }); }
  }
  structInteract(p, tx, ty) {
    const W = this.world, st = this.structs.get(ty * W.W + tx);
    if (!st || p.dead || Math.hypot(st.x - p.x, st.y - p.y) > 40) return;
    const mine = st.owner === p.key;
    if (st.type === 'lit') {
      if (!mine) return this.toast(p, 'Ce n’est pas votre lit.', 'warn');
      p.respawnAt = { tx, ty }; p.hp = p.stats.maxHp; p.dirtyMe = true;
      return this.toast(p, 'Vous vous reposez. Vous réapparaîtrez ici.', 'quest');
    }
    if (st.type === 'coffre') { if (!mine) return this.toast(p, 'Ce coffre est verrouillé.', 'warn'); return this.chestAction(p, 'open', 0); }
    if (st.type === 'jardiniere') {
      const ready = Date.now() - (st.data.t || 0) >= PLANTER_GROW * 1000;
      if (!ready) return this.toast(p, `Ça pousse… encore ${Math.ceil((PLANTER_GROW * 1000 - (Date.now() - st.data.t)) / 60000)} min.`, 'info');
      st.data.t = Date.now();
      const got = [['baies', Math.floor(rand(2, 5))], ['herbes', Math.floor(rand(0, 3))]];
      if (Math.random() < 0.4) got.push(['banane', 1]);
      for (const [id, n] of got) if (n > 0) this.giveOrDrop(p, id, n);
      this.send(p, { t: 'gather', got: got.filter(([, n]) => n > 0) });
      this.broadcastAll({ t: 'st', a: [this.structEntry(st)] });
      this.worldDirty = true;
    }
  }
  chestAction(p, a, slot) {
    const base = this.bases.get(p.key);
    if (!base || p.dead) return;
    let near = false;
    for (const st of this.structs.values()) if (st.type === 'coffre' && st.owner === p.key && Math.hypot(st.x - p.x, st.y - p.y) < 48) near = true;
    if (!near) return;
    const S = base.storage;
    if (a === 'put') {
      const it = p.inv[slot];
      if (!it || ITEMS[it.id].quest || this.boatInUse(p, it.id)) return;
      let n = it.n;
      if (isStackable(it.id)) for (const c of S) if (c && c.id === it.id && c.n < STACK_MAX) { const k = Math.min(n, STACK_MAX - c.n); c.n += k; n -= k; if (!n) break; }
      if (n > 0) { const free = S.findIndex((c) => !c); if (free < 0) { it.n = n; p.dirtyInv = true; return this.toast(p, 'Le coffre est plein.', 'warn'); } S[free] = { id: it.id, n }; }
      p.inv[slot] = null; p.dirtyInv = true; p.dirtyQ = true;
    } else if (a === 'take') {
      const c = S[slot];
      if (!c) return;
      const left = this.addItem(p, c.id, c.n);
      if (left) { c.n = left; this.toast(p, 'Inventaire plein !', 'warn'); } else S[slot] = null;
    }
    this.worldDirty = true;
    this.send(p, { t: 'stor', items: S });
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
  importBase(key, name, d) {
    if (!d || this.bases.has(key) || typeof d.tx !== 'number') return;
    for (const b of this.bases.values()) if (Math.hypot(b.tx - d.tx, b.ty - d.ty) < CLAIM_R * 2 + 2) return;
    const storage = new Array(24).fill(null);
    if (Array.isArray(d.storage)) d.storage.slice(0, 24).forEach((c, k) => { if (c && ITEMS[c.id]) storage[k] = { id: c.id, n: Math.max(1, Math.min(STACK_MAX, c.n | 0)) }; });
    this.bases.set(key, { key, name, tx: d.tx | 0, ty: d.ty | 0, storage, count: 0 });
    const add = [], addf = [];
    for (const [type, tx, ty, t] of d.s || []) if (STRUCTS[type] && !STRUCTS[type].floor && this.addStruct(key, type, tx | 0, ty | 0, STRUCTS[type].planter ? { t: t || Date.now() } : {}, false)) add.push(this.structEntry(this.structs.get((ty | 0) * this.world.W + (tx | 0))));
    for (const [type, tx, ty] of d.f || []) if (STRUCTS[type] && STRUCTS[type].floor && this.addStruct(key, type, tx | 0, ty | 0, {}, false)) addf.push([type, tx, ty]);
    this.broadcastAll({ t: 'st', a: add, af: addf, b: [[name, d.tx, d.ty, 0]] });
  }
  removeBase(key) {
    const b = this.bases.get(key);
    if (!b) return;
    const r = [];
    for (const [i, st] of [...this.structs]) if (st.owner === key) { this.structs.delete(i); this.world.block[i] = 0; this.world.doorOwner.delete(i); r.push([st.tx, st.ty, 0]); }
    for (const [i, f] of [...this.floors]) if (f.owner === key) { this.floors.delete(i); r.push([f.tx, f.ty, 1]); }
    this.bases.delete(key);
    this.broadcastAll({ t: 'st', r, rb: [b.name] });
  }
  exportWorld() { return { v: 1, bases: [...this.bases.values()].map((b) => ({ ...this.exportBase(b.key), key: b.key, name: b.name })) }; }
  importWorld(w) {
    if (!w || !Array.isArray(w.bases)) return;
    for (const b of w.bases) this.importBase(b.key, b.name, b);
    this.log(`[monde] ${this.bases.size} base(s) chargée(s)`);
  }

  // ------------------------------------------------------------ boucle
  tick() {
    this.time += DT;
    this.tickCount++;
    this.worldTime += DT;
    const f = dayFrac(this.worldTime), n = isNight(f);
    if (n !== this.night) {
      this.night = n;
      this.broadcastChat(null, n ? 'La nuit tombe... La Marée Morte se lève, les morts deviennent plus forts.' : "Le jour se lève. Les morts retournent dans l'ombre.", 'night');
    }
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
      if (p.fishing) this.updateFishing(p);
      if (p.gold >= 1000 && !p.ach.riche) this.unlock(p, 'riche');
    }
    if (this.tickCount % 10 === 0) this.updateInvasion(f);
    if (this.tickCount % 5 === 0) this.updateTurrets();
    if (this.tickCount % 10 === 0) this.updateDots();
    if (this.worldPersist && this.worldDirty && this.time - this.lastWorldSave > 8) { this.worldDirty = false; this.lastWorldSave = this.time; Promise.resolve(this.storage.saveWorld(this.exportWorld())).catch(() => {}); }
    this.updateMobs();
    this.updateProjs();
    for (const [id, d] of this.drops) if (this.time > d.expire) this.drops.delete(id);
    this.broadcastState();
    this.events.length = 0;
  }
  flush(p) {
    if (p.dirtyMe) { p.dirtyMe = false; this.send(p, Object.assign({ t: 'me' }, this.meState(p))); }
    if (p.dirtyInv) { p.dirtyInv = false; this.send(p, { t: 'inv', inv: p.inv, eq: p.eq }); }
    if (p.dirtyQ) { p.dirtyQ = false; this.send(p, { t: 'q', q: p.quests }); }
  }
  entMeta(e, kind) {
    if (kind === 'p') return { id: e.id, k: 'p', name: e.name, look: e.look, lvl: e.level, x: Math.round(e.x), y: Math.round(e.y), w: e.eq.weapon, g: e.eq.gun, dead: e.dead, ti: e.title ? ACHIEVEMENTS[e.title].title : '', bt: e.boat ? ITEMS[e.boat].boat.kind : '' };
    if (kind === 'm') return { id: e.id, k: 'm', type: e.type, x: Math.round(e.x), y: Math.round(e.y), hp: Math.ceil(e.hp), mhp: e.maxHp };
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
        pos.push([q.id, Math.round(q.x), Math.round(q.y), q.dir, (q.moving ? 1 : 0) | (q.dead ? 2 : 0) | (this.time < q.invulnUntil ? 4 : 0) | (this.time < q.cry ? 8 : 0) | (q.boat ? 16 : 0), Math.round(q.hp / q.stats.maxHp * 100)]);
      }
      for (const m of this.mobs) {
        if (m.state === 'dead' || !near(m)) continue;
        seen.set(m.id, 0);
        if (!p.known.has(m.id)) ent.push(this.entMeta(m, 'm'));
        pos.push([m.id, Math.round(m.x), Math.round(m.y), m.dir, (m.moving ? 1 : 0) | (m.windup ? 2 : 0) | (m.state === 'return' ? 4 : 0), Math.round(m.hp / m.maxHp * 100)]);
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
      if (ent.length) msg.n = ent;
      if (rm.length) msg.r = rm;
      if (ev.length) msg.ev = ev;
      if (sendTime) { msg.wt = +this.worldTime.toFixed(2); msg.on = this.players.size; }
      this.send(p, msg);
      this.flush(p);
    }
  }
}
