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
    "\n      query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            first_name\n            last_name\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": typeof types.FetchIncidentsDocument,
    "\n      query FetchReports($limit: Int!, $skip: Int!, $filter: ReportFilterType) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {\n          report_number\n          title\n          text\n          description\n          url\n          source_domain\n          image_url\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          authors\n          submitters\n          tags\n          flag\n          is_incident_report\n          editor_notes\n          user {\n            first_name\n            last_name\n          }\n        }\n      }\n    ": typeof types.FetchReportsDocument,
    "\n      query FetchEntities($limit: Int!, $skip: Int!, $filter: EntityFilterType) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }, filter: $filter) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    ": typeof types.FetchEntitiesDocument,
    "\n      query FetchClassifications($limit: Int!, $skip: Int!, $filter: ClassificationFilterType) {\n        classifications(pagination: { limit: $limit, skip: $skip }, filter: $filter) {\n          _id\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": typeof types.FetchClassificationsDocument,
};
const documents: Documents = {
    "\n      query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            first_name\n            last_name\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": types.FetchIncidentsDocument,
    "\n      query FetchReports($limit: Int!, $skip: Int!, $filter: ReportFilterType) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {\n          report_number\n          title\n          text\n          description\n          url\n          source_domain\n          image_url\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          authors\n          submitters\n          tags\n          flag\n          is_incident_report\n          editor_notes\n          user {\n            first_name\n            last_name\n          }\n        }\n      }\n    ": types.FetchReportsDocument,
    "\n      query FetchEntities($limit: Int!, $skip: Int!, $filter: EntityFilterType) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }, filter: $filter) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    ": types.FetchEntitiesDocument,
    "\n      query FetchClassifications($limit: Int!, $skip: Int!, $filter: ClassificationFilterType) {\n        classifications(pagination: { limit: $limit, skip: $skip }, filter: $filter) {\n          _id\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    ": types.FetchClassificationsDocument,
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
export function gql(source: "\n      query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            first_name\n            last_name\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {\n        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {\n          incident_id\n          title\n          description\n          date\n          editor_notes\n          editor_similar_incidents\n          editor_dissimilar_incidents\n          AllegedDeployerOfAISystem {\n            entity_id\n            name\n          }\n          AllegedDeveloperOfAISystem {\n            entity_id\n            name\n          }\n          AllegedHarmedOrNearlyHarmedParties {\n            entity_id\n            name\n          }\n          editors {\n            first_name\n            last_name\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchReports($limit: Int!, $skip: Int!, $filter: ReportFilterType) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {\n          report_number\n          title\n          text\n          description\n          url\n          source_domain\n          image_url\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          authors\n          submitters\n          tags\n          flag\n          is_incident_report\n          editor_notes\n          user {\n            first_name\n            last_name\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchReports($limit: Int!, $skip: Int!, $filter: ReportFilterType) {\n        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {\n          report_number\n          title\n          text\n          description\n          url\n          source_domain\n          image_url\n          language\n          date_downloaded\n          date_modified\n          date_published\n          date_submitted\n          authors\n          submitters\n          tags\n          flag\n          is_incident_report\n          editor_notes\n          user {\n            first_name\n            last_name\n          }\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchEntities($limit: Int!, $skip: Int!, $filter: EntityFilterType) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }, filter: $filter) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    "): (typeof documents)["\n      query FetchEntities($limit: Int!, $skip: Int!, $filter: EntityFilterType) {\n        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }, filter: $filter) {\n          entity_id\n          name\n          created_at\n          date_modified\n        }\n      }\n    "];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n      query FetchClassifications($limit: Int!, $skip: Int!, $filter: ClassificationFilterType) {\n        classifications(pagination: { limit: $limit, skip: $skip }, filter: $filter) {\n          _id\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "): (typeof documents)["\n      query FetchClassifications($limit: Int!, $skip: Int!, $filter: ClassificationFilterType) {\n        classifications(pagination: { limit: $limit, skip: $skip }, filter: $filter) {\n          _id\n          namespace\n          notes\n          publish\n          attributes {\n            short_name\n            value_json\n          }\n          incidents {\n            incident_id\n          }\n          reports {\n            report_number\n          }\n        }\n      }\n    "];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;