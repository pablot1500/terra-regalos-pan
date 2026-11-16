// Genera con ElevenLabs (Sound Effects) los efectos de sonido grabados del juego. Quedan en
// src/sfx/gen/ junto con src/sfx/gen/manifest.json, que es lo que lee el juego: si un efecto tiene
// versión grabada suena esa; si no (o si no carga), suena la hecha con código.
//
// Uso (necesita Node 18 o más nuevo):
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs            → genera los que falten
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs thunder    → rehace solo ese
//   ELEVENLABS_API_KEY=tu_clave node tools/generar-efectos.mjs --todos    → rehace todos
// Antes de rehacer uno, conviene mover el mp3 viejo a src/sfx/gen/respaldo/ (no se usa en el juego).
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
  // para comparar con los de código (menú Efectos de sonido): los números son los del menú
  ['dig', 0.5, 0.6, 'A single short crunchy scoop of a shovel digging into soft dirt, cartoon video game sound effect.'],                  // 1
  ['break', 0.6, 0.6, 'A small block of packed earth and pebbles breaking apart, short crumbly crunch, video game sound effect.'],      // 2
  ['clink', 0.7, 0.7, 'A loud, clear metallic clang of a steel shovel striking hard stone, bright ringing clink, video game sound effect.'],                       // 3
  ['drill', 1, 0.6, 'A short burst of a small electric power drill grinding into rock, video game sound effect.'],                      // 4
  ['bill', 0.6, 0.5, 'Picking up paper money: a quick crisp banknote rustle with a tiny happy chime, video game pickup sound.'],        // 6
  ['gold', 0.8, 0.5, 'Collecting a gold nugget: bright sparkly ascending chime with a little coin jingle, video game pickup sound.'],  // 7
  ['gem', 1, 0.5, 'Collecting a precious gem: magical crystal shimmer and sparkle, video game pickup sound.'],                          // 8
  ['jump', 0.5, 0.5, 'A cartoon jump: short springy whoosh, cute platformer video game sound effect.'],                                // 10
  ['hurt', 0.6, 0.5, 'A cartoon character gets hurt: short soft thud with a little bonk, video game damage sound, no voice.'],         // 13
  ['buy', 1, 0.5, 'A successful purchase in a shop: cash register ding with a happy coin jingle, video game sound.'],                  // 17
  ['deny', 0.6, 0.5, 'Error, not enough money: short low double buzz, cute video game menu denial sound.'],                            // 18
  ['ui', 0.6, 0.7, 'A clear, crisp and clearly audible bubbly pop click of a game menu button, cute and bright.'],                                                     // 19
  ['bark', 0.7, 0.6, 'A small happy dachshund dog barking twice, short and cute.'],                                                    // 21
  ['surprise', 0.8, 0.5, 'A cartoon surprise sting: short quick rising ding, like an exclamation mark, video game sound effect.'],     // 22
  ['gate', 1.5, 0.7, 'An old wooden garden gate made of wooden planks slowly creaking open on old hinges: a dry, hollow wooden creak, no metal sounds.'],                                                               // 24
  ['gateShut', 0.8, 0.6, 'A wooden gate closing with a solid thud and a metal latch click.'],                                          // 25
  ['boom', 2, 0.5, 'A big cartoon explosion: punchy boom with a rumble and falling debris, video game sound effect.'],                 // 29
  ['magic', 1.5, 0.5, 'A magical transformation: shimmering chimes, sparkles and a whoosh, fantasy video game power-up sound.'],       // 30
  ['squirt', 0.5, 0.6, 'A short squirt of a toy water pistol, quick spray of water.'],                                                // 32
  ['laugh', 1.5, 0.6, 'A cartoon villain eagle laughing: a squawky, bird-like, mischievous cackle, theatrical and funny rather than scary.'],                                  // 35
  ['peep', 0.7, 0.6, 'Small baby eagle chicks chirping peep peep, cartoon.'],                                                         // 36
  ['beam', 1.5, 0.5, 'A purple magic laser beam firing: sci-fi energy zap with crackle, video game sound effect.'],                    // 40
  ['flame', 1.5, 0.5, 'A burst of fire: big whoosh of a fireball blast, video game sound effect.'],                                    // 42
  ['bossHit', 0.6, 0.5, 'A boss enemy gets hit: punchy cartoon impact bonk, video game sound effect, no words.'],                       // 43
];
// los que ya reemplazan al de código en el juego (el resto queda de respaldo, para comparar en el menú)
const USE = new Set(['dig', 'clink', 'bill', 'gem', 'buy', 'deny', 'ui', 'bark', 'surprise', 'gate', 'gateShut', 'boom', 'laugh', 'beam', 'flame', 'bossHit']);
// volumen extra de cada grabado (1 = el nivelado automático)
const VOL = { dig: 0.7, clink: 0.85, deny: 0.7, gate: 0.85, laugh: 0.85, beam: 0.85, flame: 0.85, bossHit: 0.85 };
// ojo: gate.mp3 está recortado a mano a la mitad (0,75 s); el completo está en respaldo/. Si se regenera, hay que recortarlo de nuevo.

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
    if (fs.existsSync(path.join(OUT, `${id}.mp3`))) effects[id] = { file: `${id}.mp3`, use: USE.has(id), vol: VOL[id] ?? 1, prompt: text };
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ model: 'eleven_text_to_sound_v2', effects }, null, 2) + '\n');
  console.log(`\nmanifest.json actualizado (${Object.keys(effects).length} efectos).`);
}

main().catch((e) => { console.error('\n' + e.message); process.exit(1); });
