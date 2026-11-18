// Quêtes. Objectifs : kill {mob,n} | collect {item,n} | talk {npc} | explore {zone} | act {act,n} (0.8 : une action, ex. gagner aux dés)
// requires : quêtes à terminer avant ; level : niveau minimum conseillé.
import { Z } from '../world.js';
import { OLD_SCENES } from './scenes.js';
import { ACTE3, DONJONS } from './acte3.js';

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
    name: 'Marchandise discrète', giver: 'receleur', turnin: 'receleur', level: 12,
    goals: [{ type: 'collect', item: 'coffret_bijoux', n: 1, text: 'Un coffret à bijoux (cambriolage, ou sur un flibustier des collines)' }],
    rewards: { xp: 1500, gold: 2500, items: [['crochets', 3]] },
    offer: "Un client cherche un coffret à bijoux. N'importe lequel. Vous savez où on en trouve : chez les autres. Et si crocheter n'est pas votre fort, les flibustiers maudits des collines ont pillé plus d'une demeure avant de crever : ils traînent encore leur butin. Rapportez-m'en un, et je paie le double de ce qu'il vaut.",
    progress: 'Un coffret se trouve en cambriolant la maison d’un autre pirate, ou sur un flibustier maudit des Collines de la Rade.',
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
// ------------------------------------------------------------------ 0.8 : Libertalia
// scene / sceneDone : de vraies conversations (répliques alternées, questions au choix). Voir client/scene.js.
// ['npc', texte] : le PNJ à qui l'on parle ; ['me', texte] : votre pirate ; [idPNJ, texte] : un autre PNJ ; { ask: [{ q, a: [...] }], go } : questions libres.
Object.assign(QUESTS, {
  lib_portes: {
    name: 'Les portes de Libertalia', giver: 'garde_porte', turnin: 'reine', level: 14,
    goals: [{ type: 'talk', npc: 'reine', text: 'Se présenter à la Reine, au palais' }],
    rewards: { xp: 1500, gold: 200, items: [] },
    offer: "La Reine reçoit tous ceux qui débarquent. Son palais est au nord de la place de la Liberté : c'est le seul bâtiment qui a des colonnes.",
    progress: 'Le palais de la Reine est au nord de la place de la Liberté.',
    done: "Ainsi, c'est vous. Libertalia a besoin de gens comme vous.",
    scene: [
      ['npc', "Halte ! ... Ah, un vivant. Ça change. Bienvenue à Libertalia, la Cité Libre des Forbans."],
      ['me', "Une cité libre ? Je croyais que les pirates ne savaient pas bâtir de remparts."],
      ['npc', "Les pirates, non. Les pirates qui ont vu les morts sortir de la mangrove, si. On a appris vite."],
      { ask: [
        { q: 'Qui commande ici ?', a: [['npc', "Personne. Enfin, la Reine : Isaure Cœur-de-Sel. Le Conseil des Capitaines l'a élue. Ici, chaque forban a une voix. Même vous."]] },
        { q: 'Pourquoi tant de gardes ?', a: [['npc', "Parce que la nuit, ça gratte aux remparts. Des gardes morts sur les Hauts, des goules dans la jungle, des contrebandiers qui ne savent pas qu'ils sont morts... Et les vivants ne valent guère mieux."]] },
        { q: 'Les règles de la cité ?', a: [['npc', "Pas de duel dans l'enceinte. Pas de vol au marché. Et au Velours Écarlate, payez vos verres : Madame Rubis n'oublie jamais une dette."]] },
      ], go: 'Continuer' },
      ['npc', "La Reine voudra vous voir. On parle de vous jusqu'ici."],
      ['me', "En bien, j'espère."],
      ['npc', "On parle de vous. À Libertalia, c'est déjà beaucoup."],
    ],
    sceneDone: [
      ['npc', "Approchez. Non, plus près. Je ne mords pas. Pas les invités."],
      ['me', "Votre Majesté."],
      ['npc', "Pas de « Majesté ». Libertalia n'a pas de rois, elle a une reine élue. Appelez-moi Isaure. Ou Capitaine, si vous tenez aux titres."],
      ['npc', "Le Kraken, Barbe-Cendre, la Couronne des Marées... Les morts tremblent quand on prononce votre nom, {nom}. Enfin, ce qu'il leur reste pour trembler."],
      ['me', "Et vous, vous ne tremblez pas."],
      ['npc', "J'ai une cité entière à faire tenir debout pendant que la Marée Morte réveille tout ce qui dort sur cette île. Je n'ai pas le temps de trembler. Mais j'ai peut-être besoin de vous."],
    ],
  },
  lib_audience: {
    name: 'Le Conseil des Capitaines', giver: 'reine', turnin: 'reine', level: 14, requires: ['lib_portes'],
    goals: [
      { type: 'talk', npc: 'capitaine_brisemer', text: 'Gagner l’oreille du capitaine Brisemer', scene: [
        ['npc', "La Reine vous envoie ? Hmpf. Elle collectionne les héros comme d'autres les coquillages."],
        ['me', "Je ne suis pas un héros. Je suis un pirate qui a survécu."],
        ['npc', "...Bonne réponse. Les héros meurent. Les survivants, je peux m'en servir."],
        { ask: [
          { q: 'Que gardez-vous ?', a: [['npc', "La Baie, au nord-est. Trente ans que je la tiens. Et depuis la Marée Morte, des naufrageurs y allument de fausses lumières. Des vivants, eux. Ça me rend malade."]] },
          { q: 'Que pensez-vous de la Reine ?', a: [['npc', "Isaure ? Elle est honnête. C'est son seul défaut. Dans cette ville, l'honnêteté, c'est une cible peinte sur le dos."]] },
        ], go: 'Je reviendrai vous voir' },
      ] },
      { type: 'talk', npc: 'dame_corail', text: 'Gagner l’oreille de Dame Corail', scene: [
        ['npc', "Le fameux {nom}. Plus petit que dans les chansons."],
        ['me', "Les chansons exagèrent. Sauf pour le Kraken. Il était vraiment énorme."],
        ['npc', "Ha ! De l'esprit. C'est rare chez les gens d'épée. Asseyez-vous."],
        { ask: [
          { q: 'Quel est votre rôle ?', a: [['npc', "Je tiens les comptoirs : ce qui entre, ce qui sort, et la part du Conseil. Libertalia vit du commerce. Et un peu de la contrebande, ne soyons pas hypocrites."]] },
          { q: 'Et Fendlame ?', a: [['npc', "Fendlame veut de l'ordre. Des lois, des gardes, des pendaisons à heure fixe. Il trouve qu'une reine élue, c'est une reine fragile. Il n'a pas tout à fait tort. C'est bien ce qui m'inquiète."]] },
        ], go: 'Merci, Dame Corail' },
      ] },
      { type: 'talk', npc: 'capitaine_fendlame', text: 'Gagner l’oreille du capitaine Fendlame', scene: [
        ['npc', "Encore une recrue de la Reine. Elle en ramasse sur tous les quais."],
        ['me', "Vous n'avez pas l'air de l'aimer beaucoup."],
        ['npc', "J'aime l'ordre. Elle aime le vote. Le vote, c'est le désordre qui prend son temps."],
        { ask: [
          { q: 'Que commandez-vous ?', a: [['npc', "Le fort des Hauts, au nord-ouest. Les anciens gardes y montent encore la garde. Morts, mais disciplinés. Ce sont les meilleurs soldats que j'aie jamais eus."]] },
          { q: 'Et la crypte sous le fort ?', a: [['npc', "...Qui vous a parlé de la crypte ? Personne n'y descend. Personne. Il n'y a rien là-dessous que des os et de vieilles histoires."]] },
        ], go: 'Bonne journée, capitaine' },
      ] },
    ],
    rewards: { xp: 2500, gold: 300, items: [['rhum_vieux', 2]] },
    offer: "Le Conseil des Capitaines doit vous accepter. Parlez à Brisemer, à Dame Corail et à Fendlame : ils sont ici, dans la salle du Conseil.",
    progress: 'Les trois capitaines siègent dans la salle du Conseil, ici même, au palais.',
    done: "Trois capitaines, trois caractères. Et chacun aura une tâche pour vous.",
    scene: [
      ['npc', "Libertalia n'est pas à moi, {nom}. Elle est au Conseil : trois capitaines, et moi pour départager."],
      ['me', "Et vous voulez que je me présente à eux."],
      ['npc', "Je veux qu'ils vous voient. Brisemer garde la Baie, Dame Corail tient les comptoirs, Fendlame commande le fort des Hauts. Sans leur accord, je ne peux rien vous confier."],
      { ask: [
        { q: 'Pourquoi avez-vous besoin de moi ?', a: [['npc', "Parce que je n'ai plus confiance en personne. Quelqu'un, au Conseil, prépare quelque chose. Je le sens comme on sent l'orage. Vous, vous venez de l'extérieur. Vous ne devez rien à personne."]] },
        { q: 'Que se passe-t-il sur l’île ?', a: [['npc', "Les champs de canne se lèvent la nuit, les contrebandiers de la mangrove sont morts mais continuent leur commerce, les gardes du vieux fort tirent sur tout ce qui bouge. La Marée Morte a réveillé l'île entière."]] },
      ], go: 'J’irai les voir' },
    ],
    sceneDone: [
      ['npc', "Alors ? Que pensez-vous de mes capitaines ?"],
      ['me', "Brisemer grogne, Dame Corail compte, et Fendlame... cache quelque chose."],
      ['npc', "Vous avez l'œil. Fendlame cache toujours quelque chose : c'est sa manière d'exister. Mais aidez-les tous les trois. Gagnez leur confiance. Et ouvrez bien les oreilles."],
    ],
  },
  lib_baie: {
    name: 'Les fausses lumières', giver: 'capitaine_brisemer', turnin: 'capitaine_brisemer', level: 18, requires: ['lib_audience'],
    goals: [{ type: 'kill', mob: 'naufrageur', n: 10, text: 'Naufrageurs abattus' }, { type: 'collect', item: 'lanterne_naufrageur', n: 5, text: 'Lanternes de naufrageur' }],
    rewards: { xp: 6000, gold: 900, items: [['longue_vue', 1]] },
    offer: "Les naufrageurs de la Baie allument de fausses lumières sur les rochers. Abattez-en dix, et rapportez-moi cinq de leurs maudites lanternes.",
    progress: 'La Baie est au nord-est de l’île. Les naufrageurs rôdent près des épaves.',
    done: "Cinq lanternes. Je les accrocherai à mon mât, pour qu'ils voient ce qui arrive à ceux qui jouent avec la mer.",
    scene: [
      ['npc', "Vous voulez m'aider ? Alors écoutez. La nuit dernière, un navire marchand s'est fracassé sur les récifs de la Baie. Quarante hommes."],
      ['me', "Les morts ?"],
      ['npc', "Les vivants. Des naufrageurs. Ils allument des lanternes sur les rochers, les capitaines croient voir l'entrée du port, et crac. Ensuite ils pillent. Ils achèvent ceux qui nagent."],
      { ask: [
        { q: 'Qui les commande ?', a: [['npc', "Un certain Grand-Feu. Il porte une lanterne à la ceinture et il rit quand les coques se brisent. Un jour, il sera à moi."]] },
        { q: 'Pourquoi les lanternes ?', a: [['npc', "Sans lanternes, pas de fausses lumières. Et puis je veux les voir de mes yeux. Je veux savoir combien de navires elles ont coulés."]] },
      ], go: 'J’y vais' },
      ['npc', "Dix naufrageurs, cinq lanternes. Et ne nagez pas près des récifs."],
    ],
  },
  lib_grand_feu: {
    name: 'Grand-Feu doit s’éteindre', giver: 'capitaine_brisemer', turnin: 'capitaine_brisemer', level: 23, requires: ['lib_baie'],
    goals: [{ type: 'kill', mob: 'capitaine_naufrageur', n: 1, text: 'Grand-Feu, capitaine des naufrageurs, abattu' }],
    rewards: { xp: 9000, gold: 1500, items: [['chapeau_plume', 1]] },
    offer: "Grand-Feu, leur capitaine. Il hante la Baie, une lanterne à la main. Éteignez-le. Pour de bon.",
    progress: 'Grand-Feu rôde dans la Baie, au nord-est. C’est un élite : venez bien armé, ou à plusieurs.',
    done: "Il est mort ? Vraiment mort ? ...Trente ans que j'attendais ça. Prenez ce chapeau. Il était à mon second, le premier que Grand-Feu ait noyé.",
  },
  lib_mangrove: {
    name: 'La part du Conseil', giver: 'dame_corail', turnin: 'dame_corail', level: 17, requires: ['lib_audience'],
    goals: [{ type: 'kill', mob: 'contrebandier', n: 8, text: 'Contrebandiers maudits abattus' }, { type: 'collect', item: 'tonnelet_contrebande', n: 6, text: 'Tonnelets de contrebande' }],
    rewards: { xp: 5000, gold: 1000, items: [['tenue_contrebandier', 1]] },
    offer: "Les contrebandiers de la mangrove ne paient plus la part du Conseil. Récupérez six tonnelets, et faites comprendre à huit d'entre eux que la mort n'excuse pas les dettes.",
    progress: 'La mangrove est au sud-ouest de l’île, derrière la porte de l’Ouest. Leur camp est sur une butte, au milieu des palétuviers.',
    done: "Six tonnelets ! La part du Conseil, avec les intérêts. Vous seriez un excellent percepteur. Gardez cette tenue : elle a appartenu à un contrebandier qui n'en a plus l'usage.",
    scene: [
      ['npc', "Parlons affaires. Les contrebandiers de la mangrove ont toujours payé leur part : un tonnelet sur dix. C'est la loi du Conseil."],
      ['me', "Et ils ont arrêté de payer."],
      ['npc', "Ils ont arrêté de vivre. Mais ils continuent leur commerce ! Des morts qui vendent du rhum à des morts. Et la cité ne touche plus rien."],
      { ask: [
        { q: 'Vous n’avez pas peur des morts ?', a: [['npc', "J'ai peur des registres qui ne tombent pas juste. Les morts, c'est votre affaire. Les comptes, c'est la mienne."]] },
        { q: 'Que dois-je rapporter ?', a: [['npc', "Six tonnelets de leur rhum. Il est excellent, paraît-il : la mort fait vieillir le rhum plus vite. Et huit contrebandiers de moins, pour l'exemple."]] },
      ], go: 'Marché conclu' },
      ['npc', "Marché conclu. J'aime travailler avec vous, {nom}. Vous ne négociez pas."],
    ],
  },
  lib_reine_mangrove: {
    name: 'Celle qui boit la marée', giver: 'dame_corail', turnin: 'dame_corail', level: 22, requires: ['lib_mangrove'],
    goals: [{ type: 'kill', mob: 'reine_mangrove', n: 1, text: 'La Reine de la Mangrove abattue' }],
    rewards: { xp: 8500, gold: 1600, items: [['antidote', 5]] },
    offer: "Les contrebandiers avaient une protectrice : une noyée couronnée de racines. On l'appelle la Reine de la Mangrove. Une seule reine suffit à cette île.",
    progress: 'La Reine de la Mangrove règne au cœur des marais du sud-ouest. Élite : prudence.',
    done: "Une reine de moins. Ne le répétez pas à Isaure, elle pourrait mal le prendre. Prenez ces antidotes : vous en aurez besoin si vous retournez là-bas.",
  },
  lib_hauts: {
    name: 'La garde éternelle', giver: 'capitaine_fendlame', turnin: 'capitaine_fendlame', level: 20, requires: ['lib_audience'],
    goals: [{ type: 'kill', mob: 'garde_maudit', n: 10, text: 'Gardes maudits renvoyés au repos' }],
    rewards: { xp: 7000, gold: 900, items: [['tonique_fer', 3]] },
    offer: "Mes anciens gardes tiennent encore le fort des Hauts. Ils tirent sur mes patrouilles. Renvoyez-en dix au repos.",
    progress: 'Le fort des Hauts est au nord-ouest de la cité. Les gardes maudits tirent de loin : roulez sous leurs balles.',
    done: "Dix. Bien. Le fort est plus calme. Ne vous en approchez plus, maintenant : les Hauts sont sous ma responsabilité.",
    scene: [
      ['npc', "La Reine veut que je vous fasse confiance. Soit. Voyons si vous savez obéir."],
      ['me', "Je sais me battre. L'obéissance, c'est une autre histoire."],
      ['npc', "...Les gardes du fort des Hauts sont morts depuis quarante ans. Ils montent encore la garde. Ils tirent sur mes patrouilles."],
      { ask: [
        { q: 'Pourquoi sont-ils encore là ?', a: [['npc', "Parce qu'on leur a ordonné de garder le fort jusqu'au retour de leur roi. Des soldats loyaux. On n'en fait plus des comme ça."]] },
        { q: 'Leur roi ?', a: [['npc', "Malo le Rouge. Le Roi sans Couronne. Une vieille histoire. Une histoire morte et enterrée. Ne vous en mêlez pas."]] },
      ], go: 'Je m’en charge' },
      ['npc', "Dix gardes. Puis vous redescendez. Les Hauts, c'est mon affaire."],
    ],
  },
  lib_murmures: {
    name: 'Des murmures au Velours', giver: 'reine', turnin: 'reine', level: 22, requires: ['lib_baie', 'lib_mangrove', 'lib_hauts'],
    goals: [
      { type: 'talk', npc: 'madame_rubis', text: 'Interroger Madame Rubis', scene: [
        ['npc', "Isaure vous envoie ? Elle sait que je n'aime pas qu'on pose des questions chez moi."],
        ['me', "Elle dit aussi que rien de ce qui se murmure à Libertalia ne vous échappe."],
        ['npc', "...Elle sait parler aux femmes, notre reine. Bon. Un capitaine vient ici depuis un mois. Il ne boit pas, il ne danse pas, il ne regarde personne. Il parle tout seul, de couronne et de loyauté."],
        { ask: [
          { q: 'Quel capitaine ?', a: [['npc', "Je ne donne jamais de noms, mon cœur. Mauvais pour les affaires. Mais Perle l'a servi, elle. Et Céleste chantait ce soir-là."]] },
          { q: 'Pourquoi m’aider ?', a: [['npc', "Parce que je préfère une reine qui vient boire chez moi à un roi qui fermerait le Velours. Les tyrans n'aiment pas les maisons où l'on rit."]] },
        ], go: 'Je vais voir Perle et Céleste' },
      ] },
      { type: 'talk', npc: 'perle', text: 'Écouter ce que sait Perle', scene: [
        ['npc', "Madame vous envoie ? Alors asseyez-vous. Et ne me regardez pas comme ça, je ne fais que parler."],
        ['me', "Un capitaine vient ici. Il ne boit pas, il parle de couronne."],
        ['npc', "Fendlame. Il vient chaque nuit après la relève des Hauts. Il garde son manteau, il fixe la bougie, et il murmure : « Il me l'a promis. La cité à ses fidèles. »"],
        { ask: [
          { q: '« Il » ?', a: [['npc', "Je lui ai demandé. Il a souri, d'un sourire qui m'a glacé le sang, et il a dit : « Celui qui attend sous le fort. » Puis il a payé le double pour que j'oublie. Je n'ai rien oublié."]] },
          { q: 'Vous n’avez pas peur ?', a: [['npc', "Si. Mais j'ai encore plus peur d'une ville où les hommes comme lui font la loi. Ici, on choisit qui on écoute. Je voudrais que ça dure."]] },
        ], go: 'Merci, Perle' },
      ] },
      { type: 'talk', npc: 'celeste', text: 'Écouter la chanson de Céleste', scene: [
        ['npc', "Vous voulez la Ballade de Malo le Rouge ? Personne ne la demande jamais. Sauf un capitaine, depuis un mois. Toujours le dernier couplet."],
        ['me', "Que dit le dernier couplet ?"],
        ['npc', "♪ Ils ont fondu sa couronne en canons, ils l'ont couché sous les pierres du fort... Mais rendez-lui l'or de son front, et le Rouge reviendra plus fort. ♪"],
        { ask: [
          { q: 'Ce n’est qu’une chanson ?', a: [['npc', "Les chansons, c'est la mémoire de ceux qui ne savent pas lire. Si on dit qu'un roi revient quand on lui rend sa couronne, quelqu'un, un jour, essaiera."]] },
          { q: 'La couronne a été fondue ?', a: [['npc', "Les fondateurs l'ont fondue pour payer les canons des remparts. Toute la couronne ? Allez demander au Borgne. Il sait où finit l'or de cette île."]] },
        ], go: 'Je vais voir le Borgne' },
      ] },
      { type: 'talk', npc: 'le_borgne', text: 'Faire parler le Borgne', scene: [
        ['npc', "Je n'ai rien vu. Vous non plus. Qu'est-ce que vous voulez ?"],
        ['me', "La couronne de Malo le Rouge."],
        ['npc', "...Fermez la porte. Doucement. Oui, je l'avais. Pas toute : un cercle d'or tordu, refondu à moitié. Un souvenir que les fondateurs n'avaient pas osé détruire."],
        ['me', "Vous l'aviez ?"],
        ['npc', "Je l'ai vendue. Il y a deux semaines. À un capitaine au cache-œil, qui a payé trois fois le prix sans discuter. Ceux qui ne discutent pas, je m'en méfie. Mais leur or, je le prends."],
        { ask: [
          { q: 'Fendlame ?', a: [['npc', "Je ne donne pas de noms. Mais il n'y a pas trente capitaines borgnes au Conseil. Il n'y en a qu'un. Comme moi. C'est peut-être pour ça qu'il m'a fait confiance."]] },
          { q: 'Que va-t-il en faire ?', a: [['npc', "On ne paie pas une couronne de mort pour la porter soi-même. On la paie pour la rendre à son propriétaire. Faites-moi plaisir : allez vite voir la Reine."]] },
        ], go: 'Je cours au palais' },
      ] },
    ],
    rewards: { xp: 8000, gold: 1000, items: [] },
    offer: "Un traître siège au Conseil. Je le sens. Allez au Velours Écarlate : Madame Rubis entend tout ce qui se murmure à Libertalia. Et suivez chaque fil.",
    progress: 'Le Velours Écarlate est à l’ouest de la rue du marché. Interrogez Madame Rubis, Perle et Céleste, puis le Borgne, dans les Bas-Fonds.',
    done: "Fendlame. J'aurais dû le deviner. Il a toujours trouvé que le vote était une faiblesse.",
    scene: [
      ['npc', "Merci pour la Baie, la mangrove et le fort. Les trois capitaines vous respectent. Même Fendlame. Surtout Fendlame, peut-être."],
      ['me', "Vous dites ça comme une mauvaise nouvelle."],
      ['npc', "Hier, on a trouvé la porte de la crypte des Hauts ouverte. Quarante ans qu'elle était scellée. Et les gardes morts étaient alignés devant, au garde-à-vous. Comme pour accueillir quelqu'un."],
      { ask: [
        { q: 'Vous soupçonnez quelqu’un ?', a: [['npc', "Je soupçonne tout le monde, c'est mon métier. Mais je ne peux accuser personne sans preuve. Le Conseil me destituerait, et il aurait raison."]] },
        { q: 'Pourquoi le Velours ?', a: [['npc', "Parce que les hommes qui préparent un coup d'État ont besoin de parler à quelqu'un. Et ils ne parlent jamais à leur femme. Ils parlent au Velours."]] },
      ], go: 'Je pars enquêter' },
    ],
    sceneDone: [
      ['me', "Fendlame a acheté la couronne de Malo le Rouge au Borgne. Il descend chaque nuit dans la crypte. Il veut rendre sa couronne au Roi sans Couronne."],
      ['npc', "...Pour gouverner à travers lui. Un roi mort, un régent vivant. Libertalia à genoux devant un cadavre."],
      ['npc', "Fendlame a quitté le palais ce matin. Ses quartiers sont vides. On ne l'a vu ni au port, ni aux portes."],
      ['me', "Il est déjà dans la crypte."],
      ['npc', "Alors il est peut-être trop tard. Préparez-vous, {nom}. Je n'ai que vous."],
    ],
  },
  lib_crypte: {
    name: 'Le Roi sans Couronne', giver: 'reine', turnin: 'reine', level: 26, requires: ['lib_murmures'], ach: 'libertalia',
    goals: [{ type: 'kill', mob: 'roi_sans_couronne', n: 1, text: 'Le Roi sans Couronne renvoyé dans sa tombe' }, { type: 'collect', item: 'couronne_brisee', n: 1, text: 'Rapporter la couronne brisée' }],
    rewards: { xp: 30000, gold: 4000, items: [['sceau_reine', 1]] },
    offer: "Descendez dans la crypte, sous le fort des Hauts. Si Malo le Rouge s'est relevé, renvoyez-le dans sa tombe. Et rapportez-moi cette couronne.",
    progress: 'L’entrée de la Crypte du Roi sans Couronne est au pied du fort des Hauts, au nord-ouest. Boss très puissant : venez à plusieurs.',
    done: "C'est fini. Libertalia reste libre.",
    scene: [
      ['npc', "Les remparts tremblent depuis une heure. Les gardes des Hauts marchent en rang, au son d'un tambour que personne ne bat."],
      ['me', "Le roi est réveillé."],
      ['npc', "Le roi est réveillé. Et notre cité n'a jamais su se défendre contre un roi : on l'a fondée pour ne plus en avoir."],
      { ask: [
        { q: 'Et Fendlame ?', a: [['npc', "S'il est encore vivant, ramenez-le pour qu'il soit jugé par le Conseil. Ici, même les traîtres ont droit à un vote. C'est ce qui nous différencie d'eux."]] },
        { q: 'Que faire de la couronne ?', a: [['npc', "Rapportez-la-moi. Cette fois, nous ne la fondrons pas en canons. Nous la jetterons dans la fosse la plus profonde de l'océan."]] },
        { q: 'Pourquoi moi ?', a: [['npc', "Parce que vous êtes la seule lame de cette ville qui n'a rien à gagner à mettre un roi sur le trône. Et parce que vous avez déjà tué un Kraken. Un roi mort, à côté..."]] },
      ], go: 'J’y vais' },
      ['npc', "Bonne chance, {nom}. Libertalia se souviendra de votre nom. Faites qu'elle s'en souvienne vivant."],
    ],
    sceneDone: [
      ['me', "Le Roi sans Couronne est retourné à la poussière. Voici sa couronne."],
      ['npc', "...Si petite. Tout ce sang pour un cercle d'or tordu. Et Fendlame ?"],
      ['me', "Je l'ai trouvé dans la crypte, à genoux devant le trône. Le roi qu'il servait l'a tué le premier. Les tyrans ne partagent pas."],
      ['npc', "Pauvre fou. Il voulait de l'ordre. Il a eu le silence."],
      ['npc', "Le Conseil s'est réuni pendant votre absence. Pour la première fois en quarante ans, le vote a été unanime : vous êtes nommé Corsaire de la Reine. Prenez ce sceau. Partout dans l'archipel, il parle au nom de Libertalia."],
      ['me', "Je croyais que Libertalia n'avait pas de maîtres."],
      ['npc', "Elle n'en a pas. Elle a des amis. Et vous êtes le meilleur."],
    ],
  },
  // histoires de rue
  lib_cannaies: {
    name: 'Les champs maudits', giver: 'marchand_rhum', turnin: 'marchand_rhum', level: 14,
    goals: [{ type: 'kill', mob: 'epouvantail', n: 12, text: 'Épouvantails des cannaies abattus' }],
    rewards: { xp: 4000, gold: 700, items: [['rhum_vieux', 3]] },
    offer: "Les épouvantails des Cannaies se sont mis à marcher. Mes coupeurs de canne n'osent plus sortir. Abattez-en douze, et le meilleur rhum de l'île est à vous.",
    progress: 'Les Cannaies sont au nord de la cité, après les portes du Nord. Les épouvantails sortent surtout la nuit.',
    done: "Douze ! Mes coupeurs reprennent le travail dès demain. Tenez : du rhum vieux de dix ans. Il a connu des jours meilleurs. Vous aussi, on dirait.",
    scene: [
      ['npc', "Vous avez déjà vu un épouvantail marcher ? Moi oui. Trois fois cette semaine."],
      ['me', "Ils mordent ?"],
      ['npc', "Ils fauchent. Avec de vraies faux. Mes coupeurs de canne n'osent plus sortir, et sans canne, pas de rhum. Et sans rhum, Libertalia se révolte."],
      { ask: [{ q: 'D’où viennent-ils ?', a: [['npc', "On enterrait les esclaves morts au bout des champs, autrefois, avant que la cité les libère tous. La Marée Morte réveille les morts... et la paille aussi, faut croire."]] }], go: 'Je vais les faucher' },
    ],
  },
  lib_dette: {
    name: 'Les dés sont pipés', giver: 'joueur_lib', turnin: 'joueur_lib', level: 14,
    goals: [{ type: 'act', act: 'dice_win', n: 3, text: 'Parties de dés gagnées contre Fortuné' }],
    rewards: { xp: 2500, gold: 300, items: [['carte_tresor', 1]] },
    offer: "Fortuné triche, j'en suis sûr. Gagnez trois parties contre lui, prouvez que la chance peut tourner, et je vous donne mon dernier trésor.",
    progress: 'Fortuné tient la table de La Bourse aux Dés, sur la rue des tavernes. Parlez-lui pour jouer.',
    done: "Trois victoires ! Alors les dés ne sont pas pipés... C'est moi qui suis maudit. Prenez cette carte. Je l'ai gagnée il y a dix ans, la seule fois où j'ai gagné.",
    scene: [
      ['npc', "Vous avez une tête à avoir de la chance. Moi, j'avais une tête comme ça, avant."],
      ['me', "Qu'est-ce qui vous est arrivé ?"],
      ['npc', "Fortuné. La Bourse aux Dés. J'ai perdu mon navire, mon équipage, ma montre et le portrait de ma mère. Il triche. Je ne sais pas comment, mais il triche."],
      { ask: [
        { q: 'Et si je gagne ?', a: [['npc', "Gagnez trois parties. Si on peut gagner contre lui, alors ses dés sont honnêtes, et c'est moi qui suis maudit. Dans les deux cas, je saurai. Et je vous donnerai la dernière chose que je possède."]] },
        { q: 'Vous devriez arrêter de jouer.', a: [['npc', "Arrêter ? Mais la prochaine partie sera la bonne. Elle l'est toujours. ...Bon, d'accord, peut-être pas."]] },
      ], go: 'Je vais jouer' },
    ],
  },
  lib_fosse: {
    name: 'Les épreuves de la Fosse', giver: 'maitre_fosse', turnin: 'maitre_fosse', level: 22,
    goals: [{ type: 'kill', mob: 'goule_ecarlate', n: 8, text: 'Goules écarlates abattues' }, { type: 'kill', mob: 'coupe_jarret', n: 8, text: 'Coupe-jarrets abattus' }, { type: 'kill', mob: 'capitaine_naufrageur', n: 1, text: 'Grand-Feu abattu' }, { type: 'act', act: 'fosse_vague', n: 5, text: 'Cinq vagues tenues dans la Fosse, devant la foule' }],
    rewards: { xp: 14000, gold: 2200, items: [['lame_executrice', 1]] },
    offer: "Trois épreuves dehors pour devenir champion de la Fosse : huit goules de la jungle, huit coupe-jarrets des Bas-Fonds, et la tête de Grand-Feu. Et la dernière ici, devant la foule : cinq vagues.",
    progress: 'Goules dans la Jungle Écarlate (est), coupe-jarrets dans les Bas-Fonds la nuit, Grand-Feu dans la Baie (nord-est). Puis cinq vagues dans la Fosse : parlez au maître de la Fosse pour descendre.',
    done: "Champion ! CHAMPION ! La Fosse n'avait pas crié comme ça depuis des années. Prenez la lame de l'exécutrice : elle revient au meilleur.",
    scene: [
      ['npc', "Tu regardes la Fosse comme un gamin regarde la mer. Tu veux te battre ?"],
      ['me', "Je me bats tous les jours. Dehors, sans gradins."],
      ['npc', "Ha ! Alors prouve-le. Dans la Fosse, on ne devient pas champion en tapant sur des mannequins. On devient champion en ramenant des preuves."],
      { ask: [{ q: 'Quelles épreuves ?', a: [['npc', "Les goules écarlates de la jungle, les plus rapides de l'île. Les coupe-jarrets des Bas-Fonds, les plus vicieux. Et Grand-Feu, le plus fou. Trois preuves à ramener. Puis tu descends ici, et tu tiens cinq vagues devant la foule : un champion, ça se voit."]] }], go: 'J’accepte' },
    ],
  },
  lib_vieux_sou: {
    name: 'Les yeux du Vieux Sou', giver: 'mendiant', turnin: 'mendiant', level: 14,
    goals: [{ type: 'collect', item: 'longue_vue', n: 1, text: 'Apporter une longue-vue' }],
    rewards: { xp: 1500, gold: 500, items: [['fumigene', 5]] },
    offer: "Une longue-vue. Le capitaine du port en vend. Apportez-m'en une, et je vous dirai pourquoi un aveugle en a besoin.",
    progress: 'Le capitaine Esteban vend des longues-vues à la Capitainerie, sur le port.',
    done: "Merci, merci ! ...Avec ça, je vois les navires arriver depuis le toit de la Capitainerie. Prenez ces fumigènes. Quand on disparaît, il faut savoir le faire proprement.",
    scene: [
      ['npc', "Une pièce pour un pauvre aveugle ?"],
      ['me', "Vous regardez ma bourse depuis tout à l'heure."],
      ['npc', "...Bien vu. Bon. Je ne suis pas aveugle. Je suis les yeux de la Reine dans les rues. Personne ne se méfie d'un mendiant aveugle. Les gens parlent devant moi comme devant un mur."],
      { ask: [{ q: 'Et vous voulez une longue-vue ?', a: [['npc', "Mes yeux ne sont plus ce qu'ils étaient. Pour surveiller le port, il m'en faut une. Mais si j'en achète une, ma couverture est fichue. Achetez-la pour moi."]] }], go: 'D’accord' },
    ],
  },
  lib_ballade: {
    name: 'La ballade inachevée', giver: 'celeste', turnin: 'celeste', level: 22, requires: ['lib_murmures'],
    goals: [{ type: 'explore', zone: Z.ECARLATE, text: 'Trouver le temple de la Jungle Écarlate' }, { type: 'kill', mob: 'goule_ecarlate', n: 6, text: 'Goules écarlates abattues' }],
    rewards: { xp: 7000, gold: 700, items: [['collier_perles_noires', 1]] },
    offer: "Il paraît que le dernier vrai couplet de la ballade est gravé dans le temple de la Jungle Écarlate. Allez-y, chassez les goules, et revenez me le chanter. Faux, s'il le faut.",
    progress: 'La Jungle Écarlate est à l’est de la cité, par la porte de l’Est.',
    done: "« ...et la cité qui choisit ses chefs ne craindra plus ni roi ni mort. » Il est beau, ce couplet. Je le chanterai ce soir. Prenez ce collier : c'est le cadeau d'un capitaine qui m'aimait. Il est mort. Le collier, non.",
  },
});
const primeLib = (name, mob, n, level, xp, gold, text) => ({ name, giver: 'primes_lib', turnin: 'primes_lib', level, repeat: 600, goals: [{ type: 'kill', mob, n, text }], rewards: { xp, gold, items: [] },
  offer: `AVIS DU CONSEIL — ${text} : ${n}. Récompense : ${gold} doublons, payés comptant au palais.`, progress: 'Revenez au tableau une fois la prime remplie.', done: 'Le Conseil vous paie votre dû. Un nouvel avis sera cloué dans 10 minutes.' });
QUESTS.prime_lib_epouvantails = primeLib('Prime : épouvantails', 'epouvantail', 12, 14, 2600, 500, 'Épouvantails des cannaies abattus');
QUESTS.prime_lib_coupe = primeLib('Prime : coupe-jarrets', 'coupe_jarret', 10, 16, 3000, 600, 'Coupe-jarrets des Bas-Fonds abattus');
QUESTS.prime_lib_contrebande = primeLib('Prime : contrebandiers', 'contrebandier', 10, 17, 3300, 650, 'Contrebandiers maudits abattus');
QUESTS.prime_lib_naufrageurs = primeLib('Prime : naufrageurs', 'naufrageur', 10, 19, 3800, 750, 'Naufrageurs abattus');
QUESTS.prime_lib_gardes = primeLib('Prime : gardes maudits', 'garde_maudit', 10, 21, 4400, 850, 'Gardes maudits du fort abattus');
QUESTS.prime_lib_goules = primeLib('Prime : goules écarlates', 'goule_ecarlate', 10, 23, 5000, 950, 'Goules écarlates abattues');
Object.assign(QUESTS, ACTE3, DONJONS); // 1.0 : Acte III — La Flamme et la Marée ; le Bastion Englouti
export const QUEST_ORDER = Object.keys(QUESTS);

// état d'une quête pour un joueur : 'locked' | 'available' | 'active' | 'ready' | 'done'
export function questState(qid, pq, level) {
  const q = QUESTS[qid];
  const st = pq[qid];
  if (st && st.s === 'done') { if (q.repeat && (!st.t || Date.now() - st.t > q.repeat * 1000)) return level < q.level - 1 ? 'locked' : 'available'; return 'done'; }
  if (st && st.s === 'active') return goalsMet(qid, st, null) ? 'ready' : 'active';
  for (const r of q.requires || []) if (!pq[r] || pq[r].s !== 'done') return 'locked';
  if ([].concat(q.excl || []).some((e) => pq[e])) return 'locked'; // un autre choix a été fait
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
    const need = g.n || 1; // kill, collect, act : g.n ; talk, explore : 1
    return (st.p[i] || 0) >= need;
  });
}
// 1.0 : les anciennes quêtes ont, elles aussi, de vraies conversations (voir scenes.js)
for (const [k, v] of Object.entries(OLD_SCENES)) if (QUESTS[k]) { if (!QUESTS[k].scene && v.scene) QUESTS[k].scene = v.scene; if (!QUESTS[k].sceneDone && v.sceneDone) QUESTS[k].sceneDone = v.sceneDone; }
