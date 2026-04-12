// JIRA Configuration - Update these values for your instance
module.exports = {
  // Your JIRA Cloud URL
  JIRA_BASE_URL: 'https://your-company.atlassian.net',
  
  // Project settings (find these in your JIRA project settings or URL)
  PROJECT_ID: '10001',           // Numeric project ID
  PROJECT_KEY: 'PROJ',           // Project abbreviation
  STORY_TYPE_ID: '10001',        // Story issue type ID
  SUBTASK_TYPE_ID: '10003',      // Sub-task issue type ID
  
  // Epic (parent for stories) - find in Epic URL
  EPIC_ID: '12345',
  
  // Sprint ID - find via board API or URL
  SPRINT_ID: 1234,
  
  // Default parent story ID for subtasks
  DEFAULT_PARENT_ID: '12345',
  
  // User/Assignee account ID
  // Find via: /rest/api/3/myself or search users
  ASSIGNEE_ID: '',
  
  // Priority (usually: 1=Highest, 2=High, 3=Medium, 4=Low, 5=Lowest)
  PRIORITY_ID: '3',
  
  // Component ID (optional, leave empty if not using)
  COMPONENT_ID: '',
  
  // Fix Version ID (optional)
  FIX_VERSION_ID: '',
  
  // Custom Fields - These vary between JIRA instances!
  // Leave empty if not applicable to your setup
  CUSTOM_FIELD_EPIC_LINK: 'customfield_10014',
  CUSTOM_FIELD_SPRINT: 'customfield_10020',
  CUSTOM_FIELD_STORY_POINTS: 'customfield_11055',
  
  // Transition ID (optional - for setting initial status)
  TRANSITION_ID: '',
  
  // Session cookies - NEVER commit real cookies!
  // Run: node utils/updateCookies.js "paste-cookies-here"
  COOKIES: `tenant.session.token=YOUR_TOKEN_HERE; atlassian.xsrf.token=YOUR_XSRF_TOKEN`,
};
