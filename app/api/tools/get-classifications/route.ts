import { NextResponse } from 'next/server';
import { generateClassification } from '@/lib/classification';

export async function POST(req: Request) {
  try {
    const { text, taxonomy } = await req.json();

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid question' },
        { status: 400 }
      );
    }

    if (!taxonomy || typeof taxonomy !== 'string' || !taxonomy.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid taxonomy namespace' },
        { status: 400 }
      );
    }

    const result = await generateClassification(text, taxonomy);

    const parsedResult = JSON.parse(result);

    return NextResponse.json(parsedResult);
  }
  catch (error) {
    console.error('Error in get-information API:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 