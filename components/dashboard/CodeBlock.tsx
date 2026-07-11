'use client';

import React, { useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';

interface CodeBlockProps {
  code: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

export default function CodeBlock({ code, filePath, lineStart, lineEnd }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  // Auto-detect language from extension
  const getLanguage = (path: string) => {
    if (!path) return 'plaintext';
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      py: 'python',
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'c',
      cs: 'csharp',
      html: 'xml',
      css: 'css',
      json: 'json',
      sh: 'bash',
      yml: 'yaml',
      yaml: 'yaml',
      md: 'markdown',
      sql: 'sql'
    };
    return map[ext] || 'plaintext';
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Trim and check if code exists and has >= 3 lines of actual code
  const trimmed = code ? code.trim() : '';
  const lines = code ? code.split('\n') : [];
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  if (!trimmed || nonEmptyLines.length < 3) {
    return (
      <div className="bg-[#0d1515] border border-[#3b494b] rounded-xl p-4 text-center text-[#849495] italic text-xs">
        Code reference not available
      </div>
    );
  }

  const language = getLanguage(filePath);
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className="bg-[#0d1515] border border-[#3b494b] rounded-xl overflow-hidden shadow-lg flex flex-col font-mono text-[11px] text-[#b9cacb] relative w-full">
      {/* Header Bar */}
      <div className="px-4 py-2 border-b border-[#3b494b] bg-[#151d1e]/40 flex items-center justify-between text-[10px] select-none text-[#94A3B8]">
        <span>{fileName} — Lines {lineStart} to {lineEnd}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer font-sans"
        >
          <span className="material-symbols-outlined text-xs">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Code Area */}
      <div className="overflow-x-auto custom-scrollbar p-3 max-h-[300px] bg-[#0d1515]">
        <table className="min-w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const currentLineNum = lineStart + idx;
              // Syntax highlight this line
              let highlightedHtml = line;
              try {
                highlightedHtml = hljs.highlight(line || ' ', { language }).value;
              } catch {
                // fallback
              }

              return (
                <tr
                  key={idx}
                  className="hover:bg-[#151d1e]/40 transition-colors"
                  style={{
                    backgroundColor: 'rgba(6, 182, 212, 0.04)' // subtle cyan background highlight
                  }}
                >
                  {/* Line Number */}
                  <td className="w-10 pr-4 text-right text-[#475569] select-none align-top border-r border-[#3b494b]/20">
                    {currentLineNum}
                  </td>
                  {/* Code Line */}
                  <td className="pl-4 text-left whitespace-pre align-top text-white">
                    <code
                      dangerouslySetInnerHTML={{ __html: highlightedHtml || ' ' }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
