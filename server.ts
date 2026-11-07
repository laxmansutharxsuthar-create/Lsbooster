import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'app_db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

interface RoutineItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  startTime: string; // "07:00"
  endTime: string;   // "07:45"
  durationMinutes: number;
  priority: 'high' | 'medium' | 'low';
  recurringDays: number[] | 'daily'; // [0,1,2,3,4,5,6] or 'daily'
  subtasks: { id: string; text: string; completed: boolean }[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface DailyRecord {
  id: string;
  routineId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  status: 'completed' | 'pending' | 'partial' | 'skipped' | 'missed';
  actualMinutes: number;
  rating: number; // 0-5
  notes: string;
  completedAt: string | null;
  updatedAt: string;
}

interface Goal {
  id: string;
  userId: string;
  title: string;
  category: string;
  target: number;
  unit: string;
  history: Record<string, number>; // date -> count
}

interface UserSettings {
  language: 'en' | 'hi';
  theme: 'dark' | 'light';
  notificationsEnabled: boolean;
  leadTimeMinutes: number;
  soundEnabled: boolean;
  morningReminderTime: string;
  eveningReviewTime: string;
}

interface DatabaseSchema {
  users: Record<string, User>;
  sessions: Record<string, string>; // token -> userId
  routines: Record<string, RoutineItem[]>; // userId -> routines
  records: Record<string, Record<string, DailyRecord[]>>; // userId -> date -> records
  goals: Record<string, Goal[]>; // userId -> goals
  settings: Record<string, UserSettings>; // userId -> settings
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initialDb: DatabaseSchema = {
      users: {},
      sessions: {},
      routines: {},
      records: {},
      goals: {},
      settings: {},
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, re-initializing', err);
    const initialDb: DatabaseSchema = {
      users: {},
      sessions: {},
      routines: {},
      records: {},
      goals: {},
      settings: {},
    };
    return initialDb;
  }
}

function saveDatabase(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database', err);
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_life_manager_salt').digest('hex');
}

// Ensure demo user exists
function seedDemoUser(db: DatabaseSchema) {
  const demoEmail = 'demo@lifemanager.app';
  const existing = Object.values(db.users).find((u) => u.email === demoEmail);
  if (!existing) {
    const demoId = 'usr_demo_101';
    db.users[demoId] = {
      id: demoId,
      name: 'Arjun Sharma',
      email: demoEmail,
      passwordHash: hashPassword('demo1234'),
      createdAt: new Date().toISOString(),
    };
    db.settings[demoId] = {
      language: 'en',
      theme: 'dark',
      notificationsEnabled: true,
      leadTimeMinutes: 10,
      soundEnabled: true,
      morningReminderTime: '06:30',
      eveningReviewTime: '21:30',
    };
    db.routines[demoId] = [
      {
        id: 'rt_1',
        userId: demoId,
        title: 'Morning Meditation & Pranayama',
        description: 'Mindfulness breathing and gentle stretching to start the day calm and focused.',
        category: 'health',
        startTime: '06:00',
        endTime: '06:30',
        durationMinutes: 30,
        priority: 'high',
        recurringDays: 'daily',
        subtasks: [
          { id: 'st_1', text: '10 min Anulom Vilom', completed: true },
          { id: 'st_2', text: '10 min silent meditation', completed: true },
          { id: 'st_3', text: 'Hydrate with warm lemon water', completed: true },
        ],
        order: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_2',
        userId: demoId,
        title: 'Morning Workout & Core Training',
        description: 'Cardio, calisthenics, and core strengthening.',
        category: 'exercise',
        startTime: '06:35',
        endTime: '07:20',
        durationMinutes: 45,
        priority: 'high',
        recurringDays: [1, 2, 3, 4, 5, 6],
        subtasks: [
          { id: 'st_4', text: '5 min dynamic warm up', completed: true },
          { id: 'st_5', text: '3 sets pushups & squats', completed: false },
          { id: 'st_6', text: 'Cool-down stretches', completed: false },
        ],
        order: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_3',
        userId: demoId,
        title: 'Nutritious Breakfast & Planning',
        description: 'Protein oats, nuts, fruit, and reviewing top 3 daily objectives.',
        category: 'food',
        startTime: '07:30',
        endTime: '08:15',
        durationMinutes: 45,
        priority: 'medium',
        recurringDays: 'daily',
        subtasks: [
          { id: 'st_7', text: 'Check daily schedule', completed: false },
          { id: 'st_8', text: 'Prepare balanced meal', completed: false },
        ],
        order: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_4',
        userId: demoId,
        title: 'Deep Work Block 1: Core Priority',
        description: 'Zero interruptions, phone on focus mode. High-leverage project tasks.',
        category: 'work',
        startTime: '09:00',
        endTime: '11:30',
        durationMinutes: 150,
        priority: 'high',
        recurringDays: [1, 2, 3, 4, 5],
        subtasks: [
          { id: 'st_9', text: 'Draft sprint deliverables', completed: false },
          { id: 'st_10', text: 'Code review & PR checks', completed: false },
        ],
        order: 4,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_5',
        userId: demoId,
        title: 'Skill Development & Study',
        description: 'Reading tech documentation, system design or new language practice.',
        category: 'study',
        startTime: '16:00',
        endTime: '17:00',
        durationMinutes: 60,
        priority: 'medium',
        recurringDays: 'daily',
        subtasks: [
          { id: 'st_11', text: 'Read 20 pages', completed: false },
          { id: 'st_12', text: 'Summarize key notes', completed: false },
        ],
        order: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_6',
        userId: demoId,
        title: 'Evening Walk & Digital Detox',
        description: 'Fresh air in the park without digital screens.',
        category: 'health',
        startTime: '18:30',
        endTime: '19:15',
        durationMinutes: 45,
        priority: 'low',
        recurringDays: 'daily',
        subtasks: [],
        order: 6,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_7',
        userId: demoId,
        title: 'Relaxation & Gaming / Hobby',
        description: 'Free downtime with friends or video game session.',
        category: 'gaming',
        startTime: '20:30',
        endTime: '21:30',
        durationMinutes: 60,
        priority: 'low',
        recurringDays: [0, 5, 6],
        subtasks: [],
        order: 7,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'rt_8',
        userId: demoId,
        title: 'Night Reflection & Sleep Routine',
        description: 'Journaling accomplishments, setting clothes for tomorrow, and 8 hours restful sleep.',
        category: 'sleep',
        startTime: '22:30',
        endTime: '06:00',
        durationMinutes: 450,
        priority: 'high',
        recurringDays: 'daily',
        subtasks: [
          { id: 'st_13', text: 'Review performance', completed: false },
          { id: 'st_14', text: 'Screen off 30m before bed', completed: false },
        ],
        order: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    // Seed sample goals
    db.goals[demoId] = [
      { id: 'g_1', userId: demoId, title: 'Drink 3L Water', category: 'health', target: 3000, unit: 'ml', history: {} },
      { id: 'g_2', userId: demoId, title: 'Daily Workout', category: 'exercise', target: 45, unit: 'mins', history: {} },
      { id: 'g_3', userId: demoId, title: 'Read Book / Study', category: 'study', target: 40, unit: 'mins', history: {} },
      { id: 'g_4', userId: demoId, title: 'Sleep 8 Hours', category: 'sleep', target: 8, unit: 'hours', history: {} },
    ];

    saveDatabase(db);
  }
}

const memoryDb = loadDatabase();
seedDemoUser(memoryDb);

// Helper to authenticate request
function getAuthUser(req: Request): User | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const userId = memoryDb.sessions[token];
  if (!userId) return null;
  return memoryDb.users[userId] || null;
}

// Auth Endpoints
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }

  const existing = Object.values(memoryDb.users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const newUser: User = {
    id,
    name,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  memoryDb.users[id] = newUser;
  memoryDb.routines[id] = [];
  memoryDb.records[id] = {};
  memoryDb.goals[id] = [
    { id: 'g_' + Date.now() + '_1', userId: id, title: 'Drink 3L Water', category: 'health', target: 3000, unit: 'ml', history: {} },
    { id: 'g_' + Date.now() + '_2', userId: id, title: 'Exercise / Workout', category: 'exercise', target: 45, unit: 'mins', history: {} },
    { id: 'g_' + Date.now() + '_3', userId: id, title: 'Deep Study', category: 'study', target: 60, unit: 'mins', history: {} },
  ];
  memoryDb.settings[id] = {
    language: 'en',
    theme: 'dark',
    notificationsEnabled: true,
    leadTimeMinutes: 10,
    soundEnabled: true,
    morningReminderTime: '06:30',
    eveningReviewTime: '21:30',
  };

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  memoryDb.sessions[token] = id;
  saveDatabase(memoryDb);

  return res.json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email },
  });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = Object.values(memoryDb.users).find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  memoryDb.sessions[token] = user.id;
  saveDatabase(memoryDb);

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

// Demo login shortcut for zero friction evaluation
app.post('/api/auth/demo', (req: Request, res: Response) => {
  const demoEmail = 'demo@lifemanager.app';
  const user = Object.values(memoryDb.users).find((u) => u.email === demoEmail);
  if (!user) {
    return res.status(500).json({ error: 'Demo account not found' });
  }
  const token = 'tok_demo_' + crypto.randomBytes(16).toString('hex');
  memoryDb.sessions[token] = user.id;
  saveDatabase(memoryDb);

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  return res.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    delete memoryDb.sessions[token];
    saveDatabase(memoryDb);
  }
  return res.json({ success: true });
});

// User Data Sync and CRUD
app.get('/api/data', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  return res.json({
    routines: memoryDb.routines[userId] || [],
    records: memoryDb.records[userId] || {},
    goals: memoryDb.goals[userId] || [],
    settings: memoryDb.settings[userId] || {
      language: 'en',
      theme: 'dark',
      notificationsEnabled: true,
      leadTimeMinutes: 10,
      soundEnabled: true,
      morningReminderTime: '06:30',
      eveningReviewTime: '21:30',
    },
  });
});

app.post('/api/sync', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const { routines, records, goals, settings } = req.body;

  if (Array.isArray(routines)) {
    memoryDb.routines[userId] = routines;
  }
  if (records && typeof records === 'object') {
    memoryDb.records[userId] = records;
  }
  if (Array.isArray(goals)) {
    memoryDb.goals[userId] = goals;
  }
  if (settings && typeof settings === 'object') {
    memoryDb.settings[userId] = settings;
  }

  saveDatabase(memoryDb);
  return res.json({ success: true, syncedAt: new Date().toISOString() });
});

// Full Backup & Restore Endpoints
app.get('/api/backup', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const backupPayload = {
    appName: 'My Life Manager – Daily Routine',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email },
    routines: memoryDb.routines[userId] || [],
    records: memoryDb.records[userId] || {},
    goals: memoryDb.goals[userId] || [],
    settings: memoryDb.settings[userId] || {},
  };

  res.setHeader('Content-Disposition', `attachment; filename="routine_backup_${new Date().toISOString().slice(0, 10)}.json"`);
  res.setHeader('Content-Type', 'application/json');
  return res.send(JSON.stringify(backupPayload, null, 2));
});

app.post('/api/restore', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const payload = req.body;

  if (!payload || (!payload.routines && !payload.records)) {
    return res.status(400).json({ error: 'Invalid backup file format' });
  }

  if (Array.isArray(payload.routines)) {
    memoryDb.routines[userId] = payload.routines;
  }
  if (payload.records && typeof payload.records === 'object') {
    memoryDb.records[userId] = payload.records;
  }
  if (Array.isArray(payload.goals)) {
    memoryDb.goals[userId] = payload.goals;
  }
  if (payload.settings && typeof payload.settings === 'object') {
    memoryDb.settings[userId] = payload.settings;
  }

  saveDatabase(memoryDb);
  return res.json({ success: true, message: 'Data restored successfully' });
});

// Smart Productivity Analysis & Suggestions API
app.get('/api/analytics/suggestions', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const userId = user.id;
  const routines = memoryDb.routines[userId] || [];
  const records = memoryDb.records[userId] || {};

  // Calculate dynamic insights
  const dates = Object.keys(records).sort().slice(-7);
  let totalTasks = 0;
  let completedTasks = 0;
  let missedTasks = 0;

  dates.forEach((d) => {
    const list = records[d] || [];
    list.forEach((r) => {
      totalTasks++;
      if (r.status === 'completed') completedTasks++;
      if (r.status === 'missed') missedTasks++;
    });
  });

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const suggestions = [
    {
      type: 'peak_hours',
      en: 'Morning hours (6 AM - 10 AM) have your highest consistency. Schedule your most demanding tasks here.',
      hi: 'सुबह का समय (6 AM - 10 AM) आपके लिए सबसे अधिक उत्पादक है। अपने सबसे महत्वपूर्ण कार्य इसी समय रखें।',
    },
    {
      type: 'buffer_time',
      en: 'Add a 10-15 minute rest buffer between deep work blocks to maintain high cognitive stamina throughout the day.',
      hi: 'लगातार काम के बीच 10-15 मिनट का विराम रखें ताकि पूरे दिन ऊर्जा और फोकस बना रहे।',
    },
    {
      type: 'sleep_hygiene',
      en: 'Ensure a consistent sleep schedule to maintain sharp concentration for daily goals.',
      hi: 'रोज़ाना निश्चित समय पर सोने और उठने से मानसिक एकाग्रता और ऊर्जा में भारी सुधार होता है।',
    },
  ];

  return res.json({
    completionRate,
    totalTracked: totalTasks,
    missedCount: missedTasks,
    routineCount: routines.length,
    suggestions,
  });
});

// Vite Middleware integration for Full-Stack development
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`My Life Manager server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
