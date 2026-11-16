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
      case 'roar': { // rugissement : deux scies graves qui glissent, sous un souffle
        const c = this.ctx, t = c.currentTime;
        for (const [f0, f1, d] of [[150, 52, 1.1], [98, 40, 1.3], [224, 70, 0.8]]) {
          const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
          o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + d);
          lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(220, t + d);
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13 * v, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 28; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d);
          o.connect(lp); lp.connect(g); g.connect(this.sfxBus); o.start(t); o.stop(t + d + 0.05);
        }
        this.hiss(1.0, { f: 500, q: 0.4, vol: 0.22 * v, slide: 0.4, type: 'lowpass' });
        break; }
      case 'victory': [[523, 0], [659, 0.13], [784, 0.26], [1046, 0.39], [988, 0.62], [1046, 0.75], [1318, 0.9]].forEach(([f, d], i) => { this.tone(f, i === 6 ? 0.9 : 0.2, { vol: 0.09 * v, delay: d, type: 'square' }); this.tone(f / 2, i === 6 ? 0.9 : 0.2, { vol: 0.07 * v, delay: d, type: 'triangle' }); }); break;
      case 'conch': this.tone(147, 2.6, { type: 'sawtooth', vol: 0.1 * v, attack: 0.5, slide: 1.06 }); this.tone(220, 2.4, { type: 'triangle', vol: 0.08 * v, attack: 0.7, delay: 0.1 }); this.tone(73, 2.8, { type: 'sine', vol: 0.12 * v, attack: 0.4 }); break;
      case 'rumble': this.hiss(2.6, { f: 120, q: 0.3, vol: 0.5 * v, slide: 0.7, type: 'lowpass' }); this.tone(44, 2.4, { type: 'sine', vol: 0.3 * v, attack: 0.5 }); break;
      case 'crack': this.hiss(0.25, { f: 2400, q: 0.5, vol: 0.3 * v, slide: 0.2 }); this.hiss(0.5, { f: 600, q: 0.4, vol: 0.3 * v, slide: 0.3, type: 'lowpass', delay: 0.05 }); this.tone(180, 0.2, { type: 'square', vol: 0.08 * v, slide: 0.4 }); break;
      case 'seal': this.hiss(1.6, { f: 240, q: 0.4, vol: 0.4 * v, slide: 0.6, type: 'lowpass' }); [659, 988, 1318].forEach((f, i) => this.tone(f, 0.9, { type: 'sine', vol: 0.06 * v, delay: 0.5 + i * 0.18 })); break;
      case 'unlock': this.tone(1400, 0.05, { vol: 0.08 * v }); this.tone(900, 0.08, { vol: 0.08 * v, delay: 0.07 }); this.hiss(0.2, { f: 700, q: 0.6, vol: 0.2 * v, delay: 0.12, type: 'lowpass' }); break;
      case 'pin': this.tone(1700, 0.04, { vol: 0.07 * v }); this.tone(2300, 0.05, { vol: 0.05 * v, delay: 0.04 }); break;
      case 'bark': [0, 0.22].forEach((d) => { this.tone(420, 0.1, { type: 'sawtooth', vol: 0.09 * v, slide: 0.6, delay: d }); this.hiss(0.08, { f: 1200, vol: 0.1 * v, delay: d }); }); break;
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
// Mélodies originales en ré mineur (6/8) : [note MIDI, durée en croches].
const mel = (bars) => { const steps = []; let t = 0; for (const [n, l] of bars) { if (n) steps[t] = [n, l]; t += l; } return steps; };
const SEA_MEL = mel([[69, 2], [74, 1], [77, 2], [76, 1], [74, 2], [69, 1], [65, 3], [70, 2], [74, 1], [77, 2], [74, 1], [76, 2], [72, 1], [67, 3],
  [69, 2], [74, 1], [77, 2], [79, 1], [81, 3], [77, 2], [74, 1], [79, 2], [77, 1], [74, 2], [70, 1], [69, 2], [73, 1], [76, 3],
  [77, 2], [72, 1], [69, 2], [72, 1], [76, 2], [74, 1], [72, 2], [67, 1], [65, 1], [69, 1], [74, 1], [77, 2], [76, 1], [74, 3], [70, 2], [74, 1],
  [67, 1], [70, 1], [74, 1], [79, 2], [77, 1], [76, 2], [73, 1], [69, 2], [76, 1], [74, 2], [77, 1], [76, 2], [73, 1], [74, 6]]);
const SEA_CH = [[38, 'm'], [38, 'm'], [34, 'M'], [36, 'M'], [38, 'm'], [38, 'm'], [31, 'm'], [33, 'M'], [29, 'M'], [36, 'M'], [38, 'm'], [34, 'M'], [31, 'm'], [33, 'M'], [38, 'm'], [38, 'm']];
const NAV_MEL = mel([[74, 3], [77, 3], [81, 2], [79, 1], [77, 2], [76, 1], [76, 3], [79, 3], [84, 2], [82, 1], [79, 2], [76, 1],
  [74, 1], [77, 1], [82, 1], [81, 3], [79, 2], [77, 1], [74, 3], [73, 1], [76, 1], [81, 1], [79, 2], [76, 1], [69, 3], [73, 1], [76, 1], [81, 1],
  [74, 2], [74, 1], [77, 2], [81, 1], [84, 3], [81, 2], [77, 1], [79, 2], [76, 1], [72, 2], [76, 1], [79, 1], [82, 1], [86, 1], [82, 2], [79, 1],
  [77, 2], [74, 1], [70, 2], [74, 1], [76, 2], [73, 1], [69, 1], [73, 1], [76, 1], [74, 1], [69, 1], [74, 1], [77, 1], [81, 1], [86, 1], [86, 6]]);
const NAV_CH = [[38, 'm'], [38, 'm'], [36, 'M'], [36, 'M'], [34, 'M'], [34, 'M'], [33, 'M'], [33, 'M'], [38, 'm'], [41, 'M'], [36, 'M'], [31, 'm'], [34, 'M'], [33, 'M'], [38, 'm'], [38, 'm']];
// thème des boss, en mi mineur (4/4, doubles croches)
const EPIC_MEL = mel([[76, 8], [79, 4], [78, 4], [76, 4], [71, 4], [76, 8], [79, 8], [76, 4], [72, 4], [74, 4], [78, 4], [81, 8],
  [83, 8], [81, 4], [79, 4], [79, 6], [81, 2], [83, 8], [84, 4], [83, 4], [81, 4], [76, 4], [78, 4], [75, 4], [71, 8]]);
const EPIC_CH = [[40, 'm'], [40, 'm'], [36, 'M'], [38, 'M'], [40, 'm'], [43, 'M'], [45, 'm'], [47, 'M']];
const triad = (root, q) => [root + 12, root + 12 + (q === 'm' ? 3 : 4), root + 19];
const THEMES = {
  // en mer : une gigue de flibustiers, grand-voile dehors
  sea: { step: 0.168, play(a, k, t, g) {
    const i = k % 96, b = i % 6, [root, q] = SEA_CH[Math.floor(i / 6)], S = 0.168;
    const m = SEA_MEL[i];
    if (m) { a.note(g, m[0], t, m[1] * S * 0.9, { type: 'square', vol: 0.024, lp: 2400 }); a.note(g, m[0] - 12, t, m[1] * S * 0.9, { type: 'triangle', vol: 0.034 }); a.note(g, m[0], t, m[1] * S * 0.9, { type: 'sawtooth', vol: 0.008, lp: 1500, detune: 7 }); }
    if (b === 0) a.note(g, root, t, S * 2.6, { type: 'triangle', vol: 0.075 });
    if (b === 3) a.note(g, root + 7, t, S * 2.2, { type: 'triangle', vol: 0.06 });
    if (b === 2 || b === 5 || b === 1 || b === 4) for (const n of triad(root, q)) a.note(g, n, t, S * 0.5, { type: 'sawtooth', vol: b === 2 || b === 5 ? 0.011 : 0.007, lp: 1300 });
    if (b === 0) a.drum(g, t, { f0: 105, f1: 46, dur: 0.18, vol: 0.1 });
    if (b === 3) a.drum(g, t, { noise: 1, dur: 0.09, vol: 0.035 });
    a.drum(g, t, { noise: 2, dur: 0.035, vol: b % 3 === 0 ? 0.014 : 0.007 });
  } },
  // bataille navale : le même élan, canons chargés
  naval: { step: 0.138, play(a, k, t, g) {
    const i = k % 96, b = i % 6, bar = Math.floor(i / 6), [root, q] = NAV_CH[bar], S = 0.138;
    const m = NAV_MEL[i];
    if (m) { a.note(g, m[0], t, m[1] * S * 0.92, { type: 'sawtooth', vol: 0.022, lp: 2100 }); a.note(g, m[0], t, m[1] * S * 0.92, { type: 'square', vol: 0.02, lp: 2600 }); a.note(g, m[0] - 12, t, m[1] * S * 0.92, { type: 'sawtooth', vol: 0.02, lp: 1200, detune: -8 }); }
    a.note(g, b === 2 || b === 5 ? root + 7 : root, t, S * 0.8, { type: 'sawtooth', vol: 0.034, lp: 700 });
    if (b === 0 || b === 3) for (const n of triad(root, q)) a.note(g, n, t, S * 1.6, { type: 'sawtooth', vol: 0.009, lp: 1500, attack: 0.02 });
    if (b === 0 || b === 3) a.drum(g, t, { f0: 130, f1: 38, dur: 0.24, vol: b === 0 ? 0.15 : 0.11 });
    if (b === 2 || b === 5) a.drum(g, t, { f0: 90, f1: 40, dur: 0.14, vol: 0.06 });
    if (b === 3) a.drum(g, t, { noise: 1, dur: 0.12, vol: 0.06 });
    if (bar % 4 === 3 && b >= 3) a.drum(g, t, { noise: 1, dur: 0.07, vol: 0.03 + b * 0.008 });
    a.drum(g, t, { noise: 2, dur: 0.03, vol: 0.01 });
  } },
  // boss : tambours de guerre, cordes hachées, cuivres et chœur
  epic: { step: 0.1, play(a, k, t, g) {
    const i = k % 128, b = i % 16, bar = Math.floor(i / 16), [root, q] = EPIC_CH[bar], S = 0.1;
    if (b === 0 || b === 3 || b === 6 || b === 8 || b === 11 || b === 14) a.drum(g, t, { f0: b === 0 || b === 8 ? 120 : 95, f1: 36, dur: 0.26, vol: b === 0 ? 0.17 : b === 8 ? 0.14 : 0.09 });
    if (b === 4 || b === 12) a.drum(g, t, { noise: 1, dur: 0.14, vol: 0.07 });
    if (bar % 4 === 3 && b >= 12) a.drum(g, t, { f0: 150, f1: 60, dur: 0.1, vol: 0.07 });
    a.drum(g, t, { noise: 2, dur: 0.03, vol: b % 2 ? 0.006 : 0.012 });
    a.note(g, root + (b % 4 === 2 ? 12 : b % 8 === 7 ? 7 : 0), t, S * 0.7, { type: 'sawtooth', vol: 0.03, lp: 800 });
    if (b % 2 === 0) { const T3 = triad(root, q); a.note(g, T3[(b / 2) % 3] + 12, t, S * 0.6, { type: 'sawtooth', vol: 0.011, lp: 1900 }); }
    if (b === 0) for (const n of triad(root, q)) { a.note(g, n + 12, t, S * 15, { type: 'triangle', vol: 0.016, attack: 0.25, release: 0.4 }); a.note(g, n, t, S * 15, { type: 'sine', vol: 0.02, attack: 0.3, release: 0.4 }); }
    const m = EPIC_MEL[i];
    if (m) { a.note(g, m[0], t, m[1] * S * 0.94, { type: 'sawtooth', vol: 0.026, lp: 1700, attack: 0.03 }); a.note(g, m[0] - 12, t, m[1] * S * 0.94, { type: 'square', vol: 0.02, lp: 1300, attack: 0.03 }); a.note(g, m[0], t, m[1] * S * 0.94, { type: 'sawtooth', vol: 0.012, lp: 1700, detune: 9, attack: 0.03 }); }
  } },
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
