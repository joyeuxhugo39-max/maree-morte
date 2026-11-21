# Lot 8 — Validation et livraison finale

Version **1.6.1**, publiée le 21 novembre 2026 : `main`, GitHub Pages et la page claude.ai (version 20).

C'est le dernier lot du dossier global. Il ne refait pas les lots précédents : il vérifie l'ensemble, corrige ce que
la vérification a trouvé, et livre le projet.

**Le lot 7 (« La Treizième Cloche ») n'a pas été fait, à ta demande.** Rien de ce qui le concerne n'existe dans le jeu,
et aucun test ne le prétend.

## 1. Ce qui est livré

| Lot | Version | Contenu | Rapport |
| --- | --- | --- | --- |
| 0 | 1.1.1 | état des lieux, tests de référence, branche `reference-1.1.1` | `rapports/lot0-etat-des-lieux.md` |
| 1 | 1.2.0 | navigation débloquée (partir depuis la barre, barre simple, monter et descendre avec E, trois boutons de secours), réseau et sauvegardes vérifiés | `rapports/lot1-stabilisation.md` |
| 2 | 1.2.0 | compte développeur sécurisé côté serveur, personnage laboratoire séparé, atelier et console | `rapports/lot2-outils-developpeur.md` |
| 3 | 1.3.0 / 1.3.1 | les 81 quêtes jouées de bout en bout, audit des boss et élites, équilibrage, lisibilité | `rapports/lot3-refonte-qualite.md` |
| 4 | 1.4.0 | moteur de cinématiques réutilisable, première démonstration | `rapports/lot4-cinematiques.md` |
| 5 | 1.5.0 | Le Plus Grand Braquage de Port-Lanterne | `rapports/lot5-braquage.md` |
| 6 | 1.6.0 | La Nuit des Mille Voiles | `rapports/lot6-mille-voiles.md` |
| 7 | — | **non fait** (décision de l'utilisateur) | — |
| 8 | 1.6.1 | validation, corrections, livraison | ce document |

Depuis la version de référence 1.1.1 : 89 fichiers ont changé (56 nouveaux, 33 modifiés), soit environ 10 300 lignes
ajoutées. Les pages générées ne sont pas comptées.

## 2. Lancer et déployer

### Les trois façons de jouer

| Mode | Commande ou lien | Qui fait autorité |
| --- | --- | --- |
| **Serveur Node** (le vrai MMO) | `npm start` (Node 22) | le serveur |
| **Page GitHub Pages** | `docs/index.html`, régénérée par `npm run build:pages` | le navigateur de l'hôte (liaison directe WebRTC) |
| **Page claude.ai** | `dist/maree-morte.html`, régénérée par `npm run build:artifact` | le navigateur de l'hôte élu |

### Variables du serveur Node

Elles sont toutes facultatives, et **aucune n'a de valeur dans le dépôt**.

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `PORT` | port HTTP et WebSocket | 3000 |
| `DATA_DIR` | dossier des comptes, sauvegardes, copies de secours, instantanés et journaux | `./data` |
| `MAX_PLAYERS` | nombre de joueurs maximum | 200 |
| `ADMIN_TOKEN` | active la console `/admin` (sans lui, elle est désactivée) | absent |
| `DEV_SECRET`, `DEV_ACCOUNTS`, `DEV_TTL_MIN` | outils développeur : secret, comptes autorisés, durée du jeton | absents (outils désactivés) |

### Commandes

```bash
npm test
```

```bash
npm run build
```

```bash
node scripts/charge.mjs 50 20
```

```bash
node scripts/restore.mjs
```

- `npm test` : les 32 suites de tests.
- `npm run build` : régénère les deux pages autonomes.
- `node scripts/charge.mjs 50 20` : test de charge, 50 pirates pendant 20 s.
- `node scripts/restore.mjs` : liste les instantanés ; voir § 6 pour restaurer.

## 3. Les tests, ce qu'ils couvrent et ce qu'ils ne couvrent pas

**Environnement** : un conteneur Linux, Node 22.23 et Chromium sans affichage (Playwright), à 1280 × 720 sauf
mention contraire. Aucune machine réelle, pas de son, pas d'humain.

### 3.1 Tests automatisés exécutés

| Commande | Résultat |
| --- | --- |
| `node --check` sur les 113 fichiers JavaScript du projet | 113 sur 113, aucune erreur |
| chargement de chacun des 40 modules serveur et partagés | 40 sur 40 |
| `npm test` | **32 suites, toutes réussies** (536 vérifications écrites), en 2 min 37 s |
| `node scripts/charge.mjs 10 15` | 10 connectés : tour moyen 1,2 ms (budget 50 ms), pire 8 ms, 6 Ko/s par pirate |
| `node scripts/charge.mjs 50 15` | 50 connectés : tour moyen 4,0 ms, pire 23 ms, 10 Ko/s par pirate, 38 Mo |

Les 32 suites couvrent :

- **Données** : quêtes, objets, monstres, boss, équipements, zones, navires, récompenses (`t_data11`).
- **Sauvegardes** :
  - écriture, version, copies de secours, refus d'écraser une version plus récente (`t_save10`) ;
  - **migration de vraies sauvegardes anciennes (`t_migration80`, nouveau, § 6)**.
- **Sécurité** : versions, essais limités, bannissement, reprise, duplication, téléportation, administration
  (`t_secu10`).
- **Droits développeur** (`t_dev20`) :
  - un joueur ordinaire, même avec le bon secret, est refusé ;
  - un jeton inventé est refusé ;
  - cinq essais ratés bloquent.
- **Navigation** : embarquer, partir, virer, s'arrêter, se dégager, rentrer au port, débarquer (`t_nav12`,
  `t_ships11`).
- **Quêtes** : les 81, toutes les branches, l'abandon, la reprise, la déconnexion (`t_quetes30`).
- **Boss** : phases, télégraphes, solo et groupe (`t_boss30`).
- **Équilibre** (`t_equilibre30`).
- **Braquage** : les trois préparatifs, les trois approches, le choix, la poursuite, le boss, les trois fins
  (`t_braquage50`).
- **Festival** : les cinq épreuves, la course, le bateau de location, le spectacle, les achats, les abus
  (`t_festival60`).
- **Cinématiques** (`t_cinema40`).
- **Les autres systèmes** : social, justice, arène, taverne, fonds marins, Bastion, saisons, économie, propriétés.

**Anti-duplication** : la vérification qu'une récompense ou un jeton ne peut pas s'obtenir deux fois est répartie dans
13 suites (braquage, festival, économie, propriétés, sauvegardes, sécurité, social, entre autres).

### 3.2 Parcours dans le navigateur, exécutés pour ce lot

| Parcours | Résultat |
| --- | --- |
| **Vrai serveur Node** (`npm start`, port de test), deux navigateurs | les deux pirates se voient et le chat passe. Alpha marche, Bravo la voit au même endroit. Alpha ferme l'onglet et Bravo ne la voit plus. Alpha revient, au même endroit. Un mauvais mot de passe est refusé. Aucune erreur de page |
| Console d'administration du vrai serveur | 403 sans jeton, 403 avec un faux jeton, état complet avec le bon (version 1.6.x, protocole 15) |
| Sauvegardes sur disque du vrai serveur | un fichier par compte, avec sa copie de secours. Mot de passe salé et haché, jamais en clair. Version de sauvegarde 10, champs du braquage et du festival présents |
| **Changement d'hôte** (page claude.ai, salle simulée) | l'hôte ferme la page. L'autre joueur se sait hôte en 1,1 s, garde son or (792), continue de marcher. Un troisième joueur le rejoint et ils se voient |
| **Navigation au clavier**, comme un joueur | monter à bord (E), prendre la barre (E), Espace deux fois (l'ancre se lève, demi-voile), virer au sud, « Rentrer au port », « Descendre à terre » |
| **Quatre tailles d'écran** (1024 × 768, 1280 × 720, 1366 × 768, 1920 × 1080) | 9 blocs d'interface visibles, aucun chevauchement, rien hors de l'écran |
| **Performance du rendu** | 60 images/s partout. Port-Lanterne 4,5 ms par image, Libertalia de nuit 4,4 ms, pleine mer 0,7 ms, **plage en fête pendant le spectacle 4,8 ms**. Mémoire 36 à 40 Mo |
| Le festival complet (lot 6, refait après les corrections) | 23 captures, aucune erreur |
| Le braquage complet (lot 5, refait pendant ce lot) | 26 captures, de l'entrepôt à l'île aux Sept Courants. Les cinq étapes de quête sont terminées (fin « tout garder »), aucune erreur de page |

### 3.3 Tests manuels réellement exécutés par un humain

**Aucun.** Tout est vérifié par scripts et par captures d'écran. Je regarde moi-même ces captures, mais ce n'est pas
une partie jouée.

### 3.4 Tests impossibles dans cet environnement

- **Écouter** la musique et les sons : je ne peux pas entendre.
- **Une vraie machine** : téléphone, petit portable, carte graphique réelle.
- **Le service public PeerJS** (GitHub Pages entre deux vraies personnes) : bloqué par le proxy. Il a été testé au
  lot 1 avec un serveur PeerJS local.
- **Un déploiement Render.**
- **Deux humains** qui jouent ensemble.

## 4. Ce que la validation a trouvé et corrigé

| Gravité | Problème | Correction |
| --- | --- | --- |
| Haute | **Un pirate tout neuf**, apparu pendant une édition du festival, voyait la scène d'accueil de Mira avant même son tutoriel. Trouvé sur le vrai serveur | la scène attend la fin du tutoriel (ou le niveau 3). Testé dans `t_festival60` |
| Moyenne | **Le test de charge ne mesurait plus rien depuis la 1.1** : il se connectait avec l'ancien protocole 10, et chaque pirate simulé était refusé | il lit maintenant le protocole courant et affiche le nombre de connectés. Mesures refaites (§ 3.1) |
| Basse | Les scripts de contrôle passaient par la plage en fête, et la scène d'accueil (une seule fois, comme prévu) bloquait la touche E | les scripts la marquent comme déjà vue. Ce n'était pas un défaut du jeu |

Aucune autre régression n'a été trouvée : syntaxe, imports, 32 suites, serveur réel, changement d'hôte, navigation,
écrans, performance.

## 5. Bugs corrigés et fonctionnalités, lot par lot

Le détail est dans chaque rapport. Les points principaux :

- **Lot 1** : le blocage de navigation (on ne savait pas partir et on ne pouvait pas descendre). Un poste qui se
  désynchronisait entre client et serveur.
- **Lot 3** :
  - une quête impossible en solo (« Marchandise discrète ») ;
  - un champion de la Fosse sans combat ;
  - deux quêtes sans conversation ou incohérentes ;
  - des zones de danger illisibles ;
  - des chevauchements d'interface à 1024 px ;
  - des sons qui ignoraient le réglage de volume.
- **Lot 4** : les scènes passaient sans cadrage commun. Il existe maintenant un moteur unique, passable,
  synchronisé, avec un vérificateur d'assets.
- **Lots 5 et 6** : deux grands contenus. Chaque rapport liste ce que le contrôle visuel a corrigé.
- **Lot 8** : § 4.

**Rien n'a été supprimé** du jeu existant. Le monde est seulement complété, après l'ancien : les lieux, les
collisions et les sauvegardes anciennes ne bougent pas.

## 6. Sauvegardes, migrations et retour en arrière

### La version de sauvegarde

Elle est à **10** depuis la 1.0. Chaque nouveau contenu (braquage, festival) est un champ facultatif : une
sauvegarde qui ne l'a pas se charge avec un état vierge.

### La migration, testée sur de vraies sauvegardes (`t_migration80`, nouveau)

J'ai fait tourner le code de quatre anciennes versions : **0.7.1, 0.8.1, 1.1.1 et 1.5.0**. Chacune a fabriqué la
sauvegarde d'un pirate qui a vécu : niveau 16, or, sac, équipement, quêtes faites et en cours, souvenirs des PNJ. Ces
fichiers sont dans `tests/fixtures/`.

La version 1.6.1 les recharge toutes, **sans aucune perte** :

- niveau et expérience ;
- or ;
- objets ;
- les 7 emplacements d'équipement ;
- 6 quêtes faites, 2 en cours ;
- souvenirs ;
- tutoriel non reproposé.

Elle les réécrit en version 10, puis les relit à l'identique. Le fichier d'origine n'est jamais touché : on travaille
sur une copie.

### Le retour en arrière, testé lui aussi

Une sauvegarde écrite par la 1.6 a été rechargée, puis réécrite, par le code de la **1.5.0** et par celui de la
**1.1.1**. Ces versions ne connaissent pas le festival, mais elles en gardent les données telles quelles. La 1.6 relit
ensuite le carnet intact : 333 jetons, la voile achetée, la voile portée.

### Procédure de retour en arrière (serveur Node)

1. Arrêter le serveur.
2. Remettre le code d'une version précédente :

   ```bash
   git checkout 2809724
   ```

   Ce commit est la 1.6.0 ; prendre `743f4b9` pour la 1.5.0. Toutes les versions depuis la 1.0 lisent les
   sauvegardes en version 10.
3. Pour revenir aussi aux données d'avant, lister les instantanés puis restaurer celui voulu :

   ```bash
   node scripts/restore.mjs
   ```

   ```bash
   node scripts/restore.mjs <instantané>
   ```

   L'état actuel est d'abord copié dans un instantané « avant-restauration » : rien n'est perdu. Un instantané est
   pris à chaque démarrage du serveur.
4. Redémarrer. Une version plus ancienne **refuse d'écraser** une sauvegarde d'une version de sauvegarde plus récente
   (`t_save10`).

### Pages GitHub et claude.ai

Chaque joueur garde sa progression dans son navigateur. Revenir à une page plus ancienne relit ces sauvegardes de la
même façon.

## 7. État de la musique

- **Aucun fichier audio n'existe** dans le projet, ni créé, ni réutilisé.
- Toute la musique est **composée par le code** (`client/music.js`) :
  - les styles de base du jeu (villes, mer, nuit, combats, boss) ;
  - **13 identités** écrites pour les lots 4 à 6, chacune avec ses mélodies notées à la main : neuf pour le braquage,
    quatre pour le festival.
- Le vérificateur de scènes signale à chaque scène l'« enregistrement manquant » et le repli sur la musique générée.
- **Encore à produire**, si l'on veut de vrais enregistrements : les 13 thèmes. Le cahier des charges est dans
  `rapports/lot4-cinematiques.md` (§ 7).
- **Jamais écoutée par moi** : la vérification est automatique (voix existantes, notes et durées valides, bon thème au
  bon endroit).

## 8. État des assets graphiques

- **Tout est dessiné par le code**, en pixel art : terrain, personnages, monstres, objets, icônes, navires, décors du
  braquage et du festival, interface. Aucune image externe n'est importée, donc aucune licence à vérifier.
- **Manquants, signalés** :
  - un geste « montrer du doigt » (remplacé par « se pencher ») ;
  - une animation de discours pour Mira ;
  - des portraits peints ;
  - aucune voix enregistrée.
- **Le contenu du lot 7** (Treizième Cloche : île, épave, souvenirs, le Sonneur) n'existe pas.

## 9. Problèmes restants, par gravité

| Gravité | Problème | Impact pour le joueur |
| --- | --- | --- |
| Critique (architecture) | Sur les pages GitHub et claude.ai, le navigateur de l'hôte fait autorité. La triche est possible, et le monde repart de zéro quand l'hôte change. Les progressions personnelles, elles, sont gardées | sur ces pages, un tricheur peut fausser une partie. Le serveur Node n'a pas ce problème |
| Haute (hébergement) | L'hébergement gratuit Render efface le disque à chaque déploiement : les comptes du serveur Node y sont perdus | il faut un disque persistant pour un vrai serveur public |
| Haute (contenu) | Le lot 7, La Treizième Cloche, n'est pas fait | la grande quête légendaire prévue n'existe pas |
| Moyenne | Aucun test par un humain : le ressenti de la barre simple, la difficulté réelle et la durée réelle des contenus restent à mesurer en jouant | des réglages pourraient s'avérer trop faciles ou trop durs |
| Moyenne | La musique n'a jamais été écoutée | un thème pourrait sonner mal sans qu'on le sache |
| Basse | `server/game.js` reste un gros fichier, même découpé en modules | aucun, pour le joueur |
| Basse | Le test `t_items08` dépend d'une position tirée au hasard (connu depuis le lot 0). Il a passé à chaque exécution de ce lot | aucun |

## 10. Fichiers de ce lot

- **Nouveaux** :
  - `tests/t_migration80.mjs` ;
  - `tests/fixtures/save-0.7.1.json`, `save-0.8.1.json`, `save-1.1.1.json`, `save-1.5.0.json` ;
  - ce rapport.
- **Modifiés** :
  - `server/festival.js` : la scène d'accueil attend le tutoriel ;
  - `scripts/charge.mjs` : le protocole courant et le nombre de connectés ;
  - `tests/t_festival60.mjs`, `tests/t_secu10.mjs` ;
  - `shared/constants.js`, `package.json` : version 1.6.1 ;
  - `README.md`.
