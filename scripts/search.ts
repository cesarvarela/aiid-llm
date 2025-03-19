import { hideBin } from 'yargs/helpers';
import yargs from 'yargs';
import { DataAccess } from '../lib/DataAccess';
import { createEmbeddingProvider } from '@/lib/utils';

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option('query', {
            alias: 'q',
            type: 'string',
            description: 'Search query',
            demandOption: true
        })
        .option('limit', {
            alias: 'l',
            type: 'number',
            description: 'Number of results',
            default: 5
        })
        .option('minScore', {
            alias: 's',
            type: 'number',
            description: 'Minimum similarity score (0-1)',
            default: 0.2
        })
        .option('provider', {
            alias: 'p',
            type: 'string',
            description: 'Embedding provider to use (openai or voyageai)',
            default: 'openai'
        }).argv;

    const search = new DataAccess(createEmbeddingProvider(argv.provider));

    const results = await search.vectorSearch(argv.query, argv.minScore, argv.limit);

    console.log(JSON.stringify(results, null, 2));
}

if (require.main === module) {
    main();
}