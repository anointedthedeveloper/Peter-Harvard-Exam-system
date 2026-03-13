const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');

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
const SESSIONS_FILE = path.join(DATABASE_DIR, 'sessions.json');
const DROPBOX_FILE = path.join(DATABASE_DIR, 'dropbox.json');

// Live in-memory sessions (for active exam monitoring)
const liveSessions = {};

[PUBLIC_DIR, UPLOADS_DIR, DATABASE_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Initialize files if they don't exist
if (!fs.existsSync(RESULTS_FILE)) fs.writeFileSync(RESULTS_FILE, '[]');
if (!fs.existsSync(LOGS_FILE)) fs.writeFileSync(LOGS_FILE, '[]');
if (!fs.existsSync(ACTIVITY_FILE)) fs.writeFileSync(ACTIVITY_FILE, '[]');
if (!fs.existsSync(RESETS_FILE)) fs.writeFileSync(RESETS_FILE, '{}');
if (!fs.existsSync(AUDIT_FILE)) fs.writeFileSync(AUDIT_FILE, '[]');
if (!fs.existsSync(EXAM_STATUS_FILE)) fs.writeFileSync(EXAM_STATUS_FILE, '{}');
if (!fs.existsSync(SESSIONS_FILE)) fs.writeFileSync(SESSIONS_FILE, '{}');
if (!fs.existsSync(DROPBOX_FILE)) fs.writeFileSync(DROPBOX_FILE, '[]');

// Create initial users if not exists
if (!fs.existsSync(USERS_FILE)) {
  const initialUsers = {
    teachers: [
      { id: 'teacher1', password: 'pass123', name: 'Teacher One' }
    ],
    students: [],
    admins: [
      { id: 'admin', password: 'admin123', name: 'Administrator' }
    ]
  };
  
  // Add all students from the provided data
  const studentData = [
    { id: 'PHIS/PP/1213', name: 'ABDULWAHAB RAHAMA OYIZA', class: 'SS 1' },
    { id: 'PHIS/PP/945', name: 'ADEYINKA JESUSEFUNMI', class: 'SS 1' },
    { id: 'PHIS/PP/946', name: 'AGBALOKWU IKECHI', class: 'SS 1' },
    { id: 'PHIS/PP/729', name: 'AHMAD IBRAHIM MUHAMMAD', class: 'SS 1' },
    { id: 'PHIS/PP/716', name: 'ARCHIBONG HENRY', class: 'SS 1' },
    { id: 'PHIS/PP/1200', name: 'ARO-LAMBO IBRAHIM KOLAWOLE', class: 'SS 1' },
    { id: 'PHIS/PP/965', name: 'BOMBUM ABANG DAVID', class: 'SS 1' },
    { id: 'Phis/pp/472', name: 'CHIJIOKE UCHENNA DAVID', class: 'SS 1' },
    { id: 'PHIS/PP/1220', name: 'CHRISTIAN DAVID', class: 'SS 1' },
    { id: 'PHIS/PP/948', name: 'IBHAWA EMMANUELLA', class: 'SS 1' },
    { id: 'PHIS/PP/1230', name: 'IBRAHIM MOHAMMED ALKASIM', class: 'SS 1' },
    { id: 'PHIS/PP/949', name: 'IRABOR LUCIE', class: 'SS 1' },
    { id: 'PHIS/PP/1181', name: 'IROENYEONWU EBUBE', class: 'SS 1' },
    { id: 'PHIS/PP/959', name: 'KELECHI AHUNANYA CHIDINMA', class: 'SS 1' },
    { id: 'PHIS/PP/205', name: 'KOLAWOLE OJO BUKOLA', class: 'SS 1' },
    { id: 'phis/pp/242', name: 'ODIASE CHARLES OSAZE', class: 'SS 1' },
    { id: 'PHIS/PP/1003', name: 'OGBOGU OSITADILIGA DOMINIC', class: 'SS 1' },
    { id: 'PHIS/PP/1018', name: 'OKOROAFOR CHRISTABEL MUNACHISO', class: 'SS 1' },
    { id: 'PHIS/PP/1005', name: 'OYEWUSI AYOTUNDE FAVOUR', class: 'SS 1' },
    { id: 'PHIS/PP/952', name: 'SHEHU YAKUBU JIMETA', class: 'SS 1' },
    { id: 'PHIS/PP/953', name: 'UGWU SOMTOCHUKWU', class: 'SS 1' },
    { id: 'PHIS/PP/728', name: 'UMEGBORO PRAISE', class: 'SS 1' },
    { id: 'PHIS/PP/954', name: 'WEALTH GREAT', class: 'SS 1' },
    { id: 'Phis/pp/383', name: 'ABANG EMMANUELLA BOMBUM', class: 'SS 2' },
    { id: 'Phis/pp/353', name: 'AKINLADE HAROLD OLUWASEYI', class: 'SS 2' },
    { id: 'Phis/pp/384', name: 'AKUNNE KAYLA CHISOM', class: 'SS 2' },
    { id: 'PHIS/PP/615', name: 'ANTE NEMINE GRACE', class: 'SS 2' },
    { id: 'PHIS/PP/684', name: 'APOI FEGIRO DAVID', class: 'SS 2' },
    { id: 'PHIS/PP/1232', name: 'BENSON LUCKY INALEGWO', class: 'SS 2' },
    { id: 'PHIS/PP/1097', name: 'CHIBUEZE CHINEYE JUDITH', class: 'SS 2' },
    { id: 'Phis/pp/1098', name: 'CHIBUEZE IZUCHUKWU SMART', class: 'SS 2' },
    { id: 'PHIS/PP/1146', name: 'DIRISU DANIEL', class: 'SS 2' },
    { id: 'PHIS/PP/1228', name: 'ENENCHE SHALOM OWOICHO', class: 'SS 2' },
    { id: 'PHIS/PP/1064', name: 'EWUZIE EMMANUEL KENECHUKWU', class: 'SS 2' },
    { id: 'PHIS/PP/725', name: 'EZE CHINANZA', class: 'SS 2' },
    { id: 'PHIS/PP/1053', name: 'EZEKIEL OJOCHEGBE SUCCESS', class: 'SS 2' },
    { id: 'PHIS/PP/1014', name: 'IBRAHIM AHUOIZA BASHEERA', class: 'SS 2' },
    { id: 'Phis/pp/379', name: 'IBRAHIM AISHA JIBRIN', class: 'SS 2' },
    { id: 'phis/pp/203', name: 'KOLAWOLE-OJO BISOLA RACHAEL', class: 'SS 2' },
    { id: 'phis/pp/097', name: 'NNAEKWE MUNACHI GIFT', class: 'SS 2' },
    { id: 'PHIS/PP/1159', name: 'OBASANYA EZEKIEL ADEFOLARIN', class: 'SS 2' },
    { id: 'PHIS/PP/1055', name: 'OLADIPO ENIOLA', class: 'SS 2' },
    { id: 'PHIS/PP/805', name: 'OLOMOLA JOSHUA', class: 'SS 2' },
    { id: 'PHIS/PP/0570', name: 'ORISAKWE CHIDINMA MIRACLE', class: 'SS 2' },
    { id: 'PHIS/PP/838', name: 'SAFIRU A IBRAHIM EWELA', class: 'SS 2' },
    { id: 'Phis/pp/493', name: 'SAMALI DEBORAH', class: 'SS 2' },
    { id: 'PHIS/PP/1006', name: 'SULEIMON BOLUWATIFE MISTURA', class: 'SS 2' },
    { id: 'PHIS/PP/1063', name: 'UGWU RITA CHINAZA', class: 'SS 2' },
    { id: 'PHIS/PP/1049', name: 'UGWU TREASURE EKPEREAMAKA', class: 'SS 2' },
    { id: 'PHIS/PP/901', name: 'UMAR ABDULJABAAR', class: 'SS 2' },
    { id: 'PHIS/PP/685', name: 'UMEGBORO PEARL CHIAMAKA', class: 'SS 2' },
    { id: 'Phis/pp/264', name: 'ABDULKAREEM UNAZE ZAINAB', class: 'SS 3' },
    { id: 'PHIS/PP/1212', name: 'ABDULWAHAB ABDULHAKEEM OGIRIMA', class: 'SS 3' },
    { id: 'PHIS/PP/686', name: 'ADEYINKA JESUNIFEMI', class: 'SS 3' },
    { id: 'PHIS/PP/638', name: 'AKANDE DANIEL', class: 'SS 3' },
    { id: 'PHIS/PP/1224', name: 'ALEGE FAWAZ OLAWALE', class: 'SS 3' },
    { id: 'PHIS/PP/902', name: 'ALHASSAN DAVID LOYE', class: 'SS 3' },
    { id: 'PHIS/PP/636', name: 'ANTE FRANCIS', class: 'SS 3' },
    { id: 'PHIS/PP/1038', name: 'APOI RURO OBINNA', class: 'SS 3' },
    { id: 'PHIS/PP/058', name: 'ATANDA OLUWAFUNMILAYO JEMIMA', class: 'SS 3' },
    { id: 'PHIS/PP/1050', name: 'BAIYE MIRACLE OZIOHU', class: 'SS 3' },
    { id: 'PHIS/PP/1030', name: 'CHINEDU KAMSIRIOCHUKWU ALLWELL', class: 'SS 3' },
    { id: 'PHIS/PP/966', name: 'DAVID DARREN', class: 'SS 3' },
    { id: 'PHIS/PP/057', name: 'DOGARI PROSPER SHIKUMI', class: 'SS 3' },
    { id: 'Phis/pp/443', name: 'EGWURUBE DIVINE OTSAPA', class: 'SS 3' },
    { id: 'PHIS/PP/894', name: 'EJILOGO PETER OCHANYI', class: 'SS 3' },
    { id: 'PHIS/PP/915', name: 'EMMANUEL CALEB', class: 'SS 3' },
    { id: 'phis/pp/188', name: 'EMMANUEL WISDOM ATEKOJO', class: 'SS 3' },
    { id: 'PHIS/PP/1072', name: 'IKENNA-ANYA DESTINY-SHARON', class: 'SS 3' },
    { id: 'PHIS/PP/850', name: 'LAMBERT EMENYONU CHIBUENYIM DAVID', class: 'SS 3' },
    { id: 'PHIS/PP/967', name: 'OGBOGU IFAKACHUKWU EMMANUEL', class: 'SS 3' },
    { id: 'Phis/pp/270', name: 'OKHUOYA THANKGOD MIZITA JOEL', class: 'SS 3' },
    { id: 'PHIS/PP/1153', name: 'OKLOBIA BISHOP AKONDU', class: 'SS 3' },
    { id: 'Phis/pp/399', name: 'DOGARI PROSPER SHIKUMI', class: 'SS 3' },
    { id: 'PHIS/PP/1235', name: 'SAMUEL BLOSSOM CHUKWUEMEKA', class: 'SS 3' },
    { id: 'PHIS/PP/687', name: 'UBAH FRANCIS', class: 'SS 3' }
  ];
  
  initialUsers.students = studentData.map(s => ({
    id: s.id,
    password: '',
    name: s.name,
    class: s.class
  }));
  
  // Add the default student1 for testing
  initialUsers.students.unshift({ id: 'student1', password: '', name: 'Student One', class: 'SS 1' });
  
  fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}

// Helper functions
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
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
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
function parseCSVLine(line) {
  const result = [];
  let inQuotes = false;
  let current = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
function send(res, status, data, type = 'application/json') {
  // Add security headers
  const headers = {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
  
  // For network connections, add upgrade-insecure-requests hint
  if (req && req.headers.host && !req.headers.host.includes('localhost')) {
    headers['Content-Security-Policy'] = "upgrade-insecure-requests";
  }
  
  const body = type === 'application/json' ? JSON.stringify(data) : data;
  res.writeHead(status, headers);
  res.end(body);
}
function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = { 
    '.html': 'text/html', 
    '.css': 'text/css', 
    '.js': 'application/javascript', 
    '.json': 'application/json', 
    '.png': 'image/png', 
    '.jpg': 'image/jpeg', 
    '.jpeg': 'image/jpeg', 
    '.gif': 'image/gif', 
    '.svg': 'image/svg+xml', 
    '.ico': 'image/x-icon' 
  };
  
  fs.readFile(filePath, (err, data) => {
    if (err) { send(res, 404, { error: 'Not found' }); return; }
    
    // Add security headers
    const headers = {
      'Content-Type': types[ext] || 'text/plain',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
    
    res.writeHead(200, headers);
    res.end(data);
  });
}

// Session management
function saveSession(token, data) {
  const sessions = readJSON(SESSIONS_FILE) || {};
  sessions[token] = { ...data, lastAccessed: Date.now() };
  writeJSON(SESSIONS_FILE, sessions);
}
function getSession(token) {
  const sessions = readJSON(SESSIONS_FILE) || {};
  const session = sessions[token];
  if (session && Date.now() - session.lastAccessed < 86400000) { // 24 hour expiry
    return session;
  }
  return null;
}
function deleteSession(token) {
  const sessions = readJSON(SESSIONS_FILE) || {};
  delete sessions[token];
  writeJSON(SESSIONS_FILE, sessions);
}
function cleanupSessions() {
  const sessions = readJSON(SESSIONS_FILE) || {};
  let changed = false;
  const now = Date.now();
  for (const [token, data] of Object.entries(sessions)) {
    if (now - data.lastAccessed > 86400000) { // Remove sessions older than 24 hours
      delete sessions[token];
      changed = true;
    }
  }
  if (changed) writeJSON(SESSIONS_FILE, sessions);
}
setInterval(cleanupSessions, 3600000); // Cleanup every hour

// Dropbox functions
function saveToDropbox(filename, data, uploadedBy) {
  const dropbox = readJSON(DROPBOX_FILE) || [];
  dropbox.push({
    id: Date.now(),
    filename,
    data,
    uploadedBy,
    uploadedAt: new Date().toISOString()
  });
  writeJSON(DROPBOX_FILE, dropbox);
  return dropbox[dropbox.length - 1];
}
function getDropboxFiles() {
  return readJSON(DROPBOX_FILE) || [];
}
function deleteDropboxFile(id) {
  let dropbox = readJSON(DROPBOX_FILE) || [];
  dropbox = dropbox.filter(f => f.id !== id);
  writeJSON(DROPBOX_FILE, dropbox);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true'
    });
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

  // AUTH - Login
  if (req.method === 'POST' && pathname === '/api/login') {
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const role = body.role;
    const list = users[role + 's'] || [];
    
    // Case-insensitive ID matching
    const user = list.find(u => u.id.toLowerCase() === body.id.toLowerCase() && u.password === (body.password || ''));
    
    if (user) {
      const token = generateSessionToken();
      const sessionData = { 
        id: user.id, 
        name: user.name, 
        role,
        subject: user.subject || '',
        class: user.class || ''
      };
      saveSession(token, sessionData);
      
      sysLog('LOGIN', `${role}: ${user.id} (${user.name})`, user.id);
      auditLog('LOGIN', user.id, `${role} "${user.name}" logged in`, { role, ip: req.socket.remoteAddress });
      if (role === 'student') logActivity(user.id, user.name, 'LOGIN', 'Student logged in');
      
      send(req, res, 200, { 
        ok: true, 
        token,
        name: user.name, 
        role, 
        subject: user.subject || '', 
        class: user.class || '',
        id: user.id
      });
    } else {
      auditLog('LOGIN_FAIL', body.id || 'unknown', `Failed login attempt for role: ${role}`, { role, ip: req.socket.remoteAddress });
      send(req, res, 401, { ok: false, error: 'Invalid credentials' });
    }
    return;
  }

  // AUTH - Check session
  if (req.method === 'POST' && pathname === '/api/check-session') {
    const body = await parseBody(req);
    const token = body.token;
    const session = getSession(token);
    
    if (session) {
      send(req, res, 200, { ok: true, ...session });
    } else {
      send(req, res, 401, { ok: false });
    }
    return;
  }

  // AUTH - Logout
  if (req.method === 'POST' && pathname === '/api/logout') {
    const body = await parseBody(req);
    const token = body.token;
    deleteSession(token);
    send(req, res, 200, { ok: true });
    return;
  }

  // SERVER INFO
  if (req.method === 'GET' && pathname === '/api/info') {
    send(req, res, 200, {
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

  // EXAMS LIST - Filtered by student class
  if (req.method === 'GET' && pathname === '/api/exams') {
    try {
      const studentClass = url.searchParams.get('class');
      const examStatus = readJSON(EXAM_STATUS_FILE) || {};
      const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.json'));
      
      let exams = files.map(f => {
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
      
      // Filter by student class if provided
      if (studentClass) {
        exams = exams.filter(e => {
          // If exam has no class specified, show to all
          if (!e.class) return true;
          // Check if exam class matches student class (case-insensitive)
          return e.class.toLowerCase() === studentClass.toLowerCase();
        });
      }
      
      send(req, res, 200, exams);
    } catch { send(req, res, 200, []); }
    return;
  }

  // SINGLE EXAM
  if (req.method === 'GET' && pathname.startsWith('/api/exam/')) {
    const filename = decodeURIComponent(pathname.replace('/api/exam/', ''));
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) { send(req, res, 404, { error: 'Exam not found' }); return; }
    const examStatus = readJSON(EXAM_STATUS_FILE) || {};
    if (examStatus[filename] === false) { send(req, res, 403, { error: 'This exam is currently unavailable' }); return; }
    send(req, res, 200, readJSON(filePath)); return;
  }

  // UPLOAD EXAM (JSON)
  if (req.method === 'POST' && pathname === '/api/upload') {
    try {
      const files = await parseMultipart(req);
      const file = files['exam'];
      if (!file) { send(req, res, 400, { error: 'No file' }); return; }
      const content = file.content.toString('utf8');
      const data = JSON.parse(content);
      const saveName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(UPLOADS_DIR, saveName), content);
      const examStatus = readJSON(EXAM_STATUS_FILE) || {};
      examStatus[saveName] = true;
      writeJSON(EXAM_STATUS_FILE, examStatus);
      sysLog('UPLOAD', `Exam: ${saveName} | Subject: ${data.subject || 'N/A'} | Class: ${data.class || 'N/A'}`);
      auditLog('EXAM_UPLOAD', 'teacher', `Uploaded exam: ${data.exam || saveName}`, { filename: saveName, subject: data.subject, class: data.class, questions: data.questions?.length });
      send(req, res, 200, { ok: true, filename: saveName });
    } catch (e) { send(req, res, 400, { error: 'Invalid file: ' + e.message }); }
    return;
  }

  // UPLOAD CSV EXAM
  if (req.method === 'POST' && pathname === '/api/upload-csv') {
    try {
      const files = await parseMultipart(req);
      const file = files['exam'];
      if (!file) { send(req, res, 400, { error: 'No file' }); return; }
      
      const content = file.content.toString('utf8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Parse CSV header
      const header = parseCSVLine(lines[0]);
      const requiredColumns = ['question_type', 'question_group', 'question_level', 'question', 'mark', 'option_1', 'option_2', 'option_3', 'option_4', 'answer'];
      
      // Validate header
      const missingColumns = requiredColumns.filter(col => !header.includes(col));
      if (missingColumns.length > 0) {
        send(req, res, 400, { error: `Missing required columns: ${missingColumns.join(', ')}` });
        return;
      }
      
      // Parse questions
      const questions = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const question = {};
        
        header.forEach((col, index) => {
          if (index < values.length) {
            question[col] = values[index];
          }
        });
        
        // Convert answer from "option_1" to actual option letter
        const answerMap = {
          'option_1': 'A',
          'option_2': 'B',
          'option_3': 'C',
          'option_4': 'D'
        };
        
        const answerKey = question.answer;
        question.answer = answerMap[answerKey] || 'A';
        
        questions.push(question);
      }
      
      // Get exam metadata from form fields
      const subject = url.searchParams.get('subject') || 'General';
      const examClass = url.searchParams.get('class') || '';
      const examName = url.searchParams.get('name') || `CSV Exam ${new Date().toLocaleDateString()}`;
      
      // Create JSON exam format
      const examData = {
        exam: examName,
        subject: subject,
        class: examClass,
        duration: 30,
        questions: questions.map(q => ({
          question: q.question,
          A: q.option_1,
          B: q.option_2,
          C: q.option_3,
          D: q.option_4,
          answer: q.answer
        }))
      };
      
      // Save as JSON file
      const saveName = file.filename.replace(/\.csv$/i, '.json').replace(/[^a-zA-Z0-9._-]/g, '_');
      fs.writeFileSync(path.join(UPLOADS_DIR, saveName), JSON.stringify(examData, null, 2));
      
      const examStatus = readJSON(EXAM_STATUS_FILE) || {};
      examStatus[saveName] = true;
      writeJSON(EXAM_STATUS_FILE, examStatus);
      
      // Save to dropbox
      saveToDropbox(saveName, examData, 'teacher');
      
      sysLog('UPLOAD_CSV', `CSV Exam: ${saveName} | Questions: ${questions.length}`, 'teacher');
      auditLog('EXAM_UPLOAD_CSV', 'teacher', `Uploaded CSV exam: ${examName}`, { filename: saveName, questions: questions.length, subject, class: examClass });
      
      send(req, res, 200, { ok: true, filename: saveName, questions: questions.length });
    } catch (e) { 
      send(req, res, 400, { error: 'Invalid CSV file: ' + e.message }); 
    }
    return;
  }

  // DROPBOX - Get files
  if (req.method === 'GET' && pathname === '/api/dropbox') {
    send(req, res, 200, getDropboxFiles());
    return;
  }

  // DROPBOX - Delete file
  if (req.method === 'DELETE' && pathname.startsWith('/api/dropbox/')) {
    const id = parseInt(pathname.replace('/api/dropbox/', ''));
    deleteDropboxFile(id);
    send(req, res, 200, { ok: true });
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
    send(req, res, 200, { ok: true }); return;
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
    send(req, res, 200, { ok: true, active: examStatus[filename] }); return;
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
    delete liveSessions[body.studentId || body.student];
    const resets = readJSON(RESETS_FILE) || {};
    delete resets[body.studentId || body.student];
    writeJSON(RESETS_FILE, resets);
    send(req, res, 200, { ok: true }); return;
  }

  // SESSION PING
  if (req.method === 'POST' && pathname === '/api/session') {
    const body = await parseBody(req);
    liveSessions[body.studentId || body.student] = { ...body, lastSeen: Date.now() };
    send(req, res, 200, { ok: true }); return;
  }

  if (req.method === 'GET' && pathname === '/api/sessions') {
    const now = Date.now();
    const active = Object.values(liveSessions).filter(s => now - s.lastSeen < 90000);
    send(req, res, 200, active); return;
  }

  // TAB VIOLATION
  if (req.method === 'POST' && pathname === '/api/tabviolation') {
    const body = await parseBody(req);
    logActivity(body.studentId, body.student, 'TAB_VIOLATION', `Exam: ${body.exam} | Violation #${body.count}`);
    sysLog('TAB_VIOLATION', `${body.student} - #${body.count} in ${body.exam}`, body.studentId);
    auditLog('TAB_VIOLATION', body.studentId || body.student, `Tab switch violation #${body.count} during "${body.exam}"`, { exam: body.exam, count: body.count });
    if (liveSessions[body.studentId || body.student]) liveSessions[body.studentId || body.student].tabViolations = body.count;
    send(req, res, 200, { ok: true }); return;
  }

  // RESET CHECK
  if (req.method === 'GET' && pathname.startsWith('/api/reset-check/')) {
    const studentId = decodeURIComponent(pathname.replace('/api/reset-check/', ''));
    const resets = readJSON(RESETS_FILE) || {};
    send(req, res, 200, { reset: !!resets[studentId], exam: resets[studentId] || null }); return;
  }

  // RESET STUDENT
  if (req.method === 'POST' && pathname === '/api/reset-student') {
    const body = await parseBody(req);
    const resets = readJSON(RESETS_FILE) || {};
    if (body.clear) { delete resets[body.studentId]; } else { resets[body.studentId] = body.exam || true; }
    writeJSON(RESETS_FILE, resets);
    delete liveSessions[body.studentId];
    sysLog('RESET_STUDENT', `Reset ${body.studentId} for exam: ${body.exam || 'any'}`, body.teacherId || 'teacher');
    auditLog('STUDENT_RESET', body.teacherId || 'teacher', `Reset exam for student: ${body.studentId} (exam: ${body.exam || 'any'})`, { studentId: body.studentId, exam: body.exam });
    logActivity(body.studentId, body.studentId, 'RESET', `Exam reset by teacher for: ${body.exam || 'any'}`);
    send(req, res, 200, { ok: true }); return;
  }

  // USERS
  if (req.method === 'GET' && pathname === '/api/users') {
    send(req, res, 200, readJSON(USERS_FILE)); return;
  }

  if (req.method === 'POST' && pathname === '/api/users') {
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const listKey = body.role + 's';
    if (!users[listKey]) { send(req, res, 400, { error: 'Invalid role' }); return; }
    if (users[listKey].find(u => u.id.toLowerCase() === body.id.toLowerCase())) { send(req, res, 400, { error: 'ID already exists' }); return; }
    const newUser = { id: body.id, password: body.password || '', name: body.name };
    if (body.role === 'student' && body.class) newUser.class = body.class;
    if (body.role === 'teacher' && body.subject) newUser.subject = body.subject;
    users[listKey].push(newUser);
    writeJSON(USERS_FILE, users);
    sysLog('ADD_USER', `${body.role}: ${body.id} (${body.name})`, body.createdBy || 'admin');
    auditLog('USER_CREATE', body.createdBy || 'admin', `Created ${body.role}: ${body.name} (${body.id})`, { role: body.role, userId: body.id, class: body.class, subject: body.subject });
    send(req, res, 200, { ok: true }); return;
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
    send(req, res, 200, { ok: true }); return;
  }

  // RESET USER PASSWORD
  if ((req.method === 'POST' || req.method === 'PATCH') && pathname.includes('/password')) {
    const parts = pathname.replace('/api/users/', '').replace('/password', '').split('/');
    const role = parts[0], id = parts[1];
    const body = await parseBody(req);
    const users = readJSON(USERS_FILE);
    const listKey = role + 's';
    const user = (users[listKey] || []).find(u => u.id === id);
    if (!user) { send(req, res, 404, { error: 'User not found' }); return; }
    user.password = body.password || '';
    writeJSON(USERS_FILE, users);
    auditLog('PASSWORD_RESET', body.changedBy || 'admin', `Reset password for ${role}: ${user.name} (${id})`, { role, userId: id });
    sysLog('PASSWORD_RESET', `${role}: ${id}`, body.changedBy || 'admin');
    send(req, res, 200, { ok: true }); return;
  }

  // STUDENT LIST
  if (req.method === 'GET' && pathname === '/api/student-list') {
    const users = readJSON(USERS_FILE);
    const students = (users?.students || []).map(s => ({ studentId: s.id, studentName: s.name, class: s.class || '', passwordSet: !!s.password }));
    send(req, res, 200, students); return;
  }

  // STUDENT LIST CSV
  if (req.method === 'GET' && pathname === '/api/student-list/csv') {
    const users = readJSON(USERS_FILE);
    const students = users?.students || [];
    const rows = [
      'Student ID,Student Name,Class,Password Set',
      ...students.map(s => [`"${s.id}"`, `"${(s.name || '').replace(/"/g, '""')}"`, `"${s.class || ''}"`, s.password ? 'Yes' : 'No'].join(','))
    ];
    res.writeHead(200, { 
      'Content-Type': 'text/csv', 
      'Content-Disposition': 'attachment; filename="student_list.csv"', 
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(rows.join('\n')); return;
  }

  // STUDENT LIST JSON
  if (req.method === 'GET' && pathname === '/api/student-list/json') {
    const users = readJSON(USERS_FILE);
    const students = (users?.students || []).map(s => ({ studentId: s.id, studentName: s.name, class: s.class || '' }));
    res.writeHead(200, { 
      'Content-Type': 'application/json', 
      'Content-Disposition': 'attachment; filename="student_list.json"', 
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(JSON.stringify(students, null, 2)); return;
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
    res.writeHead(200, { 
      'Content-Type': 'text/csv', 
      'Content-Disposition': 'attachment; filename="results_detailed.csv"', 
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(rows.join('\n')); return;
  }

  // SINGLE RESULT CSV
  if (req.method === 'GET' && pathname.startsWith('/api/results/csv/')) {
    const resultId = parseInt(pathname.replace('/api/results/csv/', ''));
    const results = readJSON(RESULTS_FILE) || [];
    const r = results.find(r => r.id === resultId);
    if (!r) { send(req, res, 404, { error: 'Result not found' }); return; }
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
    res.writeHead(200, { 
      'Content-Type': 'text/csv', 
      'Content-Disposition': `attachment; filename="result_${r.studentId || r.student}.csv"`, 
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(rows.join('\n')); return;
  }

  // RESULTS JSON DOWNLOAD
  if (req.method === 'GET' && pathname === '/api/results/json') {
    const results = readJSON(RESULTS_FILE) || [];
    res.writeHead(200, { 
      'Content-Type': 'application/json', 
      'Content-Disposition': 'attachment; filename="results.json"', 
      'Access-Control-Allow-Origin': '*',
      'X-Content-Type-Options': 'nosniff'
    });
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
    send(req, res, 200, { ok: true }); return;
  }

  // CLEAR ALL RESULTS
  if (req.method === 'DELETE' && pathname === '/api/results') {
    const count = (readJSON(RESULTS_FILE) || []).length;
    writeJSON(RESULTS_FILE, []);
    sysLog('CLEAR_RESULTS', `All ${count} results cleared`);
    auditLog('RESULTS_CLEAR_ALL', 'admin', `Cleared all ${count} results`, { count });
    send(req, res, 200, { ok: true }); return;
  }

  // LOGS
  if (req.method === 'GET' && pathname === '/api/logs') {
    send(req, res, 200, (readJSON(LOGS_FILE) || []).reverse()); return;
  }

  // AUDIT TRAIL
  if (req.method === 'GET' && pathname === '/api/audit') {
    send(req, res, 200, readJSON(AUDIT_FILE) || []); return;
  }

  // ACTIVITY
  if (req.method === 'GET' && pathname === '/api/activity') {
    send(req, res, 200, (readJSON(ACTIVITY_FILE) || []).reverse()); return;
  }
  if (req.method === 'GET' && pathname.startsWith('/api/activity/')) {
    const studentId = decodeURIComponent(pathname.replace('/api/activity/', ''));
    const activity = (readJSON(ACTIVITY_FILE) || []).filter(a => a.studentId === studentId).reverse();
    send(req, res, 200, activity); return;
  }

  send(req, res, 404, { error: 'Unknown endpoint' });
});

// Add send function to req object for headers
function send(req, res, status, data, type = 'application/json') {
  // Add security headers
  const headers = {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': 'true',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  };
  
  // For network connections, add upgrade-insecure-requests hint
  if (req && req.headers && req.headers.host && !req.headers.host.includes('localhost')) {
    headers['Content-Security-Policy'] = "upgrade-insecure-requests";
  }
  
  const body = type === 'application/json' ? JSON.stringify(data) : data;
  res.writeHead(status, headers);
  res.end(body);
}

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
  console.log('📁 CSV Import Format: question_type,question_group,question_level,question,mark,option_1,option_2,option_3,option_4,answer');
  console.log('🔒 Security headers enabled for all responses');
  console.log('📤 Results export available in CSV and JSON formats');
  console.log('🗑️ Dropbox feature enabled for exam archiving\n');
});