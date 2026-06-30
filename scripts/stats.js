/* =========================================================
   Stats / insights — XP, graph, weekly/monthly, calendar, badges
   ========================================================= */
window.LUMEN = window.LUMEN || {};

const STATS = {
  cur: new Date(),
  selected: LUMEN.ymd(),

  init() {
    this.bindTabs();
    this.bindCal();
    this.render();
    document.addEventListener('lumen:tasks-changed', () => this.render());
    document.addEventListener('lumen:screen', (e) => {
      if (e.detail === 'stats') {
        this.render();
        // re-draw canvas after layout settles (in case it was hidden)
        requestAnimationFrame(() => this.drawGraph());
      }
    });
  },

  bindTabs() {
    document.getElementById('stats-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('.seg-tab');
      if (!b) return;
      document.querySelectorAll('.seg-tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.stats-tab').forEach(t => { t.hidden = true; });
      document.getElementById('tab-' + b.dataset.tab).hidden = false;
      if (b.dataset.tab === 'overview') this.drawGraph();
      if (b.dataset.tab === 'calendar') this.renderCalendar();
      if (b.dataset.tab === 'badges')   this.renderBadges();
    });
  },

  bindCal() {
    document.getElementById('cal-prev').addEventListener('click', () => { this.cur.setMonth(this.cur.getMonth()-1); this.renderCalendar(); });
    document.getElementById('cal-next').addEventListener('click', () => { this.cur.setMonth(this.cur.getMonth()+1); this.renderCalendar(); });
  },

  render() {
    const s = LUMEN.STORE.state;
    const { level, need, into } = this.levelInfo(s.xp);
    document.getElementById('level-num').textContent = level;
    document.getElementById('xp-cur').textContent = into;
    document.getElementById('xp-need').textContent = need;
    document.getElementById('xp-fill').style.width = ((into / need) * 100) + '%';

    const today = new Date();
    const wkAgo = new Date(); wkAgo.setDate(today.getDate() - 6);
    const mAgo  = new Date(); mAgo.setDate(today.getDate() - 29);
    const completedSince = (d) => s.tasks.filter(t => t.completedAt && new Date(t.completedAt) >= d).length;
    document.getElementById('report-week').textContent  = completedSince(wkAgo);
    document.getElementById('report-month').textContent = completedSince(mAgo);
    const totalCreated = Math.max(1, s.totalCreated);
    document.getElementById('report-pct').textContent = Math.round((s.totalCompleted / totalCreated) * 100);
    document.getElementById('report-streak').textContent = s.bestStreak || 0;

    this.drawGraph();
    this.checkBadges();
  },

  levelInfo(xp) {
    // Each level costs 100 * level XP (so 100, 200, 300...)
    let lv = 1, need = 100, into = xp;
    while (into >= need) { into -= need; lv += 1; need = 100 * lv; }
    return { level: lv, need, into };
  },

  drawGraph() {
    const canvas = document.getElementById('graph');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    /* high-DPI handling */
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 160;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    /* last 14 days completed counts */
    const days = 14;
    const counts = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - i);
      const ymd = LUMEN.ymd(d);
      counts.push(LUMEN.STORE.state.tasks.filter(t => t.completedAt && LUMEN.ymd(new Date(t.completedAt)) === ymd).length);
    }
    const max = Math.max(3, ...counts);
    const pad = 14;
    const innerW = w - pad*2;
    const innerH = h - pad*2 - 14;
    const stepX = innerW / (days - 1);

    /* gridlines */
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad + (innerH/4)*g;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(pad + innerW, y); ctx.stroke();
    }

    /* area + line */
    const styles = getComputedStyle(document.documentElement);
    const a1 = styles.getPropertyValue('--accent-1').trim() || '#8b5cf6';
    const a2 = styles.getPropertyValue('--accent-2').trim() || '#22d3ee';
    const grd = ctx.createLinearGradient(0, pad, 0, pad + innerH);
    grd.addColorStop(0, this._withAlpha(a1, 0.35));
    grd.addColorStop(1, this._withAlpha(a2, 0.02));

    const pts = counts.map((c, i) => ({
      x: pad + i*stepX,
      y: pad + innerH - (c/max) * innerH
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pad + innerH);
    pts.forEach((p, i) => {
      if (i === 0) ctx.lineTo(p.x, p.y);
      else {
        const prev = pts[i-1];
        const cx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
      }
    });
    ctx.lineTo(pts[pts.length-1].x, pad + innerH);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    /* stroke */
    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else {
        const prev = pts[i-1];
        const cx = (prev.x + p.x) / 2;
        ctx.bezierCurveTo(cx, prev.y, cx, p.y, p.x, p.y);
      }
    });
    const stroke = ctx.createLinearGradient(0, 0, w, 0);
    stroke.addColorStop(0, a1); stroke.addColorStop(1, a2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    /* dots */
    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      ctx.fillStyle = a2;
      ctx.fill();
    });

    /* labels */
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.font = '10px -apple-system,system-ui,sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i < days; i += 3) {
      const d = new Date(); d.setDate(d.getDate() - (days-1-i));
      ctx.fillText(d.toLocaleDateString(undefined, { weekday: 'short' }), pad + i*stepX, h - 2);
    }

    document.getElementById('graph-total').textContent = `${counts.reduce((a,b)=>a+b,0)} completed`;
  },

  _withAlpha(c, a) {
    /* accept #rrggbb */
    const m = c.match(/#?([0-9a-f]{6})/i);
    if (!m) return c;
    const h = m[1];
    const r = parseInt(h.slice(0,2), 16), g = parseInt(h.slice(2,4), 16), b = parseInt(h.slice(4,6), 16);
    return `rgba(${r},${g},${b},${a})`;
  },

  renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const title = document.getElementById('cal-title');
    const m = this.cur.getMonth(), y = this.cur.getFullYear();
    title.textContent = this.cur.toLocaleDateString(undefined, { month:'long', year:'numeric' });
    const first = new Date(y, m, 1);
    const start = first.getDay();          // 0=Sun
    const dim = new Date(y, m+1, 0).getDate();
    const prevDim = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < start; i++) {
      const d = prevDim - start + 1 + i;
      cells.push({ day: d, ymd: null, muted: true });
    }
    for (let d = 1; d <= dim; d++) {
      const ymd = LUMEN.ymd(new Date(y, m, d));
      cells.push({ day: d, ymd, muted: false });
    }
    while (cells.length % 7 !== 0) cells.push({ day: cells.length - dim - start + 1, ymd: null, muted: true });

    const today = LUMEN.ymd();
    grid.innerHTML = cells.map(c => {
      const hasTasks = c.ymd && LUMEN.STORE.state.tasks.some(t => !t.archived && t.date === c.ymd);
      return `<div class="cal-day ${c.muted ? 'muted' : ''} ${c.ymd === today ? 'today' : ''} ${c.ymd === this.selected ? 'selected' : ''} ${hasTasks ? 'has-tasks' : ''}" data-ymd="${c.ymd || ''}">${c.day}</div>`;
    }).join('');

    grid.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        if (!el.dataset.ymd) return;
        this.selected = el.dataset.ymd;
        this.renderCalendar();
        this.renderCalDayList();
      });
    });

    this.renderCalDayList();
  },

  renderCalDayList() {
    const list = LUMEN.STORE.state.tasks
      .filter(t => !t.archived && t.date === this.selected);
    document.getElementById('cal-day-title').textContent =
      LUMEN.parseYMD(this.selected).toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
    const root = document.getElementById('cal-day-list');
    if (list.length === 0) {
      root.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-sub">No tasks on this day.</div></div>`;
    } else {
      root.innerHTML = list.map(t => LUMEN.TASKS.cardHTML(t)).join('');
      LUMEN.TASKS.bindCards(root);
    }
  },

  /* ----- badges ----- */
  checkBadges() {
    const s = LUMEN.STORE.state;
    LUMEN.BADGES.forEach(b => {
      if (b.check(s) && !s.badges.includes(b.id)) {
        s.badges.push(b.id);
        LUMEN.UI.toast(`🏆 Badge unlocked: ${b.name}`);
      }
    });
    LUMEN.STORE.save();
  },

  renderBadges() {
    const root = document.getElementById('badge-grid');
    const unlocked = LUMEN.STORE.state.badges || [];
    root.innerHTML = LUMEN.BADGES.map(b => {
      const u = unlocked.includes(b.id);
      return `
        <div class="badge-card ${u ? 'unlocked' : 'locked'}">
          <div class="badge-icon">${b.icon}</div>
          <div class="badge-name">${b.name}</div>
          <div class="badge-desc">${b.desc}</div>
        </div>
      `;
    }).join('');
  }
};

LUMEN.STATS = STATS;
