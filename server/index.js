// Serveur HTTP (fichiers du client) + WebSocket (jeu) sur le même port.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { Game } from './game.js';
import { FileStorage } from './db.js';
import { TICK_RATE } from '../shared/constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = +process.env.PORT || 3000;
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const MAX_PLAYERS = +process.env.MAX_PLAYERS || 200;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const PUBLIC = [path.join(ROOT, 'client'), path.join(ROOT, 'shared')];

const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';
// 1.0 : console d'administration — désactivée sans ADMIN_TOKEN ; jeton comparé en temps constant ; essais limités
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const adminFails = new Map();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
function adminOk(req) {
  if (!ADMIN_TOKEN) return false;
  const ip = ipOf(req), f = adminFails.get(ip) || { n: 0, until: 0 };
  if (f.until > Date.now()) return false;
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const ok = crypto.timingSafeEqual(sha(got), sha(ADMIN_TOKEN));
  if (!ok) { f.n++; if (f.n >= 5) { f.until = Date.now() + 15 * 60000; f.n = 0; } adminFails.set(ip, f); }
  return ok;
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
async function adminApi(req, res, cmd, q) {
  if (!adminOk(req)) return json(res, 403, { err: ADMIN_TOKEN ? 'jeton refusé' : 'administration désactivée (ADMIN_TOKEN absent)' });
  let body = {};
  if (req.method === 'POST') { let raw = ''; for await (const c of req) { raw += c; if (raw.length > 8192) break; } try { body = JSON.parse(raw || '{}'); } catch (e) { body = {}; } }
  try {
    if (cmd === 'journal') return json(res, 200, await storage.readJournal(q.get('day'), q.get('q') || ''));
    if (cmd === 'accounts') return json(res, 200, await storage.listAccounts(q.get('q') || ''));
    if (cmd === 'snapshots') return json(res, 200, await storage.listSnapshots());
    if (cmd === 'snapshot' && req.method === 'POST') return json(res, 200, { ok: true, name: await storage.snapshot('admin') });
    if (cmd === 'restore' && req.method === 'POST') {
      const key = String(body.name || '').toLowerCase();
      if ([...game.players.values()].some((p) => p.key === key)) return json(res, 409, { err: 'le pirate est connecté : expulsez-le d’abord' });
      await storage.restoreAccount(String(body.snapshot || ''), key); game.audit('admin', { cmd: 'restore', a: body }); return json(res, 200, { ok: true });
    }
    const out = await game.admin(cmd, req.method === 'POST' ? body : Object.fromEntries(q));
    return json(res, out && out.err ? 400 : 200, out);
  } catch (e) { return json(res, 500, { err: e.message }); }
}

const server = http.createServer((req, res) => {
  const full = new URL(req.url || '/', 'http://x');
  if (full.pathname.startsWith('/admin/api/')) { adminApi(req, res, full.pathname.slice(11), full.searchParams); return; }
  if (full.pathname === '/admin') { fs.readFile(path.join(ROOT, 'server', 'admin.html'), (e, d) => { res.writeHead(e ? 404 : 200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(e ? 'Introuvable' : d); }); return; }
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/' || url === '') url = '/client/index.html';
  if (url === '/sante' || url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify({ ok: true, joueurs: game.players.size, version: game.version || null, maintenance: game.maintenance || null })); return; }
  const file = path.normalize(path.join(ROOT, url));
  const allowed = PUBLIC.some((dir) => file.startsWith(dir + path.sep)) || file === path.join(ROOT, 'server', 'game.js');
  if (!allowed) { res.writeHead(404); res.end('Introuvable'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const storage = new FileStorage(DATA);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
// 1.0 : un instantané avant tout démarrage (donc avant chaque déploiement), puis toutes les heures
await storage.snapshot('demarrage').then((n) => log('[sauvegarde] instantané', n)).catch((e) => log('[sauvegarde] instantané impossible', e.message));
const game = new Game({ storage, log });
setInterval(() => { storage.snapshot().then((n) => log('[sauvegarde] instantané', n)).catch((e) => log('[sauvegarde] instantané impossible', e.message)); }, 3600 * 1000);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

wss.on('connection', (ws, req) => {
  if (wss.clients.size > MAX_PLAYERS) { ws.close(1013, 'Serveur plein'); return; }
  const conn = {
    ip: ipOf(req),
    send: (o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); },
    close: () => ws.close(),
  };
  game.addClient(conn);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (data) => {
    let m;
    try { m = JSON.parse(data); } catch (e) { return; }
    game.onMessage(conn, m);
  });
  ws.on('close', () => game.removeClient(conn));
  ws.on('error', () => {});
});

// détecte les connexions mortes
setInterval(() => {
  for (const ws of wss.clients) { if (!ws.isAlive) { ws.terminate(); continue; } ws.isAlive = false; try { ws.ping(); } catch (e) { /* */ } }
}, 15000);

// boucle de jeu à pas fixe
let last = performance.now(), acc = 0;
const STEP = 1000 / TICK_RATE;
setInterval(() => {
  const now = performance.now();
  acc += Math.min(250, now - last); last = now;
  while (acc >= STEP) { game.tick(); acc -= STEP; }
}, STEP / 2);

let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true;
  console.log('Arrêt : sauvegarde des pirates…');
  const limit = new Promise((r) => setTimeout(r, 10000)); // au pire dix secondes
  await Promise.race([Promise.resolve(game.saveAll()).catch(() => {}), limit]);
  console.log('Sauvegardes écrites. Bon vent.');
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`⚓ Marée Morte en ligne sur http://localhost:${PORT}`));
