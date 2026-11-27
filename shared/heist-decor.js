// 2.0 : la refonte des lieux du Plus Grand Braquage. Construite en TOUT DERNIER (après Port-Lanterne) :
//  - chaque lieu garde son enveloppe (la même pièce, au même endroit, avec la même porte) ; seul l'atelier de Lafleur,
//    trop petit pour un atelier, reçoit une pièce neuve, allouée après toutes les autres (aucune pièce ne bouge) ;
//  - l'intérieur de l'enveloppe est redessiné d'après un plan écrit en clair (les grilles ci-dessous) : murs, pièces,
//    sols, styles de murs, décor accroché à chaque mur, mobilier ;
//  - rien n'est tiré au hasard : chaque objet a sa place, son emprise (toutes ses cases sont solides, pas seulement
//    une), et le plan est vérifié (tests/t_lieux20.mjs : accès, passages, personnages, points d'interaction, scènes) ;
//  - les anciens décors de ces pièces sont retirés ; les identifiants des autres décors, des pièces, des portes et des
//    points d'interaction ne bougent pas (les points sont déplacés, jamais renumérotés).
// Coordonnées des plans : en cases, relatives au coin (x0, y0) de la pièce.
import { TILE, T } from './constants.js';

// les styles de sol (dessinés par client/render/heist-art.js) ; 64 + k : le tapis numéro k de la pièce
export const FL = { PARQUET: 1, PARQUET_D: 2, MARBRE: 3, GALERIE: 4, DALLES: 5, SOMBRE: 6, ENTREPOT: 7, ALLEE: 8, HUMIDE: 9, TUILE_R: 10, ARDOISE: 11, TUILE_O: 12, FAITE_R: 13, FAITE_A: 14, TERRASSE: 15, PONT: 16, GAILLARD: 17, ATELIER: 18, PAVE: 19, CARPET: 64 };
// les décors ajoutés : ground = au sol (sous les personnages), over = au-dessus des personnages (lustres, cordages)
// La solidité ne vient pas d'ici : chaque objet déclare son emprise dans le plan.
export const HEIST_PROPS = {
  cheminee_m: {}, lustre_p: { over: 1 }, fauteuil: {}, canape: {}, table_basse: {}, gueridon: {}, buffet_m: {}, colonne: {},
  console_m: {}, clavecin: {}, estrade_m: { ground: 1 }, horloge: {}, vestiaire_m: {}, buste: {}, statue_m: {}, vitrine: {},
  armure: {}, banquette: {}, rayonnage: {}, bureau_m: {}, coffre_m: {}, cave_liqueurs: {}, vaisselier: {}, table_office: {},
  applique: { ground: 1 }, candelabre: {}, globe_m: {}, chaise_m: {}, harpe: {}, pupitre: {},
  mur_jardin: {}, portail: {}, balustrade: {}, topiaire: {},
  rayon_e: {}, balance: {}, diable: {}, guichet: {}, palan: { over: 1 }, lanterne_p: { over: 1 },
  table_dessin: {}, maquette_g: {}, trappe: { ground: 1 }, casier_vin: {}, echelle: {}, grille_egout: { ground: 1 },
  cheminee_t: {}, lucarne: {}, corde_linge: { over: 1 }, passerelle: { ground: 1 },
  mat_p: {}, vergue: { over: 1 }, barre: {}, ecoutille: { ground: 1 }, fanal: {}, bastingage: {}, cloche_b: {}, cordage_p: { ground: 1 },
};

// ------------------------------------------------------------------ la demeure d'Octave Valdorne (46 × 20)
// s : le grand salon — v : le vestibule — o : l'office des domestiques — j : le salon de jeu — g : la galerie
// a : les archives — c : le cabinet de Valdorne — # : un mur. Les ouvertures portent la lettre de la pièce où elles mènent.
const DEMEURE = [
  //         1         2         3         4
  //0123456789012345678901234567890123456789012345
  'sssssssssssssssssssssssssss#gggggggggg#aaaaaaa', // 0
  'sssssssssssssssssssssssssss#gggggggggg#aaaaaaa', // 1
  'ssssssssssssssssssssssssssssgggggggggg#aaaaaaa', // 2  l'arche du salon à la galerie (x27, rangées 2 à 5)
  'ssssssssssssssssssssssssssssggggggggggaaaaaaaa', // 3  la porte des archives (x38, rangées 3 et 4) : la grille
  'ssssssssssssssssssssssssssssggggggggggaaaaaaaa', // 4
  'ssssssssssssssssssssssssssssgggggggggg#aaaaaaa', // 5
  'sssssssssssssssssssssssssss#gggggggggg#aaaaaaa', // 6
  'sssssssssssssssssssssssssss###gggggg###aaaaaaa', // 7  les refends de la galerie : deux alcôves de chaque côté
  'sssssssssssssssssssssssssss###gggggg###aaaaaaa', // 8
  'sssssssssssssssssssssssssss#gggggggggg#aaaaaaa', // 9
  'sssssssssssssssssssssssssss#gggggggggg#aaaaaaa', // 10
  'sssssssssssssssssssssssssss#gggggggggg########', // 11 le mur entre les archives et le cabinet
  '###oo######vvvvv######jj####gggggggggg########', // 12 le mur du fond des petites pièces (deux rangées : un mur entier)
  '###oo######vvvvv######jj######gggggg###ccccccc', // 13
  'oooooooo#vvvvvvvvv#jjjjjjjj###gggggg###ccccccc', // 14
  'oooooooo#vvvvvvvvv#jjjjjjjj#gggggggggg#ccccccc', // 15
  'oooooooo#vvvvvvvvv#jjjjjjjj#gggggggggg#ccccccc', // 16
  'oooooooo#vvvvvvvvv#jjjjjjjj#ggggggggggcccccccc', // 17 la porte du cabinet (x38, rangées 17 et 18)
  'oooooooo#vvvvvvvvv#jjjjjjjj#ggggggggggcccccccc', // 18
  'oooooooo#vvvvvvvvv#jjjjjjjj#gggggggggg#ccccccc', // 19 la porte d'entrée : sous le vestibule (x13)
];
const DEMEURE_AREAS = {
  s: { name: 'Le grand salon', fl: FL.PARQUET, wall: 'salon' },
  v: { name: 'Le vestibule', fl: FL.MARBRE, wall: 'vestibule' },
  o: { name: 'L’office', fl: FL.DALLES, wall: 'office' },
  j: { name: 'Le salon de jeu', fl: FL.PARQUET_D, wall: 'jeu' },
  g: { name: 'La galerie', fl: FL.GALERIE, wall: 'galerie' },
  a: { name: 'Les archives', fl: FL.SOMBRE, wall: 'archives' },
  c: { name: 'Le cabinet de Valdorne', fl: FL.PARQUET, wall: 'cabinet' },
};
// le décor accroché aux murs : [x0, x1, y du sol sous le mur, décor, variante] — une fenêtre n'est jamais posée sur un mur
// intérieur (ici, seuls le mur du nord du salon, de la galerie et des archives donnent sur le dehors)
const DEMEURE_WALLS = [
  // le salon, mur du nord (sur le jardin) : quatre hautes fenêtres, deux tableaux, deux miroirs, et la cheminée au centre
  [1, 2, 0, 'fenetre', 0], [4, 5, 0, 'tableau', 'mer'], [7, 8, 0, 'fenetre', 0], [10, 10, 0, 'miroir', 0],
  [12, 14, 0, 'portrait_ch', 'valdorne'], [16, 16, 0, 'miroir', 0], [18, 19, 0, 'fenetre', 0], [21, 22, 0, 'tableau', 'paysage'], [24, 25, 0, 'fenetre', 0],
  // la galerie : deux fenêtres et une tapisserie au nord ; un tableau sur chaque refend
  [28, 29, 0, 'fenetre', 2], [31, 34, 0, 'tapisserie', 1], [36, 37, 0, 'fenetre', 2],
  [28, 29, 9, 'tableau', 'bataille'], [36, 37, 9, 'tableau', 'mer'], [28, 29, 15, 'tableau', 'portrait'], [36, 37, 15, 'tableau', 'famille'],
  // les archives : la bibliothèque encastrée, la carte des comptoirs, la fenêtre (celle par où l'on s'enfuit)
  [39, 41, 0, 'biblio', 0], [42, 43, 0, 'carte', 0], [44, 45, 0, 'fenetre', 3],
  // le cabinet de Valdorne (mur intérieur) : livres, et les cartes de ses comptoirs
  [39, 40, 13, 'biblio', 1], [41, 43, 13, 'carte', 1], [44, 45, 13, 'biblio', 2],
  // l'office (mur intérieur) : l'égouttoir à vaisselle, les cuivres près du fourneau
  [0, 2, 14, 'vaisselle', 0], [5, 5, 14, 'cuivres', 0],
  // le vestibule : deux tableaux de part et d'autre de la grande baie
  [9, 10, 14, 'tableau', 'paysage'], [16, 17, 14, 'tableau', 'portrait'],
  // le salon de jeu : une carte marine, une bataille navale
  [19, 21, 14, 'carte', 2], [24, 26, 14, 'tableau', 'bataille'],
];
const DEMEURE_CARPETS = [
  { x0: 7, y0: 3, x1: 19, y1: 9, p: 'rouge' }, // le grand tapis du salon, devant la cheminée
  { x0: 12, y0: 14, x1: 14, y1: 19, p: 'rouge', fringe: false }, // le chemin de l'entrée, jusqu'à la grande baie
  { x0: 20, y0: 15, x1: 25, y1: 18, p: 'vert' }, // le salon de jeu
  { x0: 31, y0: 1, x1: 34, y1: 17, p: 'bleu' }, // le chemin de la galerie
  { x0: 40, y0: 15, x1: 44, y1: 18, p: 'bleu' }, // le cabinet
];
// le mobilier : [type, x, y, largeur, hauteur, variante, options] — (x, y) : la case en haut à gauche de l'emprise
// options : solid: 0 (on passe dessus) ou [[dx, dy], …] (les seules cases solides), dx/dy (décalage du dessin en pixels), heist
const DEMEURE_FURNITURE = [
  // le grand salon — la cheminée de marbre et le portrait du maître de maison au-dessus ; deux coins pour s'asseoir ;
  // l'estrade des musiciens à l'ouest ; le buffet près de l'office ; deux colonnes qui encadrent la grande baie ; deux lustres
  ['cheminee_m', 12, 0, 3, 1, 0],
  ['canape', 2, 1, 2, 1, 0], ['table_basse', 2, 2, 2, 1, 0], ['fauteuil', 1, 2, 1, 1, 2], ['fauteuil', 4, 2, 1, 1, 3],
  ['canape', 22, 1, 2, 1, 1], ['table_basse', 22, 2, 2, 1, 1], ['fauteuil', 21, 2, 1, 1, 2], ['fauteuil', 24, 2, 1, 1, 3],
  ['plante', 0, 0, 1, 1, 0], ['plante', 26, 0, 1, 1, 0],
  ['estrade_m', 0, 6, 4, 4, 0, { solid: 0 }], ['clavecin', 0, 6, 2, 1, 0], ['harpe', 3, 6, 1, 1, 0],
  ['buffet_m', 5, 11, 4, 1, 0], ['colonne', 10, 11, 1, 1, 0], ['colonne', 16, 11, 1, 1, 0],
  ['gueridon', 21, 8, 1, 1, 0], ['gueridon', 9, 9, 1, 1, 1], ['console_m', 25, 11, 2, 1, 0], ['horloge', 26, 8, 1, 1, 0],
  ['lustre_p', 10, 8, 1, 1, 0, { solid: 0 }], ['lustre_p', 16, 8, 1, 1, 0, { solid: 0 }],
  // l'office : le fourneau et ses cuivres, la table de travail, les provisions
  ['fourneau', 6, 14, 1, 1, 0, { dx: 4 }], ['table_office', 1, 16, 2, 1, 0], ['tonneaux', 0, 18, 2, 2, 0, { solid: [[0, 1], [1, 1]] }], ['sacs', 7, 19, 1, 1, 0],
  // le vestibule : le vestiaire (les uniformes de la garde y sont pendus), la console du livre d'or, l'horloge, deux plantes
  ['vestiaire_m', 9, 15, 1, 1, 0], ['console_m', 16, 15, 2, 1, 1], ['horloge', 17, 18, 1, 1, 1], ['candelabre', 9, 18, 1, 1, 0],
  ['plante', 11, 19, 1, 1, 0], ['plante', 15, 19, 1, 1, 0],
  // le salon de jeu du capitaine Ferrant : la table de jeu, ses chaises, la cave à liqueurs, le râtelier
  ['table_jeu', 22, 16, 2, 1, 1], ['chaise_m', 21, 16, 1, 1, 2, { solid: 0 }], ['chaise_m', 24, 16, 1, 1, 3, { solid: 0 }], ['chaise_m', 23, 15, 1, 1, 0, { solid: 0 }],
  ['cave_liqueurs', 26, 15, 1, 1, 0], ['ratelier', 19, 19, 1, 1, 0], ['candelabre', 26, 19, 1, 1, 0],
  // la galerie : deux appliques au nord, deux bustes au pied des refends, deux vitrines dans les alcôves, deux armures,
  // la banquette, la grande statue au fond ; des candélabres qui bordent le tapis
  ['applique', 30, 0, 1, 1, 1, { solid: 0 }], ['applique', 35, 0, 1, 1, 1, { solid: 0 }],
  ['buste', 28, 6, 1, 1, 0], ['buste', 37, 6, 1, 1, 1],
  ['vitrine', 28, 11, 2, 1, 0], ['vitrine', 36, 11, 2, 1, 1], ['candelabre', 30, 12, 1, 1, 1], ['candelabre', 35, 12, 1, 1, 1],
  ['armure', 28, 16, 1, 1, 0], ['armure', 37, 15, 1, 1, 1], ['banquette', 29, 18, 2, 1, 0], ['statue_m', 32, 18, 2, 2, 0, { solid: [[0, 1], [1, 1]] }],
  // les archives : le bureau du registre, le coffre central, les rayonnages, les casiers
  ['bureau_m', 40, 2, 2, 1, 0, { heist: 'registre' }], ['chaise_m', 40, 1, 1, 1, 0, { solid: 0 }],
  ['coffre_m', 42, 6, 1, 1, 0, { heist: 'coffre' }],
  ['rayonnage', 39, 9, 2, 1, 0], ['rayonnage', 44, 9, 2, 1, 1], ['rayonnage', 45, 4, 1, 1, 2], ['rayonnage', 45, 6, 1, 1, 3], ['candelabre', 39, 6, 1, 1, 2],
  // le cabinet de Valdorne : son bureau, son fauteuil, le globe, la cave à liqueurs
  ['bureau_m', 41, 15, 2, 1, 1], ['fauteuil', 41, 14, 1, 1, 0, { solid: 0 }], ['globe_m', 44, 15, 1, 1, 0], ['cave_liqueurs', 45, 18, 1, 1, 1],
  ['plante', 39, 19, 1, 1, 0], ['candelabre', 45, 16, 1, 1, 0],
];

// ------------------------------------------------------------------ la réception (jouée par le client : client/heist.js)
// Des groupes qui parlent entre eux (chaque groupe a son sujet), des places assises, des domestiques qui font la navette
// de l'office au buffet et aux groupes, les musiciens sur leur estrade, le majordome et le portier au vestibule, le
// cuisinier à son fourneau, deux officiers à la table de jeu. Toutes les positions sont sur des cases libres ; les
// chemins sont calculés sur le plan (ils contournent les meubles et les invités) et vérifiés par tests/t_lieux20.mjs.
const L = (skin, hair, hs, top, topCol, pants, hat, hatCol, beard = 0) => ({ skin, hair, hairStyle: hs, top, topCol, pants, boots: 'black', hat, hatCol, beard });
const RECEPTION = {
  // [x, y, direction] : 0 bas, 1 gauche, 2 droite, 3 haut ; le centre du groupe, vers lequel on se tourne
  groups: [
    { k: 'hote', at: [13, 3.2], slots: [[11.6, 3.4, 2], [14.4, 3.5, 1], [12.6, 4.4, 3], [13.6, 4.5, 3]] }, // autour de Valdorne, devant la cheminée
    { k: 'salon_o', at: [2.5, 2.3], sit: 1, slots: [[2.55, 1.05, 0], [3.45, 1.05, 0], [1, 2.05, 2], [4, 2.05, 1]] }, // le coin de l'ouest (assis)
    { k: 'salon_e', at: [22.5, 2.3], sit: 1, slots: [[22.55, 1.05, 0], [23.45, 1.05, 0], [21, 2.05, 2], [24, 2.05, 1]] }, // le coin de l'est (assis)
    { k: 'commerce', at: [8.4, 6.2], slots: [[7.6, 5.6, 2], [9.3, 5.7, 1], [8.4, 7, 3]] }, // sur le tapis, à l'ouest
    { k: 'ragots', at: [17.6, 5.8], slots: [[16.8, 5.4, 2], [18.5, 5.5, 1], [17.2, 6.8, 3], [18.2, 6.8, 3]] }, // sur le tapis, à l'est
    { k: 'buffet', at: [6.9, 10.6], slots: [[5.8, 10.1, 0], [7.4, 10.1, 0], [8.6, 10.2, 1]] }, // devant le buffet
    { k: 'gueridon', at: [21, 8.4], slots: [[20.2, 8.6, 2], [21.8, 8.7, 1], [21, 9.5, 3]] }, // autour du guéridon de l'est
    { k: 'jeu', at: [22.5, 16.1], sit: 1, slots: [[24, 16.05, 1], [23, 15.05, 0]] }, // les officiers, à la table du capitaine
    { k: 'spect', at: [22.5, 16.1], slots: [[25.2, 17.4, 1], [20.4, 17.6, 2]] }, // ceux qui regardent la partie
  ],
  // [rôle, groupe, place, tenue] — l'ordre compte : les trois musiciens d'abord (la scène de la réception s'en sert),
  // puis les invités (le premier rit dans la scène)
  who: [
    ['musicien', null, [1, 7.15, 3], L(0, 3, 'long', 'gilet', 'red', 'navy', 'bonnet', 'red')], // au clavecin
    ['musicien', null, [3, 7.2, 3], L(2, 1, 'court', 'chemise', 'white', 'black', null, null)], // à la harpe
    ['musicien', null, [2, 8.7, 2], L(1, 5, 'queue', 'vareuse', 'green', 'brown', 'plume', 'green')], // au violon, face à la salle
    ['invite', 'hote', 0, L(0, 2, 'long', 'manteau', 'purple', 'white', 'tricorne', 'black')],
    ['invite', 'hote', 1, L(3, 0, 'court', 'capitaine', 'green', 'black', 'plume', 'green')],
    ['invite', 'hote', 2, L(1, 6, 'long', 'chemise', 'yellow', 'white', null, null)],
    ['invite', 'salon_o', 0, L(2, 2, 'long', 'manteau', 'teal', 'white', 'foulard', 'teal')],
    ['invite', 'salon_o', 2, L(0, 4, 'chauve', 'gilet', 'black', 'black', null, null, 2)],
    ['invite', 'salon_e', 1, L(1, 1, 'queue', 'capitaine', 'white', 'black', 'tricorne', 'white')],
    ['invite', 'salon_e', 3, L(0, 3, 'long', 'manteau', 'red', 'black', 'plume', 'red')],
    ['invite', 'commerce', 0, L(3, 4, 'court', 'gilet', 'orange', 'brown', 'bandana', 'orange', 1)],
    ['invite', 'commerce', 1, L(0, 2, 'long', 'chemise', 'purple', 'white', 'foulard', 'purple')],
    ['invite', 'ragots', 0, L(1, 0, 'hirsute', 'vareuse', 'navy', 'navy', 'bonnet', 'navy', 1)],
    ['invite', 'ragots', 1, L(2, 6, 'long', 'manteau', 'green', 'white', 'tricorne', 'green')],
    ['invite', 'ragots', 2, L(0, 5, 'long', 'chemise', 'red', 'white', null, null)],
    ['invite', 'buffet', 0, L(1, 3, 'court', 'manteau', 'brown', 'white', 'tricorne', 'brown', 1)],
    ['invite', 'gueridon', 0, L(2, 4, 'queue', 'gilet', 'teal', 'black', null, null)],
    ['invite', 'gueridon', 1, L(0, 1, 'long', 'manteau', 'yellow', 'white', 'plume', 'yellow')],
    ['officier', 'jeu', 0, L(0, 2, 'court', 'capitaine', 'navy', 'white', 'tricorne', 'navy', 1)],
    ['officier', 'jeu', 1, L(1, 1, 'queue', 'capitaine', 'red', 'white', 'tricorne', 'black')],
    ['invite', 'spect', 0, L(3, 2, 'court', 'gilet', 'green', 'brown', null, null)],
    ['domestique', null, [3.5, 15.2, 0], L(0, 1, 'court', 'tablier', 'white', 'black', null, null), 0], // les deux domestiques et leur tournée
    ['domestique', null, [1.5, 17.2, 3], L(1, 3, 'queue', 'tablier', 'white', 'black', null, null), 1],
    ['cuisinier', null, [6.3, 15.2, 3], L(2, 2, 'court', 'tablier', 'white', 'brown', 'bonnet', 'white', 1)],
    ['majordome', null, [10.6, 17.4, 2], L(0, 4, 'chauve', 'capitaine', 'black', 'black', null, null, 2)],
    ['portier', null, [15.6, 17.6, 1], L(0, 1, 'court', 'manteau', 'navy', 'white', 'morion', null, 1)], // un garde de la maison, à la porte
  ],
  // les tournées des domestiques : de la table de l'office au buffet, puis de groupe en groupe ; ils s'arrêtent à chaque
  // étape (les points sont reliés par des chemins calculés sur le plan)
  rounds: [
    [[2.5, 15.4], [4, 12.5], [6.4, 9.2], [8.4, 8.2], [12.4, 5.6], [19.4, 6.6], [14.4, 9.6], [4, 12.5]],
    [[1.6, 17.6], [3.6, 12.6], [8.6, 9.9], [3, 3.6], [11, 5.4], [22.6, 10.2], [22.8, 3.4], [24.8, 5.2], [16.2, 10.4], [3.6, 12.6]],
  ],
};
// les « moments libres » : un invité quitte son groupe pour un autre (ou pour le buffet), puis y reste
const RECEPTION_TOPICS = ['hote', 'commerce', 'ragots', 'buffet', 'gueridon', 'jeu', 'spect', 'salon_o', 'salon_e'];

// ------------------------------------------------------------------ un chemin sur le plan (partagé avec le client)
// De case en case (parcours en largeur, dans la pièce), puis tendu en segments droits sans obstacle. a, b : [x, y] en
// cases relatives au coin de la pièce (décimales permises) ; bloque : des cases interdites en plus des solides (les places
// des invités, pour que personne ne se marche dessus). Renvoie des points du monde, ou null si c'est impossible.
export function planPath(solid, Wd, r, a, b, bloque, strict = true) {
  const free = (x, y) => !solid[y * Wd + x] && !(bloque && bloque.has(y * Wd + x));
  const clearLine = (ax, ay, bx, by) => { const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4); for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), x = ax + (bx - ax) * t, y = ay + (by - ay) * t; for (const [ox, oy] of [[-0.25, 0], [0.25, 0], [0, -0.2], [0, 0.15]]) if (!free(Math.floor(x + ox), Math.floor(y + oy))) return false; } return true; };
  const W0 = r.w, H0 = r.h, D = new Int16Array(W0 * H0).fill(-1), q = [];
  const ax = Math.floor(a[0]), ay = Math.floor(a[1]), bx = Math.floor(b[0]), by = Math.floor(b[1]);
  const ok = (x, y) => x >= 0 && y >= 0 && x < W0 && y < H0 && free(r.x0 + x, r.y0 + y);
  if (!ok(bx, by) || !ok(ax, ay)) { if (strict) throw new Error(`chemin de ${r.name} : (${a}) → (${b}) part ou arrive dans un obstacle`); return null; }
  D[by * W0 + bx] = 0; q.push(bx, by);
  for (let k = 0; k < q.length; k += 2) { const x = q[k], y = q[k + 1]; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (ok(nx, ny) && D[ny * W0 + nx] < 0) { D[ny * W0 + nx] = D[y * W0 + x] + 1; q.push(nx, ny); } } }
  if (D[ay * W0 + ax] < 0) { if (strict) throw new Error(`chemin de ${r.name} : (${a}) → (${b}) impossible`); return null; }
  const cells = [[a[0], a[1]]]; let x = ax, y = ay;
  while (D[y * W0 + x] > 0) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (ok(nx, ny) && D[ny * W0 + nx] === D[y * W0 + x] - 1) { x = nx; y = ny; break; } } cells.push([x + 0.5, y + 0.4]); }
  cells.push([b[0], b[1]]);
  const out = [cells[0]]; let i = 0; // on tend la corde : du point courant, le plus loin qu'on voie en ligne droite
  while (i < cells.length - 1) { let j = cells.length - 1; while (j > i + 1 && !clearLine(r.x0 + cells[i][0], r.y0 + cells[i][1], r.x0 + cells[j][0], r.y0 + cells[j][1])) j--; out.push(cells[j]); i = j; }
  return out.map(([px, py]) => ({ x: Math.round((r.x0 + px) * TILE), y: Math.round((r.y0 + py) * TILE + 4) }));
}

// ------------------------------------------------------------------ les outils communs
function tools(C) {
  const { tiles, solid, occ, idx, rooms, props, addProp } = C;
  const P = (r, tx, ty) => ({ x: (r.x0 + tx) * TILE + 8, y: (r.y0 + ty) * TILE + 12 });
  const rect = (r, x0, y0, x1, y1) => ({ x0: (r.x0 + x0) * TILE, y0: (r.y0 + y0) * TILE, x1: (r.x0 + x1 + 1) * TILE, y1: (r.y0 + y1 + 1) * TILE });
  // vider l'enveloppe : ses anciens décors s'en vont (sauf ceux qu'on garde), ses cases redeviennent sol ou mur
  const clear = (r, keep = () => false) => {
    for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; if (p.tx >= r.x0 - 1 && p.tx <= r.x0 + r.w && p.ty >= r.y0 - 2 && p.ty <= r.y0 + r.h && !keep(p)) props.splice(i, 1); }
    for (let y = r.y0; y < r.y0 + r.h; y++) for (let x = r.x0; x < r.x0 + r.w; x++) { const i = idx(x, y); occ[i] = 0; solid[i] = tiles[i] === T.IWALL || tiles[i] === T.VOID ? 1 : 0; }
  };
  // le plan : chaque lettre est une case de sol de cette partie ; # un mur ; ' ' le vide (la ruelle, la mer)
  const plan = (r, grid, areas, floorT = T.FLOOR) => {
    if (grid.length !== r.h || grid.some((row) => row.length !== r.w)) throw new Error(`plan de ${r.name} : ${grid.length} × ${grid.map((g) => g.length).join('/')} au lieu de ${r.w} × ${r.h}`);
    const keys = Object.keys(areas);
    r.fl = new Uint8Array(r.w * r.h); r.ws = new Uint8Array(r.w * r.h); r.area = new Uint8Array(r.w * r.h); r.areas = keys.map((k) => areas[k].name);
    r.wsk = [...new Set(keys.map((k) => areas[k].wall).filter(Boolean))];
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
      const ch = grid[y][x], i = idx(r.x0 + x, r.y0 + y), li = y * r.w + x;
      if (ch === '#') { tiles[i] = T.IWALL; solid[i] = 1; continue; }
      if (ch === ' ') { tiles[i] = T.VOID; solid[i] = 1; continue; }
      const A = areas[ch]; if (!A) throw new Error(`plan de ${r.name} : lettre inconnue « ${ch} » (${x}, ${y})`);
      tiles[i] = A.t != null ? A.t : floorT; solid[i] = 0;
      r.fl[li] = A.fl || 0; r.ws[li] = A.wall ? r.wsk.indexOf(A.wall) + 1 : 0; r.area[li] = keys.indexOf(ch) + 1;
    }
    r.noDeco = 1;
  };
  const carpets = (r, list) => { r.carpets = list; list.forEach((c, k) => { for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) if (r.fl[y * r.w + x]) r.fl[y * r.w + x] = FL.CARPET + k; }); };
  const walls = (r, list) => {
    r.wd = r.wd || new Map();
    for (const [x0, x1, yf, k, v] of list) for (let x = x0; x <= x1; x++) r.wd.set((r.x0 + x) + (r.y0 + yf) * 4096, [k, x - x0, x1 - x0 + 1, v]);
  };
  // poser un meuble sur son emprise : toutes les cases de l'emprise sont solides (ou celles qu'on désigne)
  const placed = [];
  const place = (r, [type, x, y, w, h, v, o = {}]) => { // r = null : dehors (coordonnées absolues)
    const X0 = r ? r.x0 : 0, Y0 = r ? r.y0 : 0, name = r ? r.name : 'dehors';
    const ox = (w * TILE) / 2 - 8 + (o.dx || 0), oy = (h - 1) * TILE + (o.dy || 0);
    const p = addProp(type, X0 + x, Y0 + y, v, ox, oy, Object.assign({ fw: w, fh: h, hr: r ? r.id : -1 }, o.heist ? { heist: o.heist } : null));
    const cells = o.solid === 0 ? [] : Array.isArray(o.solid) ? o.solid : [...Array(w * h)].map((_, k) => [k % w, (k / w) | 0]);
    if (o.keepSolid == null) for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const i = idx(X0 + x + xx, Y0 + y + yy); occ[i] = 1; if (r || !o.solid) solid[i] = 0; }
    for (const [dx, dy] of cells) { const i = idx(X0 + x + dx, Y0 + y + dy); if (tiles[i] === T.IWALL || tiles[i] === T.VOID) throw new Error(`${type} posé dans un mur de ${name} (${x + dx}, ${y + dy})`); solid[i] = 1; }
    p.cells = cells; // LStudio : les cases solides du meuble, relatives à sa case
    placed.push({ p, r: r ? r.id : -1, cells: cells.map(([dx, dy]) => [x + dx, y + dy]) });
    return p;
  };
  const navPath = (r, a, b, bloque) => planPath(solid, C.W, r, a, b, bloque);
  return { P, rect, clear, plan, carpets, walls, place, placed, navPath, room: (id) => rooms[id] };
}

// ------------------------------------------------------------------ la demeure
function buildDemeure(C, K) {
  const { npcs, doors, heist: H } = C, { P, rect, clear, plan, carpets, walls, place, navPath } = K;
  const r = K.room(H.rooms.demeure);
  clear(r);
  plan(r, DEMEURE, DEMEURE_AREAS);
  carpets(r, DEMEURE_CARPETS); walls(r, DEMEURE_WALLS);
  for (const f of DEMEURE_FURNITURE) { const p = place(r, f); if (f[6] && f[6].heist) H['prop_' + f[6].heist] = p.id; }
  // les pièces, pour le serveur : au salon, au vestibule, à l'office et au salon de jeu, un invité n'est pas suspect
  H.hall = rect(r, 0, 0, 27, 11); // le salon et l'arche (l'ancien rectangle, gardé pour les anciens appels)
  H.halls = [H.hall, rect(r, 0, 12, 26, 19)]; // et les trois petites pièces du bas (avec leurs baies)
  H.gallery = rect(r, 28, 0, 37, 19);
  H.archives = rect(r, 39, 0, 45, 10);
  H.hallBack = P(r, 13, 10); // reconduit au salon : devant la grande baie du vestibule
  H.archDoorIn = P(r, 40, 4); H.archDoorOut = P(r, 36, 4);
  H.chest = P(r, 42, 6); H.registre = { x: (r.x0 + 41) * TILE, y: (r.y0 + 2) * TILE + 12 }; H.window = { x: (r.x0 + 45) * TILE, y: (r.y0 + 1) * TILE + 4 };
  H.brawl = P(r, 22, 18); // la bagarre éclate au salon de jeu, devant la table du capitaine
  H.gates.archives = [C.idx(r.x0 + 38, r.y0 + 3), C.idx(r.x0 + 38, r.y0 + 4)];
  // les points d'interaction : déplacés (jamais renumérotés)
  const S = (k) => H.spots.find((s) => s.k === k);
  Object.assign(S('vestiaire'), P(r, 9, 16), { r: 22 });
  Object.assign(S('coffre'), P(r, 42, 7), { r: 20 });
  Object.assign(S('fenetre'), { x: (r.x0 + 45) * TILE, y: (r.y0 + 1) * TILE + 6, r: 20 });
  // les personnages : Valdorne reçoit devant sa cheminée ; Ferrant joue aux cartes
  const n = (id) => npcs.find((q) => q.id === id);
  Object.assign(n('valdorne'), P(r, 13, 2), { dir: 0, dir0: 0 });
  Object.assign(n('ferrant'), P(r, 21, 16), { dir: 2, dir0: 2, sit: 1 });
  // les gardes : la galerie (deux en faction, une ronde), et un au salon qui surveille l'arche ; chacun a son chemin
  // vers la bagarre et retour (calculé sur le plan : il contourne les murs et les meubles)
  const G = H.guards.filter((g) => g.room === 'demeure');
  const spec = [
    { at: [30, 6], dir: 2, look: [2, 3, 2, 0], post: 1 }, // à l'entrée de la galerie, au pied du premier refend
    { at: [36, 5], dir: 1, look: [1, 0, 1, 3], post: 1 }, // devant la grille des archives
    { path: [[33, 1], [33, 16]], dir: 0 }, // la ronde, sur le tapis de la galerie
    { at: [25, 6], dir: 2, look: [2, 3, 2, 1], hall: 1 }, // au salon, l'œil sur l'arche de la galerie
  ];
  G.forEach((g, k) => { const s = spec[k]; g.path = (s.path || [s.at]).map(([x, y]) => P(r, x, y)); g.dir = s.dir; g.look = s.look || null; delete g.post; delete g.hall; if (s.post) g.post = 1; if (s.hall) g.hall = 1; });
  // la réception : les figurants (joués par le client), à leurs places ; les tournées des domestiques, calculées ici
  const W2 = (x, y, sit) => ({ x: Math.round((r.x0 + x) * TILE), y: Math.round((r.y0 + y) * TILE + 12 + (sit ? 3 : 0)) });
  const groups = RECEPTION.groups.map((g, k) => ({ id: k, k: g.k, sit: !!g.sit, c: W2(g.at[0], g.at[1]), slots: g.slots.map(([x, y, d]) => ({ ...W2(x, y, g.sit), dir: d, who: -1 })) }));
  const gi = (k) => groups.findIndex((g) => g.k === k);
  H.crowd = RECEPTION.who.map(([role, gk, at, look, round], k) => {
    const c = { role, room: r.id, look, dir: 0 };
    if (gk) { const g = groups[gi(gk)], sl = g.slots[at]; sl.who = k; Object.assign(c, { x: sl.x, y: sl.y, dir: sl.dir, grp: g.id, slot: at, sit: g.sit ? 1 : 0 }); }
    else Object.assign(c, W2(at[0], at[1]), { dir: at[2], round: round ?? null });
    return c;
  });
  const bloque = new Set(); // les places des invités (et des musiciens) : les domestiques passent à côté
  for (const g of groups) for (const sl of g.slots) bloque.add(C.idx(Math.floor(sl.x / TILE), Math.floor((sl.y - 4) / TILE)));
  for (const c of H.crowd) if (c.role === 'musicien' || c.role === 'majordome' || c.role === 'portier' || c.role === 'cuisinier') bloque.add(C.idx(Math.floor(c.x / TILE), Math.floor((c.y - 4) / TILE)));
  const rounds = RECEPTION.rounds.map((pts) => pts.map((pt, k) => ({ stop: { x: Math.round((r.x0 + pt[0]) * TILE), y: Math.round((r.y0 + pt[1]) * TILE + 4) }, path: navPath(r, pt, pts[(k + 1) % pts.length], bloque) })));
  H.reception = { groups, rounds, topics: RECEPTION_TOPICS, brawl: H.brawl, watch: [W2(20.4, 10.2), W2(21.5, 10.5), W2(24.2, 10.4), W2(19.6, 9.6), W2(23.4, 9.8)], refuge: [W2(2, 3.6), W2(5.5, 4), W2(8, 3.6), W2(3.5, 10.4), W2(19, 3.6), W2(20, 10.4)], door: W2(13, 18.6), blocked: [...bloque] };
  void doors;
  return r;
}

// ------------------------------------------------------------------ le quartier de la demeure (dehors, coordonnées absolues)
// La demeure remonte sur la hauteur, au-dessus d'une cour d'honneur close : à l'ouest, deux parterres de part et d'autre
// d'une allée ; au centre, l'allée des lanternes et la fontaine ; à l'est, la terrasse et sa balustrade sur la baie. On
// y entre par la ruelle des Corsaires, entre deux maisons à vendre (qui ne bougent pas), fermée sur la rue par un portail
// gardé. Les six parcelles, leurs portes et la rue ne changent pas d'une case.
export const QUARTIER = { x0: 138, y0: 48, x1: 158, y1: 71 }; // le rectangle redessiné (bornes incluses)
const Q_GROUND = [ // le sol de la cour (rangées 56 à 70, colonnes 139 à 157) : g herbe, c pavé, t terrasse, d terre
  //        1111111111111111111
  //        3444444444455555555
  //        9012345678901234567
  /* 56 */ 'ddddddddddcccdddddd',
  /* 57 */ 'dgggggggggcccttttt.',
  /* 58 */ 'dgggggggggcccttttt.',
  /* 59 */ 'dgggggggggcccttttt.',
  /* 60 */ 'dgggggggggcccttttt.',
  /* 61 */ 'dggggggggccccctttt.',
  /* 62 */ 'dcccccccccccccgggg.',
  /* 63 */ 'dggggggggcccccgggg.',
  /* 64 */ 'dgggggggggcccggggg.',
  /* 65 */ 'dgggggggggcccggggg.',
  /* 66 */ 'dgggggggggcccggggg.',
  /* 67 */ 'dgggggggggcccggggg.',
  /* 68 */ 'dgggggggggcccggggg.',
  /* 69 */ 'dgggggggggcccggggg.',
  /* 70 */ 'ddddddddddd.ddddddd', // le mur du sud (caché derrière les toits des maisons), ouvert sur la ruelle
];
const Q_PROPS = [
  // la façade (déplacée, elle garde son numéro) est posée à part ; ici : le perron, les murs, le portail, la cour
  ['escalier', 150, 56, 1, 1, 0, { solid: 0 }],
  // les murs de la cour : à l'ouest, au sud (derrière les maisons), et les retours vers la façade ; la balustrade sur la baie
  ...[...Array(15)].map((_, k) => ['mur_jardin', 139, 56 + k, 1, 1, 1]),
  ...[...Array(10)].map((_, k) => ['mur_jardin', 140 + k, 70, 1, 1, 0]), ...[...Array(7)].map((_, k) => ['mur_jardin', 151 + k, 70, 1, 1, 0]),
  ...[...Array(4)].map((_, k) => ['mur_jardin', 140 + k, 55, 1, 1, 0]), ['mur_jardin', 139, 55, 1, 1, 2], ['mur_jardin', 157, 55, 1, 1, 2],
  ...[...Array(14)].map((_, k) => ['balustrade', 157, 56 + k, 1, 1, 0]),
  // le portail sur la rue des Corsaires (deux piliers, leurs lanternes, les grilles ouvertes) ; la ruelle reste libre
  ['portail', 149, 76, 3, 1, 0, { solid: [[0, 0], [2, 0]] }],
  // l'allée des lanternes et la fontaine
  ['lamp', 148, 58, 1, 1, 0], ['lamp', 152, 58, 1, 1, 0], ['lamp', 148, 67, 1, 1, 0], ['lamp', 152, 67, 1, 1, 0],
  ['fontaine', 149, 61, 3, 2, 0, { solid: [[0, 1], [1, 1], [2, 1], [1, 0]] }],
  // les parterres de l'ouest : des buis taillés aux angles, un if en cône au centre, des fleurs en bordure
  ['bush', 141, 57, 1, 1, 0], ['bush', 147, 57, 1, 1, 3], ['bush', 141, 61, 1, 1, 3], ['bush', 147, 61, 1, 1, 0], ['topiaire', 144, 59, 1, 1, 0],
  ['bush', 141, 63, 1, 1, 4], ['bush', 147, 63, 1, 1, 0], ['bush', 141, 69, 1, 1, 0], ['bush', 147, 69, 1, 1, 4], ['topiaire', 144, 66, 1, 1, 1],
  ...[142, 143, 145, 146].flatMap((x, k) => [['flower', x, 58, 1, 1, k % 3, { solid: 0 }], ['flower', x, 60, 1, 1, 3 + (k % 3), { solid: 0 }], ['flower', x, 64, 1, 1, (k + 1) % 3, { solid: 0 }], ['flower', x, 68, 1, 1, 3 + ((k + 2) % 3), { solid: 0 }]]),
  // la terrasse sur la baie : un banc, une longue-vue braquée sur le port, deux jardinières
  ['bench', 154, 58, 1, 1, 0], ['longue_vue', 156, 60, 1, 1, 1], ['pot_fleurs', 152, 57, 1, 1, 1], ['pot_fleurs', 156, 57, 1, 1, 2], ['lamp', 155, 61, 1, 1, 0],
  // le parterre de l'est : un palmier, des fleurs
  ['palm', 155, 65, 1, 1, 1], ['bush', 153, 68, 1, 1, 2], ['bush', 156, 68, 1, 1, 5], ...[153, 154, 156].map((x, k) => ['flower', x, 63, 1, 1, k, { solid: 0 }]),
];
function buildQuartier(C, K) {
  const { tiles, zones, solid, occ, idx, inMap, props, doors, heist: H } = C;
  const Q = QUARTIER;
  // 1. la façade : on la déplace (même décor, même numéro), plus large, sur la hauteur
  const fac = props.find((p) => p.type === 'cite' && p.name === 'Demeure d’Octave Valdorne');
  const b = { x: 144, y: 50, w: 13, h: 6, door: 6 };
  // 2. on vide le rectangle : la végétation sauvage s'en va, le sol est refait
  const WILD = new Set(['tree', 'jtree', 'palm', 'bush', 'fern', 'flower', 'rock', 'pebble', 'mushroom', 'reeds', 'deadtree', 'shell', 'driftwood', 'starfish', 'lily']);
  for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; if (p.tx >= Q.x0 && p.tx <= Q.x1 && p.ty >= Q.y0 && p.ty <= Q.y1 && WILD.has(p.type)) props.splice(i, 1); }
  for (let y = Q.y0; y <= Q.y1; y++) for (let x = Q.x0; x <= Q.x1; x++) { const i = idx(x, y); if (tiles[i] === T.WATER || tiles[i] === T.DEEP) continue; occ[i] = 0; solid[i] = 0; }
  // l'ancien emplacement de la façade et son pavé redeviennent jardin ; la hauteur au nord, un tapis d'herbe sous la jungle
  for (let y = Q.y0; y <= 55; y++) for (let x = Q.x0; x <= Q.x1; x++) { const i = idx(x, y); if (tiles[i] === T.WATER || tiles[i] === T.DEEP) continue; if (x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1) tiles[i] = T.DIRT; else if (tiles[i] === T.JUNGLE || tiles[i] === T.ROCK) tiles[i] = T.GRASS; zones[i] = 1; }
  const G = { g: T.GRASS, c: T.COBBLE, t: T.COBBLE, d: T.DIRT };
  Q_GROUND.forEach((row, k) => { const y = 56 + k; for (let j = 0; j < row.length; j++) { const x = 139 + j, i = idx(x, y), ch = row[j]; if (ch === '.') { if (tiles[i] !== T.WATER && tiles[i] !== T.DEEP) tiles[i] = T.SAND; } else tiles[i] = G[ch]; zones[i] = 1; } });
  for (let y = 57; y <= 69; y++) for (const x of [158]) { const i = idx(x, y); if (tiles[i] !== T.WATER && tiles[i] !== T.DEEP) tiles[i] = T.SAND; zones[i] = 1; }
  // la ruelle des Corsaires, pavée jusqu'au portail
  for (let y = 70; y <= 76; y++) { const i = idx(150, y); tiles[i] = T.COBBLE; solid[i] = 0; occ[i] = 0; }
  // la façade, à sa nouvelle place (ses cases sont solides ; la porte s'ouvre au milieu, sur le perron)
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { const i = idx(x, y); solid[i] = 1; occ[i] = 1; tiles[i] = T.DIRT; }
  Object.assign(fac, { tx: b.x, ty: b.y, w: b.w, h: b.h, door: b.door, x: b.x * TILE + 8 + b.w * TILE / 2 - 8, y: b.y * TILE + 14 + b.h * TILE - 14 });
  // la porte de la demeure : dehors, devant le perron (le même numéro de porte ; dedans, rien ne change)
  const d = doors[H.doors.demeure];
  Object.assign(d, { ox: (b.x + b.door) * TILE + 8, oy: (b.y + b.h) * TILE + 8, rx: (b.x + b.door) * TILE + 8, ry: (b.y + b.h) * TILE + 12 });
  H.mansionDoorOut = { x: d.rx, y: d.ry };
  // 3. le mobilier de la cour
  for (const f of Q_PROPS) K.place(null, f);
  // les morts de la jungle n'apparaissent pas dans la cour : leurs points d'apparition reculent, plus haut sur la colline
  for (const m of C.spawns || []) {
    const tx = Math.floor(m.x / TILE), ty = Math.floor(m.y / TILE);
    if (tx < Q.x0 || tx > Q.x1 || ty < Q.y0 || ty > Q.y1) continue;
    for (let y = Q.y0 - 3; y > Q.y0 - 14; y--) { const i = idx(tx, y); if (!solid[i] && zones[i] !== 1 && tiles[i] !== T.WATER && tiles[i] !== T.DEEP) { m.x = tx * TILE + 8; m.y = y * TILE + 8; m.moved = 1; break; } }
  }
  // 4. les gens du quartier (joués par le client) : quatre gardes de la maison (deux au portail, deux au perron), le
  // jardinier, et, le soir, des invités qui montent l'allée jusqu'à la porte
  const W2 = (x, y) => ({ x: Math.round(x * TILE), y: Math.round(y * TILE + 12) });
  const look = (topCol, hat, skin = 0, beard = 0) => ({ skin, hair: 1, hairStyle: 'court', beard, top: 'manteau', topCol, pants: 'white', boots: 'black', hat, hatCol: null });
  H.quartier = {
    box: Q,
    figures: [
      { role: 'garde_portail', ...W2(148.35, 77.1), dir: 0, look: look('navy', 'morion', 0, 1) },
      { role: 'garde_portail', ...W2(151.65, 77.1), dir: 0, look: look('navy', 'morion', 2) },
      { role: 'garde_perron', ...W2(148.6, 56.2), dir: 0, look: look('navy', 'morion', 1, 1) },
      { role: 'garde_perron', ...W2(151.4, 56.2), dir: 0, look: look('navy', 'morion', 3) },
      { role: 'jardinier', ...W2(145.5, 61.8), dir: 3, look: { skin: 2, hair: 3, hairStyle: 'court', top: 'chemise', topCol: 'green', pants: 'brown', boots: 'brown', hat: 'paille', hatCol: null }, path: [W2(142.5, 61.8), W2(146.5, 61.8), W2(146.5, 61.8)] },
    ],
    // le chemin des invités du soir : de la rue au perron, par le portail, la ruelle, l'allée (à gauche de la fontaine)
    arrive: [W2(150.5, 79), W2(150.5, 76.2), W2(150.5, 69.4), W2(150.5, 63.6), W2(148.5, 62.8), W2(148.5, 59.6), W2(150.5, 57.2)],
    guests: [
      { skin: 0, hair: 2, hairStyle: 'long', top: 'manteau', topCol: 'purple', pants: 'white', boots: 'black', hat: 'tricorne', hatCol: 'black' },
      { skin: 1, hair: 6, hairStyle: 'long', top: 'chemise', topCol: 'yellow', pants: 'white', boots: 'black', hat: 'plume', hatCol: 'yellow' },
      { skin: 3, hair: 0, hairStyle: 'court', top: 'capitaine', topCol: 'green', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'green' },
    ],
  };
  void inMap;
  return Q;
}

// ------------------------------------------------------------------ l'entrepôt de la Douane (24 × 12)
// e : le plancher du magasin — l : l'allée de manutention (peinte au sol, de la porte aux rayonnages) — b : le bureau
// du receveur, au nord-est, derrière son guichet (on y range les uniformes)
const ENTREPOT = [
  //         1         2
  //012345678901234567890123
  'eeeeeeeeeeeelleeebbbbbbb', // 0
  'eeeeeeeeeeeelleeebbbbbbb', // 1
  'eeeeeeeeeeeelleeebbbbbbb', // 2
  'eeeeeeeeeeeelleeebbbbbbb', // 3
  'eeeeeeeeeeeelleeebbbbbbb', // 4
  'eeeeeeeeeeeelleeeeeeeeee', // 5
  'eeeeeeeeeeeelleeeeeeeeee', // 6
  'eeeeeeeeeeeelleeeeeeeeee', // 7
  'eeeeeeeeeeeelleeeeeeeeee', // 8
  'llllllllllllllllllllllll', // 9  l'allée principale, d'un bout à l'autre
  'llllllllllllllllllllllll', // 10
  'eeeeeeeeeeeelleeeeeeeeee', // 11 la porte (x12) donne sur la plage des quais
];
const ENTREPOT_AREAS = { e: { name: 'Le magasin', fl: FL.ENTREPOT, wall: 'entrepot' }, l: { name: 'L’allée de manutention', fl: FL.ALLEE, wall: 'entrepot' }, b: { name: 'Le bureau du receveur', fl: FL.SOMBRE, wall: 'entrepot' } };
const ENTREPOT_WALLS = [[2, 3, 0, 'fenetre_s', 0], [9, 10, 0, 'fenetre_s', 0], [14, 15, 0, 'fenetre_s', 0], [18, 19, 0, 'tarifs', 0], [20, 21, 0, 'avis', 0], [22, 23, 0, 'fenetre_s', 0]];
const ENTREPOT_FURNITURE = [
  // les rayonnages contre le mur du nord (on circule devant, rangée 1)
  ['rayon_e', 0, 0, 2, 1, 0], ['rayon_e', 4, 0, 2, 1, 1], ['rayon_e', 6, 0, 2, 1, 2], ['rayon_e', 15, 0, 2, 1, 1],
  // les stocks, par îlots, avec des allées entre eux : caisses de cargaison, tonneaux, sacs, planches
  ['caisses', 2, 3, 2, 2, 0, { solid: [[0, 1], [1, 1], [0, 0], [1, 0]] }], ['tonneaux', 4, 3, 2, 2, 1, { solid: [[0, 1], [1, 1]] }], ['sacs', 2, 5, 1, 1, 0], ['sacs', 3, 5, 1, 1, 1], ['planches', 5, 5, 1, 1, 0],
  ['sacs', 9, 3, 1, 1, 0], ['sacs', 10, 3, 1, 1, 1], ['caisses', 9, 4, 2, 2, 2, { solid: [[0, 0], [1, 0], [0, 1], [1, 1]] }], ['tonneau_d', 11, 5, 1, 1, 0],
  ['tonneaux', 1, 7, 2, 2, 0, { solid: [[0, 1], [1, 1]] }], ['caisses', 4, 7, 2, 2, 1, { solid: [[0, 0], [1, 0], [0, 1], [1, 1]] }],
  ['planches', 9, 7, 1, 1, 0], ['caisses', 10, 7, 2, 2, 0, { solid: [[0, 0], [1, 0], [0, 1], [1, 1]] }],
  // les saisies, à l'est, en attente de la vente aux enchères
  ['caisses', 14, 3, 2, 2, 1, { solid: [[0, 0], [1, 0], [0, 1], [1, 1]] }], ['cage', 15, 6, 1, 1, 0], ['tonneaux', 17, 7, 2, 2, 2, { solid: [[0, 1], [1, 1]] }], ['caisses', 20, 7, 2, 2, 0, { solid: [[0, 0], [1, 0], [0, 1], [1, 1]] }], ['tonneau_d', 23, 7, 1, 1, 1],
  // le quai de chargement, devant la porte : la bascule, le diable, ce qu'on pèse
  ['balance', 15, 11, 1, 1, 0], ['diable', 9, 11, 1, 1, 0], ['barrel', 17, 11, 1, 1, 0], ['barrel', 18, 11, 1, 1, 1], ['sacs', 20, 11, 1, 1, 0], ['sacs', 21, 11, 1, 1, 1], ['crate', 6, 11, 1, 1, 0], ['crate', 7, 11, 1, 1, 2],
  // le bureau du receveur : son registre des saisies, le guichet, la penderie des uniformes (le coffre est gardé)
  ['bureau_m', 18, 1, 2, 1, 0], ['chaise_m', 18, 0, 1, 1, 0, { solid: 0 }], ['vestiaire_m', 23, 1, 1, 1, 0], ['guichet', 19, 5, 3, 1, 0],
  // la lumière : des lanternes pendues aux poutres, et le palan au-dessus de l'allée
  ['lanterne_p', 6, 6, 1, 1, 0, { solid: 0 }], ['lanterne_p', 18, 9, 1, 1, 0, { solid: 0 }], ['lanterne_p', 21, 3, 1, 1, 0, { solid: 0 }], ['palan', 12, 6, 2, 1, 0, { solid: 0 }],
];
function buildEntrepot(C, K) {
  const { heist: H } = C, { P, clear, plan, walls, place } = K;
  const r = K.room(H.rooms.entrepot);
  clear(r, (p) => p.type === 'chest' && p.heist === 'uniformes');
  plan(r, ENTREPOT, ENTREPOT_AREAS); walls(r, ENTREPOT_WALLS);
  for (const f of ENTREPOT_FURNITURE) place(r, f);
  const ch = C.props.find((p) => p.type === 'chest' && p.heist === 'uniformes'); if (ch) C.solid[C.idx(ch.tx, ch.ty)] = 1;
  // les douaniers : la ronde de l'allée, la ronde des stocks, le factionnaire du bureau (son regard porte sur l'allée de l'ouest)
  const G = H.guards.filter((g) => g.room === 'entrepot');
  const spec = [{ path: [[1, 9], [22, 9]], dir: 2 }, { path: [[7, 1], [7, 6], [13, 6], [13, 1]], dir: 0 }, { path: [[19, 3]], dir: 1, look: [1, 0, 1, 3] }];
  G.forEach((g, k) => { g.path = spec[k].path.map(([x, y]) => P(r, x, y)); g.dir = spec[k].dir; g.look = spec[k].look || null; });
  r.amb = 'entrepot';
  return r;
}

// ------------------------------------------------------------------ l'atelier de Corvin Lafleur (une pièce neuve, 14 × 9) et sa cave (12 × 7)
const ATELIER = [...Array(9)].map(() => 'aaaaaaaaaaaaaa');
const ATELIER_AREAS = { a: { name: 'L’atelier', fl: FL.ATELIER, wall: 'atelier' } };
const ATELIER_WALLS = [[2, 4, 0, 'plans', 0], [6, 7, 0, 'fenetre', 3], [9, 11, 0, 'outils', 0], [12, 13, 0, 'plans', 1]];
const ATELIER_FURNITURE = [
  ['fourneau', 0, 0, 1, 1, 0, { dx: 4 }], // le poêle, dans le coin
  ['table_dessin', 5, 2, 2, 1, 0], // la table à dessin, sous la fenêtre : c'est là que Lafleur travaille
  ['maquette_g', 8, 5, 2, 1, 0], // la maquette de la demeure Valdorne, presque achevée
  ['workbench', 10, 1, 1, 1, 0], ['planches', 11, 1, 1, 1, 0], // l'établi, sous le tableau à outils
  ['rouleaux', 13, 3, 1, 1, 0], ['etagere', 13, 5, 1, 1, 1], // les rouleaux de plans, l'étagère des carnets
  ['bureau_m', 10, 7, 2, 1, 1], // le bureau et son tiroir (le plan de la demeure y dort)
  ['trappe', 1, 4, 1, 1, 0, { solid: 0 }], ['tonneau_d', 0, 6, 1, 1, 0], ['plante', 0, 8, 1, 1, 0],
  ['lanterne_p', 7, 4, 1, 1, 0, { solid: 0 }],
];
const CAVE = [...Array(7)].map(() => 'hhhhhhhhhhhh');
const CAVE_AREAS = { h: { name: 'La cave', fl: FL.HUMIDE, wall: 'cave' } };
const CAVE_WALLS = [[3, 3, 0, 'soupirail', 0], [6, 6, 0, 'niche', 0], [10, 10, 0, 'soupirail', 1]];
const CAVE_FURNITURE = [
  ['echelle', 1, 0, 1, 1, 0, { solid: 0 }], // l'échelle qui remonte à la trappe de l'atelier
  ['casier_vin', 4, 0, 2, 1, 0], ['tonneaux', 8, 0, 2, 2, 0, { solid: [[0, 1], [1, 1]] }], ['tonneau_d', 11, 0, 1, 1, 1], ['tonneau_d', 11, 2, 1, 1, 0],
  ['caisses', 0, 5, 2, 2, 1, { solid: [[0, 1], [1, 1]] }], ['grille_egout', 6, 5, 1, 1, 0, { solid: 0 }], // la bouche d'égout : c'est par là que montent les crabes
  ['lanterne_p', 5, 3, 1, 1, 1, { solid: 0 }],
];
function buildAtelier(C, K) {
  const { tiles, zones, solid, occ, idx, rooms, doors, npcs, chests, roomGrid, alloc, props, heist: H } = C, { P, clear, plan, walls, place } = K;
  const old = rooms[H.rooms.atelier];
  // la pièce neuve, allouée après toutes les autres (aucune pièce existante ne bouge)
  const w = 14, h = 9, [x0, y0] = alloc(w, h);
  for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); if (tiles[i] !== T.VOID || roomGrid[i] >= 0) throw new Error('l’atelier neuf chevauche une autre pièce'); }
  for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) { const i = idx(x, y); tiles[i] = T.IWALL; zones[i] = old ? C.zones[idx(old.x0, old.y0)] : 32; solid[i] = 1; occ[i] = 0; }
  const r = { id: rooms.length, name: 'Atelier de Corvin Lafleur', kind: 'house', x0, y0, w, h, heist: 'atelier', atelier: 1 };
  rooms.push(r);
  for (let y = y0 - 2; y <= y0 + h; y++) for (let x = x0 - 1; x <= x0 + w; x++) roomGrid[idx(x, y)] = r.id;
  plan(r, ATELIER, ATELIER_AREAS); walls(r, ATELIER_WALLS);
  const ex = 7; tiles[idx(x0 + ex, y0 + h)] = T.EXIT; solid[idx(x0 + ex, y0 + h)] = 0;
  // la porte de la maison (dehors, rien ne change) mène désormais à l'atelier neuf ; l'ancienne pièce garde son numéro
  for (const d of doors) if (d.room === old.id) Object.assign(d, { room: r.id, name: r.name, ix: (x0 + ex) * TILE + 8, iy: (y0 + h - 1) * TILE + 10, ex: (x0 + ex) * TILE + 8, ey: (y0 + h) * TILE + 8 });
  old.name = 'Maison du charpentier'; delete old.atelier; delete old.heist;
  H.rooms.atelier = r.id;
  H.legacy = [{ room: old.id, to: { x: (x0 + ex) * TILE + 8, y: (y0 + h - 1) * TILE + 10 } }]; // un pirate sauvegardé dans l'ancienne pièce reparaît ici
  // l'ancienne pièce : on retire le bureau et la trappe du braquage ; son coffre suit l'atelier (même numéro)
  const ch = chests.find((c) => c.tx >= old.x0 && c.tx < old.x0 + old.w && c.ty >= old.y0 && c.ty < old.y0 + old.h);
  H.decorMoved = []; // ce qui quitte l'ancienne pièce (pour tests/t_monde90.mjs : rien d'autre ne disparaît hors des lieux redessinés)
  for (let i = props.length - 1; i >= 0; i--) { const p = props[i]; if (p.heist === 'bureau') { solid[idx(p.tx, p.ty)] = 0; occ[idx(p.tx, p.ty)] = 0; props.splice(i, 1); H.decorMoved.push({ id: p.id, type: p.type, why: 'retiré (le bureau du braquage est dans l’atelier neuf)' }); } }
  for (const f of ATELIER_FURNITURE) { const p = place(r, f); if (f[0] === 'bureau_m') { p.heist = 'bureau'; H.prop_bureau = p.id; } }
  if (ch) { H.decorMoved.push({ id: ch.id, type: ch.type, why: 'déplacé dans l’atelier neuf (même coffre, même numéro)' }); solid[idx(ch.tx, ch.ty)] = 0; occ[idx(ch.tx, ch.ty)] = 0; Object.assign(ch, { tx: x0 + 13, ty: y0 + 7, x: (x0 + 13) * TILE + 8, y: (y0 + 7) * TILE + 12 }); solid[idx(ch.tx, ch.ty)] = 1; occ[idx(ch.tx, ch.ty)] = 1; }
  // Lafleur, à sa table à dessin (le dos tourné au bureau), et les points d'interaction
  H.lafleur = { ...P(r, 5.5, 3), desk: P(r, 10.5, 7) };
  Object.assign(npcs.find((n) => n.id === 'lafleur'), { x: H.lafleur.x, y: H.lafleur.y, dir: 3, dir0: 3 });
  const S = (k) => H.spots.find((q) => q.k === k);
  Object.assign(S('bureau'), { room: r.id, ...P(r, 10.5, 8), r: 18 });
  Object.assign(S('trappe'), { room: r.id, ...P(r, 1, 4), r: 16 });
  H.atelierIn = P(r, 2, 4);
  r.amb = 'atelier';
  // la cave : le même endroit, redessinée
  const cv = rooms[H.rooms.cave];
  cv.anchorRoom = r.id;
  clear(cv); plan(cv, CAVE, CAVE_AREAS, T.STONEF); walls(cv, CAVE_WALLS);
  for (const f of CAVE_FURNITURE) place(cv, f);
  Object.assign(S('echelle'), P(cv, 1, 1), { r: 16 });
  H.caveIn = P(cv, 2, 1);
  H.crabs = [[4, 3], [7, 4], [9, 3], [6, 6], [3, 5], [10, 5]].map(([x, y]) => P(cv, x, y));
  cv.amb = 'cave';
  return r;
}

// ------------------------------------------------------------------ les toits et les ruelles de Port-Lanterne (96 × 18)
// En haut (rangées 0 à 6) : cinq toitures, chacune la sienne (tuiles rouges, ardoise, une terrasse, tuiles canal, puis
// tuiles rouges et la terrasse d'où l'on descend aux quais), coupées par quatre ruelles à sauter ; Silas court sur le
// faîte (rangée 3). Au milieu (7 à 9) : les façades des maisons, vues de la ruelle (fenêtres, portes, enseignes, deux
// échelles, une mansarde). En bas (10 à 17) : les ruelles, leurs caisses, leurs lanternes, une cour et son puits.
const TOITS_GAPS = [15, 34, 53, 72];
function toitsGrid() {
  const seg = (x) => (x < 15 ? 'A' : x < 34 ? 'B' : x < 53 ? 'C' : x < 72 ? 'D' : x < 88 ? 'E' : 'F');
  const rows = [];
  for (let y = 0; y < 18; y++) {
    let row = '';
    for (let x = 0; x < 96; x++) {
      if (y <= 6 && TOITS_GAPS.some((g) => x >= g && x <= g + 2)) { row += y === 5 && x >= 34 && x <= 36 ? 'p' : ' '; continue; } // la ruelle, en bas ; une passerelle de planches sur la deuxième
      if (y >= 7 && y <= 9) { row += '#'; continue; }
      if (y >= 10) { row += x < 24 ? '1' : x < 48 ? '2' : x < 72 ? '3' : '4'; continue; }
      const s = seg(x);
      row += y === 3 ? s.toLowerCase() : s;
    }
    rows.push(row);
  }
  return rows;
}
const TOITS_AREAS = {
  A: { name: 'Les toits rouges', fl: FL.TUILE_R, wall: 'lointain' }, a: { name: 'Le faîte', fl: FL.FAITE_R, wall: 'lointain' },
  B: { name: 'Les toits d’ardoise', fl: FL.ARDOISE, wall: 'lointain' }, b: { name: 'Le faîte d’ardoise', fl: FL.FAITE_A, wall: 'lointain' },
  C: { name: 'La terrasse', fl: FL.TERRASSE, wall: 'lointain' }, c: { name: 'La terrasse', fl: FL.TERRASSE, wall: 'lointain' },
  D: { name: 'Les tuiles canal', fl: FL.TUILE_O, wall: 'lointain' }, d: { name: 'Le faîte', fl: FL.FAITE_R, wall: 'lointain' },
  E: { name: 'Les toits du port', fl: FL.TUILE_R, wall: 'lointain' }, e: { name: 'Le faîte', fl: FL.FAITE_R, wall: 'lointain' },
  F: { name: 'La terrasse du port', fl: FL.TERRASSE, wall: 'lointain' }, f: { name: 'La terrasse du port', fl: FL.TERRASSE, wall: 'lointain' },
  p: { name: 'La passerelle', fl: FL.TERRASSE, wall: 'lointain' },
  1: { name: 'La ruelle des Tonneliers', fl: FL.PAVE, wall: 'facade_ocre' }, 2: { name: 'La ruelle des Lavandières', fl: FL.PAVE, wall: 'facade_rose' },
  3: { name: 'La ruelle du Guet', fl: FL.PAVE, wall: 'facade_bleue' }, 4: { name: 'La ruelle des Calfats', fl: FL.PAVE, wall: 'facade_brique' },
};
function toitsWalls() { // les façades vues de la ruelle : une composition par maison, sans hasard
  const L = [];
  const house = (x0, kinds) => kinds.forEach(([dx, k, v, n = 1]) => L.push([x0 + dx, x0 + dx + n - 1, 10, k, v]));
  house(0, [[1, 'rue_fenetre', 0], [3, 'rue_porte', 0], [5, 'rue_fenetre', 1], [8, 'enseigne', 0], [9, 'rue_porte', 1], [11, 'rue_fenetre', 2], [13, 'rue_fenetre', 3]]);
  house(16, [[1, 'rue_fenetre', 1], [3, 'rue_fenetre', 0], [6, 'rue_porte', 2], [9, 'echelle_m', 0], [11, 'rue_fenetre', 2], [13, 'enseigne', 1], [14, 'rue_porte', 0], [17, 'rue_fenetre', 3], [19, 'rue_fenetre', 1]]);
  house(37, [[0, 'rue_fenetre', 0], [3, 'rue_porte', 1], [5, 'rue_fenetre', 3], [7, 'fenetre_s', 0, 2], [10, 'rue_fenetre', 1], [12, 'enseigne', 2], [13, 'rue_porte', 2], [16, 'rue_fenetre', 0]]);
  house(55, [[1, 'rue_fenetre', 2], [3, 'rue_porte', 0], [6, 'rue_fenetre', 1], [8, 'echelle_m', 0], [10, 'rue_fenetre', 3], [12, 'rue_porte', 1], [15, 'enseigne', 0], [17, 'rue_fenetre', 0]]);
  house(74, [[1, 'rue_fenetre', 1], [3, 'rue_fenetre', 2], [5, 'rue_porte', 2], [8, 'enseigne', 1], [9, 'rue_fenetre', 0], [12, 'rue_porte', 0], [14, 'rue_fenetre', 3], [17, 'rue_fenetre', 1], [19, 'rue_porte', 1]]);
  return L;
}
const TOITS_FURNITURE = [
  // les cheminées (aux mêmes cases qu'avant : Silas court entre elles, sur le faîte) ; les lucarnes de l'ardoise
  ...[[8, 5], [22, 5], [29, 1], [41, 1], [47, 1], [60, 5], [67, 1], [79, 1], [86, 5]].map(([x, y], k) => ['cheminee_t', x, y, 1, 1, k % 3]),
  ['lucarne', 20, 1, 1, 1, 0], ['lucarne', 26, 5, 1, 1, 1], ['lucarne', 31, 5, 1, 1, 0], ['lucarne', 63, 1, 1, 1, 1], ['lucarne', 44, 5, 1, 1, 0],
  // la terrasse : des pots, du linge tendu, une table ; la passerelle sur la deuxième ruelle
  ['pot_fleurs', 38, 1, 1, 1, 0], ['pot_fleurs', 51, 5, 1, 1, 3], ['table_ext', 49, 1, 1, 1, 1], ['corde_linge', 39, 0, 4, 1, 0, { solid: 0 }],
  ['passerelle', 34, 5, 3, 1, 0, { solid: 0 }],
  // la terrasse du port, au bout : on y descend aux quais
  ['pot_fleurs', 89, 1, 1, 1, 2], ['escalier', 95, 3, 1, 1, 1, { solid: 0 }],
  // les ruelles : caisses et tonneaux contre les façades, du linge tendu d'un mur à l'autre, des lanternes, une cour et son puits
  ['crate', 10, 10, 1, 1, 0], ['barrel', 11, 10, 1, 1, 1], ['barrel', 20, 17, 1, 1, 0], ['crate', 31, 10, 1, 1, 1], ['crate', 38, 17, 1, 1, 2], ['barrel', 39, 17, 1, 1, 2],
  ['caisses', 50, 10, 2, 1, 1, { solid: [[0, 0], [1, 0]] }], ['barrel', 58, 17, 1, 1, 0], ['tonneaux', 68, 16, 2, 2, 0, { solid: [[0, 1], [1, 1]] }], ['crate', 77, 17, 1, 1, 0], ['barrel', 88, 10, 1, 1, 1],
  ['well', 46, 14, 1, 1, 0], ['bench', 43, 16, 1, 1, 0], ['pot_fleurs', 49, 16, 1, 1, 1],
  ['lamp', 5, 16, 1, 1, 0], ['lamp', 30, 16, 1, 1, 0], ['lamp', 55, 16, 1, 1, 0], ['lamp', 80, 16, 1, 1, 0],
  ['corde_linge', 13, 11, 4, 1, 1, { solid: 0 }], ['corde_linge', 34, 12, 4, 1, 0, { solid: 0 }], ['corde_linge', 69, 12, 4, 1, 1, { solid: 0 }], ['corde_linge', 84, 11, 4, 1, 0, { solid: 0 }],
  ['porche', 93, 13, 3, 1, 0, { solid: [[0, 0], [2, 0]] }],
];
function buildToits(C, K) {
  const { heist: H } = C, { P, clear, plan, walls, place } = K;
  const r = K.room(H.rooms.toits);
  clear(r);
  plan(r, toitsGrid(), TOITS_AREAS); walls(r, toitsWalls());
  for (const f of TOITS_FURNITURE) place(r, f);
  r.outdoor = 1; r.voidStyle = 'ruelle'; r.amb = 'ville';
  void P;
  return r;
}

// ------------------------------------------------------------------ le pont de La Mouche d'Or (36 × 14)
// d : le pont principal — q : la dunette (à la poupe, la barre et la chaloupe) — ' ' : la mer (la proue s'affine)
function pontGrid() {
  const rows = [];
  const bow = [4, 3, 2, 1]; // à la proue, combien de rangées de mer en haut et en bas, colonne par colonne
  for (let y = 0; y < 14; y++) {
    let row = '';
    for (let x = 0; x < 36; x++) {
      const k = x < 4 ? bow[x] : 0, sea = y < k || y > 13 - k || (x === 35 && (y === 0 || y === 13));
      row += sea ? ' ' : x >= 28 ? 'q' : 'd';
    }
    rows.push(row);
  }
  return rows;
}
const PONT_AREAS = { d: { name: 'Le pont', fl: FL.PONT }, q: { name: 'La dunette', fl: FL.GAILLARD } };
const PONT_FURNITURE = [
  // les deux mâts (aux places des anciens piliers) et leur gréement, au-dessus des têtes
  ['mat_p', 10, 6, 1, 1, 0], ['mat_p', 24, 6, 1, 1, 1], ['vergue', 10, 13, 1, 1, 0, { solid: 0 }], ['vergue', 24, 13, 1, 1, 1, { solid: 0 }],
  // les canons et les barils de poudre (aux mêmes cases : le combat s'en sert)
  ['cannon', 8, 0, 1, 1, 0], ['cannon', 8, 13, 1, 1, 1], ['cannon', 26, 0, 1, 1, 0], ['cannon', 26, 13, 1, 1, 1],
  ...[[6, 1], [6, 12], [17, 1], [17, 12], [29, 1], [29, 12]].map(([x, y]) => ['tonneau_d', x, y, 1, 1, 1]),
  // la dunette : la barre, la chaloupe (Silas s'y enfuit), la cloche, les fanaux de poupe
  ['barre', 31, 7, 1, 1, 0], ['boat', 34, 7, 1, 1, 0], ['cloche_b', 28, 2, 1, 1, 0], ['fanal', 34, 1, 1, 1, 0], ['fanal', 34, 12, 1, 1, 0],
  // le pont : le cabestan, l'écoutille, les glènes de cordage, la cargaison saisie (arrimée contre le bastingage)
  ['cabestan', 18, 11, 1, 1, 0], ['ecoutille', 17, 6, 2, 2, 0, { solid: 0 }], ['cordage_p', 4, 8, 1, 1, 0, { solid: 0 }], ['cordage_p', 20, 2, 1, 1, 1, { solid: 0 }],
  ['caisses', 11, 12, 2, 2, 2, { solid: [[0, 1], [1, 1]] }], ['tonneaux', 31, 11, 2, 2, 1, { solid: [[0, 1], [1, 1]] }],
  // le bastingage de tribord, au premier plan (celui de bâbord est le mur du fond)
  ...[...Array(31)].map((_, k) => ['bastingage', 4 + k, 13, 1, 1, k === 30 ? 2 : k % 4 === 0 ? 1 : 0, { solid: 0 }]),
];
function buildPont(C, K) {
  const { props, heist: H } = C, { P, clear, plan, place } = K;
  const r = K.room(H.rooms.pont);
  clear(r, (p) => p.heistBar != null); // les barricades : le serveur les dresse (elles restent où elles étaient)
  plan(r, pontGrid(), PONT_AREAS);
  for (const f of PONT_FURNITURE) place(r, f);
  for (const p of props) if (p.heistBar != null && p.tx >= r.x0 && p.tx < r.x0 + r.w && p.ty >= r.y0 && p.ty < r.y0 + r.h) C.solid[C.idx(p.tx, p.ty)] = 0;
  r.outdoor = 1; r.voidStyle = 'mer'; r.amb = 'navire';
  void P;
  return r;
}

// ------------------------------------------------------------------ l'appel, à la fin de generateWorld
export function buildHeistDecor(C) {
  const K = tools(C);
  const out = { rebuilt: [] };
  out.rebuilt.push(buildDemeure(C, K).id);
  out.quartier = buildQuartier(C, K);
  out.rebuilt.push(buildEntrepot(C, K).id);
  out.rebuilt.push(buildAtelier(C, K).id, C.heist.rooms.cave);
  out.rebuilt.push(buildToits(C, K).id);
  out.rebuilt.push(buildPont(C, K).id);
  // les rectangles redessinés (pour tests/t_monde90.mjs : hors d'eux, le monde ne doit pas bouger d'une case)
  const env = (r) => ({ x0: r.x0 - 1, y0: r.y0 - 2, x1: r.x0 + r.w, y1: r.y0 + r.h });
  out.moved = C.heist.decorMoved || [];
  out.envelopes = [...out.rebuilt.map((id) => ({ room: C.rooms[id].name, ...env(C.rooms[id]) })), { room: 'Le quartier de la demeure', ...QUARTIER }];
  // le relevé des meubles posés (pour les vérifications)
  out.placed = K.placed.map((q) => ({ id: q.p.id, type: q.p.type, room: q.r, cells: q.cells }));
  C.heist.decor = out;
  return out;
}
