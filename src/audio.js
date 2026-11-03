import { MusicDirector } from './music.js';

// Sonidos chiptune generados con WebAudio (sin archivos).
export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    // volumen de cada canal, de 0 a 1 (los sliders del menú de pausa)
    this.vol = { music: 1, sfx: 1, jet: 0.7 };
    this.last = {};
    try {
      const s = JSON.parse(localStorage.getItem('terra-regalos-pan:audio') || '{}');
      if (s.sfx === false) this.sfxOn = false;
      if (s.music === false) this.musicOn = false;
      for (const k in this.vol) if (Number.isFinite(s.vol?.[k])) this.vol[k] = Math.min(1, Math.max(0, s.vol[k]));
    } catch { /* nada */ }
  }

  savePrefs() {
    try { localStorage.setItem('terra-regalos-pan:audio', JSON.stringify({ sfx: this.sfxOn, music: this.musicOn, vol: this.vol })); } catch { /* nada */ }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfx.gain.value = this.sfxOn ? 0.5 * this.vol.sfx : 0;
    this.mus.gain.value = this.musicOn ? 0.16 * this.vol.music : 0;
    this.jetBus.gain.value = this.vol.jet;
  }

  setVolume(k, v) { this.vol[k] = v; this.applyVolumes(); this.savePrefs(); }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.connect(this.master);
      this.jetBus = this.ctx.createGain(); this.jetBus.connect(this.sfx); // el jetpack también se apaga con los sonidos
      this.applyVolumes();
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setSfx(on) { this.sfxOn = on; this.applyVolumes(); this.savePrefs(); }
  setMusic(on) { this.musicOn = on; this.applyVolumes(); this.savePrefs(); }

  tone(freq, dur, { type = 'square', vol = 0.2, slide = null, delay = 0, out = null } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(out || this.sfx);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, { vol = 0.3, freq = 1200, type = 'lowpass', delay = 0 } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx || !this.sfxOn) return;
    const now = performance.now();
    const minGap = { coin: 40, dig: 60, drill: 60, clink: 80, land: 80, fuse: 70 }[name] || 0;
    if (minGap && now - (this.last[name] || 0) < minGap) return;
    this.last[name] = now;
    switch (name) {
      case 'dig': this.noise(0.09, { vol: 0.35, freq: 700 }); this.tone(110, 0.06, { type: 'triangle', vol: 0.25, slide: 60 }); break;
      case 'break': this.noise(0.16, { vol: 0.4, freq: 1100 }); this.tone(160, 0.1, { type: 'triangle', vol: 0.25, slide: 70 }); break;
      case 'clink': this.tone(1800, 0.08, { type: 'triangle', vol: 0.18 }); this.tone(2400, 0.06, { type: 'square', vol: 0.05, delay: 0.02 }); break;
      case 'coin': this.tone(988, 0.07, { vol: 0.12 }); this.tone(1319, 0.14, { vol: 0.12, delay: 0.06 }); break;
      case 'bill': this.noise(0.12, { vol: 0.25, freq: 3000, type: 'highpass' }); this.tone(784, 0.08, { vol: 0.08 }); this.tone(1175, 0.1, { vol: 0.08, delay: 0.06 }); break;
      case 'gold': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, { vol: 0.1, delay: i * 0.05 })); break;
      case 'gem': [1047, 1319, 1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', vol: 0.14, delay: i * 0.05 })); break;
      case 'jump': this.tone(300, 0.12, { vol: 0.1, slide: 600 }); break;
      case 'land': this.noise(0.08, { vol: 0.3, freq: 400 }); break;
      case 'hurt': this.tone(440, 0.25, { vol: 0.18, slide: 110 }); this.noise(0.12, { vol: 0.3, freq: 800 }); break;
      case 'buy': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.15, { vol: 0.13, delay: i * 0.07 })); break;
      case 'deny': this.tone(200, 0.15, { vol: 0.15 }); this.tone(150, 0.2, { vol: 0.15, delay: 0.1 }); break;
      case 'chest': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, { type: i % 2 ? 'square' : 'triangle', vol: 0.14, delay: i * 0.11 })); break;
      case 'faint': [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.15 })); break;
      case 'ui': this.tone(660, 0.05, { vol: 0.08 }); break;
      case 'drill':
        this.tone(95 + Math.random() * 20, 0.12, { type: 'sawtooth', vol: 0.12, slide: 80 });
        this.noise(0.1, { vol: 0.25, freq: 2200, type: 'bandpass' });
        break;
      case 'fuse': this.noise(0.06, { vol: 0.18, freq: 5000, type: 'highpass' }); if (Math.random() < 0.4) this.tone(2400 + Math.random() * 1500, 0.02, { type: 'square', vol: 0.03 }); break;
      case 'boom':
        this.noise(0.9, { vol: 0.9, freq: 400 });
        this.noise(0.35, { vol: 0.5, freq: 1800 });
        this.tone(120, 0.7, { type: 'sine', vol: 0.6, slide: 30 });
        this.tone(60, 0.9, { type: 'triangle', vol: 0.4, slide: 25 });
        break;
      case 'torch': this.noise(0.25, { vol: 0.25, freq: 1500, type: 'bandpass' }); this.tone(330, 0.12, { type: 'triangle', vol: 0.08, slide: 660 }); break;
      case 'bark': this.tone(560, 0.07, { vol: 0.12, slide: 380 }); this.tone(520, 0.09, { vol: 0.12, slide: 340, delay: 0.13 }); break;
      case 'rest': this.tone(880, 0.2, { type: 'sine', vol: 0.06 }); break;
    }
  }

  jet(on) {
    if (!this.ctx) return;
    if (on && this.sfxOn) {
      if (this.jetSrc) return;
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      // soplido grave y suave (sin el siseo agudo), que entra y sale despacito
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.3;
      const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.13, c.currentTime + 0.25);
      s.connect(f); f.connect(g); g.connect(this.jetBus);
      s.start();
      this.jetSrc = s; this.jetGain = g;
    } else if (this.jetSrc) {
      const c = this.ctx;
      this.jetGain.gain.cancelScheduledValues(c.currentTime);
      this.jetGain.gain.setValueAtTime(this.jetGain.gain.value, c.currentTime);
      this.jetGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.2);
      this.jetSrc.stop(c.currentTime + 0.22);
      this.jetSrc = null;
    }
  }

  startMusic() {
    this.music = new MusicDirector(this);
  }

  /** la música cambia según la profundidad del jugador */
  setDepth(depth) {
    if (this.music) this.music.setDepth(depth);
  }
}
