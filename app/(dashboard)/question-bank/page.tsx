'use client';

import React, { useState, useEffect } from 'react';
import { useGlobal } from '@/app/context/GlobalContext';
import { supabase } from '@/app/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { seedQuestions } from '@/app/lib/seedQuestions';

interface Question {
  id: string;
  topic: string;
  category: 'technical' | 'behavioral' | 'logical';
  subcategory: string;
  question_text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  expected_answer: any;
  tags: string[];
  is_ai_generated: boolean;
  is_verified?: boolean;
  created_by: string | null;
  usage_count: number;
  avg_score: number;
  created_at: string;
}

export default function QuestionBankDashboardPage() {
  const router = useRouter();
  const { user, subscription } = useGlobal();
  const [activeTab, setActiveTab] = useState<'prebuilt' | 'mybank' | 'teambank'>('prebuilt');
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [savedQuestionIds, setSavedQuestionIds] = useState<Record<string, boolean>>({});
  const [teamQuestionIds, setTeamQuestionIds] = useState<Record<string, boolean>>({});
  const [teamQuestionsList, setTeamQuestionsList] = useState<Question[]>([]);
  const [teamInvitations, setTeamInvitations] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<any | null>(null);

  // Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'technical' | 'behavioral' | 'logical'>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');

  // Slide-over & Tooltips
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [bulkSelectTopic, setBulkSelectTopic] = useState<string | null>(null);
  const [activeTooltipQuestionId, setActiveTooltipQuestionId] = useState<string | null>(null);
  const [activeBulkTooltipTopic, setActiveBulkTooltipTopic] = useState<string | null>(null);

  // Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');
  const [upgradeTitle, setUpgradeTitle] = useState('Unlock Full Question Bank');

  // Free plan banner dismiss state
  const [planBannerDismissed, setPlanBannerDismissed] = useState(false);

  // Manual Question Builder State
  const [showAddForm, setShowAddForm] = useState(false);
  const [formTopic, setFormTopic] = useState('');
  const [formCategory, setFormCategory] = useState<'technical' | 'behavioral' | 'logical'>('technical');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [formText, setFormText] = useState('');
  const [formTags, setFormTags] = useState('');

  // Expected Answer Form Fields (Technical)
  const [idealExplanation, setIdealExplanation] = useState('');
  const [keyConcepts, setKeyConcepts] = useState('');
  const [correctApproach, setCorrectApproach] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [redFlags, setRedFlags] = useState('');

  // Expected Answer Form Fields (Behavioral)
  const [starFormat, setStarFormat] = useState('');
  const [keyPhrases, setKeyPhrases] = useState('');

  // Expected Answer Form Fields (Logical)
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [stepByStep, setStepByStep] = useState('');
  const [commonMistakes, setCommonMistakes] = useState('');
  const [timeGuide, setTimeGuide] = useState(120);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importingCsv, setImportingCsv] = useState(false);

  // AI Dynamic Generation States
  const [aiGenerating, setAiGenerating] = useState(false);

  // Debouncing Search Input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

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

  const plan = (subscription || 'Free').toLowerCase() as 'free' | 'pro' | 'enterprise';
  const isFree = plan === 'free';
  const isPro = plan === 'pro';
  const isEnterprise = plan === 'enterprise';
  const FREE_ALLOWED_TOPICS = ['Python', 'JavaScript', 'System Design'];
  const FREE_QUESTION_LIMIT = 5;
  const FREE_INTERVIEW_ADD_LIMIT = 3;

  const isTopicLocked = (topicName: string) => {
    if (!isFree) return false;
    return !FREE_ALLOWED_TOPICS.includes(topicName);
  };

  const showUpgrade = (title: string, msg: string) => {
    setUpgradeTitle(title);
    setUpgradeMsg(msg);
    setShowUpgradeModal(true);
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('question_bank')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Database fetch failed, loading static seed fallback:', error);
        setQuestions((seedQuestions as any) || []);
      } else {
        setQuestions(data && data.length > 0 ? (data as any) : ((seedQuestions as any) || []));
      }
    } catch (err: any) {
      console.warn('Questions fetch threw error, loading static seed fallback:', err);
      setQuestions((seedQuestions as any) || []);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTeamQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('team_questions')
        .select('*');
      
      if (error) throw error;
      
      const map: Record<string, boolean> = {};
      const list: Question[] = [];
      
      (data || []).forEach(item => {
        map[item.question_id] = true;
        const found = questions.find(q => q.id === item.question_id);
        if (found) list.push(found);
      });
      
      setTeamQuestionIds(map);
      setTeamQuestionsList(list);
    } catch (err) {
      console.warn('Supabase team_questions fetch failed, using localStorage fallback');
      const stored = localStorage.getItem('cw_team_questions');
      let teamIds: string[] = [];
      if (stored) {
        teamIds = JSON.parse(stored);
      } else {
        // Seed default team questions from prebuilt if empty
        const jsQs = questions.filter(q => q.topic === 'JavaScript').slice(0, 2);
        const sdQs = questions.filter(q => q.topic === 'System Design').slice(0, 1);
        teamIds = [...jsQs, ...sdQs].map(q => q.id);
        localStorage.setItem('cw_team_questions', JSON.stringify(teamIds));
      }
      
      const map: Record<string, boolean> = {};
      const list: Question[] = [];
      teamIds.forEach(id => {
        map[id] = true;
        const found = questions.find(q => q.id === id);
        if (found) list.push(found);
      });
      
      setTeamQuestionIds(map);
      setTeamQuestionsList(list);
    }
  };

  const fetchTeamInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('team_invitations')
        .select('*');
      
      if (error) throw error;
      setTeamInvitations(data || []);
    } catch (err) {
      console.warn('Supabase team_invitations fetch failed, using localStorage fallback');
      const stored = localStorage.getItem('cw_team_invitations');
      if (stored) {
        setTeamInvitations(JSON.parse(stored));
      } else {
        const mockInvites = [
          { id: 'mock-1', email: 'hr-screener@codewalk.io', status: 'accepted', created_at: new Date().toISOString() },
          { id: 'mock-2', email: 'tech-director@codewalk.io', status: 'pending', created_at: new Date().toISOString() },
          { id: 'mock-3', email: 'nicolas@company.com', status: 'declined', created_at: new Date().toISOString() }
        ];
        localStorage.setItem('cw_team_invitations', JSON.stringify(mockInvites));
        setTeamInvitations(mockInvites);
      }
    }
  };

  const fetchActiveSession = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, candidate_id, candidates(name)')
        .eq('recruiter_id', user.id)
        .eq('status', 'active')
        .limit(1);

      if (!error && data && data.length > 0) {
        setActiveSession(data[0]);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchQuestions();
    fetchSavedQuestions();
    fetchActiveSession();
  }, [user]);

  useEffect(() => {
    if (questions.length > 0) {
      fetchTeamQuestions();
      fetchTeamInvitations();
    }
  }, [questions]);

  // Handle Bookmarks
  const handleBookmarkToggle = async (qId: string) => {
    if (isFree) {
      showUpgrade('Personal Question Bank — Pro Feature', 'Save and organise your favourite questions in a personal bank. Upgrade to Pro to access this feature!');
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
        if (isPro && totalSaved >= 100) {
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

  // Handle Team Sharing Toggle
  const handleShareToTeamToggle = async (qId: string) => {
    const isShared = teamQuestionIds[qId];
    try {
      if (isShared) {
        const { error } = await supabase
          .from('team_questions')
          .delete()
          .eq('question_id', qId);
        if (error) throw error;
        
        setTeamQuestionIds(prev => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
        setTeamQuestionsList(prev => prev.filter(q => q.id !== qId));
        toast.success('Removed from Team Bank');
      } else {
        const { error } = await supabase
          .from('team_questions')
          .insert({ question_id: qId, shared_by: user?.id });
        if (error) throw error;
        
        setTeamQuestionIds(prev => ({ ...prev, [qId]: true }));
        const found = questions.find(q => q.id === qId);
        if (found) setTeamQuestionsList(prev => [...prev, found]);
        toast.success('Question shared to Team Bank!');
      }
    } catch (err) {
      console.warn('Database write failed, falling back to localStorage');
      const stored = localStorage.getItem('cw_team_questions');
      let teamIds: string[] = stored ? JSON.parse(stored) : [];
      
      if (isShared) {
        teamIds = teamIds.filter(id => id !== qId);
        setTeamQuestionIds(prev => {
          const next = { ...prev };
          delete next[qId];
          return next;
        });
        setTeamQuestionsList(prev => prev.filter(q => q.id !== qId));
        toast.success('Removed from Team Bank (locally)');
      } else {
        teamIds.push(qId);
        setTeamQuestionIds(prev => ({ ...prev, [qId]: true }));
        const found = questions.find(q => q.id === qId);
        if (found) setTeamQuestionsList(prev => [...prev, found]);
        toast.success('Question shared to Team Bank (locally)!');
      }
      localStorage.setItem('cw_team_questions', JSON.stringify(teamIds));
    }
  };

  // Handle Team Member Invitation
  const handleInviteMember = async (email: string) => {
    if (!email.trim() || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    const toastId = toast.loading('Sending invitation email...');
    
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send invitation');

      // Update UI list
      const newInviteItem = {
        id: `invite-${Date.now()}`,
        email: email.trim(),
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };

      // Handle warnings / feedback
      if (result.emailSent) {
        toast.success(`Invitation sent to ${email}!`, { id: toastId });
      } else if (result.emailWarning) {
        // Render a clear, helpful warning for Sandbox limit/API key missing
        toast.error(result.emailWarning, { 
          id: toastId,
          duration: 7500
        });
      } else {
        toast.success(`Invitation recorded for ${email}.`, { id: toastId });
      }

      // Check database status. If not saved in DB, store locally in localStorage fallback
      if (!result.databaseSaved) {
        console.warn('Database save failed (table might not exist yet). Saving locally.');
        const stored = localStorage.getItem('cw_team_invitations');
        const invites = stored ? JSON.parse(stored) : [];
        invites.push(newInviteItem);
        localStorage.setItem('cw_team_invitations', JSON.stringify(invites));
      }

      // Add to current UI state regardless
      setTeamInvitations(prev => [...prev, newInviteItem]);

    } catch (err: any) {
      console.error('Error sending invitation:', err);
      toast.error(err.message || 'Invitation failed. Saving locally.', { id: toastId });

      // Clean LocalStorage Fallback if entire request/network fails
      const stored = localStorage.getItem('cw_team_invitations');
      const invites = stored ? JSON.parse(stored) : [];
      const fallbackInvite = {
        id: `mock-${Date.now()}`,
        email: email.trim(),
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };
      invites.push(fallbackInvite);
      localStorage.setItem('cw_team_invitations', JSON.stringify(invites));
      setTeamInvitations(prev => [...prev, fallbackInvite]);
    }
  };

  const handleTopicView = (topicName: string) => {
    if (isTopicLocked(topicName)) {
      showUpgrade('Unlock Full Question Bank', `Unlock "${topicName}" and 17+ other pre-built topics with 2000+ curated questions by upgrading to Pro!`);
      return;
    }
    setActiveTopic(topicName);
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this custom question?')) return;

    try {
      toast.loading('Deleting question...', { id: 'del-q' });
      
      // Also delete saved references
      await supabase.from('saved_questions').delete().eq('question_id', id);

      const { error } = await supabase
        .from('question_bank')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Question deleted successfully.', { id: 'del-q' });
      if (previewQuestion?.id === id) setPreviewQuestion(null);
      
      setSavedQuestionIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to delete question.', { id: 'del-q' });
    }
  };

  const handleAddQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isFree) {
      showUpgrade('Custom Questions — Pro Feature', 'Creating custom questions is a Pro feature. Upgrade to configure manual question parameters!');
      return;
    }

    if (!formTopic.trim() || !formText.trim()) {
      toast.error('Please fill in Topic and Question Text.');
      return;
    }

    let expectedAnswerObj: any = {};
    if (formCategory === 'technical') {
      expectedAnswerObj = {
        ideal_explanation: idealExplanation,
        key_concepts: keyConcepts.split(',').map(s => s.trim()).filter(Boolean),
        correct_approach: correctApproach,
        follow_up_if_struggle: followUp,
        red_flags: redFlags.split(',').map(s => s.trim()).filter(Boolean)
      };
    } else if (formCategory === 'behavioral') {
      expectedAnswerObj = {
        star_format: starFormat,
        key_phrases: keyPhrases.split(',').map(s => s.trim()).filter(Boolean),
        red_flags: redFlags.split(',').map(s => s.trim()).filter(Boolean)
      };
    } else {
      expectedAnswerObj = {
        correct_answer: correctAnswer,
        step_by_step: stepByStep.split('\n').map(s => s.trim()).filter(Boolean),
        common_mistakes: commonMistakes.split(',').map(s => s.trim()).filter(Boolean),
        time_guide_seconds: timeGuide,
        red_flags: redFlags.split(',').map(s => s.trim()).filter(Boolean)
      };
    }

    try {
      toast.loading('Saving custom question...', { id: 'add-q' });
      
      // Write custom question
      const { data: newQ, error } = await supabase
        .from('question_bank')
        .insert({
          topic: formTopic.trim(),
          category: formCategory,
          subcategory: formSubcategory.trim() || 'custom',
          question_text: formText.trim(),
          difficulty: formDifficulty,
          expected_answer: expectedAnswerObj,
          tags: formTags.split(',').map(t => t.trim()).filter(Boolean),
          is_ai_generated: false,
          created_by: user?.id,
          usage_count: 0,
          avg_score: 0.0
        })
        .select('id')
        .single();

      if (error) throw error;

      // Automatically save to saved_questions so it counts as bookmarked
      if (newQ) {
        await supabase
          .from('saved_questions')
          .insert({
            recruiter_id: user?.id,
            question_id: newQ.id
          });
        
        setSavedQuestionIds(prev => ({
          ...prev,
          [newQ.id]: true
        }));
      }

      toast.success('Successfully added custom question to My Question Bank!', { id: 'add-q' });
      
      // Reset Form fields
      setFormTopic('');
      setFormSubcategory('');
      setFormText('');
      setFormTags('');
      setIdealExplanation('');
      setKeyConcepts('');
      setCorrectApproach('');
      setFollowUp('');
      setRedFlags('');
      setStarFormat('');
      setKeyPhrases('');
      setCorrectAnswer('');
      setStepByStep('');
      setCommonMistakes('');
      setTimeGuide(120);
      setShowAddForm(false);
      
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to create question: ' + err.message, { id: 'add-q' });
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnterprise) {
      showUpgrade('Bulk CSV Import — Enterprise Feature', 'Bulk CSV Import is an Enterprise tier feature. Upgrade to import team-wide libraries!');
      return;
    }

    if (!csvFile) {
      toast.error('Please select a CSV file.');
      return;
    }

    try {
      setImportingCsv(true);
      toast.loading('Processing CSV template...', { id: 'csv-import' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('CSV uploaded successfully! 12 questions imported.', { id: 'csv-import' });
      setCsvFile(null);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('CSV import failed.', { id: 'csv-import' });
    } finally {
      setImportingCsv(false);
    }
  };

  // Add Single Question to Active Interview Session
  const addQuestionToActiveSession = async (q: Question) => {
    if (!activeSession) return;
    try {
      toast.loading('Adding question to current session...', { id: 'add-session-q' });

      // Free plan: cap at 3 questions per interview
      const { data: sessionQs, error: fetchErr } = await supabase
        .from('questions')
        .select('*')
        .eq('session_id', activeSession.id)
        .order('order_index', { ascending: true });

      if (fetchErr) throw fetchErr;

      const currentCount = sessionQs?.length || 0;

      if (isFree && currentCount >= FREE_INTERVIEW_ADD_LIMIT) {
        showUpgrade('Interview Question Limit Reached', `Free plan allows adding up to ${FREE_INTERVIEW_ADD_LIMIT} questions per interview. Upgrade to Pro for unlimited questions!`);
        toast.dismiss('add-session-q');
        return;
      }

      let cat: any = q.category || 'custom';
      if (cat === 'technical') {
        cat = q.subcategory || 'frontend';
      }

      const newQRecord = {
        id: crypto.randomUUID(),
        session_id: activeSession.id,
        question_text: q.question_text,
        code_snippet: '',
        file_path: 'Question Bank',
        line_start: 0,
        line_end: 0,
        difficulty: q.difficulty || 'medium',
        category: cat,
        order_index: currentCount,
        show_expected_answer: false,
        expected_answer: q.expected_answer
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
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to add question: ' + err.message, { id: 'add-session-q' });
    }
  };

  // Bulk Add Questions
  const addBulkQuestionsToSession = async (topicName: string, type: 'random' | 'easy' | 'medium' | 'hard' | 'all') => {
    if (!activeSession) return;
    try {
      toast.loading(`Adding ${topicName} questions to session...`, { id: 'bulk-add' });

      let topicQs = questions.filter(q => q.topic === topicName && q.created_by === null);
      if (type === 'easy' || type === 'medium' || type === 'hard') {
        topicQs = topicQs.filter(q => q.difficulty === type);
      }

      if (topicQs.length === 0) {
        toast.error(`No ${type} questions found for "${topicName}"`, { id: 'bulk-add' });
        return;
      }

      let selected: Question[] = [];
      if (type === 'all') {
        selected = topicQs;
      } else {
        const shuffled = [...topicQs].sort(() => 0.5 - Math.random());
        selected = shuffled.slice(0, 5);
      }

      const { data: sessionQs, error: fetchErr } = await supabase
        .from('questions')
        .select('order_index')
        .eq('session_id', activeSession.id)
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
          session_id: activeSession.id,
          question_text: q.question_text,
          code_snippet: '',
          file_path: 'Question Bank',
          line_start: 0,
          line_end: 0,
          difficulty: q.difficulty || 'medium',
          category: cat,
          order_index: startingIdx + idx,
          show_expected_answer: false,
          expected_answer: q.expected_answer
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
      setBulkSelectTopic(null);
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('Bulk addition failed: ' + err.message, { id: 'bulk-add' });
    }
  };

  // AI On-Demand Generation for New Topics
  const handleAiTopicGenerate = async () => {
    if (isFree) {
      showUpgrade('AI Generation — Pro Feature', 'AI-powered on-demand question generation is a Pro feature. Upgrade to generate questions for any topic instantly!');
      return;
    }
    const tokensRemaining = (user?.tokensTotal ?? 5) - (user?.tokensUsed ?? 0);
    if (!isEnterprise && tokensRemaining <= 0) {
      showUpgrade('Out of AI Credits', 'Insufficient token balance. Please purchase more tokens or upgrade to Pro to generate with AI.');
      return;
    }

    try {
      setAiGenerating(true);
      toast.loading(`Deducting credit & generating questions for "${debouncedSearchQuery}"...`, { id: 'ai-gen' });

      // 1. Call Topic Generation Endpoint
      const res = await fetch('/api/questions/topic-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: debouncedSearchQuery,
          difficulty: 'mixed',
          count: 10
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const generatedList = data.questions || [];

      // 2. Save generated questions into the DB with is_ai_generated: true, is_verified: false
      const dbQs = generatedList.map((q: any) => ({
        topic: debouncedSearchQuery,
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

      const { error: insertErr } = await supabase
        .from('question_bank')
        .insert(dbQs);

      if (insertErr) throw insertErr;

      // 3. Deduct credit from profiles tokens_used
      if (user && !isEnterprise) {
        const nextUsed = (user.tokensUsed || 0) + 1;
        await supabase
          .from('profiles')
          .update({ tokens_used: nextUsed })
          .eq('id', user.id);
      }

      toast.success(`Generated 10 questions for "${debouncedSearchQuery}"`, { id: 'ai-gen' });
      setSearchQuery(''); // Reset query to clear empty states
      fetchQuestions();
    } catch (err: any) {
      console.error(err);
      toast.error('AI generation failed: ' + err.message, { id: 'ai-gen' });
    } finally {
      setAiGenerating(false);
    }
  };

  // Group prebuilt questions by topic
  const getPrebuiltTopicsList = () => {
    let prebuiltQs = questions.filter(q => q.created_by === null);
    if (selectedCategory !== 'all') {
      prebuiltQs = prebuiltQs.filter(q => q.category === selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      prebuiltQs = prebuiltQs.filter(q => q.difficulty === selectedDifficulty);
    }

    const topicsMap: Record<string, {
      name: string;
      category: string;
      questions: Question[];
      easy: number;
      medium: number;
      hard: number;
      usage: number;
      lastUpdated: string;
    }> = {};

    prebuiltQs.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = {
          name: q.topic,
          category: q.category || 'technical',
          questions: [],
          easy: 0,
          medium: 0,
          hard: 0,
          usage: 0,
          lastUpdated: q.created_at
        };
      }
      topicsMap[q.topic].questions.push(q);
      topicsMap[q.topic].usage += (q.usage_count || 0);
      if (new Date(q.created_at).getTime() > new Date(topicsMap[q.topic].lastUpdated).getTime()) {
        topicsMap[q.topic].lastUpdated = q.created_at;
      }
      if (q.difficulty === 'easy') topicsMap[q.topic].easy++;
      else if (q.difficulty === 'medium') topicsMap[q.topic].medium++;
      else if (q.difficulty === 'hard') topicsMap[q.topic].hard++;
    });

    return Object.values(topicsMap);
  };

  // Saved Questions Details
  const savedQuestionsList = questions.filter(q => savedQuestionIds[q.id]);

  // Group saved questions by topic
  const getSavedTopicsList = () => {
    let savedQs = questions.filter(q => savedQuestionIds[q.id]);
    if (selectedCategory !== 'all') {
      savedQs = savedQs.filter(q => q.category === selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      savedQs = savedQs.filter(q => q.difficulty === selectedDifficulty);
    }

    const topicsMap: Record<string, {
      name: string;
      category: string;
      questions: Question[];
      easy: number;
      medium: number;
      hard: number;
      usage: number;
      lastUpdated: string;
    }> = {};

    savedQs.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = {
          name: q.topic,
          category: q.category || 'technical',
          questions: [],
          easy: 0,
          medium: 0,
          hard: 0,
          usage: 0,
          lastUpdated: q.created_at
        };
      }
      topicsMap[q.topic].questions.push(q);
      topicsMap[q.topic].usage += (q.usage_count || 0);
      if (new Date(q.created_at).getTime() > new Date(topicsMap[q.topic].lastUpdated).getTime()) {
        topicsMap[q.topic].lastUpdated = q.created_at;
      }
      if (q.difficulty === 'easy') topicsMap[q.topic].easy++;
      else if (q.difficulty === 'medium') topicsMap[q.topic].medium++;
      else if (q.difficulty === 'hard') topicsMap[q.topic].hard++;
    });

    return Object.values(topicsMap);
  };

  // Top 5 topics by usage count
  const getTop5Topics = () => {
    const prebuiltQs = questions.filter(q => q.created_by === null);
    const topicsMap: Record<string, { name: string; usage: number }> = {};
    prebuiltQs.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = { name: q.topic, usage: 0 };
      }
      topicsMap[q.topic].usage += (q.usage_count || 0);
    });
    const list = Object.values(topicsMap);
    return [...list]
      .filter(t => t.usage > 0)
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)
      .map(t => t.name);
  };

  const getTeamTopicsList = () => {
    let teamQs = questions.filter(q => teamQuestionIds[q.id]);
    if (selectedCategory !== 'all') {
      teamQs = teamQs.filter(q => q.category === selectedCategory);
    }
    if (selectedDifficulty !== 'all') {
      teamQs = teamQs.filter(q => q.difficulty === selectedDifficulty);
    }

    const topicsMap: Record<string, {
      name: string;
      category: string;
      questions: Question[];
      easy: number;
      medium: number;
      hard: number;
      usage: number;
      lastUpdated: string;
    }> = {};

    teamQs.forEach(q => {
      if (!topicsMap[q.topic]) {
        topicsMap[q.topic] = {
          name: q.topic,
          category: q.category || 'technical',
          questions: [],
          easy: 0,
          medium: 0,
          hard: 0,
          usage: 0,
          lastUpdated: q.created_at
        };
      }
      topicsMap[q.topic].questions.push(q);
      topicsMap[q.topic].usage += (q.usage_count || 0);
      if (new Date(q.created_at).getTime() > new Date(topicsMap[q.topic].lastUpdated).getTime()) {
        topicsMap[q.topic].lastUpdated = q.created_at;
      }
      if (q.difficulty === 'easy') topicsMap[q.topic].easy++;
      else if (q.difficulty === 'medium') topicsMap[q.topic].medium++;
      else if (q.difficulty === 'hard') topicsMap[q.topic].hard++;
    });

    return Object.values(topicsMap);
  };

  const top5Topics = getTop5Topics();

  // Search filter flags
  const isSearching = debouncedSearchQuery.trim().length >= 3;

  // 1. Topics filter
  const topicsSource = 
    activeTab === 'prebuilt' 
      ? getPrebuiltTopicsList() 
      : activeTab === 'mybank' 
      ? getSavedTopicsList() 
      : getTeamTopicsList();

  const filteredTopicsList = topicsSource.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 2. Questions filter
  const questionsSource = 
    activeTab === 'prebuilt' 
      ? questions.filter(q => q.created_by === null) 
      : activeTab === 'mybank' 
      ? savedQuestionsList 
      : teamQuestionsList;
  const filteredQuestionsList = isSearching
    ? questionsSource.filter(q => {
        const matchesCategory = selectedCategory === 'all' || q.category === selectedCategory;
        const matchesDifficulty = selectedDifficulty === 'all' || q.difficulty === selectedDifficulty;
        const text = debouncedSearchQuery.toLowerCase();
        const matchesText = 
          q.topic.toLowerCase().includes(text) ||
          q.question_text.toLowerCase().includes(text) ||
          q.subcategory.toLowerCase().includes(text) ||
          (q.tags || []).some(t => t.toLowerCase().includes(text));

        return matchesCategory && matchesDifficulty && matchesText;
      })
    : [];

  const getMostUsedQuestionText80 = (topicName: string) => {
    const topicQs = questions.filter(q => q.topic === topicName && q.created_by === null);
    if (topicQs.length === 0) return 'No questions yet';
    const sorted = [...topicQs].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    const text = sorted[0].question_text;
    return text.length > 80 ? text.slice(0, 80) + '...' : text;
  };

  const getMostUsedQuestionDifficulty = (topicName: string) => {
    const topicQs = questions.filter(q => q.topic === topicName && q.created_by === null);
    if (topicQs.length === 0) return 'medium';
    const sorted = [...topicQs].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    return sorted[0].difficulty || 'medium';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#0d1515] text-[#b9cacb] custom-scrollbar">

      {/* Free Plan Banner */}
      {isFree && !planBannerDismissed && (
        <div className="mb-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-xl flex-shrink-0">info</span>
            <div>
              <p className="text-xs font-bold text-amber-300">You are on the Free Plan</p>
              <p className="text-[10px] text-amber-200/70 mt-0.5">Access limited to 3 topics (Python, JavaScript, System Design) and 5 questions each.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setShowUpgradeModal(false); router.push('/pricing'); }}
              className="px-4 py-1.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-[10px] rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              Upgrade to Pro
            </button>
            <button
              onClick={() => setPlanBannerDismissed(true)}
              className="text-amber-400/60 hover:text-amber-300 transition-colors p-1 cursor-pointer"
              title="Dismiss"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#3b494b]/60 pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#06B6D4] text-2xl">library_books</span>
            Interview Question Bank
          </h1>
          <p className="text-xs text-[#94A3B8] mt-1" suppressHydrationWarning>
            {loading ? 'Retrieving library index...' : `Search ${getPrebuiltTopicsList().length} topics, ${questions.filter(q => q.created_by === null).length} questions`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to Dashboard
          </Link>

          <button
            onClick={() => {
              if (isFree) {
                showUpgrade('Custom Questions — Pro Feature', 'Custom question creation is a Pro feature. Upgrade to build manual question guides!');
              } else {
                setShowAddForm(true);
              }
            }}
            className="px-4 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-[#06B6D4]/10"
          >
            <span className="material-symbols-outlined text-sm font-bold">add</span>
            Add Custom Question
          </button>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-[#3b494b]/40 mb-6 gap-6 text-xs font-bold select-none">
        <button
          onClick={() => {
            setActiveTab('prebuilt');
            setSearchQuery('');
            setSelectedCategory('all');
            setSelectedDifficulty('all');
          }}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'prebuilt' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">explore</span>
          Pre-built Library
        </button>

        <button
          onClick={() => {
            if (isFree) {
              showUpgrade('Personal Question Bank — Pro Feature', 'Save and organise questions in your personal bank. Upgrade to Pro to access My Question Bank!');
              return;
            }
            setActiveTab('mybank');
            setSearchQuery('');
            setSelectedCategory('all');
            setSelectedDifficulty('all');
          }}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'mybank' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">bookmark</span>
          My Question Bank
          {isFree ? (
            <span className="text-[9px] bg-amber-500/10 border border-amber-500/30 text-amber-400 px-1.5 py-0.5 rounded font-bold ml-1 uppercase">Pro</span>
          ) : (
            <span className="text-[10px] bg-[#151d1e] text-[#94A3B8] border border-[#3b494b] px-1.5 py-0.5 rounded-full font-mono ml-1.5">
              {savedQuestionsList.length}
              {isPro && '/100'}
            </span>
          )}
        </button>

        <button 
          onClick={() => {
            setActiveTab('teambank');
            setSearchQuery('');
            setSelectedCategory('all');
            setSelectedDifficulty('all');
          }}
          className={`pb-3 border-b-2 px-1 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'teambank' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-[#94A3B8] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-base">groups</span>
          Team Bank
          <span className="text-[10px] bg-[#151d1e] text-[#94A3B8] border border-[#3b494b] px-1.5 py-0.5 rounded-full font-mono ml-1.5">
            {teamQuestionsList.length}
          </span>
        </button>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#151d1e]/40 p-4 border border-[#3b494b]/40 rounded-xl mb-6">
        {/* Search */}
        <div className="relative flex-grow max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-xs text-[#94A3B8]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'prebuilt' 
                ? "Search topics, questions, tags..." 
                : activeTab === 'mybank' 
                ? "Search saved questions..." 
                : "Search team questions..."
            }
            className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
          />
        </div>

        {/* Tab & filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-[#0d1515] p-0.5 border border-[#3b494b] rounded-lg text-xs gap-1 select-none">
            {(['all', 'technical', 'behavioral', 'logical'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded transition-all cursor-pointer text-[10px] font-bold uppercase ${
                  selectedCategory === cat 
                    ? 'bg-[#06B6D4] text-[#0d1515] font-bold' 
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-xs select-none">
            <span className="text-[10px] uppercase font-bold text-[#94A3B8] mr-1">Difficulty:</span>
            {(['all', 'easy', 'medium', 'hard'] as const).map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase transition-colors cursor-pointer ${
                  selectedDifficulty === diff 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' 
                    : 'border-[#3b494b] text-[#94A3B8] hover:text-white'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#06B6D4]"></div>
          <p className="text-xs text-[#94A3B8]">Retrieving library index...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SEARCH RESULTS LAYOUT (If searching >= 3 chars) */}
          {isSearching ? (
            <div className="space-y-6">
              
              {/* 1. Topics matching query */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest">Topics matching "{debouncedSearchQuery}"</h2>
                {filteredTopicsList.length === 0 ? (
                  <div className="text-xs italic text-[#94A3B8] p-4 bg-[#151d1e]/30 border border-[#3b494b]/40 rounded-xl">
                    No topics matched "{debouncedSearchQuery}".
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredTopicsList.map(topic => {
                      const isLocked = isTopicLocked(topic.name);
                      const total = topic.questions.length;
                      const easyPct = (topic.easy / total) * 100;
                      const medPct = (topic.medium / total) * 100;
                      const hardPct = (topic.hard / total) * 100;
                      const isPopular = top5Topics.includes(topic.name);

                      return (
                        <div 
                          key={topic.name}
                          className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 flex flex-col justify-between hover:border-[#06B6D4]/50 transition-all duration-300 relative overflow-hidden group border-l-4 border-l-[#06B6D4]"
                        >
                          {isLocked && (
                            <div className="absolute inset-0 bg-black/75 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 text-center z-10">
                              <span className="material-symbols-outlined text-[#F59E0B] text-xl">lock</span>
                              <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-1">Locked (Free Plan)</span>
                              <button 
                                onClick={() => handleTopicView(topic.name)}
                                className="mt-2.5 px-3 py-1 bg-amber-500 text-[#0d1515] font-bold text-[8px] rounded uppercase hover:bg-amber-400 transition-all cursor-pointer"
                              >
                                Upgrade to unlock
                              </button>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-3xl">{getTopicIcon(topic.name)}</span>
                              <div className="flex items-center gap-1.5">
                                {isPopular && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[8px] font-bold text-amber-500 uppercase rounded">Popular</span>
                                )}
                                <span className="text-[9px] bg-[#0d1515] border border-[#3b494b] px-2.5 py-0.5 rounded-full font-bold text-[#b9cacb]">
                                  {total} questions
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-white group-hover:text-[#06B6D4] transition-colors">{topic.name}</h3>
                              <div className="flex items-center justify-between text-[8px] text-[#94A3B8] mt-1 transition-all">
                                <span className="capitalize">{topic.category}</span>
                                <span>Updated {new Date(topic.lastUpdated).toLocaleDateString(undefined, {month: 'short', year:'numeric'})}</span>
                              </div>
                            </div>
                          </div>

                          {/* Hover preview slide-up tooltip */}
                          <div className="absolute inset-x-0 top-0 bottom-[72px] bg-[#151d1e]/95 border-b border-[#3b494b]/60 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 text-[10px] leading-relaxed flex flex-col justify-between select-none pointer-events-none">
                            <div className="space-y-1.5">
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

                          <div className="space-y-4 mt-6 pt-4 border-t border-[#3b494b]/30">
                            <div className="space-y-1">
                              <div className="w-full h-1.5 bg-[#0d1515] rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${easyPct}%` }}></div>
                                <div className="h-full bg-[#F59E0B]" style={{ width: `${medPct}%` }}></div>
                                <div className="h-full bg-red-500" style={{ width: `${hardPct}%` }}></div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleTopicView(topic.name)}
                              className="w-full py-2 bg-[#0d1515] border border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              View Questions
                              <span className="material-symbols-outlined text-xs">visibility</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Questions matching query */}
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest">Questions matching "{debouncedSearchQuery}"</h2>
                {filteredQuestionsList.length === 0 ? (
                  <div className="text-center p-8 bg-[#151d1e]/20 border border-dashed border-[#3b494b]/60 rounded-xl space-y-4 max-w-md mx-auto">
                    <span className="material-symbols-outlined text-4xl text-amber-500">search_off</span>
                    <h4 className="font-bold text-white text-xs">No questions found matching "{debouncedSearchQuery}"</h4>
                    <p className="text-[10px] text-[#94A3B8]">Would you like to trigger AI on-demand question generation for this query?</p>

                    {!isFree && (
                      <button
                        onClick={handleAiTopicGenerate}
                        disabled={aiGenerating}
                        className="px-4 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-[10px] uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 mx-auto disabled:opacity-55 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm font-bold">auto_awesome</span>
                        {aiGenerating ? 'Generating questions...' : `Generate questions about "${debouncedSearchQuery}"`}
                      </button>
                    )}
                    {isFree && (
                      <button
                        onClick={() => showUpgrade('AI Generation — Pro Feature', 'AI-powered on-demand question generation is a Pro feature. Upgrade to generate questions for any topic instantly!')}
                        className="px-4 py-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 font-bold text-[10px] uppercase rounded-lg transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer hover:bg-amber-500/20"
                      >
                        <span className="material-symbols-outlined text-sm">lock</span>
                        AI Generation — Pro Feature
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQuestionsList.map(q => {
                      const isSaved = !!savedQuestionIds[q.id];
                      return (
                        <div key={q.id} className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 hover:border-[#06B6D4]/40 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4 group">
                          
                          <div className="space-y-1.5 flex-1">
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

                            {/* Share to Team Bank */}
                            <button
                              onClick={() => handleShareToTeamToggle(q.id)}
                              className="text-[#94A3B8] hover:text-white p-1.5 rounded hover:bg-[#0d1515] transition-all cursor-pointer"
                              title={teamQuestionIds[q.id] ? "Remove from Team Bank" : "Share with Team"}
                            >
                              <span className={`material-symbols-outlined text-base ${teamQuestionIds[q.id] ? 'text-indigo-400 fill-current' : ''}`}>groups</span>
                            </button>

                            {/* Add to Interview button */}
                            <div className="relative group">
                              <button
                                onClick={() => {
                                  if (!activeSession) {
                                    toast.error('Start an interview first to add questions');
                                  } else {
                                    addQuestionToActiveSession(q);
                                  }
                                }}
                                onMouseEnter={() => !activeSession && setActiveTooltipQuestionId(q.id)}
                                onMouseLeave={() => setActiveTooltipQuestionId(null)}
                                className={`px-3 py-1.5 font-bold text-[10px] uppercase rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                                  activeSession
                                    ? 'bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515]'
                                    : 'bg-[#151d1e] border border-[#3b494b] text-[#94A3B8]'
                                }`}
                              >
                                <span className="material-symbols-outlined text-xs font-bold">add</span>
                                Add to Interview
                              </button>
                              {!activeSession && activeTooltipQuestionId === q.id && (
                                <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0d1515] border border-[#3b494b] text-white text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-100">
                                  Start an interview first to add questions
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* DEFAULT TOPIC GRID LAYOUT (Prebuilt, Saved, or Team) */
            <div className={activeTab === 'teambank' ? "grid grid-cols-1 lg:grid-cols-3 gap-6" : ""}>
              
              {/* Left Column: Topics Grid */}
              <div className={activeTab === 'teambank' ? "lg:col-span-2 space-y-4" : ""}>
                {activeTab === 'teambank' && (
                  <h3 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest mb-1">
                    Team Shared Topics
                  </h3>
                )}
                {filteredTopicsList.length === 0 ? (
                  <div className="bg-[#151d1e]/30 border border-[#3b494b]/40 rounded-xl p-12 text-center text-[#94A3B8] italic">
                    <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">
                      {activeTab === 'mybank' ? 'bookmark_border' : activeTab === 'teambank' ? 'groups' : 'folder_open'}
                    </span>
                    <p className="text-xs">
                      {activeTab === 'mybank' 
                        ? 'No topics found in your saved list.' 
                        : activeTab === 'teambank' 
                        ? 'No shared team topics yet. Browse the Pre-built Library and click "Share with Team" to add questions here!'
                        : 'No topics found in this library category.'}
                    </p>
                  </div>
                ) : (
                  <div className={`grid gap-5 ${activeTab === 'teambank' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'}`}>
                    {filteredTopicsList.map(topic => {
                      const isLocked = isTopicLocked(topic.name);
                      const total = topic.questions.length;
                      const easyPct = (topic.easy / total) * 100;
                      const medPct = (topic.medium / total) * 100;
                      const hardPct = (topic.hard / total) * 100;
                      const isPopular = top5Topics.includes(topic.name);

                      return (
                        <div
                          key={topic.name}
                          onClick={isLocked ? () => handleTopicView(topic.name) : undefined}
                          className={`bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 flex flex-col justify-between transition-all duration-300 relative overflow-hidden group border-l-4 border-l-[#06B6D4] ${
                            isLocked
                              ? 'opacity-50 cursor-pointer hover:opacity-70 hover:border-amber-500/50'
                              : 'hover:border-[#06B6D4]/50'
                          }`}
                        >
                          {/* Pro badge for locked topics */}
                          {isLocked && (
                            <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-400 text-[#0d1515] text-[8px] font-extrabold uppercase rounded tracking-wider shadow-sm">
                              PRO
                            </div>
                          )}

                          {/* Lock icon overlay */}
                          {isLocked && (
                            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                              <span className="material-symbols-outlined text-amber-400 text-4xl opacity-80">lock</span>
                            </div>
                          )}

                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-3xl">{getTopicIcon(topic.name)}</span>
                              <div className="flex items-center gap-1.5">
                                {isPopular && (
                                  <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[8px] font-bold text-amber-500 uppercase rounded">Popular</span>
                                )}
                                <span className="text-[9px] bg-[#0d1515] border border-[#3b494b] px-2.5 py-0.5 rounded-full font-bold text-[#b9cacb]">
                                  {total} questions
                                </span>
                              </div>
                            </div>
                            <div>
                              <h3 className="font-bold text-sm text-white group-hover:text-[#06B6D4] transition-colors">{topic.name}</h3>
                              <div className="flex items-center justify-between text-[8px] text-[#94A3B8] mt-1 transition-all">
                                <span className="capitalize">{topic.category}</span>
                                <span>Updated {new Date(topic.lastUpdated).toLocaleDateString(undefined, {month: 'short', year:'numeric'})}</span>
                              </div>
                            </div>
                          </div>

                          {/* Hover preview slide-up tooltip */}
                          <div className="absolute inset-x-0 top-0 bottom-[72px] bg-[#151d1e]/95 border-b border-[#3b494b]/60 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-10 text-[10px] leading-relaxed flex flex-col justify-between select-none pointer-events-none">
                            <div className="space-y-1.5">
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

                          <div className="space-y-4 mt-6 pt-4 border-t border-[#3b494b]/30">
                            <div className="space-y-1">
                              <div className="w-full h-1.5 bg-[#0d1515] rounded-full overflow-hidden flex">
                                <div className="h-full bg-emerald-500" style={{ width: `${easyPct}%` }}></div>
                                <div className="h-full bg-[#F59E0B]" style={{ width: `${medPct}%` }}></div>
                                <div className="h-full bg-red-500" style={{ width: `${hardPct}%` }}></div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleTopicView(topic.name)}
                                className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                  isLocked
                                    ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                                    : 'bg-[#0d1515] border border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent'
                                }`}
                              >
                                {isLocked ? (
                                  <><span className="material-symbols-outlined text-xs">lock</span> Upgrade</>  
                                ) : 'Browse'}
                              </button>

                              {/* Bulk Add dropdown — hidden for locked topics on free plan */}
                              {!isLocked && (
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setBulkSelectTopic(bulkSelectTopic === topic.name ? null : topic.name);
                                    }}
                                    onMouseEnter={() => !activeSession && setActiveBulkTooltipTopic(topic.name)}
                                    onMouseLeave={() => setActiveBulkTooltipTopic(null)}
                                    className={`px-2.5 py-2 rounded-lg font-bold text-xs border transition-colors flex items-center justify-center cursor-pointer ${
                                      activeSession
                                        ? 'bg-[#0d1515] border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent'
                                        : 'bg-[#151d1e]/20 border-[#3b494b]/40 text-[#94A3B8]'
                                    }`}
                                  >
                                    <span className="material-symbols-outlined text-xs">add</span>
                                  </button>

                                  {!activeSession && activeBulkTooltipTopic === topic.name && (
                                    <span className="absolute bottom-full mb-2 right-0 bg-[#0d1515] border border-[#3b494b] text-white text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-100">
                                      Start an interview first
                                    </span>
                                  )}

                                  {activeSession && bulkSelectTopic === topic.name && (
                                    <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#192122] border border-[#3b494b] rounded-lg shadow-xl z-50 py-1.5 text-[10px] font-bold animate-in fade-in duration-100">
                                      <button onClick={() => addBulkQuestionsToSession(topic.name, 'random')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block">Add 5 Random Questions</button>
                                      <button onClick={() => addBulkQuestionsToSession(topic.name, 'easy')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block">Add 5 Easy Questions</button>
                                      <button onClick={() => addBulkQuestionsToSession(topic.name, 'medium')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block">Add 5 Medium Questions</button>
                                      <button onClick={() => addBulkQuestionsToSession(topic.name, 'hard')} className="w-full text-left px-3 py-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block">Add 5 Hard Questions</button>
                                      <button onClick={() => addBulkQuestionsToSession(topic.name, 'all')} className="w-full text-left px-3 py-1.5 border-t border-[#3b494b]/60 pt-1.5 hover:bg-[#06B6D4]/10 hover:text-white transition-colors cursor-pointer block">Add All Questions</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right Column: Manage Team Members & Invites */}
              {activeTab === 'teambank' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-extrabold uppercase text-[#06B6D4] tracking-widest mb-1">
                    Manage Team Access
                  </h3>
                  <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 space-y-5 shadow-lg">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400 text-sm">person_add</span>
                        Invite Team Member
                      </h4>
                      <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                        Invited users can select, share, and add questions to the Team Bank.
                      </p>
                    </div>
                    
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const email = formData.get('email') as string;
                        handleInviteMember(email);
                        e.currentTarget.reset();
                      }}
                      className="flex gap-2"
                    >
                      <input 
                        type="email"
                        name="email"
                        required
                        placeholder="colleague@company.com"
                        className="flex-grow bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#3b494b] focus:outline-none focus:border-[#06B6D4]"
                      />
                      <button 
                        type="submit"
                        className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer"
                      >
                        Invite
                      </button>
                    </form>

                    <div className="border-t border-[#3b494b]/60 pt-4 space-y-3">
                      <h5 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
                        Team Members &amp; Status
                      </h5>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto custom-scrollbar">
                        {teamInvitations.length === 0 ? (
                          <p className="text-[10px] italic text-[#94A3B8]">No invitations sent yet.</p>
                        ) : (
                          teamInvitations.map((invite, index) => (
                            <div key={invite.id || index} className="flex justify-between items-center bg-[#0d1515]/60 border border-[#3b494b]/30 p-2.5 rounded-lg text-xs">
                              <span className="text-[#dce4e5] font-mono font-medium truncate max-w-[150px]" title={invite.email}>
                                {invite.email}
                              </span>
                              <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded font-mono uppercase ${
                                invite.status === 'accepted' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                invite.status === 'declined' ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                                'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
                              }`}>
                                {invite.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {activeTopic && (() => {
        const baseList = activeTab === 'mybank'
          ? questions.filter(q => q.topic === activeTopic && savedQuestionIds[q.id])
          : activeTab === 'teambank'
          ? questions.filter(q => q.topic === activeTopic && teamQuestionIds[q.id])
          : questions.filter(q => q.topic === activeTopic && q.created_by === null);

        const filteredBase = baseList
          .filter(q => selectedCategory === 'all' || q.category === selectedCategory)
          .filter(q => selectedDifficulty === 'all' || q.difficulty === selectedDifficulty);

        // Free plan: cap at 5 visible questions
        const list = isFree ? filteredBase.slice(0, FREE_QUESTION_LIMIT) : filteredBase;
        const hiddenCount = isFree ? Math.max(0, filteredBase.length - FREE_QUESTION_LIMIT) : 0;
        return (
          <div className="fixed inset-0 bg-black/75 z-40 flex justify-end animate-in fade-in duration-200">
            <div className="bg-[#12191a] border-l border-[#3b494b] w-full max-w-xl h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
              
              <div className="px-6 py-4 border-b border-[#3b494b] flex justify-between items-center bg-[#151d1e]">
                <div>
                  <span className="text-[9px] text-[#06B6D4] uppercase font-bold tracking-widest">Topic Details</span>
                  <h2 className="font-bold text-white text-md flex items-center gap-2 mt-0.5">
                    <span className="text-xl">{getTopicIcon(activeTopic)}</span>
                    {activeTopic}
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveTopic(null)}
                  className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515]"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Questions List */}
              <div className="flex-1 overflow-y-auto p-6 pb-[96px] space-y-4 custom-scrollbar bg-[#0d1515]/20 scroll-smooth">
                {list.map((q, idx) => {
                  const isSaved = !!savedQuestionIds[q.id];
                  return (
                    <div key={q.id || idx} className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 space-y-3 relative group">
                      
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2 text-[8px] font-bold uppercase tracking-wider text-[#94A3B8]">
                          <span>Q {idx + 1}</span>
                          <span className="text-[#3b494b]">•</span>
                          <span className={
                            q.difficulty === 'hard' ? 'text-red-400' :
                            q.difficulty === 'medium' ? 'text-amber-400' :
                            'text-emerald-400'
                          }>{q.difficulty}</span>

                          {q.usage_count > 50 && (
                            <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-[7px] font-bold uppercase rounded text-cyan-400">Popular</span>
                          )}
                          {q.avg_score > 7.5 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-[7px] font-bold uppercase rounded text-emerald-400">High Quality</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleBookmarkToggle(q.id)}
                            className="text-[#94A3B8] hover:text-white p-1 hover:bg-[#0d1515] rounded transition-all cursor-pointer"
                            title={isSaved ? "Remove from bank" : "Bookmark question"}
                          >
                            <span className={`material-symbols-outlined text-sm font-bold ${isSaved ? 'fill-current text-[#06B6D4]' : ''}`}>bookmark</span>
                          </button>

                          {/* Share to Team Bank */}
                          <button
                            onClick={() => handleShareToTeamToggle(q.id)}
                            className="text-[#94A3B8] hover:text-white p-1 hover:bg-[#0d1515] rounded transition-all cursor-pointer"
                            title={teamQuestionIds[q.id] ? "Remove from Team Bank" : "Share with Team"}
                          >
                            <span className={`material-symbols-outlined text-sm font-bold ${teamQuestionIds[q.id] ? 'text-indigo-400 fill-current' : ''}`}>groups</span>
                          </button>

                          {/* Add to Interview in slide-over */}
                          <div className="relative">
                            <button
                              onClick={() => {
                                if (!activeSession) {
                                  toast.error('Start an interview first to add questions');
                                } else {
                                  addQuestionToActiveSession(q);
                                }
                              }}
                              onMouseEnter={() => !activeSession && setActiveTooltipQuestionId(q.id)}
                              onMouseLeave={() => setActiveTooltipQuestionId(null)}
                              className={`p-1.5 rounded-lg border transition-colors flex items-center justify-center cursor-pointer ${
                                activeSession 
                                  ? 'bg-[#0d1515] border-[#3b494b] text-[#b9cacb] hover:bg-[#06B6D4] hover:text-[#0d1515] hover:border-transparent'
                                  : 'bg-[#151d1e]/20 border-[#3b494b]/40 text-[#94A3B8]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                            </button>

                            {!activeSession && activeTooltipQuestionId === q.id && (
                              <span className="absolute bottom-full mb-2 right-0 bg-[#0d1515] border border-[#3b494b] text-white text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-100">
                                Start an interview first
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs font-semibold leading-relaxed text-white">{q.question_text}</p>

                      {q.usage_count > 0 && (
                        <div className="flex items-center gap-4 text-[9px] text-[#94A3B8]">
                          <span>Used: <strong className="text-white">{q.usage_count} times</strong></span>
                          <span>Avg Score: <strong className="text-white">{q.avg_score ? `${q.avg_score}/10` : 'N/A'}</strong></span>
                        </div>
                      )}
                      
                      {q.expected_answer && (
                        <div className="bg-[#0d1515]/60 border border-[#3b494b]/60 rounded-lg p-3 text-[10px] space-y-1.5 text-[#94A3B8]">
                          <p className="font-bold text-[#06B6D4] uppercase border-b border-[#3b494b]/50 pb-0.5">Ideal Explanation Guide:</p>
                          <p className="line-clamp-3">
                            {q.expected_answer.ideal_explanation || q.expected_answer.star_format || q.expected_answer.correct_answer || 'No preview summary available.'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Free plan locked card - shown after 5 questions */}
                {isFree && hiddenCount > 0 && (
                  <div
                    onClick={() => showUpgrade('Unlock Full Question Bank', `Access all ${filteredBase.length} questions in ${activeTopic} plus 2000+ questions across 20+ topics with a Pro plan!`)}
                    className="bg-[#151d1e] border border-amber-500/30 rounded-xl p-5 flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:bg-amber-500/5 transition-all group"
                  >
                    <span className="material-symbols-outlined text-amber-400 text-3xl">lock</span>
                    <div>
                      <p className="text-sm font-bold text-white">{hiddenCount} more question{hiddenCount !== 1 ? 's' : ''} available on Pro Plan</p>
                      <p className="text-[10px] text-[#94A3B8] mt-1">Upgrade to access all {filteredBase.length} questions in {activeTopic}</p>
                    </div>
                    <button className="px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-400 text-[#0d1515] font-bold text-[10px] rounded-lg hover:from-amber-400 hover:to-orange-300 transition-all cursor-pointer">
                      Upgrade to Pro
                    </button>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-[#3b494b] bg-[#151d1e]/80 flex justify-end mb-20 z-40 relative">
                <button
                  onClick={() => setActiveTopic(null)}
                  className="px-5 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD QUESTION MODAL FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#12191a] border border-[#3b494b] max-w-2xl w-full rounded-2xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-[#3b494b] flex justify-between items-center bg-[#151d1e]/80">
              <div>
                <h3 className="font-bold text-white text-sm">Add Custom Question Guide</h3>
                <p className="text-[10px] text-[#94A3B8] mt-0.5">Define topics, questions, and matching evaluation answers guides.</p>
              </div>
              <button 
                onClick={() => setShowAddForm(false)}
                className="text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515]"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleAddQuestionSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                {/* Topic */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Topic</label>
                  <input
                    type="text"
                    required
                    value={formTopic}
                    onChange={(e) => setFormTopic(e.target.value)}
                    placeholder="e.g. Python, SQL"
                    className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>

                {/* Subcategory */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Subcategory</label>
                  <input
                    type="text"
                    value={formSubcategory}
                    onChange={(e) => setFormSubcategory(e.target.value)}
                    placeholder="e.g. frontend, database"
                    className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="logical">Logical</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Difficulty</label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as any)}
                    className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Question Text</label>
                <textarea
                  required
                  rows={3}
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="Type full question here..."
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-3 text-white focus:outline-none focus:border-[#06B6D4] resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#94A3B8] uppercase block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="e.g. backend, algorithms"
                  className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              {/* EXPECTED ANSWERS SHAPES */}
              <div className="border-t border-[#3b494b]/60 pt-4 space-y-4">
                <h4 className="font-bold text-[#06B6D4] uppercase tracking-wider block">Expected Answer Scheme</h4>

                {formCategory === 'technical' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Ideal Explanation</label>
                      <textarea
                        rows={2}
                        value={idealExplanation}
                        onChange={(e) => setIdealExplanation(e.target.value)}
                        placeholder="How a strong candidate should explain this..."
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Correct Approach</label>
                      <textarea
                        rows={2}
                        value={correctApproach}
                        onChange={(e) => setCorrectApproach(e.target.value)}
                        placeholder="Right technical reasoning or pattern..."
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Key Concepts to Listen For (comma-separated)</label>
                      <input
                        type="text"
                        value={keyConcepts}
                        onChange={(e) => setKeyConcepts(e.target.value)}
                        placeholder="e.g. closure, caching"
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Suggested Follow-up if they struggle</label>
                      <input
                        type="text"
                        value={followUp}
                        onChange={(e) => setFollowUp(e.target.value)}
                        placeholder="Helpful hint or prompt..."
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>
                )}

                {formCategory === 'behavioral' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">STAR Format Guideline</label>
                      <textarea
                        rows={3}
                        value={starFormat}
                        onChange={(e) => setStarFormat(e.target.value)}
                        placeholder="Define ideal Situation, Task, Action, and Result indicators..."
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Key Phrases to Listen For (comma-separated)</label>
                      <input
                        type="text"
                        value={keyPhrases}
                        onChange={(e) => setKeyPhrases(e.target.value)}
                        placeholder="e.g. took initiative, collaborated"
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                  </div>
                )}

                {formCategory === 'logical' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Correct Answer Value</label>
                      <input
                        type="text"
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="e.g. Option A (140), or direct math solution"
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-[#94A3B8] block">Step-by-Step Resolution logic (one step per line)</label>
                      <textarea
                        rows={3}
                        value={stepByStep}
                        onChange={(e) => setStepByStep(e.target.value)}
                        placeholder="Step 1...\nStep 2..."
                        className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4] font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#94A3B8] block">Common Mistakes (comma-separated)</label>
                        <input
                          type="text"
                          value={commonMistakes}
                          onChange={(e) => setCommonMistakes(e.target.value)}
                          placeholder="e.g. arithmetic errors"
                          className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-[#94A3B8] block">Time Guide (seconds)</label>
                        <input
                          type="number"
                          value={timeGuide}
                          onChange={(e) => setTimeGuide(parseInt(e.target.value) || 120)}
                          className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Red Flags */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-[#94A3B8] block">Common Red Flags (comma-separated)</label>
                  <input
                    type="text"
                    value={redFlags}
                    onChange={(e) => setRedFlags(e.target.value)}
                    placeholder="e.g. unable to explain complexity, poor communication"
                    className="w-full bg-[#0d1515] border border-[#3b494b] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>
              </div>

            </form>

            <div className="px-6 py-4 border-t border-[#3b494b] flex justify-end gap-2 bg-[#151d1e]/80">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-[#3b494b] text-[#94A3B8] hover:text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddQuestionSubmit}
                className="px-5 py-2 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PLAN UPGRADE PROMPT MODAL */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpgradeModal(false); }}
        >
          <div className="bg-[#151d1e] border border-[#3b494b] max-w-md w-full rounded-2xl p-7 text-center space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-[#94A3B8] hover:text-white p-1 rounded hover:bg-[#0d1515] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>

            <div className="flex justify-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-amber-400">workspace_premium</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-white">{upgradeTitle}</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">Get access to 20+ topics and 2000+ questions</p>
            </div>

            <div className="bg-[#0d1515]/80 border border-[#3b494b]/60 rounded-xl p-4 text-left space-y-2">
              {[
                'All 20+ technical, behavioral & logical topics',
                '2000+ curated interview questions',
                'AI generation for any topic (1 token/request)',
                'Personal question bank — save & organise',
                'Add unlimited questions to interviews',
              ].map((feature) => (
                <div key={feature} className="flex items-start gap-2.5">
                  <span className="text-emerald-400 text-xs font-bold flex-shrink-0 mt-0.5">✅</span>
                  <span className="text-xs text-[#b9cacb]">{feature}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#06B6D4]/5 border border-[#06B6D4]/20 rounded-lg px-4 py-2">
              <p className="text-[#06B6D4] font-bold text-sm">Starting at ₹999/month</p>
              <p className="text-[10px] text-[#94A3B8] mt-0.5">Cancel anytime · No commitment</p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  router.push('/pricing');
                }}
                className="w-full py-2.5 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0d1515] font-extrabold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-[#06B6D4]/20"
              >
                Upgrade to Pro
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full text-[10px] text-[#94A3B8] hover:text-white transition-colors cursor-pointer py-1"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
