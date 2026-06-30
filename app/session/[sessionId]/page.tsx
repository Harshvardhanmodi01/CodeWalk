'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';

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
  expected_answer?: string;
  show_expected_answer?: boolean;
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
  is_paused?: boolean;
  remaining_seconds?: number;
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

  // Ideal answer states
  const [showIdealAnswer, setShowIdealAnswer] = useState(false);
  const [idealAnswerText, setIdealAnswerText] = useState('');
  const [idealAnswerLoading, setIdealAnswerLoading] = useState(false);

  // Timer States
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);
  const [toast10Shown, setToast10Shown] = useState(false);
  const [toast5Shown, setToast5Shown] = useState(false);

  // Public candidate link copied alert
  const [copiedLink, setCopiedLink] = useState(false);

  // Ref to highlighted line for scroll
  const codeViewerRef = useRef<HTMLDivElement>(null);

  // Ref for scroll-based question navigation cooldown
  const scrollCooldownRef = useRef(false);

  const handleQuestionCardWheel = (e: React.WheelEvent) => {
    // Only trigger if vertical delta is significant to prevent accidental shifts
    if (Math.abs(e.deltaY) < 30) return;
    if (scrollCooldownRef.current) return;

    if (e.deltaY > 0) {
      // Scroll Down -> Next Question
      if (activeQIndex < questions.length - 1) {
        scrollCooldownRef.current = true;
        setActiveQIndex(prev => prev + 1);
        setTimeout(() => {
          scrollCooldownRef.current = false;
        }, 600); // 600ms transition cooldown
      }
    } else {
      // Scroll Up -> Previous Question
      if (activeQIndex > 0) {
        scrollCooldownRef.current = true;
        setActiveQIndex(prev => prev - 1);
        setTimeout(() => {
          scrollCooldownRef.current = false;
        }, 600);
      }
    }
  };

  // Auth Restoration & Reconnect States
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        setAuthChecking(false);
      }
    };
    checkSession();
  }, [router]);

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
        let remaining = 0;
        if (sessData.is_paused) {
          remaining = sessData.remaining_seconds ?? (sessData.timer_duration_minutes * 60);
        } else {
          if (sessData.remaining_seconds !== null && sessData.remaining_seconds !== undefined) {
            remaining = sessData.remaining_seconds;
          } else {
            const durationSeconds = sessData.timer_duration_minutes * 60;
            const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
            remaining = Math.max(0, durationSeconds - elapsedSeconds);
          }
        }
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

  // Auto-end interview when timer hits zero (compiled and saved report without recruiter confirmation prompt)
  const autoEndInterview = async () => {
    setLoading(true);
    try {
      toast.loading('Interview duration expired. Compiling AI summary report...', { id: 'autoend' });
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

      // 3. Update session report
      await supabase
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

      // 4. Update session status
      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          remaining_seconds: 0
        })
        .eq('id', sessionId);

      toast.success('Interview successfully completed!', { id: 'autoend' });
      router.push(`/session/${sessionId}/report`);
    } catch (err: any) {
      console.error('Auto-end failed:', err);
      toast.dismiss('autoend');
      setLoading(false);
    }
  };

  // Pause / Resume Timer
  const handlePauseResume = async () => {
    if (!session) return;
    const nextPaused = !session.is_paused;
    try {
      const updateData: any = {
        is_paused: nextPaused,
        remaining_seconds: timeLeftSeconds
      };
      if (nextPaused) {
        updateData.paused_at = new Date().toISOString();
      } else {
        updateData.paused_at = null;
      }

      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, is_paused: nextPaused } : null);
      toast.success(nextPaused ? 'Interview timer paused.' : 'Interview timer resumed.');
    } catch (err: any) {
      toast.error(`Failed to toggle timer: ${err.message}`);
    }
  };

  // Extend Timer duration
  const handleExtendTimer = async (minutes: number) => {
    if (!session) return;
    try {
      const newSeconds = timeLeftSeconds + minutes * 60;
      const { error } = await supabase
        .from('sessions')
        .update({
          remaining_seconds: newSeconds,
          timer_duration_minutes: session.timer_duration_minutes + minutes
        })
        .eq('id', sessionId);

      if (error) throw error;

      setTimeLeftSeconds(newSeconds);
      setSession(prev => prev ? {
        ...prev,
        timer_duration_minutes: prev.timer_duration_minutes + minutes
      } : null);

      // Reset toast alerts if extended beyond warnings thresholds
      if (newSeconds > 600) setToast10Shown(false);
      if (newSeconds > 300) setToast5Shown(false);
      setTimerWarning(newSeconds <= 300);

      toast.success(`Extended interview timer by ${minutes} minutes.`);
    } catch (err: any) {
      toast.error(`Failed to extend timer: ${err.message}`);
    }
  };

  // Timer countdown hook
  useEffect(() => {
    if (timeLeftSeconds <= 0 || session?.is_paused) return;

    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        const nextVal = prev - 1;
        if (nextVal <= 0) {
          clearInterval(interval);
          autoEndInterview();
          return 0;
        }

        // Warning alerts
        if (nextVal === 600 && !toast10Shown) {
          toast('Warning: 10 minutes remaining in the interview!', {
            icon: '⏰',
            style: {
              background: '#FEF3C7',
              color: '#92400E',
            },
          });
          setToast10Shown(true);
        }
        if (nextVal === 300 && !toast5Shown) {
          toast.error('Critical Warning: Only 5 minutes remaining in the interview!', {
            duration: 6000
          });
          setToast5Shown(true);
        }

        if (nextVal <= 300) {
          setTimerWarning(true);
        } else {
          setTimerWarning(false);
        }

        // Sync to database remaining_seconds every 5 seconds to reduce writes
        if (nextVal % 5 === 0) {
          supabase
            .from('sessions')
            .update({ remaining_seconds: nextVal })
            .eq('id', sessionId)
            .then(({ error }) => {
              if (error) console.error('Failed to sync remaining seconds:', error);
            });
        }

        return nextVal;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeftSeconds, session?.is_paused, toast10Shown, toast5Shown, sessionId]);

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
      // Fallback: If we have a code snippet for the current question, use it!
      const currentQ = questions[activeQIndex];
      if (currentQ && currentQ.file_path === filePath && currentQ.code_snippet) {
        setFileContent(`// Loaded from generated snippet (File not found in repo)\n\n` + currentQ.code_snippet);
      } else {
        setFileContent(`// Error loading file contents: ${err.message}`);
      }
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

    // Reset ideal answer state
    setShowIdealAnswer(false);
    setIdealAnswerText(currentQ.expected_answer || '');

    // Set snippet as immediate placeholder so code viewer is never blank
    if (currentQ.code_snippet) {
      setFileContent(currentQ.code_snippet);
    } else {
      setFileContent('');
    }

    if (currentQ.file_path && currentQ.file_path !== 'Custom Question') {
      // Auto-expand parent directories in the explorer tree
      const parts = currentQ.file_path.split('/');
      let currentPath = '';
      setExpandedDirs(prev => {
        const next = { ...prev };
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          next[currentPath] = true;
        }
        return next;
      });

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

  // Fetch Ideal Answer dynamically if not present
  const fetchIdealAnswer = async (q: Question) => {
    if (idealAnswerText) {
      setShowIdealAnswer(prev => !prev);
      return;
    }

    setIdealAnswerLoading(true);
    setShowIdealAnswer(true);
    try {
      const res = await fetch('/api/session/ideal-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.question_text,
          codeSnippet: q.code_snippet || fileContent
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch ideal answer.');
      setIdealAnswerText(data.ideal_answer);
      
      // Cache it back to the database
      supabase
        .from('questions')
        .update({ expected_answer: data.ideal_answer })
        .eq('id', q.id)
        .then(({ error }) => {
          if (error) console.warn('Failed to cache ideal answer:', error);
          else {
            // Update local questions state
            setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, expected_answer: data.ideal_answer } : item));
          }
        });
    } catch (err: any) {
      setIdealAnswerText(`Error generating ideal answer: ${err.message}`);
    } finally {
      setIdealAnswerLoading(false);
    }
  };

  // Toggle sharing of the ideal answer with the candidate
  const toggleShareAnswer = async (q: Question) => {
    const currentSharedState = !!q.show_expected_answer;
    const newSharedState = !currentSharedState;

    // Optimistically update the UI questions state
    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, show_expected_answer: newSharedState } : item));

    try {
      const { error } = await supabase
        .from('questions')
        .update({ show_expected_answer: newSharedState })
        .eq('id', q.id);

      if (error) throw error;

      toast.success(newSharedState ? 'Ideal answer shared with candidate' : 'Ideal answer hidden from candidate');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to update sharing: ${err.message}`);
      // Rollback local state
      setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, show_expected_answer: currentSharedState } : item));
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
                  className="flex items-center gap-1.5 py-1 px-1.5 rounded hover:bg-[#3b494b]/30 w-full text-left font-medium text-[#94A3B8] transition-colors"
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
                      : 'text-[#F1F5F9] hover:bg-[#3b494b]/20 hover:text-white'
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

  if (authChecking || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <h2 className="text-base font-bold text-slate-200">Reconnecting...</h2>
        <p className="text-xs font-mono text-[#94A3B8] mt-2">Restoring live interview session context...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Loading screening workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-[#151d1e] border border-[#3b494b] rounded-lg text-xs hover:bg-[#0d1515] transition-colors inline-flex items-center gap-2"
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
    <div className="flex flex-col h-screen bg-[#0d1515] text-[#F1F5F9] overflow-hidden select-none">
      {/* Session Header */}
      <header className="flex justify-between items-center px-6 py-3.5 bg-[#151d1e] border-b border-[#3b494b] z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515] transition-colors"
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

        {/* Timer Display and Controls */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-[#0d1515] border border-[#3b494b] p-1.5 rounded-lg font-mono">
            <div className="flex items-center gap-1.5 px-2">
              <span className={`material-symbols-outlined text-sm ${timerWarning ? 'text-red-500 animate-pulse' : 'text-[#06B6D4]'}`}>
                {session?.is_paused ? 'pause_circle' : 'timer'}
              </span>
              <span className={`text-sm font-bold ${timerWarning ? 'text-red-500 animate-pulse' : 'text-[#F1F5F9]'} ${session?.is_paused ? 'opacity-70' : ''}`}>
                {formatTime(timeLeftSeconds)} {session?.is_paused ? '(Paused)' : ''}
              </span>
            </div>
            
            <div className="h-4 w-px bg-[#3b494b] mx-1"></div>
            
            {/* Pause/Resume button */}
            <button
              onClick={handlePauseResume}
              className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#151d1e] transition-all"
              title={session?.is_paused ? 'Resume Timer' : 'Pause Timer'}
            >
              <span className="material-symbols-outlined text-sm font-bold">
                {session?.is_paused ? 'play_arrow' : 'pause'}
              </span>
            </button>
            
            {/* Extend buttons */}
            <button
              onClick={() => handleExtendTimer(10)}
              className="text-[10px] font-bold text-[#94A3B8] hover:text-[#06B6D4] px-1.5 py-0.5 rounded hover:bg-[#151d1e] border border-[#3b494b] transition-all"
              title="Add 10 minutes"
            >
              +10m
            </button>
            <button
              onClick={() => handleExtendTimer(15)}
              className="text-[10px] font-bold text-[#94A3B8] hover:text-[#06B6D4] px-1.5 py-0.5 rounded hover:bg-[#151d1e] border border-[#3b494b] transition-all"
              title="Add 15 minutes"
            >
              +15m
            </button>
          </div>

          <button
            onClick={copyCandidateLink}
            className={`text-xs px-3.5 py-1.5 font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 ${
              copiedLink
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#151d1e] border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {copiedLink ? 'done' : 'share'}
            </span>
            {copiedLink ? 'Copied Candidate Link!' : 'Share Candidate Screen'}
          </button>

          <button
            onClick={() => router.push(`/session/${sessionId}/code-story`)}
            className="text-xs px-3.5 py-1.5 font-bold rounded-lg bg-[#151d1e] border border-[#3b494b] text-white hover:bg-[#0d1515] transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm text-[#06B6D4]">analytics</span>
            View Code Story
          </button>

          <button
            onClick={handleEndInterview}
            className="text-xs px-4 py-1.5 font-bold bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/90 rounded-lg shadow-lg shadow-[#06B6D4]/10 transition-colors inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm font-bold">assignment_turned_in</span>
            End & Compile Report
          </button>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT WORKSPACE (60%) */}
        <div className="w-[60%] flex border-r border-[#3b494b] bg-[#0d1515] overflow-hidden">
          {/* Collapsible/Sleek File Explorer */}
          <div className="w-1/4 border-r border-[#3b494b] flex flex-col bg-[#151d1e]/60 overflow-y-auto custom-scrollbar p-3">
            <h2 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 px-1">Repository Explorer</h2>
            {treeRoot && Object.keys(treeRoot.children).length > 0 ? (
              renderTree(treeRoot)
            ) : (
              <p className="text-[10px] text-[#94A3B8] px-1 italic">No files found.</p>
            )}
          </div>

          {/* Code Viewer Panel */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1515]">
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#151d1e]/40 border-b border-[#3b494b] text-xs select-none">
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
                      (
                        // If file was not found, we loaded the fallback snippet and we should highlight all lines after the header comment
                        fileContent.startsWith('// Loaded from generated snippet')
                          ? lineNum > 2 // highlight the code lines
                          : (lineNum >= currentQuestion.line_start && lineNum <= currentQuestion.line_end)
                      );

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
                  <span className="material-symbols-outlined text-3xl mb-2 text-[#3b494b]">developer_board</span>
                  <p className="text-xs">Select a file from the repository explorer to view the code.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE (40%) */}
        <div className="w-[40%] flex flex-col bg-[#151d1e]/40 overflow-y-auto custom-scrollbar">
          
          {/* Active Question Details */}
          {currentQuestion ? (
            <div className="p-6 space-y-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Question Info card */}
                <div 
                  onWheel={handleQuestionCardWheel}
                  className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-xl space-y-4 hover:border-[#06B6D4]/40 transition-all duration-300 relative group cursor-ns-resize"
                  title="Scroll vertical here to switch questions"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#06B6D4] tracking-widest">
                      Question {activeQIndex + 1} of {questions.length}
                    </span>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 bg-[#3b494b] rounded-full text-[9px] font-bold text-[#94A3B8] uppercase">
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
                    <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1.5 bg-[#0d1515]/50 px-3 py-1.5 rounded-lg border border-[#3b494b]">
                      <span className="material-symbols-outlined text-xs">folder_open</span>
                      <span>
                        {currentQuestion.file_path} (Lines {currentQuestion.line_start}-{currentQuestion.line_end})
                      </span>
                    </div>
                  )}

                  <div className="flex justify-center pt-2.5 border-t border-[#3b494b]/60">
                    <span className="text-[9px] text-[#94A3B8] group-hover:text-[#06B6D4] font-medium flex items-center gap-1 transition-colors">
                      <span className="material-symbols-outlined text-xs animate-bounce">unfold_more</span>
                      Scroll this card to switch questions
                    </span>
                  </div>
                </div>

                {/* Ideal/Expected Answer collapsible section */}
                <div className="bg-[#151d1e]/60 border border-[#3b494b] rounded-xl p-4 shadow-lg space-y-3 transition-all duration-300">
                  <button
                    onClick={() => fetchIdealAnswer(currentQuestion)}
                    className="flex justify-between items-center w-full text-left focus:outline-none"
                  >
                    <span className="text-xs uppercase font-extrabold text-[#06B6D4] tracking-widest flex items-center gap-1.5 select-none">
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      Reveal Expected Answer key points
                    </span>
                    <span className="material-symbols-outlined text-base text-[#94A3B8] transition-transform select-none">
                      {showIdealAnswer ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
                    </span>
                  </button>

                  {showIdealAnswer && (
                    <div className="pt-2 border-t border-[#3b494b]/60 text-xs leading-relaxed text-[#94A3B8] animate-in fade-in duration-300 space-y-3">
                      {idealAnswerLoading ? (
                        <div className="flex items-center gap-2 text-[10px] text-[#94A3B8] py-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#06B6D4]"></div>
                          Generating ideal answer guide...
                        </div>
                      ) : idealAnswerText ? (
                        <>
                          <div className="whitespace-pre-line text-[#F1F5F9] bg-[#0d1515]/40 p-3 rounded-lg border border-[#3b494b]/50">
                            {idealAnswerText}
                          </div>

                          {/* Share with Candidate Controls */}
                          <div className="flex items-center justify-between pt-2 border-t border-[#3b494b]/40">
                            <span className="text-[10px] text-[#94A3B8] font-medium flex items-center gap-1.5 select-none">
                              <span className={`h-2 w-2 rounded-full ${currentQuestion.show_expected_answer ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                              {currentQuestion.show_expected_answer ? 'Currently visible to candidate' : 'Hidden from candidate'}
                            </span>
                            <button
                              onClick={() => toggleShareAnswer(currentQuestion)}
                              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md border transition-all flex items-center gap-1 ${
                                currentQuestion.show_expected_answer
                                  ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4] hover:bg-[#06B6D4]/20'
                                  : 'bg-[#0d1515] border-[#3b494b] text-[#94A3B8] hover:text-white hover:border-[#475569]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {currentQuestion.show_expected_answer ? 'visibility_off' : 'share'}
                              </span>
                              {currentQuestion.show_expected_answer ? 'Hide from Candidate' : 'Share with Candidate'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p className="italic text-[10px]">No answer guide available.</p>
                      )}
                    </div>
                  )}

                </div>

                {/* Score and Answer Log Input */}
                <div className="space-y-4 bg-[#151d1e]/80 border border-[#3b494b] rounded-xl p-5 shadow-xl">
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
                      className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] transition-colors placeholder-[#475569] h-28 custom-scrollbar resize-none"
                      placeholder="Type your notes about candidate's answer here. Updates are autosaved."
                    />
                  </div>

                  {/* Score Selector Slider */}
                  <div className="space-y-2 pt-2 border-t border-[#3b494b]">
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
                      className="w-full h-1 bg-[#0d1515] rounded-lg appearance-none cursor-pointer accent-[#06B6D4]"
                    />
                    <div className="flex justify-between text-[9px] text-[#475569] font-semibold">
                      <span>1 - Poor</span>
                      <span>5 - Satisfactory</span>
                      <span>10 - Outstanding</span>
                    </div>
                  </div>
                </div>

                {/* AI COPILOT CARD */}
                <div className="bg-gradient-to-br from-[#06B6D4]/5 to-[#0d1515] border border-[#06B6D4]/20 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-extrabold text-[#06B6D4] tracking-widest flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">auto_awesome</span>
                      AI Copilot Follow-up
                    </span>
                    <button
                      onClick={triggerCopilotFollowUp}
                      disabled={copilotLoading}
                      className="text-[10px] font-bold text-[#0d1515] bg-[#06B6D4] hover:bg-[#06B6D4]/80 disabled:bg-[#3b494b] disabled:text-[#94A3B8] px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1"
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
                    <div className="p-3 bg-[#0d1515]/50 border border-[#06B6D4]/10 rounded-lg text-xs leading-relaxed text-[#F1F5F9] animate-in fade-in duration-300">
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
              <div className="flex justify-between items-center border-t border-[#3b494b] pt-4 mt-6">
                <button
                  onClick={() => setActiveQIndex(prev => Math.max(0, prev - 1))}
                  disabled={activeQIndex === 0}
                  className="px-3.5 py-1.5 border border-[#3b494b] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0d1515] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
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
                  className="px-3.5 py-1.5 border border-[#3b494b] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0d1515] hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-all inline-flex items-center gap-1"
                >
                  Next
                  <span className="material-symbols-outlined text-sm">navigate_next</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-[#94A3B8] italic flex-1 flex flex-col justify-center items-center">
              <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
              No questions found for this session.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
