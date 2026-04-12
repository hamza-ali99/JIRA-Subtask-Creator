'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { JiraSettings } from '@/lib/types';
import { DEFAULT_SETTINGS, AuthSettings, DEFAULT_AUTH_SETTINGS } from '@/lib/config';
import AuthManager from '@/components/AuthManager';
import HierarchyBrowser from '@/components/HierarchyBrowser';
import CurlTemplateManager from '@/components/CurlTemplateManager';
import { ParsedCurlResult, extractSettingsFromCurl } from '@/lib/curl-parser';

interface Project {
  id: string;
  key: string;
  name: string;
}

interface Sprint {
  id: number;
  name: string;
  state: string;
}

interface IssueType {
  id: string;
  name: string;
  subtask: boolean;
}

interface Epic {
  id: string | number;
  key?: string;
  name?: string;  // From Agile API
  summary?: string;  // From Agile API
  fields?: {
    summary: string;
  };
}

interface Board {
  id: number;
  name: string;
  type: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<JiraSettings>(DEFAULT_SETTINGS);
  const [authSettings, setAuthSettings] = useState<AuthSettings>(DEFAULT_AUTH_SETTINGS);
  const [cookies, setCookies] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [connectedUser, setConnectedUser] = useState<{ displayName: string; email: string } | null>(null);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetched data
  const [projects, setProjects] = useState<Project[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);

  // Load settings on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Load settings from localStorage (persistent)
      const localSettings = localStorage.getItem('jira-settings-v2');
      
      if (localSettings) {
        try {
          const parsed = JSON.parse(localSettings);
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        } catch {
          // Keep defaults
        }
      }

      // Load auth settings (keep in localStorage for persistence across sessions)
      const savedAuth = localStorage.getItem('jira-auth-settings');
      if (savedAuth) {
        try {
          setAuthSettings({ ...DEFAULT_AUTH_SETTINGS, ...JSON.parse(savedAuth) });
        } catch {
          // Ignore
        }
      }

      // Legacy: load cookies if exists
      const savedCookies = localStorage.getItem('jira-cookies');
      if (savedCookies) {
        try {
          const parsed = JSON.parse(savedCookies);
          setCookies(parsed.cookies || '');
        } catch {
          // Ignore
        }
      }
      
      // Mark as loaded - now auto-save can run
      setIsLoaded(true);
    }
  }, []);

  // Auto-save settings to localStorage whenever they change
  // Only save after initial load (isLoaded=true) to prevent overwriting
  useEffect(() => {
    if (typeof window !== 'undefined' && isLoaded) {
      localStorage.setItem('jira-settings-v2', JSON.stringify(settings));
    }
  }, [settings, isLoaded]);

  // Show loading state
  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </main>
    );
  }

  const handleAuthChange = (auth: AuthSettings, user?: { displayName: string; email: string }) => {
    setAuthSettings(auth);
    if (user) {
      setConnectedUser(user);
      // Auto-fill assignee ID if available
      if ((user as { accountId?: string }).accountId && !settings.assigneeId) {
        setSettings(prev => ({ ...prev, assigneeId: (user as { accountId?: string }).accountId || '' }));
      }
    }
  };

  const getAuthPayload = () => {
    if (authSettings.authMethod === 'api-token') {
      return { email: authSettings.email, apiToken: authSettings.apiToken };
    }
    return { cookies: authSettings.cookies || cookies };
  };

  const fetchMetadata = async (type: 'projects' | 'sprints' | 'issueTypes' | 'epics' | 'boards', query?: string) => {
    const authPayload = getAuthPayload();
    const hasAuth = authSettings.authMethod === 'api-token' 
      ? (authSettings.email && authSettings.apiToken)
      : (authSettings.cookies || cookies);

    if (!hasAuth) {
      alert('Please configure and test your authentication first');
      return;
    }

    setLoading(type);
    try {
      const response = await fetch('/api/jira-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authPayload,
          jiraUrl: settings.jiraUrl,
          type,
          boardId: settings.boardId,
          projectKey: settings.projectKey,
          searchQuery: query,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch');
      }

      switch (type) {
        case 'projects':
          const projectsData = data?.data;
          const projectsList = Array.isArray(projectsData) ? projectsData : (Array.isArray(data) ? data : []);
          setProjects(projectsList || []);
          break;
        case 'sprints':
          const sprintsData = data?.data;
          const sprintsList = Array.isArray(sprintsData) 
            ? sprintsData 
            : (sprintsData?.values || []);
          setSprints(sprintsList || []);
          break;
        case 'issueTypes':
          const typesData = data?.data;
          const typesList = Array.isArray(typesData) ? typesData : (Array.isArray(data) ? data : []);
          setIssueTypes(typesList || []);
          break;
        case 'epics':
          const epicsData = data?.data;
          const epicsList = Array.isArray(epicsData) ? epicsData : (epicsData?.values || epicsData?.issues || []);
          setEpics(epicsList || []);
          break;
        case 'boards':
          const boardsData = data?.data;
          const boardsList = Array.isArray(boardsData) 
            ? boardsData 
            : (boardsData?.values || []);
          setBoards(boardsList || []);
          break;
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(null);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    if (typeof window !== 'undefined') {
      // Save to both: sessionStorage for current session, localStorage for long-term
      sessionStorage.setItem('jira-settings-session', JSON.stringify(settings));
      localStorage.setItem('jira-settings-v2', JSON.stringify(settings));
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setIsSaving(false);
    }, 2000);
  };

  // Export settings to JSON file
  const handleExport = () => {
    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      settings,
      // Don't export sensitive auth data, just the method
      authMethod: authSettings.authMethod,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jira-config-${settings.projectKey || 'settings'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import settings from JSON file
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const imported = JSON.parse(text);
        
        if (imported.settings) {
          setSettings(prev => ({ ...prev, ...imported.settings }));
          // Save immediately
          localStorage.setItem('jira-settings-v2', JSON.stringify({ ...settings, ...imported.settings }));
          alert('Settings imported successfully!');
        } else {
          alert('Invalid config file: missing settings object');
        }
      } catch (err) {
        alert('Failed to import: ' + (err instanceof Error ? err.message : 'Invalid JSON'));
      }
    };
    input.click();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Settings</h1>
              <p className="text-xs text-gray-500">Configure your JIRA integration</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Import Button */}
            <button
              onClick={handleImport}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Import settings from JSON file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </button>
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Export settings to JSON file"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                saved
                  ? 'bg-green-600 text-white'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved!
              </>
            ) : (
              'Save Settings'
            )}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* JIRA Instance */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">JIRA Instance</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">JIRA URL</label>
            <input
              type="text"
              value={settings.jiraUrl}
              onChange={(e) => setSettings(prev => ({ ...prev, jiraUrl: e.target.value }))}
              placeholder="https://your-company.atlassian.net"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Your Atlassian Cloud instance URL</p>
          </div>
        </section>

        {/* Authentication */}
        <AuthManager 
          jiraUrl={settings.jiraUrl} 
          onAuthChange={handleAuthChange}
        />

        {/* Connected User Info */}
        {connectedUser && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">Connected to JIRA</p>
              <p className="text-xs text-green-600">Logged in as {connectedUser.displayName} ({connectedUser.email})</p>
            </div>
          </div>
        )}

        {/* Project Hierarchy Browser */}
        {settings.projectKey && connectedUser && (
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Project Hierarchy</h2>
              <button
                onClick={() => setShowHierarchy(!showHierarchy)}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                {showHierarchy ? 'Hide' : 'Browse Epics & Stories'}
              </button>
            </div>
            
            {showHierarchy && (
              <HierarchyBrowser
                jiraUrl={settings.jiraUrl}
                projectKey={settings.projectKey}
                authMethod={authSettings.authMethod}
                email={authSettings.email}
                apiToken={authSettings.apiToken}
                cookies={authSettings.cookies || cookies}
              />
            )}
          </section>
        )}

        {/* Project */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Project</h2>
            <button
              onClick={() => fetchMetadata('projects')}
              disabled={loading === 'projects'}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === 'projects' ? 'Loading...' : 'Fetch Projects'}
            </button>
          </div>

          {projects.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Project</label>
              <select
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  if (project) {
                    setSettings(prev => ({
                      ...prev,
                      projectId: project.id,
                      projectKey: project.key,
                    }));
                  }
                }}
                value={settings.projectId}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.key} - {p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
              <input
                type="text"
                value={settings.projectId}
                onChange={(e) => setSettings(prev => ({ ...prev, projectId: e.target.value }))}
                placeholder="10001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Key</label>
              <input
                type="text"
                value={settings.projectKey}
                onChange={(e) => setSettings(prev => ({ ...prev, projectKey: e.target.value }))}
                placeholder="PROJ"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Issue Types */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Issue Types</h2>
            <button
              onClick={() => fetchMetadata('issueTypes')}
              disabled={loading === 'issueTypes' || !settings.projectId}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading === 'issueTypes' ? 'Loading...' : 'Fetch Issue Types'}
            </button>
          </div>

          {issueTypes.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Available Issue Types:</p>
              <div className="flex flex-wrap gap-2">
                {issueTypes.map(t => (
                  <span
                    key={t.id}
                    className={`px-2 py-1 text-xs rounded ${
                      t.subtask ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {t.name} ({t.id})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Story Type ID</label>
              <input
                type="text"
                value={settings.storyTypeId}
                onChange={(e) => setSettings(prev => ({ ...prev, storyTypeId: e.target.value }))}
                placeholder="10001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subtask Type ID</label>
              <input
                type="text"
                value={settings.subtaskTypeId}
                onChange={(e) => setSettings(prev => ({ ...prev, subtaskTypeId: e.target.value }))}
                placeholder="10003"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Epic & Sprint */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Epic &amp; Sprint</h2>

          <div className="space-y-4">
            {/* Epic ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Epic Key or ID</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchMetadata('epics')}
                    disabled={loading === 'epics' || !settings.projectKey}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'epics' ? 'Loading...' : 'Fetch Epics'}
                  </button>
                </div>
              </div>

              {/* Search input for epic */}
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={settings.epicId}
                  onChange={(e) => setSettings(prev => ({ ...prev, epicId: e.target.value }))}
                  placeholder="MSP-5283 or search term..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={() => fetchMetadata('epics', settings.epicId)}
                  disabled={loading === 'epics' || !settings.epicId}
                  className="px-3 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                  title="Search for this epic"
                >
                  🔍
                </button>
              </div>

              {epics.length > 0 && (
                <select
                  onChange={(e) => setSettings(prev => ({ ...prev, epicId: e.target.value }))}
                  value={settings.epicId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                >
                  <option value="">Choose an epic...</option>
                  {epics.filter(epic => epic && (epic.id || epic.key)).map(epic => (
                    <option key={epic.id || epic.key} value={epic.key || String(epic.id)}>
                      {epic.key ? `${epic.key} - ` : ''}{epic.name || epic.summary || epic.fields?.summary || 'Untitled Epic'}
                    </option>
                  ))}
                </select>
              )}

              <p className="text-xs text-gray-500">Enter Epic key (MSP-5283) directly, or use 🔍 to search</p>
            </div>

            {/* Board ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Board ID (for sprints)</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchMetadata('boards')}
                    disabled={loading === 'boards' || !settings.projectKey}
                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading === 'boards' ? 'Loading...' : 'Fetch Boards'}
                  </button>
                  <button
                    onClick={() => fetchMetadata('boards', 'all')}
                    disabled={loading === 'boards'}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    All Boards
                  </button>
                </div>
              </div>

              {boards.length > 0 && (
                <select
                  onChange={(e) => {
                    setSettings(prev => ({ ...prev, boardId: e.target.value }));
                    // Reset sprints when board changes
                    setSprints([]);
                  }}
                  value={settings.boardId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                >
                  <option value="">Choose a board...</option>
                  {boards.filter(board => board && board.id).map(board => (
                    <option key={board.id} value={board.id.toString()}>
                      {board.name || 'Unnamed'} ({board.type || 'unknown'})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={settings.boardId}
                onChange={(e) => setSettings(prev => ({ ...prev, boardId: e.target.value }))}
                placeholder="123"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Select from dropdown or enter manually</p>
            </div>

            {/* Sprint ID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Sprint ID</label>
                <button
                  onClick={() => fetchMetadata('sprints')}
                  disabled={loading === 'sprints' || !settings.boardId}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading === 'sprints' ? 'Loading...' : 'Fetch Sprints'}
                </button>
              </div>

              {sprints.length > 0 && (
                <select
                  onChange={(e) => setSettings(prev => ({ ...prev, sprintId: e.target.value }))}
                  value={settings.sprintId}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-2"
                >
                  <option value="">Choose a sprint...</option>
                  {sprints.filter(s => s && s.id).map(s => (
                    <option key={s.id} value={s.id.toString()}>
                      {s.name || 'Unnamed'} ({s.state || 'unknown'})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                value={settings.sprintId}
                onChange={(e) => setSettings(prev => ({ ...prev, sprintId: e.target.value }))}
                placeholder="1234"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Curl Template Import */}
        <CurlTemplateManager
          initialStoryTemplate={settings.storyTemplate?.curl || ''}
          initialSubtaskTemplate={settings.subtaskTemplate?.curl || ''}
          onStoryTemplateChange={(parsed) => {
            if (parsed) {
              const extracted = extractSettingsFromCurl(parsed);
              setSettings(prev => ({
                ...prev,
                // Auto-fill settings from parsed curl
                jiraUrl: extracted.jiraUrl || prev.jiraUrl,
                projectId: extracted.projectId || prev.projectId,
                storyTypeId: extracted.issueTypeId || prev.storyTypeId,
                assigneeId: extracted.assigneeId || prev.assigneeId,
                priorityId: extracted.priorityId || prev.priorityId,
                // Store the full template
                storyTemplate: {
                  fields: { ...parsed.fields, ...Object.fromEntries(
                    Object.entries(parsed.customFields).map(([k, v]) => [k, v.value])
                  )},
                  extra: parsed.extra,
                  queryParams: parsed.queryParams,
                  curl: '', // We'll store curl separately if needed
                },
                // Merge custom fields
                customFields: {
                  ...prev.customFields,
                  ...extracted.customFields as Record<string, string | number>,
                },
              }));
            }
          }}
          onSubtaskTemplateChange={(parsed) => {
            if (parsed) {
              const extracted = extractSettingsFromCurl(parsed);
              setSettings(prev => ({
                ...prev,
                // Auto-fill settings from parsed curl
                jiraUrl: extracted.jiraUrl || prev.jiraUrl,
                projectId: extracted.projectId || prev.projectId,
                subtaskTypeId: extracted.issueTypeId || prev.subtaskTypeId,
                // Store the full template
                subtaskTemplate: {
                  fields: { ...parsed.fields, ...Object.fromEntries(
                    Object.entries(parsed.customFields).map(([k, v]) => [k, v.value])
                  )},
                  extra: parsed.extra,
                  queryParams: parsed.queryParams,
                  curl: '',
                },
              }));
            }
          }}
        />

        {/* Custom Fields */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Custom Fields (Optional)</h2>
            <button
              onClick={() => {
                const newKey = `customfield_${Date.now()}`;
                setSettings(prev => ({
                  ...prev,
                  customFields: { ...prev.customFields, [newKey]: '' }
                }));
              }}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Add custom field"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Add project-specific custom fields. Find field IDs in JIRA admin or by inspecting API responses.
          </p>

          {/* Epic Link & Sprint - always shown */}
          <div className="grid md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
              <input
                type="text"
                value={settings.epicLinkField}
                onChange={(e) => setSettings(prev => ({ ...prev, epicLinkField: e.target.value }))}
                placeholder=""
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Epic Link custom field</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
              <input
                type="text"
                value={settings.sprintField}
                onChange={(e) => setSettings(prev => ({ ...prev, sprintField: e.target.value }))}
                placeholder=""
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Sprint custom field</p>
            </div>
          </div>

          {/* Dynamic custom fields */}
          <div className="space-y-3">
            {settings.customFields && Object.entries(settings.customFields).map(([fieldKey, fieldValue]) => {
              // Convert object values to JSON string for display
              const displayValue = typeof fieldValue === 'object' && fieldValue !== null
                ? JSON.stringify(fieldValue)
                : String(fieldValue);
              return (
              <div key={fieldKey} className="flex gap-2 items-start">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Field</label>
                  <input
                    type="text"
                    value={fieldKey}
                    onChange={(e) => {
                      const newKey = e.target.value;
                      setSettings(prev => {
                        const newFields = { ...prev.customFields };
                        delete newFields[fieldKey];
                        newFields[newKey] = fieldValue;
                        return { ...prev, customFields: newFields };
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Value</label>
                  <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => {
                      // Try to parse as JSON, otherwise store as string
                      let newValue: string | number | object = e.target.value;
                      try {
                        const parsed = JSON.parse(e.target.value);
                        if (typeof parsed === 'object') newValue = parsed;
                      } catch { /* keep as string */ }
                      setSettings(prev => ({
                        ...prev,
                        customFields: { ...prev.customFields, [fieldKey]: newValue }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                </div>
                <div className="pt-6">
                  <button
                    onClick={() => {
                      setSettings(prev => {
                        const newFields = { ...prev.customFields };
                        delete newFields[fieldKey];
                        return { ...prev, customFields: newFields };
                      });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove field"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
            })}

            {(!settings.customFields || Object.keys(settings.customFields).length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">
                No custom fields added. Click + to add one.
              </p>
            )}
          </div>
        </section>

        {/* Other Fields */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Other Fields</h2>
          <p className="text-sm text-gray-500 mb-4">
            Workflow and additional settings. Priority defaults to 3 (Medium) if empty.
          </p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority ID</label>
              <input
                type="text"
                value={settings.priorityId || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, priorityId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">1=Highest, 2=High, 3=Medium, 4=Low, 5=Lowest</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component ID</label>
              <input
                type="text"
                value={settings.componentId || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, componentId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">JIRA component ID (required by some projects)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transition ID</label>
              <input
                type="text"
                value={settings.transitionId || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, transitionId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Workflow transition for new subtasks (optional)</p>
            </div>
          </div>
        </section>

        {/* Assignee */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Default Assignee</h2>
          <p className="text-sm text-gray-500 mb-4">
            Enter your JIRA Account ID. Find it in your JIRA profile URL or user settings.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
              <input
                type="text"
                value={settings.assigneeId}
                onChange={(e) => setSettings(prev => ({ ...prev, assigneeId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <p className="text-xs text-gray-400 mt-1">Format: 712020:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name (optional)</label>
              <input
                type="text"
                value={settings.assigneeName || ''}
                onChange={(e) => setSettings(prev => ({ ...prev, assigneeName: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">For your reference only</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
