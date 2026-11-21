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
  // lot 6 : les quatre identités de la Nuit des Mille Voiles (générées par le code, sur des airs écrits à la main)
  fete: { name: 'Port-Lanterne en fête', file: null, use: 'Le festival : la plage, la place, la jetée (lot 6)' },
  epreuves: { name: 'Les épreuves', file: null, use: 'Pendant une épreuve du festival (lot 6)' },
  mille_voiles: { name: 'Mille Voiles', file: null, use: 'La Course des Mille Voiles (lot 6)' },
  fete_nuit: { name: 'La fête ne finit jamais', file: null, use: 'Le spectacle de la nuit, la détente (lot 6)' },
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
    { q: "J'en suis.", mem: 'silas_oui', a: [['npc', 'Je le savais.', { g: 'coin' }], ['npc', "Il me faut trois choses, dans l'ordre qui te plaira : deux uniformes de la garde, le plan de la demeure, et la clé du coffre. Reviens quand tu les auras.", { e: '♪' }]] },
    { q: 'Sans moi.', mem: 'silas_non', a: [['npc', 'Dommage. Vraiment.', { e: '…' }], ['npc', "Et si je te payais d'avance ? Trois cents doublons, tout de suite. Le reste après le coup.", { g: 'coin' }],
      { choose: [
        { q: 'Avec une avance, alors.', mem: 'silas_avance', a: [['npc', 'Voilà qui est parler.', { g: 'coin' }], ['npc', "Trois choses, dans l'ordre qui te plaira : deux uniformes de la garde, le plan de la demeure, la clé du coffre. Reviens quand tu les auras."]] },
        { q: 'Toujours non.', a: [['npc', "L'offre tient. Ma table aussi.", { g: 'wave' }]] },
      ] }] },
  ] },
];
// plus tard, si l'on avait refusé (ou quitté la conversation)
export const SILAS_AGAIN = [
  ['npc', "Tiens, tiens. On revient voir le vieux Silas ?", { g: 'coin' }],
  ['npc', 'La Carte des Sept Courants, la demeure de Valdorne, une belle part du butin. Mon offre tient toujours.'],
  { choose: [
    { q: "D'accord, j'en suis.", mem: 'silas_oui', a: [['npc', "À la bonne heure. Trois choses : deux uniformes de la garde, le plan de la demeure, la clé du coffre. Reviens quand tu les auras.", { e: '♪' }]] },
    { q: 'Toujours pas.', a: [['npc', 'Comme tu voudras. Je ne suis pas pressé. Valdorne, lui, l’est un peu.', { g: 'wave' }]] },
  ] },
];
for (const s of [...SILAS_PITCH, ...SILAS_AGAIN]) if (s && s.choose) for (const c of s.choose) if (c.mem) MEM_KEYS.add(c.mem);
for (const k of ['silas_avance', 'br_route', 'br_denonce']) MEM_KEYS.add(k); // lot 5 : l'avance, la route des Sept Courants, la dénonciation

const SB = 'La Sirène Borgne', DV = 'Demeure d’Octave Valdorne', PM = 'Pont de La Mouche d’Or';
// verbes : bars, fade, title, sub, say, grade, vignette, view | cam, follow, zoom, shake | spawn, remove, walk, face, sit,
// gesture, emo, coin, item | theme, sfx, duck | talk, release
export const CINEMAS = {
  // Scène 1 — la rencontre : la taverne vit, la caméra traverse la salle jusqu'à la table isolée près de la cheminée,
  // Silas joue avec une pièce, remarque le joueur, lui fait signe, se lève, vient à lui ; puis on parle (on décide).
  silas_rencontre: {
    name: 'Rencontre avec Silas', quest: 'Le Plus Grand Braquage (lot 5)', room: SB,
    trigger: { enter: SB, lvl: 17 }, maxDur: 30, // protection du spectateur, au plus (la conversation n'en fait pas partie)
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
  // Scène 2 — la préparation : on a réuni les trois objets ; Silas les examine sur sa table — le plan, les uniformes,
  // la clé — puis un fondu sur la demeure d'Octave Valdorne, qui domine le quartier des Corsaires.
  silas_preparation: {
    name: 'La préparation', quest: 'Le Plus Grand Braquage', room: SB, maxDur: 28, // jouée au retour des préparatifs (server/heist.js)
    actors: { silas: { npc: 'silas' } },
    needs: [{ kind: 'geste', id: 'pointer', lot: 6, fallback: 'reach (le buste qui se penche)' }],
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
      { at: 12.2, do: 'sub', who: 'silas', text: 'Tout y est. Ce soir, on entre chez Valdorne par la grande porte.' },
      { at: 14.6, do: 'fade', to: 1, dur: 0.8 },
      { at: 15.4, do: 'sub', text: '' },
      { at: 15.4, do: 'view', room: -1 }, // dehors : le quartier des Corsaires, et la demeure au-dessus
      { at: 15.4, do: 'zoom', h: 0 },
      { at: 15.4, do: 'grade', col: '255,150,80', a: 0.1, mode: 'soft-light', dur: 0.1 },
      { at: 15.4, do: 'cam', to: { world: [140, 79] }, dur: 0 },
      { at: 15.5, do: 'fade', to: 0, dur: 0.9 },
      { at: 15.5, do: 'cam', to: { world: [151, 67] }, dur: 5.2 }, // la rue des Corsaires, puis l'allée qui monte à la demeure
      { at: 16.2, do: 'sub', who: 'silas', text: 'Valdorne vend ce soir. On y entrera avec ses invités. Rejoins-moi devant chez lui.' },
      { at: 18.4, do: 'title', name: 'La demeure d’Octave Valdorne', tag: 'Quartier des Corsaires' },
      { at: 21.2, do: 'title', name: null },
      { at: 21.5, do: 'fade', to: 1, dur: 0.7 },
      { at: 22.2, do: 'sub', text: '' },
      { at: 22.2, do: 'view', room: null },
      { at: 22.2, do: 'grade', a: 0, dur: 0.1 },
      { at: 22.2, do: 'remove', item: ['plan', 'uniforme', 'cle'] },
      { at: 22.2, do: 'cam', to: { between: ['player', 'silas'] }, dur: 0 },
      { at: 22.3, do: 'fade', to: 0, dur: 0.7 },
      { at: 23.2, do: 'release' },
    ],
  },
  // Scène 3 — la réception : les invités, les gardes, les domestiques, les musiciens, Valdorne qui parade ; Silas,
  // qui se glisse près du joueur pour ses dernières consignes, puis disparaît dans la foule.
  br_reception: {
    name: 'La réception', quest: 'Le Plus Grand Braquage', room: DV, group: true, maxDur: 24,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: 'reception', fade: 1.4 },
      { at: 0, do: 'grade', col: '255,190,120', a: 0.07, mode: 'soft-light', dur: 2 }, // les chandelles
      { at: 0, do: 'cam', to: { tile: [13, 15] }, dur: 0 },
      { at: 0.4, do: 'cam', to: { tile: [5, 4] }, dur: 2.6 },
      { at: 1.6, do: 'emo', who: { crowd: 0 }, e: '♪', dur: 2.2 }, { at: 2.0, do: 'emo', who: { crowd: 1 }, e: '♪', dur: 2.0 }, { at: 2.4, do: 'emo', who: { crowd: 2 }, e: '♪', dur: 1.8 },
      { at: 3.2, do: 'cam', to: { npc: 'valdorne', dy: -8 }, dur: 1.8 },
      { at: 5.0, do: 'say', who: { npc: 'valdorne' }, text: 'Mes amis ! La vente commencera à minuit. D’ici là, buvez : tout est payé.', dur: 3.2 },
      { at: 5.4, do: 'emo', who: { crowd: 3 }, e: 'rire', dur: 1.4 }, { at: 5.8, do: 'emo', who: { crowd: 7 }, e: 'rire', dur: 1.2 },
      { at: 6.0, do: 'sfx', name: 'laugh', vol: 0.7 },
      { at: 8.0, do: 'spawn', id: 'silas', lookOf: 'silas', pos: ['player', 18, -6], dir: 1 },
      { at: 8.0, do: 'cam', to: { between: ['player', 'silas'] }, dur: 1.4 },
      { at: 8.0, do: 'zoom', h: 13, dur: 1.2 }, // la porte est au bas du salon : sans se rapprocher, les bandes noires la cacheraient
      { at: 8.2, do: 'face', id: 'player', to: 'silas' },
      { at: 9.4, do: 'sub', who: 'silas', text: 'Ne fais pas de bruit. Ne touche à rien. Et surtout, ne regarde pas trop longtemps le coffre central.' },
      { at: 13.4, do: 'cam', to: { tile: [31, 12] }, dur: 1.8 }, // la galerie et ses gardes
      { at: 13.4, do: 'zoom', h: 0, dur: 1.2 },
      { at: 14.0, do: 'sub', who: 'silas', text: 'La galerie : deux gardes en faction, une ronde. Les archives sont au bout. Un uniforme t’attend au vestiaire.' },
      { at: 18.6, do: 'cam', to: { between: ['player', 'silas'] }, dur: 1.4 },
      { at: 18.6, do: 'zoom', h: 13, dur: 1.0 },
      { at: 19.2, do: 'sub', who: 'silas', text: 'Moi, je me fonds dans la foule. On se retrouve aux archives.' },
      { at: 20.0, do: 'gesture', id: 'silas', g: 'wave', dur: 1.0 },
      { at: 21.2, do: 'sub', text: '' },
      { at: 21.4, do: 'release' },
      { at: 21.5, do: 'walk', id: 'silas', path: [[16, 13], [21, 10]], speed: 44 },
      { at: 25.0, do: 'remove', id: 'silas' },
    ],
  },
  // Scène 4 — la trahison : le registre, le nom de Silas en bas de la liste, et Silas qui entre. Un silence,
  // des gros plans, il prend les documents, verrouille la porte et file par la fenêtre ; le choix, tout de suite.
  br_trahison: {
    name: 'La trahison', quest: 'Le Plus Grand Braquage', room: DV, group: true, maxDur: 30,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: '', fade: 0.8 },
      { at: 0, do: 'cam', to: { tile: [42, 6] }, dur: 0.8 },
      { at: 0.6, do: 'sfx', name: 'paper' },
      { at: 0.6, do: 'item', key: 'docs', mini: 'plan', pos: [41.6, 6.6], z: 6 },
      { at: 0.8, do: 'zoom', h: 8, dur: 0.9 },
      { at: 1.0, do: 'sub', text: 'Dans le coffre : la Carte des Sept Courants… et un registre relié de cuir.' },
      { at: 4.2, do: 'sub', text: '« Vente du treize : la flotte des Sept Courants, ses mouillages, les capitaines qui commercent avec Port-Lanterne… » Le dernier nom : Silas Virevent.' },
      { at: 8.6, do: 'sub', text: '' },
      { at: 8.8, do: 'sfx', name: 'door', vol: 0.8 },
      { at: 8.8, do: 'spawn', id: 'silas', lookOf: 'silas', pos: [39.4, 4], dir: 2 },
      { at: 9.0, do: 'theme', name: 'trahison', fade: 2.5 },
      { at: 9.2, do: 'face', id: 'player', to: 'silas' },
      { at: 9.2, do: 'walk', id: 'silas', path: [[40.6, 5.6]], speed: 34 },
      { at: 9.2, do: 'cam', to: { between: ['player', 'silas'] }, dur: 1.2 },
      { at: 10.8, do: 'vignette', who: 'silas', a: 0.5, r: 50, dur: 1.2 },
      { at: 11.0, do: 'talk', npc: 'silas', actor: 'silas', lines: 'trahison' },
      { at: 11.2, do: 'gesture', id: 'silas', g: 'reach', to: [41.6, 6.6] },
      { at: 11.4, do: 'remove', item: ['docs'] },
      { at: 11.6, do: 'walk', id: 'silas', path: [[39.4, 4.2]], speed: 52 },
      { at: 12.6, do: 'sfx', name: 'unlock', vol: 0.9 },
      { at: 12.8, do: 'sub', text: 'Clic. Il a verrouillé la porte.' },
      { at: 13.2, do: 'walk', id: 'silas', path: [[44.6, 4.2]], speed: 70 },
      { at: 14.8, do: 'gesture', id: 'silas', g: 'flip' },
      { at: 15.2, do: 'remove', id: 'silas' },
      { at: 15.3, do: 'vignette', a: 0, dur: 0.6 },
      { at: 15.3, do: 'zoom', h: 12, dur: 0.6 }, // on reste dans les archives, seul devant le coffre vide
      { at: 15.4, do: 'sub', text: 'Par la fenêtre, Silas file sur les toits. Décidez, vite !' },
      { at: 16.2, do: 'talk', npc: 'silas', lines: 'choix', end: 'trahison' },
      { at: 16.4, do: 'release' },
    ],
  },
  // Scène 5 — la fuite : un plan sur La Mouche d'Or, à quai au bout de la jetée, puis la main au joueur
  br_fuite: {
    name: 'La poursuite', quest: 'Le Plus Grand Braquage', room: DV, group: true, maxDur: 10,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: 'poursuite', fade: 0.4 },
      { at: 0, do: 'fade', to: 1, dur: 0.35 },
      { at: 0.4, do: 'view', room: -1 },
      { at: 0.4, do: 'cam', to: { world: [160, 124] }, dur: 0 },
      { at: 0.5, do: 'fade', to: 0, dur: 0.4 },
      { at: 0.5, do: 'cam', to: { world: [163, 127] }, dur: 2.8 },
      { at: 0.8, do: 'title', name: 'La Mouche d’Or', tag: 'Le navire de Silas Virevent' },
      { at: 1.0, do: 'sub', text: 'Au bout de la grande jetée, La Mouche d’Or attend son capitaine. S’il y monte avant vous, son équipage sera prêt.' },
      { at: 3.6, do: 'title', name: null },
      { at: 3.6, do: 'fade', to: 1, dur: 0.35 },
      { at: 4.0, do: 'view', room: null },
      { at: 4.0, do: 'cam', to: 'player', dur: 0 },
      { at: 4.1, do: 'fade', to: 0, dur: 0.35 },
      { at: 4.2, do: 'sub', text: 'Par la fenêtre, sur les toits — ou par la ville. Courez !' },
      { at: 5.6, do: 'sub', text: '' },
      { at: 5.6, do: 'release' },
    ],
  },
  // Scène 6 — le boss : le pont de La Mouche d'Or, son équipage, Silas qui donne ses ordres et dégaine
  br_boss: {
    name: 'La Mouche d’Or', quest: 'Le Plus Grand Braquage', room: PM, group: true, maxDur: 12,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: 'silas_boss', fade: 0.6 },
      { at: 0, do: 'cam', to: { tile: [8, 6] }, dur: 0 },
      { at: 0.3, do: 'cam', to: { tile: [24, 6] }, dur: 3.2 }, // le pont : les mâts, les barils, les canons
      { at: 0.6, do: 'sub', text: 'La Mouche d’Or : des barils de poudre, quatre canons, et une chaloupe à la poupe.' },
      { at: 3.6, do: 'cam', to: { mob: 'silas_boss', dy: -10 }, dur: 1.0 },
      { at: 3.8, do: 'sub', text: '' },
      { at: 4.0, do: 'say', who: { mob: 'silas_boss' }, text: 'Messieurs, on a de la visite ! Personne ne quitte ce pont !', dur: 2.8 },
      { at: 4.6, do: 'gesture', id: { mob: 'silas_boss' }, g: 'atk' },
      { at: 5.4, do: 'gesture', id: { mob: 'homme_de_main' }, g: 'atk' },
      { at: 6.6, do: 'title', name: 'Silas Virevent', tag: 'Le filou de La Mouche d’Or' },
      { at: 9.0, do: 'title', name: null },
      { at: 9.2, do: 'cam', to: 'player', dur: 0.8 },
      { at: 10.0, do: 'release' },
    ],
  },
  // Scène 7 — la conclusion : Silas à genoux, la liste, la carte, et le vrai choix ; puis une fin différente pour chaque choix
  br_conclusion: {
    name: 'Le vrai choix', quest: 'Le Plus Grand Braquage', room: PM, maxDur: 20,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: '', fade: 1.2 },
      { at: 0, do: 'spawn', id: 'silas', lookOf: 'silas', pos: 'opts', sit: 1, dir: 1 },
      { at: 0.1, do: 'face', id: 'silas', to: 'player' },
      { at: 0.1, do: 'face', id: 'player', to: 'silas' },
      { at: 0.2, do: 'cam', to: { between: ['player', 'silas'] }, dur: 1.0 },
      { at: 1.2, do: 'zoom', h: 9, dur: 0.8 },
      { at: 2.0, do: 'theme', name: 'silas', fade: 2 },
      { at: 2.2, do: 'talk', npc: 'silas', actor: 'silas', lines: 'conclusion', end: 'fin' },
      { at: 2.3, do: 'theme', name: '$fin' },
      { at: 2.4, do: 'talk', npc: 'silas', actor: 'silas', lines: '$fin' },
      { at: 2.5, do: 'zoom', h: 0, dur: 0.6 },
      { at: 2.6, do: 'release' },
      { at: 2.7, do: 'sit', id: 'silas', on: false, when: 'complice' },
      { at: 2.7, do: 'sit', id: 'silas', on: false, when: 'garder' },
      { at: 3.0, do: 'gesture', id: 'silas', g: 'wave', dur: 1.4, when: 'complice' },
      { at: 3.0, do: 'walk', id: 'silas', path: [[33, 7]], speed: 60, when: 'garder' },
      { at: 3.0, do: 'emo', who: 'silas', e: '…', dur: 2, when: 'denoncer' },
      { at: 7.0, do: 'remove', id: 'silas' },
    ],
  },
  // lot 6 — l'accueil de la Nuit des Mille Voiles : un travelling sur le port décoré, puis Mira se présente. Court : la fête attend.
  fete_accueil: {
    name: 'La Nuit des Mille Voiles', quest: 'La Nuit des Mille Voiles', maxDur: 16,
    actors: {},
    steps: [
      { at: 0, do: 'bars', on: true },
      { at: 0, do: 'theme', name: 'fete', fade: 1.0 },
      { at: 0, do: 'cam', to: { world: [150, 127] }, dur: 0 },
      { at: 0.3, do: 'cam', to: { world: [150, 104] }, dur: 4.2 }, // de la jetée à la place, sous les fanions
      { at: 0.8, do: 'title', name: 'La Nuit des Mille Voiles', tag: 'Port-Lanterne en fête' },
      { at: 3.6, do: 'title', name: null },
      { at: 4.6, do: 'cam', to: { world: [138, 113] }, dur: 2.2 }, // la scène et ses musiciens
      { at: 5.0, do: 'sub', text: 'Des lampions sur la jetée, des fanions de mât en mât, une scène sur la plage : Port-Lanterne fait la fête.' },
      { at: 8.2, do: 'sub', text: '' },
      { at: 8.4, do: 'cam', to: { npc: 'mira', dy: -8 }, dur: 1.2 },
      { at: 9.0, do: 'emo', who: { npc: 'mira' }, e: '♪', dur: 1.6 },
      { at: 9.8, do: 'talk', npc: 'mira', lines: 'mira_welcome' },
      { at: 10.0, do: 'release' },
    ],
  },
};
for (const id of Object.keys(CINEMAS)) MEM_KEYS.add('vu:' + id); // « déjà vue » : gardé dans la sauvegarde, la scène ne se rejoue pas
export const cinemaMaxDur = (id) => (CINEMAS[id] ? CINEMAS[id].maxDur || 30 : 0);
