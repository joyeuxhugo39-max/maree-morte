# Monde vivant — Lot 5 : vie des lieux

Version 1.6.5, publiée avec le lot 6. Ce lot réécrit la journée des habitants (`client/townsfolk.js`). Avant, ils
marchaient au hasard et bavardaient sans arrêt. Maintenant, ils ont un métier et une raison d'aller quelque part, et
ils savent se taire.

Capture : `rapports/captures/mv5-marche-libertalia-surcouche.jpg`. C'est le marché de Libertalia, avec la surcouche
`?vue=1` : on y lit le rôle et l'activité de chaque habitant.

## 1. Des métiers et des occupations

| Métier | Ce qu'il fait | Où |
| --- | --- | --- |
| **Marchand** | tient son étal, derrière le comptoir ; crie sa marchandise de temps en temps ; rentre le soir | les étals libres (ceux des marchands nommés leur restent) |
| **Client** | va d'un étal à l'autre, regarde, achète, entre dans une boutique et en ressort | marché, boutiques |
| **Docker** | va chercher une caisse au tas le plus proche, la porte à l'épaule jusqu'au bord du quai, la pose, recommence | entre un bout de quai et les tas de caisses voisins |
| **Pêcheur** | pêche au bord du quai (canne, ligne, bouchon qui danse) ; va parfois vendre sa pêche à un étal | bords des quais |
| **Artisan** | travaille à l'établi, coup de marteau après coup de marteau | devant la forge, les chantiers, les établis |
| **Guet** | tient son poste le jour, en tournant la tête ; fait sa ronde le soir et la nuit, lanterne à la main ; rentre à l'aube | statues, fontaines, capitainerie, rues |
| **Habitant** | fait ses courses : le puits, un banc où s'asseoir, le marché, une boutique ; va parfois retrouver quelqu'un ; le soir, la taverne ou la maison | toute la ville |
| **Voyageur** | arrive par la route au bord de la ville (hors de la vue du joueur), va à l'auberge, y reste, ressort, repart | routes, auberges |
| **Contrebandier** | n'apparaît que la nuit, dans un recoin | Libertalia |
| **Matelot** | regarde la mer depuis le quai, traîne en ville, chante tard à la taverne | Rade-aux-Flibustiers |

Le comportement suit des règles simples :

- **Des horaires souples** : chacun change d'activité à son rythme, avec un temps de décision tiré au hasard. Personne
  ne bouge en même temps que les autres.
- **Des activités qui durent** : un marchand reste 25 à 65 s à son étal, un pêcheur 40 à 110 s, un habitant s'assoit
  20 à 50 s sur un banc.
- **Pas d'empilement** : un habitant ne choisit pas l'endroit où un autre se tient ou se rend.
- **Pas de baignade** : l'eau peu profonde est praticable pour un joueur, mais les habitants ne vont pas dedans.
- **Entrer et sortir** : on entre dans une boutique ou à l'auberge, on rentre chez soi la nuit, et l'on réapparaît à
  la porte.

## 2. La densité, ville par ville

| Ville | Habitants | Métiers |
| --- | --- | --- |
| Port-Lanterne | 15 | guet, marchands, dockers, pêcheurs, artisan, habitants, client, voyageur |
| Libertalia | 31 | les mêmes, avec plus de marchands et de clients au marché, et un contrebandier la nuit |
| Rade-aux-Flibustiers | 8 | matelots, docker, pêcheurs, guet |
| Havre-des-Brumes | 6 | surtout des pêcheurs : un village calme |
| Anse-Tranquille | 4 | habitants et un pêcheur |

La nature reste sans habitants, comme le veut la fiche du lot 1 : jungles, ruines, forêts, marais.

## 3. Les conversations : un metteur en scène

**37 petites scènes**, dans `client/townsfolk-lines.js`, dont 5 muettes.

- **Elles se répondent** et dépendent du lieu (quai, marché, rue, devant la taverne), du moment, des métiers en
  présence, et de ce qui se passe : la pluie, le festival, la pleine lune.
- **Exemples** :
  - un garde demande à un docker où va sa caisse ;
  - un client marchande, puis le marchand refuse une pièce espagnole ;
  - un pêcheur montre une prise étrange ;
  - trois amis se disputent le gagnant de la veille.
- **Les règles** :
  - une ou deux scènes visibles à la fois, trois personnes au plus ;
  - des pauses irrégulières entre les répliques, selon leur longueur ;
  - après une scène, 10 à 26 s de silence dans la ville ;
  - la même scène ne revient pas avant 6 minutes, ni une réplique avant 4 minutes ;
  - les scènes muettes ne montrent qu'un regard ou un signe de tête, sans bulle.
- **Le joueur, les marchands, la foule** :
  - le joueur reçoit rarement un mot : une chance sur dix s'il s'arrête près de quelqu'un, puis 45 s de pause ;
  - un marchand ne crie sa marchandise que si personne ne parle à côté ;
  - la foule du festival se tait quand une scène se joue.
- **Dans les tavernes**, les habitués attablés jouent eux aussi de petites scènes entre voisins de table : une à la
  fois, toutes les 9 à 23 s.

## 4. Mesuré (90 s par place, comme au lot 1)

| Lieu | Bulles par minute | Au plus en même temps | Redites en moins d'une minute | Habitants à l'écran |
| --- | --- | --- | --- | --- |
| Port-Lanterne, jour | 10,7 → **2** | 3 → **2** | 6 → **0** | 9,7 → 8,4 |
| Port-Lanterne, soir | 25,3 → **6** | 3 → **2** | 29 → **1** | 8,2 → 9,2 |
| Libertalia, place, jour | 0 → 2,7 | 0 → 1 | 0 → 0 | 2,9 → **5,4** |
| Libertalia, place, soir | 0 → 0 | 0 → 0 | 0 → 0 | 2,6 → 3,2 |
| Rade-aux-Flibustiers, jour | 12,7 → **1,3** | 2 → 1 | 9 → **0** | 6,7 → 5,3 |

Remarques :

- La seule redite du soir à Port-Lanterne vient de la foule du festival, qui était ouverte pendant la mesure.
- Libertalia, le soir, reste calme sur sa place : ses habitants sont à la taverne ou chez eux.
- La mesure compte aussi les habitants « immobiles plus de 40 s ». Ils étaient 0 avant, ils sont 4 ou 5 maintenant :
  ce sont des marchands à leur étal, des pêcheurs et des gardes à leur poste. Ils travaillent, ils ne sont pas
  bloqués.

## 5. Multijoueur

Les habitants sont un décor **local** : chaque joueur calcule les siens. Ils partent tous du même état (même graine),
mais leurs gestes ne sont pas synchronisés entre joueurs. Rien n'est transmis par le réseau, et le serveur n'a rien à
faire. Deux joueurs côte à côte ne voient donc pas exactement la même scène au même moment. C'est un choix : il évite
de transmettre chaque pas décoratif, comme le demande le dossier (§ 18).

## 6. Fichiers

- **Réécrit** : `client/townsfolk.js`, avec les métiers, les points d'activité, les emplois du temps et le metteur en
  scène.
- **Nouveau** : `client/townsfolk-lines.js`, avec les scènes, les cris des marchands et les mots pour le joueur.
- **Modifiés** :
  - `client/render/renderer.js` : la caisse à l'épaule, la canne et le bouchon, le signe de tête ;
  - `client/festival.js` : la foule se tait quand une scène se joue.
