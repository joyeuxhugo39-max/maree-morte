# Le Plus Grand Braquage — 1. Audit des environnements (version 1.9.1)

Ce rapport décrit l'état des lieux **avant** la refonte. Il s'appuie sur la lecture du code et sur une visite de chaque
lieu dans le vrai jeu.

- **Code lu** : `shared/heist-world.js`, `server/heist.js`, `client/heist.js`, `shared/data/braquage.js`,
  `shared/data/cinemas.js`, `client/render/terrain.js`, `client/render/renderer.js`, `client/render/lighting.js`,
  `client/ambience.js`, et les modules de sprites.
- **Visite** : Chromium, en solo, la nuit ; captures dans `rapports/captures/br-avant-*.jpg`.

## Comment les lieux sont construits

**Les pièces.**

- Chaque pièce est un rectangle creusé dans la « bande des intérieurs », sous l'archipel (fonction `alloc`).
  - Le mur du fond est peint sur deux rangées au-dessus du sol.
  - Un mur intérieur d'une seule rangée ne montre qu'une demi-hauteur de mur.
- L'allocation se fait à la suite des pièces existantes. **Agrandir une pièce du braquage décalerait toutes les pièces
  créées après elle**, celles du festival notamment, avec les sauvegardes des joueurs qui s'y trouvent.
- Le sol a deux matières : des planches, dont la couleur dépend du type de pièce, ou des dalles. Aucun tapis, marbre ou
  parquet n'existe.

**Les murs.**

- Ils sont peints case par case.
- **Le décor accroché au mur** (fenêtre, tableau, carte) est **tiré au hasard** par colonne : une colonne sur trois,
  selon un hachage. C'est exactement le « placement arbitraire » à proscrire. Dans la demeure, il donne des fenêtres
  et des cartes au trésor au hasard le long du salon.

**Les décors.**

- Chaque décor est un sprite unique, trié par hauteur avec les personnages.
- Rien ne se dessine au-dessus des personnages : ni lustre, ni corde, ni linge tendu, ni gréement.
- Il existe déjà de nombreux sprites de mobilier, ceux des maisons des joueurs. Les lieux du braquage n'en
  utilisaient presque aucun : globe, chandelier, portraits sur chevalet, coffre-fort, bibliothèque, armoire, tapis brodé.

**Les lumières et le son.**

- Dans toute pièce, la lumière ambiante est une pénombre chaude. Les toits et le pont du navire, qui sont dehors,
  sont donc éclairés comme un salon.
- Les sons d'ambiance n'existent que pour les grottes et la forge.

**Les PNJ.**

- Les gardes sont des monstres du serveur. Ils suivent un chemin de points et regardent dans un cône ; les murs
  arrêtent leur regard.
- Les invités de la réception sont des figurants du client.
  - Les domestiques suivent leurs points en ligne droite, **à travers les tables**.
  - Les autres restent sur place et lâchent une phrase au hasard, parmi six.
  - Personne ne réagit à la bagarre ni à l'alarme.

**Les cinématiques** placent leurs acteurs en cases relatives au coin de la pièce. Elles devront suivre le nouveau plan.

## Les lieux, un par un

### La demeure de Valdorne

- **Les dimensions** : la pièce fait 46 × 20 cases. Le salon occupe 28 × 20 cases d'un seul tenant, la galerie 9 × 20,
  les archives 7 × 12.
- **Le salon** :
  - une étendue de planches uniformes ;
  - six petites tables-chandeliers posées en grille ;
  - quatre divans aux coins ;
  - un tapis de 3 × 2 cases sous les musiciens ;
  - un comptoir de 5 cases au bord du mur.
  - Pas de vestibule, pas de circulation, pas de cheminée mise en valeur (elle est en haut au milieu, perdue).
- **La galerie** est un couloir vide : deux statues de bronze (celle du fondateur de la cité, réutilisée), une bannière.
  Rien n'y dit « galerie d'un collectionneur ».
- **Les archives** : cinq étagères, une table, un coffre. Elles ressemblent à un débarras.
- Les trois pièces partagent le même sol et le même mur rose, et rien ne les distingue.

### Le quartier de la demeure

- La façade du palais est posée **derrière la rangée des maisons à vendre**, au milieu des herbes et des rochers.
- On y accède par une ruelle d'**une case** entre deux parcelles.
- Il n'y a ni rue, ni grille, ni portail, ni jardin, ni gardes, ni lanternes. Le bord de la baie, à l'est, n'est pas mis
  en valeur.

### L'entrepôt de la Douane

- Une salle de planches de 24 × 12 cases.
- Sept blocs identiques de caisses et de tonneaux, en grille.
- Trois lampes et un coffre.
- Pas de rayonnage, de sacs, de cordages, de poutres, de bureau de douane, ni de quai de chargement.

### L'atelier de Corvin Lafleur

- C'est l'ancienne « Maison du charpentier », une maison générique de 8 × 6 cases, avec une table renommée « bureau ».
  On y trouve aussi un tapis, une plante et un coffre.
- Trop petite pour un atelier, et rien n'y raconte le métier d'architecte.

### La cave

- 12 × 7 cases de dalles et cinq tonneaux.
- Les six crabes y sont posés sur un sol nu.
- Elle a le mur de briques d'un cellier, sans humidité, ni stockage, ni détail.

### Les toits et les ruelles

- **La forme** : une bande de 96 cases.
  - En haut, une étendue de tuiles rouges uniformes, coupée par quatre trous noirs (les « ruelles » à sauter).
  - Au milieu, un mur.
  - En bas, une bande de pavés.
- **Les obstacles** : neuf colonnes de pierre (les « cheminées ») et quelques caisses.
- Aucun relief : ni toiture de forme différente, ni lucarne, ni passerelle, ni corde, ni cour. Les trois itinéraires
  (le faîte, les ruelles, la ville) ne se distinguent que par la bande où l'on court.

### La Mouche d'Or

- Le pont est un rectangle de planches de 36 × 14 cases, avec deux colonnes au milieu.
- Pas de mât, pas de voile, pas de cordage, ni barre, ni cabestan.
- Quatre canons et six barils, posés le long des bords.

### L'île aux Sept Courants

Correcte. Elle est hors du périmètre demandé et n'est pas touchée.

## Ce qui dépend des positions (à garder accessible)

**Les points d'interaction** :

- uniformes, bureau, trappe, échelle, manteau ;
- vestiaire, coffre, fenêtre ;
- sauts, échelles, descentes ;
- passerelle, retour, canons.

**Les rectangles** :

- le salon, où un invité n'est pas suspect ;
- la galerie et les archives.

**Les positions et les chemins** :

- les chemins et les postes des gardes ;
- les crabes ;
- la course de Silas sur les toits ;
- le pont : les barricades, les barils, les canons, Silas, la chaloupe ;
- l'entrée des quais ;
- la cellule de Silas.

Côté serveur, tout passe par `world.heist`, sans coordonnée écrite en dur. Les cinématiques utilisent des cases relatives
au coin de la pièce.

## Ce qui ne doit pas bouger

- **Les identifiants** : ceux des pièces, des portes et des décors du monde d'avant. La refonte est construite **en
  tout dernier** (après Port-Lanterne) : elle réutilise les enveloppes des pièces existantes et ajoute ses décors à
  la fin.
- **Les maisons des joueurs** : les six parcelles du quartier des Corsaires.
- **Les mécaniques** :
  - les sept étapes, les trois infiltrations, les préparatifs ;
  - la trahison, les trois itinéraires, les trois phases du combat, les trois fins ;
  - la confiance de Silas, les récompenses, les conséquences, les embuscades ;
  - les sauvegardes et le multijoueur.
- **`t_monde90`** vérifie que le reste du monde ne bouge pas d'une case. Les enveloppes reconstruites seront listées
  et exclues **explicitement**. Le test vérifiera que la liste est exactement celle-ci, et tout le reste du monde
  restera comparé case par case.

## Le plan

1. **Le moteur** :
   - des sols par zone (parquet, marbre, tapis, dalles humides, tuiles de formes variées, pont de navire) ;
   - un décor mural **choisi** pour chaque mur (plus aucun tirage au hasard dans ces lieux) ;
   - des décors au-dessus des personnages (lustres, cordes, linge, gréement) ;
   - une lumière d'extérieur pour les toits et le pont ;
   - des sons d'ambiance.
2. **La demeure**, reconstruite dans son enveloppe de 46 × 20 cases :
   - un vestibule de marbre avec l'escalier et le vestiaire ;
   - le grand salon ;
   - l'office des domestiques ;
   - le salon de jeu du capitaine Ferrant ;
   - une galerie à alcôves ;
   - les archives.
3. **Le quartier** :
   - la demeure remonte au nord, au-dessus d'un jardin clos de grilles ;
   - la ruelle devient un passage sous un porche ;
   - un portail gardé, une allée de lanternes, une terrasse sur la baie.
4. **La réception** : des groupes qui parlent entre eux, des domestiques qui servent par des chemins sans obstacle, des
   musiciens, des invités qui changent de groupe, et des réactions à la bagarre et à l'alarme.
5. **L'entrepôt** (en zones de stockage), **l'atelier** (une vraie pièce, plus grande), **la cave**, **les toits**
   (un quartier de toitures) et **la Mouche d'Or** (un vrai pont).
6. **Les vérifications** :
   - accès, collisions, chemins des PNJ et des cinématiques ;
   - les suites de tests existantes, et une suite nouvelle ;
   - captures avant/après.
