import mongoose, { Schema } from "mongoose";
import { applyErdDefaults } from "../../config/erd-fields";

const integer = {
  type: Number,
  min: 0,
  validate: (value: number | null) => value == null || Number.isSafeInteger(value),
};
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
