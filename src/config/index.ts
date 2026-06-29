import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env['PORT'] || '3000', 10),
  nodeEnv: process.env['NODE_ENV'] || 'development',
  appName: process.env['APP_NAME'] || 'ReceptionBot',
  appVersion: process.env['APP_VERSION'] || '1.0.0',
  databaseUrl: process.env['DATABASE_URL'] || '',

  // Admin panel credentials
  adminUsername: process.env['ADMIN_USERNAME'] || 'admin',
  adminPassword: process.env['ADMIN_PASSWORD'] || '',
  adminSecret: process.env['ADMIN_SECRET'] || 'change-me-in-production',

  // WhatsApp Cloud API
  whatsappVerifyToken: process.env['WHATSAPP_VERIFY_TOKEN'] || '',
  whatsappAccessToken: process.env['WHATSAPP_ACCESS_TOKEN'] || '',
  whatsappPhoneNumberId: process.env['WHATSAPP_PHONE_NUMBER_ID'] || '',
};
