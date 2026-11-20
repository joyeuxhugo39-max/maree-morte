# Lot 4 — Un système réutilisable de cinématiques

Publié en version 1.4.0 le 20 novembre 2026 : `main`, GitHub Pages et la page claude.ai (version 17).

## 1. Ce qui existait avant ce lot

| Pièce | Ce qu'elle faisait | Ce qui manquait |
| --- | --- | --- |
| `client/cine.js` | Quatre courtes séquences codées à la main : entrée et chute d'un boss, réveil et chute du Kraken. Bandes noires, titre, caméra qui glisse. | Ni acteurs, ni script réutilisable, ni zoom, ni fondu, ni réglage de confort ; rien côté serveur. |
| `client/scene.js` | Les conversations : portraits, répliques tapées avec une voix, questions libres, choix mémorisés. | La caméra ne savait cadrer qu'un PNJ immobile ; aucun geste pendant les répliques. |
| Rendu | Échelle entière (pixels nets), caméra bornée à la pièce, effets (anneaux, éclairs, particules), bulles. | Aucun moyen de zoomer pour une scène, de montrer un autre lieu, de teinter l'image ou de cadrer un gros plan. |
| Musique | Un compositeur procédural : styles, thèmes signés, silences entre les morceaux. | Aucun fondu réglable, aucune atténuation (ducking), aucun silence imposé, aucun moyen de brancher un vrai enregistrement. |
| Serveur | Rien. | Personne ne décidait qui voit une scène ; un spectateur pouvait être frappé. |

Les tavernes étaient vides : les habitants se retrouvaient devant la porte, jamais dedans.

## 2. Le moteur

- **Les scripts** sont des données (`shared/data/cinemas.js`) : des étapes datées sur une horloge de scène. Cette
  horloge s'arrête pendant une conversation, puis repart.
- **Le moteur** (`client/cinema.js`) joue ces étapes. Il ne démarre que sur ordre du serveur.
- **Le vérificateur** (`client/cinema-check.js`) confronte chaque script à ce que le jeu sait vraiment faire.
  - Les costumes, à la feuille de personnages.
  - Les sons, à `Sfx.play`.
  - Les thèmes, au compositeur.
  - Les icônes et les accessoires, à leurs atlas.
  - Les lieux et les PNJ, au monde.

Il sépare les erreurs de script et les assets manquants.

Les 26 verbes d'un script :

| Domaine | Verbes |
| --- | --- |
| Caméra | `cam` (travelling ou coupe vers un acteur, une case, un point du monde, entre deux personnages), `follow` (suivre un acteur), `zoom` (cadrage en nombre de cases de haut), `shake` |
| Personnages | `spawn`, `remove`, `walk` (chemin, marche ou course), `face` (une direction, quelqu'un), `sit`, `gesture` (`wave`, `dance`, `flip`, `reach`, `atk`, `coin`), `emo` (`!` `?` `…` `♪` rire, colère, cœur, sueur), `coin`, `item` (objet ou accessoire posé) |
| Mise en scène | `bars`, `fade`, `title`, `sub` (sous-titre avec le nom de qui parle, et sa voix), `say` (bulle sans arrêt), `grade` (étalonnage), `vignette` (gros plan), `view` (montrer un autre lieu) |
| Son | `theme` (avec la durée du fondu ; un thème vide = le silence), `sfx`, `duck` |
| Déroulé | `talk` (une conversation ; l'acteur y joue ses gestes), `release` (le joueur reprend la main, la scène peut finir sans lui) |

### Points techniques

- **Le zoom reste entier.**
  - L'échelle de rendu reste un nombre entier : les pixels ne sont jamais déformés.
  - Le passage d'un palier à l'autre est adouci par une mise à l'échelle CSS de la toile. Son centre est calculé
    pour retomber exactement sur l'image suivante.
  - Vérifié : les captures prises juste avant et juste après le changement de palier sont identiques.
- **Un autre lieu.** Le rendu peut montrer un autre lieu que celui du joueur (`viewRoom`). Les habitants y vivent
  le temps du plan (`viewFocus`).
- **Les acteurs.** Un PNJ « incarné » est caché ; une silhouette identique joue à sa place. À la fin, il retrouve sa
  place exacte. Silas regagne sa chaise : sa silhouette et le PNJ assis coïncident au pixel près.
- **Les accessoires de table** (`drawMini`) sont à la taille du décor : plan, uniformes, clé, pièce. Une icône
  d'inventaire y était deux fois trop grande.

## 3. Multijoueur : qui déclenche, qui voit, que se passe-t-il si…

- **Qui déclenche.** Toujours le serveur (`server/cinema.js`).
  - En entrant dans un lieu, une seule fois par personnage. La mémoire `vu:<scène>` est sauvegardée.
  - Depuis une conversation : le client demande, le serveur vérifie. Il faut être près du PNJ, remplir les
    conditions et ne pas être en combat.
  - Au lot 5, depuis la logique de quête : `startCinema(joueurs, id, { onEnd })`.
- **Qui voit.** Le joueur qui a déclenché la scène. Pour une scène de groupe, ses compagnons présents dans la même
  pièce à cet instant.
- **Synchronisation.** Chaque spectateur reçoit le même ordre au même moment et joue la scène chez lui. Rien de la
  partie n'est rejoué localement : les acteurs ne sont qu'un décor.
  - Le serveur attend le « fini » de chacun avant la suite (`onEnd`).
  - Il n'attend jamais plus que la durée maximale de la scène.
- **Protection du spectateur.**
  - Il ne peut ni frapper ni être frappé, et aucun monstre ne le cible.
  - Les autres pirates le voient clignoter comme un pirate invulnérable.
  - La protection tombe à la fin, quand on passe la scène, au premier geste (frapper, une compétence, bouger), à la
    déconnexion, ou au plus tard après `maxDur`.
- **Arriver en retard.** Si l'on arrive pendant une scène de groupe, on ne la voit pas. Elle n'est pas marquée « vue »
  pour soi : on la verra en revenant.
- **Se déconnecter.** Les autres spectateurs ne vous attendent plus. À la reconnexion, aucune protection ne reste.
- **Les quêtes n'en dépendent pas.** La rencontre avec Silas se conclut par une conversation, qu'on peut quitter et
  reprendre plus tard (« Tu voulais me parler ? »). Passer la scène mène directement à cette conversation.

## 4. Confort

- **Passer une scène.** Échap ou le bouton « Passer ▸▸ ». On saute jusqu'à la prochaine conversation, ou jusqu'à la
  fin, et le monde est laissé dans l'état final de chaque étape sautée.
- **Réglage « Cinématiques : effets réduits ».**
  - Plans coupés au lieu des travellings et des zooms progressifs.
  - Ni tremblement, ni vignette.
  - Fondus de 0,25 s au plus.
- **Restauration garantie.** Caméra, zoom, commandes, musique, PNJ, accessoires et interface sont rendus dans tous
  ces cas :
  - la fin de la scène ;
  - Échap, ou le bouton « Passer » ;
  - le joueur quitte le lieu ;
  - le joueur meurt ;
  - il se reconnecte ;
  - une étape échoue (essayé en y provoquant une erreur) ;
  - une scène dure plus que sa durée maximale.
- Pendant une scène, l'invite « [E] » et la flèche d'objectif disparaissent.

## 5. La démonstration : Le Plus Grand Braquage, scènes 1 et 2

**Silas Virevent** est un vrai PNJ, assis à la table isolée de la Sirène Borgne, près de la cheminée. Il apparaît
dès le niveau 10. Il a été ajouté en dernier dans la liste des personnages : le monde d'avant ne bouge pas (même
décor, mêmes PNJ aux mêmes places).

**Scène 1, la rencontre** (environ 14 s avant la conversation). Elle se déclenche en entrant pour la première fois.

1. La musique s'efface ; un habitué raconte une histoire, la salle rit.
2. Un travelling traverse la taverne jusqu'à la table de Silas, puis un zoom progressif en gros plan, sous une
   vignette.
3. Silas lance deux fois une pièce : elle monte, tinte et retombe. Le leitmotiv entre avec elle.
4. Il remarque le joueur (« ! »), se tourne, fait signe (« Psst. Toi, là-bas. »).
5. Il se lève (la chaise racle) et traverse la salle jusqu'au joueur, la caméra le suit.
6. La conversation : quatre questions libres et la proposition. Silas joue avec sa pièce, fait des gestes de la main
   et fredonne pendant ses répliques.
7. On accepte ou on refuse, et il s'en souvient.
8. Le joueur reprend la main ; Silas regagne sa table et se rassoit.

**Scène 2, la préparation** (environ 22 s). Elle se lance quand on a accepté, par « Où en est l'affaire ? ».

1. Gros plan sur la table, la lueur de la cheminée.
2. Silas y pose le plan de la demeure, deux uniformes et la clé du comptable, en les commentant.
3. « Trois choses. Tu me les trouves, je m'occupe du reste. »
4. Un fondu au noir, puis le quartier des Corsaires : un travelling remonte la rue sous le titre
   « Le Plus Grand Braquage », et Silas dit que Valdorne vit sur les hauts du quartier.
5. Un fondu, et retour à la taverne.

**La taverne vivante.**

- Des habitués sont attablés dans chaque taverne et auberge, plus nombreux le soir.
- Ils trinquent et bavardent ; on entend des rires.
- Ceux qu'une scène fait parler sont toujours à leur place, et ils y restent après.

**Écarts assumés par rapport au dossier, à reprendre au lot 5.**

- Au lot 5, la scène 2 viendra après avoir réuni les trois objets. Ici, elle sert de briefing.
- La demeure de Valdorne n'existe pas encore. Le plan final montre le quartier où elle sera bâtie, et le titre est
  celui de la quête, pas celui de la demeure.
- Le refus ne donne pas encore d'avance de doublons : c'est une récompense de quête, donc le lot 5.
- Les scènes 3 à 7 (réception, trahison, poursuite, boss, conclusions) sont pour le lot 5.

## 6. Assets manquants, signalés par le vérificateur

| Scène | Manquant | Ce qui le remplace en attendant |
| --- | --- | --- |
| Préparation | Lieu `demeure_valdorne` (lot 5) | Le quartier des Corsaires, où elle sera bâtie |
| Préparation | Icône d'inventaire `plan_demeure` (lot 5) | Sur la table : l'accessoire « plan » ; dans le sac : rien encore |
| Préparation | Icône d'inventaire `uniforme_garde` (lot 5) | Sur la table : l'accessoire « uniforme » ; dans le sac : rien encore |
| Préparation | Geste `pointer` (lot 5) | `reach` : le buste qui se penche vers l'objet |
| Les deux | Enregistrements musicaux | La musique générée par le code |

Tous les costumes, sons, émotions, gestes, conversations et lieux utilisés existent. Le test `t_cinema40` échoue si
un script en invente un.

## 7. La musique du braquage

**Il n'existe aucun fichier audio.** Les neuf identités sont des styles du compositeur procédural
(`client/music.js`), comme toute la musique du jeu : chaque morceau est composé à la volée et n'est jamais deux fois
le même.

Le leitmotiv de Silas, en revanche, est écrit note à note. C'est une petite valse de filou en ré mineur, dorien :
le si bécarre sur l'accord de sol majeur. Il existe en trois versions :

- `silas`, élégant, à 6/8 ;
- `silasWar`, en quatre temps, pour le combat ;
- `silasMaj`, en ré majeur, pour les complices.

**Point d'intégration.** Un vrai enregistrement se branche par `Sfx.musicFile(thème, url)`, ou par le champ `file` de
`THEMES` dans `shared/data/cinemas.js`.

- Il remplace alors le compositeur pour ce thème, avec les mêmes fondus.
- S'il ne se charge pas, le compositeur reprend.
- Vérifié dans le navigateur avec un fichier WAV, puis avec un fichier introuvable.

### Cahier des charges, pour un compositeur

| Thème | Où | Mesure, tempo | Tonalité | Instruments | Caractère | Durée, boucle |
| --- | --- | --- | --- | --- | --- | --- |
| Silas Virevent | Scène 1, ses conversations | 6/8, noire pointée ≈ 100 | ré mineur (dorien) | violon seul, pizzicati, basse légère, sans percussion | élégant, amusé, un peu trop aimable ; le leitmotiv ouvre toujours | 30 s, puis 6 à 14 s de silence |
| La préparation | Scène 2, le repérage | 6/8, ≈ 113 | ré dorien ou la mineur | cordes pincées, flûte, arpèges ; un tic-tac de balais | minutieux, complice ; le leitmotiv revient une fois sur trois | 30 s, puis 8 à 18 s de silence |
| La réception | Scène 3, le bal | 3/4, noire ≈ 125 | fa, sol ou ré majeur | violon, flûte, harpe en menuet ; sans percussion | musique de salon, entendue dans la pièce ; un rien guindée | 50 s, puis 4 à 10 s de silence |
| La trahison | Scène 4, les archives | 6/8, noire pointée ≈ 62 | ré ou si mineur | chœur et flûte sur des accords tenus | froid, suspendu ; beaucoup de silence | 35 s, puis 18 à 34 s de silence |
| La poursuite | Scène 5 et la course sur les toits | 6/8, ≈ 160 | ré dorien ou mi mineur | violon, sifflet, basse pulsée, gigue | effréné ; le leitmotiv en version emballée | 25 s, enchaîne sans pause |
| La Mouche d'Or | Scène 6 et le combat contre Silas | 4/4, noire ≈ 145 | ré mineur | cuivres, violon, tambours de siège | duel, panache ; le leitmotiv en quatre temps | 57 s, enchaîne sans pause |
| Le Casse du Siècle | Conclusion A : tout garder | 6/8, ≈ 127 | ré ou sol majeur (mixolydien) | cuivres, violon, oompah, gigue | triomphe un peu cupide | 32 s, puis 20 à 40 s de silence |
| Justice de Port-Lanterne | Conclusion B : dénoncer Silas | 6/8, ≈ 87 | do ou fa majeur | chœur, flûte, cordes grattées | officiel et doux-amer | 37 s, puis 25 à 50 s de silence |
| Complices | Conclusion C : faire équipe | 6/8, ≈ 120 | ré majeur | sifflet, cordes pincées, gigue | le leitmotiv en majeur, la connivence | 27 s, puis 20 à 40 s de silence |

Pour de vrais enregistrements :

- un fichier par thème, en boucle propre ;
- le volume crête aligné sur la musique actuelle (environ −14 LUFS) ;
- une attaque douce : le moteur fait lui-même ses fondus ;
- formats OGG ou MP3.

## 8. Tests

- **`npm test` : 29 suites réussies**, dont la nouvelle `t_cinema40`, sur ces points :
  - **Scripts :** les deux scripts sont valides, et chaque asset attendu dit son lot et ce qui le remplace.
  - **Registres :** la liste des sons et celle des costumes sont exactement celles du jeu.
  - **Moteur :** il sait jouer chacun des 26 verbes.
  - **Musique :** neuf identités, aucun fichier déclaré, des morceaux valides. Le leitmotiv ouvre toujours le thème
    de Silas, les complices sont en majeur et la trahison en mineur.
  - **Silas :** il n'apparaît qu'au niveau 10 ; il est assis dans la Sirène Borgne, ajouté en dernier.
  - **Déclenchement :** rien au niveau 9 ; la scène se déclenche au niveau 10, une seule fois.
  - **Protection :** pas de coups, pas de cible. Elle tombe à la fin, au geste, au mouvement et après la durée
    maximale ; un « fini » pour une autre scène ne lève rien.
  - **Préparation :** refusée sans le « oui », loin de Silas, ou en combat. Jamais deux scènes à la fois. Une scène
    d'entrée ou une scène inconnue ne se demande pas.
  - **Groupe :** qui voit, la retardataire, l'attente de chacun, la déconnexion.
  - **Mémoire :** elle survit à la reconnexion.
- **`t_dev20`** : la commande développeur `cine film:silas_rencontre` conduit dans la taverne et lance la scène ;
  `cine oublier` la fait rejouer.
- **Dans le navigateur** (Chromium, page publique en solo ; scripts hors du dépôt, comme aux lots précédents) :
  - la scène 1 jouée entière en 1280 × 720, 1920 × 1080 et 1024 × 768, conversation comprise (une question, puis
    « J'en suis »), avec le retour de Silas à sa table ;
  - la scène 2 jouée entière, puis passée avec Échap pendant le plan du dehors, et avec le bouton au début ;
  - le mode « effets réduits » ;
  - une interruption en quittant la taverne ;
  - une étape qui échoue ;
  - une mort pendant la scène ;
  - l'enregistrement musical branché.

  À chaque fois, l'état rendu est vérifié : zoom 0, aucune transformation, caméra libre, lieu normal, pas de vignette,
  ni accessoire, ni acteur. Silas est visible à sa place, les commandes sont rendues, les bandes et le fondu sont
  retirés, la musique est revenue et le serveur a levé la protection. **Aucune erreur dans la page.**
- **Interface aux quatre tailles d'écran :** aucun chevauchement. Le script de mesure comptait le suivi des quêtes
  comme chevauchant le bloc de la minicarte, qui le contient. Il ignore maintenant les blocs imbriqués ; ce n'était
  pas un vrai recouvrement, et 1.3.1 donnait le même résultat.

## 9. Limites connues

- Les quatre séquences de combat de `cine.js` (boss, Kraken) restent telles quelles. Elles ne se superposent plus à
  une scène mise en scène, mais n'ont pas le réglage « effets réduits » : seul le réglage des tremblements s'y applique.
- Une scène se synchronise au départ, pas en continu : deux spectateurs peuvent finir à quelques dixièmes de seconde
  d'écart.
- Les acteurs ne sont visibles que des spectateurs. Les autres pirates voient Silas à sa table et le spectateur
  immobile, clignotant.

## 10. État de reprise pour le lot 5

- **Ajouter les scènes 3 à 7** dans `CINEMAS`. Les lancer depuis la quête avec
  `game.startCinema(joueurs, id, { onEnd })`. Le groupe est déjà géré.
- **La décision de Silas** est en mémoire : `silas_oui` ou `silas_non`.
  - La quête « Le Plus Grand Braquage » partira de `silas_oui`. Elle remplacera l'option « Où en est l'affaire ? »
    (`client/ui.js`, `silasChoices`).
  - La scène 2 passera après la collecte des trois objets.
- **Les assets à créer** sont listés en section 6 : la demeure, les deux icônes d'objet et le geste.
- **Les thèmes musicaux** de la réception, de la trahison, de la poursuite, du boss et des trois conclusions existent
  déjà.
