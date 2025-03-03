import { EmbeddingProvider } from '../types';
import { OpenAIEmbeddings } from './OpenAIEmbeddings';
import { VoyageEmbeddings } from './VoyagerEmbeddings';
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 

/**
 * Creates an embedding provider based on the specified provider name
 * @param providerName The name of the provider ('openai' or 'voyageai'/'voyage')
 * @returns An instance of the specified embedding provider
 */
export function createEmbeddingProvider(providerName: string): EmbeddingProvider {
    switch (providerName.toLowerCase()) {
        case 'openai':
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OPENAI_API_KEY environment variable is required for OpenAI provider');
            }
            return new OpenAIEmbeddings(process.env.OPENAI_API_KEY);
        case 'voyageai':
        case 'voyage':
            
            if (!process.env.VOYAGE_API_KEY) {
                throw new Error('VOYAGE_API_KEY environment variable is required for VoyageAI provider');
            }
            return new VoyageEmbeddings(process.env.VOYAGE_API_KEY);
        default:
            throw new Error(`Unknown provider: ${providerName}. Available options: openai, voyageai`);
    }
} 