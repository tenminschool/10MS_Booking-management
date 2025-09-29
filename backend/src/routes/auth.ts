import express from 'express';
import { authenticate } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import { supabase } from '../lib/supabase';
import { generateToken } from '../utils/jwt';
import { comparePassword } from '../utils/password';

const router = express.Router();

// POST /api/auth/staff/login - Staff login endpoint
router.post('/staff/login', auditLog('staff_login'), async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email and password are required'
      });
    }

    // Query user from Supabase database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('isActive', true)
      .single();

    if (error || !user) {
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

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      branchId: user.branchId,
      email: user.email
    });

    // Update last login
    await supabase
      .from('users')
      .update({ lastLoginAt: new Date().toISOString() })
      .eq('id', user.id);

    const result = {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId
      }
    };

    res.json(result);
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid credentials'
    });
  }
});

// POST /api/auth/student/request-otp - Student OTP request
router.post('/student/request-otp', auditLog('otp_request'), async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Phone number is required'
      });
    }

    // Mock OTP request response
    res.json({
      message: 'OTP sent successfully',
      phoneNumber: phoneNumber,
      expiresIn: 300 // 5 minutes
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(400).json({
      error: 'OTP request failed',
      message: 'Failed to send OTP'
    });
  }
});

// POST /api/auth/student/verify-otp - Student OTP verification
router.post('/student/verify-otp', auditLog('otp_verification'), async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Phone number and OTP are required'
      });
    }

    // Query user from Supabase database by phone number
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phoneNumber', phoneNumber)
      .eq('role', 'STUDENT')
      .eq('isActive', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid phone number'
      });
    }

    // For now, accept any 6-digit OTP (in production, verify against stored OTP)
    if (otp.length === 6 && /^\d+$/.test(otp)) {
      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        role: user.role,
        branchId: user.branchId,
        phoneNumber: user.phoneNumber
      });

      // Update last login
      await supabase
        .from('users')
        .update({ lastLoginAt: new Date().toISOString() })
        .eq('id', user.id);

      const result = {
        token,
        user: {
          id: user.id,
          name: user.name,
          phoneNumber: user.phoneNumber,
          role: user.role,
          branchId: user.branchId
        }
      };
      res.json(result);
    } else {
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid OTP'
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid OTP'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = req.user!;
    
    // Query user details from database
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, email, phoneNumber, role, branchId')
      .eq('id', user.userId)
      .single();

    if (error || !userData) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User data not found'
      });
    }

    res.json({
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phoneNumber: userData.phoneNumber,
      role: userData.role,
      branchId: userData.branchId
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user info'
    });
  }
});

// POST /api/auth/logout - Logout endpoint
router.post('/logout', authenticate, auditLog('logout'), async (req, res) => {
  try {
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to logout'
    });
  }
});

export default router;