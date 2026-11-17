// 1.0 : l'interface de la vie en société — canaux de discussion, historique, invitations, cadres du groupe,
// amis et blocages, équipage (pavillon, rangs), échange sécurisé en six étapes, menu d'un pirate.
// Ces méthodes s'ajoutent au prototype de UI (voir la fin de ui.js) : `this` est l'interface.
import { ITEMS } from '../shared/data/items.js';
import { INV_SIZE } from '../shared/constants.js';
import { iconURL } from './render/sprites-items.js';
import { PLACES, PLACE_ORDER, REP_LEVELS, repLevel, discountOf, taxOf } from '../shared/data/places.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const CHANS = [['local', 'Local'], ['global', 'Global'], ['groupe', 'Groupe'], ['equipage', 'Équipage']];
const CH_TAG = { global: 'Global', groupe: 'Groupe', equipage: 'Équipage', mp: 'Privé' };
const RANKS = { capitaine: 'Capitaine', officier: 'Officier', matelot: 'Matelot' };
const RANK_ORDER = { capitaine: 0, officier: 1, matelot: 2 };
export const FLAG_SYMS = [['crane', 'Crâne et tibias'], ['sabres', 'Sabres croisés'], ['ancre', 'Ancre'], ['coeur', 'Cœur percé'], ['etoile', 'Étoile du nord'], ['sablier', 'Sablier']];
const ASK_TIME = { groupe: 60, equipage: 120, echange: 45, duel: 30, pari: 12 };
const STEPS = ['Proposer', 'Accepter', 'Garnir', 'Valider', 'Confirmer', 'Conclu'];

// ------------------------------------------------------------ le pavillon, en pixels
const flagCache = new Map();
export function flagURL(flag, scale = 3) {
  const f = flag || { c1: '#141418', c2: '#f3f0e2', sym: 'crane' };
  const key = `${f.c1}${f.c2}${f.sym}${scale}`;
  if (flagCache.has(key)) return flagCache.get(key);
  const W = 26, H = 18, cv = document.createElement('canvas'); cv.width = W * scale; cv.height = H * scale;
  const x = cv.getContext('2d');
  const px = (a, b, col) => { if (a < 0 || b < 0 || a >= W || b >= H) return; x.fillStyle = col; x.fillRect(a * scale, b * scale, scale, scale); };
  const rect = (a, b, w, h, col) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(a + i, b + j, col); };
  const disc = (cx, cy, r, col) => { for (let j = Math.floor(cy - r); j <= cy + r; j++) for (let i = Math.floor(cx - r); i <= cx + r; i++) if ((i - cx) ** 2 + (j - cy) ** 2 <= r * r) px(i, j, col); };
  const line = (a, b, c, d, col) => { const n = Math.max(Math.abs(c - a), Math.abs(d - b)); for (let k = 0; k <= n; k++) px(Math.round(a + (c - a) * k / n), Math.round(b + (d - b) * k / n), col); };
  const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const ch = (s) => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * k))); return `rgb(${ch(16)},${ch(8)},${ch(0)})`; };
  // la hampe, puis l'étamine qui ondule
  rect(0, 0, 2, H, '#4f321a'); rect(0, 0, 1, H, '#8c5c33'); px(0, 0, '#f2c14a'); px(1, 0, '#d49a2a');
  for (let i = 2; i < W; i++) {
    const wave = Math.round(Math.sin(i / 3.2) * 1), k = 0.82 + 0.18 * Math.cos(i / 3.2);
    for (let j = 1 + wave; j < H - 2 + wave; j++) px(i, j, shade(f.c1, k));
  }
  const C = f.c2, D = shade(f.c2, 0.7), cx = 14, cy = 8;
  if (f.sym === 'crane') {
    line(cx - 6, cy + 2, cx + 6, cy + 7, D); line(cx + 6, cy + 2, cx - 6, cy + 7, D);
    disc(cx, cy - 1, 3.6, C); rect(cx - 2, cy + 2, 5, 2, C);
    px(cx - 1, cy - 1, f.c1); px(cx - 2, cy - 1, f.c1); px(cx + 1, cy - 1, f.c1); px(cx + 2, cy - 1, f.c1); px(cx, cy + 1, f.c1);
    px(cx - 1, cy + 3, f.c1); px(cx + 1, cy + 3, f.c1);
  } else if (f.sym === 'sabres') {
    line(cx - 6, cy - 5, cx + 5, cy + 5, C); line(cx + 6, cy - 5, cx - 5, cy + 5, C);
    rect(cx + 3, cy + 4, 3, 1, D); rect(cx - 5, cy + 4, 3, 1, D); px(cx + 6, cy + 6, D); px(cx - 6, cy + 6, D);
  } else if (f.sym === 'ancre') {
    disc(cx, cy - 6, 1.5, C); px(cx, cy - 6, f.c1); rect(cx, cy - 4, 1, 10, C); rect(cx - 3, cy - 3, 7, 1, C);
    line(cx - 5, cy + 3, cx - 2, cy + 6, C); line(cx + 5, cy + 3, cx + 2, cy + 6, C); rect(cx - 1, cy + 6, 3, 1, C);
    px(cx - 5, cy + 2, C); px(cx + 5, cy + 2, C);
  } else if (f.sym === 'coeur') {
    disc(cx - 2, cy - 2, 2.6, C); disc(cx + 2, cy - 2, 2.6, C);
    for (let j = 0; j < 6; j++) rect(cx - 4 + j, cy + j - 1, 9 - 2 * j, 1, C);
    line(cx - 7, cy + 5, cx + 7, cy - 6, D); px(cx + 7, cy - 6, '#ffffff');
  } else if (f.sym === 'etoile') {
    line(cx, cy - 6, cx, cy + 6, C); line(cx - 6, cy, cx + 6, cy, C); line(cx - 4, cy - 4, cx + 4, cy + 4, D); line(cx + 4, cy - 4, cx - 4, cy + 4, D);
    disc(cx, cy, 1.8, C);
  } else if (f.sym === 'sablier') {
    rect(cx - 4, cy - 6, 9, 1, C); rect(cx - 4, cy + 6, 9, 1, C);
    for (let j = 0; j < 5; j++) { rect(cx - 3 + j, cy - 5 + j, 7 - 2 * j, 1, j < 2 ? D : C); rect(cx - 3 + j, cy + 5 - j, 7 - 2 * j, 1, j > 2 ? D : C); }
    px(cx, cy, C);
  }
  const url = cv.toDataURL(); flagCache.set(key, url); return url;
}

export const social = {
  // ------------------------------------------------------------ discussion
  bindChat() {
    const inp = $('chat-input');
    this.chatCh = 'local'; this.chatFilter = 'tout'; this.chatHist = []; this.chatHistI = -1;
    inp.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const m = inp.value.trim();
        if (m) { this.G.send({ t: 'chat', m, ch: this.chatCh }); this.chatHist.push(m); if (this.chatHist.length > 30) this.chatHist.shift(); }
        this.chatHistI = -1; inp.value = ''; inp.blur();
      }
      if (e.key === 'Escape') { inp.value = ''; inp.blur(); }
      if (e.key === 'Tab') { e.preventDefault(); this.cycleChannel(e.shiftKey ? -1 : 1); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { // l'historique de ce qu'on a dit
        const h = this.chatHist; if (!h.length) return;
        e.preventDefault();
        if (this.chatHistI < 0) this.chatHistI = h.length;
        this.chatHistI = Math.max(0, Math.min(h.length, this.chatHistI + (e.key === 'ArrowUp' ? -1 : 1)));
        inp.value = h[this.chatHistI] || '';
      }
    };
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this.typing() && !$('hud').classList.contains('hidden')) { e.preventDefault(); this.focusChat(); }
    });
    inp.onfocus = () => $('chat').classList.remove('idle');
    inp.onblur = () => { this.chatIdleT = performance.now() / 1000; };
    $('chat-ch').onclick = (e) => { this.cycleChannel(e.shiftKey ? -1 : 1); inp.focus(); };
    $('chat-tabs').innerHTML = [['tout', 'Tout'], ['global', 'Global'], ['groupe', 'Groupe'], ['equipage', 'Équipage'], ['mp', 'Privé']].map(([k, l]) => `<button data-f="${k}"${k === 'tout' ? ' class="on"' : ''}>${l}</button>`).join('');
    $('chat-tabs').onclick = (e) => { const b = e.target.closest('button'); if (b) this.setChatFilter(b.dataset.f); };
    $('chat-log').onclick = (e) => { const w = e.target.closest('.who'); if (w && w.dataset.name) this.playerMenu(w.dataset.name, e); };
    this.paintChannel();
  },
  focusChat(prefill) {
    $('chat').classList.remove('idle');
    const inp = $('chat-input');
    if (prefill != null) inp.value = prefill;
    inp.focus();
    if (prefill != null) inp.setSelectionRange(inp.value.length, inp.value.length);
  },
  channelOk(ch) { const s = this.soc || {}; return ch === 'groupe' ? !!s.group : ch === 'equipage' ? !!s.crew : true; },
  cycleChannel(dir) {
    let i = CHANS.findIndex(([k]) => k === this.chatCh);
    for (let n = 0; n < CHANS.length; n++) { i = (i + dir + CHANS.length) % CHANS.length; if (this.channelOk(CHANS[i][0])) break; }
    this.chatCh = CHANS[i][0]; this.paintChannel();
  },
  paintChannel() {
    if (!this.channelOk(this.chatCh)) this.chatCh = 'local';
    const b = $('chat-ch'); if (!b) return;
    b.textContent = CHANS.find(([k]) => k === this.chatCh)[1];
    b.className = 'ch-' + this.chatCh;
    $('chat-input').placeholder = { local: 'Aux pirates proches', global: 'À tout l’archipel', groupe: 'À votre groupe', equipage: 'À votre équipage' }[this.chatCh] + ' · Tab : canal';
  },
  setChatFilter(f) {
    this.chatFilter = f;
    document.querySelectorAll('#chat-tabs button').forEach((b) => { b.classList.toggle('on', b.dataset.f === f); if (b.dataset.f === f) b.classList.remove('new'); });
    for (const d of $('chat-log').children) d.hidden = !this.chatShows(d.dataset.ch);
    const log = $('chat-log'); log.scrollTop = log.scrollHeight;
    if (['global', 'groupe', 'equipage'].includes(f) && this.channelOk(f)) { this.chatCh = f; this.paintChannel(); }
  },
  chatShows(ch) {
    const f = this.chatFilter || 'tout';
    if (ch === 'global' && this.settings().global === false && f !== 'global') return false;
    return f === 'tout' || ch === f || ch === 'sys' && f !== 'mp';
  },
  chat(m) {
    const log = $('chat-log');
    const atBottom = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    const d = document.createElement('div');
    const ch = m.from ? (m.kind === 'mp' ? 'mp' : m.ch || 'local') : 'sys';
    d.dataset.ch = ch;
    if (m.from) {
      d.className = 'c-' + ch;
      if (CH_TAG[ch]) { const t = document.createElement('span'); t.className = 'cht'; t.textContent = `[${CH_TAG[ch]}] `; d.appendChild(t); }
      if (m.crew) { const t = document.createElement('span'); t.className = 'crt'; t.textContent = `[${m.crew}] `; d.appendChild(t); }
      const w = document.createElement('span'); w.className = 'who';
      const name = String(m.from).replace(/^→ /, '');
      if (name !== (this.G.player && this.G.player.name)) w.dataset.name = name;
      w.textContent = `${m.from}${m.lvl ? ' [' + m.lvl + ']' : ''} : `;
      d.appendChild(w); d.appendChild(document.createTextNode(m.m));
    } else { d.className = m.kind || 'sys'; d.textContent = m.m; }
    d.hidden = !this.chatShows(ch);
    log.appendChild(d);
    while (log.children.length > 150) log.firstChild.remove(); // l'historique de la session
    if (atBottom || !d.hidden) log.scrollTop = log.scrollHeight;
    if (ch === 'mp' && !String(m.from).startsWith('→')) { // un message privé : on le signale
      if (this.settings().mpSound !== false) this.G.sfx.play('quest', 0.5);
      const b = document.querySelector('#chat-tabs button[data-f="mp"]'); if (b && this.chatFilter !== 'mp') b.classList.add('new');
      if (!this.typing() && $('chat').classList.contains('idle')) this.toast(`Message privé de ${m.from} (Entrée puis /r pour répondre)`, 'info');
    }
    if (d.hidden) return;
    $('chat').classList.remove('idle');
    this.chatIdleT = performance.now() / 1000;
  },

  // ------------------------------------------------------------ invitations (groupe, équipage, échange)
  ask(m) {
    const box = $('asks');
    const key = m.kind + ':' + m.from;
    for (const el of box.children) if (el.dataset.k === key) el.remove();
    while (box.children.length >= 3) box.firstChild.remove();
    const el = document.createElement('div'); el.className = 'ask'; el.dataset.k = key;
    if (m.kind === 'pari') return this.askBet(m);
    const txt = m.kind === 'duel' ? `<b>${esc(m.from)}</b> vous défie en duel dans la Fosse${m.bet ? ` — mise : <b>${m.bet} doublons</b> chacun` : ''}.<small>On ne meurt pas dans la Fosse ; le vainqueur emporte les mises (moins 5 %).</small>`
      : m.kind === 'groupe' ? `<b>${esc(m.from)}</b> vous invite dans son groupe.<small>Expérience partagée et +10 % par compagnon proche.</small>`
      : m.kind === 'equipage' ? `<b>${esc(m.from)}</b> vous invite à rejoindre l’équipage <b>« ${esc(m.crew)} »</b> [${esc(m.tag)}].`
        : `<b>${esc(m.from)}</b> vous propose un échange.<small>Rien ne change de mains avant votre double confirmation.</small>`;
    const dur = ASK_TIME[m.kind] || 45;
    el.innerHTML = `<div class="ask-t">${txt}</div><div class="ask-b"><button class="btn ok">Accepter</button><button class="btn no">Refuser</button></div><div class="ask-time"><i style="animation-duration:${dur}s"></i></div>`;
    const G = this.G, done = (yes) => {
      el.remove(); clearTimeout(el.tm);
      if (m.kind === 'groupe') G.send({ t: 'soc', a: yes ? 'accept' : 'decline', name: m.from });
      else if (m.kind === 'equipage') { if (yes) G.send({ t: 'crew', a: 'accept' }); }
      else if (m.kind === 'duel') G.send({ t: 'arena', a: yes ? 'accept' : 'decline' });
      else G.send({ t: 'trade', a: yes ? 'accept' : 'decline' });
    };
    el.querySelector('.ok').onclick = () => done(true);
    el.querySelector('.no').onclick = () => done(false);
    el.tm = setTimeout(() => el.remove(), dur * 1000);
    box.appendChild(el);
    G.sfx.play('quest', 0.6);
  },

  // 1.0 : les gradins parient sur le vainqueur d'un duel
  askBet(m) {
    const box = $('asks'), el = document.createElement('div'); el.className = 'ask'; el.dataset.k = 'pari';
    for (const o of box.querySelectorAll('[data-k="pari"]')) o.remove();
    el.innerHTML = `<div class="ask-t">🤺 <b>${esc(m.from)}</b> contre <b>${esc(m.vs)}</b> : les paris sont ouverts !<small>Pari mutuel : les gagnants se partagent la cagnotte (moins 5 %).</small></div>
      <div class="ask-b"><select class="bet-n"><option>50</option><option selected>100</option><option>250</option><option>500</option></select><button class="btn ok" data-on="0">${esc(m.from)}</button><button class="btn ok" data-on="1">${esc(m.vs)}</button><button class="btn no">Non merci</button></div><div class="ask-time"><i style="animation-duration:12s"></i></div>`;
    const done = () => { el.remove(); clearTimeout(el.tm); };
    el.querySelectorAll('[data-on]').forEach((b) => { b.onclick = () => { this.G.send({ t: 'arena', a: 'bet', on: +b.dataset.on, n: +el.querySelector('.bet-n').value }); done(); }; });
    el.querySelector('.no').onclick = done;
    el.tm = setTimeout(done, 12000);
    box.appendChild(el); this.G.sfx.play('coin', 0.6);
  },
  // ------------------------------------------------------------ état social, cadres du groupe
  setSoc(s) {
    this.soc = s;
    this.groupIds = new Set(s.group ? s.group.members.map((q) => q.id) : []);
    this.myCrewTag = s.crew ? s.crew.tag : '';
    if (s.group) this.grpLive = s.group.members.map((q) => [q.id, q.hp, q.maxHp, q.dead ? 1 : 0, q.lvl]);
    else this.grpLive = null;
    this.paintChannel();
    this.renderGroupFrames();
    if (this.open === 'crew') this.renderCrew();
  },
  inGroup(id) { return !!(this.groupIds && this.groupIds.has(id) && id !== this.G.myId); },
  grp(m) { this.grpLive = m.m; this.renderGroupFrames(); },
  renderGroupFrames() {
    const box = $('grp-frames'); if (!box) return;
    const g = this.soc && this.soc.group;
    if (!g) { box.innerHTML = ''; return; }
    const live = new Map((this.grpLive || []).map((r) => [r[0], r]));
    const html = g.members.filter((q) => q.id !== this.G.myId).map((q) => {
      const r = live.get(q.id) || [q.id, q.hp, q.maxHp, q.dead ? 1 : 0, q.lvl];
      const pct = r[3] ? 0 : Math.max(0, Math.min(100, r[1] / r[2] * 100));
      return `<div class="gf${r[3] ? ' dead' : ''}" data-name="${esc(q.name)}"><div class="gf-n">${g.leader === q.id ? '<i class="crown"></i>' : ''}${esc(q.name)} <span>${r[4]}</span></div><div class="gf-hp"><i style="width:${pct}%"></i><b>${r[3] ? 'à terre' : Math.ceil(r[1]) + ' / ' + r[2]}</b></div></div>`;
    }).join('');
    if (box.dataset.h !== html) { box.innerHTML = html; box.dataset.h = html; }
    box.onclick = (e) => { const f = e.target.closest('.gf'); if (f) this.playerMenu(f.dataset.name, e); };
  },

  // ------------------------------------------------------------ menu d'un pirate (E près de lui, ou clic sur son nom)
  playerMenu(name, ev) {
    const G = this.G, s = this.soc || {}, key = String(name).toLowerCase();
    const menu = $('pmenu');
    const friend = (s.friends || []).some(([n]) => n.toLowerCase() === key);
    const blocked = (s.blocked || []).includes(key);
    const g = s.group, member = g && g.members.find((q) => q.name.toLowerCase() === key);
    const lead = g && g.leader === G.myId;
    const crewRank = s.crew && s.crew.rank;
    const items = [
      ['mp', 'Message privé'],
      member ? ['join', 'Rejoindre (téléportation depuis une ville)'] : (!g || lead) ? ['invite', 'Inviter dans le groupe'] : null,
      member && lead ? ['gkick', 'Retirer du groupe'] : null,
      ['trade', 'Proposer un échange'],
      G.room >= 0 && G.world.rooms[G.room].kind === 'fosse' ? ['duel', '🤺 Défier en duel (Fosse)'] : null,
      friend ? ['unfriend', 'Retirer de vos amis'] : ['friend', 'Ajouter en ami'],
      s.crew && crewRank !== 'matelot' && !(s.crew.members || []).some(([n]) => n.toLowerCase() === key) ? ['crew', `Inviter dans l’équipage [${s.crew.tag}]`] : null,
      blocked ? ['unblock', 'Ne plus ignorer'] : ['block', 'Ignorer (bloquer)'],
      ['report', 'Signaler à la capitainerie'],
    ].filter(Boolean);
    menu.innerHTML = `<div class="pm-h">${esc(name)}</div>` + items.map(([a, l]) => `<button data-a="${a}"${a === 'block' || a === 'report' ? ' class="warn"' : ''}>${l}</button>`).join('');
    menu.classList.remove('hidden');
    const x = ev && ev.clientX != null ? ev.clientX : innerWidth / 2 + 30, y = ev && ev.clientY != null ? ev.clientY : innerHeight / 2 - 40;
    menu.style.left = Math.min(innerWidth - menu.offsetWidth - 6, x + 6) + 'px';
    menu.style.top = Math.min(innerHeight - menu.offsetHeight - 6, Math.max(6, y - 10)) + 'px';
    const shut = () => { menu.classList.add('hidden'); removeEventListener('mousedown', out, true); };
    const out = (e) => { if (!menu.contains(e.target)) shut(); };
    setTimeout(() => addEventListener('mousedown', out, true), 0);
    menu.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      shut();
      const a = b.dataset.a;
      if (a === 'mp') return this.focusChat(`/mp ${name} `);
      if (a === 'report') return this.focusChat(`/signaler ${name} `);
      if (a === 'trade') return G.send({ t: 'trade', a: 'ask', name });
      if (a === 'duel') return this.duelMenu(name, e);
      if (a === 'crew') return G.send({ t: 'crew', a: 'invite', name });
      if (a === 'gkick') return G.send({ t: 'soc', a: 'kick', name });
      G.send({ t: 'soc', a, name });
    };
    G.sfx.play('click');
  },
  duelMenu(name, ev) {
    const menu = $('pmenu');
    menu.innerHTML = `<div class="pm-h">Défier ${esc(name)}</div>` + [0, 100, 500, 1000, 2500].map((b) => `<button data-b="${b}">${b ? `Mise : ${b} doublons` : 'Pour l’honneur (sans mise)'}</button>`).join('');
    menu.classList.remove('hidden');
    const shut = () => { menu.classList.add('hidden'); removeEventListener('mousedown', out, true); };
    const out = (e) => { if (!menu.contains(e.target)) shut(); };
    setTimeout(() => addEventListener('mousedown', out, true), 0);
    menu.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; shut(); this.G.send({ t: 'arena', a: 'duel', name, bet: +b.dataset.b }); };
  },
  closeMenus() { const m = $('pmenu'); if (m) m.classList.add('hidden'); },

  // ------------------------------------------------------------ panneau « Compagnons » (P)
  renderCrew(tab) {
    if (tab) this.crewTab = tab;
    tab = this.crewTab || (this.soc && this.soc.group ? 'groupe' : 'amis');
    this.crewTab = tab;
    const G = this.G, s = this.soc || { friends: [], blocked: [], log: [] };
    const tabs = [['groupe', 'Groupe'], ['amis', `Amis (${s.friends.filter((f) => f[1]).length}/${s.friends.length})`], ['equipage', 'Équipage'], ['honneur', 'Honneur'], ['saison', 'Saison'], ['ignores', 'Ignorés'], ['echanges', 'Échanges']];
    $('crew-tabs').innerHTML = tabs.map(([k, l]) => `<button data-k="${k}" class="${k === tab ? 'on' : ''}">${l}</button>`).join('');
    $('crew-tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.k === 'honneur') G.send({ t: 'ladder' }); if (b.dataset.k === 'saison') G.send({ t: 'season' }); this.renderCrew(b.dataset.k); };
    const body = $('crew-body');
    const row = (name, sub, btns, on = true) => `<div class="soc-row${on ? '' : ' off'}"><i class="dot${on ? ' on' : ''}"></i><span class="sn" data-name="${esc(name)}">${esc(name)}</span><span class="ss">${sub}</span><span class="sb">${btns}</span></div>`;
    const btn = (a, label, name, cls = '') => `<button class="btn mini ${cls}" data-a="${a}" data-n="${esc(name || '')}">${label}</button>`;
    const addBox = (a, ph, label) => `<div class="soc-add"><input id="soc-in" maxlength="16" placeholder="${ph}" autocomplete="off"><button class="btn" data-a="${a}" data-in="1">${label}</button></div>`;
    let h = '';
    if (tab === 'groupe') {
      const g = s.group;
      h += `<p class="soc-help">Jusqu’à cinq pirates. Les membres proches partagent l’expérience et les objectifs de quête des monstres abattus, avec +10 % par compagnon. Depuis une ville, vous pouvez rejoindre un membre (une fois toutes les cinq minutes).</p>`;
      if (g) {
        for (const q of g.members) {
          const me = q.id === G.myId, lead = g.leader === q.id;
          const live = (this.grpLive || []).find((r) => r[0] === q.id);
          const hp = live ? live[1] : q.hp, mhp = live ? live[2] : q.maxHp, dead = live ? live[3] : q.dead;
          h += row(q.name, `${lead ? 'Chef · ' : ''}niv. ${q.lvl} · ${dead ? 'à terre' : Math.ceil(hp) + ' / ' + mhp + ' PV'}`,
            me ? '' : btn('join', 'Rejoindre', q.name) + (g.leader === G.myId ? btn('kick', 'Retirer', q.name, 'warn') : ''));
        }
        h += `<div class="soc-foot">${btn('leave', 'Quitter le groupe', '', 'warn')}</div>`;
      } else h += `<p class="soc-empty">Vous voguez seul. Approchez-vous d’un pirate et appuyez sur <kbd>E</kbd>, ou invitez-le par son nom.</p>`;
      if (!g || g.leader === G.myId) h += addBox('invite', 'Nom du pirate', 'Inviter');
    } else if (tab === 'amis') {
      const fr = [...s.friends].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      h += fr.length ? fr.map(([n, on, lvl]) => row(n, on ? `en mer · niv. ${lvl}` : 'à terre (hors ligne)', (on ? btn('mp', 'Écrire', n) + btn('invite', 'Grouper', n) : '') + btn('unfriend', 'Retirer', n, 'warn'), on)).join('')
        : `<p class="soc-empty">Aucun ami pour l’instant. Ajoutez un pirate ici, ou via son menu (<kbd>E</kbd> près de lui).</p>`;
      h += addBox('friend', 'Nom du pirate', 'Ajouter');
      h += `<p class="soc-help">Vous êtes prévenu quand un ami prend la mer ou rentre au port.</p>`;
    } else if (tab === 'equipage') h += this.crewHTML(s, row, btn, addBox);
    else if (tab === 'honneur') h += this.honorHTML();
    else if (tab === 'saison') h += this.seasonHTML();
    else if (tab === 'ignores') {
      h += `<p class="soc-help">Vous n’entendez plus les pirates ignorés : ni leurs messages, ni leurs invitations, ni leurs propositions d’échange.</p>`;
      h += s.blocked.length ? s.blocked.map((n) => row(n, 'ignoré', btn('unblock', 'Ne plus ignorer', n), false)).join('') : '<p class="soc-empty">Personne n’est ignoré.</p>';
      h += addBox('block', 'Nom du pirate', 'Ignorer');
    } else if (tab === 'echanges') {
      h += `<p class="soc-help">Vos dix derniers échanges conclus. Un échange ne se fait qu’après la validation puis la confirmation des deux pirates ; si quoi que ce soit bouge entre-temps, il est annulé et rien ne change de mains.</p>`;
      h += (s.log || []).length ? [...s.log].reverse().map((t) => `<div class="soc-log"><div><b>${esc(t.with)}</b> <span>${new Date(t.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div><div>Donné : ${esc(t.gave)}</div><div>Reçu : ${esc(t.got)}</div></div>`).join('') : '<p class="soc-empty">Aucun échange pour l’instant. Proposez-en un via le menu d’un pirate.</p>';
    }
    body.innerHTML = h;
    body.onclick = (e) => {
      const n = e.target.closest('.sn'); if (n && n.dataset.name) return this.playerMenu(n.dataset.name, e);
      const b = e.target.closest('button[data-a]'); if (!b) return;
      let name = b.dataset.n; if (b.dataset.in) { name = ($('soc-in') || {}).value || ''; name = name.trim(); if (!name) return; }
      this.socDo(b.dataset.a, name);
    };
    const inp = $('soc-in'); if (inp) inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') { const b = body.querySelector('button[data-in]'); if (b) b.click(); } if (e.key === 'Escape') inp.blur(); };
    this.bindCrewForm();
  },
  crewHTML(s, row, btn, addBox) {
    const c = s.crew;
    if (!c) return `<div class="crew-new">
      <img class="crew-flag" src="${flagURL(null, 4)}" alt="">
      <p>Fondez votre équipage : un nom, un sigle affiché à côté du nom de chaque membre, un pavillon, un canal de discussion (<kbd>/e</kbd>) et des rangs (capitaine, officiers, matelots).</p>
      <label>Nom <input id="crew-name" maxlength="24" placeholder="Les Mouettes Noires" autocomplete="off"></label>
      <label>Sigle <input id="crew-tag" maxlength="4" placeholder="MN" autocomplete="off"></label>
      <button class="btn" id="crew-create">Fonder l’équipage (1000 doublons)</button>
      <p class="soc-help">Ou attendez qu’un capitaine vous invite.</p></div>`;
    const cap = c.rank === 'capitaine';
    let h = `<div class="crew-head"><img class="crew-flag" src="${flagURL(c.flag, 4)}" alt=""><div><div class="crew-name">${esc(c.name)} <span>[${esc(c.tag)}]</span></div><div class="crew-sub">${c.members.length} membre${c.members.length > 1 ? 's' : ''} · vous êtes ${RANKS[c.rank] || c.rank}</div></div></div>`;
    if (cap) h += `<div class="crew-flagedit"><span>Pavillon</span><input type="color" id="fl-c1" value="${c.flag.c1}" title="Couleur du fond"><input type="color" id="fl-c2" value="${c.flag.c2}" title="Couleur du symbole"><select id="fl-sym">${FLAG_SYMS.map(([k, l]) => `<option value="${k}"${k === c.flag.sym ? ' selected' : ''}>${l}</option>`).join('')}</select><button class="btn mini" id="fl-go">Hisser</button></div>`;
    const ms = [...c.members].sort((a, b) => RANK_ORDER[a[1]] - RANK_ORDER[b[1]] || b[2] - a[2] || a[0].localeCompare(b[0]));
    h += ms.map(([n, r, on, lvl]) => {
      const me = n.toLowerCase() === (this.G.player ? String(this.G.player.name).toLowerCase() : '');
      let b = '';
      if (!me && on) b += btn('mp', 'Écrire', n);
      if (cap && !me) b += (r === 'matelot' ? btn('cpromote', 'Promouvoir', n) : btn('cdemote', 'Rétrograder', n)) + btn('ckick', 'Débarquer', n, 'warn');
      return row(n, `${RANKS[r] || r}${on ? ' · niv. ' + lvl : ' · à terre'}`, b, on);
    }).join('');
    if (c.rank !== 'matelot') h += addBox('crew', 'Nom du pirate', 'Recruter');
    h += `<div class="soc-foot">${btn('cleave', 'Quitter l’équipage', '', 'warn')}</div>`;
    h += `<p class="soc-help">Canal d’équipage : <kbd>/e message</kbd> ou Tab dans le chat. Le capitaine nomme les officiers, qui peuvent recruter.</p>`;
    return h;
  },
  // 1.0 : honneur, infamie, historique des combats et classement
  honorHTML() {
    const me = this.G.me || {}, L = this.ladder || { top: [], hist: [] };
    const status = me.jail > 0 ? '<b class="hs-j">En Geôle</b>' : me.wd ? '<b class="hs-w">Recherché</b>' : me.prot ? '<b class="hs-p">Protégé (pavillon blanc)</b>' : '<b class="hs-f">Libre</b>';
    const HOW = { prime: 'prime touchée', defense: 'légitime défense', meurtre: 'sans provocation' };
    let h = `<div class="hon-head"><div><span>Honneur</span><b>${me.hon || 0}</b></div><div><span>Infamie</span><b>${Math.floor(me.inf || 0)} / 3</b></div><div><span>Statut</span>${status}</div><div><span>Duels gagnés</span><b>${me.pk || 0}</b></div></div>`;
    h += `<p class="soc-help">Hors des villes, on peut se battre entre pirates — sauf les moins de niveau 10, ceux qui reviennent d’une défaite (pavillon blanc, deux minutes), les membres d’un même groupe ou équipage, et ceux qui ont plus de dix niveaux d’écart. Abattre un pirate qui ne vous avait pas frappé vaut un point d’infamie (deux s’il est bien plus faible) ; à trois, vous êtes <b>recherché</b> : la garde vous arrête en ville et toute mort vous mène à la Geôle. L’infamie s’efface d’un point par quart d’heure. Abattre un forban recherché rapporte sa prime et de l’honneur. On ne perd jamais plus de 10 % de son or en duel, et rien si le même pirate s’acharne.</p>`;
    h += '<h4 class="soc-h">Réputation des villes</h4><div class="rep-list">' + PLACE_ORDER.map((k) => { // 1.0
      const pts = Math.floor((me.rep || {})[k] || 0), l = repLevel(pts), next = REP_LEVELS[l + 1];
      const pct = next ? Math.max(0, Math.min(100, (pts - REP_LEVELS[l][0]) / (next[0] - REP_LEVELS[l][0]) * 100)) : 100;
      return `<div class="rep-row"><span class="rn">${esc(PLACES[k].name)}</span><span class="rl lv${l}">${REP_LEVELS[l][1]}</span><span class="rb"><i style="width:${pct}%"></i></span><span class="rx">${discountOf(l) ? `−${Math.round(discountOf(l) * 100)} % · ` : ''}taxe ${String(Math.round(taxOf(k, l) * 1000) / 10).replace('.', ',')} %</span></div>`;
    }).join('') + '</div><p class="soc-help">On gagne la réputation d’une ville en abattant les morts de sa région, en y rendant des quêtes et en commerçant chez ses marchands ; un meurtre ou une arrestation la font chuter.</p>';
    h += '<h4 class="soc-h">Vos derniers combats</h4>';
    const hist = this.honHist || L.hist || [];
    h += hist.length ? [...hist].reverse().map((x) => `<div class="soc-log ${x.k === 'tue' ? 'win' : 'loss'}"><div>${x.k === 'tue' ? '⚔ Vous avez abattu' : '☠ Abattu par'} <b>${esc(x.who)}</b> (niv. ${x.lvl}) <span>${esc(x.where || '')} · ${new Date(x.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div><div class="how-${x.how}">${HOW[x.how] || ''}${x.lost ? ` · ${x.lost} doublons perdus` : ''}</div></div>`).join('') : '<p class="soc-empty">Aucun duel pour l’instant.</p>';
    h += '<h4 class="soc-h">Classement de l’honneur</h4>';
    h += L.top && L.top.length ? `<table class="ladder"><tr><th>#</th><th>Pirate</th><th>Honneur</th><th>Victoires</th><th>Défaites</th></tr>${L.top.map(([n, hon, k, d], i) => `<tr class="${this.G.player && n === this.G.player.name ? 'me' : ''}"><td>${i + 1}</td><td>${esc(n)}</td><td>${hon}</td><td>${k}</td><td>${d}</td></tr>`).join('')}</table>` : '<p class="soc-empty">Le classement est vide : aucun duel n’a encore eu lieu.</p>';
    return h;
  },
  // 1.0 : la saison — concours de pêche, Grand Tour de Libertalia, records, podium de la saison passée
  seasonHTML() {
    const S = this.seasonData;
    if (!S) return '<p class="soc-empty">Un instant…</p>';
    const t = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    const table = (rows, head, fmt) => rows.length ? `<table class="ladder"><tr><th>#</th><th>Pirate</th><th>${head}</th></tr>${rows.map(([n, v], i) => `<tr class="${this.G.player && n === this.G.player.name ? 'me' : ''}"><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(n)}</td><td>${fmt(v)}</td></tr>`).join('')}</table>` : '<p class="soc-empty">Personne pour l’instant : la place est à prendre.</p>';
    let h = `<p class="soc-help">Saison de <b>${esc(S.name)}</b>. À la fin du mois, les trois premiers de chaque concours reçoivent 5000, 3000 et 1500 doublons ; les premiers, le Tricorne des saisons et le titre de Champion des saisons.</p>`;
    h += '<h4 class="soc-h">🎣 Concours de pêche</h4><p class="soc-help">Pour chaque espèce, votre plus belle prise compte, rapportée à la plus grande possible.</p>' + table(S.fish, 'Points', (v) => v);
    if (S.records.length) h += `<div class="soc-log">${S.records.map(([f, n, kg]) => `<div>${esc(f)} : <b>${String(kg).replace('.', ',')} kg</b> — ${esc(n)}</div>`).join('')}</div>`;
    h += '<h4 class="soc-h">🏇 Grand Tour de Libertalia</h4><p class="soc-help">Tobias, aux Écuries du Nord de Libertalia, donne le départ. Six portes autour de l’île, en selle, et retour.</p>' + table(S.race, 'Temps', t);
    if (S.last) h += `<h4 class="soc-h">La saison passée (${esc(S.last.name)})</h4><div class="soc-log"><div>Pêche : ${S.last.fish.map(([n, v]) => `${esc(n)} (${v})`).join(', ') || '—'}</div><div>Grand Tour : ${S.last.race.map(([n, v]) => `${esc(n)} (${t(v)})`).join(', ') || '—'}</div></div>`;
    return h;
  },
  bindCrewForm() {
    const G = this.G;
    const cr = $('crew-create');
    if (cr) {
      for (const id of ['crew-name', 'crew-tag']) $(id).onkeydown = (e) => e.stopPropagation();
      cr.onclick = () => G.send({ t: 'crew', a: 'create', name: $('crew-name').value.trim(), tag: $('crew-tag').value.trim().toUpperCase() });
    }
    const go = $('fl-go');
    if (go) {
      const prev = () => { const im = document.querySelector('.crew-head .crew-flag'); if (im) im.src = flagURL({ c1: $('fl-c1').value, c2: $('fl-c2').value, sym: $('fl-sym').value }, 4); };
      for (const id of ['fl-c1', 'fl-c2', 'fl-sym']) $(id).oninput = prev;
      go.onclick = () => G.send({ t: 'crew', a: 'flag', c1: $('fl-c1').value, c2: $('fl-c2').value, sym: $('fl-sym').value });
    }
  },
  socDo(a, name) {
    const G = this.G;
    if (a === 'mp') { this.close(); return this.focusChat(`/mp ${name} `); }
    if (a === 'crew') return G.send({ t: 'crew', a: 'invite', name });
    if (a === 'cpromote' || a === 'cdemote' || a === 'ckick') return G.send({ t: 'crew', a: a.slice(1), name });
    if (a === 'cleave') { if (confirm('Quitter l’équipage ?')) G.send({ t: 'crew', a: 'leave' }); return; }
    G.send({ t: 'soc', a, name });
  },

  // ------------------------------------------------------------ échange sécurisé
  trade(m) {
    if (m.closed) {
      this.tradeSt = null; this.tradeQty = null;
      if (this.open === 'trade') { $('panel-trade').classList.add('hidden'); this.open = null; this.untip(); }
      if (m.done) this.G.sfx.play('coin');
      return;
    }
    if (!this.tradeSt || this.open !== 'trade') { this.tradeSt = null; this.close(); this.open = 'trade'; $('panel-trade').classList.remove('hidden'); this.G.sfx.play('click'); }
    this.tradeSt = m;
    this.renderTrade();
  },
  tradeStep() {
    const t = this.tradeSt; if (!t) return 0;
    if (t.confirm[0] && t.confirm[1]) return 5;
    if (t.ready[0] && t.ready[1]) return 4;
    if (t.ready[0] || t.ready[1]) return 3;
    return 2;
  },
  renderTrade() {
    const t = this.tradeSt; if (!t) return;
    const G = this.G, step = this.tradeStep();
    $('trade-title').textContent = `Échange avec ${t.with}`;
    $('trade-steps').innerHTML = STEPS.map((l, i) => `<span class="${i < step ? 'done' : i === step ? 'cur' : ''}">${i + 1}. ${l}</span>`).join('');
    const slots = (o, mine) => {
      let h = '';
      for (let i = 0; i < 8; i++) {
        const x = o.items[i];
        h += x ? `<div class="slot${ITEMS[x.id].rarity ? ' r' + ITEMS[x.id].rarity : ''}" data-slot="${x.slot}" data-id="${x.id}" data-n="${x.n}"${mine ? ' title="Clic : retirer"' : ''}><img src="${iconURL(ITEMS[x.id].icon, ITEMS[x.id].tint)}">${x.n > 1 ? `<span class="n">${x.n}</span>` : ''}</div>` : '<div class="slot"></div>';
      }
      return h;
    };
    const badge = (i) => t.confirm[i] ? '<span class="tb ok">confirmé</span>' : t.ready[i] ? '<span class="tb rd">offre validée</span>' : '<span class="tb">prépare son offre</span>';
    $('trade-mine').innerHTML = `<div class="tc-h">Votre offre ${badge(0)}</div><div class="tgrid mine">${slots(t.mine, true)}</div><label class="tgold"><i class="coin"></i><input id="tr-gold" type="number" min="0" max="${G.me ? G.me.gold : 0}" value="${t.mine.gold}"> doublons</label>`;
    $('trade-theirs').innerHTML = `<div class="tc-h">Offre de ${esc(t.with)} ${badge(1)}</div><div class="tgrid">${slots(t.theirs, false)}</div><div class="tgold"><i class="coin"></i><b>${t.theirs.gold}</b> doublons</div>`;
    // votre sac : cliquer un objet le propose
    const offered = new Set(t.mine.items.map((x) => x.slot));
    let bag = '';
    for (let i = 0; i < INV_SIZE; i++) {
      const s = G.inv && G.inv[i];
      if (!s) { bag += '<div class="slot"></div>'; continue; }
      const it = ITEMS[s.id], no = it.quest;
      bag += `<div class="slot${it.rarity ? ' r' + it.rarity : ''}${offered.has(i) ? ' offered' : ''}${no ? ' dim' : ''}" data-slot="${i}" data-id="${s.id}" data-n="${s.n}"><img src="${iconURL(it.icon, it.tint)}">${s.n > 1 ? `<span class="n">${s.n}</span>` : ''}</div>`;
    }
    $('trade-bag').innerHTML = bag;
    const q = this.tradeQty;
    $('trade-qty').innerHTML = q ? `Combien de <b>${esc(ITEMS[q.id].name)}</b> ? <input id="tr-n" type="number" min="1" max="${q.max}" value="${q.max}"> <button class="btn mini" id="tr-n-ok">Proposer</button> <button class="btn mini" id="tr-n-no">Annuler</button>` : '';
    const sum = (o) => o.items.map((x) => `${x.n > 1 ? x.n + '× ' : ''}${ITEMS[x.id].name}`).concat(o.gold ? [`${o.gold} doublons`] : []).join(', ') || 'rien';
    $('trade-sum').innerHTML = step >= 4 ? `<div>Vous donnez : <b>${esc(sum(t.mine))}</b></div><div>Vous recevez : <b>${esc(sum(t.theirs))}</b></div>` : '<div class="dim">Garnissez votre offre. Toute modification, d’un côté comme de l’autre, annule les validations.</div>';
    const act = $('trade-act');
    act.disabled = false;
    if (step < 4) { act.textContent = t.ready[0] ? 'Offre validée — en attente…' : 'Valider mon offre'; act.disabled = !!t.ready[0]; act.dataset.a = 'ready'; }
    else { act.textContent = t.confirm[0] ? 'Confirmé — en attente…' : 'Confirmer l’échange'; act.disabled = !!t.confirm[0]; act.dataset.a = 'confirm'; }
    act.classList.toggle('gold', step >= 4);
    this.bindTrade();
  },
  bindTrade() {
    const G = this.G, send = (a, o = {}) => G.send({ t: 'trade', a, ...o });
    const tipOn = (el) => { el.onmouseenter = (e) => { if (el.dataset.id) this.tip(e, this.itemTip(el.dataset.id, +el.dataset.n)); }; el.onmouseleave = () => this.untip(); };
    document.querySelectorAll('#panel-trade .slot').forEach(tipOn);
    $('trade-mine').querySelectorAll('.tgrid .slot[data-slot]').forEach((el) => { el.onclick = () => { this.untip(); send('remove', { slot: +el.dataset.slot }); }; });
    $('trade-bag').querySelectorAll('.slot[data-slot]').forEach((el) => {
      el.onclick = () => {
        this.untip();
        const it = ITEMS[el.dataset.id], n = +el.dataset.n;
        if (it.quest) return this.toast('Un objet de quête ne s’échange pas.', 'warn');
        if (n > 1) { this.tradeQty = { slot: +el.dataset.slot, id: el.dataset.id, max: n }; this.renderTrade(); const inp = $('tr-n'); if (inp) { inp.focus(); inp.select(); } return; }
        send('offer', { slot: +el.dataset.slot, n: 1 });
      };
    });
    const g = $('tr-gold');
    g.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') g.blur(); };
    g.onchange = () => send('gold', { gold: Math.max(0, Math.floor(+g.value || 0)) });
    const n = $('tr-n');
    if (n) {
      const ok = () => { const q = this.tradeQty; this.tradeQty = null; send('offer', { slot: q.slot, n: Math.max(1, Math.min(q.max, Math.floor(+n.value || 1))) }); };
      n.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') ok(); if (e.key === 'Escape') { this.tradeQty = null; this.renderTrade(); } };
      $('tr-n-ok').onclick = ok;
      $('tr-n-no').onclick = () => { this.tradeQty = null; this.renderTrade(); };
    }
    $('trade-act').onclick = (e) => { if (!e.currentTarget.disabled) send(e.currentTarget.dataset.a); };
    $('trade-cancel').onclick = () => send('cancel');
  },
};
