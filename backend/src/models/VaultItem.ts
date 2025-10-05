import mongoose from 'mongoose';

export interface IVaultItem extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  ciphertext: string;
  nonce: string;
  meta: {
    name: string;
    website?: string;
    username?: string;
    note?: string;
    tags?: string[];
    folder?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const vaultItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ciphertext: {
    type: String,
    required: true
  },
  nonce: {
    type: String,
    required: true
  },
  meta: {
    name: {
      type: String,
      required: true
    },
    website: String,
    username: String,
    note: String,
    tags: [String],
    folder: {
      type: String,
      default: 'General'
    }
  }
}, {
  timestamps: true
});

vaultItemSchema.index({ userId: 1, 'meta.name': 1 });
vaultItemSchema.index({ userId: 1, 'meta.tags': 1 });
vaultItemSchema.index({ userId: 1, 'meta.folder': 1 });

export default mongoose.model<IVaultItem>('VaultItem', vaultItemSchema);