# Monde vivant — Lot 4 : architecture et mobilier

Version 1.6.4. Ce lot traite deux défauts relevés au lot 1 : des ateliers presque vides, et des quais sans traces de
vie.

Captures :

- `rapports/captures/mv4-ateliers.jpg` (forge, armurerie, écuries, avant et après) ;
- `rapports/captures/mv4-ecurie-apothicaire-chantier.jpg` ;
- `rapports/captures/mv4-quai-libertalia.jpg`.

## 1. Ce qui existait, et qu'on garde

- **Les façades se distinguaient déjà** :
  - des murs de plâtre, de pierre ou de bois ;
  - des toits de chaume, d'ardoise ou de couleur ;
  - une enseigne de métier près de la porte (la chope pour la taverne, l'enclume pour la forge, l'ancre, les dés à
    Libertalia) ;
  - des façades propres à Libertalia.

  Contrôle fait sur les 19 sortes de boutiques. **Je n'ai pas ajouté d'enseignes** : elles auraient fait doublon et
  encombré les façades.
- **Les tavernes, auberges, maisons, le palais, le Velours et la Bourse aux Dés** sont déjà bien meublés : je n'y touche
  pas.

## 2. Onze nouveaux meubles, dessinés selon la charte

`client/render/sprites-mobilier.js` dessine, par le code, à l'échelle des meubles existants (de 10 à 22 px) :

- la botte de foin ;
- les sacs de grain ;
- la pile de planches ;
- l'alambic de cuivre, avec un petit foyer qui luit ;
- le seau cerclé ;
- la meule à aiguiser ;
- le tabouret ;
- et, pour les quais : le rouleau de cordage, le filet étalé à sécher, le casier à homards.

Chaque meuble suit les règles de la charte : rampes de teintes, contour automatique sans noir pur, lumière en haut à
gauche.

## 3. Les ateliers meublés selon leur métier

`shared/mobilier-world.js` ajoute 31 meubles, en tout dernier dans la génération du monde : aucun identifiant de l'ancien
monde ne bouge. Les règles de pose :

- chaque meuble se pose le long d'un mur ou dans un coin, sur une case libre ;
- jamais à moins de deux cases de la porte ;
- jamais sur la case d'un personnage.

| Atelier | Ajouté |
| --- | --- |
| Forge (L'Enclume Salée) | meule, planches contre le mur, seau près de l'enclume, tabouret |
| Armurerie du Sabre Courbe | deux mannequins d'armure, meule, tabouret |
| Écuries de la Porte du Nord | trois bottes de foin, seau, sacs de grain |
| Chantiers navals | planches, ancre, cordage, seau |
| Apothicairerie | alambic, tabouret, sacs |
| Capitainerie | deux bannières, ancre, cordage |
| Couture, cave de l'atelier, entrepôt, receleur | tabouret, sacs, planches, cordage selon le cas |

## 4. Des traces de vie sur les quais

Sur les quais de Port-Lanterne, Libertalia, la Rade, Havre-des-Brumes et l'Anse-Tranquille, **15 objets** se posent au
bord de l'eau : cordages, filets à sécher, casiers.

- Ils sont posés au sol : on passe dessus, **rien ne bloque**.
- Ils restent à trois cases au moins des quais d'armement, et loin des portes.
- Jamais sur une jetée d'une case de large.

Ils sont rares exprès (une case de quai sur dix environ) : le quai doit paraître utilisé, pas encombré.

## 5. Ce que le garde-fou vérifie (`t_monde90`)

- Le sol et les zones n'ont pas bougé.
- **Aucune case libre du monde extérieur n'est devenue bloquante.** Les objets des quais ne bloquent pas.
- **26 cases d'intérieurs** sont occupées par le mobilier ajouté, pour une limite de 400.
- **Chaque personnage, chaque porte, chaque coffre reste accessible.**

## 6. Tests

- `npm test` : 33 suites, toutes réussies.
- Captures avant et après de six ateliers et d'un quai de Libertalia, sans erreur de page.

## 7. Limites

- Les maisons des joueurs (`home`) restent vides au départ : c'est voulu, le joueur les meuble lui-même (système des
  propriétés).
- Les grottes, la Fosse, les cellules et les fonds marins n'ont pas reçu de mobilier : ce sont des lieux sauvages ou
  de combat.

## 8. Fichiers

- **Nouveaux** :
  - `client/render/sprites-mobilier.js` ;
  - `shared/mobilier-world.js` ;
  - ce rapport.
- **Modifiés** :
  - `shared/world.js` : dix nouvelles sortes de décors, et l'appel en tout dernier ;
  - `client/render/renderer.js` : le branchement des sprites.
