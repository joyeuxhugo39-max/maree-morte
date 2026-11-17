// 0.8 : dialogues cinématiques — on parle VRAIMENT aux personnages.
// Bandes noires, caméra posée entre les deux interlocuteurs, portraits face à face, répliques alternées
// avec leur voix, questions libres (on choisit quoi demander, et dans quel ordre), puis la décision.
// Étapes : ['npc', texte] | ['me', texte] | [idPNJ, texte] | { ask: [{ q, a: [étapes] }], go }.
import { NPCS } from '../shared/data/npcs.js';
import { humanSheet, FW, FH } from './render/sprites-chars.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ABORT = Symbol('abort');
const voiceOf = (id) => { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 150 + (h % 170); };

export class Scene {
  constructor(G) { this.G = G; this.on = false; this.cam = null; this.wait = null; this.npc = null; }
  // joue une suite d'étapes, puis propose les choix de fin (s'il y en a) ; renvoie le choix retenu (ou null si l'on a quitté)
  async play(npcId, steps, end = null) {
    const G = this.G, n = G.npcs.find((q) => q.id === npcId) || G.allNpcs.find((q) => q.id === npcId);
    if (this.on) this.stop();
    this.on = true; this.aborted = false; this.npcId = npcId; this.npc = n;
    G.ui.close(true);
    document.body.classList.add('cine', 'scene');
    $('scene').classList.remove('hidden');
    this.paint('sc-left', NPCS[npcId], 2); this.paint('sc-right', { look: G.player.look }, 1);
    $('sc-left-name').textContent = NPCS[npcId].name; $('sc-right-name').textContent = G.player.name;
    $('scene').onclick = (e) => { if (!e.target.closest('button') && this.advance) this.advance(); };
    let picked = null;
    try {
      await this.seq(steps);
      if (end && end.length) { picked = await this.menu(end.map((c) => Object.assign({}, c))); }
    } catch (e) { if (e !== ABORT) throw e; picked = null; }
    this.stop();
    if (picked && picked.go) picked.go();
    return picked;
  }
  stop() {
    if (!this.on) return;
    this.on = false; this.cam = null;
    clearInterval(this.typeT);
    document.body.classList.remove('cine', 'scene');
    $('scene').classList.add('hidden');
    if (this.npc) this.npc.fixed = false;
    if (this.wait) { const w = this.wait; this.wait = null; w(ABORT); }
  }
  abort() { this.aborted = true; this.stop(); }
  // à chaque image : la caméra se pose entre les deux, le PNJ fait face au pirate
  update() {
    const G = this.G, p = G.player, n = this.npc;
    if (!this.on || !p) return null;
    if (n) {
      n.fixed = true;
      const dx = p.x - n.x, dy = p.y - n.y;
      n.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 2 : 1) : (dy > 0 ? 0 : 3);
      this.cam = { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2 - 4 };
    } else this.cam = { x: p.x, y: p.y - 12 };
    return this.cam;
  }
  paint(id, def, dir) {
    const c = $(id), x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
    if (!def) return;
    if (def.board) { const sg = this.G.renderer.env.sign[0]; x.drawImage(sg.cv, 0, 0, sg.cv.width, sg.cv.height, 2, 2, 16, 16); return; }
    if (def.parrot) { x.drawImage(this.G.renderer.parrot[0], 3, 4, 14, 14); return; }
    const sh = humanSheet(def.look);
    x.drawImage(sh.cv, 0, dir * FH, FW, 22, 0, 0, FW, 22);
  }
  async seq(steps) {
    for (const s of steps || []) {
      if (this.aborted) throw ABORT;
      if (Array.isArray(s)) await this.line(s[0], s[1]);
      else if (s && s.ask) await this.ask(s);
    }
  }
  async ask(s) {
    const asked = new Set();
    for (;;) {
      const opts = s.ask.map((a, k) => ({ label: a.q, k, cls: asked.has(k) ? 'asked' : 'ask' }));
      opts.push({ label: s.go || 'Continuer', next: true, cls: 'go' });
      const pick = await this.menu(opts, true);
      if (pick.next) return;
      asked.add(pick.k);
      await this.line('me', s.ask[pick.k].q, true);
      await this.seq(s.ask[pick.k].a);
    }
  }
  // une réplique : portrait actif, nom, texte tapé avec la voix du personnage ; clic / Espace pour finir puis continuer
  line(who, text, quick = false) {
    const G = this.G, me = who === 'me';
    const id = me ? null : who === 'npc' ? this.npcId : who;
    const def = id ? NPCS[id] : null;
    if (id && id !== this.npcId) { this.paint('sc-left', def, 2); $('sc-left-name').textContent = def ? def.name : ''; }
    else if (id) { this.paint('sc-left', NPCS[this.npcId], 2); $('sc-left-name').textContent = NPCS[this.npcId].name; }
    $('scene').classList.toggle('me', me);
    $('sc-name').textContent = me ? G.player.name : def ? def.name : '';
    const full = String(text).replace(/\{nom\}/g, G.player.name);
    const el = $('sc-text'), box = $('sc-choices');
    box.innerHTML = ''; $('sc-hint').classList.remove('on');
    el.textContent = '';
    let i = 0;
    const base = me ? 260 : voiceOf(id);
    clearInterval(this.typeT);
    return new Promise((res, rej) => {
      let typed = false;
      const finish = () => { clearInterval(this.typeT); el.textContent = full; typed = true; $('sc-hint').classList.add('on'); };
      this.typeT = setInterval(() => {
        i += quick ? 3 : 1;
        el.textContent = full.slice(0, i);
        if (i % 3 === 0 && /[a-zà-ÿ]/i.test(full[i] || '')) G.sfx.voice(base);
        if (i >= full.length) finish();
      }, quick ? 12 : 24);
      const t0 = performance.now();
      this.advance = () => { if (performance.now() - t0 < 160) return; if (!typed) { finish(); return; } this.advance = null; this.wait = null; res(); };
      this.wait = (v) => { this.advance = null; if (v === ABORT) rej(ABORT); };
    });
  }
  menu(opts, inline = false) {
    const box = $('sc-choices');
    box.innerHTML = '';
    $('sc-hint').classList.remove('on');
    if (!inline) { $('sc-name').textContent = ''; $('sc-text').textContent = ''; $('scene').classList.remove('me'); }
    return new Promise((res, rej) => {
      this.choices = opts;
      opts.forEach((c, k) => {
        const b = document.createElement('button');
        b.className = c.cls || '';
        b.innerHTML = `<span class="k">${k + 1}</span>${esc(c.label)}`;
        b.onclick = () => { this.G.sfx.play('click'); this.choices = null; this.wait = null; res(c); };
        box.appendChild(b);
      });
      this.wait = (v) => { this.choices = null; if (v === ABORT) rej(ABORT); };
    });
  }
  key(code) { // Espace / Entrée / clic : avancer ; 1-9 : choisir ; Échap : quitter la conversation
    if (!this.on) return false;
    if (code === 'Escape') { this.abort(); return true; }
    if (this.choices) { const m = /^Digit([1-9])$/.exec(code); if (m) { const b = $('sc-choices').children[+m[1] - 1]; if (b) b.click(); } return true; }
    if ((code === 'Space' || code === 'Enter' || code === 'KeyE' || code === 'MouseLeft') && this.advance) this.advance();
    return true;
  }
}
