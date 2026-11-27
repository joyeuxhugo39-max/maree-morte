# LStudio — livraison (version 2.4.0)

LStudio est l'éditeur du monde de Marée Morte. Il tourne dans le navigateur, à côté du jeu sur GitHub Pages
(`lstudio.html`), sans serveur. Il a été fait en quatre lots, chacun publié :

| Version | Lot | Rapport |
|---|---|---|
| 2.1.0 | 1. Le cœur : le format, l'éditeur de carte, les sauvegardes, l'aperçu, le contrôle | `rapports/ls2-lot1.md` |
| 2.2.0 | 2. Les bâtiments, les intérieurs, les portes, les zones | `rapports/ls3-lot2.md` |
| 2.3.0 | 3. Le monde, les modèles, les images | `rapports/ls4-lot3.md` |
| 2.4.0 | 4. Les personnages, le contrôle avancé, les finitions | ce rapport |

L'audit et l'architecture sont dans `rapports/ls1-audit-architecture.md`, le mode d'emploi dans `LSTUDIO.md`.

## Ce que ce dernier lot apporte

- **Des personnages** :
  - posés d'un clic, avec un nom, un titre, une direction ;
  - une apparence choisie parmi celles que le jeu sait dessiner, avec un aperçu sous leurs quatre faces ;
  - des répliques, des sujets de conversation, et de petites phrases dites dans une bulle quand on passe ;
  - en jeu, ils rejoignent les personnages du jeu : la même boîte de dialogue, le même codex, la même vérification de
    distance par le moteur ;
  - ils suivent leur pièce, et voyagent dans les modèles.
- **Les chemins coupés** : LStudio compare avec le monde d'origine ce qu'un pirate atteint à pied, depuis l'arrivée et
  depuis chaque côte où l'on accoste.
  - Une entrée, un personnage, un point d'arrivée ou un coffre qu'on atteignait et qu'on n'atteint plus est signalé, à
    son emplacement.
  - La correction désigne ce qui ferme le passage (le décor, la collision peinte, le sol repeint, le décor du jeu
    déplacé) et l'enlève.
- **Des corrections pour chaque référence cassée** :
  - une retouche d'un décor disparu ;
  - une porte vers une pièce supprimée, une zone sans arrivée ;
  - un personnage hors de la carte ;
  - une image illisible, l'habillage d'un élément inconnu ;
  - un décor qui flotte, un décor superposé.

  « 🧹 Corriger les références cassées » les corrige toutes d'un coup, en une action annulable.
- **Le même monde pour tous** :
  - chaque monde publié a une empreinte, que le jeu donne en se connectant ;
  - un pirate dont la page a un autre monde que l'hôte de la partie (publié entre-temps) en est averti, au lieu de jouer
    sur un monde différent ; ni rechargement en boucle, ni pages d'avant refusées ;
  - le serveur Node, s'il est utilisé, charge lui aussi le monde publié.
- **Un monde lourd se charge** : sur GitHub Pages, le jeu attend le monde publié jusqu'à 15 secondes, au lieu de 3 (sur
  claude.ai, le monde est dans la page). Le contrôle prévient au-delà de 1 500 Ko et bloque au-delà de 4 000 Ko.
- **Les finitions** :
  - la recherche dans tout le monde (pièces, personnages, zones, portes, décors nommés, repères, images, lieux, régions) ;
  - l'aide, ouverte au tout premier lancement ;
  - les raccourcis à jour (V, P, B, K, H).

## La mission, point par point

Légende :

- ✅ fait, utilisable et vérifié ;
- 🟡 fait, avec une limite dite clairement ;
- ⛔ impossible dans ce moteur sans le refaire (et pourquoi).

### 1. Intégration et architecture

- ✅ **L'accès réservé**
  - La page n'est liée nulle part dans le jeu.
  - La publication passe par une clé GitHub qui a le droit d'écrire dans le dépôt. Elle reste dans le navigateur, jamais
    dans le code ni le dépôt : c'est GitHub qui réserve la publication.
- ✅ **Un mode d'édition séparé** : une page à part, qui ne touche au jeu que par le monde publié.
- ✅ **Des sauvegardes fiables**, voir le point 10.
- ✅ **La compatibilité**
  - Le monde de LStudio est une couche appliquée par le jeu en tout dernier, par le même code partout : le jeu, le
    moteur du mode solo, l'hôte d'une partie, l'éditeur, les tests.
  - Un monde vide ne change rien. Les documents des versions 1 à 3 se lisent tels quels.
- ✅ **Une architecture extensible** : le format a un numéro de version (4 aujourd'hui), et chaque ajout s'est fait sans
  rien changer à ce qui existait.
- ✅ **Aucun système existant refait**
  - Les pièces sont des pièces du jeu, les portes des portes du jeu, les personnages des personnages du jeu.
  - Les images sont des sprites du moteur ; les sols, murs et décors muraux sont ceux du moteur de rendu.

### 2. L'éditeur de carte

- ✅ Créer et modifier, sur la vraie carte dessinée par le jeu.
- ✅ Le quadrillage, le zoom de 12,5 % à 400 %, la caméra (Espace, molette, carte réduite).
- ✅ Copier, coller, couper, supprimer ; la sélection multiple (Maj, cadre).
- ✅ Annuler et rétablir (1 000 actions) ; déplacer à la case, au pixel ou aux flèches.
- ✅ Les propriétés ; l'enregistrement ; l'aperçu.
- ✅ **Les grandes cartes sans ralentir**
  - De loin, la carte réduite ; les blocs de sol en cache.
  - Mesuré : un monde de 5 000 décors, 30 pièces et 30 personnages (825 Ko) s'ouvre dans l'éditeur en 0,7 s, et se
    contrôle en 0,1 s.
- 🟡 **Les dimensions** :
  - la grande carte du jeu (960 × 560 cases) ne s'agrandit pas ;
  - on crée des îles neuves dans la mer, et des cartes à part (jusqu'à 200 × 72 cases) sous l'archipel.

### 3. La bibliothèque de décors

- ✅ 182 éléments du jeu en 13 catégories, plus vos images.
- ✅ Les poser au clic ou par glisser-déposer.
- ✅ Les déplacer, les dupliquer, les supprimer, les verrouiller ; les couches ; le plan (au sol, normal, au-dessus).
- ✅ Les redimensionner : les bâtiments, et les meubles de plusieurs cases avec leur vraie emprise.
- 🟡 **Tourner** : le pixel art ne tourne pas. Chaque orientation est une variante dessinée, et il y a le miroir.

### 4. Les bâtiments

- ✅ Les dimensions, les murs (l'enveloppe et les cloisons), les portes et les fenêtres (le décor mural).
- ✅ Les entrées et les sorties, plusieurs par pièce.
- ✅ Les intérieurs, le mobilier, les collisions, les zones accessibles (le contrôle trouve les cases murées).
- ✅ Relier un intérieur à une entrée : depuis la porte dessinée d'un bâtiment, qui suit le bâtiment.
- ✅ Des modèles réutilisables : cinq bâtiments complets, et les vôtres.
- 🟡 **Les étages** : le moteur n'a pas d'étages superposés. Un étage est une autre pièce, reliée par un escalier
  (« ＋ Étage » le fait en un clic).

### 5. Les collisions et les zones

- ✅ **Dessiner** : les collisions (bloquer, libérer), la navigation, les régions, les zones de message et de passage,
  les entrées des bâtiments, les transitions (portes, passages).
- ✅ **Visibles en édition, invisibles en jeu**, une couleur par genre :
  - rouge, ce qui bloque ;
  - bleu, la navigation ;
  - jaune, les messages ;
  - violet, les passages ;
  - vert et bleu, les portes.
- ✅ Les limites de la carte, et l'eau (ce qui se traverse à pied ou en bateau).

### 6. La vue du monde et les liaisons

- ✅ **Les régions et les îles**, et ce qui les relie :
  - les bateaux (une île est accostable si sa côte touche la grande mer) ;
  - les portes ;
  - les passages.
- ✅ **Les points d'entrée et de sortie.**
- ✅ **Les zones isolées** : une île que les bateaux n'atteignent pas, un lieu dont l'entrée est hors d'atteinte, et les
  chemins à pied coupés.

### 7. La bibliothèque d'assets

- ✅ L'aperçu, les catégories, la recherche, le filtre, les dimensions, le nombre d'emplois.
- ✅ **L'import de pixel art**, vérifié :
  - au plus 256 × 256 pixels et 255 couleurs ;
  - des pixels opaques ou transparents ;
  - ramené à l'échelle 1 s'il a été agrandi ;
  - rien n'est dessiné ni retouché à votre place.
- ✅ **Le remplacement sans casser les références** :
  - une image garde son identifiant ;
  - elle peut aussi habiller un élément du jeu sans changer son type.
- 🟡 **Les limites des images** : une image par décor (pas d'animation), et un élément habillé perd sa lumière propre.

### 8. Les modèles

- ✅ **Cinq bâtiments complets**, originaux : maison de pêcheur, taverne, échoppe, entrepôt, petite demeure.
- ✅ **Vos modèles** :
  - n'importe quelle sélection ;
  - un bâtiment emporte son intérieur, ses étages, ses meubles, ses personnages et ses images ;
  - reposés en une action, exportés en fichier, relus ailleurs.

### 9. L'interface

- ✅ **La disposition** :
  - la carte au centre ;
  - à gauche, la bibliothèque, la peinture, les bâtiments, le monde ;
  - à droite, les propriétés, les couches, le contrôle ;
  - en haut, la barre d'outils et d'actions ;
  - la gestion des lieux : la liste des pièces, des intérieurs du jeu, des régions, des repères, et la recherche.

### 10. L'enregistrement et la sécurité

- ✅ **L'enregistrement automatique** du brouillon (à chaque modification) et l'enregistrement manuel (une version
  nommée).
- ✅ **L'historique, annuler et rétablir, les versions précédentes et leur restauration.**
- ✅ **L'export et l'import**, et les modifications non enregistrées signalées.
- ✅ **Jamais une carte ni une sauvegarde de personnage détruite** :
  - une copie de sécurité est faite avant toute restauration ou tout import ;
  - l'aperçu joue sur une copie du pirate ;
  - un pirate sauvegardé sur une case devenue impossible reparaît au point d'arrivée.
- ✅ **Brouillon, test et publié**, distincts.

### 11. L'aperçu

- ✅ **« Tester dans le jeu »** : le vrai jeu, en solo, avec le vrai moteur, les vraies collisions, les vraies portes et
  les vrais personnages.
  - Chaque lot l'a vérifié dans le navigateur : entrer dans une taverne, monter à l'étage, lire un message, prendre une
    porte sur une île neuve, parler à un personnage.

### 12. Le contrôle automatique

- ✅ **Ce qu'il trouve** :
  - hors de la carte ;
  - collisions incohérentes : entrées, arrivées, personnages et coffres murés ;
  - passages bloqués : chemins à pied coupés, passages qui mènent dans un mur ;
  - bâtiments sans entrée : pièce sans entrée, bâtiment dont la porte ne mène nulle part ;
  - transitions manquantes : portes et zones sans arrivée ;
  - références d'assets invalides : décors inconnus, images manquantes ou illisibles ;
  - cartes inaccessibles : îles et lieux isolés ;
  - zones déconnectées : cases murées dans une pièce ;
  - superpositions.
- ✅ **Comment il le dit** :
  - chaque problème a son emplacement et, quand c'est sûr, sa correction ;
  - il distingue ce qui est bloquant de ce qui est un avertissement ;
  - les problèmes bloquants empêchent la publication.

### 13. Les règles du développement

- ✅ **Aucun système existant détruit, aucun gameplay changé sans raison** :
  - les 40 suites du jeu passent ;
  - le monde sans document est identique au monde d'origine (`t_monde90`).
- ✅ **Pas de seconde architecture de carte** : une couche appliquée au monde du jeu.
- ✅ **Les formats existants réutilisés** : `rooms`, `doors`, `npcs`, les sprites, les styles.
- ✅ **Aucune dépendance ajoutée.**
- ✅ **Rien n'est remplacé en silence** :
  - une modification impossible est écartée et signalée ;
  - une retouche dont l'empreinte ne correspond plus n'est pas appliquée.
- ✅ **Documenté** : le mode d'emploi, l'audit, cinq rapports.

### 14. La méthode

- ✅ Audit, architecture, cœur, fonctions avancées, aperçu, tests, livraison, en quatre lots publiés l'un après l'autre.
- ✅ Chaque rapport dit ce qui marche, ce qui est vérifié, et ce qui ne l'est pas.

### L'objectif final

**Bâtir des îles, des villes et des intérieurs avec l'outil seul** : c'est possible aujourd'hui.

- Une île neuve dans la mer.
- Des bâtiments complets, avec leurs intérieurs, leurs étages et leurs habitants.
- Des cartes à part, reliées au monde.
- Le tout vérifié par le contrôle, essayé dans le vrai jeu, puis publié.

## Comment c'est vérifié

### Tests automatiques

**`t_studio40`** (nouveau, 20 vérifications) :

- **Le format** : les versions 1 à 3 se lisent ; chaque apparence proposée est dessinable.
- **Les personnages** :
  - ils rejoignent le monde et la liste des personnages du jeu ;
  - une apparence inconnue est ramenée à une apparence dessinable ;
  - le vrai moteur : on parle à Bertille, qui entre au codex, mais pas de loin ;
  - elle suit sa pièce et voyage dans un modèle ;
  - annuler la retire ;
  - le contrôle trouve un personnage dans un arbre, et un personnage muet.
- **Les chemins coupés** :
  - une palissade autour de la Sirène Borgne coupe le chemin vers son entrée et son tavernier ;
  - retirer la clôture désignée rouvre le chemin ;
  - des collisions peintes qui ferment le passage sont trouvées aussi ;
  - des décors qui ne ferment rien ne déclenchent rien.
- **Les références cassées** : cinq sortes, chacune avec sa correction ; appliquées d'un coup, en une action, elles
  disparaissent.
- **L'empreinte du monde** :
  - vide pour un monde vide, la même pour le même monde, une autre pour un autre ;
  - le moteur refuse un pirate venu d'un autre monde, sans boucle ;
  - une page d'avant est acceptée.
- **Le poids et les performances** :
  - un monde de 1 877 Ko est signalé ;
  - un monde de 5 000 décors est généré en 0,75 s, ouvert en 0,7 s, contrôlé en 0,1 s.

**Toutes les suites** : les 40 suites passent, dont `t_studio10` à `t_studio40` (LStudio, 93 vérifications en tout).

### Essais dans le navigateur (Chromium, scriptés)

Le parcours de ce lot a réussi, sans une erreur dans la page :

- **Dans LStudio** :
  - l'aide s'ouvre au premier lancement ;
  - Bertille est posée, nommée, habillée (un tricorne), et reçoit ses répliques, un sujet et ce qu'elle marmonne ;
  - la recherche la trouve, et trouve la Sirène Borgne ;
  - une palissade autour de la Sirène Borgne : le contrôle trouve deux chemins coupés, et « Supprimer ce décor » retire
    la clôture fautive, ce qui rouvre le chemin.
- **Dans le vrai jeu** :
  - Bertille est sur la place ;
  - elle marmonne sa phrase dans une bulle ;
  - E ouvre la conversation, avec sa réplique et son sujet.

Note honnête : la Nuit des Mille Voiles (le festival) était en cours dans le jeu, et sa scène d'accueil se lançait à
l'arrivée sur la place. Le jeu bloque les interactions pendant une scène, comme prévu ; le script la ferme avant de parler.

Captures : `rapports/captures/ls4-*.jpg`.

### Pas testé

- **La publication réelle sur GitHub** : elle demande ta clé personnelle, que je n'ai pas et ne dois pas avoir. Pour la
  première, essaie d'abord « Vérifier l'accès » dans la fenêtre « Publier ».
- **Safari et Firefox** : seul Chromium a été essayé.
- **Une vraie partie à plusieurs** avec un monde de LStudio : l'empreinte est vérifiée par les tests du moteur, mais je
  n'ai pas joué à deux navigateurs.

## Les limites qui restent (dans ce moteur)

- **La grande carte ne s'agrandit pas** : on la remplit (îles neuves, cartes à part).
- **Pas d'étages superposés** : des pièces reliées par des escaliers.
- **Les personnages de LStudio parlent**, mais ne donnent ni quêtes ni marchandises. Les quêtes du jeu sont écrites dans
  son code, avec leurs scènes et leurs récompenses.
- **Les monstres** apparaissent aux points posés par le jeu : une île neuve n'en a pas.
- **Le brouillon et vos modèles vivent dans le navigateur** : exportez-les de temps en temps.

## Les fichiers de ce lot

**Créés**

- `tests/t_studio40.mjs`, ce rapport, les captures `rapports/captures/ls4-*.jpg`.

**Modifiés**

- `shared/studio-world.js` :
  - le format 4 et les personnages ;
  - les chemins à pied (`walkReach`) et les chemins coupés ;
  - les corrections des références cassées ;
  - le poids du monde.
- `shared/world.js` : les personnages du monde, et l'empreinte du monde (`studioSignature`).
- `server/game.js` : le registre des personnages, et l'empreinte vérifiée à la connexion.
- `server/index.js` : le serveur Node charge le monde publié.
- `client/main.js` : les personnages qui marmonnent, et l'empreinte donnée à la connexion.
- `client/studio-load.js` : l'attente du monde publié sur GitHub Pages.
- `studio/editor.js`, `studio/batir.js`, `studio/main.js`, `studio/view.js`, `studio/prefabs.js`, `studio/index.html` :
  les personnages, la recherche, l'aide, les corrections.
- `shared/constants.js`, `package.json`, `tests/t_secu10.mjs` : la version 2.4.0.
- `LSTUDIO.md`, `README.md`, `rapports/ls1-audit-architecture.md`.
