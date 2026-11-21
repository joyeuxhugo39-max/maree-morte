// Lot 3 : l'équilibrage, mesuré — armes (dégâts par seconde à leur niveau), progression (une campagne « toutes les
// quêtes dans l'ordre »), objets sans source, revente à perte, butin des boss.
import fs from 'fs';
import { ITEMS, reqLevel } from '../shared/data/items.js';
import { MOBS } from '../shared/data/mobs.js';
import { QUESTS, QUEST_ORDER } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS } from '../shared/data/skills.js';
import { xpToNext, MAX_LEVEL } from '../shared/formulas.js';
import { buyPrice, sellPrice, PLACE_ORDER } from '../shared/data/places.js';
let fails = 0; const ok = (v, m) => { console.log((v ? 'OK  ' : 'FAIL') + ' ' + m); if (!v) fails++; };
const med = (a) => { a = [...a].sort((x, y) => x - y); return a.length ? a[a.length >> 1] : 0; };

// ---------- armes : dégâts par seconde à leur niveau requis (critiques ×1,8 compris), par tranche de niveaux
const W = [];
for (const [id, it] of Object.entries(ITEMS)) {
  if (it.slot !== 'weapon' && it.slot !== 'gun') continue;
  const crit = 1 + 0.8 * (it.crit || 0), s = it.shot || {};
  const dps = it.slot === 'weapon' ? (it.atk || 0) * crit / (it.speed || 0.5) : (it.gun || 0) * (s.n || 1) * (s.burst || 1) * crit / (SKILLS.shot.cd * (it.cdMul || 1));
  W.push({ id, slot: it.slot, L: reqLevel(it), dps, r: it.rarity || 0, role: it.role });
}
const BANDS = [[1, 4], [5, 9], [10, 14], [15, 19], [20, 24], [25, 30]];
const over = [];
for (const slot of ['weapon', 'gun']) for (const [a, b] of BANDS) {
  const B = W.filter((w) => w.slot === slot && w.L >= a && w.L <= b && w.role !== 'dispersion'); if (!B.length) continue;
  const m = med(B.map((w) => w.dps));
  for (const w of W.filter((x) => x.slot === slot && x.L >= a && x.L <= b)) {
    const cap = w.role === 'dispersion' ? 2.8 : w.r >= 2 ? 1.9 : 1.6; // un tromblon à bout portant, une arme rare : plus fort, pas démesuré
    if (w.dps > m * cap) over.push(`${w.id} ${w.dps.toFixed(0)}/s (médiane ${m.toFixed(0)})`);
  }
}
ok(!over.length, `armes : aucune n’écrase les autres de sa tranche de niveaux${over.length ? ' — ' + over.join(', ') : ''}`);

// ---------- progression : faire toutes les quêtes dans l'ordre, sans chercher à monter de niveau autrement
const grunts = Object.values(MOBS).filter((m) => !m.elite && !m.boss && !m.title && !m.sea && !m.ship && m.xp);
const mobXp = (L) => med(grunts.filter((m) => Math.abs(m.level - L) <= 1).map((m) => m.xp)) || 100;
const order = []; const seen = new Set(); const visit = (id) => { if (seen.has(id)) return; seen.add(id); for (const r of QUESTS[id].requires || []) visit(r); order.push(id); };
for (const id of QUEST_ORDER.filter((q) => !QUESTS[q].repeat && (!q.startsWith('a3_fin_') || q === 'a3_fin_apaiser') && (!q.startsWith('br_fin_') || q === 'br_fin_garder') && q !== 'fin_fanfaron').sort((a, b) => (QUESTS[a].level || 1) - (QUESTS[b].level || 1))) visit(id);
const qf = (ahead) => (ahead <= 1 ? 1 : ahead === 2 ? 0.6 : ahead === 3 ? 0.35 : ahead === 4 ? 0.2 : 0.12); // la règle du serveur (turnIn)
let L = 1, xp = 0, kills = 0; const gaps = [];
const gain = (n) => { if (L >= MAX_LEVEL) return; xp += n; while (L < MAX_LEVEL && xp >= xpToNext(L)) { xp -= xpToNext(L); L++; } };
for (const id of order) { const ql = QUESTS[id].level || 1; while (L < ql - 1) { gain(mobXp(L)); kills++; } gaps.push(L - ql); gain(Math.round((QUESTS[id].rewards.xp || 0) * qf(L - ql))); }
const src = fs.readFileSync('../server/game.js', 'utf8');
ok(/ahead <= 1 \? 1 : ahead === 2 \? 0\.6 : ahead === 3 \? 0\.35 : ahead === 4 \? 0\.2 : 0\.12/.test(src), 'la règle mesurée ici est bien celle du serveur');
ok(L === MAX_LEVEL, `en faisant toutes les quêtes, on atteint le niveau ${MAX_LEVEL} (niveau ${L}, ${kills} combats de plus seulement)`);
ok(Math.max(...gaps) <= 4, `on ne fait jamais une quête avec plus de 4 niveaux d’avance (au pire ${Math.max(...gaps)}, en moyenne ${(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1)})`);
ok(gaps.filter((g) => g >= 3).length <= order.length * 0.3, `la plupart des quêtes se font à leur niveau (${gaps.filter((g) => g >= 3).length}/${order.length} avec 3 niveaux d’avance ou plus)`);

// ---------- économie : rien ne se revend plus cher qu'il ne s'achète, à aucune réputation
let loop = null;
for (const id of new Set(Object.values(NPCS).flatMap((n) => n.shop || []))) { const it = ITEMS[id]; if (!it) continue; for (const pl of PLACE_ORDER) for (let rep = 0; rep <= 5; rep++) if (sellPrice(it.value, pl, rep) > buyPrice(it.value, rep)) loop = `${id} à ${pl}, réputation ${rep}`; }
ok(!loop, `aucun achat-revente gagnant${loop ? ' — ' + loop : ''}`);

// ---------- butin des boss : chacun donne quelque chose, et un objet très rare ne l'est pas au point d'être introuvable
const dry = [], tooRare = [];
for (const [id, m] of Object.entries(MOBS)) {
  if (!(m.boss || m.elite || m.title) || m.sea || m.heist === 'fuyard' || m.fest) continue; // lot 5 : Silas en fuite ne se combat pas ; lot 6 : les champions de la Lice (des duels de fête, sans butin)
  if (!(m.loot || []).length && !(m.gold && m.gold[1] > 0)) dry.push(id);
  for (const [item, ch] of m.loot || []) if (ITEMS[item] && !ITEMS[item].quest && ch < 0.02) tooRare.push(`${id}:${item} ${ch}`);
}
ok(!dry.length, `chaque boss rapporte quelque chose${dry.length ? ' — ' + dry.join(', ') : ''}`);
ok(tooRare.length <= 3, `peu d’objets de boss à moins de 2 % (${tooRare.length}${tooRare.length ? ' : ' + tooRare.join(', ') : ''})`);
console.log(fails ? `${fails} ÉCHEC(S)` : 'TOUT EST OK'); process.exit(0);
