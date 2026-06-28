const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXAM_DIR = path.join(__dirname, 'EXAM');
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

function parseExcelFile(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    if (data.length < 2) {
        throw new Error('Excel file must have header and at least one question');
    }
    
    // Find column indices from header row
    const header = data[0].map(h => (h || '').toString().toLowerCase().trim());
    const colIndices = {};
    
    header.forEach((col, index) => {
        // Exact match for question column (avoid 'question type', 'question level')
        if (col === 'question' || col === 'questions') colIndices.question = index;
        // Match option columns with various formats (only if not already set)
        else if ((col === 'option 1' || col === 'option1' || col === 'option_1') && colIndices.option_1 === undefined) colIndices.option_1 = index;
        else if ((col === 'option 2' || col === 'option2' || col === 'option_2') && colIndices.option_2 === undefined) colIndices.option_2 = index;
        else if ((col === 'option 3' || col === 'option3' || col === 'option_3') && colIndices.option_3 === undefined) colIndices.option_3 = index;
        else if ((col === 'option 4' || col === 'option4' || col === 'option_4') && colIndices.option_4 === undefined) colIndices.option_4 = index;
        // Match answer column
        else if (col === 'answer' || col === 'correct_answer' || col === 'correct') colIndices.answer = index;
        // Match class/group columns
        else if (col === 'group' || col === 'class') colIndices.group = index;
        else if (col === 'level') colIndices.level = index;
    });
    
    // Fallback: if option columns are missing, try to find them by position after 'mark' column
    const markIndex = header.findIndex(h => h === 'mark');
    if (markIndex !== -1) {
        if (colIndices.option_1 === undefined) colIndices.option_1 = markIndex + 1;
        if (colIndices.option_2 === undefined) colIndices.option_2 = markIndex + 2;
        if (colIndices.option_3 === undefined) colIndices.option_3 = markIndex + 3;
        if (colIndices.option_4 === undefined) colIndices.option_4 = markIndex + 4;
    }
    
    
    // Extract class from first data row - try multiple column names
    let examClass = '';
    if (colIndices.group !== undefined && data.length > 1) {
        examClass = (data[1][colIndices.group] || '').toString().trim();
    }
    // If no class found, try to find it in columns that look like class info (e.g., 'sss1', 'ss1', etc.)
    if (!examClass && data.length > 1) {
        const classColIndex = header.findIndex(h => h === 'sss1' || h === 'ss1' || h === 'sss2' || h === 'ss2' || h === 'sss3' || h === 'ss3');
        if (classColIndex !== -1) {
            examClass = (data[1][classColIndex] || '').toString().trim();
        }
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
        const answerValue = colIndices.answer !== undefined ? (row[colIndices.answer] || '').toString().trim() : '';
        let answer = 'A';
        
        if (answerValue) {
            // Try to match numeric answers (1, 2, 3, 4)
            const numMatch = answerValue.match(/^([1-4])$/);
            if (numMatch) {
                const num = parseInt(numMatch[1]);
                answer = ['A', 'B', 'C', 'D'][num - 1];
            }
            // Try to match letter patterns
            else {
                const letterMatch = answerValue.match(/^([a-dA-D])\)?/);
                if (letterMatch) {
                    answer = letterMatch[1].toUpperCase();
                }
                // Try to match option text patterns
                else if (answerValue.toLowerCase().includes('option 1') || answerValue.toLowerCase().includes('option_1') || answerValue.toLowerCase() === 'a') {
                    answer = 'A';
                }
                else if (answerValue.toLowerCase().includes('option 2') || answerValue.toLowerCase().includes('option_2') || answerValue.toLowerCase() === 'b') {
                    answer = 'B';
                }
                else if (answerValue.toLowerCase().includes('option 3') || answerValue.toLowerCase().includes('option_3') || answerValue.toLowerCase() === 'c') {
                    answer = 'C';
                }
                else if (answerValue.toLowerCase().includes('option 4') || answerValue.toLowerCase().includes('option_4') || answerValue.toLowerCase() === 'd') {
                    answer = 'D';
                }
                // Try to match against option text values
                else {
                    const opt1 = (row[colIndices.option_1] || '').toString().trim().toLowerCase();
                    const opt2 = (row[colIndices.option_2] || '').toString().trim().toLowerCase();
                    const opt3 = (row[colIndices.option_3] || '').toString().trim().toLowerCase();
                    const opt4 = (row[colIndices.option_4] || '').toString().trim().toLowerCase();
                    
                    if (answerValue.toLowerCase() === opt1) answer = 'A';
                    else if (answerValue.toLowerCase() === opt2) answer = 'B';
                    else if (answerValue.toLowerCase() === opt3) answer = 'C';
                    else if (answerValue.toLowerCase() === opt4) answer = 'D';
                }
            }
        }
        
        question.answer = answer;
        
        questions.push(question);
    }
    
    return { questions, examClass };
}

function extractClassFromFilename(fileName) {
    // Convert SSS1, SSS2, SSS3 to SS1, SS2, SS3
    const upperName = fileName.toUpperCase();
    
    if (upperName.includes('SSS1')) return 'SS 1';
    if (upperName.includes('SSS2')) return 'SS 2';
    if (upperName.includes('SSS3')) return 'SS 3';
    if (upperName.includes('SS1')) return 'SS 1';
    if (upperName.includes('SS2')) return 'SS 2';
    if (upperName.includes('SS3')) return 'SS 3';
    
    return 'SS 1'; // Default
}

function importExamFile(filePath, fileName) {
    console.log(`\nProcessing: ${fileName}`);
    
    try {
        const { questions, examClass } = parseExcelFile(filePath);
        
        if (questions.length === 0) {
            console.log(`  ⚠ No valid questions found, skipping`);
            return false;
        }
        
        // Extract exam name from filename (remove extensions and "Copy" suffix)
        let examName = fileName
            .replace(/\.(xls|xlsx)$/i, '')
            .replace(/ - Copy$/i, '')
            .replace(/_Copy$/i, '')
            .trim();
        
        // Extract subject from exam name (first word before space)
        const subject = examName.split(' ')[0] || 'General';
        
        // Extract class from filename (priority over Excel class column)
        const filenameClass = extractClassFromFilename(fileName);
        const finalClass = examClass || filenameClass;
        
        // Default duration
        const duration = 60;
        
        const examData = {
            exam: examName,
            subject: subject,
            class: finalClass,
            duration: duration,
            questions: questions
        };
        
        const saveName = fileName.replace(/\.(xls|xlsx)$/i, '.json').replace(/[^a-zA-Z0-9._-]/g, '_');
        const savePath = path.join(UPLOADS_DIR, saveName);
        
        fs.writeFileSync(savePath, JSON.stringify(examData, null, 2));
        
        // Update exam status
        const examStatus = readJSON(EXAM_STATUS_FILE) || {};
        examStatus[saveName] = { teacherEnabled: true, adminDisabled: false };
        writeJSON(EXAM_STATUS_FILE, examStatus);
        
        console.log(`  ✓ Imported successfully`);
        console.log(`    - Exam: ${examName}`);
        console.log(`    - Subject: ${subject}`);
        console.log(`    - Class: ${finalClass}`);
        console.log(`    - Questions: ${questions.length}`);
        console.log(`    - Saved as: ${saveName}`);
        
        return true;
    } catch (e) {
        console.log(`  ✗ Error: ${e.message}`);
        return false;
    }
}

// Main import function
function batchImport() {
    console.log('=== Batch Exam Import ===');
    console.log(`Source: ${EXAM_DIR}`);
    console.log(`Destination: ${UPLOADS_DIR}\n`);
    
    if (!fs.existsSync(EXAM_DIR)) {
        console.log('EXAM folder not found!');
        return;
    }
    
    const files = fs.readdirSync(EXAM_DIR);
    const excelFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'));
    
    if (excelFiles.length === 0) {
        console.log('No Excel files found in EXAM folder');
        return;
    }
    
    console.log(`Found ${excelFiles.length} Excel file(s)\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    excelFiles.forEach(fileName => {
        const filePath = path.join(EXAM_DIR, fileName);
        const success = importExamFile(filePath, fileName);
        if (success) successCount++;
        else failCount++;
    });
    
    console.log(`\n=== Import Complete ===`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

// Run the import
batchImport();
