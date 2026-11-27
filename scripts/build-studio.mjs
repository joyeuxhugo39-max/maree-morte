// Assemble LStudio en une seule page HTML (CSS + JS intégrés) : docs/lstudio.html, publiée à côté du jeu sur GitHub
// Pages (même adresse : l'aperçu ouvre index.html?apercu=1, le monde publié est docs/monde-studio.json).
//   npm run build:studio
import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({ entryPoints: [path.join(ROOT, 'studio/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none', define: { __MM_PAGES__: 'true', __MM_STUDIO__: 'null' } });
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(ROOT, 'studio/studio.css'), 'utf8');
let html = fs.readFileSync(path.join(ROOT, 'studio/index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="studio.css">', () => `<meta name="robots" content="noindex">\n<style>\n${css}</style>`).replace('<script type="module" src="main.js"></script>', () => `<script>\n${js}\n</script>`); // (des fonctions : le code minifié contient des « $' » que replace interpréterait)
for (const dir of ['docs', 'dist']) { fs.mkdirSync(path.join(ROOT, dir), { recursive: true }); fs.writeFileSync(path.join(ROOT, dir, 'lstudio.html'), html); }
console.log(`docs/lstudio.html : ${Math.round(html.length / 1024)} Ko`);
