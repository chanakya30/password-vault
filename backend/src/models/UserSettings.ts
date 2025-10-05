import mongoose from 'mongoose';

export interface IUserSettings extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  theme: 'light' | 'dark' | 'auto';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSettingsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

export default mongoose.model<IUserSettings>('UserSettings', userSettingsSchema);