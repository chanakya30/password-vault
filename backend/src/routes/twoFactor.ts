import express, { Request, Response } from 'express';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import UserSettings from '../models/UserSettings';
import jwt from 'jsonwebtoken';

const router = express.Router();
// ... rest of the file remains the same

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

// Generate 2FA secret and QR code
router.post('/setup', async (req: AuthRequest, res: Response) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Password Vault (${req.userId})`
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Save secret temporarily (not enabled yet)
    await UserSettings.findOneAndUpdate(
      { userId: req.userId },
      { twoFactorSecret: secret.base32 },
      { upsert: true, new: true }
    );

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

// Verify and enable 2FA
router.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    const settings = await UserSettings.findOne({ userId: req.userId });
    if (!settings?.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not setup' });
    }

    const verified = speakeasy.totp.verify({
      secret: settings.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      await UserSettings.findOneAndUpdate(
        { userId: req.userId },
        { twoFactorEnabled: true }
      );
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/disable', async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.body;

    const settings = await UserSettings.findOne({ userId: req.userId });
    if (!settings?.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    if (settings.twoFactorSecret) {
      const verified = speakeasy.totp.verify({
        secret: settings.twoFactorSecret,
        encoding: 'base32',
        token: token,
        window: 1
      });

      if (verified) {
        await UserSettings.findOneAndUpdate(
          { userId: req.userId },
          { 
            twoFactorEnabled: false,
            twoFactorSecret: undefined
          }
        );
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid token' });
      }
    }
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

// Verify 2FA token during login
router.post('/verify-login', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, token } = req.body;

    const settings = await UserSettings.findOne({ userId });
    if (!settings?.twoFactorEnabled || !settings.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    const verified = speakeasy.totp.verify({
      secret: settings.twoFactorSecret,
      encoding: 'base32',
      token: token,
      window: 1
    });

    if (verified) {
      const jwtToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET!,
        { expiresIn: '7d' }
      );
      res.json({ token: jwtToken });
    } else {
      res.status(400).json({ error: 'Invalid 2FA token' });
    }
  } catch (error) {
    console.error('2FA login verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA token' });
  }
});

export default router;