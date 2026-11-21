// 1.8 : les gens du nouveau Port-Lanterne. Chaque marchand vend des objets qui existent déjà, au même prix qu'ailleurs
// (aucune économie nouvelle) ; la charpentière répare et arme les navires avec les systèmes existants ; le capitaine du
// port et le conteur parlent. Les trois derniers ne sont là que pendant un événement du port (ev).
export const PORT_NPCS = {
  charpentiere_pl: {
    name: 'Ondine Varangue', title: 'Maîtresse charpentière du chantier', repair: 1,
    look: { skin: 2, hair: 1, hairStyle: 'queue', top: 'tablier', topCol: 'brown', pants: 'navy', boots: 'brown', hat: 'bandana', hatCol: 'orange' },
    greet: ['Une coque, ça se soigne comme un vieux chien : un peu de brai, beaucoup de patience.', 'Attention aux copeaux, et à vos doigts !', 'La coque sur la cale ? Trois mois qu’on la radoube. Elle repartira, foi d’Ondine.'],
    shop: ['radeau', 'barque', 'sloop'],
    topics: [
      { q: 'Que fait-on ici ?', a: "On radoube, on calfate, on remplace les bordages que les morts ont mâchés. Ramenez votre navire au quai de Port-Lanterne : je répare les coques, et je vous l'arme à quai quand vous voulez." },
      { q: 'Et cette coque, sur la cale ?', a: "La Fille-du-Vent. Un brick qui a rencontré un récif et un kraken la même semaine. Les membrures tiennent ; il lui manque encore la moitié de ses bordages en bas." },
    ],
  },
  poissonniere_pl: {
    name: 'Margot Écaille', title: 'Poissonnière de la halle',
    look: { skin: 1, hair: 3, hairStyle: 'long', top: 'tablier', topCol: 'white', pants: 'brown', boots: 'black', hat: 'foulard', hatCol: 'teal' },
    greet: ['Sardines ! Sardines de la nuit, encore frétillantes !', 'Il est frais mon poisson. Il a vu la lune, mais il est frais.', 'Ne tâtez pas, vous l’abîmez.'],
    shop: ['sardine', 'poisson_grille', 'brochette_crabe', 'canne_peche'],
    topics: [{ q: 'Où pêcher ?', a: "Au bout de la jetée des pêcheurs, à l'ouest du quai, l'eau est profonde et calme. Une canne, de la patience : le reste, c'est la mer qui décide." }],
  },
  cartographe_pl: {
    name: 'Ambroise Plume-Sèche', title: 'Cartographe',
    look: { skin: 0, hair: 4, hairStyle: 'court', beard: 1, beardCol: 4, top: 'manteau', topCol: 'purple', pants: 'black', boots: 'black', hat: 'plume', hatCol: 'purple' },
    greet: ['Une carte est un mensonge que l’on finit par croire. Les miennes mentent moins.', 'Ne touchez pas l’encre : elle n’est pas sèche. Elle ne l’est jamais.'],
    shop: ['longue_vue', 'conque_rappel', 'carte_dechiree'],
    topics: [
      { q: 'Que voit-on des belvédères ?', a: "Du belvédère du phare, toute la rade et les navires qui arrivent du Levant. Du belvédère du Couchant, la prairie et la jungle. Une longue-vue y est fixée : servez-vous, elle ne mord pas." },
      { q: 'Une carte du port ?', a: "Le quai de pierre au sud, la jetée des pêcheurs et le chantier à l'ouest, le quai du Levant à l'est : c'est là qu'accostent les marchands. Les échoppes sont sur la Grand-Rue, la taverne au nord de la place." },
    ],
  },
  voiliere_pl: {
    name: 'Hortense Grand-Largue', title: 'Voilière et tailleuse',
    look: { skin: 3, hair: 2, hairStyle: 'queue', top: 'chemise', topCol: 'white', pants: 'navy', boots: 'brown', hat: 'paille' },
    greet: ['Une voile, une chemise : c’est le même point, en plus grand.', 'Les pirates déchirent tout. C’est bon pour le commerce.'],
    shop: ['tenue_mousse', 'tenue_boucanier', 'bandana', 'chapeau_paille', 'tricorne'],
    topics: [{ q: 'Une tenue, ça sert à quoi ?', a: "À ne pas ressembler à un noyé, déjà. Et une bonne tenue protège : regardez ses qualités avant d'acheter. Pour les tenues de capitaine, il faudra voir les tailleurs de la Rade et de Libertalia." }],
  },
  epiciere_pl: {
    name: 'Zélie Poivre', title: 'Épicière',
    look: { skin: 2, hair: 5, hairStyle: 'long', top: 'gilet', topCol: 'orange', pants: 'brown', boots: 'brown', hat: 'foulard', hatCol: 'orange' },
    greet: ['Biscuit de mer, galettes, fruits du jour : de quoi tenir jusqu’au prochain port.', 'Le poivre ? Plus cher que l’or. Les biscuits, eux, sont donnés. Presque.'],
    shop: ['banane', 'noix_coco', 'galette_coco', 'tarte_baies', 'biscuit_mer'],
    topics: [{ q: 'Que prendre pour un voyage ?', a: "Du biscuit de mer : il ne pourrit jamais, il casse les dents, mais il nourrit. Et des bananes pour le moral. Les blessures, elles, se soignent mieux près de la Flamme." }],
  },
  tonnelier_pl: {
    name: 'Gildas Cercle-de-Fer', title: 'Tonnelier',
    look: { skin: 0, hair: 0, hairStyle: 'chauve', beard: 2, beardCol: 1, top: 'tablier', topCol: 'brown', pants: 'black', boots: 'black' },
    greet: ['Un bon tonneau garde le rhum, l’eau et les secrets.', 'Écoutez-le sonner : un tonneau qui sonne creux, c’est un tonneau vide. Ou un tonneau volé.'],
    shop: ['tonneau_deco', 'caisse_deco', 'grog', 'rhum'],
    topics: [{ q: 'Pour qui travaillez-vous ?', a: "Pour Bartholomé, pour la Douane, pour tous les capitaines qui ont soif. Les tonneaux de décoration ? Pour votre maison du quartier des Corsaires : c'est plus joli qu'un mur nu." }],
  },
  cordier_pl: {
    name: 'Mathurin Chanvre', title: 'Maître cordier',
    look: { skin: 1, hair: 4, hairStyle: 'hirsute', beard: 2, beardCol: 4, top: 'chemise', topCol: 'brown', pants: 'brown', boots: 'brown', hat: 'bonnet', hatCol: 'brown' },
    greet: ['Trois cents brasses de chanvre, tressées à la main. Sentez-moi ça.', 'Un nœud mal fait, et c’est le mât qui part. Ou le pendu qui reste.'],
    topics: [
      { q: 'Quel nœud apprendre d’abord ?', a: "La chaise. Elle tient, elle se défait, elle sauve un homme à la mer. Le nœud de cabestan ensuite. Le reste, c'est de la coquetterie de gabier." },
      { q: 'Pourquoi une corderie si longue ?', a: "Parce qu'on y tresse en marchant à reculons, sur toute la longueur du cordage. La mienne fait toute la ruelle : je marche jusqu'au phare, et je reviens." },
    ],
  },
  maitre_port: {
    name: 'Hilaire Brisant', title: 'Capitaine du port de Port-Lanterne',
    look: { skin: 1, hair: 4, hairStyle: 'court', beard: 1, beardCol: 4, top: 'capitaine', topCol: 'navy', pants: 'white', boots: 'black', hat: 'tricorne', hatCol: 'navy' },
    greet: ['Bienvenue au port. Amarrez proprement, et gardez vos canons au repos.', 'Les marchands du Levant accostent ici, au quai de l’est. Quand ils sont là, on cherche des bras.', 'Le registre du port ? Il dit qui arrive, qui part, et qui ne revient pas.'],
    topics: [
      { q: 'Que se passe-t-il au port ?', a: "De tout, et pas tous les jours : un marchand du Levant qui accoste et qu'il faut décharger — je paie les porteurs —, un colporteur sur la place, un crieur qui annonce une expédition, un équipage qui embarque, et parfois un voleur que le guet poursuit. Ouvrez l'œil." },
      { q: 'Comment aider au déchargement ?', a: "Quand un navire marchand est à quai, prenez une caisse sur la pile du quai du Levant (E), et portez-la au dépôt, devant la Douane. Trois caisses par navire et par porteur : je ne paie pas les gens qui dorment sur la pile." },
      { q: 'Où armer mon navire ?', a: "À la bitte d'amarrage du quai, ou auprès d'Ondine, au chantier naval, à l'ouest. Elle répare aussi les coques." },
    ],
  },
  conteur_pl: {
    name: 'Le vieil Achille', title: 'Conteur de la cour',
    look: { skin: 3, hair: 4, hairStyle: 'long', beard: 2, beardCol: 4, top: 'manteau', topCol: 'brown', pants: 'black', boots: 'brown', hat: 'bonnet', hatCol: 'red' },
    greet: ['Approche, approche. Le feu est chaud, et les histoires sont gratuites.', 'Celle-là, je ne l’ai jamais racontée. Enfin, jamais deux fois de la même façon.'],
    topics: [
      { q: 'L’histoire de la Flamme', a: "Quand Port-Lanterne n'était qu'un ponton et trois cabanes, une veuve a allumé un feu sur la grève pour que son homme retrouve la côte. Il n'est jamais revenu. Mais le feu, lui, n'a jamais voulu s'éteindre : on a bâti la ville autour." },
      { q: 'L’histoire du phare', a: "Le Vieux Gaspard dit qu'il l'a vu construire. Gaspard dit beaucoup de choses. Ce qui est sûr, c'est que son faisceau chasse les ombres : les noyés détestent la lumière qui tourne." },
      { q: 'L’histoire de la Sirène Borgne', a: "Elle chantait faux, elle avait un œil de verre, et elle a épousé Bartholomé. Les marins disent qu'on l'entend encore, les nuits de pleine lune, quand le rhum est trop vieux. Moi, je dis que c'est Bartholomé qui chante." },
    ],
  },
  crieur_pl: {
    name: 'Barnabé la Trompe', title: 'Crieur du port', ev: 'annonce',
    look: { skin: 0, hair: 1, hairStyle: 'court', top: 'manteau', topCol: 'red', pants: 'black', boots: 'black', hat: 'tricorne', hatCol: 'red' },
    greet: ['OYEZ, OYEZ ! Une expédition se prépare !', 'OYEZ ! Écoutez bien, je ne le dirai que trois fois ! Enfin, tant qu’on m’écoute.'],
    topics: [],
  },
  colporteur_pl: {
    name: 'Ulysse Mille-Poches', title: 'Colporteur de passage', ev: 'colporteur',
    look: { skin: 2, hair: 6, hairStyle: 'hirsute', beard: 1, top: 'gilet', topCol: 'green', pants: 'brown', boots: 'brown', hat: 'plume', hatCol: 'green' },
    greet: ['Des babioles de sept mers ! Tout est vrai, rien n’est cher, je repars ce soir.', 'Un perroquet qui jure ? Un collier qui porte chance ? Approchez !'],
    shop: ['collier_coquillages', 'chaton', 'perroquet_vert', 'fumigene', 'des_pipes', 'carte_dechiree'],
    topics: [{ q: 'D’où venez-vous ?', a: "De partout, et je n'y retourne jamais. Je fais le tour de la place, je vends ce que j'ai, et le vent décide du reste." }],
  },
  negociante_pl: {
    name: 'Dame Céleste Loinvent', title: 'Négociante du Levant', ev: 'navire',
    look: { skin: 1, hair: 2, hairStyle: 'long', top: 'manteau', topCol: 'teal', pants: 'white', boots: 'black', hat: 'plume', hatCol: 'teal' },
    greet: ['Mon navire repart à la prochaine marée. Profitez-en.', 'Rhum de quinze ans, soupe de tortue des îles du Levant : ce qui se fait de mieux, et rien de moins.'],
    shop: ['rhum_vieux', 'soupe_tortue', 'longue_vue', 'collier_coquillages'],
    topics: [{ q: 'Que transportez-vous ?', a: "Du rhum, des épices, des étoffes, et des nouvelles. Les caisses vont à la Douane : si vous avez des bras, le capitaine du port paie les porteurs." }],
  },
};
