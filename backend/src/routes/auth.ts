import express from 'express';
import { supabase } from '../lib/supabase';
import { mockAuth } from '../lib/mock-auth';

const router = express.Router();

// POST /api/auth/login - Legacy endpoint (redirects to staff login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Use Supabase Auth to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('Supabase auth error:', error);
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }

    if (!data.user || !data.session) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

    // Get user details from our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User exists in auth but not in users table'
      });
    }

    // Return user data and access token in the format expected by frontend
    res.json({
      data: {
        token: data.session?.access_token,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          branchId: userData.branchId
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process login request'
    });
  }
});

// POST /api/auth/staff/login - Staff login with Supabase Auth
router.post('/staff/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      // Fallback to mock authentication for demo credentials
      console.log('Supabase auth failed, trying mock auth for:', email);
      try {
        const mockResult = await mockAuth.loginStaff(email, password);
        return res.json(mockResult);
      } catch (mockError) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: error.message
        });
      }
    }

    if (!data.user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'No user data returned'
      });
    }

    // Get user details from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User exists in auth but not in users table'
      });
    }

    // Return user data and access token in the format expected by frontend
    res.json({
      data: {
        token: data.session?.access_token,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          branchId: userData.branchId
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

// POST /api/auth/student/login - Student login with mock fallback
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Try mock authentication for demo credentials
    try {
      const mockResult = await mockAuth.loginStudent(email, password);
      return res.json(mockResult);
    } catch (mockError) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid credentials'
      });
    }

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Student login failed'
    });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      await supabase.auth.signOut();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Logout failed'
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Check if it's a student token (custom format: student_{userId}_{timestamp})
    if (token.startsWith('student_')) {
      const tokenParts = token.split('_');
      if (tokenParts.length >= 2) {
        const userId = tokenParts[1];
        
        console.log('Student token detected, userId:', userId);
        
        // Get user details from users table using the userId from token
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (userError || !userData) {
          console.log('Student user not found:', userError);
          return res.status(401).json({
            error: 'User not found',
            message: 'Student not found'
          });
        }

        console.log('Student user found:', userData);

        return res.json({
          data: {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
            branchId: userData.branchId,
            phoneNumber: userData.phoneNumber,
            isActive: userData.isActive,
            createdAt: userData.createdAt
          }
        });
      } else {
        return res.status(401).json({
          error: 'Invalid token format',
          message: 'Student token format is invalid'
        });
      }
    }

    // Handle Supabase tokens (for staff/admin users)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid token'
      });
    }

    // Get user details from your users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'User not found',
        message: 'User exists in auth but not in users table'
      });
    }

    res.json({
      data: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        branchId: userData.branchId
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get user data'
    });
  }
});

// POST /api/auth/student/request-otp - Send OTP to student phone
router.post('/student/request-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Missing phone number',
        message: 'Phone number is required'
      });
    }

    // For now, just return success (in production, you'd send real OTP)
    // You can integrate with SMS service like AWS SNS, etc.
    res.json({
      message: 'OTP sent successfully',
      phoneNumber: phoneNumber
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to send OTP'
    });
  }
});

// POST /api/auth/student/login - Student login with email and password
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find student by email
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', 'STUDENT')
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'Student not found',
        message: 'No student found with this email'
      });
    }

    // For demo purposes, accept any password (in production, verify password hash)
    // In a real system, you would verify the password hash here

    // Generate a simple token for student
    const token = `student_${userData.id}_${Date.now()}`;

    res.json({
      data: {
        token,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          branchId: userData.branchId,
          phoneNumber: userData.phoneNumber
        }
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process login request'
    });
  }
});

// POST /api/auth/student/verify-otp - Verify OTP and login student
router.post('/student/verify-otp', async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Phone number and OTP are required'
      });
    }

    // For demo purposes, accept OTP '123456' (in production, verify against stored OTP)
    if (otp !== '123456') {
      return res.status(401).json({
        error: 'Invalid OTP',
        message: 'The OTP you entered is incorrect. Use 123456 for demo.'
      });
    }

    // Find student by phone number
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('phoneNumber', phoneNumber)
      .eq('role', 'STUDENT')
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'Student not found',
        message: 'No student found with this phone number'
      });
    }

    // Generate a simple token for student (you might want to use Supabase Auth for students too)
    const token = `student_${userData.id}_${Date.now()}`;

    res.json({
      data: {
        token,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          branchId: userData.branchId
        }
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to verify OTP'
    });
  }
});

export default router;