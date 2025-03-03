import { EmbeddingProvider, EmbeddingResponse } from "../types";
import OpenAI from "openai";


export class OpenAIEmbeddings implements EmbeddingProvider {
    private model = "text-embedding-3-small";
    private client: OpenAI;

    constructor(apiKey: string) {
        this.client = new OpenAI({ apiKey });
    }

    async getEmbedding(text: string): Promise<EmbeddingResponse> {
        const response = await this.client.embeddings.create({
            model: this.model,
            input: text,
            encoding_format: "float",
        });
        
        return { embedding: response.data[0].embedding, model: this.model };
    }

    getModel(): string {
        return this.model;
    }
} 