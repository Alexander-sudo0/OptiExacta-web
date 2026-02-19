module.exports = {
  apps: [
    {
      name: 'optiexacta-backend',
      cwd: '/root/OptiExacta-web/backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3011
      },
      error_file: '/root/OptiExacta-web/backend/logs/pm2-error.log',
      out_file: '/root/OptiExacta-web/backend/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'optiexacta-frontend',
      cwd: '/root/OptiExacta-web',
      script: 'bun',
      args: 'run dev',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: '/root/OptiExacta-web/logs/pm2-error.log',
      out_file: '/root/OptiExacta-web/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
