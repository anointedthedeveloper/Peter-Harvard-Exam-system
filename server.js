const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATABASE_DIR = path.join(__dirname, 'database');
const RESULTS_FILE = path.join(DATABASE_DIR, 'results.json');
const USERS_FILE = path.join(DATABASE_DIR, 'users.json');
const LOGS_FILE = path.join(DATABASE_DIR, 'logs.json');
const ACTIVITY_FILE = path.join(DATABASE_DIR, 'activity.json');
const RESETS_FILE = path.join(DATABASE_DIR, 'resets.json');
const AUDIT_FILE = path.join(DATABASE_DIR, 'audit.json');
const EXAM_STATUS_FILE = path.join(DATABASE_DIR, 'exam_status.json');

[PUBLIC_DIR, UPLOADS_DIR, DATABASE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '[]');
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, '[]');
if (!fs.existsSync(ACTIVITY_FILE)) fs.writeFileSync(ACTIVITY_FILE, '[]');
if (!fs.existsSync(RESETS_FILE)) fs.writeFileSync(RESETS_FILE, '{}');
if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '[]');
if (!fs.existsSync(EXAM_STATUS_FILE)) fs.writeFileSync(EXAM_STATUS_FILE, '{}');

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify({
    teachers: [
      { id: 'teacher1', password: 'pass123', name: 'Mr. Johnson', subject: 'Mathematics' },
      { id: 'teacher2', password: 'pass123', name: 'Mrs. Smith', subject: 'English Language' }
    ],
    students: [
      { id: 'STU001', password: '', name: 'Alice Brown', class: 'JSS1' },
      { id: 'STU002', password: '', name: 'Bob Green', class: 'JSS2' },
      { id: 'STU003', password: '', name: 'Carol White', class: 'SS1' },
      { id: 'STU004', password: '', name: 'David Okonkwo', class: 'SS2' },
      { id: 'STU005', password: '', name: 'Emeka Adeyemi', class: 'JSS3' }
    ],
    admins: [{ id: 'admin', password: 'admin123', name: 'Administrator' }]
  }, null, 2));
}

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
function sysLog(action, detail, actor) {
  const logs = readJSON(LOGS_FILE) || [];
  logs.push({ time: new Date().toISOString(), action, detail, actor: actor || 'system' });
  if (logs.length > 2000) logs.splice(0, logs.length - 2000);
  writeJSON(LOGS_FILE, logs);
}
function auditLog(action, actor, detail, metadata) {
  const audit = readJSON(AUDIT_FILE) || [];
  audit.unshift({ id: Date.now() + Math.random(), time: new Date().toISOString(), action, actor, detail, metadata: metadata || {} });
  if (audit.length > 1000) audit.splice(1000);
  writeJSON(AUDIT_FILE, audit);
}
function logActivity(studentId, studentName, action, detail) {
  const activity = readJSON(ACTIVITY_FILE) || [];
  activity.push({ time: new Date().toISOString(), studentId, studentName, action, detail });
  if (activity.length > 5000) activity.splice(0, activity.length - 5000);
  writeJSON(ACTIVITY_FILE, activity);
}
function getServerIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}
function getNetworkInfo() {
  const ifaces = os.networkInterfaces();
  const results = [];
  for (const [name, addrs] of Object.entries(ifaces)) {
    for (const iface of addrs) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const lname = name.toLowerCase();
        const type = (lname.includes('wi') || lname.includes('wlan') || lname.includes('wlp') || lname.includes('airport')) ? 'wifi' : 'ethernet';
        results.push({ name, address: iface.address, type });
      }
    }
  }
  return results;
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(body); } });
    req.on('error', reject);
  });
}
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ct = req.headers['content-type'] || '';
      const bm = ct.match(/boundary=(.+)/);
      if (!bm) return reject(new Error('No boundary'));
      const boundary = '--' + bm[1];
      const parts = buf.toString('binary').split(boundary);
      const files = {};
      for (const part of parts) {
        if (!part || part === '--\r\n') continue;
        const [headers, ...bodyParts] = part.split('\r\n\r\n');
        if (!headers) continue;
        const nm = headers.match(/name="([^"]+)"/);
        const fm = headers.match(/filename="([^"]+)"/);
        if (nm && fm) {
          const content = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
          files[nm[1]] = { filename: fm[1], content: Buffer.from(content, 'binary') };
        }
      }
      resolve(files);
    });
    req.on('error', reject);
  });
}
function send(res, status, data, type = 'application/json') {
  const body = type === 'application/json' ? JSON.stringify(data) : data;
  res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  fs.readFile(filePath, (err, data) => {
    if (err) { send(res, 404, { error: 'Not found' }); return; }
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
}

const sessions = {};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,PATCH', 'Access-Control-Allow-Headers': 'Content-Type' });
    res.end(); return;
  }
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // STATIC FILES
  if (req.method === 'GET' && !pathname.startsWith('/api/')) {
    const file = pathname === '/' ? '/student.html' : pathname;
    const filePath = path.join(PUBLIC_DIR, file);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { serveFile(res, filePath); return; }
    send(res, 404, { error: 'Not found' }); return;
  }

  // AUTH
  if (req.method === 'POST' && pathname === '/api/login') {
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const role = body.role;
    const list = users[role + 's'] || [];
    const user = list.find(u => u.id === body.id && u.password === (body.password || ''));
    if (user) {
      sysLog('LOGIN', `${role}: ${user.id} (${user.name})`, user.id);
      auditLog('LOGIN', user.id, `${role} "${user.name}" logged in`, { role, ip: req.socket.remoteAddress });
      if (role === 'student') logActivity(user.id, user.name, 'LOGIN', 'Student logged in');
      send(res, 200, { ok: true, name: user.name, role, subject: user.subject || '', class: user.class || '' });
    } else {
      auditLog('LOGIN_FAIL', body.id || 'unknown', `Failed login attempt for role: ${role}`, { role, ip: req.socket.remoteAddress });
      send(res, 401, { ok: false, error: 'Invalid credentials' });
    }
    return;
  }

  // SERVER INFO
  if (req.method === 'GET' && pathname === '/api/info') {
    send(res, 200, {
      ip: getServerIP(), port: PORT,
      time: new Date().toISOString(),
      networks: getNetworkInfo(),
      uptime: process.uptime(),
      platform: os.platform(),
      hostname: os.hostname(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpus: os.cpus().length
    });
    return;
  }

  // EXAMS LIST
  if (req.method === 'GET' && pathname === '/api/exams') {
    try {
      const examStatus = readJSON(EXAM_STATUS_FILE) || {};
      const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.json'));
      const exams = files.map(f => {
        const data = readJSON(path.join(UPLOADS_DIR, f));
        const active = examStatus[f] !== false;
        return {
          filename: f,
          name: data?.exam || f,
          subject: data?.subject || '',
          class: data?.class || '',
          teacherId: data?.teacherId || '',
          duration: data?.duration || 30,
          questionCount: data?.questions?.length || 0,
          active
        };
      });
      send(res, 200, exams);
    } catch { send(res, 200, []); }
    return;
  }

  // SINGLE EXAM
  if (req.method === 'GET' && pathname.startsWith('/api/exam/')) {
    const filename = decodeURIComponent(pathname.replace('/api/exam/', ''));
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) { send(res, 404, { error: 'Exam not found' }); return; }
    const examStatus = readJSON(EXAM_STATUS_FILE) || {};
    if (examStatus[filename] === false) { send(res, 403, { error: 'This exam is currently unavailable' }); return; }
    send(res, 200, readJSON(filePath)); return;
  }

  // UPLOAD EXAM
  if (req.method === 'POST' && pathname === '/api/upload') {
    try {
      const files = await parseMultipart(req);
      const file = files['exam'];
      if (!file) { send(res, 400, { error: 'No file' }); return; }
      const content = file.content.toString('utf8');
      const data = JSON.parse(content);
      const saveName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(UPLOADS_DIR, saveName), content);
      const examStatus = readJSON(EXAM_STATUS_FILE) || {};
      examStatus[saveName] = true;
      writeJSON(EXAM_STATUS_FILE, examStatus);
      sysLog('UPLOAD', `Exam: ${saveName} | Subject: ${data.subject || 'N/A'} | Class: ${data.class || 'N/A'}`);
      auditLog('EXAM_UPLOAD', 'teacher', `Uploaded exam: ${data.exam || saveName}`, { filename: saveName, subject: data.subject, class: data.class, questions: data.questions?.length });
      send(res, 200, { ok: true, filename: saveName });
    } catch (e) { send(res, 400, { error: 'Invalid file: ' + e.message }); }
    return;
  }

  // DELETE EXAM
  if (req.method === 'DELETE' && pathname.startsWith('/api/exam/')) {
    const filename = decodeURIComponent(pathname.replace('/api/exam/', ''));
    const filePath = path.join(UPLOADS_DIR, filename);
    const data = fs.existsSync(filePath) ? readJSON(filePath) : null;
    if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); }
    const examStatus = readJSON(EXAM_STATUS_FILE) || {};
    delete examStatus[filename];
    writeJSON(EXAM_STATUS_FILE, examStatus);
    sysLog('DELETE_EXAM', filename);
    auditLog('EXAM_DELETE', 'teacher', `Deleted exam: ${data?.exam || filename}`, { filename });
    send(res, 200, { ok: true }); return;
  }

  // SET EXAM ACTIVE/INACTIVE
  if ((req.method === 'POST' || req.method === 'PATCH') && pathname.startsWith('/api/exam-status/')) {
    const filename = decodeURIComponent(pathname.replace('/api/exam-status/', ''));
    const body = await parseBody(req);
    const examStatus = readJSON(EXAM_STATUS_FILE) || {};
    examStatus[filename] = body.active === true || body.active === 'true';
    writeJSON(EXAM_STATUS_FILE, examStatus);
    sysLog('EXAM_STATUS', `${filename}: ${examStatus[filename] ? 'activated' : 'deactivated'}`, body.teacherId || 'teacher');
    auditLog('EXAM_STATUS_CHANGE', body.teacherId || 'teacher', `Exam "${filename}" set to ${examStatus[filename] ? 'ACTIVE' : 'INACTIVE'}`, { filename, active: examStatus[filename] });
    send(res, 200, { ok: true, active: examStatus[filename] }); return;
  }

  // SUBMIT EXAM
  if (req.method === 'POST' && pathname === '/api/submit') {
    const body = await parseBody(req);
    const results = readJSON(RESULTS_FILE) || [];
    const users = readJSON(USERS_FILE);
    const studentUser = (users?.students || []).find(u => u.id === body.studentId);
    const studentClass = studentUser?.class || body.studentClass || '';
    let examSubject = body.subject || '';
    let examClass = body.examClass || '';
    const examFilename = body.examFilename || '';
    if (examFilename) {
      const examData = readJSON(path.join(UPLOADS_DIR, examFilename));
      if (examData) {
        examSubject = examData.subject || examSubject;
        examClass = examData.class || examClass;
      }
    }
    const entry = {
      ...body,
      studentClass,
      subject: examSubject,
      examClass,
      submittedAt: new Date().toISOString(),
      id: Date.now()
    };
    results.push(entry);
    writeJSON(RESULTS_FILE, results);
    sysLog('SUBMIT', `Student: ${body.student} | Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`, body.studentId);
    auditLog('EXAM_SUBMIT', body.studentId || body.student, `Submitted "${body.exam}" — Score: ${body.score}/${body.total} (${body.percentage}%)`, { exam: body.exam, score: body.score, total: body.total, percentage: body.percentage, tabViolations: body.tabViolations, studentClass });
    logActivity(body.studentId, body.student, 'SUBMIT', `Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`);
    delete sessions[body.studentId || body.student];
    const resets = readJSON(RESETS_FILE) || {};
    delete resets[body.studentId || body.student];
    writeJSON(RESETS_FILE, resets);
    send(res, 200, { ok: true }); return;
  }

  // RESULTS
  if (req.method === 'GET' && pathname === '/api/results') {
    send(res, 200, readJSON(RESULTS_FILE) || []); return;
  }

  // RESULTS CSV DETAILED
  if (req.method === 'GET' && pathname === '/api/results/csv') {
    const results = readJSON(RESULTS_FILE) || [];
    const rows = [
      'Student Name,Student ID,Class,Exam Name,Subject,Exam Class,Score,Total Questions,Percentage,Tab Violations,Time Taken (s),Submitted At',
      ...results.map(r => [
        `"${(r.student || '').replace(/"/g, '""')}"`,
        `"${r.studentId || ''}"`,
        `"${r.studentClass || ''}"`,
        `"${(r.exam || '').replace(/"/g, '""')}"`,
        `"${r.subject || ''}"`,
        `"${r.examClass || ''}"`,
        r.score,
        r.total || '',
        r.percentage != null ? r.percentage + '%' : '',
        r.tabViolations || 0,
        r.timeTaken || '',
        `"${r.submittedAt || ''}"`
      ].join(','))
    ];
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="results_detailed.csv"', 'Access-Control-Allow-Origin': '*' });
    res.end(rows.join('\n')); return;
  }

  // SINGLE RESULT CSV
  if (req.method === 'GET' && pathname.startsWith('/api/results/csv/')) {
    const resultId = parseInt(pathname.replace('/api/results/csv/', ''));
    const results = readJSON(RESULTS_FILE) || [];
    const r = results.find(r => r.id === resultId);
    if (!r) { send(res, 404, { error: 'Result not found' }); return; }
    const rows = [
      'Student Name,Student ID,Class,Exam Name,Subject,Exam Class,Score,Total Questions,Percentage,Tab Violations,Time Taken (s),Submitted At',
      [
        `"${(r.student || '').replace(/"/g, '""')}"`,
        `"${r.studentId || ''}"`,
        `"${r.studentClass || ''}"`,
        `"${(r.exam || '').replace(/"/g, '""')}"`,
        `"${r.subject || ''}"`,
        `"${r.examClass || ''}"`,
        r.score,
        r.total || '',
        r.percentage != null ? r.percentage + '%' : '',
        r.tabViolations || 0,
        r.timeTaken || '',
        `"${r.submittedAt || ''}"`
      ].join(',')
    ];
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename="result_${r.studentId || r.student}.csv"`, 'Access-Control-Allow-Origin': '*' });
    res.end(rows.join('\n')); return;
  }

  // RESULTS JSON DOWNLOAD
  if (req.method === 'GET' && pathname === '/api/results/json') {
    const results = readJSON(RESULTS_FILE) || [];
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="results.json"', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(results, null, 2)); return;
  }

  // DELETE SINGLE RESULT
  if (req.method === 'DELETE' && pathname.startsWith('/api/result/')) {
    const id = parseInt(pathname.replace('/api/result/', ''));
    let results = readJSON(RESULTS_FILE) || [];
    const r = results.find(r => r.id === id);
    results = results.filter(r => r.id !== id);
    writeJSON(RESULTS_FILE, results);
    auditLog('RESULT_DELETE', 'teacher', `Deleted result for "${r?.student}" on "${r?.exam}"`, { resultId: id });
    send(res, 200, { ok: true }); return;
  }

  // CLEAR ALL RESULTS
  if (req.method === 'DELETE' && pathname === '/api/results') {
    const count = (readJSON(RESULTS_FILE) || []).length;
    writeJSON(RESULTS_FILE, []);
    sysLog('CLEAR_RESULTS', `All ${count} results cleared`);
    auditLog('RESULTS_CLEAR_ALL', 'admin', `Cleared all ${count} results`, { count });
    send(res, 200, { ok: true }); return;
  }

  // SESSION PING
  if (req.method === 'POST' && pathname === '/api/session') {
    const body = await parseBody(req);
    sessions[body.studentId || body.student] = { ...body, lastSeen: Date.now() };
    send(res, 200, { ok: true }); return;
  }

  if (req.method === 'GET' && pathname === '/api/sessions') {
    const now = Date.now();
    const active = Object.values(sessions).filter(s => now - s.lastSeen < 90000);
    send(res, 200, active); return;
  }

  // TAB VIOLATION
  if (req.method === 'POST' && pathname === '/api/tabviolation') {
    const body = await parseBody(req);
    logActivity(body.studentId, body.student, 'TAB_VIOLATION', `Exam: ${body.exam} | Violation #${body.count}`);
    sysLog('TAB_VIOLATION', `${body.student} - #${body.count} in ${body.exam}`, body.studentId);
    auditLog('TAB_VIOLATION', body.studentId || body.student, `Tab switch violation #${body.count} during "${body.exam}"`, { exam: body.exam, count: body.count });
    if (sessions[body.studentId || body.student]) sessions[body.studentId || body.student].tabViolations = body.count;
    send(res, 200, { ok: true }); return;
  }

  // RESET CHECK
  if (req.method === 'GET' && pathname.startsWith('/api/reset-check/')) {
    const studentId = decodeURIComponent(pathname.replace('/api/reset-check/', ''));
    const resets = readJSON(RESETS_FILE) || {};
    send(res, 200, { reset: !!resets[studentId], exam: resets[studentId] || null }); return;
  }

  // RESET STUDENT
  if (req.method === 'POST' && pathname === '/api/reset-student') {
    const body = await parseBody(req);
    const resets = readJSON(RESETS_FILE) || {};
    if (body.clear) { delete resets[body.studentId]; } else { resets[body.studentId] = body.exam || true; }
    writeJSON(RESETS_FILE, resets);
    delete sessions[body.studentId];
    sysLog('RESET_STUDENT', `Reset ${body.studentId} for exam: ${body.exam || 'any'}`, body.teacherId || 'teacher');
    auditLog('STUDENT_RESET', body.teacherId || 'teacher', `Reset exam for student: ${body.studentId} (exam: ${body.exam || 'any'})`, { studentId: body.studentId, exam: body.exam });
    logActivity(body.studentId, body.studentId, 'RESET', `Exam reset by teacher for: ${body.exam || 'any'}`);
    send(res, 200, { ok: true }); return;
  }

  // USERS
  if (req.method === 'GET' && pathname === '/api/users') {
    send(res, 200, readJSON(USERS_FILE)); return;
  }

  if (req.method === 'POST' && pathname === '/api/users') {
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const listKey = body.role + 's';
    if (!users[listKey]) { send(res, 400, { error: 'Invalid role' }); return; }
    if (users[listKey].find(u => u.id === body.id)) { send(res, 400, { error: 'ID already exists' }); return; }
    const newUser = { id: body.id, password: body.password || '', name: body.name };
    if (body.role === 'student' && body.class) newUser.class = body.class;
    if (body.role === 'teacher' && body.subject) newUser.subject = body.subject;
    users[listKey].push(newUser);
    writeJSON(USERS_FILE, users);
    sysLog('ADD_USER', `${body.role}: ${body.id} (${body.name})`, body.createdBy || 'admin');
    auditLog('USER_CREATE', body.createdBy || 'admin', `Created ${body.role}: ${body.name} (${body.id})`, { role: body.role, userId: body.id, class: body.class, subject: body.subject });
    send(res, 200, { ok: true }); return;
  }

  if (req.method === 'DELETE' && pathname.startsWith('/api/users/') && !pathname.includes('/password')) {
    const parts = pathname.replace('/api/users/', '').split('/');
    const role = parts[0], id = parts[1];
    const users = readJSON(USERS_FILE);
    const listKey = role + 's';
    const user = (users[listKey] || []).find(u => u.id === id);
    users[listKey] = (users[listKey] || []).filter(u => u.id !== id);
    writeJSON(USERS_FILE, users);
    sysLog('DELETE_USER', `${role}: ${id}`);
    auditLog('USER_DELETE', 'admin', `Deleted ${role}: ${user?.name || id} (${id})`, { role, userId: id });
    send(res, 200, { ok: true }); return;
  }

  // RESET USER PASSWORD
  if ((req.method === 'POST' || req.method === 'PATCH') && pathname.includes('/password')) {
    const parts = pathname.replace('/api/users/', '').replace('/password', '').split('/');
    const role = parts[0], id = parts[1];
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const listKey = role + 's';
    const user = (users[listKey] || []).find(u => u.id === id);
    if (!user) { send(res, 404, { error: 'User not found' }); return; }
    user.password = body.password || '';
    writeJSON(USERS_FILE, users);
    auditLog('PASSWORD_RESET', body.changedBy || 'admin', `Reset password for ${role}: ${user.name} (${id})`, { role, userId: id });
    sysLog('PASSWORD_RESET', `${role}: ${id}`, body.changedBy || 'admin');
    send(res, 200, { ok: true }); return;
  }

  // STUDENT LIST
  if (req.method === 'GET' && pathname === '/api/student-list') {
    const users = readJSON(USERS_FILE);
    const students = (users?.students || []).map(s => ({ studentId: s.id, studentName: s.name, class: s.class || '', passwordSet: !!s.password }));
    send(res, 200, students); return;
  }

  // STUDENT LIST CSV
  if (req.method === 'GET' && pathname === '/api/student-list/csv') {
    const users = readJSON(USERS_FILE);
    const students = users?.students || [];
    const rows = [
      'Student ID,Student Name,Class,Password Set',
      ...students.map(s => [`"${s.id}"`, `"${(s.name || '').replace(/"/g, '""')}"`, `"${s.class || ''}"`, s.password ? 'Yes' : 'No'].join(','))
    ];
    res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="student_list.csv"', 'Access-Control-Allow-Origin': '*' });
    res.end(rows.join('\n')); return;
  }

  // STUDENT LIST JSON
  if (req.method === 'GET' && pathname === '/api/student-list/json') {
    const users = readJSON(USERS_FILE);
    const students = (users?.students || []).map(s => ({ studentId: s.id, studentName: s.name, class: s.class || '' }));
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="student_list.json"', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(students, null, 2)); return;
  }

  // LOGS
  if (req.method === 'GET' && pathname === '/api/logs') {
    send(res, 200, (readJSON(LOGS_FILE) || []).reverse()); return;
  }

  // AUDIT TRAIL
  if (req.method === 'GET' && pathname === '/api/audit') {
    send(res, 200, readJSON(AUDIT_FILE) || []); return;
  }

  // ACTIVITY
  if (req.method === 'GET' && pathname === '/api/activity') {
    send(res, 200, (readJSON(ACTIVITY_FILE) || []).reverse()); return;
  }
  if (req.method === 'GET' && pathname.startsWith('/api/activity/')) {
    const studentId = decodeURIComponent(pathname.replace('/api/activity/', ''));
    const activity = (readJSON(ACTIVITY_FILE) || []).filter(a => a.studentId === studentId).reverse();
    send(res, 200, activity); return;
  }

  send(res, 404, { error: 'Unknown endpoint' });
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = getServerIP();
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║   PETER HARVARD INTERNATIONAL SCHOOLS            ║');
  console.log('║           EXAM SYSTEM  v1.0                      ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Local:    http://localhost:${PORT}                 ║`);
  console.log(`║  Network:  http://${ip}:${PORT}              ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Student : http://localhost:${PORT}/student.html                         ║`);
  console.log(`║  Teacher : http://localhost:${PORT}/teacher.html                         ║`);
  console.log(`║  Admin   : http://localhost:${PORT}/admin.html                           ║`);
  console.log('╠══════════════════════════════════════════════════╣');
  console.log('║  Developed by: anointedthedeveloper              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');
});
