import mongoose, { Document, Schema } from "mongoose";

export enum TableType {
  POOL = "pool",
  CAROM = "carom",
  SNOOKER = "snooker",
}

export const LEGACY_TABLE_TYPE_MAP: Record<string, TableType> = {
  standard_9ft: TableType.POOL,
  standard: TableType.POOL,
  nine_ball: TableType.POOL,
  full_ball: TableType.POOL,
  vip_bank_pool: TableType.CAROM,
  vip: TableType.CAROM,
  libre: TableType.CAROM,
  three_cushion: TableType.CAROM,
  match_ksteel: TableType.SNOOKER,
  match: TableType.SNOOKER,
};

export enum TableStatus {
  AVAILABLE = "available",
  PLAYING = "playing",
  PAUSED = "paused",
  BOOKED = "booked",
  MAINTENANCE = "maintenance",
}

export interface TableSession {
  sessionId: string;

  sessionStart: string;

  startedAt: number;

  pricePerHour: number;

  isPaused: boolean;

  pausedAt?: number;

  totalPausedMs: number;

  carriedCost: number;

  customerName: string;

  customerPhone?: string;

  isMember: boolean;

  orders: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
    orderTime: string;
    status: string;
  }[];

  note?: string;

  deposit: number;
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

  currentSession?: TableSession;

  bookedInfo?: {
    customerName: string;
    phone: string;
    time: string;
    bookingId: string;
  };

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

    pricingTier: { type: Schema.Types.ObjectId, ref: "PricingTier", default: null },

    currentSession: {
      type: new Schema<TableSession>(
        {
          sessionId: { type: String, required: true },

          sessionStart: String,

          startedAt: { type: Number, required: true },

          pricePerHour: { type: Number, required: true, min: 0 },

          isPaused: { type: Boolean, default: false },

          pausedAt: Number,

          totalPausedMs: { type: Number, default: 0 },

          carriedCost: { type: Number, default: 0 },

          customerName: { type: String, required: true },

          customerPhone: String,

          isMember: { type: Boolean, default: false },

          orders: {
            type: [
              new Schema(
                {
                  id: String,
                  name: String,
                  price: Number,
                  quantity: Number,
                  category: String,
                  orderTime: String,
                  status: String,
                },
                { _id: false },
              ),
            ],
            default: [],
          },

          note: String,

          deposit: { type: Number, default: 0, min: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },

    bookedInfo: {
      type: new Schema(
        { customerName: String, phone: String, time: String, bookingId: String },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { timestamps: true, collection: "pool_tables" },
);

tableSchema.pre("validate", function (next) {
  if (this.type && LEGACY_TABLE_TYPE_MAP[this.type]) {
    this.type = LEGACY_TABLE_TYPE_MAP[this.type];
  }
  next();
});

tableSchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate() as any;
  if (update) {
    if (update.type && LEGACY_TABLE_TYPE_MAP[update.type]) {
      update.type = LEGACY_TABLE_TYPE_MAP[update.type];
    }
    if (update.$set?.type && LEGACY_TABLE_TYPE_MAP[update.$set.type]) {
      update.$set.type = LEGACY_TABLE_TYPE_MAP[update.$set.type];
    }
  }
  next();
});

export const Table = mongoose.model<ITable>("Table", tableSchema);
