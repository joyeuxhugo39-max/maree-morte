// Catalogue des objets. slot = emplacement d'équipement ; use = consommable.
// look/lookCol = apparence sur le personnage ; icon/tint = icône d'inventaire.
export const ITEMS = {
  // ----- armes de mêlée -----
  sabre_rouille: { name: 'Sabre rouillé', slot: 'weapon', atk: 6, speed: 0.5, value: 8, icon: 'w:sabre_rouille', wtint: 'rust', desc: 'Une lame piquée de rouille. Mieux que rien.', form: { k: 'blade', len: 11, w: 2, curve: 1.6, tip: 'point', guard: 'cross', bl: 'rust', hi: 'wood', gu: 'rust' } },
  coutelas: { name: 'Coutelas de matelot', slot: 'weapon', atk: 10, speed: 0.46, value: 120, icon: 'w:coutelas', wtint: 'steel', desc: 'Court, solide, fiable. Le compagnon des abordages.', form: { k: 'blade', len: 10, w: 3, curve: 1.2, tip: 'clip', guard: 'cup', bl: 'steel', hi: 'wood' } },
  sabre_abordage: { name: "Sabre d'abordage", slot: 'weapon', atk: 16, speed: 0.48, value: 450, rarity: 1, icon: 'w:sabre_abordage', wtint: 'gold', desc: 'Garde dorée, lame équilibrée. Les zombies le craignent.', form: { k: 'blade', len: 13, w: 2, curve: 2.2, tip: 'point', guard: 'basket', bl: 'steel', hi: 'gold' } },
  lame_corail: { name: 'Lame de corail maudit', slot: 'weapon', atk: 28, speed: 0.42, crit: 0.08, value: 2200, rarity: 3, icon: 'w:lame_corail', wtint: 'coral', desc: 'Taillée dans le Cœur de Corail. Elle murmure la nuit.', form: { k: 'blade', len: 14, w: 3, curve: 2.4, tip: 'point', guard: 'basket', bl: 'coral', hi: 'gold', glow: 'red' } },
  // ----- armes à feu -----
  pistolet_rouille: { name: 'Pistolet rouillé', slot: 'gun', gun: 10, value: 30, icon: 'w:pistolet_rouille', wtint: 'rust', wkind: 'pistol', shot: { n: 1, spread: 0, range: 150, speed: 290 }, desc: 'Il fait long feu une fois sur trois. Les deux autres fois, il fait mal.', form: { k: 'gun', type: 'pistol', len: 7, metal: 'rust', wood: 'wood' } },
  pistolet_silex: { name: 'Pistolet à silex', slot: 'gun', gun: 17, value: 160, rarity: 1, icon: 'w:pistolet_silex', wtint: 'steel', wkind: 'pistol', shot: { n: 1, spread: 0, range: 175, speed: 310 }, desc: 'Précis et bien huilé.', form: { k: 'gun', type: 'pistol', len: 8, metal: 'steel', wood: 'walnut', brass: 1 } },
  tromblon: { name: 'Tromblon', slot: 'gun', gun: 9, value: 520, rarity: 1, icon: 'w:tromblon', wkind: 'blunder', shot: { n: 5, spread: 0.42, range: 105, speed: 260 }, desc: 'Une gerbe de mitraille. Idéal contre les hordes.', form: { k: 'gun', type: 'pistol', len: 8, muzzle: 'flare', metal: 'brass', wood: 'wood' } },
  mousquet: { name: 'Mousquet de marine', slot: 'gun', gun: 32, value: 950, rarity: 2, icon: 'w:mousquet', wkind: 'musket', cdMul: 1.6, shot: { n: 1, spread: 0, range: 240, speed: 380, pierce: 2 }, desc: 'Lent à recharger, mais sa balle traverse deux ennemis.', form: { k: 'gun', type: 'rifle', len: 13, metal: 'steel', wood: 'wood', brass: 1 } },
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
  gourdin: { name: 'Gourdin', slot: 'weapon', atk: 8, speed: 0.62, value: 15, icon: 'w:gourdin', wtint: 'rust', desc: 'Un bout de bois bien lourd.', form: { k: 'blunt', len: 12, head: 'club', bl: 'wood' } },
  lance_silex: { name: 'Lance de silex', slot: 'weapon', atk: 10, speed: 0.5, reach: 34, arc: 0.6, value: 25, icon: 'w:lance_silex', wtint: 'steel', desc: 'Légère et tranchante.', form: { k: 'spear', len: 14, head: 'leaf', bl: 'flint', hi: 'wood', anim: 'thrust' } },
  hache_guerre: { name: 'Hache d’abordage', slot: 'weapon', atk: 21, speed: 0.62, crit: 0.04, arc: 1.3, kb: 1.4, value: 520, rarity: 1, icon: 'w:hache_guerre', wtint: 'steel', desc: 'Lourde, brutale, efficace.', form: { k: 'axe', len: 13, head: 'single', bl: 'steel', hi: 'wood' } },
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
// ----- 0.5 : l'arsenal -----
// mêlée : reach (portée, px), arc (demi-angle, rad), kb (recul), bleed / leech (part des dégâts)
// tir : shot { n, spread, range, speed, pierce, burst, gap, kind, explode, burn, bleed, kb }
const W = (id, o) => { ITEMS[id] = Object.assign({ slot: 'weapon', icon: 'w:' + id }, o); };
const F = (id, o) => { ITEMS[id] = Object.assign({ slot: 'gun', icon: 'w:' + id }, o); };
W('poignard', { name: 'Poignard de pont', atk: 7, speed: 0.32, reach: 21, arc: 0.9, crit: 0.1, value: 30, form: { k: 'blade', len: 7, w: 2, tip: 'point', guard: 'cross', bl: 'steel', hi: 'leather', gu: 'iron' }, desc: 'Court et vif : il frappe deux fois quand un sabre frappe une fois.' });
W('machette', { name: 'Machette de Brumesel', atk: 12, speed: 0.44, arc: 1.35, value: 90, form: { k: 'blade', len: 12, w: 3, curve: 0.6, tip: 'clip', guard: 'none', bl: 'steel', hi: 'wood' }, desc: 'Taillée pour couper les lianes. Et le reste.' });
W('crochet', { name: 'Crochet de flibustier', atk: 13, speed: 0.4, reach: 23, bleed: 0.35, rarity: 1, value: 160, form: { k: 'hook', bl: 'steel', hi: 'wood' }, desc: 'Arrache et déchire : la cible saigne.' });
W('rapiere', { name: 'Rapière de duelliste', atk: 15, speed: 0.34, reach: 33, arc: 0.55, crit: 0.14, rarity: 1, value: 380, form: { k: 'blade', len: 16, w: 1, tip: 'point', guard: 'basket', bl: 'silver', hi: 'gold', anim: 'thrust' }, desc: 'Une estocade précise, loin devant vous.' });
W('harpon', { name: 'Harpon de baleinier', atk: 17, speed: 0.58, reach: 40, arc: 0.45, kb: 1.8, rarity: 1, value: 300, form: { k: 'spear', len: 15, head: 'harpoon', bl: 'iron', hi: 'wood', anim: 'thrust' }, desc: 'Garde les morts à distance respectueuse.' });
W('cimeterre', { name: 'Cimeterre des sables', atk: 19, speed: 0.42, arc: 1.4, crit: 0.05, rarity: 1, value: 520, form: { k: 'blade', len: 14, w: 3, curve: 3.4, tip: 'point', guard: 'cross', bl: 'steel', hi: 'gold' }, desc: 'Sa lame large balaie tout devant vous.' });
W('masse', { name: 'Brise-crâne', atk: 23, speed: 0.72, kb: 2.4, rarity: 1, value: 480, form: { k: 'blunt', len: 11, head: 'mace', bl: 'iron', hi: 'wood' }, desc: 'Masse cloutée. Les morts reculent, en morceaux.' });
W('dague_cristal', { name: 'Dague de cristal', atk: 15, speed: 0.3, reach: 22, arc: 0.9, crit: 0.2, rarity: 2, value: 700, form: { k: 'blade', len: 8, w: 2, tip: 'point', guard: 'cross', bl: 'crystal', hi: 'silver', gu: 'silver', glow: 'cold' }, desc: 'Elle luit dans le noir et trouve toujours le point faible.' });
W('trident', { name: 'Trident du Noyé', atk: 25, speed: 0.55, reach: 38, arc: 0.6, leech: 0.08, rarity: 2, value: 1300, form: { k: 'spear', len: 15, head: 'trident', bl: 'teal', hi: 'teal', gu: 'teal', anim: 'thrust', glow: 'cold' }, desc: 'Chaque coup vous rend un peu de la vie volée aux morts.' });
W('sabre_os', { name: 'Sabre d’os royal', atk: 29, speed: 0.46, bleed: 0.3, crit: 0.08, rarity: 2, value: 1600, form: { k: 'blade', len: 14, w: 3, curve: 2, serr: 1, guard: 'skull', bl: 'bone', hi: 'bone', glow: 'green' }, desc: 'Arraché au Roi des Os. Ses dents font saigner.' });
W('flamberge', { name: 'Flamberge', atk: 31, speed: 0.78, reach: 33, arc: 1.7, kb: 1.6, rarity: 2, value: 1800, form: { k: 'blade', len: 19, w: 3, wavy: 1, tip: 'point', guard: 'cross', bl: 'steel', hi: 'leather', gu: 'iron' }, desc: 'Une lame ondulée, lourde, qui fauche large.' });
W('faux', { name: 'Faux du Passeur', atk: 30, speed: 0.7, reach: 34, arc: 2.3, leech: 0.1, rarity: 3, value: 2600, form: { k: 'scythe', len: 18, bl: 'dark', hi: 'ebony', glow: 'purple' }, desc: 'On dit qu’elle appartenait à celui qui fait traverser les morts.' });
W('ancre', { name: 'Ancre de l’Abysse', atk: 36, speed: 0.95, reach: 32, arc: 1.9, kb: 3, rarity: 3, value: 3000, form: { k: 'blunt', len: 15, head: 'anchor', bl: 'iron' }, desc: 'Il faut des bras de géant. Ou une malédiction.' });
F('pistolet_double', { name: 'Pistolet à deux coups', gun: 12, value: 220, cdMul: 1.1, shot: { n: 2, spread: 0.1, range: 160, speed: 300 }, form: { k: 'gun', type: 'pistol', len: 8, barrels: 2, metal: 'steel', wood: 'walnut' }, desc: 'Deux canons, deux balles.' });
F('poivriere', { name: 'Poivrière', gun: 10, rarity: 1, value: 420, cdMul: 1.35, shot: { n: 1, burst: 3, gap: 0.11, spread: 0.06, range: 160, speed: 320 }, form: { k: 'gun', type: 'pistol', len: 6, barrels: 3, metal: 'steel', wood: 'ebony', brass: 1 }, desc: 'Ses canons tournent : trois coups à la suite.' });
F('escopette', { name: 'Escopette', gun: 7, value: 260, cdMul: 1.15, shot: { n: 6, spread: 0.75, range: 85, speed: 250, kb: 1 }, form: { k: 'gun', type: 'rifle', len: 7, muzzle: 'wide', metal: 'iron', wood: 'wood' }, desc: 'Une gerbe de plombs, à bout portant.' });
F('carabine', { name: 'Carabine de marine', gun: 22, rarity: 1, value: 620, cdMul: 1.2, shot: { n: 1, range: 215, speed: 360 }, form: { k: 'gun', type: 'rifle', len: 11, metal: 'steel', wood: 'walnut', brass: 1 }, desc: 'Précise à moyenne distance.' });
F('pistolet_duel', { name: 'Pistolet de duel', gun: 24, crit: 0.08, rarity: 1, value: 700, shot: { n: 1, range: 190, speed: 390 }, form: { k: 'gun', type: 'pistol', len: 9, metal: 'silver', wood: 'ebony', brass: 1 }, desc: 'Canon damasquiné, détente douce. Pour les règlements de comptes.' });
F('crache_feu', { name: 'Crache-feu', gun: 8, rarity: 1, value: 650, cdMul: 1.3, shot: { n: 4, spread: 0.4, range: 75, speed: 190, kind: 'flame', burn: 0.6 }, form: { k: 'gun', type: 'pistol', len: 8, muzzle: 'flare', metal: 'copper', wood: 'wood', tank: 1 }, desc: 'Projette des flammes qui brûlent encore après le coup.' });
F('fusil_harpon', { name: 'Fusil-harpon', gun: 30, rarity: 1, value: 900, cdMul: 1.6, shot: { n: 1, range: 175, speed: 270, pierce: 3, kind: 'harpoon', kb: 2 }, form: { k: 'gun', type: 'rifle', len: 10, muzzle: 'harpoon', metal: 'iron', wood: 'wood' }, desc: 'Le harpon traverse jusqu’à quatre ennemis.' });
F('fusil_long', { name: 'Long fusil du guetteur', gun: 46, rarity: 2, value: 1500, cdMul: 2.1, shot: { n: 1, range: 310, speed: 480, pierce: 1, kind: 'slug' }, form: { k: 'gun', type: 'rifle', len: 15, metal: 'steel', wood: 'walnut', brass: 1, scope: 1 }, desc: 'Une longue-vue vissée sur le canon : il touche ce que l’œil voit.' });
F('pistolet_cristal', { name: 'Pistolet de cristal', gun: 25, rarity: 2, value: 1400, cdMul: 0.9, shot: { n: 1, range: 200, speed: 430, pierce: 1, kind: 'bolt' }, form: { k: 'gun', type: 'pistol', len: 8, metal: 'crystal', wood: 'silver', glow: 'cold' }, desc: 'Tire des éclats de lumière froide.' });
F('mortier_main', { name: 'Mortier à main', gun: 34, rarity: 2, value: 1700, cdMul: 2.2, shot: { n: 1, range: 150, speed: 170, kind: 'grenade', explode: 40 }, form: { k: 'gun', type: 'rifle', len: 7, muzzle: 'mortar', metal: 'bronze', wood: 'wood' }, desc: 'Lance un boulet qui explose à l’impact.' });
F('mousquet_os', { name: 'Mousquet d’os royal', gun: 40, rarity: 2, value: 1900, cdMul: 1.6, shot: { n: 1, range: 260, speed: 420, pierce: 2, bleed: 0.25 }, form: { k: 'gun', type: 'rifle', len: 13, metal: 'bone', wood: 'bone', glow: 'green' }, desc: 'Ses balles d’os font saigner.' });
F('couleuvrine', { name: 'Couleuvrine', gun: 52, rarity: 3, value: 3200, cdMul: 2.4, shot: { n: 1, range: 190, speed: 260, kind: 'cball', explode: 30, kb: 3 }, form: { k: 'gun', type: 'rifle', len: 11, muzzle: 'cannon', metal: 'bronze', wood: 'ebony' }, desc: 'Un canon de poche. Les morts ne s’en relèvent pas.' });
// ----- 0.6 : maisons, animaux, cambriolages, Kraken, Jumeaux -----
Object.assign(ITEMS, {
  // mobilier (à placer dans votre maison, touche B)
  table_bois: { name: 'Table en bois', place: 'table_h', home: 1, value: 25, icon: 'f_table', desc: 'Une solide table de taverne, pour vos cartes et vos chopes.' },
  chaise_bois: { name: 'Chaise', place: 'chaise_h', home: 1, value: 10, icon: 'f_chair', desc: 'On y pose son séant et ses bottes.' },
  etagere_bois: { name: 'Étagère garnie', place: 'etagere_h', home: 1, value: 30, icon: 'f_shelf', desc: 'Des bouteilles, des livres et des souvenirs de voyage.' },
  armoire: { name: 'Armoire', place: 'armoire_h', home: 1, value: 40, icon: 'f_wardrobe', desc: 'Grande armoire de chêne. Décoration.' },
  cheminee_pierre: { name: 'Cheminée', place: 'cheminee_h', home: 1, value: 60, icon: 'f_fireplace', desc: 'Un bon feu pour les nuits de Marée Morte.' },
  plante_pot: { name: 'Plante en pot', place: 'plante_h', home: 1, value: 12, icon: 'f_plant', desc: 'Un petit palmier qui ne demande rien.' },
  tableau_mer: { name: 'Tableau marin', place: 'tableau_h', home: 1, value: 45, icon: 'f_painting', desc: 'Un trois-mâts dans la tempête, sur son chevalet.' },
  tapis_brode: { name: 'Tapis brodé', place: 'tapis_h', home: 1, value: 35, icon: 'f_rug', desc: 'Rouge et or, venu de très loin.' },
  bibliotheque: { name: 'Bibliothèque', place: 'biblio_h', home: 1, value: 55, icon: 'f_books', desc: 'Des récits de naufrages et des cartes oubliées.' },
  trophee_kraken: { name: 'Trophée du Kraken', place: 'trophee_h', home: 1, rarity: 3, value: 2500, icon: 'f_trophy', desc: 'Un œil géant dans un bocal. Les visiteurs ne restent pas longtemps.' },
  serrure_renforcee: { name: 'Serrure renforcée', use: { lock: 1 }, value: 200, rarity: 1, icon: 'f_lock', desc: 'Utilisez-la chez vous : votre porte devient bien plus dure à crocheter.' },
  // animaux de compagnie : à installer chez vous (B) ou à emmener (clic droit)
  chaton: { name: 'Chaton de bord', pet: 'chat', place: 'pet_chat', home: 1, value: 120, icon: 'p_cat', desc: 'Il chasse les rats et ronronne. Clic droit : il vous suit.' },
  chien: { name: 'Chien de garde', pet: 'chien', place: 'pet_chien', home: 1, value: 220, icon: 'p_dog', desc: 'Il aboie sur les voleurs. Chez vous, il rend votre porte plus dure à crocheter.' },
  perroquet_vert: { name: 'Perroquet bavard', pet: 'perroquet', place: 'pet_perroquet', home: 1, value: 260, rarity: 1, icon: 'p_parrot', desc: 'Il répète tout. Surtout ce qu’il ne faut pas.' },
  singe: { name: 'Singe chapardeur', pet: 'singe', place: 'pet_singe', home: 1, value: 320, rarity: 1, icon: 'p_monkey', desc: 'Adorable. Vérifiez vos poches.' },
  bebe_kraken: { name: 'Bébé kraken', pet: 'kraken', place: 'pet_kraken', home: 1, value: 3000, rarity: 3, icon: 'p_kraken', desc: 'Retrouvé dans l’antre du Kraken. Il tient dans une main. Pour l’instant.' },
  // cambriolage
  crochets: { name: 'Crochets de serrurier', value: 30, icon: 'lockpick', desc: 'Devant la porte d’une maison qui n’est pas la vôtre : E pour crocheter. Un crochet casse souvent.' },
  montre_gousset: { name: 'Montre à gousset en or', slot: 'trinket', crit: 0.05, spd: 0.03, value: 900, rarity: 2, icon: 'r_watch', desc: 'Volée dans une maison de corsaire. Elle tictaque encore.' },
  bague_capitaine: { name: 'Bague de capitaine', slot: 'trinket', atk: 5, hp: 15, value: 1100, rarity: 2, icon: 'r_ring', desc: 'Une chevalière gravée d’une ancre. Pas à vous.' },
  collier_perles_noires: { name: 'Collier de perles noires', slot: 'trinket', hp: 40, crit: 0.06, value: 2400, rarity: 3, icon: 'r_pearls', desc: 'Des perles des abysses. Introuvable autrement qu’en le volant.' },
  coffret_bijoux: { name: 'Coffret à bijoux', value: 1500, rarity: 2, icon: 'r_casket', desc: 'Plein de bagues dépareillées. Un receleur en donnera un bon prix.' },
  tableau_maitre: { name: 'Tableau de maître', place: 'tableau_maitre_h', home: 1, value: 3000, rarity: 3, icon: 'f_masterpiece', desc: 'Une toile inestimable, dérobée dans une maison de corsaire.' },
  // Kraken
  encre_noire: { name: 'Encre des abysses', value: 14, icon: 'ink', desc: 'Une encre glacée qui ne sèche jamais.' },
  conque_abysses: { name: 'Conque des Abysses', quest: 1, use: { conch: 1 }, value: 500, rarity: 2, icon: 'conch', desc: 'À bord, dans le Gouffre du Kraken, utilisez-la (clic droit) pour appeler la bête.' },
  oeil_kraken: { name: 'Œil du Kraken', slot: 'trinket', hp: 50, atk: 6, crit: 0.06, value: 4000, rarity: 3, icon: 'kraken_eye', desc: 'Il vous regarde encore. Il voit les morts venir.' },
  tentacule_fumee: { name: 'Tentacule fumé', use: { heal: 120, en: 30 }, value: 40, rarity: 1, icon: 'tentacle_food', desc: 'Rend 120 PV et 30 d’énergie. Ça résiste sous la dent.' },
});
W('harpon_abysses', { name: 'Harpon des Abysses', atk: 34, speed: 0.55, reach: 42, arc: 0.6, kb: 2, leech: 0.06, rarity: 3, value: 4200, form: { k: 'spear', len: 17, head: 'harpoon', bl: 'teal', hi: 'dark', gu: 'teal', anim: 'thrust', glow: 'cold' }, desc: 'Forgé dans une dent du Kraken. Il a le goût de la mer.' });
W('sabre_jumeaux', { name: 'Sabre des Jumeaux', atk: 33, speed: 0.4, arc: 1.3, crit: 0.1, leech: 0.05, rarity: 3, value: 3800, form: { k: 'blade', len: 15, w: 3, curve: 2.6, tip: 'point', guard: 'basket', bl: 'silver', hi: 'dark', gu: 'gold', glow: 'purple' }, desc: 'Deux lunes gravées sur la lame. Il ne s’ouvre qu’à ceux qui ne voyagent pas seuls.' });
ITEMS.medaillon_lunes = { name: 'Médaillon des Deux Lunes', slot: 'trinket', atk: 4, hp: 30, crit: 0.08, value: 3600, rarity: 3, icon: 'r_moons', desc: 'Deux lunes d’argent qui se tiennent la main.' };

// ----- 0.7 : le Grand Large -----
Object.assign(ITEMS, {
  // matériaux des nouvelles régions
  soie_pendu: { name: 'Soie de pendu', value: 18, icon: 'silk', tint: 'black', mat: 1, desc: 'Un ruban de soie noire, dénoué d’une corde de la Forêt des Pendus.' },
  fil_or: { name: 'Fil d’or', value: 45, icon: 'goldthread', mat: 1, desc: 'Pour broder les galons d’un vrai capitaine.' },
  plume_corbeau: { name: 'Plume de corbeau', value: 14, icon: 'feather', mat: 1, desc: 'Arrachée au masque d’un médecin de peste.' },
  ecaille_sirene: { name: 'Écaille de sirène', value: 22, icon: 'sscale', mat: 1, desc: 'Irisée, froide, et elle chante quand on la porte à l’oreille.' },
  os_legionnaire: { name: 'Os de légionnaire', value: 16, icon: 'bigbone', mat: 1, desc: 'Un fémur gravé de numéros de régiment.' },
  braise: { name: 'Braise éternelle', value: 30, icon: 'ember', mat: 1, desc: 'Elle ne refroidit jamais. Ne la mettez pas dans votre poche.' },
  coeur_golem: { name: 'Cœur de golem', value: 70, icon: 'golemcore', rarity: 1, mat: 1, desc: 'Une pierre de lave qui bat encore.' },
  essence_damnee: { name: 'Essence damnée', value: 140, icon: 'essence', rarity: 2, mat: 1, desc: 'Ce qui reste d’une âme qui a refusé de partir.' },
  bois_epave: { name: 'Bois d’épave', value: 12, icon: 'wreckwood', mat: 1, desc: 'Arraché à la coque d’un navire maudit. Il sent la poudre et la vase.' },
  cuir_molosse: { name: 'Cuir de molosse', value: 26, icon: 'leather', mat: 1, desc: 'Épais, couturé de cicatrices. Parfait pour une tenue de combat.' },
  // billets du passeur : de ville en ville, sans prendre la mer
  billet_port: { name: 'Billet pour Port-Lanterne', use: { travel: 'port' }, value: 40, icon: 'ticket', tint: 'red', desc: 'Utilisez-le dans une ville pour embarquer sur le bateau du passeur.' },
  billet_havre: { name: 'Billet pour Havre-des-Brumes', use: { travel: 'havre' }, value: 40, icon: 'ticket', tint: 'teal', desc: 'Utilisez-le dans une ville pour embarquer sur le bateau du passeur.' },
  billet_rade: { name: 'Billet pour la Rade', use: { travel: 'rade' }, value: 60, icon: 'ticket', tint: 'black', desc: 'Utilisez-le dans une ville pour embarquer sur le bateau du passeur.' },
  billet_anse: { name: 'Billet pour Anse-Tranquille', use: { travel: 'anse' }, value: 40, icon: 'ticket', tint: 'green', desc: 'Utilisez-le dans une ville pour embarquer sur le bateau du passeur.' },
  brick: { name: 'Brick de course', boat: { kind: 'brick', speed: 172, cannon: 2 }, value: 4200, rarity: 3, icon: 'brick_i', desc: 'Deux mâts, deux canons par bordée, et la vitesse d’un requin. Le navire des grandes traversées.' },
  // talismans
  bague_freres: { name: 'Bague des Frères de la Côte', slot: 'trinket', atk: 6, hp: 30, crit: 0.05, value: 2400, rarity: 2, icon: 'r_ring', desc: 'Deux mains serrées, gravées dans l’argent. On ne la gagne pas seul.' },
  medaillon_flamme: { name: 'Médaillon de la Flamme', slot: 'trinket', hp: 80, def: 6, regen: 1.5, value: 6000, rarity: 3, icon: 'amulet', desc: 'Une étincelle de la Flamme Bénite, pour qui a rendu la Couronne à la mer.' },
  dent_comte: { name: 'Croc du Comte', slot: 'trinket', atk: 10, crit: 0.08, hp: 40, value: 7000, rarity: 3, icon: 'fang', desc: 'Arraché à Vespère lui-même. Il a soif.' },
});
// armes du Grand Large (épiques et légendaires)
W('hache_bourreau', { name: 'Hache du Bourreau', atk: 38, speed: 0.78, arc: 1.6, kb: 2.2, bleed: 0.3, rarity: 2, value: 2600, form: { k: 'axe', len: 15, head: 'double', bl: 'dark', hi: 'ebony' }, desc: 'Elle n’a jamais raté une nuque.' });
W('trident_sirene', { name: 'Trident de la Reine', atk: 33, speed: 0.5, reach: 40, arc: 0.6, leech: 0.1, rarity: 2, value: 2400, form: { k: 'spear', len: 16, head: 'trident', bl: 'coral', hi: 'teal', gu: 'gold', anim: 'thrust', glow: 'cold' }, desc: 'Chaque coup rend un peu de souffle.' });
W('scalpel_corbeau', { name: 'Scalpel du Docteur', atk: 27, speed: 0.28, reach: 22, arc: 0.9, crit: 0.22, bleed: 0.45, rarity: 2, value: 2800, form: { k: 'blade', len: 8, w: 1, tip: 'point', guard: 'none', bl: 'silver', hi: 'ebony' }, desc: 'Une lame de chirurgien. Le Docteur Corbeau n’a jamais soigné personne avec.' });
W('marteau_brasier', { name: 'Marteau du Brasier', atk: 46, speed: 0.92, reach: 30, arc: 1.7, kb: 3, burn: 0.5, rarity: 2, value: 3400, form: { k: 'blunt', len: 14, head: 'mace', bl: 'bronze', hi: 'ebony', glow: 'warm' }, desc: 'Encore rouge. Il enflamme tout ce qu’il touche.' });
W('lame_vespere', { name: 'Lame de Vespère', atk: 52, speed: 0.42, arc: 1.4, crit: 0.12, leech: 0.08, bleed: 0.25, rarity: 3, value: 9000, form: { k: 'blade', len: 16, w: 3, curve: 2.2, serr: 1, tip: 'point', guard: 'skull', bl: 'dark', hi: 'ebony', gu: 'gold', glow: 'purple' }, desc: 'L’épée du Comte des Marées. Elle boit le sang de ceux qu’elle touche.' });
W('faux_damnee', { name: 'Faux des Damnés', atk: 58, speed: 0.72, reach: 36, arc: 2.4, leech: 0.12, rarity: 3, value: 9500, form: { k: 'scythe', len: 19, bl: 'dark', hi: 'bone', glow: 'green' }, desc: 'Forgée dans la cendre de l’Île des Damnés. Chaque moisson la rend plus affamée.' });
W('sabre_fanfaron', { name: 'Sabre du Fanfaron', atk: 49, speed: 0.34, reach: 31, arc: 1.1, crit: 0.2, rarity: 3, value: 8800, form: { k: 'blade', len: 15, w: 2, curve: 1.6, tip: 'point', guard: 'basket', bl: 'silver', hi: 'gold', gu: 'gold', anim: 'thrust', glow: 'warm' }, desc: 'Ambroise Vif-Argent ne s’en sépare jamais. Sauf pour vous. Une fois.' });
const F2 = (id, o) => { ITEMS[id] = Object.assign({ slot: 'gun', icon: 'w:' + id }, o); };
F2('tromblon_ermite', { name: 'Tromblon de l’Ermite', gun: 22, rarity: 1, value: 1100, cdMul: 1.35, shot: { n: 7, spread: 0.7, range: 110, speed: 280, kb: 1.5 }, form: { k: 'gun', type: 'rifle', len: 9, muzzle: 'wide', metal: 'bronze', wood: 'walnut', brass: 1 }, desc: 'Il a servi contre les crabes, les morts et deux percepteurs.' });
F2('mousquet_general', { name: 'Mousquet du Général', gun: 58, rarity: 2, value: 3000, cdMul: 1.8, shot: { n: 1, range: 300, speed: 470, pierce: 3, bleed: 0.2 }, form: { k: 'gun', type: 'rifle', len: 14, metal: 'bone', wood: 'ebony', brass: 1, glow: 'green' }, desc: 'Une balle traverse quatre rangs de légionnaires.' });
F2('canon_damne', { name: 'Canon des Damnés', gun: 74, rarity: 3, value: 9200, cdMul: 2.2, shot: { n: 1, range: 210, speed: 280, kind: 'cball', explode: 46, burn: 0.3, kb: 3 }, form: { k: 'gun', type: 'rifle', len: 12, muzzle: 'cannon', metal: 'dark', wood: 'ebony', glow: 'green' }, desc: 'Ses boulets brûlent d’un feu vert qui ne s’éteint pas.' });
F2('pistolet_couronne', { name: 'Pistolet de la Couronne', gun: 64, crit: 0.12, rarity: 3, value: 9000, cdMul: 0.85, shot: { n: 1, range: 240, speed: 460, pierce: 2, kind: 'bolt' }, form: { k: 'gun', type: 'pistol', len: 10, metal: 'gold', wood: 'ebony', brass: 1, glow: 'cold' }, desc: 'Forgé dans l’or de la Couronne brisée. Il tire de la lumière de lune.' });
// tenues : elles changent l’apparence et donnent des bonus (emplacement Tenue)
const O = (id, o) => { ITEMS[id] = Object.assign({ slot: 'outfit', icon: 'o:' + id }, o); };
O('tenue_mousse', { name: 'Tenue de mousse', hp: 15, def: 2, value: 120, outfit: { top: 'rayee', pants: 'navy', boots: 'brown', hat: 'bonnet', hatCol: 'red' }, desc: 'Marinière, bonnet rouge : le b.a.-ba du marin.' });
O('tenue_boucanier', { name: 'Tenue de boucanier', atk: 3, crit: 0.03, def: 3, value: 420, rarity: 1, outfit: { top: 'gilet', topCol: 'brown', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'black' }, desc: 'Gilet de cuir et bandana noir. Odeur de fumée incluse.' });
O('tenue_corsaire', { name: 'Tenue de corsaire', atk: 3, def: 6, hp: 25, value: 900, rarity: 1, outfit: { top: 'manteau', topCol: 'red', pants: 'white', boots: 'black', hat: 'tricorne', hatCol: 'black' }, desc: 'Le manteau écarlate des corsaires du roi. Ou de ceux qui l’ont volé.' });
O('tenue_sables', { name: 'Tenue des sables', spd: 0.08, def: 4, regen: 0.8, value: 800, rarity: 1, outfit: { top: 'vareuse', topCol: 'yellow', pants: 'brown', boots: 'brown', hat: 'foulard', hatCol: 'yellow' }, desc: 'Légère, couleur de dune. On court plus vite dans le sable.' });
O('tenue_brumes', { name: 'Tenue des Brumes', spd: 0.06, def: 6, crit: 0.04, value: 1600, rarity: 2, outfit: { top: 'manteau', topCol: 'teal', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'teal', cape: 'teal' }, desc: 'Tissée avec la soie des pendus. Elle se fond dans le brouillard.' });
O('tenue_sirene', { name: 'Parure de sirène', hp: 40, regen: 1.6, spd: 0.04, value: 1800, rarity: 2, outfit: { top: 'vareuse', topCol: 'teal', pants: 'teal', boots: 'teal', hat: 'couronne' }, desc: 'Des écailles cousues sur un voile marin. Elle soigne les blessures.' });
O('tenue_peste', { name: 'Tenue du médecin de peste', def: 9, hp: 35, regen: 1.2, value: 2200, rarity: 2, outfit: { top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'bec', hatCol: 'black' }, desc: 'Masque à bec et long manteau ciré. Rien ne vous atteint. Presque.' });
O('armure_conquistador', { name: 'Armure du conquistador', def: 18, hp: 40, spd: -0.04, value: 2600, rarity: 2, outfit: { top: 'armure', topCol: 'grey', pants: 'brown', boots: 'black', hat: 'morion' }, desc: 'Plastron et morion d’acier, retrouvés au pied du volcan. Lourd, mais rien ne passe.' });
O('tenue_freres', { name: 'Tenue des Frères de la Côte', atk: 7, crit: 0.05, def: 7, value: 2800, rarity: 2, outfit: { top: 'gilet', topCol: 'red', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'red', cape: 'black' }, desc: 'Portée par ceux qui ont vaincu les Frères Ferrailleurs. À deux.' });
O('habit_royal', { name: 'Habit de capitaine royal', atk: 6, def: 14, hp: 70, crit: 0.04, value: 6000, rarity: 3, outfit: { top: 'capitaine', topCol: 'navy', pants: 'white', boots: 'black', hat: 'plume', hatCol: 'navy', cape: 'red' }, desc: 'Galons d’or et plume blanche : on salue sur votre passage.' });
O('tenue_fanfaron', { name: 'Tenue du Fanfaron', atk: 8, crit: 0.1, spd: 0.08, def: 8, value: 6000, rarity: 3, outfit: { top: 'manteau', topCol: 'purple', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'purple', cape: 'purple' }, desc: 'Le manteau d’Ambroise Vif-Argent. Il vous donne l’air de savoir ce que vous faites.' });
O('tenue_comte', { name: 'Tenue du Comte des Marées', atk: 9, def: 20, hp: 90, crit: 0.05, leech: 0.03, value: 12000, rarity: 3, outfit: { top: 'capitaine', topCol: 'black', pants: 'black', boots: 'black', hat: 'capitaine', hatCol: 'black', cape: 'purple' }, desc: 'Le costume de Vespère, Comte des Marées. On dit qu’il chuchote la nuit.' });
O('armure_damnee', { name: 'Armure des Damnés', def: 26, hp: 70, atk: 6, spd: -0.03, value: 11000, rarity: 3, outfit: { top: 'armure', topCol: 'black', pants: 'black', boots: 'black', hat: 'crane' }, desc: 'Forgée dans les os et la cendre de l’Île des Damnés.' });
