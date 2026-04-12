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
  failedCount?: number;
  error?: string;
}

export interface CookieInfo {
  cookies: string;
  savedAt: Date;
  expiresAt?: Date;
  user?: {
    displayName: string;
    email: string;
  };
}

export interface JiraSettings {
  jiraUrl: string;
  projectId: string;
  projectKey: string;
  storyTypeId: string;
  subtaskTypeId: string;
  epicId: string;
  sprintId: string;
  boardId: string;
  assigneeId: string;
  assigneeName?: string;
  priorityId?: string;
  transitionId?: string;
  componentId?: string;
  epicLinkField?: string;
  sprintField?: string;
  customFields: Record<string, string | number | object>;
  // Curl-based templates for advanced configuration
  storyTemplate?: {
    fields: Record<string, unknown>;
    extra: Record<string, unknown>;
    queryParams?: Record<string, string>;
    curl?: string;
  };
  subtaskTemplate?: {
    fields: Record<string, unknown>;
    extra: Record<string, unknown>;
    queryParams?: Record<string, string>;
    curl?: string;
  };
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
