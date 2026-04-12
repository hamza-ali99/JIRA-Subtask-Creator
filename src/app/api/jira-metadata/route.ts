import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-api-client';

interface MetadataRequest {
  // Auth - supports both methods
  cookies?: string;
  email?: string;
  apiToken?: string;
  
  jiraUrl: string;
  type: 'projects' | 'issueTypes' | 'sprints' | 'users' | 'components' | 'versions' | 'priorities' | 'boards' | 'epics' | 'stories' | 'fields';
  projectKey?: string;
  boardId?: string;
  epicKey?: string;
  searchQuery?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: MetadataRequest = await request.json();
    const { cookies, email, apiToken, jiraUrl, type, projectKey, boardId, epicKey, searchQuery } = body;

    // Check authentication
    const hasApiToken = email && apiToken;
    const hasCookies = !!cookies;

    if (!hasApiToken && !hasCookies) {
      return NextResponse.json(
        { error: 'Authentication required (email+apiToken or cookies)' },
        { status: 400 }
      );
    }

    if (!jiraUrl) {
      return NextResponse.json(
        { error: 'Missing jiraUrl' },
        { status: 400 }
      );
    }

    // Create client based on available auth
    const client = createJiraClient({
      baseUrl: jiraUrl,
      email,
      apiToken,
      cookies,
    });

    let data: unknown;

    switch (type) {
      case 'projects':
        data = await client.getProjects();
        break;

      case 'issueTypes':
        if (projectKey) {
          data = await client.getIssueTypesForProject(projectKey);
        } else {
          data = await client.getIssueTypes();
        }
        break;

      case 'priorities':
        data = await client.getPriorities();
        break;

      case 'boards':
        // If searchQuery is 'all', fetch all boards without project filter
        const boardProjectFilter = searchQuery === 'all' ? undefined : projectKey;
        data = await client.getBoards(boardProjectFilter);
        break;

      case 'sprints':
        if (!boardId) {
          return NextResponse.json(
            { error: 'boardId required for sprints' },
            { status: 400 }
          );
        }
        data = await client.getSprints(parseInt(boardId));
        break;

      case 'users':
        data = await client.searchUsers(searchQuery || '');
        break;

      case 'epics':
        if (!projectKey && !boardId && !searchQuery) {
          return NextResponse.json(
            { error: 'projectKey, boardId, or searchQuery required for epics' },
            { status: 400 }
          );
        }
        
        // If searchQuery provided, search for specific epic(s)
        if (searchQuery) {
          data = await client.searchEpics(searchQuery, projectKey);
        } else {
          // Fetch all epics for project
          data = await client.getEpics(projectKey!, boardId ? parseInt(boardId) : undefined);
        }
        break;

      case 'stories':
        if (!projectKey) {
          return NextResponse.json(
            { error: 'projectKey required for stories' },
            { status: 400 }
          );
        }
        data = await client.getStoriesForProject(projectKey, epicKey);
        break;

      case 'fields':
        data = await client.getFields();
        break;

      default:
        return NextResponse.json(
          { error: `Unknown metadata type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}
