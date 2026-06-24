const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'SS_2_GEOGRAPHY_EXAMINATION_Questions.xlsx';

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  console.log('Sheet Name:', sheetName);
  console.log('Total Rows:', data.length);
  console.log('\nFirst 10 rows:');
  data.slice(0, 10).forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });
} catch (e) {
  console.error('Error:', e.message);
}
