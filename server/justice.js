// 1.0 : la justice des Sept Mers — protection des nouveaux pirates et des vaincus, infamie, primes,
// honneur et classement, historique des combats, pertes limitées, arrestations et Geôle de Port-Lanterne.
// Ces méthodes sont ajoutées au prototype de Game (voir la fin de game.js) : `this` est la partie.
import { SAFE, ZONES, canStand } from '../shared/world.js';
import { TILE } from '../shared/constants.js';

export const PVP_MIN_LEVEL = 10; // en dessous, le pavillon blanc protège (et empêche d'attaquer)
export const LEVEL_GAP = 10; // on ne s'en prend pas à plus faible que soi de dix niveaux (sauf un forban recherché)
export const SHIELD_AFTER_DEATH = 120; // pavillon blanc après une mort en duel : pas d'acharnement
export const WANTED_AT = 3; // infamie à partir de laquelle on est recherché
const INFAMY_DECAY = 1 / 900; // un point d'infamie s'efface par quart d'heure de bonne conduite
const ARREST_AFTER = 10; // secondes en ville avant que la garde n'arrête un forban recherché
const PROVOKED = 120; // la victime avait frappé la première il y a moins de deux minutes : légitime défense

const rnd = (a, b) => a + Math.random() * (b - a);

export const justice = {
  justiceInit() {
    this.ladder = {}; this.ladderDirty = false; this.ladderSavedAt = 0;
    if (this.storage && this.storage.loadMeta) Promise.resolve(this.storage.loadMeta('ladder')).then((l) => { if (l && typeof l === 'object') this.ladder = l; }).catch(() => {});
  },
  justiceLoad(p, d) {
    p.infamy = d && +d.inf > 0 ? Math.min(20, +d.inf) : 0;
    p.jail = d && d.jail > 0 ? Math.min(900, d.jail | 0) : 0;
    p.honor = d && d.hon > 0 ? d.hon | 0 : 0;
    p.pvpHist = d && Array.isArray(d.pvph) ? d.pvph.slice(-20) : [];
    p.glory = d ? Math.max(0, Math.min(50, d.glory | 0)) : 0;
    p.gxp = d ? Math.max(0, d.gxp | 0) : 0;
    p.aggro = new Map(); p.shieldUntil = 0; p.arrestT = 0;
  },
  justiceSave(p) { return { inf: +(p.infamy || 0).toFixed(3), jail: p.jail | 0, hon: p.honor | 0, pvph: p.pvpHist || [], glory: p.glory | 0, gxp: p.gxp | 0 }; },
  isWanted(p) { return (p.infamy || 0) >= WANTED_AT; },
  isProtected(p) { return p.level < PVP_MIN_LEVEL || (p.shieldUntil || 0) > this.time; },
  jailRoomId() { return this.world.jail; },
  justiceMe(p) {
    return {
      inf: +(p.infamy || 0).toFixed(1), wd: this.isWanted(p) ? 1 : 0, hon: p.honor | 0, jail: p.jail | 0, bail: this.bailOf(p),
      prot: p.level < PVP_MIN_LEVEL ? -1 : Math.max(0, Math.ceil((p.shieldUntil || 0) - this.time)), arrest: p.arrestT || 0,
      glory: p.glory | 0, gxp: p.gxp | 0,
    };
  },
  // peut-on se battre ? (en plus des zones : canPvp dans game.js)
  pvpAllowed(a, b) {
    if (a.jail > 0 || b.jail > 0) return false;
    if (a.group && a.group === b.group) return false; // pas de tirs amis
    if (a.crew && a.crew === b.crew) return false;
    if (this.isProtected(a) || this.isProtected(b)) return false;
    if (Math.abs(a.level - b.level) > LEVEL_GAP && !this.isWanted(b)) return false;
    return true;
  },
  // qui a frappé le premier ? on le retient deux minutes
  onPvpHit(victim, src) {
    const first = (victim.aggro.get(src.key) || -1e9) < this.time - PROVOKED; // la victime ne l'avait pas frappé
    if (first) src.aggro.set(victim.key, this.time);
  },
  // pertes limitées : 10 % de l'or plafonnés selon le niveau ; rien si le même pirate s'acharne ; un forban recherché paie sa prime
  pvpLoss(p, pk) {
    if (this.isWanted(p)) return Math.floor(p.gold * 0.25);
    if (this.time - (pk.pvpLog.get(p.key) || -1e9) < 180) return 0;
    return Math.min(Math.floor(p.gold * 0.1), 40 * p.level);
  },
  onPvpKill(p, pk, lost) {
    const wanted = this.isWanted(p), provoked = (p.aggro.get(pk.key) || -1e9) > this.time - PROVOKED;
    const where = p.room >= 0 ? this.world.rooms[p.room].name : ZONES[p.zone] ? ZONES[p.zone].name : '';
    let how;
    if (wanted) { how = 'prime'; pk.honor += 20 + 5 * Math.floor(p.infamy); this.unlock(pk, 'chasseur'); this.broadcastChat(null, `⚖ ${pk.name} a abattu le forban recherché ${p.name}${lost ? ` et touche sa prime : ${lost} doublons` : ''} !`, 'pvp'); }
    else if (provoked) { how = 'defense'; pk.honor += 8; }
    else {
      how = 'meurtre';
      const bully = p.level < pk.level - 5;
      const before = this.isWanted(pk);
      pk.infamy = Math.min(20, (pk.infamy || 0) + (bully ? 2 : 1));
      pk.honor = Math.max(0, pk.honor - 10);
      if (!before && this.isWanted(pk)) { pk.lookVer++; this.toast(pk, `Vous êtes RECHERCHÉ : votre tête est mise à prix. En ville, la garde vous arrêtera. Toute mort vous mène à la Geôle.`, 'warn'); this.broadcastChat(null, `⚖ La Capitainerie met à prix la tête de ${pk.name}.`, 'pvp'); }
      else this.toast(pk, `Infamie ${Math.floor(pk.infamy)}/${WANTED_AT} : ${p.name} ne vous avait rien fait.`, 'warn');
    }
    const at = Date.now();
    pk.pvpHist.push({ at, k: 'tue', who: p.name, lvl: p.level, where, how }); pk.pvpHist = pk.pvpHist.slice(-20);
    p.pvpHist.push({ at, k: 'mort', who: pk.name, lvl: pk.level, where, how, lost }); p.pvpHist = p.pvpHist.slice(-20);
    p.shieldUntil = 0; p.shieldNext = true; // pavillon blanc au retour
    this.ladderAdd(pk, 1, 0); this.ladderAdd(p, 0, 1);
    pk.dirtyMe = true; p.dirtyMe = true; pk.dirtyHon = true; p.dirtyHon = true;
  },
  ladderAdd(p, k, d) {
    const L = this.ladder[p.key] || (this.ladder[p.key] = { n: p.name, h: 0, k: 0, d: 0 });
    L.n = p.name; L.h = p.honor | 0; L.k += k; L.d += d; this.ladderDirty = true;
  },
  ladderTop() { return Object.values(this.ladder).sort((a, b) => b.h - a.h || b.k - a.k).slice(0, 20).map((x) => [x.n, x.h, x.k, x.d]); },
  // la mort d'un forban recherché, ou d'un cambrioleur pris sur le fait, le mène à la Geôle
  onDeathJustice(p) {
    const thief = this.time < (p.thiefUntil || 0);
    if (this.isWanted(p) || thief) { p.jail = Math.max(p.jail | 0, this.sentenceOf(p, thief)); p.thiefUntil = 0; }
  },
  sentenceOf(p, thief) { return Math.round(Math.min(600, Math.max(thief ? 90 : 60, 60 * Math.floor(p.infamy || 0)))); },
  bailOf(p) { return p.jail > 0 ? Math.round(p.jail * (1 + p.level / 10)) : 0; },
  jailSpot() {
    const r = this.world.rooms[this.jailRoomId()];
    for (let k = 0; k < 12; k++) {
      const c = Math.floor(Math.random() * 3), x = (r.x0 + 1 + c * 5 + 1) * TILE + rnd(4, 20), y = (r.y0 + 1) * TILE + rnd(4, 18);
      if (canStand(this.world, x, y, false)) return [x, y];
    }
    return [(r.x0 + (r.w >> 1)) * TILE + 8, (r.y0 + (r.h >> 1)) * TILE + 8];
  },
  imprison(p, secs, why) {
    if (secs) p.jail = Math.max(p.jail | 0, Math.round(secs));
    if (p.riding) this.dismount(p);
    if (p.boat) { p.boat = null; p.lookVer++; }
    const tr = this.trades && this.trades.get(p.id); if (tr) this.tradeCancel(tr, `${p.name} a été arrêté : échange annulé.`);
    p.arrestT = 0; p.recallAt = 0;
    const [x, y] = this.jailSpot();
    this.teleport(p, x, y, { travel: 'prison' });
    this.toast(p, `${why || 'Vous voilà à la Geôle de Port-Lanterne.'} Peine : ${p.jail} s — ou la caution au gardien (${this.bailOf(p)} doublons).`, 'warn');
    this.audit && this.audit('geole', { who: p.key, secs: p.jail, inf: p.infamy });
    p.lookVer++; p.dirtyMe = true;
  },
  release(p, paid) {
    p.jail = 0; p.infamy = 0; p.arrestT = 0; p.lookVer++; p.dirtyMe = true;
    const d = this.world.doors.find((q) => q.jail);
    this.teleport(p, d ? d.rx : this.world.spawnPoint.x, d ? d.ry + 6 : this.world.spawnPoint.y, { travel: 'release' });
    this.unlock(p, 'potence');
    this.toast(p, paid ? `Caution payée (${paid} doublons). Vous êtes libre, l’ardoise est effacée.` : 'Peine purgée : vous êtes libre, l’ardoise est effacée.', 'quest');
  },
  bail(p) {
    if (!(p.jail > 0) || p.room !== this.jailRoomId()) return;
    const cost = this.bailOf(p);
    if (p.gold < cost) return this.toast(p, `La caution est de ${cost} doublons. Vous n’avez pas assez : il faudra attendre.`, 'warn');
    p.gold -= cost; this.release(p, cost);
  },
  // pas d'évasion : la porte, la conque, le passeur, la mort ramènent au cachot
  jailBlocks(p) { if (p.jail > 0) { this.toast(p, `Vous êtes en Geôle : encore ${p.jail} s, ou payez la caution au gardien.`, 'warn'); return true; } return false; },
  justiceLogin(p) { if (p.jail > 0 && p.room !== this.jailRoomId()) this.imprison(p, 0, 'Vous reprenez votre peine à la Geôle.'); },
  // chaque seconde, pour chaque pirate
  justiceTick(p) {
    if (p.dead) return;
    if (p.jail > 0) {
      if (p.room !== this.jailRoomId()) return this.imprison(p, 0);
      p.jail--; p.dirtyMe = true;
      if (p.jail <= 0) this.release(p, 0);
      return;
    }
    if (p.shieldNext) { p.shieldNext = false; } // posé par respawn()
    if (p.shieldUntil && this.time >= p.shieldUntil) { p.shieldUntil = 0; p.lookVer++; p.dirtyMe = true; this.toast(p, 'Pavillon blanc amené : vous pouvez de nouveau être attaqué.', 'info'); }
    if (p.infamy > 0) {
      const was = this.isWanted(p);
      p.infamy = Math.max(0, p.infamy - INFAMY_DECAY);
      if (was && !this.isWanted(p)) { p.lookVer++; p.dirtyMe = true; this.toast(p, 'On vous a oublié : vous n’êtes plus recherché.', 'quest'); }
    }
    if (this.isWanted(p) && SAFE.has(p.zone) && p.room < 0) {
      p.arrestT = (p.arrestT || 0) + 1; p.dirtyMe = true;
      if (p.arrestT === 1) this.toast(p, `La garde vous a reconnu ! Quittez la ville avant ${ARREST_AFTER} secondes, ou c’est la Geôle.`, 'warn');
      if (p.arrestT >= ARREST_AFTER) { this.imprison(p, this.sentenceOf(p, false), 'La garde vous a arrêté.'); this.broadcastChat(null, `⛓ La garde a arrêté ${p.name}, forban recherché.`, 'pvp'); }
    } else if (p.arrestT) { p.arrestT = 0; p.dirtyMe = true; }
    if (p.dirtyHon) { p.dirtyHon = false; this.send(p, { t: 'hon', hist: p.pvpHist }); }
  },
  justiceGlobalTick() {
    if (this.ladderDirty && this.time - this.ladderSavedAt > 20 && this.storage.saveMeta) { this.ladderDirty = false; this.ladderSavedAt = this.time; Promise.resolve(this.storage.saveMeta('ladder', this.ladder)).catch(() => {}); }
  },
};
