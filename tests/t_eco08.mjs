// 0.8 : plus d'artisanat ni de matériaux ; tout s'achète ; coffre offert ; vieilles sauvegardes converties
import { Game } from '../server/game.js';
import { zoneAt, roomIdAt, Z } from '../shared/world.js';
import { ITEMS } from '../shared/data/items.js';
import { NPCS } from '../shared/data/npcs.js';
import { MOBS } from '../shared/data/mobs.js';
import { HOME_PRICE } from '../shared/data/craft.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const mkGame = (opts = {}) => {
  const store = new Map(opts.saves || []);
  const storage = { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) };
  if (opts.world) { storage.loadWorld = async () => opts.world; storage.saveWorld = (w) => { opts.saved = w; }; }
  const game = new Game({ storage, log: () => {} });
  return { game, store };
};
const join = async (game, name) => { const c = { msgs: [], send(m) { this.msgs.push(m); }, close() {} }; game.addClient(c); game.onMessage(c, { t: 'login', v: 12, name, pass: 'abcd' }); await new Promise((r) => setTimeout(r, 30)); const p = game.sessions.get(c).player; p.c = c; return p; };
const put = (game, p, x, y) => { p.x = x; p.y = y; p.zone = zoneAt(game.world, x, y); p.room = roomIdAt(game.world, x, y); };
// ---------- 1. données : plus de matériaux, tout ce qui se fabriquait s'achète
ok(!Object.values(ITEMS).some((it) => it.mat || it.tool === 'axe' || it.tool === 'pick'), 'plus aucun matériau ni outil de récolte');
const sold = new Set(Object.values(NPCS).flatMap((n) => n.shop || []));
const formerlyCrafted = ['gourdin', 'lance_silex', 'coutelas', 'hache_guerre', 'sabre_abordage', 'pistolet_silex', 'tromblon', 'mousquet', 'poignard', 'machette', 'harpon', 'masse', 'dague_cristal', 'flamberge', 'pistolet_double', 'escopette', 'carabine', 'crache_feu', 'pistolet_cristal', 'chapeau_feuilles', 'bandana', 'tricorne', 'casque_os', 'mariniere', 'armure_coquillages', 'carapace_crabe', 'manteau_corsaire', 'bottes_pont', 'collier_coquillages', 'talisman_os', 'collier_requin', 'amulette_lanterne', 'pendentif_cristal', 'poisson_grille', 'brochette_crabe', 'ragout_marin', 'galette_coco', 'soupe_champignons', 'tarte_baies', 'grog', 'rhum', 'bandage', 'elixir_flamme', 'barque', 'sloop', 'tenue_mousse', 'tenue_boucanier', 'tenue_corsaire', 'tenue_sables', 'tenue_brumes', 'tenue_sirene', 'tenue_peste', 'armure_conquistador'];
const missing = formerlyCrafted.filter((id) => !sold.has(id));
ok(!missing.length, `tout ce qui se fabriquait s'achète${missing.length ? ' (manque : ' + missing.join(', ') + ')' : ''}`);
ok(Object.values(MOBS).every((m) => (m.loot || []).every(([id]) => ITEMS[id])), 'butins des monstres valides');
// ---------- 2. une vieille sauvegarde (monde non persistant : la base suit le joueur)
const old = { name: 'Vieux', level: 12, xp: 0, gold: 100, hp: 100, x: 0, y: 0,
  inv: [{ id: 'bois', n: 10 }, { id: 'lingot_fer', n: 3 }, { id: 'hache_silex', n: 1 }, { id: 'os_maudit', n: 20 }, { id: 'rhum', n: 2 }, { id: 'pince_crabe', n: 5 }],
  eq: { weapon: 'coutelas', body: 'chemise' }, quests: {},
  base: { tx: 100, ty: 100, storage: [{ id: 'rhum', n: 5 }, { id: 'planche', n: 10 }, null], s: [['pavillon', 100, 100, 0], ['mur_bois', 101, 100, 0], ['coffre', 102, 100, 0]], f: [['sol', 100, 101]] } };
{
  const { game } = mkGame({ saves: [['vieux', old]] });
  const p = await join(game, 'Vieux');
  const expect = 100 + 10 * 2 + 3 * 14 + 10 + 20 * 5 + 5 * 3 /* inventaire */ + 30 + 6 + 35 + 2 /* constructions */ + 10 * 5 /* planches du coffre */;
  ok(p.gold === expect, `matériaux, outils et base revendus : ${p.gold} doublons (attendu ${expect})`);
  ok(game.countItem(p, 'rhum') === 7 && !p.inv.some((s) => s && !ITEMS[s.id]) && game.countItem(p, 'os_maudit') === 0, 'le rhum du coffre de base est rendu, plus rien d’inconnu dans le sac');
  ok(p.c.msgs.some((m) => m.t === 'chat' && /revendus/.test(m.m || '')), 'le pirate est prévenu dans le chat');
  ok(game.bases.size === 0, 'aucune base recréée');
  // les os maudits encore utiles à une quête en cours sont gardés
}
{
  const o2 = JSON.parse(JSON.stringify(old)); o2.quests = { os_lanterne: { s: 'active', p: [0] } }; delete o2.base;
  const { game } = mkGame({ saves: [['vieux', o2]] });
  const p = await join(game, 'Vieux');
  ok(game.countItem(p, 'os_maudit') === 10, `os maudits gardés pour la quête en cours : ${game.countItem(p, 'os_maudit')} (les 10 en trop revendus)`);
}
// ---------- 3. monde persistant : bases remboursées en attendant leur pirate
{
  const world = { v: 1, bases: [{ key: 'absent', name: 'Absent', tx: 90, ty: 90, storage: [{ id: 'sabre_abordage', n: 1 }], s: [['canon_def', 90, 91, 0]], f: [] }], homes: [] };
  const box = { world };
  const { game } = mkGame(box);
  await new Promise((r) => setTimeout(r, 20));
  ok(game.refunds.has('absent') && game.refunds.get('absent').gold === 120, 'base du monde convertie en remboursement (canon : 120)');
  const exp = game.exportWorld();
  ok(exp.bases.length === 0 && exp.refunds.length === 1, 'le remboursement est sauvegardé avec le monde');
  const p = await join(game, 'Absent');
  ok(game.countItem(p, 'sabre_abordage') === 1 && p.gold >= 120 && !game.refunds.has('absent'), 'à son retour, il récupère son sabre et 120 doublons');
}
// ---------- 4. la maison : un coffre offert, indémontable
{
  const { game } = mkGame();
  const A = await join(game, 'Alice');
  const W = game.world, pl = W.plots[0], d = W.doors[pl.door];
  put(game, A, d.ox, d.oy + 4); A.gold = HOME_PRICE + 10; game.homeAction(A, 'buy', 0);
  const h = game.homes.get(0), chest = [...game.structs.values()].find((st) => st.home === 0 && st.type === 'coffre');
  ok(h && chest && chest.data.free && game.homeCap(h) === 48, `coffre offert à l'achat (${h && game.homeCap(h)} places utilisables)`);
  game.onDoor(A, d.id, false);
  put(game, A, chest.x, chest.y + 12);
  game.unplace(A, chest.tx, chest.ty);
  ok([...game.structs.values()].some((st) => st === chest), 'le coffre offert ne se démonte pas');
  game.structInteract(A, chest.tx, chest.ty);
  ok(A.c.msgs.some((m) => m.t === 'stor'), 'il s’ouvre');
  // poser du mobilier dehors : refusé
  put(game, A, W.spawnPoint.x, W.spawnPoint.y); game.addItem(A, 'table_bois', 1);
  const n0 = game.structs.size; game.place(A, A.inv.findIndex((s) => s && s.id === 'table_bois'), (W.spawnPoint.x >> 4) + 2, W.spawnPoint.y >> 4);
  ok(game.structs.size === n0, 'plus de construction hors de la maison');
  // les messages d'artisanat ne font plus rien
  game.onMessage(A.c, { t: 'craft', r: 'planche', n: 1 });
  ok(true, 'message « craft » ignoré sans erreur');
  // renforcement : seulement de l'or
  A.gold = 100000; const g0 = A.gold; const isa = game.npcPos.get('isa'); put(game, A, isa.x, isa.y + 20);
  game.upgrade(A, 'weapon');
  ok(A.upg.weapon === 1 && A.gold === g0 - 70, `renforcement à la forge contre de l’or seulement (${g0 - A.gold} doublons)`);
}
// ---------- 5. objets de quête : ils ne tombent que pour qui en a besoin
{
  const { game } = mkGame();
  const A = await join(game, 'Alice');
  A.level = 30; game.recalc(A);
  const W = game.world, m = game.mobs.find((q) => q.type === 'zsailor' && q.state !== 'dead' && q.room === -1);
  const drops = () => [...game.drops.values()].filter((d) => d.item === 'voile_dechiree').length;
  for (let k = 0; k < 20; k++) { m.state = 'idle'; m.hp = m.maxHp; m.tags.clear(); m.tags.set(A.id, 99); game.killMob(m, A); }
  ok(drops() === 0, 'sans la quête : jamais de voile déchirée');
  A.quests.traversee = { s: 'done', p: [] }; game.acceptQuest(A, 'bois_marine');
  if (!A.quests.bois_marine) A.quests.bois_marine = { s: 'active', p: [0, 0], t: 0 };
  for (let k = 0; k < 20; k++) { m.state = 'idle'; m.hp = m.maxHp; m.tags.clear(); m.tags.set(A.id, 99); game.killMob(m, A); }
  ok(drops() >= 1 && drops() <= 4, `avec la quête : ${drops()} voile(s), jamais plus que les 4 demandées`);
  // le bois flotté donne des planches d'épave, seulement pendant la quête
  const dw = W.props.find((q) => q.type === 'driftwood');
  put(game, A, dw.x, dw.y + 6); A.cds.harvest = 0;
  game.questPick(A, dw.id);
  ok(game.countItem(A, 'planche_epave') === 1, 'planche d’épave ramassée sur le bois flotté');
  A.quests.bois_marine.s = 'done'; game.depleted.clear(); A.cds.harvest = 0;
  game.questPick(A, dw.id);
  ok(game.countItem(A, 'planche_epave') === 1, 'quête finie : plus rien à ramasser');
}
// ---------- 6. les élites reviennent bien plus lentement
{
  const { game } = mkGame();
  const A = await join(game, 'Alice');
  const e = game.mobs.find((q) => q.def.elite && !q.def.sea && !q.def.ship && q.def.respawn < 9999 && q.state !== 'dead');
  e.tags.set(A.id, 1); game.killMob(e, A);
  const wait = e.deadUntil - game.time;
  ok(wait >= 1500, `${e.def.name} reviendra dans ${Math.round(wait / 60)} min (avant : ${Math.round(e.def.respawn / 60)} min)`);
  const c = game.mobs.find((q) => q.type === 'crab' && q.state !== 'dead'); c.tags.set(A.id, 1); game.killMob(c, A);
  ok(c.deadUntil - game.time < 40, 'les monstres ordinaires reviennent comme avant');
}
console.log(fails ? fails + ' ÉCHEC(S)' : 'TOUT EST OK');
process.exit(fails ? 1 : 0);
