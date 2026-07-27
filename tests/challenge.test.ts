import { describe, it, expect, vi } from 'vitest';
import { generateMicroChallenge } from '../app/lib/challengeGenerator';
import { callGroq } from '../app/lib/gemini';

// Mock gemini Groq caller
vi.mock('../app/lib/gemini', async (importOriginal) => {
  const original = await importOriginal<any>();
  return {
    ...original,
    callGroq: vi.fn(),
  };
});

describe('generateMicroChallenge()', () => {
  const sampleCode = `
    function add(a, b) {
      return a + b;
    }
  `;

  it('correctly parses challenge details from LLM JSON response', async () => {
    const mockResponse = JSON.stringify({
      challengeType: 'bug',
      taskDescription: 'Fix the logical bug',
      starterCode: 'starter code contents',
      originalCode: 'original code contents',
      referenceSolution: 'reference solution contents'
    });

    vi.mocked(callGroq).mockResolvedValueOnce(mockResponse);

    const result = await generateMicroChallenge(sampleCode, 'src/math.js', 'All', 'bug');
    expect(result).not.toBeNull();
    expect(result?.challengeType).toBe('bug');
    expect(result?.taskDescription).toBe('Fix the logical bug');
    expect(result?.starterCode).toBe('starter code contents');
    expect(result?.originalCode).toBe('original code contents');
    expect(result?.referenceSolution).toBe('reference solution contents');
  });

  it('falls back gracefully to a starter challenge when LLM fails', async () => {
    // Force a JSON parse error to trigger fallback
    vi.mocked(callGroq).mockRejectedValueOnce(new Error('Network Timeout'));

    const result = await generateMicroChallenge(sampleCode, 'src/math.js', 'All', 'bug');
    expect(result).not.toBeNull();
    expect(result?.filePath).toBe('src/math.js');
    expect(result?.challengeType).toBe('bug');
    expect(result?.taskDescription).toContain('Bug Fix Challenge');
    expect(result?.starterCode).toBe(sampleCode);
    expect(result?.originalCode).toBe(sampleCode);
    expect(result?.referenceSolution).toBe(sampleCode);
  });
});
