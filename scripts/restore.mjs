// Restauration d'une sauvegarde (serveur ARRÊTÉ).
//   node scripts/restore.mjs                       liste les instantanés disponibles
//   node scripts/restore.mjs <instantané>          restaure tout (comptes + monde)
//   node scripts/restore.mjs <instantané> <pirate> restaure un seul pirate
// L'état actuel est d'abord copié dans un instantané « avant-restauration » : rien n'est perdu.
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { FileStorage } from '../server/db.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const BK = path.join(DATA, 'backups');
const [snap, who] = process.argv.slice(2);
const list = (await fs.readdir(BK).catch(() => [])).sort();
if (!snap) {
  console.log(list.length ? 'Instantanés :\n' + list.map((n) => '  ' + n).join('\n') : 'Aucun instantané.');
  process.exit(0);
}
if (!list.includes(snap)) { console.error('Instantané introuvable :', snap); process.exit(1); }
const store = new FileStorage(DATA);
await store.ready;
console.log('Copie de l’état actuel :', await store.snapshot('avant-restauration'));
const src = path.join(BK, snap);
if (who) {
  const f = crypto.createHash('sha1').update(who.toLowerCase()).digest('hex') + '.json';
  await fs.copyFile(path.join(src, 'accounts', f), path.join(DATA, 'accounts', f));
  console.log(`Pirate « ${who} » restauré depuis ${snap}.`);
} else {
  await fs.cp(path.join(src, 'accounts'), path.join(DATA, 'accounts'), { recursive: true });
  await fs.copyFile(path.join(src, 'world.json'), path.join(DATA, 'world.json')).catch(() => {});
  console.log(`Comptes et monde restaurés depuis ${snap}.`);
}
