# Monde vivant — Lot 1 : audit et direction artistique

Premier lot du dossier « Finalisation du monde et de la direction artistique ». Il ne change pas encore le jeu : il
mesure ce qui existe, fixe la charte graphique que les lots suivants appliqueront, et classe les priorités.

Tout ce qui suit a été **mesuré** sur la version 1.6.1, par scripts et captures, sauf mention contraire :

- l'inventaire des 33 zones et des 90 pièces, tiré du générateur du monde ;
- 58 captures : une par zone, une par sorte de pièce, de jour ;
- l'observation de cinq places de ville pendant 90 s chacune ;
- la lecture du code du rendu, des habitants et du son.

## 1. Ce qui existe déjà (à garder et améliorer, pas à refaire)

| Système | État actuel | Fichier |
| --- | --- | --- |
| Rendu | échelle **entière** (× 2 jusqu'à 900 px de haut, × 3 au-delà), pixels nets (`image-rendering: pixelated`, lissage coupé), tri en profondeur par le pied, transparence des arbres et toits quand on passe derrière | `client/render/renderer.js` |
| Terrain | 17 sols, chacun en rampe de 5 teintes. Bords organiques par déformation du domaine (± 8,5 px), rides de l'eau, reflets | `client/render/terrain.js` |
| Sprites | tout est dessiné par le code (`pixel.js` : formes ombrées, contour automatique, relief en bas à droite) | `client/render/sprites-*.js` |
| Habitants | 60 habitants dans 5 villes, avec 4 rôles (marchand, matelot, flâneur, guet) et 4 moments (jour, soir, nuit, aube). Ils rentrent chez eux la nuit, vont à la taverne le soir, et le guet porte une lanterne. Il y a aussi des habitués attablés dans les tavernes et des chats | `client/townsfolk.js` |
| Lumière | carte de lumière colorée, halos chauds et froids, fenêtres éclairées la nuit, phare, vignettage, étalonnage | `client/render/lighting.js` |
| Météo | pluie, orage, éclairs, éclaboussures, selon l'heure du monde (déterministe, partagée) | `shared/constants.js` (`weatherAt`) |
| Vent | les cimes des arbres se balancent de 1 px | `renderer.js` |
| Son | une nappe d'ambiance (mer et vent) dont le niveau varie, la pluie, le tonnerre, des effets synthétisés | `client/audio.js` |

## 2. La vie des lieux, mesurée

Pour chaque place, le script reste 90 s immobile au milieu, comme un joueur qui regarde, et compte :

- les bulles de dialogue à moins de 330 × 190 px ;
- le maximum de bulles affichées en même temps ;
- les répliques redites en moins d'une minute ;
- la part d'habitants en mouvement.

Le script est `t_observe.cjs` (dans les scripts de contrôle).

### 2.1 Résultats

| Lieu | Bulles par minute | Au plus en même temps | Redites en moins d'1 min | Écart minimal entre deux bulles | Habitants à l'écran | En mouvement |
| --- | --- | --- | --- | --- | --- | --- |
| Port-Lanterne, jour | 10,7 | 3 | 6 | 1,1 s | 9,7 | 41 % |
| Port-Lanterne, soir | **25,3** | 3 | **29** | 1,0 s | 8,2 | 39 % |
| Libertalia (place), jour | 0 | 0 | 0 | — | **2,9** | 54 % |
| Libertalia (place), soir | 0 | 0 | 0 | — | 2,6 | 79 % |
| Rade-aux-Flibustiers, jour | 12,7 | 2 | 9 | 1,7 s | 6,7 | 49 % |

**Lecture :**

- **Port-Lanterne parle sans arrêt.** Le soir, une bulle toutes les 2,4 s et presque toutes redites dans la minute :
  c'est un flux de messages, pas une ambiance.
- **Libertalia est vide là où l'on regarde.** Ses 30 habitants se perdent dans une ville quatre fois plus grande que
  Port-Lanterne : moins de 3 à l'écran, et pas un mot.
- **Les habitants ne restent pas plantés** (aucun immobile plus de 40 s). Ce n'est pas le problème : ils bougent sans
  but, et ils bavardent trop.

### 2.2 Ce que montre le code

- **Des conversations qui n'en sont pas.** Toutes les 2,5 à 5,5 s, deux habitants proches s'arrêtent et disent chacun
  une réplique **tirée au hasard dans la même liste**. Par exemple :
  - « Poisson frais ! » suivi de « Mon cousin a vu une sirène » ;
  - le soir, « Qui paie la tournée ? » suivi de « Chante, matelot, chante ! ».

  Il n'y a ni question ni réponse, et rien ne lie la réplique au métier ou au lieu.
- **Pas de limite** au nombre de conversations proches, et pas de mémoire des répliques déjà jouées.
- **Les passants saluent le joueur** une fois sur trois quand il s'arrête près d'eux (« Bonjour, capitaine ! »).
- **Les rôles n'ont pas de métier visible.** Un marchand fait les cent pas près de son étal sans rien vendre, et un
  matelot marche au hasard dans la rue : il ne charge pas, ne pêche pas, ne répare rien. Le guet fait une ronde
  aléatoire.
- **La destination est un pavé tiré au sort** dans un rayon de 150 px : d'où des allers-retours sans but.
- Pas de dockers, de pêcheurs, d'artisans, de voyageurs ni de contrebandiers.
- **Les villages sont ceux des villes en plus petit.** Ils ont les mêmes rôles et les mêmes phrases ; seule la
  densité change (Rade 8, Havre 6, Anse 4).
- **Hors des villes, aucune vie humaine.** C'est voulu pour la jungle et les ruines, mais il manque des campements,
  des traces de passage et de rares voyageurs sur les chemins.

## 3. Défauts visuels relevés sur les captures

| Gravité | Défaut | Où | Lot |
| --- | --- | --- | --- |
| Haute | **Bords en escalier** : les limites roche/herbe, cendre/roche et lave suivent la grille en marches de 16 px sur de longues diagonales. La déformation de ± 8,5 px ne suffit pas | Forêt des Pendus, Île des Damnés, Hauts de Libertalia, Volcan, Quarantaine | 3 |
| Haute | **La même herbe partout** : un vert tacheté identique en prairie, jungle, collines, Île au Crâne et Baie des Naufrageurs. La jungle est une prairie avec plus d'arbres | 10 zones | 3 |
| Haute | **Plaques de roche plates** : de grandes taches grises sans relief ni éboulis, qui se lisent comme des taches | Prairie, Jungle de Brumesel, Collines, Hauts de Libertalia | 3 |
| Moyenne | **Arbres répétés** : le même feuillu, à la même taille et à intervalles réguliers | Jungle, Baie des Naufrageurs, Prairie | 3 |
| Moyenne | **Intérieurs vides** : forge, cave de l'atelier, armurerie, écuries et chantier naval n'ont que quelques meubles collés aux murs, et le même plancher | intérieurs | 4 |
| Moyenne | **Peu de traces de vie** : pas de filets séchant, de feux de camp éteints, d'empreintes, de casiers ou de cordages sur les quais | plages, quais, chemins | 4, 6 |
| Moyenne | **Le cadre de quête** (« Parlez à la Capitaine Morgane… ») occupe un grand rectangle à gauche, en plein champ de vision | partout | 9 |
| Moyenne | **Les annonces s'empilent** en haut de l'écran (« Nouvel air noté… », « Haut fait… ») et masquent le titre de la zone | à l'arrivée dans une zone | 9 |
| Basse | **La longue-vue** divise l'échelle par deux : à × 3, l'image passe en × 1,5 et les pixels deviennent inégaux | longue-vue, en plein écran | 2 |
| Basse | **Le balancement des cimes** découpe l'arbre à 55 % de sa hauteur et décale le haut de 1 px : on voit parfois la coupure | arbres | 6 |
| Basse | **Les ombres** sont toutes de la même ellipse violette, quelle que soit l'heure (elles ne s'allongent pas le soir) | partout | 8 |
| Basse | **Une seule nappe sonore**, mer et vent, partout : pas d'oiseaux en forêt, pas d'insectes la nuit, pas de bois qui grince au port, pas de feu qui crépite | partout | 6 |

**Pas de défaut de chargement** : toutes les ressources sont générées par le code, il n'y a ni fichier image ni chemin
à casser. Aucune erreur de page sur les 58 captures.

## 4. Fiche de traitement par zone

La densité indiquée est un repère, pas un quota. Pour les villes, c'est le nombre d'habitants visibles à l'écran ; ailleurs,
c'est une présence humaine.

### Villes

| Lieu | Ambiance recherchée | Densité | Activités | Éléments distinctifs |
| --- | --- | --- | --- | --- |
| **Port-Lanterne** | port marchand protégé par la Flamme, vivant mais pas bondé | moyenne-haute (6 à 9 à l'écran) | dockers qui chargent, pêcheurs, marchands à l'étal, guet en faction, flâneurs ; taverne le soir | quais chargés (caisses, filets, tonneaux), étals, fanions, Flamme Bénite |
| **Libertalia** | grande cité des forbans, commerçante et rugueuse | haute mais contrôlée (8 à 12) | marché (vendeurs et clients qui négocient), crieurs, gardes, contrebande discrète, artisans | marché couvert, palais, enseignes, foule plus dense au marché |
| **Les Bas-Fonds** | quartier pauvre, coupe-gorge la nuit | faible le jour, presque vide la nuit | silhouettes louches, échanges discrets | gravats, linge, lanternes rares |

### Villages et lieux habités

| Lieu | Ambiance recherchée | Densité | Activités | Éléments distinctifs |
| --- | --- | --- | --- | --- |
| **Rade-aux-Flibustiers** | repaire de flibustiers, bruyant le soir | moyenne (4 à 6) | matelots, réparations, taverne | barques tirées au sec, cordages |
| **Havre-des-Brumes** | village de pêcheurs dans la brume, calme | faible (2 à 4) | pêche, filets, conversations de voisins | filets, casiers, fumée des toits |
| **Anse-Tranquille** | anse paisible, maisons à vendre | faible (2 à 3) | vie quotidienne, jardin, repos | barrières, jardins |
| **Îlot de l'Ermite** | solitude | 1 (l'ermite) | il lit, pêche, observe | feu de camp, cabane |
| **Île aux Sept Courants** | cachette de contrebandiers (lot 5) | très faible | contrebande | caisses, lanterne |

### Côtes et plages

| Lieu | Ambiance recherchée | Densité | Activités | Éléments distinctifs |
| --- | --- | --- | --- | --- |
| **Plage des Os Blanchis** | première plage, ouverte | faible | crabes ; parfois un pêcheur à pied | coquillages, bois flotté |
| **Crique de l'Épave** | épave et pillards | très faible | ruines de bord | épave, débris |
| **Atoll des Ossements** | désolation | nulle | — | ossements, sable clair |
| **Lagon des Sirènes** | beauté inquiétante | nulle | — | coraux, eaux claires |
| **Baie des Naufrageurs** | côte des naufrageurs | très faible | une lanterne de naufrageur | rochers, fausses lumières |

### Nature et zones isolées

| Lieu | Ambiance recherchée | Densité | Activités | Éléments distinctifs |
| --- | --- | --- | --- | --- |
| **Prairie des Murmures** | campagne douce | très faible (un voyageur rare) | marcheurs sur le chemin | fleurs, herbe plus claire, haies |
| **Collines de la Rade** | collines rocailleuses | très faible | — | éboulis, rochers en relief |
| **Jungle de Brumesel** | jungle humide et sombre, sons d'oiseaux | nulle | faune | sous-bois sombre, fougères, lianes, racines |
| **Jungle Écarlate** | jungle rouge de haut niveau | nulle | — | feuillage écarlate, sol plus rouge |
| **Les Cannaies** | plantation de cannes | très faible | — | rangées de cannes, sentiers |
| **Mangrove des Contrebandiers** | eau sombre, racines, cachettes | très faible (un campement) | contrebande | racines, pontons, feu de camp |
| **Forêt des Pendus** | sinistre, silencieuse | nulle | — | arbres morts, gibets, sol éteint |
| **Marais des Noyés** | brume verdâtre, croassements la nuit | nulle | — | eaux stagnantes, roseaux, tombes |
| **Ruines du Temple Englouti** | silence, mystère | nulle | — | dalles brisées, piliers, mousse |
| **Île au Crâne**, **Îlots perdus** | trésors isolés | nulle | — | crâne de pierre, palmiers |
| **Île de la Quarantaine** | abandon et maladie | nulle (le Docteur Corbeau seul) | — | tentes déchirées, croix, linges |
| **Île des Damnés** | extrême, mort | nulle | — | cendre violette, ossements |
| **Volcan de Cendrelune** | chaleur, danger | nulle | — | lave, cendre, braises |
| **Hauts de Libertalia** | plateau sauvage | très faible | — | rochers en relief, crâne géant |
| **Haute mer**, **Brumes Éternelles**, **Gouffre du Kraken** | large, puis hanté | navires seulement | navires au loin, rares | écume, houle, brume |

### Intérieurs

| Lieu | Ambiance recherchée | Densité | Activités | Éléments distinctifs |
| --- | --- | --- | --- | --- |
| **Tavernes, auberges** | chaleur et bruit, plus le soir | moyenne (déjà en place) | jeux, chopes, repos | tables pleines, comptoir, cheminée |
| **Boutiques** (forge, armurerie, apothicaire, couture) | une identité de métier | 1 à 2 | l'artisan au travail | enclume et soufflet ; râteliers ; bocaux et alambic ; mannequins |
| **Écuries, chantier naval, entrepôt, cave** | lieux de travail | 0 à 2 | travail | foin et abreuvoirs ; membrures et planches ; caisses ; tonneaux |
| **Maisons** | intimité | 0 | — | lit, table, coffre |

## 5. La charte graphique

Ces règles décrivent le style qui existe déjà, en le précisant. Les lots suivants les appliquent ; aucune ne change
une dimension de sprite, une boîte de collision ou un point d'ancrage.

### 5.1 Grille, échelle et pixels

- **La tuile** : 16 × 16 px. Le monde fait 960 × 560 tuiles, plus la bande des intérieurs. Les collisions restent
  celles des tuiles.
- **Les sprites** : 1 pixel du sprite = 1 pixel du monde, jamais de demi-pixel.
  - personnages : 20 × 28, point d'ancrage au pied (10, 26) ;
  - montures : 36 × 32 ;
  - décors : leur propre taille, ancrés au pied.
- **L'échelle d'écran est toujours entière** : × 2 jusqu'à 900 px de haut, × 3 au-delà. Seule la transition de zoom
  des cinématiques passe par une mise à l'échelle intermédiaire, et elle retombe sur l'image entière suivante. Aucun
  filtre global ne doit flouter l'image.
- **Les positions sont arrondies au pixel** à l'affichage (la caméra l'est déjà).

### 5.2 Formes, contours, détail

- **Contour automatique d'1 px**, sur les personnages, monstres, objets et décors debout. Sa couleur est la teinte
  voisine assombrie à 32 %, mêlée à 45 % de brun-noir. **Jamais de noir pur.**
- **Pas de contour** sur les sols, l'eau ni les effets lumineux.
- **Détail** : au plus 3 teintes par petite surface (moins de 6 px). Un motif ne doit pas se répéter de façon visible
  sur moins de 4 tuiles.
- **Silhouettes** : un personnage doit se reconnaître à sa seule ombre portée (chapeau, arme, carrure). Un monstre
  doit se distinguer d'un PNJ par la forme avant la couleur.

### 5.3 Palettes par matériau

Chaque matériau est une **rampe de 5 teintes**, de l'ombre au reflet (celles de `terrain.js` et des sprites).

| Matériau | Règle |
| --- | --- |
| Bois | bruns chauds, veine plus sombre ; plus gris et plus pâle dehors (bois flotté, quais) |
| Pierre | gris légèrement bleutés en ville (pavés), gris-violet pour la roche sauvage, verdis par la mousse dans les ruines |
| Métal | gris froid avec un reflet presque blanc d'1 px ; laiton or-brun (`#c9962f`, `#f2c14a`) |
| Tissu | couleurs saturées mais pas criardes (voir `CLOTH_KEYS`) ; plis en une teinte plus sombre |
| Corde, toile | beige-brun ; voiles crème, jamais blanc pur |
| Végétation | une rampe par région : prairie (verts jaunes), jungle (verts bleus sombres), Écarlate (rouges), Pendus (verts éteints) |
| Eau | bleus profonds au large, turquoise près des côtes, écume blanc cassé |

### 5.4 Lumière, ombres, profondeur

- **Une seule direction de lumière, le jour** : du haut à gauche. Le relief s'assombrit en bas à droite (`innerShade`
  'br'), et les ombres portées tombent légèrement à droite (les arbres le font déjà, décalées de 3 px).
- **Ombres de contact** sous tout ce qui est debout : une ellipse de teinte violacée, jamais noire, à 28 % d'opacité.
  Au lot 8, elles suivront l'heure : plus longues et plus douces le soir, presque absentes la nuit.
- **La nuit** : la lumière vient des sources (torches chaudes, lanternes, fenêtres, magie froide). Un halo suit la
  forme de sa source : un cône pour une lanterne qu'on porte, un rectangle doux pour une fenêtre, un ovale aplati au
  sol pour un feu. On évite le disque générique, et une lumière ne doit jamais effacer le détail qu'elle éclaire.
- **Profondeur** : tri par le pied, transparence des décors hauts quand on passe derrière, brume légère seulement là où
  elle raconte quelque chose (marais, Brumes, Havre).
- **Lisibilité d'abord** : un joueur, un ennemi ou un télégraphe doit toujours rester visible, de jour comme de nuit.

### 5.5 Animation

- **4 directions.** La marche des personnages a 4 images, environ 9 par seconde (6 pour les monstres lents).
- **Mouvements secondaires** d'1 px au plus : respiration à l'arrêt, cimes, fanions, voiles. Pas de rotation des
  sprites pixel art, sauf pour les armes, les projectiles et les effets.
- **Pas de glissement** : les pieds suivent la vitesse, et l'arrêt revient à l'image de repos.
- **Rythme** : on évite les animations rapides et répétitives sur de grandes surfaces (l'eau, les feuillages).

### 5.6 Interface

- Le bois et le parchemin, l'or en accent (`--gold #f2c14a`).
- **Polices** : Pirata One pour les titres, Pixelify Sans pour le texte, toutes deux sous licence libre SIL Open Font
  License (Google Fonts). 13 px au minimum pour un texte lu.
- **Le jeu d'abord** : le cadre de quête et les annonces ne doivent pas couvrir le centre de l'écran (lot 9).

### 5.7 Effets

| Famille | Couleurs |
| --- | --- |
| Feu et explosions | oranges et jaunes, fumée gris chaud |
| Poudre et tirs | éclair blanc-jaune bref, fumée grise |
| Magie des morts | vert-bleu froid |
| Eau | écume blanc cassé, gouttes bleues |
| Coups critiques | or |
| Soins | vert tendre |
| Danger au sol | teinte d'ombre, liseré discret (lot 3 du premier dossier) |

Règles : pas de flash plein écran agressif, des particules en nombre borné, et jamais un effet qui masque un
télégraphe.

## 6. Priorités, dans l'ordre des lots

1. **Lot 2, fondations** :
   - échelle entière pour la longue-vue ;
   - un outil de vérification visuelle (grille, collisions, ancrages, routines des habitants) ;
   - des mesures de performance avant et après.
2. **Lot 3, environnements** :
   - plus de bords en escalier (raccords lissés) ;
   - un sol propre à chaque région ;
   - des rochers en relief au lieu des plaques plates ;
   - des arbres variés ;
   - des détails de contexte.
3. **Lot 4, architecture et mobilier** : des intérieurs meublés selon le métier, des quais et des plages qui gardent
   des traces de vie.
4. **Lot 5, vie des lieux** :
   - des métiers visibles ;
   - des points d'activité ;
   - de vraies petites conversations (une ou deux à la fois, trois personnes au plus, des délais irréguliers, sans
     répétition) ;
   - des silences ;
   - une densité par lieu.
5. **Lot 6, ambiance et événements** :
   - des sons localisés ;
   - le vent sur les fanions et les herbes ;
   - de petites scènes spontanées, la plupart décoratives et locales.
6. **Lot 7, personnages** : la respiration, des transitions plus douces, la présence des boss.
7. **Lot 8, lumière et effets** : des ombres selon l'heure, des halos qui suivent leur source, l'écume des côtes, des
   effets de combat cohérents.
8. **Lot 9, interface** : un cadre de quête plus discret, des annonces qui ne s'empilent pas sur le titre de la zone.
9. **Lot 10** : tests, mesures, rapport final.
