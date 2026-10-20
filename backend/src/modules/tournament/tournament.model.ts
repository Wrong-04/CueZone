import mongoose, { Schema, Document } from "mongoose";

export enum TournamentStatus {
  DRAFT = "draft",
  REGISTRATION_OPEN = "registration_open",
  REGISTRATION_CLOSED = "registration_closed",
  BRACKET_GENERATED = "bracket_generated",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export interface ITournamentPlayer {
  user: mongoose.Types.ObjectId;
  name: string;
  avatar?: string;
  phone?: string;
  seed?: number;
  feePaid: boolean;
  registeredAt: Date;
}

export interface ITournament extends Document {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxPlayers: number; // 8, 16, 32
  registrationFee: number;
  prizePool?: string;
  firstPrize?: string;
  secondPrize?: string;
  thirdPrize?: string;
  status: TournamentStatus;
  rules?: string;
  format: string; // "Single Elimination"
  raceToScore: number;
  assignedTables?: string[];
  createdBy?: mongoose.Types.ObjectId;
  players: ITournamentPlayer[];
  createdAt: Date;
  updatedAt: Date;
}

const TournamentPlayerSchema = new Schema<ITournamentPlayer>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    phone: { type: String },
    seed: { type: Number },
    feePaid: { type: Boolean, default: false },
    registeredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const TournamentSchema = new Schema<ITournament>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    maxPlayers: {
      type: Number,
      required: true,
      enum: [8, 16, 32],
      default: 16,
    },
    registrationFee: { type: Number, required: true, min: 0, default: 0 },
    prizePool: { type: String, trim: true },
    firstPrize: { type: String, trim: true },
    secondPrize: { type: String, trim: true },
    thirdPrize: { type: String, trim: true },
    status: {
      type: String,
      enum: Object.values(TournamentStatus),
      default: TournamentStatus.DRAFT,
      index: true,
    },
    rules: { type: String, trim: true },
    format: { type: String, default: "Single Elimination" },
    raceToScore: { type: Number, default: 5, min: 1 },
    assignedTables: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    players: [TournamentPlayerSchema],
  },
  { timestamps: true }
);

export const Tournament =
  mongoose.models.Tournament ||
  mongoose.model<ITournament>("Tournament", TournamentSchema);
