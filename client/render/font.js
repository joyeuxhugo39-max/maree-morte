// Police bitmap 5 px de haut pour le texte dans le monde (noms, dégâts).
const G = {
  A: '.#.|#.#|###|#.#|#.#', B: '##.|#.#|##.|#.#|##.', C: '.##|#..|#..|#..|.##', D: '##.|#.#|#.#|#.#|##.',
  E: '###|#..|##.|#..|###', F: '###|#..|##.|#..|#..', G: '.##|#..|#.#|#.#|.##', H: '#.#|#.#|###|#.#|#.#',
  I: '###|.#.|.#.|.#.|###', J: '..#|..#|..#|#.#|.#.', K: '#.#|#.#|##.|#.#|#.#', L: '#..|#..|#..|#..|###',
  M: '#...#|##.##|#.#.#|#...#|#...#', N: '#..#|##.#|#.##|#..#|#..#', O: '.#.|#.#|#.#|#.#|.#.', P: '##.|#.#|##.|#..|#..',
  Q: '.##.|#..#|#..#|#.#.|.#.#', R: '##.|#.#|##.|#.#|#.#', S: '.##|#..|.#.|..#|##.', T: '###|.#.|.#.|.#.|.#.',
  U: '#.#|#.#|#.#|#.#|###', V: '#.#|#.#|#.#|#.#|.#.', W: '#...#|#...#|#.#.#|##.##|#...#', X: '#.#|#.#|.#.|#.#|#.#',
  Y: '#.#|#.#|.#.|.#.|.#.', Z: '###|..#|.#.|#..|###',
  0: '###|#.#|#.#|#.#|###', 1: '.#.|##.|.#.|.#.|###', 2: '##.|..#|.#.|#..|###', 3: '##.|..#|.#.|..#|##.',
  4: '#.#|#.#|###|..#|..#', 5: '###|#..|##.|..#|##.', 6: '.##|#..|###|#.#|###', 7: '###|..#|.#.|.#.|.#.',
  8: '###|#.#|###|#.#|###', 9: '###|#.#|###|..#|##.',
  '!': '#|#|#|.|#', '?': '##.|..#|.#.|...|.#.', '.': '.|.|.|.|#', ',': '.|.|.|#|#', ':': '.|#|.|#|.', "'": '#|#|.|.|.',
  '-': '...|...|###|...|...', '+': '...|.#.|###|.#.|...', '/': '..#|..#|.#.|#..|#..', '%': '#.#|..#|.#.|#..|#.#',
  '(': '.#|#.|#.|#.|.#', ')': '#.|.#|.#|.#|#.', ' ': '..|..|..|..|..', '*': '...|#.#|.#.|#.#|...',
  '[': '##|#.|#.|#.|##', ']': '##|.#|.#|.#|##',
};
const GLYPHS = {};
for (const k in G) {
  const rows = G[k].split('|');
  GLYPHS[k] = { w: rows[0].length, px: rows.map((r) => [...r].map((c) => c === '#')) };
}
const ACC = { 'À': 'A', 'Â': 'A', 'Ä': 'A', 'Ç': 'C', 'É': 'E', 'È': 'E', 'Ê': 'E', 'Ë': 'E', 'Î': 'I', 'Ï': 'I', 'Ô': 'O', 'Ö': 'O', 'Ù': 'U', 'Û': 'U', 'Ü': 'U', 'Œ': 'O', 'Æ': 'A', '’': "'", '‘': "'" }; // 1.9 : l'apostrophe typographique s'affichait comme rien (« SASSEOIR »)
function norm(s) { return [...String(s).toUpperCase()].map((c) => ACC[c] || c).filter((c) => GLYPHS[c]).join(''); }

export function textWidth(s, scale = 1) {
  const t = norm(s);
  let w = 0;
  for (const c of t) w += (GLYPHS[c].w + 1) * scale;
  return Math.max(0, w - scale);
}
const cache = new Map();
// rend un texte avec contour sombre dans un petit canvas mis en cache
export function textCanvas(s, color = '#ffffff', outline = '#1c1426', scale = 1) {
  const key = s + '|' + color + '|' + outline + '|' + scale;
  let c = cache.get(key);
  if (c) return c;
  const t = norm(s);
  const w = textWidth(s, scale) + 2 * scale, h = 5 * scale + 2 * scale;
  c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = h;
  const x = c.getContext('2d');
  const draw = (ox, oy, col) => {
    x.fillStyle = col;
    let cx = ox;
    for (const ch of t) {
      const g = GLYPHS[ch];
      for (let r = 0; r < 5; r++) for (let q = 0; q < g.w; q++) if (g.px[r][q]) x.fillRect(cx + q * scale, oy + r * scale, scale, scale);
      cx += (g.w + 1) * scale;
    }
  };
  if (outline) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]]) draw(scale + dx * scale, scale + dy * scale, outline);
  draw(scale, scale, color);
  if (cache.size > 600) cache.clear();
  cache.set(key, c);
  return c;
}
