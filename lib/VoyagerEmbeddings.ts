import { EmbeddingProvider, EmbeddingResponse } from "../types";

export class VoyageEmbeddings implements EmbeddingProvider {
    private model = "voyage-2";
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    async getEmbedding(text: string): Promise<EmbeddingResponse> {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.model,
                input: text
            })
        });

        const data = await response.json();
        return { embedding: data.data[0].embedding, model: this.model };
    }

    getModel(): string {
        return this.model;
    }
}