// Lot 5 : Le Plus Grand Braquage, côté client. Le serveur décide de tout ; ici, on montre : les points d'interaction
// du décor (E), le regard des gardes (la lumière de leur lanterne au sol, qui se teinte quand ils s'inquiètent), les
// gardes assommés, l'architecte qui se retourne, la partie de dés de Bréchet, le tiroir et la poche (le crochetage),
// les invités de la réception, les barricades de La Mouche d'Or, la poudre aux yeux, et les choix des scènes.
import { BR, LAFLEUR, BRECHET, FERRANT, TRAHISON, CONCLUSION, FIN_LINES } from '../shared/data/braquage.js';
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
    this.crowd = [];
    for (const [k, c] of this.H.crowd.entries()) {
      const f = { k: 'f', id: -7000 - k, x: c.x, y: c.y, dir: c.dir, dir0: c.dir, moving: false, walk: 0, look: c.look, lookKey: JSON.stringify(c.look), weapon: null, crowd: k, role: c.role, path: c.path, pi: 0, wait: Math.random() * 3, hidden: false };
      G.folk.push(f); this.crowd.push(f);
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
    if (m.a === 'state') { this.bars = m.bars || [0, 0]; this.away = m.away; this.locked = m.locked; if (m.fav != null) this.favor = m.fav; G.npcAway = m.away ? 'brechet' : null; G.refreshNpcs && G.refreshNpcs(); return; }
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
  // ------------------------------------------------------------ chaque image : les invités, les domestiques
  update(dt, now) {
    const G = this.G, rid = this.H.rooms.demeure;
    if (G.room !== rid) return;
    for (const f of this.crowd) {
      if (f.path) {
        if (f.wait > 0) { f.wait -= dt; f.moving = false; continue; }
        const t = f.path[f.pi % f.path.length], dx = t.x - f.x, dy = t.y - f.y, d = Math.hypot(dx, dy);
        if (d < 2) { f.pi++; f.wait = 1.5 + Math.random() * 3; f.moving = false; continue; }
        const sp = 24 * dt; f.x += dx / d * Math.min(sp, d); f.y += dy / d * Math.min(sp, d); f.moving = true; f.walk = (f.walk || 0) + dt; f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
      } else if (f.role === 'musicien' && Math.random() < dt * 0.25) G.renderer.addFx({ kind: 'emo', e: '♪', follow: () => f, dur: 1.4, h: 34 });
      else if (f.role === 'invite' && Math.random() < dt * 0.035) G.renderer.addFx({ kind: 'bubble', text: ['Quel buffet !', 'Valdorne vend quoi, au juste ?', 'Ces musiciens jouent faux.', 'Vous avez vu la carte ?', 'À votre santé !', 'On dit qu’il cache un coffre…'][Math.floor(Math.random() * 6)], follow: () => f, dur: 2.8, h: 34 });
    }
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
