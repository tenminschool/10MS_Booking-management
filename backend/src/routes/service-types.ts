import express from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { supabase } from '../lib/supabase';
import { UserRole, ServiceCategory, ServiceType, CreateServiceTypeRequest, UpdateServiceTypeRequest } from '../types/database';
import { z } from 'zod';

const router = express.Router();

// Validation schemas
const createServiceTypeSchema = z.object({
  name: z.string().min(2, 'Service name must be at least 2 characters').max(100, 'Service name must be less than 100 characters'),
  code: z.string().min(3, 'Service code must be at least 3 characters').max(50, 'Service code must be less than 50 characters').regex(/^[A-Z_]+$/, 'Service code must contain only uppercase letters and underscores'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  category: z.enum(['paid', 'free']),
  defaultCapacity: z.number().int().min(1, 'Default capacity must be at least 1').max(50, 'Default capacity cannot exceed 50'),
  durationMinutes: z.number().int().min(5, 'Duration must be at least 5 minutes').max(480, 'Duration cannot exceed 8 hours')
});

const updateServiceTypeSchema = createServiceTypeSchema.partial().extend({
  isActive: z.boolean().optional()
});

// GET /api/service-types - Get all service types
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, isActive } = req.query;

    let query = supabase
      .from('service_types')
      .select('*')
      .order('name', { ascending: true });

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: serviceTypes, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch service types: ${error.message}`);
    }

    res.json(serviceTypes || []);
  } catch (error: any) {
    console.error('Error fetching service types:', error);
    res.status(500).json({
      error: 'Failed to fetch service types',
      message: error.message
    });
  }
});

// GET /api/service-types/paid - Get paid service types
router.get('/paid', authenticate, async (req, res) => {
  try {
    const { data: serviceTypes, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('category', 'paid')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch paid service types: ${error.message}`);
    }

    res.json(serviceTypes || []);
  } catch (error: any) {
    console.error('Error fetching paid service types:', error);
    res.status(500).json({
      error: 'Failed to fetch paid service types',
      message: error.message
    });
  }
});

// GET /api/service-types/free - Get free service types
router.get('/free', authenticate, async (req, res) => {
  try {
    const { data: serviceTypes, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('category', 'free')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch free service types: ${error.message}`);
    }

    res.json(serviceTypes || []);
  } catch (error: any) {
    console.error('Error fetching free service types:', error);
    res.status(500).json({
      error: 'Failed to fetch free service types',
      message: error.message
    });
  }
});

// GET /api/service-types/:id - Get service type by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: serviceType, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Service type not found',
          message: `Service type with ID ${id} does not exist`
        });
      }
      throw new Error(`Failed to fetch service type: ${error.message}`);
    }

    res.json(serviceType);
  } catch (error: any) {
    console.error('Error fetching service type:', error);
    res.status(500).json({
      error: 'Failed to fetch service type',
      message: error.message
    });
  }
});

// POST /api/service-types - Create new service type (Admin only)
router.post('/',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  validateBody(createServiceTypeSchema),
  async (req, res) => {
    try {
      const serviceTypeData: CreateServiceTypeRequest = req.body;

      // Check if service code already exists
      const { data: existingService, error: checkError } = await supabase
        .from('service_types')
        .select('id')
        .eq('code', serviceTypeData.code)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check service code: ${checkError.message}`);
      }

      if (existingService) {
        return res.status(400).json({
          error: 'Service code already exists',
          message: `Service type with code '${serviceTypeData.code}' already exists`
        });
      }

      // Create service type
      const { data: serviceType, error } = await supabase
        .from('service_types')
        .insert([{
          name: serviceTypeData.name,
          code: serviceTypeData.code,
          description: serviceTypeData.description,
          category: serviceTypeData.category,
          default_capacity: serviceTypeData.defaultCapacity,
          duration_minutes: serviceTypeData.durationMinutes
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create service type: ${error.message}`);
      }

      res.status(201).json(serviceType);
    } catch (error: any) {
      console.error('Error creating service type:', error);
      res.status(500).json({
        error: 'Failed to create service type',
        message: error.message
      });
    }
  }
);

// PUT /api/service-types/:id - Update service type (Admin only)
router.put('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  validateBody(updateServiceTypeSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData: UpdateServiceTypeRequest = req.body;

      // Check if service type exists
      const { data: existingService, error: checkError } = await supabase
        .from('service_types')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Service type not found',
            message: `Service type with ID ${id} does not exist`
          });
        }
        throw new Error(`Failed to check service type: ${checkError.message}`);
      }

      // If updating code, check if new code already exists
      if (updateData.code) {
        const { data: codeExists, error: codeCheckError } = await supabase
          .from('service_types')
          .select('id')
          .eq('code', updateData.code)
          .neq('id', id)
          .single();

        if (codeCheckError && codeCheckError.code !== 'PGRST116') {
          throw new Error(`Failed to check service code: ${codeCheckError.message}`);
        }

        if (codeExists) {
          return res.status(400).json({
            error: 'Service code already exists',
            message: `Service type with code '${updateData.code}' already exists`
          });
        }
      }

      // Prepare update data
      const updateFields: any = {};
      if (updateData.name !== undefined) updateFields.name = updateData.name;
      if (updateData.code !== undefined) updateFields.code = updateData.code;
      if (updateData.description !== undefined) updateFields.description = updateData.description;
      if (updateData.category !== undefined) updateFields.category = updateData.category;
      if (updateData.defaultCapacity !== undefined) updateFields.default_capacity = updateData.defaultCapacity;
      if (updateData.durationMinutes !== undefined) updateFields.duration_minutes = updateData.durationMinutes;
      if (updateData.isActive !== undefined) updateFields.is_active = updateData.isActive;
      updateFields.updated_at = new Date().toISOString();

      // Update service type
      const { data: serviceType, error } = await supabase
        .from('service_types')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update service type: ${error.message}`);
      }

      res.json(serviceType);
    } catch (error: any) {
      console.error('Error updating service type:', error);
      res.status(500).json({
        error: 'Failed to update service type',
        message: error.message
      });
    }
  }
);

// DELETE /api/service-types/:id - Delete service type (Admin only)
router.delete('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if service type exists
      const { data: existingService, error: checkError } = await supabase
        .from('service_types')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Service type not found',
            message: `Service type with ID ${id} does not exist`
          });
        }
        throw new Error(`Failed to check service type: ${checkError.message}`);
      }

      // Check if service type is being used in slots or bookings
      const { data: slotsUsingService, error: slotsError } = await supabase
        .from('slots')
        .select('id')
        .eq('service_type_id', id)
        .limit(1);

      if (slotsError) {
        throw new Error(`Failed to check slots usage: ${slotsError.message}`);
      }

      if (slotsUsingService && slotsUsingService.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete service type',
          message: 'Service type is being used in existing slots. Please deactivate instead of deleting.'
        });
      }

      // Delete service type
      const { error } = await supabase
        .from('service_types')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete service type: ${error.message}`);
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting service type:', error);
      res.status(500).json({
        error: 'Failed to delete service type',
        message: error.message
      });
    }
  }
);

export default router;
