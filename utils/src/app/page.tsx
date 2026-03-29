'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CookieManager from '@/components/CookieManager';
import CsvDropZone from '@/components/CsvDropZone';
import TestCasePreview from '@/components/TestCasePreview';
import IssueForm from '@/components/IssueForm';
import HistoryPanel from '@/components/HistoryPanel';
import ResultsModal from '@/components/ResultsModal';
import SettingsDropdown from '@/components/SettingsDropdown';
import { TestCase, CookieInfo, JiraSettings, CreationResult, HistoryEntry } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/config';

export default function Home() {
  const [cookieInfo, setCookieInfo] = useState<CookieInfo | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [settings, setSettings] = useState<JiraSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CreationResult | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load cookies and settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCookies = localStorage.getItem('jira-cookies');
      if (savedCookies) {
        try {
          setCookieInfo(JSON.parse(savedCookies));
        } catch {
          // Ignore
        }
      }

      const savedSettings = localStorage.getItem('jira-settings-v2');
      if (savedSettings) {
        try {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        } catch {
          // Ignore
        }
      }
      setSettingsLoaded(true);
    }
  }, []);

  // Save cookies to localStorage when changed
  const handleCookiesSaved = (info: CookieInfo) => {
    setCookieInfo(info);
    if (typeof window !== 'undefined') {
      if (info.cookies) {
        localStorage.setItem('jira-cookies', JSON.stringify(info));
      } else {
        localStorage.removeItem('jira-cookies');
      }
    }
  };

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
    if (!result.success) return;

    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      success: true,
      storyKey: result.story?.key,
      subtaskCount: result.subtasks?.length || 0,
      subtaskKeys: result.subtasks?.map(s => s.key),
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
    if (!cookieInfo?.cookies) return;
    
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/create-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookies: cookieInfo.cookies,
          testCases,
          mode,
          storyTitle,
          parentId,
          settings,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || 'Failed to create issues' });
      } else {
        setResult({
          success: true,
          story: data.results?.story,
          subtasks: data.results?.subtasks || [],
        });
        saveToHistory({ ...data, story: data.results?.story, subtasks: data.results?.subtasks }, mode);
        setTestCases([]);
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };

  const isReady = cookieInfo?.cookies && testCases.length > 0 && settingsLoaded;

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
            <CookieManager
              cookieInfo={cookieInfo}
              onCookiesSaved={handleCookiesSaved}
            />

            <CsvDropZone
              onTestCasesLoaded={handleTestCasesLoaded}
              onAddTestCase={handleAddTestCase}
              disabled={!cookieInfo?.cookies}
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
                isLoading={isLoading}
                disabled={!isReady}
              />
            )}

            <HistoryPanel settings={settings} />
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
    </main>
  );
}
