'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CsvDropZone from '@/components/CsvDropZone';
import TestCasePreview from '@/components/TestCasePreview';
import IssueForm from '@/components/IssueForm';
import HistoryPanel from '@/components/HistoryPanel';
import ResultsModal from '@/components/ResultsModal';
import SettingsDropdown from '@/components/SettingsDropdown';
import { TestCase, CookieInfo, JiraSettings, CreationResult, HistoryEntry } from '@/lib/types';
import { DEFAULT_SETTINGS, AuthSettings, DEFAULT_AUTH_SETTINGS } from '@/lib/config';

interface PreviewPayloads {
  summary?: Record<string, string | number>;
  story?: Record<string, unknown>;
  subtasks?: Record<string, unknown>[];
}

export default function Home() {
  const [cookieInfo, setCookieInfo] = useState<CookieInfo | null>(null);
  const [authSettings, setAuthSettings] = useState<AuthSettings>(DEFAULT_AUTH_SETTINGS);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [settings, setSettings] = useState<JiraSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreationResult | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [previewData, setPreviewData] = useState<PreviewPayloads | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load cookies, auth settings, and settings from storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load legacy cookies
      const savedCookies = localStorage.getItem('jira-cookies');
      if (savedCookies) {
        try {
          setCookieInfo(JSON.parse(savedCookies));
        } catch {
          // Ignore
        }
      }

      // Load new auth settings (from localStorage - persists across sessions)
      const savedAuth = localStorage.getItem('jira-auth-settings');
      if (savedAuth) {
        try {
          setAuthSettings({ ...DEFAULT_AUTH_SETTINGS, ...JSON.parse(savedAuth) });
        } catch {
          // Ignore
        }
      }

      // Load settings from localStorage
      const localSettings = localStorage.getItem('jira-settings-v2');
      if (localSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(localSettings) });
        } catch {
          // Ignore
        }
      }
      setSettingsLoaded(true);
    }
  }, []);

  const handleTestCasesLoaded = (newTestCases: TestCase[]) => {
    setTestCases(newTestCases);
  };

  const handleAddTestCase = (testCase: TestCase) => {
    setTestCases(prev => [...prev, testCase]);
  };

  const handleRemoveTestCase = (index: number) => {
    setTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearTestCases = () => {
    setTestCases([]);
  };

  const saveToHistory = (result: CreationResult, mode: 'subtasks-only' | 'story-and-subtasks') => {
    const successfulSubtasks = result.subtasks?.filter(s => s.success) || [];
    const failedSubtasks = result.subtasks?.filter(s => !s.success) || [];

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      success: result.success && failedSubtasks.length === 0,
      storyKey: result.story?.key,
      subtaskCount: successfulSubtasks.length,
      subtaskKeys: successfulSubtasks.map(s => s.key).filter((k): k is string => !!k),
      failedCount: failedSubtasks.length,
      error: result.error || (failedSubtasks.length > 0 ? `${failedSubtasks.length} subtask(s) failed` : undefined),
    };

    const existingHistory = localStorage.getItem('jira-history');
    let history: HistoryEntry[] = [];
    try {
      history = existingHistory ? JSON.parse(existingHistory) : [];
    } catch {
      // Ignore
    }

    history.unshift(entry);
    history = history.slice(0, 20); // Keep last 20 entries
    localStorage.setItem('jira-history', JSON.stringify(history));
  };

  const handleSubmit = async (mode: 'subtasks-only' | 'story-and-subtasks', storyTitle?: string, parentId?: string) => {
    // Check if we have any auth method available
    const hasApiToken = authSettings.authMethod === 'api-token' && authSettings.email && authSettings.apiToken;
    const hasCookies = cookieInfo?.cookies || authSettings.cookies;
    
    if (!hasApiToken && !hasCookies) {
      setResult({ success: false, error: 'Please configure authentication in Settings first' });
      return;
    }
    
    setIsLoading(true);
    setResult(null);

    try {
      // Build auth payload based on what's available
      const authPayload: Record<string, string | undefined> = {};
      if (hasApiToken) {
        authPayload.email = authSettings.email;
        authPayload.apiToken = authSettings.apiToken;
      } else {
        authPayload.cookies = cookieInfo?.cookies || authSettings.cookies;
      }

      const response = await fetch('/api/create-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authPayload,
          testCases,
          mode,
          storyTitle,
          parentId,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const failedResult = { success: false, error: data.error || 'Failed to create issues', subtasks: [] };
        setResult(failedResult);
        saveToHistory(failedResult, mode);
        setHistoryKey(k => k + 1);
      } else {
        const successResult = {
          success: true,
          story: data.results?.story,
          subtasks: data.results?.subtasks || [],
        };
        setResult(successResult);
        saveToHistory(successResult, mode);
        setHistoryKey(k => k + 1); // Trigger history panel refresh
        setTestCases([]);
      }
    } catch (err) {
      const errorResult = { success: false, error: err instanceof Error ? err.message : 'Unknown error', subtasks: [] };
      setResult(errorResult);
      saveToHistory(errorResult, mode);
      setHistoryKey(k => k + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = async (mode: 'subtasks-only' | 'story-and-subtasks', storyTitle?: string, parentId?: string) => {
    const hasApiToken = authSettings.authMethod === 'api-token' && authSettings.email && authSettings.apiToken;
    const hasCookies = cookieInfo?.cookies || authSettings.cookies;
    
    if (!hasApiToken && !hasCookies) {
      alert('Please configure authentication in Settings first');
      return;
    }

    try {
      const authPayload: Record<string, string | undefined> = {};
      if (hasApiToken) {
        authPayload.email = authSettings.email;
        authPayload.apiToken = authSettings.apiToken;
      } else {
        authPayload.cookies = cookieInfo?.cookies || authSettings.cookies;
      }

      const response = await fetch('/api/create-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authPayload,
          testCases,
          mode,
          storyTitle,
          parentId,
          settings,
          preview: true, // Request preview only
        }),
      });

      const data = await response.json();
      setPreviewData(data.payloads);
      setIsPreviewOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  };

  // Check if we have any auth available
  const hasAuth = (authSettings.authMethod === 'api-token' && authSettings.email && authSettings.apiToken) 
    || cookieInfo?.cookies 
    || authSettings.cookies;
  
  const isReady = hasAuth && testCases.length > 0 && settingsLoaded;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">JIRA Subtask Creator</h1>
              <p className="text-xs text-gray-500">Create stories and subtasks from test cases</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SettingsDropdown settings={settings} />
            <Link
              href="/settings"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Configure
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Settings warning */}
        {settingsLoaded && !settings.projectId && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-amber-800">Configuration Required</p>
              <p className="text-sm text-amber-700 mt-1">
                Please configure your JIRA settings before creating issues.
              </p>
              <Link
                href="/settings"
                className="inline-block mt-2 text-sm font-medium text-amber-700 underline hover:text-amber-900"
              >
                Go to Settings →
              </Link>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Authentication Status */}
            {hasAuth ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">Connected to JIRA</p>
                    <p className="text-xs text-green-600">
                      {authSettings.authMethod === 'api-token' 
                        ? `Authenticated as ${authSettings.email}` 
                        : 'Using browser cookies'}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                  >
                    Settings →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-amber-800">Authentication Required</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Please configure your JIRA connection in settings to start creating subtasks.
                    </p>
                    <Link
                      href="/settings"
                      className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Go to Settings
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <CsvDropZone
              onTestCasesLoaded={handleTestCasesLoaded}
              onAddTestCase={handleAddTestCase}
              disabled={!hasAuth}
            />

            {testCases.length > 0 && (
              <TestCasePreview
                testCases={testCases}
                onRemove={handleRemoveTestCase}
                onClear={handleClearTestCases}
              />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {testCases.length > 0 && (
              <IssueForm
                testCaseCount={testCases.length}
                onSubmit={handleSubmit}
                onPreview={handlePreview}
                isLoading={isLoading}
                disabled={!isReady}
              />
            )}

            <HistoryPanel key={historyKey} settings={settings} />
          </div>
        </div>
      </div>

      {/* Results Modal */}
      {result && (
        <ResultsModal
          result={result}
          settings={settings}
          onClose={() => setResult(null)}
        />
      )}

      {/* Preview Modal */}
      {isPreviewOpen && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-yellow-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Preview - What Will Be Created</h2>
                  <p className="text-sm text-yellow-700">Review the payloads before creating issues</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-2 hover:bg-yellow-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Summary */}
              {previewData?.summary && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Summary</h3>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(previewData.summary).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-blue-700 font-medium">{k}:</dt>
                        <dd className="text-blue-900">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Story Payload */}
              {previewData?.story && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    Story Payload
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(previewData.story, null, 2)}
                  </pre>
                </div>
              )}

              {/* Subtask Payloads */}
              {previewData?.subtasks && previewData.subtasks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Subtask Payloads (Sample)
                  </h3>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
                    {JSON.stringify(previewData.subtasks, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setIsPreviewOpen(false);
                  // Trigger actual creation - user needs to click Create button
                }}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Looks Good - Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
