import { NextRequest, NextResponse } from 'next/server';
import { generateEmbedding } from '@/lib/embeddings';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/journal
 * Creates a new journal entry with an embedding vector
 * 
 * Request body:
 * {
 *   "title": "Entry title",
 *   "content": "Journal entry content"
 * }
 */
export async function POST(request) {
  try {
    // Parse request body
    const body = await request.json();
    const { title, content } = body;

    // Validate input
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    // Generate embedding for the content
    console.log('[API] Starting embedding generation for journal entry...');
    console.log('[API] Content length:', content.length);
    let embedding;
    try {
      embedding = await generateEmbedding(content);
      console.log(`[API] Embedding generated successfully with ${embedding.length} dimensions`);
      
      // Validate embedding before proceeding
      if (!embedding || !Array.isArray(embedding)) {
        throw new Error(`Invalid embedding: expected array, got ${typeof embedding}`);
      }
      
      if (embedding.length !== 384) {
        throw new Error(`Invalid embedding dimensions: expected 384, got ${embedding.length}`);
      }
      
      // Validate all values are numbers
      const invalidValues = embedding.filter(v => typeof v !== 'number' || isNaN(v));
      if (invalidValues.length > 0) {
        throw new Error(`Embedding contains ${invalidValues.length} invalid values`);
      }
      
      console.log('[API] Embedding validation passed');
      console.log('[API] Embedding sample (first 5 values):', embedding.slice(0, 5));
    } catch (embeddingError) {
      console.error('[API] ========== EMBEDDING GENERATION FAILED ==========');
      console.error('[API] Error type:', embeddingError.constructor.name);
      console.error('[API] Error message:', embeddingError.message);
      console.error('[API] Error stack:', embeddingError.stack);
      console.error('[API] =================================================');
      
      // DO NOT insert with NULL embedding - return error instead
      return NextResponse.json(
        { 
          error: 'Failed to generate embedding',
          details: embeddingError.message,
          stack: process.env.NODE_ENV === 'development' ? embeddingError.stack : undefined
        },
        { status: 500 }
      );
    }

    // Final validation before insert
    if (!embedding || !Array.isArray(embedding) || embedding.length !== 384) {
      console.error('[API] ========== CRITICAL: Embedding validation failed before insert ==========');
      console.error('[API] Embedding value:', embedding);
      console.error('[API] Embedding type:', typeof embedding);
      console.error('[API] Is array:', Array.isArray(embedding));
      console.error('[API] Length:', embedding?.length);
      console.error('[API] =================================================');
      return NextResponse.json(
        { 
          error: 'Invalid embedding: cannot insert with NULL or invalid embedding',
          details: 'Embedding validation failed before database insert'
        },
        { status: 500 }
      );
    }

    // Insert into Supabase
    console.log('[API] Inserting journal entry into Supabase with embedding...');
    console.log('[API] Embedding dimensions:', embedding.length);
    const { data, error } = await supabase
      .from('journal_entries')
      .insert([
        {
          title: title.trim(),
          content: content.trim(),
          embedding: embedding, // Store the 384-dimensional vector
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: `Failed to save journal entry: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Journal entry saved successfully with embedding');
    return NextResponse.json(
      {
        success: true,
        data: {
          id: data.id,
          title: data.title,
          content: data.content,
          created_at: data.created_at,
          embedding_dimensions: embedding.length,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/journal:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    );
  }
}

