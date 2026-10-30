import type { ErrorRequestHandler } from 'express';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  logger.error({ err: error, url: req.originalUrl }, 'Unhandled error');
  res.status(500).json({ message: 'Internal Server Error' });
};
