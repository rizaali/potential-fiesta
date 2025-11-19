import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabase';

// Route segment config for Next.js App Router
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Set max duration to 60 seconds to allow sufficient time for OpenAI analysis
export const maxDuration = 60;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ExplainSimilarityRequest {
  sourceId: string;
  targetId: string;
}

/**
 * POST /api/explain-similarity
 * Analyzes two journal entries and explains why they are semantically similar
 * 
 * Request body:
 * {
 *   "sourceId": "entry-id-1",
 *   "targetId": "entry-id-2"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: ExplainSimilarityRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[API] Failed to parse request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { sourceId, targetId } = body;

    // Validate input
    if (!sourceId || typeof sourceId !== 'string' || sourceId.trim().length === 0) {
      return NextResponse.json(
        { error: 'sourceId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!targetId || typeof targetId !== 'string' || targetId.trim().length === 0) {
      return NextResponse.json(
        { error: 'targetId is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    console.log('[API] Fetching journal entries for similarity analysis...');
    console.log('[API] Source ID:', sourceId);
    console.log('[API] Target ID:', targetId);

    // Fetch both entries from Supabase in parallel
    const [entryA, entryB] = await Promise.all([
      supabase
        .from('journal_entries')
        .select('title, content')
        .eq('id', sourceId)
        .single(),
      supabase
        .from('journal_entries')
        .select('title, content')
        .eq('id', targetId)
        .single(),
    ]);

    // Check for errors
    if (entryA.error) {
      console.error('[API] Error fetching source entry:', entryA.error);
      return NextResponse.json(
        { error: `Failed to fetch source entry: ${entryA.error.message}` },
        { status: 404 }
      );
    }

    if (entryB.error) {
      console.error('[API] Error fetching target entry:', entryB.error);
      return NextResponse.json(
        { error: `Failed to fetch target entry: ${entryB.error.message}` },
        { status: 404 }
      );
    }

    if (!entryA.data || !entryB.data) {
      return NextResponse.json(
        { error: 'One or both entries not found' },
        { status: 404 }
      );
    }

    console.log('[API] Entries fetched successfully');
    console.log('[API] Entry A title:', entryA.data.title);
    console.log('[API] Entry B title:', entryB.data.title);

    // Construct the analysis prompt
    const analysisPrompt = `Analyze the following two journal entries and summarize the top 3 core themes, emotions, or concepts they share. Be concise and write for a user hover tooltip. Format your response as a single sentence starting with "These two entries are both about" or similar phrasing.

Entry 1:
Title: ${entryA.data.title}
Content: ${entryA.data.content}

Entry 2:
Title: ${entryB.data.title}
Content: ${entryB.data.content}

Provide a concise explanation of their shared themes:`;

    console.log('[API] Calling OpenAI Chat API for analysis...');

    // Call OpenAI Chat Completion API
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent, focused results
      max_tokens: 150, // Limit response length for tooltip
    });

    if (!completion || !completion.choices || !completion.choices[0] || !completion.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }

    const explanation = completion.choices[0].message.content?.trim() || 'Unable to generate explanation.';

    console.log('[API] Explanation generated successfully');
    console.log('[API] Explanation:', explanation);

    return NextResponse.json(
      {
        explanation: explanation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API] Error in explain-similarity:', error);
    console.error('[API] Error message:', error.message);
    console.error('[API] Error stack:', error.stack);

    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'OpenAI API key is missing or invalid' },
        { status: 500 }
      );
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return NextResponse.json(
        { error: 'OpenAI API quota exceeded. Please check your billing.' },
        { status: 500 }
      );
    } else {
      return NextResponse.json(
        { error: `Failed to generate explanation: ${error.message}` },
        { status: 500 }
      );
    }
  }
}

