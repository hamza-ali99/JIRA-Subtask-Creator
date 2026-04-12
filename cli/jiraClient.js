const config = require('./config');

class JiraClient {
  constructor() {
    this.baseUrl = config.JIRA_BASE_URL;
  }

  async request(endpoint, method = 'GET', body = null, queryParams = '') {
    const url = `${this.baseUrl}/rest/api/3${endpoint}${queryParams}`;
    
    const options = {
      method,
      headers: {
        'Cookie': config.COOKIES,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': this.baseUrl,
        'X-Atlassian-Token': 'no-check',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JIRA API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  /**
   * Generate a random local ID for ADF content
   */
  generateLocalId() {
    return Math.random().toString(16).substring(2, 14);
  }

  /**
   * Create a subtask under a parent story
   */
  async createSubtask({ parentId, tcId, description }) {
    const summary = `${tcId}: ${description}`;
    
    const fields = {
      project: { id: config.PROJECT_ID },
      issuetype: { id: config.SUBTASK_TYPE_ID },
      parent: { id: parentId },
      summary: summary,
      description: {
        version: 1,
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { localId: this.generateLocalId() },
          content: [{ type: 'text', text: `${tcId}: ${description}` }]
        }]
      },
    };

    // Add optional fields if configured
    if (config.ASSIGNEE_ID) {
      fields.assignee = { id: config.ASSIGNEE_ID };
    }
    if (config.PRIORITY_ID) {
      fields.priority = { id: config.PRIORITY_ID };
    }
    if (config.COMPONENT_ID) {
      fields.components = [{ id: config.COMPONENT_ID }];
    }
    if (config.FIX_VERSION_ID) {
      fields.fixVersions = [{ id: config.FIX_VERSION_ID }];
    }

    const payload = { fields };

    // Add transition if configured
    if (config.TRANSITION_ID) {
      payload.transition = { id: config.TRANSITION_ID };
    }

    return this.request(
      '/issue',
      'POST',
      payload,
      '?updateHistory=true'
    );
  }

  /**
   * Create a story under an epic
   */
  async createStory({ summary }) {
    const fields = {
      project: { id: config.PROJECT_ID },
      issuetype: { id: config.STORY_TYPE_ID },
      summary: summary,
      description: {
        version: 1,
        type: 'doc',
        content: [{
          type: 'paragraph',
          attrs: { localId: this.generateLocalId() },
          content: [{ type: 'text', text: summary }]
        }]
      },
    };

    // Link to epic if configured
    if (config.EPIC_ID) {
      fields.parent = { id: config.EPIC_ID };
    }

    // Add sprint if configured
    if (config.SPRINT_ID && config.CUSTOM_FIELD_SPRINT) {
      fields[config.CUSTOM_FIELD_SPRINT] = config.SPRINT_ID;
    }

    // Add optional fields
    if (config.ASSIGNEE_ID) {
      fields.assignee = { id: config.ASSIGNEE_ID };
    }
    if (config.PRIORITY_ID) {
      fields.priority = { id: config.PRIORITY_ID };
    }
    if (config.COMPONENT_ID) {
      fields.components = [{ id: config.COMPONENT_ID }];
    }
    if (config.FIX_VERSION_ID) {
      fields.fixVersions = [{ id: config.FIX_VERSION_ID }];
    }

    return this.request(
      '/issue',
      'POST',
      { fields },
      '?updateHistory=true'
    );
  }

  /**
   * Get an issue by key
   */
  async getIssue(issueKey) {
    return this.request(`/issue/${issueKey}`);
  }

  /**
   * Test connection by getting current user
   */
  async testConnection() {
    return this.request('/myself');
  }
}

module.exports = JiraClient;
