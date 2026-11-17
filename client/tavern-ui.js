// 1.0 : l'interface des jeux de taverne — bras de fer (appuyez quand l'aiguille est dans le vert),
// concours de rhum, Trente-et-un, et les chansons à boire que toute la salle reprend.
// Ces méthodes s'ajoutent au prototype de UI (voir la fin de ui.js).
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GAMES = [['arm', '💪 Bras de fer'], ['rum', '🍺 Concours de rhum'], ['cards', '🃏 Trente-et-un']];
const RULES = {
  arm: 'Une aiguille va et vient : appuyez sur <kbd>Espace</kbd> (ou le bouton) quand elle est dans la zone verte. Cinq appuis. Faites mieux que votre adversaire pour gagner votre mise.',
  rum: 'Chacun son tour, un verre. Le premier qui roule sous la table a perdu. « Cul sec » : deux verres d’un coup, et un bonus de 50 % si l’autre tombe. Abandonner rend la moitié de la mise.',
  cards: 'Approchez-vous de 31 sans le dépasser. Le tavernier tire jusqu’à 27. Un 31 pile paie une fois et demie.',
};

export const tavernUI = {
  openTavern(npc) {
    this.close(); this.open = 'tavern'; this.tavNpc = npc; this.tavGame = this.tavGame || 'arm';
    $('panel-tavern').classList.remove('hidden');
    this.renderTavern();
  },
  renderTavern(state) {
    if (state) this.tavState = state;
    const g = this.tavGame, s = this.tavState && this.tavState.g === g ? this.tavState : null;
    $('tav-tabs').innerHTML = GAMES.map(([k, l]) => `<button data-k="${k}" class="${k === g ? 'on' : ''}">${l}</button>`).join('');
    $('tav-tabs').onclick = (e) => { const b = e.target.closest('button'); if (!b || (this.tavState && !this.tavState.done)) return; this.tavGame = b.dataset.k; this.tavState = null; this.renderTavern(); };
    const playing = s && !s.done;
    const bet = `<label class="tav-bet">Mise <select id="tav-bet">${[10, 25, 50, 100, 200, 300].map((b) => `<option${b === (this.tavBet || 50) ? ' selected' : ''}>${b}</option>`).join('')}</select> doublons</label>`;
    let h = `<p class="soc-help">${RULES[g]}</p>`;
    if (g === 'arm') {
      h += `<canvas id="tav-arm" width="420" height="46"></canvas><div class="tav-info" id="tav-arm-info">${s ? (s.done ? this.tavResult(s, `${s.hits} coup${s.hits > 1 ? 's' : ''} justes contre ${s.need} pour votre adversaire.`) : `Votre adversaire en réussira ${s.need}. Faites mieux !`) : ''}</div>`;
      h += playing ? '<div class="tav-btns"><button class="btn gold" id="tav-tap">Tirer ! (Espace)</button></div>' : `<div class="tav-btns">${bet}<button class="btn" id="tav-go">Empoigner</button></div>`;
    } else if (g === 'rum') {
      const glasses = (n) => '🥃'.repeat(Math.min(n, 14)) || '—';
      h += `<div class="tav-duel"><div><b>Vous</b><div class="tav-g">${glasses(s ? s.me : 0)}</div></div><div><b>Le tavernier</b><div class="tav-g">${glasses(s ? s.them : 0)}</div></div></div>`;
      h += `<div class="tav-info">${s && s.done ? this.tavResult(s, s.quit ? 'Vous posez votre verre.' : s.win ? 'Le tavernier roule sous la table !' : 'Vous roulez sous la table…') : ''}</div>`;
      h += playing ? '<div class="tav-btns"><button class="btn" data-a="drink">Un verre</button><button class="btn gold" data-a="double">Cul sec ! (×2)</button><button class="btn warn" data-a="rumStop">Abandonner</button></div>' : `<div class="tav-btns">${bet}<button class="btn" id="tav-go">Défier le tavernier</button></div>`;
    } else {
      const hand = (c) => (c || []).map((v) => `<span class="card">${v === 11 ? 'As<small>11</small>' : v === 10 ? 'R<small>10</small>' : v}</span>`).join('');
      const sum = (c) => (c || []).reduce((a, v) => a + v, 0);
      h += `<div class="tav-duel"><div><b>Vous — ${s ? sum(s.me) : 0}</b><div class="tav-h">${hand(s && s.me)}</div></div><div><b>Le tavernier — ${s ? sum(s.them) : 0}</b><div class="tav-h">${hand(s && s.them)}</div></div></div>`;
      h += `<div class="tav-info">${s && s.done ? this.tavResult(s, s.bust ? 'Plus de 31 : brûlé !' : '') : ''}</div>`;
      h += playing ? '<div class="tav-btns"><button class="btn" data-a="hit">Une carte</button><button class="btn gold" data-a="stand">Je reste</button></div>' : `<div class="tav-btns">${bet}<button class="btn" id="tav-go">Distribuer</button></div>`;
    }
    $('tav-body').innerHTML = h;
    const go = $('tav-go'), G = this.G;
    if (go) go.onclick = () => { this.tavBet = +$('tav-bet').value; G.send({ t: 'tav', a: g, bet: this.tavBet }); };
    const sel = $('tav-bet'); if (sel) sel.onkeydown = (e) => e.stopPropagation();
    $('tav-body').querySelectorAll('button[data-a]').forEach((b) => { b.onclick = () => G.send({ t: 'tav', a: b.dataset.a === 'double' ? 'drink' : b.dataset.a, double: b.dataset.a === 'double' ? 1 : 0 }); });
    const tap = $('tav-tap'); if (tap) tap.onclick = () => this.armTap();
    if (g === 'arm') this.drawArm();
  },
  tavResult(s, why) { return `${why} <b class="${s.gain > 0 ? 'win' : s.gain < 0 ? 'loss' : ''}">${s.gain > 0 ? `+${s.gain} doublons !` : s.gain < 0 ? `${s.gain} doublons.` : 'Égalité : mise rendue.'}</b>`; },
  // messages du serveur
  tav(m) {
    if (m.g === 'song') return this.songLine(m);
    if (this.open !== 'tavern') return;
    if (m.g === 'arm' && !m.done) { this.arm = { ...m, t0: performance.now() / 1000, taps: [] }; }
    if (m.g === 'arm' && m.done && this.arm) this.arm.done = true;
    if (m.done) this.G.sfx.play(m.gain > 0 ? 'coin' : 'deny');
    this.renderTavern({ ...(this.tavState && !this.tavState.done && this.tavState.g === m.g ? this.tavState : {}), ...m });
  },
  // le bras de fer : l'aiguille suit la même loi que chez le serveur
  armPos(a, t) { return (Math.sin(t * a.speed + a.phase) + 1) / 2; },
  armTap() {
    const a = this.arm; if (!a || a.done || a.taps.length >= a.presses) return;
    const t = performance.now() / 1000 - a.t0; a.taps.push(+t.toFixed(3));
    const x = this.armPos(a, t); a.hits = (a.hits || 0) + (x >= a.z[0] && x <= a.z[1] ? 1 : 0);
    this.G.sfx.play(x >= a.z[0] && x <= a.z[1] ? 'hit' : 'click');
    const info = $('tav-arm-info'); if (info) info.textContent = `Coups justes : ${a.hits} / ${a.taps.length} — votre adversaire en réussira ${a.need}.`;
    if (a.taps.length >= a.presses) this.G.send({ t: 'tav', a: 'armEnd', taps: a.taps });
  },
  drawArm() {
    const cv = $('tav-arm'); if (!cv) return;
    const x = cv.getContext('2d'), a = this.arm, W = cv.width, H = cv.height;
    x.fillStyle = '#2a1a0e'; x.fillRect(0, 0, W, H); x.fillStyle = '#5a3a22'; x.fillRect(4, 14, W - 8, 18);
    if (a) {
      x.fillStyle = '#3a8a46'; x.fillRect(4 + a.z[0] * (W - 8), 14, (a.z[1] - a.z[0]) * (W - 8), 18);
      if (!a.done) { const t = performance.now() / 1000 - a.t0, p = this.armPos(a, t); x.fillStyle = '#ffd24a'; x.fillRect(4 + p * (W - 8) - 2, 6, 4, 34); }
      for (let i = 0; i < a.presses; i++) { x.fillStyle = i < a.taps.length ? '#ffd24a' : '#6a4a30'; x.fillRect(W / 2 - a.presses * 9 + i * 18, 38, 12, 5); }
    }
    if (this.open === 'tavern' && a && !a.done) requestAnimationFrame(() => this.drawArm());
  },
  // les chansons à boire : chaque vers s'affiche, et la salle chante
  songLine(m) {
    const G = this.G, now = performance.now() / 1000;
    G.songUntil = now + 6;
    const box = $('song'); box.classList.remove('hidden');
    box.innerHTML = `<small>♪ ${esc(m.name)}</small>${esc(m.line)}`;
    clearTimeout(this.songT); this.songT = setTimeout(() => box.classList.add('hidden'), 4200);
    const n = (G.npcs || []).find((q) => q.id === m.npc); // à tour de rôle : vous, puis la salle
    if (n && m.i % 2) G.renderer.addFx({ kind: 'bubble', text: '♪ ' + m.line, follow: () => n, dur: 3.4, h: 38 });
    else if (G.player) G.renderer.addFx({ kind: 'bubble', text: '♪ ' + m.line, follow: () => G.player, dur: 3.4, h: 42 });
    if (G.player && m.i === 0) G.player.danceUntil = now + 4 * m.n;
  },
};
