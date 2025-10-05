import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateRequest, createBranchSchema, updateBranchSchema, paginationSchema } from '../utils/validation';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';

const router = Router();

// Get all branches
router.get('/', 
  authenticate, 
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder } = validateRequest(paginationSchema, req.query);
      const { search, isActive } = req.query;

      const skip = ((page || 1) - 1) * (limit || 10);
      
      // Build Supabase query
      let query = supabase
        .from('branches')
        .select('*')
        .range(skip, skip + (limit || 10) - 1);

      // Apply filters
      if (search) {
        query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
      }
      if (isActive !== undefined) {
        query = query.eq('isActive', isActive === 'true');
      }

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      const { data: branches, error: branchesError } = await query;

      if (branchesError) {
        throw new Error(`Failed to fetch branches: ${branchesError.message}`);
      }

      // Get total count
      let countQuery = supabase
        .from('branches')
        .select('*', { count: 'exact', head: true });

      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
      }
      if (isActive !== undefined) {
        countQuery = countQuery.eq('isActive', isActive === 'true');
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to count branches: ${countError.message}`);
      }

      res.json({
        branches: branches || [],
        pagination: {
          page: page || 1,
          limit: limit || 10,
          total: total || 0,
          pages: Math.ceil((total || 0) / (limit || 10))
        }
      });
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      res.status(500).json({
        error: 'Failed to fetch branches',
        message: error.message
      });
    }
  }
);

// Get branch by ID
router.get('/:id', 
  authenticate, 
  async (req, res) => {
    try {
      const { id } = req.params;

      const { data: branch, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Branch not found',
            message: 'The requested branch does not exist'
          });
        }
        throw new Error(`Failed to fetch branch: ${error.message}`);
      }

      res.json(branch);
    } catch (error: any) {
      console.error('Error fetching branch:', error);
      res.status(500).json({
        error: 'Failed to fetch branch',
        message: error.message
      });
    }
  }
);

// Create new branch (Super-Admin only)
router.post('/', 
  authenticate, 
  requireRole(['SUPER_ADMIN']),
  auditLog('CREATE_BRANCH'),
  async (req, res) => {
    try {
      const branchData = validateRequest(createBranchSchema, req.body);

      // Check if branch with same name already exists
      const { data: existingBranch, error: checkError } = await supabase
        .from('branches')
        .select('id')
        .eq('name', branchData.name)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing branch: ${checkError.message}`);
      }

      if (existingBranch) {
        return res.status(409).json({
          error: 'Branch already exists',
          message: 'A branch with this name already exists'
        });
      }

      const now = new Date().toISOString();
      const { data: branch, error } = await supabase
        .from('branches')
        .insert([{
          id: `branch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: branchData.name,
          address: branchData.address,
          contactNumber: branchData.contactNumber,
          isActive: branchData.isActive ?? true,
          updatedAt: now
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create branch: ${error.message}`);
      }

      res.status(201).json(branch);
    } catch (error: any) {
      console.error('Error creating branch:', error);
      res.status(500).json({
        error: 'Failed to create branch',
        message: error.message
      });
    }
  }
);

// Update branch (Super-Admin only)
router.put('/:id', 
  authenticate, 
  requireRole(['SUPER_ADMIN']),
  auditLog('UPDATE_BRANCH'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = validateRequest(updateBranchSchema, req.body);

      // Check if branch exists
      const { data: existingBranch, error: checkError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Branch not found',
            message: 'The requested branch does not exist'
          });
        }
        throw new Error(`Failed to check existing branch: ${checkError.message}`);
      }

      // Check for duplicate name if name is being updated
      if (updateData.name) {
        const { data: duplicateBranch, error: duplicateError } = await supabase
          .from('branches')
          .select('id')
          .eq('name', updateData.name)
          .neq('id', id)
          .single();

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          throw new Error(`Failed to check duplicate branch: ${duplicateError.message}`);
        }

        if (duplicateBranch) {
          return res.status(409).json({
            error: 'Branch name already exists',
            message: 'A branch with this name already exists'
          });
        }
      }

      const { data: branch, error } = await supabase
        .from('branches')
        .update({
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update branch: ${error.message}`);
      }

      res.json(branch);
    } catch (error: any) {
      console.error('Error updating branch:', error);
      res.status(500).json({
        error: 'Failed to update branch',
        message: error.message
      });
    }
  }
);

// Delete branch (Super-Admin only)
router.delete('/:id', 
  authenticate, 
  requireRole(['SUPER_ADMIN']),
  auditLog('DELETE_BRANCH'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if branch exists
      const { data: existingBranch, error: checkError } = await supabase
        .from('branches')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Branch not found',
            message: 'The requested branch does not exist'
          });
        }
        throw new Error(`Failed to check existing branch: ${checkError.message}`);
      }

      // Soft delete by setting isActive to false
      const { data: branch, error } = await supabase
        .from('branches')
        .update({
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to delete branch: ${error.message}`);
      }

      res.json({ message: 'Branch deleted successfully', branch });
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      res.status(500).json({
        error: 'Failed to delete branch',
        message: error.message
      });
    }
  }
);

// Get branch statistics
router.get('/:id/stats', 
  authenticate, 
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if branch exists
      const { data: branch, error: branchError } = await supabase
        .from('branches')
        .select('id, name')
        .eq('id', id)
        .single();

      if (branchError) {
        if (branchError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Branch not found',
            message: 'The requested branch does not exist'
          });
        }
        throw new Error(`Failed to fetch branch: ${branchError.message}`);
      }

      // Get statistics
      const [
        { count: totalUsers },
        { count: activeUsers },
        { count: teachers },
        { count: students },
        { count: totalSlots },
        { count: totalBookings },
        { count: confirmedBookings }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('branchId', id),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('branchId', id).eq('isActive', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('branchId', id).eq('role', UserRole.TEACHER).eq('isActive', true),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('branchId', id).eq('role', UserRole.STUDENT).eq('isActive', true),
        supabase.from('slots').select('*', { count: 'exact', head: true }).eq('branchId', id),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('slot.branchId', id),
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('slot.branchId', id).eq('status', 'CONFIRMED')
      ]);

      res.json({
        branch,
        stats: {
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          teachers: teachers || 0,
          students: students || 0,
          totalSlots: totalSlots || 0,
          totalBookings: totalBookings || 0,
          confirmedBookings: confirmedBookings || 0
        }
      });
    } catch (error: any) {
      console.error('Error fetching branch stats:', error);
      res.status(500).json({
        error: 'Failed to fetch branch statistics',
        message: error.message
      });
    }
  }
);

export default router;