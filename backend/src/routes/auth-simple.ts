import express from 'express';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// POST /api/auth/login - Mock login endpoint
router.post('/login', async (req, res) => {
  try {
    // Return mock login response
    res.json({
      token: 'mock-token',
      user: {
        id: 'user-1',
        name: 'Test User',
        role: 'STUDENT'
      }
    });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Login failed'
    });
  }
});

export default router;
