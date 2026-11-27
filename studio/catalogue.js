// LStudio — la bibliothèque des éléments : chaque type de décor du jeu, rangé dans une catégorie, avec son nom.
// Les sprites eux-mêmes viennent du jeu (client/render) : rien n'est redessiné ici.
// Hors bibliothèque : ce qui appartient à un système du jeu (les maisons des joueurs, le phare et son faisceau, le
// volcan, les entrées de grottes secrètes, les navires) — on ne peut que les retoucher là où ils sont.
export const CATEGORIES = [
  { id: 'arbres', nom: 'Arbres et buissons', types: ['palm', 'tree', 'jtree', 'jtree_r', 'deadtree', 'paletuvier', 'bush', 'topiaire', 'fern', 'reeds', 'canne'] },
  { id: 'sol', nom: 'Herbes, fleurs et petits détails', types: ['flower', 'lily', 'mushroom', 'pebble', 'shell', 'starfish', 'driftwood', 'skull', 'bones', 'dalle', 'fumerolle', 'potager', 'tapis_deco', 'filet_sol', 'cordage'] },
  { id: 'rochers', nom: 'Rochers, ruines et monuments', types: ['rock', 'lavarock', 'cristal', 'ruinwall', 'ruine', 'pillar', 'obelisque', 'totem', 'idol', 'corail', 'sceau'] },
  { id: 'chemins', nom: 'Routes, ponts et passages', types: ['escalier', 'passerelle', 'porche', 'porte_cite', 'echelle', 'trappe', 'grille_egout', 'levier', 'barreaux'] },
  { id: 'port', nom: 'Quais et installations portuaires', types: ['bitte', 'grue', 'cabestan', 'anchor', 'nets', 'caisses', 'tonneaux', 'etal_poisson', 'sechoir', 'coque', 'boat', 'bouee', 'mat_epave', 'cloche_marine', 'longue_vue', 'rouleaux', 'cordage_p'] },
  { id: 'batiments', nom: 'Bâtiments, murs et clôtures', types: ['cite', 'rempart', 'tour', 'fence', 'muret', 'mur_jardin', 'balustrade', 'portail', 'cheminee_t', 'lucarne', 'tente', 'stall', 'comptoir_ext'] },
  { id: 'urbain', nom: 'Mobilier urbain', types: ['bench', 'well', 'fontaine', 'statue', 'sign', 'panneau', 'drapeau', 'banniere', 'pot_fleurs', 'table_ext', 'feu_camp', 'gibet', 'grave', 'cross', 'crypt', 'cage', 'mannequin', 'perch'] },
  { id: 'interieur', nom: 'Mobilier d’intérieur', types: ['table', 'chaise', 'chaise_m', 'tabouret', 'comptoir', 'etagere', 'cheminee', 'cheminee_m', 'fourneau', 'lit_deco', 'plante', 'ratelier', 'divan', 'canape', 'fauteuil', 'table_basse', 'gueridon', 'rideau', 'table_jeu', 'stalle', 'trone', 'gradin', 'buffet_m', 'colonne', 'console_m', 'clavecin', 'harpe', 'estrade_m', 'horloge', 'vestiaire_m', 'buste', 'statue_m', 'vitrine', 'armure', 'banquette', 'rayonnage', 'bureau_m', 'coffre_m', 'cave_liqueurs', 'table_office', 'globe_m', 'table_dessin', 'maquette_g', 'casier_vin'] },
  { id: 'atelier', nom: 'Réserves, ateliers et marchandises', types: ['barrel', 'crate', 'tonneau_d', 'tonnelet', 'chest', 'sacs', 'planches', 'foin', 'workbench', 'anvil', 'alambic', 'meule', 'seau', 'casier', 'rayon_e', 'balance', 'diable', 'guichet'] },
  { id: 'navire', nom: 'Éléments maritimes (à bord)', types: ['cannon', 'mat_p', 'barre', 'ecoutille', 'fanal', 'bastingage', 'cloche_b'] },
  { id: 'lumiere', nom: 'Éclairage', types: ['lamp', 'torch', 'brazier', 'lampion', 'lanterne_r', 'lanterne_p', 'lustre_p', 'applique', 'candelabre'] },
  { id: 'dessus', nom: 'Au-dessus des têtes', types: ['corde_linge', 'linge', 'palan', 'vergue'] },
  { id: 'fete', nom: 'Fête et spectacle', types: ['estrade', 'stand_fete', 'tente_lice', 'arche_fete', 'mat_fete', 'canon_fete'] },
];
export const HORS_BIBLIOTHEQUE = new Set(['house', 'tavern', 'forge', 'home', 'lighthouse', 'ship', 'wreck', 'volcan', 'propriete', 'grotte', 'crane_rock', 'fort', 'vaisselier', 'pupitre']);
export const NOMS = {
  palm: 'Palmier', tree: 'Arbre', jtree: 'Arbre de jungle', jtree_r: 'Arbre écarlate', deadtree: 'Arbre mort', paletuvier: 'Palétuvier', bush: 'Buisson', topiaire: 'If taillé', fern: 'Fougère', reeds: 'Roseaux', canne: 'Cannes à sucre',
  flower: 'Fleurs', lily: 'Nénuphar', mushroom: 'Champignons', pebble: 'Galets', shell: 'Coquillage', starfish: 'Étoile de mer', driftwood: 'Bois flotté', skull: 'Crâne', bones: 'Ossements', dalle: 'Dalle', fumerolle: 'Fumerolle', potager: 'Potager', tapis_deco: 'Tapis', filet_sol: 'Filet au sol', cordage: 'Cordage au sol',
  rock: 'Rocher', lavarock: 'Roche de lave', cristal: 'Cristal', ruinwall: 'Mur en ruine', ruine: 'Ruine', pillar: 'Pilier', obelisque: 'Obélisque', totem: 'Totem', idol: 'Idole', corail: 'Corail', sceau: 'Sceau',
  escalier: 'Escalier', passerelle: 'Passerelle', porche: 'Porche', porte_cite: 'Porte de ville', echelle: 'Échelle', trappe: 'Trappe', grille_egout: 'Bouche d’égout', levier: 'Levier', barreaux: 'Barreaux',
  bitte: 'Bitte d’amarrage', grue: 'Grue de port', cabestan: 'Cabestan', anchor: 'Ancre', nets: 'Filets', caisses: 'Pile de caisses', tonneaux: 'Pile de tonneaux', etal_poisson: 'Étal de poissons', sechoir: 'Séchoir', coque: 'Coque en chantier', boat: 'Barque', bouee: 'Bouée', mat_epave: 'Mât d’épave', cloche_marine: 'Cloche marine', longue_vue: 'Longue-vue', rouleaux: 'Rouleaux de toile', cordage_p: 'Glène de cordage',
  cite: 'Bâtiment', rempart: 'Rempart', tour: 'Tour', fence: 'Barrière', muret: 'Muret', mur_jardin: 'Mur de jardin', balustrade: 'Balustrade', portail: 'Portail', cheminee_t: 'Cheminée de toit', lucarne: 'Lucarne', tente: 'Tente', stall: 'Échoppe', comptoir_ext: 'Comptoir extérieur',
  bench: 'Banc', well: 'Puits', fontaine: 'Fontaine', statue: 'Statue', sign: 'Pancarte', panneau: 'Panneau', drapeau: 'Drapeau', banniere: 'Bannière', pot_fleurs: 'Jardinière', table_ext: 'Table d’extérieur', feu_camp: 'Feu de camp', gibet: 'Gibet', grave: 'Tombe', cross: 'Croix', crypt: 'Crypte', cage: 'Cage', mannequin: 'Mannequin', perch: 'Perchoir',
  table: 'Table', chaise: 'Chaise', chaise_m: 'Chaise dorée', tabouret: 'Tabouret', comptoir: 'Comptoir', etagere: 'Étagère', cheminee: 'Cheminée', cheminee_m: 'Cheminée de marbre', fourneau: 'Fourneau', lit_deco: 'Lit', plante: 'Plante en pot', ratelier: 'Râtelier', divan: 'Divan', canape: 'Canapé', fauteuil: 'Fauteuil', table_basse: 'Table basse', gueridon: 'Guéridon', rideau: 'Rideau', table_jeu: 'Table de jeu', stalle: 'Stalle', trone: 'Trône', gradin: 'Gradin', buffet_m: 'Buffet de réception', colonne: 'Colonne', console_m: 'Console', clavecin: 'Clavecin', harpe: 'Harpe', estrade_m: 'Estrade', horloge: 'Horloge', vestiaire_m: 'Vestiaire', buste: 'Buste', statue_m: 'Statue de marbre', vitrine: 'Vitrine', armure: 'Armure', banquette: 'Banquette', rayonnage: 'Rayonnage d’archives', bureau_m: 'Bureau', coffre_m: 'Coffre-fort', cave_liqueurs: 'Cave à liqueurs', table_office: 'Table de cuisine', globe_m: 'Globe', table_dessin: 'Table à dessin', maquette_g: 'Maquette', casier_vin: 'Casier à vin',
  barrel: 'Tonneau', crate: 'Caisse', tonneau_d: 'Tonneau debout', tonnelet: 'Tonnelet', chest: 'Coffre (décor)', sacs: 'Sacs', planches: 'Planches', foin: 'Foin', workbench: 'Établi', anvil: 'Enclume', alambic: 'Alambic', meule: 'Meule', seau: 'Seau', casier: 'Casier à homards', rayon_e: 'Rayonnage de magasin', balance: 'Balance', diable: 'Diable', guichet: 'Guichet',
  cannon: 'Canon', mat_p: 'Pied de mât', barre: 'Barre du navire', ecoutille: 'Écoutille', fanal: 'Fanal', bastingage: 'Bastingage', cloche_b: 'Cloche de bord',
  lamp: 'Lanterne de rue', torch: 'Torche', brazier: 'Brasero', lampion: 'Lampion', lanterne_r: 'Lanterne rouge', lanterne_p: 'Lanterne pendue', lustre_p: 'Lustre', applique: 'Applique murale', candelabre: 'Candélabre',
  corde_linge: 'Linge tendu', linge: 'Corde à linge', palan: 'Palan', vergue: 'Gréement',
  estrade: 'Scène', stand_fete: 'Stand de fête', tente_lice: 'Tente de la Lice', arche_fete: 'Arche de fête', mat_fete: 'Mât de fête', canon_fete: 'Canon de fête',
  house: 'Maison', tavern: 'Taverne', forge: 'Forge', home: 'Maison de joueur', lighthouse: 'Phare', ship: 'Navire', wreck: 'Épave', volcan: 'Volcan', propriete: 'Maison de joueur', grotte: 'Entrée de grotte', fort: 'Fort',
};
export const nomDe = (type) => NOMS[type] || type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
// les sols que l'on peut peindre (le mur d'intérieur : dans une pièce, une cloison)
export const SOLS = [
  ['DEEP', 'Mer profonde'], ['WATER', 'Eau peu profonde'], ['SAND', 'Sable'], ['GRASS', 'Herbe'], ['DGRASS', 'Herbe sombre'], ['JUNGLE', 'Jungle'],
  ['DIRT', 'Terre'], ['MUD', 'Boue'], ['MARSH', 'Marécage'], ['SWAMP', 'Marais'], ['COBBLE', 'Pavés'], ['PLANK', 'Planches (quai, pont)'],
  ['ROCK', 'Roche (falaise)'], ['ASH', 'Cendre'], ['LAVA', 'Lave'], ['FLOOR', 'Plancher d’intérieur'], ['STONEF', 'Dallage d’intérieur'], ['CAVE', 'Sol de grotte'], ['IWALL', 'Mur d’intérieur'],
];
// lot 2 : l'emprise des meubles de plusieurs cases [largeur, hauteur, cases solides] (celle qu'ils ont dans les lieux du
// jeu) ; posés par la bibliothèque, ils prennent leur emprise : le dessin couvre ses cases, et ses cases bloquent
export const EMPRISES = {
  cheminee_m: [3, 1], canape: [2, 1], table_basse: [2, 1], estrade_m: [4, 4, 'aucune'], clavecin: [2, 1], buffet_m: [4, 1], console_m: [2, 1], table_office: [2, 1], table_jeu: [2, 1], vitrine: [2, 1], banquette: [2, 1], bureau_m: [2, 1], rayon_e: [2, 1], guichet: [3, 1], palan: [2, 1, 'aucune'], table_dessin: [2, 1], maquette_g: [2, 1], casier_vin: [2, 1], corde_linge: [4, 1, 'aucune'], passerelle: [3, 1, 'aucune'], ecoutille: [2, 2, 'aucune'],
  tonneaux: [2, 2, [[0, 1], [1, 1]]], caisses: [2, 2], statue_m: [2, 2, [[0, 1], [1, 1]]], fontaine: [3, 2, [[0, 1], [1, 1], [2, 1], [1, 0]]], portail: [3, 1, [[0, 0], [2, 0]]], porche: [3, 1, [[0, 0], [2, 0]]],
  // une case, mais solide dans les lieux du jeu (leur règle générale ne l'est pas)
  fauteuil: [1, 1], horloge: [1, 1], buste: [1, 1], globe_m: [1, 1], cave_liqueurs: [1, 1], candelabre: [1, 1], colonne: [1, 1], armure: [1, 1], vestiaire_m: [1, 1], harpe: [1, 1], coffre_m: [1, 1], balance: [1, 1], diable: [1, 1], gueridon: [1, 1], cage: [1, 1],
};
// le décor mural : ses variantes (celles que le moteur sait dessiner)
export const MUR_VARIANTES = {
  fenetre: [[0, 'rideaux rouges'], [1, 'rideaux verts'], [2, 'rideaux bleus'], [3, 'sans rideaux']], tableau: [['mer', 'navire en mer'], ['paysage', 'paysage'], ['bataille', 'bataille navale'], ['portrait', 'portrait'], ['famille', 'famille'], ['nature', 'nature morte']],
  portrait_ch: [['portrait', 'portrait'], ['famille', 'famille'], ['mer', 'navire en mer']], biblio: [[0, 'reliures brunes'], [1, 'reliures rouges'], [2, 'reliures vertes']], tapisserie: [[0, 'chasse'], [1, 'fleurie']],
  rue_fenetre: [[0, 'volets verts, fleurs'], [1, 'volets rouges, éclairée'], [2, 'volets bleus, fleurs'], [3, 'volets jaunes, éclairée']], rue_porte: [[0, 'rouge'], [1, 'bleue'], [2, 'verte']], enseigne: [[0, 'une ancre'], [1, 'une chope'], [2, 'un poisson']], soupirail: [[0, ''], [1, '']],
};
export const AMBIANCES = [['', 'Aucune'], ['cave', 'Gouttes et égout'], ['entrepot', 'Charpente qui travaille'], ['atelier', 'Plume et poêle'], ['ville', 'Vent sur les toits'], ['navire', 'Coque qui grince']];
// les styles de bâtiments (ceux de la cité), avec leur nom
export const STYLES_BATIMENT = [['maison', 'Maison (générique)'], ['palais', 'Palais'], ['velours', 'Maison de jeu'], ['tripot', 'Tripot'], ['armurerie', 'Armurerie'], ['tailleur', 'Tailleur'], ['apothicaire', 'Apothicaire'], ['ecurie', 'Écurie'], ['chantier', 'Chantier naval'], ['capitainerie', 'Capitainerie'], ['entrepot', 'Entrepôt'], ['fosse', 'Arène'], ['voilerie', 'Voilerie'], ['cartographe', 'Cartographe'], ['epicerie', 'Épicerie'], ['tonnellerie', 'Tonnellerie'], ['corderie', 'Corderie']];
