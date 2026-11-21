# Monde vivant — Lot 2 : fondations techniques

Version 1.6.2. Ce lot vérifie la netteté, l'échelle, les couches, les chargements et les collisions, mesure la
performance, et pose deux outils pour les lots suivants : une surcouche de vérification dans le jeu, et un garde-fou
automatique du monde.

## 1. Netteté et échelle

| Point | Constat | Action |
| --- | --- | --- |
| Échelle normale | entière (× 2 jusqu'à 900 px de haut, × 3 au-delà), `image-rendering: pixelated`, lissage coupé, caméra arrondie au pixel | rien à changer |
| **Longue-vue** | elle divisait l'échelle par deux : × 3 devenait × 1,5, et les pixels du monde n'avaient plus tous la même taille | **corrigé** : la moitié du zoom, arrondie à l'entier (× 2 et × 3 deviennent × 1). Vérifié à 1280 × 720 et 1920 × 1080 |
| Zoom des cinématiques | par paliers entiers ; seule la transition passe par une mise à l'échelle CSS, qui retombe exactement sur l'image suivante (lot 4) | rien à changer |
| Filtre d'étalonnage | `saturate`, `contrast`, `sepia` légers sur la toile du monde : ils changent les couleurs sans flouter | gardé : ce n'est pas un flou qui cache des ressources |

## 2. Couches, chargements, collisions

- **Couches** : sol, puis décors au sol, ombres, tri par le pied (décors, personnages, PNJ, habitants, chats, quais),
  mâture des navires, effets, lumière, météo, étiquettes, interface.
  - Aucun défaut d'ordre n'a été vu sur les 58 captures du lot 1.
  - La surcouche du § 3 montre le pied de chaque décor, sur lequel se fait le tri : on peut le contrôler partout.
- **Chargements** : toutes les images sont générées par le code, donc pas de fichier à manquer ni de chemin à casser.
  Seules les deux polices viennent de Google Fonts (licence libre SIL OFL). Si elles ne chargent pas, le jeu passe sur
  des polices de secours.
- **Collisions** : la boîte d'un personnage fait 10 × 5 px au pied, sur la grille des tuiles. La surcouche la dessine,
  avec les cases bloquantes.

## 3. L'outil de vérification visuelle (`client/render/vue.js`)

On l'active en ajoutant `?vue=1` à l'adresse du jeu, puis on l'affiche ou le masque avec **F9**. Sans le paramètre, il
n'existe pas : pas de touche, pas de coût.

Il dessine par-dessus le monde :

- la grille des tuiles et les cases bloquantes (en rouge) ;
- le pied de chaque décor (en jaune), sur lequel se fait l'ordre de profondeur ;
- la boîte de collision et le point d'ancrage des personnages :
  - joueur en cyan ;
  - autres joueurs en vert ;
  - monstres en rouge ;
  - PNJ en orange ;
  - habitants en violet ;
- pour chaque habitant, son rôle, son activité, sa destination (un trait), et 💬 quand il parle ;
- les sources de lumière et leur portée ;
- un bilan : temps de rendu (moyen et pire), échelle, nombre de décors, entités, habitants (dont en conversation),
  lumières, particules et effets à l'écran.

Mesuré à Port-Lanterne avec la surcouche : 6,6 ms par image en moyenne, 91 décors, 28 habitants, 49 lumières, 23
particules. La surcouche elle-même coûte environ 2 ms ; sans elle, c'est 4,5 ms (§ 5).

## 4. Le garde-fou du monde (`tests/t_monde90.mjs`, dans `npm test`)

Les lots 3 à 6 vont toucher au décor. Ce test les empêche d'abîmer l'ancien monde :

1. **Le sol et les zones de la 1.6.1 n'ont pas bougé.** L'empreinte est enregistrée dans
   `tests/fixtures/monde-1.6.1.json`.
2. **Aucune case libre du monde extérieur ne devient bloquante.** Dans les intérieurs, le mobilier ajouté est compté,
   avec une limite.
3. **Personne n'est muré.** Chaque personnage, chaque porte (dehors et dedans) et chaque coffre se trouve dans un espace
   praticable d'au moins 20 cases. Deux exceptions voulues sont nommées dans le test :
   - Ambroise Vif-Argent, enfermé dans sa cellule ;
   - les entrées des fonds marins, qu'on atteint en plongeant depuis un navire.
4. **Le monde est le même à chaque génération.**

Résultat sur la 1.6.2 : tout passe.

## 5. Performance, avant de toucher au décor

Chromium sans affichage, 1280 × 720, 4 s par lieu. C'est la référence des lots suivants.

| Lieu | Rendu moyen | 95ᵉ centile | Images/s |
| --- | --- | --- | --- |
| Port-Lanterne, jour | 4,5 ms | 6,0 ms | 60 |
| Libertalia, place, nuit | 4,4 ms | 6,6 ms | 60 |
| Libertalia, marché, jour | 1,6 ms | 2,2 ms | 60 |
| Volcan de Cendrelune | 1,8 ms | 1,9 ms | 59 |
| Pleine mer | 0,7 ms | 1,0 ms | 60 |
| Plage en fête, spectacle | 4,8 ms | 6,5 ms | 60 |

Serveur, 50 pirates simulés : 4,0 ms par tour en moyenne, pour un budget de 50 ms.

## 6. Fichiers

- **Nouveaux** :
  - `client/render/vue.js` ;
  - `tests/t_monde90.mjs` ;
  - `tests/fixtures/monde-1.6.1.json` ;
  - ce rapport, et le rapport du lot 1 (`rapports/mv1-audit-charte.md`).
- **Modifiés** :
  - `client/render/renderer.js` : l'échelle entière de la longue-vue, le branchement de la surcouche ;
  - `client/main.js` : `?vue=1` et F9.
