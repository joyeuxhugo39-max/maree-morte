// Interface HTML : accueil, HUD, inventaire, quêtes, boutique, dialogues, chat, cartes.
import { ITEMS } from '../shared/data/items.js';
import { QUESTS, QUEST_ORDER, questState } from '../shared/data/quests.js';
import { NPCS } from '../shared/data/npcs.js';
import { SKILLS, HOTBAR, EMOTES } from '../shared/data/skills.js';
import { ZONES, Z, SAFE, roomIdAt, zoneAt } from '../shared/world.js';
import { T, SEEN_CELL } from '../shared/constants.js';
import { SLOTS, SLOT_NAMES, RARITY, INV_SIZE, MAP_W, OVER_H, TILE, clockString, dayFrac, darkness, weatherAt, isFullMoon } from '../shared/constants.js';
import { ACHIEVEMENTS } from '../shared/data/achievements.js';
import { UPG_SLOTS, UPG_MAX, upgradeCost, UPG_TEXT, reqLevel, ROLES, MAX_LEVEL } from '../shared/formulas.js';
import { STRUCTS, HOME_OK } from '../shared/data/craft.js';
import { iconURL } from './render/sprites-items.js';
import { MOBS } from '../shared/data/mobs.js';
import { slotFrameURL, plankURL, mouseURL, lockURL } from './render/ui-art.js';
import { humanSheet, SKINS, HAIRS, CLOTH, CLOTH_KEYS, FW, FH, mobSheet, portraitOf } from './render/sprites-chars.js';
import { MINI_COL } from './render/terrain.js';
import { social } from './social-ui.js';
import { tavernUI } from './tavern-ui.js';
import { PLACES, REP_LEVELS, repLevel, placeOf, buyPrice, sellPrice, taxOf, discountOf } from '../shared/data/places.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const STYLE_NAMES = { court: 'Court', long: 'Long', queue: 'Queue', chauve: 'Chauve', hirsute: 'Hirsute' };
const POI = [
  ['Port-Lanterne', 150, 96], ['Phare', 174, 92], ['Plage des Os Blanchis', 100, 118], ['Prairie des Murmures', 122, 78],
  ['Jungle de Brumesel', 104, 44], ['Ruines du Temple', 126, 20], ['Marais des Noyés', 40, 96], ['Cimetière', 33, 72], ["Crique de l'Épave", 30, 22],
  ['Havre-des-Brumes', 262, 64], ['Île au Crâne', 252, 160], ['Îlot de Cristal', 186, 186], ['Gouffre du Kraken', 208, 140],
  ['Rade-aux-Flibustiers', 408, 50], ['Fort des Deux Clés', 444, 118], ['Forêt des Pendus', 540, 20], ['Lagon des Sirènes', 516, 136],
  ["Îlot de l'Ermite", 352, 136], ['Anse-Tranquille', 150, 246], ['Atoll des Ossements', 70, 300], ['Île de la Quarantaine', 300, 296],
  ['Volcan de Cendrelune', 470, 292], ['Brumes Éternelles', 566, 236], ['Île des Damnés', 590, 370],
  ['LIBERTALIA', 800, 192], ['Fort des Hauts', 726, 140], ['Les Cannaies', 800, 98], ['Baie des Naufrageurs', 886, 112],
  ['Mangrove des Contrebandiers', 708, 336], ['Jungle Écarlate', 892, 272], ['Bas-Fonds', 842, 290],
];

export class UI {
  constructor(G) {
    this.G = G;
    this.open = null;
    this.sel = -1;
    this.lastMini = 0;
    this.chatIdleT = 0;
    this.buildMiniBase();
    this.bindPanels();
    this.bindChat();
    this.bindInventory();
    this.buildHotbar();
  }
  typing() { const a = document.activeElement; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT'); }

  // ------------------------------------------------------------ accueil
  showLogin(opts) {
    if (matchMedia('(hover: none) and (pointer: coarse)').matches) $('desktop-only').classList.remove('hidden');
    const L = { skin: 0, hair: 1, hairStyle: 'court', topCol: 'red', beard: 0, pants: 'brown', top: 'chemise' };
    try { Object.assign(L, JSON.parse(localStorage.getItem('mm_look') || '{}')); $('lg-name').value = localStorage.getItem('mm_name') || ''; } catch (e) { /* */ }
    this.look = L;
    const sw = (el, arr, key, colOf) => {
      el.innerHTML = '';
      arr.forEach((v, i) => {
        const d = document.createElement('div'); d.className = 'sw' + (L[key] === v ? ' on' : '');
        d.style.background = colOf(v, i);
        d.onclick = () => { L[key] = v; [...el.children].forEach((c) => c.classList.remove('on')); d.classList.add('on'); };
        el.appendChild(d);
      });
    };
    const chips = (el, arr, key, names) => {
      el.innerHTML = '';
      arr.forEach((v) => {
        const d = document.createElement('button'); d.className = 'chip' + (L[key] === v ? ' on' : ''); d.textContent = names[v] ?? v;
        d.onclick = () => { L[key] = v; [...el.children].forEach((c) => c.classList.remove('on')); d.classList.add('on'); };
        el.appendChild(d);
      });
    };
    sw($('opt-skin'), [0, 1, 2, 3], 'skin', (v) => hex(SKINS[v][2]));
    sw($('opt-hair'), [0, 1, 2, 3, 4, 5], 'hair', (v) => hex(HAIRS[v][1]));
    chips($('opt-style'), ['court', 'long', 'queue', 'hirsute', 'chauve'], 'hairStyle', STYLE_NAMES);
    sw($('opt-top'), CLOTH_KEYS.filter((k) => k !== 'white'), 'topCol', (v) => hex(CLOTH[v][2]));
    chips($('opt-beard'), [0, 1], 'beard', { 0: 'Non', 1: 'Oui' });
    const pv = $('lg-preview'), px = pv.getContext('2d');
    let t0 = performance.now();
    const anim = () => {
      if ($('login').classList.contains('hidden')) return;
      const t = (performance.now() - t0) / 1000;
      const sh = humanSheet(L);
      const dir = [0, 2, 3, 1][Math.floor(t / 1.6) % 4], fr = Math.floor(t * 7) % 4;
      px.clearRect(0, 0, 20, 28); px.imageSmoothingEnabled = false;
      px.drawImage(sh.cv, fr * FW, dir * FH, FW, FH, 0, 0, FW, FH);
      requestAnimationFrame(anim);
    };
    anim();
    if (opts.solo || opts.noPass) $('lg-pass-wrap').classList.add('hidden');
    if (opts.solo) { $('lg-note').textContent = 'Mode solo : votre progression est gardée dans ce navigateur.'; $('lg-go').textContent = '⚓ Jouer'; }
    if (opts.note) $('lg-note').textContent = opts.note;
    if (opts.offerSolo) $('lg-solo').classList.remove('hidden');
    const go = (solo) => {
      const name = $('lg-name').value.trim(), pass = $('lg-pass').value;
      try { localStorage.setItem('mm_look', JSON.stringify(L)); localStorage.setItem('mm_name', name); } catch (e) { /* */ }
      $('lg-err').textContent = '';
      opts.onSubmit({ name, pass, look: L, solo });
    };
    $('lg-go').onclick = () => go(!!opts.solo);
    $('lg-solo').onclick = () => go(true);
    for (const id of ['lg-name', 'lg-pass']) $(id).onkeydown = (e) => { if (e.key === 'Enter') go(!!opts.solo); };
    setTimeout(() => $('lg-name').focus(), 50);
  }
  loginError(msg) { $('lg-err').textContent = msg; }
  hideLogin() { $('login').classList.add('hidden'); $('hud').classList.remove('hidden'); document.activeElement && document.activeElement.blur && document.activeElement.blur(); }

  // ------------------------------------------------------------ panneaux
  bindPanels() {
    document.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => this.close()));
    document.querySelectorAll('[data-open]').forEach((b) => (b.onclick = () => this.toggle(b.dataset.open)));
    const muteIc = () => { $('mute-ic').src = iconURL('ui_bell', this.G.sfx.muted ? 'off' : ''); };
    $('mute').onclick = () => { this.G.sfx.setMuted(!this.G.sfx.muted); muteIc(); };
    muteIc();
    document.querySelectorAll('#menu-btns img[data-ic]').forEach((im) => { im.src = iconURL(im.dataset.ic); }); // 0.8.1 : icônes peintes
    $('respawn-btn').onclick = () => this.G.send({ t: 'respawn' });
    $('tracker').onclick = () => this.toggle('quests');
  }
  toggle(name) { if (this.open === name) this.close(); else this.show(name); }
  show(name) {
    if (this.tradeSt && name !== 'trade') return this.toast('Terminez ou annulez d’abord l’échange en cours.', 'warn');
    this.close();
    this.open = name;
    $('panel-' + name).classList.remove('hidden');
    if (name === 'inventory') this.renderInventory();
    if (name === 'quests') this.renderQuests();
    if (name === 'map') this.renderBigMap();
    if (name === 'forge') this.renderForge();
    if (name === 'ach') this.renderAch();
    if (name === 'codex') this.renderCodex();
    if (name === 'crew') this.renderCrew();
    if (name === 'settings') this.renderSettings();
    this.G.sfx.play('click');
  }
  close() {
    if (this.open === 'trade' && this.tradeSt) { this.G.send({ t: 'trade', a: 'cancel' }); this.tradeSt = null; } // fermer = annuler l'échange
    this.closeMenus();
    if (this.open) $('panel-' + this.open).classList.add('hidden');
    if (this.open === 'shop') this.shopNpc = null;
    if (this.open === 'tavern') { this.tavNpc = null; this.arm = null; }
    if (this.open === 'storage') { $('panel-inventory').classList.add('hidden'); $('panel-inventory').style.transform = ''; $('panel-storage').style.transform = ''; this.storageOpen = false; }
    this.open = null; this.sel = -1;
    $('tooltip').classList.add('hidden');
    $('dialog').classList.add('hidden');
    this.dialogNpc = null;
    $('sell-hint').textContent = 'Maj + clic : jeter';
  }
  anyOpen() { return !!this.open || !$('dialog').classList.contains('hidden'); }

  // ------------------------------------------------------------ HUD
  setPortrait(look) {
    const sh = humanSheet(look);
    for (const id of ['portrait', 'doll']) {
      const c = $(id), x = c.getContext('2d');
      x.clearRect(0, 0, c.width, c.height); x.imageSmoothingEnabled = false;
      x.drawImage(sh.cv, 0, 0, FW, c.height, 0, 0, FW, c.height);
    }
  }
  update(now) {
    const G = this.G, me = G.me;
    if (!me) return;
    if (now - (this.lastHud || 0) > 0.08) {
      this.lastHud = now;
      $('hp-fill').style.width = (me.hp / me.maxHp * 100).toFixed(1) + '%';
      $('hp-txt').textContent = `${me.hp} / ${me.maxHp}`;
      $('en-fill').style.width = (me.en / me.maxEn * 100).toFixed(1) + '%';
      $('en-txt').textContent = `${me.en} / ${me.maxEn}`;
      const airB = $('air-bar'); // 1.0 : l'air, sous la mer
      if (me.air >= 0 && me.airMax) { airB.classList.remove('hidden'); $('air-fill').style.width = (me.air / me.airMax * 100).toFixed(1) + '%'; $('air-txt').textContent = `🫧 Air ${me.air} / ${me.airMax}`; airB.classList.toggle('low', me.air <= 10); }
      else airB.classList.add('hidden');
      if (me.lvl >= MAX_LEVEL && me.gxpNext) { // 1.0 : la Gloire
        $('xp-fill').style.width = (me.glory >= 50 ? 100 : me.gxp / me.gxpNext * 100).toFixed(1) + '%';
        $('xp-txt').textContent = me.glory >= 50 ? `★ Gloire ${me.glory} — la plus haute` : `★ Gloire ${me.glory || 0} — ${me.gxp} / ${me.gxpNext}`;
        $('xpbar').classList.add('glory');
      } else {
        $('xp-fill').style.width = (me.xp / me.xpNext * 100).toFixed(1) + '%';
        $('xp-txt').textContent = `${me.xp} / ${me.xpNext} XP`;
        $('xpbar').classList.remove('glory');
      }
      $('hud-lvl').textContent = me.glory ? `${me.lvl} ★${me.glory}` : me.lvl;
      $('gold-n').textContent = me.gold; $('gold-mini').textContent = me.gold;
      const f = dayFrac(G.worldTime), d = darkness(f);
      const w = weatherAt(G.worldTime);
      $('clock').textContent = (w.kind === 2 ? '⛈ ' : w.kind === 1 ? '🌧 ' : d > 0.5 ? '☾ ' : '☀ ') + clockString(f);
      $('online').textContent = G.mode === 'solo' ? 'Mode solo' : `${G.online || 1} pirate${(G.online || 1) > 1 ? 's' : ''} en ligne`;
      $('ping').textContent = G.mode === 'online' && G.ping ? G.ping + ' ms' : '';
      const buffs = [];
      if (me.cry > 0) buffs.push(`⚔ Abordage ${Math.ceil(me.cry - (now - G.meAt))}s`);
      if (me.drunk > 0) buffs.push(`🍾 Ivre ${Math.max(0, Math.ceil(me.drunk - (now - G.meAt)))}s`);
      if (G.zone === Z.TOWN) buffs.push('🔥 Flamme Bénite');
      if (G.player && G.player.boat) buffs.push(`⛵ ${(ITEMS[G.player.boat] && ITEMS[G.player.boat].name) || 'Barque'}${me.hullMax ? ` — coque ${me.hull}/${me.hullMax}` : ''}${me.crewN ? ` — ${me.crewN} canonnier${me.crewN > 1 ? 's' : ''}` : ''}`);
      else if (me.ab) buffs.push(`⚓ Canonnier à bord${me.hullMax ? ` — coque ${me.hull}/${me.hullMax}` : ''} (clic droit : bordée)`);
      if (me.ride) buffs.push('🐎 En selle (C pour descendre)');
      const BN = { spd: '💨 Célérité', atk: '💪 Force du taureau', def: '🛡 Tonique de fer', chant: '🎶 Entrain' };
      for (const [k, s] of me.bf || []) { const left = Math.max(0, Math.ceil(s - (now - G.meAt))); if (left > 0) buffs.push(`${BN[k] || k} ${left}s`); }
      if (me.rc > 0) buffs.push(`🐚 Rappel… ${Math.max(0, me.rc - (now - G.meAt)).toFixed(1)}s`);
      if (now < (G.spyUntil || 0)) buffs.push(`🔭 Longue-vue ${Math.ceil(G.spyUntil - now)}s`);
      if (G.night) buffs.push(isFullMoon(G.worldTime) ? '🌕 Pleine lune : la Horde rôde' : '☾ Nuit');
      else if (isFullMoon(G.worldTime + 120)) buffs.push('🌕 Pleine lune ce soir');
      if (ZONES[G.zone] && ZONES[G.zone].hard) buffs.push('☠ Zone extrême');
      const dt = now - G.meAt, jb = []; // 1.0 : la justice
      const ev = G.wevt; // 1.0 : une invasion annoncée
      const ar = G.arena; // 1.0 : la Fosse
      if (ar && ar.run && G.room >= 0 && G.world.rooms[G.room].kind === 'fosse') jb.push(['wanted', `⚔ Fosse : vague ${ar.run.wave} — ${ar.run.left} adversaire${ar.run.left > 1 ? 's' : ''}`]);
      if (ar && ar.duel && G.room >= 0 && G.world.rooms[G.room].kind === 'fosse') jb.push(['wanted', `🤺 ${ar.duel.a} contre ${ar.duel.b}${ar.duel.fight ? '' : ` — paris ${ar.duel.pot[0]} / ${ar.duel.pot[1]}, ${Math.max(0, Math.ceil(ar.duel.at - (now - ar.t0)))} s`}`]);
      if (ev) jb.push(['wanted', ev.wave ? `☠ ${ev.name} : vague ${ev.wave}/3 — ${ev.left} morts` : `☠ Flotte maudite → ${ev.name} : ${this.mmss(Math.max(0, ev.in - (now - ev.at0)))}`]);
      if (me.jail > 0) jb.push(['jail', `⛓ Geôle ${this.mmss(Math.max(0, me.jail - dt))} · caution ${me.bail}`]);
      else if (me.wd) jb.push(['wanted', `☠ RECHERCHÉ${me.arrest ? ` — la garde ! ${Math.max(0, 10 - me.arrest)} s` : ''}`]);
      else if (me.inf >= 1) jb.push(['infamy', `Infamie ${Math.floor(me.inf)}/3`]);
      if (me.prot === -1 && !SAFE.has(G.zone)) jb.push(['prot', '🏳 Protégé (niv. < 10)']);
      else if (me.prot > 0) jb.push(['prot', `🏳 Pavillon blanc ${this.mmss(Math.max(0, me.prot - dt))}`]);
      if (this.lastProt !== !!me.prot) { this.lastProt = !!me.prot; this.setZone(G.zone, G.room >= 0 ? G.world.rooms[G.room] : null); }
      const bh = jb.map(([c, b]) => `<span class="buff ${c}">${esc(b)}</span>`).join('') + buffs.map((b) => `<span class="buff">${esc(b)}</span>`).join('');
      if (bh !== this.lastBuffs) { $('buffs').innerHTML = bh; this.lastBuffs = bh; }
      this.updateHotbar(now);
    }
    if (now - this.lastMini > 0.15) { this.lastMini = now; this.drawMini(); }
    if (this.chatIdleT && now - this.chatIdleT > 8 && !this.typing()) $('chat').classList.add('idle');
  }
  setZone(z, room) {
    const safe = SAFE.has(z);
    $('zone-name').textContent = room ? room.name : ZONES[z].name;
    $('zone-lvl').textContent = room ? (room.kind === 'cave' ? 'Grotte' : 'Intérieur') : ZONES[z].lvl;
    const pv = $('zone-pvp');
    const me = this.G.me || {};
    const jail = room && room.kind === 'prison';
    pv.textContent = jail ? '⛓ Geôle' : safe ? 'Zone sûre' : me.prot ? '⚔ JcJ — vous êtes protégé' : '⚔ JcJ';
    pv.className = jail ? 'pvp' : safe || me.prot ? 'safe' : 'pvp';
  }
  fade() { const f = $('fade'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
  banner(title, sub) {
    const b = $('banner');
    b.classList.add('hidden'); void b.offsetWidth;
    $('banner-title').textContent = title; $('banner-sub').textContent = sub;
    b.classList.remove('hidden');
    clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.classList.add('hidden'), 4300);
  }
  feed(msg, icon) {
    const box = $('lootfeed');
    const el = document.createElement('div'); el.className = 'feed';
    if (icon) { const im = document.createElement('img'); im.src = icon; el.appendChild(im); }
    const sp = document.createElement('span'); sp.textContent = msg; el.appendChild(sp);
    box.appendChild(el);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, 3200);
  }
  toast(msg, kind = 'info', icon = null) {
    if (kind === 'loot') return this.feed(msg, icon);
    if (this.G.aide !== 'complet' && (kind === 'info' || kind === 'quest') && /ZQSD|\(touche E\)|clic gauche/.test(msg)) return;
    const box = $('toasts');
    // 1.0 : moins envahissant — un message répété s'additionne au lieu de s'empiler, trois au plus à l'écran
    const same = [...box.children].find((c) => c.dataset.msg === msg && !c.classList.contains('out'));
    if (same) { same.dataset.n = (+same.dataset.n || 1) + 1; same.querySelector('span').textContent = `${msg} ×${same.dataset.n}`; clearTimeout(same._t); same._t = setTimeout(() => { same.classList.add('out'); setTimeout(() => same.remove(), 450); }, 2600); return; }
    const el = document.createElement('div'); el.className = 'toast ' + kind; el.dataset.msg = msg;
    if (icon) { const im = document.createElement('img'); im.src = icon; el.appendChild(im); }
    const sp = document.createElement('span'); sp.textContent = msg; el.appendChild(sp);
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    el._t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 450); }, kind === 'quest' || kind === 'level' ? 4200 : 2600);
  }
  // ------------------------------------------------------------ cinématiques, encre, confirmation, crochetage
  tuto(html) { const el = $('tuto'); if (!el) return; if (html === this.tutoHtml) return; this.tutoHtml = html; if (!html) { el.classList.remove('on'); return; } el.innerHTML = html; el.classList.add('on'); }
  // 1.0 : annonce de maintenance, avec compte à rebours dans le bandeau
  maintenance(mt) {
    clearInterval(this.maintT);
    if (!mt) { this.toast('Maintenance annulée.', 'info'); return; }
    const tick = () => { const s = Math.max(0, Math.round((mt.at - Date.now()) / 1000)); this.maintText = s > 0 ? `⚓ Maintenance dans ${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s — ${mt.msg}` : `⚓ Maintenance : ${mt.msg}`; const el = document.getElementById('maint'); if (el) { el.textContent = this.maintText; el.classList.remove('hidden'); } if (s <= 0) clearInterval(this.maintT); };
    tick(); this.maintT = setInterval(tick, 1000);
    this.toast(`Maintenance prévue : ${mt.msg}`, 'warn');
  }
  cine(on) { document.body.classList.toggle('cine', !!on); if (!on) { this.cineTitle(null); this.cineSub(''); } }
  cineTitle(name, tag, cls = '') {
    const el = $('cine-title');
    if (!name) { el.classList.add('hidden'); return; }
    $('cine-name').textContent = name; $('cine-tag').textContent = tag || '';
    el.className = 'hidden'; void el.offsetWidth; el.className = cls;
  }
  cineSub(text) { const el = $('cine-sub'); if (!text) { el.classList.remove('on'); return; } el.textContent = text; el.classList.add('on'); }
  ink(on) { if (on !== this.inkOn) { this.inkOn = on; $('ink').classList.toggle('on', !!on); } }
  confirm(html, yes) {
    this.close();
    $('cf-text').innerHTML = html; $('confirm').classList.remove('hidden'); this.cf = yes || (() => {});
    $('cf-yes').onclick = () => this.confirmEnd(true); $('cf-no').onclick = () => this.confirmEnd(false);
  }
  confirmEnd(ok) { const f = this.cf; this.cf = null; $('confirm').classList.add('hidden'); if (ok && f) f(); }
  // trois goupilles : arrêter l'aiguille dans le vert, trois fois de suite
  lockpick(name, lock, done) {
    this.close();
    $('lockpick').classList.remove('hidden');
    $('lp-sub').textContent = `Maison de ${name}` + (lock ? ` · serrure renforcée (${lock}/2)` : '');
    $('lp-pins').innerHTML = '<div class="lp-pin"></div><div class="lp-pin"></div><div class="lp-pin"></div>';
    const st = this.lp = { n: 0, pos: 0, dir: 1, speed: 0.85 + lock * 0.3, zone: [0, 0], done };
    st.newZone = () => { const w = Math.max(0.08, 0.25 - lock * 0.05 - st.n * 0.035), a = 0.08 + Math.random() * (0.84 - w); st.zone = [a, a + w]; $('lp-zone').style.left = (a * 100) + '%'; $('lp-zone').style.width = (w * 100) + '%'; };
    st.newZone();
    $('lockpick').onmousedown = (e) => { e.preventDefault(); this.lockpickPress(); };
  }
  lockpickTick(dt) {
    const st = this.lp; if (!st) return;
    st.pos += st.dir * st.speed * (1 + st.n * 0.3) * dt;
    if (st.pos > 1) { st.pos = 1; st.dir = -1; } if (st.pos < 0) { st.pos = 0; st.dir = 1; }
    $('lp-needle').style.left = (st.pos * 100) + '%';
  }
  lockpickPress() {
    const st = this.lp; if (!st) return;
    if (st.pos >= st.zone[0] && st.pos <= st.zone[1]) {
      $('lp-pins').children[st.n].classList.add('ok'); st.n++; this.G.sfx.play('pin');
      if (st.n >= 3) setTimeout(() => this.lockpickEnd(true), 220); else st.newZone();
    } else this.lockpickEnd(false);
  }
  lockpickEnd(ok) { const st = this.lp; if (!st) return; this.lp = null; $('lockpick').classList.add('hidden'); st.done(ok); }
  hurtFlash() { const v = $('vignette'); v.classList.add('hurt'); clearTimeout(this.hurtT); this.hurtT = setTimeout(() => v.classList.remove('hurt'), 120); }
  mmss(s) { s = Math.ceil(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
  showDeath(lost, by, jail, pk) {
    $('death-txt').textContent = `${by ? `Terrassé par : ${by}. ` : ''}${lost ? `Vous perdez ${lost} doublon${lost > 1 ? 's' : ''}.` : pk ? 'Pas d’acharnement : vous ne perdez rien.' : 'Vous ne perdez rien.'}${jail ? ` Direction la Geôle de Port-Lanterne (${jail} s).` : pk ? ' Pavillon blanc pendant deux minutes à votre retour.' : ''}`;
    $('death').classList.remove('hidden');
  }
  hideDeath() { $('death').classList.add('hidden'); }

  // ------------------------------------------------------------ barre de compétences
  buildHotbar() {
    const hb = $('hotbar');
    hb.innerHTML = '';
    hb.style.backgroundImage = `url(${plankURL()})`;
    document.documentElement.style.setProperty('--slot', `url(${slotFrameURL('brass')})`);
    document.documentElement.style.setProperty('--slot-gold', `url(${slotFrameURL('gold')})`);
    this.hk = {};
    const group = () => { const g = document.createElement('div'); g.className = 'hb-group'; hb.appendChild(g); return g; };
    const sep = () => { const d = document.createElement('div'); d.className = 'hb-sep'; hb.appendChild(d); };
    const slot = (parent, id, icon, key, tip, click, cls = '') => {
      const el = document.createElement('div'); el.className = 'hk ' + cls;
      el.innerHTML = `<img class="ic" src="${icon}"><span class="key">${key}</span><div class="cd"></div><span class="cdt"></span><span class="lv"><img src="${lockURL()}"><b></b></span>`;
      el.onmouseenter = (e) => this.tip(e, tip());
      el.onmouseleave = () => this.untip();
      el.onclick = click;
      parent.appendChild(el);
      this.hk[id] = el;
      return el;
    };
    const skTip = (id) => () => { const s = SKILLS[id]; return `<div class="tn">${esc(s.name)}</div><div class="tt">${esc(s.key)} · ${s.cost ? s.cost + ' énergie · ' : ''}recharge ${s.cd}s</div><div class="td">${esc(s.desc)}</div>${s.lvl > 1 ? `<div class="tv">Niveau ${s.lvl} requis</div>` : ''}`; };
    const eqTip = (slotName, label) => () => { const id = this.G.eq && this.G.eq[slotName]; return id ? this.itemTip(id, 1, 'eq') + `<div class="tv">${label}</div>` : `<div class="tn">${slotName === 'gun' ? 'Aucune arme à feu' : 'Mains nues'}</div><div class="td">${slotName === 'gun' ? 'Équipez un pistolet ou un fusil (inventaire, I).' : 'Équipez une arme (inventaire, I).'}</div>`; };
    const g1 = group();
    slot(g1, 'slash', iconURL('sk_slash'), `<img src="${mouseURL('L')}">`, eqTip('weapon', 'Clic gauche : frapper vers le curseur'), () => this.G.useSkill('slash', true), 'hbeq');
    slot(g1, 'shot', iconURL('sk_shot'), `<img src="${mouseURL('R')}">`, eqTip('gun', 'Clic droit ou 1 : tirer'), () => this.G.useSkill('shot', true), 'hbeq');
    sep();
    const g2 = group();
    for (const em of EMOTES) slot(g2, 'em_' + em.id, iconURL(em.icon), em.key, () => `<div class="tn">${esc(em.name)}</div><div class="tt">Touche ${em.key} · émote</div><div class="td">${esc(em.desc)}</div>`, () => this.G.emote(em.id), 'hbem');
    sep();
    const g3 = group();
    slot(g3, 'roll', iconURL(SKILLS.roll.icon), '␣', skTip('roll'), () => this.G.useSkill('roll', true));
    const food = slot(g3, 'food', iconURL('banana'), 'F', () => '<div class="tn">Manger / boire</div><div class="td">Utilise le soin le plus adapté de votre sac.</div>', () => this.G.send({ t: 'eat' }));
    const cnt = document.createElement('span'); cnt.className = 'cnt'; cnt.id = 'food-n'; cnt.textContent = '0'; food.appendChild(cnt);
    this.hbEq = {};
  }
  updateHotbar(now) {
    const G = this.G, me = G.me, eq = G.eq || {};
    // l'emplacement des armes montre l'arme équipée
    for (const [id, s] of [['slash', 'weapon'], ['shot', 'gun']]) {
      if (this.hbEq[s] === eq[s]) continue;
      this.hbEq[s] = eq[s];
      const it = eq[s] && ITEMS[eq[s]];
      this.hk[id].querySelector('.ic').src = it ? iconURL(it.icon, it.tint) : iconURL(id === 'slash' ? 'sk_fists' : 'sk_shot');
      this.hk[id].classList.toggle('empty', !it);
    }
    const boat = G.player && G.player.boat && ITEMS[G.player.boat] && ITEMS[G.player.boat].boat;
    for (const id of HOTBAR) {
      const el = this.hk[id], s = SKILLS[id];
      if (!el) continue;
      const needLvl = me.lvl < s.lvl;
      const locked = !!(needLvl || (s.needGun && !eq.gun && !(boat && boat.cannon)));
      el.classList.toggle('locked', locked);
      el.querySelector('.lv b').textContent = needLvl ? s.lvl : '';
      el.querySelector('.lv').style.display = needLvl ? '' : 'none';
      el.classList.toggle('noen', !locked && me.en < s.cost);
      const ready = G.cd[id] || 0, total = G.cdTotal[id] || 1;
      const left = Math.max(0, ready - now);
      el.querySelector('.cd').style.setProperty('--cd', (left / total * 100).toFixed(1) + '%');
      const t = left > 0.95 ? String(Math.ceil(left)) : '';
      const cdt = el.querySelector('.cdt'); if (cdt.textContent !== t) cdt.textContent = t;
    }
    for (const em of EMOTES) { // les émotes : une courte recharge, sans niveau ni énergie
      const el = this.hk['em_' + em.id]; if (!el) continue;
      el.querySelector('.lv').style.display = 'none';
      const left = Math.max(0, (G.cd['em_' + em.id] || 0) - now);
      el.querySelector('.cd').style.setProperty('--cd', (left / 1.2 * 100).toFixed(1) + '%');
    }
    let food = 0;
    for (const s of G.inv || []) if (s && ITEMS[s.id].use && ITEMS[s.id].use.heal) food += s.n;
    $('food-n').textContent = food;
    this.hk.food.classList.toggle('locked', !food);
  }
  flashSkill(id) { const el = this.hk[id]; if (!el) return; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 150); }

  // ------------------------------------------------------------ infobulles
  tip(e, html) {
    const t = $('tooltip');
    t.innerHTML = html; t.classList.remove('hidden');
    const r = e.currentTarget.getBoundingClientRect();
    let x = r.right + 8, y = r.top;
    const w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > innerWidth - 4) x = r.left - w - 8;
    if (y + h > innerHeight - 4) y = innerHeight - h - 4;
    if (x < 4) { x = Math.max(4, r.left); y = r.top - h - 6; }
    t.style.left = x + 'px'; t.style.top = Math.max(4, y) + 'px';
  }
  untip() { $('tooltip').classList.add('hidden'); }
  itemTip(id, n, ctx) {
    const it = ITEMS[id]; if (!it) return '';
    const r = RARITY[it.rarity || 0];
    const lines = [];
    if (it.slot) { const need = reqLevel(it), my = this.G.me ? this.G.me.lvl : 1; lines.push(`<div class="${my >= need ? 'tt' : 'tw'}">Niveau requis : ${need}${my < need ? ' (vous êtes niveau ' + my + ')' : ''}</div>`); }
    const stat = (k, label, pct) => { if (it[k]) lines.push(`<div class="ts">+${pct ? Math.round(it[k] * 100) + ' %' : it[k]} ${label}</div>`); };
    stat('atk', 'attaque'); stat('gun', 'puissance de tir'); stat('def', 'défense'); stat('hp', 'PV max'); stat('crit', 'coup critique', true); stat('spd', 'vitesse', true); stat('regen', 'régénération PV/s');
    if (it.role && ROLES[it.role]) lines.push(`<div class="trole"><b>${ROLES[it.role][0]}</b> — ${ROLES[it.role][1]}</div>`); // 1.0 : le rôle de l'arme
    if (it.slot === 'weapon') lines.push(`<div class="tt">≈ ${Math.round(it.atk / (it.speed || 0.5))} dégâts de base par seconde</div>`);
    else if (it.slot === 'gun' && it.shot) lines.push(`<div class="tt">≈ ${Math.round(it.gun * (it.shot.n || 1) * (it.shot.burst || 1) / (it.cdMul || 1))} dégâts de base par seconde${(it.shot.n || 1) > 2 ? ' (si tout touche)' : ''}</div>`);
    if (it.slot === 'weapon') {
      const reach = it.reach || 27, arc = it.arc || 1.15;
      lines.push(`<div class="tt">Cadence ${String(it.speed || 0.5).replace('.', ',')} s · portée ${reach < 25 ? 'courte' : reach <= 30 ? 'moyenne' : 'longue'} · ${arc < 0.8 ? 'estocade' : arc > 1.6 ? 'balayage très large' : arc > 1.25 ? 'balayage large' : 'taille'}</div>`);
      if (it.kb && it.kb > 1) lines.push(`<div class="ts">Repousse ${it.kb >= 2.5 ? 'très ' : ''}fort</div>`);
      if (it.bleed) lines.push(`<div class="ts">Saignement : ${Math.round(it.bleed * 100)} % des dégâts en 3 s</div>`);
      if (it.leech) lines.push(`<div class="ts">Vol de vie : ${Math.round(it.leech * 100)} %</div>`);
    }
    if (it.shot) {
      const s = it.shot;
      lines.push(`<div class="tt">${s.n > 1 ? s.n + ' projectiles · ' : ''}${s.burst ? 'rafale de ' + s.burst + ' · ' : ''}portée ${s.range < 110 ? 'courte' : s.range < 230 ? 'moyenne' : 'longue'} (${s.range})${it.cdMul && it.cdMul !== 1 ? ` · recharge ×${String(it.cdMul).replace('.', ',')}` : ''}</div>`);
      if (s.pierce) lines.push(`<div class="ts">Traverse ${s.pierce} ennemi${s.pierce > 1 ? 's' : ''}</div>`);
      if (s.explode) lines.push(`<div class="ts">Explose à l'impact</div>`);
      if (s.burn) lines.push(`<div class="ts">Enflamme : ${Math.round(s.burn * 100)} % des dégâts en 3 s</div>`);
      if (s.bleed) lines.push(`<div class="ts">Saignement : ${Math.round(s.bleed * 100)} % des dégâts en 3 s</div>`);
      if (s.kb) lines.push(`<div class="ts">Repousse</div>`);
    }
    if (it.use && (it.use.heal || it.use.en)) { const u = it.use; lines.push(`<div class="ts">${u.heal ? '+' + u.heal + ' PV ' : ''}${u.en ? '+' + u.en + ' énergie ' : ''}${u.drunk ? '(ivresse)' : ''}</div>`); }
    if (it.use && it.use.combine) lines.push(`<div class="ts">Fragments : ${this.G.countItem(id)} / ${it.use.combine}</div>`);
    // 0.8 : effets des armes, montures, voyages et potions
    const fx = it.shot || it, pc = (v) => Math.round(v * 100) + ' %', sec = (v) => String(v).replace('.', ',') + ' s';
    if (fx.slow) lines.push(`<div class="ts">Ralentit la cible de ${pc(fx.slow[0])} (${sec(fx.slow[1])})</div>`);
    if (fx.frost) lines.push(`<div class="ts">Gel : −${pc(fx.frost[0])} de vitesse, attaques freinées (${sec(fx.frost[1])})</div>`);
    if (fx.poison) lines.push(`<div class="ts">Poison : ${pc(fx.poison)} des dégâts en 4 s, cumulable trois fois</div>`);
    if (fx.stun) lines.push(`<div class="ts">${pc(fx.stun[0])} de chances d'étourdir (${sec(fx.stun[1])})</div>`);
    if (fx.chain) lines.push(`<div class="ts">Foudre : saute sur ${fx.chain[0]} ennemi${fx.chain[0] > 1 ? 's' : ''} voisin${fx.chain[0] > 1 ? 's' : ''} (${pc(fx.chain[1])} des dégâts)</div>`);
    if (fx.pull) lines.push(`<div class="ts">Ramène la cible jusqu'à vous</div>`);
    if (fx.fear) lines.push(`<div class="ts">${pc(fx.fear[0])} de chances de faire fuir (${sec(fx.fear[1])})</div>`);
    if (fx.curse) lines.push(`<div class="ts">Malédiction : +${pc(fx.curse[1])} de dégâts subis (${sec(fx.curse[0])})</div>`);
    if (fx.execute) lines.push(`<div class="ts">+${pc(fx.execute[1])} de dégâts sur une cible sous ${pc(fx.execute[0])} de vie</div>`);
    if (fx.midas) lines.push(`<div class="ts">${pc(fx.midas)} de chances de faire tomber de l'or ; +50 % de doublons sur vos victimes</div>`);
    if (fx.charge) lines.push(`<div class="ts">Élan : vous bondissez en frappant ; en selle, ×1,5 sans descendre</div>`);
    if (fx.ricochet) lines.push(`<div class="ts">Ricoche sur ${fx.ricochet} ennemis de plus</div>`);
    if (fx.boomer) lines.push(`<div class="ts">Revient au lanceur, et frappe au retour</div>`);
    if (fx.homing) lines.push(`<div class="ts">Les balles cherchent leur cible</div>`);
    if (it.leech && it.slot !== 'weapon') lines.push(`<div class="ts">Vol de vie : ${pc(it.leech)}</div>`);
    if (it.goldFind) lines.push(`<div class="ts">+${pc(it.goldFind)} de doublons sur les morts</div>`);
    if (it.curseOnHit) lines.push(`<div class="ts">${pc(it.curseOnHit)} de chances de maudire la cible</div>`);
    if (it.mount) lines.push(`<div class="ts">En selle : vitesse +${pc(it.mount.speed - 1)}${it.mount.def ? ', défense +' + it.mount.def : ''}${it.mount.regen ? ', régénération +' + it.mount.regen : ''}</div><div class="tt">Touche C : monter ou descendre</div>`);
    if (it.boat) lines.push(`<div class="ts">Vitesse ${it.boat.speed}${it.boat.cannon ? ' · ' + it.boat.cannon + ' canon' + (it.boat.cannon > 1 ? 's' : '') + ' par bordée' : ''}</div>`);
    if (it.use && it.use.buff) lines.push(`<div class="ts">${{ spd: 'Vitesse', atk: 'Attaque et tir', def: 'Défense' }[it.use.buff]} +${pc(it.use.v)} pendant ${it.use.dur} s</div>`);
    if (it.use && it.use.cleanse) lines.push(`<div class="ts">Guérit poison, saignements et brûlures</div>`);
    const up = ctx === 'eq' && it.slot && this.G.me && this.G.me.upg ? this.G.me.upg[it.slot] || 0 : 0;
    if (up) lines.push(`<div class="ts">Renforcement +${up} (${UPG_TEXT[it.slot]} ×${up})</div>`);
    let cmp = '';
    if (it.slot && this.G.eq && ctx !== 'eq') {
      const cur = this.G.eq[it.slot] && ITEMS[this.G.eq[it.slot]];
      const k = it.slot === 'weapon' ? 'atk' : it.slot === 'gun' ? 'gun' : 'def';
      const a = it[k] || 0, b = cur ? cur[k] || 0 : 0;
      if (a !== b) cmp = `<div class="${a > b ? 'better' : 'worse'}">${a > b ? '▲' : '▼'} ${Math.abs(a - b)} par rapport à l'équipement actuel</div>`;
    }
    const type = it.slot ? SLOT_NAMES[it.slot] : it.boat ? 'Bateau' : it.tool ? 'Outil' : it.use ? 'Consommable' : it.quest ? 'Objet de quête' : it.place ? 'Mobilier' : 'Objet de valeur';
    const place = this.shopNpc ? this.shopPlace() : null, rl = repLevel(((this.G.me && this.G.me.rep) || {})[place] || 0);
    const sell = it.quest ? 'Ne se vend pas' : `Revente : ${place ? sellPrice(it.value, place, rl) : Math.max(1, Math.floor(it.value * 0.35))} doublons${place ? ' (taxe comprise)' : ''}`;
    return `<div class="tn" style="color:${r.color}">${esc(it.name)}${up ? ' +' + up : ''}${n > 1 ? ' ×' + n : ''}</div><div class="tt">${type} · ${r.name}</div>${lines.join('')}${cmp}<div class="td">${esc(it.desc || '')}</div><div class="tv">${ctx === 'shop' ? 'Prix : ' + buyPrice(it.value, rl) + ' doublons' : sell}</div>`;
  }

  // ------------------------------------------------------------ inventaire
  bindInventory() {
    const bag = $('bag');
    this.invFilter = 'all';
    const tabs = [['all', 'Tout'], ['equip', 'Équipement'], ['use', 'Consommables'], ['quest', 'Quête'], ['misc', 'Divers']];
    for (const [k, label] of tabs) { const b = document.createElement('button'); b.textContent = label; b.dataset.k = k; b.onclick = () => { this.invFilter = k; this.renderInventory(); }; $('bag-tabs').appendChild(b); }
    $('bag-sort').onclick = () => { this.G.send({ t: 'sort' }); this.G.sfx.play('click'); };
    const trash = $('bag-trash');
    trash.ondragover = (e) => { e.preventDefault(); trash.classList.add('over'); };
    trash.ondragleave = () => trash.classList.remove('over');
    trash.ondrop = (e) => { e.preventDefault(); trash.classList.remove('over'); this.dropItem(+e.dataTransfer.getData('text/plain')); };
    for (let i = 0; i < INV_SIZE; i++) {
      const s = document.createElement('div'); s.className = 'slot'; s.dataset.i = i;
      s.onclick = (e) => this.bagClick(i, e);
      s.oncontextmenu = (e) => { e.preventDefault(); this.bagUse(i); };
      s.onmouseenter = (e) => { const it = this.G.inv && this.G.inv[i]; if (it) this.tip(e, this.itemTip(it.id, it.n)); };
      s.onmouseleave = () => this.untip();
      s.draggable = true;
      s.ondragstart = (e) => { e.dataTransfer.setData('text/plain', String(i)); e.dataTransfer.effectAllowed = 'move'; };
      s.ondragend = (e) => { // lâché hors de toute fenêtre : l'objet tombe au sol
        if (e.dataTransfer.dropEffect !== 'none' || this.shopNpc || this.storageOpen) return;
        const inside = [...document.querySelectorAll('.panel:not(.hidden)')].some((p) => { const r = p.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; });
        if (!inside && e.clientX > 0 && e.clientY > 0) this.dropItem(i);
      };
      s.ondragover = (e) => e.preventDefault();
      s.ondrop = (e) => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); if (from !== i) this.G.send({ t: 'swap', a: from, b: i }); };
      bag.appendChild(s);
    }
    document.querySelectorAll('.eslot').forEach((el) => {
      el.dataset.label = SLOT_NAMES[el.dataset.slot];
      el.onclick = () => this.G.send({ t: 'unequip', s: el.dataset.slot });
      el.oncontextmenu = (e) => { e.preventDefault(); this.G.send({ t: 'unequip', s: el.dataset.slot }); };
      el.onmouseenter = (e) => { const id = this.G.eq && this.G.eq[el.dataset.slot]; if (id) this.tip(e, this.itemTip(id, 1, 'eq') + '<div class="tt">Clic : retirer</div>'); };
      el.onmouseleave = () => this.untip();
      el.ondragover = (e) => e.preventDefault();
      el.ondrop = (e) => { e.preventDefault(); const from = +e.dataTransfer.getData('text/plain'); const it = this.G.inv[from]; if (it && ITEMS[it.id].slot === el.dataset.slot) this.G.send({ t: 'equip', slot: from }); };
    });
  }
  // lâcher un objet : une quantité pour les piles, une confirmation pour les objets rares
  dropItem(i) {
    const G = this.G, it = G.inv && G.inv[i];
    if (!it) return;
    const def = ITEMS[it.id];
    if (def.quest) { this.toast('Un objet de quête ne se jette pas.', 'warn'); return; }
    const go = (n) => { G.send({ t: 'drop', slot: i, n }); this.untip(); };
    if (it.n > 1) {
      $('qty-text').innerHTML = `Lâcher combien de <b>${esc(def.name)}</b> ? (vous en avez ${it.n})`;
      const inp = $('qty-n'); inp.max = it.n; inp.value = it.n; $('qty').classList.remove('hidden'); setTimeout(() => inp.select(), 30);
      const end = (n) => { $('qty').classList.add('hidden'); if (n > 0) go(Math.min(it.n, n)); };
      $('qty-all').onclick = () => end(it.n); $('qty-ok').onclick = () => end(Math.max(1, +inp.value | 0)); $('qty-no').onclick = () => end(0);
      inp.onkeydown = (e) => { if (e.key === 'Enter') end(Math.max(1, +inp.value | 0)); if (e.key === 'Escape') end(0); e.stopPropagation(); };
      return;
    }
    if ((def.rarity || 0) >= 2) { const open = this.open; this.confirm(`Lâcher <b style="color:${RARITY[def.rarity].color}">${esc(def.name)}</b> au sol ? N'importe qui pourra le ramasser.`, () => { go(1); if (open) this.show(open); }); return; }
    go(1);
  }
  bagClick(i, e) {
    const G = this.G;
    if (e.shiftKey && G.inv[i]) { if (this.shopNpc) G.send({ t: 'sell', slot: i }); else this.dropItem(i); this.untip(); return; }
    if (this.sel >= 0 && this.sel !== i) { G.send({ t: 'swap', a: this.sel, b: i }); this.sel = -1; this.renderInventory(); return; }
    if (this.sel === i) { this.sel = -1; this.renderInventory(); return; }
    if (G.inv[i]) { this.sel = i; this.renderInventory(); }
  }
  bagUse(i) {
    const G = this.G, it = G.inv[i];
    if (!it) return;
    if (this.shopNpc) { G.send({ t: 'sell', slot: i }); return; }
    if (this.storageOpen) { G.send({ t: 'stor', a: 'put', slot: i }); return; }
    if (ITEMS[it.id].place) { this.close(); G.startBuild(it.id); return; }
    G.send({ t: 'use', slot: i });
    this.untip();
  }
  renderInventory() {
    const G = this.G;
    const slots = $('bag').children;
    const cat = (id) => { const d = ITEMS[id]; return d.quest ? 'quest' : d.slot || d.boat ? 'equip' : d.use ? 'use' : 'misc'; };
    const f = this.invFilter || 'all';
    document.querySelectorAll('#bag-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.k === f));
    for (let i = 0; i < INV_SIZE; i++) {
      const el = slots[i], it = G.inv && G.inv[i];
      el.className = 'slot' + (i === this.sel ? ' sel' : '') + (it && ITEMS[it.id].rarity ? ' r' + ITEMS[it.id].rarity : '') + (f !== 'all' && (!it || cat(it.id) !== f) ? ' dim' : '');
      el.innerHTML = it ? `<img src="${iconURL(ITEMS[it.id].icon, ITEMS[it.id].tint)}">${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}` : '';
    }
    document.querySelectorAll('.eslot').forEach((el) => {
      const id = G.eq && G.eq[el.dataset.slot];
      el.className = 'eslot' + (id ? ' full' : '') + (id && ITEMS[id].rarity ? ' r' + ITEMS[id].rarity : '');
      const up = G.me && G.me.upg ? G.me.upg[el.dataset.slot] || 0 : 0;
      el.innerHTML = id ? `<img src="${iconURL(ITEMS[id].icon, ITEMS[id].tint)}">${up ? `<span class="n">+${up}</span>` : ''}` : '';
    });
    const st = G.me && G.me.st;
    if (st) {
      $('stats').innerHTML = [
        ['PV max', G.me.maxHp], ['Énergie', G.me.maxEn], ['Attaque', st.atk], ['Tir', st.gun || '—'], ['Défense', st.def],
        ['Critique', st.crit + ' %'], ['Vitesse', st.speed], ['Régén.', st.regen + '/s'], ['Doublons', G.me.gold], ['Victimes', G.me.kills || 0],
      ].map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('');
    }
  }

  // ------------------------------------------------------------ quêtes
  questStateOf(qid) {
    const G = this.G;
    const st = questState(qid, G.quests || {}, G.me ? G.me.lvl : 1);
    if (st === 'active' && this.goalsDone(qid)) return 'ready';
    return st;
  }
  goalProgress(qid) {
    const G = this.G, q = QUESTS[qid], st = (G.quests || {})[qid];
    return q.goals.map((g, i) => {
      if (g.type === 'collect') return [Math.min(g.n, G.countItem(g.item)), g.n];
      const need = g.n || 1;
      return [Math.min(need, st && st.p ? st.p[i] || 0 : 0), need];
    });
  }
  goalsDone(qid) { return this.goalProgress(qid).every(([a, b]) => a >= b); }
  renderTracker() {
    const G = this.G, html = [];
    if (G.treasure) html.push('<div class="track"><b>✗ Carte au trésor</b><div>Suivez la flèche et creusez sur la croix (E).</div></div>');
    const tracked = (G.track || []).filter((q) => G.quests && G.quests[q] && G.quests[q].s === 'active');
    const order = tracked.length ? tracked : QUEST_ORDER; // les quêtes suivies, sinon les premières en cours
    for (const qid of order) {
      const st = G.quests && G.quests[qid];
      if (!st || st.s !== 'active') continue;
      const q = QUESTS[qid], prog = this.goalProgress(qid), ready = prog.every(([a, b]) => a >= b);
      html.push(`<div class="track" data-q="${qid}"><b>${tracked.includes(qid) ? '<span class="star">★</span> ' : ''}${esc(q.name)}</b>${ready ? `<div class="ready">✔ Retournez voir ${esc(NPCS[q.turnin].name)}</div>` : q.goals.map((g, i) => `<div class="${prog[i][0] >= prog[i][1] ? 'ok' : ''}">${prog[i][0] >= prog[i][1] ? '✔' : '•'} ${esc(g.text)}${prog[i][1] > 1 ? ` ${prog[i][0]}/${prog[i][1]}` : ''}</div>`).join('')}</div>`);
    }
    if (!html.length) {
      const next = QUEST_ORDER.find((q) => this.questStateOf(q) === 'available');
      if (next) html.push(`<div class="track"><b>Nouvelle quête disponible</b><div>${esc(NPCS[QUESTS[next].giver].name)} a du travail pour vous (!)</div></div>`);
    }
    $('tracker').innerHTML = html.slice(0, tracked.length ? Math.max(tracked.length, 1) + (G.treasure ? 1 : 0) : this.G.aide === 'complet' ? 3 : 1).join('');
    $('tracker').querySelectorAll('.track[data-q]').forEach((el) => (el.onclick = () => { this.show('quests'); this.renderQuests(el.dataset.q); }));
    if (this.open === 'quests') this.renderQuests();
  }
  renderQuests(sel) {
    const G = this.G;
    if (sel) this.qsel = sel;
    const groups = { active: [], available: [], done: [] };
    for (const qid of QUEST_ORDER) {
      const s = this.questStateOf(qid);
      if (s === 'active' || s === 'ready') groups.active.push([qid, s]);
      else if (s === 'available') groups.available.push([qid, s]);
      else if (s === 'done') groups.done.push([qid, s]);
    }
    const track = G.track || [];
    groups.active.sort((a, b) => (track.includes(b[0]) ? 1 : 0) - (track.includes(a[0]) ? 1 : 0) || (b[1] === 'ready' ? 1 : 0) - (a[1] === 'ready' ? 1 : 0));
    if (sel) this.qtab = groups.active.some(([q]) => q === sel) ? 'active' : groups.available.some(([q]) => q === sel) ? 'available' : 'done';
    if (!this.qtab || !groups[this.qtab].length) this.qtab = ['active', 'available', 'done'].find((k) => groups[k].length) || 'active';
    const tabs = $('qtabs');
    tabs.innerHTML = '';
    for (const [k, label] of [['active', 'En cours'], ['available', 'Disponibles'], ['done', 'Terminées']]) {
      const b = document.createElement('button'); b.textContent = `${label} (${groups[k].length})`; b.className = this.qtab === k ? 'on' : '';
      b.onclick = () => { this.qtab = k; this.qsel = (groups[k][0] || [])[0]; this.renderQuests(); };
      tabs.appendChild(b);
    }
    const list = groups[this.qtab];
    if (!this.qsel || !list.some(([q]) => q === this.qsel)) this.qsel = (list[0] || [])[0];
    $('qlist').innerHTML = list.length ? list.map(([q, s]) => `<div class="qi ${q === this.qsel ? 'sel' : ''}" data-q="${q}">${track.includes(q) ? '<span class="star">★</span>' : ''}<span class="qlv">niv. ${QUESTS[q].level || 1}</span>${s === 'ready' ? '✔ ' : s === 'available' ? '! ' : ''}${esc(QUESTS[q].name)}<small>${esc(NPCS[QUESTS[q].giver].name)}</small></div>`).join('')
      : `<p>${this.qtab === 'active' ? 'Aucune quête en cours.' : this.qtab === 'available' ? 'Aucune quête disponible pour le moment : gagnez des niveaux, ou explorez !' : 'Aucune quête terminée.'}</p>`;
    $('qlist').querySelectorAll('.qi').forEach((el) => (el.onclick = () => this.renderQuests(el.dataset.q)));
    const qid = this.qsel;
    if (!qid) { $('qdetail').innerHTML = '<p>Parlez aux habitants marqués d’un <b>!</b> pour obtenir des quêtes. Les quêtes suivies (★) s’affichent à l’écran, et la flèche vous guide vers la première.</p>'; return; }
    const q = QUESTS[qid], s = this.questStateOf(qid), prog = this.goalProgress(qid);
    const npcZone = (id) => { const n = (G.allNpcs || []).find((o) => o.id === id) || (G.npcs || []).find((o) => o.id === id); if (!n) return ''; const rid = roomIdAt(G.world, n.x, n.y); return rid >= 0 ? G.world.rooms[rid].name : ZONES[zoneAt(G.world, n.x, n.y)].name; };
    const rew = [`<span>✦ ${q.rewards.xp} XP</span>`, `<span><i class="coin"></i>${q.rewards.gold}</span>`, ...(q.rewards.items || []).map(([id, n]) => `<img title="${esc(ITEMS[id].name)}" src="${iconURL(ITEMS[id].icon, ITEMS[id].tint)}"><span>${esc(ITEMS[id].name)}${n > 1 ? ' ×' + n : ''}</span>`)];
    const goals = s === 'done' ? '<p><b>Quête terminée.</b></p>' : q.goals.map((g, i) => { const [a, b2] = prog[i]; return `<div class="goal ${a >= b2 ? 'ok' : ''}">${a >= b2 ? '✔' : '☐'} ${esc(g.text)} ${b2 > 1 ? `(${a}/${b2})` : ''}${b2 > 1 ? `<div class="bar"><i style="width:${Math.round(a / b2 * 100)}%"></i></div>` : ''}</div>`; }).join('');
    const tracked = track.includes(qid);
    $('qdetail').innerHTML = `<h3>${esc(q.name)}</h3>
      <div class="meta">Niveau ${q.level || 1} · donnée par ${esc(NPCS[q.giver].name)}${npcZone(q.giver) ? ' (' + esc(npcZone(q.giver)) + ')' : ''}</div>
      <p><i>« ${esc(s === 'done' ? q.done : q.offer)} »</i></p>
      ${goals}
      ${s === 'available' ? `<p>À accepter auprès de <b>${esc(NPCS[q.giver].name)}</b>${npcZone(q.giver) ? ', ' + esc(npcZone(q.giver)) : ''}.</p>` : s !== 'done' ? `<p>À rendre à <b>${esc(NPCS[q.turnin].name)}</b>${npcZone(q.turnin) ? ' (' + esc(npcZone(q.turnin)) + ')' : ''}. ${esc(q.progress)}</p>` : ''}
      <div class="rew"><b>Récompenses :</b> ${rew.join(' ')}</div>
      ${s === 'active' || s === 'ready' ? `<div class="qact"><button id="q-track" class="btn">${tracked ? '☆ Ne plus suivre' : '★ Suivre cette quête'}</button>${q.noAbandon ? '' : '<button id="q-ab" class="chip">Abandonner</button>'}</div>` : ''}`;
    const bt = $('q-track'); if (bt) bt.onclick = () => { G.send({ t: 'track', q: qid, on: !tracked }); G.sfx.play('click'); };
    const ba = $('q-ab'); if (ba) ba.onclick = () => this.confirm(`Abandonner <b>${esc(q.name)}</b> ? Vous perdrez votre progression${q.goals.some((g) => g.type === 'collect') ? ' et les objets de quête ramassés' : ''}.`, () => { G.send({ t: 'qab', q: qid }); this.show('quests'); });
  }

  // ------------------------------------------------------------ dialogues
  openDialog(npcId, noScene = false) {
    const G = this.G, N = NPCS[npcId];
    if (!N) return;
    const pt = G.pendingTalk; if (!noScene) G.pendingTalk = null;
    if (!noScene && pt && pt.npc === npcId && pt.scenes.length) { this.close(); this.playScenes(npcId, pt.scenes); return; } // 0.8 : une vraie conversation d'abord
    this.close();
    this.dialogNpc = npcId;
    $('dialog').classList.remove('hidden');
    $('dlg-name').textContent = N.name; $('dlg-title').textContent = N.title || '';
    const pc = $('dlg-portrait'), x = pc.getContext('2d');
    x.clearRect(0, 0, pc.width, pc.height); x.imageSmoothingEnabled = false;
    if (N.parrot) x.drawImage(G.renderer.parrot[0], 3, 4, 14, 14);
    else if (N.board) { const sg = G.renderer.env.sign[0]; x.drawImage(sg.cv, 1, 1); }
    else { const sh = humanSheet(N.look); x.drawImage(sh.cv, 0, 0, FW, 22, 0, 0, FW, 22); }
    this.dialogMain(npcId);
  }
  say(text, choices) {
    const el = $('dlg-text');
    clearInterval(this.typeT);
    let i = 0;
    el.textContent = '';
    this.typeT = setInterval(() => { i += 2; el.textContent = text.slice(0, i); if (i >= text.length) clearInterval(this.typeT); }, 16);
    el.onclick = () => { clearInterval(this.typeT); el.textContent = text; };
    const box = $('dlg-choices');
    box.innerHTML = '';
    this.choices = choices;
    choices.forEach((c, k) => {
      const b = document.createElement('button');
      b.className = c.cls || '';
      b.innerHTML = `<span class="k">${k + 1}.</span>${esc(c.label)}`;
      b.onclick = () => { this.G.sfx.play('click'); c.go(); };
      box.appendChild(b);
    });
  }
  pickChoice(k) { if (this.choices && this.choices[k] && !$('dialog').classList.contains('hidden')) this.choices[k].go(); }
  async playScenes(npcId, list) {
    for (const sc of list) { await this.G.scene.play(npcId, sc, null); if (this.G.scene.aborted) return; }
    this.openDialog(npcId, true);
  }
  // 0.8 : la table de dés de Fortuné (mise, deux dés chacun, le plus haut total gagne ; égalité : la maison gagne)
  diceMenu(npcId, msg) {
    const G = this.G, gold = G.me ? G.me.gold : 0;
    const ch = [10, 50, 100, 250, 500].filter((b) => gold >= b).map((b) => ({ label: `🎲 Miser ${b} doublons`, cls: 'q', go: () => this.diceRoll(b) }));
    ch.push({ label: 'Arrêter de jouer', go: () => this.dialogMain(npcId) });
    this.say(msg || 'Faites vos jeux ! Deux dés chacun, le plus haut total gagne. Double six : le triple. Égalité : la maison gagne.', ch);
  }
  diceRoll(bet) {
    const el = $('dlg-text'), F = '⚀⚁⚂⚃⚄⚅', r = () => F[Math.floor(Math.random() * 6)];
    clearInterval(this.typeT); $('dlg-choices').innerHTML = ''; this.choices = [];
    this.G.sfx.play('dice'); this.diceT0 = performance.now();
    this.typeT = setInterval(() => { el.innerHTML = `<span class="dice">${r()} ${r()}</span> contre <span class="dice">${r()} ${r()}</span>`; }, 70);
    this.G.send({ t: 'dice', bet });
  }
  diceResult(m) {
    if (this.dialogNpc !== 'croupier') return;
    const F = '⚀⚁⚂⚃⚄⚅', wait = Math.max(0, 700 - (performance.now() - (this.diceT0 || 0)));
    setTimeout(() => {
      if (this.dialogNpc !== 'croupier') return;
      clearInterval(this.typeT);
      const sa = m.a[0] + m.a[1], sb = m.b[0] + m.b[1];
      const res = m.gain > 0 ? (sa === 12 ? `DOUBLE SIX ! +${m.gain} doublons !` : `Gagné ! +${m.gain} doublons.`) : sa === sb ? 'Égalité... la maison gagne.' : 'Perdu. La maison vous remercie.';
      this.diceMenu('croupier', `Vous : ${F[m.a[0] - 1]} ${F[m.a[1] - 1]} (${sa}) — Fortuné : ${F[m.b[0] - 1]} ${F[m.b[1] - 1]} (${sb}). ${res}`);
      this.G.sfx.play(m.gain > 0 ? 'coin' : 'deny');
    }, wait);
  }
  // 1.0 : ce dont un personnage se souvient — vos quêtes, vos choix, vos exploits
  memoryLine(npcId) {
    const G = this.G, N = NPCS[npcId];
    for (const [c, line] of N.remember || []) {
      const [k, v] = [c.slice(0, 1), c.slice(2)];
      const ok = k === 'q' ? this.questStateOf(v) === 'done' : k === 'm' ? !!(G.mem && G.mem.has(v)) : k === 'a' ? !!(G.ach && G.ach[v]) : false;
      if (ok) return line.replace(/\{nom\}/g, G.player ? G.player.name : '');
    }
    return null;
  }
  dialogMain(npcId) {
    const G = this.G, N = NPCS[npcId];
    const mem = this.memoryLine(npcId);
    const greet = mem && Math.random() < 0.7 ? mem : N.greet[Math.floor(Math.random() * N.greet.length)];
    const ch = [];
    for (const qid of QUEST_ORDER) {
      const q = QUESTS[qid], s = this.questStateOf(qid);
      if (q.turnin === npcId && s === 'ready') ch.push({ label: `✔ ${q.name}`, cls: 'done', go: () => {
        if (q.sceneDone) { this.close(); G.scene.play(npcId, q.sceneDone, [{ label: 'Recevoir la récompense', cls: 'go', go: () => G.send({ t: 'qt', q: qid }) }]); return; }
        this.say(q.done, [{ label: 'Recevoir la récompense', cls: 'done', go: () => { G.send({ t: 'qt', q: qid }); this.close(); } }]);
      } });
      else if (q.giver === npcId && s === 'available') ch.push({ label: `! ${q.name}`, cls: 'q', go: () => {
        if (q.scene) { // 0.8 : la proposition se joue en vraie conversation, puis on décide
          this.close();
          G.scene.play(npcId, q.scene, [{ label: `Accepter : « ${q.name} »`, cls: 'go', go: () => G.send({ t: 'qa', q: qid }) }, { label: 'Pas maintenant…', go: () => this.openDialog(npcId, true) }]);
          return;
        }
        this.say(q.offer, [{ label: 'Accepter la quête', cls: 'q', go: () => { G.send({ t: 'qa', q: qid }); this.dialogMain(npcId); } }, { label: 'Plus tard…', go: () => this.dialogMain(npcId) }]);
      } });
      else if ((q.turnin === npcId || q.giver === npcId) && s === 'active') ch.push({ label: `… ${q.name}`, go: () => this.say(q.progress, [{ label: 'Compris.', go: () => this.dialogMain(npcId) }]) });
    }
    if (N.shop) ch.push({ label: '🛒 Voir la marchandise', go: () => this.openShop(npcId) });
    if (N.dice) ch.push({ label: '🎲 Jouer aux dés', cls: 'q', go: () => this.diceMenu(npcId) });
    const np = (this.G.npcs || []).find((q) => q.id === npcId), npr = np ? roomIdAt(this.G.world, np.x, np.y) : -1;
    if (npr >= 0 && ['tavern', 'auberge'].includes(this.G.world.rooms[npr].kind)) { // 1.0 : les jeux de taverne
      ch.push({ label: '🍺 Jeux de taverne (bras de fer, rhum, cartes)', cls: 'q', go: () => this.openTavern(npcId) });
      ch.push({ label: '🎶 Entonner une chanson à boire', go: () => { this.G.send({ t: 'tav', a: 'sing' }); this.close(); } });
    }
    if (N.arena) { // 1.0 : la Fosse
      ch.push({ label: '⚔ Descendre dans la Fosse (vagues, seul ou avec votre groupe)', cls: 'q', go: () => { this.G.send({ t: 'arena', a: 'waves' }); this.close(); } });
      ch.push({ label: '🏆 Le classement de la semaine', go: () => { this.arenaBoardAsk = npcId; this.G.send({ t: 'arena', a: 'board' }); } });
      ch.push({ label: '🤺 Comment défier un pirate ?', go: () => this.say("Approchez-vous de lui ici même, dans la Fosse, et appuyez sur E : vous pourrez le défier en duel, avec ou sans mise. Les gradins parient sur le vainqueur — la maison garde cinq pour cent. On ne meurt pas dans ma Fosse : on finit dans les gradins.", [{ label: 'Autre chose…', go: () => this.dialogMain(npcId) }, { label: 'Au revoir.', go: () => this.close() }]) });
    }
    if (this.G.me && this.G.me.repairCost > 0 && (N.repair || (N.shop || []).some((i) => ITEMS[i] && ITEMS[i].boat))) ch.push({ label: `⚓ Réparer les coques (${this.G.me.repairCost} doublons)`, cls: 'q', go: () => { this.G.send({ t: 'repair' }); this.close(); } }); // 1.0
    if (N.bail && this.G.me && this.G.me.jail > 0) ch.push({ label: `🔑 Payer la caution (${this.G.me.bail} doublons)`, cls: 'q', go: () => { this.G.send({ t: 'bail' }); this.close(); } });
    if (npcId === 'isa') ch.push({ label: '⚒ Renforcer mon équipement', go: () => { this.close(); this.show('forge'); } });
    for (const t of N.topics || []) ch.push({ label: t.q, go: () => this.say(t.a, [{ label: 'Autre chose…', go: () => this.dialogMain(npcId) }, { label: 'Au revoir.', go: () => this.close() }]) });
    ch.push({ label: 'Au revoir.', go: () => this.close() });
    this.say(greet, ch);
  }

  // ------------------------------------------------------------ boutique
  openShop(npcId) {
    const G = this.G, N = NPCS[npcId];
    this.close();
    this.open = 'shop'; this.shopNpc = npcId;
    $('panel-shop').classList.remove('hidden');
    $('shop-title').textContent = N.name;
    this.renderShop();
    // ouvre aussi le sac pour vendre
    $('panel-inventory').classList.remove('hidden');
    $('panel-inventory').style.transform = 'translate(-2%, -50%)';
    $('panel-shop').style.transform = 'translate(-102%, -50%)';
    $('sell-hint').textContent = 'Clic droit / Maj + clic : vendre';
    this.renderInventory();
    const close = this.close.bind(this);
    this.close = () => { $('panel-inventory').classList.add('hidden'); $('panel-inventory').style.transform = ''; $('panel-shop').style.transform = ''; this.close = close; close(); };
  }
  shopPlace() { const n = (this.G.npcs || []).find((q) => q.id === this.shopNpc); return n ? placeOf(this.G.world, n.x, n.y) : null; }
  renderShop() {
    const G = this.G, N = NPCS[this.shopNpc];
    if (!N) return;
    $('shop-gold').textContent = G.me.gold;
    const place = this.shopPlace(), lvl = repLevel(((G.me && G.me.rep) || {})[place] || 0); // 1.0 : réputation et taxe de la ville
    $('shop-rep').innerHTML = place ? `${esc(PLACES[place].name)} · réputation <b>${REP_LEVELS[lvl][1]}</b>${discountOf(lvl) ? ` · remise ${Math.round(discountOf(lvl) * 100)} %` : ''} · taxe sur vos ventes ${String(Math.round(taxOf(place, lvl) * 1000) / 10).replace('.', ',')} %` : '';
    const list = $('shop-list');
    list.innerHTML = '';
    for (const id of N.shop) {
      const it = ITEMS[id];
      const row = document.createElement('div'); row.className = 'shop-row';
      const stats = [it.atk && `+${it.atk} att.`, it.gun && `+${it.gun} tir`, it.def && `+${it.def} déf.`, it.hp && `+${it.hp} PV`, it.use && it.use.heal && `+${it.use.heal} PV`, it.use && it.use.en && `+${it.use.en} énergie`, it.spd && `+${Math.round(it.spd * 100)} % vitesse`].filter(Boolean).join(' · ');
      row.innerHTML = `<img src="${iconURL(it.icon, it.tint)}"><div class="nm" style="color:${it.rarity ? RARITY[it.rarity].color.replace('#efe6d2', '#2b1d14') : ''}">${esc(it.name)}<small>${esc(stats)}</small></div><div class="pr"><i class="coin"></i>${buyPrice(it.value, lvl) < it.value ? `<s>${it.value}</s> ` : ''}${buyPrice(it.value, lvl)}</div>`;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Acheter';
      b.disabled = G.me.gold < buyPrice(it.value, lvl);
      b.onclick = () => G.send({ t: 'buy', npc: this.shopNpc, item: id });
      row.appendChild(b);
      row.onmouseenter = (e) => this.tip(e, this.itemTip(id, 1, 'shop'));
      row.onmouseleave = () => this.untip();
      list.appendChild(row);
    }
  }

  // ------------------------------------------------------------ forge
  renderForge() {
    const G = this.G, list = $('forge-list');
    list.innerHTML = '';
    const names = { weapon: 'Arme', gun: 'Pistolet', body: 'Torse' };
    for (const slot of UPG_SLOTS) {
      const L = (G.me.upg && G.me.upg[slot]) || 0, id = G.eq[slot], it = id && ITEMS[id];
      const row = document.createElement('div'); row.className = 'forge-row';
      const stars = '★'.repeat(L) + '☆'.repeat(UPG_MAX - L);
      let cost = '', can = !!it && L < UPG_MAX;
      if (L < UPG_MAX) {
        const c = upgradeCost(slot, L);
        if (G.me.gold < c.gold) can = false;
        cost = `<span class="${G.me.gold >= c.gold ? 'ok' : 'ko'}"><i class="coin"></i>${c.gold}</span>` + c.mats.map(([m, n]) => { const have = G.countItem(m); if (have < n) can = false; return `<span class="${have >= n ? 'ok' : 'ko'}" title="${esc(ITEMS[m].name)}"><img src="${iconURL(ITEMS[m].icon, ITEMS[m].tint)}">${have}/${n}</span>`; }).join('');
      } else cost = '<span class="ok">Maximum atteint</span>';
      row.innerHTML = `<div class="fi">${it ? `<img src="${iconURL(it.icon, it.tint)}">` : '<div class="empty"></div>'}</div>
        <div class="fn"><b>${names[slot]} ${L ? '+' + L : ''}</b><small>${it ? esc(it.name) : 'Rien d’équipé'}</small><span class="stars">${stars}</span><small>Prochain niveau : ${UPG_TEXT[slot]}</small><div class="cost">${cost}</div></div>`;
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = 'Renforcer'; b.disabled = !can;
      b.onclick = () => G.send({ t: 'upg', s: slot });
      row.appendChild(b);
      list.appendChild(row);
    }
  }
  // ------------------------------------------------------------ hauts faits
  renderAch() {
    const G = this.G, list = $('ach-list'), ach = G.ach || {}, me = G.me || {};
    const cur = me.title;
    const shown = (k) => !ACHIEVEMENTS[k].legacy || ach[k]; // 0.9 : un haut fait retiré reste à qui l'a gagné
    const total = Object.keys(ACHIEVEMENTS).filter(shown).length, got = Object.keys(ach).filter((k) => ACHIEVEMENTS[k]).length;
    $('ach-sum').innerHTML = `<b>${got} / ${total}</b> hauts faits · titre porté : <b>${cur && ACHIEVEMENTS[cur] ? esc(ACHIEVEMENTS[cur].title) : 'aucun'}</b><div class="bar"><i style="width:${Math.round(got / total * 100)}%"></i></div>`;
    if (cur) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'Retirer le titre'; b.onclick = () => G.send({ t: 'title', id: null }); $('ach-sum').appendChild(b); }
    const cnt = me.cnt || {}, secrets = G.world.doors.filter((d) => d.secret).length;
    const PROG = {
      crabes: [cnt.crab || 0, 50], faucheur: [me.kills || 0, 250], riche: [me.gold || 0, 1000], niveau10: [me.lvl || 1, 10],
      forge: [Math.max(0, ...Object.values(me.upg || {})), 3], naufrageur: [cnt.ships || 0, 10], horde: [cnt.horde || 0, 30],
      speleo: [G.found ? [...G.found].filter((id) => G.world.doors[id] && G.world.doors[id].secret).length : 0, secrets], fouineur: [me.cch || 0, 3], explorateur: [me.zsn || 0, me.zst || 11], flambeur: [cnt.dice || 0, 10],
    };
    const CATS = [
      ['Premiers pas', ['premier_sang', 'niveau10', 'riche', 'forge', 'proprietaire', 'peche']],
      ['Combat', ['crabes', 'faucheur', 'elite', 'boss', 'invasion', 'defenseur', 'horde', 'duel', 'chasseur', 'gladiateur', 'duelliste', 'champion_fosse', 'roi_os', 'kraken', 'freres', 'damnes', 'eruption']],
      ['Mer et voyages', ['navigateur', 'naufrageur', 'rade', 'explorateur', 'espadon', 'citoyen']],
      ['Trésors et secrets', ['tresor', 'speleo', 'fouineur', 'cambrioleur', 'jumeaux', 'flambeur']],
      ['Légendes', ['gardien', 'complice', 'elegance', 'libertalia', 'gloire', 'gloire_max', 'potence', 'melomane']],
    ];
    const seen = new Set(CATS.flatMap(([, ids]) => ids));
    const rest = Object.keys(ACHIEVEMENTS).filter((k) => !seen.has(k));
    if (rest.length) CATS.push(['Autres', rest]);
    list.innerHTML = '';
    for (const [name, ids] of CATS) {
      const ok = ids.filter((id) => ACHIEVEMENTS[id] && shown(id));
      if (!ok.length) continue;
      const h = document.createElement('h4'); h.textContent = `${name} — ${ok.filter((id) => ach[id]).length}/${ok.length}`; list.appendChild(h);
      for (const id of ok) {
        const a = ACHIEVEMENTS[id], has = !!ach[id], pr = PROG[id];
        const row = document.createElement('div'); row.className = 'ach' + (has ? ' got' : '');
        const date = has && typeof ach[id] === 'number' && ach[id] > 1e12 ? new Date(ach[id]).toLocaleDateString('fr-FR') : '';
        row.innerHTML = `<img src="${iconURL('trophy')}"><div><b>${esc(a.name)}</b><small>${esc(a.desc)}</small><small class="tt">Titre : « ${esc(a.title)} »</small>${has ? (date ? `<small class="date">Obtenu le ${date}</small>` : '') : pr ? `<small>${Math.min(pr[0], pr[1])} / ${pr[1]}</small><div class="bar"><i style="width:${Math.min(100, Math.round(pr[0] / Math.max(1, pr[1]) * 100))}%"></i></div>` : ''}</div>`;
        if (has && cur !== id) { const b = document.createElement('button'); b.className = 'chip'; b.textContent = 'Porter'; b.onclick = () => G.send({ t: 'title', id }); row.appendChild(b); }
        list.appendChild(row);
      }
    }
  }

  // ------------------------------------------------------------ coffre de la base
  // 1.0 : le titre de propriété — avant l'achat (visite, prix, capacités, risque), après (gestion, revente)
  openDeed(d) {
    const G = this.G;
    this.close(); this.open = 'deed'; this.deedK = d.k;
    $('panel-deed').classList.remove('hidden');
    $('deed-title').textContent = d.name;
    const row = (k, v) => `<div><span>${k}</span><b>${v}</b></div>`;
    const riskTxt = (r) => `${r < 30 ? 'faible' : r < 55 ? 'moyen' : 'élevé'} (${r} %)`;
    let html = `<div class="deed-cat">${esc(this.propName(d.cat))}</div><p class="deed-perk">${esc(d.perk)}</p><div class="deed-grid">`;
    html += row('Mobilier', d.mine ? `${d.used} / ${d.furniture}` : `${d.furniture} objets`) + row('Coffre', d.mine ? `${d.cap} places` : `${d.store} places`) + row('Coffres en plus', `${d.extra} × 16 places`);
    if (d.mine) html += row('Serrure', ['simple', 'renforcée', 'de coffre-fort'][d.lock] || 'simple') + row('Pièges', d.traps || 'aucun') + row('Coffre-fort', d.vault ? '12 places protégées' : 'non') + row('Risque de cambriolage', riskTxt(d.risk));
    else html += row('Prix', `${d.price} doublons`) + row('Risque de cambriolage', riskTxt(d.risk)) + row('Vos propriétés', `${d.owned} / ${d.limit}`);
    html += '</div><div class="deed-btns">';
    if (d.mine) html += `<button class="btn alt" id="deed-sell">Revendre (${d.resale} doublons)</button>`;
    else if (!d.owner) html += `<button class="btn" id="deed-buy" ${d.owned >= d.limit ? 'disabled' : ''}>Acheter (${d.price} doublons)</button><button class="btn alt" id="deed-visit">Visiter</button>`;
    html += '</div>';
    if (d.mine) html += '<p class="hint">Revendre rend 60 % du prix payé ; videz d’abord le coffre, votre mobilier revient dans votre sac. Améliorez la sécurité avec une serrure renforcée, des pièges à loup, un chien de garde ou un coffre-fort.</p>';
    else if (d.owned >= d.limit) html += '<p class="hint">Deux propriétés au plus : revendez-en une pour acheter celle-ci.</p>';
    $('deed-body').innerHTML = html;
    const sb = $('deed-sell'); if (sb) sb.onclick = () => this.confirm(`Revendre <b>${esc(d.name)}</b> pour <b>${d.resale} doublons</b> ?<br><small>Votre mobilier revient dans votre sac.</small>`, () => G.send({ t: 'home', a: 'sell', k: d.k }));
    const bb = $('deed-buy'); if (bb) bb.onclick = () => this.confirm(`Acheter <b>${esc(d.name)}</b> (${esc(this.propName(d.cat))}) pour <b>${d.price} doublons</b> ?<br><small>Votre nom sera sur la porte. Meublez-la avec la touche B.</small>`, () => G.send({ t: 'home', a: 'buy', k: d.k }));
    const vb = $('deed-visit'); if (vb) vb.onclick = () => { this.close(); G.send({ t: 'home', a: 'visit', k: d.k }); };
  }
  propName(cat) { return ({ cabane: 'Petite cabane', ville: 'Maison de ville', villa: 'Villa de planteur', manoir: 'Manoir', phare: 'Phare', refuge: 'Refuge dans la jungle', marais: 'Cabane dans les marais', fortin: 'Fortin sur un îlot' })[cat] || 'Maison'; }
  openStorage(items, cap = items.length, vault = 0) {
    if (this.open !== 'storage') {
      this.close();
      this.open = 'storage'; this.storageOpen = true;
      $('panel-storage').classList.remove('hidden');
      $('panel-inventory').classList.remove('hidden');
      $('panel-inventory').style.transform = 'translate(-2%, -50%)';
      $('panel-storage').style.transform = 'translate(-102%, -50%)';
      $('sell-hint').textContent = 'Clic droit : ranger dans le coffre';
    }
    const grid = $('stor-grid');
    grid.innerHTML = '';
    $('stor-cap').textContent = `${items.filter(Boolean).length} / ${cap} places${vault ? ` · coffre-fort : les ${vault} premières sont protégées` : ''}${cap < items.length ? ' · un coffre supplémentaire ajoute 16 places' : ''}`;
    items.forEach((it, k) => {
      if (k >= cap && !it) { if (k < cap + 16 && k < items.length) { const el = document.createElement('div'); el.className = 'slot locked'; el.title = 'Installez un coffre supplémentaire pour ouvrir ces places'; grid.appendChild(el); } return; }
      const el = document.createElement('div'); el.className = 'slot' + (it && ITEMS[it.id].rarity ? ' r' + ITEMS[it.id].rarity : '') + (k < vault ? ' vault' : '');
      el.innerHTML = it ? `<img src="${iconURL(ITEMS[it.id].icon, ITEMS[it.id].tint)}">${it.n > 1 ? `<span class="n">${it.n}</span>` : ''}` : '';
      el.onclick = () => it && this.G.send({ t: 'stor', a: 'take', slot: k });
      el.oncontextmenu = (e) => { e.preventDefault(); if (it) this.G.send({ t: 'stor', a: 'take', slot: k }); };
      el.onmouseenter = (e) => { if (it) this.tip(e, this.itemTip(it.id, it.n) + '<div class="tt">Clic : reprendre</div>'); };
      el.onmouseleave = () => this.untip();
      grid.appendChild(el);
    });
    this.renderInventory();
  }
  // ------------------------------------------------------------ barre de construction
  renderBuildBar() {
    const G = this.G, bar = $('buildbar');
    if (!G.build) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    const counts = {};
    const home = G.inHome && G.inHome();
    for (const s of G.inv) if (s && ITEMS[s.id].place && (home ? (STRUCTS[ITEMS[s.id].place].home || HOME_OK.has(ITEMS[s.id].place)) : !(STRUCTS[ITEMS[s.id].place].home && !HOME_OK.has(ITEMS[s.id].place)))) counts[s.id] = (counts[s.id] || 0) + s.n;
    if (G.build.id && !counts[G.build.id]) { G.build.id = null; G.build.item = null; }
    const ids = Object.keys(counts);
    bar.innerHTML = `<span class="bt">${home ? 'Ameublement' : 'Construction'}</span>` + ids.map((id) => `<div class="hk${G.build.id === id ? ' flash' : ''}" data-id="${id}"><img src="${iconURL(ITEMS[id].icon, ITEMS[id].tint)}"><span class="cnt">${counts[id]}</span></div>`).join('')
      + (ids.length ? '' : `<span class="bh">Rien à poser : achetez des meubles chez Anselme, le marchand de meubles.</span>`)
      + '<span class="bh">Clic : poser · Clic droit : démonter · Échap : quitter</span>';
    bar.querySelectorAll('.hk').forEach((el) => {
      const id = el.dataset.id;
      el.onclick = () => { G.build.id = id; G.build.item = ITEMS[id]; this.renderBuildBar(); };
      el.onmouseenter = (e) => this.tip(e, this.itemTip(id, counts[id]));
      el.onmouseleave = () => this.untip();
    });
  }
  setAide(mode) {
    document.body.classList.remove('aide-discret', 'aide-complet', 'aide-aucune');
    document.body.classList.add('aide-' + mode);
    this.G.aide = mode;
  }
  // ------------------------------------------------------------ réglages
  settings() { const d = { music: 0.6, sfx: 1, zoom: 0, shake: true, myname: false, aide: 'discret', global: true, mpSound: true }; try { return Object.assign(d, JSON.parse(localStorage.getItem('mm_settings') || '{}')); } catch (e) { return d; } }
  applySettings(st) {
    const G = this.G;
    G.sfx.setVolumes(st.music, st.sfx);
    G.renderer.zoom = +st.zoom || 0; G.renderer.resize(innerWidth, innerHeight);
    G.renderer.shakeOn = !!st.shake; G.showMyName = !!st.myname;
    this.setAide(st.aide || 'discret');
    try { localStorage.setItem('mm_settings', JSON.stringify(st)); } catch (e) { /* */ }
    if (this.chatFilter) this.setChatFilter(this.chatFilter);
  }
  renderSettings() {
    const st = this.settings();
    $('set-music').value = st.music; $('set-sfx').value = st.sfx; $('set-zoom').value = String(st.zoom || 0);
    $('set-shake').checked = !!st.shake; $('set-myname').checked = !!st.myname; $('set-aide').value = st.aide || 'discret';
    $('set-global').checked = st.global !== false; $('set-mpsound').checked = st.mpSound !== false;
    const upd = () => this.applySettings({ music: +$('set-music').value, sfx: +$('set-sfx').value, zoom: +$('set-zoom').value, shake: $('set-shake').checked, myname: $('set-myname').checked, aide: $('set-aide').value, global: $('set-global').checked, mpSound: $('set-mpsound').checked });
    for (const id of ['set-music', 'set-sfx', 'set-zoom', 'set-shake', 'set-myname', 'set-aide', 'set-global', 'set-mpsound']) $(id).oninput = $(id).onchange = upd;
  }

  // ------------------------------------------------------------ chat : voir social-ui.js (canaux, historique, invitations, groupe, équipage, échange)

  // ------------------------------------------------------------ cartes
  // 0.8 : la carte façon carte au trésor — mer teintée selon la profondeur, écume, côtes à l'encre, relief ombré, papier
  buildMiniBase() {
    const W = this.G.world, N = MAP_W * OVER_H, tl = W.tiles;
    const c = document.createElement('canvas'); c.width = MAP_W; c.height = OVER_H;
    const x = c.getContext('2d'), img = x.createImageData(MAP_W, OVER_H), d = new Uint32Array(img.data.buffer);
    const isW = (t) => t === T.WATER || t === T.DEEP;
    const dW = new Uint8Array(N), dL = new Uint8Array(N); // distance (en cases) à la terre pour l'eau, à l'eau pour la terre
    for (let i = 0; i < N; i++) { const w = isW(tl[i]); dW[i] = w ? 60 : 0; dL[i] = w ? 0 : 60; }
    const cham = (D) => {
      for (let y = 0; y < OVER_H; y++) for (let xx = 0; xx < MAP_W; xx++) { const i = y * MAP_W + xx; let v = D[i]; if (!v) continue; if (xx > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) { v = Math.min(v, D[i - MAP_W] + 1); if (xx > 0) v = Math.min(v, D[i - MAP_W - 1] + 1); if (xx < MAP_W - 1) v = Math.min(v, D[i - MAP_W + 1] + 1); } D[i] = v; }
      for (let y = OVER_H - 1; y >= 0; y--) for (let xx = MAP_W - 1; xx >= 0; xx--) { const i = y * MAP_W + xx; let v = D[i]; if (!v) continue; if (xx < MAP_W - 1) v = Math.min(v, D[i + 1] + 1); if (y < OVER_H - 1) { v = Math.min(v, D[i + MAP_W] + 1); if (xx < MAP_W - 1) v = Math.min(v, D[i + MAP_W + 1] + 1); if (xx > 0) v = Math.min(v, D[i + MAP_W - 1] + 1); } D[i] = v; }
    };
    cham(dW); cham(dL);
    const mixc = (a, b, k) => { const r = ((a >> 16) & 255) * (1 - k) + ((b >> 16) & 255) * k, g = ((a >> 8) & 255) * (1 - k) + ((b >> 8) & 255) * k, bl = (a & 255) * (1 - k) + (b & 255) * k; return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl); };
    const mul = (a, f) => (Math.min(255, Math.round(((a >> 16) & 255) * f)) << 16) | (Math.min(255, Math.round(((a >> 8) & 255) * f)) << 8) | Math.min(255, Math.round((a & 255) * f));
    const SEA = [[1, 0x8fd4cc], [3, 0x55aec0], [6, 0x3486ac], [11, 0x23608e], [18, 0x1b4b78], [60, 0x183f68]];
    const sea = (dd) => { for (let k = 1; k < SEA.length; k++) if (dd <= SEA[k][0]) return mixc(SEA[k - 1][1], SEA[k][1], (dd - SEA[k - 1][0]) / (SEA[k][0] - SEA[k - 1][0])); return SEA[SEA.length - 1][1]; };
    const PAPER = 0xe9d8ac, hsh = (i) => { let h = Math.imul(i ^ 0x5bd1e995, 0x27d4eb2d); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
    for (let i = 0; i < N; i++) {
      const t = tl[i], px = i % MAP_W, py = (i / MAP_W) | 0;
      let col;
      if (isW(t)) {
        col = sea(dW[i]);
        if (dW[i] === 1) col = mixc(col, 0xf2fbf6, 0.45); // l'écume
        else if (dW[i] > 6 && (px * 3 + py * 7) % 23 === 0 && hsh(i) > 0.55) col = mixc(col, 0xbfe0ea, 0.28); // les vagues gravées
      } else {
        col = MINI_COL[t] || 0;
        if (W.solid[i] && t > 1 && t !== 10) col = t === T.COBBLE ? 0x6e6a74 : 0x9a3e2a; // remparts gris, toits rouges
        const h = (k) => Math.min(14, dL[k] || 0);
        const a = px > 0 && py > 0 ? h(i - MAP_W - 1) : h(i), b = px < MAP_W - 1 && py < OVER_H - 1 ? h(i + MAP_W + 1) : h(i);
        col = mul(col, 1 + Math.max(-2, Math.min(2, b - a)) * -0.06 + Math.min(10, dL[i]) * 0.008); // relief : lumière du nord-ouest
        if (dL[i] === 1) col = mul(col, 0.72); // le trait de côte
      }
      col = mixc(col, PAPER, 0.13 + (hsh(i * 7 + 3) - 0.5) * 0.05); // le papier
      d[i] = (0xff000000 | ((col & 255) << 16) | (col & 0xff00) | ((col >> 16) & 255)) >>> 0;
    }
    const V = W.volcano; // le volcan sur la carte : un cône sombre et son cratère rouge
    if (V) for (let y = Math.floor((V.cy - V.ry) / TILE); y <= (V.cy + V.ry) / TILE; y++) for (let x0 = Math.floor((V.cx - V.rx) / TILE); x0 <= (V.cx + V.rx) / TILE; x0++) {
      const ex = (x0 * TILE + 8 - V.cx) / V.rx, ey = (y * TILE + 8 - V.cy) / V.ry, e = Math.sqrt(ex * ex + ey * ey);
      if (e > 1) continue;
      const col = e < 0.13 ? 0xff7a1a : e < 0.21 ? 0x8a2a10 : e < 0.5 ? 0x5a4648 : 0x403133;
      d[y * MAP_W + x0] = (0xff000000 | ((col & 255) << 16) | (col & 0xff00) | ((col >> 16) & 255)) >>> 0;
    }
    x.putImageData(img, 0, 0);
    this.miniBase = c;
  }
  // ------------------------------------------------------------ 1.0 : le codex — tout ce que l'archipel a montré de lui-même
  renderCodex(tab = this.codexTab || 'monstres') {
    const G = this.G, cx = G.codex || { kc: {}, met: [], col: [], st: {} }, me = G.me || {};
    this.codexTab = tab;
    const TABS = [['monstres', 'Monstres'], ['boss', 'Boss'], ['armes', 'Armes'], ['objets', 'Objets'], ['pnj', 'Personnages'], ['iles', 'Îles'], ['secrets', 'Secrets'], ['stats', 'Statistiques']];
    const isBoss = (k) => { const d = MOBS[k]; return d && (d.boss || (d.elite && (d.big || d.ai || d.sea))); };
    const mobs = Object.keys(MOBS).filter((k) => !MOBS[k].ship && k !== 'tentacule');
    const col = new Set(cx.col), met = new Set(cx.met), kc = cx.kc || {};
    const weapons = Object.keys(ITEMS).filter((k) => ITEMS[k].slot === 'weapon' || ITEMS[k].slot === 'gun');
    const others = Object.keys(ITEMS).filter((k) => !ITEMS[k].quest && !(ITEMS[k].slot === 'weapon' || ITEMS[k].slot === 'gun'));
    const npcs = Object.keys(NPCS).filter((k) => !NPCS[k].board);
    const isl = (G.world.islands || []).filter((i) => i.n > 150), rev = this.revealed || [];
    const secrets = G.world.doors.filter((d) => d.secret);
    const counts = { monstres: [mobs.filter((k) => !isBoss(k) && kc[k]).length, mobs.filter((k) => !isBoss(k)).length], boss: [mobs.filter((k) => isBoss(k) && kc[k]).length, mobs.filter(isBoss).length],
      armes: [weapons.filter((k) => col.has(k)).length, weapons.length], objets: [others.filter((k) => col.has(k)).length, others.length], pnj: [npcs.filter((k) => met.has(k)).length, npcs.length],
      iles: [isl.filter((i) => rev[i.id]).length, isl.length], secrets: [secrets.filter((d) => G.found && G.found.has(d.id)).length + (me.cch || 0), secrets.length + 6] };
    const all = Object.values(counts).reduce((a, [g, t]) => [a[0] + g, a[1] + t], [0, 0]);
    $('codex-sum').innerHTML = `<b>${all[0]} / ${all[1]}</b> entrées découvertes<div class="bar"><i style="width:${Math.round(all[0] / all[1] * 100)}%"></i></div>`;
    $('codex-tabs').innerHTML = TABS.map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" data-t="${k}">${n}${counts[k] ? ` <small>${counts[k][0]}/${counts[k][1]}</small>` : ''}</button>`).join('');
    $('codex-tabs').querySelectorAll('button').forEach((b) => (b.onclick = () => this.renderCodex(b.dataset.t)));
    const box = $('codex-list'); box.innerHTML = '';
    const card = (ok, art, title, sub, body = '') => { const el = document.createElement('div'); el.className = 'cx' + (ok ? '' : ' locked'); if (art) el.appendChild(art); const t = document.createElement('div'); t.innerHTML = `<b>${ok ? esc(title) : '???'}</b><small>${ok ? sub : 'Pas encore découvert'}</small>${ok ? body : ''}`; el.appendChild(t); box.appendChild(el); };
    const mobArt = (k, ok) => { const c = document.createElement('canvas'); c.width = 20; c.height = 22; c.className = 'cx-art'; try { const sh = mobSheet(k), pt = portraitOf(sh), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(pt, 0, 0, pt.width, pt.height, (20 - pt.width) / 2, 0, pt.width, pt.height); } catch (e) { /* forme sans portrait */ } if (!ok) c.style.filter = 'brightness(0)'; return c; };
    const itemArt = (k, ok) => { const im = document.createElement('img'); im.className = 'cx-art'; im.src = iconURL(ITEMS[k].icon, ITEMS[k].tint); if (!ok) im.style.filter = 'brightness(0) opacity(0.5)'; return im; };
    const npcArt = (k, ok) => { const c = document.createElement('canvas'); c.width = 20; c.height = 22; c.className = 'cx-art'; const N = NPCS[k]; if (N.look) { const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(humanSheet(N.look).cv, 0, 0, FW, 22, 0, 0, FW, 22); } if (!ok) c.style.filter = 'brightness(0)'; return c; };
    if (tab === 'monstres') for (const k of mobs.filter((m) => !isBoss(m))) { const d = MOBS[k]; card(!!kc[k], mobArt(k, !!kc[k]), d.name, `Niveau ${d.level} · ${d.hp} PV · vaincu ${kc[k] || 0} fois${d.night ? ' · ne sort que la nuit' : ''}`); }
    if (tab === 'boss') for (const k of mobs.filter(isBoss)) {
      const d = MOBS[k], ok = !!kc[k];
      const loot = (d.loot || []).filter(([id]) => ITEMS[id] && !ITEMS[id].quest).map(([id, ch]) => `<span class="cx-loot" title="${esc(ITEMS[id].name)}"><img src="${iconURL(ITEMS[id].icon, ITEMS[id].tint)}">${ch >= 1 ? '100' : Math.round(ch * 100)} %</span>`).join('');
      card(ok, mobArt(k, ok), d.name, `${esc(d.title || 'Élite')} · niveau ${d.level} · vaincu ${kc[k] || 0} fois`, loot ? `<div class="cx-loots">Récompenses possibles : ${loot}</div>` : '');
    }
    if (tab === 'armes') for (const k of weapons) { const it = ITEMS[k]; card(col.has(k), itemArt(k, col.has(k)), it.name, `${it.slot === 'gun' ? 'Arme à feu' : 'Arme de mêlée'} · ${it.value} doublons`, `<div class="cx-desc">${esc(it.desc || '')}</div>`); }
    if (tab === 'objets') for (const k of others) { const it = ITEMS[k]; card(col.has(k), itemArt(k, col.has(k)), it.name, `${it.slot ? SLOT_NAMES[it.slot] || it.slot : it.home ? 'Mobilier' : it.boat ? 'Navire' : 'Objet'}${it.rarity ? ' · ' + (RARITY[it.rarity] || {}).name : ''}`); }
    if (tab === 'pnj') for (const k of npcs) { const N = NPCS[k]; card(met.has(k), npcArt(k, met.has(k)), N.name, esc(N.title || '')); }
    if (tab === 'iles') for (const i of isl) { const ok = !!rev[i.id]; card(ok, null, (ZONES[i.zone] || {}).name || 'Île sans nom', `${Math.round(i.n / 10) * 10} cases de terre · ${(ZONES[i.zone] || {}).lvl || ''}`); }
    if (tab === 'secrets') { for (const d of secrets) { const ok = !!(G.found && G.found.has(d.id)); card(ok, null, d.name, 'Passage secret découvert'); } card((me.cch || 0) > 0, null, `Cachettes d’armes : ${me.cch || 0} / 6`, 'Des coffres oubliés, chacun garde une arme'); }
    if (tab === 'stats') {
      const s = cx.st || {}, h = Math.floor((s.time || 0) / 3600), mn = Math.floor(((s.time || 0) % 3600) / 60);
      const rows = [['Temps de jeu', `${h} h ${String(mn).padStart(2, '0')} min`], ['Monstres éliminés', me.kills || 0], ['Boss et élites vaincus', s.boss || 0], ['Pirates battus', me.pk || 0], ['Morts', s.deaths || 0],
        ['Doublons gagnés', Math.round(s.gin || 0)], ['Doublons dépensés', Math.round(s.gout || 0)], ['Quêtes terminées', Object.values(G.quests || {}).filter((q) => q.s === 'done').length], ['Îles découvertes', `${counts.iles[0]} / ${counts.iles[1]}`],
        ['Objets collectionnés', `${col.size} / ${Object.keys(ITEMS).filter((k) => !ITEMS[k].quest).length}`], ['Distance parcourue en mer', `${(Math.round((s.sea || 0) / 20) / 10).toLocaleString('fr-FR')} lieues`], ['Parties de dés gagnées', (me.cnt || {}).dice || 0], ['Pirate depuis le', s.since ? new Date(s.since).toLocaleDateString('fr-FR') : '—']];
      box.innerHTML = `<div class="cx-stats">${rows.map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`).join('')}</div>`;
    }
  }
  // ------------------------------------------------------------ 1.0 : la brume des îles inconnues
  setSeen(b64s) {
    const W = this.G.world; this.seenW = Math.ceil(W.W / SEEN_CELL); this.seenH = Math.ceil(W.OVER_H / SEEN_CELL);
    this.seen = new Uint8Array(Math.ceil(this.seenW * this.seenH / 8));
    if (b64s) try { const r = atob(b64s); for (let i = 0; i < Math.min(r.length, this.seen.length); i++) this.seen[i] = r.charCodeAt(i); } catch (e) { /* tout reste dans la brume */ }
    this.fogDirty = true;
  }
  addSeen(cells) { if (!this.seen) return; for (const c of cells) this.seen[c >> 3] |= 1 << (c & 7); this.fogDirty = true; }
  isSeenTile(x, y) { if (!this.seen) return true; const c = Math.floor(y / SEEN_CELL) * this.seenW + Math.floor(x / SEEN_CELL); return !!(this.seen[c >> 3] & (1 << (c & 7))); }
  // une île sort de la brume dès qu'on a vu un seul de ses rivages ; la brume reste sur les autres
  buildFog() {
    const W = this.G.world, N = MAP_W * OVER_H, isl = W.islandOf;
    this.fogDirty = false; this.fogAt = performance.now();
    const revealed = new Uint8Array(W.islands.length + 1);
    for (let i = 0; i < N; i++) { const id = isl[i]; if (id && !revealed[id] && this.isSeenTile(i % MAP_W, (i / MAP_W) | 0)) revealed[id] = 1; }
    this.revealed = revealed;
    const D = new Uint8Array(N);
    for (let i = 0; i < N; i++) D[i] = isl[i] && !revealed[isl[i]] ? 0 : 12;
    for (let y = 0; y < OVER_H; y++) for (let x = 0; x < MAP_W; x++) { const i = y * MAP_W + x; let v = D[i]; if (!v) continue; if (x > 0) v = Math.min(v, D[i - 1] + 1); if (y > 0) v = Math.min(v, D[i - MAP_W] + 1); D[i] = v; }
    for (let y = OVER_H - 1; y >= 0; y--) for (let x = MAP_W - 1; x >= 0; x--) { const i = y * MAP_W + x; let v = D[i]; if (!v) continue; if (x < MAP_W - 1) v = Math.min(v, D[i + 1] + 1); if (y < OVER_H - 1) v = Math.min(v, D[i + MAP_W] + 1); D[i] = v; }
    const c = this.fogCv || (this.fogCv = document.createElement('canvas')); c.width = MAP_W; c.height = OVER_H;
    const x = c.getContext('2d'), img = x.createImageData(MAP_W, OVER_H), d = img.data;
    const h2 = (a, b) => { let h = Math.imul(a * 374761393 + b * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) / 4294967296; };
    const vn = (px, py, s) => { const gx = Math.floor(px / s), gy = Math.floor(py / s), fx = px / s - gx, fy = py / s - gy, a = h2(gx, gy), b = h2(gx + 1, gy), cc = h2(gx, gy + 1), dd = h2(gx + 1, gy + 1); const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy); return a + (b - a) * sx + (cc - a) * sy + (a - b - cc + dd) * sx * sy; };
    for (let i = 0; i < N; i++) {
      const dist = D[i]; if (dist >= 9) continue;
      const px = i % MAP_W, py = (i / MAP_W) | 0, n = vn(px, py, 9) * 0.6 + vn(px, py, 4) * 0.4;
      const a = Math.max(0, Math.min(1, (1 - dist / 9) * 1.35 + (n - 0.5) * 0.5));
      const k = 0.82 + n * 0.18, o = i * 4;
      d[o] = 214 * k; d[o + 1] = 220 * k; d[o + 2] = 228 * k; d[o + 3] = Math.round(a * 248);
    }
    x.putImageData(img, 0, 0);
  }
  fogCanvas() { if (this.fogDirty && (!this.fogCv || performance.now() - (this.fogAt || 0) > 800)) this.buildFog(); return this.fogCv; }
  labelHidden(tx, ty) { // le nom d'un lieu reste caché tant que son île dort sous la brume
    if (!this.revealed) return false;
    const L = this.G.world.islandOf;
    for (let r = 0; r <= 22; r += 2) for (let a = 0; a < 16; a++) { const x = Math.round(tx + Math.cos(a / 16 * 6.283) * r), y = Math.round(ty + Math.sin(a / 16 * 6.283) * r); if (x < 0 || y < 0 || x >= MAP_W || y >= OVER_H) continue; const id = L[y * MAP_W + x]; if (id) return !this.revealed[id]; }
    return false;
  }
  onFog(tx, ty) { return !!(this.revealed && this.G.world.islandOf[ty * MAP_W + tx] && !this.revealed[this.G.world.islandOf[ty * MAP_W + tx]]); }
  // position sur l'archipel (dans un bâtiment : sa porte)
  mapPos() {
    const G = this.G, p = G.player;
    if (G.room >= 0) { const d = G.world.doors.find((q) => q.room === G.room); if (d) return { x: d.ox, y: d.oy }; }
    return { x: p.x, y: p.y };
  }
  drawMini() {
    const G = this.G, p = G.player;
    if (!p) return;
    const c = $('minimap'), x = c.getContext('2d');
    const Z2 = 2, w = c.width / Z2, h = c.height / Z2;
    const at = this.mapPos(), inside = G.room >= 0;
    const tx = at.x / TILE - w / 2, ty = at.y / TILE - h / 2;
    x.imageSmoothingEnabled = false;
    x.fillStyle = '#1b4f7c'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(this.miniBase, tx, ty, w, h, 0, 0, c.width, c.height);
    const fog = this.fogCanvas(); if (fog) { x.imageSmoothingEnabled = true; x.drawImage(fog, tx, ty, w, h, 0, 0, c.width, c.height); x.imageSmoothingEnabled = false; }
    const dot = (wx, wy, col, s = 2) => { const sx = (wx / TILE - tx) * Z2, sy = (wy / TILE - ty) * Z2; if (sx < 0 || sy < 0 || sx > c.width || sy > c.height) return; x.fillStyle = col; x.fillRect(Math.round(sx - s / 2), Math.round(sy - s / 2), s, s); };
    if (!inside) for (const e of G.ents.values()) {
      if (e.k === 'm' && !e.dyingT) { const d = MOBS[e.type] || {}; dot(e.x, e.y, d.ship ? '#1c1426' : e.type === 'boss' || d.elite ? '#ff2a2a' : '#e05040', d.ship ? 5 : e.type === 'boss' || d.elite ? 4 : 2); if (d.ship) dot(e.x, e.y, '#ff8a6a', 3); }
      else if (e.k === 'a') dot(e.x, e.y, '#ffd23a', 4);
    }
    for (const [id, , px0, py0, room, dead, wd] of G.mapPlayers || []) { // les autres pirates, même hors de vue
      if (id === G.myId) continue;
      let px = px0, py = py0;
      if (room >= 0) { const d = G.world.doors.find((q) => q.room === room); if (d) { px = d.ox; py = d.oy; } }
      const e = G.ents.get(id);
      if (e && !inside && room < 0) { px = e.x; py = e.y; }
      dot(px, py, '#1c1426', 5); dot(px, py, dead ? '#8a8a9a' : this.inGroup(id) ? '#7aff8a' : wd ? '#ff4a3a' : '#7ae0ff', 3);
    }
    for (const d of G.world.doors) if (d.secret && G.found.has(d.id)) { dot(d.ox, d.oy, '#1c1426', 5); dot(d.ox, d.oy, '#b8a0ff', 3); }
    if (G.wevt && !inside) { dot(G.wevt.x, G.wevt.y, '#1c1426', 8); dot(G.wevt.x, G.wevt.y, Math.floor(performance.now() / 300) % 2 ? '#ff3a2a' : '#ffb03a', 6); } // 1.0 : l'invasion
    for (const n of G.npcs) { if (n.y >= OVER_H * TILE) continue; const mk = G.npcMarker(n.id); dot(n.x, n.y, mk ? '#ffd23a' : '#e8d8b0', mk ? 3 : 2); }
    if (G.objective) dot(G.objective.x, G.objective.y, '#ffd23a', 4);
    if (G.treasure) { dot(G.treasure.x, G.treasure.y, '#ff2a2a', 4); }
    x.fillStyle = '#000'; x.fillRect(c.width / 2 - 2, c.height / 2 - 2, 5, 5);
    x.fillStyle = '#fff'; x.fillRect(c.width / 2 - 1, c.height / 2 - 1, 3, 3);
  }
  mapArt(x, S, w, h) { // 0.8 : l'habillage d'une vraie carte de pirate
    const ink = '#3a2410';
    const vg = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    vg.addColorStop(0, 'rgba(120,80,30,0)'); vg.addColorStop(1, 'rgba(90,55,20,0.42)');
    x.fillStyle = vg; x.fillRect(0, 0, w, h);
    // la rose des vents
    const rose = (cx, cy, r) => {
      x.save(); x.translate(cx, cy);
      x.globalAlpha = 0.9; x.strokeStyle = ink; x.lineWidth = 1.5;
      for (const rr of [r * 0.98, r * 0.86, r * 0.3]) { x.beginPath(); x.arc(0, 0, rr, 0, 6.283); x.stroke(); }
      for (let k = 0; k < 32; k++) { const a = k / 32 * 6.283, l = k % 8 === 0 ? 0.86 : k % 4 === 0 ? 0.92 : 0.95; x.beginPath(); x.moveTo(Math.cos(a) * r * l, Math.sin(a) * r * l); x.lineTo(Math.cos(a) * r * 0.98, Math.sin(a) * r * 0.98); x.stroke(); }
      const point = (a, len, wid, c1, c2) => { for (const s of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.lineTo(Math.cos(a) * len, Math.sin(a) * len); x.lineTo(Math.cos(a + s * 1.5708) * wid, Math.sin(a + s * 1.5708) * wid); x.closePath(); x.fillStyle = s < 0 ? c1 : c2; x.fill(); x.stroke(); } };
      for (let k = 0; k < 4; k++) point(k * 1.5708 + 0.7854, r * 0.62, r * 0.1, '#c9a24c', '#7a5420');
      for (let k = 0; k < 4; k++) point(k * 1.5708 - 1.5708, r * 0.84, r * 0.14, k === 0 ? '#b8322a' : '#e8d6a6', k === 0 ? '#6e1a14' : '#8a6a3a');
      x.fillStyle = '#c9a24c'; x.beginPath(); x.arc(0, 0, r * 0.07, 0, 6.283); x.fill(); x.stroke();
      x.font = `700 ${Math.round(r * 0.3)}px "Pirata One", serif`; x.textAlign = 'center'; x.fillStyle = ink;
      x.fillText('N', 0, -r * 1.06); x.fillText('S', 0, r * 1.26); x.fillText('E', r * 1.16, r * 0.1); x.fillText('O', -r * 1.16, r * 0.1);
      x.restore();
    };
    rose(54 * S, 404 * S, 30 * S);
    // le cartouche du titre
    const tx = 330 * S, ty = 13 * S;
    x.save(); x.fillStyle = 'rgba(240,226,186,0.92)'; x.strokeStyle = ink; x.lineWidth = 2;
    x.beginPath(); x.moveTo(tx - 150, ty - 18); x.lineTo(tx + 150, ty - 18); x.quadraticCurveTo(tx + 168, ty, tx + 150, ty + 18); x.lineTo(tx - 150, ty + 18); x.quadraticCurveTo(tx - 168, ty, tx - 150, ty - 18); x.closePath(); x.fill(); x.stroke();
    for (const s of [-1, 1]) { x.beginPath(); x.arc(tx + s * 166, ty, 7, 0, 6.283); x.stroke(); }
    x.font = '700 24px "Pirata One", serif'; x.textAlign = 'center'; x.fillStyle = '#5a1810'; x.fillText('Archipel de la Marée Morte', tx, ty + 8); x.restore();
    // les mers, à la plume
    x.save(); x.font = 'italic 600 19px "Pirata One", serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(24,34,56,0.7)';
    for (const [n, mx, my] of [['Mer des Noyés', 240, 236], ['Le Grand Large', 360, 252], ['Détroit de Libertalia', 650, 300], ['Mer du Levant', 620, 30]]) x.fillText(n, mx * S, my * S);
    x.restore();
    // un serpent de mer et un trois-mâts, pour la tradition
    x.save(); x.strokeStyle = 'rgba(40,30,20,0.75)'; x.lineWidth = 2.5; x.fillStyle = 'rgba(60,90,70,0.8)';
    const sx = 214 * S, sy = 318 * S;
    for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(sx + k * 18, sy, 7, Math.PI, 0); x.stroke(); }
    x.beginPath(); x.arc(sx - 10, sy - 6, 5, 0, 6.283); x.fill(); x.stroke(); x.beginPath(); x.moveTo(sx + 52, sy); x.quadraticCurveTo(sx + 62, sy - 10, sx + 66, sy - 2); x.stroke();
    const bx = 590 * S, by = 112 * S;
    x.fillStyle = 'rgba(70,40,20,0.85)'; x.beginPath(); x.moveTo(bx - 16, by); x.lineTo(bx + 16, by); x.lineTo(bx + 11, by + 7); x.lineTo(bx - 11, by + 7); x.closePath(); x.fill();
    x.fillStyle = 'rgba(245,235,210,0.95)'; for (const [ox, hh] of [[-7, 14], [3, 18], [11, 11]]) { x.fillRect(bx + ox - 4, by - hh, 8, hh - 3); x.strokeRect(bx + ox - 4, by - hh, 8, hh - 3); }
    x.restore();
    // le cadre
    x.save(); x.strokeStyle = '#4a2c12'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10); x.strokeStyle = '#c9a24c'; x.lineWidth = 2; x.strokeRect(13, 13, w - 26, h - 26); x.restore();
  }
  renderBigMap() {
    const G = this.G;
    const S = 2, c = $('bigmap'); c.width = MAP_W * S; c.height = OVER_H * S;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    x.drawImage(this.miniBase, 0, 0, c.width, c.height);
    const fog = this.fogCanvas(); if (fog) { x.imageSmoothingEnabled = true; x.drawImage(fog, 0, 0, c.width, c.height); x.imageSmoothingEnabled = false; } // les îles inconnues dorment sous la brume
    this.mapArt(x, S, c.width, c.height);
    x.font = '700 17px "Pirata One", serif'; x.textAlign = 'center'; x.lineJoin = 'round';
    for (const [name, tx, ty] of POI) { if (this.labelHidden(tx, ty)) continue; x.strokeStyle = 'rgba(244,232,200,0.85)'; x.lineWidth = 4; x.strokeText(name, tx * S, ty * S); x.fillStyle = name === 'LIBERTALIA' ? '#6a1410' : '#2e1c0c'; x.fillText(name, tx * S, ty * S); }
    for (const d of G.world.doors) if (d.secret && G.found.has(d.id)) { const dx = d.ox / TILE * S, dy = d.oy / TILE * S; x.fillStyle = '#1c1426'; x.beginPath(); x.arc(dx, dy, 6, 0, 6.3); x.fill(); x.fillStyle = '#b8a0ff'; x.beginPath(); x.arc(dx, dy, 4, 0, 6.3); x.fill(); x.font = '600 13px "Pixelify Sans", sans-serif'; x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(d.name, dx + 1, dy - 9); x.fillStyle = '#e0d4ff'; x.fillText(d.name, dx, dy - 10); }
    for (const n of G.npcs) { const mk = G.npcMarker(n.id); if (!mk) continue; let nx = n.x, ny = n.y; if (ny >= OVER_H * TILE) { const rid = G.world.roomGrid[Math.floor(ny / TILE) * MAP_W + Math.floor(nx / TILE)], d = G.world.doors.find((q) => q.room === rid); if (!d) continue; nx = d.ox; ny = d.oy; } x.fillStyle = '#ffd23a'; x.font = '700 16px "Pixelify Sans", sans-serif'; x.fillText(mk, nx / TILE * S, ny / TILE * S - 6); }
    x.font = '600 12px "Pixelify Sans", sans-serif';
    for (const [id, name0, px0, py0, room, dead, wd] of G.mapPlayers || []) { // les autres pirates, partout sur la carte
      const name = wd ? `☠ ${name0} (recherché)` : name0;
      if (id === G.myId) continue;
      let px = px0, py = py0;
      if (room >= 0) { const d = G.world.doors.find((q) => q.room === room); if (d) { px = d.ox; py = d.oy; } }
      const sx = px / TILE * S, sy = py / TILE * S;
      const gm = this.inGroup(id);
      x.fillStyle = '#1c1426'; x.fillRect(sx - 4, sy - 4, 8, 8); x.fillStyle = dead ? '#8a8a9a' : gm ? '#7aff8a' : wd ? '#ff4a3a' : '#7ae0ff'; x.fillRect(sx - 3, sy - 3, 6, 6);
      x.fillStyle = 'rgba(0,0,0,0.65)'; x.fillText(name, sx + 1, sy - 6); x.fillStyle = gm ? '#c8ffd0' : wd ? '#ffb0a0' : '#c8f4ff'; x.fillText(name, sx, sy - 7);
    }
    if (G.wevt) { const ex = G.wevt.x / TILE * S, ey = G.wevt.y / TILE * S; x.fillStyle = '#1c1426'; x.beginPath(); x.arc(ex, ey, 9, 0, Math.PI * 2); x.fill(); x.fillStyle = '#ff3a2a'; x.beginPath(); x.arc(ex, ey, 6, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fff'; x.font = '700 12px "Pixelify Sans", sans-serif'; x.fillText('☠ Invasion', ex + 10, ey + 4); } // 1.0
    if (G.treasure) { const tx = G.treasure.x / TILE * S, ty = G.treasure.y / TILE * S; x.strokeStyle = '#d82a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(tx - 6, ty - 6); x.lineTo(tx + 6, ty + 6); x.moveTo(tx + 6, ty - 6); x.lineTo(tx - 6, ty + 6); x.stroke(); }
    if (G.objective) { x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(G.objective.x / TILE * S, G.objective.y / TILE * S, 5, 0, 6.3); x.fill(); x.strokeStyle = '#1c1426'; x.lineWidth = 2; x.stroke(); }
    const at = this.mapPos();
    if (G.player) {
      const px = at.x / TILE * S, py = at.y / TILE * S;
      x.fillStyle = '#000'; x.fillRect(px - 4, py - 4, 9, 9); x.fillStyle = '#fff'; x.fillRect(px - 3, py - 3, 7, 7); x.fillStyle = '#e03a2a'; x.fillRect(px - 1, py - 1, 3, 3);
    }
    x.font = '600 13px "Pixelify Sans", sans-serif'; x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText('Vous êtes ici', (at.x / TILE) * S, (at.y / TILE) * S + 18);
  }
}
Object.assign(UI.prototype, social); // 1.0 : la vie en société
Object.assign(UI.prototype, tavernUI); // 1.0 : les jeux de taverne
