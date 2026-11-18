# Lot 0 — État des lieux (version de référence 1.1.1)

Version de référence : commit `8e2aee1`, conservée dans la branche `reference-1.1.1`. Le proxy git de
l'environnement refuse de pousser les étiquettes, d'où la branche plutôt qu'un tag.

## Architecture réelle

- **Un seul moteur de jeu faisant autorité**, `server/game.js` (classe `Game`, environ 3 200 lignes), complété par des
  modules fusionnés dans son prototype :
  - `social` : chat, groupes, équipages, échanges ;
  - `justice` : JcJ, prison, réputation ;
  - `events` : invasions ;
  - `arena` : la Fosse ;
  - `tavern` : jeux de taverne ;
  - `naval` : coques, chantier ;
  - `ships` : navires ;
  - `dungeonLogic` : le Bastion ;
  - `sea` : plongée ;
  - `seasons` : concours, Grand Tour.
- **Ce même moteur tourne à quatre endroits :**

  | Mode | Où tourne le moteur | Sauvegardes |
  |---|---|---|
  | Serveur Node | `server/index.js`, WebSocket | `server/db.js` : fichiers JSON, mots de passe scrypt, copies de secours, instantanés, console `/admin` si `ADMIN_TOKEN` |
  | Solo | dans le navigateur (`LocalNet`) | localStorage |
  | Page claude.ai | navigateur d'un joueur élu hôte (`RoomNet`) | chaque joueur garde sa progression dans son navigateur |
  | Page GitHub Pages | navigateur d'un joueur hôte, liaison directe WebRTC (`PeerNet`, PeerJS) | chaque joueur garde sa progression dans son navigateur |

- **Données partagées :** `shared/data/*` (quêtes, objets, monstres, PNJ, scènes, acte III, lieux, saisons, navires).
  Le monde est généré de façon déterministe (`shared/world.js`, 960 × 560 cases).
- **Client :**
  - `client/main.js` : boucle, prédiction, interpolation ;
  - `client/ui.js`, `social-ui.js`, `tavern-ui.js` : interface ;
  - rendu en `client/render/*` : terrain, sprites procéduraux, navires, éclairage ;
  - `scene.js` : dialogues joués ; `cine.js` : cinématiques des boss ;
  - `audio.js`, `music.js` : sons et musiques synthétisés (Web Audio).
- **Build :** `scripts/build-artifact.mjs` produit deux pages autonomes, `dist/maree-morte.html` (claude.ai) et
  `docs/index.html` (GitHub Pages).

## Inventaire (mesuré par `t_data11`)

- **Contenu :**
  - 81 quêtes, dont les types d'objectifs : 51 « tuer », 25 « parler », 22 « ramasser », 7 « explorer », 4 « agir » ;
  - 256 objets ;
  - 50 monstres, dont 23 boss ou élites ;
  - 63 PNJ.
- **Monde :** 32 zones, 83 intérieurs.
- **Systèmes :** 8 gabarits de navire, 3 compétences, 56 succès, 47 meubles et structures.
- **Références croisées :** toutes valides. Les quêtes renvoient vers des PNJ, monstres, objets, zones et prérequis
  qui existent, sans cycle. Les objets à ramasser ont tous une source, les boutiques et butins renvoient vers des
  objets existants, les 45 succès débloqués dans le code sont définis, et les monstres des quêtes sont présents dans
  le monde.

## Tests de référence

- **22 suites serveur :**
  - `t_server04`, `t_server06`, `t_server07`, `t_lib08`, `t_save10`, `t_secu10`, `t_prop10`, `t_fog10` ;
  - `t_social10`, `t_justice10`, `t_world10`, `t_arena10`, `t_tavern10`, `t_acte3`, `t_bastion10`, `t_sea10` ;
  - `t_seasons10`, `t_bells`, `t_eco08`, `t_mech05`, `t_items08`, `t_ships11`.

  Toutes passent. `t_items08` est instable selon la position tirée au hasard, connu.
- **14 parcours dans le navigateur** (Playwright et Chromium sans affichage), tous sans erreur de page :
  - interface, codex, panneaux, social, justice, ville la nuit, invasion, taverne ;
  - scènes, Acte III, Bastion, fonds marins, navires, repli solo.
- **Test réseau à deux joueurs** sur le serveur Node (`t_ships_ws`) : réussi.
- **Cohérence des données** (`t_data11`, nouveau) : réussi.

## Risques, par gravité

| Gravité | Risque |
|---|---|
| Critique | **Navigation** (signalé par le joueur) : la mise en route d'un navire est introuvable sans explication. Il faut lever l'ancre au cabestan, déployer la voile au mât, puis prendre la barre. Il n'existe aucune sortie de secours si l'on ne trouve pas l'ouverture du bastingage, ni si le navire est coincé. |
| Critique | Sur les pages GitHub et claude.ai, le navigateur d'un joueur fait autorité. La triche est possible, et le monde repart de zéro quand l'hôte change. C'est une limite d'architecture déjà documentée. |
| Haute | L'hébergement gratuit Render efface le disque à chaque déploiement, donc les comptes du serveur Node sont perdus. Documenté. |
| Haute | Aucun outil de test sûr. Tester un contenu oblige à jouer normalement, avec le personnage principal. |
| Moyenne | `server/game.js` est monolithique. Une partie de l'ancien code des bateaux à quatre directions (`sprites-boats.js`, `drawBoat`) ne sert plus qu'aux naufrages animés des alliés. |
| Moyenne | Musique et sons sont entièrement synthétisés par le code : aucun fichier audio. Une « nouvelle musique » est donc une composition programmée, pas un fichier. |
| Basse | Un test instable (`t_items08`). |

## Limites de l'environnement

- **Pas de test humain en temps réel :** les vérifications se font dans un Chromium sans affichage, par scripts et
  captures. Le son n'est pas écoutable ici, et aucune machine réelle (mobile, petit portable) n'est disponible.
- **Pas de PeerJS public :** le service public PeerJS est bloqué par le proxy. Le multijoueur direct se teste avec un
  serveur PeerJS local (`peerserver.cjs`), pas sur Internet.
- **Pas de déploiement Render** depuis cet environnement.

## Ordre d'intervention retenu

1. Lot 1 : la navigation d'abord, puis réseau et sauvegardes.
2. Lot 2 : outils développeur.
3. Lot 3 : refonte qualité.
4. Lot 4 : cinématiques.
5. Lots 5 à 7 : les trois contenus, dans l'ordre du dossier.
6. Lot 8 : validation.

**Fichiers sensibles :** `server/game.js` (sauvegarde et chargement, migrations), `server/db.js`, `server/ships.js`,
`shared/world.js` (le monde ne doit pas bouger), `client/main.js` (prédiction).
