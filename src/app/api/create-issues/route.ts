import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';
import { createJiraClient } from '@/lib/jira-api-client';

interface TestCase {
  id: string;
  title: string;
  description?: string;
}

interface Settings {
  jiraUrl?: string;
  assigneeId?: string;
  epicId?: string;
  sprintId?: string;
  projectId?: string;
  projectKey?: string;
  storyTypeId?: string;
  subtaskTypeId?: string;
  priorityId?: string;
  componentId?: string;
  componentName?: string;
  fixVersionId?: string;
  transitionId?: string;
  customFields?: Record<string, string | number>;
  // Curl-based templates
  storyTemplate?: {
    fields: Record<string, unknown>;
    extra?: Record<string, unknown>;
    queryParams?: Record<string, string>;
  };
  subtaskTemplate?: {
    fields: Record<string, unknown>;
    extra?: Record<string, unknown>;
    queryParams?: Record<string, string>;
  };
}

interface CreateRequest {
  // Auth - supports both methods
  cookies?: string;
  email?: string;
  apiToken?: string;
  
  mode: 'subtasks-only' | 'story-and-subtasks';
  parentId?: string;
  storyTitle?: string;
  testCases: TestCase[];
  settings?: Settings;
  preview?: boolean; // If true, return payloads without creating
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateRequest = await request.json();
    const { cookies, email, apiToken, mode, parentId, storyTitle, testCases, settings, preview } = body;

    // Check authentication
    const hasApiToken = email && apiToken;
    const hasCookies = !!cookies;
    
    if (!hasApiToken && !hasCookies) {
      return NextResponse.json({ error: 'Authentication required (email+apiToken or cookies)' }, { status: 400 });
    }

    if (!testCases || testCases.length === 0) {
      return NextResponse.json({ error: 'Test cases are required' }, { status: 400 });
    }

    // SAFETY: If mode is subtasks-only, we MUST have a parentId and MUST NOT create a story
    if (mode === 'subtasks-only') {
      if (!parentId) {
        return NextResponse.json({ error: 'Parent ID is required for subtasks-only mode' }, { status: 400 });
      }
    }

    // =========================================================================
    // PREVIEW MODE - Generate payloads without creating anything
    // =========================================================================
    if (preview) {
      const previewPayloads: {
        story?: Record<string, unknown>;
        subtasks: Record<string, unknown>[];
        summary: {
          mode: string;
          jiraUrl: string;
          projectKey: string;
          parentId: string;
          subtaskCount: number;
          authMethod: string;
        };
      } = {
        subtasks: [],
        summary: {
          mode,
          jiraUrl: settings?.jiraUrl || 'Not configured',
          projectKey: settings?.projectKey || 'Not configured',
          parentId: parentId || '(will be created)',
          subtaskCount: testCases.length,
          authMethod: hasApiToken ? 'API Token' : 'Cookies',
        },
      };

      // Generate story payload if applicable
      if (mode === 'story-and-subtasks') {
        if (settings?.storyTemplate?.fields) {
          previewPayloads.story = {
            ...settings.storyTemplate.fields,
            summary: storyTitle,
          };
        } else {
          previewPayloads.story = {
            fields: {
              project: { key: settings?.projectKey },
              issuetype: settings?.storyTypeId ? { id: settings.storyTypeId } : { name: 'Story' },
              summary: storyTitle,
              ...(settings?.assigneeId && { assignee: { id: settings.assigneeId } }),
              ...(settings?.priorityId && { priority: { id: settings.priorityId } }),
              ...(settings?.epicId && { parent: { key: settings.epicId } }),
            },
          };
        }
      }

      // Generate subtask payloads (show first 3 as sample)
      const sampleCases = testCases.slice(0, 3);
      for (const tc of sampleCases) {
        const subtaskPayload: Record<string, unknown> = {};
        const description = tc.description || tc.title || 'Test case subtask';
        
        if (settings?.subtaskTemplate?.fields) {
          Object.assign(subtaskPayload, {
            ...settings.subtaskTemplate.fields,
            summary: `${tc.id}: ${tc.title}`,
            description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
            parent: { key: parentId || '(story key)' },
          });
        } else {
          subtaskPayload.fields = {
            project: { key: settings?.projectKey },
            issuetype: settings?.subtaskTypeId ? { id: settings.subtaskTypeId } : { name: 'Sub-task' },
            summary: `${tc.id}: ${tc.title}`,
            description: { type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] },
            parent: { key: parentId || '(story key)' },
            ...(settings?.assigneeId && { assignee: { id: settings.assigneeId } }),
            ...(settings?.priorityId && { priority: { id: settings.priorityId } }),
            ...(settings?.customFields && settings.customFields),
          };
        }
        
        previewPayloads.subtasks.push(subtaskPayload);
      }

      if (testCases.length > 3) {
        previewPayloads.subtasks.push({
          _note: `... and ${testCases.length - 3} more subtasks with same structure`,
        });
      }

      return NextResponse.json({
        preview: true,
        payloads: previewPayloads,
      });
    }
    // =========================================================================
    // END PREVIEW MODE
    // =========================================================================

    const results: {
      story?: { id: string; key: string };
      subtasks: { id: string; key: string; summary: string; success: boolean; error?: string }[];
    } = {
      subtasks: [],
    };

    let targetParentId = parentId;

    // Use new API client if we have API token, otherwise fall back to legacy client
    if (hasApiToken && settings?.jiraUrl && settings?.projectKey) {
      const client = createJiraClient({
        baseUrl: settings.jiraUrl,
        email,
        apiToken,
      });

      // Create story ONLY if mode is EXPLICITLY 'story-and-subtasks'
      if (mode === 'story-and-subtasks') {
        if (!storyTitle) {
          return NextResponse.json({ error: 'Story title is required' }, { status: 400 });
        }

        // Use template if available, otherwise use standard fields
        let story;
        if (settings.storyTemplate?.fields) {
          story = await client.createIssueFromTemplate(
            {
              fields: settings.storyTemplate.fields as Record<string, unknown>,
              extra: settings.storyTemplate.extra as Record<string, unknown>,
              queryParams: settings.storyTemplate.queryParams,
            },
            { summary: storyTitle }
          );
        } else {
          story = await client.createIssue({
            projectKey: settings.projectKey,
            issueType: settings.storyTypeId ? { id: settings.storyTypeId } : { name: 'Story' },
            summary: storyTitle,
            assigneeId: settings.assigneeId,
            priorityId: settings.priorityId,
          });
        }
        results.story = { id: story.id, key: story.key };
        targetParentId = story.key; // Use key for parent reference
      }

      if (!targetParentId) {
        return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 });
      }

      // Create subtasks using new client
      for (const tc of testCases) {
        try {
          let subtask;
          
          // Build description - use test case description or fall back to title
          const description = tc.description || tc.title || 'Test case subtask';
          
          // Use template if available, otherwise use standard fields
          if (settings.subtaskTemplate?.fields) {
            subtask = await client.createSubtaskFromTemplate(
              {
                fields: settings.subtaskTemplate.fields as Record<string, unknown>,
                extra: settings.subtaskTemplate.extra as Record<string, unknown>,
                queryParams: settings.subtaskTemplate.queryParams,
              },
              targetParentId,
              `${tc.id}: ${tc.title}`,
              description
            );
          } else {
            subtask = await client.createSubtask(
              targetParentId,
              `${tc.id}: ${tc.title}`,
              settings.projectKey,
              settings.subtaskTypeId || '',
              {
                description,
                assigneeId: settings.assigneeId,
                priorityId: settings.priorityId,
                customFields: settings.customFields as Record<string, unknown>,
              }
            );
          }
          
          results.subtasks.push({
            id: tc.id,
            key: subtask.key,
            summary: `${tc.id}: ${tc.title}`,
            success: true,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.subtasks.push({
            id: tc.id,
            key: '',
            summary: `${tc.id}: ${tc.title}`,
            success: false,
            error: message,
          });
        }
      }
    } else {
      // Fall back to legacy cookie-based client
      const client = new JiraClient(cookies!, settings);

      // Create story ONLY if mode is EXPLICITLY 'story-and-subtasks'
      if (mode === 'story-and-subtasks') {
        if (!storyTitle) {
          return NextResponse.json({ error: 'Story title is required' }, { status: 400 });
        }

        const story = await client.createStory({ summary: storyTitle });
        results.story = { id: story.id, key: story.key };
        targetParentId = story.id;
      }

      if (!targetParentId) {
        return NextResponse.json({ error: 'Parent ID is required' }, { status: 400 });
      }

      // Create subtasks using legacy client
      for (const tc of testCases) {
        try {
          const subtask = await client.createSubtask({
            parentId: targetParentId,
            tcId: tc.id,
            description: tc.title,
          });
          results.subtasks.push({
            id: tc.id,
            key: subtask.key,
            summary: `${tc.id}: ${tc.title}`,
            success: true,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          results.subtasks.push({
            id: tc.id,
            key: '',
            summary: `${tc.id}: ${tc.title}`,
            success: false,
            error: message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
