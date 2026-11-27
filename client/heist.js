// Lot 5 : Le Plus Grand Braquage, côté client. Le serveur décide de tout ; ici, on montre : les points d'interaction
// du décor (E), le regard des gardes (la lumière de leur lanterne au sol, qui se teinte quand ils s'inquiètent), les
// gardes assommés, l'architecte qui se retourne, la partie de dés de Bréchet, le tiroir et la poche (le crochetage),
// les invités de la réception, les barricades de La Mouche d'Or, la poudre aux yeux, et les choix des scènes.
import { BR, LAFLEUR, BRECHET, FERRANT, TRAHISON, CONCLUSION, FIN_LINES, RECEPTION_LINES as RL } from '../shared/data/braquage.js';
import { planPath } from '../shared/heist-decor.js';
import { darkness, dayFrac } from '../shared/constants.js'; // 2.0 : les invités qui changent de groupe suivent un chemin calculé sur le plan
import { QUESTS } from '../shared/data/quests.js';
import { CINE_LINES, CINE_ENDS, CINE_THEMES } from './cinema.js';
import { registerIcons } from './render/sprites-items.js';

// l'icône des dés pipés : deux dés d'os, l'un montre un six
registerIcons({ dice(pb) {
  const die = (x, y, pips) => { pb.rect(x, y, 7, 7, 0xe8dcc0); pb.rect(x, y + 6, 7, 1, 0xb8a888); pb.rect(x + 6, y, 1, 7, 0xc8b898); for (const [a, b] of pips) pb.set(x + a, y + b, 0x2a1a14); };
  die(1, 6, [[1, 1], [5, 1], [1, 3], [5, 3], [1, 5], [5, 5]]); die(8, 3, [[1, 1], [3, 3], [5, 5]]);
} });

// ------------------------------------------------------------ les conversations et les choix des scènes
CINE_LINES.trahison = TRAHISON;
CINE_LINES.conclusion = CONCLUSION;
CINE_LINES.choix = [['me', 'Il a verrouillé la porte. La fenêtre est ouverte. Que faire, et vite ?']];
for (const k of Object.keys(FIN_LINES)) CINE_LINES[k] = FIN_LINES[k];
Object.assign(CINE_THEMES, { garder: 'fin_garder', denoncer: 'fin_denoncer', complice: 'fin_complice' });
CINE_ENDS.trahison = (G) => ({ timeout: 15, def: 0, list: [
  { label: 'Poursuivre Silas, tout de suite', cls: 'go', go: () => G.send({ t: 'heist', a: 'choix', c: 'poursuivre' }) },
  { label: 'Récupérer la carte avant tout', go: () => G.send({ t: 'heist', a: 'choix', c: 'carte' }) },
  { label: 'Détruire le registre, pour que la vente n’ait jamais lieu', go: () => G.send({ t: 'heist', a: 'choix', c: 'detruire' }) },
] });
CINE_ENDS.fin = (G, c) => ({ list: [
  { label: 'Tout garder : la carte et les noms', cls: 'go', go: () => { c.vars.fin = 'garder'; G.send({ t: 'heist', a: 'fin', c: 'garder' }); } },
  { label: 'Dénoncer Silas : rendre les documents à Valdorne', go: () => { c.vars.fin = 'denoncer'; G.send({ t: 'heist', a: 'fin', c: 'denoncer' }); } },
  ...(c.opts && c.opts.c ? [{ label: 'Lui proposer un marché : faire équipe', go: () => { c.vars.fin = 'complice'; G.send({ t: 'heist', a: 'fin', c: 'complice' }); } }] : []),
] });

const GUARDS = new Set(['douanier', 'garde_valdorne']);
const FACE = [Math.PI / 2, Math.PI, 0, -Math.PI / 2];

export class Heist {
  constructor(G) {
    this.G = G; this.H = G.world.heist;
    this.bars = [0, 0]; this.away = 0; this.locked = 0; this.sus = new Map(); this.match = null;
    this.crowd = []; this.brawl = 0; this.alarm = 0;
    const R = this.H.reception;
    this.groups = R ? R.groups.map((g) => ({ ...g, slots: g.slots.map((sl) => ({ ...sl })), next: 2 + Math.random() * 6 })) : [];
    for (const [k, c] of this.H.crowd.entries()) {
      const f = { k: 'f', id: -7000 - k, x: c.x, y: c.y, dir: c.dir, dir0: c.dir, moving: false, walk: 0, look: c.look, lookKey: JSON.stringify(c.look), weapon: null, crowd: k, role: c.role, hidden: false,
        grp: c.grp ?? null, slot: c.slot ?? null, home: { x: c.x, y: c.y, dir: c.dir }, round: c.round ?? null, leg: 0, route: null, wait: 1 + Math.random() * 4, say: 6 + Math.random() * 20, mode: 'idle' };
      if (c.sit) f.sitUntil = Infinity;
      if (f.round != null) { f.mode = 'serve'; f.wait = 2 + k * 3; }
      G.folk.push(f); this.crowd.push(f);
    }
    this.nextMove = 25; this.lastBubble = 0; this.greeted = 0;
    // 2.0 : les gens du quartier de la demeure (dehors) — les gardes du portail et du perron, le jardinier, les invités du soir
    const Q = this.H.quartier; this.qfolk = []; this.qguests = [];
    if (Q) {
      Q.figures.forEach((c, k) => { const f = { k: 'f', id: -7600 - k, crowd: 'q' + k, x: c.x, y: c.y, dir: c.dir, moving: false, walk: 0, look: c.look, lookKey: JSON.stringify(c.look), weapon: null, role: c.role, hidden: false, home: { x: c.x, y: c.y, dir: c.dir }, path: c.path || null, pi: 0, wait: 3 + k, say: 2 + k * 1.5 }; G.folk.push(f); this.qfolk.push(f); });
      Q.guests.forEach((look, k) => { const f = { k: 'f', id: -7650 - k, crowd: 'g' + k, x: Q.arrive[0].x, y: Q.arrive[0].y, dir: 3, moving: false, walk: 0, look, lookKey: JSON.stringify(look), weapon: null, role: 'invite_soir', hidden: true, going: false, pi: 1, wait: 4 + k * 14 }; G.folk.push(f); this.qguests.push(f); });
    }
  }
  q(id) { return this.G.ui.questStateOf(id); }
  goal(qid, act) { const st = this.G.quests && this.G.quests[qid]; if (!st) return false; if (st.s === 'done') return true; const i = QUESTS[qid].goals.findIndex((g) => g.act === act); return i >= 0 && st.p && (st.p[i] || 0) >= 1; }
  // ------------------------------------------------------------ les points d'interaction
  visible(s) {
    const act = (qid) => { const x = this.q(qid); return x === 'active' || x === 'ready'; };
    switch (s.k) {
      case 'uniformes': return act('br_preparatifs') && !this.goal('br_preparatifs', 'br_uniformes');
      case 'bureau': return act('br_preparatifs') && !this.goal('br_preparatifs', 'br_plan');
      case 'manteau': return !!this.away && act('br_preparatifs') && !this.goal('br_preparatifs', 'br_cle');
      case 'vestiaire': return act('br_casse');
      case 'coffre': return act('br_casse') && this.goal('br_casse', 'br_archives');
      case 'fenetre': return act('br_poursuite');
      case 'passerelle': return act('br_poursuite') || act('br_silas');
      case 'canon': return !!this.bars[s.bar];
      default: return true;
    }
  }
  spotNear(p) {
    let best = null, bd = 1e9;
    for (const s of this.H.spots) {
      if ((s.room >= 0 ? s.room !== this.G.room : this.G.room !== -1) || Math.abs(s.x - p.x) > 60 || Math.abs(s.y - p.y) > 60) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d > (s.r || 22) || d >= bd || !this.visible(s)) continue;
      bd = d; best = s;
    }
    return best ? { s: best, d: bd } : null;
  }
  use(i) { this.G.send({ t: 'heist', a: 'spot', i }); }
  // ------------------------------------------------------------ messages du serveur
  onMsg(m) {
    const G = this.G, ui = G.ui;
    if (m.a === 'state') {
      this.bars = m.bars || [0, 0]; this.away = m.away; this.locked = m.locked; if (m.fav != null) this.favor = m.fav; G.npcAway = m.away ? 'brechet' : null; G.refreshNpcs && G.refreshNpcs();
      if ((m.brawl || 0) !== this.brawl) { this.brawl = m.brawl || 0; this.onBrawl(!!this.brawl); }
      if ((m.alarm || 0) !== this.alarm) { this.alarm = m.alarm || 0; this.onAlarm(!!this.alarm); }
      return;
    }
    if (m.a === 'desk') { // le tiroir : un crochetage, pendant qu'il a le dos tourné
      if (!m.ok) { ui.toast('Il vous faudrait des crochets de serrurier (La Fouine en vend).', 'warn'); return; }
      G.send({ t: 'heist', a: 'desk', s: 'start' });
      ui.lockpick('Corvin Lafleur', 1, (ok) => { if (ok !== null) G.send({ t: 'heist', a: 'desk', s: 'end', ok: ok ? 1 : 0 }); }, 'Le tiroir du bureau — quand il ne regarde pas');
      return;
    }
    if (m.a === 'dice') return this.diceShow(m);
  }
  // ------------------------------------------------------------ la partie de dés de Bréchet
  diceShow(m) {
    const G = this.G, ui = G.ui, F = '⚀⚁⚂⚃⚄⚅';
    if (m.end === 'caught') { ui.say(m.msg, [{ label: 'Hum. Au revoir.', go: () => ui.close() }]); return; }
    let text = m.msg || '';
    if (m.a2) text = `Vous : ${F[m.a2[0] - 1]} ${F[m.a2[1] - 1]} (${m.a2[0] + m.a2[1]}) — Bréchet : ${F[m.b2[0] - 1]} ${F[m.b2[1] - 1]} (${m.b2[0] + m.b2[1]}). Manches : ${m.me} à ${m.him}.`;
    if (m.end === 'won') { ui.say(text + ' ' + BRECHET.broke, [{ label: 'Merci pour la partie.', go: () => ui.close() }]); G.sfx.play('coin'); return; }
    if (m.end === 'lost') { ui.say(text + ' Bréchet empoche la mise. « Une autre ? »', [{ label: 'Une autre partie (40 doublons)', cls: 'q', go: () => G.send({ t: 'heist', a: 'brechet', c: 'play' }) }, { label: 'Non merci.', go: () => ui.close() }]); G.sfx.play('deny'); return; }
    const ch = [{ label: '🎲 Lancer les dés', cls: 'q', go: () => { G.sfx.play('dice'); G.send({ t: 'heist', a: 'brechet', c: 'roll' }); } }];
    if ((G.inv || []).some((s) => s && s.id === 'des_pipes')) ch.push({ label: '🎲 Lancer vos dés pipés (s’il ne regarde pas trop)', go: () => { G.sfx.play('dice'); G.send({ t: 'heist', a: 'brechet', c: 'cheat' }); } });
    ch.push({ label: '🤏 Lui faire les poches, pendant qu’il compte', go: () => this.pocket() });
    ui.say(text, ch);
  }
  pocket() {
    const G = this.G;
    G.send({ t: 'heist', a: 'brechet', c: 'pocket' });
    G.ui.lockpick('Anatole Bréchet', 2, (ok) => { if (ok !== null) G.send({ t: 'heist', a: 'brechet', c: 'pocket_end', ok: ok ? 1 : 0 }); }, 'La poche de Bréchet — une main légère');
  }
  // ------------------------------------------------------------ les conversations des personnages du braquage
  dialog(npcId, ch, ui) {
    const G = this.G, s = (q) => this.q(q), mem = G.mem || new Set(), say = (t, more = []) => ui.say(t, [...more, { label: 'Bien.', go: () => ui.dialogMain(npcId) }]);
    const prep = s('br_preparatifs') === 'active';
    if (npcId === 'silas') {
      if (s('br_preparatifs') === 'available' && mem.has('silas_oui')) ch.unshift({ label: '« Je suis toujours partant. »', cls: 'q', go: () => { G.send({ t: 'mem', k: 'silas_oui' }); ui.close(); } });
      if (prep) ch.unshift({ label: '« Où en sont les préparatifs ? »', go: () => say(QUESTS.br_preparatifs.progress) });
      if (s('br_casse') === 'active') ch.unshift({ label: '« Et maintenant ? »', go: () => say('Ce soir, chez Valdorne. Sur les hauts du quartier des Corsaires. Je t’y attends, parmi les invités.') });
      if (mem.has('br_route')) {
        ch.unshift({ label: `📦 Acheter des caisses de contrebande (${BR.crateBuy} doublons pièce, ${BR.crates} par jour)`, cls: 'q', go: () => { G.send({ t: 'heist', a: 'caisses', n: BR.crates }); ui.close(); } });
      }
    }
    if (npcId === 'lafleur' && prep && !this.goal('br_preparatifs', 'br_plan')) {
      ch.unshift({ label: '« Ce plan de la demeure Valdorne… combien ? »', cls: 'q', go: () => ui.say(LAFLEUR.ask, [
        { label: `💰 Le soudoyer (${BR.bribe}, ou ${BR.bribeCaught} si vous l’avez déjà volé)`, cls: 'q', go: () => { G.send({ t: 'heist', a: 'lafleur', c: 'bribe' }); ui.close(); } },
        { label: '🤝 « Je peux vous rendre un service. »', go: () => { G.send({ t: 'heist', a: 'lafleur', c: 'favor' }); ui.close(); } },
        { label: '« Laissez tomber. »', go: () => ui.dialogMain(npcId) },
      ]) });
      if (this.favor) ch.unshift({ label: '« Votre cave est propre. »', go: () => { G.send({ t: 'heist', a: 'lafleur', c: 'favor_done' }); ui.close(); } });
    }
    if (npcId === 'brechet' && prep && !this.goal('br_preparatifs', 'br_cle')) {
      ch.unshift({ label: `🎲 « Une partie de dés ? » (${BR.stake} doublons)`, cls: 'q', go: () => G.send({ t: 'heist', a: 'brechet', c: 'play' }) });
      ch.unshift({ label: '« Valdorne vous paie en clous, paraît-il ? »', go: () => { G.send({ t: 'heist', a: 'brechet', c: 'provoke' }); ui.close(); } });
    }
    if (npcId === 'ferrant' && s('br_casse') === 'active' && !this.goal('br_casse', 'br_archives')) ch.unshift({ label: `« ${FERRANT.hint} »`, cls: 'q', go: () => { G.send({ t: 'heist', a: 'ferrant' }); ui.close(); } });
    if (npcId === 'corail' && (G.inv || []).some((x) => x && x.id === 'caisse_contrebande')) ch.unshift({ label: `📦 Livrer vos caisses (${BR.crateSell} doublons pièce)`, cls: 'q', go: () => { G.send({ t: 'heist', a: 'livrer' }); ui.close(); } });
  }
  // ------------------------------------------------------------ les événements
  onEvent(ev, now) {
    const G = this.G, R = G.renderer, ent = (id) => G.ents.get(id);
    switch (ev[0]) {
      case 'sus': { const e = ent(ev[1]); this.sus.set(ev[1], ev[2]); if (e && ev[2]) { R.addFx({ kind: 'emo', e: ev[2] >= 2 ? '!' : '?', follow: () => e, dur: ev[2] >= 2 ? 1.4 : 1.0, h: 36 }); if (ev[2] >= 2) G.sfx.play('warn', 0.6); } return true; }
      case 'ko': { const e = ent(ev[1]); if (e) { e.sitUntil = ev[2] ? Infinity : 0; e.ko = !!ev[2]; if (ev[2]) { R.addFx({ kind: 'emo', e: '…', follow: () => e, dur: 2.4, h: 30 }); G.sfx.play('hit', 0.6); } } return true; }
      case 'npcdir': { const n = G.allNpcs.find((q) => q.id === ev[1]); if (n) { n.fixed = true; n.dir = ev[2]; clearTimeout(n.lookT); n.lookT = setTimeout(() => { n.fixed = false; }, ev[3] * 1000); } return true; }
      case 'npcsay': { const n = G.npcs.find((q) => q.id === ev[1]) || G.allNpcs.find((q) => q.id === ev[1]); if (n) R.addFx({ kind: 'bubble', text: ev[2], follow: () => n, dur: 3.6, h: 34 }); return true; }
      case 'powder': { const [, x, y, r, dur] = ev; R.burst(x, y, 40, { z: 8, col: ['#f2ead8', '#d8ccb4', '#ffffff'], up: 40, speed: r * 0.5, life: 1.1, size: 2, g: -10 }); G.sfx.play('throw', 0.7); const p = G.player; if (p && Math.hypot(p.x - x, p.y - y) < r) { G.powderUntil = now + dur; G.ui.toast('De la poudre aux yeux ! Vous n’y voyez plus rien…', 'warn'); } return true; }
      case 'hfx': {
        const [, k, x, y] = ev;
        if (k === 'boom' || k === 'canon') { R.addFx({ kind: 'boom', x, y, r: k === 'canon' ? 30 : 44, dur: 0.7 }); R.shake(k === 'canon' ? 4 : 3, 0.35); G.sfx.play('boom', 0.8); R.burst(x, y, 24, { z: 6, col: ['#ffd060', '#ff7a1a', '#3a2a2a'], up: 70, speed: 50, life: 0.8 }); }
        if (k === 'feu') { R.addFx({ kind: 'flash', x, y: y - 6, r: 26, dur: 0.6 }); R.smoke(x, y - 4, 12, 'rgba(60,50,50,0.6)', { size: 3, life: 1.6 }); G.sfx.play('crack', 0.6); }
        return true;
      }
    }
    return false;
  }
  // ------------------------------------------------------------ chaque image : la réception (2.0)
  // Les invités parlent en groupe (chacun son sujet), se tournent vers celui qui parle, changent parfois de groupe par un
  // chemin calculé sur le plan ; les domestiques font leur tournée ; les musiciens jouent ; le majordome accueille, le
  // portier surveille la porte ; tous réagissent au pirate, à la bagarre du salon de jeu et à l'alarme.
  bubble(f, text, dur = 2.8, force = false) {
    const now = this.G.now || 0;
    if (!force && now - this.lastBubble < 1.1) return false;
    this.lastBubble = now; this.G.renderer.addFx({ kind: 'bubble', text, follow: () => f, dur, h: 34 }); return true;
  }
  face(f, x, y) { const dx = x - f.x, dy = y - f.y; f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0); }
  pick(list, f) { return list[Math.floor(Math.random() * list.length)]; }
  // un chemin du point (x, y) au point (tx, ty) dans la demeure, en évitant les places occupées (sauf la sienne et l'arrivée)
  route(f, tx, ty) {
    const G = this.G, W = G.world, r = W.rooms[this.H.rooms.demeure], rel = (x, y) => [x / 16 - r.x0, (y - 4) / 16 - r.y0];
    const bloque = new Set();
    for (const g of this.groups) for (const sl of g.slots) if (sl.who >= 0 && sl.who !== f.crowd) bloque.add(Math.floor((sl.y - 4) / 16) * W.W + Math.floor(sl.x / 16));
    bloque.delete(Math.floor((ty - 4) / 16) * W.W + Math.floor(tx / 16)); bloque.delete(Math.floor((f.y - 4) / 16) * W.W + Math.floor(f.x / 16));
    const pts = planPath(W.solid, W.W, r, rel(f.x, f.y), rel(tx, ty), bloque, false) || planPath(W.solid, W.W, r, rel(f.x, f.y), rel(tx, ty), null, false);
    return pts ? pts.slice(1).concat([{ x: tx, y: ty }]) : null;
  }
  walkTo(f, tx, ty, dir, mode = 'walk') { const p = this.route(f, tx, ty); if (!p) return false; f.route = p; f.ri = 0; f.endDir = dir; f.mode = mode; f.sitUntil = 0; return true; }
  stepRoute(f, dt, sp) {
    const t = f.route[f.ri], dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
    if (d < 1.5) { f.ri++; if (f.ri >= f.route.length) { f.route = null; f.moving = false; if (f.endDir != null) f.dir = f.endDir; return true; } return false; }
    const k = Math.min(sp * dt, d); f.x += dx / d * k; f.y += dy / d * k; f.moving = true; f.walk = (f.walk || 0) + dt;
    f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    return false;
  }
  slotOf(f) { const g = this.groups[f.grp]; return g ? g.slots[f.slot] : null; }
  onBrawl(on) { // la bagarre du salon de jeu : on se retourne, on commente, les curieux vont voir ; la musique s'arrête
    const B = this.H.reception && this.H.reception.brawl; if (!B) return;
    for (const f of this.crowd) {
      if (on) {
        const W = this.H.reception.watch, wi = this.crowd.filter((q) => q.mode === 'watch' || q.mode === 'watching').length;
        if (f.role === 'invite' && f.mode === 'idle' && !f.sitUntil && W && wi < W.length && Math.hypot(f.x - B.x, f.y - B.y) < 260) { const w = W[wi]; if (this.walkTo(f, w.x, w.y, 0, 'watch')) { const sl = this.slotOf(f); if (sl) sl.who = -1; f.watchSlot = sl; } } // les curieux vont voir, à la porte du salon de jeu
        else if (f.role !== 'domestique' && f.role !== 'cuisinier') this.face(f, B.x, B.y);
      } else if (f.mode === 'watch' || f.mode === 'watching') { if (f.watchSlot) f.watchSlot.who = f.crowd; f.watchSlot = null; this.goHome(f); }
    }
    if (on) { const f = this.crowd.find((q) => q.role === 'invite' && Math.hypot(q.x - B.x, q.y - B.y) < 200); if (f) this.bubble(f, this.pick(RL.bagarre), 2.6, true); }
  }
  onAlarm(on) { // l'alarme : les invités se réfugient contre les murs du salon, loin de la galerie ; puis, le calme revenu, chacun regagne sa place
    const R = this.H.reception; if (!R) return;
    let n = 0;
    for (const f of this.crowd) {
      if (f.role !== 'invite' && f.role !== 'musicien') continue;
      if (on && f.sitUntil) { this.G.renderer.addFx({ kind: 'emo', e: '!', follow: () => f, dur: 1.6, h: 30 }); continue; } // les invités assis se figent dans leur fauteuil
      if (on) { const rf = R.refuge[(f.crowd + n++) % R.refuge.length]; this.walkTo(f, rf.x + ((f.crowd % 3) - 1) * 12, rf.y + ((f.crowd >> 1) % 2) * 8, 0, 'flee'); }
      else if (f.mode === 'flee' || f.mode === 'cower') this.goHome(f);
    }
    const f = this.crowd.find((q) => q.role === 'invite' && Math.hypot(q.x - this.G.player.x, q.y - this.G.player.y) < 260) || this.crowd[3];
    if (f) this.bubble(f, this.pick(on ? RL.alarme : RL.calme), 2.6, true);
  }
  goHome(f) { const sl = this.slotOf(f), h = sl || f.home; if (!this.walkTo(f, h.x, h.y, sl ? sl.dir : f.home.dir, 'home')) { f.x = h.x; f.y = h.y; f.mode = f.round != null ? 'serve' : 'idle'; const g = this.groups[f.grp]; if (g && g.sit) f.sitUntil = Infinity; } }
  // un invité change de groupe (ou va au buffet) : il libère sa place, en prend une libre ailleurs, et y va
  wander() {
    const movers = this.crowd.filter((f) => f.role === 'invite' && f.mode === 'idle' && !f.sitUntil && f.grp != null && !this.groups[f.grp].sit);
    if (!movers.length) return;
    const f = movers[Math.floor(Math.random() * movers.length)], from = this.groups[f.grp];
    const dests = []; for (const g of this.groups) if (g !== from && !g.sit && g.k !== 'jeu') g.slots.forEach((sl, i) => { if (sl.who < 0) dests.push([g, i]); });
    if (!dests.length) return;
    const [g, i] = dests[Math.floor(Math.random() * dests.length)], sl = g.slots[i];
    const old = from.slots[f.slot];
    old.who = -1; sl.who = f.crowd;
    if (!this.walkTo(f, sl.x, sl.y, sl.dir, 'home')) { sl.who = -1; old.who = f.crowd; return; }
    f.grp = g.id; f.slot = i;
  }
  // 2.0 : le quartier de la demeure — joué seulement quand le pirate est dans les parages
  updateQuartier(dt, now) {
    const G = this.G, Q = this.H.quartier, me = G.player;
    if (!Q || !me) return;
    const near = me.x > (Q.box.x0 - 14) * 16 && me.x < (Q.box.x1 + 14) * 16 && me.y > (Q.box.y0 - 10) * 16 && me.y < (Q.box.y1 + 14) * 16;
    const dark = darkness(dayFrac(G.worldTime || 0));
    for (const f of this.qfolk) {
      if (f.role === 'jardinier') { f.hidden = dark > 0.5; if (f.hidden || !near) continue; }
      if (!near) continue;
      if (f.path) { // le jardinier va d'un parterre à l'autre, s'arrête, se penche sur les fleurs
        if (f.wait > 0) { f.wait -= dt; f.moving = false; continue; }
        const t = f.path[f.pi % f.path.length], dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
        if (d < 1.5) { f.pi++; f.wait = 4 + Math.random() * 5; f.moving = false; f.dir = 3; continue; }
        const k = Math.min(18 * dt, d); f.x += dx / d * k; f.y += dy / d * k; f.moving = true; f.walk += dt; f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
        continue;
      }
      if ((f.say -= dt) <= 0) { f.say = 3 + Math.random() * 3; f.dir = f.dir === 0 ? (Math.random() < 0.5 ? 1 : 2) : 0; }
    }
    if (!near) return;
    // ce que disent les gardes quand on s'approche (selon où l'on en est de l'histoire)
    const casse = this.q('br_casse') === 'active', done = this.q('br_casse') === 'done' || this.q('br_casse') === 'ready';
    for (const f of this.qfolk) {
      if (f.hidden) continue;
      const d = Math.hypot(me.x - f.x, me.y - f.y);
      if (d > 34 || (f.talkCd || 0) > now) continue;
      f.talkCd = now + 25; this.face(f, me.x, me.y);
      const L = f.role === 'jardinier' ? RL.jardinier : f.role === 'garde_portail' ? (this.alarm ? RL.portierAlarme : casse ? RL.portailCasse : done ? RL.portailApres : RL.portail) : RL.perron;
      this.bubble(f, this.pick(L), 3, true);
      setTimeout(() => { f.dir = f.home.dir; }, 3200);
    }
    // les invités du soir montent l'allée, un par un, jusqu'à la porte
    for (const f of this.qguests) {
      if (!f.going) { f.hidden = true; if (dark < 0.4) continue; if ((f.wait -= dt) > 0) continue; f.going = true; f.hidden = false; f.pi = 1; f.x = Q.arrive[0].x; f.y = Q.arrive[0].y; continue; }
      const t = Q.arrive[f.pi];
      if (!t) { f.going = false; f.hidden = true; f.wait = 30 + Math.random() * 30; continue; }
      f.hidden = false;
      const dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { f.pi++; continue; }
      const k = Math.min(24 * dt, d); f.x += dx / d * k; f.y += dy / d * k; f.moving = true; f.walk += dt; f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
    }
  }
  update(dt, now) {
    const G = this.G, rid = this.H.rooms.demeure;
    if (G.room === -1) { G.now = now; this.updateQuartier(dt, now); return; }
    if (G.room !== rid || !this.groups.length) return;
    G.now = now;
    const me = G.player, guard = !!(G.me && G.me.look && G.me.look.hat === 'morion');
    const calm = !this.alarm;
    // les déplacements
    for (const f of this.crowd) {
      if (f.route) { const arrived = this.stepRoute(f, dt, f.mode === 'flee' ? 46 : f.role === 'domestique' ? 30 : 24); if (arrived) { if (f.mode === 'home') { f.mode = f.round != null ? 'serve' : 'idle'; const g = this.groups[f.grp]; if (g && g.sit && f.mode === 'idle') f.sitUntil = Infinity; } else if (f.mode === 'flee') f.mode = 'cower'; else if (f.mode === 'watch') f.mode = 'watching'; } continue; }
      f.moving = false;
      if (f.mode === 'serve' && calm && !this.brawl) { // la tournée du domestique : un arrêt, puis l'étape suivante
        if ((f.wait -= dt) > 0) continue;
        const legs = this.H.reception.rounds[f.round], L = legs[f.leg % legs.length];
        f.route = L.path.slice(1); f.ri = 0; f.endDir = null; f.leg++;
        f.wait = 2.2 + Math.random() * 2.2;
        const near = this.groups.find((g) => Math.hypot(g.c.x - L.path[L.path.length - 1].x, g.c.y - L.path[L.path.length - 1].y) < 44);
        if (near) { f.endFace = near.c; }
        continue;
      }
      if (f.endFace && !f.route) { this.face(f, f.endFace.x, f.endFace.y); if (Math.random() < 0.35 && me && Math.hypot(me.x - f.x, me.y - f.y) < 220) this.bubble(f, this.pick(RL.domestique)); f.endFace = null; }
    }
    if (!calm || !me) return;
    // les conversations : un groupe à la fois parle (seulement près du pirate, pour ne pas couvrir l'écran de bulles)
    for (const g of this.groups) {
      if ((g.next -= dt) > 0) continue;
      g.next = 5 + Math.random() * 6;
      const members = g.slots.map((sl) => sl.who).filter((w) => w >= 0).map((w) => this.crowd[w]).filter((f) => f.mode === 'idle');
      if (members.length < 1 || Math.hypot(g.c.x - me.x, g.c.y - me.y) > 200) continue;
      const sp = members[Math.floor(Math.random() * members.length)];
      if (!this.bubble(sp, this.pick(RL[g.k] || RL.ragots))) { g.next = 1.5; continue; }
      for (const f of members) if (f !== sp && !f.sitUntil) this.face(f, sp.x, sp.y);
      const other = members.find((f) => f !== sp);
      if (other && Math.random() < 0.4) setTimeout(() => G.renderer.addFx({ kind: 'emo', e: Math.random() < 0.6 ? 'rire' : '!', follow: () => other, dur: 1.2, h: 34 }), 1600);
      setTimeout(() => { for (const f of members) { const sl = this.slotOf(f); if (sl && f.mode === 'idle' && !f.route) f.dir = sl.dir; } }, 3600);
    }
    // les musiciens, le cuisinier, le portier, le majordome
    for (const f of this.crowd) {
      if ((f.say -= dt) > 0) continue;
      if (f.role === 'musicien') { f.say = 1.6 + Math.random() * 1.4; if (!this.brawl) G.renderer.addFx({ kind: 'emo', e: '♪', follow: () => f, dur: 1.3, h: 34 }); }
      else if (f.role === 'cuisinier') { f.say = 6 + Math.random() * 4; f.dir = f.dir === 3 ? 1 : 3; if (Math.random() < 0.3 && Math.hypot(me.x - f.x, me.y - f.y) < 160) this.bubble(f, this.pick(RL.cuisinier)); }
      else if (f.role === 'portier') { f.say = 3 + Math.random() * 3; f.dir = [1, 0, 2, 0][Math.floor(Math.random() * 4)]; }
      else f.say = 4;
    }
    // le pirate qui s'attarde près d'un invité : celui-ci se tourne vers lui et lui parle ; le majordome l'accueille
    for (const f of this.crowd) {
      const d = Math.hypot(me.x - f.x, me.y - f.y);
      if (d > 26 || f.mode !== 'idle' && f.mode !== 'serve') { f.near = 0; continue; }
      f.near = (f.near || 0) + dt;
      if (f.near > 1.4 && (f.talkCd || 0) < now) {
        f.talkCd = now + 18; if (!f.sitUntil) this.face(f, me.x, me.y);
        const list = f.role === 'portier' ? (guard ? RL.portierGarde : RL.portier) : f.role === 'majordome' ? RL.majordome : f.role === 'domestique' ? RL.domestique : f.role === 'cuisinier' ? RL.cuisinier : guard ? RL.joueurGarde : RL.joueur;
        this.bubble(f, this.pick(list), 2.8, true);
      }
    }
    const R = this.H.reception, maj = this.crowd.find((f) => f.role === 'majordome');
    if (maj && Math.hypot(me.x - R.door.x, me.y - R.door.y) < 30 && now - this.greeted > 60) { this.greeted = now; this.face(maj, me.x, me.y); this.bubble(maj, RL.majordome[0], 2.8, true); }
    // de temps en temps, un invité change de groupe
    if ((this.nextMove -= dt) <= 0) { this.nextMove = 22 + Math.random() * 20; if (this.crowd.filter((f) => f.mode === 'home').length < 2) this.wander(); }
  }
  // ------------------------------------------------------------ dessin : le regard des gardes (une lueur de lanterne au sol)
  drawCones(ctx, camX, camY, now, dark) {
    const G = this.G, rooms = this.H.rooms;
    if (G.room !== rooms.entrepot && G.room !== rooms.demeure && G.room !== rooms.toits) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const e of G.ents.values()) {
      if (e.k !== 'm' || !GUARDS.has(e.type) || e.dyingT || e.ko) continue;
      const x = e.x - camX, y = e.y - 4 - camY, a = FACE[e.dir & 3], R = 80, s = this.sus.get(e.id) || 0;
      const col = s >= 2 ? '255,90,60' : s >= 1 ? '255,180,80' : '255,214,150';
      const g = ctx.createRadialGradient(x, y, 6, x, y, R);
      const k = (0.09 + 0.05 * dark) * (s >= 1 ? 1.5 : 1);
      g.addColorStop(0, `rgba(${col},${(k * 1.4).toFixed(3)})`); g.addColorStop(0.7, `rgba(${col},${(k * 0.6).toFixed(3)})`); g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, R, a - 0.75, a + 0.75); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}
