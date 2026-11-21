# Lot 6 — La Nuit des Mille Voiles

Publié en version 1.6.0 le 21 novembre 2026 : `main`, GitHub Pages et la page claude.ai.

Chaque semaine, Port-Lanterne fait la fête. Du jeudi midi au lundi midi (midi UTC), la plage
des Os Blanchis se couvre de fanions et de lampions. Une scène s'y dresse, avec ses musiciens, ainsi que des stands et
une foule qui danse. Mira Bellécume, l'organisatrice, y accueille les pirates. Il y a cinq épreuves, une grande course en
mer, et un spectacle chaque soir. On gagne des jetons, qu'on dépense au comptoir de Zéphyrine.

Tout se joue seul. Rien n'est nécessaire pour progresser : ce ne sont que des parures. L'ancien monde n'a pas bougé :
tout est ajouté après lui, et les décors du festival n'apparaissent que pendant les éditions.

## 1. Le calendrier et les éditions

| Point | Règle |
| --- | --- |
| Une édition | du jeudi 12 h UTC au lundi 12 h UTC, chaque semaine (`festEdition` dans `shared/data/festival.js`) |
| Trois variantes, qui tournent | **Lampions** : les dés de Barnabé ont un six de plus. **Mouettes** : la course se court à l'envers, et les chopes s'allument plus vite. **Étoiles** : les courants s'inversent, « Tirez ! » se fait attendre, et un galion de carton sert de cible |
| Exclusivités | chaque variante a une parure qu'on ne trouve qu'à elle (voiles des Mille Voiles, pavillon de la Mouette, habit des Étoiles) |
| Hors édition | les épreuves sont fermées, avec un message qui le dit. Mira annonce la prochaine date. On peut toujours sortir d'une salle d'épreuve |
| Nouvelle édition | le carnet de tampons se vide. Les jetons, les parures et les secrets restent |
| Outil de développement | la commande `fete ouvrir \| fermer \| auto \| spectacle \| course` force l'état ou lance un moment (compte développeur seulement, vérifié côté serveur) |

## 2. La plage en fête

- **Le décor** : une scène et son estrade, quatre stands, la tente rayée de la Lice et l'arche d'entrée de la jetée. Il
  y a aussi des mâts à fanions et des guirlandes de fanions qui ondulent, des lampions qui s'allument la nuit, trois
  canons de concours, des bouées et des mâts d'épaves. Tout ce décor est dessiné par le code
  (`client/render/sprites-fete.js`).
- **Les personnages** :
  - Mira Bellécume, l'organisatrice ;
  - Zéphyrine Pompon, au comptoir des jetons ;
  - Anselin, qui gère les inscriptions à la course ;
  - Gaston Mèche, pour les canonniers ;
  - Pimprenelle, pour le parcours du gabier ;
  - Barnabé Tire-Bouchon, à la Sirène Borgne ;
  - Maître d'armes Escarmouche, à la Lice.
- **La foule** : des badauds, des musiciens sur la scène et des danseurs. Ils parlent (« Vive la Nuit des Mille
  Voiles ! ») et dansent pendant le spectacle.
- **Une plage sûre** : pendant l'édition, la plage est une zone sûre. Pas de combat entre joueurs, et les monstres qui
  y naissent la nuit dorment. Ils reviennent après la fête.
- **L'accueil** : la première fois qu'on met le pied sur la plage en fête, une courte scène (≈ 10 s) montre la jetée
  pavoisée, puis Mira qui souhaite la bienvenue. On ne la voit qu'une fois.

## 3. Les cinq épreuves

Chaque épreuve rapporte un **tampon** dans le carnet à la première réussite de l'édition (25 à 40 jetons). Les six
tampons ensemble donnent 60 jetons de plus. Rejouer rapporte encore quelques jetons, jusqu'à six fois par épreuve et
par jour. Au-delà, on joue pour le plaisir et pour le classement.

| Épreuve | Où | Comment | Le tampon |
| --- | --- | --- | --- |
| **Le Concours de canonniers** | les trois canons au bout de la jetée | 45 s pour toucher des cibles qui dérivent sur l'eau (tonneaux, pavillons, mouettes de bois). On vise à la souris, avec une seconde de recharge. Le serveur et l'écran calculent les mêmes trajectoires, et c'est le serveur qui arbitre. La caméra cadre le couloir de tir | 8 points |
| **La Chasse au trésor** | Mira donne le premier indice | quatre indices tirés parmi huit lieux de la ville. Chacun porte un symbole et un chiffre romain. Le coffre de la grand-mère, à l'un des trois endroits selon la variante, a un cadenas : on choisit l'ordre des symboles d'après les chiffres. Une erreur grippe le cadenas 10 s. En groupe, on reprend la chasse d'un compagnon | le coffre ouvert (et 120 doublons) |
| **Le Défi des tavernes** | Barnabé, à la Sirène Borgne | trois manches dans un petit panneau. Les **dés** : trois dés, deux relances, contre Barnabé. La **mémoire** : répéter une suite de chopes qui s'allument, jusqu'à 9. Les **réflexes** : cliquer après « Tirez ! » (un clic trop tôt est un faux départ) | un total de points |
| **Le Parcours du gabier** | une salle à part, depuis la plage | des quais au-dessus de l'eau du port, à parcourir au chrono. Il faut un saut par-dessus un bras d'eau, un passage à la corde, une montée au grand mât et une descente par l'étai. Sur le long quai, des tonneaux roulent ; plus loin, une bôme balaie le pont. Un coup renvoie au dernier point de reprise. On termine en sonnant la cloche | moins de 75 s |
| **Le Duel des capitaines** | la Lice, une tente à part | contre l'un des trois champions (Bosco le Rieur, Dame Escarmouche, le Capitaine Fanfaron), à votre niveau. Ou contre un autre pirate, s'il accepte. Le premier touché à zéro perd. **Personne ne meurt et rien ne se perd** : à zéro, on se relève. Les champions ne frappent que celui qui les a défiés | une victoire |

## 4. La Course des Mille Voiles

- **L'inscription** : auprès d'Anselin, sur la jetée. Le départ est donné 30 s après la première inscription : seul,
  on court quand même, et les autres peuvent se joindre.
- **Le bateau** : chacun reçoit un **cotre de location**, à la barre. Il n'appartient à personne : rien à sauvegarder,
  rien à réparer, et il disparaît après la course. Avec un navire à soi, on peut courir aussi : le temps est alors
  compensé par la vitesse du navire, pour que le cotre loué ne soit pas désavantagé.
- **Le parcours** : la ligne, puis huit bouées dans l'ordre (le Phare, le Banc des Mouettes, la Pointe du Levant,
  l'Îlot du Large, le Récif du Sud, la Nappe de Brume, le Cimetière d'Épaves, la Passe de l'Îlot), puis la ligne
  encore. La bouée suivante est cerclée, et une flèche discrète l'indique.
- **La mer** : des courants (de fines traînées sur l'eau) et des zones de vent qui aident ou freinent. Dans la nappe
  de brume, la bouée ne se voit que de près. Les épaves sont un décor, et des raccourcis restent permis.
- **Les rivaux** : trois équipages de Port-Lanterne courent aussi (la Mouette Rieuse, le Hareng Saur, la Belle
  Insolente), pour que la course ne soit jamais vide. Ils suivent un chemin calculé sur l'eau.
- **Personne ne bloque personne** :
  - les voiliers de la course se traversent ;
  - on ne peut pas s'y attaquer ;
  - les boulets passent à travers ;
  - au-delà de 10 minutes, la course est perdue sans autre peine.
- **Faux départ** : franchir la ligne avant le coup de canon coûte 10 s.
- **L'arrivée** : un toast et un classement de l'arrivée annoncé à tous. Le tampon vaut 40 jetons.
- **Abandonner ou se déconnecter** : on sort de la course. Le cotre est rendu et les autres continuent.

**Durée mesurée** (le moteur seul, sans joueur) : les trois rivaux bouclent le parcours en **2 min 23 s à 2 min 57 s**
selon la variante. Le temps d'un vrai joueur n'a pas été mesuré.

## 5. Le spectacle de chaque soir

À la tombée de la nuit (78 % de la journée de jeu), pendant deux minutes et demie :

- Mira monte sur l'estrade et fait un discours. Si quelqu'un a déjà couru, elle cite le meilleur temps de la semaine.
- Les feux d'artifice partent de la plage : des gerbes colorées, des halos légers et un bouquet final.
- La foule danse, et la musique passe au thème du soir.
- Y assister rapporte 10 jetons, une fois par spectacle.

Rien n'est imposé : pas de téléportation, pas de scène qui prend la main. On regarde, on danse (émote danse), on tire
ses propres fusées, ou on s'en va. Après, la fête continue : le thème « La fête ne finit jamais » joue toute la nuit.

## 6. Les jetons, le comptoir et le classement

**Le comptoir de Zéphyrine** propose 20 articles, tous des parures, sans aucun effet sur le combat :

| Sorte | Articles |
| --- | --- |
| Voiles (sur votre navire) | Lampion, d'Azur, de la Nuit, des Mille Voiles (Lampions seulement) |
| Pavillons | de fête, d'or, de la Mouette (Mouettes seulement) |
| Tenues | Tenue de gala, Marinière de fête, Gilet Lampion, Habit des Étoiles (Étoiles seulement) |
| Émotes (touches 6 à 9) | la Gigue, Feu d'artifice, Confettis, Révérence |
| Décor de navire | guirlande de lampions, fanions de pavois |
| Titres | « Fêtard de Port-Lanterne », « Âme de la fête » |
| Objet | cinq fusées de fête, à tirer soi-même (rachetables) |

- On gagne les jetons pendant les éditions. Ils sont **gardés** d'une édition à l'autre et se dépensent au comptoir à
  tout moment, pour que personne ne perde ce qu'il a gagné. La garde-robe du carnet permet de porter et d'ôter
  chaque parure. Une tenue de fête cède la place à un déguisement (celui du braquage).
- **Le classement de la semaine** : quatre tableaux (canonniers, défi des tavernes, gabier, course). À la semaine
  suivante, les trois premiers de chaque tableau reçoivent 60, 40 ou 25 jetons, même s'ils étaient absents (remis à
  la connexion). Le premier gagne un succès, et le premier de la course un titre. Les personnages laboratoire ne
  figurent pas au classement.

## 7. Les secrets

| Secret | Indice donné dans le carnet |
| --- | --- |
| **La Mouette d'or** | une cible dorée traverse parfois le port pendant le concours (10 points) |
| **La bouteille du phare** | la grand-mère avait caché autre chose, au pied du phare |
| **La Passe des Brisants** | une lanterne marque un passage entre les récifs, pendant la course |
| **La Valse sous les étoiles** | danser sur la scène pendant le bouquet final. Elle apprend l'émote valse, qui ne s'achète pas |

Chaque secret rapporte 25 jetons, une seule fois. Le festival compte 14 succès en tout.

## 8. La musique : quatre thèmes, générés par le code

**Aucun fichier audio n'existe** : les quatre thèmes sont composés à la volée par `client/music.js`. Chacun a deux
mélodies écrites à la main (huit en tout), sur lesquelles le compositeur brode à chaque morceau. Les sections
s'enchaînent, avec des silences et des fondus entre deux morceaux.

| Thème | Où | Caractère | Durée d'un morceau (mesurée sur 40 tirages) |
| --- | --- | --- | --- |
| **Port-Lanterne en fête** | la plage, le jour | gigue en 6/8, violon, accordéon, flûte, « oompah » | 31 s à 57 s |
| **Les épreuves** | pendant une épreuve | reel rapide, mixolydien | 47 s à 1 min 10 s |
| **Mille Voiles** | pendant la course | hymne, cuivres et chœur, marche | 1 min 37 s à 1 min 42 s |
| **La fête ne finit jamais** | la nuit, le spectacle | menuet doux, flûte et cordes pincées | 40 s à 1 min 08 s |

Le thème ne s'arrête pas : un nouveau morceau suit le précédent, jamais tout à fait le même. Le passage d'un lieu à un
autre se fait en fondu. Le contrôle dans le navigateur vérifie que le bon thème est demandé à chaque endroit. En
revanche, **personne ne les a écoutés** : cette vérification est automatique, et l'oreille reste à faire.

## 9. Ce qui empêche les abus

- **Tout est arbitré par le serveur** : les tirs, les touches, les temps, les jetons. Le client ne fait que dessiner.
- **Jetons** :
  - un tampon par épreuve et par édition ;
  - un plafond de six gains par épreuve et par jour ;
  - le spectacle une fois ;
  - un secret une fois ;
  - une sauvegarde trafiquée est nettoyée au chargement (tampons d'une autre édition, parures inconnues, jetons
    négatifs).
- **La course** : un bateau de location par personne, rendu à l'arrivée, à l'abandon ou à la déconnexion. Les
  voiliers ne se bloquent pas et ne s'attaquent pas. Les temps des navires personnels sont compensés.
- **La Lice** : les combats entre joueurs n'y sont possibles qu'entre les deux adversaires d'un duel accepté, après
  « En garde ! ». Ailleurs sur la plage, ils sont impossibles.
- **Les déconnexions** : en pleine course, en plein duel (forfait), en pleine épreuve ou dans une salle d'épreuve, on
  revient sur la plage à la reconnexion, sans rien perdre.

## 10. Les tests

### Automatiques (`npm test`)

- **`tests/t_festival60.mjs`** (92 vérifications) :
  - le calendrier ;
  - fermé et ouvert ;
  - les canonniers (la visée avec la simulation partagée, la recharge, quitter) ;
  - la chasse seul et en groupe ;
  - les trois manches de taverne ;
  - le gabier (départ, tonneau, saut, cloche, sortie) ;
  - la Lice (le champion ne vise que son adversaire, à zéro on se relève, duel entre joueurs) ;
  - la course (location, rivaux, pas de collision, pas de combat entre concurrents, boulets qui traversent, faux
    départ, bouées, arrivée, abandon, chemin des rivaux sur l'eau, nettoyage, déconnexion) ;
  - le spectacle (jetons une fois) ;
  - la valse ;
  - les plafonds ;
  - la boutique, les parures, les exclusivités, les fusées, les émotes ;
  - le carnet complet ;
  - le classement et ses prix ;
  - la sauvegarde et la reconnexion ;
  - une nouvelle édition ;
  - une sauvegarde trafiquée ;
  - la sortie quand c'est fermé ;
  - la reconnexion depuis une salle d'épreuve.
- **Les autres suites** : toutes passent, alignées sur le protocole 15. Les audits des boss et de l'équilibre excluent
  les champions de la Lice, qui ne sont pas des boss. Le test des scènes compte maintenant treize identités musicales.

### Dans le navigateur (vrai jeu, Chromium)

Aucune erreur de page sur aucun de ces parcours :

1. **Le festival complet en solo, 23 captures** : l'accueil (3 plans), la plage de jour et de nuit, une manche de
   canonniers, les trois manches de taverne, le gabier, la Lice contre Bosco, la course (grille, départ, large,
   brume, arrivée), le spectacle (discours, feux, bouquet), le carnet, le comptoir et le classement.
2. **La chasse au trésor**, par les vrais gestes : le dialogue de Mira, quatre indices avec la touche E, le coffre
   déterré, le cadenas, l'ouverture et le tampon.
3. **En groupe**, avec un second pirate simulé par le moteur dans la même page :
   - la course à deux, avec trois rivaux ;
   - le compagnon se déconnecte en pleine course, et le joueur continue ;
   - le compagnon revient et lance un défi dans la Lice ;
   - le joueur accepte, et le duel démarre pour les deux.

### Non fait

- **Pas de partie avec un vrai joueur** : les durées réelles des épreuves restent à mesurer.
- **Pas de test à deux navigateurs** (deux vraies personnes sur la page publique).
- **La musique n'a pas été écoutée.**

## 11. Ce que le contrôle visuel a corrigé

- **Canonniers** : les cibles sortaient de l'écran, et un clic tombait parfois sur la barre d'action. La caméra cadre
  maintenant le couloir de tir pendant la manche.
- **Feux d'artifice** : des disques blancs éclataient comme des flashs. Ce sont maintenant des gerbes colorées avec
  des halos légers, et les fusées montent plus haut.
- **Gabier** :
  - l'eau entre les quais était noire. C'est maintenant l'eau du port, avec des rides et l'ombre des quais ;
  - les tonneaux ressemblaient à des roues : ils ont maintenant des douelles et roulent ;
  - le pont a un bastingage.
- **Lice** : de simples murs bruns. C'est maintenant une toile rayée rouge et crème.
- **Le cadenas du coffre** ne s'ouvrait pas : la boîte de dialogue n'existait que pour les personnages. Elle s'ouvre
  maintenant pour un objet du décor, avec un petit cadenas en portrait.
- **Le coffre de la grand-mère** était invisible. Une fois les quatre indices lus, un monticule de terre remuée et un
  coin de coffre apparaissent, discrets, à ras du sol.
- **La plage la nuit** : des morts-vivants y tuaient les fêtards. La plage est maintenant sûre pendant l'édition.
- **L'icône des jetons** dans les toasts ne s'affichait pas.

## 12. Limites et assets manquants

- **Musique** : quatre thèmes générés par le code, aucun enregistrement. La scène d'accueil le signale
  (« enregistrement fete : repli sur la musique générée »).
- **Graphismes** : tout est dessiné par le code, en pixel art, et aucune image n'est importée.
- **Animations** : il n'y a pas d'animation propre à Mira pour le discours. Elle parle avec les gestes existants. La
  foule danse avec l'animation de danse commune.
- **Bateau de location** : un seul modèle (le cotre des Mille Voiles).
- **Classement** : la chasse au trésor et les duels n'en ont pas (pas de score qui ait du sens).
- **Jetons** : ils ne sont pas effacés à la fin d'une édition (voir § 6). C'est un choix assumé, pour ne rien
  retirer aux joueurs.
- **Sauvegardes** : la version de sauvegarde reste 10. Le festival est un champ facultatif : une ancienne sauvegarde
  se charge avec un carnet vierge.
- **Protocole** : il passe à 15, car le monde et les messages ont changé. Un client 1.5 est invité à recharger la page.

## 13. Fichiers

### Nouveaux

| Fichier | Contenu |
| --- | --- |
| `shared/data/festival.js` | le calendrier, les épreuves, la boutique, les secrets, les textes |
| `shared/festival-world.js` | la plage en fête, les salles du gabier et de la Lice, les points d'interaction |
| `shared/fest-sim.js` | la simulation partagée par le serveur et l'écran (cibles, tonneaux, bôme, chemin des rivaux) |
| `server/festival.js` | toute la mécanique |
| `client/festival.js` | les interactions, la visée, les mini-jeux, la course, le spectacle, le carnet |
| `client/render/sprites-fete.js` | les décors |
| `tests/t_festival60.mjs` | le test du festival |

### Modifiés

- `server/game.js`, `server/ships.js`, `server/dev.js` ;
- `shared/world.js` et les données : objets, monstres, PNJ, succès, scènes ;
- le client :
  - musique ;
  - rendu du terrain, des navires (voiles, pavillons, guirlandes) et de l'éclairage ;
  - interface ;
  - scènes ;
  - demandes sociales (le défi de la Lice) ;
- les tests existants, alignés sur le protocole 15.
