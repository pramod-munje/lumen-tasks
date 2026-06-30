/* =========================================================
   Static data: categories, quotes, challenges, badges, tips
   ========================================================= */

window.LUMEN = window.LUMEN || {};

LUMEN.CATEGORIES = [
  { id: 'personal', name: 'Personal', icon: '🌿', color: 'violet' },
  { id: 'study',    name: 'Study',    icon: '📚', color: 'blue'   },
  { id: 'work',     name: 'Work',     icon: '💼', color: 'cyan'   },
  { id: 'fitness',  name: 'Fitness',  icon: '🏋️', color: 'green'  },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: 'orange' },
  { id: 'gaming',   name: 'Gaming',   icon: '🎮', color: 'pink'   },
  { id: 'finance',  name: 'Finance',  icon: '💰', color: 'green'  }
];

LUMEN.QUOTES = [
  { t: "Small steps every day compound into giant leaps.", a: "Lumen" },
  { t: "Discipline equals freedom.", a: "Jocko Willink" },
  { t: "What you do every day matters more than what you do once in a while.", a: "Gretchen Rubin" },
  { t: "The secret of getting ahead is getting started.", a: "Mark Twain" },
  { t: "You don’t have to be great to start, but you have to start to be great.", a: "Zig Ziglar" },
  { t: "Done is better than perfect.", a: "Sheryl Sandberg" },
  { t: "Focus is saying no to a thousand good things.", a: "Steve Jobs" },
  { t: "A year from now you’ll wish you started today.", a: "Karen Lamb" },
  { t: "Energy and persistence conquer all things.", a: "Benjamin Franklin" },
  { t: "The way to get started is to quit talking and begin doing.", a: "Walt Disney" }
];

LUMEN.CHALLENGES = [
  "Drink 8 glasses of water",
  "Take a 10-minute walk outside",
  "Read 10 pages of a book",
  "Stretch for 5 minutes",
  "Write down 3 things you're grateful for",
  "Plan your top 3 tasks for tomorrow",
  "Send a kind message to a friend",
  "Tidy up your workspace",
  "Try one Pomodoro session",
  "Step away from screens for 30 minutes"
];

LUMEN.TIPS = [
  "Group similar tasks together — context switching is expensive.",
  "Add a duration to a task to help your brain commit.",
  "Two-minute rule: if it takes < 2 min, just do it now.",
  "Schedule deep work in the morning when willpower is highest.",
  "Pin one ‘must-do’ task each day and finish it first."
];

LUMEN.DEFAULT_HABITS = [
  { id: 'water',     name: 'Water',      icon: '💧', goal: 'Stay hydrated' },
  { id: 'workout',   name: 'Workout',    icon: '💪', goal: 'Move your body' },
  { id: 'read',      name: 'Reading',    icon: '📖', goal: '10 pages' },
  { id: 'meditate',  name: 'Meditation', icon: '🧘', goal: '5 minutes' },
  { id: 'sleep',     name: 'Sleep 8h',   icon: '😴', goal: 'Rest well' }
];

LUMEN.BADGES = [
  { id: 'first',    icon: '🌱', name: 'First Task',         desc: 'Complete your first task',     check: s => s.totalCompleted >= 1 },
  { id: 'streak3',  icon: '🔥', name: '3-Day Streak',       desc: 'Stay active 3 days in a row',  check: s => s.streak >= 3 },
  { id: 'streak7',  icon: '🚀', name: '7-Day Streak',       desc: 'Stay active a full week',      check: s => s.streak >= 7 },
  { id: 'streak30', icon: '🏆', name: '30-Day Streak',      desc: 'A month of consistency',       check: s => s.streak >= 30 },
  { id: 'master',   icon: '⭐', name: 'Productivity Master',desc: 'Reach Level 5',                check: s => s.level >= 5 },
  { id: 'night',    icon: '🦉', name: 'Night Owl',          desc: 'Complete a task after 10 PM',  check: s => s.nightOwl },
  { id: 'early',    icon: '🌅', name: 'Early Bird',         desc: 'Complete a task before 7 AM',  check: s => s.earlyBird },
  { id: 'century',  icon: '💯', name: '100 Tasks',          desc: 'Complete 100 tasks',           check: s => s.totalCompleted >= 100 },
  { id: 'pomodoro', icon: '🍅', name: 'Focused Mind',       desc: 'Complete 10 focus sessions',   check: s => s.focusSessions >= 10 },
  { id: 'planner',  icon: '🗓️', name: 'Planner',           desc: 'Create 25 tasks',              check: s => s.totalCreated >= 25 }
];

/* Simple rule-based smart-priority suggestion */
LUMEN.suggestPriority = function (task) {
  const t = (task.title || '').toLowerCase();
  const urgent = ['urgent','asap','deadline','exam','interview','today','submit','due'];
  const high   = ['important','review','present','meeting','project','study'];
  if (urgent.some(k => t.includes(k))) return { p: 'high', reason: 'Looks urgent based on the title.' };
  if (task.date) {
    const d = new Date(task.date);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = (d - today) / 86400000;
    if (diff <= 0) return { p: 'high', reason: 'Due today — bumping priority up.' };
    if (diff <= 2) return { p: 'med',  reason: 'Due in a couple of days.' };
  }
  if (high.some(k => t.includes(k))) return { p: 'med', reason: 'Sounds like a meaningful task.' };
  return null;
};
