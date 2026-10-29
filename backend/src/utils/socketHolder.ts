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
  io?.emit("table:status_changed", payload);

  const publicPayload = {
    tableId: payload.tableId,
    status: payload.status,
    table: payload.table
      ? {
          _id: payload.table._id,
          id: String(payload.table._id || payload.tableId),
          code: payload.table.code,
          name: payload.table.name,
          type: payload.table.type,
          area: payload.table.area,
          floor: payload.table.floor,
          pricePerHour: payload.table.pricePerHour,
          status: payload.table.status,
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
      : undefined,
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
