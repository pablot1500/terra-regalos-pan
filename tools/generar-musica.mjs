// Genera con ElevenLabs (música) las canciones alternativas del juego: 3 por zona, cada una
// del mismo largo que la canción programada que reemplaza. Quedan en src/music/gen/ junto con
// src/music/gen/manifest.json, que es lo que lee el juego (dentro de src/ para que Cloudflare las publique).
//
// Uso (necesita Node 18 o más nuevo):
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-musica.mjs          → genera las que falten
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-musica.mjs 4 7      → rehace solo la 4 y la 7
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-musica.mjs --todas  → rehace todas
// La clave también se puede poner en un archivo .env.local (ELEVENLABS_API_KEY=...), que no se sube a git.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'music', 'gen');

// mismo estilo para todas: instrumental, de videojuego, que se pueda repetir en loop
const STYLE = 'Instrumental video game soundtrack for a cute pixel-art digging adventure about rescuing birthday presents. Retro 16-bit / chiptune-inspired sound with modern warmth, no vocals, loops smoothly.';

// [zona, nombre, segundos (como la original), descripción]
const TRACKS = [
  [0, 'Patio soleado', 55, 'Cheerful sunny backyard on a birthday morning. Bright square-wave lead, bouncy bass, light drums, catchy major-key melody, about 104 bpm.'],
  [0, 'Mate y pala', 48, 'Playful, upbeat digging-with-a-shovel theme. Plucky chiptune lead, snappy drums, cheerful and fast, about 120 bpm.'],
  [0, 'Cumbia del cantero', 77, 'Argentine cumbia meets chiptune: güiro, cumbia drum groove, accordion-like synth lead, festive birthday party vibe, about 100 bpm.'],
  [1, 'Cuevas de cristal', 65, 'Mysterious but cozy underground crystal cave exploration. Glassy chimes, soft arpeggios, echoing triangle-wave melody, about 88 bpm.'],
  [1, 'Eco del granito', 58, 'Adventurous mining theme deeper underground. Steady drums, echoing synth melody, a little tension and a lot of wonder, about 100 bpm.'],
  [1, 'Minero de medianoche', 83, 'Laid-back midnight miner groove. Plucked synth lead, warm round bass, relaxed lo-fi retro game feel, about 92 bpm.'],
  [2, 'Abismo', 76, 'Dark, vast abyss deep underground. Bell tones, deep sub bass, slow and eerie but still melodic, about 76 bpm.'],
  [2, 'Corazón de la tierra', 60, 'Glowing lava caverns near the center of the Earth. Rising tension, triangle-wave arpeggios, mysterious melody, about 96 bpm.'],
  [2, 'Latido de magma', 91, 'Magma chamber with a heartbeat drum pulse, ominous choir pads and a slow building tension, about 84 bpm.'],
  [3, 'Combate final', 51, 'Epic final boss battle against a wizard eagle. Galloping drums, heroic synth-brass lead, very intense and fast, about 152 bpm.'],
  [3, 'Lluvia de magma', 48, 'Frantic boss fight while fire rains from above. Driving drums, gritty saw-wave leads, heroic and urgent, about 160 bpm.'],
  [3, 'Furia de Aguilus', 53, 'Dramatic, slightly comedic villain boss theme. Organ and choir over chiptune drums, epic and theatrical, about 144 bpm.'],
];

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    const m = /^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\n]+)"?/m.exec(env);
    if (m) return m[1].trim();
  } catch { /* no hay archivo */ }
  return null;
}

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function compose(key, prompt, ms, model) {
  const res = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, music_length_ms: ms, model_id: model, force_instrumental: true }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`ElevenLabs respondió ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.error('Falta la clave de ElevenLabs: ELEVENLABS_API_KEY=... node tools/generar-musica.mjs (o ponela en .env.local)');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2);
  const all = args.includes('--todas');
  const only = args.filter((a) => /^\d+$/.test(a)).map(Number);
  let model = process.env.ELEVENLABS_MUSIC_MODEL || 'music_v2_5';

  for (let i = 0; i < TRACKS.length; i++) {
    const [zone, name, secs, desc] = TRACKS[i];
    const file = `${String(i + 1).padStart(2, '0')}-${slug(name)}.mp3`;
    const dest = path.join(OUT, file);
    const want = only.length ? only.includes(i + 1) : all || !fs.existsSync(dest);
    if (!want) { console.log(`· ${i + 1}. ${name}: ${fs.existsSync(dest) ? 'ya estaba' : 'pendiente'}`); continue; }
    const prompt = `${STYLE} ${desc}`;
    process.stdout.write(`♪ ${i + 1}. ${name} (${secs} s)... `);
    let mp3;
    try {
      mp3 = await compose(key, prompt, secs * 1000, model);
    } catch (e) {
      // si el modelo nuevo no está disponible en la cuenta, prueba con el primero
      if (model !== 'music_v1' && (e.status === 400 || e.status === 403 || e.status === 422)) {
        model = 'music_v1';
        mp3 = await compose(key, prompt, secs * 1000, model);
      } else throw e;
    }
    fs.writeFileSync(dest, mp3);
    console.log(`listo (${Math.round(mp3.length / 1024)} KB)`);
  }

  // el manifiesto: lo que el juego sabe que existe
  const zones = [[], [], [], []];
  TRACKS.forEach(([zone, name, secs, desc], i) => {
    const file = `${String(i + 1).padStart(2, '0')}-${slug(name)}.mp3`;
    if (fs.existsSync(path.join(OUT, file))) zones[zone].push({ name, file, secs, prompt: desc });
  });
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ model, zones }, null, 2) + '\n');
  console.log(`\nmanifest.json actualizado (${zones.flat().length} canciones).`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
