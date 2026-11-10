// Música por zonas de profundidad, compuesta en texto y tocada con WebAudio.
//
// Formato de cada canción (compases de 8 corcheas):
//   mel:  una línea por compás, 8 pasos separados por espacio. "C5" = nota,
//         "C5:3" = nota que dura 3 corcheas, "-" = silencio.
//   bass: 4 negras por compás (mismo formato, la duración se cuenta en negras).
//   pad:  un acorde por compás ("A3,C4,E4") o "-".
//   mel2 / bass2 / pad2: segunda parte (puente) opcional; `form` dice el orden ("AB", "AABA"...).
//
// Opciones: bpm, loops (vueltas), lead / lead2 (instrumento de cada parte), leadVol / leadVol2,
//   bassVol, padVol, arp, drums + groove ('epic' | 'cumbia' | 'heart' | normal), echo, subBass,
//   bassStyle 'pulse' (bajo en corcheas), swing, lift (sube un tono en la última vuelta), harmony.
//
// Cada vuelta suena distinta: la primera arranca sin batería y sin arpegio, después se suman
// una segunda voz que armoniza la melodía y los arpegios, hay redoble al final de cada vuelta y,
// si la canción tiene `lift`, la última vuelta sube un tono.
//
// Zonas: 0 = superficie hasta 300 m, 1 = 300 a 800 m, 2 = 800 a 1500 m, 3 = el núcleo (combate final).
// Hay 3 canciones por zona y se van alternando al azar (sin repetir la que acaba de sonar).

const SONGS = [
  [
    {
      name: 'Patio soleado', bpm: 104, loops: 3, lift: true, lead: 'square', leadVol: 0.085, bassVol: 0.28, drums: 0.5, padVol: 0.018, arp: 0.03,
      mel: `E5 G5 C6 G5 A5 G5 E5 D5 | C5 E5 A5 E5 G5 E5 C5 B4 | A4 C5 F5 C5 E5 D5 C5 A4 | B4 D5 G5 D5 F5 E5 D5 -
            E5 - E5 G5 C6 - B5 A5 | G5 - E5 G5 A5 G5 E5 C5 | D5 E5 F5 A5 G5 F5 E5 D5 | C5 E5 D5 B4 C5:3 - - -`,
      bass: `C3 G3 C3 G3 | A2 E3 A2 E3 | F2 C3 F2 C3 | G2 D3 G2 D3 | C3 G3 C3 G3 | A2 E3 A2 E3 | F2 C3 G2 D3 | C3 G3 C3 -`,
      pad: `C4,E4,G4 | A3,C4,E4 | F3,A3,C4 | G3,B3,D4 | C4,E4,G4 | A3,C4,E4 | F3,A3,C4 | C4,E4,G4`,
    },
    {
      name: 'Mate y pala', bpm: 120, loops: 3, lift: true, swing: 0.1, lead: 'square', leadVol: 0.075, bassVol: 0.28, drums: 0.6, padVol: 0.018,
      mel: `B4 D5 G5 D5 B4 D5 G5 A5 | B5 A5 G5 E5 D5 E5 G5 - | E5 G5 C6 G5 E5 G5 A5 G5 | F#5 E5 D5 E5 F#5 A5 D5 -
            G5 - G5 A5 B5 A5 G5 D5 | E5 G5 B5 G5 E5 D5 B4 D5 | C5 E5 G5 C6 B5 A5 G5 E5 | D5 F#5 A5 F#5 G5:3 - - -`,
      bass: `G2 D3 G2 D3 | E2 B2 E2 B2 | C3 G2 C3 G2 | D3 A2 D3 A2 | G2 D3 G2 D3 | E2 B2 E2 B2 | C3 G2 D3 A2 | G2 D3 G2 -`,
      pad: `G3,B3,D4 | E3,G3,B3 | C4,E4,G4 | D3,F#3,A3 | G3,B3,D4 | E3,G3,B3 | C4,E4,G4 | G3,B3,D4`,
    },
    {
      name: 'Cumbia del cantero', bpm: 100, loops: 2, lead: 'square', leadVol: 0.07, lead2: 'square', leadVol2: 0.065,
      bassVol: 0.3, padVol: 0.022, drums: 0.6, groove: 'cumbia', lift: true, echo: true,
      mel: `E5 - E5 D5 C5 - B4 A4 | B4 - B4 C5 D5:4 - - - | C5 - C5 D5 E5 - D5 C5 | B4:2 - G#4 - B4:4 - - -
            E5 - E5 D5 C5 - B4 A4 | D5 - D5 E5 F5 - E5 D5 | C5 - A4 C5 B4 - G#4 B4 | A4:4 - - - E4 G#4 B4 -`,
      bass: `A2 E2 A2 E2 | G2 D2 G2 D2 | F2 C2 F2 C2 | E2 B1 E2 G#2 | A2 E2 A2 E2 | G2 D2 G2 D2 | F2 C2 F2 C2 | E2 B1 E2 E2`,
      pad: `A3,C4,E4 | G3,B3,D4 | F3,A3,C4 | E3,G#3,B3 | A3,C4,E4 | G3,B3,D4 | F3,A3,C4 | E3,G#3,B3`,
      mel2: `G5 - E5 G5 C6 - B5 A5 | G5 - D5 G5 B5:4 - - - | A5 - E5 A5 C6 - B5 A5 | A5 G5 F5 E5 F5:4 - - -
             E5 - G5 E5 C5 - E5 G5 | D5 - G5 D5 B4 - D5 G5 | F5 E5 D5 C5 D5 C5 B4 A4 | G#4:2 - B4:2 - E5:4 - - -`,
      bass2: `C3 G2 C3 G2 | G2 D2 G2 D2 | A2 E2 A2 E2 | F2 C2 F2 C2 | C3 G2 C3 G2 | G2 D2 G2 D2 | F2 C2 F2 C2 | E2 B1 E2 G#2`,
      pad2: `C4,E4,G4 | G3,B3,D4 | A3,C4,E4 | F3,A3,C4 | C4,E4,G4 | G3,B3,D4 | F3,A3,C4 | E3,G#3,B3`,
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
    {
      name: 'Minero de medianoche', bpm: 92, loops: 2, lead: 'pluck', leadVol: 0.12, lead2: 'triangle', leadVol2: 0.15,
      bassVol: 0.25, padVol: 0.026, drums: 0.32, swing: 0.14, echo: true,
      mel: `E5 - G5 B5 - G5 E5 - | C5 - E5 G5 - E5 C5 - | A4 - C5 E5 - A5 G5 E5 | F#5:2 - D#5:2 - B4:4 - - -
            E5 - G5 B5 - E6 D6 B5 | C6 - B5 G5 - E5 G5 - | F#5 - A5 D6 - C6 B5 A5 | B5:4 - - - D#5:2 - F#5:2 -`,
      bass: `E2 - B2 - | C2 - G2 - | A1 - E2 - | B1 - F#2 - | E2 B2 E2 B2 | C2 G2 C2 G2 | D2 A2 D2 A2 | B1 F#2 B1 D#2`,
      pad: `E3,G3,B3 | C3,E3,G3 | A2,C3,E3 | B2,D#3,F#3 | E3,G3,B3 | C3,E3,G3 | D3,F#3,A3 | B2,D#3,F#3`,
      mel2: `D5:3 - - B4 D5 G5:3 - - | F#5:4 - - - E5 D5 E5 F#5 | G5:3 - - E5 G5 B5:3 - - | A5:4 - - - G5 E5 G5 A5
             C6:3 - - B5 A5 E5:3 - - | F#5:4 - - - D#5 F#5 A5 B5 | G5:3 - - F#5 E5 B4:3 - - | D#5:8 - - - - - - -`,
      bass2: `G2 - D3 - | D2 - A2 - | E2 - B2 - | C2 - G2 - | A1 - E2 - | B1 - F#2 - | E2 - B2 - | B1 - - -`,
      pad2: `G3,B3,D4 | D3,F#3,A3 | E3,G3,B3 | C3,E3,G3 | A2,C3,E3 | B2,D#3,F#3 | E3,G3,B3 | B2,D#3,F#3`,
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
      name: 'Corazón de la tierra', bpm: 96, loops: 3, lift: true, lead: 'triangle', leadVol: 0.15, bassVol: 0.28, padVol: 0.03, arp: 0.05, drums: 0.35, echo: true,
      mel: `F#5:2 - B5:2 - A5 F#5 E5 D5 | D5:4 - - - B4:2 - D5:2 - | A5:2 - F#5:2 - A5 B5 A5 F#5 | E5:6 - - - - - C#5:2 -
            F#5:2 - B5:2 - C#6 B5 A5 F#5 | G5:4 - - - F#5:2 - E5:2 - | D5:2 - F#5:2 - A5:2 - D6:2 - | C#6:8 - - - - - - -`,
      bass: `B1 - F#2 - | G1 - D2 - | D2 - A2 - | A1 - E2 - | B1 F#2 B1 F#2 | G1 D2 G1 D2 | D2 A2 D2 A2 | A1 E2 A1 C#2`,
      pad: `B2,D3,F#3 | G2,B2,D3 | D3,F#3,A3 | A2,C#3,E3 | B2,D3,F#3 | G2,B2,D3 | D3,F#3,A3 | A2,C#3,E3`,
    },
    {
      name: 'Latido de magma', bpm: 84, loops: 2, lead: 'choir', leadVol: 0.06, lead2: 'bell', leadVol2: 0.11,
      bassVol: 0.24, bassStyle: 'pulse', padVol: 0.03, drums: 0.45, groove: 'heart', echo: true, harmony: false,
      mel: `A4:4 - - - D5:4 - - - | G5:6 - - - - - F5 D#5 | D5:8 - - - - - - - | E5:4 - - - C5:2 - E5:2 -
            F5:4 - - - D5:2 - A#4:2 - | C#5:6 - - - - - E5 G5 | F5:4 - - - E5:2 - D5:2 - | C#5:8 - - - - - - -`,
      bass: `D2 D2 D2 D2 | D#2 D#2 D#2 D#2 | D2 D2 D2 D2 | C2 C2 C2 C2 | A#1 A#1 A#1 A#1 | A1 A1 A1 A1 | D2 D2 D2 D2 | A1 A1 C#2 E2`,
      pad: `D3,F3,A3 | D#3,G3,A#3 | D3,F3,A3 | C3,E3,G3 | A#2,D3,F3 | A2,C#3,E3 | D3,F3,A3 | A2,C#3,E3`,
      mel2: `D6 - A5 - F5 - A5 - | G5 - D#5 - A#5 - G5 - | F5 - D5 - A5 - D6 - | E6:4 - - - C6:4 - - -
             D6 - A#5 - F5 - A#5 - | E5 - C#5 - A5 - E6 - | D6:2 - C6:2 - A#5:2 - A5:2 - | A5:8 - - - - - - -`,
    },
  ],
  [
    {
      name: 'Combate final', bpm: 152, loops: 4, lead: 'epic', leadVol: 0.07, bassVol: 0.3, padVol: 0.03, arp: 0.035, drums: 0.9, groove: 'epic', epic: true, echo: true, lift: true,
      mel: `D5 - A5 - F5 G5 A5 - | A#5 - A5 G5 F5 - D5 - | C5 - G5 - E5 F5 G5 - | A5:3 - - C#6:2 - E6:3 - -
            D6:2 - C6 A#5 A5:2 - F5 A5 | G5 A5 A#5 - D6:2 - A#5 G5 | G5:2 - A#5 D6 G6:2 - F6 E6 | E6:2 - C#6:2 - A5:4 - - -`,
      bass: `D2 D3 D2 D3 | A#1 A#2 A#1 A#2 | C2 C3 C2 C3 | A1 A2 A1 A2 | D2 D3 D2 D3 | A#1 A#2 A#1 A#2 | G1 G2 G1 G2 | A1 A2 C#2 E2`,
      pad: `D3,F3,A3 | A#2,D3,F3 | C3,E3,G3 | A2,C#3,E3 | D3,F3,A3 | A#2,D3,F3 | G2,A#2,D3 | A2,C#3,E3`,
    },
    {
      name: 'Lluvia de magma', bpm: 160, loops: 2, lead: 'epic', leadVol: 0.065, bassVol: 0.3, padVol: 0.03, arp: 0.03,
      drums: 0.9, groove: 'epic', epic: true, echo: true, lift: true,
      mel: `E5 E5 B4 E5 G5 E5 B4 E5 | F#5 E5 D5 E5 B4:4 - - - | E5 E5 C5 E5 G5 E5 C5 E5 | A5 G5 F#5 G5 D5:4 - - -
            B5 - B5 A5 G5 - F#5 G5 | E5:2 - G5:2 - B5:4 - - - | C6 B5 A5 G5 A5 G5 F#5 E5 | D#5:2 - F#5:2 - B5:4 - - -`,
      bass: `E2 E2 E2 E2 | E2 E2 D2 D2 | C2 C2 C2 C2 | D2 D2 D2 D2 | E2 E2 E2 E2 | E2 E2 G2 G2 | C2 C2 C2 C2 | B1 B1 D#2 F#2`,
      pad: `E3,G3,B3 | E3,G3,B3 | C3,E3,G3 | D3,F#3,A3 | E3,G3,B3 | E3,G3,B3 | C3,E3,G3 | B2,D#3,F#3`,
      mel2: `G5:3 - - E5 G5 C6:3 - - | A5:3 - - F#5 A5 D6:3 - - | B5:4 - - - G5 A5 B5 D6 | D#6:6 - - - - - B5 F#5
             E6:3 - - D6 C6 B5:3 - - | A5:3 - - B5 C6 D6:3 - - | E6:2 - D6 B5 G5:2 - E5 G5 | F#5:4 - - - D#5:4 - - -`,
      bass2: `C2 C3 C2 C3 | D2 D3 D2 D3 | E2 E3 E2 E3 | B1 B2 B1 B2 | C2 C3 C2 C3 | D2 D3 D2 D3 | E2 E3 E2 E3 | B1 B2 D#2 F#2`,
      pad2: `C3,E3,G3 | D3,F#3,A3 | E3,G3,B3 | B2,D#3,F#3 | C3,E3,G3 | D3,F#3,A3 | E3,G3,B3 | B2,D#3,F#3`,
    },
    {
      name: 'Furia de Aguilus', bpm: 144, loops: 4, lead: 'epic', leadVol: 0.068, bassVol: 0.3, padVol: 0.03, arp: 0.032,
      drums: 0.85, groove: 'epic', epic: true, echo: true, lift: true,
      mel: `G5:2 - D5 G5 A#5:2 - A5 G5 | G5:2 - D#5:2 - A#4:4 - - - | A5:2 - F5 A5 C6:2 - A#5 A5 | F#5:4 - - - D5:4 - - -
            G5 A5 A#5 - D6:2 - C6 A#5 | C6:2 - A#5 G5 D#5:4 - - - | E5 F5 G5 - C6:2 - A#5 G5 | F#5:2 - A5:2 - D6:4 - - -`,
      bass: `G2 G3 G2 G3 | D#2 D#3 D#2 D#3 | F2 F3 F2 F3 | D2 D3 D2 D3 | G2 G3 G2 G3 | D#2 D#3 D#2 D#3 | C2 C3 C2 C3 | D2 D3 D2 F#2`,
      pad: `G3,A#3,D4 | D#3,G3,A#3 | F3,A3,C4 | D3,F#3,A3 | G3,A#3,D4 | D#3,G3,A#3 | C3,E3,G3 | D3,F#3,A3`,
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
function parsePad(src) {
  return src.split('|').map((c) => c.trim()).map((c) => (c === '-' ? null : c.split(',').map(toFreq)));
}
function compile(song) {
  const sec = (mel, bass, pad, lead, leadVol) => ({ mel: parseBars(mel, 8), bass: parseBars(bass, 4), pad: pad ? parsePad(pad) : null, lead, leadVol });
  const A = sec(song.mel, song.bass, song.pad, song.lead, song.leadVol);
  const B = song.mel2 ? sec(song.mel2, song.bass2 || song.bass, song.pad2 || song.pad, song.lead2 || song.lead, song.leadVol2 || song.leadVol) : null;
  const form = song.form || (B ? 'AB' : 'A');
  const bars = [];
  for (const ch of form) {
    const s = ch === 'B' && B ? B : A;
    for (let k = 0; k < s.mel.length; k++) bars.push({ sec: s, k });
  }
  return { ...song, bars };
}
const COMPILED = SONGS.map((zone) => zone.map(compile));

/** nota del acorde que queda justo debajo de la melodía (una tercera o sexta abajo, más o menos) */
function harmonize(f, chord) {
  let best = 0;
  const top = f / Math.pow(2, 2.5 / 12);
  for (const c of chord) for (let o = -2; o <= 3; o++) {
    const h = c * Math.pow(2, o);
    if (h < top && h > best) best = h;
  }
  return best || f / 2;
}

// umbrales con histéresis: para bajar de zona hay que pasar el límite; para volver a subir, 10 m arriba
const DOWN = [300, 800, 1500], UP = [290, 790, 1490];
const SETTLE = 1.2;    // segundos en la zona nueva antes de cambiar de canción
const FADE_OUT = 1.6, FADE_IN = 2.0;
const LIFT = Math.pow(2, 2 / 12); // la vuelta de tuerca: un tono más arriba

export class MusicDirector {
  constructor(audio) {
    this.a = audio;
    this.c = audio.ctx;
    this.zone = 0;          // zona en la que está el jugador
    this.away = 0;          // tiempo que lleva el jugador fuera de la zona de la canción
    this.songIdx = COMPILED.map((z) => Math.floor(Math.random() * z.length));
    this.track = null;
    this.lastT = this.c.currentTime;
    this.start(0);
    this.timer = setInterval(() => this.tick(), 50);
  }

  setDepth(depth) {
    let z = this.zone;
    while (z < DOWN.length && depth >= DOWN[z]) z++;
    while (z > 0 && depth < UP[z - 1]) z--;
    this.zone = z;
  }

  /** otra canción de la zona, distinta de la que acaba de sonar */
  pickNext(zone) {
    const n = COMPILED[zone].length;
    if (n < 2) return;
    let k = this.songIdx[zone];
    while (k === this.songIdx[zone]) k = Math.floor(Math.random() * n);
    this.songIdx[zone] = k;
  }

  /** paneo estéreo (si el navegador no lo tiene, pasa derecho) */
  panner(v, out) {
    const c = this.c;
    if (!c.createStereoPanner) return out;
    const p = c.createStereoPanner();
    p.pan.value = v;
    p.connect(out);
    return p;
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
    // cada voz en su lugar del estéreo
    const out = { lead: this.panner(-0.12, gain), harm: this.panner(0.3, gain), arp: this.panner(0.38, gain), base: gain };
    for (const k of ['lead', 'harm', 'arp']) if (out[k] !== gain) nodes.push(out[k]);
    this.track = { zone, song, gain, out, nodes, step, i: 0, next: c.currentTime + 0.08, loops: 0, fadingOut: false, fadeEnd: 0, then: null };
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
    // ¿terminó la canción? pasa a otra de la misma zona
    if (!tr.fadingOut && tr.loops >= tr.song.loops) this.fadeOut('next');

    // fin del fade: recién ahí arranca la canción nueva (nunca se superponen)
    if (tr.fadingOut && now >= tr.fadeEnd) {
      const then = tr.then, oldZone = tr.zone;
      this.stopTrack();
      if (then === 'next' && this.zone === oldZone) this.pickNext(oldZone);
      this.start(this.zone);
      tr = this.track;
    }

    // programar notas
    if (!tr.fadingOut || now < tr.fadeEnd) {
      const loopSteps = tr.song.bars.length * 8;
      while (tr.next < now + 0.25) {
        this.schedStep(tr, tr.i, tr.next);
        tr.i++;
        tr.next += tr.step;
        if (tr.i % loopSteps === 0) tr.loops++;
      }
    }
  }

  schedStep(tr, i, t0) {
    const s = tr.song, step = tr.step, O = tr.out;
    const nBars = s.bars.length;
    const L = Math.floor(i / (nBars * 8));          // número de vuelta
    const bi = Math.floor(i / 8) % nBars, pos = i % 8;
    const { sec, k } = s.bars[bi];
    const chord = sec.pad ? sec.pad[k % sec.pad.length] : null;
    const many = s.loops > 1;
    const intro = many && L === 0;                  // primera vuelta: más pelada
    const T = s.lift && many && L === s.loops - 1 ? LIFT : 1;
    const when = s.swing && pos % 2 === 1 ? t0 + step * s.swing : t0;

    // melodía (las notas largas con un vibrato suave)
    const m = sec.mel[k][pos];
    if (m) this.lead(sec.lead, m.f * T, m.len * step * 0.92, sec.leadVol, when, O.lead, m.len >= 3);
    // segunda voz armonizando, desde la segunda vuelta
    if (m && chord && !intro && s.harmony !== false && (m.len >= 2 || pos % 2 === 0)) {
      this.osc('triangle', harmonize(m.f, chord) * T, m.len * step * 0.85, s.harmVol || 0.05, when, O.harm, 0.02);
    }

    // bajo
    const bq = sec.bass[k % sec.bass.length];
    if (s.bassStyle === 'pulse') {
      const b = bq[pos >> 1];
      if (b) this.osc('triangle', b.f * T * (pos % 2 ? 2 : 1), step * 0.8, s.bassVol * (pos % 2 ? 0.6 : 1), when, O.base, 0.005);
    } else if (pos % 2 === 0) {
      const b = bq[pos / 2];
      if (b) {
        const dur = b.len * step * 2 * 0.9;
        this.osc(s.subBass ? 'sine' : 'triangle', b.f * T, dur, s.bassVol, when, O.base, s.subBass ? 0.25 : 0.01);
      }
    }
    if (pos === 0 && chord && s.padVol) this.pad(chord.map((f) => f * T), step * 8, s.padVol, when, O.base);
    // arpegio: en la intro recién entra en la segunda mitad
    if (s.arp && chord && (!intro || bi >= nBars / 2)) {
      const pat = [0, 1, 2, 1, 0, 1, 2, 3];
      const q = pat[pos];
      const f = (q === 3 ? chord[0] * 2 : chord[q]) * 2 * T;
      this.osc('triangle', f, step * 0.9, s.arp, when, O.arp, 0.005);
    }

    // batería: en la intro entra a la mitad; redoble en el último compás de cada vuelta
    if (!s.drums || (intro && bi < nBars / 2)) return;
    const d = s.drums, lastBar = bi === nBars - 1;
    if (s.groove === 'epic') {
      // bombo galopante, redoblante en 2 y 4, platillo al empezar cada vuelta
      if (pos === 0 || pos === 3 || pos === 4 || pos === 7) this.kick(when, d, O.base);
      if (pos === 2 || pos === 6) this.snare(when, d, O.base);
      if (lastBar && pos >= 4) this.snare(when + step / 2, d * 0.6, O.base);
      this.hat(when, d * (pos % 2 ? 0.7 : 1), O.base);
      if (pos === 0 && bi % 4 === 0) this.crash(when, d, O.base);
      return;
    }
    if (s.groove === 'cumbia') {
      // bombo en 1 y 3, güiro largo-corto y el "chas" del redoblante a contratiempo
      if (pos === 0 || pos === 4) this.kick(when, d, O.base);
      this.guiro(when, d * (pos % 2 ? 0.55 : 1), pos % 2 ? 0.05 : 0.13, O.base);
      if (pos === 2 || pos === 6) this.snare(when, d * 0.55, O.base);
      if (pos === 3 || pos === 7) this.rim(when, d * 0.7, O.base);
    } else if (s.groove === 'heart') {
      // latido: ba-dum al principio de cada compás
      if (pos === 0) this.kick(when, d * 1.2, O.base);
      if (pos === 1) this.kick(when, d * 0.75, O.base);
      if (pos === 4 && !intro) this.hat(when, d * 0.5, O.base);
    } else {
      if (pos === 0 || pos === 4) this.kick(when, d, O.base);
      if (pos % 2 === 1) this.hat(when, d, O.base, !intro && pos === 7 ? 0.14 : 0.04);
      if (!intro && (pos === 2 || pos === 6)) this.snare(when, d * 0.5, O.base);
    }
    if (lastBar && pos >= 4) this.snare(when, d * (0.35 + (pos - 4) * 0.12), O.base); // redoble
    if (lastBar && pos >= 6) this.snare(when + step / 2, d * 0.6, O.base);
  }

  lead(type, f, dur, vol, when, out, vib = false) {
    if (type === 'epic') {
      // cuadrada al frente con una sierra una octava abajo que le da cuerpo
      this.osc('square', f, dur, vol, when, out, 0.006, vib ? 0.006 : 0);
      this.osc('sawtooth', f / 2, dur, vol * 0.45, when, out, 0.006);
    } else if (type === 'bell') {
      const d = Math.max(dur, 1.4);
      this.osc('sine', f, d, vol, when, out, 0.005);
      this.osc('sine', f * 2.01, d * 0.5, vol * 0.25, when, out, 0.005);
    } else if (type === 'pluck') {
      // cuerda pulsada: cuadrada que se apaga rápido detrás de un filtro que se va cerrando
      this.filtered('square', f, Math.min(dur, 0.6), vol, when, out, 0.004, 3200, 500);
    } else if (type === 'choir') {
      // "coro": dos sierras desafinadas apenas, filtradas y con entrada lenta
      this.filtered('sawtooth', f, dur, vol, when, out, 0.18, 1300, 1100, 7);
      this.filtered('sawtooth', f, dur, vol, when, out, 0.18, 1300, 1100, -7);
    } else {
      this.osc(type, f, dur, vol, when, out, 0.008, vib ? 0.007 : 0);
    }
  }

  osc(type, f, dur, vol, when, out, attack = 0.01, vib = 0) {
    const c = this.c;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, when + attack + dur);
    o.connect(g); g.connect(out);
    const end = when + attack + dur + 0.05;
    if (vib) {
      // vibrato que entra un poquito después del ataque
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 5.5;
      lg.gain.setValueAtTime(0, when);
      lg.gain.linearRampToValueAtTime(f * vib, when + Math.min(0.35, dur * 0.5));
      l.connect(lg); lg.connect(o.frequency);
      l.start(when); l.stop(end);
    }
    o.start(when); o.stop(end);
  }

  /** oscilador detrás de un filtro pasabajos que va de `f0` a `f1` */
  filtered(type, f, dur, vol, when, out, attack, f0, f1, detune = 0) {
    const c = this.c;
    const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, when);
    o.detune.setValueAtTime(detune, when);
    fl.type = 'lowpass'; fl.Q.value = 0.8;
    fl.frequency.setValueAtTime(f0, when);
    fl.frequency.exponentialRampToValueAtTime(f1, when + attack + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, when + attack + dur);
    o.connect(fl); fl.connect(g); g.connect(out);
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

  noise(when, len, vol, type, freq, out, q = 0.7) {
    const c = this.c;
    const s = c.createBufferSource(); s.buffer = this.a.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    s.connect(f); f.connect(g); g.connect(out);
    s.start(when, Math.random() * 0.5); s.stop(when + len + 0.02);
    return g.gain;
  }

  snare(when, vol, out) {
    const g = this.noise(when, 0.14, vol, 'bandpass', 1900, out);
    g.setValueAtTime(0.32 * vol, when);
    g.exponentialRampToValueAtTime(0.001, when + 0.14);
    this.osc('triangle', 190, 0.06, 0.18 * vol, when, out, 0.002);
  }

  /** güiro: raspado de ruido que crece y se corta */
  guiro(when, vol, len, out) {
    const g = this.noise(when, len, vol, 'bandpass', 3200, out, 2.5);
    g.setValueAtTime(0.0001, when);
    g.linearRampToValueAtTime(0.13 * vol, when + len * 0.8);
    g.linearRampToValueAtTime(0.0001, when + len);
  }

  /** golpe de aro: un "tic" seco */
  rim(when, vol, out) {
    this.osc('square', 1650, 0.025, 0.05 * vol, when, out, 0.001);
    const g = this.noise(when, 0.03, vol, 'highpass', 5000, out);
    g.setValueAtTime(0.08 * vol, when);
    g.exponentialRampToValueAtTime(0.001, when + 0.03);
  }

  crash(when, vol, out) {
    const c = this.c;
    const s = c.createBufferSource(); s.buffer = this.a.noiseBuf; s.loop = true; // el ruido dura 1 s
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 4200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16 * vol, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 1.1);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(when, Math.random() * 0.3); s.stop(when + 1.15);
  }

  /** platillo cerrado (o un poco abierto si `len` es más largo) */
  hat(when, vol, out, len = 0.04) {
    const g = this.noise(when, len, vol, 'highpass', 6500, out);
    g.setValueAtTime(0.12 * vol, when);
    g.exponentialRampToValueAtTime(0.001, when + len);
  }

  get songName() { return this.track ? this.track.song.name : ''; }
}
