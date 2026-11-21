// Monde vivant, lot 5 : les petites scènes des habitants. Des échanges courts, qui se répondent, choisis selon le lieu
// (quai, marché, rue, taverne), le moment (jour, soir, nuit, aube), les métiers, et ce qui se passe (pluie, festival).
// Chaque réplique : [qui parle (0, 1 ou 2), le texte]. Une scène « muette » ne montre que des gestes.
// Règles (appliquées par townsfolk.js) : une ou deux scènes visibles à la fois, trois personnes au plus, des pauses
// irrégulières, et une scène ne revient pas avant plusieurs minutes.
export const SCENES = [
  // ---------------- les quais
  { id: 'q_traversee', where: 'quai', roles: ['matelot|docker|pecheur', 'matelot|docker|pecheur'], lines: [[0, 'Tu reprends la mer demain ?'], [1, 'Si le vent tourne.'], [0, 'Il tournera.']] },
  { id: 'q_caisse', where: 'quai', roles: ['guet', 'docker'], lines: [[0, 'Cette caisse, elle va où ?'], [1, 'À la capitainerie. Elle pèse son poids.'], [0, 'Alors ne la lâche pas sur mes pieds.']] },
  { id: 'q_prise', where: 'quai', roles: ['pecheur', 'any'], lines: [[0, 'Regarde-moi ça.'], [1, 'C’est un poisson, ça ?'], [0, 'Il avait des dents, en tout cas.']] },
  { id: 'q_brume', where: 'quai', when: 'aube|jour', roles: ['pecheur', 'pecheur'], lines: [[0, 'La brume tient encore.'], [1, 'Elle lèvera avant midi.']] },
  { id: 'q_galion', where: 'quai', roles: ['any', 'any'], lines: [[0, 'Tu as vu le trois-mâts, au large ?'], [1, 'Pas de pavillon.'], [0, 'C’est bien ce qui m’inquiète.']] },
  { id: 'q_corde', where: 'quai', roles: ['docker', 'docker'], lines: [[0, 'Passe-moi le bout.'], [1, 'Lequel ?'], [0, 'Celui qui n’est pas noué.']] },
  { id: 'q_paye', where: 'quai', roles: ['docker', 'any'], lines: [[0, 'Trois caisses de plus, et c’est la paye.'], [1, 'Courage.']] },
  { id: 'q_nuit', where: 'quai', when: 'nuit', roles: ['guet', 'any'], lines: [[0, 'Pas de feu sur les quais, la nuit.'], [1, 'Juste une pipe…'], [0, 'Pas de pipe non plus.']] },
  // ---------------- le marché
  { id: 'm_prix', where: 'marche', roles: ['marchand', 'client|habitant|voyageur'], lines: [[1, 'Combien, les oranges ?'], [0, 'Deux sous la main.'], [1, 'Et pour une main honnête ?'], [0, 'Trois.']] },
  { id: 'm_frais', where: 'marche', roles: ['marchand', 'client|habitant'], lines: [[1, 'C’est d’hier, ce poisson.'], [0, 'D’avant-hier. Mais il ne le sait pas.']] },
  { id: 'm_monnaie', where: 'marche', roles: ['marchand', 'client|habitant|voyageur'], lines: [[0, 'Vous me donnez une pièce espagnole ?'], [1, 'Elle a la même couleur que les autres.'], [0, 'Pas le même poids.']] },
  { id: 'm_voisin', where: 'marche', roles: ['marchand', 'marchand'], lines: [[0, 'Calme, ce matin.'], [1, 'Les bateaux ne sont pas rentrés.']] },
  { id: 'm_tissu', where: 'marche', roles: ['client|habitant', 'client|habitant'], lines: [[0, 'Ce rouge te va bien.'], [1, 'C’est du rouge de Libertalia. Ça déteint.']] },
  // ---------------- la rue
  { id: 'r_kraken', where: 'rue|quai', roles: ['any', 'any'], lines: [[0, 'Il paraît que le Kraken s’est réveillé.'], [1, 'Il paraît, il paraît…']] },
  { id: 'r_prime', where: 'rue', roles: ['any', 'any'], lines: [[0, 'Une nouvelle prime à la Capitainerie.'], [1, 'Combien ?'], [0, 'Assez pour qu’on n’y aille pas seuls.']] },
  { id: 'r_toit', where: 'rue', when: 'jour', roles: ['habitant', 'habitant'], lines: [[0, 'Ton toit fuit encore ?'], [1, 'Seulement quand il pleut.']] },
  { id: 'r_cousin', where: 'rue', roles: ['habitant|matelot', 'any'], lines: [[0, 'Mon cousin a vu une sirène.'], [1, 'Ton cousin voit beaucoup de choses.']] },
  { id: 'r_flamme', where: 'rue', when: 'soir|nuit', roles: ['habitant', 'any'], lines: [[0, 'Tant que la Flamme brûle…'], [1, '… les morts restent dehors. Je sais.']] },
  { id: 'r_guet', where: 'rue', when: 'nuit', roles: ['guet', 'guet'], lines: [[0, 'Rien à signaler.'], [1, 'Moi non plus.'], [0, 'Tant mieux.']] },
  { id: 'r_aube', where: 'rue|quai', when: 'aube', roles: ['any', 'any'], lines: [[0, 'Déjà debout ?'], [1, 'Pas encore tout à fait.']] },
  { id: 'r_voyage', where: 'rue', roles: ['voyageur', 'any'], lines: [[0, 'L’auberge, c’est par où ?'], [1, 'Suivez les chopes, vous ne pouvez pas la manquer.']] },
  { id: 'r_bras', where: 'rue', roles: ['matelot|docker', 'habitant'], lines: [[1, 'Tu t’es encore battu ?'], [0, 'Je suis tombé.'], [1, 'Sur un poing ?']] },
  { id: 'r_trois', where: 'rue|quai', roles: ['any', 'any', 'any'], lines: [[0, 'Qui a gagné, hier soir ?'], [1, 'Le borgne.'], [2, 'Il triche.'], [1, 'Il gagne, en tout cas.']] },
  // ---------------- devant la taverne
  { id: 't_tournee', where: 'taverne', when: 'soir|nuit', roles: ['any', 'any'], lines: [[0, 'Qui paie la tournée ?'], [1, 'Celui qui a demandé.']] },
  { id: 't_chanson', where: 'taverne', when: 'soir', roles: ['matelot|docker', 'any', 'any'], lines: [[0, 'Une chanson !'], [1, 'Pas celle de la baleine.'], [2, 'Si, celle de la baleine !']] },
  { id: 't_rentrer', where: 'taverne', when: 'nuit', roles: ['any', 'any'], lines: [[0, 'On rentre ?'], [1, 'Encore une.']] },
  { id: 't_histoire', where: 'taverne', roles: ['matelot', 'any'], lines: [[0, 'Je te jure, il était grand comme une goélette.'], [1, 'La dernière fois, c’était une barque.']] },
  // ---------------- selon ce qui se passe
  { id: 'w_pluie', where: 'any', rain: 1, roles: ['any', 'any'], lines: [[0, 'Encore la pluie.'], [1, 'Bon pour les citernes.']] },
  { id: 'w_pluie2', where: 'any', rain: 1, roles: ['any', 'any'], lines: [[0, 'Rentre, tu vas tremper ta pipe.'], [1, 'Elle est déjà trempée.']] },
  { id: 'f_fete', where: 'any', fest: 1, roles: ['any', 'any'], lines: [[0, 'Tu vas voir les feux, ce soir ?'], [1, 'Comme chaque année.']] },
  { id: 'f_course', where: 'any', fest: 1, roles: ['any', 'any'], lines: [[0, 'Qui gagne la course, à ton avis ?'], [1, 'La Belle Insolente. Elle gagne toujours.']] },
  { id: 'n_lune', where: 'any', moon: 1, roles: ['any', 'any'], lines: [[0, 'Pleine lune.'], [1, 'Ferme bien tes volets.']] },
  // ---------------- les scènes muettes : un regard, un signe de tête, un geste (pas de bulle)
  { id: 'g_signe', mute: 1, where: 'any', roles: ['any', 'any'] },
  { id: 'g_quai', mute: 1, where: 'quai', roles: ['any', 'any'] },
  { id: 'g_marche', mute: 1, where: 'marche', roles: ['marchand', 'any'] },
  { id: 'g_rue', mute: 1, where: 'rue', roles: ['any', 'any', 'any'] },
  { id: 'g_taverne', mute: 1, where: 'taverne', roles: ['any', 'any'] },
];
// ce que crie un marchand, de temps en temps (seulement si personne ne parle à côté)
export const CRIES = {
  1: ['Poisson frais ! Tout frais du matin !', 'Des oranges, des oranges !', 'Rhum de la Rade, le meilleur !'], // Port-Lanterne
  25: ['Soieries de Libertalia ! Approchez !', 'Épices, épices des Îles du Sud !', 'Pistolets, poudre, balles !', 'Cartes au trésor, presque vraies !'], // Libertalia
  14: ['Cordages, goudron, voiles !'], 8: ['Harengs fumés !'], 18: ['Légumes du jardin !'],
};
// un mot pour le joueur, rarement, selon le métier
export const GREET = {
  guet: ['Restez dans les murs, capitaine.', 'Bonne journée.'],
  marchand: ['Vous cherchez quelque chose ?', 'Pour vous, un prix d’ami.'],
  docker: ['Attention, ça passe !'],
  pecheur: ['Ça ne mord pas, aujourd’hui.'],
  habitant: ['Bonjour, capitaine.', 'Belle journée.'],
  voyageur: ['Vous êtes d’ici ?'],
  matelot: ['Bon vent.'],
  any: ['Bonjour.'],
};
export const WANTED = ['C’est lui, l’homme de l’affiche !', 'Ne me faites pas de mal…', 'Où est la garde ?'];
