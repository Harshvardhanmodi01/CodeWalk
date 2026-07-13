import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import path from 'path';
import { requireAuth } from '@/app/lib/auth-middleware';
import { logSecurityEvent } from '@/app/lib/security';

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

function sanitizeFilename(filename: string): string {
  let cleaned = filename.replace(/\.\.+\//g, '').replace(/\.\.+\\/g, '');
  cleaned = path.basename(cleaned);
  cleaned = cleaned.replace(/[^a-zA-Z0-9\.\-_]/g, '_');
  return cleaned;
}

export async function POST(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : ((req as any).ip || '127.0.0.1');

  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof Response) {
      return authResult;
    }

    const formData = await req.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Enforce 5MB size limit server-side
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      await logSecurityEvent('UPLOAD_REJECTED_SIZE', ip, authResult.id, {
        fileName: file.name,
        fileSize: file.size,
        maxSize: maxSizeBytes,
      }, 'warning');
      return NextResponse.json({ error: 'File size exceeds maximum limit of 5MB' }, { status: 400 });
    }

    // 2. Validate file extension: Only .pdf and .docx allowed
    const fileExt = path.extname(file.name).toLowerCase();
    if (fileExt !== '.pdf' && fileExt !== '.docx') {
      await logSecurityEvent('UPLOAD_REJECTED_INVALID_EXTENSION', ip, authResult.id, {
        fileName: file.name,
        extension: fileExt,
      }, 'warning');
      return NextResponse.json({ error: 'Only PDF and DOCX resumes are allowed' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Verify Magic Bytes
    // PDF magic bytes: 25 50 44 46 (%PDF)
    // DOCX (ZIP) magic bytes: 50 4b 03 04 (PK..)
    const hex = buffer.toString('hex', 0, 4).toLowerCase();
    if (fileExt === '.pdf' && hex !== '25504446') {
      await logSecurityEvent('UPLOAD_REJECTED_MAGIC_BYTES_MISMATCH', ip, authResult.id, {
        fileName: file.name,
        hexSignature: hex,
      }, 'warning');
      return NextResponse.json({ error: 'Invalid PDF file type' }, { status: 400 });
    } else if (fileExt === '.docx' && hex !== '504b0304') {
      await logSecurityEvent('UPLOAD_REJECTED_MAGIC_BYTES_MISMATCH', ip, authResult.id, {
        fileName: file.name,
        hexSignature: hex,
      }, 'warning');
      return NextResponse.json({ error: 'Invalid DOCX file type' }, { status: 400 });
    }

    const sanitizedName = sanitizeFilename(file.name);
    let text = '';

    if (fileExt === '.pdf') {
      // PDF text extraction
      try {
        const pdfData = await pdf(buffer);
        text = pdfData.text || '';
      } catch (pdfErr: any) {
        console.error('pdf-parse failed, attempting simple string extraction fallback:', pdfErr);
        const strings = buffer.toString('utf-8').match(/[\w\.\-]+@[\w\.\-]+\.[\w]{2,4}/gi);
        if (strings && strings.length > 0) {
          text = `Email found in fallback: ${strings.join(', ')}`;
        } else {
          text = '';
        }
      }
    } else if (fileExt === '.docx') {
      // DOCX text extraction using mammoth
      try {
        const mammoth = require('mammoth');
        const docxResult = await mammoth.extractRawText({ buffer });
        text = docxResult.value || '';
      } catch (docxErr: any) {
        console.error('mammoth docx extraction failed, attempting simple string extraction fallback:', docxErr);
        const strings = buffer.toString('utf-8').match(/[\w\.\-]+@[\w\.\-]+\.[\w]{2,4}/gi);
        if (strings && strings.length > 0) {
          text = `Email found in fallback: ${strings.join(', ')}`;
        } else {
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
      return NextResponse.json({ 
        parsed: parseWithRegex(text, file.name),
        warning: 'AI parsing is currently unavailable (Groq API Key is missing on the server). Executed fallback text pattern matching.'
      });
    }

    let parsed: any = null;
    let parsingWarning = '';

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
      } catch (err1: any) {
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
    } catch (groqErr: any) {
      console.warn('All Groq parsing attempts failed, executing regex fallback:', groqErr);
      parsingWarning = `AI parsing was unavailable (${groqErr.message || groqErr}). Executed fallback text pattern matching instead.`;
    }

    if (parsed) {
      // Validate email and github url fallback
      const finalParsed = {
        name: parsed.name || parseWithRegex(text, sanitizedName).name,
        email: parsed.email || parseWithRegex(text, sanitizedName).email,
        github_url: parsed.github_url || parseWithRegex(text, sanitizedName).github_url,
        linkedin_url: parsed.linkedin_url || parseWithRegex(text, sanitizedName).linkedin_url,
        skills: parsed.skills || [],
        years_experience: parsed.years_experience || '',
        current_title: parsed.current_title || parsed.role_applied || ''
      };
      return NextResponse.json({ parsed: finalParsed, warning: parsingWarning });
    } else {
      return NextResponse.json({ parsed: parseWithRegex(text, sanitizedName), warning: parsingWarning });
    }
  } catch (err: any) {
    console.error('Resume parsing API error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
