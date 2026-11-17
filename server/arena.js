// 1.0 : l'Arène de la Fosse (Libertalia) — des vagues de plus en plus dures, seul ou en groupe ; un
// classement de la semaine (le meilleur devient Champion de la Fosse) ; des duels à mise, et les gradins
// parient sur le vainqueur. Dans la Fosse, on ne meurt pas : on est mis à terre et l'on finit dans les gradins.
import { canStand } from '../shared/world.js';
import { TILE } from '../shared/constants.js';
import { MOBS } from '../shared/data/mobs.js';

const GRUNTS = ['zsailor', 'buccaneer', 'ghoul', 'drowned', 'skelgun', 'chien_mort', 'flibustier', 'epouvantail', 'pendu', 'coupe_jarret', 'legionnaire', 'naufrageur', 'garde_maudit', 'calcine', 'goule_ecarlate', 'golem_lave', 'damne', 'arquebusier_damne', 'molosse_damne'];
const CHAMPS = ['crabroi', 'goule_alpha', 'capitaine_noye', 'reine_mangrove', 'capitaine_naufrageur'];
const HOUSE_CUT = 0.05, DUEL_TIME = 120, BET_WINDOW = 12;
const rnd = (a, b) => a + Math.random() * (b - a);
export function weekKey(ms) { // semaine ISO, « 2026-S47 »
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const w1 = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return `${d.getUTCFullYear()}-S${String(1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0')}`;
}

export const arena = {
  arenaInit() {
    this.fosseRoom = this.world.rooms.findIndex((r) => r.kind === 'fosse');
    this.arenaRun = null; this.duel = null;
    this.board = { week: weekKey(Date.now()), top: {}, last: [] };
    if (this.storage && this.storage.loadMeta) Promise.resolve(this.storage.loadMeta('arene')).then((b) => { if (b && b.top) this.board = b; this.boardRoll(); }).catch(() => {});
  },
  storeBoard() { if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('arene', this.board)).catch(() => {}); },
  // une nouvelle semaine : on retient le podium, le premier est sacré Champion de la Fosse
  boardRoll() {
    const wk = weekKey(Date.now());
    if (this.board.week === wk) return;
    const podium = Object.entries(this.board.top).sort((a, b) => b[1].w - a[1].w || a[1].t - b[1].t).slice(0, 3);
    this.board = { week: wk, top: {}, last: podium.map(([k, v]) => [k, v.n, v.w]), champ: podium.length ? podium[0][0] : null };
    for (const q of this.players.values()) if (podium.length && q.key === podium[0][0]) this.unlock(q, 'champion_fosse');
    if (podium.length) this.broadcastChat(null, `🏆 Nouvelle semaine à la Fosse ! Le champion de la semaine passée : ${podium[0][1].n} (vague ${podium[0][1].w}).`, 'boss');
    this.storeBoard();
  },
  boardTop() { return Object.values(this.board.top).sort((a, b) => b.w - a.w || a.t - b.t).slice(0, 15).map((v) => [v.n, v.w]); },
  inFosse(p) { return p && p.room === this.fosseRoom && this.fosseRoom >= 0; },
  fosseRect() { const r = this.world.rooms[this.fosseRoom]; return r; },
  floorSpot(fx, fy) { // un point du sol de la Fosse (fx, fy entre 0 et 1)
    const r = this.fosseRect();
    for (let k = 0; k < 20; k++) { const x = (r.x0 + 2 + (r.w - 4) * Math.min(1, Math.max(0, fx + rnd(-0.06, 0.06)))) * TILE, y = (r.y0 + 3 + (r.h - 6) * Math.min(1, Math.max(0, fy + rnd(-0.08, 0.08)))) * TILE; if (canStand(this.world, x, y)) return [x, y]; }
    return [(r.x0 + (r.w >> 1)) * TILE + 8, (r.y0 + (r.h >> 1)) * TILE + 8];
  },
  standsSpot() { const r = this.fosseRect(); return [(r.x0 + 1 + Math.random() * (r.w - 2)) * TILE + 8, (r.y0 + 1) * TILE + 12]; },
  arenaAction(p, a, m) {
    if (!this.inFosse(p)) return this.toast(p, 'Cela se passe dans la Fosse, à Libertalia.', 'warn');
    this.boardRoll();
    switch (a) {
      case 'waves': return this.arenaStart(p);
      case 'board': return this.send(p, { t: 'arena', board: this.boardTop(), week: this.board.week, last: this.board.last, champ: this.board.champ === p.key });
      case 'duel': return this.duelAsk(p, String(m.name || ''), Math.max(0, Math.min(5000, m.bet | 0)));
      case 'accept': return this.duelAccept(p);
      case 'decline': { const c = p.duelAsk && this.players.get(p.duelAsk.from); p.duelAsk = null; if (c) this.toast(c, `${p.name} refuse le duel.`, 'info'); return; }
      case 'bet': return this.duelBet(p, m.on | 0, Math.max(0, Math.min(500, m.n | 0)));
      default:
    }
  },
  // ------------------------------------------------------------ les vagues
  arenaStart(p) {
    if (this.arenaRun) return this.toast(p, 'Un combat est déjà en cours : regardez depuis les gradins, ou attendez votre tour.', 'warn');
    if (this.duel) return this.toast(p, 'Un duel est en cours.', 'warn');
    const team = (p.group ? this.groupOf(p) : [p]).filter((q) => this.inFosse(q) && !q.dead);
    this.arenaRun = { team: new Set(team.map((q) => q.id)), wave: 0, mobs: [], next: this.time + 4, start: this.time, lvl: team.reduce((s, q) => s + q.level, 0) / team.length };
    for (const q of team) { q.arena = true; const [x, y] = this.floorSpot(0.5 + rnd(-0.1, 0.1), 0.75); this.teleport(q, x, y, { travel: 'arene' }); this.toast(q, 'La Fosse rugit ! Première vague dans quatre secondes. On ne meurt pas ici : on finit dans les gradins.', 'quest'); }
    this.broadcastRoom(`⚔ ${team.map((q) => q.name).join(', ')} descend${team.length > 1 ? 'ent' : ''} dans la Fosse !`);
    this.pushArena();
  },
  broadcastRoom(msg) { for (const q of this.players.values()) if (this.inFosse(q)) this.send(q, { t: 'chat', from: null, kind: 'boss', ch: 'sys', m: msg }); },
  pushArena() {
    const r = this.arenaRun, d = this.duel;
    const msg = { t: 'arena', run: r ? { wave: r.wave, left: r.mobs.filter((m) => m.state !== 'dead').length, team: [...r.team].map((id) => (this.players.get(id) || {}).name).filter(Boolean) } : null,
      duel: d ? { a: d.names[0], b: d.names[1], bet: d.bet, pot: [d.pot[0], d.pot[1]], at: Math.max(0, Math.round(d.startAt - this.time)), fight: this.time >= d.startAt } : null };
    for (const q of this.players.values()) if (this.inFosse(q) || q.arena) this.send(q, msg);
  },
  spawnArenaWave() {
    const r = this.arenaRun; r.wave++;
    const lv = r.lvl + (r.wave - 1) * 0.8, n = r.team.size;
    const pool = GRUNTS.filter((k) => MOBS[k] && MOBS[k].level <= lv + 2 && MOBS[k].level >= lv - 6);
    const types = pool.length ? pool : ['zsailor'];
    const count = Math.min(16, 2 + Math.ceil(r.wave * 0.8) + (n - 1) * 2);
    const add = (type, fx, fy) => { const [x, y] = this.floorSpot(fx, fy); const m = this.addMob(type, x, y, true); m.event = true; m.sunproof = true; m.arena = true; m.state = 'chase'; r.mobs.push(m); return m; };
    for (let i = 0; i < count; i++) add(types[Math.floor(Math.random() * types.length)], Math.random(), rnd(0, 0.35));
    if (r.wave % 5 === 0) { // un champion toutes les cinq vagues
      const c = add(CHAMPS.filter((k) => MOBS[k] && MOBS[k].level <= lv + 3).pop() || 'crabroi', 0.5, 0.2);
      c.hp = c.maxHp = Math.round(c.maxHp * (0.8 + 0.25 * n));
      this.ev(c.x, c.y, ['shout', c.id, 'Personne ne sort vivant de MA fosse !']);
    }
    for (const id of r.team) { const q = this.players.get(id); if (q) this.toast(q, `Vague ${r.wave}${r.wave % 5 === 0 ? ' — un champion !' : ''}`, 'quest'); }
    this.pushArena();
  },
  arenaTick() {
    if (this.duel) this.duelTick();
    const r = this.arenaRun; if (!r) return;
    const alive = [...r.team].map((id) => this.players.get(id)).filter((q) => q && q.arena && this.inFosse(q));
    if (!alive.length) return this.arenaEnd();
    if (r.mobs.length && r.mobs.every((m) => m.state === 'dead')) { r.mobs = []; r.next = this.time + 5; for (const q of alive) { q.hp = Math.min(q.stats.maxHp, q.hp + q.stats.maxHp * 0.25); q.dirtyMe = true; } this.pushArena(); }
    if (!r.mobs.length && this.time >= r.next) this.spawnArenaWave();
    if (this.tickCount % 40 === 0) this.pushArena();
  },
  // la fin : chacun est payé selon les vagues tenues ; le classement de la semaine retient la meilleure
  arenaEnd() {
    const r = this.arenaRun; this.arenaRun = null; if (!r) return;
    for (const m of r.mobs) if (m.state !== 'dead') { m.state = 'dead'; m.hp = 0; this.ev(m.x, m.y, ['die', m.id]); }
    const done = Math.max(0, r.wave - 1);
    for (const id of r.team) {
      const q = this.players.get(id); if (!q) continue;
      q.arena = false;
      const gold = Math.round(done * done * 12 + done * 30 * Math.max(1, q.level / 10));
      if (gold) { q.gold += gold; q.dirtyMe = true; }
      if (done) this.giveXp(q, done * 25 * q.level);
      const best = this.board.top[q.key];
      if (!best || done > best.w) { this.board.top[q.key] = { n: q.name, w: done, t: Math.round(this.time - r.start) }; }
      if (done >= 10) this.unlock(q, 'gladiateur');
      this.toast(q, `La Fosse vous acclame : ${done} vague${done > 1 ? 's' : ''} tenue${done > 1 ? 's' : ''}${gold ? `, +${gold} doublons` : ''}. Meilleur score de la semaine : ${this.board.top[q.key].w}.`, 'quest');
    }
    this.storeBoard();
    this.broadcastRoom(`🏆 Fin du combat : ${done} vague${done > 1 ? 's' : ''}.`);
    this.pushArena();
  },
  // mis à terre dans la Fosse : ni mort, ni perte ; direction les gradins
  arenaKnockout(p) {
    if (p.duel) return this.duelEnd(p.duel === 1 ? 1 : 0, 'ko');
    p.arena = false; p.hp = Math.max(1, Math.round(p.stats.maxHp * 0.2)); p.dirtyMe = true;
    const [x, y] = this.standsSpot(); this.teleport(p, x, y, { travel: 'arene' });
    this.toast(p, 'À terre ! Vous voilà dans les gradins.', 'warn');
    this.pushArena();
  },
  // ------------------------------------------------------------ les duels à mise
  duelAsk(p, name, bet) {
    const q = this.byName(name);
    if (!q || q === p || !this.inFosse(q)) return this.toast(p, 'Votre adversaire doit être dans la Fosse.', 'warn');
    if (this.duel || this.arenaRun) return this.toast(p, 'La Fosse est occupée.', 'warn');
    if (p.gold < bet) return this.toast(p, 'Vous n’avez pas de quoi miser autant.', 'warn');
    q.duelAsk = { from: p.id, bet, until: this.time + 30 };
    this.send(q, { t: 'ask', kind: 'duel', from: p.name, bet });
    this.toast(p, `Défi lancé à ${q.name}${bet ? ` (mise : ${bet} doublons)` : ''}.`, 'info');
  },
  duelAccept(p) {
    const ask = p.duelAsk, c = ask && this.players.get(ask.from);
    p.duelAsk = null;
    if (!ask || ask.until < this.time || !c || !this.inFosse(c) || this.duel || this.arenaRun) return this.toast(p, 'Ce défi a expiré.', 'warn');
    if (p.gold < ask.bet || c.gold < ask.bet) return this.toast(p, 'Il manque des doublons pour la mise.', 'warn');
    p.gold -= ask.bet; c.gold -= ask.bet; p.dirtyMe = c.dirtyMe = true;
    this.duel = { ids: [c.id, p.id], names: [c.name, p.name], bet: ask.bet, pot: [0, 0], bets: new Map(), startAt: this.time + BET_WINDOW, endAt: this.time + BET_WINDOW + DUEL_TIME };
    c.duel = 1; p.duel = 2;
    const [ax, ay] = this.floorSpot(0.15, 0.5), [bx, by] = this.floorSpot(0.85, 0.5);
    this.teleport(c, ax, ay, { travel: 'arene' }); this.teleport(p, bx, by, { travel: 'arene' });
    for (const q of [c, p]) { q.hp = q.stats.maxHp; q.dirtyMe = true; q.invulnUntil = this.duel.startAt; }
    this.broadcastRoom(`🤺 Duel : ${c.name} contre ${p.name}${ask.bet ? `, ${ask.bet} doublons chacun` : ''} ! Les paris sont ouverts ${BET_WINDOW} secondes.`);
    for (const q of this.players.values()) if (this.inFosse(q) && q !== c && q !== p) this.send(q, { t: 'ask', kind: 'pari', from: c.name, vs: p.name });
    this.pushArena();
  },
  duelBet(p, on, n) {
    const d = this.duel;
    if (!d || this.time >= d.startAt || d.ids.includes(p.id) || (on !== 0 && on !== 1) || !n) return this.toast(p, 'Les paris sont fermés.', 'warn');
    if (d.bets.has(p.id)) return this.toast(p, 'Vous avez déjà parié.', 'warn');
    if (p.gold < n) return this.toast(p, 'Pas assez de doublons.', 'warn');
    p.gold -= n; p.dirtyMe = true; d.bets.set(p.id, [on, n]); d.pot[on] += n;
    this.toast(p, `Pari enregistré : ${n} doublons sur ${d.names[on]}.`, 'info');
    this.pushArena();
  },
  duelFighters() { const d = this.duel; return d ? d.ids.map((id) => this.players.get(id)) : []; },
  duelTick() {
    const d = this.duel, [a, b] = this.duelFighters();
    if (!a || !b || !this.inFosse(a) || !this.inFosse(b)) return this.duelEnd(!a || !this.inFosse(a) ? 1 : 0, 'forfait');
    if (this.time > d.endAt) return this.duelEnd(-1, 'temps');
    if (this.tickCount % 40 === 0) this.pushArena();
  },
  // win : 0 ou 1 (le vainqueur), -1 : match nul
  duelEnd(win, why) {
    const d = this.duel; if (!d) return; this.duel = null;
    const F = d.ids.map((id) => this.players.get(id));
    for (const q of F) if (q) { q.duel = 0; q.hp = Math.max(q.hp, Math.round(q.stats.maxHp * 0.3)); q.dirtyMe = true; }
    if (win < 0) { // match nul : chacun reprend sa mise, les parieurs aussi
      for (const q of F) if (q) q.gold += d.bet;
      for (const [id, [, n]] of d.bets) { const q = this.players.get(id); if (q) { q.gold += n; q.dirtyMe = true; } }
      this.broadcastRoom('🤺 Temps écoulé : match nul, les mises sont rendues.');
    } else {
      const W = F[win], L = F[1 - win];
      const prize = Math.round(d.bet * 2 * (1 - HOUSE_CUT));
      if (W) { W.gold += prize; W.honor = (W.honor || 0) + 5; W.dirtyMe = true; this.unlock(W, 'duelliste'); this.toast(W, `Victoire${prize ? ` : +${prize} doublons` : ''} !`, 'quest'); }
      if (L) { const [x, y] = this.standsSpot(); this.teleport(L, x, y, { travel: 'arene' }); this.toast(L, 'Défaite… aux gradins.', 'warn'); }
      const total = d.pot[0] + d.pot[1], wpot = d.pot[win];
      for (const [id, [on, n]] of d.bets) { // pari mutuel : les gagnants se partagent la cagnotte, moins la part de la maison
        const q = this.players.get(id); if (!q || on !== win || !wpot) continue;
        const g = Math.floor(total * (1 - HOUSE_CUT) * n / wpot); q.gold += g; q.dirtyMe = true; this.toast(q, `Votre pari paie : +${g} doublons !`, 'quest');
      }
      this.broadcastRoom(`🏆 ${d.names[win]} remporte le duel contre ${d.names[1 - win]}${why === 'forfait' ? ' (forfait)' : ''} !`);
      this.audit && this.audit('duel', { a: d.names[0], b: d.names[1], win: d.names[win], bet: d.bet, pot: total });
    }
    this.pushArena();
  },
};
