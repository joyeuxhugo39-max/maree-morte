// 1.0 : Acte III — « La Flamme et la Marée ». Qui a déclenché la Marée Morte ?
// La Flamme Bénite ne détruit pas les morts : elle les chasse vers la mer, depuis soixante ans. Le Cœur de Corail,
// au fond du Léviathan, tenait la mer fermée. Quand Barbe-Cendre l'a arraché, la mer a rendu ce qu'on lui avait donné.
// Et c'est Gaspard, le gardien du phare, qui lui avait vendu la route du Léviathan, pour sauver une Flamme mourante.
// Fin à choix : apaiser la Flamme, la porter, ou la retourner contre la mer.
import { Z } from '../world.js';

export const ACTE3 = {
  a3_flamme: {
    name: 'Acte III — La Flamme qui brûle trop fort', giver: 'gaspard', turnin: 'gaspard', level: 27, requires: ['comte'],
    goals: [
      { type: 'talk', npc: 'elouan', text: 'Demander au capitaine Elouan ce que dit la mer', scene: [
        ['npc', "Gaspard t'envoie ? Alors il l'a senti, lui aussi."],
        ['me', "Senti quoi ?"],
        ['npc', "La mer est pleine. Pleine à ras bord. Je pose la main sur l'eau, la nuit, et je sens des mains qui poussent de l'autre côté."],
        ['npc', "Le Kraken mort, la Couronne réglée… et pourtant les noyés reviennent. Quelque chose les pousse vers nous. Ou quelque chose les a poussés vers la mer, il y a longtemps."],
        ['npc', "Va voir l'épave du Léviathan, à la Crique. C'est là que tout a commencé. Tout commence toujours dans une épave."],
      ] },
      { type: 'explore', zone: Z.WRECK, text: 'Retourner à l’épave du Léviathan (Crique de l’Épave)' },
    ],
    rewards: { xp: 6000, gold: 800, items: [] },
    offer: "La Flamme brûle trop fort, petit. Depuis que la Couronne a quitté la mer, elle rugit comme une forge. Et plus elle brûle, plus la mer gronde. Va demander à Elouan ce que dit la mer, puis retourne à l'épave du Léviathan.",
    progress: 'Elouan est sur le quai de Havre-des-Brumes ; la Crique de l’Épave est au nord-ouest de Port-Lanterne.',
    done: "Le Léviathan… Oui. Il est temps que je te raconte d'où vient la Flamme.",
    scene: [
      ['npc', "Regarde-la, {nom}. Regarde la Flamme."],
      ['me', "Elle n'a jamais été aussi haute."],
      ['npc', "Trop haute. Une flamme qui brûle comme ça, c'est une flamme qui a peur. Et depuis qu'elle rugit, la mer gronde. Les deux se répondent."],
      { ask: [
        { q: 'Vous pensez qu’elles sont liées ?', a: [['npc', "Je le crains depuis trente ans. Je n'ai jamais osé le dire. Ni à Morgane, ni à personne."]] },
        { q: 'Qui pourrait savoir ?', a: [['npc', "Elouan. Il écoute la mer comme moi j'écoute le feu. Et l'épave du Léviathan : tout ce qui touche la Flamme finit par y mener."]] },
      ], go: 'J’irai voir' },
    ],
    sceneDone: [
      ['npc', "Tu as vu l'épave. Tu as senti la chaleur, sous l'eau froide ?"],
      ['me', "Le bois est encore tiède. Après tant d'années."],
      ['npc', "Le Léviathan a brûlé il y a soixante ans, devant le port. Le Père Anselme, le fondateur, a pris la dernière braise du navire en flammes, et il a allumé la Flamme Bénite avec."],
      ['npc', "La Flamme et l'épave sont nées du même feu. Je l'ai toujours su. Ce que je ne sais pas… c'est ce qu'Anselme a fait d'autre, ce jour-là. Il a écrit un journal. Les pages ont été perdues en mer."],
    ],
  },
  a3_pages: {
    name: 'Acte III — Le journal du Père Anselme', giver: 'gaspard', turnin: 'ermite', level: 27, requires: ['a3_flamme'],
    goals: [{ type: 'collect', item: 'page_anselme', n: 3, text: 'Pages du journal d’Anselme (les damnés les gardent, Île des Damnés)' }],
    rewards: { xp: 8000, gold: 1000, items: [] },
    offer: "La mer garde ce qu'elle prend… et elle le confie à ses pires gardiens. On dit que les damnés de l'Île des Damnés serrent contre eux des pages d'un vieux journal, sans savoir lire. Rapporte-en trois. Puis va voir le vieil Ermite : il était enfant de chœur d'Anselme, avant de devenir fou. Enfin, plus fou.",
    progress: 'Les damnés de l’Île des Damnés gardent les pages ; l’Ermite vit sur son îlot.',
    done: "Les pages du Père… Je reconnaîtrais son écriture entre mille.",
    scene: [
      ['npc', "Le journal d'Anselme. S'il existe encore, il est entre de mauvaises mains."],
      ['me', "Lesquelles ?"],
      ['npc', "Des mains mortes deux fois. Les damnés de l'Île des Damnés. Ils ramassent tout ce que la mer rejette, comme des pies."],
      ['npc', "Trois pages suffiront. Et apporte-les à l'Ermite : il a servi la messe d'Anselme, enfant. Il saura lire entre les lignes. Entre les taches de sel, surtout."],
    ],
    sceneDone: [
      ['npc', "Donnez. Donnez ! …Oui. Oui, c'est sa main. Il penchait les « l » comme des mâts dans la tempête."],
      ['npc', "« Le feu chasse les morts de la ville. Mais où vont-ils ? Je les ai vus marcher vers l'eau, des centaines, et la mer les a pris. »"],
      ['npc', "« Que Dieu me pardonne : pour sauver Port-Lanterne, j'ai fait de la mer un cimetière. Et j'ai scellé ce cimetière avec le Cœur du Léviathan. »"],
      ['me', "Le Cœur de Corail…"],
      ['npc', "Le Cœur tenait la mer fermée. Barbe-Cendre l'a arraché. Et la mer a rendu ses morts. Voilà votre Marée Morte, pirate. Mais qui a dit à Barbe-Cendre où dormait le Léviathan ? Ça, le journal ne le dit pas. Allez voir Céleste, à Libertalia : sa ballade est plus vieille qu'elle ne le croit."],
    ],
  },
  a3_ballade: {
    name: 'Acte III — Le premier couplet', giver: 'ermite', turnin: 'celeste', level: 28, requires: ['a3_pages'],
    goals: [{ type: 'talk', npc: 'celeste', text: 'Demander à Céleste le tout premier couplet de la ballade', scene: [
      ['npc', "Le premier couplet ? Personne ne me le demande jamais. Tout le monde veut le dernier, celui des héros."],
      ['me', "On m'a dit qu'il était plus vieux que la ballade."],
      ['npc', "C'est vrai. Ma grand-mère le chantait. Écoutez…"],
      ['npc', "« Le prêtre alluma le feu qui chasse les morts, et la mer les but jusqu'à plus soif ; puis vint le gardien qui garde la lumière, et qui vendit la route du cœur pour une flamme qui mourait. »"],
      ['me', "Le gardien qui garde la lumière…"],
      ['npc', "Un gardien de phare, oui. C'est ce que je me suis toujours dit. Je pensais que c'était une image. Pourquoi faites-vous cette tête ?"],
    ] }],
    rewards: { xp: 6000, gold: 600, items: [] },
    offer: "Céleste chante à Libertalia. Sa ballade… ce n'est pas qu'une chanson. Allez lui demander le premier couplet, celui que personne n'écoute.",
    progress: 'Céleste chante à Libertalia.',
    done: "Si le couplet dit vrai, le gardien de la lumière, c'est…",
    sceneDone: [
      ['npc', "Vous connaissez ce gardien, n'est-ce pas ? Je le vois dans vos yeux."],
      ['me', "Gaspard. Le gardien du phare de Port-Lanterne. Le gardien de la Flamme."],
      ['npc', "Alors allez lui parler. Et soyez juste. Les chansons ne disent jamais pourquoi les gens font ce qu'ils font. Seulement ce qu'ils ont fait."],
    ],
  },
  a3_aveu: {
    name: 'Acte III — L’aveu du gardien', giver: 'celeste', turnin: 'gaspard', level: 28, requires: ['a3_ballade'],
    goals: [{ type: 'talk', npc: 'gaspard', text: 'Demander la vérité à Gaspard, au phare', scene: [
      ['npc', "Tu as l'air grave, petit. Tu as trouvé le journal ?"],
      ['me', "Et la ballade de Céleste. « Le gardien qui garde la lumière vendit la route du cœur. »"],
      ['npc', "…"],
      ['npc', "Il y a trente ans, la Flamme mourait. Elle n'était plus qu'une braise. Les morts rôdaient déjà dans les ruelles. J'avais lu le journal d'Anselme, avant que la mer ne l'emporte. Je savais que le Cœur du Léviathan était né du même feu."],
      ['npc', "Un capitaine est venu me voir. Il avait des cendres dans la barbe et de l'or plein les poches. Il voulait la route du Léviathan. Je la lui ai donnée. Je croyais qu'il rapporterait le Cœur, et que le Cœur rallumerait la Flamme."],
      ['me', "Barbe-Cendre."],
      ['npc', "Il a gardé le Cœur. La mer s'est ouverte. Et la Flamme… la Flamme a repris, oui. Pour repousser une marée que j'avais moi-même lâchée. C'est moi, {nom}. C'est moi qui ai déclenché la Marée Morte."],
      { choose: [
        { q: 'Vous vouliez sauver la ville. Je vous pardonne.', mem: 'gaspard_pardon', a: [['npc', "Tu es bien la seule personne à pouvoir dire ça. Merci. Je ne le mérite pas, mais merci."]] },
        { q: 'Des centaines de morts, Gaspard. Des centaines.', mem: 'gaspard_colere', a: [['npc', "Je les compte chaque nuit. Chaque nuit depuis trente ans. Tu as raison. Je ne te demande rien."]] },
      ] },
    ] }],
    rewards: { xp: 4000, gold: 0, items: [] },
    offer: "Allez au phare. Demandez-lui la vérité. Et quoi que vous décidiez ensuite, décidez-le vous-même.",
    progress: 'Gaspard est au phare de Port-Lanterne.',
    done: "Il reste une chose à faire. Une seule. Et elle se fait à l'épave.",
    sceneDone: [
      ['npc', "L'âme d'Anselme n'a jamais quitté le Léviathan. Elle veille sur le feu qu'elle a allumé. Depuis que le Cœur est parti, elle hurle."],
      ['npc', "Tant qu'elle hurlera, la Flamme brûlera trop fort et la mer grondera. Il faut l'apaiser. Elle ne se laissera pas faire : elle croit encore protéger Port-Lanterne."],
      ['me', "Je vais à la Crique."],
      ['npc', "Prends des amis. Anselme brûlait les morts. Il brûlera les vivants aussi, s'il le faut."],
    ],
  },
  a3_ame: {
    name: 'Acte III — L’âme du Léviathan', giver: 'gaspard', turnin: 'gaspard', level: 28, requires: ['a3_aveu'],
    goals: [{ type: 'kill', mob: 'ame_anselme', n: 1, text: 'Apaiser l’Âme du Père Anselme, devant l’épave du Léviathan' }],
    rewards: { xp: 15000, gold: 2500, items: [] },
    offer: "L'Âme d'Anselme hante la Crique de l'Épave, devant ce qu'il reste du Léviathan. Approche-toi de l'épave : elle viendra à toi. Elle vient toujours à ceux qui portent l'odeur de la Flamme.",
    progress: 'Approchez-vous de l’épave du Léviathan, à la Crique de l’Épave : l’Âme vient à ceux qui la cherchent.',
    done: "Elle s'est tue. Pour la première fois depuis soixante ans, l'épave s'est tue.",
    scene: [
      ['npc', "Avant que tu partes… Si tu ne reviens pas, je n'aurai plus personne à qui raconter mes histoires."],
      ['me', "Je reviendrai."],
      ['npc', "Ils disent tous ça. Mais toi, tu reviens toujours. Va."],
    ],
    sceneDone: [
      ['npc', "Elle s'est tue. Tu l'entends ? La Flamme… elle tremble, maintenant. Elle attend."],
      ['npc', "Elle attend qu'on décide de ce qu'elle sera. Et ce n'est plus à moi de décider. Je ne mérite plus ce droit-là."],
      ['me', "Alors c'est à moi."],
      ['npc', "C'est à toi, Capitaine {nom}. Apaise-la, porte-la, ou retourne-la contre la mer. Aucun de ces chemins n'est sans prix."],
    ],
  },
  a3_fin_apaiser: {
    name: 'Fin — Apaiser la Flamme', giver: 'gaspard', turnin: 'gaspard', level: 28, requires: ['a3_ame'], excl: ['a3_fin_gardien', 'a3_fin_brasier'], ach: 'fin_apaiser',
    goals: [{ type: 'talk', npc: 'gaspard', text: 'Rallumer la Flamme avec la dernière braise d’Anselme, doucement' }],
    rewards: { xp: 20000, gold: 3000, items: [['lanterne_apaisee', 1]] },
    offer: "Rallumer la Flamme avec la dernière braise de l'âme d'Anselme. Elle ne chassera plus les morts vers la mer : ils reposeront là où ils tombent. La mer se videra, lentement. Des années, peut-être. Mais plus personne ne nourrira la marée.",
    progress: 'Parlez à Gaspard, au phare : il vous accompagnera jusqu’à la Flamme.',
    done: "Regarde-la. Elle est… douce. Je ne l'avais jamais vue comme ça.",
    sceneDone: [
      ['npc', "Pose la braise. Là, au cœur. Doucement."],
      ['npc', "…Regarde. Elle ne rugit plus. Elle respire. Les morts ne seront plus chassés : ils s'endormiront où ils tombent, et la mer rendra ses derniers, puis plus rien."],
      ['npc', "Prends cette lanterne. La première lumière de la nouvelle Flamme. Port-Lanterne ne saura jamais ce que tu as fait. Moi, je saurai."],
    ],
  },
  a3_fin_gardien: {
    name: 'Fin — Porter la Flamme', giver: 'gaspard', turnin: 'gaspard', level: 28, requires: ['a3_ame'], excl: ['a3_fin_apaiser', 'a3_fin_brasier'], ach: 'fin_gardien',
    goals: [{ type: 'talk', npc: 'gaspard', text: 'Prendre la garde de la Flamme, et son fardeau' }],
    rewards: { xp: 20000, gold: 3000, items: [['braise_gardien', 1]] },
    offer: "Garder la Flamme telle qu'elle est. La ville reste sûre ; la mer reste pleine, et quelqu'un doit veiller à ce qu'elle ne déborde plus jamais. Ce quelqu'un, ce serait toi. Je suis trop vieux, et je n'en suis plus digne.",
    progress: 'Parlez à Gaspard, au phare : il vous accompagnera jusqu’à la Flamme.',
    done: "Gardien de la Flamme. Ça te va bien. Mieux qu'à moi.",
    sceneDone: [
      ['npc', "Tends la main. Non, n'aie pas peur : elle ne brûle pas ceux qui la gardent."],
      ['npc', "Voilà. Tu sens ? Elle te connaît, maintenant. Chaque mort qu'elle chassera, tu le sentiras partir vers la mer. C'est le prix. C'est aussi ce qui t'empêchera d'oublier."],
      ['npc', "Prends cette braise. Elle ne s'éteindra jamais, tant que tu vivras. Port-Lanterne dormira tranquille. Et toi… un peu moins."],
    ],
  },
  a3_fin_brasier: {
    name: 'Fin — Retourner la Flamme contre la mer', giver: 'gaspard', turnin: 'gaspard', level: 28, requires: ['a3_ame'], excl: ['a3_fin_apaiser', 'a3_fin_gardien'], ach: 'fin_brasier',
    goals: [{ type: 'talk', npc: 'gaspard', text: 'Jeter la Flamme dans la mer, et brûler la Marée' }],
    rewards: { xp: 20000, gold: 3000, items: [['tison_marees', 1]] },
    offer: "Il existe une autre voie, que je n'ose pas nommer. Jeter la Flamme dans la mer. Le feu d'Anselme brûlerait les morts jusque dans les abysses. La Marée Morte finirait en une nuit. Mais la Flamme se consumerait avec eux, et Port-Lanterne… Port-Lanterne devrait apprendre à se défendre seule.",
    progress: 'Parlez à Gaspard, au phare : il vous accompagnera jusqu’à la Flamme.',
    done: "Une nuit. Il a fallu une nuit. La mer a brûlé jusqu'à l'aube.",
    sceneDone: [
      ['npc', "Tu l'as vue ? La mer en feu, d'un bout à l'autre de l'archipel. Les noyés qui brûlaient comme des chandelles, sous l'eau."],
      ['npc', "La Marée Morte est finie. La vraie. Mais regarde la place : il ne reste qu'une braise, là où brûlait la Flamme. Il faudra des années pour qu'elle reprenne."],
      ['npc', "Prends ce tison. C'est tout ce qu'il reste du feu d'Anselme. Les morts le craignent plus que n'importe quelle lame. Ils ont raison."],
    ],
  },
};

// 1.0 : le Bastion Englouti, donjon pour plusieurs pirates (Île de la Quarantaine) ; et les fonds marins
export const DONJONS = {
  plongee: {
    name: 'Les cloches d’Ys', giver: 'ysaline', turnin: 'elouan', level: 12, requires: ['traversee'],
    goals: [
      { type: 'act', act: 'plonge_leviathan', n: 1, text: 'Plonger sur l’épave du Léviathan (au large de la Crique de l’Épave)' },
      { type: 'act', act: 'plonge_grottes', n: 1, text: 'Plonger dans les Grottes des Abysses (au large des Brumes)' },
      { type: 'act', act: 'plonge_ys', n: 1, text: 'Plonger sur Ys-la-Noyée (au sud-est du Gouffre)' },
    ],
    rewards: { xp: 6000, gold: 900, items: [['scaphandre', 1]] },
    offer: "Elouan jure qu'il entend des cloches sonner sous la mer, au large du Gouffre. Une ville entière, engloutie. Moi, je vends des cloches de plongée : je ne vais pas le contredire. Achète-en une, mets ton navire au-dessus des bulles, et descends. Trois sites : l'épave du Léviathan, les grottes des Abysses, et… Ys.",
    progress: 'Une cloche de plongée (chez Ysaline), votre navire au-dessus des bulles, puis E. Surveillez votre air.',
    done: "Tu les as entendues ? Les cloches d'Ys ? …Alors je ne suis pas fou. Ou nous le sommes tous les deux.",
    scene: [
      ['npc', "Tu as déjà mis la tête sous l'eau, au large ? Pas pour te baigner. Pour regarder."],
      ['me', "Il n'y a que du noir, là-dessous."],
      ['npc', "Du noir, et des choses qui brillent. Des épaves, des coffres, des grottes où l'air reste piégé en bulles. Et une ville. Une ville entière, Ys, que la mer a prise il y a cinq cents ans."],
      { ask: [
        { q: 'Comment on respire ?', a: [['npc', "On ne respire pas. On retient son souffle, et on cherche les bulles : elles sortent des failles, et on y reprend de l'air. Mon casque de scaphandrier double ta réserve. Je te l'offrirai, si tu reviens."]] },
        { q: 'Et pour remonter ?', a: [['npc', "La corde de l'ancre. Tu la suis, et ton navire t'attend là-haut. S'il n'a pas coulé entre-temps."]] },
      ], go: 'Je plonge' },
    ],
    sceneDone: [
      ['npc', "Tu as l'air trempé jusqu'à l'âme. Alors ? Ys ?"],
      ['me', "Des rues, des colonnes, des statues… et un roi assis sur son trône, qui ne dort pas."],
      ['npc', "Gradlon. Le roi d'Ys. La légende dit qu'il a ouvert les portes de la mer lui-même. Je savais qu'il était encore là. Garde ce casque : tu en auras besoin, si tu retournes lui rendre visite."],
    ],
  },
  roi_ys: {
    name: 'Le roi qui dort sous la mer', giver: 'elouan', turnin: 'elouan', level: 25, requires: ['plongee'], ach: 'roi_ys',
    goals: [{ type: 'kill', mob: 'roi_ys', n: 1, text: 'Gradlon, roi d’Ys-la-Noyée' }],
    rewards: { xp: 18000, gold: 2600, items: [] },
    offer: "Gradlon garde Ys, et Ys garde les cloches. Tant qu'il siège, les cloches sonnent, et les marins qui les entendent se jettent à l'eau. Il faut qu'il se taise. Prends des amis, et beaucoup d'air.",
    progress: 'Ys-la-Noyée, au sud-est du Gouffre : la cloche de plongée, puis le trône au fond de la cité.',
    done: "Les cloches se sont tues. Pour la première fois depuis que je suis né, la nuit est silencieuse au-dessus du Gouffre.",
  },
  bastion: {
    name: 'Le Bastion Englouti', giver: 'kerbrat', turnin: 'kerbrat', level: 22, requires: ['freres_cote'], ach: 'bastion',
    goals: [{ type: 'kill', mob: 'amiral_englouti', n: 1, text: 'L’Amiral Englouti, au fond du Bastion (Île de la Quarantaine)' }],
    rewards: { xp: 16000, gold: 2500, items: [['tenue_corsaire', 1]] },
    offer: "Sur l'Île de la Quarantaine, une bouche de pierre s'ouvre sur un fort que la mer a avalé : le Bastion Englouti. Trois salles, deux grilles, et derrière, l'Amiral. Chaque grille a deux leviers, loin l'un de l'autre : il faut les tirer ensemble. Seul, tu n'iras pas loin. C'est fait exprès.",
    progress: 'L’entrée du Bastion est sur l’Île de la Quarantaine, au sud. Venez à plusieurs : deux leviers par grille.',
    done: "L'Amiral est tombé ? Alors le Bastion est à nous. À nous tous. Comme il se doit chez les Frères.",
    scene: [
      ['npc', "Tu te souviens du Fort des Deux Clés ? Deux dalles, deux pirates. Le Bastion, c'est la même idée… en pire."],
      ['me', "En pire comment ?"],
      ['npc', "La deuxième salle s'appelle l'Écluse. Dès que tu y mets un pied, elle se remplit. Si vous n'ouvrez pas la grille suivante à temps, le courant vous recrache dehors, et tout est à refaire."],
      { ask: [
        { q: 'Et l’Amiral ?', a: [['npc', "Un amiral de la Couronne, noyé avec son fort. Il fait jaillir la mer sous tes pieds et rappelle son équipage. Garde tes distances et ne reste jamais immobile."]] },
        { q: 'Combien faut-il être ?', a: [['npc', "Deux au moins, pour les leviers. Quatre ou cinq, si tu veux revenir avec toutes tes dents."]] },
      ], go: 'On y va' },
    ],
    sceneDone: [
      ['npc', "Alors ? L'Écluse ?"],
      ['me', "On a eu de l'eau jusqu'au menton."],
      ['npc', "Ha ! Le menton, c'est rien. Le dernier groupe en avait jusqu'au chapeau. Prends cette tenue de corsaire : tu l'as gagnée, toi et tes compagnons."],
    ],
  },
};
