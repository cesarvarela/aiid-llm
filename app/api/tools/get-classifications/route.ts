import { NextResponse } from 'next/server';
import { generateClassification } from '@/lib/classification';

export async function POST(req: Request) {
  try {
    // Set CORS headers to allow requests from staging environment
    const headers = {
      'Access-Control-Allow-Origin': 'https://pr-3447--staging-aiid.netlify.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, { headers, status: 204 });
    }

    const { text, taxonomy } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid question' },
        { status: 400, headers }
      );
    }

    if (!taxonomy || typeof taxonomy !== 'string' || !taxonomy.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid taxonomy namespace' },
        { status: 400, headers }
      );
    }

    const result = await generateClassification(text, taxonomy);

    const parsedResult = JSON.parse(result);

    return NextResponse.json(parsedResult, { headers });
  }
  catch (error) {
    const headers = {
      'Access-Control-Allow-Origin': 'https://pr-3447--staging-aiid.netlify.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    console.error('Error in get-information API:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500, headers }
    );
  }
} 