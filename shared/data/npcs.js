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
    shop: ['gourdin', 'poignard', 'coutelas', 'lance_silex', 'machette', 'sabre_abordage', 'harpon', 'masse', 'hache_guerre', 'pistolet_rouille', 'pistolet_silex', 'pistolet_double', 'escopette', 'tromblon', 'carabine', 'mousquet', 'crache_feu',
      'bandana', 'chapeau_feuilles', 'chapeau_paille', 'bandana_noir', 'tricorne', 'casque_os', 'mariniere', 'gilet_cuir', 'armure_coquillages', 'carapace_crabe', 'manteau_corsaire', 'bottes_usees', 'bottes_pont',
      'collier_coquillages', 'talisman_os', 'collier_requin'],
    topics: [
      { q: 'Comment devenir plus fort ?', a: "Abats des morts, gagne de l'expérience et équipe-toi mieux : tout s'achète, chez moi ou ailleurs. Et apprends à rouler sous les coups (Espace)." },
    ],
  },
  bartholome: {
    name: 'Bartholomé', title: 'Tavernier de La Sirène Borgne',
    look: { skin: 0, hair: 1, hairStyle: 'chauve', beard: 2, top: 'tablier', topCol: 'white', pants: 'brown', boots: 'brown' },
    greet: ['Bienvenue à La Sirène Borgne ! On y boit, on y chante, on y oublie.', "Un p'tit verre pour la route, matelot ?", "Le rhum guérit tout. Sauf la mort. Enfin... ça dépend."],
    shop: ['banane', 'noix_coco', 'baies', 'poisson_grille', 'brochette_crabe', 'galette_coco', 'tarte_baies', 'grog', 'rhum', 'canne_peche'],
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
    shop: ['barque', 'canne_peche', 'bandage'],
    topics: [
      { q: 'Comment naviguer ?', a: "Achète-moi une barque. Sur un quai ou une plage, face à l'eau, appuie sur E pour la mettre à l'eau. Pour accoster, longe le rivage et appuie de nouveau sur E. À bord, pas de sabre : seulement le pistolet." },
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
    shop: ['poisson_grille', 'galette_coco', 'ragout_marin', 'soupe_champignons', 'grog', 'rhum', 'bandage', 'elixir_flamme'],
    topics: [
      { q: 'Havre-des-Brumes ?', a: "Un village de pêcheurs. La brume nous cache des morts, et les morts nous laissent tranquilles. La plupart du temps. Ici, pas de bagarre : on est en zone sûre, comme à Port-Lanterne." },
      { q: "L'Île au Crâne ?", a: "Au sud, un rocher en forme de crâne. Dans sa bouche, une grotte. Au fond de la grotte, le Roi des Os. Ceux qui y sont allés en sont revenus... rarement." },
    ],
  },
  ysaline: {
    name: 'Ysaline', title: 'Charpentière de marine',
    look: { skin: 1, hair: 0, hairStyle: 'queue', top: 'gilet', topCol: 'brown', pants: 'navy', boots: 'brown', hat: 'bandana', hatCol: 'teal' },
    greet: ["Une coque, c'est comme un cœur : il faut l'écouter.", 'Attention aux copeaux !', 'Le sloop là-bas ? Le plus rapide de l’archipel. Et il a du répondant.'],
    shop: ['barque', 'sloop', 'fusil_harpon', 'pistolet_double', 'harpon', 'cimeterre', 'rapiere', 'dague_cristal', 'flamberge', 'poivriere', 'pistolet_duel', 'pistolet_cristal', 'amulette_lanterne', 'pendentif_cristal'],
    topics: [
      { q: 'Barque ou sloop ?', a: "La barque, c'est pour se promener. Le sloop file bien plus vite et porte un canon : clic droit pour tirer, sur les morts comme sur les pirates trop curieux." },
    ],
  },
});
Object.assign(NPCS, {
  anselme: {
    name: 'Maître Anselme', title: 'Notaire et ébéniste',
    look: { skin: 0, hair: 4, hairStyle: 'court', beard: 1, top: 'manteau', topCol: 'brown', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black' },
    greet: ['Une maison, un nom sur la porte, et un endroit où mourir au chaud. Que demander de plus ?', 'Les six maisons du quartier des Corsaires sont à vendre. Enfin, celles qui restent.'],
    shop: ['table_bois', 'chaise_bois', 'etagere_bois', 'armoire', 'cheminee_pierre', 'plante_pot', 'tableau_mer', 'tapis_brode', 'bibliotheque', 'serrure_renforcee', 'coffre_base', 'lit', 'tapis', 'sol_planches', 'torche_base', 'lanterne_base', 'jardiniere', 'tonneau_deco', 'caisse_deco'],
    topics: [
      { q: 'Comment acheter une maison ?', a: "Approchez-vous de la porte d'une maison à vendre et appuyez sur E : 800 doublons et elle est à vous, avec votre nom sur la plaque. Une seule par pirate. Dedans, tout est vide : meublez-la avec la touche B." },
      { q: 'Et les voleurs ?', a: "Il y en a. Une porte se crochette, avec des crochets et des doigts agiles. Une serrure renforcée et un chien de garde les découragent. Rangez vos trésors dans vos coffres : un voleur n'emporte qu'une poignée de choses." },
    ],
  },
  fouine: {
    name: 'La Fouine', title: 'Receleuse',
    look: { skin: 1, hair: 0, hairStyle: 'long', top: 'gilet', topCol: 'black', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'black' },
    greet: ['Tu ne m’as jamais vue. Moi non plus.', 'Des crochets ? Des bijoux à revendre ? Parle bas.'],
    shop: ['crochets', 'carte_dechiree', 'bandage'],
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

// ----- 0.7 : le Grand Large -----
const VIF = { skin: 1, hair: 0, hairStyle: 'long', beard: 1, top: 'manteau', topCol: 'purple', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'purple' };
const vifTopics = [
  { q: 'Qui êtes-vous ?', a: "Ambroise Vif-Argent. Capitaine. Le meilleur de ces eaux, de l'avis de tous ceux qui ont eu la chance de me rencontrer. Les autres ne comptent pas, ils sont jaloux." },
  { q: 'La Couronne des Marées ?', a: "Une couronne d'or et de nacre qui commande aux marées. Le Comte Vespère l'a volée il y a cent ans, et depuis, la mer recrache ses morts. Celui qui la reprend... eh bien, il fait ce qu'il veut. Moi, par exemple." },
];
Object.assign(NPCS, {
  mama_lune: {
    name: 'Mama Lune', title: 'Tenancière du Perroquet Pendu',
    look: { skin: 3, hair: 4, hairStyle: 'long', top: 'vareuse', topCol: 'purple', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'orange' },
    greet: ['Assieds-toi, mon cœur. La Rade ne pose pas de questions, mais elle écoute.', 'Le rhum d’ici brûle la gorge et les remords.', 'Tu as la tête de quelqu’un qui cherche un capitaine. Ou des ennuis.'],
    shop: ['rhum', 'grog', 'poisson_grille', 'tentacule_fumee'],
    topics: [
      { q: 'La Rade ?', a: "Rade-aux-Flibustiers. Pas de roi, pas de loi, juste un pacte : on ne se tue pas dans les rues. Au-delà des palissades, sur les collines, les flibustiers maudits ne respectent plus rien." },
      { q: 'Vif-Argent ?', a: "J'ai été son second, autrefois. Il a le cœur gros comme un boulet de canon, et il le perd aussi vite. Ne lui prête jamais d'argent. Ni de navire. Ni ton dos." },
    ],
  },
  vif_argent: { name: 'Ambroise Vif-Argent', title: 'Prisonnier, momentanément', look: VIF, vis: { q: 'evasion', s: ['locked', 'available'] },
    greet: ['Ah ! Enfin une tête qui ne sent pas la vase. Approchez, approchez.', 'Ces barreaux ? Une simple formalité.', 'Le geôlier a un faible pour le rhum. Moi aussi, mais ça, c’est une autre histoire.'], topics: vifTopics },
  vif_quai: { name: 'Ambroise Vif-Argent', title: 'Capitaine sans navire (pour l’instant)', look: VIF, vis: { q: 'evasion', s: ['active', 'ready', 'done'], not: { q: 'trois_fragments', s: ['done'] } },
    greet: ['L’air libre ! Rien de tel. Sauf peut-être un navire. Et de l’or. Et un navire en or.', 'Ne restez pas planté là, on a une Couronne à voler. À reprendre, pardon.'], topics: vifTopics },
  vif_camp: { name: 'Ambroise Vif-Argent', title: 'Rescapé, et fier de l’être', look: VIF, vis: { q: 'docteur', s: ['done'] },
    greet: ['Vous revoilà ! Je savais que vous viendriez. Enfin, je l’espérais. Très fort.', 'Pour la carte, je peux tout expliquer. Plus tard.'], topics: vifTopics },
  geolier: {
    name: 'Grosbec', title: 'Geôlier de la Rade',
    look: { skin: 0, hair: 1, hairStyle: 'chauve', beard: 2, top: 'gilet', topCol: 'black', pants: 'brown', boots: 'black' },
    greet: ['Hic. On ne touche pas aux barreaux.', 'Le prisonnier ? Il parle, il parle... Hic.', 'Personne ne sort d’ici. Sauf avec la clé. Que j’ai. Quelque part.'],
    topics: [{ q: 'Une bouteille ?', a: "Une bouteille ? Hic. Six, oui. Six, ça c'est une conversation." }],
  },
  gardien_geole: { // 1.0 : on lui paie la caution, ou l'on attend
    name: 'Maître Verrou', title: 'Gardien de la Geôle', bail: 1,
    look: { skin: 1, hair: 0, hairStyle: 'court', beard: 1, top: 'capitaine', topCol: 'navy', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black' },
    greet: ['Encore un forban. La paille est fraîche, le temps passe plus vite assis.', 'On sort d’ici de deux façons : en purgeant sa peine, ou en payant la caution.', 'La Capitainerie tient ses comptes. Et moi, je tiens les clés.'],
    topics: [
      { q: 'Pourquoi suis-je ici ?', a: "Vous étiez recherché. Trop de pirates envoyés par le fond sans qu'ils aient levé la main sur vous, ou une maison crochetée. La garde vous a pris en ville, ou l'on vous a ramené mort. Ici, on purge, puis l'ardoise est effacée." },
      { q: 'Comment ne plus revenir ?', a: "Ne frappez que ceux qui vous cherchent. Celui qui se défend n'a rien à craindre de la Capitainerie. Et l'infamie s'oublie : à force de bonne conduite, elle redescend toute seule." },
      { q: 'Et les chasseurs de primes ?', a: "Une prime court sur chaque forban recherché : celui qui l'abat touche une part de son or, et l'honneur qui va avec. Le classement de l'honneur est affiché à la Capitainerie… enfin, dans votre livre de compagnons (P)." },
    ],
  },
  madame_soie: {
    name: 'Madame Soie', title: 'Couturière des forbans',
    look: { skin: 2, hair: 0, hairStyle: 'queue', top: 'capitaine', topCol: 'teal', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'teal' },
    greet: ['On ne vient pas à la Rade pour être discret, mon chou. On vient pour être vu.', 'Une tenue, ça se mérite. Ou ça s’achète.', 'Ce manteau ? Pris sur un amiral. Il n’en avait plus besoin.'],
    shop: ['tenue_mousse', 'tenue_boucanier', 'tenue_corsaire', 'tenue_sables', 'tenue_brumes', 'tenue_sirene', 'tenue_peste'],
    topics: [
      { q: 'Les tenues ?', a: "Une tenue se porte par-dessus tout le reste : elle change votre allure et vous donne ses propres bonus. Je vends les classiques. Les grandes tenues, il faut les coudre ici, à ma table de couture, ou les arracher à ceux qui les portent." },
    ],
  },
  receleur: {
    name: 'Le Receleur', title: 'Achète tout, ne demande rien',
    look: { skin: 2, hair: 0, hairStyle: 'court', beard: 1, top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'black', eye: 'patch' },
    greet: ['Je n’ai rien vu. Vous non plus.', 'Un coffret à bijoux ? Je ne demande pas d’où il vient.', 'Les meilleures affaires se font la nuit.'],
    shop: ['crochets', 'serrure_renforcee', 'carte_dechiree', 'lame_corail', 'boussole_maudite', 'billet_port'],
  },
  passeur: { name: 'Joseph', title: 'Passeur', look: { skin: 1, hair: 3, hairStyle: 'court', beard: 1, top: 'vareuse', topCol: 'navy', pants: 'brown', boots: 'brown', hat: 'bonnet', hatCol: 'navy' },
    greet: ['Une traversée ? Le billet, et je m’occupe du reste.', 'Mon bateau n’a jamais coulé. Pas encore.'], shop: ['billet_havre', 'billet_rade', 'billet_anse'],
    topics: [{ q: 'Comment voyager ?', a: "Achetez un billet, puis utilisez-le depuis n'importe quelle ville (clic droit dans le sac) : je vous dépose sur le quai. Pour le reste du monde, il vous faudra votre propre navire." }] },
  passeur_havre: { name: 'Gwenola', title: 'Passeuse', look: { skin: 0, hair: 2, hairStyle: 'queue', top: 'vareuse', topCol: 'teal', pants: 'brown', boots: 'brown', hat: 'bonnet', hatCol: 'teal' },
    greet: ['On lève l’ancre quand vous voulez.'], shop: ['billet_port', 'billet_rade', 'billet_anse'] },
  passeur_rade: { name: 'Baltazar', title: 'Charpentier et passeur de la Rade', look: { skin: 3, hair: 0, hairStyle: 'chauve', beard: 2, top: 'tablier', topCol: 'brown', pants: 'black', boots: 'black' },
    greet: ['Un brick ? J’en ai un. Il est cher. Il le vaut.', 'Les frégates maudites rôdent au sud. Prenez un bon navire.'], shop: ['billet_port', 'billet_havre', 'billet_anse', 'sloop', 'brick'],
    topics: [{ q: 'Les navires maudits ?', a: "Des bricks de noyés au nord et à l'ouest, des frégates au sud, et dans les Brumes Éternelles, le Galion Fantôme du Comte. Ils tirent à vue sur tout ce qui flotte. Coulez-les : leurs cales sont pleines." }] },
  passeur_anse: { name: 'Pépin', title: 'Passeur d’Anse-Tranquille', look: { skin: 1, hair: 5, hairStyle: 'court', top: 'rayee', pants: 'navy', boots: 'brown', hat: 'paille' },
    greet: ['Bienvenue à l’Anse ! Ici, même les mouettes font la sieste.'], shop: ['billet_port', 'billet_havre', 'billet_rade'] },
  kerbrat: {
    name: 'Vieux Kerbrat', title: 'Ancien des Frères de la Côte',
    look: { skin: 0, hair: 4, hairStyle: 'hirsute', beard: 2, beardCol: 4, top: 'gilet', topCol: 'red', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'red' },
    greet: ['Un Frère de la Côte ne se bat jamais seul. C’est la seule règle.', 'Le Fort ? Il faut être deux. Toujours.'],
    topics: [{ q: 'Le Fort des Deux Clés ?', a: "Deux dalles devant la porte : il faut un pirate sur chacune, en même temps. À l'intérieur, Fer et Rouille. Tant qu'ils sont côte à côte, leurs armures se renvoient les coups. Éloignez-les l'un de l'autre, et frappez." }],
  },
  maelys: {
    name: 'Maëlys', title: 'Pêcheuse d’Anse-Tranquille',
    look: { skin: 2, hair: 3, hairStyle: 'long', top: 'chemise', topCol: 'white', pants: 'navy', boots: 'brown', hat: 'paille' },
    greet: ['Les maisons d’ici sont à vendre, et la mer est calme. Enfin, presque.', 'Tu entends ? C’est le lagon qui chante. Ne l’écoute pas trop.'],
    shop: ['sardine', 'poisson_grille', 'canne_peche', 'banane'],
    topics: [{ q: 'Habiter ici ?', a: "Six maisons à vendre, 800 doublons chacune. L'Anse est protégée comme une ville : ni morts, ni duels. Les cambrioleurs, par contre..." }],
  },
  ermite: {
    name: 'L’Ermite', title: 'Il a tout vu, tout oublié',
    look: { skin: 1, hair: 4, hairStyle: 'hirsute', beard: 2, beardCol: 4, top: 'haillons', topCol: 'brown', pants: 'brown', boots: 'brown', hat: 'paille' },
    greet: ['Trois maisons, zéro voisin. Le paradis. Enfin, il y a les crabes.', 'Personne ne protège cet îlot. Ni Flamme, ni loi. Vous êtes prévenu.'],
  },
  agathe: {
    name: 'Sœur Agathe', title: 'Dernière soignante de la Quarantaine',
    look: { skin: 0, hair: 1, hairStyle: 'court', top: 'tablier', topCol: 'white', pants: 'black', boots: 'black', hat: 'foulard', hatCol: 'white' },
    greet: ['Ne touchez à rien. Surtout pas aux morts.', 'La peste n’a pas tué cette colonie. Le Docteur, si.'],
    shop: ['bandage', 'elixir_flamme', 'grog', 'rhum'],
  },
  tailleur_rade: { name: 'Rodrigue', title: 'Marchand d’étoffes', look: { skin: 1, hair: 1, hairStyle: 'queue', top: 'gilet', topCol: 'yellow', pants: 'brown', boots: 'brown', hat: 'foulard', hatCol: 'red' },
    greet: ['Des habits de capitaine, cousus main. Le cuir et la soie, c’est mon affaire.'], shop: ['tenue_boucanier', 'tenue_corsaire', 'tenue_brumes', 'tenue_peste', 'armure_conquistador', 'tenue_freres'] },
});

// 0.8 : Libertalia, la Cité Libre des Forbans — ses capitaines, ses marchands, ses tavernes et ses secrets
const LIB_SHOPS = {
  ecurie: ['ane', 'cheval', 'tortue_geante', 'crabe_geant', 'autruche', 'pur_sang'],
  armes: ['fouet', 'dague_venin', 'marteau_pont', 'sabre_givre', 'lance_cavalerie', 'trident_orage', 'lame_executrice', 'sarbacane', 'boomerang', 'lance_grappin', 'tromblon_sel', 'pistolet_ricochet', 'pistolet_givre', 'pistolet_tonnerre'],
  noir: ['sabre_midas', 'mousquet_vaudou', 'destrier_squelette', 'habit_gouverneur', 'anneau_vampire', 'collier_vaudou', 'trefle_or', 'boussole_vents', 'crochets', 'serrure_renforcee'],
};
Object.assign(NPCS, {
  reine: {
    name: 'Isaure Cœur-de-Sel', title: 'Reine des Forbans de Libertalia',
    look: { skin: 2, hair: 4, hairStyle: 'long', top: 'capitaine', topCol: 'purple', pants: 'black', boots: 'black', hat: 'couronne', cape: 'red' },
    greet: ['Libertalia n’a ni roi ni maître. Elle a une reine, ce qui n’est pas pareil.', 'Parlez franchement. Ici, on pend les menteurs. Parfois.', 'Ma couronne est en fer-blanc, pirate. C’est ma parole qui est en or.'],
    topics: [
      { q: 'Qu’est-ce que Libertalia ?', a: "Une cité où chaque forban a une voix, qu'il soit né noble, esclave ou bâtard de capitaine. Aubin Sans-Maître l'a fondée il y a quarante ans, avec une règle gravée sur la place : « Ni roi, ni maître. » Moi, on m'a élue. Nuance." },
      { q: 'Qui est le Roi sans Couronne ?', a: "Le premier qui a voulu régner sur nous. Il s'appelait Malo le Rouge. Les fondateurs l'ont renversé, puis enterré sous le fort des Hauts... sans sa couronne. On l'a fondue pour payer les remparts. Depuis, on raconte qu'il la cherche encore." },
      { q: 'Et la Marée Morte ?', a: "Elle réveille ce qui devrait dormir. Les champs de canne, la mangrove, la jungle : tout ce qui est mort ici se relève. La cité tient grâce à ses murs et à ses gardes. Pour combien de temps ?" },
    ],
  },
  capitaine_brisemer: {
    name: 'Capitaine Brisemer', title: 'Capitaine du Conseil — gardien de la Baie',
    look: { skin: 3, hair: 0, hairStyle: 'chauve', beard: 2, beardCol: 4, top: 'capitaine', topCol: 'navy', pants: 'navy', boots: 'black', hat: 'tricorne', hatCol: 'navy' },
    greet: ['Hmpf. Encore un héros. Les héros, ça coule vite.', 'Ma baie sent la poudre et la noyade. J’aime ça.', 'Trente ans de mer. Pas un naufrage. Enfin, pas un des miens.'],
    topics: [{ q: 'Les naufrageurs ?', a: "Des vivants, eux. Pire que les morts. Ils allument de fausses lumières sur les rochers de la Baie, les navires croient voir le port, et crac. Ensuite ils pillent les épaves. Leur chef se fait appeler Grand-Feu." }],
  },
  dame_corail: {
    name: 'Dame Corail', title: 'Capitaine du Conseil — maîtresse des comptoirs',
    look: { skin: 1, hair: 2, hairStyle: 'long', top: 'manteau', topCol: 'teal', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'teal' },
    greet: ['Tout a un prix. Votre vie aussi, mais je ne l’achèterais pas.', 'Le commerce, c’est la guerre avec de meilleures manières.', 'Mes navires rapportent plus d’or que tous les trésors de l’archipel.'],
    topics: [{ q: 'La contrebande ?', a: "Libertalia vit de la contrebande, ne soyons pas hypocrites. Mais les contrebandiers de la mangrove ne paient plus leur part. Ils sont morts, voyez-vous. Et les morts sont de très mauvais payeurs." }],
  },
  capitaine_fendlame: {
    name: 'Capitaine Fendlame', title: 'Capitaine du Conseil — commandant des Hauts', vis: { q: 'lib_murmures', s: ['locked', 'available', 'active', 'ready'] }, // il a fui dans la crypte
    look: { skin: 0, hair: 0, hairStyle: 'queue', beard: 1, beardCol: 0, top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'red', eye: 'patch' },
    greet: ['L’ordre. Voilà ce qui manque à cette cité. L’ordre.', 'Je commande le fort des Hauts. Ou ce qu’il en reste.', 'Une reine élue... Et demain, on élira le vent ?'],
    topics: [{ q: 'Le fort des Hauts ?', a: "Les anciens gardes y montent encore la garde. Morts, mais disciplinés. Ils tirent sur tout ce qui approche. Sous le fort, il y a une crypte que personne n'a ouverte depuis quarante ans. Personne. Retenez bien ça." }],
  },
  palefrenier: { name: 'Tobias', title: 'Palefrenier des Écuries du Nord', look: { skin: 1, hair: 3, hairStyle: 'hirsute', top: 'gilet', topCol: 'brown', pants: 'brown', boots: 'brown', hat: 'paille' },
    greet: ['Un âne pour commencer, un pur-sang pour finir. C’est la vie.', 'Montez, appuyez sur C, et le monde rétrécit.', 'Ma tortue géante ne court pas vite. Mais elle ne meurt jamais.'], shop: LIB_SHOPS.ecurie,
    topics: [{ q: 'Comment monter ?', a: "Achetez une monture, équipez-la dans la case Monture de votre sac, puis C pour monter ou descendre. On ne se bat pas à cheval, et un coup vous fait tomber. Pour le reste, c'est le vent dans les cheveux." }] },
  armurier: { name: 'Mâchefer', title: 'Armurier du Sabre Courbe', look: { skin: 3, hair: 0, hairStyle: 'chauve', beard: 2, top: 'tablier', topCol: 'black', pants: 'brown', boots: 'black' },
    greet: ['Mes armes ne coupent pas. Elles gèlent, elles foudroient, elles empoisonnent.', 'Le givre d’un sabre, le tonnerre d’un pistolet... Choisissez votre mort préférée. Pour les autres.', 'Ici, on ne répare pas. On vend du neuf.'], shop: LIB_SHOPS.armes,
    topics: [{ q: 'Des armes à effets ?', a: "Le fouet ralentit, la dague empoisonne, le sabre de givre gèle, le pistolet à ricochet rebondit d'un mort à l'autre, le tonnerre saute de cible en cible. Passez la souris sur une arme : je l'ai étiquetée, tout est écrit." }] },
  tailleur_lib: { name: 'Monsieur Fil-d’Or', title: 'Tailleur des Gentilshommes', look: { skin: 0, hair: 6, hairStyle: 'queue', top: 'gilet', topCol: 'yellow', pants: 'white', boots: 'black', hat: 'plume', hatCol: 'yellow' },
    greet: ['Un forban mal habillé est un forban à moitié pendu.', 'De la soie, du velours, du cuir de requin. Rien que le meilleur.', 'Les bottes de sept lieues ? Cousues par moi. Les lieues, je ne garantis pas.'],
    shop: ['chapeau_plume', 'tenue_contrebandier', 'tenue_chasseur', 'uniforme_marine', 'tenue_vaudou', 'bottes_sept_lieues'] },
  apothicaire: { name: 'Mère Borgnefiole', title: 'Apothicaire et faiseuse de miracles', look: { skin: 2, hair: 4, hairStyle: 'hirsute', top: 'vareuse', topCol: 'green', pants: 'black', boots: 'brown', hat: 'foulard', hatCol: 'green' },
    greet: ['Une fiole pour courir, une pour frapper, une pour ne pas mourir. Ou les trois.', 'Ne buvez jamais la verte à jeun.', 'J’ai un œil de verre. Il voit mieux que l’autre.'],
    shop: ['antidote', 'fiole_celerite', 'potion_force', 'tonique_fer', 'bandage', 'elixir_flamme', 'fumigene', 'baton_vaudou'] },
  tav_rhum: { name: 'Gros-Louis', title: 'Tavernier du Rhum Borgne', look: { skin: 0, hair: 2, hairStyle: 'court', beard: 2, beardCol: 2, top: 'tablier', topCol: 'white', pants: 'brown', boots: 'brown' },
    greet: ['Ici, le rhum est vieux et les clients aussi.', 'Un verre ? Deux ? La bouteille ? Bon choix.', 'On ne se bat pas dans mon établissement. On se bat dehors, comme des gens civilisés.'], shop: ['rhum', 'rhum_vieux', 'grog', 'poisson_grille', 'biscuit_mer'],
    topics: [{ q: 'Des rumeurs ?', a: "Le capitaine Fendlame passe beaucoup de temps aux Hauts, ces derniers temps. Seul. La nuit. Moi, je dis ça, je dis rien. Je sers le rhum." }] },
  tav_sirene: { name: 'Marisol', title: 'Patronne de La Sirène Ivre', look: { skin: 2, hair: 1, hairStyle: 'long', top: 'chemise', topCol: 'red', pants: 'red', boots: 'black', hat: 'foulard', hatCol: 'yellow' },
    greet: ['À La Sirène Ivre, on chante faux mais on chante fort !', 'Ma soupe de tortue a ressuscité un noyé. Il est reparti mécontent.', 'Asseyez-vous, mon chou, vous avez une tête à avoir besoin d’un grog.'], shop: ['rhum', 'grog', 'soupe_tortue', 'tarte_baies', 'galette_coco'] },
  tav_kraken: { name: 'Ignace', title: 'Tavernier du Kraken Saoul', look: { skin: 1, hair: 5, hairStyle: 'hirsute', beard: 1, top: 'rayee', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'red' },
    greet: ['Le Kraken Saoul ! Le seul kraken qu’on peut regarder dans les yeux.', 'Les marins du port boivent ici. Et ils racontent tout.', 'Une bière de varech ? Non ? Personne n’en veut jamais.'], shop: ['rhum', 'grog', 'brochette_crabe', 'ragout_marin', 'biscuit_mer'] },
  tav_cale: { name: 'La Mouche', title: 'Tenancier de La Cale Sèche', look: { skin: 3, hair: 0, hairStyle: 'court', top: 'haillons', topCol: 'grey', pants: 'black', boots: 'black', hat: 'bandana', hatCol: 'black' },
    greet: ['Bienvenue aux Bas-Fonds. Gardez la main sur votre bourse.', 'Ici, on ne pose pas de questions. On vend des réponses.', 'La nuit, les coupe-jarrets sortent. Le jour aussi, mais ils se cachent mieux.'], shop: ['rhum', 'rhum_vieux', 'fumigene', 'crochets'] },
  croupier: { name: 'Fortuné', title: 'Croupier de La Bourse aux Dés', dice: 1, look: { skin: 0, hair: 1, hairStyle: 'court', top: 'gilet', topCol: 'green', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'green' },
    greet: ['Faites vos jeux ! Le hasard est le seul juge honnête de Libertalia.', 'Deux dés, une mise. Battez mon total et je double votre or.', 'La maison gagne toujours. Sauf quand elle perd.'],
    topics: [{ q: 'Les règles ?', a: "Vous misez, chacun lance deux dés. Le plus haut total gagne : je vous rends le double de votre mise. Un double six, c'est le triple. Égalité ? La maison gagne : il faut bien vivre. Mises de 10 à 500 doublons." }] },
  joueur_lib: { name: 'Lucien Sans-le-Sou', title: 'Joueur ruiné', look: { skin: 0, hair: 3, hairStyle: 'hirsute', top: 'chemise', topCol: 'white', pants: 'brown', boots: 'brown' },
    greet: ['J’ai tout perdu. Mon navire, ma montre, ma chemise... Ah non, j’ai encore ma chemise.', 'La prochaine partie sera la bonne. Je le sens.', 'Fortuné triche. Je ne sais pas comment, mais il triche.'] },
  madame_rubis: { name: 'Madame Rubis', title: 'Maîtresse du Velours Écarlate', look: { skin: 1, hair: 4, hairStyle: 'long', top: 'chemise', topCol: 'red', pants: 'red', boots: 'black', hat: 'plume', hatCol: 'purple' },
    greet: ['Bienvenue au Velours, mon cœur. Ici, on boit, on écoute la musique, et on oublie la mer.', 'Les capitaines viennent pour la compagnie. Ils repartent plus légers... de leurs secrets.', 'Tenez-vous bien. Le Velours a des règles, et des videurs.'], shop: ['rhum_vieux', 'grog'],
    topics: [{ q: 'Qu’est-ce que le Velours ?', a: "Le salon le plus élégant de l'archipel. Du vin, de la musique, de belles personnes et de bonnes conversations. Ce qui se dit au Velours reste au Velours. Sauf quand ça m'arrange." }] },
  perle: { name: 'Perle', title: 'Courtisane du Velours', look: { skin: 2, hair: 0, hairStyle: 'long', top: 'chemise', topCol: 'purple', pants: 'purple', boots: 'black', hat: 'foulard', hatCol: 'purple' },
    greet: ['Vous avez l’air d’avoir besoin de conversation. Ou d’un bain.', 'Les capitaines parlent beaucoup quand ils ont bu. Moi, j’écoute.', 'Un sourire, ça ne coûte rien. Le reste se discute.'] },
  celeste: { name: 'Céleste', title: 'Chanteuse du Velours', look: { skin: 0, hair: 6, hairStyle: 'long', top: 'chemise', topCol: 'teal', pants: 'teal', boots: 'black' },
    greet: ['La-la-la... Pardon, je répète. Ce soir, je chante « La Ballade de Malo le Rouge ».', 'On dit que ma voix calme les morts. Je n’ai jamais osé vérifier.', 'Une chanson pour le pirate qui s’ennuie ?'] },
  le_borgne: { name: 'Le Borgne', title: 'Marché noir — on ne l’a jamais vu ici', look: { skin: 2, hair: 0, hairStyle: 'court', beard: 1, beardCol: 0, top: 'manteau', topCol: 'black', pants: 'black', boots: 'black', hat: 'cagoule', hatCol: 'black', eye: 'patch' },
    greet: ['Fermez la porte. Doucement.', 'Ce que je vends n’existe pas. Ce que vous payez, si.', 'Le sabre de Midas, le destrier d’os, le mousquet vaudou... Les légendes ont un prix.'], shop: LIB_SHOPS.noir,
    topics: [{ q: 'D’où vient tout ça ?', a: "D'épaves, de tombes, de cales de navires qui ne rentreront jamais. Je ne vole personne. Les morts n'ont plus besoin de rien." }] },
  charpentier_lib: { name: 'Maître Calfat', title: 'Charpentier de marine', look: { skin: 3, hair: 4, hairStyle: 'court', beard: 2, beardCol: 4, top: 'tablier', topCol: 'brown', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'navy' },
    greet: ['Un radeau pour pêcher, une goélette pour filer, un galion pour régner sur la mer.', 'Ma goélette remonte au vent comme une mouette.', 'Le galion ? Seize mille doublons. Et il les vaut, mousse.'], shop: ['radeau', 'barque', 'sloop', 'goelette', 'brick', 'galion'],
    topics: [{ q: 'Quel navire choisir ?', a: "Le radeau, c'est pour le lagon. La goélette est la plus rapide de l'archipel. Le galion est lent, mais ses canons coulent une frégate maudite en trois bordées. Placez votre navire dans l'eau depuis votre sac." }] },
  capitaine_port: { name: 'Capitaine Esteban', title: 'Capitaine du port', look: { skin: 2, hair: 1, hairStyle: 'court', beard: 1, top: 'manteau', topCol: 'navy', pants: 'white', boots: 'black', hat: 'tricorne', hatCol: 'navy' },
    greet: ['Le port de Libertalia accueille tous les pavillons. Surtout les noirs.', 'Amarrez proprement, payez la taxe, et souriez.', 'Une longue-vue ? Indispensable. On voit venir les ennuis de plus loin.'], shop: ['longue_vue', 'conque_rappel', 'carte_dechiree'] },
  maitre_fosse: { name: 'Brise-Os', title: 'Maître de la Fosse', arena: 1, look: { skin: 3, hair: 0, hairStyle: 'chauve', beard: 2, beardCol: 0, top: 'armure', topCol: 'grey', pants: 'black', boots: 'black', hat: 'morion' },
    greet: ['La Fosse ! Ici, on se bat pour l’or, la gloire, et parfois pour rien.', 'Tu as des épaules. Voyons si tu as des tripes.', 'Le dernier champion ? Il est dans les gradins. En morceaux.'] },
  passeur_lib: { name: 'Nérée', title: 'Passeuse de Libertalia', look: { skin: 2, hair: 2, hairStyle: 'queue', top: 'vareuse', topCol: 'yellow', pants: 'brown', boots: 'brown', hat: 'bonnet', hatCol: 'yellow' },
    greet: ['Port-Lanterne, Havre-des-Brumes, la Rade, l’Anse : j’y vais par tous les temps.', 'Mon bateau est petit, mais il connaît le chemin.'], shop: ['billet_port', 'billet_havre', 'billet_rade', 'billet_anse'] },
  marchande_fruits: { name: 'Manon', title: 'Marchande de fruits', look: { skin: 2, hair: 3, hairStyle: 'long', top: 'chemise', topCol: 'yellow', pants: 'green', boots: 'brown', hat: 'paille' },
    greet: ['Mangues, bananes, noix de coco ! Tout frais, tout juste volé... euh, cueilli !', 'Un fruit par jour éloigne le scorbut !'], shop: ['banane', 'noix_coco', 'baies', 'galette_coco', 'tarte_baies'] },
  poissonnier_lib: { name: 'Yvon', title: 'Poissonnier', look: { skin: 0, hair: 4, hairStyle: 'court', beard: 2, beardCol: 4, top: 'tablier', topCol: 'white', pants: 'navy', boots: 'black', hat: 'bonnet', hatCol: 'navy' },
    greet: ['Sardines du matin, poisson grillé du midi, soupe de tortue du soir !', 'Il est frais mon poisson ! Il est mort, mais frais !'], shop: ['sardine', 'poisson_grille', 'soupe_tortue', 'canne_peche'] },
  marchand_curios: { name: 'Zéphyrin', title: 'Marchand de curiosités', look: { skin: 1, hair: 6, hairStyle: 'long', top: 'manteau', topCol: 'purple', pants: 'black', boots: 'brown', hat: 'foulard', hatCol: 'purple' },
    greet: ['Un singe chapardeur ? Un perroquet qui jure en trois langues ? Un chaton porte-bonheur ?', 'Tout ce qui est bizarre finit chez moi.'], shop: ['chaton', 'perroquet_vert', 'singe', 'longue_vue', 'collier_coquillages', 'carte_dechiree'] },
  marchand_rhum: { name: 'Rosalie', title: 'Marchande de rhum', look: { skin: 3, hair: 2, hairStyle: 'queue', top: 'gilet', topCol: 'orange', pants: 'brown', boots: 'brown', hat: 'bandana', hatCol: 'orange' },
    greet: ['Le meilleur rhum de l’île vient des Cannaies. Enfin, venait.', 'Rhum blanc, rhum vieux, grog chaud : approchez !'], shop: ['rhum', 'rhum_vieux', 'grog'] },
  crieur: { name: 'Hector le Crieur', title: 'Crieur public', look: { skin: 0, hair: 1, hairStyle: 'court', top: 'manteau', topCol: 'red', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'red' },
    greet: ['OYEZ, OYEZ ! La Reine tiendra conseil ce soir au palais !', 'OYEZ ! Prime sur les naufrageurs de la Baie ! Voir le tableau, sur la place !', 'OYEZ ! Les duels sont interdits dans l’enceinte ! Les paris, non !', 'OYEZ ! On recherche un chat roux. Il répond au nom de Capitaine.'] },
  primes_lib: { name: 'Tableau des primes', title: 'Conseil des Capitaines de Libertalia', board: 1,
    greet: ['AVIS : le Conseil paie comptant chaque menace renvoyée au repos. Ou au fond.', 'Les avis sont cloués au poignard. Certains ont du sang séché dessus.'], topics: [] },
  garde_porte: { name: 'Sergent Mâchoire', title: 'Garde de la Porte du Nord', look: { skin: 1, hair: 0, hairStyle: 'court', beard: 1, top: 'armure', topCol: 'red', pants: 'black', boots: 'black', hat: 'morion' },
    greet: ['Halte ! Ah, un vivant. Entrez.', 'Pas de duel dans l’enceinte. Pas de morts non plus. Ni de chats roux, depuis hier.', 'La nuit, les portes restent ouvertes. Les remparts suffisent. Enfin, j’espère.'],
    topics: [{ q: 'Que voir à Libertalia ?', a: "Le palais de la Reine au nord, la place de la Liberté au centre, le marché juste en dessous, les tavernes sur la rue du milieu, le Velours Écarlate à l'ouest, le port au sud. Et les Bas-Fonds, à l'est... mais là, gardez la main sur votre sabre." }] },
  mendiant: { name: 'Le Vieux Sou', title: 'Mendiant aveugle (en principe)', look: { skin: 1, hair: 4, hairStyle: 'hirsute', beard: 2, beardCol: 4, top: 'haillons', topCol: 'brown', pants: 'brown', boots: 'grey' },
    greet: ['Une pièce pour un pauvre aveugle ? ... Belle chemise, au fait.', 'Je ne vois rien. Mais j’entends tout.', 'Les murs de Libertalia ont des oreilles. Moi aussi.'] },
  musicien: { name: 'Gaétan', title: 'Violoneux des rues', look: { skin: 0, hair: 3, hairStyle: 'long', top: 'gilet', topCol: 'red', pants: 'navy', boots: 'brown', hat: 'paille' },
    greet: ['♪ Libertalia, cité sans maître, ses rues sont larges, ses cœurs aussi... ♪', 'Une pièce, une chanson. Deux pièces, je m’arrête.', '♪ Malo le Rouge voulait une couronne... on la lui a fondue en canons... ♪'] },
});
for (const id of ['passeur', 'passeur_havre', 'passeur_rade', 'passeur_anse']) NPCS[id].shop.push('billet_libertalia');
NPCS.passeur.shop.push('radeau', 'ane');
