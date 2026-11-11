// Charlas entre Pablo y Panchi mientras cavan: cada 120 m uno dice algo y el otro le contesta,
// con burbujitas de diálogo arriba de la cabeza y ruidito de voz, sin frenar el juego.
// Solo pasa cuando están los dos en juego (uno con un bot o, más adelante, de a dos personas).
import { CHARACTERS } from './config.js';
import { drawText, CHAR_H } from './sprites.js';
import { clamp } from './util.js';

const EVERY = 120;     // metros entre charla y charla
const WRAP = 22;       // letras por renglón en la burbuja
const CPS = 26;        // letras por segundo al "escribir"

// 'a' arranca la charla y 'b' contesta ('popi' = habla Popi: esa charla solo sale si Popi está con ustedes).
// {m} = metros, {a}/{b} = nombres. La fuente pixel no tiene comillas ni paréntesis: mejor no usarlos.
const CHATS = [
  [['a', '¡Ya vamos {m} metros!!'], ['b', '¿Y cuánto falta?'], ['a', 'Ni idea. Seguro que mucho.']],
  [['a', '¿Cuanto faltaa??'], ['b', 'Si me preguntás otra vez me voy con el Popi.']],
  [['a', '¿Qué tan hondo puede esconder regalos un pájaro? No tiene sentido'], ['b', 'Con paciencia y saliva, el pajarito metió el regalo. No era así?']],
  [['a', '{m} metros... ¡mamita!!'], ['b', 'Hay que tener paciencia...']],
  [['a', 'Tengo hambree.'], ['b', 'Abajo de todo seguro hay un local de hamburguesas smash'], ['a', '¿En serio?'], ['b', 'No!!']],
  [['a', '¿Escuchaste eso?'], ['b', '¿Qué cosa?'], ['a', 'Nada, era mi panza je.']],
  [['a', 'Si seguimos bajando llegaremos a Japón? Nos ahorraríamos el pasaje con eso..'], ['b', 'Creo que no funciona así...']],
  [['a', '{b}, porfa ¿me llevás a upa lo que queda?'], ['b', 'No me puedo llevar ni a mi, la veo complicada.']],
  [['a', 'Para el próximo cumple venimos con un taladro bien enorme.'], ['b', 'O con una jaula bien grande para el pájaro este.']],
  [['a', 'Ya van {m} metros. Estoy agotado...'], ['b', '¡Si recién empezamos!']],
  [['a', '¿Apagamos el gas antes de salir?'], ['b', '...'], ['b', '¡Ahora me dejaste con la duda!!.']],
  [['a', 'Hace como un calorcito, ¿no?'], ['b', '¿Será la emoción de encontrar los regalos?'], ['a', 'Ojalá sea eso y no otra cosa..']],
  [['a', 'Cómo es que Popi no cava el suelo más rápido si es un perro?.'], ['popi', 'A mi que no me miren...']],
  [['a', '¿Cuánto mide la Tierra de profundo?'], ['b', '¡Esas preguntas no aportan ahora mismo!!']],
  [['a', '¿Vos creés que los regalos valen tanto esfuerzo?'], ['b', 'Si es lo que pienso, ¡sí!']],
];

/** corta el texto en renglones de hasta WRAP letras */
function wrap(text) {
  const out = [];
  let line = '';
  for (const w of text.split(' ')) {
    if (line && (line + ' ' + w).length > WRAP) { out.push(line); line = w; }
    else line = line ? line + ' ' + w : w;
  }
  if (line) out.push(line);
  return out;
}

export class Chatter {
  constructor(game) {
    this.g = game;
    this.cur = null;
    this.next = EVERY;
    this.idx = 0;
  }

  /** arranca a contar desde la profundidad actual (no repasa las charlas de lo ya cavado) */
  reset(p, idx = this.idx) {
    this.cur = null;
    this.idx = idx;
    this.next = (Math.floor(Math.max(0, p.depth) / EVERY) + 1) * EVERY;
  }

  /** los dos personajes en juego (y no ocultos) */
  pair() {
    const ps = this.g.players.filter((p) => !p.dead && (!p.ai || p.ai.active));
    const a = ps.find((p) => p.char === 'pablo'), b = ps.find((p) => p.char === 'pancha');
    return a && b ? [a, b] : null;
  }

  /** lo que se manda por la red: quién habla ('h' = el anfitrión, 'g' = el invitado) y cuánto se ve */
  netState(local) {
    const c = this.cur;
    if (!c) return null;
    const L = c.lines[c.i];
    return { w: L.popi ? 'p' : L.who === local ? 'h' : 'g', r: L.rows, s: Math.floor(c.shown) };
  }

  update(dt) {
    const pair = this.pair();
    if (!pair) { this.cur = null; return; }
    const lead = this.g.players[0];
    if (!this.cur) {
      if (lead.depth < this.next) return;
      this.next = (Math.floor(lead.depth / EVERY) + 1) * EVERY;
      const m = Math.floor(lead.depth / EVERY) * EVERY;
      // las charlas donde habla Popi se saltean si no está con ustedes
      let chat = CHATS[this.idx % CHATS.length];
      for (let k = 0; k < CHATS.length && !this.g.popi && chat.some(([w]) => w === 'popi'); k++) chat = CHATS[++this.idx % CHATS.length];
      this.idx++;
      const [first, second] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
      const names = { a: CHARACTERS[first.char].name, b: CHARACTERS[second.char].name };
      this.cur = {
        i: 0, t: 0, shown: 0, talk: 0,
        lines: chat.map(([who, txt]) => ({
          who: who === 'popi' ? this.g.popi : who === 'a' ? first : second,
          popi: who === 'popi',
          rows: wrap(txt.replace('{m}', m).replace('{a}', names.a).replace('{b}', names.b)),
        })),
      };
      return;
    }
    const c = this.cur, L = c.lines[c.i];
    // si Popi se fue (volvió al patio) justo cuando le tocaba hablar, se corta la charla
    if (L.popi && L.who !== this.g.popi) { this.cur = null; return; }
    const total = L.rows.join(' ').length;
    c.t += dt;
    const before = Math.floor(c.shown);
    c.shown = Math.min(total, c.shown + CPS * dt);
    // ruidito de voz cada dos o tres letras
    if (Math.floor(c.shown) !== before && c.shown < total) {
      c.talk++;
      if (L.popi) { if (c.talk === 1) this.g.audio.play('bark'); } else if (c.talk % 3 === 0) this.g.audio.play('talk');
    }
    const hold = 1.4 + total * 0.045;
    if (c.shown >= total && c.t > total / CPS + hold) {
      c.i++; c.t = 0; c.shown = 0; c.talk = 0;
      if (c.i >= c.lines.length) this.cur = null;
    }
  }

  draw(ctx, camX, camY, vw) {
    let p, rows, shown;
    const g = this.g;
    if (this.remoteState) {
      // invitado online: la charla la maneja el anfitrión ('h' es él, 'g' soy yo)
      const R = this.remoteState;
      p = R.w === 'p' ? g.popi : R.w === 'g' ? g.players[0] : g.net.remote;
      rows = R.r; shown = R.s;
      if (!p) return;
    } else {
      const c = this.cur;
      if (!c || !this.pair()) return;
      const L = c.lines[c.i];
      p = L.who; rows = L.rows; shown = c.shown;
      if (L.popi && p !== g.popi) return;
    }
    const w = Math.max(...rows.map((r) => r.length)) * 4 - 1 + 6;
    const h = rows.length * 7 - 2 + 6;
    // Popi es más bajito: el globito sale justo arriba de su cabeza
    const head = Math.round((p === g.popi ? p.y - 2 : p.y + p.h - CHAR_H) - camY);
    const px = Math.round(p.cx - camX);
    const bx = clamp(px - (w >> 1), 2, Math.max(2, Math.round(vw) - w - 2)), by = head - 5 - h;
    // globito con borde y colita hacia la cabeza
    ctx.fillStyle = '#1d1420';
    ctx.fillRect(bx + 1, by, w - 2, h); ctx.fillRect(bx, by + 1, w, h - 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(bx + 1, by + 1, w - 2, h - 2);
    const tx = clamp(px, bx + 3, bx + w - 4);
    ctx.fillStyle = '#1d1420';
    ctx.fillRect(tx - 2, by + h - 1, 5, 1); ctx.fillRect(tx - 1, by + h, 3, 1); ctx.fillRect(tx, by + h + 1, 1, 2);
    ctx.fillStyle = '#fff4e0';
    ctx.fillRect(tx - 1, by + h - 1, 3, 1); ctx.fillRect(tx, by + h, 1, 1);
    // texto que se va escribiendo
    let left = Math.floor(shown);
    rows.forEach((r, i) => {
      if (left <= 0) return;
      const part = r.slice(0, left);
      left -= r.length + 1;
      drawText(ctx, part, bx + 3, by + 3 + i * 7, '#1d1420');
    });
  }
}
