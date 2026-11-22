// Lot 6 : La Nuit des Mille Voiles, côté client. Le serveur décide de tout ; ici, on montre et on demande :
//  - le décor qui s'allume pendant une édition (fanions de mât en mât, foule, musiciens, danseurs) ;
//  - les épreuves : la visée du canon, les cibles calculées comme sur le serveur, la taverne de Barnabé (dés, chopes,
//    bouchon), le chrono et les obstacles du gabier, la Lice ;
//  - la course : le compte à rebours, la bouée suivante (une flèche, une distance), la brume, les courants, l'arrivée ;
//  - le spectacle de la nuit, les feux d'artifice (les siens aussi), le carnet, la boutique, la garde-robe, le classement.
import { EPREUVES, EP_ORDER, SHOP, SHOP_BY, SECRETS, CANON, TAV, GABIER, RACE, MIRA, VARIANTS, FEST_NPC_LINES, FEST_CROWD_LINES, CHAMPIONS, CURRENTS, FOG, TOK, CLUES, SHOW } from '../shared/data/festival.js';
import { canonTargets, targetAt, gabBarrels, gabBoom, BARREL_R } from '../shared/fest-sim.js';
import { CINE_LINES } from './cinema.js';
import { registerIcons, iconURL } from './render/sprites-items.js';
import { TILE } from '../shared/constants.js';
import { canStand } from '../shared/world.js';
import { dry } from './townsfolk.js';

Object.assign(CINE_LINES, { mira_welcome: MIRA.welcome });
registerIcons({
  fusee(pb) { pb.rect(7, 3, 3, 9, 0xc0302e); pb.rect(7, 3, 1, 9, 0xe8564a); pb.set(8, 2, 0xf2c14a); pb.set(8, 1, 0xfff2b0); pb.vl(8, 12, 3, 0x8a6a3a); pb.set(6, 11, 0xf2c14a); pb.set(10, 11, 0xf2c14a); pb.set(9, 14, 0xff8a4a); },
  jeton(pb) { pb.disc(8, 8, 6, 0xb07a22); pb.disc(8, 8, 5, 0xe0a83a); pb.disc(8, 8, 3.2, 0xf6d070); pb.vl(8, 5, 6, 0xb07a22); pb.hl(5, 8, 6, 0xb07a22); pb.set(6, 5, 0xfff2c0); },
});

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nowS = () => performance.now() / 1000;
const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const FACES = '⚀⚁⚂⚃⚄⚅';
const CHOPES = [['Ambre', '#e8a020'], ['Rubis', '#d2402a'], ['Émeraude', '#2e9a5a'], ['Saphir', '#3a6ad0']];
const FW_COLS = [['#ff5a4a', '#ffd0a0', 'red'], ['#ffd24a', '#fff6c0', 'warm'], ['#6ab8ff', '#e0f4ff', 'cold'], ['#7ae07a', '#e0ffe0', 'green'], ['#e88aff', '#ffe0ff', 'purple'], ['#ff9a3a', '#ffffff', 'white']];
const BUNTING = ['#e8564a', '#f2c14a', '#5a8ad6', '#7ae07a', '#e88aff', '#f6efe0'];
const EMO_KEYS = { 6: 'gigue', 7: 'feu', 8: 'confettis', 9: 'reverence' };
const LOOKS = { top: ['chemise', 'gilet', 'rayee', 'vareuse', 'tablier', 'capitaine'], hat: ['bandana', 'bonnet', 'tricorne', 'foulard', 'paille', 'plume', null, null], col: ['red', 'navy', 'green', 'brown', 'purple', 'yellow', 'teal', 'orange', 'white'], hair: ['court', 'long', 'queue', 'hirsute', 'chauve'] };
const r01 = (k) => { let h = (k * 374761393) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export class Festival {
  constructor(G) {
    this.G = G; this.F = G.world.fest; this.st = { open: 0, tok: 0, st: {}, best: {}, own: [], eq: {}, sec: [], boards: {} };
    this.rounds = new Map(); this.balls = []; this.fw = []; this.rockets = []; this.blooms = []; this.crowd = []; this.gab = null; this.race = null; this.show = null; this.tav = null; this.tab = 'carnet';
    G.festOn = false;
    this.makeCrowd(); this.makeDom();
  }
  get on() { return !!this.st.open; }
  // ------------------------------------------------------------ la foule du festival (de simples figurants, dessinés comme les habitants)
  makeCrowd() {
    const G = this.G, F = this.F, st = F.stage, out = [];
    const look = (k) => { const c = (j) => LOOKS.col[Math.floor(r01(k * 7 + j) * LOOKS.col.length)]; const hat = LOOKS.hat[Math.floor(r01(k * 5 + 3) * LOOKS.hat.length)];
      return { skin: Math.floor(r01(k * 3) * 4), hair: Math.floor(r01(k * 11) * 6), hairStyle: LOOKS.hair[Math.floor(r01(k * 13) * 5)], beard: r01(k * 17) < 0.3 ? 1 : 0, top: LOOKS.top[Math.floor(r01(k * 19) * LOOKS.top.length)], topCol: c(1), pants: c(2), boots: 'brown', ...(hat ? { hat, hatCol: c(4) } : {}) }; };
    const add = (role, x, y, dir) => { const k = out.length + 1, L = look(k + 40); out.push({ k: 'f', id: -8000 - k, x, y, ox: x, oy: y, dir, moving: false, walk: 0, look: L, lookKey: JSON.stringify(L), weapon: null, crowd: 1000 + k, role, hidden: true, wait: r01(k) * 4 }); };
    for (let i = 0; i < 3; i++) add('musicien', st.x0 + 28 + i * 26, st.y0 + 20, 0); // sur la scène
    for (let i = 0; i < 8; i++) add('danseur', st.x0 + 10 + (i % 4) * 24, st.y1 + 12 + Math.floor(i / 4) * 16, i % 2 ? 1 : 2); // devant la scène
    // 1.9.1 : sur le quai de pierre, face à la mer (l'ancienne jetée, en y 124, est devenue de l'eau profonde avec le port de la 1.8)
    const spot = (x, y) => { for (let r = 0; r <= 40; r += 4) for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, px = x + Math.cos(a) * r, py = y - Math.abs(Math.sin(a)) * r; if (canStand(G.world, px, py) && dry(G.world, px, py)) return [px, py]; } return [x, y - 40]; };
    for (let i = 0; i < 6; i++) { const [bx, by] = spot((141 + i * 3) * TILE + 8, 119 * TILE + 10 + (i % 2) * 6); add('badaud', bx, by, 0); }
    for (let i = 0; i < 6; i++) { const [fx, fy] = spot((130 + i * 6) * TILE + 8, (109 + (i % 3) * 3) * TILE + 8); add('flaneur', fx, fy, i % 4); } // entre les stands (1.9.1 : jamais dans un mur)
    for (const f of out) G.folk.push(f);
    this.crowd = out;
  }
  // ------------------------------------------------------------ l'état envoyé par le serveur
  onMsg(m) {
    const G = this.G, ui = G.ui, now = nowS();
    switch (m.a) {
      case 'etat': {
        const was = this.on;
        this.st = m; G.festOn = !!m.open;
        if (was !== this.on) { G.refreshNpcs && G.refreshNpcs(); for (const f of this.crowd) f.hidden = !this.on; }
        if (m.show && !this.show) this.startShow(m.show.seed, m.show.el, m.show.dur, m.show.id);
        if (this.panelOpen()) this.renderPanel();
        return;
      }
      case 'gain': ui.toast(`+${m.n} jeton${m.n > 1 ? 's' : ''} du festival — ${m.why}`, 'quest', iconURL('jeton')); G.sfx.play('coin', 0.6); this.st.tok = m.tok; if (this.panelOpen()) this.renderPanel(); return;
      case 'canon': {
        const c = this.F.cannons[m.k];
        const r = { k: m.k, seed: m.seed, v: m.v, t0: now + m.wait, dur: m.dur, pid: m.pid, name: m.name, hits: new Set(), score: 0, mine: m.pid === G.myId, targets: canonTargets(m.v, m.seed, c.lane) };
        this.rounds.set(m.k, r);
        if (r.mine) { ui.toast('Le concours de canonniers commence dans trois secondes : visez à la souris, cliquez pour tirer.', 'quest'); G.sfx.play('horn', 0.5); }
        return;
      }
      case 'canonfin': { const r = this.rounds.get(m.k); if (r) { if (r.mine) G.sfx.play('victory', 0.4); this.rounds.delete(m.k); } return; }
      case 'impact': {
        const r = this.rounds.get(m.k), R = G.renderer;
        if (m.hit >= 0) { if (r) { r.hits.add(m.hit); r.score = m.score; } R.burst(m.x, m.y, 18, { z: 4, col: ['#8a5a30', '#c8964a', '#f2e0b0'], up: 60, speed: 40, life: 0.7 }); R.text(m.x, m.y - 10, `+${m.pts}`, '#ffd24a', true); G.sfx.play('crack', 0.7); }
        else { R.burst(m.x, m.y, 14, { z: 2, col: ['#bfefff', '#ffffff', '#7ab8e0'], up: 70, speed: 18, life: 0.6 }); G.sfx.play('splash', 0.5); }
        return;
      }
      case 'tresor': {
        if (m.start) ui.toast(`Mira vous confie la carte de sa grand-mère. Premier indice : « ${m.riddle} »`, 'quest');
        if (m.clue) ui.toast(`${m.by ? m.by + ' a trouvé l’indice. ' : ''}Gravé sur ${m.clue.at} : ${m.clue.sym}, et le chiffre ${m.clue.num}. ${m.i < m.n ? `Indice suivant : « ${m.riddle} »` : `Le coffre : « ${m.riddle} »`}`, 'quest');
        return;
      }
      case 'enigme': return this.enigme(m);
      case 'tav': return this.tavShow(m);
      case 'gabier': {
        this.gab = this.gab || {};
        if (m.ht != null) this.gab.off = m.ht - now;
        if (m.armed) { this.gab.armed = 1; this.gab.t0 = 0; }
        if (m.go) { this.gab.t0 = now; G.sfx.play('horn', 0.4); }
        if (m.done) { this.gab.t0 = 0; this.gab.last = m.time; G.sfx.play('victory', 0.5); }
        return;
      }
      case 'course': return this.raceMsg(m, now);
      case 'show': return this.startShow(m.seed, m.el || 0, m.dur, m.id);
    }
  }
  // ------------------------------------------------------------ les événements du monde
  onEvent(ev, now) {
    const G = this.G, R = G.renderer;
    if (ev[0] === 'emote' && ['gigue', 'feu', 'confettis', 'reverence', 'valse'].includes(ev[2])) {
      const e = ev[1] === G.myId ? G.player : G.ents.get(ev[1]); if (!e) return true;
      const k = ev[2];
      if (k === 'gigue' || k === 'valse') { e.danceUntil = now + 4; R.addFx({ kind: 'emo', e: k === 'valse' ? 'coeur' : '♪', follow: () => e, dur: 1.6, h: 36 }); }
      if (k === 'feu') this.launch(e.x, e.y - 14, Math.random() * 1e6 | 0, 0.85);
      if (k === 'confettis') R.burst(e.x, e.y - 18, 36, { z: 22, col: ['#ff5a4a', '#ffd24a', '#6ab8ff', '#7ae07a', '#e88aff', '#ffffff'], up: 80, speed: 46, life: 1.3, g: 60, size: 1 });
      if (k === 'reverence') { e.sitUntil = now + 1.1; R.addFx({ kind: 'bubble', text: 'Votre serviteur !', follow: () => e, dur: 1.8, h: 40 }); }
      return true;
    }
    if (ev[0] !== 'fest') return false;
    const k = ev[1];
    if (k === 'fusee') this.launch(ev[2], ev[3] - 12, ev[4], 1);
    if (k === 'depart') { G.sfx.play('boom', 0.7); R.shake(2, 0.3); for (let i = 0; i < 3; i++) setTimeout(() => this.launch(ev[2] + (i - 1) * 40, ev[3] - 20, i * 977, 1), i * 220); }
    if (k === 'bouee') R.burst(ev[2], ev[3] - 10, 14, { z: 10, col: ['#ffd24a', '#ffffff'], up: 50, speed: 30, life: 0.7 });
    if (k === 'arrivee') { // une arrivée saluée : salves, feux d'artifice, la foule qui crie
      const x = (RACE.line.x0 + RACE.line.x1) * 8, y = RACE.line.y * TILE;
      G.sfx.play('boom', 0.9); G.sfx.play('victory', 0.5); R.shake(2.5, 0.4);
      for (let i = 0; i < (ev[5] === 1 ? 6 : 3); i++) setTimeout(() => this.launch(x + (i - 2) * 46, y - 10, ev[2] * 31 + i * 97, 1.1), i * 260);
      G.ui.toast(`⛵ ${ev[4]} franchit la ligne : ${ev[5] === 1 ? 'premier !' : ev[5] + 'e'}`, ev[5] === 1 ? 'quest' : 'info');
      for (const f of this.crowd) if (f.role === 'badaud') { f.danceUntil = now + 3; }
    }
    return true;
  }
  // ------------------------------------------------------------ les points d'interaction
  visible(s) {
    const st = this.st, tr = st.tr;
    if (s.k === 'gab_sortie' || s.k === 'lice_sortie' || s.k === 'gab_cloche') return true;
    if (!this.on) return false;
    if (s.k === 'canon') { const r = this.rounds.get(s.cannon); return !r || r.mine; }
    if (s.k === 'indice') return !!(tr && !tr.solved && tr.i < tr.n);
    if (s.k === 'coffre_mira') return !!(tr && !tr.solved && tr.i >= tr.n && s.variant === st.v);
    if (s.k === 'bouteille') return !(st.sec || []).includes('bouteille');
    return true;
  }
  spotNear(p) {
    let best = null, bd = 1e9;
    for (const s of this.F.spots) {
      if ((s.room >= 0 ? s.room !== this.G.room : this.G.room !== -1) || Math.abs(s.x - p.x) > 60 || Math.abs(s.y - p.y) > 60) continue;
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d > (s.r || 20) || d >= bd || !this.visible(s)) continue;
      bd = d; best = s;
    }
    return best ? { s: best, d: bd } : null;
  }
  use(i) { this.G.send({ t: 'fest', a: 'spot', i }); }
  // ------------------------------------------------------------ les conversations des personnages du festival
  dialog(npcId, ch, ui) {
    const G = this.G, on = this.on, st = this.st, send = (m) => G.send({ t: 'fest', ...m }), say = (t, more = []) => ui.say(t, [...more, { label: 'Merci.', go: () => ui.dialogMain(npcId) }]);
    if (npcId === 'mira') {
      if (on) {
        ch.unshift({ label: '🎟 Mon carnet du festival', cls: 'q', go: () => { ui.close(); this.openPanel('carnet'); } });
        ch.unshift({ label: st.tr && !st.tr.solved ? '🗺 La carte de votre grand-mère (l’indice)' : '🗺 La chasse au trésor de votre grand-mère', cls: 'q', go: () => { if (st.tr && !st.tr.solved) say(`« ${st.tr.riddle} »${st.tr.found.length ? ' — Déjà trouvés : ' + st.tr.found.map((f) => `${f.sym} (${f.num})`).join(', ') + '.' : ''}`); else { send({ a: 'tresor' }); ui.close(); } } });
        ch.push({ label: 'Quelles sont les épreuves ?', go: () => say(EP_ORDER.map((k) => `${EPREUVES[k].name} — ${EPREUVES[k].where}.`).join(' ') + ' Et chaque nuit, à la tombée du jour, le spectacle sur la plage.') });
      } else ch.unshift({ label: 'Quand revient la Nuit des Mille Voiles ?', go: () => say(MIRA.offseason(this.whenNext())) });
    }
    if (npcId === 'zephyrine') ch.unshift({ label: `🪙 Le comptoir des jetons (vous en avez ${st.tok || 0})`, cls: 'q', go: () => { ui.close(); this.openPanel('boutique'); } });
    if (!on) return;
    if (npcId === 'anselin') {
      if (st.racing) ch.unshift({ label: 'Abandonner la course', go: () => { send({ a: 'course', c: 'abandon' }); ui.close(); } });
      else ch.unshift({ label: '⛵ S’inscrire à la prochaine course', cls: 'q', go: () => { send({ a: 'course', c: 'inscrire' }); ui.close(); } });
    }
    if (npcId === 'pimprenelle') { const s = this.F.spots.find((q) => q.k === 'gab_entree'); ch.unshift({ label: '🧗 Entrer sur le parcours du gabier', cls: 'q', go: () => { this.use(s.id); ui.close(); } }); }
    if (npcId === 'barnabe') ch.unshift({ label: '🎲 Le défi des tavernes (dés, chopes, bouchon)', cls: 'q', go: () => { send({ a: 'tav', c: 'start' }); ui.close(); } });
    if (npcId === 'escarmouche') {
      CHAMPIONS.forEach((c, n) => { if (n <= (st.ch || 0)) ch.unshift({ label: `⚔ Défier ${c.name}${n < (st.ch || 0) ? ' (déjà vaincu)' : ''}`, cls: 'q', go: () => { send({ a: 'duel', c: 'champion', n }); ui.close(); } }); });
      const here = [...G.ents.values()].filter((e) => e.k === 'p' && e.name && e.name !== G.player.name);
      if (here.length) ch.push({ label: '🤺 Défier un pirate présent', go: () => ui.say('Qui voulez-vous défier ? Le premier touché perd, et personne ne meurt.', [...here.slice(0, 6).map((e) => ({ label: e.name, go: () => { send({ a: 'duel', c: 'defier', name: e.name }); ui.close(); } })), { label: 'Personne.', go: () => ui.close() }]) });
    }
  }
  whenNext() { const d = new Date(this.st.next || Date.now()); return `le ${d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à midi`; }
  // ------------------------------------------------------------ la chasse au trésor : le cadenas
  enigme(m) {
    const ui = this.G.ui;
    const help = m.found.map((f) => `${f.sym} (${f.num})`).join(', ');
    ui.openThing('Le coffre de la grand-mère Bellécume', 'Un cadenas à symboles', 'cadenas');
    ui.say(`Le cadenas de la grand-mère Bellécume : quatre symboles à tourner, dans le bon ordre. Vos indices : ${help}. Dans quel ordre ?`, [
      ...m.opts.map((o, i) => ({ label: o.join(' → '), go: () => { this.G.send({ t: 'fest', a: 'enigme', o: i }); ui.close(); } })),
      { label: 'Réfléchir encore.', go: () => ui.close() },
    ]);
  }
  // ------------------------------------------------------------ le défi des tavernes : un petit panneau à part
  tavShow(m) {
    const G = this.G, box = $('fest-tav'), send = (c, extra = {}) => G.send({ t: 'fest', a: 'tav', c, ...extra });
    box.classList.remove('hidden');
    const t = this.tav = this.tav || { mask: 0 };
    const head = (s) => `<div class="ft-h">Le défi des tavernes <span>${s}</span><button class="ft-x" title="Abandonner">✕</button></div>`;
    const bind = () => { const x = box.querySelector('.ft-x'); if (x) x.onclick = () => { send('stop'); this.tavClose(); }; };
    if (m.stage === 'des') {
      t.mask = 0; t.dice = m.dice; t.rr = m.rr;
      const draw = () => {
        box.innerHTML = head('1. Les dés') + `<p>${m.twist === 0 ? 'Ce soir, les dés de Barnabé ont un six de plus. ' : ''}Cliquez sur les dés à relancer (deux relances), puis gardez. Un brelan vaut dix de plus.</p>`
          + `<div class="ft-dice">${t.dice.map((d, i) => `<button class="ft-die${t.mask & (1 << i) ? ' sel' : ''}" data-i="${i}">${FACES[d - 1]}</button>`).join('')}</div>`
          + `<div class="ft-b"><button class="btn" id="ft-rr" ${t.rr <= 0 || !t.mask ? 'disabled' : ''}>Relancer (${t.rr})</button><button class="btn ok" id="ft-keep">Garder</button></div>`;
        box.querySelectorAll('.ft-die').forEach((b) => (b.onclick = () => { t.mask ^= 1 << +b.dataset.i; G.sfx.play('click'); draw(); }));
        $('ft-rr').onclick = () => { G.sfx.play('dice'); send('relancer', { mask: t.mask }); };
        $('ft-keep').onclick = () => { G.sfx.play('dice'); send('garder'); };
        bind();
      };
      return draw();
    }
    if (m.stage === 'mem') {
      if (m.him) t.desLine = `Vous : ${m.me.map((d) => FACES[d - 1]).join(' ')} — Barnabé : ${m.him.map((d) => FACES[d - 1]).join(' ')} · ${m.pts} point${m.pts > 1 ? 's' : ''}.`;
      t.seq = m.seq; t.input = []; t.speed = m.speed || 0.6;
      box.innerHTML = head('2. Les chopes') + `<p class="ft-res">${t.desLine || ''}</p><p>Regardez les chopes s’allumer, puis répétez la suite (${m.seq.length}).</p>`
        + `<div class="ft-chopes">${CHOPES.map(([n, c], i) => `<button class="ft-chope" data-i="${i}" style="--c:${c}" disabled>${n}</button>`).join('')}</div><p class="ft-state">Regardez bien…</p>`;
      bind();
      const btn = [...box.querySelectorAll('.ft-chope')];
      t.seq.forEach((c, j) => setTimeout(() => { const b = btn[c]; if (!b) return; b.classList.add('lit'); G.sfx.play('click'); setTimeout(() => b.classList.remove('lit'), t.speed * 700); }, 600 + j * t.speed * 1000));
      setTimeout(() => {
        const s = box.querySelector('.ft-state'); if (s) s.textContent = 'À vous !';
        btn.forEach((b) => { b.disabled = false; b.onclick = () => { t.input.push(+b.dataset.i); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 160); G.sfx.play('click'); if (t.input.length >= t.seq.length) { btn.forEach((q) => (q.disabled = true)); send('mem', { seq: t.input }); } }; });
      }, 700 + t.seq.length * t.speed * 1000);
      return;
    }
    if (m.stage === 'ref') {
      if (m.mem != null) t.memLine = `Chopes : ${m.mem} suite${m.mem > 1 ? 's' : ''} répétée${m.mem > 1 ? 's' : ''}${m.miss ? ' (puis une erreur)' : ''}.`;
      if (m.ready) { t.wait = 1; t.go = 0; }
      if (m.go) { t.go = nowS(); t.wait = 0; G.sfx.play('boom', 0.5); }
      if (m.rt != null) { t.last = m.rt; t.go = 0; t.wait = 0; }
      const tries = m.tries ?? t.tries ?? 0; t.tries = tries;
      box.innerHTML = head('3. Le bouchon') + `<p class="ft-res">${t.memLine || ''}</p><p>Quand Barnabé crie « Tirez ! », cliquez. Pas avant ! (${TAV.ref.tries - tries} essai${TAV.ref.tries - tries > 1 ? 's' : ''})</p>`
        + `<button class="ft-big ${t.go ? 'go' : ''}" id="ft-shot">${t.go ? 'TIREZ !' : t.wait ? 'Attendez…' : 'Prêt ?'}</button>`
        + `<p class="ft-state">${t.last != null ? (t.last < 0 ? 'Faux départ !' : `Réaction : ${t.last} ms`) : ''}</p>`;
      $('ft-shot').onclick = () => { if (t.wait || t.go) send('tir'); else send('pret'); };
      bind();
      return;
    }
    if (m.stage === 'fin') {
      box.innerHTML = head('Résultat') + `<p class="ft-res">Dés ${m.pts.des} · Chopes ${m.pts.mem} · Bouchon ${m.pts.ref}${m.rt > 0 ? ` (${m.rt} ms)` : ''}</p><p class="ft-total">${m.total} points</p><p>${m.total >= TAV.stamp ? 'Barnabé tamponne votre carnet !' : `Il en faut ${TAV.stamp} pour le tampon.`}</p><div class="ft-b"><button class="btn ok" id="ft-again">Rejouer</button><button class="btn" id="ft-close">Fermer</button></div>`;
      $('ft-again').onclick = () => { this.tav = null; send('start'); };
      $('ft-close').onclick = () => this.tavClose();
      bind();
    }
  }
  tavClose() { $('fest-tav').classList.add('hidden'); this.tav = null; }
  // ------------------------------------------------------------ la course
  raceMsg(m, now) {
    const G = this.G, ui = G.ui;
    if (m.wait != null) { this.race = { wait: now + m.wait, n: m.n }; return; }
    if (m.go != null) { this.race = { go: now + m.go, t0: now + m.go, buoys: m.buoys, names: m.names, i: 0, splits: [] }; ui.toast(`Sur la ligne : ${m.names.join(', ')}. Franchissez la ligne vers le nord au coup de canon, puis passez les ${m.buoys.length} bouées dans l’ordre.`, 'quest'); return; }
    const r = this.race; if (!r) return;
    if (m.i != null) { r.i = m.i; if (m.split != null) { r.splits.push(m.split); G.sfx.play('bell', 0.4); } if (m.env) ui.toast(m.i <= r.buoys.length ? `Bouée suivante : ${r.buoys[m.i - 1][2]} — ${m.env}` : 'Toutes les bouées ! Cap sur la ligne d’arrivée, au sud de la jetée.', 'info'); }
    if (m.fin) { r.fin = { time: m.time, rank: m.rank, of: m.of }; setTimeout(() => { if (this.race === r) this.race = null; }, 12000); }
    if (m.out) { this.race = null; }
  }
  // ------------------------------------------------------------ le spectacle
  startShow(seed, el, dur, id) {
    const now = nowS(), shots = []; let s = seed >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    for (let t = 20; t < dur; t += t > 112 ? 0.18 + rnd() * 0.22 : 0.7 + rnd() * 1.1) shots.push({ t, x: (134 + rnd() * 32) * TILE, y: (121 + rnd() * 6) * TILE, seed: (rnd() * 1e6) | 0, big: t > 112 ? 1.25 : 1 });
    this.show = { id, t0: now - el, dur, shots, i: shots.findIndex((q) => q.t >= el) };
    if (this.show.i < 0) this.show.i = shots.length;
  }
  // une fusée : elle monte en traînant des étincelles, puis éclate en couronne (les couleurs viennent de la graine)
  launch(x, y, seed, big = 1) {
    if (this.rockets.length > 24) return;
    const c = FW_COLS[(seed >>> 0) % FW_COLS.length];
    this.rockets.push({ x, y, z: 0, vz: 170 + (seed % 40), vx: ((seed % 7) - 3) * 4, top: 125 + (seed % 70), c, big, t0: nowS(), seed });
    this.G.sfx.play('throw', 0.25);
  }
  burstFw(r) {
    const n = Math.round(46 * r.big), shape = r.seed % 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sp = (shape === 1 ? 52 : 38 + ((i * 7) % 5) * 6) * r.big * (shape === 2 && i % 2 ? 0.55 : 1);
      if (this.fw.length < 900) this.fw.push({ x: r.x, y: r.y, z: r.z, vx: Math.cos(a) * sp, vz: Math.sin(a) * sp, life: 1.3 + (i % 3) * 0.2, max: 1.6, col: i % 4 ? r.c[0] : r.c[1], g: i % 3 === 0 ? r.c[2] : null });
    }
    if (this.blooms.length < 16) this.blooms.push({ x: r.x, y: r.y - r.z, t0: nowS(), g: r.c[2], s: r.big }); // un halo bref, à la couleur de la gerbe (pas d'éclair blanc)
    const p = this.G.player, d = p ? Math.hypot(p.x - r.x, p.y - r.y) : 0;
    this.G.sfx.play('boom', Math.max(0.05, 0.4 - d / 2000)); if (d < 700) setTimeout(() => this.G.sfx.play('crack', 0.15), 140);
  }
  // ------------------------------------------------------------ la musique du festival
  theme(now) {
    const G = this.G, p = G.player; if (!this.on || !p) return null;
    if (this.race && (this.race.go || this.race.t0) && !this.race.fin && p.ship) return 'mille_voiles';
    const F = this.F;
    if (G.room === F.rooms.gabier || G.room === F.rooms.lice || this.myRound() || this.tav) return 'epreuves';
    const inFest = G.room === -1 ? (p.x > 118 * TILE && p.x < 178 * TILE && p.y > 84 * TILE && p.y < 150 * TILE) : G.room === F.tavern;
    if (!inFest) return null;
    if (this.show && now - this.show.t0 < this.show.dur) return 'fete_nuit';
    return G.night ? 'fete_nuit' : 'fete';
  }
  myRound() { for (const r of this.rounds.values()) if (r.mine) return r; return null; }
  camera() { const r = this.myRound(); if (!r || nowS() > r.t0 + r.dur + 1) return null; const c = this.F.cannons[r.k], L = c.lane; return { x: (L.x0 + L.x1) / 2, y: (c.y + (L.y0 + L.y1) / 2) / 2 + 10 }; }
  aiming() { const r = this.myRound(), now = nowS(); return !!(r && now >= r.t0 - 0.2 && now <= r.t0 + r.dur); }
  fire(now) {
    const r = this.myRound(), G = this.G, m = G.mouseWorld; if (!r || !m || now < (this.nextShot || 0)) return;
    this.nextShot = now + CANON.reload;
    const c = this.F.cannons[r.k], d = Math.hypot(m.x - c.x, m.y - c.y), k = d > CANON.range ? CANON.range / d : 1, x = c.x + (m.x - c.x) * k, y = c.y + (m.y - c.y) * k;
    this.balls.push({ x0: c.x, y0: c.y - 8, x1: x, y1: y, t0: now, dur: CANON.flight });
    G.send({ t: 'fest', a: 'tir', x: Math.round(x), y: Math.round(y) });
    G.sfx.play('boom', 0.6); G.renderer.shake(1.2, 0.15); G.renderer.smoke(c.x, c.y - 10, 6, 'rgba(220,210,200,0.6)', { size: 3, life: 0.8 });
  }
  emoteKey(n) { const k = EMO_KEYS[n]; if (!k) return; if (!(this.st.own || []).includes(SHOP.find((s) => s.emote === k).id)) return this.G.ui.toast('Cette émote s’obtient au comptoir de Zéphyrine, contre des jetons du festival.', 'info'); this.G.send({ t: 'fest', a: 'emote', k }); }
  // ------------------------------------------------------------ chaque image
  update(dt, now) {
    const G = this.G, p = G.player;
    for (const f of this.crowd) f.hidden = !this.on || G.room !== -1;
    if (this.on && G.room === -1 && p && Math.abs(p.y - 112 * TILE) < 600) {
      const showing = this.show && now - this.show.t0 < this.show.dur;
      for (const f of this.crowd) {
        if (f.role === 'musicien') { if (Math.random() < dt * 0.4) G.renderer.addFx({ kind: 'emo', e: '♪', follow: () => f, dur: 1.4, h: 34 }); f.dir = 0; }
        else if (f.role === 'danseur') { if (G.night || showing || Math.random() < dt * 0.05) f.danceUntil = Math.max(f.danceUntil || 0, now + 2 + Math.random() * 3); }
        else if (f.role === 'flaneur') { // ils vont d'un stand à l'autre
          if (f.wait > 0) { f.wait -= dt; f.moving = false; if (Math.random() < dt * 0.02 && (!G.town || G.town.bubblesInView() === 0)) G.renderer.addFx({ kind: 'bubble', text: FEST_CROWD_LINES[Math.floor(Math.random() * FEST_CROWD_LINES.length)], follow: () => f, dur: 2.6, h: 34 }); continue; }
          if (!f.to) { // 1.9.1 : une destination sur la terre ferme, joignable en ligne droite (ni mur ni eau en chemin)
            const ok = (x, y) => canStand(G.world, x, y) && dry(G.world, x, y);
            for (let k = 0; k < 8 && !f.to; k++) {
              const tx = f.ox + (Math.random() - 0.5) * 120, ty = f.oy + (Math.random() - 0.5) * 50, n = Math.ceil(Math.hypot(tx - f.x, ty - f.y) / 5);
              let clear = ok(tx, ty); for (let j = 1; j < n && clear; j++) clear = ok(f.x + (tx - f.x) * j / n, f.y + (ty - f.y) * j / n);
              if (clear) f.to = { x: tx, y: ty };
            }
            if (!f.to) { f.wait = 1 + Math.random() * 2; f.moving = false; continue; }
          }
          const dx = f.to.x - f.x, dy = f.to.y - f.y, d = Math.hypot(dx, dy);
          if (d < 3) { f.to = null; f.wait = 2 + Math.random() * 5; f.moving = false; continue; }
          f.x += dx / d * 22 * dt; f.y += dy / d * 22 * dt; f.moving = true; f.walk += dt; f.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 2) : (dy < 0 ? 3 : 0);
        } else if (f.role === 'badaud') f.dir = 0;
      }
      if (G.night && !showing && Math.random() < dt * 0.06) this.launch((136 + Math.random() * 28) * TILE, (121 + Math.random() * 5) * TILE, Math.random() * 1e6 | 0, 0.8); // de temps en temps, une fusée isolée
    }
    // le spectacle : les fusées partent à l'heure dite (la même graine pour tout le monde)
    const S = this.show;
    if (S) {
      const t = now - S.t0;
      while (S.i < S.shots.length && S.shots[S.i].t <= t) { const q = S.shots[S.i++]; if (p && Math.hypot(p.x - q.x, p.y - q.y) < 1400) this.launch(q.x, q.y, q.seed, q.big); }
      if (t > S.dur + 4) this.show = null;
    }
    // les fusées et leurs étincelles
    for (let i = this.rockets.length - 1; i >= 0; i--) { const r = this.rockets[i]; r.z += r.vz * dt; r.x += r.vx * dt; if (Math.random() < 0.7) this.fw.push({ x: r.x, y: r.y, z: r.z, vx: (Math.random() - 0.5) * 8, vz: -10, life: 0.35, max: 0.35, col: '#ffe0a0' }); if (r.z >= r.top) { this.burstFw(r); this.rockets.splice(i, 1); } }
    for (let i = this.fw.length - 1; i >= 0; i--) { const q = this.fw[i]; q.life -= dt; if (q.life <= 0) { this.fw.splice(i, 1); continue; } q.x += q.vx * dt; q.z += q.vz * dt; q.vz -= 34 * dt; q.vx *= 1 - dt * 0.9; q.vz *= 1 - dt * 0.6; }
    for (let i = this.balls.length - 1; i >= 0; i--) if (now - this.balls[i].t0 > this.balls[i].dur) this.balls.splice(i, 1);
    for (const [k, r] of this.rounds) if (now > r.t0 + r.dur + 3) this.rounds.delete(k);
    this.hud(now);
  }
  // ------------------------------------------------------------ dessin dans le monde (avant la lumière)
  drawGround(ctx, camX, camY, now) {
    const G = this.G; if (!this.on) return;
    // le coffre de la grand-mère, une fois les quatre indices lus : un monticule de terre remuée, un coin de coffre qui dépasse
    for (const sp of this.F.spots) {
      if (sp.k !== 'coffre_mira' || !this.visible(sp)) continue;
      const X = Math.round(sp.x - camX), Y = Math.round(sp.y - camY);
      if (X < -20 || Y < -20 || X > G.renderer.W + 20 || Y > G.renderer.H + 20) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(X, Y + 3, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#7a5a34'; ctx.beginPath(); ctx.ellipse(X, Y + 1, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3d1e'; ctx.fillRect(X - 5, Y - 4, 10, 5); ctx.fillStyle = '#7b5228'; ctx.fillRect(X - 5, Y - 5, 10, 2);
      ctx.fillStyle = '#c9962f'; ctx.fillRect(X - 5, Y - 2, 10, 1); ctx.fillRect(X - 1, Y - 3, 2, 3);
      ctx.fillStyle = '#9a7a4e'; ctx.fillRect(X - 8, Y, 3, 2); ctx.fillRect(X + 5, Y + 1, 3, 1); ctx.fillRect(X + 2, Y + 2, 2, 1);
      if (Math.sin(now * 2.2) > 0.6) { ctx.fillStyle = 'rgba(255,236,170,0.8)'; ctx.fillRect(X + 3, Y - 6, 1, 1); } // un discret reflet de laiton
    }
  }
  drawWorld(ctx, camX, camY, now, dark, room) {
    const G = this.G;
    if (!this.on && !(room && room.fest)) return;
    if (!room) {
      // les guirlandes de fanions, de mât en mât (des triangles qui ondulent un peu)
      for (const [x0, y0, x1, y1] of this.F.garlands) {
        if (Math.max(x0, x1) < camX - 20 || Math.min(x0, x1) > camX + G.renderer.W + 20 || Math.max(y0, y1) < camY - 30 || Math.min(y0, y1) > camY + G.renderer.H + 30) continue;
        const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(3, Math.round(L / 9)), sag = 6 + L * 0.05;
        ctx.strokeStyle = 'rgba(40,24,14,0.8)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t - camX, y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag - camY; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
        for (let i = 1; i < n; i++) {
          const t = i / n, x = Math.round(x0 + (x1 - x0) * t - camX), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag - camY), w = Math.round(Math.sin(now * 3 + i + x0) * 1);
          ctx.fillStyle = BUNTING[(i + Math.floor(x0 / 16)) % BUNTING.length]; ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.lineTo(x + w, y + 5); ctx.closePath(); ctx.fill();
        }
      }
      // les cibles du concours de canonniers (les mêmes calculs que le serveur)
      for (const r of this.rounds.values()) {
        const t = now - r.t0; if (t < 0 || t > r.dur) continue;
        for (const tg of r.targets) { if (r.hits.has(tg.i)) continue; const q = targetAt(tg, t); if (q) this.drawTarget(ctx, tg, q.x - camX, q.y - camY, now); }
      }
      // les boulets en vol
      for (const b of this.balls) { const k = (now - b.t0) / b.dur, x = b.x0 + (b.x1 - b.x0) * k, y = b.y0 + (b.y1 - b.y0) * k - Math.sin(k * Math.PI) * 34; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(Math.round(b.x0 + (b.x1 - b.x0) * k - camX) - 2, Math.round(b.y0 + (b.y1 - b.y0) * k - camY), 4, 2); ctx.fillStyle = '#1a1a1e'; ctx.beginPath(); ctx.arc(Math.round(x - camX), Math.round(y - camY), 2.5, 0, Math.PI * 2); ctx.fill(); }
      // la course : la bouée suivante, cerclée ; les courants, de fines traînées sur l'eau
      const R = this.race;
      if (R && R.buoys && !R.fin) {
        const b = R.i >= 1 && R.i <= R.buoys.length ? R.buoys[R.i - 1] : null;
        if (b) { const X = b[0] - camX, Y = b[1] - camY, pulse = 1 + Math.sin(now * 4) * 0.08; ctx.strokeStyle = 'rgba(255,214,120,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(X, Y, RACE.r * pulse, RACE.r * 0.5 * pulse, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (G.player && G.player.ship) for (const c of CURRENTS) {
          const cx = c.tx * TILE + 8 - camX, cy = c.ty * TILE + 8 - camY, Rr = c.r * TILE; if (cx < -Rr || cy < -Rr || cx > G.renderer.W + Rr || cy > G.renderer.H + Rr) continue;
          const flip = this.st.v === 2 ? -1 : 1, a = Math.atan2(c.vy * flip, c.vx * flip); ctx.strokeStyle = 'rgba(220,240,255,0.16)';
          for (let k = 0; k < 14; k++) { const ph = (now * 0.35 + r01(k + c.tx) ) % 1, rr = Math.sqrt(r01(k * 3 + c.ty)) * Rr, aa = r01(k * 7) * Math.PI * 2, x = cx + Math.cos(aa) * rr + Math.cos(a) * (ph - 0.5) * 40, y = cy + Math.sin(aa) * rr * 0.6 + Math.sin(a) * (ph - 0.5) * 40; ctx.globalAlpha = Math.sin(ph * Math.PI); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      }
    }
    // le parcours du gabier : les tonneaux qui roulent, la bôme qui balaie
    if (room && room.fest === 'gabier' && this.gab && this.gab.off != null) {
      const t = now + this.gab.off, GB = this.F.gabier;
      for (const b of gabBarrels(GB, t)) this.drawBarrel(ctx, b.x - camX, b.y - camY, b.a);
      const B = gabBoom(GB, t);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(B.x0 - camX + 2, B.y0 - camY + 6); ctx.lineTo(B.x1 - camX + 2, B.y1 - camY + 6); ctx.stroke();
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(B.x0 - camX, B.y0 - camY - 4); ctx.lineTo(B.x1 - camX, B.y1 - camY - 4); ctx.stroke();
      ctx.strokeStyle = '#a07244'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(B.x0 - camX, B.y0 - camY - 5); ctx.lineTo(B.x1 - camX, B.y1 - camY - 5); ctx.stroke();
      ctx.fillStyle = '#3a2414'; ctx.fillRect(Math.round(B.x0 - camX) - 3, Math.round(B.y0 - camY) - 34, 6, 32); ctx.fillStyle = '#6a4424'; ctx.fillRect(Math.round(B.x0 - camX) - 2, Math.round(B.y0 - camY) - 34, 2, 32); // le mât de la bôme
    }
  }
  drawTarget(ctx, tg, X, Y, now) {
    X = Math.round(X); Y = Math.round(Y);
    ctx.fillStyle = 'rgba(0,30,60,0.25)'; ctx.beginPath(); ctx.ellipse(X, Y + 3, tg.r, tg.r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    if (tg.kind === 'tonneau') { ctx.fillStyle = '#7a4a24'; ctx.fillRect(X - 5, Y - 9, 10, 10); ctx.fillStyle = '#a06a34'; ctx.fillRect(X - 4, Y - 9, 8, 10); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X - 5, Y - 7, 10, 1); ctx.fillRect(X - 5, Y - 2, 10, 1); ctx.fillStyle = '#e8564a'; ctx.fillRect(X - 1, Y - 6, 2, 2); }
    else if (tg.kind === 'pavillon') { ctx.fillStyle = '#7a4a24'; ctx.fillRect(X - 4, Y - 1, 8, 3); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X, Y - 12, 1, 11); ctx.fillStyle = '#e8427a'; const w = Math.sin(now * 8 + tg.ph); ctx.beginPath(); ctx.moveTo(X + 1, Y - 12); ctx.lineTo(X + 8, Y - 10 + w); ctx.lineTo(X + 1, Y - 8); ctx.fill(); }
    else if (tg.kind === 'galion') { ctx.fillStyle = '#c8a86a'; ctx.fillRect(X - 12, Y - 4, 24, 5); ctx.fillStyle = '#8a6a3a'; ctx.fillRect(X - 10, Y, 20, 2); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(X - 1, Y - 18, 2, 14); ctx.fillStyle = '#f2e6c8'; ctx.fillRect(X - 8, Y - 16, 7, 9); ctx.fillRect(X + 1, Y - 15, 6, 8); }
    else { const gold = tg.kind === 'mouette_or', f = Math.sin(now * 14 + tg.ph) > 0 ? 1 : 0; ctx.fillStyle = gold ? '#f2c14a' : '#f4f0e4'; ctx.fillRect(X - 2, Y - 8, 5, 3); ctx.fillRect(X - 6, Y - 8 - f, 4, 2); ctx.fillRect(X + 3, Y - 8 - f, 4, 2); ctx.fillStyle = gold ? '#b07a22' : '#3a3a3a'; ctx.fillRect(X + 3, Y - 8, 1, 1); ctx.fillStyle = '#e8a020'; ctx.fillRect(X + 3, Y - 7, 2, 1); }
  }
  drawBarrel(ctx, X, Y, a) { // un tonneau couché qui roule vers l'ouest : on voit ses douelles défiler et ses cercles de fer
    X = Math.round(X); Y = Math.round(Y);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(X, Y + 4, BARREL_R, 4, 0, 0, Math.PI * 2); ctx.fill();
    const w = 14, h = 20, x0 = X - w / 2, y0 = Y - h + 2;
    ctx.fillStyle = '#5a3418'; ctx.fillRect(x0, y0 + 1, w, h - 2); ctx.fillRect(x0 + 1, y0, w - 2, h);
    for (let k = 0; k < 4; k++) { const off = ((a * 2.2 + k * 3.5) % 14 + 14) % 14, sx = Math.round(x0 + off); ctx.fillStyle = k % 2 ? '#8a5a2c' : '#a06a34'; ctx.fillRect(Math.max(x0 + 1, sx), y0 + 1, Math.min(3, x0 + w - 1 - sx), h - 2); }
    ctx.fillStyle = '#2e2e34'; ctx.fillRect(x0, y0 + 4, w, 2); ctx.fillRect(x0, y0 + h - 6, w, 2);
    ctx.fillStyle = '#c8a060'; ctx.fillRect(x0 + 2, y0 + 1, w - 4, 1);
  }
  // ------------------------------------------------------------ par-dessus la nuit : les feux d'artifice, la visée, la brume, la flèche de la course
  drawGlow(ctx, camX, camY, now, dark, room) {
    const G = this.G, R = G.renderer;
    if (this.fw.length || this.rockets.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const now2 = nowS(), lum = 0.35 + 0.65 * dark;
      for (let i = this.blooms.length - 1; i >= 0; i--) { const b = this.blooms[i], k = (now2 - b.t0) / 0.7; if (k >= 1) { this.blooms.splice(i, 1); continue; } const rr = (30 + 40 * k) * b.s; ctx.globalAlpha = (1 - k) * 0.55 * lum; ctx.drawImage(R.glows[b.g] || R.glows.warm, Math.round(b.x - camX - rr), Math.round(b.y - camY - rr), rr * 2, rr * 2); }
      for (const q of this.fw) { const X = Math.round(q.x - camX), Y = Math.round(q.y - q.z - camY), k = q.life / q.max; ctx.globalAlpha = Math.min(1, k * 1.8); ctx.fillStyle = q.col; const sz = k > 0.55 ? 3 : k > 0.25 ? 2 : 1; ctx.fillRect(X - (sz >> 1), Y - (sz >> 1), sz, sz); if (q.g && k > 0.3) { ctx.globalAlpha = k * 0.35 * lum; ctx.drawImage(R.glows[q.g] || R.glows.warm, X - 5, Y - 5, 10, 10); } }
      for (const r of this.rockets) { const X = Math.round(r.x - camX), Y = Math.round(r.y - r.z - camY); ctx.globalAlpha = 1; ctx.fillStyle = '#fff2c0'; ctx.fillRect(X, Y, 2, 2); ctx.globalAlpha = 0.5; ctx.drawImage(R.glows.warm, X - 6, Y - 6, 12, 12); }
      ctx.restore();
    }
    // la visée du canon : une mire discrète au bout de la portée
    if (this.aiming() && G.mouseWorld) {
      const r = this.myRound(), c = this.F.cannons[r.k], m = G.mouseWorld, d = Math.hypot(m.x - c.x, m.y - c.y), k = d > CANON.range ? CANON.range / d : 1;
      const X = Math.round(c.x + (m.x - c.x) * k - camX), Y = Math.round(c.y + (m.y - c.y) * k - camY), ready = nowS() >= (this.nextShot || 0);
      ctx.strokeStyle = ready ? 'rgba(255,230,160,0.85)' : 'rgba(255,230,160,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(X + 0.5, Y + 0.5, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X - 9, Y + 0.5); ctx.lineTo(X - 3, Y + 0.5); ctx.moveTo(X + 4, Y + 0.5); ctx.lineTo(X + 10, Y + 0.5); ctx.moveTo(X + 0.5, Y - 9); ctx.lineTo(X + 0.5, Y - 3); ctx.moveTo(X + 0.5, Y + 4); ctx.lineTo(X + 0.5, Y + 10); ctx.stroke();
    }
    // la course : la brume (on n'y voit la bouée que de près) et la flèche vers la bouée suivante
    const RC = this.race, p = G.player;
    if (RC && RC.buoys && !RC.fin && p && p.ship && !room) {
      const fd = Math.hypot(p.x - (FOG.tx * TILE + 8), p.y - (FOG.ty * TILE + 8)), FR = FOG.r * TILE;
      if (fd < FR * 1.2) { const k = Math.max(0, Math.min(1, (FR * 1.2 - fd) / (FR * 0.5))); const g = ctx.createRadialGradient(R.W / 2, R.H / 2, 40, R.W / 2, R.H / 2, Math.max(R.W, R.H) * 0.6); g.addColorStop(0, `rgba(210,220,226,${0.08 * k})`); g.addColorStop(1, `rgba(200,210,220,${0.62 * k})`); ctx.fillStyle = g; ctx.fillRect(0, 0, R.W, R.H); }
      const b = RC.i >= 1 && RC.i <= RC.buoys.length ? RC.buoys[RC.i - 1] : RC.i > RC.buoys.length || RC.i === 0 ? [(RACE.line.x0 + RACE.line.x1) * 8, RACE.line.y * TILE, 'La ligne'] : null;
      if (b) {
        const X = b[0] - camX, Y = b[1] - camY, onScreen = X > 10 && Y > 10 && X < R.W - 10 && Y < R.H - 10;
        if (!onScreen) { const a = Math.atan2(Y - R.H / 2, X - R.W / 2), ex = R.W / 2 + Math.cos(a) * (Math.min(R.W, R.H) / 2 - 22), ey = R.H / 2 + Math.sin(a) * (Math.min(R.W, R.H) / 2 - 22);
          ctx.save(); ctx.translate(Math.round(ex), Math.round(ey)); ctx.rotate(a); ctx.fillStyle = 'rgba(255,214,120,0.9)'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore(); }
      }
    }
  }
  // ------------------------------------------------------------ l'affichage en haut de l'écran pendant une épreuve
  hud(now) {
    const el = $('fest-hud'), G = this.G; if (!el) return;
    let html = '';
    const r = this.myRound();
    if (r) { const left = Math.max(0, r.t0 + r.dur - now); html = now < r.t0 ? `<b>Canonniers</b> · départ dans ${Math.ceil(r.t0 - now)}` : `<b>Canonniers</b> · ${r.score} pt${r.score > 1 ? 's' : ''} · ${Math.ceil(left)} s`; }
    else if (G.room === this.F.rooms.gabier && this.gab) html = this.gab.t0 ? `<b>Parcours du gabier</b> · ${fmt(now - this.gab.t0)}` : this.gab.last ? `<b>Parcours du gabier</b> · ${fmt(this.gab.last)} — sonnez de nouveau pour rejouer au panneau` : '<b>Parcours du gabier</b> · prenez le départ au panneau';
    else if (this.race) {
      const R = this.race;
      if (R.wait && !R.go) html = `<b>Course des Mille Voiles</b> · départ dans ${Math.max(0, Math.ceil(R.wait - now))} s (${R.n} inscrit${R.n > 1 ? 's' : ''})`;
      else if (R.fin) html = `<b>Arrivée</b> · ${R.fin.rank === 1 ? 'premier' : R.fin.rank + 'e'} sur ${R.fin.of} · ${fmt(R.fin.time)}`;
      else if (R.go && now < R.go) html = `<b>Course des Mille Voiles</b> · ${Math.ceil(R.go - now)}…`;
      else if (R.buoys) { const b = R.i >= 1 && R.i <= R.buoys.length ? R.buoys[R.i - 1] : null, p = G.player; const d = b && p ? Math.round(Math.hypot(b[0] - p.x, b[1] - p.y) / TILE) : 0;
        html = `<b>${fmt(Math.max(0, now - R.t0))}</b> · ${R.i === 0 ? 'franchissez la ligne vers le nord' : b ? `bouée ${R.i}/${R.buoys.length} : ${esc(b[2])} · ${d} m` : 'cap sur la ligne d’arrivée'}`; }
    }
    if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; el.classList.toggle('hidden', !html); }
  }
  // ------------------------------------------------------------ le carnet (touche N) : carnet, comptoir, garde-robe, classement, secrets
  makeDom() {
    if ($('fest-panel')) return;
    const d = document.createElement('div');
    d.innerHTML = `<div id="fest-hud" class="hidden"></div><div id="fest-tav" class="hidden"></div>
      <div id="fest-panel" class="hidden"><div class="fp-head"><span class="fp-title">La Nuit des Mille Voiles</span><span class="fp-tok"></span><button class="fp-x">✕</button></div>
      <div class="fp-tabs">${[['carnet', 'Carnet'], ['boutique', 'Comptoir'], ['garde', 'Garde-robe'], ['classement', 'Classement'], ['secrets', 'Secrets']].map(([k, n]) => `<button data-t="${k}">${n}</button>`).join('')}</div><div class="fp-body"></div></div>`;
    while (d.firstChild) document.body.appendChild(d.firstChild);
    $('fest-panel').querySelector('.fp-x').onclick = () => this.closePanel();
    $('fest-panel').querySelectorAll('.fp-tabs button').forEach((b) => (b.onclick = () => { this.tab = b.dataset.t; this.G.sfx.play('click'); this.renderPanel(); }));
  }
  panelOpen() { const p = $('fest-panel'); return p && !p.classList.contains('hidden'); }
  openPanel(tab) { if (tab) this.tab = tab; $('fest-panel').classList.remove('hidden'); this.G.send({ t: 'fest', a: 'etat' }); this.renderPanel(); }
  closePanel() { $('fest-panel').classList.add('hidden'); }
  togglePanel() { if (this.panelOpen()) this.closePanel(); else this.openPanel(); }
  renderPanel() {
    const st = this.st, P = $('fest-panel'), body = P.querySelector('.fp-body'), G = this.G, send = (m) => G.send({ t: 'fest', ...m });
    P.querySelector('.fp-tok').innerHTML = `<i class="fp-coin"></i>${st.tok || 0} jetons`;
    P.querySelectorAll('.fp-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === this.tab));
    let h = '';
    if (this.tab === 'carnet') {
      const end = st.end ? new Date(st.end).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
      h += `<p class="fp-ed">${st.open ? `${esc(st.vname || '')} — jusqu’au ${esc(end)}, midi.` : `Le festival est fermé. Il revient ${esc(this.whenNext())}.`}</p>`;
      h += '<div class="fp-stamps">' + EP_ORDER.map((k) => { const e = EPREUVES[k], ok = st.st && st.st[k], b = st.best && st.best[k]; return `<div class="fp-st${ok ? ' ok' : ''}"><span class="fp-seal">${ok ? '✓' : ''}</span><div><b>${esc(e.name)}</b><small>${esc(e.where)}${b != null ? ` · record : ${k === 'gabier' || k === 'course' ? fmt(b) : b + ' pts'}` : ''}</small></div><span class="fp-pts">+${TOK.stamp[k]}</span></div>`; }).join('') + '</div>';
      if (st.done) h += '<p class="fp-done">Carnet complet ! Mira dira votre nom au spectacle.</p>';
      if (st.tr && !st.tr.solved) h += `<p class="fp-tr"><b>La chasse au trésor</b> — ${st.tr.i < st.tr.n ? `indice ${st.tr.i + 1}/${st.tr.n}` : 'le coffre'} : « ${esc(st.tr.riddle)} »${st.tr.found.length ? '<br>Trouvés : ' + st.tr.found.map((f) => `${esc(f.sym)} (${f.num})`).join(' · ') : ''}</p>`;
      h += `<p class="fp-note">Chaque nuit, à la tombée du jour : le spectacle sur la plage (+${TOK.show} jetons). Rejouer une épreuve rapporte encore des jetons, ${TOK.cap} fois par jour.</p>`;
    } else if (this.tab === 'boutique') {
      h += '<p class="fp-note">Des parures, rien qui frappe plus fort. On achète auprès de Zéphyrine, sur la plage.</p><div class="fp-shop">';
      for (const it of SHOP) {
        if (it.feat != null && it.feat !== st.v && !(st.own || []).includes(it.id)) { h += `<div class="fp-it off"><b>${esc(it.name)}</b><small>${esc(VARIANTS[it.feat])} seulement.</small></div>`; continue; }
        const own = !it.again && (st.own || []).includes(it.id);
        h += `<div class="fp-it${own ? ' own' : ''}"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><button class="btn" data-buy="${it.id}" ${own || (st.tok || 0) < it.price ? 'disabled' : ''}>${own ? 'Acquis' : `<i class="fp-coin"></i>${it.price}`}</button></div>`;
      }
      h += '</div>';
    } else if (this.tab === 'garde') {
      const mine = SHOP.filter((s) => (st.own || []).includes(s.id) && ['voile', 'pavillon', 'tenue', 'deco'].includes(s.kind));
      h += mine.length ? '<div class="fp-shop">' + mine.map((it) => { const on = st.eq && st.eq[it.kind] === it.id; return `<div class="fp-it${on ? ' own' : ''}"><b>${esc(it.name)}</b><small>${esc(it.desc)}</small><button class="btn" data-${on ? 'off' : 'wear'}="${on ? it.kind : it.id}">${on ? 'Retirer' : 'Porter'}</button></div>`; }).join('') + '</div>' : '<p class="fp-note">Rien encore : le comptoir de Zéphyrine vous attend.</p>';
      const emos = Object.entries(EMO_KEYS).filter(([, k]) => (st.own || []).includes(SHOP.find((s) => s.emote === k).id));
      if ((st.own || []).includes('em_valse')) emos.push(['—', 'valse']);
      h += `<p class="fp-note">Émotes du festival : ${emos.length ? emos.map(([n, k]) => `<button class="btn sm" data-emo="${k}">${esc(k)}${n !== '—' ? ` (${n})` : ''}</button>`).join(' ') : 'aucune'}${(G.inv || []).some((s) => s && s.id === 'fusee_fete') ? ' · <button class="btn sm" data-rocket="1">Tirer une fusée</button>' : ''}</p>`;
    } else if (this.tab === 'classement') {
      const names = { canon: 'Canonniers (points)', taverne: 'Défi des tavernes (points)', gabier: 'Parcours du gabier (temps)', course: 'Course des Mille Voiles (temps)' };
      h += '<div class="fp-boards">' + Object.entries(names).map(([k, n]) => `<div><b>${n}</b><ol>${(st.boards && st.boards[k] || []).map(([who, v]) => `<li>${esc(who)} <span>${k === 'gabier' || k === 'course' ? fmt(v) : v}</span></li>`).join('') || '<li class="nil">personne encore</li>'}</ol></div>`).join('') + '</div>';
      if (st.last) h += `<p class="fp-note">La semaine passée — course : ${(st.last.course || []).map(([n]) => esc(n)).join(', ') || '—'} ; canonniers : ${(st.last.canon || []).map(([n]) => esc(n)).join(', ') || '—'}.</p>`;
      h += '<p class="fp-note">Les trois premiers de chaque épreuve gagnent des jetons à la fin de la semaine (et le premier de la course, un titre).</p>';
    } else if (this.tab === 'secrets') {
      h += '<div class="fp-sec">' + Object.entries(SECRETS).map(([k, s]) => { const ok = (st.sec || []).includes(k); return `<div class="${ok ? 'ok' : ''}"><b>${ok ? esc(s.name) : '???'}</b><small>${ok ? 'Découvert.' : esc(s.hint)}</small></div>`; }).join('') + '</div>';
    }
    body.innerHTML = h;
    body.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = () => send({ a: 'acheter', id: b.dataset.buy })));
    body.querySelectorAll('[data-wear]').forEach((b) => (b.onclick = () => send({ a: 'porter', id: b.dataset.wear })));
    body.querySelectorAll('[data-off]').forEach((b) => (b.onclick = () => send({ a: 'oter', kind: b.dataset.off })));
    body.querySelectorAll('[data-emo]').forEach((b) => (b.onclick = () => send({ a: 'emote', k: b.dataset.emo })));
    body.querySelectorAll('[data-rocket]').forEach((b) => (b.onclick = () => send({ a: 'fusee' })));
  }
}
void CLUES; void GABIER; void SHOW; void FEST_NPC_LINES; void SHOP_BY;
