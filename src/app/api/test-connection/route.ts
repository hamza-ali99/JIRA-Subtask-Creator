import { NextRequest, NextResponse } from 'next/server';
import { JiraClient } from '@/lib/jira-client';
import { createJiraClient } from '@/lib/jira-api-client';

interface ConnectionRequest {
  // Auth - supports both methods
  cookies?: string;
  email?: string;
  apiToken?: string;
  
  jiraUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConnectionRequest = await request.json();
    const { cookies, email, apiToken, jiraUrl } = body;

    // Check authentication
    const hasApiToken = email && apiToken;
    const hasCookies = !!cookies;

    if (!hasApiToken && !hasCookies) {
      return NextResponse.json({ error: 'Authentication required (email+apiToken or cookies)' }, { status: 400 });
    }

    if (!jiraUrl) {
      return NextResponse.json({ error: 'JIRA URL is required' }, { status: 400 });
    }

    // Use new client if we have API token
    if (hasApiToken) {
      const client = createJiraClient({
        baseUrl: jiraUrl,
        email,
        apiToken,
      });
      
      const user = await client.testConnection();

      return NextResponse.json({
        success: true,
        authMethod: 'api-token',
        user: {
          displayName: user.displayName,
          email: user.emailAddress,
          accountId: user.accountId,
        },
      });
    } else {
      // Fall back to legacy cookie-based client
      const client = new JiraClient(cookies!, { jiraUrl });
      const user = await client.testConnection();

      return NextResponse.json({
        success: true,
        authMethod: 'cookie',
        user: {
          displayName: user.displayName,
          email: user.emailAddress,
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
