// Effets sonores synthétisés (WebAudio) : aucun fichier audio nécessaire.
import { Composer } from './music.js';
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
    this.composer = new Composer(this);
    if (this.wantTheme) this.composer.want = this.wantTheme;
    setInterval(() => this.composer.tick(), 90);
  }
  setTheme(name) { this.wantTheme = name; if (this.composer) this.composer.want = name; }
  note(dest, midi, t, dur, { type = 'triangle', vol = 0.05, attack = 0.01, release = 0.08, detune = 0, lp = 0, vib = 0 } = {}) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); o.detune.value = detune;
    if (vib && dur > 0.3) { // un léger vibrato sur les notes tenues
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = vib; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(11, t + Math.min(0.35, dur));
      l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + release + 0.05);
    }
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
    const c = this.ctx; if (!c || !(vol > 0.0002)) return;
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
  voice(base) { // 0.8 : la « voix » des personnages pendant les dialogues (une syllabe)
    if (!this.ctx || this.muted) return;
    const f = base * (0.85 + Math.random() * 0.35);
    this.tone(f, 0.055, { type: 'square', vol: 0.018 * (this.vol ?? 1) });
    this.tone(f * 1.5, 0.045, { type: 'triangle', vol: 0.016 * (this.vol ?? 1) });
  }
  play(name, vol = 1) {
    if (!this.ctx || this.muted || !(vol > 0.002)) return; // trop loin pour être entendu
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
      case 'dice': [0, 0.07, 0.13, 0.22, 0.3].forEach((d, i) => this.tone(900 + i * 140 + Math.random() * 200, 0.03, { type: 'square', vol: 0.05 * v, delay: d })); break;
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
