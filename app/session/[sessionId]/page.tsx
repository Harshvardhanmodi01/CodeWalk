'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';

interface Question {
  id: string;
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'frontend' | 'backend' | 'dsa' | 'system-design';
  order_index: number;
}

interface Answer {
  id?: string;
  question_id: string;
  answer_text: string;
  ai_score: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  github_url: string;
}

interface Session {
  id: string;
  recruiter_id: string;
  candidate_id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled';
  timer_duration_minutes: number;
  started_at: string;
}

interface FileTreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children: Record<string, FileTreeNode>;
}

export default function LiveSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const { user } = useGlobal();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Core Data
  const [session, setSession] = useState<Session | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Recruiter Inputs (mapped by question_id)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [savingAnswer, setSavingAnswer] = useState<Record<string, boolean>>({});

  // GitHub Code Tree & Viewer
  const [flatTree, setFlatTree] = useState<any[]>([]);
  const [treeRoot, setTreeRoot] = useState<FileTreeNode | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>({});
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fetchingContent, setFetchingContent] = useState(false);

  // Copilot follow-up states
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotFollowUp, setCopilotFollowUp] = useState('');

  // Timer States
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);

  // Public candidate link copied alert
  const [copiedLink, setCopiedLink] = useState(false);

  // Ref to highlighted line for scroll
  const codeViewerRef = useRef<HTMLDivElement>(null);

  // Check auth
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load Session and Question Details
  useEffect(() => {
    if (!sessionId) return;

    const fetchSessionData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Session
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessErr || !sessData) throw new Error(sessErr?.message || 'Session not found');
        setSession(sessData);

        // Calculate timer
        const durationSeconds = sessData.timer_duration_minutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
        const remaining = Math.max(0, durationSeconds - elapsedSeconds);
        setTimeLeftSeconds(remaining);

        // 2. Fetch Candidate
        const { data: candData, error: candErr } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', sessData.candidate_id)
          .single();

        if (candErr) throw candErr;
        setCandidate(candData);

        // 3. Fetch Questions
        const { data: qData, error: qErr } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        if (qErr) throw qErr;
        setQuestions(qData || []);

        // 4. Fetch Answers
        const { data: ansData, error: ansErr } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', sessionId);

        if (ansErr) throw ansErr;

        const initialNotes: Record<string, string> = {};
        const initialScores: Record<string, number> = {};
        (ansData || []).forEach(a => {
          initialNotes[a.question_id] = a.answer_text || '';
          initialScores[a.question_id] = a.ai_score || 5;
        });
        setNotes(initialNotes);
        setScores(initialScores);

        // 5. Fetch GitHub File structure
        await fetchRepositoryTree(sessData.repo_url);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId]);

  // Timer countdown hook
  useEffect(() => {
    if (timeLeftSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        if (prev <= 300) {
          setTimerWarning(true);
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds]);

  // Convert flat files into hierarchical structure
  const fetchRepositoryTree = async (repoUrl: string) => {
    try {
      const res = await fetch('/api/session/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, action: 'tree' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to retrieve files.');

      setFlatTree(data.tree || []);
      const root = buildTreeHierarchy(data.tree || []);
      setTreeRoot(root);

      // Auto-expand top level directories
      const initialExpanded: Record<string, boolean> = {};
      Object.keys(root.children).forEach(key => {
        if (root.children[key].type === 'dir') {
          initialExpanded[root.children[key].path] = true;
        }
      });
      setExpandedDirs(initialExpanded);
    } catch (err: any) {
      console.warn('Error loading GitHub tree:', err);
    }
  };

  const buildTreeHierarchy = (files: any[]): FileTreeNode => {
    const root: FileTreeNode = { name: 'root', path: '', type: 'dir', children: {} };
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      parts.forEach((part: string, index: number) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: index === parts.length - 1 ? (file.type === 'tree' ? 'dir' : 'file') : 'dir',
            children: {}
          };
        }
        current = current.children[part];
      });
    });
    return root;
  };

  // Fetch individual file content
  const loadFileContent = async (filePath: string) => {
    if (!session || !filePath) return;
    setFetchingContent(true);
    setSelectedFilePath(filePath);
    try {
      const res = await fetch('/api/session/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: session.repo_url, action: 'file', path: filePath })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch file content.');
      setFileContent(data.content || '');
    } catch (err: any) {
      setFileContent(`// Error loading file contents: ${err.message}`);
    } finally {
      setFetchingContent(false);
    }
  };

  // Select a question and sync file viewer & highlighted line
  useEffect(() => {
    if (questions.length === 0 || activeQIndex >= questions.length) return;
    const currentQ = questions[activeQIndex];
    
    // Clear copilot follow up when changing questions
    setCopilotFollowUp('');

    if (currentQ.file_path && currentQ.file_path !== 'Custom Question') {
      loadFileContent(currentQ.file_path);
    } else {
      setFileContent('// Custom Recruiter Question\n\n' + currentQ.question_text);
      setSelectedFilePath('Custom Question');
    }
  }, [activeQIndex, questions]);

  // Scroll to active line range on code load
  useEffect(() => {
    if (questions.length === 0 || fetchingContent) return;
    const currentQ = questions[activeQIndex];
    if (currentQ && currentQ.line_start) {
      setTimeout(() => {
        const firstLineEl = document.getElementById(`line-${currentQ.line_start}`);
        if (firstLineEl) {
          firstLineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [fileContent, activeQIndex, questions, fetchingContent]);

  // Update answer in Supabase (de-bounced or save trigger)
  const saveAnswerState = async (qId: string, text: string, score: number) => {
    if (!sessionId) return;
    setSavingAnswer(prev => ({ ...prev, [qId]: true }));
    try {
      // Check if answer already exists
      const { data: existing, error: findErr } = await supabase
        .from('answers')
        .select('id')
        .eq('session_id', sessionId)
        .eq('question_id', qId)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
        // Update
        const { error: updErr } = await supabase
          .from('answers')
          .update({
            answer_text: text,
            ai_score: score,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        // Insert
        const { error: insErr } = await supabase
          .from('answers')
          .insert({
            session_id: sessionId,
            question_id: qId,
            answer_text: text,
            ai_score: score
          });
        if (insErr) throw insErr;
      }
    } catch (err) {
      console.error('Failed to save answer metrics:', err);
    } finally {
      setSavingAnswer(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleNotesChange = (text: string) => {
    const qId = questions[activeQIndex]?.id;
    if (!qId) return;
    setNotes(prev => ({ ...prev, [qId]: text }));
    // Save state
    saveAnswerState(qId, text, scores[qId] || 5);
  };

  const handleScoreChange = (score: number) => {
    const qId = questions[activeQIndex]?.id;
    if (!qId) return;
    setScores(prev => ({ ...prev, [qId]: score }));
    // Save state
    saveAnswerState(qId, notes[qId] || '', score);
  };

  // Generate Copilot Follow-up
  const triggerCopilotFollowUp = async () => {
    const currentQ = questions[activeQIndex];
    if (!currentQ) return;

    setCopilotLoading(true);
    setCopilotFollowUp('');
    try {
      const res = await fetch('/api/session/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: currentQ.question_text,
          codeSnippet: currentQ.code_snippet || fileContent.slice(0, 1000),
          recruiterNotes: notes[currentQ.id] || 'Candidate is explaining their thought process.'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copilot failed.');
      setCopilotFollowUp(data.follow_up || 'No additional follow-ups generated.');
    } catch (err: any) {
      setCopilotFollowUp(`AI Copilot Error: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Copy candidate link
  const copyCandidateLink = () => {
    const link = `${window.location.origin}/candidate/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // End Interview and Redirect to Report page
  const handleEndInterview = async () => {
    if (!confirm('Are you sure you want to end the interview? This will freeze answers and compile the final AI report.')) return;

    setLoading(true);
    try {
      // 1. Gather all compiled answers
      const consolidatedAnswers = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        file_path: q.file_path,
        category: q.category,
        difficulty: q.difficulty,
        answer_text: notes[q.id] || '',
        score: scores[q.id] || 5
      }));

      // 2. Fetch AI compilation report
      const repRes = await fetch('/api/session/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: consolidatedAnswers })
      });
      const repData = await repRes.json();
      if (!repRes.ok) throw new Error(repData.error || 'Failed to generate summary report.');

      // 3. Update session report
      const { error: reportUpsertErr } = await supabase
        .from('session_reports')
        .upsert({
          session_id: sessionId,
          overall_score: repData.overall_score || 50,
          hire_recommendation: repData.hire_recommendation || 'maybe',
          code_story_summary: repData.final_summary || '',
          total_questions: questions.length,
          completed_questions: consolidatedAnswers.filter(a => a.answer_text.trim().length > 0).length,
          generated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

      if (reportUpsertErr) console.warn('Failed to update session report:', reportUpsertErr);

      // 4. Update session status
      const { error: sessUpdateErr } = await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (sessUpdateErr) throw sessUpdateErr;

      router.push(`/session/${sessionId}/report`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while compiling reports.');
      setLoading(false);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Folder toggling helper
  const toggleFolder = (path: string) => {
    setExpandedDirs(prev => ({ ...prev, [path]: !prev[path] }));
  };

  // Recursive Directory component
  const renderTree = (node: FileTreeNode) => {
    const sortedKeys = Object.keys(node.children).sort((a, b) => {
      const childA = node.children[a];
      const childB = node.children[b];
      if (childA.type !== childB.type) {
        return childA.type === 'dir' ? -1 : 1;
      }
      return childA.name.localeCompare(childB.name);
    });

    return (
      <ul className="space-y-1 pl-3 text-xs">
        {sortedKeys.map(key => {
          const child = node.children[key];
          const isDir = child.type === 'dir';
          const isExpanded = expandedDirs[child.path];
          const isSelected = selectedFilePath === child.path;

          if (isDir) {
            return (
              <li key={child.path} className="select-none">
                <button
                  onClick={() => toggleFolder(child.path)}
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#334155]/30 w-full text-left font-medium text-[#94A3B8] transition-colors"
                >
                  <span className="material-symbols-outlined text-sm font-bold text-yellow-500/80">
                    {isExpanded ? 'folder_open' : 'folder'}
                  </span>
                  <span className="truncate">{child.name}</span>
                </button>
                {isExpanded && <div className="mt-1">{renderTree(child)}</div>}
              </li>
            );
          } else {
            return (
              <li key={child.path}>
                <button
                  onClick={() => loadFileContent(child.path)}
                  className={`flex items-center gap-1.5 py-1 px-1.5 rounded w-full text-left transition-colors truncate ${
                    isSelected
                      ? 'bg-[#06B6D4]/10 text-[#06B6D4] font-semibold border-l-2 border-[#06B6D4]'
                      : 'text-[#F1F5F9] hover:bg-[#334155]/20 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm text-[#06B6D4]/70">description</span>
                  <span className="truncate">{child.name}</span>
                </button>
              </li>
            );
          }
        })}
      </ul>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Loading screening workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-[#1E293B] border border-[#334155] rounded-lg text-xs hover:bg-[#0F172A] transition-colors inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[activeQIndex];

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-[#F1F5F9] overflow-hidden select-none">
      {/* Session Header */}
      <header className="flex justify-between items-center px-6 py-3.5 bg-[#1E293B] border-b border-[#334155] z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0F172A] transition-colors"
            title="Back to Dashboard"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-[#06B6D4]">CodeWalk Recopilot</h1>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[10px] text-emerald-500 font-semibold tracking-wider uppercase">Live Screen</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
              Candidate: <span className="text-white">{candidate?.name}</span> ({candidate?.email})
            </p>
          </div>
        </div>

        {/* Timer / Counter */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0F172A] border border-[#334155] rounded-lg font-mono">
            <span className={`material-symbols-outlined text-sm ${timerWarning ? 'text-red-500 animate-pulse' : 'text-[#06B6D4]'}`}>
              timer
            </span>
            <span className={`text-sm font-bold ${timerWarning ? 'text-red-500 animate-pulse' : 'text-[#F1F5F9]'}`}>
              {formatTime(timeLeftSeconds)}
            </span>
          </div>

          <button
            onClick={copyCandidateLink}
            className={`text-xs px-3.5 py-1.5 font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 ${
              copiedLink
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:bg-[#0F172A] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {copiedLink ? 'done' : 'share'}
            </span>
            {copiedLink ? 'Copied Candidate Link!' : 'Share Candidate Screen'}
          </button>

          <button
            onClick={() => router.push(`/session/${sessionId}/code-story`)}
            className="text-xs px-3.5 py-1.5 font-bold rounded-lg bg-[#1E293B] border border-[#334155] text-white hover:bg-[#0F172A] transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-[#06B6D4]">analytics</span>
            View Code Story
          </button>

          <button
            onClick={handleEndInterview}
            className="text-xs px-4 py-1.5 font-bold bg-[#06B6D4] text-[#0F172A] hover:bg-[#06B6D4]/90 rounded-lg shadow-lg shadow-[#06B6D4]/10 transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm font-bold">assignment_turned_in</span>
            End & Compile Report
          </button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT WORKSPACE (60%) */}
        <div className="w-[60%] flex border-r border-[#334155] bg-[#0F172A] overflow-hidden">
          {/* Collapsible/Sleek File Explorer */}
          <div className="w-1/4 border-r border-[#334155] flex flex-col bg-[#1E293B]/60 overflow-y-auto custom-scrollbar p-3">
            <h2 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 px-1">Repository Explorer</h2>
            {treeRoot && Object.keys(treeRoot.children).length > 0 ? (
              renderTree(treeRoot)
            ) : (
              <p className="text-[10px] text-[#94A3B8] px-1 italic">No files found.</p>
            )}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0F172A]">
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#1E293B]/40 border-b border-[#334155] text-xs select-none">
              <div className="flex items-center gap-2 text-[#94A3B8] font-mono">
                <span className="material-symbols-outlined text-sm">code</span>
                <span className="truncate max-w-xs">{selectedFilePath || 'Select a file'}</span>
              </div>
              {currentQuestion && currentQuestion.file_path === selectedFilePath && (
                <span className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-[10px] text-[#06B6D4] font-semibold">
                  Highlighting Question {activeQIndex + 1} Snippet
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar font-mono text-xs p-4 leading-relaxed" ref={codeViewerRef}>
              {fetchingContent ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4] mb-2"></div>
                  <p className="text-[10px] text-[#94A3B8]">Loading file contents...</p>
                </div>
              ) : fileContent ? (
                <div className="min-w-full inline-block">
                  {fileContent.split('\n').map((line, idx) => {
                    const lineNum = idx + 1;
                    const isHighlighted = 
                      currentQuestion && 
                      currentQuestion.file_path === selectedFilePath && 
                      lineNum >= currentQuestion.line_start && 
                      lineNum <= currentQuestion.line_end;

                    return (
                      <div
                        key={idx}
                        id={`line-${lineNum}`}
                        className={`flex py-0.5 w-full ${
                          isHighlighted 
                            ? 'bg-[#06B6D4]/10 border-l-4 border-[#06B6D4] -ml-4 pl-3' 
                            : 'pl-0'
                        }`}
                      >
                        <span className="w-12 text-[#475569] text-right pr-4 select-none">{lineNum}</span>
                        <pre className={`whitespace-pre text-left ${isHighlighted ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>
                          {line}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#94A3B8] text-center p-4">
                  <span className="material-symbols-outlined text-3xl mb-2 text-[#334155]">developer_board</span>
                  <p className="text-xs">Select a file from the repository explorer to view the code.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE (40%) */}
        <div className="w-[40%] flex flex-col bg-[#1E293B]/40 overflow-y-auto custom-scrollbar">
          
          {/* Active Question Details */}
          {currentQuestion ? (
            <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Question Info card */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#06B6D4] tracking-widest">
                      Question {activeQIndex + 1} of {questions.length}
                    </span>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-[#334155] rounded-full text-[9px] font-bold text-[#94A3B8] uppercase">
                        {currentQuestion.difficulty}
                      </span>
                      <span className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-[9px] font-bold text-[#06B6D4] uppercase">
                        {currentQuestion.category}
                      </span>
                    </div>
                  </div>
                  
                  <h3 className="text-base font-bold leading-relaxed text-[#F1F5F9]">
                    {currentQuestion.question_text}
                  </h3>

                  {currentQuestion.file_path && currentQuestion.file_path !== 'Custom Question' && (
                    <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1.5 bg-[#0F172A]/50 px-3 py-1.5 rounded-lg border border-[#334155]">
                      <span className="material-symbols-outlined text-xs">folder_open</span>
                      <span>
                        {currentQuestion.file_path} (Lines {currentQuestion.line_start}-{currentQuestion.line_end})
                      </span>
                    </div>
                  )}
                </div>

                {/* Score and Answer Log Input */}
                <div className="space-y-4 bg-[#1E293B]/80 border border-[#334155] rounded-xl p-5 shadow-xl">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">
                      Recruiter Log & Scoring
                    </label>
                    {savingAnswer[currentQuestion.id] && (
                      <span className="text-[10px] text-emerald-400 font-semibold animate-pulse inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        Saving metrics...
                      </span>
                    )}
                  </div>

                  {/* Notes Area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Response Notes</label>
                    <textarea
                      value={notes[currentQuestion.id] || ''}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] transition-colors placeholder-[#475569] h-28 custom-scrollbar resize-none"
                      placeholder="Type your notes about candidate's answer here. Updates are autosaved."
                    />
                  </div>

                  {/* Score Selector Slider */}
                  <div className="space-y-2 pt-2 border-t border-[#334155]">
                    <div className="flex justify-between text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                      <span>Performance Score</span>
                      <span className="text-[#06B6D4] font-bold text-xs">{scores[currentQuestion.id] || 5}/10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={scores[currentQuestion.id] || 5}
                      onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                      className="w-full h-1 bg-[#0F172A] rounded-lg appearance-none cursor-pointer accent-[#06B6D4]"
                    />
                    <div className="flex justify-between text-[9px] text-[#475569] font-semibold">
                      <span>1 - Poor</span>
                      <span>5 - Satisfactory</span>
                      <span>10 - Outstanding</span>
                    </div>
                  </div>
                </div>

                {/* AI COPILOT CARD */}
                <div className="bg-gradient-to-br from-[#06B6D4]/5 to-[#0F172A] border border-[#06B6D4]/20 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold text-[#06B6D4] tracking-widest flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">auto_awesome</span>
                      AI Copilot Follow-up
                    </span>
                    <button
                      onClick={triggerCopilotFollowUp}
                      disabled={copilotLoading}
                      className="text-[10px] font-bold text-[#0F172A] bg-[#06B6D4] hover:bg-[#06B6D4]/80 disabled:bg-[#334155] disabled:text-[#94A3B8] px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1"
                    >
                      {copilotLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-current"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xs">refresh</span>
                          Ask Copilot
                        </>
                      )}
                    </button>
                  </div>

                  {copilotFollowUp ? (
                    <div className="p-3 bg-[#0F172A]/50 border border-[#06B6D4]/10 rounded-lg text-xs leading-relaxed text-[#F1F5F9] animate-in fade-in duration-300">
                      {copilotFollowUp}
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#94A3B8] italic">
                      Click "Ask Copilot" to generate dynamic, contextual technical questions to probe the candidate deeper based on notes.
                    </p>
                  )}
                </div>
              </div>

              {/* Question Navigation Footer */}
              <div className="flex justify-between items-center border-t border-[#334155] pt-4 mt-6">
                <button
                  onClick={() => setActiveQIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQIndex === 0}
                  className="px-3.5 py-1.5 border border-[#334155] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0F172A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">navigate_before</span>
                  Previous
                </button>
                <span className="text-xs text-[#94A3B8] font-mono">
                  {activeQIndex + 1} / {questions.length}
                </span>
                <button
                  onClick={() => setActiveQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={activeQIndex === questions.length - 1}
                  className="px-3.5 py-1.5 border border-[#334155] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0F172A] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">navigate_next</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#94A3B8] italic flex-1 flex flex-col justify-center items-center">
              <span className="material-symbols-outlined text-4xl mb-2 text-[#334155]">question_mark</span>
              No questions found for this session.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
