import fetch from 'node-fetch';
import * as schema from '../db/schema';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, close } from '../db';
import QUERIES from '../graphql/queries';
import { User, Entity, Report, Incident } from '../graphql/generated/graphql';
import { DocumentNode } from 'graphql';
import { ApolloClient, InMemoryCache, HttpLink, QueryOptions, OperationVariables, from } from '@apollo/client';
import { RetryLink } from '@apollo/client/link/retry';

const BATCH_SIZE = 100;
const API_URL = 'https://incidentdatabase.ai/api/graphql';

type CollectionConfig = {
  queryName: string;
  query: DocumentNode;
  sortField: string;
  processItem: (item: any) => Promise<void>;
};

export const getApolloClient = () => {
  const httpLink = new HttpLink({
    uri: API_URL,
    fetch: fetch as any,
  });

  const retryLink = new RetryLink({
    delay: {
      initial: 1000,
      max: 5000,
      jitter: true
    },
    attempts: {
      max: 3,
      retryIf: (error) => !!error
    }
  });

  const client = new ApolloClient({
    link: from([retryLink, httpLink]),
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });

  return client;
};

const client = getApolloClient();

const handleManyToManyRelation = async <T extends { entity_id?: string, userId?: string, report_number?: number }>({
  sourceId,
  sourceIdField,
  items,
  junctionTable,
  lookupTable,
  lookupField,
  itemLookupField,
}: {
  sourceId: number | string,
  sourceIdField: string,
  items: T[] | undefined,
  junctionTable: any,
  lookupTable: any,
  lookupField: string,
  itemLookupField: string,
}) => {
  if (!items?.length) return;

  await db.delete(junctionTable)
    .where(eq(junctionTable[sourceIdField], sourceId));

  const lookupValues = items.map(item => item[itemLookupField as keyof T]).filter(Boolean);

  const related = await db.select()
    .from(lookupTable)
    .where(inArray(lookupTable[lookupField], lookupValues));

  if (related.length) {
    await db.insert(junctionTable)
      .values(related.map(r => ({
        [sourceIdField]: sourceId,
        [lookupField]: r[lookupField],
      })))
      .onConflictDoNothing();
  }
};

const processUser = async (user: User) => {
  await db.insert(schema.users)
    .values({
      userId: user.userId,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: user.roles,
    } as typeof schema.users.$inferInsert)
    .onConflictDoNothing();
};

const processEntity = async (entity: Entity) => {
  await db.insert(schema.entities)
    .values({
      entityId: entity.entity_id,
      name: entity.name,
      createdAt: entity.created_at ? new Date(entity.created_at) : new Date(),
      dateModified: entity.date_modified ? new Date(entity.date_modified) : null,
    } as typeof schema.entities.$inferInsert)
    .onConflictDoNothing();
};

const processReport = async (report: Report) => {
  await db.insert(schema.reports)
    .values({
      reportNumber: report.report_number,
      title: report.title,
      text: report.text,
      plainText: report.plain_text,
      url: report.url,
      sourceDomain: report.source_domain,
      imageUrl: report.image_url,
      cloudinaryId: report.cloudinary_id,
      language: report.language,
      dateDownloaded: new Date(report.date_downloaded),
      dateModified: new Date(report.date_modified),
      datePublished: new Date(report.date_published),
      dateSubmitted: new Date(report.date_submitted),
      epochDateDownloaded: report.epoch_date_downloaded,
      epochDateModified: report.epoch_date_modified,
      epochDatePublished: report.epoch_date_published,
      epochDateSubmitted: report.epoch_date_submitted,
      authors: report.authors,
      submitters: report.submitters,
      tags: report.tags,
      inputsOutputs: report.inputs_outputs || [],
      flag: report.flag,
      isIncidentReport: report.is_incident_report,
      editorNotes: report.editor_notes,
      quiet: report.quiet,
    } as typeof schema.reports.$inferInsert)
    .onConflictDoNothing();
};

const processIncident = async (incident: Incident) => {
  const [insertedIncident] = await db.insert(schema.incidents)
    .values({
      incidentId: incident.incident_id,
      title: incident.title,
      date: new Date(incident.date),
      description: incident.description,
      editorNotes: incident.editor_notes,
      epochDateModified: incident.epoch_date_modified,
      editorSimilarIncidents: incident.editor_similar_incidents || [],
      editorDissimilarIncidents: incident.editor_dissimilar_incidents || [],
      tsneX: incident.tsne?.x,
      tsneY: incident.tsne?.y,
    } as typeof schema.incidents.$inferInsert)
    .onConflictDoNothing()
    .returning();

  await handleManyToManyRelation({
    sourceId: insertedIncident.incidentId,
    sourceIdField: 'incidentId',
    items: incident.editors,
    junctionTable: schema.incidentEditors,
    lookupTable: schema.users,
    lookupField: 'userId',
    itemLookupField: 'userId'
  });

  await handleManyToManyRelation({
    sourceId: insertedIncident.incidentId,
    sourceIdField: 'incidentId',
    items: incident.AllegedDeployerOfAISystem,
    junctionTable: schema.incidentDeployers,
    lookupTable: schema.entities,
    lookupField: 'entityId',
    itemLookupField: 'entity_id'
  });

  await handleManyToManyRelation({
    sourceId: insertedIncident.incidentId,
    sourceIdField: 'incidentId',
    items: incident.AllegedDeveloperOfAISystem,
    junctionTable: schema.incidentDevelopers,
    lookupTable: schema.entities,
    lookupField: 'entityId',
    itemLookupField: 'entity_id'
  });

  await handleManyToManyRelation({
    sourceId: insertedIncident.incidentId,
    sourceIdField: 'incidentId',
    items: incident.AllegedHarmedOrNearlyHarmedParties,
    junctionTable: schema.incidentHarmedParties,
    lookupTable: schema.entities,
    lookupField: 'entityId',
    itemLookupField: 'entity_id'
  });

  await handleManyToManyRelation({
    sourceId: insertedIncident.incidentId,
    sourceIdField: 'incidentId',
    items: incident.reports,
    junctionTable: schema.incidentReports,
    lookupTable: schema.reports,
    lookupField: 'reportNumber',
    itemLookupField: 'report_number'
  });
};

const COLLECTIONS: CollectionConfig[] = [
  {
    queryName: 'users',
    query: QUERIES.users,
    sortField: 'userId',
    processItem: processUser,
  },
  {
    queryName: 'entities',
    query: QUERIES.entities,
    sortField: 'entity_id',
    processItem: processEntity,
  },
  {
    queryName: 'reports',
    query: QUERIES.reports,
    sortField: 'report_number',
    processItem: processReport,
  },
  {
    queryName: 'incidents',
    query: QUERIES.incidents,
    sortField: 'incident_id',
    processItem: processIncident,
  },
]

async function fetchAndProcessCollection<T>(config: CollectionConfig): Promise<void> {
  let hasMore = true;
  let skip = 0;

  while (hasMore) {
    const response = await client.query({
      query: config.query,
      variables: {
        limit: BATCH_SIZE,
        skip,
      },
      fetchPolicy: 'no-cache'
    });

    const items = response.data[config.queryName];
    if (items.length === 0) {
      hasMore = false;
      continue;
    }

    await Promise.all(
      items.map(async (item) => {
        if (item) {
          await config.processItem(item);
        }
      })
    );

    skip += BATCH_SIZE;
    console.log(`Processed ${skip} ${config.queryName}`);
  }
}

async function truncate() {

  await db.execute(sql`TRUNCATE TABLE ${schema.incidents} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.reports} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.entities} CASCADE`);
  await db.execute(sql`TRUNCATE TABLE ${schema.users} CASCADE`);
}

async function main() {
  try {
    console.log('Downloading data from the AIID API...');

    await truncate();

    for (const collection of COLLECTIONS) {
      console.log(`Downloading ${collection.queryName}...`);
      await fetchAndProcessCollection(collection);
    }

    console.log('Completed successfully');
  }
  finally {
    await close();
  }
}

if (require.main === module) {
  main()
}
