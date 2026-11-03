import { TILE, WORLD_W, EDGE, PHYS, DIG, CRYSTAL_DIG, BRUSH_R, HP_MAX, REST, HOVER, LAVA } from './config.js';
import { DEF, T, isDiggable, hardness } from './tiles.js';
import { getCharFrames, drawArmShovel, drawDrill, CHAR_W, CHAR_H } from './sprites.js';
import { HOME_ZONE, SHOP_ZONE, SPAWN, inZone } from './structures.js';
import { depthAtY, SUB } from './world.js';
import { clamp } from './util.js';

const STRIKE_AT = 0.62; // momento del golpe dentro del ciclo de animación

// efectos al romper cada material: nubecitas de polvo y chispas/brillitos
const MAT_FX = {
  1: { dust: ['rgba(176,132,88,0.75)', 'rgba(206,168,124,0.7)'], maxPuffs: 9 },                         // tierra
  2: { dust: ['rgba(198,118,76,0.72)', 'rgba(222,160,112,0.66)'], maxPuffs: 9 },                         // arcilla
  3: { dust: ['rgba(150,150,165,0.45)', 'rgba(185,185,200,0.4)'], maxPuffs: 5, spark: ['#ffffff', '#ffe58a'] }, // piedra
  4: { dust: ['rgba(170,140,155,0.45)', 'rgba(205,180,192,0.4)'], maxPuffs: 5, spark: ['#ffd6e6', '#ffffff'] }, // granito
  5: { dust: ['rgba(70,76,100,0.5)'], maxPuffs: 4, spark: ['#9fc3ff', '#d9e8ff', '#ffffff'] },          // basalto
  6: { dust: ['rgba(80,55,120,0.5)'], maxPuffs: 4, spark: ['#c9a6ff', '#ff9ccc', '#8fe9ff', '#ffffff'] }, // abismo
  11: { dust: ['rgba(230,120,180,0.4)'], maxPuffs: 3, spark: ['#ffd6ec', '#ff86c2', '#ffffff'] },      // cristal
  14: { dust: ['rgba(160,152,138,0.7)', 'rgba(196,188,172,0.6)'], maxPuffs: 8 },                       // grava
  15: { dust: ['rgba(30,24,40,0.6)', 'rgba(60,40,50,0.5)'], maxPuffs: 4, spark: ['#ff8a3d', '#ffd34d', '#ffffff'] }, // obsidiana
};

export class Player {
  constructor(game, charId) {
    this.game = game;
    this.char = charId;
    this.w = 6;
    this.h = 15;
    this.hp = HP_MAX;
    this.energy = game.stats.energyMax;
    this.spawn();
  }

  spawn() {
    this.x = SPAWN.x;
    this.y = SPAWN.y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.peakY = this.y;
    this.flying = false;
    this.jumpT = 1;
    this.digging = false;
    this.aim = null;          // vector de cavado {x, y}
    this.digPoint = null;     // centro del círculo que se está cavando
    this.digKey = null;
    this.digProg = 0;
    this.digAnim = 0;
    this.tooHard = false;
    this.walkT = 0;
    this.anim = 0;
    this.hurtT = 0;
    this.exhaustT = 0;
    this.resting = false;
    this.inShop = false;
    this.dead = false;
    this.restFx = 0;
    this.jetFx = 0;
    this.hovering = false;    // modo vuelo del jetpack (últimos niveles)
    this.burnT = 0;           // para mostrar de a ratos el daño de la lava
    this.burnAcc = 0;
  }

  toggleHover() {
    const g = this.game;
    if (!g.stats.hover || this.dead) return;
    this.hovering = !this.hovering;
    g.toast(this.hovering ? 'Modo vuelo: prendido' : 'Modo vuelo: apagado', 'hover', 'good');
    g.audio.play('ui');
    if (this.hovering) { this.vy = Math.min(this.vy, 0); this.peakY = this.y; }
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get depth() { return depthAtY(this.y + this.h); }

  collides(x, y) {
    const W = this.game.world;
    const s0 = Math.floor(x / SUB), s1 = Math.floor((x + this.w - 0.001) / SUB);
    const r0 = Math.floor(y / SUB), r1 = Math.floor((y + this.h - 0.001) / SUB);
    for (let r = r0; r <= r1; r++) for (let s = s0; s <= s1; s++) if (W.subAt(s, r)) return true;
    return false;
  }

  moveX(dx) {
    if (!dx) return false;
    const nx = this.x + dx;
    if (!this.collides(nx, this.y)) { this.x = nx; return false; }
    if (this.onGround) {
      for (let s = 1; s <= PHYS.stepUp; s++) {
        if (!this.collides(nx, this.y - s)) { this.x = nx; this.y -= s; return false; }
      }
    }
    if (dx > 0) this.x = Math.floor((nx + this.w - 0.001) / SUB) * SUB - this.w;
    else this.x = (Math.floor(nx / SUB) + 1) * SUB;
    if (this.collides(this.x, this.y)) this.x = nx - dx;
    return true;
  }

  moveY(dy) {
    if (!dy) return false;
    const ny = this.y + dy;
    if (!this.collides(this.x, ny)) { this.y = ny; return false; }
    if (dy > 0) this.y = Math.floor((ny + this.h - 0.001) / SUB) * SUB - this.h;
    else this.y = (Math.floor(ny / SUB) + 1) * SUB;
    if (this.collides(this.x, this.y)) this.y = ny - dy;
    return true;
  }

  /** Vector de cavado según el control que se esté usando */
  readAim(inp, ix) {
    if (inp.mouseDig) {
      const dx = inp.mx - this.cx, dy = inp.my - (this.cy - 1);
      const d = Math.hypot(dx, dy);
      return d > 0.5 ? { x: dx / d, y: dy / d } : { x: this.facing, y: 0 };
    }
    if (inp.stickDig) {
      const { sx, sy } = inp;
      const d = Math.hypot(sx, sy);
      if (d > 0.3) return { x: sx / d, y: sy / d };
      return { x: this.facing, y: 0 };
    }
    if (inp.dig) {
      const iy = inp.up ? -1 : inp.down ? 1 : 0;
      let x = ix, y = iy;
      if (!x && !y) x = this.facing;
      const d = Math.hypot(x, y);
      return { x: x / d, y: y / d };
    }
    if (inp.stickDown) {
      // joystick abajo solo (o en diagonal hacia abajo); en el teclado, S es para bajar despacio
      if (inp.sy > 0.55) { const d = Math.hypot(inp.sx, inp.sy); return { x: inp.sx / d, y: inp.sy / d }; }
      return { x: 0, y: 1 };
    }
    return null;
  }

  /** Busca qué hay para cavar en la dirección `aim` */
  findTarget(aim) {
    const W = this.game.world;
    const ox = this.cx, oy = this.cy - 1;
    // distancia del centro al borde del personaje en esa dirección
    const edge = Math.min(Math.abs(aim.x) > 0.01 ? (this.w / 2) / Math.abs(aim.x) : 99, Math.abs(aim.y) > 0.01 ? (this.h / 2 + (aim.y > 0 ? 1 : -1)) / Math.abs(aim.y) : 99);
    const maxD = (edge + DIG.reach + 8 * Math.abs(aim.x * aim.y)) * this.game.stats.reach;
    const R = BRUSH_R[this.game.stats.brush];
    const push = R * 0.5;
    const hit = W.probe(ox, oy, aim.x, aim.y, maxD);
    if (hit) return { hit, cx: hit.x + aim.x * push, cy: hit.y + aim.y * push, R };
    // nada justo en esa línea: cavar igual lo más cerca posible, hacia ese lado
    const px = ox + aim.x * maxD, py = oy + aim.y * maxD;
    const near = W.nearestSolid(px, py, R * 1.4);
    if (!near) return null;
    return { hit: near, cx: near.x + aim.x * push, cy: near.y + aim.y * push, R };
  }

  update(dt, inp) {
    const g = this.game, st = g.stats;
    this.anim += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.dead) return;

    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    // ---- apuntar ----
    let aim = this.readAim(inp, ix);
    if (aim && Math.abs(aim.x) > 0.2) this.facing = aim.x > 0 ? 1 : -1;
    else if (ix) this.facing = ix;

    let walkIx = ix;
    let target = null;
    if (aim) {
      target = this.findTarget(aim);
      if (!target) aim = null;
      else if (!isDiggable(target.hit.t)) {
        if (inp.digPressed || inp.downPressed) g.toast('Acá no se puede cavar', 'nodig');
        aim = null; target = null;
      }
    }

    // ---- movimiento horizontal ----
    this.sprinting = !!inp.sprint && walkIx !== 0;
    if (this.hovering && !st.hover) this.hovering = false;
    const H = this.hovering ? HOVER[st.hover] : null;
    const want = H ? walkIx * H.h * (this.sprinting ? 1.35 : 1)
      : walkIx * PHYS.walk * (this.flying ? 1.12 : 1) * (this.sprinting ? PHYS.sprintMult : 1);
    const acc = H ? H.acc : this.onGround ? PHYS.accelGround : PHYS.accelAir;
    if (this.vx < want) this.vx = Math.min(want, this.vx + acc * dt);
    else this.vx = Math.max(want, this.vx - acc * dt);

    // ---- salto y jetpack ----
    this.jumpT += dt;
    const wasFlying = this.flying;
    this.flying = false;
    const inLava = this.game.world.lavaInRect(this.x, this.y, this.w, this.h) > 0;
    if (H) {
      // modo vuelo: sin gravedad, se mueve para donde apuntes y frena enseguida
      const iy = (inp.up || inp.jump ? -1 : 0) + (inp.down ? 1 : 0);
      const wantV = iy * H.v * (this.sprinting ? 1.35 : 1);
      if (this.vy < wantV) this.vy = Math.min(wantV, this.vy + H.acc * dt);
      else this.vy = Math.max(wantV, this.vy - H.acc * dt);
      if (!this.onGround || iy < 0) {
        this.flying = true;
        this.jetFlame(dt);
        if (!st.infEnergy) this.energy = Math.max(0, this.energy - st.jetCost * (iy || walkIx ? 1 : 0.4) * dt);
        if (this.energy <= 0) { this.hovering = false; g.toast('¡Sin energía para volar!', 'nojet'); }
      }
      this.peakY = this.y;
    } else {
      if (inp.jumpPressed && (this.onGround || inLava)) {
        this.vy = -PHYS.jump * (inLava ? 0.8 : 1);
        this.onGround = false;
        this.jumpT = 0;
        g.audio.play('jump');
      }
      this.vy = Math.min(this.vy + PHYS.gravity * dt, inLava ? 45 : PHYS.maxFall);
      const wantJet = inp.jump && !this.onGround && (this.jumpT > 0.17 || this.vy > -30);
      // descenso controlado (S solo, o Espacio + abajo): frena la caída para bajar
      // por el pozo sin lastimarse, y no gasta energía; con cada mejora baja más despacio
      const glide = !this.onGround && ((inp.glide && this.vy > 20) || (wantJet && inp.down));
      if (glide) {
        this.flying = true;
        if (this.vy > st.glide) this.vy = Math.max(st.glide, this.vy - PHYS.jetAccel * dt);
        this.peakY = this.y;
        this.jetFlame(dt);
      } else if (wantJet && this.energy > 0) {
        this.flying = true;
        this.vy -= PHYS.jetAccel * dt;
        if (this.vy < -st.jetSpeed) this.vy = -st.jetSpeed;
        if (!st.infEnergy) this.energy = Math.max(0, this.energy - st.jetCost * dt);
        this.peakY = this.y;
        this.jetFlame(dt);
      } else if (wantJet && this.energy <= 0 && Math.random() < 0.1) {
        g.toast('¡Sin energía para volar!', 'nojet');
      }
    }
    if (this.flying !== wasFlying) g.audio.jet(this.flying);

    // ---- mover y colisionar ----
    const wasGround = this.onGround;
    if (this.moveX(this.vx * dt)) this.vx = 0;
    if (this.moveY(this.vy * dt)) {
      if (this.vy < 0) this.vy = 0;
    }
    this.onGround = this.vy >= 0 && this.collides(this.x, this.y + 1);
    if (this.onGround) {
      if (!wasGround) this.land();
      this.vy = 0;
      this.peakY = this.y;
    } else {
      this.peakY = Math.min(this.peakY, this.y);
    }
    const minX = EDGE * TILE, maxX = (WORLD_W - EDGE) * TILE - this.w;
    if (this.x < minX) { this.x = minX; this.vx = 0; }
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }
    if (this.onGround && Math.abs(this.vx) > 5) this.walkT += dt * Math.max(1, Math.abs(this.vx) / PHYS.walk); else this.walkT = 0;
    // polvito al correr
    if (this.sprinting && this.onGround && Math.abs(this.vx) > PHYS.walk * 1.2 && Math.random() < 0.3) {
      g.particles.add({ x: this.cx - Math.sign(this.vx) * 3, y: this.y + this.h, vx: -Math.sign(this.vx) * (10 + Math.random() * 20), vy: -10 - Math.random() * 15, life: 0.35, max: 0.35, color: 'rgba(220,205,180,0.7)', size: 1, grav: 40 });
    }

    // ---- cavar ----
    this.updateDig(dt, aim, target);

    // ---- zonas ----
    this.resting = inZone(HOME_ZONE, this.cx, this.cy);
    this.inShop = inZone(SHOP_ZONE, this.cx, this.cy);
    if (this.resting) {
      const before = this.energy < st.energyMax || this.hp < HP_MAX;
      this.energy = Math.min(st.energyMax, this.energy + REST.energyPerSec * dt);
      this.hp = Math.min(HP_MAX, this.hp + REST.hpPerSec * dt);
      this.restFx += dt;
      if (before && this.restFx > 0.25) {
        this.restFx = 0;
        g.particles.add({ x: this.cx + (Math.random() - 0.5) * 8, y: this.y - 2, vx: (Math.random() - 0.5) * 10, vy: -18, life: 1, max: 1, heart: true, grav: 0 });
      }
    }

    // ---- lava ----
    if (inLava) this.burn(dt);
    else this.burnAcc = 0;
    if (st.infEnergy) this.energy = st.energyMax;

    // ---- cofres ----
    for (const ch of g.world.chests) {
      if (ch.opened || ch.locked) continue;
      const x0 = ch.c * TILE - 3, y0 = ch.r * TILE - 11;
      if (this.x + this.w > x0 && this.x < x0 + 15 && this.y + this.h > y0 && this.y < y0 + 11) g.openChest(ch, this);
    }

    // ---- agotamiento ----
    if (this.energy <= 0 && this.depth > 6 && !this.resting) {
      this.exhaustT += dt;
      if (this.exhaustT > 0.1 && this.exhaustT - dt <= 0.1) g.toast('¡Te quedaste sin energía!', 'noen');
      if (this.exhaustT > 2.5) g.faint(this, 'energy');
    } else this.exhaustT = 0;
  }

  /** fueguito y humo del jetpack */
  jetFlame(dt) {
    const g = this.game;
    this.jetFx += dt;
    if (this.jetFx <= 0.03) return;
    this.jetFx = 0;
    const nx = this.facing > 0 ? this.x - 1 : this.x + this.w + 1;
    g.particles.add({ x: nx, y: this.y + this.h - 1, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 40, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#ffd34d' : '#ff8a3d', size: 1, grav: -40 });
    if (Math.random() < 0.4) g.particles.add({ x: nx, y: this.y + this.h + 2, vx: (Math.random() - 0.5) * 16, vy: 20, life: 0.6, max: 0.6, color: 'rgba(200,200,210,0.6)', size: 2, grav: -30, smoke: true });
  }

  land() {
    const g = this.game;
    const fall = (this.y - this.peakY) / TILE;
    if (fall > 1.5) {
      for (let i = 0; i < 5; i++) g.particles.add({ x: this.cx + (Math.random() - 0.5) * 6, y: this.y + this.h, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 20, life: 0.4, max: 0.4, color: 'rgba(210,190,160,0.8)', size: 1, grav: 60 });
      g.audio.play('land');
    }
    const safe = PHYS.safeFallTiles + PHYS.safeFallPerArmor * g.upgrades.armadura;
    if (fall > safe) {
      const raw = (fall - safe) * PHYS.fallDmgPerTile;
      const dmg = Math.round(raw * (1 - g.stats.armor / 100));
      if (dmg > 0) this.hurt(dmg);
    }
  }

  /** daño continuo por estar en la lava (la armadura del último nivel lo baja mucho) */
  burn(dt) {
    const g = this.game;
    this.burnAcc += LAVA.dps * (1 - g.stats.lavaResist) * dt;
    this.burnT -= dt;
    if (Math.random() < dt * 30) g.particles.add({ x: this.x + Math.random() * this.w, y: this.y + Math.random() * this.h, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#ffd34d' : 'rgba(90,80,80,0.6)', size: 1, grav: -30, smoke: Math.random() < 0.4 });
    if (this.burnT > 0 || this.burnAcc < 1) return;
    this.burnT = 0.3;
    const dmg = Math.floor(this.burnAcc);
    this.burnAcc -= dmg;
    this.hurt(dmg, 'lava');
  }

  hurt(dmg, reason = 'fall') {
    const g = this.game;
    this.hp -= dmg;
    this.hurtT = 0.8;
    g.audio.play('hurt');
    g.addText(this.cx, this.y - 6, '-' + dmg, '#ff5d6c');
    g.shake(Math.min(6, 2 + dmg / 12));
    for (let i = 0; i < 8; i++) g.particles.add({ x: this.cx, y: this.cy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.5, max: 0.5, color: '#ff5d6c', size: 1, grav: 200 });
    if (this.hp <= 0) { this.hp = 0; g.faint(this, reason); }
  }

  updateDig(dt, aim, target) {
    const g = this.game, st = g.stats, W = g.world;
    if (!aim || !target) {
      this.digging = false; this.digProg = 0; this.digKey = null; this.tooHard = false; this.digPoint = null;
      return;
    }
    const eCost = DIG.energyCost[Math.min(g.upgrades.pala, DIG.energyCost.length - 1)];
    if (this.energy < eCost) {
      this.digging = false;
      this.digPoint = null;
      g.toast('Sin energía: volvé a casa a descansar', 'noen2');
      return;
    }
    this.digging = true;
    this.aim = aim;
    this.digPoint = target;
    // bajando con la pala/taladro no cuenta como caída libre
    if (aim.y > 0.5) this.peakY = Math.max(this.peakY, this.y - 3 * 8);
    // si cambia mucho el punto, se reinicia el progreso
    const key = Math.round(target.cx / 4) + ',' + Math.round(target.cy / 4);
    if (key !== this.digKey) { this.digKey = key; this.digProg = Math.min(this.digProg, 0.5); }

    const prevPhase = this.digAnim % 1;
    const hitHard = hardness(target.hit.t);
    if (hitHard > st.power) {
      this.tooHard = true;
      this.digAnim += dt * 2.6;
      const ph = this.digAnim % 1;
      if (prevPhase < STRIKE_AT && ph >= STRIKE_AT) {
        g.audio.play('clink');
        this.sparks(target.hit.x, target.hit.y, ['#ffffff', '#ffe58a']);
        g.toast(`¡Muy duro! Necesitás una pala con fuerza ${hitHard}`, 'hard');
      }
      return;
    }
    this.tooHard = false;
    const info = W.circleInfo(target.cx, target.cy, target.R, st.power);
    const hmax = Math.max(hitHard, info.hard, 1);
    const crystal = target.hit.t === T.CRYSTAL;
    let time = Math.max(DIG.minTime, (DIG.baseTime * hmax) / st.power);
    if (crystal) time = Math.max(time, CRYSTAL_DIG.time);
    const rate = clamp(1.1 / time, 2.4, 7);
    this.digAnim += dt * rate;
    const ph = this.digAnim % 1;
    if (prevPhase < STRIKE_AT && ph >= STRIKE_AT) {
      this.debris(target.hit.x, target.hit.y, target.hit.t, 3);
      this.materialFx(target.hit.x, target.hit.y, target.hit.t, 0, 6);
      if (crystal) { g.audio.play('clink'); this.sparks(target.hit.x, target.hit.y, ['#ffd6ec', '#ff86c2', '#ffffff']); }
      else g.audio.play(g.upgrades.pala >= 3 ? 'drill' : 'dig');
    }
    this.digProg += dt / time;
    if (this.digProg >= 1) {
      this.digProg = 0;
      const chip = { x: target.hit.x, y: target.hit.y, ax: aim.x, ay: aim.y, depth: CRYSTAL_DIG.depth, width: CRYSTAL_DIG.width };
      const res = W.digCircle(target.cx, target.cy, target.R, st.power, chip);
      if (res.n > 0) {
        this.energy = Math.max(0, this.energy - eCost);
        g.counters.tiles += res.n / 16;
        for (const [t, n] of Object.entries(res.mats)) {
          this.debris(target.cx, target.cy, +t, Math.min(10, 2 + (n >> 3)), target.R);
          this.materialFx(target.cx, target.cy, +t, n, target.R);
        }
        for (const l of res.loot) g.pickups.spawn(l.x, l.y, l.item);
        g.audio.play('break');
      }
    }
  }

  debris(x, y, t, n, spread = 4) {
    const def = DEF[t];
    if (!def) return;
    const pal = def.pal;
    const g = this.game;
    for (let i = 0; i < n; i++) {
      g.particles.add({
        x: x + (Math.random() - 0.5) * spread, y: y + (Math.random() - 0.5) * spread,
        vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 70,
        life: 0.5 + Math.random() * 0.4, max: 0.9, color: pal[1 + Math.floor(Math.random() * 3)], size: Math.random() < 0.3 ? 2 : 1, grav: 380, collide: true,
      });
    }
  }

  /** polvo, chispas o brillitos según el material que se rompe */
  materialFx(x, y, t, n, R) {
    const g = this.game;
    const fx = MAT_FX[t];
    if (!fx) return;
    const puffs = Math.min(fx.maxPuffs, 2 + Math.floor(n / 14));
    for (let i = 0; i < puffs; i++) {
      g.particles.add({
        x: x + (Math.random() - 0.5) * R, y: y + (Math.random() - 0.5) * R * 0.8,
        vx: (Math.random() - 0.5) * 18, vy: -6 - Math.random() * 16,
        life: 0.9 + Math.random() * 0.9, max: 1.8, color: fx.dust[i % fx.dust.length], size: 3 + (Math.random() < 0.5 ? 1 : 0), grav: -4, smoke: true,
      });
    }
    if (fx.spark) {
      const k = Math.min(8, 1 + Math.floor(n / 25));
      for (let i = 0; i < k; i++) {
        g.particles.add({
          x: x + (Math.random() - 0.5) * R, y: y + (Math.random() - 0.5) * R,
          vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 40,
          life: 0.4 + Math.random() * 0.5, max: 0.9, color: fx.spark[i % fx.spark.length], star: Math.random() < 0.5, size: 1, grav: 70,
        });
      }
    }
  }

  sparks(x, y, cols) {
    for (let i = 0; i < 5; i++) {
      this.game.particles.add({ x, y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 70, life: 0.25, max: 0.25, color: cols[i % cols.length], size: 1, grav: 200 });
    }
  }

  // ------------------------------------------------------------
  draw(ctx, camX, camY) {
    if (this.dead) return;
    if (this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0) return;
    const frames = getCharFrames(this.char, this.game.upgrades.motor, this.game.upgrades.casco)[this.facing > 0 ? 'right' : 'left'];
    let frame;
    if (!this.onGround) frame = 'air';
    else if (Math.abs(this.vx) > 5 && !this.digging) frame = ['walkA', 'walkB', 'walkC', 'walkB'][Math.floor(this.walkT * 9) % 4];
    else {
      const b = this.anim % 3.4;
      frame = b > 3.25 ? 'blink' : (this.anim % 1.6) > 1.0 ? 'idleB' : 'idle';
    }
    const bob = frame === 'idleB' || frame === 'walkB' ? 1 : 0;
    const sx = Math.round(this.x + this.w / 2 - CHAR_W / 2 - camX), sy = Math.round(this.y + this.h - CHAR_H - camY);

    // llama del jetpack
    if (this.flying) {
      const nx = this.facing > 0 ? sx + 1 : sx + CHAR_W - 3;
      const len = 3 + Math.floor(Math.random() * 3);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(nx, sy + 16, 2, len);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(nx, sy + 16, 2, len - 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(nx, sy + 16, 2, 1);
    }

    ctx.drawImage(frames[frame], sx, sy);

    // brazo + pala
    let arm, sh, len = 7;
    const drill = this.game.upgrades.pala >= 3;
    if (this.digging && this.aim && drill) {
      const a = Math.atan2(this.aim.y, this.aim.x * this.facing);
      arm = a + (Math.random() - 0.5) * 0.12; sh = arm; len = 6;
    } else if (this.digging && this.aim) {
      const a = Math.atan2(this.aim.y, this.aim.x * this.facing); // ángulo local (mirando a la derecha)
      const p = this.digAnim % 1;
      if (p < STRIKE_AT) {
        const e = (p / STRIKE_AT) ** 2;
        arm = a + 0.2 - e * 1.9;
        sh = a + 0.1 - e * 2.1;
      } else {
        const s = (p - STRIKE_AT) / (1 - STRIKE_AT);
        arm = a - 1.7 + s * 1.9;
        sh = a - 2.0 + s * 2.1;
      }
    } else if (this.flying) { arm = 1.1; sh = 1.35; len = 5; }
    else if (!this.onGround) { arm = -0.4; sh = -0.95; len = 5; }
    else if (Math.abs(this.vx) > 5) {
      const sw = Math.sin(this.walkT * 9 * Math.PI / 2);
      arm = 1.0 + sw * 0.25; sh = 0.95 + sw * 0.2; len = 4;
    } else { arm = 1.0; sh = 1.05; len = 4; }
    if (drill) drawDrill(ctx, sx, sy, this.facing, bob, this.digging ? arm : 0.9, this.game.upgrades.pala, this.char, this.digging ? this.anim : 0);
    else drawArmShovel(ctx, sx, sy, this.facing, bob, arm, sh, this.game.upgrades.pala, this.char, len);
  }
}

export { T };
