// 1.1 : les navires dans le monde. On arme son navire à quai (bitte d'amarrage ou charpentier de marine d'un
// port) ; il apparaît amarré, ancre au fond, voiles ferlées. On y monte à pied par la passerelle, on marche sur
// le pont, et l'on tient ses postes : la barre (Q/D tournent la roue, qui reste où on la laisse), les drisses du
// grand mât (Z/S déploient ou carguent la voilure), le cabestan (S jette l'ancre, Z la lève — plus vite à
// plusieurs) et les canons de chaque bord (on vise à la souris, on tire au clic).
// Le navire est lourd : il prend son erre lentement, il lui faut de la vitesse pour gouverner, il vire large et
// dérive dans les virages ; vent arrière il file, au près il peine. Il heurte les rochers (et sa coque en
// souffre), il reste où on l'a laissé (à la dérive si l'on est descendu voiles dehors), et il sombre quand sa
// coque cède. Sans personne à bord et son propriétaire parti, il disparaît au bout de dix minutes.
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';
import { placeOf } from '../shared/data/places.js';
import { canStand, roomIdAt, zoneAt } from '../shared/world.js';
import { TILE, ROLL_SPEED, ROLL_TIME, TICK_RATE } from '../shared/constants.js';
import {
  shipOf, hullHalf, insideHull, toWorld, toLocal, stations, deckOk, nearestDeck, openingAt, hullClear, shipOverlap, shipFits,
  BERTHS, berthNear, berthOfPlace, findBerth, windAt, windFactor, windName,
} from '../shared/data/ships.js';

const DT = 1 / TICK_RATE;
const DESPAWN = 600; // un navire vide dont le propriétaire est parti : dix minutes
const BOARD_SPEED = 28; // au-delà, on ne saute plus à bord (ni à terre)
const GUN_RELOAD = 3.2;
const ANCHOR_UP = 3.5; // secondes pour lever l'ancre seul (lot 1 : plus court, l'équipage aide)
const HOME_CHANNEL = 8, HOME_CD = 180, UNSTICK_CD = 20; // lot 1 : rentrer au port, dégager le navire
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export const shipsLogic = {
  shipsInit() { this.ships = new Map(); this.wind = windAt(0); this.whirl = null; },
  spec(sh) { return shipOf(sh.kind); },
  shipOwner(sh) { return sh.oid ? this.players.get(sh.oid) || null : null; },
  myShip(p) { return p.ship ? this.ships.get(p.ship) || null : null; },
  ownShip(key) { for (const s of this.ships.values()) if (s.own === key && !s.sinkT) return s; return null; },
  shipSpeed(sh) { return Math.hypot(sh.vx, sh.vy); },
  shipMaxSpeed(sh) { return ITEMS[sh.item].boat.speed * (0.62 + 0.38 * sh.hull / Math.max(1, this.hullMax(sh.item))); },
  createShip(owner, item, x, y, a, st = {}) {
    const sh = {
      id: this.nextId++, own: owner.key, ownName: owner.name, oid: owner.id || 0, crewId: owner.crew || 0, item, kind: ITEMS[item].boat.kind,
      x, y, a, vx: 0, vy: 0, w: 0, u: 0, rud: 0, sail: st.sail || 0, sailT: st.sail || 0, anchor: st.anchor == null ? 2 : st.anchor, anchorAt: 0, anchorP: 0,
      hull: owner.hulls ? this.hullOf(owner, item) : this.hullMax(item), crew: new Set(), posts: {}, cap: new Set(), ctl: {}, gunCd: {},
      emptySince: this.time, ver: 1, sinkT: 0, bumpAt: 0, hitAt: -99,
    };
    this.ships.set(sh.id, sh);
    return sh;
  },
  // ------------------------------------------------------------ armer un navire à quai
  berthFor(p) {
    const b = p.room === -1 ? berthNear(p.x, p.y, 60) : null;
    if (b) return b;
    for (const id of Object.keys(NPCS)) {
      if (!(NPCS[id].repair || (NPCS[id].shop || []).some((i) => ITEMS[i] && ITEMS[i].boat)) || !this.nearNpc(p, id, 110)) continue;
      const n = this.world.npcs.find((q) => q.id === id), place = n && placeOf(this.world, n.x, n.y);
      const nb = place && berthOfPlace(place);
      if (nb) return nb;
    }
    return null;
  },
  armShip(p, item) {
    if (p.dead || p.ship) return this.toast(p, p.ship ? 'Vous êtes déjà sur un pont.' : '', 'warn');
    const b = this.berthFor(p);
    if (!b) return this.toast(p, 'On arme un navire à quai, dans un port : cherchez la bitte d’amarrage ⚓ (Port-Lanterne, la Rade, Havre-des-Brumes, Anse-Tranquille, Libertalia) ou le charpentier de marine.', 'warn');
    if (!item || !ITEMS[item] || !ITEMS[item].boat || !this.countItem(p, item)) item = this.boatSlot(p, -1);
    if (!item) return this.toast(p, 'Vous n’avez pas de navire : les charpentiers de marine en vendent (Corentin, sur le quai de Port-Lanterne, a des barques).', 'warn');
    if (this.hullOf(p, item) <= 0) return this.toast(p, `${ITEMS[item].name} a sombré : faites réparer sa coque au chantier naval avant de l’armer.`, 'warn');
    const old = this.ownShip(p.key);
    const S = shipOf(ITEMS[item].boat.kind);
    const spot = findBerth(this.world, S, b, [...this.ships.values()].filter((s) => s !== old));
    if (!spot) return this.toast(p, `Le ${b.name.toLowerCase()} est encombré : il n’y a pas de place pour ${ITEMS[item].name.toLowerCase()}. Patientez, ou essayez un autre port.`, 'warn');
    if (old) this.removeShip(old, `${ITEMS[old.item].name} de ${p.name} rentre au port : tout le monde à terre.`);
    const sh = this.createShip(p, item, spot.x, spot.y, spot.a, { anchor: 2 });
    sh.berth = b.key;
    this.ev(sh.x, sh.y, ['fx', 'splash', Math.round(sh.x), Math.round(sh.y)]);
    p.dirtyMe = true;
    this.toast(p, `${ITEMS[item].name} vous attend, amarré au ${b.name.toLowerCase()} : montez à bord par la passerelle. Le vent souffle ${windName(this.wind.a)}.`, 'quest');
    if (!p.cnt.arm) this.toast(p, 'À bord, prenez la barre (E, à la poupe) : Z ou Espace pour partir, l’équipage lève l’ancre et hisse la voile. Tenez une direction pour virer.', 'info');
    p.cnt.arm = (p.cnt.arm || 0) + 1;
  },
  // ranger son navire (à quai, personne d'autre à bord)
  stowShip(p) {
    const sh = this.ownShip(p.key);
    if (!sh) return this.toast(p, 'Vous n’avez pas de navire armé.', 'info');
    const b = this.berthFor(p);
    if (!b || Math.hypot(sh.x - b.tx * TILE, sh.y - b.ty * TILE) > 420) return this.toast(p, 'Votre navire n’est pas au port : ramenez-le à quai pour le ranger.', 'warn');
    if ([...sh.crew].some((id) => id !== p.id)) return this.toast(p, 'Il y a encore du monde à bord.', 'warn');
    this.removeShip(sh, null);
    this.toast(p, `${ITEMS[sh.item].name} est rangé au port.`, 'info');
  },
  // ------------------------------------------------------------ monter, descendre, marcher sur le pont
  canBoard(p, sh) {
    if (sh.own === p.key) return true;
    if (sh.ghost) return false; // lot 6 : un rival de la course
    if (sh.rental) { if (sh.rental === p.key) return true; const r = [...this.players.values()].find((q) => q.key === sh.rental); return !!(r && this.mates(p, r)); } // lot 6 : un cotre de location
    const o = this.shipOwner(sh);
    if (o && this.mates(p, o)) return true;
    if (sh.crewId && p.crew === sh.crewId) return true;
    if (o && this.canPvp(p, o)) return true; // l'abordage !
    return false;
  },
  joinDeck(p, sh, lx, ly) {
    if (p.riding) this.dismount(p);
    if (p.fishing) { p.fishing = null; this.ev(p.x, p.y, ['fishend', p.id, 0]); }
    if (p.ship && p.ship !== sh.id) this.leaveDeck(p);
    p.ship = sh.id; p.lx = lx; p.ly = ly; p.boat = sh.item; p.post = null;
    sh.crew.add(p.id); sh.emptySince = this.time;
    [p.x, p.y] = toWorld(sh, lx, ly);
    p.lookVer++; p.dirtyMe = true; p.moveBudget = 0; p.lastMoveAt = this.time;
  },
  leaveDeck(p) {
    const sh = this.myShip(p);
    if (sh) { this.leavePost(p, sh); sh.crew.delete(p.id); if (!sh.crew.size) sh.emptySince = this.time; }
    p.ship = 0; p.boat = null; p.post = null; p.lookVer++; p.dirtyMe = true;
  },
  dropAshore(q, msg) {
    const at = this.shoreNear(q.x, q.y, 1600) || [this.world.spawnPoint.x, this.world.spawnPoint.y];
    this.leaveDeck(q);
    this.teleport(q, at[0], at[1], { land: 1 });
    if (msg) this.toast(q, msg, 'warn');
  },
  removeShip(sh, msg) {
    for (const id of [...sh.crew]) { const q = this.players.get(id); if (q) this.dropAshore(q, msg); }
    const o = this.shipOwner(sh); if (o) { o.hulls[sh.item] = Math.max(0, Math.round(sh.hull)); o.dirtyMe = true; }
    this.ships.delete(sh.id);
  },
  // un déplacement venu du client : sur un pont (s), en montant à bord, ou en descendant à terre.
  // Renvoie true s'il a été traité ici.
  deckMoveMsg(p, m) {
    if (m.s) {
      const sh = this.ships.get(m.s | 0), lx = +m.lx, ly = +m.ly;
      if (!sh || sh.sinkT || !isFinite(lx) || !isFinite(ly) || p.room !== -1 || p.dead) { this.sendPos(p); return true; }
      const S = this.spec(sh);
      if (p.ship !== sh.id) { // monter à bord : par une ouverture du bastingage, depuis tout près, navire presque à l'arrêt
        const op = openingAt(S, lx), hw = hullHalf(S, lx), [wx, wy] = toWorld(sh, lx, ly);
        const why = !this.canBoard(p, sh) ? `Ce navire appartient à ${sh.ownName} : seuls son groupe et son équipage y montent.` : this.shipSpeed(sh) > BOARD_SPEED ? 'Le navire file trop vite pour sauter à bord.' : null;
        if (why) { this.toast(p, why, 'warn'); this.sendPos(p); return true; }
        if (!deckOk(S, lx, ly) || !op || Math.abs(ly) < hw - 20 || Math.hypot(wx - p.x, wy - p.y) > 46) { this.sendPos(p); return true; }
        this.joinDeck(p, sh, lx, ly);
        this.ev(wx, wy, ['fx', 'plank', Math.round(wx), Math.round(wy)]);
        if (sh.own !== p.key) this.toast(this.shipOwner(sh) || p, `${p.name} monte à bord.`, 'info');
        return true;
      }
      if (p.post) this.leavePost(p, sh); // lot 1 : on marche, donc on a quitté son poste
      const dt = Math.min(0.6, this.time - p.lastMoveAt);
      p.lastMoveAt = this.time;
      const spd = p.stats.speed;
      p.moveBudget = Math.min(spd * 1.2 + ROLL_SPEED * ROLL_TIME + 30, p.moveBudget + spd * 1.3 * dt + 3);
      const d = Math.hypot(lx - p.lx, ly - p.ly);
      if (d > p.moveBudget || !deckOk(S, lx, ly)) { p.moveBudget *= 0.5; this.sendPos(p); return true; }
      p.moveBudget -= d; p.lx = lx; p.ly = ly;
      p.dir = (m.d | 0) & 3; p.moving = !!m.m;
      [p.x, p.y] = toWorld(sh, lx, ly);
      return true;
    }
    if (!p.ship) return false;
    const sh = this.myShip(p);
    if (!sh) { p.ship = 0; p.boat = null; return false; }
    // descendre à terre : par une ouverture, vers un sol tout proche (quai, plage, hauts-fonds)
    const S = this.spec(sh), x = +m.x, y = +m.y, op = openingAt(S, p.lx), hw = hullHalf(S, p.lx);
    const [rx, ry] = toWorld(sh, p.lx, (p.ly < 0 ? -1 : 1) * hw);
    if (!isFinite(x) || !isFinite(y) || p.post || !op || Math.abs(p.ly) < hw - 18 || this.shipSpeed(sh) > BOARD_SPEED + 10
      || !canStand(this.world, x, y, false, p.key) || roomIdAt(this.world, x, y) !== -1 || Math.hypot(x - rx, y - ry) > 42) { this.sendPos(p); return true; }
    this.leaveDeck(p);
    p.x = x; p.y = y; p.moveBudget = 0; p.lastMoveAt = this.time; p.moving = !!m.m;
    this.setZone(p, zoneAt(this.world, x, y));
    if (sh.own === p.key && !sh.crew.size && !sh.anchor && sh.sail > 0.15) this.toast(p, 'Votre navire repart sans vous, voiles dehors ! (Jetez l’ancre avant de descendre.)', 'warn');
    return true;
  },
  // ------------------------------------------------------------ les postes
  takePost(p, k, i) {
    const sh = this.myShip(p);
    if (!sh || p.dead) return;
    const st = stations(this.spec(sh)).find((s) => s.k === k && (k !== 'gun' || s.i === (i | 0)));
    if (!st) return;
    if (Math.hypot(st.x - p.lx, st.y - p.ly) > 24) return this.toast(p, 'Approchez-vous du poste.', 'warn');
    const key = k === 'gun' ? 'gun' + st.i : k;
    const cur = sh.posts[key];
    if (k !== 'cap' && cur && cur !== p.id && this.players.get(cur) && this.players.get(cur).ship === sh.id) return this.toast(p, 'Ce poste est déjà tenu.', 'warn');
    this.leavePost(p, sh);
    if (k === 'cap') sh.cap.add(p.id); else sh.posts[key] = p.id;
    p.post = key; p.lx = st.x; p.ly = st.y; sh.ctl[p.id] = [0, 0];
    [p.x, p.y] = toWorld(sh, p.lx, p.ly);
    p.dirtyMe = true;
    this.send(p, { t: 'post', k: key, lx: st.x, ly: st.y, s: sh.id });
  },
  leavePost(p, sh = this.myShip(p)) {
    if (!p.post) return;
    if (sh) { if (p.post === 'cap') sh.cap.delete(p.id); else if (sh.posts[p.post] === p.id) delete sh.posts[p.post]; delete sh.ctl[p.id]; }
    p.post = null; p.dirtyMe = true;
    this.send(p, { t: 'post', k: '' });
  },
  postInput(p, x, y, sl) {
    const sh = this.myShip(p);
    if (!sh || !p.post) return;
    sh.ctl[p.id] = [clamp(+x || 0, -1, 1), clamp(+y || 0, -1, 1)];
    // lot 1 : à la barre, un cran de voilure d'un coup (Espace) ; l'équipage lève l'ancre s'il le faut
    if (p.post === 'helm' && sl != null && isFinite(+sl)) { sh.sailT = clamp(+sl, 0, 1); if (sh.sailT > 0 && sh.anchor) sh.autoAnchor = true; }
  },
  fireGun(p, a) {
    const sh = this.myShip(p);
    if (!sh || p.dead || !p.post || !p.post.startsWith('gun') || !isFinite(a)) return;
    const i = +p.post.slice(3), st = stations(this.spec(sh)).find((s) => s.k === 'gun' && s.i === i);
    if (!st || (sh.gunCd[i] || 0) > this.time) return;
    sh.gunCd[i] = this.time + GUN_RELOAD;
    const n = sh.a + st.side * Math.PI / 2, aa = n + clamp(wrap(a - n), -0.62, 0.62);
    const [mx, my] = toWorld(sh, st.at[0], st.at[1] + st.side * 7);
    const [v, crit] = this.rollDamage(p, 30 + p.level * 5);
    const pr = this.spawnProj(mx, my - 8, aa, 270, 330, v, 'p', p.id, 'cball', 0, crit, true);
    pr.fromShip = sh.id;
    this.ev(mx, my, ['fx', 'cannon', Math.round(mx), Math.round(my), +aa.toFixed(2), sh.id, i]);
    sh.vx -= Math.cos(aa) * 5; sh.vy -= Math.sin(aa) * 5; // le recul
    this.send(p, { t: 'gcd', i, cd: GUN_RELOAD });
  },
  // ------------------------------------------------------------ la simulation, à chaque tour
  shipsTick() {
    if (this.tickCount % 20 === 0) this.wind = windAt(this.time);
    const live = [];
    for (const sh of this.ships.values()) {
      if (sh.sinkT) continue;
      live.push(sh);
      const x0 = sh.x, y0 = sh.y;
      if (sh.ghost) this.festGhost(sh, DT); else this.shipPhysics(sh, DT); // lot 6 : un rival de la course suit son chemin
      const moved = Math.hypot(sh.x - x0, sh.y - y0);
      for (const id of sh.crew) {
        const q = this.players.get(id);
        if (!q || q.ship !== sh.id) { sh.crew.delete(id); continue; }
        [q.x, q.y] = toWorld(sh, q.lx, q.ly);
        q.st.sea += moved / TILE;
        if ((this.tickCount + q.id) % 10 === 0) this.setZone(q, zoneAt(this.world, q.x, q.y));
      }
      if (this.tickCount % 20 === 0) {
        const max = this.hullMax(sh.item);
        if (this.time - sh.hitAt > 10 && sh.hull < max * 0.5) { sh.hull = Math.min(Math.round(max * 0.5), sh.hull + 1); const o = this.shipOwner(sh); if (o) { o.hulls[sh.item] = sh.hull; o.dirtyMe = true; } }
        if (!sh.crew.size && !sh.oid && !sh.ghost && !sh.race && this.time - sh.emptySince > DESPAWN) this.ships.delete(sh.id);
      }
    }
    // les navires se heurtent entre eux
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const A = live[i], B = live[j], SA = this.spec(A), SB = this.spec(B);
      if ((A.race && B.race) || A.ghost || B.ghost) continue; // lot 6 : dans la course, personne ne bloque personne
      if (Math.hypot(A.x - B.x, A.y - B.y) > (SA.L + SB.L) / 2 + 4) continue;
      const o = shipOverlap(A, SA, B, SB);
      if (!o) continue;
      const [nx, ny, d] = o, ma = SA.mass, mb = SB.mass, ka = mb / (ma + mb), kb = ma / (ma + mb);
      if (hullClear(this.world, SA, A.x + nx * d * ka, A.y + ny * d * ka, A.a)) { A.x += nx * d * ka; A.y += ny * d * ka; }
      if (hullClear(this.world, SB, B.x - nx * d * kb, B.y - ny * d * kb, B.a)) { B.x -= nx * d * kb; B.y -= ny * d * kb; }
      const rv = (A.vx - B.vx) * nx + (A.vy - B.vy) * ny;
      if (rv < 0) {
        A.vx -= rv * nx * ka * 1.2; A.vy -= rv * ny * ka * 1.2; B.vx += rv * nx * kb * 1.2; B.vy += rv * ny * kb * 1.2;
        if (-rv > 45) { const dmg = Math.round((-rv - 35) * 0.5); this.shipHit(A, Math.round(dmg * kb * 1.6)); this.shipHit(B, Math.round(dmg * ka * 1.6)); this.ev((A.x + B.x) / 2, (A.y + B.y) / 2, ['fx', 'crash', Math.round((A.x + B.x) / 2), Math.round((A.y + B.y) / 2)]); }
      }
    }
    if (this.tickCount % 40 === 0) for (const p of this.players.values()) { // où est mon navire ? (pour la carte)
      const sh = this.ownShip(p.key);
      if (sh) this.send(p, { t: 'ms', id: sh.id, x: Math.round(sh.x), y: Math.round(sh.y), a: +sh.a.toFixed(2), item: sh.item });
      else if (p.hadShip) this.send(p, { t: 'ms', id: 0 });
      p.hadShip = !!sh;
    }
  },
  shipPhysics(sh, dt) {
    const S = this.spec(sh), B = ITEMS[sh.item].boat, maxV = this.shipMaxSpeed(sh);
    if (this.heistCurrent) this.heistCurrent(sh, dt, [this.shipOwner(sh), ...[...this.players.values()].filter((q) => q.ship === sh.id)]); // lot 5 : les Sept Courants
    if (this.festCurrent) this.festCurrent(sh, dt); // lot 6 : les courants et les vents de la course
    // la barre : la roue tourne tant qu'on la pousse, et reste où on la laisse
    const helm = sh.posts.helm && sh.ctl[sh.posts.helm];
    if (helm && helm[0]) sh.rud = clamp(sh.rud + helm[0] * S.rud * dt, -1, 1);
    // la voilure : on déploie (Z) ou l'on cargue (S) aux drisses — ou depuis la barre, l'équipage obéit au barreur
    const sails = sh.posts.sails && sh.ctl[sh.posts.sails];
    const sy = sails && sails[1] ? sails[1] : helm && helm[1] ? helm[1] : 0;
    if (sy) sh.sailT = clamp(sh.sailT - sy * 0.5 * dt, 0, 1);
    if (helm && helm[1] < -0.3 && sh.anchor) sh.autoAnchor = true; // on veut partir : l'équipage lève l'ancre
    sh.sail += clamp(sh.sailT - sh.sail, -0.55 * dt, 0.32 * dt);
    // l'ancre : jetée en un instant, levée à la force des bras
    let crank = 0, drop = false;
    for (const id of sh.cap) { const c = sh.ctl[id]; if (c && c[1] < -0.3) crank++; if (c && c[1] > 0.3) drop = true; }
    if (sh.autoAnchor && sh.anchor === 2) crank = Math.max(crank, 1); // l'équipage au cabestan
    if (sh.anchor === 0 || (sh.autoAnchor && sh.sailT <= 0 && !sh.anchorP)) sh.autoAnchor = false;
    if (sh.anchor === 0 && drop) { sh.anchor = 1; sh.anchorAt = this.time + 1.1; this.ev(sh.x, sh.y, ['fx', 'anchor', sh.id, 1]); }
    if (sh.anchor === 1 && this.time >= sh.anchorAt) { sh.anchor = 2; sh.anchorP = 0; }
    if (sh.anchor === 2 && crank) {
      sh.anchorP += dt / ANCHOR_UP * (1 + 0.65 * (crank - 1));
      if (sh.anchorP >= 1) { sh.anchor = 0; sh.anchorP = 0; this.ev(sh.x, sh.y, ['fx', 'anchor', sh.id, 0]); }
    } else if (sh.anchor === 2 && sh.anchorP > 0 && !crank) sh.anchorP = Math.max(0, sh.anchorP - dt * 0.08); // le cabestan glisse un peu
    // la vitesse : le long de la coque (u), en travers (la dérive, l)
    const c = Math.cos(sh.a), s = Math.sin(sh.a);
    let u = sh.vx * c + sh.vy * s, l = -sh.vx * s + sh.vy * c;
    const vt = sh.anchor ? 0 : sh.sail * maxV * windFactor(sh.a, this.wind.a) * this.wind.s * (sh.windMul || 1);
    const tau = sh.anchor === 2 ? 0.9 : sh.anchor === 1 ? 1.8 : u < vt ? S.tau : S.tau * 1.5;
    u += (vt - u) * (1 - Math.exp(-dt / tau));
    l *= Math.exp(-dt / S.lat);
    // gouverner : il faut de l'erre ; ancre au fond et de la vitesse, le navire pivote sur elle
    const steer = Math.max(0.1, Math.min(1, Math.abs(u) / (0.3 * B.speed)));
    let wt = sh.rud * S.turn * steer * (u < -2 ? -1 : 1);
    if (sh.anchor && Math.abs(u) > 18) wt *= 1.8;
    sh.w += (wt - sh.w) * (1 - Math.exp(-dt / (0.45 + S.mass * 0.11)));
    let vx = u * c - l * s, vy = u * s + l * c;
    // le tourbillon du Kraken aspire ; ses tentacules retiennent
    const wh = this.whirl;
    if (wh && this.time < wh.until) { const dx = wh.x - sh.x, dy = wh.y - sh.y, d = Math.hypot(dx, dy); if (d < wh.r && d > 14) { vx += dx / d * wh.v * 1.6 * dt; vy += dy / d * wh.v * 1.6 * dt; } }
    for (const id of sh.crew) { const q = this.players.get(id); if (q && this.time < (q.grabbedUntil || 0)) { vx *= 0.82; vy *= 0.82; sh.w *= 0.8; break; } }
    // échoué : voile carguée, l'équipage déborde le navire à la gaffe (il recule doucement)
    const ag = this.time - (sh.blockedAt || -99);
    if (ag < 4.5 && sh.sail < 0.35 && !sh.anchor && sh.crew.size) { const k = 14 * (1 - ag / 4.5); if (u > -k) { vx += -c * (k + u) * 0.5; vy += -s * (k + u) * 0.5; } }
    const na = sh.a + sh.w * dt, nx = sh.x + vx * dt, ny = sh.y + vy * dt, W = this.world;
    if (hullClear(W, S, nx, ny, na)) { sh.x = nx; sh.y = ny; sh.a = na; }
    else {
      // on frotte contre le quai ou la côte : on glisse le long, en perdant de la vitesse ; un choc franc abîme la coque
      const sp = Math.hypot(vx, vy), va = Math.atan2(vy, vx);
      const rotOk = hullClear(W, S, sh.x, sh.y, na), a2 = rotOk ? na : sh.a;
      if (!rotOk) sh.w *= -0.25;
      let slid = false;
      for (const d of [0.3, -0.3, 0.6, -0.6, 0.95, -0.95, 1.3, -1.3]) {
        const k = Math.cos(d) * 0.85, mx = Math.cos(va + d) * sp * k * dt, my = Math.sin(va + d) * sp * k * dt;
        if (sp > 0.5 && hullClear(W, S, sh.x + mx, sh.y + my, a2)) { sh.x += mx; sh.y += my; vx = Math.cos(va + d) * sp * k; vy = Math.sin(va + d) * sp * k; slid = true; if (Math.abs(d) > 0.9) this.shipBump(sh, sp * Math.sin(Math.abs(d))); break; }
      }
      sh.a = a2;
      if (!slid) {
        this.shipBump(sh, sp); vx *= -0.15; vy *= -0.15;
        if (this.time - (sh.blockedAt || -9) > 8) for (const id of sh.crew) { const q = this.players.get(id); if (q) this.toast(q, 'Échoué ! Carguez la voile (aux drisses, S) : l’équipage déborde le navire à la gaffe.', 'warn'); }
        sh.blockedAt = this.time;
      }
      if (!hullClear(W, S, sh.x, sh.y, sh.a)) for (let k = 0; k < 8; k++) { const ex = sh.x + Math.cos(k * Math.PI / 4) * 1.5, ey = sh.y + Math.sin(k * Math.PI / 4) * 1.5; if (hullClear(W, S, ex, ey, sh.a)) { sh.x = ex; sh.y = ey; break; } } // dégager une coque coincée
    }
    sh.a = wrap(sh.a); sh.vx = vx; sh.vy = vy; sh.u = u;
  },
  shipBump(sh, sp) {
    if (sp < 40 || this.time < sh.bumpAt) return;
    sh.bumpAt = this.time + 1.2;
    const S = this.spec(sh), [bx, by] = toWorld(sh, S.L / 2 - 6, 0);
    this.ev(bx, by, ['fx', 'crash', Math.round(bx), Math.round(by)]);
    for (const id of sh.crew) { const q = this.players.get(id); if (q) this.toast(q, sp > 80 ? 'Le navire s’écrase sur les rochers !' : 'Le navire talonne !', 'warn'); }
    this.shipHit(sh, Math.round((sp - 34) * 0.55));
  },
  // ------------------------------------------------------------ lot 1 : monter, descendre, dégager, rentrer au port
  // monter à bord avec E, depuis le rivage ou des hauts-fonds tout proches : par l'ouverture la plus proche
  boardByE(p, id) {
    const sh = this.ships.get(id | 0);
    if (!sh || sh.sinkT || p.dead || p.room !== -1 || p.ship) return;
    if (!this.canBoard(p, sh)) return this.toast(p, `Ce navire appartient à ${sh.ownName} : seuls son groupe et son équipage y montent.`, 'warn');
    if (this.shipSpeed(sh) > BOARD_SPEED) return this.toast(p, 'Le navire file trop vite pour sauter à bord.', 'warn');
    const S = this.spec(sh), xs = S.open ? [-S.L * 0.3, 0, S.L * 0.3] : (S.ops || []).map((o) => o.x);
    let best = null;
    for (const ox of xs) for (const side of [-1, 1]) {
      const hw = hullHalf(S, ox), [rx, ry] = toWorld(sh, ox, side * hw), d = Math.hypot(rx - p.x, ry - p.y);
      if (!best || d < best.d) best = { d, ox, side, hw };
    }
    if (!best || best.d > 64) return this.toast(p, 'Approchez-vous du navire.', 'warn');
    const [lx, ly] = nearestDeck(S, best.ox, best.side * (best.hw - 9));
    this.joinDeck(p, sh, lx, ly);
    this.sendPos(p);
  },
  // descendre à terre avec E : le point de terre ferme le plus proche de la coque (quai, plage, hauts-fonds)
  landByE(p) {
    const sh = this.myShip(p);
    if (!sh || p.dead) return;
    if (this.shipSpeed(sh) > BOARD_SPEED + 10) return this.toast(p, 'Le navire file trop vite : ralentissez (S aux drisses ou à la barre) avant de sauter à terre.', 'warn');
    const S = this.spec(sh), W = this.world;
    let best = null;
    for (let lx = -S.L / 2 + 4; lx <= S.L / 2 - 4; lx += 6) for (const side of [-1, 1]) {
      const hw = hullHalf(S, lx); if (hw < 3) continue;
      const [rx, ry] = toWorld(sh, lx, side * hw), nx = -Math.sin(sh.a) * side, ny = Math.cos(sh.a) * side;
      for (let g = 4; g <= 72; g += 4) {
        const x = rx + nx * g, y = ry + ny * g + 4;
        if (canStand(W, x, y, false, p.key) && roomIdAt(W, x, y) === -1 && !this.pointOnShip(x, y)) { const d = g + Math.hypot(lx - p.lx, side * hw - p.ly) * 0.3; if (!best || d < best.d) best = { d, x, y }; break; }
      }
    }
    if (!best) return this.toast(p, 'Pas de terre ferme à portée : approchez un quai, une plage ou des hauts-fonds (ou « Rentrer au port » sur le tableau de bord).', 'warn');
    const left = sh.own === p.key && sh.crew.size === 1 && !sh.anchor && sh.sail > 0.15;
    this.leaveDeck(p);
    this.teleport(p, best.x, best.y, { land: 1 });
    if (left) this.toast(p, 'Votre navire repart sans vous, voiles dehors ! (Jetez l’ancre avant de descendre.)', 'warn');
  },
  // dégager un navire coincé (échoué, pris contre un quai) : il glisse vers l'eau libre la plus proche
  unstickShip(p) {
    const sh = this.myShip(p);
    if (!sh || sh.sinkT) return;
    if (this.time < (sh.unstickAt || 0)) return this.toast(p, 'L’équipage reprend son souffle : réessayez dans un instant.', 'info');
    const S = this.spec(sh), others = [...this.ships.values()].filter((o) => o !== sh);
    let spot = null;
    for (let r = 12; r <= 240 && !spot; r += 12) for (let k = 0; k < 16 && !spot; k++) {
      const x = sh.x + Math.cos(k / 16 * Math.PI * 2) * r, y = sh.y + Math.sin(k / 16 * Math.PI * 2) * r;
      for (const da of [0, 0.4, -0.4, 0.8, -0.8, Math.PI]) if (shipFits(this.world, S, x, y, sh.a + da, others)) { spot = [x, y, sh.a + da]; break; }
    }
    if (!spot) return this.toast(p, 'Impossible de dégager le navire ici : utilisez « Rentrer au port ».', 'warn');
    sh.unstickAt = this.time + UNSTICK_CD;
    [sh.x, sh.y, sh.a] = spot; sh.vx = sh.vy = sh.w = 0; sh.blockedAt = -99;
    for (const id of sh.crew) { const q = this.players.get(id); if (q) { [q.x, q.y] = toWorld(sh, q.lx, q.ly); this.sendPos(q); } }
    this.ev(sh.x, sh.y, ['fx', 'splash', Math.round(sh.x), Math.round(sh.y)]);
    for (const id of sh.crew) { const q = this.players.get(id); if (q) this.toast(q, 'À la gaffe et aux avirons, l’équipage dégage le navire.', 'info'); }
  },
  // rentrer au port : l'équipage ramène le navire au quai le plus proche (après quelques secondes au calme)
  homeShip(p) {
    const sh = this.myShip(p) || this.ownShip(p.key);
    if (!sh || sh.sinkT) return this.toast(p, 'Vous n’avez pas de navire armé.', 'info');
    if (sh.own !== p.key && !(p.ship === sh.id && !sh.oid)) return this.toast(p, 'Seul le capitaine peut ramener le navire au port.', 'warn');
    if (this.time < (sh.homeAt || 0)) return this.toast(p, `Le navire a déjà fait le voyage : encore ${Math.ceil(sh.homeAt - this.time)} s.`, 'warn');
    if (p.homing) return;
    if (this.time - p.lastHurt < 4) return this.toast(p, 'Pas en plein combat !', 'warn');
    p.homing = { until: this.time + HOME_CHANNEL, hp: p.hp, sid: sh.id };
    this.send(p, { t: 'homing', dur: HOME_CHANNEL });
    this.toast(p, `Cap sur le port… (${HOME_CHANNEL} s, sans être touché)`, 'info');
  },
  homeTick(p) {
    const h = p.homing; if (!h) return;
    if (p.dead || p.hp < h.hp - 0.5 || this.time - p.lastHurt < 0.2) { p.homing = null; this.send(p, { t: 'homing', dur: 0 }); return this.toast(p, 'Retour au port interrompu !', 'warn'); }
    if (this.time < h.until) return;
    p.homing = null;
    const sh = this.ships.get(h.sid); if (!sh || sh.sinkT) return;
    const place = placeOf(this.world, sh.x, sh.y), b = (place && berthOfPlace(place)) || BERTHS.reduce((a, q) => (Math.hypot(q.tx * TILE - sh.x, q.ty * TILE - sh.y) < Math.hypot(a.tx * TILE - sh.x, a.ty * TILE - sh.y) ? q : a), BERTHS[0]);
    const spot = findBerth(this.world, this.spec(sh), b, [...this.ships.values()].filter((o) => o !== sh));
    if (!spot) return this.toast(p, `Le ${b.name.toLowerCase()} est encombré : réessayez plus tard.`, 'warn');
    sh.homeAt = this.time + HOME_CD;
    sh.x = spot.x; sh.y = spot.y; sh.a = spot.a; sh.vx = sh.vy = sh.w = 0; sh.rud = 0; sh.sail = sh.sailT = 0; sh.anchor = 2; sh.anchorP = 0; sh.autoAnchor = false; sh.berth = b.key;
    for (const id of sh.crew) { const q = this.players.get(id); if (!q) continue; this.leavePost(q, sh); [q.x, q.y] = toWorld(sh, q.lx, q.ly); q.zone = zoneAt(this.world, q.x, q.y); this.sendPos(q, { travel: 1 }); this.toast(q, `Le navire est amarré au ${b.name.toLowerCase()}.`, 'quest'); }
    if (!sh.crew.has(p.id)) this.toast(p, `Votre navire est amarré au ${b.name.toLowerCase()}.`, 'quest');
  },
  // ------------------------------------------------------------ la coque : coups, naufrage
  shipHit(sh, dmg) {
    if (sh.sinkT || !(dmg > 0)) return;
    sh.hull = Math.max(0, sh.hull - dmg); sh.hitAt = this.time;
    const o = this.shipOwner(sh); if (o) { o.hulls[sh.item] = Math.round(sh.hull); o.dirtyMe = true; }
    if (sh.hull <= 0) this.sinkShip(sh);
  },
  // un pirate touché sur le pont : la coque encaisse l'essentiel
  hullHit(p, dmg) {
    const sh = this.myShip(p);
    if (!sh) return dmg;
    const h = Math.round(dmg * 0.7);
    this.shipHit(sh, h);
    return Math.max(1, dmg - h);
  },
  sinkShip(sh) {
    sh.sinkT = this.time; sh.ver++; sh.vx *= 0.3; sh.vy *= 0.3;
    const name = ITEMS[sh.item].name;
    this.ev(sh.x, sh.y, ['boom', Math.round(sh.x), Math.round(sh.y), 40, 1]);
    for (const id of sh.crew) { const q = this.players.get(id); if (q) this.toast(q, `${name} prend l’eau et sombre !`, 'warn'); }
    const o = this.shipOwner(sh); if (o) { o.hulls[sh.item] = 0; o.dirtyMe = true; if (!sh.crew.has(o.id)) this.toast(o, `${name} a sombré.`, 'warn'); }
    this.later(1.6, () => {
      for (const id of [...sh.crew]) { const q = this.players.get(id); if (!q) continue; q.hp = Math.max(1, Math.min(q.hp, Math.round(q.stats.maxHp * 0.3))); q.dirtyMe = true; this.dropAshore(q, 'Vous regagnez la côte à la nage. Faites réparer la coque au chantier naval avant de reprendre la mer.'); }
    });
    this.later(4.5, () => this.ships.delete(sh.id));
  },
  // un boulet entre-t-il dans une coque ? (pas la sienne ; et contre un autre pirate, seulement si le JcJ le permet)
  projShip(pr) {
    if (pr.kind !== 'cball') return null;
    const own = pr.team === 'p' ? this.players.get(pr.owner) : null;
    for (const sh of this.ships.values()) {
      if (sh.sinkT || sh.race || sh.ghost || pr.fromShip === sh.id || (own && own.ship === sh.id)) continue; // lot 6 : les boulets traversent les voiliers de la course
      const S = this.spec(sh);
      if (Math.abs(sh.x - pr.x) > S.L / 2 + 8 || Math.abs(sh.y - pr.y) > S.L / 2 + 8) continue;
      const [lx, ly] = toLocal(sh, pr.x, pr.y + 8);
      if (!insideHull(S, lx, ly) || Math.abs(lx) > S.L / 2) continue;
      if (own) { const o = this.shipOwner(sh); if (!o || !this.canPvp(own, o)) continue; }
      return sh;
    }
    return null;
  },
  shipStruck(sh, pr, src) {
    this.shipHit(sh, Math.round(pr.dmg * 0.8));
    for (const id of sh.crew) { // des éclats de bois pour ceux qui sont tout près
      const q = this.players.get(id);
      if (q && !q.dead && Math.hypot(q.x - pr.x, q.y - 9 - pr.y) < 18) this.damagePlayer(q, Math.round(pr.dmg * 0.25), src, false, 'w');
    }
    this.ev(pr.x, pr.y, ['fx', 'splinter', Math.round(pr.x), Math.round(pr.y + 8)]);
  },
  pointOnShip(x, y) { for (const sh of this.ships.values()) { if (sh.sinkT) continue; const S = this.spec(sh); if (Math.abs(sh.x - x) > S.L / 2 + 4 || Math.abs(sh.y - y) > S.L / 2 + 4) continue; const [lx, ly] = toLocal(sh, x, y); if (Math.abs(lx) < S.L / 2 && insideHull(S, lx, ly, 2)) return sh; } return null; },
  // ------------------------------------------------------------ réseau, sauvegarde, connexion
  shipMeta(sh) { const o = this.shipOwner(sh); return { id: sh.id, k: 's', kind: sh.kind, item: sh.item, name: ITEMS[sh.item].name, own: sh.ownName, cw: o && o.crew && this.crews.get(o.crew) ? this.crews.get(o.crew).tag : '', hmax: this.hullMax(sh.item), pal: sh.pal || undefined, cos: sh.cos || undefined, race: sh.race ? 1 : 0 }; },
  shipLine(sh) { return [sh.id, Math.round(sh.x * 10), Math.round(sh.y * 10), Math.round(sh.a * 1000), Math.round(sh.u), Math.round(sh.sail * 100), Math.round(sh.rud * 100), sh.anchor * 100 + Math.round(sh.anchorP * 99), Math.round(sh.hull), sh.sinkT ? 1 : 0, Math.round(Math.hypot(sh.vx, sh.vy))]; },
  shipSave(p) {
    const sh = this.ownShip(p.key), on = this.myShip(p);
    return {
      ship: sh ? { item: sh.item, x: Math.round(sh.x), y: Math.round(sh.y), a: +sh.a.toFixed(3), anc: sh.anchor ? 1 : 0, sail: +sh.sail.toFixed(2) } : null,
      deck: on ? { own: on.own, lx: Math.round(p.lx), ly: Math.round(p.ly) } : null,
    };
  },
  shipLoad(p, d) {
    p.ship = 0; p.post = null; p.lx = 0; p.ly = 0;
    if (!d) return;
    if (d.ship && typeof d.ship.x === 'number' && ITEMS[d.ship.item] && ITEMS[d.ship.item].boat) p.pendingShip = d.ship;
    if (d.deck && typeof d.deck.own === 'string') p.pendingDeck = d.deck;
    // sauvegarde d'avant la 1.1 : le pirate était « en barque » en pleine mer
    if (!d.ship && d.boat && ITEMS[d.boat] && ITEMS[d.boat].boat && typeof d.x === 'number') { p.pendingShip = { item: d.boat, x: d.x, y: d.y, a: 0, anc: 1 }; p.pendingDeck = { own: p.key, lx: 0, ly: 0 }; }
    if (p.pendingDeck && typeof d.x === 'number') { p.seaX = d.x; p.seaY = d.y; }
  },
  shipLogin(p) {
    let sh = this.ownShip(p.key);
    if (sh) { sh.oid = p.id; sh.ownName = p.name; sh.crewId = p.crew || 0; sh.ver++; p.hulls[sh.item] = Math.round(sh.hull); }
    else if (p.pendingShip && this.countItem(p, p.pendingShip.item) && this.hullOf(p, p.pendingShip.item) > 0) {
      const ps = p.pendingShip, S = shipOf(ITEMS[ps.item].boat.kind), others = [...this.ships.values()];
      let spot = null;
      for (let r = 0; r <= 96 && !spot; r += 12) for (let k = 0; k < (r ? 12 : 1) && !spot; k++) for (let h = 0; h < 8 && !spot; h++) {
        const x = ps.x + Math.cos(k / 12 * Math.PI * 2) * r, y = ps.y + Math.sin(k / 12 * Math.PI * 2) * r, a = (+ps.a || 0) + h * Math.PI / 4;
        if (shipFits(this.world, S, x, y, a, others)) spot = [x, y, a];
      }
      const aboard = p.pendingDeck && p.pendingDeck.own === p.key;
      if (spot) sh = this.createShip(p, ps.item, spot[0], spot[1], spot[2], aboard ? { anchor: ps.anc ? 2 : 0, sail: +ps.sail || 0 } : { anchor: 2 });
    }
    p.pendingShip = null;
    const dk = p.pendingDeck; p.pendingDeck = null;
    if (!dk) return;
    const t = this.ownShip(dk.own);
    if (t) { const [lx, ly] = nearestDeck(this.spec(t), +dk.lx || 0, +dk.ly || 0); this.joinDeck(p, t, lx, ly); return; }
    if (p.seaX != null) { const at = this.shoreNear(p.seaX, p.seaY, 1600); if (at) { p.x = at[0]; p.y = at[1]; p.zone = zoneAt(this.world, p.x, p.y); p.room = -1; } }
  },
  shipLogout(p) {
    if (p.ship) this.leaveDeck(p);
    const sh = this.ownShip(p.key);
    if (sh) { sh.oid = 0; sh.ver++; if (!sh.crew.size) sh.emptySince = this.time; }
  },
  shipMe(p) {
    const sh = this.myShip(p) || this.ownShip(p.key);
    return { ship: p.ship || 0, post: p.post || '', hull: sh ? Math.round(sh.hull) : 0, hullMax: sh ? this.hullMax(sh.item) : 0, repairCost: this.repairCost(p), wind: [+this.wind.a.toFixed(2), +this.wind.s.toFixed(2)] };
  },
};
