# Navires — 1. Audit de l'expérience maritime (version 1.8.0)

## Ce qui existe, et marche

**Physique** (`server/ships.js`, autoritaire)

- Un vrai corps : la vitesse se décompose le long de la coque et en travers, avec une dérive amortie selon le navire.
- L'élan suit une constante de temps par modèle (plus longue quand on ralentit).
- La barre agit sur une roue qui reste où on la laisse ; il faut de l'erre pour gouverner. Ancre au fond et de la
  vitesse, le navire pivote sur elle.
- Un vent global tourne lentement : vent arrière on file, face au vent on va moitié moins vite.
- Collisions :
  - avec la côte : on glisse le long d'un quai ; un choc franc abîme la coque ; échoué, l'équipage déborde à la gaffe ;
  - entre navires : poussée selon les masses, dégâts au-delà d'une vitesse relative.

**Postes** : la barre, les drisses, le cabestan (plus rapide à plusieurs), les canons.

- On marche sur le pont et l'on y monte par la passerelle.
- Deux façons de tenir la barre :
  - « simple » : la direction tenue est le cap voulu, Espace change la voilure ;
  - « réelle » : Q/D pour la roue, Z/S pour la voilure.

**Dégâts**

- Une seule jauge, la coque.
- Elle se refait seule jusqu'à 50 % au calme, se répare au chantier, et le navire sombre quand elle cède.
- Les pirates sur le pont sont protégés à 70 % par la coque.

**Rendu** (`client/render/ships.js`)

- La coque et le pont sont peints une fois, puis tournés sur 128 caps.
- La hauteur de bord est figurée par des copies empilées ; la mâture et les voiles sont projetées en perspective
  (gîte, roulis, voiles qui se gonflent ou faseyent, vergues brassées au vent).
- Autour : le sillage en V, l'écume d'étrave, la passerelle à quai, les fanaux la nuit, le recul des canons, l'ancre.

**Interface** : un tableau de bord avec :

- la coque, la roue, la voilure, l'ancre ;
- le vent et l'allure, la vitesse en nœuds ;
- une ligne d'aide permanente ;
- trois boutons : Dégager, Rentrer au port, Descendre à terre.

## Les problèmes

**Prise en main**

- **On ne jette pas l'ancre depuis la barre.** Il faut courir à la proue, au cabestan. Seul, c'est la première
  frustration.
- **Espace fait tourner la voilure en boucle** (ferlée, mi-voile, toute, puis ferlée) : pour réduire la toile, il faut
  repasser par « toute ». Il n'y a pas de touche pour réduire.
- **Voiles ferlées, on ne peut plus manœuvrer du tout.** La vitesse tombe à zéro et la barre ne mord plus : approcher un
  quai au ralenti est impossible, on y arrive voiles dehors ou on n'y arrive pas.
- **Le travail d'équipage n'apporte presque rien.**
  - Seul le cabestan profite du nombre.
  - Les drisses tenues par un matelot ne font ni mieux ni plus vite que la barre seule.
  - L'équipage invisible lève l'ancre aussi vite qu'un pirate au cabestan.
- **La ligne d'aide est toujours là**, même pour un capitaine aguerri.

**Physique**

- **Le vent est le même pour tous les navires.** Un brick à voiles carrées et une goélette aurique ont la même courbe ;
  face au vent, chacun garde la moitié de sa vitesse, et il n'y a jamais de raison de tirer des bords.
- **Les identités des modèles se résument à trois nombres** (élan, rayon de virage, dérive), qu'on ne voit nulle part
  dans le jeu.
- **Le sloop porte une voile carrée** : il ressemble à un petit brick.

**Rendu**

- **Les flancs n'ont aucun détail** : une seule couleur extrudée. Ni préceinte, ni sabords, ni fenêtres de poupe, ni
  usure.
- **Les huit modèles se distinguent surtout par la longueur et les couleurs** :
  - le galion et la Veuve ont la même silhouette ;
  - le spectre est une goélette verte ;
  - aucune figure de proue, aucun château de poupe visible de côté.
- **Le bastingage est peint à plat**, sans hauteur : pas de rambarde, pas de montants.
- **Rien ne change avec les dégâts** : ni trou, ni fumée, ni voile déchirée, ni mât brisé. Le naufrage est un fondu de
  4 secondes, sans gîte ni débris.
- **Le pavillon est le même noir pour presque tous** ; il n'y a aucune personnalisation (seuls les cotres du festival en
  ont une).
- **Les fanaux sont deux pixels fixes.**
- Il n'y a ni remous dans les virages, ni réaction à la tempête.

**Combat**

- **Le boulet est un carré de 4 pixels**, sans arc ni ombre : on ne voit pas d'où il vient.
- **Un coup ne fait que retirer de la coque** : ni voilure, ni gouvernail. Rien n'oblige à réparer pendant le combat,
  et rien ne le permet en mer.

**Vie à bord** : on ne peut rien faire sur le pont en dehors des postes. Pas de siège, pas de carte, pas de longue-vue,
pas d'équipage visible.

**Interface** : la vitesse, le cap et le vent sont en texte. On ne sait pas qui tient quel poste, l'état des canons
n'est visible qu'au canon même, et il n'y a pas de dégâts à afficher.

**Performance** : rien d'alarmant. La coque est mise en cache par modèle et la mâture est redessinée à chaque image ;
avec une dizaine de navires à l'écran, il faudra mesurer après la refonte.

## Les tests qui encadrent l'existant

`t_ships11` et `t_nav12` fixent l'essentiel, qu'il faut garder :

- l'ancre levée en 3,5 s par un pirate seul au cabestan ;
- l'élan lent ;
- la roue qui reste où on la laisse, le virage, la dérive ;
- le boulet qui part sur le côté, la coque qui encaisse ;
- l'échouage, le naufrage, la sauvegarde du navire et du pont, la disparition après dix minutes.

## Le plan

1. **Prise en main** :
   - à la barre, tout l'essentiel : la direction, la voilure (plus et moins), l'ancre ;
   - les avirons quand les voiles sont ferlées ;
   - l'équipage humain apporte un vrai avantage : voilure réglée plus vite, meilleure marche aux drisses, ancre bien
     plus rapide au cabestan.
2. **Physique** :
   - une marche au vent propre à chaque gréement : les voiles carrées aiment le vent arrière et peinent au près, les
     voiles auriques remontent au vent ;
   - le face au vent devient lent sans être bloquant ;
   - des caractéristiques lisibles par modèle.
3. **Rendu** :
   - des flancs peints rangée par rangée (préceintes, sabords, fenêtres de poupe, usure) ;
   - des rambardes en relief, des figures de proue, des châteaux, une silhouette et un gréement propres à chaque modèle ;
   - pavillons et voiles personnalisables, fanaux qui se balancent ;
   - les dégâts se voient ; le naufrage est progressif, avec des débris.
4. **Combat** :
   - boulets en arc, avec ombre, fumée et éclats ;
   - trois états : coque, voilure, gouvernail, avec leurs effets sur la marche ;
   - réparation à bord, à l'établi du charpentier, et complète au chantier.
5. **Vie à bord** : s'asseoir, la table des cartes, la longue-vue, des matelots visibles qui travaillent et parlent de
   temps en temps.
6. **Tableau de bord** :
   - compas, vent, vitesse ;
   - les trois états, les postes tenus, les canons ;
   - des aides contextuelles qui s'effacent quand on sait faire.
