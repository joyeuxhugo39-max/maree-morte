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
  offer: "Tu veux voir du pays ? Achète-moi une barque, ou fabrique la tienne à l'établi. Mets-la à l'eau depuis le quai (E, face à l'eau) et file plein est : Havre-des-Brumes. Ma cousine Ysaline y tient le chantier naval. Dis-lui que c'est Corentin qui t'envoie.",
  progress: "Havre-des-Brumes est à l'est, de l'autre côté du bras de mer. Le chantier naval, c'est le grand bâtiment au nord de la place : entre par la porte.",
  done: "Corentin t'envoie ? Et tu as traversé sans couler ? Bravo. Si un jour tu veux un vrai navire, reviens me voir.",
};
QUESTS.grotte = {
  name: 'Lumière sous la roche', giver: 'rosalie', turnin: 'rosalie', level: 5, requires: ['premier_pas'],
  goals: [{ type: 'explore', zone: Z.CAVE, text: 'Trouver une grotte secrète' }, { type: 'collect', item: 'eclat_cristal', n: 3, text: 'Éclats de cristal (pioche)' }],
  rewards: { xp: 380, gold: 110, items: [['elixir_flamme', 2]] },
  offer: "On raconte que des cristaux poussent au fond des grottes, et qu'ils brillent comme la Flamme Bénite. J'en voudrais trois, pour éclairer la salle sans risquer d'y mettre le feu. Il te faudra une pioche, et trouver une entrée : elles sont bien cachées.",
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
  goals: [{ type: 'collect', item: 'lingot_fer', n: 4, text: 'Lingots de fer' }, { type: 'collect', item: 'dent_zombie', n: 6, text: 'Dents de zombie' }],
  rewards: { xp: 300, gold: 60, items: [['rapiere', 1]] },
  offer: "J'ai le dessin d'une rapière de duelliste, mais pas le métal. Apporte-moi quatre lingots de fer (le minerai se fond à la forge) et six dents de zombie pour la trempe. Je te forgerai la lame la plus fine de l'archipel.",
  progress: 'Le minerai se trouve dans les rochers, à la pioche. Les boucaniers de la jungle ont de bonnes dents.',
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
  goals: [{ type: 'collect', item: 'planche', n: 12, text: 'Planches' }, { type: 'collect', item: 'toile', n: 4, text: 'Toile' }],
  rewards: { xp: 260, gold: 50, items: [['harpon', 1]] },
  offer: "Mon chantier manque de tout. Douze planches et quatre toiles, et je te donne le harpon de mon grand-père : avec ça, les noyés gardent leurs distances.",
  progress: "Les planches se scient à l'établi, la toile se tisse avec de la fibre.",
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
// Primes répétables du tableau de la place (toutes les 10 minutes)
const prime = (name, mob, n, level, xp, gold, text) => ({ name, giver: 'primes', turnin: 'primes', level, repeat: 600, goals: [{ type: 'kill', mob, n, text }], rewards: { xp, gold, items: [] },
  offer: `AVIS DE PRIME — ${text} : ${n}. Récompense : ${gold} doublons, payés par la Capitainerie de Port-Lanterne.`, progress: 'Revenez au tableau une fois la prime remplie.', done: 'La Capitainerie vous paie votre dû. Une nouvelle prime sera affichée dans 10 minutes.' });
QUESTS.prime_matelots = prime('Prime : matelots zombies', 'zsailor', 10, 2, 160, 60, 'Matelots zombies abattus');
QUESTS.prime_boucaniers = prime('Prime : boucaniers', 'buccaneer', 8, 4, 290, 110, 'Boucaniers zombies abattus');
QUESTS.prime_noyes = prime('Prime : noyés', 'drowned', 8, 6, 430, 160, 'Noyés renvoyés au fond');
QUESTS.prime_canonniers = prime('Prime : canonniers', 'skelgun', 8, 8, 540, 200, 'Squelettes canonniers abattus');
export const QUEST_ORDER = Object.keys(QUESTS);

// état d'une quête pour un joueur : 'locked' | 'available' | 'active' | 'ready' | 'done'
export function questState(qid, pq, level) {
  const q = QUESTS[qid];
  const st = pq[qid];
  if (st && st.s === 'done') { if (q.repeat && (!st.t || Date.now() - st.t > q.repeat * 1000)) return level < q.level - 1 ? 'locked' : 'available'; return 'done'; }
  if (st && st.s === 'active') return goalsMet(qid, st, null) ? 'ready' : 'active';
  for (const r of q.requires || []) if (!pq[r] || pq[r].s !== 'done') return 'locked';
  if (level < q.level - 1) return 'locked';
  return 'available';
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
