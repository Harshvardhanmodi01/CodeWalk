'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import { useGlobal } from '@/app/context/GlobalContext';
import { toast } from 'react-hot-toast';
import { seedQuestions } from '@/app/lib/seedQuestions';

interface Question {
  id: string;
  question_text: string;
  code_snippet: string;
  file_path: string;
  line_start: number;
  line_end: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  order_index: number;
  expected_answer?: string;
  show_expected_answer?: boolean;
  options?: string[];
  follow_up_questions?: string[];
  shared_answer?: string | null;
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
  interview_mode?: 'technical' | 'behavioral' | 'logical' | 'fullstack' | 'custom';
  mode_config?: any;
  behavioral_scores?: any[];
  logical_scores?: any[];
  custom_questions?: string[];
  section_scores?: any;
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
  const { user, subscription } = useGlobal();

  // Loading States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Core Data
  const [session, setSession] = useState<Session | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Tab Manager (Fullstack / Custom)
  const [activeTab, setActiveTab] = useState<'technical' | 'behavioral' | 'logical' | 'custom'>('technical');

  // Local active index for each category
  const [activeTechIdx, setActiveTechIdx] = useState(0);
  const [activeBehavioralIdx, setActiveBehavioralIdx] = useState(0);
  const [activeLogicalIdx, setActiveLogicalIdx] = useState(0);
  const [activeCustomIdx, setActiveCustomIdx] = useState(0);

  // Recruiter Inputs (mapped by question_id)
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [savingAnswer, setSavingAnswer] = useState<Record<string, boolean>>({});

  // HR Behavioral scores and traits state
  const [behavioralScores, setBehavioralScores] = useState<any[]>([]);
  const [traitTags, setTraitTags] = useState<string[]>([]);

  // Logical round timers and scoring
  const [logicalScores, setLogicalScores] = useState<any[]>([]);
  const [qTimeLeft, setQTimeLeft] = useState(120);

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
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});
  const [editingCustomQId, setEditingCustomQId] = useState<string | null>(null);
  const [editCustomText, setEditCustomText] = useState('');

  // Question Bank States
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [qbQuestions, setQbQuestions] = useState<any[]>([]);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbSearchQuery, setQbSearchQuery] = useState('');
  const [qbDebouncedSearchQuery, setQbDebouncedSearchQuery] = useState('');
  const [qbSelectedCategory, setQbSelectedCategory] = useState<'all' | 'technical' | 'behavioral' | 'logical'>('all');
  const [qbSelectedDifficulty, setQbSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [qbActiveTopic, setQbActiveTopic] = useState<any | null>(null);
  const [qbSelectedQuestions, setQbSelectedQuestions] = useState<Record<string, boolean>>({});
  const [qbAiGenerating, setQbAiGenerating] = useState(false);
  const [qbAiQuestions, setQbAiQuestions] = useState<any[]>([]);
  const [qbSaveToBankToggle, setQbSaveToBankToggle] = useState(true);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Record<string, boolean>>({});
  const [bulkSelectTopic, setBulkSelectTopic] = useState<string | null>(null);

  // Upgrade Modal States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  // Debouncing search
  useEffect(() => {
    const handler = setTimeout(() => {
      setQbDebouncedSearchQuery(qbSearchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [qbSearchQuery]);

  // Load saved question bookmarks
  const fetchSavedQuestions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_questions')
        .select('question_id')
        .eq('recruiter_id', user.id);
      
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data || []).forEach(item => {
        map[item.question_id] = true;
      });
      setSavedQuestionIds(map);
    } catch (err) {
      console.warn('Failed to load saved question references:', err);
    }
  };

  useEffect(() => {
    fetchSavedQuestions();
  }, [user]);

  const fetchQuestionBank = async () => {
    try {
      setQbLoading(true);
      const { data, error } = await supabase
        .from('question_bank')
        .select('*');
      if (error) {
        console.warn('Database fetch failed, falling back to static questions:', error);
        setQbQuestions((seedQuestions as any) || []);
      } else {
        setQbQuestions(data && data.length > 0 ? (data as any) : ((seedQuestions as any) || []));
      }
    } catch (err: any) {
      console.warn('Failed to load database question bank, using static fallback.', err);
      setQbQuestions((seedQuestions as any) || []);
    } finally {
      setQbLoading(false);
    }
  };

  const handleBookmarkToggle = async (qId: string) => {
    const plan = (subscription || 'Free').toLowerCase();
    if (plan === 'free') {
      setUpgradeMessage('Saving questions to a personal Question Bank is a Pro feature. Upgrade to build your custom templates!');
      setShowUpgradeModal(true);
      return;
    }

    const isSaved = savedQuestionIds[qId];
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_questions')
          .delete()
          .eq('recruiter_id', user?.id)
          .eq('question_id', qId);

        if (error) throw error;
        setSavedQuestionIds(prev => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
        toast.success('Removed from Question Bank');
      } else {
        const totalSaved = Object.keys(savedQuestionIds).length;
        if (plan === 'pro' && totalSaved >= 100) {
          toast.error('Pro plan limits your personal Question Bank to 100 questions. Upgrade to Enterprise for unlimited space.');
          return;
        }

        const { error } = await supabase
          .from('saved_questions')
          .insert({
            recruiter_id: user?.id,
            question_id: qId
          });

        if (error) throw error;
        setSavedQuestionIds(prev => ({
          ...prev,
          [qId]: true
        }));
        toast.success('Saved to My Question Bank');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Bookmark update failed: ' + err.message);
    }
  };
  const addQuestionToActiveSession = async (q: any) => {
    try {
      toast.loading('Adding question to current session...', { id: 'add-session-q' });
      
      const { data: sessionQs, error: fetchErr } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      if (fetchErr) throw fetchErr;

      const currentCount = sessionQs?.length || 0;

      let cat: any = q.category || 'custom';
      if (cat === 'technical') {
        cat = q.subcategory || 'frontend';
      }

      const newQRecord = {
        id: crypto.randomUUID(),
        session_id: sessionId,
        question_text: q.question_text,
        code_snippet: '',
        file_path: 'Question Bank',
        line_start: 0,
        line_end: 0,
        difficulty: q.difficulty || 'medium',
        category: cat,
        order_index: currentCount,
        show_expected_answer: false,
        expected_answer: q.expected_answer,
        shared_answer: null
      };

      const { error: insertErr } = await supabase
        .from('questions')
        .insert(newQRecord);

      if (insertErr) throw insertErr;

      // Update question_bank usage_count
      const nextUsage = (q.usage_count || 0) + 1;
      await supabase
        .from('question_bank')
        .update({ usage_count: nextUsage })
        .eq('id', q.id);

      toast.success('Question added to current interview', { id: 'add-session-q' });
      
      // Update session's questions list locally
      setQuestions(prev => [...prev, newQRecord]);
      fetchQuestionBank();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add question: ' + err.message, { id: 'add-session-q' });
    }
  };

  const addBulkQuestionsToSession = async (topicName: string, type: 'random' | 'easy' | 'medium' | 'hard' | 'all') => {
    try {
      toast.loading(`Adding ${topicName} questions to session...`, { id: 'bulk-add' });

      let topicQs = qbQuestions.filter(q => q.topic === topicName && q.created_by === null);
      if (type === 'easy' || type === 'medium' || type === 'hard') {
        topicQs = topicQs.filter(q => q.difficulty === type);
      }

      if (topicQs.length === 0) {
        toast.error(`No ${type} questions found for "${topicName}"`, { id: 'bulk-add' });
        return;
      }

      let selected: any[] = [];
      if (type === 'all') {
        selected = topicQs;
      } else {
        const shuffled = [...topicQs].sort(() => 0.5 - Math.random());
        selected = shuffled.slice(0, 5);
      }

      const { data: sessionQs, error: fetchErr } = await supabase
        .from('questions')
        .select('order_index')
        .eq('session_id', sessionId)
        .order('order_index', { ascending: true });

      if (fetchErr) throw fetchErr;

      const startingIdx = sessionQs?.length || 0;

      const newQs = selected.map((q, idx) => {
        let cat: any = q.category || 'custom';
        if (cat === 'technical') {
          cat = q.subcategory || 'frontend';
        }

        return {
          id: crypto.randomUUID(),
          session_id: sessionId,
          question_text: q.question_text,
          code_snippet: '',
          file_path: 'Question Bank',
          line_start: 0,
          line_end: 0,
          difficulty: q.difficulty || 'medium',
          category: cat,
          order_index: startingIdx + idx,
          show_expected_answer: false,
          expected_answer: q.expected_answer,
          shared_answer: null
        };
      });

      const { error: insertErr } = await supabase
        .from('questions')
        .insert(newQs);

      if (insertErr) throw insertErr;

      const incrementPromises = selected.map(q => 
        supabase
          .from('question_bank')
          .update({ usage_count: (q.usage_count || 0) + 1 })
          .eq('id', q.id)
      );
      await Promise.all(incrementPromises);

      toast.success(`${selected.length} ${topicName} questions added to interview`, { id: 'bulk-add' });
      setQuestions(prev => [...prev, ...newQs]);
      fetchQuestionBank();
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk addition failed: ' + err.message, { id: 'bulk-add' });
    }
  };
  const getTopicIcon = (topic: string) => {
    const icons: Record<string, string> = {
      "Python": "🐍", "JavaScript": "🟨", "TypeScript": "🟦", "React.js": "⚛️", 
      "Next.js": "▲", "Node.js": "🟢", "SQL/PostgreSQL": "🐘", "MongoDB": "🍃", 
      "System Design": "🏗️", "Data Structures": "📊", "Algorithms": "🧮", 
      "REST APIs": "🌐", "Docker": "🐳", "Git": "🐙", "OOPS Concepts": "📦", 
      "Operating Systems": "💻", "Computer Networks": "🔗", "Django": "🦄", 
      "Java": "☕", "CSS/Tailwind": "🎨"
    };
    return icons[topic] || "📝";
  };

  const getTopicsList = () => {
    const topicsMap: Record<string, {
      name: string;
      category: string;
      questions: any[];
      easy: number;
      medium: number;
      hard: number;
    }> = {};

    qbQuestions.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = {
          name: q.topic,
          category: q.category || 'technical',
          questions: [],
          easy: 0,
          medium: 0,
          hard: 0
        };
      }
      topicsMap[q.topic].questions.push(q);
      if (q.difficulty === 'easy') topicsMap[q.topic].easy++;
      else if (q.difficulty === 'medium') topicsMap[q.topic].medium++;
      else if (q.difficulty === 'hard') topicsMap[q.topic].hard++;
    });

    return Object.values(topicsMap);
  };

  const isTopicLocked = (topicName: string) => {
    const activePlan = (subscription || 'Free').toLowerCase();
    if (activePlan === 'pro' || activePlan === 'enterprise') return false;
    const allowed = ['Python', 'JavaScript', 'System Design'];
    return !allowed.includes(topicName);
  };

  const handleTopicClick = (topicName: string) => {
    if (isTopicLocked(topicName)) {
      setUpgradeMessage(`Unlock the "${topicName}" topic and 17+ other pre-built topics by upgrading to Pro!`);
      setShowUpgradeModal(true);
      return;
    }
    setQbActiveTopic(topicName);
  };

  const triggerAiGeneration = async () => {
    const activePlan = (subscription || 'Free').toLowerCase();
    const tokensRemaining = (user?.tokensTotal ?? 5) - (user?.tokensUsed ?? 0);
    if (activePlan !== 'enterprise' && tokensRemaining <= 0) {
      setUpgradeMessage('Insufficient token balance. Please purchase more tokens or upgrade to Pro to generate questions with AI.');
      setShowUpgradeModal(true);
      return;
    }

    try {
      setQbAiGenerating(true);
      toast.loading(`Deducting credit & generating 10 questions for "${qbSearchQuery}"...`, { id: 'ai-gen' });

      const res = await fetch('/api/questions/topic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: qbSearchQuery,
          difficulty: qbSelectedDifficulty === 'all' ? 'mixed' : qbSelectedDifficulty,
          count: 10
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const generatedQs = data.questions || [];
      setQbAiQuestions(generatedQs);
      
      // Deduct 1 token
      if (activePlan !== 'enterprise' && user) {
        const nextUsed = (user.tokensUsed || 0) + 1;
        await supabase
          .from('profiles')
          .update({ tokens_used: nextUsed })
          .eq('id', user.id);
      }

      // Save to question_bank with is_ai_generated: true, is_verified: false
      const questionsToSave = generatedQs.map((q: any) => ({
        topic: qbSearchQuery,
        category: q.category || 'technical',
        subcategory: q.subcategory || 'custom',
        question_text: q.question_text,
        difficulty: q.difficulty || 'medium',
        expected_answer: q.expected_answer,
        tags: q.tags || [],
        is_ai_generated: true,
        is_verified: false,
        created_by: null,
        usage_count: 0,
        avg_score: 0.0
      }));

      const { data: savedRecords, error: saveErr } = await supabase
        .from('question_bank')
        .insert(questionsToSave)
        .select('id');

      if (saveErr) {
        console.error('Failed to save generated questions to DB:', saveErr);
        toast.error('Questions generated, but failed to save to database library.', { id: 'ai-gen' });
      } else {
        toast.success(`Generated 10 questions for "${qbSearchQuery}"`, { id: 'ai-gen' });

        // Save bookmarks if selected
        if (qbSaveToBankToggle && user && savedRecords && savedRecords.length > 0) {
          const bookmarks = savedRecords.map(r => ({
            recruiter_id: user.id,
            question_id: r.id
          }));
          await supabase.from('saved_questions').insert(bookmarks);
          await fetchSavedQuestions();
        }

        const targetTopic = qbSearchQuery;
        setQbSearchQuery(''); // Clear search so topic is visible
        await fetchQuestionBank(); // Reload library
        handleTopicClick(targetTopic); // Instantly open slide-over panel for the new questions!
      }
    } catch (err: any) {
      console.error(err);
      toast.error('AI generation failed: ' + err.message, { id: 'ai-gen' });
    } finally {
      setQbAiGenerating(false);
    }
  };

  const addSelectedQuestionsToSession = async () => {
    const selectedIds = Object.keys(qbSelectedQuestions).filter(id => qbSelectedQuestions[id]);
    let selectedQs: any[] = [];
    
    if (qbAiQuestions.length > 0) {
      selectedQs = qbAiQuestions.filter(q => qbSelectedQuestions[q.question_text]);
    } else {
      selectedQs = qbQuestions.filter(q => selectedIds.includes(q.id));
    }

    if (selectedQs.length === 0) {
      toast.error('No questions selected.');
      return;
    }

    // Free plan constraint: Max 5 questions per topic per interview
    const plan = (subscription || 'Free').toLowerCase();
    if (plan === 'free') {
      const topicCounts: Record<string, number> = {};
      
      questions.forEach(q => {
        if (q.file_path === 'Question Bank') {
          // If we categorized the injected questions, increment
          // We map topic to category or similar in the queue
          topicCounts[q.category] = (topicCounts[q.category] || 0) + 1;
        }
      });

      let exceeded = false;
      let exceededTopic = '';
      
      selectedQs.forEach(q => {
        const t = q.topic;
        topicCounts[t] = (topicCounts[t] || 0) + 1;
        if (topicCounts[t] > 5) {
          exceeded = true;
          exceededTopic = t;
        }
      });

      if (exceeded) {
        setUpgradeMessage(`Free plan tier limits you to a maximum of 5 questions per topic. Upgrade to Pro to add unlimited questions from "${exceededTopic}"!`);
        setShowUpgradeModal(true);
        return;
      }
    }

    // Queue Injection logic
    const activeQ = questions[activeQIndex];
    
    const newSessionQs = selectedQs.map(q => {
      let cat: any = q.category || 'custom';
      if (cat === 'technical') {
        cat = q.subcategory || 'frontend';
      }

      return {
        id: crypto.randomUUID(),
        session_id: sessionId,
        question_text: q.question_text,
        code_snippet: q.code_snippet || '',
        file_path: 'Question Bank', // Amber badge indicator
        line_start: 0,
        line_end: 0,
        difficulty: q.difficulty || 'medium',
        category: cat,
        order_index: 0,
        expected_answer: q.expected_answer,
        options: q.options || [],
        show_expected_answer: false,
        shared_answer: null
      };
    });

    const updatedQs = [...questions];
    updatedQs.splice(activeQIndex + 1, 0, ...newSessionQs);

    const finalQs = updatedQs.map((q, idx) => ({
      ...q,
      order_index: idx
    }));

    try {
      toast.loading('Saving questions to session...', { id: 'save-qs' });
      
      const { error } = await supabase
        .from('questions')
        .upsert(finalQs.map(q => ({
          id: q.id,
          session_id: sessionId,
          question_text: q.question_text,
          code_snippet: q.code_snippet,
          file_path: q.file_path,
          line_start: q.line_start,
          line_end: q.line_end,
          difficulty: q.difficulty,
          category: q.category,
          expected_answer: q.expected_answer,
          options: q.options,
          order_index: q.order_index,
          show_expected_answer: q.show_expected_answer,
          shared_answer: q.shared_answer
        })));

      if (error) throw error;
      
      setQuestions(finalQs);
      toast.success(`${newSessionQs.length} questions added to interview!`, { id: 'save-qs' });
      setShowQuestionBankModal(false);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add questions to session: ' + err.message, { id: 'save-qs' });
    }
  };

  // Timer States
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerWarning, setTimerWarning] = useState(false);
  const [toast10Shown, setToast10Shown] = useState(false);
  const [toast5Shown, setToast5Shown] = useState(false);

  // Public candidate link copied alert
  const [copiedLink, setCopiedLink] = useState(false);

  const codeViewerRef = useRef<HTMLDivElement>(null);

  // Load session, candidate, and questions
  useEffect(() => {
    if (!sessionId) return;

    const loadSessionData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Session
        const { data: sess, error: sessErr } = await supabase
          .from('sessions')
          .select('*')
          .eq('id', sessionId)
          .single();

        if (sessErr || !sess) throw new Error(sessErr?.message || 'Session not found');
        
        setSession(sess);
        setBehavioralScores(sess.behavioral_scores || []);
        setLogicalScores(sess.logical_scores || []);
        setTraitTags(sess.mode_config?.traitTags || []);

        if (sess.status === 'completed') {
          toast.error('This interview has already been completed.');
          router.push(`/session/${sessionId}/report`);
          return;
        }

        // Initialize overall countdown timer
        const timerDuration = sess.remaining_seconds !== undefined && sess.remaining_seconds !== null
          ? sess.remaining_seconds
          : sess.timer_duration_minutes * 60;
        setTimeLeftSeconds(timerDuration);
        setTimerWarning(timerDuration <= 300);

        // 2. Fetch Candidate
        const { data: cand, error: candErr } = await supabase
          .from('candidates')
          .select('*')
          .eq('id', sess.candidate_id)
          .single();

        if (candErr) throw candErr;
        setCandidate(cand);

        // 3. Fetch Questions
        const { data: qs, error: qsErr } = await supabase
          .from('questions')
          .select('*')
          .eq('session_id', sessionId)
          .order('order_index', { ascending: true });

        if (qsErr) throw qsErr;
        setQuestions(qs || []);

        // 4. Fetch Answers (to prefill notes/scores)
        const { data: ans, error: ansErr } = await supabase
          .from('answers')
          .select('*')
          .eq('session_id', sessionId);

        if (ansErr) console.warn('Could not fetch existing answers:', ansErr);
        
        if (ans && ans.length > 0) {
          const notesMap: Record<string, string> = {};
          const scoresMap: Record<string, number> = {};
          ans.forEach(a => {
            notesMap[a.question_id] = a.answer_text;
            scoresMap[a.question_id] = a.ai_score;
          });
          setNotes(notesMap);
          setScores(scoresMap);
        }

        // 5. Fetch GitHub file explorer (if repository URL exists)
        if (sess.repo_url) {
          try {
            const repoParts = sess.repo_url.replace('https://github.com/', '').split('/');
            const owner = repoParts[0];
            const repoName = repoParts[1];

            const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/main?recursive=1`);
            if (res.ok) {
              const data = await res.json();
              if (data.tree) {
                setFlatTree(data.tree);
                buildFileTree(data.tree);
              }
            }
          } catch (treeErr) {
            console.error('Failed to build GitHub repo tree explorer:', treeErr);
          }
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred during live session init.');
      } finally {
        setLoading(false);
      }
    };

    loadSessionData();
  }, [sessionId, router]);

  // Set initial active tab based on interview mode and question counts
  useEffect(() => {
    if (questions.length > 0 && session) {
      if (session.interview_mode === 'behavioral') {
        setActiveTab('behavioral');
      } else if (session.interview_mode === 'logical') {
        setActiveTab('logical');
      } else if (session.interview_mode === 'custom') {
        const config = session.mode_config?.customSections || {};
        if (config.technical) setActiveTab('technical');
        else if (config.behavioral) setActiveTab('behavioral');
        else if (config.logical) setActiveTab('logical');
        else if (config.custom) setActiveTab('custom');
      } else if (session.interview_mode === 'fullstack') {
        setActiveTab('technical');
      }
    }
  }, [questions, session]);

  // Setup per-question timer for Logical round
  const getLogicalDuration = () => {
    return (session?.mode_config?.logicalTimerMinutes || 2) * 60;
  };

  useEffect(() => {
    const isLogicalActive = session?.interview_mode === 'logical' || 
      (session?.interview_mode === 'fullstack' && activeTab === 'logical') ||
      (session?.interview_mode === 'custom' && activeTab === 'logical');

    if (!isLogicalActive || session?.is_paused || qTimeLeft <= 0 || loading) return;

    const qInterval = setInterval(() => {
      setQTimeLeft(prev => {
        const nextVal = prev - 1;
        if (nextVal <= 0) {
          clearInterval(qInterval);
          handleLogicalTimeExpired();
          return 0;
        }
        return nextVal;
      });
    }, 1000);

    return () => clearInterval(qInterval);
  }, [qTimeLeft, session, activeTab, loading]);

  // Reset logical question timer when index changes
  useEffect(() => {
    setQTimeLeft(getLogicalDuration());
  }, [activeLogicalIdx, activeTab]);

  // Handle Logical question timer expiration
  const handleLogicalTimeExpired = async () => {
    const logicalQs = questions.filter(q => ['logical', 'number-series', 'pattern-recognition', 'logical-deduction', 'situational-judgement', 'verbal-reasoning'].includes(q.category));
    if (logicalQs.length === 0) return;
    
    const curQ = logicalQs[activeLogicalIdx];
    if (!curQ) return;

    toast.error(`Time expired for Question ${activeLogicalIdx + 1}!`);
    await handleLogicalResultChange(curQ.id, 'time_expired', 'Candidate failed to respond within the designated question limit.');

    if (activeLogicalIdx < logicalQs.length - 1) {
      setActiveLogicalIdx(prev => prev + 1);
    }
  };

  // Categorized questions arrays
  const getTechnicalQs = () => questions.filter(q => ['frontend', 'backend', 'dsa', 'system-design'].includes(q.category));
  const getBehavioralQs = () => questions.filter(q => ['behavioral', 'teamwork', 'leadership', 'conflict-resolution', 'career-goals', 'culture-fit'].includes(q.category));
  const getLogicalQs = () => questions.filter(q => ['logical', 'number-series', 'pattern-recognition', 'logical-deduction', 'situational-judgement', 'verbal-reasoning'].includes(q.category));
  const getCustomQs = () => questions.filter(q => q.category === 'custom');

  // Verify section existence
  const hasTechSection = () => {
    if (session?.interview_mode === 'technical' || session?.interview_mode === 'fullstack') return true;
    if (session?.interview_mode === 'custom') return !!session.mode_config?.customSections?.technical;
    return false;
  };
  const hasBehSection = () => {
    if (session?.interview_mode === 'behavioral' || session?.interview_mode === 'fullstack') return true;
    if (session?.interview_mode === 'custom') return !!session.mode_config?.customSections?.behavioral;
    return false;
  };
  const hasLogSection = () => {
    if (session?.interview_mode === 'logical' || session?.interview_mode === 'fullstack') return true;
    if (session?.interview_mode === 'custom') return !!session.mode_config?.customSections?.logical;
    return false;
  };
  const hasCustSection = () => {
    if (session?.interview_mode === 'custom') return !!session.mode_config?.customSections?.custom;
    return false;
  };

  // Helper to get active question based on tab
  const getActiveQuestion = () => {
    if (session?.interview_mode === 'technical') return questions[activeQIndex];
    if (session?.interview_mode === 'behavioral') return questions[activeQIndex];
    if (session?.interview_mode === 'logical') return questions[activeQIndex];
    
    if (activeTab === 'technical') return getTechnicalQs()[activeTechIdx];
    if (activeTab === 'behavioral') return getBehavioralQs()[activeBehavioralIdx];
    if (activeTab === 'logical') return getLogicalQs()[activeLogicalIdx];
    if (activeTab === 'custom') return getCustomQs()[activeCustomIdx];
    return null;
  };

  // Build Folder File Tree nodes
  const buildFileTree = (tree: any[]) => {
    const root: FileTreeNode = { name: 'root', path: '', type: 'dir', children: {} };
    tree.forEach(item => {
      const parts = item.path.split('/');
      let current = root;
      parts.forEach((part: string, idx: number) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            path: parts.slice(0, idx + 1).join('/'),
            type: idx === parts.length - 1 ? (item.type === 'tree' ? 'dir' : 'file') : 'dir',
            children: {}
          };
        }
        current = current.children[part];
      });
    });
    setTreeRoot(root);
  };

  // Auto-save remaining seconds to DB on tick
  useEffect(() => {
    if (timeLeftSeconds <= 0 || session?.is_paused || loading) return;

    const interval = setInterval(async () => {
      setTimeLeftSeconds(prev => {
        const nextVal = prev - 1;
        if (nextVal <= 0) {
          clearInterval(interval);
          autoEndInterview();
          return 0;
        }

        // Warning alerts
        if (nextVal === 600 && !toast10Shown) {
          toast('Warning: 10 minutes remaining!', { icon: '⏰', style: { background: '#FEF3C7', color: '#92400E' } });
          setToast10Shown(true);
        }
        if (nextVal === 300 && !toast5Shown) {
          toast.error('Critical Warning: Only 5 minutes remaining!');
          setToast5Shown(true);
        }
        if (nextVal <= 300) setTimerWarning(true);

        return nextVal;
      });

      // Write to DB every 10 seconds to throttle database workload
      if (timeLeftSeconds % 10 === 0) {
        await supabase
          .from('sessions')
          .update({ remaining_seconds: timeLeftSeconds })
          .eq('id', sessionId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeftSeconds, session, loading, toast10Shown, toast5Shown]);

  // Load file content when a question is selected or manual navigation
  const activeQuestion = getActiveQuestion();
  useEffect(() => {
    if (activeQuestion && activeQuestion.file_path && activeQuestion.file_path !== 'Custom Question' && activeQuestion.file_path !== 'Behavioral' && activeQuestion.file_path !== 'Logical') {
      loadFileContent(activeQuestion.file_path);
    }
  }, [activeQuestion]);

  const loadFileContent = async (path: string) => {
    if (!session || !path) return;
    setFetchingContent(true);
    setSelectedFilePath(path);
    try {
      const repoParts = session.repo_url.replace('https://github.com/', '').split('/');
      const owner = repoParts[0];
      const repoName = repoParts[1];

      const treeNode = flatTree.find(node => node.path === path);
      if (treeNode && treeNode.url) {
        const res = await fetch(treeNode.url);
        if (res.ok) {
          const fileData = await res.json();
          if (fileData.content) {
            const decoded = atob(fileData.content.replace(/\n/g, ''));
            setFileContent(decoded);
            return;
          }
        }
      }
      
      // Fallback: fetch raw contents
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repoName}/main/${path}`);
      if (rawRes.ok) {
        const content = await rawRes.text();
        setFileContent(content);
      } else {
        // Render expected code snippet context inside file explorer as fallback
        const q = getActiveQuestion();
        if (q && q.file_path === path && q.code_snippet) {
          setFileContent(`// Loaded from generated snippet (File repository access blocked or fallback)\n\n${q.code_snippet}`);
        } else {
          setFileContent(`// Failed to fetch contents for: ${path}\nPlease select another file.`);
        }
      }
    } catch {
      setFileContent(`// Error loading file content from GitHub.\n// Check connection or repository access.`);
    } finally {
      setFetchingContent(false);
    }
  };

  // AI Copilot context analysis prompt trigger
  const triggerCopilotFollowUp = async () => {
    const q = getActiveQuestion();
    if (!q) return;

    setCopilotLoading(true);
    setCopilotFollowUp('');
    try {
      const res = await fetch('/api/session/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.question_text,
          codeSnippet: q.code_snippet,
          recruiterNotes: notes[q.id] || ''
        })
      });
      const data = await res.json();
      if (res.ok) {
        setCopilotFollowUp(data.followUp || 'No follow-up suggestions generated.');
      } else {
        toast.error('Copilot failed: ' + data.error);
      }
    } catch (err: any) {
      toast.error('Copilot request failed: ' + err.message);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Fetch AI Ideal answer key guide
  const fetchIdealAnswer = async (q: Question) => {
    if (showIdealAnswer) {
      setShowIdealAnswer(false);
      return;
    }
    
    setShowIdealAnswer(true);
    if (idealAnswerText && activeQuestion?.id === q.id) return;
    
    setIdealAnswerLoading(true);
    setIdealAnswerText('');
    try {
      const res = await fetch('/api/session/ideal-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: q.question_text,
          codeSnippet: q.code_snippet,
          expectedAnswer: q.expected_answer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIdealAnswerText(data.idealAnswer || 'No details generated.');
      } else {
        setIdealAnswerText('Failed to generate guide key: ' + data.error);
      }
    } catch (err: any) {
      setIdealAnswerText('Request failed: ' + err.message);
    } finally {
      setIdealAnswerLoading(false);
    }
  };

  const getSharedAnswerText = (q: any, mode: string) => {
    if (!q.expected_answer) return 'Guide not available.';

    let parsed = q.expected_answer;
    if (typeof q.expected_answer === 'string') {
      try {
        parsed = JSON.parse(q.expected_answer);
      } catch {
        return q.expected_answer;
      }
    }

    const category = q.category || '';

    // If it's technical question format
    if (mode === 'technical' || ['frontend', 'backend', 'dsa', 'system-design'].includes(category)) {
      const approach = parsed.correct_approach || '';
      const concepts = Array.isArray(parsed.key_concepts) ? parsed.key_concepts.map((c: string) => `• ${c}`).join('\n') : '';
      return `Correct Approach:\n${approach}\n\nKey Concepts to consider:\n${concepts}`;
    }

    // If it's behavioral format
    if (mode === 'behavioral' || ['teamwork', 'leadership', 'conflict-resolution', 'career-goals', 'culture-fit', 'behavioral'].includes(category)) {
      const star = parsed.star_format || 'Use the STAR methodology: Situation, Task, Action, and Result.';
      return `STAR Structure Reminder:\n${star}`;
    }

    // If it's logical format
    if (mode === 'logical' || ['number-series', 'pattern-recognition', 'logical-deduction', 'situational-judgement', 'verbal-reasoning'].includes(category)) {
      const step1 = Array.isArray(parsed.step_by_step) ? parsed.step_by_step[0] : 'Work through the problem step by step.';
      return `Logical Hint:\n${step1}`;
    }

    // Custom Mode format
    if (mode === 'custom' || category === 'custom') {
      return parsed.ideal_answer_summary || parsed.idealAnswerSummary || (typeof parsed === 'string' ? parsed : 'Review candidate response based on expectations.');
    }

    return 'No guide available.';
  };

  // Toggle Sharing ideal answer with candidate
  const toggleShareAnswer = async (q: Question) => {
    const currentSharedState = !!q.show_expected_answer;
    const newSharedState = !currentSharedState;

    const sharedText = newSharedState ? getSharedAnswerText(q, session?.interview_mode || 'technical') : null;

    setQuestions(prev => prev.map(item => item.id === q.id ? { 
      ...item, 
      show_expected_answer: newSharedState,
      shared_answer: sharedText
    } : item));

    try {
      const { error } = await supabase
        .from('questions')
        .update({ 
          show_expected_answer: newSharedState,
          shared_answer: sharedText
        })
        .eq('id', q.id);

      if (error) throw error;
      toast.success(newSharedState ? 'Hint/guide shared with candidate' : 'Shared hint/guide hidden from candidate');
    } catch (err: any) {
      console.error(err);
      toast.error(`Failed to update sharing: ${err.message}`);
      setQuestions(prev => prev.map(item => item.id === q.id ? { 
        ...item, 
        show_expected_answer: currentSharedState
      } : item));
    }
  };

  const saveCustomExpectedAnswer = async (qId: string, currentParsedJSON: any) => {
    const updatedJSON = {
      ...currentParsedJSON,
      ideal_answer_summary: editCustomText
    };

    setQuestions(prev => prev.map(item => item.id === qId ? { ...item, expected_answer: updatedJSON } : item));
    setEditingCustomQId(null);

    try {
      const { error } = await supabase
        .from('questions')
        .update({ expected_answer: updatedJSON })
        .eq('id', qId);
      if (error) throw error;
      toast.success('Expected answer updated successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save updated expected answer: ' + err.message);
    }
  };

  const renderExpectedAnswerCard = (q: Question) => {
    if (!q.expected_answer) {
      return <p className="italic text-[10px] text-red-400">Expected answer not available.</p>;
    }

    let parsed: any = q.expected_answer;
    if (typeof q.expected_answer === 'string') {
      try {
        parsed = JSON.parse(q.expected_answer);
      } catch {
        return (
          <div className="whitespace-pre-line text-[#F1F5F9] bg-[#0d1515]/40 p-3 rounded-lg border border-[#3b494b]/50">
            {q.expected_answer}
          </div>
        );
      }
    }

    const mode = session?.interview_mode || 'technical';
    let format = 'custom';
    const category = q.category || '';

    if (mode === 'technical' || ['frontend', 'backend', 'dsa', 'system-design'].includes(category)) {
      format = 'technical';
    } else if (mode === 'behavioral' || ['teamwork', 'leadership', 'conflict-resolution', 'career-goals', 'culture-fit', 'behavioral'].includes(category)) {
      format = 'behavioral';
    } else if (mode === 'logical' || ['number-series', 'pattern-recognition', 'logical-deduction', 'situational-judgement', 'verbal-reasoning'].includes(category)) {
      format = 'logical';
    }

    if (format === 'technical') {
      return (
        <div className="space-y-3 bg-[#0d1515]/60 p-4 rounded-xl border border-[#06B6D4]/30 select-text">
          <div className="flex justify-between items-center pb-2 border-b border-[#3b494b]/40">
            <h4 className="text-xs font-bold text-[#06B6D4]">AI Expected Answer Guide</h4>
            <span className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[8px] font-bold text-[#06B6D4] rounded">For Recruiter Reference Only</span>
          </div>
          
          <div className="space-y-2.5 text-xs text-[#b9cacb]">
            <div>
              <strong className="text-white block mb-0.5">Ideal Explanation:</strong>
              <p className="leading-relaxed">{parsed.ideal_explanation || 'No details provided.'}</p>
            </div>
            
            {parsed.key_concepts && parsed.key_concepts.length > 0 && (
              <div>
                <strong className="text-white block mb-1">Key Concepts to Listen For:</strong>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {parsed.key_concepts.map((concept: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded text-[9px] font-semibold text-[#06B6D4]">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <strong className="text-white block mb-0.5">Correct Approach:</strong>
              <p className="leading-relaxed">{parsed.correct_approach || 'No details provided.'}</p>
            </div>
            
            <div>
              <strong className="text-white block mb-0.5">Follow-up if they struggle:</strong>
              <p className="leading-relaxed italic text-cyan-300">"{parsed.follow_up_if_struggle || 'Ask the candidate to explain their choice.'}"</p>
            </div>

            {parsed.red_flags && parsed.red_flags.length > 0 && (
              <div>
                <strong className="text-red-400 block mb-1">Red Flags:</strong>
                <ul className="list-disc pl-4 space-y-1 text-red-400/90 text-[11px]">
                  {parsed.red_flags.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (format === 'behavioral') {
      return (
        <div className="space-y-3 bg-[#0d1515]/60 p-4 rounded-xl border border-purple-500/30 select-text">
          <div className="flex justify-between items-center pb-2 border-b border-[#3b494b]/40">
            <h4 className="text-xs font-bold text-purple-400">STAR Answer Guide</h4>
            <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 text-[8px] font-bold text-purple-400 rounded">For Recruiter Reference Only</span>
          </div>

          <div className="space-y-2.5 text-xs text-[#b9cacb]">
            <div>
              <strong className="text-white block mb-0.5">STAR Format Expected Answer:</strong>
              <p className="leading-relaxed">{parsed.star_format || 'No details provided.'}</p>
            </div>

            {parsed.key_phrases && parsed.key_phrases.length > 0 && (
              <div>
                <strong className="text-white block mb-1">Key Phrases to Listen For:</strong>
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {parsed.key_phrases.map((phrase: string, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/20 rounded text-[9px] font-semibold text-purple-400">
                      {phrase}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {parsed.red_flags && parsed.red_flags.length > 0 && (
              <div>
                <strong className="text-red-400 block mb-1">Red Flags:</strong>
                <ul className="list-disc pl-4 space-y-1 text-red-400/90 text-[11px]">
                  {parsed.red_flags.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (format === 'logical') {
      return (
        <div className="space-y-3 bg-[#0d1515]/60 p-4 rounded-xl border border-orange-500/30 select-text">
          <div className="flex justify-between items-center pb-2 border-b border-[#3b494b]/40">
            <h4 className="text-xs font-bold text-orange-400">Solution Guide</h4>
            <span className="px-2 py-0.5 bg-orange-500/10 border border-orange-500/30 text-[8px] font-bold text-orange-400 rounded">For Recruiter Reference Only</span>
          </div>

          <div className="space-y-2.5 text-xs text-[#b9cacb]">
            <div>
              <strong className="text-white block mb-0.5">Correct Answer:</strong>
              <p className="leading-relaxed font-semibold text-orange-300">{parsed.correct_answer || 'No details provided.'}</p>
            </div>

            {parsed.step_by_step && parsed.step_by_step.length > 0 && (
              <div>
                <strong className="text-white block mb-1">Step-by-Step Reasoning:</strong>
                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                  {parsed.step_by_step.map((step: string, idx: number) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>
            )}

            {parsed.common_mistakes && parsed.common_mistakes.length > 0 && (
              <div>
                <strong className="text-white block mb-1">Common Wrong Approaches:</strong>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  {parsed.common_mistakes.map((mistake: string, idx: number) => (
                    <li key={idx}>{mistake}</li>
                  ))}
                </ul>
              </div>
            )}

            {parsed.time_guide_seconds && (
              <div>
                <strong className="text-white block mb-0.5">Time Guide:</strong>
                <p className="leading-relaxed text-[11px]">Candidate should solve this question within <span className="font-bold text-orange-400">{Math.floor(parsed.time_guide_seconds / 60)}m {parsed.time_guide_seconds % 60}s</span>.</p>
              </div>
            )}

            {parsed.red_flags && parsed.red_flags.length > 0 && (
              <div>
                <strong className="text-red-400 block mb-1">Red Flags:</strong>
                <ul className="list-disc pl-4 space-y-1 text-red-400/90 text-[11px]">
                  {parsed.red_flags.map((flag: string, idx: number) => (
                    <li key={idx}>{flag}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }

    const isEditing = editingCustomQId === q.id;

    return (
      <div className="space-y-3 bg-[#0d1515]/60 p-4 rounded-xl border border-emerald-500/30 select-text">
        <div className="flex justify-between items-center pb-2 border-b border-[#3b494b]/40">
          <h4 className="text-xs font-bold text-emerald-400">Solution Guide</h4>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (isEditing) {
                  saveCustomExpectedAnswer(q.id, parsed);
                } else {
                  setEditingCustomQId(q.id);
                  setEditCustomText(parsed.ideal_answer_summary || parsed.idealAnswerSummary || (typeof parsed === 'string' ? parsed : ''));
                }
              }}
              className="p-1 hover:text-emerald-400 text-[#94A3B8] transition-colors cursor-pointer"
              title={isEditing ? "Save changes" : "Edit expected answer"}
            >
              <span className="material-symbols-outlined text-sm font-bold">{isEditing ? "save" : "edit"}</span>
            </button>
            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-bold text-emerald-400 rounded">For Recruiter Reference Only</span>
          </div>
        </div>

        <div className="space-y-2.5 text-xs text-[#b9cacb]">
          <div>
            <strong className="text-white block mb-0.5">Ideal Answer Summary:</strong>
            {isEditing ? (
              <textarea
                value={editCustomText}
                onChange={(e) => setEditCustomText(e.target.value)}
                className="w-full bg-[#151d1e] border border-[#3b494b] p-2 rounded text-xs text-white focus:outline-none focus:border-emerald-400 mt-1 h-20"
              />
            ) : (
              <p className="leading-relaxed">{parsed.ideal_answer_summary || parsed.idealAnswerSummary || (typeof parsed === 'string' ? parsed : 'No details provided.')}</p>
            )}
          </div>

          {parsed.key_points && parsed.key_points.length > 0 && (
            <div>
              <strong className="text-white block mb-1">Key Points to Listen For:</strong>
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {parsed.key_points.map((point: string, idx: number) => (
                  <span key={idx} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-semibold text-emerald-400">
                    {point}
                  </span>
                ))}
              </div>
            </div>
          )}

          {parsed.red_flags && parsed.red_flags.length > 0 && (
            <div>
              <strong className="text-red-400 block mb-1">Red Flags:</strong>
              <ul className="list-disc pl-4 space-y-1 text-red-400/90 text-[11px]">
                {parsed.red_flags.map((flag: string, idx: number) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderExpectedAnswerCollapsible = (q: Question, colorClass: string, outlineBorderClass: string, badgeBgClass: string) => {
    const isRevealed = !!revealedQuestions[q.id];
    const isShared = !!q.show_expected_answer;

    return (
      <div className="bg-[#151d1e]/60 border border-[#3b494b] rounded-xl p-4 shadow-lg space-y-3 mt-4">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => setRevealedQuestions(prev => ({ ...prev, [q.id]: !prev[q.id] }))} 
            className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest bg-transparent border px-3 py-1.5 rounded-lg transition-all ${outlineBorderClass} ${colorClass} cursor-pointer`}
          >
            <span className="material-symbols-outlined text-[15px]">{isRevealed ? 'visibility_off' : 'visibility'}</span>
            {isRevealed ? 'Hide Expected Answer' : 'View Expected Answer'}
          </button>
          
          <button 
            onClick={() => toggleShareAnswer(q)} 
            className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border border-[#3b494b] hover:text-white transition-all inline-flex items-center gap-1.5 cursor-pointer relative ${
              isShared ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'text-[#94A3B8] hover:bg-[#0d1515]'
            }`}
          >
            {isShared && (
              <span className="flex h-2 w-2 relative mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span className="material-symbols-outlined text-[15px]">{isShared ? 'cancel' : 'share'}</span>
            {isShared ? 'Stop Sharing' : 'Share with Candidate'}
          </button>
        </div>

        {isRevealed && (
          <div className="pt-2 border-t border-[#3b494b]/60">
            {renderExpectedAnswerCard(q)}
          </div>
        )}
      </div>
    );
  };

  // Update answer in Supabase (notes or score ratings)
  const saveAnswerState = async (qId: string, text: string, score: number) => {
    if (!sessionId) return;
    setSavingAnswer(prev => ({ ...prev, [qId]: true }));
    try {
      const { data: existing, error: findErr } = await supabase
        .from('answers')
        .select('id')
        .eq('session_id', sessionId)
        .eq('question_id', qId)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing) {
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
    } catch (err: any) {
      console.error('Answer autosave failed:', err);
    } finally {
      setSavingAnswer(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleNotesChange = (text: string) => {
    const q = getActiveQuestion();
    if (!q) return;
    setNotes(prev => ({ ...prev, [q.id]: text }));
    saveAnswerState(q.id, text, scores[q.id] || 5);
  };

  const handleScoreChange = (score: number) => {
    const q = getActiveQuestion();
    if (!q) return;
    setScores(prev => ({ ...prev, [q.id]: score }));
    saveAnswerState(q.id, notes[q.id] || '', score);
  };

  // Behavioral Round scoring changes
  const handleBehavioralRatingChange = async (qId: string, field: 'communication' | 'communication_notes' | 'confidence' | 'relevance' | 'notes', val: any) => {
    const updated = [...behavioralScores];
    const idx = updated.findIndex(item => item.question_id === qId);
    const currentItem = idx >= 0 ? { ...updated[idx] } : { question_id: qId, communication: 5, confidence: 5, relevance: 5, notes: '' };

    currentItem[field] = val;

    if (idx >= 0) {
      updated[idx] = currentItem;
    } else {
      updated.push(currentItem);
    }
    setBehavioralScores(updated);

    // Save in answers table
    const avgScore = Math.round((currentItem.communication + currentItem.confidence + currentItem.relevance) / 3);
    setScores(prev => ({ ...prev, [qId]: avgScore }));
    setNotes(prev => ({ ...prev, [qId]: currentItem.notes }));
    await saveAnswerState(qId, currentItem.notes, avgScore);

    // Save in sessions table
    await supabase
      .from('sessions')
      .update({ behavioral_scores: updated })
      .eq('id', sessionId);
  };

  // Logical Round scoring changes
  const handleLogicalResultChange = async (qId: string, result: 'correct' | 'partially_correct' | 'incorrect' | 'skipped' | 'time_expired', notesVal?: string) => {
    const updated = [...logicalScores];
    const idx = updated.findIndex(item => item.question_id === qId);
    const currentItem = idx >= 0 ? { ...updated[idx] } : { question_id: qId, result: 'skipped', notes: '' };

    if (result) currentItem.result = result;
    if (notesVal !== undefined) currentItem.notes = notesVal;

    if (idx >= 0) {
      updated[idx] = currentItem;
    } else {
      updated.push(currentItem);
    }
    setLogicalScores(updated);

    // Score mappings: Correct=10, Partially=5, Incorrect/Skipped=0
    let score = 0;
    if (currentItem.result === 'correct') score = 10;
    else if (currentItem.result === 'partially_correct') score = 5;

    setScores(prev => ({ ...prev, [qId]: score }));
    setNotes(prev => ({ ...prev, [qId]: currentItem.notes }));
    await saveAnswerState(qId, currentItem.notes || currentItem.result, score);

    // Save in sessions table
    await supabase
      .from('sessions')
      .update({ logical_scores: updated })
      .eq('id', sessionId);
  };

  // Trait tags updates for behavioral scoring
  const handleToggleTrait = async (tag: string) => {
    let nextTags = [...traitTags];
    if (nextTags.includes(tag)) {
      nextTags = nextTags.filter(t => t !== tag);
    } else {
      nextTags.push(tag);
    }
    setTraitTags(nextTags);

    await supabase
      .from('sessions')
      .update({
        mode_config: {
          ...session?.mode_config,
          traitTags: nextTags
        }
      })
      .eq('id', sessionId);
  };

  // autoEndInterview on countdown end
  const autoEndInterview = async () => {
    try {
      const consolidatedAnswers = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        file_path: q.file_path,
        category: q.category,
        difficulty: q.difficulty,
        answer_text: notes[q.id] || '',
        score: scores[q.id] || 5
      }));

      const repRes = await fetch('/api/session/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: consolidatedAnswers,
          sessionId,
          interviewMode: session?.interview_mode,
          behavioralScores,
          logicalScores,
          customQuestions: session?.custom_questions,
          sectionScores: session?.section_scores
        })
      });

      const repData = await repRes.json();

      await supabase
        .from('session_reports')
        .upsert({
          session_id: sessionId,
          overall_score: repData.overall_score || 50,
          hire_recommendation: repData.hire_recommendation || 'maybe',
          code_story_summary: JSON.stringify(repData),
          total_questions: questions.length,
          completed_questions: consolidatedAnswers.filter(a => a.answer_text.trim().length > 0).length,
          generated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
          remaining_seconds: 0
        })
        .eq('id', sessionId);

      toast.success('Interview completed! Loading report...');
      router.push(`/session/${sessionId}/report`);
    } catch (err: any) {
      console.error('Auto-end compilation error:', err);
      router.push(`/session/${sessionId}/report`);
    }
  };

  const recalculateQuestionsAvgScores = async () => {
    try {
      const qbSessionQs = questions.filter(q => q.file_path === 'Question Bank');
      if (qbSessionQs.length === 0) return;

      for (const sq of qbSessionQs) {
        // Fetch all answers across the platform for questions with this exact text
        const { data: allAns, error } = await supabase
          .from('answers')
          .select('ai_score, questions!inner(question_text)')
          .eq('questions.question_text', sq.question_text);

        if (error) {
          console.warn('Failed to fetch answers for score recalculation:', error);
          continue;
        }

        if (allAns && allAns.length > 0) {
          const totalScore = allAns.reduce((acc, curr) => acc + (curr.ai_score || 0), 0);
          const avg = totalScore / allAns.length;
          
          await supabase
            .from('question_bank')
            .update({ avg_score: Math.round(avg * 10) / 10 })
            .eq('question_text', sq.question_text);
        }
      }
    } catch (err) {
      console.error('Error recalculating avg_score:', err);
    }
  };

  // Manual End Interview
  const handleEndInterview = async () => {
    if (!confirm('Are you sure you want to end the interview? This will freeze answers and compile the final AI report.')) return;

    setLoading(true);
    try {
      const consolidatedAnswers = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        file_path: q.file_path,
        category: q.category,
        difficulty: q.difficulty,
        answer_text: notes[q.id] || '',
        score: scores[q.id] || 5
      }));

      const repRes = await fetch('/api/session/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: consolidatedAnswers,
          sessionId,
          interviewMode: session?.interview_mode,
          behavioralScores,
          logicalScores,
          customQuestions: session?.custom_questions,
          sectionScores: session?.section_scores
        })
      });

      const repData = await repRes.json();
      if (!repRes.ok) throw new Error(repData.error || 'Failed to generate summary report.');

      await supabase
        .from('session_reports')
        .upsert({
          session_id: sessionId,
          overall_score: repData.overall_score || 50,
          hire_recommendation: repData.hire_recommendation || 'maybe',
          code_story_summary: JSON.stringify(repData),
          total_questions: questions.length,
          completed_questions: consolidatedAnswers.filter(a => a.answer_text.trim().length > 0).length,
          generated_at: new Date().toISOString()
        }, { onConflict: 'session_id' });

      await supabase
        .from('sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      try {
        await recalculateQuestionsAvgScores();
      } catch (err) {
        console.warn('Avg score recalculation failed:', err);
      }

      router.push(`/session/${sessionId}/report`);
    } catch (err: any) {
      setError(err.message || 'An error occurred while compiling reports.');
      setLoading(false);
    }
  };

  // Pause / Resume Timer
  const handlePauseResume = async () => {
    if (!session) return;
    const nextPauseState = !session.is_paused;
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ is_paused: nextPauseState })
        .eq('id', sessionId);

      if (error) throw error;
      setSession(prev => prev ? { ...prev, is_paused: nextPauseState } : null);
      toast.success(nextPauseState ? 'Interview paused' : 'Interview resumed');
    } catch (err: any) {
      toast.error('Failed to update pause state: ' + err.message);
    }
  };

  // Extend Timer
  const handleExtendTimer = async (minutes: number) => {
    const currentMins = session?.timer_duration_minutes || 45;
    const newMins = currentMins + minutes;
    const newSeconds = timeLeftSeconds + (minutes * 60);

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          timer_duration_minutes: newMins,
          remaining_seconds: newSeconds
        })
        .eq('id', sessionId);

      if (error) throw error;

      setSession(prev => prev ? { ...prev, timer_duration_minutes: newMins } : null);
      setTimeLeftSeconds(newSeconds);
      if (newSeconds > 300) setToast5Shown(false);
      setTimerWarning(newSeconds <= 300);

      toast.success(`Extended interview timer by ${minutes} minutes.`);
    } catch (err: any) {
      toast.error(`Failed to extend timer: ${err.message}`);
    }
  };

  // Copy candidate link
  const copyCandidateLink = () => {
    const link = `${window.location.origin}/candidate/${sessionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mouse Wheel question changer
  const handleQuestionCardWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const threshold = 50;
    
    if (session?.interview_mode === 'technical' || session?.interview_mode === 'behavioral' || session?.interview_mode === 'logical') {
      if (e.deltaY > threshold && activeQIndex < questions.length - 1) {
        setActiveQIndex(prev => prev + 1);
      } else if (e.deltaY < -threshold && activeQIndex > 0) {
        setActiveQIndex(prev => prev - 1);
      }
    } else {
      // Tab specific list index updates
      if (activeTab === 'technical') {
        const list = getTechnicalQs();
        if (e.deltaY > threshold && activeTechIdx < list.length - 1) setActiveTechIdx(prev => prev + 1);
        else if (e.deltaY < -threshold && activeTechIdx > 0) setActiveTechIdx(prev => prev - 1);
      } else if (activeTab === 'behavioral') {
        const list = getBehavioralQs();
        if (e.deltaY > threshold && activeBehavioralIdx < list.length - 1) setActiveBehavioralIdx(prev => prev + 1);
        else if (e.deltaY < -threshold && activeBehavioralIdx > 0) setActiveBehavioralIdx(prev => prev - 1);
      } else if (activeTab === 'logical') {
        const list = getLogicalQs();
        if (e.deltaY > threshold && activeLogicalIdx < list.length - 1) setActiveLogicalIdx(prev => prev + 1);
        else if (e.deltaY < -threshold && activeLogicalIdx > 0) setActiveLogicalIdx(prev => prev - 1);
      } else if (activeTab === 'custom') {
        const list = getCustomQs();
        if (e.deltaY > threshold && activeCustomIdx < list.length - 1) setActiveCustomIdx(prev => prev + 1);
        else if (e.deltaY < -threshold && activeCustomIdx > 0) setActiveCustomIdx(prev => prev - 1);
      }
    }
  };

  // Folder Explorer tree renderer
  const renderTree = (node: FileTreeNode) => {
    return (
      <div key={node.path} className="pl-2 select-none">
        {Object.values(node.children).map(child => {
          const isDir = child.type === 'dir';
          const isExpanded = !!expandedDirs[child.path];
          const isSelected = selectedFilePath === child.path;

          return (
            <div key={child.path} className="my-1">
              <div
                onClick={() => {
                  if (isDir) {
                    setExpandedDirs(prev => ({ ...prev, [child.path]: !prev[child.path] }));
                  } else {
                    loadFileContent(child.path);
                  }
                }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                  isSelected 
                    ? 'bg-[#06B6D4]/15 text-[#06B6D4] font-bold border-l-2 border-[#06B6D4] -ml-2 pl-2.5' 
                    : 'text-[#b9cacb] hover:bg-[#151d1e] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-[#475569]">
                  {isDir 
                    ? (isExpanded ? 'folder_open' : 'folder') 
                    : 'description'}
                </span>
                <span className="truncate">{child.name}</span>
              </div>
              {isDir && isExpanded && (
                <div className="border-l border-[#3b494b] ml-2 pl-1.5">
                  {renderTree(child)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ----------------------------------------------------
  // SUB-LAYOUTS FOR INDIVIDUAL INTERVIEW MODES
  // ----------------------------------------------------

  // 1. Technical Layout (Split Screen)
  const renderTechnicalLayout = () => {
    const q = getActiveQuestion();
    const isTabbed = session?.interview_mode === 'fullstack' || session?.interview_mode === 'custom';
    const localIdx = isTabbed ? activeTechIdx : activeQIndex;
    const localLength = isTabbed ? getTechnicalQs().length : questions.length;
    const setLocalIdx = isTabbed ? setActiveTechIdx : setActiveQIndex;

    if (!q) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] italic bg-[#0d1515]">
          <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
          No Technical questions mapped for this session.
        </div>
      );
    }

    return (
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* LEFT WORKSPACE (60%) */}
        <div className="w-[60%] flex border-r border-[#3b494b] bg-[#0d1515] overflow-hidden">
          <div className="w-1/4 border-r border-[#3b494b] flex flex-col bg-[#151d1e]/60 overflow-y-auto custom-scrollbar p-3">
            <h2 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3 px-1">Repository Explorer</h2>
            {treeRoot && Object.keys(treeRoot.children).length > 0 ? renderTree(treeRoot) : <p className="text-[10px] text-[#94A3B8] px-1 italic">No files found.</p>}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d1515]">
            <div className="flex justify-between items-center px-4 py-2.5 bg-[#151d1e]/40 border-b border-[#3b494b] text-xs select-none">
              <div className="flex items-center gap-2 text-[#94A3B8] font-mono">
                <span className="material-symbols-outlined text-sm">code</span>
                <span className="truncate max-w-xs">{selectedFilePath || 'Select a file'}</span>
              </div>
              {q.file_path === selectedFilePath && (
                <span className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-[10px] text-[#06B6D4] font-semibold">
                  Highlighting Question {localIdx + 1} Snippet
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
                    const isHighlighted = q.file_path === selectedFilePath && (
                      fileContent.startsWith('// Loaded from generated snippet')
                        ? lineNum > 2
                        : (lineNum >= q.line_start && lineNum <= q.line_end)
                    );

                    return (
                      <div
                        key={idx}
                        id={`line-${lineNum}`}
                        className={`flex py-0.5 w-full ${isHighlighted ? 'bg-[#06B6D4]/10 border-l-4 border-[#06B6D4] -ml-4 pl-3' : 'pl-0'}`}
                      >
                        <span className="w-12 text-[#475569] text-right pr-4 select-none">{lineNum}</span>
                        <pre className={`whitespace-pre text-left ${isHighlighted ? 'text-white font-semibold' : 'text-[#94A3B8]'}`}>{line}</pre>
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

        {/* RIGHT EVALUATION PANEL (40%) */}
        <div className="w-[40%] flex flex-col bg-[#151d1e]/40 overflow-y-auto custom-scrollbar p-6 justify-between h-full">
          <div className="space-y-6">
            <div 
              onWheel={handleQuestionCardWheel}
              className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-xl space-y-4 hover:border-[#06B6D4]/40 transition-all duration-300 relative group cursor-ns-resize"
              title="Scroll vertical here to switch questions"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-[#06B6D4] tracking-widest">
                  Question {localIdx + 1} of {localLength}
                </span>
                <div className="flex gap-2">
                  {q.file_path === 'Question Bank' && (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-[9px] font-bold text-amber-500 uppercase">Question Bank</span>
                  )}
                  <span className="px-2 py-0.5 bg-[#3b494b] rounded-full text-[9px] font-bold text-[#94A3B8] uppercase">{q.difficulty}</span>
                  <span className="px-2 py-0.5 bg-[#06B6D4]/10 border border-[#06B6D4]/20 rounded-full text-[9px] font-bold text-[#06B6D4] uppercase">{q.category}</span>
                </div>
              </div>
              <h3 className="text-sm font-bold leading-relaxed text-[#F1F5F9]">{q.question_text}</h3>
              {q.file_path && q.file_path !== 'Custom Question' && q.file_path !== 'Question Bank' && (
                <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1.5 bg-[#0d1515]/50 px-3 py-1 rounded-lg border border-[#3b494b]">
                  <span className="material-symbols-outlined text-xs">folder_open</span>
                  <span className="truncate">{q.file_path} (Lines {q.line_start}-{q.line_end})</span>
                </div>
              )}
            </div>

            {/* Expected Answer collapsible */}
            {renderExpectedAnswerCollapsible(q, 'text-[#06B6D4]', 'border-[#06B6D4]/30 hover:bg-[#06B6D4]/10', 'bg-[#06B6D4]/10')}

            {/* Notes and scoring */}
            <div className="space-y-4 bg-[#151d1e]/80 border border-[#3b494b] rounded-xl p-5 shadow-xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">Recruiter Log &amp; Scoring</label>
                {savingAnswer[q.id] && <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">Saving...</span>}
              </div>
              <textarea
                value={notes[q.id] || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4] h-24 resize-none"
                placeholder="Type response notes here. Saved automatically."
              />
              <div className="space-y-2 pt-2 border-t border-[#3b494b]">
                <div className="flex justify-between text-[10px] font-bold text-[#94A3B8]">
                  <span>Performance Rating</span>
                  <span className="text-[#06B6D4] text-xs font-bold">{scores[q.id] || 5}/10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={scores[q.id] || 5}
                  onChange={(e) => handleScoreChange(parseInt(e.target.value))}
                  className="w-full h-1 bg-[#0d1515] rounded-lg appearance-none cursor-pointer accent-[#06B6D4]"
                />
              </div>
            </div>

            {/* Add Topic Questions Trigger Button */}
            <button
              onClick={() => setShowQuestionBankModal(true)}
              className="w-full py-2.5 border border-dashed border-[#06B6D4]/40 text-[#06B6D4] hover:bg-[#06B6D4]/5 hover:border-[#06B6D4] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">library_books</span>
              + Add Topic Questions
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center border-t border-[#3b494b] pt-4 mt-6">
            <button
              onClick={() => setLocalIdx(prev => Math.max(0, prev - 1))}
              disabled={localIdx === 0}
              className="px-3.5 py-1 text-xs border border-[#3b494b] rounded-lg disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-[#94A3B8] font-mono">{localIdx + 1} / {localLength}</span>
            <button
              onClick={() => setLocalIdx(prev => Math.min(localLength - 1, prev + 1))}
              disabled={localIdx === localLength - 1}
              className="px-3.5 py-1 text-xs border border-[#3b494b] rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 2. HR Behavioral Layout
  const renderBehavioralLayout = () => {
    const isTabbed = session?.interview_mode === 'fullstack' || session?.interview_mode === 'custom';
    const localIdx = isTabbed ? activeBehavioralIdx : activeQIndex;
    const list = getBehavioralQs();
    const q = list[localIdx];
    const setLocalIdx = isTabbed ? setActiveBehavioralIdx : setActiveQIndex;

    if (!q) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] italic bg-[#0d1515]">
          <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
          No Behavioral questions found for this session.
        </div>
      );
    }

    const currentScoreData = behavioralScores.find(item => item.question_id === q.id) || {
      communication: 5,
      confidence: 5,
      relevance: 5,
      notes: ''
    };

    // Calculate dynamic running average score for behavioral round
    let runningAverage = 'N/A';
    if (behavioralScores.length > 0) {
      const totalSum = behavioralScores.reduce((sum, item) => sum + (item.communication + item.confidence + item.relevance) / 3, 0);
      runningAverage = (totalSum / behavioralScores.length).toFixed(1) + '/10';
    }

    // Trait pool list
    const availableTraits = ["Good communicator", "Team player", "Leadership potential", "Honest", "Enthusiastic", "Needs improvement", "Detail oriented", "Logical thinker"];

    return (
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden w-full h-full p-6 gap-6 bg-[#0d1515]">
        
        {/* LEFT PANEL (60%): Question & Follow-ups */}
        <div className="md:w-[60%] flex flex-col justify-between h-full bg-[#151d1e]/50 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            
            {/* Question Header Card */}
            <div 
              onWheel={handleQuestionCardWheel}
              className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-lg space-y-3 cursor-ns-resize"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-purple-400 tracking-widest">
                  Question {localIdx + 1} of {list.length}
                </span>
                <div className="flex gap-2">
                  {q.file_path === 'Question Bank' && (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-[9px] font-bold text-amber-500 uppercase">Question Bank</span>
                  )}
                  <span className="px-2.5 py-0.5 bg-purple-500/10 border border-purple-500/20 text-[9px] font-bold text-purple-400 rounded-full uppercase">
                    {q.category}
                  </span>
                </div>
              </div>
              <h2 className="text-md font-bold leading-relaxed text-[#F1F5F9]">{q.question_text}</h2>
            </div>

            {/* Expected Answer collapsible */}
            {renderExpectedAnswerCollapsible(q, 'text-purple-400', 'border-purple-500/30 hover:bg-purple-500/10', 'bg-purple-500/10')}

            {/* AI Follow-up suggestions */}
            <div className="space-y-3 bg-[#151d1e] border border-[#3b494b] p-5 rounded-xl shadow-lg">
              <span className="text-[10px] uppercase font-extrabold text-purple-400 tracking-widest flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Suggested Follow-up Prompts
              </span>
              <ul className="text-xs text-[#94A3B8] space-y-2.5 pl-4 list-disc">
                {q.follow_up_questions && q.follow_up_questions.length > 0 ? (
                  q.follow_up_questions.map((fq, idx) => <li key={idx}>{fq}</li>)
                ) : (
                  <>
                    <li>Can you describe the final outcome? What were the key metrics?</li>
                    <li>What did you learn from this situation, and what would you change today?</li>
                  </>
                )}
              </ul>
            </div>

            {/* Add Topic Questions Trigger Button */}
            <button
              onClick={() => setShowQuestionBankModal(true)}
              className="w-full py-2.5 border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/5 hover:border-purple-500 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">library_books</span>
              + Add Topic Questions
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center border-t border-[#3b494b] pt-4 mt-6">
            <button
              onClick={() => setLocalIdx(prev => Math.max(0, prev - 1))}
              disabled={localIdx === 0}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous Question
            </button>
            <span className="text-xs font-mono text-[#94A3B8]">{localIdx + 1} / {list.length}</span>
            <button
              onClick={() => setLocalIdx(prev => Math.min(list.length - 1, prev + 1))}
              disabled={localIdx === list.length - 1}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Next Question
            </button>
          </div>
        </div>

        {/* RIGHT PANEL (40%): Recruiter scoring & tag metrics */}
        <div className="md:w-[40%] flex flex-col justify-between bg-[#151d1e]/80 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar h-full space-y-6">
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-purple-400 tracking-wider">Recruiter Evaluation Card</h3>
            
            {/* Sliders */}
            <div className="space-y-5 bg-[#0d1515]/40 border border-[#3b494b] p-4 rounded-lg">
              {/* Communication Clarity */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#94A3B8]">
                  <span>Communication Clarity</span>
                  <span className="text-purple-400 font-bold">{currentScoreData.communication}/10</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={currentScoreData.communication}
                  onChange={(e) => handleBehavioralRatingChange(q.id, 'communication', parseInt(e.target.value))}
                  className="w-full h-1 bg-[#151d1e] rounded appearance-none accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Confidence Level */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#94A3B8]">
                  <span>Confidence Level</span>
                  <span className="text-purple-400 font-bold">{currentScoreData.confidence}/10</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={currentScoreData.confidence}
                  onChange={(e) => handleBehavioralRatingChange(q.id, 'confidence', parseInt(e.target.value))}
                  className="w-full h-1 bg-[#151d1e] rounded appearance-none accent-purple-500 cursor-pointer"
                />
              </div>

              {/* Answer Relevance */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-[#94A3B8]">
                  <span>Answer Relevance (STAR alignment)</span>
                  <span className="text-purple-400 font-bold">{currentScoreData.relevance}/10</span>
                </div>
                <input 
                  type="range"
                  min="1"
                  max="10"
                  value={currentScoreData.relevance}
                  onChange={(e) => handleBehavioralRatingChange(q.id, 'relevance', parseInt(e.target.value))}
                  className="w-full h-1 bg-[#151d1e] rounded appearance-none accent-purple-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Question Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Question Notes &amp; Observations</label>
              <textarea 
                value={currentScoreData.notes || ''}
                onChange={(e) => handleBehavioralRatingChange(q.id, 'notes', e.target.value)}
                className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-3 text-xs text-white h-24 focus:outline-none focus:border-purple-500"
                placeholder="Autosaved. Write candidate answers summary..."
              />
            </div>

            {/* Trait tags selector */}
            <div className="space-y-2.5 pt-4 border-t border-[#3b494b]/60">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Candidate Traits</label>
              <div className="flex flex-wrap gap-2">
                {availableTraits.map(tag => {
                  const active = traitTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleToggleTrait(tag)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                        active 
                          ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/10' 
                          : 'bg-[#0d1515]/80 border border-[#3b494b] text-[#94A3B8] hover:border-[#94A3B8]/60'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Running average score */}
          <div className="bg-[#0d1515] border border-[#3b494b] p-4 rounded-xl flex justify-between items-center mt-6">
            <span className="text-xs text-[#94A3B8] font-bold uppercase">Average Behavioral Score:</span>
            <span className="text-lg font-bold font-mono text-purple-400">{runningAverage}</span>
          </div>

        </div>

      </div>
    );
  };

  // 3. Logical Thinking Round Layout
  const renderLogicalLayout = () => {
    const isTabbed = session?.interview_mode === 'fullstack' || session?.interview_mode === 'custom';
    const localIdx = isTabbed ? activeLogicalIdx : activeQIndex;
    const list = getLogicalQs();
    const q = list[localIdx];
    const setLocalIdx = isTabbed ? setActiveLogicalIdx : setActiveQIndex;

    if (!q) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] italic bg-[#0d1515]">
          <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
          No Logical questions found for this session.
        </div>
      );
    }

    const currentScoreData = logicalScores.find(item => item.question_id === q.id) || {
      result: 'skipped',
      notes: ''
    };

    // Calculate countdown timer percentage
    const qDuration = getLogicalDuration();
    const timerPct = Math.max(0, Math.min(100, (qTimeLeft / qDuration) * 100));

    // Calculate score metrics
    const attemptedCount = logicalScores.filter(item => item.result !== 'skipped').length;
    const correctCount = logicalScores.filter(item => item.result === 'correct').length;

    return (
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden w-full h-full p-6 gap-6 bg-[#0d1515]">
        
        {/* LEFT PANEL (70%): Timer & Question MCQ Cards */}
        <div className="md:w-[70%] flex flex-col justify-between h-full bg-[#151d1e]/50 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            
            {/* Per question timer bar */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                <span>Question Timer Limit</span>
                <span className="font-mono">{formatTime(qTimeLeft)}</span>
              </div>
              <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden border border-[#3b494b]/60">
                <div 
                  className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${timerPct}%` }}
                ></div>
              </div>
            </div>

            {/* Question Card */}
            <div 
              onWheel={handleQuestionCardWheel}
              className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-lg space-y-3 cursor-ns-resize"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-orange-400 tracking-widest">
                  Question {localIdx + 1} of {list.length}
                </span>
                <div className="flex gap-2">
                  {q.file_path === 'Question Bank' && (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-[9px] font-bold text-amber-500 uppercase">Question Bank</span>
                  )}
                  <span className="px-2.5 py-0.5 bg-orange-500/10 border border-orange-500/20 text-[9px] font-bold text-orange-400 rounded-full uppercase">
                    {q.category}
                  </span>
                </div>
              </div>
              <h2 className="text-md font-bold leading-relaxed text-[#F1F5F9] whitespace-pre-line">{q.question_text}</h2>
            </div>

            {/* Answers options layout */}
            <div className="space-y-4 pt-2">
              {q.options && q.options.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {q.options.map((opt, oIdx) => {
                    const letter = opt.trim().charAt(0);
                    // Match selected answer letter if stored in answer notes or text
                    const isSelected = currentScoreData.notes === opt;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleLogicalResultChange(q.id, currentScoreData.result, opt)}
                        className={`p-4 rounded-xl text-left font-mono text-xs border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold shadow-lg shadow-orange-500/5' 
                            : 'bg-[#151d1e]/40 border-[#3b494b] text-[#b9cacb] hover:border-orange-500/40 hover:text-white'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2 bg-[#0d1515]/30 p-4 border border-[#3b494b]/60 rounded-xl">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Recruiter evaluation remarks</label>
                  <textarea 
                    value={currentScoreData.notes || ''}
                    onChange={(e) => handleLogicalResultChange(q.id, currentScoreData.result, e.target.value)}
                    className="w-full bg-[#151d1e] border border-[#3b494b] rounded-lg p-3 text-xs text-white h-24 focus:outline-none focus:border-orange-500"
                    placeholder="Candidate response notes. Autopopulates details..."
                  />
                </div>
              )}
            </div>
            {/* Expected Answer collapsible */}
            {renderExpectedAnswerCollapsible(q, 'text-orange-400', 'border-orange-500/30 hover:bg-orange-500/10', 'bg-orange-500/10')}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center border-t border-[#3b494b] pt-4 mt-6">
            <button
              onClick={() => setLocalIdx(prev => Math.max(0, prev - 1))}
              disabled={localIdx === 0}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-[#94A3B8]">{localIdx + 1} / {list.length}</span>
            <button
              onClick={() => setLocalIdx(prev => Math.min(list.length - 1, prev + 1))}
              disabled={localIdx === list.length - 1}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        {/* RIGHT PANEL (30%): Score selection */}
        <div className="md:w-[30%] flex flex-col justify-between bg-[#151d1e]/80 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar h-full space-y-6">
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-orange-400 tracking-wider">Aptitude Evaluation</h3>
            
            {/* Quick score buttons */}
            <div className="space-y-3 pt-2">
              <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Question Outcome</label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleLogicalResultChange(q.id, 'correct')}
                  className={`py-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    currentScoreData.result === 'correct'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md'
                      : 'bg-[#0d1515] border-[#3b494b] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>Correct</span>
                </button>

                <button
                  onClick={() => handleLogicalResultChange(q.id, 'partially_correct')}
                  className={`py-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    currentScoreData.result === 'partially_correct'
                      ? 'bg-[#F59E0B]/10 border-[#F59E0B] text-[#F59E0B] shadow-md'
                      : 'bg-[#0d1515] border-[#3b494b] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">hourglass_empty</span>
                  <span>Partial</span>
                </button>

                <button
                  onClick={() => handleLogicalResultChange(q.id, 'incorrect')}
                  className={`py-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    currentScoreData.result === 'incorrect'
                      ? 'bg-red-500/10 border-red-500 text-red-400 shadow-md'
                      : 'bg-[#0d1515] border-[#3b494b] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">cancel</span>
                  <span>Incorrect</span>
                </button>

                <button
                  onClick={() => handleLogicalResultChange(q.id, 'skipped')}
                  className={`py-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    currentScoreData.result === 'skipped'
                      ? 'bg-gray-500/10 border-gray-500 text-gray-400 shadow-md'
                      : 'bg-[#0d1515] border-[#3b494b] text-[#94A3B8] hover:border-[#475569]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">block</span>
                  <span>Skipped</span>
                </button>
              </div>
            </div>

            {/* Add Topic Questions Trigger Button */}
            <button
              onClick={() => setShowQuestionBankModal(true)}
              className="w-full py-2.5 border border-dashed border-orange-500/40 text-orange-400 hover:bg-orange-500/5 hover:border-orange-500 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider mt-4"
            >
              <span className="material-symbols-outlined text-sm">library_books</span>
              + Add Topic Questions
            </button>
          </div>
        </div>

      </div>
    );
  };

  // 4. Custom round Q&A Layout
  const renderCustomLayout = () => {
    const list = getCustomQs();
    const q = list[activeCustomIdx];

    if (!q) {
      return (
        <div className="flex-grow flex flex-col items-center justify-center p-8 text-center text-[#94A3B8] italic bg-[#0d1515]">
          <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
          No Custom questions found for this session.
        </div>
      );
    }

    return (
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden w-full h-full p-6 gap-6 bg-[#0d1515]">
        <div className="md:w-[60%] flex flex-col justify-between h-full bg-[#151d1e]/50 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            <div 
              onWheel={handleQuestionCardWheel}
              className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-lg space-y-3 cursor-ns-resize"
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-widest block">
                  Custom Question {activeCustomIdx + 1} of {list.length}
                </span>
                {q.file_path === 'Question Bank' && (
                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-[9px] font-bold text-amber-500 uppercase">Question Bank</span>
                )}
              </div>
              <h2 className="text-md font-bold leading-relaxed text-[#F1F5F9]">{q.question_text}</h2>
            </div>
            {/* Expected Answer collapsible */}
            {renderExpectedAnswerCollapsible(q, 'text-emerald-400', 'border-emerald-500/30 hover:bg-emerald-500/10', 'bg-emerald-500/10')}

            {/* Add Topic Questions Trigger Button */}
            <button
              onClick={() => setShowQuestionBankModal(true)}
              className="w-full py-2.5 border border-dashed border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/5 hover:border-emerald-500 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-sm">library_books</span>
              + Add Topic Questions
            </button>
          </div>

          <div className="flex justify-between items-center border-t border-[#3b494b] pt-4 mt-6">
            <button
              onClick={() => setActiveCustomIdx(prev => Math.max(0, prev - 1))}
              disabled={activeCustomIdx === 0}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-[#94A3B8]">{activeCustomIdx + 1} / {list.length}</span>
            <button
              onClick={() => setActiveCustomIdx(prev => Math.min(list.length - 1, prev + 1))}
              disabled={activeCustomIdx === list.length - 1}
              className="px-4 py-2 border border-[#3b494b] text-xs font-bold rounded-lg hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>

        <div className="md:w-[40%] flex flex-col bg-[#151d1e]/80 border border-[#3b494b] rounded-xl p-6 overflow-y-auto custom-scrollbar h-full space-y-4">
          <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Recruiter Evaluation</h3>
          <textarea 
            value={notes[q.id] || ''}
            onChange={(e) => {
              setNotes(prev => ({ ...prev, [q.id]: e.target.value }));
              saveAnswerState(q.id, e.target.value, scores[q.id] || 5);
            }}
            className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-3 text-xs text-white h-32 focus:outline-none focus:border-gray-500"
            placeholder="Type notes and assessment remarks here..."
          />
          <div className="space-y-2 pt-2 border-t border-[#3b494b]/60">
            <div className="flex justify-between text-[10px] font-bold text-[#94A3B8]">
              <span>Score Rating</span>
              <span className="text-gray-400 text-xs font-bold">{scores[q.id] || 5}/10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={scores[q.id] || 5}
              onChange={(e) => {
                const scoreVal = parseInt(e.target.value);
                setScores(prev => ({ ...prev, [q.id]: scoreVal }));
                saveAnswerState(q.id, notes[q.id] || '', scoreVal);
              }}
              className="w-full h-1 bg-[#151d1e] rounded appearance-none accent-gray-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  };

  // Main Return JSX
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1515] flex flex-col items-center justify-center gap-4 text-[#F1F5F9]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#06B6D4]"></div>
        <p className="text-xs text-[#94A3B8]">Retrieving session workspace...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#0d1515] flex flex-col items-center justify-center p-8 text-center text-[#F1F5F9]">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-xl max-w-md space-y-4">
          <span className="material-symbols-outlined text-4xl text-red-500 animate-pulse">error</span>
          <h2 className="text-lg font-bold">Session Error</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">{error || 'Session could not be located in database.'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 bg-[#06B6D4] text-[#0d1515] font-bold text-xs uppercase tracking-wider rounded-lg inline-flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-xs">arrow_back</span>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Combined counts for progress headers in Full Stack / Custom modes
  const completedTech = getTechnicalQs().filter(q => notes[q.id] && notes[q.id].trim().length > 0).length;
  const completedBeh = getBehavioralQs().filter(q => behavioralScores.some(item => item.question_id === q.id)).length;
  const completedLog = getLogicalQs().filter(q => logicalScores.some(item => item.question_id === q.id && item.result !== 'skipped')).length;
  const completedCust = getCustomQs().filter(q => notes[q.id] && notes[q.id].trim().length > 0).length;

  const modeColors: Record<string, string> = {
    technical: 'text-[#06B6D4] border-[#06B6D4]/30 bg-[#06B6D4]/10',
    behavioral: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    logical: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
    fullstack: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    custom: 'text-gray-400 border-gray-500/30 bg-gray-500/10'
  };

  const modeTitles: Record<string, string> = {
    technical: 'Technical Code',
    behavioral: 'HR Behavioral',
    logical: 'Logical Reasoning',
    fullstack: 'Full Stack',
    custom: 'Custom Session'
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1515] text-[#F1F5F9] overflow-hidden select-none">
      {/* Session Header */}
      <header className="flex justify-between items-center px-6 py-3 bg-[#151d1e] border-b border-[#3b494b] z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515] transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-[#06B6D4]">CodeWalk Recopilot</h1>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full uppercase ${modeColors[session.interview_mode || 'technical']}`}>
                {modeTitles[session.interview_mode || 'technical']}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-0.5 font-medium">
              Candidate: <span className="text-white">{candidate?.name}</span> ({candidate?.email})
            </p>
          </div>
        </div>

        {/* Tab section counts for Full Stack / Custom */}
        {(session.interview_mode === 'fullstack' || session.interview_mode === 'custom') && (
          <div className="hidden lg:flex items-center gap-4 text-[10px] font-mono bg-[#0d1515] border border-[#3b494b] px-4 py-1.5 rounded-lg select-none">
            {hasTechSection() && (
              <span className={completedTech === getTechnicalQs().length ? 'text-emerald-400' : 'text-[#94A3B8]'}>
                Technical: {completedTech}/{getTechnicalQs().length}
              </span>
            )}
            {hasTechSection() && (hasBehSection() || hasLogSection() || hasCustSection()) && <span className="text-[#3b494b]">•</span>}
            
            {hasBehSection() && (
              <span className={completedBeh === getBehavioralQs().length ? 'text-purple-400' : 'text-[#94A3B8]'}>
                Behavioral: {completedBeh}/{getBehavioralQs().length}
              </span>
            )}
            {hasBehSection() && (hasLogSection() || hasCustSection()) && <span className="text-[#3b494b]">•</span>}
            
            {hasLogSection() && (
              <span className={completedLog === getLogicalQs().length ? 'text-orange-400' : 'text-[#94A3B8]'}>
                Logical: {completedLog}/{getLogicalQs().length}
              </span>
            )}
            {hasLogSection() && hasCustSection() && <span className="text-[#3b494b]">•</span>}

            {hasCustSection() && (
              <span className={completedCust === getCustomQs().length ? 'text-gray-400' : 'text-[#94A3B8]'}>
                Custom: {completedCust}/{getCustomQs().length}
              </span>
            )}
          </div>
        )}

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
            
            <button
              onClick={handlePauseResume}
              className="text-[#94A3B8] hover:text-[#06B6D4] p-1 rounded hover:bg-[#151d1e] transition-all cursor-pointer"
              title={session?.is_paused ? 'Resume Timer' : 'Pause Timer'}
            >
              <span className="material-symbols-outlined text-sm font-bold">{session?.is_paused ? 'play_arrow' : 'pause'}</span>
            </button>
            
            <button
              onClick={() => handleExtendTimer(10)}
              className="text-[10px] font-bold text-[#94A3B8] hover:text-[#06B6D4] px-1.5 py-0.5 rounded hover:bg-[#151d1e] border border-[#3b494b] transition-all cursor-pointer"
              title="Add 10 minutes"
            >
              +10m
            </button>
            <button
              onClick={() => handleExtendTimer(15)}
              className="text-[10px] font-bold text-[#94A3B8] hover:text-[#06B6D4] px-1.5 py-0.5 rounded hover:bg-[#151d1e] border border-[#3b494b] transition-all cursor-pointer"
              title="Add 15 minutes"
            >
              +15m
            </button>
          </div>

          <button
            onClick={copyCandidateLink}
            className={`text-xs px-3.5 py-1.5 font-bold rounded-lg border transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#151d1e] border-[#3b494b] text-[#94A3B8] hover:bg-[#0d1515] hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">{copiedLink ? 'done' : 'share'}</span>
            {copiedLink ? 'Copied Candidate Link!' : 'Share Candidate Screen'}
          </button>

          {session.repo_url && (
            <button
              onClick={() => router.push(`/session/${sessionId}/code-story`)}
              className="text-xs px-3.5 py-1.5 font-bold rounded-lg bg-[#151d1e] border border-[#3b494b] text-white hover:bg-[#0d1515] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-[#06B6D4]">analytics</span>
              View Code Story
            </button>
          )}

          <button
            onClick={handleEndInterview}
            className="text-xs px-4 py-1.5 font-bold bg-[#06B6D4] text-[#0d1515] hover:bg-[#06B6D4]/90 rounded-lg shadow-lg shadow-[#06B6D4]/10 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">assignment_turned_in</span>
            End &amp; Compile Report
          </button>
        </div>
      </header>

      {/* Main Workspace Render */}
      <div className="flex flex-1 overflow-hidden">
        {session.interview_mode === 'technical' && renderTechnicalLayout()}
        {session.interview_mode === 'behavioral' && renderBehavioralLayout()}
        {session.interview_mode === 'logical' && renderLogicalLayout()}
        
        {(session.interview_mode === 'fullstack' || session.interview_mode === 'custom') && (
          <div className="flex-grow flex flex-col overflow-hidden w-full h-full">
            {/* Horizontal Sub tabs header */}
            <div className="flex bg-[#151d1e]/80 border-b border-[#3b494b] px-6 py-1 gap-2 select-none">
              {hasTechSection() && (
                <button
                  onClick={() => setActiveTab('technical')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'technical' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Technical Code
                </button>
              )}
              {hasBehSection() && (
                <button
                  onClick={() => setActiveTab('behavioral')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'behavioral' ? 'border-purple-500 text-purple-400' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  HR Behavioral
                </button>
              )}
              {hasLogSection() && (
                <button
                  onClick={() => setActiveTab('logical')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'logical' ? 'border-orange-500 text-orange-400' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Logical Reasoning
                </button>
              )}
              {hasCustSection() && (
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`px-4 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'custom' ? 'border-gray-500 text-gray-400' : 'border-transparent text-[#94A3B8] hover:text-white'
                  }`}
                >
                  Custom Q&amp;A
                </button>
              )}
            </div>

            {/* Render selected active sub tab */}
            <div className="flex-1 flex overflow-hidden w-full h-full">
              {activeTab === 'technical' && renderTechnicalLayout()}
              {activeTab === 'behavioral' && renderBehavioralLayout()}
              {activeTab === 'logical' && renderLogicalLayout()}
              {activeTab === 'custom' && renderCustomLayout()}
            </div>
          </div>
        )}
      </div>

      {/* QUESTION BANK MODAL */}
      {showQuestionBankModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
          <div className="bg-[#12191a] border border-[#3b494b] w-full h-full max-w-6xl rounded-2xl flex flex-col overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#3b494b] flex justify-between items-center bg-[#151d1e]/80">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#06B6D4]">library_books</span>
                  Question Bank
                </h2>
                <p className="text-xs text-[#94A3B8] mt-0.5" suppressHydrationWarning>
                  Search {(() => {
                    const map: Record<string, boolean> = {};
                    qbQuestions.forEach(q => { map[q.topic] = true; });
                    return Object.keys(map).length;
                  })()} topics, {qbQuestions.length} questions. Select and inject high-quality questions or generate new ones dynamically.
                </p>
              </div>
              <button 
                onClick={() => setShowQuestionBankModal(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515] transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Filters Row */}
            <div className="p-6 border-b border-[#3b494b]/50 bg-[#0d1515]/30 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-[#94A3B8]">search</span>
                <input
                  type="text"
                  value={qbSearchQuery}
                  onChange={(e) => setQbSearchQuery(e.target.value)}
                  placeholder="Search topics or paste custom topic..."
                  className="w-full bg-[#151d1e] border border-[#3b494b] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              {/* Category tabs */}
              <div className="flex bg-[#151d1e] p-1 border border-[#3b494b] rounded-lg text-xs gap-1 select-none">
                {(['all', 'technical', 'behavioral', 'logical'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setQbSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                      qbSelectedCategory === cat 
                        ? 'bg-[#06B6D4] text-[#0d1515] font-bold' 
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Difficulty filter chips */}
              <div className="flex items-center gap-1.5 select-none">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] mr-1.5">Difficulty</span>
                {(['all', 'easy', 'medium', 'hard'] as const).map(diff => (
                  <button
                    key={diff}
                    onClick={() => setQbSelectedDifficulty(diff)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border transition-all cursor-pointer ${
                      qbSelectedDifficulty === diff 
                        ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                        : 'bg-transparent border-[#3b494b] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body & Topic Grid */}
            <div className="flex-grow overflow-y-auto p-6 custom-scrollbar relative bg-[#0d1515]/10">
              {qbLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4]"></div>
                  <p className="text-xs text-[#94A3B8]">Retrieving questions library...</p>
                </div>
              ) : (() => {
                const isSearching = qbDebouncedSearchQuery.trim().length >= 3;

                // Group topics
                const getTopicsListGrouped = () => {
                  let filteredQbs = qbQuestions;
                  if (qbSelectedCategory !== 'all') {
                    filteredQbs = filteredQbs.filter(q => q.category === qbSelectedCategory);
                  }
                  if (qbSelectedDifficulty !== 'all') {
                    filteredQbs = filteredQbs.filter(q => q.difficulty === qbSelectedDifficulty);
                  }

                  const topicsMap: Record<string, {
                    name: string;
                    category: string;
                    questions: any[];
                    easy: number;
                    medium: number;
                    hard: number;
                    usage: number;
                    lastUpdated: string;
                  }> = {};

                  filteredQbs.forEach(q => {
                    if (!topicsMap[q.topic]) {
                      topicsMap[q.topic] = {
                        name: q.topic,
                        category: q.category || 'technical',
                        questions: [],
                        easy: 0,
                        medium: 0,
                        hard: 0,
                        usage: 0,
                        lastUpdated: q.created_at || new Date().toISOString()
                      };
                    }
                    topicsMap[q.topic].questions.push(q);
                    topicsMap[q.topic].usage += (q.usage_count || 0);
                    if (q.created_at && new Date(q.created_at).getTime() > new Date(topicsMap[q.topic].lastUpdated).getTime()) {
                      topicsMap[q.topic].lastUpdated = q.created_at;
                    }
                    if (q.difficulty === 'easy') topicsMap[q.topic].easy++;
                    else if (q.difficulty === 'medium') topicsMap[q.topic].medium++;
                    else if (q.difficulty === 'hard') topicsMap[q.topic].hard++;
                  });

                  return Object.values(topicsMap);
                };

                const allTopics = getTopicsListGrouped();
                
                // Top 5 topics by usage
                const getUnfilteredTopics = () => {
                  const topicsMap: Record<string, { name: string; usage: number }> = {};
                  qbQuestions.forEach(q => {
                    if (!topicsMap[q.topic]) {
                      topicsMap[q.topic] = { name: q.topic, usage: 0 };
                    }
                    topicsMap[q.topic].usage += (q.usage_count || 0);
                  });
                  return Object.values(topicsMap);
                };
                const top5Topics = getUnfilteredTopics()
                  .filter(t => t.usage > 0)
                  .sort((a, b) => b.usage - a.usage)
                  .slice(0, 5)
                  .map(t => t.name);

                const getMostUsedQuestionText80 = (topicName: string) => {
                  const topicQs = qbQuestions.filter(q => q.topic === topicName && q.created_by === null);
                  if (topicQs.length === 0) return 'No questions yet';
                  const sorted = [...topicQs].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
                  const text = sorted[0].question_text;
                  return text.length > 80 ? text.slice(0, 80) + '...' : text;
                };

                const getMostUsedQuestionDifficulty = (topicName: string) => {
                  const topicQs = qbQuestions.filter(q => q.topic === topicName && q.created_by === null);
                  if (topicQs.length === 0) return 'medium';
                  const sorted = [...topicQs].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
                  return sorted[0].difficulty || 'medium';
                };

                if (isSearching) {
                  // Search Results View
                  const query = qbDebouncedSearchQuery.toLowerCase();
                  
                  const matchingTopics = allTopics.filter(t => {
                    const matchesCategory = qbSelectedCategory === 'all' || t.category === qbSelectedCategory;
                    return matchesCategory && t.name.toLowerCase().includes(query);
                  });

                  const matchingQuestions = qbQuestions.filter(q => {
                    const matchesCategory = qbSelectedCategory === 'all' || q.category === qbSelectedCategory;
                    const matchesDifficulty = qbSelectedDifficulty === 'all' || q.difficulty === qbSelectedDifficulty;
                    const matchesText = 
                      q.topic.toLowerCase().includes(query) ||
                      q.question_text.toLowerCase().includes(query) ||
                      q.subcategory.toLowerCase().includes(query) ||
                      (q.tags || []).some((t: string) => t.toLowerCase().includes(query));

                    return matchesCategory && matchesDifficulty && matchesText;
                  });

                  return (
                    <div className="space-y-6">
                      
                      {/* Topics section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest">Topics matching "{qbDebouncedSearchQuery}"</h4>
                        {matchingTopics.length === 0 ? (
                          <p className="text-xs italic text-[#94A3B8] p-3 bg-[#151d1e]/30 border border-[#3b494b]/40 rounded-xl">No topics matched.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {matchingTopics.map(topic => {
                              const isLocked = isTopicLocked(topic.name);
                              const total = topic.questions.length;
                              const easyPct = (topic.easy / total) * 100;
                              const medPct = (topic.medium / total) * 100;
                              const hardPct = (topic.hard / total) * 100;

                              return (
                                <div 
                                  key={topic.name}
                                  className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-4 flex flex-col justify-between hover:border-[#06B6D4]/50 transition-all duration-300 relative overflow-hidden group border-l-4 border-l-[#06B6D4]"
                                >
                                  {isLocked && (
                                    <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center z-10">
                                      <span className="material-symbols-outlined text-[#F59E0B] text-base">lock</span>
                                      <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1">Locked (Free Plan)</span>
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-2xl">{getTopicIcon(topic.name)}</span>
                                      <span className="text-[9px] bg-[#0d1515] border border-[#3b494b] px-2.5 py-0.5 rounded-full font-bold text-[#b9cacb]">
                                        {total} questions
                                      </span>
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-sm text-white group-hover:text-[#06B6D4] transition-colors">{topic.name}</h3>
                                      <div className="flex justify-between text-[8px] text-[#94A3B8] mt-1 transition-all">
                                        <span className="capitalize">{topic.category}</span>
                                        <span>Updated {new Date(topic.lastUpdated).toLocaleDateString(undefined, {month: 'short', year:'numeric'})}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Hover preview slide-up tooltip */}
                                  <div className="absolute inset-x-0 top-0 bottom-[64px] bg-[#151d1e]/95 border-b border-[#3b494b]/60 p-3.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 text-[10px] leading-relaxed flex flex-col justify-between select-none pointer-events-none">
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-center text-[7px] uppercase tracking-wider font-bold">
                                        <span className="text-[#06B6D4]">Most Used Question:</span>
                                        <span className={`px-1 rounded border ${
                                          getMostUsedQuestionDifficulty(topic.name) === 'hard' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                          getMostUsedQuestionDifficulty(topic.name) === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                          'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        }`}>{getMostUsedQuestionDifficulty(topic.name)}</span>
                                      </div>
                                      <p className="text-white italic">"{getMostUsedQuestionText80(topic.name)}"</p>
                                    </div>
                                    <span className="text-[7px] text-[#94A3B8] font-bold block text-center border-t border-[#3b494b]/40 pt-1">Click Browse to see all questions</span>
                                  </div>


                                  <div className="space-y-3 mt-4 pt-3 border-t border-[#3b494b]/30">
                                    <div className="w-full h-1 bg-[#0d1515] rounded-full overflow-hidden flex">
                                      <div className="h-full bg-emerald-500" style={{ width: `${easyPct}%` }}></div>
                                      <div className="h-full bg-[#F59E0B]" style={{ width: `${medPct}%` }}></div>
                                      <div className="h-full bg-red-500" style={{ width: `${hardPct}%` }}></div>
                                    </div>

                                    <button
                                      onClick={() => handleTopicClick(topic.name)}
                                      className="w-full py-1.5 bg-[#0d1515] border border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      Browse
                                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Questions section */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest">Questions matching "{qbDebouncedSearchQuery}"</h4>
                        {matchingQuestions.length === 0 ? (
                          <div className="text-center p-8 bg-[#151d1e]/20 border border-dashed border-[#3b494b]/60 rounded-xl space-y-4 max-w-md mx-auto">
                            <span className="material-symbols-outlined text-4xl text-amber-500">search_off</span>
                            <h4 className="font-bold text-white text-xs">No questions found matching "{qbDebouncedSearchQuery}"</h4>
                            <p className="text-[10px] text-[#94A3B8]">Generate 10 custom questions about this query instantly using AI.</p>
                            
                            <div className="flex items-center justify-center gap-2 border-t border-[#3b494b]/30 pt-3">
                              <label className="text-[10px] font-semibold text-[#94A3B8] flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={qbSaveToBankToggle}
                                  onChange={(e) => setQbSaveToBankToggle(e.target.checked)}
                                  className="rounded border-[#3b494b] text-[#06B6D4] focus:ring-0"
                                />
                                Save to My Question Bank
                              </label>
                            </div>

                            <button
                              onClick={triggerAiGeneration}
                              disabled={qbAiGenerating}
                              className="px-4 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-[10px] uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-55 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm font-bold">auto_awesome</span>
                              {qbAiGenerating ? 'Generating with AI...' : `Generate questions about "${qbDebouncedSearchQuery}"`}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {matchingQuestions.map(q => {
                              const isSaved = !!savedQuestionIds[q.id];
                              return (
                                <div key={q.id} className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-4 hover:border-[#06B6D4]/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                  <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-lg">{getTopicIcon(q.topic)}</span>
                                      <span className="text-xs font-bold text-white">{q.topic}</span>
                                      <span className="text-gray-500 text-[10px]">•</span>
                                      <span className="text-[9px] uppercase font-bold text-[#94A3B8]">{q.subcategory}</span>
                                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold border uppercase ${
                                        q.difficulty === 'hard' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                        q.difficulty === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                        'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                      }`}>{q.difficulty}</span>

                                      {q.usage_count > 50 && (
                                        <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-[8px] font-bold uppercase rounded text-cyan-400">Popular</span>
                                      )}
                                      {q.avg_score > 7.5 && (
                                        <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold uppercase rounded text-emerald-400">High Quality</span>
                                      )}
                                    </div>
                                    <p className="text-xs text-white leading-relaxed">{q.question_text}</p>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleBookmarkToggle(q.id)}
                                      className="text-[#94A3B8] hover:text-white p-1.5 rounded hover:bg-[#0d1515] transition-all cursor-pointer"
                                      title={isSaved ? "Remove from bank" : "Bookmark question"}
                                    >
                                      <span className={`material-symbols-outlined text-base ${isSaved ? 'fill-current text-[#06B6D4]' : ''}`}>bookmark</span>
                                    </button>

                                    <button
                                      onClick={() => addQuestionToActiveSession(q)}
                                      className="px-3 py-1.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-xs font-bold">add</span>
                                      Add to Interview
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  );
                }

                // Default Grid View (No search active)
                const filteredTopics = allTopics.filter(t => {
                  const matchesCategory = qbSelectedCategory === 'all' || t.category === qbSelectedCategory;
                  return matchesCategory;
                });

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredTopics.map(topic => {
                      const isLocked = isTopicLocked(topic.name);
                      const total = topic.questions.length;
                      const easyPct = (topic.easy / total) * 100;
                      const medPct = (topic.medium / total) * 100;
                      const hardPct = (topic.hard / total) * 100;
                      const isPopular = top5Topics.includes(topic.name);

                      const categoryColors = {
                        technical: 'border-l-4 border-l-[#06B6D4]',
                        behavioral: 'border-l-4 border-l-purple-500',
                        logical: 'border-l-4 border-l-orange-500'
                      };

                      return (
                        <div 
                          key={topic.name}
                          className={`bg-[#151d1e] border border-[#3b494b] rounded-xl p-4 flex flex-col justify-between hover:border-[#06B6D4]/60 transition-all duration-300 relative overflow-hidden group ${categoryColors[topic.category as 'technical'] || ''}`}
                        >
                          {/* Locked Plan Overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center z-10 transition-opacity duration-300">
                              <span className="material-symbols-outlined text-[#F59E0B] text-base">lock</span>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1">Locked (Free Plan)</span>
                              <button 
                                onClick={() => handleTopicClick(topic.name)}
                                className="mt-2 px-2.5 py-1 bg-amber-500 text-[#0d1515] font-bold text-[8px] rounded uppercase hover:bg-amber-400 transition-colors cursor-pointer"
                              >
                                Unlock Topic
                              </button>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="text-2xl">{getTopicIcon(topic.name)}</span>
                              <div className="flex items-center gap-1">
                                {isPopular && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[7px] font-bold text-amber-500 uppercase rounded">Popular</span>
                                )}
                                <span className="px-2 py-0.5 bg-[#0d1515] text-[9px] font-bold text-[#94A3B8] rounded border border-[#3b494b]/60">
                                  {total} questions
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-white group-hover:text-[#06B6D4] transition-colors">{topic.name}</h3>
                              <div className="flex justify-between text-[8px] text-[#94A3B8] mt-1 transition-all">
                                <span className="capitalize">{topic.category}</span>
                                <span>Updated {new Date(topic.lastUpdated).toLocaleDateString(undefined, {month: 'short', year:'numeric'})}</span>
                              </div>
                            </div>
                          </div>

                          {/* Hover preview slide-up tooltip */}
                          <div className="absolute inset-x-0 top-0 bottom-[64px] bg-[#151d1e]/95 border-b border-[#3b494b]/60 p-3.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 text-[10px] leading-relaxed flex flex-col justify-between select-none pointer-events-none">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center text-[7px] uppercase tracking-wider font-bold">
                                <span className="text-[#06B6D4]">Most Used Question:</span>
                                <span className={`px-1 rounded border ${
                                  getMostUsedQuestionDifficulty(topic.name) === 'hard' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                                  getMostUsedQuestionDifficulty(topic.name) === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                }`}>{getMostUsedQuestionDifficulty(topic.name)}</span>
                              </div>
                              <p className="text-white italic">"{getMostUsedQuestionText80(topic.name)}"</p>
                            </div>
                            <span className="text-[7px] text-[#94A3B8] font-bold block text-center border-t border-[#3b494b]/40 pt-1">Click Browse to see all questions</span>
                          </div>

                          <div className="space-y-3 mt-4 pt-3 border-t border-[#3b494b]/40">
                            {/* Difficulty Ratio Bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[8px] font-mono text-[#94A3B8]">
                                <span>E: {topic.easy}</span>
                                <span>M: {topic.medium}</span>
                                <span>H: {topic.hard}</span>
                              </div>
                              <div className="w-full h-1 bg-[#0d1515] rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${easyPct}%` }}></div>
                                <div className="h-full bg-[#F59E0B]" style={{ width: `${medPct}%` }}></div>
                                <div className="h-full bg-red-500" style={{ width: `${hardPct}%` }}></div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleTopicClick(topic.name)}
                                className="flex-grow py-1.5 bg-[#0d1515] border border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                              >
                                Browse
                              </button>

                              {/* Bulk Add dropdown */}
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setBulkSelectTopic(bulkSelectTopic === topic.name ? null : topic.name);
                                  }}
                                  className="px-2 py-1.5 rounded-lg font-bold text-xs border bg-[#0d1515] border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent transition-colors flex items-center justify-center cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-xs">add</span>
                                </button>

                                {bulkSelectTopic === topic.name && (
                                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#192122] border border-[#3b494b] rounded-lg shadow-xl z-50 py-1.5 text-[9px] font-bold text-left animate-in fade-in duration-100">
                                    <button onClick={() => addBulkQuestionsToSession(topic.name, 'random')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block text-[9px] font-bold">Add 5 Random Questions</button>
                                    <button onClick={() => addBulkQuestionsToSession(topic.name, 'easy')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block text-[9px] font-bold">Add 5 Easy Questions</button>
                                    <button onClick={() => addBulkQuestionsToSession(topic.name, 'medium')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block text-[9px] font-bold">Add 5 Medium Questions</button>
                                    <button onClick={() => addBulkQuestionsToSession(topic.name, 'hard')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block text-[9px] font-bold">Add 5 Hard Questions</button>
                                    <button onClick={() => addBulkQuestionsToSession(topic.name, 'all')} className="w-full text-left px-3 py-1.5 border-t border-[#3b494b]/60 pt-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block text-[9px] font-bold">Add All Questions</button>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Slide-over Browse Panel */}
            {qbActiveTopic && (() => {
              const questionsList = qbQuestions
                .filter(q => q.topic === qbActiveTopic)
                .filter(q => qbSelectedCategory === 'all' || q.category === qbSelectedCategory)
                .filter(q => qbSelectedDifficulty === 'all' || q.difficulty === qbSelectedDifficulty);
              const totalSelectedCount = questionsList.filter(q => qbSelectedQuestions[q.id]).length;
              const allChecked = questionsList.length > 0 && totalSelectedCount === questionsList.length;

              return (
                <div className="absolute top-14 bottom-[96px] right-0 w-full sm:w-[480px] bg-[#151d1e] border-l border-[#3b494b] z-20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="px-5 py-4 border-b border-[#3b494b] flex justify-between items-center bg-[#192122]">
                    <div>
                      <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider">Browsing Topic</span>
                      <h3 className="font-bold text-white text-md flex items-center gap-1.5">
                        <span>{getTopicIcon(qbActiveTopic)}</span>
                        {qbActiveTopic}
                      </h3>
                    </div>
                    <button 
                      onClick={() => setQbActiveTopic(null)}
                      className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515]"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
                    </button>
                  </div>

                  <div className="px-5 py-2.5 border-b border-[#3b494b]/40 bg-[#0d1515]/30 flex justify-between items-center text-xs">
                    <label className="flex items-center gap-2 font-semibold text-[#b9cacb] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={() => {
                          const nextState = !allChecked;
                          const newSelection = { ...qbSelectedQuestions };
                          questionsList.forEach(q => {
                            newSelection[q.id] = nextState;
                          });
                          setQbSelectedQuestions(newSelection);
                        }}
                        className="rounded border-[#3b494b] text-[#06B6D4] focus:ring-0"
                      />
                      Select All Questions
                    </label>
                    <span className="text-[10px] font-mono text-[#94A3B8] bg-[#0d1515] px-2 py-0.5 border border-[#3b494b] rounded-full">
                      {totalSelectedCount} selected
                    </span>
                  </div>

                  <div className="flex-grow overflow-y-auto p-5 pb-[96px] space-y-3 custom-scrollbar">
                    {questionsList.map(q => {
                      const isSelected = !!qbSelectedQuestions[q.id];
                      const isSaved = !!savedQuestionIds[q.id];
                      return (
                        <div 
                          key={q.id}
                          className={`bg-[#0d1515]/40 border rounded-xl p-4 transition-all duration-150 relative group ${
                            isSelected ? 'border-[#06B6D4]/40 bg-[#06B6D4]/5' : 'border-[#3b494b] hover:border-[#06B6D4]/30'
                          }`}
                        >
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => setQbSelectedQuestions(prev => ({
                                ...prev,
                                [q.id]: !prev[q.id]
                              }))}
                              className="mt-0.5 rounded border-[#3b494b] text-[#06B6D4] focus:ring-0"
                            />
                            <div className="space-y-1.5 flex-1 pr-12">
                              <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wider flex-wrap">
                                <span className={
                                  q.difficulty === 'hard' ? 'text-red-400' :
                                  q.difficulty === 'medium' ? 'text-amber-400' :
                                  'text-emerald-400'
                                }>{q.difficulty}</span>
                                <span className="text-[#3b494b]">•</span>
                                <span className="text-[#94A3B8]">{q.subcategory}</span>
                                
                                {q.usage_count > 50 && (
                                  <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-[7px] font-bold uppercase rounded text-cyan-400">Popular</span>
                                )}
                                {q.avg_score > 7.5 && (
                                  <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-bold uppercase rounded text-emerald-400">High Quality</span>
                                )}
                              </div>
                              <p className="text-xs font-semibold leading-relaxed text-white">{q.question_text}</p>
                              
                              {q.usage_count > 0 && (
                                <div className="flex items-center gap-3 text-[8px] text-[#94A3B8]">
                                  <span>Used: <strong className="text-white">{q.usage_count} times</strong></span>
                                  <span>Avg Score: <strong className="text-white">{q.avg_score ? `${q.avg_score}/10` : 'N/A'}</strong></span>
                                </div>
                              )}
                            </div>
                          </label>

                          {/* Hoverable Expected Answer Preview tooltip & Bookmark buttons */}
                          <div className="absolute right-3 top-3 flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleBookmarkToggle(q.id);
                              }}
                              className="text-[#94A3B8] hover:text-white p-0.5 rounded hover:bg-[#0d1515] transition-all cursor-pointer"
                              title={isSaved ? "Remove from bank" : "Bookmark question"}
                            >
                              <span className={`material-symbols-outlined text-xs font-bold ${isSaved ? 'fill-current text-[#06B6D4]' : ''}`}>bookmark</span>
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                addQuestionToActiveSession(q);
                              }}
                              className="text-[#94A3B8] hover:text-[#06B6D4] p-0.5 rounded hover:bg-[#0d1515] transition-colors cursor-pointer"
                              title="Add directly to interview"
                            >
                              <span className="material-symbols-outlined text-xs font-bold">add</span>
                            </button>

                            <div className="relative group/tooltip">
                              <span className="material-symbols-outlined text-xs text-[#3b494b] hover:text-[#06B6D4] cursor-help">info</span>
                              <div className="absolute right-0 top-6 w-64 bg-[#192122] border border-[#3b494b] p-3 rounded-lg shadow-xl text-[10px] leading-relaxed text-[#b9cacb] opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity duration-200 z-30 space-y-1">
                                <p className="font-bold text-[#06B6D4] uppercase border-b border-[#3b494b]/60 pb-1">Expected Answer Guide</p>
                                <p className="line-clamp-4 mt-1">
                                  {q.expected_answer?.ideal_explanation || q.expected_answer?.star_format || q.expected_answer?.ideal_answer_summary || (typeof q.expected_answer === 'string' ? q.expected_answer : 'No preview available.')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#3b494b] flex justify-between items-center bg-[#151d1e]/80 mb-20 z-40 relative">
              {/* Selected counts summary */}
              <div className="text-xs text-[#94A3B8] flex items-center gap-2">
                <span className="font-bold text-[#06B6D4]">
                  {Object.values(qbSelectedQuestions).filter(Boolean).length}
                </span> 
                questions selected from question library.
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowQuestionBankModal(false)}
                  className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={addSelectedQuestionsToSession}
                  className="px-5 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px] font-bold">add</span>
                  Add to Interview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLAN UPGRADE PROMPT MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#151d1e] border border-[#3b494b] max-w-md w-full rounded-2xl p-6 text-center space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <span className="material-symbols-outlined text-4xl text-amber-500 animate-bounce">workspace_premium</span>
            
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider">Premium Feature Required</h3>
              <p className="text-xs text-[#b9cacb] leading-relaxed">{upgradeMessage}</p>
            </div>

            <div className="bg-[#0d1515] p-3 border border-[#3b494b]/60 rounded-xl text-left text-[10px] space-y-1.5">
              <p className="font-bold text-[#06B6D4]">Pro Plan Benefits:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-[#94A3B8]">
                <li>Unlock all 20+ interview topics</li>
                <li>AI On-Demand dynamic question generation</li>
                <li>My Question Bank (up to 100 saved questions)</li>
                <li>Unlimited questions per interview</li>
              </ul>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setShowQuestionBankModal(false);
                  router.push('/pricing');
                }}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-400 text-[#0d1515] font-bold text-xs rounded-lg hover:from-amber-400 hover:to-orange-300 transition-all cursor-pointer"
              >
                Upgrade to Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
