#!/usr/bin/env npx tsx
import 'dotenv/config';
import { db, close } from '../db';
import { embeddings, embeddingsSubset } from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { getApolloClient } from '../lib/apolloClient';
import { gql } from '@apollo/client';
import { sql } from 'drizzle-orm';

// Define GraphQL queries directly
const FETCH_INCIDENTS = gql`
  query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {
    incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {
      incident_id
      title
      description
      date
      reports {
        report_number
      }
    }
  }
`;

const FETCH_INCIDENT_REPORTS = gql`
  query FetchIncidentReports($incident_id: Int!) {
    incident(filter: { incident_id: { EQ: $incident_id } }) {
      incident_id
      reports {
        report_number
      }
    }
  }
`;

const FETCH_INCIDENT_CLASSIFICATIONS = gql`
  query FetchIncidentClassifications($incident_id: Int!) {
    classifications(filter: { incidents: { IN: [$incident_id] } }) {
      _id
      namespace
      notes
    }
  }
`;

async function fetchFirst400Incidents() {
  const client = getApolloClient();
  
  const { data } = await client.query({
    query: FETCH_INCIDENTS,
    variables: {
      limit: 400,
      skip: 0,
      filter: {}
    }
  });
  
  return data.incidents.map((incident: { incident_id: string }) => incident.incident_id);
}

async function main() {
  try {
    console.log('Starting to push embeddings subset...');
    
    // First, clear existing data in the subset table
    console.log('Clearing existing data in embeddings_subset table...');
    await db.delete(embeddingsSubset);
    
    // Fetch first 400 incidents from GraphQL API
    console.log('Fetching incidents from GraphQL API...');
    const incidentIdsList = await fetchFirst400Incidents();
    console.log(`Found ${incidentIdsList.length} incidents from GraphQL API`);
    
    // Process in smaller batches to avoid PostgreSQL array size limitations
    const batchSize = 20;
    let totalEmbeddingsFound = 0;
    
    // Process the incident IDs in smaller batches
    for (let i = 0; i < incidentIdsList.length; i += batchSize) {
      const batchIncidentIds = incidentIdsList.slice(i, i + batchSize);
      console.log(`Processing incident batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(incidentIdsList.length / batchSize)}`);
      
      // Find all embeddings for the current batch of incidents
      const incidentEmbeddings = await db
        .select()
        .from(embeddings)
        .where(
          and(
            eq(embeddings.sourceType, 'incident'),
            inArray(embeddings.sourceId, batchIncidentIds.map(id => id.toString()))
          )
        );
      
      // Process one incident ID at a time for reports
      let reportEmbeddings = [];
      for (const incidentId of batchIncidentIds) {
        // First get the report numbers for this incident
        const client = getApolloClient();
        const { data } = await client.query({
          query: FETCH_INCIDENT_REPORTS,
          variables: {
            incident_id: parseInt(incidentId, 10)
          }
        });

        if (data.incident?.reports) {
          // Extract report numbers from the incident
          const reportNumbers = data.incident.reports.map((r: any) => r.report_number);
          
          if (reportNumbers.length > 0) {
            // Find embeddings for these reports
            const result = await db
              .select()
              .from(embeddings)
              .where(
                and(
                  eq(embeddings.sourceType, 'report'),
                  inArray(embeddings.sourceId, reportNumbers.map(num => num.toString()))
                )
              );
            reportEmbeddings.push(...result);
          }
        }
      }
      
      // Process one incident ID at a time for classifications
      let classificationEmbeddings = [];
      for (const incidentId of batchIncidentIds) {
        // Query classifications related to this incident
        const client = getApolloClient();
        const { data } = await client.query({
          query: FETCH_INCIDENT_CLASSIFICATIONS,
          variables: {
            incident_id: parseInt(incidentId, 10)
          }
        });
        
        if (data.classifications && data.classifications.length > 0) {
          // Get classification IDs from the response
          const classificationIds = data.classifications.map((c: any) => c._id);
          
          // Find embeddings for these classification IDs
          if (classificationIds.length > 0) {
            const result = await db
              .select()
              .from(embeddings)
              .where(
                and(
                  eq(embeddings.sourceType, 'classification'),
                  inArray(embeddings.sourceId, classificationIds)
                )
              );
            classificationEmbeddings.push(...result);
          }
        }
      }
      
      // Combine all embeddings
      const embeddingsToTransfer = [
        ...incidentEmbeddings,
        ...reportEmbeddings,
        ...classificationEmbeddings
      ];
      
      console.log(`Found ${embeddingsToTransfer.length} embeddings for batch ${Math.floor(i / batchSize) + 1} (${incidentEmbeddings.length} incidents, ${reportEmbeddings.length} reports, ${classificationEmbeddings.length} classifications)`);
      totalEmbeddingsFound += embeddingsToTransfer.length;
      
      if (embeddingsToTransfer.length > 0) {
        // Insert embeddings in smaller chunks
        const insertBatchSize = 100;
        for (let j = 0; j < embeddingsToTransfer.length; j += insertBatchSize) {
          const insertBatch = embeddingsToTransfer.slice(j, j + insertBatchSize);
          
          // Transform the data for insertion
          const dataToInsert = insertBatch.map(embedding => ({
            sourceType: embedding.sourceType,
            sourceId: embedding.sourceId,
            chunkIndex: embedding.chunkIndex,
            chunkText: embedding.chunkText,
            embedding: embedding.embedding,
            model: embedding.model,
            metadata: embedding.metadata,
          }));
          
          try {
            // Using onConflict to handle duplicates gracefully
            await db.insert(embeddingsSubset)
              .values(dataToInsert)
              .onConflictDoNothing();
            console.log(`Inserted ${dataToInsert.length} embeddings (batch ${Math.floor(i / batchSize) + 1}, chunk ${Math.floor(j / insertBatchSize) + 1}/${Math.ceil(embeddingsToTransfer.length / insertBatchSize)})`);
          } catch (error) {
            console.error(`Error inserting embeddings: ${error.message}`);
            // Continue with the next batch despite errors
          }
        }
      }
    }
    
    // Count the number of records in the subset table
    const [{ count }] = await db
      .select({ count: sql`count(*)` })
      .from(embeddingsSubset);
    
    console.log(`Successfully transferred ${count} embeddings to embeddings_subset table`);
    console.log(`Total embeddings found: ${totalEmbeddingsFound}`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await close();
  }
}

main(); 