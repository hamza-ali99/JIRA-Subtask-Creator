// =============================================================================
// JIRA API Types - Generic implementation for any JIRA instance
// =============================================================================

// -----------------------------------------------------------------------------
// Authentication
// -----------------------------------------------------------------------------

export type AuthMethod = 'api-token' | 'cookie' | 'bearer';

export interface AuthConfig {
  method: AuthMethod;
  // For API Token auth
  email?: string;
  apiToken?: string;
  // For Cookie auth (legacy)
  cookies?: string;
  // For Bearer token auth
  bearerToken?: string;
}

export interface JiraConnectionConfig {
  baseUrl: string;
  auth: AuthConfig;
}

// -----------------------------------------------------------------------------
// Issue Hierarchy
// -----------------------------------------------------------------------------

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: unknown;
    status?: {
      id: string;
      name: string;
      statusCategory?: {
        key: string;
        name: string;
      };
    };
    issuetype?: {
      id: string;
      name: string;
      subtask: boolean;
    };
    priority?: {
      id: string;
      name: string;
    };
    assignee?: {
      accountId: string;
      displayName: string;
      emailAddress?: string;
    };
    parent?: {
      id: string;
      key: string;
      fields?: {
        summary: string;
        issuetype?: {
          id: string;
          name: string;
        };
      };
    };
    subtasks?: JiraIssue[];
    created?: string;
    updated?: string;
    [key: string]: unknown; // For custom fields
  };
}

export interface Epic extends JiraIssue {
  stories?: Story[];
  // Agile API fields (GET /rest/agile/1.0/board/{boardId}/epic)
  name?: string;
  summary?: string;
  done?: boolean;
  color?: {
    key: string;
  };
}

export interface Story extends JiraIssue {
  subtasks?: Subtask[];
  epicKey?: string;
}

export interface Subtask extends JiraIssue {
  parentKey?: string;
}

export interface IssueHierarchy {
  epics: Epic[];
  orphanStories: Story[]; // Stories not linked to any epic
}

// -----------------------------------------------------------------------------
// Search & Query
// -----------------------------------------------------------------------------

export interface JiraSearchResult {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
}

export interface JQLQuery {
  jql: string;
  fields?: string[];
  expand?: string[];
  maxResults?: number;
  startAt?: number;
}

// -----------------------------------------------------------------------------
// Create/Update Operations
// -----------------------------------------------------------------------------

export interface CreateIssueRequest {
  projectKey: string;
  issueType: string | { id: string } | { name: string };
  summary: string;
  description?: string;
  parentKey?: string; // For subtasks or stories under epics
  assigneeId?: string;
  priorityId?: string;
  labels?: string[];
  components?: string[];
  customFields?: Record<string, unknown>;
}

export interface BulkCreateRequest {
  issues: CreateIssueRequest[];
}

export interface CreateIssueResponse {
  id: string;
  key: string;
  self: string;
}

export interface BulkCreateResponse {
  issues: CreateIssueResponse[];
  errors: Array<{
    status: number;
    elementErrors?: {
      errors: Record<string, string>;
    };
    failedElementNumber?: number;
  }>;
}

// -----------------------------------------------------------------------------
// Metadata
// -----------------------------------------------------------------------------

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  style?: 'classic' | 'next-gen';
}

export interface JiraIssueType {
  id: string;
  name: string;
  description?: string;
  subtask: boolean;
  hierarchyLevel?: number;
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl?: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: string;
  location?: {
    projectId: number;
    projectKey: string;
    projectName: string;
  };
}

export interface JiraComponent {
  id: string;
  name: string;
  description?: string;
}

export interface JiraVersion {
  id: string;
  name: string;
  released: boolean;
  archived: boolean;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress?: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraField {
  id: string;
  key: string;
  name: string;
  custom: boolean;
  schema?: {
    type: string;
    items?: string;
    custom?: string;
    customId?: number;
  };
}

// -----------------------------------------------------------------------------
// Settings & Configuration
// -----------------------------------------------------------------------------

export interface JiraInstanceSettings {
  // Connection
  baseUrl: string;
  authMethod: AuthMethod;
  
  // Project context
  projectId?: string;
  projectKey?: string;
  
  // Issue type IDs (auto-discovered or manual)
  epicTypeId?: string;
  storyTypeId?: string;
  subtaskTypeId?: string;
  taskTypeId?: string;
  bugTypeId?: string;
  
  // Default values
  defaultAssigneeId?: string;
  defaultPriorityId?: string;
  defaultComponentId?: string;
  
  // Agile
  boardId?: string;
  sprintId?: string;
  
  // Custom field mappings (field name → field ID)
  fieldMappings?: Record<string, string>;
}

// -----------------------------------------------------------------------------
// API Response Wrappers
// -----------------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  values: T[];
  startAt: number;
  maxResults: number;
  total: number;
  isLast: boolean;
}

// -----------------------------------------------------------------------------
// UI State Types
// -----------------------------------------------------------------------------

export interface TestCase {
  id: string;
  title: string;
  priority?: string;
  status?: string;
  type?: string;
  description?: string;
}

export interface CreatedIssue {
  id: string;
  key?: string;
  title: string;
  success: boolean;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  success: boolean;
  storyKey?: string;
  subtaskCount: number;
  subtaskKeys?: string[];
}

export interface CreationResult {
  success: boolean;
  error?: string;
  story?: {
    id: string;
    key: string;
    summary?: string;
  };
  subtasks?: {
    id: string;
    key: string;
    summary: string;
    success?: boolean;
    error?: string;
  }[];
}
