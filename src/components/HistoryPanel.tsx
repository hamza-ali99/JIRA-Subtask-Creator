'use client';

import { useState, useEffect } from 'react';
import { HistoryEntry, JiraSettings } from '@/lib/types';

interface Props {
  settings: JiraSettings;
}

export default function HistoryPanel({ settings }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira-history');
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('jira-history');
  };

  // Build JIRA browse URL dynamically from settings
  const getIssueUrl = (issueKey: string) => {
    const baseUrl = settings.jiraUrl?.replace(/\/$/, '') || 'https://your-company.atlassian.net';
    return `${baseUrl}/browse/${issueKey}`;
  };

  if (history.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <p className="text-gray-500 text-sm text-center py-8">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <button
          onClick={clearHistory}
          className="text-sm text-red-600 hover:text-red-700"
        >
          Clear
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  entry.success ? 'bg-green-500' : entry.subtaskCount > 0 ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                <div className="text-left">
                  <p className="font-medium text-gray-900 text-sm">
                    {entry.storyKey ? (
                      <a
                        href={getIssueUrl(entry.storyKey)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.storyKey}
                      </a>
                    ) : entry.subtaskCount > 0 ? (
                      'Subtasks created'
                    ) : (
                      <span className="text-red-600">Creation failed</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(entry.timestamp).toLocaleString()} · 
                    {entry.subtaskCount > 0 && <span className="text-green-600"> {entry.subtaskCount} created</span>}
                    {entry.failedCount && entry.failedCount > 0 && <span className="text-red-600"> {entry.failedCount} failed</span>}
                    {entry.subtaskCount === 0 && (!entry.failedCount || entry.failedCount === 0) && ' 0 subtasks'}
                  </p>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  expandedId === entry.id ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedId === entry.id && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white">
                {entry.subtaskKeys && entry.subtaskKeys.length > 0 && (
                  <>
                    <p className="text-xs font-medium text-gray-500 mb-2">Created Subtasks:</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {entry.subtaskKeys.map((key) => (
                        <a
                          key={key}
                          href={getIssueUrl(key)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                        >
                          {key}
                        </a>
                      ))}
                    </div>
                  </>
                )}
                {entry.error && (
                  <p className="text-xs text-red-600 mt-1">Error: {entry.error}</p>
                )}
                {!entry.subtaskKeys?.length && !entry.error && (
                  <p className="text-xs text-gray-500">No details available</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
