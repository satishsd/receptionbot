/**
 * PM2 ecosystem configuration for CloudPanel deployment.
 *
 * CloudPanel Node.js setup:
 *   1. Create a Node.js site for receptionbot.cloud in CloudPanel.
 *   2. Set the Node.js version to 20.x (LTS).
 *   3. Set the startup file to: ecosystem.config.js
 *   4. Ensure the .env file is present in the project root.
 *
 * Manual start / restart:
 *   pm2 start ecosystem.config.js
 *   pm2 reload receptionbot
 *   pm2 logs receptionbot
 */

module.exports = {
  apps: [
    {
      name: 'receptionbot',
      script: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // Merge process.env (reads from .env via dotenv in src/config/index.ts)
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
    },
  ],
};
