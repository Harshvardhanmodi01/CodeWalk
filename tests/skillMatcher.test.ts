import { describe, it, expect, vi } from 'vitest';
import { extractSkillsFromJD, compareSkills } from '../app/lib/skillMatcher';
import Groq from 'groq-sdk';

process.env.GROQ_API_KEY = 'mock-api-key';

// Mock groq-sdk client
vi.mock('groq-sdk', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any) {
      this.chat = {
        completions: {
          create: vi.fn()
        }
      };
    })
  };
});

describe('JD-to-Skill Gap Matching', () => {
  const sampleJdText = 'Looking for a Senior React Developer with TypeScript and Docker experience.';

  it('extracts skills from Job Description text', async () => {
    const mockJdResponse = JSON.stringify({
      required: ['React', 'TypeScript'],
      nice_to_have: ['Docker'],
      seniority: 'Senior'
    });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: mockJdResponse } }]
    });

    vi.mocked(Groq).mockImplementation(function (this: any) {
      this.chat = {
        completions: {
          create: mockCreate
        }
      };
    } as any);

    const result = await extractSkillsFromJD(sampleJdText);
    expect(result).not.toBeNull();
    expect(result?.required).toContain('React');
    expect(result?.nice_to_have).toContain('Docker');
    expect(result?.seniority).toBe('Senior');
  });

  it('compares expected skills with candidate repository data', async () => {
    const mockMatchResponse = JSON.stringify({
      strong_match: [{ skill: 'React', justification: 'React functional components found.' }],
      partial_match: [{ skill: 'TypeScript', justification: 'Used in configuration.' }],
      no_evidence: [{ skill: 'Docker', justification: 'No docker configurations found.' }]
    });

    const mockCreate = vi.fn().mockResolvedValue({
      choices: [{ message: { content: mockMatchResponse } }]
    });

    vi.mocked(Groq).mockImplementation(function (this: any) {
      this.chat = {
        completions: {
          create: mockCreate
        }
      };
    } as any);

    const jdSkills = {
      required: ['React', 'TypeScript'],
      nice_to_have: ['Docker'],
      seniority: 'Senior'
    };

    const mockRepoAnalysis = {
      files: [
        {
          fileName: 'src/App.tsx',
          questions: 'How does the state work?',
          codeSnapshots: [{ snippet: 'import React from "react";' }]
        }
      ]
    };

    const result = await compareSkills(jdSkills, mockRepoAnalysis);
    expect(result).not.toBeNull();
    expect(result?.strong_match[0].skill).toBe('React');
    expect(result?.partial_match[0].skill).toBe('TypeScript');
    expect(result?.no_evidence[0].skill).toBe('Docker');
  });
});
