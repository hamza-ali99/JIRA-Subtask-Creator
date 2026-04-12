import { NextRequest, NextResponse } from 'next/server';
import { createJiraClient } from '@/lib/jira-api-client';

// =============================================================================
// GET: Fetch Issue Hierarchy (Epics → Stories → Subtasks)
// =============================================================================

interface HierarchyRequest {
  // Connection
  baseUrl: string;
  email?: string;
  apiToken?: string;
  cookies?: string;
  
  // Query
  projectKey: string;
  epicKey?: string;       // Optional: get only hierarchy under specific epic
  includeSubtasks?: boolean;  // Default: true
  maxDepth?: number;      // How deep to fetch (1=epics, 2=+stories, 3=+subtasks)
}

export async function POST(request: NextRequest) {
  try {
    const body: HierarchyRequest = await request.json();
    const { baseUrl, email, apiToken, cookies, projectKey, epicKey, includeSubtasks = true, maxDepth = 3 } = body;

    // Validate required fields
    if (!baseUrl) {
      return NextResponse.json({ error: 'baseUrl is required' }, { status: 400 });
    }
    if (!projectKey) {
      return NextResponse.json({ error: 'projectKey is required' }, { status: 400 });
    }
    if (!email && !apiToken && !cookies) {
      return NextResponse.json({ error: 'Authentication required (email+apiToken or cookies)' }, { status: 400 });
    }

    // Create client
    const client = createJiraClient({ baseUrl, email, apiToken, cookies });

    let result;

    if (epicKey) {
      // Fetch hierarchy for a specific epic
      const stories = await client.getStoriesForEpic(epicKey);
      
      if (includeSubtasks && maxDepth >= 3) {
        // Fetch subtasks for each story
        const storiesWithSubtasks = await Promise.all(
          stories.map(async (story) => {
            const subtasks = await client.getSubtasksForStory(story.key);
            return { ...story, subtasks };
          })
        );
        result = { epicKey, stories: storiesWithSubtasks };
      } else {
        result = { epicKey, stories };
      }
    } else {
      // Fetch full project hierarchy
      if (maxDepth === 1) {
        // Just epics
        const epics = await client.getEpics(projectKey);
        result = { epics, orphanStories: [] };
      } else if (maxDepth === 2) {
        // Epics with stories (no subtasks)
        const epics = await client.getEpics(projectKey);
        const epicsWithStories = await Promise.all(
          epics.map(async (epic) => {
            const stories = await client.getStoriesForEpic(epic.key);
            return { ...epic, stories };
          })
        );
        result = { epics: epicsWithStories, orphanStories: [] };
      } else {
        // Full hierarchy
        result = await client.getFullHierarchy(projectKey);
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Hierarchy fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hierarchy' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET: Simple query parameter version for quick access
// =============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const baseUrl = process.env.JIRA_BASE_URL || searchParams.get('baseUrl');
  const email = process.env.JIRA_EMAIL || searchParams.get('email');
  const apiToken = process.env.JIRA_API_TOKEN || searchParams.get('apiToken');
  const projectKey = process.env.JIRA_PROJECT_KEY || searchParams.get('projectKey');
  const epicKey = searchParams.get('epicKey');

  if (!baseUrl || !projectKey) {
    return NextResponse.json(
      { error: 'baseUrl and projectKey required (via env or query params)' },
      { status: 400 }
    );
  }

  if (!email || !apiToken) {
    return NextResponse.json(
      { error: 'Authentication required (JIRA_EMAIL + JIRA_API_TOKEN env vars or query params)' },
      { status: 400 }
    );
  }

  try {
    const client = createJiraClient({ baseUrl, email, apiToken });
    
    let result;
    if (epicKey) {
      const stories = await client.getStoriesForEpic(epicKey);
      result = { epicKey, stories };
    } else {
      result = await client.getFullHierarchy(projectKey);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hierarchy' },
      { status: 500 }
    );
  }
}
