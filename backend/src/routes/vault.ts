import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import VaultItem from '../models/VaultItem';

const router = express.Router();

interface AuthRequest extends Request {
  userId?: string;
}

// Regular authentication middleware (for login)
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

// NEW: Vault access verification middleware (for master password)
const verifyVaultAccess = (req: AuthRequest, res: Response, next: any) => {
  const vaultToken = req.headers['x-vault-token'] as string;
  
  if (!vaultToken) {
    return res.status(401).json({ 
      error: 'Vault access denied. Please unlock the vault with your master password.' 
    });
  }

  try {
    const decoded = jwt.verify(vaultToken, process.env.JWT_SECRET!) as any;
    
    // Check if this is a vault access token and not a regular auth token
    if (!decoded.vaultAccess) {
      return res.status(401).json({ 
        error: 'Invalid vault access token. Please unlock the vault again.' 
      });
    }
    
    // Verify the user ID matches
    if (decoded.userId !== req.userId) {
      return res.status(403).json({ 
        error: 'Vault access token user mismatch' 
      });
    }
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        error: 'Vault session expired. Please unlock the vault again.' 
      });
    }
    return res.status(401).json({ 
      error: 'Invalid vault access token' 
    });
  }
};

// Apply both middlewares to all vault routes
// First authenticate (regular login), then verify vault access (master password)
router.use(authenticate);
router.use(verifyVaultAccess);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const items = await VaultItem.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch vault items:', error);
    res.status(500).json({ error: 'Failed to fetch vault items' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { ciphertext, nonce, meta } = req.body;

    if (!ciphertext || !nonce || !meta?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = new VaultItem({
      userId: req.userId,
      ciphertext,
      nonce,
      meta
    });

    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error('Failed to create vault item:', error);
    res.status(500).json({ error: 'Failed to create vault item' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { ciphertext, nonce, meta } = req.body;

    if (!ciphertext || !nonce || !meta?.name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const item = await VaultItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { ciphertext, nonce, meta },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Failed to update vault item:', error);
    res.status(500).json({ error: 'Failed to update vault item' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const item = await VaultItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId
    });

    if (!item) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    res.json({ message: 'Vault item deleted' });
  } catch (error) {
    console.error('Failed to delete vault item:', error);
    res.status(500).json({ error: 'Failed to delete vault item' });
  }
});

export default router;