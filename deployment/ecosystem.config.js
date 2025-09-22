// PM2 ecosystem configuration for Speaking Test Booking System
module.exports = {
  apps: [
    {
      name: 'speaking-test-api',
      script: './backend/dist/index.js',
      cwd: '/var/www/speaking-test-booking',
      instances: 2,
      exec_mode: 'cluster',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      
      // Logging
      log_file: '/var/log/speaking-test-booking/combined.log',
      out_file: '/var/log/speaking-test-booking/out.log',
      error_file: '/var/log/speaking-test-booking/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Auto-restart configuration
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Process management
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Advanced features
      merge_logs: true,
      autorestart: true,
      
      // Monitoring
      pmx: true,
      
      // Source map support
      source_map_support: true,
      
      // Instance variables
      instance_var: 'INSTANCE_ID',
      
      // Graceful shutdown
      shutdown_with_message: true,
      
      // Error handling
      ignore_watch: ['node_modules', 'logs', '*.log'],
      
      // Performance monitoring
      monitoring: {
        http: true,
        https: false,
        port: 9615,
      }
    }
  ],
  
  // Deployment configuration
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/speaking-test-booking.git',
      path: '/var/www/speaking-test-booking',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:backend && npm run build:frontend && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};