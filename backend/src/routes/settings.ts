import express, { Request, Response } from 'express';
import UserSettings from '../models/UserSettings';
import jwt from 'jsonwebtoken';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

const authenticate = (req: AuthRequest, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

router.use(authenticate);

// Get user settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await UserSettings.findOne({ userId: req.userId });
    res.json(settings || { theme: 'auto', twoFactorEnabled: false });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update theme
router.put('/theme', async (req: AuthRequest, res: Response) => {
  try {
    const { theme } = req.body;
    
    if (!['light', 'dark', 'auto'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    const settings = await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      { theme },
      { upsert: true, new: true }
    );

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update theme' });
  }
});

export default router;