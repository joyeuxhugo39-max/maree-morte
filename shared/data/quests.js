// Quêtes. Objectifs : kill {mob,n} | collect {item,n} | talk {npc} | explore {zone}
// requires : quêtes à terminer avant ; level : niveau minimum conseillé.
import { Z } from '../world.js';

export const QUESTS = {
  premier_pas: {
    name: 'Un nouveau départ', giver: 'morgane', turnin: 'isa', level: 1,
    goals: [{ type: 'talk', npc: 'isa', text: 'Parler à Isa à la forge' }],
    rewards: { xp: 40, gold: 10, items: [['pistolet_rouille', 1]] },
    offer: "Encore un naufragé... Bienvenue à Port-Lanterne, matelot. Tant que la Flamme Bénite brûle sur la place, les morts ne passent pas nos rues. Mais au-delà ? C'est leur royaume. Va voir Isa à la forge, elle te trouvera de quoi te défendre.",
    progress: 'La forge est au nord-est de la place. Suis le bruit du marteau.',
    done: "Morgane t'envoie ? Tiens, prends ce vieux pistolet. Il crache plus de fumée que de plomb, mais il te sauvera la peau. Clic droit pour tirer, et vise bien.",
  },
  pinces: {
    name: 'Pinces et puanteur', giver: 'isa', turnin: 'isa', level: 1, requires: ['premier_pas'],
    goals: [{ type: 'kill', mob: 'crab', n: 6, text: 'Crabes putrides écrasés' }],
    rewards: { xp: 70, gold: 25, items: [['bandana', 1]] },
    offer: "Les crabes de la plage se sont mis à pourrir sur pattes. Ils grignotent les filets et les orteils des pêcheurs. Va m'en écraser six, au sud-ouest de la ville.",
    progress: 'Six crabes, pas un de moins ! La plage commence après les torches, au sud-ouest.',
    done: "Ha ! Tu sens le crabe pourri, c'est bon signe. Tiens, un bandana. Ça cache l'odeur... un peu.",
  },
  matelots: {
    name: 'Les marins ne dorment plus', giver: 'morgane', turnin: 'morgane', level: 2, requires: ['pinces'],
    goals: [{ type: 'kill', mob: 'zsailor', n: 8, text: 'Matelots zombies libérés' }],
    rewards: { xp: 120, gold: 45, items: [['mariniere', 1]] },
    offer: "Mon ancien équipage... la Marée Morte l'a ramené. Ils errent sur la plage et dans la prairie. Libère-les, je t'en prie. Huit d'entre eux.",
    progress: 'Ils portent encore leurs marinières. Ça me brise le cœur à chaque fois.',
    done: "Merci. Qu'ils reposent enfin en paix. Prends cette marinière, elle appartenait à mon second.",
  },
  tonnelet: {
    name: 'Le tonnelet perdu', giver: 'bartholome', turnin: 'bartholome', level: 3, requires: ['premier_pas'],
    goals: [{ type: 'collect', item: 'tonnelet', n: 1, text: 'Tonnelet de rhum retrouvé' }],
    rewards: { xp: 150, gold: 40, items: [['rhum', 3]] },
    offer: "Un tonnelet de mon meilleur rhum a été volé par ces maudits boucaniers ! Ils l'ont traîné jusqu'aux Ruines du Temple, tout au nord de la jungle. Ramène-le-moi et je te paierai en nature, hé hé.",
    progress: 'Les ruines sont tout au nord, après la jungle. Prends garde aux goules, elles courent vite.',
    done: "Mon bébé ! Intact ! Tiens, trois bouteilles. Et ne bois pas tout d'un coup, hein.",
  },
  os_lanterne: {
    name: 'Des os pour la Flamme', giver: 'gaspard', turnin: 'gaspard', level: 3, requires: ['matelots'],
    goals: [{ type: 'collect', item: 'os_maudit', n: 10, text: 'Os maudits rapportés' }],
    rewards: { xp: 220, gold: 70, items: [['amulette_lanterne', 1]] },
    offer: "La Flamme Bénite faiblit, petit. Elle se nourrit des os maudits : les brûler purifie la malédiction. Apporte-m'en dix. Les morts en sont pleins, forcément.",
    progress: "Dix os maudits. Ils luisent d'un vert malsain, impossible de les confondre.",
    done: 'Regarde comme la Flamme reprend vigueur ! Garde cette amulette : une braise de la Flamme y brûle. Elle veillera sur toi.',
  },
  marais: {
    name: 'Le Marais des Noyés', giver: 'gaspard', turnin: 'gaspard', level: 6, requires: ['os_lanterne'],
    goals: [{ type: 'explore', zone: Z.SWAMP, text: 'Atteindre le Marais des Noyés' }, { type: 'kill', mob: 'drowned', n: 6, text: 'Noyés renvoyés au fond' }],
    rewards: { xp: 320, gold: 90, items: [['tricorne', 1]] },
    offer: "À l'ouest, au-delà de la rivière, s'étend le Marais des Noyés. Ceux que la mer a pris y remontent chaque nuit. Va voir ça de tes yeux, et renvoie six Noyés au fond de la vase.",
    progress: "Le marais est à l'ouest : passe le pont sur la rivière et suis le chemin.",
    done: "Tu es revenu ! Et entier, en plus. Ce tricorne était le mien, autrefois. Il te va mieux qu'à moi.",
  },
  canonniers: {
    name: "Les canonniers d'outre-tombe", giver: 'morgane', turnin: 'morgane', level: 7, requires: ['marais'],
    goals: [{ type: 'kill', mob: 'skelgun', n: 6, text: 'Squelettes canonniers abattus' }],
    rewards: { xp: 420, gold: 120, items: [['bottes_pont', 1]] },
    offer: "Des squelettes armés de mousquets gardent le marais et la Crique de l'Épave, au nord-ouest. C'est Barbe-Cendre qui les a postés là. Abats-en six, et garde la tête basse : ils visent bien, pour des morts.",
    progress: "Roule (Espace) quand leurs canons s'illuminent : leurs balles ne te toucheront pas.",
    done: "Le chemin de la crique est ouvert. Prends ces bottes : sur un pont glissant, elles valent de l'or.",
  },
  maree_morte: {
    name: 'La Marée Morte', giver: 'morgane', turnin: 'morgane', level: 8, requires: ['canonniers'],
    goals: [{ type: 'kill', mob: 'boss', n: 1, text: 'Capitaine Barbe-Cendre vaincu' }],
    rewards: { xp: 1500, gold: 500, items: [['sabre_abordage', 1]] },
    offer: "Il est temps. Le Capitaine Barbe-Cendre a trouvé le Cœur de Corail dans l'épave du Léviathan, et c'est lui qui appelle la Marée Morte. Rends-toi à la Crique de l'Épave et envoie-le par le fond. Pour de bon, cette fois.",
    progress: "Barbe-Cendre rôde près de son épave, au nord-ouest. N'y va pas seul si tu peux l'éviter.",
    done: "Tu l'as fait... La marée redescend déjà. Port-Lanterne te doit tout, Capitaine. Oui, Capitaine : ce titre, tu l'as mérité.",
  },
};
QUESTS.traversee = {
  name: 'La traversée', giver: 'corentin', turnin: 'ysaline', level: 3, requires: ['premier_pas'],
  goals: [{ type: 'explore', zone: Z.HAVRE, text: 'Rejoindre Havre-des-Brumes par la mer' }, { type: 'talk', npc: 'ysaline', text: 'Parler à Ysaline, au chantier naval' }],
  rewards: { xp: 220, gold: 60, items: [['rhum', 1]] },
  offer: "Tu veux voir du pays ? Achète-moi une barque. Mets-la à l'eau depuis le quai (E, face à l'eau) et file plein est : Havre-des-Brumes. Ma cousine Ysaline y tient le chantier naval. Dis-lui que c'est Corentin qui t'envoie.",
  progress: "Havre-des-Brumes est à l'est, de l'autre côté du bras de mer. Le chantier naval, c'est le grand bâtiment au nord de la place : entre par la porte.",
  done: "Corentin t'envoie ? Et tu as traversé sans couler ? Bravo. Si un jour tu veux un vrai navire, reviens me voir.",
};
QUESTS.grotte = {
  name: 'Lumière sous la roche', giver: 'rosalie', turnin: 'rosalie', level: 5, requires: ['premier_pas'],
  goals: [{ type: 'explore', zone: Z.CAVE, text: 'Trouver une grotte secrète' }, { type: 'collect', item: 'eclat_cristal', n: 3, text: 'Éclats de cristal (E sur les cristaux des grottes)' }],
  rewards: { xp: 380, gold: 110, items: [['elixir_flamme', 2]] },
  offer: "On raconte que des cristaux poussent au fond des grottes, et qu'ils brillent comme la Flamme Bénite. J'en voudrais trois, pour éclairer la salle sans risquer d'y mettre le feu. Il te suffira de les détacher de la roche, encore faut-il trouver une entrée : elles sont bien cachées.",
  progress: "Les grottes ne se voient que de tout près. Cherche au pied des falaises de la jungle, sur l'Île au Crâne ou sur les îlots du sud.",
  done: "Regarde-moi ça ! La salle n'a jamais été aussi belle. Tiens, deux élixirs : la maison offre.",
};
QUESTS.roi_os = {
  name: 'Le Roi des Os', giver: 'ysolde', turnin: 'ysolde', level: 10, requires: ['traversee'],
  goals: [{ type: 'kill', mob: 'roi_squelette', n: 1, text: 'Roi des Os renvoyé à la poussière' }],
  rewards: { xp: 1100, gold: 350, items: [['manteau_capitaine', 1]] },
  offer: "Au fond de l'Antre du Crâne règne le Roi des Os. Chaque nuit, ses canonniers tirent sur nos barques. Si tu as le cran, va lui arracher sa couronne. Prends des amis, et beaucoup de rhum.",
  progress: "L'Île au Crâne est au sud de Havre. L'entrée de l'antre est dans la bouche du crâne.",
  done: "Tu l'as fait ! Les barques pourront sortir la nuit. Ce manteau appartenait au dernier capitaine de Havre : il est à toi.",
};
QUESTS.acier_duel = {
  name: 'Acier de duelliste', giver: 'isa', turnin: 'isa', level: 5, requires: ['pinces'],
  goals: [{ type: 'collect', item: 'lame_rouillee', n: 4, text: 'Lames de boucanier (boucaniers zombies)' }, { type: 'collect', item: 'dent_zombie', n: 6, text: 'Dents de zombie' }],
  rewards: { xp: 300, gold: 60, items: [['rapiere', 1]] },
  offer: "J'ai le dessin d'une rapière de duelliste, mais pas le métal. Apporte-moi quatre vieilles lames de boucanier, je les refondrai, et six dents de zombie pour la trempe. Je te forgerai la lame la plus fine de l'archipel.",
  progress: 'Les boucaniers de la jungle ont de bonnes dents, et des lames rouillées à la ceinture.',
  done: "Regarde-moi ce fil ! Une rapière, ça ne tranche pas : ça transperce. Vise juste, et loin devant toi.",
};
QUESTS.duel_aube = {
  name: "Le duel de l'aube", giver: 'morgane', turnin: 'morgane', level: 6, requires: ['matelots'],
  goals: [{ type: 'kill', mob: 'buccaneer', n: 10, text: 'Boucaniers zombies défaits' }],
  rewards: { xp: 380, gold: 90, items: [['pistolet_duel', 1]] },
  offer: "Les boucaniers de la jungle ont pillé la cabine de mon père. Abats-en dix, et je te confierai ce qu'ils n'ont pas trouvé : son pistolet de duel. Il n'a jamais raté un duel.",
  progress: 'Les boucaniers rôdent dans la jungle de Brumesel, au nord.',
  done: "Tiens. Le pistolet de duel de mon père. Il a mis fin à plus de querelles que tous les juges de l'archipel.",
};
QUESTS.bois_marine = {
  name: 'Bois de marine', giver: 'ysaline', turnin: 'ysaline', level: 4, requires: ['traversee'],
  goals: [{ type: 'collect', item: 'planche_epave', n: 8, text: 'Planches d’épave (E près du bois flotté)' }, { type: 'collect', item: 'voile_dechiree', n: 4, text: 'Voiles déchirées (matelots zombies)' }],
  rewards: { xp: 260, gold: 50, items: [['harpon', 1]] },
  offer: "Mon chantier manque de tout. Huit planches d'épave, ramassées sur les plages, et quatre lambeaux de voile arrachés aux matelots zombies : et je te donne le harpon de mon grand-père : avec ça, les noyés gardent leurs distances.",
  progress: "La mer rejette de bonnes planches près du bois flotté, sur les plages. Les matelots zombies portent encore des bouts de voile.",
  done: "Parfait, c'est du bon bois. Voilà le harpon. Frappe de loin, et ne le perds pas dans un noyé.",
};
QUESTS.oeil_guetteur = {
  name: "L'œil du guetteur", giver: 'gaspard', turnin: 'gaspard', level: 9, requires: ['marais'],
  goals: [{ type: 'explore', zone: Z.CRANE, text: "Débarquer sur l'Île au Crâne" }, { type: 'kill', mob: 'skelgun', n: 8, text: 'Squelettes canonniers abattus' }],
  rewards: { xp: 700, gold: 150, items: [['fusil_long', 1]] },
  offer: "Du haut de mon phare, je vois les canonniers de l'Île au Crâne astiquer leurs mousquets. Va là-bas et fais-en taire huit. En échange, je te donnerai mon long fusil de guetteur : il porte plus loin que mes yeux.",
  progress: "L'Île au Crâne est au sud-est : il te faudra un bateau.",
  done: "Je les ai entendus se taire, un par un. Voilà mon long fusil. Prends le temps de viser : il ne pardonne pas l'impatience.",
};
// ----- La Chanson des Abysses (0.6) -----
QUESTS.disparus = {
  name: 'Disparus en mer', giver: 'ysaline', turnin: 'elouan', level: 9, requires: ['traversee'],
  goals: [{ type: 'talk', npc: 'elouan', text: 'Parler au capitaine Elouan, sur le quai de Havre' }],
  rewards: { xp: 300, gold: 60, items: [] },
  offer: "Trois navires ont disparu cette lune, tous près du Gouffre, entre Port-Lanterne et l'Île au Crâne. Pas d'épave, pas de survivant. Juste des chants, la nuit, qui montent de l'eau. Le capitaine Elouan dit savoir ce qui se passe. Va le voir sur le quai, il ne parle qu'aux gens qui ont du cran.",
  progress: 'Elouan attend au bout du quai de Havre-des-Brumes.',
  done: "Ysaline t'envoie ? Bien. Assieds-toi. Ce que je vais te dire, personne ne veut l'entendre : il y a quelque chose sous le Gouffre. Quelque chose d'énorme.",
};
QUESTS.encre_abysses = {
  name: "L'encre des profondeurs", giver: 'elouan', turnin: 'elouan', level: 10, requires: ['disparus'],
  goals: [{ type: 'collect', item: 'encre_noire', n: 5, text: 'Encre des abysses (noyés)' }],
  rewards: { xp: 520, gold: 120, items: [['conque_abysses', 1]] },
  offer: "Les noyés ont tous de l'encre dans les veines. L'encre de la bête. Rapporte-m'en cinq fioles et je te taillerai la Conque des Abysses : le seul appel auquel le Kraken répond. Les noyés hantent le marais, et le Capitaine Noyé en est plein.",
  progress: 'Les noyés du Marais des Noyés en portent souvent. Le Capitaine Noyé, toujours.',
  done: "Voilà ta conque. Souffle dedans à bord, au-dessus du Gouffre, et il viendra. Je t'accompagnerai avec le Goéland. Ne me remercie pas : remercie-moi si on en revient.",
};
QUESTS.kraken = {
  name: 'Le chant de la conque', giver: 'elouan', turnin: 'elouan', level: 11, requires: ['encre_abysses'],
  goals: [{ type: 'kill', mob: 'kraken', n: 1, text: 'Le Kraken renvoyé aux abysses' }],
  rewards: { xp: 2600, gold: 600, items: [['tentacule_fumee', 3]] },
  offer: "Le moment est venu. Prends le meilleur navire que tu trouves, des amis, du rhum et toute ta poudre. Mets le cap sur le Gouffre et souffle dans la conque. Le Goéland ouvrira la route. La Mouette Écarlate de Morgane nous couvrira de ses canons.",
  progress: "Le Gouffre est au sud-est de Port-Lanterne. À bord, utilisez la Conque des Abysses (clic droit dans le sac).",
  done: "Tu l'as fait... Le Goéland gît au fond, mais moi je suis vivant, et la mer se tait enfin. Va voir Morgane. Elle voudra entendre ça de ta bouche.",
};
QUESTS.dernier_chant = {
  name: 'Le dernier chant', giver: 'elouan', turnin: 'morgane', level: 11, requires: ['kraken'],
  goals: [{ type: 'talk', npc: 'morgane', text: 'Raconter la bataille à la Capitaine Morgane' }],
  rewards: { xp: 800, gold: 300, items: [['trophee_kraken', 1]] },
  offer: "Morgane a perdu son équipage à cause du Cœur de Corail. Va lui dire que le Kraken est mort. Ça ne les ramènera pas, mais ça l'aidera à dormir.",
  progress: 'Morgane se tient près des quais de Port-Lanterne.',
  done: "Le Kraken... Tu as tué le Kraken. Tiens, prends ce trophée : on en fera une légende, et ta maison en sera le musée. Bienvenue parmi les capitaines dont on chante le nom.",
};
// ----- 0.7 : la Couronne des Marées (une histoire de cape et d'épée), les Frères de la Côte, le Grand Large -----
Object.assign(QUESTS, {
  rumeur_rade: {
    name: 'Une rumeur à la Rade', giver: 'morgane', turnin: 'mama_lune', level: 12, requires: ['traversee'],
    goals: [{ type: 'talk', npc: 'mama_lune', text: 'Parler à Mama Lune, au Perroquet Pendu (Rade-aux-Flibustiers)' }],
    rewards: { xp: 600, gold: 80, items: [['billet_port', 1]] },
    offer: "Un nom revient sur tous les quais : la Couronne des Marées. Une couronne qui commande à la mer... et peut-être à la Marée Morte. On dit qu'un capitaine enfermé à Rade-aux-Flibustiers sait où elle est. La Rade est loin à l'est, au-delà de Havre. Prends ton navire, ou le bateau de Joseph le passeur, sur le quai. Demande Mama Lune.",
    progress: 'La Rade est à l’est de Havre-des-Brumes. Le passeur du quai vend des billets.',
    done: "Morgane t'envoie ? Elle a toujours eu bon goût pour les ennuis. Le capitaine dont tout le monde parle, c'est Ambroise Vif-Argent. Mon ancien capitaine. Il croupit à la Geôle.",
  },
  prisonnier: {
    name: 'Le prisonnier de la Geôle', giver: 'mama_lune', turnin: 'vif_argent', level: 12, requires: ['rumeur_rade'],
    goals: [{ type: 'talk', npc: 'vif_argent', text: 'Rendre visite au prisonnier de la Geôle' }],
    rewards: { xp: 500, gold: 40, items: [] },
    offer: "La Geôle, c'est la bâtisse de pierre, à l'est de la place. Va voir Ambroise. Il va te raconter une histoire incroyable, te promettre la moitié d'un trésor et te demander de le sortir de là. Les deux premières choses sont fausses. La troisième, fais-la quand même.",
    progress: 'La Geôle est le bâtiment de pierre à l’est de la place de la Rade.',
    done: "Tiens, un visiteur ! Ambroise Vif-Argent, capitaine. Oui, CE Vif-Argent. Vous avez entendu parler de moi, c'est évident. Écoutez bien : je sais où dort la Couronne des Marées. Mais pour vous le dire, il faudrait que je sois... de l'autre côté de ces barreaux.",
  },
  trousseau: {
    name: 'Six bouteilles pour une clé', giver: 'vif_argent', turnin: 'vif_argent', level: 12, requires: ['prisonnier'],
    goals: [{ type: 'collect', item: 'rhum', n: 6, text: 'Bouteilles de rhum' }, { type: 'talk', npc: 'geolier', text: 'Trinquer avec Grosbec le geôlier' }],
    rewards: { xp: 900, gold: 100, items: [] },
    offer: "Le geôlier, Grosbec, a deux passions : sa clé et le rhum. Il ne lâchera jamais la première... sauf noyé dans la seconde. Six bouteilles. Trinquez avec lui, et quand il ronflera, son trousseau sera à vous. Puis revenez me voir. Et ne buvez pas tout, hein.",
    progress: 'Six bouteilles de rhum (taverne, marchands), puis parlez à Grosbec.',
    done: "Il ronfle comme un canon de 24 ! La clé... parfaite. Bon. On ne va pas sortir par la porte, ce serait vulgaire.",
  },
  evasion: {
    name: 'L’évasion', giver: 'vif_argent', turnin: 'vif_quai', level: 13, requires: ['trousseau'],
    goals: [{ type: 'talk', npc: 'vif_quai', text: 'Retrouver Vif-Argent sur le quai de la Rade' }],
    rewards: { xp: 1200, gold: 150, items: [['tenue_mousse', 1]] },
    offer: "Le plan est simple : vous ouvrez, je file, on se retrouve sur le quai. S'ils demandent, vous ne m'avez jamais vu. Et s'ils insistent, dites-leur que j'étais beaucoup plus grand.",
    progress: 'Vif-Argent vous attend sur le quai, au sud de la Rade.',
    done: "Libre comme l'air ! Merci, l'ami. Bon, maintenant les affaires sérieuses : la carte de la Couronne a été déchirée en trois. Et chaque morceau est gardé par quelque chose de très, très désagréable.",
  },
  trois_fragments: {
    name: 'Les trois morceaux de la carte', giver: 'vif_quai', turnin: 'vif_quai', level: 16, requires: ['evasion'],
    goals: [{ type: 'kill', mob: 'bourreau', n: 1, text: 'Le Bourreau (Forêt des Pendus, au nord-est)' }, { type: 'kill', mob: 'reine_sirenes', n: 1, text: 'La Reine des Sirènes (Lagon, à l’est)' }, { type: 'kill', mob: 'general_os', n: 1, text: 'Le Général d’Os (Atoll des Ossements, au sud-ouest)' }],
    rewards: { xp: 7000, gold: 1300, items: [] },
    offer: "Premier morceau : le Bourreau, qui pend les vivants dans la Forêt des Pendus. Deuxième : la Reine des Sirènes, au milieu de son lagon. Troisième : le Général d'Os, au fond de sa crypte, sur l'Atoll des Ossements. Moi, je garde le quai. Quelqu'un doit bien le faire.",
    progress: 'Trois gardiens, trois morceaux de carte. Emmenez des amis, et beaucoup de rhum.',
    done: "Les trois morceaux ! Regardez-moi ça... la carte est complète. Magnifique. Attendez-moi ici, je vais chercher de quoi fêter ça. Je reviens tout de suite. Promis.",
  },
  trahison: {
    name: 'Trahison !', giver: 'mama_lune', turnin: 'agathe', level: 18, requires: ['trois_fragments'],
    goals: [{ type: 'explore', zone: Z.QUARANTAINE, text: 'Débarquer sur l’Île de la Quarantaine' }, { type: 'talk', npc: 'agathe', text: 'Trouver Sœur Agathe, au camp des survivants' }],
    rewards: { xp: 2500, gold: 200, items: [] },
    offer: "Il est parti. Avec la carte. Évidemment. Il a toujours fait ça, mon cœur : il prend ce qu'il aime et il file. Mais la carte passe par l'Île de la Quarantaine, au sud... et sur cette île, il y a quelqu'un que même Ambroise ne sait pas embobiner. Le Docteur Corbeau. Va voir Sœur Agathe, au camp des survivants.",
    progress: 'La Quarantaine est au sud, en pleine mer. Le camp est sur la falaise, à l’est des ruines.',
    done: "Un capitaine bavard, avec un chapeau à plume ? Oui, je l'ai vu. Le Docteur Corbeau l'a attrapé hier soir. Il est enfermé dans une cage, sur la place des ruines. Il chante pour garder le moral. Faux.",
  },
  docteur: {
    name: 'Le Docteur Corbeau', giver: 'agathe', turnin: 'agathe', level: 20, requires: ['trahison'],
    goals: [{ type: 'kill', mob: 'docteur_corbeau', n: 1, text: 'Le Docteur Corbeau, sur la place des ruines' }],
    rewards: { xp: 9000, gold: 1000, items: [['tenue_peste', 1]] },
    offer: "Le Docteur Corbeau a « soigné » toute la colonie. Il dit que la mort est un remède. Ses bombes de peste empoisonnent l'air, ses corbeaux crèvent les yeux, et ses patients se relèvent. Tuez-le, et libérez votre capitaine.",
    progress: 'Le Docteur rôde sur la place des ruines, au centre de l’île.',
    done: "C'est fini. La colonie peut enfin dormir. Votre capitaine est au camp, derrière moi. Il prétend qu'il s'est laissé capturer exprès. Je vous laisse juger. Prenez la tenue du Docteur : elle vous protégera de bien pire.",
  },
  galion: {
    name: 'Le Galion Fantôme', giver: 'vif_camp', turnin: 'vif_camp', level: 24, requires: ['docteur'],
    goals: [{ type: 'kill', mob: 'galion_fantome', n: 1, text: 'Couler le Galion Fantôme (Brumes Éternelles)' }],
    rewards: { xp: 14000, gold: 1600, items: [['brick', 1]] },
    offer: "Bon. Pour la carte, je peux tout expliquer : j'allais chercher du renfort. Non ? D'accord. Écoutez : la carte mène aux Brumes Éternelles, au sud-est. Le Comte Vespère y fait patrouiller son Galion Fantôme. Coulez-le, et la route de l'Île des Damnés sera ouverte. Il vous faut un navire armé. Et du courage. Moi, je fournis la carte.",
    progress: 'Les Brumes Éternelles sont au sud-est. Le Galion y tourne en rond, comme une âme en peine.',
    done: "Il a coulé ! Vous êtes plus fou que moi, et ce n'est pas rien. Tenez : un vrai navire, un brick de course. Je l'ai... emprunté. Pour vous. Maintenant, l'Île des Damnés.",
  },
  comte: {
    name: 'Le Comte des Marées', giver: 'vif_camp', turnin: 'vif_camp', level: 27, requires: ['galion'],
    goals: [{ type: 'kill', mob: 'comte_vespere', n: 1, text: 'Vespère, au fond de la Crypte du Comte (Île des Damnés)' }],
    rewards: { xp: 30000, gold: 3600, items: [] },
    offer: "Vespère dort dans sa crypte, sur l'Île des Damnés, la Couronne sur la tête. Tout ce qui vit là-bas est mort deux fois, et frappe comme un ouragan. N'y allez pas seul : c'est la seule chose sensée que je dirai aujourd'hui.",
    progress: 'L’Île des Damnés est tout au sud-est. La crypte s’ouvre au nord de l’île.',
    done: "La Couronne des Marées... vous l'avez. Vous l'avez vraiment. Bon. Maintenant, la question qui fâche : qu'est-ce qu'on en fait ? Morgane voudra la briser. Moi... j'ai quelques idées.",
    ach: 'damnes',
  },
  fin_morgane: {
    name: 'Rendre la mer à ses morts', giver: 'morgane', turnin: 'morgane', level: 27, requires: ['comte'], excl: 'fin_fanfaron',
    goals: [{ type: 'talk', npc: 'morgane', text: 'Remettre la Couronne à Morgane, qui la brisera' }],
    rewards: { xp: 12000, gold: 2000, items: [['medaillon_flamme', 1], ['habit_royal', 1], ['pistolet_couronne', 1]] },
    offer: "Donne-moi la Couronne. Je la briserai sur l'enclume d'Isa, et la mer gardera enfin ses morts. Plus de Marée Morte, un jour. Ce sera long, mais ce sera fini. Ambroise sera furieux. Il s'en remettra.",
    progress: 'Parlez encore à Morgane pour lui remettre la Couronne.',
    done: "C'est fait. Écoute... la mer est plus calme, déjà. Prends ce médaillon : une étincelle de la Flamme. Et cet habit, digne d'un capitaine du roi. Tu l'as mérité, et Port-Lanterne ne l'oubliera pas.",
    ach: 'gardien',
  },
  fin_fanfaron: {
    name: 'Un marché avec le Fanfaron', giver: 'vif_camp', turnin: 'vif_camp', level: 27, requires: ['comte'], excl: 'fin_morgane',
    goals: [{ type: 'talk', npc: 'vif_camp', text: 'Laisser la Couronne à Ambroise Vif-Argent' }],
    rewards: { xp: 12000, gold: 2500, items: [['sabre_fanfaron', 1], ['tenue_fanfaron', 1]] },
    offer: "Donnez-la-moi. Je ne dis pas que j'en ferai bon usage. Je dis que j'en ferai un usage... intéressant. Et je vous donne mon sabre et mon manteau. Si, si. Un capitaine paie ses dettes. Parfois.",
    progress: 'Parlez encore à Vif-Argent pour lui laisser la Couronne.',
    done: "Ha ! La mer m'obéit ! Enfin, elle m'écoute. Un peu. Tenez, mon sabre et mon manteau, comme promis. Si un jour vous voyez une marée monter à l'envers, ce sera moi. Bon vent, l'ami !",
    ach: 'complice',
  },
  // ----- la quête qui se fait à deux
  freres_cote: {
    name: 'Les Frères de la Côte', giver: 'kerbrat', turnin: 'kerbrat', level: 18,
    goals: [{ type: 'kill', mob: 'frere_fer', n: 1, text: 'Fer, l’aîné des Ferrailleurs' }, { type: 'kill', mob: 'frere_rouille', n: 1, text: 'Rouille, le cadet des Ferrailleurs' }],
    rewards: { xp: 4500, gold: 600, items: [['tenue_freres', 1], ['bague_freres', 1]] },
    offer: "Le Fort des Deux Clés, sur la colline à l'est de la Rade. Deux dalles devant la porte : il faut un pirate sur chacune, en même temps. À l'intérieur, Fer et Rouille, les Frères Ferrailleurs. Côte à côte, leurs armures se renvoient les coups : rien ne les blesse. Chacun de vous en attire un, loin de l'autre, et on frappe. Seul ? Impossible. C'est tout l'intérêt.",
    progress: 'Venez à deux. Deux dalles, deux frères, deux pirates.',
    done: "Vous l'avez fait. À deux, comme les anciens. Bienvenue chez les Frères de la Côte. Portez cette tenue et cette bague : partout dans l'archipel, on saura qu'on peut compter sur vous.",
    ach: 'freres',
  },
  // ----- le Grand Large
  chant_lagon: {
    name: 'Le chant du lagon', giver: 'maelys', turnin: 'maelys', level: 14,
    goals: [{ type: 'collect', item: 'ecaille_sirene', n: 6, text: 'Écailles de sirène (Lagon des Sirènes)' }],
    rewards: { xp: 1800, gold: 380, items: [] },
    offer: "Les sirènes du lagon chantent la nuit, et nos pêcheurs ne reviennent pas. Rapporte-moi six de leurs écailles : on en fera des amulettes qui bouchent les oreilles. Le lagon est à l'est, au-delà de la Rade.",
    progress: 'Le Lagon des Sirènes est un cercle d’îlots, à l’est.',
    done: "Six écailles. Elles chantent encore, tu entends ? Plus pour longtemps. Merci, pirate.",
  },
  reine_lagon: {
    name: 'La voix du lagon', giver: 'maelys', turnin: 'maelys', level: 16, requires: ['chant_lagon'],
    goals: [{ type: 'kill', mob: 'reine_sirenes', n: 1, text: 'La Reine des Sirènes' }],
    rewards: { xp: 3200, gold: 400, items: [['tenue_sirene', 1]] },
    offer: "Les écailles ne suffisent pas. Tant que leur Reine chante, elles reviendront. Elle se tient sur l'îlot au nord du lagon. Fais-la taire.",
    progress: 'La Reine des Sirènes chante sur l’îlot nord du lagon.',
    done: "Le lagon s'est tu. Prends cette parure : je l'ai cousue avec les écailles. Elle soigne les blessures... et elle te va bien.",
  },
  os_ermite: {
    name: 'Les os du vieil Ermite', giver: 'ermite', turnin: 'ermite', level: 17,
    goals: [{ type: 'collect', item: 'os_legionnaire', n: 8, text: 'Os de légionnaire (Atoll des Ossements)' }],
    rewards: { xp: 2600, gold: 320, items: [['tenue_sables', 1]] },
    offer: "Je construis une barrière d'os autour de mon îlot. Pourquoi ? Parce que les morts n'aiment pas marcher sur les morts. Enfin, je crois. Rapporte-m'en huit, de l'Atoll des Ossements, au sud-ouest.",
    progress: 'L’Atoll des Ossements est loin au sud-ouest. Ses légionnaires sont costauds.',
    done: "Huit ! Superbe. Tiens, ma vieille tenue des sables. Je ne la mets plus : il n'y a plus de sable ici, il n'y a que des crabes.",
  },
  remedes: {
    name: 'Des plumes pour les remèdes', giver: 'agathe', turnin: 'agathe', level: 19, requires: ['trahison'],
    goals: [{ type: 'collect', item: 'plume_corbeau', n: 6, text: 'Plumes de corbeau (médecins de peste)' }, { type: 'collect', item: 'herbes', n: 5, text: 'Herbes médicinales' }],
    rewards: { xp: 3000, gold: 350, items: [['grog', 4], ['rhum', 2]] },
    offer: "Les médecins de peste portent des masques bourrés d'herbes et de plumes. C'est ce qui les protège. Rapporte-m'en : je ferai des masques pour les derniers survivants.",
    progress: 'Les médecins de peste rôdent dans les ruines.',
    done: "Merci. Ces masques sauveront des vies. Prenez de quoi vous réchauffer, la nuit est longue ici.",
  },
  soie_pendus: {
    name: 'La soie des pendus', giver: 'madame_soie', turnin: 'madame_soie', level: 15,
    goals: [{ type: 'collect', item: 'soie_pendu', n: 8, text: 'Soie de pendu (Forêt des Pendus)' }],
    rewards: { xp: 2000, gold: 260, items: [['tenue_brumes', 1]] },
    offer: "La plus belle soie de l'archipel pend aux arbres de la Forêt des Pendus. Avec les pendus au bout, malheureusement. Rapportez-m'en huit coupons et je vous coudrai une tenue qui se fond dans la brume.",
    progress: 'La Forêt des Pendus est au nord-est, au-delà de la mer.',
    done: "Divine. Tenez : la tenue des Brumes. Personne ne vous verra venir. Sauf moi, qui l'ai cousue.",
  },
  forge_brasier: {
    name: 'Le cœur du volcan', giver: 'isa', turnin: 'isa', level: 23,
    goals: [{ type: 'collect', item: 'coeur_golem', n: 2, text: 'Cœurs de golem (Volcan de Cendrelune)' }, { type: 'collect', item: 'braise', n: 6, text: 'Braises éternelles' }],
    rewards: { xp: 7000, gold: 800, items: [['armure_conquistador', 1]] },
    offer: "On raconte que les golems de Cendrelune ont un cœur de lave qui bat encore. Avec ça, je peux tremper un acier que rien ne perce. Rapporte-m'en deux, et six braises éternelles. Je te forgerai une armure de conquistador.",
    progress: 'Le Volcan de Cendrelune est au sud-est. Les golems sont lents, mais ils frappent fort.',
    done: "Regarde-moi ce métal. Il chante sous le marteau. Voilà ton armure : un plastron et un morion comme on n'en fait plus.",
  },
  coeur_volcan: {
    name: 'Le Brasier', giver: 'isa', turnin: 'isa', level: 25, requires: ['forge_brasier'],
    goals: [{ type: 'kill', mob: 'brasier', n: 1, text: 'Le Brasier, au fond de sa forge' }],
    rewards: { xp: 11000, gold: 1900, items: [] },
    offer: "Les golems ne sont que des étincelles. Leur père, le Brasier, dort au fond du volcan, dans une forge que personne n'a bâtie. Éteins-le, et Cendrelune se taira enfin.",
    progress: 'La Forge du Brasier s’ouvre sur le flanc sud du volcan.',
    done: "Tu as éteint le Brasier ? Par ma barbe... je n'en ai pas, mais par celle de mon père : tu es une légende.",
  },
  marchandise: {
    name: 'Marchandise discrète', giver: 'receleur', turnin: 'receleur', level: 10,
    goals: [{ type: 'collect', item: 'coffret_bijoux', n: 1, text: 'Un coffret à bijoux (cambriolage)' }],
    rewards: { xp: 1500, gold: 2500, items: [['crochets', 3]] },
    offer: "Un client cherche un coffret à bijoux. N'importe lequel. Vous savez où on en trouve : chez les autres. Rapportez-m'en un, et je paie le double de ce qu'il vaut.",
    progress: 'On trouve des coffrets en cambriolant les maisons des autres pirates.',
    done: "Charmant. Je n'ai rien vu, vous n'avez rien vu, et voici votre or.",
  },
  naufrageur: {
    name: 'Naufrageur', giver: 'passeur_rade', turnin: 'passeur_rade', level: 13,
    goals: [{ type: 'kill', mob: 'brick_noye', n: 3, text: 'Bricks des Noyés coulés' }],
    rewards: { xp: 2400, gold: 500, items: [['tenue_corsaire', 1]] },
    offer: "Les Bricks des Noyés canonnent tout ce qui flotte, au nord et à l'ouest de l'archipel. Coulez-en trois. Un navire armé, de la poudre, et visez la ligne de flottaison.",
    progress: 'Les Bricks des Noyés patrouillent au nord et à l’ouest. Un sloop et son canon suffiront.',
    done: "Trois ! La mer respire. Tenez, une vraie tenue de corsaire. Vous la méritez.",
  },
  fregates: {
    name: 'Chasse aux frégates', giver: 'passeur_rade', turnin: 'passeur_rade', level: 20, requires: ['naufrageur'],
    goals: [{ type: 'kill', mob: 'fregate_maudite', n: 3, text: 'Frégates maudites coulées' }],
    rewards: { xp: 6000, gold: 1500, items: [['couleuvrine', 1]] },
    offer: "Les frégates maudites tiennent le sud. Elles tirent en bordée, trois boulets à la fois. Coulez-en trois et je vous offre une couleuvrine de ma collection.",
    progress: 'Les frégates maudites patrouillent les mers du sud.',
    done: "Vous êtes la terreur des mers, maintenant. Ou des morts, plutôt. Prenez la couleuvrine.",
  },
  chasse_damnee: {
    name: 'La chasse damnée', giver: 'kerbrat', turnin: 'kerbrat', level: 26, requires: ['freres_cote'],
    goals: [{ type: 'kill', mob: 'damne', n: 10, text: 'Damnés abattus' }, { type: 'kill', mob: 'molosse_damne', n: 5, text: 'Molosses damnés abattus' }],
    rewards: { xp: 16000, gold: 2800, items: [] },
    offer: "L'Île des Damnés. Les morts y sont morts deux fois, et ils frappent comme un mât qui tombe. Les Frères de la Côte y vont à plusieurs, jamais seuls. Ramène-moi la preuve de dix damnés et de cinq molosses.",
    progress: 'L’Île des Damnés est tout au sud-est. Zone extrême : venez à plusieurs.',
    done: "Tu en reviens vivant ? Alors tu es un vrai Frère. Prends cette essence : avec, la forge fait des miracles.",
  },
});
// Primes répétables du tableau de la place (toutes les 10 minutes)
const prime = (name, mob, n, level, xp, gold, text) => ({ name, giver: 'primes', turnin: 'primes', level, repeat: 600, goals: [{ type: 'kill', mob, n, text }], rewards: { xp, gold, items: [] },
  offer: `AVIS DE PRIME — ${text} : ${n}. Récompense : ${gold} doublons, payés par la Capitainerie de Port-Lanterne.`, progress: 'Revenez au tableau une fois la prime remplie.', done: 'La Capitainerie vous paie votre dû. Une nouvelle prime sera affichée dans 10 minutes.' });
QUESTS.prime_matelots = prime('Prime : matelots zombies', 'zsailor', 10, 2, 160, 60, 'Matelots zombies abattus');
QUESTS.prime_boucaniers = prime('Prime : boucaniers', 'buccaneer', 8, 4, 290, 110, 'Boucaniers zombies abattus');
QUESTS.prime_noyes = prime('Prime : noyés', 'drowned', 8, 6, 430, 160, 'Noyés renvoyés au fond');
QUESTS.prime_canonniers = prime('Prime : canonniers', 'skelgun', 8, 8, 540, 200, 'Squelettes canonniers abattus');
QUESTS.prime_flibustiers = prime('Prime : flibustiers maudits', 'flibustier', 10, 13, 1600, 400, 'Flibustiers maudits abattus');
QUESTS.prime_pestiferes = prime('Prime : pestiférés', 'pestifere', 12, 19, 3200, 700, 'Pestiférés renvoyés au repos');
QUESTS.prime_calcines = prime('Prime : calcinés', 'calcine', 10, 22, 4400, 900, 'Flibustiers calcinés éteints');
QUESTS.prime_damnes = prime('Prime : damnés', 'damne', 6, 27, 9000, 1800, 'Damnés abattus');
export const QUEST_ORDER = Object.keys(QUESTS);

// état d'une quête pour un joueur : 'locked' | 'available' | 'active' | 'ready' | 'done'
export function questState(qid, pq, level) {
  const q = QUESTS[qid];
  const st = pq[qid];
  if (st && st.s === 'done') { if (q.repeat && (!st.t || Date.now() - st.t > q.repeat * 1000)) return level < q.level - 1 ? 'locked' : 'available'; return 'done'; }
  if (st && st.s === 'active') return goalsMet(qid, st, null) ? 'ready' : 'active';
  for (const r of q.requires || []) if (!pq[r] || pq[r].s !== 'done') return 'locked';
  if (q.excl && pq[q.excl]) return 'locked'; // l'autre choix a été fait
  if (level < q.level - 1) return 'locked';
  return 'available';
}
// un PNJ peut n'apparaître qu'à certaines étapes d'une histoire
export function npcVisible(def, pq, level) {
  const v = def && def.vis;
  if (!v) return true;
  const ok = (c) => c.s.includes(questState(c.q, pq || {}, level || 1));
  return ok(v) && !(v.not && ok(v.not));
}
// st.p[i] = progression de l'objectif i (pour collect, on compte l'inventaire si fourni)
export function goalsMet(qid, st, countItem) {
  const q = QUESTS[qid];
  return q.goals.every((g, i) => {
    if (g.type === 'collect' && countItem) return countItem(g.item) >= g.n;
    const need = g.type === 'kill' || g.type === 'collect' ? g.n : 1;
    return (st.p[i] || 0) >= need;
  });
}
