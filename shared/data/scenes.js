// 1.0 : les conversations cinématiques des anciennes quêtes, et la mémoire des personnages.
// Même format que dans quests.js : ['npc', texte] | ['me', texte] | [idPNJ, texte] | { ask: [{ q, a }], go }
// et, nouveau : { choose: [{ q, mem, a }] } — un choix qui compte, retenu par le pirate (mem) ;
// les personnages s'en souviennent ensuite (REMEMBER). {nom} est remplacé par le nom du pirate.

export const OLD_SCENES = {
  premier_pas: {
    scene: [
      ['npc', "Encore un naufragé… Relève-toi, matelot. Tu es à Port-Lanterne, et tu respires encore : c'est déjà une bonne journée."],
      ['me', "Où sont les autres ? Mon navire…"],
      ['npc', "La mer garde ce qu'elle prend. Depuis la Marée Morte, elle rend aussi. Mais pas ce qu'on voudrait."],
      { choose: [
        { q: 'Mon navire a sombré. Je suis le seul à avoir nagé.', mem: 'origine_naufrage', a: [['npc', "Alors tu as de bons bras et de la chance. Ici, il faut les deux."]] },
        { q: 'Je fuis quelqu’un. Mieux vaut ne pas dire qui.', mem: 'origine_fuite', a: [['npc', "Tout le monde fuit quelque chose, à Port-Lanterne. Garde ton secret ; les morts, eux, ne posent pas de questions."]] },
        { q: 'On m’a parlé d’un trésor. Je suis venu le chercher.', mem: 'origine_tresor', a: [['npc', "Un trésor… Ils disent tous ça. La plupart finissent dans la vase avec leur carte. Toi, essaie de faire mieux."]] },
      ] },
      ['npc', "Tant que la Flamme Bénite brûle sur la place, les morts ne passent pas nos rues. Au-delà, c'est leur royaume."],
      ['npc', "Va voir Isa, à la forge. Personne ne sort d'ici les mains vides : elle te trouvera de quoi te défendre."],
    ],
    sceneDone: [
      ['npc', "Morgane t'envoie ? Elle a l'œil pour les têtes dures. Montre tes mains… Des mains de marin. Bien."],
      ['me', "Elle m'a dit que vous auriez une arme."],
      ['npc', "Une arme, c'est beaucoup dire. Ce pistolet crache plus de fumée que de plomb. Mais la fumée, ça fait reculer les morts aussi."],
      ['npc', "Clic droit pour tirer. Vise bien, et recharge vite. Le reste, tu l'apprendras dehors."],
    ],
  },
  pinces: {
    scene: [
      ['npc', "Tu sens ça ? Non ? Attends que le vent tourne."],
      ['me', "Qu'est-ce que c'est ?"],
      ['npc', "Les crabes de la plage. Ils pourrissent sur pattes depuis la Marée Morte, et ils ont pris goût aux filets. Et aux orteils des pêcheurs."],
      { ask: [
        { q: 'Des crabes ? Vraiment ?', a: [['npc', "Ris tant que tu veux. Le vieux Mathurin en a perdu deux doigts. Il dit trois, mais il compte mal."]] },
        { q: 'Comment les tuer ?', a: [['npc', "Frappe fort, recule, recommence. Et ne te laisse pas encercler : un crabe, ça va ; six, c'est une marée."]] },
      ], go: 'J’y vais' },
      ['npc', "Six, au sud-ouest de la ville. Et reviens avec tous tes orteils."],
    ],
    sceneDone: [
      ['npc', "Ha ! Tu empestes le crabe pourri. C'est bon signe : ça veut dire que tu as gagné."],
      ['me', "J'ai les bottes pleines de carapaces."],
      ['npc', "Tiens, un bandana. Ça cache l'odeur… un peu. Et ça te donne l'air d'un vrai pirate. Beaucoup."],
    ],
  },
  matelots: {
    scene: [
      ['npc', "Tu les as vus, sur la plage ? Les marins qui marchent sans savoir où ils vont ?"],
      ['me', "Des morts. Il y en a partout."],
      ['npc', "Pas n'importe quels morts. Mon équipage. La Mouette Écarlate a sombré il y a deux hivers. La Marée Morte me les a rendus… comme ça."],
      ['npc', "Je n'ai pas le courage de lever mon sabre sur eux. Toi, tu ne les connais pas. Libère-les, je t'en prie. Huit d'entre eux."],
    ],
    sceneDone: [
      ['npc', "C'est fait ? Ils… ils reposent ?"],
      ['me', "Ils ne marchent plus."],
      { choose: [
        { q: 'Dites-moi leurs noms. Je m’en souviendrai.', mem: 'matelots_noms', a: [['npc', "Jehan, le gabier. Pol, qui chantait faux. La petite Maëlle, notre mousse… Merci. Quelqu'un d'autre que moi s'en souviendra."]] },
        { q: 'Je n’ai pas besoin de savoir qui ils étaient.', mem: 'matelots_silence', a: [['npc', "Tu as raison. C'est plus simple ainsi. Pour toi."]] },
      ] },
      ['npc', "Prends cette marinière. Elle appartenait à mon second. Il aurait voulu qu'elle reprenne la mer."],
    ],
  },
  tonnelet: {
    scene: [
      ['npc', "Un drame ! Une tragédie ! On m'a volé mon bébé !"],
      ['me', "Votre… bébé ?"],
      ['npc', "Mon tonnelet ! Mon meilleur rhum, vieilli douze ans dans la cale d'un galion ! Les boucaniers l'ont traîné jusqu'aux Ruines du Temple, tout au nord de la jungle."],
      { ask: [
        { q: 'Pourquoi des morts voudraient du rhum ?', a: [['npc', "Parce qu'ils ont été pirates avant d'être morts ! On ne perd pas ses bonnes habitudes, même sous terre."]] },
        { q: 'Et la récompense ?', a: [['npc', "En nature, mon ami. En nature. Hé hé."]] },
      ], go: 'Je le ramène' },
    ],
    sceneDone: [
      ['npc', "Mon bébé ! Intact ! Laisse-moi le serrer contre moi…"],
      ['npc', "…Attends. Il est un peu léger, non ?"],
      { choose: [
        { q: 'J’y ai goûté. Un peu. Pour vérifier.', mem: 'rhum_goute', a: [['npc', "Pour vérifier ! Ha ! Au moins tu es honnête. Et tu as bon goût."]] },
        { q: 'Pas une goutte, juré sur ma tête.', mem: 'rhum_intact', a: [['npc', "Sur ta tête. Hm. Elle sent le rhum, ta tête. Bon, je te crois. Presque."]] },
      ] },
      ['npc', "Tiens, trois bouteilles. Et ne bois pas tout d'un coup, hein."],
    ],
  },
  os_lanterne: {
    scene: [
      ['npc', "Approche, petit. Regarde la Flamme. Tu vois comme elle tremble ?"],
      ['me', "Elle a l'air fatiguée."],
      ['npc', "Elle l'est. Elle se nourrit des os maudits : les brûler purifie la malédiction, et la Flamme reprend des forces. Sans elle, les morts entreraient en ville dès ce soir."],
      { ask: [
        { q: 'D’où vient la Flamme Bénite ?', a: [['npc', "Un prêtre l'a allumée le jour de la fondation, avec la dernière braise d'un navire qui brûlait. Personne ne l'a jamais laissée s'éteindre. Moi non plus."]] },
        { q: 'Où trouver ces os ?', a: [['npc', "Dans les morts, forcément. Ils en sont pleins. Dix, et la Flamme tiendra l'hiver."]] },
      ], go: 'J’en rapporterai dix' },
    ],
    sceneDone: [
      ['npc', "Jette-les. Là, dans le feu… Regarde !"],
      ['me', "Elle monte. Elle chante, presque."],
      ['npc', "Garde cette amulette : une braise de la Flamme y brûle. Elle veillera sur toi là où la Flamme ne va pas."],
    ],
  },
  marais: {
    scene: [
      ['npc', "Tu as nourri la Flamme. Maintenant, il faut que tu voies d'où vient le mal."],
      ['npc', "À l'ouest, au-delà de la rivière, s'étend le Marais des Noyés. Ceux que la mer a pris y remontent chaque nuit, la bouche pleine de vase."],
      ['me', "Et vous voulez que j'y aille. La nuit."],
      ['npc', "Le jour, si tu préfères : ils y sont aussi, ils dorment juste moins. Renvoie-en six au fond. Et rapporte-moi tes yeux : j'ai besoin de savoir ce que tu y as vu."],
    ],
    sceneDone: [
      ['npc', "Tu es revenu ! Et entier, en plus. Alors ? Raconte."],
      ['me', "De la brume, des cloches qui sonnent sous l'eau, et des noyés qui marchent vers la mer."],
      ['npc', "Vers la mer… Ils obéissent à quelqu'un. Ce tricorne était le mien, autrefois. Il te va mieux qu'à moi, et tu en auras besoin."],
    ],
  },
  canonniers: {
    scene: [
      ['npc', "Gaspard m'a parlé de tes yeux. Les noyés marchent vers la Crique de l'Épave, au nord-ouest. Et ce n'est pas un hasard."],
      ['npc', "Des squelettes armés de mousquets gardent le chemin. C'est Barbe-Cendre qui les a postés là."],
      ['me', "Barbe-Cendre ?"],
      ['npc', "Un capitaine qui a vendu son équipage à la mer pour un trésor. Il est mort en le trouvant. Il ne l'a pas lâché pour autant. Abats six canonniers, et garde la tête basse : ils visent bien, pour des morts."],
    ],
    sceneDone: [
      ['npc', "Le chemin de la crique est ouvert. Tu as de la poudre sur les joues."],
      ['me', "Ils visaient bien, en effet."],
      ['npc', "Prends ces bottes. Sur le pont glissant de l'épave, elles valent de l'or. Tu vas en avoir besoin, très bientôt."],
    ],
  },
  maree_morte: {
    scene: [
      ['npc', "Il est temps, {nom}."],
      ['npc', "Barbe-Cendre a trouvé le Cœur de Corail dans l'épave du Léviathan. C'est lui qui appelle la Marée Morte. Chaque nuit, plus fort."],
      ['me', "Et si on brise le Cœur ?"],
      ['npc', "Alors la marée redescendra. Pas pour toujours, peut-être. Mais assez pour que Port-Lanterne respire."],
      { ask: [
        { q: 'Pourquoi moi ?', a: [['npc', "Parce que tu es revenu du marais, de la crique, de partout où je t'ai envoyé. Les autres ne reviennent pas."]] },
        { q: 'Et s’il me tue ?', a: [['npc', "Alors tu te relèveras ici, devant la Flamme, un peu plus pauvre. Ce n'est pas lui qui choisit qui reste mort. C'est la Flamme."]] },
      ], go: 'Je l’enverrai par le fond' },
    ],
    sceneDone: [
      ['npc', "Tu l'as fait… Regarde la mer. Elle redescend déjà."],
      ['me', "Il a crié quelque chose en tombant. « Elle reviendra. »"],
      ['npc', "Peut-être. Mais pas ce soir. Port-Lanterne te doit tout, Capitaine. Oui, Capitaine : ce titre, tu l'as mérité."],
    ],
  },
  traversee: {
    scene: [
      ['npc', "Tu regardes l'horizon comme moi à ton âge. Tu veux voir du pays ?"],
      ['me', "Il y a quoi, de l'autre côté ?"],
      ['npc', "Havre-des-Brumes, plein est. Ma cousine Ysaline y tient le chantier naval. Il te faut une barque : achète-la-moi, mets-la à l'eau depuis le quai, face à l'eau, et file."],
      { ask: [
        { q: 'C’est dangereux, la mer ?', a: [['npc', "Moins que la terre, ces temps-ci. Évite seulement le Gouffre, au sud. Il chante, la nuit."]] },
        { q: 'Comment on accoste ?', a: [['npc', "Tu approches d'un quai ou d'une plage, tu cargues la voile, tu jettes l'ancre, et tu descends par la passerelle. Et si tu descends voiles dehors, ton navire repart sans toi."]] },
      ], go: 'En route' },
      ['npc', "Dis-lui que c'est Corentin qui t'envoie. Elle te fera un prix. Peut-être."],
    ],
    sceneDone: [
      ['npc', "Corentin t'envoie ? Et tu as traversé sans couler ? Bravo. Il dit ça à tout le monde, tu sais. La moitié coulent."],
      ['me', "J'ai eu de la chance."],
      ['npc', "La chance, en mer, c'est savoir ramer. Si un jour tu veux un vrai navire, reviens me voir. Je construis les meilleurs de l'archipel. Les seuls, aussi."],
    ],
  },
  grotte: {
    scene: [
      ['npc', "Tu as vu ma salle ? Sombre comme une cale. Les chandelles, avec tout ce rhum qui coule, c'est un incendie qui attend son heure."],
      ['npc', "On raconte que des cristaux poussent au fond des grottes, et qu'ils brillent comme la Flamme Bénite. Sans chaleur."],
      ['me', "Et ces grottes, où sont-elles ?"],
      ['npc', "Bien cachées. Cherche les fissures dans la roche, les courants d'air, les endroits où les morts ne vont pas. Trois cristaux, et ta chope est payée pour l'année."],
    ],
    sceneDone: [
      ['npc', "Regarde-moi ça ! La salle n'a jamais été aussi belle. Les clients restent, maintenant. Ils boivent plus."],
      ['me', "C'était l'idée ?"],
      ['npc', "C'est toujours l'idée, chéri. Tiens, deux élixirs : la maison offre."],
    ],
  },
  roi_os: {
    scene: [
      ['npc', "Chaque nuit, des boulets tombent sur nos barques. Ils viennent de l'Île au Crâne."],
      ['npc', "Au fond de l'Antre du Crâne règne le Roi des Os. Ses canonniers ne dorment jamais, et lui non plus."],
      ['me', "Un roi. Il a une couronne ?"],
      ['npc', "Une couronne d'os de rois. Si tu as le cran, va la lui arracher. Prends des amis, et beaucoup de rhum : l'un des deux te servira."],
    ],
    sceneDone: [
      ['npc', "Tu l'as fait ! Cette nuit, les barques pourront sortir. Les pêcheurs vont te porter en triomphe, prépare-toi."],
      ['me', "Je préférerais un lit."],
      ['npc', "Tu auras les deux. Ce manteau appartenait au dernier capitaine de Havre. Il est à toi, maintenant."],
    ],
  },
  acier_duel: {
    scene: [
      ['npc', "Regarde ce dessin. Une rapière de duelliste. Fine comme une aiguille, souple comme une liane."],
      ['me', "Elle est belle."],
      ['npc', "Elle n'existe pas encore. Il me manque le métal. Quatre vieilles lames de boucanier pour la refonte, six dents de zombie pour la trempe."],
      { ask: [{ q: 'Des dents ? Pour la trempe ?', a: [['npc', "Une vieille recette de mon père. Les dents des morts sont dures comme le remords. Ça donne de l'âme à l'acier. Ou alors c'est des bêtises. Mais ça marche."]] }], go: 'Je rapporte tout ça' },
    ],
    sceneDone: [
      ['npc', "Regarde-moi ce fil ! Écoute-le chanter quand je le plie."],
      ['me', "Elle ne coupe pas ?"],
      ['npc', "Une rapière, ça ne tranche pas : ça transperce. Vise juste, et loin devant toi. Et ne la prête à personne."],
    ],
  },
  duel_aube: {
    scene: [
      ['npc', "Mon père était capitaine avant moi. Il est mort dans son lit, ce qui est rare chez nous. Sa cabine est restée telle qu'il l'a laissée."],
      ['npc', "Les boucaniers de la jungle l'ont pillée la semaine dernière. Ils ont tout pris… sauf ce qu'ils n'ont pas trouvé."],
      ['me', "Qu'est-ce qu'ils n'ont pas trouvé ?"],
      ['npc', "Son pistolet de duel. Il n'a jamais raté un duel. Abats-en dix, venge sa cabine, et il est à toi."],
    ],
    sceneDone: [
      ['npc', "Dix. Les boucaniers vont réfléchir avant de revenir. S'ils réfléchissent encore."],
      ['npc', "Tiens. Le pistolet de mon père. Il a mis fin à plus de querelles que tous les juges de l'archipel."],
      ['me', "Je le traiterai bien."],
      ['npc', "Traite bien ceux qui sont en face. C'est ce qu'il disait. Ensuite, il tirait."],
    ],
  },
  bois_marine: {
    scene: [
      ['npc', "Un chantier sans bois, c'est une taverne sans rhum. Je n'ai plus rien : les tempêtes ont tout pris."],
      ['me', "Qu'est-ce qu'il vous faut ?"],
      ['npc', "Huit planches d'épave, sur les plages. Et quatre lambeaux de voile arrachés aux matelots zombies. Ne fais pas cette tête : ils n'en ont plus l'usage."],
      ['npc', "En échange, le harpon de mon grand-père. Avec ça, les noyés gardent leurs distances."],
    ],
    sceneDone: [
      ['npc', "C'est du bon bois. Salé, sec, il a de la mémoire. Les meilleurs navires sont faits de vieux navires."],
      ['npc', "Voilà le harpon. Frappe de loin, et ne le laisse pas dans un noyé : ils ne le rendent jamais."],
    ],
  },
  oeil_guetteur: {
    scene: [
      ['npc', "Monte avec moi en haut du phare, un jour. D'ici, je vois tout l'archipel. Et ce que je vois ne me plaît pas."],
      ['npc', "Sur l'Île au Crâne, les canonniers astiquent leurs mousquets. Ils préparent quelque chose."],
      ['me', "Vous voulez que j'aille les faire taire."],
      ['npc', "Huit d'entre eux. En échange, mon long fusil de guetteur : il porte plus loin que mes yeux, et mes yeux portent loin."],
    ],
    sceneDone: [
      ['npc', "Je les ai entendus se taire, un par un. D'ici. Le vent porte bien les coups de feu."],
      ['npc', "Voilà mon long fusil. Prends le temps de viser : il ne pardonne pas l'impatience. Moi non plus, d'ailleurs."],
    ],
  },
  disparus: {
    scene: [
      ['npc', "Trois navires cette lune. Pas d'épave, pas de survivant. Rien."],
      ['me', "La tempête ?"],
      ['npc', "Il n'y a pas eu de tempête. Il y a eu des chants, la nuit, qui montaient de l'eau. Tous près du Gouffre, entre Port-Lanterne et l'Île au Crâne."],
      ['npc', "Le capitaine Elouan dit savoir ce qui se passe. Il est sur le quai. Il ne parle qu'aux gens qui ont du cran : ça tombe bien, non ?"],
    ],
    sceneDone: [
      ['npc', "Ysaline t'envoie ? Bien. Assieds-toi. Non, pas là : là, dos à la mer. On ne lui tourne pas le dos impunément, mais on peut éviter de la regarder."],
      ['me', "Qu'est-ce qui chante sous le Gouffre ?"],
      ['npc', "Ce que je vais te dire, personne ne veut l'entendre : il y a quelque chose sous le Gouffre. Quelque chose d'énorme. Et ça a faim."],
    ],
  },
  encre_abysses: {
    scene: [
      ['npc', "Tu as déjà ouvert un noyé ? Moi, oui. Ils ont de l'encre dans les veines. Noire, épaisse, qui sent le fond de la mer."],
      ['me', "L'encre de la bête."],
      ['npc', "Tu comprends vite. Rapporte-m'en cinq fioles, et je te taillerai la Conque des Abysses : le seul appel auquel le Kraken répond."],
      { ask: [{ q: 'Pourquoi voudrait-on l’appeler ?', a: [['npc', "Parce qu'on ne tue pas ce qu'on attend. On tue ce qu'on fait venir, à l'heure qu'on choisit, avec les canons chargés."]] }], go: 'J’apporterai l’encre' },
    ],
    sceneDone: [
      ['npc', "Cinq fioles. Elles bougent encore, tu vois ? Elle sait que je la prends."],
      ['npc', "Voilà ta conque. Souffle dedans à bord, au-dessus du Gouffre, et il viendra. Je t'accompagnerai avec le Goéland."],
      ['me', "Merci, capitaine."],
      ['npc', "Ne me remercie pas. Remercie-moi si on en revient."],
    ],
  },
  kraken: {
    scene: [
      ['npc', "Le moment est venu. J'ai fait graisser les canons du Goéland, et Morgane a promis la Mouette Écarlate."],
      ['npc', "Prends le meilleur navire que tu trouves, des amis, du rhum et toute ta poudre. Mets le cap sur le Gouffre, et souffle."],
      ['me', "Et si on coule ?"],
      ['npc', "Alors on coulera ensemble, et on chantera sous l'eau avec les autres. Mais je n'ai pas l'intention de chanter, {nom}. Pas aujourd'hui."],
    ],
    sceneDone: [
      ['npc', "Tu l'as fait… Tu l'as vraiment fait."],
      ['me', "Le Goéland…"],
      ['npc', "Il gît au fond. Mais moi je suis vivant, et la mer se tait enfin. Écoute-la. Pour la première fois depuis des années, elle ne chante plus."],
      ['npc', "Va voir Morgane. Elle voudra entendre ça de ta bouche, pas de la mienne."],
    ],
  },
  dernier_chant: {
    scene: [
      ['npc', "Morgane a perdu son équipage à cause du Cœur de Corail, puis du Kraken qui le gardait. Elle ne le dira jamais, mais elle n'a plus dormi depuis."],
      ['npc', "Va lui dire que le Kraken est mort. Ça ne les ramènera pas. Mais ça l'aidera peut-être à fermer les yeux."],
    ],
    sceneDone: [
      ['npc', "Tu as une drôle de tête. Ce n'est pas une mauvaise nouvelle, j'espère. J'en ai eu ma part."],
      ['me', "Le Kraken est mort, Morgane. Elouan et moi, on l'a renvoyé aux abysses."],
      ['npc', "…Le Kraken. Tu as tué le Kraken."],
      ['npc', "Mon équipage… Ils peuvent se reposer, maintenant. Tous."],
      ['npc', "Prends ce trophée. On en fera une légende, et ta maison en sera le musée. Bienvenue parmi les capitaines dont on chante le nom, {nom}."],
    ],
  },
  rumeur_rade: {
    scene: [
      ['npc', "Un nom revient sur tous les quais : la Couronne des Marées."],
      ['me', "Une couronne de plus, pour un mort de plus ?"],
      ['npc', "Pas celle-là. On dit qu'elle commande à la mer… et peut-être à la Marée Morte. Si elle existe, il faut qu'elle soit entre de bonnes mains. Les nôtres, de préférence."],
      ['npc', "Un capitaine enfermé à Rade-aux-Flibustiers saurait où elle est. Va là-bas, loin à l'est, au-delà de Havre. Demande Mama Lune, au Perroquet Pendu."],
    ],
    sceneDone: [
      ['npc', "Morgane t'envoie ? Elle a toujours eu bon goût pour les ennuis. Assieds-toi, mon cœur. Tu bois quoi ? Peu importe, ce sera du rhum."],
      ['me', "On m'a parlé d'un capitaine prisonnier."],
      ['npc', "Ambroise Vif-Argent. Mon ancien capitaine. Mon ancien beaucoup de choses. Il croupit à la Geôle, et il mérite chaque jour qu'il y passe. Mais il sait des choses."],
    ],
  },
  prisonnier: {
    scene: [
      ['npc', "La Geôle, c'est la bâtisse de pierre, à l'est de la place. Va voir Ambroise."],
      ['npc', "Il va te raconter une histoire incroyable, te promettre la moitié d'un trésor et te demander de le sortir de là."],
      ['me', "Et ?"],
      ['npc', "Les deux premières choses sont fausses. La troisième, fais-la quand même. On a besoin de ce qu'il sait."],
    ],
    sceneDone: [
      ['npc', "Tiens, un visiteur ! Approchez, approchez. Ambroise Vif-Argent, capitaine. Oui, CE Vif-Argent."],
      ['me', "Jamais entendu parler."],
      ['npc', "…C'est la Geôle, ils filtrent les nouvelles. Écoutez bien : je sais où dort la Couronne des Marées. Mais pour vous le dire, il faudrait que je sois… de l'autre côté de ces barreaux."],
    ],
  },
  trousseau: {
    scene: [
      ['npc', "Le geôlier, Grosbec, a deux passions : sa clé et le rhum."],
      ['npc', "Il ne lâchera jamais la première… sauf noyé dans la seconde. Six bouteilles. Trinquez avec lui, et quand il ronflera, son trousseau sera à vous."],
      ['me', "Et je bois, moi aussi ?"],
      ['npc', "Un peu. Pour la politesse. Pas trop : j'ai besoin de quelqu'un qui tienne debout pour ouvrir une porte."],
    ],
    sceneDone: [
      ['npc', "Vous l'entendez ? Il ronfle comme un canon de 24 ! Et la clé… parfaite."],
      ['me', "On sort par la porte, alors ?"],
      ['npc', "Par la porte ? Quelle horreur. Ce serait vulgaire. Non, non : on va faire ça avec style."],
    ],
  },
  evasion: {
    scene: [
      ['npc', "Le plan est simple : vous ouvrez, je file, on se retrouve sur le quai."],
      ['npc', "S'ils demandent, vous ne m'avez jamais vu. Et s'ils insistent, dites-leur que j'étais beaucoup plus grand."],
      ['me', "Et si vous filez sans m'attendre ?"],
      ['npc', "Moi ? Je suis blessé. Profondément. …Ouvrez, s'il vous plaît."],
    ],
    sceneDone: [
      ['npc', "Libre comme l'air ! L'air de la Rade sent le poisson, mais c'est l'air de la liberté. Merci, l'ami."],
      ['npc', "Bon, maintenant les affaires sérieuses : la carte de la Couronne a été déchirée en trois. Et chaque morceau est gardé par quelque chose de très, très désagréable."],
    ],
  },
  trois_fragments: {
    scene: [
      ['npc', "Premier morceau : le Bourreau, qui pend les vivants dans la Forêt des Pendus."],
      ['npc', "Deuxième : la Reine des Sirènes, au milieu de son lagon. Troisième : le Général d'Os, au fond de sa crypte, sur l'Atoll des Ossements."],
      ['me', "Et vous, vous faites quoi ?"],
      ['npc', "Moi, je garde le quai. Quelqu'un doit bien le faire. C'est un poste très exposé, vous savez."],
    ],
    sceneDone: [
      ['npc', "Les trois morceaux ! Regardez-moi ça… la carte est complète. Magnifique."],
      ['me', "Elle mène où ?"],
      ['npc', "Patience, patience. Attendez-moi ici, je vais chercher de quoi fêter ça. Je reviens tout de suite. Promis."],
    ],
  },
  trahison: {
    scene: [
      ['npc', "Il est parti. Avec la carte. Évidemment."],
      ['npc', "Il a toujours fait ça, mon cœur : il prend ce qu'il aime et il file. Il m'a fait le coup trois fois. La quatrième, j'ai ouvert une taverne."],
      { choose: [
        { q: 'Je lui ferai payer ça.', mem: 'vif_rancune', a: [['npc', "Fais-lui payer. Mais garde-le vivant : il sait lire la carte, toi non."]] },
        { q: 'Il avait peut-être ses raisons.', mem: 'vif_pardon', a: [['npc', "Ses raisons… Tu es trop bon. C'est ce qui le perdra : il va t'aimer bien, maintenant."]] },
      ] },
      ['npc', "La carte passe par l'Île de la Quarantaine, au sud. Là-bas, il y a quelqu'un que même Ambroise ne sait pas embobiner : le Docteur Corbeau. Va voir Sœur Agathe, au camp des survivants."],
    ],
    sceneDone: [
      ['npc', "Un capitaine bavard, avec un chapeau à plume ? Oui, je l'ai vu. Difficile de le rater."],
      ['me', "Où est-il ?"],
      ['npc', "Le Docteur Corbeau l'a attrapé hier soir. Il est enfermé dans une cage, sur la place des ruines. Il chante pour garder le moral. Faux."],
    ],
  },
  docteur: {
    scene: [
      ['npc', "Le Docteur Corbeau a « soigné » toute la colonie. Il dit que la mort est un remède."],
      ['npc', "Ses bombes de peste empoisonnent l'air, ses corbeaux crèvent les yeux, et ses patients se relèvent pour le servir."],
      ['me', "Je le soignerai, moi aussi."],
      ['npc', "Avec du plomb, j'espère. Tuez-le, et libérez votre capitaine. Même s'il chante faux."],
    ],
    sceneDone: [
      ['npc', "C'est fini. La colonie peut enfin dormir. Moi aussi, peut-être."],
      ['npc', "Votre capitaine est au camp, derrière moi. Il prétend qu'il s'est laissé capturer exprès. Je vous laisse juger."],
      ['npc', "Prenez la tenue du Docteur : elle vous protégera de bien pire que la peste."],
    ],
  },
  galion: {
    scene: [
      ['npc', "Bon. Pour la carte, je peux tout expliquer : j'allais chercher du renfort."],
      ['me', "Du renfort."],
      ['npc', "…Non ? D'accord. Écoutez : la carte mène aux Brumes Éternelles, au sud-est. Le Comte Vespère y fait patrouiller son Galion Fantôme."],
      ['npc', "Coulez-le, et la route de l'Île des Damnés sera ouverte. Il vous faut un navire armé, et du courage. Moi, je fournis la carte. Et les encouragements."],
    ],
    sceneDone: [
      ['npc', "Il a coulé ! Il a vraiment coulé ! Vous êtes plus fou que moi, et ce n'est pas rien."],
      ['npc', "Tenez : un vrai navire, un brick de course. Je l'ai… emprunté. Pour vous. Maintenant, l'Île des Damnés."],
    ],
  },
  comte: {
    scene: [
      ['npc', "Vespère dort dans sa crypte, sur l'Île des Damnés, la Couronne sur la tête."],
      ['npc', "Tout ce qui vit là-bas est mort deux fois, et frappe comme un ouragan."],
      ['me', "Vous venez ?"],
      ['npc', "N'y allez pas seul. C'est la seule chose sensée que je dirai aujourd'hui. Profitez-en, ça n'arrive pas souvent."],
    ],
    sceneDone: [
      ['npc', "La Couronne des Marées… vous l'avez. Vous l'avez vraiment. Elle est plus lourde qu'on ne croit, hein ?"],
      ['me', "Elle murmure."],
      ['npc', "Elles murmurent toutes. Bon. Maintenant, la question qui fâche : qu'est-ce qu'on en fait ? Morgane voudra la briser. Moi… j'ai quelques idées. Choisissez bien."],
    ],
  },
  fin_morgane: {
    scene: [
      ['npc', "Tu l'as. Je la sens d'ici : la mer se tord autour d'elle."],
      ['npc', "Donne-la-moi. Je la briserai sur l'enclume d'Isa, et la mer gardera enfin ses morts. Plus de Marée Morte, un jour. Ce sera long, mais ce sera fini."],
      ['me', "Ambroise sera furieux."],
      ['npc', "Il s'en remettra. Il se remet de tout. C'est son seul vrai talent."],
    ],
    sceneDone: [
      ['npc', "C'est fait. Isa a frappé trois fois, et la Couronne a hurlé comme une tempête. Puis plus rien."],
      ['npc', "Écoute… la mer est plus calme, déjà. Mon équipage dort pour de bon."],
      ['npc', "Prends ce médaillon : une étincelle de la Flamme. Et cet habit, digne d'un capitaine du roi. Port-Lanterne ne l'oubliera pas, {nom}. Moi non plus."],
    ],
  },
  fin_fanfaron: {
    scene: [
      ['npc', "Donnez-la-moi. Je ne dis pas que j'en ferai bon usage. Je dis que j'en ferai un usage… intéressant."],
      ['me', "Et si vous la retourniez contre nous ?"],
      ['npc', "Contre vous ? Mon seul ami ? Jamais. Contre Morgane… non plus. Contre les ennuyeux, peut-être. Et je vous donne mon sabre et mon manteau. Si, si. Un capitaine paie ses dettes. Parfois."],
    ],
    sceneDone: [
      ['npc', "Ha ! La mer m'obéit ! Enfin, elle m'écoute. Un peu. Elle a un sale caractère."],
      ['npc', "Tenez, mon sabre et mon manteau, comme promis. Si un jour vous voyez une marée monter à l'envers, ce sera moi. Bon vent, l'ami !"],
    ],
  },
  freres_cote: {
    scene: [
      ['npc', "Tu veux entrer chez les Frères de la Côte ? Prouve que tu sais compter sur quelqu'un."],
      ['npc', "Le Fort des Deux Clés, sur la colline à l'est de la Rade. Deux dalles devant la porte : il faut un pirate sur chacune, en même temps."],
      ['npc', "À l'intérieur, Fer et Rouille, les Frères Ferrailleurs. Côte à côte, leurs armures se renvoient les coups : rien ne les blesse. Chacun de vous en attire un, loin de l'autre, et on frappe."],
      ['me', "Et seul ?"],
      ['npc', "Seul ? Impossible. C'est tout l'intérêt."],
    ],
    sceneDone: [
      ['npc', "Vous l'avez fait. À deux, comme les anciens. Les Ferrailleurs ont rouillé pour de bon."],
      ['npc', "Bienvenue chez les Frères de la Côte. Portez cette tenue et cette bague : partout dans l'archipel, on saura qu'on peut compter sur vous."],
    ],
  },
  chant_lagon: {
    scene: [
      ['npc', "Tu entends ? Non, bien sûr. Le jour, elles se taisent. La nuit, les sirènes du lagon chantent, et nos pêcheurs ne reviennent pas."],
      ['me', "Qu'est-ce qu'on peut faire ?"],
      ['npc', "Rapporte-moi six de leurs écailles. On en fera des amulettes qui bouchent les oreilles. Le lagon est à l'est, au-delà de la Rade. Et toi, bouche-toi les oreilles en y allant."],
    ],
    sceneDone: [
      ['npc', "Six écailles. Elles chantent encore, tu entends ? Tout bas."],
      ['npc', "Plus pour longtemps. Merci, pirate. Les pêcheurs dormiront mieux ce soir."],
    ],
  },
  reine_lagon: {
    scene: [
      ['npc', "Les écailles ne suffisent pas. Tant que leur Reine chante, elles reviendront. Toujours."],
      ['npc', "Elle se tient sur l'îlot au nord du lagon. Sa voix fait tomber les marins à l'eau comme des fruits mûrs."],
      ['me', "Alors je ne l'écouterai pas."],
      ['npc', "Personne ne l'écoute. On l'entend, c'est tout. Fais-la taire."],
    ],
    sceneDone: [
      ['npc', "Le lagon s'est tu. Pour la première fois depuis ma naissance, la nuit est silencieuse."],
      ['npc', "Prends cette parure : je l'ai cousue avec les écailles. Elle soigne les blessures… et elle te va bien."],
    ],
  },
  os_ermite: {
    scene: [
      ['npc', "Un visiteur ! Ne marchez pas sur la ligne, là. Si, celle-là. C'est ma barrière."],
      ['me', "Une barrière… en os ?"],
      ['npc', "Les morts n'aiment pas marcher sur les morts. Enfin, je crois. Ça fait vingt ans que je crois, et je suis toujours vivant : ça doit marcher."],
      ['npc', "Rapportez-m'en huit, de l'Atoll des Ossements, au sud-ouest. Des os de légionnaire : ce sont les plus disciplinés, ils restent bien en ligne."],
    ],
    sceneDone: [
      ['npc', "Huit ! Superbe. Regardez comme ils s'alignent. Des soldats, même morts."],
      ['npc', "Tenez, ma vieille tenue des sables. Je ne la mets plus : il n'y a plus de sable ici, il n'y a que des crabes."],
    ],
  },
  remedes: {
    scene: [
      ['npc', "Vous avez vu les médecins de peste ? Leurs masques à bec ?"],
      ['npc', "Ils sont bourrés d'herbes et de plumes. C'est ce qui les protège du mal qu'ils répandent. Ironique, non ?"],
      ['me', "Vous voulez leurs masques ?"],
      ['npc', "Ce qu'il y a dedans. Rapportez-moi plumes et herbes : je ferai des masques pour les derniers survivants. Ils sont onze. Ils étaient deux cents."],
    ],
    sceneDone: [
      ['npc', "Merci. Ces masques sauveront des vies. Onze vies, c'est peu. C'est tout ce qui reste."],
      ['npc', "Prenez de quoi vous réchauffer. La nuit est longue ici, et froide."],
    ],
  },
  soie_pendus: {
    scene: [
      ['npc', "Vous avez des épaules faites pour mes coupes, très cher. Mais pas le tissu qui va avec."],
      ['npc', "La plus belle soie de l'archipel pend aux arbres de la Forêt des Pendus. Avec les pendus au bout, malheureusement."],
      ['me', "Et ils se laissent faire ?"],
      ['npc', "Non. C'est pour ça que je ne m'en occupe pas moi-même. Huit coupons, et je vous coudrai une tenue qui se fond dans la brume."],
    ],
    sceneDone: [
      ['npc', "Divine. Touchez-moi ça : on dirait du brouillard tissé."],
      ['npc', "Tenez : la tenue des Brumes. Personne ne vous verra venir. Sauf moi, qui l'ai cousue."],
    ],
  },
  forge_brasier: {
    scene: [
      ['npc', "J'ai entendu une histoire, dans la fumée de ma forge. Les golems de Cendrelune auraient un cœur de lave qui bat encore."],
      ['me', "Et vous voulez ce cœur."],
      ['npc', "Deux. Avec ça, et six braises éternelles, je peux tremper un acier que rien ne perce. Je te forgerai une armure de conquistador. Une vraie, pas celles qui rouillent sous la pluie."],
    ],
    sceneDone: [
      ['npc', "Regarde-moi ce métal. Il chante sous le marteau. Tu l'entends ?"],
      ['npc', "Voilà ton armure : un plastron et un morion comme on n'en fait plus. Comme on n'en a jamais fait, d'ailleurs."],
    ],
  },
  coeur_volcan: {
    scene: [
      ['npc', "Les golems ne sont que des étincelles. Leur père dort au fond du volcan."],
      ['npc', "Le Brasier. Il martèle une forge que personne n'a bâtie, et chaque coup fait trembler Cendrelune."],
      ['me', "Et si je l'éteins ?"],
      ['npc', "Alors Cendrelune se taira, et moi j'aurai le meilleur feu de l'archipel : celui que tu me rapporteras sur tes vêtements."],
    ],
    sceneDone: [
      ['npc', "Tu as éteint le Brasier ? Toi ? Seul, ou presque ?"],
      ['npc', "Par ma barbe… je n'en ai pas, mais par celle de mon père : tu es une légende. Les apprentis vont parler de toi pendant des générations."],
    ],
  },
  marchandise: {
    scene: [
      ['npc', "Psst. Vous. Oui, vous, avec la tête de quelqu'un qui sait se taire."],
      ['npc', "Un client cherche un coffret à bijoux. N'importe lequel. Vous savez où on en trouve : chez les autres."],
      ['me', "C'est du vol."],
      ['npc', "C'est du commerce, avec une étape en moins. Rapportez-m'en un, et je paie le double de ce qu'il vaut. La Capitainerie n'aime pas ça, alors ne vous faites pas prendre."],
    ],
    sceneDone: [
      ['npc', "Charmant. Charmant. Je n'ai rien vu, vous n'avez rien vu."],
      { choose: [
        { q: 'Si vous avez d’autres commandes, je suis là.', mem: 'receleur_associe', a: [['npc', "Voilà qui me plaît. Nous allons faire de grandes choses ensemble. Discrètement."]] },
        { q: 'C’était la première et la dernière fois.', mem: 'receleur_unefois', a: [['npc', "Ils disent tous ça. Hé hé. On se reverra."]] },
      ] },
      ['npc', "Et voici votre or."],
    ],
  },
  naufrageur: {
    scene: [
      ['npc', "Vous avez un navire ? Avec des canons ? Alors vous êtes exactement ce que je cherche."],
      ['npc', "Les Bricks des Noyés canonnent tout ce qui flotte, au nord et à l'ouest de l'archipel. Mes clients n'osent plus prendre la mer."],
      ['me', "Combien ?"],
      ['npc', "Trois. Visez la ligne de flottaison : un brick qui prend l'eau ne tire plus."],
    ],
    sceneDone: [
      ['npc', "Trois ! La mer respire. Mes clients aussi."],
      ['npc', "Tenez, une vraie tenue de corsaire. Vous la méritez. Et vous avez l'air d'un corsaire, maintenant. Presque."],
    ],
  },
  fregates: {
    scene: [
      ['npc', "Les bricks, c'était l'échauffement. Les frégates maudites tiennent le sud."],
      ['npc', "Elles tirent en bordée, trois boulets à la fois. Il faut virer vite, et frapper par l'arrière."],
      ['me', "Combien ?"],
      ['npc', "Encore trois. Et je vous offre une couleuvrine de ma collection. Ma préférée. Enfin, la deuxième."],
    ],
    sceneDone: [
      ['npc', "Vous êtes la terreur des mers, maintenant. Ou des morts, plutôt."],
      ['npc', "Prenez la couleuvrine. Elle était ma préférée, en fait. Ne le dites à personne."],
    ],
  },
  chasse_damnee: {
    scene: [
      ['npc', "L'Île des Damnés. Les morts y sont morts deux fois, et ils frappent comme un mât qui tombe."],
      ['npc', "Les Frères de la Côte y vont à plusieurs, jamais seuls. Jamais."],
      ['me', "Qu'est-ce que vous voulez ?"],
      ['npc', "La preuve de dix damnés et de cinq molosses. Et que tu reviennes. Surtout que tu reviennes."],
    ],
    sceneDone: [
      ['npc', "Tu en reviens vivant ? Alors tu es un vrai Frère."],
      ['npc', "Prends cette essence. Avec, la forge fait des miracles. Isa saura quoi en faire."],
    ],
  },
  lib_grand_feu: {
    scene: [
      ['npc', "Grand-Feu. Leur capitaine. Il hante la Baie, une lanterne à la main, et il attire les navires sur les récifs."],
      ['npc', "Il a noyé mon second, il y a trente ans. Le premier d'une longue liste."],
      ['me', "Je l'éteindrai."],
      ['npc', "Pour de bon. Pas comme les autres fois. Pour de bon."],
    ],
    sceneDone: [
      ['npc', "Il est mort ? Vraiment mort ? …Pour de bon ?"],
      ['me', "Sa lanterne s'est éteinte dans l'eau."],
      ['npc', "Trente ans que j'attendais ça. Prenez ce chapeau. Il était à mon second, le premier que Grand-Feu ait noyé. Il aurait aimé que ce soit vous qui le portiez."],
    ],
  },
  lib_reine_mangrove: {
    scene: [
      ['npc', "Les contrebandiers avaient une protectrice. Une noyée couronnée de racines, qui boit la marée."],
      ['npc', "On l'appelle la Reine de la Mangrove. Une seule reine suffit à cette île."],
      ['me', "Isaure sait que vous parlez comme ça ?"],
      ['npc', "Isaure sait beaucoup de choses. Pas celle-là. Allez."],
    ],
    sceneDone: [
      ['npc', "Une reine de moins. Ne le répétez pas à Isaure, elle pourrait mal le prendre."],
      ['npc', "Prenez ces antidotes : vous en aurez besoin si vous retournez là-bas. Et vous y retournerez, je le sens."],
    ],
  },
  lib_ballade: {
    scene: [
      ['npc', "La ballade de Libertalia n'a jamais été finie. Le poète est mort au milieu du dernier couplet. D'une chope, dit-on."],
      ['npc', "Il paraît que le dernier vrai couplet est gravé dans le temple de la Jungle Écarlate."],
      ['me', "Et vous voulez que j'aille le lire ?"],
      ['npc', "Le lire, le retenir, chasser les goules qui le gardent, et revenir me le chanter. Faux, s'il le faut. Je corrigerai."],
    ],
    sceneDone: [
      ['me', "« …et la cité qui choisit ses chefs ne craindra plus ni roi ni mort. »"],
      ['npc', "…Il est beau, ce couplet. Plus beau que tout ce que j'avais imaginé."],
      ['npc', "Je le chanterai ce soir. Prenez ce collier : c'est le cadeau d'un capitaine qui m'aimait. Il est mort. Le collier, non."],
    ],
  },
};

// les personnages se souviennent : q:quête terminée, m:choix retenu, a:haut fait — la première ligne qui s'applique peut remplacer le salut
export const REMEMBER = {
  morgane: [
    ['q:a3_fin_apaiser', "Les noyés ne reviennent presque plus. La mer se vide, doucement. C'est toi, n'est-ce pas ? Je le sens."],
    ['q:a3_fin_brasier', "La mer a brûlé une nuit entière. Je n'avais jamais rien vu d'aussi beau ni d'aussi terrible. Mon équipage était dedans, je crois. Merci."],
    ['q:fin_morgane', "La mer est calme depuis que tu m'as confié la Couronne. Je dors, maintenant. Merci, {nom}."],
    ['q:fin_fanfaron', "Tu as laissé la Couronne à Ambroise… Je ne te juge pas. Enfin, un peu. Les marées montent à l'envers, ces temps-ci."],
    ['q:dernier_chant', "Mon équipage dort pour de bon, grâce à toi. Je n'oublierai pas, Capitaine."],
    ['m:matelots_noms', "Jehan, Pol, la petite Maëlle… Tu t'en souviens ? Moi, chaque soir. Merci de t'en souvenir aussi."],
    ['q:maree_morte', "Capitaine {nom}. Je ne me lasse pas de le dire."],
    ['m:origine_naufrage', "Tu as encore la tête de quelqu'un qui a nagé trop longtemps, {nom}. Repose-toi, de temps en temps."],
    ['m:origine_fuite', "Celui que tu fuyais n'est pas venu te chercher ici. Pas encore. Je garde un œil sur le quai."],
    ['m:origine_tresor', "Alors, ce trésor ? Tu le cherches toujours, ou c'est lui qui te cherche ?"],
  ],
  bartholome: [
    ['m:rhum_goute', "Ah, le goûteur ! Il manquait deux doigts dans mon tonnelet, mais tu as été honnête. Ça se respecte. Et ça se boit."],
    ['m:rhum_intact', "Pas une goutte, hein ? Menteur. Mais un menteur poli. J'aime bien les menteurs polis."],
  ],
  gaspard: [
    ['q:a3_fin_apaiser', "Elle respire, ta Flamme. Chaque soir je viens la regarder, et chaque soir elle est plus douce."],
    ['q:a3_fin_gardien', "Gardien. Tu as les yeux de quelqu'un qui sent chaque mort partir vers la mer. Je connais ce regard. Repose-toi, un peu."],
    ['q:a3_fin_brasier', "Une braise, là où brûlait la Flamme… On la rallumera. Toi et moi, on la rallumera. Et la mer est vide, enfin."],
    ['m:gaspard_pardon', "Tu m'as pardonné. Je n'arrive toujours pas à le faire moi-même. Mais j'essaie, grâce à toi."],
    ['m:gaspard_colere', "Tu as eu raison d'être en colère. Je compte toujours. Chaque nuit."],
    ['q:oeil_guetteur', "Depuis le phare, je vois l'Île au Crâne. Silencieuse. C'est toi, ça."],
    ['q:os_lanterne', "La Flamme brûle plus haut depuis que tu l'as nourrie. Elle te reconnaît, tu sais."],
  ],
  isa: [
    ['q:coeur_volcan', "La légende du Brasier ! Les apprentis ne parlent que de toi. Ils font des dessins. Ils sont moches, mais ils sont sincères."],
    ['q:acier_duel', "Elle tient toujours son fil, ma rapière ? Montre… Non, laisse, je te crois."],
  ],
  elouan: [['q:kraken', "On a coulé le Goéland, toi et moi. Et on a gagné quand même. Ça valait un navire."]],
  ysaline: [['q:traversee', "Ta barque tient toujours ? Corentin demande de tes nouvelles. Il dit que tu es son meilleur client. Tu es son seul client vivant."]],
  rosalie: [['q:grotte', "Regarde mes cristaux, ils brillent encore. La salle est pleine tous les soirs, grâce à toi."]],
  mama_lune: [
    ['m:vif_rancune', "Tu lui en veux toujours, à Ambroise ? Moi aussi. On a de la rancune pour deux, mon cœur."],
    ['m:vif_pardon', "Tu lui as pardonné. Tu es meilleur que nous deux réunis. Ce n'est pas difficile, remarque."],
  ],
  vif_camp: [
    ['q:fin_fanfaron', "La mer m'écoute, grâce à vous. Hier, j'ai fait monter la marée pour rien. Juste pour voir. C'était magnifique."],
    ['q:fin_morgane', "Vous l'avez donnée à Morgane. Je comprends. Je boude, mais je comprends."],
    ['m:vif_rancune', "Vous me regardez encore comme ça… Je vous l'ai dit : j'allais chercher du renfort !"],
    ['m:vif_pardon', "Mon ami ! Mon seul ami. Enfin, le seul qui me pardonne. Ce qui revient au même."],
  ],
  receleur: [
    ['m:receleur_associe', "Mon associé préféré ! J'ai peut-être une autre commande… Non ? Une autre fois, alors."],
    ['m:receleur_unefois', "Vous ici ? Je croyais que c'était la dernière fois. Hé hé. Elles reviennent toutes, les dernières fois."],
  ],
  agathe: [['q:docteur', "La colonie dort enfin. Je prie pour vous chaque soir. Ne riez pas, ça marche peut-être."]],
  maelys: [['q:reine_lagon', "Les pêcheurs rentrent tous, maintenant. Chaque soir, je les compte. Il n'en manque aucun."]],
  kerbrat: [['q:freres_cote', "Un Frère de la Côte ! Toujours bienvenu à ma table."]],
  maitre_fosse: [
    ['a:champion_fosse', "Le Champion ! La Fosse gronde rien qu'à te voir entrer."],
    ['a:gladiateur', "Dix vagues, et debout. Les gradins parlent encore de toi."],
  ],
  gardien_geole: [['a:potence', "Encore vous ? Je vous avais gardé votre paille. Elle est encore tiède."]],
  capitaine_brisemer: [['q:lib_grand_feu', "Trente ans, et c'est vous qui l'avez éteint. Je bois à votre santé chaque soir."]],
  celeste: [['q:lib_ballade', "Je chante votre couplet tous les soirs. Les gens pleurent. Enfin, ceux qui ont bu."]],
};

// les clés de mémoire possibles (le serveur refuse les autres)
import { ACTE3 } from './acte3.js';
export const MEM_KEYS = new Set();
const walk = (steps) => { for (const s of steps || []) if (s && s.choose) for (const c of s.choose) { if (c.mem) MEM_KEYS.add(c.mem); walk(c.a); } else if (s && s.ask) for (const a of s.ask) walk(a.a); };
for (const q of Object.values(OLD_SCENES)) { walk(q.scene); walk(q.sceneDone); }
for (const q of Object.values(ACTE3)) { walk(q.scene); walk(q.sceneDone); for (const g of q.goals) walk(g.scene); }
