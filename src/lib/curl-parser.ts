// Curl Parser - Extract JIRA configuration from curl commands

export interface ParsedCurlResult {
  jiraUrl: string;
  headers: Record<string, string>;
  fields: Record<string, unknown>;
  customFields: Record<string, {
    value: unknown;
    type: 'number' | 'string' | 'select' | 'multiselect' | 'array' | 'object';
  }>;
  extra: {
    transition?: { id: string };
    watchers?: string[];
  };
  queryParams: Record<string, string>;
}

export interface JiraTemplate {
  name: string;
  jiraUrl: string;
  projectId: string;
  projectKey?: string;
  storyTypeId?: string;
  subtaskTypeId?: string;
  storyFields: Record<string, unknown>;
  subtaskFields: Record<string, unknown>;
  storyExtra: Record<string, unknown>;
  subtaskExtra: Record<string, unknown>;
}

const STANDARD_FIELDS = [
  'project',
  'issuetype',
  'parent',
  'summary',
  'description',
  'assignee',
  'reporter',
  'priority',
  'components',
  'fixVersions',
  'versions',
  'labels',
  'duedate',
  'timetracking',
  'security',
  'environment',
];

/**
 * Detect the type of a custom field value
 */
function detectValueType(value: unknown): 'number' | 'string' | 'select' | 'multiselect' | 'array' | 'object' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) {
    if (value.length > 0 && typeof value[0] === 'object' && ('id' in value[0] || 'value' in value[0])) {
      return 'multiselect';
    }
    return 'array';
  }
  if (typeof value === 'object' && value !== null) {
    if ('id' in value || 'value' in value) return 'select';
    return 'object';
  }
  return 'string';
}

/**
 * Parse a curl command and extract JIRA configuration
 */
export function parseCurl(curlCommand: string): ParsedCurlResult {
  const result: ParsedCurlResult = {
    jiraUrl: '',
    headers: {},
    fields: {},
    customFields: {},
    extra: {},
    queryParams: {},
  };

  // Normalize the curl command (handle line breaks)
  const normalized = curlCommand
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Extract URL
  const urlMatch = normalized.match(/curl\s+(?:-X\s+\w+\s+)?["']?(https?:\/\/[^\s"']+)["']?/i) ||
                   normalized.match(/["'](https?:\/\/[^\s"']+)["']/);
  
  if (urlMatch) {
    try {
      const fullUrl = new URL(urlMatch[1]);
      result.jiraUrl = fullUrl.origin;
      
      // Extract query params
      fullUrl.searchParams.forEach((value, key) => {
        result.queryParams[key] = value;
      });
    } catch {
      // URL parsing failed
    }
  }

  // Extract headers
  const headerRegex = /-H\s+["']([^:]+):\s*([^"']+)["']/gi;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(normalized)) !== null) {
    result.headers[headerMatch[1].trim()] = headerMatch[2].trim();
  }

  // Extract JSON payload from -d or --data flag
  // Handle both single quotes and double quotes, and escaped content
  let jsonPayload: string | null = null;
  
  // Try single-quoted payload first
  const singleQuoteMatch = normalized.match(/-d\s+'([\s\S]*?)'\s*(?:-|$|curl)/);
  if (singleQuoteMatch) {
    jsonPayload = singleQuoteMatch[1];
  }
  
  // Try double-quoted payload
  if (!jsonPayload) {
    const doubleQuoteMatch = normalized.match(/-d\s+"([\s\S]*?)"\s*(?:-|$|curl)/);
    if (doubleQuoteMatch) {
      jsonPayload = doubleQuoteMatch[1].replace(/\\"/g, '"');
    }
  }
  
  // Try without quotes (for simple payloads)
  if (!jsonPayload) {
    const noQuoteMatch = normalized.match(/-d\s+({[\s\S]*})/);
    if (noQuoteMatch) {
      jsonPayload = noQuoteMatch[1];
    }
  }

  // Also try --data-raw
  if (!jsonPayload) {
    const dataRawMatch = normalized.match(/--data-raw\s+['"]([\s\S]*?)['"]\s*(?:-|$)/);
    if (dataRawMatch) {
      jsonPayload = dataRawMatch[1];
    }
  }

  if (jsonPayload) {
    try {
      const payload = JSON.parse(jsonPayload);
      
      // Process fields
      if (payload.fields) {
        for (const [key, value] of Object.entries(payload.fields)) {
          if (STANDARD_FIELDS.includes(key)) {
            result.fields[key] = value;
          } else if (key.startsWith('customfield_')) {
            result.customFields[key] = {
              value,
              type: detectValueType(value),
            };
          } else {
            // Unknown field, treat as custom
            result.fields[key] = value;
          }
        }
      }
      
      // Extract extra items (outside fields)
      if (payload.transition) {
        result.extra.transition = payload.transition;
      }
      if (payload.watchers) {
        result.extra.watchers = payload.watchers;
      }
    } catch (e) {
      console.error('Failed to parse JSON payload:', e);
    }
  }

  return result;
}

/**
 * Extract settings from parsed curl result
 */
export function extractSettingsFromCurl(parsed: ParsedCurlResult): {
  jiraUrl: string;
  projectId: string;
  issueTypeId: string;
  parentId?: string;
  assigneeId?: string;
  priorityId?: string;
  componentIds?: string[];
  fixVersionIds?: string[];
  customFields: Record<string, unknown>;
} {
  const settings: ReturnType<typeof extractSettingsFromCurl> = {
    jiraUrl: parsed.jiraUrl,
    projectId: '',
    issueTypeId: '',
    customFields: {},
  };

  // Extract standard field IDs
  const project = parsed.fields.project as { id?: string; key?: string } | undefined;
  if (project?.id) settings.projectId = project.id;

  const issuetype = parsed.fields.issuetype as { id?: string } | undefined;
  if (issuetype?.id) settings.issueTypeId = issuetype.id;

  const parent = parsed.fields.parent as { id?: string; key?: string } | undefined;
  if (parent?.id) settings.parentId = parent.id;
  else if (parent?.key) settings.parentId = parent.key;

  const assignee = parsed.fields.assignee as { id?: string } | undefined;
  if (assignee?.id) settings.assigneeId = assignee.id;

  const priority = parsed.fields.priority as { id?: string } | undefined;
  if (priority?.id) settings.priorityId = priority.id;

  const components = parsed.fields.components as Array<{ id?: string }> | undefined;
  if (components && Array.isArray(components)) {
    settings.componentIds = components.map(c => c.id).filter((id): id is string => !!id);
  }

  const fixVersions = parsed.fields.fixVersions as Array<{ id?: string }> | undefined;
  if (fixVersions && Array.isArray(fixVersions)) {
    settings.fixVersionIds = fixVersions.map(v => v.id).filter((id): id is string => !!id);
  }

  // Build custom fields object with original values
  for (const [key, { value }] of Object.entries(parsed.customFields)) {
    settings.customFields[key] = value;
  }

  return settings;
}

/**
 * Merge parsed curl into existing settings
 */
export function mergeWithSettings(
  currentSettings: Record<string, unknown>,
  parsed: ParsedCurlResult,
  templateType: 'story' | 'subtask'
): Record<string, unknown> {
  const extracted = extractSettingsFromCurl(parsed);
  
  const merged = { ...currentSettings };
  
  // Update basic settings
  if (extracted.jiraUrl) merged.jiraUrl = extracted.jiraUrl;
  if (extracted.projectId) merged.projectId = extracted.projectId;
  if (extracted.assigneeId) merged.assigneeId = extracted.assigneeId;
  if (extracted.priorityId) merged.priorityId = extracted.priorityId;
  
  // Update type-specific settings
  if (templateType === 'story' && extracted.issueTypeId) {
    merged.storyTypeId = extracted.issueTypeId;
  } else if (templateType === 'subtask' && extracted.issueTypeId) {
    merged.subtaskTypeId = extracted.issueTypeId;
  }
  
  // Merge custom fields
  const existingCustomFields = (merged.customFields as Record<string, unknown>) || {};
  merged.customFields = {
    ...existingCustomFields,
    ...extracted.customFields,
  };
  
  // Store the full template for API calls
  if (templateType === 'story') {
    merged.storyTemplate = {
      fields: { ...parsed.fields, ...Object.fromEntries(
        Object.entries(parsed.customFields).map(([k, v]) => [k, v.value])
      )},
      extra: parsed.extra,
      queryParams: parsed.queryParams,
    };
  } else {
    merged.subtaskTemplate = {
      fields: { ...parsed.fields, ...Object.fromEntries(
        Object.entries(parsed.customFields).map(([k, v]) => [k, v.value])
      )},
      extra: parsed.extra,
      queryParams: parsed.queryParams,
    };
  }
  
  return merged;
}

/**
 * Generate a human-readable summary of parsed curl
 */
export function generateParsedSummary(parsed: ParsedCurlResult): string[] {
  const summary: string[] = [];
  
  if (parsed.jiraUrl) {
    summary.push(`JIRA URL: ${parsed.jiraUrl}`);
  }
  
  const project = parsed.fields.project as { id?: string } | undefined;
  if (project?.id) {
    summary.push(`Project ID: ${project.id}`);
  }
  
  const issuetype = parsed.fields.issuetype as { id?: string } | undefined;
  if (issuetype?.id) {
    summary.push(`Issue Type ID: ${issuetype.id}`);
  }
  
  const parent = parsed.fields.parent as { id?: string; key?: string } | undefined;
  if (parent?.id || parent?.key) {
    summary.push(`Parent: ${parent.id || parent.key}`);
  }
  
  const assignee = parsed.fields.assignee as { id?: string } | undefined;
  if (assignee?.id) {
    summary.push(`Assignee ID: ${assignee.id}`);
  }
  
  const priority = parsed.fields.priority as { id?: string } | undefined;
  if (priority?.id) {
    summary.push(`Priority ID: ${priority.id}`);
  }
  
  const components = parsed.fields.components as Array<{ id?: string; name?: string }> | undefined;
  if (components && components.length > 0) {
    summary.push(`Components: ${components.map(c => c.name || c.id).join(', ')}`);
  }
  
  const customFieldCount = Object.keys(parsed.customFields).length;
  if (customFieldCount > 0) {
    summary.push(`Custom Fields: ${customFieldCount} detected`);
    for (const [key, { type }] of Object.entries(parsed.customFields)) {
      summary.push(`  - ${key} (${type})`);
    }
  }
  
  if (parsed.extra.transition) {
    summary.push(`Transition ID: ${parsed.extra.transition.id}`);
  }
  
  if (parsed.extra.watchers && parsed.extra.watchers.length > 0) {
    summary.push(`Watchers: ${parsed.extra.watchers.length}`);
  }
  
  return summary;
}
