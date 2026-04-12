const JiraClient = require('./jiraClient');
const { parseCSV } = require('./csvParser');
const config = require('./config');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    parentId: config.DEFAULT_PARENT_ID,
    csv: path.join(__dirname, 'TestCases.csv'),
    createStory: null,
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--parentId' && args[i + 1]) {
      result.parentId = args[i + 1];
      i++;
    } else if (args[i] === '--csv' && args[i + 1]) {
      result.csv = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === '--createStory' && args[i + 1]) {
      result.createStory = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
JIRA Subtask Creator CLI

Usage: node index.js [options]

Options:
  --parentId <id>       Parent issue ID (numeric, from JIRA URL)
  --createStory <title> Create a new story with this title, then add subtasks
  --csv <file>          Path to CSV file (default: TestCases.csv)
  --help, -h            Show this help

Examples:
  node index.js --parentId 123456
  node index.js --createStory "Feature: User Authentication"
  node index.js --parentId 123456 --csv ./myTests.csv

Required CSV format:
  TC_ID,Statement,Priority,Status
  TC-001,Verify login,High,Draft
`);
      process.exit(0);
    }
  }
  
  return result;
}

async function main() {
  const args = parseArgs();
  const jira = new JiraClient();
  
  console.log('🚀 Starting JIRA automation...\n');
  if (args.createStory) {
    console.log(`   Mode: Create Story + Subtasks`);
    console.log(`   Story: "${args.createStory}"`);
  } else {
    console.log(`   Mode: Add Subtasks to existing issue`);
    console.log(`   Parent ID: ${args.parentId}`);
  }
  console.log(`   CSV File: ${args.csv}\n`);
  
  try {
    // Step 1: Test connection
    console.log('🔐 Testing connection...');
    const user = await jira.testConnection();
    console.log(`   ✅ Connected as: ${user.displayName}\n`);
    
    // Step 2: Parse the CSV file
    console.log('📄 Reading test cases from CSV...');
    const testCases = parseCSV(args.csv);
    console.log(`   Found ${testCases.length} test cases\n`);
    
    // Step 2.5: Create story if requested
    let parentId = args.parentId;
    if (args.createStory) {
      console.log('📝 Creating parent Story...');
      const story = await jira.createStory({ summary: args.createStory });
      console.log(`   ✅ Created: ${story.key} (ID: ${story.id})\n`);
      parentId = story.id;
    }
    
    // Step 3: Create subtasks for each test case
    console.log('📋 Creating subtasks...\n');
    let successCount = 0;
    let failCount = 0;
    const created = [];
    
    for (const tc of testCases) {
      const tcId = tc['TC ID'] || tc['TC_ID'] || tc['TCID'] || tc['ID'] || tc['TestCase ID'];
      const description = tc['Description'] || tc['Summary'] || tc['Title'] || tc['Name'] || tc['Statement'];
      
      if (!tcId || !description) {
        console.log(`   ⚠️ Skipping row - missing TC ID or Statement`);
        continue;
      }
      
      try {
        const subtask = await jira.createSubtask({
          parentId: parentId,
          tcId,
          description,
        });
        console.log(`   ✅ ${subtask.key} - ${tcId}`);
        created.push(subtask.key);
        successCount++;
      } catch (error) {
        console.log(`   ❌ Failed: ${tcId} - ${error.message}`);
        failCount++;
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log(`   Subtasks Created: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    if (created.length > 0) {
      console.log(`   Created: ${created.join(', ')}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nTroubleshooting:');
    console.log('  - Update COOKIES in config.js with fresh values from browser');
    console.log('  - Check that all IDs in config.js are correct for your project');
    process.exit(1);
  }
}

main();
