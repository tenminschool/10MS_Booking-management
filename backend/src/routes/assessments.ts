import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = express.Router();

// Validation schemas
const createAssessmentSchema = z.object({
  bookingId: z.string().min(1, 'Booking ID is required'),
  score: z.number().min(0).max(9).refine(
    (val) => val % 0.5 === 0,
    'Score must be in 0.5 increments'
  ),
  remarks: z.string().min(1, 'Remarks are required')
});

// GET /api/assessments/my - Get user's assessments (role-based)
router.get('/my', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    let whereClause: any = {};

    // Role-based filtering
    if (user.role === 'STUDENT') {
      whereClause.studentId = user.userId;
    } else if (user.role === 'TEACHER') {
      whereClause.teacherId = user.userId;
    } else if (user.role === 'BRANCH_ADMIN') {
      // Branch admin can see assessments for their branch
      whereClause.booking = {
        slot: {
          branchId: user.branchId
        }
      };
    }
    // Super admin can see all assessments (no additional filter)

    const assessments = await prisma.assessment.findMany({
      where: whereClause,
      include: {
        booking: {
          include: {
            slot: {
              include: {
                branch: {
                  select: { id: true, name: true }
                },
                teacher: {
                  select: { id: true, name: true }
                }
              }
            },
            student: {
              select: { id: true, name: true, phoneNumber: true }
            }
          }
        },
        teacher: {
          select: { id: true, name: true }
        }
      },
      orderBy: { assessedAt: 'desc' }
    });

    res.json(assessments);

  } catch (error) {
    console.error('Error fetching assessments:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch assessments'
    });
  }
});

// GET /api/assessments/:id - Get single assessment
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;

    let whereClause: any = { id };

    // Role-based access control
    if (user.role === 'STUDENT') {
      whereClause.studentId = user.userId;
    } else if (user.role === 'TEACHER') {
      whereClause.teacherId = user.userId;
    } else if (user.role === 'BRANCH_ADMIN') {
      whereClause.booking = {
        slot: {
          branchId: user.branchId
        }
      };
    }

    const assessment = await prisma.assessment.findFirst({
      where: whereClause,
      include: {
        booking: {
          include: {
            slot: {
              include: {
                branch: {
                  select: { id: true, name: true, address: true }
                },
                teacher: {
                  select: { id: true, name: true, email: true }
                }
              }
            },
            student: {
              select: { id: true, name: true, phoneNumber: true }
            }
          }
        },
        teacher: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!assessment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Assessment not found or access denied'
      });
    }

    res.json(assessment);

  } catch (error) {
    console.error('Error fetching assessment:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch assessment'
    });
  }
});

// POST /api/assessments - Create new assessment (teachers only)
router.post('/', authenticate, auditLog('assessment'), async (req, res) => {
  try {
    const data = createAssessmentSchema.parse(req.body);
    const user = req.user!;

    // Only teachers can create assessments
    if (user.role !== 'TEACHER') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only teachers can create assessments'
      });
    }

    // Get the booking with full details
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        slot: {
          include: {
            branch: { select: { name: true } },
            teacher: { select: { name: true } }
          }
        },
        student: {
          select: { id: true, name: true, phoneNumber: true }
        },
        assessments: true
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Booking not found'
      });
    }

    // Verify teacher owns this booking
    if (booking.slot.teacherId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create assessments for your own sessions'
      });
    }

    // Check if booking is completed
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Can only create assessments for completed bookings'
      });
    }

    // Check if assessment already exists
    if (booking.assessments.length > 0) {
      return res.status(409).json({
        error: 'Conflict Error',
        message: 'Assessment already exists for this booking'
      });
    }

    // Create the assessment
    const assessment = await prisma.assessment.create({
      data: {
        bookingId: data.bookingId,
        studentId: booking.studentId,
        teacherId: user.userId,
        score: data.score,
        remarks: data.remarks,
        assessedAt: new Date()
      },
      include: {
        booking: {
          include: {
            slot: {
              include: {
                branch: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } }
              }
            },
            student: {
              select: { id: true, name: true }
            }
          }
        },
        teacher: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      message: 'Assessment created successfully',
      assessment
    });

  } catch (error) {
    console.error('Error creating assessment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid assessment data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create assessment'
    });
  }
});

// PUT /api/assessments/:id - Update assessment (teachers only)
router.put('/:id', authenticate, auditLog('assessment'), async (req, res) => {
  try {
    const { id } = req.params;
    const data = createAssessmentSchema.partial().parse(req.body);
    const user = req.user!;

    // Only teachers can update assessments
    if (user.role !== 'TEACHER') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only teachers can update assessments'
      });
    }

    // Get existing assessment
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            slot: true
          }
        }
      }
    });

    if (!existingAssessment) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Assessment not found'
      });
    }

    // Verify teacher owns this assessment
    if (existingAssessment.teacherId !== user.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own assessments'
      });
    }

    // Update the assessment
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        ...(data.score !== undefined && { score: data.score }),
        ...(data.remarks !== undefined && { remarks: data.remarks })
      },
      include: {
        booking: {
          include: {
            slot: {
              include: {
                branch: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } }
              }
            },
            student: {
              select: { id: true, name: true }
            }
          }
        },
        teacher: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      message: 'Assessment updated successfully',
      assessment: updatedAssessment
    });

  } catch (error) {
    console.error('Error updating assessment:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid assessment data',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update assessment'
    });
  }
});

export default router;