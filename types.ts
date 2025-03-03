export type EmbeddingResponse = {
  embedding: number[];
  model: string;
};

export interface EmbeddingProvider {
  getEmbedding(text: string): Promise<EmbeddingResponse>;
  getModel(): string;
}
