// Teclado, mouse y controles táctiles.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.edges = new Set();
    this.mouse = { down: false, x: 0, y: 0 };
    this.touch = { sx: 0, sy: 0, jump: false, dig: false };
    this.scale = 1;
    this.enabled = true;
    this.onAnyInput = null;

    const prevent = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (prevent.has(e.code)) e.preventDefault();
      if (!this.keys.has(e.code)) this.edges.add(e.code);
      this.keys.add(e.code);
      if (this.onAnyInput) this.onAnyInput();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouse.down = false; this.resetTouch(); });

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      this.mouse.down = true;
      this.setMouse(e, canvas);
      if (this.onAnyInput) this.onAnyInput();
    });
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') this.setMouse(e, canvas); });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') this.mouse.down = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.setupTouch();
  }

  setMouse(e, canvas) {
    const r = canvas.getBoundingClientRect();
    this.mouse.x = (e.clientX - r.left) / this.scale;
    this.mouse.y = (e.clientY - r.top) / this.scale;
  }

  resetTouch() {
    this.touch.sx = 0; this.touch.sy = 0; this.touch.jump = false; this.touch.dig = false;
  }

  setupTouch() {
    const stick = document.getElementById('stick');
    const knob = document.getElementById('stick-knob');
    let id = null, cx = 0, cy = 0;
    const R = 42;
    const upd = (e) => {
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
      this.touch.sx = dx / R; this.touch.sy = dy / R;
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    stick.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      id = e.pointerId;
      stick.setPointerCapture(id);
      const r = stick.getBoundingClientRect();
      cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      const prevDown = this.touch.sy > 0.55;
      upd(e);
      if (!prevDown && this.touch.sy > 0.55) this.edges.add('t-down');
      if (this.onAnyInput) this.onAnyInput();
    });
    stick.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const prevDown = this.touch.sy > 0.55;
      upd(e);
      if (!prevDown && this.touch.sy > 0.55) this.edges.add('t-down');
    });
    const end = (e) => {
      if (e.pointerId !== id) return;
      id = null; this.touch.sx = 0; this.touch.sy = 0;
      knob.style.transform = '';
    };
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);

    const btn = (elId, prop) => {
      const el = document.getElementById(elId);
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        if (prop) this.touch[prop] = true;
        this.edges.add(elId);
        el.classList.add('down');
        if (this.onAnyInput) this.onAnyInput();
      });
      const up = () => { if (prop) this.touch[prop] = false; el.classList.remove('down'); };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
    };
    btn('t-jump', 'jump');
    btn('t-dig', 'dig');
    btn('t-act', null);
  }

  read(camX, camY) {
    const k = (c) => this.keys.has(c);
    const e = (c) => this.edges.has(c);
    const T = this.touch;
    if (!this.enabled) return { mx: 0, my: 0 };
    const digKey = k('KeyJ') || k('KeyK') || k('KeyX') || T.dig;
    const upKey = k('ArrowUp') || k('KeyW');
    return {
      left: k('ArrowLeft') || k('KeyA') || T.sx < -0.35,
      right: k('ArrowRight') || k('KeyD') || T.sx > 0.35,
      up: upKey || T.sy < -0.55,
      down: k('ArrowDown') || k('KeyS') || T.sy > 0.55,
      jump: k('Space') || (!digKey && upKey) || T.jump,
      jumpPressed: e('Space') || (!digKey && (e('ArrowUp') || e('KeyW'))) || e('t-jump'),
      dig: digKey,
      digPressed: e('KeyJ') || e('KeyK') || e('KeyX') || e('t-dig'),
      downPressed: e('ArrowDown') || e('KeyS') || e('t-down'),
      mouseDig: this.mouse.down,
      mx: this.mouse.x + camX,
      my: this.mouse.y + camY,
      interact: e('KeyE') || e('Enter') || e('t-act'),
      pause: e('Escape') || e('KeyP'),
    };
  }

  endFrame() { this.edges.clear(); }
}
