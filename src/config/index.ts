import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  appName: process.env['APP_NAME'] || 'ReceptionBot',
  appVersion: process.env['APP_VERSION'] || '1.0.0',
  databaseUrl: process.env['DATABASE_URL'] || '',
};
