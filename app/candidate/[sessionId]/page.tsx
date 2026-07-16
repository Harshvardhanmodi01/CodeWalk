'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabaseClient';
import CodeBlock from '@/components/dashboard/CodeBlock';
import { toast } from 'react-hot-toast';

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
  shared_answer?: string;
  show_expected_answer?: boolean;
  options?: string[];
}

interface Session {
  id: string;
  repo_url: string;
  status: 'active' | 'completed' | 'cancelled';
  timer_duration_minutes: number;
  started_at: string;
  candidate_id: string;
  is_paused?: boolean;
  remaining_seconds?: number;
  recruiter_warning?: string | null;
  interview_mode?: 'technical' | 'behavioral' | 'logical' | 'fullstack' | 'custom';
  mode_config?: any;
}

export default function CandidateSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validationError, setValidationError] = useState<'NOT_FOUND' | 'COMPLETED' | 'CANCELLED' | null>(null);

  // Session & Questions
  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQIndex, setActiveQIndex] = useState(0);

  // Candidate answers (typed thoughts, mapped by question_id)
  const [candidateNotes, setCandidateNotes] = useState<Record<string, string>>({});
  const [savingAnswer, setSavingAnswer] = useState<Record<string, boolean>>({});

  // Timer states
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [qTimeLeft, setQTimeLeft] = useState(120);
  const [submitting, setSubmitting] = useState(false);

  // ==========================================
  // PROCTORING STATES
  // ==========================================
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);
  const [faceApiLoading, setFaceApiLoading] = useState(false);

  // Step 1: System Checks
  const [browserCompatible, setBrowserCompatible] = useState(false);
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasMic, setHasMic] = useState(false);

  // Step 2: Permissions Granted
  const [webcamPermission, setWebcamPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [screenPermission, setScreenPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');

  // Step 3: Rules agreed
  const [rulesAgreed, setRulesAgreed] = useState(false);

  // Step 4: Face Detection
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceDetectionMessage, setFaceDetectionMessage] = useState('Position your face in the frame');

  // Active Streams & Recording
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  // Drag & Minimize states for Corner Webcam
  const [webcamMinimized, setWebcamMinimized] = useState(false);

  // Overlay Warnings
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showDevtoolsWarning, setShowDevtoolsWarning] = useState(false);
  const [showScreenShareWarning, setShowScreenShareWarning] = useState(false);

  // Warning polling acknowledgment states
  const [activeRecruiterWarning, setActiveRecruiterWarning] = useState<string | null>(null);
  const [acknowledgingWarning, setAcknowledgingWarning] = useState(false);

  // Refs for video & canvas
  const setupVideoRef = useRef<HTMLVideoElement | null>(null);
  const cornerVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Counters
  const faceMissingTimerRef = useRef<number>(0);
  const lookingAwayTimerRef = useRef<number>(0);

  // Live candidate status ref (heartbeat & event synchronization)
  const liveStatusRef = useRef({
    webcam: 'active',
    screenShare: 'active',
    tabFocus: 'focused',
    faceVisible: true
  });

  const updateStatus = async (updates: Partial<typeof liveStatusRef.current>) => {
    if (!sessionId || !session) return;
    liveStatusRef.current = { ...liveStatusRef.current, ...updates };
    try {
      await fetch('/api/candidate/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          candidateId: session.candidate_id,
          liveStatus: liveStatusRef.current
        })
      });
    } catch (e) {
      console.warn('Failed to sync live status:', e);
    }
  };

  // Helper to log proctoring event to database
  const logProctoringEvent = async (eventType: string, severity: string, details: any = {}, duration = 0) => {
    if (!sessionId || !session) return;
    try {
      await fetch('/api/candidate/proctoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          candidateId: session.candidate_id,
          eventType,
          severity,
          durationSeconds: duration,
          details,
          liveStatus: liveStatusRef.current
        })
      });
    } catch (e) {
      console.warn('Failed to log proctoring event:', e);
    }
  };

  // Helper to upload snapshots taken during active proctoring
  const captureAndUploadSnapshot = (eventType: string, severity: string, details: any = {}, duration = 0) => {
    const video = cornerVideoRef.current;
    if (!video || !webcamStream) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (!blob) return;

          const timestamp = Date.now();
          const filename = `${timestamp}.jpg`;
          const formData = new FormData();
          formData.append('sessionId', sessionId);
          formData.append('bucket', 'proctoring-snapshots');
          formData.append('filename', filename);
          formData.append('file', blob, filename);

          const uploadRes = await fetch('/api/candidate/upload', {
            method: 'POST',
            body: formData
          });
          const uploadData = await uploadRes.json();

          if (uploadRes.ok && uploadData.success) {
            // Log event with the uploaded snapshot URL path
            await fetch('/api/candidate/proctoring', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                candidateId: session?.candidate_id,
                eventType,
                severity,
                durationSeconds: duration,
                snapshotUrl: uploadData.path,
                details,
                liveStatus: liveStatusRef.current
              })
            });
          } else {
            // Log event without snapshot if upload failed
            await logProctoringEvent(eventType, severity, details, duration);
          }
        }, 'image/jpeg', 0.6); // 60% JPEG Quality
      }
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
      logProctoringEvent(eventType, severity, details, duration);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================
  useEffect(() => {
    if (!sessionId) return;

    const loadCandidateWorkspace = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/candidate/session?sessionId=${sessionId}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          if (res.status === 404) {
            setValidationError('NOT_FOUND');
          } else {
            setError(data.error || 'Failed to load candidate workspace.');
          }
          setLoading(false);
          return;
        }

        const sessData = data.session;
        setSession(sessData);

        if (sessData.status === 'completed') {
          setValidationError('COMPLETED');
          setLoading(false);
          return;
        }

        if (sessData.status === 'cancelled') {
          setValidationError('CANCELLED');
          setLoading(false);
          return;
        }

        // Timer set (before wizard start, remaining seconds are calculated but not ticked locally)
        setTimeLeftSeconds(sessData.remaining_seconds ?? (sessData.timer_duration_minutes * 60));
        setTimerExpired((sessData.remaining_seconds ?? 1) <= 0);

        setQuestions(data.questions || []);

        const restoredNotes: Record<string, string> = {};
        (data.answers || []).forEach((a: any) => {
          restoredNotes[a.question_id] = a.answer_text || '';
        });
        setCandidateNotes(restoredNotes);

        // Run System Checks
        runSystemChecks();

      } catch (err: any) {
        console.error(err);
        setError('Failed to load candidate workspace.');
      } finally {
        setLoading(false);
      }
    };

    loadCandidateWorkspace();
  }, [sessionId]);

  // ==========================================
  // SYSTEM CHECKS (Step 1)
  // ==========================================
  const runSystemChecks = async () => {
    // 1. Browser Check (Chrome, Firefox, Edge, or Safari with warning)
    const ua = navigator.userAgent.toLowerCase();
    const isChrome = ua.includes('chrome') && !ua.includes('edge') && !ua.includes('opr');
    const isFirefox = ua.includes('firefox');
    const isEdge = ua.includes('edg');
    const isSafari = ua.includes('safari') && !ua.includes('chrome') && !ua.includes('android');

    if (isChrome || isFirefox || isEdge) {
      setBrowserCompatible(true);
    } else if (isSafari) {
      setBrowserCompatible(true);
      toast('Safari detected: Screen sharing may have limitations.', { icon: '⚠️' });
    } else {
      setBrowserCompatible(false);
    }

    // 2. Hardware Checks
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      const mics = devices.filter(device => device.kind === 'audioinput');

      setHasWebcam(cameras.length > 0);
      setHasMic(mics.length > 0);
    } catch (e) {
      console.error('Failed to enumerate devices:', e);
      setHasWebcam(false);
      setHasMic(false);
    }
  };

  // ==========================================
  // PERMISSION REQUESTS (Step 2)
  // ==========================================
  const requestWebcamAndMic = async () => {
    if (!navigator.mediaDevices) {
      toast.error('Secure Context Required: Modern browsers block webcam/microphone access on unsecure HTTP pages. Please access this page using localhost:3000 or configure an HTTPS connection.', { duration: 6000 });
      setWebcamPermission('denied');
      setMicPermission('denied');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: { ideal: 15 } },
        audio: true
      });
      
      setWebcamPermission('granted');
      setMicPermission('granted');
      setWebcamStream(stream);

      // Play in setup video ref
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = stream;
      }

      // Load face-api model weights dynamically
      loadFaceApiModels();

    } catch (e) {
      console.warn('Webcam/Mic access denied:', e);
      setWebcamPermission('denied');
      setMicPermission('denied');
      toast.error('Webcam and Microphone permissions are required.');
    }
  };

  const requestScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor', // Hint to share entire screen
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      // Enforce entire screen sharing
      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        track.stop();
        setScreenPermission('denied');
        toast.error('Please share your ENTIRE screen. Tab or window sharing is blocked.');
        return;
      }

      setScreenPermission('granted');
      setScreenStream(stream);

      track.onended = () => {
        setScreenPermission('prompt');
        setScreenStream(null);
        if (isSetupComplete) {
          handleScreenSharingStopped();
        }
      };

    } catch (e) {
      console.warn('Screen recording access denied:', e);
      setScreenPermission('denied');
      toast.error('Screen recording permission is required to start the interview.');
    }
  };

  // ==========================================
  // FACE API LOADING AND DETECTION (Step 4)
  // ==========================================
  const loadFaceApiModels = async () => {
    if (faceApiLoaded || faceApiLoading) return;
    setFaceApiLoading(true);
    try {
      if (!(window as any).faceapi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = (e) => reject(new Error('Failed to load face-api script'));
          document.body.appendChild(script);
        });
      }

      const faceapi = (window as any).faceapi;
      await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
      await faceapi.nets.faceLandmark68Net.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');

      setFaceApiLoaded(true);
    } catch (err) {
      console.error('Face-api models failed to load:', err);
      toast.error('Failed to load face verification library. Skipping face-api check.');
      setFaceApiLoaded(true); // Fallback so candidate is not permanently blocked
    } finally {
      setFaceApiLoading(false);
    }
  };

  // Pre-interview face verification loop
  useEffect(() => {
    if (!isSetupComplete && webcamStream && faceApiLoaded && setupVideoRef.current) {
      const video = setupVideoRef.current;
      const faceapi = (window as any).faceapi;
      if (!faceapi) return;

      let active = true;

      const detectFace = async () => {
        if (!active || video.paused || video.ended) return;
        try {
          const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions());
          if (detection) {
            setFaceDetected(true);
            setFaceDetectionMessage('Face detected — Ready to start!');
          } else {
            setFaceDetected(false);
            setFaceDetectionMessage('Position your face in the frame');
          }
        } catch (e) {
          // Silent error fallback
        }
        if (active) setTimeout(detectFace, 500);
      };

      video.onplay = () => detectFace();
      detectFace();

      return () => {
        active = false;
      };
    }
  }, [isSetupComplete, webcamStream, faceApiLoaded]);

  // ==========================================
  // INTERVIEW START TRIGGER
  // ==========================================
  const handleStartInterview = async () => {
    if (!browserCompatible || !hasWebcam) {
      toast.error('Browser compatibility or webcam device check failed.');
      return;
    }
    if (webcamPermission !== 'granted' || screenPermission !== 'granted') {
      toast.error('Please grant all required permissions to continue.');
      return;
    }
    if (!rulesAgreed) {
      toast.error('Please agree to the interview guidelines.');
      return;
    }

    try {
      setLoading(true);
      // Reset started_at in database
      const res = await fetch('/api/candidate/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'start' })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start timer');
      }

      setIsSetupComplete(true);
      
      // Stop the setup video track srcObject mapping (it will be re-mapped to the corner preview video ref)
      if (setupVideoRef.current) {
        setupVideoRef.current.srcObject = null;
      }

      toast.success('Interview started successfully! Good luck.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to start interview.');
    } finally {
      setLoading(false);
    }
  };

  // Bind webcam stream to the corner preview video when setup completes
  useEffect(() => {
    if (isSetupComplete && webcamStream && cornerVideoRef.current) {
      cornerVideoRef.current.srcObject = webcamStream;
    }
  }, [isSetupComplete, webcamStream]);

  // ==========================================
  // ACTIVE WEBCAM PROCTORING LOOP (Runs every 2s)
  // ==========================================
  useEffect(() => {
    if (!isSetupComplete || timerExpired || !webcamStream || !faceApiLoaded || session?.is_paused || showScreenShareWarning) return;

    const faceapi = (window as any).faceapi;
    const video = cornerVideoRef.current;
    if (!faceapi || !video) return;

    const monitorLoop = setInterval(async () => {
      if (video.paused || video.ended) return;

      try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks();
        
        // 1. Face Absence Check
        if (detections.length === 0) {
          faceMissingTimerRef.current += 2;
          setFaceDetected(false);
          updateStatus({ faceVisible: false });

          if (faceMissingTimerRef.current >= 10) {
            // Trigger alert on screen
            toast.error('Your face is not visible in webcam! Please stay in the frame.', { id: 'face-missing-warning' });
            
            // Log event and take snapshot
            captureAndUploadSnapshot(
              'face_not_visible',
              'medium',
              { message: 'Candidate face missing from frame' },
              faceMissingTimerRef.current
            );
          }
        } 
        
        // 2. Multiple Faces Check
        else if (detections.length > 1) {
          setFaceDetected(true);
          faceMissingTimerRef.current = 0;
          updateStatus({ faceVisible: true });

          // Multiple faces detection severity mapping: repeated becomes critical
          const severity = 'high'; // recruiter notification triggers immediately
          toast.error('Multiple faces detected! Only you should be visible.', { id: 'multiple-faces-warning' });

          captureAndUploadSnapshot(
            'multiple_faces',
            severity,
            { faces_count: detections.length }
          );
        } 
        
        // 3. Single Face Visible -> Check Looking Away
        else {
          setFaceDetected(true);
          faceMissingTimerRef.current = 0;
          updateStatus({ faceVisible: true });
          
          // Reset face missing toast if visible
          toast.dismiss('face-missing-warning');
          toast.dismiss('multiple-faces-warning');

          const detection = detections[0];
          const landmarks = detection.landmarks;
          const nose = landmarks.getNose();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();

          // Calculate horizontal symmetry
          const noseTip = nose[6]; // Nose bottom tip
          const leftEyeCenter = leftEye.reduce((acc: any, pt: any) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
          leftEyeCenter.x /= leftEye.length;
          const rightEyeCenter = rightEye.reduce((acc: any, pt: any) => ({ x: acc.x + pt.x, y: acc.y + pt.y }), { x: 0, y: 0 });
          rightEyeCenter.x /= rightEye.length;

          const distToLeft = Math.abs(noseTip.x - leftEyeCenter.x);
          const distToRight = Math.abs(noseTip.x - rightEyeCenter.x);
          const ratio = distToLeft / distToRight;

          if (ratio < 0.45 || ratio > 2.2) {
            lookingAwayTimerRef.current += 2;
            if (lookingAwayTimerRef.current >= 8) { // 8 seconds looking away
              toast('Please look at the screen.', { icon: '👁️', id: 'looking-away-toast' });
              logProctoringEvent('looking_away', 'low', { ratio, description: 'Candidate head turned away' });
              lookingAwayTimerRef.current = 0; // reset to avoid spamming
            }
          } else {
            lookingAwayTimerRef.current = 0;
            toast.dismiss('looking-away-toast');
          }
        }
      } catch (err) {
        // Fail gracefully
      }
    }, 2000);

    return () => clearInterval(monitorLoop);
  }, [isSetupComplete, timerExpired, webcamStream, faceApiLoaded, session?.is_paused, showScreenShareWarning]);

  // ==========================================
  // WEBCAM SNAPSHOT TIMER (Every 30s)
  // ==========================================
  useEffect(() => {
    if (!isSetupComplete || timerExpired || !webcamStream || session?.is_paused || showScreenShareWarning) return;

    const snapshotInterval = setInterval(() => {
      captureAndUploadSnapshot('periodic_snapshot', 'low', { type: 'periodic webcam snapshot' });
    }, 30000);

    return () => clearInterval(snapshotInterval);
  }, [isSetupComplete, timerExpired, webcamStream, session?.is_paused, showScreenShareWarning]);

  // ==========================================
  // SCREEN RECORDING & ANALYSIS CHUNKS
  // ==========================================
  useEffect(() => {
    if (!isSetupComplete || timerExpired || !screenStream || session?.is_paused || showScreenShareWarning) return;

    // 1. MediaRecorder for video chunk recordings
    try {
      let options = { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 120000 };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm', videoBitsPerSecond: 120000 };
      }

      const recorder = new MediaRecorder(screenStream, options);
      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0 && !session?.is_paused) {
          const timestamp = Date.now();
          const filename = `chunk-${timestamp}.webm`;
          const formData = new FormData();
          formData.append('sessionId', sessionId);
          formData.append('bucket', 'screen-recordings');
          formData.append('filename', filename);
          formData.append('file', e.data, filename);

          fetch('/api/candidate/upload', {
            method: 'POST',
            body: formData
          }).catch(err => console.warn('Failed to upload screen chunk:', err));
        }
      };

      recorder.start(30000); // 30s chunks
      mediaRecorderRef.current = recorder;
    } catch (e) {
      console.warn('Failed to initialize MediaRecorder:', e);
    }

    // 2. Vision Screenshot Analysis Loop (Every 60 seconds)
    const visionAnalysisLoop = setInterval(() => {
      const video = document.createElement('video');
      video.srcObject = screenStream;
      video.muted = true;
      video.play().catch(() => {});

      video.onloadedmetadata = () => {
        setTimeout(() => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 600;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const base64 = canvas.toDataURL('image/jpeg', 0.5); // compress
              
              // Post to Vision Analysis API
              fetch('/api/candidate/analyze-screen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, screenshot: base64 })
              }).catch(err => console.warn('Screen analysis vision check failed:', err));
            }
          } catch (e) {
            // gracefully fail
          } finally {
            video.srcObject = null;
            video.remove();
          }
        }, 500); // Wait for frame render
      };
    }, 60000);

    return () => {
      clearInterval(visionAnalysisLoop);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch(e){}
      }
    };
  }, [isSetupComplete, timerExpired, screenStream, session?.is_paused, showScreenShareWarning]);

  const handleScreenSharingStopped = () => {
    // Show Screen share overlay
    setShowScreenShareWarning(true);
    updateStatus({ screenShare: 'inactive' });
    logProctoringEvent('screen_sharing_stopped', 'critical', { message: 'Screen sharing disconnected' });

    // Pause recording
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch(e){}
    }
  };

  const restartScreenSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();

      if (settings.displaySurface && settings.displaySurface !== 'monitor') {
        track.stop();
        toast.error('Must share your entire monitor screen.');
        return;
      }

      setScreenStream(stream);
      setShowScreenShareWarning(false);
      updateStatus({ screenShare: 'active' });
      toast.success('Screen sharing re-established!');

      track.onended = () => {
        setScreenPermission('prompt');
        setScreenStream(null);
        handleScreenSharingStopped();
      };
    } catch (e) {
      toast.error('Failed to restart screen sharing.');
    }
  };

  // ==========================================
  // TAB VISIBILITY & WINDOW FOCUS MONITORS
  // ==========================================
  useEffect(() => {
    if (!isSetupComplete || timerExpired || session?.is_paused || showScreenShareWarning) return;

    let awayTime = 0;

    const handleVisibility = () => {
      if (document.hidden) {
        awayTime = Date.now();
        updateStatus({ tabFocus: 'away' });
        logProctoringEvent('tab_switch', 'medium', { action: 'document hidden' });
        setShowTabWarning(true);
      } else {
        if (awayTime > 0) {
          const duration = Math.floor((Date.now() - awayTime) / 1000);
          updateStatus({ tabFocus: 'focused' });
          logProctoringEvent('tab_switch', 'medium', { action: 'document visible again' }, duration);
          awayTime = 0;
        }
      }
    };

    const handleBlur = () => {
      awayTime = Date.now();
      updateStatus({ tabFocus: 'away' });
      logProctoringEvent('window_blur', 'medium', { action: 'window blurred' });
      setShowTabWarning(true);
    };

    const handleFocus = () => {
      if (awayTime > 0) {
        const duration = Math.floor((Date.now() - awayTime) / 1000);
        updateStatus({ tabFocus: 'focused' });
        logProctoringEvent('window_blur', 'medium', { action: 'window refocused' }, duration);
        awayTime = 0;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isSetupComplete, timerExpired, session?.is_paused, showScreenShareWarning]);

  // ==========================================
  // KEYBOARD, SELECT, CONTEXT MENU BLOCKS
  // ==========================================
  useEffect(() => {
    if (!isSetupComplete || timerExpired || session?.is_paused) return;

    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logProctoringEvent('right_click_attempt', 'low', { clientX: e.clientX, clientY: e.clientY });
      toast.error('Right-click context menu is disabled.');
    };

    const preventShortcuts = (e: KeyboardEvent) => {
      // 1. Copy & Cut blocker
      const isCtrlC = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c';
      const isCtrlX = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x';
      if (isCtrlC || isCtrlX) {
        e.preventDefault();
        logProctoringEvent('copy_attempt', 'medium', { shortcut: isCtrlC ? 'Ctrl+C' : 'Ctrl+X' });
        toast.error('Copying or cutting content is disabled.');
      }

      // 2. DevTools blocker (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C)
      const isDevtools = e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));
      if (isDevtools) {
        e.preventDefault();
        logProctoringEvent('keyboard_shortcut', 'high', { shortcut: e.key, combination: 'devtools' });
        setShowDevtoolsWarning(true);
      }
      
      // 3. Tab switch keys helper (Alt + Tab can't be blocked, but we capture the Alt/Tab keydown)
      if (e.altKey && e.key === 'Tab') {
        logProctoringEvent('keyboard_shortcut', 'medium', { combination: 'Alt+Tab' });
      }
    };

    document.addEventListener('contextmenu', preventContextMenu);
    window.addEventListener('keydown', preventShortcuts);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventShortcuts);
    };
  }, [isSetupComplete, timerExpired, session?.is_paused]);

  // ==========================================
  // RECRUITER REAL-TIME WARNING & STATUS POLL
  // ==========================================
  // Background check every 5 seconds to auto-transition and sync warnings
  useEffect(() => {
    if (!sessionId || validationError || loading || timerExpired) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/candidate/session?sessionId=${sessionId}`);
        if (!res.ok) return;
        const data = await res.json();

        const sessData = data.session;
        if (sessData) {
          setSession((prev: any) => prev ? { ...prev, ...sessData } : sessData);
          
          // Real-time Recruiter Warnings check
          if (sessData.recruiter_warning) {
            setActiveRecruiterWarning(sessData.recruiter_warning);
          }

          if (sessData.status === 'completed') {
            setValidationError('COMPLETED');
          } else if (sessData.status === 'cancelled') {
            setValidationError('CANCELLED');
          }

          // Sync timer (only ticks locally once wizard is complete)
          if (isSetupComplete) {
            if (sessData.is_paused) {
              setTimeLeftSeconds(sessData.remaining_seconds ?? (sessData.timer_duration_minutes * 60));
            } else {
              const durationSeconds = sessData.timer_duration_minutes * 60;
              const elapsedSeconds = Math.floor((Date.now() - new Date(sessData.started_at).getTime()) / 1000);
              const remaining = Math.max(0, durationSeconds - elapsedSeconds);
              setTimeLeftSeconds(remaining);
              if (remaining <= 0) {
                setTimerExpired(true);
              }
            }
          }
        }

        if (data.questions) {
          setQuestions(prevQuestions => {
            return prevQuestions.map(prevQ => {
              const updatedQ = data.questions.find((q: any) => q.id === prevQ.id);
              if (updatedQ) {
                return {
                  ...prevQ,
                  shared_answer: updatedQ.shared_answer,
                  show_expected_answer: updatedQ.show_expected_answer
                };
              }
              return prevQ;
            });
          });
        }
      } catch (e) {
        console.error('Failed to run background status check:', e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sessionId, validationError, loading, timerExpired, isSetupComplete]);

  // Acknowledge warning API caller
  const handleAcknowledgeWarning = async () => {
    if (!sessionId || acknowledgingWarning) return;
    setAcknowledgingWarning(true);
    try {
      const res = await fetch('/api/candidate/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, action: 'clear_warning' })
      });
      if (res.ok) {
        setActiveRecruiterWarning(null);
        toast.success('Warning acknowledged.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAcknowledgingWarning(false);
    }
  };

  // ==========================================
  // TIMER TICKER
  // ==========================================
  // Only tick when wizard is complete, not paused, and screen is shared
  useEffect(() => {
    if (!isSetupComplete || timeLeftSeconds <= 0 || timerExpired || session?.is_paused || showScreenShareWarning) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftSeconds, timerExpired, session?.is_paused, isSetupComplete, showScreenShareWarning]);

  const getLogicalDuration = () => {
    return (session?.mode_config?.logicalTimerMinutes || 2) * 60;
  };

  // Reset logical question timer when question index changes
  useEffect(() => {
    const currentQ = questions[activeQIndex];
    const isLogicalActive = session?.interview_mode === 'logical' || 
      (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes);
    if (isLogicalActive) {
      setQTimeLeft(getLogicalDuration());
    }
  }, [activeQIndex, session, questions]);

  const handleLogicalTimeExpired = async () => {
    const curQ = questions[activeQIndex];
    if (!curQ) return;

    // Save "time_expired" answer
    await saveCandidateAnswer(curQ.id, 'time_expired');

    if (activeQIndex < questions.length - 1) {
      setActiveQIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  // Question timer countdown hook
  useEffect(() => {
    const currentQ = questions[activeQIndex];
    const isLogicalActive = session?.interview_mode === 'logical' || 
      (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes);
    if (!isLogicalActive || session?.is_paused || qTimeLeft <= 0 || loading || timerExpired || showScreenShareWarning) return;

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
  }, [qTimeLeft, session, loading, timerExpired, activeQIndex, questions, showScreenShareWarning]);

  const handleSubmit = async () => {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      // Clean streams before exit
      if (webcamStream) webcamStream.getTracks().forEach(t => t.stop());
      if (screenStream) screenStream.getTracks().forEach(t => t.stop());

      const res = await fetch(`/api/candidate/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, status: 'completed' })
      });
      if (res.ok) {
        setValidationError('COMPLETED');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit interview.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit interview.');
    } finally {
      setSubmitting(false);
    }
  };

  // Save notes to Supabase via candidate/answer API
  const saveCandidateAnswer = async (qId: string, text: string) => {
    if (timerExpired || !sessionId) return;
    setSavingAnswer(prev => ({ ...prev, [qId]: true }));
    try {
      const res = await fetch('/api/candidate/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          questionId: qId,
          answerText: text
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      console.warn('Failed to autosave response thoughts:', err);
    } finally {
      setSavingAnswer(prev => ({ ...prev, [qId]: false }));
    }
  };

  const handleNotesChange = (text: string) => {
    const qId = questions[activeQIndex]?.id;
    if (!qId || timerExpired) return;
    setCandidateNotes(prev => ({ ...prev, [qId]: text }));
    saveCandidateAnswer(qId, text);
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ==========================================
  // RENDERS
  // ==========================================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#06B6D4] mb-4"></div>
        <p className="text-sm font-mono text-[#94A3B8]">Entering screening room...</p>
      </div>
    );
  }

  if (validationError === 'NOT_FOUND') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-red-500">error</span>
          <h2 className="text-xl font-bold">Session Not Found</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            The interview session you are trying to access does not exist or has been removed. Please contact your recruiter to request a valid link.
          </p>
        </div>
      </div>
    );
  }

  if (validationError === 'COMPLETED' || timerExpired || session?.status === 'completed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-[#06B6D4] animate-bounce">check_circle</span>
          <h2 className="text-xl font-bold">Interview Completed</h2>
          <p className="text-sm font-semibold text-cyan-400">Thank You!</p>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            This interview session has already ended. Your responses have been frozen and submitted to the recruiter.
          </p>
        </div>
      </div>
    );
  }

  if (validationError === 'CANCELLED' || session?.status === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-8 max-w-md text-center shadow-xl space-y-4">
          <div className="flex justify-center items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[#06B6D4] text-4xl">terminal</span>
            <span className="font-headline-md text-2xl font-bold text-[#06B6D4] tracking-tight">CodeWalk</span>
          </div>
          <span className="material-symbols-outlined text-5xl text-yellow-500">cancel</span>
          <h2 className="text-xl font-bold">Session Cancelled</h2>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            This screening session has been cancelled by the recruiter. Please contact them for further details.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-white p-8">
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs rounded-xl p-4 max-w-md text-center">
          <span className="material-symbols-outlined text-3xl font-bold mb-2">warning</span>
          <p className="font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // MANDATORY PRE-INTERVIEW SETUP SCREEN
  // ==========================================
  if (!isSetupComplete) {
    const isReadyToStart = browserCompatible && hasWebcam && webcamPermission === 'granted' && screenPermission === 'granted' && rulesAgreed && (faceApiLoaded ? faceDetected : true);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1515] text-[#F1F5F9] p-6 overflow-y-auto">
        <div className="bg-[#151d1e] border border-[#3b494b] rounded-2xl w-full max-w-3xl p-8 shadow-2xl space-y-6">
          
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Interview Setup</h1>
            <p className="text-xs text-[#94A3B8] font-mono">Please complete the following steps before starting</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* LEFT COLUMN: System checks and Permissions */}
            <div className="space-y-6">
              
              {/* Step 1: System Checks */}
              <div className="space-y-3 bg-[#0d1515]/50 p-4 border border-[#3b494b]/60 rounded-xl">
                <h3 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Step 1 — System Check</h3>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span>Browser Compatibility</span>
                    {browserCompatible ? (
                      <span className="text-emerald-400 font-bold">✅ Chrome/Firefox/Edge</span>
                    ) : (
                      <span className="text-rose-400 font-bold">❌ Unsupported</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Webcam Device</span>
                    {hasWebcam ? (
                      <span className="text-emerald-400 font-bold">✅ Detected</span>
                    ) : (
                      <span className="text-rose-400 font-bold">❌ Missing</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Microphone Device</span>
                    {hasMic ? (
                      <span className="text-emerald-400 font-bold">✅ Detected</span>
                    ) : (
                      <span className="text-[#94A3B8]">❌ Missing</span>
                    )}
                  </div>
                </div>
                {!hasWebcam && (
                  <p className="text-[10px] text-rose-400 mt-2 font-mono">⚠️ A webcam is required for this interview.</p>
                )}
              </div>

              {/* Step 2: Permission Requests */}
              <div className="space-y-3 bg-[#0d1515]/50 p-4 border border-[#3b494b]/60 rounded-xl">
                <h3 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Step 2 — Permission Requests</h3>
                <div className="space-y-3 text-xs">
                  {/* Camera & Mic */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Webcam & Microphone</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">Status: {webcamPermission.toUpperCase()}</p>
                    </div>
                    {webcamPermission !== 'granted' ? (
                      <button
                        onClick={requestWebcamAndMic}
                        className="px-3 py-1 bg-cyan-500 text-xs font-bold text-[#0d1515] rounded hover:bg-cyan-400 transition-colors"
                      >
                        Grant Permissions
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-bold">✓ Granted</span>
                    )}
                  </div>

                  {/* Screen Sharing */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">Entire Screen Share</p>
                      <p className="text-[10px] text-[#94A3B8] font-mono">Status: {screenPermission.toUpperCase()}</p>
                    </div>
                    {screenPermission !== 'granted' ? (
                      <button
                        onClick={requestScreenShare}
                        className="px-3 py-1 bg-cyan-500 text-xs font-bold text-[#0d1515] rounded hover:bg-cyan-400 transition-colors"
                      >
                        Share Screen
                      </button>
                    ) : (
                      <span className="text-emerald-400 font-bold">✓ Shared</span>
                    )}
                  </div>
                </div>
                {(webcamPermission !== 'granted' || screenPermission !== 'granted') && (
                  <p className="text-[10px] text-[#94A3B8] mt-2 italic">Please allow all permissions to continue.</p>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Rules & Face Detection */}
            <div className="space-y-6">

              {/* Step 4: Face Verification Preview */}
              <div className="bg-[#0d1515]/50 p-4 border border-[#3b494b]/60 rounded-xl flex flex-col items-center">
                <h3 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider self-start mb-3">Step 4 — Face Verification</h3>
                
                <div className={`relative w-48 h-36 rounded-lg overflow-hidden border-2 transition-colors ${faceDetected ? 'border-emerald-500' : 'border-rose-500'}`}>
                  <video
                    ref={setupVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  {/* Face Guide Overlay */}
                  <div className="absolute inset-0 border-[3px] border-dashed border-cyan-400/30 rounded-[50%] m-4 pointer-events-none" />
                </div>
                
                {faceApiLoading && (
                  <span className="text-[10px] text-[#94A3B8] font-mono mt-2 animate-pulse">Loading face detection models...</span>
                )}
                
                {webcamPermission === 'granted' && (
                  <p className={`text-xs font-bold font-mono mt-2 ${faceDetected ? 'text-emerald-400' : 'text-rose-400 animate-pulse'}`}>
                    {faceDetectionMessage}
                  </p>
                )}
              </div>

              {/* Step 3: Guidelines */}
              <div className="space-y-3 bg-[#0d1515]/50 p-4 border border-[#3b494b]/60 rounded-xl">
                <h3 className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider">Step 3 — Guidelines</h3>
                <div className="text-[11px] leading-relaxed text-[#CBD5E1] space-y-1.5 font-sans">
                  <p className="font-bold text-white mb-1">During this interview:</p>
                  <p>✅ Keep your face visible in webcam at all times</p>
                  <p>✅ Speak your answers clearly</p>
                  <p>✅ Stay on this browser tab</p>
                  <p>❌ Do not switch to other tabs or applications</p>
                  <p>❌ Do not use external help or AI tools</p>
                  <p>❌ Do not copy questions from this page</p>
                  <p>❌ Do not share your screen with others</p>
                </div>

                <div className="flex items-start gap-2 pt-2 border-t border-[#3b494b] mt-3">
                  <input
                    type="checkbox"
                    id="rules-checkbox"
                    checked={rulesAgreed}
                    onChange={(e) => setRulesAgreed(e.target.checked)}
                    className="mt-0.5 rounded border-[#3b494b] bg-[#0d1515] text-[#06B6D4]"
                  />
                  <label htmlFor="rules-checkbox" className="text-[10px] text-[#94A3B8] font-medium leading-tight select-none">
                    I understand and agree to follow these rules
                  </label>
                </div>
              </div>
            </div>

          </div>

          {/* Privacy Notice */}
          <div className="border-t border-[#3b494b] pt-4 text-[10px] text-[#94A3B8] space-y-1 font-mono">
            <p className="font-bold text-white">🔒 Privacy Notice</p>
            <p>What we monitor: webcam video, screen activity, tab switches.</p>
            <p>What we do NOT do: access your files, listen to audio permanently, store data beyond 30 days.</p>
            <p>Your data is encrypted and only visible to the recruiter. If you have accessibility needs that conflict with these requirements, please contact the recruiter.</p>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartInterview}
            disabled={!isReadyToStart}
            className="w-full py-3 bg-[#06B6D4] hover:bg-cyan-400 text-xs font-bold text-[#0d1515] uppercase tracking-wider rounded-xl transition-all disabled:opacity-40 cursor-pointer"
          >
            Start Interview
          </button>

        </div>
      </div>
    );
  }

  // ==========================================
  // CANDIDATE MAIN INTERVIEW ROOM RENDER
  // ==========================================
  const currentQ = questions[activeQIndex];

  return (
    <div className="flex flex-col h-screen bg-[#0d1515] text-[#F1F5F9] overflow-hidden select-none relative">
      
      {/* Top Proctoring Indicator Bar (Step 8) */}
      <div className="bg-[#1e1b1b] border-b border-red-500/20 px-6 py-1 z-20 flex justify-between items-center text-[10px] font-mono text-[#CBD5E1]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse"></span>
            🔴 Screen Being Recorded
          </span>
          <span className="text-[#3b494b]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-cyan-400">videocam</span>
            👁️ Webcam Active
          </span>
          <span className="text-[#3b494b]">|</span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-cyan-400">monitor</span>
            🖥️ Screen Shared (Entire Monitor)
          </span>
        </div>
        <span className="text-[#94A3B8] italic hidden sm:inline">
          Accessibility / accommodations? Contact recruiter. Data stored max 30 days.
        </span>
      </div>

      {/* Candidate Header */}
      <header className="flex justify-between items-center px-6 py-3.5 bg-[#151d1e] border-b border-[#3b494b] z-10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm tracking-tight text-[#06B6D4]">CodeWalk Screening Room</h1>
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping"></span>
            <span className="text-[10px] text-cyan-400 font-semibold uppercase tracking-wider">Candidate Workspace</span>
          </div>
          <p className="text-[10px] text-[#94A3B8] mt-0.5 font-mono">
            Repository Context: {session?.repo_url.replace('https://github.com/', '')}
          </p>
        </div>

        {/* Timer Box */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1515] border border-[#3b494b] rounded-lg font-mono">
          <span className="material-symbols-outlined text-sm text-[#06B6D4]">timer</span>
          <span className="text-sm font-bold text-white">{formatTime(timeLeftSeconds)}</span>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT NAV PANEL (Questions List) */}
        <div className="w-[20%] border-r border-[#3b494b] bg-[#151d1e]/40 flex flex-col p-4 overflow-y-auto custom-scrollbar">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-3">Interview Questions</span>
          
          <div className="space-y-2">
            {questions.map((q, idx) => {
              const isSelected = idx === activeQIndex;
              const hasContent = (candidateNotes[q.id] || '').trim().length > 0;

              return (
                <button
                  key={q.id}
                  onClick={() => setActiveQIndex(idx)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-white font-semibold'
                      : 'bg-[#151d1e]/40 border-[#3b494b] text-[#94A3B8] hover:bg-[#151d1e]'
                  }`}
                >
                  <span className="truncate">Question {idx + 1}</span>
                  {hasContent && (
                    <span className="material-symbols-outlined text-emerald-400 text-sm" title="Notes drafted">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAIN PANEL (Active Question + Thoughts Textbox) */}
        {currentQ ? (
          <div className="flex-grow flex overflow-hidden">
            
            {/* Left 50% - Question Text & Code Snippet Reference */}
            <div className="w-1/2 border-r border-[#3b494b] flex flex-col p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div className="bg-[#151d1e] border border-[#3b494b] rounded-xl p-5 shadow-xl space-y-4">
                <span className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-wider block">Question details</span>
                <h2 className="text-base font-bold leading-relaxed text-white">{currentQ.question_text}</h2>
                
                {currentQ.file_path && currentQ.file_path !== 'Custom Question' && (
                  <div className="text-[10px] text-[#94A3B8] font-mono flex items-center gap-1 bg-[#0d1515]/50 px-2.5 py-1.5 rounded border border-[#3b494b]">
                    <span className="material-symbols-outlined text-xs">folder_open</span>
                    <span className="truncate">{currentQ.file_path} (Lines {currentQ.line_start}-{currentQ.line_end})</span>
                  </div>
                )}
              </div>

              {/* Ideal Answer Shared by Interviewer */}
              {currentQ.show_expected_answer && currentQ.shared_answer && (
                <div className="bg-[#06B6D4]/10 border border-[#06B6D4]/40 rounded-xl p-5 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-2 text-cyan-400 font-extrabold uppercase tracking-widest text-xs select-none">
                    <span className="material-symbols-outlined text-sm text-[13px]">info</span>
                    <span>Interviewer Shared: Ideal Solution Guide</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-auto" title="Active Solution Guide Shared"></span>
                  </div>
                  <div className="whitespace-pre-line text-xs leading-relaxed text-[#F1F5F9] bg-[#0d1515]/60 p-4 rounded-lg border border-[#3b494b]/60 font-medium">
                    {currentQ.shared_answer}
                  </div>
                </div>
              )}

              {/* Code Snippet Box */}
              {currentQ.code_snippet ? (
                <div className="flex flex-col flex-grow">
                  <CodeBlock
                    code={currentQ.code_snippet}
                    filePath={currentQ.file_path}
                    lineStart={currentQ.line_start}
                    lineEnd={currentQ.line_end}
                  />
                </div>
              ) : (
                <div className="bg-[#0d1515] border border-[#3b494b] rounded-xl p-8 text-center text-[#94A3B8] italic flex items-center justify-center flex-grow">
                  No code snippet associated with this question.
                </div>
              )}
            </div>

            {/* Right 50% - Explanation Text Area / Options */}
            <div className="w-1/2 flex flex-col p-6 space-y-4 bg-[#151d1e]/10">
              
              {/* Question timer bar (only if MCQ or logical round) */}
              {(session?.interview_mode === 'logical' || (currentQ?.options && currentQ.options.length > 0 && session?.mode_config?.logicalTimerMinutes)) && (
                <div className="space-y-1 mb-2 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center text-[10px] font-bold text-orange-400 uppercase tracking-wider">
                    <span>Question Timer Limit</span>
                    <span className="font-mono">{formatTime(qTimeLeft)}</span>
                  </div>
                  <div className="w-full bg-[#0d1515] h-2 rounded-full overflow-hidden border border-[#3b494b]/60">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-1000 ease-linear"
                      style={{ width: `${Math.max(0, Math.min(100, (qTimeLeft / getLogicalDuration()) * 100))}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider block">
                  {currentQ.options && currentQ.options.length > 0 ? 'Multiple Choice Evaluation' : 'Your Solution Draft & Explanation'}
                </label>
                {savingAnswer[currentQ.id] && (
                  <span className="text-[10px] text-cyan-400 font-semibold animate-pulse inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                    Autosaving thoughts...
                  </span>
                )}
              </div>

              <div className="flex-grow flex flex-col bg-[#0d1515] border border-[#3b494b] rounded-xl overflow-hidden p-4 shadow-xl justify-center">
                {currentQ.options && currentQ.options.length > 0 ? (
                  <div className="space-y-6 w-full py-4 overflow-y-auto custom-scrollbar">
                    <label className="text-xs font-bold text-orange-400 uppercase tracking-wider block text-center">
                      Select Your Answer Option
                    </label>
                    <div className="grid grid-cols-1 gap-4 max-w-md mx-auto w-full px-2">
                      {currentQ.options.map((opt, oIdx) => {
                        const isSelected = candidateNotes[currentQ.id] === opt;
                        return (
                          <button
                            key={oIdx}
                            onClick={async () => {
                              if (timerExpired) return;
                              setCandidateNotes(prev => ({ ...prev, [currentQ.id]: opt }));
                              await saveCandidateAnswer(currentQ.id, opt);
                              setTimeout(() => {
                                if (activeQIndex < questions.length - 1) {
                                  setActiveQIndex(prev => prev + 1);
                                }
                              }, 500);
                            }}
                            className={`p-4 rounded-xl text-left font-mono text-xs border transition-all cursor-pointer w-full ${
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
                  </div>
                ) : (
                  <textarea
                    value={candidateNotes[currentQ.id] || ''}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    className="w-full h-full bg-transparent text-sm text-white focus:outline-none resize-none custom-scrollbar leading-relaxed"
                    placeholder="Draft your solution ideas, complexity analysis, or walkthrough notes here. The interviewer sees these updates in real-time."
                  />
                )}
              </div>

              {/* Navigator footer */}
              <div className="flex justify-between items-center border-t border-[#3b494b] pt-4">
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
                {activeQIndex === questions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-1.5 bg-[#06B6D4] text-xs font-bold rounded-lg text-[#0d1515] hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-[#06B6D4] transition-all inline-flex items-center gap-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit'}
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveQIndex(prev => Math.min(questions.length - 1, prev + 1))}
                    className="px-3.5 py-1.5 border border-[#3b494b] text-xs font-bold rounded-lg text-[#94A3B8] hover:bg-[#0d1515] hover:text-white transition-all inline-flex items-center gap-1"
                  >
                    Next
                    <span className="material-symbols-outlined text-sm">navigate_next</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-grow flex flex-col justify-center items-center text-[#94A3B8] italic p-8 text-center">
            <span className="material-symbols-outlined text-4xl mb-2 text-[#3b494b]">question_mark</span>
            No screening questions loaded for this session.
          </div>
        )}

      </div>

      {/* ==========================================
          FLOATING BOTTOM CORNER PREVIEW (Part 3)
         ========================================== */}
      {isSetupComplete && webcamStream && (
        <div className={`fixed bottom-4 right-4 z-50 rounded-xl overflow-hidden shadow-2xl transition-all border-2 ${faceDetected ? 'border-emerald-500' : 'border-rose-500'} ${webcamMinimized ? 'w-24 h-18' : 'w-40 h-30'}`} style={{ width: webcamMinimized ? '96px' : '160px', height: webcamMinimized ? '72px' : '120px' }}>
          <video
            ref={cornerVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
          {/* Active indicator dot and collapse controls */}
          <div className="absolute top-1 right-1 flex gap-1 z-10">
            <button
              onClick={() => setWebcamMinimized(!webcamMinimized)}
              className="p-0.5 bg-black/60 hover:bg-black/90 text-white rounded text-[8px] flex items-center justify-center font-bold px-1"
            >
              {webcamMinimized ? '➕' : '➖'}
            </button>
          </div>
          <div className="absolute bottom-1 left-1 flex items-center gap-1 bg-black/60 px-1 py-0.5 rounded text-[8px] text-white z-10">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping"></span>
            REC
          </div>
        </div>
      )}

      {/* ==========================================
          PROCTORING WARNING OVERLAYS (Part 2 & 4)
         ========================================== */}
      
      {/* 1. Tab Switch Overlay */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-rose-950/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md space-y-4">
            <span className="material-symbols-outlined text-6xl text-rose-500 animate-bounce">warning</span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">⚠️ Tab Switch Detected</h2>
            <p className="text-sm text-[#F1F5F9] leading-relaxed">
              Leaving the interview tab or window is strictly prohibited. Your actions have been logged in the proctoring report.
            </p>
            <button
              onClick={() => setShowTabWarning(false)}
              className="px-6 py-2 bg-white text-rose-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#CBD5E1] transition-colors cursor-pointer"
            >
              Return to Interview
            </button>
          </div>
        </div>
      )}

      {/* 2. DevTools Warning */}
      {showDevtoolsWarning && (
        <div className="fixed inset-0 bg-rose-950/95 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md space-y-4">
            <span className="material-symbols-outlined text-6xl text-rose-500 animate-bounce">warning</span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">⚠️ DevTools Attempt</h2>
            <p className="text-sm text-[#F1F5F9] leading-relaxed">
              Opening Developer Tools or inspect shortcuts is disabled. This incident has been logged.
            </p>
            <button
              onClick={() => setShowDevtoolsWarning(false)}
              className="px-6 py-2 bg-white text-rose-950 font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-[#CBD5E1] transition-colors cursor-pointer"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* 3. Screen Sharing Stopped Overlay */}
      {showScreenShareWarning && (
        <div className="fixed inset-0 bg-rose-950/98 z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <div className="max-w-md space-y-4">
            <span className="material-symbols-outlined text-6xl text-red-500 animate-pulse">monitor</span>
            <h2 className="text-2xl font-black text-white uppercase tracking-wider">⚠️ Screen Sharing Stopped</h2>
            <p className="text-sm text-[#F1F5F9] leading-relaxed">
              You must share your entire screen to continue the interview. The interview timer has been paused.
            </p>
            <button
              onClick={restartScreenSharing}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">monitor</span>
              Restart Screen Sharing
            </button>
          </div>
        </div>
      )}

      {/* 4. Recruiter Warning Modal (Part 6) */}
      {activeRecruiterWarning && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#1c1818] border-2 border-amber-500 max-w-md w-full rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <span className="material-symbols-outlined text-5xl text-amber-500 animate-pulse">notification_important</span>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">⚠️ Warning from Recruiter</h3>
            <p className="text-sm text-[#F1F5F9] bg-[#0d0d0d] p-4 rounded-xl border border-[#3b494b] font-mono leading-relaxed text-left whitespace-pre-line">
              {activeRecruiterWarning}
            </p>
            <button
              onClick={handleAcknowledgeWarning}
              disabled={acknowledgingWarning}
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-[#0d1515] text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              {acknowledgingWarning ? 'Acknowledging...' : 'I Acknowledge'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
