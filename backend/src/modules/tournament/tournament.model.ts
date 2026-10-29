import mongoose, { Schema, Document } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

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
  _id: mongoose.Types.ObjectId;
  tournamentId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  transactionId?: mongoose.Types.ObjectId;
  registrationStatus: "pending" | "confirmed" | "cancelled";
  result?: {
    _id: mongoose.Types.ObjectId;
    tournamentId?: mongoose.Types.ObjectId;
    registrationId?: mongoose.Types.ObjectId;
    finalRank: number;
    prizeAmount?: number;
  };

  name: string;

  avatar?: string;

  phone?: string;

  seed?: number;

  feePaid: boolean;

  registeredAt: Date;
}

export interface ITournament extends Document {
  name: string;
  gameType?: string;
  minPlayers?: number;
  prizePoolAmount?: number;
  groups: {
    _id: mongoose.Types.ObjectId;
    tournamentId?: mongoose.Types.ObjectId;
    name: string;
    qualifySlots: number;
  }[];
  rounds: {
    _id: mongoose.Types.ObjectId;
    tournamentId?: mongoose.Types.ObjectId;
    roundNo: number;
    name?: string;
    stage: string;
    raceTo: number;
  }[];
  prizes: {
    _id: mongoose.Types.ObjectId;
    tournamentId?: mongoose.Types.ObjectId;
    rank: number;
    reward?: string;
    amount?: number;
  }[];

  description?: string;

  startDate: Date;

  endDate: Date;

  registrationDeadline: Date;

  maxPlayers: number;

  registrationFee: number;

  prizePool?: string;

  firstPrize?: string;

  secondPrize?: string;

  thirdPrize?: string;

  status: TournamentStatus;

  rules?: string;

  format: string;

  raceToScore: number;

  assignedTables?: string[];

  createdBy?: mongoose.Types.ObjectId;

  players: ITournamentPlayer[];

  createdAt: Date;

  updatedAt: Date;
}

const TournamentPlayerSchema = new Schema<ITournamentPlayer>(
  {
    tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
    groupId: { type: Schema.Types.ObjectId },
    transactionId: { type: Schema.Types.ObjectId, ref: "Transaction" },
    registrationStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed",
    },
    result: {
      type: new Schema(
        {
          tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
          registrationId: { type: Schema.Types.ObjectId },
          finalRank: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
          prizeAmount: {
            type: Number,
            min: 0,
            validate: (v: number | null) => v == null || Number.isSafeInteger(v),
          },
        },
        { _id: true },
      ),
      default: undefined,
    },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true },

    name: { type: String, required: true },

    avatar: { type: String },

    phone: { type: String },

    seed: { type: Number },

    feePaid: { type: Boolean, default: false },

    registeredAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const TournamentSchema = new Schema<ITournament>(
  {
    gameType: {
      type: String,
      enum: [
        "eight_ball",
        "nine_ball",
        "ten_ball",
        "bank_pool",
        "carom",
        "three_cushion",
        "snooker",
      ],
    },
    minPlayers: {
      type: Number,
      min: 2,
      validate: (v: number | null) => v == null || Number.isSafeInteger(v),
    },

    prizePoolAmount: {
      type: Number,
      min: 0,
      validate: (v: number | null) => v == null || Number.isSafeInteger(v),
    },
    groups: [
      new Schema({
        tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
        name: { type: String, required: true, trim: true },
        qualifySlots: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
      }),
    ],
    rounds: [
      new Schema({
        tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
        roundNo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
        name: String,
        stage: { type: String, enum: ["group", "knockout"], required: true },
        raceTo: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
      }),
    ],
    prizes: [
      new Schema(
        {
          tournamentId: { type: Schema.Types.ObjectId, ref: "Tournament" },
          rank: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
          reward: String,
          amount: {
            type: Number,
            min: 0,
            validate: (v: number | null) => v == null || Number.isSafeInteger(v),
          },
        },
        { _id: true },
      ),
    ],

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
  { timestamps: true, collection: "tournaments", optimisticConcurrency: true },
);

applyErdDefaults(TournamentSchema, "Tournament");

TournamentSchema.pre("validate", function () {
  for (const entry of [...this.players, ...this.groups, ...this.rounds, ...this.prizes])
    entry.tournamentId = this._id as mongoose.Types.ObjectId;
  for (const player of this.players) {
    if (player.result) {
      player.result.tournamentId = this._id as mongoose.Types.ObjectId;
      player.result.registrationId = player._id;
    }
  }
  const unique = (items: unknown[]) => new Set(items.map(String)).size === items.length;
  if (
    this.players.length > this.maxPlayers ||
    !unique(this.players.map((p) => p.user)) ||
    !unique(this.players.map((p) => p._id))
  ) {
    this.invalidate("players", "Danh sách cơ thủ vượt quy mô hoặc trùng đăng ký");
  }
  if (!unique(this.groups.map((g) => g.name)) || !unique(this.groups.map((g) => g._id)))
    this.invalidate("groups", "Bảng đấu bị trùng");
  if (!unique(this.rounds.map((r) => r.roundNo)) || !unique(this.rounds.map((r) => r._id)))
    this.invalidate("rounds", "Vòng đấu bị trùng");
  if (!unique(this.prizes.map((p) => p.rank)))
    this.invalidate("prizes", "Hạng giải thưởng bị trùng");
  for (const player of this.players) {
    if (player.groupId && !this.groups.some((g) => String(g._id) === String(player.groupId)))
      this.invalidate("players", "Bảng đấu không thuộc giải");
  }
  if (this.minPlayers && this.minPlayers > this.maxPlayers)
    this.invalidate("minPlayers", "Số cơ thủ tối thiểu vượt quy mô");
  if (this.endDate < this.startDate || this.registrationDeadline > this.startDate)
    this.invalidate("startDate", "Lịch giải đấu không hợp lệ");
});
TournamentSchema.index({ status: 1, startDate: 1 });
TournamentSchema.index({ "players.user": 1, startDate: -1 });

export const Tournament =
  mongoose.models.Tournament || mongoose.model<ITournament>("Tournament", TournamentSchema);
