# Monde vivant — Lots 7 à 10, et livraison du dossier

Version **1.7.0**, publiée le 21 novembre 2026 : `main`, GitHub Pages et la page claude.ai.

Ce rapport couvre les lots 7 à 9, les tests du lot 10 et le bilan du dossier « Finalisation du monde et de la direction
artistique ». Les lots 1 à 6 ont chacun leur rapport :

| Lot | Rapport |
| --- | --- |
| 1, audit et charte | `rapports/mv1-audit-charte.md` |
| 2, fondations | `rapports/mv2-fondations.md` |
| 3, environnements | `rapports/mv3-environnements.md` |
| 4, architecture et mobilier | `rapports/mv4-architecture-mobilier.md` |
| 5, vie des lieux | `rapports/mv5-vie-des-lieux.md` |
| 6, ambiance et événements | `rapports/mv6-ambiance-evenements.md` |

## Lot 7 — Personnages et animations

**Vérifié, et déjà correct** :

- l'immobilité (respiration d'1 px du buste chez les humains) ;
- la marche sur 4 images ;
- l'élan et le choc des coups (petit décalage vers la cible, éclair blanc à l'impact) ;
- la roulade, le salto ;
- la mort (fondu et chute) ;
- la danse ;
- la lueur rouge sous un boss enragé.

**Corrigé** :

- **Les pieds ne glissent plus.** La marche s'animait à 9 images par seconde quelle que soit la vitesse. Un habitant
  qui flâne à 23 px/s pédalait donc comme un joueur qui court à 76 px/s, et un mort-vivant lent faisait du
  « moonwalk ». Le pas suit maintenant la distance réellement parcourue, pour tous :
  - le joueur, y compris ralenti dans l'eau ou le marais ;
  - les autres joueurs et les monstres ;
  - les habitants et les figurants.
- **Les morts-vivants « respirent » aussi** à l'arrêt, plus lentement que les vivants. Comme pour eux, seul le buste
  monte d'1 px et les pieds ne décollent pas. Cela vaut pour les monstres de silhouette humaine.

**Inchangé, par la charte** : aucune dimension de sprite, boîte de collision, point d'ancrage ni durée d'attaque n'a
bougé.

## Lot 8 — Lumière, ombres, effets

- **Les ombres suivent le soleil** :
  - le matin, elles tombent à gauche ;
  - à midi, elles sont courtes ;
  - le soir, elles s'allongent à droite en s'adoucissant ;
  - la nuit, elles sont presque effacées (13 % au lieu de 28 %) ;
  - dans les intérieurs, la lumière vient d'en haut.
- **Les halos ne sont plus des disques.** Une flamme éclaire surtout le sol autour d'elle : le halo est un ovale aplati
  (80 % de sa largeur en hauteur), un peu décalé vers le bas. Les fenêtres et le faisceau du phare gardent leur forme
  propre.
- **Vérifié, sans changement nécessaire** :
  - l'eau : dégradé de profondeur, écume en deux rangs le long des côtes, reflets et rides ;
  - la météo (pluie, orage, éclairs), cohérente avec l'heure ;
  - les familles d'effets de combat, qui suivent la charte (feu orange, poudre gris chaud, morts vert-bleu, critiques
    or).

  Un combat contre six monstres reste lisible : chiffres de dégâts, barre de vie, éclair du coup. Voir
  `rapports/captures/mv10-combat-jungle.jpg`.
- Capture : `rapports/captures/mv8-ombres-nuit.jpg`.

## Lot 9 — Interface

- **Le cadre du tutoriel** (à gauche) est plus compact (236 px au lieu de 280 de large, marges réduites) et placé plus
  haut. Il laisse le centre de l'écran libre.
- **Les annonces ne recouvrent plus le titre de la zone.** Pendant les quatre secondes du titre, les annonces non
  urgentes (haut fait, air noté…) attendent leur tour, puis s'affichent à leur place habituelle. Les alertes restent
  immédiates. Capture : `rapports/captures/mv9-titre-puis-annonces.jpg`.
- **Quatre résolutions** (1024 × 768, 1280 × 720, 1366 × 768, 1920 × 1080) : 9 blocs d'interface visibles, aucun
  chevauchement, rien hors de l'écran.
- **Le reste de l'interface** (panneaux, inventaire, quêtes, dialogues, carte) avait été harmonisé en 0.8.1 et 1.3,
  dans le même style bois et parchemin. Je n'y ai pas touché.

## Lot 10 — Tests

**Environnement** : un conteneur Linux, Node 22, Chromium sans affichage. Aucun humain, pas de son audible, pas de
machine réelle.

### Tests automatisés

| Commande | Résultat |
| --- | --- |
| `npm test` | **33 suites, toutes réussies.** Le garde-fou du monde `t_monde90` est nouveau dans ce dossier |
| `node --check`, sur tous les fichiers modifiés | aucune erreur |

### Dans le navigateur

| Contrôle | Résultat |
| --- | --- |
| Tournée des lieux : 28 zones et 30 sortes de pièces, de jour ; plusieurs zones aussi la nuit, le matin et le soir | aucune erreur de page |
| Observation des villes, 90 s par place, avant et après | voir le rapport du lot 5 (Port-Lanterne le soir : 25 → 6 bulles par minute) |
| Personne dans l'eau, personne muré | 0 habitant dans l'eau après 30 s ; `t_monde90` : aucun personnage, porte ou coffre muré |
| Événements spontanés | les cinq, forcés et photographiés |
| Sons | comptés à quatre endroits (jungle : oiseaux ; forêt des Pendus : silence ; prairie sous la pluie : grillons muets ; quai : grincements) |
| Combat contre plusieurs ennemis | lisible, aucune erreur |
| Parcours complet du festival (lot 6), refait | 23 captures, aucune erreur |
| Quatre résolutions | aucun chevauchement |
| **Deux joueurs sur le vrai serveur Node** | ils se voient, le chat passe, les déplacements sont vus par l'autre ; départ, retour au même endroit, mauvais mot de passe refusé |
| **Changement d'hôte** sur la page claude.ai | le second joueur reprend le monde en 1,3 s et garde son or ; un troisième arrive et le voit |
| Habitants dupliqués à l'arrivée ou au départ d'un joueur | impossible : ils sont créés une seule fois, au chargement de la page |

### Performance

Le rendu dans Chromium, à 1280 × 720 :

| Lieu | Lot 1 (avant) | Livraison |
| --- | --- | --- |
| Port-Lanterne, jour | 4,5 ms | **4,0 ms** |
| Libertalia, place, nuit | 4,4 ms | **3,8 ms** |
| Libertalia, marché, habitants installés | 1,6 ms | 1,7 ms |
| Pleine mer | 0,7 ms | 0,6 ms |
| Plage en fête, spectacle | 4,8 ms | 4,6 ms |

- Le jeu tourne à 60 images par seconde partout.
- **Une parcelle de terrain** coûte en moyenne 57 ms au lieu de 49, mais elle ne se peint qu'une fois.
- **Mémoire** : le tas mesuré passe de 36 à 40 Mo à 58 Mo, avec les nouveaux habitants, leurs points d'activité et les
  sprites. Cette mesure dépend du ramasse-miettes : c'est un ordre de grandeur.

## Bilan du dossier

### 1. Les améliorations réellement faites

- **Lot 1** :
  - l'audit mesuré ;
  - une fiche de traitement pour chacune des 33 zones et pour les intérieurs ;
  - la charte graphique (grille, échelle entière, contours, palettes par matériau, lumière, animation, interface,
    effets).
- **Lot 2** :
  - l'échelle entière de la longue-vue ;
  - la surcouche de vérification (`?vue=1`, puis F9) ;
  - le garde-fou du monde (`t_monde90`) ;
  - les performances de référence.
- **Lot 3** :
  - des raccords de terrain sans escalier ;
  - une teinte propre à chaque région ;
  - une herbe sans taches « camouflage » ;
  - des roches en blocs ;
  - des arbres variés ;
  - des détails de sol et une laisse de mer.
- **Lot 4** :
  - 11 meubles nouveaux ;
  - des ateliers meublés selon leur métier ;
  - des traces de vie sur les quais.
- **Lot 5** :
  - dix métiers avec leurs occupations ;
  - un metteur en scène des conversations, avec 37 scènes.
- **Lot 6** :
  - des sons propres à chaque lieu ;
  - le vent dans les drapeaux et le linge ;
  - cinq événements spontanés.
- **Lot 7** : les pas qui suivent la vitesse, et les morts-vivants qui respirent.
- **Lot 8** : des ombres qui suivent le soleil, et des halos ovales au sol.
- **Lot 9** : un tutoriel plus discret, et des annonces qui attendent le titre de la zone.

### 2. Les ressources graphiques

**Toutes sont produites par le code**, comme le reste du jeu. Aucune image ni dépendance externe n'a été ajoutée. Les
deux polices, déjà présentes, sont sous licence libre SIL OFL.

- **Créées** :
  - 10 sortes de meubles et d'objets : foin, sacs, planches, alambic, seau, meule, tabouret, cordage, filet étalé,
    casier ;
  - la caisse portée, la canne à pêche, le poisson qui saute, les caisses renversées, la silhouette du navire au loin.
- **Modifiées** :
  - le rendu du terrain : raccords, régions, herbe, roches, détails ;
  - les arbres : variantes en miroir ;
  - les drapeaux et le linge : ils ondulent ;
  - les ombres et les halos ;
  - le cadre du tutoriel.
- **Remplacées** : aucune.

### 3. Les lieux dont l'ambiance et la vie ont changé

- **Les villes** :
  - Port-Lanterne ;
  - Libertalia (marché, darse, rues) ;
  - Rade-aux-Flibustiers ;
  - Havre-des-Brumes ;
  - Anse-Tranquille.

  Elles gagnent des métiers, des conversations, des sons, des quais habités et des événements.
- **Les ateliers** : forge, armurerie, écuries, chantiers navals, apothicairerie, capitainerie, couture, cave de
  l'atelier, entrepôt, receleur.
- **Les régions naturelles**, par leur sol :
  - Prairie, Jungle de Brumesel, Collines, Baie des Naufrageurs, Hauts de Libertalia, Île au Crâne, Cannaies ;
  - Îlots perdus, Lagon, Jungle Écarlate, Mangrove, Havre, Quarantaine, Anse, Ruines.
- **Les régions naturelles**, par leurs sons : oiseaux, grillons, grenouilles, corbeau.
- **Les lieux morts gardent leur silence, voulu** : Damnés, Ossements, Ruines, Quarantaine, Volcan.

### 4. Les systèmes ajoutés ou corrigés

| Système | Fichier |
| --- | --- |
| Routines des habitants (métiers, points d'activité, emplois du temps) | `client/townsfolk.js`, réécrit |
| Conversations (metteur en scène, scènes, règles de silence) | `client/townsfolk.js`, `client/townsfolk-lines.js` |
| Événements spontanés | `client/evenements.js` |
| Sons localisés | `client/ambience.js` |
| Mobilier et traces de vie | `shared/mobilier-world.js`, `client/render/sprites-mobilier.js` |
| Terrain | `client/render/terrain.js` |
| Outils de vérification | `client/render/vue.js`, `tests/t_monde90.mjs` |

### 5. Les critères de réussite du dossier

| Critère | État |
| --- | --- |
| Les lieux ont des identités visuelles et des ambiances distinctes | **fait** : sols régionaux, mobilier de métier, sons propres, silences voulus |
| Les villes paraissent habitées sans être bondées | **fait et mesuré** : 5 à 9 habitants à l'écran, Libertalia moins vide là où l'on regarde |
| Les conversations sont espacées, discrètes et compréhensibles | **fait et mesuré** : 2 bulles à la fois au plus, aucune redite, des échanges qui se répondent |
| Les PNJ ont des activités crédibles et ne marchent pas sans raison | **fait** : chaque déplacement a une destination et une activité (surcouche `?vue=1`) |
| Les zones naturelles ne sont pas artificiellement remplies | **respecté** : aucun habitant ajouté hors des villes |
| Ressources cohérentes en résolution, palette, contour et détail | **fait pour le nouveau** : tout suit la charte. L'ancien était déjà dans ce style |
| Finition homogène | **amélioré** (terrain, intérieurs, lumière) ; voir les limites |
| La lumière et les effets renforcent l'immersion sans nuire à la lisibilité | **fait** : halos au sol, ombres selon l'heure, combat lisible |
| Le jeu reste fluide et le multijoueur cohérent | **mesuré** : 60 images/s ; serveur et changement d'hôte testés |
| Les systèmes déjà fonctionnels ne sont pas cassés | **vérifié** : 33 suites, festival complet, sauvegardes inchangées, monde inchangé (`t_monde90`) |

### 6. Problèmes restants (distincts de ce qui est terminé)

| Gravité | Problème |
| --- | --- |
| Moyenne | **Rien n'a été vu ni entendu par un humain.** Le dosage des sons, la densité des conversations et le ressenti des métiers restent à juger en jouant |
| Moyenne | Les habitants sont locaux : deux joueurs côte à côte ne voient pas la même scène au même moment (voulu, pour ne rien transmettre) |
| Basse | Les plateaux rocheux rectangulaires de l'Île des Damnés gardent leurs formes droites : ce sont des collisions |
| Basse | L'herbe ne bouge pas au vent (le terrain est peint une fois par parcelle) |
| Basse | Deux événements du dossier ne sont pas faits : « un bateau endommagé cherche de l'aide », qui demanderait une quête côté serveur, et « un animal près d'un campement » |
| Basse | La mémoire mesurée monte d'environ 20 Mo |
| Basse | Peindre une nouvelle parcelle de terrain prend environ 8 ms de plus (une fois par parcelle) |

### 7. Ce qui demanderait un travail graphique manuel ou un outil externe

- **Des portraits peints** pour les dialogues : aujourd'hui, ce sont les sprites agrandis.
- **De vrais enregistrements** de sons d'ambiance et de musique. Tout est synthétisé, et un ingénieur du son ferait
  mieux.
- **Des animations propres à chaque métier**, avec de nouvelles images de sprite : coup de marteau dessiné, docker qui
  soulève, pêcheur qui lance. Aujourd'hui, ce sont des poses et des objets dessinés par-dessus le personnage existant.
- **Un tileset dessiné à la main** pour les falaises et les plateaux, à la place du rendu procédural.

## Fichiers des lots 7 à 9

- `client/main.js` : le pas du joueur et des entités suit la distance.
- `client/townsfolk.js`, `client/evenements.js` : le pas des habitants et des figurants.
- `client/render/renderer.js` : la respiration des morts-vivants, les ombres selon le soleil.
- `client/render/lighting.js` : les halos ovales.
- `client/style.css`, `client/ui.js` : le tutoriel compact, les annonces qui attendent le titre.
