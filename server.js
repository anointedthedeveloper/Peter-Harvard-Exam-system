const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const XLSX = require('xlsx');

const PORT = process.env.PORT || 5000;
const VERSION = '2.1.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATABASE_DIR = path.join(__dirname, 'database');
const RESULTS_DIR = path.join(DATABASE_DIR, 'exam_results');
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

// Initialize activeTokens from sessions file on startup
function initializeActiveTokens() {
    const sessions = readJSON(SESSIONS_FILE) || {};
    for (const [token, session] of Object.entries(sessions)) {
        activeTokens.set(session.id, token);
    }
}
initializeActiveTokens();

// Rate limiting for login attempts
const loginAttempts = new Map(); // IP -> { count, lastAttempt }

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
        class: normalizeClassName(s.class)
    }));
    
    fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsers, null, 2));
}

// Helper functions
const fileLocks = new Map(); // Simple file locking mechanism

// Normalize class names (SS1 = SSS1, SS2 = SSS2, SS3 = SSS3)
function normalizeClassName(className) {
    if (!className) return className;
    const normalized = className.toUpperCase().trim();
    // Remove spaces and convert SS1 to SSS1, SS2 to SSS2, SS3 to SSS3
    const noSpaces = normalized.replace(/\s+/g, '');
    if (noSpaces === 'SS1') return 'SSS1';
    if (noSpaces === 'SS2') return 'SSS2';
    if (noSpaces === 'SS3') return 'SSS3';
    return noSpaces;
}

function readJSON(file) {
    try { 
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        if (e.code === 'ENOENT') return null;
        console.error(`Error reading ${file}: ${e.message}`);
        return null;
    }
}

function writeJSON(file, data) {
    try {
        // Write to temporary file first, then rename for atomic operation
        const tempFile = file + '.tmp';
        fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
        fs.renameSync(tempFile, file);
    } catch (e) {
        console.error(`Error writing ${file}: ${e.message}`);
        // Clean up temp file if it exists
        const tempFile = file + '.tmp';
        if (fs.existsSync(tempFile)) {
            try { fs.unlinkSync(tempFile); } catch (_) {}
        }
        throw e;
    }
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
        req.on('end', () => { 
            try { 
                if (!body || body.trim() === '') {
                    resolve({});
                    return;
                }
                resolve(JSON.parse(body)); 
            } catch (e) { 
                console.error('Error parsing request body:', e.message);
                resolve({}); 
            } 
        });
        req.on('error', reject);
    });
}

function parseMultipart(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let totalSize = 0;
        const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
        
        req.on('data', c => {
            totalSize += c.length;
            if (totalSize > MAX_SIZE) {
                req.destroy();
                return reject(new Error('File too large (max 10MB)'));
            }
            chunks.push(c);
        });
        
        req.on('end', () => {
            try {
                const buf = Buffer.concat(chunks);
                const ct = req.headers['content-type'] || '';
                const bm = ct.match(/boundary=(.+)/);
                if (!bm) return reject(new Error('No boundary found in Content-Type'));
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
                        // Sanitize filename to prevent path traversal
                        const safeFilename = fm[1].replace(/[^a-zA-Z0-9._-]/g, '_');
                        const content = bodyParts.join('\r\n\r\n').replace(/\r\n$/, '');
                        files[nm[1]] = { filename: safeFilename, content: Buffer.from(content, 'binary') };
                    }
                }
                resolve(files);
            } catch (e) {
                console.error('Error parsing multipart data:', e.message);
                reject(e);
            }
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
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(PUBLIC_DIR) && !normalizedPath.startsWith(__dirname)) {
        send(null, res, 403, { error: 'Access denied' });
        return;
    }
    
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
        if (err) { 
            if (!res.headersSent) {
                send(null, res, 404, { error: 'Not found' }); 
            }
            return; 
        }
        
        if (res.headersSent) return;
        
        const headers = {
            'Content-Type': types[ext] || 'text/plain',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=3600'
        };
        
        res.writeHead(200, headers);
        res.end(data);
    });
}

// Session management with proper cleanup and improved persistence
function saveSession(token, data) {
    const sessions = readJSON(SESSIONS_FILE) || {};
    const userId = data.id;
    
    // Remove any existing session for this user
    if (activeTokens.has(userId)) {
        const oldToken = activeTokens.get(userId);
        delete sessions[oldToken];
        activeTokens.delete(userId);
    }
    
    // Save new session with extended expiry (7 days for persistence across reloads)
    sessions[token] = { 
        ...data, 
        lastAccessed: Date.now(),
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    activeTokens.set(userId, token);
    writeJSON(SESSIONS_FILE, sessions);
    return true;
}

function getSession(token) {
    const sessions = readJSON(SESSIONS_FILE) || {};
    const session = sessions[token];
    
    if (session) {
        // Check if session is expired
        if (Date.now() > session.expiresAt) {
            // Session expired, clean it up
            activeTokens.delete(session.id);
            delete sessions[token];
            writeJSON(SESSIONS_FILE, sessions);
            return null;
        }
        
        // Update last accessed (only write if more than 1 minute since last update to reduce I/O)
        if (Date.now() - session.lastAccessed > 60000) {
            session.lastAccessed = Date.now();
            sessions[token] = session;
            writeJSON(SESSIONS_FILE, sessions);
        }
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

// Helper functions for per-exam results storage
function getExamResultsFilename(examName, examClass, subject) {
    const date = new Date().toISOString().split('T')[0];
    const safeExamName = examName.replace(/[^a-zA-Z0-9]/g, '_');
    const safeClass = examClass.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSubject = subject.replace(/[^a-zA-Z0-9]/g, '_');
    return `${safeClass}_${date}_${safeSubject}_${safeExamName}.json`;
}

function readExamResults(filename) {
    const filePath = path.join(RESULTS_DIR, filename);
    if (!fs.existsSync(filePath)) return [];
    return readJSON(filePath) || [];
}

function writeExamResults(filename, results) {
    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }
    const filePath = path.join(RESULTS_DIR, filename);
    writeJSON(filePath, results);
}

function getAllExamResults() {
    if (!fs.existsSync(RESULTS_DIR)) return [];
    const allResults = [];
    const files = fs.readdirSync(RESULTS_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
        const results = readJSON(path.join(RESULTS_DIR, file)) || [];
        allResults.push(...results);
    }
    return allResults;
}

function cleanupSessions() {
    const sessions = readJSON(SESSIONS_FILE) || {};
    let changed = false;
    const now = Date.now();
    
    for (const [token, data] of Object.entries(sessions)) {
        // Remove expired sessions (7 days)
        if (data.expiresAt && now > data.expiresAt) {
            activeTokens.delete(data.id);
            delete sessions[token];
            changed = true;
        }
    }
    
    if (changed) writeJSON(SESSIONS_FILE, sessions);
}

setInterval(cleanupSessions, 3600000);
cleanupSessions(); // Run cleanup on startup

// Cleanup rate limiting map periodically
function cleanupRateLimits() {
    const now = Date.now();
    for (const [ip, attempts] of loginAttempts.entries()) {
        if (now - attempts.lastAttempt > 3600000) { // 1 hour
            loginAttempts.delete(ip);
        }
    }
}
setInterval(cleanupRateLimits, 3600000);

// Cleanup live sessions periodically
function cleanupLiveSessions() {
    const now = Date.now();
    for (const [studentId, session] of Object.entries(liveSessions)) {
        if (now - session.lastSeen > 90000) { // 90 seconds
            delete liveSessions[studentId];
        }
    }
}
setInterval(cleanupLiveSessions, 30000); // Every 30 seconds

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
    
    // Clean up old computer entries (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const cleanedComputers = computers.filter(c => c.lastSeen >= thirtyDaysAgo);
    
    writeJSON(COMPUTERS_FILE, cleanedComputers);
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
    // Set timeout for connections (5 minutes)
    req.setTimeout(300000, () => {
        if (!res.headersSent) {
            send(req, res, 408, { error: 'Request timeout' });
        }
        req.destroy();
    });

    // Set keep-alive
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=300');

    // Global error handler
    res.on('error', (err) => {
        console.error('Response error:', err);
        if (!res.headersSent) {
            try {
                res.end();
            } catch (e) {}
        }
    });
    
    // Request error handler
    req.on('error', (err) => {
        console.error('Request error:', err);
        if (!res.headersSent) {
            try {
                send(req, res, 500, { error: 'Internal server error' });
            } catch (e) {}
        }
    });
    
    if (req.method === 'OPTIONS') {
        if (!res.headersSent) {
            res.writeHead(204, { 
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,DELETE,PUT,PATCH',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Credentials': 'true'
            });
            res.end();
        }
        return;
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
        
        // Route specific pages
        if (pathname === '/' || pathname === '/student') {
            serveFile(res, path.join(PUBLIC_DIR, 'student.html'));
            return;
        }
        if (pathname === '/admin') {
            serveFile(res, path.join(PUBLIC_DIR, 'admin.html'));
            return;
        }
        if (pathname === '/teacher') {
            serveFile(res, path.join(PUBLIC_DIR, 'teacher.html'));
            return;
        }
        
        const filePath = path.join(PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) { serveFile(res, filePath); return; }
        
        // Serve 404 page for missing files
        const notFoundPath = path.join(PUBLIC_DIR, '404.html');
        if (fs.existsSync(notFoundPath)) {
            serveFile(res, notFoundPath);
        } else {
            send(req, res, 404, { error: 'Not found' });
        }
        return;
    }

    // AUTH - Login
    if (req.method === 'POST' && pathname === '/api/login') {
        const body = await parseBody(req);
        
        // Input validation
        if (!body || typeof body !== 'object') {
            send(req, res, 400, { ok: false, error: 'Invalid request body' });
            return;
        }
        if (!body.role || !['student', 'teacher', 'admin'].includes(body.role)) {
            send(req, res, 400, { ok: false, error: 'Invalid role' });
            return;
        }
        if (!body.id || typeof body.id !== 'string' || body.id.trim() === '') {
            send(req, res, 400, { ok: false, error: 'ID is required' });
            return;
        }
        if (body.role !== 'student' && (!body.password || typeof body.password !== 'string')) {
            send(req, res, 400, { ok: false, error: 'Password is required' });
            return;
        }
        
        // Rate limiting
        const clientIp = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const attempts = loginAttempts.get(clientIp) || { count: 0, lastAttempt: 0 };
        
        if (now - attempts.lastAttempt < 60000 && attempts.count >= 5) {
            send(req, res, 429, { ok: false, error: 'Too many login attempts. Please wait 1 minute.' });
            return;
        }
        
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
            // Check if user already has an active session (prevent concurrent logins)
            const sessions = readJSON(SESSIONS_FILE) || {};
            
            // First, clean up any stale sessions for this user from the file
            for (const [token, session] of Object.entries(sessions)) {
                if (session.id === user.id) {
                    // If this session is not in activeTokens, it's stale - remove it
                    if (!activeTokens.has(user.id) || activeTokens.get(user.id) !== token) {
                        delete sessions[token];
                        writeJSON(SESSIONS_FILE, sessions);
                    }
                }
            }
            
            // Now check if user has an active session
            if (activeTokens.has(user.id)) {
                const existingToken = activeTokens.get(user.id);
                
                // If the session exists and is valid, reject new login
                if (sessions[existingToken]) {
                    send(req, res, 409, { ok: false, error: 'User already logged in on another device' });
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
                class: normalizeClassName(user.class || '')
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
                class: normalizeClassName(user.class || ''),
                id: user.id
            });
            
            // Reset rate limit on successful login
            loginAttempts.delete(clientIp);
        } else {
            // Update rate limit on failed login
            loginAttempts.set(clientIp, { count: attempts.count + 1, lastAttempt: now });
            
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
            
            if (!fs.existsSync(UPLOADS_DIR)) {
                send(req, res, 200, []);
                return;
            }
            
            const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.json'));
            
            let exams = files.map(f => {
                try {
                    const data = readJSON(path.join(UPLOADS_DIR, f));
                    // Check exam status: adminDisabled takes precedence over teacherEnabled
                    const status = examStatus[f] || {};
                    // Handle both old format (true) and new format ({teacherEnabled, adminDisabled})
                    const adminDisabled = status.adminDisabled === true;
                    const teacherEnabled = status.teacherEnabled === true || status === true;
                    const active = !adminDisabled && teacherEnabled;
                    
                    return {
                        filename: f,
                        name: data?.exam || f,
                        subject: data?.subject || '',
                        class: normalizeClassName(data?.class || ''),
                        teacherId: data?.teacherId || '',
                        duration: data?.duration || 30,
                        questionCount: data?.questions?.length || 0,
                        active,
                        adminDisabled,
                        teacherEnabled
                    };
                } catch (e) {
                    console.error(`Error reading exam file ${f}:`, e.message);
                    return null;
                }
            }).filter(Boolean);
            
            if (studentClass) {
                const normalizedStudentClass = normalizeClassName(studentClass);
                exams = exams.filter(e => {
                    if (!e.class) return true;
                    const normalizedExamClass = normalizeClassName(e.class);
                    return normalizedExamClass === normalizedStudentClass;
                });
            }
            
            send(req, res, 200, exams);
        } catch (e) { 
            console.error('Error listing exams:', e.message);
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
        const status = examStatus[filename] || {};
        // Handle both old format (true) and new format ({teacherEnabled, adminDisabled})
        const adminDisabled = status.adminDisabled === true;
        const teacherEnabled = status.teacherEnabled === true || status === true;
        
        // Exam is unavailable if admin disabled it OR teacher hasn't enabled it
        if (adminDisabled || !teacherEnabled) {
            send(req, res, 403, { error: 'This exam is currently unavailable' });
            return;
        }
        
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
            if (!file) { send(req, res, 400, { error: 'No file uploaded' }); return; }
            
            const content = file.content.toString('utf8');
            const data = JSON.parse(content);
            
            // Validate exam structure
            if (!data || typeof data !== 'object') {
                send(req, res, 400, { error: 'Invalid exam data structure' });
                return;
            }
            if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
                send(req, res, 400, { error: 'Exam must have at least one question' });
                return;
            }
            
            const saveName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
            fs.writeFileSync(path.join(UPLOADS_DIR, saveName), content);
            const examStatus = readJSON(EXAM_STATUS_FILE) || {};
            examStatus[saveName] = { teacherEnabled: true, adminDisabled: false };
            writeJSON(EXAM_STATUS_FILE, examStatus);
            sysLog('UPLOAD', `Exam: ${saveName} | Subject: ${data.subject || 'N/A'} | Class: ${data.class || 'N/A'}`);
            auditLog('EXAM_UPLOAD', 'teacher', `Uploaded exam: ${data.exam || saveName}`, { filename: saveName, subject: data.subject, class: data.class, questions: data.questions?.length });
            send(req, res, 200, { ok: true, filename: saveName });
        } catch (e) { send(req, res, 400, { error: 'Invalid file: ' + e.message }); }
        return;
    }

    // UPLOAD CSV EXAM - NEW FORMAT WITH METADATA AND NATURAL QUESTIONS
    if (req.method === 'POST' && pathname === '/api/upload-csv') {
        try {
            console.log('CSV Upload: Starting...');
            const files = await parseMultipart(req);
            console.log('CSV Upload: Files parsed', Object.keys(files));
            const file = files['exam'];
            if (!file) { 
                console.log('CSV Upload: No file found');
                send(req, res, 400, { error: 'No file' }); 
                return; 
            }
            
            const content = file.content.toString('utf8').replace(/^\uFEFF/, ''); // Remove BOM if present
            const lines = content.split('\n').filter(line => line.trim());
            console.log('CSV Upload: Lines parsed', lines.length);
            
            if (lines.length < 2) {
                send(req, res, 400, { error: 'CSV file must have at least metadata and one question' });
                return;
            }
            
            // Parse metadata from first 4 lines (exam_name, subject, class, duration)
            const metadata = {};
            let questionStartIndex = 0;
            
            for (let i = 0; i < Math.min(4, lines.length); i++) {
                const line = lines[i];
                if (line.includes(',')) {
                    const parts = line.split(',').map(p => p.trim());
                    const key = parts[0].toLowerCase().replace(/[^a-z0-9_]/g, '');
                    const value = parts.slice(1).join(',').replace(/^"|"$/g, '');
                    
                    if (key === 'exam_name' || key === 'exam') metadata.exam = value;
                    else if (key === 'subject') metadata.subject = value;
                    else if (key === 'class') metadata.class = value;
                    else if (key === 'duration') metadata.duration = parseInt(value) || 30;
                }
                
                // Check if this is the question header line
                if (line.toLowerCase().includes('question') || line.toLowerCase().includes('number')) {
                    questionStartIndex = i + 1;
                    break;
                }
            }
            
            // If no metadata found, use URL params as fallback
            const examName = metadata.exam || url.searchParams.get('name') || `CSV Exam ${new Date().toLocaleDateString()}`;
            const subject = metadata.subject || url.searchParams.get('subject') || 'General';
            const examClass = metadata.class || url.searchParams.get('class') || '';
            const duration = metadata.duration || parseInt(url.searchParams.get('duration')) || 30;
            
            // Find question start if not found yet
            if (questionStartIndex === 0) {
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes('question') || lines[i].toLowerCase().includes('number')) {
                        questionStartIndex = i + 1;
                        break;
                    }
                }
                // Still not found? Assume questions start after metadata (line 4)
                if (questionStartIndex === 0) questionStartIndex = 4;
            }
            
            const questions = [];
            
            // Parse questions in natural format: "1,Which is good,a) smoking,b) drinking,c) exercise,d) overeating,c"
            for (let i = questionStartIndex; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('#')) continue; // Skip empty lines and comments
                
                const values = parseCSVLine(line);
                if (values.length < 2) continue;
                
                // Extract question text (second column usually)
                let questionText = values[1] || '';
                
                // Parse options from natural format like "a) smoking" or just "smoking"
                const options = { A: '', B: '', C: '', D: '' };
                const optionPattern = /^([a-dA-D])\)?\s*(.+)$/;
                
                for (let j = 2; j < Math.min(values.length, 6); j++) {
                    const optText = values[j] || '';
                    const match = optText.match(optionPattern);
                    
                    if (match) {
                        // Format: "a) smoking" -> extract letter and text
                        const letter = match[1].toUpperCase();
                        options[letter] = match[2].trim();
                    } else if (optText.trim()) {
                        // Format: just the text, assign by position
                        const letters = ['A', 'B', 'C', 'D'];
                        const pos = j - 2;
                        if (pos < 4) {
                            options[letters[pos]] = optText.trim();
                        }
                    }
                }
                
                // Extract answer (last column usually)
                const answerValue = values[values.length - 1] || '';
                let answer = 'A';
                
                // Check if answer is in format "a)" or just "a" or the option text
                const answerMatch = answerValue.match(/^([a-dA-D])\)?/);
                if (answerMatch) {
                    answer = answerMatch[1].toUpperCase();
                } else if (answerValue.toLowerCase() === 'a' || answerValue.toLowerCase() === 'option_1' || answerValue.toLowerCase() === 'option1') {
                    answer = 'A';
                } else if (answerValue.toLowerCase() === 'b' || answerValue.toLowerCase() === 'option_2' || answerValue.toLowerCase() === 'option2') {
                    answer = 'B';
                } else if (answerValue.toLowerCase() === 'c' || answerValue.toLowerCase() === 'option_3' || answerValue.toLowerCase() === 'option3') {
                    answer = 'C';
                } else if (answerValue.toLowerCase() === 'd' || answerValue.toLowerCase() === 'option_4' || answerValue.toLowerCase() === 'option4') {
                    answer = 'D';
                }
                
                // Skip empty questions
                if (questionText.trim()) {
                    questions.push({
                        question: questionText,
                        A: options.A,
                        B: options.B,
                        C: options.C,
                        D: options.D,
                        answer: answer
                    });
                }
            }
            
            if (questions.length === 0) {
                send(req, res, 400, { error: 'No valid questions found in CSV' });
                return;
            }
            
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
            examStatus[saveName] = { teacherEnabled: true, adminDisabled: false };
            writeJSON(EXAM_STATUS_FILE, examStatus);
            
            sysLog('UPLOAD_CSV', `CSV Exam: ${saveName} | Questions: ${questions.length} | Duration: ${duration} min`, 'teacher');
            auditLog('EXAM_UPLOAD_CSV', 'teacher', `Uploaded CSV exam: ${examName}`, { filename: saveName, questions: questions.length, subject, class: examClass, duration });
            
            send(req, res, 200, { ok: true, filename: saveName, questions: questions.length });
        } catch (e) { 
            console.error('CSV Upload Error:', e);
            send(req, res, 400, { error: 'Invalid CSV file: ' + e.message }); 
        }
        return;
    }

    // UPLOAD EXCEL EXAM (XLS/XLSX)
    if (req.method === 'POST' && pathname === '/api/upload-excel') {
        try {
            console.log('Excel Upload: Starting...');
            const files = await parseMultipart(req);
            console.log('Excel Upload: Files parsed', Object.keys(files));
            const file = files['exam'];
            if (!file) { 
                console.log('Excel Upload: No file found');
                send(req, res, 400, { error: 'No file' }); 
                return; 
            }
            
            console.log('Excel Upload: File found, size:', file.content.length);
            
            // Parse Excel file
            const workbook = XLSX.read(file.content, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            console.log('Excel Upload: Rows parsed', data.length);
            
            if (data.length < 2) {
                send(req, res, 400, { error: 'Excel file must have header and at least one question' });
                return;
            }
            
            // Find column indices from header row
            const header = data[0].map(h => (h || '').toString().toLowerCase().trim());
            const colIndices = {};
            
            header.forEach((col, index) => {
                // Exact match for question column (avoid 'question type', 'question level')
                if (col === 'question' || col === 'questions') colIndices.question = index;
                // Match option columns with various formats
                else if (col === 'option 1' || col === 'option1' || col === 'option_1') colIndices.option_1 = index;
                else if (col === 'option 2' || col === 'option2' || col === 'option_2') colIndices.option_2 = index;
                else if (col === 'option 3' || col === 'option3' || col === 'option_3') colIndices.option_3 = index;
                else if (col === 'option 4' || col === 'option4' || col === 'option_4') colIndices.option_4 = index;
                // Match answer column
                else if (col === 'answer' || col === 'correct_answer' || col === 'correct') colIndices.answer = index;
                // Match class/group columns
                else if (col === 'group' || col === 'class') colIndices.group = index;
                else if (col === 'level') colIndices.level = index;
            });
            
            // Extract class from first data row if available
            let examClass = '';
            if (colIndices.group !== undefined && data.length > 1) {
                examClass = data[1][colIndices.group] || '';
            }
            
            const questions = [];
            
            // Parse questions from data rows (skip header)
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length === 0) continue;
                
                const questionText = colIndices.question !== undefined ? (row[colIndices.question] || '') : '';
                if (!questionText.trim()) continue;
                
                const question = {
                    question: questionText,
                    A: colIndices.option_1 !== undefined ? (row[colIndices.option_1] || '') : '',
                    B: colIndices.option_2 !== undefined ? (row[colIndices.option_2] || '') : '',
                    C: colIndices.option_3 !== undefined ? (row[colIndices.option_3] || '') : '',
                    D: colIndices.option_4 !== undefined ? (row[colIndices.option_4] || '') : ''
                };
                
                // Parse answer
                const answerValue = colIndices.answer !== undefined ? (row[colIndices.answer] || '').toString().toLowerCase() : '';
                if (answerValue.includes('option 1') || answerValue.includes('option_1') || answerValue === 'a') question.answer = 'A';
                else if (answerValue.includes('option 2') || answerValue.includes('option_2') || answerValue === 'b') question.answer = 'B';
                else if (answerValue.includes('option 3') || answerValue.includes('option_3') || answerValue === 'c') question.answer = 'C';
                else if (answerValue.includes('option 4') || answerValue.includes('option_4') || answerValue === 'd') question.answer = 'D';
                else question.answer = 'A';
                
                questions.push(question);
            }
            
            if (questions.length === 0) {
                send(req, res, 400, { error: 'No valid questions found in Excel file' });
                return;
            }
            
            // Get metadata from URL params or use defaults
            const examName = url.searchParams.get('name') || '';
            const subject = url.searchParams.get('subject') || 'General';
            const urlClass = url.searchParams.get('class') || '';
            const duration = parseInt(url.searchParams.get('duration')) || 45;
            
            // Use class from Excel if not provided in URL
            const finalClass = urlClass || examClass;
            
            // Check if exam name is provided
            if (!examName) {
                send(req, res, 400, { 
                    error: 'Exam name is required. Please provide it in the upload form.',
                    needsMetadata: true,
                    extractedClass: finalClass,
                    questionCount: questions.length
                });
                return;
            }
            
            const examData = {
                exam: examName,
                subject: subject,
                class: finalClass,
                duration: duration,
                questions: questions
            };
            
            const saveName = file.filename.replace(/\.(xls|xlsx)$/i, '.json').replace(/[^a-zA-Z0-9._-]/g, '_');
            fs.writeFileSync(path.join(UPLOADS_DIR, saveName), JSON.stringify(examData, null, 2));
            
            const examStatus = readJSON(EXAM_STATUS_FILE) || {};
            examStatus[saveName] = { teacherEnabled: true, adminDisabled: false };
            writeJSON(EXAM_STATUS_FILE, examStatus);
            
            sysLog('UPLOAD_EXCEL', `Excel Exam: ${saveName} | Questions: ${questions.length} | Duration: ${duration} min`, 'teacher');
            auditLog('EXAM_UPLOAD_EXCEL', 'teacher', `Uploaded Excel exam: ${examName}`, { filename: saveName, questions: questions.length, subject, class: finalClass, duration });
            
            send(req, res, 200, { ok: true, filename: saveName, questions: questions.length });
        } catch (e) { 
            console.error('Excel Upload Error:', e);
            send(req, res, 400, { error: 'Invalid Excel file: ' + e.message }); 
        }
        return;
    }

    // CHECK IF STUDENT HAS TAKEN EXAM
    if (req.method === 'GET' && pathname.startsWith('/api/has-taken-exam/')) {
        const parts = pathname.replace('/api/has-taken-exam/', '').split('/');
        const studentId = decodeURIComponent(parts[0]);
        const examFilename = decodeURIComponent(parts[1]);
        
        const results = getAllExamResults();
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
        const results = getAllExamResults();
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
            const status = examStatus[f] || {};
            // Handle both old format (true) and new format ({teacherEnabled, adminDisabled})
            const adminDisabled = status.adminDisabled === true;
            const teacherEnabled = status.teacherEnabled === true || status === true;
            
            // Exam is unavailable if admin disabled it OR teacher hasn't enabled it
            if (adminDisabled || !teacherEnabled) return false;
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

    // SET EXAM ACTIVE/INACTIVE (Teacher toggle)
    if ((req.method === 'POST' || req.method === 'PATCH') && pathname.startsWith('/api/exam-status/')) {
        const filename = decodeURIComponent(pathname.replace('/api/exam-status/', ''));
        const body = await parseBody(req);
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        
        // Initialize status object if it doesn't exist
        if (!examStatus[filename]) {
            examStatus[filename] = {};
        }
        
        // Teacher can enable/disable their exams
        if (body.teacherEnabled !== undefined) {
            examStatus[filename].teacherEnabled = body.teacherEnabled === true || body.teacherEnabled === 'true';
        }
        
        // Legacy support for old 'active' field
        if (body.active !== undefined) {
            examStatus[filename].teacherEnabled = body.active === true || body.active === 'true';
        }
        
        writeJSON(EXAM_STATUS_FILE, examStatus);
        sysLog('EXAM_STATUS', `${filename}: teacherEnabled=${examStatus[filename].teacherEnabled}`, body.teacherId || 'teacher');
        auditLog('EXAM_STATUS_CHANGE', body.teacherId || 'teacher', `Exam "${filename}" teacher set to ${examStatus[filename].teacherEnabled ? 'ENABLED' : 'DISABLED'}`, { filename, teacherEnabled: examStatus[filename].teacherEnabled });
        send(req, res, 200, { ok: true, teacherEnabled: examStatus[filename].teacherEnabled }); return;
    }

    // ADMIN TOGGLE EXAM (Admin can disable/enable exams globally)
    if ((req.method === 'POST' || req.method === 'PATCH') && pathname.startsWith('/api/admin-exam-status/')) {
        const filename = decodeURIComponent(pathname.replace('/api/admin-exam-status/', ''));
        const body = await parseBody(req);
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        
        // Initialize status object if it doesn't exist
        if (!examStatus[filename]) {
            examStatus[filename] = {};
        }
        
        // Admin can disable/enable exams globally (overrides teacher)
        if (body.adminDisabled !== undefined) {
            // Ensure status is an object, not just true
            if (examStatus[filename] === true) {
                examStatus[filename] = { teacherEnabled: true, adminDisabled: false };
            }
            examStatus[filename].adminDisabled = body.adminDisabled === true || body.adminDisabled === 'true';
        }
        
        writeJSON(EXAM_STATUS_FILE, examStatus);
        sysLog('ADMIN_EXAM_STATUS', `${filename}: adminDisabled=${examStatus[filename].adminDisabled}`, body.adminId || 'admin');
        auditLog('ADMIN_EXAM_STATUS_CHANGE', body.adminId || 'admin', `Exam "${filename}" admin set to ${examStatus[filename].adminDisabled ? 'DISABLED' : 'ENABLED'}`, { filename, adminDisabled: examStatus[filename].adminDisabled });
        send(req, res, 200, { ok: true, adminDisabled: examStatus[filename].adminDisabled }); return;
    }

    // GET EXAM DETAILS WITH ANSWERS (for teachers)
    if (req.method === 'GET' && pathname.startsWith('/api/exam-details/')) {
        const filename = decodeURIComponent(pathname.replace('/api/exam-details/', ''));
        const filePath = path.join(UPLOADS_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            send(req, res, 404, { error: 'Exam not found' });
            return;
        }
        
        const examData = readJSON(filePath);
        send(req, res, 200, examData);
        return;
    }

    // EDIT EXAM (PUT)
    if (req.method === 'PUT' && pathname.startsWith('/api/exam/')) {
        const filename = decodeURIComponent(pathname.replace('/api/exam/', ''));
        const filePath = path.join(UPLOADS_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            send(req, res, 404, { error: 'Exam not found' });
            return;
        }
        
        const body = await parseBody(req);
        
        // Validate required fields
        if (!body || typeof body !== 'object') {
            send(req, res, 400, { error: 'Invalid request body' });
            return;
        }
        
        // Read existing exam
        const existingExam = readJSON(filePath);
        
        // Update exam metadata if provided
        if (body.exam !== undefined) existingExam.exam = body.exam;
        if (body.subject !== undefined) existingExam.subject = body.subject;
        if (body.class !== undefined) existingExam.class = body.class;
        if (body.duration !== undefined) existingExam.duration = parseInt(body.duration);
        
        // Update questions if provided
        if (body.questions !== undefined && Array.isArray(body.questions)) {
            existingExam.questions = body.questions;
        }
        
        // Save updated exam
        writeJSON(filePath, existingExam);
        
        sysLog('EDIT_EXAM', `Edited exam: ${filename}`, 'teacher');
        auditLog('EXAM_EDIT', 'teacher', `Edited exam: ${existingExam.exam || filename}`, { filename, questions: existingExam.questions?.length });
        
        send(req, res, 200, { ok: true, exam: existingExam });
        return;
    }

    // SUBMIT EXAM
    if (req.method === 'POST' && pathname === '/api/submit') {
        const body = await parseBody(req);
        
        // Input validation
        if (!body || typeof body !== 'object') {
            send(req, res, 400, { ok: false, error: 'Invalid request body' });
            return;
        }
        if (!body.studentId || typeof body.studentId !== 'string') {
            send(req, res, 400, { ok: false, error: 'Student ID is required' });
            return;
        }
        if (!body.student || typeof body.student !== 'string') {
            send(req, res, 400, { ok: false, error: 'Student name is required' });
            return;
        }
        if (!body.exam || typeof body.exam !== 'string') {
            send(req, res, 400, { ok: false, error: 'Exam name is required' });
            return;
        }
        if (typeof body.score !== 'number' || typeof body.total !== 'number') {
            send(req, res, 400, { ok: false, error: 'Score and total are required numbers' });
            return;
        }
        
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
        
        // Save to per-exam file
        const examResultsFile = getExamResultsFilename(body.exam, examClass, examSubject);
        const examResults = readExamResults(examResultsFile);
        examResults.push(entry);
        writeExamResults(examResultsFile, examResults);
        
        // Also save to legacy results.json for backward compatibility
        const legacyResults = readJSON(RESULTS_FILE) || [];
        legacyResults.push(entry);
        writeJSON(RESULTS_FILE, legacyResults);
        
        saveSubmittedExam(entry);
        
        // Calculate class highest mark
        const classResults = examResults.filter(r => r.studentClass === studentClass);
        const highestMark = classResults.length > 0 ? Math.max(...classResults.map(r => r.percentage || 0)) : 0;
        
        sysLog('SUBMIT', `Student: ${body.student} | Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`, body.studentId);
        auditLog('EXAM_SUBMIT', body.studentId || body.student, `Submitted "${body.exam}" — Score: ${body.score}/${body.total} (${body.percentage}%)`, { exam: body.exam, score: body.score, total: body.total, percentage: body.percentage, tabViolations: body.tabViolations, studentClass });
        logActivity(body.studentId, body.student, 'SUBMIT', `Exam: ${body.exam} | Score: ${body.score}/${body.total} (${body.percentage}%) | Class: ${studentClass}`);
        
        delete liveSessions[body.studentId || body.student];
        const resets = readJSON(RESETS_FILE) || {};
        delete resets[body.studentId || body.student];
        writeJSON(RESETS_FILE, resets);
        
        send(req, res, 200, { ok: true, highestMark }); return;
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
        if (body.role === 'student' && body.class) newUser.class = normalizeClassName(body.class);
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
        const students = (users?.students || []).map(s => ({ studentId: s.id, studentName: s.name, class: normalizeClassName(s.class || ''), passwordSet: !!s.password }));
        send(req, res, 200, students); return;
    }

    // STUDENT LIST CSV
    if (req.method === 'GET' && pathname === '/api/student-list/csv') {
        const users = readJSON(USERS_FILE);
        const students = users?.students || [];
        const rows = [
            'Student ID,Student Name,Class,Password Set',
            ...students.map(s => [
                `"${(s.id || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(s.name || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(s.class || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                s.password ? 'Yes' : 'No'
            ].join(','))
        ];
        res.writeHead(200, { 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': 'attachment; filename="student_list.csv"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // GET ALL RESULTS
    if (req.method === 'GET' && pathname === '/api/results') {
        const results = getAllExamResults();
        
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
        const results = getAllExamResults();
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
        const results = getAllExamResults();
        const exams = [...new Set(results.map(r => r.exam).filter(Boolean))].sort();
        send(req, res, 200, exams);
        return;
    }

    // RESULTS CSV DETAILED
    if (req.method === 'GET' && pathname === '/api/results/csv') {
        const results = getAllExamResults();
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
                `"${(r.student || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentId || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.exam || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.subject || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.examClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': 'attachment; filename="results_detailed.csv"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS EXCEL
    if (req.method === 'GET' && pathname === '/api/results/excel') {
        const results = getAllExamResults();
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
                `"${(r.student || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentId || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.exam || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.subject || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.examClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'application/vnd.ms-excel; charset=utf-8', 
            'Content-Disposition': 'attachment; filename="results.xls"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS PDF (Printable HTML)
    if (req.method === 'GET' && pathname === '/api/results/pdf') {
        const results = getAllExamResults();
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
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Exam Results - Peter Harvard International Schools</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { text-align: center; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        @media print {
            body { margin: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Peter Harvard International Schools</h1>
        <h2>Exam Results Report</h2>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    <table>
        <thead>
            <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Class</th>
                <th>Exam</th>
                <th>Subject</th>
                <th>Score</th>
                <th>Total</th>
                <th>Percentage</th>
                <th>Tab Violations</th>
                <th>Submitted At</th>
            </tr>
        </thead>
        <tbody>
            ${formattedResults.map(r => `
                <tr>
                    <td>${r.student}</td>
                    <td>${r.studentId}</td>
                    <td>${r.studentClass}</td>
                    <td>${r.exam}</td>
                    <td>${r.subject}</td>
                    <td>${r.score}</td>
                    <td>${r.total}</td>
                    <td>${r.percentage}%</td>
                    <td>${r.tabViolations}</td>
                    <td>${r.submittedAt}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
    <div class="footer">
        <p>Total Results: ${formattedResults.length}</p>
        <p>Peter Harvard International Schools - Exam System v${VERSION}</p>
    </div>
</body>
</html>`;
        
        res.writeHead(200, { 
            'Content-Type': 'text/html; charset=utf-8', 
            'Content-Disposition': 'inline; filename="results.html"', 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(html); return;
    }

    // RESULTS BY CLASS CSV
    if (req.method === 'GET' && pathname === '/api/results/by-class') {
        const studentClass = url.searchParams.get('class');
        const results = getAllExamResults();
        
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
                `"${(r.student || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentId || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.exam || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.subject || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.examClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': `attachment; filename="results_${studentClass || 'all'}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS BY SUBJECT CSV
    if (req.method === 'GET' && pathname === '/api/results/by-subject') {
        const subject = url.searchParams.get('subject');
        const results = getAllExamResults();
        
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
                `"${(r.student || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentId || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.exam || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.subject || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.examClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(','))
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': `attachment; filename="results_${subject || 'all'}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // SINGLE RESULT CSV
    if (req.method === 'GET' && pathname.startsWith('/api/results/csv/')) {
        const resultId = parseInt(pathname.replace('/api/results/csv/', ''));
        const results = getAllExamResults();
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
                `"${(r.student || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentId || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.studentClass || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${(r.exam || '').replace(/"/g, '""').replace(/[^\w\s-]/g, '')}"`,
                `"${examSubject.replace(/[^\w\s-]/g, '')}"`,
                `"${examClass.replace(/[^\w\s-]/g, '')}"`,
                r.score,
                r.total || '',
                r.percentage,
                r.tabViolations || 0,
                `"${r.submittedAt || ''}"`
            ].join(',')
        ];
        
        res.writeHead(200, { 
            'Content-Type': 'text/csv; charset=utf-8', 
            'Content-Disposition': `attachment; filename="result_${(r.studentId || r.student).replace(/[^\w\s-]/g, '')}.csv"`, 
            'Access-Control-Allow-Origin': '*'
        });
        res.end(rows.join('\n')); return;
    }

    // RESULTS JSON DOWNLOAD
    if (req.method === 'GET' && pathname === '/api/results/json') {
        const results = getAllExamResults();
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

    // CLEAR ALL RESULTS - DISABLED to ensure results don't clear
    // Results are now stored in per-exam files and should not be cleared
    // if (req.method === 'DELETE' && pathname === '/api/results') {
    //     const count = (readJSON(RESULTS_FILE) || []).length;
    //     writeJSON(RESULTS_FILE, []);
    //     sysLog('CLEAR_RESULTS', `All ${count} results cleared`);
    //     auditLog('RESULTS_CLEAR_ALL', 'admin', `Cleared all ${count} results`, { count });
    //     send(req, res, 200, { ok: true }); return;
    // }

    // LEADERBOARD - Get exam leaderboard
    if (req.method === 'GET' && pathname === '/api/leaderboard') {
        const examName = url.searchParams.get('exam');
        const examClass = url.searchParams.get('class');
        const subject = url.searchParams.get('subject');
        
        let results = getAllExamResults();
        
        if (examName) {
            results = results.filter(r => r.exam === examName);
        }
        if (examClass) {
            results = results.filter(r => r.studentClass === examClass || r.examClass === examClass);
        }
        if (subject) {
            results = results.filter(r => r.subject === subject);
        }
        
        // Sort by percentage descending
        results.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        
        // Add rank
        results = results.map((r, index) => ({
            ...r,
            rank: index + 1
        }));
        
        send(req, res, 200, results);
        return;
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
        const body = await parseBody(req);
        const users = readJSON(USERS_FILE) || { teachers: [], students: [], admins: [] };
        const idx = users.students.findIndex(s => s.id === studentId);
        if (idx === -1) { send(req, res, 404, { error: 'Student not found' }); return; }
        if (body.name) users.students[idx].name = body.name;
        if (body.class !== undefined) users.students[idx].class = body.class;
        if (body.password) users.students[idx].password = body.password;
        writeJSON(USERS_FILE, users);
        auditLog('UPDATE_STUDENT', 'teacher', `Updated student: ${studentId}`);
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

// Configure server for high concurrency
server.maxConnections = 150;
server.maxHeadersCount = 1000;

server.listen(PORT, '0.0.0.0', () => {
    const ip = getServerIP();
console.log(`
 █████╗ ███╗   ██╗ ██████╗ ██████╗ ██╗   ██╗████████╗███████╗
██╔══██╗████╗  ██║██╔═══██╗██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝
███████║██╔██╗ ██║██║   ██║██████╔╝ ╚████╔╝    ██║   █████╗
██╔══██║██║╚██╗██║██║   ██║██╔══██╗  ╚██╔╝     ██║   ██╔══╝
██║  ██║██║ ╚████║╚██████╔╝██████╔╝   ██║      ██║   ███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝    ╚═╝      ╚═╝   ╚══════╝
`);
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log('  PETER HARVARD INTERNATIONAL SCHOOLS - EXAM SYSTEM v2.1.0');
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log(`  🌐 Local:    http://localhost:${PORT}`);
    console.log(`  🌍 Network:  http://${ip}:${PORT}`);
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log(`  👨‍🎓 Student : http://localhost:${PORT}/student.html`);
    console.log(`  👩‍🏫 Teacher : http://localhost:${PORT}/teacher.html`);
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log('  ✨ FEATURES:');
    console.log('  ✓ Question randomization for each student');
    console.log('  ✓ Flexible CSV upload (various column names)');
    console.log('  ✓ Stay on same page after reload');
    console.log('  ✓ Dynamic subject filtering in results');
    console.log('  ✓ Allow retake for students');
    console.log('  ✓ PDF export for results');
    console.log('  ✓ Auto redirect after exam completion');
    console.log('  ✓ Fixed session persistence (7-day cache)');
    console.log('  ✓ Optimized for 100+ concurrent connections');
    console.log('  ✓ Improved exam visibility logic');
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log('  📁 CSV Columns: question, option_1/2/3/4, answer');
    console.log('  ════════════════════════════════════════════════════════════════');
    console.log('  ⚡ Powered by AnoByte');
    console.log('  🏫 Peter Harvard International Schools');
    console.log('  📅 2026 - All Rights Reserved');
    console.log('  ════════════════════════════════════════════════════════════════\n');
    console.log('✓ Server startup completed successfully\n');

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

// Graceful shutdown handler
function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(() => {
        console.log('HTTP server closed.');
        
        // Final cleanup
        cleanupSessions();
        cleanupRateLimits();
        cleanupLiveSessions();
        
        console.log('Cleanup complete. Exiting.');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});