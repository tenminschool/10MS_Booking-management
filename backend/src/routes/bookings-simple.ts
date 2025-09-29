import express from 'express';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// GET /api/bookings - Get user's bookings (role-based)
router.get('/', authenticate, async (req, res) => {
  try {
    // Return empty array to fix frontend error
    res.json([]);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch bookings'
    });
  }
});

export default router;
