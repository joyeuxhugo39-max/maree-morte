// 1.0 : les saisons — le concours de pêche (taille des prises, records par espèce), le Grand Tour de Libertalia
// (une course en selle, six portes et retour), et chaque mois un podium récompensé : doublons, le Tricorne des
// saisons et un titre pour les premiers. Les récompenses attendent les absents jusqu'à leur retour.
import { ITEMS } from '../shared/data/items.js';
import { FISH_KG, FISH_NAMES, fishKg, fishScore, seasonKey, seasonName, raceCourse } from '../shared/data/seasons.js';

const GATE_R = 40, RACE_ARM = 120;
const PRIZES = [5000, 3000, 1500];
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export const seasons = {
  seasonsInit() {
    this.season = { key: seasonKey(Date.now()), fish: {}, race: {}, records: {}, last: null, pending: {} };
    if (this.storage && this.storage.loadMeta) Promise.resolve(this.storage.loadMeta('saison')).then((s) => { if (s && s.key) this.season = Object.assign(this.season, s); this.seasonRoll(); }).catch(() => {});
  },
  storeSeason() { if (this.storage.saveMeta) Promise.resolve(this.storage.saveMeta('saison', this.season)).catch(() => {}); },
  seasonsLoad(p, d) { p.fishRec = d && d.fishRec && typeof d.fishRec === 'object' ? Object.fromEntries(Object.entries(d.fishRec).filter(([k]) => FISH_KG[k]).map(([k, v]) => [k, +v || 0])) : {}; p.race = null; },
  // la saison change : on fige le podium, on prépare les récompenses
  seasonRoll() {
    const key = seasonKey(Date.now()), S = this.season;
    if (S.key === key) return;
    const fishTop = Object.entries(S.fish).sort((a, b) => b[1].s - a[1].s).slice(0, 3);
    const raceTop = Object.entries(S.race).sort((a, b) => a[1].t - b[1].t).slice(0, 3);
    S.last = { key: S.key, fish: fishTop.map(([k, v]) => [v.n, v.s]), race: raceTop.map(([k, v]) => [v.n, v.t]) };
    fishTop.forEach(([k], i) => { (S.pending[k] = S.pending[k] || []).push(['pêche', i]); });
    raceTop.forEach(([k], i) => { (S.pending[k] = S.pending[k] || []).push(['course', i]); });
    S.key = key; S.fish = {}; S.race = {}; S.records = {};
    if (fishTop.length || raceTop.length) this.broadcastChat(null, `🏆 La saison de ${seasonName(S.last.key)} s’achève ! Pêche : ${fishTop.map(([, v]) => v.n).join(', ') || '—'} ; Grand Tour : ${raceTop.map(([, v]) => v.n).join(', ') || '—'}.`, 'boss');
    for (const p of this.players.values()) this.seasonPrizes(p);
    this.storeSeason();
  },
  seasonPrizes(p) {
    const list = this.season.pending[p.key]; if (!list || !list.length) return;
    delete this.season.pending[p.key];
    for (const [what, rank] of list) {
      p.gold += PRIZES[rank]; p.dirtyMe = true;
      if (rank === 0) { this.unlock(p, 'champion_saison'); if (this.countItem(p, 'tricorne_saison') === 0) this.giveOrDrop(p, 'tricorne_saison', 1); }
      this.toast(p, `🏆 Saison passée — ${what} : ${['premier', 'deuxième', 'troisième'][rank]} ! +${PRIZES[rank]} doublons${rank === 0 ? ' et le Tricorne des saisons' : ''}.`, 'quest');
    }
    this.storeSeason();
  },
  // ------------------------------------------------------------ pêche : la taille de la prise
  fishCaught(p, id) {
    if (!FISH_KG[id]) return;
    const kg = fishKg(id, Math.random());
    const best = p.fishRec[id] || 0, S = this.season;
    if (kg > best) p.fishRec[id] = kg;
    const rec = S.records[id];
    let msg = `${FISH_NAMES[id]} : ${String(kg).replace('.', ',')} kg`;
    if (!rec || kg > rec[1]) { S.records[id] = [p.name, kg]; msg += ' — record de la saison !'; if (rec) this.broadcastChat(null, `🎣 ${p.name} bat le record de la saison : ${FISH_NAMES[id].toLowerCase()} de ${String(kg).replace('.', ',')} kg !`, 'sys'); }
    else if (kg > best && best) msg += ' — record personnel !';
    const sc = fishScore(p.fishRec), cur = S.fish[p.key];
    S.fish[p.key] = { n: p.name, s: Math.max(sc, cur && cur.s || 0) };
    this.toast(p, msg, kg > best ? 'quest' : 'info');
    if (id === 'coelacanthe' || id === 'poisson_or') this.unlock(p, 'peche_legende');
    this.storeSeason();
  },
  // ------------------------------------------------------------ le Grand Tour de Libertalia
  raceStart(p) {
    const C = raceCourse(this.world);
    if (!this.nearNpc(p, 'palefrenier', 110)) return;
    if (C.length < 4) return this.toast(p, 'La course est fermée.', 'warn');
    p.race = { i: 0, t0: 0, started: false, until: this.time + RACE_ARM };
    this.send(p, { t: 'race', i: 0, gates: C.length, t0: 0 });
    this.toast(p, `Le Grand Tour de Libertalia : en selle, franchissez la porte des ${C[0].name} pour lancer le chrono, puis les ${C.length - 1} autres dans l’ordre, et revenez. Vous avez deux minutes pour prendre le départ.`, 'quest');
  },
  raceCheck(p) {
    const r = p.race; if (!r) return;
    const C = raceCourse(this.world);
    if (!r.started && this.time > r.until) { p.race = null; this.send(p, { t: 'race', off: 1 }); return this.toast(p, 'Le départ du Grand Tour a été manqué.', 'warn'); }
    if (r.started && !p.riding) { p.race = null; this.send(p, { t: 'race', off: 1 }); return this.toast(p, 'Pied à terre : course annulée.', 'warn'); }
    const g = C[r.i % C.length];
    if (p.room >= 0 || Math.hypot(p.x - g.x, p.y - g.y) > GATE_R) return;
    if (!p.riding) return this.toast(p, 'Il faut être en selle (C) pour franchir les portes.', 'warn');
    if (r.i === 0 && !r.started) { r.t0 = this.time; r.started = true; r.i = 1; this.send(p, { t: 'race', i: 1, gates: C.length, t0: 1, go: 1 }); return this.toast(p, 'Partez ! Le chrono tourne.', 'quest'); }
    if (r.i === C.length) { // retour à la première porte : arrivée
      const t = Math.round((this.time - r.t0) * 10) / 10, S = this.season, cur = S.race[p.key];
      p.race = null;
      if (!cur || t < cur.t) S.race[p.key] = { n: p.name, t };
      this.send(p, { t: 'race', off: 1, done: t });
      this.toast(p, `Arrivée ! ${fmt(t)}${!cur || t < cur.t ? ' — meilleur temps de la saison pour vous !' : ` (votre meilleur : ${fmt(cur.t)})`}`, 'quest');
      this.unlock(p, 'grand_tour');
      p.gold += 150; p.dirtyMe = true;
      return this.storeSeason();
    }
    r.i++; this.send(p, { t: 'race', i: r.i, gates: C.length, t0: 1 });
  },
  seasonState() {
    const S = this.season;
    return { t: 'season', key: S.key, name: seasonName(S.key),
      fish: Object.values(S.fish).sort((a, b) => b.s - a.s).slice(0, 10).map((v) => [v.n, v.s]),
      race: Object.values(S.race).sort((a, b) => a.t - b.t).slice(0, 10).map((v) => [v.n, v.t]),
      records: Object.entries(S.records).map(([k, v]) => [FISH_NAMES[k], v[0], v[1]]),
      last: S.last ? { name: seasonName(S.last.key), fish: S.last.fish, race: S.last.race } : null };
  },
};
