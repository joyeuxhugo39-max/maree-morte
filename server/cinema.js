// Lot 4 : les cinématiques, côté serveur. C'est TOUJOURS le serveur qui décide qu'une scène se joue :
// - en entrant dans un lieu (trigger.enter), une seule fois par personnage (mémoire « vu:<scène> », sauvegardée) ;
// - depuis une conversation (trigger.talk) : le client demande, le serveur vérifie (près du PNJ, conditions, hors combat) ;
// - depuis la logique de jeu (lot 5 : une étape de quête) : startCinema(joueurs, id, { onEnd }).
// Qui la voit : le joueur qui l'a déclenchée ; pour une scène de groupe (def.group), ses compagnons présents dans la même
// pièce à cet instant. Celui qui arrive après le début ne la voit pas (elle n'est pas marquée « vue » pour lui).
// Pendant la scène, le spectateur ne peut ni frapper ni être frappé, et les monstres l'ignorent ; la protection tombe à la fin
// (le client dit « done », y compris s'il passe la scène), au premier geste de jeu, à la déconnexion, ou au plus tard après
// def.maxDur secondes. La partie n'attend jamais une cinématique : la progression des quêtes n'en dépend pas.
import { CINEMAS } from '../shared/data/cinemas.js';

export const cinema = {
  cinemaInit() {
    this.cinemaRoom = new Map(); // scène → indice de sa pièce
    for (const [id, c] of Object.entries(CINEMAS)) if (c.room) this.cinemaRoom.set(id, this.world.rooms.findIndex((r) => r.name === c.room));
    this.cinemaRuns = new Set();
  },
  inCinema(p) { return !!(p && p.cine) && this.time < p.cine.until; },
  startCinema(players, id, opts = {}) {
    const def = CINEMAS[id];
    if (!def) return null;
    const watch = players.filter((p) => p && !p.dead && !this.inCinema(p) && this.players.has(p.id));
    if (!watch.length) return null;
    const run = { id, seed: (Math.random() * 2 ** 31) >>> 0, t0: this.time, ids: watch.map((p) => p.id), left: new Set(watch.map((p) => p.id)), onEnd: opts.onEnd || null, group: !!def.group };
    const until = this.time + (def.maxDur || 30);
    for (const p of watch) {
      if (p.recallAt) p.recallAt = 0;
      p.cine = { id, until, run };
      p.mem.add('vu:' + id);
      this.send(p, { t: 'cinema', a: 'play', id, seed: run.seed, n: watch.length, replay: opts.replay ? 1 : 0 });
    }
    this.cinemaRuns.add(run);
    this.log(`[cinéma] ${id} : ${watch.map((p) => p.name).join(', ')}`);
    return run;
  },
  endCinema(p, why = 'fin') {
    const c = p && p.cine;
    if (!c) return;
    p.cine = null;
    const run = c.run;
    run.left.delete(p.id);
    if (!run.left.size) { // tout le monde a fini (ou est parti) : la suite peut se jouer
      this.cinemaRuns.delete(run);
      if (run.onEnd) { const f = run.onEnd; run.onEnd = null; try { f(run, why); } catch (e) { this.log('[cinéma] ' + e.message); } }
    }
  },
  cinemaMsg(p, m) {
    const a = String(m.a || ''), id = String(m.id || '');
    if (a === 'done') { if (p.cine && p.cine.id === id) this.endCinema(p, m.skip ? 'passée' : 'fin'); return; }
    if (a === 'ask') return this.cinemaAsk(p, id);
  },
  // une scène demandée depuis une conversation : permise ici et maintenant ?
  cinemaAsk(p, id) {
    const def = CINEMAS[id], tr = def && def.trigger;
    if (!tr || !tr.talk || p.dead || this.inCinema(p)) return;
    if (!this.nearNpc(p, tr.talk)) return;
    if ((tr.mem && !p.mem.has(tr.mem)) || (tr.lvl && p.level < tr.lvl)) return;
    if (this.time - (p.lastHurt || -99) < 5) return this.toast(p, 'Pas maintenant : vous êtes en plein combat.', 'warn');
    this.startCinema([p], id, { replay: p.mem.has('vu:' + id) });
  },
  // en entrant dans une pièce : une scène de ce lieu, pas encore vue ?
  cinemaOnEnter(p, room) {
    if (this.inCinema(p)) return;
    for (const [id, def] of Object.entries(CINEMAS)) {
      const tr = def.trigger;
      if (!tr || !tr.enter || this.cinemaRoom.get(id) !== room || p.mem.has('vu:' + id)) continue;
      if ((tr.lvl && p.level < tr.lvl) || (tr.mem && !p.mem.has(tr.mem))) continue;
      let who = [p];
      if (def.group && p.group) {
        const g = this.groups.get(p.group);
        if ([...this.cinemaRuns].some((r) => r.id === id && g && g.members.some((m) => r.left.has(m)))) return; // le groupe la regarde déjà : on arrive trop tard
        if (g) who = g.members.map((m) => this.players.get(m)).filter((q) => q && q.room === room && !q.mem.has('vu:' + id));
      }
      this.startCinema(who, id);
      return;
    }
  },
  cinemaTick() {
    for (const p of this.players.values()) if (p.cine && this.time >= p.cine.until) this.endCinema(p, 'durée');
  },
};
