// Production monitoring configuration for Speaking Test Booking System
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ProductionMonitor {
  constructor(config = {}) {
    this.config = {
      healthCheckUrl: config.healthCheckUrl || 'http://localhost:3001/health',
      checkInterval: config.checkInterval || 30000, // 30 seconds
      logFile: config.logFile || '/var/log/speaking-test-booking/monitor.log',
      alertThresholds: {
        responseTime: config.responseTimeThreshold || 5000, // 5 seconds
        memoryUsage: config.memoryThreshold || 80, // 80%
        errorRate: config.errorRateThreshold || 5, // 5%
        consecutiveFailures: config.consecutiveFailuresThreshold || 3
      },
      ...config
    };
    
    this.consecutiveFailures = 0;
    this.lastHealthCheck = null;
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) {
      console.log('Monitor is already running');
      return;
    }

    console.log('🔍 Starting production monitor...');
    this.isRunning = true;
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    console.log(`✅ Monitor started - checking every ${this.config.checkInterval / 1000} seconds`);
  }

  stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping production monitor...');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('✅ Monitor stopped');
  }

  async performHealthCheck() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.config.healthCheckUrl}/detailed`, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx status codes
      });
      
      const responseTime = Date.now() - startTime;
      const healthData = response.data;
      
      // Reset consecutive failures on successful response
      if (response.status === 200) {
        this.consecutiveFailures = 0;
      } else {
        this.consecutiveFailures++;
      }
      
      const checkResult = {
        timestamp: new Date().toISOString(),
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        statusCode: response.status,
        consecutiveFailures: this.consecutiveFailures,
        healthData: response.status === 200 ? healthData : null,
        error: response.status !== 200 ? `HTTP ${response.status}` : null
      };
      
      this.lastHealthCheck = checkResult;
      this.logHealthCheck(checkResult);
      this.checkAlerts(checkResult);
      
    } catch (error) {
      this.consecutiveFailures++;
      
      const checkResult = {
        timestamp: new Date().toISOString(),
        status: 'error',
        responseTime: Date.now() - startTime,
        consecutiveFailures: this.consecutiveFailures,
        error: error.message || 'Unknown error'
      };
      
      this.lastHealthCheck = checkResult;
      this.logHealthCheck(checkResult);
      this.checkAlerts(checkResult);
    }
  }

  logHealthCheck(result) {
    const logEntry = {
      timestamp: result.timestamp,
      level: result.status === 'healthy' ? 'info' : 'error',
      type: 'health_check',
      status: result.status,
      responseTime: result.responseTime,
      consecutiveFailures: result.consecutiveFailures,
      ...(result.error && { error: result.error }),
      ...(result.healthData && {
        memoryUsage: result.healthData.services?.memory?.percentage,
        databaseStatus: result.healthData.services?.database?.status,
        activeConnections: result.healthData.services?.database?.activeConnections,
        uptime: result.healthData.uptime
      })
    };

    // Log to file
    this.writeLog(logEntry);
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${result.timestamp}] Health Check: ${result.status} (${result.responseTime}ms)`);
    }
  }

  checkAlerts(result) {
    const alerts = [];
    
    // Check consecutive failures
    if (result.consecutiveFailures >= this.config.alertThresholds.consecutiveFailures) {
      alerts.push({
        type: 'consecutive_failures',
        severity: 'critical',
        message: `Application has failed ${result.consecutiveFailures} consecutive health checks`,
        value: result.consecutiveFailures,
        threshold: this.config.alertThresholds.consecutiveFailures
      });
    }
    
    // Check response time
    if (result.responseTime > this.config.alertThresholds.responseTime) {
      alerts.push({
        type: 'slow_response',
        severity: 'warning',
        message: `Health check response time is ${result.responseTime}ms`,
        value: result.responseTime,
        threshold: this.config.alertThresholds.responseTime
      });
    }
    
    // Check memory usage
    if (result.healthData?.services?.memory?.percentage > this.config.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage is ${result.healthData.services.memory.percentage}%`,
        value: result.healthData.services.memory.percentage,
        threshold: this.config.alertThresholds.memoryUsage
      });
    }
    
    // Check database connectivity
    if (result.healthData?.services?.database?.status !== 'connected') {
      alerts.push({
        type: 'database_disconnected',
        severity: 'critical',
        message: 'Database is not connected',
        value: result.healthData?.services?.database?.status || 'unknown'
      });
    }
    
    // Process alerts
    alerts.forEach(alert => {
      this.handleAlert(alert);
    });
  }

  handleAlert(alert) {
    const alertLog = {
      timestamp: new Date().toISOString(),
      level: alert.severity === 'critical' ? 'error' : 'warn',
      type: 'alert',
      alertType: alert.type,
      severity: alert.severity,
      message: alert.message,
      value: alert.value,
      threshold: alert.threshold
    };
    
    this.writeLog(alertLog);
    
    // In production, you might want to send alerts to external services
    // like Slack, email, or monitoring platforms
    console.error(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    
    // Example: Send to external monitoring service
    // this.sendExternalAlert(alert);
  }

  writeLog(logEntry) {
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      
      // Ensure log directory exists
      const logDir = path.dirname(this.config.logFile);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      fs.appendFileSync(this.config.logFile, logLine);
    } catch (error) {
      console.error('Failed to write log:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastHealthCheck: this.lastHealthCheck,
      config: this.config
    };
  }

  // Method to send alerts to external services (implement as needed)
  async sendExternalAlert(alert) {
    // Example implementations:
    
    // Slack webhook
    // await this.sendSlackAlert(alert);
    
    // Email notification
    // await this.sendEmailAlert(alert);
    
    // External monitoring service
    // await this.sendToMonitoringService(alert);
  }
}

// Export for use in other modules
module.exports = ProductionMonitor;

// CLI usage
if (require.main === module) {
  const monitor = new ProductionMonitor({
    healthCheckUrl: process.env.HEALTH_CHECK_URL || 'http://localhost:3001/health',
    checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000,
    logFile: process.env.MONITOR_LOG_FILE || '/var/log/speaking-test-booking/monitor.log'
  });

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down monitor...');
    monitor.stop();
    process.exit(0);
  });

  // Start monitoring
  monitor.start();
}