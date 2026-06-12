module.exports = {
  apps: [
    // ── NestJS API ──────────────────────────────────────
    // Runs compiled JS directly with node (no pnpm overhead at runtime)
    // ConfigModule reads apps/api/.env from cwd automatically
    {
      name: "fastresult-api",
      cwd: "/var/www/fastresult/apps/api",
      script: "dist/main.js",
      instances: 1,       // keep 1 — Socket.IO requires @socket.io/redis-adapter for cluster mode
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      // Logging
      out_file: "/var/log/fastresult/api-out.log",
      error_file: "/var/log/fastresult/api-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Stability
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      watch: false,
    },

    // ── Next.js frontend ────────────────────────────────
    // pnpm puts the next binary in the workspace's own .bin after pnpm install
    // Runtime env vars (PORT, NODE_ENV) are supplemental — NEXT_PUBLIC_* are baked at build time
    {
      name: "fastresult-web",
      cwd: "/var/www/fastresult/apps/web",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      out_file: "/var/log/fastresult/web-out.log",
      error_file: "/var/log/fastresult/web-err.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      // Stability
      max_memory_restart: "512M",
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      kill_timeout: 5000,
      watch: false,
    },
  ],
};
