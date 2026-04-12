'use client';

import { TestCase } from '@/lib/types';

interface Props {
  testCases: TestCase[];
  onRemove: (index: number) => void;
  onClear: () => void;
}

export default function TestCasePreview({ testCases, onRemove, onClear }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            Test Cases Preview
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({testCases.length} items)
            </span>
          </h2>
        </div>
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">TC ID</div>
            <div className="col-span-6">Title</div>
            <div className="col-span-2">Priority</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {testCases.map((tc, index) => (
            <div
              key={`${tc.id}-${index}`}
              className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 group"
            >
              <div className="col-span-2 font-mono text-sm text-gray-900 truncate" title={tc.id}>
                {tc.id}
              </div>
              <div className="col-span-6 text-sm text-gray-700 truncate" title={tc.title}>
                {tc.title}
              </div>
              <div className="col-span-2">
                {tc.priority && (
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    tc.priority.toLowerCase().includes('high') || tc.priority.toLowerCase().includes('critical')
                      ? 'bg-red-100 text-red-700'
                      : tc.priority.toLowerCase().includes('medium')
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                  }`}>
                    {tc.priority}
                  </span>
                )}
              </div>
              <div className="col-span-1 text-xs text-gray-500 truncate">
                {tc.status || '-'}
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => onRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Each test case will become a subtask</span>
        </div>
      </div>
    </div>
  );
}
