import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (server: Server) => {
  io = server;
};

export const getIO = (): Server | null => {
  return io;
};

export const emitNotification = (event: string, payload?: unknown) => {
  io?.emit(event, payload);
};

export const emitTableStatusChanged = (payload: {
  tableId?: string;
  status?: string;
  table?: any;
}) => {
  const resolvedTableId =
    payload.tableId ||
    (payload.table ? String(payload.table._id || payload.table.id) : undefined);

  io?.emit("table:status_changed", { ...payload, tableId: resolvedTableId });
  io?.emit("table:status-changed", { ...payload, tableId: resolvedTableId });

  const tableData = payload.table
    ? {
        _id: payload.table._id,
        id: String(payload.table._id || resolvedTableId),
        code: payload.table.code,
        name: payload.table.name,
        type: payload.table.type,
        area: payload.table.area,
        floor: payload.table.floor,
        pricePerHour: payload.table.pricePerHour,
        status: payload.table.status || payload.status,
        sessionStart:
          payload.table.currentSession?.sessionStart ||
          (payload.table.currentSession?.startedAt
            ? new Date(payload.table.currentSession.startedAt).toLocaleTimeString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                hour: "2-digit",
                minute: "2-digit",
              })
            : undefined),
        isPaused: Boolean(
          payload.table.currentSession?.isPaused || payload.table.status === "paused",
        ),
        bookedTime: payload.table.bookedInfo?.time,
      }
    : resolvedTableId
      ? {
          _id: resolvedTableId,
          id: String(resolvedTableId),
          status: payload.status,
        }
      : undefined;

  const publicPayload = {
    tableId: resolvedTableId,
    status: payload.status,
    table: tableData,
  };
  io?.emit("table:public_status_changed", publicPayload);
  io?.emit("table:guest_status_changed", publicPayload);
};

export const emitTableTimerStarted = (payload: {
  tableId?: string;
  sessionId?: string;
  table?: any;
}) => {
  io?.emit("table:timer_started", payload);
};

export const emitTournamentPaymentUpdated = (payload: {
  tournamentId: string;
  userId?: string;
  status?: string;
  reference?: string;
}) => {
  io?.emit("tournament:payment_updated", payload);
  if (payload.tournamentId) {
    io?.emit(`tournament:${payload.tournamentId}:payment`, payload);
  }
};

export const emitCustomerOrderNew = (order: any) => {
  io?.emit("customer-order:new", order);
};

export const emitCustomerOrderStatusChanged = (order: any) => {
  io?.emit("customer-order:status_changed", order);
};

export const emitWaitlistUpdated = (entry?: any) => {
  io?.emit("waitlist:updated", entry);
};

export const emitMenuUpdated = () => {
  io?.emit("menu:updated");
  io?.emit("fnb:updated");
};

export const emitTournamentScoreUpdated = (payload: {
  tournamentId: string;
  matchId: string;
  score1?: number;
  score2?: number;
  status?: string;
  winnerRegistrationId?: string;
}) => {
  io?.emit("tournament:score_updated", payload);
  io?.emit(`tournament:${payload.tournamentId}:score`, payload);
};

export const emitTournamentMatchCompleted = (payload: {
  tournamentId: string;
  matchId: string;
  status?: string;
  winnerRegistrationId?: string;
  nextMatchId?: string;
  nextMatchSlot?: number;
  winnerUser?: {
    _id: string;
    name: string;
    avatar?: string;
    phone?: string;
    seed?: number;
  };
}) => {
  io?.emit("tournament:match_completed", payload);
  io?.emit(`tournament:${payload.tournamentId}:completed`, payload);
};

export const emitTournamentLeaderboardUpdated = (payload: { tournamentId: string }) => {
  io?.emit("tournament:leaderboard_updated", payload);
};

export const emitTournamentBracketUpdated = (payload: {
  tournamentId: string;
  bracketSize?: number;
  totalMatches?: number;
}) => {
  io?.emit("tournament:bracket_updated", payload);
  io?.emit(`tournament:${payload.tournamentId}:bracket`, payload);
};
