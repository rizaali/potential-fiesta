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
    console.log('Generating embedding for journal entry...');
    let embedding;
    try {
      embedding = await generateEmbedding(content);
      console.log(`Generated embedding with ${embedding.length} dimensions`);
    } catch (embeddingError) {
      console.error('Error generating embedding:', embeddingError);
      // Continue without embedding if generation fails
      // You can choose to return an error here if embedding is required
      return NextResponse.json(
        { error: `Failed to generate embedding: ${embeddingError.message}` },
        { status: 500 }
      );
    }

    // Insert into Supabase
    console.log('Inserting journal entry into Supabase...');
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

