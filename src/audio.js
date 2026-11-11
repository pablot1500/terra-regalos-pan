import { MusicDirector, loadGenerated } from './music.js';

// Sonidos chiptune generados con WebAudio (sin archivos).
export class Audio {
  constructor() {
    this.ctx = null;
    this.sfxOn = true;
    this.musicOn = true;
    // volumen de cada canal, de 0 a 1 (los sliders del menú de pausa)
    this.vol = { music: 1, sfx: 1, jet: 0.7 };
    this.musicSrc = 'orig';   // 'orig' = las canciones programadas; 'gen' = las generadas con ElevenLabs
    this.last = {};
    loadGenerated();
    try {
      const s = JSON.parse(localStorage.getItem('terra-regalos-pan:audio') || '{}');
      if (s.sfx === false) this.sfxOn = false;
      if (s.music === false) this.musicOn = false;
      if (s.src === 'gen') this.musicSrc = 'gen';
      for (const k in this.vol) if (Number.isFinite(s.vol?.[k])) this.vol[k] = Math.min(1, Math.max(0, s.vol[k]));
    } catch { /* nada */ }
  }

  savePrefs() {
    try { localStorage.setItem('terra-regalos-pan:audio', JSON.stringify({ sfx: this.sfxOn, music: this.musicOn, vol: this.vol, src: this.musicSrc })); } catch { /* nada */ }
  }

  applyVolumes() {
    if (!this.ctx) return;
    this.sfx.gain.value = this.sfxOn ? 0.5 * this.vol.sfx : 0;
    this.mus.gain.value = this.musicOn ? 0.16 * this.vol.music : 0;
    this.jetBus.gain.value = this.vol.jet;
  }

  setVolume(k, v) { this.vol[k] = v; this.applyVolumes(); this.savePrefs(); }

  /** originales (programadas) o generadas con ElevenLabs */
  setMusicSrc(src) {
    this.musicSrc = src === 'gen' ? 'gen' : 'orig';
    this.savePrefs();
    if (this.music) this.music.sourceChanged();
  }

  /** el elemento de audio por donde suenan las canciones generadas (uno solo, así iOS lo deja sonar) */
  genAudio() {
    if (!this.genEl) {
      const el = document.createElement('audio');
      el.setAttribute('playsinline', ''); el.preload = 'auto';
      this.genEl = el;
      this.genGain = this.ctx.createGain();
      this.genGain.gain.value = 0;
      this.genGain.connect(this.mus);
      try { this.ctx.createMediaElementSource(el).connect(this.genGain); } catch { /* navegador viejo: suena directo */ }
    }
    return this.genEl;
  }

  /** En iPhone el WebAudio queda mudo con el celu en modo silencio (como un juego, no como un video).
   * Pidiendo sesión de "reproducción" suena igual, como YouTube. iOS 16.4+ lo trae directo; en los más
   * viejos el truco es tener sonando un <audio> en silencio, que pasa toda la página a ese modo. */
  playbackSession() {
    try {
      if (navigator.audioSession) { navigator.audioSession.type = 'playback'; return; }
    } catch { /* sigue con el truco */ }
    if (!/iPad|iPhone|iPod/.test(navigator.userAgent) && !(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return;
    if (!this.silentEl) {
      const el = document.createElement('audio');
      el.src = silentWavURL();
      el.loop = true; el.setAttribute('playsinline', ''); el.preload = 'auto';
      this.silentEl = el;
    }
    if (this.silentEl.paused && !document.hidden) this.silentEl.play().catch(() => {});
  }

  /** al irse a otra app se frena todo; al volver, el próximo toque lo prende de nuevo */
  sleep(hidden) {
    if (!this.ctx) return;
    if (hidden) { this.ctx.suspend().catch(() => {}); this.silentEl?.pause(); this.genEl?.pause(); }
    else this.unlock();
  }

  unlock() {
    this.playbackSession();
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
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {}); // 'interrupted' en iOS tras una llamada o al volver
    // iOS solo deja sonar un <audio> que arrancó con un toque: se "despierta" acá la primera vez
    const el = this.genAudio();
    if (!this.genPrimed && el.paused) {
      this.genPrimed = true;
      if (!el.src) { el.src = silentWavURL(); el.play().then(() => { if (el.src.startsWith('blob:')) el.pause(); }).catch(() => { this.genPrimed = false; }); }
    }
    if (this.music) this.music.resumeGen();
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
      case 'talk': this.tone(520 + Math.random() * 160, 0.035, { type: 'square', vol: 0.03 }); break;
      case 'surprise': this.tone(523, 0.08, { vol: 0.12 }); this.tone(1047, 0.16, { vol: 0.12, delay: 0.07 }); break;
      case 'paper': this.noise(0.18, { vol: 0.16, freq: 2600, type: 'bandpass' }); break;
      case 'charge': this.tone(220, 0.6, { type: 'triangle', vol: 0.1, slide: 660 }); break;
      case 'magma': this.noise(0.35, { vol: 0.3, freq: 500 }); this.tone(140, 0.3, { type: 'triangle', vol: 0.18, slide: 60 }); break;
      case 'throw': this.noise(0.15, { vol: 0.2, freq: 1800, type: 'bandpass' }); this.tone(300, 0.12, { vol: 0.08, slide: 700 }); break;
      case 'swoosh': this.noise(0.4, { vol: 0.3, freq: 900, type: 'bandpass' }); this.tone(700, 0.35, { type: 'triangle', vol: 0.08, slide: 180 }); break;
      case 'flame': this.noise(0.5, { vol: 0.35, freq: 600 }); this.tone(90, 0.4, { type: 'sawtooth', vol: 0.06, slide: 160 }); break;
      case 'bossHit': [660, 440, 330].forEach((f, i) => this.tone(f, 0.1, { type: 'square', vol: 0.09, delay: i * 0.06 })); break;
      case 'gate': this.tone(180, 0.5, { type: 'sawtooth', vol: 0.05, slide: 260 }); this.tone(240, 0.35, { type: 'triangle', vol: 0.05, slide: 150, delay: 0.25 }); break;
      case 'gateShut': this.noise(0.14, { vol: 0.35, freq: 350 }); this.tone(95, 0.12, { type: 'triangle', vol: 0.2, slide: 60 }); this.tone(1400, 0.05, { type: 'square', vol: 0.03, delay: 0.05 }); break;
      case 'shutter': for (let i = 0; i < 7; i++) this.noise(0.05, { vol: 0.16, freq: 2200, type: 'bandpass', delay: i * 0.12 }); this.tone(140, 0.8, { type: 'sawtooth', vol: 0.03, slide: 220 }); break;
      case 'click': this.tone(1500, 0.03, { type: 'square', vol: 0.08 }); this.noise(0.03, { vol: 0.2, freq: 3000, type: 'highpass' }); break;
      case 'magic': [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.08, delay: i * 0.07 })); this.noise(0.8, { vol: 0.08, freq: 6000, type: 'highpass' }); break;
      case 'splash': this.noise(0.35, { vol: 0.35, freq: 1800, type: 'bandpass' }); this.tone(500, 0.15, { type: 'sine', vol: 0.1, slide: 1200 }); break;
      case 'squirt': this.noise(0.05, { vol: 0.12, freq: 2600 + Math.random() * 800, type: 'bandpass' }); break;
      case 'steam': this.noise(0.45, { vol: 0.18, freq: 4500, type: 'highpass' }); break;
      case 'beam': this.tone(180, 0.5, { type: 'sawtooth', vol: 0.08, slide: 90 }); this.tone(1200, 0.4, { type: 'square', vol: 0.04, slide: 600 }); this.noise(0.4, { vol: 0.2, freq: 900 }); break;
      case 'peep': this.tone(1400, 0.07, { type: 'square', vol: 0.06, slide: 1900 }); this.tone(1200, 0.12, { type: 'square', vol: 0.05, slide: 500, delay: 0.08 }); break;
      case 'laugh': [0, 1, 2, 3].forEach((i) => this.tone(330 - i * 25, 0.11, { type: 'square', vol: 0.06, slide: 420 - i * 25, delay: i * 0.15 })); break;
      case 'pump': this.noise(0.08, { vol: 0.25, freq: 700 }); this.tone(260, 0.06, { type: 'triangle', vol: 0.12, delay: 0.1 }); this.noise(0.06, { vol: 0.2, freq: 1200, delay: 0.12 }); break;
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

/** medio segundo de silencio en WAV (8 kHz, 8 bits), para los trucos de audio de iOS */
let silentURL = null;
function silentWavURL() {
  if (silentURL) return silentURL;
  const n = 4000, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const str = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return (silentURL = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
}
