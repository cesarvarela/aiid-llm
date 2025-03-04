import { pgTable, text, integer, timestamp, boolean, uniqueIndex, real, vector, serial, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const entities = pgTable('entities', {
    entityId: text('entityId').primaryKey(),
    name: text('name').notNull(),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    dateModified: timestamp('dateModified'),
}, (table) => ({
    entityIdIdx: uniqueIndex('entityIdIdx').on(table.entityId),
}));

export const users = pgTable('users', {
    userId: text('userId').primaryKey(),
    firstName: text('firstName'),
    lastName: text('lastName'),
    roles: text('roles').array(),
}, (table) => ({
    userIdIdx: uniqueIndex('userIdIdx').on(table.userId),
}));

export const reports = pgTable('reports', {
    reportNumber: integer('reportNumber').primaryKey(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    plainText: text('plainText').notNull(),
    description: text('description'),
    url: text('url').notNull(),
    sourceDomain: text('sourceDomain').notNull(),
    imageUrl: text('imageUrl').notNull(),
    cloudinaryId: text('cloudinaryId').notNull(),
    language: text('language').notNull(),

    dateDownloaded: timestamp('dateDownloaded').notNull(),
    dateModified: timestamp('dateModified').notNull(),
    datePublished: timestamp('datePublished').notNull(),
    dateSubmitted: timestamp('dateSubmitted').notNull(),

    authors: text('authors').array(),
    submitters: text('submitters').array(),
    tags: text('tags').array(),
    inputsOutputs: text('inputsOutputs').array(),

    flag: boolean('flag'),
    isIncidentReport: boolean('isIncidentReport'),
    editorNotes: text('editorNotes'),
    quiet: boolean('quiet'),

    userId: text('userId').references(() => users.userId),
}, (table) => ({
    reportNumberIdx: uniqueIndex('reportNumberIdx').on(table.reportNumber),
}));

export const incidents = pgTable('incidents', {
    incidentId: integer('incidentId').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    date: timestamp('date').notNull(),
    editorNotes: text('editorNotes'),
    editorSimilarIncidents: integer('editorSimilarIncidents').array(),
    editorDissimilarIncidents: integer('editorDissimilarIncidents').array(),
    tsneX: real('tsneX'),
    tsneY: real('tsneY'),
}, (table) => ({
    incidentIdIdx: uniqueIndex('incidentIdIdx').on(table.incidentId),
}));

// many to many
export const incidentEditors = pgTable('incidentEditors', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    userId: text('userId').references(() => users.userId),
}, (table) => ({
    pk: uniqueIndex('incidentEditorsPkey').on(table.incidentId, table.userId),
}));

export const incidentReports = pgTable('incidentReports', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    reportNumber: integer('reportNumber').references(() => reports.reportNumber),
}, (table) => ({
    pk: uniqueIndex('incidentReportsPkey').on(table.incidentId, table.reportNumber),
}));

export const incidentDeployers = pgTable('incidentDeployers', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    entityId: text('entityId').references(() => entities.entityId),
}, (table) => ({
    pk: uniqueIndex('incidentDeployersPkey').on(table.incidentId, table.entityId),
}));

export const incidentDevelopers = pgTable('incidentDevelopers', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    entityId: text('entityId').references(() => entities.entityId),
}, (table) => ({
    pk: uniqueIndex('incidentDevelopersPkey').on(table.incidentId, table.entityId),
}));

export const incidentHarmedParties = pgTable('incidentHarmedParties', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    entityId: text('entityId').references(() => entities.entityId),
}, (table) => ({
    pk: uniqueIndex('incidentHarmedPartiesPkey').on(table.incidentId, table.entityId),
}));

export const implicatedSystems = pgTable('implicatedSystems', {
    incidentId: integer('incidentId').references(() => incidents.incidentId),
    entityId: text('entityId').references(() => entities.entityId),
}, (table) => ({
    pk: uniqueIndex('implicatedSystemsPkey').on(table.incidentId, table.entityId),
}));

// relations

export const entityRelations = relations(entities, ({ many, one }) => ({
    deployedIncidents: many(incidentDeployers),
    developedIncidents: many(incidentDevelopers),
    harmedInIncidents: many(incidentHarmedParties),
    implicatedInIncidents: many(implicatedSystems),
}));

export const userRelations = relations(users, ({ many }) => ({
    reports: many(reports),
    incidents: many(incidentEditors),
}));

export const reportRelations = relations(reports, ({ one, many }) => ({
    user: one(users, {
        fields: [reports.userId],
        references: [users.userId],
    }),
    incidents: many(incidentReports),
}));

export const incidentRelations = relations(incidents, ({ many }) => ({
    editors: many(incidentEditors),
    reports: many(incidentReports),
    deployers: many(incidentDeployers),
    developers: many(incidentDevelopers),
    harmedParties: many(incidentHarmedParties),
    implicatedSystems: many(implicatedSystems),
}));


export const sourceTypes = ["incident", "report"] as const;
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
