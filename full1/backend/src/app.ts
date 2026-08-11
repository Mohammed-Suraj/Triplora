import path from 'node:path';
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimiter.middleware';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.clientOrigins,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(globalRateLimiter);

  // Serve destination images from the frontend public directory
  app.use(
    '/images',
    express.static(path.resolve(__dirname, '../../public/images'), {
      maxAge: '7d',
      immutable: true,
    }),
  );

  // Serve locally uploaded files (used when Cloudinary is not configured)
  app.use(
    '/uploads',
    express.static(path.resolve(__dirname, '../uploads'), {
      maxAge: '7d',
      immutable: true,
    }),
  );

  app.use(env.apiPrefix, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
