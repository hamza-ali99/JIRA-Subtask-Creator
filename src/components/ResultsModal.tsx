'use client';

import { CreationResult, JiraSettings } from '@/lib/types';

interface Props {
  result: CreationResult;
  settings: JiraSettings;
  onClose: () => void;
}

export default function ResultsModal({ result, settings, onClose }: Props) {
  // Build JIRA browse URL dynamically from settings
  const getIssueUrl = (issueKey: string) => {
    const baseUrl = settings.jiraUrl?.replace(/\/$/, '') || 'https://your-company.atlassian.net';
    return `${baseUrl}/browse/${issueKey}`;
  };

  // Calculate actual success - need at least one successful subtask or a story created
  const successCount = result.subtasks?.filter(s => s.success !== false).length || 0;
  const failCount = result.subtasks?.filter(s => s.success === false).length || 0;
  const hasAnySuccess = successCount > 0 || result.story;
  const allFailed = failCount > 0 && successCount === 0 && !result.story;
  const actualSuccess = result.success && !allFailed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          actualSuccess ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'
        }`}>
          <div className="flex items-center gap-3">
            {actualSuccess ? (
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <div>
              <h2 className={`text-lg font-semibold ${actualSuccess ? 'text-green-900' : 'text-red-900'}`}>
                {allFailed ? 'All Issues Failed' : actualSuccess ? 'Issues Created Successfully!' : 'Creation Failed'}
              </h2>
              {result.story && (
                <p className="text-sm text-gray-600">
                  Story:{' '}
                  <a
                    href={getIssueUrl(result.story.key)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {result.story.key}
                  </a>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {result.error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{result.error}</p>
            </div>
          ) : (
            <>
              {result.subtasks && result.subtasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Subtasks ({result.subtasks.filter(s => s.success !== false).length} created
                    {result.subtasks.filter(s => s.success === false).length > 0 && 
                      `, ${result.subtasks.filter(s => s.success === false).length} failed`})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.subtasks.map((subtask) => (
                      <div
                        key={subtask.id || subtask.key}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          subtask.success === false ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          {subtask.key ? (
                            <a
                              href={getIssueUrl(subtask.key)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium text-sm"
                            >
                              {subtask.key}
                            </a>
                          ) : (
                            <span className="text-red-600 font-medium text-sm">Failed</span>
                          )}
                          <p className={`text-sm truncate ${subtask.success === false ? 'text-red-700' : 'text-gray-600'}`}>
                            {subtask.summary}
                          </p>
                          {subtask.error && (
                            <p className="text-xs text-red-500 mt-1">{subtask.error}</p>
                          )}
                        </div>
                        {subtask.key && (
                          <a
                            href={getIssueUrl(subtask.key)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          {result.story && (
            <a
              href={getIssueUrl(result.story.key)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Open Story in JIRA
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
