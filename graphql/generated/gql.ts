/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n      query FetchIncidents($limit: Int!, $skip: Int!) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          epoch_date_modified\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            userId\n            first_name\n            last_name\n            roles\n          }\n          reports {\n            report_number\n          }\n          tsne {\n            x\n            y\n          }\n        }\n      }\n    ": typeof types.FetchIncidentsDocument,
    "\n      query FetchReports($limit: Int!, $skip: Int!) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {\n          report_number\n          title\n          text\n          plain_text\n          description\n          url\n          source_domain\n          image_url\n          cloudinary_id\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          epoch_date_downloaded\n          epoch_date_modified\n          epoch_date_published\n          epoch_date_submitted\n          authors\n          submitters\n          tags\n          inputs_outputs\n          flag\n          is_incident_report\n          editor_notes\n          quiet\n          user {\n            userId\n          }\n        }\n      }\n    ": typeof types.FetchReportsDocument,
    "\n      query FetchEntities($limit: Int!, $skip: Int!) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    ": typeof types.FetchEntitiesDocument,
    "\n      query FetchUsers($limit: Int!, $skip: Int!) {\n        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }) {\n          userId\n          first_name\n          last_name\n          roles\n        }\n      }\n    ": typeof types.FetchUsersDocument,
    "\n      query FetchClassifications($limit: Int!, $skip: Int!) {\n        classifications(pagination: { limit: $limit, skip: $skip }) {\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": typeof types.FetchClassificationsDocument,
};
const documents: Documents = {
    "\n      query FetchIncidents($limit: Int!, $skip: Int!) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          epoch_date_modified\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            userId\n            first_name\n            last_name\n            roles\n          }\n          reports {\n            report_number\n          }\n          tsne {\n            x\n            y\n          }\n        }\n      }\n    ": types.FetchIncidentsDocument,
    "\n      query FetchReports($limit: Int!, $skip: Int!) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {\n          report_number\n          title\n          text\n          plain_text\n          description\n          url\n          source_domain\n          image_url\n          cloudinary_id\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          epoch_date_downloaded\n          epoch_date_modified\n          epoch_date_published\n          epoch_date_submitted\n          authors\n          submitters\n          tags\n          inputs_outputs\n          flag\n          is_incident_report\n          editor_notes\n          quiet\n          user {\n            userId\n          }\n        }\n      }\n    ": types.FetchReportsDocument,
    "\n      query FetchEntities($limit: Int!, $skip: Int!) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    ": types.FetchEntitiesDocument,
    "\n      query FetchUsers($limit: Int!, $skip: Int!) {\n        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }) {\n          userId\n          first_name\n          last_name\n          roles\n        }\n      }\n    ": types.FetchUsersDocument,
    "\n      query FetchClassifications($limit: Int!, $skip: Int!) {\n        classifications(pagination: { limit: $limit, skip: $skip }) {\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": types.FetchClassificationsDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchIncidents($limit: Int!, $skip: Int!) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          epoch_date_modified\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            userId\n            first_name\n            last_name\n            roles\n          }\n          reports {\n            report_number\n          }\n          tsne {\n            x\n            y\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchIncidents($limit: Int!, $skip: Int!) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          epoch_date_modified\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            userId\n            first_name\n            last_name\n            roles\n          }\n          reports {\n            report_number\n          }\n          tsne {\n            x\n            y\n          }\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchReports($limit: Int!, $skip: Int!) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {\n          report_number\n          title\n          text\n          plain_text\n          description\n          url\n          source_domain\n          image_url\n          cloudinary_id\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          epoch_date_downloaded\n          epoch_date_modified\n          epoch_date_published\n          epoch_date_submitted\n          authors\n          submitters\n          tags\n          inputs_outputs\n          flag\n          is_incident_report\n          editor_notes\n          quiet\n          user {\n            userId\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchReports($limit: Int!, $skip: Int!) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {\n          report_number\n          title\n          text\n          plain_text\n          description\n          url\n          source_domain\n          image_url\n          cloudinary_id\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          epoch_date_downloaded\n          epoch_date_modified\n          epoch_date_published\n          epoch_date_submitted\n          authors\n          submitters\n          tags\n          inputs_outputs\n          flag\n          is_incident_report\n          editor_notes\n          quiet\n          user {\n            userId\n          }\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchEntities($limit: Int!, $skip: Int!) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    "): (typeof documents)["\n      query FetchEntities($limit: Int!, $skip: Int!) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchUsers($limit: Int!, $skip: Int!) {\n        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }) {\n          userId\n          first_name\n          last_name\n          roles\n        }\n      }\n    "): (typeof documents)["\n      query FetchUsers($limit: Int!, $skip: Int!) {\n        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }) {\n          userId\n          first_name\n          last_name\n          roles\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchClassifications($limit: Int!, $skip: Int!) {\n        classifications(pagination: { limit: $limit, skip: $skip }) {\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchClassifications($limit: Int!, $skip: Int!) {\n        classifications(pagination: { limit: $limit, skip: $skip }) {\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;