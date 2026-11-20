// 1.0 : les habitants des villes et leur journée — marchands à leur étal, matelots sur les quais, flâneurs,
// le guet et ses lanternes la nuit ; le soir on se retrouve devant les tavernes, on chante, on danse ;
// la nuit, chacun rentre chez soi. Tout se passe chez le client : un décor vivant, sans coût pour le serveur.
import { moveWithCollision, zoneAt, Z } from '../shared/world.js';
import { TILE, T, dayFrac } from '../shared/constants.js';
import { mulberry32 } from '../shared/rng.js';
import { CLOTH_KEYS } from './render/sprites-chars.js';

const dirOf = (dx, dy) => (Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0));
// les villes peuplées : zone, nombre d'habitants
const CITIES = [[Z.TOWN, 12], [Z.LIBERTALIA, 30], [Z.RADE, 8], [Z.HAVRE, 6], [Z.ANSE, 4]];
const ROLES = ['marchand', 'matelot', 'matelot', 'flaneur', 'flaneur', 'marchand', 'guet'];
// heures : f = 0 → 7h ; 19h → 0,5 ; 23h → 0,667 ; 5h → 0,917
export function phaseOf(f) { return f < 0.5 ? 'jour' : f < 0.667 ? 'soir' : f < 0.917 ? 'nuit' : 'aube'; }
const LINES = {
  jour: ['Poisson frais ! Tout frais du matin !', 'Il paraît que le Kraken s’est réveillé…', 'Ma cargaison de rhum est enfin arrivée.', 'Deux doublons la livre, pas un de moins !', 'Tu as vu le galion qui mouille dans la rade ?', 'Les morts ne viennent pas jusqu’ici, la Flamme veille.', 'Encore une prime affichée à la Capitainerie.', 'Mon cousin a vu une sirène, je te jure.', 'Belle journée pour lever l’ancre !', 'Fais attention aux crabes sur la plage.'],
  soir: ['Une chope de plus, tavernier !', 'Chante, matelot, chante !', 'À la santé des vivants !', 'Yo-ho, yo-ho…', 'Qui paie la tournée ?', 'Encore une histoire de trésor ? Raconte !', 'Les lanternes sont allumées, la ville est belle.', 'Demain on prend la mer, ce soir on boit.'],
  nuit: ['Tout est calme…', 'Qui va là ?', 'Douze coups, et tout va bien !', 'Rentrez chez vous, il est tard.', 'Les morts rôdent hors des murs, restez en ville.'],
  aube: ['Déjà l’aube…', 'Les pêcheurs sont partis.', 'Le café, vite.', 'Encore une nuit sans attaque, Dieu merci.'],
};
const PUB = ['À la tienne !', 'Encore une tournée !', 'Ha ! Ha ! Ha !', 'Tu triches, j’en suis sûr.', 'Un rhum, Rosalie !', 'Et le kraken, tu l’as vu, toi ?', 'Chut… on nous écoute.', 'Je te dis qu’il était grand comme une goélette !', 'À la santé des vivants !'];
const GREET = ['Bonjour, capitaine !', 'Bon vent !', 'Belle lame que vous avez là.', 'Bienvenue en ville.', 'Tiens, un nouveau visage.'];

export class Townsfolk {
  constructor(G) {
    this.G = G; this.folk = G.folk; this.cats = G.cats; this.streets = new Map(); this.talkAt = 0;
    const W = G.world, rng = mulberry32(4242);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    // les rues : pavés (et chemins) de chaque ville
    for (const [z] of CITIES) this.streets.set(z, []);
    for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
      const i = y * W.W + x, z = W.zones[i];
      const list = this.streets.get(z);
      if (!list || W.solid[i]) continue;
      const t = W.tiles[i];
      if (t === T.COBBLE || t === T.PLANK || t === T.DIRT || (z !== Z.TOWN && z !== Z.LIBERTALIA && t === T.SAND)) list.push([x * TILE + 8, y * TILE + 10]);
    }
    // les portes : chez soi (maisons), et le soir (tavernes, auberges)
    const doorsOf = (z) => W.doors.filter((d) => !d.secret && !d.jail && zoneAt(W, d.ox, d.oy) === z);
    let id = 0;
    for (const [z, n] of CITIES) {
      const st = this.streets.get(z); if (!st || st.length < 10) continue;
      const doors = doorsOf(z), homes = doors.filter((d) => d.kind === 'house' || d.plot != null || d.kind === 'home'), pubs = doors.filter((d) => ['tavern', 'auberge', 'tripot', 'velours'].includes(d.kind));
      const near = (pt) => st.filter(([x, y]) => Math.abs(x - pt[0]) < 120 && Math.abs(y - pt[1]) < 90);
      for (let i = 0; i < n; i++) {
        const role = i === 0 || i === 1 && n > 8 ? 'guet' : pick(ROLES);
        const [x, y] = pick(st);
        const look = { skin: Math.floor(rng() * 4), hair: Math.floor(rng() * 7), hairStyle: pick(['court', 'long', 'queue', 'chauve', 'hirsute', 'court']), top: role === 'guet' ? 'manteau' : pick(['chemise', 'rayee', 'gilet', 'manteau', 'vareuse', 'tablier']), topCol: role === 'guet' ? 'navy' : pick(CLOTH_KEYS), pants: pick(['brown', 'navy', 'black', 'white']), boots: pick(['brown', 'black']), hat: role === 'guet' ? 'tricorne' : pick([null, 'tricorne', 'bandana', 'foulard', 'paille', 'bonnet', null]), hatCol: role === 'guet' ? 'black' : pick(['red', 'black', 'navy', 'green', 'purple', 'yellow']), beard: rng() < 0.35 ? 1 + Math.floor(rng() * 2) : 0, eye: rng() < 0.08 ? 'patch' : undefined };
        const home = homes.length ? pick(homes) : null, pub = pubs.length ? pick(pubs) : null;
        const post = pick(st);
        this.folk.push({ k: 'f', id: -100 - id++, x, y, tx: x, ty: y, dir: 0, moving: false, walk: 0, wait: rng() * 4, look, lookKey: JSON.stringify(look), weapon: null,
          role, city: z, home: home ? [home.ox, home.oy + 4] : post, pub: pub ? [pub.ox + (rng() - 0.5) * 50, pub.oy + 14 + rng() * 26] : post, post, postNear: near(post), lantern: false, hidden: false, sing: rng() < 0.4 });
      }
      for (let c = 0; c < (z === Z.LIBERTALIA ? 4 : z === Z.TOWN ? 3 : 1); c++) { const [cx, cy] = pick(st); this.cats.push({ col: pick(['orange', 'black', 'white']), x: cx, y: cy, tx: cx, ty: cy, dir: 2, moving: false, wait: rng() * 5 }); }
    }
    this.seatPatrons(); // lot 4 (après les autres : les habitants d'avant ne changent pas)
  }
  // lot 4 : la taverne vivante — des habitués attablés dans les tavernes et les auberges, plus nombreux le soir.
  // Une table où un personnage attend assis (Silas, à la Sirène Borgne) reste à lui.
  seatPatrons() {
    const W = this.G.world, rng = mulberry32(777), pick = (a) => a[Math.floor(rng() * a.length)];
    this.patrons = [];
    for (const r of W.rooms) {
      if (r.kind !== 'tavern' && r.kind !== 'auberge') continue;
      const inR = (o) => o.x >= r.x0 * TILE && o.x < (r.x0 + r.w) * TILE && o.y >= r.y0 * TILE && o.y < (r.y0 + r.h) * TILE;
      const held = W.npcs.filter((n) => n.sit && inR(n));
      for (const ch of W.props) {
        if (ch.type !== 'chaise' || !inR(ch) || held.some((n) => Math.abs(n.y - ch.y) < 8 && Math.abs(n.x - ch.x) <= 2 * TILE + 4)) continue;
        const look = { skin: Math.floor(rng() * 4), hair: Math.floor(rng() * 7), hairStyle: pick(['court', 'long', 'queue', 'chauve', 'hirsute']), beard: rng() < 0.4 ? 1 + Math.floor(rng() * 2) : 0, top: pick(['chemise', 'rayee', 'gilet', 'vareuse', 'manteau']), topCol: pick(CLOTH_KEYS), pants: pick(['brown', 'navy', 'black']), boots: pick(['brown', 'black']), hat: pick([null, null, 'bandana', 'tricorne', 'bonnet', 'foulard']), hatCol: pick(CLOTH_KEYS) };
        const f = { k: 'f', id: -5000 - this.patrons.length, x: ch.x, y: ch.y, dir: ch.v ? 1 : 2, dir0: ch.v ? 1 : 2, moving: false, walk: 0, look, lookKey: JSON.stringify(look), weapon: null,
          sitUntil: Infinity, patron: true, room: r.id, seat: `${r.id}:${Math.floor(ch.x / TILE) - r.x0},${Math.floor(ch.y / TILE) - r.y0}`, stay: rng(), hidden: true };
        this.folk.push(f); this.patrons.push(f);
      }
    }
  }
  updatePatrons(now, ph) {
    const G = this.G;
    if (G.cinema && G.cinema.on) return; // pendant une scène, la salle ne change pas
    const share = ph === 'soir' ? 0.95 : ph === 'nuit' ? 0.7 : ph === 'jour' ? 0.45 : 0.15;
    let here = null;
    for (const f of this.patrons) {
      f.hidden = f.stay > share;
      if (!f.hidden && f.room === G.room) (here || (here = [])).push(f);
    }
    if (here && now > (this.pubTalkAt || 0)) {
      this.pubTalkAt = now + 4 + Math.random() * 5;
      const f = here[Math.floor(Math.random() * here.length)];
      const mate = here.find((o) => o !== f && Math.abs(o.y - f.y) < 4 && Math.abs(o.x - f.x) < 40);
      if (mate && Math.random() < 0.5) { f.dir = mate.x < f.x ? 1 : 2; setTimeout(() => { f.dir = f.dir0; }, 3200); }
      this.say(f, PUB);
      if (Math.random() < 0.3) setTimeout(() => G.sfx.play('laugh', 0.35), 900);
    }
  }
  // où doit être cet habitant, à cette heure ?
  goal(f, ph) {
    if (f.role === 'guet') return ph === 'nuit' || ph === 'soir' ? 'ronde' : ph === 'jour' ? 'rue' : 'maison';
    if (ph === 'nuit') return f.role === 'matelot' && f.sing ? 'taverne' : 'maison';
    if (ph === 'soir') return f.role === 'marchand' && !f.sing ? 'maison' : 'taverne';
    if (ph === 'aube') return f.role === 'marchand' ? 'etal' : 'maison';
    return f.role === 'marchand' ? 'etal' : 'rue';
  }
  update(dt, now) {
    const G = this.G, p = G.player;
    if (!p) return;
    const f0 = dayFrac(G.worldTime || 0), ph = phaseOf(f0);
    const street = (f) => this.streets.get(f.city);
    const fo = G.viewFocus || p; // lot 4 : une cinématique peut regarder ailleurs que le joueur
    if (this.patrons) this.updatePatrons(now, ph);
    for (const f of this.folk) {
      if (f.cine || f.patron) continue; // les acteurs d'une scène et les habitués attablés ont leur propre vie
      if (Math.abs(f.x - fo.x) > 900 || Math.abs(f.y - fo.y) > 700) continue; // loin des regards : rien ne bouge
      const g = this.goal(f, ph);
      f.lantern = f.role === 'guet' && (ph === 'nuit' || ph === 'soir');
      if (f.hidden) { if (g !== 'maison') { f.hidden = false; f.x = f.home[0]; f.y = f.home[1]; f.tx = f.x; f.ty = f.y + 12; f.wait = 0; } else continue; }
      if (f.wait > 0) { f.wait -= dt; f.moving = false; continue; }
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
      if (d < 3) { // arrivé : rentrer, attendre, choisir le prochain pas selon l'heure
        if (g === 'maison' && Math.hypot(f.x - f.home[0], f.y - f.home[1]) < 14) { f.hidden = true; continue; }
        let next;
        if (g === 'maison') next = f.home;
        else if (g === 'taverne') next = Math.hypot(f.x - f.pub[0], f.y - f.pub[1]) > 40 ? f.pub : [f.pub[0] + (Math.random() - 0.5) * 40, f.pub[1] + (Math.random() - 0.5) * 20];
        else if (g === 'etal') next = Math.hypot(f.x - f.post[0], f.y - f.post[1]) > 40 ? f.post : (f.postNear[Math.floor(Math.random() * f.postNear.length)] || f.post);
        else { const st = street(f).filter(([x, y]) => Math.abs(x - f.x) < (g === 'ronde' ? 220 : 150) && Math.abs(y - f.y) < (g === 'ronde' ? 160 : 100)); next = st[Math.floor(Math.random() * st.length)] || [f.x, f.y]; }
        f.tx = next[0]; f.ty = next[1];
        f.wait = g === 'etal' ? 3 + Math.random() * 7 : g === 'taverne' ? 2 + Math.random() * 6 : g === 'ronde' ? 0.5 + Math.random() * 2 : 1.5 + Math.random() * 5;
        if (g === 'taverne' && ph === 'soir' && Math.random() < 0.25) f.danceUntil = now + 3 + Math.random() * 3; // on danse devant la taverne
        continue;
      }
      const sp = (g === 'maison' ? 30 : g === 'ronde' ? 20 : 22) * dt;
      const [nx, ny] = moveWithCollision(G.world, f.x, f.y, dx / d * sp, dy / d * sp);
      if (Math.hypot(nx - f.x, ny - f.y) < sp * 0.2) { f.stuck = (f.stuck || 0) + 1; if (f.stuck > 30) { f.stuck = 0; f.tx = f.x; f.ty = f.y; if (g === 'maison') { f.hidden = true; } } } else f.stuck = 0;
      f.x = nx; f.y = ny; f.moving = true; f.walk = (f.walk || 0) + dt; f.dir = dirOf(dx, dy);
    }
    // les chats
    for (const c of this.cats) {
      if (Math.abs(c.x - p.x) > 900 || Math.abs(c.y - p.y) > 700) continue;
      if (c.wait > 0) { c.wait -= dt; c.moving = false; continue; }
      const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy);
      if (d < 2) { c.wait = 3 + Math.random() * 10; const st = [...this.streets.values()].flat().filter(([x, y]) => Math.abs(x - c.x) < 120 && Math.abs(y - c.y) < 90); const n = st[Math.floor(Math.random() * st.length)] || [c.x, c.y]; c.tx = n[0]; c.ty = n[1]; continue; }
      const sp = 30 * dt, [nx, ny] = moveWithCollision(G.world, c.x, c.y, dx / d * sp, dy / d * sp);
      if (Math.hypot(nx - c.x, ny - c.y) < sp * 0.2) { c.tx = c.x; c.ty = c.y; }
      c.x = nx; c.y = ny; c.moving = true; c.dir = dx < 0 ? 1 : 2;
    }
    // les conversations : deux habitants proches s'arrêtent et causent ; un passant salue le joueur
    if (now > this.talkAt) {
      this.talkAt = now + 2.5 + Math.random() * 3;
      const vis = this.folk.filter((f) => !f.hidden && !f.cine && !f.patron && Math.abs(f.x - p.x) < 260 && Math.abs(f.y - p.y) < 170);
      for (const a of vis) {
        const b = vis.find((o) => o !== a && Math.hypot(o.x - a.x, o.y - a.y) < 28);
        if (!b || Math.random() < 0.5) continue;
        a.wait = b.wait = 3.5; a.moving = b.moving = false;
        a.dir = dirOf(b.x - a.x, b.y - a.y); b.dir = dirOf(a.x - b.x, a.y - b.y);
        this.say(a, LINES[ph]);
        setTimeout(() => { if (!b.hidden) this.say(b, LINES[ph]); }, 1700);
        break;
      }
      const close = vis.find((f) => Math.hypot(f.x - p.x, f.y - p.y) < 30 && !f.moving);
      if (close && Math.random() < 0.35) {
        close.dir = dirOf(p.x - close.x, p.y - close.y);
        this.say(close, G.me && G.me.wd ? ['Un forban ! Où est la garde ?', 'C’est lui, l’homme de l’affiche !', 'Ne me faites pas de mal…'] : ph === 'nuit' && close.role === 'guet' ? ['Bonne nuit, capitaine. Restez dans les murs.'] : GREET);
      }
    }
  }
  say(f, lines) {
    const text = lines[Math.floor(Math.random() * lines.length)];
    this.G.renderer.addFx({ kind: 'bubble', text, follow: () => f, dur: 3.2, h: 34 });
  }
}
