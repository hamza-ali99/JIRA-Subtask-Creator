/**
 * JIRA API Reference - Story & Subtask Creation Payloads
 * 
 * This file documents the API payload structure for creating issues in JIRA Cloud.
 * Use this as a reference when debugging or customizing the tool.
 * 
 * Replace placeholder values with your actual JIRA instance data.
 */

// =============================================================================
// STORY CREATION PAYLOAD
// =============================================================================
const STORY_PAYLOAD = {
  endpoint: '/rest/api/3/issue?updateHistory=true',
  method: 'POST',
  
  // Required fields
  fields: {
    project: { id: 'PROJECT_ID' },         // Your project's numeric ID
    issuetype: { id: 'STORY_TYPE_ID' },    // Issue type ID for "Story"
    summary: 'Story Title Here',
    
    // Parent Epic (if using epic hierarchy)
    parent: { id: 'EPIC_ID' },
    
    // Sprint (custom field - ID varies by instance)
    // customfield_10020: SPRINT_ID,
    
    // Assignee
    assignee: { id: 'ACCOUNT_ID' },
    
    // Priority (1=Highest, 2=High, 3=Medium, 4=Low, 5=Lowest)
    priority: { id: '3' },
    
    // Components (optional)
    // components: [{ id: 'COMPONENT_ID' }],
    
    // Fix Version (optional)
    // fixVersions: [{ id: 'VERSION_ID' }],
    
    // Labels (optional)
    labels: [],
    
    // Description in ADF format (Atlassian Document Format)
    description: {
      version: 1,
      type: 'doc',
      content: [{
        type: 'paragraph',
        attrs: { localId: 'random-local-id' },
        content: [{ type: 'text', text: 'Description text here' }]
      }]
    }
  },
  
  // Optional - add watchers
  // watchers: ['ACCOUNT_ID'],
  
  update: {}
};

// =============================================================================
// SUBTASK CREATION PAYLOAD
// =============================================================================
const SUBTASK_PAYLOAD = {
  endpoint: '/rest/api/3/issue?updateHistory=true',
  method: 'POST',
  
  fields: {
    project: { id: 'PROJECT_ID' },
    issuetype: { id: 'SUBTASK_TYPE_ID' },   // Issue type ID for "Sub-task"
    parent: { id: 'PARENT_STORY_ID' },       // Parent issue ID (numeric)
    summary: 'TC-001: Test case description',
    
    // Same optional fields as story
    assignee: { id: 'ACCOUNT_ID' },
    priority: { id: '3' },
    
    description: {
      version: 1,
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: 'TC-001: Test case description' }]
      }]
    }
  },
  
  // Optional - set initial status transition
  // transition: { id: 'TRANSITION_ID' }
};

// =============================================================================
// HOW TO FIND YOUR IDs
// =============================================================================
const HOW_TO_FIND_IDS = {
  projectId: `
    1. Go to Project Settings → Details
    2. Or check browser DevTools Network tab when loading project
    3. Or use API: GET /rest/api/3/project
  `,
  
  issueTypeId: `
    1. Use the getIssueTypes.js utility script
    2. Or API: GET /rest/api/3/issuetype/project?projectId=YOUR_PROJECT_ID
  `,
  
  epicId: `
    1. Open the Epic issue in JIRA
    2. Check the URL: /browse/PROJ-123 → get numeric ID from DevTools or API
    3. Or API: GET /rest/api/3/issue/PROJ-123 → use "id" field
  `,
  
  sprintId: `
    1. Check DevTools Network tab when viewing sprint board
    2. Or API: GET /rest/agile/1.0/board/{boardId}/sprint
  `,
  
  accountId: `
    1. API: GET /rest/api/3/myself
    2. Or search: GET /rest/api/3/user/search?query=email@example.com
  `,
  
  customFieldIds: `
    1. API: GET /rest/api/3/field
    2. Look for fields starting with "customfield_"
    3. Common ones:
       - Epic Link: customfield_10014 (varies)
       - Sprint: customfield_10020 (varies)
       - Story Points: customfield_10024 (varies)
  `
};

// =============================================================================
// API RESPONSE EXAMPLES
// =============================================================================
const RESPONSE_EXAMPLES = {
  createIssue: {
    id: '123456',
    key: 'PROJ-789',
    self: 'https://your-company.atlassian.net/rest/api/3/issue/123456'
  },
  
  currentUser: {
    accountId: '712020:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    displayName: 'John Doe',
    emailAddress: 'john.doe@company.com',
    active: true
  },
  
  issueTypes: [
    { id: '10001', name: 'Story', subtask: false },
    { id: '10002', name: 'Bug', subtask: false },
    { id: '10003', name: 'Sub-task', subtask: true },
    { id: '10004', name: 'Epic', subtask: false }
  ]
};

module.exports = { 
  STORY_PAYLOAD, 
  SUBTASK_PAYLOAD, 
  HOW_TO_FIND_IDS,
  RESPONSE_EXAMPLES 
};
