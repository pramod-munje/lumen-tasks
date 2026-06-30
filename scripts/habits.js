/* =========================================================
   Habits, heatmap, water tracker
   ========================================================= */
window.LUMEN = window.LUMEN || {};

const HABITS = {
  init() {
    this.render();
    document.getElementById('add-habit').addEventListener('click', () => {
      const name = prompt('Habit name?');
      if (!name) return;
      const icon = prompt('Pick an emoji (e.g. 🎯)') || '🎯';
      LUMEN.STORE.state.habits.push({ id: LUMEN.uid(), name, icon, goal: '', log: {} });
      LUMEN.STORE.save();
      this.render();
    });
    this.renderWater();
    document.getElementById('water-row').addEventListener('click', (e) => {
      const g = e.target.closest('.water-glass');
      if (!g) return;
      const today = LUMEN.ymd();
      const cur = LUMEN.STORE.state.water[today] || 0;
      const idx = Number(g.dataset.idx);
      LUMEN.STORE.state.water[today] = (idx + 1 === cur) ? idx : idx + 1;
      LUMEN.STORE.save();
      this.renderWater();
    });
  },

  render() {
    const root = document.getElementById('habit-list');
    const today = LUMEN.ymd();
    root.innerHTML = LUMEN.STORE.state.habits.map(h => {
      const done = !!h.log[today];
      const streak = this._streak(h);
      return `
        <article class="habit-card" data-id="${h.id}">
          <div class="habit-icon">${h.icon}</div>
          <div class="habit-body">
            <div class="habit-title">${this._esc(h.name)}</div>
            <div class="habit-meta">${h.goal ? this._esc(h.goal) + ' · ' : ''}🔥 ${streak} day streak</div>
          </div>
          <button class="habit-check ${done ? 'done' : ''}" data-id="${h.id}" aria-label="Toggle habit">
            ${done ? '✓' : '+'}
          </button>
        </article>
      `;
    }).join('');

    root.querySelectorAll('.habit-card').forEach(card => {
      let pressTimer;
      card.addEventListener('pointerdown', () => {
        pressTimer = setTimeout(() => {
          const id = card.dataset.id;
          const h = LUMEN.STORE.state.habits.find(x => x.id === id);
          if (!h) return;
          if (confirm(`Delete habit "${h.name}"?`)) {
            LUMEN.STORE.state.habits = LUMEN.STORE.state.habits.filter(x => x.id !== id);
            LUMEN.STORE.save();
            this.render();
            this.renderHeatmap();
          }
        }, 600);
      });
      card.addEventListener('pointerup', () => clearTimeout(pressTimer));
      card.addEventListener('pointerleave', () => clearTimeout(pressTimer));
    });

    root.querySelectorAll('.habit-check').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const h = LUMEN.STORE.state.habits.find(x => x.id === id);
        if (!h) return;
        const today = LUMEN.ymd();
        if (h.log[today]) delete h.log[today]; else h.log[today] = true;
        LUMEN.STORE.save();
        this.render();
        this.renderHeatmap();
      });
    });

    this.renderHeatmap();
  },

  _streak(h) {
    let n = 0;
    const d = new Date();
    while (true) {
      if (h.log[LUMEN.ymd(d)]) { n += 1; d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  },

  renderHeatmap() {
    const root = document.getElementById('heatmap');
    const days = 30;
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ymd = LUMEN.ymd(d);
      let n = 0;
      LUMEN.STORE.state.habits.forEach(h => { if (h.log[ymd]) n += 1; });
      // also count tasks completed that day
      LUMEN.STORE.state.tasks.forEach(t => {
        if (!t.completedAt) return;
        if (LUMEN.ymd(new Date(t.completedAt)) === ymd) n += 1;
      });
      const lvl = n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4;
      cells.push(`<span class="hm-cell l${lvl}" title="${ymd}: ${n} actions"></span>`);
    }
    root.innerHTML = cells.join('');
  },

  renderWater() {
    const today = LUMEN.ymd();
    const count = LUMEN.STORE.state.water[today] || 0;
    const row = document.getElementById('water-row');
    row.innerHTML = Array.from({length: 8}, (_, i) =>
      `<div class="water-glass ${i < count ? 'filled' : ''}" data-idx="${i}"></div>`
    ).join('');
    document.getElementById('water-count').textContent = count;
  },

  _esc(s) { return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
};

LUMEN.HABITS = HABITS;
