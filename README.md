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
- **Objets** : 103 objets (armes, pistolets, tromblon, mousquet, chapeaux, manteaux, bottes,
  talismans, nourriture, rhum, matériaux), raretés, équipement visible sur le personnage.
- **Quêtes** : 8 quêtes enchaînées (parler, tuer, collecter, explorer) jusqu'au boss, plus 4 primes répétables.
- **PNJ** : Capitaine Morgane, Isa la forgeronne (boutique), Bartholomé le tavernier (boutique),
  le vieux Gaspard, Léon le mousse, et Coco le perroquet.
- **Interface** : création du pirate, inventaire avec équipement, journal de quêtes, boutiques,
  dialogues, chat, minimap, carte.

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

- **Guidage** : une flèche dorée pointe toujours vers votre prochain objectif (quête, trésor, invasion), avec la distance.
- **Musique adaptative** composée en direct : chant de marins le jour, nappes sinistres la nuit, tambours dans le marais, percussions de guerre près des boss.
- **Météo** partagée par tous les joueurs : pluie et orages avec éclairs et tonnerre.
- **Pêche** (touche R) : sardines, dorades, poissons-lanternes la nuit, espadons par gros temps, bouteilles à la mer.
- **Cartes au trésor** : 4 fragments forment une carte ; creusez sur la croix rouge.
- **Forge d'Isa** : renforcez l'arme, le pistolet et l'armure jusqu'à +5.
- **Élites** : le Crabe-Roi (plage) et la Goule Alpha (jungle), avec leurs butins.
- **Invasion de la Marée Morte** : chaque nuit, trois vagues attaquent la plage du port, jusqu'au Capitaine Noyé.
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

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | se déplacer |
| Clic gauche | coup de sabre vers le curseur |
| Clic droit ou 1 | tirer |
| 2 à 5 | compétences |
| Espace | roulade |
| E | parler, ouvrir, ramasser, creuser, récolter, entrer, mettre à l'eau, accoster |
| Molette | zoomer, dézoomer |
| C / B | artisanat, construction |
| R | pêcher, puis ferrer |
| F | manger le meilleur soin |
| I / J / M / K / H | inventaire, quêtes, carte, hauts faits, aide |
| Entrée | chat (`/qui`, `/pos`, `/aide`) |

## Organisation du code

```
shared/            code commun au serveur et au client
  world.js         génération déterministe de l'île, collisions
  constants.js     constantes, cycle jour/nuit
  formulas.js      statistiques, expérience, apparence
  data/            objets, monstres, quêtes, PNJ, compétences, artisanat (craft.js)
server/
  game.js          simulation autoritaire (IA, combat, butin, quêtes, boutiques, chat)
  db.js            comptes et sauvegardes
  index.js         serveur HTTP + WebSocket
client/
  main.js          boucle du jeu, prédiction, interpolation, événements
  net.js           transports WebSocket et solo
  roomnet.js       multijoueur dans la page claude.ai (élection d'hôte)
  peernet.js       multijoueur direct entre navigateurs (page GitHub Pages)
  ui.js            interface HTML
  render/          moteur de rendu et pixel art procédural
scripts/
  build-artifact.mjs  assemble la page unique : claude.ai (dist/) ou GitHub Pages (--pages, docs/)
docs/              page publique GitHub Pages (générée)
```

## Ajouter du contenu

- Un objet : une entrée dans `shared/data/items.js` (l'icône vient de `client/render/sprites-items.js`).
- Un monstre : `shared/data/mobs.js`, son apparence dans `MOB_LOOKS` de `client/render/sprites-chars.js`,
  ses points d'apparition dans `spawnPlan` de `shared/world.js`.
- Une quête : `shared/data/quests.js`.
- Un PNJ : `shared/data/npcs.js` et sa position dans `shared/world.js`.
