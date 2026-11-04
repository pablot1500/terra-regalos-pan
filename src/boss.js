// Aguilus en el fondo del núcleo: espera junto al último cofre, charla con los chicos,
// pelea tirando rocas de magma (que se atajan con el taladro y se le devuelven con E)
// y al final... se van todos juntos para arriba.
import { TILE, SURFACE, BOSS, HP_MAX, ENDING_TEXT, CHARACTERS } from './config.js';
import { CORE_PLATFORM } from './world.js';
import { drawAguilus, AG_H } from './aguilus.js';
import { getCharFrames, CHAR_W, CHAR_H } from './sprites.js';
import { DIG_ZONE, TRAILER_X, TRAILER_H } from './structures.js';
import { clamp, fmtMoney, makeCanvas } from './util.js';

const FLOOR_Y = CORE_PLATFORM.r * TILE;
const ARENA = { x0: (CORE_PLATFORM.c0 + 2) * TILE, x1: (CORE_PLATFORM.c1 - 1) * TILE };
const SKY_Y = FLOOR_Y - 80;         // altura a la que vuela durante la pelea
const ROCK_G = 210, THROW_G = 120;

// roca de magma (7x7) con borde oscuro y centro brillante
const ROCK = (() => {
  const [c, x] = makeCanvas(7, 7);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  P(2, 0, 3, 7, '#3a1410'); P(0, 2, 7, 3, '#3a1410'); P(1, 1, 5, 5, '#3a1410');
  P(2, 1, 3, 5, '#c0391b'); P(1, 2, 5, 3, '#c0391b');
  P(2, 2, 3, 3, '#ff8a2e'); P(3, 2, 1, 2, '#ffd34d'); P(2, 2, 1, 1, '#fff0a0');
  return c;
})();

export class Boss {
  constructor(game, done) {
    this.g = game;
    this.state = done ? 'done' : 'waiting'; // waiting → scene → fight → scene → done
    this.hp = BOSS.hp;
    const ch = game.world.chests.find((c) => c.core);
    this.homeX = ch ? ch.c * TILE - 20 : ARENA.x1 - 40;
    this.x = this.homeX; this.y = FLOOR_Y; this.facing = -1;
    this.tx = this.x;
    this.rocks = [];
    this.marks = [];
    this.t = 0; this.castT = 2.5; this.casting = 0; this.flash = 0; this.phase2 = false;
    this.partner = null;
    this.cheerT = 6;
    this.ceilY = FLOOR_Y - BOSS.ceiling;
    this.floorY = FLOOR_Y;
  }

  get fighting() { return this.state === 'fight'; }

  // ------------------------------------------------------------
  //  Fases
  // ------------------------------------------------------------
  update(dt, p) {
    this.t += dt;
    if (this.state === 'waiting') {
      // cuando el jugador pisa la plataforma del núcleo, arranca el encuentro
      if (p.onGround && !p.dead && Math.abs(p.y + p.h - FLOOR_Y) < 3 && p.cx > ARENA.x0 - 16 && p.cx < ARENA.x1 + 16) this.startEncounter(p);
      return;
    }
    if (this.state === 'fight') this.updateFight(dt, p);
  }

  startEncounter(p) {
    this.state = 'scene';
    this.mateId = p.char === 'pablo' ? 'pancha' : 'pablo';
    p.vx = 0; p.digging = false; p.hovering = false;
    this.g.startScene((sc) => encounterScript(sc, this, p), {
      onSkip: (sc) => {
        Object.assign(sc.actors.aguilus, { y: SKY_Y, ty: null, target: null, pose: 'fly' });
        Object.assign(sc.actors[this.mateId], { y: FLOOR_Y, fallTo: null });
      },
      onEnd: (skipped, sc) => this.startFight(sc, p),
    });
  }

  startFight(sc, p) {
    const A = sc.actors;
    const me = A[p.char], mate = A[this.mateId], ag = A.aguilus;
    p.x = me.x - p.w / 2; p.y = FLOOR_Y - p.h; p.vx = 0; p.vy = 0; p.peakY = p.y;
    p.facing = me.facing; p.heldRock = null; p.jetFuel = BOSS.jetTime;
    this.partner = { id: this.mateId, x: mate.x, facing: mate.facing };
    this.x = ag.x; this.y = SKY_Y; this.tx = this.x;
    this.state = 'fight';
    this.castT = 1.8; this.casting = 0;
    this.g.ui.setBossBar(this.hp / BOSS.hp);
    this.g.toast(this.g.ui.isTouch ? 'Mantené CAVAR apuntando a las rocas para atajarlas y tocá LANZAR' : 'Mantené el taladro apuntando a las rocas para atajarlas y tirálas con E', null, 'good');
  }

  defeat(p) {
    this.state = 'scene';
    this.rocks = []; this.marks = [];
    p.heldRock = null;
    this.g.ui.setBossBar(null);
    this.g.startScene((sc) => victoryScript(sc, this, p), {
      onEnd: (skipped, sc) => this.finish(p, sc, skipped),
    });
  }

  finish(p, sc, skipped) {
    const g = this.g;
    this.state = 'done';
    const me = sc.actors[p.char];
    const x = skipped || !me ? shaftX(g) - 9 : me.x;
    p.x = x - p.w / 2; p.y = SURFACE * TILE - p.h; p.vx = 0; p.vy = 0; p.peakY = p.y;
    p.facing = 1; p.heldRock = null; p.hp = HP_MAX;
    g.save();
    const mins = Math.floor(g.counters.playTime / 60);
    g.state = 'paused';
    g.ui.showMsg('¡Fin! ♥', `${ENDING_TEXT}\n\nTiempo: ${mins} min · Bloques cavados: ${Math.round(g.counters.tiles)}\nPlata juntada: ${fmtMoney(g.counters.earned)}`, [
      { label: 'Seguir jugando', onClick: () => { g.state = 'play'; } },
    ]);
  }

  /** el jugador cayó K.O. durante la pelea: se levanta en la plataforma y sigue */
  playerDown(p) {
    const g = this.g;
    g.state = 'faint';
    p.dead = true;
    p.heldRock = null;
    g.audio.jet(false);
    g.audio.play('faint');
    for (const r of this.rocks) r.dead = true;
    this.marks = [];
    setTimeout(() => g.ui.fade(true), 400);
    setTimeout(() => {
      g.ui.showMsg('¡K.O.!', 'Una roca de magma te dejó viendo estrellitas.\n¡Pero Aguilus todavía no ganó!', [{
        label: '¡Revancha!',
        onClick: () => {
          p.dead = false; p.hp = HP_MAX; p.hurtT = 1.5;
          p.x = clamp(this.partner.x + 16, ARENA.x0, ARENA.x1) - p.w / 2; p.y = FLOOR_Y - p.h; p.vx = 0; p.vy = 0; p.peakY = p.y;
          this.casting = 0; this.castT = 2.5;
          g.ui.fade(false);
          g.state = 'play';
        },
      }]);
    }, 1300);
  }

  // ------------------------------------------------------------
  //  Pelea
  // ------------------------------------------------------------
  orb() {
    return { x: this.x + this.facing * 5.5, y: this.y - AG_H - 3 };
  }

  updateFight(dt, p) {
    const g = this.g;
    this.flash = Math.max(0, this.flash - dt);
    // va y viene volando por arriba de la plataforma
    if (Math.abs(this.tx - this.x) < 4) this.tx = ARENA.x0 + 30 + Math.random() * (ARENA.x1 - ARENA.x0 - 60);
    const spd = this.phase2 ? 85 : 58;
    const step = clamp(this.tx - this.x, -spd * dt, spd * dt);
    this.x += step;
    this.vx = step / dt;
    this.y = SKY_Y + Math.sin(this.t * 1.7) * 10;
    this.facing = p.cx > this.x ? 1 : -1;
    // hechizos: levanta el báculo, junta poder y hace llover rocas de magma
    if (this.casting > 0) {
      this.casting -= dt;
      const o = this.orb();
      if (Math.random() < 0.7) g.particles.add({ x: o.x + (Math.random() - 0.5) * 16, y: o.y + (Math.random() - 0.5) * 16, vx: 0, vy: 0, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#c98cff' : '#ffb347', star: true, grav: 0 });
      if (this.casting <= 0) this.spawnRocks(p);
    } else {
      this.castT -= dt;
      if (this.castT <= 0) {
        this.casting = 0.75;
        this.castT = this.phase2 ? 1.5 : 2.2;
        g.audio.play('charge');
      }
    }
    // la pareja da ánimo de vez en cuando
    this.cheerT -= dt;
    if (this.cheerT <= 0 && this.partner) {
      this.cheerT = 7 + Math.random() * 5;
      const lines = ['¡VAMOS!', '¡ATAJALA!', '¡TIRÁSELA!', '¡DALE QUE PODÉS!', '¡CUIDADO!'];
      g.addText(this.partner.x, FLOOR_Y - CHAR_H - 6, lines[Math.floor(Math.random() * lines.length)], '#fff4e0');
    }
    for (const m of this.marks) m.t -= dt;
    this.marks = this.marks.filter((m) => m.t > 0);

    const tip = p.digging && p.aim && !p.dead ? { x: p.cx + p.aim.x * 9, y: p.cy - 1 + p.aim.y * 9 } : null;
    for (const r of this.rocks) {
      if (r.dead) continue;
      r.t += dt;
      if (r.state === 'held') {
        const h = tip || { x: p.cx + p.facing * 7, y: p.cy - 3 };
        r.x = h.x; r.y = h.y;
        continue;
      }
      r.vy += (r.state === 'thrown' ? THROW_G : ROCK_G) * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      if (Math.random() < 0.5) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 8, vy: -6, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#ff8a2e' : 'rgba(90,60,60,0.6)', size: 1, grav: -10 });
      if (r.state === 'fall' && !p.dead) {
        // atajarla con el taladro
        if (tip && Math.hypot(r.x - tip.x, r.y - tip.y) < BOSS.catchR) {
          if (!p.heldRock) {
            r.state = 'held'; p.heldRock = r;
            g.audio.play('clink');
            for (let i = 0; i < 6; i++) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 40, life: 0.4, max: 0.4, color: '#ffd34d', star: true, grav: 80 });
            g.tip('catch', g.ui.isTouch ? '¡La atajaste! Tocá LANZAR para devolvérsela' : '¡La atajaste! Apretá E para devolvérsela (apunta al mouse o a Aguilus)');
          } else this.shatter(r);
          continue;
        }
        // si no, te pega
        if (r.x > p.x - 3 && r.x < p.x + p.w + 3 && r.y > p.y - 3 && r.y < p.y + p.h + 3) {
          p.hurt(BOSS.rockDmg, 'rock');
          this.shatter(r);
          continue;
        }
      }
      if (r.state === 'thrown' && Math.hypot(r.x - this.x, r.y - (this.y - AG_H / 2)) < 15) {
        this.shatter(r);
        this.hit(p);
        continue;
      }
      if (g.world.solidPx(r.x, r.y + 2) || r.y > FLOOR_Y + 30 || r.y < this.ceilY - 160 || r.x < ARENA.x0 - 60 || r.x > ARENA.x1 + 60) this.shatter(r);
    }
    this.rocks = this.rocks.filter((r) => !r.dead);
  }

  spawnRocks(p) {
    const g = this.g, o = this.orb();
    const n = (this.phase2 ? 3 : 2) + (Math.random() < 0.35 ? 1 : 0);
    g.audio.play('magma');
    for (let i = 0; i < n; i++) {
      const tx = clamp(p.cx + (i - (n - 1) / 2) * 28 + (Math.random() - 0.5) * 18, ARENA.x0, ARENA.x1);
      const T = (this.phase2 ? 1.05 : 1.3) + Math.random() * 0.35;
      const ty = FLOOR_Y - 4;
      this.rocks.push({ x: o.x, y: o.y, vx: (tx - o.x) / T, vy: (ty - o.y - 0.5 * ROCK_G * T * T) / T, state: 'fall', t: 0, dead: false });
      this.marks.push({ x: tx, t: T });
    }
  }

  shatter(r) {
    const g = this.g;
    r.dead = true;
    g.audio.play('break');
    for (let i = 0; i < 8; i++) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#ff8a2e' : '#ffd34d', size: 1, grav: 200 });
  }

  /** E: devuelve la roca. Apunta al mouse (o hacia donde apunta el taladro) y, si va más o menos hacia Aguilus, la corrige un poquito */
  throwRock(p, inp) {
    const g = this.g, r = p.heldRock;
    if (!r) return;
    // hacia dónde va a estar Aguilus cuando llegue la roca
    const d0 = Math.hypot(this.x - r.x, this.y - AG_H / 2 - r.y);
    const lead = (this.vx || 0) * d0 / BOSS.throwSpeed;
    const ax = this.x + lead - r.x, ay = this.y - AG_H / 2 - r.y, ad = Math.hypot(ax, ay) || 1;
    let dx, dy;
    if (!g.ui.isTouch && g.input.mouseSeen) { dx = inp.mx - r.x; dy = inp.my - r.y; }
    else if (p.aim) { dx = p.aim.x; dy = p.aim.y; }
    else { dx = ax; dy = ay; }
    let d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    if (dx * ax / ad + dy * ay / ad > 0.88) { dx = ax / ad; dy = ay / ad; }
    // un poco más de fuerza hacia arriba para compensar la gravedad
    const v = BOSS.throwSpeed;
    r.state = 'thrown'; r.vx = dx * v; r.vy = dy * v - ad * 0.2;
    p.heldRock = null;
    g.audio.play('throw');
  }

  hit(p) {
    const g = this.g;
    this.hp--;
    this.flash = 0.3;
    g.audio.play('bossHit');
    g.shake(2.5);
    g.addText(this.x, this.y - AG_H - 6, '¡AUCH!', '#ffd34d');
    for (let i = 0; i < 6; i++) g.particles.add({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 20, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, color: '#c9c0b0', size: 1, grav: 40 });
    g.ui.setBossBar(Math.max(0, this.hp) / BOSS.hp);
    if (!this.phase2 && this.hp <= BOSS.hp / 2) {
      this.phase2 = true;
      setTimeout(() => g.addText(this.x, this.y - AG_H - 14, '¡GRRR! ¡AHORA VAN A VER!', '#ff9ccc'), 500);
    }
    if (this.hp <= 0) this.defeat(p);
  }

  // ------------------------------------------------------------
  //  Dibujo
  // ------------------------------------------------------------
  draw(ctx, camX, camY) {
    if (this.state === 'waiting') {
      drawAguilus(ctx, this.x - camX, this.y - camY, -1, 'idle', this.t);
      return;
    }
    if (this.state !== 'fight') return;
    const t = this.t;
    if (this.partner) {
      const P = this.partner;
      const f = getCharFrames(P.id)[this.x > P.x ? 'right' : 'left'];
      const hop = Math.max(0, Math.sin(t * 5)) > 0.97 ? 2 : 0; // saltitos de aliento
      ctx.drawImage(t % 1.6 > 1 ? f.idleB : f.idle, Math.round(P.x - CHAR_W / 2 - camX), Math.round(FLOOR_Y - CHAR_H - camY - hop));
    }
    // aviso en el piso de dónde va a caer cada roca
    for (const m of this.marks) {
      if (Math.floor(m.t * 8) % 2) continue;
      ctx.fillStyle = 'rgba(255,90,60,0.8)';
      const x = Math.round(m.x - camX), y = Math.round(FLOOR_Y - 1 - camY);
      ctx.fillRect(x - 4, y, 9, 1); ctx.fillRect(x - 2, y - 1, 5, 1);
    }
    drawAguilus(ctx, this.x - camX, this.y - camY, this.facing, this.casting > 0 ? 'cast' : 'fly', t, this.flash > 0 && Math.floor(t * 30) % 2 === 0);
    for (const r of this.rocks) ctx.drawImage(ROCK, Math.round(r.x - 3.5 - camX), Math.round(r.y - 3.5 - camY));
  }
}

/** columna del pozo en el cantero por donde salen volando al final */
function shaftX(g) {
  for (let c = DIG_ZONE.c0; c <= DIG_ZONE.c1; c++) {
    const x = c * TILE + 4;
    if (!g.world.solidPx(x, SURFACE * TILE + 12) && !g.world.solidPx(x, SURFACE * TILE + 4)) return x;
  }
  return 46 * TILE;
}

// ------------------------------------------------------------
//  Guiones
// ------------------------------------------------------------
function* encounterScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId;
  const meX = clamp(p.cx, ARENA.x0, ARENA.x1);
  const towards = B.homeX > meX ? 1 : -1;
  const mateX = clamp(meX - towards * 18, ARENA.x0, ARENA.x1);
  sc.actor(me, meX, FLOOR_Y, { facing: towards });
  sc.actor(mate, mateX, FLOOR_Y - 220, { facing: towards });
  sc.actor('aguilus', B.homeX, FLOOR_Y, { facing: -towards, phase: 0 });
  sc.fixed = { x: meX, y: FLOOR_Y - 14 };
  sc.setZoom(2);
  sc.snapCam();
  sc.drop(mate, FLOOR_Y);
  yield sc.say(mate, '¡Esperame! ¡Uf, qué caída!');
  yield sc.arrive(mate);
  // aparece Aguilus junto al cofre
  const mid = (meX + B.homeX) / 2;
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(Math.abs(B.homeX - meX) > 170 ? 1 : 1.5);
  g.audio.play('surprise');
  sc.emote(me, '!'); sc.emote(mate, '!');
  yield sc.say('aguilus', '¡Vaya, vaya! Así que llegaron hasta el centro de la Tierra...');
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  yield sc.say('pancha', '¡¿Aguilus?! ¡Sabía que eras vos! ¡La pluma te delató!');
  yield sc.say('aguilus', 'Esta vez no voy a dejar que se los lleven. ¡Este año sí te arruino el cumple, Pancha!');
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say('pablo', '¡Devolvé esos regalos, pajarraco!');
  yield sc.say('aguilus', '¡Jamás! ¡Prepárense para la lluvia de magma!');
  // se eleva
  sc.actors.aguilus.pose = 'fly';
  sc.fly('aguilus', B.homeX, SKY_Y, 45);
  g.audio.play('charge');
  g.shake(3);
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1);
  yield sc.arrive('aguilus');
  const name = CHARACTERS[me].name;
  yield sc.say(mate, `¡${name}! Si mantenés el taladro apuntando a las rocas, se le quedan pegadas.`);
  yield sc.say(me, g.ui.isTouch ? '¡Y con el botón LANZAR se las devuelvo!' : '¡Y con la E se las tiro de vuelta!');
  yield sc.say(mate, '¡Ojo, que acá abajo el jetpack casi no tiene fuerza! No hay forma de escaparse volando.');
}

function* victoryScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId, A = sc.actors;
  const gx = clamp(B.x, ARENA.x0 + 50, ARENA.x1 - 30);
  const ag = sc.actor('aguilus', gx, B.y, { pose: 'hurt', facing: -1, phase: 0 }); // primero: queda detrás en el abrazo
  sc.actor(me, clamp(p.cx, ARENA.x0, ARENA.x1), FLOOR_Y, { facing: gx > p.cx ? 1 : -1 });
  sc.actor(mate, B.partner ? B.partner.x : p.cx - 16, FLOOR_Y, { facing: gx > (B.partner ? B.partner.x : p.cx) ? 1 : -1 });
  sc.fixed = { x: gx, y: FLOOR_Y - 26 };
  sc.setZoom(1.5);
  sc.snapCam();
  g.shake(4);
  yield sc.wait(0.6);
  sc.drop('aguilus', FLOOR_Y);
  yield sc.arrive('aguilus');
  ag.pose = 'weak';
  g.shake(3);
  sc.walk(me, gx - 22, 50); sc.walk(mate, gx - 38, 50);
  sc.fixed = { x: gx - 18, y: FLOOR_Y - 14 };
  sc.setZoom(2.2);
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  yield sc.say('aguilus', '¡Está bien, está bien! ¡Me rindo! ¡Auch, mis plumitas!');
  yield sc.say('pancha', '¿Otra vez vos, Aguilus? ¡Todos los años lo mismo!');
  yield sc.say('pablo', 'Ya nos tenés hartos con tus escondites.');
  yield sc.say('aguilus', 'Es que... nadie me invita a los cumples... y los regalos brillan tanto...');
  yield sc.say('pancha', 'Bueno. Nos llevamos mis regalos. Chau, Aguilus.');
  // hacen como que se van
  sc.walk(me, gx - 70, 34); sc.walk(mate, gx - 86, 34);
  sc.fixed = { x: gx - 40, y: FLOOR_Y - 14 };
  sc.setZoom(1.5);
  yield sc.wait(1.3);
  ag.pose = 'idle';
  sc.emote('aguilus', '!');
  yield sc.say('aguilus', '¡Esperen! ¿Me van a dejar acá abajo? ¡Esto es un horno!');
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  yield sc.say('pablo', '...');
  yield sc.say('pancha', 'Ay, bueno. Vení, dale.');
  // abrazo de a tres
  sc.walk(me, gx - 9, 45); sc.walk(mate, gx + 9, 60);
  sc.fixed = { x: gx, y: FLOOR_Y - 14 };
  sc.setZoom(2.2);
  yield sc.arrive(me, mate);
  A[mate].facing = -1; A[me].facing = 1;
  A[me].pose = 'hug'; A[mate].pose = 'hug';
  sc.emote(me, '♥'); sc.emote(mate, '♥'); sc.emote('aguilus', '♥');
  yield sc.say('aguilus', '¡Snif! Ustedes sí que son buenos...');
  // ¡arriba!
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, FLOOR_Y - 420, 170);
  ag.pose = 'fly';
  sc.follow = [me, 'aguilus', mate];
  sc.camSpeed = 7;
  sc.setZoom(1.5);
  g.audio.jet(true);
  yield sc.wait(1.6);
  sc.ui.fade(true, true);
  yield sc.wait(0.8);
  g.audio.jet(false);

  // ---- arriba, en el patio ----
  const sx = shaftX(g), GY = SURFACE * TILE;
  Object.assign(A[me], { x: sx - 10, y: GY + 70, target: null, ty: null, pose: 'hug', facing: 1 });
  Object.assign(A.aguilus, { x: sx, y: GY + 72, target: null, ty: null, pose: 'fly', facing: -1 });
  Object.assign(A[mate], { x: sx + 10, y: GY + 70, target: null, ty: null, pose: 'hug', facing: -1 });
  sc.follow = null; sc.camSpeed = 2.6;
  sc.fixed = { x: sx, y: GY - 12 };
  sc.setZoom(2);
  sc.snapCam();
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, GY - 46, 150);
  g.audio.jet(true);
  sc.ui.fade(false);
  yield sc.arrive(me, mate, 'aguilus');
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, GY, 50);
  yield sc.arrive(me, mate, 'aguilus');
  g.audio.jet(false);
  for (const id of [me, mate]) { A[id].flying = false; A[id].pose = 'idle'; }
  A.aguilus.flying = false;
  // Aguilus se suelta, jadea y se recompone
  A.aguilus.pose = 'idle';
  sc.walk('aguilus', sx + 34, 40);
  sc.walk(mate, sx + 6, 40);
  yield sc.arrive('aguilus');
  A.aguilus.facing = -1;
  A.aguilus.pose = 'weak';
  sc.emote('aguilus', '~');
  yield sc.say('aguilus', 'Uf... uf... ¡Pensé que me dejaban ahí abajo!');
  A.aguilus.pose = 'idle';
  yield sc.wait(0.5);
  yield sc.say('aguilus', 'Ejem. Digo... ¡Esto no termina acá! ¡Hasta el año que viene, cumpleañera!');
  A.aguilus.pose = 'fly';
  A.aguilus.facing = 1;
  sc.fly('aguilus', sx + 300, GY - 280, 130);
  g.audio.play('jump');
  yield sc.wait(1.8);
  A.aguilus.hidden = true;
  A[me].facing = 1; A[mate].facing = -1;
  yield sc.say('pablo', '¿"Hasta el año que viene"?');
  yield sc.say('pancha', 'Ya sé dónde vamos a esconder los regalos el año que viene...');
  yield sc.say('pablo', '¿Dónde?');
  yield sc.say('pancha', '¡En la casa rodante de Carlos!');
  sc.fixed = { x: TRAILER_X + 32, y: GY - TRAILER_H + 30 };
  sc.setZoom(2.4);
  yield sc.wait(0.6);
  yield sc.say('carlos', '¡Ni se les ocurra!');
  sc.fixed = { x: sx, y: GY - 12 };
  sc.setZoom(2.2);
  yield sc.wait(0.5);
  sc.emote('pancha', '♥'); sc.emote('pablo', '♥');
  yield sc.say('pancha', '¡Feliz cumple a mí!');
  yield sc.wait(0.8);
}
