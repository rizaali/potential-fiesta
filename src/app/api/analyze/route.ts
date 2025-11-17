import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze the following journal entry and provide:
1. A one-sentence summary
2. The dominant emotion (one word only, like: happy, sad, anxious, excited, calm, etc.)

Respond in JSON format with exactly these keys: "summary" and "emotion".`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
    } catch (openaiError: any) {
      // Re-throw OpenAI-specific errors to be handled below
      throw openaiError;
    }

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    const analysis = JSON.parse(response);

    return NextResponse.json({
      summary: analysis.summary || 'No summary available',
      emotion: analysis.emotion || 'neutral',
    });
  } catch (error: any) {
    console.error('Error analyzing entry:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to analyze entry';
    let statusCode = 500;
    
    // Check for OpenAI API errors
    const errorStatus = error.status || error.statusCode || error.response?.status;
    const errorCode = error.code || error.error?.code;
    const errorMsg = error.message || error.error?.message || '';
    
    if (errorStatus === 429 || errorCode === 'insufficient_quota' || errorMsg.includes('quota') || errorMsg.includes('exceeded')) {
      errorMessage = 'OpenAI API quota exceeded. Please check your plan and billing details at https://platform.openai.com/account/billing';
      statusCode = 429;
    } else if (errorStatus === 401 || errorCode === 'invalid_api_key' || errorMsg.includes('Invalid API key') || errorMsg.includes('authentication')) {
      errorMessage = 'Invalid OpenAI API key. Please check your .env.local file.';
      statusCode = 401;
    } else if (errorMsg) {
      errorMessage = errorMsg;
      // Try to extract status code from error if available
      if (errorStatus) {
        statusCode = errorStatus;
      }
    } else if (error.response) {
      errorMessage = `OpenAI API error: ${error.response.status} - ${error.response.statusText}`;
      statusCode = error.response.status || 500;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

