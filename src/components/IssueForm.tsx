'use client';

import { useState } from 'react';

interface Props {
  testCaseCount: number;
  onSubmit: (mode: 'subtasks-only' | 'story-and-subtasks', storyTitle?: string, parentId?: string) => void;
  onPreview?: (mode: 'subtasks-only' | 'story-and-subtasks', storyTitle?: string, parentId?: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function IssueForm({ testCaseCount, onSubmit, onPreview, isLoading, disabled }: Props) {
  const [mode, setMode] = useState<'subtasks-only' | 'story-and-subtasks'>('story-and-subtasks');
  const [storyTitle, setStoryTitle] = useState('');
  const [parentId, setParentId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'story-and-subtasks' && !storyTitle.trim()) {
      return;
    }
    if (mode === 'subtasks-only' && !parentId.trim()) {
      return;
    }

    onSubmit(
      mode,
      mode === 'story-and-subtasks' ? storyTitle.trim() : undefined,
      mode === 'subtasks-only' ? parentId.trim() : undefined
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">Create Issues</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Creation Mode</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('story-and-subtasks');
                setParentId(''); // Clear parent ID when switching to story mode
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                mode === 'story-and-subtasks'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-5 h-5 ${mode === 'story-and-subtasks' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className={`font-medium ${mode === 'story-and-subtasks' ? 'text-blue-900' : 'text-gray-700'}`}>
                  New Story + Subtasks
                </span>
              </div>
              <p className="text-xs text-gray-500">Create a new story and add test cases as subtasks</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('subtasks-only');
                setStoryTitle(''); // Clear story title when switching to subtasks-only mode
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                mode === 'subtasks-only'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className={`w-5 h-5 ${mode === 'subtasks-only' ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className={`font-medium ${mode === 'subtasks-only' ? 'text-blue-900' : 'text-gray-700'}`}>
                  Subtasks Only
                </span>
              </div>
              <p className="text-xs text-gray-500">Add test cases as subtasks to an existing story</p>
            </button>
          </div>
        </div>

        {mode === 'story-and-subtasks' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Story Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={storyTitle}
              onChange={(e) => setStoryTitle(e.target.value)}
              placeholder="Enter story title..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              The story will be created under the configured Epic
            </p>
          </div>
        )}

        {mode === 'subtasks-only' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parent Story <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              placeholder="PROJ-123 or 123456"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter the issue key (e.g. PROJ-123) or numeric ID
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            {mode === 'story-and-subtasks' && (
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                1 new Story will be created
              </li>
            )}
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              {testCaseCount} Sub-tasks will be created
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          {/* Preview Button */}
          {onPreview && (
            <button
              type="button"
              onClick={() => {
                onPreview(
                  mode,
                  mode === 'story-and-subtasks' ? storyTitle.trim() : undefined,
                  mode === 'subtasks-only' ? parentId.trim() : undefined
                );
              }}
              disabled={disabled || isLoading || 
                (mode === 'story-and-subtasks' && !storyTitle.trim()) ||
                (mode === 'subtasks-only' && !parentId.trim())
              }
              className="px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </button>
          )}

          {/* Create Button */}
          <button
            type="submit"
            disabled={disabled || isLoading || 
              (mode === 'story-and-subtasks' && !storyTitle.trim()) ||
              (mode === 'subtasks-only' && !parentId.trim())
            }
            className="flex-1 px-4 py-3 text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
          {isLoading ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Creating Issues...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create {mode === 'story-and-subtasks' ? 'Story & ' : ''}{testCaseCount} Subtasks
            </>
          )}
          </button>
        </div>
      </form>
    </div>
  );
}
