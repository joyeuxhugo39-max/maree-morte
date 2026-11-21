// Monde vivant, lot 4 : le mobilier des métiers et les traces de vie — dessinés par le code, selon la charte
// (rampes de 5 teintes, contour automatique, lumière en haut à gauche), à l'échelle des meubles existants.
//  - foin, sacs, planches, alambic, seau, meule, tabouret : pour que chaque atelier se reconnaisse ;
//  - cordage, filet étalé, casier : la vie des quais (posés au sol, on passe dessus).
// (les enseignes de métier existent déjà sur les façades : on n'en ajoute pas)
import { PB } from './pixel.js';
import { mk, WOOD, IRON } from './sprites-env.js';

const STRAW = [0x6a5a22, 0x8e7a2e, 0xb49a3a, 0xd6bc52, 0xeed876];
const CLOTH = [0x5a4a32, 0x7a6644, 0x9a845a, 0xb8a274, 0xd6c094]; // la toile de jute
const COPPER = [0x5a2a14, 0x8a4422, 0xb8642e, 0xd88a48, 0xf2b070];
const ROPE = [0x5a4426, 0x7e6034, 0x9e7c46, 0xbe9a5c, 0xdcbc7c];
const NET = [0x3a3a2a, 0x5a5a40, 0x7a7a58];

function foin(v) { // une botte de foin
  const pb = new PB(16, 14);
  pb.rect(1, 3, 14, 10, STRAW[2]); pb.hl(1, 3, 14, STRAW[4]); pb.hl(1, 4, 14, STRAW[3]);
  for (let x = 2; x < 15; x += 2) for (let y = 5; y < 12; y++) if ((x * 7 + y * 3 + v) % 5 === 0) pb.set(x, y, STRAW[1]);
  pb.vl(5, 3, 10, ROPE[0]); pb.vl(11, 3, 10, ROPE[0]);
  pb.hl(1, 12, 14, STRAW[0]);
  for (const [x, y] of [[0, 4], [15, 6], [3, 2], [12, 2]]) pb.set(x, y, STRAW[3]); // des brins qui dépassent
  pb.outline('auto');
  return mk(pb, 8, 13);
}
function sacs(v) { // des sacs de grain empilés
  const pb = new PB(16, 15);
  const sac = (x, y, w, h) => { pb.blob(x + w / 2, y + h / 2, w / 2, h / 2, CLOTH); pb.hl(x + 2, y + 1, w - 4, CLOTH[4]); pb.set(x + (w >> 1), y, ROPE[1]); };
  sac(0, 6, 9, 8); sac(7, 6, 9, 8); if (v % 2 === 0) sac(4, 1, 8, 7);
  pb.outline('auto');
  return mk(pb, 8, 14);
}
function planches() { // une pile de planches, et deux qui reposent contre le mur
  const pb = new PB(16, 18);
  for (let k = 0; k < 4; k++) { const y = 12 - k * 2; pb.rect(0 + (k & 1), y, 15, 2, WOOD[3 - (k & 1)]); pb.hl(0 + (k & 1), y, 15, WOOD[4]); }
  pb.line(2, 1, 4, 11, WOOD[3], 2); pb.line(5, 0, 6, 10, WOOD[2], 2); pb.set(4, 1, WOOD[5]);
  pb.outline('auto');
  return mk(pb, 8, 16);
}
function alambic() { // l'alambic de cuivre de l'apothicaire
  const pb = new PB(16, 22);
  pb.rect(3, 15, 10, 5, IRON[1]); pb.hl(3, 15, 10, IRON[3]); // le foyer
  pb.set(6, 18, 0xff8a3a); pb.set(8, 18, 0xffc24a); pb.set(10, 18, 0xff8a3a);
  pb.blob(8, 10, 5, 5, COPPER); pb.set(6, 8, COPPER[4]); pb.set(7, 7, COPPER[4]);
  pb.rect(7, 2, 2, 4, COPPER[2]); pb.line(9, 3, 14, 7, COPPER[1], 1); pb.vl(14, 7, 6, COPPER[1]); // le col de cygne
  pb.rect(13, 13, 3, 3, 0x6aa8c0); pb.set(13, 13, 0xb0e0f0); // la fiole qui recueille
  pb.outline('auto');
  return mk(pb, 8, 20, { glow: [[8, 18]], glowCol: 'warm', glowR: 18 });
}
function seau() { // un seau de bois cerclé
  const pb = new PB(10, 11);
  pb.rect(1, 2, 8, 8, WOOD[3]); pb.hl(1, 2, 8, WOOD[1]); pb.rect(2, 3, 6, 1, 0x3a6a8a); // l'eau
  pb.hl(1, 5, 8, IRON[2]); pb.hl(1, 8, 8, IRON[2]); pb.vl(1, 2, 8, WOOD[2]); pb.vl(8, 2, 8, WOOD[1]);
  pb.line(1, 2, 5, 0, IRON[3], 1); pb.line(5, 0, 8, 2, IRON[3], 1);
  pb.outline('auto');
  return mk(pb, 5, 10);
}
function meule() { // la meule à aiguiser, sur son bâti
  const pb = new PB(16, 16);
  pb.rect(2, 9, 12, 2, WOOD[2]); pb.vl(3, 9, 6, WOOD[1]); pb.vl(12, 9, 6, WOOD[1]);
  pb.disc(8, 7, 5, IRON[3]); pb.disc(8, 7, 4, IRON[4]); pb.disc(8, 7, 1.2, WOOD[1]); pb.set(6, 4, 0xd0d0e0);
  pb.line(12, 7, 15, 5, WOOD[3], 1); // la manivelle
  pb.outline('auto');
  return mk(pb, 8, 15);
}
function tabouret() {
  const pb = new PB(10, 10);
  pb.rect(1, 2, 8, 2, WOOD[4]); pb.hl(1, 2, 8, WOOD[5]); pb.vl(2, 4, 5, WOOD[2]); pb.vl(7, 4, 5, WOOD[1]); pb.hl(2, 6, 6, WOOD[2]);
  pb.outline('auto');
  return mk(pb, 5, 9);
}
function cordage(v) { // un rouleau de cordage posé sur le quai (au sol)
  const pb = new PB(14, 10);
  pb.ellipse(7, 5, 6, 4, ROPE[1]); pb.ellipse(7, 5, 4.6, 3, ROPE[3]); pb.ellipse(7, 5, 3.2, 2, ROPE[1]); pb.ellipse(7, 5, 1.6, 1, WOOD[0]);
  for (let a = 0; a < 6; a++) pb.set(Math.round(7 + Math.cos(a) * 5), Math.round(5 + Math.sin(a) * 3.3), ROPE[4]);
  if (v % 2) pb.line(12, 6, 13, 9, ROPE[2], 1); // le bout qui traîne
  return mk(pb, 7, 7);
}
function filetSol(v) { // un filet de pêche étalé à sécher (au sol)
  const pb = new PB(22, 12);
  for (let y = 1; y < 11; y++) for (let x = 1; x < 21; x++) { const edge = Math.abs(x - 11) / 10 + Math.abs(y - 6) / 5.5; if (edge > 1.05 + ((x * 3 + y + v) % 3) * 0.05) continue; if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) pb.set(x, y, NET[(x + y) % 2 ? 1 : 2]); }
  pb.set(5, 4, 0xc8b070); pb.set(16, 7, 0xc8b070); // les flotteurs de liège
  return mk(pb, 11, 8);
}
function casier() { // un casier à homards, en osier
  const pb = new PB(12, 11);
  pb.rect(1, 3, 10, 7, STRAW[1]);
  for (let x = 1; x < 11; x += 2) pb.vl(x, 3, 7, STRAW[3]);
  for (let y = 4; y < 10; y += 2) pb.hl(1, y, 10, STRAW[0]);
  pb.ellipse(6, 3, 5, 2, STRAW[2]); pb.ellipse(6, 3, 2, 1, 0x2a2014);
  pb.outline('auto');
  return mk(pb, 6, 10);
}
export function extendMobilier(env) {
  env.foin = [foin(0), foin(1)];
  env.sacs = [sacs(0), sacs(1)];
  env.planches = [planches()];
  env.alambic = [alambic()];
  env.seau = [seau()];
  env.meule = [meule()];
  env.tabouret = [tabouret()];
  env.cordage = [cordage(0), cordage(1)];
  env.filet_sol = [filetSol(0), filetSol(1)];
  env.casier = [casier()];
}
