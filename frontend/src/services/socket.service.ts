import { io, Socket } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:5000";

let socketInstance: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("📡 [Socket.io] Connected to server:", socketInstance?.id);
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("🔌 [Socket.io] Disconnected from server:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.warn("⚠️ [Socket.io] Connection warning:", error.message);
    });
  }

  return socketInstance;
};
