import { App } from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { setIO } from "./utils/socketHolder";

const PORT = process.env.PORT || 5000;
const appInstance = new App();

// Tạo HTTP Server từ Express App
const httpServer = createServer(appInstance.app);

// Khởi tạo Socket.io Server (Dùng cho Sơ đồ bàn Realtime)
export const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

setIO(io);

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 API Server is running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io is ready`);
});
