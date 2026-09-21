const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'app.db'));
db.pragma('journal_mode = WAL');

console.log('🌱 Starting fake data seeding...');

const passwordHash = bcrypt.hashSync('123456', 10);

console.log('🧹 Clearing old test data...');
db.prepare("DELETE FROM selections").run();
db.prepare("DELETE FROM jobs").run();
db.prepare("DELETE FROM applications").run();
db.prepare("DELETE FROM notifications").run();
db.prepare("DELETE FROM admin_notifications").run();
db.prepare("DELETE FROM users WHERE role != 'admin'").run();
db.prepare("DELETE FROM agents WHERE id > 0").run();
db.prepare("DELETE FROM companies WHERE id > 0").run();

console.log('🏢 Creating companies...');
const companies = [
  { name: 'TechVision Egypt', position: 'مطور ويب', description: 'شركة رائدة في التقنية والبرمجيات', interview_time: 'الأحد 2 م', salary_min: 8000, salary_max: 15000, company_email: 'hr@techvision.com', available_slots: 20 },
  { name: 'Digital Wave', position: 'مندوب مبيعات', description: 'وكالة تسويق رقمي متخصصة', interview_time: 'الإثنين 10 ص', salary_min: 5000, salary_max: 10000, company_email: 'jobs@digitalwave.com', available_slots: 15 },
  { name: 'Smart Solutions', position: 'دعم فني', description: 'حلول ذكية لإدارة الأعمال', interview_time: 'الثلاثاء 1 م', salary_min: 6000, salary_max: 12000, company_email: 'hr@smartsolutions.com', available_slots: 10 },
  { name: 'CloudNet Systems', position: 'مهندس شبكات', description: 'أنظمة الحوسبة السحابية', interview_time: 'الأربعاء 11 ص', salary_min: 10000, salary_max: 20000, company_email: 'careers@cloudnet.com', available_slots: 8 },
  { name: 'DataFlow Analytics', position: 'محلل بيانات', description: 'تحليل البيانات والذكاء الاصطناعي', interview_time: 'الخميس 3 م', salary_min: 12000, salary_max: 25000, company_email: 'talent@dataflow.com', available_slots: 12 },
  { name: 'Alpha Corp', position: 'مطور Backend', description: 'تطوير أنظمة قابلة للتوسع', interview_time: 'الأحد 10 ص', salary_min: 10000, salary_max: 18000, company_email: 'hr@alphacorp.com', available_slots: 10 },
  { name: 'Beta Industries', position: 'مصمم UI/UX', description: 'تصميم واجهات مستخدم ممتازة', interview_time: 'الإثنين 2 م', salary_min: 8000, salary_max: 14000, company_email: 'jobs@beta.com', available_slots: 8 },
  { name: 'Gamma Tech', position: 'DevOps Engineer', description: 'أتمتة النشر والبنية التحتية', interview_time: 'الأربعاء 10 ص', salary_min: 12000, salary_max: 22000, company_email: 'careers@gamma.com', available_slots: 6 },
];

const insertCompany = db.prepare('INSERT INTO companies (name, position, description, interview_time, salary_min, salary_max, company_email, available_slots, deadline, notify_days_before, pending_count, hired_count, used_slots) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 5, 0, 0, 0)');
const deadline = new Date(); deadline.setMonth(deadline.getMonth() + 2);
const deadlineStr = deadline.toISOString().split('T')[0];

companies.forEach(c => insertCompany.run(c.name, c.position, c.description, c.interview_time, c.salary_min, c.salary_max, c.company_email, c.available_slots, deadlineStr));

console.log('👥 Creating agents...');
const agents = [
  { name: 'أحمد محمد', email: 'ahmed.agent@test.com', phone: '01012345678', referral_code: 'AHM001', role: 'qualty' },
  { name: 'سارة علي', email: 'sara.agent@test.com', phone: '01023456789', referral_code: 'SAR002', role: 'qualty' },
  { name: 'محمد حسن', email: 'mohamed.agent@test.com', phone: '01034567890', referral_code: 'MOH003', role: 'agent' },
  { name: 'فاطمة أحمد', email: 'fatma.agent@test.com', phone: '01045678901', referral_code: 'FAT004', role: 'agent' },
  { name: 'خالد محمود', email: 'khaled.agent@test.com', phone: '01056789012', referral_code: 'KHA005', role: 'agent' },
  { name: 'نور الدين', email: 'nour.agent@test.com', phone: '01067890123', referral_code: 'NOU006', role: 'agent' },
  { name: 'ياسمين سامي', email: 'yasmin.agent@test.com', phone: '01078901234', referral_code: 'YAS007', role: 'agent' },
  { name: 'عمر خالد', email: 'omar.agent@test.com', phone: '01089012345', referral_code: 'OMA008', role: 'agent' },
];

const insertAgent = db.prepare('INSERT INTO agents (name, email, phone, password, referral_code, is_active, role) VALUES (?, ?, ?, ?, ?, 1, ?)');
const agentIds = [];
agents.forEach(a => {
  const res = insertAgent.run(a.name, a.email, a.phone, passwordHash, a.referral_code, a.role);
  agentIds.push(res.lastInsertRowid);
  console.log(`  Agent: ${a.name} (${a.referral_code}) - ${a.role}`);
});

console.log('👤 Creating users with applications...');
const languages = ['ar', 'en', 'de', 'fr', 'es', 'tr'];
const nationalities = ['مصري', 'سعودي', 'إماراتي', 'كويتي', 'قطري', 'بحريني', 'عماني', 'أردني', 'لبناني', 'سوري'];
const cities = ['القاهرة', 'الرياض', 'دبي', 'أبوظبي', 'الكويت', 'الدوحة', 'المنامة', 'مسقط', 'عمان', 'بيروت'];
const colleges = ['الحاسبات والمعلومات', 'الهندسة', 'التجارة', 'الآداب', 'الطب', 'الصيدلة', 'العلوم', 'الحقوق'];
const educations = ['بكالوريوس', 'ماجستير', 'دكتوراه', 'دبلوم'];
const military = ['أدي', 'مؤجل', 'معافى', 'غير مطلوب'];
const callCenter = ['نعم - سنة', 'نعم - سنتين', 'لا', 'نعم - 6 شهور'];

const firstNames = ['أحمد', 'محمد', 'محمود', 'علي', 'حسن', 'خالد', 'عمر', 'يوسف', 'إبراهيم', 'مصطفى', 'عبدالله', 'كريم', 'آدم', 'ياسين', 'زكريا', 'سارة', 'فاطمة', 'مريم', 'نور', 'هدى', 'ياسمين', 'منى', 'رانيا', 'دينا', 'سلمى', 'نورهان', 'رحمة', 'إسراء', 'آية', 'بسمة'];
const lastNames = ['محمد', 'أحمد', 'علي', 'حسن', 'محمود', 'خالد', 'عمر', 'يوسف', 'إبراهيم', 'سيد', 'حسين', 'كمال', 'جمال', 'فتحي', 'نبيل', 'شريف', 'وائل', 'طارق', 'سامي', 'هاني'];

const insertUser = db.prepare('INSERT INTO users (name, email, password, phone, referred_by, nationality, city, language_applied, age, national_id, college, education_level, military_status, call_center_experience, gender, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
const insertApplication = db.prepare('INSERT INTO applications (user_id, audio_file, language, status, created_at, assigned_qualty_id, reviewed_by, reviewed_at, rerecord_request, rejection_date, rejection_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, NULL)');
const insertJob = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary_min, salary_max, description, company_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const insertSelection = db.prepare('INSERT INTO selections (user_id, job_id, status, hired, amount, agent_amount, created_at, is_frozen, unfrozen_at, frozen_deadline, apology, company_emailed, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

let userId = 1;
const userData = [];

for (let i = 0; i < 100; i++) {
  const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
  const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
  const name = `${fn} ${ln}`;
  const email = `user${i+1}@test.com`;
  const phone = `01${Math.floor(Math.random() * 900000000) + 100000000}`;
  const referredBy = agentIds[Math.floor(Math.random() * agentIds.length)];
  const nationality = nationalities[Math.floor(Math.random() * nationalities.length)];
  const city = cities[Math.floor(Math.random() * cities.length)];
  const language = languages[Math.floor(Math.random() * languages.length)];
  const age = Math.floor(Math.random() * 20) + 22;
  const nationalId = `${Math.floor(Math.random() * 90000000000000) + 10000000000000}`;
  const college = colleges[Math.floor(Math.random() * colleges.length)];
  const education = educations[Math.floor(Math.random() * educations.length)];
  const milStatus = military[Math.floor(Math.random() * military.length)];
  const callCenterExp = callCenter[Math.floor(Math.random() * callCenter.length)];
  const gender = Math.random() > 0.5 ? 'male' : 'female';

  const res = insertUser.run(name, email, passwordHash, phone, referredBy, nationality, city, language, age, nationalId, college, education, milStatus, callCenterExp, gender);
  const thisUserId = res.lastInsertRowid;
  
  userData.push({ id: thisUserId, name, email, phone, referredBy, language });
  userId++;
}

console.log('📝 Creating applications...');
const statuses = ['pending', 'approved', 'rejected', 'approved', 'approved', 'approved'];

let appId = 1;
const applicationData = [];

userData.forEach((u, idx) => {
  if (Math.random() > 0.7) return;
  
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const audioFile = `recording_${appId}.webm`;
  
  const daysAgo = Math.floor(Math.random() * 120);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  const createdAtStr = createdAt.toISOString();
  
  const qualtyId = agentIds[Math.floor(Math.random() * 2)];
  
  let reviewedBy = null;
  let reviewedAt = null;
  let rejectionDate = null;
  let rejectionReason = null;
  
  if (status === 'approved') {
    reviewedBy = qualtyId;
    reviewedAt = new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
  } else if (status === 'rejected') {
    reviewedBy = qualtyId;
    reviewedAt = new Date(createdAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString();
    rejectionDate = reviewedAt;
    rejectionReason = 'جودة الصوت ضعيفة، يرجى التدريب والتقديم مرة أخرى';
  }
  
  const res = insertApplication.run(u.id, audioFile, u.language, status, createdAtStr, qualtyId, reviewedBy, reviewedAt);
  const thisAppId = res.lastInsertRowid;
  
  applicationData.push({ 
    id: thisAppId, 
    userId: u.id, 
    user: u, 
    status, 
    createdAt: createdAtStr,
    reviewedBy,
    reviewedAt,
    language: u.language
  });
  
  appId++;
});

console.log('💼 Creating jobs for approved applications...');
const approvedApps = applicationData.filter(a => a.status === 'approved');
let jobId = 1;
const jobData = [];

approvedApps.forEach(app => {
  const numJobs = Math.floor(Math.random() * 3) + 1;
  for (let j = 0; j < numJobs; j++) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const res = insertJob.run(app.id, company.name, company.position, company.interview_time, company.salary_min, company.salary_max, company.description, company.company_email);
    jobData.push({ id: res.lastInsertRowid, appId: app.id, userId: app.userId, company: company.name });
    jobId++;
  }
});

console.log('✅ Creating selections (hiring outcomes)...');
const selectionData = [];

jobData.forEach(job => {
  if (Math.random() > 0.6) return;
  
  const statuses = ['selected', 'confirmed', 'confirmed', 'confirmed', 'cancelled', 'confirmed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const hired = (status === 'confirmed' || status === 'cancelled') && Math.random() > 0.3 ? 1 : 0;
  
  const amount = Math.floor(Math.random() * 15000) + 5000;
  const agentAmount = Math.floor(amount * (0.15 + Math.random() * 0.15));
  
  const daysAgo = Math.floor(Math.random() * 120);
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);
  const createdAtStr = createdAt.toISOString();
  
  let frozenDeadline = null;
  let unfrozenAt = null;
  let hiredAt = null;
  let isFrozen = 1;
  
  if (status === 'confirmed') {
    const deadline = new Date(createdAt.getTime() + 21 * 24 * 60 * 60 * 1000);
    frozenDeadline = deadline.toISOString();
    
    if (hired && Math.random() > 0.4) {
      isFrozen = 0;
      unfrozenAt = new Date(deadline.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString();
      hiredAt = unfrozenAt;
    }
  }
  
  const res = insertSelection.run(
    job.userId, 
    job.id, 
    status, 
    hired, 
    amount, 
    agentAmount, 
    createdAtStr,
    isFrozen,
    unfrozenAt,
    frozenDeadline,
    null,  // apology
    0,     // company_emailed
    hiredAt
  );
  
  selectionData.push({
    id: res.lastInsertRowid,
    userId: job.userId,
    jobId: job.id,
    status,
    hired,
    amount,
    agentAmount,
    createdAt: createdAtStr,
    isFrozen,
    unfrozenAt,
    frozenDeadline,
    hiredAt
  });
});

console.log('🏆 Ensuring ranking data...');

const currentMonth = new Date().toISOString().slice(0, 7);
const qualtyAhmedId = agentIds[0];
const recentApps = applicationData.filter(a => a.reviewedBy === qualtyAhmedId && a.status !== 'pending').slice(0, 20);
recentApps.forEach(a => {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * 10));
  db.prepare("UPDATE applications SET reviewed_at=?, reviewed_by=? WHERE id=?").run(d.toISOString(), qualtyAhmedId, a.id);
});

const regularMohamedId = agentIds[2];
const mohamedUsers = userData.filter(u => u.referredBy === regularMohamedId).slice(0, 10);
mohamedUsers.forEach(u => {
  const job = jobData.find(j => j.userId === u.id);
  if (job) {
    const amount = Math.floor(Math.random() * 15000) + 8000;
    const agentAmount = Math.floor(amount * 0.2);
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 15));
    const createdAt = d.toISOString();
    const deadline = new Date(d.getTime() + 21 * 24 * 60 * 60 * 1000).toISOString();
    const hiredAt = new Date(d.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString();
    
    insertSelection.run(u.id, job.id, 'confirmed', 1, amount, agentAmount, createdAt, 0, hiredAt, deadline, null, 0, hiredAt);
  }
});

const qualtySaraId = agentIds[1];
const prevMonth = new Date();
prevMonth.setMonth(prevMonth.getMonth() - 1);

const saraApps = applicationData.filter(a => a.reviewedBy === qualtySaraId && a.status !== 'pending').slice(0, 15);
saraApps.forEach(a => {
  const d = new Date(prevMonth);
  d.setDate(d.getDate() - Math.floor(Math.random() * 20));
  db.prepare("UPDATE applications SET reviewed_at=?, reviewed_by=? WHERE id=?").run(d.toISOString(), qualtySaraId, a.id);
});

console.log('🔔 Creating notifications...');
const insertNotif = db.prepare('INSERT INTO notifications (user_id, agent_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');

selectionData.filter(s => s.hired).slice(0, 20).forEach(s => {
  insertNotif.run(s.userId, null, 'hired', 'مبروك! تم توظيفك', 'تم توظيفك بنجاح', 0, s.hiredAt || s.createdAt);
});

agentIds.forEach(aid => {
  insertNotif.run(null, aid, 'selection_confirmed', 'صفقة جديدة', 'تم تأكيد صفقة لأحد مرشحيك', 0, new Date().toISOString());
});

console.log('\n📊 Summary:');
const stats = {
  users: db.prepare("SELECT COUNT(*) as c FROM users WHERE role != 'admin'").get().c,
  agents: db.prepare('SELECT COUNT(*) as c FROM agents').get().c,
  qualtyAgents: db.prepare("SELECT COUNT(*) as c FROM agents WHERE role='qualty'").get().c,
  applications: db.prepare('SELECT COUNT(*) as c FROM applications').get().c,
  approved: db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='approved'").get().c,
  rejected: db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='rejected'").get().c,
  pending: db.prepare("SELECT COUNT(*) as c FROM applications WHERE status='pending'").get().c,
  jobs: db.prepare('SELECT COUNT(*) as c FROM jobs').get().c,
  selections: db.prepare('SELECT COUNT(*) as c FROM selections').get().c,
  hired: db.prepare('SELECT COUNT(*) as c FROM selections WHERE hired=1').get().c,
  companies: db.prepare('SELECT COUNT(*) as c FROM companies').get().c,
};

console.log(`  Users: ${stats.users}`);
console.log(`  Agents: ${stats.agents} (${stats.qualtyAgents} qualty)`);
console.log(`  Applications: ${stats.applications} (${stats.approved} approved, ${stats.rejected} rejected, ${stats.pending} pending)`);
console.log(`  Jobs: ${stats.jobs}`);
console.log(`  Selections: ${stats.selections} (${stats.hired} hired)`);
console.log(`  Companies: ${stats.companies}`);

console.log('\n✅ Fake data seeding complete!');
console.log('🔑 All test accounts password: 123456');
console.log('📧 Agent emails: ahmed.agent@test.com, sara.agent@test.com, mohamed.agent@test.com, etc.');
console.log('👤 User emails: user1@test.com, user2@test.com, ... user100@test.com');

db.close();