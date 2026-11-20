// Lot 4 : les cinématiques. Les scripts contre ce que le jeu sait vraiment dessiner et jouer ; les neuf identités
// musicales ; puis le serveur : qui déclenche, qui voit, la protection des spectateurs, sa levée (fin, geste, durée,
// déconnexion), la scène de groupe et le retardataire, la scène demandée depuis une conversation, la mémoire sauvegardée.
import fs from 'fs';
import { Game } from '../server/game.js';
import { CINEMAS, THEMES, SILAS_PITCH } from '../shared/data/cinemas.js';
import { MEM_KEYS } from '../shared/data/scenes.js';
import { NPCS } from '../shared/data/npcs.js';
import { npcVisible } from '../shared/data/quests.js';
import { roomIdAt } from '../shared/world.js';
import { checkAll, VERBS } from '../client/cinema-check.js';
import { SFX_NAMES } from '../client/audio.js';
import { STYLES, makePiece, VOICE } from '../client/music.js';
import { LOOK_PARTS } from '../client/render/sprites-chars.js';
import { PROTOCOL } from '../shared/constants.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- 1. les scripts : rien d'inventé
const store = new Map();
const game = new Game({ storage: { auth: async (k) => ({ ok: true, data: store.get(k) || null }), save: (k, d) => store.set(k, JSON.parse(JSON.stringify(d))) }, log: () => {} });
const W = game.world;
const res = checkAll(W);
for (const [id, r] of Object.entries(res)) {
  ok(!r.errors.length, `${id} : script valide (verbes, acteurs, costumes, gestes, émotions, conversations, lieu)${r.errors.length ? ' — ' + r.errors.join(' ; ') : ''}`);
  console.log(`     ${id} — assets manquants signalés : ${r.missing.map((m) => `${m.kind} ${m.id} (repli : ${m.fallback})`).join(' · ') || 'aucun'}`);
}
ok(Object.values(CINEMAS).every((c) => (c.needs || []).every((n) => n.kind && n.id && n.lot && n.fallback)), 'chaque asset attendu dit son lot et ce qui le remplace en attendant');
const auSrc = fs.readFileSync('../client/audio.js', 'utf8'), cases = new Set([...auSrc.matchAll(/case '([a-z_]+)':/g)].map((m) => m[1]));
ok(cases.size === SFX_NAMES.size && [...cases].every((c) => SFX_NAMES.has(c)), `la liste des sons connus est exactement celle de Sfx.play (${cases.size})`);
const chSrc = fs.readFileSync('../client/render/sprites-chars.js', 'utf8');
const tops = new Set([...chSrc.matchAll(/style === '([a-z_]+)'/g)].map((m) => m[1])), hats = new Set([...chSrc.matchAll(/hat === '([a-z_]+)'/g)].map((m) => m[1]));
ok([...tops].every((t) => LOOK_PARTS.top.includes(t)) && LOOK_PARTS.top.filter((t) => t !== 'chemise').every((t) => tops.has(t)), 'les hauts connus des cinématiques sont ceux que dessine la feuille');
ok([...hats].every((t) => LOOK_PARTS.hat.includes(t)) && LOOK_PARTS.hat.every((t) => hats.has(t)), 'les chapeaux aussi');
const verbsUsed = new Set(Object.values(CINEMAS).flatMap((c) => c.steps.map((s) => s.do)));
const engine = fs.readFileSync('../client/cinema.js', 'utf8');
ok([...VERBS].every((v) => engine.includes(`case '${v}':`)), `le moteur sait jouer chacun des ${VERBS.size} verbes (${verbsUsed.size} servent déjà)`);

// ---------- 2. les neuf identités musicales : générées par le code, jamais de fichier prétendu
const nine = Object.keys(THEMES);
ok(nine.length === 9 && nine.every((k) => STYLES[k]), `neuf identités, chacune un style du compositeur : ${nine.join(', ')}`);
ok(nine.every((k) => THEMES[k].file === null), 'aucun fichier audio n’est déclaré (il n’en existe pas)');
let bad = 0, sig = 0; const modes = {};
for (const k of nine) for (let s = 1; s <= 6; s++) {
  const P = makePiece(k, s * 104729);
  bad += P.ev.filter((e) => !VOICE[e[1]] || !isFinite(e[0]) || !isFinite(e[2]) || e[3] < 0).length;
  if (k === 'silas' && P.sig) sig++;
  (modes[k] || (modes[k] = new Set())).add(P.mode);
}
ok(!bad, 'chaque morceau généré n’emploie que des voix existantes, des notes et des durées valides');
ok(sig === 6, 'le thème de Silas ouvre toujours sur son leitmotiv');
ok([...modes.fin_complice].every((m) => m === 'major') && [...modes.trahison].every((m) => m === 'minor'), 'les complices en majeur, la trahison en mineur');
{ const S = STYLES.silas.sig, len = S.mel.reduce((a, n) => Math.max(a, n.s + n.d), 0); ok(len <= S.chords.length * S.meter && len >= (S.chords.length - 1) * S.meter, `le leitmotiv tient dans ses ${S.chords.length} mesures`); }

// ---------- 3. le serveur
const login = async (name, level = 12) => {
  const c = { msgs: [], send(m) { this.msgs.push(m); if (this.msgs.length > 600) this.msgs.splice(0, 300); }, close() {} };
  game.addClient(c); game.onMessage(c, { t: 'login', v: PROTOCOL, name, pass: 'abcd' }); await wait(80);
  const p = game.sessions.get(c).player; p.c = c; p.level = level; game.recalc(p); return p;
};
const say = (p, m) => game.onMessage(p.c, m);
const plays = (p, n0, id) => p.c.msgs.slice(n0).filter((m) => m.t === 'cinema' && m.a === 'play' && (!id || m.id === id));
const SB = W.rooms.findIndex((r) => r.name === 'La Sirène Borgne'), door = W.doors.find((d) => d.room === SB);
const outside = (p) => { game.teleport(p, door.ox, door.oy + 6, {}); p.cds.door = 0; };
const enter = (p) => { outside(p); say(p, { t: 'door', id: door.id }); };
ok(!npcVisible(NPCS.silas, {}, 9) && npcVisible(NPCS.silas, {}, 10), 'Silas ne se montre qu’aux pirates de niveau 10 et plus');
ok(W.npcs[W.npcs.length - 1].id === 'silas' && W.rooms[roomIdAt(W, W.npcs.at(-1).x, W.npcs.at(-1).y)].name === 'La Sirène Borgne', 'Silas est assis dans la Sirène Borgne (ajouté en dernier : le monde d’avant ne bouge pas)');

const A = await login('Ambroise', 9);
let n0 = A.c.msgs.length; enter(A);
ok(A.room === SB && !plays(A, n0).length && !A.cine, 'niveau 9 : on entre à la Sirène Borgne, aucune scène');
outside(A); A.level = 10; n0 = A.c.msgs.length; enter(A);
ok(plays(A, n0, 'silas_rencontre').length === 1 && game.inCinema(A) && A.mem.has('vu:silas_rencontre'), 'niveau 10 : en entrant, le serveur lance « Rencontre avec Silas » et s’en souvient');
// la protection : ni coups ni cible
A.invulnUntil = 0; const hp = A.hp; game.damagePlayer(A, 50, null); ok(A.hp === hp, 'spectateur : les coups ne portent pas (sans même l’esquive du réveil)');
const mob = game.mobs.find((m) => m.state !== 'dead' && !m.def.sea) || game.mobs[0];
const oldRoom = mob.room; mob.room = A.room;
ok(!game.mobCanTarget(mob, A) && !game.bossTargets(mob, 1e6).includes(A), 'spectateur : les monstres ne le ciblent pas');
mob.room = oldRoom;
n0 = A.c.msgs.length; outside(A); enter(A); ok(!plays(A, n0).length, 'déjà vue : elle ne se rejoue pas en revenant');
// la fin, dite par le client
say(A, { t: 'cinema', a: 'done', id: 'autre' }); ok(game.inCinema(A), 'un « done » pour une autre scène ne lève rien');
say(A, { t: 'cinema', a: 'done', id: 'silas_rencontre', skip: 1 }); ok(!game.inCinema(A) && !A.cine, 'le client a fini (ou passé la scène) : protection levée');
A.invulnUntil = 0; game.damagePlayer(A, 10, null); ok(A.hp < hp, 'les coups portent de nouveau');
A.hp = A.stats.maxHp;

// un geste de jeu fait tomber la protection ; la durée maximale aussi ; la partie n'attend jamais
game.startCinema([A], 'silas_rencontre', { replay: 1 }); A.cds.slash = 0; say(A, { t: 'atk', a: 0 });
ok(!A.cine, 'frapper pendant une scène : la protection tombe aussitôt');
game.startCinema([A], 'silas_rencontre', { replay: 1 }); say(A, { t: 'mv', x: A.x + 12, y: A.y, seq: 1 });
ok(!A.cine, 'bouger pendant une scène : idem');
game.startCinema([A], 'silas_rencontre', { replay: 1 });
for (let k = 0; k < 20 * (CINEMAS.silas_rencontre.maxDur + 2); k++) game.tick();
ok(!A.cine, `sans réponse du client, la protection s’éteint seule après ${CINEMAS.silas_rencontre.maxDur} s`);

// ---------- 4. la scène demandée depuis une conversation
const B = await login('Bertille', 12);
const silas = game.npcPos.get('silas');
const near = (p) => { game.teleport(p, silas.x - 24, silas.y + 10, {}); };
near(B); n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_preparation' });
ok(!plays(B, n0).length, 'la préparation : refusée tant qu’on n’a pas dit oui à Silas');
say(B, { t: 'mem', k: 'silas_oui' }); ok(B.mem.has('silas_oui') && MEM_KEYS.has('silas_non'), 'les réponses à Silas sont des souvenirs reconnus par le serveur');
outside(B); n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_preparation' }); ok(!plays(B, n0).length, 'loin de Silas : refusée');
near(B); B.lastHurt = game.time; n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_preparation' }); ok(!plays(B, n0).length, 'en plein combat : refusée (« Pas maintenant »)');
B.lastHurt = -99; n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_preparation' }); ok(plays(B, n0, 'silas_preparation').length === 1, 'près de Silas, après avoir dit oui : la préparation se joue');
n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_preparation' }); ok(!plays(B, n0).length, 'pas deux scènes à la fois');
say(B, { t: 'cinema', a: 'done', id: 'silas_preparation' });
n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'silas_rencontre' }); ok(!plays(B, n0).length, 'une scène « d’entrée » ne se demande pas depuis le client');
n0 = B.c.msgs.length; say(B, { t: 'cinema', a: 'ask', id: 'nimporte_quoi' }); ok(!plays(B, n0).length, 'une scène inconnue non plus');

// ---------- 5. une scène de groupe : qui la voit, le retardataire, la déconnexion
CINEMAS.test_groupe = { name: 'Essai de groupe', room: 'La Sirène Borgne', group: true, trigger: { enter: 'La Sirène Borgne' }, maxDur: 20, steps: [{ at: 0, do: 'release' }] };
game.cinemaRoom.set('test_groupe', SB);
const C1 = await login('Corentine', 12), C2 = await login('Clovis', 12), C3 = await login('Capucine', 12), D = await login('Dagobert', 12);
for (const p of [C1, C2, C3, D]) for (const id of Object.keys(CINEMAS)) if (id !== 'test_groupe') p.mem.add('vu:' + id);
say(C1, { t: 'soc', a: 'invite', name: 'Clovis' }); say(C2, { t: 'soc', a: 'accept', name: 'Corentine' });
say(C1, { t: 'soc', a: 'invite', name: 'Capucine' }); say(C3, { t: 'soc', a: 'accept', name: 'Corentine' });
const grouped = C1.group && C1.group === C2.group && C2.group === C3.group;
ok(grouped, 'trois pirates en groupe');
game.teleport(C2, door.ix, door.iy - 20, {}); // Clovis est déjà dans la taverne ; Capucine est dehors
outside(C3); D.x = C2.x + 10; D.y = C2.y; D.room = SB; // Dagobert, hors du groupe, est là aussi
const m1 = C1.c.msgs.length, m2 = C2.c.msgs.length, m3 = C3.c.msgs.length, m4 = D.c.msgs.length;
enter(C1);
ok(plays(C1, m1, 'test_groupe').length && plays(C2, m2, 'test_groupe').length && !plays(C3, m3).length && !plays(D, m4).length, 'le groupe présent dans la pièce la voit ; ni l’absente, ni l’inconnu');
ok(plays(C1, m1, 'test_groupe')[0].n === 2, 'chaque spectateur sait combien ils sont (2)');
enter(C3); ok(!plays(C3, m3).length && !C3.mem.has('vu:test_groupe'), 'la retardataire arrive pendant la scène : elle ne la voit pas (et pourra la voir plus tard)');
let ended = null; const run = game.startCinema([C1, C3], 'silas_rencontre', { replay: 1, onEnd: (r, why) => { ended = why; } });
ok(run && run.ids.length === 1 && run.ids[0] === C3.id, 'on ne regarde pas deux scènes à la fois (Corentine regarde déjà)');
say(C3, { t: 'cinema', a: 'done', id: 'silas_rencontre' }); ok(ended === 'fin', 'tous les spectateurs ont fini : la suite peut se jouer');
let ended2 = null; say(C1, { t: 'cinema', a: 'done', id: 'test_groupe' }); say(C2, { t: 'cinema', a: 'done', id: 'test_groupe' });
const r2 = game.startCinema([C1, C2], 'silas_rencontre', { replay: 1, onEnd: (r, why) => { ended2 = why; } });
say(C1, { t: 'cinema', a: 'done', id: 'silas_rencontre' }); ok(ended2 === null && r2.left.size === 1, 'l’un a fini, l’autre regarde encore : on l’attend');
game.logout(C2); ok(ended2 === 'déconnexion', 'il se déconnecte : on ne l’attend plus');
delete CINEMAS.test_groupe; game.cinemaRoom.delete('test_groupe');

// ---------- 6. la mémoire survit à la sauvegarde
const E = await login('Eulalie', 12);
enter(E); say(E, { t: 'cinema', a: 'done', id: 'silas_rencontre' }); say(E, { t: 'mem', k: 'silas_non' });
game.logout(E); const E2 = await login('Eulalie', 12);
ok(E2.mem.has('vu:silas_rencontre') && E2.mem.has('silas_non') && !E2.cine, 'après reconnexion : scène vue, refus retenu, aucune protection résiduelle');
ok(SILAS_PITCH.some((s) => s.choose), 'la rencontre finit sur une vraie décision');
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK');
process.exit(0);
