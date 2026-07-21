'use client';

import React, { useState, useMemo } from 'react';
import hljs from 'highlight.js';

// NOTE: We do NOT import any hljs CSS here.
// The VS Code Dark+ token colors are defined globally in app/globals.css

interface CodeBlockProps {
  code: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
}

// File emoji per extension — same palette as session page
function getFileEmoji(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const base = name.toLowerCase();
  const map: Record<string, string> = {
    js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
    py: '🐍', go: '🐹', rs: '🦀', java: '☕',
    kt: '🟣', cpp: '⚙️', c: '⚙️', h: '📋',
    cs: '🔵', rb: '💎', php: '🐘', swift: '🟠',
    html: '🌐', css: '🎨', scss: '🎨',
    json: '📋', yaml: '📋', yml: '📋', toml: '📋',
    sh: '🖥️', bash: '🖥️',
    md: '📝', txt: '📄', sql: '🗄️',
    dockerfile: '🐳', gitignore: '🔒',
  };
  return map[base] || map[ext] || '📄';
}

function getLanguage(path: string): string {
  if (!path) return 'plaintext';
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    py: 'python', js: 'javascript', jsx: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    go: 'go', rs: 'rust', java: 'java',
    cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp',
    html: 'xml', css: 'css', scss: 'scss',
    json: 'json', sh: 'bash', bash: 'bash',
    yml: 'yaml', yaml: 'yaml', md: 'markdown', sql: 'sql',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
  };
  return map[ext] || 'plaintext';
}

export default function CodeBlock({ code, filePath, lineStart, lineEnd }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const trimmed = code ? code.trim() : '';
  const lines = code ? code.split('\n') : [];
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const language = getLanguage(filePath);
  const fileName = filePath.split('/').pop() || filePath;

  // Highlight every line with hljs
  const highlightedLines = useMemo(() => {
    return lines.map(line => {
      try {
        return hljs.highlight(line || ' ', { language, ignoreIllegals: true }).value;
      } catch {
        return line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  if (!trimmed || nonEmptyLines.length < 3) {
    return (
      <div
        className="rounded-xl p-4 text-center italic text-xs"
        style={{ background: '#1e1e1e', border: '1px solid #3b494b', color: '#6a9955' }}
      >
        Code reference not available
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden shadow-xl w-full"
      style={{ background: '#1e1e1e', border: '1px solid #3b494b', fontFamily: "'Geist Mono','Cascadia Code','Fira Code',monospace" }}
    >
      {/* VS Code-style Tab Bar */}
      <div
        className="flex items-stretch select-none"
        style={{ background: '#252526', borderBottom: '1px solid #3b494b', minHeight: '34px' }}
      >
        {/* Active tab */}
        <div
          className="flex items-center gap-1.5 px-3"
          style={{
            background: '#1e1e1e',
            borderRight: '1px solid #3b494b',
            borderTop: '2px solid #007acc',
            fontSize: '11px',
            color: '#cccccc',
            maxWidth: '220px',
          }}
        >
          <span style={{ fontSize: '12px' }}>{getFileEmoji(fileName)}</span>
          <span className="truncate">{fileName}</span>
          <span
            className="ml-1 flex-shrink-0"
            style={{
              fontSize: '9px',
              padding: '1px 5px',
              background: 'rgba(0,122,204,0.2)',
              border: '1px solid rgba(0,122,204,0.4)',
              borderRadius: '3px',
              color: '#4ec9b0',
              fontWeight: 700,
            }}
          >
            {lineStart}–{lineEnd}
          </span>
        </div>
        <div className="flex-1" />
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-3 transition-colors cursor-pointer"
          style={{ fontSize: '10px', color: copied ? '#4ec9b0' : '#6a6a6a' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Breadcrumb */}
      <div
        className="flex items-center gap-1 px-3 overflow-x-auto whitespace-nowrap"
        style={{ background: '#1e1e1e', borderBottom: '1px solid rgba(59,73,75,0.4)', padding: '2px 12px', fontSize: '10px', color: '#858585' }}
      >
        {filePath.split('/').map((part, i, arr) => (
          <React.Fragment key={i}>
            <span style={{ color: i === arr.length - 1 ? '#cccccc' : '#555' }}>{part}</span>
            {i < arr.length - 1 && <span style={{ color: '#444' }}>/</span>}
          </React.Fragment>
        ))}
      </div>

      {/* Code Area */}
      <div
        className="overflow-x-auto custom-scrollbar"
        style={{ maxHeight: '320px', background: '#1e1e1e' }}
      >
        {highlightedLines.map((html, idx) => {
          const lineNum = lineStart + idx;
          const isHighlighted = lineNum >= lineStart && lineNum <= lineEnd;

          return (
            <div
              key={idx}
              className="flex items-stretch"
              style={{
                background: isHighlighted ? 'rgba(0,122,204,0.12)' : 'transparent',
                borderLeft: isHighlighted ? '2px solid #007acc' : '2px solid transparent',
                lineHeight: '20px',
                fontSize: '12px',
              }}
            >
              {/* Line number gutter */}
              <span
                className="select-none text-right flex-shrink-0"
                style={{
                  width: '44px',
                  paddingRight: '14px',
                  color: isHighlighted ? '#c6c6c6' : '#3e4451',
                  background: '#1e1e1e',
                  fontSize: '11px',
                  lineHeight: '20px',
                }}
              >
                {lineNum}
              </span>
              {/* Highlighted code */}
              <pre
                className="flex-1 whitespace-pre"
                style={{ color: '#d4d4d4', margin: 0, padding: '0 16px 0 0', lineHeight: '20px' }}
                dangerouslySetInnerHTML={{ __html: html || ' ' }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-3 select-none"
        style={{ background: '#007acc', padding: '2px 12px', fontSize: '10px', color: '#ffffff' }}
      >
        <span>{language.toUpperCase()}</span>
        <span>Lines {lineStart}–{lineEnd}</span>
      </div>
    </div>
  );
}
