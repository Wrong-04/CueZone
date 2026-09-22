import mongoose, { Document, Schema } from "mongoose";

export enum NotificationType {
  USER = "user",
  TABLE = "table",
  PRICING = "pricing",
  ROLE = "role",
  SYSTEM = "system",
}

export interface INotification extends Document {
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.SYSTEM },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
