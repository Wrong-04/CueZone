import mongoose, { Document, Schema } from "mongoose";

export enum TableType {
  STANDARD_9FT = "standard_9ft",
  VIP_BANK_POOL = "vip_bank_pool",
  MATCH_KSTEEL = "match_ksteel",
}

export enum TableStatus {
  AVAILABLE = "available",
  PLAYING = "playing",
  BOOKED = "booked",
  MAINTENANCE = "maintenance",
}

export interface ITable extends Document {
  code: string;
  name: string;
  type: TableType;
  area: string;
  floor: number;
  pricePerHour: number;
  status: TableStatus;
  isActive: boolean;
  pricingTier?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: Object.values(TableType), required: true },
    area: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    pricePerHour: { type: Number, required: true, min: 0 },
    status: { type: String, enum: Object.values(TableStatus), default: TableStatus.AVAILABLE },
    isActive: { type: Boolean, default: true },
    pricingTier: { type: Schema.Types.ObjectId, ref: "PricingTier" },
  },
  { timestamps: true }
);

export const Table = mongoose.model<ITable>("Table", tableSchema);
