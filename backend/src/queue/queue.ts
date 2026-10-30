import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env.js';

const RedisCtor = IORedis as any;

export const queueConnection = new RedisCtor(env.REDIS_URL, {
  maxRetriesPerRequest: null
});

export const emailQueue = new Queue('email-queue', {
  connection: queueConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: false,
    removeOnFail: false
  }
});

export async function closeQueue() {
  await emailQueue.close();
  await queueConnection.quit();
}
