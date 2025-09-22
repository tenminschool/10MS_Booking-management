import { Router } from 'express';
import { validateRequest, loginSchema, otpRequestSchema, otpVerificationSchema } from '../utils/validation';
import { comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { phoneValidationMiddleware, otpRateLimitMiddleware } from '../middleware/phoneValidation';
import prisma from '../lib/prisma';
import { UserRole } from '@prisma/client';
import smsService from '../services/sms';
import otpService from '../services/otp';

const router = Router();

// Staff login (email + password)
router.post('/staff/login', auditLog('staff_login'), async (req, res) => {
  try {
    const { email, password } = validateRequest(loginSchema, req.body);

    if (!email || !password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email and password are required for staff login'
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { branch: true }
    });

    if (!user || !user.hashedPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.hashedPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact administrator.'
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      branchId: user.branchId || undefined,
      email: user.email || undefined,
    });

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch ? {
          id: user.branch.id,
          name: user.branch.name
        } : null
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Student OTP request
router.post('/student/request-otp', phoneValidationMiddleware, otpRateLimitMiddleware, auditLog('otp_request'), async (req, res) => {
  try {
    const { phoneNumber } = validateRequest(otpRequestSchema, req.body);

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'No student account found with this phone number'
      });
    }

    if (!student.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact administrator.'
      });
    }

    // Check if there's already a valid OTP
    const hasValidOTP = await otpService.hasValidOTP(phoneNumber);
    if (hasValidOTP) {
      const remainingTime = await otpService.getRemainingTime(phoneNumber);
      return res.status(429).json({
        error: 'OTP already sent',
        message: `Please wait ${Math.ceil(remainingTime / 60)} minutes before requesting a new OTP`,
        remainingTime
      });
    }

    // Generate and store OTP
    const otp = otpService.generateOTP();
    await otpService.storeOTP(phoneNumber, otp);

    // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otp);
    
    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      // Don't fail the request if SMS fails in development
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({
          error: 'SMS sending failed',
          message: 'Unable to send OTP. Please try again later.'
        });
      }
    }

    res.json({
      message: 'OTP sent successfully',
      phoneNumber,
      expiresIn: 300, // 5 minutes in seconds
      // In development, include OTP for testing
      ...(process.env.NODE_ENV === 'development' && { 
        otp,
        smsStatus: smsResult.success ? 'sent' : 'failed'
      })
    });

  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({
      error: 'OTP request failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Student OTP verification and login
router.post('/student/verify-otp', phoneValidationMiddleware, auditLog('student_login'), async (req, res) => {
  try {
    const { phoneNumber, otp } = validateRequest(otpVerificationSchema, req.body);

    // Find student by phone number
    const student = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'No student account found with this phone number'
      });
    }

    if (!student.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact administrator.'
      });
    }

    // Verify OTP
    const otpVerification = await otpService.verifyOTP(phoneNumber, otp);
    
    if (!otpVerification.success) {
      return res.status(401).json({
        error: 'OTP verification failed',
        message: otpVerification.error
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: student.id,
      role: student.role,
      phoneNumber: student.phoneNumber || undefined,
    });

    // Create in-app notification for successful login
    await prisma.notification.create({
      data: {
        userId: student.id,
        title: 'Login Successful',
        message: 'You have successfully logged into your 10 Minute School account.',
        type: 'SYSTEM_ALERT',
      },
    });

    res.json({
      user: {
        id: student.id,
        name: student.name,
        phoneNumber: student.phoneNumber,
        role: student.role,
      },
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      error: 'OTP verification failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
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
        message: 'User account not found'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Check OTP status
router.get('/student/otp-status/:phoneNumber', phoneValidationMiddleware, async (req, res) => {
  try {
    const { phoneNumber } = req.params;
    
    // Validate phone number format
    const { phoneNumber: validatedPhone } = validateRequest(otpRequestSchema, { phoneNumber });

    const hasValidOTP = await otpService.hasValidOTP(validatedPhone);
    const remainingTime = await otpService.getRemainingTime(validatedPhone);

    res.json({
      hasValidOTP,
      remainingTime,
      canRequestNew: !hasValidOTP,
    });

  } catch (error) {
    console.error('OTP status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Resend OTP (with rate limiting)
router.post('/student/resend-otp', phoneValidationMiddleware, otpRateLimitMiddleware, auditLog('otp_resend'), async (req, res) => {
  try {
    const { phoneNumber } = validateRequest(otpRequestSchema, req.body);

    // Check if student exists
    const student = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!student || student.role !== UserRole.STUDENT) {
      return res.status(404).json({
        error: 'Student not found',
        message: 'No student account found with this phone number'
      });
    }

    if (!student.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled. Please contact administrator.'
      });
    }

    // Delete existing OTP and generate new one
    await otpService.deleteOTP(phoneNumber);
    
    const otp = otpService.generateOTP();
    await otpService.storeOTP(phoneNumber, otp);

    // Send SMS
    const smsResult = await smsService.sendOTP(phoneNumber, otp);
    
    if (!smsResult.success && process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'SMS sending failed',
        message: 'Unable to send OTP. Please try again later.'
      });
    }

    res.json({
      message: 'New OTP sent successfully',
      phoneNumber,
      expiresIn: 300,
      ...(process.env.NODE_ENV === 'development' && { 
        otp,
        smsStatus: smsResult.success ? 'sent' : 'failed'
      })
    });

  } catch (error) {
    console.error('OTP resend error:', error);
    res.status(500).json({
      error: 'OTP resend failed',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Logout (client-side token removal, server-side could blacklist token)
router.post('/logout', authenticate, auditLog('logout'), (req, res) => {
  // In a more sophisticated implementation, you might:
  // 1. Add token to blacklist in Redis
  // 2. Log the logout event
  
  res.json({
    message: 'Logged out successfully'
  });
});

// OTP service statistics (for monitoring)
router.get('/otp/stats', authenticate, (req, res) => {
  if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only super admins can view OTP statistics'
    });
  }

  const stats = otpService.getStats();
  res.json(stats);
});

export default router;