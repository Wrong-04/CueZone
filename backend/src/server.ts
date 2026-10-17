import { App } from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { setIO } from "./utils/socketHolder";
import { connectDatabase } from "./config/database";
import { Booking } from "./modules/booking/booking.model";
import { Invoice } from "./modules/invoice/invoice.model";
import { Table } from "./modules/table/table.model";

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
  try {
    await Promise.all([Booking.init(), Invoice.init(), Table.init()]);
    console.log("✅ Database indexes verified");
  } catch (err: any) {
    console.warn("⚠️ Cảnh báo khởi tạo index (bỏ qua để tiếp tục khởi động server):", err?.message || err);
  }

  httpServer.listen(PORT, () => {
    console.log(`🚀 API Server is running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io is ready`);
  });
}

start().catch((err) => {
  console.error("Không thể khởi động API Server:", err);
  process.exit(1);
});
