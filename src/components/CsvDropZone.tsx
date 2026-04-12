'use client';

import { useState, useRef, useCallback } from 'react';
import { TestCase } from '@/lib/types';

interface Props {
  onTestCasesLoaded: (testCases: TestCase[]) => void;
  onAddTestCase: (testCase: TestCase) => void;
  disabled?: boolean;
}

type TabMode = 'csv' | 'manual' | 'paste';

function parseCSV(text: string): TestCase[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  // Find column indices
  const tcIdIndex = headers.findIndex(h => h === 'testcase id' || h === 'tc id' || h === 'tc_id' || h === 'id' || h === 'test case id');
  const titleIndex = headers.findIndex(h => h === 'title' || h === 'name' || h === 'description' || h === 'summary' || h === 'statement');
  const priorityIndex = headers.findIndex(h => h === 'priority');
  const statusIndex = headers.findIndex(h => h === 'status');

  if (tcIdIndex === -1 || titleIndex === -1) {
    throw new Error('CSV must have "TestCase ID" and "Title" columns');
  }

  const testCases: TestCase[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parsing (handles basic cases)
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const id = values[tcIdIndex]?.replace(/['"]/g, '');
    const title = values[titleIndex]?.replace(/['"]/g, '');
    
    if (id && title) {
      testCases.push({
        id,
        title,
        priority: priorityIndex >= 0 ? values[priorityIndex]?.replace(/['"]/g, '') : undefined,
        status: statusIndex >= 0 ? values[statusIndex]?.replace(/['"]/g, '') : undefined,
      });
    }
  }

  return testCases;
}

export default function CsvDropZone({ onTestCasesLoaded, onAddTestCase, disabled }: Props) {
  const [activeTab, setActiveTab] = useState<TabMode>('csv');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState('');
  const [manualId, setManualId] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const testCases = parseCSV(text);
        if (testCases.length === 0) {
          setError('No valid test cases found in file');
          return;
        }
        onTestCasesLoaded(testCases);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    };
    
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, [onTestCasesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      handleFile(file);
    } else {
      setError('Please drop a CSV file');
    }
  }, [handleFile]);

  const handlePaste = () => {
    setError(null);
    try {
      const testCases = parseCSV(pasteContent);
      if (testCases.length === 0) {
        setError('No valid test cases found');
        return;
      }
      onTestCasesLoaded(testCases);
      setPasteContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse content');
    }
  };

  const handleManualAdd = () => {
    if (!manualId.trim() || !manualTitle.trim()) return;
    onAddTestCase({ id: manualId.trim(), title: manualTitle.trim() });
    setManualId('');
    setManualTitle('');
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900">Add Test Cases</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[
          { id: 'csv' as TabMode, label: 'Upload CSV' },
          { id: 'manual' as TabMode, label: 'Manual Entry' },
          { id: 'paste' as TabMode, label: 'Paste CSV' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {activeTab === 'csv' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="text-gray-600 mb-2">Drop your CSV file here, or click to browse</p>
          <p className="text-xs text-gray-400">Required columns: TestCase ID, Title</p>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-32">
              <label className="block text-xs font-medium text-gray-500 mb-1">Test Case ID</label>
              <input
                type="text"
                value={manualId}
                onChange={(e) => setManualId(e.target.value)}
                placeholder="TC-001"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()}
                  placeholder="Test case description..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleManualAdd}
                  disabled={!manualId.trim() || !manualTitle.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400">Press Enter to add quickly</p>
        </div>
      )}

      {activeTab === 'paste' && (
        <div className="space-y-3">
          <textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={'TestCase ID,Title,Priority,Status\nTC-001,Test login functionality,High,Draft\nTC-002,Test logout functionality,Medium,Draft'}
            className="w-full h-40 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">Paste CSV content including headers</p>
            <button
              onClick={handlePaste}
              disabled={!pasteContent.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-lg transition-colors"
            >
              Parse & Load
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
