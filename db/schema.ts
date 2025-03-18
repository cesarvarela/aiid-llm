import { pgTable, text, integer, timestamp, uniqueIndex, vector, serial, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const sourceTypes = ["incident", "report", "classification"] as const;
export type SourceType = typeof sourceTypes[number];
export const sourceTypeEnum = pgEnum('source_type', sourceTypes);

export const embeddings = pgTable('embeddings', {
    id: serial('id').primaryKey(),
    sourceType: sourceTypeEnum('sourceType').notNull(),
    sourceId: text('sourceId').notNull(),
    chunkIndex: integer('chunkIndex').notNull(),
    chunkText: text('chunkText').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    model: text('model').notNull(),
    metadata: jsonb('metadata').notNull(), // Will store additional metadata as JSON
}, (table) => {
    return {
        sourceIdx: uniqueIndex('sourceIdx').on(table.sourceType, table.sourceId, table.chunkIndex)
    };
});

// Training set table with identical schema to embeddings
export const embeddingsSubset = pgTable('embeddings_subset', {
    id: serial('id').primaryKey(),
    sourceType: sourceTypeEnum('sourceType').notNull(),
    sourceId: text('sourceId').notNull(),
    chunkIndex: integer('chunkIndex').notNull(),
    chunkText: text('chunkText').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    model: text('model').notNull(),
    metadata: jsonb('metadata').notNull(), // Will store additional metadata as JSON
}, (table) => {
    return {
        sourceIdx: uniqueIndex('trainingSourceIdx').on(table.sourceType, table.sourceId, table.chunkIndex)
    };
});