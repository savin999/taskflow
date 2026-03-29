import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  taskId: string;
  taskTitle: string;
  action: 'created' | 'updated' | 'deleted';
  performedBy: string;
  performedByUsername: string;
  details?: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    taskId: { type: String, required: true },
    taskTitle: { type: String, required: true },
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted'],
      required: true,
    },
    performedBy: { type: String, required: true },
    performedByUsername: { type: String, required: true },
    details: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IActivity>('Activity', ActivitySchema);