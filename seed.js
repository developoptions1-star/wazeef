const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const db = new Database('app.db');

const hash = bcrypt.hashSync('123456', 10);

// مستخدمين
const users = [
  { name: 'أحمد محمد', email: 'ahmed@test.com', phone: '01012345678' },
  { name: 'سارة علي', email: 'sara@test.com', phone: '01123456789' },
  { name: 'محمد حسن', email: 'mohamed@test.com', phone: '01234567890' },
  { name: 'فاطمة خالد', email: 'fatma@test.com', phone: '01098765432' },
  { name: 'عمر إبراهيم', email: 'omar@test.com', phone: '01187654321' },
  { name: 'نورا سعيد', email: 'nora@test.com', phone: '01276543210' },
  { name: 'خالد عبدالله', email: 'khaled@test.com', phone: '01065432109' },
  { name: 'مريم أحمد', email: 'mariam@test.com', phone: '01154321098' },
];

const insertUser = db.prepare('INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)');
const userIds = [];
for (const u of users) {
  const r = insertUser.run(u.name, u.email, hash, u.phone, 'user');
  userIds.push(r.lastInsertRowid);
}
console.log(`تم اضافة ${users.length} مستخدمين`);

// طلبات (applications)
const languages = ['en', 'ar', 'de', 'ja', 'fr', 'pt', 'es', 'tr'];
const statuses = ['pending', 'approved', 'rejected', 'approved', 'approved', 'pending', 'pending', 'rejected'];

const insertApp = db.prepare('INSERT INTO applications (user_id, audio_file, language, status) VALUES (?, ?, ?, ?)');
const appIds = [];
for (let i = 0; i < userIds.length; i++) {
  const r = insertApp.run(userIds[i], null, languages[i], statuses[i]);
  appIds.push(r.lastInsertRowid);
}
console.log(`تم اضافة ${appIds.length} طلبات`);

// وظائف للطلبات المقبولة
const jobs = [
  { appId: appIds[1], company: 'TechVision Egypt', position: 'مطور ويب', time: 'السبت 2 م', salary: 15000 },
  { appId: appIds[1], company: 'Digital Wave', position: 'مصمم UI/UX', time: 'الاثنين 10 ص', salary: 12000 },
  { appId: appIds[3], company: 'Smart Solutions', position: 'مدير مشاريع', time: 'الأحد 11 ص', salary: 20000 },
  { appId: appIds[3], company: 'CloudNet Systems', position: 'مطور Backend', time: 'الثلاثاء 3 م', salary: 18000 },
  { appId: appIds[4], company: 'DataFlow Analytics', position: 'محلل بيانات', time: 'الأربعاء 1 م', salary: 16000 },
  { appId: appIds[4], company: 'TechVision Egypt', position: 'مهندس ذكاء اصطناعي', time: 'الخميس 4 م', salary: 25000 },
];

const insertJob = db.prepare('INSERT INTO jobs (application_id, company_name, position, interview_time, salary, description) VALUES (?, ?, ?, ?, ?, ?)');
const jobIds = [];
for (const j of jobs) {
  const r = insertJob.run(j.appId, j.company, j.position, j.time, j.salary, 'وصف الوظيفة');
  jobIds.push(r.lastInsertRowid);
}
console.log(`تم اضافة ${jobs.length} وظائف`);

// اختيارات المستخدمين
const selections = [
  { userId: userIds[1], jobId: jobIds[0], status: 'confirmed', hired: 1, amount: 1.5 },
  { userId: userIds[3], jobId: jobIds[2], status: 'confirmed', hired: 1, amount: 2.0 },
  { userId: userIds[4], jobId: jobIds[4], status: 'cancelled', hired: 0, amount: 0 },
  { userId: userIds[1], jobId: jobIds[1], status: 'selected', hired: 0, amount: 0 },
  { userId: userIds[4], jobId: jobIds[5], status: 'selected', hired: 0, amount: 0 },
];

const insertSelection = db.prepare('INSERT INTO selections (user_id, job_id, status, hired, amount) VALUES (?, ?, ?, ?, ?)');
for (const s of selections) {
  insertSelection.run(s.userId, s.jobId, s.status, s.hired, s.amount);
}
console.log(`تم اضافة ${selections.length} اختيارات`);

console.log('\n=== ملخص البيانات ===');
console.log('المستخدمين:', db.prepare("SELECT COUNT(*) as c FROM users WHERE role='user'").get().c);
console.log('الطلبات:', db.prepare('SELECT COUNT(*) as c FROM applications').get().c);
console.log('الوظائف:', db.prepare('SELECT COUNT(*) as c FROM jobs').get().c);
console.log('الاختيارات:', db.prepare('SELECT COUNT(*) as c FROM selections').get().c);
console.log('التوظيف:', db.prepare("SELECT COUNT(*) as c FROM selections WHERE hired=1").get().c);
console.log('الملغي:', db.prepare("SELECT COUNT(*) as c FROM selections WHERE status='cancelled'").get().c);
console.log('في الانتظار:', db.prepare("SELECT COUNT(*) as c FROM selections WHERE status='selected'").get().c);

const earnings = db.prepare("SELECT SUM(amount) as total FROM selections WHERE hired=1").get();
console.log('اجمالي الارباح:', earnings.total || 0, 'جنيه (بالملايين)');

db.close();
