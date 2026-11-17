// 0.8 : l'artisanat, la récolte et les bases ont disparu. Ce qui en reste dans les vieilles
// sauvegardes est revendu à ce prix (doublons par unité) quand le pirate se reconnecte.
export const LEGACY_VALUE = {
  // matériaux
  pince_crabe: 3, chair_putride: 2, algue_noire: 8, poudre_noire: 10, perle_ombre: 70,
  bois: 2, bois_flotte: 1, fibre: 1, silex: 1, pierre: 2, minerai_fer: 6, resine: 5,
  champignon: 2, champignon_luisant: 8, coquillage: 1, corde: 4, planche: 5, charbon: 3, toile: 6, lingot_fer: 14,
  fil_or: 45, essence_damnee: 140, bois_epave: 12, cuir_molosse: 26,
  // outils
  hache_silex: 10, pioche_silex: 10, hache_fer: 60, pioche_fer: 70,
  // constructions de base
  pavillon: 30, mur_bois: 6, palissade: 6, mur_pierre: 8, porte_bois: 12, feu_camp: 10, etabli: 30, forge_base: 60, canon_def: 120,
};
// les structures de base disparues, et l'objet qu'elles valaient
export const LEGACY_STRUCT = { pavillon: 'pavillon', mur_bois: 'mur_bois', palissade: 'palissade', mur_pierre: 'mur_pierre', porte: 'porte_bois', feu_camp: 'feu_camp', etabli: 'etabli', forge_base: 'forge_base', canon_def: 'canon_def' };
// anciens matériaux devenus objets de quête : au-delà de ce que les quêtes en cours réclament, revendus à ce prix
export const QUEST_ITEM_OLD_VALUE = { os_maudit: 5, dent_zombie: 7, eclat_cristal: 22, encre_noire: 14, ecaille_sirene: 22, os_legionnaire: 16, plume_corbeau: 14, soie_pendu: 18, braise: 30, coeur_golem: 70, herbes: 2 };
