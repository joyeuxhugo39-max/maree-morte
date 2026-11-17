// 1.0 : les invasions, rares et annoncées — toutes les deux à trois heures, une flotte maudite débarque
// près d'une ville (jamais dedans : la Flamme et la garde veillent). Annonce cinq minutes avant, trois vagues,
// puis leur capitaine. Les défenseurs se partagent la gloire, l'or et la reconnaissance de la ville.
import { SAFE, canStand, zoneAt, roomIdAt } from '../shared/world.js';
import { TILE, T } from '../shared/constants.js';
import { MOBS } from '../shared/data/mobs.js';
import { PLACES, PLACE_ORDER } from '../shared/data/places.js';

const ANNOUNCE = 300, WAVE_GAP = 75, TIMEOUT = 480;
const GRUNTS = ['zsailor', 'buccaneer', 'ghoul', 'drowned', 'skelgun', 'chien_mort', 'flibustier', 'epouvantail', 'pendu', 'coupe_jarret', 'legionnaire', 'naufrageur', 'garde_maudit', 'calcine', 'goule_ecarlate', 'damne', 'arquebusier_damne'];
const CAPTAINS = ['crabroi', 'goule_alpha', 'capitaine_noye', 'reine_mangrove', 'capitaine_naufrageur'];
const rnd = (a, b) => a + Math.random() * (b - a);

export const events = {
  eventsInit() { this.wevt = null; this.nextEventAt = null; }, // l'horloge de la partie n'existe pas encore : fixé au premier passage
  // le point de débarquement : une plage hors de la ville, à 18–40 cases de son centre
  landingOf(place) {
    const W = this.world, c = W[PLACES[place].key]; if (!c) return null;
    let best = null, bs = -1;
    for (let k = 0; k < 400; k++) {
      const a = Math.random() * Math.PI * 2, r = rnd(18, 40), tx = Math.round(c.x + Math.cos(a) * r), ty = Math.round(c.y + Math.sin(a) * r);
      const x = tx * TILE + 8, y = ty * TILE + 10;
      if (tx < 1 || ty < 1 || tx >= W.W - 1 || !canStand(W, x, y) || roomIdAt(W, x, y) >= 0 || SAFE.has(zoneAt(W, x, y))) continue;
      const s = (W.tiles[ty * W.W + tx] === T.SAND ? 3 : 1) + Math.random();
      if (s > bs) { bs = s; best = [x, y]; }
    }
    return best;
  },
  startWorldEvent(kind, force) {
    if (this.wevt) return { err: 'une invasion est déjà en cours' };
    const place = PLACES[kind] ? kind : PLACE_ORDER[Math.floor(Math.random() * PLACE_ORDER.length)];
    const at = this.landingOf(place); if (!at) return { err: 'pas de plage pour débarquer' };
    this.wevt = { place, x: at[0], y: at[1], startAt: this.time + (force === 'now' ? 5 : ANNOUNCE), wave: 0, nextWave: 0, mobs: [], tags: new Set(), warned: false };
    const name = PLACES[place].name, mins = Math.round((this.wevt.startAt - this.time) / 60);
    this.broadcastChat(null, `☠ Une flotte maudite fait voile vers ${name} ! Débarquement dans ${mins || 1} minute${mins > 1 ? 's' : ''}, sur la côte. Aux armes !`, 'boss');
    this.pushEvent();
    return { ok: true, place, x: at[0], y: at[1] };
  },
  pushEvent(p) {
    const e = this.wevt;
    const m = e ? { t: 'wevt', place: e.place, name: PLACES[e.place].name, x: Math.round(e.x), y: Math.round(e.y), in: Math.max(0, Math.round(e.startAt - this.time)), wave: e.wave, left: e.mobs.filter((q) => q.state !== 'dead').length } : { t: 'wevt', end: 1 };
    if (p) this.send(p, m); else for (const q of this.players.values()) this.send(q, m);
  },
  eventLevel() {
    const e = this.wevt, near = [...this.players.values()].filter((q) => !q.dead && q.room < 0 && Math.hypot(q.x - e.x, q.y - e.y) < 900);
    const lv = near.length ? near.reduce((s, q) => s + q.level, 0) / near.length : 6;
    return [lv, Math.max(1, near.length)];
  },
  spawnWave(final) {
    const e = this.wevt, [lv, n] = this.eventLevel();
    const pool = GRUNTS.filter((k) => MOBS[k] && Math.abs(MOBS[k].level - lv) <= 4);
    const types = pool.length ? pool : ['zsailor', 'buccaneer'];
    const count = Math.min(24, 5 + 3 * n + e.wave * 2);
    const add = (type) => {
      for (let k = 0; k < 20; k++) {
        const x = e.x + rnd(-70, 70), y = e.y + rnd(-50, 50);
        if (!canStand(this.world, x, y)) continue;
        const m = this.addMob(type, x, y, true);
        m.event = true; m.sunproof = true; m.state = 'idle'; m.wanderAt = this.time + rnd(0.5, 2);
        e.mobs.push(m); return m;
      }
      return null;
    };
    for (let i = 0; i < count; i++) add(types[Math.floor(Math.random() * types.length)]);
    if (final) {
      const cap = CAPTAINS.filter((k) => MOBS[k] && MOBS[k].level <= lv + 4).pop() || 'crabroi';
      const c = add(cap); if (c) { c.hp = c.maxHp = Math.round(c.maxHp * (1 + 0.5 * (n - 1))); c.captain = true; this.ev(c.x, c.y, ['shout', c.id, 'À l’abordage ! Pas de quartier !']); }
    }
    this.ev(e.x, e.y, ['fx', 'splash', e.x, e.y]);
  },
  eventTick() {
    if (!(this.nextEventAt > 0)) this.nextEventAt = (this.time || 0) + rnd(7200, 10800);
    if (!this.wevt) {
      if (this.time >= this.nextEventAt && this.players.size > 0 && !this.maintenance) { this.nextEventAt = this.time + rnd(7200, 10800); this.startWorldEvent('', false); }
      return;
    }
    const e = this.wevt;
    for (const m of e.mobs) for (const pid of m.tags.keys()) e.tags.add(pid);
    if (this.time < e.startAt) {
      if (!e.warned && e.startAt - this.time <= 60) { e.warned = true; this.broadcastChat(null, `☠ La flotte maudite jette l’ancre devant ${PLACES[e.place].name} : une minute !`, 'boss'); this.pushEvent(); }
      return;
    }
    const alive = e.mobs.filter((m) => m.state !== 'dead');
    if (e.wave < 3 && (e.wave === 0 || this.time >= e.nextWave || !alive.length)) {
      e.wave++; e.nextWave = this.time + WAVE_GAP; e.endAt = e.endAt || this.time + TIMEOUT;
      this.spawnWave(e.wave === 3);
      this.broadcastChat(null, e.wave === 3 ? `☠ Le capitaine de la flotte maudite débarque devant ${PLACES[e.place].name} !` : `☠ Vague ${e.wave}/3 : les morts débarquent devant ${PLACES[e.place].name} !`, 'boss');
      this.pushEvent();
      return;
    }
    if (e.wave >= 3 && !alive.length) return this.endWorldEvent(true);
    if (this.time > e.endAt) return this.endWorldEvent(false);
    if (this.tickCount % 100 === 0) this.pushEvent();
  },
  endWorldEvent(won) {
    const e = this.wevt; if (!e) return;
    for (const m of e.mobs) if (m.state !== 'dead') { m.state = 'dead'; m.hp = 0; this.ev(m.x, m.y, ['die', m.id]); }
    const heroes = [...e.tags].map((id) => this.players.get(id)).filter(Boolean);
    if (won) {
      for (const p of heroes) {
        const gold = 60 * p.level; p.gold += gold; p.dirtyMe = true;
        this.giveXp(p, 40 * p.level);
        this.addRep(p, e.place, 60);
        this.unlock(p, 'defenseur');
        this.toast(p, `Victoire ! ${PLACES[e.place].name} vous remercie : +${gold} doublons et sa reconnaissance.`, 'quest');
      }
      this.broadcastChat(null, `⚔ La flotte maudite est repoussée devant ${PLACES[e.place].name}${heroes.length ? ` grâce à ${heroes.map((p) => p.name).join(', ')}` : ''} !`, 'boss');
    } else this.broadcastChat(null, `La flotte maudite se retire de ${PLACES[e.place].name}… pour cette fois.`, 'sys');
    this.wevt = null; this.pushEvent();
  },
};
