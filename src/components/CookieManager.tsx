'use client';

import { useState, useEffect } from 'react';
import { CookieInfo } from '@/lib/types';

interface Props {
  cookieInfo: CookieInfo | null;
  onCookiesSaved: (info: CookieInfo) => void;
}

export default function CookieManager({ cookieInfo, onCookiesSaved }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expiryWarning, setExpiryWarning] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(true);

  useEffect(() => {
    if (!cookieInfo?.savedAt) {
      setExpiryWarning(null);
      return;
    }

    const checkExpiry = () => {
      const savedAt = new Date(cookieInfo.savedAt);
      const now = new Date();
      const hoursSinceSaved = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceSaved >= 8) {
        setExpiryWarning('Cookies have likely expired. Please update them.');
      } else if (hoursSinceSaved >= 6) {
        setExpiryWarning(`Cookies may expire soon (${(8 - hoursSinceSaved).toFixed(1)} hours remaining)`);
      } else {
        setExpiryWarning(null);
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60000);
    return () => clearInterval(interval);
  }, [cookieInfo?.savedAt]);

  const handleTestAndSave = async () => {
    if (!cookieInput.trim()) {
      setError('Please paste your cookies');
      return;
    }

    setIsTesting(true);
    setError(null);

    try {
      let jiraUrl: string | undefined;
      if (typeof window !== 'undefined') {
        const savedSettings = localStorage.getItem('jira-settings-v2');
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            jiraUrl = settings.jiraUrl;
          } catch {
            // Ignore
          }
        }
      }

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookies: cookieInput.trim(), jiraUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed');
      }

      onCookiesSaved({
        cookies: cookieInput.trim(),
        savedAt: new Date(),
        user: data.user,
      });
      setIsEditing(false);
      setCookieInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleLogout = () => {
    onCookiesSaved({
      cookies: '',
      savedAt: new Date(),
    });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('jira-cookies');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">JIRA Authentication</h2>
        </div>
        {cookieInfo?.cookies && !isEditing && (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Connected
          </span>
        )}
      </div>

      {expiryWarning && !isEditing && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">{expiryWarning}</p>
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm text-amber-700 underline hover:text-amber-900 mt-1"
            >
              Update cookies now
            </button>
          </div>
        </div>
      )}

      {cookieInfo?.cookies && !isEditing ? (
        <div className="space-y-3">
          {cookieInfo.user && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium">
                  {cookieInfo.user.displayName?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{cookieInfo.user.displayName}</p>
                {showEmail ? (
                  <p className="text-sm text-gray-500">{cookieInfo.user.email}</p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Email hidden</p>
                )}
              </div>
              <button
                onClick={() => setShowEmail(!showEmail)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                title={showEmail ? 'Hide email' : 'Show email'}
              >
                {showEmail ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Update Cookies
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your JIRA cookies
            </label>
            <textarea
              value={cookieInput}
              onChange={(e) => setCookieInput(e.target.value)}
              placeholder="tenant.session.token=...; atlassian.xsrf.token=...; ..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Get cookies from DevTools → Network → Any request → Headers → Cookie
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleTestAndSave}
              disabled={isTesting || !cookieInput.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Testing...
                </>
              ) : (
                'Test & Save'
              )}
            </button>
            {cookieInfo?.cookies && (
              <button
                onClick={() => {
                  setIsEditing(false);
                  setCookieInput('');
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
