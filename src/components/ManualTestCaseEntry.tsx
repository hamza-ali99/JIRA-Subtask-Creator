'use client';

import { useState } from 'react';
import { TestCase } from '@/lib/types';

interface Props {
  onAddTestCase: (testCase: TestCase) => void;
  disabled?: boolean;
}

export default function ManualTestCaseEntry({ onAddTestCase, disabled }: Props) {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');

  const handleAdd = () => {
    if (!id.trim() || !title.trim()) return;

    onAddTestCase({
      id: id.trim(),
      title: title.trim(),
    });

    setId('');
    setTitle('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={`space-y-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex gap-3">
        <div className="w-32">
          <label className="block text-xs font-medium text-gray-500 mb-1">Test Case ID</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="TC-001"
            disabled={disabled}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Title / Description</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Verify login functionality..."
              disabled={disabled}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={disabled || !id.trim() || !title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400">Press Enter to add quickly</p>
    </div>
  );
}
