# Refonte de Port-Lanterne — livraison (version 1.8.0)

L'audit et le plan sont dans `rapports/pl1-audit-plan.md`. Ce rapport dit ce qui a été fait, comment on l'a vérifié,
et ce qui reste.

## 1. Les modifications

### La méthode : ne rien casser autour

- Toute la refonte est construite **en tout dernier** dans la génération du monde (`shared/port-world.js`), après le
  braquage, le festival et le mobilier. Conséquences :
  - aucun tirage aléatoire déjà fait ne change ;
  - les décors, les portes et les pièces existants gardent leurs numéros (les coffres, les portes secrètes trouvées et
    les maisons des sauvegardes restent valables) ;
  - le reste de l'archipel est identique case par case à la 1.6.1, sol, zones et mer navigable compris.
- Port-Lanterne n'a pas bougé :
  - son centre (la Flamme, 150,96), la Sirène Borgne, la forge et les maisons sont à leur place ;
  - les six parcelles des Corsaires (achetées par les joueurs), la Douane, la Demeure et la Mouche d'Or (le braquage)
    aussi ;
  - de même la plage de la fête, le quai d'amarrage des navires (147,127) et les 16 PNJ de quête.
- La ville grandit vers l'ouest (sur la prairie et la plage, jusqu'au carrefour du Couchant), vers l'est (le Levant) et
  sur l'eau (le quai de pierre).
- La zone sûre passe de 1 908 à 3 445 cases.

### Les quartiers

| Quartier | Ce qu'on y trouve |
|---|---|
| A. Le grand port | quai de pierre continu de 45 cases (dalles, margelle, mur sur l'eau profonde), 8 bittes d'amarrage, 3 grues (une au Levant), aires de chargement, 3 étals de la halle aux poissons ; la jetée des pêcheurs, des barques amarrées et deux barques qui rament dans la baie ; le quai du Levant pour les navires marchands ; la capitainerie |
| B. La place de la Flamme | agrandie (rayon 7,3 au lieu de 5,6), quatre accès larges et dégagés, deux étals de plus, des bancs, des jardinières, un panneau d'annonces, des réverbères aux coins |
| C. Le quartier de la taverne | la terrasse (trois tables, lanternes rouges), la cour des conteurs et son feu ; dans la Sirène Borgne, une table de plus (donc plus d'habitués le soir), la table de dés, deux lanternes, des tonneaux en perce, un tapis |
| D. La Grand-Rue | la porte du Couchant (une arche de bois à l'enseigne du phare) ; la Voilerie Grand-Largue, le Cabinet du Cartographe, le Comptoir de Zélie (épicerie), la Tonnellerie Cercle-de-Fer, la Corderie du Levant ; chacune sa façade, son enseigne peinte, son comptoir dehors et sa marchandise |
| E. Le quartier des Ravaudeuses | maisons à étage et à balcon, venelles, potagers, linge, un puits, une clôture |
| F. Le chantier naval | un brick en radoub sur la cale (membrures nues, échafaudage, échelle, accores, seau de brai), l'atelier, la cour (établi, cabestan, planches, ancre) ; la charpentière répare les coques et arme les navires |
| G. Les hauteurs | le belvédère du phare (terrasse, longue-vue, banc, muret sur le vide, escalier) et le belvédère du Couchant |

### Graphisme

- Les façades réutilisent le générateur de bâtiments existant, avec sept styles nouveaux : voilerie, cartographe,
  épicerie, tonnellerie, corderie, maison, maison haute.
- Six enseignes peintes nouvelles : voile, carte, épices, tonneau, cordage, poisson.
- Vingt décors nouveaux, dessinés pixel par pixel dans la même facture que le reste (`client/render/sprites-port.js`) :
  - pour le port : bittes, grues (trois variantes), caisses, tonneaux, étals de poisson, séchoirs à filets, cabestan ;
  - pour la ville : la coque en radoub, le panneau d'annonces, les jardinières, les tables de terrasse, les comptoirs
    d'échoppe (quatre marchandises), les rouleaux de toile, les potagers ;
  - pour les hauteurs : la longue-vue, le muret, les escaliers, l'arche du Couchant.
- Le sol du quai (`client/render/terrain.js`) :
  - le bord reste droit au lieu d'onduler ;
  - un mur de pierres taillées descend dans l'eau, avec sa ligne d'algues et son ombre ;
  - le dessus est en dalles, avec une margelle.
- Les navires du port passent par le moteur de rendu des vrais navires : le navire marchand, les barques, l'équipage
  qui embarque. À quai, voiles ferlées et mâts droits.

### Les habitants et la vie

- **12 habitants nommés** (`shared/data/npcs-port.js`) :
  - Ondine Varangue, la charpentière : elle répare, arme les navires et vend radeaux, barques et sloops ;
  - Margot Écaille, la poissonnière ; Ambroise Plume-Sèche, le cartographe ; Hortense Grand-Largue, la voilière ;
    Zélie Poivre, l'épicière ; Gildas Cercle-de-Fer, le tonnelier ;
  - Mathurin Chanvre, le cordier ; Hilaire Brisant, le capitaine du port (il explique le port et ses événements) ; le
    vieil Achille, le conteur (trois histoires de Port-Lanterne) ;
  - trois personnages de passage : le crieur, le colporteur et la négociante du Levant.
  - Toutes les boutiques ne vendent que des objets qui se vendaient déjà ailleurs, au même prix : le test le vérifie,
    il n'y a pas d'économie nouvelle.
- **Les habitants anonymes** : 26 au lieu de 15. Trois rôles se renforcent :
  - les dockers, aux grues et aux piles de caisses ;
  - les pêcheurs, au bord du quai de pierre et sur la jetée ;
  - les artisans, au chantier, à l'établi et au séchoir.
  Les comptoirs et les étals de poisson sont tenus par leurs marchands nommés.
- **Ce qui était déjà en place reste en place** : les PNJ loin du joueur ne bougent pas (au-delà de 900 × 700 px),
  le metteur en scène des bulles et les scènes de conversation.
- **Doublon supprimé** : à Port-Lanterne, l'ancien voleur et l'ancien recruteur locaux (propres à chaque joueur) sont
  retirés. Le calendrier du port, commun à tous, les remplace.

### Les événements du port (`shared/port-events.js`, `client/port.js`, `server/port.js`)

- **Le calendrier** :
  - un créneau toutes les 4 minutes du monde ; un sur trois reste calme, et la nuit presque toujours ;
  - jamais deux fois de suite le même ;
  - chaque sorte a ses heures ;
  - pendant la Nuit des Mille Voiles (quatre jours sur sept), la musique, le colporteur et le voleur laissent la place
    à la fête.
  - Le calcul se fait sur l'heure du monde, que le serveur et chaque client connaissent déjà : **aucun message réseau
    de plus** pour voir les événements.

| Événement | Ce qui se passe | Interactif |
|---|---|---|
| Navire marchand | un galion arrive du large, accoste au Levant, des dockers portent les caisses jusqu'à la Douane, la négociante vend ses marchandises, le navire repart | oui : prendre une caisse sur la pile (E), la porter au dépôt : 12 doublons ; 3 par navire et par pirate ; caisse perdue si le navire repart ou si l'on s'éloigne |
| Colporteur | il fait le tour de la Flamme avec des haltes, crie sa marchandise | oui : sa boutique, seulement pendant son passage |
| Voleur | un larcin à l'étal, puis la course par la Grand-Rue jusqu'au Couchant, le guet derrière | oui : le pirate qui lui barre la route l'arrête (30 doublons), et tout le monde en ville le voit arrêté au même endroit |
| Crieur | il annonce une expédition qui désigne un vrai lieu de l'archipel | oui : on peut lui parler pendant l'annonce |
| Bagarre | deux clients se battent devant la Sirène Borgne, des badauds, le guet sépare | à regarder |
| Départ d'un équipage | quatre matelots descendent de la taverne à la jetée, une barque prend le large | à regarder |
| Radoub | trois charpentiers au travail autour du brick : coups de maillet, copeaux | à regarder |
| Musiciens | deux musiciens près de la Flamme, des danseurs, une gigue douce quand on est près | à regarder |
| Dispute | une cliente et une poissonnière marchandent à la halle | à regarder |

Le serveur valide tout ce que font les joueurs : distance à la pile et au dépôt, plafond, arrêt du voleur décidé par
lui seul, présence des personnages de passage pour parler et acheter. La sauvegarde ne change pas de forme.

### L'apparition (`server/port.js`)

- Avant, il n'y avait qu'un seul point (150,98) : tous les nouveaux pirates et tous les morts revenaient au même pixel.
- Maintenant :
  - 24 points, choisis autour de la Flamme, à deux cases au moins les uns des autres, hors des grands passages (avenue
    du port, Grand-Rue, rue du Levant, rue des Corsaires, l'étal d'où file le voleur) ;
  - chaque arrivée prend un point libre au hasard parmi ceux qui sont à plus de 40 px de tout autre pirate, sinon le
    plus dégagé ;
  - si tous sont pris, elle se pose à côté, à 16 px au moins de quiconque, en ville, jamais dans un passage ;
  - la praticabilité est revérifiée à chaque fois (une construction a pu pousser) ;
  - une ancienne sauvegarde restée au vieux point unique, ou dans un mur neuf, repart d'un point libre ; ailleurs, elle
    est gardée telle quelle.
- Une commande de développement `port <etat | sorte>` (console développeur, autorisation côté serveur) montre le
  calendrier ou saute au prochain événement d'une sorte.

## 2. Les fichiers

**Nouveaux**

- `shared/port-world.js`
- `shared/port-events.js`
- `shared/data/npcs-port.js`
- `server/port.js`
- `client/port.js`
- `client/render/sprites-port.js`
- `tests/t_port18.mjs`
- `rapports/pl1-audit-plan.md`, `rapports/pl2-livraison.md`, `rapports/captures/pl-*.jpg`

**Modifiés**

- Monde :
  - `shared/world.js` : les types de décors et l'appel à la refonte en fin de génération ;
  - `shared/data/npcs.js` : les nouveaux habitants.
- Serveur :
  - `server/game.js` : apparition, présence des personnages de passage, messages, tour ;
  - `server/dev.js` : la commande `port`.
- Client :
  - `client/main.js` (branchement, interaction E, personnages de passage) ;
  - `client/townsfolk.js` (rôles et lieux d'activité) ;
  - `client/evenements.js` (plus de doublon à Port-Lanterne) ;
  - `client/render/renderer.js` (navires du port, caisse portée) ;
  - `client/render/terrain.js` (le quai) ;
  - `client/render/sprites-env.js` et `client/render/sprites-cite.js` (enseignes et styles de façades).
- Tests et données :
  - `tests/t_monde90.mjs` et `tests/fixtures/monde-1.6.1.json` : le garde-fou, adapté à la ville ;
  - `tests/t_secu10.mjs` : la version.
- Version et documents : `shared/constants.js`, `package.json`, `README.md`.

## 3. Les problèmes trouvés et corrigés pendant la refonte

- **Un tonneau posé dans la taverne murait Rosalie** derrière son comptoir. Le garde-fou l'a détecté ; le tonneau a été
  déplacé.
- **Les navires qui quittaient le quai d'amarrage vers l'ouest s'échouaient.** Trois causes :
  - la tête en T de la jetée des pêcheurs ;
  - la case du pied de la Mouette Écarlate, devenue infranchissable ;
  - une goélette décorative au mouillage.

  Trois tests de navigation l'ont détecté. Corrections : la jetée est raccourcie, l'emprise des grands navires est
  rendue telle qu'elle était, et la goélette est retirée. Le chenal est libre et les tests repassent.
- **Le trésor de la pointe du phare (une épreuve du festival) était noyé** par le creusement du quai du Levant.
  Corrigé : on ne creuse plus au nord de la case 101.
- **Les navires ne pouvaient plus accoster contre le mur du quai.** Ils pouvaient se faire placer dans la poche entre le
  quai et la tête du ponton, d'où l'on ne ressort pas. Les deux rangées d'eau le long du mur sont désormais
  non navigables.
- **Une jardinière bloquait l'entrée ouest de la place** (un pirate qui marchait vers la Grand-Rue s'y arrêtait).
  Retirée. Plus rien n'est posé au milieu des quatre accès.
- **À 20 joueurs**, deux tests ont révélé deux défauts de l'apparition : certains se posaient sur le même point, d'autres
  au milieu d'un passage. Corrigé : l'anneau des points est plus large et le choix est réglé à part quand la place est
  pleine.
- **Un pirate apparu sur l'étal arrêtait le voleur avant qu'il ne parte.** Corrigé : il faut lui barrer la route, et
  l'étal n'est plus un point d'apparition.
- **Le même événement revenait parfois deux créneaux de suite.** Corrigé : la suite des créneaux est calculée une fois
  depuis l'origine des temps du monde, à l'identique partout.
- **Les morts de la plage apparaissaient dans les nouveaux quartiers.** Huit points d'apparition de la Plage des Os
  Blanchis sont reculés plus à l'ouest. La plage reste grande (de x 37 à x 111), avec le même nombre de monstres.

## 4. Les tests et leurs résultats

**Automatiques** (`npm test`) : **34 suites, toutes OK**, dont la nouvelle `t_port18` (43 vérifications) :

- les quartiers et les bâtiments ;
- les habitants définis, sur des cases praticables, sans objet nouveau à vendre ;
- le quai continu et son mur ;
- les points d'épreuve du festival et du braquage praticables ;
- aucun mort en ville ;
- barque, sloop, brick et galion accostent au quai d'amarrage ;
- tous les trajets des événements praticables ;
- le calendrier varié, jamais deux fois de suite le même, déterministe, avec la règle de la fête ;
- **20 nouveaux pirates** : tous sur une case praticable, jamais à moins de 25–36 px l'un de l'autre (selon le tirage),
  20 places différentes, aucun dans un passage ;
- **20 pirates revenus de la mort en même temps** : même résultat ;
- les anciennes sauvegardes : vieux point, mur neuf, plage ;
- le déchargement : distance, plafond de 3, une autre porteuse, caisse perdue au départ du navire, aucun gain sans
  caisse ;
- le voleur : arrêté par celui qui lui barre la route, payé une fois, annoncé aux autres ;
- le crieur et le colporteur présents seulement pendant leur événement ;
- la poissonnière qui vend ;
- la charpentière qui arme et répare ;
- la sauvegarde inchangée.

**Garde-fou du monde** (`t_monde90`, adapté et durci) :

- hors du rectangle de la ville :
  - sol, zones et mer navigable identiques à la 1.6.1 ;
  - aucune case libre devenue bloquante ;
- dedans :
  - les parcelles des joueurs à la case près ;
  - chaque PNJ, chaque porte et chaque coffre dans un espace praticable ;
  - les 24 points d'apparition praticables ;
  - deux générations identiques.

Navigation (`t_nav12`, `t_ships11`), festival (`t_festival60`), braquage (`t_braquage50`), sauvegardes et migrations
(`t_save10`, `t_migration80`) : OK.

**Dans un vrai navigateur, sur le vrai serveur Node, à trois** (un développeur et deux pirates ordinaires) : toutes les
vérifications sont OK.

- Trois arrivées à trois places différentes.
- Alpha marche au clavier jusqu'à la Grand-Rue ; le développeur fait venir le voleur. Alpha l'arrête, il est payé, et
  Bravo le sait. Le voleur est au même pixel chez les deux (2262,1578).
- Le navire marchand est au même pixel chez les deux (2912,1668).
- Devant la pile, l'invite dit « [E] prendre une caisse » ; E met une caisse sur l'épaule ; au dépôt, E la livre
  (+12 doublons).
- Aucune erreur de page.
- Captures : `pl-mp-voleur-alpha.jpg`, `pl-mp-voleur-bravo.jpg`, `pl-mp-caisse.jpg`.

**Les neuf événements forcés un par un dans le navigateur** : tous actifs, avec leurs figurants, leurs navires et leurs
personnages de passage, sans aucune erreur. Captures : `pl-ev-*.jpg`.

**Performance** (mesurée, même machine, même scénario, avant/après) :

| | 1.7.0 | 1.8.0 |
|---|---|---|
| Rendu à Port-Lanterne, jour (moyenne / 95e centile) | 3,2 / 5,0 ms | 4,6 / 6,3 ms |
| Images par seconde | 60 | 60 |
| Tas JavaScript | 30 Mo | 32 Mo |
| Une parcelle de terrain (moyenne) | 42,7 ms | 36 à 40 ms (dans le bruit de mesure) |

Serveur, 20 pirates tous en ville pendant un événement :

| Événement | Tour moyen | Pire tour | Réseau par pirate | Messages par pirate |
|---|---|---|---|---|
| Navire marchand | 0,77 ms | 6,4 ms | 10 Ko/s | 23/s |
| Voleur | 0,45 ms | — | 9,7 Ko/s | — |
| Musiciens | 0,35 ms | — | 8,9 Ko/s | — |

- Le budget d'un tour est de 50 ms.
- Le réseau vient des 19 autres pirates visibles : les événements n'ajoutent qu'un message par voleur arrêté et un par
  caisse prise ou posée.
- 20 pirates répartis dans l'archipel : 1,39 ms par tour.

**Ce qui n'a pas été testé**

- Pas d'essai humain.
- Pas de vrai réseau distant : les clients et le serveur tournaient sur la même machine.
- Pas de mesure du rendu avec 20 vrais navigateurs affichés en même temps (trois au plus).

## 5. Ce qui reste, honnêtement

- **Pas de nouveaux intérieurs.** Les échoppes, la capitainerie et le chantier sont des façades : leurs marchands
  tiennent boutique dehors, devant leur comptoir. Seule la Sirène Borgne a été enrichie dedans.
- **Pas d'enfants, ni de chiens.** Seuls les chats existaient déjà. Le moteur des personnages n'a pas de corps d'enfant,
  et je n'ai pas voulu en bricoler un à l'échelle non entière.
- **La caisse portée d'un autre pirate ne se voit que de près.** Elle passe par les événements de proximité, comme les
  coups ; un pirate loin du quai ne la voit pas.
- **Pas de navire décoratif de plus au mouillage.** La goélette essayée barrait le chenal de sortie du port. Le port
  garde :
  - la Mouette Écarlate et la Mouche d'Or ;
  - le brick en radoub et les barques ;
  - le galion du Levant, quand il accoste ;
  - les navires des joueurs.
- **La plage centrale reste nue hors édition.** Elle reste dégagée pour les stands de la Nuit des Mille Voiles. Hors
  édition, il n'y a qu'une barque retournée, un séchoir, des filets et un banc.
- **Le rendu de la ville coûte 1,4 ms de plus par image.** Il y a plus de façades, de réverbères et d'habitants.
  On reste à 60 images/s, mais c'est la première chose à surveiller sur une petite machine.
- **La musique de la place est une petite gigue de synthèse.** Comme tout le son du jeu, elle est faite en code : ce
  n'est pas un morceau composé.
