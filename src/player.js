import { TILE, WORLD_W, EDGE, PHYS, DIG, BRUSH, HP_MAX, REST, SURFACE } from './config.js';
import { DEF, isDiggable, hardness } from './tiles.js';
import { getCharFrames, drawArmShovel } from './sprites.js';
import { HOME_ZONE, SHOP_ZONE, SPAWN, inZone } from './structures.js';
import { depthAtY } from './world.js';
import { clamp } from './util.js';

const STRIKE_AT = 0.62; // momento del golpe dentro del ciclo de animación

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
    this.digDir = null;
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
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get depth() { return depthAtY(this.y + this.h); }

  collides(x, y) {
    const W = this.game.world;
    const c0 = Math.floor(x / TILE), c1 = Math.floor((x + this.w - 0.001) / TILE);
    const r0 = Math.floor(y / TILE), r1 = Math.floor((y + this.h - 0.001) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (W.solid(c, r)) return true;
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
    if (dx > 0) this.x = Math.floor((nx + this.w - 0.001) / TILE) * TILE - this.w;
    else this.x = (Math.floor(nx / TILE) + 1) * TILE;
    if (this.collides(this.x, this.y)) this.x = nx - dx; // seguridad
    return true;
  }

  moveY(dy) {
    if (!dy) return false;
    const ny = this.y + dy;
    if (!this.collides(this.x, ny)) { this.y = ny; return false; }
    if (dy > 0) this.y = Math.floor((ny + this.h - 0.001) / TILE) * TILE - this.h;
    else this.y = (Math.floor(ny / TILE) + 1) * TILE;
    if (this.collides(this.x, this.y)) this.y = ny - dy;
    return true;
  }

  aimDir(mx, my) {
    const dx = mx - this.cx, dy = my - this.cy;
    if (Math.abs(dy) > Math.abs(dx) * 0.8) return dy > 0 ? 'down' : 'up';
    return dx > 0 ? 'right' : 'left';
  }

  digTargets(dir) {
    const W = this.game.world;
    const B = BRUSH[this.game.stats.brush];
    const left = this.x, right = this.x + this.w;
    const pc = Math.floor((left + right) / 2 / TILE);
    const hr = Math.floor(this.y / TILE), fr = Math.floor((this.y + this.h - 0.01) / TILE);
    const cells = [];
    let primary;
    if (dir === 'down' || dir === 'up') {
      const s = dir === 'down' ? 1 : -1;
      const r0 = dir === 'down' ? fr + 1 : hr - 1;
      for (let d = 0; d < B.depth; d++) for (let dc = -B.extra; dc <= B.extra; dc++) cells.push([pc + dc, r0 + s * d]);
      primary = [pc, r0];
    } else {
      const s = dir === 'right' ? 1 : -1;
      const c0 = dir === 'right' ? Math.floor((right - 0.01) / TILE) + 1 : Math.floor(left / TILE) - 1;
      for (let d = 0; d < B.depth; d++) for (let r = fr; r >= hr - B.extra; r--) cells.push([c0 + s * d, r]);
      primary = [c0, fr];
      for (let r = fr; r >= hr; r--) if (W.solid(c0, r)) { primary = [c0, r]; break; }
    }
    const list = [];
    let blocked = false;
    for (const [c, r] of cells) {
      const t = W.get(c, r);
      if (!W.solid(c, r)) continue;
      if (!isDiggable(t)) { blocked = true; continue; }
      list.push({ c, r, t, hard: hardness(t) });
    }
    return { list, primary, pc, blocked };
  }

  update(dt, inp) {
    const g = this.game, st = g.stats;
    this.anim += dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.dead) return;

    const ix = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);

    // ---- dirección de cavado ----
    let digDir = null;
    if (inp.mouseDig) digDir = this.aimDir(inp.mx, inp.my);
    else if (inp.dig) digDir = inp.up ? 'up' : inp.down ? 'down' : ix > 0 ? 'right' : ix < 0 ? 'left' : this.facing > 0 ? 'right' : 'left';
    else if (inp.down) digDir = 'down';

    if (digDir === 'left') this.facing = -1;
    else if (digDir === 'right') this.facing = 1;
    else if (ix) this.facing = ix;

    let walkIx = ix;
    let targets = null;
    if (digDir) {
      targets = this.digTargets(digDir);
      if (!targets.list.length) {
        if (targets.blocked && (inp.digPressed || inp.downPressed)) g.toast('Acá no se puede cavar', 'nodig');
        digDir = null;
      } else {
        walkIx = 0;
      }
    }

    // ---- movimiento horizontal ----
    const target = walkIx * PHYS.walk * (this.flying ? 1.12 : 1);
    const acc = this.onGround ? PHYS.accelGround : PHYS.accelAir;
    if (this.vx < target) this.vx = Math.min(target, this.vx + acc * dt);
    else this.vx = Math.max(target, this.vx - acc * dt);

    // ---- salto y jetpack ----
    this.jumpT += dt;
    if (inp.jumpPressed && this.onGround) {
      this.vy = -PHYS.jump;
      this.onGround = false;
      this.jumpT = 0;
      g.audio.play('jump');
    }
    this.vy = Math.min(this.vy + PHYS.gravity * dt, PHYS.maxFall);
    const wantJet = inp.jump && !this.onGround && (this.jumpT > 0.17 || this.vy > -30);
    const wasFlying = this.flying;
    this.flying = false;
    if (wantJet && this.energy > 0) {
      this.flying = true;
      if (inp.down) {
        // descenso controlado: frena la caída para bajar por el pozo sin lastimarse
        if (this.vy > 60) this.vy = Math.max(60, this.vy - PHYS.jetAccel * dt);
      } else {
        this.vy -= PHYS.jetAccel * dt;
        if (this.vy < -st.jetSpeed) this.vy = -st.jetSpeed;
      }
      this.energy = Math.max(0, this.energy - st.jetCost * dt * (inp.down ? 0.5 : 1));
      this.peakY = this.y;
      this.jetFx += dt;
      if (this.jetFx > 0.03) {
        this.jetFx = 0;
        const nx = this.facing > 0 ? this.x - 1 : this.x + this.w + 1;
        g.particles.add({ x: nx, y: this.y + this.h - 1, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 40, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#ffd34d' : '#ff8a3d', size: 1, grav: -40 });
        if (Math.random() < 0.4) g.particles.add({ x: nx, y: this.y + this.h + 2, vx: (Math.random() - 0.5) * 16, vy: 20, life: 0.6, max: 0.6, color: 'rgba(200,200,210,0.6)', size: 2, grav: -30, smoke: true });
      }
    } else if (wantJet && this.energy <= 0 && Math.random() < 0.1) {
      g.toast('¡Sin energía para volar!', 'nojet');
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
    if (this.onGround && Math.abs(this.vx) > 5) this.walkT += dt; else this.walkT = 0;

    // centrarse en el pozo al cavar hacia abajo
    if (targets && digDir === 'down' && this.onGround) {
      const tx = targets.pc * TILE + 1;
      const d = tx - this.x;
      if (Math.abs(d) > 0.3) this.moveX(clamp(d, -50 * dt, 50 * dt));
    }

    // ---- cavar ----
    this.updateDig(dt, digDir, targets);

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
        g.particles.add({ x: this.cx + (Math.random() - 0.5) * 8, y: this.y, vx: (Math.random() - 0.5) * 10, vy: -18, life: 1, max: 1, heart: true, grav: 0 });
      }
    }

    // ---- cofres ----
    for (const ch of g.world.chests) {
      if (ch.opened) continue;
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

  land() {
    const g = this.game;
    const fall = (this.y - this.peakY) / TILE;
    if (fall > 1.5) {
      for (let i = 0; i < 5; i++) g.particles.add({ x: this.cx + (Math.random() - 0.5) * 6, y: this.y + this.h, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 20, life: 0.4, max: 0.4, color: 'rgba(210,190,160,0.8)', size: 1, grav: 60 });
      g.audio.play('land');
    }
    if (fall > PHYS.safeFallTiles) {
      const raw = (fall - PHYS.safeFallTiles) * PHYS.fallDmgPerTile;
      const dmg = Math.round(raw * (1 - g.stats.armor / 100));
      if (dmg > 0) this.hurt(dmg);
    }
  }

  hurt(dmg) {
    const g = this.game;
    this.hp -= dmg;
    this.hurtT = 0.8;
    g.audio.play('hurt');
    g.addText(this.cx, this.y - 4, '-' + dmg, '#ff5d6c');
    g.shake(Math.min(6, 2 + dmg / 12));
    for (let i = 0; i < 8; i++) g.particles.add({ x: this.cx, y: this.cy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.5, max: 0.5, color: '#ff5d6c', size: 1, grav: 200 });
    if (this.hp <= 0) { this.hp = 0; g.faint(this, 'fall'); }
  }

  updateDig(dt, digDir, targets) {
    const g = this.game, st = g.stats;
    if (!digDir || !targets || !targets.list.length) {
      this.digging = false; this.digProg = 0; this.digKey = null; this.tooHard = false;
      return;
    }
    if (this.energy < DIG.energyCost) {
      this.digging = false;
      g.toast('Sin energía: volvé a casa a descansar', 'noen2');
      return;
    }
    this.digging = true;
    this.digDir = digDir;
    const key = digDir + ':' + targets.primary[0] + ',' + targets.primary[1];
    if (key !== this.digKey) { this.digKey = key; this.digProg = 0; }
    const ok = targets.list.filter((t) => t.hard <= st.power);
    const prevPhase = this.digAnim % 1;
    if (!ok.length) {
      this.tooHard = true;
      this.digAnim += dt * 2.6;
      const ph = this.digAnim % 1;
      if (prevPhase < STRIKE_AT && ph >= STRIKE_AT) {
        g.audio.play('clink');
        const t0 = targets.list[0];
        this.sparks(t0.c, t0.r, ['#ffffff', '#ffe58a']);
        g.toast(`¡Muy duro! Necesitás una pala con fuerza ${t0.hard}`, 'hard');
      }
      return;
    }
    this.tooHard = false;
    const hmax = Math.max(...ok.map((t) => t.hard));
    const time = Math.max(DIG.minTime, (DIG.baseTime * hmax) / st.power);
    const rate = clamp(1.1 / time, 2.4, 7);
    this.digAnim += dt * rate;
    const ph = this.digAnim % 1;
    if (prevPhase < STRIKE_AT && ph >= STRIKE_AT) {
      const p = ok[0];
      this.debris(p.c, p.r, p.t, 3);
      g.audio.play('dig');
    }
    this.digProg += dt / time;
    if (this.digProg >= 1) {
      this.digProg = 0;
      this.energy = Math.max(0, this.energy - DIG.energyCost);
      for (const t of ok) {
        const item = g.world.dig(t.c, t.r);
        if (item < 0) continue;
        g.counters.tiles++;
        this.debris(t.c, t.r, t.t, 6);
        if (item > 0) g.pickups.spawn(t.c * TILE + 4, t.r * TILE + 4, item);
      }
      g.audio.play('break');
    }
  }

  debris(c, r, t, n) {
    const pal = DEF[t].pal;
    const g = this.game;
    for (let i = 0; i < n; i++) {
      g.particles.add({
        x: c * TILE + 1 + Math.random() * 6, y: r * TILE + 1 + Math.random() * 6,
        vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 70,
        life: 0.5 + Math.random() * 0.4, max: 0.9, color: pal[1 + Math.floor(Math.random() * 3)], size: Math.random() < 0.3 ? 2 : 1, grav: 380, collide: true,
      });
    }
  }

  sparks(c, r, cols) {
    for (let i = 0; i < 5; i++) {
      this.game.particles.add({ x: c * TILE + 4, y: r * TILE + 4, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 70, life: 0.25, max: 0.25, color: cols[i % cols.length], size: 1, grav: 200 });
    }
  }

  // ------------------------------------------------------------
  draw(ctx, camX, camY) {
    if (this.dead) return;
    if (this.hurtT > 0 && Math.floor(this.hurtT * 20) % 2 === 0) return;
    const frames = getCharFrames(this.char)[this.facing > 0 ? 'right' : 'left'];
    let frame;
    if (!this.onGround) frame = 'air';
    else if (Math.abs(this.vx) > 5 && !this.digging) frame = ['walkA', 'walkB', 'walkC', 'walkB'][Math.floor(this.walkT * 9) % 4];
    else {
      const b = this.anim % 3.4;
      frame = b > 3.25 ? 'blink' : (this.anim % 1.6) > 1.0 ? 'idleB' : 'idle';
    }
    const bob = frame === 'idleB' || frame === 'walkB' ? 1 : 0;
    const sx = Math.round(this.x - 3 - camX), sy = Math.round(this.y - 1 - camY);

    // llama del jetpack
    if (this.flying) {
      const nx = this.facing > 0 ? sx + 1 : sx + 9;
      const len = 3 + Math.floor(Math.random() * 3);
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(nx, sy + 16, 2, len);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(nx, sy + 16, 2, len - 2);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(nx, sy + 16, 2, 1);
    }

    ctx.drawImage(frames[frame], sx, sy);

    // brazo + pala
    let arm, sh, len = 7;
    if (this.digging) {
      const p = this.digAnim % 1;
      const wind = p < STRIKE_AT ? p / STRIKE_AT : 1;
      const strike = p < STRIKE_AT ? 0 : (p - STRIKE_AT) / (1 - STRIKE_AT);
      const e = wind * wind;
      if (this.digDir === 'down') {
        arm = p < STRIKE_AT ? 0.6 - e * 1.9 : -1.3 + strike * 2.8;
        sh = p < STRIKE_AT ? 0.4 - e * 2.0 : -1.6 + strike * 3.2;
        if (sh > 1.57) sh = 1.57;
      } else if (this.digDir === 'up') {
        arm = p < STRIKE_AT ? -0.4 + e * 1.2 : 0.8 - strike * 2.4;
        sh = p < STRIKE_AT ? -0.6 + e * 1.0 : 0.4 - strike * 2.2;
      } else {
        arm = p < STRIKE_AT ? 0.3 - e * 1.8 : -1.5 + strike * 1.9;
        sh = p < STRIKE_AT ? 0.2 - e * 2.0 : -1.8 + strike * 2.1;
      }
    } else if (this.flying) { arm = 1.1; sh = 1.35; len = 5; }
    else if (!this.onGround) { arm = -0.4; sh = -0.95; len = 5; }
    else if (Math.abs(this.vx) > 5) {
      const sw = Math.sin(this.walkT * 9 * Math.PI / 2);
      arm = 1.0 + sw * 0.25; sh = 0.95 + sw * 0.2; len = 4;
    } else { arm = 1.0; sh = 1.05; len = 4; }
    drawArmShovel(ctx, sx, sy, this.facing, bob, arm, sh, this.game.upgrades.pala, this.char, len);
  }
}
