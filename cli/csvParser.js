const fs = require('fs');

/**
 * Parse a CSV file into an array of objects
 * @param {string} filePath - Path to CSV file
 * @returns {Array<Object>} Array of row objects with header keys
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }
  
  // Get headers from first line
  const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
  
  // Parse data rows
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || '').replace(/['"]/g, '');
    });
    data.push(row);
  }
  
  return data;
}

/**
 * Handle CSV values that might contain commas within quotes
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  
  return values;
}

module.exports = { parseCSV };
