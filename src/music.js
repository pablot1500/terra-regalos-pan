// Música por zonas de profundidad, compuesta en texto y tocada con WebAudio.
//
// Formato de cada canción (8 compases de 8 corcheas):
//   mel:  una línea por compás, 8 pasos separados por espacio. "C5" = nota,
//         "C5:3" = nota que dura 3 corcheas, "-" = silencio.
//   bass: 4 negras por compás (mismo formato, la duración se cuenta en negras).
//   pad:  un acorde por compás ("A3,C4,E4") o "-".
//   arp:  arpegia el acorde del pad en corcheas.
//
// Zonas: 0 = superficie hasta 300 m, 1 = 300 a 800 m, 2 = 800 a 1500 m.

const SONGS = [
  [
    {
      name: 'Patio soleado', bpm: 104, loops: 3, lead: 'square', leadVol: 0.085, bassVol: 0.28, drums: 0.5,
      mel: `E5 G5 C6 G5 A5 G5 E5 D5 | C5 E5 A5 E5 G5 E5 C5 B4 | A4 C5 F5 C5 E5 D5 C5 A4 | B4 D5 G5 D5 F5 E5 D5 -
            E5 - E5 G5 C6 - B5 A5 | G5 - E5 G5 A5 G5 E5 C5 | D5 E5 F5 A5 G5 F5 E5 D5 | C5 E5 D5 B4 C5:3 - - -`,
      bass: `C3 G3 C3 G3 | A2 E3 A2 E3 | F2 C3 F2 C3 | G2 D3 G2 D3 | C3 G3 C3 G3 | A2 E3 A2 E3 | F2 C3 G2 D3 | C3 G3 C3 -`,
    },
    {
      name: 'Mate y pala', bpm: 120, loops: 3, lead: 'square', leadVol: 0.075, bassVol: 0.28, drums: 0.6,
      mel: `B4 D5 G5 D5 B4 D5 G5 A5 | B5 A5 G5 E5 D5 E5 G5 - | E5 G5 C6 G5 E5 G5 A5 G5 | F#5 E5 D5 E5 F#5 A5 D5 -
            G5 - G5 A5 B5 A5 G5 D5 | E5 G5 B5 G5 E5 D5 B4 D5 | C5 E5 G5 C6 B5 A5 G5 E5 | D5 F#5 A5 F#5 G5:3 - - -`,
      bass: `G2 D3 G2 D3 | E2 B2 E2 B2 | C3 G2 C3 G2 | D3 A2 D3 A2 | G2 D3 G2 D3 | E2 B2 E2 B2 | C3 G2 D3 A2 | G2 D3 G2 -`,
    },
  ],
  [
    {
      name: 'Cuevas de cristal', bpm: 88, loops: 3, lead: 'triangle', leadVol: 0.16, bassVol: 0.24, padVol: 0.035, echo: true,
      mel: `A4:2 - C5 E5:2 - D5 C5:2 - | A4:2 - F4 A4 C5:4 - - - | G4:2 - C5 E5:2 - G5 E5:2 - | D5:2 - B4 G4 B4:4 - - -
            E5:2 - A5 G5 E5:2 - C5 D5 | C5:2 - A4 C5 F5:2 - E5:2 - | D5:2 - B4 D5 G5:2 - F5 E5 | G#4:2 - B4 E5:4 - - - -`,
      bass: `A2 - E3 - | F2 - C3 - | C3 - G2 - | G2 - D3 - | A2 E3 A2 E3 | F2 C3 F2 C3 | G2 D3 G2 D3 | E2 B2 E2 G#2`,
      pad: `A3,C4,E4 | F3,A3,C4 | C4,E4,G4 | G3,B3,D4 | A3,C4,E4 | F3,A3,C4 | G3,B3,D4 | E3,G#3,B3`,
    },
    {
      name: 'Eco del granito', bpm: 100, loops: 3, lead: 'square', leadVol: 0.05, bassVol: 0.24, padVol: 0.03, arp: 0.06, echo: true,
      mel: `D5:4 - - - F5:2 - E5:2 - | E5:6 - - - - - C5:2 - | D5:4 - - - A#4:2 - C5:2 - | G4:6 - - - - - - -
            A5:4 - - - G5:2 - F5:2 - | E5:4 - - - C5:2 - E5:2 - | F5:2 - D5:2 - A#4:2 - D5:2 - | C#5:8 - - - - - - -`,
      bass: `D2 - D3 - | C2 - C3 - | A#1 - A#2 - | C2 - C3 - | D2 - D3 - | C2 - C3 - | A#1 - A#2 - | A1 - A2 -`,
      pad: `D3,F3,A3 | C3,E3,G3 | A#2,D3,F3 | C3,E3,G3 | D3,F3,A3 | C3,E3,G3 | A#2,D3,F3 | A2,C#3,E3`,
    },
  ],
  [
    {
      name: 'Abismo', bpm: 76, loops: 3, lead: 'bell', leadVol: 0.13, bassVol: 0.32, padVol: 0.045, echo: true, subBass: true,
      mel: `B5:3 - - G5:2 - E5:3 - - | - - C6:3 - - B5:2 - G5 | A5:4 - - - E5:4 - - - | F#5:6 - - - - - D#5:2 -
            E6:3 - - B5:2 - G5:3 - - | C6:4 - - - E5:2 - G5:2 - | A5:3 - - F#5:2 - D5:3 - - | D#5:8 - - - - - - -`,
      bass: `E1:4 - - - | C2:4 - - - | A1:4 - - - | B1:4 - - - | E1:4 - - - | C2:4 - - - | D2:4 - - - | B1:4 - - -`,
      pad: `E3,G3,B3 | C3,E3,G3 | A2,C3,E3 | B2,D#3,F#3 | E3,G3,B3 | C3,E3,G3 | D3,F#3,A3 | B2,D#3,F#3`,
    },
    {
      name: 'Corazón de la tierra', bpm: 96, loops: 3, lead: 'triangle', leadVol: 0.15, bassVol: 0.28, padVol: 0.03, arp: 0.05, drums: 0.35, echo: true,
      mel: `F#5:2 - B5:2 - A5 F#5 E5 D5 | D5:4 - - - B4:2 - D5:2 - | A5:2 - F#5:2 - A5 B5 A5 F#5 | E5:6 - - - - - C#5:2 -
            F#5:2 - B5:2 - C#6 B5 A5 F#5 | G5:4 - - - F#5:2 - E5:2 - | D5:2 - F#5:2 - A5:2 - D6:2 - | C#6:8 - - - - - - -`,
      bass: `B1 - F#2 - | G1 - D2 - | D2 - A2 - | A1 - E2 - | B1 F#2 B1 F#2 | G1 D2 G1 D2 | D2 A2 D2 A2 | A1 E2 A1 C#2`,
      pad: `B2,D3,F#3 | G2,B2,D3 | D3,F#3,A3 | A2,C#3,E3 | B2,D3,F#3 | G2,B2,D3 | D3,F#3,A3 | A2,C#3,E3`,
    },
  ],
];

const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function toFreq(name) {
  const m = /^([A-G])(#?)(-?\d)$/.exec(name);
  if (!m) throw new Error('Nota inválida: ' + name);
  const midi = 12 * (+m[3] + 1) + NOTE_IDX[m[1]] + (m[2] ? 1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}
function parseTok(tok) {
  if (!tok || tok === '-') return null;
  const [n, len] = tok.split(':');
  return { f: toFreq(n), len: len ? +len : 1 };
}
function parseBars(src, perBar) {
  const bars = src.split(/\||\n/).map((b) => b.trim()).filter(Boolean).map((b) => b.split(/\s+/).map(parseTok));
  for (const b of bars) if (b.length !== perBar) console.warn('Compás con', b.length, 'pasos en vez de', perBar);
  return bars;
}
function compile(song) {
  return {
    ...song,
    melB: parseBars(song.mel, 8),
    bassB: parseBars(song.bass, 4),
    padB: song.pad ? song.pad.split('|').map((c) => c.trim()).map((c) => (c === '-' ? null : c.split(',').map(toFreq))) : null,
  };
}
const COMPILED = SONGS.map((zone) => zone.map(compile));

// umbrales con histéresis: para bajar de zona hay que pasar el límite; para volver a subir, 10 m arriba
const DOWN = [300, 800], UP = [290, 790];
const SETTLE = 1.2;    // segundos en la zona nueva antes de cambiar de canción
const FADE_OUT = 1.6, FADE_IN = 2.0;

export class MusicDirector {
  constructor(audio) {
    this.a = audio;
    this.c = audio.ctx;
    this.zone = 0;          // zona en la que está el jugador
    this.away = 0;          // tiempo que lleva el jugador fuera de la zona de la canción
    this.songIdx = [0, 0, 0];
    this.track = null;
    this.lastT = this.c.currentTime;
    this.start(0);
    this.timer = setInterval(() => this.tick(), 50);
  }

  setDepth(depth) {
    let z = this.zone;
    while (z < 2 && depth >= DOWN[z]) z++;
    while (z > 0 && depth < UP[z - 1]) z--;
    this.zone = z;
  }

  start(zone) {
    const c = this.c;
    const song = COMPILED[zone][this.songIdx[zone] % COMPILED[zone].length];
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.linearRampToValueAtTime(1, c.currentTime + FADE_IN);
    gain.connect(this.a.mus);
    const step = 60 / song.bpm / 2;
    const nodes = [gain];
    if (song.echo) {
      const delay = c.createDelay(1.5);
      delay.delayTime.value = Math.min(step * 3, 0.9);
      const fb = c.createGain(); fb.gain.value = 0.32;
      const wet = c.createGain(); wet.gain.value = 0.3;
      gain.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.a.mus);
      nodes.push(delay, fb, wet);
    }
    this.track = { zone, song, gain, nodes, step, i: 0, next: c.currentTime + 0.08, loops: 0, fadingOut: false, fadeEnd: 0, then: null };
  }

  fadeOut(then) {
    const tr = this.track, c = this.c, g = tr.gain.gain;
    tr.fadingOut = true;
    tr.fadeEnd = c.currentTime + FADE_OUT;
    tr.then = then;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(0, tr.fadeEnd);
  }

  cancelFade() {
    const tr = this.track, c = this.c, g = tr.gain.gain;
    tr.fadingOut = false;
    tr.then = null;
    g.cancelScheduledValues(c.currentTime);
    g.setValueAtTime(g.value, c.currentTime);
    g.linearRampToValueAtTime(1, c.currentTime + 0.8);
  }

  stopTrack() {
    const tr = this.track;
    const nodes = tr.nodes;
    // se desconecta un poco después para que terminen las colas del eco
    setTimeout(() => nodes.forEach((n) => { try { n.disconnect(); } catch { /* nada */ } }), 1500);
    this.track = null;
  }

  tick() {
    const c = this.c;
    const now = c.currentTime;
    const dt = Math.min(0.5, now - this.lastT);
    this.lastT = now;
    let tr = this.track;

    // ¿hay que cambiar de zona?
    if (this.zone !== tr.zone) {
      this.away += dt;
      if (this.away >= SETTLE && !tr.fadingOut) this.fadeOut('zone');
    } else {
      this.away = 0;
      if (tr.fadingOut && tr.then === 'zone') this.cancelFade(); // volvió a tiempo: la canción sigue
    }
    // ¿terminó la canción? pasa a la siguiente de la misma zona
    if (!tr.fadingOut && tr.loops >= tr.song.loops) this.fadeOut('next');

    // fin del fade: recién ahí arranca la canción nueva (nunca se superponen)
    if (tr.fadingOut && now >= tr.fadeEnd) {
      const then = tr.then, oldZone = tr.zone;
      this.stopTrack();
      if (then === 'next' && this.zone === oldZone) this.songIdx[oldZone]++;
      this.start(this.zone);
      tr = this.track;
    }

    // programar notas
    if (!tr.fadingOut || now < tr.fadeEnd) {
      while (tr.next < now + 0.25) {
        this.schedStep(tr, tr.i, tr.next);
        tr.i++;
        tr.next += tr.step;
        if (tr.i % (tr.song.melB.length * 8) === 0) tr.loops++;
      }
    }
  }

  schedStep(tr, i, when) {
    const s = tr.song, step = tr.step, out = tr.gain;
    const bars = s.melB.length;
    const bar = Math.floor(i / 8) % bars, pos = i % 8;
    const chord = s.padB ? s.padB[bar % s.padB.length] : null;

    const m = s.melB[bar][pos];
    if (m) this.lead(s.lead, m.f, m.len * step * 0.92, s.leadVol, when, out);

    if (pos % 2 === 0) {
      const b = s.bassB[bar % s.bassB.length][pos / 2];
      if (b) {
        const dur = b.len * step * 2 * 0.9;
        this.osc(s.subBass ? 'sine' : 'triangle', b.f, dur, s.bassVol, when, out, s.subBass ? 0.25 : 0.01);
      }
    }
    if (pos === 0 && chord && s.padVol) this.pad(chord, step * 8, s.padVol, when, out);
    if (s.arp && chord) {
      const pat = [0, 1, 2, 1, 0, 1, 2, 3];
      const k = pat[pos];
      const f = (k === 3 ? chord[0] * 2 : chord[k]) * 2;
      this.osc('triangle', f, step * 0.9, s.arp, when, out, 0.005);
    }
    if (s.drums) {
      if (pos === 0 || pos === 4) this.kick(when, s.drums, out);
      if (pos % 2 === 1) this.hat(when, s.drums, out);
    }
  }

  lead(type, f, dur, vol, when, out) {
    if (type === 'bell') {
      const d = Math.max(dur, 1.4);
      this.osc('sine', f, d, vol, when, out, 0.005);
      this.osc('sine', f * 2.01, d * 0.5, vol * 0.25, when, out, 0.005);
    } else {
      this.osc(type, f, dur, vol, when, out, 0.008);
    }
  }

  osc(type, f, dur, vol, when, out, attack = 0.01) {
    const c = this.c;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, when + attack + dur);
    o.connect(g); g.connect(out);
    o.start(when); o.stop(when + attack + dur + 0.05);
  }

  pad(freqs, dur, vol, when, out) {
    const c = this.c;
    for (const f of freqs) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(f, when);
      o.detune.setValueAtTime((Math.random() - 0.5) * 8, when);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(vol, when + Math.min(0.4, dur * 0.3));
      g.gain.setValueAtTime(vol, when + dur * 0.75);
      g.gain.linearRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(out);
      o.start(when); o.stop(when + dur + 0.05);
    }
  }

  kick(when, vol, out) {
    const c = this.c;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(130, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.14);
    g.gain.setValueAtTime(0.5 * vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
    o.connect(g); g.connect(out);
    o.start(when); o.stop(when + 0.2);
  }

  hat(when, vol, out) {
    const c = this.c;
    const s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.12 * vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(when, Math.random() * 0.5); s.stop(when + 0.06);
  }

  get songName() { return this.track ? this.track.song.name : ''; }
}
