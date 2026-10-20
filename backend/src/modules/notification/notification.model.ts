import mongoose, { Document, Schema, Types } from "mongoose";

export enum NotificationType {
  USER = "user",
  TABLE = "table",
  PRICING = "pricing",
  ROLE = "role",
  WALLET = "wallet",
  TOURNAMENT = "tournament",
  SYSTEM = "system",
}

export interface INotification extends Document {
  userId: Types.ObjectId;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(NotificationType), default: NotificationType.SYSTEM },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema);
