/* =========================================================
   Generic UI helpers: toast, confetti, ripple, nav, sheet.
   ========================================================= */
window.LUMEN = window.LUMEN || {};

const UI = {
  go(screen) {
    this.closeSheet();
    document.querySelectorAll('.screen').forEach(el => { el.setAttribute('hidden',''); el.style.display = 'none'; });
    const target = document.getElementById('screen-' + screen);
    if (target) {
      target.removeAttribute('hidden');
      target.style.display = '';
    } else {
      screen = 'home';
      const home = document.getElementById('screen-home');
      if (home) { home.removeAttribute('hidden'); home.style.display = ''; }
    }
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.nav === screen);
    });
    try { localStorage.setItem('lumen.screen', screen); } catch (_) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.dispatchEvent(new CustomEvent('lumen:screen', { detail: screen }));
  },

  toast(msg, ms = 1800) {
    const t = document.getElementById('toast');
    document.getElementById('toast-text').textContent = msg;
    t.removeAttribute('hidden');
    t.style.display = '';
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => { t.setAttribute('hidden',''); }, 300);
    }, ms);
  },

  ripple(el) {
    el.classList.add('ripple-host');
    el.addEventListener('pointerdown', (e) => {
      const rect = el.getBoundingClientRect();
      const r = document.createElement('span');
      r.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      r.style.width = r.style.height = size + 'px';
      r.style.left = (e.clientX - rect.left - size/2) + 'px';
      r.style.top  = (e.clientY - rect.top  - size/2) + 'px';
      el.appendChild(r);
      setTimeout(() => r.remove(), 650);
    });
  },

  confetti() {
    const c = document.getElementById('confetti');
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const ctx = c.getContext('2d');
    const colors = ['#8b5cf6','#22d3ee','#ec4899','#fbbf24','#34d399','#f43f5e'];
    const N = 130;
    const parts = Array.from({length:N}, () => ({
      x: window.innerWidth/2 + (Math.random()-.5)*160,
      y: window.innerHeight/2,
      vx: (Math.random()-.5) * 14,
      vy: (Math.random()*-1 - .4) * 14,
      g: 0.45,
      s: 6 + Math.random()*6,
      r: Math.random()*Math.PI,
      vr: (Math.random()-.5)*.3,
      c: colors[Math.floor(Math.random()*colors.length)],
      life: 0
    }));
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(32, now-last); last = now;
      ctx.clearRect(0,0,c.width,c.height);
      let alive = false;
      for (const p of parts) {
        p.life += dt;
        if (p.life > 2400) continue;
        alive = true;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - p.life/2400);
        ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s*0.6);
        ctx.restore();
      }
      if (alive) requestAnimationFrame(tick);
      else ctx.clearRect(0,0,c.width,c.height);
    };
    requestAnimationFrame(tick);
  },

  openSheet(task) {
    // Reset emoji row — hidden until tapped
    const emojiRow = document.getElementById('emoji-row');
    if (emojiRow) { emojiRow.hidden = true; emojiRow.style.display = 'none'; }

    // Show backdrop and sheet
    const backdrop = document.getElementById('sheet-backdrop');
    const sheet = document.getElementById('task-sheet');
    backdrop.removeAttribute('hidden');
    backdrop.style.display = 'block';
    sheet.removeAttribute('hidden');
    sheet.style.display = 'flex';

    sheet.dataset.editing = task ? task.id : '';
    document.getElementById('sheet-title').textContent = task ? 'Edit task' : 'New task';

    const f = {
      title: document.getElementById('f-title'),
      desc:  document.getElementById('f-desc'),
      cat:   document.getElementById('f-cat'),
      pri:   document.getElementById('f-pri'),
      date:  document.getElementById('f-date'),
      time:  document.getElementById('f-time'),
      dur:   document.getElementById('f-dur'),
      notes: document.getElementById('f-notes')
    };
    f.title.value = task?.title || '';
    f.desc.value  = task?.desc  || '';
    f.cat.value   = task?.cat   || 'personal';
    f.pri.value   = task?.pri   || 'med';
    f.date.value  = task?.date  || LUMEN.ymd();
    f.time.value  = task?.time  || '';
    f.dur.value   = task?.dur   || '';
    f.notes.value = task?.notes || '';
    document.getElementById('emoji-btn').textContent = task?.emoji || '✨';
    document.querySelectorAll('#color-row button').forEach(b => {
      b.classList.toggle('active', b.dataset.color === (task?.color || 'violet'));
    });
    document.getElementById('suggest-box').setAttribute('hidden','');
    setTimeout(() => f.title.focus(), 200);
  },

  closeSheet() {
    const backdrop = document.getElementById('sheet-backdrop');
    const sheet    = document.getElementById('task-sheet');
    const emojiRow = document.getElementById('emoji-row');
    const form     = document.getElementById('task-form');
    if (backdrop) { backdrop.setAttribute('hidden',''); backdrop.style.display = 'none'; }
    if (sheet)    { sheet.setAttribute('hidden','');    sheet.style.display = 'none'; }
    if (emojiRow) { emojiRow.setAttribute('hidden',''); emojiRow.style.display = 'none'; }
    if (form)     { form.reset(); }
  }
};

LUMEN.UI = UI;
