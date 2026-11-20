// Lot 4 : les cinématiques mises en scène. Un script = des étapes datées (en secondes) que client/cinema.js joue ;
// server/cinema.js décide QUI les voit et QUAND, et protège les spectateurs le temps qu'elles durent.
// Coordonnées : en cases, relatives au coin de la pièce (`room`), ou `world: [x, y]` en cases du monde.
// Le joueur garde la main hors des scènes : une cinématique ouvre ou conclut une étape, elle ne la joue pas à sa place.
import { MEM_KEYS } from './scenes.js';

// les neuf identités musicales du Plus Grand Braquage. Elles sont GÉNÉRÉES par le code (client/music.js, STYLES) :
// aucun fichier audio n'existe. `file` est le point d'intégration d'un futur enregistrement (voir Sfx.musicFile).
export const THEMES = {
  silas: { name: 'Silas Virevent', file: null, use: 'Scène 1, ses conversations ; leitmotiv' },
  preparation: { name: 'La préparation', file: null, use: 'Scène 2 ; le repérage (lot 5)' },
  reception: { name: 'La réception', file: null, use: 'Scène 3 : le bal chez Valdorne (lot 5)' },
  trahison: { name: 'La trahison', file: null, use: 'Scène 4 : la salle des archives (lot 5)' },
  poursuite: { name: 'La poursuite', file: null, use: 'Scène 5 et la course sur les toits (lot 5)' },
  silas_boss: { name: 'La Mouche d’Or', file: null, use: 'Scène 6 et le combat contre Silas (lot 5)' },
  fin_garder: { name: 'Le Casse du Siècle', file: null, use: 'Conclusion A : tout garder (lot 5)' },
  fin_denoncer: { name: 'Justice de Port-Lanterne', file: null, use: 'Conclusion B : dénoncer Silas (lot 5)' },
  fin_complice: { name: 'Complices', file: null, use: 'Conclusion C : faire équipe (lot 5)' },
};

// la conversation qui suit la rencontre : les questions libres, puis la décision (Silas s'en souviendra)
// [qui, texte, { g: geste, e: émotion }] — le geste est joué par l'acteur pendant la réplique
export const SILAS_PITCH = [
  ['npc', "J'ai entendu parler de toi, {nom}. On dit que tu sais te battre, naviguer… et te sortir des situations impossibles.", { g: 'coin' }],
  ['npc', "Parfait. J'ai justement un problème qui demande ces trois talents."],
  { ask: [
    { q: 'Qui es-tu ?', a: [['npc', "Silas Virevent. Contrebandier, autrefois : du rhum, des épices, et des lettres que personne ne devait lire.", { g: 'wave' }], ['npc', "Aujourd'hui, je rends service. Aux bonnes personnes.", { e: '♪' }]] },
    { q: 'Quel problème ?', a: [
      ['npc', "Octave Valdorne. Un marchand très riche, très prudent, et très fier de sa demeure fortifiée, sur les hauts du port."],
      ['npc', "Il y organise une vente privée. Le clou de la soirée : la Carte des Sept Courants.", { g: 'coin' }],
      ['npc', "Un passage caché entre les récifs, jusqu'à une île marchande où aucun autre navire ne sait aller. Qui tient cette carte tient le commerce de l'archipel."],
    ] },
    { q: "Et l'or de Valdorne ?", a: [['npc', 'Garde-le. Tout, si ça te chante.', { g: 'wave' }], ['npc', 'Moi, je veux la carte. Rien que la carte.', { e: '…' }]] },
    { q: 'Pourquoi moi ?', a: [['npc', "Parce que les gens de Valdorne ne connaissent pas encore ton visage. Et parce que tu as poussé cette porte comme quelqu'un qui n'a peur de rien.", { g: 'coin' }]] },
  ], go: 'Et ta proposition ?' },
  ['npc', 'Une part du butin. Une belle part. Qu’en dis-tu ?'],
  { choose: [
    { q: "J'en suis.", mem: 'silas_oui', a: [['npc', 'Je le savais.', { g: 'coin' }], ['npc', "Il me reste deux ou trois détails à régler. Reviens me voir à cette table : je ne bouge pas.", { e: '♪' }]] },
    { q: 'Sans moi.', mem: 'silas_non', a: [['npc', 'Dommage. Vraiment.', { e: '…' }], ['npc', "L'offre tient. Ma table aussi.", { g: 'wave' }]] },
  ] },
];
// plus tard, si l'on avait refusé (ou quitté la conversation)
export const SILAS_AGAIN = [
  ['npc', "Tiens, tiens. On revient voir le vieux Silas ?", { g: 'coin' }],
  ['npc', 'La Carte des Sept Courants, la demeure de Valdorne, une belle part du butin. Mon offre tient toujours.'],
  { choose: [
    { q: "D'accord, j'en suis.", mem: 'silas_oui', a: [['npc', "À la bonne heure. Reviens me voir quand tu veux : on parlera du plan.", { e: '♪' }]] },
    { q: 'Toujours pas.', a: [['npc', 'Comme tu voudras. Je ne suis pas pressé. Valdorne, lui, l’est un peu.', { g: 'wave' }]] },
  ] },
];
for (const s of [...SILAS_PITCH, ...SILAS_AGAIN]) if (s && s.choose) for (const c of s.choose) if (c.mem) MEM_KEYS.add(c.mem);

const SB = 'La Sirène Borgne';
// verbes : bars, fade, title, sub, say, grade, vignette, view | cam, follow, zoom, shake | spawn, remove, walk, face, sit,
// gesture, emo, coin, item | theme, sfx, duck | talk, release
export const CINEMAS = {
  // Scène 1 — la rencontre : la taverne vit, la caméra traverse la salle jusqu'à la table isolée près de la cheminée,
  // Silas joue avec une pièce, remarque le joueur, lui fait signe, se lève, vient à lui ; puis on parle (on décide).
  silas_rencontre: {
    name: 'Rencontre avec Silas', quest: 'Le Plus Grand Braquage (lot 5)', room: SB,
    trigger: { enter: SB, lvl: 10 }, maxDur: 30, // protection du spectateur, au plus (la conversation n'en fait pas partie)
    actors: { silas: { npc: 'silas' } },
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: '', fade: 1.6 }, // la musique s'efface : on entend la salle
      { at: 0, do: 'face', id: 'player', dir: 3 },
      { at: 0.3, do: 'say', who: { seat: [8, 2] }, text: '… et le requin me fait : « T’aurais pas une pièce ? »', dur: 2.6 },
      { at: 0.5, do: 'cam', to: { actor: 'silas', dy: -10 }, dur: 2.8 }, // le travelling traverse la salle
      { at: 1.9, do: 'emo', who: { seat: [10, 2] }, e: 'rire', dur: 1.5 },
      { at: 2.0, do: 'sfx', name: 'laugh', vol: 0.8 },
      { at: 2.4, do: 'emo', who: { seat: [7, 6] }, e: 'rire', dur: 1.2 },
      { at: 3.4, do: 'zoom', h: 8, dur: 1.0 }, // on se rapproche de la table isolée
      { at: 3.4, do: 'vignette', who: 'silas', a: 0.45, r: 60, dur: 1.2 },
      { at: 4.3, do: 'coin', id: 'silas' },
      { at: 4.6, do: 'theme', name: 'silas' }, // le leitmotiv entre avec la pièce
      { at: 5.4, do: 'coin', id: 'silas', high: 1 },
      { at: 6.5, do: 'emo', who: 'silas', e: '!', dur: 1.0 }, // il a remarqué le joueur
      { at: 6.6, do: 'face', id: 'silas', to: 'player' },
      { at: 7.3, do: 'gesture', id: 'silas', g: 'wave', dur: 1.3 },
      { at: 7.4, do: 'say', who: 'silas', text: 'Psst. Toi, là-bas.', dur: 1.8 },
      { at: 8.9, do: 'zoom', h: 0, dur: 0.9 },
      { at: 8.9, do: 'vignette', a: 0, dur: 0.9 },
      { at: 9.6, do: 'sfx', name: 'chair', vol: 0.9 },
      { at: 9.6, do: 'sit', id: 'silas', on: false },
      { at: 9.9, do: 'walk', id: 'silas', path: [[13, 5], [10, 5], [10, 'player'], ['player', 22, 2]], speed: 44 },
      { at: 9.9, do: 'follow', who: 'silas', dy: -10 },
      { at: 10.0, do: 'face', id: 'player', to: 'silas' },
      { at: 13.4, do: 'follow', who: null },
      { at: 13.4, do: 'face', id: 'silas', to: 'player' },
      { at: 13.6, do: 'talk', npc: 'silas', actor: 'silas', lines: 'pitch' }, // la conversation : la cinématique attend le joueur
      { at: 13.7, do: 'release' }, // le joueur reprend la main ; Silas regagne sa table
      { at: 14.0, do: 'walk', id: 'silas', path: [[10, 'self'], [10, 5], [13, 5], [13, 4]], speed: 40 },
      { at: 19.5, do: 'sit', id: 'silas', on: true, dir: 1 },
    ],
  },
  // Scène 2 — la préparation : Silas étale le plan, les uniformes et la clé sur sa table ; un fondu, le quartier
  // des Corsaires où vit Valdorne. (Au lot 5, la scène viendra APRÈS avoir réuni les trois ; la demeure y sera construite.)
  silas_preparation: {
    name: 'La préparation', quest: 'Le Plus Grand Braquage (lot 5)', room: SB,
    trigger: { talk: 'silas', mem: 'silas_oui' }, maxDur: 26,
    actors: { silas: { npc: 'silas' } },
    needs: [
      { kind: 'lieu', id: 'demeure_valdorne', lot: 5, fallback: 'le quartier des Corsaires, où elle sera bâtie' },
      { kind: 'icône', id: 'plan_demeure', lot: 5, fallback: 'sur la table : l’accessoire « plan » ; dans le sac : rien encore (l’objet naît au lot 5)' },
      { kind: 'icône', id: 'uniforme_garde', lot: 5, fallback: 'sur la table : l’accessoire « uniforme » ; dans le sac : rien encore' },
      { kind: 'geste', id: 'pointer', lot: 5, fallback: 'reach (le buste qui se penche)' },
    ],
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: 'preparation', fade: 1.2 },
      { at: 0, do: 'face', id: 'silas', dir: 1 },
      { at: 0, do: 'face', id: 'player', to: 'silas' },
      { at: 0.1, do: 'cam', to: { tile: [12, 3.6] }, dur: 1.1 },
      { at: 1.3, do: 'zoom', h: 7, dur: 1.0 },
      { at: 1.3, do: 'grade', col: '255,170,90', a: 0.08, mode: 'soft-light', dur: 1.5 }, // la lueur de la cheminée
      { at: 2.3, do: 'sfx', name: 'paper' },
      { at: 2.3, do: 'gesture', id: 'silas', g: 'reach', to: [12, 4] },
      { at: 2.4, do: 'item', key: 'plan', mini: 'plan', pos: [11.75, 3.95], z: 7 },
      { at: 2.6, do: 'sub', who: 'silas', text: 'Le plan de la demeure. Trois portes, deux rondes, une seule salle des archives.' },
      { at: 5.6, do: 'gesture', id: 'silas', g: 'reach', to: [12, 4] },
      { at: 5.7, do: 'item', key: 'uniforme', mini: 'uniforme', pos: [12.22, 3.72], z: 7 },
      { at: 5.9, do: 'sub', who: 'silas', text: 'Deux uniformes de la garde. Dans une demeure, personne ne regarde un garde.' },
      { at: 8.9, do: 'gesture', id: 'silas', g: 'reach', to: [12, 4] },
      { at: 9.0, do: 'item', key: 'cle', mini: 'cle', pos: [11.95, 4.18], z: 7, glint: 1 },
      { at: 9.0, do: 'sfx', name: 'unlock', vol: 0.6 },
      { at: 9.2, do: 'sub', who: 'silas', text: 'Et la clé du comptable. Sans elle, un coffre reste un coffre.' },
      { at: 12.0, do: 'face', id: 'silas', to: 'player' },
      { at: 12.1, do: 'emo', who: 'silas', e: '♪', dur: 1.4 },
      { at: 12.2, do: 'sub', who: 'silas', text: 'Trois choses. Tu me les trouves, je m’occupe du reste.' },
      { at: 14.6, do: 'fade', to: 1, dur: 0.8 },
      { at: 15.4, do: 'sub', text: '' },
      { at: 15.4, do: 'view', room: -1 }, // dehors : le quartier des Corsaires
      { at: 15.4, do: 'zoom', h: 0 },
      { at: 15.4, do: 'grade', col: '255,150,80', a: 0.1, mode: 'soft-light', dur: 0.1 },
      { at: 15.4, do: 'cam', to: { world: [137, 80] }, dur: 0 },
      { at: 15.5, do: 'fade', to: 0, dur: 0.9 },
      { at: 15.5, do: 'cam', to: { world: [160, 74] }, dur: 5.2 }, // le travelling remonte la rue des Corsaires
      { at: 16.2, do: 'sub', who: 'silas', text: 'Valdorne vit sur les hauts du quartier des Corsaires. Le soir de la vente, on y entrera par la grande porte.' },
      { at: 17.6, do: 'title', name: 'Le Plus Grand Braquage', tag: 'Port-Lanterne' },
      { at: 20.4, do: 'title', name: null },
      { at: 20.7, do: 'fade', to: 1, dur: 0.7 },
      { at: 21.4, do: 'sub', text: '' },
      { at: 21.4, do: 'view', room: null },
      { at: 21.4, do: 'grade', a: 0, dur: 0.1 },
      { at: 21.4, do: 'remove', item: ['plan', 'uniforme', 'cle'] },
      { at: 21.4, do: 'cam', to: { between: ['player', 'silas'] }, dur: 0 },
      { at: 21.5, do: 'fade', to: 0, dur: 0.7 },
      { at: 22.4, do: 'release' },
    ],
  },
};
for (const id of Object.keys(CINEMAS)) MEM_KEYS.add('vu:' + id); // « déjà vue » : gardé dans la sauvegarde, la scène ne se rejoue pas
export const cinemaMaxDur = (id) => (CINEMAS[id] ? CINEMAS[id].maxDur || 30 : 0);
