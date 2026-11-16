// Bestiaire. Vitesses en px/s, portées en px, temps en secondes.
// loot : [objet, chance, min, max]
export const MOBS = {
  crab: {
    name: 'Crabe putride', level: 1, hp: 24, dmg: 4, speed: 40, aggro: 70, leash: 170, range: 15, atkCd: 1.3, windup: 0.32,
    xp: 12, gold: [1, 4], r: 7, respawn: 18,
    loot: [['pince_crabe', 0.6, 1, 1], ['chair_putride', 0.15, 1, 1], ['banane', 0.08, 1, 1], ['noix_coco', 0.04, 1, 1]],
  },
  zsailor: {
    name: 'Matelot zombie', level: 2, hp: 46, dmg: 7, speed: 31, aggro: 92, leash: 200, range: 17, atkCd: 1.4, windup: 0.42,
    xp: 21, gold: [2, 7], r: 7, respawn: 22, groan: 1,
    loot: [['os_maudit', 0.45, 1, 2], ['chair_putride', 0.35, 1, 1], ['banane', 0.08, 1, 1], ['bandana', 0.03, 1, 1], ['mariniere', 0.02, 1, 1], ['bottes_usees', 0.03, 1, 1]],
  },
  buccaneer: {
    name: 'Boucanier zombie', level: 4, hp: 92, dmg: 12, speed: 37, aggro: 100, leash: 220, range: 19, atkCd: 1.2, windup: 0.38,
    xp: 42, gold: [5, 12], r: 7, respawn: 26, groan: 1, weapon: ['saber', 'rust'],
    loot: [['dent_zombie', 0.5, 1, 2], ['os_maudit', 0.4, 1, 2], ['poudre_noire', 0.15, 1, 1], ['poisson_grille', 0.08, 1, 1], ['bandana_noir', 0.04, 1, 1], ['coutelas', 0.03, 1, 1], ['carte_dechiree', 0.02, 1, 1]],
  },
  ghoul: {
    name: 'Goule des lianes', level: 5, hp: 74, dmg: 10, speed: 58, aggro: 110, leash: 230, range: 16, atkCd: 0.85, windup: 0.25,
    xp: 46, gold: [4, 10], r: 7, respawn: 26,
    loot: [['os_maudit', 0.5, 1, 2], ['chair_putride', 0.4, 1, 2], ['noix_coco', 0.12, 1, 1], ['collier_requin', 0.015, 1, 1], ['chapeau_paille', 0.04, 1, 1]],
  },
  drowned: {
    name: 'Noyé', level: 7, hp: 175, dmg: 16, speed: 29, aggro: 95, leash: 210, range: 19, atkCd: 1.5, windup: 0.5,
    xp: 72, gold: [8, 16], r: 8, respawn: 30, groan: 1, swims: 1,
    loot: [['algue_noire', 0.6, 1, 2], ['os_maudit', 0.4, 1, 2], ['rhum', 0.06, 1, 1], ['perle_ombre', 0.05, 1, 1], ['gilet_cuir', 0.03, 1, 1], ['carte_dechiree', 0.03, 1, 1]],
  },
  skelgun: {
    name: 'Squelette canonnier', level: 8, hp: 120, dmg: 18, speed: 33, aggro: 150, leash: 240, range: 140, atkCd: 2.3, windup: 0.6,
    xp: 82, gold: [9, 18], r: 7, respawn: 30, ranged: { speed: 150, life: 1.3 }, keep: 80,
    loot: [['os_maudit', 0.7, 1, 3], ['poudre_noire', 0.45, 1, 2], ['tricorne', 0.04, 1, 1], ['pistolet_silex', 0.03, 1, 1], ['perle_ombre', 0.03, 1, 1], ['carte_dechiree', 0.03, 1, 1]],
  },
  boss: {
    name: 'Capitaine Barbe-Cendre', level: 12, hp: 2600, dmg: 30, speed: 36, aggro: 150, leash: 260, range: 34, atkCd: 1.6, windup: 0.62,
    xp: 1400, gold: [220, 320], r: 13, respawn: 180, boss: 1, groan: 1, weapon: ['bigsaber', 'bone'],
    loot: [['lame_corail', 0.35, 1, 1], ['chapeau_capitaine', 0.3, 1, 1], ['manteau_capitaine', 0.25, 1, 1], ['boussole_maudite', 0.3, 1, 1], ['perle_ombre', 1, 2, 4], ['rhum', 1, 2, 3]],
  },
  crabroi: {
    name: 'Crabe-Roi', level: 4, hp: 420, dmg: 13, speed: 44, aggro: 95, leash: 230, range: 24, atkCd: 1.2, windup: 0.42,
    xp: 170, gold: [35, 70], r: 13, respawn: 360, elite: 1, base: 'crab',
    loot: [['couronne_crabe', 0.3, 1, 1], ['perle_ombre', 0.6, 1, 2], ['collier_requin', 0.2, 1, 1], ['pince_crabe', 1, 3, 6], ['carte_dechiree', 0.5, 1, 1], ['rhum', 0.5, 1, 2]],
  },
  goule_alpha: {
    name: 'Goule Alpha', level: 7, hp: 650, dmg: 18, speed: 60, aggro: 120, leash: 260, range: 22, atkCd: 0.85, windup: 0.3,
    xp: 270, gold: [50, 90], r: 13, respawn: 420, elite: 1, base: 'ghoul',
    loot: [['sabre_abordage', 0.12, 1, 1], ['perle_ombre', 0.7, 1, 2], ['bandana_noir', 0.3, 1, 1], ['carte_dechiree', 0.8, 1, 2], ['amulette_lanterne', 0.08, 1, 1]],
  },
  capitaine_noye: {
    name: 'Capitaine Noyé', level: 9, hp: 950, dmg: 22, speed: 34, aggro: 220, leash: 420, range: 26, atkCd: 1.3, windup: 0.5,
    xp: 320, gold: [60, 110], r: 13, respawn: 99999, elite: 1, groan: 1, swims: 1, weapon: ['bigsaber', 'rust'],
    loot: [['ecaille_leviathan', 0.25, 1, 1], ['perle_ombre', 1, 1, 3], ['rhum', 1, 1, 2]],
  },
};
MOBS.roi_squelette = {
  name: 'Roi des Os', level: 11, hp: 1500, dmg: 26, speed: 34, aggro: 150, leash: 220, range: 28, atkCd: 1.3, windup: 0.5,
  xp: 720, gold: [120, 200], r: 13, respawn: 300, elite: 1, groan: 1, weapon: ['bigsaber', 'bone'],
  loot: [['lame_corail', 0.1, 1, 1], ['chapeau_capitaine', 0.2, 1, 1], ['perle_ombre', 1, 2, 4], ['carte_dechiree', 1, 1, 2], ['boussole_maudite', 0.15, 1, 1]],
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
  xp: 3000, gold: [500, 800], r: 34, respawn: 99999, elite: 1, sea: 1, ai: 'kraken', phases: [0.66, 0.33], title: 'Terreur des Abysses',
  loot: [['oeil_kraken', 0.35, 1, 1], ['harpon_abysses', 0.3, 1, 1], ['bebe_kraken', 0.25, 1, 1], ['tentacule_fumee', 1, 2, 4], ['perle_ombre', 1, 3, 5], ['encre_noire', 1, 3, 6]],
};
MOBS.tentacule = {
  name: 'Tentacule', level: 12, hp: 320, dmg: 22, speed: 0, aggro: 420, leash: 99999, range: 0, atkCd: 99, windup: 1,
  xp: 40, gold: [0, 0], r: 10, respawn: 99999, sea: 1, ai: 'tentacle', loot: [['encre_noire', 0.3, 1, 1]],
};
