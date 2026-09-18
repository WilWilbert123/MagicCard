// ========================================================
// EmployeeID KioskAgent PM2 Ecosystem Configuration
// Use with PM2: pm2 start ecosystem.config.js
// Provides invisible background execution and automatic restart on crash.
// ========================================================
module.exports = {
  apps: [
    {
      name: "KioskAgent",
      script: "./KioskAgent.exe",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 7125
      },
      error_file: "./logs/pm2_error.log",
      out_file: "./logs/pm2_out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z"
    }
  ]
};
