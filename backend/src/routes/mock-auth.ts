/**
 * Mock Authentication Routes for Development/Testing
 * Use when database is not available
 */

import { Router } from 'express';
import { mockAuth } from '../lib/mock-auth';

const router = Router();

// Mock staff login
router.post('/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email and password are required'
      });
    }

    const result = await mockAuth.loginStaff(email, password);
    res.json(result);

  } catch (error) {
    console.error('Mock staff login error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid credentials'
    });
  }
});

// Mock student email login
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('🧪 Mock student login attempt:', {
      email,
      hasPassword: typeof password === 'string' && password.length > 0
    });

    if (!email || !password) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Email and password are required'
      });
    }

    const result = await mockAuth.loginStudent(email, password);
    console.log('✅ Mock student login success for:', email);
    res.json(result);

  } catch (error) {
    console.error('❌ Mock student login error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid credentials',
      hint: 'Use student@10minuteschool.com / student123'
    });
  }
});

// Mock student OTP request
router.post('/student/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Phone number is required'
      });
    }

    const result = await mockAuth.requestOTP(phoneNumber);
    res.json(result);

  } catch (error) {
    console.error('Mock OTP request error:', error);
    res.status(400).json({
      error: 'OTP request failed',
      message: error instanceof Error ? error.message : 'Failed to send OTP'
    });
  }
});

// Mock student OTP verification
router.post('/student/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Phone number and OTP are required'
      });
    }

    const result = await mockAuth.verifyOTP(phoneNumber, otp);
    res.json(result);

  } catch (error) {
    console.error('Mock OTP verification error:', error);
    res.status(401).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : 'Invalid OTP'
    });
  }
});

// Mock current user endpoint
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No valid token provided'
      });
    }

    const token = authHeader.substring(7);
    
    // For mock authentication, we'll return a simple user object
    // In a real app, you'd verify the JWT token here
    res.json({
      data: {
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'mock@example.com',
        role: 'STUDENT',
        branchId: null
      }
    });
  } catch (error) {
    console.error('Mock /me error:', error);
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token'
    });
  }
});

// Mock logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logged out successfully'
  });
});

export default router;