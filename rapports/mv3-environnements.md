# Monde vivant — Lot 3 : environnements

Version 1.6.3. Ce lot traite les défauts de terrain relevés au lot 1 : bords en escalier, même herbe partout, plaques de
roche plates, arbres répétés, peu de détails sur les côtes.

**Tout se passe à l'affichage** (`client/render/terrain.js` et `renderer.js`). Le monde lui-même n'a pas changé : les
tuiles, les zones, les collisions et les décors sont identiques, ce que vérifie `t_monde90`.

Captures avant et après, au même cadrage :

- `rapports/captures/mv3-herbe-ville.jpg` ;
- `rapports/captures/mv3-cotes-roches.jpg`.

## 1. Plus de bords en escalier

Le générateur du monde travaille en tuiles. Ses frontières sont donc des marches, d'une tuile ou de plusieurs.

- **Avant** : chaque pixel prenait la sorte de sol de la tuile la plus proche, après un léger tremblé (± 8,5 px). Une
  longue diagonale restait une suite de marches de 16 px.
- **Maintenant, entre deux sols différents quelconques** : chaque pixel pèse les quatre tuiles qui l'entourent, au
  prorata de sa distance à leur centre, et garde la sorte qui domine.
  - Une marche devient une vraie diagonale et un coin s'arrondit.
  - Un chemin d'une case garde sa largeur.
  - Le dessin reste à moins d'une demi-tuile de la grille.
- **Entre deux sols où l'on marche** (herbe, jungle, terre, boue, marais, cendre, herbe sombre), une ondulation plus
  ample, de ± 22 px environ, efface aussi les marches de deux ou trois tuiles. Exemples : la forêt des Pendus, la
  Quarantaine, les chemins de la prairie.

  Elle n'agit jamais à côté d'une case bloquante. **Un bord qui touche une case bloquante (roche, eau, mur) garde le
  dessin serré** : on ne fait jamais croire qu'on peut marcher là où l'on ne peut pas.
- **Ce qui ne change pas** : les planchers, les intérieurs et les pavés des villes gardent leurs bords nets. Ce sont
  des constructions, pas de la nature.

**Limite** : les plateaux rocheux de l'Île des Damnés sont des rectangles dans le générateur, et leurs cases sont
bloquantes. Leurs coins s'arrondissent un peu, mais ils restent des formes droites. Les changer voudrait dire déplacer
des collisions, ce que la charte interdit.

## 2. Un sol propre à chaque région

Chaque zone a maintenant une teinte, posée sur l'herbe, la jungle, l'herbe sombre, la terre, la boue et le marais.
Elle est **fondue d'une zone à l'autre sur environ trois tuiles**, pour qu'aucune couture ne se voie à la frontière.

| Zone | Teinte |
| --- | --- |
| Prairie des Murmures | vert plus jaune, plus doux |
| Jungle de Brumesel | sous-bois sombre et bleuté, terre plus sombre |
| Collines de la Rade | herbe sèche |
| Baie des Naufrageurs | herbe brûlée par le sel |
| Hauts de Libertalia | herbe rase de plateau |
| Île au Crâne | plus sombre |
| Les Cannaies | herbe jaunie de plantation |
| Îlots perdus, Lagon | vert tropical, luxuriant |
| Jungle Écarlate | sol rougi |
| Mangrove | boueuse |
| Havre-des-Brumes | vert gris de brume |
| Quarantaine | teinte maladive |
| Anse-Tranquille | vert tendre |
| Ruines du Temple | mousse |

Les villes, la plage, la cendre, la lave et le volcan gardent leurs couleurs.

## 3. Moins de répétitions

- **L'herbe « camouflage »** : les grandes taches claires et sombres de l'herbe ont perdu environ 40 % de leur
  contraste. Un grain fin porte la texture à leur place : un pixel sur quatre environ, plus clair ou plus foncé.
- **Les détails de sol**, qui prennent eux aussi la teinte de leur région :
  - **herbe** : des brins qui accrochent la lumière, en plus des touffes et des fleurs ;
  - **jungle** : de la litière de feuilles ;
  - **forêt des Pendus** : de l'herbe morte ;
  - **sable mouillé** : la laisse de mer, avec des algues et des galets au bord de l'eau.
- **Les arbres** : un arbre sur deux (feuillus, arbres de jungle, palmiers, arbres morts) est dessiné en miroir. La
  taille, le pied et la collision restent les mêmes. Le choix dépend de la position, donc un arbre ne change jamais de
  côté d'une visite à l'autre.

## 4. Les roches en relief

Les grandes plaques de roche grises et plates sont devenues **des champs de blocs** :

- chaque bloc a un haut éclairé (lumière en haut à gauche, comme le veut la charte) et un bas dans l'ombre ;
- une fissure sombre sépare deux blocs.

Les falaises en façade et la mousse des jungles et des ruines sont gardées. Voir la prairie, les collines, les Hauts de
Libertalia et la Crique de l'Épave.

## 5. Performance

- **En jeu, rien ne change** : le terrain est peint une fois par parcelle de 256 × 256 px, puis gardé en mémoire.
- **Une parcelle**, mesurée sur 32 parcelles de huit lieux :
  - avant : 49 ms en moyenne, 155 ms au pire ;
  - après : 57 ms en moyenne, 135 ms au pire ;
  - soit environ 8 ms de plus en moyenne, et un pire cas qui baisse.
- **Limite connue, et ancienne** : quand on navigue vite, une nouvelle parcelle peut coûter une image un peu plus
  longue au moment où elle se peint. C'était déjà le cas avant.

## 6. Tests

- `npm test` : 33 suites, toutes réussies. Parmi elles, `t_monde90` confirme que le sol, les zones et les collisions
  n'ont pas bougé.
- Captures avant et après sur 16 zones, de jour, sans erreur de page.

## 7. Fichiers modifiés

- `client/render/terrain.js` :
  - lissage des raccords (`smooth`), ondulation entre sols praticables ;
  - teintes régionales (`region`) ;
  - herbe plus calme, détails régionaux, laisse de mer ;
  - roches en blocs.
- `client/render/renderer.js` : arbres en miroir (`mirrorSpr`).
