import { Router, Request, Response } from 'express';
import { createOrUpdateUser, deleteUserAndStripeCustomer } from '../services/userService';
import { getUserByUserId } from '../services/userService';

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


router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await getUserByUserId(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});





export { router as userRoutes };