import type { Server } from "socket.io";

let io: Server | null = null;

export const setIO = (server: Server) => {
  io = server;
};

export const emitNotification = (event: string, payload?: unknown) => {
  io?.emit(event, payload);
};
