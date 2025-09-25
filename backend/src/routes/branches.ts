import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { validateRequest, createBranchSchema, updateBranchSchema, paginationSchema } from '../utils/validation';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';

const router = Router();

// Mock branches data
const mockBranches = [
  {
    id: 'mock-branch-1',
    name: 'Dhanmondi Branch',
    address: '27 Dhanmondi R/A, Dhaka 1205',
    contactNumber: '+880-2-9661301',
    isActive: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
    _count: { users: 45, slots: 120 }
  },
  {
    id: 'mock-branch-2',
    name: 'Gulshan Branch',
    address: '98 Gulshan Avenue, Dhaka 1212',
    contactNumber: '+880-2-9885566',
    isActive: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
    _count: { users: 38, slots: 95 }
  },
  {
    id: 'mock-branch-3',
    name: 'Uttara Branch',
    address: '15 Uttara Sector 7, Dhaka 1230',
    contactNumber: '+880-2-8958877',
    isActive: true,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-03-10'),
    _count: { users: 32, slots: 80 }
  }
];

// Get all branches
router.get('/',
  authenticate,
  async (req, res) => {
    try {
      const { page = 1, limit = 10, sortBy, sortOrder } = validateRequest(paginationSchema, req.query);
      const { search } = req.query;

      // Try database first, fallback to mock data
      try {
        await prisma.$queryRaw`SELECT 1`;

        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};
        if (search) {
          where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { address: { contains: search as string, mode: 'insensitive' } }
          ];
        }

        const [branches, total] = await Promise.all([
          prisma.branch.findMany({
            where,
            skip,
            take: limit,
            orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
            include: {
              _count: {
                select: {
                  users: true,
                  slots: true
                }
              }
            }
          }),
          prisma.branch.count({ where })
        ]);

        res.json({
          branches,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });

      } catch (dbError) {
        console.warn('Database unavailable, using mock branches data:', dbError);

        // Filter mock data based on search
        let filteredBranches = mockBranches;
        if (search) {
          const searchTerm = (search as string).toLowerCase();
          filteredBranches = mockBranches.filter(branch =>
            branch.name.toLowerCase().includes(searchTerm) ||
            branch.address.toLowerCase().includes(searchTerm)
          );
        }

        // Apply pagination
        const skip = (page - 1) * limit;
        const paginatedBranches = filteredBranches.slice(skip, skip + limit);

        res.json({
          branches: paginatedBranches,
          pagination: {
            page,
            limit,
            total: filteredBranches.length,
            pages: Math.ceil(filteredBranches.length / limit)
          },
          _mock: true,
          _message: 'Using mock data (database unavailable)'
        });
      }

    } catch (error) {
      console.error('Get branches error:', error);
      res.status(500).json({
        error: 'Failed to fetch branches',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Get single branch
router.get('/:id',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              slots: true
            }
          },
          users: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              role: true,
              email: true,
              phoneNumber: true,
              isActive: true
            },
            orderBy: { name: 'asc' }
          }
        }
      });

      if (!branch) {
        return res.status(404).json({
          error: 'Branch not found',
          message: 'Branch with the specified ID does not exist'
        });
      }

      // Check branch access for non-super-admins
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        if (branch.id !== req.user?.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Cannot access other branches'
          });
        }
      }

      res.json({ branch });

    } catch (error) {
      console.error('Get branch error:', error);
      res.status(500).json({
        error: 'Failed to fetch branch',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Create branch (Super-Admin only)
router.post('/',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  auditLog('branch_create'),
  async (req, res) => {
    try {
      const branchData = validateRequest(createBranchSchema, req.body);

      // Check if branch with same name already exists
      const existingBranch = await prisma.branch.findFirst({
        where: {
          name: {
            equals: branchData.name,
            mode: 'insensitive'
          }
        }
      });

      if (existingBranch) {
        return res.status(409).json({
          error: 'Branch already exists',
          message: 'A branch with this name already exists'
        });
      }

      // Create branch
      const branch = await prisma.branch.create({
        data: branchData,
        include: {
          _count: {
            select: {
              users: true,
              slots: true
            }
          }
        }
      });

      res.status(201).json({
        message: 'Branch created successfully',
        branch
      });

    } catch (error) {
      console.error('Create branch error:', error);
      res.status(500).json({
        error: 'Failed to create branch',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Update branch (Super-Admin only)
router.put('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  auditLog('branch_update'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = validateRequest(updateBranchSchema, req.body);

      // Check if branch exists
      const existingBranch = await prisma.branch.findUnique({
        where: { id }
      });

      if (!existingBranch) {
        return res.status(404).json({
          error: 'Branch not found',
          message: 'Branch with the specified ID does not exist'
        });
      }

      // Check for duplicate name
      if (updateData.name) {
        const duplicateBranch = await prisma.branch.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              { name: { equals: updateData.name, mode: 'insensitive' } }
            ]
          }
        });

        if (duplicateBranch) {
          return res.status(409).json({
            error: 'Duplicate name',
            message: 'Another branch with this name already exists'
          });
        }
      }

      // Update branch
      const branch = await prisma.branch.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: {
              users: true,
              slots: true
            }
          }
        }
      });

      res.json({
        message: 'Branch updated successfully',
        branch
      });

    } catch (error) {
      console.error('Update branch error:', error);
      res.status(500).json({
        error: 'Failed to update branch',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Delete branch (Super-Admin only)
router.delete('/:id',
  authenticate,
  requireRole([UserRole.SUPER_ADMIN]),
  auditLog('branch_delete'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if branch exists
      const existingBranch = await prisma.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              users: true,
              slots: true
            }
          }
        }
      });

      if (!existingBranch) {
        return res.status(404).json({
          error: 'Branch not found',
          message: 'Branch with the specified ID does not exist'
        });
      }

      // Check if branch has users or slots
      if (existingBranch._count.users > 0 || existingBranch._count.slots > 0) {
        return res.status(409).json({
          error: 'Branch has dependencies',
          message: 'Cannot delete branch that has users or slots. Please reassign or remove them first.',
          details: {
            users: existingBranch._count.users,
            slots: existingBranch._count.slots
          }
        });
      }

      // Delete branch
      await prisma.branch.delete({
        where: { id }
      });

      res.json({
        message: 'Branch deleted successfully',
        branch: {
          id: existingBranch.id,
          name: existingBranch.name
        }
      });

    } catch (error) {
      console.error('Delete branch error:', error);
      res.status(500).json({
        error: 'Failed to delete branch',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

// Get branch statistics (for dashboard)
router.get('/:id/stats',
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check branch access for non-super-admins
      if (req.user?.role !== UserRole.SUPER_ADMIN) {
        if (id !== req.user?.branchId) {
          return res.status(403).json({
            error: 'Access denied',
            message: 'Cannot access other branch statistics'
          });
        }
      }

      const branch = await prisma.branch.findUnique({
        where: { id },
        select: { id: true, name: true }
      });

      if (!branch) {
        return res.status(404).json({
          error: 'Branch not found',
          message: 'Branch with the specified ID does not exist'
        });
      }

      // Get statistics
      const [
        totalUsers,
        activeUsers,
        totalTeachers,
        totalStudents,
        totalSlots,
        totalBookings,
        todayBookings
      ] = await Promise.all([
        prisma.user.count({ where: { branchId: id } }),
        prisma.user.count({ where: { branchId: id, isActive: true } }),
        prisma.user.count({ where: { branchId: id, role: UserRole.TEACHER, isActive: true } }),
        prisma.user.count({ where: { branchId: id, role: UserRole.STUDENT, isActive: true } }),
        prisma.slot.count({ where: { branchId: id } }),
        prisma.booking.count({
          where: {
            slot: { branchId: id }
          }
        }),
        prisma.booking.count({
          where: {
            slot: {
              branchId: id,
              date: new Date().toISOString().split('T')[0]
            }
          }
        })
      ]);

      res.json({
        branch,
        stats: {
          users: {
            total: totalUsers,
            active: activeUsers,
            teachers: totalTeachers,
            students: totalStudents
          },
          slots: {
            total: totalSlots
          },
          bookings: {
            total: totalBookings,
            today: todayBookings
          }
        }
      });

    } catch (error) {
      console.error('Get branch stats error:', error);
      res.status(500).json({
        error: 'Failed to fetch branch statistics',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
);

export default router;