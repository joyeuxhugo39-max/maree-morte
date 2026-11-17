// Point d'entrée du client : état, réseau, prédiction locale, boucle principale.
import { generateWorld, moveWithCollision, moveBoat, canSail, canStand, roomIdAt, tileAt, zoneAt, Z, ZONES, SAFE } from '../shared/world.js';
import { TILE, ROLL_SPEED, ROLL_TIME, SPEED_MUL, INTERACT_RANGE, isNight, dayFrac, weatherAt, WEATHER_PERIOD, T, isFullMoon, moonPhase, PROTOCOL } from '../shared/constants.js';
import { MOBS } from '../shared/data/mobs.js';
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { mulberry32 } from '../shared/rng.js';
import { CLOTH_KEYS, mobSheet, humanSheet } from './render/sprites-chars.js';
import { STRUCTS, PLANTER_GROW, HOME_OK, HOME_PRICE, QUEST_PICK } from '../shared/data/craft.js';
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS } from '../shared/data/skills.js';
import { QUESTS, QUEST_ORDER, npcVisible } from '../shared/data/quests.js';
import { displayLook } from '../shared/formulas.js';
import { Renderer, dirFromAngle } from './render/renderer.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { WSNet, LocalNet } from './net.js';
import { RoomNet } from './roomnet.js';
import { iconURL, iconCanvas } from './render/sprites-items.js';
import { updateCine, cineLocked, endCine, bossIntro, bossDown, krakenIntro, krakenDown } from './cine.js';
import { Scene } from './scene.js';
import { Townsfolk } from './townsfolk.js';
import { applyTheme } from './render/ui-art.js';
applyTheme(); // 0.8.1 : parchemin, cadres de bois ferré, fleurons — avant même l'écran d'accueil

const $ = (id) => document.getElementById(id);
// page publique (github.io) : multijoueur direct entre navigateurs
const PAGES = typeof __MM_PAGES__ !== 'undefined' && __MM_PAGES__;
function peerOptions() {
  const q = new URLSearchParams(location.search), sig = q.get('signal');
  if (!sig) return {};
  const [host, port] = sig.split(':');
  return { peer: { host, port: +port || 9000, path: '/', secure: false, config: { iceServers: [] } }, world: q.get('monde') || undefined };
}
const nowS = () => performance.now() / 1000;
const dirOf = (dx, dy) => Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
const HIT_COL = {
  zsailor: ['#7aa04a', '#4e6e3a', '#a0c070'], buccaneer: ['#7aa04a', '#4e6e3a', '#8a2a2a'], ghoul: ['#9a8ab0', '#5a4a6e', '#c8b8e0'],
  drowned: ['#6aa09a', '#bfefff', '#3f6b68'], skelgun: ['#eee6cc', '#c8bfa2', '#9a9076'], crab: ['#c85a56', '#e8867a', '#6a8a4a'],
  boss: ['#9dff6a', '#56505a', '#9a929a'], p: ['#d83a2a', '#8a1c1c', '#ff7a6a'], roi_squelette: ['#eee6cc', '#c8bfa2', '#b8ff6a'],
};

const G = {
  world: null, renderer: null, ui: null, input: null, sfx: new Sfx(), net: null, mode: null,
  myId: 0, me: null, meAt: 0, inv: [], eq: {}, quests: {}, chests: {}, base: null,
  player: null, ents: new Map(), npcs: [], worldTime: 0, online: 1, ping: 0,
  camTarget: { x: 0, y: 0 }, snapCam: true, cd: {}, cdTotal: {}, zone: -1, night: false,
  mouseWorld: null, interactTarget: null, aim: 0, lastSend: 0, lastMoving: false, title: true,
  ach: {}, treasure: null, evt: null, objective: null, folk: [], cats: [],
  structs: new Map(), floors: new Map(), bases: [], depleted: new Map(), build: null, aide: 'discret',
  room: -1, lastRoom: -1, found: new Set(), doorCd: 0, myKey: null,
  startBuild: (id) => startBuild(id),
  send(m) { if (G.net) G.net.send(m); if (m && G.tutFlags) { if (m.t === 'atk') G.tutFlags.atk = 1; if (m.t === 'sk') G.tutFlags[m.s] = 1; } },
  countItem(id) { let c = 0; for (const s of G.inv || []) if (s && s.id === id) c += s.n; return c; },
  npcMarker(id) {
    let mk = null;
    for (const qid of QUEST_ORDER) {
      const q = QUESTS[qid], s = G.ui.questStateOf(qid);
      if (q.turnin === id && s === 'ready') return '?';
      if (q.giver === id && s === 'available') mk = '!';
      else if (!mk && (q.turnin === id) && s === 'active') mk = '?';
    }
    return mk;
  },
  // les PNJ d'une histoire n'apparaissent qu'à leur étape
  refreshNpcs() { G.npcs = G.allNpcs.filter((n) => npcVisible(NPCS[n.id], G.quests || {}, G.me ? G.me.lvl : 1)); },
  npcReady(id) { return QUEST_ORDER.some((qid) => QUESTS[qid].turnin === id && G.ui.questStateOf(qid) === 'ready'); },
  useSkill: (id, fromUI) => useSkill(id, fromUI),
  inHome: () => !!myHomeRoom(),
};
window.G = G; window.MM_ICON = (i, t) => iconCanvas(i, t, 2);
// outils de vérification visuelle (planches de sprites)
window.MM_MOBSHEET = (k) => mobSheet(k); window.MM_HUMAN = (l) => humanSheet(l);
window.MM_OUTFITS = Object.entries(ITEMS).filter(([, it]) => it.slot === 'outfit').map(([id]) => [id, displayLook({ skin: 1, hair: 1, hairStyle: 'court' }, { outfit: id })]);

// ------------------------------------------------------------ démarrage
async function boot(hotData = {}) {
  G.world = generateWorld(7);
  G.renderer = new Renderer($('view'), G.world);
  G.renderer.G = G;
  G.allNpcs = G.world.npcs.map((n) => ({ ...n, name: NPCS[n.id].name, look: NPCS[n.id].look, parrot: !!NPCS[n.id].parrot, board: !!NPCS[n.id].board }));
  G.npcs = G.allNpcs.filter((n) => !NPCS[n.id].vis);
  G.ui = new UI(G); G.scene = new Scene(G);
  G.input = new Input($('view'), () => G.ui.typing());
  const resize = () => G.renderer.resize(innerWidth, innerHeight);
  G.ui.applySettings(G.ui.settings());
  resize(); addEventListener('resize', resize);
  G.renderer.onThunder = (r) => G.sfx.thunder(r);
  G.harvestable = G.world.props.filter((q) => QUEST_PICK[q.type]); // 0.8 : seulement les décors à objets de quête
  $('build-btn').onclick = () => (G.build ? stopBuild() : startBuild(null));
  // molette : zoom (voir de plus haut ou de plus près)
  $('view').addEventListener('wheel', (e) => {
    if (G.title) return;
    e.preventDefault();
    const next = Math.max(1, Math.min(6, G.renderer.baseScale + (e.deltaY > 0 ? -1 : 1)));
    if (next !== G.renderer.baseScale) G.ui.applySettings(Object.assign(G.ui.settings(), { zoom: next }));
  }, { passive: false });
  initFolk();
  G.camTarget = { x: G.world.spawnPoint.x, y: G.world.spawnPoint.y };
  requestAnimationFrame(loop);

  let online = false;
  const inClaude = !!(window.claude && typeof window.claude.use === 'function');
  const srv = new URLSearchParams(location.search).get('serveur');
  if (!inClaude && (srv || (window.MM_MODE !== 'artifact' && !PAGES)) && /^https?:$/.test(location.protocol)) {
    const url = srv ? (/^wss?:/.test(srv) ? srv : 'wss://' + srv.replace(/^https?:\/\//, '').replace(/\/$/, '') + '/ws') : (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
    try { G.net = await new WSNet(url).connect(3500); online = true; G.mode = 'online'; hookNet(); } catch (e) { G.net = null; }
  }
  if (inClaude) {
    // page publiée sur claude.ai : multijoueur via la salle partagée si possible
    window.claude.use('room').then((room) => {
      G.roomApi = room;
      if (room) $('lg-note').textContent = 'Multijoueur : vous jouerez avec les pirates qui ont cette page ouverte. Votre progression reste dans ce navigateur.';
    }).catch(() => {});
  }
  const submit = async ({ name, pass, look, solo }) => {
    G.sfx.init();
    if (!name || name.length < 3) return G.ui.loginError('Choisissez un nom de pirate (3 à 16 caractères).');
    if (!online && !G.net) {
      if (PAGES && !solo) {
        G.ui.loginError('Connexion au monde en ligne…');
        try { const { PeerNet } = await import('./peernet.js'); G.net = await new PeerNet(peerOptions()).connect(); G.mode = 'peer'; hookNet(); G.ui.loginError(''); }
        catch (e) { G.net = null; G.ui.loginError(''); G.ui.toast('Monde en ligne injoignable pour le moment : partie solo.', 'warn'); }
      }
      if (!G.net && G.roomApi) {
        try { G.net = await new RoomNet(G.roomApi).connect(); G.mode = 'room'; hookNet(); }
        catch (e) { G.net = null; G.ui.toast('Multijoueur indisponible avec votre accès : partie solo.', 'warn'); }
      }
      if (!G.net) { G.mode = 'solo'; G.net = await new LocalNet().connect(); hookNet(); }
    } else if (solo && G.mode !== 'solo') {
      G.mode = 'solo';
      if (G.net) { G.net.onclose = () => {}; G.net.close(); }
      G.net = await new LocalNet().connect(); hookNet();
    }
    if (!G.net) return G.ui.loginError('Serveur injoignable.');
    G.loginInfo = { name, look };
    const rs = resumeInfo(); // 1.0 : reprise après une coupure, sans redemander le mot de passe
    G.send({ t: 'login', v: PROTOCOL, name, pass: online && !solo ? pass : 'solo', look, rt: rs && rs.name === name ? rs.rt : undefined });
  };
  if (PAGES && !online) G.ui.showLogin({ noPass: true, offerSolo: true, note: 'En ligne : tous ceux qui ouvrent ce lien jouent dans le même monde. Votre progression reste dans ce navigateur.', onSubmit: submit });
  else G.ui.showLogin({ solo: !online, offerSolo: online, onSubmit: submit });
  const rs0 = resumeInfo();
  if (online && rs0 && rs0.auto) { try { sessionStorage.setItem('mm_resume', JSON.stringify({ ...rs0, auto: 0 })); } catch (e) { /* */ } G.ui.loginError('Reconnexion en cours…'); submit({ name: rs0.name, pass: '', look: null, solo: false }); }
  // reprise automatique après une mise à jour de la page
  const resume = hotData && hotData.name;
  if (resume) { $('lg-name').value = hotData.name; setTimeout(() => submit({ name: hotData.name, look: hotData.look || G.ui.look, solo: true }), 600); }
}
function resumeInfo() { try { return JSON.parse(sessionStorage.getItem('mm_resume') || 'null'); } catch (e) { return null; } }
function hookNet() {
  G.net.onmsg = onMsg;
  G.net.onhost = (isHost) => {
    if (!G.player) return;
    G.ui.toast(isHost === true ? 'Vous hébergez maintenant le monde.' : isHost === null ? 'L’hôte est parti : reprise du monde…' : 'Connecté au monde en ligne.', 'info');
  };
  G.net.onclose = () => {
    if (G.mode !== 'online') return;
    $('death').classList.remove('hidden');
    $('death').querySelector('h1').textContent = 'Connexion perdue';
    const rs = resumeInfo();
    if (rs && !G.kicked) { // on attend que le serveur réponde, puis on relance la page et l'on reprend la partie
      $('death-txt').textContent = 'Le serveur ne répond plus. Reconnexion automatique dès son retour…';
      try { sessionStorage.setItem('mm_resume', JSON.stringify({ ...rs, auto: 1 })); } catch (e) { /* */ }
      const t0 = Date.now();
      const poll = () => fetch('/sante', { cache: 'no-store' }).then((r) => { if (r.ok) location.reload(); else throw 0; }).catch(() => { if (Date.now() - t0 < 600000) setTimeout(poll, 2000); else $('death-txt').textContent = 'Le serveur est toujours absent. Rechargez la page plus tard.'; });
      setTimeout(poll, 1500);
    } else $('death-txt').textContent = 'Le serveur ne répond plus. Rechargez la page pour reprendre la mer.';
    $('respawn-btn').textContent = 'Recharger';
    $('respawn-btn').onclick = () => location.reload();
  };
}

// ------------------------------------------------------------ messages du serveur
function onMsg(m) {
  const now = nowS(), ui = G.ui;
  switch (m.t) {
    case 'err': ui.loginError(m.msg); if (m.reload) setTimeout(() => location.reload(), 2500); break;
    case 'maint': G.maint = m.m; ui.maintenance(m.m); break;
    case 'welcome':
      if (m.rt && G.mode === 'online') { try { sessionStorage.setItem('mm_resume', JSON.stringify({ name: m.name, rt: m.rt, auto: 0 })); } catch (e) { /* */ } }
      start(m, now); if (m.maint) { G.maint = m.maint; ui.maintenance(m.maint); }
      break;
    case 's': snapshot(m, now); break;
    case 'me': {
      const prev = G.me;
      G.me = m; G.meAt = now;
      if (G.player) { G.player.lvl = m.lvl; G.player.pet = m.pet || ''; G.player.thief = !!m.vo; }
      if (G.player && m.boat !== undefined && now - (G.posAt || 0) > 0.4) G.player.boat = m.boat || null;
      if (m.room !== undefined && m.room !== G.room && now - (G.posAt || 0) > 0.4) G.room = m.room;
      if (prev && m.lvl !== prev.lvl) { G.refreshNpcs(); ui.renderTracker(); }
      if (G.player) G.player.title = m.title && ACHIEVEMENTS[m.title] ? ACHIEVEMENTS[m.title].title : '';
      if (ui.open === 'forge') ui.renderForge();
      if (ui.open === 'ach') ui.renderAch();
      if (ui.open === 'inventory') ui.renderInventory();
      break;
    }
    case 'inv': {
      const oldGun = G.eq && G.eq.gun;
      G.inv = m.inv; G.eq = m.eq;
      if (G.player) {
        G.player.look = displayLook(G.base, G.eq); G.player.lookKey = JSON.stringify(G.player.look);
        G.player.weapon = G.eq.weapon; G.player.gun = G.eq.gun;
        ui.setPortrait(G.player.look);
      }
      if (!oldGun && G.eq.gun) ui.toast('Arme à feu équipée : clic droit ou 1 pour tirer !', 'quest');
      if (ui.open === 'inventory' || ui.shopNpc) ui.renderInventory();
      if (ui.open === 'trade') ui.renderTrade();
      if (ui.shopNpc) ui.renderShop();
      if (ui.open === 'forge') ui.renderForge();
      if (G.build) ui.renderBuildBar();
      ui.renderTracker();
      break;
    }
    case 'q': G.quests = m.q; if (m.tr) G.track = m.tr; G.refreshNpcs(); ui.renderTracker(); break;
    case 'map': G.mapPlayers = m.pl; break;
    case 'spy': G.spyUntil = now + m.dur; G.renderer.spy = true; G.renderer.resize(G.renderer.lastW, G.renderer.lastH); document.body.classList.add('spy'); G.sfx.play('pickup'); break;
    case 'erupt': { // le volcan se réveille
      G.eruptUntil = now + m.dur; G.quakeAt = now + 0.6;
      G.renderer.shake(6, 1.6); G.sfx.play('rumble'); G.sfx.play('boom', 0.9); setTimeout(() => G.sfx.play('roar', 0.5), 500);
      ui.toast('Le Volcan de Cendrelune entre en éruption ! Fuyez les bombes de lave !', 'warn');
      if (!G.cine) { ui.cineTitle('Éruption !', 'Le Volcan de Cendrelune se réveille', 'down'); setTimeout(() => { if (!G.cine) ui.cineTitle(null); }, 2800); }
      break;
    }
    case 'bite': if (G.player && G.player.fish) G.player.fish.bite = now; G.sfx.play('bite'); break;
    case 'dep': G.depleted.set(m.id, now + m.s); break;
    case 'gather': for (const [id, n] of m.got) ui.feed(`+${n} ${ITEMS[id].name}`, iconURL(ITEMS[id].icon, ITEMS[id].tint)); if (!m.got.length) ui.feed('Rien cette fois…'); if (ui.open === 'craft') ui.renderCraft(); break;
    case 'st': applyBuild(m, now); break;
    case 'stor': ui.openStorage(m.items, m.cap, m.vault); break;
    case 'deed': ui.openDeed(m); break;
    case 'seen': ui.addSeen(m.c); break;
    case 'codex': G.codex = m; if (ui.open === 'codex') ui.renderCodex(); break;
    case 'soc': ui.setSoc(m); break; // 1.0 : amis, groupe, équipage
    case 'tav': ui.tav(m); break; // 1.0 : les jeux de taverne
    case 'arena': { // 1.0 : la Fosse
      if (m.board) {
        const top = m.board.length ? m.board.map(([n, w], i) => `${i + 1}. ${n} — vague ${w}`).join('\n') : 'Personne n’a encore combattu cette semaine.';
        const last = m.last && m.last.length ? `\n\nLa semaine passée : ${m.last.map(([, n, w], i) => `${['🥇', '🥈', '🥉'][i]} ${n} (${w})`).join(', ')}` : '';
        ui.say(`Classement de la Fosse — semaine ${m.week}\n\n${top}${last}`, [{ label: 'Autre chose…', go: () => ui.dialogMain(ui.arenaBoardAsk || 'maitre_fosse') }, { label: 'Au revoir.', go: () => ui.close() }]);
        break;
      }
      const was = G.arena && G.arena.duel;
      G.arena = { run: m.run, duel: m.duel, t0: now };
      if (m.duel && m.duel.fight && !(was && was.fight)) ui.banner('En garde !', `${m.duel.a} contre ${m.duel.b}`);
      break;
    }
    case 'wevt': { // 1.0 : une invasion annoncée
      const was = G.wevt;
      G.wevt = m.end ? null : { ...m, at0: now };
      if (m.end) break;
      if (!was) { ui.banner('Flotte maudite !', `Elle fait voile vers ${m.name} — la marque rouge sur la carte`); G.sfx.play('level'); }
      else if (m.wave && m.wave !== was.wave) ui.banner(m.wave === 3 ? 'Le capitaine débarque !' : `Vague ${m.wave} sur 3`, `Devant ${m.name}`);
      break;
    }
    case 'grp': ui.grp(m); break;
    case 'ask': ui.ask(m); break;
    case 'trade': ui.trade(m); break;
    case 'treasure': G.treasure = m.x == null ? null : { x: m.x, y: m.y }; ui.renderTracker(); break;
    case 'ach': {
      G.ach = m.ach || G.ach;
      const a = ACHIEVEMENTS[m.id];
      if (a) { ui.toast(`Haut fait : ${a.name} — titre « ${a.title} » débloqué (K)`, 'level', iconURL('trophy')); G.sfx.play('ach'); }
      if (ui.open === 'ach') ui.renderAch();
      break;
    }
    case 'toast': ui.toast(m.msg, m.kind); if (m.kind === 'quest') G.sfx.play('quest'); else if (m.kind === 'warn') G.sfx.play('deny'); break;
    case 'chat': {
      ui.chat(m); if (m.kind === 'boss') G.sfx.play('level');
      const who = m.pid ? entOf(m.pid) : null;
      if (who && m.kind === 'chat') G.renderer.addFx({ kind: 'bubble', text: m.m.length > 46 ? m.m.slice(0, 44) + '…' : m.m, follow: () => who, dur: 5, h: 42 });
      break;
    }
    case 'found': G.found = new Set(m.found || []); G.sfx.play('quest'); break;
    case 'dropped': ui.feed(`Lâché : ${ITEMS[m.id].name}${m.n > 1 ? ' ×' + m.n : ''}`, iconURL(ITEMS[m.id].icon, ITEMS[m.id].tint)); G.sfx.play('dig', 0.4); break;
    case 'pos': {
      if (m.travel) { ui.fade(); G.sfx.play('splash', 0.6); G.snapCam = true; }
      const p = G.player; if (!p) break;
      const jump = Math.hypot(m.x - p.x, m.y - p.y) > 48;
      p.x = m.x; p.y = m.y; G.posAt = now;
      if (m.boat !== undefined && (m.boat || null) !== (p.boat || null)) { p.boat = m.boat || null; p.bvx = 0; p.bvy = 0; G.sfx.play('splash'); }
      if (m.room !== undefined && m.room !== G.room) G.room = m.room;
      if (m.door != null) { G.sfx.play('door'); G.ui.fade(); }
      if (jump || m.door != null) G.snapCam = true;
      if (m.respawn) { ui.hideDeath(); G.snapCam = true; G.renderer.burst(p.x, p.y, 20, { col: ['#fff', '#bfe8ff', '#ffd23a'], up: 60, speed: 30, life: 0.8 }); }
      break;
    }
    case 'talk': ui.openDialog(m.npc); break;
    case 'loot': {
      const it = m.id === 'or' ? null : ITEMS[m.id];
      if (m.buy) ui.toast(`Acheté : ${it.name} (−${m.buy} doublons)`, 'loot', iconURL(it.icon, it.tint));
      else ui.toast(it ? `+${m.n} ${it.name}` : `+${m.n} doublons`, 'loot', it ? iconURL(it.icon, it.tint) : iconURL('coins'));
      G.sfx.play(it ? 'pickup' : 'coin');
      if (ui.shopNpc) ui.renderShop();
      break;
    }
    case 'sold': ui.toast(`Vendu : ${ITEMS[m.id].name} (+${m.price})`, 'loot', iconURL('coins')); G.sfx.play('coin'); break;
    case 'chest': if (m.id > 0) G.chests[m.id] = m.until; ui.toast(`Trésor ! +${m.gold} doublons${m.got.length ? ' · ' + m.got.join(', ') : ''}`, 'quest'); G.sfx.play('chest'); break;
    case 'qdone': { const q = QUESTS[m.q]; ui.toast(`Quête terminée : ${q.name}`, 'quest'); G.sfx.play('quest'); break; }
    case 'dice': ui.diceResult(m); break;
    case 'dead': ui.showDeath(m.lost, m.by, m.jail, m.pk); G.sfx.play('die'); break;
    case 'ladder': ui.ladder = m; if (ui.open === 'crew' && ui.crewTab === 'honneur') ui.renderCrew(); break; // 1.0 : honneur et classement
    case 'hon': ui.honHist = m.hist; if (ui.open === 'crew' && ui.crewTab === 'honneur') ui.G.send({ t: 'ladder' }); break;
    case 'kick': G.kicked = true; ui.toast(m.msg, 'warn'); try { sessionStorage.removeItem('mm_resume'); } catch (e) { /* */ } break;
    case 'pong': G.ping = Math.round(performance.now() - m.c); break;
    case 'homes': G.homes = new Map(m.list.map(([k, name, lock, music]) => [k, { name, lock: lock || 0, music: music || '' }])); break;
    case 'seal': { G.seals[m.id] = now + m.open; if (m.id === 'jumeaux') G.sealUntil = now + m.open; const S = G.world.seals.find((q) => q.id === m.id), d = S && G.world.doors[S.door]; if (d && G.player && Math.hypot(G.player.x - d.ox, G.player.y - d.oy) < 400) { G.sfx.play('seal'); G.renderer.shake(3, 0.8); } break; }
    case 'lock': ui.toast(m.msg, m.ok ? 'quest' : 'warn'); G.sfx.play(m.ok ? 'unlock' : 'crack'); if (m.ok) G.burgleUntil = now + 40; break;
    case 'cine': if (m.id === 'kraken' && G.player) krakenIntro(G, m, now); break;
    case 'kr': G.kraken = !!m.on; break;
  }
}
function start(m, now) {
  const again = !!G.player;
  G.ents.clear(); G.renderer.projs.clear(); G.renderer.bombs.length = 0; G.renderer.teles.length = 0;
  G.myId = m.id; G.me = m.me; G.meAt = now;
  G.inv = m.inv; G.eq = m.eq; G.quests = m.q; G.chests = m.chests || {}; G.base = m.base;
  G.ui.setSeen(m.seen); // 1.0 : la brume de la carte
  G.codex = m.codex || G.codex; G.tut = m.tut == null ? 99 : m.tut;
  G.refreshNpcs && (G.me = m.me, G.refreshNpcs());
  G.ach = m.ach || {}; G.treasure = m.treasure || null;
  G.structs.clear(); G.floors.clear(); G.bases = []; G.world.block.fill(0); G.world.doorOwner.clear();
  G.myKey = String(m.name).toLowerCase(); G.room = m.room == null ? -1 : m.room; G.lastRoom = -99; G.found = new Set(m.found || []); G.track = m.tr || [];
  if (m.build) applyBuild({ a: m.build.s, af: m.build.f, b: m.build.b }, now);
  G.depleted.clear(); for (const [id, sec] of m.dep || []) G.depleted.set(id, now + sec);
  G.homes = new Map((m.homes || []).map(([k, name, lock, music]) => [k, { name, lock: lock || 0, music: music || '' }]));
  G.seals = {}; for (const k in m.seals || {}) G.seals[k] = now + m.seals[k]; G.sealUntil = G.seals.jumeaux || 0; G.kraken = !!m.kr; G.burgleUntil = 0; G.inkUntil = 0; G.pull = null; G.grabUntil = 0; G.seaFight = 0;
  if (G.cine) endCine(G);
  G.player = { title: m.me.title && ACHIEVEMENTS[m.me.title] ? ACHIEVEMENTS[m.me.title].title : '', id: m.id, k: 'p', name: m.name, x: m.x, y: m.y, dir: 0, moving: false, look: m.look, lookKey: JSON.stringify(m.look), lvl: m.me.lvl, weapon: m.eq.weapon, gun: m.eq.gun, hp: 100, flags: 0, walk: 0, buf: [], boat: m.boat || null, bvx: 0, bvy: 0, pet: m.pet || '' };
  for (const st of G.structs.values()) st.mine = st.owner === m.name;
  for (const b of G.bases) b.mine = b.mine || b.name === m.name;
  G.worldTime = m.wt;
  G.title = false; G.snapCam = true; G.zone = -1;
  G.ui.hideLogin();
  G.ui.setPortrait(m.look);
  $('hud-name').textContent = m.name;
  G.ui.renderTracker();
  if (!again) for (const h of m.history || []) G.ui.chat(h);
  if (again) { G.ui.hideDeath(); return; }
  if (m.isNew) setTimeout(() => G.ui.toast('ZQSD pour bouger · clic gauche pour frapper · E pour parler · H pour l’aide', 'info'), 1200);
  if (G.mode === 'online') setInterval(() => G.send({ t: 'ping', c: performance.now() }), 3000);
}
function snapshot(m, t) {
  if (m.n) for (const meta of m.n) upsert(meta, t);
  if (m.r) for (const id of m.r) {
    const e = G.ents.get(id);
    if (!e) continue;
    if (e.dyingT) e.removeAt = Math.max(e.removeAt || 0, t + 0.2); else G.ents.delete(id);
  }
  for (const [id, x, y, dir, flags, hp] of m.e) {
    const e = G.ents.get(id);
    if (!e) continue;
    e.buf.push([t, x, y, dir, flags]);
    if (e.buf.length > 14) e.buf.shift();
    e.hp = hp; e.flags = flags;
  }
  if (m.ev) for (const ev of m.ev) onEvent(ev, t);
  if (m.wt != null) G.worldTime = m.wt;
  if (m.on) G.online = m.on;
}
function upsert(meta, t) {
  let e = G.ents.get(meta.id);
  if (meta.k === 'd') {
    if (!e) G.ents.set(meta.id, { id: meta.id, k: 'd', item: meta.item, n: meta.n, x: meta.x, y: meta.y, own: meta.own, ownUntil: t + meta.ou, born: t });
    else e.n = meta.n;
    return;
  }
  if (!e) {
    e = { id: meta.id, k: meta.k, x: meta.x, y: meta.y, dir: 0, moving: false, walk: 0, hp: 100, flags: 0, buf: [[t, meta.x, meta.y, 0, 0]] };
    G.ents.set(meta.id, e);
    if (meta.k === 'm' && (meta.hp < meta.mhp)) e.hp = Math.round(meta.hp / meta.mhp * 100);
  }
  if (meta.k === 'p') { e.name = meta.name; e.look = meta.look; e.lookKey = JSON.stringify(meta.look); e.lvl = meta.lvl; e.weapon = meta.w; e.gun = meta.g; e.title = meta.ti || ''; e.bt = meta.bt || ''; e.pet = meta.pt || ''; e.thief = !!meta.vo; e.cw = meta.cw || ''; e.wd = !!meta.wd; e.pr = !!meta.pr; e.gl = meta.gl || 0; }
  else if (meta.k === 'm') { e.type = meta.type; e.sun = !!meta.sun; e.horde = !!meta.hd; }
  else if (meta.k === 'a') { e.name = meta.name; e.cap = meta.cap; if (meta.sink && !e.sinkT) e.sinkT = t - 3; }
  else e.type = meta.type;
}
const entOf = (id) => (id === G.myId ? G.player : G.ents.get(id));
function nearMe(x, y, r = 300) { const p = G.player; return p && Math.hypot(p.x - x, p.y - y) < r; }
function vol(x, y) { const p = G.player; if (!p) return 0.5; return Math.max(0, 1 - Math.hypot(p.x - x, p.y - y) / 380); }

function onEvent(ev, t) {
  const R = G.renderer, now = nowS(), me = G.myId;
  const e = typeof ev[1] === 'number' ? entOf(ev[1]) : null;
  switch (ev[0]) {
    case 'atk': {
      if (!e || ev[1] === me) break;
      e.atkT = now; e.atkA = ev[2]; e.atkKind = ev[3];
      if (ev[3] === 3) { G.sfx.play('boom', vol(e.x, e.y) * 0.6); R.smoke(e.x + Math.cos(ev[2]) * 14, e.y - 4 + Math.sin(ev[2]) * 8, 8, 'rgba(220,220,220,0.55)', { size: 3, life: 0.9 }); }
      else if (ev[3] !== 1) { if (e.k === 'p') weaponFx(e, e.weapon, ev[2], 0.2); else R.addFx({ kind: 'slash', follow: () => e, a: ev[2], dur: 0.2, r: e.type === 'boss' ? 30 : 17, big: e.type === 'boss' }); G.sfx.play('slash', vol(e.x, e.y) * 0.7); }
      else if (e.k === 'm') { G.sfx.play('musket', vol(e.x, e.y)); }
      break;
    }
    case 'wind': case 'aim':
      if (e) { e.windT = now; e.windDur = ev[3]; e.windA = ev[2]; if (ev[0] === 'aim') { e.atkA = ev[2]; R.addFx({ kind: 'aim', follow: () => e, a: ev[2], dur: ev[3] }); } }
      break;
    case 'dmg': {
      if (!e) break;
      const [, id, v, crit, by, dot] = ev;
      const mine = id === me;
      if ((mine || by === me) && G.player && G.player.boat) G.seaFight = now + 9;
      if (dot === 'g') { R.text(e.x, e.y - 6, v, '#c86aff'); if (mine) { G.ui.hurtFlash(); G.sfx.play('hurt'); } break; }
      if (dot === 'p') { e.cc = e.cc || {}; e.cc.p = now + 1.2; R.text(e.x, e.y - 6, v, '#8ad04a'); if (mine) G.ui.hurtFlash(); break; }
      if (dot) { R.text(e.x, e.y - 6, v, dot === 'f' ? '#ffa040' : '#d83a3a'); R.burst(e.x, e.y - 6, 3, { z: 10, col: dot === 'f' ? ['#ffd24a', '#ff8a2a'] : ['#a01818', '#d83a3a'], speed: 20, up: dot === 'f' ? 30 : 10, life: 0.4, g: dot === 'f' ? -20 : 120 }); break; }
      e.hitT = now;
      R.text(e.x, e.y - (e.type === 'boss' ? 24 : 0), v, mine ? '#ff6a5a' : crit ? '#ffd23a' : '#ffffff', !!crit);
      R.burst(e.x, e.y, crit ? 10 : 6, { z: 10, col: HIT_COL[e.type] || HIT_COL.p, speed: 50, up: 40, life: 0.45 });
      if (mine) { G.ui.hurtFlash(); R.shake(2.5, 0.15); G.sfx.play('hurt'); }
      else if (by === me) G.sfx.play(crit ? 'crit' : 'hit');
      else G.sfx.play('hit', vol(e.x, e.y) * 0.4);
      break;
    }
    case 'heal': if (e) R.text(e.x, e.y, '+' + ev[2], '#7aff8a'); if (ev[1] === me) G.sfx.play('heal'); break;
    case 'die': {
      if (!e) break;
      if (e === G.player) { R.burst(e.x, e.y, 20, { col: HIT_COL.p, speed: 60, up: 50 }); break; }
      if (MOBS[e.type] && MOBS[e.type].ship) { e.dyingT = now; e.removeAt = now + 2.5; R.burst(e.x, e.y, 40, { z: 4, col: ['#ffffff', '#d8f6ff', '#6d4626', '#3a2a1a'], up: 100, speed: 60, life: 1, g: 200 }); R.shake(4, 0.5); G.sfx.play('crack', vol(e.x, e.y)); setTimeout(() => G.sfx.play('splash', vol(e.x, e.y)), 400); break; }
      if (MOBS[e.type] && MOBS[e.type].sea) { e.dyingT = now; e.downT = now; e.removeAt = now + (e.type === 'kraken' ? 4.2 : 0.9); R.burst(e.x, e.y, 24, { z: 2, col: ['#ffffff', '#d8f6ff', '#b85476'], up: 90, speed: 40, life: 0.8, g: 200 }); G.sfx.play('splash', vol(e.x, e.y)); break; }
      e.dyingT = now; e.removeAt = now + 0.85;
      R.decals.push({ x: e.x, y: e.y, kind: e.type === 'crab' || e.type === 'crabroi' ? 'shell' : e.type === 'boss' ? 'skull' : 'bones', v: 0, t0: now });
      R.burst(e.x, e.y, 16, { z: 8, col: HIT_COL[e.type] || HIT_COL.p, speed: 60, up: 60, life: 0.7 });
      R.smoke(e.x, e.y - 4, 6, e.type === 'boss' ? 'rgba(150,255,140,0.5)' : 'rgba(150,190,130,0.45)', { size: 3 });
      if (nearMe(e.x, e.y)) G.sfx.play('die', vol(e.x, e.y));
      if (e.type === 'boss') { R.shake(6, 0.6); R.addFx({ kind: 'flash', x: e.x, y: e.y - 20, r: 60, dur: 0.6 }); }
      break;
    }
    case 'proj': {
      const [, pid, x, y, a, sp, range, kind, owner] = ev;
      R.projs.set(pid, { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, speed: sp, left: range, kind, t: 0, owner });
      R.addFx({ kind: 'flash', x: x + Math.cos(a) * 4, y: y + Math.sin(a) * 4, r: kind === 'ball' ? 5 : 4, dur: 0.08 });
      R.smoke(x + Math.cos(a) * 5, y + 9, 3, 'rgba(220,220,220,0.5)', { z: 9, size: 2, life: 0.6 });
      if (owner !== me && kind !== 'ball') G.sfx.play('shot', vol(x, y) * 0.6);
      break;
    }
    case 'ph': R.projs.delete(ev[1]); R.burst(ev[2], ev[3] + 9, 5, { z: 9, col: ['#ffffff', '#ffd23a', '#aaaaaa'], speed: 40, life: 0.3 }); break;
    case 'bomb': { const [, x0, y0, x1, y1, dur] = ev; R.bombs.push({ x0, y0, x1, y1, dur, t0: now }); G.sfx.play('throw', vol(x0, y0)); break; }
    case 'boom': {
      const [, x, y, r, kind] = ev;
      R.addFx({ kind: 'boom', x, y, r: r * 0.9, dur: 0.55 });
      R.burst(x, y, 34, { col: ['#ffd23a', '#ff8a2a', '#e04a2a', '#5a4a4a'], speed: 95, up: 80, life: 0.75, size: 2 });
      R.smoke(x, y, 10, 'rgba(90,80,80,0.6)', { spread: r, size: 4, life: 1.3 });
      if (nearMe(x, y, 260)) R.shake(kind ? 4 : 5, 0.3);
      G.sfx.play('boom', vol(x, y));
      break;
    }
    case 'tele': R.teles.push({ x: ev[1], y: ev[2], r: ev[3], dur: ev[4], t0: now, style: ev[5] || 0 }); break;
    // 0.8 : trajectoires vivantes (ricochet, boomerang, balle chercheuse), états, éclairs, grappin, montures
    case 'pv': { const p = R.projs.get(ev[1]); if (p) { p.x = ev[2]; p.y = ev[3]; p.vx = Math.cos(ev[4]) * p.speed; p.vy = Math.sin(ev[4]) * p.speed; p.left = ev[5]; } break; }
    case 'pd': R.projs.delete(ev[1]); break;
    case 'cc': if (e) { e.cc = e.cc || {}; e.cc[ev[2]] = now + ev[3]; if (ev[2] === 'e') G.sfx.play('hit', vol(e.x, e.y) * 0.5); if (ev[2] === 'g') R.burst(e.x, e.y - 8, 10, { z: 10, col: ['#ffffff', '#bfefff', '#8ac0ec'], up: 30, speed: 25, life: 0.5 }); } break;
    case 'zap': R.addFx({ kind: 'zap', x0: ev[1], y0: ev[2], x1: ev[3], y1: ev[4], dur: 0.28 }); if (Math.random() < 0.5) G.sfx.play('crit', vol(ev[3], ev[4]) * 0.6); break;
    case 'hookfx': R.addFx({ kind: 'chain', x0: ev[1], y0: ev[2], x1: ev[3], y1: ev[4], dur: 0.35 }); G.sfx.play('roll', vol(ev[3], ev[4]) * 0.6); break;
    case 'ride': if (e) {
      R.smoke(e.x, e.y, 8, 'rgba(220,200,160,0.5)', { size: 2, life: 0.6 });
      if (ev[1] !== me) e.rd = ev[2] ? ev[3] : '';
      G.sfx.play(ev[2] ? 'roll' : 'pickup', vol(e.x, e.y) * 0.7);
    } break;
    case 'lavabomb': { // une bombe jaillit du cratère et retombe sur son cercle
      const V = G.world.volcano, v = R.volc, x0 = v ? v.wx : V.cx, y0 = v ? v.wy : V.cy - V.h + 44;
      R.lavaBombs.push({ x0: x0 + (Math.random() - 0.5) * 40, y0, x1: ev[1], y1: ev[2], t0: now, dur: ev[3], arc: 140 + Math.random() * 120 });
      if (Math.random() < 0.3) G.sfx.play('shot', vol(ev[1], ev[2]) * 0.3);
      break;
    }
    case 'burn': if (e) { // un mort brûle au soleil et retourne sous terre
      e.dyingT = now; e.removeAt = now + 0.85; e.burnT = now;
      R.burst(e.x, e.y - 8, 22, { z: 10, col: ['#ffd24a', '#ff8a2a', '#e04a1a', '#3a2a2a'], up: 70, speed: 30, life: 0.9, g: -30 });
      R.smoke(e.x, e.y - 6, 8, 'rgba(60,50,50,0.6)', { size: 3, life: 1.4 });
      if (nearMe(e.x, e.y, 260)) G.sfx.play('throw', vol(e.x, e.y) * 0.6);
    } break;
    case 'cloud': { const [, x, y, r, dur] = ev; R.clouds.push({ x, y, r, dur, t0: now }); break; }
    case 'immune': if (e) { R.text(e.x, e.y - 18, 'PROTÉGÉ', '#ffd23a'); if (nearMe(e.x, e.y, 200)) G.sfx.play('forge', 0.35); } break;
    case 'link': if (e) e.link = ev[2] ? now : 0; break;
    case 'teleL': R.lteles.push({ x0: ev[1], y0: ev[2], x1: ev[3], y1: ev[4], w: ev[5], dur: ev[6], t0: now, style: ev[7] || 0 }); break;
    case 'boomL': {
      const [, x0, y0, x1, y1, w] = ev, L = Math.hypot(x1 - x0, y1 - y0), sea = !G.renderer.room && tileAt(G.world, (x0 + x1) / 2, (y0 + y1) / 2) === T.DEEP;
      for (let d = 6; d < L; d += 12) { const x = x0 + (x1 - x0) * d / L, y = y0 + (y1 - y0) * d / L; R.burst(x, y, sea ? 8 : 5, { z: 2, col: sea ? ['#ffffff', '#d8f6ff', '#9fd8ff'] : ['#d8c8a8', '#a89878', '#ffffff'], up: sea ? 80 : 40, speed: w, life: 0.6, g: 160 }); }
      if (nearMe((x0 + x1) / 2, (y0 + y1) / 2, 240)) R.shake(4, 0.3);
      G.sfx.play(sea ? 'splash' : 'boom', vol((x0 + x1) / 2, (y0 + y1) / 2) * (sea ? 1 : 0.5));
      break;
    }
    case 'cine': {
      if (!G.player) break;
      const ce = entOf(ev[2]);
      if (ev[1] === 'boss' && ce) bossIntro(G, ce, ev[3], now);
      else if (ev[1] === 'bossdown') bossDown(G, ev[3], ev[4], ev[5], now);
      else if (ev[1] === 'krakenrise' && ce) { const e = ce; e.upT = now; e.firstRise = 1; R.shake(7, 1.6); G.sfx.play('roar', 1.2); G.sfx.play('splash'); R.burst(e.x, e.y, 80, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 150, speed: 90, life: 1.1, g: 200 }); }
      else if (ev[1] === 'krakendown') { G.inkUntil = 0; G.pull = null; G.grabUntil = 0; R.inks.length = 0; krakenDown(G, ev[3], ev[4], now); }
      break;
    }
    case 'phase': if (e) {
      e.phaseT = now; R.shake(5, 0.6); G.sfx.play('roar', vol(e.x, e.y));
      R.addFx({ kind: 'ring', x: e.x, y: e.y - 10, r: 90, dur: 0.8, col: 'rgba(255,70,40,A)', w: 3 });
      R.addFx({ kind: 'flash', x: e.x, y: e.y - 14, r: 70, dur: 0.5 });
      const def = MOBS[e.type]; if (def && nearMe(e.x, e.y, 420)) G.ui.banner(def.name, ev[2] >= 2 ? 'Phase finale — il est déchaîné !' : 'Phase ' + (ev[2] + 1) + ' — il enrage !');
    } break;
    case 'dash': if (e) { e.dashT = now + ev[3]; e.dashA = ev[2]; e.windT = now; e.windDur = ev[3]; } break;
    case 'leap': if (e) { e.leap = { t0: now, dur: ev[4] }; R.smoke(e.x, e.y, 6, 'rgba(200,180,150,0.5)', { size: 2 }); G.sfx.play('roll', vol(e.x, e.y)); } break;
    case 'howl': if (e) { for (let k = 0; k < 3; k++) R.addFx({ kind: 'ring', x: e.x, y: e.y - 12, r: 40 + k * 30, dur: 0.5 + k * 0.2, col: 'rgba(210,150,255,A)', w: 2 }); G.sfx.play('roar', vol(e.x, e.y) * 0.8); } break;
    case 'shield': if (e) { e.shieldUntil = now + ev[2]; G.sfx.play('forge', vol(e.x, e.y) * 0.6); } break;
    case 'roar': if (e) { R.shake(5, 0.7); G.sfx.play('roar', Math.max(0.3, vol(e.x, e.y))); R.addFx({ kind: 'ring', x: e.x, y: e.y - 20, r: 120, dur: 0.9, col: 'rgba(255,255,255,A)', w: 2 }); } break;
    case 'ink': {
      const [, x, y, r, dur] = ev;
      R.inks.push({ x, y, r, dur, t0: now });
      R.burst(x, y, 40, { z: 4, col: ['#0a0812', '#1a1a2a', '#3a2a5a'], up: 60, speed: r * 0.6, life: 0.9, size: 2 });
      G.sfx.play('splash', vol(x, y));
      if (nearMe(x, y, r)) { G.inkUntil = now + dur; G.ui.toast('L’encre du Kraken vous aveugle et vous ralentit !', 'warn'); }
      break;
    }
    case 'pull': { const [, x, y, r, v, dur] = ev; G.pull = { x, y, r, v, until: now + dur, t0: now }; G.sfx.play('rumble'); if (nearMe(x, y, r)) G.ui.toast('Un tourbillon ! Éloignez-vous de la gueule !', 'warn'); break; }
    case 'grab': if (e) { e.grabId = ev[2]; if (ev[2] === me) { G.grabUntil = now + 4; G.grabBy = ev[1]; G.ui.toast('Une tentacule vous tient ! Tirez-lui dessus !', 'warn'); G.sfx.play('crack'); R.shake(4, 0.4); } } break;
    case 'ungrab': if (e) e.grabId = null; if (ev[2] === me) G.grabUntil = 0; break;
    case 'slam': if (e) { e.slam = { a: ev[2], t0: now, dur: ev[3] }; } break;
    case 'rise': if (e) { e.riseT = now; R.burst(e.x, e.y, 18, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 90, speed: 30, life: 0.7, g: 200 }); G.sfx.play('splash', vol(e.x, e.y) * 0.7); } break;
    case 'sink': if (e) { e.sinkT = now; G.sfx.play('crack'); R.burst(e.x, e.y, 40, { z: 2, col: ['#ffffff', '#d8f6ff', '#6d4626'], up: 90, speed: 50, life: 0.9, g: 200 }); } break;
    case 'dive': if (e) { e.downT = now; R.burst(e.x, e.y, 50, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 110, speed: 70, life: 0.9, g: 200 }); G.sfx.play('splash', vol(e.x, e.y)); } break;
    case 'emerge': if (e) { e.upT = now; e.firstRise = 0; e.x = ev[2]; e.y = ev[3]; e.buf = [[now, ev[2], ev[3], 0, 0]]; R.shake(6, 0.6); G.sfx.play('roar', vol(ev[2], ev[3])); G.sfx.play('splash', vol(ev[2], ev[3])); R.burst(ev[2], ev[3], 70, { z: 2, col: ['#ffffff', '#d8f6ff', '#9fd8ff'], up: 140, speed: 90, life: 1, g: 200 }); } break;
    case 'whirl': if (e) { e.atkT = now; e.atkKind = 3; R.addFx({ kind: 'whirl', follow: () => e, dur: 0.35 }); G.sfx.play('slash', vol(e.x, e.y)); setTimeout(() => G.sfx.play('slash', vol(e.x, e.y) * 0.8), 120); } break;
    case 'roll': if (e && ev[1] !== me) { e.rollT = now; e.rollA = ev[2]; R.smoke(e.x, e.y, 4, 'rgba(220,200,160,0.5)', { size: 2, life: 0.5 }); } break;
    case 'cry':
      if (e) { for (let k = 0; k < 3; k++) setTimeout(() => R.addFx({ kind: 'ring', follow: () => e, r: 70, dur: 0.6, col: 'rgba(255,210,80,A)', w: 2, dy: 6 }), k * 140); G.sfx.play('cry', vol(e.x, e.y)); }
      break;
    case 'xp': if (ev[1] === me) R.text(G.player.x + 8, G.player.y - 14, '+' + ev[2] + ' XP', '#c8a8ff'); break;
    case 'lvl':
      if (e) {
        R.addFx({ kind: 'pillar', follow: () => e, dur: 1.3 });
        R.burst(e.x, e.y, 36, { col: ['#ffd23a', '#fff2a0', '#ffffff'], speed: 40, up: 90, life: 1.1, g: 40 });
        R.text(e.x, e.y - 14, 'NIVEAU ' + ev[2] + ' !', '#ffd23a', true);
        if (ev[1] === me) { G.sfx.play('level'); G.ui.renderTracker(); }
        if (e !== G.player) e.lvl = ev[2];
      }
      break;
    case 'fx': {
      const [, k, x, y, id] = ev;
      if (k === 'spawn' || k === 'summon') { R.smoke(x, y, 8, k === 'summon' ? 'rgba(120,255,140,0.5)' : 'rgba(150,200,140,0.4)', { size: 3 }); if (k === 'summon') G.sfx.play('summon', vol(x, y)); }
      else if (k === 'respawn') R.burst(x, y, 20, { col: ['#ffffff', '#bfe8ff'], up: 60, speed: 30, life: 0.8 });
      else if (k === 'recall') { R.addFx({ kind: 'ring', x, y, r: 40, dur: 3, col: 'rgba(255,170,220,A)', w: 2 }); G.sfx.play('conch', vol(x, y) * 0.7); }
      else if (k === 'smoke') { R.smoke(x, y, 30, 'rgba(40,34,44,0.7)', { size: 4, life: 1.6, spread: 30 }); G.sfx.play('boom', vol(x, y) * 0.3); }
      else if (k === 'buff') { const col = { spd: ['#f2d85a', '#fff2a0'], atk: ['#e85a4a', '#ffb0a0'], def: ['#9aa0b4', '#ffffff'] }[ev[5]] || ['#ffffff']; R.burst(x, y, 18, { z: 8, col, up: 50, speed: 20, life: 0.9, g: -20 }); G.sfx.play('level', vol(x, y) * 0.4); }
      else if (k === 'rum' || k === 'drink' || k === 'eat') { R.burst(x, y, 10, { col: k === 'eat' ? ['#ffe14a', '#fff'] : ['#7aff8a', '#c8ffd0'], up: 40, speed: 15, life: 0.7, g: -10 }); if (id === me) G.sfx.play(k === 'eat' ? 'pickup' : 'drink'); }
      else if (k === 'chest') R.burst(x, y - 6, 24, { col: ['#ffd23a', '#fff2a0', '#ffffff'], up: 70, speed: 35, life: 0.9 });
      else if (k === 'dig') { R.burst(x, y, 30, { col: ['#8a623f', '#a0774d', '#6a4830'], up: 60, speed: 40, life: 0.8, size: 2 }); R.burst(x, y - 4, 30, { col: ['#ffd23a', '#fff2a0'], up: 90, speed: 30, life: 1.1 }); R.addFx({ kind: 'ring', x, y, r: 40, dur: 0.7, col: 'rgba(255,220,100,A)', w: 2 }); G.sfx.play('dig', vol(x, y)); setTimeout(() => G.sfx.play('chest', vol(x, y)), 700); }
      else if (k === 'craft') { R.burst(x, y - 8, 8, { col: ['#ffd23a', '#ffffff'], up: 30, speed: 15, life: 0.5 }); }
      else if (k === 'build') { R.smoke(x, y, 6, 'rgba(200,180,140,0.55)', { size: 2, life: 0.7 }); G.sfx.play('dig', vol(x, y) * 0.5); }
      else if (k === 'forge') { R.burst(x, y, 24, { z: 8, col: ['#ffd23a', '#ff8a2a', '#ffffff'], up: 60, speed: 50, life: 0.6 }); G.sfx.play('forge', vol(x, y)); }
      else if (k === 'seal') { R.burst(x, y, 50, { col: ['#bfe8ff', '#ffffff', '#5a8ae0'], up: 90, speed: 50, life: 1.2 }); for (let q = 0; q < 3; q++) R.addFx({ kind: 'ring', x, y, r: 40 + q * 30, dur: 0.7 + q * 0.3, col: 'rgba(160,220,255,A)', w: 2 }); }
      else if (k === 'rise') { R.burst(x, y, 18, { z: 2, col: ['#6a4830', '#8a623f', '#3a2a1a'], up: 60, speed: 30, life: 0.7, size: 2 }); R.smoke(x, y, 5, 'rgba(90,70,50,0.5)', { size: 3 }); if (nearMe(x, y, 220)) G.sfx.play('groan', vol(x, y) * 0.7); }
      else if (k === 'blink') { R.smoke(x, y - 10, 12, 'rgba(30,20,40,0.7)', { size: 3, life: 0.8 }); R.burst(x, y - 10, 14, { z: 10, col: ['#2a1a3a', '#6a4a8a', '#000000'], up: 40, speed: 50, life: 0.5 }); }
      else if (k === 'bones') { R.burst(x, y - 10, 16, { col: ['#e4dcc0', '#c4bb9c', '#ffffff'], up: 70, speed: 40, life: 0.6 }); }
      else if (k === 'quest') { R.burst(x, y, 30, { col: ['#ffd23a', '#ffffff', '#9fd8ff'], up: 80, speed: 40, life: 1.0 }); R.addFx({ kind: 'ring', x, y, r: 40, dur: 0.6, col: 'rgba(255,220,100,A)', w: 2 }); }
      break;
    }
    case 'pick': { const d = G.ents.get(ev[1]); if (d) { R.burst(d.x, d.y - 4, 8, { col: ['#ffffff', '#ffd23a'], up: 50, speed: 20, life: 0.5 }); G.ents.delete(ev[1]); } break; }
    case 'groan': if (e && nearMe(e.x, e.y, 260) && Math.random() < 0.6) G.sfx.play('groan', vol(e.x, e.y)); break;
    case 'shout': if (e) R.addFx({ kind: 'bubble', text: ev[2], follow: () => e, dur: 2.6, h: 56 }); break;
    case 'dodge': if (e) { R.text(e.x, e.y, 'ESQUIVE', '#9fd8ff'); if (ev[1] === me) G.sfx.play('dodge'); } break;
    case 'emote': {
      if (!e) break;
      const k = ev[2];
      const say = { salut: 'Ohé !', rire: 'Ha ha ha !', colere: 'Grrr !', joie: 'Yo-ho-ho !', doigt: ['Tiens, prends ça !', 'Va donc, eh !', 'Et ça, tu le vois ?'][Math.floor(Math.random() * 3)] }[k];
      if (k === 'danse') { e.danceUntil = now + 4; G.sfx.play('level', vol(e.x, e.y) * 0.25); }
      if (k === 'salut') e.waveUntil = now + 1.8;
      if (k === 'doigt') e.fingerUntil = now + 2;
      if (k === 'salto') { e.flipT = now; G.sfx.play('roll', vol(e.x, e.y)); setTimeout(() => R.smoke(e.x, e.y, 6, 'rgba(220,200,160,0.5)', { size: 2, life: 0.5 }), 600); }
      if (k === 'assis') e.sitUntil = now + 60;
      if (say) R.addFx({ kind: 'bubble', text: say, follow: () => e, dur: 2.2, h: 40 });
      if (k === 'joie') R.burst(e.x, e.y, 14, { z: 20, col: ['#ffd23a', '#ff93b8', '#ffffff'], up: 50, speed: 30, life: 0.8 });
      break;
    }
    case 'fish': if (e) { e.fish = { x: ev[2], y: ev[3], t0: now }; R.burst(ev[2], ev[3], 6, { z: 0, col: ['#bfefff', '#ffffff'], up: 30, speed: 14, life: 0.4 }); if (ev[1] === me) G.sfx.play('splash', 0.6); } break;
    case 'bite': if (e && e.fish) { e.fish.bite = now; R.burst(e.fish.x, e.fish.y, 8, { z: 0, col: ['#bfefff', '#ffffff'], up: 40, speed: 20, life: 0.5 }); } break;
    case 'fishend':
      if (e && e.fish) {
        if (ev[2]) { R.burst(e.fish.x, e.fish.y, 12, { z: 2, col: ['#bfefff', '#ffffff', '#9fd8ff'], up: 70, speed: 30, life: 0.6 }); if (ev[1] === me) G.sfx.play('reel'); }
        e.fish = null;
      }
      break;
    case 'harv': {
      const pr = G.world.props.find((q) => q.id === ev[2]);
      if (e && pr) { e.atkT = now; e.atkA = Math.atan2(pr.y - 6 - (e.y - 9), pr.x - e.x); e.atkKind = 0; }
      if (pr) {
        const wood = ['tree', 'jtree', 'palm', 'deadtree', 'driftwood'].includes(pr.type), stone = pr.type === 'rock';
        R.burst(pr.x, pr.y - 6, 10, { z: stone ? 4 : 12, col: stone ? ['#a3a2b4', '#666579', '#fff6c8'] : wood ? ['#8b5f38', '#a67848', '#55a44f'] : ['#55a44f', '#7fc35e', '#d6323c'], up: 40, speed: 35, life: 0.5 });
        G.sfx.play(stone ? 'hit' : wood ? 'dig' : 'pickup', vol(pr.x, pr.y) * 0.7);
      }
      break;
    }
    case 'ach': if (e) { R.burst(e.x, e.y, 26, { z: 24, col: ['#ffd23a', '#fff2a0', '#ffffff'], up: 70, speed: 35, life: 1 }); R.text(e.x, e.y - 20, 'HAUT FAIT !', '#ffd23a', true); } break;
  }
}

// ------------------------------------------------------------ actions du joueur
function tryAttack(aim, now) {
  const p = G.player;
  if (!p || !G.me || G.me.dead || p.boat) return;
  if ((G.cd.slash || 0) > now) return;
  const spd = (G.eq.weapon && ITEMS[G.eq.weapon].speed) || 0.55;
  G.cd.slash = now + spd; G.cdTotal.slash = spd;
  p.atkT = now; p.atkA = aim; p.atkKind = 0;
  weaponFx(p, G.eq.weapon, aim, 0.18);
  G.sfx.play('slash');
  G.send({ t: 'atk', a: +aim.toFixed(3) });
}
// trace du coup : arc large pour les haches et les faux, estocade pour les lances et rapières
function weaponFx(e, wid, a, dur) {
  const w = (wid && ITEMS[wid]) || {}, f = w.form || {};
  if (f.anim === 'thrust') G.renderer.addFx({ kind: 'thrust', follow: () => e, a, dur: dur * 0.9, r: w.reach || 30 });
  else G.renderer.addFx({ kind: 'slash', follow: () => e, a, dur, r: Math.max(15, Math.min(30, (w.reach || 27) * 0.7)), span: Math.min(1.9, Math.max(0.9, (w.arc || 1.15) * 1.08)), big: (w.reach || 27) > 30 || (w.arc || 1.15) > 1.6 });
}
function useSkill(id) {
  const s = SKILLS[id], me = G.me, p = G.player, now = nowS();
  if (!me || !p || me.dead) return;
  if (id === 'slash') return tryAttack(G.aim, now);
  if (me.lvl < s.lvl) { G.ui.toast(`${s.name} : niveau ${s.lvl} requis.`, 'warn'); G.sfx.play('deny'); return; }
  const boat = p.boat && ITEMS[p.boat] && ITEMS[p.boat].boat;
  if (boat && (id === 'whirl' || id === 'roll')) { G.ui.toast('Impossible à bord.', 'warn'); G.sfx.play('deny'); return; }
  const cannon = id === 'shot' && boat && boat.cannon;
  if (s.needGun && !G.eq.gun && !cannon) { G.ui.toast(boat ? 'À bord, il vous faut un pistolet (ou un sloop et son canon).' : 'Il vous faut une arme à feu (emplacement Pistolet).', 'warn'); G.sfx.play('deny'); return; }
  if ((G.cd[id] || 0) > now) return;
  if (me.en < s.cost) { G.ui.toast("Pas assez d'énergie.", 'warn'); G.sfx.play('deny'); return; }
  const cd = cannon ? 1.8 : s.cd * (id === 'shot' ? (ITEMS[G.eq.gun].cdMul || 1) : 1);
  G.cd[id] = now + cd; G.cdTotal[id] = cd;
  const msg = { t: 'sk', s: id, a: +G.aim.toFixed(3) };
  if (id === 'bomb' && G.mouseWorld) { msg.x = Math.round(G.mouseWorld.x); msg.y = Math.round(G.mouseWorld.y); }
  if (id === 'roll') {
    const ax = G.input.axis();
    const a = (ax.x || ax.y) ? Math.atan2(ax.y, ax.x) : G.aim;
    msg.a = +a.toFixed(3); p.rollT = now; p.rollA = a;
    G.renderer.smoke(p.x, p.y, 5, 'rgba(220,200,160,0.5)', { size: 2, life: 0.5 });
    G.sfx.play('roll');
  }
  if (id === 'shot') { p.atkT = now; p.atkA = G.aim; p.atkKind = cannon ? 3 : 1; const gk = !cannon && ITEMS[G.eq.gun].shot && ITEMS[G.eq.gun].shot.burst; if (gk) for (let b = 1; b < gk; b++) setTimeout(() => G.sfx.play('shot', 0.8), b * ITEMS[G.eq.gun].shot.gap * 1000); if (cannon) { G.sfx.play('boom', 0.6); G.renderer.smoke(p.x + Math.cos(G.aim) * 14, p.y - 4 + Math.sin(G.aim) * 8, 8, 'rgba(220,220,220,0.55)', { size: 3, life: 0.9 }); } else { const sh = ITEMS[G.eq.gun].shot || {}; G.sfx.play(sh.explode || sh.kind === 'cball' ? 'boom' : sh.kind === 'flame' ? 'throw' : ITEMS[G.eq.gun].form && ITEMS[G.eq.gun].form.type === 'rifle' ? 'musket' : 'shot', sh.explode ? 0.4 : 1); } G.renderer.shake(cannon ? 2.5 : 1, cannon ? 0.12 : 0.06); }
  G.send(msg);
  G.ui.flashSkill(id);
  me.en = Math.max(0, me.en - s.cost);
}
function interact() {
  const t = G.interactTarget;
  if (!t || !G.me || G.me.dead) return;
  if (t.kind === 'npc') { // 0.8 : les conversations des objectifs « parler à » se jouent en scène
    const scenes = [];
    for (const qid in G.quests || {}) { const st = G.quests[qid]; if (st.s !== 'active' || !QUESTS[qid]) continue; QUESTS[qid].goals.forEach((g, i) => { if (g.type === 'talk' && g.npc === t.id && g.scene && !st.p[i]) scenes.push(g.scene); }); }
    G.pendingTalk = { npc: t.id, scenes };
    G.send({ t: 'talk', npc: t.id });
  }
  else if (t.kind === 'prop') G.send({ t: 'open', id: t.id });
  else if (t.kind === 'drop') G.send({ t: 'pick', id: t.id });
  else if (t.kind === 'harvest') G.send({ t: 'harvest', id: t.id });
  else if (t.kind === 'struct') G.send({ t: 'sint', tx: t.tx, ty: t.ty });
  else if (t.kind === 'dig') { G.send({ t: 'dig' }); G.renderer.smoke(G.player.x, G.player.y, 6, 'rgba(160,120,80,0.6)', { size: 2 }); }
  else if (t.kind === 'door') useDoor(t.d, false, performance.now() / 1000);
  else if (t.kind === 'homebuy' || t.kind === 'deed') G.send({ t: 'home', a: 'info', k: t.d.plot }); // 1.0 : le titre de propriété (visiter, acheter, gérer, revendre)
  else if (t.kind === 'lockpick') {
    if (!(G.inv || []).some((s) => s && s.id === 'crochets')) { G.ui.toast(`Maison de ${t.h0.name} : fermée à clé. Il faudrait des crochets de serrurier…`, 'info'); return; }
    G.ui.lockpick(t.h0.name, t.h0.lock, (ok) => { if (ok !== null) G.send({ t: 'lock', k: t.d.plot, ok: ok ? 1 : 0 }); });
  }
  else if (t.kind === 'exit') useDoor(t.d, true, performance.now() / 1000);
  else if (t.kind === 'player') G.ui.playerMenu(t.name, null); // 1.0 : inviter, échanger, ajouter en ami…
  else if (t.kind === 'board') G.send({ t: 'board', a: +G.aim.toFixed(3) });
  else if (t.kind === 'land') G.send({ t: 'land', a: +G.aim.toFixed(3) });
}
function useDoor(d, out, now) {
  const p = G.player;
  if (!p || now < G.doorCd) return;
  G.doorCd = now + 1.2;
  G.send({ t: 'mv', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, d: p.dir, m: 0 });
  G.send(out ? { t: 'door', id: d.id, out: 1 } : { t: 'door', id: d.id });
}
const RING8 = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos(k / 8 * Math.PI * 2), Math.sin(k / 8 * Math.PI * 2) * 0.85]);
function nearSail(p) { for (const r of [16, 24, 32, 40]) for (const [c, s] of RING8) if (canSail(G.world, p.x + c * r, p.y + s * r)) return true; return false; }
function nearLand(p) {
  for (const r of [14, 22, 30, 38]) for (const [c, s] of RING8) {
    const x = p.x + c * r, y = p.y + s * r, t = tileAt(G.world, x, y);
    if (t !== T.WATER && t !== T.DEEP && t !== T.SWAMP && canStand(G.world, x, y, false, G.myKey) && roomIdAt(G.world, x, y) < 0) return true;
  }
  return false;
}
const hasBoat = () => (G.inv || []).some((s) => s && ITEMS[s.id] && ITEMS[s.id].boat);
function findInteract() {
  const p = G.player;
  let best = null, bd = 1e9;
  for (const n of G.npcs) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < INTERACT_RANGE && d < bd) { bd = d; best = { kind: 'npc', id: n.id, x: n.x, y: n.y, h: n.parrot ? 34 : 30 }; } }
  for (const c of G.world.chests) { const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < 30 && d < bd) { bd = d; best = { kind: 'prop', id: c.id, x: c.x, y: c.y, h: 18 }; } }
  for (const pr of G.world.props) if (pr.type === 'tonnelet') { const d = Math.hypot(pr.x - p.x, pr.y - p.y); if (d < 30 && d < bd) { bd = d; best = { kind: 'prop', id: pr.id, x: pr.x, y: pr.y, h: 16 }; } }
  for (const e of G.ents.values()) if (e.k === 'd') { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < 24 && d < bd) { bd = d; best = { kind: 'drop', id: e.id, x: e.x, y: e.y, h: 14 }; } }
  if (G.treasure) { const d = Math.hypot(G.treasure.x - p.x, G.treasure.y - p.y); if (d < 24 && d < bd) best = { kind: 'dig', x: G.treasure.x, y: G.treasure.y, h: 10 }; }
  if (!p.boat) for (const d of G.world.doors) {
    if (G.room < 0) {
      if (d.secret && !G.found.has(d.id)) continue;
      const dd = Math.hypot(d.ox - p.x, d.oy - p.y);
      if (dd < 22 && dd < bd) {
        bd = dd; best = { kind: 'door', d, x: d.ox, y: d.oy - 6, h: 22, verb: d.name };
        if (d.plot != null) {
          const h = G.homes.get(d.plot);
          if (!h) best = { kind: 'homebuy', d, x: d.ox, y: d.oy - 6, h: 22, verb: 'À vendre : visiter ou acheter' };
          else if (h.name === p.name) best = { kind: 'deed', d, x: d.ox, y: d.oy - 6, h: 22, verb: 'Chez vous (E : titre de propriété)' };
          else if (performance.now() / 1000 < G.burgleUntil) best.verb = 'Entrer (cambriolage)';
          else best = { kind: 'lockpick', d, h0: h, x: d.ox, y: d.oy - 6, h: 22, verb: (G.inv || []).some((s) => s && s.id === 'crochets') ? `Crocheter la porte de ${h.name}` : `Maison de ${h.name}` };
        } else if (d.seal && !((G.seals || {})[d.seal] > performance.now() / 1000)) best.verb = d.seal === 'freres' ? 'Porte du fort : deux dalles, deux pirates' : 'Porte scellée';
      }
    } else if (d.room === G.room) {
      const dd = Math.hypot(d.ex - p.x, d.ey - p.y);
      if (dd < 26 && dd < bd) { bd = dd; best = { kind: 'exit', d, x: d.ex, y: d.ey - 4, h: 18, verb: 'Sortir' }; }
    }
  }
  if (best) return best;
  const nowT = performance.now() / 1000;
  for (const st of G.structs.values()) {
    const x = st.tx * TILE + 8, y = st.ty * TILE + 14, d = Math.hypot(x - p.x, y - p.y);
    if (d > 30 || d >= bd) continue;
    if (!STRUCTS[st.type]) continue;
    if (STRUCTS[st.type].pet) { if (st.mine) { bd = d; best = { kind: 'struct', tx: st.tx, ty: st.ty, x, y, h: 14, verb: p.pet === STRUCTS[st.type].pet ? 'Laisser à la maison' : 'Emmener avec vous' }; } }
    else if (!st.mine && st.type === 'coffre' && G.room >= 0 && nowT < G.burgleUntil) { bd = d; best = { kind: 'struct', tx: st.tx, ty: st.ty, x, y, h: 20, verb: 'Fouiller le coffre' }; }
    else if (st.type === 'chaise_h' || st.type === 'biblio_h' || (st.mine && st.type === 'boite_musique')) { bd = d; best = { kind: 'struct', tx: st.tx, ty: st.ty, x, y, h: 18, verb: st.type === 'chaise_h' ? 'S’asseoir' : st.type === 'biblio_h' ? 'Lire un livre' : 'Changer la musique' }; }
    else if (st.mine && (st.type === 'coffre' || st.type === 'lit' || st.type === 'jardiniere')) { bd = d; best = { kind: 'struct', tx: st.tx, ty: st.ty, x, y, h: 20, verb: st.type === 'coffre' ? 'Ouvrir' : st.type === 'lit' ? 'Dormir' : ((st.age0 || 0) + nowT - st.seen >= PLANTER_GROW ? 'Récolter' : 'Ça pousse') }; }
  }
  if (best) return best;
  for (const pr of G.harvestable) {
    if (Math.abs(pr.x - p.x) > 30 || Math.abs(pr.y - p.y) > 34) continue;
    const d = Math.hypot(pr.x - p.x, pr.y - 4 - p.y);
    if (d > 28 || d >= bd || (G.depleted.get(pr.id) || 0) > nowT) continue;
    const Q = QUEST_PICK[pr.type];
    if (questNeeds(Q.item) <= 0) continue; // on ne ramasse que ce qu'une quête réclame
    bd = d;
    best = { kind: 'harvest', id: pr.id, x: pr.x, y: pr.y, h: pr.spr ? Math.min(40, pr.spr.h * 0.6) : 14, verb: Q.verb };
  }
  if (!best && !p.boat) for (const e of G.ents.values()) { // 1.0 : un autre pirate, tout près
    if (e.k !== 'p' || e === p || e.dead || (e.flags & 2)) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < 26 && d < bd) { bd = d; best = { kind: 'player', id: e.id, name: e.name, x: e.x, y: e.y, h: 46, verb: 'Interagir' }; }
  }
  if (!best && G.room < 0) {
    if (p.boat) { if (nearLand(p)) best = { kind: 'land', x: p.x, y: p.y, h: 34, verb: 'Accoster' }; }
    else if (hasBoat() && nearSail(p)) best = { kind: 'board', x: p.x, y: p.y, h: 30, verb: 'Mettre à l’eau' };
  }
  return best;
}

// combien d'exemplaires d'un objet les quêtes en cours réclament encore (comme le serveur)
function questNeeds(item) {
  let need = 0;
  for (const [qid, st] of Object.entries(G.quests || {})) if (st && st.s === 'active' && QUESTS[qid]) for (const g of QUESTS[qid].goals) if (g.type === 'collect' && g.item === item) need += g.n;
  let have = 0; for (const s of G.inv || []) if (s && s.id === item) have += s.n;
  return Math.max(0, need - have);
}
// les émotes de la barre (2 à 5)
function emote(k) {
  const now = nowS();
  if (!G.player || G.player.dead || now < (G.emoteAt || 0)) return;
  G.emoteAt = now + 1.2; G.cd['em_' + k] = now + 1.2; G.cdTotal['em_' + k] = 1.2;
  G.send({ t: 'emote', k });
  G.ui.flashSkill('em_' + k);
}
G.emote = emote;
// ------------------------------------------------------------ boucle
let lastT = performance.now();
function loop(ts) {
  const dt = Math.min(0.05, (ts - lastT) / 1000); lastT = ts;
  const now = ts / 1000;
  try { frame(now, dt); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
// ------------------------------------------------------------ constructions
function applyBuild(m, now) {
  const W = G.world;
  for (const [type, tx, ty, owner, age] of m.a || []) {
    const i = ty * W.W + tx;
    const mine = !!G.bases.find((b) => b.mine && b.name === owner) || (G.player && owner === G.player.name);
    G.structs.set(i, { type, tx, ty, owner, mine, age0: age || 0, seen: now });
    W.block[i] = STRUCTS[type].solid || 0;
    if (STRUCTS[type].solid === 2) W.doorOwner.set(i, String(owner).toLowerCase()); else W.doorOwner.delete(i);
  }
  for (const [type, tx, ty] of m.af || []) G.floors.set(ty * W.W + tx, { type, tx, ty });
  for (const [tx, ty, floor] of m.r || []) { const i = ty * W.W + tx; if (floor) G.floors.delete(i); else { G.structs.delete(i); W.block[i] = 0; W.doorOwner.delete(i); } }
  for (const [name, tx, ty, mine] of m.b || []) { G.bases = G.bases.filter((b) => b.name !== name); G.bases.push({ name, tx, ty, mine: !!mine || (G.player && name === G.player.name) }); }
  for (const name of m.rb || []) G.bases = G.bases.filter((b) => b.name !== name);
  if (G.player) for (const st of G.structs.values()) st.mine = st.owner === G.player.name;
}
function startBuild(id) {
  if (!myHomeRoom()) { G.ui.toast(G.homes && [...G.homes.values()].some((h) => G.player && h.name === G.player.name) ? 'Le mobilier s’installe chez vous : entrez dans votre maison.' : 'Le mobilier s’installe dans une maison : achetez-en une (E devant une porte « À vendre »).', 'warn'); return; }
  G.ui.close();
  G.build = { id, item: id ? ITEMS[id] : null, valid: false };
  G.ui.renderBuildBar();
}
function stopBuild() { G.build = null; G.ui.renderBuildBar(); }
function hoveredTile() { const m = G.mouseWorld; return m ? [Math.floor(m.x / TILE), Math.floor(m.y / TILE)] : [0, 0]; }
function updateBuild() {
  const b = G.build, p = G.player, W = G.world;
  if (!b.item) { b.valid = false; return; }
  const [tx, ty] = hoveredTile(), i = ty * W.W + tx, t = W.tiles[i];
  const def = STRUCTS[b.item.place], mine = G.bases.find((x) => x.mine);
  const home = myHomeRoom();
  if (home) { // chez soi : sur le plancher, sans boucher l'entrée
    const r = home, exx = r.x0 + (r.w >> 1);
    b.valid = (def.home || HOME_OK.has(b.item.place)) && tx >= r.x0 && ty >= r.y0 && tx < r.x0 + r.w && ty < r.y0 + r.h && t === T.FLOOR && !(ty === r.y0 + r.h - 1 && Math.abs(tx - exx) <= 1)
      && (def.floor ? !G.floors.has(i) : !G.structs.has(i)) && Math.hypot(tx * TILE + 8 - p.x, ty * TILE + 10 - p.y) < 140;
    return;
  }
  b.valid = false; // 0.8 : plus de bases, le mobilier ne se pose que chez soi
}
// la pièce de ma maison, si j'y suis
function myHomeRoom() {
  if (G.room < 0 || !G.player) return null;
  const pl = G.world.plots.find((q) => q.room === G.room);
  if (!pl) return null;
  const h = G.homes.get(pl.k);
  return h && h.name === G.player.name ? G.world.rooms[G.room] : null;
}
function placeHovered() {
  const b = G.build;
  if (!b || !b.item) return;
  const slot = G.inv.findIndex((s) => s && s.id === b.id);
  if (slot < 0) { G.ui.toast('Vous n’en avez plus.', 'warn'); b.item = null; b.id = null; G.ui.renderBuildBar(); return; }
  const [tx, ty] = hoveredTile();
  G.send({ t: 'place', slot, tx, ty });
}
function unplaceHovered() { const [tx, ty] = hoveredTile(); G.send({ t: 'unplace', tx, ty }); }

// ------------------------------------------------------------ objectif, ambiance, habitants
const ZONE_CENTER = { [Z.SWAMP]: [44, 96], [Z.JUNGLE]: [110, 48], [Z.BEACH]: [104, 116], [Z.RUINS]: [126, 25], [Z.WRECK]: [36, 36], [Z.PLAINS]: [118, 82], [Z.HAVRE]: [262, 80], [Z.RADE]: [408, 84], [Z.QUARANTAINE]: [298, 326], [Z.VOLCAN]: [470, 340], [Z.DAMNES]: [590, 400], [Z.PENDUS]: [540, 52], [Z.SIRENES]: [516, 166], [Z.OSSEMENTS]: [70, 330], [Z.ANSE]: [150, 266],
  [Z.LIBERTALIA]: [800, 282], [Z.BASFONDS]: [842, 314], [Z.HAUTS]: [726, 166], [Z.CANNAIES]: [800, 118], [Z.BAIE]: [880, 146], [Z.MANGROVE]: [716, 300], [Z.ECARLATE]: [884, 296] };
// un objectif à l'intérieur d'un bâtiment : on guide vers sa porte (jamais vers une grotte encore secrète)
function outside(o) {
  if (!o) return null;
  const rid = roomIdAt(G.world, o.x, o.y);
  if (rid < 0 || rid === G.room) return o;
  const d = G.world.doors.find((q) => q.room === rid);
  if (!d || (d.secret && !G.found.has(d.id))) return null;
  return Object.assign({}, o, { x: d.ox, y: d.oy, npc: 0, h: 22 });
}
const DROPPED_BY = { lame_rouillee: 'buccaneer', voile_dechiree: 'zsailor', os_maudit: 'zsailor', dent_zombie: 'buccaneer', algue_noire: 'drowned', poudre_noire: 'skelgun', pince_crabe: 'crab', encre_noire: 'drowned', ecaille_sirene: 'sirene', soie_pendu: 'pendu', plume_corbeau: 'medecin_peste', os_legionnaire: 'legionnaire', coeur_golem: 'golem_lave', braise: 'calcine', herbes: 'medecin_peste', cuir_molosse: 'chien_mort',
  tonnelet_contrebande: 'contrebandier', lanterne_naufrageur: 'naufrageur', couronne_brisee: 'roi_sans_couronne' };
function computeObjective() { return outside(computeObjective0()); }
function computeObjective0() {
  const p = G.player;
  if (!p) return null;
  if (G.treasure) return { x: G.treasure.x, y: G.treasure.y, label: 'Trésor', col: '#ff6a5a' };
  const npcAt = (id) => G.npcs.find((n) => n.id === id) || G.allNpcs.find((n) => n.id === id);
  const tracked = (G.track || []).filter((q) => G.quests && G.quests[q] && G.quests[q].s === 'active');
  const near = (mob) => { let best = null, bd = 1e9; for (const sp of G.world.spawns) if (sp.mob === mob) { const d = Math.hypot(sp.x - p.x, sp.y - p.y); if (d < bd) { bd = d; best = sp; } } if (!best) for (const r of G.world.seaRoutes || []) if (r.ship === mob) for (const [x, y] of r.pts) { const d = Math.hypot(x - p.x, y - p.y); if (d < bd) { bd = d; best = { x, y }; } } return best; };
  for (const qid of [...tracked, ...QUEST_ORDER.filter((q) => !tracked.includes(q))]) { // la flèche suit d'abord les quêtes suivies
    const st = G.quests && G.quests[qid];
    if (!st || st.s !== 'active') continue;
    const q = QUESTS[qid];
    if (G.ui.goalsDone(qid)) { const n = npcAt(q.turnin); return { x: n.x, y: n.y, label: NPCS[q.turnin].name, npc: 1 }; }
    const prog = G.ui.goalProgress(qid);
    for (let i = 0; i < q.goals.length; i++) {
      const g = q.goals[i];
      if (prog[i][0] >= prog[i][1]) continue;
      if (g.type === 'talk') { const n = npcAt(g.npc); return { x: n.x, y: n.y, label: NPCS[g.npc].name, npc: 1 }; }
      if (g.type === 'explore') { const c = ZONE_CENTER[g.zone]; if (!c) continue; return { x: c[0] * TILE, y: c[1] * TILE, label: ZONES[g.zone].name }; }
      if (g.type === 'kill') { const sp = near(g.mob); if (sp) return { x: sp.x, y: sp.y, label: MOBS[g.mob].name, h: 24 }; }
      if (g.type === 'act' && g.act === 'dice_win') { const n = npcAt('croupier'); return { x: n.x, y: n.y, label: NPCS.croupier.name, npc: 1 }; }
      if (g.type === 'collect' && !DROPPED_BY[g.item] && !ITEMS[g.item].quest) { // un objet qui s'achète : chez le marchand le plus proche
        const sellers = Object.keys(NPCS).filter((id) => (NPCS[id].shop || []).includes(g.item)).map(npcAt).filter(Boolean);
        let best = null, bd = 1e9; for (const n of sellers) { const d = Math.hypot(n.x - p.x, n.y - p.y); if (d < bd) { bd = d; best = n; } }
        if (best) return { x: best.x, y: best.y, label: NPCS[best.id] ? NPCS[best.id].name : ITEMS[g.item].name, npc: 1 };
      }
      if (g.type === 'collect') {
        if (g.item === 'tonnelet') { const pr = G.world.props.find((o) => o.type === 'tonnelet'); return { x: pr.x, y: pr.y, label: 'Tonnelet', h: 16 }; }
        if (g.item === 'eclat_cristal') { if (G.room < 0) continue; let best = null, bd = 1e9; for (const pr of G.world.props) if (pr.type === 'cristal' && roomIdAt(G.world, pr.x, pr.y) === G.room) { const d = Math.hypot(pr.x - p.x, pr.y - p.y); if (d < bd) { bd = d; best = pr; } } if (best) return { x: best.x, y: best.y, label: 'Cristal', h: 22 }; continue; }
        const pick = Object.entries(QUEST_PICK).filter(([, v]) => v.item === g.item).map(([k]) => k);
        if (pick.length && G.room < 0) { // un décor à fouiller : le plus proche (pas encore vidé)
          let best = null, bd = 1e9; const tnow = performance.now() / 1000;
          for (const pr of G.harvestable) if (pick.includes(pr.type) && !((G.depleted.get(pr.id) || 0) > tnow)) { const d = Math.hypot(pr.x - p.x, pr.y - p.y); if (d < bd) { bd = d; best = pr; } }
          if (best) return { x: best.x, y: best.y, label: ITEMS[g.item].name, h: 16 };
        }
        const sp = near(DROPPED_BY[g.item] || 'zsailor'); if (sp) return { x: sp.x, y: sp.y, label: ITEMS[g.item].name, h: 24 };
      }
    }
  }
  for (const qid of QUEST_ORDER) if (G.ui.questStateOf(qid) === 'available') { const q = QUESTS[qid], n = npcAt(q.giver); return { x: n.x, y: n.y, label: NPCS[q.giver].name, npc: 1 }; }
  return null;
}
function ambience(now) {
  const p = G.player;
  let theme = G.night ? 'night' : 'day';
  if (G.zone === Z.SWAMP || G.zone === Z.WRECK || G.zone === Z.CAVE || G.zone === Z.PENDUS || G.zone === Z.QUARANTAINE || G.zone === Z.DAMNES || G.zone === Z.VOLCAN || G.zone === Z.OSSEMENTS) theme = 'swamp';
  if (G.zone === Z.INTERIOR) theme = 'day';
  if (G.zone === Z.LIBERTALIA || (G.zone === Z.BASFONDS && !G.night)) theme = 'cite'; // 0.8 : la cité ne dort jamais
  if (G.zone === Z.INTERIOR && G.room >= 0) { const d = G.world.doors.find((q) => q.room === G.room); if (d && zoneAt(G.world, d.ox, d.oy) === Z.LIBERTALIA) theme = 'cite'; }
  if (G.room >= 0) { const pl = G.world.plots.find((q) => q.room === G.room), h = pl && G.homes.get(pl.k); if (h && h.music) theme = h.music; } // la boîte à musique de la maison
  if (p.boat) theme = now < G.seaFight ? 'naval' : 'sea';
  for (const e of G.ents.values()) if (e.k === 'm' && !e.dyingT && MOBS[e.type] && MOBS[e.type].ai && !MOBS[e.type].sea && Math.hypot(e.x - p.x, e.y - p.y) < 280) G.epicUntil = now + 6;
  if (G.night && isFullMoon(G.worldTime)) for (const e of G.ents.values()) if (e.horde && !e.dyingT && Math.hypot(e.x - p.x, e.y - p.y) < 300) { G.epicUntil = now + 8; break; }
  for (const e of G.ents.values()) if (e.k === 'm' && !e.dyingT && MOBS[e.type] && MOBS[e.type].ship && Math.hypot(e.x - p.x, e.y - p.y) < 420) G.seaFight = Math.max(G.seaFight || 0, now + 6);
  if (p.boat && now < G.seaFight) theme = 'naval';
  if (now < (G.eruptUntil || 0) && G.zone === Z.VOLCAN) G.epicUntil = Math.max(G.epicUntil || 0, now + 4); // l'éruption : musique de bataille
  if (G.wevt && G.wevt.wave && G.player && Math.hypot(G.wevt.x - G.player.x, G.wevt.y - G.player.y) < 520) G.epicUntil = Math.max(G.epicUntil || 0, now + 4); // l'invasion : musique de bataille
  if (now < (G.epicUntil || 0)) theme = 'epic';
  if (now < (G.songUntil || 0)) theme = 'cite'; // une chanson à boire
  if (G.kraken && Math.hypot(G.world.kraken.x - p.x, G.world.kraken.y - p.y) < 560) theme = 'naval';
  if (G.cine && G.cine.theme) theme = G.cine.theme;
  G.sfx.setTheme(theme);
  if (G.me && G.me.songs && !G.me.songs.includes(theme) && !(G.songAsked || (G.songAsked = new Set())).has(theme)) { G.songAsked.add(theme); G.send({ t: 'song', k: theme }); } // 1.0 : le carnet d'airs
  const w = weatherAt(G.worldTime);
  G.sfx.rain(G.room >= 0 ? 0 : w.rain);
  const k = Math.floor(G.worldTime / WEATHER_PERIOD);
  if (G.weatherK != null && k !== G.weatherK && w.kind) G.ui.toast(w.kind === 2 ? 'Un orage éclate ! Les espadons mordent par gros temps.' : 'Il commence à pleuvoir.', 'info');
  G.weatherK = k;
}
// 1.0 : les habitants et leur journée (voir townsfolk.js)
function initFolk() { G.town = new Townsfolk(G); }
function updateFolk(dt) { if (G.town) G.town.update(dt, performance.now() / 1000); }
const TITLE_PATH = [[150, 104], [124, 112], [100, 118], [96, 86], [108, 54], [126, 26], [80, 60], [44, 92], [33, 72], [30, 32], [60, 40], [112, 80], [150, 96]];
// 1.0 : le tutoriel — les gestes de base, un par un, puis des conseils qui n'arrivent qu'au bon moment
const TUTO = [
  { t: 'Déplacez-vous', k: 'Z Q S D ou flèches', done: (G) => G.tutFlags.moved > 36 },
  { t: 'Parlez à la Capitaine Morgane, sur les quais', k: 'E près d’elle', done: (G) => !!(G.quests && G.quests.premier_pas) },
  { t: 'Frappez avec votre sabre', k: 'Clic gauche', done: (G) => G.tutFlags.atk },
  { t: 'Esquivez d’une roulade', k: 'Espace', done: (G) => G.tutFlags.roll },
  { t: 'Ouvrez votre sac de marin : survolez un objet pour le comparer', k: 'I', done: (G) => G.tutFlags.inventory },
  { t: 'Ouvrez le journal de bord : choisissez les quêtes à suivre', k: 'J', done: (G) => G.tutFlags.quests },
  { t: 'Tirez avec votre pistolet', k: 'Clic droit', done: (G) => G.tutFlags.shot, skip: (G) => !(G.eq && G.eq.gun) },
];
const TIPS = [
  ['carte', (G) => G.me && G.me.lvl >= 3, 'La carte (M) : les îles inconnues dorment sous la brume. Approchez-les pour la lever.'],
  ['equip', (G) => G.me && G.me.lvl >= 4, 'Équipement : chaque arme a un niveau requis. Isa, à Port-Lanterne, renforce vos armes.'],
  ['bateau', (G) => (G.inv || []).some((s) => s && ITEMS[s.id] && ITEMS[s.id].boat), 'Navigation : clic droit sur votre navire (sac) près de l’eau pour le mettre à l’eau ; E près d’un rivage pour accoster.'],
  ['monture', (G) => (G.inv || []).some((s) => s && ITEMS[s.id] && ITEMS[s.id].slot === 'mount') || (G.eq && G.eq.mount), 'Monture : équipez-la (case Monture du sac), puis C pour monter ou descendre.'],
  ['maison', (G) => G.me && G.me.gold >= 450, 'Propriétés : E devant une porte « À vendre » pour visiter ou acheter. Deux propriétés au plus.'],
  ['codex', (G) => G.me && G.me.kills >= 15, 'Le codex (O) garde la trace de vos découvertes : monstres, boss et leurs trésors, îles, secrets, statistiques.'],
  ['autres', (G) => [...G.ents.values()].some((e) => e.k === 'p'), 'Un autre pirate ! Entrée pour parler, /aide pour les commandes. Hors des zones sûres, méfiance.'],
];
function tutorial(now) {
  if (!G.player || !G.me || G.cine || (G.scene && G.scene.on)) return;
  G.tutFlags = G.tutFlags || { moved: 0 };
  if (G.tutLast) G.tutFlags.moved += Math.hypot(G.player.x - G.tutLast.x, G.player.y - G.tutLast.y);
  G.tutLast = { x: G.player.x, y: G.player.y };
  if (G.ui.open) G.tutFlags[G.ui.open] = 1;
  let text = null;
  if (G.tut < TUTO.length) {
    let s = TUTO[G.tut];
    while (s && (s.done(G) || (s.skip && s.skip(G)))) { G.tut++; G.send({ t: 'tut', s: G.tut }); G.sfx.play('pickup'); s = TUTO[G.tut]; }
    if (s) text = `<b>${s.t}</b><kbd>${s.k}</kbd><small>${G.tut + 1} / ${TUTO.length}</small>`;
    else { G.tut = 99; G.send({ t: 'tut', s: 99 }); G.ui.toast('Vous connaissez les gestes du pirate. Bon vent !', 'quest'); }
  }
  if (!text && G.tut >= TUTO.length) { // un conseil à la fois, une seule fois
    let shown = {}; try { shown = JSON.parse(localStorage.getItem('mm_tips_' + G.player.name) || '{}'); } catch (e) { /* */ }
    if (G.tipUntil && now < G.tipUntil) text = G.tipText;
    else if (!G.tipNext || now > G.tipNext) {
      const tip = TIPS.find(([k, cond]) => !shown[k] && cond(G));
      if (tip) { shown[tip[0]] = 1; try { localStorage.setItem('mm_tips_' + G.player.name, JSON.stringify(shown)); } catch (e) { /* */ } G.tipText = `<b>Conseil</b>${tip[2]}`; G.tipUntil = now + 12; G.tipNext = now + 40; text = G.tipText; }
    }
  }
  G.ui.tuto(text);
}
function frame(now, dt) {
  G.worldTime += dt;
  G.night = isNight(dayFrac(G.worldTime));
  const R = G.renderer, p = G.player;
  if (G.title || !p) {
    const k = (now * 0.018) % (TITLE_PATH.length - 1), i = Math.floor(k), f = k - i;
    const [x0, y0] = TITLE_PATH[i], [x1, y1] = TITLE_PATH[i + 1];
    const s = f * f * (3 - 2 * f);
    G.camTarget = { x: (x0 + (x1 - x0) * s) * TILE, y: (y0 + (y1 - y0) * s) * TILE };
    if (G.snapCam === true && !G.titleInit) { G.titleInit = true; }
    for (const pr of G.input.takePressed()) { /* ignore en accueil */ }
    R.render(G, now, dt);
    return;
  }
  // visée
  const mw = R.toWorld(G.input.mouse.x, G.input.mouse.y);
  G.mouseWorld = mw;
  G.aim = Math.atan2(mw.y - (p.y - 9), mw.x - p.x);
  G.locked = cineLocked(G, now) || !!G.ui.lp || !!G.ui.cf || G.scene.on;
  handleKeys(now);
  G.ui.lockpickTick(dt);
  if (G.locked) { /* on regarde */ }
  else if (G.build) { updateBuild(); if (G.input.mouse.left && !G.buildClickHeld) { G.buildClickHeld = true; placeHovered(); } if (!G.input.mouse.left) G.buildClickHeld = false; }
  else if (G.input.mouse.left && !(G.me && G.me.dead)) tryAttack(G.aim, now);
  updatePlayer(now, dt);
  interpolate(now, dt);
  G.interactTarget = findInteract();
  // zone
  const z = zoneAt(G.world, p.x, p.y);
  if (G.room !== G.lastRoom) {
    const first = G.lastRoom === -99;
    G.lastRoom = G.room; G.snapCam = true;
    const r = G.room >= 0 ? G.world.rooms[G.room] : null;
    if (r) G.ui.banner(r.name, r.kind === 'cave' ? 'Grotte — danger' : r.kind === 'arene' ? 'Arène — danger' : r.kind === 'prison' ? 'Purgez votre peine, ou payez la caution au gardien' : 'Zone sûre');
    else if (first) G.ui.banner(ZONES[z].name, ZONES[z].lvl);
    G.zone = z; G.zoneAt = now; G.ui.setZone(z, r);
    G.sfx.ambience(r ? (r.kind === 'cave' ? 0.15 : 0.05) : z === Z.BEACH || z === Z.TOWN || z === Z.WRECK ? 1 : 0.4);
  } else if (z !== G.zone) {
    if (G.zone === -1 || now - (G.zoneAt || 0) > 1.2) { G.ui.banner(ZONES[z].name, ZONES[z].lvl); }
    if (G.zone >= 0 && SAFE.has(G.zone) !== SAFE.has(z) && G.room < 0 && now - (G.pvpWarnAt || -99) > 20) {
      G.pvpWarnAt = now;
      G.ui.toast(SAFE.has(z) ? 'Zone sûre : personne ne peut vous attaquer ici.' : G.me && G.me.prot ? 'Hors de la zone sûre — mais votre pavillon blanc vous protège encore.' : 'Hors de la zone sûre : les autres pirates peuvent vous attaquer.', SAFE.has(z) ? 'info' : 'warn');
    }
    G.zone = z; G.zoneAt = now; G.ui.setZone(z, null);
    G.sfx.ambience(z === Z.BEACH || z === Z.TOWN || z === Z.WRECK || z === Z.SEA ? 1 : 0.4);
  }
  // le dialogue se ferme si on s'éloigne
  const dn = G.ui.dialogNpc || G.ui.shopNpc;
  if (dn) { const n = G.npcs.find((q) => q.id === dn); if (n && Math.hypot(n.x - p.x, n.y - p.y) > 80) G.ui.close(); }
  // les PNJ regardent le joueur proche
  for (const n of G.npcs) { if (n.fixed) continue; const d = Math.hypot(n.x - p.x, n.y - p.y); n.dir = d < 70 ? dirOf(p.x - n.x, p.y - n.y) : 0; }
  G.renderer.drunk = G.me && G.me.drunk > 0 ? Math.max(0, 1 - (now - G.meAt) / G.me.drunk) * 1 : 0;
  updateFolk(dt);
  if (now - (G.ambAt || 0) > 0.4) { G.ambAt = now; ambience(now); G.objective = computeObjective(); }
  if (G.renderer.spy && (now > (G.spyUntil || 0) || G.room >= 0)) { G.renderer.spy = false; G.renderer.resize(G.renderer.lastW, G.renderer.lastH); document.body.classList.remove('spy'); }
  if (now < (G.eruptUntil || 0) && G.zone === Z.VOLCAN && now > (G.quakeAt || 0)) { // la terre tremble tant que dure l'éruption
    G.quakeAt = now + 0.7 + Math.random() * 0.8; G.renderer.shake(1.6, 0.35);
    if (Math.random() < 0.22) G.sfx.play('rumble', 0.45);
  }
  updatePets(now, dt);
  R.petOut = p.pet || '';
  G.ui.ink(now < G.inkUntil);
  G.camTarget = updateCine(G, now) || G.scene.update() || { x: p.x, y: p.y - 12 };
  R.render(G, now, dt);
  if (!G.tutT || now - G.tutT > 0.25) { G.tutT = now; tutorial(now); }
  G.ui.update(now);
}
function handleKeys(now) {
  const ui = G.ui;
  for (const k of G.input.takePressed()) {
    if (ui.typing()) continue;
    if (ui.cf) { if (k.key === 'e' || k.code === 'Enter') ui.confirmEnd(true); else if (k.code === 'Escape') ui.confirmEnd(false); continue; }
    if (ui.lp) { if (k.key === 'e' || k.code === 'Space' || k.code === 'MouseLeft') ui.lockpickPress(); else if (k.code === 'Escape') ui.lockpickEnd(null); continue; }
    if (cineLocked(G, now)) { if (k.code === 'Escape' && G.cine.skippable) endCine(G); continue; }
    if (G.scene.on) { G.scene.key(k.code); continue; }
    if (!$('dialog').classList.contains('hidden') && /^Digit[1-9]$/.test(k.code)) { ui.pickChoice(+k.code.slice(5) - 1); continue; }
    if (k.code === 'Escape') { if (G.build && !ui.open) stopBuild(); else ui.close(); continue; }
    if (ui.open === 'tavern' && k.code === 'Space') { ui.armTap(); continue; } // le bras de fer
    if (k.key === 'i' || k.code === 'Tab') { ui.toggle('inventory'); continue; }
    if (k.key === 'b') { if (G.build) stopBuild(); else startBuild(null); continue; }
    if (k.key === 'c') { G.send({ t: 'ride' }); continue; }
    if (k.key === 'x' && G.build) { unplaceHovered(); continue; }
    if (k.code === 'MouseRight' && G.build) { unplaceHovered(); continue; }
    if (k.key === 'j' || k.key === 'l') { ui.toggle('quests'); continue; }
    if (k.key === 'm') { ui.toggle('map'); continue; }
    if (k.key === 'h') { ui.toggle('help'); continue; }
    if (k.key === 'k') { ui.toggle('ach'); continue; }
    if (k.key === 'o') { ui.toggle('codex'); continue; }
    if (k.key === 'p') { ui.toggle('crew'); continue; }
    if (k.key === 'r') { if (G.me && !G.me.dead) G.send({ t: 'fish', a: +G.aim.toFixed(3) }); continue; }
    if (k.key === 'e') { interact(); continue; }
    if (k.key === 'f') { G.send({ t: 'eat' }); continue; }
    switch (k.code) {
      case 'Digit1': case 'MouseRight': useSkill('shot'); break;
      case 'Digit2': emote('danse'); break;
      case 'Digit3': emote('salut'); break;
      case 'Digit4': emote('doigt'); break;
      case 'Digit5': emote('salto'); break;
      case 'Space': case 'ShiftLeft': useSkill('roll'); break;
    }
  }
}
function updatePlayer(now, dt) {
  const p = G.player, me = G.me;
  if (!me || me.dead) { p.moving = false; return; }
  const held = now < G.grabUntil;
  const ax = G.ui.typing() || G.locked || held ? { x: 0, y: 0 } : G.input.axis();
  const rolling = now - (p.rollT || -9) < ROLL_TIME;
  let vx, vy, nx, ny;
  const B = p.boat && ITEMS[p.boat] && ITEMS[p.boat].boat;
  if (B) { // navigation : un peu d'inertie
    const k = Math.min(1, dt * 3.2);
    const bs = B.speed * (now < G.inkUntil ? 0.6 : 1);
    p.bvx += (ax.x * bs - p.bvx) * k; p.bvy += (ax.y * bs - p.bvy) * k;
    if (held) { p.bvx = 0; p.bvy = 0; }
    vx = p.bvx; vy = p.bvy;
    if (G.pull && now < G.pull.until && !held) { // le tourbillon du Kraken
      const dx = G.pull.x - p.x, dy = G.pull.y - p.y, d = Math.hypot(dx, dy);
      if (d < G.pull.r && d > 10) { vx += dx / d * G.pull.v; vy += dy / d * G.pull.v; }
    }
    [nx, ny] = moveBoat(G.world, p.x, p.y, vx * dt, vy * dt);
    if (Math.abs(nx - p.x) < 0.01 && Math.abs(ny - p.y) < 0.01) { p.bvx *= 0.4; p.bvy *= 0.4; }
  } else {
    if (rolling) { vx = Math.cos(p.rollA) * ROLL_SPEED; vy = Math.sin(p.rollA) * ROLL_SPEED; }
    else {
      let spd = me.st.speed * (me.cry > 0 && now - G.meAt < me.cry ? 1.2 : 1);
      spd *= SPEED_MUL[tileAt(G.world, p.x, p.y)] || 1;
      vx = ax.x * spd; vy = ax.y * spd;
      if (G.renderer.drunk > 0 && (ax.x || ax.y)) { const w = Math.sin(now * 2.3) * 0.5 * G.renderer.drunk; const c = Math.cos(w), s = Math.sin(w); [vx, vy] = [vx * c - vy * s, vx * s + vy * c]; }
    }
    [nx, ny] = moveWithCollision(G.world, p.x, p.y, vx * dt, vy * dt, false, G.myKey);
  }
  const moved = Math.hypot(nx - p.x, ny - p.y) > 0.01;
  p.x = nx; p.y = ny;
  p.moving = moved;
  if (B) { if (Math.hypot(vx, vy) > 12) p.dir = dirOf(vx, vy); }
  else if (ax.x || ax.y) p.dir = dirOf(ax.x, ax.y);
  if (p.moving) p.walk += dt;
  // portes : on entre en poussant contre la porte, on sort par le seuil
  if (!B && !rolling && now > G.doorCd) {
    if (G.room < 0) { if (ax.y < -0.3) for (const d of G.world.doors) if (Math.abs(p.x - d.ox) < 9 && p.y < d.oy + 3 && p.y > d.oy - 24) { if (d.plot != null && !((G.homes.get(d.plot) || {}).name === p.name || now < G.burgleUntil)) break; if (d.seal && !((G.seals || {})[d.seal] > now)) break; useDoor(d, false, now); break; } }
    else if (ax.y > 0.3 && tileAt(G.world, p.x, p.y) === T.EXIT) { const d = G.world.doors.find((q) => q.room === G.room); if (d) useDoor(d, true, now); }
  }
  if (now - G.lastSend > 0.05 && (moved || p.moving !== G.lastMoving)) {
    G.send({ t: 'mv', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, d: p.dir, m: p.moving ? 1 : 0 });
    G.lastSend = now; G.lastMoving = p.moving;
  }
}
// les animaux de compagnie trottent derrière leur maître
function updatePets(now, dt) {
  const owners = [G.player];
  for (const e of G.ents.values()) if (e.k === 'p' && e.pet) owners.push(e);
  for (const o of owners) {
    if (!o.pet || o.dyingT) { o.petObj = null; continue; }
    let q = o.petObj;
    if (!q || q.kind !== o.pet) q = o.petObj = { kind: o.pet, x: o.x - 10, y: o.y + 2, dir: 2, moving: false, walk: 0, seed: Math.random() * 9 };
    const boat = o === G.player ? !!o.boat : !!(o.flags & 16);
    q.hidden = boat && q.kind !== 'perroquet';
    const tx = o.x + (o.dir === 2 ? -13 : o.dir === 1 ? 13 : (q.seed > 4.5 ? 10 : -10)), ty = o.y + (o.dir === 3 ? 9 : o.dir === 0 ? -7 : 3);
    const dx = tx - q.x, dy = ty - q.y, d = Math.hypot(dx, dy);
    if (d > 160) { q.x = tx; q.y = ty; q.moving = false; }
    else if (d > (q.moving ? 2.5 : 14)) { const sp = Math.min(d * 5, 130) * dt; q.x += dx / d * Math.min(d, sp); q.y += dy / d * Math.min(d, sp); q.moving = true; if (Math.abs(dx) > 1) q.dir = dx < 0 ? 1 : 2; q.walk += dt; }
    else q.moving = false;
  }
}
function interpolate(now, dt) {
  const rt = now - 0.11;
  for (const [id, e] of G.ents) {
    if (e.removeAt && now > e.removeAt) { G.ents.delete(id); continue; }
    if (e.k === 'd') continue;
    const b = e.buf;
    if (!b.length) continue;
    let x, y, dir, flags;
    if (rt <= b[0][0]) [, x, y, dir, flags] = b[0];
    else if (rt >= b[b.length - 1][0]) [, x, y, dir, flags] = b[b.length - 1];
    else {
      let i = 1;
      while (i < b.length && b[i][0] < rt) i++;
      const a = b[i - 1], c = b[i], k = (rt - a[0]) / Math.max(1e-6, c[0] - a[0]);
      x = a[1] + (c[1] - a[1]) * k; y = a[2] + (c[2] - a[2]) * k; dir = c[3]; flags = c[4];
      while (b.length > 2 && b[1][0] < rt - 0.3) b.shift();
    }
    const moved = Math.hypot(x - e.x, y - e.y) > 0.05;
    e.x = x; e.y = y;
    e.dir = dir; e.moving = !!(flags & 1) || moved;
    if (e.moving) e.walk += dt;
  }
}

const hot = window.claude && window.claude.hot;
if (hot && typeof hot.snapshot === 'function') {
  try { hot.snapshot(() => { try { if (G.net && G.net.game) G.net.game.saveAll(); } catch (e) { /* */ } return G.loginInfo ? { name: G.loginInfo.name, look: G.loginInfo.look } : {}; }); } catch (e) { /* */ }
}
if (hot && typeof hot.ready === 'function') hot.ready((d) => boot(d || {})); else boot((hot && hot.data) || {});
