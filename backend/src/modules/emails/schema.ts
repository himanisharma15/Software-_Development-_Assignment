import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  leads: z.array(z.string().email()).optional(),
  startTime: z.string().datetime(),
  delayBetweenMs: z.coerce.number().int().min(0).default(0),
  hourlyLimit: z.coerce.number().int().positive().optional(),
  file: z.any().optional()
});

export const parseLeadsSchema = z.object({
  file: z.any().optional()
});
