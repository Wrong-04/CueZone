import mongoose, { Document, Schema } from "mongoose";

export interface IPricingTier extends Document {
  name: string;
  dayType: "weekday" | "weekend" | "peak";
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  prices: {
    standard: number;
    vip: number;
  };
  isActive: boolean;
  isCurrentlyActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const pricingTierSchema = new Schema<IPricingTier>(
  {
    name: { type: String, required: true, trim: true },
    dayType: { type: String, enum: ["weekday", "weekend", "peak"], required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    prices: {
      standard: { type: Number, required: true, min: 0 },
      vip: { type: Number, required: true, min: 0 },
    },
    isActive: { type: Boolean, default: true },
    isCurrentlyActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const PricingTier = mongoose.model<IPricingTier>("PricingTier", pricingTierSchema);
