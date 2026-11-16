// Assemble le jeu en une seule page HTML (CSS + JS intégrés).
//   npm run build:artifact  ->  dist/maree-morte.html  (page publiée sur claude.ai)
//   npm run build:pages     ->  docs/index.html        (page publique GitHub Pages,
//                                multijoueur direct entre navigateurs)
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = process.argv.includes('--pages');
const out = await build({
  entryPoints: [path.join(ROOT, 'client/main.js')],
  bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none',
  define: { __MM_PAGES__: pages ? 'true' : 'false' },
  // la page claude.ai n'embarque pas le multijoueur direct (inutile là-bas)
  plugins: pages ? [] : [{
    name: 'sans-peerjs',
    setup(b) {
      b.onResolve({ filter: /peernet\.js$/ }, () => ({ path: 'peernet', namespace: 'vide' }));
      b.onLoad({ filter: /.*/, namespace: 'vide' }, () => ({ contents: 'export class PeerNet {}', loader: 'js' }));
    },
  }],
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(ROOT, 'client/style.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'client/index.html'), 'utf8');
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script type="module"')).trim();
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pirata+One&family=Pixelify+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">`;
const extraCss = `#card { top: max(10px, env(safe-area-inset-top, 0px)); left: max(10px, env(safe-area-inset-left, 0px)); }
#topright { top: max(10px, env(safe-area-inset-top, 0px)); right: max(10px, env(safe-area-inset-right, 0px)); }
#menu-btns { top: max(10px, env(safe-area-inset-top, 0px)); }
#bottom { bottom: max(8px, env(safe-area-inset-bottom, 0px)); }`;
let page, file;
if (pages) {
  const icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" rx="3" fill="#1c1426"/><circle cx="8" cy="7" r="5" fill="#eee6cc"/><rect x="5" y="10" width="6" height="3" fill="#eee6cc"/><circle cx="6" cy="7" r="1.4" fill="#1c1426"/><circle cx="10" cy="7" r="1.4" fill="#1c1426"/></svg>');
  page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Marée Morte — pirates contre zombies</title>
<meta name="description" content="MMORPG 2D en pixel art : pirates contre zombies. Jouez gratuitement dans le navigateur, seul ou avec tous ceux qui ouvrent le lien.">
<meta property="og:title" content="Marée Morte — pirates contre zombies">
<meta property="og:description" content="MMORPG 2D en pixel art, directement dans le navigateur.">
<meta name="theme-color" content="#1c1426">
<link rel="icon" href="${icon}">
${fonts}
<style>
:root { color-scheme: dark; }
html, body { background: #07050b; }
${css}
${extraCss}
</style>
</head>
<body>
${body}
<script>window.MM_MODE = 'pages';</script>
<script>${js}</script>
</body>
</html>
`;
  file = 'docs/index.html';
  fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'docs/.nojekyll'), '');
} else {
  page = `<title>Marée Morte</title>
${fonts}
<style>
:root { color-scheme: dark; }
${css}
${extraCss}
</style>
${body}
<script>window.MM_MODE = 'artifact';</script>
<script>${js}</script>
`;
  file = 'dist/maree-morte.html';
  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
}
fs.writeFileSync(path.join(ROOT, file), page);
console.log(`${file} : ${(page.length / 1024).toFixed(0)} Ko`);
