// Lot 5 : Le Plus Grand Braquage de Port-Lanterne, côté serveur. Tout est décidé ici :
//  - les préparatifs, chacun par plusieurs chemins (les uniformes : se faufiler, assommer, ou se battre ; le plan :
//    soudoyer, rendre service, voler ; la clé : gagner aux dés, tricher, faire les poches, provoquer) ;
//  - les gardes vivants : une ronde, un regard (un cône que leur lanterne éclaire), le soupçon qui monte, l'alerte ;
//    on peut assommer un garde par derrière sans bruit ; vu de face, on se bat ;
//  - la demeure : l'uniforme (infiltration), la bagarre du capitaine Ferrant (manipulation), ou la force — et ce choix
//    pèse sur la suite (l'estime de Silas, la récompense de Valdorne, les gardes de la poursuite) ;
//  - la trahison et son choix immédiat ; la poursuite par les toits ou les ruelles (ou par la ville) contre un Silas qui
//    court vraiment ; le combat sur La Mouche d'Or ; les trois fins, leurs récompenses et leurs conséquences ;
//  - la route secrète des Sept Courants, ouverte aux complices de Silas.
// En groupe, on se répartit les préparatifs : ce qu'un compagnon réussit compte pour tout le groupe.
import { ITEMS } from '../shared/data/items.js';
import { QUESTS, questState } from '../shared/data/quests.js';
import { BR, LAFLEUR, BRECHET, FERRANT } from '../shared/data/braquage.js';
import { moveWithCollision, canStand, SAFE } from '../shared/world.js';
import { TILE, DAY_LENGTH } from '../shared/constants.js';

const rand = (a, b) => a + Math.random() * (b - a);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0));
const FACE = [Math.PI / 2, Math.PI, 0, -Math.PI / 2]; // bas, gauche, droite, haut
const inRect = (p, R) => p.x >= R.x0 && p.x < R.x1 && p.y >= R.y0 && p.y < R.y1;
export const DISGUISE = { top: 'manteau', topCol: 'navy', pants: 'white', hat: 'morion' };
const SAVE_KEYS = ['adv', 'alarmA', 'gotU', 'method', 'warn', 'choice', 'devance', 'caught', 'favor', 'crabs', 'hasMap', 'ended', 'crateDay', 'crates', 'vol'];

export const heist = {
  heistInit() {
    const H = this.world.heist;
    this.hs = { guards: [], crabs: [], runs: new Set(), boss: null, adds: [], bars: [false, false], away: 0, locked: 0, look: { until: 0, next: this.time + 6, log: [] }, brawlUntil: 0, brawlCd: 0, matches: new Map(), venge: [] };
    for (const G of H.guards) {
      const m = this.addMob(G.mob, G.path[0].x, G.path[0].y);
      m.hg = { ...G, i: 0, sus: new Map(), wait: 0, lookI: 0, nextLook: this.time + 4, koUntil: 0, alert: false, alertUntil: 0, lastT: this.time };
      m.dir = G.dir || 0;
      if (G.alarm) { m.state = 'dead'; m.deadUntil = Infinity; m.hg.dormant = true; }
      this.hs.guards.push(m);
    }
  },
  heistLoad(d) { const h = { trust: 0 }; if (d && typeof d === 'object') for (const k of SAVE_KEYS) if (d[k] != null) h[k] = d[k]; return h; },
  heistSave(p) { const o = {}; for (const k of SAVE_KEYS) if (p.heist && p.heist[k] != null) o[k] = p.heist[k]; return o; },
  heistState(p = null) { const m = { t: 'heist', a: 'state', bars: this.hs.bars.map((b) => (b ? 1 : 0)), away: this.hs.away > this.time ? 1 : 0, locked: this.hs.locked > this.time ? 1 : 0 }; if (p) m.fav = p.heist && p.heist.favor ? 1 : 0; return m; }, // fav : le service promis à l'architecte (à soi seul)
  heistBroadcast() { const m = this.heistState(); for (const p of this.players.values()) this.send(p, m); },
  // ------------------------------------------------------------ outils
  hq(p, qid) { const st = p.quests[qid]; return st && st.s === 'active' ? st : null; },
  hGoal(p, qid, act) { const st = p.quests[qid]; if (!st) return false; if (st.s === 'done') return true; const i = QUESTS[qid].goals.findIndex((g) => g.act === act); return i >= 0 && (st.p[i] || 0) >= 1; },
  hGroup(p) { const g = p.group && this.groups.get(p.group); return g ? g.members.map((id) => this.players.get(id)).filter(Boolean) : [p]; },
  hAct(p, qid, act) { for (const q of this.hGroup(p)) if (this.hq(q, qid)) this.questAct(q, act); },
  hHas(p, item) { return this.hGroup(p).some((q) => q.room === p.room && this.countItem(q, item) > 0) || this.countItem(p, item) > 0; },
  hStart(p, qid) {
    if (!QUESTS[qid] || p.quests[qid]) return;
    p.quests[qid] = { s: 'active', p: QUESTS[qid].goals.map(() => 0) };
    p.track = [qid, ...(p.track || []).filter((x) => x !== qid && p.quests[x] && p.quests[x].s === 'active')].slice(0, 4);
    p.dirtyQ = true; this.toast(p, `Nouvelle étape : ${QUESTS[qid].name.replace('Le Plus Grand Braquage — ', '')}`, 'quest');
  },
  hFinish(p, qid) { const st = this.hq(p, qid); if (!st) return; st.p = QUESTS[qid].goals.map((g) => g.n || 1); p.dirtyQ = true; this.turnIn(p, qid, true); }, // l'étape est jouée : on la clôt
  hRun(p) { return p.heistRun || this.hGroup(p).map((q) => q.heistRun).find(Boolean) || null; },
  heistTrust(p) {
    const h = p.heist || {};
    return 1 + (h.gotU && !h.alarmA ? 1 : 0) + (h.method === 'infiltration' ? 1 : h.method === 'force' ? -1 : 0) + (h.choice === 'detruire' ? -2 : 0);
  },
  hNpcSay(id, text) { const n = this.npcPos.get(id); if (n) this.ev(n.x, n.y, ['npcsay', id, text]); },
  // ------------------------------------------------------------ messages du client
  heistMsg(p, m) {
    const a = String(m.a || ''), H = this.world.heist;
    if (p.dead || this.inCinema(p) && a !== 'choix' && a !== 'fin') return;
    switch (a) {
      case 'spot': return this.heistSpot(p, m.i | 0, m);
      case 'lafleur': return this.heistLafleur(p, String(m.c || ''));
      case 'desk': return this.heistDesk(p, String(m.s || ''), !!m.ok);
      case 'brechet': return this.heistBrechet(p, String(m.c || ''), m);
      case 'ferrant': return this.heistBrawl(p);
      case 'choix': return this.heistChoice(p, String(m.c || ''));
      case 'fin': return this.heistEnding(p, String(m.c || ''));
      case 'caisses': return this.heistCrates(p, m.n | 0);
      case 'livrer': return this.heistDeliver(p);
      case 'etat': return this.send(p, this.heistState(p));
    }
    void H;
  },
  // la proposition de Silas : acceptée dans la conversation (les souvenirs « silas_oui » / « silas_avance »)
  heistAccept(p, advance) {
    const sb = this.world.rooms.findIndex((r) => r.name === 'La Sirène Borgne');
    if (p.room !== sb || questState('br_preparatifs', p.quests, p.level) !== 'available') return;
    this.hStart(p, 'br_preparatifs');
    if (advance && !p.heist.adv) { p.heist.adv = 1; p.gold += BR.advance; p.dirtyMe = true; this.toast(p, `Silas vous avance ${BR.advance} doublons.`, 'quest'); }
  },
  // ------------------------------------------------------------ les points d'interaction du décor
  heistSpot(p, i, m) {
    const H = this.world.heist, S = H.spots[i];
    if (!S || (S.room >= 0 && p.room !== S.room) || (S.room < 0 && p.room !== -1) || Math.hypot(p.x - S.x, p.y - S.y) > (S.r || 22) + 12) return;
    if ((p.cds.hspot || 0) > this.time) return;
    p.cds.hspot = this.time + 0.5;
    const R = (k) => this.world.rooms[H.rooms[k]];
    switch (S.k) {
      case 'uniformes': {
        if (!this.hq(p, 'br_preparatifs')) return this.toast(p, 'Des uniformes de la garde, pliés. Rien qui vous serve… pour l’instant.', 'info');
        if (this.hGoal(p, 'br_preparatifs', 'br_uniformes')) return this.toast(p, 'Vous avez déjà vos uniformes.', 'info');
        this.giveOrDrop(p, 'uniforme_garde', 2); p.heist.gotU = 1;
        this.hAct(p, 'br_preparatifs', 'br_uniformes');
        return this.toast(p, p.heist.alarmA ? 'Deux uniformes ! Maintenant, filez : toute la Douane vous cherche.' : 'Deux uniformes, sans un bruit. Silas appréciera.', 'quest');
      }
      case 'trappe': if (p.heist.favor && !this.hs.crabs.some((c) => c.state !== 'dead')) this.heistCrabs(); return this.teleport(p, H.caveIn.x, H.caveIn.y, {});
      case 'echelle': return this.teleport(p, H.atelierIn.x, H.atelierIn.y, {});
      case 'bureau': return this.send(p, { t: 'heist', a: 'desk', ok: this.countItem(p, 'crochets') > 0 ? 1 : 0 });
      case 'manteau': {
        if (!(this.hs.away > this.time) || !this.hq(p, 'br_preparatifs') || this.hGoal(p, 'br_preparatifs', 'br_cle')) return;
        this.giveOrDrop(p, 'cle_comptable', 1); this.hAct(p, 'br_preparatifs', 'br_cle');
        return this.toast(p, 'Dans la poche intérieure du manteau : une clé de laiton. La clé du comptable.', 'quest');
      }
      case 'vestiaire': {
        if (!p.heist.disguise && !this.hHas(p, 'uniforme_garde')) return this.toast(p, 'Il vous faudrait un uniforme de la garde.', 'warn');
        p.heist.disguise = !p.heist.disguise; this.recalc(p);
        return this.toast(p, p.heist.disguise ? 'Vous voilà garde de Valdorne. Marchez droit, ne courez pas, ne frappez personne.' : 'Vous reprenez vos habits.', 'info');
      }
      case 'coffre': return this.heistChest(p);
      case 'fenetre': {
        if (!this.hq(p, 'br_poursuite')) return;
        this.teleport(p, H.roofStart.x, H.roofStart.y, {}); this.ev(p.x, p.y, ['emote', p.id, 'salto']);
        return;
      }
      case 'saut': {
        const lane = S.lane || [0, 1e9], y = Math.max(lane[0] + 4, Math.min(lane[1] - 4, p.y));
        this.teleport(p, S.to.x, y, {}); this.ev(p.x, p.y, ['emote', p.id, 'salto']);
        return;
      }
      case 'echelle_t': return this.teleport(p, S.to.x, S.to.y, {});
      case 'descente': return this.heistDocks(p);
      case 'passerelle': return this.heistBoard(p);
      case 'retour': return this.teleport(p, H.docks.x, H.docks.y, {});
      case 'canon': return this.heistCannon(p, S.bar);
    }
    void R; void m;
  },
  // ------------------------------------------------------------ B. l'architecte : soudoyer, rendre service, voler
  heistLafleur(p, c) {
    if (!this.nearNpc(p, 'lafleur') || !this.hq(p, 'br_preparatifs') || this.hGoal(p, 'br_preparatifs', 'br_plan')) return;
    const give = (msg) => { this.giveOrDrop(p, 'plan_demeure', 1); this.hAct(p, 'br_preparatifs', 'br_plan'); this.hNpcSay('lafleur', msg); this.toast(p, 'Vous avez le plan de la demeure.', 'quest'); };
    if (c === 'bribe') {
      const price = p.heist.caught ? BR.bribeCaught : BR.bribe;
      if (p.gold < price) return this.toast(p, `Il vous faut ${price} doublons.`, 'warn');
      p.gold -= price; p.dirtyMe = true; return give(LAFLEUR.bribe(price));
    }
    if (c === 'favor') { if (p.heist.caught) return this.hNpcSay('lafleur', LAFLEUR.caught); p.heist.favor = 1; p.heist.crabs = p.heist.crabs || 0; this.send(p, this.heistState(p)); return this.hNpcSay('lafleur', LAFLEUR.favor); }
    if (c === 'favor_done') {
      if (!p.heist.favor) return;
      const left = this.hs.crabs.filter((m) => m.state !== 'dead').length;
      if ((p.heist.crabs || 0) < 6 && left) return this.hNpcSay('lafleur', LAFLEUR.favorProgress(left));
      if ((p.heist.crabs || 0) < 6 && !left) return this.hNpcSay('lafleur', LAFLEUR.favorProgress(6 - (p.heist.crabs || 0)));
      return give(LAFLEUR.favorDone);
    }
  },
  heistCrabs() {
    const H = this.world.heist;
    for (const c of this.hs.crabs) if (c.state !== 'dead') return;
    this.hs.crabs = H.crabs.map((pt) => { const m = this.addMob('crabe_egout', pt.x, pt.y, true); m.heistCrab = 1; return m; });
  },
  // le tiroir du bureau : un crochetage, pendant que l'architecte a le dos tourné
  heistDesk(p, s, ok) {
    const H = this.world.heist, d = H.lafleur.desk;
    if (p.room !== H.rooms.atelier || Math.hypot(p.x - d.x, p.y - d.y) > 48 || !this.hq(p, 'br_preparatifs') || this.hGoal(p, 'br_preparatifs', 'br_plan')) return;
    if (s === 'start') { if (!this.countItem(p, 'crochets')) return this.toast(p, 'Il vous faut des crochets de serrurier (La Fouine en vend).', 'warn'); p.heist.deskT = this.time; return; }
    if (s !== 'end' || !p.heist.deskT) return;
    const t0 = p.heist.deskT; p.heist.deskT = 0;
    const seen = this.hs.look.log.some(([a, b]) => b >= t0 && a <= this.time) || this.hs.look.until > this.time;
    if (seen) {
      p.heist.caught = 1; this.hNpcSay('lafleur', LAFLEUR.caught);
      const door = this.world.doors.find((q) => q.room === H.rooms.atelier);
      if (door) this.teleport(p, door.rx, door.ry, { door: door.id, out: 1 });
      return this.toast(p, 'Pris la main dans le tiroir ! Lafleur vous fera payer le double, désormais.', 'warn');
    }
    if (!ok) { if (Math.random() < 0.5) this.removeItem(p, 'crochets', 1); return this.toast(p, 'Le crochet a glissé. Essayez encore, quand il ne regarde pas.', 'warn'); }
    p.heist.vol = 1; this.giveOrDrop(p, 'plan_demeure', 1); this.hAct(p, 'br_preparatifs', 'br_plan');
    this.toast(p, 'Le tiroir cède sans un bruit. Le plan de la demeure Valdorne est à vous.', 'quest');
  },
  // ------------------------------------------------------------ C. le comptable : les dés, la triche, les poches, la colère
  heistBrechet(p, c, m) {
    if (!this.nearNpc(p, 'brechet', 60) || !this.hq(p, 'br_preparatifs') || this.hGoal(p, 'br_preparatifs', 'br_cle') || this.hs.away > this.time) return;
    const h = p.heist, key = (msg) => { this.giveOrDrop(p, 'cle_comptable', 1); this.hAct(p, 'br_preparatifs', 'br_cle'); this.hs.matches.delete(p.id); this.hNpcSay('brechet', msg); this.toast(p, 'Vous avez la clé du comptable.', 'quest'); };
    if ((h.ban || 0) > this.time && c !== 'provoke') return this.hNpcSay('brechet', 'Je ne joue plus avec vous. Pas ce soir.');
    if (c === 'play') {
      if (p.gold < BR.stake) return this.toast(p, `La mise est de ${BR.stake} doublons.`, 'warn');
      p.gold -= BR.stake; p.dirtyMe = true;
      this.hs.matches.set(p.id, { me: 0, him: 0, n: 0 });
      return this.send(p, { t: 'heist', a: 'dice', me: 0, him: 0, msg: BRECHET.game });
    }
    if (c === 'roll' || c === 'cheat') {
      const M = this.hs.matches.get(p.id); if (!M) return;
      if (c === 'cheat' && !this.countItem(p, 'des_pipes')) return;
      const d6 = () => 1 + Math.floor(Math.random() * 6), loaded = () => Math.max(d6(), d6(), d6());
      const a = c === 'cheat' ? [loaded(), loaded()] : [d6(), d6()], b = [d6(), d6()];
      M.n++;
      if (c === 'cheat' && Math.random() < 0.25) { this.hs.matches.delete(p.id); h.ban = this.time + 60; this.hNpcSay('brechet', BRECHET.cheatCaught); return this.send(p, { t: 'heist', a: 'dice', a2: a, b2: b, end: 'caught', msg: BRECHET.cheatCaught }); }
      const sa = a[0] + a[1], sb = b[0] + b[1];
      if (sa > sb) M.me++; else if (sb > sa) M.him++;
      let end = null;
      if (M.me >= 2) end = 'won'; else if (M.him >= 2) end = 'lost';
      this.send(p, { t: 'heist', a: 'dice', a2: a, b2: b, me: M.me, him: M.him, end });
      if (end === 'won') { p.gold += BR.stake * 2; p.dirtyMe = true; key(BRECHET.broke); }
      if (end === 'lost') this.hs.matches.delete(p.id);
      return;
    }
    if (c === 'pocket') { if (!this.hs.matches.has(p.id)) return; h.pocketT = this.time; return; }
    if (c === 'pocket_end') {
      if (!h.pocketT || this.time - h.pocketT > 15) return;
      h.pocketT = 0;
      if (m.ok) return key('… Et de deux. À vous de lancer.');
      this.hs.matches.delete(p.id); h.ban = this.time + 60; return this.hNpcSay('brechet', BRECHET.pocketCaught);
    }
    if (c === 'provoke') {
      this.hs.away = this.time + 120; this.hs.matches.clear(); this.hNpcSay('brechet', BRECHET.provoked); this.heistBroadcast();
      return this.toast(p, 'Bréchet a quitté la table, furieux. Son manteau est resté sur la chaise…', 'quest');
    }
  },
  // ------------------------------------------------------------ la demeure : la diversion du capitaine Ferrant
  heistBrawl(p) {
    if (!this.nearNpc(p, 'ferrant', 60) || !this.hq(p, 'br_casse') || this.hs.brawlCd > this.time) return;
    this.hs.brawlUntil = this.time + 40; this.hs.brawlCd = this.time + 90;
    this.hNpcSay('ferrant', FERRANT.brawl);
    for (const g of this.hs.guards) if (g.hg.room === 'demeure' && (g.hg.post || g.hg.hall) && !g.hg.alert) g.hg.distractUntil = this.hs.brawlUntil;
    this.ev(p.x, p.y, ['shout', 0, 'Bagarre au salon !']);
    this.toast(p, 'Le salon s’embrase : les gardes de la galerie accourent. Vous avez quarante secondes.', 'quest');
  },
  // ------------------------------------------------------------ le coffre, la trahison et le choix
  heistChest(p) {
    if (!this.hq(p, 'br_casse')) return;
    if (!this.hGoal(p, 'br_casse', 'br_archives')) return;
    if (!this.hHas(p, 'cle_comptable')) return this.toast(p, 'Le coffre est fermé. Il faut la clé du comptable.', 'warn');
    if (this.hs.locked > this.time) return;
    const H = this.world.heist, arch = this.world.rooms[H.rooms.demeure];
    const who = this.hGroup(p).filter((q) => q.room === arch.id && inRect(q, H.archives) && this.hq(q, 'br_casse'));
    for (const q of who) this.questAct(q, 'br_coffre');
    this.hs.locked = this.time + 240; for (const i of H.gates.archives) this.world.block[i] = 1; this.heistBroadcast();
    const run = { ids: who.map((q) => q.id), choice: null, t0: 0, arrive: 0, devance: false, mob: null };
    for (const q of this.hGroup(p)) if (this.hq(q, 'br_casse') && !run.ids.includes(q.id)) run.ids.push(q.id); // le reste du groupe court aussi
    for (const id of run.ids) { const q = this.players.get(id); if (q) q.heistRun = run; }
    this.hs.runs.add(run);
    this.startCinema(who, 'br_trahison', { replay: 1 });
    for (const id of run.ids) { const q = this.players.get(id); if (q && !who.includes(q)) this.toast(q, 'Aux archives, Silas vient de vous trahir. Il file vers les quais : courez à La Mouche d’Or !', 'warn'); }
    this.later(28, () => { if (!run.choice) { const q = this.players.get(run.ids[0]); if (q) this.heistChoice(q, 'poursuivre'); } }); // personne n'a choisi : on court
  },
  heistChoice(p, c) {
    const run = this.hRun(p);
    if (!run || run.choice || !['poursuivre', 'carte', 'detruire'].includes(c)) return;
    const H = this.world.heist;
    run.choice = c;
    const head = c === 'poursuivre' ? 4 : c === 'carte' ? 11 : 8;
    for (const id of run.ids) {
      const q = this.players.get(id); if (!q) continue;
      q.heist.choice = c; q.heist.method = q.heist.method || 'infiltration';
      if (c === 'carte' && id === p.id) { this.giveOrDrop(q, 'carte_sept_courants', 1); q.heist.hasMap = 1; }
      this.hFinish(q, 'br_casse'); this.hStart(q, 'br_poursuite');
      if (id !== p.id) this.toast(q, `${p.name} a choisi : ${c === 'poursuivre' ? 'poursuivre Silas' : c === 'carte' ? 'récupérer la carte' : 'détruire le registre'}.`, 'info');
    }
    if (c === 'detruire') this.ev(H.registre.x, H.registre.y, ['hfx', 'feu', Math.round(H.registre.x), Math.round(H.registre.y)]);
    // Silas court : un vrai personnage, sur les toits, qui saute les ruelles ; s'il atteint La Mouche d'Or avant vous, son équipage est prêt
    run.t0 = this.time;
    const path = H.roofPath; let len = 0; for (let k = 1; k < path.length; k++) if (!path[k].jump) len += Math.hypot(path[k].x - path[k - 1].x, path[k].y - path[k - 1].y);
    run.arrive = this.time + head + len / 64 + (path.filter((q) => q.jump).length * 0.6) + 2;
    this.later(head, () => {
      const m = this.addMob('silas_fuyard', H.silasStart.x, H.silasStart.y, true);
      m.hg = { fuyard: 1, run, i: 1, wait: 0 }; m.dir = 2; run.mob = m;
      const g0 = this.hs.guards.filter((g) => g.hg.room === 'toits');
      for (const g of g0) { if (g.hg.dormant && run.ids.some((id) => { const q = this.players.get(id); return q && q.heist.method === 'force'; })) { g.hg.dormant = false; this.respawnMob(g); } }
    });
    const who = run.ids.map((id) => this.players.get(id)).filter(Boolean);
    for (const q of who) if (q.cine && q.cine.id === 'br_trahison') this.endCinema(q, 'choix'); // le choix est fait : la scène suivante prend la main
    this.startCinema(who, 'br_fuite', { replay: 1 });
  },
  // la course de Silas
  fuyardTick(m) {
    const H = this.world.heist, g = m.hg, run = g.run, path = H.roofPath;
    if (!run || g.i >= path.length) { m.moving = false; return; }
    if (g.wait > this.time) { m.moving = false; return; }
    const tgt = path[g.i];
    if (tgt.jump) { m.x = tgt.x; m.y = tgt.y; this.ev(m.x, m.y, ['emote', m.id, 'salto']); g.i++; g.wait = this.time + 0.6; return; }
    const d = this.stepMob(m, tgt.x, tgt.y, 64);
    if (d < 4) {
      g.i++;
      if (g.i >= path.length) { this.ev(m.x, m.y, ['shout', m.id, 'Larguez les amarres, j’arrive !']); m.state = 'dead'; m.deadUntil = Infinity; this.ev(m.x, m.y, ['die', m.id]); run.silasAboard = true; }
    }
    if (g.i < path.length && path[g.i] && path[g.i].jump) g.wait = this.time + 0.35;
  },
  // les quais : par les toits, les ruelles, ou la ville
  heistDocks(p) {
    const H = this.world.heist;
    this.teleport(p, H.docks.x, H.docks.y, {});
    this.heistReachDocks(p);
  },
  heistReachDocks(p) {
    if (!this.hq(p, 'br_poursuite') || this.hGoal(p, 'br_poursuite', 'br_quais')) return;
    const run = this.hRun(p);
    if (run && !run.choice) return;
    const early = run && this.time < run.arrive && !run.silasAboard;
    if (run && early) run.devance = true;
    for (const q of this.hGroup(p)) if (this.hq(q, 'br_poursuite')) { this.questAct(q, 'br_quais'); if (run && early) q.heist.devance = 1; }
    this.toast(p, early ? 'Vous êtes sur la jetée avant lui ! Son équipage n’est pas prêt.' : 'Trop tard : Silas est à bord, et son équipage l’attend.', early ? 'quest' : 'warn');
  },
  heistBoard(p) {
    const H = this.world.heist;
    if (!this.hq(p, 'br_poursuite') && !this.hq(p, 'br_silas')) return this.toast(p, 'La Mouche d’Or. Un équipage armé jusqu’aux dents monte la garde.', 'info');
    if (this.hq(p, 'br_poursuite')) {
      if (!this.hGoal(p, 'br_poursuite', 'br_quais')) this.heistReachDocks(p);
      this.questAct(p, 'br_abordage'); this.hFinish(p, 'br_poursuite'); this.hStart(p, 'br_silas');
    }
    this.teleport(p, H.deckIn.x, H.deckIn.y, {});
    const boss = this.hs.boss;
    if (!boss || boss.state === 'dead') {
      const run = this.hRun(p), devance = !!(run && run.devance) || !!p.heist.devance;
      this.heistBossSpawn(devance);
      this.later(0.3, () => { const who = [...this.players.values()].filter((q) => q.room === this.world.heist.rooms.pont && this.hq(q, 'br_silas')); this.startCinema(who, 'br_boss', { replay: 1 }); });
    }
  },
  // ------------------------------------------------------------ le combat sur La Mouche d'Or
  heistBossSpawn(devance) {
    const H = this.world.heist;
    const m = this.addMob('silas_boss', H.silasDeck.x, H.silasDeck.y);
    m.pauseUntil = this.time + 11; m.dir = 1; m.heistBoss = 1; m.devance = devance; m.lastSeen = this.time;
    this.hs.boss = m;
    if (!devance) for (const [dx, dy] of [[-24, -40], [-24, 40]]) { const a = this.addMob('homme_de_main', m.x + dx, m.y + dy, true); a.pauseUntil = m.pauseUntil; m.adds.push(a); this.hs.adds.push(a); }
  },
  heistBars(on, k = -1) {
    const H = this.world.heist;
    H.bars.forEach((g, i) => { if (k >= 0 && i !== k) return; this.hs.bars[i] = on; for (const t of g) this.world.block[t] = on ? 1 : 0; });
    this.heistBroadcast();
  },
  heistCannon(p, bar) {
    if (!this.hs.bars[bar]) return this.toast(p, 'Rien à viser pour l’instant.', 'info');
    if ((this.hs.canCd || 0) > this.time) return;
    this.hs.canCd = this.time + 2;
    const H = this.world.heist, t = H.barTiles[bar][5];
    this.ev(p.x, p.y, ['hfx', 'canon', Math.round(t[0] * TILE + 8), Math.round(t[1] * TILE + 8)]);
    this.heistBars(false, bar);
    this.toast(p, 'BOUM ! La barricade vole en éclats.', 'quest');
  },
  silasAI(m, t) {
    const H = this.world.heist, now = this.time, P = m.phase;
    const T = this.bossTargets(m, 420), solo = T.length <= 1 ? 1.35 : 1;
    const ready = (k, s) => { if (m.cd[k] == null) { m.cd[k] = now + s * 0.5; return false; } if (m.cd[k] > now) return false; m.cd[k] = now + s; return true; };
    if (P >= 1 && !m.p1) { m.p1 = 1; this.heistBars(true); this.summonAdds(m, t, 'homme_de_main', 1 + T.length, 3 + T.length, null); }
    if (P >= 2 && !m.p2) { m.p2 = 1; m.cd.flee = now + 4; }
    if (T.length > 1 && ready('swap', 6)) { const o = T.filter((q) => q.id !== m.target); if (o.length) m.target = o[Math.floor(Math.random() * o.length)].id; }
    if (P < 2 && ready('fan', 5.5 * solo)) { // l'éventail : cinq lignes de feu
      const a0 = Math.atan2(t.y - m.y, t.x - m.x);
      for (let k = -2; k <= 2; k++) { const a = a0 + k * 0.2; this.lineTele(m.x, m.y - 6, m.x + Math.cos(a) * 160, m.y - 6 + Math.sin(a) * 160, 10, 0.75, 24, m, 1); }
      m.pauseUntil = now + 0.8; this.ev(m.x, m.y, ['shout', m.id, 'En éventail !']);
    } else if (ready('lunge', (P >= 2 ? 3.6 : 7) * solo)) this.startDash(m, t, 130, 300, P >= 2 ? 36 : 30, P >= 2 ? 0.5 : 0.65);
    else if (P < 2 && ready('powder', 13 * solo)) {
      this.ev(m.x, m.y, ['powder', Math.round(m.x), Math.round(m.y - 6), 70, 3]);
      this.ev(m.x, m.y, ['shout', m.id, 'Un peu de poudre aux yeux ?']);
    }
    if (P >= 1 && ready('kegs', 6 * solo)) {
      const K = H.kegs.slice().sort(() => Math.random() - 0.5).slice(0, T.length > 2 ? 3 : 2);
      for (const k of K) { this.tele(k.x, k.y - 4, 46, 1.4, 48, m, 4); this.later(1.4, () => this.ev(k.x, k.y, ['hfx', 'boom', Math.round(k.x), Math.round(k.y)])); }
    }
    if (P >= 2 && !m.flee && !m.cut && ready('flee', 15)) { m.flee = { until: now + 10 }; this.ev(m.x, m.y, ['shout', m.id, 'La chaloupe ! Je vous laisse le navire !']); }
  },
  // la fuite vers la chaloupe : on doit l'en empêcher (le frapper interrompt)
  silasMove(m) {
    const H = this.world.heist, now = this.time;
    if (m.cut) {
      m.moving = false;
      if (m.cut.hp0 - m.hp > m.maxHp * 0.06) { m.cut = null; m.flee = null; this.ev(m.x, m.y, ['shout', m.id, 'Pas si vite ! Bon, d’accord.']); return true; }
      if (now - m.cut.t0 >= 5) { m.cut = null; m.flee = null; m.hp = Math.min(m.maxHp * 0.4, m.hp + m.maxHp * 0.12); this.ev(m.x, m.y, ['shout', m.id, 'Les amarres tiennent… Tant pis, je vous finis ici.']); this.ev(m.x, m.y, ['heal', m.id, Math.round(m.maxHp * 0.12)]); }
      return true;
    }
    if (m.flee) {
      if (now > m.flee.until) { m.flee = null; return false; }
      const d = this.stepMob(m, H.dinghy.x, H.dinghy.y, m.def.speed * 1.25);
      for (const q of this.bossTargets(m, 22)) { this.damagePlayer(q, 12, m); const a = Math.atan2(q.y - m.y, q.x - m.x); const [nx, ny] = moveWithCollision(this.world, q.x, q.y, Math.cos(a) * 26, Math.sin(a) * 26); if (Math.hypot(nx - q.x, ny - q.y) > 2) this.teleport(q, nx, ny, {}); }
      if (d < 10) { m.cut = { t0: now, hp0: m.hp }; this.ev(m.x, m.y, ['shout', m.id, 'Il ne me faut que cinq secondes…']); this.tele(m.x, m.y, 18, 5, 0, m, 5); }
      return true;
    }
    return false;
  },
  // ------------------------------------------------------------ les fins
  heistEnding(p, c) {
    if (!['garder', 'denoncer', 'complice'].includes(c) || !p.quests.br_silas || p.quests.br_silas.s !== 'done' || p.heist.ended) return;
    if (c === 'complice' && this.heistTrust(p) < BR.trustC) return this.toast(p, 'Silas n’a pas confiance en vous.', 'warn');
    const qid = c === 'garder' ? 'br_fin_garder' : c === 'denoncer' ? 'br_fin_denoncer' : 'br_fin_complice';
    if (questState(qid, p.quests, p.level) !== 'available') return;
    p.heist.ended = c;
    this.hStart(p, qid);
    if (c === 'garder' || c === 'complice') {
      this.hFinish(p, qid);
      if (c === 'complice') { p.mem.add('br_route'); this.toast(p, 'Silas vous a appris la route des Sept Courants : au large de l’ouest, une île que personne ne connaît.', 'quest'); }
    }
  },
  heistTurnIn(p, qid) { // appelé par turnIn, après les récompenses
    if (qid === 'br_preparatifs') { this.hStart(p, 'br_casse'); this.startCinema([p], 'silas_preparation', { replay: 1 }); }
    if (qid === 'br_fin_denoncer') {
      const destroyed = p.heist.choice === 'detruire', bonus = (destroyed ? 0 : 300) + (p.heist.hasMap ? 300 : 0) - (p.heist.method === 'force' ? 200 : 0);
      if (bonus) { p.gold = Math.max(0, p.gold + bonus); p.dirtyMe = true; }
      this.addRep(p, 'port', destroyed ? 150 : 300);
      this.addRep(p, 'lib', destroyed ? -100 : -200); this.addRep(p, 'rade', destroyed ? -75 : -150);
      p.mem.add('br_denonce');
      if (p.heist.hasMap) { this.removeItem(p, 'carte_sept_courants', 1); this.toast(p, 'Valdorne reprend aussi sa carte, et vous la paie.', 'info'); }
    }
    if ((qid === 'br_fin_garder' || qid === 'br_fin_complice') && p.heist.hasMap && this.countItem(p, 'carte_sept_courants') > 1) this.removeItem(p, 'carte_sept_courants', 1); // une seule carte
  },
  // ------------------------------------------------------------ la route des Sept Courants (complices)
  heistCrates(p, n) {
    if (!p.mem.has('br_route') || !this.nearNpc(p, 'silas')) return;
    const day = Math.floor(this.worldTime / DAY_LENGTH);
    if (p.heist.crateDay !== day) { p.heist.crateDay = day; p.heist.crates = 0; }
    n = Math.max(1, Math.min(n || 1, BR.crates - (p.heist.crates || 0)));
    if ((p.heist.crates || 0) >= BR.crates) return this.toast(p, 'Plus de caisses aujourd’hui. Repasse demain, associé.', 'info');
    if (p.gold < n * BR.crateBuy) return this.toast(p, `Il faut ${n * BR.crateBuy} doublons.`, 'warn');
    p.gold -= n * BR.crateBuy; p.heist.crates = (p.heist.crates || 0) + n; p.dirtyMe = true;
    this.giveOrDrop(p, 'caisse_contrebande', n);
    this.toast(p, `${n} caisse${n > 1 ? 's' : ''} de contrebande. Madame Corail en donne ${BR.crateSell} doublons pièce.`, 'quest');
  },
  heistDeliver(p) {
    if (!this.nearNpc(p, 'corail')) return;
    const n = this.countItem(p, 'caisse_contrebande');
    if (!n) return this.toast(p, 'Vous n’avez pas de caisse à livrer.', 'info');
    this.removeItem(p, 'caisse_contrebande', n); p.gold += n * BR.crateSell; p.dirtyMe = true;
    this.toast(p, `Madame Corail vous paie ${n * BR.crateSell} doublons. « Revenez quand vous voulez, les courants sont patients. »`, 'quest');
  },
  // les courants : sans la route, ils repoussent tout navire et toute barque
  heistCurrent(o, dt, who) {
    const S = this.world.heist.sept, d = Math.hypot(o.x - S.cx, o.y - S.cy);
    if (d < S.r0 || d > S.r1 || who.some((q) => q && q.mem && q.mem.has('br_route'))) return false;
    const k = (1 - (d - S.r0) / (S.r1 - S.r0)) * 140 + 40, ax = (o.x - S.cx) / d, ay = (o.y - S.cy) / d;
    if (o.vx != null) { o.vx += ax * k * dt * 3; o.vy += ay * k * dt * 3; }
    for (const q of who) if (q && (q.cds.sept || 0) < this.time) { q.cds.sept = this.time + 12; this.toast(q, 'Sept courants se croisent ici et vous repoussent. Il faut connaître la route.', 'warn'); }
    return true;
  },
  // ------------------------------------------------------------ les gardes
  heistMob(m, speed) {
    const g = m.hg;
    if (m.type === 'silas_boss') return this.silasMove(m);
    if (!g) return false;
    if (g.fuyard) { this.fuyardTick(m); return true; }
    const now = this.time, dt = Math.min(0.25, now - g.lastT); g.lastT = now;
    if (g.koUntil > now) { m.moving = false; return true; }
    if (g.koUntil) { g.koUntil = 0; this.ev(m.x, m.y, ['ko', m.id, 0]); }
    if (g.alert) {
      const t = this.players.get(m.target);
      if (!t || t.dead || t.room !== m.room || this.inCinema(t)) {
        const n = this.heistNearest(m, 300);
        if (n) { m.target = n.id; m.state = 'chase'; } else if (now > g.alertUntil) { this.heistCalm(m); return true; } else { m.moving = false; return true; }
      }
      if (m.state !== 'chase') m.state = 'chase';
      return false;
    }
    if (m.state === 'chase' || m.state === 'return') { m.state = 'idle'; m.target = 0; }
    // la diversion : on court au salon voir la bagarre, puis on revient
    if (g.distractUntil > now) { this.stepMob(m, this.world.heist.brawl.x + (m.id % 3) * 10, this.world.heist.brawl.y, speed * 0.9); return true; }
    // la ronde, ou la faction (on regarde autour de soi)
    const P = g.path, tgt = P[g.i % P.length];
    if (dist(m, tgt) > 3) { this.stepMob(m, tgt.x, tgt.y, speed * (P.length > 1 ? 0.45 : 0.6)); }
    else {
      m.moving = false;
      if (P.length > 1) { if (!g.wait) g.wait = now + 1.6; if (now > g.wait) { g.wait = 0; g.i = (g.i + 1) % P.length; } }
      else if (g.look && now > g.nextLook) { g.lookI = (g.lookI + 1) % g.look.length; m.dir = g.look[g.lookI]; g.nextLook = now + rand(2.5, 4.5); }
      else if (!g.look) m.dir = g.dir;
    }
    this.heistWatch(m, dt);
    return true;
  },
  heistNearest(m, r) { let best = null, bd = r; for (const p of this.players.values()) { if (p.dead || p.room !== m.room || this.inCinema(p)) continue; const d = dist(p, m); if (d < bd) { bd = d; best = p; } } return best; },
  heistCalm(m) { const g = m.hg; g.alert = false; m.state = 'idle'; m.target = 0; m.hp = m.maxHp; g.sus.clear(); this.ev(m.x, m.y, ['sus', m.id, 0]); },
  heistSees(m, p) {
    const d = dist(m, p);
    if (d < 18) return 2;
    if (d > 80) return 0;
    const a = Math.atan2(p.y - m.y, p.x - m.x);
    if (angDiff(a, FACE[m.dir & 3]) > 0.75) return 0;
    if (!this.lineOfSight(m.x, m.y - 9, p.x, p.y - 9)) return 0;
    return d < 40 ? 1.6 : 1;
  },
  heistWatch(m, dt) {
    const g = m.hg, H = this.world.heist;
    let top = 0;
    for (const p of this.players.values()) {
      if (p.dead || p.room !== m.room || this.inCinema(p) || p.lab) continue;
      if (g.room === 'demeure' && (p.heist.disguise || inRect(p, H.hall))) { g.sus.delete(p.id); continue; } // en uniforme, ou au salon : un invité parmi d'autres
      const k = this.heistSees(m, p);
      let s = g.sus.get(p.id) || 0;
      s = k ? s + dt * k * (g.chase ? 2.2 : 1.1) : Math.max(0, s - dt * 0.45);
      g.sus.set(p.id, s);
      top = Math.max(top, s);
      if (s >= 1) { g.sus.set(p.id, 0); this.heistSpotted(m, p); return; }
    }
    const lvl = top >= 0.35 ? 1 : 0;
    if (lvl !== (g.lvl || 0)) { g.lvl = lvl; this.ev(m.x, m.y, ['sus', m.id, lvl]); }
  },
  heistAlarm(room, p, line) {
    for (const o of this.hs.guards) if (o.hg.room === room && o.state !== 'dead' && !o.hg.koUntil) { o.hg.alert = true; o.hg.alertUntil = this.time + 25; o.hg.distractUntil = 0; o.state = 'chase'; o.target = p.id; this.ev(o.x, o.y, ['sus', o.id, 2]); }
    if (line) this.ev(p.x, p.y, ['shout', 0, line]);
  },
  heistSpotted(m, p) {
    const g = m.hg, H = this.world.heist;
    this.ev(m.x, m.y, ['sus', m.id, 2]);
    if (g.room === 'entrepot') {
      if (this.hq(p, 'br_preparatifs') && !this.hGoal(p, 'br_preparatifs', 'br_uniformes')) p.heist.alarmA = 1;
      this.heistAlarm('entrepot', p, 'Alerte ! Un voleur dans l’entrepôt !');
      return this.toast(p, 'Repéré ! Toute la Douane est sur vous.', 'warn');
    }
    if (g.room === 'demeure') {
      if (this.hs.locked > this.time && inRect(p, H.archives)) return;
      p.heist.warn = (p.heist.warn || 0) + 1;
      if (p.heist.warn >= 3) {
        if (this.hq(p, 'br_casse')) p.heist.method = 'force';
        this.heistAlarm('demeure', p, 'Aux armes ! Un intrus dans la galerie !');
        return this.toast(p, 'Cette fois, c’est l’alerte. Il va falloir passer en force.', 'warn');
      }
      this.ev(m.x, m.y, ['shout', m.id, p.heist.warn === 1 ? 'Halte ! Les invités restent au salon.' : 'Encore vous ? La prochaine fois, c’est la cellule.']);
      this.teleport(p, H.hallBack.x, H.hallBack.y, {});
      return this.toast(p, `Reconduit au salon (${p.heist.warn}/3). Un uniforme, une diversion… ou la force.`, 'warn');
    }
    g.alert = true; g.alertUntil = this.time + 20; m.state = 'chase'; m.target = p.id; // sur les toits : on vous court après
  },
  // une attaque sur un garde : par derrière et sans être vu, on l'assomme ; sinon, c'est la bagarre (et l'alerte)
  heistHit(m, p) {
    const g = m.hg;
    if (m.type === 'silas_boss') {
      if (m.phase < 2 && (m.dodgeAt || 0) < this.time && Math.random() < 0.22 && !m.dash) {
        m.dodgeAt = this.time + 2.5;
        const a = Math.atan2(m.y - p.y, m.x - p.x) + (Math.random() < 0.5 ? 1.57 : -1.57);
        const [nx, ny] = moveWithCollision(this.world, m.x, m.y, Math.cos(a) * 26, Math.sin(a) * 26, true); m.x = nx; m.y = ny;
        this.ev(m.x, m.y, ['dodge', m.id]);
        return true;
      }
      return false;
    }
    if (!g || g.fuyard) return !!(g && g.fuyard);
    if (g.koUntil > this.time) return true;
    if (!g.alert) {
      const behind = angDiff(Math.atan2(p.y - m.y, p.x - m.x), FACE[m.dir & 3]) > 1.9;
      if (behind && (g.sus.get(p.id) || 0) < 0.5 && !g.chase) {
        g.koUntil = this.time + 75; m.moving = false; this.ev(m.x, m.y, ['ko', m.id, 1]);
        this.toast(p, 'Assommé sans un bruit.', 'info');
        return true;
      }
      if (p.heist.disguise) { p.heist.disguise = false; this.recalc(p); }
      if (g.room === 'demeure' && this.hq(p, 'br_casse')) p.heist.method = 'force';
      this.heistAlarm(g.room, p, g.room === 'entrepot' ? 'Alerte ! On attaque la Douane !' : 'Aux armes !');
      if (g.room === 'entrepot' && this.hq(p, 'br_preparatifs') && !this.hGoal(p, 'br_preparatifs', 'br_uniformes')) p.heist.alarmA = 1;
    }
    return false;
  },
  heistKill(m, killer) {
    if (m.heistCrab) for (const [pid] of m.tags) { const q = this.players.get(pid); if (q && q.heist.favor && this.hq(q, 'br_preparatifs')) { q.heist.crabs = (q.heist.crabs || 0) + 1; if (q.heist.crabs === 6) this.toast(q, 'La cave est nettoyée. Retournez voir Lafleur.', 'quest'); } }
    if (m.type === 'silas_boss') {
      this.heistBars(false); this.despawnAdds(m);
      for (const a of this.hs.adds) if (a.state !== 'dead') { a.state = 'dead'; this.ev(a.x, a.y, ['die', a.id]); }
      this.hs.adds = []; this.hs.boss = null;
      for (const q of this.players.values()) if (q.room === this.world.heist.rooms.pont && this.hq(q, 'br_silas')) this.hFinish(q, 'br_silas'); // tout l'équipage d'abordage compte
      const who = [...this.players.values()].filter((q) => q.room === this.world.heist.rooms.pont && q.quests.br_silas && q.quests.br_silas.s === 'done' && !q.heist.ended);
      for (const q of who) { // Silas tombe où il a perdu ; abattu de loin, il est venu s'agenouiller à quelques pas (la scène les cadre ensemble)
        const dx = m.x - q.x, dy = m.y - q.y, d = Math.hypot(dx, dy) || 1, k = d > 56 ? 40 / d : 1;
        this.startCinema([q], 'br_conclusion', { replay: 1, opts: { c: this.heistTrust(q) >= BR.trustC ? 1 : 0, x: Math.round(q.x + dx * k), y: Math.round(q.y + dy * k) } });
      }
    }
    void killer;
  },
  // ------------------------------------------------------------ chaque demi-seconde
  heistTick() {
    const H = this.world.heist, now = this.time, L = this.hs.look;
    // l'architecte se retourne vers son bureau, de temps en temps
    if (now > L.next) {
      L.until = now + 2.6; L.next = now + rand(6.5, 10.5); L.log.push([now, L.until]); if (L.log.length > 12) L.log.shift();
      const n = this.npcPos.get('lafleur'); if (n) this.ev(n.x, n.y, ['npcdir', 'lafleur', dirOf(H.lafleur.desk.x - n.x, H.lafleur.desk.y - n.y), 2.6]);
    }
    if (this.hs.away && now > this.hs.away) { this.hs.away = 0; this.heistBroadcast(); this.hNpcSay('brechet', 'Bon. Où en étions-nous ?'); }
    if (this.hs.locked && now > this.hs.locked) { this.hs.locked = 0; for (const i of H.gates.archives) this.world.block[i] = 0; this.heistBroadcast(); }
    for (const p of this.players.values()) {
      if (p.dead) continue;
      if (p.heist.disguise && p.room !== H.rooms.demeure) { p.heist.disguise = false; this.recalc(p); }
      if (p.room === H.rooms.demeure && this.hq(p, 'br_casse')) {
        if (!this.hGoal(p, 'br_casse', 'br_entree')) {
          const who = this.hGroup(p).filter((q) => q.room === H.rooms.demeure && this.hq(q, 'br_casse') && !this.hGoal(q, 'br_casse', 'br_entree') && !this.inCinema(q));
          for (const q of who) this.questAct(q, 'br_entree');
          this.startCinema(who, 'br_reception', { replay: 1 });
        }
        if (inRect(p, H.archives) && !this.hGoal(p, 'br_casse', 'br_archives')) {
          p.heist.method = p.heist.method === 'force' ? 'force' : p.heist.disguise ? 'infiltration' : this.hs.brawlUntil > now ? 'manipulation' : (p.heist.method || 'infiltration');
          this.questAct(p, 'br_archives');
          this.toast(p, p.heist.method === 'force' ? 'Les archives, enfin. À la manière forte.' : p.heist.method === 'manipulation' ? 'Pendant que le salon se bat, vous voilà aux archives.' : 'Personne ne regarde un garde. Vous voilà aux archives.', 'quest');
        }
      }
      if (p.room === -1 && this.hq(p, 'br_poursuite') && !this.hGoal(p, 'br_poursuite', 'br_quais') && Math.hypot(p.x - H.gangway.x, p.y - H.gangway.y) < 70) this.heistReachDocks(p);
    }
    // l'entrepôt se calme quand il est vide
    for (const room of ['entrepot', 'demeure', 'toits']) {
      const rid = H.rooms[room];
      if ([...this.players.values()].some((p) => p.room === rid)) continue;
      for (const g of this.hs.guards) if (g.hg.room === room) { if (g.hg.alert) this.heistCalm(g); if (g.state === 'dead' && !g.hg.dormant && room !== 'toits') { this.respawnMob(g); g.hg.i = 0; } }
    }
    // le pont vide : Silas et son équipage s'en vont ; on pourra revenir
    const boss = this.hs.boss;
    if (boss) {
      if ([...this.players.values()].some((p) => p.room === H.rooms.pont && !p.dead)) boss.lastSeen = now;
      else if (now - boss.lastSeen > 30) { this.despawnAdds(boss); boss.state = 'dead'; boss.deadUntil = Infinity; this.ev(boss.x, boss.y, ['die', boss.id]); for (const a of this.hs.adds) a.state = 'dead'; this.hs.adds = []; this.hs.boss = null; this.heistBars(false); }
    }
    for (const run of this.hs.runs) if (run.t0 && now - run.t0 > 900) this.hs.runs.delete(run);
    this.heistVengeance(now);
  },
  // fin B : ceux de la liste de Valdorne savent qui les a vendus. Hors des zones sûres, de temps en temps, deux ou
  // trois d'entre eux vous tombent dessus (ils ne laissent rien : on se venge, on ne fait pas commerce de vengeance).
  heistVengeance(now) {
    for (const p of this.players.values()) {
      if (!p.mem || !p.mem.has('br_denonce') || p.dead || p.room !== -1 || p.ship || SAFE.has(p.zone) || this.inCinema(p)) continue;
      if (!p.heist.vengeAt) { p.heist.vengeAt = now + rand(480, 900); continue; } // la première, une dizaine de minutes après
      if (p.heist.vengeAt > now) continue;
      const spots = [];
      for (let k = 0; k < 16 && spots.length < (p.level >= 24 ? 3 : 2); k++) {
        const a = Math.random() * Math.PI * 2, x = p.x + Math.cos(a) * 120, y = p.y + Math.sin(a) * 100;
        if (canStand(this.world, x, y, true) && this.lineOfSight(p.x, p.y - 8, x, y - 8)) spots.push({ x, y });
      }
      if (spots.length < 2) { p.heist.vengeAt = now + 20; continue; } // en pleine mer ou dans un couloir : un peu plus tard
      p.heist.vengeAt = now + rand(900, 1500);
      for (const q of spots) { const m = this.addMob('vengeur_liste', q.x, q.y, true); m.state = 'chase'; m.target = p.id; m.vengeFor = p.id; m.vengeUntil = now + 150; this.hs.venge.push(m); }
      this.ev(spots[0].x, spots[0].y, ['shout', 0, 'Le voilà, le mouchard de Valdorne !']);
      this.toast(p, 'Des capitaines de la liste de Valdorne vous ont retrouvé. Ils ont la mémoire longue.', 'warn');
    }
    this.hs.venge = this.hs.venge.filter((m) => {
      if (m.state === 'dead') return false;
      const q = this.players.get(m.vengeFor);
      if (now > m.vengeUntil || !q || q.dead || q.room !== -1 || dist(q, m) > 700) { m.state = 'dead'; this.ev(m.x, m.y, ['die', m.id]); return false; } // la cible a filé : ils repartent
      return true;
    });
  },
};
