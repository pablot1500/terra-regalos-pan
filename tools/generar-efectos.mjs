// Genera con ElevenLabs (Sound Effects) los efectos de sonido grabados del juego. Quedan en
// src/sfx/gen/ junto con src/sfx/gen/manifest.json, que es lo que lee el juego: si un efecto tiene
// versión grabada suena esa; si no (o si no carga), suena la hecha con código.
//
// Uso (necesita Node 18 o más nuevo):
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs            → genera los que falten
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs thunder    → rehace solo ese
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs --todos    → rehace todos
// La clave también se puede poner en un archivo .env.local (ELEVENLABS_API_KEY=...), que no se sube a git.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'sfx', 'gen');
const ENDPOINT = 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128';

// [id del efecto en el juego (audio.play), duración en segundos, cuánto se apega al texto (0 a 1), descripción]
const EFFECTS = [
  ['thunder', 3, 0.5, 'A loud, dramatic thunder crack followed by a deep rolling rumble, like a dramatic reveal in a cartoon. No rain.'],
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generate(key, text, dur, influence) {
  const body = { text, model_id: 'eleven_text_to_sound_v2', duration_seconds: dur, prompt_influence: influence };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify(body),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const msg = (await res.text().catch(() => '')).slice(0, 300);
    if (res.status === 429 && attempt < 4) { await sleep(attempt * 5000); continue; }
    throw new Error(`ElevenLabs respondió ${res.status}: ${msg}`);
  }
}

async function main() {
  const key = apiKey();
  if (!key) {
    console.error('Falta la clave de ElevenLabs: ELEVENLABS_API_KEY=... node tools/generar-efectos.mjs (o ponela en .env.local)');
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const args = process.argv.slice(2);
  const all = args.includes('--todos');
  const only = args.filter((a) => !a.startsWith('--'));
  for (const [id, dur, influence, text] of EFFECTS) {
    const dest = path.join(OUT, `${id}.mp3`);
    const want = only.length ? only.includes(id) : all || !fs.existsSync(dest);
    if (!want) { console.log(`· ${id}: ya estaba`); continue; }
    process.stdout.write(`♪ ${id} (${dur} s)... `);
    const mp3 = await generate(key, text, dur, influence);
    fs.writeFileSync(dest, mp3);
    console.log(`listo (${Math.round(mp3.length / 1024)} KB)`);
    await sleep(800);
  }
  const effects = {};
  for (const [id, dur, influence, text] of EFFECTS) {
    if (fs.existsSync(path.join(OUT, `${id}.mp3`))) effects[id] = { file: `${id}.mp3`, prompt: text };
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ model: 'eleven_text_to_sound_v2', effects }, null, 2) + '\n');
  console.log(`\nmanifest.json actualizado (${Object.keys(effects).length} efectos).`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
