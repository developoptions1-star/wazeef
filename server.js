const express = require('express');
const Database = require('better-sqlite3');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
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

// Middleware
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

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
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

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
    logo TEXT,
    description TEXT,
    industry TEXT,
    location TEXT,
    website TEXT,
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
try { db.exec('ALTER TABLE jobs ADD COLUMN company_email TEXT'); } catch(e) {}

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
`);

// Email transporter
const SMTP_USER = process.env.SMTP_USER || 'mohamedfaron297@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || 'ushf stxg rmgp xhig';
const emailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

async function sendEmail(to, subject, html) {
  try {
    await emailTransporter.sendMail({
      from: `"وَظِيف" <${SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log('Email sent to:', to);
  } catch (e) {
    console.log('Email send error:', e.message);
  }
}

function saveNotification(userId, agentId, type, title, message) {
  try {
    db.prepare('INSERT INTO notifications (user_id, agent_id, type, title, message) VALUES (?, ?, ?, ?, ?)').run(userId || null, agentId || null, type, title, message);
  } catch (e) {
    console.log('Notification save error:', e.message);
  }
}

// Seed admin users
const admins = [
  { name: 'محمد سامي', email: 'mohamed.sami.gawad@gmail.com', password: 'Sm@2024!Wazef#Xk9' },
  { name: 'يوسف', email: 'Youssafmohamed999@gmail.com', password: 'Ys@2024!Wazef#Mp7' },
  { name: 'ادمن', email: '1stvampiresslayer@gmail.com', password: 'Vp@2024!Wazef#Qz3' }
];
admins.forEach(a => {
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(a.email);
  if (!exists) {
    const hash = bcrypt.hashSync(a.password, 10);
    db.prepare('INSERT INTO users (name, email, password, role, email_verified) VALUES (?, ?, ?, ?, 1)').run(a.name, a.email, hash, 'admin');
  }
});

// Seed some companies
const companiesCount = db.prepare('SELECT COUNT(*) as c FROM companies').get();
if (companiesCount.c === 0) {
  const companies = [
    { name: 'TechVision Egypt', description: 'شركة رائدة في مجال التقنية والبرمجيات', industry: 'تقنية', location: 'القاهرة، مصر', website: 'www.techvision.com' },
    { name: 'Digital Wave', description: 'وكالة تسويق رقمي متخصصة', industry: 'تسويق', location: 'الإسكندرية، مصر', website: 'www.digitalwave.com' },
    { name: 'Smart Solutions', description: 'حلول ذكية لإدارة الأعمال', industry: 'إدارة', location: 'الجيزة، مصر', website: 'www.smartsolutions.com' },
    { name: 'CloudNet Systems', description: 'أنظمة الحوسبة السحابية', industry: 'تقنية', location: 'القاهرة، مصر', website: 'www.cloudnet.com' },
    { name: 'DataFlow Analytics', description: 'تحليل البيانات الذكاء الاصطناعي', industry: 'بيانات', location: 'المنصورة، مصر', website: 'www.dataflow.com' },
  ];
  const stmt = db.prepare('INSERT INTO companies (name, description, industry, location, website) VALUES (?, ?, ?, ?, ?)');
  companies.forEach(c => stmt.run(c.name, c.description, c.industry, c.location, c.website));
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

// ===== AUTH ROUTES =====
app.post('/api/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.email_verified === 0) return res.status(400).json({ error: 'يجب التحقق من البريد الإلكتروني أولاً' });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
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
app.post('/api/applications', authMiddleware, upload.single('audio'), (req, res) => {
  try {
    const audioFile = req.file ? req.file.filename : null;
    const language = req.body.language || null;

    // Check re-record request first
    const existing = db.prepare("SELECT id FROM applications WHERE user_id = ? AND rerecord_request = 1 AND status = 'pending'").get(req.user.id);
    if (existing) {
      db.prepare('UPDATE applications SET audio_file = ?, language = ?, rerecord_request = 0 WHERE id = ?').run(audioFile, language, existing.id);
      return res.json({ id: existing.id, status: 'pending' });
    }

    // Check 1-month restriction for the same language after rejection
    if (language) {
      const restricted = db.prepare(`
        SELECT id, rejection_date FROM applications
        WHERE user_id = ? AND language = ? AND status = 'rejected' AND rejection_date IS NOT NULL
        ORDER BY rejection_date DESC LIMIT 1
      `).get(req.user.id, language);

      if (restricted && restricted.rejection_date) {
        const rejectDate = new Date(restricted.rejection_date);
        const oneMonthLater = new Date(rejectDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (new Date() < oneMonthLater) {
          const remaining = Math.ceil((oneMonthLater - new Date()) / (24 * 60 * 60 * 1000));
          return res.status(400).json({ error: `تم رفضك لهذه اللغة. يجب الانتظار ${remaining} يوماً حتى تتمكن من التقديم مرة أخرى. تدرب وحسّن مستواك أولاً.` });
        }
      }
    }

    const result = db.prepare('INSERT INTO applications (user_id, audio_file, language) VALUES (?, ?, ?)').run(req.user.id, audioFile, language);
    res.json({ id: result.lastInsertRowid, status: 'pending' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
app.get('/api/admin/applications', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { agent_id } = req.query;
    let query = `
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        u.referred_by, u.nationality, u.city, u.language_applied as user_language, u.age, u.national_id, u.college, u.education_level, u.military_status, u.call_center_experience,
        ag.name as agent_name, ag.email as agent_email, ag.phone as agent_phone, ag.referral_code as agent_code,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id) as jobs_count
      FROM applications a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN agents ag ON u.referred_by = ag.id
    `;
    const params = [];
    if (agent_id) {
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

app.put('/api/admin/applications/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    db.prepare('UPDATE applications SET status = ? WHERE id = ?').run('approved', req.params.id);
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
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/applications/:id/reject', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const { reason } = req.body || {};
    db.prepare("UPDATE applications SET status = 'rejected', rejection_date = datetime('now'), rejection_reason = ? WHERE id = ?").run(reason || '', req.params.id);

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
    db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 1 WHERE id = ?").run(req.params.id);

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

app.put('/api/admin/applications/:id/rerecord', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    db.prepare('UPDATE applications SET rerecord_request = 1, status = ? WHERE id = ?').run('pending', req.params.id);
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
    const insertMany = db.transaction((jobsList) => {
      const ids = [];
      for (const j of jobsList) {
        const result = insertJob.run(application_id, j.company_name, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.company_email || '');
        ids.push(result.lastInsertRowid);
      }
      return ids;
    });

    const jobIds = insertMany(jobs);

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

      // Send applicant data to company email(s)
      if (fullUser) {
        const companyEmails = jobs.filter(j => j.company_email).map(j => j.company_email);
        const uniqueCompanyEmails = [...new Set(companyEmails)];
        if (uniqueCompanyEmails.length > 0) {
          const companyJobGroups = {};
          jobs.forEach(j => {
            if (!j.company_email) return;
            if (!companyJobGroups[j.company_email]) companyJobGroups[j.company_email] = [];
            companyJobGroups[j.company_email].push(j);
          });

          Object.entries(companyJobGroups).forEach(([compEmail, compJobs]) => {
            const compJobsHTML = compJobs.map(j => `
              <div style="padding:12px;background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.1);border-radius:8px;margin-bottom:8px;">
                <strong style="color:#d4a853;">${j.position}</strong><br>
                ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
                ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' ج' : j.salary_min ? 'من ' + j.salary_min + ' ج' : 'حتى ' + j.salary_max + ' ج'}<br>` : ''}
                ${j.description ? 'التفاصيل: ' + j.description : ''}
              </div>
            `).join('');

            const companyEmailHTML = `
              <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
                <h2 style="color:#d4a853;text-align:center;">بيانات متقدم لوظيفة</h2>
                <p>مرحباً،</p>
                <p>تم تعيين متقدم لوظيفة في شركتكم عبر منصة <strong style="color:#d4a853;">وَظِيف</strong>. فيما بيانات المتقدم والوظيفة:</p>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
                  <h3 style="color:#d4a853;margin-bottom:12px;">بيانات المتقدم:</h3>
                  <table style="width:100%;color:#ccc;font-size:14px;border-collapse:collapse;">
                    <tr><td style="padding:6px 0;color:#94a3b8;">الاسم</td><td style="padding:6px 0;font-weight:700;color:#f0d78c;">${fullUser.name}</td></tr>
                    <tr><td style="padding:6px 0;color:#94a3b8;">البريد</td><td style="padding:6px 0;">${fullUser.email}</td></tr>
                    ${fullUser.phone ? `<tr><td style="padding:6px 0;color:#94a3b8;">الهاتف</td><td style="padding:6px 0;" dir="ltr">${fullUser.phone}</td></tr>` : ''}
                    ${fullUser.nationality ? `<tr><td style="padding:6px 0;color:#94a3b8;">الجنسية</td><td style="padding:6px 0;">${fullUser.nationality}</td></tr>` : ''}
                    ${fullUser.city ? `<tr><td style="padding:6px 0;color:#94a3b8;">المدينة</td><td style="padding:6px 0;">${fullUser.city}</td></tr>` : ''}
                    ${fullUser.age ? `<tr><td style="padding:6px 0;color:#94a3b8;">العمر</td><td style="padding:6px 0;">${fullUser.age}</td></tr>` : ''}
                    ${fullUser.education_level ? `<tr><td style="padding:6px 0;color:#94a3b8;">المؤهل</td><td style="padding:6px 0;">${fullUser.education_level}</td></tr>` : ''}
                    ${fullUser.college ? `<tr><td style="padding:6px 0;color:#94a3b8;">الكلية</td><td style="padding:6px 0;">${fullUser.college}</td></tr>` : ''}
                    ${fullUser.national_id ? `<tr><td style="padding:6px 0;color:#94a3b8;">الرقم القومي</td><td style="padding:6px 0;" dir="ltr">${fullUser.national_id}</td></tr>` : ''}
                    ${fullUser.military_status ? `<tr><td style="padding:6px 0;color:#94a3b8;">الحالة العسكرية</td><td style="padding:6px 0;">${fullUser.military_status}</td></tr>` : ''}
                    ${fullUser.call_center_experience ? `<tr><td style="padding:6px 0;color:#94a3b8;">خبرة سنترال</td><td style="padding:6px 0;">${fullUser.call_center_experience}</td></tr>` : ''}
                  </table>
                </div>
                <h3 style="color:#d4a853;margin-bottom:12px;">الوظيفة:</h3>
                ${compJobsHTML}
                <p style="color:#888;font-size:12px;margin-top:30px;text-align:center;">هذه بيانات تم إرسالها عبر منصة وَظِيف للتوظيف الذكي</p>
              </div>
            `;
            sendEmail(compEmail, 'بيانات متقدم لوظيفة - وَظِيف', companyEmailHTML);
          });
        }
      }
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
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    const apps = db.prepare(`
      SELECT a.*, u.name as user_name, u.email as user_email, u.phone as user_phone,
        (SELECT COUNT(*) FROM jobs WHERE application_id = a.id) as jobs_count
      FROM applications a
      JOIN users u ON a.user_id = u.id
      WHERE u.referred_by = ? AND a.status = 'approved'
      ORDER BY a.created_at DESC
    `).all(req.user.id);
    res.json(apps);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/agent/jobs/batch', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    const { application_id, user_id, jobs } = req.body;
    if (!jobs || jobs.length === 0) return res.status(400).json({ error: 'لا توجد وظائف للإضافة' });

    const isOwner = db.prepare('SELECT id FROM users WHERE id = ? AND referred_by = ?').get(user_id, req.user.id);
    if (!isOwner) return res.status(403).json({ error: 'ليس لديك صلاحية إضافة وظائف لهذا المستخدم' });

    const insertJob = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary_min, salary_max, description, company_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const insertMany = db.transaction((jobsList) => {
      const ids = [];
      for (const j of jobsList) {
        const result = insertJob.run(application_id, j.company_name, j.position, j.interview_time || '', j.salary_min || 0, j.salary_max || 0, j.description || '', j.company_email || '');
        ids.push(result.lastInsertRowid);
      }
      return ids;
    });

    const jobIds = insertMany(jobs);

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

      // Send applicant data to company email(s)
      const companyEmails = jobs.filter(j => j.company_email).map(j => j.company_email);
      if (companyEmails.length > 0) {
        const companyJobGroups = {};
        jobs.forEach(j => {
          if (!j.company_email) return;
          if (!companyJobGroups[j.company_email]) companyJobGroups[j.company_email] = [];
          companyJobGroups[j.company_email].push(j);
        });

        Object.entries(companyJobGroups).forEach(([compEmail, compJobs]) => {
          const compJobsHTML = compJobs.map(j => `
            <div style="padding:12px;background:rgba(212,168,83,0.06);border:1px solid rgba(212,168,83,0.1);border-radius:8px;margin-bottom:8px;">
              <strong style="color:#d4a853;">${j.position}</strong><br>
              ${j.interview_time ? 'وقت المقابلة: ' + j.interview_time + '<br>' : ''}
              ${j.salary_min || j.salary_max ? `المرتب: ${j.salary_min && j.salary_max ? j.salary_min + ' - ' + j.salary_max + ' ج' : j.salary_min ? 'من ' + j.salary_min + ' ج' : 'حتى ' + j.salary_max + ' ج'}<br>` : ''}
              ${j.description ? 'التفاصيل: ' + j.description : ''}
            </div>
          `).join('');

          const companyEmailHTML = `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#d4a853;text-align:center;">بيانات متقدم لوظيفة</h2>
              <p>مرحباً،</p>
              <p>تم تعيين متقدم لوظيفة في شركتكم عبر منصة <strong style="color:#d4a853;">وَظِيف</strong>. فيما بيانات المتقدم والوظيفة:</p>
              <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;margin:20px 0;">
                <h3 style="color:#d4a853;margin-bottom:12px;">بيانات المتقدم:</h3>
                <table style="width:100%;color:#ccc;font-size:14px;border-collapse:collapse;">
                  <tr><td style="padding:6px 0;color:#94a3b8;">الاسم</td><td style="padding:6px 0;font-weight:700;color:#f0d78c;">${user.name}</td></tr>
                  <tr><td style="padding:6px 0;color:#94a3b8;">البريد</td><td style="padding:6px 0;">${user.email}</td></tr>
                  ${user.phone ? `<tr><td style="padding:6px 0;color:#94a3b8;">الهاتف</td><td style="padding:6px 0;" dir="ltr">${user.phone}</td></tr>` : ''}
                  ${user.nationality ? `<tr><td style="padding:6px 0;color:#94a3b8;">الجنسية</td><td style="padding:6px 0;">${user.nationality}</td></tr>` : ''}
                  ${user.city ? `<tr><td style="padding:6px 0;color:#94a3b8;">المدينة</td><td style="padding:6px 0;">${user.city}</td></tr>` : ''}
                  ${user.age ? `<tr><td style="padding:6px 0;color:#94a3b8;">العمر</td><td style="padding:6px 0;">${user.age}</td></tr>` : ''}
                  ${user.education_level ? `<tr><td style="padding:6px 0;color:#94a3b8;">المؤهل</td><td style="padding:6px 0;">${user.education_level}</td></tr>` : ''}
                  ${user.college ? `<tr><td style="padding:6px 0;color:#94a3b8;">الكلية</td><td style="padding:6px 0;">${user.college}</td></tr>` : ''}
                  ${user.national_id ? `<tr><td style="padding:6px 0;color:#94a3b8;">الرقم القومي</td><td style="padding:6px 0;" dir="ltr">${user.national_id}</td></tr>` : ''}
                  ${user.military_status ? `<tr><td style="padding:6px 0;color:#94a3b8;">الحالة العسكرية</td><td style="padding:6px 0;">${user.military_status}</td></tr>` : ''}
                  ${user.call_center_experience ? `<tr><td style="padding:6px 0;color:#94a3b8;">خبرة سنترال</td><td style="padding:6px 0;">${user.call_center_experience}</td></tr>` : ''}
                </table>
              </div>
              <h3 style="color:#d4a853;margin-bottom:12px;">الوظيفة:</h3>
              ${compJobsHTML}
              <p style="color:#888;font-size:12px;margin-top:30px;text-align:center;">هذه بيانات تم إرسالها عبر منصة وَظِيف للتوظيف الذكي</p>
            </div>
          `;
          sendEmail(compEmail, 'بيانات متقدم لوظيفة - وَظِيف', companyEmailHTML);
        });
      }
    }

    res.json({ success: true, jobIds });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/agent/jobs/:applicationId', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
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
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    const notifications = db.prepare('SELECT * FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
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
    if (req.user.role === 'agent') {
      db.prepare('UPDATE notifications SET is_read = 1 WHERE agent_id = ?').run(req.user.id);
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
      ORDER BY s.created_at DESC
    `).all();

    const hired = selections.filter(s => s.hired === 1);
    const totalEarnings = hired.reduce((sum, s) => sum + (s.amount || 0), 0);
    const cancelled = selections.filter(s => s.hired === 0 && s.status === 'cancelled');
    const waiting = selections.filter(s => s.status === 'selected');

    res.json({ totalApps, pending, approved, rejected, totalJobs, totalUsers, selections, hired, totalEarnings, cancelled, waiting });
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
    if (status === 'confirmed') {
      const deadline = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare('UPDATE selections SET frozen_deadline = ? WHERE id = ?').run(deadline, req.params.id);
      const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email, j.company_name, j.position FROM selections s JOIN users u ON s.user_id = u.id JOIN jobs j ON s.job_id = j.id WHERE s.id = ?').get(req.params.id);
      if (sel) {
        const agent = db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
        if (agent) {
          db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'selection_confirmed', 'تم تثبيت صفقة', `تم تثبيت صفقة ${sel.user_name} - ${sel.company_name}. المبلغ: ${amount || 0} ج للشركة / ${agent_amount || 0} ج لك. سيتم الإرسال خلال أسبوع إلى 3 أسابيع.`);
          if (agent.email) {
            sendEmail(agent.email, 'تم تثبيت صفقة - وَظِيف', `
              <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
                <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
                <h2 style="color:#66bb6a;text-align:center;margin-bottom:20px;">تم تثبيت صفقة</h2>
                <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">العضو:</strong> ${sel.user_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                  <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">المرتب:</strong> ${amount || 0} ج للشركة / ${agent_amount || 0} ج لك</p>
                  <p style="margin:0;"><strong style="color:#fbbf24;">سيتم الإرسال خلال أسبوع إلى 3 أسابيع</strong></p>
                </div>
                <p style="color:#888;font-size:13px;text-align:center;">المبلغ متجمد حالياً وسيتم إرساله خلال الأسابيع الثلاثة القادمة.</p>
                <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.05);"><span style="color:#555;font-size:11px;">وَظِيف - منصة التوظيف الذكي</span></div>
              </div>
            `);
          }
        }
        db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'selection_confirmed', 'تم تثبيت صفقة', `تم تثبيت صفقة عملك في ${sel.company_name}. سيتم الإرسال خلال أسبوع إلى 3 أسابيع.`);
        if (sel.user_email) {
          sendEmail(sel.user_email, 'تم تثبيت صفقة عملك - وَظِيف', `
            <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
              <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
              <h2 style="color:#66bb6a;text-align:center;margin-bottom:20px;">تم تثبيت صفقة عملك</h2>
              <div style="background:rgba(100,200,100,0.06);border:1px solid rgba(100,200,100,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
                <p style="margin:0 0 8px;"><strong style="color:#66bb6a;">الشركة:</strong> ${sel.company_name}</p>
                <p style="margin:0;"><strong style="color:#fbbf24;">سيتم الإرسال خلال أسبوع إلى 3 أسابيع</strong></p>
              </div>
              <p style="color:#888;font-size:13px;text-align:center;">مبروك! تم تثبيت صفقة عملك. المبلغ متجمد حالياً وسيتم إرساله خلال الأسابيع الثلاثة القادمة.</p>
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

app.put('/api/admin/selections/:id/unfreeze', authMiddleware, adminMiddleware, (req, res) => {
  try {
    db.prepare('UPDATE selections SET is_frozen = 0, unfrozen_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email FROM selections s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
      const agent = db.prepare('SELECT a.* FROM agents a JOIN users u ON a.id = u.referred_by WHERE u.id = ?').get(sel.user_id);
      if (agent) {
        db.prepare('INSERT INTO notifications (agent_id, type, title, message) VALUES (?, ?, ?, ?)').run(agent.id, 'unfreeze', 'تم فك تجميد المبلغ', `تم فك تجميد مبلغ ${sel.agent_amount} ج لـ ${sel.user_name}. سيتم تحويل المبلغ قريباً.`);
      }
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'unfreeze', 'تم فك تجميد المبلغ', `تم فك تجميد مبلغ راتبك من ${sel.amount} ج. سيتم تحويل المبلغ قريباً.`);
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
    const sel = db.prepare('SELECT s.*, u.name as user_name, u.email as user_email FROM selections s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(req.params.id);
    if (sel) {
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
      db.prepare('INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)').run(sel.user_id, 'apology', 'تم الإعتذار عن الصفقة', `تم الإعتذار عن صفقة عملك في ${sel.company_name}. سبب: ${reason || 'لم يحدد'}`);
      if (sel.user_email) {
        sendEmail(sel.user_email, 'تم الإعتذار عن صفقة العمل - وَظِيف', `
          <div dir="rtl" style="font-family:'Tajawal',sans-serif;max-width:500px;margin:0 auto;padding:30px;background:#0a0a0a;color:#f5f0e8;border-radius:16px;border:1px solid rgba(212,168,83,0.1);">
            <div style="text-align:center;margin-bottom:24px;"><div style="width:50px;height:50px;background:linear-gradient(135deg,#b8860b,#d4a853);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:900;color:#0a0a0a;">و</div></div>
            <h2 style="color:#e57373;text-align:center;margin-bottom:20px;">تم الإعتذار عن صفقة العمل</h2>
            <div style="background:rgba(220,50,50,0.06);border:1px solid rgba(220,50,50,0.12);border-radius:12px;padding:16px;margin-bottom:20px;">
              <p style="margin:0 0 8px;"><strong style="color:#e57373;">الشركة:</strong> ${sel.company_name}</p>
              <p style="margin:0;"><strong style="color:#e57373;">السبب:</strong> ${reason || 'لم يحدد'}</p>
            </div>
            <p style="color:#888;font-size:13px;text-align:center;">نعتذر عن هذا الإلغاء. يمكنك تقديم طلب جديد في أي وقت.</p>
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
      db.prepare("UPDATE applications SET status = 'pending', rejection_date = NULL, rejection_reason = NULL, rerecord_request = 1 WHERE id = ?").run(app_row.id);
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
    const companies = db.prepare('SELECT * FROM companies').all();
    res.json(companies);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/jobs', authMiddleware, (req, res) => {
  try {
    const apps = db.prepare("SELECT id FROM applications WHERE user_id = ? AND status = 'approved'").all(req.user.id);
    const appIds = apps.map(a => a.id);
    if (appIds.length === 0) return res.json([]);
    const placeholders = appIds.map(() => '?').join(',');
    const jobs = db.prepare(`SELECT * FROM jobs WHERE application_id IN (${placeholders})`).all(...appIds);
    res.json(jobs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/user/select-job', authMiddleware, (req, res) => {
  try {
    const { job_id } = req.body;
    const existing = db.prepare("SELECT id FROM selections WHERE user_id = ? AND job_id = ?").get(req.user.id, job_id);
    if (existing) return res.status(400).json({ error: 'Already selected' });
    const result = db.prepare('INSERT INTO selections (user_id, job_id, status) VALUES (?, ?, ?)').run(req.user.id, job_id, 'selected');
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
      WHERE s.user_id = ?
    `).all(req.user.id);
    res.json(selections);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/user/application-status', authMiddleware, (req, res) => {
  try {
    const app = db.prepare('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
    if (!app) return res.json(null);
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

app.get('/api/admin/agents', authMiddleware, adminMiddleware, (req, res) => {
  try {
    const agents = db.prepare('SELECT id, name, email, phone, referral_code, is_active, created_at FROM agents ORDER BY created_at DESC').all();
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

// Agent login
app.post('/api/agent/login', authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    const agent = db.prepare('SELECT * FROM agents WHERE email = ? AND is_active = 1').get(email);
    if (!agent) return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    if (!bcrypt.compareSync(password, agent.password)) return res.status(400).json({ error: 'بيانات الدخول غير صحيحة' });
    const token = jwt.sign({ id: agent.id, name: agent.name, email: agent.email, role: 'agent', referral_code: agent.referral_code }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, agent: { id: agent.id, name: agent.name, email: agent.email, role: 'agent', referral_code: agent.referral_code } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Agent dashboard stats
app.get('/api/agent/stats', authMiddleware, (req, res) => {
  try {
    if (req.user.role !== 'agent') return res.status(403).json({ error: 'Forbidden' });
    const agentId = req.user.id;
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

    // Earnings data
    const earnings = db.prepare(`
      SELECT s.amount as company_amount, s.agent_amount, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE u.referred_by = ? AND s.hired = 1
      ORDER BY s.created_at DESC
    `).all(agentId);

    const totalAgentEarnings = earnings.reduce((sum, e) => sum + (e.agent_amount || 0), 0);
    const totalCompanyEarnings = earnings.reduce((sum, e) => sum + (e.company_amount || 0), 0);

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

    const frozenSelections = db.prepare(`
      SELECT s.agent_amount, s.amount, s.frozen_deadline, s.created_at,
        j.company_name, j.position, u.name as user_name
      FROM selections s
      JOIN users u ON s.user_id = u.id
      JOIN jobs j ON s.job_id = j.id
      WHERE u.referred_by = ? AND s.hired = 1 AND s.is_frozen = 1
      ORDER BY s.created_at DESC
    `).all(agentId);

    const frozenTotal = frozenSelections.reduce((sum, f) => sum + (f.agent_amount || 0), 0);
    const frozenCompanyTotal = frozenSelections.reduce((sum, f) => sum + (f.amount || 0), 0);

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
        (SELECT amount FROM selections WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as sel_amount,
        (SELECT j2.company_name FROM selections s2 JOIN jobs j2 ON s2.job_id = j2.id WHERE s2.user_id = u.id ORDER BY s2.created_at DESC LIMIT 1) as sel_company
      FROM users u
      WHERE u.referred_by = ?
      ORDER BY u.created_at DESC
    `).all(agentId);

    res.json({ totalReferred, withApplication, hired, pending, approved, rejected, referredUsers,
      earnings, totalAgentEarnings, totalCompanyEarnings,
      todayEarnings, weekEarnings, monthEarnings,
      todayHired, weekHired, monthHired,
      frozenTotal, frozenCompanyTotal, frozenSelections
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Register with referral code
app.post('/api/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password, phone, ref, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience } = req.body;
    if (!name || !email || !password || !phone || !nationality || !city || !language_applied || !age || !national_id || !college || !education_level || !military_status || !call_center_experience) {
      return res.status(400).json({ error: 'من فضلك أكمل كل الحقول المطلوبة' });
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
    const tempData = JSON.stringify({ name, email, hash, phone, referredBy, nationality, city, language_applied, ageNum, national_id, college, education_level, military_status, call_center_experience });
    db.prepare('DELETE FROM users WHERE email = ? AND email_verified = 0').run(email);
    db.prepare('INSERT INTO users (name, email, password, phone, referred_by, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, verification_code, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').run(name, email, hash, phone, referredBy, nationality, city, language_applied, ageNum, national_id, college, education_level, military_status, call_center_experience, code);
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

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/select-job', (req, res) => res.redirect('/'));
app.get('/agent', (req, res) => res.sendFile(path.join(__dirname, 'public', 'agent.html')));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'الصفحة غير موجودة' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
