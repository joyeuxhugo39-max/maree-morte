# LStudio — lot 3 : le monde, les modèles, les images (version 2.3.0)

Ce lot donne à LStudio la vue d'ensemble du monde et les moyens de l'agrandir (des îles neuves, des cartes à part), vos
propres modèles réutilisables, et l'import de votre pixel art. Le mode d'emploi est dans `LSTUDIO.md` (« Le monde »,
« Vos modèles », « Vos images »), le format dans `rapports/ls1-audit-architecture.md` (« Version 3 »).

## Ce qui fonctionne réellement

### Le monde

- **La vue du monde** (onglet Monde) :
  - tout l'archipel et la bande des intérieurs, d'un coup d'œil ;
  - les îles : atteignables, modifiées dans LStudio, ou hors d'atteinte ;
  - les lieux de LStudio et ce qui les relie : les portes, les passages ;
  - la liste de ce qui est isolé, avec « Aller voir ».

  Les liaisons sont calculées par une seule fonction, `worldGraph`, partagée avec le contrôle. Elle connaît :
  - les îles (la terre d'un seul tenant) ;
  - la grande mer, où vont les bateaux (une île est accostable si sa côte la touche) ;
  - les portes, dans les deux sens ;
  - les passages, dans un sens.

  Depuis l'arrivée des pirates, de liaison en liaison, elle dit ce qu'on atteint. Sur le monde du jeu : 25 grandes îles,
  toutes accostables et atteintes, calculées en 60 à 90 ms.
- **Une île neuve**, peinte en pleine mer seulement :
  - une forme ronde et irrégulière (la même île à la même place), une plage, un haut-fond, la terre choisie, la région
    choisie, un repère à son nom ;
  - si on le veut, de la végétation du jeu (palmiers, arbres, buissons, rochers ; rien de dessiné pour l'occasion).

  Le jeu en fait une île à part entière : elle est numérotée après les îles du jeu, dont aucune ne change de numéro (la
  carte des pirates et sa brume restent justes), et de la terre accolée à une île existante en fait partie.
- **Une carte à part** : le jeu n'a qu'une grande carte, qu'on ne peut pas agrandir. Une « carte neuve » est donc un
  lieu de plein air rangé sous l'archipel, comme les grottes et les fonds marins du jeu.
  - Elle va jusqu'à 200 × 72 cases.
  - On choisit son sol, ce qu'on voit tout autour (la mer, des ruelles, des murs) et le ciel du jour et de la nuit.
  - On y va par une porte ou un passage, et elle se bâtit comme le reste.
  - Le moteur de rendu dessine la mer (ou les ruelles) autour, à la place des murs.

### Vos modèles

- **« ★ Enregistrer comme modèle… »**, depuis n'importe quelle sélection : les décors, et, si on le veut, le sol peint et
  les collisions dessous.
- **Un bâtiment de LStudio emporte tout** : son intérieur, ses étages (de proche en proche, par leurs escaliers), ses
  meubles, ses cloisons, ses styles, son décor mural, ses zones, sa porte, et les images importées dont il se sert.
- **Reposer un modèle** (onglet Bâtiments, « Vos modèles ») est une seule action, qu'un Ctrl+Z défait entièrement.
  - Chaque pièce trouve sa propre place sous l'archipel.
  - S'il n'y a plus de place pour l'une d'elles, rien n'est gardé.
- **Le rangement** : les modèles sont rangés dans le navigateur, pas dans le monde publié. Ils se renomment, se
  suppriment, s'exportent en fichier et se réimportent.

### Vos images

- **« ＋ Image »** dans la Bibliothèque importe une image PNG, GIF ou WebP. LStudio vérifie :
  - au plus 256 × 256 pixels ;
  - au plus 255 couleurs, sinon il refuse en disant de réduire la palette ;
  - des pixels opaques ou transparents ;
  - une image agrandie est ramenée à l'échelle du jeu.

  Il le dit à chaque fois, et ne dessine ni ne retouche rien à votre place.
- **Le rangement** : l'image est rangée dans le document par sa palette et ses pixels, compressés par plages. Le jeu la
  redessine pixel pour pixel, sans lissage. Un poteau de 16 × 24 pixels tient en 400 caractères.
- **Les usages** :
  - **poser l'image comme un décor**, depuis « Vos images importées », en tête de la Bibliothèque ;
  - **habiller un élément du jeu** : tous ses exemplaires, ceux du jeu et les vôtres, prennent ce dessin, et son nom, sa
    solidité et son rôle ne changent pas. Les éléments qui ne sont pas des sprites de décor (bâtiments, maisons de
    joueurs, volcan, phare, navires) ne s'habillent pas ;
  - **la remplacer** (⚙) : elle garde son identifiant, et les décors qui s'en servent suivent ;
  - **la supprimer**, avec ses décors, ce qu'un Ctrl+Z annule.

### Le contrôle qualité

- **Bloquant** :
  - une image manquante (correction : supprimer le décor) ;
  - une image illisible ;
  - des images trop lourdes (plus de 2 000 Ko, que chaque joueur chargerait).
- **Avertissement** :
  - des images lourdes (plus de 600 Ko) ;
  - l'habillage d'un élément qui n'existe pas ;
  - une île peinte que les bateaux n'atteignent pas ;
  - un lieu dont l'entrée est hors d'atteinte.

## Comment c'est vérifié

### Tests automatiques

**`t_studio30`** (nouveau, 21 vérifications, dans `npm test`) :

- **Le format** : les documents des versions 1 et 2 se lisent tels quels ; un document plus récent est refusé.
- **Les images** :
  - une image est relue pixel pour pixel ;
  - une image de 1 024 couleurs et une image trop large sont refusées, avec ce qu'il faut faire ;
  - une image agrandie 4 fois est ramenée à 16 × 24 pixels.
- **Dans le jeu** :
  - le décor « image » est dessiné et sa case bloque ;
  - celui dont l'image manque est écarté et signalé ;
  - le contrôle trouve une image manquante, une image illisible, l'habillage d'un élément inconnu, et des images trop
    lourdes.
- **L'île neuve** :
  - refusée sur la terre ;
  - en pleine mer, c'est l'île n° 38, après les 37 du jeu, dont aucune ne change de numéro ;
  - l'éditeur et le jeu ont la même île et la même végétation ;
  - deux cases de sable accolées à la grande île en font partie.
- **Les liaisons** :
  - l'île neuve est accostable et atteinte ; les 26 grandes îles du jeu le sont ;
  - une île dont on ferme la navigation, et la carte dont l'entrée y est, sont signalées isolées.
- **La carte à part** de 150 × 60 cases : de plein air, d'herbe, bordée par la mer.
- **Les modèles** :
  - une taverne à étage (deux pièces, sa porte, ses escaliers, 27 meubles dont une image) est enregistrée puis reposée
    en une seule action ;
  - relue d'un fichier, elle se repose dans un autre monde, avec son image ; un fichier étranger est refusé ;
  - l'éditeur et le jeu restent identiques, et rien n'est bloquant au contrôle ;
  - la porte de la seconde taverne mène à sa propre salle ;
  - tout annuler ramène le monde d'origine à l'octet près.

**Les autres suites** : les 39 suites passent, dont `t_studio10` et `t_studio20` (les lots 1 et 2) et `t_monde90` (le
monde sans document n'a pas bougé).

### Essais dans le navigateur (Chromium, scriptés)

Le parcours complet a réussi, en 13 étapes, sans une erreur dans la page :

- **Dans LStudio** :
  - une image dessinée 4 fois trop grande est importée et ramenée à 16 × 24 pixels ;
  - elle est posée d'un clic, et sa case bloque ;
  - elle habille les tonneaux, ceux du jeu compris ;
  - une île neuve est peinte en pleine mer (813 cases, 57 arbres et rochers) ;
  - la vue du monde ne trouve rien d'isolé ;
  - une carte à part de 80 × 40 cases, bordée par la mer, est reliée à l'île neuve par une porte ;
  - une maison de pêcheur est enregistrée comme modèle puis reposée, avec son intérieur ;
  - le contrôle ne trouve rien.
- **Dans le vrai jeu** (« Tester dans le jeu ») :
  - le poteau importé est dessiné, et les tonneaux sont habillés ;
  - l'île neuve est l'île n° 38 ;
  - sur l'île, E devant la porte mène à la crique cachée.

Note honnête sur cet essai : au moment d'appuyer sur E, la scène d'accueil de la Nuit des Mille Voiles (le festival en
cours) s'était lancée, et le jeu bloque les interactions pendant une scène, comme prévu. Le script la clôt avant
d'entrer ; ce n'est pas un défaut du lot.

Captures : `rapports/captures/ls3-*.jpg`.

### Pas testé

- **La publication réelle sur GitHub** : elle demande ta clé personnelle.
- **Safari et Firefox**, et une partie à plusieurs : seul le solo dans Chromium a été joué.
- **Des images importées très nombreuses** dans une vraie partie (seule la limite de poids est vérifiée).

## Les limites connues

- **La grande carte ne s'agrandit pas** (960 × 560 cases) : on la remplit d'îles, et de cartes à part sous l'archipel.
- **Une île neuve n'a ni monstres, ni personnages, ni quêtes** : elle est faite pour être aménagée. Les monstres
  apparaissent selon des points posés par le jeu, et les personnages viendront au lot 4.
- **Une image qui habille un élément ne reprend pas sa lumière** : une lanterne habillée n'éclaire plus.
- **Les modèles vivent dans le navigateur** : exportez ceux que vous voulez garder.
- **Un décor « image » montre une seule image** (pas de variantes ni d'animation).

## Ce qui reste à faire

- **Lot 4** :
  - des personnages à placer ;
  - le contrôle avancé (les passages bloqués entre deux lieux d'une même île, plus de corrections proposées) ;
  - les finitions et la livraison.

## Les fichiers

**Créés**

- `studio/monde.js` : l'île neuve, la carte à part, la vue du monde.
- `studio/prefabs.js` : vos modèles (enregistrer, reposer, relire un fichier).
- `studio/assets.js` : l'import et l'analyse des images.
- `client/render/studio-assets.js` : les sprites des images, et l'habillage des éléments du jeu.
- `tests/t_studio30.mjs`, ce rapport, les captures `rapports/captures/ls3-*.jpg`.

**Modifiés**

- `shared/studio-world.js` :
  - le format 3 et les images (rangement, lecture, contrôle) ;
  - les liaisons du monde (`worldGraph`) et les lieux isolés ;
  - le bord des pièces et les grandes cartes.
- `shared/world.js` : le type de décor `image`, et la numérotation des îles neuves (`relabelIslands`).
- `client/render/renderer.js`, `client/render/terrain.js` : les images importées, la mer autour d'une carte à part.
- `studio/main.js`, `studio/editor.js`, `studio/batir.js`, `studio/view.js`, `studio/index.html`, `studio/studio.css` :
  l'interface.
- `shared/constants.js`, `package.json`, `tests/t_secu10.mjs` : la version 2.3.0.
- `LSTUDIO.md`, `README.md`, `rapports/ls1-audit-architecture.md`.
