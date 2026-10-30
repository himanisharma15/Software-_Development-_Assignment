import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

export const elastic = new Client({
  node: env.ELASTICSEARCH_URL,
  auth: {
    apiKey: env.ELASTICSEARCH_API_KEY!
  }
});