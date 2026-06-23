export interface Question {
  id: string;
  lineNumber: number;
  codeSnippet: string;
  question: string;
  expectedAnswer: string;
  difficulty: 'junior' | 'mid' | 'senior';
  category: 'Code Logic' | 'Bug' | 'Security' | 'Performance' | 'Architecture' | 'Testability';
  selfCritiqueScore: number;
}

export interface FileAssessment {
  fileName: string;
  questions: Question[];
}

export interface JobAssessment {
  jobId: string;
  repo: string;
  candidateName: string;
  status: string;
  files: FileAssessment[];
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  createdAt: string;
  apiResult?: any;
}

export const mockJobs: Record<string, JobAssessment> = {
  job_abc123: {
    jobId: "job_abc123",
    repo: "github.com/johndoe/ecommerce-app",
    candidateName: "Rahul Sharma",
    status: "completed",
    files: [
      {
        fileName: "src/auth/middleware.js",
        questions: [
          {
            id: "q1",
            lineNumber: 47,
            codeSnippet: `// lines 42-52 of middleware.js
const jwt = require('jsonwebtoken');

function authMiddleware(config) {
  const secret = config.jwtSecret;
  
  // closure preserves configuration details
  return function(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Unauthorized');
    
    jwt.verify(token, secret, (err, user) => {
      if (err) return res.status(403).send('Forbidden');
      req.user = user;
      next();
    });
  };
}`,
            question: "On line 47, you're using a closure to preserve the user session state. Why did you choose a closure here instead of storing it directly on the request object?",
            expectedAnswer: "Closures provide encapsulation and prevent accidental mutation of session state by other middleware functions in the chain.",
            difficulty: "mid",
            category: "Code Logic",
            selfCritiqueScore: 8.5
          },
          {
            id: "q2",
            lineNumber: 48,
            codeSnippet: `// lines 45-55 of middleware.js
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('Unauthorized');
    
    // Verify token without standard header prefix check
    jwt.verify(token, secret, (err, user) => {
      if (err) return res.status(403).send('Forbidden');
      req.user = user;
      next();
    });`,
            question: "On line 48, the token verification extracts the token raw from the header. What security risk does this invite and what is the standard header scheme for token extraction?",
            expectedAnswer: "It assumes the token is sent raw instead of adhering to the Bearer scheme ('Bearer <token>'). If standard Authorization headers are sent with the scheme prefix, token verification will fail. Best practice is split verification.",
            difficulty: "mid",
            category: "Security",
            selfCritiqueScore: 9.0
          }
        ]
      },
      {
        fileName: "src/database/client.js",
        questions: [
          {
            id: "q3",
            lineNumber: 14,
            codeSnippet: `// lines 10-20 of client.js
const { Pool } = require('pg');

let pool;

function getDbClient() {
  if (!pool) {
    // Missing connection limit cap configuration
    pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
  }
  return pool;
}`,
            question: "On line 14, the DB pool is initialized without specifying pool sizes. What are the stability implications of PostgreSQL client pools operating under high concurrent request spikes?",
            expectedAnswer: "Without connection caps or limits, database connection exhausts fast, throwing pool timeout errors or shutting database instance down.",
            difficulty: "senior",
            category: "Performance",
            selfCritiqueScore: 9.2
          }
        ]
      }
    ],
    tokenUsage: {
      promptTokens: 12400,
      completionTokens: 3200,
      totalTokens: 15600
    },
    createdAt: "2025-06-20T10:30:00Z"
  },
  job_react: {
    jobId: "job_react",
    repo: "github.com/facebook/react",
    candidateName: "Sarah Chen",
    status: "completed",
    files: [
      {
        fileName: "src/components/DataGrid.tsx",
        questions: [
          {
            id: "r1",
            lineNumber: 14,
            codeSnippet: `// lines 10-18 of DataGrid.tsx
import { useMemo } from 'react';

const DataGrid = ({ items, filter }) => {
  const filteredData = useMemo(() => {
    // Heavy computation here
    return items.filter(item => item.includes(filter));
  }, [items]); // Missing 'filter' dependency

  return (
    <div>
      {filteredData.map(i => <span key={i}>{i}</span>)}
    </div>
  );
};`,
            question: "The useMemo hook on line 14 is missing a critical dependency. Identify the missing variable and explain why its absence causes stale UI states.",
            expectedAnswer: "The missing dependency is 'filter'. In React's useMemo hook, the array lists dependencies for recalculating cached values. Since it only contains [items], the component will skip recalculating if only 'filter' changes, causing stale states.",
            difficulty: "mid",
            category: "Performance",
            selfCritiqueScore: 8.8
          }
        ]
      }
    ],
    tokenUsage: {
      promptTokens: 18400,
      completionTokens: 4100,
      totalTokens: 22500
    },
    createdAt: "2025-06-20T12:45:00Z"
  }
};

export function getJobById(jobId: string): JobAssessment {
  // Try to load from localStorage if in browser environment
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('cw_analyses');
      if (stored) {
        const list = JSON.parse(stored);
        const found = list.find((a: any) => a.jobId === jobId);
        if (found && found.apiResult) {
          const apiResult = found.apiResult;
          
          // Helper to parse questions from raw text
          const parseQuestionsText = (txt: string, snapshots: any[]) => {
            const parsedList: Question[] = [];
            // Split by blank lines or double newlines to separate question blocks
            const blocks = txt.split(/\n\s*\n+/);
            let qIndex = 1;
            for (const block of blocks) {
              const lines = block.trim().split('\n');
              if (lines.length < 2) continue;
              
              const qLine = lines[0].trim();
              const aLine = lines.slice(1).join('\n').trim();
              
              const match = qLine.match(/^\[(C\d*|P\d*|D|G\d*)\](.*)/i);
              if (!match) continue;
              
              const tag = match[1].toUpperCase();
              let text = match[2].trim();
              
              let lineNumber = 1;
              const lineMatch = text.match(/Line\s+(\d+)[:\s]*(.*)/i);
              if (lineMatch) {
                lineNumber = parseInt(lineMatch[1], 10);
                text = lineMatch[2].trim();
              }
              
              let answerText = aLine;
              if (aLine.match(/^A[:\s]/i)) {
                answerText = aLine.replace(/^A[:\s]*/i, '').trim();
              }
              
              const snap = snapshots.find((s) => s.lineNumber === lineNumber);
              const snippet = snap ? snap.snippet : `// Line ${lineNumber}`;
              
              parsedList.push({
                id: `${tag.toLowerCase()}_${qIndex++}`,
                lineNumber,
                codeSnippet: snippet,
                question: text || qLine,
                expectedAnswer: answerText,
                difficulty: 'mid',
                category: tag.startsWith('C') ? 'Code Logic' : 'Architecture',
                selfCritiqueScore: 8.5
              });
            }
            return parsedList;
          };

          const files: FileAssessment[] = (apiResult.files || []).map((f: any) => {
            const parsed = parseQuestionsText(f.questions, f.codeSnapshots || []);
            return {
              fileName: f.fileName,
              questions: parsed
            };
          });

          // Extract readme/generic questions if present
          const readmeContent = apiResult.readme || '';
          const readmeQs = apiResult.readmeQuestions ? parseQuestionsText(apiResult.readmeQuestions, []) : [];
          const genericQs = apiResult.genericQuestions ? parseQuestionsText(apiResult.genericQuestions, []) : [];
          const combined = [...readmeQs, ...genericQs].map((q) => ({
            ...q,
            codeSnippet: readmeContent || '// Failed to load file content. Please try again.'
          }));
          if (combined.length > 0) {
            files.push({
              fileName: 'Project Readme & Domain',
              questions: combined
            });
          }

          return {
            jobId: found.jobId,
            repo: found.repo,
            candidateName: found.candidateName,
            status: found.status,
            files,
            tokenUsage: {
              promptTokens: 12000,
              completionTokens: 3500,
              totalTokens: 15500
            },
            createdAt: found.createdAt,
            apiResult
          };
        }
      }
    } catch (e) {
      console.error('Failed to resolve job from localStorage', e);
    }
  }

  // Fallback to mock jobs
  return mockJobs[jobId] || {
    jobId,
    repo: "github.com/custom/repo-assessment",
    candidateName: "Rahul Sharma",
    status: "completed",
    files: [
      {
        fileName: "src/components/Main.ts",
        questions: [
          {
            id: "q1",
            lineNumber: 42,
            codeSnippet: `// lines 38-50 of Main.ts
const useInternalLogic = (deps: any[]) => {
  const [state, setState] = useState(initial);

  // CRITICAL: Trigger re-render on dependency mismatch
  useEffect(() => {
    const result = computeExpensiveOperation(deps);
    setState(result);
  }, [deps]);

  return state;
};`,
            question: "How would you optimize the re-rendering logic in this hook? Consider the implications of computeExpensiveOperation and how it interacts with the React rendering lifecycle.",
            expectedAnswer: "Wrap computeExpensiveOperation or avoid dependency arrays containing arrays directly without reference stability (useMemo/useCallback on parent parameters) otherwise it triggers on every cycle.",
            difficulty: "mid",
            category: "Performance",
            selfCritiqueScore: 8.0
          }
        ]
      }
    ],
    tokenUsage: {
      promptTokens: 9800,
      completionTokens: 2500,
      totalTokens: 12300
    },
    createdAt: new Date().toISOString()
  };
}
