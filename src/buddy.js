// IA del compañero: si jugás con Pablo, Panchi te acompaña (y al revés).
// Es un Player de verdad (mismo cuerpo, física, jetpack y pala) al que en vez del
// teclado le llega una "entrada" armada acá: sigue al personaje más o menos libre,
// vuela cuando hace falta y ayuda a cavar al costado de donde estás cavando.
// Más adelante este lugar lo puede ocupar la entrada de una segunda persona.
import { TILE, SURFACE } from './config.js';

const GAP = 13;          // px detrás del personaje cuando están a la misma altura
const HELP_DIST = 46;    // ayuda a cavar si el punto de cavado está así de cerca

export class BuddyAI {
  constructor(game) {
    this.g = game;
    this.p = null;          // el Player que maneja (se asigna al crearlo)
    this.side = 1;          // de qué lado del pozo ayuda
    this.wander = 0;        // corrimiento "libre" cuando el personaje está quieto
    this.wanderT = 2;
    this.stuckT = 0; this.surfT = 0;
    this.chkX = 0; this.chkY = 0;
    this.lastX = 0; this.blockedT = 0;
    this.active = false;
  }

  /** aparece al lado del personaje (con un "puf" si ya estaba en juego) */
  place(leader, poof = false) {
    const p = this.p;
    if (poof) this.poof();
    p.x = leader.cx - p.w / 2 - leader.facing * 10;
    p.y = leader.y + leader.h - p.h;
    if (p.collides(p.x, p.y)) p.x = leader.x;
    p.vx = 0; p.vy = 0; p.peakY = p.y;
    p.facing = leader.facing;
    p.digging = false; p.digPoint = null; p.hovering = false;
    this.stuckT = 0; this.surfT = 0; this.blockedT = 0;
    this.chkX = p.x; this.chkY = p.y; this.lastX = p.x;
    if (poof) this.poof();
  }

  poof() {
    const p = this.p;
    for (let i = 0; i < 10; i++) {
      this.g.particles.add({ x: p.cx, y: p.cy, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.5, max: 0.5, color: 'rgba(240,235,225,0.8)', size: 2, grav: 0, smoke: true });
    }
  }

  /** arma la entrada de este cuadro para seguir a `L` (el personaje que maneja la persona) */
  input(dt, L) {
    const g = this.g, p = this.p;
    const inp = { left: false, right: false, jump: false, jumpPressed: false, glide: false, sprint: false, mouseDig: false, mx: 0, my: 0 };
    const dy = (L.y + L.h) - (p.y + p.h); // negativo = el personaje está más arriba
    const level = Math.abs(dy) < 12;
    const dist = Math.hypot(L.cx - p.cx, L.cy - p.cy);

    // trabado o muy lejos (también después de un desmayo o un viaje largo): aparece al lado
    if (dist <= 26 || Math.hypot(p.x - this.chkX, p.y - this.chkY) > 6) { this.chkX = p.x; this.chkY = p.y; this.stuckT = 0; }
    else this.stuckT += dt;
    const surfaceGap = L.depth < 1 && (p.y + p.h) / TILE > SURFACE + 0.5;
    this.surfT = surfaceGap ? this.surfT + dt : 0;
    if (dist > 200 || this.stuckT > 1.4 || this.surfT > 0.8) { this.place(L, true); return inp; }

    // cuando el personaje está quieto, se mueve un poco por su cuenta
    const idle = Math.abs(L.vx) < 5 && L.onGround && !L.digging;
    this.wanderT -= dt;
    if (this.wanderT <= 0) {
      this.wanderT = 2.5 + Math.random() * 3;
      this.wander = idle ? (Math.random() - 0.5) * 36 : 0;
    }
    if (!idle) this.wander = 0;

    // ---- ayudar a cavar al costado del pozo ----
    let help = null;
    if (L.digging && L.digPoint && L.aim && !L.tooHard) {
      const dp = L.digPoint;
      if (Math.hypot(dp.cx - p.cx, dp.cy - p.cy) < HELP_DIST) {
        const W = g.world;
        const nx = -L.aim.y, ny = L.aim.x, off = dp.R * 1.7;
        for (let k = 0; k < 2 && !help; k++) {
          const cx = dp.cx + nx * off * this.side + L.aim.x * dp.R * 0.3;
          const cy = dp.cy + ny * off * this.side + L.aim.y * dp.R * 0.3;
          if (W.circleInfo(cx, cy, dp.R * 0.8, g.stats.power).any) help = { x: cx, y: cy };
          else this.side *= -1;
        }
        // nada al costado: le da una mano en el mismo lugar
        if (!help) help = { x: dp.cx, y: dp.cy };
      }
    }
    if (help) { inp.mouseDig = true; inp.mx = help.x; inp.my = help.y; }

    // ---- caminar ----
    const gap = g.popi ? GAP + 11 : GAP; // si está Popi, deja lugar para el perro
    const tx = level ? L.cx - L.facing * gap + this.wander : L.cx;
    const dx = tx - p.cx;
    const dead = help && level ? 9 : level ? 4 : 1.5;
    if (dx > dead) inp.right = true;
    else if (dx < -dead) inp.left = true;
    inp.sprint = Math.abs(L.cx - p.cx) > 40 || L.sprinting;

    // ¿se quedó contra una pared queriendo avanzar?
    const wants = inp.left || inp.right;
    if (wants && Math.abs(p.x - this.lastX) < 0.15 && p.onGround) this.blockedT += dt; else this.blockedT = 0;
    this.lastX = p.x;

    // ---- saltar, volar y bajar despacio ----
    const up = dy < -18 || (L.flying && dy < -6) || (this.blockedT > 0.12 && Math.abs(dx) > 6) || (L.hovering && dy < -4);
    if (up) { inp.jump = true; inp.jumpPressed = p.onGround; }
    if (dy > 30 && p.vy > 120) inp.glide = true;
    return inp;
  }
}
