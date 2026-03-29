import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username: string;
  password?: string;
  role: 'manager' | 'member' | 'viewer';
  githubId?: string;
  refreshToken?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { 
      type: String, 
      required: true, 
      unique: true,
      lowercase: true,
      trim: true
    },
    username: { 
      type: String, 
      required: true,
      trim: true
    },
    password: { 
      type: String 
    },
    role: { 
      type: String, 
      enum: ['manager', 'member', 'viewer'], 
      default: 'member' 
    },
    githubId: { 
      type: String 
    },
    refreshToken: { 
      type: String 
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);