// 1.0 : les jeux de taverne — bras de fer (un jeu d'adresse que le serveur vérifie à partir de vos appuis),
// concours de rhum (chacun son tour, jusqu'à ce qu'un des deux roule sous la table), le Trente-et-un aux cartes,
// et les chansons à boire que toute la salle reprend. On joue contre le ou la tavernière.
import { roomIdAt } from '../shared/world.js';

const BET_MIN = 10, BET_MAX = 300;
export const SONGS = [
  { name: 'La Complainte du Rhum Borgne', lines: ['Quinze marins sur un tonneau, yo-ho !', 'Et pas un seul ne tient debout !', 'Le capitaine a bu la mer, yo-ho !', 'Et la marée nous ramène au bout !'] },
  { name: 'Le Chant de la Lanterne', lines: ['Allume, allume la lanterne au port,', 'Que les morts restent où ils dorment encor !', 'Une chope à la main, un sabre au côté,', 'On rentrera vivants, on rentrera chanter !'] },
  { name: 'Hissez la Grand-Voile', lines: ['Hissez la grand-voile, larguez les amarres !', 'Le vent nous emporte loin de nos histoires !', 'Si le Kraken nous guette au détour des flots,', 'On lui chantera ça, et on boira de l’eau… de rhum !'] },
];
const ARM = { presses: 5, window: 12, zone: 0.24 };

export const tavern = {
  tavernInit() {
    this.tavernNpcs = new Set();
    for (const n of this.world.npcs) { const r = roomIdAt(this.world, n.x, n.y); if (r >= 0 && ['tavern', 'auberge'].includes(this.world.rooms[r].kind)) this.tavernNpcs.add(n.id); }
    this.songAt = new Map(); // salle -> fin de la chanson en cours
  },
  tavernNear(p) { for (const id of this.tavernNpcs) if (this.nearNpc(p, id, 120)) return id; return null; },
  betOk(p, bet) {
    bet = Math.max(BET_MIN, Math.min(BET_MAX, Math.floor(+bet) || 0));
    if (p.gold < bet) { this.toast(p, 'Pas assez de doublons pour cette mise.', 'warn'); return 0; }
    return bet;
  },
  tavernAction(p, a, m) {
    if (p.dead) return;
    const npc = this.tavernNear(p);
    if (!npc) return this.toast(p, 'Les jeux se jouent au comptoir d’une taverne.', 'warn');
    if (this.time - (p.lastTav || 0) < 0.25) return;
    p.lastTav = this.time;
    switch (a) {
      case 'arm': return this.armStart(p, m.bet);
      case 'armEnd': return this.armEnd(p, m.taps);
      case 'rum': return this.rumStart(p, m.bet, npc);
      case 'drink': return this.rumDrink(p, !!m.double);
      case 'rumStop': return this.rumStop(p);
      case 'cards': return this.cardsStart(p, m.bet);
      case 'hit': return this.cardsHit(p);
      case 'stand': return this.cardsStand(p);
      case 'sing': return this.sing(p, npc);
      default:
    }
  },
  // add : les doublons rendus au joueur ; net : son gain réel (la mise du rhum est déjà sur le comptoir)
  payout(p, bet, add, game, net = add) {
    p.gold += add; p.dirtyMe = true;
    this.audit && this.audit('taverne', { who: p.key, game, bet, gain: net, gold: p.gold });
    if (net > 0) { p.cnt.tav = (p.cnt.tav || 0) + 1; if (p.cnt.tav >= 10) this.unlock(p, 'pilier_taverne'); }
  },
  // ------------------------------------------------------------ bras de fer : cinq appuis dans la zone verte
  armStart(p, bet) {
    if (p.game) return;
    bet = this.betOk(p, bet); if (!bet) return;
    const g = { kind: 'arm', bet, t0: this.time, speed: 2.4 + Math.random() * 1.4, phase: Math.random() * 6.28, z0: 0.2 + Math.random() * (0.56 - ARM.zone), need: 2 + Math.floor(Math.random() * 3) };
    g.z1 = g.z0 + ARM.zone; p.game = g;
    this.send(p, { t: 'tav', g: 'arm', speed: g.speed, phase: g.phase, z: [g.z0, g.z1], presses: ARM.presses, window: ARM.window, need: g.need, bet });
  },
  armPos(g, t) { return (Math.sin(t * g.speed + g.phase) + 1) / 2; },
  armEnd(p, taps) {
    const g = p.game; if (!g || g.kind !== 'arm') return;
    p.game = null;
    const T = Array.isArray(taps) ? taps.slice(0, ARM.presses).map(Number).filter((t) => isFinite(t) && t >= 0) : [];
    const elapsed = this.time - g.t0;
    let ok = T.length === ARM.presses && T.every((t, i) => i === 0 || t > T[i - 1] + 0.15) && T[T.length - 1] <= Math.min(ARM.window, elapsed + 0.6);
    const hits = ok ? T.filter((t) => { const x = this.armPos(g, t); return x >= g.z0 && x <= g.z1; }).length : 0;
    const win = hits > g.need, draw = hits === g.need;
    const gain = win ? g.bet : draw ? 0 : -g.bet;
    this.payout(p, g.bet, gain, 'bras');
    this.send(p, { t: 'tav', g: 'arm', done: 1, hits, need: g.need, gain });
  },
  // ------------------------------------------------------------ concours de rhum : chacun son tour
  rumStart(p, bet, npc) {
    if (p.game) return;
    bet = this.betOk(p, bet); if (!bet) return;
    p.gold -= bet; p.dirtyMe = true; // la mise est sur le comptoir
    p.game = { kind: 'rum', bet, me: 0, them: 0, npc, tol: 0.85 + Math.min(0.4, p.level / 80), npcTol: 0.75 + Math.random() * 0.5 };
    this.send(p, { t: 'tav', g: 'rum', me: 0, them: 0, bet });
  },
  falls(glasses, tol) { return Math.random() < Math.min(0.92, 0.024 * Math.pow(glasses, 1.45) / tol); },
  rumDrink(p, double) {
    const g = p.game; if (!g || g.kind !== 'rum') return;
    const n = double ? 2 : 1;
    let meDown = false, themDown = false;
    for (let k = 0; k < n && !meDown; k++) { g.me++; meDown = this.falls(g.me, g.tol); }
    if (!meDown) for (let k = 0; k < n && !themDown; k++) { g.them++; themDown = this.falls(g.them, g.npcTol); }
    p.drunkUntil = Math.max(p.drunkUntil || 0, this.time + 4 * g.me); p.dirtyMe = true;
    if (meDown || themDown) {
      p.game = null;
      const back = themDown ? g.bet * 2 + (double ? Math.round(g.bet * 0.5) : 0) : 0, gain = back - g.bet;
      this.payout(p, g.bet, back, 'rhum', gain);
      if (meDown) { this.ev(p.x, p.y, ['emote', p.id, 'assis']); }
      return this.send(p, { t: 'tav', g: 'rum', me: g.me, them: g.them, done: 1, win: themDown ? 1 : 0, gain });
    }
    this.send(p, { t: 'tav', g: 'rum', me: g.me, them: g.them });
  },
  rumStop(p) { // on abandonne : la moitié de la mise est perdue
    const g = p.game; if (!g || g.kind !== 'rum') return;
    p.game = null; const back = Math.floor(g.bet / 2);
    this.payout(p, g.bet, back, 'rhum-abandon', back - g.bet);
    this.send(p, { t: 'tav', g: 'rum', me: g.me, them: g.them, done: 1, win: 0, gain: back - g.bet, quit: 1 });
  },
  // ------------------------------------------------------------ le Trente-et-un : s'approcher de 31 sans le dépasser
  deck() { const d = []; for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 11]) for (let s = 0; s < 4; s++) d.push(v); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; },
  cardsStart(p, bet) {
    if (p.game) return;
    bet = this.betOk(p, bet); if (!bet) return;
    const deck = this.deck(), g = { kind: 'cards', bet, deck, me: [deck.pop(), deck.pop(), deck.pop()], them: [deck.pop()] };
    p.game = g;
    this.send(p, { t: 'tav', g: 'cards', me: g.me, them: g.them, bet });
  },
  sum(h) { return h.reduce((s, v) => s + v, 0); },
  cardsHit(p) {
    const g = p.game; if (!g || g.kind !== 'cards') return;
    g.me.push(g.deck.pop());
    if (this.sum(g.me) > 31) { p.game = null; this.payout(p, g.bet, -g.bet, 'cartes'); return this.send(p, { t: 'tav', g: 'cards', me: g.me, them: g.them, done: 1, gain: -g.bet, bust: 1 }); }
    this.send(p, { t: 'tav', g: 'cards', me: g.me, them: g.them });
  },
  cardsStand(p) {
    const g = p.game; if (!g || g.kind !== 'cards') return;
    p.game = null;
    while (this.sum(g.them) < 27) g.them.push(g.deck.pop());
    const a = this.sum(g.me), b = this.sum(g.them);
    const gain = b > 31 || a > b ? (a === 31 ? Math.round(g.bet * 1.5) : g.bet) : a === b ? 0 : -g.bet;
    this.payout(p, g.bet, gain, 'cartes');
    this.send(p, { t: 'tav', g: 'cards', me: g.me, them: g.them, done: 1, gain });
  },
  // ------------------------------------------------------------ les chansons à boire : toute la salle reprend
  sing(p, npc) {
    const room = p.room;
    if ((this.songAt.get(room) || 0) > this.time) return this.toast(p, 'On chante déjà ! Reprenez avec eux.', 'info');
    const song = SONGS[Math.floor(Math.random() * SONGS.length)];
    this.songAt.set(room, this.time + 4 * song.lines.length + 2);
    const singers = [...this.players.values()].filter((q) => q.room === room);
    song.lines.forEach((line, i) => this.later(1 + i * 3.6, () => {
      for (const q of singers) if (this.players.has(q.id) && q.room === room) this.send(q, { t: 'tav', g: 'song', name: song.name, line, i, n: song.lines.length, npc });
    }));
    // de l'entrain pour ceux qui chantent (une fois par quart d'heure) : +10 % d'attaque cinq minutes
    for (const q of singers) {
      if ((q.singAt || 0) > this.time) continue;
      q.singAt = this.time + 900; q.buffs = q.buffs || {}; q.buffs.chant = { v: 0.1, until: this.time + 300 }; this.recalc(q);
      this.toast(q, `♪ « ${song.name} » : l’entrain vous gagne (+10 % d’attaque pendant 5 minutes).`, 'quest');
    }
    p.cnt.song = (p.cnt.song || 0) + 1; if (p.cnt.song >= 5) this.unlock(p, 'chanteur');
  },
};
