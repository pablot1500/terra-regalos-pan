// Charlas entre Pablo y Panchi mientras cavan: cada 120 m uno dice algo y el otro le contesta,
// con burbujitas de diálogo arriba de la cabeza y ruidito de voz, sin frenar el juego.
// Solo pasa cuando están los dos en juego (uno con un bot o, más adelante, de a dos personas).
import { CHARACTERS } from './config.js';
import { drawText, CHAR_H } from './sprites.js';
import { clamp } from './util.js';

const EVERY = 120;     // metros entre charla y charla
const WRAP = 22;       // letras por renglón en la burbuja
const CPS = 26;        // letras por segundo al "escribir"

// 'a' arranca la charla y 'b' contesta. {m} = metros, {a}/{b} = nombres.
// La fuente pixel no tiene comillas ni paréntesis: mejor no usarlos.
const CHATS = [
  [['a', '¡Ya vamos {m} metros!'], ['b', '¿Y cuánto falta?'], ['a', 'Ni idea. Mucho, creo.']],
  [['a', '¿Falta mucho?'], ['b', 'Si me preguntás otra vez, te dejo acá abajo.']],
  [['a', '¿Qué tan hondo puede esconder regalos un pajarraco?'], ['b', 'Parece que muy, muy hondo.']],
  [['a', '{m} metros... ¡no llegamos nunca!'], ['b', 'La nota decía: traigan pala. Y paciencia.']],
  [['a', 'Tengo hambre.'], ['b', 'Abajo de todo seguro hay una pizzería.'], ['a', '¿En serio?'], ['b', 'No.']],
  [['a', '¿Escuchaste eso?'], ['b', '¿Qué cosa?'], ['a', 'Nada, era mi panza.']],
  [['a', 'Si seguimos cavando, salimos en Japón.'], ['b', 'Mejor: nos comemos un ramen y volvemos.']],
  [['a', '{b}, ¿me llevás a upa lo que queda?'], ['b', 'Ni en sueños.']],
  [['a', 'Para el próximo cumple pedimos un taladro más grande.'], ['b', 'O que Aguilus esconda los regalos en el placard.']],
  [['a', '{m} metros. Estoy agotado...'], ['b', '¡Si recién empezamos!']],
  [['a', '¿Apagaste la hornalla antes de salir?'], ['b', '...'], ['b', 'Ahora me dejaste con la duda.']],
  [['a', 'Acá abajo hace calorcito, ¿no?'], ['b', 'Es la emoción de encontrar los regalos.']],
  [['a', 'Si Popi viera esto, cavaría hasta el núcleo solo.'], ['b', 'Y nos traería los regalos con la boca.']],
  [['a', '¿Cuánto mide la Tierra de profundo?'], ['b', 'Unos 6.000 kilómetros.'], ['a', '...'], ['b', 'Mejor no pensemos en eso.']],
  [['a', '¿Vos creés que los regalos valen tanto esfuerzo?'], ['b', 'Si es lo que pienso, ¡sí!']],
  [['a', '¡{m} metros! Récord mundial de cavar en pareja.'], ['b', 'Lo subimos a las redes cuando salgamos.']],
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
    return { w: L.who === local ? 'h' : 'g', r: L.rows, s: Math.floor(c.shown) };
  }

  update(dt) {
    const pair = this.pair();
    if (!pair) { this.cur = null; return; }
    const lead = this.g.players[0];
    if (!this.cur) {
      if (lead.depth < this.next) return;
      this.next = (Math.floor(lead.depth / EVERY) + 1) * EVERY;
      const m = Math.floor(lead.depth / EVERY) * EVERY;
      const chat = CHATS[this.idx % CHATS.length];
      this.idx++;
      const [first, second] = Math.random() < 0.5 ? pair : [pair[1], pair[0]];
      const names = { a: CHARACTERS[first.char].name, b: CHARACTERS[second.char].name };
      this.cur = {
        i: 0, t: 0, shown: 0, talk: 0,
        lines: chat.map(([who, txt]) => ({
          who: who === 'a' ? first : second,
          rows: wrap(txt.replace('{m}', m).replace('{a}', names.a).replace('{b}', names.b)),
        })),
      };
      return;
    }
    const c = this.cur, L = c.lines[c.i];
    const total = L.rows.join(' ').length;
    c.t += dt;
    const before = Math.floor(c.shown);
    c.shown = Math.min(total, c.shown + CPS * dt);
    // ruidito de voz cada dos o tres letras
    if (Math.floor(c.shown) !== before && c.shown < total) {
      c.talk++;
      if (c.talk % 3 === 0) this.g.audio.play('talk');
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
      p = R.w === 'g' ? g.players[0] : g.net.remote;
      rows = R.r; shown = R.s;
      if (!p) return;
    } else {
      const c = this.cur;
      if (!c || !this.pair()) return;
      const L = c.lines[c.i];
      p = L.who; rows = L.rows; shown = c.shown;
    }
    const w = Math.max(...rows.map((r) => r.length)) * 4 - 1 + 6;
    const h = rows.length * 7 - 2 + 6;
    const head = Math.round(p.y + p.h - CHAR_H - camY);
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
