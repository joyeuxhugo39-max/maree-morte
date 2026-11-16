// Récolte, recettes d'artisanat et structures de base.
export const STATIONS = { main: 'À la main', feu: 'Feu de camp', etabli: 'Établi', forge: 'Forge' };
export const CATEGORIES = { mat: 'Matériaux', outil: 'Outils', arme: 'Armes', armure: 'Armures', talisman: 'Talismans', cuisine: 'Cuisine', base: 'Construction', nav: 'Navigation', maison: 'Maison' };

// Décors récoltables : outil requis (null = à la main), butin [objet, min, max] ou [objet, chance]
export const HARVEST = {
  palm: { give: [['fibre', 2, 3], ['noix_coco', 0.35]], regrow: 150, verb: 'Récolter' },
  tree: { tool: 'axe', give: [['bois', 2, 3], ['baies', 0.15]], regrow: 240, verb: 'Abattre' },
  jtree: { tool: 'axe', give: [['bois', 3, 4], ['resine', 0.4]], regrow: 260, verb: 'Abattre' },
  deadtree: { tool: 'axe', give: [['bois', 2, 3], ['champignon_luisant', 0.15]], regrow: 260, verb: 'Abattre' },
  rock: { give: [['silex', 1, 2]], pick: [['pierre', 2, 3], ['minerai_fer', 0.35], ['silex', 0.4]], regrow: 200, verb: 'Miner' },
  bush: { give: [['baies', 2, 4], ['herbes', 0.3]], regrow: 120, verb: 'Cueillir' },
  fern: { give: [['herbes', 1, 2]], regrow: 120, verb: 'Cueillir' },
  reeds: { give: [['fibre', 1, 2]], regrow: 120, verb: 'Couper' },
  mushroom: { give: [['champignon', 1, 2], ['champignon_luisant', 0.3]], regrow: 160, verb: 'Cueillir' },
  driftwood: { give: [['bois_flotte', 2, 3]], regrow: 180, verb: 'Ramasser' },
  shell: { give: [['coquillage', 1, 2]], regrow: 100, verb: 'Ramasser' },
  starfish: { give: [['coquillage', 1, 1]], regrow: 100, verb: 'Ramasser' },
  cristal: { tool: 'pick', give: [['eclat_cristal', 1, 2]], regrow: 420, verb: 'Miner' },
};

// Structures posables. solid : 1 = bloque tout le monde, 2 = bloque seulement les morts (porte)
export const STRUCTS = {
  pavillon: { item: 'pavillon', solid: 1 },
  mur_bois: { item: 'mur_bois', solid: 1 },
  palissade: { item: 'palissade', solid: 1 },
  mur_pierre: { item: 'mur_pierre', solid: 1 },
  porte: { item: 'porte_bois', solid: 2 },
  sol: { item: 'sol_planches', floor: 1 },
  tapis: { item: 'tapis', floor: 1 },
  torche: { item: 'torche_base', solid: 0, light: 62 },
  lanterne: { item: 'lanterne_base', solid: 1, light: 74 },
  feu_camp: { item: 'feu_camp', solid: 1, light: 84, station: 'feu' },
  etabli: { item: 'etabli', solid: 1, station: 'etabli' },
  forge_base: { item: 'forge_base', solid: 1, station: 'forge', light: 40 },
  coffre: { item: 'coffre_base', solid: 1, storage: 1 },
  lit: { item: 'lit', solid: 1, bed: 1 },
  canon_def: { item: 'canon_def', solid: 1, turret: 1 },
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
export const HOME_OK = new Set(['coffre', 'lit', 'tapis', 'torche', 'lanterne', 'tonneau', 'caisse', 'jardiniere', 'etabli', 'sol']);
export const HOME_MAX = 60;       // objets par maison
export const HOME_PRICE = 800;    // prix d'une maison

export const CLAIM_R = 7;          // rayon du terrain revendiqué (tuiles)
export const BASE_MAX = 160;       // nombre maximal de structures par base
export const PLANTER_GROW = 300;   // secondes pour qu'une jardinière donne

const R = (id, out, n, st, cat, ing) => ({ id, out, n, st, cat, ing });
export const RECIPES = [
  // matériaux
  R('corde', 'corde', 1, 'main', 'mat', [['fibre', 3]]),
  R('planche', 'planche', 2, 'etabli', 'mat', [['bois', 2]]),
  R('charbon', 'charbon', 2, 'feu', 'mat', [['bois', 2]]),
  R('toile', 'toile', 1, 'etabli', 'mat', [['fibre', 4]]),
  R('lingot_fer', 'lingot_fer', 1, 'forge', 'mat', [['minerai_fer', 2], ['charbon', 1]]),
  R('poudre_noire', 'poudre_noire', 2, 'etabli', 'mat', [['charbon', 1], ['os_maudit', 1]]),
  // outils
  R('hache_silex', 'hache_silex', 1, 'main', 'outil', [['bois_flotte', 2], ['silex', 2], ['fibre', 2]]),
  R('pioche_silex', 'pioche_silex', 1, 'main', 'outil', [['bois_flotte', 2], ['silex', 3], ['fibre', 2]]),
  R('canne_peche', 'canne_peche', 1, 'main', 'outil', [['bois_flotte', 2], ['fibre', 3]]),
  R('hache_fer', 'hache_fer', 1, 'forge', 'outil', [['planche', 1], ['lingot_fer', 2], ['corde', 1]]),
  R('pioche_fer', 'pioche_fer', 1, 'forge', 'outil', [['planche', 1], ['lingot_fer', 3], ['corde', 1]]),
  // armes
  R('gourdin', 'gourdin', 1, 'main', 'arme', [['bois', 4], ['corde', 1]]),
  R('lance_silex', 'lance_silex', 1, 'main', 'arme', [['bois', 2], ['silex', 4], ['corde', 1]]),
  R('coutelas', 'coutelas', 1, 'forge', 'arme', [['lingot_fer', 3], ['planche', 1]]),
  R('hache_guerre', 'hache_guerre', 1, 'forge', 'arme', [['lingot_fer', 5], ['bois', 3], ['dent_zombie', 4]]),
  R('sabre_abordage', 'sabre_abordage', 1, 'forge', 'arme', [['lingot_fer', 6], ['perle_ombre', 1], ['planche', 1]]),
  R('lame_corail', 'lame_corail', 1, 'forge', 'arme', [['sabre_abordage', 1], ['perle_ombre', 5], ['coquillage', 20], ['champignon_luisant', 5]]),
  R('pistolet_silex', 'pistolet_silex', 1, 'forge', 'arme', [['lingot_fer', 3], ['planche', 2], ['poudre_noire', 3]]),
  R('tromblon', 'tromblon', 1, 'forge', 'arme', [['lingot_fer', 5], ['planche', 2], ['poudre_noire', 6]]),
  R('mousquet', 'mousquet', 1, 'forge', 'arme', [['lingot_fer', 6], ['planche', 3], ['poudre_noire', 8], ['perle_ombre', 1]]),
  R('poignard', 'poignard', 1, 'main', 'arme', [['silex', 3], ['bois_flotte', 1], ['fibre', 2]]),
  R('machette', 'machette', 1, 'forge', 'arme', [['lingot_fer', 2], ['bois', 2]]),
  R('harpon', 'harpon', 1, 'forge', 'arme', [['lingot_fer', 3], ['bois', 4], ['corde', 2]]),
  R('masse', 'masse', 1, 'forge', 'arme', [['lingot_fer', 6], ['bois', 2], ['os_maudit', 6]]),
  R('dague_cristal', 'dague_cristal', 1, 'forge', 'arme', [['eclat_cristal', 6], ['lingot_fer', 1], ['perle_ombre', 1]]),
  R('flamberge', 'flamberge', 1, 'forge', 'arme', [['lingot_fer', 10], ['perle_ombre', 2], ['eclat_cristal', 3], ['charbon', 4]]),
  R('pistolet_double', 'pistolet_double', 1, 'forge', 'arme', [['lingot_fer', 4], ['planche', 1], ['poudre_noire', 4]]),
  R('escopette', 'escopette', 1, 'forge', 'arme', [['lingot_fer', 3], ['planche', 2], ['poudre_noire', 5]]),
  R('carabine', 'carabine', 1, 'forge', 'arme', [['lingot_fer', 5], ['planche', 3], ['poudre_noire', 5]]),
  R('crache_feu', 'crache_feu', 1, 'forge', 'arme', [['lingot_fer', 3], ['poudre_noire', 8], ['resine', 3], ['champignon_luisant', 2]]),
  R('pistolet_cristal', 'pistolet_cristal', 1, 'forge', 'arme', [['eclat_cristal', 8], ['lingot_fer', 2], ['perle_ombre', 1]]),
  // armures
  R('chapeau_feuilles', 'chapeau_feuilles', 1, 'main', 'armure', [['fibre', 6], ['herbes', 2]]),
  R('bandana', 'bandana', 1, 'etabli', 'armure', [['toile', 1], ['baies', 4]]),
  R('tricorne', 'tricorne', 1, 'etabli', 'armure', [['toile', 3], ['corde', 1]]),
  R('casque_os', 'casque_os', 1, 'etabli', 'armure', [['os_maudit', 12], ['corde', 2]]),
  R('mariniere', 'mariniere', 1, 'etabli', 'armure', [['toile', 3], ['baies', 6]]),
  R('armure_coquillages', 'armure_coquillages', 1, 'etabli', 'armure', [['coquillage', 14], ['corde', 3]]),
  R('carapace_crabe', 'carapace_crabe', 1, 'etabli', 'armure', [['pince_crabe', 10], ['corde', 2]]),
  R('manteau_corsaire', 'manteau_corsaire', 1, 'etabli', 'armure', [['toile', 6], ['lingot_fer', 1], ['perle_ombre', 1]]),
  R('bottes_pont', 'bottes_pont', 1, 'etabli', 'armure', [['toile', 2], ['planche', 1], ['corde', 1]]),
  // talismans
  R('collier_coquillages', 'collier_coquillages', 1, 'main', 'talisman', [['coquillage', 8], ['corde', 1]]),
  R('talisman_os', 'talisman_os', 1, 'etabli', 'talisman', [['os_maudit', 6], ['dent_zombie', 3], ['corde', 1]]),
  R('collier_requin', 'collier_requin', 1, 'etabli', 'talisman', [['dent_zombie', 8], ['corde', 1], ['perle_ombre', 1]]),
  R('amulette_lanterne', 'amulette_lanterne', 1, 'forge', 'talisman', [['lingot_fer', 2], ['champignon_luisant', 4], ['perle_ombre', 1]]),
  R('pendentif_cristal', 'pendentif_cristal', 1, 'forge', 'talisman', [['eclat_cristal', 4], ['lingot_fer', 1], ['corde', 1]]),
  // cuisine
  R('poisson_grille', 'poisson_grille', 1, 'feu', 'cuisine', [['sardine', 2]]),
  R('poisson_grille_bar', 'poisson_grille', 2, 'feu', 'cuisine', [['bar', 1]]),
  R('brochette_crabe', 'brochette_crabe', 1, 'feu', 'cuisine', [['pince_crabe', 3], ['herbes', 1]]),
  R('ragout_marin', 'ragout_marin', 1, 'feu', 'cuisine', [['dorade', 1], ['champignon', 2], ['herbes', 2]]),
  R('galette_coco', 'galette_coco', 2, 'feu', 'cuisine', [['noix_coco', 1], ['baies', 3]]),
  R('soupe_champignons', 'soupe_champignons', 1, 'feu', 'cuisine', [['champignon', 3], ['herbes', 1]]),
  R('tarte_baies', 'tarte_baies', 1, 'feu', 'cuisine', [['baies', 6], ['noix_coco', 1]]),
  R('grog', 'grog', 1, 'feu', 'cuisine', [['baies', 3], ['herbes', 1]]),
  R('rhum', 'rhum', 1, 'feu', 'cuisine', [['baies', 8], ['resine', 1]]),
  R('bandage', 'bandage', 2, 'main', 'cuisine', [['fibre', 3], ['herbes', 1]]),
  R('elixir_flamme', 'elixir_flamme', 1, 'feu', 'cuisine', [['herbes', 4], ['champignon_luisant', 2], ['baies', 2]]),
  // construction
  R('pavillon', 'pavillon', 1, 'etabli', 'base', [['toile', 2], ['bois', 4], ['corde', 2]]),
  R('mur_bois', 'mur_bois', 2, 'etabli', 'base', [['planche', 3]]),
  R('palissade', 'palissade', 2, 'main', 'base', [['bois', 3], ['corde', 1]]),
  R('mur_pierre', 'mur_pierre', 2, 'etabli', 'base', [['pierre', 4]]),
  R('porte_bois', 'porte_bois', 1, 'etabli', 'base', [['planche', 3], ['lingot_fer', 1]]),
  R('sol_planches', 'sol_planches', 4, 'etabli', 'base', [['planche', 1]]),
  R('tapis', 'tapis', 1, 'etabli', 'base', [['toile', 3], ['baies', 2]]),
  R('torche_base', 'torche_base', 2, 'main', 'base', [['bois', 1], ['fibre', 1], ['charbon', 1]]),
  R('lanterne_base', 'lanterne_base', 1, 'forge', 'base', [['lingot_fer', 1], ['resine', 1], ['toile', 1]]),
  R('feu_camp', 'feu_camp', 1, 'main', 'base', [['pierre', 4], ['bois', 3]]),
  R('etabli', 'etabli', 1, 'etabli', 'base', [['planche', 4], ['corde', 2], ['lingot_fer', 1]]),
  R('forge_base', 'forge_base', 1, 'etabli', 'base', [['pierre', 10], ['lingot_fer', 3], ['charbon', 4]]),
  R('coffre_base', 'coffre_base', 1, 'etabli', 'base', [['planche', 6], ['lingot_fer', 1]]),
  R('lit', 'lit', 1, 'etabli', 'base', [['planche', 4], ['toile', 3]]),
  R('canon_def', 'canon_def', 1, 'forge', 'base', [['lingot_fer', 6], ['planche', 2], ['poudre_noire', 5]]),
  R('jardiniere', 'jardiniere', 1, 'etabli', 'base', [['planche', 3], ['herbes', 2], ['baies', 4]]),
  R('tonneau_deco', 'tonneau_deco', 1, 'etabli', 'base', [['planche', 3]]),
  R('caisse_deco', 'caisse_deco', 1, 'etabli', 'base', [['planche', 2]]),
  // navigation
  R('barque', 'barque', 1, 'etabli', 'nav', [['planche', 14], ['corde', 4], ['toile', 2]]),
  R('sloop', 'sloop', 1, 'etabli', 'nav', [['planche', 40], ['toile', 10], ['corde', 10], ['lingot_fer', 8], ['poudre_noire', 4]]),
  // maison
  R('table_bois', 'table_bois', 1, 'etabli', 'maison', [['planche', 4]]),
  R('chaise_bois', 'chaise_bois', 2, 'etabli', 'maison', [['planche', 3]]),
  R('etagere_bois', 'etagere_bois', 1, 'etabli', 'maison', [['planche', 5], ['corde', 1]]),
  R('armoire', 'armoire', 1, 'etabli', 'maison', [['planche', 8], ['lingot_fer', 1]]),
  R('cheminee_pierre', 'cheminee_pierre', 1, 'forge', 'maison', [['pierre', 12], ['charbon', 3]]),
  R('plante_pot', 'plante_pot', 1, 'main', 'maison', [['pierre', 2], ['herbes', 3], ['fibre', 2]]),
  R('tableau_mer', 'tableau_mer', 1, 'etabli', 'maison', [['toile', 2], ['planche', 2], ['baies', 6]]),
  R('tapis_brode', 'tapis_brode', 1, 'etabli', 'maison', [['toile', 4], ['baies', 4]]),
  R('bibliotheque', 'bibliotheque', 1, 'etabli', 'maison', [['planche', 8], ['toile', 2], ['carte_dechiree', 1]]),
  R('serrure_renforcee', 'serrure_renforcee', 1, 'forge', 'maison', [['lingot_fer', 4], ['poudre_noire', 1]]),
  R('crochets', 'crochets', 3, 'forge', 'maison', [['lingot_fer', 1]]),
  R('tentacule_fumee', 'tentacule_fumee', 1, 'feu', 'cuisine', [['encre_noire', 1], ['dorade', 1], ['herbes', 1]]),
];
export const RECIPE = Object.fromEntries(RECIPES.map((r) => [r.id, r]));
