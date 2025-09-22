import { Router } from 'express';
import { authenticate, authorize, requireRole, requireBranchAccess } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateRequest, createUserSchema, updateUserSchema, paginationSchema } from '../utils/validation';
import { hashPassword } from '../utils/password';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// Get all users (Super-Admin only)
router.get('/', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN]), 
  async (req, res) => {
    try {
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, req.query);
      const { branchId, role, search } = req.query;

      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = {};
      if (branchId) where.branchId = branchId as string;
      if (role) where.role = role as UserRole;
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          include: {
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      // Remove sensitive data
      const sanitizedUsers = users.map(user => ({
        ...user,
        hashedPassword: undefined
      }));

      res.json({
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to fetch users',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Get users by branch (Branch-Admin can see their branch, Super-Admin can see any)
router.get('/branch/:branchId', 
  authenticate, 
  requireRole([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN]), 
  requireBranchAccess,
  async (req, res) => {
    try {
      const { branchId } = req.params;
      const { page, limit, sortBy, sortOrder } = validateRequest(paginationSchema, req.query);
      const { role, search } = req.query;

      const skip = (page - 1) * limit;
      
      // Build where clause
      const where: any = { branchId };
      if (role) where.role = role as UserRole;
      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
          { phoneNumber: { contains: search as string } }
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
          include: {
            branch: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.user.count({ where })
      ]);

      // Remove sensitive data
      const sanitizedUsers = users.map(user => ({
        ...user,
        hashedPassword: undefined
      }));

      res.json({
        users: sanitizedUsers,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Get branch users error:', error);
      res.status(500).json({
        error: 'Failed to fetch branch users',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Get single user
router.get('/:id', 
  authenticate, 
  authorize(['read:all_users', 'read:branch_users']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              contactNumber: true
            }
          }
        }
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }

      // Check branch access for non-super-admins
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        if (user.branchId !== req.user?.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Cannot access users from other branches'
          });
        }
      }

      // Remove sensitive data
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.json({ user: sanitizedUser });

    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        error: 'Failed to fetch user',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Create user
router.post('/', 
  authenticate, 
  authorize(['create:any_user', 'create:branch_user']),
  auditLog('user_create'),
  async (req, res) => {
    try {
      const userData = validateRequest(createUserSchema, req.body);

      // Branch-Admin can only create users in their branch
      if (req.user?.role === UserRole.BRANCH_ADMIN) {
        if (userData.branchId && userData.branchId !== req.user.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Branch admins can only create users in their own branch'
          });
        }
        // Force branch assignment for branch admins
        userData.branchId = req.user.branchId;
        
        // Branch admins can only create teachers and students
        if (![UserRole.TEACHER, UserRole.STUDENT].includes(userData.role)) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Branch admins can only create teachers and students'
          });
        }
      }

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            ...(userData.email ? [{ email: userData.email }] : []),
            ...(userData.phoneNumber ? [{ phoneNumber: userData.phoneNumber }] : [])
          ]
        }
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'A user with this email or phone number already exists'
        });
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (userData.password) {
        hashedPassword = await hashPassword(userData.password);
      }

      // Create user
      const user = await prisma.user.create({
        data: {
          ...userData,
          hashedPassword,
          password: undefined // Remove plain password
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Remove sensitive data from response
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.status(201).json({
        message: 'User created successfully',
        user: sanitizedUser
      });

    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        error: 'Failed to create user',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Update user
router.put('/:id', 
  authenticate, 
  authorize(['update:any_user', 'update:branch_user']),
  auditLog('user_update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = validateRequest(updateUserSchema, req.body);

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }

      // Check branch access for non-super-admins
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        if (existingUser.branchId !== req.user?.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Cannot update users from other branches'
          });
        }

        // Branch admins cannot change branch assignment
        if (updateData.branchId && updateData.branchId !== req.user.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Branch admins cannot move users to other branches'
          });
        }

        // Branch admins cannot create super-admins or branch-admins
        if (updateData.role && [UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN].includes(updateData.role)) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Branch admins cannot assign admin roles'
          });
        }
      }

      // Check for duplicate email/phone
      if (updateData.email || updateData.phoneNumber) {
        const duplicateUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              {
                OR: [
                  ...(updateData.email ? [{ email: updateData.email }] : []),
                  ...(updateData.phoneNumber ? [{ phoneNumber: updateData.phoneNumber }] : [])
                ]
              }
            ]
          }
        });

        if (duplicateUser) {
          return res.status(409).json({
            error: 'Duplicate data',
            message: 'Another user with this email or phone number already exists'
          });
        }
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (updateData.password) {
        hashedPassword = await hashPassword(updateData.password);
      }

      // Update user
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          ...(hashedPassword && { hashedPassword }),
          password: undefined // Remove plain password
        },
        include: {
          branch: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Remove sensitive data from response
      const sanitizedUser = {
        ...user,
        hashedPassword: undefined
      };

      res.json({
        message: 'User updated successfully',
        user: sanitizedUser
      });

    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        error: 'Failed to update user',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Delete user (deactivate)
router.delete('/:id', 
  authenticate, 
  authorize(['delete:any_user', 'delete:branch_user']),
  auditLog('user_delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { id }
      });

      if (!existingUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'User with the specified ID does not exist'
        });
      }

      // Check branch access for non-super-admins
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        if (existingUser.branchId !== req.user?.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Cannot delete users from other branches'
          });
        }
      }

      // Deactivate user instead of hard delete
      const user = await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });

      res.json({
        message: 'User deactivated successfully',
        user: {
          id: user.id,
          name: user.name,
          isActive: user.isActive
        }
      });

    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        error: 'Failed to delete user',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;