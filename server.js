const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = process.env.PORT || 5000;
const VERSION = '2.0.0';
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
const COMPUTERS_FILE = path.join(DATABASE_DIR, 'computers.json');
const SUBMITTED_EXAMS_FILE = path.join(DATABASE_DIR, 'submitted_exams.json');

// Live sessions
const liveSessions = {};
const activeTokens = new Map(); // Track active tokens by userId

// Create directories
[PUBLIC_DIR, UPLOADS_DIR, DATABASE_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Initialize files
const files = [RESULTS_FILE, LOGS_FILE, ACTIVITY_FILE, RESETS_FILE, AUDIT_FILE, 
               EXAM_STATUS_FILE, SESSIONS_FILE, COMPUTERS_FILE, SUBMITTED_EXAMS_FILE];
files.forEach(f => { if (!fs.existsSync(f)) fs.writeFileSync(f, '[]'); });

// Create initial users
if (!fs.existsSync(USERS_FILE)) {
    const initialUsers = {
        teachers: [
            { id: 'teacher1', password: 'pass123', name: 'Teacher One', subject: 'Computer Science' }
        ],
        students: [],
        admins: [
            { id: 'admin', password: 'admin123', name: 'Administrator' }
        ]
    };
    
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
        { id: 'PHIS/PP/399', name: 'DIVINE OMOKHAGBO ARIJE', class: 'SS 3' },
        { id: 'PHIS/PP/1235', name: 'SAMUEL BLOSSOM CHUKWUEMEKA', class: 'SS 3' },
        { id: 'PHIS/PP/687', name: 'UBAH FRANCIS', class: 'SS 3' },
        { id: 'PHIS/PP/1400', name: 'JUDITH UTTONJ', class: 'SS 3' }
    ];
    
    initialUsers.students = studentData.map(s => ({
        id: s.id,
        password: '',
        name: s.name,
        class: s.class
    }));
    
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
                results.push({ name, address: iface.address, type, mac: iface.mac });
            }
        }
    }
    return results;
}

function getComputerInfo(ip) {
    try {
        const hostname = os.hostname();
        const networkInterfaces = os.networkInterfaces();
        let mac = '00:00:00:00:00:00';
        let interfaceName = 'Unknown';
        
        for (const [name, interfaces] of Object.entries(networkInterfaces)) {
            for (const iface of interfaces) {
                if (iface.address === ip && !iface.internal) {
                    mac = iface.mac;
                    interfaceName = name;
                    break;
                }
            }
        }
        
        return {
            ip,
            mac,
            hostname,
            interface: interfaceName,
            platform: os.platform(),
            timestamp: new Date().toISOString()
        };
    } catch {
        return { ip, mac: 'Unknown', hostname: 'Unknown', timestamp: new Date().toISOString() };
    }
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

// Improved CSV parser that handles your exact format
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
    return result.map(field => field.trim());
}

// More flexible CSV validation - accepts various column name formats
function validateCSVHeaders(headers) {
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''));
    
    // Define required columns with their possible variations
    const requiredColumns = [
        { name: 'question', variations: ['question', 'questions', 'q'] },
        { name: 'option_1', variations: ['option_1', 'option1', 'opt1', 'optiona', 'a'] },
        { name: 'option_2', variations: ['option_2', 'option2', 'opt2', 'optionb', 'b'] },
        { name: 'option_3', variations: ['option_3', 'option3', 'opt3', 'optionc', 'c'] },
        { name: 'option_4', variations: ['option_4', 'option4', 'opt4', 'optiond', 'd'] },
        { name: 'answer', variations: ['answer', 'correctanswer', 'correct', 'ans'] }
    ];
    
    const missingColumns = [];
    const columnMapping = {};
    
    requiredColumns.forEach(req => {
        const found = headers.find((h, index) => {
            const normalized = normalizedHeaders[index];
            if (req.variations.includes(normalized)) {
                columnMapping[req.name] = h;
                return true;
            }
            return false;
        });
        
        if (!found) {
            missingColumns.push(req.name);
        }
    });
    
    return { valid: missingColumns.length === 0, missingColumns, columnMapping };
}

function send(req, res, status, data, type = 'application/json') {
    const headers = {
        'Content-Type': type,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    };
    
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
        '.ico': 'image/x-icon',
        '.webp': 'image/webp',
        '.crt': 'application/x-x509-ca-cert',
        '.pem': 'application/x-pem-file'
    };
    
    fs.readFile(filePath, (err, data) => {
        if (err) { send(null, res, 404, { error: 'Not found' }); return; }
        
        const headers = {
            'Content-Type': types[ext] || 'text/plain',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=3600'
        };
        
        res.writeHead(200, headers);
        res.end(data);
    });
}

// Session management with proper cleanup
function saveSession(token, data) {
    const sessions = readJSON(SESSIONS_FILE) || {};
    const userId = data.id;
    
    // Remove any existing session for this user
    if (activeTokens.has(userId)) {
        const oldToken = activeTokens.get(userId);
        delete sessions[oldToken];
        activeTokens.delete(userId);
    }
    
    // Save new session
    sessions[token] = { 
        ...data, 
        lastAccessed: Date.now(),
        createdAt: Date.now()
    };
    
    activeTokens.set(userId, token);
    writeJSON(SESSIONS_FILE, sessions);
    return true;
}

function getSession(token) {
    const sessions = readJSON(SESSIONS_FILE) || {};
    const session = sessions[token];
    
    if (session) {
        // Update last accessed
        session.lastAccessed = Date.now();
        sessions[token] = session;
        writeJSON(SESSIONS_FILE, sessions);
        return session;
    }
    
    return null;
}

function deleteSession(token) {
    const sessions = readJSON(SESSIONS_FILE) || {};
    const session = sessions[token];
    
    if (session) {
        activeTokens.delete(session.id);
        delete sessions[token];
        writeJSON(SESSIONS_FILE, sessions);
        return true;
    }
    
    return false;
}

function cleanupSessions() {
    const sessions = readJSON(SESSIONS_FILE) || {};
    let changed = false;
    const now = Date.now();
    
    for (const [token, data] of Object.entries(sessions)) {
        // Remove sessions older than 24 hours
        if (now - data.lastAccessed > 86400000) {
            activeTokens.delete(data.id);
            delete sessions[token];
            changed = true;
        }
    }
    
    if (changed) writeJSON(SESSIONS_FILE, sessions);
}

setInterval(cleanupSessions, 3600000);

// Computers tracking
function trackComputer(ip, studentId, studentName) {
    const computers = readJSON(COMPUTERS_FILE) || [];
    const computerInfo = getComputerInfo(ip);
    
    const existing = computers.find(c => c.ip === ip && c.studentId === studentId);
    if (existing) {
        existing.lastSeen = new Date().toISOString();
    } else {
        computers.push({
            ...computerInfo,
            studentId,
            studentName,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString()
        });
    }
    
    writeJSON(COMPUTERS_FILE, computers);
}

// Submitted exams tracking
function saveSubmittedExam(data) {
    const submitted = readJSON(SUBMITTED_EXAMS_FILE) || [];
    submitted.push({
        ...data,
        id: Date.now(),
        recordedAt: new Date().toISOString()
    });
    if (submitted.length > 1000) submitted.splice(0, submitted.length - 1000);
    writeJSON(SUBMITTED_EXAMS_FILE, submitted);
}

function getSubmittedExams() {
    return readJSON(SUBMITTED_EXAMS_FILE) || [];
}

// Shuffle array (for question randomization)
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
        // Special case for root certificate download
        if (pathname === '/phis-root.crt' || pathname === '/rootCA.crt') {
            const certPath = path.join(__dirname, 'phis-root.crt');
            if (fs.existsSync(certPath)) {
                serveFile(res, certPath);
                return;
            }
        }
        
        const file = pathname === '/' ? '/student.html' : pathname;
        const filePath = path.join(PUBLIC_DIR, file);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { serveFile(res, filePath); return; }
        send(req, res, 404, { error: 'Not found' }); return;
    }

    // AUTH - Login
    if (req.method === 'POST' && pathname === '/api/login') {
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE);
        const role = body.role;
        const list = users[role + 's'] || [];
        
        let user;
        if (role === 'student') {
            user = list.find(u => u.id.toLowerCase() === body.id.toLowerCase());
        } else {
            user = list.find(u => u.id.toLowerCase() === body.id.toLowerCase() && u.password === (body.password || ''));
        }
        
        if (user) {
            // Check if user already has an active session
            if (activeTokens.has(user.id)) {
                const existingToken = activeTokens.get(user.id);
                const sessions = readJSON(SESSIONS_FILE) || {};
                
                // If the session exists, allow re-login from same device
                if (sessions[existingToken]) {
                    // Return the existing token instead of creating a new one
                    send(req, res, 200, { 
                        ok: true, 
                        token: existingToken,
                        name: user.name, 
                        role, 
                        subject: user.subject || '', 
                        class: user.class || '',
                        id: user.id
                    });
                    return;
                } else {
                    // Session expired, remove from activeTokens
                    activeTokens.delete(user.id);
                }
            }
            
            const token = generateSessionToken();
            const sessionData = { 
                id: user.id, 
                name: user.name, 
                role,
                subject: user.subject || '',
                class: user.class || ''
            };
            
            saveSession(token, sessionData);
            
            if (role === 'student') {
                trackComputer(req.socket.remoteAddress, user.id, user.name);
            }
            
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

    // FORCE LOGOUT
    if (req.method === 'POST' && pathname === '/api/force-logout') {
        const body = await parseBody(req);
        const userId = body.userId;
        
        const sessions = readJSON(SESSIONS_FILE) || {};
        let tokenToDelete = null;
        for (const [token, data] of Object.entries(sessions)) {
            if (data.id === userId) {
                tokenToDelete = token;
                break;
            }
        }
        
        if (tokenToDelete) {
            deleteSession(tokenToDelete);
            send(req, res, 200, { ok: true });
        } else {
            send(req, res, 404, { ok: false, error: 'User not logged in' });
        }
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
            cpus: os.cpus().length,
            version: VERSION
        });
        return;
    }

    // COMPUTERS LIST
    if (req.method === 'GET' && pathname === '/api/computers') {
        send(req, res, 200, readJSON(COMPUTERS_FILE) || []);
        return;
    }

    // SUBMITTED EXAMS
    if (req.method === 'GET' && pathname === '/api/submitted-exams') {
        send(req, res, 200, getSubmittedExams());
        return;
    }

    // SUBMITTED EXAMS BY CLASS/SUBJECT
    if (req.method === 'GET' && pathname === '/api/submitted-exams/grouped') {
        const results = readJSON(RESULTS_FILE) || [];
        
        const grouped = {
            byClass: {},
            bySubject: {},
            byExam: {}
        };
        
        results.forEach(r => {
            const studentClass = r.studentClass || 'Unassigned';
            const subject = r.subject || 'General';
            const exam = r.exam || 'Unknown';
            
            if (!grouped.byClass[studentClass]) grouped.byClass[studentClass] = [];
            if (!grouped.bySubject[subject]) grouped.bySubject[subject] = [];
            if (!grouped.byExam[exam]) grouped.byExam[exam] = [];
            
            grouped.byClass[studentClass].push(r);
            grouped.bySubject[subject].push(r);
            grouped.byExam[exam].push(r);
        });
        
        send(req, res, 200, grouped);
        return;
    }

    // EXAMS LIST
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
                    class: data?.class ? data.class.trim() : '',
                    teacherId: data?.teacherId || '',
                    duration: data?.duration || 30,
                    questionCount: data?.questions?.length || 0,
                    active
                };
            });
            
            if (studentClass) {
                const normalizedStudentClass = studentClass.trim().toLowerCase();
                exams = exams.filter(e => {
                    if (!e.class) return true;
                    const normalizedExamClass = e.class.toLowerCase();
                    return normalizedExamClass === normalizedStudentClass;
                });
            }
            
            send(req, res, 200, exams);
        } catch (e) { 
            send(req, res, 200, []); 
        }
        return;
    }

    // SINGLE EXAM - WITH RANDOMIZATION
    if (req.method === 'GET' && pathname.startsWith('/api/exam/')) {
        const filename = decodeURIComponent(pathname.replace('/api/exam/', ''));
        const filePath = path.join(UPLOADS_DIR, filename);
        if (!fs.existsSync(filePath)) { send(req, res, 404, { error: 'Exam not found' }); return; }
        
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        if (examStatus[filename] === false) { send(req, res, 403, { error: 'This exam is currently unavailable' }); return; }
        
        const examData = readJSON(filePath);
        
        // Randomize questions for each student
        if (examData && examData.questions) {
            examData.questions = shuffleArray([...examData.questions]);
        }
        
        send(req, res, 200, examData); 
        return;
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

    // UPLOAD CSV EXAM - FLEXIBLE HANDLER
    if (req.method === 'POST' && pathname === '/api/upload-csv') {
        try {
            const files = await parseMultipart(req);
            const file = files['exam'];
            if (!file) { send(req, res, 400, { error: 'No file' }); return; }
            
            const content = file.content.toString('utf8').replace(/^\uFEFF/, ''); // Remove BOM if present
            const lines = content.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                send(req, res, 400, { error: 'CSV file must have header and at least one question' });
                return;
            }
            
            const header = parseCSVLine(lines[0]);
            const { valid, missingColumns, columnMapping } = validateCSVHeaders(header);
            
            if (!valid) {
                send(req, res, 400, { error: `Missing required columns: ${missingColumns.join(', ')}. Found: ${header.join(', ')}` });
                return;
            }
            
            // Map column indices
            const colIndices = {};
            header.forEach((col, index) => {
                const normalized = col.toLowerCase().trim().replace(/[^a-z0-9_]/g, '');
                if (normalized.includes('question') || normalized === 'q') colIndices.question = index;
                if (normalized.includes('option_1') || normalized.includes('option1') || normalized.includes('opt1') || normalized.includes('optiona') || normalized === 'a') colIndices.option_1 = index;
                if (normalized.includes('option_2') || normalized.includes('option2') || normalized.includes('opt2') || normalized.includes('optionb') || normalized === 'b') colIndices.option_2 = index;
                if (normalized.includes('option_3') || normalized.includes('option3') || normalized.includes('opt3') || normalized.includes('optionc') || normalized === 'c') colIndices.option_3 = index;
                if (normalized.includes('option_4') || normalized.includes('option4') || normalized.includes('opt4') || normalized.includes('optiond') || normalized === 'd') colIndices.option_4 = index;
                if (normalized.includes('answer') || normalized.includes('correct') || normalized.includes('ans')) colIndices.answer = index;
            });
            
            const questions = [];
            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                
                const question = {
                    question: values[colIndices.question] || '',
                    A: values[colIndices.option_1] || '',
                    B: values[colIndices.option_2] || '',
                    C: values[colIndices.option_3] || '',
                    D: values[colIndices.option_4] || ''
                };
                
                // Handle answer mapping
                const answerValue = values[colIndices.answer] || '';
                const answerMap = {
                    'option_1': 'A', 'option1': 'A', 'opt1': 'A', 'a': 'A', 'A': 'A',
                    'option_2': 'B', 'option2': 'B', 'opt2': 'B', 'b': 'B', 'B': 'B',
                    'option_3': 'C', 'option3': 'C', 'opt3': 'C', 'c': 'C', 'C': 'C',
                    'option_4': 'D', 'option4': 'D', 'opt4': 'D', 'd': 'D', 'D': 'D'
                };
                
                question.answer = answerMap[answerValue.toLowerCase()] || 'A';
                
                // Skip empty questions
                if (question.question.trim()) {
                    questions.push(question);
                }
            }
            
            if (questions.length === 0) {
                send(req, res, 400, { error: 'No valid questions found in CSV' });
                return;
            }
            
            const subject = url.searchParams.get('subject') || 'General';
            const examClass = url.searchParams.get('class') || '';
            const examName = url.searchParams.get('name') || `CSV Exam ${new Date().toLocaleDateString()}`;
            const duration = parseInt(url.searchParams.get('duration')) || 30;
            
            const examData = {
                exam: examName,
                subject: subject,
                class: examClass,
                duration: duration,
                questions: questions
            };
            
            const saveName = file.filename.replace(/\.csv$/i, '.json').replace(/[^a-zA-Z0-9._-]/g, '_');
            fs.writeFileSync(path.join(UPLOADS_DIR, saveName), JSON.stringify(examData, null, 2));
            
            const examStatus = readJSON(EXAM_STATUS_FILE) || {};
            examStatus[saveName] = true;
            writeJSON(EXAM_STATUS_FILE, examStatus);
            
            sysLog('UPLOAD_CSV', `CSV Exam: ${saveName} | Questions: ${questions.length} | Duration: ${duration} min`, 'teacher');
            auditLog('EXAM_UPLOAD_CSV', 'teacher', `Uploaded CSV exam: ${examName}`, { filename: saveName, questions: questions.length, subject, class: examClass, duration });
            
            send(req, res, 200, { ok: true, filename: saveName, questions: questions.length });
        } catch (e) { 
            send(req, res, 400, { error: 'Invalid CSV file: ' + e.message }); 
        }
        return;
    }

    // CHECK IF STUDENT HAS TAKEN EXAM
    if (req.method === 'GET' && pathname.startsWith('/api/has-taken-exam/')) {
        const parts = pathname.replace('/api/has-taken-exam/', '').split('/');
        const studentId = decodeURIComponent(parts[0]);
        const examFilename = decodeURIComponent(parts[1]);
        
        const results = readJSON(RESULTS_FILE) || [];
        const resets = readJSON(RESETS_FILE) || {};
        const resetEntry = resets[studentId];
        
        const hasTaken = results.some(r => 
            r.studentId === studentId && r.examFilename === examFilename
        );
        
        // Check if student was reset for this exam or all exams
        const wasReset = resetEntry === true || resetEntry === examFilename;
        
        send(req, res, 200, { hasTaken: hasTaken && !wasReset });
        return;
    }

    // GET ALL TAKEN EXAMS FOR A STUDENT
    if (req.method === 'GET' && pathname.startsWith('/api/student-taken-exams/')) {
        const studentId = decodeURIComponent(pathname.replace('/api/student-taken-exams/', ''));
        const results = readJSON(RESULTS_FILE) || [];
        const resets = readJSON(RESETS_FILE) || {};
        const resetEntry = resets[studentId];
        
        const takenExams = results
            .filter(r => r.studentId === studentId)
            .filter(r => {
                if (resetEntry === true) return false;
                if (resetEntry === r.examFilename) return false;
                return true;
            })
            .map(r => r.examFilename);
        
        send(req, res, 200, { takenExams, count: takenExams.length });
        return;
    }

    // GET AVAILABLE EXAMS COUNT
    if (req.method === 'GET' && pathname.startsWith('/api/available-exams-count/')) {
        const studentId = decodeURIComponent(pathname.replace('/api/available-exams-count/', ''));
        const studentClass = url.searchParams.get('class');
        
        const results = readJSON(RESULTS_FILE) || [];
        const resets = readJSON(RESETS_FILE) || {};
        const resetEntry = resets[studentId];
        
        const takenExams = results
            .filter(r => r.studentId === studentId)
            .filter(r => {
                if (resetEntry === true) return false;
                if (resetEntry === r.examFilename) return false;
                return true;
            })
            .map(r => r.examFilename);
        
        const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.json'));
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        
        let available = files.filter(f => {
            if (examStatus[f] === false) return false;
            if (takenExams.includes(f)) return false;
            
            const data = readJSON(path.join(UPLOADS_DIR, f));
            if (data?.class && studentClass && data.class.toLowerCase() !== studentClass.toLowerCase()) return false;
            
            return true;
        });
        
        send(req, res, 200, { available: available.length });
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
        
        saveSubmittedExam(entry);
        
        sysLog('SUBMIT', `Student: ${body.student} | Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`, body.studentId);
        auditLog('EXAM_SUBMIT', body.studentId || body.student, `Submitted "${body.exam}" — Score: ${body.score}/${body.total} (${body.percentage}%)`, { exam: body.exam, score: body.score, total: body.total, percentage: body.percentage, tabViolations: body.tabViolations, studentClass });
        logActivity(body.studentId, body.student, 'SUBMIT', `Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`);
        
        delete liveSessions[body.studentId || body.student];
        const resets = readJSON(RESETS_FILE) || {};
        delete resets[body.studentId || body.student];
        writeJSON(RESETS_FILE, resets);
        
        send(req, res, 200, { ok: true }); return;
    }

    // END EXAM
    if (req.method === 'POST' && pathname === '/api/end-exam') {
        const body = await parseBody(req);
        const studentId = body.studentId;
        
        delete liveSessions[studentId];
        
        const sessions = readJSON(SESSIONS_FILE) || {};
        let tokenToDelete = null;
        for (const [token, data] of Object.entries(sessions)) {
            if (data.id === studentId) {
                tokenToDelete = token;
                break;
            }
        }
        
        if (tokenToDelete) {
            deleteSession(tokenToDelete);
        }
        
        auditLog('EXAM_ENDED', body.teacherId || 'teacher', `Ended exam for student: ${studentId}`, { studentId });
        
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
        
        if (liveSessions[body.studentId || body.student]) {
            liveSessions[body.studentId || body.student].tabViolations = body.count;
        }
        
        send(req, res, 200, { ok: true }); return;
    }

    // RESET CHECK
    if (req.method === 'GET' && pathname.startsWith('/api/reset-check/')) {
        const studentId = decodeURIComponent(pathname.replace('/api/reset-check/', ''));
        const resets = readJSON(RESETS_FILE) || {};
        send(req, res, 200, { reset: !!resets[studentId], exam: resets[studentId] || null }); return;
    }

    // RESET STUDENT (Allow retake)
    if (req.method === 'POST' && pathname === '/api/reset-student') {
        const body = await parseBody(req);
        const resets = readJSON(RESETS_FILE) || {};
        if (body.clear) { 
            delete resets[body.studentId]; 
        } else { 
            resets[body.studentId] = body.exam || true; 
        }
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
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // GET ALL RESULTS
    if (req.method === 'GET' && pathname === '/api/results') {
        const results = readJSON(RESULTS_FILE) || [];
        
        // Map results to include only needed fields and ensure exam data is complete
        const formattedResults = results.map(r => {
            // Try to get exam details from uploaded file if available
            let examSubject = r.subject || '';
            let examClass = r.examClass || '';
            
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        if (examData) {
                            examSubject = examData.subject || examSubject;
                            examClass = examData.class || examClass;
                        }
                    }
                } catch (e) {}
            }
            
            return {
                id: r.id,
                student: r.student,
                studentId: r.studentId,
                exam: r.exam,
                examFilename: r.examFilename,
                subject: examSubject,
                examClass: examClass,
                studentClass: r.studentClass || '',
                score: r.score || 0,
                total: r.total || 0,
                percentage: r.percentage || 0,
                tabViolations: r.tabViolations || 0,
                submittedAt: r.submittedAt
            };
        });
        
        send(req, res, 200, formattedResults);
        return;
    }

    // GET RESULTS SUBJECTS (for filter dropdown)
    if (req.method === 'GET' && pathname === '/api/results/subjects') {
        const results = readJSON(RESULTS_FILE) || [];
        const subjects = [...new Set(results.map(r => {
            if (r.subject) return r.subject;
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        return examData?.subject || '';
                    }
                } catch (e) {}
            }
            return '';
        }).filter(Boolean))].sort();
        
        send(req, res, 200, subjects);
        return;
    }

    // GET RESULTS EXAMS (for filter dropdown)
    if (req.method === 'GET' && pathname === '/api/results/exams') {
        const results = readJSON(RESULTS_FILE) || [];
        const exams = [...new Set(results.map(r => r.exam).filter(Boolean))].sort();
        send(req, res, 200, exams);
        return;
    }

    // RESULTS CSV DETAILED
    if (req.method === 'GET' && pathname === '/api/results/csv') {
        const results = readJSON(RESULTS_FILE) || [];
        const formattedResults = results.map(r => {
            let examSubject = r.subject || '';
            let examClass = r.examClass || '';
            
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        if (examData) {
                            examSubject = examData.subject || examSubject;
                            examClass = examData.class || examClass;
                        }
                    }
                } catch (e) {}
            }
            
            return {
                student: r.student,
                studentId: r.studentId,
                studentClass: r.studentClass || '',
                exam: r.exam,
                subject: examSubject,
                examClass: examClass,
                score: r.score || 0,
                total: r.total || 0,
                percentage: r.percentage || 0,
                tabViolations: r.tabViolations || 0,
                submittedAt: r.submittedAt
            };
        });
        
        const rows = [
            'Student Name,Student ID,Student Class,Exam Name,Subject,Exam Class,Score,Total,Percentage,Tab Violations,Submitted At',
            ...formattedResults.map(r => [
                `"${(r.student || '').replace(/"/g, '""')}"`,
                `"${r.studentId || ''}"`,
                `"${r.studentClass || ''}"`,
                `"${(r.exam || '').replace(/"/g, '""')}"`,
                `"${r.subject || ''}"`,
                `"${r.examClass || ''}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv', 
            'Content-Disposition': 'attachment; filename="results_detailed.csv"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS EXCEL
    if (req.method === 'GET' && pathname === '/api/results/excel') {
        const results = readJSON(RESULTS_FILE) || [];
        const formattedResults = results.map(r => {
            let examSubject = r.subject || '';
            let examClass = r.examClass || '';
            
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        if (examData) {
                            examSubject = examData.subject || examSubject;
                            examClass = examData.class || examClass;
                        }
                    }
                } catch (e) {}
            }
            
            return {
                student: r.student,
                studentId: r.studentId,
                studentClass: r.studentClass || '',
                exam: r.exam,
                subject: examSubject,
                examClass: examClass,
                score: r.score || 0,
                total: r.total || 0,
                percentage: r.percentage || 0,
                tabViolations: r.tabViolations || 0,
                submittedAt: r.submittedAt
            };
        });
        
        const rows = [
            'Student Name,Student ID,Student Class,Exam Name,Subject,Exam Class,Score,Total,Percentage,Tab Violations,Submitted At',
            ...formattedResults.map(r => [
                `"${(r.student || '').replace(/"/g, '""')}"`,
                `"${r.studentId || ''}"`,
                `"${r.studentClass || ''}"`,
                `"${(r.exam || '').replace(/"/g, '""')}"`,
                `"${r.subject || ''}"`,
                `"${r.examClass || ''}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'application/vnd.ms-excel', 
            'Content-Disposition': 'attachment; filename="results.xls"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS BY CLASS CSV
    if (req.method === 'GET' && pathname === '/api/results/by-class') {
        const studentClass = url.searchParams.get('class');
        const results = readJSON(RESULTS_FILE) || [];
        
        const filtered = results.filter(r => r.studentClass === studentClass || r.examClass === studentClass);
        
        const formattedResults = filtered.map(r => {
            let examSubject = r.subject || '';
            let examClass = r.examClass || '';
            
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        if (examData) {
                            examSubject = examData.subject || examSubject;
                            examClass = examData.class || examClass;
                        }
                    }
                } catch (e) {}
            }
            
            return {
                student: r.student,
                studentId: r.studentId,
                studentClass: r.studentClass || '',
                exam: r.exam,
                subject: examSubject,
                examClass: examClass,
                score: r.score || 0,
                total: r.total || 0,
                percentage: r.percentage || 0,
                tabViolations: r.tabViolations || 0,
                submittedAt: r.submittedAt
            };
        });
        
        const rows = [
            'Student Name,Student ID,Student Class,Exam Name,Subject,Exam Class,Score,Total,Percentage,Tab Violations,Submitted At',
            ...formattedResults.map(r => [
                `"${(r.student || '').replace(/"/g, '""')}"`,
                `"${r.studentId || ''}"`,
                `"${r.studentClass || ''}"`,
                `"${(r.exam || '').replace(/"/g, '""')}"`,
                `"${r.subject || ''}"`,
                `"${r.examClass || ''}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv', 
            'Content-Disposition': `attachment; filename="results_${studentClass || 'all'}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS BY SUBJECT CSV
    if (req.method === 'GET' && pathname === '/api/results/by-subject') {
        const subject = url.searchParams.get('subject');
        const results = readJSON(RESULTS_FILE) || [];
        
        const filtered = results.filter(r => {
            let rSubject = r.subject;
            if (!rSubject && r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        rSubject = examData?.subject || '';
                    }
                } catch (e) {}
            }
            return rSubject === subject;
        });
        
        const formattedResults = filtered.map(r => {
            let examSubject = r.subject || '';
            let examClass = r.examClass || '';
            
            if (r.examFilename) {
                try {
                    const examPath = path.join(UPLOADS_DIR, r.examFilename);
                    if (fs.existsSync(examPath)) {
                        const examData = readJSON(examPath);
                        if (examData) {
                            examSubject = examData.subject || examSubject;
                            examClass = examData.class || examClass;
                        }
                    }
                } catch (e) {}
            }
            
            return {
                student: r.student,
                studentId: r.studentId,
                studentClass: r.studentClass || '',
                exam: r.exam,
                subject: examSubject,
                examClass: examClass,
                score: r.score || 0,
                total: r.total || 0,
                percentage: r.percentage || 0,
                tabViolations: r.tabViolations || 0,
                submittedAt: r.submittedAt
            };
        });
        
        const rows = [
            'Student Name,Student ID,Student Class,Exam Name,Subject,Exam Class,Score,Total,Percentage,Tab Violations,Submitted At',
            ...formattedResults.map(r => [
                `"${(r.student || '').replace(/"/g, '""')}"`,
                `"${r.studentId || ''}"`,
                `"${r.studentClass || ''}"`,
                `"${(r.exam || '').replace(/"/g, '""')}"`,
                `"${r.subject || ''}"`,
                `"${r.examClass || ''}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv', 
            'Content-Disposition': `attachment; filename="results_${subject || 'all'}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // SINGLE RESULT CSV
    if (req.method === 'GET' && pathname.startsWith('/api/results/csv/')) {
        const resultId = parseInt(pathname.replace('/api/results/csv/', ''));
        const results = readJSON(RESULTS_FILE) || [];
        const r = results.find(r => r.id === resultId);
        if (!r) { send(req, res, 404, { error: 'Result not found' }); return; }
        
        let examSubject = r.subject || '';
        let examClass = r.examClass || '';
        
        if (r.examFilename) {
            try {
                const examPath = path.join(UPLOADS_DIR, r.examFilename);
                if (fs.existsSync(examPath)) {
                    const examData = readJSON(examPath);
                    if (examData) {
                        examSubject = examData.subject || examSubject;
                        examClass = examData.class || examClass;
                    }
                }
            } catch (e) {}
        }
        
        const rows = [
            'Student Name,Student ID,Student Class,Exam Name,Subject,Exam Class,Score,Total,Percentage,Tab Violations,Submitted At',
            [
                `"${(r.student || '').replace(/"/g, '""')}"`,
                `"${r.studentId || ''}"`,
                `"${r.studentClass || ''}"`,
                `"${(r.exam || '').replace(/"/g, '""')}"`,
                `"${examSubject}"`,
                `"${examClass}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(',')
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv', 
            'Content-Disposition': `attachment; filename="result_${r.studentId || r.student}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS JSON DOWNLOAD
    if (req.method === 'GET' && pathname === '/api/results/json') {
        const results = readJSON(RESULTS_FILE) || [];
        res.writeHead(200, { 
            'Content-Type': 'application/json', 
            'Content-Disposition': 'attachment; filename="results.json"', 
            'Access-Control-Allow-Origin': '*'
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

    // UPDATE STUDENT (Teacher can edit student info)
    if (req.method === 'PUT' && pathname.startsWith('/api/users/student/')) {
        const studentId = decodeURIComponent(pathname.replace('/api/users/student/', ''));
        const body = await getBody(req);
        const users = readJSON(USERS_FILE) || { teachers: [], students: [], admins: [] };
        const idx = users.students.findIndex(s => s.id === studentId);
        if (idx === -1) { send(req, res, 404, { error: 'Student not found' }); return; }
        if (body.name) users.students[idx].name = body.name;
        if (body.class !== undefined) users.students[idx].class = body.class;
        if (body.password) users.students[idx].password = body.password;
        writeJSON(USERS_FILE, users);
        auditLog('teacher', 'UPDATE_STUDENT', `Updated student: ${studentId}`);
        send(req, res, 200, { ok: true }); return;
    }

    send(req, res, 404, { error: 'Unknown endpoint' });
});

// HTTPS SERVER SETUP (for LAN PWA support)
function findCertFiles() {
    const ip = getServerIP();
    const certDir = path.join(__dirname, 'cert');
    const rootDir = __dirname;
    
    const candidates = [
        [path.join(certDir, `${ip}.pem`), path.join(certDir, `${ip}-key.pem`)],
        [path.join(certDir, 'cert.pem'), path.join(certDir, 'key.pem')],
        [path.join(rootDir, 'cert.pem'), path.join(rootDir, 'key.pem')],
    ];
    
    // Also scan cert dir for mkcert-style files (IP+N.pem)
    if (fs.existsSync(certDir)) {
        try {
            fs.readdirSync(certDir)
                .filter(f => f.startsWith(ip) && f.endsWith('.pem') && !f.endsWith('-key.pem'))
                .forEach(f => {
                    const keyFile = f.replace('.pem', '-key.pem');
                    candidates.unshift([path.join(certDir, f), path.join(certDir, keyFile)]);
                });
        } catch (_) {}
    }
    
    for (const [certPath, keyPath] of candidates) {
        if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            return { cert: fs.readFileSync(certPath), key: fs.readFileSync(keyPath) };
        }
    }
    return null;
}

server.listen(PORT, '0.0.0.0', () => {
    const ip = getServerIP();
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║            PETER HARVARD INTERNATIONAL SCHOOLS                ║');
    console.log('║                 EXAM SYSTEM  v2.0.0                           ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 Local:    http://localhost:${PORT}                         ║`);
    console.log(`║  🌍 Network:  http://${ip}:${PORT}                             ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log(`║  👨‍🎓 Student : http://localhost:${PORT}/student.html          ║`);
    console.log(`║  👩‍🏫 Teacher : http://localhost:${PORT}/teacher.html          ║`);
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  ✨ NEW FEATURES:                                              ║');
    console.log('║  • Question randomization for each student                     ║');
    console.log('║  • Flexible CSV upload (accepts various column names)          ║');
    console.log('║  • Stay on same page after reload                              ║');
    console.log('║  • Dynamic subject filtering in results                        ║');
    console.log('║  • Allow retake for students                                   ║');
    console.log('║  • PDF export for results                                      ║');
    console.log('║  • Auto redirect after exam completion                         ║');
    console.log('║  • Fixed session persistence                                   ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  📁 CSV Columns Accepted:                                      ║');
    console.log('║  question, option_1/option1/opt1/A, option_2/option2/opt2/B   ║');
    console.log('║  option_3/option3/opt3/C, option_4/option4/opt4/D, answer     ║');
    console.log('╠══════════════════════════════════════════════════════════════╣');
    console.log('║  👨‍💻 Developed by: anointedthedeveloper                         ║');
    console.log('║  🏫 Peter Harvard International Schools                         ║');
    console.log('║  📅 2026 - All Rights Reserved                                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Start HTTPS server if cert files are found
    const certFiles = findCertFiles();
    if (certFiles) {
        const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
        try {
            https.createServer(certFiles, server._events.request).listen(HTTPS_PORT, '0.0.0.0', () => {
                console.log(`✅  HTTPS server running on https://${ip}:${HTTPS_PORT}`);
                console.log(`✅  PWA-ready HTTPS URLs:`);
                console.log(`    Student:  https://${ip}:${HTTPS_PORT}/student.html`);
                console.log(`    Teacher:  https://${ip}:${HTTPS_PORT}/teacher.html\n`);
            });
        } catch (e) {
            console.log(`⚠️  HTTPS server failed to start: ${e.message}`);
        }
    } else {
        console.log(`ℹ️  No SSL cert found. Place cert files in ./cert/ to enable HTTPS.`);
        console.log(`    Run: mkcert.exe ${ip} localhost 127.0.0.1`);
        console.log(`    Then move the generated .pem files to ./cert/\n`);
    }
});