import mongoose, { Schema, HydratedDocument } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

const integer = {
  type: Number,
  min: 0,
  validate: (value: number | null) => value == null || Number.isSafeInteger(value),
};

export interface IMatchParticipant {
  _id?: mongoose.Types.ObjectId;
  matchId?: mongoose.Types.ObjectId;
  registrationId: mongoose.Types.ObjectId;
  slot: 1 | 2;
  score: number;
  isWinner: boolean | null;
}

export type MatchStatus = "scheduled" | "in_progress" | "completed" | "walkover" | "bye" | "cancelled";

export interface IMatch {
  _id: mongoose.Types.ObjectId;
  tournament: mongoose.Types.ObjectId;
  roundId: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  round: number;
  matchNumber: number;
  code?: string;
  table?: mongoose.Types.ObjectId;
  referee?: mongoose.Types.ObjectId;
  winnerRegistrationId?: mongoose.Types.ObjectId;
  nextMatchId?: mongoose.Types.ObjectId;
  nextMatchSlot?: 1 | 2;
  participants: IMatchParticipant[];
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  status: MatchStatus;
  eloApplied: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  note?: string;
  player1?: mongoose.Types.ObjectId;
  player2?: mongoose.Types.ObjectId;
  score1?: number;
  score2?: number;
  winner?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type MatchDocument = HydratedDocument<IMatch>;

const participantSchema = new Schema(
  {
    matchId: { type: Schema.Types.ObjectId, ref: "Match" },
    isWinner: { type: Boolean, default: null },

    registrationId: { type: Schema.Types.ObjectId, required: true },
    slot: { type: Number, enum: [1, 2], required: true },
    score: { ...integer, default: 0 },
  },
  { _id: true },
);

const matchSchema = new Schema(
  {
    tournament: { type: Schema.Types.ObjectId, ref: "Tournament", required: true },
    roundId: { type: Schema.Types.ObjectId, required: true },
    groupId: Schema.Types.ObjectId,
    round: { ...integer, min: 1, required: true },
    matchNumber: { ...integer, min: 1, required: true },
    code: { type: String, trim: true },
    table: { type: Schema.Types.ObjectId, ref: "Table" },
    referee: { type: Schema.Types.ObjectId, ref: "User" },
    winnerRegistrationId: Schema.Types.ObjectId,
    nextMatchId: { type: Schema.Types.ObjectId, ref: "Match" },
    nextMatchSlot: { type: Number, enum: [1, 2] },
    participants: {
      type: [participantSchema],
      default: [],
      validate: {
        validator: (items: { slot: number; registrationId: mongoose.Types.ObjectId }[]) =>
          items.length <= 2 &&
          new Set(items.map((p) => p.slot)).size === items.length &&
          new Set(items.map((p) => String(p.registrationId))).size === items.length,
        message: "Mỗi trận có tối đa hai cơ thủ và không trùng vị trí/đăng ký",
      },
    },
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "walkover", "bye", "cancelled"],
      default: "scheduled",
    },
    eloApplied: { type: Boolean, default: false },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,

    player1: { type: Schema.Types.ObjectId, ref: "User" },
    player2: { type: Schema.Types.ObjectId, ref: "User" },
    score1: integer,
    score2: integer,
    winner: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, collection: "matches" },
);

applyErdDefaults(matchSchema, "Match");

matchSchema.pre("validate", function () {
  for (const participant of this.participants) {
    participant.matchId = this._id;
    participant.isWinner = this.winnerRegistrationId
      ? String(participant.registrationId) === String(this.winnerRegistrationId)
      : null;
  }
  if (
    this.winnerRegistrationId &&
    !this.participants.some((p) => String(p.registrationId) === String(this.winnerRegistrationId))
  ) {
    this.invalidate("winnerRegistrationId", "Người thắng phải tham gia trận đấu");
  }
  if (
    Boolean(this.nextMatchId) !== Boolean(this.nextMatchSlot) ||
    String(this.nextMatchId) === String(this._id)
  ) {
    this.invalidate(
      "nextMatchId",
      "Nhánh tiếp theo phải có vị trí và không được trỏ về chính trận này",
    );
  }
});
matchSchema.index({ tournament: 1, round: 1, matchNumber: 1 }, { unique: true });
matchSchema.index({ tournament: 1, roundId: 1 });
matchSchema.index({ table: 1, scheduledAt: 1 });
matchSchema.index({ referee: 1, status: 1, scheduledAt: 1 });
matchSchema.index(
  { nextMatchId: 1, nextMatchSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      nextMatchId: { $type: "objectId" },
      nextMatchSlot: { $type: "number" },
    },
  },
);

const frameSchema = new Schema(
  {
    match: { type: Schema.Types.ObjectId, ref: "Match", required: true },
    frameNo: { ...integer, min: 1, required: true },
    winnerRegistrationId: Schema.Types.ObjectId,
    highestBreak: integer,
    durationSec: integer,
  },
  { timestamps: true, collection: "match_frames" },
);
frameSchema.index({ match: 1, frameNo: 1 }, { unique: true });
applyErdDefaults(frameSchema, "MatchFrame");

export const Match = mongoose.model("Match", matchSchema);
export const MatchFrame = mongoose.model("MatchFrame", frameSchema);
