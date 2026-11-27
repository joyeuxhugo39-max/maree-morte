# LStudio — le studio de création de Marée Morte

LStudio est l'éditeur du monde de Marée Morte. Il s'ouvre dans le navigateur, à côté du jeu, et modifie le vrai monde :
ce que vous voyez dans LStudio, c'est le jeu, dessiné par le jeu. Aucun serveur, aucune ligne de commande.

**Adresse** : `https://joyeuxhugo39-max.github.io/maree-morte/lstudio.html`. La page n'est liée nulle part dans le jeu : les
joueurs ne la voient pas.

## En deux minutes

1. **Ouvrez LStudio.** La première fois, il part du monde publié ; ensuite, il rouvre votre brouillon là où vous
   l'aviez laissé.
2. **Promenez-vous.**
   - La molette zoome.
   - Espace + glisser (ou le clic de la molette) déplace la vue.
   - L'onglet **Carte** mène à une région, un intérieur ou un de vos repères.
   - La petite carte, en bas à droite, se clique.
3. **Posez un décor.** Dans la **Bibliothèque**, cherchez « tonneau », cliquez dessus, puis cliquez sur la carte (ou
   glissez-le sur la carte). Échap pour arrêter.
4. **Modifiez-le.** Outil **Sélection** (touche V) : cliquez dessus. Ses propriétés s'affichent à droite. Glissez pour
   le déplacer, les flèches l'ajustent, Suppr le supprime.
5. **Bâtissez.** Onglet **Bâtiments** : choisissez « Taverne », cliquez sur l'archipel. La façade, son intérieur meublé
   et la porte qui les relie sont posés d'un coup (voir « Bâtir » plus bas).
6. **Agrandissez le monde.** Onglet **Monde** : « 🏝 Nouvelle île… », « 🧭 Nouvelle carte… », et la **vue du monde**
   pour voir ce qui est relié et ce qui est isolé (voir « Le monde » plus bas).
7. **Testez.** **▶ Tester dans le jeu** ouvre le vrai jeu, en solo, avec vos modifications.
8. **Publiez** quand c'est prêt (voir plus bas).

## Les outils

| Outil | Touche | Ce qu'il fait |
|---|---|---|
| Sélection | V | Cliquer : choisir un élément. Maj + clic : en ajouter un. Glisser dans le vide : un cadre de sélection. Glisser un élément : le déplacer, case par case ; avec Alt, au pixel près. |
| Poser | P | Pose l'élément choisi dans la bibliothèque, à chaque clic. **[** et **]** changent la variante, Alt pose au pixel près, clic droit ou Échap arrête. |
| Peindre | B | Peint, au pinceau de 1 à 9 cases, le **sol**, les **régions**, les **collisions** ou la **navigation**. Clic droit (ou « Gomme ») : revenir au monde d'origine. |
| Bâtir | K | Dans les pièces : les **cloisons**, le **style du sol**, le **style des murs**, le **décor mural** (fenêtres, tableaux…) ; partout : les **zones** (un message, un passage). Clic droit : effacer. |
| Main | H | Déplace la vue. |

**Raccourcis**

- Ctrl+Z, Ctrl+Y : annuler, rétablir (sans limite pratique).
- Ctrl+C, Ctrl+V, Ctrl+X : copier, coller, couper. Ctrl+D : dupliquer.
- Suppr : supprimer.
- Les flèches : déplacer d'une case (avec Alt : d'un pixel).
- M : miroir. L : verrouiller. G : quadrillage. F : centrer la vue sur la sélection.
- Ctrl+S : enregistrer une version.

## Les éléments et leurs propriétés

- **La bibliothèque** range les 182 éléments du jeu en 13 catégories : arbres, végétation, rochers, chemins, port,
  bâtiments, mobilier urbain, intérieurs, réserves, éléments de bord, éclairage, ce qui pend au-dessus des têtes, fête.
  - Chaque élément montre son vrai sprite, ses dimensions et le nombre de fois où il sert déjà dans le monde.
  - On peut chercher par nom, filtrer par catégorie, ou n'afficher que les éléments déjà utilisés.
- **Les propriétés** :
  - **case et décalage** : la position, à la case puis au pixel ;
  - **variante** : la forme de l'élément ; c'est aussi ainsi qu'on le « tourne », puisqu'en pixel art chaque
    orientation est un dessin à part ;
  - **plan** : au sol (sous les personnages), normal (trié en profondeur comme en jeu) ou au-dessus des personnages ;
  - **miroir** ;
  - **solidité** : selon l'élément, on passe au travers, ou toute son emprise bloque ;
  - **couche**, **nom**, **verrouillé**.
- **Les bâtiments** (catégorie « Bâtiments ») se redimensionnent : largeur, hauteur, colonne de la porte, style (palais,
  tonnellerie, voilerie…). Leur porte mène à un intérieur : « Créer son intérieur », dans leurs propriétés (voir « Bâtir »).
- **Les meubles de plusieurs cases** (un canapé, un buffet, une pile de tonneaux…) se posent par leur coin en haut à
  gauche : leur dessin couvre leurs cases, et leurs cases bloquent, comme dans les lieux du jeu.
- **Les décors d'origine du jeu** (les arbres, les maisons, les lanternes déjà là) se déplacent, se changent ou se
  retirent aussi. LStudio garde ces changements à part (des « retouches »), et le bouton « Rétablir l'original » les
  annule.
  - Si une future version du jeu déplaçait l'un de ces décors, la retouche ne s'appliquerait pas à l'aveugle : le
    contrôle la signale.
- **Les couches** (onglet de droite) rangent vos ajouts. On peut masquer une couche ou la verrouiller ; une couche
  verrouillée ne se sélectionne plus. La couche active est celle où vont les nouveaux décors.
  - La couche « Monde d'origine », ce sont les décors du jeu.
- **L'affichage** (onglet Couches) montre ou cache le quadrillage, les collisions (en rouge : ce qui bloque), les régions,
  la navigation (en bleu), les portes (vert : l'entrée dehors, bleu : l'arrivée dedans) et les personnages. Ces repères
  n'existent qu'en édition, jamais en jeu.

## Bâtir : les bâtiments, les intérieurs, les portes, les zones

Dans Marée Morte, un intérieur est une **pièce** rangée sous l'archipel, dans la « bande des intérieurs » ; on y entre
par une **porte** dont l'entrée est dehors, devant un bâtiment. LStudio fait la même chose, avec les mêmes règles que les
intérieurs du jeu : leur rendu, leur lumière, leurs sons, les portes, les déplacements.

**Le plus simple : un bâtiment complet.** Onglet **Bâtiments** → « Bâtiments complets » : une maison de pêcheur, une
taverne, une échoppe, un entrepôt, une petite demeure. Cliquez sur l'archipel : la façade, son intérieur meublé (déjà
rangé dans la bande des intérieurs) et la porte qui les relie sont posés en une seule action (un Ctrl+Z défait tout).
Tout se modifie ensuite.

**Une pièce à soi**

1. **Créer** : « ＋ Nouvelle pièce… » : son nom, sa taille (de 3 × 3 à 200 × 72 cases), son genre (maison, taverne,
   forge, grotte…, qui donne son style par défaut aux murs et au sol), le sol (plancher ou dallage), les styles. LStudio
   la range tout seul là où il y a de la place.
2. **La choisir** : cliquez sur son sol vide (ou dans la liste « Pièces de ce monde »). Ses propriétés s'affichent à
   droite : nom, genre, taille, position, sol, styles, la colonne de sa sortie, son ambiance, « à ciel ouvert » (une cour,
   un pont). Cliquez une seconde fois et glissez pour la **déplacer** : ses meubles, ses cloisons et ses zones la suivent.
3. **La meubler** : avec la Bibliothèque (catégorie « Mobilier d'intérieur »), comme partout ailleurs.
4. **La cloisonner** : outil **Bâtir** → **Murs**. Une cloison horizontale se dessine sur deux rangées (la face du mur se
   voit alors comme dans les intérieurs du jeu) ; laissez une ouverture pour passer.
5. **L'habiller** : **Sol** et **Style de mur** peignent, case par case, les sols et les murs que le moteur dessine
   (parquet, marbre, dalles, damas, lambris, pierre…). **Décor mural** accroche une fenêtre, un tableau, une
   bibliothèque, une carte… : cliquez sur un mur, ou au pied d'un mur.
6. **La relier** :
   - à un bâtiment posé dans LStudio : dans les propriétés du bâtiment, « Créer son intérieur » (une pièce à sa mesure),
     ou « Relier à une pièce existante » ; l'entrée part de la porte dessinée du bâtiment, et la suit s'il bouge ;
   - à un point quelconque du dehors : dans les propriétés de la pièce, « ＋ Entrée… », puis cliquez dehors (sur un
     bâtiment, ou une case libre : l'entrée d'une grotte, une trappe) ;
   - à une pièce du jeu : une porte peut aussi mener à une pièce d'origine (une deuxième entrée de la Sirène Borgne, par
     exemple). On en ressort par l'entrée d'origine.
7. **Un étage** : « ＋ Étage » ajoute une pièce et un escalier dans chacune (E pour monter, E pour descendre). Le moteur
   n'a pas d'étages superposés : un étage est une autre pièce, reliée par l'escalier, comme la cave de l'atelier de
   Lafleur dans le jeu.

**Les portes en jeu** : on entre en poussant contre la porte (ou avec E), on ressort par le seuil de la pièce. Une pièce
peut avoir plusieurs portes : chacune a sa colonne de sortie, et l'on ressort par celle dont on foule le seuil.

**Les zones** : outil **Bâtir** → **Zone**, tracez un rectangle.

- **Message** : un panneau, une inscription, une lettre oubliée. Le texte s'affiche dans la boîte de dialogue du jeu.
- **Passage** : il mène d'un point à un autre (d'une pièce à une autre, ou d'une pièce vers l'archipel) ; après avoir
  tracé la zone, cliquez là où il mène. Le moteur du jeu vérifie qu'on part bien de la zone.
- Une zone se déclenche avec la touche E (son bouton dit ce qu'elle fait), ou d'elle-même quand on y entre.

**Ce que l'on voit en édition seulement** : le contour des pièces de LStudio (rouge si elle est écartée), les zones
(jaune : un message ; violet : un passage, avec la flèche vers son arrivée), les entrées des portes. Rien de cela ne se
voit en jeu (onglet Couches → Affichage).

## Le monde : îles, cartes à part, liaisons

Le jeu n'a qu'une grande carte : l'archipel (960 × 448 cases), et sous lui, la bande des intérieurs (les pièces, les
grottes, les fonds marins). On ne l'agrandit pas : on la remplit.

- **Une île neuve** (onglet Monde → « 🏝 Nouvelle île… ») : son nom, sa taille, sa terre (herbe, jungle, sable, terre),
  sa région, et, si vous le voulez, un peu de végétation du jeu (palmiers, arbres, buissons, rochers). Cliquez ensuite en
  pleine mer : son centre. Elle a une plage et un haut-fond tout autour ; les bateaux y accostent. C'est une île du jeu
  comme les autres (la carte des pirates et sa brume la connaissent). Elle ne se pose qu'en pleine mer, et tout se
  retouche ensuite au pinceau.
- **Une carte à part** (« 🧭 Nouvelle carte… ») : un lieu de plein air, jusqu'à 200 × 72 cases, rangé sous l'archipel
  comme les grottes du jeu. Une crique cachée, un îlot secret, un souterrain… Son sol (herbe, sable, terre, grotte,
  pavés…), ce qu'on voit tout autour (la mer, des ruelles, des murs), le ciel du jour et de la nuit. On y va par une porte
  (« ＋ Entrée… ») ou par un passage. Elle se peint, se meuble et se bâtit comme le reste.
- **La vue du monde** (« 🗺 Vue du monde ») : tout l'archipel et la bande des intérieurs d'un coup d'œil.
  - Les îles : vertes si on peut les atteindre depuis l'arrivée des pirates (le point blanc), jaunes si vous les avez
    modifiées, rouges si personne ne peut y aller (aucun bateau n'y accoste).
  - Les lieux de LStudio, et ce qui les relie : les portes (en jaune), les passages (en violet). Les lieux du jeu
    s'affichent aussi, si vous le demandez.
  - La liste de ce qui est isolé, avec « Aller voir ». Cliquer sur la carte vous y emmène.
  - Les lieux du jeu où l'on arrive par une mécanique (la plongée, les scènes du braquage, le festival) ne sont pas
    comptés comme isolés.

## Vos modèles

Une maison meublée, un quai marchand, un jardin, une taverne avec son étage : enregistrez-les une fois, reposez-les
ailleurs autant de fois que vous voulez.

1. Sélectionnez les éléments sur la carte (un clic, Maj + clic, ou un cadre).
2. Dans leurs propriétés : **★ Enregistrer comme modèle…** (son nom ; avec ou sans le sol peint et les collisions
   dessous).
3. Onglet **Bâtiments** → « Vos modèles » : cliquez sur le modèle, puis sur la carte (son coin en haut à gauche).

- Un bâtiment de LStudio emporte son intérieur, ses étages, ses meubles, ses cloisons, ses zones et sa porte : reposé,
  il a sa propre pièce, rangée toute seule sous l'archipel.
- Un modèle posé, c'est une seule action : Ctrl+Z le défait entièrement.
- Les modèles sont rangés dans ce navigateur, pas dans le monde publié. « ⬇ » en exporte un dans un fichier ;
  « ⬆ importer » le relit, sur un autre ordinateur ou pour un autre monde (avec les images dont il se sert).

## Vos images (pixel art)

LStudio n'invente aucun dessin : vous importez le vôtre.

- **Importer** : dans la Bibliothèque, « ＋ Image ». Une image PNG, GIF ou WebP (pas de JPEG : il abîme les pixels).
- **Ce que LStudio vérifie** :
  - au plus 256 × 256 pixels (un décor de 16 × 16 cases) ;
  - au plus 255 couleurs ; au-delà, ce n'est pas du pixel art, et LStudio vous dit de réduire la palette ;
  - des pixels opaques ou transparents : un pixel à demi transparent devient l'un ou l'autre, et LStudio le dit ;
  - une image agrandie (chaque pixel devenu un carré de 2 × 2, 4 × 4…) est ramenée à l'échelle du jeu : un pixel de
    l'image = un pixel du jeu.
- **Poser** : vos images sont en tête de la Bibliothèque (« Vos images importées »). Elles se posent comme un décor : le
  pied du dessin au milieu du bas, sa rangée du bas bloque (réglable dans « Solidité »).
- **Habiller un élément du jeu** : à l'import, ou plus tard (⚙ sur l'image), choisissez un élément (un tonneau, une
  lanterne…). Tous ses exemplaires, ceux du jeu et les vôtres, prennent ce dessin. Son nom, sa solidité et son rôle ne
  changent pas. Retirez l'habillage : ils reprennent leur dessin d'origine.
- **Remplacer** (⚙ → « Remplacer le dessin… ») : l'image garde son identifiant ; tous les décors qui s'en servent
  suivent.
- **Le poids** : chaque joueur charge vos images au démarrage. Le contrôle prévient à partir de 600 Ko, et bloque au-delà
  de 2 000 Ko.

## Peindre

- **Le sol** change aussi ce qui bloque : la roche et la mer profonde arrêtent les pirates, l'eau peu profonde se
  traverse, une case de mer repeinte en herbe devient de la terre ferme (et les bateaux n'y passent plus).
- **Les régions** donnent son nom au lieu, ses monstres, sa musique, et disent si l'on y est en sûreté.
- **Les collisions** ont le dernier mot, quoi qu'il y ait dessous : un cadre rouge bloque, un cadre vert libère.
- **La navigation** dit où un navire peut aller. Peindre de l'eau suffit en général : ceci corrige les cas particuliers.

## Enregistrer, revenir en arrière

- **Le brouillon** est enregistré automatiquement dans ce navigateur, à chaque modification. En haut :
  « Brouillon enregistré à… ». Si vous fermez la page pendant un enregistrement, le navigateur vous prévient.
- **Enregistrer** (Ctrl+S) garde en plus une **version** nommée. Une version automatique est aussi faite toutes les dix
  minutes de travail.
- **Versions** : la liste, avec la possibilité de **restaurer** n'importe laquelle. Le brouillon actuel est toujours
  gardé d'abord en copie de sécurité : on ne perd jamais rien en restaurant.
- **☰ → Exporter** télécharge votre monde dans un fichier `.json` : c'est votre copie de sécurité hors du navigateur
  (à faire de temps en temps). **Importer** le recharge, sur ce navigateur ou sur un autre ordinateur.
- **Attention** : le brouillon et les versions vivent dans ce navigateur. Vider les données du site, ou changer
  d'ordinateur, les fait disparaître ; d'où l'export.

## Vérifier, tester, publier

- **✔ Vérifier** régénère le monde avec vos modifications, comme le fera le jeu, et cherche ce qui serait cassé :
  - un élément inconnu ou hors de la carte ;
  - une retouche qui ne correspond plus ;
  - une entrée de bâtiment bouchée ;
  - un personnage muré ;
  - un point d'arrivée des pirates bloqué ;
  - un coffre inaccessible ;
  - deux décors solides l'un sur l'autre ;
  - un décor qui flotte sur la mer ;
  - pour les bâtiments : une pièce, une porte ou une zone impossible (sur une pièce du jeu, vers rien…), une entrée
    bouchée dehors, une arrivée dans un mur, un passage qui mène dans un mur, une pièce sans entrée, des cases murées
    qu'on ne peut pas atteindre depuis l'entrée, un bâtiment dont la porte ne mène nulle part, un décor mural sans mur,
    un message vide.

  - pour le monde : une île que les bateaux n'atteignent pas, un lieu dont l'entrée est hors d'atteinte ;
  - pour les images : une image manquante ou illisible, des images trop lourdes, l'habillage d'un élément qui n'existe
    pas.

  Chaque problème a son emplacement (« Aller voir ») et, souvent, une correction en un clic. Les problèmes **bloquants**
  empêchent la publication ; les **avertissements**, non.
- **▶ Tester dans le jeu** ouvre la vraie page du jeu, en solo, avec vos modifications : vraies collisions, vraies portes,
  vrais personnages.
  - Votre pirate y est copié : rien de ce que vous faites pendant le test ne touche sa vraie sauvegarde.
  - Ce qui est ouvert ainsi est la **version de test**.
- **⬆ Publier** envoie le monde dans le jeu, pour tous les joueurs. LStudio écrit le fichier `docs/monde-studio.json` du
  dépôt GitHub du jeu ; le site se met à jour tout seul en une à deux minutes.
  - Il faut une **clé GitHub**, une seule fois. Sur github.com : votre photo → Settings → Developer settings → Personal
    access tokens → Fine-grained tokens → Generate new token.
    - Repository access : seulement le dépôt `maree-morte`.
    - Permissions → Contents : *Read and write*.
  - Collez la clé dans la fenêtre « Publier ». Cochez « Mémoriser » si vous voulez qu'elle reste sur cet ordinateur.
  - La clé n'est jamais écrite dans le jeu ni dans le dépôt. Sans droit d'écriture sur le dépôt, personne ne peut
    publier.
  - **Publications précédentes** liste les anciennes publications (l'historique du dépôt). On peut en rouvrir une comme
    brouillon, puis la republier : c'est ainsi qu'on revient à un monde publié antérieur.

**Brouillon, test, publié**

| | Où | Qui le voit |
|---|---|---|
| Brouillon | ce navigateur | vous, dans LStudio |
| Version de test | ce navigateur | vous, dans le vrai jeu (« Tester dans le jeu ») |
| Version publiée | le dépôt du jeu (`docs/monde-studio.json`) | tous les joueurs |

## Ce que LStudio ne fait pas encore

Prévus au lot suivant :

- **Des personnages** à placer (aujourd'hui, les tavernes se remplissent d'habitués toutes seules).
- **Le contrôle avancé** : les passages bloqués entre deux lieux d'une même île, et plus de corrections proposées.
- **Les finitions**.

## Pour qui voudrait comprendre comment c'est fait

- **Le document** : LStudio écrit un document de modifications (format décrit dans
  `rapports/ls1-audit-architecture.md`). Le jeu l'applique en tout dernier, avec le même code que l'éditeur
  (`shared/studio-world.js`). Un document vide ne change rien.
- **Les sources** de l'éditeur sont dans `studio/`. La page est fabriquée par `npm run build:studio` (ou `npm run build`).
- **Les tests** : `tests/t_studio10.mjs`, `tests/t_studio20.mjs` et `tests/t_studio30.mjs` vérifient qu'après une longue suite d'actions au
  hasard (décors, peinture, pièces, portes, zones, cloisons, styles), l'éditeur et le jeu ont exactement le même monde,
  et que tout annuler ramène le monde d'origine à l'octet près. Le second fait aussi entrer un pirate par la porte d'une
  pièce, monter un escalier et ressortir, avec le vrai moteur du jeu.
