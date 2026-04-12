// JIRA Configuration
// All values are examples/placeholders - configure via the Settings UI or environment variables

export interface JiraConfig {
  baseUrl: string;
  projectId: string;
  storyTypeId: string;
  subtaskTypeId: string;
  epicId: string;
  sprintId: number;
  assigneeId: string;
  priorityId: string;
  componentId: string;
  fixVersionId: string;
  transitionId: string;
  customFields: Record<string, string | number>;
}

// Default config with placeholder values
// Users should configure their own values in Settings
export const defaultConfig: JiraConfig = {
  baseUrl: 'https://your-company.atlassian.net',
  projectId: '',
  storyTypeId: '10001',
  subtaskTypeId: '10003',
  epicId: '',
  sprintId: 0,
  assigneeId: '',
  priorityId: '3',
  componentId: '',
  fixVersionId: '',
  transitionId: '',
  customFields: {},
};

// Settings format used by the web UI
import { JiraSettings } from './types';

export const DEFAULT_SETTINGS: JiraSettings = {
  jiraUrl: 'https://your-company.atlassian.net',
  projectId: '',
  projectKey: '',
  storyTypeId: '10001',
  subtaskTypeId: '10003',
  epicId: '',
  sprintId: '',
  boardId: '',
  assigneeId: '',
  assigneeName: '',
  priorityId: '3',
  transitionId: '',
  componentId: '',
  epicLinkField: '',
  sprintField: '',
  customFields: {},
};

// Auth settings (stored separately for security)
export interface AuthSettings {
  authMethod: 'api-token' | 'cookie';
  // API Token auth
  email?: string;
  apiToken?: string;
  // Cookie auth (legacy)
  cookies?: string;
}

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  authMethod: 'api-token',
  email: '',
  apiToken: '',
  cookies: '',
};

// Get settings from environment variables (for server-side use)
export function getEnvConfig(): { baseUrl?: string; email?: string; apiToken?: string; projectKey?: string } {
  return {
    baseUrl: process.env.JIRA_BASE_URL,
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: process.env.JIRA_PROJECT_KEY,
  };
}
