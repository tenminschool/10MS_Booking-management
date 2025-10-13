import { Router } from 'express';
import { authenticate, authorize, requireRole, requireBranchAccess } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateRequest, createUserSchema, updateUserSchema, paginationSchema } from '../utils/validation';
import { hashPassword } from '../utils/password';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types/auth';
import bcrypt from 'bcryptjs';

const router = Router();

// Get all users (Super-Admin and Branch-Admin)
router.get('/', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']), 
  async (req, res) => {
    try {
      let page = 1, limit = 10, sortBy, sortOrder = 'desc';
      try {
        const validated = validateRequest(paginationSchema, req.query);
        page = validated.page || 1;
        limit = validated.limit || 10;
        sortBy = validated.sortBy;
        sortOrder = validated.sortOrder || 'desc';
      } catch (validationError) {
        console.error('Validation error:', validationError);
        // Use defaults if validation fails
        page = 1;
        limit = 10;
        sortBy = undefined;
        sortOrder = 'desc';
      }
      const { branchId, role, search } = req.query;

      const skip = ((page || 1) - 1) * (limit || 10);
      
      // Build Supabase query
      let query = supabase
        .from('users')
        .select(`
          *,
          branch:branches(id, name)
        `)
        .range(skip, skip + (limit || 10) - 1);

      // Apply filters
      if (branchId) query = query.eq('branchId', branchId as string);
      if (role) query = query.eq('role', role as string);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phoneNumber.ilike.%${search}%`);
      }

      // Branch admin can only see users from their branch
      const currentUser = req.user!;
      if (currentUser.role === UserRole.BRANCH_ADMIN && currentUser.branchId) {
        query = query.eq('branchId', currentUser.branchId);
      }

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      const { data: users, error: usersError } = await query;

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      // Get total count
      let countQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (branchId) countQuery = countQuery.eq('branchId', branchId as string);
      if (role) countQuery = countQuery.eq('role', role as string);
      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phoneNumber.ilike.%${search}%`);
      }

      // Branch admin can only see users from their branch
      if (currentUser.role === UserRole.BRANCH_ADMIN && currentUser.branchId) {
        countQuery = countQuery.eq('branchId', currentUser.branchId);
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to count users: ${countError.message}`);
      }

      // Remove sensitive data
      const sanitizedUsers = (users || []).map(user => ({
        ...user,
        hashedPassword: undefined
      }));

      res.json({
        users: sanitizedUsers,
        pagination: {
          page: page || 1,
          limit: limit || 10,
          total: total || 0,
          pages: Math.ceil((total || 0) / (limit || 10))
        }
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
);

// Get users by branch (Branch-Admin only)
router.get('/branch/:branchId', 
  authenticate, 
  requireRole(['BRANCH_ADMIN', 'SUPER_ADMIN']),
  requireBranchAccess,
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const { page = 1, limit = 10, sortBy, sortOrder } = validateRequest(paginationSchema, req.query);
      const { role, search } = req.query;

      const skip = ((page || 1) - 1) * (limit || 10);
      
      // Build Supabase query
      let query = supabase
        .from('users')
        .select(`
          *,
          branch:branches(id, name)
        `)
        .eq('branchId', branchId)
        .range(skip, skip + (limit || 10) - 1);

      // Apply filters
      if (role) query = query.eq('role', role as string);
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phoneNumber.ilike.%${search}%`);
      }

      // Apply sorting
      if (sortBy) {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      } else {
        query = query.order('createdAt', { ascending: false });
      }

      const { data: users, error: usersError } = await query;

      if (usersError) {
        throw new Error(`Failed to fetch users: ${usersError.message}`);
      }

      // Get total count
      let countQuery = supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('branchId', branchId);

      if (role) countQuery = countQuery.eq('role', role as string);
      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phoneNumber.ilike.%${search}%`);
      }

      const { count: total, error: countError } = await countQuery;

      if (countError) {
        throw new Error(`Failed to count users: ${countError.message}`);
      }

      // Remove sensitive data
      const sanitizedUsers = (users || []).map(user => ({
        ...user,
        hashedPassword: undefined
      }));

      res.json({
        users: sanitizedUsers,
        pagination: {
          page: page || 1,
          limit: limit || 10,
          total: total || 0,
          pages: Math.ceil((total || 0) / (limit || 10))
        }
      });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: error.message
      });
    }
  }
);

// Get user by ID
router.get('/:id', 
  authenticate, 
  async (req, res) => {
    try {
      const { id } = req.params;
      const user = req.user!;

      // Check if user can access this user's data
      if (user.role === UserRole.STUDENT && user.userId !== id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own profile'
        });
      }

      if (user.role === UserRole.TEACHER && user.userId !== id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view your own profile'
        });
      }

      if (user.role === UserRole.BRANCH_ADMIN && user.branchId !== user.branchId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only view users from your branch'
        });
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          branch:branches(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The requested user does not exist'
          });
        }
        throw new Error(`Failed to fetch user: ${error.message}`);
      }

      // Remove sensitive data
      const sanitizedUser = {
        ...userData,
        hashedPassword: undefined
      };

      res.json(sanitizedUser);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: error.message
      });
    }
  }
);

// Create new user (Super-Admin or Branch-Admin)
router.post('/', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  auditLog('CREATE_USER'),
  async (req, res) => {
    try {
      const userData = validateRequest(createUserSchema, req.body);
      const currentUser = req.user!;

      // Branch admins can only create users for their branch
      if (currentUser.role === UserRole.BRANCH_ADMIN) {
        userData.branchId = currentUser.branchId;
      }

      // Check if user with same email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Failed to check existing user: ${checkError.message}`);
      }

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }

      // Hash password if provided
      const hashedPassword = userData.password ? await hashPassword(userData.password) : null;

      const { data: user, error } = await supabase
        .from('users')
        .insert([{
          name: userData.name,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          role: userData.role,
          branchId: userData.branchId,
          hashedPassword,
          isActive: userData.isActive ?? true
        }])
        .select(`
          *,
          branch:branches(id, name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to create user: ${error.message}`);
      }

      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.status(201).json(sanitizedUser);
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({
        error: 'Failed to create user',
        message: error.message
      });
    }
  }
);

// Update user (Super-Admin or Branch-Admin)
router.put('/:id', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  auditLog('UPDATE_USER'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = validateRequest(updateUserSchema, req.body);
      const currentUser = req.user!;

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, branchId, role')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The requested user does not exist'
          });
        }
        throw new Error(`Failed to check existing user: ${checkError.message}`);
      }

      // Branch admins can only update users from their branch
      if (currentUser.role === UserRole.BRANCH_ADMIN && existingUser.branchId !== currentUser.branchId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only update users from your branch'
        });
      }

      // Check for duplicate email if email is being updated
      if (updateData.email) {
        const { data: duplicateUser, error: duplicateError } = await supabase
          .from('users')
          .select('id')
          .eq('email', updateData.email)
          .neq('id', id)
          .single();

        if (duplicateError && duplicateError.code !== 'PGRST116') {
          throw new Error(`Failed to check duplicate user: ${duplicateError.message}`);
        }

        if (duplicateUser) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'A user with this email already exists'
          });
        }
      }

      // Hash password if provided
      const updatePayload: any = { ...updateData };
      if (updateData.password) {
        updatePayload.hashedPassword = await hashPassword(updateData.password);
        delete updatePayload.password;
      }

      updatePayload.updatedAt = new Date().toISOString();

      const { data: user, error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', id)
        .select(`
          *,
          branch:branches(id, name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to update user: ${error.message}`);
      }

      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.json(sanitizedUser);
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(500).json({
        error: 'Failed to update user',
        message: error.message
      });
    }
  }
);

// Delete user (Super-Admin or Branch-Admin)
router.delete('/:id', 
  authenticate, 
  requireRole(['SUPER_ADMIN', 'BRANCH_ADMIN']),
  auditLog('DELETE_USER'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      // Check if user exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, branchId, role')
        .eq('id', id)
        .single();

      if (checkError) {
        if (checkError.code === 'PGRST116') {
          return res.status(404).json({
            error: 'User not found',
            message: 'The requested user does not exist'
          });
        }
        throw new Error(`Failed to check existing user: ${checkError.message}`);
      }

      // Branch admins can only delete users from their branch
      if (currentUser.role === UserRole.BRANCH_ADMIN && existingUser.branchId !== currentUser.branchId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only delete users from your branch'
        });
      }

      // Soft delete by setting isActive to false
      const { data: user, error } = await supabase
        .from('users')
        .update({
          isActive: false,
          updatedAt: new Date().toISOString()
        })
        .eq('id', id)
        .select(`
          *,
          branch:branches(id, name)
        `)
        .single();

      if (error) {
        throw new Error(`Failed to delete user: ${error.message}`);
      }

      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.json({ message: 'User deleted successfully', user: sanitizedUser });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: error.message
      });
    }
  }
);

// POST /api/users/change-password - Change user password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Current password and new password are required'
      });
    }

    // Verify current password first with a sign-in attempt
    if (!user.email) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User email not found'
      });
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    });

    if (verifyError) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    }

    // Update password using Supabase Auth API
    // This requires using the service key to update another user's password
    // For now, let's use the simpler auth.updateUser which updates current user
    const { error: changeError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (changeError) {
      console.error('Supabase auth password change error:', changeError);
      return res.status(500).json({
        error: 'Password change failed',
        message: changeError.message
      });
    }

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to change password'
    });
  }
});

export default router;