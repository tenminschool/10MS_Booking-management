import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase';

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
          supabase
            .from('audit_log')
            .insert({
              user_id: req.user.userId,
              entity_type: entityType,
              entity_id: entityId,
              action,
              old_values: req.auditData?.oldValues || null,
              new_values: action === 'DELETE' ? null : (body?.data || body),
              ip_address: req.ip || req.connection.remoteAddress,
              user_agent: req.get('User-Agent'),
            })
            .then(({ error }) => {
              if (error) {
                console.error('Failed to create audit log:', error);
              }
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
          let result;
          
          // Fetch old values based on entity type
          switch (entityType.toLowerCase()) {
            case 'user':
              result = await supabase.from('users').select('*').eq('id', entityId).single();
              oldValues = result.data;
              break;
            case 'branch':
              result = await supabase.from('branches').select('*').eq('id', entityId).single();
              oldValues = result.data;
              break;
            case 'slot':
              result = await supabase.from('slots').select('*').eq('id', entityId).single();
              oldValues = result.data;
              break;
            case 'booking':
              result = await supabase.from('bookings').select('*').eq('id', entityId).single();
              oldValues = result.data;
              break;
            case 'assessment':
              result = await supabase.from('assessments').select('*').eq('id', entityId).single();
              oldValues = result.data;
              break;
            case 'systemsetting':
              result = await supabase.from('system_settings').select('*').eq('id', entityId).single();
              oldValues = result.data;
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
    const { error } = await supabase.from('audit_log').insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues,
      new_values: newValues,
      ip_address: ipAddress,
      user_agent: userAgent,
    });
    
    if (error) {
      console.error('Failed to create manual audit log:', error);
    }
  } catch (error) {
    console.error('Failed to create manual audit log:', error);
  }
};