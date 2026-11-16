// Catalogue des objets. slot = emplacement d'équipement ; use = consommable.
// look/lookCol = apparence sur le personnage ; icon/tint = icône d'inventaire.
export const ITEMS = {
  // ----- armes de mêlée -----
  sabre_rouille: { name: 'Sabre rouillé', slot: 'weapon', atk: 6, speed: 0.5, value: 8, icon: 'saber', tint: 'rust', wtint: 'rust', desc: 'Une lame piquée de rouille. Mieux que rien.' },
  coutelas: { name: 'Coutelas de matelot', slot: 'weapon', atk: 10, speed: 0.46, value: 120, icon: 'saber', tint: 'steel', wtint: 'steel', desc: 'Court, solide, fiable. Le compagnon des abordages.' },
  sabre_abordage: { name: "Sabre d'abordage", slot: 'weapon', atk: 16, speed: 0.48, value: 450, rarity: 1, icon: 'saber', tint: 'gold', wtint: 'gold', desc: 'Garde dorée, lame équilibrée. Les zombies le craignent.' },
  lame_corail: { name: 'Lame de corail maudit', slot: 'weapon', atk: 28, speed: 0.42, crit: 0.08, value: 2200, rarity: 3, icon: 'saber', tint: 'coral', wtint: 'coral', desc: 'Taillée dans le Cœur de Corail. Elle murmure la nuit.' },
  // ----- armes à feu -----
  pistolet_rouille: { name: 'Pistolet rouillé', slot: 'gun', gun: 10, value: 30, icon: 'pistol', tint: 'rust', wtint: 'rust', wkind: 'pistol', shot: { n: 1, spread: 0, range: 150, speed: 290 }, desc: 'Il fait long feu une fois sur trois. Les deux autres fois, il fait mal.' },
  pistolet_silex: { name: 'Pistolet à silex', slot: 'gun', gun: 17, value: 160, rarity: 1, icon: 'pistol', tint: 'steel', wtint: 'steel', wkind: 'pistol', shot: { n: 1, spread: 0, range: 175, speed: 310 }, desc: 'Précis et bien huilé.' },
  tromblon: { name: 'Tromblon', slot: 'gun', gun: 9, value: 520, rarity: 1, icon: 'blunder', wkind: 'blunder', shot: { n: 5, spread: 0.42, range: 105, speed: 260 }, desc: 'Une gerbe de mitraille. Idéal contre les hordes.' },
  mousquet: { name: 'Mousquet de marine', slot: 'gun', gun: 32, value: 950, rarity: 2, icon: 'musket', wkind: 'musket', cdMul: 1.6, shot: { n: 1, spread: 0, range: 240, speed: 380, pierce: 2 }, desc: 'Lent à recharger, mais sa balle traverse deux ennemis.' },
  // ----- chapeaux -----
  bandana: { name: 'Bandana rouge', slot: 'hat', def: 1, value: 20, icon: 'bandana', tint: 'red', look: 'bandana', lookCol: 'red', desc: 'Garde la sueur hors des yeux.' },
  bandana_noir: { name: 'Bandana noir', slot: 'hat', def: 2, crit: 0.02, value: 60, icon: 'bandana', tint: 'black', look: 'bandana', lookCol: 'black', desc: 'Porté par les boucaniers de la jungle.' },
  chapeau_paille: { name: 'Chapeau de paille', slot: 'hat', def: 1, spd: 0.04, value: 25, icon: 'paille', look: 'paille', desc: 'Léger et frais. On court plus vite au soleil.' },
  tricorne: { name: 'Tricorne', slot: 'hat', def: 3, value: 90, icon: 'tricorne', look: 'tricorne', lookCol: 'black', desc: 'Le chapeau de tout pirate qui se respecte.' },
  chapeau_capitaine: { name: 'Chapeau de capitaine', slot: 'hat', def: 6, hp: 20, value: 900, rarity: 2, icon: 'tricorne_big', look: 'capitaine', lookCol: 'black', desc: 'Plume blanche et crâne d’argent. On vous obéit.' },
  // ----- torse -----
  chemise: { name: 'Chemise de lin', slot: 'body', def: 1, value: 5, icon: 'shirt', tint: 'white', look: 'chemise', desc: 'Simple et rapiécée.' },
  mariniere: { name: 'Marinière', slot: 'body', def: 2, value: 40, icon: 'shirt_striped', look: 'rayee', desc: 'Rayée bleu et blanc, comme il se doit.' },
  gilet_cuir: { name: 'Gilet de cuir', slot: 'body', def: 4, value: 110, icon: 'vest', look: 'gilet', lookCol: 'brown', desc: 'Cuir épais tanné au sel.' },
  manteau_corsaire: { name: 'Manteau de corsaire', slot: 'body', def: 7, hp: 15, value: 420, rarity: 1, icon: 'coat', tint: 'red', look: 'manteau', lookCol: 'red', desc: 'Long manteau écarlate à boutons dorés.' },
  manteau_capitaine: { name: 'Manteau de capitaine', slot: 'body', def: 11, hp: 35, value: 1600, rarity: 2, icon: 'captaincoat', tint: 'navy', look: 'capitaine', lookCol: 'navy', desc: 'Galons d’or et épaulettes. Une légende en devenir.' },
  // ----- bottes -----
  bottes_usees: { name: 'Bottes usées', slot: 'boots', def: 1, spd: 0.02, value: 10, icon: 'boots', tint: 'brown', lookCol: 'brown', desc: 'Elles ont connu des jours meilleurs.' },
  bottes_pont: { name: 'Bottes de pont', slot: 'boots', def: 2, spd: 0.07, value: 85, rarity: 1, icon: 'boots', tint: 'black', lookCol: 'black', desc: 'Semelles cloutées, parfaites sur un pont mouillé.' },
  // ----- talismans -----
  collier_requin: { name: 'Collier de dents de requin', slot: 'trinket', crit: 0.07, value: 160, rarity: 1, icon: 'necklace', desc: 'Chaque dent est une victoire.' },
  amulette_lanterne: { name: 'Amulette de la Lanterne', slot: 'trinket', regen: 1.6, hp: 25, value: 320, rarity: 2, icon: 'amulet', desc: 'Une braise de la Flamme Bénite y brûle encore.' },
  boussole_maudite: { name: 'Boussole maudite', slot: 'trinket', atk: 3, gun: 3, spd: 0.04, value: 700, rarity: 2, icon: 'compass', desc: 'Son aiguille indique toujours le danger.' },
  // ----- consommables -----
  banane: { name: 'Banane', use: { heal: 22 }, value: 4, icon: 'banana', desc: 'Rend 22 PV.' },
  noix_coco: { name: 'Noix de coco', use: { heal: 30, en: 15 }, value: 8, icon: 'coconut', desc: 'Rend 30 PV et 15 d’énergie.' },
  poisson_grille: { name: 'Poisson grillé', use: { heal: 50 }, value: 15, icon: 'fish', desc: 'Rend 50 PV.' },
  rhum: { name: 'Bouteille de rhum', use: { heal: 95, drunk: 10 }, value: 40, rarity: 1, icon: 'rum', desc: 'Rend 95 PV... et la tête qui tourne.' },
  grog: { name: 'Grog épicé', use: { en: 60 }, value: 22, icon: 'grog', desc: 'Rend 60 d’énergie.' },
  // ----- matériaux -----
  pince_crabe: { name: 'Pince de crabe', value: 3, icon: 'claw', mat: 1, desc: 'Encore un peu frétillante.' },
  chair_putride: { name: 'Chair putride', value: 2, icon: 'flesh', mat: 1, desc: 'L’odeur ne part jamais vraiment.' },
  os_maudit: { name: 'Os maudit', value: 5, icon: 'bone', mat: 1, desc: 'Une lueur verte y palpite. Le vieux Gaspard en veut.' },
  dent_zombie: { name: 'Dent de boucanier', value: 7, icon: 'tooth', mat: 1, desc: 'Arrachée à un mort qui mordait encore.' },
  algue_noire: { name: 'Algue noire', value: 8, icon: 'seaweed', mat: 1, desc: 'Ramassée sur les Noyés du marais.' },
  poudre_noire: { name: 'Poudre noire', value: 10, icon: 'powder', mat: 1, desc: 'Sèche, heureusement.' },
  perle_ombre: { name: "Perle d'ombre", value: 70, rarity: 2, icon: 'pearl', mat: 1, desc: 'Elle absorbe la lumière autour d’elle.' },
  carte_dechiree: { name: 'Carte déchirée', value: 25, rarity: 1, icon: 'map', use: { combine: 4 }, desc: 'Un fragment de carte au trésor. Réunissez-en 4 puis clic droit pour reconstituer la carte.' },
  carte_tresor: { name: 'Carte au trésor', value: 0, rarity: 2, icon: 'map', tint: 'gold', use: { treasure: 1 }, desc: 'Clic droit : révéler l’emplacement du trésor. Creusez ensuite sur la croix (touche E).' },
  // ----- pêche -----
  canne_peche: { name: 'Canne à pêche', tool: 'fish', value: 30, icon: 'rod', desc: 'Face à l’eau, appuyez sur R pour lancer. Quand ça mord (!), R pour ferrer.' },
  sardine: { name: 'Sardine', use: { heal: 14 }, value: 3, icon: 'fish_s', tint: 'silver', desc: 'Petite et frétillante. Rend 14 PV.' },
  bar: { name: 'Bar de roche', use: { heal: 28 }, value: 9, icon: 'fish_s', tint: 'blue', desc: 'Rend 28 PV.' },
  dorade: { name: 'Dorade royale', use: { heal: 42 }, value: 18, rarity: 1, icon: 'fish_s', tint: 'gold', desc: 'Rend 42 PV. Bartholomé l’adore.' },
  poisson_lanterne: { name: 'Poisson-lanterne', use: { heal: 45, en: 25 }, value: 40, rarity: 2, icon: 'fish_s', tint: 'glow', desc: 'Ne mord que la nuit. Rend 45 PV et 25 d’énergie.' },
  espadon: { name: 'Espadon', value: 90, rarity: 2, icon: 'fish_s', tint: 'sword', mat: 1, desc: 'Une prise légendaire, surtout par gros temps. Se vend une fortune.' },
  botte_rouillee: { name: 'Botte rouillée', value: 1, icon: 'boots', tint: 'brown', mat: 1, desc: 'Quelqu’un l’a perdue. Avec le pied ?' },
  bouteille_mer: { name: 'Bouteille à la mer', use: { bottle: 1 }, value: 5, icon: 'bottle', desc: 'Un message roulé à l’intérieur. Clic droit pour l’ouvrir.' },
  // ----- butins d'élite -----
  couronne_crabe: { name: 'Couronne du Crabe-Roi', slot: 'hat', def: 5, crit: 0.05, value: 420, rarity: 2, icon: 'crown', look: 'couronne', desc: 'Un peu collante. Très royale.' },
  ecaille_leviathan: { name: 'Écaille du Léviathan', slot: 'trinket', def: 4, regen: 1.2, hp: 30, value: 650, rarity: 3, icon: 'scale', desc: 'Arrachée à la Marée Morte elle-même.' },
  // ----- quête -----
  tonnelet: { name: 'Tonnelet de rhum perdu', quest: 1, value: 0, icon: 'barrel', desc: 'Le rhum de Bartholomé. Ne pas boire en route.' },
};

export const STACK_MAX = 99;
export const isStackable = (id) => !!ITEMS[id] && !ITEMS[id].slot && !ITEMS[id].boat;

// ======================= Artisanat et construction (0.3) =======================
Object.assign(ITEMS, {
  // ----- matériaux récoltés -----
  bois: { name: 'Bois', value: 2, icon: 'log', mat: 1, desc: 'Coupé à la hache. La base de presque tout.' },
  bois_flotte: { name: 'Bois flotté', value: 1, icon: 'driftwood_i', mat: 1, desc: 'Ramassé sur la plage, blanchi par le sel.' },
  fibre: { name: 'Fibre de palmier', value: 1, icon: 'fiber', mat: 1, desc: 'Arrachée aux palmiers et aux roseaux. Se tresse en corde.' },
  silex: { name: 'Silex', value: 1, icon: 'flint', mat: 1, desc: 'Une pierre tranchante, ramassée à la main sur les rochers.' },
  pierre: { name: 'Pierre', value: 2, icon: 'stone', mat: 1, desc: 'Extraite des rochers à la pioche.' },
  minerai_fer: { name: 'Minerai de fer', value: 6, icon: 'ore', mat: 1, desc: 'Plus fréquent dans les rochers de la jungle, des ruines et de la crique.' },
  resine: { name: 'Résine', value: 5, icon: 'resin', mat: 1, desc: 'La sève dorée des grands arbres de la jungle.' },
  baies: { name: 'Baies sauvages', use: { heal: 6 }, value: 1, icon: 'berries', desc: 'Sucrées, un peu acides. Rend 6 PV.' },
  herbes: { name: 'Herbes médicinales', value: 2, icon: 'herb', mat: 1, desc: 'Cueillies sur les fougères et les buissons.' },
  champignon: { name: 'Champignon des marais', value: 2, icon: 'mush', tint: 'purple', mat: 1, desc: 'Pas toxique. Presque.' },
  champignon_luisant: { name: 'Champignon luisant', value: 8, rarity: 1, icon: 'mush', tint: 'glow', mat: 1, desc: 'Il brille la nuit. Rare et précieux.' },
  coquillage: { name: 'Coquillage', value: 1, icon: 'shell_i', mat: 1, desc: 'Nacré et solide.' },
  // ----- matériaux transformés -----
  corde: { name: 'Corde', value: 4, icon: 'rope', mat: 1, desc: 'Trois fibres tressées.' },
  planche: { name: 'Planche', value: 5, icon: 'plank', mat: 1, desc: 'Du bois scié à l’établi.' },
  charbon: { name: 'Charbon de bois', value: 3, icon: 'coal', mat: 1, desc: 'Cuit au feu de camp. Indispensable à la forge.' },
  toile: { name: 'Toile de voile', value: 6, icon: 'cloth', mat: 1, desc: 'Tissée de fibres, solide comme une voile.' },
  lingot_fer: { name: 'Lingot de fer', value: 14, icon: 'ingot', mat: 1, desc: 'Fondu à la forge.' },
  // ----- outils -----
  hache_silex: { name: 'Hache de silex', tool: 'axe', tier: 1, value: 10, icon: 'axe', tint: 'flint', desc: 'Permet d’abattre les arbres (E près d’un arbre).' },
  pioche_silex: { name: 'Pioche de silex', tool: 'pick', tier: 1, value: 10, icon: 'pick', tint: 'flint', desc: 'Permet d’extraire pierre et minerai des rochers.' },
  hache_fer: { name: 'Hache de fer', tool: 'axe', tier: 2, value: 60, rarity: 1, icon: 'axe', tint: 'iron', desc: 'Récolte davantage de bois et de résine.' },
  pioche_fer: { name: 'Pioche de fer', tool: 'pick', tier: 2, value: 70, rarity: 1, icon: 'pick', tint: 'iron', desc: 'Récolte davantage de pierre et de minerai.' },
  // ----- armes -----
  gourdin: { name: 'Gourdin', slot: 'weapon', atk: 8, speed: 0.62, value: 15, icon: 'club', wtint: 'rust', desc: 'Un bout de bois bien lourd.' },
  lance_silex: { name: 'Lance de silex', slot: 'weapon', atk: 10, speed: 0.5, value: 25, icon: 'spear', wtint: 'steel', desc: 'Légère et tranchante.' },
  hache_guerre: { name: 'Hache d’abordage', slot: 'weapon', atk: 21, speed: 0.62, crit: 0.04, value: 520, rarity: 1, icon: 'waraxe', wtint: 'steel', desc: 'Lourde, brutale, efficace.' },
  // ----- armures et talismans -----
  chapeau_feuilles: { name: 'Chapeau de feuilles', slot: 'hat', def: 1, spd: 0.03, value: 8, icon: 'leafhat', look: 'paille', desc: 'Tressé avec des palmes. Frais et léger.' },
  casque_os: { name: 'Heaume d’os', slot: 'hat', def: 4, value: 70, icon: 'bonehelm', look: 'crane', desc: 'Des os maudits assemblés. Inquiétant.' },
  armure_coquillages: { name: 'Armure de coquillages', slot: 'body', def: 5, hp: 10, value: 60, icon: 'shellarmor', look: 'gilet', lookCol: 'teal', desc: 'Des centaines de coquillages cousus sur une toile.' },
  carapace_crabe: { name: 'Carapace de crabe', slot: 'body', def: 6, value: 80, icon: 'crabarmor', look: 'gilet', lookCol: 'red', desc: 'Solide, et ça sent encore un peu la marée.' },
  collier_coquillages: { name: 'Collier de coquillages', slot: 'trinket', hp: 15, value: 20, icon: 'shellneck', desc: 'Porte-bonheur des pêcheurs.' },
  talisman_os: { name: 'Talisman d’os', slot: 'trinket', atk: 3, crit: 0.03, value: 60, icon: 'bonecharm', desc: 'Les morts n’aiment pas qu’on porte leurs os.' },
  // ----- cuisine et soins -----
  brochette_crabe: { name: 'Brochette de crabe', use: { heal: 35 }, value: 8, icon: 'skewer', desc: 'Rend 35 PV.' },
  ragout_marin: { name: 'Ragoût du marin', use: { heal: 90 }, value: 30, rarity: 1, icon: 'stew', desc: 'Rend 90 PV. Recette de Bartholomé.' },
  galette_coco: { name: 'Galette de coco', use: { heal: 30, en: 20 }, value: 10, icon: 'cake', desc: 'Rend 30 PV et 20 d’énergie.' },
  soupe_champignons: { name: 'Soupe de champignons', use: { heal: 10, en: 60 }, value: 12, icon: 'soup', desc: 'Rend 60 d’énergie.' },
  tarte_baies: { name: 'Tarte aux baies', use: { heal: 50 }, value: 14, icon: 'pie', desc: 'Rend 50 PV.' },
  bandage: { name: 'Bandage', use: { heal: 30 }, value: 5, icon: 'bandage', desc: 'Fibres et herbes. Rend 30 PV.' },
  elixir_flamme: { name: 'Élixir de la Lanterne', use: { heal: 160, en: 40 }, value: 60, rarity: 2, icon: 'elixir', desc: 'Rend 160 PV et 40 d’énergie.' },
  // ----- construction (à placer dans votre base) -----
  pavillon: { name: 'Pavillon pirate', place: 'pavillon', value: 30, icon: 'flag', desc: 'Plantez-le pour revendiquer un terrain et y bâtir votre base (une par pirate, hors de la ville).' },
  mur_bois: { name: 'Mur de bois', place: 'mur_bois', value: 6, icon: 'wall', tint: 'wood', desc: 'Les morts ne passent pas.' },
  palissade: { name: 'Palissade', place: 'palissade', value: 6, icon: 'palisade', desc: 'Des pieux taillés en pointe.' },
  mur_pierre: { name: 'Mur de pierre', place: 'mur_pierre', value: 8, icon: 'wall', tint: 'stone', desc: 'Solide et élégant.' },
  porte_bois: { name: 'Porte', place: 'porte', value: 12, icon: 'door', desc: 'Les pirates passent, les morts non.' },
  sol_planches: { name: 'Plancher', place: 'sol', value: 2, icon: 'floor', desc: 'Un sol en planches.' },
  tapis: { name: 'Tapis', place: 'tapis', value: 10, icon: 'rug', desc: 'Pour le confort du capitaine.' },
  torche_base: { name: 'Torche', place: 'torche', value: 3, icon: 'torch_i', desc: 'Éclaire votre base la nuit.' },
  lanterne_base: { name: 'Lanterne', place: 'lanterne', value: 20, icon: 'lantern', desc: 'Une belle lumière dorée.' },
  feu_camp: { name: 'Feu de camp', place: 'feu_camp', value: 10, icon: 'campfire', desc: 'Pour cuisiner. Éclaire et réchauffe.' },
  etabli: { name: 'Établi', place: 'etabli', value: 30, icon: 'bench_i', desc: 'Pour scier, tisser et assembler.' },
  forge_base: { name: 'Forge', place: 'forge_base', value: 60, icon: 'anvil', desc: 'Pour fondre et forger le métal.' },
  coffre_base: { name: 'Coffre', place: 'coffre', value: 35, icon: 'chest_i', desc: 'Rangement de votre base (24 places, partagées entre vos coffres).' },
  lit: { name: 'Lit', place: 'lit', value: 30, icon: 'bed', desc: 'Dormez dedans (E) : vous réapparaîtrez ici.' },
  canon_def: { name: 'Canon de défense', place: 'canon_def', value: 120, rarity: 1, icon: 'cannon_i', desc: 'Tire seul sur les morts qui approchent, quand vous êtes là.' },
  jardiniere: { name: 'Jardinière', place: 'jardiniere', value: 20, icon: 'planter', desc: 'Des baies et des herbes y poussent toutes seules.' },
  tonneau_deco: { name: 'Tonneau', place: 'tonneau', value: 6, icon: 'barrel', desc: 'Décoration.' },
  caisse_deco: { name: 'Caisse', place: 'caisse', value: 4, icon: 'crate_i', desc: 'Décoration.' },
});
// ----- 0.4 : navigation et grottes -----
Object.assign(ITEMS, {
  barque: { name: 'Barque', boat: { kind: 'barque', speed: 98 }, value: 180, icon: 'boat_i', desc: 'Une barque à rames. Face à l’eau, E pour la mettre à l’eau ; près du rivage, E pour accoster.' },
  sloop: { name: 'Sloop', boat: { kind: 'sloop', speed: 142, cannon: 1 }, value: 1400, rarity: 2, icon: 'sloop_i', desc: 'Un petit voilier rapide, armé d’un canon : clic droit à bord pour tirer.' },
  eclat_cristal: { name: 'Éclat de cristal', value: 22, icon: 'crystal', desc: 'Il luit faiblement dans le noir. Il pousse au fond des grottes (pioche).' },
  pendentif_cristal: { name: 'Pendentif de cristal', slot: 'trinket', hp: 25, crit: 0.04, value: 260, rarity: 1, icon: 'crystalneck', desc: 'Un éclat de cristal serti de fer. Il bat comme un cœur.' },
});
