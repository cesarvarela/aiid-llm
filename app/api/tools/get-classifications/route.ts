import { NextResponse } from 'next/server';
import { generateClassification } from '@/lib/classification';

// Add explicit OPTIONS handler for CORS preflight requests
export async function OPTIONS(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  return new NextResponse(null, { headers, status: 204 });
}

export async function POST(req: Request) {
  try {
    // Set CORS headers to allow requests from both staging and production environments
    const headers = {
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };

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
      'Access-Control-Allow-Origin': req.headers.get('origin') || '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
      'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    };
    
    console.error('Error in get-information API:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500, headers }
    );
  }
} 