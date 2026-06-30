/* =========================================================
   LocalStorage layer — single source of truth.
   Everything passes through STORE so persistence is trivial.
   ========================================================= */

window.LUMEN = window.LUMEN || {};

const STORE_KEY = 'lumen.v1';

const DEFAULT_STATE = {
  tasks: [],            // {id,title,desc,cat,pri,date,time,dur,emoji,color,notes,done,pinned,archived,createdAt,completedAt,board}
  habits: LUMEN.DEFAULT_HABITS.map(h => ({ ...h, log: {} })), // log: { 'YYYY-MM-DD': true }
  water: {},            // 'YYYY-MM-DD': count
  mood: {},             // 'YYYY-MM-DD': { mood, energy }
  focusLog: [],         // {date, mins, mode}
  prefs: {
    theme: 'dark',
    accent: 'violet',
    density: 'comfortable',
    fontScale: 1,
    view: 'list',       // list | grid | board
    dailyReminder: false
  },
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  totalCompleted: 0,
  totalCreated: 0,
  focusSessions: 0,
  badges: [],
  customCats: [],
  challengeDone: {}     // 'YYYY-MM-DD': true
};

const STORE = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        this.state = this._merge(DEFAULT_STATE, JSON.parse(raw));
      } else {
        this.state = structuredClone(DEFAULT_STATE);
        this.save();
      }
    } catch (e) {
      console.warn('storage load failed', e);
      this.state = structuredClone(DEFAULT_STATE);
    }
    return this.state;
  },

  _seed() {
    const today = LUMEN.ymd();
    const tom = LUMEN.ymd(new Date(Date.now() + 86400000));
    const samples = [
      { title: 'Plan the week',         desc: 'Outline 3 big rocks for the week', cat:'personal', pri:'high', date: today, time:'09:00', dur:15, emoji:'🎯', color:'violet', pinned:true },
      { title: 'Morning workout',       desc: '20 min cardio + stretching',        cat:'fitness',  pri:'med',  date: today, time:'07:00', dur:25, emoji:'🏋️', color:'green', done:true, completedAt: Date.now()-3600000 },
      { title: 'Read 10 pages',         desc: 'Atomic Habits — Chapter 3',         cat:'study',    pri:'low',  date: today, time:'21:00', dur:20, emoji:'📚', color:'blue' },
      { title: 'Design review',         desc: 'Walk through new dashboard mocks',  cat:'work',     pri:'high', date: today, time:'14:30', dur:45, emoji:'💼', color:'cyan' },
      { title: 'Grocery run',           desc: 'Milk, eggs, oats, spinach',         cat:'shopping', pri:'low',  date: tom,   time:'18:00', dur:30, emoji:'🛒', color:'orange' }
    ];
    this.state.tasks = samples.map(s => ({
      id: LUMEN.uid(),
      desc: '', cat:'personal', pri:'med', date:'', time:'', dur:null,
      emoji:'✨', color:'violet', notes:'',
      done:false, pinned:false, archived:false, board: s.done ? 'done' : 'todo',
      createdAt: Date.now() - Math.random()*86400000,
      completedAt: null,
      ...s
    }));
    this.state.totalCreated = samples.length;
    this.state.totalCompleted = samples.filter(s => s.done).length;
    this.state.xp = 35;
    this.state.streak = 2;
    this.state.bestStreak = 2;
    this.state.lastActiveDate = today;
    // seed a few completions in the past 14 days for the graph
    for (let i = 1; i <= 13; i++) {
      const n = Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        this.state.tasks.push({
          id: LUMEN.uid(),
          title: 'Past task',
          desc: '', cat: 'personal', pri:'low', date: LUMEN.ymd(d),
          time: '', dur: null, emoji:'✓', color:'violet', notes:'',
          done: true, pinned:false, archived:false, board:'done',
          createdAt: d.getTime(),
          completedAt: d.getTime() + 3600000 * (1 + Math.random()*10)
        });
      }
    }
    // seed habit history
    this.state.habits.forEach(h => {
      for (let i = 0; i < 14; i++) {
        if (Math.random() > 0.4) {
          const d = new Date(); d.setDate(d.getDate() - i);
          h.log[LUMEN.ymd(d)] = true;
        }
      }
    });
    this.state.water[today] = 3;
  },

  save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(this.state));
      // auto-backup slot — survives accidental reset of main key
      localStorage.setItem(STORE_KEY + '.backup', JSON.stringify({ at: Date.now(), state: this.state }));
    } catch (e) {
      console.warn('storage save failed', e);
    }
  },

  reset() {
    this.state = structuredClone(DEFAULT_STATE);
    this.save();
  },

  // shallow-merge defaults so new keys in updates don't break existing saves
  _merge(defaults, saved) {
    const out = structuredClone(defaults);
    for (const k of Object.keys(saved)) {
      if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = { ...out[k], ...saved[k] };
      } else if (saved[k] !== undefined) {
        out[k] = saved[k];
      }
    }
    return out;
  },

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(text) {
    const parsed = JSON.parse(text);
    this.state = this._merge(DEFAULT_STATE, parsed);
    this.save();
  }
};

LUMEN.STORE = STORE;

/* ---------- utility helpers (date/uid) ---------- */
LUMEN.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
LUMEN.ymd = (d = new Date()) => {
  const z = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
LUMEN.parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
LUMEN.isToday = (s) => s === LUMEN.ymd();
LUMEN.isOverdue = (task) => {
  if (!task.date || task.done) return false;
  const today = LUMEN.ymd();
  if (task.date < today) return true;
  if (task.date === today && task.time) {
    const [hh, mm] = task.time.split(':').map(Number);
    const due = new Date(); due.setHours(hh, mm, 0, 0);
    return due < new Date();
  }
  return false;
};
LUMEN.diffDays = (a, b) => Math.round((LUMEN.parseYMD(a) - LUMEN.parseYMD(b)) / 86400000);
