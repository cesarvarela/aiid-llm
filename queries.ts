 const QUERIES: { [key: string]: string } = {
    incidents: `
      query FetchIncidents($limit: Int!, $skip: Int!) {
        incidents(pagination: { limit: $limit, skip: $skip }, sort: { incident_id: ASC }) {
          incident_id
          title
          description
          date
          editor_notes
          epoch_date_modified
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
    reports: `
      query FetchReports($limit: Int!, $skip: Int!) {
        reports(pagination: { limit: $limit, skip: $skip }, sort: { report_number: ASC }) {
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
          epoch_date_downloaded
          epoch_date_modified
          epoch_date_published
          epoch_date_submitted
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
    entities: `
      query FetchEntities($limit: Int!, $skip: Int!) {
        entities(pagination: { limit: $limit, skip: $skip }, sort: { entity_id: ASC }) {
          entity_id
          name
          created_at
          date_modified
        }
      }
    `,
    users: `
      query FetchUsers($limit: Int!, $skip: Int!) {
        users(pagination: { limit: $limit, skip: $skip }, sort: { userId: ASC }) {
          userId
          first_name
          last_name
          roles
        }
      }
    `,
    classifications: `
      query FetchClassifications($limit: Int!, $skip: Int!) {
        classifications(pagination: { limit: $limit, skip: $skip }) {
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
