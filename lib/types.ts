import * as schema from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';

export type SearchResult = InferSelectModel<typeof schema.embeddings> & { score: unknown };
