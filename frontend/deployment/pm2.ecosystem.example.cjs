/**
 * Example PM2 config — one Next.js app on port 3000 (matches nginx-next.example.conf upstream).
 *
 * On the server:
 *   cd /var/www/anti-scam/frontend
 *   cp deployment/pm2.ecosystem.example.cjs ecosystem.config.cjs
 *   # edit cwd if your path differs
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "anti-scam-frontend",
      cwd: "/var/www/anti-scam/frontend",
      script: "npm",
      args: "start",
      interpreter: "none",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
