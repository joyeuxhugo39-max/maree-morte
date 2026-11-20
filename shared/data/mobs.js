import { TROPHIES } from './craft.js';
// Bestiaire. Vitesses en px/s, portées en px, temps en secondes.
// loot : [objet, chance, min, max]
export const MOBS = {
  crab: {
    name: 'Crabe putride', level: 1, hp: 24, dmg: 4, speed: 40, aggro: 70, leash: 170, range: 15, atkCd: 1.3, windup: 0.32,
    xp: 12, gold: [2, 6], r: 7, respawn: 18,
    loot: [['banane', 0.08, 1, 1], ['noix_coco', 0.04, 1, 1]],
  },
  zsailor: {
    name: 'Matelot zombie', level: 2, hp: 46, dmg: 7, speed: 31, aggro: 92, leash: 200, range: 17, atkCd: 1.4, windup: 0.42,
    xp: 21, gold: [3, 10], r: 7, respawn: 22, groan: 1,
    loot: [['os_maudit', 0.45, 1, 2], ['voile_dechiree', 0.4, 1, 1], ['banane', 0.08, 1, 1], ['bandana', 0.03, 1, 1], ['mariniere', 0.02, 1, 1], ['bottes_usees', 0.03, 1, 1]],
  },
  buccaneer: {
    name: 'Boucanier zombie', level: 4, hp: 92, dmg: 12, speed: 37, aggro: 100, leash: 220, range: 19, atkCd: 1.2, windup: 0.38,
    xp: 42, gold: [8, 18], r: 7, respawn: 26, groan: 1, weapon: ['saber', 'rust'],
    loot: [['dent_zombie', 0.5, 1, 2], ['lame_rouillee', 0.45, 1, 1], ['os_maudit', 0.4, 1, 2], ['poisson_grille', 0.08, 1, 1], ['bandana_noir', 0.04, 1, 1], ['coutelas', 0.03, 1, 1], ['carte_dechiree', 0.02, 1, 1]],
  },
  ghoul: {
    name: 'Goule des lianes', level: 5, hp: 74, dmg: 10, speed: 58, aggro: 110, leash: 230, range: 16, atkCd: 0.85, windup: 0.25,
    xp: 46, gold: [6, 15], r: 7, respawn: 26,
    loot: [['os_maudit', 0.5, 1, 2], ['noix_coco', 0.12, 1, 1], ['collier_requin', 0.015, 1, 1], ['chapeau_paille', 0.04, 1, 1]],
  },
  drowned: {
    name: 'Noyé', level: 7, hp: 175, dmg: 16, speed: 29, aggro: 95, leash: 210, range: 19, atkCd: 1.5, windup: 0.5,
    xp: 72, gold: [12, 24], r: 8, respawn: 30, groan: 1, swims: 1,
    loot: [['os_maudit', 0.4, 1, 2], ['rhum', 0.06, 1, 1], ['gilet_cuir', 0.03, 1, 1], ['carte_dechiree', 0.03, 1, 1]],
  },
  skelgun: {
    name: 'Squelette canonnier', level: 8, hp: 120, dmg: 18, speed: 33, aggro: 150, leash: 240, range: 140, atkCd: 2.3, windup: 0.6,
    xp: 82, gold: [14, 27], r: 7, respawn: 30, ranged: { speed: 150, life: 1.3 }, keep: 80,
    loot: [['os_maudit', 0.7, 1, 3], ['tricorne', 0.04, 1, 1], ['pistolet_silex', 0.03, 1, 1], ['carte_dechiree', 0.03, 1, 1]],
  },
  boss: {
    name: 'Capitaine Barbe-Cendre', level: 12, hp: 2600, dmg: 30, speed: 36, aggro: 150, leash: 260, range: 34, atkCd: 1.6, windup: 0.62,
    xp: 1400, gold: [330, 480], r: 13, respawn: 180, boss: 1, groan: 1, weapon: ['bigsaber', 'bone'],
    loot: [['lame_corail', 0.35, 1, 1], ['chapeau_capitaine', 0.3, 1, 1], ['manteau_capitaine', 0.25, 1, 1], ['boussole_maudite', 0.3, 1, 1], ['rhum', 1, 2, 3]],
  },
  crabroi: {
    name: 'Crabe-Roi', level: 4, hp: 420, dmg: 13, speed: 44, aggro: 95, leash: 230, range: 24, atkCd: 1.2, windup: 0.42,
    xp: 170, gold: [52, 105], r: 13, respawn: 360, elite: 1, base: 'crab',
    loot: [['couronne_crabe', 0.3, 1, 1], ['collier_requin', 0.2, 1, 1], ['carte_dechiree', 0.5, 1, 1], ['rhum', 0.5, 1, 2]],
  },
  goule_alpha: {
    name: 'Goule Alpha', level: 7, hp: 650, dmg: 18, speed: 60, aggro: 120, leash: 260, range: 22, atkCd: 0.85, windup: 0.38, // lot 3 : 0,3 s était à la limite des réflexes
    xp: 270, gold: [75, 135], r: 13, respawn: 420, elite: 1, base: 'ghoul',
    loot: [['sabre_abordage', 0.12, 1, 1], ['bandana_noir', 0.3, 1, 1], ['carte_dechiree', 0.8, 1, 2], ['amulette_lanterne', 0.08, 1, 1]],
  },
  capitaine_noye: {
    name: 'Capitaine Noyé', level: 9, hp: 950, dmg: 22, speed: 34, aggro: 220, leash: 420, range: 26, atkCd: 1.3, windup: 0.5,
    xp: 320, gold: [90, 165], r: 13, respawn: 99999, elite: 1, groan: 1, swims: 1, weapon: ['bigsaber', 'rust'],
    loot: [['ecaille_leviathan', 0.25, 1, 1], ['rhum', 1, 1, 2]],
  },
};
MOBS.roi_squelette = {
  name: 'Roi des Os', level: 11, hp: 1500, dmg: 26, speed: 34, aggro: 150, leash: 220, range: 28, atkCd: 1.3, windup: 0.5,
  xp: 720, gold: [180, 300], r: 13, respawn: 300, elite: 1, groan: 1, weapon: ['bigsaber', 'bone'],
  loot: [['lame_corail', 0.1, 1, 1], ['chapeau_capitaine', 0.2, 1, 1], ['carte_dechiree', 1, 1, 2], ['boussole_maudite', 0.15, 1, 1]],
};
// 0.5 : armes dans le butin (les boss et élites gardent les plus belles)
const ARMES = {
  buccaneer: [['crochet', 0.012, 1, 1], ['machette', 0.02, 1, 1]],
  ghoul: [['machette', 0.025, 1, 1]],
  skelgun: [['poivriere', 0.015, 1, 1], ['carabine', 0.01, 1, 1]],
  drowned: [['harpon', 0.012, 1, 1]],
  boss: [['ancre', 0.2, 1, 1], ['couleuvrine', 0.12, 1, 1], ['faux', 0.06, 1, 1]],
  crabroi: [['mortier_main', 0.1, 1, 1], ['harpon', 0.15, 1, 1]],
  goule_alpha: [['mortier_main', 0.12, 1, 1], ['machette', 0.4, 1, 1], ['cimeterre', 0.12, 1, 1]],
  capitaine_noye: [['trident', 0.35, 1, 1], ['fusil_harpon', 0.12, 1, 1]],
  roi_squelette: [['sabre_os', 0.3, 1, 1], ['mousquet_os', 0.25, 1, 1]],
};
for (const k in ARMES) MOBS[k].loot.push(...ARMES[k]);
// 0.6 : boss à phases, attaques originales, et le Kraken
Object.assign(MOBS.boss, { ai: 'cendre', phases: [0.6, 0.3], title: 'Le Fléau des Mers' });
Object.assign(MOBS.roi_squelette, { ai: 'roi', phases: [0.66, 0.33], title: 'Souverain de l’Antre' });
Object.assign(MOBS.crabroi, { ai: 'crabe', phases: [0.5], title: 'Seigneur des Grèves' });
Object.assign(MOBS.goule_alpha, { ai: 'goule', phases: [0.6, 0.3], title: 'Terreur de Brumesel' });
Object.assign(MOBS.capitaine_noye, { ai: 'noye', phases: [0.5], title: 'Revenant des Abysses' });
MOBS.drowned.loot.push(['encre_noire', 0.3, 1, 1]);
MOBS.capitaine_noye.loot.push(['encre_noire', 1, 2, 3]);
MOBS.kraken = {
  name: 'Le Kraken', level: 14, hp: 7000, dmg: 34, speed: 0, aggro: 420, leash: 99999, range: 0, atkCd: 99, windup: 1,
  xp: 3000, gold: [750, 1200], r: 34, respawn: 99999, elite: 1, sea: 1, ai: 'kraken', phases: [0.66, 0.33], title: 'Terreur des Abysses',
  loot: [['oeil_kraken', 0.35, 1, 1], ['harpon_abysses', 0.3, 1, 1], ['bebe_kraken', 0.25, 1, 1], ['tentacule_fumee', 1, 2, 4], ['encre_noire', 1, 3, 6]],
};
MOBS.tentacule = {
  name: 'Tentacule', level: 12, hp: 320, dmg: 22, speed: 0, aggro: 420, leash: 99999, range: 0, atkCd: 99, windup: 1,
  xp: 40, gold: [0, 0], r: 10, respawn: 99999, sea: 1, ai: 'tentacle', loot: [['encre_noire', 0.3, 1, 1]],
};

// 0.7 : les morts du Grand Large. night = ne sort que la nuit (le soleil les brûle)
for (const k of ['zsailor', 'buccaneer', 'ghoul']) MOBS[k].night = 1;
const mob = (id, o) => { MOBS[id] = Object.assign({ aggro: 110, leash: 240, atkCd: 1.2, windup: 0.4, r: 7, respawn: 30 }, o); };
mob('flibustier', { name: 'Flibustier maudit', level: 13, hp: 320, dmg: 25, speed: 41, range: 20, xp: 135, gold: [18, 36], groan: 1, night: 1, weapon: ['saber', 'steel'],
  loot: [['dent_zombie', 0.5, 1, 2], ['rhum', 0.12, 1, 1], ['carte_dechiree', 0.05, 1, 1], ['tenue_boucanier', 0.012, 1, 1], ['hache_guerre', 0.01, 1, 1]],
  qloot: [['coffret_bijoux', 0.25]] }); // lot 3 : le fruit de leurs pillages, pour la « Marchandise discrète » du receleur
mob('chien_mort', { name: 'Molosse crevé', level: 12, hp: 210, dmg: 21, speed: 74, range: 16, atkCd: 0.8, windup: 0.25, xp: 110, gold: [6, 15], night: 1,
  loot: [['os_maudit', 0.3, 1, 2]] });
mob('pendu', { name: 'Pendu', level: 15, hp: 380, dmg: 28, speed: 36, range: 21, xp: 170, gold: [15, 33], groan: 1, night: 1,
  loot: [['soie_pendu', 0.55, 1, 2], ['os_maudit', 0.4, 1, 2], ['tenue_brumes', 0.006, 1, 1]] });
mob('sorciere', { name: 'Sorcière des marées', level: 16, hp: 300, dmg: 30, speed: 34, range: 150, atkCd: 2.1, windup: 0.6, xp: 190, gold: [24, 45], ranged: { speed: 140, life: 1.4, kind: 'curse' }, keep: 90,
  loot: [['herbes', 0.5, 1, 3], ['soie_pendu', 0.3, 1, 1]] });
mob('sirene', { name: 'Sirène noyée', level: 15, hp: 290, dmg: 26, speed: 46, range: 140, atkCd: 1.9, windup: 0.55, xp: 170, gold: [18, 39], swims: 1, ranged: { speed: 160, life: 1.2, kind: 'note' }, keep: 80,
  loot: [['ecaille_sirene', 0.6, 1, 2], ['tenue_sirene', 0.005, 1, 1]] });
mob('crabe_corail', { name: 'Crabe de corail', level: 14, hp: 360, dmg: 24, speed: 46, range: 17, xp: 140, gold: [9, 21], r: 8, base: 'crab',
  loot: [] });
mob('legionnaire', { name: 'Légionnaire d’os', level: 18, hp: 520, dmg: 33, speed: 38, range: 24, xp: 230, gold: [21, 42], weapon: ['saber', 'bone'],
  loot: [['os_legionnaire', 0.6, 1, 2], ['os_maudit', 0.5, 1, 3], ['sabre_os', 0.006, 1, 1]] });
mob('pestifere', { name: 'Pestiféré', level: 19, hp: 560, dmg: 36, speed: 39, range: 19, xp: 250, gold: [18, 39], groan: 1, night: 1, plague: 1,
  loot: [['herbes', 0.25, 1, 2], ['os_maudit', 0.4, 1, 2]] });
mob('medecin_peste', { name: 'Médecin de peste', level: 20, hp: 480, dmg: 38, speed: 37, range: 135, atkCd: 2.3, windup: 0.7, xp: 280, gold: [30, 60], ranged: { speed: 120, life: 1.2, kind: 'flask', splash: 26 }, keep: 85,
  loot: [['plume_corbeau', 0.6, 1, 2], ['herbes', 0.4, 1, 3], ['rhum', 0.15, 1, 1], ['tenue_peste', 0.004, 1, 1]] });
mob('calcine', { name: 'Flibustier calciné', level: 22, hp: 760, dmg: 44, speed: 42, range: 22, xp: 340, gold: [30, 60], groan: 1, burnHit: 0.3, weapon: ['bigsaber', 'rust'],
  loot: [['braise', 0.5, 1, 2], ['os_maudit', 0.3, 1, 2]] });
mob('golem_lave', { name: 'Golem de lave', level: 24, hp: 1400, dmg: 54, speed: 26, range: 26, atkCd: 1.8, windup: 0.7, xp: 460, gold: [36, 72], r: 12, big: 1,
  loot: [['coeur_golem', 0.35, 1, 1], ['braise', 0.6, 1, 3], ['armure_conquistador', 0.012, 1, 1]] });
mob('damne', { name: 'Damné', level: 27, hp: 2100, dmg: 74, speed: 44, range: 24, atkCd: 1.1, windup: 0.42, xp: 620, gold: [60, 120], groan: 1, hard: 1, weapon: ['bigsaber', 'bone'],
  loot: [['os_maudit', 0.6, 2, 4], ['faux_damnee', 0.004, 1, 1], ['armure_damnee', 0.004, 1, 1]] });
mob('arquebusier_damne', { name: 'Arquebusier damné', level: 27, hp: 1500, dmg: 70, speed: 38, range: 190, atkCd: 2.0, windup: 0.7, xp: 600, gold: [60, 120], hard: 1, ranged: { speed: 230, life: 1.2, kind: 'ball' }, keep: 110,
  loot: [['canon_damne', 0.004, 1, 1]] });
mob('molosse_damne', { name: 'Molosse damné', level: 26, hp: 1300, dmg: 62, speed: 82, range: 18, atkCd: 0.7, windup: 0.25, xp: 520, gold: [30, 75], hard: 1,
  loot: [] });
// boss du Grand Large : phases, titres et attaques propres
mob('bourreau', { name: 'Le Bourreau', level: 17, hp: 3600, dmg: 34, speed: 38, aggro: 150, leash: 260, range: 30, atkCd: 1.5, windup: 0.6, xp: 1800, gold: [240, 390], r: 13, respawn: 420, elite: 1, groan: 1, big: 1,
  ai: 'bourreau', phases: [0.6, 0.3], title: 'Juge de la Forêt des Pendus', weapon: ['axe', 'dark'],
  loot: [['hache_bourreau', 0.25, 1, 1], ['soie_pendu', 1, 3, 6], ['tenue_brumes', 0.15, 1, 1]] });
mob('reine_sirenes', { name: 'La Reine des Sirènes', level: 16, hp: 3100, dmg: 32, speed: 44, aggro: 170, leash: 260, range: 150, atkCd: 1.6, windup: 0.5, xp: 1700, gold: [225, 360], r: 13, respawn: 420, elite: 1, swims: 1, big: 1,
  ranged: { speed: 170, life: 1.3, kind: 'note' }, keep: 90, ai: 'sirene', phases: [0.5], title: 'Voix du Lagon',
  loot: [['trident_sirene', 0.25, 1, 1], ['ecaille_sirene', 1, 3, 6], ['tenue_sirene', 0.15, 1, 1]] });
mob('general_os', { name: 'Le Général d’Os', level: 20, hp: 5400, dmg: 38, speed: 34, aggro: 160, leash: 240, range: 30, atkCd: 1.4, windup: 0.55, xp: 2600, gold: [330, 510], r: 13, respawn: 480, elite: 1, big: 1,
  ai: 'general', phases: [0.66, 0.33], title: 'Commandant de la Légion Blanchie', weapon: ['bigsaber', 'bone'],
  loot: [['mousquet_general', 0.3, 1, 1], ['os_legionnaire', 1, 4, 8], ['sabre_os', 0.2, 1, 1]] });
mob('docteur_corbeau', { name: 'Le Docteur Corbeau', level: 22, hp: 6400, dmg: 40, speed: 40, aggro: 170, leash: 260, range: 30, atkCd: 1.3, windup: 0.5, xp: 3200, gold: [390, 600], r: 13, respawn: 480, elite: 1, big: 1,
  ai: 'corbeau', phases: [0.6, 0.3], title: 'Il soigne la vie, par la mort',
  loot: [['scalpel_corbeau', 0.3, 1, 1], ['tenue_peste', 0.25, 1, 1], ['plume_corbeau', 1, 4, 8]] });
mob('brasier', { name: 'Le Brasier', level: 25, hp: 9600, dmg: 50, speed: 32, aggro: 170, leash: 240, range: 32, atkCd: 1.5, windup: 0.6, xp: 4600, gold: [480, 780], r: 14, respawn: 600, elite: 1, big: 1,
  ai: 'brasier', phases: [0.66, 0.33], title: 'Cœur ardent de Cendrelune', weapon: ['bigsaber', 'rust'], burnHit: 0.4,
  loot: [['marteau_brasier', 0.3, 1, 1], ['coeur_golem', 1, 1, 2], ['braise', 1, 4, 8], ['armure_conquistador', 0.2, 1, 1]] });
mob('frere_fer', { name: 'Fer, l’aîné des Ferrailleurs', level: 18, hp: 3400, dmg: 34, speed: 36, aggro: 200, leash: 400, range: 28, atkCd: 1.4, windup: 0.55, xp: 1900, gold: [210, 330], r: 13, respawn: 300, elite: 1, big: 1,
  ai: 'frere', twin: 'frere_rouille', phases: [0.5], title: 'Frères Ferrailleurs', weapon: ['axe', 'steel'],
  loot: [] });
mob('frere_rouille', { name: 'Rouille, le cadet des Ferrailleurs', level: 18, hp: 3400, dmg: 34, speed: 40, aggro: 200, leash: 400, range: 26, atkCd: 1.2, windup: 0.5, xp: 1900, gold: [210, 330], r: 13, respawn: 300, elite: 1, big: 1,
  ai: 'frere', twin: 'frere_fer', phases: [0.5], title: 'Frères Ferrailleurs', weapon: ['bigsaber', 'rust'],
  loot: [] });
mob('comte_vespere', { name: 'Vespère, Comte des Marées', level: 30, hp: 26000, dmg: 82, speed: 40, aggro: 200, leash: 300, range: 32, atkCd: 1.2, windup: 0.5, xp: 12000, gold: [1350, 2100], r: 14, respawn: 900, elite: 1, big: 1, hard: 1,
  ai: 'vespere', phases: [0.75, 0.5, 0.25], title: 'Seigneur de l’Île des Damnés', weapon: ['bigsaber', 'bone'],
  loot: [['lame_vespere', 0.35, 1, 1], ['tenue_comte', 0.3, 1, 1], ['dent_comte', 0.3, 1, 1]] });
// 0.8 : l'île de Libertalia — vivants sans foi et morts sans repos
mob('epouvantail', { name: 'Épouvantail des cannaies', level: 14, hp: 340, dmg: 24, speed: 40, range: 20, xp: 145, gold: [12, 27], night: 1, weapon: ['axe', 'rust'],
  loot: [['herbes', 0.3, 1, 2], ['chapeau_paille', 0.03, 1, 1]] });
mob('coupe_jarret', { name: 'Coupe-jarret', level: 16, hp: 380, dmg: 28, speed: 52, range: 18, atkCd: 0.9, windup: 0.3, xp: 180, gold: [18, 42], night: 1, weapon: ['saber', 'steel'],
  loot: [['crochets', 0.05, 1, 2], ['tenue_contrebandier', 0.004, 1, 1]] });
mob('contrebandier', { name: 'Contrebandier maudit', level: 17, hp: 420, dmg: 29, speed: 44, range: 130, atkCd: 1.9, windup: 0.5, xp: 200, gold: [21, 45], ranged: { speed: 200, life: 1.0, kind: 'ball' }, keep: 75, weapon: ['pistol', 'steel'],
  loot: [['tonnelet_contrebande', 0.45, 1, 1], ['rhum_vieux', 0.06, 1, 1], ['tenue_contrebandier', 0.004, 1, 1]] });
mob('naufrageur', { name: 'Naufrageur', level: 19, hp: 480, dmg: 31, speed: 42, range: 20, xp: 240, gold: [24, 48], weapon: ['saber', 'rust'],
  loot: [['lanterne_naufrageur', 0.5, 1, 1], ['longue_vue', 0.02, 1, 1]] });
mob('garde_maudit', { name: 'Garde maudit du Fort', level: 21, hp: 520, dmg: 34, speed: 36, range: 170, atkCd: 2.2, windup: 0.7, xp: 300, gold: [27, 54], night: 1, ranged: { speed: 220, life: 1.1, kind: 'ball' }, keep: 100, weapon: ['musket', 'steel'],
  loot: [['os_legionnaire', 0.3, 1, 2], ['uniforme_marine', 0.004, 1, 1]] });
mob('goule_ecarlate', { name: 'Goule écarlate', level: 23, hp: 640, dmg: 40, speed: 60, range: 16, atkCd: 0.85, windup: 0.25, xp: 330, gold: [24, 51], night: 1,
  loot: [['os_maudit', 0.4, 1, 2], ['collier_vaudou', 0.003, 1, 1]] });
mob('reine_mangrove', { name: 'La Reine de la Mangrove', level: 22, hp: 3900, dmg: 38, speed: 38, aggro: 170, leash: 260, range: 150, atkCd: 1.7, windup: 0.55, xp: 2100, gold: [260, 420], r: 13, respawn: 600, elite: 1, big: 1, swims: 1,
  ranged: { speed: 150, life: 1.4, kind: 'curse' }, keep: 90, title: 'Celle qui boit la marée', ai: 'mangrove', phases: [0.6, 0.3],
  loot: [['tenue_vaudou', 0.2, 1, 1], ['baton_vaudou', 0.15, 1, 1], ['antidote', 1, 2, 4]] });
mob('capitaine_naufrageur', { name: 'Grand-Feu, capitaine des naufrageurs', level: 24, hp: 4400, dmg: 42, speed: 40, aggro: 160, leash: 260, range: 30, atkCd: 1.4, windup: 0.55, xp: 2500, gold: [300, 480], r: 13, respawn: 600, elite: 1, big: 1, groan: 1,
  title: 'Celui qui allume les fausses lumières', weapon: ['bigsaber', 'steel'], burnHit: 0.25, ai: 'grandfeu', phases: [0.6, 0.3],
  loot: [['tenue_chasseur', 0.2, 1, 1], ['longue_vue', 0.5, 1, 1], ['lanterne_naufrageur', 1, 2, 3]] });
mob('roi_sans_couronne', { name: 'Le Roi sans Couronne', level: 28, hp: 16000, dmg: 60, speed: 38, aggro: 180, leash: 260, range: 32, atkCd: 1.3, windup: 0.5, xp: 7000, gold: [800, 1300], r: 14, respawn: 900, elite: 1, big: 1,
  ai: 'tyran', adds: 'garde_maudit', phases: [0.66, 0.33], title: 'Premier tyran de Libertalia', weapon: ['bigsaber', 'gold'],
  shouts: { sum: 'Ma garde ! Défendez votre roi !', line: 'À genoux devant votre roi !', charge: 'Libertalia est à MOI !', volley: 'Feu sur les traîtres !' },
  loot: [['sabre_midas', 0.08, 1, 1], ['habit_gouverneur', 0.2, 1, 1], ['couronne_brisee', 1, 1, 1]] });
// navires ennemis : ils patrouillent, canonnent les bateaux, et coulent
mob('brick_noye', { name: 'Brick des Noyés', level: 12, hp: 1000, dmg: 26, speed: 64, aggro: 330, leash: 99999, range: 230, atkCd: 3.2, windup: 0.8, xp: 520, gold: [120, 210], r: 18, respawn: 240, ship: { kind: 'sloop', sail: 'black', guns: 2 },
  loot: [['rhum', 0.5, 1, 2], ['carte_dechiree', 0.25, 1, 1], ['carte_tresor', 0.04, 1, 1], ['tenue_corsaire', 0.03, 1, 1]] });
mob('fregate_maudite', { name: 'Frégate maudite', level: 20, hp: 2600, dmg: 40, speed: 70, aggro: 360, leash: 99999, range: 250, atkCd: 3.0, windup: 0.8, xp: 1300, gold: [270, 450], r: 20, respawn: 300, elite: 1, ship: { kind: 'brick', sail: 'red', guns: 3 },
  loot: [['carte_tresor', 0.12, 1, 1], ['tenue_corsaire', 0.08, 1, 1], ['couleuvrine', 0.05, 1, 1]] });
mob('galion_fantome', { name: 'Le Galion Fantôme', level: 28, hp: 14000, dmg: 58, speed: 58, aggro: 420, leash: 99999, range: 280, atkCd: 2.6, windup: 0.8, xp: 6000, gold: [900, 1500], r: 26, respawn: 900, elite: 1, hard: 1, ship: { kind: 'brick', sail: 'ghost', guns: 4, scale: 1.5 },
  ai: 'galion', phases: [0.5], title: 'Vaisseau du Comte Vespère',
  loot: [['canon_damne', 0.25, 1, 1], ['tenue_comte', 0.1, 1, 1], ['carte_tresor', 0.5, 1, 1]] });
// 1.0 : chaque boss laisse parfois son trophée (un objet de collection à exposer chez soi)
for (const [boss, [id]] of Object.entries(TROPHIES)) if (MOBS[boss]) (MOBS[boss].loot = MOBS[boss].loot || []).push([id, 0.3, 1, 1]);
// 1.0 : Acte III — l'âme du prêtre qui alluma la Flamme, devant l'épave du Léviathan
mob('ame_anselme', { name: 'L’Âme du Père Anselme', level: 28, hp: 9000, dmg: 44, speed: 36, aggro: 260, leash: 380, range: 30, atkCd: 1.4, windup: 0.55, xp: 4800, gold: [500, 800], r: 14, respawn: 99999, elite: 1, big: 1,
  ai: 'flamme', phases: [0.66, 0.33], title: 'Premier gardien de la Flamme', weapon: ['bigsaber', 'gold'], loot: [['rhum_vieux', 1, 1, 2], ['lame_vespere', 0.08, 1, 1], ['habit_gouverneur', 0.05, 1, 1]] });
for (const m of ['damne', 'arquebusier_damne']) MOBS[m].loot.push(['page_anselme', 0.3, 1, 1]);
// 1.0 : le maître du Bastion Englouti, au fond de la troisième salle
mob('amiral_englouti', { name: 'L’Amiral Englouti', level: 24, hp: 6500, dmg: 40, speed: 38, aggro: 200, leash: 300, range: 30, atkCd: 1.4, windup: 0.55, xp: 3600, gold: [420, 640], r: 14, respawn: 900, elite: 1, big: 1, swims: 1, groan: 1,
  ai: 'amiral', phases: [0.5, 0.25], title: 'Seigneur du Bastion', weapon: ['bigsaber', 'steel'], loot: [['harpon_abysses', 0.18, 1, 1], ['sabre_jumeaux', 0.12, 1, 1], ['uniforme_marine', 0.15, 1, 1], ['rhum_vieux', 1, 1, 3]] });
// 1.0 : le roi noyé de la cité engloutie d'Ys
mob('roi_ys', { name: 'Gradlon, roi d’Ys-la-Noyée', level: 27, hp: 7600, dmg: 44, speed: 34, aggro: 220, leash: 340, range: 30, atkCd: 1.4, windup: 0.55, xp: 4200, gold: [520, 800], r: 14, respawn: 900, elite: 1, big: 1, swims: 1, groan: 1,
  ai: 'gradlon', phases: [0.5], title: 'Le roi qui dort sous la mer', weapon: ['bigsaber', 'gold'], loot: [['trident_orage', 0.18, 1, 1], ['harpon_abysses', 0.15, 1, 1], ['habit_gouverneur', 0.06, 1, 1], ['rhum_vieux', 1, 1, 3]] });
MOBS.galion_fantome.loot.push(['spectre_brumes', 0.03, 1, 1]); // 1.0 : un navire légendaire
