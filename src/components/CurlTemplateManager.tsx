'use client';

import { useState } from 'react';
import { parseCurl, generateParsedSummary, ParsedCurlResult } from '@/lib/curl-parser';

interface CurlTemplateManagerProps {
  onStoryTemplateChange: (parsed: ParsedCurlResult | null) => void;
  onSubtaskTemplateChange: (parsed: ParsedCurlResult | null) => void;
  initialStoryTemplate?: string;
  initialSubtaskTemplate?: string;
}

export default function CurlTemplateManager({
  onStoryTemplateChange,
  onSubtaskTemplateChange,
  initialStoryTemplate = '',
  initialSubtaskTemplate = '',
}: CurlTemplateManagerProps) {
  const [storyCurl, setStoryCurl] = useState(initialStoryTemplate);
  const [subtaskCurl, setSubtaskCurl] = useState(initialSubtaskTemplate);
  const [storyParsed, setStoryParsed] = useState<ParsedCurlResult | null>(null);
  const [subtaskParsed, setSubtaskParsed] = useState<ParsedCurlResult | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'story' | 'subtask'>('story');

  const handleParseStory = () => {
    setStoryError(null);
    try {
      if (!storyCurl.trim()) {
        setStoryParsed(null);
        onStoryTemplateChange(null);
        return;
      }
      const parsed = parseCurl(storyCurl);
      if (!parsed.jiraUrl && Object.keys(parsed.fields).length === 0) {
        setStoryError('Could not parse curl command. Make sure it includes a valid URL and -d JSON payload.');
        return;
      }
      setStoryParsed(parsed);
      onStoryTemplateChange(parsed);
    } catch (e) {
      setStoryError(e instanceof Error ? e.message : 'Failed to parse curl');
    }
  };

  const handleParseSubtask = () => {
    setSubtaskError(null);
    try {
      if (!subtaskCurl.trim()) {
        setSubtaskParsed(null);
        onSubtaskTemplateChange(null);
        return;
      }
      const parsed = parseCurl(subtaskCurl);
      if (!parsed.jiraUrl && Object.keys(parsed.fields).length === 0) {
        setSubtaskError('Could not parse curl command. Make sure it includes a valid URL and -d JSON payload.');
        return;
      }
      setSubtaskParsed(parsed);
      onSubtaskTemplateChange(parsed);
    } catch (e) {
      setSubtaskError(e instanceof Error ? e.message : 'Failed to parse curl');
    }
  };

  const renderParsedSummary = (parsed: ParsedCurlResult | null) => {
    if (!parsed) return null;
    const summary = generateParsedSummary(parsed);
    
    return (
      <div className="mt-3 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Detected Configuration:</h4>
        <div className="space-y-1">
          {summary.map((line, i) => (
            <p key={i} className={`text-xs ${line.startsWith('  -') ? 'text-gray-500 pl-2' : 'text-gray-700'}`}>
              {line}
            </p>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            ✓ Valid
          </span>
          <span className="text-xs text-gray-500">
            Fields will be used when creating issues
          </span>
        </div>
      </div>
    );
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Import from Curl</h2>
          <p className="text-xs text-gray-500 mt-1">
            Paste working curl commands to auto-configure custom fields
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab('story')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'story'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Story Template
          {storyParsed && <span className="ml-2 text-green-500">✓</span>}
        </button>
        <button
          onClick={() => setActiveTab('subtask')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'subtask'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Subtask Template
          {subtaskParsed && <span className="ml-2 text-green-500">✓</span>}
        </button>
      </div>

      {/* Story Tab */}
      {activeTab === 'story' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Story Creation Curl
          </label>
          <textarea
            value={storyCurl}
            onChange={(e) => setStoryCurl(e.target.value)}
            placeholder={`curl -X POST "https://your-jira.atlassian.net/rest/api/3/issue" \\
  -H "Content-Type: application/json" \\
  -d '{ "fields": { ... } }'`}
            className="w-full h-40 px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleParseStory}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Parse & Extract
            </button>
            {storyCurl && (
              <button
                onClick={() => {
                  setStoryCurl('');
                  setStoryParsed(null);
                  setStoryError(null);
                  onStoryTemplateChange(null);
                }}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {storyError && (
            <p className="mt-2 text-sm text-red-600">{storyError}</p>
          )}
          {renderParsedSummary(storyParsed)}
        </div>
      )}

      {/* Subtask Tab */}
      {activeTab === 'subtask' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subtask Creation Curl
          </label>
          <textarea
            value={subtaskCurl}
            onChange={(e) => setSubtaskCurl(e.target.value)}
            placeholder={`curl -X POST "https://your-jira.atlassian.net/rest/api/3/issue" \\
  -H "Content-Type: application/json" \\
  -d '{ "fields": { "parent": { "id": "..." }, ... } }'`}
            className="w-full h-40 px-3 py-2 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={handleParseSubtask}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Parse & Extract
            </button>
            {subtaskCurl && (
              <button
                onClick={() => {
                  setSubtaskCurl('');
                  setSubtaskParsed(null);
                  setSubtaskError(null);
                  onSubtaskTemplateChange(null);
                }}
                className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          {subtaskError && (
            <p className="mt-2 text-sm text-red-600">{subtaskError}</p>
          )}
          {renderParsedSummary(subtaskParsed)}
        </div>
      )}

      {/* Help Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <h4 className="text-sm font-medium text-blue-900 mb-2">How to get a curl command:</h4>
        <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
          <li>Open JIRA and create a Story/Subtask manually with all required fields</li>
          <li>Open Browser DevTools (F12) → Network tab</li>
          <li>Click &quot;Create&quot; to submit the issue</li>
          <li>Find the POST request to <code className="bg-blue-100 px-1 rounded">/rest/api/3/issue</code></li>
          <li>Right-click → Copy as cURL</li>
          <li>Paste here and click &quot;Parse &amp; Extract&quot;</li>
        </ol>
      </div>
    </section>
  );
}
