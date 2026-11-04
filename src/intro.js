// Cinemática de inicio: Pablo y Panchi llegan al edificio, suben al departamento,
// buscan los regalos debajo de la cama y encuentran una nota misteriosa.
// El guión está en `script()`: cada `yield` espera a que termine lo anterior.
import { TILE, SURFACE } from './config.js';
import { T } from './tiles.js';
import { getCharFrames, CHAR_PAL, CHAR_W, CHAR_H, drawText, DOG, ICON_URL } from './sprites.js';
import { DOG_POS } from './structures.js';
import { clamp, pixelLine } from './util.js';

const S = SURFACE;
const FLOOR = (S - 6) * TILE;         // piso del departamento 1B
const APT_CX = 15 * TILE;             // centro del departamento

export const NOTE_TEXT = `Querida cumpleañera:

Este año TAMPOCO te vas a salvar.

Tus regalos ya no están acá: me los llevé muy, muy, MUY abajo, donde la tierra se pone calentita.

Si los querés, van a tener que cavar.

— Anónimo

P.D.: Traigan pala. Y paciencia.`;

const SPEAKERS = {
  pablo: { name: 'Pablo', icon: () => ICON_URL.char_pablo },
  pancha: { name: 'Panchi', icon: () => ICON_URL.char_pancha },
  popi: { name: 'Popi', icon: () => DOG.happyA.toDataURL() },
};

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export class Intro {
  constructor(game) {
    this.g = game;
    this.ui = game.ui;
    this.t = 0;
    const actor = (id, x, phase) => ({ id, x, y: S * TILE, facing: -1, target: null, speed: 30, pose: 'idle', walkT: 0, emote: null, emoteT: 0, phase });
    this.actors = { pancha: actor('pancha', 600, 0), pablo: actor('pablo', 618, 1.3) };
    this.follow = ['pancha', 'pablo'];
    this.setZoom(1.5);
    game.zoom = this.zoomT;
    this.fixed = null;
    this.tween = null;
    this.line = null;
    this.noteOpen = false;
    this.feathers = [];
    this.done = false;
    this.onKey = (e) => {
      if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) this.advance();
      if (e.code === 'Escape') this.skip();
    };
    window.addEventListener('keydown', this.onKey);
    this.co = this.script();
    this.waitFn = null;
    this.step();
  }

  // ------------------------------------------------------------
  //  Guión
  // ------------------------------------------------------------
  *script() {
    const A = this.actors, g = this.g;
    this.snapCam();
    this.ui.introCaption('El día del cumple de Panchita...');
    this.ui.fade(false);
    yield this.wait(1.6);
    this.walk('pancha', 470); this.walk('pablo', 492);
    yield this.wait(1.2);
    this.ui.introCaption(null);
    yield this.say('pancha', '¡Llegamos! ¡Qué lindo festejar mi cumple juntos otra vez!');
    yield this.say('pablo', 'Otro año más aguantándome... sos una campeona.');
    yield this.arrive('pancha', 'pablo');

    // Popi los recibe en el patio
    g.audio.play('bark');
    g.addText(DOG_POS.x + 10, DOG_POS.y - 2, '¡GUAU!', '#fff4e0');
    for (let i = 0; i < 3; i++) g.particles.add({ x: DOG_POS.x + 6 + i * 3, y: DOG_POS.y - 2, vx: (i - 1) * 6, vy: -14, life: 1.2, max: 1.2, heart: true, grav: 0 });
    yield this.say('pancha', '¡Popi! ¿Cuidaste la casa mientras no estábamos?');
    yield this.say('popi', 'Guau. (Traducción: más o menos.)');

    this.walk('pancha', 214); this.walk('pablo', 236);
    yield this.say('pancha', '¿Te acordás de lo que pasó el año pasado con los regalos?');
    yield this.say('pablo', 'Ni me lo nombres. Todavía tengo pesadillas.');
    yield this.say('pablo', 'Pero tranqui: este año los escondí yo. Lugar ultra secreto. Imposible que falle.');
    yield this.say('pancha', 'Mmm... eso mismo dijiste el año pasado.');
    yield this.arrive('pancha', 'pablo');
    this.walk('pancha', 150); this.walk('pablo', 166);
    yield this.arrive('pancha', 'pablo');

    // ---- corte: adentro del departamento ----
    this.ui.fade(true);
    yield this.wait(0.7);
    Object.assign(A.pablo, { x: 150, y: FLOOR, target: null, pose: 'idle' });
    Object.assign(A.pancha, { x: 160, y: FLOOR, target: null, pose: 'idle' });
    this.follow = null;
    this.fixed = { x: 128, y: FLOOR - 14 };
    this.setZoom(2.2);
    this.g.zoom = this.zoomT;
    this.snapCam();
    this.walk('pablo', 116); this.walk('pancha', 140);
    this.ui.fade(false);
    yield this.wait(0.5);
    yield this.say('pablo', '¡Ta-tán! El escondite perfecto: debajo de la cama.');
    yield this.arrive('pablo');
    A.pablo.facing = -1;
    A.pablo.pose = 'search';
    for (let i = 0; i < 4; i++) { g.audio.play('dig'); yield this.wait(0.3); }
    this.emote('pablo', '?');
    yield this.wait(1.0);
    yield this.say('pablo', 'Momento...');
    A.pablo.pose = 'idle';
    this.emote('pablo', '!');
    this.fixed = { x: 118, y: FLOOR - 12 };
    this.setZoom(2.8);
    g.audio.play('surprise');
    g.shake(1.5);
    yield this.say('pablo', '¡LOS REGALOS NO ESTÁN!');
    this.emote('pancha', '!');
    A.pancha.facing = -1;
    yield this.say('pancha', '¿¡CÓMO QUE NO ESTÁN!?');
    this.fixed = { x: 128, y: FLOOR - 14 };
    this.setZoom(2.2);
    yield this.say('pablo', 'Solo hay una nota... y una pluma.');
    this.feathers.push({ x: A.pablo.x - 6, y: FLOOR - 16, vy: 6, t: 0, landed: false });
    g.audio.play('paper');
    yield this.wait(0.6);
    yield this.note();
    yield this.say('pancha', '¿¡Otra vez!? ¿Quién hace estas cosas?');
    yield this.say('pablo', 'Ni idea... pero dice "muy abajo". ¡El cantero del patio!');
    yield this.say('pancha', 'Y en el taller de la casa rodante venden palas.');
    this.emote('pancha', '♥');
    yield this.say('pancha', '¡Bueno, a cavar! Este cumple no me lo arruina nadie.');

    // ---- la cámara baja hasta el primer regalo ----
    const ch = g.world.chests.filter((c) => !c.core).sort((a, b) => a.r - b.r)[0];
    this.ui.introCaption('Mientras tanto, muy, muy abajo...');
    this.setZoom(1);
    if (ch) {
      this.feathers.push({ x: ch.c * TILE + 14, y: ch.r * TILE - 1, vy: 0, t: 0, landed: true });
      yield this.pan(ch.c * TILE + 4 - g.vw / 2, ch.r * TILE - g.vh / 2, 3.2);
      // acercamiento al cofre (con una plumita sospechosa al lado)
      this.fixed = { x: ch.c * TILE + 8, y: ch.r * TILE - 8 };
      this.setZoom(2.2);
      yield this.wait(2.6);
      this.setZoom(1);
    }
    this.ui.introCaption(null);
    const tc = g.titleCam();
    yield this.pan(tc.x, tc.y, 2.6);
    this.finish();
  }

  // ------------------------------------------------------------
  //  Pasos del guión
  // ------------------------------------------------------------
  /** zoom de la cámara; en reposo queda en una escala entera para que los pixeles salgan parejos */
  setZoom(z) {
    const S = this.g.scale || 1;
    this.zoomT = Math.max(1, Math.round(S * z)) / S;
  }

  viewW() { return this.g.vw / this.g.zoom; }
  viewH() { return this.g.vh / this.g.zoom; }

  wait(s) { const end = this.t + s; return () => this.t >= end; }

  walk(id, x) { this.actors[id].target = x; }

  arrive(...ids) { return () => ids.every((id) => this.actors[id].target === null); }

  emote(id, ch) { const a = this.actors[id]; a.emote = ch; a.emoteT = 0; }

  say(who, text) {
    this.line = { who, text, shown: 0, t: 0, hold: 1.8 + text.length * 0.045 };
    const sp = SPEAKERS[who];
    this.ui.introSay(sp.name, sp.icon(), '');
    return () => this.line === null;
  }

  note() {
    this.noteOpen = true;
    this.ui.introSay(null);
    this.ui.introNote(NOTE_TEXT, () => { this.noteOpen = false; this.g.audio.play('paper'); });
    return () => !this.noteOpen;
  }

  pan(x, y, dur) {
    const c = this.g.cam;
    this.follow = null; this.fixed = null;
    this.tween = { x0: c.x, y0: c.y, x1: x, y1: y, t: 0, dur };
    return () => this.tween === null;
  }

  step() {
    if (this.done) return;
    const r = this.co.next();
    if (r.done) return;
    this.waitFn = r.value;
  }

  /** click / espacio: completa la línea que se está escribiendo o pasa a la siguiente */
  advance() {
    if (this.done || this.noteOpen) return;
    const L = this.line;
    if (!L) return;
    if (L.shown < L.text.length) { L.shown = L.text.length; this.ui.introText(L.text); }
    else this.endLine();
  }

  endLine() {
    this.line = null;
    this.ui.introSay(null);
  }

  skip() {
    if (this.done) return;
    const tc = this.g.titleCam();
    this.g.cam.x = tc.x; this.g.cam.y = tc.y;
    this.finish();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    window.removeEventListener('keydown', this.onKey);
    this.ui.introSay(null);
    this.ui.introCaption(null);
    this.ui.introNote(null);
    this.ui.fade(false);
    this.g.zoom = 1;
    this.g.endIntro();
  }

  // ------------------------------------------------------------
  //  Update
  // ------------------------------------------------------------
  update(dt) {
    if (this.done) return;
    this.t += dt;
    for (const a of Object.values(this.actors)) {
      if (a.target !== null) {
        const d = a.target - a.x, dir = Math.sign(d);
        a.facing = dir || a.facing;
        a.x += dir * Math.min(Math.abs(d), a.speed * dt);
        a.walkT += dt;
        if (Math.abs(a.target - a.x) < 0.01) { a.x = a.target; a.target = null; }
      }
      // altura del piso: sube y baja los escalones de a poco
      const gy = this.groundY(a.x);
      a.y += (gy - a.y) * Math.min(1, dt * 16);
      if (a.emote) { a.emoteT += dt; if (a.emoteT > 2.2) a.emote = null; }
    }
    for (const f of this.feathers) {
      f.t += dt;
      if (f.landed) continue;
      f.y += f.vy * dt;
      if (f.y >= FLOOR - 2) { f.y = FLOOR - 2; f.landed = true; }
    }
    const L = this.line;
    if (L) {
      L.t += dt;
      const before = Math.floor(L.shown);
      if (L.shown < L.text.length) {
        L.shown = Math.min(L.text.length, L.shown + dt * 40);
        const now = Math.floor(L.shown);
        if (now !== before) {
          this.ui.introText(L.text.slice(0, now));
          if (L.who === 'popi') { if (before === 0) this.g.audio.play('bark'); } else if (now % 3 === 0 && /\S/.test(L.text[now - 1] || '')) this.g.audio.play('talk');
        }
      } else if (L.t > L.text.length / 40 + L.hold) this.endLine();
    }
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      if (tw.t >= tw.dur) this.tween = null;
    }
    if (this.waitFn && this.waitFn()) { this.waitFn = null; this.step(); }
  }

  groundY(x) {
    const W = this.g.world;
    const c = clamp(Math.floor(x / TILE), 3, 76);
    for (let r = S - 8; r <= S + 1; r++) if (W.get(c, r) !== T.AIR) return r * TILE;
    return S * TILE;
  }

  snapCam() {
    const c = this.camTarget();
    this.g.cam.x = c.x; this.g.cam.y = c.y;
  }

  camTarget() {
    const g = this.g;
    if (this.follow) {
      const as = this.follow.map((id) => this.actors[id]);
      const mx = as.reduce((s, a) => s + a.x, 0) / as.length;
      const my = as.reduce((s, a) => s + a.y, 0) / as.length;
      return { x: mx - this.viewW() / 2, y: my - this.viewH() * 0.6 };
    }
    if (this.fixed) return { x: this.fixed.x - this.viewW() / 2, y: this.fixed.y - this.viewH() * 0.5 };
    return { x: g.cam.x, y: g.cam.y };
  }

  /** mueve la cámara del juego (la llama Game.updateCamera durante la intro) */
  updateCam(dt) {
    const c = this.g.cam, g = this.g;
    // el zoom va despacio hacia su objetivo y se queda clavado al llegar
    const dz = this.zoomT - g.zoom;
    g.zoom = Math.abs(dz) < 0.004 ? this.zoomT : g.zoom + dz * Math.min(1, dt * 2.4);
    if (this.tween) {
      const tw = this.tween, u = ease(clamp(tw.t / tw.dur, 0, 1));
      c.x = tw.x0 + (tw.x1 - tw.x0) * u;
      c.y = tw.y0 + (tw.y1 - tw.y0) * u;
      return;
    }
    const tg = this.camTarget();
    const k = Math.min(1, dt * 2.6);
    c.x += (tg.x - c.x) * k;
    c.y += (tg.y - c.y) * k;
  }

  // ------------------------------------------------------------
  //  Dibujo
  // ------------------------------------------------------------
  draw(ctx, camX, camY) {
    if (this.done) return;
    for (const f of this.feathers) drawFeather(ctx, Math.round(f.x - camX + (f.landed ? 0 : Math.sin(f.t * 5) * 3)), Math.round(f.y - camY), f.landed);
    for (const a of Object.values(this.actors)) {
      const frames = getCharFrames(a.id)[a.facing > 0 ? 'right' : 'left'];
      let frame = 'idle', bob = 0;
      if (a.target !== null) {
        frame = ['walkA', 'walkB', 'walkC', 'walkB'][Math.floor(a.walkT * 9) % 4];
        bob = frame === 'walkB' ? 1 : 0;
      } else {
        const tt = this.t + a.phase;
        frame = tt % 3.4 > 3.25 ? 'blink' : tt % 1.6 > 1.0 ? 'idleB' : 'idle';
        bob = frame === 'idleB' ? 1 : 0;
      }
      let sx = Math.round(a.x - CHAR_W / 2 - camX);
      const sy = Math.round(a.y - CHAR_H - camY);
      if (a.pose === 'search') {
        // agachado revolviendo debajo de la cama
        sx += Math.round(Math.sin(this.t * 30));
        ctx.drawImage(frames.idle, 0, 0, CHAR_W, 16, sx, sy + 4, CHAR_W, 16);
        ctx.drawImage(frames.idle, 0, 17, CHAR_W, 3, sx, sy + 17, CHAR_W, 3);
        drawArm(ctx, sx, sy + 4, a.facing, 0, a.id, 0.4 + Math.sin(this.t * 18) * 0.5);
      } else {
        ctx.drawImage(frames[frame], sx, sy);
        drawArm(ctx, sx, sy, a.facing, bob, a.id, a.target !== null ? 1.1 + Math.sin(a.walkT * 9 * Math.PI / 2) * 0.35 : 1.25);
      }
      const talking = this.line && this.line.who === a.id;
      if (a.emote) drawEmote(ctx, sx + CHAR_W / 2, sy - 3 - (a.emoteT < 0.15 ? 2 : 0), a.emote);
      else if (talking) {
        const by = sy - 4 + Math.round(Math.sin(this.t * 6));
        ctx.fillStyle = '#1d1420'; ctx.fillRect(sx + 6, by - 1, 5, 1); ctx.fillRect(sx + 7, by, 3, 1); ctx.fillRect(sx + 8, by + 1, 1, 1);
        ctx.fillStyle = '#fff4e0'; ctx.fillRect(sx + 7, by - 1, 3, 1); ctx.fillRect(sx + 8, by, 1, 1);
      }
    }
  }
}

function drawArm(ctx, sx, sy, facing, bob, id, ang) {
  const pal = CHAR_PAL[id];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const hx = 10 + Math.cos(ang) * 3, hy = 12 + bob + Math.sin(ang) * 3;
  pixelLine(ctx, mx(10), sy + 12 + bob, mx(hx), sy + Math.round(hy), pal.C);
  ctx.fillStyle = pal.s;
  ctx.fillRect(mx(hx), sy + Math.round(hy), 1, 1);
}

function drawEmote(ctx, cx, bottom, ch) {
  const x = Math.round(cx - 4), y = bottom - 10;
  ctx.fillStyle = '#1d1420';
  ctx.fillRect(x - 1, y - 1, 11, 10); ctx.fillRect(x + 3, y + 9, 3, 1); ctx.fillRect(x + 4, y + 10, 1, 1);
  ctx.fillStyle = '#fff4e0';
  ctx.fillRect(x, y, 9, 8); ctx.fillRect(x + 4, y + 8, 1, 1);
  if (ch === '♥') {
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(x + 2, y + 2, 2, 2); ctx.fillRect(x + 5, y + 2, 2, 2); ctx.fillRect(x + 2, y + 3, 5, 2); ctx.fillRect(x + 3, y + 5, 3, 1); ctx.fillRect(x + 4, y + 6, 1, 1);
  } else drawText(ctx, ch, x + 3, y + 1, ch === '!' ? '#ff4d6d' : '#3d5c9c');
}

function drawFeather(ctx, x, y, landed) {
  // plumita gris con la punta oscura
  const P = (a, b, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, 1, 1); };
  if (landed) {
    for (let i = 0; i < 5; i++) P(i, 0, i < 4 ? '#c9c0b0' : '#6b5a4e');
    P(1, -1, '#e9e3d6'); P(2, -1, '#e9e3d6'); P(5, 0, '#8a7a6a');
  } else {
    for (let i = 0; i < 5; i++) P(0, i, i < 4 ? '#c9c0b0' : '#6b5a4e');
    P(1, 1, '#e9e3d6'); P(1, 2, '#e9e3d6'); P(0, 5, '#8a7a6a');
  }
}
