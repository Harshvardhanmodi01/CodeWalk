'use client';

import React, { useRef, useEffect } from 'react';

interface CodePanelProps {
  files: Array<{ fileName: string }>;
  activeFileIndex: number;
  onFileSelect: (idx: number) => void;
  codeSnippet: string;
  highlightedLine: number;
  isLoading?: boolean;
  error?: string | null;
}

export default function CodePanel({
  files,
  activeFileIndex,
  onFileSelect,
  codeSnippet,
  highlightedLine,
  isLoading = false,
  error = null
}: CodePanelProps) {
  
  // Parse code snippet lines and map them with line numbers
  const parseSnippet = (code: string) => {
    // Basic helper to extract start line from snippet comments (e.g. "// lines 42-52 of middleware.js")
    const match = code.match(/lines\s+(\d+)-\d+/i);
    let startLine = match ? parseInt(match[1]) : 1;
    
    const lines = code.split('\n');
    return lines.map((content, idx) => {
      const currentLineNo = startLine + idx;
      return {
        lineNo: currentLineNo,
        content: content,
        isHighlighted: currentLineNo === highlightedLine
      };
    });
  };

  const parsedLines = parseSnippet(codeSnippet);

  const editorRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to the highlighted line if it falls outside the viewport bounds
  useEffect(() => {
    if (editorRef.current && highlightedLine > 0) {
      const container = editorRef.current;
      const lineIndex = parsedLines.findIndex(l => l.lineNo === highlightedLine);
      if (lineIndex !== -1) {
        // Line height is 24px (h-6)
        const lineTop = lineIndex * 24; 
        const lineBottom = lineTop + 24;
        
        const containerScrollTop = container.scrollTop;
        const containerHeight = container.clientHeight;
        
        // Check if line is visible (with 48px offset safety margin)
        const isVisible = lineTop >= containerScrollTop + 48 && lineBottom <= containerScrollTop + containerHeight - 48;
        
        if (!isVisible) {
          container.scrollTo({
            top: Math.max(0, lineTop - containerHeight / 2),
            behavior: 'smooth'
          });
        }
      }
    }
  }, [highlightedLine, parsedLines]);

  // Determine dynamic terminal output based on active file type
  const activeFile = files[activeFileIndex];
  const fileName = activeFile ? activeFile.fileName : '';
  const fileLower = fileName.toLowerCase();

  let cmd = '';
  let line1 = '';
  let line2 = '';

  if (fileLower.endsWith('.py')) {
    cmd = 'python manage.py check';
    line1 = "Django version 4.2, using settings 'ai_blog_app.settings'";
    line2 = 'System check identified no issues (0 silenced).';
  } else if (
    fileLower.endsWith('.js') || 
    fileLower.endsWith('.jsx') || 
    fileLower.endsWith('.ts') || 
    fileLower.endsWith('.tsx')
  ) {
    cmd = 'eslint --fix src/';
    line1 = 'All files passed linting successfully.';
    line2 = 'No issues found.';
  } else {
    const displayFile = fileName.split('/').pop() || 'workspace';
    cmd = `analyzer --check ${displayFile}`;
    line1 = `Scanning ${displayFile} for potential optimizations...`;
    line2 = 'Analysis finished: 0 issues found.';
  }

  return (
    <section className="w-full lg:w-7/12 flex flex-col bg-surface border-r border-outline-variant relative h-full">
      {/* File Tabs Header */}
      <div className="flex bg-surface-container-low border-b border-outline-variant select-none overflow-x-auto custom-scrollbar">
        {files.map((file, idx) => {
          const isActive = idx === activeFileIndex;
          const display = file.fileName.split('/').pop() || file.fileName;
          
          let icon = 'description';
          const nameLower = file.fileName.toLowerCase();
          if (nameLower.endsWith('.py')) {
            icon = 'terminal';
          } else if (
            nameLower.endsWith('.js') || 
            nameLower.endsWith('.jsx') || 
            nameLower.endsWith('.ts') || 
            nameLower.endsWith('.tsx')
          ) {
            icon = 'javascript';
          } else if (nameLower.includes('readme') || nameLower.endsWith('.md')) {
            icon = 'menu_book';
          }

          return (
            <button
              key={file.fileName}
              onClick={() => onFileSelect(idx)}
              className={`px-4 py-2.5 flex items-center gap-2 border-r border-outline-variant font-mono text-xs transition-colors shrink-0 outline-none ${
                isActive 
                  ? 'bg-surface text-primary-fixed border-t-2 border-t-primary-fixed font-bold' 
                  : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high'
              }`}
            >
              <span className="material-symbols-outlined text-sm font-bold text-primary-fixed">{icon}</span>
              <span>{display}</span>
            </button>
          );
        })}
      </div>

      {/* Code Editor Body */}
      <div 
        ref={editorRef}
        className="flex-1 overflow-auto code-scrollbar font-code-md text-code-md p-6 leading-relaxed bg-surface-container-lowest relative"
      >
        {isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-lowest/80 z-20">
            <span className="material-symbols-outlined text-3xl text-primary-fixed animate-spin mb-2">sync</span>
            <p className="text-sm text-on-surface-variant font-medium">Loading file content...</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-lowest p-6 text-center z-20">
            <span className="material-symbols-outlined text-4xl text-error mb-2">error</span>
            <p className="text-sm text-error font-semibold">{error}</p>
          </div>
        ) : (
          <div className="flex font-mono text-xs sm:text-sm">
            {/* Line Numbers column */}
            <div className="w-12 text-on-surface-variant/30 text-right pr-4 select-none border-r border-outline-variant/10">
              {parsedLines.map((line) => (
                <div key={line.lineNo} className="h-6">
                  {line.lineNo}
                </div>
              ))}
            </div>

            {/* Code Text column */}
            <div className="flex-grow pl-4 whitespace-pre relative">
              {parsedLines.map((line) => (
                <div key={line.lineNo} className="h-6 relative">
                  {line.isHighlighted ? (
                    <div className="absolute inset-y-0 -left-4 -right-6 bg-primary-fixed/5 border-y border-l-2 border-primary-fixed active-glow pointer-events-none z-0"></div>
                  ) : null}
                  <span className={`relative z-10 ${line.isHighlighted ? 'text-primary-fixed font-semibold' : 'text-on-surface-variant/80'}`}>
                    {highlightCode(line.content)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Terminal Console Footer */}
      <div className="h-32 bg-surface-container-lowest border-t border-outline-variant p-4 font-code-sm text-code-sm flex flex-col space-y-1 select-none font-mono animate-in fade-in duration-300">
        <div className="flex items-start space-x-2 text-xs">
          <span className="text-primary-fixed font-bold">$</span>
          <span className="text-on-surface-variant/80">{cmd}</span>
        </div>
        <div className="flex items-start space-x-2 text-xs">
          <span className="text-primary-fixed font-bold">&gt;</span>
          <span className="text-on-surface-variant/80">{line1}</span>
        </div>
        <div className="flex items-start space-x-2 text-xs">
          <span className="text-primary-fixed font-bold">&gt;</span>
          <span className="text-on-surface-variant/80">{line2}</span>
        </div>
      </div>
    </section>
  );
}

// Simple regex-based syntax highlighter for demo representation
function highlightCode(line: string) {
  if (line.trim().startsWith('//')) {
    return <span className="text-[#849495] italic">{line}</span>;
  }
  
  // Highlight JS keywords
  const keywords = ['const', 'let', 'function', 'return', 'import', 'from', 'export', 'default', 'require', 'module', 'exports', 'if', 'else', 'await', 'async'];
  
  // Split tokens and colorize
  let highlighted: React.ReactNode[] = [];
  const words = line.split(/(\s+|\(|\)|\{|\}|\[|\]|=|>|<|;|\.|,|:)/);
  
  words.forEach((word, idx) => {
    if (keywords.includes(word)) {
      highlighted.push(<span key={idx} className="text-secondary font-semibold">{word}</span>);
    } else if (word.startsWith("'") || word.startsWith('"') || word.startsWith('`')) {
      highlighted.push(<span key={idx} className="text-primary-fixed-dim">{word}</span>);
    } else if (word === 'useMemo' || word === 'useEffect' || word === 'useState' || word === 'useCallback') {
      highlighted.push(<span key={idx} className="text-tertiary-fixed-dim font-bold">{word}</span>);
    } else {
      highlighted.push(<span key={idx}>{word}</span>);
    }
  });
  
  return <>{highlighted}</>;
}
