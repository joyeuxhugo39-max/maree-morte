# Refonte des navires — livraison (version 1.9.0)

L'audit et le plan sont dans `rapports/nv1-audit.md`. Ce rapport dit ce qui a été fait, comment on l'a vérifié, et ce
qui reste.

## 1. Ce qui a changé

### La prise en main

**À la barre (mode simplifié)** :

- ZQSD : la direction voulue ;
- Espace : un cran de toile en plus (ferlée, mi-voile, toute) ; Maj : un cran de moins ;
- X : on mouille (l'ancre tombe tout de suite) ou l'on fait lever l'ancre par l'équipage.
- Voiles ferlées, la direction tenue fait ramer, pour accoster ou se dégager d'un quai. Aux avirons, on vire court.
  La vitesse aux avirons dépend du navire : 30 px/s pour la barque, 10 pour le galion.

**L'équipage (mode équipage, en même temps)** :

| Manœuvre | Sans renfort | Avec des pirates aux postes |
|---|---|---|
| Lever l'ancre | l'équipage seul : 4,1 s | un pirate au cabestan : 2,3 s ; deux : 1,6 s |
| Hisser toute la toile | depuis la barre : 3 s | un gabier aux drisses : 1,5 s, et +7 % de vitesse |

**Les postes de détente** : la table des cartes, la longue-vue et le banc ne sont pas des postes. On n'y bloque personne.

### La physique

- **Une marche au vent par gréement** (`POLAR` dans `shared/data/ships.js`). Au près, à 120° du vent arrière :

  | Gréement | Au près |
  |---|---|
  | Voiles carrées (brick, galion, Veuve) | 0,45 |
  | Voiles auriques (sloop, goélette) | 0,80 |

  - Vent arrière, les voiles carrées sont les meilleures.
  - Face au vent, tout le monde avance : au moins 0,28, et 0,62 pour le Spectre.
  - Mesuré en jeu :
    - le brick fait 2,1 fois plus vite au vent arrière qu'au près ;
    - la goélette va presque aussi vite au près qu'au largue.
- **L'élan, la dérive et le virage** de chaque modèle sont ceux de la 1.1 ; les tests qui les fixent passent toujours.
- **La course des Mille Voiles garde l'ancienne marche au vent**, pour que ses temps et son classement ne bougent pas.

### Les dégâts, les réparations

- **Trois parties.**
  - Un boulet à la poupe touche le gouvernail, un boulet près d'un mât déchire la voilure. Ailleurs, il touche parfois le
    gréement.
  - Chaque partie plafonne à 80 % d'abîme : rien ne cède tout à fait.
- **Leurs effets.**
  - Toile en lambeaux : jusqu'à −36 % de vitesse de pointe.
  - Gouvernail touché : la roue tourne jusqu'à 32 % moins vite, et le navire vire jusqu'à 40 % moins.
  - Moins d'un cinquième de coque, c'est la voie d'eau : −12 % de vitesse, la coque perd encore en plein combat, et elle
    ne se refait plus seule au calme.
- **Les réparations.**
  - L'établi du charpentier remet d'abord le gouvernail, puis la toile, puis la coque, jusqu'à 80 % en mer. Il va deux
    fois moins vite sous le feu.
  - Au calme, l'équipage rapièce un peu tout seul.
  - Le chantier naval répare tout, comme avant, y compris la voilure et le gouvernail.

### Le dessin et les animations (`client/render/ships.js`)

**Le flanc** est peint rangée par rangée, sur toute la hauteur du franc-bord :

| Modèle | Liston | Flanc et sabords | Carène |
|---|---|---|---|
| Brick | crème | bande ocre aux sabords noirs | cuivrée |
| Galion | doré | rouge, deux batteries de sabords aux mantelets rouges | cuivrée |
| Veuve | rouge | noire | goudronnée |
| Spectre | — | pourri, troué | algues |

**Chaque modèle a aussi :**

- un bastingage en relief, plus haut sur les châteaux ;
- une figure de proue : volute, oiseau, lion, crâne, la Veuve ;
- un pont à lui :
  - la claire-voie du sloop ;
  - le panneau bâché de la goélette ;
  - les caillebotis du brick et du galion ;
  - la toile d'araignée peinte de la Veuve ;
  - la caisse et le tonnelet du radeau ;
  - le filet de la barque.

**Le gréement** :

- la voile au tiers de la barque ;
- l'aurique et le foc du sloop ;
- la brigantine du brick ;
- les deux focs de la goélette ;
- les trois étages et l'artimon latin du galion et de la Veuve ;
- les haillons translucides du Spectre ;
- l'emblème peint sur la grand-voile : le soleil du galion, le crâne de la Veuve ;
- des flammes en tête de mât, et des écoutes de la voile au bastingage.

**Les animations** :

- La houle et le roulis, plus forts dans l'orage.
- Les haubans qui ondulent.
- Les fanaux pendus à leur potence, qui se balancent.
- Les remous du virage, côté extérieur.
- La gerbe d'étrave quand on tape dans la vague.
- Le sillage plus large quand on file.

**Le combat** :

- Le boulet suit une cloche, avec son ombre sur l'eau et une traînée ; il fait une gerbe quand il manque.
- La bordée laisse un nuage et un éclair ; la gueule fume après le tir.
- Un coup au but :
  - des éclats et de la fumée ;
  - un trou qui reste sur le pont, autant de trous que la coque a encaissé ;
  - une planche qui part à l'eau.
- La coque qui baisse :
  - sous 40 % de coque, de la fumée ;
  - sous 20 %, des flammes, qui éclairent la nuit.
- La toile déchirée, puis le mât brisé : un moignon, la vergue qui pend.
- Le gouvernail touché bat.
- Les navires ennemis montrent aussi leurs blessures.

**Le naufrage** :

- Le navire se couche ; la flottaison monte et l'eau envahit le pont ; des remous.
- Il laisse des débris : planches, tonneaux, caisses, espars, lambeaux. Ils dérivent avec le vent pendant une
  demi-minute.

**Les matelots du bord** sont de simples figurants, dessinés seulement chez le joueur.

- Combien : 1 sur le sloop, 2 sur le brick, la goélette et le Spectre, 4 sur le galion et la Veuve.
- Ce qu'ils font :
  - ils halent aux drisses et virent au cabestan ;
  - ils servent les pièces quand on tire ;
  - ils guettent à la proue, briquent, lovent les cordages, s'assoient au mouillage.
- Ils évitent les postes tenus par des pirates.
- Parfois, une phrase selon la situation : beau vent, près serré, orage, combat, voie d'eau, mouillage, nuit.

### L'identité, la personnalisation

**Les fiches des navires** : au quai d'armement, « Fiches et couleurs de mes navires », ou le bouton « Couleurs » du
tableau de bord.

- Elles montrent la vitesse, la marche au près, la manœuvre, la coque, les canons, les postes et les matelots.
- Elles donnent les forces et les faiblesses de chaque modèle.
- Un test vérifie qu'aucun navire n'en écrase un plus cher sur les cinq axes.

**Les couleurs** :

| Élément | Choix |
|---|---|
| Pavillon | 6 |
| Voiles | 6, dont rayées |
| Liston | 6 |
| Fanaux | 4 |

- Elles sont gratuites, vues de tous (elles passent dans la fiche réseau du navire) et gardées dans la sauvegarde.
- Elles ne changent rien à la marche : un test le vérifie.

### Le tableau de bord

- **Les états** :
  - la coque, la voilure et le gouvernail, en jauges ;
  - l'alerte « Voie d'eau ! ».
- **Le compas** :
  - le cap (la flèche rouge) et le vent (la flèche bleue) ;
  - tout autour, la marche du navire à chaque cap, du rouge au vert.
  - Avec, à côté, la vitesse en nœuds et l'allure (« belle allure », « le navire peine »).
- **La manœuvre** :
  - la roue ;
  - la voilure, avec un repère doré pour celle demandée ;
  - l'ancre (« levée · aux avirons » quand on rame) ;
  - un voyant par canon : vert s'il est tenu, orange pendant le rechargement.
- **À plusieurs** : une case dit qui tient la barre, les drisses, le cabestan et l'établi.
- **Les aides** :
  - elles disent d'abord ce qui presse : voie d'eau, gouvernail touché, toile déchirée, retour au port ;
  - elles disent ensuite ce qu'on ne sait pas encore faire.
  - Elles s'effacent quand on a hissé la voile, mouillé et pris la barre quelques fois. Les compteurs sont dans le
    navigateur.
  - Le bouton « ? » les rappelle.

**En passant** : l'apostrophe typographique (’) s'affichait comme rien dans la police des invites (« SASSEOIR »,
« LETABLI »). Elle s'affiche maintenant.

## 2. Ce qui ne change pas

- **Les sauvegardes** :
  - `SAVE_VERSION` reste 10 ;
  - les couleurs sont un champ facultatif (`shipLook`) ;
  - une sauvegarde d'avant se charge avec le navire d'origine, voilure et gouvernail intacts.
- **Le réseau** :
  - le protocole reste le 15 ;
  - la ligne d'un navire gagne trois nombres en fin (voilure et gouvernail abîmés, drapeaux) ;
  - les messages `ctl` gagnent `row` et `anc`, et un message nouveau, `shiplook`, arrive.
  - Tout est validé côté serveur :
    - voilure ramenée entre 0 et 1, et un nombre exigé ;
    - avirons à −1, 0 ou 1 ;
    - couleurs filtrées par une liste fermée ;
    - pas plus de trois changements de couleurs par seconde.
- **La course des Mille Voiles** garde sa marche au vent ; ses tests passent.
- **Aucune ressource externe** : les dessins sont du code, comme avant.

## 3. Les tests

### Automatiques

- **`npm test` : 35 suites, toutes OK.**
- **La suite nouvelle, `tests/t_navires19.mjs` : 62 vérifications.** Elle couvre :
  - la marche au vent par gréement, sur le papier puis en vrai ;
  - la barre (voilure par crans, ancre, valeurs hors bornes) ;
  - les gains de l'équipage au cabestan et aux drisses ;
  - les avirons ;
  - les dégâts par partie et leurs effets ;
  - l'établi, la voie d'eau ;
  - les coins du pont ;
  - aucun navire meilleur en tout ;
  - les couleurs : nettoyage, réseau, sauvegarde, reconnexion ;
  - une sauvegarde d'avant.
- **Deux tests anciens ont été adaptés, sans rien relâcher de ce qu'ils vérifient** :
  - **`t_ships11`** mesure la dérive pendant le virage : le sloop, plus vif au largue avec ses voiles auriques, touchait
    la côte avant la fin.
  - **`t_server04`** réembarque par la passerelle du navire là où il est. Aux drisses, la toile monte deux fois plus vite
    et la barque avait filé plus loin du quai d'armement.
- **Un défaut trouvé par les tests et corrigé** : l'établi de la barque se posait en plein milieu de l'ouverture du
  bastingage et empêchait de monter à bord. C'est devenu la caisse à outils du banc de poupe, qui n'est pas un obstacle.

### Au navigateur (Playwright, Chromium)

**Le jeu solo : 18 vérifications sur 18 OK, sans erreur de page.**

- Prendre la barre ; partir avec Espace (ancre levée, toute la toile) ; virer à la flèche ; réduire avec Maj.
- Ramer voile ferlée ; mouiller avec X.
- Les compteurs d'apprentissage.
- La table des cartes, la longue-vue, le banc.
- Les fiches et les couleurs, et l'établi qui répare le gouvernail d'abord.

**À plusieurs, sur le vrai serveur Node : 10 vérifications sur 10 OK, deux fois de suite.**

- Le déroulé, avec Alpha, Bravo et Charlie :
  - Alpha arme un brick ; Bravo, de son groupe, monte à bord ;
  - Alpha à la barre, Bravo au cabestan ; à deux, l'ancre est levée en 2,5 s ;
  - Charlie, resté à quai, voit les couleurs choisies et la voile qui monte ;
  - le tableau de bord d'Alpha sait qui tient quoi.
- Deux raccourcis, dits honnêtement :
  - les trois pirates sont posés sur le quai par leur sauvegarde (la marche au clavier depuis la place se perdait entre
    les maisons) ;
  - Alpha prend la barre par le même message que la touche E, parce qu'à l'endroit où il s'était arrêté, le canon de
    bâbord était plus près.

**Les galeries** : les huit modèles sous deux caps, un galion criblé, un naufrage et ses débris.

### Mesures

- **Le rendu, avec huit navires à l'écran, toutes voiles dehors (médiane d'une image complète)** :
  - 2,3 à 2,4 ms avec le dessin de la 1.8 ;
  - 2,8 à 2,9 ms avec celui de la 1.9 ;
  - soit environ +0,5 ms, pour un budget de 16,7 ms ;
  - le 90ᵉ centile passe de 3,0–3,6 à 3,5–3,7 ms.
- **Le serveur** : les calculs nouveaux sont quelques additions par navire et par pas. Ils n'ont pas été mesurés à part.

### Ce qui n'a pas été vérifié

- **Aucun pirate humain n'a joué** : les réglages (avantages de l'équipage, marche au vent, durée des aides) sont des
  choix raisonnés, à confirmer en partie.
- **Un combat entre deux équipages de joueurs** n'a pas été joué au navigateur. Les coups, les dégâts par partie et les
  réparations sont vérifiés par la suite automatique.
- **Les phrases des matelots** sont tirées au hasard toutes les 30 à 70 secondes ; elles n'ont été vues qu'en
  captures.

## 4. Captures (`rapports/captures/`)

| Fichier | Contenu |
|---|---|
| `nv-avant-apres-est.jpg`, `nv-avant-apres-no.jpg` | barque, brick, goélette, Spectre, galion et Veuve, en 1.8 (à gauche) et en 1.9 (à droite) |
| `nv-galion-crible.jpg` | la coque à 15 %, la toile en lambeaux, le gouvernail touché |
| `nv-galion-naufrage.jpg`, `nv-galion-debris.jpg` | le naufrage, puis ses débris |
| `nv-ui-*.jpg` | à la barre, aux avirons, la vigie, les fiches et les couleurs, le navire repeint, l'établi |
| `nv-mp-alpha.jpg`, `nv-mp-charlie.jpg` | l'essai à plusieurs |
