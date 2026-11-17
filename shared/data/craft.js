// 0.8 : plus d'artisanat ni de récolte, tout s'achète. Il reste le mobilier des maisons,
// et quelques décors où l'on ramasse un objet de quête quand une quête en réclame.
// Mobilier posable dans votre maison (touche B). solid : 1 = bloque le passage
export const STRUCTS = {
  sol: { item: 'sol_planches', floor: 1 },
  tapis: { item: 'tapis', floor: 1 },
  torche: { item: 'torche_base', solid: 0, light: 62 },
  lanterne: { item: 'lanterne_base', solid: 1, light: 74 },
  coffre: { item: 'coffre_base', solid: 1, storage: 1 },
  lit: { item: 'lit', solid: 1, bed: 1 },
  jardiniere: { item: 'jardiniere', solid: 1, planter: 1 },
  tonneau: { item: 'tonneau_deco', solid: 1 },
  caisse: { item: 'caisse_deco', solid: 1 },
  // mobilier des maisons
  table_h: { item: 'table_bois', solid: 1, home: 1 },
  chaise_h: { item: 'chaise_bois', solid: 0, home: 1 },
  etagere_h: { item: 'etagere_bois', solid: 1, home: 1 },
  armoire_h: { item: 'armoire', solid: 1, home: 1 },
  cheminee_h: { item: 'cheminee_pierre', solid: 1, home: 1, light: 90 },
  plante_h: { item: 'plante_pot', solid: 1, home: 1 },
  tableau_h: { item: 'tableau_mer', solid: 1, home: 1 },
  tapis_h: { item: 'tapis_brode', floor: 1, home: 1 },
  biblio_h: { item: 'bibliotheque', solid: 1, home: 1 },
  trophee_h: { item: 'trophee_kraken', solid: 1, home: 1, light: 40 },
  tableau_maitre_h: { item: 'tableau_maitre', solid: 1, home: 1 },
  pet_chat: { item: 'chaton', solid: 0, home: 1, pet: 'chat' },
  pet_chien: { item: 'chien', solid: 0, home: 1, pet: 'chien' },
  pet_perroquet: { item: 'perroquet_vert', solid: 0, home: 1, pet: 'perroquet' },
  pet_singe: { item: 'singe', solid: 0, home: 1, pet: 'singe' },
  pet_kraken: { item: 'bebe_kraken', solid: 0, home: 1, pet: 'kraken' },
};
// ce qu'on peut installer chez soi (en plus du mobilier marqué home)
export const HOME_OK = new Set(['coffre', 'lit', 'tapis', 'torche', 'lanterne', 'tonneau', 'caisse', 'jardiniere', 'sol']);
export const HOME_MAX = 60;       // objets par maison
export const HOME_PRICE = 800;    // prix d'une maison
export const PLANTER_GROW = 300;   // secondes pour qu'une jardinière donne

// décors où l'on ramasse un objet de quête (touche E), seulement si une quête en cours le réclame
export const QUEST_PICK = {
  cristal: { item: 'eclat_cristal', verb: 'Détacher un éclat', regrow: 120 },
  bush: { item: 'herbes', verb: 'Cueillir des herbes', regrow: 60 },
  fern: { item: 'herbes', verb: 'Cueillir des herbes', regrow: 60 },
  driftwood: { item: 'planche_epave', verb: 'Ramasser une planche', regrow: 60 },
};
