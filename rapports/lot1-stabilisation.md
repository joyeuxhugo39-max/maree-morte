# Lot 1 — Stabilisation

Branche de travail : `dossier-global`. Rien n'est encore publié (ni `main`, ni GitHub Pages, ni la page claude.ai).

## 1. Le blocage de navigation (priorité absolue)

**Ce qui bloquait.** Pour partir, il fallait trois postes dans un ordre que rien n'indiquait : lever l'ancre au
cabestan, déployer la voile au mât, puis prendre la barre. Seul à bord, on prenait la barre, rien ne bougeait, et
aucune sortie n'existait : pour descendre, il fallait retrouver l'ouverture du bastingage, et un navire échoué restait
échoué.

**Ce qui change :**

- **Partir depuis la barre seule.** Z (ou Espace) à la barre : l'équipage lève l'ancre et la voile se hisse.
  Espace règle la voilure d'un cran : demi-voile, toute la toile, voile carguée. Les autres postes gardent leur rôle
  pour les équipages à plusieurs.
- **Barre « simple » par défaut.** On tient une direction, le navire vire de lui-même vers ce cap et la barre revient
  au centre quand on lâche. L'ancienne barre (Q/D pour la roue, Z/S pour la voile) reste disponible dans les
  réglages, sous le nom « réaliste ».
- **Monter et descendre avec E.**
  - « Monter à bord » apparaît près du flanc, sans chercher l'ouverture.
  - « Descendre à terre » apparaît quand le navire est presque arrêté et qu'une terre ferme est à portée.
  - En pleine mer, un refus clair s'affiche : « Pas de terre ferme à portée ».
- **Marcher fait quitter un poste.** Plus de joueur figé à la barre. Une désynchronisation possible du poste entre
  client et serveur est aussi corrigée.
- **Trois boutons de secours** dans le bandeau du navire :
  - **Dégager** : le navire glisse vers l'eau libre la plus proche, une fois toutes les 20 s.
  - **Rentrer au port** : propriétaire seulement. L'équipage manœuvre 8 s, un coup reçu l'interrompt, puis le navire
    est amarré au quai d'armement le plus proche, ancre au fond. Une fois toutes les 3 min.
  - **Descendre à terre**.
- **Conseils sur place.**
  - Le bandeau dit quoi faire (« Pour partir : prenez la barre… ») et l'allure par rapport au vent.
  - Un anneau doré pulse sur la barre tant qu'on n'y est pas.

## 2. Réseau et sauvegardes : vérifiés

| Vérification | Résultat |
|---|---|
| Changement d'hôte sur la page publique (PeerNet) | Bérénice prend la relève en 6 s environ, Cyprien la rejoint |
| Changement d'hôte pendant qu'une joueuse est sur le pont de son navire (nouveau test) | Elle héberge après 8 s, de nouveau sur le pont de son sloop, bandeau affiché |
| Reprise de session après coupure | Réussie |
| Deux joueurs sur le serveur Node (WebSocket), navires partagés | Réussi |
| Sauvegardes : versions, migrations, copies de secours, restauration | Réussi (`t_save10`) |

Le format de sauvegarde ne change pas dans ce lot (version 10). Les nouveautés ne sont jamais enregistrées : équipage
au cabestan, retour au port en cours, délais des boutons.

## 3. Performances (Chromium sans affichage, 1280 × 720)

| Lieu | Rendu moyen | 95e centile | Images/s |
|---|---|---|---|
| Port-Lanterne, jour | 3,5 ms | 4,9 ms | 59 |
| Libertalia, place, nuit | 3,7 ms | 4,7 ms | 59 |
| Libertalia, marché | 1,7 ms | 2,3 ms | 60 |
| Volcan | 1,1 ms | 1,6 ms | 60 |
| Pleine mer | 0,7 ms | 1,0 ms | 60 |

Le tas mémoire reste stable à 30 Mo. Aucune machine réelle (mobile, petit portable) n'a été testée.

## 4. Tests

- **Suites serveur dans le dépôt.** Les 24 suites serveur sont désormais dans `tests/` et se lancent avec `npm test` :
  24 sur 24 réussies.
  - Nouvelle suite `t_nav12`, 16 vérifications : départ depuis la barre, E pour monter et descendre, Dégager, Rentrer
    au port et son interruption, refus en pleine mer.
  - `t_ships11` est ajustée : l'ancre se lève en 3,5 s au lieu de 5.
  - Le jeton d'administration fixe du test de sécurité est remplacé par un jeton aléatoire tiré à chaque lancement.
- **Parcours dans le navigateur.** 17 parcours, tous sans erreur de page. Ils restent hors du dépôt, car ils
  demandent des serveurs locaux : pages servies et serveur PeerJS local.
  - Les 14 de référence.
  - Le départ en mer joué au clavier comme un joueur (`t_nav_ui`) : E, E à la barre, Espace ×2, flèche bas 7 s, le
    navire vire vers le sud, Rentrer au port, Descendre à terre.
  - Le test réseau WebSocket.
  - La reprise de session.

## 5. Décisions qui changent le jeu (à valider)

- **Barre simple par défaut** : la manœuvre devient plus facile. Le mode réaliste reste au choix.
- **Ancre** : l'équipage la lève depuis la barre, et elle remonte en 3,5 s au lieu de 5.
- **Rentrer au port** peut servir à fuir un combat naval. C'est limité : 8 s sans être touché, puis 3 min d'attente.

## 6. Ce qui n'est pas fait ou pas vérifiable ici

- Pas de test par un humain : tout est vérifié par scripts et captures. Le ressenti de la barre simple reste à
  confirmer en jouant.
- Sur les pages GitHub et claude.ai, le navigateur de l'hôte fait toujours autorité, donc la triche reste possible.
  C'est une limite d'architecture, non traitée dans ce lot.
- Le numéro de version du jeu (1.1.1) n'est pas changé. Il le sera à la livraison.

## État de reprise

Lot 1 terminé sur la branche `dossier-global`. Prochain : Lot 2, compte développeur sécurisé.
