# Marée Morte

MMORPG 2D vu de dessus, en pixel art, sur le thème **pirates contre zombies**.
Tout le graphisme et le son sont générés par le code : aucune image ni fichier audio externe.

L'archipel de Port-Lanterne est maudit. Le Capitaine Barbe-Cendre a volé le Cœur de Corail
et, chaque nuit, la Marée Morte relève les noyés. Seule la Flamme Bénite, sur la place du port,
tient les morts à distance.

## Contenu de la version 0.1

- **Monde** : une île de 192 × 144 tuiles avec 8 zones (Port-Lanterne, plage, prairie, jungle,
  ruines du temple, marais, cimetière, crique de l'épave), rivière, ponts, quais, phare,
  navire pirate amarré, épave, 7 coffres au trésor. Cycle jour/nuit de 16 minutes, avec
  éclairage dynamique, faisceau du phare, brume, lucioles et feux follets.
- **Combat** : sabre (clic gauche), armes à feu (clic droit), roulade d'esquive invulnérable,
  et 4 compétences débloquées par niveau (Tourbillon, Rasade de rhum, Bombe, Cri d'abordage).
- **Ennemis** : crabes putrides, matelots zombies, boucaniers, goules, noyés, squelettes
  canonniers (à distance), et le boss **Capitaine Barbe-Cendre** (invocations et tirs de canon).
- **Objets** : plus de 130 objets (armes, pistolets, fusils, chapeaux, manteaux, bottes,
  talismans, nourriture, rhum, matériaux), raretés, équipement visible sur le personnage.
- **Quêtes** : 8 quêtes enchaînées (parler, tuer, collecter, explorer) jusqu'au boss, plus 4 primes répétables.
- **PNJ** : Capitaine Morgane, Isa la forgeronne (boutique), Bartholomé le tavernier (boutique),
  le vieux Gaspard, Léon le mousse, et Coco le perroquet.
- **Interface** : création du pirate, inventaire avec équipement, journal de quêtes, boutiques,
  dialogues, chat, minimap, carte.

## Nouveautés de la version 1.1 : de vrais navires

Les navires ne sont plus des montures qu'on met à l'eau n'importe où : ce sont de vrais navires, qui restent
dans le monde, sur lesquels on marche, et qu'on mène à plusieurs.

- **On arme son navire au port**, et seulement là. Chaque port a son quai d'armement, marqué d'une bitte d'amarrage ⚓ : Port-Lanterne, la Rade, Havre-des-Brumes, Anse-Tranquille et deux à Libertalia. On peut aussi passer par un charpentier de marine. Le navire apparaît amarré, ancre au fond, voiles ferlées, la passerelle posée sur le quai. Chaque pirate n'a qu'un navire armé à la fois.
- **On monte à bord à pied.** On passe par la passerelle, ou par l'ouverture du bastingage depuis une plage ou des hauts-fonds. Sur le pont, on marche librement autour des mâts, de la barre et des canons. On descend de la même façon, vers un quai, une plage ou des hauts-fonds tout proches.
- **Les postes** se tiennent avec E :
  - la **barre** : Q et D tournent la roue, qui reste où on la laisse ;
  - les **drisses** du grand mât : Z déploie la voilure, S la cargue ;
  - le **cabestan** : S jette l'ancre, Z tenu la lève, plus vite à plusieurs ;
  - les **canons** de chaque bord : on vise à la souris dans l'arc du sabord, et l'on recharge.
- **Un navire lourd.**
  - Il prend son erre lentement : quelques secondes pour un sloop, bien plus pour un galion.
  - Il lui faut de la vitesse pour gouverner, il vire large et dérive dans les virages. Ancre au fond et lancé, il pivote sur elle.
  - **Le vent compte** : il tourne lentement, s'affiche sur le tableau de bord et dans le pavillon. Vent arrière, on file ; face au vent, on avance moitié moins vite.
  - On talonne les rochers et l'on s'écrase sur la côte, et la coque en souffre. Échoué, on cargue la voile et l'équipage déborde le navire à la gaffe.
- **Il paraît vrai.**
  - Coque et pont sont vus de dessus dans tous les caps, avec le franc-bord qui dépasse.
  - La mâture et les voiles sont en perspective. Les voiles se gonflent au vent arrière, se plaquent au mât et faseyent face au vent, et leurs vergues sont brassées.
  - La mâture gîte dans les virages et roule à la houle.
  - Il laisse un sillage en V, de l'écume à l'étrave, et des fanaux allumés la nuit.
  - Les canons reculent, l'ancre descend dans une gerbe d'écume, et un tableau de bord donne coque, barre, voilure, ancre, vent et nœuds.
- **Il reste dans le monde.** Il reste où on l'a laissé, ou part à la dérive si l'on est descendu voiles dehors ! On le retrouve sur la carte, il est sauvegardé avec son propriétaire, et on le reprend à la reconnexion, sur son pont. Vide et son propriétaire parti, il rentre au port au bout de dix minutes.
- **À l'abordage.** Le groupe et l'équipage du propriétaire montent à bord. Les autres pirates aussi, mais seulement quand le JcJ le permet entre eux.
- **Les coups** : les boulets frappent les coques (la sienne est épargnée), et un pirate touché sur le pont voit sa coque encaisser l'essentiel. Coque à zéro, le navire sombre et l'équipage regagne la côte à la nage.
- **Les navires ennemis et alliés** (Brick des Noyés, Frégate maudite, Galion Fantôme, navires du Kraken) sont dessinés de la même façon. On vise leur vraie coque.
- **Le reste** : on plonge depuis le pont (l'ancre est jetée d'office) et l'on remonte sur son pont. On pêche depuis le pont. Le tourbillon du Kraken aspire les navires, et ses tentacules les retiennent.

## Nouveautés de la version 1.0

Une page de présentation publique accompagne le jeu : `docs/accueil.html` (sur GitHub Pages,
`…/maree-morte/accueil.html`), avec ses captures dans `docs/img/`.

### Le monde vivant

- **Plus d'invasion chaque nuit** : la Marée Morte ne relève plus les noyés toutes les nuits. À la place, de **grandes invasions** rares (toutes les deux à trois heures), annoncées cinq minutes à l'avance : trois vagues de morts, puis leur capitaine. Les défenseurs sont récompensés.
- **Des villes animées** : les habitants vivent leur journée. Le jour, les marchands tiennent leur étal et les matelots s'affairent sur les quais. Le soir, on se retrouve devant les tavernes pour chanter et danser. La nuit, chacun rentre chez soi et le guet passe avec ses lanternes. Les rues sont éclairées de lanternes et de guirlandes.
- **Réputation des lieux** : chaque port a sa réputation (Inconnu, Connu, Apprécié, Respecté, Honoré, Héros). Elle fait baisser les prix, et certaines marchandises ne se vendent qu'aux héros du lieu.
- **Taxes** : chaque port prélève sa taxe sur les achats et les ventes (5 % à Port-Lanterne et à l'Anse, 8 % à la Rade et à Havre-des-Brumes, 12 % à Libertalia).
- **La brume de la carte** : la carte se dévoile au fil des voyages.
- **La collection d'airs** : chaque musique entendue pour la première fois est notée dans le carnet du pirate, et la boîte à musique de la maison peut la rejouer.
- **Animations et vastitude** : les personnages respirent, et des voiles passent au loin sur la haute mer.

### L'histoire

- **Acte III** : qui a déclenché la Marée Morte ? Une enquête en cinq quêtes (la Flamme, les pages arrachées, la ballade, l'aveu, l'âme d'Anselme), puis **trois fins exclusives** : apaiser, garder ou embraser la Flamme. Chaque pirate n'en choisit qu'une.
- **Conversations jouées** pour les 45 anciennes quêtes, avec des questions au choix.
- **Les PNJ se souviennent** : de vos quêtes, de vos réponses, de vos hauts faits, et le disent.

### Les activités

- **Navires partagés** : un membre du groupe ou de l'équipage monte à bord comme canonnier (touche E près du navire) et tire en bordée, à bâbord ou à tribord. Chaque bras de plus fait filer le navire plus vite.
- **Coques** : un navire encaisse une part des coups et peut sombrer. Les coques se réparent au chantier naval (3 doublons le point).
- **Les fonds marins** : avec une cloche de plongée (Ysaline ou Corentin), on plonge depuis son navire au-dessus des sites où remontent des bulles. On y trouve l'épave du Léviathan, les Grottes des Abysses et Ys-la-Noyée avec son roi. L'air dure 45 secondes : les poches d'air le rendent, le casque de scaphandrier le double. On remonte par la corde de l'ancre.
- **Le Bastion Englouti**, donjon pour plusieurs pirates. Chaque grille s'ouvre quand deux leviers éloignés sont tirés ensemble. L'Écluse se remplit d'eau en 75 secondes : il faut ouvrir la grille suivante à temps pour atteindre l'Amiral Englouti. Vide, le Bastion se referme et se repeuple.
- **L'Arène de la Fosse** : des vagues à repousser, sans mort (on est mis hors de combat), et un classement chaque semaine. On y trouve aussi des duels avec mise et des paris des spectateurs (la Fosse garde 5 %).
- **Les tavernes** : bras de fer, concours de rhum, Trente-et-un, et des chansons à boire, à apprendre, qui donnent de l'entrain à ceux qui chantent (+10 % d'attaque).
- **Les saisons** : chaque mois a son concours de pêche, où les prises ont une taille et chaque espèce un record, et son **Grand Tour de Libertalia**, une course en selle à travers six portes. Le podium reçoit des doublons et le Tricorne des saisons ; les absents trouvent leur récompense à leur retour.
- **Navires légendaires** : la Veuve Écarlate, que seuls les héros de Libertalia peuvent acheter, et le Spectre des Brumes, à arracher au Galion Fantôme.
- **Un secret** dort quelque part sous la mer.

### Les pirates entre eux

- **Chat complet** : canaux général, groupe, équipage et messages privés (Tab change de canal, ↑ ↓ l'historique), filtres, et des noms cliquables.
- **Amis et ignorés**, **groupes** qui partagent l'expérience, **équipages** avec pavillon et rangs (touche P).
- **Échanges sécurisés** : les deux pirates valident, puis tout passe d'un coup, avec un historique.
- **JcJ encadré** : il est permis à partir du niveau 10, entre pirates de moins de dix niveaux d'écart. On est protégé deux minutes après une mort, et jamais entre membres d'un même groupe ou équipage.
- **La prison** : trois meurtres de trop et le pirate est recherché. Arrêté, il passe un moment à la geôle, sauf s'il paie sa caution au gardien.
- **Honneur et gloire** : un classement des combattants. Au niveau maximal, l'expérience remplit une barre de gloire, et chaque rang de gloire ajoute des PV et des dégâts.

### Le pirate

- **Propriétés** : deux au plus, à revendre, en huit catégories (de la petite cabane au manoir). On les meuble, on y expose des trophées, et on peut s'y faire cambrioler.
- **Armes et progression** : chaque arme a un rôle clair et des dégâts par seconde affichés, et un niveau est requis pour les plus fortes. Les boss sont plus solides en groupe et donnent un butin personnel.
- **Tutoriel progressif**, **codex** (touche O : monstres, boss, armes, objets, personnages, îles, secrets, statistiques) et des réglages d'aide (complète, discrète ou aucune).

### Sous le capot

- **Sauvegardes** : format versionné avec migrations, sauvegarde automatique, écriture atomique, copie de secours en cas de fichier abîmé, et instantanés horaires et quotidiens dans `data/backups`. On revient en arrière avec `node scripts/restore.mjs`.
- **Sécurité** : protocole versionné, limites de débit, vérification par le serveur de chaque action (déplacements, mini-jeux, échanges).
- **Administration** : avec `ADMIN_TOKEN`, la console `/admin` du serveur Node permet de voir l'état du serveur, les pirates et les signalements, de bannir, d'exclure ou de rendre muet, de faire une annonce, de passer en maintenance, de lancer une invasion, de sauvegarder, de faire un instantané ou de restaurer un pirate. Sans jeton, elle est désactivée.
- **Test de charge** : `node scripts/charge.mjs 50 20` simule 50 pirates pendant 20 secondes et mesure la durée du tour du serveur.
- La version 1.0 change le monde partagé de la page publique : les pages 0.9 et 1.0 ne se rejoignent pas.

## Nouveautés de la version 0.8.1 : une interface de pirate

- Tous les panneaux qui s'ouvrent passent au même style que la carte au trésor : sac, journal de bord, hauts faits, boutiques, forge, coffre de la maison, aide, réglages, dialogues, confirmations, choix de quantité et écran d'accueil.
  - Ils sont faits de parchemin vieilli, dans un cadre de bois veiné aux coins ferrés de laiton.
  - Les titres sont écrits à l'encre, sous un pavillon noir et un fleuron.
  - On les ferme d'un sceau de cire rouge.
  - Les onglets sont en cuir cousu, et les listes sont tenues comme un registre.
- Le sac devient un « sac de marin » : les objets sont rangés dans l'intérieur boisé d'un coffre, et l'on jette par-dessus bord ce qu'on veut lâcher.
- Les boutons du menu ont des icônes peintes en pixel art à la place des émojis : coffre, maison, journal, carte, trophée, bouteille à la mer, barre à roue, cloche du bord.
- Les messages à l'écran s'affichent sur des planches de bois.

## Nouveautés de la version 0.8 : Libertalia

- **Libertalia, la Cité Libre des Forbans** : une île gigantesque à l'est (la carte passe de 640 à 960 cases de large) et, à son pied, une immense ville pirate ceinte d'un rempart à bastions, avec des tours et des portes. On y trouve le palais de la Reine et ses jardins, la place de la Liberté (statue du fondateur, fontaine) et le marché. Il y a quatre tavernes, le tripot de La Bourse aux Dés, Le Velours Écarlate (le salon de Madame Rubis), le marché noir du Borgne et La Fosse, une arène. S'y ajoutent des écuries, une armurerie, un tailleur, un apothicaire, un chantier naval, la capitainerie, des entrepôts, un cimetière, un verger, les Bas-Fonds et dix maisons à acheter. La ville compte 31 habitants, une foule qui flâne, des chats, et sa propre musique de taverne.
- Autour de la cité :
  - les Hauts et leur fort (gardes maudits) ;
  - les Cannaies (épouvantails) ;
  - la Baie des Naufrageurs et ses fausses lumières ;
  - la Mangrove des Contrebandiers ;
  - la Jungle Écarlate et son temple ;
  - la Crypte du Roi sans Couronne.

  Neuf nouveaux monstres y vivent, dont deux élites et un boss.
- **De vraies conversations** : les quêtes de Libertalia se jouent en scènes cinématiques. Des bandes noires encadrent l'écran, la caméra se pose entre les deux personnages et leurs portraits se font face. Les répliques alternent, avec leurs voix, et votre pirate parle aussi. Vous posez vos questions dans l'ordre que vous voulez, puis vous décidez. Espace fait avancer, 1 à 9 choisit une question, Échap quitte.
- La grande quête **Le Roi sans Couronne** compte sept chapitres : le Conseil des Capitaines, une enquête au Velours, un traître et une crypte. S'y ajoutent six histoires de rue et six primes répétables au tableau de la place.
- **La Bourse aux Dés** : misez de 10 à 500 doublons contre Fortuné, le croupier.
- **Plus d'artisanat ni de matériaux** : tout s'achète. Les anciens matériaux, outils et constructions ont été remboursés en doublons. Chaque maison achetée contient un coffre de rangement gratuit de 48 places.
- **Beaucoup d'objets nouveaux** :
  - sept montures (touche C) : âne, cheval, tortue géante, crabe géant, autruche, pur-sang, destrier squelette ;
  - trois navires : radeau, goélette, galion ;
  - des objets de voyage : conque de rappel, longue-vue, fumigène ;
  - des potions : célérité, force, fer, antidote ;
  - des talismans et des tenues ;
  - 17 armes aux effets inédits : ralentir, geler, empoisonner, étourdir, effrayer, foudre en chaîne, ricochet, boomerang, grappin, balle chercheuse, or de Midas…
- Les élites et les boss réapparaissent beaucoup plus lentement.
- **Barre d'émotes** : les touches 2 à 5 font danser, saluer, faire un doigt d'honneur ou un salto.
- **Un jeu mieux organisé** :
  - on choisit les quêtes suivies (jusqu'à quatre) ;
  - le journal est rangé par onglets et les hauts faits par catégories ;
  - le sac se trie et se filtre, et gère les quantités ;
  - on peut lâcher ses objets.
- **La carte redessinée** : une vraie carte au trésor, avec profondeurs, écume, relief ombré, rose des vents et cartouche. De nouveaux îlots jalonnent le Détroit de Libertalia, et des bricks noyés croisent autour de l'île.
- Nouveaux hauts faits : **Cité Libre**, **Corsaire de la Reine** et **Flambeur**.

## Nouveautés de la version 0.7.1 : le Volcan de Cendrelune

- **Un volcan immense** domine désormais l'île de Cendrelune : une montagne de plus de 800 pixels de large, peinte pixel par pixel à partir d'un relief (arêtes, ravines, cratère et lac de lave), avec quatre coulées qui descendent jusqu'à l'île et rejoignent ses rivières de lave. Un panache de fumée monte du cratère, qui rougeoie la nuit. Quand on passe derrière la montagne, elle devient transparente.
- Le pied du cône se marche ; le cône lui-même, les coulées et le cratère sont infranchissables. L'entrée de la Forge du Brasier est toujours au pied sud.
- **Éruptions** : tant que des pirates sont sur l'île, le volcan se réveille de temps en temps (toutes les deux minutes environ). Pendant une vingtaine de secondes, la terre tremble, la musique de bataille se lance et des bombes de lave jaillissent du cratère : chacune est annoncée par un cercle au sol, puis laisse une flaque qui refroidit.
- Nouveau haut fait : **Sous la cendre** (rester debout sur l'île pendant toute une éruption), titre « Cracheur de feu ».

## Nouveautés de la version 0.7 : le Grand Large

- **Une carte quatre fois plus grande.** L'archipel d'origine ne bouge pas ; à l'est et au sud s'ouvrent de nouvelles terres : Rade-aux-Flibustiers (ville de forbans), les Collines de la Rade, la Forêt des Pendus, le Lagon des Sirènes, l'Îlot de l'Ermite, Anse-Tranquille (village de pêcheurs), l'Atoll des Ossements, l'Île de la Quarantaine, le Volcan de Cendrelune, les Brumes Éternelles et l'**Île des Damnés** (niveaux 26-30, zone extrême, butin légendaire).
- **La Couronne des Marées** : une grande quête de cape et d'épée en onze étapes avec un personnage original, le capitaine Ambroise Vif-Argent, beau parleur et peu fiable. Au programme : une évasion de la Geôle, trois gardiens à abattre, une trahison, le Docteur Corbeau, le Galion Fantôme, Vespère le Comte des Marées, et un choix final (rendre la Couronne à Morgane ou la laisser au Fanfaron) avec des récompenses différentes.
- **Les Frères de la Côte**, une quête **impossible seul** : la porte du Fort des Deux Clés ne s'ouvre qu'avec un pirate sur chacune des deux dalles, et à l'intérieur, Fer et Rouille sont invulnérables tant qu'ils se tiennent côte à côte. Chacun en attire un de son côté, et il faut les abattre à quelques secondes d'intervalle, sinon le survivant relève son frère.
- **Navires maudits** : bricks des Noyés, frégates maudites et le Galion Fantôme patrouillent, canonnent tout ce qui flotte et coulent, avec leurs débris à piller. Nouveau navire : le brick de course (deux canons par bordée).
- **Jour et nuit** : le jour, la plupart des morts dorment sous terre ; seuls ceux qui résistent au soleil (chapeau de paille, peau tannée) restent dehors. À l'aube, les autres brûlent. Une nuit sur trois, c'est la **pleine lune** : la Horde se lève autour des pirates.
- **Tenues** (nouvel emplacement) : treize tenues à acheter, à coudre à la table de couture de la Rade, à forger, à gagner en quête ou à arracher aux boss. Elles changent l'apparence (chapeaux à plume, masque de peste, morion, capes…) et donnent leurs propres bonus.
- **Maisons sur d'autres îles** : 13 nouvelles maisons à la Rade, à Anse-Tranquille et sur l'Îlot de l'Ermite (cette dernière île n'est pas protégée).
- **Nouveaux boss à phases** : le Bourreau, la Reine des Sirènes, le Général d'Os, le Docteur Corbeau (nuages de peste), le Brasier, les Frères Ferrailleurs et Vespère (quatre phases).
- **Passeurs** : des billets pour voyager de ville en ville sans prendre la mer.
- **Les autres joueurs apparaissent sur la carte** (M) et sur la minicarte, où qu'ils soient.
- **Musique générative** : chaque morceau est composé à la volée (tonalité, accords, mélodie, instruments et forme changent à chaque fois), avec des silences entre les morceaux en exploration. Les thèmes de 0.6 reviennent parfois, jamais en boucle.
- 27 nouvelles quêtes (dont 4 primes), 14 nouveaux personnages, 25 nouveaux ennemis (dont 8 boss et 3 navires), 11 nouvelles armes (dont 5 légendaires), 9 hauts faits.

## Nouveautés de la version 0.6 : le Kraken

- **Le Kraken** : une chaîne de quatre quêtes (Ysaline → capitaine Elouan, à Havre-des-Brumes) mène à la Conque des Abysses. Soufflez dedans à bord, au-dessus du Gouffre : cinématique (le Goéland d'Elouan est happé par les tentacules), puis combat naval en trois phases — encre qui aveugle, tentacules qui frappent et saisissent les navires, tourbillon, vagues, plongée. La Mouette Écarlate de Morgane vient vous couvrir de ses canons. Les PV du Kraken s'adaptent au nombre de pirates.
- **Boss à phases** : Barbe-Cendre, le Roi des Os, le Crabe-Roi, la Goule Alpha et le Capitaine Noyé ont une entrée en scène, des attaques propres (charges, cercles de cendre, tempête d'os, carapace, bonds, geysers, ancre) annoncées au sol, des phases marquées sur leur barre de vie, et une cinématique de mort.
- **Maisons** : six maisons à vendre au Quartier des Corsaires (800 doublons). Votre nom s'affiche sur la porte ; la pièce est vide et se meuble avec B (coffres, lit, cheminée, tables, tapis, tableaux, trophée…). Maître Anselme vend les meubles, Lison les animaux de compagnie (chat, chien, perroquet, singe ; le bébé kraken se gagne), qui vous suivent ou dorment chez vous.
- **Cambriolage** : avec des crochets (la Fouine, sur les quais), E devant la maison d'un autre lance un mini-jeu de crochetage. Réussi, vous avez 40 secondes pour fouiller un coffre : la moitié d'une pile au hasard, et parfois un objet très rare introuvable autrement. Serrures renforcées et chien de garde compliquent la tâche ; le propriétaire est prévenu et le voleur est marqué.
- **Un secret à deux** : dans les ruines, deux dalles à fouler en même temps par deux pirates ouvrent le Sanctuaire des Jumeaux.
- **Musiques originales** : une gigue de flibustiers en mer, un thème de bataille navale, un thème épique pour les boss (toutes composées pour le jeu, synthétisées dans le navigateur).
- Correctif : les cases de l'épée et de la roulade ne clignotent plus dans la barre d'action ; nouvelles icônes pour la roulade et la banane.

## Nouveautés de la version 0.5 : l'arsenal

- **36 armes** (25 nouvelles), chacune avec son comportement :
  - mêlée : poignard rapide, machette, crochet (saignement), rapière et harpon (estocades à longue portée), cimeterre (large balayage), brise-crâne (repousse fort), dague de cristal (critiques), trident (vol de vie), sabre d'os (saignement), flamberge, faux du Passeur, ancre de l'Abysse ;
  - armes à feu : pistolet à deux coups, poivrière (rafale de 3), escopette (plombs à bout portant), carabine, pistolet de duel, crache-feu (brûlure), fusil-harpon (traverse 4 ennemis), long fusil du guetteur (très longue portée), pistolet de cristal, mortier à main et couleuvrine (explosions), mousquet d'os.
- **Où les trouver** : artisanat à la forge (11 recettes), boutiques d'Isa et d'Ysaline, quatre nouvelles quêtes (Acier de duelliste, Le duel de l'aube, Bois de marine, L'œil du guetteur), butin des boss et des élites, coffres, trésors enterrés, et **6 cachettes secrètes** (des coffres moussus : chacune garde une arme pour chaque pirate). Haut fait « Fouineur ».
- **Nouveau dessin des armes** : icônes et armes tenues en main générées à partir d'une même description (lames ombrées, gardes, poignées, crosses, canons, lueurs), estocade pour les lances et les rapières, projectiles propres à chaque arme (flammes, éclats de cristal, harpons, grenades, balles traçantes).
- **Nouvelle barre d'action** : planche de bois, emplacements de laiton, arme et arme à feu équipées visibles, recharge chiffrée, cadenas et niveau requis pour les compétences pas encore apprises. Inventaire aux mêmes cadres, avec un liseré de couleur selon la rareté.

## Nouveautés de la version 0.4

- **Combat entre joueurs** partout, sauf dans les zones sûres : Port-Lanterne, Havre-des-Brumes et l'intérieur des bâtiments. Les dégâts entre pirates sont réduits (×0,6) ; le vaincu perd 10 % de son or, que le vainqueur ramasse. Les noms en rouge sont ceux des pirates qui peuvent vous attaquer ; un message prévient quand on quitte ou rejoint une zone sûre. Haut fait « Premier duel ».
- **Navigation** : barque (Corentin, sur le quai, ou à l'établi) et sloop armé d'un canon (Ysaline, au chantier naval de Havre, ou à l'établi). Face à l'eau, E pour mettre à l'eau ; près du rivage, E pour accoster. À bord : pistolet ou canon (clic droit), pas de sabre. Nouvelles terres : **Havre-des-Brumes** (village sûr à l'est), **l'Île au Crâne** (niveaux 9-12) et des îlots.
- **11 bâtiments où l'on entre** (taverne, forge, maisons, auberge du Kraken Ivre, chantier naval…) : on pousse contre la porte pour entrer, on sort par le seuil. Mobilier, cheminées, PNJ à l'intérieur (Rosalie, Ysolde, Ysaline).
- **3 grottes secrètes**, invisibles de loin : la Grotte des Contrebandiers (falaise de la jungle), l'Antre du Crâne (avec le Roi des Os, nouveau boss d'élite) et la Grotte de Cristal (sous un îlot du sud). Cristaux à miner (pendentif de cristal à la forge). Haut fait « Sous la roche ».
- **Nouvelles quêtes** : La traversée (Corentin), Lumière sous la roche (Rosalie), Le Roi des Os (Ysolde).
- **Caméra plus haute** (on voit plus loin, le pirate paraît plus petit) et **molette pour zoomer** ; la caméra se rapproche un peu dans les petites pièces. **La minimap est de retour**, ronde et discrète.
- **Version ordinateur uniquement** : les commandes tactiles ont été retirées.
- **Page publique sur GitHub Pages** (dossier `docs/`) : tout le monde peut jouer par un simple lien, en multijoueur (voir plus bas).

## Nouveautés de la version 0.3

- **Interface épurée** par défaut : pas de minimap ni de gros cadres, une seule quête suivie, un simple chevron discret vers l'objectif, le butin en petites lignes dans un coin. Réglages > « Aides à l'écran » : discrètes, complètes ou aucune.
- **Récolte** (touche E) : arbres à la hache, rochers à la pioche (ou silex à la main), palmiers, buissons, fougères, roseaux, champignons, bois flotté et coquillages. Les ressources repoussent au bout de quelques minutes, pour tout le monde.
- **Artisanat** (touche C) : 62 recettes en 7 catégories (matériaux, outils, armes, armures, talismans, cuisine, construction) sur 4 postes : à la main, feu de camp (ou la Flamme de la place), établi et forge (près d'Isa), ou ceux de votre base.
- **Votre base** (touche B) : fabriquez un pavillon pirate à l'établi et plantez-le hors de la ville pour revendiquer un terrain. Construisez-y murs de bois ou de pierre, palissades, portes (les morts ne passent pas), planchers, tapis, torches, lanternes, feu de camp, établi, forge, coffres (rangement partagé), lit (vous y réapparaissez), jardinières qui donnent des baies, et canons de défense qui tirent seuls sur les morts. Les monstres ne réapparaissent plus sur votre terrain.
- **Sauvegarde des bases** : sur le serveur Node, dans `data/world.json` ; sur la page claude.ai et en solo, la base fait partie de la sauvegarde du joueur et apparaît quand il est connecté.

## Nouveautés de la version 0.2

- **Guidage** : une flèche dorée pointe toujours vers votre prochain objectif (quête, trésor), avec la distance.
- **Musique adaptative** composée en direct : chant de marins le jour, nappes sinistres la nuit, tambours dans le marais, percussions de guerre près des boss.
- **Météo** partagée par tous les joueurs : pluie et orages avec éclairs et tonnerre.
- **Pêche** (touche R) : sardines, dorades, poissons-lanternes la nuit, espadons par gros temps, bouteilles à la mer.
- **Cartes au trésor** : 4 fragments forment une carte ; creusez sur la croix rouge.
- **Forge d'Isa** : renforcez l'arme, le pistolet et l'armure jusqu'à +5.
- **Élites** : le Crabe-Roi (plage) et la Goule Alpha (jungle), avec leurs butins.
- **Tableau des primes** sur la place : chasses répétables toutes les 10 minutes.
- **Social** : bulles de chat au-dessus des têtes, émotes (`/danse`, `/salut`, `/rire`, `/joie`, `/colere`, `/assis`), 12 hauts faits et leurs titres (touche K).
- **Vie du port** : habitants et chats qui se promènent ; restes des monstres vaincus ; écume du ressac.
- **Réglages** : volume de la musique et des effets, zoom, tremblements de l'écran.

## Trois façons de jouer

| Mode | Où | Multijoueur |
|---|---|---|
| Page publique GitHub Pages | `https://<compte>.github.io/maree-morte/` | oui, pour tous ceux qui ouvrent le lien (connexion directe entre navigateurs) |
| Page claude.ai | le lien de l'artifact | avec les personnes qui ont accès à la page et l'ont ouverte en même temps |
| Serveur Node | `npm start`, ou un hébergeur | oui, pour tous ceux qui ont l'adresse |
| Solo | bouton « Jouer en solo », ou automatique si rien d'autre ne répond | non |

### Page publique (GitHub Pages)

`npm run build:pages` produit `docs/index.html`, une page autonome. Dans les réglages du dépôt GitHub,
*Pages > Build and deployment > Deploy from a branch*, choisir la branche `main` et le dossier `/docs`.

Le multijoueur de cette page n'a besoin d'aucun serveur : le premier pirate arrivé fait tourner le
monde dans son navigateur (le même code que le serveur Node), les autres s'y connectent directement
(WebRTC). Le service public gratuit PeerJS sert seulement à mettre les navigateurs en relation. Si
l'hôte ferme sa page, un autre joueur reprend le monde en quelques secondes ; un hôte dont l'onglet
reste caché passe aussi la main. Chaque pirate garde sa progression dans son propre navigateur.

Limites à connaître : le monde (monstres, bases) repart de zéro quand l'hôte change ; l'hôte étant un
joueur, rien n'empêche un tricheur averti de modifier la partie ; certains réseaux d'entreprise
bloquent WebRTC (le jeu passe alors en solo). Pour un vrai MMO public et persistant, utilisez le
serveur Node : la page publique s'y connecte avec `?serveur=adresse-du-serveur` dans le lien.

### Page claude.ai (le lien partagé)

Le jeu est publié en une seule page sur claude.ai. Le navigateur d'un des joueurs fait tourner
la simulation du monde (le même code que le serveur) ; si ce joueur part, un autre reprend.
Chaque joueur garde sa progression dans son propre navigateur.

Pour jouer ensemble, les joueurs doivent avoir un compte claude.ai et un accès **Contributeur**
(ou plus) à la page. Avec un accès en lecture seule, ou par un lien public, le jeu passe en solo.

### Serveur Node (le vrai MMO public)

```bash
npm install
npm start
```

Puis ouvrir http://localhost:3000. Variables utiles : `PORT`, `DATA_DIR` (comptes),
`MAX_PLAYERS`. Les comptes sont des fichiers JSON dans `data/accounts/`, mots de passe hachés
avec scrypt.

**Héberger en ligne avec mise à jour automatique** : mettre ce dossier dans un dépôt GitHub,
puis sur [Render](https://render.com) choisir *New > Blueprint* et ce dépôt (le fichier
`render.yaml` configure tout). Chaque modification poussée sur GitHub redéploie le jeu.
Attention : sur l'offre gratuite de Render, le disque est effacé à chaque déploiement, donc les
comptes repartent de zéro ; il faut un disque persistant (payant) ou une base de données pour
les garder. Le `Dockerfile` permet aussi un déploiement sur n'importe quel serveur.

## Commandes

| Touche | Action |
|---|---|
| ZQSD / WASD / flèches | se déplacer |
| Clic gauche | coup de sabre vers le curseur |
| Clic droit ou 1 | tirer |
| 2 à 5 | émotes : danse, salut, doigt d'honneur, salto |
| Espace | roulade |
| E | parler, ouvrir, ramasser, creuser, fouiller, entrer, armer un navire (à la bitte d'amarrage), tenir ou quitter un poste du navire, plonger, tirer un levier |
| Q / D | à la barre : tourner la roue |
| Z / S | aux drisses : déployer, carguer la voilure · au cabestan : lever (tenir Z), jeter l'ancre (S) |
| Molette | zoomer, dézoomer |
| C | monter sur sa monture, en descendre |
| P | compagnons : groupe, amis, équipage, honneur, saison, échanges |
| O | codex |
| B | meubler sa maison |
| Espace, 1 à 9, Échap | en conversation : réplique suivante, choisir une question, quitter |
| R | pêcher, puis ferrer |
| F | manger le meilleur soin |
| I / J / M / K / H | inventaire, quêtes, carte, hauts faits, aide |
| Entrée | chat (`/qui`, `/pos`, `/aide`) ; Tab change de canal, ↑ ↓ l'historique |

## Organisation du code

```
shared/            code commun au serveur et au client
  world.js         génération déterministe de l'île, collisions
  constants.js     constantes, cycle jour/nuit
  formulas.js      statistiques, expérience, apparence
  data/            objets, monstres, quêtes (et leurs scènes), PNJ, compétences, mobilier (craft.js), anciens objets remboursés (legacy.js)
server/
  game.js          simulation autoritaire (IA, combat, butin, quêtes, boutiques, chat)
  social.js        chat, amis, groupes, équipages, échanges
  justice.js       JcJ, recherche, prison, réputation
  events.js        grandes invasions annoncées
  arena.js         la Fosse, duels et paris
  tavern.js        mini-jeux de taverne
  naval.js         coques, chantier naval
  ships.js         les navires (1.1) : armement à quai, physique, pont, postes, canons, naufrage
  dungeon.js       le Bastion Englouti
  sea.js           plongée et air
  seasons.js       concours de pêche, Grand Tour, podiums
  db.js            comptes, sauvegardes, instantanés
  index.js         serveur HTTP + WebSocket, console /admin (admin.html)
client/
  main.js          boucle du jeu, prédiction, interpolation, événements
  net.js           transports WebSocket et solo
  roomnet.js       multijoueur dans la page claude.ai (élection d'hôte)
  peernet.js       multijoueur direct entre navigateurs (page GitHub Pages)
  ui.js            interface HTML, carte au trésor
  social-ui.js     chat, compagnons, échanges
  tavern-ui.js     mini-jeux de taverne
  townsfolk.js     habitants des villes
  render/ships.js  le dessin des navires (coque, pont, mâture, voiles, sillage)
  scene.js         dialogues cinématiques (portraits, répliques, questions au choix)
  cine.js          cinématiques des boss
  render/          moteur de rendu et pixel art procédural (sprites-volcan.js : la montagne ; sprites-cite.js : Libertalia)
scripts/
  build-artifact.mjs  assemble la page unique : claude.ai (dist/) ou GitHub Pages (--pages, docs/)
  restore.mjs      restaure un instantané (serveur arrêté)
  charge.mjs       test de charge
docs/              page publique GitHub Pages : index.html (le jeu, généré), accueil.html (présentation), img/
```

## Ajouter du contenu

- Un objet : une entrée dans `shared/data/items.js` (l'icône vient de `client/render/sprites-items.js`).
- Un monstre : `shared/data/mobs.js`, son apparence dans `MOB_LOOKS` de `client/render/sprites-chars.js`,
  ses points d'apparition dans `spawnPlan` de `shared/world.js`.
- Une quête : `shared/data/quests.js`.
- Un PNJ : `shared/data/npcs.js` et sa position dans `shared/world.js`.
