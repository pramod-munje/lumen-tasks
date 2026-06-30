/* =========================================================
   App boot — wire everything together
   ========================================================= */
(function () {
  LUMEN.STORE.load();

  /* ---------- apply prefs ---------- */
  const p = LUMEN.STORE.state.prefs;
  document.body.dataset.theme   = p.theme;
  document.body.dataset.accent  = p.accent;
  document.body.dataset.density = p.density;
  document.documentElement.style.setProperty('--font-scale', p.fontScale || 1);

  /* ---------- greeting + date ---------- */
  function setGreeting() {
    const h = new Date().getHours();
    const g = h < 5 ? 'Still up?' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Good night';
    document.getElementById('greeting').textContent = g;
    document.getElementById('today').textContent =
      new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
  }
  setGreeting();

  /* ---------- dashboard stats ---------- */
  function renderDashboard() {
    const today = LUMEN.ymd();
    const todays = LUMEN.STORE.state.tasks.filter(t => !t.archived && t.date === today);
    const done = todays.filter(t => t.done).length;
    const total = todays.length;
    const pct = total ? Math.round(done/total * 100) : 0;
    document.getElementById('ring-pct').textContent = pct + '%';
    const C = 2*Math.PI*52;
    const ring = document.getElementById('ring-fg');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - pct/100);

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-done').textContent  = done;
    document.getElementById('stat-left').textContent  = total - done;
    document.getElementById('stat-streak').firstChild.textContent = LUMEN.STORE.state.streak || 0;
  }
  document.addEventListener('lumen:tasks-changed', renderDashboard);

  /* ---------- widgets: quote + challenge + tip ---------- */
  function pickDaily(arr) {
    /* stable for the day */
    const d = new Date();
    const seed = d.getFullYear()*1000 + (d.getMonth()+1)*40 + d.getDate();
    return arr[seed % arr.length];
  }
  const q = pickDaily(LUMEN.QUOTES);
  document.getElementById('quote-text').textContent = `“${q.t}”`;
  document.getElementById('quote-author').textContent = '— ' + q.a;
  const ch = pickDaily(LUMEN.CHALLENGES);
  document.getElementById('challenge-text').textContent = ch;
  const cBtn = document.getElementById('challenge-done');
  const ymd = LUMEN.ymd();
  if (LUMEN.STORE.state.challengeDone[ymd]) { cBtn.classList.add('done'); cBtn.textContent = '✓ Done'; }
  cBtn.addEventListener('click', () => {
    LUMEN.STORE.state.challengeDone[ymd] = true;
    LUMEN.STORE.state.xp += 5;
    LUMEN.STORE.save();
    cBtn.classList.add('done');
    cBtn.textContent = '✓ Done';
    LUMEN.UI.toast('Challenge complete (+5 XP)');
    document.dispatchEvent(new Event('lumen:tasks-changed'));
  });

  /* ---------- mood + energy ---------- */
  const moodToday = LUMEN.STORE.state.mood[ymd] || {};
  if (moodToday.mood) {
    const el = document.querySelector(`[data-mood="${moodToday.mood}"]`);
    if (el) el.classList.add('active');
  }
  document.getElementById('mood-row').addEventListener('click', (e) => {
    const b = e.target.closest('.mood-pill');
    if (!b) return;
    document.querySelectorAll('.mood-pill').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    LUMEN.STORE.state.mood[ymd] = { ...(LUMEN.STORE.state.mood[ymd]||{}), mood: b.dataset.mood };
    LUMEN.STORE.save();
    LUMEN.UI.toast('Mood saved');
  });
  const energy = document.getElementById('energy');
  energy.value = moodToday.energy ?? 5;
  document.getElementById('energy-val').textContent = energy.value;
  energy.addEventListener('input', () => {
    document.getElementById('energy-val').textContent = energy.value;
    LUMEN.STORE.state.mood[ymd] = { ...(LUMEN.STORE.state.mood[ymd]||{}), energy: +energy.value };
    LUMEN.STORE.save();
  });

  /* ---------- nav ---------- */
  document.getElementById('bottom-nav').addEventListener('click', (e) => {
    const b = e.target.closest('.nav-item');
    if (!b) return;
    LUMEN.UI.go(b.dataset.nav);
  });
  document.querySelectorAll('[data-nav]').forEach(b => {
    if (b.classList.contains('nav-item')) return;
    b.addEventListener('click', () => LUMEN.UI.go(b.dataset.nav));
  });
  document.getElementById('open-settings').addEventListener('click', () => LUMEN.UI.go('settings'));

  /* ---------- settings: theme / accent / density / font ---------- */
  document.getElementById('theme-picker').addEventListener('click', (e) => {
    const b = e.target.closest('.theme-dot');
    if (!b) return;
    document.body.dataset.theme = b.dataset.theme;
    LUMEN.STORE.state.prefs.theme = b.dataset.theme;
    LUMEN.STORE.save();
    document.querySelectorAll('.theme-dot').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });
  document.getElementById('accent-picker').addEventListener('click', (e) => {
    const b = e.target.closest('.accent-dot');
    if (!b) return;
    document.body.dataset.accent = b.dataset.accent;
    LUMEN.STORE.state.prefs.accent = b.dataset.accent;
    LUMEN.STORE.save();
    document.querySelectorAll('.accent-dot').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });
  document.getElementById('density-picker').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    document.body.dataset.density = b.dataset.density;
    LUMEN.STORE.state.prefs.density = b.dataset.density;
    LUMEN.STORE.save();
    document.querySelectorAll('#density-picker button').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
  });
  document.getElementById('font-size').addEventListener('input', (e) => {
    const v = +e.target.value;
    document.documentElement.style.setProperty('--font-scale', v/100);
    document.getElementById('font-val').textContent = v;
    LUMEN.STORE.state.prefs.fontScale = v/100;
    LUMEN.STORE.save();
  });
  /* highlight active settings */
  document.querySelector(`.theme-dot[data-theme="${p.theme}"]`)?.classList.add('active');
  document.querySelector(`.accent-dot[data-accent="${p.accent}"]`)?.classList.add('active');
  document.querySelectorAll('#density-picker button').forEach(b => b.classList.toggle('active', b.dataset.density === p.density));
  document.getElementById('font-size').value = Math.round((p.fontScale || 1) * 100);
  document.getElementById('font-val').textContent = Math.round((p.fontScale || 1) * 100);

  /* ---------- settings: notifications ---------- */
  document.getElementById('notif-enable').addEventListener('click', async () => {
    if (!('Notification' in window)) return LUMEN.UI.toast('Notifications not supported');
    const r = await Notification.requestPermission();
    LUMEN.UI.toast(r === 'granted' ? 'Notifications enabled' : 'Permission denied');
  });
  document.getElementById('daily-reminder').checked = !!p.dailyReminder;
  document.getElementById('daily-reminder').addEventListener('change', (e) => {
    LUMEN.STORE.state.prefs.dailyReminder = e.target.checked;
    LUMEN.STORE.save();
  });

  /* ---------- settings: data ---------- */
  document.getElementById('export-json').addEventListener('click', () => {
    const data = LUMEN.STORE.exportJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lumen-backup-${LUMEN.ymd()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    LUMEN.UI.toast('Backup exported');
  });
  document.getElementById('import-json').addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try { LUMEN.STORE.importJSON(r.result); location.reload(); }
      catch (err) { LUMEN.UI.toast('Invalid file'); }
    };
    r.readAsText(file);
  });
  document.getElementById('reset-app').addEventListener('click', () => {
    if (confirm('Erase ALL data? This cannot be undone.')) {
      LUMEN.STORE.reset(); location.reload();
    }
  });

  /* ---------- ripples on buttons ---------- */
  document.querySelectorAll('.primary-btn, .ghost-btn, .chip-btn, .fab').forEach(el => LUMEN.UI.ripple(el));

  /* ---------- init modules ---------- */
  LUMEN.TASKS.init();
  LUMEN.HABITS.init();
  LUMEN.STATS.init();

  /* initial dashboard paint */
  renderDashboard();

  /* restore last screen */
  let last = localStorage.getItem('lumen.screen') || 'home';
  if (!document.getElementById('screen-' + last)) last = 'home';
  LUMEN.UI.go(last);

  /* reminder polling — every minute */
  setInterval(() => {
    if (Notification?.permission !== 'granted') return;
    const now = new Date();
    const ymd = LUMEN.ymd();
    const hh = String(now.getHours()).padStart(2,'0');
    const mm = String(now.getMinutes()).padStart(2,'0');
    LUMEN.STORE.state.tasks.forEach(t => {
      if (t.done || t.archived) return;
      if (t.date === ymd && t.time === `${hh}:${mm}` && !t._notified) {
        new Notification(t.emoji + ' ' + t.title, { body: t.desc || 'Time to focus' });
        t._notified = true;
      }
    });
  }, 30000);

  /* refresh dashboard at midnight */
  function scheduleMidnight() {
    const n = new Date();
    const m = new Date(n.getFullYear(), n.getMonth(), n.getDate()+1, 0, 0, 5);
    setTimeout(() => {
      setGreeting();
      renderDashboard();
      LUMEN.TASKS.render();
      LUMEN.HABITS.render();
      scheduleMidnight();
    }, m - n);
  }
  scheduleMidnight();
})();
