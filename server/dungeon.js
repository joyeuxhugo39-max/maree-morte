// 1.0 : le Bastion Englouti, un donjon pour plusieurs pirates — trois salles fermées par des grilles.
// Chaque grille s'ouvre quand deux leviers éloignés sont tirés ensemble, par deux pirates différents.
// La deuxième salle, l'Écluse, se remplit d'eau dès qu'on y entre : il faut ouvrir la grille suivante
// avant qu'elle ne soit pleine, sinon le courant rejette tout le monde dehors. Au fond, l'Amiral Englouti.
// Vide depuis une minute et demie, le Bastion se referme et se repeuple.
const PAIR_WINDOW = 2.5, FILL_TIME = 75, EMPTY_RESET = 90;

export const dungeonLogic = {
  dungeonInit() {
    const D = this.world.dungeon;
    this.dng = { open: D.gates.map(() => false), pulls: {}, water: 0, filling: false, emptySince: this.time, flushes: 0 };
  },
  inDungeon(p) { return p && p.room === this.world.dungeon.room; },
  chamberOf(p) { const D = this.world.dungeon; for (let k = 0; k < D.chambers.length; k++) if (p.x >= D.chambers[k][0] && p.x < D.chambers[k][1] + 16) return k; return -1; },
  dngState() { return { t: 'dng', open: this.dng.open.map((o) => (o ? 1 : 0)), water: +this.dng.water.toFixed(3), pulls: Object.fromEntries(Object.entries(this.dng.pulls).filter(([, v]) => this.time - v.t < PAIR_WINDOW).map(([k, v]) => [k, +(PAIR_WINDOW - (this.time - v.t)).toFixed(1)])) }; },
  pushDng(only) { const m = this.dngState(); if (only) return this.send(only, m); for (const q of this.players.values()) if (this.inDungeon(q)) this.send(q, m); },
  setGate(k, open) {
    const D = this.world.dungeon;
    this.dng.open[k] = open;
    for (const i of D.gates[k]) this.world.block[i] = open ? 0 : 1;
  },
  pullLever(p, i) {
    const D = this.world.dungeon, L = D.levers[i | 0];
    if (!L || !this.inDungeon(p) || p.dead || Math.hypot(p.x - L.x, p.y - L.y) > 34) return;
    if (this.dng.open[L.gate]) return this.toast(p, 'Cette grille est déjà ouverte.', 'info');
    this.dng.pulls[i] = { t: this.time, pid: p.id };
    this.ev(L.x, L.y, ['fx', 'lever', L.x, L.y]);
    const other = this.dng.pulls[L.pair];
    if (other && this.time - other.t <= PAIR_WINDOW && other.pid !== p.id) {
      this.setGate(L.gate, true);
      delete this.dng.pulls[i]; delete this.dng.pulls[L.pair];
      if (L.gate === 1) { this.dng.filling = false; this.dng.water = 0; } // la deuxième grille vide aussi l'Écluse
      for (const q of this.players.values()) if (this.inDungeon(q)) this.toast(q, L.gate === 0 ? 'Clang ! La première grille se lève.' : 'La grille de l’Écluse se lève… et l’eau s’écoule ! L’Amiral vous attend.', 'quest');
      this.ev(L.x, L.y, ['shout', 0, 'Clang !']);
    } else this.toast(p, other && other.pid === p.id ? 'Il faut deux pirates : un à chaque levier.' : 'Le levier cède à moitié… il faut tirer l’autre levier en même temps !', 'info');
    this.pushDng();
  },
  dungeonTick() {
    const D = this.world.dungeon, inside = [...this.players.values()].filter((q) => this.inDungeon(q) && !q.dead);
    if (!inside.length) {
      if (this.time - this.dng.emptySince > EMPTY_RESET && (this.dng.open.some(Boolean) || this.dng.water > 0)) this.dungeonReset();
      return;
    }
    this.dng.emptySince = this.time;
    // l'Écluse se remplit dès qu'un pirate y entre, tant que sa grille de sortie est fermée
    if (this.dng.open[0] && !this.dng.open[1]) {
      if (!this.dng.filling && inside.some((q) => this.chamberOf(q) === 1)) {
        this.dng.filling = true;
        for (const q of inside) this.toast(q, 'L’Écluse se remplit ! Ouvrez la grille suivante avant d’être noyés : les deux leviers, ensemble !', 'warn');
      }
      if (this.dng.filling) {
        this.dng.water = Math.min(1, this.dng.water + 1 / (FILL_TIME * 4));
        if (this.dng.water > 0.6) for (const q of inside) if (this.chamberOf(q) === 1) this.damagePlayer(q, q.stats.maxHp * 0.012 * (this.dng.water - 0.5) * 4, null, false, 'w'); // on boit la tasse
        if (this.dng.water >= 1) return this.dungeonFlush();
      }
    }
    if (this.tickCount % 20 === 0) this.pushDng();
  },
  // l'Écluse est pleine : le courant rejette tout le monde dehors, et le Bastion se referme
  dungeonFlush() {
    const D = this.world.dungeon, d = this.world.doors[D.door];
    for (const q of this.players.values()) if (this.inDungeon(q)) { this.teleport(q, d.rx, d.ry + 4, { door: d.id, out: 1 }); this.toast(q, 'Le courant vous emporte hors du Bastion ! Il faudra recommencer, et ouvrir la grille plus vite.', 'warn'); }
    this.dng.flushes++;
    this.dungeonReset();
  },
  dungeonReset() {
    for (let k = 0; k < this.dng.open.length; k++) this.setGate(k, false);
    this.dng.water = 0; this.dng.filling = false; this.dng.pulls = {};
    this.pushDng();
  },
};
