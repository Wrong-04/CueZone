import type { BracketMatch } from "../../../services/tournament.service";

export interface MatchEntry {
  match: BracketMatch;
  roundName: string;
  raceTo: number;
}

export interface FaultEntry {
  id: number;
  type: FaultType;
  playerName: string;
  at: string;
}

export type Slot = 1 | 2;

export const SHOT_CLOCK_SECONDS = 48;
export const EXTRA_TIME_SECONDS = 30;
export const FAULT_TYPES = ["Quá giờ", "Chạm bi", "Sai thứ tự"] as const;
export type FaultType = (typeof FAULT_TYPES)[number];
export const ACTIVE_STATUSES = ["bracket_generated", "in_progress"];

export const formatClock = (seconds: number): string => {
  const safe = Math.max(0, seconds);

  return `00:${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
};

export const getPlayerName = (match: BracketMatch | undefined, slot: Slot): string =>
  match?.participants.find((p) => p.slot === slot)?.user?.name || `Cơ thủ ${slot}`;
