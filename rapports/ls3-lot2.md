# LStudio — lot 2 : les bâtiments et les intérieurs (version 2.2.0)

Ce lot apprend à LStudio à bâtir : créer des intérieurs, les cloisonner, les habiller, les relier au dehors par des
portes, les superposer en étages, et poser des zones de message et de passage. Le mode d'emploi est dans `LSTUDIO.md`
(« Bâtir »), le format dans `rapports/ls1-audit-architecture.md` (« Version 2 »).

## Ce qui fonctionne réellement

### Dans le jeu (le même code partout : `shared/studio-world.js`)

- **Une pièce de LStudio est une pièce du jeu.**
  - Elle est creusée sous l'archipel, dans la bande des intérieurs, seulement là où il n'y a que du vide d'origine : son
    sol, son enveloppe de murs, sa sortie dans le mur du bas.
  - Elle prend un numéro après les 91 pièces du jeu, et ses portes un numéro après les 85 portes du jeu : aucune pièce,
    aucune porte du jeu ne bouge, ni son numéro.
  - Le moteur de rendu, la lumière, les sons d'ambiance, les portes et les déplacements la traitent comme les
    intérieurs d'origine : ce sont les mêmes règles.
  - Son genre (maison, taverne, forge, grotte…) donne son style par défaut. Ses sols et ses murs se choisissent case par
    case, parmi ceux que le moteur dessine déjà (la refonte 2.0 du braquage). Son décor mural est choisi mur par mur.
- **Une porte** relie un point du dehors à une pièce.
  - Liée à un bâtiment posé dans LStudio, elle part de sa porte dessinée, et le suit s'il bouge.
  - Elle peut mener à une pièce du jeu : c'est une deuxième entrée, qui arrive où arrive l'entrée d'origine.
  - Une pièce peut avoir plusieurs portes, chacune avec sa sortie. Le client du jeu ressort désormais par la porte dont
    on foule le seuil, au lieu de la première trouvée (pour les pièces d'origine, qui n'ont qu'une porte, rien ne
    change).
- **Les zones**, lues par le client :
  - un **message** s'affiche dans la boîte de dialogue du jeu ;
  - un **passage** mène d'un point à un autre ; le moteur (`server/game.js`, message `passage`) vérifie qu'on part bien
    de la zone, dans la même pièce, et qu'on arrive debout.
  - Une zone se déclenche avec E, ou d'elle-même en y entrant.
- **Ce qui est impossible est écarté et signalé**, jamais appliqué à moitié :
  - une pièce sur une pièce du jeu, hors de la bande, trop petite, ou sur une autre pièce ;
  - une porte vers rien, ou dont l'entrée n'est pas dehors ;
  - un passage sans arrivée, une zone hors de la carte.
- **Les sauvegardes** : si une pièce disparaît du monde publié, un pirate sauvegardé dedans reparaît sur l'archipel,
  debout. C'est le comportement du jeu pour toute case devenue impossible, vérifié ici.

### Dans LStudio

- **L'onglet « Bâtiments »** :
  - **cinq bâtiments complets** (maison de pêcheur, taverne, échoppe, entrepôt, petite demeure) : la façade, son
    intérieur meublé et la porte, en une seule action. Ce sont des plans originaux, faits des meubles et des décors du
    jeu ;
  - **« ＋ Nouvelle pièce… »** : nom, taille, genre, sol, styles ; la pièce est rangée toute seule là où il y a de la
    place ;
  - la liste des pièces de ce monde, avec celles qui n'ont pas d'entrée.
- **L'outil Bâtir** (touche K) :
  - **Murs** : les cloisons, au pinceau, dans les pièces ;
  - **Sol** et **Style de mur** : peints case par case ;
  - **Décor mural** : 22 décors (fenêtres, tableaux, miroirs, bibliothèques, cartes, tapisseries…) avec leurs variantes,
    accrochés d'un clic sur le mur ;
  - **Zone** : un rectangle tracé à la souris ; pour un passage, on clique ensuite là où il mène.
- **La sélection et les propriétés** :
  - une **pièce** (un clic sur son sol vide) : nom, genre, taille, position, sol, styles, décor au hasard, sortie,
    ambiance, à ciel ouvert ; ses entrées ; « ＋ Entrée… », « ＋ Étage », « Supprimer la pièce » (avec son contenu,
    annulable) ;
  - une **porte** (un clic sur son entrée) : nom, pièce où elle mène, entrée dehors ou bâtiment, colonne de sortie,
    « Aller dehors », « Aller dedans » ;
  - une **zone** : genre, bouton, titre, texte, déclenchement, place, taille, arrivée choisie sur la carte ;
  - un **bâtiment** : son nom en jeu, « Créer son intérieur », « Relier à une pièce existante ».
- **Déplacer une pièce** (la glisser une fois sélectionnée, ou ses coordonnées) emporte ses meubles, ses cloisons
  peintes, ses zones et les arrivées des passages qui y mènent. Une place occupée est refusée : rien ne bouge.
- **Les meubles de plusieurs cases** (canapé, buffet, piles de tonneaux et de caisses, bureau, vitrine…) se posent
  désormais avec leur vraie emprise, comme dans les lieux du jeu : leur dessin couvre leurs cases, et leurs cases
  bloquent.
- **Ce qui ne se voit qu'en édition** : le contour et le nom des pièces, les zones (jaune : message ; violet : passage,
  avec la flèche vers l'arrivée), l'entrée des portes.
- **Tout est annulable**, y compris un bâtiment complet ou un étage (une seule action chacun).

### Le contrôle qualité, pour les bâtiments

- **Bloquant** :
  - une pièce, une porte ou une zone écartée ;
  - une entrée bouchée dehors ;
  - une arrivée dans un mur ou un meuble (correction : retirer le décor qui bouche, sinon libérer la case) ;
  - un passage qui mène dans un mur.
- **Avertissement** :
  - une pièce sans entrée ;
  - des cases d'une pièce qu'on ne peut pas atteindre depuis l'entrée (le nombre, et la première) ;
  - un bâtiment dont la porte ne mène nulle part (correction : « Créer son intérieur ») ;
  - un décor mural accroché à aucun mur (correction : le décrocher) ;
  - un message vide ;
  - une zone où l'on ne peut pas se tenir.
- **Au passage, une correction du lot 1** : le contrôle des coffres signalait à tort des coffres d'origine collés contre
  un mur. Il regarde désormais les quatre cases qui touchent le coffre.

## Comment c'est vérifié

### Tests automatiques

**`t_studio20`** (nouveau, 35 vérifications, dans `npm test`) :

- **Le format** : un document de la version 1 se lit tel quel.
- **Ce que le jeu applique** :
  - la pièce est creusée case par case (son sol, ses murs, sa sortie), avec son nom, son genre, ses styles case par case
    et son décor mural ;
  - la porte du bâtiment arrive dehors devant sa porte dessinée, et dedans au seuil ;
  - la porte vers la Sirène Borgne arrive où arrive son entrée d'origine ;
  - les zones sont lues ;
  - les pièces et portes du jeu ne bougent pas, ni leurs numéros, et l'archipel ne change pas hors du bâtiment posé ;
  - déplacer le bâtiment déplace son entrée.
- **L'impossible** : dix cas, tous écartés et signalés en bloquant ; la Sirène Borgne reste intacte.
- **Le vrai moteur** (`server/game.js`, sans navigateur) :
  - devant le bâtiment, on entre, on arrive dans la salle ;
  - l'escalier mène au grenier, et l'on n'y passe pas depuis ailleurs ;
  - on redescend, puis on ressort devant le bâtiment ;
  - un pirate sauvegardé dans une pièce supprimée reparaît sur l'archipel.
- **L'éditeur et le jeu**, après 300 actions au hasard (créer, déplacer, redimensionner, supprimer des pièces ; des
  cloisons, des styles, du décor mural, des meubles, des portes, des zones ; déplacer le bâtiment) :
  - ils ont le même sol, les mêmes murs, la même solidité et les mêmes pièces case par case ;
  - et les mêmes pièces (nom, genre, styles, décor mural), les mêmes portes, les mêmes zones, les mêmes décors ;
  - tout annuler ramène le monde d'origine à l'octet près, avec ses 91 pièces et ses 85 portes, pas une de plus ; tout
    rétablir redonne le même monde.
- **Déplacer une pièce** emporte son contenu, et elle est refusée sur une pièce du jeu ; 40 grandes pièces trouvent
  chacune leur place.
- **Le contrôle** trouve les sept problèmes d'un monde mal bâti, et ses corrections les font disparaître.
- **Chaque bâtiment complet** : rien de bloquant, tout son sol accessible, et l'on y entre par la porte. Ce test a
  d'ailleurs trouvé un défaut de la taverne pendant le lot (le passage derrière le comptoir était muré par les tonneaux),
  corrigé depuis.
- **« Créer son intérieur » et « ＋ Étage »** : la bonne pièce, la bonne porte, l'escalier, rien de bloquant.

**Les autres suites** : les 38 suites passent, dont `t_studio10` (le lot 1) et `t_monde90` (le monde sans document
n'a pas bougé).

### Essais dans le navigateur (Chromium, scriptés)

Le parcours complet a réussi, en 14 étapes, sans une erreur dans la page :

- **Dans LStudio** :
  - l'onglet Bâtiments propose ses cinq bâtiments ;
  - la taverne est posée d'un clic (façade, intérieur, 25 meubles, porte : une action) ;
  - un clic sur son sol vide la sélectionne ;
  - une cloison est tracée, puis annulée ;
  - un tableau est accroché au mur du fond ;
  - une zone de message est tracée et son texte écrit ;
  - un étage est ajouté ;
  - le contrôle ne trouve rien de bloquant.
- **Dans le vrai jeu** (« Tester dans le jeu », en solo) :
  - le jeu a les deux pièces, la porte et les trois zones ;
  - on pousse contre la porte de la taverne et l'on entre ;
  - E dans la zone affiche le message ;
  - E sur l'escalier fait monter à l'étage ;
  - on redescend, puis on ressort par le seuil, devant la taverne.

Captures : `rapports/captures/ls2-*.jpg`.

### Pas testé

- **La publication réelle sur GitHub** (comme au lot 1) : elle demande ta clé personnelle.
- **Safari et Firefox** : seul Chromium a été essayé.
- **Une partie à plusieurs** avec des pièces de LStudio : le code est le même que pour le solo (le moteur tourne chez
  l'hôte), mais je ne l'ai pas joué à deux navigateurs.

## Les limites connues

- **Pas d'étages superposés** : le moteur n'en a pas. Un étage est une autre pièce, reliée par un escalier (comme la cave
  de l'atelier de Lafleur).
- **Pas de personnages** à placer dans les pièces pour l'instant. Les tavernes se remplissent toutes seules d'habitués,
  comme celles du jeu.
- **Les pièces d'origine du jeu ne se redessinent pas** dans LStudio : on peut y ajouter des meubles et une deuxième
  entrée, pas changer leurs murs ni leurs styles.
- **Une deuxième entrée vers une pièce du jeu** ramène dehors par l'entrée d'origine.
- **Une porte part toujours du dehors**. D'une pièce à une autre, on passe par une zone de passage.
- **Une cloison d'une seule rangée** se voit comme un muret ; pour un vrai mur, deux rangées (c'est dit dans l'outil).
- **Les fenêtres et tableaux** ne s'accrochent qu'aux murs des pièces de LStudio.

## Ce qui reste à faire

- **Lot 3** :
  - la vue du monde et ses connexions ;
  - créer une carte neuve ;
  - vos propres modèles (enregistrer une sélection pour la reposer ailleurs) ;
  - l'import et le remplacement d'images en pixel art.
- **Lot 4** :
  - le contrôle avancé (les passages bloqués entre deux lieux, les cartes inaccessibles) ;
  - des personnages à placer ;
  - les finitions et la livraison.

## Les fichiers

**Créés**

- `studio/batir.js` : l'onglet Bâtiments, l'outil Bâtir, la sélection et les propriétés des pièces, portes et zones.
- `studio/modeles.js` : les bâtiments complets, « Créer son intérieur », « ＋ Étage ».
- `tests/t_studio20.mjs`, ce rapport, les captures `rapports/captures/ls2-*.jpg`.

**Modifiés**

- `shared/studio-world.js` :
  - le format 2 ;
  - les pièces, les portes et les zones (`setStructure`) ;
  - l'emprise des meubles ;
  - le contrôle des bâtiments ;
  - la correction du contrôle des coffres.
- `shared/world.js` : les pièces, portes et zones passées à LStudio ; `world.studioZones`.
- `server/game.js` : le message `passage`.
- `client/main.js` : les zones de LStudio (E, ou en entrant), et la sortie par la bonne porte.
- `studio/editor.js` : les pièces, les portes, les zones, annulables ; les opérations de l'éditeur de bâtiments.
- `studio/main.js`, `studio/view.js`, `studio/index.html`, `studio/studio.css`, `studio/catalogue.js`, `studio/store.js` :
  l'interface.
- `shared/constants.js`, `package.json`, `tests/t_secu10.mjs` : la version 2.2.0.
- `LSTUDIO.md`, `README.md`, `rapports/ls1-audit-architecture.md`.
