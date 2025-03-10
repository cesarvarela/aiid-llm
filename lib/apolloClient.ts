import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { RetryLink } from '@apollo/client/link/retry';

// API URL for the GraphQL endpoint
export const API_URL = 'https://incidentdatabase.ai/api/graphql';

// Function to get Apollo client for GraphQL queries
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
    link: ApolloLink.from([retryLink, httpLink]),
    cache: new InMemoryCache({
      addTypename: false,
    }),
  });

  return client;
}; 