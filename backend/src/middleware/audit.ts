import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

interface AuditableRequest extends Request {
  auditData?: {
    entityType: string;
    entityId?: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE';
    oldValues?: any;
    newValues?: any;
  };
}

export const auditLog = (entityType: string) => {
  return async (req: AuditableRequest, res: Response, next: NextFunction) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to capture response data
    res.json = function(body: any) {
      // Only audit successful operations (2xx status codes)
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        // Determine action based on HTTP method
        let action: 'CREATE' | 'UPDATE' | 'DELETE';
        switch (req.method) {
          case 'POST':
            action = 'CREATE';
            break;
          case 'PUT':
          case 'PATCH':
            action = 'UPDATE';
            break;
          case 'DELETE':
            action = 'DELETE';
            break;
          default:
            // Don't audit GET requests
            return originalJson.call(this, body);
        }

        // Extract entity ID from response or request
        const entityId = body?.id || body?.data?.id || req.params.id;
        
        if (entityId) {
          // Create audit log entry (fire and forget)
          prisma.auditLog.create({
            data: {
              userId: req.user.userId,
              entityType,
              entityId,
              action,
              oldValues: req.auditData?.oldValues || null,
              newValues: action === 'DELETE' ? null : (body?.data || body),
              ipAddress: req.ip || req.connection.remoteAddress,
              userAgent: req.get('User-Agent'),
            },
          }).catch(error => {
            console.error('Failed to create audit log:', error);
          });
        }
      }
      
      return originalJson.call(this, body);
    };

    next();
  };
};

export const captureOldValues = (entityType: string) => {
  return async (req: AuditableRequest, res: Response, next: NextFunction) => {
    if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
      const entityId = req.params.id;
      
      if (entityId) {
        try {
          let oldValues;
          
          // Fetch old values based on entity type
          switch (entityType.toLowerCase()) {
            case 'user':
              oldValues = await prisma.user.findUnique({ where: { id: entityId } });
              break;
            case 'branch':
              oldValues = await prisma.branch.findUnique({ where: { id: entityId } });
              break;
            case 'slot':
              oldValues = await prisma.slot.findUnique({ where: { id: entityId } });
              break;
            case 'booking':
              oldValues = await prisma.booking.findUnique({ where: { id: entityId } });
              break;
            case 'assessment':
              oldValues = await prisma.assessment.findUnique({ where: { id: entityId } });
              break;
            case 'systemsetting':
              oldValues = await prisma.systemSetting.findUnique({ where: { id: entityId } });
              break;
            default:
              console.warn(`Unknown entity type for audit: ${entityType}`);
          }
          
          if (oldValues) {
            req.auditData = {
              entityType,
              entityId,
              action: req.method === 'DELETE' ? 'DELETE' : 'UPDATE',
              oldValues,
            };
          }
        } catch (error) {
          console.error('Failed to capture old values for audit:', error);
        }
      }
    }
    
    next();
  };
};

// Utility function to manually create audit logs
export const createAuditLog = async (
  userId: string,
  entityType: string,
  entityId: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  oldValues?: any,
  newValues?: any,
  ipAddress?: string,
  userAgent?: string
) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        entityType,
        entityId,
        action,
        oldValues,
        newValues,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error('Failed to create manual audit log:', error);
  }
};