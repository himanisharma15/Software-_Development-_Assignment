import Redis from 'ioredis';
import { env } from './env.js';

const RedisCtor = Redis as any;

export const redis = new RedisCtor(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true
});

redis.on('error', (error: unknown) => {
  console.error('Redis error:', error);
});
