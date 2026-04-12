'use client';

import { useState, useEffect } from 'react';
import { AuthSettings, DEFAULT_AUTH_SETTINGS } from '@/lib/config';

interface AuthManagerProps {
  jiraUrl: string;
  onAuthChange?: (auth: AuthSettings, user?: { displayName: string; email: string; accountId?: string }) => void;
}

export default function AuthManager({ jiraUrl, onAuthChange }: AuthManagerProps) {
  const [authSettings, setAuthSettings] = useState<AuthSettings>(DEFAULT_AUTH_SETTINGS);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [user, setUser] = useState<{ displayName: string; email: string; accountId?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);

  // Load saved auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jira-auth-settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setAuthSettings(prev => ({ ...prev, ...parsed }));
          
          // Also check for legacy cookies
          const legacyCookies = localStorage.getItem('jira-cookies');
          if (legacyCookies && !parsed.cookies) {
            const { cookies } = JSON.parse(legacyCookies);
            setAuthSettings(prev => ({ ...prev, cookies }));
          }
        } catch {
          // Ignore
        }
      }
    }
  }, []);

  const saveAuth = (newAuth: AuthSettings) => {
    setAuthSettings(newAuth);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jira-auth-settings', JSON.stringify(newAuth));
    }
  };

  const testConnection = async () => {
    if (!jiraUrl) {
      setError('Please set JIRA URL in Settings first');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const payload: Record<string, string> = { jiraUrl };
      
      if (authSettings.authMethod === 'api-token') {
        if (!authSettings.email || !authSettings.apiToken) {
          throw new Error('Email and API Token are required');
        }
        payload.email = authSettings.email;
        payload.apiToken = authSettings.apiToken;
      } else {
        if (!authSettings.cookies) {
          throw new Error('Cookies are required');
        }
        payload.cookies = authSettings.cookies;
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Connection failed');
      }

      setUser(data.user);
      setIsVerified(true);
      
      // Notify parent
      if (onAuthChange) {
        onAuthChange(authSettings, data.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsVerified(false);
      setUser(null);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAuthMethodChange = (method: 'api-token' | 'cookie') => {
    saveAuth({ ...authSettings, authMethod: method });
    setIsVerified(false);
    setUser(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication</h2>

      {/* Auth Method Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Authentication Method</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="authMethod"
              value="api-token"
              checked={authSettings.authMethod === 'api-token'}
              onChange={() => handleAuthMethodChange('api-token')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">API Token</span>
            <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">Recommended</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="authMethod"
              value="cookie"
              checked={authSettings.authMethod === 'cookie'}
              onChange={() => handleAuthMethodChange('cookie')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">Browser Cookies</span>
            <span className="text-xs text-gray-500">(Legacy)</span>
          </label>
        </div>
      </div>

      {/* API Token Form */}
      {authSettings.authMethod === 'api-token' && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>How to get an API Token:</strong>
            </p>
            <ol className="text-sm text-blue-700 mt-2 ml-4 list-decimal space-y-1">
              <li>Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="underline">Atlassian API Tokens</a></li>
              <li>Click &quot;Create API token&quot;</li>
              <li>Give it a name and copy the token</li>
              <li>Paste it below</li>
            </ol>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Atlassian Email</label>
            <input
              type="email"
              value={authSettings.email || ''}
              onChange={(e) => saveAuth({ ...authSettings, email: e.target.value })}
              placeholder="your-email@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">API Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={authSettings.apiToken || ''}
                onChange={(e) => saveAuth({ ...authSettings, apiToken: e.target.value })}
                placeholder="Your API token"
                className="w-full px-4 py-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cookie Form */}
      {authSettings.authMethod === 'cookie' && (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Cookies expire and need to be refreshed periodically. 
              Consider using API Token for a more reliable experience.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Browser Cookies</label>
            <textarea
              value={authSettings.cookies || ''}
              onChange={(e) => saveAuth({ ...authSettings, cookies: e.target.value })}
              placeholder="Paste your browser cookies here..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
            />
            <p className="mt-1 text-xs text-gray-500">
              Copy from DevTools → Network → Any request → Headers → Cookie
            </p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {isVerified && user && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700">
              Connected as <strong>{user.displayName}</strong> ({user.email})
            </span>
          </div>
        </div>
      )}

      {/* Test Connection Button */}
      <div className="mt-6">
        <button
          onClick={testConnection}
          disabled={isVerifying}
          className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            isVerifying
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isVerifying ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : isVerified ? (
            'Reconnect'
          ) : (
            'Test Connection'
          )}
        </button>
      </div>
    </div>
  );
}
