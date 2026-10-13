import { App } from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { setIO } from "./utils/socketHolder";
import { connectDatabase } from "./config/database";
import { Booking } from "./modules/booking/booking.model";
import { Invoice } from "./modules/invoice/invoice.model";

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

async function start() {
  await connectDatabase();
  await Promise.all([Booking.init(), Invoice.init()]);
  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io is ready`);
  });
}

start().catch(() => {
  console.error("Không thể khởi động API hoặc tạo chỉ mục database");
  process.exit(1);
});
