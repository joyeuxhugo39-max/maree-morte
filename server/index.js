// Serveur HTTP (fichiers du client) + WebSocket (jeu) sur le même port.
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const server = http.createServer((req, res) => {
  let url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/' || url === '') url = '/client/index.html';
  if (url === '/sante' || url === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, joueurs: game.players.size })); return; }
  const file = path.normalize(path.join(ROOT, url));
  const allowed = PUBLIC.some((dir) => file.startsWith(dir + path.sep)) || file === path.join(ROOT, 'server', 'game.js');
  if (!allowed) { res.writeHead(404); res.end('Introuvable'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Introuvable'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const game = new Game({ storage: new FileStorage(DATA), log: (...a) => console.log(new Date().toISOString().slice(11, 19), ...a) });
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4096 });

wss.on('connection', (ws, req) => {
  if (wss.clients.size > MAX_PLAYERS) { ws.close(1013, 'Serveur plein'); return; }
  const conn = {
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

function shutdown() {
  console.log('Arrêt : sauvegarde des pirates…');
  game.saveAll();
  setTimeout(() => process.exit(0), 800);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => console.log(`⚓ Marée Morte en ligne sur http://localhost:${PORT}`));
