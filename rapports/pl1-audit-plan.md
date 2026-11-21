# Refonte de Port-Lanterne — 1. Audit de l'existant et plan

## Ce qui existe (version 1.7.0)

**Fichiers responsables**

- Génération : `shared/world.js`, section « 6. Port-Lanterne » (place, bâtiments, quais, phare, mobilier urbain), PNJ en section 12, `spawnPoint` ligne ~1720.
- S'ajoutent ensuite, toujours dans la génération :
  - `shared/heist-world.js` : Entrepôt de la Douane (161,108), Demeure Valdorne (146,62), la Mouche d'Or (163,128) ;
  - `shared/festival-world.js` : estrade, stands, tente de la Lice, arche, mâts, lampions, canons, 5 PNJ ; ces décors ne se dessinent que pendant une édition ;
  - `shared/mobilier-world.js` : le mobilier des métiers.
- Rendu des bâtiments : `client/render/sprites-env.js` (`building()`, maisons, taverne, forge) et `client/render/sprites-cite.js` (façades « cite » à styles).
- Interactions : `server/game.js` (PNJ, boutiques, coffres, apparition), `server/ships.js` et `server/naval.js` (armer, réparer).
- Habitants : `client/townsfolk.js` ; petits événements : `client/evenements.js`.

**Mesures**

- 1 908 cases en zone sûre.
- Une place pavée de 5,6 cases de rayon autour de la Flamme (150,96).
- Bâtiments :
  - une taverne, une forge et 5 maisons ;
  - 6 maisons à vendre (le quartier des Corsaires, au nord) ;
  - un seul ponton, de 3 cases de large, avec une tête en T et deux navires amarrés.
- 16 PNJ de quête dehors.

**Apparition**

- Un seul point, `spawnPoint` = (150,98), devant la Flamme.
- Une mort ramène au même point (±12 px) ; tous les nouveaux pirates apparaissent au même pixel.
- À 20 joueurs, ils s'empilent, et le seul contrôle est `canStand`, sans tenir compte des autres joueurs.

**Ce qui ne doit pas bouger**

- Les 6 parcelles des Corsaires, qui appartiennent aux joueurs.
- Les identifiants des portes, des pièces et des décors (sauvegardes : coffres, portes secrètes trouvées).
- Les PNJ de quête et leurs identifiants.
- La Douane, la Demeure et la Mouche d'Or (le Braquage).
- La géométrie de la fête : la boîte de plage, la ligne de départ de la course (y 137), les couloirs des canons (y 131–141), les 17 points d'épreuve.
- Le quai d'amarrage « port » (147,127) et l'accès des navires.
- Les autres régions et le tirage aléatoire du monde.

## Le plan retenu

On ne déplace pas Port-Lanterne : la ville grandit autour de son cœur actuel.

La refonte est construite **après tout le reste de la génération** (`shared/port-world.js`, appelée en tout dernier). Ainsi :

- aucun tirage aléatoire déjà fait ne change ;
- les décors et les portes existants gardent leurs numéros ;
- le reste de l'archipel reste identique case pour case, ce que le garde-fou `t_monde90` vérifie hors du rectangle de la ville.

| Quartier | Où | Contenu |
|---|---|---|
| A. Le grand port | rive sud (y 117–120) et côte est | quai de pierre continu, jetée des pêcheurs à l'ouest, quai du Levant à l'est (navires marchands), grues, aires de chargement, bittes d'amarrage, barques |
| B. La place de la Flamme | (150,96) | place agrandie, étals, bancs, panneau d'annonces, accès dans les quatre directions |
| C. Le quartier de la taverne | autour de la Sirène Borgne | terrasse, tables dehors, cour des conteurs, lanternes ; à l'intérieur, plus de vie |
| D. La rue des Échoppes | la route de l'ouest (porte du Couchant → place) | voilerie, corderie, tonnellerie, cartographe, épicerie, halle aux poissons : chacun avec son enseigne, son stock et son marchand |
| E. Le quartier des Ravaudeuses | à l'ouest, entre la rue et la plage | maisons variées, ruelles, jardins, cours, linge, escaliers |
| F. Le chantier naval | la plage du sud-ouest | cale, coque en réparation, échafaudage, bois, atelier, charpentière qui répare et arme les navires (systèmes existants) |
| G. Les hauteurs | le phare, le rocher du nord-est | belvédère avec longue-vue, bancs, terrasse, escaliers |

**Apparitions**

- Une vingtaine de points valides autour de la place, hors des grands passages.
- On choisit le point le plus dégagé des autres joueurs.
- Un point est revérifié à chaque usage (obstacle, construction) ; à défaut, on prend l'ancien point.

**Événements du port**

- Un calendrier déterministe, calculé sur l'heure du monde, que le serveur et tous les clients connaissent déjà : tout le monde voit la même chose, sans aucun message réseau de plus.
- Les événements interactifs sont validés par le serveur.
