/**
 * Utility script to fetch and display issue types for your project
 * Helps you find the correct IDs for config.js
 */

const JiraClient = require('../cli/jiraClient');
const config = require('../cli/config');

async function main() {
  const jira = new JiraClient();
  
  try {
    console.log('🔐 Testing connection...');
    const user = await jira.testConnection();
    console.log(`   ✅ Connected as: ${user.displayName}`);
    console.log(`   Email: ${user.emailAddress || 'N/A'}\n`);
    
    console.log('📋 Current configuration:');
    console.log('-'.repeat(50));
    console.log(`  JIRA URL: ${config.JIRA_BASE_URL}`);
    console.log(`  Project ID: ${config.PROJECT_ID || '(not set)'}`);
    console.log(`  Story Type ID: ${config.STORY_TYPE_ID || '(not set)'}`);
    console.log(`  Subtask Type ID: ${config.SUBTASK_TYPE_ID || '(not set)'}`);
    console.log(`  Epic ID: ${config.EPIC_ID || '(not set)'}`);
    console.log(`  Sprint ID: ${config.SPRINT_ID || '(not set)'}`);
    console.log(`  Assignee ID: ${config.ASSIGNEE_ID || '(not set)'}`);
    console.log('-'.repeat(50));
    
    // Fetch issue types if project is set
    if (config.PROJECT_ID) {
      console.log('\n📊 Fetching issue types for your project...\n');
      
      const response = await fetch(
        `${config.JIRA_BASE_URL}/rest/api/3/issuetype/project?projectId=${config.PROJECT_ID}`,
        {
          headers: {
            'Cookie': config.COOKIES,
            'Accept': 'application/json',
          }
        }
      );
      
      if (response.ok) {
        const issueTypes = await response.json();
        console.log('Issue Types:');
        issueTypes.forEach(type => {
          const subtaskTag = type.subtask ? ' [SUBTASK]' : '';
          console.log(`  ${type.id}: ${type.name}${subtaskTag}`);
        });
      } else {
        console.log('Could not fetch issue types. Check your cookies.');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tips:');
    console.log('  - Update COOKIES in cli/config.js with fresh values');
    console.log('  - Verify JIRA_BASE_URL is correct');
    console.log('  - Check that PROJECT_ID exists');
  }
}

main();
