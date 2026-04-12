import { defaultConfig, JiraConfig } from './config';

export interface CreateSubtaskParams {
  parentId: string;
  tcId: string;
  description: string;
}

export interface CreateStoryParams {
  summary: string;
}

export interface JiraResponse {
  id: string;
  key: string;
  self: string;
}

export interface SettingsOverride {
  jiraUrl?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string;
  projectId?: string;
  storyTypeId?: string;
  subtaskTypeId?: string;
  priorityId?: string;
  componentId?: string;
  componentName?: string;
  fixVersionId?: string;
  transitionId?: string;
  customFields?: Record<string, string | number>;
}

export class JiraClient {
  private baseUrl: string;
  private config: JiraConfig;
  private cookies: string;
  private customFieldsOverride?: Record<string, string | number>;

  constructor(cookies: string, settingsOverride?: SettingsOverride) {
    // Merge settings override with default config
    this.config = { ...defaultConfig };
    
    if (settingsOverride) {
      if (settingsOverride.jiraUrl) this.config.baseUrl = settingsOverride.jiraUrl;
      if (settingsOverride.assigneeId) this.config.assigneeId = settingsOverride.assigneeId;
      if (settingsOverride.epicId) this.config.epicId = settingsOverride.epicId;
      if (settingsOverride.sprintId) this.config.sprintId = parseInt(settingsOverride.sprintId);
      if (settingsOverride.projectId) this.config.projectId = settingsOverride.projectId;
      if (settingsOverride.storyTypeId) this.config.storyTypeId = settingsOverride.storyTypeId;
      if (settingsOverride.subtaskTypeId) this.config.subtaskTypeId = settingsOverride.subtaskTypeId;
      if (settingsOverride.priorityId) this.config.priorityId = settingsOverride.priorityId;
      if (settingsOverride.componentId) this.config.componentId = settingsOverride.componentId;
      if (settingsOverride.fixVersionId) this.config.fixVersionId = settingsOverride.fixVersionId;
      if (settingsOverride.transitionId) this.config.transitionId = settingsOverride.transitionId;
      
      // Store custom fields for later use
      if (settingsOverride.customFields) {
        this.customFieldsOverride = settingsOverride.customFields;
      }
    }
    
    // Ensure URL has protocol
    let url = this.config.baseUrl.replace(/\/$/, '');
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    this.baseUrl = url;
    this.cookies = cookies;
  }

  private generateLocalId(): string {
    return Math.random().toString(16).substring(2, 14);
  }

  async request(endpoint: string, method = 'GET', body: unknown = null, queryParams = ''): Promise<unknown> {
    const url = `${this.baseUrl}/rest/api/3${endpoint}${queryParams}`;

    const headers: Record<string, string> = {
      'Cookie': this.cookies,
      'Content-Type': 'application/json',
      'Accept': 'application/json,text/javascript,*/*',
      'Origin': this.baseUrl,
      'X-Atlassian-Token': 'no-check',
      'X-Atlassian-Capability': 'GLOBAL_ISSUE_CREATE--other',
    };

    const options: RequestInit = {
      method,
      headers,
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

  async testConnection(): Promise<{ displayName: string; emailAddress: string }> {
    return this.request('/myself') as Promise<{ displayName: string; emailAddress: string }>;
  }

  async createStory({ summary }: CreateStoryParams): Promise<JiraResponse> {
    // Build payload dynamically based on available settings
    const fields: Record<string, unknown> = {
      project: { id: this.config.projectId },
      issuetype: { id: this.config.storyTypeId },
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

    // Only add optional fields if they're configured
    if (this.config.epicId) {
      fields.parent = { id: this.config.epicId };
    }
    if (this.config.sprintId) {
      fields.customfield_10020 = this.config.sprintId;
    }
    if (this.config.assigneeId) {
      fields.assignee = { id: this.config.assigneeId };
    }
    if (this.config.priorityId) {
      fields.priority = { id: this.config.priorityId };
    }
    if (this.config.componentId) {
      fields.components = [{ id: this.config.componentId }];
    }
    if (this.config.fixVersionId) {
      fields.fixVersions = [{ id: this.config.fixVersionId }];
    }

    // Dynamic custom fields from settings (only use fields explicitly configured by user)
    if (this.customFieldsOverride) {
      for (const [fieldKey, fieldValue] of Object.entries(this.customFieldsOverride)) {
        if (fieldValue !== '' && fieldValue !== undefined) {
          // Convert shorthand cf#### to customfield_####
          const fullFieldKey = fieldKey.startsWith('cf') && !fieldKey.startsWith('customfield_')
            ? `customfield_${fieldKey.slice(2)}`
            : fieldKey;
          
          // Determine format based on value pattern:
          // - Pure small numbers (< 100) = likely direct value (e.g., Story Points)
          // - Larger numbers (5 digits+) = likely select field ID
          // - String with text = direct value
          const numValue = typeof fieldValue === 'number' ? fieldValue : parseInt(String(fieldValue));
          const isNumber = !isNaN(numValue) && String(fieldValue).match(/^\d+$/);
          
          if (isNumber) {
            if (numValue < 100) {
              // Small number - use as direct value (Story Points, etc.)
              fields[fullFieldKey] = numValue;
            } else {
              // Larger number - likely a select field option ID
              fields[fullFieldKey] = { id: String(fieldValue) };
            }
          } else {
            // String value - use directly
            fields[fullFieldKey] = fieldValue;
          }
        }
      }
    }

    const payload: Record<string, unknown> = {
      fields,
      update: {},
      externalToken: Math.random().toString()
    };

    if (this.config.assigneeId) {
      payload.watchers = [this.config.assigneeId];
    }

    return this.request(
      '/issue',
      'POST',
      payload,
      '?updateHistory=true&applyDefaultValues=false&skipAutoWatch=true'
    ) as Promise<JiraResponse>;
  }

  async createSubtask({ parentId, tcId, description }: CreateSubtaskParams): Promise<JiraResponse> {
    const summary = `${tcId}: ${description}`;

    // Determine if parentId is a key (like PROJ-123) or numeric ID
    const isKey = /^[A-Z]+-\d+$/i.test(parentId);
    const parentRef = isKey ? { key: parentId } : { id: parentId };

    // Build fields - matching the exact format that works in the original app
    const fields: Record<string, unknown> = {
      project: { id: this.config.projectId },
      issuetype: { id: this.config.subtaskTypeId },
      parent: parentRef,
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
      labels: [],
    };

    // Standard fields
    if (this.config.assigneeId) {
      fields.assignee = { id: this.config.assigneeId };
    }
    if (this.config.priorityId) {
      fields.priority = { id: this.config.priorityId };
    }
    if (this.config.componentId) {
      fields.components = [{ id: this.config.componentId }];
    }
    if (this.config.fixVersionId) {
      fields.fixVersions = [{ id: this.config.fixVersionId }];
    }

    // Custom fields from settings - use exact format JIRA expects
    if (this.customFieldsOverride) {
      const cf = this.customFieldsOverride;
      
      // cf11140 - Application (multi-select with value)
      if (cf.cf11140 || cf.customfield_11140) {
        fields.customfield_11140 = [{ id: String(cf.cf11140 || cf.customfield_11140), value: 'All' }];
      }
      
      // cf11050 - Fix Version/Release (single select)
      if (cf.cf11050 || cf.customfield_11050) {
        fields.customfield_11050 = { id: String(cf.cf11050 || cf.customfield_11050) };
      }
      
      // cf11055 - Story Points (plain number)
      if (cf.cf11055 !== undefined || cf.customfield_11055 !== undefined) {
        const val = cf.cf11055 ?? cf.customfield_11055;
        fields.customfield_11055 = typeof val === 'number' ? val : parseInt(String(val)) || 1;
      }
      
      // cf11156 - Wave (single select with value)
      if (cf.cf11156 || cf.customfield_11156) {
        fields.customfield_11156 = { id: String(cf.cf11156 || cf.customfield_11156), value: 'N/A' };
      }
      
      // cf11066 - another select field
      if (cf.cf11066 || cf.customfield_11066) {
        fields.customfield_11066 = { id: String(cf.cf11066 || cf.customfield_11066) };
      }
    }

    const payload: Record<string, unknown> = {
      fields,
      update: {},
      externalToken: Math.random().toString()
    };

    if (this.config.transitionId) {
      payload.transition = { id: this.config.transitionId };
    }
    if (this.config.assigneeId) {
      payload.watchers = [this.config.assigneeId];
    }

    return this.request(
      '/issue',
      'POST',
      payload,
      '?updateHistory=true&applyDefaultValues=false&skipAutoWatch=true'
    ) as Promise<JiraResponse>;
  }
}
