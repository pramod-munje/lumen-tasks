/* =========================================================
   Tasks — CRUD, list rendering, kanban, swipe & drag.
   ========================================================= */
window.LUMEN = window.LUMEN || {};

const TASKS = {
  /* state for filtering */
  filter: 'all',
  cat: 'all',
  sort: 'smart',
  query: '',
  view: 'list',   // 'list' | 'grid' | 'board'

  init() {
    this.bindForm();
    this.bindFilters();
    this.bindCats();
    this.bindSearch();
    this.bindSort();
    this.bindViews();
    this.renderCats();
    this.render();
  },

  /* ----- form (sheet) ----- */
  bindForm() {
    document.getElementById('fab').addEventListener('click', () => LUMEN.UI.openSheet(null));
    document.getElementById('sheet-close').addEventListener('click', () => LUMEN.UI.closeSheet());
    document.getElementById('sheet-cancel').addEventListener('click', () => LUMEN.UI.closeSheet());
    document.getElementById('sheet-backdrop').addEventListener('click', () => LUMEN.UI.closeSheet());

    /* emoji picker */
    document.getElementById('emoji-btn').addEventListener('click', () => {
  const r = document.getElementById('emoji-row');
  if (r.hidden) {
    r.hidden = false;
    r.style.display = 'grid';
  } else {
    r.hidden = true;
    r.style.display = 'none';
  }
});
    document.querySelectorAll('#emoji-row button').forEach(b => {
      b.addEventListener('click', () => {
        document.getElementById('emoji-btn').textContent = b.dataset.emoji;
        document.getElementById('emoji-row').hidden = true;
      });
    });

    /* color tag */
    document.querySelectorAll('#color-row button').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#color-row button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      });
    });

    /* live smart suggestion */
    const title = document.getElementById('f-title');
    const date  = document.getElementById('f-date');
    const updateSuggest = () => {
      const sug = LUMEN.suggestPriority({
        title: title.value,
        date: date.value
      });
      const box = document.getElementById('suggest-box');
      if (sug) {
        document.getElementById('suggest-text').textContent =
          `Try ${sug.p === 'high' ? 'High' : sug.p === 'med' ? 'Medium' : 'Low'} priority — ${sug.reason}`;
        box.hidden = false;
        box.onclick = () => { document.getElementById('f-pri').value = sug.p; box.hidden = true; };
      } else {
        box.hidden = true;
      }
    };
    title.addEventListener('input', updateSuggest);
    date.addEventListener('change', updateSuggest);

    /* submit */
    document.getElementById('task-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const sheet = document.getElementById('task-sheet');
      const editing = sheet.dataset.editing;
      const color = document.querySelector('#color-row button.active')?.dataset.color || 'violet';
      const data = {
        title: title.value.trim(),
        desc:  document.getElementById('f-desc').value.trim(),
        cat:   document.getElementById('f-cat').value,
        pri:   document.getElementById('f-pri').value,
        date:  date.value,
        time:  document.getElementById('f-time').value,
        dur:   Number(document.getElementById('f-dur').value) || null,
        emoji: document.getElementById('emoji-btn').textContent,
        color,
        notes: document.getElementById('f-notes').value.trim()
      };
      if (!data.title) return;
      if (editing) {
        this.update(editing, data);
        LUMEN.UI.toast('Task updated');
      } else {
        this.create(data);
        LUMEN.UI.toast('Task added');
      }
      LUMEN.UI.closeSheet();
    });

    /* populate category dropdown */
    const cs = document.getElementById('f-cat');
    cs.innerHTML = LUMEN.CATEGORIES.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
    const custom = LUMEN.STORE.state.customCats || [];
    custom.forEach(c => { const o = document.createElement('option'); o.value = c.id; o.textContent = '✨ ' + c.name; cs.appendChild(o); });
  },

  /* ----- filters ----- */
  bindFilters() {
    document.getElementById('filter-row').addEventListener('click', (e) => {
      const b = e.target.closest('.filter-chip');
      if (!b) return;
      document.querySelectorAll('.filter-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      this.filter = b.dataset.filter;
      this.render();
    });
  },

  bindCats() {
    document.getElementById('cat-row').addEventListener('click', (e) => {
      const b = e.target.closest('.cat-pill');
      if (!b) return;
      document.querySelectorAll('.cat-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      this.cat = b.dataset.cat;
      this.render();
    });
  },

  bindSearch() {
    const s = document.getElementById('search');
    const c = document.getElementById('clear-search');
    s.addEventListener('input', () => {
      this.query = s.value.trim().toLowerCase();
      c.hidden = !this.query;
      this.render();
    });
    c.addEventListener('click', () => { s.value=''; this.query=''; c.hidden=true; this.render(); });
  },

  bindSort() {
    document.getElementById('sort').addEventListener('change', (e) => {
      this.sort = e.target.value;
      this.render();
    });
  },

  bindViews() {
    document.getElementById('toggle-view').addEventListener('click', () => {
      this.view = this.view === 'list' ? 'grid' : 'list';
      LUMEN.STORE.state.prefs.view = this.view;
      LUMEN.STORE.save();
      this.applyView();
      this.render();
    });
    document.getElementById('toggle-board').addEventListener('click', () => {
      this.view = this.view === 'board' ? 'list' : 'board';
      LUMEN.STORE.state.prefs.view = this.view;
      LUMEN.STORE.save();
      this.applyView();
      this.render();
    });
    this.view = LUMEN.STORE.state.prefs.view || 'list';
    this.applyView();
  },

  applyView() {
    const list = document.getElementById('task-list');
    const board = document.getElementById('board');
    const empty = document.getElementById('empty-state');
    if (this.view === 'board') {
      list.hidden = true; empty.hidden = true; board.hidden = false;
    } else {
      list.hidden = false; board.hidden = true;
      list.classList.toggle('grid', this.view === 'grid');
    }
  },

  renderCats() {
    const row = document.getElementById('cat-row');
    const cats = [{ id:'all', name:'All', icon:'⭐' }, ...LUMEN.CATEGORIES, ...(LUMEN.STORE.state.customCats || [])];
    row.innerHTML = cats.map(c => `
      <button class="cat-pill ${c.id===this.cat?'active':''}" data-cat="${c.id}">
        <span class="ico">${c.icon}</span><span>${c.name}</span>
      </button>
    `).join('') + `<button class="cat-pill" id="add-cat" data-cat="__new"><span class="ico">＋</span><span>New</span></button>`;
    document.getElementById('add-cat')?.addEventListener('click', () => this.addCustomCat(), { once: true });
  },

  addCustomCat() {
    const name = prompt('New category name?');
    if (!name) { this.renderCats(); return; }
    const id = 'c-' + LUMEN.uid();
    LUMEN.STORE.state.customCats.push({ id, name, icon: '✨' });
    LUMEN.STORE.save();
    this.renderCats();
    // also add to form dropdown
    const o = document.createElement('option'); o.value = id; o.textContent = '✨ ' + name;
    document.getElementById('f-cat').appendChild(o);
  },

  /* ----- CRUD ----- */
  create(data) {
    const t = {
      id: LUMEN.uid(),
      ...data,
      done: false,
      pinned: false,
      archived: false,
      board: 'todo',
      createdAt: Date.now(),
      completedAt: null
    };
    LUMEN.STORE.state.tasks.unshift(t);
    LUMEN.STORE.state.totalCreated += 1;
    LUMEN.STORE.save();
    this.render();
    document.dispatchEvent(new Event('lumen:tasks-changed'));
  },

  update(id, patch) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    LUMEN.STORE.save();
    this.render();
    document.dispatchEvent(new Event('lumen:tasks-changed'));
  },

  remove(id) {
    const i = LUMEN.STORE.state.tasks.findIndex(x => x.id === id);
    if (i < 0) return;
    LUMEN.STORE.state.tasks.splice(i, 1);
    LUMEN.STORE.save();
    this.render();
    document.dispatchEvent(new Event('lumen:tasks-changed'));
  },

  toggleDone(id) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    t.done = !t.done;
    t.completedAt = t.done ? Date.now() : null;
    t.board = t.done ? 'done' : (t.board === 'done' ? 'todo' : t.board);
    if (t.done) {
      LUMEN.STORE.state.totalCompleted += 1;
      LUMEN.STORE.state.xp += t.pri === 'high' ? 30 : t.pri === 'med' ? 20 : 10;
      const h = new Date().getHours();
      if (h >= 22) LUMEN.STORE.state.nightOwl = true;
      if (h < 7)  LUMEN.STORE.state.earlyBird = true;
      this.touchStreak();
    } else {
      LUMEN.STORE.state.totalCompleted = Math.max(0, LUMEN.STORE.state.totalCompleted - 1);
      LUMEN.STORE.state.xp = Math.max(0, LUMEN.STORE.state.xp - 10);
    }
    LUMEN.STORE.save();
    this.render();
    document.dispatchEvent(new Event('lumen:tasks-changed'));

    /* confetti when ALL today's tasks done */
    const todays = LUMEN.STORE.state.tasks.filter(x => !x.archived && x.date === LUMEN.ymd());
    if (todays.length && todays.every(x => x.done)) {
      LUMEN.UI.confetti();
      LUMEN.UI.toast('🎉 All today’s tasks complete!');
    }
  },

  togglePin(id) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    t.pinned = !t.pinned;
    LUMEN.STORE.save();
    this.render();
  },

  duplicate(id) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    const copy = { ...t, id: LUMEN.uid(), done: false, completedAt: null, pinned: false, createdAt: Date.now(), title: t.title + ' (copy)' };
    LUMEN.STORE.state.tasks.unshift(copy);
    LUMEN.STORE.save();
    this.render();
    LUMEN.UI.toast('Duplicated');
  },

  archive(id) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    t.archived = !t.archived;
    LUMEN.STORE.save();
    this.render();
    LUMEN.UI.toast(t.archived ? 'Archived' : 'Restored');
  },

  touchStreak() {
    const today = LUMEN.ymd();
    const last = LUMEN.STORE.state.lastActiveDate;
    if (last === today) return;
    if (last && LUMEN.diffDays(today, last) === 1) {
      LUMEN.STORE.state.streak += 1;
    } else {
      LUMEN.STORE.state.streak = 1;
    }
    LUMEN.STORE.state.bestStreak = Math.max(LUMEN.STORE.state.bestStreak, LUMEN.STORE.state.streak);
    LUMEN.STORE.state.lastActiveDate = today;
  },

  /* ----- filtering & sorting ----- */
  filtered() {
    let list = LUMEN.STORE.state.tasks.slice();
    if (this.filter === 'archived')      list = list.filter(t => t.archived);
    else                                  list = list.filter(t => !t.archived);

    if (this.filter === 'today')    list = list.filter(t => t.date === LUMEN.ymd());
    if (this.filter === 'upcoming') list = list.filter(t => t.date && t.date > LUMEN.ymd());
    if (this.filter === 'overdue')  list = list.filter(t => LUMEN.isOverdue(t));
    if (this.filter === 'pinned')   list = list.filter(t => t.pinned);
    if (this.filter === 'done')     list = list.filter(t => t.done);
    if (this.cat !== 'all')         list = list.filter(t => t.cat === this.cat);
    if (this.query) {
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(this.query) ||
        (t.desc  || '').toLowerCase().includes(this.query) ||
        (t.notes || '').toLowerCase().includes(this.query)
      );
    }

    const priRank = { high: 0, med: 1, low: 2 };
    list.sort((a,b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      switch (this.sort) {
        case 'date':
          if (!a.date) return 1; if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        case 'priority': return priRank[a.pri] - priRank[b.pri];
        case 'created':  return b.createdAt - a.createdAt;
        case 'alpha':    return a.title.localeCompare(b.title);
        default: {       // smart
          if (a.done !== b.done) return a.done ? 1 : -1;
          const od = LUMEN.isOverdue(a) - LUMEN.isOverdue(b);
          if (od !== 0) return od < 0 ? 1 : -1;
          const p = priRank[a.pri] - priRank[b.pri];
          if (p !== 0) return p;
          if (a.date && b.date) return a.date.localeCompare(b.date);
          return b.createdAt - a.createdAt;
        }
      }
    });
    return list;
  },

  /* ----- render ----- */
  render() {
    const list = this.filtered();
    document.getElementById('result-count').textContent =
      `${list.length} task${list.length === 1 ? '' : 's'}`;

    if (this.view === 'board') {
      this.renderBoard(list);
    } else {
      const root = document.getElementById('task-list');
      root.innerHTML = list.map(t => this.cardHTML(t)).join('');
      document.getElementById('empty-state').hidden = list.length > 0;
      this.bindCards(root);
    }

    this.renderTodayPreview();
  },

  renderTodayPreview() {
    const root = document.getElementById('today-list');
    if (!root) return;
    const list = LUMEN.STORE.state.tasks
      .filter(t => !t.archived && t.date === LUMEN.ymd())
      .sort((a,b) => (a.done - b.done) || (a.time || '99').localeCompare(b.time || '99'))
      .slice(0, 4);
    if (list.length === 0) {
      root.innerHTML = `<div class="empty-state" style="padding:20px"><div class="empty-sub">Nothing scheduled for today. Add a task to get started.</div></div>`;
    } else {
      root.innerHTML = list.map(t => this.cardHTML(t)).join('');
    }
    this.bindCards(root);
  },

  cardHTML(t) {
    const cat = LUMEN.CATEGORIES.find(c => c.id === t.cat)
             || (LUMEN.STORE.state.customCats || []).find(c => c.id === t.cat)
             || { name: 'Other', icon: '•' };
    const colorMap = { violet:'#8b5cf6', blue:'#3b82f6', green:'#10b981', orange:'#f97316', pink:'#ec4899', cyan:'#06b6d4' };
    const overdue = LUMEN.isOverdue(t);
    const dateLabel = t.date ? this._dateLabel(t.date) : '';
    return `
      <article class="task-card ${t.done ? 'done' : ''} ${t.pinned ? 'pinned' : ''}" data-id="${t.id}" style="--task-c:${colorMap[t.color] || '#8b5cf6'}">
        <button class="check" data-act="toggle" aria-label="Toggle done">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>
        </button>
        <div class="task-body">
          <div class="task-head">
            <span class="task-emoji">${t.emoji || '✨'}</span>
            <div class="task-title">${this._esc(t.title)}</div>
          </div>
          ${t.desc ? `<div class="task-desc">${this._esc(t.desc)}</div>` : ''}
          <div class="task-meta">
            <span class="meta-chip pri-${t.pri}">${t.pri === 'high' ? 'High' : t.pri === 'med' ? 'Medium' : 'Low'}</span>
            <span class="meta-chip">${cat.icon} ${cat.name}</span>
            ${dateLabel ? `<span class="meta-chip ${overdue ? 'overdue' : ''}">📅 ${dateLabel}${t.time ? ' · ' + t.time : ''}</span>` : ''}
            ${t.dur ? `<span class="meta-chip">⏱ ${t.dur}m</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          <button class="task-action ${t.pinned ? 'pinned' : ''}" data-act="pin" aria-label="Pin">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${t.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"><path d="M12 17v5M9 3h6l-1.5 4 3 4-3 3h-3l-3-3 3-4z"/></svg>
          </button>
          <button class="task-action" data-act="more" aria-label="More">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>
          </button>
        </div>
      </article>
    `;
  },

  _esc(s) { return (s||'').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); },

  _dateLabel(d) {
    const today = LUMEN.ymd();
    const tom = LUMEN.ymd(new Date(Date.now() + 86400000));
    const yes = LUMEN.ymd(new Date(Date.now() - 86400000));
    if (d === today) return 'Today';
    if (d === tom)   return 'Tomorrow';
    if (d === yes)   return 'Yesterday';
    const dt = LUMEN.parseYMD(d);
    return dt.toLocaleDateString(undefined, { month:'short', day:'numeric' });
  },

  /* ----- bind card events: tap, swipe, long-press ----- */
  bindCards(root) {
    root.querySelectorAll('.task-card').forEach(card => {
      const id = card.dataset.id;
      card.querySelector('[data-act="toggle"]').addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleDone(id);
      });
      card.querySelector('[data-act="pin"]').addEventListener('click', (e) => {
        e.stopPropagation(); this.togglePin(id);
      });
      card.querySelector('[data-act="more"]').addEventListener('click', (e) => {
        e.stopPropagation(); this.showActions(id, e);
      });
      card.addEventListener('click', () => {
        const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
        if (t) LUMEN.UI.openSheet(t);
      });
      this.attachSwipe(card, id);
    });
  },

  showActions(id, evt) {
    const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
    if (!t) return;
    const actions = [
      { k: 'Edit',       fn: () => LUMEN.UI.openSheet(t) },
      { k: 'Duplicate',  fn: () => this.duplicate(id) },
      { k: t.archived ? 'Restore' : 'Archive', fn: () => this.archive(id) },
      { k: 'Delete',     fn: () => { if (confirm('Delete this task?')) this.remove(id); } }
    ];
    const choice = prompt(
      'Actions: ' + actions.map((a,i)=>`${i+1}) ${a.k}`).join('  ') + '\n\nEnter number:'
    );
    const idx = parseInt(choice, 10) - 1;
    if (idx >= 0 && actions[idx]) actions[idx].fn();
  },

  /* swipe: drag right > 40% = complete, drag left > 40% = delete */
  attachSwipe(card, id) {
    let startX = 0, curX = 0, dragging = false;
    const W = () => card.offsetWidth;
    const reset = () => { card.style.transition = 'transform .25s var(--ease-out)'; card.style.transform = ''; };

    card.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;   // ignore button taps
      dragging = true;
      startX = e.clientX;
      card.style.transition = 'none';
      card.setPointerCapture(e.pointerId);
    });
    card.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      curX = e.clientX - startX;
      card.style.transform = `translateX(${curX}px)`;
      card.style.background = curX > 30
        ? `linear-gradient(90deg, rgba(34,197,94,.18), var(--glass))`
        : curX < -30
        ? `linear-gradient(90deg, var(--glass), rgba(244,63,94,.18))`
        : '';
    });
    card.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      dragging = false;
      card.style.background = '';
      const thresh = W() * 0.4;
      if (curX > thresh) {
        card.style.transition = 'transform .25s';
        card.style.transform = `translateX(${W()}px)`;
        setTimeout(() => { this.toggleDone(id); }, 200);
      } else if (curX < -thresh) {
        card.classList.add('swipe-removing');
        setTimeout(() => this.remove(id), 320);
      } else {
        reset();
      }
      curX = 0;
    });
    card.addEventListener('pointercancel', () => { dragging = false; reset(); });
  },

  /* ----- kanban board ----- */
  renderBoard(list) {
    ['todo','doing','done'].forEach(col => {
      const body = document.querySelector(`[data-col-body="${col}"]`);
      const items = list.filter(t => (t.board || (t.done ? 'done' : 'todo')) === col);
      body.innerHTML = items.map(t => this.cardHTML(t)).join('') ||
        `<div class="muted small" style="padding:8px 4px">Drop tasks here</div>`;
      this.bindCards(body);

      /* drop target */
      body.ondragover = (e) => { e.preventDefault(); body.classList.add('drag-over'); };
      body.ondragleave = () => body.classList.remove('drag-over');
      body.ondrop = (e) => {
        e.preventDefault(); body.classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        const t = LUMEN.STORE.state.tasks.find(x => x.id === id);
        if (t) {
          t.board = col;
          if (col === 'done' && !t.done) this.toggleDone(id);
          else if (col !== 'done' && t.done) this.toggleDone(id);
          else { LUMEN.STORE.save(); this.render(); }
        }
      };
    });
    /* draggable */
    document.querySelectorAll('.board .task-card').forEach(card => {
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        card.style.opacity = '.5';
      });
      card.addEventListener('dragend', () => { card.style.opacity = '1'; });
    });
  }
};

LUMEN.TASKS = TASKS;
