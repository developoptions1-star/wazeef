process.on('uncaughtException', e => console.error('UNCAUGHT:', e.message));
process.on('unhandledRejection', e => {});
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
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' }
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'محاولات كثيرة، حاول مرة أخرى بعد 15 دقيقة' },
  standardHeaders: true,
  legacyHeaders: false
});
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'محاولات كثيرة، حاول مرة أخرى بعد ساعة' },
  standardHeaders: true,
  legacyHeaders: false
});

// Input sanitizer to prevent XSS in email templates
function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Data directory - use /tmp if __dirname is not writable (e.g. SnapDeploy containers)
let dataDir = __dirname;
try {
  const testFile = path.join(__dirname, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (e) {
  dataDir = '/tmp';
}

// Ensure directories exist
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Clean stale chunked-upload temp files (>1h)
try {
  fs.readdirSync(uploadsDir)
    .filter(f => f.startsWith('tmp_') && f.endsWith('.part'))
    .forEach(f => {
      const p = path.join(uploadsDir, f);
      if (Date.now() - fs.statSync(p).mtimeMs > 3600000) fs.unlinkSync(p);
    });
} catch (e) {}

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
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
const { pages: _embeddedPages, images: _embeddedImages } = require('./pages');

// Multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Database setup
const dbPath = path.join(dataDir, 'app.db');
// Apply pending restore (uploaded via /api/admin/restore) before opening DB
const pendingRestore = path.join(dataDir, 'restore.pending.db');
if (fs.existsSync(pendingRestore)) {
  try {
    if (fs.existsSync(dbPath)) fs.copyFileSync(dbPath, dbPath + '.bak');
    for (const ext of ['-wal', '-shm', '-journal']) { try { fs.unlinkSync(dbPath + ext); } catch (e) {} }
    fs.copyFileSync(pendingRestore, dbPath);
    fs.unlinkSync(pendingRestore);
    console.log('Database restored from uploaded backup');
  } catch (e) { console.log('Restore failed:', e.message); }
}
let db;
async function initDatabase() {
  const { openDb } = require('./sqlite-wrapper');
  db = await openDb(dbPath);

db.exec(`
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
    language TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER,
    company_name TEXT NOT NULL,
    position TEXT NOT NULL,
    interview_time TEXT,
    salary REAL,
    salary_min REAL,
    salary_max REAL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id)
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

// Migration: add agent_amount column if missing
try { db.exec('ALTER TABLE selections ADD COLUMN agent_amount REAL DEFAULT 0'); } catch(e) {}
// Migration: add rerecord_request column if missing
try { db.exec('ALTER TABLE applications ADD COLUMN rerecord_request INTEGER DEFAULT 0'); } catch(e) {}
// Migration: add rejection_date column if missing
try { db.exec('ALTER TABLE applications ADD COLUMN rejection_date DATETIME'); } catch(e) {}
// Migration: add rejection_reason column if missing
try { db.exec('ALTER TABLE applications ADD COLUMN rejection_reason TEXT'); } catch(e) {}
// Migration: add user profile columns if missing
try { db.exec('ALTER TABLE users ADD COLUMN nationality TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN city TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN language_applied TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN age INTEGER'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN national_id TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN college TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN education_level TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN military_status TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN call_center_experience TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE users ADD COLUMN gender TEXT'); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN language_level TEXT DEFAULT ''"); } catch(e) {}
// Migration: add email verification columns
  try { db.exec('ALTER TABLE users ADD COLUMN verification_code TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN code_expiry TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT'); } catch(e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN reset_token_expiry TEXT'); } catch(e) {}
// Migration: add frozen columns to selections
try { db.exec('ALTER TABLE selections ADD COLUMN is_frozen INTEGER DEFAULT 1'); } catch(e) {}
try { db.exec('ALTER TABLE selections ADD COLUMN unfrozen_at DATETIME'); } catch(e) {}
try { db.exec('ALTER TABLE selections ADD COLUMN frozen_deadline DATETIME'); } catch(e) {}
 try { db.exec('ALTER TABLE selections ADD COLUMN apology TEXT'); } catch(e) {}
 try { db.exec('ALTER TABLE selections ADD COLUMN hired_at DATETIME'); } catch(e) {}
 try { db.exec('ALTER TABLE selections ADD COLUMN company_emailed INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE jobs ADD COLUMN company_email TEXT'); } catch(e) {}
// Migration: add company columns if missing
try { db.exec('ALTER TABLE companies ADD COLUMN position TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN interview_time TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN salary_min REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN salary_max REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN company_email TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE companies ADD COLUMN available_slots INTEGER DEFAULT 0'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN used_slots INTEGER DEFAULT 0'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN pending_count INTEGER DEFAULT 0'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN hired_count INTEGER DEFAULT 0'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN deadline TEXT'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN notify_days_before INTEGER DEFAULT 5'); } catch(e) {}
 try { db.exec('ALTER TABLE agents ADD COLUMN role TEXT DEFAULT "agent"'); } catch(e) {}
 try { db.exec('ALTER TABLE companies ADD COLUMN interview_schedule TEXT'); } catch(e) {}
 try { db.exec('ALTER TABLE applications ADD COLUMN assigned_qualty_id INTEGER'); } catch(e) {}
 try { db.exec('ALTER TABLE applications ADD COLUMN reviewed_by INTEGER'); } catch(e) {}
 try { db.exec('ALTER TABLE applications ADD COLUMN reviewed_at DATETIME'); } catch(e) {}

// Notifications table
db.exec(`
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

db.exec(`
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

// AUTO-RESET: wipe all data on startup, keep only admins
db.exec('DELETE FROM notifications');
db.exec('DELETE FROM admin_notifications');
db.exec('DELETE FROM selections');
db.exec('DELETE FROM jobs');
db.exec('DELETE FROM applications');
db.exec('DELETE FROM agents');
db.exec('DELETE FROM companies');
db.exec('DELETE FROM company_users');
db.exec('DELETE FROM company_languages');
db.exec('DELETE FROM users');
try { db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','applications','jobs','selections','companies','agents','notifications','admin_notifications','company_users','company_languages')"); } catch(e) {}

// Seed admin users
const admins = [
  { name: 'محمد سامي', email: 'mohamed.sami.gawad@gmail.com', password: 'Sm@2024!Wazef#Xk9' },
  { name: 'يوسف', email: 'Youssafmohamed999@gmail.com', password: 'Ys@2024!Wazef#Mp7' },
  { name: 'ادمن', email: '1stvampiresslayer@gmail.com', password: 'Vp@2024!Wazef#Qz3' },
  { name: 'Amina', email: 'amina@gmail.com', password: 'Am@2024!Wazef#Jn4' }
];
const insertAdmin = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)');
for (const a of admins) {
  insertAdmin.run(a.name, a.email, bcrypt.hashSync(a.password, 10), 'admin');
}
console.log('Database reset: only 4 admins seeded');

// Seed default test company (so company login always works after restart)
try {
  db.prepare('INSERT INTO companies (name, position, company_email) VALUES (?,?,?)').run('TestCo', 'Dev', 'test@co.com');
  const coId = db.prepare('SELECT last_insert_rowid() as id').get().id;
  db.prepare('INSERT INTO company_users (company_id, email, password, name) VALUES (?,?,?,?)').run(coId, 'test@co.com', bcrypt.hashSync('Test@123', 10), 'TestCo');
  db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(coId, 'الإنجليزية', 'B2', 3, 'مطور ويب', 5000, 15000, 'السبت 2 م', new Date(Date.now() + 3*86400000).toISOString().split('T')[0], 5, 'وظيفة مطور ويب - تيست');
  console.log('Test company seeded: test@co.com / Test@123');
} catch(e) { console.log('Test company seed error:', e.message); }

// Seed 3 test applicants (for testing admin assign-to-company flow)
try {
  const testHash = bcrypt.hashSync('Test@123', 10);
  const testPeople = [
    { name: 'أحمد محمد', email: 'ahmed@test.com', phone: '01001112233', city: 'القاهرة', age: 25, college: 'القاهرة', edu: 'بكالوريوس', mil: 'معفى', lang: 'الإنجليزية', level: 'B2' },
    { name: 'سارة علي', email: 'sara@test.com', phone: '01112223344', city: 'الإسكندرية', age: 23, college: 'الإسكندرية', edu: 'بكالوريوس', mil: '—', lang: 'الإنجليزية', level: 'A1-B1' },
    { name: 'محمود حسن', email: 'mahmoud@test.com', phone: '01223334455', city: 'الجيزة', age: 27, college: 'الجيزة', edu: 'ماجستير', mil: 'مؤجل', lang: 'الإنجليزية', level: 'C1' },
  ];
  for (const p of testPeople) {
    db.prepare('INSERT INTO users (name,email,password,phone,role,nationality,city,language_applied,language_level,age,college,education_level,military_status,email_verified) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)')
      .run(p.name, p.email, testHash, p.phone, 'user', 'مصري', p.city, p.lang, p.level, p.age, p.college, p.edu, p.mil);
    const uid = db.prepare('SELECT last_insert_rowid() as id').get().id;
    db.prepare('INSERT INTO applications (user_id, language, status) VALUES (?,?,?)').run(uid, p.lang, 'approved');
    console.log('Test applicant seeded:', p.name);
  }
} catch(e) { console.log('Test applicant seed error:', e.message); }

// Force save so CREATE TABLE statements persist to disk
try { db._save && db._save(); } catch(e) {}

} // end initDatabase

// Email transporter (global scope - used by routes)
const SMTP_USER = process.env.SMTP_USER || 'mohamedfaron297@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'ushf stxg rmgp xhig';

async function sendEmail(to, subject, html, attachments) {
  const files = (attachments || []).map(a => ({ filename: a.filename, content: a.content }));
  if (process.env.BREVO_API_KEY) {
    try {
      const payload = {
        sender: { name: 'وَظِيف', email: SMTP_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html
      };
      if (files.length) payload.attachment = files.map(a => ({ content: a.content, name: a.filename }));
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': process.env.BREVO_API_KEY },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('Brevo HTTP ' + r.status + ': ' + (await r.text()).slice(0, 200));
      console.log('Email sent to:', to);
      return;
    } catch (e) {
      console.log('Brevo failed, trying SMTP:', e.message.split('\n')[0]);
    }
  }
  const attempts = [
    { host: 'smtp.gmail.com', port: 587, secure: false },
    { host: 'smtp.gmail.com', port: 465, secure: true }
  ];
  for (const cfg of attempts) {
    try {
      const t = nodemailer.createTransport({
        ...cfg,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 8000,
        socketTimeout: 10000
      });
      const msg = { from: `"وَظِيف" <${SMTP_USER}>`, to, subject, html };
      if (files.length) msg.attachments = files.map(a => ({ filename: a.filename, content: Buffer.from(a.content, 'base64') }));
      await t.sendMail(msg);
      console.log('Email sent to:', to);
      return;
    } catch (e) {
      console.log(`SMTP ${cfg.port} failed:`, (e.message || '').split('\n')[0]);
    }
  }
  console.log('Email send error: all methods failed for', to);
}

async function backupDatabase(manual) {
  try {
    const tmp = path.join(dataDir, 'backup-tmp.db');
    const data = db.db.export();
    fs.writeFileSync(tmp, Buffer.from(data));
    const size = fs.statSync(tmp).size;
    if (size > 20 * 1024 * 1024) {
      try { fs.unlinkSync(tmp); } catch (e) {}
      console.log('Backup skipped: DB too large (' + size + ')');
      return { ok: false, error: 'too large' };
    }
    const b64 = fs.readFileSync(tmp).toString('base64');
    fs.unlinkSync(tmp);
    const when = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await sendEmail(SMTP_USER, 'نسخة احتياطية - وَظِيف ' + when,
      `<div dir="rtl" style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:30px;"><h2>نسخة احتياطية ${manual ? 'يدوية' : 'تلقائية'}</h2><p>التاريخ: ${when}</p><p>الحجم: ${(size / 1024).toFixed(1)} KB</p><p>احتفظ بهذا الملف - يمكن استرجاعه من لوحة الأدمن.</p></div>`,
      [{ filename: `wazeef-backup-${Date.now()}.db`, content: b64 }]);
    console.log('Backup emailed, size:', size);
    return { ok: true, size };
  } catch (e) {
    console.log('Backup failed:', e.message);
    return { ok: false, error: e.message };
  }
}

function saveNotification(userId, agentId, type, title, message) {
  try {
    db.prepare('INSERT INTO notifications (user_id, agent_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(userId || null, agentId || null, type, title, message);
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
    <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#d4a853;text-align:center;">بيانات متقدم لوظيفة</h2>
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
      <p style="color:#888;font-size:12px;margin-top:30px;text-align:center;">هذه بيانات تم إرسالها عبر منصة وَظِيف للتوظيف الذكي</p>
    </div>`;
  sendEmail(compEmail, 'بيانات متقدم لوظيفة - وَظِيف', html);
}

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

function adminOrQualtyMiddleware(req, res, next) {
  if (req.user.role === 'admin') return next();
  if (getAgentRole(req) === 'qualty') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

function isAgentUser(req) {
  // Allow both JWT roles and fresh DB check (token may be stale after promotion)
  if (req.user.role === 'agent' || req.user.role === 'qualty' || req.user.agent_role === 'agent' || req.user.agent_role === 'qualty') return true;
  // Fallback DB check
  try {
    let row = null;
    if (req.user.agent_id) row = db.prepare('SELECT role FROM agents WHERE id=?').get(req.user.agent_id);
    if (!row && req.user.email) row = db.prepare('SELECT role FROM agents WHERE email=?').get(req.user.email);
    if (!row && req.user.id) row = db.prepare('SELECT role FROM agents WHERE id=?').get(req.user.id);
    return row && (row.role === 'agent' || row.role === 'qualty');
  } catch(e){ return false; }
}

function getAgentRole(req) {
  try {
    let row = null;
    if (req.user.agent_id) row = db.prepare('SELECT role FROM agents WHERE id=?').get(req.user.agent_id);
    if (!row && req.user.email) row = db.prepare('SELECT role FROM agents WHERE email=?').get(req.user.email);
    if (!row && req.user.id) row = db.prepare('SELECT role FROM agents WHERE id=?').get(req.user.id);
    if (row && row.role) return row.role;
  } catch(e){}
  if (req.user.agent_role) return req.user.agent_role;
  if (req.user.role === 'agent' || req.user.role === 'qualty') return req.user.role;
  return 'agent';
}

function getAgentId(req) {
  if (req.user.agent_id) return req.user.agent_id;
  if (req.user.email) {
    const row = db.prepare('SELECT id FROM agents WHERE email = ?').get(req.user.email);
    if (row) return row.id;
  }
  return req.user.id;
}

// ===== AUTH ROUTES =====
app.post('/api/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
     if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.email_verified === 0) return res.status(400).json({ error: 'يجب التحقق من البريد الإلكتروني أولاً' });
    const agentRow = db.prepare('SELECT * FROM agents WHERE email = ?').get(user.email);
    const agentRole = agentRow ? (agentRow.role || 'agent') : null;
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role, agent_role: agentRole, agent_id: agentRow ? agentRow.id : null }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, agent_role: agentRole } });
  } catch (e) {
    console.log('Login error:', e.message);
    res.status(500).json({ error: 'حدث خطأ في الخادم' });
  }
});

// ===== FORGOT PASSWORD =====
app.post('/api/forgot-password', authLimiter, (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'أدخل البريد الإلكتروني' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'البريد الإلكتروني غير مسجل' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET verification_code = ?, code_expiry = ? WHERE id = ?').run(code, expiry, user.id);
    const html = `
      <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
          <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
        </div>
        <h2 style="color:#d4a853;font-size:20px;margin-bottom:16px;text-align:center;">إعادة تعيين كلمة المرور</h2>
        <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${sanitize(user.name)},</p>
        <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:20px;">تلقينا طلبًا لإعادة تعيين كلمة المرور الخاص بك. استخدم الكود التالي:</p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-block;padding:16px 32px;background:rgba(212,168,83,0.08);border:1px solid rgba(212,168,83,0.15);border-radius:14px;font-size:32px;font-weight:900;letter-spacing:8px;color:#f0d78c;font-family:'Courier New',monospace;">${code}</div>
        </div>
        <p style="color:#888;font-size:13px;text-align:center;margin-bottom:12px;">صالح لمدة 15 دقيقة فقط</p>
        <p style="color:#888;font-size:13px;text-align:center;">إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد.</p>
        <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
        </div>
      </div>
    `;
    sendEmail(email, 'إعادة تعيين كلمة المرور - وَظِيف', html);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/verify-reset-code', authLimiter, (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'أكمل كل الحقول' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'البريد الإلكتروني غير مسجل' });
    if (user.verification_code !== code) return res.status(400).json({ error: 'الكود غير صحيح' });
    if (user.code_expiry && new Date(user.code_expiry) < new Date()) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?').run(resetToken, tokenExpiry, user.id);
    res.json({ success: true, resetToken });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/reset-password', authLimiter, (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) return res.status(400).json({ error: 'أكمل كل الحقول' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'البريد الإلكتروني غير مسجل' });
    if (user.reset_token !== resetToken) return res.status(400).json({ error: 'الكود غير صحيح أو تم استخدامه' });
    if (user.reset_token_expiry && new Date(user.reset_token_expiry) < new Date()) return res.status(400).json({ error: 'انتهت صلاحية الكود' });
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, verification_code = NULL, code_expiry = NULL WHERE id = ?').run(hashed, user.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
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
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const filename = Date.now() + '-recording.webm';
  fs.writeFileSync(path.join(uploadsDir, filename), buf);
  return filename;
}
app.post('/api/applications', authMiddleware, (req, res, next) => {
  if (req.is('multipart/*')) return upload.single('audio')(req, res, next);
  next();
}, (req, res) => {
  try {
    let audioFile = req.file ? req.file.filename : null;
    if (!audioFile && req.body.audio) audioFile = saveBase64Audio(req.body.audio);
    const r = processApplication(req.user.id, audioFile, req.body.language || null);
    if (r.error) return res.status(r.status || 400).json({ error: r.error });
    res.json({ id: r.id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Chunked upload: bodies > ~10KB stall on some proxies, so the client sends
// ~6KB base64 pieces that we reassemble here. Same application logic.
app.post('/api/applications/chunk', authMiddleware, (req, res) => {
  try {
    const { uploadId, index, total, chunk, language } = req.body;
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(uploadId || '')) return res.status(400).json({ error: 'معرف رفع غير صالح' });
    const idx = parseInt(index), tot = parseInt(total);
    if (isNaN(idx) || isNaN(tot) || idx < 0 || tot <= 0 || idx >= tot || tot > 2000) return res.status(400).json({ error: 'بيانات غير صالحة' });
    if (!chunk || typeof chunk !== 'string' || chunk.length > 8000) return res.status(400).json({ error: 'بيانات غير صالحة' });
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const partPath = path.join(uploadsDir, 'tmp_' + uploadId + '.part');
    if (idx === 0 && fs.existsSync(partPath)) fs.unlinkSync(partPath);
    fs.appendFileSync(partPath, chunk);
    if (idx < tot - 1) return res.json({ received: idx + 1, total: tot });
    const b64 = fs.readFileSync(partPath, 'utf8');
    fs.unlinkSync(partPath);
    const buf = Buffer.from(b64, 'base64');
    if (!buf.length || buf.length > 10 * 1024 * 1024) return res.status(400).json({ error: 'حجم الملف غير صالح' });
    const filename = Date.now() + '-recording.webm';
    fs.writeFileSync(path.join(uploadsDir, filename), buf);
    const r = processApplication(req.user.id, filename, language || null);
    if (r.error) return res.status(r.status || 400).json({ error: r.error });
    res.json({ id: r.id, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Shared: re-record update OR rejection check OR fresh insert
function getNextQualtyId() {
  const qualtys = db.prepare("SELECT id FROM agents WHERE role='qualty' AND is_active=1 ORDER BY id").all();
  if (qualtys.length === 0) return null;
  const last = db.prepare("SELECT assigned_qualty_id FROM applications WHERE assigned_qualty_id IS NOT NULL ORDER BY id DESC LIMIT 1").get();
  if (!last || !last.assigned_qualty_id) return qualtys[0].id;
  const idx = qualtys.findIndex(q => q.id === last.assigned_qualty_id);
  if (idx === -1) return qualtys[0].id;
  return qualtys[(idx + 1) % qualtys.length].id;
}

function processApplication(userId, audioFile, language) {
  const existing = db.prepare("SELECT id, audio_file FROM applications WHERE user_id = ? AND rerecord_request = 1 AND status = 'pending'").get(userId);
  if (existing) {
    // Delete the old recording so it doesn't stay orphaned on disk
    if (existing.audio_file && existing.audio_file !== audioFile) {
      try { fs.unlinkSync(path.join(uploadsDir, existing.audio_file)); } catch (e) {}
    }
    db.prepare('UPDATE applications SET audio_file = ?, language = ?, rerecord_request = 0 WHERE id = ?').run(audioFile, language, existing.id);
    return { id: existing.id };
  }
  if (language) {
    const restricted = db.prepare(`
      SELECT id, rejection_date FROM applications
      WHERE user_id = ? AND language = ? AND status = 'rejected' AND rejection_date IS NOT NULL
      ORDER BY rejection_date DESC LIMIT 1
    `).get(userId, language);
    if (restricted && restricted.rejection_date) {
      const rejectDate = new Date(restricted.rejection_date);
      const oneMonthLater = new Date(rejectDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      if (new Date() < oneMonthLater) {
        const remaining = Math.ceil((oneMonthLater - new Date()) / (24 * 60 * 60 * 1000));
        return { error: `تم رفضك لهذه اللغة. يجب الانتظار ${remaining} يوماً حتى تتمكن من التقديم مرة أخرى. تدرب وحسّن مستواك أولاً.`, status: 400 };
      }
    }
  }
  const result = db.prepare('INSERT INTO applications (user_id, audio_file, language) VALUES (?, ?, ?)').run(userId, audioFile, language);
  // Delete old applications for this user (keep only the newest)
  const oldApps = db.prepare("SELECT id, audio_file FROM applications WHERE user_id = ? AND id != ? AND status NOT IN ('selected','confirmed')").all(userId, result.lastInsertRowid);
  for (const old of oldApps) {
    if (old.audio_file) { try { fs.unlinkSync(path.join(uploadsDir, old.audio_file)); } catch (e) {} }
    const oldJobs = db.prepare('SELECT id FROM jobs WHERE application_id = ?').all(old.id);
    for (const j of oldJobs) { db.prepare('DELETE FROM selections WHERE job_id = ?').run(j.id); }
    db.prepare('DELETE FROM jobs WHERE application_id = ?').run(old.id);
    db.prepare('DELETE FROM applications WHERE id = ?').run(old.id);
  }
  const qId = getNextQualtyId();
  if (qId) {
    try { db.prepare("UPDATE applications SET assigned_qualty_id=? WHERE id=?").run(qId, result.lastInsertRowid); } catch(e){}
  }
  return { id: result.lastInsertRowid };
}
// Distribute existing pending without assignment
try {
  const pendingNulls = db.prepare("SELECT id FROM applications WHERE status='pending' AND assigned_qualty_id IS NULL ORDER BY id").all();
  for (const row of pendingNulls) {
    const qId = getNextQualtyId();
    if (qId) db.prepare("UPDATE applications SET assigned_qualty_id=? WHERE id=?").run(qId, row.id);
  }
} catch(e){}

app.get('/api/applications/my', authMiddleware, (req, res) => {
  try {
    const apps = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM applications a JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
      ORDER BY a.created_at DESC
    `).all(req.user.id);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== ADMIN ROUTES =====
app.get('/api/admin/applications', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const { agent_id } = req.query;
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language, u.language_level, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        ag.name as agent_name, ag.email as agent_email, ag.phone as agent_phone, ag.referral_code as agent_code,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id) as jobs_count,
        CASE WHEN NOT EXISTS (SELECT 1 FROM selections WHERE user_id = a.user_id AND status IN ('selected','confirmed')) THEN 1 ELSE 0 END as has_no_active_selection,
        CASE WHEN EXISTS (SELECT 1 FROM jobs WHERE application_id = a.id AND id NOT IN (SELECT job_id FROM selections WHERE user_id = a.user_id AND status = 'cancelled')) THEN 1 ELSE 0 END as has_available_jobs
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
    `;
    const params = [];
    if (getAgentRole(req) === 'qualty') {
      const qId = getAgentId(req);
      query += ' WHERE a.assigned_qualty_id = ?';
      params.push(qId);
    } else if (agent_id) {
      query += ' WHERE u.referred_by = ?';
      params.push(parseInt(agent_id));
    }
    query += ' ORDER BY a.created_at DESC';
    const apps = db.prepare(query).all(...params);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/applications/:id/approve', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('approved', req.params.id);
    if (getAgentRole(req) === 'qualty') {
      const qId = getAgentId(req);
      try { db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id); } catch(e){}
    }
    const app = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.language_level, u.language_applied
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);
    // Recording served its purpose (evaluation) - delete it to save disk, keep all data/stats
    if (app && app.audio_file) {
      try { fs.unlinkSync(path.join(uploadsDir, app.audio_file)); } catch (e) {}
      db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(req.params.id);
    }
    if (app && app.user_email) {
      const html = `
        <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
            <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
          </div>
          <h2 style="color:#66bb6a;font-size:20px;margin-bottom:16px;">تمت الموافقة على طلبك!</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">مبروك! تمت الموافقة على طلبك للانضمام إلى منصة وَظِيف.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">سيتم مراجعة ملفك وإرسال وظائف مناسبة لك قريباً. تابع حسابك على الموقع لمعرفة آخر التحديثات.</p>
          <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          </div>
        </div>
      `;
      sendEmail(app.user_email, 'تمت الموافقة على طلبك - وَظِيف', html);
    }
    saveNotification(app.user_id, null, 'approval', 'تمت الموافقة على طلبك', 'مبروك! تمت الموافقة على طلبك. تابع حسابك لمعرفة الوظائف المتاحة.');
    res.json({ success: true, user_name: app.user_name, language_level: app.language_level || '', language: app.language_applied || app.language || '' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: set applicant language level (single e.g. B2, or range e.g. A1-B1)
app.put('/api/admin/users/:id/level', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const level = (req.body && req.body.level != null) ? String(req.body.level).trim() : '';
    const valid = ['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    if (level && !valid.includes(level) && !/^(A1|A2|B1|B2|C1|C2)\s*[-–to]+\s*(A1|A2|B1|B2|C1|C2)$/i.test(level)) {
      return res.status(400).json({ error: 'المستوى غير صالح' });
    }
    db.prepare('UPDATE users SET language_level = ? WHERE id = ?').run(level, req.params.id);
    res.json({ success: true, level });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/applications/:id/reject', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const { reason } = req.body || {};
    db.prepare("UPDATE applications SET status = 'rejected', rejection_date = datetime('now'), rejection_reason = ? WHERE id = ?").run(reason || '', req.params.id);
    if (getAgentRole(req) === 'qualty') {
      const qId = getAgentId(req);
      try { db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id); } catch(e){}
    }

    const app = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);

    // Rejected recording is no longer needed - delete it to save disk
    if (app && app.audio_file) {
      try { fs.unlinkSync(path.join(uploadsDir, app.audio_file)); } catch (e) {}
      db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(req.params.id);
    }

    if (app && app.user_email) {
      const html = `
        <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
            <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
          </div>
          <h2 style="color:#e57373;font-size:20px;margin-bottom:16px;">تم رفض طلبك</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">للأسف تم رفض طلبك للانضمام إلى منصة وَظِيف.</p>
          ${reason ? `<div style="background:rgba(220,50,50,0.08);border:1px solid rgba(220,50,50,0.15);border-radius:14px;padding:18px 20px;margin-bottom:20px;">
            <h3 style="color:#e57373;font-size:14px;margin-bottom:8px;">سبب الرفض:</h3>
            <p style="color:#ccc;font-size:14px;line-height:1.7;">${reason}</p>
          </div>` : ''}
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">يجب عليك التدريب على اللغة "${app.language || ''}" وتحسين مستواك قبل التقديم مرة أخرى.</p>
          <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          </div>
        </div>
      `;
      sendEmail(app.user_email, 'تم رفض طلبك - وَظِيف', html);
    }

    saveNotification(app ? app.user_id : null, null, 'rejection', 'تم رفض طلبك', reason || 'تم رفض طلبك. يرجى التدريب والتقديم مرة أخرى.');

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/applications/:id/allow-reapply', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { reason } = req.body || {};
    db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 0, audio_file = NULL WHERE id = ?").run(req.params.id);

    const app = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);

    // Old recording no longer needed (user will submit a new one) - delete it
    if (app && app.audio_file) {
      try { fs.unlinkSync(path.join(uploadsDir, app.audio_file)); } catch (e) {}
      db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(req.params.id);
    }

    if (app && app.user_email) {
      const html = `
        <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
            <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
          </div>
          <h2 style="color:#66bb6a;font-size:20px;margin-bottom:16px;">تم السماح لك بالتقديم مجدداً</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">تمت مراجعة طلبك مرة أخرى والسماح لك بالتقديم على منصة وَظِيف.</p>
          ${reason ? `<div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.12);border-radius:14px;padding:18px 20px;margin-bottom:20px;">
            <h3 style="color:#d4a853;font-size:14px;margin-bottom:8px;">ملاحظات:</h3>
            <p style="color:#ccc;font-size:14px;line-height:1.7;">${reason}</p>
          </div>` : ''}
          <p style="color:#aaa;font-size:15px;line-height:1.8;">يمكنك الآن تسجيل صوتك مرة أخرى والتقديم. سجّل من حسابك على الموقع.</p>
          <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          </div>
        </div>
      `;
      sendEmail(app.user_email, 'تم السماح لك بالتقديم مجدداً - وَظِيف', html);
    }

    saveNotification(app.user_id, null, 'reapply', 'تم السماح لك بالتقديم مجدداً', 'يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف.');

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/applications/:id/rerecord', authMiddleware, adminOrQualtyMiddleware, async (req, res) => {
  try {
    db.prepare('UPDATE applications SET rerecord_request = 0, audio_file = NULL, status = ? WHERE id = ?').run('pending', req.params.id);
    if (getAgentRole(req) === 'qualty') {
      const qId = getAgentId(req);
      try { db.prepare("UPDATE applications SET reviewed_by=?, reviewed_at=datetime('now') WHERE id=?").run(qId, req.params.id); } catch(e){}
    }
    const app = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email
      FROM applications a JOIN users u ON a.user_id = u.id WHERE a.id = ?
    `).get(req.params.id);
    if (app && app.user_email) {
      const html = `
        <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
            <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
          </div>
          <h2 style="color:#fbbf24;font-size:20px;margin-bottom:16px;">يرجى إعادة التسجيل</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${app.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">نرجو منك إعادة تسجيل صوتك مرة أخرى. يرجى التأكد من جودة التسجيل ووضوح الصوت.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">سجّل من حسابك على الموقع واتبع الخطوات.</p>
          <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          </div>
        </div>
      `;
      sendEmail(app.user_email, 'يرجى إعادة التسجيل - وَظِيف', html);
    }
    saveNotification(app.user_id, null, 'rerecord', 'يرجى إعادة التسجيل', 'نرجو منك إعادة تسجيل صوتك مرة أخرى مع التأكد من جودة التسجيل.');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/jobs', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { application_id, company_name, position, interview_time, salary_min, salary_max, description } = req.body;
    const result = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary_min, salary_max, description) VALUES (?, ?, ?, ?, ?, ?, ?)').run(application_id, company_name, position, interview_time, salary_min || 0, salary_max || 0, description || '');
    db.prepare("UPDATE applications SET status = 'approved' WHERE id = ? AND status = 'pending'").run(application_id);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Batch add jobs - MUST be before :applicationId route
app.post('/api/admin/jobs/batch', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { application_id, user_id, jobs } = req.body;
    if (!jobs || jobs.length === 0) return res.status(400).json({ error: 'لا توجد وظائف للإضافة' });

    const insertJob = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary_min, salary_max, description, company_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const jobIds = [];
    for (const j of jobs) {
      const result = insertJob.run(application_id, j.company_name, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.company_email || '');
      jobIds.push(result.lastInsertRowid);
    }

    // Auto-approve if application is pending (admin is adding jobs)
    db.prepare("UPDATE applications SET status = 'approved' WHERE id = ? AND status = 'pending'").run(application_id);

    // Get user and agent info for notifications
    const user = db.prepare('SELECT u.*, ag.name as agent_name, ag.email as agent_email, ag.id as agent_id FROM users u LEFT JOIN agents ag ON u.referred_by = ag.id WHERE u.id = ?').get(user_id);

    // Get full user data for company email
    const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);

    if (user) {
      const jobsListHTML = jobs.map(j => `
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>${j.position}</strong> - ${j.company_name}<br>
          ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
          ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' جنيه' : j.salary_min ? 'من ' + j.salary_min + ' جنيه' : 'حتى ' + j.salary_max + ' جنيه'}<br>` : ''}
          ${j.description ? 'التفاصيل: ' + j.description : ''}
        </div>
      `).join('');

      const userEmailHTML = `
        <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#d4a853;text-align:center;">تمت إضافة وظائف لك!</h2>
          <p>مرحباً ${user.name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك. يمكنك مراجعتها من خلال لوحة التحكم الخاصة بك.</p>
          <h3 style="color:#333;">الوظائف المضافة:</h3>
          ${jobsListHTML}
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/dashboard" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">عرض الوظائف</a>
          </div>
          <p style="color:#888;font-size:12px;margin-top:30px;text-align:center;">فريق وَظِيف</p>
        </div>
      `;
      sendEmail(user.email, 'وظائف جديدة لك في وَظِيف', userEmailHTML);
      saveNotification(user_id, null, 'jobs_added', 'وظائف جديدة لك', `تمت إضافة ${jobs.length} وظيفة جديدة. افتح لوحة التحكم لعرضها.`);
    }

    if (user && user.agent_id && user.agent_email) {
      const agentEmailHTML = `
        <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#d4a853;text-align:center;">تم توظيف شخص أحيله لك!</h2>
          <p>مرحباً ${user.agent_name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة للعضو <strong>${user.name}</strong> الذي سجل من خلال رابط الإحالة الخاص بك.</p>
          <p>يمكنك متابعة التقدم من خلال لوحة تحكم المندوب.</p>
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/agent" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">لوحة تحكم المندوب</a>
          </div>
          <p style="color:#888;font-size:12px;margin-top:30px;text-align:center;">فريق وَظِيف</p>
        </div>
      `;
      sendEmail(user.agent_email, 'تم توظيف شخص من إحائك - وَظِيف', agentEmailHTML);
      saveNotification(null, user.agent_id, 'referral_hired', 'تم توظيف شخص أحيله لك', `العضو "${user.name}" تمت إضافة ${jobs.length} وظيفة له.`);
    }

    res.json({ success: true, jobIds, count: jobIds.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/jobs/:applicationId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM jobs WHERE application_id = ?').all(req.params.applicationId);
    res.json(jobs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== AGENT JOBS ROUTES =====
app.get('/api/agent/applications', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    const agentId = getAgentId(req);
    const apps = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id) as jobs_count
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE u.referred_by = ? AND a.status = 'approved'
      ORDER BY a.created_at DESC
    `).all(agentId);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/jobs/batch', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    const agentId = getAgentId(req);
    const { application_id, user_id, jobs } = req.body;
    if (!jobs || jobs.length === 0) return res.status(400).json({ error: 'لا توجد وظائف للإضافة' });

    const isOwner = db.prepare('SELECT id FROM users WHERE id = ? AND referred_by = ?').get(user_id, agentId);
    if (!isOwner && getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'ليس لديك صلاحية إضافة وظائف لهذا المستخدم' });

    const insertJob = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary_min, salary_max, description, company_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const jobIds = [];
    for (const j of jobs) {
      const result = insertJob.run(application_id, j.company_name, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.company_email || '');
      jobIds.push(result.lastInsertRowid);
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(user_id);
    if (user) {
      const jobsListHTML = jobs.map(j => `
        <div style="padding:12px;background:#f8f9fa;border-radius:8px;margin-bottom:8px;">
          <strong>${j.position}</strong> - ${j.company_name}<br>
          ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
          ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' جنيه' : j.salary_min ? 'من ' + j.salary_min + ' جنيه' : 'حتى ' + j.salary_max + ' جنيه'}<br>` : ''}
          ${j.description ? 'التفاصيل: ' + j.description : ''}
        </div>
      `).join('');

      const userEmailHTML = `
        <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#d4a853;text-align:center;">تمت إضافة وظائف لك!</h2>
          <p>مرحباً ${user.name}،</p>
          <p>تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك من المندوب. يمكنك مراجعتها من خلال لوحة التحكم الخاصة بك.</p>
          <h3 style="color:#333;">الوظائف المضافة:</h3>
          ${jobsListHTML}
          <div style="text-align:center;margin-top:30px;">
            <a href="${BASE_URL}/dashboard" style="padding:14px 40px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:14px;font-weight:700;display:inline-block;">عرض الوظائف</a>
          </div>
        </div>
      `;
      sendEmail(user.email, 'تمت إضافة وظائف لك! - وَظِيف', userEmailHTML);
      saveNotification(user_id, null, 'jobs', 'تمت إضافة وظائف جديدة', `تمت إضافة ${jobs.length} وظيفة جديدة إلى حسابك من المندوب.`);
    }

    res.json({ success: true, jobIds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agent/jobs/:applicationId', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    const jobs = db.prepare('SELECT * FROM jobs WHERE application_id = ?').all(req.params.applicationId);
    res.json(jobs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== NOTIFICATIONS ROUTES =====
app.get('/api/user/notifications', authMiddleware, (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agent/notifications', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    const agentId = getAgentId(req);
    const notifications = db.prepare('SELECT * FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50').all(agentId);
    res.json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/notifications/read-all', authMiddleware, (req, res) => {
  try {
    if (isAgentUser(req)) {
      const agentId = getAgentId(req);
      db.prepare('UPDATE notifications SET is_read = 1 WHERE agent_id = ?').run(agentId);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/stats', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const totalApps = db.prepare('SELECT COUNT(*) as c FROM applications').get().c;
    const pending = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'pending'").get().c;
    const approved = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'approved'").get().c;
    const rejected = db.prepare("SELECT COUNT(*) as c FROM applications WHERE status = 'rejected'").get().c;
    const totalJobs = db.prepare('SELECT COUNT(*) as c FROM jobs').get().c;
    const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'user'").get().c;

    const selections = db.prepare(`
      SELECT s.*, j.company_name, j.position, j.salary, j.salary_min, j.salary_max,
        u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language,
        u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        ag.name as agent_name, ag.id as agent_id, ag.phone as agent_phone
      FROM selections s
      JOIN jobs j ON s.job_id = j.id
      JOIN users u ON s.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      WHERE s.status != 'cancelled'
      ORDER BY s.created_at DESC
    `).all();

    const usersWithJobsNoSelection = db.prepare(`
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
        ag.name as agent_name, ag.id as agent_id, ag.phone as agent_phone
      FROM jobs j
      JOIN applications a ON j.application_id = a.id
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
      WHERE a.user_id NOT IN (SELECT user_id FROM selections WHERE status IN ('selected','confirmed'))
      AND a.status = 'approved'
      GROUP BY u.id
      ORDER BY MIN(j.created_at) DESC
    `).all().map(row => ({
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
      agent_phone: row.agent_phone
    }));

    const allSelections = [...selections, ...usersWithJobsNoSelection];

    const hired = selections.filter(s => s.hired === 1);
    const totalEarnings = hired.reduce((sum, s) => sum + (s.amount || 0), 0);
    const cancelled = selections.filter(s => s.hired === 0 && s.status === 'cancelled');
    const waiting = allSelections.filter(s => s.status === 'selected');

    res.json({ totalApps, pending, approved, rejected, totalJobs, totalUsers, selections: allSelections, hired, totalEarnings, cancelled, waiting });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/selections', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { user_id, job_id, hired, amount } = req.body;
    const result = db.prepare('INSERT INTO selections (user_id, job_id, hired, amount) VALUES (?, ?, ?, ?)').run(user_id, job_id, hired ? 1 : 0, amount || 0);
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/selections/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { status, hired, amount, agent_amount } = req.body;
    if (status) db.prepare('UPDATE selections SET status = ? WHERE id = ?').run(status, req.params.id);
    if (hired !== undefined) db.prepare('UPDATE selections SET hired = ? WHERE id = ?').run(hired ? 1 : 0, req.params.id);
    if (amount !== undefined) db.prepare('UPDATE selections SET amount = ? WHERE id = ?').run(amount, req.params.id);
    if (agent_amount !== undefined) db.prepare('UPDATE selections SET agent_amount = ? WHERE id = ?').run(agent_amount, req.params.id);
    if (status === 'cancelled') {
      const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.position FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
      if (sel) {
        saveNotification(sel.user_id, null, 'selection_cancelled', 'تم إلغاء التوظيف', `تم إلغاء توظيفك في شركة ${sel.company_name} للوظيفة: ${sel.position}. يمكنك التقديم مرة أخرى في أي وقت.`);
        if (sel.user_email) {
          sendEmail(sel.user_email, 'تم إلغاء توظيفك - وَظِيف', `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
              <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
              <h2 style="color:#e57373;text-align:center;margin-bottom:20px;">تم إلغاء توظيفك</h2>
              <div style="background:rgba(220,50,50,0.06);border:1px solid rgba(220,50,50,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0;"><strong style="color:#e57373;">الوظيفة:</strong> ${sel.position}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;">للأسف تم إلغاء توظيفك في هذه الشركة. يمكنك التقديم مرة أخرى في أي وقت.</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            </div>
          `);
        }
      }
    }
    if (status === 'confirmed') {
      const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE selections SET frozen_deadline = ?, hired_at = ? WHERE id = ?').run(deadline, new Date().toISOString(), req.params.id);
      const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.position, j.company_email, j.interview_time, j.salary_min, j.salary_max, j.description FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
      if (sel) {
        const agent = db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
        if (agent) {
          db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'selection_confirmed', 'تم تثبيت صفقة', `تم تثبيت صفقة ${sel.user_name} - ${sel.company_name}. مبلغك: ${agent_amount || 0} ج. سيتم التأكيد خلال 3 أسابيع وإرسال المبلغ.`);
          if (agent.email) {
            sendEmail(agent.email, 'تم تثبيت صفقة - وَظِيف', `
              <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
                <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
                <h2 style="color:#66bb6a;text-align:center;margin-bottom:20px;">تم تثبيت صفقة</h2>
                <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">العضو:</strong> ${sel.user_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">مبلغك:</strong> ${agent_amount || 0} ج</p>
                  <p style="margin:0;"><strong style="color:#fbbf24;">سيتم التأكيد خلال 3 أسابيع وإرسال المبلغ</strong></p>
                </div>
                <p style="color:#888;font-size:13px;text-align:center;">المبلغ متجمد حالياً وسيتم التأكيد خلال 3 أسابيع وإرساله.</p>
                <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
              </div>
            `);
          }
        }
        // User notification
        saveNotification(sel.user_id, null, 'selection_confirmed', 'مبروك! تم تثبيت توظيفك', `تم تثبيت توظيفك في شركة ${sel.company_name} للوظيفة: ${sel.position}. وقت المقابلة: ${sel.interview_time || 'يحدد لاحقاً'}.`);
        if (sel.user_email) {
          const salaryText = (sel.salary_min || sel.salary_max) ? (sel.salary_min && sel.salary_max ? sel.salary_min + ' - ' + sel.salary_max + ' جنيه' : sel.salary_min ? 'من ' + sel.salary_min + ' جنيه' : 'حتى ' + sel.salary_max + ' جنيه') : 'يحدد لاحقاً';
          sendEmail(sel.user_email, 'تم تثبيت صفقة عملك - وَظِيف', `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
              <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
              <h2 style="color:#66bb6a;text-align:center;margin-bottom:20px;">مبروك! تم تثبيت توظيفك</h2>
              <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:16px;">
                <p style="margin:0 0 10px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0 0 10px;"><strong style="color:#66bb6a;">الوظيفة:</strong> ${sel.position}</p>
                <p style="margin:0 0 10px;"><strong style="color:#fbbf24;">وقت المقابلة:</strong> ${sel.interview_time || 'يحدد لاحقاً'}</p>
                <p style="margin:0;"><strong style="color:#d4a853;">المرتب:</strong> ${salaryText}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;line-height:1.8;">تم تثبيت توظيفك بنجاح. تأكد من الحضور في موعد المقابلة المحدد أعلاه. بالتوفيق!</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            </div>
          `);
        }
        // Send applicant data to the company email automatically on confirm (once per selection).
        // Atomic claim first: concurrent confirms can't both pass (single UPDATE claims the flag).
        if (sel.company_email && !sel.company_emailed) {
          const claimed = db.prepare('UPDATE selections SET company_emailed = 1 WHERE id = ? AND company_emailed = 0').run(req.params.id);
          if (claimed.changes > 0) {
            const fullUser = db.prepare('SELECT * FROM users WHERE id = ?').get(sel.user_id);
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
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/selections/:id/unfreeze', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE selections SET is_frozen = 0, unfrozen_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
      // Update company counts: pending_count--, hired_count++
      db.prepare('UPDATE companies SET pending_count = MAX(0, pending_count - 1), hired_count = hired_count + 1 WHERE name = ?').run(sel.company_name);
      // Notification to user
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'hired', 'مبروك توظيفك! 🎉', `مبروك! تم توظيفك رسمياً في شركة ${sel.company_name}. بالتوفيق والنجاح في مشوارك المهني الجديد!`);
      // Congratulatory email to the hired user
      if (sel.user_email) {
        sendEmail(sel.user_email, 'مبروك توظيفك! - وَظِيف', `
          <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
            <div style="text-align:center;margin-bottom:30px;">
              <img src="${process.env.BASE_URL || 'https://wazef.com'}/uploads/wazef.png" alt="وَظِيف" style="width:180px;border-radius:12px;">
              <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
            </div>
            <div style="text-align:center;margin-bottom:24px;">
              <div style="width:70px;height:70px;background:linear-gradient(135deg,#66bb6a,#2e7d32);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:16px;">🎉</div>
              <h2 style="color:#66bb6a;font-size:24px;margin-bottom:8px;">مبروك توظيفك!</h2>
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
              <a href="${process.env.BASE_URL || 'https://wazef.com'}/login.html" style="display:inline-block;margin-top:12px;padding:10px 28px;background:linear-gradient(135deg,#b8860b,#d4a853);color:#0a0a0a;text-decoration:none;border-radius:10px;font-weight:700;font-size:14px;">شارك أصدقائك الآن</a>
            </div>
            <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);">
              <p style="color:#555;font-size:12px;margin:0;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
            </div>
          </div>
        `);
      }
      const agent = db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
      if (agent) {
         db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'unfreeze', 'تم فك تجميد المبلغ', `تم فك تجميد مبلغ ${sel.agent_amount} ج لـ ${sel.user_name}. المبلغ دخل حسابك.`);
        if (agent.email) {
          sendEmail(agent.email, 'تم فك تجميد المبلغ - وَظِيف', `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
              <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
              <h2 style="color:#66bb6a;text-align:center;margin-bottom:20px;">تم فك تجميد المبلغ</h2>
              <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">العضو:</strong> ${sel.user_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">المبلغ:</strong> ${sel.agent_amount} ج</p>
                <p style="margin:0;"><strong style="color:#66bb6a;">المبلغ دخل حسابك بنجاح</strong></p>
              </div>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            </div>
          `);
        }
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/selections/:id/apologize', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { reason } = req.body;
    db.prepare('UPDATE selections SET is_frozen = 0, apology = ?, amount = 0, agent_amount = 0, hired = 0, status = ? WHERE id = ?').run(reason || 'تم الإعتذار عن الصفقة', 'cancelled', req.params.id);
    const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
      db.prepare('UPDATE companies SET pending_count = MAX(0, pending_count - 1) WHERE name = ?').run(sel.company_name);
      // Reset user completely: delete all jobs, selections, reset application
      const userJobs = db.prepare('SELECT id FROM jobs WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)').all(sel.user_id);
      for (const j of userJobs) { db.prepare('DELETE FROM selections WHERE job_id = ?').run(j.id); }
      db.prepare('DELETE FROM jobs WHERE application_id IN (SELECT id FROM applications WHERE user_id = ?)').run(sel.user_id);
      db.prepare("UPDATE applications SET status = 'pending', audio_file = NULL, rejection_date = NULL, rejection_reason = NULL WHERE user_id = ?").run(sel.user_id);
      const agent = db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
      if (agent) {
        db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'apology', 'تم الإعتذار عن الصفقة', `تم الإعتذار عن صفقة ${sel.user_name} - ${sel.company_name}. سبب: ${reason || 'لم يحدد'}`);
        if (agent.email) {
          sendEmail(agent.email, 'تم الإعتذار عن صفقة - وَظِيف', `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
              <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
              <h2 style="color:#e57373;text-align:center;margin-bottom:20px;">تم الإعتذار عن الصفقة</h2>
              <div style="background:rgba(220,50,50,0.06);border:1px solid rgba(220,50,50,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">العضو:</strong> ${sel.user_name}</p>
                <p style="margin:0 0 8px;"><strong style="color:#e57373;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0;"><strong style="color:#e57373;">السبب:</strong> ${reason || 'لم يحدد'}</p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;">تم إلغاء هذه الصفقة من قبل الإدارة.</p>
              <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
            </div>
          `);
        }
      }
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'apology', 'يمكنك التقديم مجدداً', `للأسف تم رفضك في شركة ${sel.company_name}. لا تقلق، هناك فرص أكثر في انتظارك! يمكنك التقديم مجدداً.`);
      if (sel.user_email) {
        sendEmail(sel.user_email, 'يمكنك التقديم مجدداً - وَظِيف', `
          <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
            <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
            <h2 style="color:#d4a853;text-align:center;margin-bottom:20px;">يمكنك التقديم مجدداً</h2>
            <div style="background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;"><strong style="color:#d4a853;">الشركة:</strong> ${sel.company_name}</p>
            </div>
            <p style="color:#ccc;font-size:14px;text-align:center;line-height:1.8;margin-bottom:16px;">للأسف تم رفضك في هذه الشركة.<br>لا تقلق، هناك فرص أكثر في انتظارك!</p>
            <p style="color:#d4a853;font-size:13px;text-align:center;font-weight:700;">يمكنك التقديم مجدداً والبحث عن فرصة أفضل</p>
            <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
          </div>
        `);
      }
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/selections/:id/allow-reapply', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const sel = db.prepare(`
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM selections s JOIN users u ON s.user_id = u.id WHERE s.id = ?
    `).get(req.params.id);
    if (!sel) return res.status(404).json({ error: 'الاختيار غير موجود' });

    db.prepare('DELETE FROM selections WHERE id = ?').run(req.params.id);

    const app_row = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(sel.user_id);
    if (app_row) {
      db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 0, audio_file = NULL WHERE id = ?").run(app_row.id);
      // Old recording no longer needed (user will submit a new one)
      if (app_row.audio_file) {
        try { fs.unlinkSync(path.join(uploadsDir, app_row.audio_file)); } catch (e) {}
        db.prepare('UPDATE applications SET audio_file = NULL WHERE id = ?').run(app_row.id);
      }
    }

    saveNotification(sel.user_id, null, 'reapply', 'تم السماح لك بالتقديم مجدداً', 'يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف.');

    if (sel.user_email) {
      const html = `
        <div dir="rtl" style="font-family:'Tajawal',Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 30px;background:#0a0a0a;color:#f5f0e8;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:30px;">
            <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;">
            <h1 style="font-size:28px;background:linear-gradient(135deg,#f0d78c,#b8860b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:12px 0 4px;">وَظِيف</h1>
          </div>
          <h2 style="color:#66bb6a;font-size:20px;margin-bottom:16px;">تم السماح لك بالتقديم مجدداً</h2>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:12px;">مرحباً ${sel.user_name},</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;margin-bottom:16px;">تم إلغاء صفقة العمل السابقة والسماح لك بالتقديم على منصة وَظيف مرة أخرى.</p>
          <p style="color:#aaa;font-size:15px;line-height:1.8;">يمكنك الآن تسجيل صوتك مرة أخرى والتقديم على وظائف جديدة.</p>
          <div style="text-align:center;margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06);">
            <p style="color:#555;font-size:13px;">منصة <span style="color:#d4a853;font-weight:700;">وَظِيف</span> للتوظيف الذكي</p>
          </div>
        </div>
      `;
      sendEmail(sel.user_email, 'تم السماح لك بالتقديم مجدداً - وَظِيف', html);
    }

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/companies', authMiddleware, (req, res) => {
  try {
    const companies = db.prepare('SELECT * FROM companies WHERE available_slots > used_slots ORDER BY name').all();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: get all companies (including full ones)
app.get('/api/admin/companies', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

 // Admin: add company
 app.post('/api/admin/companies', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
   try {
     const { name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before } = req.body;
      if (!name) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
      const result = db.prepare('INSERT INTO companies (name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5);
      res.json({ id: result.lastInsertRowid });
   } catch (e) {
     res.status(500).json({ error: e.message });
  }
});

// Admin: update company
app.put('/api/admin/companies/:id', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
   try {
      const { name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before } = req.body;
      db.prepare('UPDATE companies SET name=?, position=?, description=?, interview_time=?, interview_schedule=?, salary_min=?, salary_max=?, company_email=?, available_slots=?, deadline=?, notify_days_before=? WHERE id=?').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: delete company
app.delete('/api/admin/companies/:id', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: get company schedule & history
app.get('/api/admin/company/:id/schedule', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const companyId = req.params.id;
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
    if (!company) return res.status(404).json({ error: 'الشركة غير موجودة' });
    
    // Get all jobs for this company with their interviews and candidates
    const jobs = db.prepare(`
      SELECT j.*, 
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status != 'cancelled') as pending_candidates,
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status = 'cancelled') as cancelled_candidates,
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status = 'confirmed') as confirmed_candidates,
        (SELECT GROUP_CONCAT(u.name, ', ') FROM selections s JOIN jobs j2 ON s.job_id = j2.id JOIN users u ON s.user_id = u.id WHERE j2.id = j.id AND s.status != 'cancelled') as candidate_names,
        (SELECT GROUP_CONCAT(u.name, ', ') FROM selections s JOIN jobs j2 ON s.job_id = j2.id JOIN users u ON s.user_id = u.id WHERE j2.id = j.id AND s.status = 'cancelled') as cancelled_names
      FROM jobs j
      WHERE j.company_name = ?
      ORDER BY j.created_at DESC
    `).all(company.name);
    
    // Get interview schedule grouped by day
    const schedule = db.prepare(`
      SELECT j.interview_time, 
        COUNT(DISTINCT j.id) as job_count,
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status != 'cancelled') as candidates
      FROM jobs j
      WHERE j.company_name = ? AND j.interview_time IS NOT NULL AND j.interview_time != ''
      GROUP BY j.interview_time
      ORDER BY j.interview_time
    `).all(company.name);
    
    // Get history (selections for this company)
    const history = db.prepare(`
      SELECT s.*, u.name as user_name, j.position, j.interview_time, j.created_at as job_created_at
      FROM selections s
      JOIN jobs j ON s.job_id = j.id
      JOIN users u ON s.user_id = u.id
      WHERE j.company_name = ?
      ORDER BY s.created_at DESC
      LIMIT 50
    `).all(company.name);
    
    res.json({ company, jobs, schedule, history });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

  // Admin: restart company plan (reset counters + new deadline only, no cancel)
  app.post('/api/admin/companies/:id/restart', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
    try {
      const companyId = req.params.id;
      const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(companyId);
      if (!company) return res.status(404).json({ error: 'الشركة غير موجودة' });
      
      // Reset counters and set new deadline to 1 month from now
      const newDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      db.prepare('UPDATE companies SET pending_count = 0, hired_count = 0, used_slots = 0, deadline = ? WHERE id = ?').run(newDeadline, companyId);
      
      // Clear old admin notifications for this company
      db.prepare('DELETE FROM admin_notifications WHERE company_id = ?').run(companyId);
      
      res.json({ success: true, message: 'تم إعادة العدادات والموعد النهائي', newDeadline });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: check deadlines and create admin notifications
  app.get('/api/admin/check-deadlines', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
    try {
      const companies = db.prepare("SELECT * FROM companies WHERE deadline IS NOT NULL AND deadline != ''").all();
      const now = new Date();
      const alerts = [];
      companies.forEach(company => {
        const deadline = new Date(company.deadline + 'T00:00:00');
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        const notifyAt = company.notify_days_before || 5;
        const needed = (company.available_slots || 0) - (company.hired_count || 0);
        if (diffDays <= notifyAt && diffDays >= 0 && needed > 0) {
          // Check if already pending OR accepted notification for this company
          const existing = db.prepare("SELECT id FROM admin_notifications WHERE company_id = ? AND status IN ('pending','accepted')").get(company.id);
          if (!existing) {
            db.prepare('INSERT INTO admin_notifications (company_id, type, message, status) VALUES (?, ?, ?, ?)').run(
              company.id, 'deadline_alert', `الشركة ${company.name} تنتهي في ${diffDays} يوم! مطلوب ${needed} شخص.`, 'pending'
            );
            alerts.push({ company: company.name, days: diffDays, needed });
          }
        }
      });
      res.json({ success: true, alertsFound: alerts.length, alerts });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: get pending notifications
  app.get('/api/admin/pending-notifications', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
    try {
      const notifs = db.prepare(`
        SELECT an.*, c.name as company_name, c.deadline, c.available_slots, c.hired_count, c.notify_days_before
        FROM admin_notifications an
        JOIN companies c ON an.company_id = c.id
        WHERE an.status = 'pending'
        ORDER BY an.created_at DESC
      `).all();
      res.json(notifs);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: accept notification → send to agents
  app.post('/api/admin/pending-notifications/:id/accept', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
    try {
      const notif = db.prepare('SELECT an.*, c.name as company_name, c.position, c.available_slots, c.hired_count FROM admin_notifications an JOIN companies c ON an.company_id = c.id WHERE an.id = ?').get(req.params.id);
      if (!notif) return res.status(404).json({ error: 'الإشعار غير موجود' });
      
      // Get all active agents
      const agents = db.prepare(`SELECT id, name, email FROM agents WHERE is_active = 1`).all();
      
      const deadline = new Date(notif.deadline + 'T00:00:00');
      const diffDays = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
      const needed = (notif.available_slots || 0) - (notif.hired_count || 0);
      
      agents.forEach(a => {
        db.prepare('INSERT INTO notifications (agent_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(
          a.id, 'deadline_approaching', 'تنبيه: عاجل',
          `هناك شركة تريد الإسراع في عملية التوظيف (${notif.company_name}) - مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.`,
          0, new Date().toISOString()
        );
        sendEmail(a.email || '', 'تنبيه: إسراع التوظيف', `<h2>شركة ${notif.company_name} تريد الإسراع</h2><p>مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.</p>`);
      });
      
      db.prepare("UPDATE admin_notifications SET status = 'accepted' WHERE id = ?").run(req.params.id);
      res.json({ success: true, message: `تم إرسال ${agents.length} إشعار للمندوبين`, agentsCount: agents.length });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin: reject notification
  app.post('/api/admin/pending-notifications/:id/reject', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
    try {
      db.prepare("UPDATE admin_notifications SET status = 'rejected' WHERE id = ?").run(req.params.id);
      res.json({ success: true, message: 'تم رفض الإشعار' });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });


// Admin: redo company plan (reset schedule)
app.get('/api/user/jobs', authMiddleware, (req, res) => {
  try {
    const apps = db.prepare("SELECT id FROM applications WHERE user_id = ? AND status = 'approved'").all(req.user.id);
    const appIds = apps.map(a => a.id);
    if (appIds.length === 0) return res.json([]);
    const placeholders = appIds.map(() => '?').join(',');
    const jobs = db.prepare(`SELECT * FROM jobs WHERE application_id IN (${placeholders})`).all(...appIds);
    const cancelledJobs = db.prepare(`SELECT job_id FROM selections WHERE user_id = ? AND status = 'cancelled'`).all(req.user.id);
    const cancelledIds = new Set(cancelledJobs.map(c => c.job_id));
    const jobsWithStatus = jobs.map(j => ({ ...j, is_cancelled: cancelledIds.has(j.id) }));
    res.json(jobsWithStatus);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/user/select-job', authMiddleware, (req, res) => {
  try {
    const { job_id } = req.body;
    const cancelled = db.prepare("SELECT id FROM selections WHERE user_id = ? AND job_id = ? AND status = 'cancelled'").get(req.user.id, job_id);
    if (cancelled) return res.status(400).json({ error: 'تم إلغاء هذا التوظيف سابقاً ولا يمكنك اختياره مرة أخرى' });
    const active = db.prepare("SELECT id FROM selections WHERE user_id = ? AND status != 'cancelled'").get(req.user.id);
    if (active) return res.status(400).json({ error: 'لقد قمت باختيار وظيفة بالفعل ولا يمكنك اختيار أكثر من وظيفة واحدة' });
    const result = db.prepare('INSERT INTO selections (user_id, job_id, status) VALUES (?, ?, ?)').run(req.user.id, job_id, 'selected');
    const job = db.prepare('SELECT company_name FROM jobs WHERE id = ?').get(job_id);
    if (job) {
      db.prepare('UPDATE companies SET pending_count = pending_count + 1 WHERE name = ?').run(job.company_name);
    }
    res.json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/selections', authMiddleware, (req, res) => {
  try {
    const selections = db.prepare(`
      SELECT s.*, j.company_name, j.position, j.interview_time, j.salary, j.salary_min, j.salary_max, j.description
      FROM selections s
      JOIN jobs j ON s.job_id = j.id
      WHERE s.user_id = ? AND s.status != 'cancelled'
    `).all(req.user.id);
    res.json(selections);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/application-status', authMiddleware, (req, res) => {
  try {
    const app = db.prepare("SELECT * FROM applications WHERE user_id = ? ORDER BY CASE WHEN status IN ('pending','approved') THEN 0 ELSE 1 END, created_at DESC LIMIT 1").get(req.user.id);
    if (!app) return res.json(null);
    
    // Check if user was hired (unfrozen) → return hired status with company info
    if (app.status === 'approved') {
      const confirmedSelection = db.prepare("SELECT hired_at, company_name, is_frozen, unfrozen_at FROM selections s JOIN jobs j ON s.job_id = j.id WHERE s.user_id = ? AND s.status = 'confirmed' AND s.hired = 1 ORDER BY hired_at DESC LIMIT 1").get(req.user.id);
      if (confirmedSelection && confirmedSelection.hired_at && !confirmedSelection.is_frozen) {
        const hiredDate = new Date(confirmedSelection.hired_at);
        const threeMonthsLater = new Date(hiredDate.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (new Date() >= threeMonthsLater) {
          db.prepare("UPDATE applications SET status = 'pending', rejection_reason = NULL, rejection_date = NULL WHERE id = ?").run(app.id);
          db.prepare("UPDATE selections SET status = 'cancelled' WHERE user_id = ? AND status = 'confirmed'").run(req.user.id);
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
        db.prepare("UPDATE applications SET status = 'pending', rejection_reason = NULL, rejection_date = NULL WHERE id = ?").run(app.id);
        app.status = 'pending';
        app.rejection_reason = null;
        app.rejection_date = null;
      }
    }
    
    res.json(app);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== AGENT ROUTES =====
function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SSS-';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

app.post('/api/admin/agents', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    const exists = db.prepare('SELECT id FROM agents WHERE email = ?').get(email);
    if (exists) return res.status(400).json({ error: 'البريد موجود بالفعل' });
    const hash = bcrypt.hashSync(password, 10);
    const referralCode = generateReferralCode();
    const result = db.prepare('INSERT INTO agents (name, email, phone, password, referral_code, created_by) VALUES (?, ?, ?, ?, ?, ?)').run(name, email, phone || '', hash, referralCode, req.user.id);
    res.json({ id: result.lastInsertRowid, referral_code: referralCode });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin creates a ready-to-use verified user (no email verification needed)
app.post('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name, email, password, phone, gender } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(400).json({ error: 'البريد موجود بالفعل' });
    const hash = bcrypt.hashSync(password, 10);
    const g = gender === 'female' ? 'female' : 'male';
    const result = db.prepare(`INSERT INTO users (name, email, password, phone, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(name, email, hash, phone || '', 'مصري', 'Cairo', 'ar', 25, '00000000000000', 'التجارة', 'graduate', g === 'female' ? 'na' : 'exempt', 'no', g);
    res.json({ id: result.lastInsertRowid, email });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Manual database backup (emailed to owner)
app.post('/api/admin/backup', authMiddleware, adminMiddleware, async (req, res) => {
  const r = await backupDatabase(true);
  res.json(r);
});

// Download database backup file
app.get('/api/admin/backup/download', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const dbPath = path.join(dataDir, 'app.db');
    if (!fs.existsSync(dbPath)) return res.status(404).json({ error: 'قاعدة البيانات غير موجودة' });
    const format = req.query.format || 'db';
    if (format === 'sql') {
      // Export as SQL dump
      const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
      let sql = '-- وَظِيف Database Backup\n-- ' + new Date().toISOString() + '\n\n';
      sql += 'PRAGMA journal_mode=WAL;\n\n';
      for (const t of tables) {
        sql += t.sql + ';\n\n';
        const rows = db.prepare('SELECT * FROM ' + t.name).all();
        for (const row of rows) {
          const vals = Object.values(row).map(v => v === null ? 'NULL' : typeof v === 'string' ? "'" + v.replace(/'/g, "''") + "'" : v);
          sql += 'INSERT INTO ' + t.name + ' VALUES (' + vals.join(', ') + ');\n';
        }
        sql += '\n';
      }
      res.setHeader('Content-Type', 'text/sql; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="wazeef-backup-' + new Date().toISOString().slice(0, 10) + '.sql"');
      res.send(sql);
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="wazeef-backup-' + new Date().toISOString().slice(0, 10) + '.db"');
      res.setHeader('Content-Type', 'application/x-sqlite3');
      fs.createReadStream(dbPath).pipe(res);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const restoreUpload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Restore database from uploaded backup file (applies on restart)
app.post('/api/admin/restore', authMiddleware, adminMiddleware, restoreUpload.single('backup'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'من فضلك اختر ملف النسخة' });
    const p = req.file.path;
    const fd = fs.openSync(p, 'r');
    const head = Buffer.alloc(16);
    fs.readSync(fd, head, 0, 16, 0);
    fs.closeSync(fd);
    const isSql = head.toString('latin1', 0, 2) === '--' || head.toString('latin1', 0, 2) === 'PR' || head.toString('latin1', 0, 2) === '/*' || (req.file && req.file.originalname && req.file.originalname.endsWith('.sql'));
    if (head.toString('latin1', 0, 16) !== 'SQLite format 3\0' && !isSql) {
      fs.unlinkSync(p);
      return res.status(400).json({ error: 'الملف ليس قاعدة بيانات أو ملف SQL صالح' });
    }
    if (isSql) {
      const sqlContent = fs.readFileSync(p, 'utf8');
      fs.unlinkSync(p);
      try {
        const stmts = sqlContent.split(';').filter(s => s.trim());
        for (const stmt of stmts) {
          if (stmt.trim()) {
            try { db.exec(stmt + ';'); } catch (e) { console.log('SQL skip:', e.message); }
          }
        }
      } catch (e) {
        return res.status(500).json({ error: 'خطأ في تنفيذ SQL: ' + e.message });
      }
      res.json({ success: true, message: 'تم استرجاع البيانات من ملف SQL بنجاح' });
      return;
    }
    // Validate .db file
    const sqlJs = require('sql.js');
    const SQL = await sqlJs();
    const buf = fs.readFileSync(p);
    const t = new SQL.Database(buf, { readonly: true });
    try {
      const res = t.exec("SELECT COUNT(*) as c FROM sqlite_master WHERE type='table' AND name='users'");
      if (!res.length || !res[0].values.length || !res[0].values[0][0]) throw new Error('bad db');
    } finally {
      t.close();
    }
    const dest = path.join(dataDir, 'restore.pending.db');
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(p, dest);
    res.json({ success: true, message: 'تم قبول النسخة، سيتم الاسترجاع بعد إعادة التشغيل' });
    setTimeout(() => process.exit(0), 800);
  } catch (e) {
    console.error('Restore error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/agents', authMiddleware, adminOrQualtyMiddleware, (req, res) => {
  try {
    const agents = db.prepare('SELECT id, name, email, phone, referral_code, is_active, role, created_at FROM agents ORDER BY created_at DESC').all();
    const agentsWithStats = agents.map(a => {
      const referredUsers = db.prepare('SELECT COUNT(*) as c FROM users WHERE referred_by = ?').get(a.id).c;
      const referredWithApps = db.prepare(`
        SELECT COUNT(*) as c FROM users u
        JOIN applications a ON u.id = a.user_id
        WHERE u.referred_by = ?
      `).get(a.id).c;
      const hired = db.prepare(`
        SELECT COUNT(*) as c FROM users u
        JOIN selections s ON u.id = s.user_id
        WHERE u.referred_by = ? AND s.hired = 1
      `).get(a.id).c;
      return { ...a, referredUsers, referredWithApps, hired };
    });
    res.json(agentsWithStats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agent earnings breakdown
app.get('/api/admin/agent-earnings', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const agents = db.prepare('SELECT id, name, email, phone, referral_code FROM agents ORDER BY created_at DESC').all();
    const result = agents.map(a => {
      const hiredSelections = db.prepare(`
        SELECT s.amount, s.agent_amount, s.created_at,
          j.company_name, j.position, u.name as user_name
        FROM selections s
        JOIN users u ON s.user_id = u.id
        JOIN jobs j ON s.job_id = j.id
        WHERE u.referred_by = ? AND s.hired = 1
      `).all(a.id);
      const cancelledSelections = db.prepare(`
        SELECT COUNT(*) as c FROM selections s
        JOIN users u ON s.user_id = u.id
        WHERE u.referred_by = ? AND s.status = 'cancelled'
      `).get(a.id).c;
      const waitingSelections = db.prepare(`
        SELECT COUNT(*) as c FROM selections s
        JOIN users u ON s.user_id = u.id
        WHERE u.referred_by = ? AND s.status = 'selected'
      `).get(a.id).c;
      const totalAgentEarnings = hiredSelections.reduce((sum, s) => sum + (s.agent_amount || 0), 0);
      const totalCompanyEarnings = hiredSelections.reduce((sum, s) => sum + (s.amount || 0), 0);
      const highest = hiredSelections.length > 0 ? Math.max(...hiredSelections.map(s => s.agent_amount || 0)) : 0;
      const lowest = hiredSelections.length > 0 ? Math.min(...hiredSelections.map(s => s.agent_amount || 0)) : 0;
      return {
        id: a.id, name: a.name, email: a.email, phone: a.phone, referral_code: a.referral_code,
        totalHired: hiredSelections.length,
        totalCancelled: cancelledSelections,
        totalWaiting: waitingSelections,
        totalAgentEarnings,
        totalCompanyEarnings,
        highestEarning: highest,
        lowestEarning: lowest,
        details: hiredSelections
      };
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agent rankings (monthly/yearly)
app.get('/api/admin/agent-rankings', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period, year, month } = req.query;
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
      const monthStart = `${myYear}-${String(my).padStart(2,'0')}-01`;
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
      WHERE a.is_active = 1
      GROUP BY a.id, a.name, a.email, a.phone, a.referral_code
      HAVING COUNT(s.id) > 0
      ORDER BY COUNT(s.id) DESC, COALESCE(SUM(s.amount), 0) DESC, COALESCE(SUM(s.agent_amount), 0) DESC, a.name ASC
    `;
    const rankings = db.prepare(query).all(...params);
    res.json(rankings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Qualty rankings (monthly/yearly) - same shape as agent rankings
app.get('/api/admin/qualty-rankings', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { period, year, month } = req.query;
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
      const monthStart = `${myYear}-${String(my).padStart(2,'0')}-01`;
      const monthEnd = new Date(myYear, my, 0).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ? AND app.reviewed_at <= ?`;
      dateClauseSel = `AND s.created_at >= ? AND s.created_at <= ?`;
      paramsApp.push(monthStart, monthEnd + ' 23:59:59');
      paramsSel.push(monthStart, monthEnd + ' 23:59:59');
    } else if (period === '3months') {
      const startDate = new Date(targetYear, targetMonth - 3, 1).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ?`;
      dateClauseSel = `AND s.created_at >= ?`;
      paramsApp.push(startDate); paramsSel.push(startDate);
    } else if (period === '4months') {
      const startDate = new Date(targetYear, targetMonth - 4, 1).toISOString().split('T')[0];
      dateClauseApp = `AND app.reviewed_at >= ?`;
      dateClauseSel = `AND s.created_at >= ?`;
      paramsApp.push(startDate); paramsSel.push(startDate);
    } else if (period === 'year') {
      const yearStart = `${targetYear}-01-01`;
      const yearEnd = `${targetYear}-12-31 23:59:59`;
      dateClauseApp = `AND app.reviewed_at >= ? AND app.reviewed_at <= ?`;
      dateClauseSel = `AND s.created_at >= ? AND s.created_at <= ?`;
      paramsApp.push(yearStart, yearEnd); paramsSel.push(yearStart, yearEnd);
    }
    // For each qualty, count approved and hired in period
    const qualtys = db.prepare("SELECT id, name, email, phone, referral_code FROM agents WHERE role='qualty' AND is_active=1 ORDER BY id").all();
    const rankings = qualtys.map(q => {
      const approved = db.prepare(`SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by=? AND app.status='approved' ${dateClauseApp}`).get(q.id, ...paramsApp).c;
      const rejected = db.prepare(`SELECT COUNT(*) as c FROM applications app WHERE app.reviewed_by=? AND app.status='rejected' ${dateClauseApp}`).get(q.id, ...paramsApp).c;
      const hired = db.prepare(`SELECT COUNT(*) as c FROM selections s JOIN applications app ON s.user_id=app.user_id WHERE app.reviewed_by=? AND s.hired=1 ${dateClauseSel}`).get(q.id, ...paramsSel).c;
      return {
        id: q.id, name: q.name, email: q.email, phone: q.phone, referral_code: q.referral_code,
        hired: hired, approved: approved, rejected: rejected,
        company_earned: approved * 1000, // dummy for sorting compatibility
        agent_earned: hired * 500
      };
    }).filter(r => r.approved > 0 || r.hired > 0 || r.rejected > 0);
    rankings.sort((a,b)=> b.hired - a.hired || b.approved - a.approved || a.name.localeCompare(b.name));
    res.json(rankings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/ranking-years', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const years = db.prepare(`
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
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/qualty-ranking-years', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const years = db.prepare(`
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
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/agents/:id/toggle', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const agent = db.prepare('SELECT is_active FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    db.prepare('UPDATE agents SET is_active = ? WHERE id = ?').run(agent.is_active ? 0 : 1, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/agents/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'الاسم مطلوب' });
    const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'المندوب غير موجود' });
    db.prepare('UPDATE agents SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/agents/:id/password', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    const agent = db.prepare('SELECT id FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'المندوب غير موجود' });
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE agents SET password = ? WHERE id = ?').run(hash, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/agents/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'المندوب غير موجود' });
    db.prepare('UPDATE users SET referred_by = NULL WHERE referred_by = ?').run(req.params.id);
    db.prepare('DELETE FROM agents WHERE id = ?').run(req.params.id);
    res.json({ success: true });
    if (agent.email) {
      sendEmail(agent.email, 'تم حذف حسابك - وَظِيف', `
        <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
          <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
          <h2 style="color:#e57373;text-align:center;margin-bottom:20px;">تم حذف حسابك</h2>
          <p style="color:#888;font-size:13px;text-align:center;">تم حذف حسابك كمندوب من المنصة. الأعضاء الذين كانوا مسجّلين عبر رابطك تم تحويلهم للتسجيل المباشر.</p>
          <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
        </div>
      `).catch(e => console.log('Email error:', e.message));
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Admin: promote/demote agent
app.post('/api/admin/agents/:id/promote', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id);
    if (!agent) return res.status(404).json({ error: 'المندوب غير موجود' });
    const newRole = agent.role === 'qualty' ? 'agent' : 'qualty';
    db.prepare('UPDATE agents SET role = ? WHERE id = ?').run(newRole, req.params.id);
    const label = newRole === 'qualty' ? 'ترقية' : 'تخفيض';
    res.json({ success: true, message: `تم ${label} المندوب إلى ${newRole}`, newRole });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agent login
app.post('/api/agent/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = db.prepare('SELECT * FROM agents WHERE email = ? AND is_active = 1').get(email);
    if (!agent) return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    if (!bcrypt.compareSync(password, agent.password)) return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    const agentRole = agent.role || 'agent';
    const token = jwt.sign({ id: agent.id, name: agent.name, email: agent.email, role: agentRole, agent_id: agent.id, referral_code: agent.referral_code }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, role: agentRole, referral_code: agent.referral_code } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agent dashboard stats
app.get('/api/agent/stats', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    const agentId = getAgentId(req);
    const agentRow = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agentRow) return res.status(404).json({ error: 'Agent not found' });
    const totalReferred = db.prepare('SELECT COUNT(*) as c FROM users WHERE referred_by = ?').get(agentId).c;
    const withApplication = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ?
    `).get(agentId).c;
    const hired = db.prepare(`
      SELECT COUNT(*) as c FROM users u
      JOIN selections s ON u.id = s.user_id
      WHERE u.referred_by = ? AND s.hired = 1
    `).get(agentId).c;
    const pending = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'pending'
    `).get(agentId).c;
    const approved = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'approved'
    `).get(agentId).c;
    const rejected = db.prepare(`
      SELECT COUNT(DISTINCT u.id) as c FROM users u
      JOIN applications a ON u.id = a.user_id
      WHERE u.referred_by = ? AND a.status = 'rejected'
    `).get(agentId).c;

    // Earnings data (agent's own amounts only - company earnings never exposed to agents)
    const earnings = db.prepare(`
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
    
    const allAgentsMonth = db.prepare(`
      SELECT a.id, COALESCE(SUM(s.agent_amount), 0) as earned
      FROM agents a
      LEFT JOIN users u ON u.referred_by = a.id
      LEFT JOIN selections s ON s.user_id = u.id AND s.hired = 1 AND s.created_at >= ? AND s.created_at <= ?
      WHERE a.is_active = 1
      GROUP BY a.id
      ORDER BY earned DESC
    `).all(rankMonthStart, rankMonthEnd);
    
    const myRank = allAgentsMonth.findIndex(a => a.id === agentId) + 1;
    const totalActiveAgents = allAgentsMonth.length;

    const frozenSelections = db.prepare(`
      SELECT s.agent_amount, s.frozen_deadline, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE u.referred_by = ? AND s.hired = 1 AND s.is_frozen = 1
      ORDER BY s.created_at DESC
    `).all(agentId);

    const frozenTotal = frozenSelections.reduce((sum, f) => sum + (f.agent_amount || 0), 0);

    const referredUsers = db.prepare(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
        (SELECT id FROM applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as app_id,
        (SELECT status FROM applications WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as app_status,
        (SELECT COUNT(*) FROM selections WHERE user_id = u.id AND hired = 1) as is_hired,
        (SELECT COALESCE(SUM(agent_amount), 0) FROM selections WHERE user_id = u.id AND hired = 1) as earned_amount,
        (SELECT COUNT(*) FROM jobs j2 JOIN applications a2 ON j2.application_id = a2.id WHERE a2.user_id = u.id) as jobs_count,
        (SELECT id FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_id,
        (SELECT status FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_status,
        (SELECT apology FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_apology,
        (SELECT is_frozen FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_frozen,
        (SELECT j2.company_name FROM selections s2 JOIN jobs j2 ON s2.job_id = j2.id WHERE s2.user_id = u.id ORDER BY s2.created_at DESC LIMIT 1) as sel_company
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).all(agentId);

    res.json({ totalReferred, withApplication, hired, pending, approved, rejected, referredUsers,
      earnings, totalAgentEarnings,
      todayEarnings, weekEarnings, monthEarnings,
      todayHired, weekHired, monthHired,
      frozenTotal, frozenSelections,
      myRank, totalActiveAgents,
       role: (req.user.agent_role || agentRow.role || 'agent'),
       qualtyStats: (() => {
         if ((agentRow.role||'agent') !== 'qualty') return null;
         try {
           const approved = db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND status='approved'").get(agentId).c;
           const rejected = db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND status='rejected'").get(agentId).c;
           const rerecord = db.prepare("SELECT COUNT(*) as c FROM applications WHERE reviewed_by=? AND rerecord_request=1").get(agentId).c;
           const hired = db.prepare("SELECT COUNT(*) as c FROM selections s JOIN applications a ON s.user_id=a.user_id WHERE a.reviewed_by=? AND s.hired=1").get(agentId).c;
           const qualtyPending = db.prepare("SELECT COUNT(*) as c FROM applications WHERE assigned_qualty_id=? AND status='pending'").get(agentId).c;
           const qualtyApproved = approved;
           const qualtyRejected = rejected;
           return { approved: qualtyApproved, rejected: qualtyRejected, rerecord, hired, pending: qualtyPending };
         } catch(e){ return null; }
       })()
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Register with referral code
app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, ref, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender } = req.body;
    if (!name || !email || !password || !phone || !nationality || !city || !language_applied || !age || !national_id || !college || !education_level || !call_center_experience || !gender) {
      return res.status(400).json({ error: 'من فضلك أكمل كل الحقول المطلوبة' });
    }
    if (gender !== 'male' && gender !== 'female') {
      return res.status(400).json({ error: 'من فضلك اختر النوع' });
    }
    const milStatus = gender === 'female' ? 'na' : military_status;
    if (gender === 'male' && !milStatus) {
      return res.status(400).json({ error: 'من فضلك اختر الوضع العسكري' });
    }
    if (typeof name !== 'string' || name.length < 3 || /\d/.test(name)) {
      return res.status(400).json({ error: 'الاسم يجب أن يحتوي على حروف فقط (3 أحرف على الأقل)' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'البريد الإلكتروني غير صحيح' });
    }
    if (!/^[0-9]{11}$/.test(phone)) {
      return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون 11 رقم' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 16 || ageNum > 80) {
      return res.status(400).json({ error: 'العمر يجب أن يكون بين 16 و 80' });
    }
    if (/\d/.test(nationality)) {
      return res.status(400).json({ error: 'الجنسية يجب أن تحتوي على حروف فقط' });
    }
    if (/\d/.test(college)) {
      return res.status(400).json({ error: 'الكلية يجب أن تحتوي على حروف فقط' });
    }
    if (!/^[0-9]{14}$/.test(national_id)) {
      return res.status(400).json({ error: 'الرقم القومي يجب أن يكون 14 رقم' });
    }
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
    const hash = bcrypt.hashSync(password, 10);
    let referredBy = null;
    if (ref) {
      const agent = db.prepare('SELECT id FROM agents WHERE referral_code = ? AND is_active = 1').get(ref);
      if (agent) referredBy = agent.id;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const tempData = JSON.stringify({ name, email, hash, phone, referredBy, nationality, city, language_applied, ageNum, national_id, college, education_level, military_status: milStatus, call_center_experience, gender });
    db.prepare('DELETE FROM users WHERE email = ? AND email_verified = 0').run(email);
    db.prepare('INSERT INTO users (name, email, password, phone, referred_by, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender, verification_code, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').run(name, email, hash, phone, referredBy, nationality, city, language_applied, ageNum, national_id, college, education_level, milStatus, call_center_experience, gender, code);
    await sendEmail(email, 'كود التحقق من حسابك في وَظِيف', `
      <div dir="rtl" style="font-family:Tajawal,sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#0a0a0a;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;display:block;margin:0 auto 14px;">
        </div>
        <h2 style="color:#f5f0e8;text-align:center;font-size:18px;margin-bottom:10px;">كود التحقق</h2>
        <p style="color:#888;text-align:center;font-size:14px;margin-bottom:24px;">أدخل الكود التالي لإتمام التسجيل:</p>
        <div style="text-align:center;margin-bottom:30px;">
          <span style="display:inline-block;font-size:36px;font-weight:900;color:#d4a853;letter-spacing:12px;background:rgba(212,168,83,0.08);padding:16px 32px;border-radius:14px;border:1px solid rgba(212,168,83,0.15);">${code}</span>
        </div>
        <p style="color:#555;text-align:center;font-size:12px;">هذا الكود صالح لمدة 10 دقائق فقط</p>
      </div>
    `);
    res.json({ needVerification: true, email, message: 'تم إرسال كود التحقق إلى بريدك الإلكتروني' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/verify-code', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'من فضلك أدخل الكود' });
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND email_verified = 0').get(email);
    if (!user) return res.status(400).json({ error: 'الحساب غير موجود أو تم التحقق بالفعل' });
    if (user.verification_code !== code) return res.status(400).json({ error: 'كود التحقق غير صحيح' });
    db.prepare('UPDATE users SET email_verified = 1, verification_code = NULL WHERE id = ?').run(user.id);
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'user' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/resend-code', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'من فضلك أدخل البريد الإلكتروني' });
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND email_verified = 0').get(email);
    if (!user) return res.status(400).json({ error: 'الحساب غير موجود أو تم التحقق بالفعل' });
    const code = String(Math.floor(100000 + Math.random() * 900000));
    db.prepare('UPDATE users SET verification_code = ? WHERE id = ?').run(code, user.id);
    await sendEmail(email, 'كود التحقق الجديد من حسابك في وَظِيف', `
      <div dir="rtl" style="font-family:Tajawal,sans-serif;max-width:480px;margin:0 auto;padding:40px;background:#0a0a0a;border-radius:20px;border:1px solid rgba(212,168,83,0.1);">
        <div style="text-align:center;margin-bottom:30px;">
          <img src="${BASE_URL}/uploads/wazef.png" alt="وَظِيف" style="width:180px;height:auto;border-radius:10px;display:block;margin:0 auto 14px;">
        </div>
        <h2 style="color:#f5f0e8;text-align:center;font-size:18px;margin-bottom:10px;">كود التحقق الجديد</h2>
        <p style="color:#888;text-align:center;font-size:14px;margin-bottom:24px;">أدخل الكود التالي لإتمام التسجيل:</p>
        <div style="text-align:center;margin-bottom:30px;">
          <span style="display:inline-block;font-size:36px;font-weight:900;color:#d4a853;letter-spacing:12px;background:rgba(212,168,83,0.08);padding:16px 32px;border-radius:14px;border:1px solid rgba(212,168,83,0.15);">${code}</span>
        </div>
        <p style="color:#555;text-align:center;font-size:12px;">هذا الكود صالح لمدة 10 دقائق فقط</p>
      </div>
    `);
    res.json({ message: 'تم إرسال كود التحقق الجديد' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== QUALTY ROUTES =====
// Get pending selections for qualty to accept/reject
app.get('/api/qualty/pending-selections', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const agentId = getAgentId(req);
    const selections = db.prepare(`
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
    res.status(500).json({ error: e.message });
  }
});

// Accept/reject selection by qualty
app.post('/api/qualty/selections/:id/action', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const agentId = getAgentId(req);
    const { action } = req.body;
    const sel = db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id);
    if (!sel) return res.status(404).json({ error: 'Not found' });
    if (action === 'accept' || action === 'approve') {
      db.prepare("UPDATE applications SET status='approved' WHERE id=?").run(req.params.id);
    } else if (action === 'reject') {
      db.prepare("UPDATE applications SET status='rejected' WHERE id=?").run(req.params.id);
    } else if (action === 'rerecord') {
      db.prepare("UPDATE applications SET rerecord_request=0, audio_file=NULL, status='pending' WHERE id=?").run(req.params.id);
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get companies for qualty
app.post('/api/qualty/companies', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const { name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before, salary, max_slots } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الشركة مطلوب' });
    // Support both old (salary/max_slots) and new (salary_min/max etc) payloads
    const sMin = salary_min !== undefined ? salary_min : (salary || 0);
    const sMax = salary_max !== undefined ? salary_max : (salary || 0);
    const slots = available_slots !== undefined ? available_slots : (max_slots || 0);
    const result = db.prepare('INSERT INTO companies (name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(name, position || '', description || '', interview_time || '', interview_schedule || '', sMin, sMax, company_email || '', slots, deadline || '', notify_days_before || 5);
    res.json({ id: result.lastInsertRowid, success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/qualty/companies', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const companies = db.prepare('SELECT * FROM companies ORDER BY created_at DESC').all();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update company by qualty
app.put('/api/qualty/companies/:id', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const { name, position, description, interview_time, interview_schedule, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before } = req.body;
    db.prepare('UPDATE companies SET name=?, position=?, description=?, interview_time=?, interview_schedule=?, salary_min=?, salary_max=?, company_email=?, available_slots=?, deadline=?, notify_days_before=? WHERE id=?').run(name, position || '', description || '', interview_time || '', interview_schedule || '', salary_min || 0, salary_max || 0, company_email || '', available_slots || 0, deadline || '', notify_days_before || 5, req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/qualty/companies/:id', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Qualty: get company schedule & history (same as admin)
app.get('/api/qualty/company/:id/schedule', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'الشركة غير موجودة' });
    const jobs = db.prepare(`
      SELECT j.*, 
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status != 'cancelled') as pending_candidates,
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status = 'cancelled') as cancelled_candidates,
        (SELECT COUNT(*) FROM selections s JOIN jobs j2 ON s.job_id = j2.id WHERE j2.id = j.id AND s.status = 'confirmed') as confirmed_candidates,
        (SELECT GROUP_CONCAT(u.name, ', ') FROM selections s JOIN jobs j2 ON s.job_id = j2.id JOIN users u ON s.user_id = u.id WHERE j2.id = j.id AND s.status != 'cancelled') as candidate_names
      FROM jobs j WHERE j.company_name = ? ORDER BY j.created_at DESC`).all(company.name);
    const history = db.prepare(`
      SELECT s.*, u.name as user_name, j.position FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE j.company_name = ? ORDER BY s.created_at DESC LIMIT 20`).all(company.name);
    res.json({ company, jobs, history, schedule: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/qualty/companies/:id/restart', authMiddleware, (req, res) => {
  try {
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id);
    if (!company) return res.status(404).json({ error: 'Not found' });
    const newDeadline = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];
    db.prepare('UPDATE companies SET pending_count=0, hired_count=0, used_slots=0, deadline=? WHERE id=?').run(newDeadline, req.params.id);
    db.prepare('DELETE FROM admin_notifications WHERE company_id=?').run(req.params.id);
    res.json({ success:true });
  } catch(e){ res.status(500).json({ error:e.message});}
});

app.get('/api/qualty/check-deadlines', authMiddleware, (req,res)=>{
  try{
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const companies=db.prepare('SELECT * FROM companies').all();
    let alertsFound=0, alerts=[];
    for(const c of companies){
      if(!c.deadline) continue;
      const diffDays=Math.ceil((new Date(c.deadline+'T00:00:00')-new Date())/(1000*60*60*24));
      const needed=(c.available_slots||0)-(c.hired_count||0);
      const notifyDays=c.notify_days_before||5;
      if(diffDays<=notifyDays && diffDays>=0 && needed>0){
        const exists=db.prepare("SELECT id FROM admin_notifications WHERE company_id=? AND status IN ('pending','accepted')").get(c.id);
        if(!exists){
          db.prepare('INSERT INTO admin_notifications (company_id,type,message,status) VALUES (?,?,?,?)').run(c.id,'deadline',`شركة ${c.name} تنتهي خلال ${diffDays} يوم`, 'pending');
          alertsFound++; alerts.push({company:c.name, days:diffDays, needed});
        }
      }
    }
    res.json({alertsFound, alerts});
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/qualty/pending-notifications', authMiddleware,(req,res)=>{
  try{
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const notifs=db.prepare(`
      SELECT n.*, c.name as company_name, c.deadline, c.available_slots, c.hired_count, c.notify_days_before 
      FROM admin_notifications n JOIN companies c ON n.company_id=c.id WHERE n.status='pending' ORDER BY n.created_at DESC`).all();
    res.json(notifs);
  }catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/qualty/pending-notifications/:id/accept', authMiddleware,(req,res)=>{
  try{
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const notif=db.prepare('SELECT * FROM admin_notifications WHERE id=?').get(req.params.id);
    if(!notif) return res.status(404).json({error:'Not found'});
    db.prepare("UPDATE admin_notifications SET status='accepted' WHERE id=?").run(req.params.id);
    const company=db.prepare('SELECT * FROM companies WHERE id=?').get(notif.company_id);
    const needed=(company.available_slots||0)-(company.hired_count||0);
    const agents=db.prepare('SELECT id FROM agents WHERE is_active=1').all();
    for(const a of agents){
      db.prepare('INSERT INTO notifications (agent_id,type,title,message) VALUES (?,?,?,?)').run(a.id,'deadline',`شركة ${company.name} تريد الإسراع`,`هناك شركة تريد الإسراع في عملية التوظيف (${company.name}) - مطلوب ${needed} شخص. وسيكون هناك عمولة إضافية للشخص.`);
    }
    res.json({message:`تم قبول الإشعار وإرسال تنبيه لـ ${agents.length} مندوب`});
  }catch(e){res.status(500).json({error:e.message});}
});

app.post('/api/qualty/pending-notifications/:id/reject', authMiddleware,(req,res)=>{
  try{
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    db.prepare("UPDATE admin_notifications SET status='rejected' WHERE id=?").run(req.params.id);
    res.json({message:'تم رفض الإشعار'});
  }catch(e){res.status(500).json({error:e.message});}
});

app.get('/api/qualty/agents', authMiddleware,(req,res)=>{
  try{
    if (!isAgentUser(req)) return res.status(403).json({ error: 'Forbidden' });
    if (getAgentRole(req) !== 'qualty') return res.status(403).json({ error: 'Not qualty' });
    const agents=db.prepare('SELECT id, name, referral_code FROM agents ORDER BY created_at DESC').all();
    res.json(agents);
  }catch(e){res.status(500).json({error:e.message});}
});

// Serve pages (in-memory cache fallback for Velixir)
// Serve pages from embedded module (works on any filesystem)
function servePage(res, file) {
  const html = _embeddedPages[file];
  if (html) return res.type('html').send(html);
  // Fallback to filesystem
  res.sendFile(path.join(_publicDir, file));
}
app.get('/', (req, res) => servePage(res, 'login.html'));
app.get('/login.html', (req, res) => servePage(res, 'login.html'));
app.get('/robots.txt', (req, res) => res.type('text/plain').sendFile(path.join(_publicDir, 'robots.txt')));
app.get('/sitemap.xml', (req, res) => res.type('application/xml').sendFile(path.join(_publicDir, 'sitemap.xml')));
app.get('/manifest.json', (req, res) => res.type('application/json').sendFile(path.join(_publicDir, 'manifest.json')));
app.get('/sw.js', (req, res) => { res.set('Service-Worker-Allowed', '/'); res.type('application/javascript').sendFile(path.join(_publicDir, 'sw.js')); });
app.get('/dashboard', (req, res) => servePage(res, 'dashboard.html'));
app.get('/admin', (req, res) => servePage(res, 'admin.html'));
app.get('/select-job', (req, res) => res.redirect('/'));
app.get('/agent', (req, res) => servePage(res, 'agent.html'));
app.get('/company', (req, res) => servePage(res, 'company.html'));
app.get('/company.html', (req, res) => servePage(res, 'company.html'));

// Multer error handler (must be after routes)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err.message);
    return res.status(400).json({ error: 'خطأ في رفع الملف: ' + err.message });
  }
  next(err);
});

// Global error handler - hide internal errors
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'حدث خطأ في الخادم' });
});

// Verify backup panel password (admin only)
const BACKUP_PANEL_PASS = 'Admin@Wazef#2024!';
app.post('/api/admin/verify-backup-pass', authMiddleware, adminMiddleware, (req, res) => {
  const { password } = req.body;
  if (password === BACKUP_PANEL_PASS) {
    res.json({ ok: true });
  } else {
    res.status(403).json({ error: 'كلمة المرور خاطئة' });
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
    embeddedPageCount: Object.keys(_embeddedPages || {}).length,
  });
});

// Reset database - admin only, requires confirmation
app.post('/api/admin/reset-db', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== 'RESET_ALL_DATA') {
      return res.status(400).json({ error: 'أرسل confirm: RESET_ALL_DATA' });
    }
    db.exec('DELETE FROM selections');
    db.exec('DELETE FROM jobs');
    db.exec('DELETE FROM notifications');
    db.exec('DELETE FROM admin_notifications');
    db.exec('DELETE FROM applications');
    db.exec('DELETE FROM users');
    db.exec('DELETE FROM companies');
    db.exec('DELETE FROM agents');
    db.exec("DELETE FROM sqlite_sequence WHERE name IN ('users','applications','jobs','selections','companies','agents','notifications','admin_notifications')");
    // Re-seed admins
    const bcrypt = require('bcryptjs');
    const admins = [
      { name: 'محمد سامي', email: 'mohamed.sami.gawad@gmail.com', pass: 'Sm@2024!Wazef#Xk9' },
      { name: 'Youssaf Mohamed', email: 'Youssafmohamed999@gmail.com', pass: 'Ys@2024!Wazef#Mp7' },
      { name: 'Admin VP', email: '1stvampiresslayer@gmail.com', pass: 'Vp@2024!Wazef#Qz3' },
      { name: 'Amina', email: 'amina@gmail.com', pass: 'Am@2024!Wazef#Jn4' }
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
    for (const a of admins) {
      insert.run(a.name, a.email, bcrypt.hashSync(a.pass, 10), 'admin');
    }
    res.json({ success: true, message: 'تم حذف جميع البيانات وإعادة تعيين الحسابات الإدارية' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============ COMPANY PORTAL ============

// Company login
app.post('/api/company/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const cu = db.prepare('SELECT cu.*, c.name as company_name FROM company_users cu JOIN companies c ON cu.company_id = c.id WHERE cu.email = ? AND cu.is_active = 1').get(email);
    if (!cu) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = bcrypt.compareSync(password, cu.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: cu.id, company_id: cu.company_id, email: cu.email, role: 'company', company_name: cu.company_name, name: cu.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: cu.id, company_id: cu.company_id, email: cu.email, name: cu.name, company_name: cu.company_name, role: 'company' } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Company auth middleware
function companyAuthMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(h.replace('Bearer ', ''), JWT_SECRET);
    if (req.user.role !== 'company') return res.status(403).json({ error: 'Not company' });
    const cu = db.prepare('SELECT * FROM company_users WHERE id = ?').get(req.user.company_id);
    if (!cu) return res.status(401).json({ error: 'Company user not found' });
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(cu.company_id);
    if (!company) return res.status(401).json({ error: 'Company not found' });
    req.user.company_id = cu.company_id;
    next();
  } catch(e) { res.status(401).json({ error: 'Invalid token' }); }
}

// Get company profile
app.get('/api/company/profile', companyAuthMiddleware, (req, res) => {
  try {
    const company = db.prepare('SELECT * FROM companies WHERE id = ?').get(req.user.company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const languages = db.prepare('SELECT * FROM company_languages WHERE company_id = ?').all(req.user.company_id);
    languages.forEach(l => {
      l.sent_count = db.prepare(`SELECT COUNT(*) as c FROM selections s JOIN jobs j ON s.job_id = j.id WHERE j.company_name = ? AND j.position = ?`).get(company.name, l.position || '').c;
    });
    res.json({ company, languages });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update company profile
app.put('/api/company/profile', companyAuthMiddleware, (req, res) => {
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
    db.prepare('UPDATE companies SET name=COALESCE(?,name), position=COALESCE(?,position), description=COALESCE(?,description), interview_time=COALESCE(?,interview_time), salary_min=COALESCE(?,salary_min), salary_max=COALESCE(?,salary_max), company_email=COALESCE(?,company_email), available_slots=COALESCE(?,available_slots), deadline=COALESCE(?,deadline) WHERE id=?').run(name, position, description, interview_time, salary_min, salary_max, company_email, available_slots, deadline, req.user.company_id);
    res.json({ success: true, message: 'تم التحديث' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Change company password
app.put('/api/company/password', companyAuthMiddleware, (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
    const cu = db.prepare('SELECT * FROM company_users WHERE id = ?').get(req.user.id);
    if (!bcrypt.compareSync(current_password, cu.password)) return res.status(401).json({ error: 'Current password wrong' });
    db.prepare('UPDATE company_users SET password = ? WHERE id = ?').run(bcrypt.hashSync(new_password, 10), req.user.id);
    res.json({ success: true, message: 'تم تغيير كلمة المرور' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Add company language
app.post('/api/company/languages', companyAuthMiddleware, (req, res) => {
  try {
    const { language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description } = req.body;
    if (!language || !level) return res.status(400).json({ error: 'Language and level required' });
    const validLevels = ['A1','A2','B1','B2','C1','C2'];
    if (!validLevels.includes(level)) return res.status(400).json({ error: 'Invalid level' });
    db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(req.user.company_id, language, level, needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '');
    res.json({ success: true, message: 'تمت الإضافة' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete company language
app.delete('/api/company/languages/:id', companyAuthMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM company_languages WHERE id=? AND company_id=?').run(req.params.id, req.user.company_id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update company language
app.put('/api/company/languages/:id', companyAuthMiddleware, (req, res) => {
  try {
    const { language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description } = req.body;
    if (!language || !level) return res.status(400).json({ error: 'Language and level required' });
    db.prepare('UPDATE company_languages SET language=?, level=?, needed_count=?, position=?, salary_min=?, salary_max=?, interview_time=?, deadline=?, notify_days=?, description=? WHERE id=? AND company_id=?').run(language, level, needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '', req.params.id, req.user.company_id);
    res.json({ success: true, message: 'تم التحديث' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get company candidates (users selected for this company's jobs)
app.get('/api/company/candidates', companyAuthMiddleware, (req, res) => {
  try {
    const cid = req.user.company_id;
    const jobs = db.prepare('SELECT * FROM jobs WHERE company_name = (SELECT name FROM companies WHERE id=?)').all(cid);
    if (!jobs.length) return res.json({ candidates: [] });
    const jobIds = jobs.map(j => j.id);
    const placeholders = jobIds.map(() => '?').join(',');
    const selections = db.prepare(`SELECT s.*, u.name, u.email, u.phone, u.nationality, u.city, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience, u.language_applied, j.position, j.company_name, j.interview_time, j.salary_min, j.salary_max FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.job_id IN (${placeholders})`).all(...jobIds);
    res.json({ candidates: selections });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get company confirmed candidates (after تثبيت - going to this company)
app.get('/api/company/confirmed', companyAuthMiddleware, (req, res) => {
  try {
    const cid = req.user.company_id;
    const selections = db.prepare(`SELECT s.*, u.name, u.email, u.phone, u.nationality, u.city, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience, u.language_applied, j.position, j.company_name, j.interview_time, j.salary_min, j.salary_max FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.status = 'confirmed' AND j.company_name = (SELECT name FROM companies WHERE id=?) ORDER BY s.created_at DESC`).all(cid);
    res.json({ candidates: selections });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get company jobs
app.get('/api/company/jobs', companyAuthMiddleware, (req, res) => {
  try {
    const jobs = db.prepare('SELECT * FROM jobs WHERE company_name = (SELECT name FROM companies WHERE id=?) ORDER BY created_at DESC').all(req.user.company_id);
    res.json({ jobs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Create company job
app.post('/api/company/jobs', companyAuthMiddleware, (req, res) => {
  try {
    const { position, interview_time, salary_min, salary_max, description } = req.body;
    if (!position) return res.status(400).json({ error: 'اسم الوظيفة مطلوب' });
    const company = db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    const result = db.prepare('INSERT INTO jobs (company_name, position, interview_time, salary_min, salary_max, description) VALUES (?,?,?,?,?,?)').run(company.name, position, interview_time || '', salary_min || 0, salary_max || 0, description || '');
    res.json({ success: true, id: result.lastInsertRowid, message: 'تمت إضافة الوظيفة' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Update company job
app.put('/api/company/jobs/:id', companyAuthMiddleware, (req, res) => {
  try {
    const { position, interview_time, salary_min, salary_max, description } = req.body;
    const company = db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    db.prepare('UPDATE jobs SET position=?, interview_time=?, salary_min=?, salary_max=?, description=? WHERE id=? AND company_name=?').run(position || '', interview_time || '', salary_min || 0, salary_max || 0, description || '', req.params.id, company.name);
    res.json({ success: true, message: 'تم التحديث' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Delete company job
app.delete('/api/company/jobs/:id', companyAuthMiddleware, (req, res) => {
  try {
    const company = db.prepare('SELECT name FROM companies WHERE id=?').get(req.user.company_id);
    const hasSelections = db.prepare('SELECT id FROM selections WHERE job_id=? AND status IN (\'selected\',\'confirmed\')').get(req.params.id);
    if (hasSelections) return res.status(400).json({ error: 'لا يمكن حذف وظيفة فيها متقدمين' });
    db.prepare('DELETE FROM jobs WHERE id=? AND company_name=?').run(req.params.id, company.name);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: create company user account
app.post('/api/admin/company-users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { company_id, email, password, name } = req.body;
    if (!company_id || !email || !password) return res.status(400).json({ error: 'Missing fields' });
    const company = db.prepare('SELECT id FROM companies WHERE id=?').get(company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const exists = db.prepare('SELECT id FROM company_users WHERE email=?').get(email);
    if (exists) return res.status(400).json({ error: 'Email already exists' });
    db.prepare('INSERT INTO company_users (company_id, email, password, name) VALUES (?,?,?,?)').run(company_id, email, bcrypt.hashSync(password, 10), name || '');
    res.json({ success: true, message: 'تم إنشاء حساب الشركة' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get all company users
app.get('/api/admin/company-users', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const users = db.prepare('SELECT cu.*, c.name as company_name FROM company_users cu JOIN companies c ON cu.company_id = c.id').all();
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: delete company user
app.delete('/api/admin/company-users/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM company_users WHERE id=?').run(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get company languages
app.get('/api/admin/company-languages/:companyId', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const langs = db.prepare('SELECT * FROM company_languages WHERE company_id=?').all(req.params.companyId);
    res.json(langs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: add company language
app.post('/api/admin/company-languages', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description } = req.body;
    if (!company_id || !language || !level) return res.status(400).json({ error: 'Missing fields' });
    db.prepare('INSERT INTO company_languages (company_id, language, level, needed_count, position, salary_min, salary_max, interview_time, deadline, notify_days, description) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(company_id, language, level, needed_count || 1, position || '', salary_min || 0, salary_max || 0, interview_time || '', deadline || '', notify_days || 5, description || '');
    res.json({ success: true, message: 'تمت الإضافة' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: delete company language
app.delete('/api/admin/company-languages/:id', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('DELETE FROM company_languages WHERE id=?').run(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Admin: get jobs filtered by language (and optional level) for assignment
app.get('/api/admin/jobs-by-language/:language', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const lang = req.params.language;
    const level = req.query.level || '';
    let levelClause = '';
    const params = [lang];
    if (level) { levelClause = ' AND cl.level = ?'; params.push(level); }
    const companies = db.prepare(`
      SELECT c.id, c.name, c.deadline, c.available_slots, c.hired_count, c.pending_count,
        c.position, c.interview_time, c.salary_min, c.salary_max, c.description, c.company_email,
        IFNULL((SELECT SUM(cl2.needed_count) FROM company_languages cl2 WHERE cl2.company_id = c.id ${level ? 'AND cl2.level = ?' : ''}), 0) as needed,
        IFNULL((SELECT COUNT(*) FROM jobs j JOIN selections s ON s.job_id = j.id WHERE j.company_name = c.name AND s.status IN ('selected','confirmed')), 0) as applied,
        IFNULL(c.deadline, '') as dl,
        GROUP_CONCAT(DISTINCT cl.level) as levels
      FROM companies c
      JOIN company_languages cl ON c.id = cl.company_id
      WHERE cl.language = ?${levelClause}
      GROUP BY c.id
    `).all(...(level ? [level, lang, level] : [lang]));
    if (!companies.length) {
      db.prepare('INSERT INTO admin_notifications (company_id, type, message, status) VALUES (0, ?, ?, ?)').run('missing_language', `لا توجد شركة توفر وظيفة باللغة: ${lang}${level ? ' - مستوى ' + level : ''}. برجاء التعاقد مع شركة توفر هذا التخصص.`, 'pending');
      return res.json({ jobs: [], companies: [], message: 'لا توجد شركة متاحة لهذه اللغة', notification_sent: true });
    }
    // Sort: deadline approaching first, then by days remaining
    const now = new Date();
    companies.forEach(c => {
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
    });
    companies.sort((a, b) => {
      if (a.near_deadline && !b.near_deadline) return -1;
      if (!a.near_deadline && b.near_deadline) return 1;
      if (a.near_deadline && b.near_deadline) return (a.days_left||0) - (b.days_left||0);
      return a.name.localeCompare(b.name);
    });
    const companyNames = companies.map(c => c.name);
    const placeholders = companyNames.map(() => '?').join(',');
    const jobs = db.prepare(`SELECT j.*, c.id as company_id FROM jobs j JOIN companies c ON j.company_name = c.name WHERE c.name IN (${placeholders})`).all(...companyNames);
    res.json({ jobs, companies });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'الصفحة غير موجودة' });
});

async function start() {
  await initDatabase();
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}
start().catch(e => { console.error('Failed to start:', e.message); process.exit(1); });
