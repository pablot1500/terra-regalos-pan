// Sonidos chiptune generados con WebAudio (sin archivos).
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const N = { C3: 48, D3: 50, E3: 52, F3: 53, G3: 55, A3: 57, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84, G2: 43, A2: 45, F2: 41 };

// melodía (corcheas) y bajo (negras) — 8 compases en loop
const MELODY = [
  'E5', 'G5', 'C6', 'G5', 'A5', 'G5', 'E5', 'D5',
  'C5', 'E5', 'A5', 'E5', 'G5', 'E5', 'C5', 'B4',
  'A4', 'C5', 'F5', 'C5', 'E5', 'D5', 'C5', 'A4',
  'B4', 'D5', 'G5', 'D5', 'F5', 'E5', 'D5', null,
  'E5', null, 'E5', 'G5', 'C6', null, 'B5', 'A5',
  'G5', null, 'E5', 'G5', 'A5', 'G5', 'E5', 'C5',
  'D5', 'E5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5',
  'C5', 'E5', 'D5', 'B4', 'C5', null, null, null,
];
const BASS = [
  'C3', 'G3', 'C3', 'G3', 'A2', 'E3', 'A2', 'E3', 'F2', 'C3', 'F2', 'C3', 'G2', 'D3', 'G2', 'D3',
  'C3', 'G3', 'C3', 'G3', 'A2', 'E3', 'A2', 'E3', 'F2', 'C3', 'G2', 'D3', 'C3', 'G3', 'C3', null,
];

export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    this.last = {};
    try {
      const s = JSON.parse(localStorage.getItem('terra-regalos-pan:audio') || '{}');
      if (s.sfx === false) this.sfxOn = false;
      if (s.music === false) this.musicOn = false;
    } catch { /* nada */ }
  }

  savePrefs() {
    try { localStorage.setItem('terra-regalos-pan:audio', JSON.stringify({ sfx: this.sfxOn, music: this.musicOn })); } catch { /* nada */ }
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.7; this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain(); this.sfx.gain.value = this.sfxOn ? 0.5 : 0; this.sfx.connect(this.master);
      this.mus = this.ctx.createGain(); this.mus.gain.value = this.musicOn ? 0.16 : 0; this.mus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startMusic();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setSfx(on) { this.sfxOn = on; if (this.sfx) this.sfx.gain.value = on ? 0.5 : 0; this.savePrefs(); }
  setMusic(on) { this.musicOn = on; if (this.mus) this.mus.gain.value = on ? 0.16 : 0; this.savePrefs(); }

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
    const minGap = { coin: 40, dig: 60, clink: 80, land: 80 }[name] || 0;
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
      case 'rest': this.tone(880, 0.2, { type: 'sine', vol: 0.06 }); break;
    }
  }

  jet(on) {
    if (!this.ctx) return;
    if (on && this.sfxOn) {
      if (this.jetSrc) return;
      const c = this.ctx;
      const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
      const g = c.createGain(); g.gain.value = 0; g.gain.linearRampToValueAtTime(0.18, c.currentTime + 0.05);
      s.connect(f); f.connect(g); g.connect(this.sfx);
      s.start();
      this.jetSrc = s; this.jetGain = g;
    } else if (this.jetSrc) {
      const c = this.ctx;
      this.jetGain.gain.cancelScheduledValues(c.currentTime);
      this.jetGain.gain.setValueAtTime(this.jetGain.gain.value, c.currentTime);
      this.jetGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.08);
      this.jetSrc.stop(c.currentTime + 0.1);
      this.jetSrc = null;
    }
  }

  startMusic() {
    const c = this.ctx;
    const step = 60 / 104 / 2; // corchea a 104 bpm
    let i = 0;
    let next = c.currentTime + 0.1;
    const tick = () => {
      while (next < c.currentTime + 0.25) {
        const m = MELODY[i % MELODY.length];
        if (m) this.tone(NOTE(N[m]), step * 0.9, { type: 'square', vol: 0.09, out: this.mus, delay: next - c.currentTime });
        if (i % 2 === 0) {
          const b = BASS[(i / 2) % BASS.length];
          if (b) this.tone(NOTE(N[b]), step * 1.8, { type: 'triangle', vol: 0.3, out: this.mus, delay: next - c.currentTime });
        }
        if (i % 4 === 2) this.tone(NOTE(N[m || 'C5']) * 2, 0.04, { type: 'triangle', vol: 0.03, out: this.mus, delay: next - c.currentTime });
        next += step;
        i++;
      }
    };
    this.musicTimer = setInterval(tick, 60);
  }
}
