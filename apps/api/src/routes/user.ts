import { Router, Request, Response } from 'express';
import { createOrUpdateUser, deleteUserAndStripeCustomer } from '../services/userService';

const router: Router = Router();


// ========== USER MANAGEMENT ==========

router.post('/create-account', async (req, res) => {
  try {
    const { userId, name, email, address } = req.body;

    let data = { userId, name, email, address};

    const user = await createOrUpdateUser(data);
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error creating users:', error);
    res.status(500).json({ error: 'Failed to create users' });
  }
});





export { router as userRoutes };