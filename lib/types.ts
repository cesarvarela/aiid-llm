import * as schema from '@/db/schema';
import { InferSelectModel } from 'drizzle-orm';
import { Taxa } from '@/graphql/generated/graphql';

/**
 * Type for search results from vector search
 * Extends the embeddings table with a score property
 */
export type SearchResult = InferSelectModel<typeof schema.embeddings> & { score: unknown };

/**
 * Type for classifications from the database
 */
export type Classification = InferSelectModel<typeof schema.classifications>;

/**
 * Type for incidents with their classifications
 * Extends the incidents table with an optional classifications array
 */
export type IncidentWithClassifications = InferSelectModel<typeof schema.incidents> & {
  classifications?: Classification[];
};

/**
 * Type for taxonomy map
 */
export interface TaxonomyMap {
  [key: string]: Taxa;
}
