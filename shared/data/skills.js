// Compétences. cd en secondes, cost en énergie, lvl = niveau requis.
export const SKILLS = {
  slash: { name: 'Coup de sabre', key: 'Clic gauche', icon: 'sk_slash', cd: 0.5, cost: 0, lvl: 1, desc: 'Frappe en arc de cercle devant vous.' },
  shot: { name: 'Coup de feu', key: 'Clic droit / 1', icon: 'sk_shot', cd: 1.25, cost: 8, lvl: 1, needGun: 1, desc: 'Tire avec votre arme à feu vers le curseur.' },
  whirl: { name: "Tourbillon d'acier", key: '2', icon: 'sk_whirl', cd: 6, cost: 20, lvl: 2, desc: 'Tournoie et frappe tout autour de vous (150 % des dégâts).' },
  rum: { name: 'Rasade de rhum', key: '3', icon: 'sk_rum', cd: 18, cost: 15, lvl: 3, desc: 'Rend 35 % de vos PV en 5 secondes.' },
  bomb: { name: 'Bombe à poudre', key: '4', icon: 'sk_bomb', cd: 10, cost: 30, lvl: 4, desc: 'Lance une bombe qui explose après 1 seconde (250 % des dégâts, zone).' },
  cry: { name: "Cri d'abordage", key: '5', icon: 'sk_cry', cd: 30, cost: 25, lvl: 6, desc: '+30 % de dégâts et +20 % de vitesse pendant 8 s, pour vous et vos alliés proches.' },
  roll: { name: 'Roulade', key: 'Espace', icon: 'sk_roll', cd: 1.4, cost: 12, lvl: 1, desc: 'Esquive rapide : invulnérable pendant la roulade.' },
};
export const HOTBAR = ['slash', 'shot', 'whirl', 'rum', 'bomb', 'cry', 'roll'];
