# LStudio — 1. Audit technique et architecture

## 1. Ce qu'est le monde de Marée Morte aujourd'hui

**Une seule grande carte, générée par le code.** Le monde n'est pas un fichier : c'est une fonction, `generateWorld(7)`
dans `shared/world.js`. Elle fabrique toujours le même monde, case pour case (elle est déterministe), et le client
comme le serveur l'appellent chacun de leur côté. Tout ce qu'un joueur voit et traverse vient de là.

| Élément | Où il est | Format |
|---|---|---|
| La carte | une grille de 960 × 560 cases de 16 pixels | des tableaux d'octets, une valeur par case |
| Le sol | `tiles` | 22 types (mer profonde, eau, sable, herbe, jungle, terre, pavés, planches, marais, roche, sols et murs d'intérieur…) |
| Les régions | `zones` | 36 régions nommées (`ZONES`), dont 8 zones sûres |
| Les collisions | `solid` (bloque ou non), `block` (grilles, barricades) | une valeur par case |
| La navigation | `sail` | les cases où un bateau peut aller |
| Les décors | `props` : 11 754 objets, 193 types | `{ id, type, tx, ty, x, y, v }` ; leurs règles dans `PROPS` (solide, au sol, au-dessus) |
| Les bâtiments | des décors de type `cite`, `house`, `tavern`… | leur largeur, leur hauteur, leur porte |
| Les intérieurs | `rooms` : 91 pièces, dans une bande sous l'archipel | un rectangle par pièce, `roomGrid` dit à quelle pièce appartient chaque case |
| Les entrées | `doors` : 85 portes | le point dehors, le point dedans, la case de sortie |
| Les personnages, les coffres, les apparitions | `npcs` (89), `chests` (77), `spawns` (673 points de monstres) | des positions |

**Comment le monde est construit** : une suite de couches, chacune posée après la précédente — les îles, les villes,
les intérieurs, puis le braquage, le festival, le mobilier, Port-Lanterne, et enfin les lieux du braquage redessinés.
Chaque couche ajoute ses décors à la fin : les numéros des décors plus anciens ne bougent jamais. C'est ce qui rend
possible d'ajouter une couche de plus sans rien casser.

**Le rendu** (`client/render/`) : le sol est peint par blocs de 16 × 16 cases, mis en cache. L'eau est animée en
dessous. Les décors sont triés par profondeur avec les personnages ; certains sont au sol, d'autres au-dessus. Il n'y a
pas d'image : chaque sprite est dessiné par le code, pixel par pixel.

**Le déplacement** (`moveWithCollision`, `canStand`) ne regarde que `solid` et `block`, case par case.

**Ce qui dépend de quoi** : les portes relient le dehors et les pièces ; les quêtes, les cinématiques et les mécaniques
(braquage, festival, donjon) visent des pièces, des portes et des positions. Le test `t_monde90` garde le monde d'une
version à l'autre.

**Le jeu tourne sans serveur** : sur GitHub Pages (une seule page, `docs/index.html`, multijoueur direct entre
navigateurs) et sur claude.ai (une seule page). Le serveur Node existe, mais **il n'est pas utilisé** : LStudio ne
doit pas en dépendre.

## 2. Ce qu'il faut adapter

1. Le monde doit pouvoir recevoir **une couche de plus, décrite par un fichier** au lieu du code : c'est ce que
   produit LStudio.
2. Le jeu publié doit **charger ce fichier** au démarrage, sans serveur.
3. Le moteur de rendu doit savoir **placer un décor au sol, normal ou au-dessus**, et le **retourner** (miroir), décor
   par décor.
4. Il faut un **endroit pour l'outil**, qui ne gêne pas les joueurs.
5. Il faut un moyen de **publier** sans ligne de commande.

## 3. L'architecture retenue

### Le principe : LStudio écrit une couche, le jeu l'applique

LStudio ne crée pas une deuxième carte à côté du jeu. Il produit un **document de modifications** (le « monde
LStudio ») : des sols repeints, des régions, des collisions, des décors ajoutés, déplacés ou retirés. Le jeu
l'applique **en tout dernier**, après toutes ses couches, avec le même code partout (`shared/studio-world.js`).

- Le client, le serveur du mode solo et l'hôte d'une partie à plusieurs appliquent exactement le même document : ils
  voient le même monde.
- Un document vide ne change rien : le jeu d'aujourd'hui est intact.
- Les décors du monde existant sont désignés par leur numéro **et** par une empreinte (leur type et leur case). Si une
  future version du jeu déplaçait ce décor, la modification n'est pas appliquée à l'aveugle : elle est signalée.
- Les sauvegardes des joueurs ne sont jamais touchées. Un pirate enregistré sur une case devenue bloquante reparaît au
  point d'arrivée, comme aujourd'hui.

### Le format du document (version 1)

```
{ format: 'lstudio', version: 1,
  meta:    { nom, modifié le, … },
  couches: [ { id, nom, visible, verrouillée } ],
  sol:        { "x,y": "GRASS", … },      // les cases repeintes
  regions:    { "x,y": 1, … },            // la région de la case
  collisions: { "x,y": 1 | 0, … },        // 1 bloque, 0 libère (le dernier mot)
  navigation: { "x,y": 1 | 0, … },        // les bateaux peuvent y aller ou non
  decors:  [ { uid, type, x, y, v, dx, dy, plan, miroir, solide, couche, verrou, nom, donnees } ],
  retouches: { "<numéro d'un décor existant>": { ref: { type, x, y }, retire | x, y, v, dx, dy, plan, miroir } } }
```

Les intérieurs, les portes, les zones d'interaction et de transition, et les modèles viendront compléter ce format
aux lots suivants, sans changer ce qui existe (le numéro de version permet de faire évoluer le format).

**Version 2 (lot 2)** : trois listes de plus, rien d'autre ne change (un document de la version 1 se lit tel quel) :

```
  pieces: [ { uid, nom, x, y, w, h,                 // le coin du sol, et sa taille ; l'enveloppe de murs autour
              genre, sol: 'FLOOR' | 'STONEF', style, mur,  // le style par défaut ; style : un sol du moteur, mur : un style de mur
              sols: { "dx,dy": style }, murs: { "dx,dy": mur },   // case par case, relatifs au coin
              deco: [ { x, y, k, n, v } ],          // le décor mural : la case de sol au pied du mur, le genre, la largeur
              decoAuto, sortie, ambiance, dehors } ],      // sortie : la colonne de la sortie (-1 : aucune)
  portes: [ { uid, piece: "<uid d'une pièce>" | <numéro d'une pièce du jeu>,
              x, y | batiment: "<uid d'un bâtiment>", nom, sortie } ],
  zones:  [ { uid, type: 'message' | 'passage', x, y, w, h, bouton, titre, texte, auto, vers: { x, y } } ]
```

Les décors gagnent aussi une `emprise` facultative (`[largeur, hauteur]`) pour les meubles de plusieurs cases.

**Version 3 (lot 3)** : une liste de plus, `assets` (les images importées), et deux champs de pièce (`bord`, et des
tailles jusqu'à 200 × 72 cases pour les cartes à part) :

```
  assets: [ { id, nom, w, h,              // au plus 256 × 256 pixels
              pal: ['#rrggbb', …],         // au plus 255 couleurs
              px: "…",                     // les numéros de couleur (0 : transparent), par plages, en base 64
              remplace } ]                 // facultatif : l'élément du jeu que l'image habille
  decors: [ { type: 'image', donnees: { asset: '<id>' }, emprise, solide, … } ]
```

Une île peinte dans la mer devient une île du jeu, numérotée après les autres (`relabelIslands`, dans
`shared/world.js`). Les liaisons du monde (les îles, la grande mer, les portes, les passages) sont calculées par
`worldGraph` (`shared/studio-world.js`), pour la vue du monde et le contrôle.

Une pièce est creusée dans la bande des intérieurs, seulement là où il n'y a que du vide d'origine ; elle devient une
pièce du jeu (numérotée après toutes les pièces du jeu), et ses portes des portes du jeu (numérotées après toutes les
portes du jeu). Les zones sont lues par le client (`world.studioZones`) et le moteur vérifie chaque passage. Le jeu et
l'éditeur rebâtissent pièces, portes et zones d'un coup, dans l'ordre du document : le résultat ne dépend que du
document.

### Où vit LStudio

- **Une page à part**, `lstudio.html`, publiée à côté du jeu sur GitHub Pages. Elle n'est liée nulle part dans le
  jeu : les joueurs ne la voient pas.
- Elle réutilise **les vrais modules du jeu** : la génération du monde, le moteur de rendu du sol, les sprites. Ce que
  l'on voit dans l'éditeur est ce que le jeu dessine.

### La sauvegarde

- **Dans le navigateur (IndexedDB)** :
  - le brouillon, enregistré automatiquement à chaque modification ;
  - les versions enregistrées à la main, avec leur nom (l'historique) ;
  - la version de test.
- **Export et import** d'un fichier `.json` : une copie de sécurité, ou un transfert d'un ordinateur à l'autre.
- **Annuler et rétablir** chaque action, sans limite pratique.
- **Les modifications non enregistrées** sont signalées dans la barre du haut, et à la fermeture de la page.

### Brouillon, test, publié

- **Brouillon** : ce sur quoi l'on travaille.
- **Version de test** : figée, jouée dans le vrai jeu en solo, dans son propre navigateur (« Tester dans le jeu »).
- **Version publiée** : le fichier `docs/monde-studio.json` du dépôt, que le jeu charge pour tout le monde.
  - LStudio l'écrit lui-même dans le dépôt GitHub, avec une clé d'accès GitHub que l'administrateur colle une fois.
    Cette clé reste dans son navigateur : elle n'est ni dans le code ni dans le dépôt.
  - C'est GitHub qui réserve la publication à l'administration : sans droit d'écriture sur le dépôt, on ne peut rien
    publier.
  - Chaque publication est une version gardée dans l'historique du dépôt ; on peut revenir à n'importe laquelle.

### L'aperçu

« Tester dans le jeu » ouvre la vraie page du jeu, en solo, avec le document en cours. C'est le vrai moteur, les vraies
collisions et les vraies portes, et non une simulation.

### Le contrôle qualité

Il est partagé par LStudio et les tests automatiques :

- des décors hors de la carte ;
- des types de décors inconnus ;
- des retouches dont l'empreinte ne correspond plus ;
- des portes, des personnages, des coffres et des points d'apparition murés par les modifications ;
- des chevauchements de décors solides.

Chaque problème a son emplacement (on peut y aller d'un clic) et, quand c'est possible, une correction. Les problèmes
bloquants empêchent la publication.

## 4. Le découpage

| Lot | Contenu |
|---|---|
| **1 (celui-ci)** | Le format et son application au jeu ; le chargement par le jeu publié ; l'éditeur de carte : vue du vrai monde, navigation, quadrillage, couches, bibliothèque des décors, placement, sélection multiple, déplacement précis, propriétés, copier, coller, dupliquer, supprimer, verrouiller, plan et miroir, peinture du sol, des régions, des collisions et de la navigation, annuler et rétablir ; les sauvegardes (brouillon, versions, test, export, import, publication GitHub) ; l'aperçu dans le vrai jeu ; le contrôle qualité de base ; les tests ; un mode d'emploi |
| 2 | Les bâtiments et les intérieurs : nouvelles pièces, murs, portes et fenêtres, entrées reliées, mobilier, collisions des bâtiments ; les zones d'interaction et de transition |
| 3 | La vue du monde et ses connexions (régions, îles, liaisons, zones isolées) ; les modèles réutilisables ; la bibliothèque d'assets : importer et remplacer des images en pixel art |
| 4 | Le contrôle qualité avancé avec corrections proposées, les finitions, les tests complets, la livraison |
