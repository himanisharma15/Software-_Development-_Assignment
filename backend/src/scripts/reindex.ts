import { reindexEmails } from '../modules/search/elasticsearch.js';

async function main() {
  await reindexEmails();
  console.log('Elastic reindex completed.');
}

main().catch((error) => {
  console.error('Reindex failed:', error);
  process.exit(1);
});
