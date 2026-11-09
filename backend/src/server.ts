import { App } from "./app";
import { createServer } from "http";
import { Server } from "socket.io";
import { setIO } from "./utils/socketHolder";
import { connectDatabase } from "./config/database";
import { Booking } from "./modules/booking/booking.model";
import { Invoice } from "./modules/invoice/invoice.model";
import { Table } from "./modules/table/table.model";
import { Notification } from "./modules/notification/notification.model";
import { Wallet } from "./modules/wallet/wallet.model";
import { WalletPayment } from "./modules/wallet/wallet-payment.model";
import { Voucher, VoucherUsage } from "./modules/voucher/voucher.model";
import { CustomerOrder } from "./modules/customer-order/customer-order.model";
import { PasswordResetOtp } from "./modules/auth/passwordResetOtp.model";
import { corsOptions } from "./config/cors.config";
import { TournamentPaymentIntent, TournamentPaymentReceipt } from "./modules/tournament/tournament-payment.model";

const PORT = process.env.PORT || 5000;
const appInstance = new App();

export const httpServer = createServer((req, res) => {
  void ready.then(() => appInstance.app(req, res)).catch(() => {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: false, message: "Máy chủ chưa sẵn sàng" }));
  });
});

export const io = new Server(httpServer, {
  cors: corsOptions,
});

setIO(io);

io.on("connection", (socket) => {
  console.log("🔌 New client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔌 Client disconnected:", socket.id);
  });
});

async function initialize() {
  await connectDatabase();
  await Promise.all([TournamentPaymentIntent.init(), TournamentPaymentReceipt.init()]);
  try {
    await Promise.all([
      Booking.init(),
      Invoice.init(),
      Table.init(),
      Notification.init(),
      Wallet.init(),
      WalletPayment.init(),
      Voucher.init(),
      VoucherUsage.init(),
      CustomerOrder.init(),
      PasswordResetOtp.init(),
    ]);
    console.log("✅ Database indexes verified");
  } catch (err: any) {
    console.warn(
      "⚠️ Cảnh báo khởi tạo index (bỏ qua để tiếp tục khởi động server):",
      err?.message || err,
    );
  }
}

const ready = initialize();

if (!process.env.VERCEL) {
  void ready.then(() => {
    httpServer.listen(PORT, () => {
      console.log(`🚀 API Server is running on http://localhost:${PORT}`);
      console.log(`📡 Socket.io is ready`);
    });
  }).catch((err) => {
    console.error("Không thể khởi động API Server:", err);
    process.exit(1);
  });
} else {
  void ready.catch(() => console.error("Không thể khởi tạo API Server"));
}
