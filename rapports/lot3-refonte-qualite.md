# Lot 3 — Refonte qualité : quêtes, boss, équilibrage, lisibilité

Branche de travail : `dossier-global`. Rien n'est encore publié.

**Méthode.** Tout a été mesuré par des programmes qui jouent avec les vrais mécanismes du jeu, puis corrigé, puis
re-mesuré. Il n'y a pas eu de test par un humain : le ressenti reste à confirmer en jouant. Chaque mesure est
désormais un test du dépôt, que `npm test` relance : 28 suites.

## 3a. Les 81 quêtes, jouées de bout en bout (`tests/t_quetes30.mjs`)

**Le parcours.** Un pirate de test joue chaque quête dans l'ordre de ses prérequis :

1. Il l'accepte auprès de son donneur.
2. Il remplit chaque objectif comme un joueur :
   - tuer le monstre, puis ramasser son butin ;
   - cueillir, acheter, parler ;
   - entrer dans la zone ;
   - gagner aux dés ;
   - plonger depuis un navire ;
   - souffler dans la conque pour faire venir le Kraken ;
   - tenir des vagues dans la Fosse.
3. Il rend la quête au bon personnage.

**Les cas particuliers.** Le test vérifie aussi :

- les trois embranchements de fin ;
- les 14 primes répétables ;
- le partage en groupe ;
- la déconnexion en pleine quête, puis la reprise ;
- l'abandon, puis la reprise.

**Résultat** : 81 quêtes sur 81 jouables jusqu'au bout. Il y avait une quête bloquante, et d'autres défauts.

| Quête | Problème | Correction |
|---|---|---|
| « Marchandise discrète » | Le coffret ne venait que du cambriolage de la maison d'un **autre joueur**. En solo, impossible ; ailleurs, environ 10 % de chances par cambriolage, puis 30 minutes d'attente | Les flibustiers maudits des Collines de la Rade (le repaire du receleur) en portent. Le coffret tombe seulement pour la quête, trois fois au plus par pirate, pour qu'il ne serve pas de filon. La quête passe au niveau 12, celui de la Rade. Le cambriolage reste possible |
| « Les épreuves de la Fosse » | On devenait champion de la Fosse sans s'y battre | Une quatrième épreuve : tenir cinq vagues dans la Fosse, devant la foule. Elle s'ajoute après les autres : la progression déjà faite est gardée |
| « Le roi qui dort sous la mer » | La seule grande quête sans conversation jouée | Une conversation d'ouverture et un dénouement, avec Elouan, qui entend les cloches d'Ys depuis l'enfance |
| « Les cloches d'Ys » | Ysaline promet son casque, Elouan le donne sans un mot d'elle | Elouan dit qu'Ysaline le lui a confié |

**Contrôles qui ne demandaient pas de correction :**

- Les 559 répliques des conversations ont été vérifiées. Elles sont toutes bien formées, avec des personnages qui
  existent. Les 67 quêtes d'histoire ont désormais toutes une conversation jouée.
- Les quantités dites dans les dialogues correspondent aux objectifs.
- Les récompenses suivent l'effort : petites pour les quêtes où l'on va seulement parler à quelqu'un, grandes pour
  les grands combats. Le receleur paie ce qu'il promet.

**Ce qui n'a pas été fait :**

- J'ai relu les dialogues des quêtes du type « tuer N monstres » et contrôlé la structure de toutes les
  conversations, mais je n'ai pas relu une à une les 559 répliques.
- Les primes qui demandent les mêmes monstres que certaines quêtes uniques (les Cannaies, les gardes du fort) sont
  gardées : elles progressent ensemble, sans rien coûter au joueur.

## 3b. Les boss et les élites, en combat simulé (`tests/t_boss30.mjs`)

**Le protocole.** Chacun des 18 boss et élites terrestres est affronté par un pirate de son niveau, équipé de ce
que vendent les boutiques. Le pirate frappe au sabre et tire au rythme réel de son arme. Chaque combat est joué
trois fois :

- seul, sans esquiver : le pire des cas ;
- seul, en esquivant à la vitesse d'un pirate : les zones annoncées, les nuages, les coups armés (en roulant) et les
  tirs (en faisant un pas de côté) ;
- à trois.

**Ce qui était cassé ou plat, et ce qui change :**

- **Quatre grands boss n'avaient pas de combat à eux.** La Reine de la Mangrove et Grand-Feu n'étaient que des PV.
  Gradlon reprenait les coups du Capitaine Noyé, élite de niveau 9. Le Roi sans Couronne reprenait ceux du Général
  d'Os. Chacun a maintenant ses propres capacités, toutes annoncées au sol :
  - **la Reine de la Mangrove** : de la vase qui reste, des racines en éventail. Elle « boit la marée » pour se
    soigner : la frapper fort l'interrompt et l'étourdit. Son soin s'affiche en « +N » vert ;
  - **Grand-Feu** : des lanternes qui embrasent le sol, une ruée qui laisse une traînée de feu, un anneau de fausses
    lumières avec une seule brèche ;
  - **le Roi sans Couronne** : des décrets en croix, une spirale d'éclats de couronne, un saut sur sa cible, sa
    garde ;
  - **Gradlon** : les cloches d'Ys, deux anneaux (il faut rester contre lui ou très loin), et chaque volée vide
    l'air, ce qui envoie vers les bulles. Aussi un trident en éventail, la porte de la mer, sa cour de noyés.
- **Les Frères Ferrailleurs étaient invincibles en solo.** Côte à côte, ils sont invulnérables. Seul face à eux, on
  ne pouvait pas les séparer : par exemple si le compagnon se déconnecte en plein combat. Le bouclier ne tient
  désormais que face à plusieurs pirates. La règle « les abattre à huit secondes près » reste.
- **Un boss repartait à neuf en plein combat.** Entraîné hors de son repaire, il retournait à sa place guéri et
  revenait à sa première phase, même quand trois pirates se battaient encore dans son repaire. Il y retourne
  maintenant **sans guérir ni oublier ses phases**. Il ne se remet à neuf que si tout le monde a fui ou est tombé.
- **La Goule Alpha** armait ses coups en 0,3 s, à la limite des réflexes. C'est désormais 0,38 s.

**Résultats mesurés.** Ils varient d'un passage à l'autre : les combats ont leur part de hasard.

- **Victoire en solo.** Les 18 boss se laissent vaincre par un pirate seul de leur niveau, toutes phases jouées.
- **Durée en solo.** De 8 à 60 s de combat continu. Davantage en vrai, où l'on esquive, se soigne et se replace.
- **L'esquive protège.**
  - Sans esquiver, on perd de 120 à 630 % de ses PV par minute.
  - En esquivant bien, sept boss ne touchent presque plus.
  - Le plus dur reste Vespère, Comte des Marées, le boss final : de 120 à 300 % par minute selon les passages, venus
    surtout de ses coups au contact et de ses damnés.
- **À trois.**
  - Chaque boss tombe, et les deux frères se laissent séparer.
  - Le combat dure à peu près autant qu'en solo, parce que le boss prend +60 % de PV par pirate (règle de la 1.0,
    gardée).
  - Chacun encaisse en général moins.

**Ce qui n'a pas été fait :**

- Les boss marins (Kraken, frégates, galion, bricks) ne sont pas simulés : le combat se joue au canon depuis un
  navire. La venue du Kraken est vérifiée par le test des quêtes.
- Le pirate simulé esquive les tirs de façon approximative.
- À trois, mes pirates simulés se gênent plus que de vrais joueurs. Je n'ai donc pas modifié l'équilibre de groupe
  sur ces chiffres.

## 3c. L'équilibrage (`tests/t_equilibre30.mjs`)

- **Armes.**
  - La chance de critique (×1,8) n'entrait pas dans la normalisation des dégâts. Elle y entre maintenant.
  - Les tromblons y échappaient complètement. Ils sont normalisés sur le total de leurs plombs, avec 1,5 fois un
    tir simple : ils restent redoutables à bout portant, et seulement là.
  - Le Tromblon de l'Ermite faisait près de cinq fois la médiane des armes à feu de son niveau : de 91 à 42 dégâts
    par seconde, tous plombs au but.
  - Le Scalpel du Docteur passe de 113 à 92. Les autres armes rares restent au-dessus de la médiane, dans la limite
    prévue : c'est leur récompense.
- **Progression.**
  - Les quêtes donnaient **317 %** de l'expérience nécessaire pour atteindre le niveau 30. Qui faisait tout passait
    la moitié des quêtes avec trois niveaux d'avance ou plus, jusqu'à huit, face à des boss devenus faciles.
  - Désormais, une quête faite avec beaucoup d'avance rapporte moins, comme les monstres : pleine expérience jusqu'à
    un niveau d'avance, puis 60, 35, 20 et 12 %.
  - C'est affiché dans le journal des quêtes avant d'accepter, et au rendu.
  - Une campagne simulée qui fait toutes les quêtes dans l'ordre : au pire 4 niveaux d'avance (8 avant), en moyenne
    1,3 (2,3 avant). Le niveau 30 est atteint sans un seul combat en plus.
- **Économie.**
  - Aucun objet n'est introuvable.
  - Aucun achat-revente ne rapporte.
  - Chaque boss rapporte quelque chose, et aucun objet de boss n'est à moins de 2 % de chances.
  - Les 54 objets « à revendre seulement » sont des meubles, des trophées, des animaux, des poissons et du butin de
    cambriolage, que chacun de leurs systèmes utilise.

## 3d. Lisibilité, interface, son, performance

- **Les zones dangereuses se voyaient mal.** Leur remplissage était pâle, leur contour faisait 1 pixel, et elles
  étaient assombries la nuit avec le sol. Elles sont maintenant dessinées en deux passes :
  - au sol, un remplissage plus dense ;
  - par-dessus la lumière et la météo, un contour sombre puis un contour vif de 2 pixels, qui clignote dans les
    derniers instants.

  Captures de Grand-Feu comparées avant et après, de jour comme de nuit sous la pluie.
- **Tailles d'écran** (1024 × 768, 1280 × 720, 1366 × 768, 1920 × 1080). En 1024 de large, la discussion cachait
  les deux premières cases de la barre d'action, et le bandeau du navire touchait la discussion. Elle se règle
  maintenant sur la place disponible, et le bandeau sur la discussion : plus aucun chevauchement aux quatre tailles.
- **Son.**
  - L'ambiance de la mer et du vent, ainsi que le grognement des morts, ignoraient le réglage du volume des effets.
    Ils le suivent maintenant.
  - Nouveau : un bref signal sonore quand une zone annoncée vous vise.
  - Je n'ai pas pu écouter le son dans cet environnement.
- **Performance** (Chromium sans affichage, 1280 × 720). Inchangée ou un peu meilleure : 60 images/s partout.

  | Lieu | Lot 1 | Lot 3 |
  |---|---|---|
  | Port-Lanterne, jour | 3,5 ms | 3,2 ms |
  | Libertalia, place, nuit | 3,7 ms | 3,1 ms |
  | Libertalia, marché | 1,7 ms | 1,5 ms |
  | Volcan | 1,1 ms | 1,2 ms |
  | Pleine mer | 0,7 ms | 0,7 ms |

**Ce qui n'a pas été fait dans ce lot :**

- Pas de refonte des panneaux. L'inventaire, l'équipement, la carte et le journal ont été refaits en 0.8.1 : j'ai
  vérifié leur placement et leur lisibilité, pas leur ergonomie détaillée.
- Pas de nouveaux sons de combat, de navire ou de mer au-delà de ce qui est décrit plus haut.
- Pas de nouveaux décors : la finition graphique date de la 1.1.1.

## Décisions à valider

1. **L'expérience des quêtes faites avec trop d'avance est réduite.** C'est le plus gros changement de ce lot.
2. **Les tromblons sont affaiblis**, l'Ermite surtout : 22 → 10 par plomb.
3. **Les Frères Ferrailleurs** n'ont plus de bouclier face à un pirate seul.
4. **Un boss entraîné trop loin** revient à sa place sans guérir.
5. **« Marchandise discrète »** passe du niveau 10 au niveau 12.
6. **« Les épreuves de la Fosse »** ont un objectif de plus. Un pirate qui l'avait en cours devra tenir les vagues.

## État de reprise

Lot 3 terminé sur la branche `dossier-global`. Prochain : Lot 4, le système de cinématiques réutilisable.
