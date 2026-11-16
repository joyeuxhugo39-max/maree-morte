// Effets sonores synthétisés (WebAudio) : aucun fichier audio nécessaire.
export class Sfx {
  constructor() {
    this.ctx = null; this.muted = false; this.musicVol = 0.6; this.sfxVol = 1;
    try { this.muted = localStorage.getItem('mm_mute') === '1'; const v = JSON.parse(localStorage.getItem('mm_settings') || '{}'); if (v.music != null) this.musicVol = v.music; if (v.sfx != null) this.sfxVol = v.sfx; } catch (e) { /* stockage indisponible */ }
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.5; this.master.connect(this.ctx.destination);
    const n = this.ctx.sampleRate * 2;
    this.noise = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbience();
    this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = this.sfxVol; this.sfxBus.connect(this.master);
    this.startMusic();
  }
  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (this.musicBus) this.musicBus.gain.setTargetAtTime(music * 0.55, this.ctx.currentTime, 0.1);
    if (this.sfxBus) this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.1);
  }
  // ---------------------------------------------------------------- musique
  startMusic() {
    const c = this.ctx;
    this.musicBus = c.createGain(); this.musicBus.gain.value = this.musicVol * 0.55; this.musicBus.connect(this.master);
    this.mus = { theme: null, want: 'day', next: c.currentTime + 0.3, step: 0, gain: null, fadeUntil: 0 };
    this.newThemeGain();
    setInterval(() => this.schedule(), 90);
  }
  newThemeGain() { const g = this.ctx.createGain(); g.gain.value = 0; g.connect(this.musicBus); this.mus.gain = g; }
  setTheme(name) { if (this.mus) this.mus.want = name; }
  schedule() {
    const c = this.ctx, m = this.mus;
    if (!m || c.state !== 'running') return;
    const now = c.currentTime;
    if (m.want !== m.theme) {
      if (m.theme) m.gain.gain.setTargetAtTime(0, now, 0.6);
      const old = m.gain; setTimeout(() => { try { old.disconnect(); } catch (e) { /* */ } }, 4000);
      this.newThemeGain(); m.theme = m.want; m.step = 0; m.next = Math.max(m.next, now + 0.1);
      m.gain.gain.setTargetAtTime(1, now + 0.4, 0.8);
    }
    const th = THEMES[m.theme];
    while (m.next < now + 0.35) { th.play(this, m.step, m.next, m.gain); m.next += th.step; m.step++; }
  }
  note(dest, midi, t, dur, { type = 'triangle', vol = 0.05, attack = 0.01, release = 0.08, detune = 0, lp = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
    let node = o;
    if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); node = f; }
    node.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + release + 0.05);
  }
  drum(dest, t, { f0 = 120, f1 = 45, dur = 0.18, vol = 0.12, noise = 0 } = {}) {
    const c = this.ctx;
    if (noise) {
      const s = c.createBufferSource(); s.buffer = this.noise;
      const hp = c.createBiquadFilter(); hp.type = noise > 1 ? 'highpass' : 'bandpass'; hp.frequency.value = noise > 1 ? 6000 : 1800;
      const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(hp); hp.connect(g); g.connect(dest); s.start(t, Math.random()); s.stop(t + dur + 0.02);
      return;
    }
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
  }
  // ---------------------------------------------------------------- météo
  rain(level) {
    if (!this.ctx) return;
    if (!this.rainG) {
      const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const bp = c.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 1400;
      this.rainG = c.createGain(); this.rainG.gain.value = 0;
      src.connect(bp); bp.connect(this.rainG); this.rainG.connect(this.sfxBus); src.start();
    }
    this.rainG.gain.setTargetAtTime(level * 0.09, this.ctx.currentTime, 1.5);
  }
  thunder(near = 0.5) {
    if (!this.ctx || this.muted) return;
    this.hiss(2.6, { f: 160, q: 0.3, vol: 0.5 * near + 0.15, slide: 0.6, type: 'lowpass', delay: 0.4 + (1 - near) * 1.2 });
    if (near > 0.7) this.hiss(0.3, { f: 4000, q: 0.5, vol: 0.25, slide: 0.3, type: 'highpass', delay: 0.05 });
  }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('mm_mute', m ? '1' : '0'); } catch (e) { /* */ }
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }
  startAmbience() {
    const c = this.ctx;
    const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = c.createGain(); g.gain.value = 0.0;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
    const lg = c.createGain(); lg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(); lfo.start();
    this.amb = g; this.ambBase = 0.05;
    g.gain.value = this.ambBase;
  }
  ambience(level) { if (this.amb) this.amb.gain.setTargetAtTime(0.02 + level * 0.07, this.ctx.currentTime, 1.2); }
  tone(f, dur, { type = 'square', vol = 0.15, slide = 0, delay = 0, attack = 0.005 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus || this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  hiss(dur, { f = 1200, q = 1, vol = 0.2, slide = 1, type = 'bandpass', delay = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (slide !== 1) fl.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(this.sfxBus || this.master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  play(name, vol = 1) {
    if (!this.ctx || this.muted) return;
    const v = vol;
    switch (name) {
      case 'slash': this.hiss(0.14, { f: 2600, q: 0.8, vol: 0.18 * v, slide: 0.35 }); break;
      case 'hit': this.tone(140, 0.12, { type: 'triangle', vol: 0.25 * v, slide: 0.45 }); this.hiss(0.06, { f: 900, vol: 0.15 * v }); break;
      case 'crit': this.tone(220, 0.16, { type: 'square', vol: 0.12 * v, slide: 0.4 }); this.hiss(0.1, { f: 3000, vol: 0.15 * v, slide: 0.5 }); this.tone(880, 0.08, { vol: 0.06 * v, delay: 0.02 }); break;
      case 'shot': this.hiss(0.22, { f: 1600, q: 0.5, vol: 0.4 * v, slide: 0.15, type: 'lowpass' }); this.tone(90, 0.18, { type: 'sine', vol: 0.3 * v, slide: 0.4 }); break;
      case 'musket': this.hiss(0.3, { f: 900, q: 0.4, vol: 0.32 * v, slide: 0.2, type: 'lowpass' }); this.tone(70, 0.25, { type: 'sine', vol: 0.25 * v, slide: 0.5 }); break;
      case 'boom': this.hiss(0.8, { f: 700, q: 0.3, vol: 0.55 * v, slide: 0.1, type: 'lowpass' }); this.tone(55, 0.7, { type: 'sine', vol: 0.45 * v, slide: 0.4 }); break;
      case 'coin': this.tone(1320, 0.07, { vol: 0.08 * v }); this.tone(1980, 0.12, { vol: 0.07 * v, delay: 0.06 }); break;
      case 'pickup': this.tone(660, 0.06, { vol: 0.07 * v }); this.tone(990, 0.08, { vol: 0.06 * v, delay: 0.05 }); break;
      case 'level': [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, { vol: 0.09 * v, delay: i * 0.09, type: 'square' })); this.tone(1046, 0.5, { vol: 0.06 * v, delay: 0.36, type: 'triangle' }); break;
      case 'quest': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { vol: 0.08 * v, delay: i * 0.1, type: 'triangle' })); break;
      case 'hurt': this.tone(320, 0.18, { type: 'square', vol: 0.1 * v, slide: 0.5 }); this.hiss(0.08, { f: 500, vol: 0.12 * v }); break;
      case 'groan': { const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(95 + Math.random() * 30, t); o.frequency.linearRampToValueAtTime(70, t + 0.7);
        lp.type = 'lowpass'; lp.frequency.value = 500; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06 * v, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        o.connect(lp); lp.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.85); break; }
      case 'die': this.hiss(0.4, { f: 400, vol: 0.18 * v, slide: 0.3, type: 'lowpass' }); this.tone(200, 0.35, { type: 'triangle', vol: 0.1 * v, slide: 0.3 }); break;
      case 'click': this.tone(880, 0.04, { vol: 0.05 * v }); break;
      case 'roll': this.hiss(0.2, { f: 700, q: 0.6, vol: 0.12 * v, slide: 0.5 }); break;
      case 'throw': this.hiss(0.25, { f: 1800, q: 1, vol: 0.08 * v, slide: 0.4 }); break;
      case 'cry': this.tone(196, 0.5, { type: 'sawtooth', vol: 0.08 * v, slide: 1.3 }); this.tone(294, 0.5, { type: 'sawtooth', vol: 0.06 * v, slide: 1.3, delay: 0.05 }); break;
      case 'drink': [0, 0.12, 0.24].forEach((d) => this.tone(300 + Math.random() * 80, 0.08, { type: 'sine', vol: 0.08 * v, delay: d, slide: 1.6 })); break;
      case 'heal': this.tone(523, 0.15, { type: 'sine', vol: 0.07 * v }); this.tone(784, 0.25, { type: 'sine', vol: 0.06 * v, delay: 0.08 }); break;
      case 'chest': this.tone(330, 0.1, { type: 'square', vol: 0.06 * v }); [660, 880, 1320].forEach((f, i) => this.tone(f, 0.15, { vol: 0.06 * v, delay: 0.12 + i * 0.07 })); break;
      case 'dodge': this.hiss(0.12, { f: 3200, vol: 0.08 * v, slide: 0.6 }); break;
      case 'summon': this.tone(110, 0.6, { type: 'sawtooth', vol: 0.06 * v, slide: 0.5 }); this.hiss(0.5, { f: 300, vol: 0.12 * v, slide: 2 }); break;
      case 'door': this.tone(240, 0.22, { type: 'sawtooth', vol: 0.035 * v, slide: 0.6 }); this.hiss(0.14, { f: 500, q: 0.6, vol: 0.16 * v, delay: 0.16, type: 'lowpass' }); break;
      case 'deny': this.tone(180, 0.12, { type: 'square', vol: 0.06 * v }); break;
      case 'splash': this.hiss(0.35, { f: 1200, q: 0.6, vol: 0.2 * v, slide: 0.4 }); this.tone(500, 0.12, { type: 'sine', vol: 0.05 * v, slide: 2 }); break;
      case 'bite': this.tone(880, 0.08, { vol: 0.08 * v }); this.tone(1175, 0.12, { vol: 0.08 * v, delay: 0.08 }); this.hiss(0.2, { f: 1500, vol: 0.12 * v }); break;
      case 'reel': [0, 0.05, 0.1, 0.15].forEach((d) => this.tone(1400 + d * 2000, 0.03, { vol: 0.04 * v, delay: d })); break;
      case 'dig': [0, 0.3, 0.6].forEach((d) => this.hiss(0.18, { f: 500, q: 0.5, vol: 0.2 * v, delay: d, type: 'lowpass' })); break;
      case 'forge': [0, 0.25, 0.5].forEach((d) => { this.tone(1800, 0.25, { type: 'triangle', vol: 0.08 * v, delay: d, slide: 0.9 }); this.tone(2700, 0.15, { type: 'sine', vol: 0.04 * v, delay: d }); }); break;
      case 'ach': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.3, { vol: 0.07 * v, delay: i * 0.07, type: 'triangle' })); break;
      case 'horn': this.tone(110, 1.4, { type: 'sawtooth', vol: 0.09 * v, attack: 0.2 }); this.tone(165, 1.4, { type: 'sawtooth', vol: 0.06 * v, attack: 0.3 }); break;
    }
  }
}

// ---------------------------------------------------------------- thèmes musicaux
const SHANTY = [[62, 2], [65, 1], [69, 2], [69, 1], [67, 2], [65, 1], [64, 2], [60, 1], [62, 2], [65, 1], [69, 2], [74, 1], [72, 2], [69, 1], [67, 3],
  [65, 2], [67, 1], [69, 2], [65, 1], [64, 2], [67, 1], [72, 2], [64, 1], [62, 2], [64, 1], [65, 1], [64, 1], [62, 1], [62, 3], [57, 3]];
const SHANTY_STEPS = []; { let t = 0; for (const [n, l] of SHANTY) { SHANTY_STEPS[t] = [n, l]; t += l; } }
const SHANTY_BASS = [38, 36, 38, 36, 41, 36, 38, 45];
const PENTA = [74, 77, 79, 81, 84, 86];
const THEMES = {
  day: { step: 0.19, play(a, k, t, g) {
    const i = k % 48, bar = Math.floor(i / 6);
    const m = SHANTY_STEPS[i];
    if (m) { a.note(g, m[0] + 12, t, m[1] * 0.19 * 0.92, { type: 'square', vol: 0.022, lp: 2200 }); a.note(g, m[0], t, m[1] * 0.19 * 0.92, { type: 'triangle', vol: 0.03 }); }
    if (i % 6 === 0 || i % 6 === 3) a.note(g, SHANTY_BASS[bar] + (i % 6 === 3 ? 7 : 0), t, 0.3, { type: 'triangle', vol: 0.06 });
    if (i % 3 === 0) a.drum(g, t, { f0: 110, f1: 50, dur: 0.14, vol: i % 6 === 0 ? 0.09 : 0.05 });
    a.drum(g, t, { noise: 2, dur: 0.04, vol: i % 3 === 0 ? 0.012 : 0.006 });
  } },
  night: { step: 0.25, play(a, k, t, g) {
    const i = k % 64;
    if (i % 16 === 0) { const ch = [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]][Math.floor(i / 16)]; for (const n of ch) { a.note(g, n, t, 3.8, { type: 'sawtooth', vol: 0.012, attack: 1.2, release: 1.4, lp: 650, detune: -6 }); a.note(g, n, t, 3.8, { type: 'sawtooth', vol: 0.012, attack: 1.2, release: 1.4, lp: 650, detune: 7 }); } }
    if (Math.random() < 0.16) a.note(g, PENTA[(Math.random() * PENTA.length) | 0], t, 0.05, { type: 'sine', vol: 0.03, attack: 0.005, release: 1.4 });
  } },
  swamp: { step: 0.25, play(a, k, t, g) {
    const i = k % 32;
    if (i === 0) { a.note(g, 38, t, 7.6, { type: 'sawtooth', vol: 0.014, attack: 2, release: 2, lp: 300 }); a.note(g, 45, t, 7.6, { type: 'sawtooth', vol: 0.01, attack: 2, release: 2, lp: 300, detune: 8 }); }
    if (i % 8 === 0) { a.drum(g, t, { f0: 70, f1: 40, dur: 0.22, vol: 0.09 }); a.drum(g, t + 0.2, { f0: 60, f1: 38, dur: 0.2, vol: 0.06 }); }
    if (Math.random() < 0.06) a.note(g, [75, 74, 70, 63][(Math.random() * 4) | 0], t, 0.05, { type: 'sine', vol: 0.025, release: 1.8 });
  } },
  boss: { step: 0.105, play(a, k, t, g) {
    const i = k % 32;
    if (i % 16 === 0 || i % 16 === 8 || i % 16 === 10) a.drum(g, t, { f0: 140, f1: 40, dur: 0.2, vol: 0.13 });
    if (i % 8 === 4) a.drum(g, t, { noise: 1, dur: 0.12, vol: 0.06 });
    if (i % 2 === 0) a.drum(g, t, { noise: 2, dur: 0.03, vol: 0.012 });
    const riff = [38, 38, 41, 38, 43, 38, 41, 40, 38, 38, 41, 38, 46, 45, 43, 41];
    if (i % 2 === 0) a.note(g, riff[(i / 2) % 16], t, 0.1, { type: 'sawtooth', vol: 0.03, lp: 900 });
    if (i % 16 === 0) for (const n of [62, 65, 69]) a.note(g, n, t, 0.25, { type: 'square', vol: 0.012, lp: 1800 });
  } },
};
