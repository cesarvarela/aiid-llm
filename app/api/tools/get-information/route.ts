import { NextResponse } from 'next/server';
import { Search } from '@/lib/Search';
import { createEmbeddingProvider } from '@/lib/utils';

export async function POST(req: Request) {
  try {
    const { question } = await req.json();
    
    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Please provide a valid question' },
        { status: 400 }
      );
    }

    const search = new Search(createEmbeddingProvider('openai'));
    const searchResults = await search.vectorSearch(question.trim(), 0.2, 100);
    
    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Error in get-information API:', error);
    return NextResponse.json(
      { error: 'Failed to search knowledge base: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 