import mongoose, { Document, Schema } from "mongoose";

export enum WaitlistStatus {
  WAITING = "waiting",
  SEATED = "seated",
  CANCELLED = "cancelled",
}

export interface IWaitlist extends Document {
  customerName: string;
  phone: string;
  guests: number;
  preferredType: string;
  status: WaitlistStatus;
  note?: string;
  joinedTime: string;
  assignedTableId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
  {
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    guests: { type: Number, default: 2, min: 1 },
    preferredType: { type: String, default: "Bàn Bida Lỗ (Pool)", trim: true },
    status: {
      type: String,
      enum: Object.values(WaitlistStatus),
      default: WaitlistStatus.WAITING,
      index: true,
    },
    note: { type: String, trim: true, default: "" },
    joinedTime: { type: String, default: "" },
    assignedTableId: { type: Schema.Types.ObjectId, ref: "Table" },
  },
  { timestamps: true }
);

export const Waitlist = mongoose.model<IWaitlist>("Waitlist", waitlistSchema);
