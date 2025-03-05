import { gql } from 'graphql-tag';

const QUERIES = {
    incidents: gql`
      query FetchIncidents($limit: Int!, $skip: Int!, $filter: IncidentFilterType) {
        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }, filter: $filter) {
          incident_id
          title
          description
          date
          editor_notes
          editor_similar_incidents
          editor_dissimilar_incidents
          AllegedDeployerOfAISystem {
            entity_id
            name
          }
          AllegedDeveloperOfAISystem {
            entity_id
            name
          }
          AllegedHarmedOrNearlyHarmedParties {
            entity_id
            name
          }
          editors {
            userId
            first_name
            last_name
            roles
          }
          reports {
            report_number
          }
          tsne {
            x
            y
          }
        }
      }
    `,
    reports: gql`
      query FetchReports($limit: Int!, $skip: Int!, $filter: ReportFilterType) {
        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }, filter: $filter) {
          report_number
          title
          text
          plain_text
          description
          url
          source_domain
          image_url
          cloudinary_id
          language
          date_downloaded
          date_modified
          date_published
          date_submitted
          authors
          submitters
          tags
          inputs_outputs
          flag
          is_incident_report
          editor_notes
          quiet
          user {
            userId
          }
        }
      }
    `,
    entities: gql`
      query FetchEntities($limit: Int!, $skip: Int!, $filter: EntityFilterType) {
        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }, filter: $filter) {
          entity_id
          name
          created_at
          date_modified
        }
      }
    `,
    users: gql`
      query FetchUsers($limit: Int!, $skip: Int!, $filter: UserFilterType) {
        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }, filter: $filter) {
          userId
          first_name
          last_name
          roles
        }
      }
    `,
    classifications: gql`
      query FetchClassifications($limit: Int!, $skip: Int!, $filter: ClassificationFilterType) {
        classifications(pagination: { limit: $limit, skip: $skip }, filter: $filter) {
          _id
          namespace
          notes
          publish
          attributes {
            short_name
            value_json
          }
          incidents {
            incident_id
          }
          reports {
            report_number
          }
        }
      }
    `,
};

export default QUERIES;
