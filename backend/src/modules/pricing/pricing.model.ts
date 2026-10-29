import mongoose, { Document, Schema } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

export interface IPricingTier extends Document {
  name: string;
  status?: string | null;
  type?: boolean | null;
  price?: number | null;
  priceType?: string | null;
  note?: string | null;

  dayType: "weekday" | "weekend" | "peak";

  startTime: string;

  endTime: string;

  daysOfWeek: number[];

  prices: {
    standard: number;

    vip: number;

    match?: number;
  };

  isActive: boolean;

  isCurrentlyActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}

const pricingTierSchema = new Schema<IPricingTier>(
  {
    name: { type: String, required: true, trim: true },

    status: { type: String, default: null },
    type: { type: Boolean, default: null },
    price: { type: Number, min: 0, default: null },
    priceType: { type: String, default: null },
    note: { type: String, default: null },

    dayType: { type: String, enum: ["weekday", "weekend", "peak"], required: true },

    startTime: { type: String, required: true },

    endTime: { type: String, required: true },

    daysOfWeek: [{ type: Number, min: 0, max: 6 }],

    prices: {
      standard: { type: Number, required: true, min: 0 },
      vip: { type: Number, required: true, min: 0 },
      match: { type: Number, default: 100000 },
    },

    isActive: { type: Boolean, default: true },

    isCurrentlyActive: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "pricing_types" },
);

applyErdDefaults(pricingTierSchema, "PricingTier");

export const PricingTier = mongoose.model<IPricingTier>("PricingTier", pricingTierSchema);
