// Lance toutes les suites serveur de tests/ (npm test). Chaque suite affiche « OK » ou « FAIL » par vérification
// et finit par « TOUT EST OK » ou « n ÉCHEC(S) ». Usage : node tests/run.mjs [filtre]
import { readdirSync, mkdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
const dir = path.dirname(fileURLToPath(import.meta.url));
mkdirSync(path.join(dir, '.tmp'), { recursive: true });
const only = process.argv[2] || '';
const files = readdirSync(dir).filter((f) => /^t_.*\.mjs$/.test(f) && f.includes(only)).sort();
let bad = 0;
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [f], { cwd: dir, encoding: 'utf8', timeout: 300000 });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = out.split('\n').filter((l) => l.startsWith('FAIL'));
  const good = r.status === 0 && !fails.length && /TOUT EST OK/.test(out);
  if (!good) bad++;
  console.log(`${good ? 'OK  ' : 'FAIL'} ${f.padEnd(18)} ${((Date.now() - t0) / 1000).toFixed(1)} s${good ? '' : '\n     ' + (fails.length ? fails.join('\n     ') : out.trim().split('\n').slice(-4).join('\n     '))}`);
}
console.log(bad ? `${bad} suite(s) en échec sur ${files.length}` : `${files.length} suites : tout est OK`);
process.exit(bad ? 1 : 0);
