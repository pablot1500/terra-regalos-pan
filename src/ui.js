// Interfaz HTML: HUD, taller, regalos, pausa y menú principal.
import { UPGRADES, GIFTS, CHARACTERS, LAYERS, MAX_DEPTH, HP_MAX, SUPPLIES } from './config.js';
import { ICON_URL, DOG, POPI, charPortrait } from './sprites.js';
import { fmtMoney } from './util.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.last = {};
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.isTouch) document.body.classList.add('touch');

    document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = ICON_URL[img.dataset.icon]; });
    document.querySelector('.shop-cat').src = charPortrait('carlos', 1).toDataURL(); // Carlos atiende el taller
    document.querySelector('.gift-img').src = ICON_URL.giftBig;

    // marcas de regalos en el medidor de profundidad
    const gauge = $('gauge');
    this.giftMarks = GIFTS.map((gf) => {
      const d = document.createElement('div');
      d.className = 'gauge-gift';
      d.style.top = (gf.depth / MAX_DEPTH) * 100 + '%';
      d.innerHTML = `<span>${gf.depth} m</span><img src="${ICON_URL.giftBig}" alt="">`;
      gauge.appendChild(d);
      return d;
    });

    // selección de personaje
    document.querySelectorAll('.char').forEach((b) => {
      const id = b.dataset.char;
      b.querySelector('img').src = ICON_URL['char_' + id];
      b.querySelector('span').textContent = CHARACTERS[id].name;
      b.addEventListener('click', () => { game.audio.unlock(); game.audio.play('ui'); this.selectChar(id); });
    });
    this.selectChar(game.charId);

    $('btn-splash').addEventListener('click', () => game.startIntro());
    $('intro-skip').addEventListener('click', () => game.scene && game.scene.skip());
    $('intro').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (game.scene) game.scene.advance(); });
    $('intro-note-ok').addEventListener('click', () => { const cb = this.noteCb; this.introNote(null); if (cb) cb(); });
    $('btn-intro').addEventListener('click', () => { game.audio.play('ui'); game.startIntro(); });
    // configuración y controles: se abren desde el título o desde la pausa
    const sub = (id, open) => {
      game.audio.play('ui');
      this.show(id, open);
      if (game.state === 'paused') this.show('screen-pause', !open);
    };
    for (const [btn, id] of [['btn-settings', 'screen-settings'], ['p-settings', 'screen-settings'], ['btn-controls', 'screen-controls'], ['p-controls', 'screen-controls']]) {
      $(btn).addEventListener('click', () => { game.audio.unlock(); sub(id, true); });
    }
    $('settings-ok').addEventListener('click', () => sub('screen-settings', false));
    $('controls-ok').addEventListener('click', () => sub('screen-controls', false));
    this.closeSub = () => {
      for (const id of ['screen-settings', 'screen-controls']) if (!$(id).classList.contains('hidden')) { sub(id, false); return true; }
      return false;
    };
    $('btn-new').addEventListener('click', () => { game.audio.unlock(); game.requestNewGame(); });
    $('btn-continue').addEventListener('click', () => { game.audio.unlock(); game.continueGame(); });
    $('btn-pause').addEventListener('click', () => game.pause());
    $('q-music').addEventListener('click', () => this.toggleMusic());
    $('q-sfx').addEventListener('click', () => this.toggleSfx());
    $('q-auto').addEventListener('click', () => this.toggleAuto());
    $('btn-resume').addEventListener('click', () => game.resume());
    $('btn-title').addEventListener('click', () => game.toTitle());
    $('btn-reset').addEventListener('click', () => game.confirmReset());
    $('btn-rematch').addEventListener('click', () => { game.audio.play('ui'); game.rematchBoss(); });
    $('btn-sfx').addEventListener('click', () => { game.audio.setSfx(!game.audio.sfxOn); this.refreshAudioBtns(); });
    $('btn-music').addEventListener('click', () => { game.audio.setMusic(!game.audio.musicOn); this.refreshAudioBtns(); });
    $('btn-duo').addEventListener('click', () => { game.audio.play('ui'); game.setDuo(!game.duo); this.refreshAudioBtns(); });
    $('shop-close').addEventListener('click', () => game.closeShop());
    $('screen-shop').addEventListener('click', (e) => { if (e.target.id === 'screen-shop') game.closeShop(); });
    $('gift-ok').addEventListener('click', () => game.closeGift());
    this.refreshAudioBtns();
    for (const k of ['music', 'sfx', 'jet']) {
      const el = $('vol-' + k), out = el.nextElementSibling;
      el.value = Math.round(game.audio.vol[k] * 100);
      out.textContent = el.value + '%';
      el.addEventListener('input', () => {
        game.audio.unlock();
        game.audio.setVolume(k, el.value / 100);
        out.textContent = el.value + '%';
      });
    }
    let auto = false;
    try { auto = localStorage.getItem('terra-regalos-pan:autodig') === '1'; } catch { /* nada */ }
    this.toggleAuto(auto);
    this.updateTitle();
  }

  selectChar(id) {
    this.g.charId = id;
    try { localStorage.setItem('terra-regalos-pan:char', id); } catch { /* nada */ }
    document.querySelectorAll('.char').forEach((b) => b.classList.toggle('sel', b.dataset.char === id));
    if ($('btn-duo')) this.refreshAudioBtns();
  }

  refreshAudioBtns() {
    $('btn-sfx').textContent = 'Sonidos: ' + (this.g.audio.sfxOn ? 'Sí' : 'No');
    $('btn-music').textContent = 'Música: ' + (this.g.audio.musicOn ? 'Sí' : 'No');
    const other = this.g.charId === 'pablo' ? 'Panchi' : 'Pablo';
    $('btn-duo').textContent = `Compañero (${other}): ` + (this.g.duo ? 'Sí' : 'No');
    $('q-sfx').classList.toggle('off', !this.g.audio.sfxOn);
    $('q-music').classList.toggle('off', !this.g.audio.musicOn);
    $('q-sfx').setAttribute('aria-pressed', String(this.g.audio.sfxOn));
    $('q-music').setAttribute('aria-pressed', String(this.g.audio.musicOn));
  }

  toggleMusic() {
    this.g.audio.unlock();
    this.g.audio.setMusic(!this.g.audio.musicOn);
    this.refreshAudioBtns();
    this.toast(this.g.audio.musicOn ? 'Música activada' : 'Música silenciada');
  }

  toggleSfx() {
    this.g.audio.unlock();
    this.g.audio.setSfx(!this.g.audio.sfxOn);
    this.refreshAudioBtns();
    this.toast(this.g.audio.sfxOn ? 'Sonidos activados' : 'Sonidos silenciados');
  }

  toggleAuto(on) {
    const g = this.g;
    const v = on === undefined ? !g.input.autoDig : on;
    g.input.setAutoDig(v);
    $('q-auto').classList.toggle('on', v);
    $('q-auto').setAttribute('aria-pressed', String(v));
    try { localStorage.setItem('terra-regalos-pan:autodig', v ? '1' : '0'); } catch { /* nada */ }
    if (on === undefined) {
      const how = this.isTouch ? 'un toque en CAVAR empieza, otro frena' : 'un click empieza a cavar, otro click frena';
      this.toast(v ? `Cavado automático: ${how}` : 'Cavado automático desactivado', 'good');
    }
  }

  updateTitle() {
    const has = !!this.g.savedData;
    $('btn-continue').classList.toggle('hidden', !has);
    $('btn-new').textContent = has ? 'Nueva partida' : 'Empezar';
    const hint = $('title-hint');
    if (has) {
      const s = this.g.savedData;
      const gifts = (s.gifts || []).length;
      hint.textContent = `Partida guardada: ${fmtMoney(s.money || 0)} · récord ${Math.floor(s.counters?.best || 0)} m · ${gifts}/${GIFTS.length} regalos`;
    } else {
      hint.textContent = this.isTouch ? 'Tip: jugalo con el celu acostado' : 'Tip: se juega con teclado o mouse';
    }
  }

  show(id, on = true) { $(id).classList.toggle('hidden', !on); }

  setPlaying(on) {
    this.show('hud', on);
    this.show('touch', on && this.isTouch);
    this.show('screen-title', !on);
    if (on) this.show('screen-splash', false);
  }

  // ---------- Intro ----------
  setIntro(on, skipLabel = 'Saltar intro ▸▸') {
    this.show('intro', on);
    $('intro').classList.toggle('on', on);
    $('intro-skip').textContent = skipLabel;
  }

  /** barra de vida de Aguilus (null la esconde) */
  setBossBar(frac) {
    const el = $('boss-bar');
    el.classList.toggle('hidden', frac === null);
    if (frac !== null) el.querySelector('.fill').style.width = Math.max(0, frac) * 100 + '%';
  }

  introCaption(text) {
    const el = $('intro-caption');
    if (text) el.textContent = text;
    el.classList.toggle('hidden', !text);
  }

  /** abre la caja de diálogo con quien habla (o la cierra con null) */
  introSay(name, face, text = '') {
    if (!name) { this.show('intro-box', false); return; }
    $('intro-name').textContent = name;
    $('intro-face').src = face;
    $('intro-text').textContent = text;
    this.show('intro-box', true);
  }

  introText(text) { $('intro-text').textContent = text; }

  introNote(text, onClose) {
    this.noteCb = text ? onClose : null;
    if (text) $('intro-note-text').textContent = text;
    this.show('intro-note', !!text);
  }

  // ---------- HUD ----------
  updateHUD() {
    const g = this.g, p = g.players[0];
    if (!p) return;
    const L = this.last;
    const hp = Math.ceil(p.hp), en = Math.ceil(p.energy), emax = g.stats.energyMax;
    if (L.hp !== hp) {
      L.hp = hp;
      $('bar-hp').querySelector('.fill').style.width = (hp / HP_MAX) * 100 + '%';
      $('bar-hp').querySelector('.num').textContent = `${hp}/${HP_MAX}`;
      $('bar-hp').classList.toggle('low', hp < HP_MAX * 0.3);
    }
    if (L.en !== en || L.emax !== emax) {
      L.en = en; L.emax = emax;
      $('bar-en').querySelector('.fill').style.width = (en / emax) * 100 + '%';
      $('bar-en').querySelector('.num').textContent = g.stats.infEnergy ? '∞' : `${en}/${emax}`;
      $('bar-en').classList.toggle('low', en < emax * 0.25);
    }
    const money = Math.floor(g.money);
    if (L.money !== money) {
      if (L.money !== undefined && money > L.money) {
        const mb = $('money-box');
        mb.classList.remove('bump'); void mb.offsetWidth; mb.classList.add('bump');
      }
      L.money = money;
      $('money').textContent = fmtMoney(money);
    }
    const depth = Math.floor(p.depth);
    if (L.depth !== depth) {
      L.depth = depth;
      $('depth-num').textContent = `${depth} m`;
      $('gauge-you').style.top = Math.min(100, (depth / MAX_DEPTH) * 100) + '%';
      $('gauge-fill').style.height = Math.min(100, (depth / MAX_DEPTH) * 100) + '%';
      let name = 'Superficie';
      if (p.resting) name = 'Casa';
      else if (depth > 0) {
        let acc = 0;
        for (const l of LAYERS) { if (depth < l.to) { name = l.name; break; } acc = l.to; }
      }
      $('depth-layer').textContent = name;
    }
    const best = Math.floor(g.counters.best);
    if (L.best !== best) {
      L.best = best;
      $('gauge-best').style.top = Math.min(100, (best / MAX_DEPTH) * 100) + '%';
    }
    const it = g.inv.torch;
    if (L.torch !== it) {
      L.torch = it;
      $('inv-torch').textContent = it;
      $('t-torch-n').textContent = it;
    }
    const opened = g.openedGifts.length;
    if (L.gifts !== opened) {
      L.gifts = opened;
      this.giftMarks.forEach((m, i) => m.classList.toggle('done', g.openedGifts.includes(GIFTS[i].id)));
    }
  }

  setPrompt(text) {
    if (this.last.prompt === text) return;
    this.last.prompt = text;
    const el = $('prompt');
    if (!text) { el.classList.add('hidden'); } else { el.textContent = text; el.classList.remove('hidden'); }
  }

  setActButton(label) {
    const el = $('t-act');
    if (this.last.act === label) return;
    this.last.act = label;
    if (!label) el.classList.add('hidden');
    else { el.textContent = label; el.classList.remove('hidden'); }
  }

  toast(msg, kind = '') {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 0.4s'; el.style.opacity = '0'; }, 2300);
    setTimeout(() => el.remove(), 2750);
  }

  // ---------- Taller ----------
  renderShop() {
    const g = this.g;
    $('shop-money').textContent = fmtMoney(g.money);
    const list = $('shop-list');
    list.innerHTML = '';
    const section = (txt) => { const h = document.createElement('h3'); h.className = 'shop-section'; h.textContent = txt; list.appendChild(h); };

    section('Consumibles');
    for (const [id, it] of Object.entries(SUPPLIES)) {
      const card = document.createElement('div');
      card.className = 'up supply';
      card.innerHTML = `
        <div class="up-ico"><img src="${ICON_URL[id]}" alt=""></div>
        <div><h4>${it.name} · ${fmtMoney(it.price)}</h4><p class="desc">${it.desc}</p></div>
        <p class="have">Tienen: ${g.inv[id]} · tecla T</p>
      `;
      const row = document.createElement('div');
      row.className = 'buy-row';
      for (const n of [1, 5]) {
        const b = document.createElement('button');
        b.className = 'btn' + (n === 5 ? ' alt' : '');
        b.textContent = `${n === 1 ? 'Comprar 1' : 'Comprar 5'} · ${fmtMoney(it.price * n)}`;
        b.disabled = g.money < it.price * n;
        b.addEventListener('click', () => g.buySupply(id, n));
        row.appendChild(b);
      }
      card.appendChild(row);
      list.appendChild(card);
    }

    section('Compañero');
    {
      const withMe = !!g.popi;
      const card = document.createElement('div');
      card.className = 'up supply';
      card.innerHTML = `
        <div class="up-ico"><img src="${(withMe ? POPI.right.idleA : DOG.happyA).toDataURL()}" alt="" style="width:36px;height:26px"></div>
        <div><h4>Popi</h4><p class="desc">Tu perro salchicha. Con su casquito y su mini jetpack camina, salta y vuela solo detrás tuyo, y te ayuda a cavar los bloques de al lado. No gasta energía ni se lastima.</p></div>
        <p class="have">${withMe ? 'Está con vos' : 'Te espera en el patio (acercate y apretá E, o tocá POPI)'}</p>
      `;
      const b = document.createElement('button');
      b.className = 'btn buy' + (withMe ? ' alt' : '');
      b.textContent = withMe ? 'Dejar a Popi en el patio' : 'Llevar a Popi';
      b.addEventListener('click', () => g.togglePopi());
      card.appendChild(b);
      list.appendChild(card);
    }

    section('Mejoras');
    for (const up of UPGRADES) {
      const lvl = g.upgrades[up.id];
      const max = lvl >= up.levels.length - 1;
      const [val] = up.levels[lvl];
      const next = max ? null : up.levels[lvl + 1];
      const icon = ICON_URL[up.id + '_' + lvl] || ICON_URL[up.icon];
      const tier = up.tiers ? up.tiers[lvl] : null;
      const nextTier = up.tiers && !max ? up.tiers[lvl + 1] : null;
      const card = document.createElement('div');
      card.className = 'up' + (max ? ' max' : '');
      const pips = up.levels.slice(1).map((_, i) => `<div class="pip ${i < lvl ? 'on' : ''}"></div>`).join('');
      card.innerHTML = `
        <div class="up-ico"><img src="${icon}" alt=""></div>
        <div><h4>${tier || up.name}</h4>${tier ? `<p class="tier">${up.name}</p>` : ''}<p class="desc">${up.desc}</p></div>
        <div class="pips">${pips}</div>
        <div class="vals"><span class="now">${up.label(val)}</span>${next ? `<span class="next">→ ${up.label(next[0])}${nextTier && nextTier !== tier ? ` · ${nextTier}` : ''}</span>` : '<span class="next">¡Al máximo!</span>'}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn buy';
      if (max) { btn.textContent = 'Completo'; btn.disabled = true; }
      else {
        btn.textContent = `Mejorar · ${fmtMoney(next[1])}`;
        btn.disabled = g.money < next[1];
        btn.addEventListener('click', () => g.buy(up.id));
      }
      card.appendChild(btn);
      list.appendChild(card);
    }
  }

  // ---------- Regalo ----------
  showGift(gift) {
    $('gift-kicker').textContent = `¡Regalo encontrado a ${gift.depth} m!`;
    $('gift-title').textContent = gift.title;
    $('gift-text').textContent = gift.text;
    $('gift-ok').textContent = gift.final ? '¡Gracias!' : '¡Seguir cavando!';
    this.show('screen-gift', true);
  }

  // ---------- Mensajes ----------
  /** botón de la pausa para volver a pelear con Aguilus (solo si ya le ganaste) */
  showRematch(on) { $('btn-rematch').classList.toggle('hidden', !on); }

  showMsg(title, text, buttons) {
    $('msg-title').textContent = title;
    $('msg-text').textContent = text;
    const box = $('msg-btns');
    box.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', () => { this.show('screen-msg', false); b.onClick && b.onClick(); });
      box.appendChild(el);
    }
    this.show('screen-msg', true);
  }

  fade(on, white = false) {
    if (on) $('fade').classList.toggle('white', white);
    $('fade').classList.toggle('on', on);
  }
}
