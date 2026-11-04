// Escenas con diálogos (la intro, el encuentro con Aguilus y el final): actores, cámara con zoom,
// caja de diálogo y guión. El guión es una función generadora: cada `yield` espera a que termine lo anterior.
import { getCharFrames, CHAR_PAL, CHAR_W, CHAR_H, drawText, DOG, ICON_URL, charPortrait } from './sprites.js';
import { drawAguilus, aguilusPortrait, AG_H } from './aguilus.js';
import { clamp, pixelLine } from './util.js';

let carlosFace = null;
const SPEAKERS = {
  pablo: { name: 'Pablo', icon: () => ICON_URL.char_pablo },
  pancha: { name: 'Panchi', icon: () => ICON_URL.char_pancha },
  popi: { name: 'Popi', icon: () => DOG.happyA.toDataURL() },
  carlos: { name: 'Carlos', icon: () => carlosFace || (carlosFace = charPortrait('carlos', 1).toDataURL()) },
  aguilus: { name: 'Aguilus', icon: () => aguilusPortrait() },
};

const ease = (u) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);

export class Scene {
  /**
   * script(sc): generador con el guión.
   * onEnd(skipped): se llama al terminar; onSkip(): acomoda todo si se salta la escena.
   */
  constructor(game, script, { onEnd = null, onSkip = null } = {}) {
    this.g = game;
    this.ui = game.ui;
    this.t = 0;
    this.actors = {};
    this.follow = null;
    this.fixed = null;
    this.tween = null;
    this.zoomT = 1;
    this.line = null;
    this.noteOpen = false;
    this.feathers = [];
    this.done = false;
    this.onEnd = onEnd;
    this.onSkip = onSkip;
    this.onKey = (e) => {
      if (['Space', 'Enter', 'KeyE', 'NumpadEnter'].includes(e.code)) this.advance();
      if (e.code === 'Escape') this.skip();
    };
    window.addEventListener('keydown', this.onKey);
    this.co = script(this);
    this.waitFn = null;
    this.step();
  }

  // ------------------------------------------------------------
  //  Pasos del guión
  // ------------------------------------------------------------
  /** agrega un actor con los pies en (x, y) */
  actor(id, x, y, opts = {}) {
    const a = { id, x, y, facing: -1, target: null, ty: null, fallTo: null, vy: 0, speed: 30, vspeed: 60, pose: 'idle', flying: false, walkT: 0, emote: null, emoteT: 0, phase: Math.random() * 3, hidden: false, lockFacing: false, ...opts };
    this.actors[id] = a;
    return a;
  }

  /** zoom de la cámara; en reposo queda en una escala entera para que los pixeles salgan parejos */
  setZoom(z, snap = false) {
    const S = this.g.scale || 1;
    this.zoomT = Math.max(1, Math.round(S * z)) / S;
    if (snap) this.g.zoom = this.zoomT;
  }

  viewW() { return this.g.vw / this.g.zoom; }
  viewH() { return this.g.vh / this.g.zoom; }

  wait(s) { const end = this.t + s; return () => this.t >= end; }

  walk(id, x, speed) { const a = this.actors[id]; a.target = x; if (speed) a.speed = speed; }

  /** vuela (con el jetpack o con alas) hasta (x, y) */
  fly(id, x, y, speed = 90) {
    const a = this.actors[id];
    a.target = x; a.ty = y; a.speed = speed; a.vspeed = speed; a.flying = true;
  }

  /** cae con gravedad hasta el piso `y` */
  drop(id, y) { const a = this.actors[id]; a.fallTo = y; a.vy = 0; }

  arrive(...ids) {
    return () => ids.every((id) => { const a = this.actors[id]; return a.target === null && a.ty === null && a.fallTo === null; });
  }

  emote(id, ch) { const a = this.actors[id]; a.emote = ch; a.emoteT = 0; }

  caption(text) { this.ui.introCaption(text); }

  say(who, text) {
    this.line = { who, text, shown: 0, t: 0, hold: 1.8 + text.length * 0.045 };
    const sp = SPEAKERS[who];
    this.ui.introSay(sp.name, sp.icon(), '');
    return () => this.line === null;
  }

  note(text) {
    this.noteOpen = true;
    this.ui.introSay(null);
    this.ui.introNote(text, () => { this.noteOpen = false; this.g.audio.play('paper'); });
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
    if (r.done) { this.finish(); return; }
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
    if (this.onSkip) this.onSkip(this);
    this.finish(true);
  }

  finish(skipped = false) {
    if (this.done) return;
    this.done = true;
    window.removeEventListener('keydown', this.onKey);
    this.ui.introSay(null);
    this.ui.introCaption(null);
    this.ui.introNote(null);
    this.ui.fade(false);
    this.g.zoom = 1;
    if (this.onEnd) this.onEnd(skipped, this);
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
        if (!a.lockFacing && (!a.flying || Math.abs(d) > 1)) a.facing = dir || a.facing;
        a.x += dir * Math.min(Math.abs(d), a.speed * dt);
        a.walkT += dt;
        if (Math.abs(a.target - a.x) < 0.01) { a.x = a.target; a.target = null; }
      }
      if (a.ty !== null) {
        const d = a.ty - a.y;
        a.y += Math.sign(d) * Math.min(Math.abs(d), a.vspeed * dt);
        if (Math.abs(a.ty - a.y) < 0.01) { a.y = a.ty; a.ty = null; }
      }
      if (a.fallTo !== null) {
        a.vy = Math.min(a.vy + 640 * dt, 430);
        a.y += a.vy * dt;
        if (a.y >= a.fallTo) {
          a.y = a.fallTo; a.fallTo = null; a.vy = 0;
          this.g.audio.play('land');
          for (let i = 0; i < 5; i++) this.g.particles.add({ x: a.x + (Math.random() - 0.5) * 8, y: a.y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 20, life: 0.4, max: 0.4, color: 'rgba(210,190,160,0.8)', size: 1, grav: 60 });
        }
      }
      if (a.flying && a.id !== 'aguilus' && (a.target !== null || a.ty !== null) && Math.random() < 0.5) {
        // humito del jetpack
        this.g.particles.add({ x: a.x - a.facing * 5, y: a.y - 4, vx: (Math.random() - 0.5) * 10, vy: 30 + Math.random() * 20, life: 0.4, max: 0.4, color: 'rgba(230,220,210,0.6)', size: 2, grav: -10, smoke: true });
      }
      if (a.emote) { a.emoteT += dt; if (a.emoteT > 2.2) a.emote = null; }
    }
    for (const f of this.feathers) {
      f.t += dt;
      if (f.landed) continue;
      f.y += f.vy * dt;
      if (f.y >= f.floor - 2) { f.y = f.floor - 2; f.landed = true; }
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

  snapCam() {
    this.g.zoom = this.zoomT;
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
    // el punto fijo queda un poco arriba del centro: abajo va la caja de diálogo
    if (this.fixed) return { x: this.fixed.x - this.viewW() / 2, y: this.fixed.y - this.viewH() * 0.38 };
    return { x: g.cam.x, y: g.cam.y };
  }

  /** mueve la cámara del juego (la llama Game.updateCamera durante las escenas) */
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
    const k = Math.min(1, dt * (this.camSpeed || 2.6));
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
      if (a.hidden) continue;
      let sx, sy, headY;
      if (a.id === 'aguilus') {
        drawAguilus(ctx, a.x - camX, a.y - camY, a.facing, a.pose, this.t + a.phase);
        sx = Math.round(a.x - CHAR_W / 2 - camX);
        sy = Math.round(a.y - AG_H - camY) + (a.pose === 'weak' ? 6 : 0);
        headY = sy;
      } else {
        const frames = getCharFrames(a.id)[a.facing > 0 ? 'right' : 'left'];
        let frame = 'idle', bob = 0;
        const moving = a.target !== null || a.ty !== null;
        if (a.flying || a.fallTo !== null) frame = 'air';
        else if (moving) {
          frame = ['walkA', 'walkB', 'walkC', 'walkB'][Math.floor(a.walkT * 9) % 4];
          bob = frame === 'walkB' ? 1 : 0;
        } else {
          const tt = this.t + a.phase;
          frame = tt % 3.4 > 3.25 ? 'blink' : tt % 1.6 > 1.0 ? 'idleB' : 'idle';
          bob = frame === 'idleB' ? 1 : 0;
        }
        sx = Math.round(a.x - CHAR_W / 2 - camX);
        sy = Math.round(a.y - CHAR_H - camY);
        headY = sy;
        if (a.flying && moving) {
          const nx = a.facing > 0 ? sx + 1 : sx + CHAR_W - 3, len = 3 + Math.floor(Math.random() * 3);
          ctx.fillStyle = '#ff8a3d'; ctx.fillRect(nx, sy + 16, 2, len);
          ctx.fillStyle = '#ffd34d'; ctx.fillRect(nx, sy + 16, 2, len - 2);
        }
        if (a.pose === 'search') {
          // agachado revolviendo debajo de la cama
          sx += Math.round(Math.sin(this.t * 30));
          ctx.drawImage(frames.idle, 0, 0, CHAR_W, 16, sx, sy + 5, CHAR_W, 16);
          ctx.drawImage(frames.idle, 0, CHAR_H - 3, CHAR_W, 3, sx, sy + CHAR_H - 3, CHAR_W, 3);
          drawArm(ctx, sx, sy + 5, a.facing, 0, a.id, 0.4 + Math.sin(this.t * 18) * 0.5);
        } else {
          ctx.drawImage(frames[frame], sx, sy);
          const ang = a.pose === 'hug' ? 0.1 : a.flying ? -0.6 : moving ? 1.1 + Math.sin(a.walkT * 9 * Math.PI / 2) * 0.35 : 1.25;
          drawArm(ctx, sx, sy, a.facing, bob, a.id, ang);
        }
      }
      const talking = this.line && this.line.who === a.id;
      if (a.emote) drawEmote(ctx, sx + CHAR_W / 2, headY - 3 - (a.emoteT < 0.15 ? 2 : 0), a.emote);
      else if (talking) {
        const by = headY - 4 + Math.round(Math.sin(this.t * 6));
        ctx.fillStyle = '#1d1420'; ctx.fillRect(sx + 6, by - 1, 5, 1); ctx.fillRect(sx + 7, by, 3, 1); ctx.fillRect(sx + 8, by + 1, 1, 1);
        ctx.fillStyle = '#fff4e0'; ctx.fillRect(sx + 7, by - 1, 3, 1); ctx.fillRect(sx + 8, by, 1, 1);
      }
    }
  }
}

function drawArm(ctx, sx, sy, facing, bob, id, ang) {
  const pal = CHAR_PAL[id];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const hx = 10 + Math.cos(ang) * 3, hy = 11 + bob + Math.sin(ang) * 3;
  pixelLine(ctx, mx(10), sy + 11 + bob, mx(hx), sy + Math.round(hy), pal.C);
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
  } else if (ch === '~') {
    // gotitas de sudor (jadeando)
    ctx.fillStyle = '#7fd0ff';
    ctx.fillRect(x + 2, y + 2, 1, 2); ctx.fillRect(x + 5, y + 3, 1, 2); ctx.fillRect(x + 4, y + 5, 2, 1);
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
