# Marée Morte

MMORPG 2D vu de dessus, en pixel art, sur le thème **pirates contre zombies**.
Tout le graphisme et le son sont générés par le code : aucune image ni fichier audio externe.

L'archipel de Port-Lanterne est maudit. Le Capitaine Barbe-Cendre a volé le Cœur de Corail
et, chaque nuit, la Marée Morte relève les noyés. Seule la Flamme Bénite, sur la place du port,
tient les morts à distance.

## Contenu de la version 0.1

- **Monde** : une île de 192 × 144 tuiles avec 8 zones (Port-Lanterne, plage, prairie, jungle,
  ruines du temple, marais, cimetière, crique de l'épave), rivière, ponts, quais, phare,
  navire pirate amarré, épave, 7 coffres au trésor. Cycle jour/nuit de 16 minutes, avec
  éclairage dynamique, faisceau du phare, brume, lucioles et feux follets.
- **Combat** : sabre (clic gauche), armes à feu (clic droit), roulade d'esquive invulnérable,
  et 4 compétences débloquées par niveau (Tourbillon, Rasade de rhum, Bombe, Cri d'abordage).
- **Ennemis** : crabes putrides, matelots zombies, boucaniers, goules, noyés, squelettes
  canonniers (à distance), et le boss **Capitaine Barbe-Cendre** (invocations et tirs de canon).
- **Objets** : plus de 130 objets (armes, pistolets, fusils, chapeaux, manteaux, bottes,
  talismans, nourriture, rhum, matériaux), raretés, équipement visible sur le personnage.
- **Quêtes** : 8 quêtes enchaînées (parler, tuer, collecter, explorer) jusqu'au boss, plus 4 primes répétables.
- **PNJ** : Capitaine Morgane, Isa la forgeronne (boutique), Bartholomé le tavernier (boutique),
  le vieux Gaspard, Léon le mousse, et Coco le perroquet.
- **Interface** : création du pirate, inventaire avec équipement, journal de quêtes, boutiques,
  dialogues, chat, minimap, carte.

## Version 2.0.0 : les lieux du Plus Grand Braquage, reconstruits

Les huit lieux de la grande quête sont redessinés comme de vrais lieux, d'après un plan écrit pour chacun
(`shared/heist-decor.js`). Chaque meuble a sa place et son emprise, et le décor mural est choisi mur par mur : rien
n'est plus tiré au hasard. Les mécaniques, les chiffres et les sauvegardes ne changent pas.

- **La demeure de Valdorne** : sept pièces distinctes (le grand salon, le vestibule, l'office, le salon de jeu, la
  galerie à alcôves, les archives, le cabinet). Chacune a son sol, ses murs et son mobilier : cheminée de marbre sous
  le portrait du maître, lustres, estrade des musiciens, buffet, vitrines, statue, coffre central.
- **Le quartier** : la demeure monte au-dessus d'une cour d'honneur close (parterres, allée de lanternes, fontaine,
  terrasse sur la baie), derrière un portail gardé sur la rue des Corsaires. Les maisons des joueurs ne bougent pas.
- **La réception vit** :
  - neuf groupes qui parlent chacun de leur sujet, des invités qui changent de groupe ;
  - des domestiques qui font leur tournée, les musiciens, le majordome, le portier ;
  - des réactions au pirate, à la bagarre et à l'alarme.
- **L'entrepôt de la Douane** est organisé en zones : rayonnages, îlots de stockage, saisies, allée de manutention, quai
  de chargement, bureau du receveur.
- **L'atelier de Lafleur** devient une vraie pièce : table à dessin, maquette de la demeure, plans, trappe dans le
  plancher. **La cave** est faite de pierre humide, avec un casier à vin et la bouche d'égout des crabes.
- **Les toits** : cinq toitures différentes, des cheminées fumantes, des lucarnes, une terrasse, une passerelle ; les
  façades vues des ruelles ; quatre ruelles nommées avec leur cour et leur puits.
- **La Mouche d'Or** : un vrai pont de navire, avec mâts et gréement, dunette, barre, bastingage, et la mer tout autour.
- **Le moteur** : des sols et des murs par pièce, une couche au-dessus des personnages (lustres, gréement, linge), la
  lumière du ciel sur les toits et le pont, des sons par lieu. Les gardes contournent murs et meubles.
- **Les vérifications** :
  - `t_lieux20` (nouveau) vérifie les accès, les passages, les figurants, les rondes, la poursuite, le pont et les
    sauvegardes ;
  - `t_monde90` liste les sept rectangles redessinés et vérifie que le reste du monde n'a pas bougé d'une case ;
  - rapport détaillé dans `rapports/br2-livraison.md`.

## Version 1.9.1 : Port-Lanterne remis d'aplomb

- **Les badauds du festival** se tenaient dans l'eau, sur l'ancienne jetée devenue eau profonde avec le port de la
  1.8. Ils regardent désormais la mer depuis le quai de pierre. Les flâneurs ne traversent plus les murs.
- **Les habitants** ne longent plus le bord du quai les pieds dans l'eau. Leurs postes de travail et leurs places sont
  toujours sur la terre ferme, et ils contournent l'eau en longeant la rive.
- **Plus de rue sous un bâtiment.**
  - Des tracés anciens passaient sous des maisons : la rue du nord dans la maison aux volets bleus, les allées des deux
    maisons du sud à travers leur propre emprise, une rangée sous l'Entrepôt de la Douane.
  - Les rues les contournent maintenant ; la route des parcelles ne passe plus sous les toits de la tonnellerie et de la
    corderie.
  - Les bâtiments n'ont pas bougé : portes, intérieurs et sauvegardes sont identiques.
- `t_port18` vérifie désormais qu'aucune rue ne passe sous les 26 bâtiments du port et qu'aucun personnage n'a les pieds
  dans l'eau.

## Version 1.9.0 : la refonte des navires

Les navires de la 1.1 gardent leurs postes et leur physique ; tout ce qui les entoure est repris.

- **À la barre, tout l'essentiel** (mode simplifié, celui par défaut) :
  - ZQSD : la direction voulue ; Espace et Maj : un cran de toile en plus ou en moins ; X : jeter ou lever l'ancre ;
  - voiles ferlées, la direction tenue fait ramer l'équipage, pour accoster ou se dégager d'un quai.
- **L'équipage compte** (mode équipage, qui marche en même temps) :
  - aux drisses, un pirate hisse la toile deux fois plus vite et la règle mieux (+7 % de vitesse) ;
  - au cabestan, l'ancre se lève bien plus vite, et plus encore à plusieurs (l'équipage invisible est plus lent) ;
  - à l'établi du charpentier, on répare en mer.
- **La marche au vent dépend du gréement** :
  - les voiles carrées (brick, galion, Veuve) filent vent arrière et peinent au près ;
  - les voiles auriques (sloop, goélette) remontent au vent ;
  - le Spectre s'en moque presque ;
  - personne n'est arrêté net face au vent.
- **Les dégâts touchent trois parties** :
  - la coque : à moins d'un cinquième, la voie d'eau s'aggrave au combat et alourdit le navire ;
  - la voilure : la vitesse baisse ;
  - le gouvernail : la barre répond mal.
  - L'établi répare en mer, le gouvernail d'abord, puis la toile, puis la coque jusqu'à 80 % ; le chantier fait le reste.
- **Chaque modèle a son dessin** :
  - le flanc peint rangée par rangée : liston, sabords et leurs mantelets, préceinte, fenêtres de poupe, carène cuivrée
    ou goudronnée, usure ;
  - un bastingage en relief, plus haut sur les châteaux ;
  - une figure de proue ;
  - le gréement : voile au tiers de la barque, aurique et foc du sloop, brigantine du brick, deux focs de la goélette,
    trois étages et artimon latin du galion et de la Veuve, haillons du Spectre ;
  - un pont propre à chacun.
- **On voit les combats** : boulets en cloche avec leur ombre, nuage de la bordée, gerbe quand on manque, trous sur le
  pont, fumée puis flammes, toile déchirée, mât brisé, gouvernail qui bat ; le naufrage est progressif et laisse des
  débris qui flottent.
- **Ça vit** : la houle, plus forte dans l'orage, les haubans qui ondulent, les fanaux qui se balancent, les remous du
  virage, la gerbe d'étrave ; des matelots travaillent à bord et lâchent parfois une phrase.
- **La vie à bord** : un banc pour s'asseoir, la table des cartes, la longue-vue de la vigie, l'établi.
- **Les couleurs du navire** (pavillon, voiles, liston, fanaux) sont gratuites, vues de tous et gardées. Elles ne changent
  rien à la marche.
- **Les fiches des navires** comparent la vitesse, la marche au près, la manœuvre, la coque, les canons, les postes, les
  forces et les faiblesses. Aucun navire n'en écrase un plus cher en tout.
- **Le tableau de bord** montre :
  - les trois états et la voie d'eau ;
  - un compas avec le cap, le vent et, tout autour, la marche du navire à chaque cap ;
  - la voilure demandée, l'ancre, les canons qui rechargent ;
  - qui tient quel poste, quand on est plusieurs.
  - Ses aides s'effacent quand on sait faire ; le bouton « ? » les rappelle.
- Les sauvegardes ne changent pas de forme : les couleurs sont un champ facultatif. Le protocole réseau reste le 15 :
  les champs nouveaux s'ajoutent en fin de ligne.
- Détail, mesures et limites : `rapports/nv1-audit.md` et `rapports/nv2-livraison.md`.

## Version 1.8.0 : la refonte de Port-Lanterne

Le port de départ devient la vitrine de l'archipel. La ville ne bouge pas : elle grandit autour de la Flamme, de la
Sirène Borgne et du quartier des Corsaires.

- **Le grand port** :
  - un quai de pierre continu de la halle aux poissons jusqu'au Levant, avec sa margelle, son mur sur l'eau, des bittes
    d'amarrage, deux grues, des aires de chargement, des étals de poisson ;
  - la jetée des pêcheurs, avec des barques amarrées et deux autres qui rament dans la baie ;
  - le quai du Levant, où accostent les navires marchands, et sa capitainerie.
- **La place de la Flamme** : agrandie, avec quatre accès larges, deux étals de plus, des bancs, des jardinières et un
  panneau d'annonces.
- **Le quartier de la taverne** :
  - une terrasse et la cour des conteurs, autour du feu du vieil Achille ;
  - dans la Sirène Borgne : une table de plus, la table de dés, des lanternes et des tonneaux en perce.
- **La Grand-Rue** et ses échoppes : voilerie, cartographe, épicerie, tonnellerie, corderie. Chacune a sa façade, son
  enseigne, son comptoir dehors et son marchand.
- **Le quartier des Ravaudeuses** : maisons variées, venelles, potagers, linge et puits.
- **Le chantier naval** : un brick en radoub sur la cale, l'échafaudage et l'atelier. La charpentière y répare les coques
  et arme les navires (les systèmes existants).
- **Les hauteurs** : les belvédères du phare et du Couchant, avec leurs longues-vues, et l'arche de la porte du Couchant.
- **12 habitants nouveaux** :
  - les marchands ne vendent que des objets qui existaient déjà, au même prix ;
  - le capitaine du port et le conteur ne vendent rien : ils racontent ;
  - trois personnages de passage n'apparaissent que pendant un événement.
- **Les événements du port** suivent un calendrier calculé sur l'heure du monde : tout le monde voit la même chose au
  même moment, sans message réseau de plus.
  - Interactifs : le navire marchand (on décharge des caisses contre quelques doublons), le colporteur, le voleur (le
    pirate qui lui barre la route l'arrête), le crieur.
  - À regarder : la bagarre devant la taverne, l'équipage qui embarque, le radoub, les musiciens, la dispute à la halle.
  - Un créneau sur trois reste calme ; pendant la Nuit des Mille Voiles, la musique, le colporteur et le voleur laissent
    la place à la fête.
- **L'apparition** :
  - 24 points autour de la Flamme, hors des grands passages ;
  - on prend le plus dégagé des autres pirates, et l'on ne se pose jamais sur quelqu'un, même à 20 ;
  - une ancienne sauvegarde dans un mur neuf repart d'un point libre.
- **Les garde-fous** :
  - hors du rectangle de la ville, le sol, les zones et la mer navigable sont identiques case par case à la 1.6.1 ;
  - les parcelles des joueurs n'ont pas bougé ;
  - les sauvegardes ne changent pas de forme.
- Détail, mesures et limites : `rapports/pl1-audit-plan.md` et `rapports/pl2-livraison.md`.

## Version 1.7.0 : le monde vivant, livré (lots 7 à 10)

- Les pas suivent la vitesse : plus de pieds qui glissent, chez le joueur, les monstres et les habitants. Les
  morts-vivants respirent aussi à l'arrêt.
- Les ombres suivent le soleil (à gauche le matin, longues et douces le soir, presque effacées la nuit), et les halos
  des flammes s'étalent au sol en ovale au lieu d'être des disques.
- Un tutoriel plus discret, et des annonces qui laissent passer le titre de la zone.
- Tests de livraison : 33 suites, deux joueurs sur le vrai serveur, changement d'hôte, festival complet, combat, quatre
  résolutions, 60 images/s partout.
- Bilan du dossier « Monde vivant » (améliorations, ressources, lieux, systèmes, critères, limites) :
  `rapports/mv10-livraison.md`.

## Version 1.6.5 : des villes qui vivent, des lieux qui sonnent (lots 5 et 6)

- **Des métiers** :
  - les marchands tiennent leur étal, les clients vont d'un étal à l'autre ;
  - les dockers portent des caisses, les pêcheurs pêchent au bord du quai, les artisans travaillent ;
  - le guet tient son poste puis fait sa ronde, les voyageurs arrivent par la route et vont à l'auberge ;
  - le soir, on se retrouve devant la taverne.
- **Des conversations qui se répondent**, choisies selon le lieu, l'heure, les métiers, la pluie ou le festival : une
  ou deux scènes à la fois, des silences, jamais la même deux fois de suite. Port-Lanterne, le soir, passe de 25 à 6
  bulles par minute.
- **Des sons propres à chaque lieu**, tous générés par le code : oiseaux, mouettes, grillons, grenouilles, bois qui
  grince, feu qui crépite, gouttes, cloche lointaine. La pluie fait taire les oiseaux, et les lieux morts restent
  silencieux.
- **Le vent dans les drapeaux et le linge.**
- **Des événements rares**, sans marqueur : une cargaison renversée, un voleur poursuivi par le guet (barrez-lui la
  route !), un recruteur sur le quai, une prise qui frétille, un navire inconnu au loin.
- Rapports : `rapports/mv5-vie-des-lieux.md`, `rapports/mv6-ambiance-evenements.md`.

## Version 1.6.4 : des ateliers et des quais habités (lot 4)

- Onze nouveaux meubles, dessinés par le code selon la charte : foin, sacs de grain, planches, alambic, seau, meule,
  tabouret, cordage, filet à sécher, casier à homards.
- La forge, l'armurerie, les écuries, les chantiers, l'apothicairerie et la capitainerie se reconnaissent à leur
  mobilier.
- Les quais de cinq villes gardent quelques traces de vie, posées au sol (rien ne bloque).
- Rapport : `rapports/mv4-architecture-mobilier.md`.

## Version 1.6.3 : des paysages plus naturels (lot 3)

- Plus de bords en escalier : les raccords entre les sols deviennent de vraies diagonales et ondulent entre deux sols
  où l'on marche. Les collisions ne bougent pas.
- Chaque région a son sol : prairie plus douce, jungle sombre, collines sèches, jungle rougie, mangrove boueuse…
- Une herbe plus calme et plus fine, des brins, de la litière de feuilles, de l'herbe morte, une laisse de mer.
- Les plaques de roche deviennent des champs de blocs en relief, et les arbres varient (un sur deux en miroir).
- Rapport : `rapports/mv3-environnements.md`.

## Version 1.6.2 : vers un monde vivant (lots 1 et 2)

Début du dossier « Finalisation du monde et de la direction artistique ».

- **Audit** : 33 zones et 90 pièces inventoriées, une fiche de traitement par lieu, la vie des villes mesurée, la
  charte graphique (grille, échelle entière, contours, palettes par matériau, lumière, animation, interface, effets).
  Rapport : `rapports/mv1-audit-charte.md`.
- **Fondations** :
  - la longue-vue garde des pixels nets ;
  - une surcouche de vérification (`?vue=1`, puis F9) montre grille, collisions, ancrages, routines des habitants,
    lumières et coût du rendu ;
  - un garde-fou automatique empêche les prochains lots de déplacer l'ancien monde ou de murer quoi que ce soit.

  Rapport : `rapports/mv2-fondations.md`.

## Version 1.6.1 : la livraison validée

Le dernier lot du dossier global : tout le projet est revérifié et livré.

- Les tests : 32 suites, le vrai serveur Node avec deux navigateurs, le changement d'hôte, la navigation, quatre
  tailles d'écran, la performance, le braquage et le festival en entier.
- La migration de vraies sauvegardes des versions 0.7.1, 0.8.1, 1.1.1 et 1.5.0, sans aucune perte, et le retour en
  arrière.
- Deux corrections :
  - un pirate tout neuf fait d'abord son tutoriel, avant la scène d'accueil du festival ;
  - le test de charge mesure de nouveau un vrai serveur.
- Procédure de déploiement et de retour en arrière, tests détaillés, état de la musique et des assets, problèmes
  restants : `rapports/lot8-validation.md`.

## Nouveautés de la version 1.6 : la Nuit des Mille Voiles

Chaque semaine, du jeudi midi au lundi midi (UTC), Port-Lanterne fait la fête sur la plage des Os Blanchis :
fanions, lampions, une scène et ses musiciens, des stands, une foule qui danse. Mira Bellécume, l'organisatrice, vous
accueille. Tout se joue seul, rien n'est nécessaire pour progresser, et la plage est une zone sûre pendant la fête.

- **Cinq épreuves**, chacune avec un tampon dans le carnet du festival :
  - le **Concours de canonniers** : 45 secondes pour toucher les cibles qui dérivent dans le port ;
  - la **Chasse au trésor** de la grand-mère Bellécume : quatre indices dans la ville, puis un cadenas à symboles ;
  - le **Défi des tavernes** avec Barnabé : les dés, la mémoire des chopes, les réflexes au « Tirez ! » ;
  - le **Parcours du gabier** : des quais au chrono, avec des tonneaux qui roulent, une bôme, la corde et le grand
    mât ;
  - le **Duel des capitaines** dans la Lice, contre un champion ou un autre pirate : on se relève toujours, rien ne
    se perd.
- **La Course des Mille Voiles** :
  - un cotre de location pour chacun ;
  - huit bouées, des courants, du vent, une nappe de brume et des épaves ;
  - trois équipages rivaux, et personne ne bloque personne ;
  - un faux départ coûte dix secondes.
- **Le spectacle de chaque soir** : le discours de Mira, des feux d'artifice et une foule qui danse. Rien n'est
  imposé : on regarde, on danse, on tire ses propres fusées.
- **Des jetons**, à dépenser au comptoir de Zéphyrine. Vingt parures : voiles et pavillons pour son navire, tenues,
  émotes, guirlandes de lampions, titres. Il y a aussi un **classement de la semaine**, récompensé, et **quatre
  secrets**.
- **Trois éditions qui tournent** (Lampions, Mouettes, Étoiles), avec chacune ses règles et une parure exclusive.
- **Quatre thèmes musicaux**, générés par le code (il n'existe aucun fichier audio) : « Port-Lanterne en fête »,
  « Les épreuves », « Mille Voiles » et « La fête ne finit jamais ».
- Détail, durées mesurées, tests et limites : `rapports/lot6-mille-voiles.md`.

## Nouveautés de la version 1.5 : le Plus Grand Braquage de Port-Lanterne

Une quête exceptionnelle, du niveau 18 au niveau 21, seul ou jusqu'à cinq. Silas Virevent, à la Sirène Borgne,
propose l'affaire dès le niveau 17.

- **Les préparatifs, chacun par plusieurs chemins.**
  - Deux uniformes à l'entrepôt de la Douane : se faufiler, assommer un douanier par derrière, ou se battre. Les
    gardes ont un regard, une lueur de lanterne au sol ; le soupçon monte avant l'alerte.
  - Le plan de la demeure, chez l'architecte Corvin Lafleur : le soudoyer, lui rendre service (sa cave aux crabes),
    ou crocheter le tiroir de son bureau quand il a le dos tourné.
  - La clé du coffre, à la ceinture du comptable Anatole Bréchet : le battre aux dés, tricher avec des dés pipés,
    lui faire les poches, ou le provoquer pour qu'il sorte en oubliant son manteau.
  - En groupe, ce qu'un compagnon réussit compte pour tous.
- **La demeure d'Octave Valdorne**, le soir de la vente : une réception animée, une galerie gardée, la salle des
  archives. Trois manières d'y arriver, qui pèsent sur la suite sans jamais bloquer :
  - l'uniforme (infiltration) ;
  - la bagarre du capitaine Ferrant (manipulation) ;
  - la force.
- **La trahison.** Dans le coffre, le registre de Valdorne : le dernier nom est celui de Silas. Il prend tout et file
  par la fenêtre. On choisit tout de suite : le poursuivre, récupérer la carte, ou détruire le registre.
- **La poursuite.** Silas court vraiment sur les toits et saute les ruelles. On le suit par les toits, par les
  ruelles ou par la ville. S'il atteint La Mouche d'Or avant vous, son équipage vous attend.
- **Le combat sur le pont de La Mouche d'Or**, en trois phases :
  - le duel : éventail de tirs, esquive, fente, poudre aveuglante ;
  - le pont en feu : barricades, barils de poudre, hommes de main, canons pour faire sauter les barricades ;
  - la rapière seule : Silas tente de fuir en chaloupe.
- **Trois fins, qui s'excluent :**
  - **tout garder** : doublons, la carte, la liste, titre « Le Casse du Siècle » ;
  - **dénoncer Silas** : la Rapière de Valdorne et l'estime des marchands ; mais les pirates de la liste deviennent
    vos ennemis et vous tendent des embuscades hors des zones sûres ;
  - **faire équipe**, si Silas a confiance en vous : titre « Complice de Virevent », la route secrète de l'île aux
    Sept Courants et sa contrebande.
- **Sept scènes** (moteur de la 1.4) et **neuf thèmes musicaux**, générés par le code : il n'existe aucun fichier
  audio.
- Détail, durées mesurées et estimées, limites honnêtes : `rapports/lot5-braquage.md`.

## Nouveautés de la version 1.4 : les cinématiques mises en scène

- **Un moteur de cinématiques réutilisable** (`client/cinema.js`, scripts dans `shared/data/cinemas.js`).
  - Caméra : travellings, plans fixes, suivi d'un personnage, coupes, et zooms par paliers entiers (les pixels
    restent nets ; le passage d'un palier à l'autre est adouci).
  - Personnages : ils marchent, se tournent, s'assoient et se lèvent, saluent, lancent une pièce, se penchent vers
    un objet ; des émotions s'affichent au-dessus de leur tête.
  - Mise en scène : bandes noires, fondus au noir, sous-titres, bulles, titres, étalonnage, vignette d'un gros plan,
    objets posés sur une table, plans d'un autre lieu que celui du joueur.
  - Son : un thème par scène, des fondus musicaux, des silences, des bruitages synchronisés.
- **Confort.** On passe une scène avec Échap ou le bouton « Passer ». Réglage « Effets réduits » : plans coupés
  au lieu des travellings et des zooms, ni tremblement ni vignette, fondus courts. Caméra, zoom, commandes,
  musique, personnages et interface sont toujours rendus : à la fin, si l'on passe la scène, si l'on quitte le lieu,
  si l'on meurt, si l'on se reconnecte, ou si une étape échoue.
- **En ligne, c'est le serveur qui décide.** Il lance la scène (en entrant dans un lieu, ou depuis une conversation),
  une seule fois par personnage. Pendant la scène, le spectateur ne peut ni frapper ni être frappé, et les monstres
  l'ignorent. La protection tombe à la fin, au premier geste, à la déconnexion, ou au plus tard après une durée fixée.
  Une scène de groupe se joue pour les compagnons présents ; qui arrive en retard ne la voit pas.
- **Silas Virevent** attend désormais à la table isolée de la Sirène Borgne, près de la cheminée (dès le niveau 10).
  - La première fois qu'on entre, une scène : il joue avec une pièce, vous remarque, vous fait signe, se lève et
    vient vous parler. Il propose une affaire ; on accepte ou on refuse, et il s'en souvient.
  - Si l'on accepte, « Où en est l'affaire ? » joue la préparation : le plan, les uniformes et la clé sur sa table,
    puis le quartier des Corsaires où vit Octave Valdorne.
  - La quête « Le Plus Grand Braquage » elle-même est arrivée en 1.5 (voir plus haut).
- **La taverne vivante.** Des habitués attablés dans les tavernes et les auberges, plus nombreux le soir.
- **Neuf identités musicales** pour le braquage, dont le leitmotiv de Silas. Comme toute la musique du jeu, elles
  sont générées par le code : il n'existe aucun fichier audio. Un vrai enregistrement pourra remplacer chacune
  (`Sfx.musicFile`). Le cahier des charges est dans `rapports/lot4-cinematiques.md`.

## Nouveautés de la version 1.3 : la qualité, mesurée

- **Les 81 quêtes** sont jouées de bout en bout par un pirate de test, avec les vrais mécanismes du jeu.
  - « Marchandise discrète » devient faisable en solo : les flibustiers des collines de la Rade portent des
    coffrets à bijoux.
  - « Les épreuves de la Fosse » se terminent dans la Fosse, en tenant cinq vagues.
  - « Le roi qui dort sous la mer » a sa conversation.
- **Quatre boss ont un vrai combat.**
  - La Reine de la Mangrove boit la marée : frappez-la pour l'interrompre.
  - Grand-Feu allume un anneau de fausses lumières qui n'a qu'une brèche.
  - Le Roi sans Couronne lance ses décrets en croix et une spirale d'éclats.
  - Les cloches de Gradlon vident l'air de vos poumons.
- **Plus de combats bloqués.**
  - Les Frères Ferrailleurs ne sont invincibles côte à côte que face à plusieurs pirates.
  - Un boss entraîné hors de son repaire y retourne sans guérir.
- **Équilibrage.**
  - Une quête faite avec beaucoup d'avance rapporte moins d'expérience, et c'est affiché.
  - Les tromblons sont ramenés à leur juste mesure.
  - Le coup critique compte dans la normalisation des armes.
- **Lisibilité.**
  - Les zones dangereuses se fondent dans le décor. Le jour, une ombre teintée sur le sol et un fin liseré en
    pointillés ; la nuit, une lueur discrète de braises. Elles se raffermissent doucement à l'approche du coup
    (1.3.1).
  - Un signal sonore prévient quand une zone vous vise.
  - L'interface tient en 1024 × 768.
  - L'ambiance suit le volume des effets.

## Nouveautés de la version 1.2 : partir en mer sans se perdre, et un atelier de test

- **Partir depuis la barre seule.** À la barre, Z ou Espace : l'équipage lève l'ancre et hisse la voile. Espace
  règle ensuite la voilure : demi-voile, toute la toile, voile carguée.
- **Barre « simple » par défaut.** On tient une direction, le navire vire de lui-même vers ce cap. L'ancienne barre
  reste dans les réglages, sous le nom « réaliste ».
- **Monter et descendre avec E.** « Monter à bord » s'affiche près du flanc, « Descendre à terre » près d'un quai ou
  d'une plage. Marcher sur le pont fait quitter un poste : plus de joueur figé à la barre.
- **Trois boutons de secours.**
  - **Dégager** : le navire glisse vers l'eau libre.
  - **Rentrer au port** : 8 s sans être touché.
  - **Descendre à terre**.

  Un conseil dit quoi faire, et un anneau doré montre la barre.
- **Outils développeur** (serveur Node seulement) : un compte autorisé, un secret côté serveur, un personnage
  laboratoire séparé, un atelier à onglets et une console. Voir « Serveur Node » plus bas.
- **Tests dans le dépôt.** `npm test` lance les suites serveur.

## Nouveautés de la version 1.1.1 : la finition graphique

- **Une lumière en couleur.**
  - L'éclairage ne perce plus un voile noir. Une carte de lumière colorée multiplie la scène : le jour blanc et chaud, l'or du couchant, le rose de l'aube, le bleu de lune la nuit (rouge les nuits de pleine lune), la pénombre chaude des intérieurs, le noir violet des grottes, le vert d'eau des fonds.
  - Les sources y ajoutent leur couleur : lanternes et feux orangés, magies froides, feux-follets verts, cristaux violets, fanaux des navires, faisceau du phare, explosions. Les lanternes éclairent donc vraiment le pavé et les murs, sans paliers ni disques blancs.
  - Un halo doux reste sur les sources seulement, les vitres s'allument chaudes, et les yeux des morts luisent dans le noir.
- **Un étalonnage commun**, pour une même identité partout :
  - des verts moins criards, plus de contraste et une pointe de chaleur sur tout le monde ;
  - une teinte par lieu (marais, îles maudites, volcan, brumes), la pluie et l'orage qui assombrissent ;
  - l'heure dorée qui embrase le ciel au couchant ;
  - un léger vignettage.
- **Les fonds marins** : les rochers ne sont plus des carrés sombres, mais des galets arrondis, éclairés d'en haut, piqués de corail et frangés d'algues, posés sur le sable.
- **Les jauges du pirate** (PV, énergie) prennent le style du reste de l'interface : un liseré de laiton, un reflet, des graduations, et la trace des PV perdus.

## Nouveautés de la version 1.1 : de vrais navires

Les navires ne sont plus des montures qu'on met à l'eau n'importe où : ce sont de vrais navires, qui restent
dans le monde, sur lesquels on marche, et qu'on mène à plusieurs.

- **On arme son navire au port**, et seulement là. Chaque port a son quai d'armement, marqué d'une bitte d'amarrage ⚓ : Port-Lanterne, la Rade, Havre-des-Brumes, Anse-Tranquille et deux à Libertalia. On peut aussi passer par un charpentier de marine. Le navire apparaît amarré, ancre au fond, voiles ferlées, la passerelle posée sur le quai. Chaque pirate n'a qu'un navire armé à la fois.
- **On monte à bord à pied.** On passe par la passerelle, ou par l'ouverture du bastingage depuis une plage ou des hauts-fonds. Sur le pont, on marche librement autour des mâts, de la barre et des canons. On descend de la même façon, vers un quai, une plage ou des hauts-fonds tout proches.
- **Les postes** se tiennent avec E :
  - la **barre** : Q et D tournent la roue, qui reste où on la laisse ;
  - les **drisses** du grand mât : Z déploie la voilure, S la cargue ;
  - le **cabestan** : S jette l'ancre, Z tenu la lève, plus vite à plusieurs ;
  - les **canons** de chaque bord : on vise à la souris dans l'arc du sabord, et l'on recharge.
- **Un navire lourd.**
  - Il prend son erre lentement : quelques secondes pour un sloop, bien plus pour un galion.
  - Il lui faut de la vitesse pour gouverner, il vire large et dérive dans les virages. Ancre au fond et lancé, il pivote sur elle.
  - **Le vent compte** : il tourne lentement, s'affiche sur le tableau de bord et dans le pavillon. Vent arrière, on file ; face au vent, on avance moitié moins vite.
  - On talonne les rochers et l'on s'écrase sur la côte, et la coque en souffre. Échoué, on cargue la voile et l'équipage déborde le navire à la gaffe.
- **Il paraît vrai.**
  - Coque et pont sont vus de dessus dans tous les caps, avec le franc-bord qui dépasse.
  - La mâture et les voiles sont en perspective. Les voiles se gonflent au vent arrière, se plaquent au mât et faseyent face au vent, et leurs vergues sont brassées.
  - La mâture gîte dans les virages et roule à la houle.
  - Il laisse un sillage en V, de l'écume à l'étrave, et des fanaux allumés la nuit.
  - Les canons reculent, l'ancre descend dans une gerbe d'écume, et un tableau de bord donne coque, barre, voilure, ancre, vent et nœuds.
- **Il reste dans le monde.** Il reste où on l'a laissé, ou part à la dérive si l'on est descendu voiles dehors ! On le retrouve sur la carte, il est sauvegardé avec son propriétaire, et on le reprend à la reconnexion, sur son pont. Vide et son propriétaire parti, il rentre au port au bout de dix minutes.
- **À l'abordage.** Le groupe et l'équipage du propriétaire montent à bord. Les autres pirates aussi, mais seulement quand le JcJ le permet entre eux.
- **Les coups** : les boulets frappent les coques (la sienne est épargnée), et un pirate touché sur le pont voit sa coque encaisser l'essentiel. Coque à zéro, le navire sombre et l'équipage regagne la côte à la nage.
- **Les navires ennemis et alliés** (Brick des Noyés, Frégate maudite, Galion Fantôme, navires du Kraken) sont dessinés de la même façon. On vise leur vraie coque.
- **Le reste** : on plonge depuis le pont (l'ancre est jetée d'office) et l'on remonte sur son pont. On pêche depuis le pont. Le tourbillon du Kraken aspire les navires, et ses tentacules les retiennent.

## Nouveautés de la version 1.0

Une page de présentation publique accompagne le jeu : `docs/accueil.html` (sur GitHub Pages,
`…/maree-morte/accueil.html`), avec ses captures dans `docs/img/`.

### Le monde vivant

- **Plus d'invasion chaque nuit** : la Marée Morte ne relève plus les noyés toutes les nuits. À la place, de **grandes invasions** rares (toutes les deux à trois heures), annoncées cinq minutes à l'avance : trois vagues de morts, puis leur capitaine. Les défenseurs sont récompensés.
- **Des villes animées** : les habitants vivent leur journée. Le jour, les marchands tiennent leur étal et les matelots s'affairent sur les quais. Le soir, on se retrouve devant les tavernes pour chanter et danser. La nuit, chacun rentre chez soi et le guet passe avec ses lanternes. Les rues sont éclairées de lanternes et de guirlandes.
- **Réputation des lieux** : chaque port a sa réputation (Inconnu, Connu, Apprécié, Respecté, Honoré, Héros). Elle fait baisser les prix, et certaines marchandises ne se vendent qu'aux héros du lieu.
- **Taxes** : chaque port prélève sa taxe sur les achats et les ventes (5 % à Port-Lanterne et à l'Anse, 8 % à la Rade et à Havre-des-Brumes, 12 % à Libertalia).
- **La brume de la carte** : la carte se dévoile au fil des voyages.
- **La collection d'airs** : chaque musique entendue pour la première fois est notée dans le carnet du pirate, et la boîte à musique de la maison peut la rejouer.
- **Animations et vastitude** : les personnages respirent, et des voiles passent au loin sur la haute mer.

### L'histoire

- **Acte III** : qui a déclenché la Marée Morte ? Une enquête en cinq quêtes (la Flamme, les pages arrachées, la ballade, l'aveu, l'âme d'Anselme), puis **trois fins exclusives** : apaiser, garder ou embraser la Flamme. Chaque pirate n'en choisit qu'une.
- **Conversations jouées** pour les 45 anciennes quêtes, avec des questions au choix.
- **Les PNJ se souviennent** : de vos quêtes, de vos réponses, de vos hauts faits, et le disent.

### Les activités

- **Navires partagés** : un membre du groupe ou de l'équipage monte à bord comme canonnier (touche E près du navire) et tire en bordée, à bâbord ou à tribord. Chaque bras de plus fait filer le navire plus vite.
- **Coques** : un navire encaisse une part des coups et peut sombrer. Les coques se réparent au chantier naval (3 doublons le point).
- **Les fonds marins** : avec une cloche de plongée (Ysaline ou Corentin), on plonge depuis son navire au-dessus des sites où remontent des bulles. On y trouve l'épave du Léviathan, les Grottes des Abysses et Ys-la-Noyée avec son roi. L'air dure 45 secondes : les poches d'air le rendent, le casque de scaphandrier le double. On remonte par la corde de l'ancre.
- **Le Bastion Englouti**, donjon pour plusieurs pirates. Chaque grille s'ouvre quand deux leviers éloignés sont tirés ensemble. L'Écluse se remplit d'eau en 75 secondes : il faut ouvrir la grille suivante à temps pour atteindre l'Amiral Englouti. Vide, le Bastion se referme et se repeuple.
- **L'Arène de la Fosse** : des vagues à repousser, sans mort (on est mis hors de combat), et un classement chaque semaine. On y trouve aussi des duels avec mise et des paris des spectateurs (la Fosse garde 5 %).
- **Les tavernes** : bras de fer, concours de rhum, Trente-et-un, et des chansons à boire, à apprendre, qui donnent de l'entrain à ceux qui chantent (+10 % d'attaque).
- **Les saisons** : chaque mois a son concours de pêche, où les prises ont une taille et chaque espèce un record, et son **Grand Tour de Libertalia**, une course en selle à travers six portes. Le podium reçoit des doublons et le Tricorne des saisons ; les absents trouvent leur récompense à leur retour.
- **Navires légendaires** : la Veuve Écarlate, que seuls les héros de Libertalia peuvent acheter, et le Spectre des Brumes, à arracher au Galion Fantôme.
- **Un secret** dort quelque part sous la mer.

### Les pirates entre eux

- **Chat complet** : canaux général, groupe, équipage et messages privés (Tab change de canal, ↑ ↓ l'historique), filtres, et des noms cliquables.
- **Amis et ignorés**, **groupes** qui partagent l'expérience, **équipages** avec pavillon et rangs (touche P).
- **Échanges sécurisés** : les deux pirates valident, puis tout passe d'un coup, avec un historique.
- **JcJ encadré** : il est permis à partir du niveau 10, entre pirates de moins de dix niveaux d'écart. On est protégé deux minutes après une mort, et jamais entre membres d'un même groupe ou équipage.
- **La prison** : trois meurtres de trop et le pirate est recherché. Arrêté, il passe un moment à la geôle, sauf s'il paie sa caution au gardien.
- **Honneur et gloire** : un classement des combattants. Au niveau maximal, l'expérience remplit une barre de gloire, et chaque rang de gloire ajoute des PV et des dégâts.

### Le pirate

- **Propriétés** : deux au plus, à revendre, en huit catégories (de la petite cabane au manoir). On les meuble, on y expose des trophées, et on peut s'y faire cambrioler.
- **Armes et progression** : chaque arme a un rôle clair et des dégâts par seconde affichés, et un niveau est requis pour les plus fortes. Les boss sont plus solides en groupe et donnent un butin personnel.
- **Tutoriel progressif**, **codex** (touche O : monstres, boss, armes, objets, personnages, îles, secrets, statistiques) et des réglages d'aide (complète, discrète ou aucune).

### Sous le capot

- **Sauvegardes** : format versionné avec migrations, sauvegarde automatique, écriture atomique, copie de secours en cas de fichier abîmé, et instantanés horaires et quotidiens dans `data/backups`. On revient en arrière avec `node scripts/restore.mjs`.
- **Sécurité** : protocole versionné, limites de débit, vérification par le serveur de chaque action (déplacements, mini-jeux, échanges).
- **Administration** : avec `ADMIN_TOKEN`, la console `/admin` du serveur Node permet de voir l'état du serveur, les pirates et les signalements, de bannir, d'exclure ou de rendre muet, de faire une annonce, de passer en maintenance, de lancer une invasion, de sauvegarder, de faire un instantané ou de restaurer un pirate. Sans jeton, elle est désactivée.
- **Test de charge** : `node scripts/charge.mjs 50 20` simule 50 pirates pendant 20 secondes et mesure la durée du tour du serveur.
- La version 1.0 change le monde partagé de la page publique : les pages 0.9 et 1.0 ne se rejoignent pas.

## Nouveautés de la version 0.8.1 : une interface de pirate

- Tous les panneaux qui s'ouvrent passent au même style que la carte au trésor : sac, journal de bord, hauts faits, boutiques, forge, coffre de la maison, aide, réglages, dialogues, confirmations, choix de quantité et écran d'accueil.
  - Ils sont faits de parchemin vieilli, dans un cadre de bois veiné aux coins ferrés de laiton.
  - Les titres sont écrits à l'encre, sous un pavillon noir et un fleuron.
  - On les ferme d'un sceau de cire rouge.
  - Les onglets sont en cuir cousu, et les listes sont tenues comme un registre.
- Le sac devient un « sac de marin » : les objets sont rangés dans l'intérieur boisé d'un coffre, et l'on jette par-dessus bord ce qu'on veut lâcher.
- Les boutons du menu ont des icônes peintes en pixel art à la place des émojis : coffre, maison, journal, carte, trophée, bouteille à la mer, barre à roue, cloche du bord.
- Les messages à l'écran s'affichent sur des planches de bois.

## Nouveautés de la version 0.8 : Libertalia

- **Libertalia, la Cité Libre des Forbans** : une île gigantesque à l'est (la carte passe de 640 à 960 cases de large) et, à son pied, une immense ville pirate ceinte d'un rempart à bastions, avec des tours et des portes. On y trouve le palais de la Reine et ses jardins, la place de la Liberté (statue du fondateur, fontaine) et le marché. Il y a quatre tavernes, le tripot de La Bourse aux Dés, Le Velours Écarlate (le salon de Madame Rubis), le marché noir du Borgne et La Fosse, une arène. S'y ajoutent des écuries, une armurerie, un tailleur, un apothicaire, un chantier naval, la capitainerie, des entrepôts, un cimetière, un verger, les Bas-Fonds et dix maisons à acheter. La ville compte 31 habitants, une foule qui flâne, des chats, et sa propre musique de taverne.
- Autour de la cité :
  - les Hauts et leur fort (gardes maudits) ;
  - les Cannaies (épouvantails) ;
  - la Baie des Naufrageurs et ses fausses lumières ;
  - la Mangrove des Contrebandiers ;
  - la Jungle Écarlate et son temple ;
  - la Crypte du Roi sans Couronne.

  Neuf nouveaux monstres y vivent, dont deux élites et un boss.
- **De vraies conversations** : les quêtes de Libertalia se jouent en scènes cinématiques. Des bandes noires encadrent l'écran, la caméra se pose entre les deux personnages et leurs portraits se font face. Les répliques alternent, avec leurs voix, et votre pirate parle aussi. Vous posez vos questions dans l'ordre que vous voulez, puis vous décidez. Espace fait avancer, 1 à 9 choisit une question, Échap quitte.
- La grande quête **Le Roi sans Couronne** compte sept chapitres : le Conseil des Capitaines, une enquête au Velours, un traître et une crypte. S'y ajoutent six histoires de rue et six primes répétables au tableau de la place.
- **La Bourse aux Dés** : misez de 10 à 500 doublons contre Fortuné, le croupier.
- **Plus d'artisanat ni de matériaux** : tout s'achète. Les anciens matériaux, outils et constructions ont été remboursés en doublons. Chaque maison achetée contient un coffre de rangement gratuit de 48 places.
- **Beaucoup d'objets nouveaux** :
  - sept montures (touche C) : âne, cheval, tortue géante, crabe géant, autruche, pur-sang, destrier squelette ;
  - trois navires : radeau, goélette, galion ;
  - des objets de voyage : conque de rappel, longue-vue, fumigène ;
  - des potions : célérité, force, fer, antidote ;
  - des talismans et des tenues ;
  - 17 armes aux effets inédits : ralentir, geler, empoisonner, étourdir, effrayer, foudre en chaîne, ricochet, boomerang, grappin, balle chercheuse, or de Midas…
- Les élites et les boss réapparaissent beaucoup plus lentement.
- **Barre d'émotes** : les touches 2 à 5 font danser, saluer, faire un doigt d'honneur ou un salto.
- **Un jeu mieux organisé** :
  - on choisit les quêtes suivies (jusqu'à quatre) ;
  - le journal est rangé par onglets et les hauts faits par catégories ;
  - le sac se trie et se filtre, et gère les quantités ;
  - on peut lâcher ses objets.
- **La carte redessinée** : une vraie carte au trésor, avec profondeurs, écume, relief ombré, rose des vents et cartouche. De nouveaux îlots jalonnent le Détroit de Libertalia, et des bricks noyés croisent autour de l'île.
- Nouveaux hauts faits : **Cité Libre**, **Corsaire de la Reine** et **Flambeur**.

## Nouveautés de la version 0.7.1 : le Volcan de Cendrelune

- **Un volcan immense** domine désormais l'île de Cendrelune : une montagne de plus de 800 pixels de large, peinte pixel par pixel à partir d'un relief (arêtes, ravines, cratère et lac de lave), avec quatre coulées qui descendent jusqu'à l'île et rejoignent ses rivières de lave. Un panache de fumée monte du cratère, qui rougeoie la nuit. Quand on passe derrière la montagne, elle devient transparente.
- Le pied du cône se marche ; le cône lui-même, les coulées et le cratère sont infranchissables. L'entrée de la Forge du Brasier est toujours au pied sud.
- **Éruptions** : tant que des pirates sont sur l'île, le volcan se réveille de temps en temps (toutes les deux minutes environ). Pendant une vingtaine de secondes, la terre tremble, la musique de bataille se lance et des bombes de lave jaillissent du cratère : chacune est annoncée par un cercle au sol, puis laisse une flaque qui refroidit.
- Nouveau haut fait : **Sous la cendre** (rester debout sur l'île pendant toute une éruption), titre « Cracheur de feu ».

## Nouveautés de la version 0.7 : le Grand Large

- **Une carte quatre fois plus grande.** L'archipel d'origine ne bouge pas ; à l'est et au sud s'ouvrent de nouvelles terres : Rade-aux-Flibustiers (ville de forbans), les Collines de la Rade, la Forêt des Pendus, le Lagon des Sirènes, l'Îlot de l'Ermite, Anse-Tranquille (village de pêcheurs), l'Atoll des Ossements, l'Île de la Quarantaine, le Volcan de Cendrelune, les Brumes Éternelles et l'**Île des Damnés** (niveaux 26-30, zone extrême, butin légendaire).
- **La Couronne des Marées** : une grande quête de cape et d'épée en onze étapes avec un personnage original, le capitaine Ambroise Vif-Argent, beau parleur et peu fiable. Au programme : une évasion de la Geôle, trois gardiens à abattre, une trahison, le Docteur Corbeau, le Galion Fantôme, Vespère le Comte des Marées, et un choix final (rendre la Couronne à Morgane ou la laisser au Fanfaron) avec des récompenses différentes.
- **Les Frères de la Côte**, une quête **impossible seul** : la porte du Fort des Deux Clés ne s'ouvre qu'avec un pirate sur chacune des deux dalles, et à l'intérieur, Fer et Rouille sont invulnérables tant qu'ils se tiennent côte à côte. Chacun en attire un de son côté, et il faut les abattre à quelques secondes d'intervalle, sinon le survivant relève son frère.
- **Navires maudits** : bricks des Noyés, frégates maudites et le Galion Fantôme patrouillent, canonnent tout ce qui flotte et coulent, avec leurs débris à piller. Nouveau navire : le brick de course (deux canons par bordée).
- **Jour et nuit** : le jour, la plupart des morts dorment sous terre ; seuls ceux qui résistent au soleil (chapeau de paille, peau tannée) restent dehors. À l'aube, les autres brûlent. Une nuit sur trois, c'est la **pleine lune** : la Horde se lève autour des pirates.
- **Tenues** (nouvel emplacement) : treize tenues à acheter, à coudre à la table de couture de la Rade, à forger, à gagner en quête ou à arracher aux boss. Elles changent l'apparence (chapeaux à plume, masque de peste, morion, capes…) et donnent leurs propres bonus.
- **Maisons sur d'autres îles** : 13 nouvelles maisons à la Rade, à Anse-Tranquille et sur l'Îlot de l'Ermite (cette dernière île n'est pas protégée).
- **Nouveaux boss à phases** : le Bourreau, la Reine des Sirènes, le Général d'Os, le Docteur Corbeau (nuages de peste), le Brasier, les Frères Ferrailleurs et Vespère (quatre phases).
- **Passeurs** : des billets pour voyager de ville en ville sans prendre la mer.
- **Les autres joueurs apparaissent sur la carte** (M) et sur la minicarte, où qu'ils soient.
- **Musique générative** : chaque morceau est composé à la volée (tonalité, accords, mélodie, instruments et forme changent à chaque fois), avec des silences entre les morceaux en exploration. Les thèmes de 0.6 reviennent parfois, jamais en boucle.
- 27 nouvelles quêtes (dont 4 primes), 14 nouveaux personnages, 25 nouveaux ennemis (dont 8 boss et 3 navires), 11 nouvelles armes (dont 5 légendaires), 9 hauts faits.

## Nouveautés de la version 0.6 : le Kraken

- **Le Kraken** : une chaîne de quatre quêtes (Ysaline → capitaine Elouan, à Havre-des-Brumes) mène à la Conque des Abysses. Soufflez dedans à bord, au-dessus du Gouffre : cinématique (le Goéland d'Elouan est happé par les tentacules), puis combat naval en trois phases — encre qui aveugle, tentacules qui frappent et saisissent les navires, tourbillon, vagues, plongée. La Mouette Écarlate de Morgane vient vous couvrir de ses canons. Les PV du Kraken s'adaptent au nombre de pirates.
- **Boss à phases** : Barbe-Cendre, le Roi des Os, le Crabe-Roi, la Goule Alpha et le Capitaine Noyé ont une entrée en scène, des attaques propres (charges, cercles de cendre, tempête d'os, carapace, bonds, geysers, ancre) annoncées au sol, des phases marquées sur leur barre de vie, et une cinématique de mort.
- **Maisons** : six maisons à vendre au Quartier des Corsaires (800 doublons). Votre nom s'affiche sur la porte ; la pièce est vide et se meuble avec B (coffres, lit, cheminée, tables, tapis, tableaux, trophée…). Maître Anselme vend les meubles, Lison les animaux de compagnie (chat, chien, perroquet, singe ; le bébé kraken se gagne), qui vous suivent ou dorment chez vous.
- **Cambriolage** : avec des crochets (la Fouine, sur les quais), E devant la maison d'un autre lance un mini-jeu de crochetage. Réussi, vous avez 40 secondes pour fouiller un coffre : la moitié d'une pile au hasard, et parfois un objet très rare introuvable autrement. Serrures renforcées et chien de garde compliquent la tâche ; le propriétaire est prévenu et le voleur est marqué.
- **Un secret à deux** : dans les ruines, deux dalles à fouler en même temps par deux pirates ouvrent le Sanctuaire des Jumeaux.
- **Musiques originales** : une gigue de flibustiers en mer, un thème de bataille navale, un thème épique pour les boss (toutes composées pour le jeu, synthétisées dans le navigateur).
- Correctif : les cases de l'épée et de la roulade ne clignotent plus dans la barre d'action ; nouvelles icônes pour la roulade et la banane.

## Nouveautés de la version 0.5 : l'arsenal

- **36 armes** (25 nouvelles), chacune avec son comportement :
  - mêlée : poignard rapide, machette, crochet (saignement), rapière et harpon (estocades à longue portée), cimeterre (large balayage), brise-crâne (repousse fort), dague de cristal (critiques), trident (vol de vie), sabre d'os (saignement), flamberge, faux du Passeur, ancre de l'Abysse ;
  - armes à feu : pistolet à deux coups, poivrière (rafale de 3), escopette (plombs à bout portant), carabine, pistolet de duel, crache-feu (brûlure), fusil-harpon (traverse 4 ennemis), long fusil du guetteur (très longue portée), pistolet de cristal, mortier à main et couleuvrine (explosions), mousquet d'os.
- **Où les trouver** : artisanat à la forge (11 recettes), boutiques d'Isa et d'Ysaline, quatre nouvelles quêtes (Acier de duelliste, Le duel de l'aube, Bois de marine, L'œil du guetteur), butin des boss et des élites, coffres, trésors enterrés, et **6 cachettes secrètes** (des coffres moussus : chacune garde une arme pour chaque pirate). Haut fait « Fouineur ».
- **Nouveau dessin des armes** : icônes et armes tenues en main générées à partir d'une même description (lames ombrées, gardes, poignées, crosses, canons, lueurs), estocade pour les lances et les rapières, projectiles propres à chaque arme (flammes, éclats de cristal, harpons, grenades, balles traçantes).
- **Nouvelle barre d'action** : planche de bois, emplacements de laiton, arme et arme à feu équipées visibles, recharge chiffrée, cadenas et niveau requis pour les compétences pas encore apprises. Inventaire aux mêmes cadres, avec un liseré de couleur selon la rareté.

## Nouveautés de la version 0.4

- **Combat entre joueurs** partout, sauf dans les zones sûres : Port-Lanterne, Havre-des-Brumes et l'intérieur des bâtiments. Les dégâts entre pirates sont réduits (×0,6) ; le vaincu perd 10 % de son or, que le vainqueur ramasse. Les noms en rouge sont ceux des pirates qui peuvent vous attaquer ; un message prévient quand on quitte ou rejoint une zone sûre. Haut fait « Premier duel ».
- **Navigation** : barque (Corentin, sur le quai, ou à l'établi) et sloop armé d'un canon (Ysaline, au chantier naval de Havre, ou à l'établi). Face à l'eau, E pour mettre à l'eau ; près du rivage, E pour accoster. À bord : pistolet ou canon (clic droit), pas de sabre. Nouvelles terres : **Havre-des-Brumes** (village sûr à l'est), **l'Île au Crâne** (niveaux 9-12) et des îlots.
- **11 bâtiments où l'on entre** (taverne, forge, maisons, auberge du Kraken Ivre, chantier naval…) : on pousse contre la porte pour entrer, on sort par le seuil. Mobilier, cheminées, PNJ à l'intérieur (Rosalie, Ysolde, Ysaline).
- **3 grottes secrètes**, invisibles de loin : la Grotte des Contrebandiers (falaise de la jungle), l'Antre du Crâne (avec le Roi des Os, nouveau boss d'élite) et la Grotte de Cristal (sous un îlot du sud). Cristaux à miner (pendentif de cristal à la forge). Haut fait « Sous la roche ».
- **Nouvelles quêtes** : La traversée (Corentin), Lumière sous la roche (Rosalie), Le Roi des Os (Ysolde).
- **Caméra plus haute** (on voit plus loin, le pirate paraît plus petit) et **molette pour zoomer** ; la caméra se rapproche un peu dans les petites pièces. **La minimap est de retour**, ronde et discrète.
- **Version ordinateur uniquement** : les commandes tactiles ont été retirées.
- **Page publique sur GitHub Pages** (dossier `docs/`) : tout le monde peut jouer par un simple lien, en multijoueur (voir plus bas).

## Nouveautés de la version 0.3

- **Interface épurée** par défaut : pas de minimap ni de gros cadres, une seule quête suivie, un simple chevron discret vers l'objectif, le butin en petites lignes dans un coin. Réglages > « Aides à l'écran » : discrètes, complètes ou aucune.
- **Récolte** (touche E) : arbres à la hache, rochers à la pioche (ou silex à la main), palmiers, buissons, fougères, roseaux, champignons, bois flotté et coquillages. Les ressources repoussent au bout de quelques minutes, pour tout le monde.
- **Artisanat** (touche C) : 62 recettes en 7 catégories (matériaux, outils, armes, armures, talismans, cuisine, construction) sur 4 postes : à la main, feu de camp (ou la Flamme de la place), établi et forge (près d'Isa), ou ceux de votre base.
- **Votre base** (touche B) : fabriquez un pavillon pirate à l'établi et plantez-le hors de la ville pour revendiquer un terrain. Construisez-y murs de bois ou de pierre, palissades, portes (les morts ne passent pas), planchers, tapis, torches, lanternes, feu de camp, établi, forge, coffres (rangement partagé), lit (vous y réapparaissez), jardinières qui donnent des baies, et canons de défense qui tirent seuls sur les morts. Les monstres ne réapparaissent plus sur votre terrain.
- **Sauvegarde des bases** : sur le serveur Node, dans `data/world.json` ; sur la page claude.ai et en solo, la base fait partie de la sauvegarde du joueur et apparaît quand il est connecté.

## Nouveautés de la version 0.2

- **Guidage** : une flèche dorée pointe toujours vers votre prochain objectif (quête, trésor), avec la distance.
- **Musique adaptative** composée en direct : chant de marins le jour, nappes sinistres la nuit, tambours dans le marais, percussions de guerre près des boss.
- **Météo** partagée par tous les joueurs : pluie et orages avec éclairs et tonnerre.
- **Pêche** (touche R) : sardines, dorades, poissons-lanternes la nuit, espadons par gros temps, bouteilles à la mer.
- **Cartes au trésor** : 4 fragments forment une carte ; creusez sur la croix rouge.
- **Forge d'Isa** : renforcez l'arme, le pistolet et l'armure jusqu'à +5.
- **Élites** : le Crabe-Roi (plage) et la Goule Alpha (jungle), avec leurs butins.
- **Tableau des primes** sur la place : chasses répétables toutes les 10 minutes.
- **Social** : bulles de chat au-dessus des têtes, émotes (`/danse`, `/salut`, `/rire`, `/joie`, `/colere`, `/assis`), 12 hauts faits et leurs titres (touche K).
- **Vie du port** : habitants et chats qui se promènent ; restes des monstres vaincus ; écume du ressac.
- **Réglages** : volume de la musique et des effets, zoom, tremblements de l'écran.

## Trois façons de jouer

| Mode | Où | Multijoueur |
|---|---|---|
| Page publique GitHub Pages | `https://<compte>.github.io/maree-morte/` | oui, pour tous ceux qui ouvrent le lien (connexion directe entre navigateurs) |
| Page claude.ai | le lien de l'artifact | avec les personnes qui ont accès à la page et l'ont ouverte en même temps |
| Serveur Node | `npm start`, ou un hébergeur | oui, pour tous ceux qui ont l'adresse |
| Solo | bouton « Jouer en solo », ou automatique si rien d'autre ne répond | non |

### Page publique (GitHub Pages)

`npm run build:pages` produit `docs/index.html`, une page autonome. Dans les réglages du dépôt GitHub,
*Pages > Build and deployment > Deploy from a branch*, choisir la branche `main` et le dossier `/docs`.

Le multijoueur de cette page n'a besoin d'aucun serveur : le premier pirate arrivé fait tourner le
monde dans son navigateur (le même code que le serveur Node), les autres s'y connectent directement
(WebRTC). Le service public gratuit PeerJS sert seulement à mettre les navigateurs en relation. Si
l'hôte ferme sa page, un autre joueur reprend le monde en quelques secondes ; un hôte dont l'onglet
reste caché passe aussi la main. Chaque pirate garde sa progression dans son propre navigateur.

Limites à connaître : le monde (monstres, bases) repart de zéro quand l'hôte change ; l'hôte étant un
joueur, rien n'empêche un tricheur averti de modifier la partie ; certains réseaux d'entreprise
bloquent WebRTC (le jeu passe alors en solo). Pour un vrai MMO public et persistant, utilisez le
serveur Node : la page publique s'y connecte avec `?serveur=adresse-du-serveur` dans le lien.

### Page claude.ai (le lien partagé)

Le jeu est publié en une seule page sur claude.ai. Le navigateur d'un des joueurs fait tourner
la simulation du monde (le même code que le serveur) ; si ce joueur part, un autre reprend.
Chaque joueur garde sa progression dans son propre navigateur.

Pour jouer ensemble, les joueurs doivent avoir un compte claude.ai et un accès **Contributeur**
(ou plus) à la page. Avec un accès en lecture seule, ou par un lien public, le jeu passe en solo.

### Serveur Node (le vrai MMO public)

```bash
npm install
npm start
```

Puis ouvrir http://localhost:3000. Variables utiles : `PORT`, `DATA_DIR` (comptes),
`MAX_PLAYERS`. Les comptes sont des fichiers JSON dans `data/accounts/`, mots de passe hachés
avec scrypt.

**Héberger en ligne avec mise à jour automatique** : mettre ce dossier dans un dépôt GitHub,
puis sur [Render](https://render.com) choisir *New > Blueprint* et ce dépôt (le fichier
`render.yaml` configure tout). Chaque modification poussée sur GitHub redéploie le jeu.
Attention : sur l'offre gratuite de Render, le disque est effacé à chaque déploiement, donc les
comptes repartent de zéro ; il faut un disque persistant (payant) ou une base de données pour
les garder. Le `Dockerfile` permet aussi un déploiement sur n'importe quel serveur.

**Outils développeur** (serveur Node seulement) : ils restent inactifs tant que ces deux variables ne sont pas
définies sur le serveur. Elles ne se mettent jamais dans le dépôt.

- `DEV_ACCOUNTS` : les noms de pirates autorisés, séparés par des virgules, par exemple `Hugo`.
- `DEV_SECRET` : un secret de 16 caractères au moins. Exemple pour en tirer un :
  `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
- `DEV_TTL_MIN` (facultatif) : la durée d'une session développeur, en minutes. 120 par défaut.

En local :

```bash
DEV_ACCOUNTS=Hugo DEV_SECRET=… npm start
```

Sur Render, ces variables s'ajoutent dans *Environment* du service.

Pour ouvrir l'atelier :

1. Se connecter avec le compte autorisé.
2. Taper `/dev` dans la discussion, puis donner le secret.
3. L'atelier s'ouvre. F9 le montre ou le cache.

Ce que contient l'atelier :

- les onglets Personnage, Objets, Quêtes, Ennemis, Téléportation, Économie, Navires, Environnement, Cinématiques
  et Journal ;
- une recherche globale ;
- une console avec autocomplétion (Tab) et `aide`.

Toutes les commandes qui modifient un personnage s'appliquent au **personnage laboratoire** (`lab 1`, `lab 2`,
`lab 3`), jamais au vrai. Le laboratoire a sa propre sauvegarde et reste à l'écart des vrais pirates : pas
d'échange, de groupe, de duel, de butin partagé, de propriété ni de classement.

Les tentatives sont limitées : cinq essais ratés imposent quinze minutes d'attente. La console d'administration
révoque toutes les sessions avec `POST /admin/api/dev-revoke`. Chaque commande est inscrite au journal du serveur.
Sur les pages GitHub et claude.ai, où le jeu tourne dans un navigateur, ces outils n'existent pas.

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | se déplacer |
| Clic gauche | coup de sabre vers le curseur |
| Clic droit ou 1 | tirer |
| 2 à 5 | émotes : danse, salut, doigt d'honneur, salto |
| Espace | roulade |
| E | parler, ouvrir, ramasser, creuser, fouiller, entrer, armer un navire (à la bitte d'amarrage), tenir ou quitter un poste du navire, plonger, tirer un levier |
| Q / D | à la barre : tourner la roue |
| Z / S | aux drisses : déployer, carguer la voilure · au cabestan : lever (tenir Z), jeter l'ancre (S) |
| Molette | zoomer, dézoomer |
| C | monter sur sa monture, en descendre |
| P | compagnons : groupe, amis, équipage, honneur, saison, échanges |
| O | codex |
| B | meubler sa maison |
| Espace, 1 à 9, Échap | en conversation : réplique suivante, choisir une question, quitter |
| R | pêcher, puis ferrer |
| F | manger le meilleur soin |
| I / J / M / K / H | inventaire, quêtes, carte, hauts faits, aide |
| Entrée | chat (`/qui`, `/pos`, `/aide`) ; Tab change de canal, ↑ ↓ l'historique |

## Organisation du code

```
shared/            code commun au serveur et au client
  world.js         génération déterministe de l'île, collisions
  constants.js     constantes, cycle jour/nuit
  formulas.js      statistiques, expérience, apparence
  data/            objets, monstres, quêtes (et leurs scènes), PNJ, compétences, mobilier (craft.js), anciens objets remboursés (legacy.js)
  heist-world.js   les lieux du Plus Grand Braquage (1.5)
  festival-world.js  la plage en fête, le Parcours du gabier et la Lice (1.6)
  fest-sim.js      la simulation partagée du festival : cibles, tonneaux, chemin des rivaux (1.6)
server/
  game.js          simulation autoritaire (IA, combat, butin, quêtes, boutiques, chat)
  social.js        chat, amis, groupes, équipages, échanges
  justice.js       JcJ, recherche, prison, réputation
  events.js        grandes invasions annoncées
  arena.js         la Fosse, duels et paris
  tavern.js        mini-jeux de taverne
  naval.js         coques, chantier naval
  ships.js         les navires (1.1) : armement à quai, physique, pont, postes, canons, naufrage
  dungeon.js       le Bastion Englouti
  heist.js         le Plus Grand Braquage (1.5)
  festival.js      la Nuit des Mille Voiles : épreuves, course, spectacle, jetons, classement (1.6)
  sea.js           plongée et air
  seasons.js       concours de pêche, Grand Tour, podiums
  db.js            comptes, sauvegardes, instantanés
  index.js         serveur HTTP + WebSocket, console /admin (admin.html)
client/
  main.js          boucle du jeu, prédiction, interpolation, événements
  net.js           transports WebSocket et solo
  roomnet.js       multijoueur dans la page claude.ai (élection d'hôte)
  peernet.js       multijoueur direct entre navigateurs (page GitHub Pages)
  ui.js            interface HTML, carte au trésor
  social-ui.js     chat, compagnons, échanges
  tavern-ui.js     mini-jeux de taverne
  townsfolk.js     habitants des villes
  heist.js         le braquage côté écran : regards des gardes, mini-jeux (1.5)
  festival.js      le festival côté écran : visée, mini-jeux, course, feux d'artifice, carnet (1.6)
  render/ships.js  le dessin des navires (coque, pont, mâture, voiles, sillage)
  render/lighting.js  la lumière (carte de lumière colorée, ambiances, halos, vignettage)
  scene.js         dialogues cinématiques (portraits, répliques, questions au choix)
  cine.js          cinématiques des boss
  render/          moteur de rendu et pixel art procédural (sprites-volcan.js : la montagne ; sprites-cite.js : Libertalia)
scripts/
  build-artifact.mjs  assemble la page unique : claude.ai (dist/) ou GitHub Pages (--pages, docs/)
  restore.mjs      restaure un instantané (serveur arrêté)
  charge.mjs       test de charge
docs/              page publique GitHub Pages : index.html (le jeu, généré), accueil.html (présentation), img/
```

## Ajouter du contenu

- Un objet : une entrée dans `shared/data/items.js` (l'icône vient de `client/render/sprites-items.js`).
- Un monstre : `shared/data/mobs.js`, son apparence dans `MOB_LOOKS` de `client/render/sprites-chars.js`,
  ses points d'apparition dans `spawnPlan` de `shared/world.js`.
- Une quête : `shared/data/quests.js`.
- Un PNJ : `shared/data/npcs.js` et sa position dans `shared/world.js`.
