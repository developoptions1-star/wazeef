// Auto-load .env (no dotenv dependency — keep it minimal & deploy-safe)
try {
  const envPath = require('path').join(__dirname, '.env');
  if (require('fs').existsSync(envPath)) {
    for (const line of require('fs').readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && !(process.env[m[1]])) {
        let v = m[2];
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        process.env[m[1]] = v;
      }
    }
    console.log('.env loaded from', envPath);
  }
} catch (_) {}
// Hard fallback: if still no DB config (e.g. .env not deployed), point at Supabase
if (!process.env.DB_DRIVER || !process.env.DATABASE_URL) {
  process.env.DB_DRIVER = process.env.DB_DRIVER || 'pg';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:mohamedfar3onxd77wazeef@db.qsleestfmtfgehsqdnxy.supabase.co:5432/postgres';
  console.log('DB config fallback applied (pg + Supabase)');
}
process.on('uncaughtException', e => {
  try {
    if (global.db && global.db.flushNow) global.db.flushNow();
  } catch (_) {}
  console.error('UNCAUGHT:', e.message);
});
process.on('unhandledRejection', e => {});
// Supabase hosts are IPv6-only; force Node to prefer IPv6 (Windows getaddrinfo fails otherwise)
try { require('dns').setDefaultResultOrder('ipv6first'); } catch (_) {}
console.log('Node', process.version, 'starting...');
console.log('CWD:', process.cwd());
console.log('argv:', process.argv[1]);
const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const app = express();
// Behind Velixir/proxy - needed for rate-limit IP detection + correct protocol
app.set('trust proxy', 1);
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'sss_super_secret_key_2024';
// Absolute origin used in every outbound link (emails, notifications).
// Production is https://wazeef.velixir.run (see public/robots.txt + public/sitemap.xml).
// Local dev: BASE_URL=http://localhost:8080 node server.js
const BASE_URL = (process.env.BASE_URL || 'https://wazeef.velixir.run').replace(/\/+$/, '');

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: {
    action: 'deny'
  }
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    error: 'محاولات كثيرة، حاول مرة أخرى بعد 15 دقيقة',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  message: {
    error: 'محاولات كثيرة، حاول مرة أخرى بعد ساعة',
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Input sanitizer to prevent XSS in email templates
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Data directory - use DATA_DIR env (e.g. Docker volume mount), else __dirname,
// else /tmp if __dirname is not writable (e.g. SnapDeploy containers)
let dataDir = process.env.DATA_DIR || __dirname;
if (!process.env.DATA_DIR) {
  try {
    const testFile = path.join(__dirname, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (e) {
    dataDir = '/tmp';
  }
}

// Ensure directories exist
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {
  recursive: true
});
// Clean stale chunked-upload temp files (>1h)
try {
  fs.readdirSync(uploadsDir).filter(f => f.startsWith('tmp_') && f.endsWith('.part')).forEach(f => {
    const p = path.join(uploadsDir, f);
    if (Date.now() - fs.statSync(p).mtimeMs > 3600000) fs.unlinkSync(p);
  });
} catch (e) {}

// Middleware
app.use(express.json({
  limit: '10mb',
  strict: false
}));
// body-parser can hand us a scalar (e.g. the literal "null"); routes expect an object.
app.use((req, res, next) => {
  if (req.body == null) req.body = {};
  next();
});
// Vercel: wait for DB init before processing any request
let _dbReady = Promise.resolve();
if (process.env.VERCEL) {
  _dbReady = initDatabase().then(() => console.log('Vercel: DB ready')).catch(e => console.error('Vercel DB error:', e.message));
  app.use(async (req, res, next) => {
    try { await _dbReady; } catch (_) {}
    next();
  });
}
app.use(express.urlencoded({
  extended: true
}));
// Find where public files actually are (works on Velixir containers)
let _publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(_publicDir) || !fs.existsSync(path.join(_publicDir, 'sw.js'))) {
  _publicDir = __dirname;
}
if (!fs.existsSync(path.join(_publicDir, 'sw.js'))) {
  const parent = path.join(__dirname, '..', 'public');
  if (fs.existsSync(parent) && fs.existsSync(path.join(parent, 'sw.js'))) _publicDir = parent;
}
// Serve uploads from filesystem or embedded data
const uploadsDataDir = path.join(dataDir, 'uploads');
const uploadsSelfDir = path.join(__dirname, 'uploads');
app.get('/uploads/:file', (req, res) => {
  const file = req.params.file;
  // Try filesystem paths first
  const paths = [path.join(uploadsDataDir, file), path.join(uploadsSelfDir, file)];
  for (const p of paths) {
    if (fs.existsSync(p)) return res.sendFile(p);
  }
  // Fallback to embedded images
  const img = _embeddedImages && _embeddedImages[file];
  if (img) {
    res.set('Content-Type', img.mime);
    return res.send(Buffer.from(img.base64, 'base64'));
  }
  res.status(404).end();
});

// Embedded pages + images (from build-pages.js) — zero filesystem dependency
const {
  pages: _embeddedPages,
  images: _embeddedImages,
  assets: _embeddedAssets
} = require('./pages');

// Multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {
      recursive: true
    });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

// Database setup
const dbPath = path.join(dataDir, 'app.db');
let restoredFromBackup = false;
// Apply pending restore (uploaded via /api/admin/restore) before opening DB
const pendingRestore = path.join(dataDir, 'restore.pending.db');
if (fs.existsSync(pendingRestore)) {
  try {
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbPath + '.bak');
    for (const ext of ['-wal', '-shm', '-journal']) {
      try {
        fs.unlinkSync(dbPath + ext);
      } catch (e) {}
    }
    fs.copyFileSync(pendingRestore, dbPath);
    fs.unlinkSync(pendingRestore);
    restoredFromBackup = true;
    console.log('Database restored from uploaded backup');
  } catch (e) {
    console.log('Restore failed:', e.message);
  }
}
let db;

// ---------------------------------------------------------------------------
// Database wipe + seed (shared by startup and /api/admin/reset-db so that a
// reset always produces EXACTLY the same state as a fresh boot)
// ---------------------------------------------------------------------------
const ADMIN_SEED = [{
  name: 'محمد سامي',
  email: 'mohamed.sami.gawad@gmail.com',
  password: 'Sm@2024!Wazef#Xk9'
}, {
  name: 'يوسف',
  email: 'Youssafmohamed999@gmail.com',
  password: 'Ys@2024!Wazef#Mp7'
}, {
  name: 'ادمن',
  email: '1stvampiresslayer@gmail.com',
  password: 'Vp@2024!Wazef#Qz3'
}, {
  name: 'Amina',
  email: 'amina@gmail.com',
  password: 'Am@2024!Wazef#Jn4'
}];
async function wipeAllData() {
  // Wipe EVERY user table (not just the known ones) so no stray rows survive.
  const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  for (const t of tables) {
    try {
      await db.exec('DELETE FROM "' + t.name + '"');
    } catch (e) {}
  }
  try {
    await db.exec('DELETE FROM sqlite_sequence');
  } catch (e) {}
}

// ALWAYS safe to run: restores the 4 admin accounts and nothing else.
// This is the only seeding a fresh boot or a reset performs.
async function seedAdmins() {
  const insertAdmin = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)');
  for (const a of ADMIN_SEED) await insertAdmin.run(a.name, a.email, bcrypt.hashSync(a.password, 10), 'admin');
  console.log('Database reset: only 4 admins seeded');
}

// Demo / test fixtures. NEVER runs on a fresh boot unless SEED_DEMO=1, and
// NEVER runs on /api/admin/reset-db (a reset = clean DB + admins only).
async function seedDemoData() {
  // 1) Default test company + its login + its first job (so company login always works)
  try {
    await db.prepare('INSERT INTO companies (name, position, company_email, available_slots) VALUES (?,?,?,?)').run('TestCo', 'Dev', 'test@co.com', 5);
    const coId = (await db.prepare('SELECT last_insert_rowid() as id').get()).id;
    await db.prepare('INSERT INTO company_users (company_id, email, password, name) VALUES (?,?,?,?)').run(coId, 'test@co.com', bcrypt.hashSync('Test@123', 10), 'TestCo');
    await db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(coId, 'الإنجليزية', 'B2', 3, 'مطور ويب', 5000, 15000, 'السبت 2 م', new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0], 5, 'وظيفة مطور ويب - تيست');
    console.log('Test company seeded: test@co.com / Test@123');
  } catch (e) {
    console.log('Test company seed error:', e.message);
  }

  // 3) 3 approved test applicants (for the assign-to-company flow)
  try {
    const testHash = bcrypt.hashSync('Test@123', 10);
    const testPeople = [{
      name: 'أحمد محمد',
      email: 'ahmed@test.com',
      phone: '01001112233',
      city: 'القاهرة',
      age: 25,
      college: 'القاهرة',
      edu: 'بكالوريوس',
      mil: 'معفى',
      lang: 'الإنجليزية',
      level: 'B2'
    }, {
      name: 'سارة علي',
      email: 'sara@test.com',
      phone: '01112223344',
      city: 'الإسكندرية',
      age: 23,
      college: 'الإسكندرية',
      edu: 'بكالوريوس',
      mil: '—',
      lang: 'الإنجليزية',
      level: 'A1-B1'
    }, {
      name: 'محمود حسن',
      email: 'mahmoud@test.com',
      phone: '01223334455',
      city: 'الجيزة',
      age: 27,
      college: 'الجيزة',
      edu: 'ماجستير',
      mil: 'مؤجل',
      lang: 'الإنجليزية',
      level: 'C1'
    }];
    for (const p of testPeople) {
      await db.prepare('INSERT INTO users (name,email,password,phone,role,nationality,city,language_applied,language_level,age,college,education_level,military_status,email_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)').run(p.name, p.email, testHash, p.phone, 'user', 'مصري', p.city, p.lang, p.level, p.age, p.college, p.edu, p.mil);
      const uid = (await db.prepare('SELECT last_insert_rowid() as id').get()).id;
      await db.prepare('INSERT INTO applications (user_id, language, status) VALUES (?,?,?)').run(uid, p.lang, 'approved');
      console.log('Test applicant seeded:', p.name);
    }
  } catch (e) {
    console.log('Test applicant seed error:', e.message);
  }

  // 4) 3 more applications with varied statuses (for the الطلبات filters)
  try {
    const testHash2 = bcrypt.hashSync('Test@123', 10);
    const testApplications = [{
      name: 'منى عبد الله',
      email: 'mona@test.com',
      phone: '01099887766',
      city: 'القاهرة',
      age: 24,
      college: 'العين',
      edu: 'بكالوريوس',
      mil: 'معفى',
      lang: 'الفرنسية',
      level: 'A2',
      status: 'pending'
    }, {
      name: 'كريم إبراهيم',
      email: 'karim@test.com',
      phone: '01055667788',
      city: 'المنصورة',
      age: 26,
      college: 'المنصورة',
      edu: 'بكالوريوس',
      mil: 'مؤجل',
      lang: 'الألمانية',
      level: 'B1',
      status: 'rejected'
    }, {
      name: 'هبة محمود',
      email: 'heba@test.com',
      phone: '01077889900',
      city: 'طنطا',
      age: 22,
      college: 'الزيتونة',
      edu: 'دبلوم',
      mil: 'معفى',
      lang: 'الإسبانية',
      level: 'A1',
      status: 'pending'
    }];
    for (const p of testApplications) {
      await db.prepare('INSERT INTO users (name,email,password,phone,role,nationality,city,language_applied,language_level,age,college,education_level,military_status,email_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)').run(p.name, p.email, testHash2, p.phone, 'user', 'مصري', p.city, p.lang, p.level, p.age, p.college, p.edu, p.mil);
      const uid = (await db.prepare('SELECT last_insert_rowid() as id').get()).id;
      await db.prepare('INSERT INTO applications (user_id, language, status) VALUES (?,?,?)').run(uid, p.lang, p.status);
      console.log('Test application seeded:', p.name, '(' + p.status + ')');
    }
  } catch (e) {
    console.log('Test application seed error:', e.message);
  }
}
async function initDatabase() {
  const {
    openUnifiedDb
  } = require('./db-layer');
  db = await openUnifiedDb({
    dbPath
  });
  global.db = db;
  // Fast path: if the DB already has real users, skip ALL migrations (saves ~70s)
  let _hasData = false;
  try {
    const c = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get()).c;
    _hasData = c > 0;
  } catch (_) {}
  if (_hasData) {
    console.log('DB has data — skipping migrations');
    try { await seedAdmins(); } catch (_) {}
    return;
  }
  await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'user',
    referral_code TEXT,
    referred_by INTEGER,
    nationality TEXT,
    city TEXT,
    language_applied TEXT,
    age INTEGER,
    national_id TEXT,
    college TEXT,
    education_level TEXT,
    military_status TEXT,
    previous_application TEXT,
    call_center_experience TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    audio_file TEXT,
    audio_url TEXT DEFAULT '',
    language TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    company_id INTEGER,
    company_name TEXT NOT NULL,
    position TEXT NOT NULL,
    interview_time TEXT,
    salary REAL,
    salary_min REAL,
    salary_max REAL,
    description TEXT,
    language TEXT DEFAULT '',
    level TEXT DEFAULT '',
    needed_count INTEGER DEFAULT 1,
    deadline TEXT DEFAULT '',
    notify_days INTEGER DEFAULT 5,
    work_location TEXT DEFAULT '',
    employment_type TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id),
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    job_id INTEGER NOT NULL,
    status TEXT DEFAULT 'selected',
    hired INTEGER DEFAULT 0,
    amount REAL DEFAULT 0,
    agent_amount REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

   CREATE TABLE IF NOT EXISTS companies (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     position TEXT,
     description TEXT,
     interview_time TEXT,
     interview_schedule TEXT,
     salary_min REAL DEFAULT 0,
     salary_max REAL DEFAULT 0,
     company_email TEXT,
     available_slots INTEGER DEFAULT 0,
     used_slots INTEGER DEFAULT 0,
     pending_count INTEGER DEFAULT 0,
     hired_count INTEGER DEFAULT 0,
      deadline TEXT,
      notify_days_before INTEGER DEFAULT 5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
   );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    referral_code TEXT UNIQUE NOT NULL,
    created_by INTEGER,
    is_active INTEGER DEFAULT 1,
    role TEXT DEFAULT 'agent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

  // Fast migration: check existing columns once instead of 73 individual ALTER TABLE calls
  const _existingCols = new Set();
  try {
    const colRows = await db.prepare("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'").all();
    for (const r of colRows) _existingCols.add(r.table_name + '.' + r.column_name);
  } catch (e) {
    // fallback: run all migrations normally
    for (const c of ['agents.qualty_languages','selections.agent_amount','applications.rerecord_request','jobs.company_id','applications.rejection_date','applications.rejection_reason','users.nationality','users.city','users.language_applied','users.age','users.national_id','users.college','users.education_level','users.military_status','users.call_center_experience','users.qualty_languages','users.gender','users.language_level','users.verification_code','users.email_verified','users.code_expiry','users.reset_token','users.reset_token_expiry','selections.is_frozen','selections.unfrozen_at','selections.frozen_deadline','selections.apology','selections.hired_at','selections.company_emailed','selections.company_decision','selections.company_decision_at','applications.approval_date','jobs.company_email','jobs.language','jobs.level','jobs.needed_count','jobs.deadline','jobs.notify_days','companies.position','companies.interview_time','companies.salary_min','companies.salary_max','companies.company_email','companies.available_slots','companies.used_slots','companies.pending_count','companies.hired_count','companies.deadline','companies.notify_days_before','companies.description','agents.role','companies.interview_schedule','applications.assigned_qualty_id','applications.reviewed_by','applications.reviewed_at','companies.education_requirement','agents.payment_method','agents.payment_operator','agents.agent_type','companies.type','labor_groups.labor_agent_amount','labor_workers.labor_agent_amount']) _existingCols.add(c);
  }
  const _mig = (sql, colKey) => { if (!_existingCols.has(colKey)) return db.exec(sql).catch(() => {}); return Promise.resolve(); };

  // Migration: languages a qualty may review (CSV of codes, set by the admin)
  await _mig('ALTER TABLE agents ADD COLUMN qualty_languages TEXT', 'agents.qualty_languages');
  // Migration: add agent_amount column if missing
  await _mig('ALTER TABLE selections ADD COLUMN agent_amount REAL DEFAULT 0', 'selections.agent_amount');
  // Migration: add rerecord_request column if missing
  await _mig('ALTER TABLE applications ADD COLUMN rerecord_request INTEGER DEFAULT 0', 'applications.rerecord_request');
  // Migration: jobs.company_id
  await _mig('ALTER TABLE jobs ADD COLUMN company_id INTEGER', 'jobs.company_id');
  // Migration: add rejection_date column if missing
  await _mig('ALTER TABLE applications ADD COLUMN rejection_date DATETIME', 'applications.rejection_date');
  // Migration: add rejection_reason column if missing
  await _mig('ALTER TABLE applications ADD COLUMN rejection_reason TEXT', 'applications.rejection_reason');
  // Migration: add user profile columns if missing
  await _mig('ALTER TABLE users ADD COLUMN nationality TEXT', 'users.nationality');
  await _mig('ALTER TABLE users ADD COLUMN city TEXT', 'users.city');
  await _mig('ALTER TABLE users ADD COLUMN language_applied TEXT', 'users.language_applied');
  await _mig('ALTER TABLE users ADD COLUMN age INTEGER', 'users.age');
  await _mig('ALTER TABLE users ADD COLUMN national_id TEXT', 'users.national_id');
  await _mig('ALTER TABLE users ADD COLUMN college TEXT', 'users.college');
  await _mig('ALTER TABLE users ADD COLUMN education_level TEXT', 'users.education_level');
  await _mig('ALTER TABLE users ADD COLUMN military_status TEXT', 'users.military_status');
  await _mig('ALTER TABLE users ADD COLUMN call_center_experience TEXT', 'users.call_center_experience');
  // Migration: languages this user is allowed to be reviewed for (set by the admin when moving him to a qualty)
  await _mig('ALTER TABLE users ADD COLUMN qualty_languages TEXT', 'users.qualty_languages');
  await _mig('ALTER TABLE users ADD COLUMN gender TEXT', 'users.gender');
  await _mig("ALTER TABLE users ADD COLUMN language_level TEXT DEFAULT ''", 'users.language_level');
  // Migration: add email verification columns
  await _mig('ALTER TABLE users ADD COLUMN verification_code TEXT', 'users.verification_code');
  await _mig('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0', 'users.email_verified');
  await _mig('ALTER TABLE users ADD COLUMN code_expiry TEXT', 'users.code_expiry');
  await _mig('ALTER TABLE users ADD COLUMN reset_token TEXT', 'users.reset_token');
  await _mig('ALTER TABLE users ADD COLUMN reset_token_expiry TEXT', 'users.reset_token_expiry');
  // Migration: add frozen columns to selections
  await _mig('ALTER TABLE selections ADD COLUMN is_frozen INTEGER DEFAULT 1', 'selections.is_frozen');
  await _mig('ALTER TABLE selections ADD COLUMN unfrozen_at DATETIME', 'selections.unfrozen_at');
  await _mig('ALTER TABLE selections ADD COLUMN frozen_deadline DATETIME', 'selections.frozen_deadline');
  await _mig('ALTER TABLE selections ADD COLUMN apology TEXT', 'selections.apology');
  await _mig('ALTER TABLE selections ADD COLUMN hired_at DATETIME', 'selections.hired_at');
  await _mig('ALTER TABLE selections ADD COLUMN company_emailed INTEGER DEFAULT 0', 'selections.company_emailed');
  await _mig('ALTER TABLE selections ADD COLUMN company_decision TEXT', 'selections.company_decision');
  await _mig('ALTER TABLE selections ADD COLUMN company_decision_at DATETIME', 'selections.company_decision_at');
  await _mig('ALTER TABLE applications ADD COLUMN approval_date DATETIME', 'applications.approval_date');
  await _mig('ALTER TABLE jobs ADD COLUMN company_email TEXT', 'jobs.company_email');
  await _mig("ALTER TABLE jobs ADD COLUMN language TEXT DEFAULT ''", 'jobs.language');
  await _mig("ALTER TABLE jobs ADD COLUMN level TEXT DEFAULT ''", 'jobs.level');
  await _mig('ALTER TABLE jobs ADD COLUMN needed_count INTEGER DEFAULT 1', 'jobs.needed_count');
  await _mig("ALTER TABLE jobs ADD COLUMN deadline TEXT DEFAULT ''", 'jobs.deadline');
  await _mig('ALTER TABLE jobs ADD COLUMN notify_days INTEGER DEFAULT 5', 'jobs.notify_days');
  try {
    await db.exec("UPDATE jobs SET company_id = (SELECT c.id FROM companies c WHERE TRIM(c.name) = TRIM(jobs.company_name) OR (c.company_email IS NOT NULL AND c.company_email != '' AND c.company_email = jobs.company_email)) WHERE company_id IS NULL");
  } catch (e) {}
  // Migration: add company columns if missing
  await _mig('ALTER TABLE companies ADD COLUMN position TEXT', 'companies.position');
  await _mig('ALTER TABLE companies ADD COLUMN interview_time TEXT', 'companies.interview_time');
  await _mig('ALTER TABLE companies ADD COLUMN salary_min REAL DEFAULT 0', 'companies.salary_min');
  await _mig('ALTER TABLE companies ADD COLUMN salary_max REAL DEFAULT 0', 'companies.salary_max');
  await _mig('ALTER TABLE companies ADD COLUMN company_email TEXT', 'companies.company_email');
  await _mig('ALTER TABLE companies ADD COLUMN available_slots INTEGER DEFAULT 0', 'companies.available_slots');
  await _mig('ALTER TABLE companies ADD COLUMN used_slots INTEGER DEFAULT 0', 'companies.used_slots');
  await _mig('ALTER TABLE companies ADD COLUMN pending_count INTEGER DEFAULT 0', 'companies.pending_count');
  await _mig('ALTER TABLE companies ADD COLUMN hired_count INTEGER DEFAULT 0', 'companies.hired_count');
  await _mig('ALTER TABLE companies ADD COLUMN deadline TEXT', 'companies.deadline');
  await _mig('ALTER TABLE companies ADD COLUMN notify_days_before INTEGER DEFAULT 5', 'companies.notify_days_before');
  await _mig('ALTER TABLE companies ADD COLUMN description TEXT', 'companies.description');
  await _mig("ALTER TABLE agents ADD COLUMN role TEXT DEFAULT 'agent'", 'agents.role');
  await _mig('ALTER TABLE companies ADD COLUMN interview_schedule TEXT', 'companies.interview_schedule');
  await _mig('ALTER TABLE applications ADD COLUMN assigned_qualty_id INTEGER', 'applications.assigned_qualty_id');
  await _mig('ALTER TABLE applications ADD COLUMN reviewed_by INTEGER', 'applications.reviewed_by');
  await _mig('ALTER TABLE applications ADD COLUMN reviewed_at DATETIME', 'applications.reviewed_at');
  // Migration: company education requirement (both / graduates only / students only)
  await _mig("ALTER TABLE companies ADD COLUMN education_requirement TEXT DEFAULT 'both'", 'companies.education_requirement');
  try {
    await db.exec("UPDATE companies SET education_requirement = 'both' WHERE education_requirement IS NULL OR TRIM(education_requirement) = ''");
  } catch (e) {}
  // Migration: agent payment method (instapay | wallet + operator)
  await _mig("ALTER TABLE agents ADD COLUMN payment_method TEXT DEFAULT ''", 'agents.payment_method');
  await _mig("ALTER TABLE agents ADD COLUMN payment_operator TEXT DEFAULT ''", 'agents.payment_operator');
  // Migration: labor agents / labor companies / labor groups + workers
  await _mig("ALTER TABLE agents ADD COLUMN agent_type TEXT DEFAULT 'normal'", 'agents.agent_type');
  await _mig("ALTER TABLE companies ADD COLUMN type TEXT DEFAULT 'normal'", 'companies.type');
  try {
    await db.exec("UPDATE agents SET agent_type = 'normal' WHERE agent_type IS NULL");
    await db.exec("UPDATE companies SET type = 'normal' WHERE type IS NULL");
  } catch (e) {}
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS labor_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, labor_agent_id INTEGER NOT NULL, name TEXT NOT NULL, city TEXT DEFAULT '', is_working INTEGER DEFAULT 0, company_id INTEGER, earning_per_month REAL DEFAULT 0, working_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    await db.exec('ALTER TABLE labor_groups ADD COLUMN labor_agent_amount REAL DEFAULT 0');
    await db.exec("CREATE TABLE IF NOT EXISTS labor_workers (id INTEGER PRIMARY KEY AUTOINCREMENT, labor_agent_id INTEGER NOT NULL, group_id INTEGER, full_name TEXT NOT NULL, age INTEGER, phone TEXT DEFAULT '', national_id TEXT DEFAULT '', city TEXT DEFAULT '', address TEXT DEFAULT '', id_card_front TEXT DEFAULT '', id_card_back TEXT DEFAULT '', status TEXT DEFAULT 'new', company_id INTEGER, earning_per_month REAL DEFAULT 0, working_at DATETIME, notes TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    await db.exec('ALTER TABLE labor_workers ADD COLUMN labor_agent_amount REAL DEFAULT 0');
  } catch (e) {}

  // Notifications table
  await db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    agent_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS admin_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );
`);
  try {
    const notifCols = (await db.prepare('PRAGMA table_info(admin_notifications)').all()).map(function (c) {
      return c.name;
    });
    if (notifCols.indexOf('job_id') === -1) await db.exec('ALTER TABLE admin_notifications ADD COLUMN job_id INTEGER');
    if (notifCols.indexOf('worker_id') === -1) await db.exec('ALTER TABLE admin_notifications ADD COLUMN worker_id INTEGER');
  } catch (e) {}

  // company approval request on a labor worker ('' | requested | confirmed)
  try {
    const lwCols = (await db.prepare('PRAGMA table_info(labor_workers)').all()).map(function (c) {
      return c.name;
    });
    if (lwCols.indexOf('company_approval') === -1) await db.exec("ALTER TABLE labor_workers ADD COLUMN company_approval TEXT DEFAULT ''");
    // the job/position picked when the worker is added to a company
    if (lwCols.indexOf('position') === -1) await db.exec("ALTER TABLE labor_workers ADD COLUMN position TEXT DEFAULT ''");
  } catch (e) {}

  // the job/position picked when a whole group is added to a company
  try {
    const lgCols = (await db.prepare('PRAGMA table_info(labor_groups)').all()).map(function (c) {
      return c.name;
    });
    if (lgCols.indexOf('position') === -1) await db.exec("ALTER TABLE labor_groups ADD COLUMN position TEXT DEFAULT ''");
  } catch (e) {}

  // job options: work location (home/office) + employment type (part/full time)
  try {
    const clCols = (await db.prepare('PRAGMA table_info(company_languages)').all()).map(function (c) {
      return c.name;
    });
    if (clCols.indexOf('work_location') === -1) await db.exec("ALTER TABLE company_languages ADD COLUMN work_location TEXT DEFAULT ''");
    if (clCols.indexOf('employment_type') === -1) await db.exec("ALTER TABLE company_languages ADD COLUMN employment_type TEXT DEFAULT ''");
  } catch (e) {}

  // archived voice link (uploaded to Vocaroo when an application is approved)
  try {
    const apCols = (await db.prepare('PRAGMA table_info(applications)').all()).map(function (c) {
      return c.name;
    });
    if (apCols.indexOf('audio_url') === -1) await db.exec("ALTER TABLE applications ADD COLUMN audio_url TEXT DEFAULT ''");
  } catch (e) {}

  // job options: work location (home/office) + employment type (part/full time)
  try {
    const jbCols = (await db.prepare('PRAGMA table_info(jobs)').all()).map(function (c) {
      return c.name;
    });
    if (jbCols.indexOf('work_location') === -1) await db.exec("ALTER TABLE jobs ADD COLUMN work_location TEXT DEFAULT ''");
    if (jbCols.indexOf('employment_type') === -1) await db.exec("ALTER TABLE jobs ADD COLUMN employment_type TEXT DEFAULT ''");
  } catch (e) {}

  // team leader + team management (agents.team_leader_id)
  try {
    const agCols = (await db.prepare('PRAGMA table_info(agents)').all()).map(function (c) {
      return c.name;
    });
    if (agCols.indexOf('team_leader_id') === -1) await db.exec('ALTER TABLE agents ADD COLUMN team_leader_id INTEGER');
  } catch (e) {}
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS team_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, agent_id INTEGER NOT NULL, reason TEXT DEFAULT '', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
    await db.exec("CREATE TABLE IF NOT EXISTS team_removal_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, agent_id INTEGER NOT NULL, reason TEXT DEFAULT '', status TEXT DEFAULT 'pending', resolved_by INTEGER, resolved_at DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  } catch (e) {}

  // Super qualty: monthly target per team leader + warnings he sends to them
  try {
    await db.exec("CREATE TABLE IF NOT EXISTS leader_targets (id INTEGER PRIMARY KEY AUTOINCREMENT, team_leader_id INTEGER NOT NULL, month TEXT NOT NULL, target INTEGER NOT NULL DEFAULT 0, set_by INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(team_leader_id, month))");
    await db.exec("CREATE TABLE IF NOT EXISTS qualty_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id INTEGER NOT NULL, issued_by INTEGER, issuer_role TEXT DEFAULT 'super_qualty', reason TEXT DEFAULT '', note TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)");
  } catch (e) {}
  await db.exec(`
  CREATE TABLE IF NOT EXISTS company_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT DEFAULT '',
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );

  CREATE TABLE IF NOT EXISTS company_languages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    needed_count INTEGER DEFAULT 1,
    filled_count INTEGER DEFAULT 0,
    position TEXT DEFAULT '',
    salary_min REAL DEFAULT 0,
    salary_max REAL DEFAULT 0,
    interview_time TEXT DEFAULT '',
    deadline TEXT DEFAULT '',
    notify_days INTEGER DEFAULT 5,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id)
  );
`);
  // All data comes from Supabase PostgreSQL only — no local storage, no auto-seed
  await seedAdmins();
  if (process.env.SEED_DEMO === '1') {
    await seedDemoData();
    console.log('Demo fixtures loaded (SEED_DEMO=1)');
  }
} // end initDatabase

// Email transporter (global scope - used by routes)
const SMTP_USER = process.env.SMTP_USER || 'mohamedfaron297@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'ushf stxg rmgp xhig';

// ===== Shared email shell =====
// Every outbound mail is wrapped in this one branded card so a template only has
// to supply its own inner content: RTL, responsive, dark surface + gold accents,
// hosted logo (served from /uploads) and a footer with the live origin.
function emailShell(inner) {
  return `
    <div dir="rtl" data-wz-card="1" style="max-width:600px;margin:0 auto;padding:0;font-family:'Tajawal','Segoe UI',Arial,Helvetica,sans-serif;">
      <div style="background:#0a0a0a;color:#f5f0e8;border:1px solid rgba(212,168,83,0.18);border-radius:20px;overflow:hidden;">
        <div style="text-align:center;padding:30px 30px 4px;">
          <img src="${BASE_URL}/uploads/wazef.png" width="170" height="85" alt="وَظِيف" style="width:170px;height:auto;border-radius:10px;display:block;margin:0 auto;">
          <div style="font-size:26px;font-weight:900;color:#d4a853;margin-top:8px;letter-spacing:1px;">وَظِيف</div>
        </div>
        <div style="padding:16px 30px 4px;">
          ${inner || ''}
        </div>
        <div style="text-align:center;padding:18px 30px 26px;margin-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;color:#7d745f;font-size:12px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          <p style="margin:7px 0 0;font-size:11px;"><a href="${BASE_URL}" style="color:#a9925a;text-decoration:none;">${BASE_URL.replace(/^https?:\/\//, '')}</a></p>
        </div>
      </div>
    </div>`;
}

// Idempotent: an argument that already IS the shared card passes through as-is.
function wrapEmail(html) {
  if (!html) return html;
  if (html.indexOf('data-wz-card') !== -1) return html;
  return emailShell(html);
}
async function logEmail(recipient, subject, method, status, error) {
  try {
    await db.prepare('INSERT INTO email_log (recipient, subject, method, status, error) VALUES (?, ?, ?, ?, ?)').run(recipient, String(subject || '').slice(0, 200), String(method || '').slice(0, 80), String(status || '').slice(0, 40), String(error || '').slice(0, 500));
  } catch (e) {
    console.log('email_log insert failed:', (e.message || '').slice(0, 120));
  }
}
async function sendEmail(to, subject, html, attachments) {
  console.log('sendEmail →', to, '|', subject.slice(0, 40));
  logEmail(to, subject, 'START', 'attempt', '');
  try {
  const files = (attachments || []).map(a => ({
    filename: a.filename,
    content: a.content,
    cid: a.cid,
    contentType: a.contentType
  }));
  // Every mail goes through the shared branded card (wrapEmail is idempotent).
  const body = wrapEmail(html);
  // Priority 1: Gmail SMTP — same as the old working site
  const attempts = [{
    name: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: SMTP_USER,
    pass: SMTP_PASS
  }, {
    name: 'Gmail-SSL',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    user: SMTP_USER,
    pass: SMTP_PASS
  }];
  if (process.env.BREVO_SMTP_KEY) {
    attempts.push({
      name: 'Brevo relay',
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false,
      user: process.env.BREVO_SMTP_USER || SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY
    });
  }
  for (const cfg of attempts) {
    try {
      const t = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: {
          user: cfg.user,
          pass: cfg.pass
        },
        connectionTimeout: 8000,
        socketTimeout: 10000
      });
      const msg = {
        from: `"وَظِيف" <${cfg.user}>`,
        to,
        subject,
        html: body
      };
      if (files.length) {
        msg.attachments = files.map(a => {
          const o = {
            filename: a.filename,
            content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content, 'base64')
          };
          if (a.cid) o.cid = a.cid;
          return o;
        });
      }
      await t.sendMail(msg);
      console.log('Email sent to:', to, 'via', cfg.name, cfg.port);
      logEmail(to, subject, cfg.name + ' ' + cfg.port, 'sent', '');
      return;
    } catch (e) {
      console.log(`${cfg.name}:${cfg.port} failed:`, e.code || '', e.responseCode || '', (e.message || '').split('\n')[0].slice(0, 200));
      logEmail(to, subject, cfg.name + ' ' + cfg.port, 'failed', (e.code || '') + ' ' + (e.responseCode || '') + ' ' + (e.message || '').split('\n')[0].slice(0, 300));
    }
  }
  // Priority 2: Brevo API (only reached if Gmail SMTP failed)
  if (process.env.BREVO_API_KEY) {
    try {
      const payload = {
        sender: {
          name: 'وَظِيف',
          email: SMTP_USER
        },
        to: [{
          email: to
        }],
        subject,
        htmlContent: body
      };
      // Brevo attachments only accept { content, name }.
      if (files.length) payload.attachment = files.map(a => {
        const o = {
          content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content,
          name: a.filename
        };
        if (a.cid) {
          o.contentId = a.cid;
          o.isInline = true;
        }
        return o;
      });
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) {
        const errBody = await r.text();
        console.log('Brevo error:', r.status, errBody.slice(0, 300));
        throw new Error('Brevo HTTP ' + r.status + ': ' + errBody.slice(0, 200));
      }
      console.log('Email sent to:', to, 'via Brevo API (Gmail SMTP failed)');
      logEmail(to, subject, 'Brevo API', 'sent', '');
      return;
    } catch (e) {
      console.log('Brevo failed:', e.message.split('\n')[0]);
      logEmail(to, subject, 'Brevo API', 'failed', e.message.split('\n')[0].slice(0, 400));
    }
  }
  // Priority 3: Resend (only reached if everything above failed)
  if (process.env.RESEND_API_KEY) {
    try {
      const payload = {
        from: `"وَظِيف" <${process.env.RESEND_FROM || 'onboarding@resend.dev'}>`,
        to: [to],
        subject,
        html: body
      };
      if (files.length) payload.attachments = files.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : a.content
      }));
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      if (!r.ok) {
        const errBody = await r.text();
        console.log('Resend error:', r.status, errBody.slice(0, 300));
        throw new Error('Resend HTTP ' + r.status);
      }
      console.log('Email sent via Resend to:', to);
      logEmail(to, subject, 'Resend', 'sent', '');
      return;
    } catch (e) {
      console.log('Resend failed:', e.message.split('\n')[0]);
      logEmail(to, subject, 'Resend', 'failed', e.message.split('\n')[0].slice(0, 400));
    }
  }
  console.log('Email send error: ALL methods failed for', to, '| BREVO_API_KEY:', process.env.BREVO_API_KEY ? 'set' : 'missing', '| RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'set' : 'missing');
  logEmail(to, subject, 'ALL', 'all_failed', 'Gmail/Brevo/Resend all failed');
  } catch (e) {
    console.log('sendEmail EXCEPTION:', e && (e.stack || e.message || String(e)));
  }
}
async function backupDatabase(manual) {
  try {
    const when = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (!db.db) {
      // Cloud (PostgreSQL) mode: email a SQL dump instead of a binary file
      const dump = await buildSqlDump();
      const size = Buffer.byteLength(dump, 'utf8');
      await sendEmail(SMTP_USER, 'نسخة احتياطية - وَظِيف ' + when, `<h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">نسخة احتياطية ${manual ? 'يدوية' : 'تلقائية'}</h2><p>التاريخ: ${when}</p><p>الحجم: ${(size / 1024).toFixed(1)} KB</p><p>احتفظ بهذا الملف - يمكن استرجاعه من لوحة الأدمن.</p>`, [{
        filename: `wazeef-backup-${Date.now()}.sql`,
        content: Buffer.from(dump, 'utf8').toString('base64')
      }]);
      console.log('Backup emailed (SQL dump), size:', size);
      return {
        ok: true,
        size
      };
    }
    const tmp = path.join(dataDir, 'backup-tmp.db');
    const data = db.db.export();
    fs.writeFileSync(tmp, Buffer.from(data));
    const size = fs.statSync(tmp).size;
    if (size > 20 * 1024 * 1024) {
      try {
        fs.unlinkSync(tmp);
      } catch (e) {}
      console.log('Backup skipped: DB too large (' + size + ')');
      return {
        ok: false,
        error: 'too large'
      };
    }
    const b64 = fs.readFileSync(tmp).toString('base64');
    fs.unlinkSync(tmp);
    await sendEmail(SMTP_USER, 'نسخة احتياطية - وَظِيف ' + when, `<h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">نسخة احتياطية ${manual ? 'يدوية' : 'تلقائية'}</h2><p>التاريخ: ${when}</p><p>الحجم: ${(size / 1024).toFixed(1)} KB</p><p>احتفظ بهذا الملف - يمكن استرجاعه من لوحة الأدمن.</p>`, [{
      filename: `wazeef-backup-${Date.now()}.db`,
      content: b64
    }]);
    console.log('Backup emailed, size:', size);
    return {
      ok: true,
      size
    };
  } catch (e) {
    console.log('Backup failed:', e.message);
    return {
      ok: false,
      error: e.message
    };
  }
}
async function saveNotification(userId, agentId, type, title, message) {
  try {
    await db.prepare('INSERT INTO notifications (user_id, agent_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(userId || null, agentId || null, type, title, message);
  } catch (e) {
    console.log('Notification save error:', e.message);
  }
}
function sendApplicantToCompany(compEmail, u, job) {
  const jobHTML = `
    <div style="padding:12px;background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.1);border-radius:8px;margin-bottom:8px;">
      <strong style="color:#d4a853;">${job.position || ''}</strong><br>
      ${job.interview_time ? 'وقت المقابلة: ' + job.interview_time + '<br>' : ''}
      ${job.salary_min || job.salary_max ? `المرتب: ${job.salary_min && job.salary_max ? job.salary_min + ' - ' + job.salary_max + ' ج' : job.salary_min ? 'من ' + job.salary_min + ' ج' : 'حتى ' + job.salary_max + ' ج'}<br>` : ''}
      ${job.description ? 'التفاصيل: ' + job.description : ''}
    </div>`;
  const html = `
    
      <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">بيانات متقدم لوظيفة</h2>
      <p>مرحباً،</p>
      <p>تم تعيين متقدم لوظيفة في شركتكم عبر منصة <strong style="color:#d4a853;">وَظِيف</strong>. فيما بيانات المتقدم والوظيفة:</p>
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
        <h3 style="color:#d4a853;margin-bottom:12px;">بيانات المتقدم:</h3>
        <table style="width:100%;color:#ccc;font-size:14px;border-collapse:collapse;">
          <tr><td style="padding:6px 0;color:#94a3b8;">الاسم</td><td style="padding:6px 0;font-weight:700;color:#f0d78c;">${u.name || ''}</td></tr>
          <tr><td style="padding:6px 0;color:#94a3b8;">البريد</td><td style="padding:6px 0;">${u.email || ''}</td></tr>
          ${u.phone ? `<tr><td style="padding:6px 0;color:#94a3b8;">الهاتف</td><td style="padding:6px 0;" dir="ltr">${u.phone}</td></tr>` : ''}
          ${u.nationality ? `<tr><td style="padding:6px 0;color:#94a3b8;">الجنسية</td><td style="padding:6px 0;">${u.nationality}</td></tr>` : ''}
          ${u.city ? `<tr><td style="padding:6px 0;color:#94a3b8;">المدينة</td><td style="padding:6px 0;">${u.city}</td></tr>` : ''}
          ${u.age ? `<tr><td style="padding:6px 0;color:#94a3b8;">العمر</td><td style="padding:6px 0;">${u.age}</td></tr>` : ''}
          ${u.education_level ? `<tr><td style="padding:6px 0;color:#94a3b8;">المؤهل</td><td style="padding:6px 0;">${u.education_level}</td></tr>` : ''}
          ${u.college ? `<tr><td style="padding:6px 0;color:#94a3b8;">الكلية</td><td style="padding:6px 0;">${u.college}</td></tr>` : ''}
          ${u.national_id ? `<tr><td style="padding:6px 0;color:#94a3b8;">الرقم القومي</td><td style="padding:6px 0;" dir="ltr">${u.national_id}</td></tr>` : ''}
          ${u.military_status ? `<tr><td style="padding:6px 0;color:#94a3b8;">الحالة العسكرية</td><td style="padding:6px 0;">${u.military_status}</td></tr>` : ''}
          ${u.call_center_experience ? `<tr><td style="padding:6px 0;color:#94a3b8;">خبرة سنترال</td><td style="padding:6px 0;">${u.call_center_experience}</td></tr>` : ''}
        </table>
      </div>
      <h3 style="color:#d4a853;margin-bottom:12px;">الوظيفة:</h3>
      ${jobHTML}
      
    `;
  sendEmail(compEmail, 'بيانات متقدم لوظيفة - وَظِيف', html);
}

// Auth middleware
// Session identity helpers -------------------------------------------------
// Resolve the agent row for the current session using an UNAMBIGUOUS identity:
//   agent_id (agent tokens) -> email (same person, applicant+agent account)
//   -> id, but ONLY when the token itself is an agent token.
// A users.id must never be matched against agents.id (both autoincrement from 1).
async function getAgentRowOf(req) {
  if (!req.user) return null;
  if (req.user.role === 'admin') return null;
  try {
    if (req.user.agent_id) {
      const r = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.user.agent_id);
      return r || null; // deleted agent: no fallback (stale token must lose access)
    }
    if (req.user.email) {
      const r = await db.prepare('SELECT * FROM agents WHERE email=?').get(req.user.email);
      if (r) return r;
    }
    if (req.user.id && (AGENT_ROLES.indexOf(req.user.role) >= 0 || AGENT_ROLES.indexOf(req.user.agent_role || '') >= 0)) {
      const r = await db.prepare('SELECT * FROM agents WHERE id=?').get(req.user.id);
      return r || null;
    }
  } catch (e) {}
  return null;
}

// Does the account behind this token still exist (and is it not blocked)?
// Deleted / deactivated accounts must be rejected with 401 so the frontend
// clears the session and returns to the login screen.
async function sessionAccount(decoded) {
  try {
    if (!decoded || !decoded.id) return null;
    if (decoded.role === 'company') {
      const cu = await db.prepare('SELECT id, is_active FROM company_users WHERE id=?').get(decoded.id);
      return cu && cu.is_active === 1 ? {
        type: 'company'
      } : null;
    }
    if (AGENT_ROLES.indexOf(decoded.role) >= 0) {
      const a = await db.prepare('SELECT id, is_active FROM agents WHERE id=?').get(decoded.agent_id || decoded.id);
      return a && a.is_active === 1 ? {
        type: 'agent',
        role: a.role
      } : null;
    }
    const u = await db.prepare('SELECT id, role FROM users WHERE id=?').get(decoded.id);
    if (!u) {
      // user row gone: allow only if the person is still an active agent
      if (decoded.agent_id) {
        const a = await db.prepare('SELECT id, is_active FROM agents WHERE id=?').get(decoded.agent_id);
        if (a && a.is_active === 1) return {
          type: 'agent',
          role: a.role
        };
      }
      return null;
    }
    if (u.role === 'admin' && decoded.role === 'admin') return {
      type: 'admin',
      role: 'admin'
    };
    if (decoded.role === 'admin') return null; // admin role revoked in DB
    return {
      type: 'user',
      role: u.role || 'user'
    };
  } catch (e) {
    return {
      type: 'unknown'
    }; // transient DB problem: never mass-logout
  }
}
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({
    error: 'Unauthorized',
    code: 'SESSION_INVALID'
  });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const acc = await sessionAccount(decoded);
    if (!acc) return res.status(401).json({
      error: 'الجلسة انتهت، برجاء تسجيل الدخول مرة أخرى',
      code: 'SESSION_INVALID'
    });
    req.user = decoded;
    req.account = acc;
    next();
  } catch (e) {
    return res.status(401).json({
      error: 'Invalid token',
      code: 'SESSION_INVALID'
    });
  }
}
function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({
    error: 'Forbidden'
  });
  next();
}
async function adminOrQualtyMiddleware(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (await isQualtyRole(req)) return next();
  return res.status(403).json({
    error: 'Forbidden'
  });
}
async function adminOrAgentMiddleware(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (await isAgentUser(req)) return next();
  return res.status(403).json({
    error: 'Forbidden'
  });
}
async function isAgentUser(req) {
  if (req.user && req.user.role === 'admin') return false;
  const row = await getAgentRowOf(req);
  return !!(row && row.is_active === 1 && AGENT_ROLES.indexOf(row.role) >= 0);
}
async function getAgentRole(req) {
  if (req.user && req.user.role === 'admin') return 'admin';
  const row = await getAgentRowOf(req);
  if (row && row.is_active === 1 && row.role) return row.role;
  return null;
}
async function getAgentId(req) {
  if (req.user && req.user.role === 'admin') return null;
  const row = await getAgentRowOf(req);
  return row ? row.id : null;
}
const AGENT_ROLES = ['agent', 'qualty', 'team_leader', 'super_qualty'];
const QUALTY_ROLES = ['qualty', 'super_qualty'];
async function isQualtyRole(req) {
  const r = await getAgentRole(req);
  return r === 'qualty' || r === 'super_qualty';
}
async function isTeamLeaderRole(req) {
  return (await getAgentRole(req)) === 'team_leader';
}
async function isSuperQualtyRole(req) {
  return (await getAgentRole(req)) === 'super_qualty';
}

// Languages the admin pins a person to when he moves him to a qualty
const QUALTY_LANGS = [['en', 'الإنجليزية'], ['fr', 'الفرنسية'], ['it', 'الإيطالية'], ['es', 'الإسبانية'], ['de', 'الألمانية'], ['pt', 'البرتغالية'], ['tr', 'التركية'], ['ru', 'الروسية'], ['zh', 'الصينية'], ['ja', 'اليابانية'], ['ko', 'الكورية'], ['nl', 'الهولندية'], ['sv', 'السويدية'], ['hi', 'الهندية'], ['ar', 'العربية']];
const LANG_ALIASES = {
  english: 'en',
  french: 'fr',
  'français': 'fr',
  francais: 'fr',
  italian: 'it',
  italiano: 'it',
  spanish: 'es',
  german: 'de',
  deutsch: 'de',
  portuguese: 'pt',
  turkish: 'tr',
  russian: 'ru',
  chinese: 'zh',
  japanese: 'ja',
  korean: 'ko',
  arabic: 'ar',
  dutch: 'nl',
  swedish: 'sv',
  hindi: 'hi'
};
function normLangCode(v) {
  const c = String(v || '').trim().toLowerCase();
  return LANG_ALIASES[c] || c;
}
function qualtyLangList(csv) {
  return String(csv || '').split(',').map(normLangCode).filter(Boolean);
}

// A qualty acts on an application if it is assigned to him by name, OR if the
// admin pinned languages for him and this application's language is one of them.
// (Super qualty / admin keep full access — this only gates the plain `qualty`.)
async function qualtyCanActOnApp(req, appRow) {
  if ((await getAgentRole(req)) !== 'qualty') return true;
  if (!appRow) return false;
  const myId = await getAgentId(req);
  if (Number(appRow.assigned_qualty_id || 0) === Number(myId || 0)) return true;
  const me = await db.prepare('SELECT qualty_languages FROM agents WHERE id = ?').get(myId);
  const myLangs = qualtyLangList(me && me.qualty_languages);
  if (!myLangs.length) return false;
  let lang = appRow.language || '';
  if (!lang && appRow.user_id) {
    const u = await db.prepare('SELECT language_applied FROM users WHERE id = ?').get(appRow.user_id);
    lang = u && u.language_applied || '';
  }
  return myLangs.indexOf(normLangCode(lang)) >= 0;
}

// Companies are VIEW-ONLY for every active non-labor agent (agent / team_leader).
// QUALTY keeps its old access, and editing (POST/PUT/DELETE) stays admin/qualty only.
async function canViewCompanies(req) {
  if (req.user && req.user.role === 'admin') return true;
  const row = await getAgentRowOf(req);
  if (!row || row.is_active !== 1) return false;
  if (QUALTY_ROLES.indexOf(row.role) >= 0) return true;
  if (row.agent_type === 'labor') return false;
  return row.role === 'agent' || row.role === 'team_leader';
}
async function companiesViewer(req, res, next) {
  if (await canViewCompanies(req)) return next();
  return res.status(403).json({
    error: 'Forbidden'
  });
}
async function teamLeaderMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  if (await isTeamLeaderRole(req)) return next();
  return res.status(403).json({
    error: 'Forbidden'
  });
}
async function superQualtyMiddleware(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  if (await isSuperQualtyRole(req)) return next();
  return res.status(403).json({
    error: 'Forbidden'
  });
}
async function getTeamLeaderIdFor(req) {
  if (req.user && req.user.role === 'admin') return null;
  return await getAgentId(req);
}

// ===== AUTH ROUTES =====
app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !user.password) return res.status(400).json({
      error: 'Invalid credentials'
    });
    if (!bcrypt.compareSync(password || '', user.password)) return res.status(400).json({
      error: 'Invalid credentials'
    });
    if (user.email_verified === 0) return res.status(400).json({
      error: 'يجب التحقق من البريد الإلكتروني أولاً',
      code: 'EMAIL_NOT_VERIFIED'
    });
    const agentRow = await db.prepare('SELECT * FROM agents WHERE email = ?').get(user.email);
    const agentRole = agentRow ? agentRow.role || 'agent' : null;
    const token = jwt.sign({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      agent_role: agentRole,
      agent_id: agentRow ? agentRow.id : null
    }, JWT_SECRET, {
      expiresIn: '7d'
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        agent_role: agentRole
      }
    });
  } catch (e) {
    console.log('Login error:', e && e.message, '| code:', e && e.code, '| stack:', (e && e.stack || '').split('\n').slice(0,3).join(' | '));
    res.status(500).json({
      error: 'حدث خطأ في الخادم'
    });
  }
});

// ===== FORGOT PASSWORD =====
app.post('/api/forgot-password', authLimiter, async (req, res) => {
  try {
    const {
      email
    } = req.body;
    if (!email) return res.status(400).json({
      error: 'أدخل البريد الإلكتروني'
    });
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({
      error: 'البريد الإلكتروني غير مسجل'
    });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.prepare('UPDATE users SET verification_code = ?, code_expiry = ? WHERE id = ?').run(code, expiry, user.id);
    const html = `
      
        
        <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">إعادة تعيين كلمة المرور</h2>
        <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${sanitize(user.name)},</p>
        <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:20px;">تلقينا طلبًا لإعادة تعيين كلمة المرور الخاص بك. استخدم الكود التالي:</p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-block;padding:16px 32px;background:rgba(212,168,83,0.08);border:1px solid rgba(212,168,83,0.15);border-radius:14px;font-size:32px;font-weight:900;letter-spacing:8px;color:#f0d78c;font-family:'Courier New',monospace;">${code}</div>
        </div>
        <p style="color:#888;font-size:13px;text-align:center;margin-bottom:12px;">صالح لمدة 15 دقيقة فقط</p>
        <p style="color:#888;font-size:13px;text-align:center;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.</p>
        
      
    `;
    sendEmail(email, 'إعادة تعيين كلمة المرور - وَظِيف', html);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/verify-reset-code', authLimiter, async (req, res) => {
  try {
    const {
      email,
      code
    } = req.body;
    if (!email || !code) return res.status(400).json({
      error: 'أكمل كل الحقول'
    });
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({
      error: 'البريد الإلكتروني غير مسجل'
    });
    if (user.verification_code !== code) return res.status(400).json({
      error: 'الكود غير صحيح'
    });
    if (user.code_expiry && new Date(user.code_expiry) < new Date()) return res.status(400).json({
      error: 'انتهت صلاحية الكود'
    });
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    await db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(resetToken, tokenExpiry, user.id);
    res.json({
      success: true,
      resetToken
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/reset-password', authLimiter, async (req, res) => {
  try {
    const {
      email,
      resetToken,
      newPassword
    } = req.body;
    if (!email || !resetToken || !newPassword) return res.status(400).json({
      error: 'أكمل كل الحقول'
    });
    if (newPassword.length < 6) return res.status(400).json({
      error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    });
    const user = await db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({
      error: 'البريد الإلكتروني غير مسجل'
    });
    if (user.reset_token !== resetToken) return res.status(400).json({
      error: 'الكود غير صحيح أو تم استخدامه'
    });
    if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) return res.status(400).json({
      error: 'انتهت صلاحية الكود'
    });
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, verification_code = NULL, code_expiry = NULL WHERE id = ?').run(hashed, user.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== APPLICATION ROUTES =====
// Accept audio as multipart file (local/dev) OR base64 JSON (hosts whose proxy stalls multipart)
function saveBase64Audio(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:audio\/\w+;base64,(.+)$/) || dataUrl.match(/^([A-Za-z0-9+/=]+)$/);
  const b64 = m ? m[1] : dataUrl;
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length || buf.length > 10 * 1024 * 1024) return null;
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {
    recursive: true
  });
  const filename = Date.now() + '-recording.webm';
  fs.writeFileSync(path.join(uploadsDir, filename), buf);
  return filename;
}
app.post('/api/applications', authMiddleware, (req, res, next) => {
  if (req.is('multipart/*')) return upload.single('audio')(req, res, next);
  next();
}, async (req, res) => {
  try {
    let audioFile = req.file ? req.file.filename : null;
    if (!audioFile && req.body.audio) audioFile = saveBase64Audio(req.body.audio);
    const r = await processApplication(req.user.id, audioFile, req.body.language || null);
    if (r.error) return res.status(r.status || 400).json({
      error: r.error
    });
    res.json({
      id: r.id,
      status: 'pending'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Chunked upload: bodies > ~10KB stall on some proxies, so the client sends
// ~6KB base64 pieces that we reassemble here. Same application logic.
app.post('/api/applications/chunk', authMiddleware, async (req, res) => {
  try {
    const {
      uploadId,
      index,
      total,
      chunk,
      language
    } = req.body;
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(uploadId || '')) return res.status(400).json({
      error: 'معرف رفع غير صالح'
    });
    const idx = parseInt(index),
      tot = parseInt(total);
    if (isNaN(idx) || isNaN(tot) || idx < 0 || tot <= 0 || idx >= tot || tot > 2000) return res.status(400).json({
      error: 'بيانات غير صالحة'
    });
    if (!chunk || typeof chunk !== 'string' || chunk.length > 8000) return res.status(400).json({
      error: 'بيانات غير صالحة'
    });
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {
      recursive: true
    });
    const partPath = path.join(uploadsDir, 'tmp_' + uploadId + '.part');
    if (idx === 0 && fs.existsSync(partPath)) fs.unlinkSync(partPath);
    fs.appendFileSync(partPath, chunk);
    if (idx < tot - 1) return res.json({
      received: idx + 1,
      total: tot
    });
    const b64 = fs.readFileSync(partPath, 'utf8');
    fs.unlinkSync(partPath);
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length || buf.length > 10 * 1024 * 1024) return res.status(400).json({
      error: 'حجم الملف غير صالح'
    });
    const filename = Date.now() + '-recording.webm';
    fs.writeFileSync(path.join(uploadsDir, filename), buf);
    const r = await processApplication(req.user.id, filename, language || null);
    if (r.error) return res.status(r.status || 400).json({
      error: r.error
    });
    res.json({
      id: r.id,
      status: 'pending'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Shared: re-record update OR rejection check OR fresh insert
async function getNextQualtyId() {
  const qualtys = await db.prepare("SELECT id FROM agents WHERE role IN ('qualty','super_qualty') AND is_active=1 AND IFNULL(agent_type,'normal') != 'labor' ORDER BY id").all();
  if (qualtys.length === 0) return null;
  const last = await db.prepare("SELECT assigned_qualty_id FROM applications WHERE assigned_qualty_id IS NOT NULL ORDER BY id DESC LIMIT 1").get();
  if (!last || !last.assigned_qualty_id) return qualtys[0].id;
  const idx = qualtys.findIndex(q => q.id === last.assigned_qualty_id);
  if (idx === -1) return qualtys[0].id;
  return qualtys[(idx + 1) % qualtys.length].id;
}

// A request belongs to the qualty that brought the applicant in (referral code),
// otherwise it is spread over the qualtys round-robin.
async function preferredQualtyForUser(userId) {
  try {
    const u = await db.prepare('SELECT referred_by FROM users WHERE id = ?').get(userId);
    if (!u || !u.referred_by) return null;
    const a = await db.prepare("SELECT id FROM agents WHERE id = ? AND role IN ('qualty','super_qualty') AND is_active=1 AND IFNULL(agent_type,'normal') != 'labor'").get(u.referred_by);
    return a ? a.id : null;
  } catch (e) {
    return null;
  }
}
async function processApplication(userId, audioFile, language) {
  const existing = await db.prepare("SELECT id, audio_file FROM applications WHERE user_id = ? AND rerecord_request = 1 AND status = 'pending'").get(userId);
  if (existing) {
    // Delete the old recording so it doesn't stay orphaned on disk
    if (existing.audio_file && existing.audio_file !== audioFile) {
      try {
        fs.unlinkSync(path.join(uploadsDir, existing.audio_file));
      } catch (e) {}
    }
    await db.prepare('UPDATE applications SET audio_file = ?, language = ?, rerecord_request = 0 WHERE id = ?').run(audioFile, language, existing.id);
    return {
      id: existing.id
    };
  }
  if (language) {
    const restricted = await db.prepare(`
      SELECT id, rejection_date FROM applications
      WHERE user_id = ? AND language = ? AND status = 'rejected' AND rejection_date IS NOT NULL
      ORDER BY rejection_date DESC LIMIT 1
    `).get(userId, language);
    if (restricted && restricted.rejection_date) {
      const rejectDate = new Date(restricted.rejection_date);
      const oneMonthLater = new Date(rejectDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() < oneMonthLater) {
        const remaining = Math.ceil((oneMonthLater - new Date()) / (24 * 60 * 60 * 1000));
        return {
          error: `تم رفضك لهذه اللغة. يجب الانتظار ${remaining} يوماً حتى تتمكن من التقديم مرة أخرى. تدرب وحسّن مستواك أولاً.`,
          status: 400
        };
      }
    }
  }
  const result = await db.prepare('INSERT INTO applications (user_id, audio_file, language) VALUES (?, ?, ?)').run(userId, audioFile, language);
  // Delete old applications for this user (keep only the newest)
  const oldApps = await db.prepare("SELECT id, audio_file FROM applications WHERE user_id = ? AND id != ? AND status NOT IN ('selected','confirmed')").all(userId, result.lastInsertRowid);
  for (const old of oldApps) {
    if (old.audio_file) {
      try {
        fs.unlinkSync(path.join(uploadsDir, old.audio_file));
      } catch (e) {}
    }
    const oldJobs = await db.prepare('SELECT id FROM jobs WHERE application_id = ?').all(old.id);
    for (const j of oldJobs) {
      await db.prepare('DELETE FROM selections WHERE job_id = ?').run(j.id);
    }
    await db.prepare('DELETE FROM jobs WHERE application_id = ?').run(old.id);
    await db.prepare('DELETE FROM applications WHERE id = ?').run(old.id);
  }
  const qId = (await preferredQualtyForUser(userId)) || (await getNextQualtyId());
  if (qId) {
    try {
      await db.prepare("UPDATE applications SET assigned_qualty_id=? WHERE id=?").run(qId, result.lastInsertRowid);
    } catch (e) {}
  }
  return {
    id: result.lastInsertRowid
  };
}
// Distribute existing pending without assignment
(async () => {
  try {
    const pendingNulls = await db.prepare("SELECT id FROM applications WHERE status='pending' AND assigned_qualty_id IS NULL ORDER BY id").all();
    for (const row of pendingNulls) {
      const qId = (await preferredQualtyForUser(row.user_id)) || (await getNextQualtyId());
      if (qId) await db.prepare("UPDATE applications SET assigned_qualty_id=? WHERE id=?").run(qId, row.id);
    }
  } catch (e) {}
})();
app.get('/api/applications/my', authMiddleware, async (req, res) => {
  try {
    const apps = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM applications a JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);
    res.json(apps);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== VOICE ARCHIVE ON VOCAROO =====
// When an application is approved the local recording is uploaded to Vocaroo,
// the local file is deleted and the public link is stored in applications.audio_url.
const VOCAROO_UPLOAD_URLS = ['https://upload1.vocaroo.com/apps/main-api/upload', 'https://upload2.vocaroo.com/apps/main-api/upload'];
const VOCAROO_API = 'https://vocaroo.com/apps/main-api';
const VOCAROO_ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VOCAROO_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36';
function vocarooRandomId() {
  const b = require('crypto').randomBytes(16);
  let s = '';
  for (let i = 0; i < 16; i++) s += VOCAROO_ID_ALPHABET[b[i] % VOCAROO_ID_ALPHABET.length];
  return s;
}

// Vocaroo serves the mp3 from a different host depending on the media id length
function vocarooMp3Url(mediaId) {
  const len = String(mediaId || '').length;
  if (len === 12 && mediaId[0] === '1') return 'https://media1.vocaroo.com/mp3/' + mediaId;
  if (len === 10) return 'https://media1.vocaroo.com/mp3/' + mediaId;
  return 'https://media.vocaroo.com/mp3/' + mediaId;
}
function vocarooMediaIdFromLink(link) {
  const m = String(link || '').match(/(?:voca\.ro|vocaroo\.com)\/(?:embed\/)?([A-Za-z0-9]{6,24})/);
  return m ? m[1] : '';
}
async function vocarooUpload(buf) {
  let base = null;
  for (const u of VOCAROO_UPLOAD_URLS) {
    try {
      const r = await fetch(u + '/alive', {
        method: 'HEAD'
      });
      if (r.ok) {
        base = u;
        break;
      }
    } catch (e) {}
  }
  if (!base) throw new Error('vocaroo: no alive mirror');
  const uploadId = vocarooRandomId();
  const urlWithId = base + '/' + uploadId;
  const CHUNK = 100000;
  for (let t = 0, i = 0; t < buf.length; t += CHUNK, i++) {
    const fd = new FormData();
    fd.append('chunk', new Blob([buf.subarray(t, Math.min(t + CHUNK, buf.length))], {
      type: 'application/octet-stream'
    }), 'chunk');
    const r = await fetch(urlWithId + '/chunk/' + i, {
      method: 'POST',
      body: fd
    });
    if (!r.ok) throw new Error('vocaroo: chunk ' + i + ' failed (' + r.status + ')');
  }
  const fr = await fetch(urlWithId + '/finalize', {
    method: 'POST'
  });
  const fj = await fr.json().catch(function () {
    return {};
  });
  if (fj.status !== 0 || !fj.mediaId) throw new Error('vocaroo: finalize failed ' + JSON.stringify(fj));
  let status = -1;
  for (let i = 0; i < 25; i++) {
    let sj = {};
    try {
      const sr = await fetch(VOCAROO_API + '/upload/status/' + fj.mediaId);
      sj = await sr.json().catch(function () {
        return {};
      });
      status = sj.status;
    } catch (e) {}
    if (status === 0) break;
    if (status === 2) throw new Error('vocaroo: processing failed');
    await new Promise(function (r) {
      setTimeout(r, 800);
    });
  }
  if (status !== 0) throw new Error('vocaroo: processing timeout');
  return {
    mediaId: fj.mediaId,
    ownerToken: fj.ownerToken || '',
    link: 'https://voca.ro/' + fj.mediaId,
    embed: 'https://vocaroo.com/embed/' + fj.mediaId,
    mp3: vocarooMp3Url(fj.mediaId)
  };
}

// small cache so repeated plays do not re-fetch from Vocaroo
const vocarooAudioCache = new Map();
function vocarooCacheSet(id, buf) {
  vocarooAudioCache.set(id, buf);
  if (vocarooAudioCache.size > 60) vocarooAudioCache.delete(vocarooAudioCache.keys().next().value);
}

// Plays a archived voice inside our own site (no hotlink/CORS problems)
app.get('/api/vocaroo/audio/:mediaId', async (req, res) => {
  try {
    const id = String(req.params.mediaId || '').replace(/[^A-Za-z0-9]/g, '');
    if (id.length < 6) return res.status(400).json({
      error: 'معرّف غير صالح'
    });
    if (vocarooAudioCache.has(id)) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      return res.send(vocarooAudioCache.get(id));
    }
    const r = await fetch(vocarooMp3Url(id), {
      headers: {
        'User-Agent': VOCAROO_UA,
        'Referer': 'https://vocaroo.com/',
        'Origin': 'https://vocaroo.com'
      }
    });
    if (!r.ok) return res.status(404).json({
      error: 'التسجيل غير متاح'
    });
    const buf = Buffer.from(await r.arrayBuffer());
    vocarooCacheSet(id, buf);
    res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=2592000');
    res.send(buf);
  } catch (e) {
    res.status(502).json({
      error: 'تعذر تحميل التسجيل'
    });
  }
});

// ===== ADMIN ROUTES =====
app.get('/api/admin/applications', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      agent_id
    } = req.query;
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language, u.language_level, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        u.qualty_languages,
        ag.name as agent_name, ag.email as agent_email, ag.phone as agent_phone, ag.referral_code as agent_code,
        ag.payment_method as agent_payment_method, ag.payment_operator as agent_payment_operator,
        agq.name as qualty_name,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id AND id NOT IN (SELECT job_id FROM selections WHERE user_id = a.user_id AND status = 'cancelled')) as jobs_count,
        CASE WHEN NOT EXISTS (SELECT 1 FROM selections WHERE user_id = a.user_id AND status IN ('selected','confirmed')) THEN 1 ELSE 0 END as has_no_active_selection,
        CASE WHEN EXISTS (SELECT 1 FROM jobs WHERE application_id = a.id AND id NOT IN (SELECT job_id FROM selections WHERE user_id = a.user_id AND status = 'cancelled')) THEN 1 ELSE 0 END as has_available_jobs
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      LEFT JOIN agents agq ON agq.id = a.assigned_qualty_id
    `;
    const params = [];
    const role = await getAgentRole(req);
    // لغات القولتي نفسه (حددها الأدمن من المندوبين) → يشوف بس طلبات لغاته دي
    let myLangs = [];
    if (role === 'qualty' || role === 'super_qualty') {
      const meId = await getAgentId(req);
      const me = meId ? await db.prepare('SELECT qualty_languages FROM agents WHERE id = ?').get(meId) : null;
      myLangs = qualtyLangList(me && me.qualty_languages);
    }
    if (role === 'super_qualty') {
      // السوبر قولتي يرى كل المتقدمين (بنرشح بس بلغاته لو حددها الأدمن)
    } else if (role === 'qualty') {
      // القولتي يرى كل المتقدمين، وبنرشح بلغاته هو + لغات الأشخاص المنقولين ليه
    } else if (agent_id) {
      query += ' WHERE u.referred_by = ?';
      params.push(parseInt(agent_id));
    }
    query += ' ORDER BY a.created_at DESC';
    let apps = await db.prepare(query).all(...params);
    // فلتر اللغات: لغات القولتي نفسه + (للقولتي العادي) لغات الشخص المحدد ليه
    if (myLangs.length || role === 'qualty') {
      apps = apps.filter(function (a) {
        const ln = normLangCode(a.language || a.user_language);
        if (myLangs.length && myLangs.indexOf(ln) < 0) return false;
        if (role === 'qualty') {
          const personLangs = qualtyLangList(a.qualty_languages);
          if (personLangs.length && personLangs.indexOf(ln) < 0) return false;
        }
        return true;
      });
    }
    res.json(apps);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: move a person to a qualty + pin the languages he may be reviewed for
app.put('/api/admin/applications/:id/qualty', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const app = await db.prepare('SELECT id, user_id, assigned_qualty_id FROM applications WHERE id = ?').get(parseInt(req.params.id));
    if (!app) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    const body = req.body || {};
    const out = {
      id: app.id,
      user_id: app.user_id
    };
    if (Object.prototype.hasOwnProperty.call(body, 'qualty_id')) {
      const qid = parseInt(body.qualty_id);
      if (qid) {
        const ag = await db.prepare("SELECT id, name FROM agents WHERE id = ? AND role IN ('qualty','super_qualty') AND is_active = 1").get(qid);
        if (!ag) return res.status(404).json({
          error: 'القولتي غير موجود'
        });
        await db.prepare('UPDATE applications SET assigned_qualty_id = ? WHERE id = ?').run(qid, app.id);
        out.assigned_qualty_id = qid;
        out.qualty_name = ag.name;
      } else {
        await db.prepare('UPDATE applications SET assigned_qualty_id = NULL WHERE id = ?').run(app.id);
        out.assigned_qualty_id = null;
        out.qualty_name = null;
      }
    }
    if (Object.prototype.hasOwnProperty.call(body, 'languages')) {
      const list = Array.isArray(body.languages) ? body.languages : [];
      const clean = [];
      for (const raw of list) {
        const c = normLangCode(raw);
        if (!/^[a-z]{2,8}$/.test(c)) return res.status(400).json({
          error: 'لغة غير صالحة: ' + String(raw).slice(0, 20)
        });
        if (clean.indexOf(c) === -1) clean.push(c);
        if (clean.length > 10) return res.status(400).json({
          error: 'الحد الأقصى 10 لغات'
        });
      }
      await db.prepare('UPDATE users SET qualty_languages = ? WHERE id = ?').run(clean.join(','), app.user_id);
      out.languages = clean;
    }
    res.json({
      success: true,
      user_id: app.user_id,
      ...out
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/applications/:id/approve', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const appRow = await db.prepare("SELECT id, user_id, language, assigned_qualty_id FROM applications WHERE id = ?").get(req.params.id);
    if (!appRow) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    if (!(await qualtyCanActOnApp(req, appRow))) {
      return res.status(403).json({
        error: 'هذا الطلب خارج اللغات المحددة ليك'
      });
    }
    await db.prepare("UPDATE applications SET status = ?, approval_date = datetime('now') WHERE id = ?").run('approved', req.params.id);
    if (await isQualtyRole(req)) {
      const qId = await getAgentId(req);
      try {
        await db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id);
      } catch (e) {}
    }
    const app = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.language_level, u.language_applied
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);
    // Recording served its purpose (evaluation) - archive it on Vocaroo, then
    // delete the local file and keep the public link in applications.audio_url
    if (app && app.audio_file) {
      const localPath = path.join(uploadsDir, app.audio_file);
      let archived = null;
      try {
        if (fs.existsSync(localPath)) archived = await vocarooUpload(fs.readFileSync(localPath));
      } catch (ve) {
        console.log('vocaroo upload failed for application ' + req.params.id + ': ' + ve.message);
      }
      if (archived) {
        try {
          fs.unlinkSync(localPath);
        } catch (e) {}
        await db.prepare('UPDATE applications SET audio_file = NULL, audio_url = ? WHERE id = ?').run(archived.link, req.params.id);
        app.audio_url = archived.link;
      }
      // if the upload failed the local file is kept so the voice is not lost
    }
    if (app && app.user_email) {
      const html = `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">تمت الموافقة على طلبك!</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">مبروك! تمت الموافقة على طلبك للانضمام إلى منصة وَظِيف.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">سيتم مراجعة ملفك وإرسال وظائف مناسبة لك قريباً. تابع حسابك على الموقع لمعرفة آخر التحديثات.</p>
          
        
      `;
      sendEmail(app.user_email, 'تمت الموافقة على طلبك - وَظِيف', html);
    }
    await saveNotification(app.user_id, null, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.');
    res.json({
      success: true,
      user_name: app.user_name,
      language_level: app.language_level || '',
      language: app.language_applied || app.language || ''
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: set applicant language level (single e.g. B2, or range e.g. A1-B1)
app.put('/api/admin/users/:id/level', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const level = req.body && req.body.level != null ? String(req.body.level).trim() : '';
    const valid = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (level && !valid.includes(level) && !/^(A1|A2|B1|B2|C1|C2)\s*[-–to]+\s*(A1|A2|B1|B2|C1|C2)$/i.test(level)) {
      return res.status(400).json({
        error: 'المستوى غير صالح'
      });
    }
    await db.prepare('UPDATE users SET language_level = ? WHERE id = ?').run(level, req.params.id);
    res.json({
      success: true,
      level
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/applications/:id/reject', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      reason
    } = req.body || {};
    const appRow = await db.prepare("SELECT id, user_id, language, assigned_qualty_id FROM applications WHERE id = ?").get(req.params.id);
    if (!appRow) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    if (!(await qualtyCanActOnApp(req, appRow))) {
      return res.status(403).json({
        error: 'هذا الطلب خارج اللغات المحددة ليك'
      });
    }
    await db.prepare("UPDATE applications SET status = 'rejected', rejection_date = datetime('now'), rejection_reason = ? WHERE id = ?").run(reason || '', req.params.id);
    if (await isQualtyRole(req)) {
      const qId = await getAgentId(req);
      try {
        await db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id);
      } catch (e) {}
    }
    const app = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);

    // Rejected recording is no longer needed - delete it to save disk
    if (app && app.audio_file) {
      try {
        fs.unlinkSync(path.join(uploadsDir, app.audio_file));
      } catch (e) {}
      await db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(req.params.id);
    }
    if (app && app.user_email) {
      const html = `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#e57373;">تم رفض طلبك</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">للأسف تم رفض طلبك للانضمام إلى منصة وَظِيف.</p>
          ${reason ? `<div style="background:rgba(220,50,50,0.08);border:1px solid rgba(220,50,50,0.15);border-radius:14px;padding:18px 20px;margin-bottom:20px;">
            <h3 style="color:#e57373;font-size:14px;margin-bottom:8px;">سبب الرفض:</h3>
            <p style="color:#ccc;font-size:14px;line-height:1.7;">${reason}</p>
          </div>` : ''}
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">يجب عليك التدريب على اللغة "${app.language || ''}" وتحسين مستواك قبل التقديم مرة أخرى.</p>
          
        
      `;
      sendEmail(app.user_email, 'تم رفض طلبك - وَظِيف', html);
    }
    await saveNotification(app ? app.user_id : null, null, 'rejection', 'تم رفض طلبك', reason || 'تم رفض طلبك. يرجى التدريب والتقديم مرة أخرى.');
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/applications/:id/allow-reapply', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      reason
    } = req.body || {};
    await db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 0, audio_file = NULL WHERE id = ?").run(req.params.id);
    const app = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);

    // Old recording no longer needed (user will submit a new one) - delete it
    if (app && app.audio_file) {
      try {
        fs.unlinkSync(path.join(uploadsDir, app.audio_file));
      } catch (e) {}
      await db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(req.params.id);
    }
    if (app && app.user_email) {
      const html = `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">تم السماح لك بالتقديم مجدداً</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">تمت مراجعة طلبك مرة أخرى والسماح لك بالتقديم على منصة وَظِيف.</p>
          ${reason ? `<div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.12);border-radius:14px;padding:18px 20px;margin-bottom:20px;">
            <h3 style="color:#d4a853;font-size:14px;margin-bottom:8px;">ملاحظات:</h3>
            <p style="color:#ccc;font-size:14px;line-height:1.7;">${reason}</p>
          </div>` : ''}
          <p style="color:#aaa;font-size:15px;line-height:1.8;">يمكنك الآن تسجيل صوتك مرة أخرى والتقديم. سجّل من حسابك على الموقع.</p>
          
        
      `;
      sendEmail(app.user_email, 'تم السماح لك بالتقديم مجدداً - وَظِيف', html);
    }
    await saveNotification(app.user_id, null, 'reapply', 'تم السماح لك بالتقديم مجدداً', 'يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف.');
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/applications/:id/rerecord', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const appRow = await db.prepare("SELECT id, user_id, language, assigned_qualty_id, audio_file FROM applications WHERE id = ?").get(req.params.id);
    if (!appRow) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    if (!(await qualtyCanActOnApp(req, appRow))) {
      return res.status(403).json({
        error: 'هذا الطلب خارج اللغات المحددة ليك'
      });
    }
    // the user will submit a new recording, so drop the old one from disk too
    if (appRow.audio_file) {
      try {
        fs.unlinkSync(path.join(uploadsDir, appRow.audio_file));
      } catch (e) {}
    }
    await db.prepare('UPDATE applications SET rerecord_request = 0, audio_file = NULL, status = ? WHERE id = ?').run('pending', req.params.id);
    if (await isQualtyRole(req)) {
      const qId = await getAgentId(req);
      try {
        await db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id);
      } catch (e) {}
    }
    const app = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);
    if (app && app.user_email) {
      const html = `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#fbbf24;">يرجى إعادة التسجيل</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">نرجو منك إعادة تسجيل صوتك مرة أخرى. يرجى التأكد من جودة التسجيل ووضوح الصوت.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">سجّل من حسابك على الموقع واتبع الخطوات.</p>
          
        
      `;
      sendEmail(app.user_email, 'يرجى إعادة التسجيل - وَظِيف', html);
    }
    await saveNotification(app.user_id, null, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.');
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/jobs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      application_id,
      company_name,
      position,
      interview_time,
      salary_min,
      salary_max,
      description,
      company_id,
      company_email,
      language,
      level,
      needed_count,
      deadline,
      notify_days,
      work_location,
      employment_type
    } = req.body;
    let cid = company_id || null;
    if (!cid && company_name) {
      const co = await db.prepare("SELECT id FROM companies WHERE TRIM(name) = TRIM(?) OR (company_email IS NOT NULL AND company_email != '' AND company_email = ?) LIMIT 1").get(company_name, company_email || '');
      if (co) cid = co.id;
    }
    const cname = company_name || (cid ? ((await db.prepare('SELECT name FROM companies WHERE id=?').get(cid)) || {}).name : '');
    const cemail = company_email || (cid ? ((await db.prepare('SELECT company_email FROM companies WHERE id=?').get(cid)) || {}).company_email : '') || '';
    const appLang = ((await db.prepare('SELECT language FROM applications WHERE id = ?').get(application_id)) || {}).language || '';
    const result = await db.prepare('INSERT INTO jobs (application_id, company_id, company_name, company_email, position, interview_time, salary_min, salary_max, description, language, level, needed_count, deadline, notify_days, work_location, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(application_id, cid, cname, cemail, position, interview_time || '', salary_min || 0, salary_max || 0, description || '', language || appLang, level || '', needed_count ? parseInt(needed_count) || 1 : 1, deadline || '', notify_days ? parseInt(notify_days) || 5 : 5, String(work_location || '').trim(), String(employment_type || '').trim());
    await db.prepare("UPDATE applications SET status = 'approved' WHERE id = ? AND status = 'pending'").run(application_id);
    res.json({
      id: result.lastInsertRowid
    });
  } catch (e) {
    console.log('ADMIN JOB CREATE ERROR: ' + e.stack);
    res.status(500).json({
      error: e.message
    });
  }
});

// Batch add jobs - MUST be before :applicationId route
app.post('/api/admin/jobs/batch', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      application_id,
      user_id,
      jobs
    } = req.body;
    if (!jobs || jobs.length === 0) return res.status(400).json({
      error: 'لا توجد وظائف للإضافة'
    });
    const appLang = ((await db.prepare('SELECT language FROM applications WHERE id = ?').get(application_id)) || {}).language || '';
    const insertJob = db.prepare('INSERT INTO jobs (application_id, company_id, company_name, company_email, position, interview_time, salary_min, salary_max, description, language, level, needed_count, deadline, notify_days, work_location, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const jobIds = [];
    for (const j of jobs) {
      let cid = j.company_id || null;
      if (!cid && j.company_name) {
        const co = await db.prepare("SELECT id FROM companies WHERE TRIM(name) = TRIM(?) OR (company_email IS NOT NULL AND company_email != '' AND company_email = ?) LIMIT 1").get(j.company_name, j.company_email || '');
        if (co) cid = co.id;
      }
      let cname = j.company_name;
      if (cid) {
        const coRow = (await db.prepare('SELECT name, company_email FROM companies WHERE id=?').get(cid)) || {};
        if (coRow.name) cname = coRow.name;
      }
      let cemail = j.company_email || '';
      if (cid && !cemail) cemail = ((await db.prepare('SELECT company_email FROM companies WHERE id=?').get(cid)) || {}).company_email || '';
      const result = await insertJob.run(application_id, cid, cname, cemail, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.language || appLang, j.level || '', j.needed_count ? parseInt(j.needed_count) || 1 : 1, j.deadline || '', j.notify_days ? parseInt(j.notify_days) || 5 : 5, String(j.work_location || '').trim(), String(j.employment_type || '').trim());
      jobIds.push(result.lastInsertRowid);
    }

    // Auto-approve if application is pending (admin is adding jobs)
    await db.prepare("UPDATE applications SET status = 'approved' WHERE id = ? AND status = 'pending'").run(application_id);

    // Get user and agent info for notifications
    const user = await db.prepare('SELECT u.*, ag.name as agent_name, ag.email as agent_email, ag.id as agent_id FROM users u LEFT JOIN agents ag ON u.referred_by = ag.id WHERE u.id = ?').get(user_id);

    // Get full user data for company email
    const fullUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (user) {
      const jobsListHTML = jobs.map(j => `
        <div style="padding:12px;background:rgba(212,168,83,0.07);border:1px solid rgba(212,168,83,0.14);border-radius:8px;margin-bottom:8px;">
          <strong>${j.position}</strong> - ${j.company_name}<br>
          ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
          ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' جنيه' : j.salary_min ? 'من ' + j.salary_min + ' جنيه' : 'حتى ' + j.salary_max + ' جنيه'}<br>` : ''}
          ${j.description ? 'التفاصيل: ' + j.description : ''}
        </div>
      `).join('');
      const userEmailHTML = `
        
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">تمت إضافة وظائف لك!</h2>
          <p>مرحباً ${user.name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك. يمكنك مراجعتها من خلال لوحة التحكم الخاصة بك.</p>
          <h3 style="color:#d4a853;margin:16px 0 10px;">الوظائف المضافة:</h3>
          ${jobsListHTML}
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/dashboard" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">عرض الوظائف</a>
          </div>
          
        
      `;
      sendEmail(user.email, 'وظائف جديدة لك في وَظِيف', userEmailHTML);
      await saveNotification(user_id, null, 'jobs_added', 'وظائف جديدة لك', `تمت إضافة ${jobs.length} وظيفة جديدة. افتح لوحة التحكم لعرضها.`);
    }
    if (user && user.agent_id && user.agent_email) {
      const agentEmailHTML = `
        
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">تم توظيف شخص أحيله لك!</h2>
          <p>مرحباً ${user.agent_name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة للعضو <strong>${user.name}</strong> الذي سجل من خلال رابط الإحالة الخاص بك.</p>
          <p>يمكنك متابعة التقدم من خلال لوحة تحكم المندوب.</p>
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/agent" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">لوحة تحكم المندوب</a>
          </div>
          
        
      `;
      sendEmail(user.agent_email, 'تم توظيف شخص من إحائك - وَظِيف', agentEmailHTML);
      await saveNotification(null, user.agent_id, 'referral_hired', 'تم توظيف شخص أحيله لك', `العضو "${user.name}" تمت إضافة ${jobs.length} وظيفة له.`);
    }
    res.json({
      success: true,
      jobIds,
      count: jobIds.length
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/admin/jobs/:applicationId', authMiddleware, adminOrAgentMiddleware, async (req, res) => {
  try {
    const appRow = await db.prepare('SELECT user_id FROM applications WHERE id = ?').get(req.params.applicationId);
    const jobs = await db.prepare('SELECT * FROM jobs WHERE application_id = ?').all(req.params.applicationId);
    const cancelledIds = new Set();
    if (appRow) {
      (await db.prepare("SELECT job_id FROM selections WHERE user_id = ? AND status = 'cancelled'").all(appRow.user_id)).forEach(c => cancelledIds.add(c.job_id));
    }
    jobs.forEach(j => {
      j.was_cancelled = cancelledIds.has(j.id) ? 1 : 0;
    });
    res.json(jobs);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== AGENT JOBS ROUTES =====
app.get('/api/agent/jobs/:applicationId', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const appRow = await db.prepare('SELECT a.user_id FROM applications a WHERE a.id = ?').get(req.params.applicationId);
    if (!appRow) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    const isOwner = await db.prepare('SELECT id FROM users WHERE id = ? AND referred_by = ?').get(appRow.user_id, agentId);
    if (!isOwner && !(await isQualtyRole(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const jobs = await db.prepare('SELECT * FROM jobs WHERE application_id = ?').all(req.params.applicationId);
    const cancelledIds = new Set();
    (await db.prepare("SELECT job_id FROM selections WHERE user_id = ? AND status = 'cancelled'").all(appRow.user_id)).forEach(c => cancelledIds.add(c.job_id));
    jobs.forEach(j => {
      j.was_cancelled = cancelledIds.has(j.id) ? 1 : 0;
    });
    res.json(jobs);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/agent/applications', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const apps = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id AND id NOT IN (SELECT job_id FROM selections WHERE user_id = a.user_id AND status = 'cancelled')) as jobs_count
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE u.referred_by = ? AND a.status = 'approved'
      ORDER BY a.created_at DESC
    `).all(agentId);
    res.json(apps);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/agent/jobs/batch', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const {
      application_id,
      user_id,
      jobs
    } = req.body;
    if (!jobs || jobs.length === 0) return res.status(400).json({
      error: 'لا توجد وظائف للإضافة'
    });
    const isOwner = await db.prepare('SELECT id FROM users WHERE id = ? AND referred_by = ?').get(user_id, agentId);
    if (!isOwner && !(await isQualtyRole(req))) return res.status(403).json({
      error: 'ليس لديك صلاحية إضافة وظائف لهذا المستخدم'
    });
    if ((await getAgentRole(req)) === 'qualty') {
      const appRow = await db.prepare('SELECT id, user_id, language, assigned_qualty_id FROM applications WHERE id = ?').get(application_id);
      if (appRow && !(await qualtyCanActOnApp(req, appRow))) return res.status(403).json({
        error: 'هذا الطلب خارج اللغات المحددة ليك'
      });
    }
    const appLang = ((await db.prepare('SELECT language FROM applications WHERE id = ?').get(application_id)) || {}).language || '';
    const insertJob = db.prepare('INSERT INTO jobs (application_id, company_id, company_name, company_email, position, interview_time, salary_min, salary_max, description, language, level, needed_count, deadline, notify_days, work_location, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const jobIds = [];
    for (const j of jobs) {
      let cid = j.company_id || null;
      if (!cid && j.company_name) {
        const co = await db.prepare("SELECT id FROM companies WHERE TRIM(name) = TRIM(?) OR (company_email IS NOT NULL AND company_email != '' AND company_email = ?) LIMIT 1").get(j.company_name, j.company_email || '');
        if (co) cid = co.id;
      }
      let cname = j.company_name;
      if (!cname && cid) cname = ((await db.prepare('SELECT name FROM companies WHERE id=?').get(cid)) || {}).name || '';
      let cemail = j.company_email || '';
      if (cid && !cemail) cemail = ((await db.prepare('SELECT company_email FROM companies WHERE id=?').get(cid)) || {}).company_email || '';
      const result = await insertJob.run(application_id, cid, cname, cemail, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.language || appLang, j.level || '', j.needed_count ? parseInt(j.needed_count) || 1 : 1, j.deadline || '', j.notify_days ? parseInt(j.notify_days) || 5 : 5, String(j.work_location || '').trim(), String(j.employment_type || '').trim());
      jobIds.push(result.lastInsertRowid);
    }
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (user) {
      const jobsListHTML = jobs.map(j => `
        <div style="padding:12px;background:rgba(212,168,83,0.07);border:1px solid rgba(212,168,83,0.14);border-radius:8px;margin-bottom:8px;">
          <strong>${j.position}</strong> - ${j.company_name}<br>
          ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
          ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' جنيه' : j.salary_min ? 'من ' + j.salary_min + ' جنيه' : 'حتى ' + j.salary_max + ' جنيه'}<br>` : ''}
          ${j.description ? 'التفاصيل: ' + j.description : ''}
        </div>
      `).join('');
      const userEmailHTML = `
        
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">تمت إضافة وظائف لك!</h2>
          <p>مرحباً ${user.name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك من المندوب. يمكنك مراجعتها من خلال لوحة التحكم الخاصة بك.</p>
          <h3 style="color:#d4a853;margin:16px 0 10px;">الوظائف المضافة:</h3>
          ${jobsListHTML}
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/dashboard" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">عرض الوظائف</a>
          </div>
        
      `;
      sendEmail(user.email, 'تمت إضافة وظائف لك! - وَظِيف', userEmailHTML);
      await saveNotification(user_id, null, 'jobs', 'تمت إضافة وظائف جديدة', `تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك من المندوب.`);
    }
    res.json({
      success: true,
      jobIds
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== NOTIFICATIONS ROUTES =====
app.get('/api/user/notifications', authMiddleware, async (req, res) => {
  try {
    const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/agent/notifications', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const notifications = await db.prepare('SELECT * FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50').all(agentId);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/notifications/read-all', authMiddleware, async (req, res) => {
  try {
    if (await isAgentUser(req)) {
      const agentId = await getAgentId(req);
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE agent_id = ?').run(agentId);
    } else {
      await db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const totalApps = (await db.prepare('SELECT COUNT(*) as c FROM applications').get()).c;
    const pending = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'pending'").get()).c;
    const approved = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'approved'").get()).c;
    const rejected = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'rejected'").get()).c;
    const totalJobs = (await db.prepare('SELECT COUNT(*) as c FROM jobs').get()).c;
    const totalUsers = (await db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get()).c;
    const selections = await db.prepare(`
      SELECT s.*, j.company_name, j.position, j.salary, j.salary_min, j.salary_max,
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language,
        u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        ag.name as agent_name, ag.id as agent_id, ag.phone as agent_phone,
        ag.payment_method as agent_payment_method, ag.payment_operator as agent_payment_operator,
        (SELECT IFNULL(a.audio_url,'') FROM applications a WHERE a.user_id = u.id AND IFNULL(a.audio_url,'') != '' ORDER BY a.id DESC LIMIT 1) as audio_url,
        (SELECT IFNULL(a.audio_file,'') FROM applications a WHERE a.user_id = u.id AND IFNULL(a.audio_file,'') != '' ORDER BY a.id DESC LIMIT 1) as audio_file
      FROM selections s
      JOIN jobs j ON s.job_id = j.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      WHERE s.status != 'cancelled'
      ORDER BY s.created_at DESC
    `).all();
    const usersWithJobsNoSelection = (await db.prepare(`
      SELECT
        u.id as user_id,
        GROUP_CONCAT(DISTINCT j.company_name) as company_name,
        GROUP_CONCAT(DISTINCT j.position) as position,
        MIN(j.salary_min) as salary_min,
        MAX(j.salary_max) as salary_max,
        GROUP_CONCAT(DISTINCT j.interview_time) as interview_time,
        COUNT(DISTINCT j.id) as jobs_count,
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language,
        u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        ag.name as agent_name, ag.id as agent_id, ag.phone as agent_phone,
        ag.payment_method as agent_payment_method, ag.payment_operator as agent_payment_operator,
        (SELECT IFNULL(ap.audio_url,'') FROM applications ap WHERE ap.user_id = u.id AND IFNULL(ap.audio_url,'') != '' ORDER BY ap.id DESC LIMIT 1) as audio_url,
        (SELECT IFNULL(ap.audio_file,'') FROM applications ap WHERE ap.user_id = u.id AND IFNULL(ap.audio_file,'') != '' ORDER BY ap.id DESC LIMIT 1) as audio_file
      FROM jobs j
      JOIN applications a ON j.application_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      WHERE a.user_id NOT IN (SELECT user_id FROM selections WHERE status IN ('selected','confirmed'))
      AND a.status = 'approved'
      AND j.id NOT IN (SELECT job_id FROM selections WHERE user_id = a.user_id AND status = 'cancelled')
      GROUP BY u.id, ag.id
      ORDER BY MIN(j.created_at) DESC
    `).all()).map(row => ({
      id: 'pending_' + row.user_id,
      user_id: row.user_id,
      job_id: null,
      status: 'no_selection',
      hired: 0,
      amount: 0,
      agent_amount: 0,
      is_frozen: 0,
      company_name: null,
      position: null,
      jobs_count: row.jobs_count,
      salary_min: row.salary_min,
      salary_max: row.salary_max,
      interview_time: null,
      description: null,
      company_email: null,
      user_name: row.user_name,
      user_email: row.user_email,
      user_phone: row.user_phone,
      audio_url: row.audio_url || '',
      audio_file: row.audio_file || '',
      referred_by: row.referred_by,
      nationality: row.nationality,
      city: row.city,
      user_language: row.user_language,
      age: row.age,
      national_id: row.national_id,
      college: row.college,
      education_level: row.education_level,
      military_status: row.military_status,
      call_center_experience: row.call_center_experience,
      agent_name: row.agent_name,
      agent_id: row.agent_id,
      agent_phone: row.agent_phone,
      agent_payment_method: row.agent_payment_method,
      agent_payment_operator: row.agent_payment_operator
    }));
    const allSelections = [...selections, ...usersWithJobsNoSelection];
    const hired = selections.filter(s => s.hired === 1);
    const totalEarnings = hired.reduce((sum, s) => sum + (s.amount || 0), 0);
    const cancelled = selections.filter(s => s.hired === 0 && s.status === 'cancelled');
    const waiting = allSelections.filter(s => s.status === 'selected');
    res.json({
      totalApps,
      pending,
      approved,
      rejected,
      totalJobs,
      totalUsers,
      selections: allSelections,
      hired,
      totalEarnings,
      cancelled,
      waiting
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/selections', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      user_id,
      job_id,
      hired,
      amount
    } = req.body;
    const result = await db.prepare('INSERT INTO selections (user_id, job_id, hired, amount) VALUES (?, ?, ?, ?)').run(user_id, job_id, hired ? 1 : 0, amount || 0);
    res.json({
      id: result.lastInsertRowid
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/selections/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      status,
      hired,
      amount,
      agent_amount
    } = req.body;
    if (status) await db.prepare('UPDATE selections SET status = ? WHERE id = ?').run(status, req.params.id);
    if (hired !== undefined) await db.prepare('UPDATE selections SET hired = ? WHERE id = ?').run(hired ? 1 : 0, req.params.id);
    if (amount !== undefined) await db.prepare('UPDATE selections SET amount = ? WHERE id = ?').run(amount, req.params.id);
    if (agent_amount !== undefined) await db.prepare('UPDATE selections SET agent_amount = ? WHERE id = ?').run(agent_amount, req.params.id);
    if (status === 'cancelled') {
      const sel = await db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.position FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
      if (sel) {
        await saveNotification(sel.user_id, null, 'selection_cancelled', 'تم إلغاء التوظيف', `تم إلغاء توظيفك في شركة ${sel.company_name} للوظيفة: ${sel.position}. يمكنك التقديم مرة أخرى في أي وقت.`);
        if (sel.user_email) {
          sendEmail(sel.user_email, 'تم إلغاء توظيفك - وَظِيف', `
            
              
              <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#e57373;">تم إلغاء توظيفك</h2>
              <div style="background:rgba(220,50,50,0.06);border:1px solid rgba(220,50,50,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0;"><strong style="color:#e57373;">الوظيفة:</strong> ${sel.position}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;">للأسف تم إلغاء توظيفك في هذه الشركة. يمكنك التقديم مرة أخرى في أي وقت.</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            
          `);
        }
      }
    }
    if (status === 'confirmed') {
      const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      await db.prepare('UPDATE selections SET frozen_deadline = ?, hired_at = ? WHERE id = ?').run(deadline, new Date().toISOString(), req.params.id);
      const sel = await db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.position, j.company_email, j.interview_time, j.salary_min, j.salary_max, j.description FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
      if (sel) {
        const agent = await db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
        if (agent) {
          await db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'selection_confirmed', 'تم تثبيت صفقة', `تم تثبيت صفقة ${sel.user_name} - ${sel.company_name}. مبلغك: ${agent_amount || 0} ج. سيتم التأكيد خلال 3 أسابيع وإرسال المبلغ.`);
          if (agent.email) {
            sendEmail(agent.email, 'تم تثبيت صفقة - وَظِيف', `
              
                
                <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">تم تثبيت صفقة</h2>
                <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">العضو:</strong> ${sel.user_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">مبلغك:</strong> ${agent_amount || 0} ج</p>
                  <p style="margin:0;"><strong style="color:#fbbf24;">سيتم التأكيد خلال 3 أسابيع وإرسال المبلغ</strong></p>
                </div>
                <p style="color:#888;font-size:13px;text-align:center;">المبلغ متجمد حالياً وسيتم التأكيد خلال 3 أسابيع وإرساله.</p>
                <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
              
            `);
          }
        }
        // User notification
        await saveNotification(sel.user_id, null, 'selection_confirmed', 'مبروك! تم تثبيت توظيفك', `تم تثبيت توظيفك في شركة ${sel.company_name} للوظيفة: ${sel.position}. وقت المقابلة: ${sel.interview_time || 'يحدد لاحقاً'}.`);
        if (sel.user_email) {
          const salaryText = sel.salary_min || sel.salary_max ? sel.salary_min && sel.salary_max ? sel.salary_min + ' - ' + sel.salary_max + ' جنيه' : sel.salary_min ? 'من ' + sel.salary_min + ' جنيه' : 'حتى ' + sel.salary_max + ' جنيه' : 'يحدد لاحقاً';
          sendEmail(sel.user_email, 'تم تثبيت صفقة عملك - وَظِيف', `
            
              
              <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">مبروك! تم تثبيت توظيفك</h2>
              <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:16px;">
                <p style="margin:0 0 10px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0 0 10px;"><strong style="color:#66bb6a;">الوظيفة:</strong> ${sel.position}</p>
                <p style="margin:0 0 10px;"><strong style="color:#fbbf24;">وقت المقابلة:</strong> ${sel.interview_time || 'يحدد لاحقاً'}</p>
                <p style="margin:0;"><strong style="color:#d4a853;">المرتب:</strong> ${salaryText}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;line-height:1.8;">تم تثبيت توظيفك بنجاح. تأكد من الحضور في موعد المقابلة المحدد أعلاه. بالتوفيق!</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            
          `);
        }
        // Send applicant data to the company email automatically on confirm (once per selection).
        // Atomic claim first: concurrent confirms can't both pass (single UPDATE claims the flag).
        if (sel.company_email && !sel.company_emailed) {
          const claimed = await db.prepare('UPDATE selections SET company_emailed = 1 WHERE id = ? AND company_emailed = 0').run(req.params.id);
          if (claimed.changes > 0) {
            const fullUser = await db.prepare('SELECT * FROM users WHERE id = ?').get(sel.user_id);
            if (fullUser) {
              sendApplicantToCompany(sel.company_email, fullUser, {
                position: sel.position,
                interview_time: sel.interview_time,
                salary_min: sel.salary_min,
                salary_max: sel.salary_max,
                description: sel.description
              });
            }
          }
        }
      }
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/selections/:id/unfreeze', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.prepare('UPDATE selections SET is_frozen = 0, unfrozen_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    const sel = await db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.company_id FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
      // Update company counts: pending_count--, hired_count++
      await db.prepare('UPDATE companies SET pending_count = MAX(0, pending_count - 1), hired_count = hired_count + 1 WHERE id = ?').run(sel.company_id);
      // Notification to user
      await db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'hired', 'مبروك توظيفك! 🎉', `مبروك! تم توظيفك رسمياً في شركة ${sel.company_name}. بالتوفيق والنجاح في مشوارك المهني الجديد!`);
      // Congratulatory email to the hired user
      if (sel.user_email) {
        sendEmail(sel.user_email, 'مبروك توظيفك! - وَظِيف', `
          
            
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:70px;height:70px;background:linear-gradient(135deg,#66bb6a,#2e7d32);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px;">🎉</div>
              <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">مبروك توظيفك!</h2>
              <p style="color:#94a3b8;font-size:14px;">كل التهاني القلبية</p>
            </div>
            <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:16px;padding:24px;margin-bottom:24px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">مرحباً <strong style="color:#d4a853;">${sel.user_name}</strong>،</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">يسعدنا أن نبلغك بأنه قد تم توظيفك رسمياً في <strong style="color:#d4a853;">${sel.company_name}</strong>.</p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">نتمنى لك التوفيق والنجاح في مشوارك المهني الجديد. نحن على ثقة بأنك ستكون إضافة قوية للفريق.</p>
              <p style="margin:0;font-size:16px;line-height:1.8;">بالتوفيق والتفوق دائماً!</p>
            </div>
            <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.12);border-radius:16px;padding:20px;margin-bottom:24px;text-align:center;">
              <p style="margin:0 0 8px;font-size:15px;color:#d4a853;font-weight:700;">💡 هل تعرف أصدقاء يبحثون عن فرصة عمل؟</p>
              <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.8;">ادعُهم للانضمام إلى منصة <strong style="color:#d4a853;">وَظِيف</strong> واحصل على فرصة عمل أيضاً!</p>
              <a href="${BASE_URL}/login.html" style="display:inline-block;margin-top:12px;padding:10px 28px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">شارك أصدقائك الآن</a>
            </div>
            
          
        `);
      }
      const agent = await db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
      if (agent) {
        await db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'unfreeze', 'تم فك تجميد المبلغ', `تم فك تجميد مبلغ ${sel.agent_amount} ج لـ ${sel.user_name}. المبلغ دخل حسابك.`);
        if (agent.email) {
          sendEmail(agent.email, 'تم فك تجميد المبلغ - وَظِيف', `
            
              
              <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">تم فك تجميد المبلغ</h2>
              <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">العضو:</strong> ${sel.user_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">المبلغ:</strong> ${sel.agent_amount} ج</p>
                <p style="margin:0;"><strong style="color:#66bb6a;">المبلغ دخل حسابك بنجاح</strong></p>
              </div>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            
          `);
        }
      }
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/selections/:id/apologize', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      reason
    } = req.body;
    await db.prepare('UPDATE selections SET is_frozen = 0, apology = ?, amount = 0, agent_amount = 0, hired = 0, status = ? WHERE id = ?').run(reason || 'تم الإعتذار عن الصفقة', 'cancelled', req.params.id);
    const sel = await db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.company_id FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
      if (sel.company_id) await db.prepare('UPDATE companies SET pending_count = MAX(0, pending_count - 1) WHERE id = ?').run(sel.company_id);
      // Reset user completely: delete all jobs, selections, reset application
      const userJobs = await db.prepare('SELECT id FROM jobs WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)').all(sel.user_id);
      for (const j of userJobs) {
        await db.prepare('DELETE FROM selections WHERE job_id = ?').run(j.id);
      }
      await db.prepare('DELETE FROM jobs WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)').run(sel.user_id);
      await db.prepare("UPDATE applications SET status = 'pending', audio_file = NULL, rejection_date = NULL, rejection_reason = NULL WHERE user_id = ?").run(sel.user_id);
      const agent = await db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
      if (agent) {
        await db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'apology', 'تم الإعتذار عن الصفقة', `تم الإعتذار عن صفقة ${sel.user_name} - ${sel.company_name}. سبب: ${reason || 'لم يحدد'}`);
        if (agent.email) {
          sendEmail(agent.email, 'تم الإعتذار عن صفقة - وَظِيف', `
            
              
              <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#e57373;">تم الإعتذار عن الصفقة</h2>
              <div style="background:rgba(220,50,50,0.06);border:1px solid rgba(220,50,50,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">العضو:</strong> ${sel.user_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0;"><strong style="color:#e57373;">السبب:</strong> ${reason || 'لم يحدد'}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;">تم إلغاء هذه الصفقة من قبل الإدارة.</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            
          `);
        }
      }
      await db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'apology', 'يمكنك التقديم مجدداً', `للأسف تم رفضك في شركة ${sel.company_name}. لا تقلق، هناك فرص أكثر في انتظارك! يمكنك التقديم مجدداً.`);
      if (sel.user_email) {
        sendEmail(sel.user_email, 'يمكنك التقديم مجدداً - وَظِيف', `
          
            
            <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">يمكنك التقديم مجدداً</h2>
            <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;"><strong style="color:#d4a853;">الشركة:</strong> ${sel.company_name}</p>
            </div>
            <p style="color:#ccc;font-size:14px;text-align:center;line-height:1.8;margin-bottom:16px;">للأسف تم رفضك في هذه الشركة.<br>لا تقلق، هناك فرص أكثر في انتظارك!</p>
            <p style="color:#d4a853;font-size:13px;text-align:center;font-weight:700;">يمكنك التقديم مجدداً والبحث عن فرصة أفضل</p>
            <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
          
        `);
      }
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/selections/:id/allow-reapply', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const sel = await db.prepare(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM selections s JOIN users u ON s.user_id = u.id WHERE s.id = ?
    `).get(req.params.id);
    if (!sel) return res.status(404).json({
      error: 'الاختيار غير موجود'
    });
    await db.prepare('DELETE FROM selections WHERE id = ?').run(req.params.id);
    const app_row = await db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(sel.user_id);
    if (app_row) {
      await db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 0, audio_file = NULL WHERE id = ?").run(app_row.id);
      // Old recording no longer needed (user will submit a new one)
      if (app_row.audio_file) {
        try {
          fs.unlinkSync(path.join(uploadsDir, app_row.audio_file));
        } catch (e) {}
        await db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(app_row.id);
      }
    }
    await saveNotification(sel.user_id, null, 'reapply', 'تم السماح لك بالتقديم مجدداً', 'يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف.');
    if (sel.user_email) {
      const html = `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#66bb6a;">تم السماح لك بالتقديم مجدداً</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${sel.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">تم إلغاء صفقة العمل السابقة والسماح لك بالتقديم على منصة وَظيف مرة أخرى.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;">يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف جديدة.</p>
          
        
      `;
      sendEmail(sel.user_email, 'تم السماح لك بالتقديم مجدداً - وَظِيف', html);
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== Education requirement (graduates / students) =====
// companies.education_requirement: 'both' (default) | 'graduates' | 'students'
function normalizeEduReq(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'graduates' || s === 'graduate' || s === 'graduates_only' || s === 'grads' || s === 'خريجين' || s === 'خريج' || s === 'خرجين') return 'graduates';
  if (s === 'students' || s === 'student' || s === 'undergraduate' || s === 'under_grad' || s === 'طلاب' || s === 'طالب' || s === 'طلبة') return 'students';
  return 'both';
}

// users.education_level: 'graduate' | 'undergraduate' (anything else = unknown)
function normalizeUserEdu(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s === 'graduate' || s === 'graduated' || s === 'grad' || s === 'خريج' || s === 'خريجين' || s === 'خرجين') return 'graduate';
  if (s === 'undergraduate' || s === 'under_grad' || s === 'student' || s === 'طلاب' || s === 'طالب' || s === 'لسه طالب') return 'undergraduate';
  return '';
}

// true when the company accepts this applicant
function eduAllows(companyReq, userEdu) {
  const req = normalizeEduReq(companyReq);
  const edu = normalizeUserEdu(userEdu);
  if (req === 'both' || !edu) return true; // unknown level -> never hide
  return req === (edu === 'graduate' ? 'graduates' : 'students');
}
const EDU_REQ_LABEL = {
  both: 'خريجين و طلاب',
  graduates: 'خريجين فقط',
  students: 'طلاب فقط'
};

// Education level of the applicant behind the request (?app_id= or ?education_level=)
async function educationFromRequest(req) {
  try {
    const appId = req.query && req.query.app_id || req.body && req.body.app_id;
    if (appId) {
      const row = await db.prepare('SELECT u.education_level FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?').get(appId);
      if (row) return row.education_level || '';
    }
    const direct = req.query && req.query.education_level || req.body && req.body.education_level;
    if (direct) return direct;
  } catch (e) {}
  return '';
}
app.get('/api/companies', authMiddleware, async (req, res) => {
  try {
    const all = await db.prepare('SELECT * FROM companies WHERE available_slots > used_slots ORDER BY name').all();
    const edu = await educationFromRequest(req);
    if (!edu) return res.json(all);
    const companies = all.filter(c => eduAllows(c.education_requirement, edu));
    res.set('X-Hidden-By-Education', String(all.length - companies.length));
    res.json(companies);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get all companies (including full ones) + posted jobs count
// NOTE: the deadline shown here comes from the JOBS (company_languages), not companies.deadline
app.get('/api/admin/companies', authMiddleware, companiesViewer, async (req, res) => {
  try {
    const companies = await db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM company_languages cl WHERE cl.company_id = c.id) as jobs_count,
        IFNULL((SELECT MIN(cl.deadline) FROM company_languages cl WHERE cl.company_id = c.id AND cl.deadline IS NOT NULL AND cl.deadline != ''), '') as job_deadline,
        IFNULL((SELECT MIN(cl.notify_days) FROM company_languages cl WHERE cl.company_id = c.id AND cl.notify_days IS NOT NULL AND cl.notify_days > 0), 5) as job_notify_days
      FROM companies c ORDER BY c.created_at DESC
    `).all();
    companies.forEach(c => {
      c.deadline = c.job_deadline;
      c.notify_days_before = c.job_notify_days;
      delete c.job_deadline;
      delete c.job_notify_days;
    });
    res.json(companies);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Shared: the deadline lives on the JOB (company_languages), not on the company.
// Returns the nearest (earliest) job deadline + its notify window.
async function nearestJobDeadline(companyId) {
  const r = (await db.prepare(`
    SELECT MIN(deadline) as deadline, MIN(notify_days) as notify_days
    FROM company_languages
    WHERE company_id = ? AND deadline IS NOT NULL AND deadline != ''
  `).get(companyId)) || {};
  return {
    deadline: r.deadline || '',
    notify_days_before: r.notify_days || 5
  };
}

// Overwrite the company's own (legacy) deadline fields with the nearest job deadline
async function applyJobDeadline(company) {
  if (!company) return company;
  const d = await nearestJobDeadline(company.id);
  company.deadline = d.deadline;
  company.notify_days_before = d.notify_days_before;
  return company;
}

// Attach the job that triggered each deadline notification (nearest job deadline)
async function attachNotificationJobs(notifs) {
  for (const n of notifs) {
    n.job = null;
    if (!n.company_id) continue;
    let job = null;
    if (n.job_id) job = await db.prepare('SELECT * FROM company_languages WHERE id = ?').get(n.job_id);
    if (!job) job = await db.prepare(`
      SELECT * FROM company_languages
      WHERE company_id = ? AND deadline IS NOT NULL AND deadline != ''
      ORDER BY deadline ASC, id ASC LIMIT 1
    `).get(n.company_id);
    if (!job) job = await db.prepare('SELECT * FROM company_languages WHERE company_id = ? ORDER BY id ASC LIMIT 1').get(n.company_id);
    if (!job) continue;
    n.job = job;
    if (job.deadline) n.deadline = job.deadline;
    if (job.notify_days) n.notify_days_before = job.notify_days;
  }
  return notifs;
}

// Shared: company's jobs (= company_languages rows) with candidate counts matched by position
async function companyJobsWithCounts(company) {
  const cid = company.id;
  const langs = await db.prepare('SELECT * FROM company_languages WHERE company_id = ? ORDER BY created_at DESC, id DESC').all(cid);
  const sels = await db.prepare(`
    SELECT s.status, TRIM(j.position) as pos, u.name
    FROM selections s
    JOIN jobs j ON s.job_id = j.id
    JOIN users u ON s.user_id = u.id
    WHERE j.company_id = ? OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email = ?) OR TRIM(j.company_name) = TRIM(?)
  `).all(cid, company.company_email || '', company.name || '');
  const byPos = {};
  sels.forEach(r => {
    (byPos[r.pos] = byPos[r.pos] || []).push(r);
  });
  langs.forEach(l => {
    const rows = byPos[String(l.position || '').trim()] || [];
    l.pending_candidates = rows.filter(r => r.status === 'selected').length;
    l.confirmed_candidates = rows.filter(r => r.status === 'confirmed').length;
    l.cancelled_candidates = rows.filter(r => r.status === 'cancelled').length;
    l.sent_count = l.confirmed_candidates;
    l.candidate_names = rows.filter(r => r.status !== 'cancelled').map(r => r.name).join(', ');
    l.cancelled_names = rows.filter(r => r.status === 'cancelled').map(r => r.name).join(', ');
  });
  return langs;
}

// Shared: schedule grouped by interview_time + history
async function buildCompanySchedule(company) {
  await applyJobDeadline(company);
  const jobs = await companyJobsWithCounts(company);
  const map = {};
  jobs.forEach(l => {
    const t = l.interview_time || '';
    if (!t) return;
    if (!map[t]) map[t] = {
      interview_time: t,
      job_count: 0,
      candidates: 0
    };
    map[t].job_count++;
    map[t].candidates += (l.pending_candidates || 0) + (l.confirmed_candidates || 0);
  });
  const schedule = Object.values(map).sort((a, b) => String(a.interview_time).localeCompare(String(b.interview_time)));
  const history = await db.prepare(`
    SELECT s.*, u.name as user_name, j.position, j.interview_time, j.created_at as job_created_at
    FROM selections s
    JOIN jobs j ON s.job_id = j.id
    JOIN users u ON s.user_id = u.id
    WHERE j.company_id = ? OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email = ?) OR TRIM(j.company_name) = TRIM(?)
    ORDER BY s.created_at DESC
    LIMIT 50
  `).all(company.id, company.company_email || '', company.name || '');
  return {
    jobs,
    schedule,
    history
  };
}

// Admin/Qualty: list a company's jobs (= company_languages rows) with candidate counts
app.get('/api/admin/companies/:id/jobs', authMiddleware, companiesViewer, async (req, res) => {
  try {
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });
    const jobs = await companyJobsWithCounts(company);
    await applyJobDeadline(company);
    res.json({
      company,
      jobs
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin/Qualty: add a job (= language row) to a company
app.post('/api/admin/companies/:id/jobs', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const company = await db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });
    const {
      position,
      interview_time,
      salary_min,
      salary_max,
      description,
      language,
      level,
      needed_count,
      deadline,
      notify_days,
      work_location,
      employment_type
    } = req.body;
    // الوظائف العمالية مالهاش مستوى ولغتها = اسم الوظيفة
    const lang = String(language || '').trim() || String(position || '').trim();
    if (!lang) return res.status(400).json({
      error: 'اللغة مطلوبة'
    });
    const result = await db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description, work_location, employment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(company.id, lang, String(level || '').trim(), parseInt(needed_count) > 0 ? parseInt(needed_count) : 1, String(position || '').trim(), salary_min || 0, salary_max || 0, interview_time || '', deadline || '', parseInt(notify_days) > 0 ? parseInt(notify_days) : 5, description || '', String(work_location || '').trim(), String(employment_type || '').trim());
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'تمت إضافة الوظيفة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin/Qualty: edit a company job (= language row)
app.put('/api/admin/company-jobs/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const job = await db.prepare('SELECT * FROM company_languages WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({
      error: 'الوظيفة غير موجودة'
    });
    const {
      position,
      interview_time,
      salary_min,
      salary_max,
      description,
      language,
      level,
      needed_count,
      deadline,
      notify_days,
      work_location,
      employment_type
    } = req.body;
    // الوظائف العمالية مالهاش مستوى ولغتها = اسم الوظيفة
    const lang = String(language || '').trim() || String(position || '').trim();
    if (!lang) return res.status(400).json({
      error: 'اللغة مطلوبة'
    });
    await db.prepare('UPDATE company_languages SET language=?, level=?, needed_count=?, position=?, salary_min=?, salary_max=?, interview_time=?, deadline=?, notify_days=?, description=?, work_location=?, employment_type=? WHERE id=?').run(lang, String(level || '').trim(), parseInt(needed_count) > 0 ? parseInt(needed_count) : 1, String(position || '').trim(), salary_min || 0, salary_max || 0, interview_time || '', deadline || '', parseInt(notify_days) > 0 ? parseInt(notify_days) : 5, description || '', String(work_location || '').trim(), String(employment_type || '').trim(), job.id);
    res.json({
      success: true,
      message: 'تم تحديث الوظيفة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin/Qualty: delete a company job
app.delete('/api/admin/company-jobs/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const job = await db.prepare('SELECT * FROM company_languages WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({
      error: 'الوظيفة غير موجودة'
    });
    if (job.position && String(job.position).trim()) {
      const co = (await db.prepare('SELECT name, company_email FROM companies WHERE id = ?').get(job.company_id)) || {};
      const active = await db.prepare(`
        SELECT s.id FROM selections s JOIN jobs j ON s.job_id = j.id
        WHERE (j.company_id = ? OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email = ?) OR TRIM(j.company_name) = TRIM(?))
          AND TRIM(j.position) = TRIM(?) AND s.status IN ('selected','confirmed') LIMIT 1
      `).get(job.company_id, co.company_email || '', co.name || '', String(job.position).trim());
      if (active) return res.status(400).json({
        error: 'لا يمكن حذف وظيفة يوجد بها متقدمين نشطين'
      });
    }
    await db.prepare('DELETE FROM admin_notifications WHERE job_id = ?').run(job.id);
    await db.prepare('DELETE FROM company_languages WHERE id = ?').run(job.id);
    res.json({
      success: true,
      message: 'تم حذف الوظيفة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: add company
app.post('/api/admin/companies', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      name,
      position,
      description,
      interview_time,
      interview_schedule,
      salary_min,
      salary_max,
      company_email,
      available_slots,
      deadline,
      notify_days_before,
      education_requirement,
      type
    } = req.body;
    if (!name) return res.status(400).json({
      error: 'اسم الشركة مطلوب'
    });
    const coType = type === 'labor' ? 'labor' : 'normal';
    const result = await db.prepare('INSERT INTO companies (name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before, education_requirement, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5, normalizeEduReq(education_requirement), coType);
    res.json({
      id: result.lastInsertRowid
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: update company
app.put('/api/admin/companies/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      name,
      position,
      description,
      interview_time,
      interview_schedule,
      salary_min,
      salary_max,
      company_email,
      available_slots,
      deadline,
      notify_days_before,
      education_requirement,
      type
    } = req.body;
    const eduReq = education_requirement === undefined ? null : normalizeEduReq(education_requirement);
    const coType = type === undefined ? null : type === 'labor' ? 'labor' : 'normal';
    const old = await db.prepare('SELECT name, company_email FROM companies WHERE id=?').get(req.params.id);
    await db.prepare('UPDATE jobs SET company_id = ? WHERE company_id IS NULL AND TRIM(company_name) = TRIM(?)').run(req.params.id, name);
    await db.prepare('UPDATE companies SET name=?, position=?, description=?, interview_time=?, interview_schedule=?, salary_min=?, salary_max=?, company_email=?, available_slots=?, deadline=?, notify_days_before=?, education_requirement=COALESCE(?, education_requirement), type=COALESCE(?, type) WHERE id=?').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5, eduReq, coType, req.params.id);
    await db.prepare('UPDATE jobs SET company_name = ?, company_email = COALESCE(NULLIF(?, \'\'), company_email) WHERE company_id = ?').run(name, company_email || '', req.params.id);
    if (!old) {/* first-time */}
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: delete company (cascade: selections -> jobs -> notifications -> jobs/langs/logins)
app.delete('/api/admin/companies/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const cid = req.params.id;
    await db.prepare('DELETE FROM selections WHERE job_id IN (SELECT id FROM jobs WHERE company_id = ?)').run(cid);
    await db.prepare('DELETE FROM jobs WHERE company_id = ?').run(cid);
    await db.prepare('DELETE FROM admin_notifications WHERE company_id = ?').run(cid);
    await db.prepare('DELETE FROM company_languages WHERE company_id = ?').run(cid);
    await db.prepare('DELETE FROM company_users WHERE company_id = ?').run(cid);
    await db.prepare('UPDATE labor_workers SET company_id = NULL WHERE company_id = ?').run(cid);
    await db.prepare('UPDATE labor_groups SET company_id = NULL WHERE company_id = ?').run(cid);
    await db.prepare('DELETE FROM companies WHERE id = ?').run(cid);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get company schedule & history
app.get('/api/admin/company/:id/schedule', authMiddleware, companiesViewer, async (req, res) => {
  try {
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });
    res.json({
      company,
      ...(await buildCompanySchedule(company))
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: restart company plan (reset counters + new deadline only, no cancel)
app.post('/api/admin/companies/:id/restart', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const companyId = req.params.id;
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });

    // Reset counters and push every JOB deadline of this company 1 month out
    const newDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await db.prepare('UPDATE companies SET pending_count = 0, hired_count = 0, used_slots = 0, deadline = ? WHERE id = ?').run(newDeadline, companyId);
    await db.prepare("UPDATE company_languages SET deadline = ? WHERE company_id = ?").run(newDeadline, companyId);

    // Clear old admin notifications for this company
    await db.prepare('DELETE FROM admin_notifications WHERE company_id = ?').run(companyId);
    res.json({
      success: true,
      message: 'تم إعادة العدادات والموعد النهائي',
      newDeadline
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: check deadlines (per JOB) and create admin notifications
app.get('/api/admin/check-deadlines', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const jobs = await db.prepare(`
        SELECT c.id as company_id, c.name as company_name, c.available_slots, c.hired_count,
          cl.id as job_id, cl.position, cl.deadline, cl.notify_days
        FROM companies c
        JOIN company_languages cl ON cl.company_id = c.id
        WHERE cl.deadline IS NOT NULL AND cl.deadline != ''
      `).all();
    const now = new Date();
    const alerts = [];
    for (const job of jobs) {
      const deadline = new Date(job.deadline + 'T00:00:00');
      const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      const notifyAt = job.notify_days || 5;
      const needed = (job.available_slots || 0) - (job.hired_count || 0);
      if (diffDays <= notifyAt && diffDays >= 0 && needed > 0) {
        const existing = await db.prepare("SELECT id FROM admin_notifications WHERE company_id = ? AND (job_id = ? OR job_id IS NULL) AND status IN ('pending','accepted')").get(job.company_id, job.job_id);
        if (!existing) {
          const label = job.position ? job.position + ' - ' : '';
          await db.prepare('INSERT INTO admin_notifications (company_id, type, message, status, job_id) VALUES (?, ?, ?, ?, ?)').run(job.company_id, 'deadline_alert', `الشركة ${job.company_name} (${label}${job.deadline}) تنتهي في ${diffDays} يوم! مطلوب ${needed} شخص.`, 'pending', job.job_id);
          alerts.push({
            company: job.company_name,
            position: job.position,
            days: diffDays,
            needed
          });
        }
      }
    }
    res.json({
      success: true,
      alertsFound: alerts.length,
      alerts
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get pending notifications
app.get('/api/admin/pending-notifications', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const notifs = await db.prepare(`
        SELECT an.*, c.name as company_name, c.available_slots, c.hired_count,
          IFNULL((SELECT MIN(cl.deadline) FROM company_languages cl WHERE cl.company_id = c.id AND cl.deadline IS NOT NULL AND cl.deadline != ''), '') as deadline,
          IFNULL((SELECT MIN(cl.notify_days) FROM company_languages cl WHERE cl.company_id = c.id AND cl.notify_days IS NOT NULL AND cl.notify_days > 0), 5) as notify_days_before
        FROM admin_notifications an
        LEFT JOIN companies c ON an.company_id = c.id
        WHERE an.status = 'pending'
        ORDER BY an.created_at DESC
      `).all();
    res.json(await attachNotificationJobs(notifs));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: accept notification → send to agents
app.post('/api/admin/pending-notifications/:id/accept', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const notif = await db.prepare('SELECT * FROM admin_notifications WHERE id = ?').get(req.params.id);
    if (!notif) return res.status(404).json({
      error: 'الإشعار غير موجود'
    });
    // deadline notifications may be stored as 'deadline_alert' (admin) or 'deadline' (legacy)
    if (String(notif.type || '') === 'labor_worker_approval') {
      var caRes = await confirmCompanyApproval(notif.worker_id);
      if (caRes.error) return res.status(400).json({
        error: caRes.error
      });
      await db.prepare("UPDATE admin_notifications SET status = 'accepted' WHERE id = ?").run(req.params.id);
      return res.json({
        success: true,
        message: caRes.message
      });
    }
    if (String(notif.type || '') !== 'deadline_alert' && String(notif.type || '') !== 'deadline') {
      await db.prepare("UPDATE admin_notifications SET status = 'accepted' WHERE id = ?").run(req.params.id);
      return res.json({
        message: 'تم تأكيد الإشعار'
      });
    }
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(notif.company_id);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });

    // Get all active agents (labor agents are managed in their own section)
    const agents = await db.prepare(`SELECT id, name, email FROM agents WHERE is_active = 1 AND IFNULL(agent_type,'normal') != 'labor'`).all();
    const jobDl = await nearestJobDeadline(company.id);
    const deadline = jobDl.deadline ? new Date(jobDl.deadline + 'T00:00:00') : null;
    const diffDays = deadline ? Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24)) : null;
    const needed = (company.available_slots || 0) - (company.hired_count || 0);
    for (const a of agents) {
      await db.prepare('INSERT INTO notifications (agent_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(a.id, 'deadline_approaching', 'تنبيه: عاجل', `هناك شركة تريد الإسراع في عملية التوظيف (${company.name}) - مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.`, 0, new Date().toISOString());
      sendEmail(a.email || '', 'تنبيه: إسراع التوظيف', `<h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#d4a853;">شركة ${company.name} تريد الإسراع</h2><p>مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.</p>`);
    }
    await db.prepare("UPDATE admin_notifications SET status = 'accepted' WHERE id = ?").run(req.params.id);
    res.json({
      success: true,
      message: `تم إرسال ${agents.length} إشعار للمندوبين`,
      agentsCount: agents.length
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: reject notification
app.post('/api/admin/pending-notifications/:id/reject', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    await db.prepare("UPDATE admin_notifications SET status = 'rejected' WHERE id = ?").run(req.params.id);
    res.json({
      success: true,
      message: 'تم رفض الإشعار'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: redo company plan (reset schedule)
app.get('/api/user/jobs', authMiddleware, async (req, res) => {
  try {
    const apps = await db.prepare("SELECT id FROM applications WHERE user_id = ? AND status = 'approved'").all(req.user.id);
    const appIds = apps.map(a => a.id);
    if (appIds.length === 0) return res.json([]);
    const placeholders = appIds.map(() => '?').join(',');
    const jobs = await db.prepare(`SELECT * FROM jobs WHERE application_id IN (${placeholders})`).all(...appIds);
    // Company education requirement map (id / email / name fallback, same matching as companyJobsSql)
    const comps = await db.prepare('SELECT id, name, company_email, education_requirement FROM companies').all();
    const eduOf = await db.prepare('SELECT education_level FROM users WHERE id = ?').get(req.user.id);
    const reqFor = j => {
      let c = j.company_id ? comps.find(x => x.id === j.company_id) : null;
      if (!c && j.company_email) c = comps.find(x => x.company_email && x.company_email === j.company_email);
      if (!c && j.company_name) c = comps.find(x => String(x.name || '').trim() === String(j.company_name).trim());
      return c ? c.education_requirement : 'both';
    };
    const cancelledJobs = await db.prepare(`SELECT job_id FROM selections WHERE user_id = ? AND status = 'cancelled'`).all(req.user.id);
    const cancelledIds = new Set(cancelledJobs.map(c => c.job_id));
    const visibleJobs = jobs.filter(j => !cancelledIds.has(j.id) && eduAllows(reqFor(j), eduOf ? eduOf.education_level : ''));
    const jobsWithStatus = visibleJobs.map(j => ({
      ...j,
      company_education_requirement: normalizeEduReq(reqFor(j)),
      is_cancelled: false
    }));
    res.json(jobsWithStatus);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/user/select-job', authMiddleware, async (req, res) => {
  try {
    const {
      job_id
    } = req.body;
    const cancelled = await db.prepare("SELECT id FROM selections WHERE user_id = ? AND job_id = ? AND status = 'cancelled'").get(req.user.id, job_id);
    if (cancelled) return res.status(400).json({
      error: 'تم إلغاء هذا التوظيف سابقاً ولا يمكنك اختياره مرة أخرى'
    });
    const active = await db.prepare("SELECT id FROM selections WHERE user_id = ? AND status != 'cancelled'").get(req.user.id);
    if (active) return res.status(400).json({
      error: 'لقد قمت باختيار وظيفة بالفعل ولا يمكنك اختيار أكثر من وظيفة واحدة'
    });
    // Block companies that do not accept this applicant's education level
    const target = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(job_id);
    if (target) {
      const comps = await db.prepare('SELECT id, name, company_email, education_requirement FROM companies').all();
      let c = target.company_id ? comps.find(x => x.id === target.company_id) : null;
      if (!c && target.company_email) c = comps.find(x => x.company_email && x.company_email === target.company_email);
      if (!c && target.company_name) c = comps.find(x => String(x.name || '').trim() === String(target.company_name).trim());
      const me = await db.prepare('SELECT education_level FROM users WHERE id = ?').get(req.user.id);
      if (c && !eduAllows(c.education_requirement, me ? me.education_level : '')) {
        const label = EDU_REQ_LABEL[normalizeEduReq(c.education_requirement)] || '';
        return res.status(400).json({
          error: `هذه الشركة ${label} ولا تقبل مرشحين من فئتك`
        });
      }
    }
    const result = await db.prepare('INSERT INTO selections (user_id, job_id, status) VALUES (?, ?, ?)').run(req.user.id, job_id, 'selected');
    const job = await db.prepare('SELECT company_id FROM jobs WHERE id = ?').get(job_id);
    if (job && job.company_id) {
      await db.prepare('UPDATE companies SET pending_count = pending_count + 1 WHERE id = ?').run(job.company_id);
    }
    res.json({
      id: result.lastInsertRowid
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/user/selections', authMiddleware, async (req, res) => {
  try {
    const selections = await db.prepare(`
      SELECT s.*, j.company_name, j.position, j.interview_time, j.salary, j.salary_min, j.salary_max, j.description
      FROM selections s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.user_id = ? AND s.status != 'cancelled'
    `).all(req.user.id);
    res.json(selections);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/user/application-status', authMiddleware, async (req, res) => {
  try {
    const app = await db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY CASE WHEN status IN ('pending','approved') THEN 0 ELSE 1 END, created_at DESC LIMIT 1").get(req.user.id);
    if (!app) return res.json(null);

    // Check if user was hired (unfrozen) → return hired status with company info
    if (app.status === 'approved') {
      const confirmedSelection = await db.prepare("SELECT hired_at, company_name, is_frozen, unfrozen_at FROM selections s JOIN jobs j ON s.job_id = j.id WHERE s.user_id = ? AND s.status = 'confirmed' AND s.hired = 1 ORDER BY hired_at DESC LIMIT 1").get(req.user.id);
      if (confirmedSelection && confirmedSelection.hired_at && !confirmedSelection.is_frozen) {
        const hiredDate = new Date(confirmedSelection.hired_at);
        const threeMonthsLater = new Date(hiredDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (new Date() >= threeMonthsLater) {
          await db.prepare("UPDATE applications SET status = 'pending', rejection_reason = NULL, rejection_date = NULL WHERE id = ?").run(app.id);
          await db.prepare("UPDATE selections SET status = 'cancelled' WHERE user_id = ? AND status = 'confirmed'").run(req.user.id);
          app.status = 'pending';
          app.rejection_reason = null;
        } else {
          app.status = 'hired';
          app.company_name = confirmedSelection.company_name;
          app.hired_at = confirmedSelection.hired_at;
        }
      } else if (confirmedSelection && confirmedSelection.hired_at && confirmedSelection.is_frozen) {
        app.status = 'confirmed';
      }
    }
    // Check if rejected → auto-reset after 1 month
    if (app.status === 'rejected' && app.rejection_date) {
      const rejectionDate = new Date(app.rejection_date);
      const oneMonthLater = new Date(rejectionDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() >= oneMonthLater) {
        await db.prepare("UPDATE applications SET status = 'pending', rejection_reason = NULL, rejection_date = NULL WHERE id = ?").run(app.id);
        app.status = 'pending';
        app.rejection_reason = null;
        app.rejection_date = null;
      }
    }
    res.json(app);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== AGENT ROUTES =====
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SSS-';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}
app.post('/api/admin/agents', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      payment_method,
      payment_operator,
      agent_type
    } = req.body;
    if (!name || !email || !password) return res.status(400).json({
      error: 'جميع الحقول مطلوبة'
    });
    const exists = await db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
    if (exists) return res.status(400).json({
      error: 'البريد موجود بالفعل'
    });
    const hash = bcrypt.hashSync(password, 10);
    const referralCode = generateReferralCode();
    const payMethod = payment_method === 'instapay' ? 'instapay' : payment_method === 'wallet' ? 'wallet' : '';
    const payOperator = payMethod === 'wallet' && ['orange', 'etisalat', 'vodafone'].indexOf(String(payment_operator || '').toLowerCase()) !== -1 ? String(payment_operator).toLowerCase() : '';
    const agentType = agent_type === 'labor' ? 'labor' : 'normal';
    const result = await db.prepare('INSERT INTO agents (name, email, phone, password, referral_code, created_by, payment_method, payment_operator, agent_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, email, phone || '', hash, referralCode, req.user.id, payMethod, payOperator, agentType);
    res.json({
      id: result.lastInsertRowid,
      referral_code: referralCode
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin creates a ready-to-use verified user (no email verification needed)
app.post('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      gender
    } = req.body;
    if (!name || !email || !password) return res.status(400).json({
      error: 'جميع الحقول مطلوبة'
    });
    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(400).json({
      error: 'البريد موجود بالفعل'
    });
    const hash = bcrypt.hashSync(password, 10);
    const g = gender === 'female' ? 'female' : 'male';
    const result = await db.prepare(`INSERT INTO users (name, email, password, phone, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(name, email, hash, phone || '', 'مصري', 'Cairo', 'ar', 25, '00000000000000', 'التجارة', 'graduate', g === 'female' ? 'na' : 'exempt', 'no', g);
    res.json({
      id: result.lastInsertRowid,
      email
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Manual database backup (emailed to owner)
app.post('/api/admin/backup', authMiddleware, adminMiddleware, async (req, res) => {
  const r = await backupDatabase(true);
  res.json(r);
});

// Build a portable SQL dump of every table + row (works on both drivers)
async function buildSqlDump() {
  let sql = '-- وَظِيف Database Backup\n-- ' + new Date().toISOString() + '\n\n';
  let tables;
  try {
    tables = await db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  } catch (e) {
    tables = [];
  }
  if (!tables.length || !tables[0].sql) {
    // Cloud driver: list tables from catalog
    tables = (await db.prepare("SELECT tablename AS name FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'").all()).map(t => ({
      name: t.name,
      sql: null
    }));
  }
  for (const t of tables) {
    if (t.sql) sql += t.sql + ';\n\n';else {
      try {
        const cols = await db.prepare("SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = ? ORDER BY ordinal_position").all(t.name);
        const colDefs = cols.map(c => '"' + c.column_name + '" ' + c.data_type + (c.is_nullable === 'NO' ? ' NOT NULL' : '') + (c.column_default && /nextval/i.test(c.column_default) ? '' : c.column_default ? ' DEFAULT ' + c.column_default : ''));
        sql += 'CREATE TABLE IF NOT EXISTS "' + t.name + '" (' + colDefs.join(', ') + ');\n\n';
      } catch (e) {}
    }
    let rows = [];
    try {
      rows = await db.prepare('SELECT * FROM "' + t.name + '"').all();
    } catch (e) {}
    if (rows.length) {
      const cols = Object.keys(rows[0]);
      const colList = cols.map(c => '"' + c + '"').join(', ');
      for (const row of rows) {
        const vals = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'number') return v;
          if (v instanceof Date) return "'" + v.toISOString().slice(0, 19).replace('T', ' ') + "'";
          return "'" + String(v).replace(/'/g, "''") + "'";
        });
        sql += 'INSERT INTO "' + t.name + '" (' + colList + ') VALUES (' + vals.join(', ') + ');\n';
      }
    }
    sql += '\n';
  }
  return sql;
}

// Convert an uploaded sqlite .db into an SQL dump string (old-server backups → cloud DB)
function buildSqlFromSqlJs(t) {
  let sql = '';
  const master = t.exec("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'") || [];
  const tables = (master[0] && master[0].values) || [];
  for (const row of tables) {
    const name = row[0], createSql = row[1];
    if (createSql) sql += createSql + ';\n';
    const q = t.exec('SELECT * FROM "' + name + '"') || [];
    const qrows = (q[0] && q[0].values) || [];
    if (qrows.length) {
      const cols = ((q[0] && q[0].columns) || []).map(c => '"' + c + '"').join(', ');
      for (const vals of qrows) {
        const literal = vals.map(v => v === null || v === undefined ? 'NULL' : typeof v === 'number' ? v : "'" + String(v).replace(/'/g, "''") + "'").join(', ');
        sql += 'INSERT INTO "' + name + '" (' + cols + ') VALUES (' + literal + ');\n';
      }
    }
    sql += '\n';
  }
  return sql;
}

// Shared SQL-restore apply path (used by .sql uploads and converted .db uploads)
async function applySqlRestore(sqlContent) {
  const stmts = splitSqlStatements(sqlContent);
  // The dump is a full copy of the database -> clear every table first and
  // drop tables the dump does not contain, so the result is EXACTLY the dump.
  const dumpTables = new Set();
  for (const s of stmts) {
    const m = s.trim().match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)["'`[]?(\w+)/i);
    if (m) dumpTables.add(m[1]);
  }
  try {
    const existing = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const t of existing) {
      if (dumpTables.size && !dumpTables.has(t.name)) await db.exec('DROP TABLE "' + t.name + '"');
    }
  } catch (e) {
    console.log('SQL restore drop:', e.message);
  }
  await wipeAllData();
  let ok = 0,
    skipped = 0;
  for (const s of stmts) {
    const st = s.trim();
    if (!st) continue;
    try {
      await db.exec(st);
      ok++;
    } catch (e) {
      skipped++;
      if (skipped < 6) console.log('SQL skip:', e.message);
    }
  }
  try {
    db._save && db._save();
  } catch (e) {}
  // Cloud driver: explicit IDs in the dump don't advance sequences — fix that now
  if (db.driverName === 'pg' && db.resetSequences) {
    try {
      await db.resetSequences();
    } catch (e) {
      console.log('Sequence reset:', e.message);
    }
  }
  console.log('SQL restore finished:', ok, 'statements loaded,', skipped, 'skipped');
  return { ok, skipped };
}

// Download database backup file
app.get('/api/admin/backup/download', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const localDbPath = path.join(dataDir, 'app.db');
    const format = req.query.format || 'db';
    if (format === 'sql' || !db.db) {
      // SQL dump path (also used automatically in cloud-driver mode)
      const sql = await buildSqlDump();
      res.setHeader('Content-Type', 'text/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="wazeef-backup-' + new Date().toISOString().slice(0, 10) + '.sql"');
      res.send(sql);
    } else {
      // Flush the in-memory database first so the file on disk is current
      try {
        db._save && db._save();
      } catch (e) {}
      if (!fs.existsSync(localDbPath)) return res.status(404).json({
        error: 'قاعدة البيانات غير موجودة'
      });
      res.setHeader('Content-Disposition', 'attachment; filename="wazeef-backup-' + new Date().toISOString().slice(0, 10) + '.db"');
      res.setHeader('Content-Type', 'application/x-sqlite3');
      fs.createReadStream(localDbPath).pipe(res);
    }
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Split an SQL dump into statements, respecting quoted strings and comments so
// that values containing ";" (messages, descriptions...) are never cut in half.
function splitSqlStatements(sql) {
  const out = [];
  let cur = '';
  let q = null;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    if (q) {
      cur += ch;
      if (ch === q) {
        if (sql[i + 1] === q) {
          cur += sql[i + 1];
          i += 2;
          continue;
        }
        q = null;
      }
      i++;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      q = ch;
      cur += ch;
      i++;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    if (ch === ';') {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) out.push(cur);
  return out;
}
const restoreUpload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

// Restore database from uploaded backup file (applies on restart)
app.post('/api/admin/restore', authMiddleware, adminMiddleware, restoreUpload.single('backup'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({
      error: 'من فضلك اختر ملف النسخة'
    });
    const p = req.file.path;
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    const isSql = head.toString('latin1', 0, 2) === '--' || head.toString('latin1', 0, 2) === 'PR' || head.toString('latin1', 0, 2) === '/*' || req.file && req.file.originalname && req.file.originalname.endsWith('.sql');
    if (head.toString('latin1', 0, 16) !== 'SQLite format 3\0' && !isSql) {
      fs.unlinkSync(p);
      return res.status(400).json({
        error: 'الملف ليس قاعدة بيانات أو ملف SQL صالح'
      });
    }
    if (isSql) {
      const sqlContent = fs.readFileSync(p, 'utf8');
      fs.unlinkSync(p);
      const r = await applySqlRestore(sqlContent);
      res.json({
        success: true,
        message: 'تم استرجاع جميع البيانات من ملف SQL',
        loaded: r.ok,
        skipped: r.skipped
      });
      return;
    }
    // .db binary (old-server backup): local driver restores directly,
    // cloud driver converts it to SQL and loads it immediately.
    const sqlJs = require('sql.js');
    const SQL = await sqlJs();
    const buf = fs.readFileSync(p);
    const t = new SQL.Database(buf, {
      readonly: true
    });
    try {
      const chk = t.exec("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='users'");
      if (!chk.length || !chk[0].values.length || !chk[0].values[0][0]) throw new Error('bad db');
      if (!db.db) {
        // Cloud (PostgreSQL) mode: convert the old sqlite .db to SQL and apply it now
        const sqlContent = buildSqlFromSqlJs(t);
        fs.unlinkSync(p);
        const r = await applySqlRestore(sqlContent);
        res.json({
          success: true,
          message: 'تم تحويل النسخة القديمة واسترجاعها على الداتابيس السحابية',
          loaded: r.ok,
          skipped: r.skipped
        });
        return;
      }
    } finally {
      try {
        t.close();
      } catch (e) {}
    }
    const dest = path.join(dataDir, 'restore.pending.db');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(p, dest);
    res.json({
      success: true,
      message: 'تم قبول النسخة، سيتم الاسترجاع بعد إعادة التشغيل'
    });
    setTimeout(() => process.exit(0), 800);
  } catch (e) {
    console.error('Restore error:', e.message);
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/admin/agents', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const wantLabor = String(req.query.type || '') === 'labor';
    const typeSql = wantLabor ? "IFNULL(agent_type,'normal') = 'labor'" : "IFNULL(agent_type,'normal') != 'labor'";
    const agents = await db.prepare('SELECT id, name, email, phone, referral_code, is_active, role, team_leader_id, created_at, payment_method, payment_operator, agent_type, qualty_languages FROM agents WHERE ' + typeSql + ' ORDER BY created_at DESC').all();
    // Batch stats in 3 queries total instead of 3 per agent
    const ids = agents.map(a => a.id);
    const refMap = {}, appsMap = {}, hiredMap = {};
    if (ids.length) {
      const ph = ids.map(() => '?').join(',');
      try {
        const rows = await db.prepare('SELECT referred_by as aid, COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') GROUP BY referred_by').all(...ids);
        rows.forEach(r => refMap[r.aid] = r.c);
      } catch (e) {}
      try {
        const rows = await db.prepare('SELECT u.referred_by as aid, COUNT(*) as c FROM users u JOIN applications ap ON u.id = ap.user_id WHERE u.referred_by IN (' + ph + ') GROUP BY u.referred_by').all(...ids);
        rows.forEach(r => appsMap[r.aid] = r.c);
      } catch (e) {}
      try {
        const rows = await db.prepare('SELECT u.referred_by as aid, COUNT(*) as c FROM users u JOIN selections s ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ') AND s.hired = 1 GROUP BY u.referred_by').all(...ids);
        rows.forEach(r => hiredMap[r.aid] = r.c);
      } catch (e) {}
    }
    const agentsWithStats = agents.map(a => ({
      ...a,
      referredUsers: refMap[a.id] || 0,
      referredWithApps: appsMap[a.id] || 0,
      hired: hiredMap[a.id] || 0
    }));
    res.json(agentsWithStats);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: set the languages a qualty reviews (so he only sees those applications)
app.put('/api/admin/agents/:id/qualty', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ag = await db.prepare('SELECT id, name, role, qualty_languages FROM agents WHERE id = ?').get(parseInt(req.params.id));
    if (!ag) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    if (['qualty', 'super_qualty'].indexOf(ag.role) === -1) return res.status(400).json({
      error: 'المندوب مش قولتي — غيّر الرول الأول'
    });
    const body = req.body || {};
    const raw = Array.isArray(body.languages) ? body.languages : [];
    const clean = [];
    for (const l of raw) {
      const code = normLangCode(typeof l === 'string' ? l : '');
      if (!/^[a-z]{2,8}$/.test(code)) return res.status(400).json({
        error: 'كود لغة غير صالح: ' + String(l).slice(0, 20)
      });
      if (clean.indexOf(code) === -1) clean.push(code);
      if (clean.length > 10) return res.status(400).json({
        error: 'الحد الأقصى 10 لغات'
      });
    }
    await db.prepare('UPDATE agents SET qualty_languages = ? WHERE id = ?').run(clean.join(','), ag.id);
    res.json({
      success: true,
      id: ag.id,
      name: ag.name,
      role: ag.role,
      languages: clean
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Agent earnings breakdown
app.get('/api/admin/agent-earnings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agents = await db.prepare("SELECT id, name, email, phone, referral_code FROM agents WHERE IFNULL(agent_type,'normal') != 'labor' ORDER BY created_at DESC").all();
    // Batch: get ALL hired selections joined with referred_by in ONE query
    const allHired = await db.prepare(`
      SELECT u.referred_by as aid, s.amount, s.agent_amount, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE s.hired = 1
    `).all();
    const allCancelled = await db.prepare(`
      SELECT u.referred_by as aid, COUNT(*) as c FROM selections s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'cancelled' GROUP BY u.referred_by
    `).all();
    const allWaiting = await db.prepare(`
      SELECT u.referred_by as aid, COUNT(*) as c FROM selections s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'selected' GROUP BY u.referred_by
    `).all();
    // Index by agent id
    const hiredByAgent = {};
    allHired.forEach(s => {
      if (!hiredByAgent[s.aid]) hiredByAgent[s.aid] = [];
      hiredByAgent[s.aid].push(s);
    });
    const cancelledMap = {};
    allCancelled.forEach(r => cancelledMap[r.aid] = r.c);
    const waitingMap = {};
    allWaiting.forEach(r => waitingMap[r.aid] = r.c);
    const result = agents.map(a => {
      const hiredSelections = hiredByAgent[a.id] || [];
      const totalAgentEarnings = hiredSelections.reduce((sum, s) => sum + (s.agent_amount || 0), 0);
      const totalCompanyEarnings = hiredSelections.reduce((sum, s) => sum + (s.amount || 0), 0);
      const highest = hiredSelections.length > 0 ? Math.max(...hiredSelections.map(s => s.agent_amount || 0)) : 0;
      const lowest = hiredSelections.length > 0 ? Math.min(...hiredSelections.map(s => s.agent_amount || 0)) : 0;
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        referral_code: a.referral_code,
        totalHired: hiredSelections.length,
        totalCancelled: cancelledMap[a.id] || 0,
        totalWaiting: waitingMap[a.id] || 0,
        totalAgentEarnings,
        totalCompanyEarnings,
        highestEarning: highest,
        lowestEarning: lowest,
        details: hiredSelections
      };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Agent rankings (monthly/yearly)
app.get('/api/admin/agent-rankings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      period,
      year,
      month
    } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let targetYear = currentYear;
    let targetMonth = currentMonth;
    if (year && year !== 'all') targetYear = parseInt(year);
    if (month && month !== 'all') targetMonth = parseInt(month);
    let dateClause = '';
    const params = [];
    if (period === 'month') {
      const my = month && month !== 'all' ? targetMonth : currentMonth;
      const myYear = year && year !== 'all' ? targetYear : currentYear;
      const monthStart = `${myYear}-${String(my).padStart(2, '0')}-01`;
      const monthEnd = new Date(myYear, my, 0).toISOString().split('T')[0];
      dateClause = `AND s.created_at >= ? AND s.created_at <= ?`;
      params.push(monthStart, monthEnd + ' 23:59:59');
    } else if (period === '3months') {
      const startDate = new Date(targetYear, targetMonth - 3, 1).toISOString().split('T')[0];
      dateClause = `AND s.created_at >= ?`;
      params.push(startDate);
    } else if (period === '4months') {
      const startDate = new Date(targetYear, targetMonth - 4, 1).toISOString().split('T')[0];
      dateClause = `AND s.created_at >= ?`;
      params.push(startDate);
    } else if (period === 'year') {
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31 23:59:59`;
      dateClause = `AND s.created_at >= ? AND s.created_at <= ?`;
      params.push(yearStart, yearEnd);
    } else if (period === 'all') {
      // No date filter - all time
    }
    const query = `
      SELECT
        a.id,
        a.name,
        a.email,
        a.phone,
        a.referral_code,
        COUNT(s.id) as hired,
        COALESCE(SUM(s.amount), 0) as company_earned,
        COALESCE(SUM(s.agent_amount), 0) as agent_earned
      FROM agents a
      LEFT JOIN users u ON u.referred_by = a.id
      LEFT JOIN selections s ON s.user_id = u.id AND s.hired = 1 ${dateClause}
      WHERE a.is_active = 1 AND IFNULL(a.agent_type,'normal') != 'labor'
      GROUP BY a.id, a.name, a.email, a.phone, a.referral_code
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC, COALESCE(SUM(s.amount), 0) DESC, COALESCE(SUM(s.agent_amount), 0) DESC, a.name ASC
    `;
    const rankings = await db.prepare(query).all(...params);
    res.json(rankings);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Qualty rankings (monthly/yearly) - same shape as agent rankings
app.get('/api/admin/qualty-rankings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      period,
      year,
      month
    } = req.query;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    let targetYear = currentYear;
    let targetMonth = currentMonth;
    if (year && year !== 'all') targetYear = parseInt(year);
    if (month && month !== 'all') targetMonth = parseInt(month);
    let dateClauseApp = '';
    let dateClauseSel = '';
    const paramsApp = [];
    const paramsSel = [];
    if (period === 'month') {
      const my = month && month !== 'all' ? targetMonth : currentMonth;
      const myYear = year && year !== 'all' ? targetYear : currentYear;
      const monthStart = `${myYear}-${String(my).padStart(2, '0')}-01`;
      const monthEnd = new Date(myYear, my, 0).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ? AND app.reviewed_at <= ?`;
      dateClauseSel = `AND s.created_at >= ? AND s.created_at <= ?`;
      paramsApp.push(monthStart, monthEnd + ' 23:59:59');
      paramsSel.push(monthStart, monthEnd + ' 23:59:59');
    } else if (period === '3months') {
      const startDate = new Date(targetYear, targetMonth - 3, 1).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ?`;
      dateClauseSel = `AND s.created_at >= ?`;
      paramsApp.push(startDate);
      paramsSel.push(startDate);
    } else if (period === '4months') {
      const startDate = new Date(targetYear, targetMonth - 4, 1).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ?`;
      dateClauseSel = `AND s.created_at >= ?`;
      paramsApp.push(startDate);
      paramsSel.push(startDate);
    } else if (period === 'year') {
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31 23:59:59`;
      dateClauseApp = `AND app.reviewed_at >= ? AND app.reviewed_at <= ?`;
      dateClauseSel = `AND s.created_at >= ? AND s.created_at <= ?`;
      paramsApp.push(yearStart, yearEnd);
      paramsSel.push(yearStart, yearEnd);
    }
    // For each qualty, count approved and hired in period
    const qualtys = await db.prepare("SELECT id, name, email, phone, referral_code FROM agents WHERE role IN ('qualty','super_qualty') AND is_active=1 AND IFNULL(agent_type,'normal') != 'labor' ORDER BY id").all();
    const rankings = (await Promise.all(qualtys.map(async q => {
      const approved = (await db.prepare(`SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by=? AND app.status='approved' ${dateClauseApp}`).get(q.id, ...paramsApp)).c;
      const rejected = (await db.prepare(`SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by=? AND app.status='rejected' ${dateClauseApp}`).get(q.id, ...paramsApp)).c;
      const hired = (await db.prepare(`SELECT COUNT(*) as c FROM selections s JOIN applications app ON s.user_id=app.user_id WHERE app.reviewed_by=? AND s.hired=1 ${dateClauseSel}`).get(q.id, ...paramsSel)).c;
      return {
        id: q.id,
        name: q.name,
        email: q.email,
        phone: q.phone,
        referral_code: q.referral_code,
        hired: hired,
        approved: approved,
        rejected: rejected,
        company_earned: approved * 1000,
        // dummy for sorting compatibility
        agent_earned: hired * 500
      };
    }))).filter(r => r.approved > 0 || r.hired > 0 || r.rejected > 0);
    rankings.sort((a, b) => b.hired - a.hired || b.approved - a.approved || a.name.localeCompare(b.name));
    res.json(rankings);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/admin/ranking-years', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (process.env.DB_DEBUG) console.log('RANKING-YEARS: db.driverName =', db.driverName, 'typeof prepare =', typeof db.prepare);
    const years = await db.prepare(`
      SELECT DISTINCT CAST(strftime('%Y', created_at) AS INTEGER) as year
      FROM selections
      WHERE created_at IS NOT NULL
      ORDER BY year DESC
    `).all();
    const yearList = years.map(y => y.year);
    const now = new Date().getFullYear();
    if (!yearList.includes(now)) yearList.push(now);
    yearList.sort((a, b) => b - a);
    res.json(yearList);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/admin/qualty-ranking-years', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const years = await db.prepare(`
      SELECT DISTINCT CAST(strftime('%Y', reviewed_at) AS INTEGER) as year
      FROM applications
      WHERE reviewed_at IS NOT NULL
      ORDER BY year DESC
    `).all();
    const yearList = years.map(y => y.year).filter(Boolean);
    const now = new Date().getFullYear();
    if (!yearList.includes(now)) yearList.push(now);
    yearList.sort((a, b) => b - a);
    res.json(yearList);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/agents/:id/toggle', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agent = await db.prepare('SELECT is_active FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'Agent not found'
    });
    await db.prepare('UPDATE agents SET is_active = ? WHERE id = ?').run(agent.is_active ? 0 : 1, req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/agents/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      phone,
      payment_method,
      payment_operator
    } = req.body;
    const agent = await db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    const fields = [],
      vals = [];
    if (name !== undefined) {
      if (!String(name).trim()) return res.status(400).json({
        error: 'الاسم مطلوب'
      });
      fields.push('name = ?');
      vals.push(String(name).trim());
    }
    if (phone !== undefined) {
      fields.push('phone = ?');
      vals.push(String(phone).trim());
    }
    if (payment_method !== undefined) {
      const pm = payment_method === 'instapay' ? 'instapay' : payment_method === 'wallet' ? 'wallet' : '';
      const po = pm === 'wallet' && ['orange', 'etisalat', 'vodafone'].indexOf(String(payment_operator || '').toLowerCase()) !== -1 ? String(payment_operator).toLowerCase() : '';
      fields.push('payment_method = ?');
      vals.push(pm);
      fields.push('payment_operator = ?');
      vals.push(po);
    }
    if (!fields.length) return res.status(400).json({
      error: 'لا توجد بيانات للتعديل'
    });
    vals.push(req.params.id);
    await db.prepare('UPDATE agents SET ' + fields.join(', ') + ' WHERE id = ?').run(...vals);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/agents/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      password
    } = req.body;
    if (!password || password.length < 6) return res.status(400).json({
      error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    });
    const agent = await db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE agents SET password = ? WHERE id = ?').run(hash, req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/admin/agents/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    await db.prepare('UPDATE users SET referred_by = NULL WHERE referred_by = ?').run(req.params.id);
    await db.prepare('UPDATE applications SET assigned_qualty_id = NULL WHERE assigned_qualty_id = ?').run(req.params.id);
    await db.prepare('UPDATE applications SET reviewed_by = NULL WHERE reviewed_by = ?').run(req.params.id);
    await db.prepare('UPDATE notifications SET agent_id = NULL WHERE agent_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM labor_workers WHERE labor_agent_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM labor_groups WHERE labor_agent_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    res.json({
      success: true
    });
    if (agent.email) {
      sendEmail(agent.email, 'تم حذف حسابك - وَظِيف', `
        
          
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#e57373;">تم حذف حسابك</h2>
          <p style="color:#888;font-size:13px;text-align:center;">تم حذف حسابك كمندوب من المنصة. الأعضاء الذين كانوا مسجّلين عبر رابطك تم تحويلهم للتسجيل المباشر.</p>
          <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
        
      `).catch(e => console.log('Email error:', e.message));
    }
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: search applicants (users) by exact email
app.get('/api/admin/users/search', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({
      error: 'من فضلك أدخل البريد الإلكتروني'
    });
    const u = await db.prepare('SELECT id, name, email, phone, role, email_verified, referred_by, created_at FROM users WHERE LOWER(email) = ?').get(email);
    if (!u) return res.status(404).json({
      error: 'لا يوجد حساب بهذا البريد الإلكتروني'
    });
    let referrer = null;
    if (u.referred_by) {
      referrer = (await db.prepare('SELECT id, name, email FROM agents WHERE id = ?').get(u.referred_by)) || null;
    }
    let apps = 0,
      hired = 0;
    try {
      apps = (await db.prepare('SELECT COUNT(*) as c FROM applications WHERE user_id = ?').get(u.id)).c;
    } catch (e) {}
    try {
      hired = (await db.prepare('SELECT COUNT(*) as c FROM selections WHERE user_id = ?').get(u.id)).c;
    } catch (e) {}
    res.json({
      user: Object.assign({}, u, {
        referrer,
        applications: apps,
        selections: hired
      })
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: reset a user's password
app.put('/api/admin/users/:id/password', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      password
    } = req.body;
    if (!password || password.length < 6) return res.status(400).json({
      error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
    });
    const user = await db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({
      error: 'الحساب غير موجود'
    });
    const hash = bcrypt.hashSync(password, 10);
    await db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: delete a user (applicant) + unlink from agent's list
app.delete('/api/admin/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, email, referred_by FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({
      error: 'الحساب غير موجود'
    });
    await db.prepare('DELETE FROM applications WHERE user_id = ?').run(user.id);
    await db.prepare('DELETE FROM selections WHERE user_id = ?').run(user.id);
    await db.prepare('DELETE FROM notifications WHERE user_id = ?').run(user.id);
    await db.prepare('UPDATE users SET referred_by = NULL WHERE id = ?').run(user.id);
    await db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: promote/demote agent
app.post('/api/admin/agents/:id/promote', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    const newRole = agent.role === 'qualty' ? 'agent' : 'qualty';
    await db.prepare('UPDATE agents SET role = ? WHERE id = ?').run(newRole, req.params.id);
    const label = newRole === 'qualty' ? 'ترقية' : 'تخفيض';
    res.json({
      success: true,
      message: `تم ${label} المندوب إلى ${newRole}`,
      newRole
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== TEAM LEADER / SUPER QUALTY =====
async function teamStatsForAgents(ids, withDays) {
  const out = {
    registered_total: 0,
    hired_total: 0,
    registered_month: 0,
    hired_month: 0,
    days: []
  };
  if (!ids || !ids.length) return out;
  const ph = ids.map(function () {
    return '?';
  }).join(',');
  const now = new Date();
  const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
  try {
    out.registered_total = (await db.prepare('SELECT COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ')').get(...ids)).c;
    out.hired_total = (await db.prepare('SELECT COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ') AND s.hired = 1').get(...ids)).c;
    out.registered_month = (await db.prepare('SELECT COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') AND datetime(created_at,\'localtime\') >= ?').get(...ids, monthStart)).c;
    out.hired_month = (await db.prepare('SELECT COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ") AND s.hired = 1 AND datetime(COALESCE(s.hired_at, s.created_at),'localtime') >= ?").get(...ids, monthStart)).c;
  } catch (e) {}
  if (withDays) {
    try {
      const start = new Date(Date.now() - 13 * 86400000);
      const startStr = start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0');
      const regRows = await db.prepare('SELECT substr(datetime(created_at,\'localtime\'),1,10) as d, COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') AND datetime(created_at,\'localtime\') >= ? GROUP BY d').all(...ids, startStr);
      const hireRows = await db.prepare('SELECT substr(datetime(COALESCE(s.hired_at, s.created_at),\'localtime\'),1,10) as d, COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ") AND s.hired = 1 AND datetime(COALESCE(s.hired_at, s.created_at),'localtime') >= ? GROUP BY d").all(...ids, startStr);
      const regMap = {};
      regRows.forEach(function (r) {
        regMap[r.d] = r.c;
      });
      const hireMap = {};
      hireRows.forEach(function (r) {
        hireMap[r.d] = r.c;
      });
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({
          day: key,
          registered: regMap[key] || 0,
          hired: hireMap[key] || 0
        });
      }
      out.days = days;
    } catch (e) {}
  }
  return out;
}

// Batch stats for many agents in ONE query each (instead of 4 queries per agent)
async function teamStatsBatch(ids) {
  const map = {};
  if (!ids || !ids.length) return map;
  const ph = ids.map(() => '?').join(',');
  const now = new Date();
  const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
  try {
    const reg = await db.prepare('SELECT referred_by as aid, COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') GROUP BY referred_by').all(...ids);
    reg.forEach(r => { if (!map[r.aid]) map[r.aid] = {}; map[r.aid].registered_total = r.c; });
  } catch (e) {}
  try {
    const hired = await db.prepare('SELECT u.referred_by as aid, COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ') AND s.hired = 1 GROUP BY u.referred_by').all(...ids);
    hired.forEach(r => { if (!map[r.aid]) map[r.aid] = {}; map[r.aid].hired_total = r.c; });
  } catch (e) {}
  try {
    const regM = await db.prepare('SELECT referred_by as aid, COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') AND datetime(created_at,\'localtime\') >= ? GROUP BY referred_by').all(...ids, monthStart);
    regM.forEach(r => { if (!map[r.aid]) map[r.aid] = {}; map[r.aid].registered_month = r.c; });
  } catch (e) {}
  try {
    const hiredM = await db.prepare('SELECT u.referred_by as aid, COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ") AND s.hired = 1 AND datetime(COALESCE(s.hired_at, s.created_at),'localtime') >= ? GROUP BY u.referred_by").all(...ids, monthStart);
    hiredM.forEach(r => { if (!map[r.aid]) map[r.aid] = {}; map[r.aid].hired_month = r.c; });
  } catch (e) {}
  // Fill defaults
  ids.forEach(id => {
    if (!map[id]) map[id] = {};
    if (map[id].registered_total === undefined) map[id].registered_total = 0;
    if (map[id].hired_total === undefined) map[id].hired_total = 0;
    if (map[id].registered_month === undefined) map[id].registered_month = 0;
    if (map[id].hired_month === undefined) map[id].hired_month = 0;
  });
  return map;
}

// ===== TEAM CALENDAR (admin board + team leader page) =====
// Per-day registered/hired counts for a set of agents inside one month ('YYYY-MM')
async function teamMonthCounts(ids, month) {
  const out = {};
  if (!ids || !ids.length) return out;
  const ph = ids.map(function () {
    return '?';
  }).join(',');
  try {
    const reg = await db.prepare('SELECT substr(datetime(created_at,\'localtime\'),1,10) as d, COUNT(*) as c FROM users WHERE referred_by IN (' + ph + ') AND substr(datetime(created_at,\'localtime\'),1,7) = ? GROUP BY d').all(...ids, month);
    reg.forEach(function (r) {
      out[r.d] = {
        registered: r.c,
        hired: 0
      };
    });
    const hire = await db.prepare('SELECT substr(datetime(COALESCE(s.hired_at, s.created_at),\'localtime\'),1,10) as d, COUNT(*) as c FROM selections s JOIN users u ON u.id = s.user_id WHERE u.referred_by IN (' + ph + ") AND s.hired = 1 AND substr(datetime(COALESCE(s.hired_at, s.created_at),'localtime'),1,7) = ? GROUP BY d").all(...ids, month);
    hire.forEach(function (r) {
      if (!out[r.d]) out[r.d] = {
        registered: 0,
        hired: 0
      };
      out[r.d].hired = r.c;
    });
  } catch (e) {}
  return out;
}
function _groupByAgent(rows, mapFn) {
  const g = {};
  rows.forEach(function (r) {
    const key = r.referred_by || 0;
    if (!g[key]) g[key] = {
      agent_id: r.referred_by || 0,
      agent_name: r.agent_name || 'مندوب محذوف',
      count: 0,
      people: []
    };
    g[key].count++;
    g[key].people.push(mapFn(r));
  });
  return Object.keys(g).map(function (k) {
    return g[k];
  });
}

// Who joined / who got hired on one day, grouped by the rep that brought them,
// with each person's accept/reject decision + when it happened
async function teamDayDetail(ids, date) {
  const out = {
    date: date,
    registered: [],
    hired: [],
    total_registered: 0,
    total_hired: 0
  };
  if (!ids || !ids.length) return out;
  const ph = ids.map(function () {
    return '?';
  }).join(',');
  let rows = [];
  try {
    rows = await db.prepare('SELECT u.id, u.name, u.phone, u.created_at, u.referred_by, ag.name as agent_name, ' + 'a.status as app_status, a.rejection_date, a.rejection_reason, a.approval_date, a.reviewed_at, ' + '(SELECT COUNT(*) FROM selections sx WHERE sx.user_id = u.id AND sx.hired = 1) as hired_count, ' + '(SELECT MIN(sx.hired_at) FROM selections sx WHERE sx.user_id = u.id AND sx.hired = 1) as hired_at ' + 'FROM users u ' + 'LEFT JOIN agents ag ON ag.id = u.referred_by ' + 'LEFT JOIN applications a ON a.id = (SELECT id FROM applications WHERE user_id = u.id ORDER BY id DESC LIMIT 1) ' + 'WHERE u.referred_by IN (' + ph + ') AND substr(datetime(u.created_at,\'localtime\'),1,10) = ? ORDER BY u.referred_by, u.id LIMIT 400').all(...ids, date);
  } catch (e) {}
  out.registered = _groupByAgent(rows, function (r) {
    const status = r.app_status || 'none';
    let decision_at = null;
    if (status === 'rejected') decision_at = r.rejection_date || null;else if (status === 'approved') decision_at = r.approval_date || r.reviewed_at || null;
    return {
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      registered_at: r.created_at,
      status: status,
      decision_at: decision_at,
      reason: r.rejection_reason || '',
      hired: Number(r.hired_count) > 0 ? 1 : 0,
      hired_at: r.hired_at || null
    };
  });
  out.total_registered = rows.length;
  let hrows = [];
  try {
    hrows = await db.prepare('SELECT s.hired_at, s.created_at, s.company_decision, s.company_decision_at, ' + 'u.id, u.name, u.phone, u.referred_by, ag.name as agent_name, j.company_name, j.position ' + 'FROM selections s JOIN users u ON u.id = s.user_id ' + 'LEFT JOIN agents ag ON ag.id = u.referred_by ' + 'LEFT JOIN jobs j ON j.id = s.job_id ' + 'WHERE u.referred_by IN (' + ph + ") AND s.hired = 1 AND substr(datetime(COALESCE(s.hired_at, s.created_at),'localtime'),1,10) = ? ORDER BY u.referred_by, u.id LIMIT 400").all(...ids, date);
  } catch (e) {}
  out.hired = _groupByAgent(hrows, function (r) {
    return {
      id: r.id,
      name: r.name,
      phone: r.phone || '',
      hired_at: r.hired_at || r.created_at,
      company: r.company_name || '',
      position: r.position || '',
      company_decision: r.company_decision || '',
      company_decision_at: r.company_decision_at || null
    };
  });
  out.total_hired = hrows.length;
  return out;
}
async function teamMemberIdsOf(leaderId) {
  try {
    return (await db.prepare('SELECT id FROM agents WHERE team_leader_id = ?').all(leaderId)).map(function (r) {
      return r.id;
    });
  } catch (e) {
    return [];
  }
}
function _validMonth(m) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(m || '');
}
function _validDate(d) {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(d || '');
}

// Admin board: month counts for one leader's team
app.get('/api/admin/team-leaders/:id/calendar', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const month = String(req.query.month || '');
    if (!_validMonth(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    const leader = await db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!leader) return res.status(404).json({
      error: 'التيم ليدر غير موجود'
    });
    res.json({
      month: month,
      days: await teamMonthCounts(await teamMemberIdsOf(leader.id), month)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin board: one day's drill-down (who joined, by whom, accepted/rejected when)
app.get('/api/admin/team-leaders/:id/day', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!_validDate(date)) return res.status(400).json({
      error: 'تاريخ غير صالح'
    });
    const leader = await db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!leader) return res.status(404).json({
      error: 'التيم ليدر غير موجود'
    });
    res.json(await teamDayDetail(await teamMemberIdsOf(leader.id), date));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Team leader page: same two views for his own team
app.get('/api/agent/team/calendar', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const month = String(req.query.month || '');
    if (!_validMonth(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    const leaderId = await getAgentId(req);
    if (!leaderId) return res.status(400).json({
      error: 'مفيش تيم ليدر مرتبط بالحساب ده'
    });
    res.json({
      month: month,
      days: await teamMonthCounts(await teamMemberIdsOf(leaderId), month)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/agent/team/day', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!_validDate(date)) return res.status(400).json({
      error: 'تاريخ غير صالح'
    });
    const leaderId = await getAgentId(req);
    if (!leaderId) return res.status(400).json({
      error: 'مفيش تيم ليدر مرتبط بالحساب ده'
    });
    res.json(await teamDayDetail(await teamMemberIdsOf(leaderId), date));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: review decisions per day, grouped by the qualty that decided
async function superQualtyMonthCounts(month) {
  const out = {};
  try {
    const appr = await db.prepare("SELECT substr(datetime(COALESCE(approval_date, reviewed_at, created_at),'localtime'),1,10) as d, COUNT(*) as c FROM applications WHERE status = 'approved' AND substr(datetime(COALESCE(approval_date, reviewed_at, created_at),'localtime'),1,7) = ? GROUP BY d").all(month);
    appr.forEach(function (r) {
      out[r.d] = {
        approved: r.c,
        rejected: 0
      };
    });
    const rej = await db.prepare("SELECT substr(datetime(COALESCE(rejection_date, reviewed_at, created_at),'localtime'),1,10) as d, COUNT(*) as c FROM applications WHERE status = 'rejected' AND substr(datetime(COALESCE(rejection_date, reviewed_at, created_at),'localtime'),1,7) = ? GROUP BY d").all(month);
    rej.forEach(function (r) {
      if (!out[r.d]) out[r.d] = {
        approved: 0,
        rejected: 0
      };
      out[r.d].rejected = r.c;
    });
  } catch (e) {}
  return out;
}
async function superQualtyDayDetail(date) {
  const out = {
    date: date,
    kind: 'sq',
    approved: [],
    rejected: [],
    pending: [],
    total_approved: 0,
    total_rejected: 0,
    total_pending: 0
  };
  const groupByDecider = function (rows, whoField) {
    const g = {};
    rows.forEach(function (r) {
      const key = r[whoField] || 0;
      if (!g[key]) g[key] = {
        agent_id: r[whoField] || 0,
        agent_name: r.qualty_name || 'الأدمن',
        count: 0,
        people: []
      };
      g[key].count++;
      g[key].people.push(r.person);
    });
    return Object.keys(g).map(function (k) {
      return g[k];
    });
  };
  try {
    const rows = await db.prepare("SELECT a.id, a.language, a.status, a.approval_date, a.rejection_date, a.rejection_reason, a.reviewed_at, " + "a.reviewed_by, ag.name as qualty_name, u.name, u.email " + "FROM applications a JOIN users u ON u.id = a.user_id " + "LEFT JOIN agents ag ON ag.id = a.reviewed_by " + "WHERE a.status = 'approved' AND substr(datetime(COALESCE(a.approval_date, a.reviewed_at, a.created_at),'localtime'),1,10) = ? " + "ORDER BY a.reviewed_by, a.id LIMIT 400").all(date);
    out.approved = groupByDecider(rows.map(function (r) {
      return {
        reviewed_by: r.reviewed_by,
        qualty_name: r.qualty_name,
        person: {
          id: r.id,
          name: r.name,
          email: r.email,
          language: r.language || '',
          status: r.status,
          decision_at: r.approval_date || r.reviewed_at || null,
          reason: ''
        }
      };
    }), 'reviewed_by');
    out.total_approved = rows.length;
  } catch (e) {}
  try {
    const rows = await db.prepare("SELECT a.id, a.language, a.status, a.rejection_date, a.rejection_reason, a.reviewed_at, " + "a.reviewed_by, ag.name as qualty_name, u.name, u.email " + "FROM applications a JOIN users u ON u.id = a.user_id " + "LEFT JOIN agents ag ON ag.id = a.reviewed_by " + "WHERE a.status = 'rejected' AND substr(datetime(COALESCE(a.rejection_date, a.reviewed_at, a.created_at),'localtime'),1,10) = ? " + "ORDER BY a.reviewed_by, a.id LIMIT 400").all(date);
    out.rejected = groupByDecider(rows.map(function (r) {
      return {
        reviewed_by: r.reviewed_by,
        qualty_name: r.qualty_name,
        person: {
          id: r.id,
          name: r.name,
          email: r.email,
          language: r.language || '',
          status: r.status,
          decision_at: r.rejection_date || r.reviewed_at || null,
          reason: r.rejection_reason || ''
        }
      };
    }), 'reviewed_by');
    out.total_rejected = rows.length;
  } catch (e) {}
  try {
    const rows = await db.prepare("SELECT a.id, a.language, a.status, a.created_at, a.assigned_qualty_id, ag.name as qualty_name, u.name, u.email " + "FROM applications a JOIN users u ON u.id = a.user_id " + "LEFT JOIN agents ag ON ag.id = a.assigned_qualty_id " + "WHERE a.status = 'pending' AND substr(datetime(a.created_at,'localtime'),1,10) = ? " + "ORDER BY a.assigned_qualty_id, a.id LIMIT 400").all(date);
    out.pending = groupByDecider(rows.map(function (r) {
      return {
        reviewed_by: r.assigned_qualty_id,
        qualty_name: r.qualty_name,
        person: {
          id: r.id,
          name: r.name,
          email: r.email,
          language: r.language || '',
          status: r.status,
          decision_at: r.created_at,
          reason: ''
        }
      };
    }), 'reviewed_by');
    out.total_pending = rows.length;
  } catch (e) {}
  return out;
}

// Super qualty: daily approve/reject counts for the review calendar
app.get('/api/agent/super-qualty/calendar', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    const month = String(req.query.month || '');
    if (!_validMonth(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    res.json({
      month: month,
      kind: 'sq',
      days: await superQualtyMonthCounts(month)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: one day's decisions - who approved, who rejected, with reasons
app.get('/api/agent/super-qualty/day', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    const date = String(req.query.date || '');
    if (!_validDate(date)) return res.status(400).json({
      error: 'تاريخ غير صالح'
    });
    res.json(await superQualtyDayDetail(date));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
function _currentMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0');
}

// Super qualty: the team leaders, how they did this month, their target and their warnings
app.get('/api/agent/super-qualty/team-leaders', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    let month = String(req.query.month || '').trim();
    if (!month) month = _currentMonth();
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    const leaders = await db.prepare("SELECT id, name, email, phone, role, is_active FROM agents WHERE role = 'team_leader' ORDER BY is_active DESC, name").all();
    const out = await Promise.all(leaders.map(async function (tl) {
      const memberIds = (await db.prepare('SELECT id FROM agents WHERE team_leader_id = ? AND is_active = 1').all(tl.id)).map(function (r) {
        return r.id;
      });
      const st = await teamStatsForAgents([tl.id].concat(memberIds), false);
      const tgt = await db.prepare('SELECT target FROM leader_targets WHERE team_leader_id = ? AND month = ?').get(tl.id, month);
      const warn = await db.prepare('SELECT COUNT(*) as c, MAX(created_at) as last_at FROM qualty_warnings WHERE agent_id = ?').get(tl.id);
      const target = tgt ? Number(tgt.target) : null;
      return {
        id: tl.id,
        name: tl.name,
        email: tl.email,
        phone: tl.phone,
        role: tl.role,
        is_active: Number(tl.is_active),
        members: memberIds.length,
        registered_month: st.registered_month,
        hired_month: st.hired_month,
        registered_total: st.registered_total,
        hired_total: st.hired_total,
        target: target,
        progress: target !== null && target > 0 ? Math.min(100, Math.round(st.hired_month / target * 100)) : null,
        warnings: warn.c,
        last_warning_at: warn.last_at || null
      };
    }));
    res.json({
      month: month,
      leaders: out
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: every qualty agent (review numbers this month + warnings he received)
app.get('/api/agent/super-qualty/qualtys', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    let month = String(req.query.month || '').trim();
    if (!month) month = _currentMonth();
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    const from = month + '-01';
    const qualtys = await db.prepare("SELECT id, name, email, phone, role, is_active FROM agents WHERE role = 'qualty' ORDER BY is_active DESC, name").all();
    const out = await Promise.all(qualtys.map(async function (q) {
      const st = await db.prepare(`
        SELECT
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN rerecord_request = 1 THEN 1 ELSE 0 END) AS rerecord
        FROM applications WHERE reviewed_by = ? AND reviewed_at >= ?`).get(q.id, from);
      const waiting = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE assigned_qualty_id = ? AND status = 'pending'").get(q.id)).c;
      const warn = await db.prepare('SELECT COUNT(*) as c, MAX(created_at) as last_at FROM qualty_warnings WHERE agent_id = ?').get(q.id);
      return {
        id: q.id,
        name: q.name,
        email: q.email,
        phone: q.phone,
        role: q.role,
        is_active: Number(q.is_active),
        approved: Number(st.approved || 0),
        rejected: Number(st.rejected || 0),
        rerecord: Number(st.rerecord || 0),
        pending: Number(waiting || 0),
        warnings: warn.c,
        last_warning_at: warn.last_at || null
      };
    }));
    res.json({
      month: month,
      qualtys: out
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Qualty: the warnings he received (from the super qualty)
app.get('/api/agent/qualty/warnings', authMiddleware, async (req, res) => {
  try {
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const rows = await db.prepare(`
      SELECT w.id, w.reason, w.note, w.issuer_role, w.created_at, i.name AS issuer_name
      FROM qualty_warnings w
      LEFT JOIN agents i ON i.id = w.issued_by
      WHERE w.agent_id = ?
      ORDER BY w.id DESC LIMIT 20`).all(agentId);
    res.json({
      warnings: rows
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: set (or change) the monthly hiring target of a team leader
app.put('/api/agent/super-qualty/team-target', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    const tlId = parseInt(req.body.team_leader_id);
    const target = parseInt(req.body.target);
    let month = String(req.body.month || '').trim();
    if (!month) month = _currentMonth();
    if (!tlId || isNaN(tlId)) return res.status(400).json({
      error: 'اختر التيم ليدر'
    });
    if (isNaN(target) || target < 0 || target > 100000) return res.status(400).json({
      error: 'التارجيت لازم يكون رقم من 0 ل 100000'
    });
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({
      error: 'شهر غير صالح'
    });
    const tl = await db.prepare("SELECT id FROM agents WHERE id = ? AND role = 'team_leader'").get(tlId);
    if (!tl) return res.status(404).json({
      error: 'التيم ليدر غير موجود'
    });
    await db.prepare("INSERT INTO leader_targets (team_leader_id, month, target, set_by, updated_at) VALUES (?, ?, ?, ?, datetime('now','localtime')) ON CONFLICT(team_leader_id, month) DO UPDATE SET target = excluded.target, set_by = excluded.set_by, updated_at = datetime('now','localtime')").run(tlId, month, target, await getAgentId(req));
    res.json({
      success: true,
      month: month,
      team_leader_id: tlId,
      target: target
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: warn a team leader OR a qualty (internal notification + email + log)
app.post('/api/agent/super-qualty/team-warning', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    const issuerId = await getAgentId(req);
    const agentId = parseInt(req.body.agent_id);
    const reason = String(req.body.reason || '').trim();
    const note = String(req.body.note || '').trim();
    if (!agentId || isNaN(agentId)) return res.status(400).json({
      error: 'اختر التيم ليدر أو القولتي'
    });
    if (!reason) return res.status(400).json({
      error: 'اكتب سبب التحذير'
    });
    const tl = await db.prepare("SELECT id, name, email, role FROM agents WHERE id = ? AND role IN ('team_leader','qualty') AND is_active = 1").get(agentId);
    if (!tl) return res.status(404).json({
      error: 'التيم ليدر أو القولتي غير موجود'
    });
    const issuer = issuerId ? await db.prepare('SELECT name FROM agents WHERE id = ?').get(issuerId) : null;
    const issuerName = issuer ? issuer.name : 'السوبر قولتي';
    await db.prepare('INSERT INTO qualty_warnings (agent_id, issued_by, issuer_role, reason, note) VALUES (?, ?, ?, ?, ?)').run(agentId, issuerId || null, 'super_qualty', reason, note);
    await saveNotification(null, agentId, 'qualty_warning', 'تحذير من ' + issuerName, 'اتبعتلك تحذير: ' + reason + (note ? '\n' + note : ''));
    let emailSent = false;
    try {
      await sendEmail(tl.email, 'تحذير من السوبر قولتي - وَظِيف', `
        <h2 style="text-align:center;font-size:20px;color:#d4a853;margin:0 0 16px;">تحذير من السوبر قولتي</h2>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:14px;">مرحباً ${sanitize(tl.name)},</p>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:14px;">أرسل إليك <strong style="color:#d4a853;">${sanitize(issuerName)}</strong> تنبيهاً بخصوص أدائك:</p>
        <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.18);border-radius:12px;padding:14px 18px;margin-bottom:14px;">
          <p style="color:#d4a853;font-size:14px;font-weight:700;margin:0 0 8px;">السبب: ${sanitize(reason)}</p>
          ${note ? `<p style="color:#aaa;font-size:14px;line-height:1.8;margin:0;">${sanitize(note)}</p>` : ''}
        </div>
        <p style="color:#666;font-size:13px;line-height:1.8;margin:0;">يرجى الانتباه لتحسين الأداء والمتابعة الدورية. وَظِيف.</p>
      `);
      emailSent = true;
    } catch (e) {
      console.log('Super qualty warning email failed:', e.message);
    }
    res.json({
      success: true,
      message: 'تم إرسال التحذير لـ ' + tl.name,
      email_sent: emailSent
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: the warnings he already sent (audit trail)
app.get('/api/agent/super-qualty/team-warnings', authMiddleware, superQualtyMiddleware, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT w.id, w.agent_id, w.reason, w.note, w.created_at,
             a.name AS agent_name, a.email AS agent_email, i.name AS issuer_name
      FROM qualty_warnings w
      LEFT JOIN agents a ON a.id = w.agent_id
      LEFT JOIN agents i ON i.id = w.issued_by
      ORDER BY w.id DESC LIMIT 50
    `).all();
    res.json({
      warnings: rows
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: set the role of an agent (agent / qualty / team_leader / super_qualty)
app.post('/api/admin/agents/:id/role', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const role = String(req.body.role || '').trim();
    if (AGENT_ROLES.indexOf(role) === -1) return res.status(400).json({
      error: 'الرول غير صحيح'
    });
    const agent = await db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    const oldRole = agent.role || 'agent';
    if (oldRole === role) return res.json({
      success: true,
      role: role,
      message: 'لا يوجد تغيير'
    });
    if (role !== 'agent' && role !== 'super_qualty') await db.prepare('UPDATE agents SET team_leader_id = NULL WHERE id = ?').run(agent.id);
    if (oldRole === 'team_leader' && role !== 'team_leader') await db.prepare('UPDATE agents SET team_leader_id = NULL WHERE team_leader_id = ?').run(agent.id);
    await db.prepare('UPDATE agents SET role = ? WHERE id = ?').run(role, agent.id);
    const labels = {
      agent: 'مندوب',
      qualty: 'قولتي',
      team_leader: 'تيم ليدر',
      super_qualty: 'سوبر قولتي'
    };
    res.json({
      success: true,
      role: role,
      message: 'تم تغيير رول المندوب إلى ' + (labels[role] || role)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: team leaders + their teams + month performance
app.get('/api/admin/team-leaders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const leaders = await db.prepare("SELECT id, name, email, phone, referral_code, agent_type, is_active, created_at FROM agents WHERE role = 'team_leader' ORDER BY id DESC").all();
    // Pre-fetch all members for all leaders in ONE query
    const allMemberIds = leaders.map(l => l.id);
    const allMembers = allMemberIds.length
      ? await db.prepare('SELECT id, team_leader_id, name, email, phone, referral_code, agent_type, is_active, created_at FROM agents WHERE team_leader_id IN (' + allMemberIds.map(() => '?').join(',') + ') ORDER BY is_active DESC, id').all(...allMemberIds)
      : [];
    const membersByLeader = {};
    allMembers.forEach(m => {
      if (!membersByLeader[m.team_leader_id]) membersByLeader[m.team_leader_id] = [];
      membersByLeader[m.team_leader_id].push(m);
    });
    // Batch stats for ALL members across ALL leaders in 4 queries
    const allMemberIdList = allMembers.map(m => m.id);
    const ms = await teamStatsBatch(allMemberIdList);
    // Days stats for the first leader's members only (days is per-leader view)
    const out = leaders.map(function (l) {
      const members = membersByLeader[l.id] || [];
      const enriched = members.map(function (m) {
        const s = ms[m.id] || {};
        return Object.assign({}, m, {
          registered: s.registered_total || 0,
          registered_month: s.registered_month || 0,
          hired: s.hired_total || 0,
          hired_month: s.hired_month || 0
        });
      });
      // Aggregate leader totals from batch
      let regT = 0, hireT = 0, regM = 0, hireM = 0;
      members.forEach(m => {
        const s = ms[m.id] || {};
        regT += s.registered_total || 0;
        hireT += s.hired_total || 0;
        regM += s.registered_month || 0;
        hireM += s.hired_month || 0;
      });
      return Object.assign({}, l, {
        members: enriched,
        members_count: members.length,
        active_members: members.filter(function (m) {
          return m.is_active === 1;
        }).length,
        registered_month: regM,
        hired_month: hireM,
        registered_total: regT,
        hired_total: hireT,
        days: []
      });
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: assign an agent to a team leader
app.post('/api/admin/team-leaders/:id/members', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const leaderId = parseInt(req.params.id);
    const agentId = parseInt(req.body.agent_id);
    const leader = await db.prepare("SELECT id, name FROM agents WHERE id = ? AND role = 'team_leader'").get(leaderId);
    if (!leader) return res.status(404).json({
      error: 'التيم ليدر غير موجود'
    });
    if (!agentId || isNaN(agentId)) return res.status(400).json({
      error: 'اختر المندوب'
    });
    const member = await db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!member) return res.status(404).json({
      error: 'المندوب غير موجود'
    });
    if (agentId === leaderId) return res.status(400).json({
      error: 'لا يمكن إضافة التيم ليدر لنفسه'
    });
    if ((member.role || 'agent') !== 'agent' && (member.role || 'agent') !== 'super_qualty') return res.status(400).json({
      error: 'يمكن إضافة المندوبين العاديين والسوبر قولتي فقط للفريق'
    });
    if (member.team_leader_id === leaderId) return res.json({
      success: true,
      message: 'المندوب موجود في الفريق بالفعل'
    });
    await db.prepare('UPDATE agents SET team_leader_id = ? WHERE id = ?').run(leaderId, agentId);
    res.json({
      success: true,
      message: 'تمت إضافة ' + member.name + ' لفريق ' + leader.name
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: remove an agent from a team
app.delete('/api/admin/team-leaders/:id/members/:agentId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const leaderId = parseInt(req.params.id);
    const agentId = parseInt(req.params.agentId);
    const r = await db.prepare('UPDATE agents SET team_leader_id = NULL WHERE id = ? AND team_leader_id = ?').run(agentId, leaderId);
    if (!r.changes) return res.status(404).json({
      error: 'المندوب ليس في فريق هذا التيم ليدر'
    });
    res.json({
      success: true,
      message: 'تم إخراج المندوب من الفريق'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Team leader: full team overview (members + month stats + day by day)
app.get('/api/agent/team/overview', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const leaderId = await getAgentId(req);
    const leader = await db.prepare('SELECT id, name, email, phone, referral_code FROM agents WHERE id = ?').get(leaderId);
    if (!leader) return res.status(404).json({
      error: 'الجلسة غير صالحة، برجاء تسجيل الدخول مرة أخرى'
    });
    const members = await db.prepare('SELECT id, name, email, phone, referral_code, agent_type, is_active, created_at FROM agents WHERE team_leader_id = ? ORDER BY is_active DESC, id').all(leaderId);
    const ms = await teamStatsBatch(members.map(function (m) { return m.id; }));
    const enriched = members.map(function (m) {
      const s = ms[m.id] || {};
      return Object.assign({}, m, {
        registered: s.registered_total || 0,
        registered_month: s.registered_month || 0,
        hired: s.hired_total || 0,
        hired_month: s.hired_month || 0,
        working: m.is_active === 1
      });
    });
    const st = await teamStatsForAgents(members.map(function (m) {
      return m.id;
    }), true);
    const warnings = await db.prepare('SELECT w.id, w.agent_id, w.reason, w.note, w.created_at, a.name as agent_name FROM team_warnings w JOIN agents a ON a.id = w.agent_id WHERE w.team_leader_id = ? ORDER BY w.id DESC LIMIT 20').all(leaderId);
    const requests = await db.prepare("SELECT r.id, r.agent_id, r.reason, r.status, r.created_at, a.name as agent_name FROM team_removal_requests r JOIN agents a ON a.id = r.agent_id WHERE r.team_leader_id = ? ORDER BY r.id DESC LIMIT 20").all(leaderId);
    res.json({
      leader: leader,
      members: enriched,
      stats: Object.assign({
        members: members.length,
        active_members: enriched.filter(function (x) {
          return x.is_active === 1;
        }).length
      }, st),
      warnings: warnings,
      requests: requests
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Team leader: his own monthly target (set by the super qualty) + how much is done/left + warnings sent to him
app.get('/api/agent/team-leader/target', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const leaderId = await getAgentId(req);
    const month = _currentMonth();
    const tRow = await db.prepare('SELECT target, set_by, created_at FROM leader_targets WHERE team_leader_id = ? AND month = ?').get(leaderId, month);
    const memberIds = (await db.prepare('SELECT id FROM agents WHERE team_leader_id = ? AND is_active = 1').all(leaderId)).map(function (r) {
      return r.id;
    });
    const st = await teamStatsForAgents([leaderId].concat(memberIds), false);
    const target = tRow ? Number(tRow.target) : null;
    const done = st.hired_month || 0;
    const remaining = target === null ? null : Math.max(0, target - done);
    const progress = target !== null && target > 0 ? Math.min(100, Math.round(done / target * 100)) : null;
    const received = await db.prepare('SELECT id, reason, note, issuer_role, created_at FROM qualty_warnings WHERE agent_id = ? ORDER BY id DESC LIMIT 20').all(leaderId);
    res.json({
      month: month,
      target: target,
      target_set_by: tRow ? tRow.set_by : null,
      registered_month: st.registered_month || 0,
      hired_month: st.hired_month || 0,
      registered_total: st.registered_total || 0,
      hired_total: st.hired_total || 0,
      remaining: remaining,
      progress: progress,
      warnings_received: received
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Team leader: send a warning to one of his agents (mail + stored)
app.post('/api/agent/team/warnings', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const leaderId = await getAgentId(req);
    const agentId = parseInt(req.body.agent_id);
    const reason = String(req.body.reason || '').trim();
    const note = String(req.body.note || '').trim();
    if (!agentId || isNaN(agentId)) return res.status(400).json({
      error: 'اختر المندوب'
    });
    if (!reason) return res.status(400).json({
      error: 'اكتب سبب التحذير'
    });
    const member = await db.prepare('SELECT * FROM agents WHERE id = ? AND team_leader_id = ?').get(agentId, leaderId);
    if (!member) return res.status(404).json({
      error: 'هذا المندوب ليس في فريقك'
    });
    const leader = await db.prepare('SELECT name FROM agents WHERE id = ?').get(leaderId);
    await db.prepare('INSERT INTO team_warnings (team_leader_id, agent_id, reason, note) VALUES (?, ?, ?, ?)').run(leaderId, agentId, reason, note);
    let emailSent = false;
    try {
      await sendEmail(member.email, 'تحذير من التيم ليدر - وَظِيف', `
        <h2 style="text-align:center;font-size:20px;color:#d4a853;margin:0 0 16px;">تحذير من التيم ليدر</h2>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:14px;">مرحباً ${sanitize(member.name)},</p>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:14px;">أرسل إليك <strong style="color:#d4a853;">${sanitize(leader ? leader.name : 'التيم ليدر')}</strong> تنبيهاً بخصوص أدائك داخل الفريق:</p>
        <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.18);border-radius:12px;padding:14px 18px;margin-bottom:14px;">
          <p style="color:#d4a853;font-size:14px;font-weight:700;margin:0 0 8px;">السبب: ${sanitize(reason)}</p>
          ${note ? `<p style="color:#aaa;font-size:14px;line-height:1.8;margin:0;">${sanitize(note)}</p>` : ''}
        </div>
        <p style="color:#666;font-size:13px;line-height:1.8;margin:0;">يرجى الانتباه لتحسين الأداء والاستمرار في العمل. وَظِيف.</p>
      `);
      emailSent = true;
    } catch (e) {
      console.log('Team warning email failed:', e.message);
    }
    res.json({
      success: true,
      message: 'تم إرسال التحذير لـ ' + member.name,
      email_sent: emailSent
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Team leader: ask the admin to remove one of his agents
app.post('/api/agent/team/removal', authMiddleware, teamLeaderMiddleware, async (req, res) => {
  try {
    const leaderId = await getAgentId(req);
    const agentId = parseInt(req.body.agent_id);
    const reason = String(req.body.reason || '').trim();
    if (!agentId || isNaN(agentId)) return res.status(400).json({
      error: 'اختر المندوب'
    });
    if (!reason) return res.status(400).json({
      error: 'اكتب سبب طلب الحذف'
    });
    const member = await db.prepare('SELECT * FROM agents WHERE id = ? AND team_leader_id = ?').get(agentId, leaderId);
    if (!member) return res.status(404).json({
      error: 'هذا المندوب ليس في فريقك'
    });
    const open = await db.prepare("SELECT id FROM team_removal_requests WHERE agent_id = ? AND team_leader_id = ? AND status = 'pending'").get(agentId, leaderId);
    if (open) return res.status(400).json({
      error: 'فيه طلب حذف بالفعل ل هذا المندوب و لسه محتاج قرار الأدمن'
    });
    await db.prepare('INSERT INTO team_removal_requests (team_leader_id, agent_id, reason) VALUES (?, ?, ?)').run(leaderId, agentId, reason);
    res.json({
      success: true,
      message: 'وصل الطلب للأدمن، هيتم إبلاغك بالقرار'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: pending removal requests coming from team leaders
app.get('/api/admin/team/removal-requests', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT r.id, r.agent_id, r.reason, r.status, r.created_at, r.resolved_at,
             l.name as leader_name, a.name as agent_name, a.email as agent_email, a.is_active
      FROM team_removal_requests r
      JOIN agents l ON l.id = r.team_leader_id
      JOIN agents a ON a.id = r.agent_id
      ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.id DESC
      LIMIT 200
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: accept / reject a removal request (accept => deactivate the agent)
app.post('/api/admin/team/removal-requests/:id/resolve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const action = String(req.body.action || '').trim();
    if (action !== 'approve' && action !== 'reject') return res.status(400).json({
      error: 'القرار غير صحيح'
    });
    const row = await db.prepare('SELECT * FROM team_removal_requests WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({
      error: 'الطلب غير موجود'
    });
    if (row.status !== 'pending') return res.status(400).json({
      error: 'تم اتخاذ قرار على هذا الطلب بالفعل'
    });
    if (action === 'approve') {
      await db.prepare('UPDATE agents SET is_active = 0, team_leader_id = NULL WHERE id = ?').run(row.agent_id);
    }
    await db.prepare("UPDATE team_removal_requests SET status = ?, resolved_by = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?").run(action === 'approve' ? 'approved' : 'rejected', req.user.id, row.id);
    const member = await db.prepare('SELECT name, email FROM agents WHERE id = ?').get(row.agent_id);
    if (action === 'approve' && member && member.email) {
      try {
        sendEmail(member.email, 'تم إيقاف حسابك في وَظِيف', `
          <h2 style="text-align:center;font-size:20px;color:#d4a853;margin:0 0 16px;">إيقاف الحساب</h2>
          <p style="color:#888;font-size:15px;line-height:1.9;">مرحباً ${sanitize(member.name)},</p>
          <p style="color:#888;font-size:15px;line-height:1.9;">تم إيقاف حسابك داخل المنصة بناءً على مراجعة الإدارة.</p>
          <p style="color:#666;font-size:13px;">وَظِيف</p>
        `);
      } catch (e) {}
    }
    res.json({
      success: true,
      message: action === 'approve' ? 'تم إيقاف المندوب و إخراجه من الفريق' : 'تم رفض الطلب'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Super qualty: every submission + quality ranking (who approves / rejects the most)
app.get('/api/agent/super-qualty/overview', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && !(await isSuperQualtyRole(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const period = String(req.query.period || 'month');
    const now = new Date();
    const monthStart = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-01';
    let dateClauseApp = '';
    let dateClauseSel = '';
    const pApp = [];
    const pSel = [];
    if (period === 'month') {
      dateClauseApp = 'AND app.reviewed_at >= ?';
      dateClauseSel = 'AND COALESCE(s.hired_at, s.created_at) >= ?';
      pApp.push(monthStart);
      pSel.push(monthStart);
    } else if (period === 'all') {
      dateClauseApp = '';
      dateClauseSel = '';
    } else {
      const from = new Date(Date.now() - (parseInt(period) || 30) * 86400000);
      const fromStr = from.getFullYear() + '-' + String(from.getMonth() + 1).padStart(2, '0') + '-' + String(from.getDate()).padStart(2, '0');
      dateClauseApp = 'AND app.reviewed_at >= ?';
      dateClauseSel = 'AND COALESCE(s.hired_at, s.created_at) >= ?';
      pApp.push(fromStr);
      pSel.push(fromStr);
    }
    const qualtys = await db.prepare("SELECT id, name, email, phone, referral_code FROM agents WHERE role IN ('qualty','super_qualty') AND is_active = 1 AND IFNULL(agent_type,'normal') != 'labor' ORDER BY id").all();
    const rankings = await Promise.all(qualtys.map(async function (q) {
      const approved = (await db.prepare("SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by = ? AND app.status = 'approved' " + dateClauseApp).get(q.id, ...pApp)).c;
      const rejected = (await db.prepare("SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by = ? AND app.status = 'rejected' " + dateClauseApp).get(q.id, ...pApp)).c;
      const rerecord = (await db.prepare('SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by = ? AND app.rerecord_request = 1 ' + dateClauseApp).get(q.id, ...pApp)).c;
      const hired = (await db.prepare('SELECT COUNT(*) as c FROM selections s JOIN applications app ON s.user_id = app.user_id WHERE app.reviewed_by = ? AND s.hired = 1 ' + dateClauseSel).get(q.id, ...pSel)).c;
      const stillPending = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE assigned_qualty_id = ? AND status = 'pending'").get(q.id)).c;
      const total = approved + rejected + rerecord;
      return {
        id: q.id,
        name: q.name,
        email: q.email,
        phone: q.phone,
        referral_code: q.referral_code,
        approved: approved,
        rejected: rejected,
        rerecord: rerecord,
        hired: hired,
        pending: stillPending,
        total: total,
        approve_rate: total ? Math.round(approved / total * 100) : 0,
        reject_rate: total ? Math.round(rejected / total * 100) : 0
      };
    }));
    rankings.sort(function (a, b) {
      return b.approved - a.approved || b.hired - a.hired || b.rejected - a.rejected;
    });
    const stats = await db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN rerecord_request = 1 THEN 1 ELSE 0 END) as rerecord
      FROM applications
    `).get();
    const applications = await db.prepare(`
      SELECT a.id, a.status, a.created_at, a.reviewed_at, a.reviewed_by, a.rerecord_request, a.assigned_qualty_id,
             a.audio_file, a.audio_url,
             u.name as user_name, u.email as user_email, u.phone as user_phone, u.city as user_city,
             r.name as reviewer_name
      FROM applications a
      JOIN users u ON u.id = a.user_id
      LEFT JOIN agents r ON r.id = a.reviewed_by
      ORDER BY COALESCE(a.reviewed_at, a.created_at) DESC
      LIMIT 300
    `).all();
    res.json({
      period: period,
      stats: stats,
      rankings: rankings,
      applications: applications
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Agent login
app.post('/api/agent/login', authLimiter, async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;
    const agent = await db.prepare('SELECT * FROM agents WHERE email = ? AND is_active = 1').get(email);
    if (!agent) return res.status(400).json({
      error: 'بيانات الدخول غير صحيحة'
    });
    if (!bcrypt.compareSync(password, agent.password)) return res.status(400).json({
      error: 'بيانات الدخول غير صحيحة'
    });
    const agentRole = agent.role || 'agent';
    const token = jwt.sign({
      id: agent.id,
      name: agent.name,
      email: agent.email,
      role: agentRole,
      agent_id: agent.id,
      referral_code: agent.referral_code
    }, JWT_SECRET, {
      expiresIn: '7d'
    });
    res.json({
      token,
      agent: {
        id: agent.id,
        name: agent.name,
        email: agent.email,
        role: agentRole,
        referral_code: agent.referral_code,
        agent_type: agent.agent_type || 'normal',
        qualty_languages: agent.qualty_languages || ''
      }
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Agent dashboard stats
app.get('/api/agent/stats', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    const agentId = await getAgentId(req);
    const agentRow = await db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agentRow) return res.status(401).json({
      error: 'الجلسة غير صالحة، برجاء تسجيل الدخول مرة أخرى',
      code: 'SESSION_INVALID'
    });
    const totalReferred = (await db.prepare('SELECT COUNT(*) as c FROM users WHERE referred_by = ?').get(agentId)).c;
    const withApplication = (await db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ?
    `).get(agentId)).c;
    const hired = (await db.prepare(`
      SELECT COUNT(*) as c FROM users u
      JOIN selections s ON u.id = s.user_id
      WHERE u.referred_by = ? AND s.hired = 1
    `).get(agentId)).c;
    const pending = (await db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'pending'
    `).get(agentId)).c;
    const approved = (await db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'approved'
    `).get(agentId)).c;
    const rejected = (await db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'rejected'
    `).get(agentId)).c;

    // Earnings data (agent's own amounts only - company earnings never exposed to agents)
    const earnings = await db.prepare(`
      SELECT s.agent_amount, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE u.referred_by = ? AND s.hired = 1
      ORDER BY s.created_at DESC
    `).all(agentId);
    const totalAgentEarnings = earnings.reduce((sum, e) => sum + (e.agent_amount || 0), 0);

    // Date-based earnings
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const todayEarnings = earnings.filter(e => e.created_at >= todayStart).reduce((sum, e) => sum + (e.agent_amount || 0), 0);
    const weekEarnings = earnings.filter(e => e.created_at >= weekStart).reduce((sum, e) => sum + (e.agent_amount || 0), 0);
    const monthEarnings = earnings.filter(e => e.created_at >= monthStart).reduce((sum, e) => sum + (e.agent_amount || 0), 0);
    const todayHired = earnings.filter(e => e.created_at >= todayStart).length;
    const weekHired = earnings.filter(e => e.created_at >= weekStart).length;
    const monthHired = earnings.filter(e => e.created_at >= monthStart).length;

    // Monthly ranking position
    const rankMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const rankMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0] + ' 23:59:59';
    const allAgentsMonth = await db.prepare(`
      SELECT a.id, COALESCE(SUM(s.agent_amount), 0) as earned
      FROM agents a
      LEFT JOIN users u ON u.referred_by = a.id
      LEFT JOIN selections s ON s.user_id = u.id AND s.hired = 1 AND s.created_at >= ? AND s.created_at <= ?
      WHERE a.is_active = 1 AND IFNULL(a.agent_type,'normal') != 'labor'
      GROUP BY a.id
      ORDER BY earned DESC
    `).all(rankMonthStart, rankMonthEnd);
    const myRank = allAgentsMonth.findIndex(a => a.id === agentId) + 1;
    const totalActiveAgents = allAgentsMonth.length;
    const frozenSelections = await db.prepare(`
      SELECT s.agent_amount, s.frozen_deadline, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE u.referred_by = ? AND s.hired = 1 AND s.is_frozen = 1
      ORDER BY s.created_at DESC
    `).all(agentId);
    const frozenTotal = frozenSelections.reduce((sum, f) => sum + (f.agent_amount || 0), 0);
    const referredUsers = await db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at, u.language_level, u.language_applied,
        (SELECT language FROM applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as app_language,
        (SELECT id FROM applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as app_id,
        (SELECT status FROM applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as app_status,
        (SELECT COUNT(*) FROM selections WHERE user_id = u.id AND hired = 1) as is_hired,
        (SELECT COALESCE(SUM(agent_amount), 0) FROM selections WHERE user_id = u.id AND hired = 1) as earned_amount,
        (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON j2.application_id = a2.id WHERE a2.user_id = u.id AND j2.id NOT IN (SELECT job_id FROM selections WHERE user_id = u.id AND status = 'cancelled')) as jobs_count,
        (SELECT id FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_id,
        (SELECT status FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_status,
        (SELECT apology FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_apology,
        (SELECT is_frozen FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_frozen,
        (SELECT j2.company_name FROM selections s2 JOIN jobs j2 ON s2.job_id = j2.id WHERE s2.user_id = u.id ORDER BY s2.created_at DESC LIMIT 1) as sel_company
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).all(agentId);

    // Who this agent belongs to (his team leader) — shown on his own dashboard
    const myLeaderRow = agentRow.team_leader_id ? await db.prepare('SELECT id, name, email, phone, is_active FROM agents WHERE id = ?').get(agentRow.team_leader_id) : null;
    const myLeader = myLeaderRow ? {
      id: myLeaderRow.id,
      name: myLeaderRow.name,
      email: myLeaderRow.email,
      phone: myLeaderRow.phone,
      is_active: Number(myLeaderRow.is_active)
    } : null;
    res.json({
      totalReferred,
      withApplication,
      hired,
      pending,
      approved,
      rejected,
      referredUsers,
      earnings,
      totalAgentEarnings,
      todayEarnings,
      weekEarnings,
      monthEarnings,
      todayHired,
      weekHired,
      monthHired,
      frozenTotal,
      frozenSelections,
      myRank,
      totalActiveAgents,
      team_leader: myLeader,
      role: req.user.agent_role || agentRow.role || 'agent',
      qualty_languages: agentRow.qualty_languages || '',
      qualtyStats: (async () => {
        if (QUALTY_ROLES.indexOf(agentRow.role || 'agent') === -1) return null;
        try {
          const approved = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND status='approved'").get(agentId)).c;
          const rejected = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND status='rejected'").get(agentId)).c;
          const rerecord = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND rerecord_request=1").get(agentId)).c;
          const hired = (await db.prepare("SELECT COUNT(*) as c FROM selections s JOIN applications a ON s.user_id=a.user_id WHERE a.reviewed_by=? AND s.hired=1").get(agentId)).c;
          // pending = اللي مُرسَل ليه بالاسم + اللي لغته من اللغات المحددة ليه
          let qualtyPending = (await db.prepare("SELECT COUNT(*) as c FROM applications WHERE assigned_qualty_id=? AND status='pending'").get(agentId)).c;
          const myL = qualtyLangList(agentRow.qualty_languages);
          if (myL.length) {
            const others = await db.prepare(`
             SELECT a.language, u.language_applied FROM applications a
             LEFT JOIN users u ON a.user_id = u.id
             WHERE a.status='pending' AND IFNULL(a.assigned_qualty_id,0) != ?
           `).all(agentId);
            for (const o of others) {
              if (myL.indexOf(normLangCode(o.language || o.language_applied)) >= 0) qualtyPending++;
            }
          }
          const qualtyApproved = approved;
          const qualtyRejected = rejected;
          return {
            approved: qualtyApproved,
            rejected: qualtyRejected,
            rerecord,
            hired,
            pending: qualtyPending
          };
        } catch (e) {
          return null;
        }
      })()
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Register with referral code
function ageFromNationalId(nid) {
  const s = String(nid == null ? '' : nid).trim();
  if (!/^[0-9]{14}$/.test(s)) return null;
  const nid14 = s;
  const century = nid14[0] === '3' ? 2000 : nid14[0] === '2' ? 1900 : nid14[0] === '1' ? 1800 : 0;
  if (!century) return null;
  const yy = parseInt(nid14.slice(1, 3), 10);
  const mm = parseInt(nid14.slice(3, 5), 10);
  const dd = parseInt(nid14.slice(5, 7), 10);
  if (!(mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31)) return null;
  const year = century + yy;
  const d = new Date(Date.UTC(year, mm - 1, dd));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  const now = new Date();
  let a = now.getUTCFullYear() - year;
  const m = now.getUTCMonth() - (mm - 1);
  if (m < 0 || m === 0 && now.getUTCDate() < dd) a--;
  return a;
}
app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      ref,
      nationality,
      city,
      language_applied,
      age,
      national_id,
      college,
      education_level,
      military_status,
      call_center_experience,
      gender
    } = req.body;
    const isPassport = !!nationality && nationality !== 'egypt';
    if (!name || !email || !password || !phone || !nationality || !city || !language_applied || !age || !national_id && !isPassport || !college || !education_level || !call_center_experience || !gender) {
      return res.status(400).json({
        error: 'من فضلك أكمل كل الحقول المطلوبة'
      });
    }
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({
        error: 'من فضلك اختر النوع'
      });
    }
    const milStatus = gender === 'female' ? 'na' : military_status;
    if (gender === 'male' && !milStatus) {
      return res.status(400).json({
        error: 'من فضلك اختر الوضع العسكري'
      });
    }
    if (typeof name !== 'string' || name.length < 3 || /\d/.test(name)) {
      return res.status(400).json({
        error: 'الاسم يجب أن يحتوي على حروف فقط (3 أحرف على الأقل)'
      });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        error: 'البريد الإلكتروني غير صحيح'
      });
    }
    if (!/^[0-9]{11}$/.test(phone)) {
      return res.status(400).json({
        error: 'رقم الهاتف يجب أن يكون 11 رقم'
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
      });
    }
    // غير المصري: رقم الإقامة اختياري (لو اتكتب لازم يكون 5-20 حرف/رقم)
    if (isPassport) {
      if (national_id && !/^[A-Za-z0-9]{5,20}$/.test(String(national_id).trim())) {
        return res.status(400).json({
          error: 'رقم الإقامة لازم يكون من 5 لـ 20 حرف'
        });
      }
    } else if (!/^[0-9]{14}$/.test(String(national_id))) {
      return res.status(400).json({
        error: 'الرقم القومي يجب أن يكون 14 رقم'
      });
    }
    const nidVal = national_id ? String(national_id).trim() : '';
    const ageDerived = isPassport ? null : ageFromNationalId(national_id);
    const ageNum = ageDerived !== null ? ageDerived : parseInt(age);
    if (isNaN(ageNum)) {
      return res.status(400).json({
        error: 'العمر غير صحيح'
      });
    }
    if (ageNum < 18) {
      return res.status(400).json({
        error: 'العمل من سن 18 سنة'
      });
    }
    if (ageNum > 80) {
      return res.status(400).json({
        error: 'العمر يجب أن يكون بين 18 و 80'
      });
    }
    if (/\d/.test(nationality)) {
      return res.status(400).json({
        error: 'الجنسية يجب أن تحتوي على حروف فقط'
      });
    }
    if (/\d/.test(college)) {
      return res.status(400).json({
        error: 'الكلية يجب أن تحتوي على حروف فقط'
      });
    }
    if (/[\u0600-\u06FF]/.test(college)) {
      return res.status(400).json({
        error: 'الكلية لازم تكتب بالإنجليزي'
      });
    }
    const exists = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(400).json({
      error: 'البريد الإلكتروني مسجل بالفعل'
    });
    const hash = bcrypt.hashSync(password, 10);
    let referredBy = null;
    if (ref) {
      const agent = await db.prepare('SELECT id FROM agents WHERE referral_code = ? AND is_active = 1').get(ref);
      if (agent) referredBy = agent.id;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const tempData = JSON.stringify({
      name,
      email,
      hash,
      phone,
      referredBy,
      nationality,
      city,
      language_applied,
      ageNum,
      national_id: nidVal,
      college,
      education_level,
      military_status: milStatus,
      call_center_experience,
      gender
    });
    await db.prepare('DELETE FROM users WHERE email = ? AND email_verified = 0').run(email);
    await db.prepare('INSERT INTO users (name, email, password, phone, referred_by, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender, verification_code, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').run(name, email, hash, phone, referredBy, nationality, city, language_applied, ageNum, nidVal, college, education_level, milStatus, call_center_experience, gender, code);
    await sendEmail(email, 'كود التحقق من حسابك في وَظِيف', `
      
        
        <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#f5f0e8;">كود التحقق</h2>
        <p style="color:#888;text-align:center;font-size:14px;margin-bottom:24px;">أدخل الكود التالي لإتمام التسجيل:</p>
        <div style="text-align:center;margin-bottom:30px;">
          <span style="display:inline-block;font-size:36px;font-weight:900;color:#d4a853;letter-spacing:12px;background:rgba(212,168,83,0.08);padding:16px 32px;border-radius:14px;border:1px solid rgba(212,168,83,0.15);">${code}</span>
        </div>
        <p style="color:#555;text-align:center;font-size:12px;">هذا الكود صالح لمدة 10 دقائق فقط</p>
      
    `);
    res.json({
      needVerification: true,
      email,
      message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/verify-code', authLimiter, async (req, res) => {
  try {
    const {
      email,
      code
    } = req.body;
    if (!email || !code) return res.status(400).json({
      error: 'من فضلك أدخل الكود'
    });
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND email_verified = 0').get(email);
    if (!user) return res.status(400).json({
      error: 'الحساب غير موجود أو تم التحقق بالفعل'
    });
    if (user.verification_code !== code) return res.status(400).json({
      error: 'كود التحقق غير صحيح'
    });
    await db.prepare('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);
    try {
      await sendEmail(user.email, 'آخر خطوة: سجّل صوتك في وَظِيف', `
        <h2 style="text-align:center;font-size:20px;color:#d4a853;margin:0 0 16px;">تم إنشاء حسابك بنجاح</h2>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:12px;">مرحباً ${sanitize(user.name || '')},</p>
        <p style="color:#888;font-size:15px;line-height:1.9;margin-bottom:18px;">حسابك في <strong style="color:#d4a853;">وَظِيف</strong> بقى جاهز، بس فاضل خطوة إلزامية واحدة: <strong style="color:#d4a853;">تسجيل صوتك</strong>.</p>
        <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.2);border-radius:14px;padding:16px 18px;margin-bottom:18px;">
          <p style="color:#d4a853;font-size:14px;font-weight:700;margin:0 0 8px;">ليه التسجيل الصوتي مهم؟</p>
          <p style="color:#aaa;font-size:14px;line-height:1.9;margin:0;">الفريق بيراجع تسجيلك الصوتي عشان يقدر يحكم على مستواك ويقدملك الوظائف المناسبة. لحد ما تسجّل، حسابك مش هيقدر يتقدم لأي وظيفة.</p>
        </div>
        <p style="color:#aaa;font-size:14px;line-height:1.9;margin-bottom:22px;">التسجيل بياخد دقيقتين بس — اختار اللغة واضغط على زر الميكروفون وابدأ الكلام.</p>
        <div style="text-align:center;">
          <a href="${BASE_URL}/dashboard" style="display:inline-block;padding:14px 34px;background:linear-gradient(135deg,#d4a853,#b8860b);border-radius:12px;color:#0a0a0a;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:800;text-decoration:none;">سجّل صوتك دلوقتي</a>
        </div>
        <p style="color:#555;font-size:12px;text-align:center;margin-top:18px;">لو الرابط مش شغال: ${BASE_URL}/dashboard</p>
      `);
    } catch (e) {
      console.log('Record audio email failed:', e.message);
    }
    const token = jwt.sign({
      id: user.id,
      name: user.name,
      email: user.email,
      role: 'user'
    }, JWT_SECRET, {
      expiresIn: '7d'
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'user'
      }
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/resend-code', authLimiter, async (req, res) => {
  try {
    const {
      email
    } = req.body;
    if (!email) return res.status(400).json({
      error: 'من فضلك أدخل البريد الإلكتروني'
    });
    const user = await db.prepare('SELECT * FROM users WHERE email = ? AND email_verified = 0').get(email);
    if (!user) return res.status(400).json({
      error: 'الحساب غير موجود أو تم التحقق بالفعل'
    });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await db.prepare('UPDATE users SET verification_code = ? WHERE id = ?').run(code, user.id);
    await sendEmail(email, 'كود التحقق الجديد من حسابك في وَظِيف', `
      
        
        <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#f5f0e8;">كود التحقق الجديد</h2>
        <p style="color:#888;text-align:center;font-size:14px;margin-bottom:24px;">أدخل الكود التالي لإتمام التسجيل:</p>
        <div style="text-align:center;margin-bottom:30px;">
          <span style="display:inline-block;font-size:36px;font-weight:900;color:#d4a853;letter-spacing:12px;background:rgba(212,168,83,0.08);padding:16px 32px;border-radius:14px;border:1px solid rgba(212,168,83,0.15);">${code}</span>
        </div>
        <p style="color:#555;text-align:center;font-size:12px;">هذا الكود صالح لمدة 10 دقائق فقط</p>
      
    `);
    res.json({
      message: 'تم إرسال كود التحقق الجديد'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== QUALTY ROUTES =====
// Get pending selections for qualty to accept/reject
app.get('/api/qualty/pending-selections', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const agentId = await getAgentId(req);
    const selections = await db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
             u.referred_by, u.language_applied as user_language, ag.name as agent_name
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      WHERE a.status = 'pending' AND a.assigned_qualty_id = ?
      ORDER BY a.created_at DESC
    `).all(agentId);
    res.json(selections);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Accept/reject selection by qualty
app.post('/api/qualty/selections/:id/action', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const agentId = await getAgentId(req);
    const {
      action
    } = req.body;
    const sel = await db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id);
    if (!sel) return res.status(404).json({
      error: 'Not found'
    });
    if (action === 'accept' || action === 'approve') {
      await db.prepare("UPDATE applications SET status='approved' WHERE id=?").run(req.params.id);
    } else if (action === 'reject') {
      await db.prepare("UPDATE applications SET status='rejected' WHERE id=?").run(req.params.id);
    } else if (action === 'rerecord') {
      await db.prepare("UPDATE applications SET rerecord_request=0, audio_file=NULL, status='pending' WHERE id=?").run(req.params.id);
    } else {
      return res.status(400).json({
        error: 'Invalid action'
      });
    }
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Get companies for qualty
app.post('/api/qualty/companies', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const {
      name,
      position,
      description,
      interview_time,
      interview_schedule,
      salary_min,
      salary_max,
      company_email,
      available_slots,
      deadline,
      notify_days_before,
      salary,
      max_slots,
      education_requirement
    } = req.body;
    if (!name) return res.status(400).json({
      error: 'اسم الشركة مطلوب'
    });
    // Support both old (salary/max_slots) and new (salary_min/max etc) payloads
    const sMin = salary_min !== undefined ? salary_min : salary || 0;
    const sMax = salary_max !== undefined ? salary_max : salary || 0;
    const slots = available_slots !== undefined ? available_slots : max_slots || 0;
    const result = await db.prepare('INSERT INTO companies (name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before, education_requirement) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, position || '', description || '', interview_time || '', interview_schedule || '', sMin, sMax, company_email || '', slots, deadline || '', notify_days_before || 5, normalizeEduReq(education_requirement));
    res.json({
      id: result.lastInsertRowid,
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/qualty/companies', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const companies = await db.prepare(`
      SELECT c.*,
        IFNULL((SELECT MIN(cl.deadline) FROM company_languages cl WHERE cl.company_id = c.id AND cl.deadline IS NOT NULL AND cl.deadline != ''), '') as job_deadline,
        IFNULL((SELECT MIN(cl.notify_days) FROM company_languages cl WHERE cl.company_id = c.id AND cl.notify_days IS NOT NULL AND cl.notify_days > 0), 5) as job_notify_days
      FROM companies c ORDER BY c.created_at DESC
    `).all();
    companies.forEach(c => {
      c.deadline = c.job_deadline;
      c.notify_days_before = c.job_notify_days;
      delete c.job_deadline;
      delete c.job_notify_days;
    });
    res.json(companies);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Update company by qualty
app.put('/api/qualty/companies/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const {
      name,
      position,
      description,
      interview_time,
      interview_schedule,
      salary_min,
      salary_max,
      company_email,
      available_slots,
      deadline,
      notify_days_before,
      education_requirement
    } = req.body;
    const eduReq = education_requirement === undefined ? null : normalizeEduReq(education_requirement);
    const old = await db.prepare('SELECT name FROM companies WHERE id=?').get(req.params.id);
    await db.prepare('UPDATE jobs SET company_id = ? WHERE company_id IS NULL AND TRIM(company_name) = TRIM(?)').run(req.params.id, name);
    await db.prepare('UPDATE companies SET name=?, position=?, description=?, interview_time=?, interview_schedule=?, salary_min=?, salary_max=?, company_email=?, available_slots=?, deadline=?, notify_days_before=?, education_requirement=COALESCE(?, education_requirement) WHERE id=?').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5, eduReq, req.params.id);
    await db.prepare('UPDATE jobs SET company_name = ?, company_email = COALESCE(NULLIF(?, \'\'), company_email) WHERE company_id = ?').run(name, company_email || '', req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/qualty/companies/:id', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    await db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Qualty: get company schedule & history (same as admin)
app.get('/api/qualty/company/:id/schedule', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({
      error: 'الشركة غير موجودة'
    });
    res.json({
      company,
      ...(await buildCompanySchedule(company))
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/qualty/companies/:id/restart', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({
      error: 'Not found'
    });
    const newDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    await db.prepare('UPDATE companies SET pending_count=0, hired_count=0, used_slots=0, deadline=? WHERE id=?').run(newDeadline, req.params.id);
    await db.prepare("UPDATE company_languages SET deadline=? WHERE company_id=?").run(newDeadline, req.params.id);
    await db.prepare('DELETE FROM admin_notifications WHERE company_id=?').run(req.params.id);
    res.json({
      success: true
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/qualty/check-deadlines', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const jobs = await db.prepare(`
      SELECT c.id as company_id, c.name as company_name, c.available_slots, c.hired_count,
        cl.id as job_id, cl.position, cl.deadline, cl.notify_days
      FROM companies c JOIN company_languages cl ON cl.company_id=c.id
      WHERE cl.deadline IS NOT NULL AND cl.deadline != ''`).all();
    let alertsFound = 0,
      alerts = [];
    for (const j of jobs) {
      if (!j.deadline) continue;
      const diffDays = Math.ceil((new Date(j.deadline + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24));
      const needed = (j.available_slots || 0) - (j.hired_count || 0);
      const notifyDays = j.notify_days || 5;
      if (diffDays <= notifyDays && diffDays >= 0 && needed > 0) {
        const exists = await db.prepare("SELECT id FROM admin_notifications WHERE company_id=? AND (job_id=? OR job_id IS NULL) AND status IN ('pending','accepted')").get(j.company_id, j.job_id);
        if (!exists) {
          await db.prepare('INSERT INTO admin_notifications (company_id,type,message,status,job_id) VALUES (?,?,?,?,?)').run(j.company_id, 'deadline_alert', `الشركة ${j.company_name} تنتهي خلال ${diffDays} يوم`, 'pending', j.job_id);
          alertsFound++;
          alerts.push({
            company: j.company_name,
            position: j.position,
            days: diffDays,
            needed
          });
        }
      }
    }
    res.json({
      alertsFound,
      alerts
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/qualty/pending-notifications', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const notifs = await db.prepare(`
      SELECT n.*, c.name as company_name, c.available_slots, c.hired_count,
        IFNULL((SELECT MIN(cl.deadline) FROM company_languages cl WHERE cl.company_id=c.id AND cl.deadline IS NOT NULL AND cl.deadline!=''), '') as deadline,
        IFNULL((SELECT MIN(cl.notify_days) FROM company_languages cl WHERE cl.company_id=c.id AND cl.notify_days IS NOT NULL AND cl.notify_days>0), 5) as notify_days_before
      FROM admin_notifications n JOIN companies c ON n.company_id=c.id WHERE n.status='pending' ORDER BY n.created_at DESC`).all();
    res.json(await attachNotificationJobs(notifs));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/qualty/pending-notifications/:id/accept', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const notif = await db.prepare('SELECT * FROM admin_notifications WHERE id=?').get(req.params.id);
    if (!notif) return res.status(404).json({
      error: 'Not found'
    });
    await db.prepare("UPDATE admin_notifications SET status='accepted' WHERE id=?").run(req.params.id);
    const company = await db.prepare('SELECT * FROM companies WHERE id=?').get(notif.company_id);
    const needed = (company.available_slots || 0) - (company.hired_count || 0);
    const agents = await db.prepare("SELECT id FROM agents WHERE is_active=1 AND IFNULL(agent_type,'normal') != 'labor'").all();
    for (const a of agents) {
      await db.prepare('INSERT INTO notifications (agent_id,type,title,message) VALUES (?,?,?,?)').run(a.id, 'deadline', `شركة ${company.name} تريد الإسراع`, `هناك شركة تريد الإسراع في عملية التوظيف (${company.name}) - مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.`);
    }
    res.json({
      message: `تم قبول الإشعار وإرسال تنبيه لـ ${agents.length} مندوب`
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/qualty/pending-notifications/:id/reject', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    await db.prepare("UPDATE admin_notifications SET status='rejected' WHERE id=?").run(req.params.id);
    res.json({
      message: 'تم رفض الإشعار'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/qualty/agents', authMiddleware, async (req, res) => {
  try {
    if (!(await isAgentUser(req))) return res.status(403).json({
      error: 'Forbidden'
    });
    if (!(await isQualtyRole(req))) return res.status(403).json({
      error: 'Not qualty'
    });
    const agents = await db.prepare("SELECT id, name, referral_code FROM agents WHERE IFNULL(agent_type,'normal') != 'labor' ORDER BY created_at DESC").all();
    res.json(agents);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ===== LABOR (مندوبين العمالة) ROUTES =====
async function laborAgentIdOf(req) {
  var id = await getAgentId(req);
  if (!id) return null;
  var row = await db.prepare("SELECT id FROM agents WHERE id = ? AND IFNULL(agent_type,'normal') = 'labor' AND is_active = 1").get(id);
  return row ? row.id : null;
}
async function laborAgentMiddleware(req, res, next) {
  var id = await laborAgentIdOf(req);
  if (!id) return res.status(403).json({
    error: 'ليس مندوب عمالة'
  });
  req.laborAgentId = id;
  next();
}
function laborSummaryOf(rows) {
  var total = 0,
    working = 0,
    monthly = 0,
    agentMonthly = 0,
    agentPending = 0;
  for (var i = 0; i < rows.length; i++) {
    total++;
    var st = String(rows[i].status || '');
    var cut = Number(rows[i].labor_agent_amount || 0);
    if (st === 'working') {
      working++;
      monthly += Number(rows[i].earning_per_month || 0);
      agentMonthly += cut;
    } else if (st === 'pending') {
      agentPending += cut;
    }
  }
  return {
    total: total,
    working: working,
    monthly: monthly,
    agent_monthly: agentMonthly,
    agent_pending: agentPending,
    agent_total: agentMonthly + agentPending
  };
}
var LABOR_WORKER_SQL = "SELECT w.*, c.name as company_name, g.name as group_name FROM labor_workers w LEFT JOIN companies c ON c.id = w.company_id LEFT JOIN labor_groups g ON g.id = w.group_id ORDER BY w.created_at DESC, w.id DESC";
var LABOR_GROUP_SQL = "SELECT g.*, c.name as company_name, (SELECT COUNT(*) FROM labor_workers w WHERE w.group_id = g.id) as member_count, (SELECT COUNT(*) FROM labor_workers w WHERE w.group_id = g.id AND w.status = 'working') as working_count, (SELECT COUNT(*) FROM labor_workers w WHERE w.group_id = g.id AND w.status = 'pending') as pending_count FROM labor_groups g LEFT JOIN companies c ON c.id = g.company_id ORDER BY g.created_at DESC, g.id DESC";
async function laborCompanyCheck(company_id) {
  var cid = parseInt(company_id, 10) || 0;
  if (!cid) return {
    error: 'اختر الشركة'
  };
  var co = await db.prepare('SELECT id, type FROM companies WHERE id = ?').get(cid);
  if (!co) return {
    error: 'الشركة غير موجودة'
  };
  if (co.type !== 'labor') return {
    error: 'يجب اختيار شركة من نوع (شركات العمال)'
  };
  return {
    id: cid
  };
}
function laborWorkerCheck(b) {
  var full_name = String(b && b.full_name || '').replace(/\s+/g, ' ').trim();
  if (!full_name) return {
    error: 'الاسم رباعي مطلوب'
  };
  if (full_name.split(' ').length < 3) return {
    error: 'اكتب الاسم رباعي (3 كلمات على الأقل)'
  };
  var age = parseInt(b && b.age, 10);
  if (isNaN(age) || age < 14 || age > 80) return {
    error: 'العمر غير صالح (من 14 إلى 80)'
  };
  return {
    data: {
      full_name: full_name,
      age: age
    }
  };
}
async function laborGroupOwned(groupId, laborAgentId) {
  if (!groupId) return true;
  var g = await db.prepare('SELECT id, labor_agent_id FROM labor_groups WHERE id = ?').get(groupId);
  if (!g) return false;
  if (laborAgentId && g.labor_agent_id !== laborAgentId) return false;
  return true;
}
async function laborWorkerOwned(workerId, laborAgentId) {
  var w = await db.prepare('SELECT id, labor_agent_id FROM labor_workers WHERE id = ?').get(workerId);
  if (!w) return null;
  if (laborAgentId && w.labor_agent_id !== laborAgentId) return null;
  return w;
}

// Admin confirms a labor company's approval request -> worker becomes approved
// (and, when he is still (pending) inside the company, the employment is confirmed too).
async function confirmCompanyApproval(workerId) {
  var wid = parseInt(workerId, 10) || 0;
  var w = wid ? await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(wid) : null;
  if (!w) return {
    error: 'الشخص غير موجود'
  };
  var ap = String(w.company_approval || '');
  if (ap === 'confirmed') return {
    success: true,
    message: 'موافقة الشركة مُؤكدة بالفعل على "' + w.full_name + '"'
  };
  if (ap !== 'requested') return {
    error: 'لا يوجد طلب موافقة من الشركة على هذا الشخص'
  };
  await db.prepare("UPDATE labor_workers SET company_approval = 'confirmed' WHERE id = ?").run(w.id);
  // whatever confirmed it (row button / notification card) -> close the matching pending notification
  try {
    await db.prepare("UPDATE admin_notifications SET status = 'accepted' WHERE type = 'labor_worker_approval' AND worker_id = ? AND status = 'pending'").run(w.id);
  } catch (e) {}
  var msg = 'تم تأكيد موافقة الشركة على "' + w.full_name + '"';
  if (w.status === 'pending') {
    await db.prepare("UPDATE labor_workers SET status = 'working', working_at = ? WHERE id = ?").run(new Date().toISOString(), w.id);
    msg += ' وتأكيد التوظيف';
  }
  return {
    success: true,
    message: msg,
    worker_id: w.id
  };
}

// ---------- ADMIN: overview ----------
app.get('/api/admin/labor/overview', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    var agents = await db.prepare("SELECT id, name, email, phone, referral_code, is_active, role, created_at, payment_method, payment_operator, agent_type FROM agents WHERE IFNULL(agent_type,'normal') = 'labor' ORDER BY created_at DESC").all();
    var groups = await db.prepare(LABOR_GROUP_SQL).all();
    var workers = await db.prepare(LABOR_WORKER_SQL).all();
    var companies = await db.prepare("SELECT id, name FROM companies WHERE type = 'labor' ORDER BY name").all();
    res.json({
      agents: agents,
      groups: groups,
      workers: workers,
      companies: companies,
      summary: laborSummaryOf(workers)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ---------- ADMIN: groups ----------
app.post('/api/admin/labor/groups', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({
      error: 'اسم المجموعة مطلوب'
    });
    var labor_agent_id = parseInt(req.body.labor_agent_id, 10) || 0;
    if (!labor_agent_id) return res.status(400).json({
      error: 'اختر مندوب العمالة'
    });
    var ag = await db.prepare("SELECT id FROM agents WHERE id = ? AND IFNULL(agent_type,'normal') = 'labor'").get(labor_agent_id);
    if (!ag) return res.status(400).json({
      error: 'مندوب العمالة غير موجود'
    });
    var r = await db.prepare('INSERT INTO labor_groups (labor_agent_id, name, city) VALUES (?, ?, ?)').run(labor_agent_id, name, String(req.body.city || '').trim());
    res.json({
      id: r.lastInsertRowid,
      success: true,
      message: 'تمت إضافة المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/labor/groups/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var g = await db.prepare('SELECT * FROM labor_groups WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    var name = String(req.body.name === undefined ? g.name : req.body.name).trim();
    if (!name) return res.status(400).json({
      error: 'اسم المجموعة مطلوب'
    });
    var labor_agent_id = req.body.labor_agent_id === undefined ? g.labor_agent_id : parseInt(req.body.labor_agent_id, 10) || 0;
    if (labor_agent_id) {
      var ag = await db.prepare("SELECT id FROM agents WHERE id = ? AND IFNULL(agent_type,'normal') = 'labor'").get(labor_agent_id);
      if (!ag) return res.status(400).json({
        error: 'مندوب العمالة غير موجود'
      });
    }
    var city = req.body.city === undefined ? g.city : String(req.body.city || '').trim();
    await db.prepare('UPDATE labor_groups SET name = ?, city = ?, labor_agent_id = ? WHERE id = ?').run(name, city, labor_agent_id, g.id);
    res.json({
      success: true,
      message: 'تم تحديث المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/admin/labor/groups/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var g = await db.prepare('SELECT id FROM labor_groups WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    await db.prepare('UPDATE labor_workers SET group_id = NULL WHERE group_id = ?').run(g.id);
    await db.prepare('DELETE FROM labor_groups WHERE id = ?').run(g.id);
    res.json({
      success: true,
      message: 'تم حذف المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/labor/groups/:id/close', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var g = await db.prepare('SELECT * FROM labor_groups WHERE id = ?').get(req.params.id);
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    var on = parseInt(req.body.is_working, 10) === 1 ? 1 : 0;
    if (!on) {
      await db.prepare('UPDATE labor_groups SET is_working = 0 WHERE id = ?').run(g.id);
      return res.json({
        success: true,
        message: 'تم فتح المجموعة'
      });
    }
    var company_id = null,
      earning = Number(g.earning_per_month || 0),
      agentCut = Number(g.labor_agent_amount || 0),
      position = String(g.position || '').trim();
    if (req.body.apply_to_all) {
      var ck = await laborCompanyCheck(req.body.company_id);
      if (ck.error) return res.status(400).json({
        error: ck.error
      });
      company_id = ck.id;
      earning = parseFloat(req.body.earning_per_month);
      if (isNaN(earning) || earning < 0) earning = 0;
      if (req.body.labor_agent_amount !== undefined && req.body.labor_agent_amount !== null && String(req.body.labor_agent_amount) !== '') {
        agentCut = parseFloat(req.body.labor_agent_amount);
        if (isNaN(agentCut) || agentCut < 0) agentCut = 0;
      }
      if (req.body.position !== undefined) position = String(req.body.position || '').trim();
    }
    await db.prepare('UPDATE labor_groups SET is_working = 1, company_id = COALESCE(?, company_id), earning_per_month = ?, labor_agent_amount = ?, position = ?, working_at = ? WHERE id = ?').run(company_id, earning, agentCut, position, new Date().toISOString(), g.id);
    if (req.body.apply_to_all && company_id) {
      var pendIds = (await db.prepare("SELECT id FROM labor_workers WHERE group_id = ? AND status != 'working'").all(g.id)).map(function (r) {
        return r.id;
      });
      await db.prepare("UPDATE labor_workers SET status = 'pending', company_id = ?, earning_per_month = ?, labor_agent_amount = ?, position = ?, working_at = NULL WHERE group_id = ? AND status != 'working'").run(company_id, earning, agentCut, position, g.id);
      try {
        var gco = await db.prepare('SELECT name FROM companies WHERE id = ?').get(company_id);
        var grows = pendIds.length ? await db.prepare('SELECT full_name, age, city, phone FROM labor_workers WHERE id IN (' + pendIds.map(function () {
          return '?';
        }).join(',') + ')').all(pendIds) : [];
        laborGroupAddedEmail(gco ? gco.name : '', await laborCompanyEmail(company_id), grows, g.name, earning);
      } catch (e) {
        console.log('labor-group-mail error:', e.message);
      }
    }
    res.json({
      success: true,
      message: 'تمت إضافة عمال المجموعة للشركة — بانتظار تأكيد التوظيف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ---------- ADMIN: workers ----------
app.get('/api/admin/labor/workers', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    var rows = await db.prepare(LABOR_WORKER_SQL).all();
    res.json({
      workers: rows,
      summary: laborSummaryOf(rows)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/labor/workers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var chk = laborWorkerCheck(req.body);
    if (chk.error) return res.status(400).json({
      error: chk.error
    });
    var labor_agent_id = parseInt(req.body.labor_agent_id, 10) || 0;
    if (!labor_agent_id) return res.status(400).json({
      error: 'اختر مندوب العمالة'
    });
    var ag = await db.prepare("SELECT id FROM agents WHERE id = ? AND IFNULL(agent_type,'normal') = 'labor'").get(labor_agent_id);
    if (!ag) return res.status(400).json({
      error: 'مندوب العمالة غير موجود'
    });
    var group_id = parseInt(req.body.group_id, 10) || 0;
    if (group_id && !(await laborGroupOwned(group_id, null))) return res.status(400).json({
      error: 'المجموعة غير موجودة'
    });
    var r = await db.prepare('INSERT INTO labor_workers (labor_agent_id, group_id, full_name, age, phone, national_id, city, address, id_card_front, id_card_back, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(labor_agent_id, group_id || null, chk.data.full_name, chk.data.age, String(req.body.phone || '').trim(), String(req.body.national_id || '').trim(), String(req.body.city || '').trim(), String(req.body.address || '').trim(), String(req.body.id_card_front || '').trim(), String(req.body.id_card_back || '').trim(), String(req.body.notes || '').trim());
    res.json({
      id: r.lastInsertRowid,
      success: true,
      message: 'تمت إضافة الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/admin/labor/workers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    var chk = laborWorkerCheck({
      full_name: req.body.full_name === undefined ? w.full_name : req.body.full_name,
      age: req.body.age === undefined ? w.age : req.body.age
    });
    if (chk.error) return res.status(400).json({
      error: chk.error
    });
    var labor_agent_id = req.body.labor_agent_id === undefined ? w.labor_agent_id : parseInt(req.body.labor_agent_id, 10) || 0;
    if (labor_agent_id) {
      var ag = await db.prepare("SELECT id FROM agents WHERE id = ? AND IFNULL(agent_type,'normal') = 'labor'").get(labor_agent_id);
      if (!ag) return res.status(400).json({
        error: 'مندوب العمالة غير موجود'
      });
    }
    var group_id = req.body.group_id === undefined ? w.group_id || 0 : parseInt(req.body.group_id, 10) || 0;
    if (group_id && !(await laborGroupOwned(group_id, null))) return res.status(400).json({
      error: 'المجموعة غير موجودة'
    });
    await db.prepare('UPDATE labor_workers SET labor_agent_id = ?, group_id = ?, full_name = ?, age = ?, phone = ?, national_id = ?, city = ?, address = ?, id_card_front = ?, id_card_back = ?, notes = ? WHERE id = ?').run(labor_agent_id, group_id || null, chk.data.full_name, chk.data.age, req.body.phone === undefined ? w.phone : String(req.body.phone || '').trim(), req.body.national_id === undefined ? w.national_id : String(req.body.national_id || '').trim(), req.body.city === undefined ? w.city : String(req.body.city || '').trim(), req.body.address === undefined ? w.address : String(req.body.address || '').trim(), req.body.id_card_front === undefined ? w.id_card_front : String(req.body.id_card_front || '').trim(), req.body.id_card_back === undefined ? w.id_card_back : String(req.body.id_card_back || '').trim(), req.body.notes === undefined ? w.notes : String(req.body.notes || '').trim(), w.id);
    res.json({
      success: true,
      message: 'تم تحديث بيانات الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/admin/labor/workers/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT id FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    await db.prepare('DELETE FROM labor_workers WHERE id = ?').run(w.id);
    res.json({
      success: true,
      message: 'تم حذف الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin-only: close (employ) a worker -> pick labor company + fixed monthly earning
function _validMail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim());
}
async function laborCompanyEmail(companyId) {
  var cand = [];
  try {
    cand = (await db.prepare('SELECT email FROM company_users WHERE company_id = ? ORDER BY id ASC').all(companyId)).map(function (r) {
      return r.email;
    });
  } catch (e) {}
  try {
    var c = await db.prepare('SELECT company_email FROM companies WHERE id = ?').get(companyId);
    if (c) cand.push(c.company_email);
  } catch (e) {}
  for (var i = 0; i < cand.length; i++) {
    if (_validMail(cand[i])) return String(cand[i]).trim();
  }
  return '';
}
function _cardImg(f, cidTag) {
  try {
    if (!f) return null;
    var pth = path.join(uploadsDir, f);
    if (!fs.existsSync(pth)) return null;
    var ext = (String(f).split('.').pop() || 'jpg').toLowerCase();
    var mt = ext === 'png' ? 'png' : ext === 'webp' ? 'webp' : 'jpeg';
    return {
      filename: String(f).replace(/[^A-Za-z0-9._-]/g, '_'),
      contentType: 'image/' + mt,
      cid: cidTag,
      content: fs.readFileSync(pth)
    };
  } catch (e) {
    return null;
  }
}
function laborAddedEmail(w, coName, email) {
  if (!email) {
    console.log('labor-add-mail: skipped, no valid company email (worker', w && w.id, ')');
    return;
  }
  var frontAtt = _cardImg(w.id_card_front, 'idfront');
  var backAtt = _cardImg(w.id_card_back, 'idback');
  var noimg = '<div style="height:170px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;background:#f3f4f6;border-radius:8px">لا توجد صورة</div>';
  var front = frontAtt ? '<img src="cid:idfront" alt="وش البطاقة" style="width:100%;max-width:260px;border-radius:10px;border:1px solid #e5e7eb;display:block">' : noimg;
  var back = backAtt ? '<img src="cid:idback" alt="ظهر البطاقة" style="width:100%;max-width:260px;border-radius:10px;border:1px solid #e5e7eb;display:block">' : noimg;
  function row(k, v) {
    return '<tr><td style="padding:6px 0;color:#6b7280;white-space:nowrap">' + k + '</td><td style="padding:6px 0;font-weight:600">' + (v === 0 || v ? v : '-') + '</td></tr>';
  }
  var html = `
  <div style="font-family:Tajawal,Arial,sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#d4a853,#b8860b);padding:22px 26px;">
        <div style="color:#0a0a0a;font-size:24px;font-weight:800;">وَظِيف</div>
        <div style="color:#0a0a0a;font-size:14px;margin-top:4px;">تمت إضافة عامل جديد لشركتك</div>
      </div>
      <div style="padding:24px 26px;color:#111827;font-size:15px;line-height:2">
        <p style="margin:0 0 14px;">مرحبًا <b>${coName || ''}</b>،</p>
        <p style="margin:0 0 14px;">تمت إضافة العامل التالي إلى شركتك وهو الآن <b style="color:#0284c7">منتظر تأكيد التوظيف</b>:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${row('الاسم رباعي', w.full_name)}
          ${row('السن', w.age)}
          ${row('الرقم القومي', w.national_id)}
          ${row('رقم الموبايل', w.phone)}
          ${row('المدينة', w.city)}
          ${row('العنوان', w.address)}
          ${row('المجموعة', w.group_name)}
          ${row('مندوب العمالة', w.labor_agent_name)}
          ${row('الربح الشهري', Number(w.earning_per_month || 0).toLocaleString('en-US') + ' ج.م')}
          ${row('تاريخ الإضافة', w.created_at ? String(w.created_at).replace('T', ' ').slice(0, 16) : '')}
          ${row('ملاحظات', w.notes)}
        </table>
        <div style="margin-top:16px">
          <div style="font-size:13px;color:#6b7280;font-weight:700;margin-bottom:6px">صورة البطاقة الشخصية</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div>${front}<div style="font-size:12px;color:#6b7280;text-align:center;margin-top:4px">الوجه الأمامي</div></div>
            <div>${back}<div style="font-size:12px;color:#6b7280;text-align:center;margin-top:4px">ظهر البطاقة</div></div>
          </div>
        </div>
        <p style="margin:18px 0 0;font-size:13px;color:#6b7280">افتح لوحة تحكم شركتك واضغط <b>تأكيد التوظيف</b> لبدء احتساب ربحه الشهري.</p>
      </div>
      <div style="background:#f9fafb;padding:14px 26px;color:#9ca3af;font-size:12px">وَظِيف — Wazeef</div>
    </div>
  </div>`;
  var atts = [];
  if (frontAtt) atts.push(frontAtt);
  if (backAtt) atts.push(backAtt);
  sendEmail(email, 'تمت إضافة عامل لشركتك - وَظِيف', html, atts).catch(function (e) {
    console.log('labor-add-mail failed:', e && e.message || e);
  });
}
function laborGroupAddedEmail(coName, email, rows, groupName, earning) {
  if (!email || !rows || !rows.length) return;
  var items = rows.map(function (w) {
    return '<tr><td style="padding:5px 0;border-bottom:1px solid #eee">' + w.full_name + '</td><td style="padding:5px 0;border-bottom:1px solid #eee">' + (w.age || '-') + '</td><td style="padding:5px 0;border-bottom:1px solid #eee">' + (w.city || '-') + '</td><td style="padding:5px 0;border-bottom:1px solid #eee">' + (w.phone || '-') + '</td></tr>';
  }).join('');
  var html = `
  <div style="font-family:Tajawal,Arial,sans-serif;background:#f6f7fb;padding:24px;">
    <div style="max-width:560px;margin:auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="background:linear-gradient(135deg,#d4a853,#b8860b);padding:22px 26px;">
        <div style="color:#0a0a0a;font-size:24px;font-weight:800;">وَظِيف</div>
        <div style="color:#0a0a0a;font-size:14px;margin-top:4px;">تمت إضافة ${rows.length} عامل لشركتك</div>
      </div>
      <div style="padding:24px 26px;color:#111827;font-size:15px;line-height:2">
        <p style="margin:0 0 12px;">مرحبًا <b>${coName || ''}</b>،</p>
        <p style="margin:0 0 12px;">تمت إضافة عمال المجموعة <b>${groupName || ''}</b> إلى شركتك (ربح الشهر: <b>${Number(earning || 0).toLocaleString('en-US')} ج.م</b>) وكلهم الآن <b style="color:#0284c7">منتظر تأكيد التوظيف</b>:</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="background:#f9fafb"><td style="padding:6px;font-weight:700">الاسم</td><td style="padding:6px;font-weight:700">السن</td><td style="padding:6px;font-weight:700">المدينة</td><td style="padding:6px;font-weight:700">الموبايل</td></tr>
          ${items}
        </table>
        <p style="margin:18px 0 0;font-size:13px;color:#6b7280">افتح لوحة تحكم شركتك واضغط <b>تأكيد التوظيف</b> لكل عامل ترغب في بدء عمله.</p>
      </div>
      <div style="background:#f9fafb;padding:14px 26px;color:#9ca3af;font-size:12px">وَظِيف — Wazeef</div>
    </div>
  </div>`;
  sendEmail(email, 'تمت إضافة ' + rows.length + ' عامل لشركتك - وَظِيف', html).catch(function (e) {
    console.log('labor-group-mail failed:', e && e.message || e);
  });
}
app.post('/api/admin/labor/workers/:id/close', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    var ck = await laborCompanyCheck(req.body.company_id);
    if (ck.error) return res.status(400).json({
      error: ck.error
    });
    var earning = parseFloat(req.body.earning_per_month);
    if (isNaN(earning) || earning < 0) earning = 0;
    var agentCut = parseFloat(req.body.labor_agent_amount);
    if (isNaN(agentCut) || agentCut < 0) agentCut = 0;
    var position = String(req.body.position || '').trim();
    await db.prepare("UPDATE labor_workers SET status = 'pending', company_id = ?, earning_per_month = ?, labor_agent_amount = ?, position = ?, working_at = NULL WHERE id = ?").run(ck.id, earning, agentCut, position, w.id);
    try {
      var coRow = await db.prepare('SELECT name FROM companies WHERE id = ?').get(ck.id);
      var mail = await laborCompanyEmail(ck.id);
      laborAddedEmail(w, coRow ? coRow.name : '', mail);
    } catch (e) {
      console.log('labor-add-mail error:', e.message);
    }
    res.json({
      success: true,
      message: 'تمت الإضافة للشركة ووصل إشعار لبريد الشركة — بانتظار تأكيد التوظيف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Labor agent commission — belongs to the labor agent only (never part of
// company earnings or normal agent commissions in the finance totals).
app.post('/api/admin/labor/workers/:id/agent-cut', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT id, status FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    if (w.status !== 'pending' && w.status !== 'working') return res.status(400).json({
      error: 'أضِف الشخص للشركة أولًا'
    });
    var v = parseFloat(req.body.labor_agent_amount);
    if (isNaN(v) || v < 0) return res.status(400).json({
      error: 'أدخل مبلغ صحيح (0 أو أكثر)'
    });
    await db.prepare('UPDATE labor_workers SET labor_agent_amount = ? WHERE id = ?').run(v, w.id);
    res.json({
      success: true,
      message: 'تم تحديث ربح مندوب العمالة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/labor/workers/:id/confirm', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    if (!w.company_id) return res.status(400).json({
      error: 'أضف الشخص للشركة أولاً'
    });
    await db.prepare("UPDATE labor_workers SET status = 'working', working_at = ? WHERE id = ?").run(new Date().toISOString(), w.id);
    res.json({
      success: true,
      message: 'تم تأكيد التوظيف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/admin/labor/workers/:id/reopen', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT id FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    await db.prepare("UPDATE labor_workers SET status = 'new', company_id = NULL, earning_per_month = 0, labor_agent_amount = 0, position = '', working_at = NULL WHERE id = ?").run(w.id);
    res.json({
      success: true,
      message: 'تم رجوع الحالة إلى (جديد)'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin confirms the company's approval request on a labor worker
app.post('/api/admin/labor/workers/:id/approve-company', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    var r = await confirmCompanyApproval(req.params.id);
    if (r.error) return res.status(400).json({
      error: r.error
    });
    res.json(r);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ---------- SHARED: image upload (id cards) ----------
var laborImageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, {
      recursive: true
    });
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    var ext = '.jpg';
    if (file.mimetype === 'image/png') ext = '.png';else if (file.mimetype === 'image/webp') ext = '.webp';else if (file.mimetype === 'image/gif') ext = '.gif';
    cb(null, Date.now() + '-' + Math.random().toString(36).slice(2, 10) + ext);
  }
});
var laborImageUpload = multer({
  storage: laborImageStorage,
  limits: {
    fileSize: 4 * 1024 * 1024,
    files: 1
  },
  fileFilter: function (req, file, cb) {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) return cb(null, true);
    cb(new Error('ONLY_IMAGES_ALLOWED'));
  }
});
app.post('/api/labor/upload', authMiddleware, async (req, res) => {
  var allowed = false;
  if (req.user && req.user.role === 'admin') allowed = true;
  if (!allowed && req.user && req.user.agent_id) allowed = !!(await laborAgentIdOf(req));
  if (!allowed) return res.status(403).json({
    error: 'Forbidden'
  });
  laborImageUpload.single('image')(req, res, function (err) {
    if (err) return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'حجم الصورة أكبر من 4MB' : 'ارفع صورة فقط (jpg/png/webp)'
    });
    if (!req.file) return res.status(400).json({
      error: 'لم يتم رفع أي صورة'
    });
    res.json({
      file: req.file.filename
    });
  });
});

// ---------- LABOR AGENT (own scope) ----------
app.get('/api/labor/dashboard', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var id = req.laborAgentId;
    var rows = await db.prepare('SELECT * FROM labor_workers WHERE labor_agent_id = ?').all(id);
    var groups = (await db.prepare('SELECT COUNT(*) as c FROM labor_groups WHERE labor_agent_id = ?').get(id)).c;
    var s = laborSummaryOf(rows);
    res.json({
      total: s.total,
      working: s.working,
      monthly: s.monthly,
      agent_monthly: s.agent_monthly,
      agent_pending: s.agent_pending,
      groups: groups,
      companies: await db.prepare("SELECT id, name FROM companies WHERE type = 'labor' ORDER BY name").all()
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/labor/my/groups', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    res.json((await db.prepare(LABOR_GROUP_SQL + ' LIMIT 1000').all()).filter(function (g) {
      return g.labor_agent_id === req.laborAgentId;
    }));
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/labor/my/groups', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var name = String(req.body.name || '').trim();
    if (!name) return res.status(400).json({
      error: 'اسم المجموعة مطلوب'
    });
    var r = await db.prepare('INSERT INTO labor_groups (labor_agent_id, name, city) VALUES (?, ?, ?)').run(req.laborAgentId, name, String(req.body.city || '').trim());
    res.json({
      id: r.lastInsertRowid,
      success: true,
      message: 'تمت إضافة المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/labor/my/groups/:id', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var g = (await laborGroupOwned(parseInt(req.params.id, 10), req.laborAgentId)) ? await db.prepare('SELECT * FROM labor_groups WHERE id = ? AND labor_agent_id = ?').get(req.params.id, req.laborAgentId) : null;
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    var name = String(req.body.name === undefined ? g.name : req.body.name).trim();
    if (!name) return res.status(400).json({
      error: 'اسم المجموعة مطلوب'
    });
    var city = req.body.city === undefined ? g.city : String(req.body.city || '').trim();
    await db.prepare('UPDATE labor_groups SET name = ?, city = ? WHERE id = ?').run(name, city, g.id);
    res.json({
      success: true,
      message: 'تم تحديث المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/labor/my/groups/:id/toggle', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var g = await db.prepare('SELECT * FROM labor_groups WHERE id = ? AND labor_agent_id = ?').get(req.params.id, req.laborAgentId);
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    var on = g.is_working ? 0 : 1;
    await db.prepare('UPDATE labor_groups SET is_working = ?, working_at = ? WHERE id = ?').run(on, on ? new Date().toISOString() : null, g.id);
    res.json({
      success: true,
      is_working: on,
      message: on ? 'تم إغلاق المجموعة (شغالة)' : 'تم فتح المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/labor/my/groups/:id', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var g = await db.prepare('SELECT id FROM labor_groups WHERE id = ? AND labor_agent_id = ?').get(req.params.id, req.laborAgentId);
    if (!g) return res.status(404).json({
      error: 'المجموعة غير موجودة'
    });
    await db.prepare('UPDATE labor_workers SET group_id = NULL WHERE group_id = ?').run(g.id);
    await db.prepare('DELETE FROM labor_groups WHERE id = ?').run(g.id);
    res.json({
      success: true,
      message: 'تم حذف المجموعة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/labor/my/workers', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var rows = (await db.prepare(LABOR_WORKER_SQL + ' LIMIT 1000').all()).filter(function (w) {
      return w.labor_agent_id === req.laborAgentId;
    });
    res.json({
      workers: rows,
      summary: laborSummaryOf(rows)
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.post('/api/labor/my/workers', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var chk = laborWorkerCheck(req.body);
    if (chk.error) return res.status(400).json({
      error: chk.error
    });
    var group_id = parseInt(req.body.group_id, 10) || 0;
    if (group_id && !(await laborGroupOwned(group_id, req.laborAgentId))) return res.status(400).json({
      error: 'المجموعة غير موجودة'
    });
    var r = await db.prepare('INSERT INTO labor_workers (labor_agent_id, group_id, full_name, age, phone, national_id, city, address, id_card_front, id_card_back, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(req.laborAgentId, group_id || null, chk.data.full_name, chk.data.age, String(req.body.phone || '').trim(), String(req.body.national_id || '').trim(), String(req.body.city || '').trim(), String(req.body.address || '').trim(), String(req.body.id_card_front || '').trim(), String(req.body.id_card_back || '').trim(), String(req.body.notes || '').trim());
    res.json({
      id: r.lastInsertRowid,
      success: true,
      message: 'تمت إضافة الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.put('/api/labor/my/workers/:id', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var w = await laborWorkerOwned(parseInt(req.params.id, 10), req.laborAgentId);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    var cur = await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(w.id);
    var chk = laborWorkerCheck({
      full_name: req.body.full_name === undefined ? cur.full_name : req.body.full_name,
      age: req.body.age === undefined ? cur.age : req.body.age
    });
    if (chk.error) return res.status(400).json({
      error: chk.error
    });
    var group_id = req.body.group_id === undefined ? cur.group_id || 0 : parseInt(req.body.group_id, 10) || 0;
    if (group_id && !(await laborGroupOwned(group_id, req.laborAgentId))) return res.status(400).json({
      error: 'المجموعة غير موجودة'
    });
    await db.prepare('UPDATE labor_workers SET group_id = ?, full_name = ?, age = ?, phone = ?, national_id = ?, city = ?, address = ?, id_card_front = ?, id_card_back = ?, notes = ? WHERE id = ?').run(group_id || null, chk.data.full_name, chk.data.age, req.body.phone === undefined ? cur.phone : String(req.body.phone || '').trim(), req.body.national_id === undefined ? cur.national_id : String(req.body.national_id || '').trim(), req.body.city === undefined ? cur.city : String(req.body.city || '').trim(), req.body.address === undefined ? cur.address : String(req.body.address || '').trim(), req.body.id_card_front === undefined ? cur.id_card_front : String(req.body.id_card_front || '').trim(), req.body.id_card_back === undefined ? cur.id_card_back : String(req.body.id_card_back || '').trim(), req.body.notes === undefined ? cur.notes : String(req.body.notes || '').trim(), w.id);
    res.json({
      success: true,
      message: 'تم تحديث بيانات الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.delete('/api/labor/my/workers/:id', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    var w = await laborWorkerOwned(parseInt(req.params.id, 10), req.laborAgentId);
    if (!w) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    await db.prepare('DELETE FROM labor_workers WHERE id = ?').run(w.id);
    res.json({
      success: true,
      message: 'تم حذف الشخص'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});
app.get('/api/labor/companies', authMiddleware, laborAgentMiddleware, async (req, res) => {
  try {
    res.json(await db.prepare("SELECT id, name FROM companies WHERE type = 'labor' ORDER BY name").all());
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ---------- LABOR COMPANY portal: its workers ----------
app.get('/api/company/labor-workers', companyAuthMiddleware, async (req, res) => {
  try {
    var cid = req.user.company_id;
    var co = await db.prepare('SELECT id, type FROM companies WHERE id = ?').get(cid);
    if (!co || co.type !== 'labor') return res.json({
      workers: [],
      summary: {
        total: 0,
        working: 0,
        monthly: 0
      }
    });
    var rows = await db.prepare("SELECT w.*, g.name as group_name, a.name as labor_agent_name FROM labor_workers w LEFT JOIN labor_groups g ON g.id = w.group_id LEFT JOIN agents a ON a.id = w.labor_agent_id WHERE w.company_id = ? ORDER BY w.created_at DESC, w.id DESC").all(cid);
    // The company pays ONE amount (worker earning + the labor agent commission).
    // The agent's cut is never sent on its own — it is folded into earning_per_month.
    var out = rows.map(function (r) {
      var c = Object.assign({}, r);
      c.earning_per_month = Number(r.earning_per_month || 0) + Number(r.labor_agent_amount || 0);
      delete c.labor_agent_amount;
      return c;
    });
    var summary = laborSummaryOf(out);
    var pendingN = 0,
      pendingAmt = 0;
    out.forEach(function (r) {
      if (String(r.status || '') === 'pending') {
        pendingN++;
        pendingAmt += Number(r.earning_per_month || 0);
      }
    });
    summary.pending = pendingN;
    summary.pending_amount = pendingAmt;
    summary.bi_monthly = Number(summary.monthly || 0) * 2;
    res.json({
      workers: out,
      summary: summary
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Company says "we accept this person" -> pending confirmation on the admin side
app.post('/api/company/labor-workers/:id/approve', companyAuthMiddleware, async (req, res) => {
  try {
    var w = await db.prepare('SELECT * FROM labor_workers WHERE id = ?').get(req.params.id);
    if (!w || w.company_id !== req.user.company_id) return res.status(404).json({
      error: 'الشخص غير موجود'
    });
    var ap = String(w.company_approval || '');
    if (ap === 'requested') return res.json({
      success: true,
      message: 'تم إرسال الطلب مسبقًا — بانتظار تأكيد الإدارة',
      company_approval: 'requested'
    });
    if (ap === 'confirmed') return res.status(400).json({
      error: 'تم تأكيد موافقة الشركة على هذا الشخص بالفعل'
    });
    var co = await db.prepare('SELECT name FROM companies WHERE id = ?').get(req.user.company_id);
    var coName = co ? co.name : '';
    await db.prepare("UPDATE labor_workers SET company_approval = 'requested' WHERE id = ?").run(w.id);
    await db.prepare("INSERT INTO admin_notifications (company_id, type, message, status, worker_id) VALUES (?, ?, ?, 'pending', ?)").run(req.user.company_id, 'labor_worker_approval', 'الشركة "' + coName + '" وافقت على العامل "' + w.full_name + '" — بانتظار تأكيد الإدارة', w.id);
    res.json({
      success: true,
      message: 'تم إرسال موافقة الشركة — بانتظار تأكيد الإدارة',
      company_approval: 'requested'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Serve pages (in-memory cache fallback for Velixir)
// Serve pages from embedded module (works on any filesystem)
function servePage(res, file) {
  res.set('Cache-Control', 'no-store, max-age=0');
  const html = _embeddedPages[file];
  if (html) return res.type('html').send(html);
  // Fallback to filesystem
  res.sendFile(path.join(_publicDir, file));
}
app.get('/', (req, res) => servePage(res, 'login.html'));
app.get('/login.html', (req, res) => servePage(res, 'login.html'));
function serveAsset(res, file, type) {
  res.set('Cache-Control', 'no-store, max-age=0');
  const embedded = _embeddedAssets && _embeddedAssets[file];
  if (typeof embedded === 'string') return res.type(type).send(embedded);
  res.type(type).sendFile(path.join(_publicDir, file), err => {
    if (err && !res.headersSent) res.status(404).type('text/plain').send('Not found');
  });
}
app.get('/robots.txt', (req, res) => serveAsset(res, 'robots.txt', 'text/plain'));
app.get('/sitemap.xml', (req, res) => serveAsset(res, 'sitemap.xml', 'application/xml'));
app.get('/manifest.json', (req, res) => serveAsset(res, 'manifest.json', 'application/json'));
app.get('/sw.js', (req, res) => {
  res.set('Service-Worker-Allowed', '/');
  serveAsset(res, 'sw.js', 'application/javascript');
});
app.get('/i18n-data.js', (req, res) => serveAsset(res, 'i18n-data.js', 'application/javascript; charset=utf-8'));
app.get('/dashboard', (req, res) => servePage(res, 'dashboard.html'));
app.get('/admin', (req, res) => servePage(res, 'admin.html'));
app.get('/select-job', (req, res) => res.redirect('/'));
app.get('/agent', (req, res) => servePage(res, 'agent.html'));
app.get('/company', (req, res) => servePage(res, 'company.html'));
// /company.html is the legacy URL -> always send it to the clean one
app.get('/company.html', (req, res) => res.redirect(302, '/company'));
// Partners always get a way into the company login screen
app.get('/company/login', (req, res) => res.redirect(302, '/company'));
app.get('/login/company', (req, res) => res.redirect(302, '/company'));

// Multer error handler (must be after routes)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message);
    return res.status(400).json({
      error: 'خطأ في رفع الملف: ' + err.message
    });
  }
  next(err);
});

// Global error handler - hide internal errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'حدث خطأ في الخادم'
  });
});

// Verify backup panel password (admin only)
const BACKUP_PANEL_PASS = 'Admin@Wazef#2024!';
app.post('/api/admin/verify-backup-pass', authMiddleware, adminMiddleware, (req, res) => {
  const {
    password
  } = req.body;
  if (password === BACKUP_PANEL_PASS) {
    res.json({
      ok: true
    });
  } else {
    res.status(403).json({
      error: 'كلمة المرور خاطئة'
    });
  }
});

// Debug route - shows embedded module status
app.get('/__debug', (req, res) => {
  res.json({
    __dirname,
    cwd: process.cwd(),
    _publicDir,
    embeddedPages: Object.keys(_embeddedPages || {}),
    embeddedImages: Object.keys(_embeddedImages || {}),
    embeddedAssets: Object.keys(_embeddedAssets || {}),
    embeddedPageCount: Object.keys(_embeddedPages || {}).length
  });
});

// Reset database - admin only, requires confirmation
// Wipes EVERYTHING and leaves the database exactly like a fresh start:
// empty tables + the 4 admin accounts (and nothing else).
app.post('/api/admin/reset-db', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      confirm
    } = req.body;
    if (confirm !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        error: 'أرسل confirm: RESET_ALL_DATA'
      });
    }
    await wipeAllData();
    await seedAdmins();
    // Clear auto-backups so a deliberate reset is NOT undone by self-recovery
    try {
      const autoBackupDir = path.join(dataDir, 'backups');
      if (fs.existsSync(autoBackupDir)) {
        for (const f of fs.readdirSync(autoBackupDir)) fs.unlinkSync(path.join(autoBackupDir, f));
      }
    } catch (e) {}
    try {
      db._save && db._save();
    } catch (e) {}
    res.json({
      success: true,
      message: 'تم حذف جميع البيانات وإعادة تعيين الحسابات الإدارية'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// ============ COMPANY PORTAL ============

// Company login
app.post('/api/company/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;
    if (!email || !password) return res.status(400).json({
      error: 'Email and password required'
    });
    const cu = await db.prepare('SELECT cu.*, c.name as company_name FROM company_users cu JOIN companies c ON cu.company_id = c.id WHERE cu.email = ? AND cu.is_active = 1').get(email);
    if (!cu) return res.status(401).json({
      error: 'Invalid credentials'
    });
    const valid = bcrypt.compareSync(password, cu.password);
    if (!valid) return res.status(401).json({
      error: 'Invalid credentials'
    });
    const token = jwt.sign({
      id: cu.id,
      company_id: cu.company_id,
      email: cu.email,
      role: 'company',
      company_name: cu.company_name,
      name: cu.name
    }, JWT_SECRET, {
      expiresIn: '7d'
    });
    res.json({
      token,
      user: {
        id: cu.id,
        company_id: cu.company_id,
        email: cu.email,
        name: cu.name,
        company_name: cu.company_name,
        role: 'company'
      }
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Company auth middleware
async function companyAuthMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({
    error: 'No token',
    code: 'SESSION_INVALID'
  });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
    if (req.user.role !== 'company') return res.status(403).json({
      error: 'Not company'
    });
    let cu = null;
    if (req.user.id) {
      // exact account: a deleted company user must NOT fall back to the company
      cu = await db.prepare('SELECT * FROM company_users WHERE id = ?').get(req.user.id);
      if (!cu) return res.status(401).json({
        error: 'Session expired',
        code: 'SESSION_INVALID'
      });
    } else if (req.user.company_id) {
      cu = await db.prepare('SELECT * FROM company_users WHERE company_id = ?').get(req.user.company_id);
    }
    if (!cu) return res.status(401).json({
      error: 'Company user not found',
      code: 'SESSION_INVALID'
    });
    if (cu.is_active !== 1) return res.status(401).json({
      error: 'Session expired',
      code: 'SESSION_INVALID'
    });
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(cu.company_id);
    if (!company) return res.status(401).json({
      error: 'Company not found',
      code: 'SESSION_INVALID'
    });
    req.user.company_id = cu.company_id;
    next();
  } catch (e) {
    res.status(401).json({
      error: 'Invalid token',
      code: 'SESSION_INVALID'
    });
  }
}

// Session probe used by the frontend guard (public/session.js): returns the
// fresh role of the logged-in account, or 401/403 when access is gone.
app.get('/api/auth/session', authMiddleware, async (req, res) => {
  try {
    const role = req.user.role === 'admin' ? 'admin' : req.user.role === 'company' ? 'company' : (await getAgentRole(req)) || req.account && req.account.role || req.user.role || 'user';
    res.json({
      ok: true,
      id: req.user.id,
      role: role,
      name: req.user.name || '',
      agent_id: req.user.agent_id || (role && AGENT_ROLES.indexOf(role) >= 0 ? await getAgentId(req) : null),
      company_id: req.user.company_id || null
    });
  } catch (e) {
    res.json({
      ok: true,
      id: req.user.id,
      role: req.user.role || 'user'
    });
  }
});

// Get company profile
app.get('/api/company/profile', companyAuthMiddleware, async (req, res) => {
  try {
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.company_id);
    if (!company) return res.status(404).json({
      error: 'Company not found'
    });
    const languages = await db.prepare('SELECT * FROM company_languages WHERE company_id = ?').all(req.user.company_id);
    for (const l of languages) {
      l.sent_count = (await db.prepare(`SELECT COUNT(*) as c FROM selections s JOIN jobs j ON s.job_id = j.id WHERE (j.company_id = ? OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email = ?) OR TRIM(j.company_name) = TRIM(?)) AND j.position = ? AND s.status = 'confirmed'`).get(req.user.company_id, company.company_email || '', company.name || '', l.position || '')).c;
    }
    res.json({
      company,
      languages
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Update company profile
app.put('/api/company/profile', companyAuthMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const name = body.name ?? null;
    const position = body.position ?? null;
    const description = body.description ?? null;
    const interview_time = body.interview_time ?? null;
    const salary_min = body.salary_min ?? null;
    const salary_max = body.salary_max ?? null;
    const company_email = body.company_email ?? null;
    const available_slots = body.available_slots ?? null;
    const deadline = body.deadline ?? null;
    const education_requirement = body.education_requirement === undefined ? null : normalizeEduReq(body.education_requirement);
    const old = await db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    await db.prepare('UPDATE companies SET name=COALESCE(?,name), position=COALESCE(?,position), description=COALESCE(?,description), interview_time=COALESCE(?,interview_time), salary_min=COALESCE(?,salary_min), salary_max=COALESCE(?,salary_max), company_email=COALESCE(?,company_email), available_slots=COALESCE(?,available_slots), deadline=COALESCE(?,deadline), education_requirement=COALESCE(?,education_requirement) WHERE id=?').run(name, position, description, interview_time, salary_min, salary_max, company_email, available_slots, deadline, education_requirement, req.user.company_id);
    const newName = name || old && old.name || '';
    await db.prepare('UPDATE jobs SET company_id = ? WHERE company_id IS NULL AND TRIM(company_name) = TRIM(?)').run(req.user.company_id, newName);
    await db.prepare('UPDATE jobs SET company_name = ?, company_email = COALESCE(NULLIF(?, \'\'), company_email) WHERE company_id = ?').run(newName, company_email || '', req.user.company_id);
    res.json({
      success: true,
      message: 'تم التحديث'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Change company password
app.put('/api/company/password', companyAuthMiddleware, async (req, res) => {
  try {
    const {
      current_password,
      new_password
    } = req.body;
    if (!current_password || !new_password) return res.status(400).json({
      error: 'Both passwords required'
    });
    const cu = await db.prepare('SELECT * FROM company_users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(current_password, cu.password)) return res.status(401).json({
      error: 'Current password wrong'
    });
    await db.prepare('UPDATE company_users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
    res.json({
      success: true,
      message: 'تم تغيير كلمة المرور'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Add company language
app.post('/api/company/languages', companyAuthMiddleware, async (req, res) => {
  try {
    const {
      language,
      level,
      needed_count,
      position,
      salary_min,
      salary_max,
      interview_time,
      deadline,
      notify_days,
      description,
      work_location,
      employment_type
    } = req.body;
    if (!language) return res.status(400).json({
      error: 'Language and level required'
    });
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (level && !validLevels.includes(level)) return res.status(400).json({
      error: 'Invalid level'
    });
    await db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description, work_location, employment_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(req.user.company_id, language, level || '', needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '', String(work_location || '').trim(), String(employment_type || '').trim());
    res.json({
      success: true,
      message: 'تمت الإضافة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Delete company language
app.delete('/api/company/languages/:id', companyAuthMiddleware, async (req, res) => {
  try {
    await db.prepare('DELETE FROM company_languages WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
    res.json({
      success: true,
      message: 'تم الحذف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Update company language
app.put('/api/company/languages/:id', companyAuthMiddleware, async (req, res) => {
  try {
    const {
      language,
      level,
      needed_count,
      position,
      salary_min,
      salary_max,
      interview_time,
      deadline,
      notify_days,
      description,
      work_location,
      employment_type
    } = req.body;
    if (!language) return res.status(400).json({
      error: 'Language and level required'
    });
    await db.prepare('UPDATE company_languages SET language=?, level=?, needed_count=?, position=?, salary_min=?, salary_max=?, interview_time=?, deadline=?, notify_days=?, description=?, work_location=?, employment_type=? WHERE id=? AND company_id=?').run(language, level || '', needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '', String(work_location || '').trim(), String(employment_type || '').trim(), req.params.id, req.user.company_id);
    res.json({
      success: true,
      message: 'تم التحديث'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// الشركة ترى المندوبين (قراءة فقط)
app.get('/api/company/agents', companyAuthMiddleware, async (req, res) => {
  try {
    const agents = await db.prepare(`
      SELECT a.id, a.name, a.referral_code, a.phone, a.payment_method, a.payment_operator, a.role,
        IFNULL(a.agent_type, 'normal') as agent_type, a.is_active, a.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.referred_by = a.id) as total_users,
        (SELECT COUNT(*) FROM jobs j WHERE j.application_id IN (SELECT id FROM applications WHERE user_id IN (SELECT id FROM users WHERE referred_by = a.id))) as total_hired
      FROM agents a
      WHERE IFNULL(a.agent_type, 'normal') != 'labor'
      ORDER BY a.created_at DESC
    `).all();
    res.json(agents);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Get company candidates (users selected for this company's jobs)
function companyJobsSql() {
  return `SELECT * FROM jobs WHERE company_id = ? OR (company_email IS NOT NULL AND company_email != '' AND company_email = (SELECT company_email FROM companies WHERE id=?)) OR TRIM(company_name) = TRIM((SELECT name FROM companies WHERE id=?))`;
}
app.get('/api/company/candidates', companyAuthMiddleware, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const company = (await db.prepare('SELECT education_requirement FROM companies WHERE id = ?').get(cid)) || {};
    const jobs = await db.prepare(companyJobsSql()).all(cid, cid, cid);
    if (!jobs.length) return res.json({
      candidates: []
    });
    const jobIds = jobs.map(j => j.id);
    const placeholders = jobIds.map(() => '?').join(',');
    const all = await db.prepare(`SELECT s.*, u.name, u.email, u.phone, u.nationality, u.city, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience, u.language_applied, j.position, j.company_name, j.interview_time, j.salary_min, j.salary_max FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.job_id IN (${placeholders}) AND s.status = 'confirmed' ORDER BY s.created_at DESC`).all(...jobIds);
    const candidates = all.filter(s => eduAllows(company.education_requirement, s.education_level));
    res.set('X-Hidden-By-Education', String(all.length - candidates.length));
    res.json({
      candidates
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Company decision: accept or reject a candidate
app.post('/api/company/candidates/:id/decision', companyAuthMiddleware, async (req, res) => {
  try {
    const decision = req.body && req.body.decision;
    if (decision !== 'accepted' && decision !== 'rejected') return res.status(400).json({
      error: 'قرار غير صالح'
    });
    const cid = req.user.company_id;
    const sel = await db.prepare(`
      SELECT s.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        j.position, j.company_name, j.company_id, j.company_email, j.interview_time
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE s.id = ? AND (j.company_id = ? OR (j.company_email IS NOT NULL AND j.company_email = ?))
    `).get(req.params.id, cid, ((await db.prepare('SELECT company_email FROM companies WHERE id=?').get(cid)) || {}).company_email || '');
    if (!sel) return res.status(404).json({
      error: 'المتقدم غير موجود'
    });
    if (sel.status === 'cancelled') return res.status(400).json({
      error: 'لا يمكن اتخاذ قرار على طلب ملغي'
    });
    if (sel.status !== 'confirmed') return res.status(400).json({
      error: 'لم يتم تثبيت هذا المتقدم من الإدارة بعد'
    });
    await db.prepare('UPDATE selections SET company_decision = ?, company_decision_at = CURRENT_TIMESTAMP WHERE id = ?').run(decision, sel.id);
    if (decision === 'accepted') {
      const adminEmail = 'mohamed.sami.gawad@gmail.com';
      const html = `
        
          <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#22c55e;">تم قبول المتقدم في الشركة</h2>
          <p style="font-size:16px;line-height:1.9;">مرحباً محمد،</p>
          <p style="font-size:15px;line-height:1.9;">الشركة <strong style="color:#d4a853;">${sel.company_name || ''}</strong> قبّلت المتقدم التالي:</p>
          <ul style="font-size:14px;line-height:2;">
            <li><strong>الاسم:</strong> ${sel.user_name}</li>
            <li><strong>البريد:</strong> ${sel.user_email}</li>
            <li><strong>الهاتف:</strong> ${sel.user_phone || '-'}</li>
            <li><strong>الوظيفة:</strong> ${sel.position || '-'}</li>
            <li><strong>المقابلة:</strong> ${sel.interview_time || '-'}</li>
          </ul>
          
        `;
      sendEmail(adminEmail, `قبول ${sel.user_name} في ${sel.company_name || 'الشركة'}`, html);
      await db.prepare('INSERT INTO admin_notifications (company_id, type, message, status) VALUES (?, ?, ?, ?)').run(sel.company_id || 0, 'candidate_accepted', `شركة ${sel.company_name || ''} قبّلت المتقدم ${sel.user_name} (${sel.position || ''})`, 'pending');
    } else if (decision === 'rejected') {
      const apology = `للأسف تم رفضك من قبل شركة ${sel.company_name || ''} للوظيفة: ${sel.position || ''}. لا تقلق، هناك فرص أكثر في انتظارك! يمكنك اختيار وظيفة أخرى الآن، أو ستتم إضافة وظائف جديدة قريباً.`;
      await db.prepare(`UPDATE selections SET status = 'cancelled', is_frozen = 0, amount = 0, agent_amount = 0, hired = 0, apology = ? WHERE id = ?`).run(apology, sel.id);
      if (sel.company_id) await db.prepare('UPDATE companies SET pending_count = MAX(0, pending_count - 1) WHERE id = ?').run(sel.company_id);
      await saveNotification(sel.user_id, null, 'apology', 'رسالة اعتذار من الشركة', apology);
      if (sel.user_email) {
        sendEmail(sel.user_email, 'رسالة اعتذار - وَظِيف', `
          
            <h2 style="text-align:center;font-size:20px;margin:0 0 16px;color:#e57373;">رسالة اعتذار</h2>
            <p style="font-size:15px;line-height:1.9;">${apology}</p>
            
          
        `);
      }
      await db.prepare('INSERT INTO admin_notifications (company_id, type, message, status) VALUES (?, ?, ?, ?)').run(sel.company_id || 0, 'candidate_rejected', apology, 'pending');
    }
    res.json({
      success: true,
      decision,
      message: decision === 'accepted' ? 'تم قبول المتقدم وإرسال إشعار للإدارة' : 'تم رفض المتقدم وإرسال رسالة اعتذار'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Get company confirmed candidates (after تثبيت - going to this company)
app.get('/api/company/confirmed', companyAuthMiddleware, async (req, res) => {
  try {
    const cid = req.user.company_id;
    const company = (await db.prepare('SELECT education_requirement FROM companies WHERE id = ?').get(cid)) || {};
    const jobs = await db.prepare(companyJobsSql()).all(cid, cid, cid);
    if (!jobs.length) return res.json({
      candidates: []
    });
    const jobIds = jobs.map(j => j.id);
    const placeholders = jobIds.map(() => '?').join(',');
    const all = await db.prepare(`SELECT s.*, u.name, u.email, u.phone, u.nationality, u.city, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience, u.language_applied, j.position, j.company_name, j.interview_time, j.salary_min, j.salary_max FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.status = 'confirmed' AND s.job_id IN (${placeholders}) ORDER BY s.created_at DESC`).all(...jobIds);
    const candidates = all.filter(s => eduAllows(company.education_requirement, s.education_level));
    res.set('X-Hidden-By-Education', String(all.length - candidates.length));
    res.json({
      candidates
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Get company jobs
app.get('/api/company/jobs', companyAuthMiddleware, async (req, res) => {
  try {
    const jobs = await db.prepare(companyJobsSql() + ' ORDER BY created_at DESC').all(req.user.company_id, req.user.company_id, req.user.company_id);
    res.json({
      jobs
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Create company job
app.post('/api/company/jobs', companyAuthMiddleware, async (req, res) => {
  try {
    const {
      position,
      interview_time,
      salary_min,
      salary_max,
      description,
      language,
      level,
      needed_count,
      deadline,
      notify_days,
      work_location,
      employment_type
    } = req.body;
    if (!position) return res.status(400).json({
      error: 'اسم الوظيفة مطلوب'
    });
    const company = await db.prepare('SELECT name, company_email FROM companies WHERE id=?').get(req.user.company_id);
    const result = await db.prepare('INSERT INTO jobs (company_id, company_name, company_email, position, interview_time, salary_min, salary_max, description, language, level, needed_count, deadline, notify_days, work_location, employment_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(req.user.company_id, company.name, company.company_email || '', position, interview_time || '', salary_min || 0, salary_max || 0, description || '', String(language || '').trim(), String(level || '').trim(), parseInt(needed_count) > 0 ? parseInt(needed_count) : 1, deadline || '', parseInt(notify_days) > 0 ? parseInt(notify_days) : 5, String(work_location || '').trim(), String(employment_type || '').trim());
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'تمت إضافة الوظيفة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Update company job
app.put('/api/company/jobs/:id', companyAuthMiddleware, async (req, res) => {
  try {
    const {
      position,
      interview_time,
      salary_min,
      salary_max,
      description,
      language,
      level,
      needed_count,
      deadline,
      notify_days,
      work_location,
      employment_type
    } = req.body;
    const company = await db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    await db.prepare('UPDATE jobs SET position=?, interview_time=?, salary_min=?, salary_max=?, description=?, language=?, level=?, needed_count=?, deadline=?, notify_days=?, work_location=?, employment_type=? WHERE id=? AND company_name=?').run(position || '', interview_time || '', salary_min || 0, salary_max || 0, description || '', String(language || '').trim(), String(level || '').trim(), parseInt(needed_count) > 0 ? parseInt(needed_count) : 1, deadline || '', parseInt(notify_days) > 0 ? parseInt(notify_days) : 5, String(work_location || '').trim(), String(employment_type || '').trim(), req.params.id, company.name);
    res.json({
      success: true,
      message: 'تم التحديث'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Delete company job
app.delete('/api/company/jobs/:id', companyAuthMiddleware, async (req, res) => {
  try {
    const company = await db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    const hasSelections = await db.prepare('SELECT id FROM selections WHERE job_id=? AND status IN (\'selected\',\'confirmed\')').get(req.params.id);
    if (hasSelections) return res.status(400).json({
      error: 'لا يمكن حذف وظيفة فيها متقدمين'
    });
    await db.prepare('DELETE FROM jobs WHERE id=? AND company_name=?').run(req.params.id, company.name);
    res.json({
      success: true,
      message: 'تم الحذف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: create company user account
app.post('/api/admin/company-users', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      company_id,
      email,
      password,
      name
    } = req.body;
    if (!company_id || !email || !password) return res.status(400).json({
      error: 'Missing fields'
    });
    const company = await db.prepare('SELECT id FROM companies WHERE id=?').get(company_id);
    if (!company) return res.status(404).json({
      error: 'Company not found'
    });
    const exists = await db.prepare('SELECT id FROM company_users WHERE email=?').get(email);
    if (exists) return res.status(400).json({
      error: 'Email already exists'
    });
    await db.prepare('INSERT INTO company_users (company_id, email, password, name) VALUES (?,?,?,?)').run(company_id, email, bcrypt.hashSync(password, 10), name || '');
    res.json({
      success: true,
      message: 'تم إنشاء حساب الشركة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get all company users
app.get('/api/admin/company-users', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const users = await db.prepare('SELECT cu.*, c.name as company_name FROM company_users cu JOIN companies c ON cu.company_id = c.id').all();
    res.json(users);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: delete company user
app.delete('/api/admin/company-users/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    await db.prepare('DELETE FROM company_users WHERE id=?').run(req.params.id);
    res.json({
      success: true,
      message: 'تم الحذف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get company languages
app.get('/api/admin/company-languages/:companyId', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const langs = await db.prepare('SELECT * FROM company_languages WHERE company_id=?').all(req.params.companyId);
    res.json(langs);
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: add company language
app.post('/api/admin/company-languages', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    const {
      company_id,
      language,
      level,
      needed_count,
      position,
      salary_min,
      salary_max,
      interview_time,
      deadline,
      notify_days,
      description,
      work_location,
      employment_type
    } = req.body;
    if (!company_id || !language) return res.status(400).json({
      error: 'Missing fields'
    });
    const result = await db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description, work_location, employment_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(company_id, language, level || '', needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '', String(work_location || '').trim(), String(employment_type || '').trim());
    res.json({
      success: true,
      id: result.lastInsertRowid,
      message: 'تمت الإضافة'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: delete company language
app.delete('/api/admin/company-languages/:id', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    await db.prepare('DELETE FROM admin_notifications WHERE job_id = ?').run(req.params.id);
    await db.prepare('DELETE FROM company_languages WHERE id=?').run(req.params.id);
    res.json({
      success: true,
      message: 'تم الحذف'
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// Admin: get jobs filtered by language (and optional level or level range e.g. A1-B1) for assignment
app.get('/api/admin/jobs-by-language/:language', authMiddleware, adminOrAgentMiddleware, async (req, res) => {
  try {
    const lang = req.params.language;
    const level = (req.query.level || '').trim().replace(/\s*[-–]\s*/g, '-').toUpperCase();
    const rank = {
      A1: 1,
      A2: 2,
      B1: 3,
      B2: 4,
      C1: 5,
      C2: 6
    };
    let levelClause = '';
    let neededLevelClause = '';
    let neededParams = [];
    if (level) {
      const rangeM = level.match(/^(A1|A2|B1|B2|C1|C2)-(A1|A2|B1|B2|C1|C2)$/);
      if (rangeM) {
        const from = rangeM[1],
          to = rangeM[2];
        const inRange = Object.keys(rank).filter(l => rank[l] >= rank[from] && rank[l] <= rank[to]);
        const ph = inRange.map(() => '?').join(',');
        levelClause = ` AND cl.level IN (${ph})`;
        neededLevelClause = ` AND cl2.level IN (${ph})`;
        neededParams = [...inRange];
      } else {
        levelClause = ' AND cl.level = ?';
        neededLevelClause = ' AND cl2.level = ?';
        neededParams = [level];
      }
    }
    const neededSql = level ? `IFNULL((SELECT SUM(cl2.needed_count) FROM company_languages cl2 WHERE cl2.company_id = c.id ${neededLevelClause}), 0)` : `IFNULL((SELECT SUM(cl2.needed_count) FROM company_languages cl2 WHERE cl2.company_id = c.id), 0)`;
    // Placeholder order: SELECT-level params first (neededSql), then WHERE (lang, level)
    const sqlParams = [];
    if (level) sqlParams.push(...neededParams);
    sqlParams.push(lang);
    if (level) sqlParams.push(...neededParams);
    const companies = await db.prepare(`
      SELECT c.id, c.name, c.deadline, c.available_slots, c.hired_count, c.pending_count,
        c.position, c.interview_time, c.salary_min, c.salary_max, c.description, c.company_email,
        IFNULL(c.education_requirement, 'both') as education_requirement,
        ${neededSql} as needed,
        IFNULL((SELECT COUNT(*) FROM jobs j JOIN selections s ON s.job_id = j.id WHERE (j.company_id = c.id OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email = c.company_email) OR TRIM(j.company_name) = TRIM(c.name)) AND s.status IN ('selected','confirmed')), 0) as applied,
        IFNULL(c.deadline, '') as dl,
        GROUP_CONCAT(DISTINCT cl.level) as levels
      FROM companies c
      JOIN company_languages cl ON c.id = cl.company_id
      WHERE cl.language = ?${levelClause}
      GROUP BY c.id
    `).all(...sqlParams);
    // Hide companies that do not accept this applicant's education level
    const applicantEdu = await educationFromRequest(req);
    let hiddenByEducation = 0;
    if (applicantEdu) {
      const allowed = [];
      companies.forEach(c => {
        if (eduAllows(c.education_requirement, applicantEdu)) allowed.push(c);else hiddenByEducation++;
      });
      companies.length = 0;
      companies.push(...allowed);
      res.set('X-Hidden-By-Education', String(hiddenByEducation));
    }
    if (!companies.length) {
      await db.prepare('INSERT INTO admin_notifications (company_id, type, message, status) VALUES (0, ?, ?, ?)').run('missing_language', `لا توجد شركة توفر وظيفة باللغة: ${lang}${level ? ' - مستوى ' + level : ''}. برجاء التعاقد مع شركة توفر هذا التخصص.`, 'pending');
      return res.json({
        jobs: [],
        companies: [],
        message: 'لا توجد شركة متاحة لهذه اللغة',
        notification_sent: true
      });
    }
    // Sort: deadline approaching first, then by days remaining
    const now = new Date();
    for (const c of companies) {
      const jd = await nearestJobDeadline(c.id);
      c.deadline = jd.deadline;
      c.notify_days_before = jd.notify_days_before;
      if (c.deadline) {
        const d = new Date(c.deadline + 'T00:00:00');
        c.days_left = Math.ceil((d - now) / 86400000);
        c.near_deadline = c.days_left <= (c.notify_days_before || 5) && c.days_left >= 0;
        c.expired = c.days_left < 0;
      } else {
        c.days_left = null;
        c.near_deadline = false;
        c.expired = false;
      }
    }
    companies.sort((a, b) => {
      if (a.near_deadline && !b.near_deadline) return -1;
      if (!a.near_deadline && b.near_deadline) return 1;
      if (a.near_deadline && b.near_deadline) return (a.days_left || 0) - (b.days_left || 0);
      return a.name.localeCompare(b.name);
    });
    const companyIds = companies.map(c => c.id);
    const namePlaceholders = companies.map(() => '?').join(',');
    const emailPlaceholders = companies.map(() => '?').join(',');
    const jobs = await db.prepare(`SELECT j.*, j.company_id FROM jobs j WHERE j.company_id IN (${namePlaceholders}) OR (j.company_email IS NOT NULL AND j.company_email != '' AND j.company_email IN (${emailPlaceholders})) OR TRIM(j.company_name) IN (SELECT TRIM(c2.name) FROM companies c2 WHERE c2.id IN (${namePlaceholders}))`).all(...companyIds, ...companies.map(c => c.company_email || ''), ...companyIds);
    res.json({
      jobs,
      companies
    });
  } catch (e) {
    res.status(500).json({
      error: e.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'الصفحة غير موجودة'
  });
});
async function start() {
  await initDatabase();
  try {
    await db.exec(`CREATE TABLE IF NOT EXISTS email_log (id BIGSERIAL PRIMARY KEY, recipient TEXT, subject TEXT, method TEXT, status TEXT, error TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW())`);
  } catch (e) {
    console.log('email_log create failed:', (e.message || '').slice(0, 150));
  }
  console.log('Email config: BREVO_API_KEY=' + (process.env.BREVO_API_KEY ? 'set' : 'missing') + ' RESEND_API_KEY=' + (process.env.RESEND_API_KEY ? 'set' : 'missing') + ' SMTP_USER=' + (SMTP_USER || 'missing'));
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

// Vercel serverless: export app instead of listening
if (process.env.VERCEL) {
  initDatabase().then(() => console.log('Vercel: DB initialized')).catch(e => console.error('Vercel DB error:', e.message));
  module.exports = app;
} else {
  start().catch(e => {
    console.error('Failed to start:', e.message);
    console.error(e.stack);
    process.exit(1);
  });
}