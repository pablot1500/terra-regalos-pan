// Teclado, mouse, controles táctiles y joystick (Xbox o cualquier control estándar).
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.edges = new Set();
    this.mouse = { down: false, x: 0, y: 0 };
    this.touch = { sx: 0, sy: 0, jump: false, dig: false, ax: 0, ay: 0, aimOn: false };
    this.pad = { on: false, btn: {}, lx: 0, ly: 0, rx: 0, ry: 0 };
    this.padSeen = false;
    this.lastDevice = 'mouse';  // 'mouse' | 'touch' | 'pad': qué se usó último (para la mira)
    this.fightMode = false;     // pelea final: el joystick izquierdo para arriba también vuela
    this.touchAim = null;   // dedo apoyado sobre el juego: cava hacia ahí (como el mouse)
    this.scale = 1;
    this.enabled = true;
    this.onAnyInput = null;

    const prevent = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (prevent.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.edges.add(e.code);
      this.keys.add(e.code);
      if (e.isTrusted) this.lastDevice = 'mouse';
      if (this.onAnyInput) this.onAnyInput();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; this.resetTouch(); });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      if (this.autoDig) this.mouse.latched = !this.mouse.latched;
      else this.mouse.down = true;
      this.setMouse(e, canvas);
      if (this.onAnyInput) this.onAnyInput();
    });
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.setMouse(e, canvas); });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // táctil: tocar y mantener sobre el juego cava hacia el dedo
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || this.touchAim) return;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* nada */ }
      this.touchAim = { id: e.pointerId, x: 0, y: 0 };
      this.setTouchAim(e, canvas);
      if (this.onAnyInput) this.onAnyInput();
    });
    canvas.addEventListener('pointermove', (e) => { if (this.touchAim && e.pointerId === this.touchAim.id) this.setTouchAim(e, canvas); });
    const endAim = (e) => { if (this.touchAim && e.pointerId === this.touchAim.id) this.touchAim = null; };
    canvas.addEventListener('pointerup', endAim);
    canvas.addEventListener('pointercancel', endAim);
    // iOS: sin zoom con dos dedos ni con doble toque
    for (const ev of ['gesturestart', 'gesturechange', 'dblclick']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });

    this.setupTouch();
  }

  setMouse(e, canvas) {
    this.mouseSeen = true;
    this.lastDevice = 'mouse';
    const r = canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - r.left) / this.scale;
    this.mouse.y = (e.clientY - r.top) / this.scale;
  }

  setTouchAim(e, canvas) {
    this.lastDevice = 'touch';
    const r = canvas.getBoundingClientRect();
    this.touchAim.x = (e.clientX - r.left) / this.scale;
    this.touchAim.y = (e.clientY - r.top) / this.scale;
  }

  resetTouch() {
    this.touch.sx = 0; this.touch.sy = 0; this.touch.jump = false; this.touch.dig = false;
    this.touch.ax = 0; this.touch.ay = 0; this.touch.aimOn = false;
    this.touchAim = null;
  }

  setupTouch() {
    // joystick izquierdo: caminar (aparece donde apoyás el pulgar)
    this.makeStick({
      stick: document.getElementById('stick'), knob: document.getElementById('stick-knob'),
      zones: [[document.getElementById('stick'), false], [document.getElementById('stick-zone'), true]], R: 42,
      onMove: (x, y) => {
        const T = this.touch, prevDown = T.sy > 0.55, prevUp = T.sy < -0.6;
        T.sx = x; T.sy = y;
        if (!prevDown && y > 0.55) this.edges.add('t-down');
        if (!prevUp && y < -0.6) this.edges.add('t-up');
      },
      onEnd: () => { this.touch.sx = 0; this.touch.sy = 0; },
    });
    // joystick derecho (solo en la pelea final): apuntar y tirar agua
    this.makeStick({
      stick: document.getElementById('aim-stick'), knob: document.getElementById('aim-knob'),
      zones: [[document.getElementById('aim-zone'), true]], R: 40,
      onMove: (x, y) => { this.touch.ax = x; this.touch.ay = y; this.touch.aimOn = true; },
      onEnd: () => { this.touch.ax = 0; this.touch.ay = 0; this.touch.aimOn = false; },
    });

    const btn = (elId, prop) => {
      const el = document.getElementById(elId);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (prop === 'dig' && this.autoDig) {
          // cavado automático: un toque empieza, otro toque frena
          this.touch.dig = !this.touch.dig;
          el.classList.toggle('latched', this.touch.dig);
          this.edges.add(elId);
          if (this.onAnyInput) this.onAnyInput();
          return;
        }
        if (prop) this.touch[prop] = true;
        this.edges.add(elId);
        el.classList.add('down');
        if (this.onAnyInput) this.onAnyInput();
      });
      const up = () => {
        if (prop === 'dig' && this.autoDig) return;
        if (prop) this.touch[prop] = false;
        el.classList.remove('down');
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    btn('t-jump', 'jump');
    btn('t-dig', 'dig');
    btn('t-act', null);
    btn('t-torch', null);
  }

  /** un joystick en pantalla: `zones` = [[elemento, flotante]] donde se puede apoyar el pulgar */
  makeStick({ stick, knob, zones, R, onMove, onEnd }) {
    let id = null, cx = 0, cy = 0;
    const upd = (e) => {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      onMove(dx / R, dy / R);
    };
    const start = (e, el, floating) => {
      e.preventDefault();
      if (id !== null) return;
      id = e.pointerId;
      this.lastDevice = 'touch';
      try { el.setPointerCapture(id); } catch { /* nada */ }
      if (floating) {
        // joystick flotante: aparece donde apoyás el pulgar (cómodo en iPhone y iPad)
        const pr = stick.offsetParent.getBoundingClientRect();
        stick.style.left = (e.clientX - pr.left - stick.offsetWidth / 2) + 'px';
        stick.style.top = (e.clientY - pr.top - stick.offsetHeight / 2) + 'px';
        stick.style.bottom = 'auto'; stick.style.right = 'auto';
        stick.classList.add('active');
        cx = e.clientX; cy = e.clientY;
      } else {
        const r = stick.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      }
      upd(e);
      if (this.onAnyInput) this.onAnyInput();
    };
    const move = (e) => { if (e.pointerId === id) upd(e); };
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      stick.style.left = ''; stick.style.top = ''; stick.style.bottom = ''; stick.style.right = '';
      stick.classList.remove('active');
      onEnd();
    };
    for (const [el, floating] of zones) {
      el.addEventListener('pointerdown', (e) => start(e, el, floating));
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
  }

  /** lee el primer joystick conectado (mapeo estándar: el de Xbox, PlayStation, etc.) */
  pollPad() {
    const P = this.pad;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const q of pads || []) if (q && q.connected && q.buttons.length >= 10) { gp = q; break; }
    if (!gp) { P.on = false; P.btn = {}; P.lx = P.ly = P.rx = P.ry = 0; return; }
    P.on = true;
    const b = (i) => { const x = gp.buttons[i]; return !!x && (x.pressed || x.value > 0.4); };
    const dz = (v) => (Math.abs(v || 0) < 0.2 ? 0 : v);
    const now = {
      a: b(0), b: b(1), x: b(2), y: b(3), lb: b(4), rb: b(5), lt: b(6), rt: b(7),
      back: b(8), start: b(9), ls: b(10), up: b(12), down: b(13), left: b(14), right: b(15),
    };
    const lx = dz(gp.axes[0]), ly = dz(gp.axes[1]);
    // el stick izquierdo también "aprieta" arriba/abajo/costados (para los menús y para cavar abajo)
    now.sup = ly < -0.6; now.sdown = ly > 0.6; now.sleft = lx < -0.6; now.sright = lx > 0.6;
    let any = false;
    for (const k in now) if (now[k] && !P.btn[k]) { this.edges.add('pad-' + k); any = true; }
    P.btn = now;
    P.lx = lx; P.ly = ly; P.rx = dz(gp.axes[2]); P.ry = dz(gp.axes[3]);
    if (any || Math.hypot(P.lx, P.ly) > 0.3 || Math.hypot(P.rx, P.ry) > 0.3 || now.lt || now.rt) {
      this.padSeen = true;
      this.lastDevice = 'pad';
      if (this.onAnyInput) this.onAnyInput();
    }
  }

  read(camX, camY) {
    this.pollPad();
    const k = (c) => this.keys.has(c);
    const e = (c) => this.edges.has(c);
    const T = this.touch, P = this.pad, B = P.btn;
    if (!this.enabled) return { mx: 0, my: 0 };
    const digKey = k('KeyJ') || k('KeyK') || k('KeyX') || T.dig;
    const upKey = k('ArrowUp') || k('KeyW');
    const downKey = k('ArrowDown') || k('KeyS');
    // joystick izquierdo: el de la pantalla o el del control (+ la cruz del control)
    const sx = T.sx || P.lx || (B.left ? -1 : B.right ? 1 : 0);
    const sy = T.sy || P.ly || (B.up ? -1 : B.down ? 1 : 0);
    // joystick derecho (apuntar): el de la pantalla en la pelea o el del control
    const padAim = Math.hypot(P.rx, P.ry) > 0.3;
    const aimOn = T.aimOn || padAim;
    const ax = T.aimOn ? T.ax : P.rx, ay = T.aimOn ? T.ay : P.ry;
    const fightUp = this.fightMode && sy < -0.6;
    const nav = e('pad-up') || e('pad-sup') ? -1 : e('pad-down') || e('pad-sdown') ? 1 : 0;
    const side = e('pad-left') || e('pad-sleft') ? -1 : e('pad-right') || e('pad-sright') ? 1 : 0;
    return {
      left: k('ArrowLeft') || k('KeyA') || sx < -0.35,
      right: k('ArrowRight') || k('KeyD') || sx > 0.35,
      up: upKey || sy < -0.55,
      down: downKey || sy > 0.55,
      glide: downKey || !!B.lt,       // S o ↓ (o LT): bajar despacio con el jetpack
      stickDown: sy > 0.55,           // joystick abajo: cavar hacia abajo
      jump: k('Space') || (!digKey && upKey) || T.jump || !!B.a || fightUp,
      jumpPressed: e('Space') || (!digKey && (e('ArrowUp') || e('KeyW'))) || e('t-jump') || e('pad-a') || (this.fightMode && (e('t-up') || e('pad-sup'))),
      dig: k('KeyJ') || k('KeyK') || k('KeyX') || !!B.rt,
      fire: !!B.rt,                   // gatillo del control: tirar agua (o cavar)
      sprint: k('ShiftLeft') || k('ShiftRight') || Math.abs(sx) > 0.92 || !!B.ls,
      stickDig: T.dig || (padAim && Math.hypot(P.rx, P.ry) > 0.5 && !this.fightMode),
      sx: T.dig ? T.sx : padAim && !this.fightMode ? P.rx : sx,
      sy: T.dig ? T.sy : padAim && !this.fightMode ? P.ry : sy,
      aimOn, ax, ay,
      digPressed: e('KeyJ') || e('KeyK') || e('KeyX') || e('t-dig') || e('pad-rt'),
      downPressed: e('t-down') || e('pad-sdown') || e('pad-down'),
      mouseDig: this.mouse.down || !!this.mouse.latched || !!this.touchAim,
      mouseAim: this.mouseSeen && this.lastDevice === 'mouse',
      mx: (this.touchAim ? this.touchAim.x : this.mouse.x) + camX,
      my: (this.touchAim ? this.touchAim.y : this.mouse.y) + camY,
      interact: e('KeyE') || e('Enter') || e('t-act') || e('pad-x') || e('pad-b'),
      musicPressed: e('KeyM'),
      sfxPressed: e('KeyN'),
      autoPressed: e('KeyB') || e('pad-lb'),
      torchPressed: e('KeyT') || e('Digit1') || e('t-torch') || e('pad-y'),
      pause: e('Escape') || e('KeyP') || e('pad-start'),
      // menús y escenas con el control
      padA: e('pad-a'), padB: e('pad-b'), padStart: e('pad-start'), padNav: nav, padSide: side,
    };
  }

  /** suelta el cavado automático (al pausar, abrir el taller, etc.) */
  releaseLatch() {
    this.mouse.latched = false;
    if (this.autoDig && this.touch.dig) {
      this.touch.dig = false;
      document.getElementById('t-dig').classList.remove('latched');
    }
  }

  setAutoDig(on) {
    this.autoDig = on;
    this.mouse.down = false;
    this.mouse.latched = false;
    this.touch.dig = false;
    document.getElementById('t-dig').classList.remove('latched', 'down');
  }

  endFrame() { this.edges.clear(); }
}
