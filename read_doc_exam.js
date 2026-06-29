const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

// Answer key can be provided as command line argument or in a file
const ANSWER_KEY_FILE = path.join(__dirname, 'answer_key.txt');

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATABASE_DIR = path.join(__dirname, 'database');
const EXAM_STATUS_FILE = path.join(DATABASE_DIR, 'exam_status.json');

// Ensure directories exist
[UPLOADS_DIR, DATABASE_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

function readJSON(file) {
    try {
        const data = fs.readFileSync(file, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function parseDocFile(filePath) {
    return new Promise((resolve, reject) => {
        mammoth.extractRawText({ path: filePath })
            .then(result => resolve(result.value))
            .catch(err => reject(err));
    });
}

function parseAnswerKey(text) {
    const answerKey = {};
    // Look for answer key patterns like "1.D 2.C 3.C" or "1.D, 2.C, 3.C"
    const answerPattern = /(\d+)\.?\s*([A-D])/g;
    let match;
    while ((match = answerPattern.exec(text)) !== null) {
        const questionNum = parseInt(match[1]);
        const answer = match[2].toUpperCase();
        answerKey[questionNum] = answer;
    }
    return answerKey;
}

function loadAnswerKey() {
    if (fs.existsSync(ANSWER_KEY_FILE)) {
        const text = fs.readFileSync(ANSWER_KEY_FILE, 'utf8');
        return parseAnswerKey(text);
    }
    return {};
}

function parseExamFromText(text, fileName, answerKey = {}) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    // Extract metadata
    let examName = fileName.replace(/\.(doc|docx)$/i, '');
    let subject = 'General';
    let examClass = 'SS 1';
    let duration = 60;
    
    // Try to find metadata from text
    for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes('subject') || line.includes('course')) {
            const parts = lines[i].split(/[:\-]/);
            if (parts.length > 1) subject = parts[1].trim();
        }
        if (line.includes('class') || line.includes('grade')) {
            const parts = lines[i].split(/[:\-]/);
            if (parts.length > 1) examClass = parts[1].trim();
        }
        if (line.includes('duration') || line.includes('time')) {
            const parts = lines[i].split(/[:\-]/);
            if (parts.length > 1) {
                const timeStr = parts[1].trim();
                const match = timeStr.match(/(\d+)/);
                if (match) duration = parseInt(match[1]);
            }
        }
    }
    
    const questions = [];
    let currentQuestion = null;
    let questionNumber = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Detect table (multiple spaces between values, looks like tabular data)
        if (line.split(/\s{3,}/).length > 2) {
            const tableData = line.split(/\s{3,}/).map(cell => cell.trim()).filter(cell => cell);
            if (tableData.length > 1) {
                if (currentQuestion) {
                    if (!currentQuestion.table) {
                        currentQuestion.table = {
                            headers: tableData,
                            rows: []
                        };
                    } else {
                        currentQuestion.table.rows.push(tableData);
                    }
                }
                continue;
            }
        }
        
        // Detect question start (e.g., "1.", "1)", "Question 1")
        const questionMatch = line.match(/^(\d+)[\.\)]\s*(.*)/);
        if (questionMatch) {
            // Save previous question if exists
            if (currentQuestion && currentQuestion.question) {
                questions.push(currentQuestion);
            }
            
            questionNumber = parseInt(questionMatch[1]);
            currentQuestion = {
                question: questionMatch[2].trim(),
                A: '',
                B: '',
                C: '',
                D: '',
                answer: answerKey[questionNumber] || 'A',
                table: null
            };
            
            // Check if next line contains options
            if (i + 1 < lines.length && lines[i + 1].match(/[A-D]\./)) {
                const nextLine = lines[i + 1];
                // Split by option letters followed by dot
                const matches = nextLine.matchAll(/([A-D])\.\s*([^A-D]+)/g);
                for (const match of matches) {
                    const letter = match[1];
                    const text = match[2].trim();
                    currentQuestion[letter] = text;
                }
                i++; // Skip the next line since we processed it
            }
        }
        // Detect question with inline options (no number at start)
        else if (!currentQuestion && line.match(/[A-D]\./) && line.split(/[A-D]\./).length >= 3) {
            const parts = line.split(/([A-D]\.)/g).filter(p => p.trim());
            let questionText = parts[0].trim();
            currentQuestion = {
                question: questionText,
                A: '',
                B: '',
                C: '',
                D: '',
                answer: 'A',
                table: null
            };
            
            for (let j = 1; j < parts.length; j++) {
                const part = parts[j];
                const match = part.match(/^([A-D])\.\s*(.*)/);
                if (match) {
                    currentQuestion[match[1]] = match[2].trim();
                }
            }
        }
        // Detect options on same line (A. ... B. ... C. ... D. ...)
        else if (currentQuestion && line.match(/[A-D]\./)) {
            const matches = line.matchAll(/([A-D])\.\s*([^A-D]+)/g);
            for (const match of matches) {
                const letter = match[1];
                const text = match[2].trim();
                currentQuestion[letter] = text;
            }
        }
        // Detect options on separate lines (A., B., C., D. or a), b), c), d))
        else if (currentQuestion) {
            const optionMatch = line.match(/^([a-dA-D])[\.\)]\s*(.*)/);
            if (optionMatch) {
                const optionLetter = optionMatch[1].toUpperCase();
                currentQuestion[optionLetter] = optionMatch[2].trim();
            }
            // Detect table (look for tab-separated or pipe-separated data)
            else if (line.includes('\t') || line.includes('|')) {
                const tableData = line.split(/[\t|]/).map(cell => cell.trim()).filter(cell => cell);
                if (tableData.length > 1) {
                    if (!currentQuestion.table) {
                        currentQuestion.table = {
                            headers: tableData,
                            rows: []
                        };
                    } else {
                        currentQuestion.table.rows.push(tableData);
                    }
                }
            }
            // Detect answer (e.g., "Answer: B" or just "B")
            else if (line.toLowerCase().startsWith('answer') || line.match(/^[a-dA-D]$/)) {
                const answerMatch = line.match(/([a-dA-D])/i);
                if (answerMatch) {
                    currentQuestion.answer = answerMatch[1].toUpperCase();
                }
            }
            // Otherwise, append to current question text
            else if (line.length > 0 && !line.match(/^[a-dA-D][\.\)]/)) {
                currentQuestion.question += ' ' + line;
            }
        }
    }
    
    // Save last question
    if (currentQuestion && currentQuestion.question) {
        questions.push(currentQuestion);
    }
    
    return { questions, examName, subject, examClass, duration };
}

async function importDocFile(filePath, fileName, answerKey = {}) {
    console.log(`\nProcessing: ${fileName}`);
    
    try {
        const text = await parseDocFile(filePath);
        console.log(`  ✓ Document read successfully (${text.length} characters)`);
        
        const { questions, examName, subject, examClass, duration } = parseExamFromText(text, fileName, answerKey);
        
        if (questions.length === 0) {
            console.log(`  ⚠ No valid questions found, skipping`);
            return false;
        }
        
        const examData = {
            exam: examName,
            subject: subject,
            class: examClass,
            duration: duration,
            questions: questions
        };
        
        const saveName = fileName.replace(/\.(doc|docx)$/i, '.json').replace(/[^a-zA-Z0-9._-]/g, '_');
        const savePath = path.join(UPLOADS_DIR, saveName);
        
        fs.writeFileSync(savePath, JSON.stringify(examData, null, 2));
        
        // Update exam status
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        examStatus[saveName] = { teacherEnabled: true, adminDisabled: false };
        writeJSON(EXAM_STATUS_FILE, examStatus);
        
        console.log(`  ✓ Imported successfully`);
        console.log(`    - Exam: ${examName}`);
        console.log(`    - Subject: ${subject}`);
        console.log(`    - Class: ${examClass}`);
        console.log(`    - Questions: ${questions.length}`);
        console.log(`    - Saved as: ${saveName}`);
        
        return true;
    } catch (e) {
        console.log(`  ✗ Error: ${e.message}`);
        return false;
    }
}

// Main import function
async function batchImportDocs() {
    console.log('=== Batch Doc Exam Import ===');
    console.log(`Source: C:\\Users\\Admin\\Downloads`);
    console.log(`Destination: ${UPLOADS_DIR}\n`);
    
    const downloadsDir = 'C:\\Users\\Admin\\Downloads';
    
    if (!fs.existsSync(downloadsDir)) {
        console.log('Downloads folder not found!');
        return;
    }
    
    // Load answer key if available
    const answerKey = loadAnswerKey();
    if (Object.keys(answerKey).length > 0) {
        console.log(`Loaded answer key with ${Object.keys(answerKey).length} answers\n`);
    }
    
    const files = fs.readdirSync(downloadsDir);
    const docFiles = files.filter(f => f.endsWith('.doc') || f.endsWith('.docx'));
    
    if (docFiles.length === 0) {
        console.log('No .doc/.docx files found in Downloads folder');
        return;
    }
    
    console.log(`Found ${docFiles.length} document file(s)\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const fileName of docFiles) {
        const filePath = path.join(downloadsDir, fileName);
        const success = await importDocFile(filePath, fileName, answerKey);
        if (success) successCount++;
        else failCount++;
    }
    
    console.log(`\n=== Import Complete ===`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

// Run the import
batchImportDocs().catch(console.error);
