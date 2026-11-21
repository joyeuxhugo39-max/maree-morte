# Monde vivant — Lot 6 : ambiance et événements

Version 1.6.5, publiée avec le lot 5. Trois ajouts : des sons propres à chaque lieu, le vent dans les drapeaux et le
linge, et de petits événements spontanés.

Capture : `rapports/captures/mv6-evenements.jpg` (la poursuite, le recruteur, la cargaison renversée, le navire au
loin).

## 1. Les sons du lieu (`client/ambience.js`)

La nappe de mer et de vent existait. Par-dessus, de petits sons tirés au hasard, **rares et jamais en boucle**. Tous
sont synthétisés : il n'existe aucun fichier audio.

| Son | Quand, où |
| --- | --- |
| Oiseaux (de courtes phrases, plus graves et exotiques en jungle) | le jour et à l'aube, dans les prés, les collines, les jungles, les villages ; toutes les 4 à 13 s |
| Mouettes | le jour, près de l'eau |
| Grillons (de petites salves) | la nuit, dans l'herbe et en ville |
| Grenouilles | dans les marais et la mangrove, surtout la nuit, même sous la pluie |
| Bois qui grince | près des quais et à bord d'un navire |
| Feu qui crépite | tout près d'une vraie flamme : torche, brasero, cheminée (pas les réverbères) |
| Gouttes | dans les grottes |
| Marteau sur l'enclume | dans la forge |
| Cloche lointaine | à l'aube, sur le port de Port-Lanterne |
| Un corbeau, rarement | dans la forêt des Pendus |

- **Sous la pluie**, oiseaux et grillons se taisent.
- **Les lieux morts restent silencieux** : Île des Damnés, Atoll des Ossements, Ruines, Quarantaine, Volcan.
- **Le volume** suit le réglage des effets.

**Vérifié, mais pas écouté.** J'ai compté les sons joués pendant 30 s à chaque endroit :

- Jungle de Brumesel, le jour : 11 à 16 notes d'oiseaux ;
- forêt des Pendus : aucun son ;
- prairie, la nuit, sous la pluie : grillons muets, comme prévu ;
- quai de Libertalia : un grincement, une mouette.

Avant correction, le feu crépitait près de chaque réverbère (57 fois en 30 s) : c'est corrigé. **Je ne peux pas
entendre** dans cet environnement. Le dosage reste à juger à l'oreille.

## 2. Le vent

- **Drapeaux et linge** : l'étoffe des drapeaux et le linge qui sèche ondulent de 1 px au plus, par fines bandes. La
  hampe et les poteaux ne bougent pas.
- **Arbres** : leurs cimes se balançaient déjà.
- **Herbes** : elles restent fixes. Le terrain est peint une fois par parcelle, et l'animer coûterait trop cher pour un
  gain faible.

## 3. Les événements spontanés (`client/evenements.js`)

Ils sont **rares**, avec plusieurs minutes entre deux événements d'une même sorte. Ils sont **facultatifs** : pas de
marqueur, pas de notification, pas de récompense. On s'arrête pour regarder, ou l'on passe.

| Événement | Ce qui se passe | Fréquence |
| --- | --- | --- |
| La cargaison | un docker chargé laisse tomber sa caisse ; trois caisses et quelques oranges roulent (« Oh non… ma cargaison ! ») ; il s'accroupit, ramasse, repart | au plus une fois toutes les 6 à 10 min |
| La prise | un pêcheur remonte un poisson qui frétille au bout de sa ligne | 4 à 7 min |
| La poursuite | le jour, à Port-Lanterne ou Libertalia, un voleur traverse la rue en courant, le guet à ses trousses (« Halte ! Au voleur ! »). **Si le joueur lui barre la route, le voleur se rend** : le garde remercie et l'emmène. C'est la petite conséquence | 10 à 15 min |
| Le recruteur | sur un quai, un recruteur cherche des bras pour un équipage, puis s'en va | 9 à 14 min |
| Le navire au loin | à l'aube ou au crépuscule, en mer, une silhouette sombre et sans pavillon passe au loin, sans qu'on sache qui c'est | 12 à 18 min |

Le pêcheur qui montre une prise étrange, le voyageur perdu et les contrebandiers qui s'échangent quelque chose sont des
scènes du lot 5. Tous respectent la règle des bulles : jamais plus de deux à l'écran.

**Vérifié** : chaque événement a été forcé une fois dans le navigateur et photographié, sans erreur de page.

**Limites** :

- Les événements sont locaux (chaque joueur voit les siens) et n'ont pas de conséquence au-delà de la scène.
- Le dossier évoque aussi « un bateau endommagé qui cherche de l'aide » et « un animal qui s'approche d'un
  campement ». Je ne les ai pas faits : le premier demanderait une vraie quête côté serveur, et il n'y a pas encore de
  campements à visiter.

## 4. Tests

- `npm test` : 33 suites, toutes réussies.
- La mesure de la vie des villes : voir le rapport du lot 5.
- Le parcours complet du festival, refait, pour vérifier que ses figurants ne sont pas dérangés par les nouveaux
  habitants.

## 5. Fichiers

- **Nouveaux** :
  - `client/ambience.js` ;
  - `client/evenements.js`.
- **Modifiés** :
  - `client/main.js` : le branchement ;
  - `client/render/renderer.js` : l'étoffe au vent, le dessin des événements.
