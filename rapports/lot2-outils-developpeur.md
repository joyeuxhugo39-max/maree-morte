# Lot 2 — Compte développeur, personnage laboratoire, atelier et console

Branche de travail : `dossier-global`. Rien n'est encore publié.

## 1. L'identification existante, vérifiée d'abord

| Mode | Identité | Conséquence |
|---|---|---|
| Serveur Node | Un compte = un nom + un mot de passe (haché avec scrypt), avec des essais limités et des jetons de reprise signés | Le premier venu crée un nom libre : le nom seul ne prouve rien |
| Pages GitHub et claude.ai, solo | Le navigateur d'un joueur fait tourner le moteur | Aucun secret ne peut y être gardé |

**Décision.** Les outils développeur n'existent que sur le serveur Node. Partout ailleurs, le moteur répond
« Accès refusé. » à toute demande, vérifié en solo par une tentative directe sans passer par la discussion.

## 2. La sécurité mise en place (`server/dev.js`, côté serveur seulement)

- **Deux conditions cumulées.** Le compte doit figurer dans `DEV_ACCOUNTS` et présenter `DEV_SECRET`.
  - Ce sont deux variables d'environnement du serveur. Elles ne sont ni dans le dépôt ni chez le client.
  - Un secret de moins de 16 caractères désactive les outils.
- **Comparaison du secret** en temps constant, après hachage.
- **Essais limités.** Cinq échecs par compte ou par adresse imposent quinze minutes d'attente, même avec le bon
  secret.
- **Jeton remis après succès.**
  - Signé (HMAC-SHA256) avec une clé tirée du secret et d'un sel propre au serveur.
  - Lié au compte et valable 120 minutes par défaut (`DEV_TTL_MIN`).
- **Révocation**, de trois façons :
  - `deconnexion` ;
  - la révocation générale (`POST /admin/api/dev-revoke`) ;
  - changer `DEV_SECRET`.
- **Chaque commande est revérifiée** : signature, expiration, révocation, compte connecté, présence dans la liste.
- **Joueur ordinaire.** Il reçoit « Accès refusé. » quoi qu'il envoie : un faux jeton, un jeton volé à un autre
  compte, un jeton modifié, ou même le bon secret.
- **Journal.** Pour chaque commande, le serveur consigne l'auteur, le personnage, la date, la commande, et le
  résultat ou l'erreur. Les ouvertures, refus, fermetures et révocations y figurent aussi.
  - Le journal est lisible dans la console d'administration.
  - La commande `historique` montre la même chose au développeur.
- **Garde-fous contre les abus** :
  - rafale limitée à 30 commandes en 10 s ;
  - commandes bornées : niveau de 1 à 30, objets jusqu'à 999 par commande, monstres jusqu'à 20, doublons de 0 à
    10 000 000, invincibilité d'une heure au plus.
- **Ce que les pages publiques contiennent.** Seulement un petit crochet (`client/dev-hook.js`) :
  - `/dev` dans la discussion, jamais envoyé comme message ;
  - l'invite du secret, qui n'apparaît qu'aux comptes autorisés ;
  - le chargement du panneau.

  Le panneau et la liste des commandes sont envoyés par le serveur après autorisation. Vérifié dans les deux pages
  construites : ni l'atelier, ni le module serveur, ni `DEV_SECRET`, ni la liste des commandes n'y figurent.

## 3. Le personnage laboratoire

- **Séparation.** C'est un autre personnage, avec sa propre sauvegarde (`labo~compte~n`, un fichier à part).
  - Le vrai personnage est sauvegardé et sort du monde, puis revient tel quel avec `lab sortir`. Vérifié dans les
    deux sens.
  - Aucun nom de joueur ne peut atteindre ces clés : le caractère `~` est interdit dans les noms.
- **Plusieurs configurations.**
  - Trois emplacements : `lab 1`, `lab 2`, `lab 3`.
  - Quatre scénarios : débutant (niv. 3), aventurier (niv. 12 et un sloop), vétéran (niv. 22 et un brick), légende
    (niv. 30, Gloire 20 et un galion). Chacun donne le meilleur équipement accessible à ce niveau.
- **À l'écart des vrais pirates.** Le serveur l'impose à chaque action :
  - pas d'échange, de groupe, d'équipage, de duel ni de pari ;
  - aucun coup dans un sens ou dans l'autre ;
  - il ne lâche rien au sol, et son butin n'est ramassable que par lui ;
  - pas d'achat de propriété ni de cambriolage ;
  - pas de classement (Fosse, records de pêche, Grand Tour) ;
  - les monstres qu'il fait apparaître ne rapportent rien aux vrais pirates.
- **Seul le laboratoire est modifiable.** Toute commande qui change un personnage est refusée sur le vrai, avec un
  message clair.
- **Réinitialisation**, avec confirmation, depuis l'atelier ou depuis l'accueil. À l'accueil, la ligne n'apparaît
  que si l'onglet a une session développeur valable. La version précédente du fichier reste en copie de secours.
- **Reprise après coupure** : elle ramène toujours au vrai personnage.

## 4. L'atelier et la console : ce que demandait le dossier

| Demande | État |
|---|---|
| Niveau, Gloire, PV, énergie, statistiques | Fait |
| Compétences | Affichées. Dans ce jeu, elles suivent le niveau : on les obtient en réglant le niveau |
| Équipement direct, invincibilité temporaire, valeurs normales, réinitialisation du laboratoire | Fait |
| Recherche dans tout le catalogue, ajouter, retirer, dupliquer (+1, +10), équiper, déséquiper, inspecter | Fait |
| Quêtes : liste, recherche, prérequis, état, objectifs, embranchements | Fait (`quete info`) |
| Quêtes : démarrer, réinitialiser, valider un objectif, étape suivante, terminer | Fait |
| Tester les embranchements et les fins | Fait. `quete preparer` termine la chaîne de prérequis sans récompense ; l'Acte III, au bout de quinze quêtes, a été préparé en une commande |
| Monstres et boss : liste, invocation en quantité contrôlée, suppression | Fait |
| Difficulté | En partie : un multiplicateur de PV (de x0,25 à x5). Les dégâts restent ceux du jeu |
| Téléportation : zones, villes, intérieurs, donjon, lieux secrets, fonds marins, cases, personnages | Fait |
| Retour immédiat à Port-Lanterne | Fait |
| Doublons, ressources, succès, récompenses | Fait |
| Recettes | Sans objet : le jeu n'a plus d'artisanat depuis la 0.8 |
| Navires : faire apparaître un modèle, réparer, repositionner, débloquer, ramener au port | Fait |
| Heure, météo imposée, jour et nuit, pleine lune | Fait |
| Événements : invasion, éruption, horde | Fait |
| Cinématiques : lister, lancer, rejouer, passer, scènes de quêtes comprises | Fait. Les cinématiques de boss se rejouent à côté du personnage, pas sur le lieu du boss |
| Console : autocomplétion (commandes et arguments), aide, historique (↑↓) | Fait |
| Équivalents de `/tp`, `/level`, `/item`, `/quest`, `/spawn`, `/boss`, `/gold`, `/cinematic` | Fait : ces noms anglais sont des alias |
| Sans quitter le jeu, recherche globale, catégories claires | Fait. Dix onglets ; F9 montre ou cache l'atelier |

## 5. Tests

| Test | Résultat |
|---|---|
| `tests/t_dev20.mjs`, serveur, dans le dépôt | 73 vérifications réussies : refus, essais limités, jetons (volé, modifié, expiré, révoqué), séparation du laboratoire, bornes, journal, réinitialisation à l'accueil, secret absent de tout message envoyé |
| Atelier dans Chromium, sur un vrai serveur Node, avec un développeur et un joueur ordinaire | 27 vérifications réussies, aucune erreur de page : `/dev` refusé au joueur ordinaire, déverrouillage, Labo 1, autocomplétion, onglets, confirmation quand un vrai pirate est en ligne, scène de quête, F9, recherche globale, retour au vrai personnage, réinitialisation à l'accueil, journal du serveur |
| `/dev` en solo, page publique | Refus, ni invite ni panneau, rien ne change |
| Non-régression | 25 suites serveur réussies (`npm test`), 18 parcours dans le navigateur sans erreur, deux tests de changement d'hôte sur la page publique réussis |

Un défaut trouvé par ces tests est corrigé : à l'accueil, la fenêtre de confirmation passait sous l'écran de
connexion. La confirmation se fait désormais sur place.

Les deux tests « navigateur » restent hors du dépôt : ils demandent Playwright et un serveur lancé. Ils y entreront
au lot 8.

## 6. Décisions à valider

- **Outils limités au serveur Node.** Aujourd'hui, le jeu se joue surtout sur la page GitHub. Pour se servir de
  l'atelier, il faut lancer le serveur Node, en local ou sur Render, avec les deux variables. C'est la conséquence
  directe de la règle « jamais de secret côté client ».
- **L'heure, la météo et les événements touchent tout le serveur.** Une confirmation est demandée quand de vrais
  pirates sont en ligne. Un serveur de test séparé reste préférable.
- **Le laboratoire est visible dans le monde**, sous le nom « Nom [labo] », et peut parler dans la discussion.
- **Sauvegardes.** Le format ne change pas (version 10). S'ajoutent :
  - des comptes « labo~… » ;
  - un fichier `meta-dev.json`, qui contient le sel, l'époque de révocation et les jetons révoqués, jamais le
    secret.
- **Fonction de connexion découpée.** La partie qui place un pirate dans le monde s'appelle désormais `enterWorld`.
  Le comportement est inchangé : tous les tests de connexion, de reprise et de changement d'hôte passent.
- **Correction annexe.** Le conseil affiché en armant un navire décrivait encore l'ancien départ en trois postes. Il
  dit maintenant : prendre la barre, puis Z ou Espace.

## État de reprise

Lot 2 terminé sur la branche `dossier-global`. Prochain : Lot 3, refonte qualité. Il commence par l'audit des 81
quêtes et des boss.
