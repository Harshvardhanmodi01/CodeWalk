import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Polyfill global DOM objects for pdf-parse/pdfjs evaluation in Node.js
if (typeof global !== 'undefined') {
  if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {};
  }
  if (typeof (global as any).ImageData === 'undefined') {
    (global as any).ImageData = class ImageData {};
  }
  if (typeof (global as any).Path2D === 'undefined') {
    (global as any).Path2D = class Path2D {};
  }
}

const pdf = require('pdf-parse');

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    let text = '';

    const fileNameLower = file.name.toLowerCase();
    
    if (fileNameLower.endsWith('.docx')) {
      const mammoth = require('mammoth');
      const docxResult = await mammoth.extractRawText({ buffer });
      text = docxResult.value || '';
    } else {
      // PDF text extraction
      try {
        const pdfData = await pdf(buffer);
        text = pdfData.text || '';
      } catch (pdfErr: any) {
        console.error('pdf-parse failed, attempting simple string extraction fallback:', pdfErr);
        // Clean fallback: search buffer for plain-text strings to avoid failing completely
        const strings = buffer.toString('utf-8').match(/[\w\.\-]+@[\w\.\-]+\.[\w]{2,4}/gi);
        if (strings && strings.length > 0) {
          text = `Email found in fallback: ${strings.join(', ')}`;
        } else {
          // Instead of throwing, set text empty to trigger file name fallback
          text = '';
        }
      }
    }

    // Define a robust regex fallback parser
    const parseWithRegex = (rawText: string, fileName: string) => {
      const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[_\-\+]/g, " ").trim();
      const capitalizedName = baseName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

      const emailRegex = /[\w\.\-]+@[\w\.\-]+\.[\w]{2,4}/i;
      const githubRegex = /github\.com\/([a-zA-Z0-9_\-\.]+)/i;
      const linkedinRegex = /linkedin\.com\/in\/([a-zA-Z0-9_\-\.]+)/i;

      const emailMatch = rawText.match(emailRegex);
      const githubMatch = rawText.match(githubRegex);
      const linkedinMatch = rawText.match(linkedinRegex);

      return {
        name: capitalizedName || 'Candidate',
        email: emailMatch ? emailMatch[0] : '',
        github_url: githubMatch ? `https://github.com/${githubMatch[1]}` : '',
        linkedin_url: linkedinMatch ? `https://linkedin.com/in/${linkedinMatch[1]}` : '',
        skills: [],
        years_experience: '',
        current_title: ''
      };
    };

    if (!text.trim()) {
      // Scanned or empty file fallback: extract name from file name
      return NextResponse.json({ parsed: parseWithRegex('', file.name) });
    }

    // Call Groq to parse the resume text
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      // Fallback if API key missing
      return NextResponse.json({ parsed: parseWithRegex(text, file.name) });
    }

    let parsed: any = null;

    try {
      const groq = new Groq({ apiKey: groqKey });
      const systemPrompt = `You are a professional resume parsing assistant. Analyze the provided resume text and extract the candidate details.
Return a valid JSON object matching this schema:
{
  "name": "Candidate Full Name",
  "email": "email@domain.com",
  "github_url": "https://github.com/username (or empty string if not found)",
  "linkedin_url": "https://linkedin.com/in/username (or empty string if not found)",
  "skills": ["JavaScript", "Python", "React", "Docker", "etc."],
  "years_experience": "X years",
  "current_title": "Current or most recent job title (or empty string if not found)"
}
Return ONLY valid JSON. No markdown code blocks, no text surrounding the JSON. If any field is not found in the resume, leave it as an empty string (or empty array for skills).`;

      // Try 1: llama-3.3-70b-versatile
      try {
        const completion = await groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.slice(0, 12000) } // limit size to avoid token limit errors
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const resultText = completion.choices?.[0]?.message?.content || '{}';
        parsed = JSON.parse(resultText);
      } catch (err1) {
        console.warn('Groq llama-3.3-70b-versatile failed, trying llama-3.1-8b-instant:', err1);
        
        // Try 2: llama-3.1-8b-instant (Fast fallback model)
        const completion = await groq.chat.completions.create({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text.slice(0, 12000) }
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' }
        });

        const resultText = completion.choices?.[0]?.message?.content || '{}';
        parsed = JSON.parse(resultText);
      }
    } catch (groqErr) {
      console.warn('All Groq parsing attempts failed, executing regex fallback:', groqErr);
    }

    if (parsed) {
      // Validate email and github url fallback
      const finalParsed = {
        name: parsed.name || parseWithRegex(text, file.name).name,
        email: parsed.email || parseWithRegex(text, file.name).email,
        github_url: parsed.github_url || parseWithRegex(text, file.name).github_url,
        linkedin_url: parsed.linkedin_url || parseWithRegex(text, file.name).linkedin_url,
        skills: parsed.skills || [],
        years_experience: parsed.years_experience || '',
        current_title: parsed.current_title || parsed.role_applied || ''
      };
      return NextResponse.json({ parsed: finalParsed });
    } else {
      return NextResponse.json({ parsed: parseWithRegex(text, file.name) });
    }
  } catch (err: any) {
    console.error('Resume parsing API error:', err);
    return NextResponse.json({ error: err.message || 'Failed to parse resume.' }, { status: 500 });
  }
}
