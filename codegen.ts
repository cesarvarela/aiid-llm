import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: "https://pr-3447--staging-aiid.netlify.app/api/graphql",
  documents: ['./**/!(*.d).{ts,tsx,js}', '!**/node_modules/**'],
  pluckConfig: {
    globalIdentifier: 'gql',
  },
  generates: {
    "graphql/generated/": {
      preset: 'client',
      presetConfig: {
        gqlTagName: "gql",
      }
    }
  }
};

export default config;