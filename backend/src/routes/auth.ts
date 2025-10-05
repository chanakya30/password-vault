import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import UserSettings from '../models/UserSettings';

const router = express.Router();

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, masterPassword } = req.body; // ADDED: masterPassword

    if (!email || !password || !masterPassword) { // UPDATED: Check for masterPassword
      return res.status(400).json({ error: 'Email, password, and master password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Account password must be at least 6 characters' });
    }

    if (masterPassword.length < 8) { // ADDED: Master password validation
      return res.status(400).json({ error: 'Master password must be at least 8 characters' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const hashedMasterPassword = await bcrypt.hash(masterPassword, 12); // ADDED: Hash master password separately

    const user = new User({ 
      email, 
      password: hashedPassword,
      masterPassword: hashedMasterPassword // Store the hashed master password
    });
    await user.save();

    // Create default settings
    await UserSettings.create({ userId: user._id });

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({ token, userId: user._id });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    const settings = await UserSettings.findOne({ userId: user._id });
    if (settings?.twoFactorEnabled) {
      return res.json({ 
        requires2FA: true, 
        userId: user._id 
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user._id });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// NEW ROUTE: Verify master password to unlock vault
router.post('/verify-master-password', async (req: Request, res: Response) => {
  try {
    const { userId, masterPassword } = req.body;

    if (!userId || !masterPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'User ID and master password are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Verify master password matches the one set at signup
    const isMasterPasswordValid = await bcrypt.compare(masterPassword, user.masterPassword);
    
    if (!isMasterPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid master password. Vault cannot be opened.' 
      });
    }

    // Generate a vault access token (short-lived)
    const vaultToken = jwt.sign(
      { 
        userId: user._id, 
        vaultAccess: true 
      },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' } // Short expiration for security
    );

    res.json({ 
      success: true, 
      message: 'Vault unlocked successfully',
      vaultToken 
    });
  } catch (error) {
    console.error('Master password verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error during master password verification' 
    });
  }
});

// NEW ROUTE: Check if vault is unlocked (middleware will use this)
router.post('/check-vault-access', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ 
        vaultUnlocked: false, 
        error: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.vaultAccess) {
      res.json({ 
        vaultUnlocked: true,
        userId: decoded.userId 
      });
    } else {
      res.status(401).json({ 
        vaultUnlocked: false, 
        error: 'Vault access required' 
      });
    }
  } catch (error) {
    console.error('Vault access check error:', error);
    res.status(401).json({ 
      vaultUnlocked: false, 
      error: 'Invalid or expired token' 
    });
  }
});

export default router;