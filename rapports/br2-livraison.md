# Le Plus Grand Braquage — 2. Refonte des environnements (version 2.0.0)

Ce rapport fait suite à l'audit (`rapports/br1-audit.md`). Il dit ce qui a été reconstruit, comment, ce qui a été
vérifié et de quelle façon, et ce qui reste imparfait. Les captures « avant » et « après » sont dans
`rapports/captures/` (`br-avant-*.jpg`, `br-apres-*.jpg`), prises aux mêmes endroits, de nuit, en 1280 × 720.

## Les principes appliqués

- **Un plan écrit pour chaque lieu.** Dans `shared/heist-decor.js`, chaque lieu est une grille de lettres lisible
  (une lettre par pièce, `#` pour un mur). Le sol, le style de mur et le décor accroché à chaque mur en découlent.
- **Aucun placement au hasard.**
  - Chaque meuble a une case et une emprise déclarées ; toutes les cases de l'emprise sont solides, plus seulement une.
  - Le décor mural est choisi mur par mur : le tirage au hasard (fenêtres, cartes au trésor) est coupé dans ces lieux.
  - Le hasard ne sert plus qu'au grain des matières (veinage d'un marbre, usure d'une planche).
- **Les fenêtres seulement sur un mur extérieur.** Le mur du nord des pièces qui donnent dehors ; un test le vérifie.
- **Les enveloppes ne bougent pas.**
  - Les six pièces gardent leur place, leurs portes et leur numéro ; seul leur intérieur change.
  - L'atelier de Lafleur, trop petit, reçoit une pièce neuve, allouée après toutes les autres : aucune pièce ne bouge.
  - Les points d'interaction sont déplacés, jamais renumérotés.
- **Construit en tout dernier**, après Port-Lanterne : les identifiants des décors de l'ancien monde ne bougent pas.

## Le moteur (ce qui a été ajouté pour rendre ces lieux possibles)

- **Des sols par case** :
  - parquet à bâtons rompus, damier de marbre, marbre de galerie, dalles d'office, planchers d'entrepôt et de
    magasin, allée de manutention peinte, pierre humide avec flaques et mousse ;
  - tuiles rouges, ardoise, tuiles canal, faîtages, terrasses, pavés de ruelle, bordages de pont et de dunette ;
  - des tapis à bordure, frange et médaillon.
- **Des murs par pièce** : papier damassé, tenture de velours, appareil de pierre, boiseries, enduit, briques, façades
  de ruelle. Le ciel de nuit et les toits lointains forment le fond, au-dessus des toits.
- **Le décor mural choisi** : fenêtres à rideaux, tableaux (sept sujets), portrait au-dessus de la cheminée, miroirs,
  tapisserie, bibliothèques encastrées, cartes, égouttoir, cuivres, panneaux de la Douane, plans d'architecte, tableau à
  outils, soupiraux, niche, fenêtres et portes de façade, enseignes, échelles.
- **Une couche au-dessus des personnages** : lustres, palan, lanternes pendues, linge tendu, gréement. Elle devient à
  demi transparente quand le pirate passe dessous.
- **Dehors dans une pièce** : les toits et le pont prennent la lumière du ciel, et non plus la pénombre d'un salon.
  Le vide y devient une ruelle (en bas des toits) ou la mer (autour du navire).
- **Des sons par lieu**, tous synthétisés :
  - cave : gouttes, pinces dans l'égout ;
  - entrepôt : charpente, chaîne du palan ;
  - atelier : plume, poêle ;
  - réception : verres qui trinquent ;
  - toits : vent, un chien au loin ;
  - pont : coque, vagues.
- **Des gardes qui contournent** : en ronde, en diversion et en poursuite, un garde suit la carte des distances de la
  pièce dès que la ligne droite est barrée. Il ne bute plus sur un mur ou un meuble.

## Les lieux reconstruits

### A. La demeure de Valdorne (46 × 20)

Sept pièces distinctes, chacune avec son sol, son mur et son mobilier.

- **Le grand salon** :
  - au nord, une cheminée de marbre sous le portrait de Valdorne, quatre hautes fenêtres à rideaux, deux tableaux,
    deux miroirs ;
  - un grand tapis à médaillon, deux lustres de cristal ;
  - deux coins pour s'asseoir (canapé, table basse, fauteuils) ;
  - l'estrade des musiciens (clavecin, harpe), le buffet près de l'office, deux colonnes qui encadrent la grande baie ;
  - une horloge, des guéridons.
- **Le vestibule** : damier de marbre, chemin rouge de la porte à la baie, le vestiaire (les uniformes de la garde y
  sont pendus), la console du livre d'or, une horloge, deux plantes.
- **L'office** : dalles, mur blanchi et lambris bleu ; égouttoir, cuivres, fourneau, table de travail, provisions.
- **Le salon de jeu** du capitaine Ferrant : tapis vert, table de jeu, chaises, cave à liqueurs, râtelier.
- **La galerie** : marbre clair, chemin bleu, deux refends qui forment quatre alcôves avec leurs tableaux ; vitrines,
  bustes, armures, banquette, candélabres, et la statue de la Fortune au fond.
- **Les archives** : boiseries sombres, bibliothèque encastrée, carte des comptoirs ; le bureau du registre, le coffre
  central, des rayonnages ; au nord, la fenêtre par laquelle Silas s'enfuit.
- **Le cabinet de Valdorne** : son bureau, son fauteuil, le globe, la cave à liqueurs.

### B. Le quartier de la demeure

- **La demeure monte sur la hauteur**, au-dessus d'une cour d'honneur close ; la façade, plus large, garde son numéro.
- **À l'ouest**, deux parterres : buis taillés, ifs en cône et en boule, fleurs.
- **Au centre**, l'allée des quatre lanternes et la fontaine.
- **À l'est**, la terrasse sur la baie : balustrade, banc, longue-vue, jardinières, un palmier.
- **On y entre par la ruelle des Corsaires**, entre deux maisons à vendre. Elle est fermée sur la rue par un portail
  à piliers et lanternes.
- **Les six parcelles des joueurs, leurs portes et la rue n'ont pas bougé d'une case.**
- **Les gens du quartier** :
  - deux gardes au portail et deux au perron, dont les mots changent selon l'avancement de la quête ;
  - le jardinier, le jour ;
  - la nuit, des invités qui montent l'allée.

### C. La réception

Vingt-six figurants, chacun à sa place, et neuf groupes, chacun avec son sujet :

- autour de Valdorne ; les deux coins assis ; le commerce ; les ragots ; le buffet ; le guéridon ; la partie de cartes ;
  ceux qui la regardent.

Ce que fait chacun :

- **Les invités** : ils se tournent vers celui qui parle et rient parfois. De temps en temps, l'un d'eux change de
  groupe par un chemin calculé, qui évite meubles et invités.
- **Les domestiques** font leur tournée de l'office au buffet, puis de groupe en groupe.
- **Les musiciens** jouent. Le cuisinier se tourne vers sa table. Le majordome accueille à la porte, le portier
  surveille.
- **Le pirate qui s'attarde** près de quelqu'un se fait adresser la parole, autrement s'il porte l'uniforme de la garde.
- **La bagarre** : les curieux vont voir à la porte du salon de jeu, les autres se retournent, la musique s'arrête.
- **L'alarme** :
  - les invités debout se réfugient contre les murs, loin de la galerie ; les invités assis se figent ;
  - le calme revenu, chacun regagne sa place.

### D. L'entrepôt de la Douane

Organisé en zones :

- des rayonnages contre le mur du nord ;
- des îlots de stockage séparés par des allées (caisses, tonneaux, sacs, planches) ;
- les saisies (une cage, des caisses) ;
- l'allée de manutention peinte, de la porte au fond ;
- le quai de chargement devant la porte (bascule, diable, marchandises à peser) ;
- le bureau du receveur : registre, guichet grillagé, penderie des uniformes, coffre ;
- des lanternes pendues et un palan au-dessus de l'allée.

### E. L'atelier de Corvin Lafleur

- **Une vraie pièce, plus grande** (14 × 9 au lieu de 8 × 6) :
  - la table à dessin sous la fenêtre, où Lafleur travaille dos au bureau ;
  - la maquette de la demeure Valdorne ;
  - des plans épinglés, le tableau à outils, l'établi ;
  - les rouleaux de plans, l'étagère, le poêle ;
  - le bureau et son tiroir.
- **La trappe** est dans le plancher, avec ses pentures et son anneau.
- **La porte de la maison n'a pas bougé** ; elle mène désormais à l'atelier neuf, et le coffre de l'ancienne pièce l'a
  suivi (même coffre, même numéro).

### F. La cave

- Pierre humide, flaques et mousse.
- Murs de pierre suintants, deux soupiraux, une niche avec sa chandelle.
- L'échelle jusqu'à la trappe, un casier à vin, des tonneaux, des caisses.
- La bouche d'égout par où montent les crabes. Les six crabes sont répartis entre les tonneaux et la bouche d'égout,
  sur des cases libres.

### G. Les toits et les ruelles (96 × 18)

- **En haut, cinq toitures différentes** :
  - tuiles rouges ; ardoise avec lucarnes ;
  - une terrasse avec pots, table et linge ;
  - tuiles canal ; tuiles rouges, puis la terrasse du port d'où l'on descend.
- **Leurs faîtes, leurs cheminées fumantes** : aux mêmes cases qu'avant, Silas court entre elles.
- **Les quatre ruelles à sauter** se voient en contrebas. Une passerelle de planches est jetée sur la deuxième.
- **Au milieu, les façades vues de la ruelle** : fenêtres à volets (certaines allumées), portes, enseignes, deux échelles,
  une mansarde.
- **En bas, quatre ruelles nommées** : leurs pavés, des caisses contre les murs, du linge tendu, des lanternes, une
  petite cour avec son puits, et l'arche qui mène aux quais.

### H. La Mouche d'Or

- **Un pont de navire** :
  - bordages calfatés ; la dunette à la poupe (barre, chaloupe, cloche, fanaux) ;
  - deux mâts aux places des anciens piliers, avec leur gréement au-dessus des têtes ;
  - un cabestan, une écoutille, des glènes de cordage, une cargaison arrimée contre le bastingage.
- **La proue s'affine**, et la mer se voit tout autour.
- **Les canons, les barils de poudre et les barricades** restent aux mêmes cases : le combat contre Silas et ses trois
  phases sont inchangés.

## Ce qui n'a pas changé (les mécaniques)

- Les sept étapes, les trois infiltrations (uniforme, diversion, force), Lafleur et Bréchet.
- La trahison et son choix, les trois itinéraires de la poursuite, les trois phases du combat, les trois fins.
- La confiance de Silas, les récompenses, les conséquences, les embuscades, l'île aux Sept Courants.
- Les sauvegardes (format inchangé, version 10) et le multijoueur.
- Aucun chiffre d'équilibrage n'a été modifié.
- Les scènes de la réception et de la trahison suivent le nouveau plan :
  - la caméra cadre l'estrade et la galerie ;
  - Silas passe par la grande baie ;
  - Silas fuit par la fenêtre du nord des archives.

## Les fichiers

**Créés**

- `shared/heist-decor.js` : les plans des lieux, la pose des meubles, la réception, le quartier, et un calcul de chemin
  partagé avec le client.
- `client/render/heist-art.js` : les sols, les murs, le décor mural et les sprites des lieux.
- `tests/t_lieux20.mjs` : la suite de vérification des lieux.
- Ce rapport et l'audit, avec leurs captures.

**Modifiés**

- `shared/world.js` : l'appel du module et les nouveaux types de décor.
- `client/render/terrain.js` : les sols, les murs, le vide en ruelle ou en mer.
- `client/render/renderer.js` : la couche au-dessus des personnages.
- `client/render/lighting.js` : la lumière du dehors dans les toits et sur le pont.
- `client/ambience.js` : les sons des lieux.
- `client/heist.js` : la réception et le quartier.
- `server/heist.js` :
  - les déplacements des gardes, qui contournent les obstacles ;
  - les pièces où un invité n'est pas suspect ;
  - l'annonce de la bagarre et de l'alarme au client.
- `server/game.js` : un pirate enregistré dans l'ancien atelier reparaît dans le neuf.
- `shared/data/cinemas.js` : les points des scènes.
- `shared/data/braquage.js` : les répliques de la réception et du quartier.
- `tests/t_monde90.mjs` et sa référence : les lieux redessinés y sont listés explicitement.

**Graphismes**

- **Réutilisés** : canapé de tavernier, table de jeu, plante, chaise, globe, candélabre, fourneau, étagère, râtelier,
  caisses, tonneaux, sacs, planches, cage, établi, rouleaux, cabestan, canons, barils, chaloupe, fontaine, lanternes de
  ville, banc, longue-vue, jardinières, buissons, palmiers, fleurs, escalier, arche du port, puits, le palais de la cité
  (agrandi).
- **Créés** (même facture : lumière en haut à gauche, contour automatique, palettes partagées), 50 sprites, dont :
  - pour la demeure : cheminée de marbre, lustre, fauteuils, canapés, buffet, colonne, clavecin, harpe, estrade,
    horloge, vestiaire, bustes, statue, vitrines, armures, rayonnages, bureaux, coffre central ;
  - pour le quartier : mur de cour, portail, balustrade, topiaires ;
  - pour l'entrepôt : rayonnage de magasin, bascule, diable, guichet, palan, lanternes ;
  - pour l'atelier et la cave : table à dessin, maquette, trappe, casier à vin, échelle, bouche d'égout ;
  - pour les toits : cheminées, lucarnes, linge, passerelle ;
  - pour le navire : mâts, gréement, barre, écoutille, fanal, bastingage, cloche, cordages.
- **Aucune image ni aucun son externe** : tout est dessiné et synthétisé par le code.

## Les vérifications

### Tests automatiques (suite `npm test`, 36 suites)

**`t_lieux20` (nouveau, 36 vérifications sur le vrai monde et le vrai serveur)**

- **Les plans** :
  - sept pièces distinctes dans la demeure, six sols, sept styles de mur ;
  - aucun décor mural hors d'un vrai mur, aucune fenêtre sur un mur intérieur ;
  - 320 meubles et décors posés, aucun dans un mur ni dans le vide, aucun devant une porte.
- **Tout est accessible depuis l'entrée** :
  - 40 points dans la demeure, 8 dans l'entrepôt, 5 dans l'atelier, la cave et ses six crabes ;
  - les points de marche des scènes.
- **Les figurants** : 26, chacun sur sa case, répartis en neuf groupes. Les deux tournées des domestiques contournent
  meubles et invités.
- **Les gardes** :
  - la diversion : les trois gardes en faction rejoignent le salon de jeu en 9 s, puis regagnent leur poste ;
  - les trois rondes font leur tour complet ;
  - un garde en alerte contourne vitrines et refends.
- **La poursuite et le combat** :
  - le faîte : Silas passe entre les cheminées ;
  - huit sauts praticables ; les ruelles et la descente vers les quais ; la ville jusqu'à la passerelle ;
  - le pont : les canons à portée, barricades dressées ou non, et Silas, sa chaloupe et les barils atteignables.
- **Le quartier** : de la rue à la porte par le portail, sans traverser la fontaine. Les six maisons à vendre restent
  accessibles.
- **Les sauvegardes** :
  - enregistré dans l'ancien atelier : on reparaît dans le neuf ;
  - enregistré là où l'on a posé le buffet : on n'y reste pas coincé.

**`t_monde90` (le garde-fou du monde)**

- Les sept rectangles redessinés sont listés dans la référence, et le test vérifie que ce sont exactement ceux-là.
- Hors d'eux et de Port-Lanterne, le sol, les zones et la mer sont comparés case par case à la 1.9.1 : aucune case n'a
  changé.
- Les deux décors qui quittent l'ancien atelier sont listés et expliqués : le bureau du braquage est retiré, le coffre
  est déplacé.

**Les autres suites**

- `t_braquage50` (le parcours complet) et `t_boss30` (le combat) passent sans modification.
- `t_port18` a révélé un point d'apparition de monstres de la jungle dans la cour d'honneur, devenue ville. Il a été
  reculé sur la colline.

### Essais dans le navigateur (Chromium, scriptés)

- **La visite de chaque lieu**, de nuit : aucune erreur de page.
- **Les scènes de la réception et de la trahison**, jouées sur le nouveau plan : aucune erreur. Silas verrouille la
  grille et file par la fenêtre ; la course commence.
- **Les réactions de la réception** :
  - à la bagarre, cinq curieux vont voir ;
  - à l'alarme, quinze invités se réfugient, les assis se figent ;
  - une fois le calme revenu, les 26 regagnent leur place ;
  - à aucun moment un figurant ne se trouve dans un meuble.
- **La cadence d'images** :

| Taille d'écran | Images par seconde |
|---|---|
| 1280 × 720 | 60 |
| 1024 × 768 | 60 |
| 1920 × 1080 | 36 à 41 |

  En 1920 × 1080, la ville hors braquage tourne aussi à 39 images par seconde. C'est le navigateur sans carte graphique
  du banc d'essai qui limite, pas la refonte.

### Pas faits, ou partiels

- **Pas d'essai à deux joueurs dans le navigateur pour ces lieux.** Le jeu à plusieurs du braquage est couvert côté
  serveur par `t_braquage50` (groupes, diversion, préparatifs partagés).
- **Les figurants de la réception et du quartier sont joués par chaque client.** Deux joueurs dans le salon ne voient
  pas exactement les mêmes déplacements d'invités. Les gardes, Valdorne et Ferrant sont, eux, partagés par le serveur.
- **Pas de nouvelle vérification de la musique** : elle n'a pas été modifiée.

## Les limites techniques, et ce qui reste imparfait

- **Le haut des pièces.** La caméra s'arrête au bord de la pièce : on voit le mur du nord du salon et de la galerie,
  mais jamais en entier.
- **Les cloisons d'une seule rangée** (entre les petites pièces de la demeure) se voient comme un dessus de mur sombre.
  Seuls les murs de deux rangées montrent une façade entière ; c'est la règle du moteur.
- **Le sud de la cour d'honneur** est caché par les toits des maisons à vendre. Ces maisons ne pouvaient pas bouger.
- **La proue du navire s'affine par cases entières**, en escalier. Le gréement est une couche à demi transparente.
- **Les toitures sont dessinées à plat** : le faîte se lit par la couleur, non par un relief.
- **Les sauts restent des téléportations**, comme avant ; on n'a pas touché à la mécanique.
- **Le protocole réseau n'a pas changé de numéro**, comme lors des refontes 1.8 et 1.9. Un onglet resté ouvert sur
  l'ancienne version et connecté à un serveur 2.0 verrait l'ancien décor jusqu'à son rechargement. 27 suites de test
  écrivent ce numéro en dur, ce qui a dissuadé de le changer dans ce lot.

## Les notes, lieu par lieu (honnêtes, sur 10)

| Lieu | Avant | Après | Ce qui retient la note |
|---|---|---|---|
| Demeure (salon, vestibule, office, jeu, galerie, archives, cabinet) | 3 | 8 | mur du nord vu en partie ; cloisons d'une rangée sombres |
| Quartier de la demeure | 2 | 7,5 | le sud de la cour caché par les toits des maisons ; façade générique agrandie |
| Réception | 3 | 7 | figurants propres à chaque client ; conversations en bulles courtes ; personne ne danse |
| Entrepôt de la Douane | 3 | 7 | allée peinte discrète ; mobilier surtout réutilisé |
| Atelier de Lafleur | 2 | 7 | pièce neuve, mais petite ; la trappe reste discrète sous l'éclairage |
| Cave | 3 | 6,5 | peu de détails nouveaux ; les crabes n'y sont qu'au moment du service |
| Toits et ruelles | 3 | 6,5 | toitures à plat ; sauts toujours téléportés ; la ville (le troisième itinéraire) inchangée |
| La Mouche d'Or | 3 | 6,5 | proue en escalier ; gréement à demi transparent ; navire à quai, voiles serrées |
