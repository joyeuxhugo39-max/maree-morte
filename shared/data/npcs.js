// Personnages non-joueurs de Port-Lanterne et de Havre-des-Brumes.
export const NPCS = {
  morgane: {
    name: 'Capitaine Morgane', title: 'Capitaine de La Mouette Écarlate',
    look: { skin: 0, hair: 2, hairStyle: 'long', top: 'manteau', topCol: 'red', pants: 'black', boots: 'black', hat: 'capitaine', hatCol: 'black' },
    greet: ["Garde l'œil ouvert et le sabre affûté, matelot.", 'La mer est calme... trop calme.', 'Port-Lanterne tient bon. Grâce à des gens comme toi.'],
    topics: [
      { q: "Qu'est-ce que la Marée Morte ?", a: "Chaque nuit, quand la lune se lève, les noyés remontent. Depuis que Barbe-Cendre a volé le Cœur de Corail, la mer ne garde plus ses morts. Et les morts ont faim." },
      { q: 'Qui êtes-vous ?', a: "Morgane la Rousse, capitaine de La Mouette Écarlate, le navire amarré au quai. Sans équipage, hélas. Les miens marchent sur la plage, maintenant." },
    ],
  },
  isa: {
    name: 'Isa Main-de-Fer', title: 'Forgeronne',
    look: { skin: 1, hair: 0, hairStyle: 'queue', top: 'gilet', topCol: 'brown', pants: 'brown', boots: 'brown', hat: 'bandana', hatCol: 'red' },
    greet: ["Le métal ne ment jamais. Les hommes, si.", "Approche, approche ! L'acier est encore chaud.", 'Un sabre émoussé, c’est un pirate mort.'],
    shop: ['poignard', 'coutelas', 'machette', 'sabre_abordage', 'pistolet_silex', 'pistolet_double', 'escopette', 'tromblon', 'carabine', 'mousquet', 'tricorne', 'bandana_noir', 'gilet_cuir', 'manteau_corsaire', 'bottes_pont', 'mariniere'],
    topics: [
      { q: 'Comment devenir plus fort ?', a: "Abats des morts, gagne de l'expérience et équipe-toi mieux. Le Tourbillon d'acier s'apprend au niveau 2, la Rasade de rhum au 3, les Bombes au 4 et le Cri d'abordage au 6." },
    ],
  },
  bartholome: {
    name: 'Bartholomé', title: 'Tavernier de La Sirène Borgne',
    look: { skin: 0, hair: 1, hairStyle: 'chauve', beard: 2, top: 'tablier', topCol: 'white', pants: 'brown', boots: 'brown' },
    greet: ['Bienvenue à La Sirène Borgne ! On y boit, on y chante, on y oublie.', "Un p'tit verre pour la route, matelot ?", "Le rhum guérit tout. Sauf la mort. Enfin... ça dépend."],
    shop: ['banane', 'noix_coco', 'poisson_grille', 'grog', 'rhum', 'canne_peche'],
    topics: [
      { q: 'Des rumeurs ?', a: "On raconte que des coffres au trésor dorment un peu partout sur l'île : sur la plage ouest, près des ruines, sur un îlot du marais... Les morts ne s'intéressent pas à l'or. Toi, si." },
      { q: 'Pourquoi « Sirène Borgne » ?', a: "Parce qu'elle a un œil de verre et qu'elle chante faux. Ma défunte femme. Paix à son âme. Et qu'elle y reste, surtout." },
    ],
  },
  gaspard: {
    name: 'Vieux Gaspard', title: 'Gardien du phare',
    look: { skin: 0, hair: 4, hairStyle: 'court', beard: 2, top: 'vareuse', topCol: 'navy', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'navy' },
    greet: ['Ah, la jeunesse... Toujours pressée de mourir.', 'Mon phare veille. Et moi aussi, à peu près.', 'Écoute le vent, petit. Il sent la mort ce soir.'],
    topics: [
      { q: 'Parlez-moi de la Flamme Bénite.', a: "Elle brûle sur la place depuis la fondation du port. Tant qu'elle brille, aucun mort n'ose entrer en ville. C'est pour ça que tu es en sécurité ici, et que tu y guéris plus vite." },
      { q: 'Et ce phare ?', a: 'Il guide les vivants. La nuit, regarde bien son faisceau : il balaie la mer et chasse les ombres.' },
    ],
  },
  leon: {
    name: 'Léon le mousse', title: 'Mousse débrouillard',
    look: { skin: 1, hair: 3, hairStyle: 'court', top: 'rayee', pants: 'navy', boots: 'brown', hat: 'paille' },
    greet: ["Salut ! T'es nouveau, toi. Moi c'est Léon. J'sais plein de trucs !", 'Tu veux un conseil ? Demande-moi !'],
    topics: [
      { q: 'Comment on se bat ?', a: "Clic gauche pour le sabre, clic droit pour tirer quand t'as un pistolet. Espace pour faire une roulade et esquiver ! Les touches 2 à 5 lancent tes compétences quand tu les as apprises." },
      { q: 'Et si je suis blessé ?', a: "Appuie sur F pour manger ce que t'as dans ton sac. En ville, près de la Flamme, tu récupères bien plus vite. Bartholomé vend de quoi manger." },
      { q: 'Où aller ?', a: "La plage au sud-ouest pour commencer : les crabes, c'est facile. Ouvre ta carte avec M, et ton journal de quêtes avec J. L'inventaire, c'est I." },
      { q: 'Et la nuit ?', a: "La nuit, les morts sont plus forts. Reste près des torches si t'as peur. Moi j'ai jamais peur. Presque." },
    ],
  },
  primes: {
    name: 'Tableau des primes', title: 'Capitainerie de Port-Lanterne', board: 1,
    greet: ['Des avis de prime sont cloués sur le bois. Certains sont encore humides.', 'AVIS : la Capitainerie paie comptant pour chaque mort renvoyé au repos.'],
    topics: [],
  },
  coco: {
    name: 'Coco', title: 'Perroquet de la taverne', parrot: 1,
    greet: ['Coco veut du rhum ! Crrrâ !', 'Doublons ! Doublons !', 'Les morts marchent ! Les morts marchent !', 'Barbe-Cendre ! Barbe-Cendre ! Crrr...', "Qui c'est le plus beau ? C'est Coco !", 'Lave le pont ! Lave le pont !'],
    topics: [],
  },
};
Object.assign(NPCS, {
  corentin: {
    name: 'Corentin', title: 'Passeur du port',
    look: { skin: 1, hair: 1, hairStyle: 'court', beard: 1, top: 'vareuse', topCol: 'teal', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'red' },
    greet: ['La mer, ça se mérite. Et ça se rame.', 'Une barque, matelot ? Elle ne coule presque plus.', "Le vent tourne à l'est. Bon signe pour Havre-des-Brumes."],
    shop: ['barque', 'canne_peche', 'corde', 'toile'],
    topics: [
      { q: 'Comment naviguer ?', a: "Achète-moi une barque, ou fabrique-la à l'établi. Sur un quai ou une plage, face à l'eau, appuie sur E pour la mettre à l'eau. Pour accoster, longe le rivage et appuie de nouveau sur E. À bord, pas de sabre : seulement le pistolet." },
      { q: 'Où aller ?', a: "Plein est, Havre-des-Brumes : un village de pêcheurs, à l'abri des morts. Au sud-est, l'Île au Crâne : n'y va pas sans un bon sabre. Et quelques îlots perdus, ici et là, que personne n'a fouillés depuis longtemps." },
      { q: 'Et les autres pirates ?', a: "Hors des villes, personne ne te protège : ni des morts, ni des vivants. Un pirate peut en attaquer un autre partout, sauf à Port-Lanterne, à Havre-des-Brumes et dans les maisons. Celui qui tombe perd une part de son or." },
    ],
  },
  rosalie: {
    name: 'Rosalie', title: 'Serveuse de La Sirène Borgne',
    look: { skin: 2, hair: 3, hairStyle: 'long', top: 'tablier', topCol: 'white', pants: 'brown', boots: 'brown', hat: 'bandana', hatCol: 'purple' },
    greet: ['Installe-toi, matelot. Les chaises ne mordent pas.', "Tu as l'air d'avoir vu un fantôme. Ici, on en voit tous les soirs.", 'Une histoire contre un verre ? Marché conclu.'],
    topics: [
      { q: 'Des histoires de grottes ?', a: "Les contrebandiers cachaient leur rhum sous la falaise, au nord de la jungle, derrière un rideau de lianes. Il y a aussi l'Antre du Crâne, sur l'île du même nom, et une grotte de cristal sous un îlot du sud. Il faut passer tout près pour voir les entrées." },
      { q: 'Et Bartholomé ?', a: "Il fait semblant de grogner, mais il a un cœur d'or. Et un tonneau de rhum à la place du foie." },
    ],
  },
  ysolde: {
    name: 'Ysolde', title: 'Aubergiste du Kraken Ivre',
    look: { skin: 0, hair: 4, hairStyle: 'queue', top: 'tablier', topCol: 'green', pants: 'black', boots: 'black' },
    greet: ['Bienvenue au Kraken Ivre ! Ici, même les morts payent leur tournée.', 'Tu viens de Port-Lanterne ? À la rame ? Respect.', 'Assieds-toi près du feu, la brume ne passe pas la porte.'],
    shop: ['poisson_grille', 'galette_coco', 'ragout_marin', 'grog', 'rhum', 'bandage'],
    topics: [
      { q: 'Havre-des-Brumes ?', a: "Un village de pêcheurs. La brume nous cache des morts, et les morts nous laissent tranquilles. La plupart du temps. Ici, pas de bagarre : on est en zone sûre, comme à Port-Lanterne." },
      { q: "L'Île au Crâne ?", a: "Au sud, un rocher en forme de crâne. Dans sa bouche, une grotte. Au fond de la grotte, le Roi des Os. Ceux qui y sont allés en sont revenus... rarement." },
    ],
  },
  ysaline: {
    name: 'Ysaline', title: 'Charpentière de marine',
    look: { skin: 1, hair: 0, hairStyle: 'queue', top: 'gilet', topCol: 'brown', pants: 'navy', boots: 'brown', hat: 'bandana', hatCol: 'teal' },
    greet: ["Une coque, c'est comme un cœur : il faut l'écouter.", 'Attention aux copeaux !', 'Le sloop là-bas ? Le plus rapide de l’archipel. Et il a du répondant.'],
    shop: ['barque', 'sloop', 'fusil_harpon', 'pistolet_double', 'planche', 'corde', 'toile'],
    topics: [
      { q: 'Barque ou sloop ?', a: "La barque, c'est pour se promener. Le sloop file bien plus vite et porte un canon : clic droit pour tirer, sur les morts comme sur les pirates trop curieux. Tu peux aussi les construire toi-même à l'établi, si tu as le bois et la toile." },
    ],
  },
});
Object.assign(NPCS, {
  anselme: {
    name: 'Maître Anselme', title: 'Notaire et ébéniste',
    look: { skin: 0, hair: 4, hairStyle: 'court', beard: 1, top: 'manteau', topCol: 'brown', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black' },
    greet: ['Une maison, un nom sur la porte, et un endroit où mourir au chaud. Que demander de plus ?', 'Les six maisons du quartier des Corsaires sont à vendre. Enfin, celles qui restent.'],
    shop: ['table_bois', 'chaise_bois', 'etagere_bois', 'armoire', 'plante_pot', 'tableau_mer', 'tapis_brode', 'bibliotheque', 'serrure_renforcee', 'coffre_base', 'lit'],
    topics: [
      { q: 'Comment acheter une maison ?', a: "Approchez-vous de la porte d'une maison à vendre et appuyez sur E : 800 doublons et elle est à vous, avec votre nom sur la plaque. Une seule par pirate. Dedans, tout est vide : meublez-la avec la touche B." },
      { q: 'Et les voleurs ?', a: "Il y en a. Une porte se crochette, avec des crochets et des doigts agiles. Une serrure renforcée et un chien de garde les découragent. Rangez vos trésors dans vos coffres : un voleur n'emporte qu'une poignée de choses." },
    ],
  },
  fouine: {
    name: 'La Fouine', title: 'Receleuse',
    look: { skin: 1, hair: 0, hairStyle: 'long', top: 'gilet', topCol: 'black', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'black' },
    greet: ['Tu ne m’as jamais vue. Moi non plus.', 'Des crochets ? Des bijoux à revendre ? Parle bas.'],
    shop: ['crochets', 'poudre_noire', 'carte_dechiree'],
    topics: [
      { q: 'Comment on crochète ?', a: "Devant la porte d'une maison qui n'est pas la tienne, E. Une goupille après l'autre : appuie sur E quand l'aiguille passe dans le vert. Rate et ton crochet casse. Réussis et tu as quarante secondes pour fouiller un coffre." },
      { q: 'Ça rapporte ?', a: "Une poignée d'objets du propriétaire... et parfois mieux : des montres, des bagues, des perles noires qu'on ne trouve nulle part ailleurs. Mais attention : tout le monde saura que tu es un voleur." },
    ],
  },
  lison: {
    name: 'Lison', title: 'Animalière',
    look: { skin: 2, hair: 2, hairStyle: 'queue', top: 'tablier', topCol: 'green', pants: 'brown', boots: 'brown', hat: 'paille' },
    greet: ['Mes petits cherchent une famille. Et une maison, de préférence.', 'Le singe ? Il mord. Mais seulement les gens qu’il aime.'],
    shop: ['chaton', 'chien', 'perroquet_vert', 'singe'],
    topics: [
      { q: 'Un animal de compagnie ?', a: "Installez-le chez vous avec la touche B : il vivra dans votre maison. Ou faites un clic droit dessus dans votre sac : il vous suivra partout. Le chien de garde rend votre porte plus difficile à crocheter." },
    ],
  },
  elouan: {
    name: 'Capitaine Elouan', title: 'Capitaine du Goéland',
    look: { skin: 1, hair: 1, hairStyle: 'long', beard: 1, top: 'capitaine', topCol: 'navy', pants: 'navy', boots: 'black', hat: 'tricorne', hatCol: 'navy' },
    greet: ['La mer chante, ces temps-ci. Une chanson que je n’aime pas.', 'Le Goéland est prêt. Moi, presque.'],
    shop: ['conque_abysses', 'sloop', 'tentacule_fumee'],
    topics: [
      { q: 'Le Kraken ?', a: "Il dort dans le Gouffre, entre Port-Lanterne et l'Île au Crâne. Le Cœur de Corail l'a réveillé. Il ne vient que si on l'appelle, avec la Conque des Abysses, à bord, dans le Gouffre. Venez à plusieurs, avec des canons." },
      { q: 'Comment le combattre ?', a: "Restez en mouvement. Quand l'eau rougit sous vous, virez de bord : une tentacule va frapper. Si une tentacule vous saisit, tirez-lui dessus. L'encre aveugle et ralentit ; le tourbillon vous aspire vers sa gueule. Et quand il plonge... priez." },
    ],
  },
});
