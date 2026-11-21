// Lot 6 : La Nuit des Mille Voiles — le grand festival pirate de Port-Lanterne. Ce fichier ne contient que des données :
// le calendrier des éditions, les jetons, la boutique, les indices de la chasse au trésor, le parcours de la course,
// les rivaux, les textes de Mira Bellécume. La mécanique est dans server/festival.js ; les décors dans
// shared/festival-world.js ; ce qui doit être calculé à l'identique des deux côtés (cibles, obstacles) dans shared/fest-sim.js.

// ------------------------------------------------------------ le calendrier : une édition par semaine, du jeudi midi au lundi midi (UTC)
// Le 1er janvier 1970 était un jeudi : les éditions se comptent à partir de ce jeudi-là, à midi.
const WEEK = 7 * 86400e3, THU = 12 * 3600e3, OPEN_FOR = 4 * 86400e3;
export const VARIANTS = ['L’édition des Lampions', 'L’édition des Mouettes', 'L’édition des Étoiles'];
export function festEdition(ms, force = null) {
  const idx = Math.floor((ms - THU) / WEEK), start = THU + idx * WEEK, end = start + OPEN_FOR;
  const open = force === 'open' ? true : force === 'closed' ? false : ms < end;
  return { idx, key: 'MV' + idx, variant: ((idx % 3) + 3) % 3, open, start, end, next: ms < end ? start : start + WEEK };
}
export const dayKey = (ms) => Math.floor(ms / 86400e3);

// ------------------------------------------------------------ les jetons du festival (une monnaie qui ne sert qu'ici, gardée d'une édition à l'autre)
export const TOK = {
  stamp: { canon: 25, tresor: 30, taverne: 25, gabier: 25, duel: 25, course: 40 }, // la première réussite de l'édition (un tampon du carnet)
  complete: 60, // le carnet complet : les six tampons
  show: 10, // assister au spectacle (une fois par spectacle)
  secret: 25, // chaque secret, une seule fois
  cap: 6, // au-delà, une épreuve rejouée le même jour ne rapporte plus de jetons (le plaisir reste)
};
export const EPREUVES = {
  canon: { name: 'Le Concours de canonniers', where: 'au bout de la jetée', short: 'Canonniers' },
  tresor: { name: 'La Chasse au trésor de la grand-mère Bellécume', where: 'Mira donne le premier indice', short: 'Chasse au trésor' },
  taverne: { name: 'Le Défi des tavernes', where: 'à la Sirène Borgne, avec Barnabé Tire-Bouchon', short: 'Défi des tavernes' },
  gabier: { name: 'Le Parcours du gabier', where: 'sur la plage, à l’ouest de la scène', short: 'Parcours du gabier' },
  duel: { name: 'Le Duel des capitaines', where: 'la Lice, sous la tente rayée de la plage', short: 'Duel des capitaines' },
  course: { name: 'La Course des Mille Voiles', where: 'inscriptions auprès d’Anselin, sur la jetée', short: 'La Course' },
};
export const EP_ORDER = ['canon', 'tresor', 'taverne', 'gabier', 'duel', 'course'];

// ------------------------------------------------------------ la boutique de Zéphyrine (les jetons ne s'achètent pas : ils se gagnent)
// kind : voile, pavillon, tenue, emote, deco (navire), titre, objet. Rien ici ne donne de force : ce sont des parures.
// feat : la parure exclusive d'une variante d'édition (elle revient une semaine sur trois).
export const SHOP = [
  { id: 'voile_lampion', kind: 'voile', name: 'Voiles Lampion', price: 60, sail: [0xb8321e, 0xe0602a, 0xf6b84a], desc: 'Rouge braise et or, comme les lampions de la jetée.' },
  { id: 'voile_azur', kind: 'voile', name: 'Voiles d’Azur', price: 60, sail: [0x2a5a9a, 0x4a86c8, 0xa8d4f4], desc: 'Le bleu du large, un jour sans nuage.' },
  { id: 'voile_nuit', kind: 'voile', name: 'Voiles de la Nuit', price: 90, sail: [0x141c3a, 0x22305a, 0x3c4e86], desc: 'Bleu de minuit : elles ne se voient qu’au clair de lune.' },
  { id: 'voile_mille', kind: 'voile', name: 'Voiles des Mille Voiles', price: 150, feat: 0, sail: [0xd8c08a, 0xf4e2a8, 0xfff8de], desc: 'Crème et or, brodées d’une rose des vents. L’édition des Lampions seulement.' },
  { id: 'pav_fete', kind: 'pavillon', name: 'Pavillon de fête', price: 40, flag: 0xe8427a, desc: 'Rose vif : on vient faire la fête.' },
  { id: 'pav_or', kind: 'pavillon', name: 'Pavillon d’or', price: 70, flag: 0xf2c14a, desc: 'Un pavillon doré. Il ne fait peur à personne, et c’est voulu.' },
  { id: 'pav_mouette', kind: 'pavillon', name: 'Pavillon de la Mouette', price: 120, feat: 1, flag: 0xf4f0e4, desc: 'Blanc, avec une mouette rieuse. L’édition des Mouettes seulement.' },
  { id: 'tenue_gala', kind: 'tenue', name: 'Tenue de gala', price: 80, look: { top: 'capitaine', topCol: 'purple', hat: 'plume', hatCol: 'yellow' }, desc: 'Le manteau violet et le chapeau à plume des grands soirs.' },
  { id: 'tenue_matelot', kind: 'tenue', name: 'Marinière de fête', price: 50, look: { top: 'rayee', topCol: 'teal', hat: 'bandana', hatCol: 'orange' }, desc: 'Rayures et foulard : la tenue des gabiers en bordée.' },
  { id: 'tenue_lampion', kind: 'tenue', name: 'Gilet Lampion', price: 50, look: { top: 'gilet', topCol: 'orange', hat: 'bonnet', hatCol: 'red' }, desc: 'Orange et rouge : on vous voit de l’autre bout de la plage.' },
  { id: 'tenue_etoiles', kind: 'tenue', name: 'Habit des Étoiles', price: 150, feat: 2, look: { top: 'capitaine', topCol: 'navy', hat: 'tricorne', hatCol: 'white' }, desc: 'Bleu nuit et tricorne blanc. L’édition des Étoiles seulement.' },
  { id: 'em_gigue', kind: 'emote', name: 'Émote : la Gigue', price: 40, emote: 'gigue', desc: 'Une gigue à deux temps, talons en l’air (touche 6).' },
  { id: 'em_feu', kind: 'emote', name: 'Émote : Feu d’artifice', price: 60, emote: 'feu', desc: 'Une fusée qui part de votre main et éclate au-dessus de vous (touche 7).' },
  { id: 'em_confettis', kind: 'emote', name: 'Émote : Confettis', price: 30, emote: 'confettis', desc: 'Une poignée de confettis, jetée en l’air (touche 8).' },
  { id: 'em_reverence', kind: 'emote', name: 'Émote : Révérence', price: 30, emote: 'reverence', desc: 'Une révérence de capitaine, chapeau bas (touche 9).' },
  { id: 'deco_lampions', kind: 'deco', name: 'Guirlande de lampions (navire)', price: 90, deco: 'lampions', desc: 'Des lampions tendus dans le gréement de votre navire : la nuit, il se voit de loin.' },
  { id: 'deco_fanions', kind: 'deco', name: 'Fanions de pavois (navire)', price: 60, deco: 'fanions', desc: 'Une rangée de fanions de couleur, du beaupré au grand mât.' },
  { id: 'titre_fetard', kind: 'titre', name: 'Titre « Fêtard de Port-Lanterne »', price: 50, title: 'Fêtard de Port-Lanterne', desc: 'Pour ceux qui ne rentrent jamais avant l’aube.' },
  { id: 'titre_ame', kind: 'titre', name: 'Titre « Âme de la fête »', price: 200, title: 'Âme de la fête', desc: 'Le plus cher des titres du festival. Mira le salue elle-même.' },
  { id: 'fusees', kind: 'objet', name: 'Cinq fusées de fête', price: 15, item: 'fusee_fete', n: 5, again: 1, desc: 'Des feux d’artifice à tirer soi-même (utiliser : F, ou dans l’inventaire).' },
];
export const SHOP_BY = Object.fromEntries(SHOP.map((s) => [s.id, s]));
export const FEST_EMOTES = { gigue: 'em_gigue', feu: 'em_feu', confettis: 'em_confettis', reverence: 'em_reverence', valse: null }; // la valse ne s'achète pas : c'est un secret

// ------------------------------------------------------------ les secrets du festival
export const SECRETS = {
  mouette_or: { name: 'La Mouette d’or', hint: 'Il paraît qu’une cible dorée traverse parfois le port, pendant le concours de canonniers.' },
  bouteille: { name: 'La bouteille du phare', hint: 'La grand-mère Bellécume avait caché plus de choses qu’on ne le croit. Au pied du phare, peut-être…' },
  passe: { name: 'La Passe des Brisants', hint: 'Un vieux gabier jure qu’une lanterne marque un passage entre les récifs, pendant la course.' },
  valse: { name: 'La Valse sous les étoiles', hint: 'Danser sur la scène pendant le bouquet final… personne n’ose.' },
};

// ------------------------------------------------------------ 1. le concours de canonniers
export const CANON = {
  round: 45, // secondes
  reload: 1.0, // entre deux tirs
  flight: 0.55, // le temps de vol du boulet
  range: 230, // portée en pixels
  hitR: 13, // rayon d'impact
  stamp: 8, // le score qui vaut le tampon du carnet
  lanes: 3, // trois canons, trois couloirs d'eau
};
export const CANON_PATTERNS = [ // une variante d'édition = un jeu de cibles
  { name: 'Les tonneaux et les mouettes', kinds: ['tonneau', 'tonneau', 'mouette', 'pavillon'] },
  { name: 'Les barriques à la dérive', kinds: ['tonneau', 'tonneau', 'tonneau', 'mouette', 'pavillon'] },
  { name: 'Le galion de carton', kinds: ['galion', 'tonneau', 'mouette', 'pavillon'] },
];
export const TARGETS = { // pts : les points ; r : la taille ; sp : la vitesse (pixels / s)
  tonneau: { name: 'Tonneau', pts: 1, r: 9, sp: 22 },
  pavillon: { name: 'Pavillon', pts: 2, r: 7, sp: 30 },
  mouette: { name: 'Mouette de bois', pts: 3, r: 6, sp: 46 },
  galion: { name: 'Galion de carton', pts: 2, r: 12, sp: 14 },
  mouette_or: { name: 'Mouette d’or', pts: 10, r: 6, sp: 64 },
};

// ------------------------------------------------------------ 2. la chasse au trésor de la grand-mère Bellécume
// Chaque indice porte un symbole et un chiffre romain. Le cadenas du coffre se tourne dans l'ordre des chiffres.
export const SYMBOLS = ['l’Ancre', 'l’Étoile', 'la Lune', 'la Sirène', 'la Rose des vents', 'la Cloche', 'le Crâne', 'la Couronne'];
export const ROMAN = ['I', 'II', 'III', 'IV'];
export const CLUES = [
  { k: 'puits', tx: 146, ty: 94, at: 'la margelle du puits', riddle: 'On y puise sans jamais toucher le fond de la mer.' },
  { k: 'flamme', tx: 150, ty: 96, at: 'le socle de la Flamme Bénite', riddle: 'Elle veille sur les vivants, et ne brûle aucun bois.' },
  { k: 'phare', tx: 174, ty: 98, at: 'la porte du phare', riddle: 'Un œil unique, qui ne dort que le jour.' },
  { k: 'ancre', tx: 146, ty: 117, at: 'la vieille ancre de la plage', riddle: 'Elle tenait un navire ; elle ne tient plus que le sable.' },
  { k: 'coco', tx: 144, ty: 94, at: 'le perchoir de Coco', riddle: 'Il répète tout, et ne comprend rien.' },
  { k: 'primes', tx: 141, ty: 100, at: 'le tableau des primes', riddle: 'Des visages qui valent de l’or, et que personne n’aime.' },
  { k: 'filets', tx: 153, ty: 117, at: 'les filets qui sèchent', riddle: 'Ils sèchent au soleil et rêvent de poissons.' },
  { k: 'jetee', tx: 150, ty: 126, at: 'le dernier lampion de la jetée', riddle: 'Au bout du bois, là où la terre renonce.' },
];
export const CHEST_AT = [ // le coffre final, selon la variante d'édition
  { tx: 136, ty: 114, at: 'sous l’estrade de la scène', riddle: 'Là où chantent les musiciens, sous leurs pieds.' },
  { tx: 171, ty: 99, at: 'au pied du phare', riddle: 'Là où l’œil unique pose son pied.' },
  { tx: 155, ty: 127, at: 'au bout de la jetée, sous les filets du passeur', riddle: 'Là où l’on embarque, sous ce qui attrape.' },
];
export const BOTTLE = { tx: 178, ty: 99, at: 'les rochers au pied du phare' }; // le secret « bouteille »

// ------------------------------------------------------------ 3. le défi des tavernes (Barnabé Tire-Bouchon, à la Sirène Borgne)
export const TAV = {
  des: { dice: 3, rerolls: 2 }, // trois dés ; on peut relancer deux fois ceux qu'on veut ; Barnabé joue ensuite
  mem: { colors: 4, max: 9 }, // les chopes qui s'allument : on répète la suite
  ref: { tries: 3, min: 1.4, max: 3.6, early: 0.12 }, // « Tirez ! » : on clique ; trop tôt = faux départ
  stamp: 12, // le total qui vaut le tampon
};
export const TAV_TWIST = ['Les dés de Barnabé ont un six de plus.', 'Ce soir, les chopes s’allument plus vite.', 'Ce soir, Barnabé fait durer le suspense avant « Tirez ! ».'];

// ------------------------------------------------------------ 4. le parcours du gabier (une salle : quais, barques amarrées, mâture)
export const GABIER = { stamp: 75, gold: 45, silver: 60 }; // secondes : le tampon, puis les paliers
// ------------------------------------------------------------ 5. le duel des capitaines (la Lice)
export const CHAMPIONS = [
  { id: 'champion_bosco', name: 'Bosco le Rieur', line: 'Allez, mousse ! Personne ne meurt, ici. On se fait juste un peu mal.' },
  { id: 'champion_escarmouche', name: 'Dame Escarmouche', line: 'En garde. Je ne frappe jamais deux fois au même endroit.' },
  { id: 'champion_fanfaron', name: 'Le Capitaine Fanfaron', line: 'Approchez, approchez ! Personne ne m’a jamais battu. Enfin, presque personne.' },
];

// ------------------------------------------------------------ 6. la course des Mille Voiles
// Les bouées sont en cases du monde. Le départ et l'arrivée : une ligne au sud de la jetée de Port-Lanterne.
export const RACE = {
  line: { x0: 141, x1: 163, y: 137 }, // la ligne de départ et d'arrivée
  grid: { tx: 152, ty: 142 }, // le centre de la grille de départ (au sud de la ligne)
  r: 64, // le rayon d'une bouée (pixels)
  open: 30, // les inscriptions restent ouvertes 30 s après la première, puis le départ est donné
  maxTime: 600, // au-delà de 10 minutes, la course est perdue (la mer appartient de nouveau à tout le monde)
  rentSpeed: 128, // le cotre de location (pixels / s, par bon vent)
  falseStart: 10, // secondes de pénalité
};
export const BUOYS = [ // dans le sens de l'édition des Lampions ; les Mouettes courent à l'envers ; les Étoiles changent le vent
  { n: 'La Bouée du Phare', tx: 190, ty: 112, env: 'La côte du phare' },
  { n: 'Le Banc des Mouettes', tx: 300, ty: 121, env: 'Le large' },
  { n: 'La Pointe du Levant', tx: 374, ty: 150, env: 'Les rafales du Levant' },
  { n: 'L’Îlot du Large', tx: 404, ty: 222, env: 'Le grand large' },
  { n: 'Le Récif du Sud', tx: 256, ty: 206, env: 'Les récifs de l’Île Verte' },
  { n: 'La Nappe de Brume', tx: 211, ty: 244, env: 'La brume' },
  { n: 'Le Cimetière d’Épaves', tx: 150, ty: 241, env: 'Le cimetière d’épaves' },
  { n: 'La Passe de l’Îlot', tx: 172, ty: 201, env: 'Le retour' },
];
export const SECRET_BUOY = { n: 'La lanterne des Brisants', tx: 233, ty: 233, r: 40 }; // le secret « passe »
// les courants (vx, vy en pixels / s) et les vents (mul : multiplicateur du vent), en cercles de cases du monde
export const CURRENTS = [
  { n: 'Le Courant des Mouettes', tx: 245, ty: 125, r: 34, vx: 26, vy: 0 },
  { n: 'Le Contre-courant du Large', tx: 330, ty: 214, r: 40, vx: -24, vy: -4 },
  { n: 'Le Remous de la Passe', tx: 178, ty: 214, r: 16, vx: 0, vy: -18 },
];
export const WINDS = [
  { n: 'Les Rafales du Levant', tx: 372, ty: 168, r: 36, mul: 1.32 },
  { n: 'Le Calme de l’Île Verte', tx: 252, ty: 186, r: 22, mul: 0.62 },
];
export const FOG = { tx: 211, ty: 244, r: 30 }; // la nappe de brume : on n'y voit la bouée que de près
export const WRECKS = [[140, 236], [158, 247], [146, 251], [163, 233], [133, 244]]; // des mâts d'épaves qui sortent de l'eau (décor)
export const RIVALS = [ // les équipages de Port-Lanterne : ils courent aussi, pour que la course ne soit jamais vide
  { name: 'La Mouette Rieuse', skill: 0.86, pal: 'barque' },
  { name: 'Le Hareng Saur', skill: 0.8, pal: 'goelette' },
  { name: 'La Belle Insolente', skill: 0.93, pal: 'brick' },
];

// ------------------------------------------------------------ le spectacle de chaque nuit
export const SHOW = { at: 0.78, dur: 150 }; // à la tombée de la nuit (fraction de la journée), pendant deux minutes et demie
export const MIRA_SHOW = [
  'Pirates, matelots, flibustiers, et vous, là-bas, qui faites semblant de ne pas écouter !',
  'Ce soir, Port-Lanterne ne dort pas. Ce soir, mille voiles ont dansé sur la mer.',
  '{winners}',
  'Que la musique commence ! Et que personne ne rentre avant l’aube !',
];

// ------------------------------------------------------------ Mira Bellécume, l'organisatrice
export const MIRA = {
  welcome: [
    ['npc', 'Bienvenue, bienvenue ! Vous arrivez pour la Nuit des Mille Voiles, j’espère ? Parce que sinon, vous arrivez quand même.', { e: '♪' }],
    ['npc', 'Je suis Mira Bellécume. Ma grand-mère a lancé ce festival le jour où Port-Lanterne a survécu à sa première Marée Morte.'],
    ['npc', 'Six épreuves, un carnet, des jetons. Les jetons, Zéphyrine les échange contre des voiles, des tenues, des pavillons… de quoi briller.', { g: 'coin' }],
    ['npc', 'Et chaque nuit, un spectacle sur la plage. Personne n’est obligé de gagner. Tout le monde est obligé de s’amuser.'],
  ],
  offseason: (when) => `La Nuit des Mille Voiles revient ${when}. D’ici là, on répare les lampions, on recoud les voiles… et Zéphyrine garde vos jetons au chaud.`,
  complete: 'Six tampons ! Le carnet est complet. Ce soir, au spectacle, je dirai votre nom. Préparez votre plus belle révérence.',
};
export const FEST_NPC_LINES = {
  zephyrine: ['Des voiles, des pavillons, des tenues ! Tout se paie en jetons, rien ne se paie en doublons.', 'Un jeton gagné vaut deux jetons trouvés, disait ma mère. Elle ne savait pas compter.'],
  anselin: ['La course part dès qu’on est prêt. Pas de navire ? Je vous loue un cotre, il est compris dans la fête.', 'Le vent tourne : lisez-le, il vous parle.'],
  gaston: ['Trois canons, trois couloirs, quarante-cinq secondes. Visez devant les mouettes, elles ne vous attendront pas.', 'Une cible dorée ? Moi ? Jamais vue. Enfin… une fois.'],
  pimprenelle: ['Le parcours ? Des quais, des barques, un mât. Et une cloche au bout : sonnez-la, le chrono s’arrête.', 'Les tonneaux roulent, la bôme balaie. Regardez, puis courez.'],
  barnabe: ['Trois jeux, une soirée : les dés, les chopes, le bouchon. Celui qui gagne paie sa tournée. Celui qui perd aussi.', 'Approchez ! Approchez ! Ici, on perd tout, sauf sa bonne humeur.'],
  escarmouche: ['Dans la Lice, personne ne meurt. Mais l’orgueil, lui, peut y rester.', 'Défiez un champion, ou défiez un ami : le premier touché perd, et c’est tout.'],
};
export const FEST_CROWD_LINES = ['Vive la Nuit des Mille Voiles !', 'Tu as vu les voiles ?', 'Encore un tour de gigue !', 'Qui a gagné la course ?', 'Les lampions sont magnifiques, cette année.', 'Hé ! Ma chope est vide !', 'Mira a promis un bouquet final…', 'Yo-ho-ho !'];
