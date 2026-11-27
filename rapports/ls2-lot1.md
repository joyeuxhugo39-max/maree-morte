# LStudio — lot 1 : le cœur de l'éditeur (version 2.1.0)

Ce lot pose les fondations de LStudio et livre un éditeur de carte utilisable dès maintenant. Le mode d'emploi est dans
`LSTUDIO.md`, l'audit et l'architecture dans `rapports/ls1-audit-architecture.md`.

**Adresse** : `lstudio.html`, à côté du jeu sur GitHub Pages. Tout se passe dans le navigateur : il n'y a pas de serveur.

## Ce qui fonctionne réellement

### Le lien avec le jeu

- **Le jeu lit le monde LStudio au démarrage.**
  - Sur GitHub Pages, il charge `monde-studio.json`, posé à côté de la page.
  - Sur claude.ai, où ce fichier n'est pas joignable, il utilise la version embarquée au moment de la fabrication de la
    page.
  - Un fichier illisible est ignoré : le jeu démarre alors sur son monde d'origine.
- **Le monde publié aujourd'hui est vide** (aucune modification) : le jeu est exactement celui de la 2.0.
- **La même fonction applique le document partout** (`shared/studio-world.js`) : le jeu, le serveur du mode solo,
  l'hôte d'une partie à plusieurs et l'éditeur.
- **Le moteur de rendu sait désormais**, décor par décor, le mettre au sol, normal ou au-dessus des personnages, et le
  retourner en miroir.

### L'éditeur

- **La vue de la carte** :
  - le vrai sol du jeu, les vrais sprites, les personnages, les portes ;
  - un zoom de 12,5 % à 400 %, à la molette ou aux boutons ;
  - des déplacements à la main, à Espace + glisser ou au clic de la molette ;
  - une carte réduite cliquable ;
  - de loin, une vue simplifiée, pour parcourir les 960 × 560 cases sans ralentir ;
  - au plus six blocs de sol neufs peints par image, le reste suivant aux images suivantes.
- **Le quadrillage**, et des calques d'affichage visibles seulement en édition, chacun de sa couleur : les collisions,
  les régions, la navigation, les portes, les personnages.
- **La bibliothèque** : 182 éléments du jeu en 13 catégories, avec leur aperçu, leurs dimensions et leur nombre
  d'emplois dans le monde ; la recherche par nom, le filtre par catégorie, le filtre « déjà utilisés ».
- **Poser** un élément, d'un clic ou par glisser-déposer, à la case ou au pixel près.
- **La sélection** : un clic, Maj + clic pour en ajouter, un cadre glissé pour en prendre plusieurs.
- **Modifier un élément** :
  - le déplacer à la souris, par cases ou au pixel près, ou aux flèches ;
  - le dupliquer, le copier, le coller, le couper, le supprimer ;
  - changer sa variante (c'est ainsi qu'on le « pivote » en pixel art) ;
  - régler son plan (au sol, normal, au-dessus), son miroir, sa solidité, sa couche, son nom ;
  - le verrouiller.
- **Les bâtiments** se redimensionnent : largeur, hauteur, colonne de la porte, et 17 styles.
- **Les décors d'origine du jeu** se déplacent, se changent ou se retirent aussi, par des « retouches » réversibles
  (« Rétablir l'original »). Chaque retouche garde l'empreinte du décor visé ; si elle ne correspond plus, la retouche
  est écartée et signalée.
- **Les couches** : créer, renommer, masquer, verrouiller, choisir la couche active, supprimer une couche vide.
- **La peinture**, au pinceau de 1 à 9 cases, avec une gomme qui ramène au monde d'origine :
  - le sol, avec 18 sols ;
  - les régions, avec les 36 régions du jeu ;
  - les collisions (bloquer ou libérer : le dernier mot) ;
  - la navigation.
- **Annuler et rétablir**, chaque action et chaque coup de pinceau ou glissement entier, sur 1 000 actions.
- **L'onglet Carte** : aller à des coordonnées, aller aux régions du monde et aux 91 intérieurs, poser ses propres
  repères.
- **La barre d'état** : la case sous la souris, son sol, sa région, sa pièce, ce qui bloque et ce qui navigue.

### Les sauvegardes

- **Le brouillon** s'enregistre automatiquement à chaque modification (IndexedDB), et la page prévient si on la ferme
  avant la fin d'un enregistrement.
- **Les versions** :
  - nommées (Ctrl+S) ;
  - automatiques, toutes les dix minutes, en gardant les 30 dernières ;
  - une copie de sécurité avant toute restauration, tout import et tout nouveau brouillon ;
  - la restauration de n'importe laquelle.
- **L'export et l'import** d'un fichier `.json`. Un fichier qui n'est pas un monde LStudio, ou qui a été fait par une
  version plus récente, est refusé.
- **La version de test**, jouée dans le vrai jeu.
- **La version publiée**, sur GitHub, avec l'historique des publications et leur réouverture comme brouillon.

### L'aperçu dans le vrai jeu

- « ▶ Tester dans le jeu » ouvre la vraie page du jeu, en solo, avec le document en cours.
- La sauvegarde du pirate y est copiée dans un espace à part : sa vraie sauvegarde n'est jamais réécrite.

### Le contrôle qualité

Il régénère le monde comme le fera le jeu, puis signale, avec la case et une correction quand c'est possible :

- **Bloquant** :
  - un décor inconnu, ou hors de la carte ;
  - un sol inconnu, ou hors de la carte ;
  - une entrée bouchée ;
  - un personnage muré ;
  - un point d'arrivée des pirates bloqué.
- **Avertissement** :
  - un coffre inaccessible ;
  - deux décors solides superposés ;
  - un décor posé sur la mer ou dans le vide ;
  - une retouche écartée.

Les problèmes bloquants empêchent la publication.

## Comment c'est vérifié

### Tests automatiques

**`t_studio10`** (nouveau, 17 vérifications, dans `npm test`) :

- **Le monde publié** : un document vide ne change pas une case, et le monde publié est valide.
- **Ce que le jeu applique** :
  - le sol, la région et la navigation (la mer repeinte en herbe se traverse à pied, plus en bateau) ;
  - les collisions, qui ont le dernier mot ;
  - le décor retiré, et le décor déplacé et retourné ;
  - les emprises d'un tonneau, d'un bâtiment de 6 × 4 et d'un lustre non solide ;
  - deux générations avec le même document donnent le même monde.
- **Les retouches** : une retouche à l'empreinte fausse, ou visant un décor disparu, est écartée et signalée.
- **L'éditeur et le jeu**, après 400 actions au hasard (poser, déplacer, retirer, retoucher, peindre, changer) :
  - ils ont le même sol, les mêmes régions, les mêmes collisions, la même navigation et les mêmes décors, case par
    case ;
  - tout annuler ramène le monde d'origine à l'octet près ; tout rétablir redonne le même monde.

  Ce test a d'ailleurs trouvé une vraie erreur pendant le lot, corrigée depuis : un décor d'origine retiré puis
  retouché était compté deux fois.
- **Le contrôle** trouve un décor inconnu, un décor hors de la carte, une entrée bouchée et une arrivée bloquée.
  Chacun est bloquant, situé, avec une correction.
- **Les fichiers** : un document exporté puis réimporté redonne le même monde, et les fichiers étrangers ou trop
  récents sont refusés.

**Les autres suites** : les 37 suites passent. `t_monde90` compare le monde sans document : le jeu d'origine n'a pas
bougé.

### Essais dans le navigateur (Chromium, scriptés)

- **Le démarrage** : 1,8 seconde, sans erreur.
- **Le parcours, en dix étapes, toutes réussies** :
  - poser un décor d'un clic : sa case bloque ;
  - le glisser de deux cases : l'ancienne case est libérée ;
  - annuler puis rétablir ;
  - dupliquer, changer la variante, mettre en miroir ;
  - peindre du sable d'un trait (24 cases) ;
  - recharger la page : le brouillon est intact ;
  - enregistrer une version ;
  - lancer le contrôle ;
  - ouvrir l'aperçu : le vrai jeu a le décor et le sable ;
  - jouer l'aperçu en solo, avec une sauvegarde à part.
- **Le contrôle** sur une caisse posée sur un point d'arrivée : un problème bloquant, que la correction proposée
  (supprimer la caisse) fait disparaître.

### Pas testé

- **La publication réelle sur GitHub**. Elle demande une clé personnelle, que je n'ai pas et ne dois pas avoir. Le code
  utilise l'API officielle du dépôt (lire le fichier, l'écrire, lister son historique). La fenêtre et la vérification
  d'accès sont faites, mais la première publication sera la tienne : je recommande d'essayer d'abord « Vérifier
  l'accès ».
- **Safari et Firefox** : seul Chromium a été essayé.

## Ce qui reste à faire

Prévu aux lots suivants :

- **Lot 2** :
  - les intérieurs : créer une pièce aux dimensions choisies, ses murs, ses portes et ses fenêtres ;
  - relier une entrée dehors à son intérieur ;
  - les collisions des bâtiments, et les étages, si le moteur le permet (il n'a pas d'étages aujourd'hui) ;
  - les zones d'interaction et de transition entre cartes.
- **Lot 3** :
  - la vue du monde : les régions, les îles, les liaisons, les zones isolées ;
  - créer une carte neuve ;
  - les modèles réutilisables ;
  - l'import et le remplacement d'images en pixel art.
- **Lot 4** :
  - le contrôle avancé : les passages bloqués entre deux lieux, les cartes inaccessibles, d'autres corrections
    proposées ;
  - les finitions et la livraison.

## Les limites connues

- **Le brouillon vit dans le navigateur.** Effacer les données du site, ou changer d'ordinateur, le fait perdre :
  exporter régulièrement (menu ☰). La page le dit dans son aide.
- **La publication passe par une clé GitHub** à créer une fois : c'est le prix de l'absence de serveur.
- **Un monde publié est lu par chaque joueur au démarrage du jeu.** Deux joueurs dont l'un a gardé une page ouverte
  depuis avant une publication ne verraient pas le même monde jusqu'au rechargement.
- **Retirer un ancien bâtiment du jeu peut laisser son emprise solide.** C'est le cas des maisons et tavernes d'origine,
  dont la solidité ne vient pas d'un décor. Il suffit alors de peindre « Libérer le passage ». Ces bâtiments ne sont
  pas dans la bibliothèque.
- **La rotation n'existe pas en pixel art.** Elle est remplacée par les variantes (chaque orientation est un dessin) et
  le miroir.
- **Les bâtiments posés sont des façades**, sans intérieur jusqu'au lot 2.
- **Le contrôle prend environ une seconde** : il régénère le monde entier pour voir exactement ce que verra le jeu.

## Les fichiers

**Créés**

- `shared/studio-world.js` : le format, l'application au monde, le contrôle qualité.
- `client/studio-load.js` : le chargement par le jeu.
- `studio/` : `index.html`, `studio.css`, `main.js`, `editor.js`, `view.js`, `store.js`, `catalogue.js`.
- `scripts/build-studio.mjs`, `docs/lstudio.html`, `docs/monde-studio.json` (le monde publié, vide).
- `tests/t_studio10.mjs`, `LSTUDIO.md`, ce rapport et l'audit, les captures `rapports/captures/ls-*.jpg`.

**Modifiés**

- `shared/world.js` : l'application du document, en tout dernier.
- `shared/heist-decor.js` : les cases solides de chaque meuble sont gardées.
- `client/main.js` : le chargement, et l'aperçu en solo.
- `client/net.js` : les sauvegardes de l'aperçu, à part.
- `client/render/renderer.js` : le plan et le miroir par décor.
- `client/render/sprites-cite.js` : les styles exportés.
- `scripts/build-artifact.mjs` : le monde publié embarqué dans la page.
- `package.json` : `build:studio`, version 2.1.0.
