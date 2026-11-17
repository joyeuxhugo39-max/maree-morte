// Compétences. cd en secondes, cost en énergie, lvl = niveau requis.
export const SKILLS = {
  slash: { name: 'Coup de sabre', key: 'Clic gauche', icon: 'sk_slash', cd: 0.5, cost: 0, lvl: 1, desc: 'Frappe en arc de cercle devant vous.' },
  shot: { name: 'Coup de feu', key: 'Clic droit / 1', icon: 'sk_shot', cd: 1.25, cost: 8, lvl: 1, needGun: 1, desc: 'Tire avec votre arme à feu vers le curseur.' },
  roll: { name: 'Roulade', key: 'Espace', icon: 'sk_roll', cd: 1.4, cost: 12, lvl: 1, desc: 'Esquive rapide : invulnérable pendant la roulade.' },
};
export const HOTBAR = ['slash', 'shot', 'roll'];
// 0.8 : les touches 2 à 5 servent aux émotes (tout le monde les voit)
export const EMOTES = [
  { id: 'danse', name: 'Danse', key: '2', icon: 'em_danse', say: null, desc: 'Une gigue endiablée, comme à la taverne.' },
  { id: 'salut', name: 'Salut', key: '3', icon: 'em_salut', say: 'Ohé !', desc: 'Un grand signe de la main.' },
  { id: 'doigt', name: 'Doigt d’honneur', key: '4', icon: 'em_doigt', say: 'Tiens, prends ça !', desc: 'Pour dire ce que vous pensez sans un mot.' },
  { id: 'salto', name: 'Salto', key: '5', icon: 'em_salto', say: null, desc: 'Un saut périlleux arrière, pour la frime.' },
];
