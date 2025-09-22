import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected';
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    disk: {
      available: boolean;
    };
  };
  metrics?: {
    activeConnections?: number;
    totalRequests?: number;
    errorRate?: number;
  };
}

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database connectivity
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      console.error('Database health check failed:', error);
    }
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = Math.round((usedMemory / totalMemory) * 100);
    
    // Check if we can write to disk (simple check)
    let diskAvailable = true;
    try {
      const fs = require('fs');
      const testFile = '/tmp/health-check-test';
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      diskAvailable = false;
    }
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus: HealthStatus = {
      status: databaseStatus === 'connected' && diskAvailable ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: databaseStatus,
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: memoryPercentage
        },
        disk: {
          available: diskAvailable
        }
      }
    };
    
    // Add response time to headers
    res.set('X-Response-Time', `${responseTime}ms`);
    
    // Return appropriate status code
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
    
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error during health check'
    });
  }
});

// Detailed health check for monitoring systems
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Database connectivity and performance
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
    let dbResponseTime = 0;
    let activeConnections = 0;
    
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
      databaseStatus = 'connected';
      
      // Get active connections (PostgreSQL specific)
      const connectionResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) FROM pg_stat_activity WHERE state = 'active'
      `;
      activeConnections = Number(connectionResult[0]?.count || 0);
    } catch (error) {
      console.error('Database detailed check failed:', error);
    }
    
    // System metrics
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Audit log health (check recent entries)
    let auditLogHealth = true;
    let recentAuditLogs = 0;
    try {
      const recentLogs = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
      recentAuditLogs = recentLogs;
    } catch (error) {
      auditLogHealth = false;
      console.error('Audit log health check failed:', error);
    }
    
    const responseTime = Date.now() - startTime;
    
    const detailedHealth = {
      status: databaseStatus === 'connected' && auditLogHealth ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: databaseStatus,
          responseTime: `${dbResponseTime}ms`,
          activeConnections
        },
        auditLog: {
          status: auditLogHealth ? 'healthy' : 'unhealthy',
          recentEntries: recentAuditLogs
        },
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      metrics: {
        activeConnections,
        processId: process.pid,
        nodeVersion: process.version,
        platform: process.platform
      }
    };
    
    const statusCode = detailedHealth.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(detailedHealth);
    
  } catch (error) {
    console.error('Detailed health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Internal server error during detailed health check'
    });
  }
});

// Readiness probe (for Kubernetes-style deployments)
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if the application is ready to serve traffic
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Database not accessible'
    });
  }
});

// Liveness probe (for Kubernetes-style deployments)
router.get('/live', (req: Request, res: Response) => {
  // Simple liveness check - if this endpoint responds, the process is alive
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

export default router;