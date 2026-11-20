// Lot 5 : Le Plus Grand Braquage de Port-Lanterne. Une quête exceptionnelle, seul ou jusqu'à cinq, niveaux 18 à 21.
// On croit faire un cambriolage ; on découvre qu'on a été manipulé ; on rattrape celui qui nous a trahis ; on décide.
// La mécanique est dans server/heist.js ; les décors dans shared/heist-world.js ; les scènes dans shared/data/cinemas.js.
// Les étapes s'enchaînent toutes seules (auto) : seule la fin B se rend à un personnage, Octave Valdorne.
export const BR = { advance: 300, bribe: 300, bribeCaught: 600, stake: 40, crates: 4, crateBuy: 120, crateSell: 230, trustC: 2 };

export const BRAQUAGE = {
  br_preparatifs: {
    name: 'Le Plus Grand Braquage — Les préparatifs', giver: 'silas', turnin: 'silas', level: 18, hideOffer: 1,
    goals: [
      { type: 'act', act: 'br_uniformes', n: 1, text: 'Deux uniformes de la garde — l’entrepôt de la Douane, sur les quais' },
      { type: 'act', act: 'br_plan', n: 1, text: 'Le plan de la demeure — Corvin Lafleur, l’architecte, près du marché' },
      { type: 'act', act: 'br_cle', n: 1, text: 'La clé du coffre — Anatole Bréchet, le comptable, à la Sirène Borgne' },
    ],
    rewards: { xp: 2000, gold: 300, items: [] },
    offer: "Trois choses, dans l'ordre qui te plaira : deux uniformes de la garde, le plan de la demeure, la clé du coffre.",
    progress: 'Les uniformes sont à l’entrepôt de la Douane, sur les quais. Le plan, chez l’architecte Lafleur, près du marché. La clé, à la ceinture de Bréchet, le comptable, à la Sirène Borgne.',
    done: 'Tout y est. Laisse-moi te montrer le plan.',
  },
  br_casse: {
    name: 'Le Plus Grand Braquage — Le casse', giver: 'silas', turnin: 'silas', level: 19, requires: ['br_preparatifs'], hideOffer: 1, auto: 1,
    goals: [
      { type: 'act', act: 'br_entree', n: 1, text: 'Entrer dans la demeure de Valdorne, sur les hauts du quartier des Corsaires' },
      { type: 'act', act: 'br_archives', n: 1, text: 'Gagner la salle des archives (en uniforme, par une diversion ou par la force)' },
      { type: 'act', act: 'br_coffre', n: 1, text: 'Ouvrir le coffre central avec la clé du comptable' },
    ],
    rewards: { xp: 2000, gold: 0, items: [] },
    offer: 'Le soir de la vente, on entre par la grande porte.',
    progress: 'La demeure de Valdorne domine le quartier des Corsaires. Revêtez l’uniforme au vestiaire, ou trouvez une autre façon de passer la galerie.',
    done: '',
  },
  br_poursuite: {
    name: 'Le Plus Grand Braquage — La poursuite', giver: 'silas', turnin: 'silas', level: 19, requires: ['br_casse'], hideOffer: 1, auto: 1,
    goals: [
      { type: 'act', act: 'br_quais', n: 1, text: 'Rattraper Silas jusqu’aux quais — par les toits, par les ruelles, ou par la ville' },
      { type: 'act', act: 'br_abordage', n: 1, text: 'Monter à bord de La Mouche d’Or' },
    ],
    rewards: { xp: 1000, gold: 0, items: [] },
    offer: '', progress: 'Silas file vers La Mouche d’Or, à quai au bout de la grande jetée de Port-Lanterne.', done: '',
  },
  br_silas: {
    name: 'Le Plus Grand Braquage — La Mouche d’Or', giver: 'silas', turnin: 'silas', level: 19, requires: ['br_poursuite'], hideOffer: 1, auto: 1,
    goals: [{ type: 'kill', mob: 'silas_boss', n: 1, text: 'Vaincre Silas Virevent sur le pont de La Mouche d’Or' }],
    rewards: { xp: 3500, gold: 800, items: [] },
    offer: '', progress: 'Silas vous attend sur son pont. Les barils de poudre, les canons, la chaloupe : tout lui sert.', done: '',
  },
  br_fin_garder: {
    name: 'Le Plus Grand Braquage — Tout garder', giver: 'silas', turnin: 'silas', level: 19, requires: ['br_silas'], excl: ['br_fin_denoncer', 'br_fin_complice'], hideOffer: 1, auto: 1, ach: 'casse_siecle',
    goals: [{ type: 'act', act: 'br_fin', n: 1, text: 'Décider du sort de Silas : tout garder' }], rewards: { xp: 800, gold: 2500, items: [['carte_sept_courants', 1], ['liste_valdorne', 1]] },
    offer: '', progress: '', done: '',
  },
  br_fin_denoncer: {
    name: 'Le Plus Grand Braquage — Dénoncer Silas', giver: 'silas', turnin: 'valdorne', level: 19, requires: ['br_silas'], excl: ['br_fin_garder', 'br_fin_complice'], hideOffer: 1, auto: 1,
    goals: [{ type: 'talk', npc: 'valdorne', text: 'Remettre les documents à Octave Valdorne, dans sa demeure' }],
    rewards: { xp: 800, gold: 300, items: [['rapiere_valdorne', 1]] },
    offer: '', progress: 'Octave Valdorne est dans le grand salon de sa demeure.',
    done: "Ma liste. Et ma carte. Vous êtes un honnête homme, ou un excellent menteur. Dans les deux cas, je paie mes dettes.",
  },
  br_fin_complice: {
    name: 'Le Plus Grand Braquage — Complices', giver: 'silas', turnin: 'silas', level: 19, requires: ['br_silas'], excl: ['br_fin_garder', 'br_fin_denoncer'], hideOffer: 1, auto: 1, ach: 'complice_virevent',
    goals: [{ type: 'act', act: 'br_fin', n: 1, text: 'Décider du sort de Silas : faire équipe' }], rewards: { xp: 800, gold: 1500, items: [['carte_sept_courants', 1]] },
    offer: '', progress: '', done: '',
  },
};

// ------------------------------------------------------------ les conversations (le client les joue, le serveur décide)
// Corvin Lafleur, l'architecte
export const LAFLEUR = {
  ask: "Le plan de la demeure Valdorne ? Vous êtes fou. Il me ferait pendre. Ou pire : il ne me paierait plus.",
  bribe: (n) => `Bon… Pour ${n} doublons, j’oublie que vous êtes venu. Et j’oublie le plan sur la table.`,
  favor: "Un service contre un service. Ma cave est envahie de crabes, remontés par l'égout. Mes archives y moisissent. Débarrassez-m'en, et le plan est à vous.",
  favorProgress: (n) => `Il en reste ${n} en bas, je les entends cliqueter d’ici. La trappe est derrière le comptoir.`,
  favorDone: "Le silence ! Enfin ! Tenez : le plan. Et ne dites à personne qui l'a dessiné.",
  caught: "AU VOLEUR ! Dehors ! Et ne revenez pas sans une bourse bien pleine !",
  stolen: 'Mes plans de la demeure Valdorne… Je les avais posés là. J’ai dû les égarer.',
};
// Anatole Bréchet, le comptable
export const BRECHET = {
  game: "Une partie ? Deux dés chacun, trois manches, quarante doublons la manche. Celui qui en gagne deux empoche le tout.",
  broke: "Je… je suis à sec. Prenez ça en gage. Je la rachèterai demain. Ne la perdez pas, elle ouvre… peu importe ce qu'elle ouvre.",
  cheatCaught: 'Ces dés sont plombés ! Vous me prenez pour un bleu ? Fichez-moi la paix !',
  pocketCaught: 'Bas les pattes ! On ne fouille pas les poches d’un honnête comptable !',
  provoked: "Valdorne… me paie en clous ? Moi ? Vingt-deux ans de loyaux services ! Je… je sors prendre l'air. Gardez mon verre.",
  away: 'La chaise de Bréchet est vide. Son manteau pend au dossier.',
};
// le Capitaine Ferrant, invité de Valdorne : la diversion
export const FERRANT = {
  hint: 'Le notaire danse beaucoup avec votre femme, capitaine. Beaucoup.',
  brawl: 'QUOI ? NOTAIRE ! Sors de là que je te découpe en colonnes !',
};
// la trahison, dans la salle des archives
export const TRAHISON = [
  ['npc', "Ah. Tu as donc trouvé les documents. C'est embêtant.", { e: '…' }],
  ['npc', "Lis bien, {nom}. La flotte des Sept Courants, ses mouillages, et les noms de ceux qui commercent avec Port-Lanterne sans payer la Douane. Valdorne voulait vendre tout ça ce soir. Le mien est en bas de la liste."],
  ['npc', "La carte ? Un prétexte. Il me fallait quelqu'un pour ouvrir ce coffre, et quelqu'un pour en porter la faute.", { g: 'coin' }],
  ['npc', "Je vais vendre ces noms à ceux qui paieront le mieux — Valdorne le premier, qui me rachètera sa propre liste. Et toi, tu seras le voleur des archives."],
  ['npc', 'Ne le prends pas mal. Tu as été parfait.', { g: 'wave' }],
];
// après le combat, sur le pont : la décision
export const CONCLUSION = [
  ['npc', 'Bon. Tu as gagné. Je n’aime pas perdre, mais j’aime encore moins mourir.', { e: '…' }],
  ['me', "La liste. Et la carte."],
  ['npc', "Prends-les. Lis jusqu'au bout, pendant que tu y es : il y a d'autres noms que le mien. Des capitaines qui m'ont aidé pendant des années. Des amis."],
  ['npc', "Alors, {nom} ? Qu'est-ce que tu vas en faire ?"],
];
export const FIN_LINES = {
  garder: [
    ['npc', 'Tout ? Toi ? Ha ! Je t’ai vraiment mal jugé. Ou trop bien.', { e: 'rire' }],
    ['npc', "La carte se lit avec une clé qui n'existe que dans ma tête. Mais les noms… un receleur te les paiera rubis sur l'ongle. Adieu, {nom}. On se reverra. Peut-être."],
  ],
  denoncer: [
    ['npc', 'Valdorne ? Tu vas rendre ça à VALDORNE ?', { e: 'colere' }],
    ['npc', "Il te paiera. Il paie toujours. Et ceux de la liste sauront qui les a vendus. Ils ont la mémoire longue, sur les quais. Allez, appelle donc la garde."],
  ],
  complice: [
    ['npc', 'Toi… tu me proposes de faire équipe ? Après ça ?', { e: '!' }],
    ['npc', "Marché conclu. La moitié des bénéfices, et je t'apprends à lire la carte : il y a un passage, au large de l'ouest, où sept courants se croisent. Derrière, une île que personne ne connaît. Madame Corail y achète tout ce qui n'a pas de timbre.", { g: 'coin' }],
    ['npc', "Reviens me voir à la Sirène Borgne. J'aurai des caisses pour toi.", { e: '♪' }],
  ],
};
// les répliques de Silas, une fois la quête finie, selon ce qu'on a choisi
export const SILAS_AFTER = {
  complice: ['Associé ! Une caisse ou deux pour Madame Corail ?', 'Les Sept Courants sont calmes, ce soir. Bon vent, complice.', 'Valdorne cherche toujours son voleur. Il cherche au mauvais endroit.'],
};
