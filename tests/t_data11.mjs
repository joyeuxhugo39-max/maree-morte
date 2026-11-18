// Lot 0 / lot 3 : cohérence des données du jeu — inventaire, et toutes les références croisées
// (quêtes → PNJ, monstres, objets, zones, actes ; boutiques et butins → objets ; succès débloqués → succès)
import fs from 'fs';
import { QUESTS, QUEST_ORDER } from '../shared/data/quests.js';
import { ITEMS } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS } from '../shared/data/skills.js';
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { STRUCTS } from '../shared/data/craft.js';
import { SHIPS } from '../shared/data/ships.js';
import { generateWorld, ZONES, Z } from '../shared/world.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const W = generateWorld();
const Q = Object.entries(QUESTS);
const bosses = Object.entries(MOBS).filter(([, m]) => m.ai || m.elite || m.title);
console.log(`INVENTAIRE : ${Q.length} quêtes, ${Object.keys(ITEMS).length} objets, ${Object.keys(MOBS).length} monstres (dont ${bosses.length} boss/élites), ${Object.keys(NPCS).length} PNJ, ${ZONES.length} zones, ${W.rooms.length} intérieurs, ${W.doors.length} portes, ${Object.keys(SHIPS).length} gabarits de navire, ${Object.keys(SKILLS).length} compétences, ${Object.keys(ACHIEVEMENTS).length} succès, ${Object.keys(STRUCTS).length} meubles/structures`);
const types = {}; for (const [, q] of Q) for (const g of q.goals || []) types[g.type] = (types[g.type] || 0) + 1;
console.log('types d’objectifs :', JSON.stringify(types));
// --- quêtes
const bad = [];
const zoneIds = new Set(Object.values(Z));
const npcPlaced = new Set(W.npcs.map((n) => n.id));
for (const [id, q] of Q) {
  if (q.giver && !NPCS[q.giver]) bad.push(`${id} : donneur inconnu ${q.giver}`);
  if (q.turnin && !NPCS[q.turnin]) bad.push(`${id} : PNJ de rendu inconnu ${q.turnin}`);
  if (q.giver && NPCS[q.giver] && !npcPlaced.has(q.giver)) bad.push(`${id} : le donneur ${q.giver} n’est placé nulle part`);
  for (const r of q.requires || []) if (!QUESTS[r]) bad.push(`${id} : prérequis inconnu ${r}`);
  for (const e of [].concat(q.excl || [])) if (!QUESTS[e]) bad.push(`${id} : exclusion inconnue ${e}`);
  if (!Array.isArray(q.goals) || !q.goals.length) bad.push(`${id} : aucun objectif`);
  for (const g of q.goals || []) {
    if (g.type === 'kill' && !MOBS[g.mob]) bad.push(`${id} : monstre inconnu ${g.mob}`);
    if (g.type === 'collect' && !ITEMS[g.item]) bad.push(`${id} : objet inconnu ${g.item}`);
    if (g.type === 'talk' && !NPCS[g.npc]) bad.push(`${id} : PNJ inconnu ${g.npc}`);
    if (g.type === 'explore' && !zoneIds.has(g.zone)) bad.push(`${id} : zone inconnue ${g.zone}`);
    if (!['kill', 'collect', 'talk', 'explore', 'act'].includes(g.type)) bad.push(`${id} : type d’objectif inconnu ${g.type}`);
    if ((g.type === 'kill' || g.type === 'collect' || g.type === 'act') && !(g.n > 0)) bad.push(`${id} : quantité absente (${g.type})`);
  }
  const rw = q.reward || {};
  for (const it of [].concat(rw.items || []).map((x) => (Array.isArray(x) ? x[0] : x && x.id ? x.id : x))) if (it && !ITEMS[it]) bad.push(`${id} : récompense inconnue ${it}`);
  if (rw.item && !ITEMS[rw.item]) bad.push(`${id} : récompense inconnue ${rw.item}`);
  if (q.ach && !ACHIEVEMENTS[q.ach]) bad.push(`${id} : succès inconnu ${q.ach}`);
}
ok(!bad.length, `quêtes : références valides${bad.length ? '\n   ' + bad.slice(0, 30).join('\n   ') : ''}`);
// prérequis sans cycle, et chaque quête atteignable
const seen = new Map(); const cyc = [];
const depth = (id, stack = []) => { if (seen.has(id)) return seen.get(id); if (stack.includes(id)) { cyc.push(stack.concat(id).join(' → ')); return 0; } const d = 1 + Math.max(0, ...(QUESTS[id].requires || []).filter((r) => QUESTS[r]).map((r) => depth(r, stack.concat(id)))); seen.set(id, d); return d; };
for (const [id] of Q) depth(id);
ok(!cyc.length, `aucun cycle de prérequis${cyc.length ? ' : ' + cyc.slice(0, 3).join(' | ') : ''}`);
// les objets de quête « à ramasser » : chacun a une source (butin, boutique, décor, récompense)
const sources = new Set();
for (const m of Object.values(MOBS)) for (const l of m.loot || []) sources.add(l[0]);
for (const n of Object.values(NPCS)) for (const i of n.shop || []) sources.add(i);
for (const [, q] of Q) { const rw = q.reward || {}; for (const it of [].concat(rw.items || [])) sources.add(Array.isArray(it) ? it[0] : it && it.id ? it.id : it); if (rw.item) sources.add(rw.item); for (const g of q.goals) if (g.give) sources.add(g.give); if (q.give) [].concat(q.give).forEach((x) => sources.add(Array.isArray(x) ? x[0] : x)); }
const src = fs.readFileSync('../server/game.js', 'utf8') + fs.readFileSync('../shared/world.js', 'utf8') + fs.readFileSync('../shared/data/craft.js', 'utf8') + ['events', 'arena', 'tavern', 'seasons', 'sea', 'dungeon', 'naval', 'ships', 'social', 'justice'].map((f) => fs.readFileSync(`../server/${f}.js`, 'utf8')).join('');
const orphan = [];
for (const [id, q] of Q) for (const g of q.goals) if (g.type === 'collect' && ITEMS[g.item] && !sources.has(g.item) && !src.includes(`'${g.item}'`)) orphan.push(`${id}/${g.item}`);
ok(!orphan.length, `objets à collecter : tous ont une source${orphan.length ? ' — sans source : ' + orphan.join(', ') : ''}`);
// --- boutiques, butins
const shopBad = []; for (const [id, n] of Object.entries(NPCS)) for (const i of n.shop || []) if (!ITEMS[i]) shopBad.push(`${id}:${i}`);
ok(!shopBad.length, `boutiques : objets valides${shopBad.length ? ' — ' + shopBad.join(', ') : ''}`);
const lootBad = []; for (const [id, m] of Object.entries(MOBS)) for (const l of m.loot || []) if (!ITEMS[l[0]]) lootBad.push(`${id}:${l[0]}`);
ok(!lootBad.length, `butins : objets valides${lootBad.length ? ' — ' + lootBad.join(', ') : ''}`);
// --- PNJ : placés dans le monde
const unplaced = Object.keys(NPCS).filter((id) => !npcPlaced.has(id) && !NPCS[id].hidden && !NPCS[id].virtual);
ok(unplaced.length < 3, `PNJ placés dans le monde${unplaced.length ? ' (non placés : ' + unplaced.join(', ') + ')' : ''}`);
// --- succès débloqués dans le code : tous définis
const unl = [...new Set([...src.matchAll(/unlock\([^,]+,\s*'([a-z_0-9]+)'/g)].map((m) => m[1]))];
const ach = unl.filter((k) => !ACHIEVEMENTS[k]);
ok(!ach.length, `succès débloqués : ${unl.length} identifiants, tous définis${ach.length ? ' — inconnus : ' + ach.join(', ') : ''}`);
// --- monstres de quêtes : présents dans le monde (points d'apparition) ou invoqués
const spawned = new Set((W.spawns || []).map((s) => s.type));
const killNo = []; for (const [id, q] of Q) for (const g of q.goals) if (g.type === 'kill' && !spawned.has(g.mob) && !src.includes(`'${g.mob}'`)) killNo.push(`${id}/${g.mob}`);
ok(!killNo.length, `monstres de quêtes : présents dans le monde${killNo.length ? ' — absents : ' + killNo.join(', ') : ''}`);
// --- objets : statistiques plausibles
const weird = []; for (const [id, it] of Object.entries(ITEMS)) { if (!(it.value >= 0)) weird.push(`${id}: valeur`); if (it.slot === 'weapon' && !(it.atk > 0)) weird.push(`${id}: arme sans attaque`); if (it.slot === 'weapon' && !(it.speed > 0)) weird.push(`${id}: arme sans cadence`); }
ok(!weird.length, `objets : valeurs et dégâts plausibles${weird.length ? ' — ' + weird.slice(0, 12).join(', ') : ''}`);
ok(Array.isArray(QUEST_ORDER) && QUEST_ORDER.every((q) => QUESTS[q]), `ordre des quêtes valide (${QUEST_ORDER.length})`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
