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
// 1.0 : collection, sécurité et trophées
Object.assign(STRUCTS, {
  coffre_fort: { item: 'coffre_fort', solid: 1, home: 1, vault: 1 },
  piege: { item: 'piege_loup', solid: 0, home: 1, trap: 1 },
  boite_musique: { item: 'boite_musique', solid: 1, home: 1, music: 1 },
  maquette: { item: 'bateau_bouteille', solid: 1, home: 1 },
  globe: { item: 'globe_terrestre', solid: 1, home: 1 },
  lustre: { item: 'lustre', solid: 0, home: 1, light: 110 },
  statuette: { item: 'statuette_or', solid: 1, home: 1 },
  portrait: { item: 'portrait_capitaine', solid: 1, home: 1 },
  carte_murale: { item: 'carte_encadree', solid: 1, home: 1 },
  bataille: { item: 'tableau_bataille', solid: 1, home: 1 },
});
// les trophées de boss : un par seigneur vaincu, à exposer
export const TROPHIES = {
  boss: ['trophee_barbe', 'Tricorne de Barbe-Cendre', 'Brûlé aux bords, il sent encore la cendre.'],
  roi_squelette: ['trophee_roi_os', 'Couronne du Souverain de l’Antre', 'Une couronne d’os, trop lourde pour un vivant.'],
  bourreau: ['trophee_bourreau', 'Cagoule du Bourreau', 'Le Juge de la Forêt des Pendus ne jugera plus personne.'],
  reine_sirenes: ['trophee_sirenes', 'Écaille de la Reine des Sirènes', 'Elle chante encore quand le vent souffle.'],
  general_os: ['trophee_general', 'Étendard de la Légion Blanchie', 'L’étendard du Général d’Os, enfin baissé.'],
  docteur_corbeau: ['trophee_corbeau', 'Masque du Docteur Corbeau', 'Le bec est vide. Fort heureusement.'],
  brasier: ['trophee_brasier', 'Cœur du Brasier', 'Une braise éternelle sous une cloche de verre.'],
  frere_fer: ['trophee_freres', 'Heaumes des Frères Ferrailleurs', 'Deux casques cabossés, côte à côte, comme eux.'],
  comte_vespere: ['trophee_comte', 'Cape du Comte Vespère', 'Elle ondule seule, dans les nuits sans vent.'],
  roi_sans_couronne: ['trophee_malo', 'Sceptre de Malo le Rouge', 'Le sceptre d’un roi qui n’aurait jamais dû l’être.'],
  capitaine_naufrageur: ['trophee_grandfeu', 'Lanterne de Grand-Feu', 'Elle n’attire plus aucun navire sur les récifs.'],
  reine_mangrove: ['trophee_mangrove', 'Couronne de racines', 'La Reine de la Mangrove l’a portée cent ans.'],
};
for (const [, [id]] of Object.entries(TROPHIES)) STRUCTS['t_' + id] = { item: id, solid: 1, home: 1, light: 36, trophy: 1 };
// 1.0 : huit catégories de propriétés — prix, mobilier, coffre, coffres supplémentaires, sécurité, avantage
export const PROPERTY = {
  cabane: { name: 'Petite cabane', price: 450, furniture: 30, store: 24, extra: 1, guard: 0, perk: 'Modeste et discrète : personne ne pense à la cambrioler.', guardTxt: 'discrète' },
  ville: { name: 'Maison de ville', price: 800, furniture: 60, store: 48, extra: 2, guard: 0, perk: 'Au cœur d’une ville : les voisins veillent, la Flamme protège.' },
  villa: { name: 'Villa de planteur', price: 2600, furniture: 100, store: 64, extra: 3, guard: 0.05, perk: 'Vaste et claire, une véranda sur les champs de canne.' },
  manoir: { name: 'Manoir', price: 7500, furniture: 160, store: 96, extra: 4, guard: 0.1, perk: 'Le plus grand logis de l’archipel. Une cible de choix pour les voleurs, et des gardes pour la défendre.' },
  phare: { name: 'Phare', price: 4200, furniture: 70, store: 64, extra: 2, guard: 0.15, perk: 'Tout là-haut, on voit venir les navires de très loin. Ponton privé.' },
  refuge: { name: 'Refuge dans la jungle', price: 1900, furniture: 60, store: 48, extra: 2, guard: 0.2, perk: 'Caché sous les arbres écarlates : les voleurs le trouvent rarement.' },
  marais: { name: 'Cabane dans les marais', price: 1300, furniture: 45, store: 40, extra: 2, guard: 0.1, perk: 'Sur pilotis, au-dessus de l’eau : ponton privé pour votre navire.' },
  fortin: { name: 'Fortin sur un îlot', price: 11000, furniture: 130, store: 96, extra: 3, guard: 0.35, perk: 'Des murs, des canons, la mer tout autour : presque imprenable.' },
};
export const HOME_LIMIT = 2; // propriétés par pirate
export const RESALE = 0.6;   // part du prix rendue à la revente
// catégorie des maisons d'avant la 1.0 (leurs intérieurs ne changent pas)
export function plotCategory(pl) { return pl.cat || (pl.k >= 16 && pl.k <= 18 ? 'cabane' : 'ville'); }
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
