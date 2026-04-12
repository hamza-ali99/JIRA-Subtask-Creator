'use client';

import { useState, useEffect } from 'react';
import { Epic, Story, Subtask } from '@/lib/jira-types';

interface HierarchyBrowserProps {
  jiraUrl: string;
  projectKey: string;
  authMethod: 'api-token' | 'cookie';
  email?: string;
  apiToken?: string;
  cookies?: string;
  onSelectStory?: (story: Story) => void;
}

interface LoadingState {
  epics: boolean;
  stories: Record<string, boolean>;
  subtasks: Record<string, boolean>;
}

export default function HierarchyBrowser({
  jiraUrl,
  projectKey,
  authMethod,
  email,
  apiToken,
  cookies,
  onSelectStory,
}: HierarchyBrowserProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [expandedEpics, setExpandedEpics] = useState<Set<string>>(new Set());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<LoadingState>({ epics: false, stories: {}, subtasks: {} });
  const [error, setError] = useState<string | null>(null);

  // Fetch epics on mount
  useEffect(() => {
    if (projectKey && jiraUrl) {
      fetchEpics();
    }
  }, [projectKey, jiraUrl]);

  const getAuthPayload = () => {
    if (authMethod === 'api-token') {
      return { email, apiToken };
    }
    return { cookies };
  };

  const fetchEpics = async () => {
    setLoading(prev => ({ ...prev, epics: true }));
    setError(null);

    try {
      const response = await fetch('/api/jira-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...getAuthPayload(),
          jiraUrl,
          type: 'epics',
          projectKey,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setEpics(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch epics');
    } finally {
      setLoading(prev => ({ ...prev, epics: false }));
    }
  };

  const fetchStoriesForEpic = async (epicKey: string) => {
    setLoading(prev => ({ ...prev, stories: { ...prev.stories, [epicKey]: true } }));

    try {
      const response = await fetch('/api/hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...getAuthPayload(),
          baseUrl: jiraUrl,
          projectKey,
          epicKey,
          includeSubtasks: false,
          maxDepth: 2,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Update epic with stories
      setEpics(prev =>
        prev.map(epic =>
          epic.key === epicKey ? { ...epic, stories: data.data?.stories || [] } : epic
        )
      );
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    } finally {
      setLoading(prev => ({ ...prev, stories: { ...prev.stories, [epicKey]: false } }));
    }
  };

  const fetchSubtasksForStory = async (storyKey: string, epicKey: string) => {
    setLoading(prev => ({ ...prev, subtasks: { ...prev.subtasks, [storyKey]: true } }));

    try {
      const response = await fetch('/api/jira-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...getAuthPayload(),
          jiraUrl,
          type: 'stories',
          projectKey,
          epicKey: storyKey, // Using epicKey param to get subtasks of this story
        }),
      });

      // For now, we'll fetch via search
      // This is a simplified approach - in production you'd want a dedicated subtasks endpoint

    } catch (err) {
      console.error('Failed to fetch subtasks:', err);
    } finally {
      setLoading(prev => ({ ...prev, subtasks: { ...prev.subtasks, [storyKey]: false } }));
    }
  };

  const toggleEpic = (epicKey: string) => {
    const isExpanding = !expandedEpics.has(epicKey);
    
    setExpandedEpics(prev => {
      const next = new Set(prev);
      if (isExpanding) {
        next.add(epicKey);
      } else {
        next.delete(epicKey);
      }
      return next;
    });

    // Fetch stories if expanding and not already loaded
    if (isExpanding) {
      const epic = epics.find(e => e.key === epicKey);
      if (!epic?.stories) {
        fetchStoriesForEpic(epicKey);
      }
    }
  };

  const toggleStory = (storyKey: string) => {
    setExpandedStories(prev => {
      const next = new Set(prev);
      if (next.has(storyKey)) {
        next.delete(storyKey);
      } else {
        next.add(storyKey);
      }
      return next;
    });
  };

  const handleSelectStory = (story: Story) => {
    if (onSelectStory) {
      onSelectStory(story);
    }
  };

  if (loading.epics && epics.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
        <p>Loading hierarchy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchEpics}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (epics.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        <p>No epics found in {projectKey}</p>
        <button
          onClick={fetchEpics}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Project Hierarchy</h3>
        <button
          onClick={fetchEpics}
          disabled={loading.epics}
          className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {loading.epics ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {epics.map(epic => (
        <div key={epic.id} className="border border-gray-200 rounded-lg overflow-hidden">
          {/* Epic Header */}
          <div
            className="flex items-center gap-2 p-3 bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
            onClick={() => toggleEpic(epic.key)}
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${expandedEpics.has(epic.key) ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-200 text-purple-800">
              Epic
            </span>
            <span className="font-mono text-xs text-purple-600">{epic.key}</span>
            <span className="text-sm text-gray-700 truncate flex-1">{epic.name || epic.summary || epic.fields?.summary || 'Untitled Epic'}</span>
          </div>

          {/* Stories under Epic */}
          {expandedEpics.has(epic.key) && (
            <div className="border-t border-gray-200">
              {loading.stories[epic.key] ? (
                <div className="p-3 pl-8 text-sm text-gray-500">Loading stories...</div>
              ) : epic.stories && epic.stories.length > 0 ? (
                epic.stories.map(story => (
                  <div key={story.id}>
                    {/* Story Row */}
                    <div
                      className="flex items-center gap-2 p-2 pl-8 bg-green-50 hover:bg-green-100 cursor-pointer transition-colors border-b border-gray-100"
                      onClick={() => handleSelectStory(story)}
                    >
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-200 text-green-800">
                        Story
                      </span>
                      <span className="font-mono text-xs text-green-600">{story.key}</span>
                      <span className="text-sm text-gray-700 truncate flex-1">{story.fields.summary}</span>
                      
                      {/* Subtask count if available */}
                      {story.fields.subtasks && story.fields.subtasks.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {story.fields.subtasks.length} subtasks
                        </span>
                      )}
                      
                      {/* Select button */}
                      {onSelectStory && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectStory(story);
                          }}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Select
                        </button>
                      )}
                    </div>

                    {/* Subtasks if expanded */}
                    {expandedStories.has(story.key) && story.subtasks && (
                      <div className="bg-gray-50">
                        {story.subtasks.map(subtask => (
                          <div
                            key={subtask.id}
                            className="flex items-center gap-2 p-2 pl-14 hover:bg-gray-100 transition-colors border-b border-gray-100"
                          >
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                              Sub-task
                            </span>
                            <span className="font-mono text-xs text-gray-500">{subtask.key}</span>
                            <span className="text-sm text-gray-600 truncate">{subtask.fields.summary}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-3 pl-8 text-sm text-gray-500">No stories in this epic</div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
