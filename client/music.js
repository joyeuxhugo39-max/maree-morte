// Musique générative. Chaque morceau est composé à la volée : tonalité, grille d'accords,
// mélodie par motifs (question, réponse, reprise, cadence), instruments et arrangement.
// On n'entend donc jamais deux fois le même, et en exploration le silence revient
// entre deux morceaux : la mer et le vent font le reste.
import { mulberry32 } from '../shared/rng.js';

const MODES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10] };
// grilles de 8 mesures, en degrés de la gamme (0 = tonique, 4 = dominante…)
const PROG = {
  minA: [[0, 0, 5, 6, 0, 0, 4, 0], [0, 6, 5, 6, 0, 6, 4, 0], [0, 3, 6, 2, 5, 3, 4, 0], [0, 5, 2, 6, 0, 5, 4, 0], [0, 0, 3, 3, 6, 6, 4, 0], [0, 6, 0, 4, 0, 6, 4, 0]],
  minB: [[5, 6, 0, 0, 5, 6, 4, 4], [2, 6, 0, 4, 2, 6, 4, 4], [3, 0, 3, 0, 5, 6, 4, 4], [5, 2, 6, 0, 3, 3, 4, 4]],
  majA: [[0, 0, 3, 0, 0, 3, 4, 0], [0, 4, 5, 3, 0, 3, 4, 0], [0, 3, 0, 4, 0, 3, 4, 0], [0, 5, 3, 4, 0, 5, 4, 0]],
  majB: [[3, 0, 3, 4, 3, 0, 4, 4], [5, 3, 0, 4, 5, 3, 4, 4], [3, 3, 0, 0, 1, 1, 4, 4]],
};
const pick = (a, rnd) => a[Math.floor(rnd() * a.length)];
const mod7 = (d) => ((d % 7) + 7) % 7;
const mel = (list) => { const steps = []; let t = 0; for (const [n, l] of list) { if (n) steps.push({ s: t, d: l, midi: n }); t += l; } return steps; };

// ---- thèmes signés (écrits à la main, en ré mineur) : ils reviennent de temps en temps, jamais en boucle
const SIG = {
  sea: { meter: 6, root: 62, chords: [[38, 'm'], [38, 'm'], [34, 'M'], [36, 'M'], [38, 'm'], [38, 'm'], [31, 'm'], [33, 'M'], [29, 'M'], [36, 'M'], [38, 'm'], [34, 'M'], [31, 'm'], [33, 'M'], [38, 'm'], [38, 'm']],
    mel: mel([[69, 2], [74, 1], [77, 2], [76, 1], [74, 2], [69, 1], [65, 3], [70, 2], [74, 1], [77, 2], [74, 1], [76, 2], [72, 1], [67, 3],
      [69, 2], [74, 1], [77, 2], [79, 1], [81, 3], [77, 2], [74, 1], [79, 2], [77, 1], [74, 2], [70, 1], [69, 2], [73, 1], [76, 3],
      [77, 2], [72, 1], [69, 2], [72, 1], [76, 2], [74, 1], [72, 2], [67, 1], [65, 1], [69, 1], [74, 1], [77, 2], [76, 1], [74, 3], [70, 2], [74, 1],
      [67, 1], [70, 1], [74, 1], [79, 2], [77, 1], [76, 2], [73, 1], [69, 2], [76, 1], [74, 2], [77, 1], [76, 2], [73, 1], [74, 6]]) },
  naval: { meter: 6, root: 62, chords: [[38, 'm'], [38, 'm'], [36, 'M'], [36, 'M'], [34, 'M'], [34, 'M'], [33, 'M'], [33, 'M'], [38, 'm'], [41, 'M'], [36, 'M'], [31, 'm'], [34, 'M'], [33, 'M'], [38, 'm'], [38, 'm']],
    mel: mel([[74, 3], [77, 3], [81, 2], [79, 1], [77, 2], [76, 1], [76, 3], [79, 3], [84, 2], [82, 1], [79, 2], [76, 1],
      [74, 1], [77, 1], [82, 1], [81, 3], [79, 2], [77, 1], [74, 3], [73, 1], [76, 1], [81, 1], [79, 2], [76, 1], [69, 3], [73, 1], [76, 1], [81, 1],
      [74, 2], [74, 1], [77, 2], [81, 1], [84, 3], [81, 2], [77, 1], [79, 2], [76, 1], [72, 2], [76, 1], [79, 1], [82, 1], [86, 1], [82, 2], [79, 1],
      [77, 2], [74, 1], [70, 2], [74, 1], [76, 2], [73, 1], [69, 1], [73, 1], [76, 1], [74, 1], [69, 1], [74, 1], [77, 1], [81, 1], [86, 1], [86, 6]]) },
  epic: { meter: 16, root: 64, chords: [[40, 'm'], [40, 'm'], [36, 'M'], [38, 'M'], [40, 'm'], [43, 'M'], [45, 'm'], [47, 'M']],
    mel: mel([[76, 8], [79, 4], [78, 4], [76, 4], [71, 4], [76, 8], [79, 8], [76, 4], [72, 4], [74, 4], [78, 4], [81, 8],
      [83, 8], [81, 4], [79, 4], [79, 6], [81, 2], [83, 8], [84, 4], [83, 4], [81, 4], [76, 4], [78, 4], [75, 4], [71, 8]]) },
  day: { meter: 6, root: 62, chords: [[38, 'm'], [36, 'M'], [38, 'm'], [36, 'M'], [41, 'M'], [36, 'M'], [38, 'm'], [45, 'm']],
    mel: mel([[62, 2], [65, 1], [69, 2], [69, 1], [67, 2], [65, 1], [64, 2], [60, 1], [62, 2], [65, 1], [69, 2], [74, 1], [72, 2], [69, 1], [67, 3],
      [65, 2], [67, 1], [69, 2], [65, 1], [64, 2], [67, 1], [72, 2], [64, 1], [62, 2], [64, 1], [65, 1], [64, 1], [62, 1], [62, 3], [57, 3]]) },
};

// lot 4 : le leitmotiv de Silas Virevent — une petite valse de filou en ré mineur (dorien : le si bécarre sur sol majeur),
// qui revient sous trois visages : élégant (sa table), effréné (la poursuite), en majeur quand on devient complices
SIG.silas = { meter: 6, root: 62, chords: [[38, 'm'], [43, 'M'], [38, 'm'], [36, 'M'], [34, 'M'], [33, 'M'], [38, 'm'], [38, 'm']],
  mel: mel([[74, 1], [77, 1], [76, 1], [74, 2], [69, 1], [71, 1], [74, 1], [79, 2], [77, 1], [76, 1], [77, 1], [76, 1], [74, 1], [73, 1], [74, 2],
    [72, 2], [76, 1], [79, 2], [76, 1], [74, 1], [77, 1], [82, 2], [81, 1], [79, 1], [81, 2], [76, 1], [73, 2], [69, 1], [74, 1], [77, 1], [81, 1], [79, 1], [77, 1], [76, 1], [74, 4], [0, 2]]) };
SIG.silasMaj = { meter: 6, root: 62, mode: 'major', chords: [[38, 'M'], [43, 'M'], [38, 'M'], [33, 'M'], [35, 'm'], [33, 'M'], [38, 'M'], [38, 'M']],
  mel: mel([[74, 1], [78, 1], [76, 1], [74, 2], [69, 1], [71, 1], [74, 1], [79, 2], [78, 1], [76, 1], [78, 1], [76, 1], [74, 1], [73, 1], [74, 2],
    [73, 2], [76, 1], [81, 2], [76, 1], [74, 1], [78, 1], [83, 2], [81, 1], [78, 1], [81, 2], [76, 1], [73, 2], [69, 1], [74, 1], [78, 1], [81, 1], [79, 1], [78, 1], [76, 1], [74, 4], [0, 2]]) };
SIG.silasWar = { meter: 16, root: 62, chords: [[38, 'm'], [43, 'M'], [38, 'm'], [36, 'M'], [34, 'M'], [33, 'M'], [38, 'm'], [38, 'm']], // le même motif, en quatre temps, pour le combat sur La Mouche d'Or
  mel: mel([[74, 2], [77, 2], [76, 2], [74, 6], [69, 4], [71, 2], [74, 2], [79, 6], [77, 2], [76, 4], [77, 2], [76, 2], [74, 2], [73, 2], [74, 8],
    [72, 6], [76, 2], [79, 6], [76, 2], [74, 2], [77, 2], [82, 6], [81, 2], [79, 4], [81, 6], [76, 2], [73, 6], [69, 2], [74, 2], [77, 2], [81, 2], [79, 2], [77, 4], [76, 4], [74, 12], [0, 4]]) };

// lot 6 : la Nuit des Mille Voiles — quatre thèmes écrits à la main, chacun en deux parties (S, puis T), entre lesquelles
// le compositeur glisse des sections nouvelles à chaque fois : on reconnaît l'air, on ne l'entend jamais deux fois pareil.
//  - « Port-Lanterne en fête » : une gigue en ré majeur, violon et accordéon, guitare et percussions ;
//  - « Les épreuves » : un reel rapide en la mixolydien, pour la compétition ;
//  - « Mille Voiles » : l'hymne de la course, large et cuivré, en ré majeur, une mélodie qu'on fredonne en sortant ;
//  - « La fête ne finit jamais » : une valse douce en fa majeur, pour le spectacle et les nuits sur la plage.
SIG.fete = { meter: 6, root: 62, mode: 'major', chords: [[38, 'M'], [43, 'M'], [38, 'M'], [45, 'M'], [38, 'M'], [43, 'M'], [45, 'M'], [38, 'M']],
  mel: mel([[69, 1], [74, 1], [78, 1], [81, 2], [78, 1], [79, 1], [78, 1], [76, 1], [74, 2], [71, 1], [69, 1], [74, 1], [78, 1], [81, 1], [83, 1], [81, 1], [79, 2], [76, 1], [76, 3],
    [78, 1], [79, 1], [81, 1], [83, 2], [81, 1], [79, 1], [78, 1], [76, 1], [78, 2], [74, 1], [76, 1], [78, 1], [79, 1], [81, 1], [79, 1], [76, 1], [74, 3], [74, 2], [0, 1]]) };
SIG.fete2 = { meter: 6, root: 62, mode: 'major', chords: [[38, 'M'], [43, 'M'], [38, 'M'], [40, 'm'], [38, 'M'], [43, 'M'], [45, 'M'], [38, 'M']],
  mel: mel([[86, 2], [85, 1], [83, 1], [81, 2], [83, 1], [81, 1], [79, 1], [78, 2], [76, 1], [78, 1], [81, 1], [86, 1], [85, 2], [81, 1], [83, 3], [81, 2], [0, 1],
    [86, 2], [85, 1], [83, 1], [81, 1], [79, 1], [78, 1], [79, 1], [81, 1], [83, 2], [79, 1], [81, 1], [78, 1], [76, 1], [79, 1], [78, 1], [76, 1], [74, 4], [0, 2]]) };
SIG.epreuves = { meter: 16, root: 69, mode: 'mixo', chords: [[45, 'M'], [43, 'M'], [45, 'M'], [43, 'M'], [45, 'M'], [43, 'M'], [38, 'M'], [45, 'M']],
  mel: mel([[81, 2], [76, 2], [73, 2], [76, 2], [81, 2], [83, 2], [85, 2], [81, 2], [79, 2], [76, 2], [74, 2], [76, 2], [79, 4], [83, 2], [79, 2],
    [81, 2], [76, 2], [73, 2], [76, 2], [81, 2], [85, 2], [88, 2], [85, 2], [86, 2], [83, 2], [79, 2], [83, 2], [81, 6], [0, 2],
    [88, 2], [85, 2], [81, 2], [85, 2], [86, 2], [83, 2], [79, 2], [83, 2], [85, 2], [81, 2], [76, 2], [81, 2], [83, 2], [79, 2], [74, 2], [79, 2],
    [81, 2], [83, 2], [85, 2], [86, 2], [88, 2], [86, 2], [85, 2], [83, 2], [81, 6], [76, 2], [81, 4], [0, 4]]) };
SIG.epreuves2 = { meter: 16, root: 69, mode: 'mixo', chords: [[38, 'M'], [45, 'M'], [43, 'M'], [45, 'M'], [38, 'M'], [45, 'M'], [43, 'M'], [45, 'M']],
  mel: mel([[86, 4], [85, 2], [83, 2], [81, 4], [78, 4], [81, 2], [83, 2], [85, 4], [88, 8], [79, 4], [81, 2], [83, 2], [86, 4], [83, 4], [85, 6], [83, 2], [81, 8],
    [86, 2], [88, 2], [86, 2], [85, 2], [83, 2], [81, 2], [78, 2], [81, 2], [85, 2], [83, 2], [81, 2], [79, 2], [76, 4], [79, 4], [83, 2], [81, 2], [79, 2], [78, 2], [79, 4], [83, 4], [81, 12], [0, 4]]) };
SIG.mille = { meter: 16, root: 62, mode: 'major', chords: [[38, 'M'], [45, 'M'], [43, 'M'], [38, 'M'], [47, 'm'], [40, 'm'], [45, 'M'], [38, 'M']],
  mel: mel([[74, 4], [69, 2], [74, 2], [78, 6], [76, 2], [74, 4], [73, 2], [71, 2], [69, 8], [71, 4], [73, 2], [74, 2], [76, 6], [78, 2], [79, 4], [78, 2], [76, 2], [78, 8],
    [81, 6], [79, 2], [78, 4], [74, 4], [79, 6], [78, 2], [76, 4], [71, 4], [73, 4], [74, 2], [76, 2], [81, 4], [73, 4], [74, 12], [0, 4]]) };
SIG.mille2 = { meter: 16, root: 62, mode: 'major', chords: [[38, 'M'], [43, 'M'], [40, 'm'], [45, 'M'], [47, 'm'], [43, 'M'], [45, 'M'], [38, 'M']],
  mel: mel([[78, 4], [79, 2], [81, 2], [83, 6], [81, 2], [79, 4], [78, 2], [76, 2], [74, 8], [76, 4], [78, 2], [79, 2], [81, 6], [74, 2], [83, 4], [81, 2], [79, 2], [81, 8],
    [86, 6], [85, 2], [83, 4], [81, 4], [83, 6], [81, 2], [79, 4], [76, 4], [78, 4], [76, 2], [74, 2], [76, 4], [73, 4], [74, 12], [0, 4]]) };
SIG.nuit = { meter: 6, root: 65, mode: 'major', chords: [[41, 'M'], [36, 'M'], [43, 'm'], [36, 'M'], [41, 'M'], [36, 'M'], [34, 'M'], [41, 'M']],
  mel: mel([[72, 2], [69, 1], [72, 1], [77, 2], [76, 3], [74, 1], [72, 2], [70, 2], [67, 1], [70, 1], [76, 2], [74, 4], [72, 2],
    [69, 2], [72, 1], [77, 1], [81, 2], [79, 3], [77, 1], [76, 2], [74, 2], [76, 1], [77, 1], [79, 1], [76, 1], [77, 6]]) };
SIG.nuit2 = { meter: 6, root: 65, mode: 'major', chords: [[41, 'M'], [34, 'M'], [41, 'M'], [36, 'M'], [34, 'M'], [36, 'M'], [36, 'M'], [41, 'M']],
  mel: mel([[77, 2], [76, 1], [74, 1], [72, 2], [74, 3], [72, 1], [70, 2], [69, 2], [70, 1], [72, 1], [74, 2], [72, 4], [69, 2],
    [70, 2], [74, 1], [79, 1], [77, 2], [76, 3], [74, 1], [72, 2], [69, 2], [72, 1], [76, 1], [74, 1], [76, 1], [77, 6]]) };

// ---- styles : ce qui change d'une ambiance à l'autre
const R6 = {
  calmA: [[3, 3], [2, 1, 3], [3, 2, 1], [2, 1, 2, 1], [4, 2], [6]], calmB: [[2, 1, 2, 1], [1, 1, 1, 3], [3, 1, 1, 1], [2, 1, 3]],
  liveA: [[2, 1, 2, 1], [2, 1, 3], [3, 2, 1], [1, 1, 1, 2, 1], [3, 3]], liveB: [[1, 1, 1, 1, 1, 1], [2, 1, 1, 1, 1], [1, 1, 1, 3], [2, 1, 2, 1], [3, 1, 1, 1]],
  run: [[1, 1, 1, 1, 1, 1], [2, 1, 1, 1, 1], [1, 1, 1, 2, 1], [2, 1, 2, 1]],
  menuetA: [[2, 2, 2], [4, 2], [2, 1, 1, 2], [2, 4], [3, 1, 2], [6]], menuetB: [[1, 1, 2, 2], [2, 2, 1, 1], [2, 1, 1, 2], [4, 2]], menuetRun: [[1, 1, 1, 1, 2], [2, 1, 1, 1, 1], [1, 1, 2, 2]], // lot 4 : trois temps
};
const R16 = {
  A: [[8, 4, 4], [4, 4, 8], [8, 8], [6, 2, 8], [12, 4], [4, 4, 4, 4]], B: [[4, 4, 4, 4], [6, 6, 4], [3, 3, 2, 8], [8, 4, 2, 2], [2, 2, 4, 8]],
  run: [[4, 4, 4, 4], [2, 2, 4, 4, 4], [4, 2, 2, 4, 4], [6, 2, 4, 4]],
};
export const STYLES = {
  day: { meter: 6, step: [0.2, 0.235], modes: ['major', 'mixo', 'dorian'], mroots: [60, 62, 65, 67, 57], forms: [['A', 'A', 'B', 'A'], ['A', 'B', 'A'], ['A', 'A', 'B', 'B']], rhyA: R6.calmA, rhyB: R6.calmB, rhyRun: R6.calmB,
    leads: ['flute', 'pluck', 'whistle', 'fiddle'], comps: ['strum', 'arp', 'softpah'], perc: 'folk', intro: 2, rest: [55, 120], sig: SIG.day, sigForm: ['S', 'B', 'S'], sigChance: 0.2, level: 0.8 },
  sea: { meter: 6, step: [0.162, 0.186], modes: ['dorian', 'minor', 'mixo'], mroots: [62, 64, 57, 59, 67], forms: [['A', 'A', 'B', 'A'], ['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'B']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['fiddle', 'flute', 'brass', 'pluck'], comps: ['oompah', 'arp', 'strum'], perc: 'jig', intro: 2, rest: [40, 85], sig: SIG.sea, sigForm: ['S', 'B', 'A'], sigChance: 0.3, level: 0.9 },
  naval: { meter: 6, step: [0.132, 0.146], modes: ['minor', 'dorian'], mroots: [62, 64, 60, 57, 65], forms: [['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'A'], ['A', 'B', 'C', 'B']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['brass', 'fiddle'], comps: ['drive'], perc: 'battle', intro: 1, rest: null, sig: SIG.naval, sigForm: ['S', 'B'], sigChance: 0.35, level: 1.2 },
  epic: { meter: 16, step: [0.096, 0.106], modes: ['minor'], mroots: [64, 62, 60, 66, 59], forms: [['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'A'], ['A', 'B', 'B', 'C']], rhyA: R16.A, rhyB: R16.B, rhyRun: R16.run,
    leads: ['brass', 'choir'], comps: ['war'], perc: 'war', intro: 1, rest: null, sig: SIG.epic, sigForm: ['S', 'B', 'S', 'C'], sigChance: 0.35, level: 1 },
  boss: { meter: 16, step: [0.108, 0.118], modes: ['minor'], mroots: [57, 59, 62, 55], forms: [['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'C']], rhyA: R16.A, rhyB: R16.B, rhyRun: R16.run,
    leads: ['brass', 'fiddle'], comps: ['war'], perc: 'siege', intro: 1, rest: null, sig: null, level: 1.1 },
  // 0.8 : Libertalia — gigues de taverne, violons et cuivres, la cité ne dort jamais
  cite: { meter: 6, step: [0.15, 0.172], modes: ['major', 'mixo', 'dorian'], mroots: [62, 60, 65, 67, 64], forms: [['A', 'A', 'B', 'A'], ['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'B']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['fiddle', 'whistle', 'pluck', 'brass'], comps: ['oompah', 'strum'], perc: 'jig', intro: 2, rest: [25, 60], sig: SIG.sea, sigForm: ['S', 'B', 'A'], sigChance: 0.25, level: 0.85 },
  // lot 4 : les neuf identités du Plus Grand Braquage (cahier des charges dans rapports/lot4-cinematiques.md) — de la musique
  // générée par le code, comme le reste du jeu : aucun fichier audio. Un vrai enregistrement peut remplacer chacune (Sfx.musicFile).
  silas: { meter: 6, step: [0.19, 0.205], modes: ['minor', 'dorian'], mroots: [62], forms: [['A', 'B', 'A']], rhyA: R6.calmA, rhyB: R6.liveA, rhyRun: R6.calmB,
    leads: ['fiddle', 'pluck'], comps: ['softpah', 'arp'], perc: 'none', intro: 1, rest: [6, 14], sig: SIG.silas, sigForm: ['S', 'B', 'S'], sigChance: 1, level: 0.72, fadeIn: 1.4 },
  preparation: { meter: 6, step: [0.172, 0.182], modes: ['dorian', 'minor'], mroots: [62, 57], forms: [['A', 'B', 'A'], ['A', 'A', 'B']], rhyA: R6.liveB, rhyB: R6.liveA, rhyRun: R6.run,
    leads: ['pluck', 'flute'], comps: ['arp'], perc: 'tick', intro: 2, rest: [8, 18], sig: SIG.silas, sigForm: ['A', 'S', 'B'], sigChance: 0.4, level: 0.62, fadeIn: 1.0 },
  reception: { meter: 6, step: [0.23, 0.25], modes: ['major'], mroots: [65, 67, 62], forms: [['A', 'A', 'B', 'A'], ['A', 'B', 'A', 'B']], rhyA: R6.menuetA, rhyB: R6.menuetB, rhyRun: R6.menuetRun,
    leads: ['fiddle', 'flute'], comps: ['menuet'], perc: 'none', intro: 1, rest: [4, 10], sig: null, level: 0.6, fadeIn: 1.2 },
  trahison: { meter: 6, step: [0.3, 0.34], modes: ['minor'], mroots: [62, 59], forms: [['A', 'B'], ['A', 'C']], rhyA: R6.calmA, rhyB: R6.calmA, rhyRun: R6.calmB,
    leads: ['choir', 'flute'], comps: ['hold'], perc: 'none', intro: 1, rest: [18, 34], sig: null, level: 0.55, fadeIn: 2.5 },
  poursuite: { meter: 6, step: [0.118, 0.128], modes: ['minor', 'dorian'], mroots: [62, 64], forms: [['A', 'B', 'A', 'C'], ['A', 'A', 'B', 'A']], rhyA: R6.liveB, rhyB: R6.run, rhyRun: R6.run,
    leads: ['fiddle', 'whistle'], comps: ['drive'], perc: 'jig', intro: 1, rest: null, sig: SIG.silas, sigForm: ['S', 'B', 'S', 'C'], sigChance: 0.35, level: 1.0 },
  silas_boss: { meter: 16, step: [0.1, 0.108], modes: ['minor'], mroots: [62], forms: [['A', 'B', 'A', 'C']], rhyA: R16.A, rhyB: R16.B, rhyRun: R16.run,
    leads: ['brass', 'fiddle'], comps: ['war'], perc: 'siege', intro: 1, rest: null, sig: SIG.silasWar, sigForm: ['S', 'B', 'S', 'C'], sigChance: 0.6, level: 1.1 },
  fin_garder: { meter: 6, step: [0.15, 0.165], modes: ['major', 'mixo'], mroots: [62, 67], forms: [['A', 'A', 'B', 'A']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['brass', 'fiddle'], comps: ['oompah'], perc: 'jig', intro: 1, rest: [20, 40], sig: null, level: 0.9, fadeIn: 0.8 },
  fin_denoncer: { meter: 6, step: [0.22, 0.24], modes: ['mixo', 'major'], mroots: [60, 65], forms: [['A', 'B', 'A']], rhyA: R6.calmA, rhyB: R6.calmB, rhyRun: R6.calmB,
    leads: ['choir', 'flute'], comps: ['strum'], perc: 'folk', intro: 2, rest: [25, 50], sig: null, level: 0.72, fadeIn: 1.6 },
  fin_complice: { meter: 6, step: [0.16, 0.172], modes: ['major'], mroots: [62], forms: [['A', 'B', 'A']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['whistle', 'pluck'], comps: ['oompah', 'strum'], perc: 'jig', intro: 1, rest: [20, 40], sig: SIG.silasMaj, sigForm: ['S', 'A', 'S'], sigChance: 1, level: 0.85, fadeIn: 1.0 },
  // lot 6 : la Nuit des Mille Voiles (aucun fichier audio : de la musique générée par le code, sur des airs écrits à la main)
  fete: { meter: 6, step: [0.148, 0.16], modes: ['major'], mroots: [62], forms: [['A', 'A', 'B', 'A'], ['A', 'B', 'A', 'C']], rhyA: R6.liveA, rhyB: R6.liveB, rhyRun: R6.run,
    leads: ['fiddle', 'accordion', 'whistle'], comps: ['oompah', 'strum'], perc: 'jig', intro: 2, rest: [6, 16], sig: SIG.fete, sig2: SIG.fete2, sigForm: ['S', 'T', 'A', 'S', 'B', 'T', 'S'], sigChance: 0.85, level: 0.85, fadeIn: 1.0 },
  epreuves: { meter: 16, step: [0.082, 0.088], modes: ['mixo'], mroots: [69], forms: [['A', 'B', 'A', 'C']], rhyA: R16.B, rhyB: R16.run, rhyRun: R16.run,
    leads: ['fiddle', 'whistle', 'accordion'], comps: ['reel'], perc: 'reel', intro: 1, rest: [3, 8], sig: SIG.epreuves, sig2: SIG.epreuves2, sigForm: ['S', 'A', 'T', 'B', 'S', 'C'], sigChance: 0.9, level: 0.95, fadeIn: 0.5 },
  mille_voiles: { meter: 16, step: [0.104, 0.11], modes: ['major'], mroots: [62], forms: [['A', 'B', 'A', 'C']], rhyA: R16.A, rhyB: R16.B, rhyRun: R16.run,
    leads: ['brass', 'choir', 'fiddle'], comps: ['anthem'], perc: 'march', intro: 1, rest: null, sig: SIG.mille, sig2: SIG.mille2, sigForm: ['S', 'T', 'A', 'S', 'B', 'T', 'S'], sigChance: 1, level: 1.0 },
  fete_nuit: { meter: 6, step: [0.24, 0.268], modes: ['major'], mroots: [65], forms: [['A', 'B', 'A'], ['A', 'A', 'B', 'A']], rhyA: R6.menuetA, rhyB: R6.menuetB, rhyRun: R6.menuetRun,
    leads: ['flute', 'pluck', 'accordion'], comps: ['strum', 'menuet'], perc: 'folk', intro: 2, rest: [10, 24], sig: SIG.nuit, sig2: SIG.nuit2, sigForm: ['S', 'A', 'T', 'B', 'S'], sigChance: 0.9, level: 0.7, fadeIn: 1.8 },
  // nappes d'ambiance : la nuit et les marais ne chantent pas, ils respirent
  night: { ambient: 'night', play: [45, 80], rest: [30, 70] },
  swamp: { ambient: 'swamp', play: [40, 70], rest: [25, 60] },
};

function walk(prev, strong, tones, lo, hi, dir, rnd) {
  const R = strong ? 4 : 2, c = [], w = [];
  for (let d = -R; d <= R; d++) {
    const x = prev + d;
    if (x < lo || x > hi) continue;
    let k = [0.4, 3, 1.5, 0.7, 0.45][Math.abs(d)];
    const ct = tones.has(mod7(x));
    k *= strong ? (ct ? 4 : 0.2) : (ct ? 1.25 : 1);
    if (d && Math.sign(d) === dir) k *= 1.5;
    c.push(x); w.push(k);
  }
  let s = 0; for (const k of w) s += k;
  let r = rnd() * s;
  for (let i = 0; i < c.length; i++) { r -= w[i]; if (r <= 0) return c[i]; }
  return c.length ? c[c.length - 1] : prev;
}
const snap = (deg, tones, rnd) => { if (tones.has(mod7(deg))) return deg; const up = tones.has(mod7(deg + 1)), dn = tones.has(mod7(deg - 1)); return up && dn ? deg + (rnd() < 0.5 ? 1 : -1) : up ? deg + 1 : dn ? deg - 1 : deg; };
const nearest = (prev, cands, lo, hi) => { let best = cands[0], bd = 99; for (const c of cands) for (const o of [-7, 0, 7]) { const x = c + o; if (x < lo || x > hi) continue; const d = Math.abs(x - prev); if (d < bd) { bd = d; best = x; } } return best; };

// une section de 8 mesures : motif, réponse, reprise, cadence
function genSection(P, kind, rnd) {
  const A = kind === 'A', M = P.meter, half = M / 2;
  const chords = pick(P.minor ? (A ? PROG.minA : PROG.minB) : (A ? PROG.majA : PROG.majB), rnd).slice();
  if (kind === 'C') { chords[6] = 4; chords[7] = 0; } // la dernière section conclut
  const lo = A ? -1 : 2, hi = A ? 8 : 11, rpool = A ? P.rhyA : P.rhyB;
  const tones = (b) => new Set([mod7(chords[b]), mod7(chords[b] + 2), mod7(chords[b] + 4)]);
  const notes = [];
  let prev = null, dir = 1;
  const bar = (b, rhythm, into) => {
    let s = 0; const T = tones(b);
    for (const d of rhythm) {
      let deg;
      if (prev == null) { const c = []; for (let x = lo + 1; x <= lo + 6; x++) if (T.has(mod7(x))) c.push(x); deg = pick(c, rnd); }
      else deg = walk(prev, s % half === 0, T, lo, hi, dir, rnd);
      if (prev != null && deg !== prev) dir = Math.sign(deg - prev);
      if (deg >= hi - 1) dir = -1; else if (deg <= lo + 1) dir = 1;
      into.push({ s: b * M + s, d, deg });
      prev = deg; s += d;
    }
  };
  const motif = [];
  bar(0, pick(rpool, rnd), motif); bar(1, pick(rpool, rnd), motif);
  notes.push(...motif);
  const answer = (b0) => { // le même dessin, déplacé sur les accords suivants
    const T0 = tones(b0);
    let best = prev;
    for (let d = 0; d <= 3; d++) { if (prev + d <= hi && T0.has(mod7(prev + d))) { best = prev + d; break; } if (prev - d >= lo && T0.has(mod7(prev - d))) { best = prev - d; break; } }
    const shift = best - motif[0].deg;
    for (const n of motif) {
      const b = b0 + Math.floor(n.s / M);
      let deg = Math.max(lo, Math.min(hi, n.deg + shift));
      if ((n.s % M) % half === 0) deg = snap(deg, tones(b), rnd);
      notes.push({ s: n.s + b0 * M, d: n.d, deg });
      prev = deg;
    }
  };
  answer(2);
  { // la réponse respire : sa dernière note s'allonge
    const end = 4 * M, tail = notes.filter((n) => n.s >= end - half);
    const keep = tail.length ? tail[0] : notes[notes.length - 1];
    for (const n of tail) if (n !== keep) notes.splice(notes.indexOf(n), 1);
    keep.d = end - keep.s; prev = keep.deg;
  }
  answer(4);
  const target = chords[7] === 0 ? nearest(prev, [0], lo, hi) : nearest(prev, [4, 1], lo, hi);
  dir = Math.sign(target - prev) || -1;
  bar(6, pick(P.rhyRun, rnd), notes);
  notes.push({ s: 7 * M, d: M, deg: target });
  const out = notes.map((n) => { const b = Math.min(7, Math.floor(n.s / M)); return { s: n.s, d: n.d, midi: P.midi(n.deg, P.minor && chords[b] === 4), low: P.midi(n.deg - 2, P.minor && chords[b] === 4) }; });
  return { bars: 8, chords: chords.map((r) => P.chord(r)), mel: out };
}
function sigSection(sig, shift) {
  return { bars: sig.chords.length, chords: sig.chords.map(([b, q]) => ({ bass: b + shift, triad: [b + shift + 24, b + shift + 24 + (q === 'm' ? 3 : 4), b + shift + 31] })), mel: sig.mel.map((n) => ({ s: n.s, d: n.d, midi: n.midi + shift, low: n.midi + shift - 12 })) };
}

// ---- accompagnements (une mesure) et percussions
const COMP = {
  oompah(e, s, c) { e(s, 'bass', c.bass, 2.6, 1); e(s + 3, 'bass', c.bass + 7, 2.2, 0.8); for (const k of [1, 2, 4, 5]) for (const n of c.triad) e(s + k, 'stab', n, 0.5, k === 2 || k === 5 ? 1 : 0.55); },
  softpah(e, s, c) { e(s, 'bass', c.bass, 2.6, 0.8); e(s + 3, 'bass', c.bass + 7, 2.2, 0.6); for (const k of [2, 5]) for (const n of c.triad) e(s + k, 'stab', n, 0.6, 0.7); },
  strum(e, s, c) { e(s, 'bass', c.bass, 5, 0.85); c.triad.forEach((n, i) => { e(s + i * 0.14, 'harp', n, 2.4, 0.8); e(s + 3 + i * 0.14, 'harp', n, 2, 0.55); }); },
  arp(e, s, c) { e(s, 'bass', c.bass, 5, 0.8); [0, 1, 2, 1, 2, 1].forEach((i, k) => e(s + k, 'harp', c.triad[i], 1.2, k === 0 || k === 3 ? 0.8 : 0.5)); },
  drive(e, s, c) { for (let k = 0; k < 6; k++) e(s + k, 'drive', k === 2 || k === 5 ? c.bass + 7 : c.bass, 0.8, 1); for (const k of [0, 3]) for (const n of c.triad) e(s + k, 'stab', n, 1.6, 0.9); },
  menuet(e, s, c) { e(s, 'bass', c.bass, 2, 0.8); for (const k of [2, 4]) for (const n of c.triad) e(s + k, 'harp', n + 12, 1.4, k === 2 ? 0.65 : 0.5); }, // lot 4 : un, deux, trois
  reel(e, s, c) { for (const k of [0, 4, 8, 12]) e(s + k, 'bass', k % 8 ? c.bass + 7 : c.bass, 3, k ? 0.75 : 0.95); for (const k of [2, 6, 10, 14]) for (const n of c.triad) e(s + k, 'stab', n, 1.4, 0.75); }, // lot 6 : le reel (les épreuves)
  anthem(e, s, c) { e(s, 'bass', c.bass, 8, 1); e(s + 8, 'bass', c.bass + 7, 8, 0.85); for (const n of c.triad) e(s, 'pad', n + 12, 16, 0.9); for (let k = 0; k < 16; k += 4) for (const n of c.triad) e(s + k, 'stab', n, 2.6, k ? 0.6 : 0.85); }, // lot 6 : l'hymne (la course)
  hold(e, s, c) { e(s, 'bass', c.bass, 6, 0.55); for (const n of c.triad) e(s, 'pad', n, 6, 0.9); }, // lot 4 : des accords tenus, presque immobiles
  war(e, s, c) { for (let k = 0; k < 16; k += 2) e(s + k, 'drive', k % 8 === 4 ? c.bass + 12 : k % 8 === 6 ? c.bass + 7 : c.bass, 1.5, 1); for (let k = 0; k < 16; k += 2) e(s + k, 'stab', c.triad[(k / 2) % 3] + 12, 1.1, 0.9); for (const n of c.triad) e(s, 'pad', n, 15, 1); },
};
const PERC = {
  none() {}, // lot 4 : pas de percussions (le bal, la vérité)
  tick(e, s, b) { for (let k = 0; k < 6; k += 1) e(s + k, 'shake', 0, 0, k % 3 === 0 ? 0.7 : 0.35); if (b % 2 === 0) e(s, 'kick', 0, 0, 0.35); }, // lot 4 : une horloge, on prépare
  folk(e, s, b) { e(s, 'kick', 0, 0, 0.55); if (b % 2) e(s + 3, 'shake', 0, 0, 0.6); },
  jig(e, s, b, fill) { e(s, 'kick', 0, 0, 0.85); e(s + 3, 'snare', 0, 0, 0.5); for (let k = 0; k < 6; k++) e(s + k, 'shake', 0, 0, k % 3 === 0 ? 0.9 : 0.45); if (fill) for (let k = 3; k < 6; k++) e(s + k, 'snare', 0, 0, 0.3 + k * 0.08); },
  battle(e, s, b, fill) { e(s, 'taiko', 0, 0, 1); e(s + 3, 'taiko', 0, 0, 0.75); e(s + 2, 'tom', 0, 0, 0.5); e(s + 5, 'tom', 0, 0, 0.5); e(s + 3, 'snare', 0, 0, 0.7); for (let k = 0; k < 6; k++) e(s + k, 'shake', 0, 0, 0.6); if (fill) for (let k = 3; k < 6; k++) e(s + k, 'snare', 0, 0, 0.4 + k * 0.1); },
  war(e, s, b, fill) { for (const k of [0, 3, 6, 8, 11, 14]) e(s + k, 'taiko', 0, 0, k === 0 ? 1 : k === 8 ? 0.85 : 0.55); e(s + 4, 'snare', 0, 0, 0.7); e(s + 12, 'snare', 0, 0, 0.7); for (let k = 0; k < 16; k += 2) e(s + k, 'shake', 0, 0, 0.6); if (fill) for (let k = 12; k < 16; k++) e(s + k, 'tom', 0, 0, 0.5 + (k - 12) * 0.12); },
  reel(e, s, b, fill) { e(s, 'kick', 0, 0, 0.9); e(s + 8, 'kick', 0, 0, 0.75); e(s + 4, 'snare', 0, 0, 0.55); e(s + 12, 'snare', 0, 0, 0.6); for (let k = 0; k < 16; k += 2) e(s + k, 'shake', 0, 0, k % 4 ? 0.4 : 0.75); if (fill) for (let k = 13; k < 16; k++) e(s + k, 'snare', 0, 0, 0.35 + (k - 13) * 0.12); }, // lot 6
  march(e, s, b, fill) { e(s, 'taiko', 0, 0, 1); e(s + 8, 'taiko', 0, 0, 0.8); for (const k of [4, 12]) e(s + k, 'snare', 0, 0, 0.6); for (let k = 0; k < 16; k += 2) e(s + k, 'shake', 0, 0, 0.4); if (fill) for (let k = 12; k < 16; k++) e(s + k, 'snare', 0, 0, 0.3 + (k - 12) * 0.15); }, // lot 6
  siege(e, s, b, fill) { e(s, 'taiko', 0, 0, 1); e(s + 8, 'taiko', 0, 0, 0.8); e(s + 12, 'tom', 0, 0, 0.55); if (b % 2) e(s + 14, 'taiko', 0, 0, 0.55); for (let k = 0; k < 16; k += 4) e(s + k, 'shake', 0, 0, 0.7); if (fill) for (let k = 12; k < 16; k++) e(s + k, 'snare', 0, 0, 0.4 + (k - 12) * 0.1); },
};

// compose un morceau entier ; renvoie ses événements [pas, voix, note, durée en pas, volume]
export function makePiece(name, seed, prevRoot = 0, first = true) {
  const S = STYLES[name], rnd = mulberry32(seed >>> 0);
  const useSig = !!S.sig && rnd() < S.sigChance;
  const mode = useSig ? (S.sig.mode || 'minor') : pick(S.modes, rnd), scale = MODES[mode], minor = mode === 'minor' || mode === 'dorian';
  const roots = S.mroots.filter((r) => r !== prevRoot);
  const mroot = pick(roots.length ? roots : S.mroots, rnd);
  let broot = mroot - 24; while (broot < 33) broot += 12; while (broot > 45) broot -= 12;
  const sem = (d) => scale[mod7(d)] + 12 * Math.floor(d / 7);
  const P = {
    meter: S.meter, minor, rhyA: S.rhyA, rhyB: S.rhyB, rhyRun: S.rhyRun,
    midi: (deg, raise) => mroot + sem(deg) + (raise && mod7(deg) === 6 ? 1 : 0),
    chord: (r) => { let bass = broot + sem(mod7(r)); if (bass > broot + 8) bass -= 12; const raise = minor && mod7(r) === 4; return { bass, triad: [r, r + 2, r + 4].map((d, i) => mroot - 12 + sem(d) + (raise && i === 1 ? 1 : 0)) }; },
  };
  const form = useSig ? S.sigForm : pick(S.forms, rnd), secs = {}, count = {};
  for (const L of form) if (!secs[L]) secs[L] = L === 'S' ? sigSection(S.sig, mroot - S.sig.root) : L === 'T' ? sigSection(S.sig2 || S.sig, mroot - (S.sig2 || S.sig).root) : genSection(P, L, rnd); // lot 6 : T, la seconde partie d'un air écrit
  const lead1 = pick(S.leads, rnd), others = S.leads.filter((x) => x !== lead1), lead2 = others.length ? pick(others, rnd) : lead1;
  const comp = COMP[pick(S.comps, rnd)], perc = PERC[S.perc], M = S.meter;
  const ev = [], e = (s, v, n, d, vol = 1) => ev.push([s, v, n, d, vol]);
  let bar = 0;
  const intro = first ? S.intro : Math.min(1, S.intro);
  for (let b = 0; b < intro; b++, bar++) { comp(e, bar * M, secs[form[0]].chords[0]); if (b || !first) perc(e, bar * M, bar, b === intro - 1); }
  form.forEach((L, idx) => {
    const sec = secs[L], pass = count[L] = (count[L] || 0) + 1, last = idx === form.length - 1;
    const lead = L === 'B' ? lead2 : lead1, thick = pass > 1 || last;
    for (let b = 0; b < sec.bars; b++) { comp(e, (bar + b) * M, sec.chords[b]); perc(e, (bar + b) * M, bar + b, b === sec.bars - 1); }
    for (const n of sec.mel) {
      const jit = (rnd() - 0.5) * 0.06;
      e(bar * M + n.s + jit, lead, n.midi, n.d, 0.9 + rnd() * 0.2);
      if (thick && n.d >= M / 6) e(bar * M + n.s + jit, 'harm', n.low, n.d, 0.55);
    }
    bar += sec.bars;
  });
  const end = secs[form[form.length - 1]].chords; // accord final tenu
  const fin = end[end.length - 1];
  e(bar * M, 'bass', fin.bass, M, 0.9); for (const n of fin.triad) e(bar * M, 'pad', n, M, 1);
  ev.sort((a, b) => a[0] - b[0]);
  return { ev, stepDur: S.step[0] + rnd() * (S.step[1] - S.step[0]), steps: (bar + 1) * M, root: mroot, level: S.level || 1, sig: useSig, lead: lead1, mode };
}

// ---- timbres
export const VOICE = {
  flute: (a, g, n, t, d, v) => a.note(g, n, t, d, { type: 'triangle', vol: 0.05 * v, attack: 0.03, release: 0.12, vib: 5.5 }),
  whistle: (a, g, n, t, d, v) => a.note(g, n + 12, t, d, { type: 'sine', vol: 0.028 * v, attack: 0.02, release: 0.1, vib: 6 }),
  fiddle: (a, g, n, t, d, v) => { a.note(g, n, t, d, { type: 'sawtooth', vol: 0.02 * v, lp: 2300, attack: 0.02, vib: 5 }); a.note(g, n, t, d, { type: 'sawtooth', vol: 0.011 * v, lp: 1700, detune: 8, attack: 0.02 }); },
  pluck: (a, g, n, t, d, v) => { a.note(g, n, t, Math.min(d, 0.16), { type: 'triangle', vol: 0.055 * v, attack: 0.004, release: 0.34 }); a.note(g, n + 12, t, 0.05, { type: 'square', vol: 0.007 * v, lp: 2600, attack: 0.003, release: 0.2 }); },
  brass: (a, g, n, t, d, v) => { a.note(g, n, t, d, { type: 'sawtooth', vol: 0.024 * v, lp: 1700, attack: 0.035 }); a.note(g, n - 12, t, d, { type: 'square', vol: 0.015 * v, lp: 1200, attack: 0.035 }); },
  choir: (a, g, n, t, d, v) => { a.note(g, n, t, d, { type: 'triangle', vol: 0.034 * v, attack: 0.1, release: 0.2, vib: 4.5 }); a.note(g, n - 12, t, d, { type: 'sine', vol: 0.03 * v, attack: 0.12, release: 0.2 }); a.note(g, n, t, d, { type: 'sawtooth', vol: 0.008 * v, lp: 1400, attack: 0.1, detune: -7 }); },
  accordion: (a, g, n, t, d, v) => { a.note(g, n, t, d, { type: 'square', vol: 0.011 * v, lp: 1900, attack: 0.04, release: 0.1, vib: 5.2 }); a.note(g, n, t, d, { type: 'sawtooth', vol: 0.008 * v, lp: 1500, detune: 7, attack: 0.05, release: 0.1 }); a.note(g, n - 12, t, d, { type: 'square', vol: 0.004 * v, lp: 900, attack: 0.05 }); }, // lot 6 : deux anches et un bourdon
  harm: (a, g, n, t, d, v) => a.note(g, n, t, d, { type: 'triangle', vol: 0.024 * v, attack: 0.03, release: 0.12 }),
  bass: (a, g, n, t, d, v) => a.note(g, n, t, d, { type: 'triangle', vol: 0.07 * v }),
  drive: (a, g, n, t, d, v) => a.note(g, n, t, d, { type: 'sawtooth', vol: 0.032 * v, lp: 750 }),
  stab: (a, g, n, t, d, v) => a.note(g, n, t, d, { type: 'sawtooth', vol: 0.0095 * v, lp: 1400, attack: 0.012 }),
  harp: (a, g, n, t, d, v) => a.note(g, n, t, Math.min(d, 0.12), { type: 'triangle', vol: 0.03 * v, attack: 0.004, release: 0.5 }),
  pad: (a, g, n, t, d, v) => { a.note(g, n, t, d, { type: 'triangle', vol: 0.014 * v, attack: 0.25, release: 0.5 }); a.note(g, n - 12, t, d, { type: 'sine', vol: 0.016 * v, attack: 0.3, release: 0.5 }); },
  kick: (a, g, n, t, d, v) => a.drum(g, t, { f0: 108, f1: 46, dur: 0.16, vol: 0.09 * v }),
  taiko: (a, g, n, t, d, v) => a.drum(g, t, { f0: 128, f1: 36, dur: 0.26, vol: 0.15 * v }),
  tom: (a, g, n, t, d, v) => a.drum(g, t, { f0: 96, f1: 42, dur: 0.14, vol: 0.075 * v }),
  snare: (a, g, n, t, d, v) => a.drum(g, t, { noise: 1, dur: 0.11, vol: 0.055 * v }),
  shake: (a, g, n, t, d, v) => a.drum(g, t, { noise: 2, dur: 0.03, vol: 0.012 * v }),
};
const PENTA = [74, 77, 79, 81, 84, 86];
const NIGHT_CH = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52], [48, 52, 55], [41, 45, 48], [50, 55, 57], [45, 48, 52]];
const AMBIENT = {
  night: { step: 0.25, play(a, k, t, g, st) {
    if (k % 16 === 0) { // un accord tiré au hasard, proche du précédent
      st.c = st.c == null ? 0 : (st.c + 1 + Math.floor(Math.random() * 3)) % NIGHT_CH.length;
      for (const n of NIGHT_CH[st.c]) { a.note(g, n, t, 3.8, { type: 'sawtooth', vol: 0.012, attack: 1.2, release: 1.4, lp: 650, detune: -6 }); a.note(g, n, t, 3.8, { type: 'sawtooth', vol: 0.012, attack: 1.2, release: 1.4, lp: 650, detune: 7 }); }
    }
    if (Math.random() < 0.13) a.note(g, PENTA[(Math.random() * PENTA.length) | 0], t, 0.05, { type: 'sine', vol: 0.03, attack: 0.005, release: 1.4 });
  } },
  swamp: { step: 0.25, play(a, k, t, g) {
    const i = k % 32;
    if (i === 0) { const r = 38 - (Math.random() < 0.3 ? 2 : 0); a.note(g, r, t, 7.6, { type: 'sawtooth', vol: 0.014, attack: 2, release: 2, lp: 300 }); a.note(g, r + 7, t, 7.6, { type: 'sawtooth', vol: 0.01, attack: 2, release: 2, lp: 300, detune: 8 }); }
    if (i % 8 === 0 && Math.random() < 0.75) { a.drum(g, t, { f0: 70, f1: 40, dur: 0.22, vol: 0.09 }); if (Math.random() < 0.6) a.drum(g, t + 0.2, { f0: 60, f1: 38, dur: 0.2, vol: 0.06 }); }
    if (Math.random() < 0.06) a.note(g, [75, 74, 70, 63][(Math.random() * 4) | 0], t, 0.05, { type: 'sine', vol: 0.025, release: 1.8 });
  } },
};

export class Composer {
  constructor(sfx) {
    this.a = sfx; this.want = 'day'; this.cur = null; this.piece = null; this.gain = null;
    this.restUntil = 0; this.lastEnd = -999; this.seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0; this.prevRoot = 0; this.amb = null;
  }
  newGain(fade) {
    const c = this.a.ctx, g = c.createGain();
    g.gain.value = 0; g.connect(this.a.musicBus); g.gain.setTargetAtTime(1, c.currentTime + 0.05, fade);
    this.gain = g; return g;
  }
  drop(fade = 0.5) { // le morceau en cours s'éteint
    const g = this.gain; if (!g) return;
    g.gain.setTargetAtTime(0, this.a.ctx.currentTime, fade);
    setTimeout(() => { try { g.disconnect(); } catch (e) { /* */ } }, 4500);
    this.gain = null; this.piece = null; this.amb = null;
  }
  tick() {
    const c = this.a.ctx;
    if (!c || c.state !== 'running' || !this.a.musicBus) return;
    const now = c.currentTime;
    if (this.want !== this.cur) {
      const from = STYLES[this.cur], to = STYLES[this.want];
      const wasPlaying = !!this.piece || !!this.amb;
      this.drop(this.fadeOut ?? 0.5); this.fadeOut = null; this.cur = this.want; // lot 4 : la cinématique choisit la durée du fondu
      // un combat commence tout de suite ; une promenade attend que le silence ait duré
      if (to && !to.rest) this.restUntil = now + 0.25;
      else this.restUntil = Math.max(now + 1.2, wasPlaying || (from && !from.rest) ? now + 1.2 : Math.min(this.restUntil, now + 30));
    }
    const S = STYLES[this.cur];
    if (!S) return;
    if (S.ambient) return this.tickAmbient(S, now);
    if (!this.piece) {
      if (now < this.restUntil) return;
      const first = now - this.lastEnd > 2.5;
      this.piece = makePiece(this.cur, this.seed = (this.seed * 1664525 + 1013904223) >>> 0, this.prevRoot, first);
      this.prevRoot = this.piece.root; this.pos = 0; this.t0 = now + 0.12;
      if (first || !this.gain) this.newGain(S.fadeIn || (first && S.rest ? 0.5 : 0.08));
    }
    const p = this.piece, g = this.gain;
    while (this.pos < p.ev.length) {
      const [s, v, n, d, vol] = p.ev[this.pos];
      const t = this.t0 + s * p.stepDur;
      if (t > now + 0.4) break;
      this.pos++;
      if (t < now - 0.05) continue;
      VOICE[v](this.a, g, n, Math.max(t, now), d * p.stepDur * 0.93, vol * p.level);
    }
    if (this.pos >= p.ev.length && now > this.t0 + p.steps * p.stepDur - (S.rest ? 0 : p.stepDur * S.meter)) {
      this.piece = null; this.lastEnd = now;
      if (S.rest) { this.restUntil = now + S.rest[0] + Math.random() * (S.rest[1] - S.rest[0]); const old = this.gain; this.gain = null; setTimeout(() => { try { old.disconnect(); } catch (e) { /* */ } }, 5000); }
      else this.restUntil = now; // en combat, le morceau suivant enchaîne dans une autre tonalité
    }
  }
  tickAmbient(S, now) {
    const A = AMBIENT[S.ambient];
    if (!this.amb) {
      if (now < this.restUntil) return;
      this.newGain(1.2);
      this.amb = { next: now + 0.2, k: 0, until: now + S.play[0] + Math.random() * (S.play[1] - S.play[0]), st: {} };
    }
    const m = this.amb;
    while (m.next < now + 0.35) { A.play(this.a, m.k, m.next, this.gain, m.st); m.next += A.step; m.k++; }
    if (now > m.until && m.k % 16 === 0) { this.drop(2.5); this.restUntil = now + S.rest[0] + Math.random() * (S.rest[1] - S.rest[0]); this.lastEnd = now; }
  }
}
