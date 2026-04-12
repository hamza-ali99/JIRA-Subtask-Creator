// =============================================================================
// JIRA API Client - Generic implementation with API Token support
// =============================================================================

import {
  AuthConfig,
  JiraConnectionConfig,
  JiraIssue,
  JiraSearchResult,
  CreateIssueRequest,
  CreateIssueResponse,
  BulkCreateResponse,
  JiraProject,
  JiraIssueType,
  JiraPriority,
  JiraSprint,
  JiraBoard,
  JiraUser,
  JiraField,
  Epic,
  Story,
  Subtask,
  IssueHierarchy,
  PaginatedResponse,
} from './jira-types';

export class JiraApiClient {
  private baseUrl: string;
  private auth: AuthConfig;

  constructor(config: JiraConnectionConfig) {
    // Ensure URL has protocol
    let url = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    this.baseUrl = url;
    this.auth = config.auth;
  }

  // ---------------------------------------------------------------------------
  // Authentication Helpers
  // ---------------------------------------------------------------------------

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    switch (this.auth.method) {
      case 'api-token':
        if (this.auth.email && this.auth.apiToken) {
          const credentials = Buffer.from(`${this.auth.email}:${this.auth.apiToken}`).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;

      case 'cookie':
        if (this.auth.cookies) {
          headers['Cookie'] = this.auth.cookies;
          headers['X-Atlassian-Token'] = 'no-check';
        }
        break;

      case 'bearer':
        if (this.auth.bearerToken) {
          headers['Authorization'] = `Bearer ${this.auth.bearerToken}`;
        }
        break;
    }

    return headers;
  }

  // ---------------------------------------------------------------------------
  // HTTP Request Methods
  // ---------------------------------------------------------------------------

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: unknown,
    isAgile = false
  ): Promise<T> {
    const baseApi = isAgile ? '/rest/agile/1.0' : '/rest/api/3';
    const url = `${this.baseUrl}${baseApi}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.getAuthHeaders(),
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `JIRA API Error (${response.status})`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errorMessages?.length) {
          errorMessage = errorJson.errorMessages.join(', ');
        } else if (errorJson.errors) {
          errorMessage = Object.entries(errorJson.errors)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {} as T;

    return JSON.parse(text) as T;
  }

  // ---------------------------------------------------------------------------
  // Connection Test
  // ---------------------------------------------------------------------------

  async testConnection(): Promise<JiraUser> {
    return this.request<JiraUser>('/myself');
  }

  // ---------------------------------------------------------------------------
  // Metadata Discovery
  // ---------------------------------------------------------------------------

  async getProjects(): Promise<JiraProject[]> {
    return this.request<JiraProject[]>('/project');
  }

  async getIssueTypes(): Promise<JiraIssueType[]> {
    return this.request<JiraIssueType[]>('/issuetype');
  }

  async getIssueTypesForProject(projectKey: string): Promise<JiraIssueType[]> {
    const result = await this.request<{ issueTypes: JiraIssueType[] }>(
      `/issue/createmeta/${projectKey}/issuetypes`
    );
    return result.issueTypes || [];
  }

  async getPriorities(): Promise<JiraPriority[]> {
    return this.request<JiraPriority[]>('/priority');
  }

  async getFields(): Promise<JiraField[]> {
    return this.request<JiraField[]>('/field');
  }

  async getBoards(projectKey?: string): Promise<JiraBoard[]> {
    // Use higher limit when fetching all boards
    const maxResults = projectKey ? 100 : 500;
    const endpoint = projectKey 
      ? `/board?projectKeyOrId=${projectKey}&maxResults=${maxResults}` 
      : `/board?maxResults=${maxResults}`;
    const result = await this.request<PaginatedResponse<JiraBoard>>(endpoint, 'GET', undefined, true);
    return result?.values || [];
  }

  async getSprints(boardId: number): Promise<JiraSprint[]> {
    const result = await this.request<PaginatedResponse<JiraSprint>>(
      `/board/${boardId}/sprint?state=active,future`,
      'GET',
      undefined,
      true
    );
    return result?.values || [];
  }

  async searchUsers(query: string): Promise<JiraUser[]> {
    return this.request<JiraUser[]>(`/user/search?query=${encodeURIComponent(query)}&maxResults=50`);
  }

  // ---------------------------------------------------------------------------
  // Search & Query
  // ---------------------------------------------------------------------------

  async search(jql: string, fields?: string[], maxResults = 100, startAt = 0): Promise<JiraSearchResult> {
    const fieldsArray = fields || ['summary', 'status', 'issuetype', 'priority', 'parent', 'subtasks', 'assignee', 'created', 'updated'];
    
    // Use the new POST /search/jql endpoint (the old GET /search endpoint was removed)
    return this.request<JiraSearchResult>('/search/jql', 'POST', {
      jql,
      fields: fieldsArray,
      maxResults,
      startAt
    });
  }

  async getIssue(issueKeyOrId: string, fields?: string[]): Promise<JiraIssue> {
    const fieldsParam = fields?.join(',') || '*all';
    return this.request<JiraIssue>(`/issue/${issueKeyOrId}?fields=${fieldsParam}`);
  }

  async searchEpics(query: string, projectKey?: string): Promise<Epic[]> {
    // Check if query looks like an issue key (e.g., MSP-5283)
    const issueKeyPattern = /^[A-Z]+-\d+$/i;
    
    if (issueKeyPattern.test(query)) {
      // Fetch the specific issue directly
      try {
        const issue = await this.getIssue(query);
        if (issue) {
          return [issue as Epic];
        }
      } catch {
        // Issue not found or not accessible
      }
      return [];
    }
    
    // Search by summary text
    let jql = `issuetype = Epic AND summary ~ "${query}"`;
    if (projectKey) {
      jql = `project = "${projectKey}" AND ${jql}`;
    }
    jql += ' ORDER BY key DESC';
    
    try {
      const result = await this.search(jql, undefined, 50);
      return result.issues as Epic[];
    } catch {
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Hierarchical Fetch: Epics → Stories → Subtasks
  // ---------------------------------------------------------------------------

  async getProjectHierarchy(projectKeyOrId: string): Promise<unknown> {
    // Get the project's issue type hierarchy
    return this.request<unknown>(`/project/${projectKeyOrId}/hierarchy`);
  }

  async getEpicsForBoard(boardId: number): Promise<Epic[]> {
    // GET /rest/agile/1.0/board/{boardId}/epic
    const epicsResponse = await this.request<{ values: Epic[] }>(
      `/board/${boardId}/epic`,
      'GET',
      undefined,
      true // isAgile = true
    );
    return epicsResponse?.values || [];
  }

  async getEpics(projectKey: string, boardId?: number): Promise<Epic[]> {
    // Helper function to search for epics via JQL
    const searchEpicsViaJql = async (): Promise<Epic[]> => {
      // Try multiple approaches to find Epics
      // 1. Standard Epic type name (quoted for safety)
      // 2. Hierarchy level 1 (Epics in most JIRA setups)
      const jqlVariants = [
        `project = "${projectKey}" AND issuetype = "Epic" ORDER BY key DESC`,
        `project = "${projectKey}" AND hierarchyLevel = 1 ORDER BY key DESC`,
        `project = ${projectKey} AND type = Epic ORDER BY key DESC`,
      ];
      
      for (const jql of jqlVariants) {
        try {
          const result = await this.search(jql, undefined, 500);
          if (result.issues && result.issues.length > 0) {
            return result.issues as Epic[];
          }
        } catch {
          // Try next variant
        }
      }
      
      return [];
    };

    // If boardId is provided, try it first but fall back to JQL if it fails
    if (boardId) {
      try {
        return await this.getEpicsForBoard(boardId);
      } catch {
        return searchEpicsViaJql();
      }
    }

    // Otherwise, find boards for the project first
    try {
      const boardsResponse = await this.request<{ values: Array<{ id: number; name: string; type: string }> }>(
        `/board?projectKeyOrId=${projectKey}`,
        'GET',
        undefined,
        true // isAgile = true
      );
      
      if (boardsResponse?.values && boardsResponse.values.length > 0) {
        // Use the first scrum/kanban board to get epics
        const board = boardsResponse.values.find(b => b.type === 'scrum') || boardsResponse.values[0];
        try {
          return await this.getEpicsForBoard(board.id);
        } catch {
          // Fall through to JQL search
        }
      }
    } catch {
      // Agile API not available, fall through to JQL search
    }

    // Fallback: Use JQL search via POST /search/jql
    return searchEpicsViaJql();
  }

  async getStoriesForEpic(epicKey: string): Promise<Story[]> {
    // Try both parent link (next-gen) and epic link (classic) approaches
    const jql = `(parent = ${epicKey} OR "Epic Link" = ${epicKey}) AND issuetype in (Story, Task) ORDER BY created DESC`;
    
    try {
      const result = await this.search(jql);
      return result.issues.map(issue => ({
        ...issue,
        epicKey,
      })) as Story[];
    } catch {
      // Fallback: Some instances don't have Epic Link field
      const fallbackJql = `parent = ${epicKey} ORDER BY created DESC`;
      const result = await this.search(fallbackJql);
      return result.issues.map(issue => ({
        ...issue,
        epicKey,
      })) as Story[];
    }
  }

  async getSubtasksForStory(storyKey: string): Promise<Subtask[]> {
    const jql = `parent = ${storyKey} AND issuetype = Sub-task ORDER BY created ASC`;
    const result = await this.search(jql);
    return result.issues.map(issue => ({
      ...issue,
      parentKey: storyKey,
    })) as Subtask[];
  }

  async getFullHierarchy(projectKey: string): Promise<IssueHierarchy> {
    // Step 1: Get all epics
    const epics = await this.getEpics(projectKey);

    // Step 2: For each epic, get its stories
    const epicsWithStories: Epic[] = await Promise.all(
      epics.map(async (epic) => {
        const stories = await this.getStoriesForEpic(epic.key);
        
        // Step 3: For each story, get its subtasks
        const storiesWithSubtasks = await Promise.all(
          stories.map(async (story) => {
            const subtasks = await this.getSubtasksForStory(story.key);
            return { ...story, subtasks };
          })
        );

        return { ...epic, stories: storiesWithSubtasks };
      })
    );

    // Step 4: Get orphan stories (stories not linked to any epic)
    const allStoriesJql = `project = ${projectKey} AND issuetype in (Story, Task) AND parent is EMPTY ORDER BY created DESC`;
    let orphanStories: Story[] = [];
    
    try {
      const orphanResult = await this.search(allStoriesJql);
      
      // Get subtasks for orphan stories too
      orphanStories = await Promise.all(
        orphanResult.issues.map(async (story) => {
          const subtasks = await this.getSubtasksForStory(story.key);
          return { ...story, subtasks } as Story;
        })
      );
    } catch {
      // Ignore errors for orphan stories query
    }

    return {
      epics: epicsWithStories,
      orphanStories,
    };
  }

  // Lighter version: just get stories for a project (with their subtask counts)
  async getStoriesForProject(projectKey: string, epicKey?: string): Promise<Story[]> {
    let jql = `project = ${projectKey} AND issuetype in (Story, Task)`;
    
    if (epicKey) {
      jql += ` AND (parent = ${epicKey} OR "Epic Link" = ${epicKey})`;
    }
    
    jql += ' ORDER BY created DESC';

    const result = await this.search(jql, ['summary', 'status', 'issuetype', 'priority', 'parent', 'subtasks', 'assignee']);
    return result.issues as Story[];
  }

  // ---------------------------------------------------------------------------
  // Create Issues
  // ---------------------------------------------------------------------------

  private buildAdfDescription(text: string): object {
    return {
      version: 1,
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text }],
        },
      ],
    };
  }

  async createIssue(request: CreateIssueRequest): Promise<CreateIssueResponse> {
    const fields: Record<string, unknown> = {
      project: { key: request.projectKey },
      summary: request.summary,
    };

    // Handle different issueType formats
    if (typeof request.issueType === 'string') {
      fields.issuetype = { name: request.issueType };
    } else if ('id' in request.issueType) {
      fields.issuetype = { id: request.issueType.id };
    } else if ('name' in request.issueType) {
      fields.issuetype = { name: request.issueType.name };
    }

    if (request.description) {
      fields.description = this.buildAdfDescription(request.description);
    }

    if (request.parentKey) {
      fields.parent = { key: request.parentKey };
    }

    if (request.assigneeId) {
      fields.assignee = { id: request.assigneeId };
    }

    if (request.priorityId) {
      fields.priority = { id: request.priorityId };
    }

    if (request.labels?.length) {
      fields.labels = request.labels;
    }

    if (request.components?.length) {
      fields.components = request.components.map(id => ({ id }));
    }

    // Add custom fields
    if (request.customFields) {
      for (const [key, value] of Object.entries(request.customFields)) {
        fields[key] = value;
      }
    }

    return this.request<CreateIssueResponse>('/issue', 'POST', { fields });
  }

  async createSubtask(
    parentKeyOrId: string,
    summary: string,
    projectKey: string,
    subtaskTypeId: string,
    options?: {
      description?: string;
      assigneeId?: string;
      priorityId?: string;
      customFields?: Record<string, unknown>;
    }
  ): Promise<CreateIssueResponse> {
    // Auto-detect if parentKeyOrId is a key (like PROJ-123) or numeric ID
    const isKey = /^[A-Z]+-\d+$/i.test(parentKeyOrId);
    const parentRef = isKey ? { key: parentKeyOrId } : { id: parentKeyOrId };

    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      parent: parentRef,
      issuetype: { id: subtaskTypeId },
      summary,
    };

    if (options?.description) {
      fields.description = this.buildAdfDescription(options.description);
    }

    if (options?.assigneeId) {
      fields.assignee = { id: options.assigneeId };
    }

    if (options?.priorityId) {
      fields.priority = { id: options.priorityId };
    }

    if (options?.customFields) {
      for (const [key, value] of Object.entries(options.customFields)) {
        fields[key] = value;
      }
    }

    return this.request<CreateIssueResponse>('/issue', 'POST', { fields });
  }

  /**
   * Create an issue using a pre-defined template from a parsed curl command.
   * This allows for complex custom field configurations captured from working requests.
   */
  async createIssueFromTemplate(
    template: {
      fields: Record<string, unknown>;
      extra?: Record<string, unknown>;
      queryParams?: Record<string, string>;
    },
    overrides: {
      summary: string;
      parentId?: string;
      description?: string;
    }
  ): Promise<CreateIssueResponse> {
    // Clone template fields
    const fields: Record<string, unknown> = { ...template.fields };
    
    // Apply overrides
    fields.summary = overrides.summary;
    
    if (overrides.parentId) {
      const isKey = /^[A-Z]+-\d+$/i.test(overrides.parentId);
      fields.parent = isKey ? { key: overrides.parentId } : { id: overrides.parentId };
    }
    
    if (overrides.description) {
      fields.description = this.buildAdfDescription(overrides.description);
    }

    // Build request body
    const body: Record<string, unknown> = { fields };
    
    // Add extra items (transition, watchers)
    if (template.extra) {
      for (const [key, value] of Object.entries(template.extra)) {
        body[key] = value;
      }
    }

    // Build query params
    let endpoint = '/issue';
    if (template.queryParams && Object.keys(template.queryParams).length > 0) {
      const params = new URLSearchParams(template.queryParams);
      endpoint = `/issue?${params.toString()}`;
    }

    return this.request<CreateIssueResponse>(endpoint, 'POST', body);
  }

  /**
   * Create a subtask using a pre-defined template from a parsed curl command.
   */
  async createSubtaskFromTemplate(
    template: {
      fields: Record<string, unknown>;
      extra?: Record<string, unknown>;
      queryParams?: Record<string, string>;
    },
    parentKeyOrId: string,
    summary: string,
    description?: string
  ): Promise<CreateIssueResponse> {
    return this.createIssueFromTemplate(template, {
      summary,
      parentId: parentKeyOrId,
      description,
    });
  }

  async bulkCreateIssues(issues: Array<{
    projectKey: string;
    issueType: { id: string } | { name: string };
    summary: string;
    parentKey?: string;
    description?: string;
    assigneeId?: string;
    priorityId?: string;
    customFields?: Record<string, unknown>;
  }>): Promise<BulkCreateResponse> {
    const issueUpdates = issues.map(issue => {
      const fields: Record<string, unknown> = {
        project: { key: issue.projectKey },
        issuetype: issue.issueType,
        summary: issue.summary,
      };

      if (issue.parentKey) {
        fields.parent = { key: issue.parentKey };
      }

      if (issue.description) {
        fields.description = this.buildAdfDescription(issue.description);
      }

      if (issue.assigneeId) {
        fields.assignee = { id: issue.assigneeId };
      }

      if (issue.priorityId) {
        fields.priority = { id: issue.priorityId };
      }

      if (issue.customFields) {
        for (const [key, value] of Object.entries(issue.customFields)) {
          fields[key] = value;
        }
      }

      return { fields };
    });

    return this.request<BulkCreateResponse>('/issue/bulk', 'POST', { issueUpdates });
  }

  // ---------------------------------------------------------------------------
  // Auto-Discovery: Detect issue type IDs
  // ---------------------------------------------------------------------------

  async discoverIssueTypeIds(projectKey: string): Promise<{
    epicId?: string;
    storyId?: string;
    taskId?: string;
    subtaskId?: string;
    bugId?: string;
  }> {
    const issueTypes = await this.getIssueTypesForProject(projectKey);
    
    const result: Record<string, string | undefined> = {};
    
    for (const type of issueTypes) {
      const nameLower = type.name.toLowerCase();
      
      if (nameLower === 'epic') {
        result.epicId = type.id;
      } else if (nameLower === 'story') {
        result.storyId = type.id;
      } else if (nameLower === 'task' && !type.subtask) {
        result.taskId = type.id;
      } else if (type.subtask || nameLower === 'sub-task' || nameLower === 'subtask') {
        result.subtaskId = type.id;
      } else if (nameLower === 'bug') {
        result.bugId = type.id;
      }
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // Field Discovery
  // ---------------------------------------------------------------------------

  async discoverCustomFields(): Promise<Record<string, string>> {
    const fields = await this.getFields();
    const customFieldMap: Record<string, string> = {};

    for (const field of fields) {
      if (field.custom) {
        // Map common field names
        const nameLower = field.name.toLowerCase();
        
        if (nameLower.includes('epic') && nameLower.includes('link')) {
          customFieldMap['epicLink'] = field.id;
        } else if (nameLower.includes('sprint')) {
          customFieldMap['sprint'] = field.id;
        } else if (nameLower.includes('story') && nameLower.includes('point')) {
          customFieldMap['storyPoints'] = field.id;
        }
        
        // Also store by field ID for direct access
        customFieldMap[field.id] = field.name;
      }
    }

    return customFieldMap;
  }
}

// =============================================================================
// Factory function for creating clients
// =============================================================================

export function createJiraClient(config: {
  baseUrl: string;
  email?: string;
  apiToken?: string;
  cookies?: string;
}): JiraApiClient {
  let auth: AuthConfig;

  if (config.email && config.apiToken) {
    auth = {
      method: 'api-token',
      email: config.email,
      apiToken: config.apiToken,
    };
  } else if (config.cookies) {
    auth = {
      method: 'cookie',
      cookies: config.cookies,
    };
  } else {
    throw new Error('Either (email + apiToken) or cookies must be provided');
  }

  return new JiraApiClient({
    baseUrl: config.baseUrl,
    auth,
  });
}
