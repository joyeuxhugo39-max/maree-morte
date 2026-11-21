// Monde vivant, lot 2 : l'outil de vérification visuelle. Une surcouche de contrôle, activée par « ?vue=1 » dans
// l'adresse (puis F9 pour l'afficher ou la masquer). Rien ici ne change le jeu : on regarde.
//  - la grille des tuiles et les cases bloquantes ;
//  - le point d'ancrage (le pied) et la boîte de collision (10 × 5 px) des personnages ;
//  - le pied des décors (l'ordre de profondeur se fait sur lui) ;
//  - la routine des habitants : rôle, activité, destination ;
//  - les sources de lumière et leur portée ;
//  - en haut à gauche : le coût du rendu et ce qui est actif à l'écran.
import { TILE, MAP_W } from '../../shared/constants.js';

export function vueWanted() {
  try { return new URLSearchParams(location.search).get('vue') === '1'; } catch (e) { return false; }
}

const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

export function drawVue(ctx, G, R, camX, camY, W, H, props) {
  const world = G.world, room = G.room >= 0 ? world.rooms[G.room] : null;
  ctx.save();
  // la grille et les cases bloquantes
  const tx0 = Math.max(0, Math.floor(camX / TILE)), ty0 = Math.max(0, Math.floor(camY / TILE));
  const tx1 = Math.floor((camX + W) / TILE), ty1 = Math.floor((camY + H) / TILE);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
    const i = ty * MAP_W + tx, x = tx * TILE - camX, y = ty * TILE - camY;
    if (world.solid[i] === 1) { ctx.fillStyle = 'rgba(255,40,60,0.30)'; ctx.fillRect(x, y, TILE, TILE); }
    else if (world.solid[i] === 2) { ctx.fillStyle = 'rgba(60,140,255,0.14)'; ctx.fillRect(x, y, TILE, TILE); } // l'eau
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let tx = tx0; tx <= tx1 + 1; tx++) { const x = tx * TILE - camX + 0.5; ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let ty = ty0; ty <= ty1 + 1; ty++) { const y = ty * TILE - camY + 0.5; ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // le pied des décors
  ctx.fillStyle = 'rgba(255,220,80,0.9)';
  for (const p of props) { if (!p.spr) continue; ctx.fillRect(Math.round(p.x - camX) - 1, Math.round(p.y - camY), 3, 1); }
  // les personnages : pied et boîte de collision
  const box = (o, col) => {
    const x = Math.round(o.x - camX), y = Math.round(o.y - camY);
    ctx.strokeStyle = col; ctx.strokeRect(x - 5 + 0.5, y - 5 + 0.5, 10, 5);
    ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
  };
  for (const e of G.ents.values()) if (e.k === 'p' || e.k === 'm') box(e, e.k === 'p' ? 'rgba(120,255,160,0.9)' : 'rgba(255,120,120,0.9)');
  if (G.player) box(G.player, 'rgba(120,255,255,1)');
  for (const n of G.npcs || []) if (!n.hidden) box(n, 'rgba(255,200,120,0.9)');
  // la routine des habitants
  ctx.font = '5px monospace'; ctx.textAlign = 'center';
  let folkOn = 0, talking = 0;
  for (const f of G.folk || []) {
    if (f.hidden || f.patron && f.room !== G.room) continue;
    if (Math.abs(f.x - camX - W / 2) > W || Math.abs(f.y - camY - H / 2) > H) continue;
    folkOn++;
    box(f, 'rgba(200,170,255,0.9)');
    const x = Math.round(f.x - camX), y = Math.round(f.y - camY);
    if (f.tx != null && Math.hypot(f.tx - f.x, f.ty - f.y) > 3) { ctx.strokeStyle = 'rgba(200,170,255,0.45)'; ctx.beginPath(); ctx.moveTo(x + 0.5, y + 0.5); ctx.lineTo(Math.round(f.tx - camX) + 0.5, Math.round(f.ty - camY) + 0.5); ctx.stroke(); }
    if (f.talk) talking++;
    const label = [f.role || (f.patron ? 'habitué' : ''), f.act || f.goal || '', f.talk ? '💬' : ''].filter(Boolean).join(' · ');
    if (label) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; const w = ctx.measureText(label).width + 4; ctx.fillRect(x - w / 2, y + 2, w, 7); ctx.fillStyle = '#e8dcff'; ctx.fillText(label, x, y + 7); }
  }
  // les lumières
  let lights = 0;
  for (const l of R.lights || []) {
    if (l.x < camX - 80 || l.x > camX + W + 80 || l.y < camY - 80 || l.y > camY + H + 80) continue;
    lights++;
    ctx.strokeStyle = l.c === 'cold' ? 'rgba(140,200,255,0.35)' : 'rgba(255,190,90,0.35)';
    ctx.beginPath(); ctx.arc(Math.round(l.x - camX), Math.round(l.y - camY), l.r || 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(l.x - camX), Math.round(l.y - camY), 1, 1);
  }
  // le bilan
  const st = R.vueStats || {};
  const lines = [
    `rendu ${f1(st.ms || 0)} ms (moy. ${f1(st.avg || 0)}, pire ${f1(st.max || 0)})`,
    `échelle × ${R.scale} · ${W} × ${H} px de monde${room ? ' · ' + room.name : ''}`,
    `décors ${props.length} · entités ${G.ents.size} · habitants ${folkOn} (${talking} en conversation)`,
    `lumières ${lights} · particules ${(R.parts || []).length} · effets ${(R.fx || []).length}`,
  ];
  ctx.textAlign = 'left'; ctx.font = '6px monospace';
  const by = Math.round(H * 0.22); // sous les jauges du joueur
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(2, by, 168, 4 + lines.length * 8);
  ctx.fillStyle = '#d8ffe0'; lines.forEach((s, k) => ctx.fillText(s, 5, by + 7 + k * 8));
  ctx.restore();
}
