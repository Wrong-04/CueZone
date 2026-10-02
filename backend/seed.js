/**
 * CUEZONE BILLIARDS — DATABASE SEED MASTER SCRIPT (v4.3 COMPLETE)
 * Đồng bộ toàn diện 100% theo SRS v4.1 & Stitch Design Patterns (deginPatten.txt)
 * Chứa đầy đủ Master Data + Operational Transactional Data cho tất cả 22 Mongoose Models.
 *
 * Chạy lệnh: npm run seed (hoặc: node seed.js) từ thư mục backend/
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db";

// ==============================================================================
// 1. SCHEMAS ĐỒNG BỘ CHUẨN XÁC VỚI TS MODELS TRONG BACKEND & SRS v4.1
// ==============================================================================

// 1.1 RBAC Permissions & Role Schema (module: role)
const PermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    actions: [{ type: String }],
  },
  { _id: false },
);

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    displayName: { type: String, required: true },
    description: { type: String },
    permissions: [PermissionSchema],
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 1.2 Pricing Tier Schema (module: pricing)
const PricingTierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dayType: {
      type: String,
      enum: ["weekday", "weekend", "peak"],
      required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    prices: {
      standard: { type: Number, required: true, min: 0 },
      vip: { type: Number, required: true, min: 0 },
    },
    isActive: { type: Boolean, default: true },
    isCurrentlyActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 1.3 User Schema (module: user)
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["admin", "staff", "customer"],
      default: "customer",
    },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    branch: { type: String },
    position: { type: String },
    points: { type: Number, default: 0 },
    wallet: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// 1.4 Billiard Table Schema (module: table)
const TableSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["standard_9ft", "vip_bank_pool", "match_ksteel"],
      required: true,
    },
    area: { type: String, required: true, trim: true },
    floor: { type: Number, default: 1 },
    pricePerHour: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["available", "playing", "paused", "booked", "maintenance"],
      default: "available",
    },
    isActive: { type: Boolean, default: true },
    pricingTier: { type: mongoose.Schema.Types.ObjectId, ref: "PricingTier" },
  },
  { timestamps: true },
);

// 1.5 Notification Schema (module: notification)
const NotificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["user", "table", "pricing", "role", "system"],
      default: "system",
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// 1.6 Inventory Product Schema (module: inventory / product)
const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    unit: { type: String, required: true },
    costPrice: { type: Number, default: 0 },
    salePrice: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 10 },
    imageUrl: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 1.7 Supplier Schema (module: supplier)
const SupplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    contactPerson: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);

// 1.8 F&B MenuItem Schema (module: fnb)
const MenuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String },
    description: { type: String },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 1.9 Tournament Schema (module: tournament)
const TournamentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    registrationDeadline: { type: Date },
    maxPlayers: { type: Number, default: 16 },
    registrationFee: { type: Number, default: 0 },
    prizePool: { type: String },
    status: {
      type: String,
      enum: [
        "draft",
        "registration_open",
        "registration_closed",
        "bracket_generated",
        "in_progress",
        "final",
        "completed",
      ],
      default: "draft",
    },
    rules: { type: String },
    format: { type: String, default: "Single Elimination" },
    raceToScore: { type: Number, default: 5 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

// 1.10 Tournament Player Schema (module: tournament)
const TournamentPlayerSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    registrationStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "confirmed",
    },
    seed: { type: Number },
    feePaid: { type: Boolean, default: true },
    registeredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// 1.11 Match Schema (module: match)
const MatchSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    round: { type: Number, required: true },
    matchNumber: { type: Number, required: true },
    player1: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    score1: { type: Number },
    score2: { type: Number },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    nextMatchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match" },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    scheduledAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "in_progress", "completed", "walkover", "bye"],
      default: "scheduled",
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: { type: String },
  },
  { timestamps: true },
);

// 1.12 News Schema (module: news)
const NewsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String },
    category: { type: String, default: "news" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 1.13 Voucher Schema (module: voucher)
const VoucherSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    discountType: { type: String, enum: ["percent", "fixed"], required: true },
    discountValue: { type: Number, required: true },
    minOrderAmount: { type: Number, default: 0 },
    maxUses: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    expiredAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// 1.14 Booking Schema (module: booking)
const BookingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    tableType: { type: String },
    bookingDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    numberOfGuests: { type: Number, default: 2 },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "checked_in",
        "completed",
        "rejected",
        "cancelled",
        "expired",
      ],
      default: "pending",
    },
    note: { type: String },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectionReason: { type: String },
    checkedInAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

// 1.15 TableSession Schema (module: session)
const SessionPauseSchema = new mongoose.Schema(
  {
    pauseStart: { type: Date, required: true },
    pauseEnd: { type: Date },
    duration: { type: Number },
  },
  { _id: false },
);

const TableSessionSchema = new mongoose.Schema(
  {
    table: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Table",
      required: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    openedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "transferred"],
      default: "active",
    },
    pauses: [SessionPauseSchema],
    totalPausedMinutes: { type: Number, default: 0 },
    actualPlayingMinutes: { type: Number },
    pricingSnapshot: {
      pricePerHour: { type: Number },
      tierName: { type: String },
    },
    notes: { type: String },
  },
  { timestamps: true },
);

// 1.16 Invoice Schema (module: invoice)
const InvoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    type: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    reference: { type: mongoose.Schema.Types.ObjectId },
  },
  { _id: false },
);

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "TableSession" },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [InvoiceItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: [
        "open",
        "pending_payment",
        "paid",
        "void",
        "refunded",
        "partially_refunded",
      ],
      default: "open",
    },
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    voucherDiscount: { type: Number },
    pricingSnapshot: {
      pricePerHour: { type: Number },
      tierName: { type: String },
      playingMinutes: { type: Number },
    },
    paidAt: { type: Date },
    voidedAt: { type: Date },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    voidReason: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);

// 1.17 Payment Schema (module: payment)
const PaymentSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    method: {
      type: String,
      enum: ["cash", "wallet", "bank_transfer", "mixed"],
      required: true,
    },
    amount: { type: Number, required: true },
    walletAmount: { type: Number },
    cashAmount: { type: Number },
    transferAmount: { type: Number },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "completed",
    },
    idempotencyKey: { type: String },
    transactionRef: { type: String },
    note: { type: String },
  },
  { timestamps: true },
);

// 1.18 Review Schema (module: review)
const ReviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "TableSession" },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true },
);

// 1.19 WalletTransaction Schema (module: wallet)
const WalletTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["top_up", "payment", "refund", "adjustment", "bonus"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    reference: { type: String },
    referenceType: { type: String },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    idempotencyKey: { type: String },
  },
  { timestamps: true },
);

// 1.20 InventoryTransaction Schema (module: inventory)
const InventoryTransactionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    type: {
      type: String,
      enum: ["in", "out", "waste", "adjustment_in", "adjustment_out"],
      required: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String },
    reference: { type: String },
    referenceType: { type: String },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true },
);

// 1.21 ImportReceipt Schema (module: inventory)
const ImportReceiptItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
  },
  { _id: false },
);

const ImportReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, required: true },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    items: [ImportReceiptItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "completed", "cancelled"],
      default: "completed",
    },
    note: { type: String },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: { type: Date },
  },
  { timestamps: true },
);

// 1.22 AuditLog Schema (module: audit)
const AuditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    result: { type: String, enum: ["success", "failed"], required: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

// ==============================================================================
// 1.23. Integrity indexes (phòng duplicate/idempotency ở tầng DB)
// Lưu ý: index không thay thế business-service transaction/concurrency check.
// ==============================================================================
RoleSchema.index({ name: 1 }, { unique: true });
UserSchema.index({ email: 1 }, { unique: true });
TableSchema.index({ code: 1 }, { unique: true });
TournamentPlayerSchema.index({ tournament: 1, player: 1 }, { unique: true });
PaymentSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
WalletTransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, sparse: true },
);
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true });
ImportReceiptSchema.index({ receiptNumber: 1 }, { unique: true });
MatchSchema.index(
  { tournament: 1, round: 1, matchNumber: 1 },
  { unique: true },
);

// Mongoose Models
const Role = mongoose.models.Role || mongoose.model("Role", RoleSchema);
const PricingTier =
  mongoose.models.PricingTier ||
  mongoose.model("PricingTier", PricingTierSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);
const Table = mongoose.models.Table || mongoose.model("Table", TableSchema);
const Notification =
  mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);
const Supplier =
  mongoose.models.Supplier || mongoose.model("Supplier", SupplierSchema);
const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema);
const Tournament =
  mongoose.models.Tournament || mongoose.model("Tournament", TournamentSchema);
const TournamentPlayer =
  mongoose.models.TournamentPlayer ||
  mongoose.model("TournamentPlayer", TournamentPlayerSchema);
const Match = mongoose.models.Match || mongoose.model("Match", MatchSchema);
const News = mongoose.models.News || mongoose.model("News", NewsSchema);
const Voucher =
  mongoose.models.Voucher || mongoose.model("Voucher", VoucherSchema);
const Booking =
  mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
const TableSession =
  mongoose.models.TableSession ||
  mongoose.model("TableSession", TableSessionSchema);
const Invoice =
  mongoose.models.Invoice || mongoose.model("Invoice", InvoiceSchema);
const Payment =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
const Review = mongoose.models.Review || mongoose.model("Review", ReviewSchema);
const WalletTransaction =
  mongoose.models.WalletTransaction ||
  mongoose.model("WalletTransaction", WalletTransactionSchema);
const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model("InventoryTransaction", InventoryTransactionSchema);
const ImportReceipt =
  mongoose.models.ImportReceipt ||
  mongoose.model("ImportReceipt", ImportReceiptSchema);
const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

// ==============================================================================
// 2. SEED DATA DEFINITIONS
// ==============================================================================

// 2.1. Phân quyền RBAC (SRS v4.1 Mục VI)
const rolesData = [
  {
    name: "admin",
    displayName: "Quản trị viên & Kho",
    description:
      "Toàn quyền quản trị hệ thống, kho, bàn, tài khoản, cấu hình giá và giải đấu",
    permissions: [
      { module: "users", actions: ["create", "read", "update", "delete"] },
      { module: "roles", actions: ["create", "read", "update", "delete"] },
      { module: "tables", actions: ["create", "read", "update", "delete"] },
      { module: "pricing", actions: ["create", "read", "update", "delete"] },
      {
        module: "bookings",
        actions: ["create", "read", "update", "delete", "approve", "reject"],
      },
      {
        module: "fnb",
        actions: ["create", "read", "update", "delete", "order"],
      },
      {
        module: "inventory",
        actions: [
          "create",
          "read",
          "update",
          "delete",
          "import",
          "export",
          "stocktake",
          "adjust",
        ],
      },
      { module: "suppliers", actions: ["create", "read", "update", "delete"] },
      { module: "wallet", actions: ["create", "read", "update", "topup"] },
      {
        module: "tournaments",
        actions: ["create", "read", "update", "delete", "bracket", "score"],
      },
      { module: "news", actions: ["create", "read", "update", "delete"] },
      { module: "vouchers", actions: ["create", "read", "update", "delete"] },
      { module: "reports", actions: ["read", "export"] },
      { module: "audit", actions: ["read"] },
      { module: "notifications", actions: ["create", "read", "delete"] },
    ],
    isDefault: false,
  },
  {
    name: "staff",
    displayName: "Nhân viên phục vụ / Thu ngân POS",
    description:
      "Thao tác quầy POS: mở/dừng bàn, bấm giờ, order F&B, duyệt đơn online, thanh toán, in hóa đơn, cập nhật tỉ số",
    permissions: [
      {
        module: "tables",
        actions: [
          "read",
          "update",
          "open",
          "pause",
          "resume",
          "transfer",
          "checkout",
        ],
      },
      { module: "bookings", actions: ["read", "approve", "reject"] },
      { module: "fnb", actions: ["read", "order", "approve", "cancel"] },
      { module: "wallet", actions: ["read", "topup", "pay"] },
      { module: "vouchers", actions: ["read", "apply"] },
      { module: "tournaments", actions: ["read", "score"] },
      { module: "reports", actions: ["read_pos"] },
    ],
    isDefault: false,
  },
  {
    name: "customer",
    displayName: "Khách hàng / Hội viên",
    description:
      "Xem sơ đồ bàn trực tuyến, đặt bàn trước, gọi món tại bàn, ví trả trước, đăng ký giải đấu",
    permissions: [
      { module: "tables", actions: ["read_available"] },
      { module: "bookings", actions: ["create", "read_own", "cancel_own"] },
      { module: "fnb", actions: ["read", "order_own"] },
      { module: "wallet", actions: ["read_own", "pay_own"] },
      { module: "tournaments", actions: ["read", "register"] },
      { module: "news", actions: ["read"] },
      { module: "reviews", actions: ["create", "read"] },
    ],
    isDefault: true,
  },
];

// 2.2. Bảng giá theo khung giờ (SRS v4.1 UC44 & TablesManagementPage)
const pricingTiersData = [
  {
    name: "Khung Giờ Tiêu Chuẩn (Ban Ngày T2–T6)",
    dayType: "weekday",
    startTime: "08:00",
    endTime: "17:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: { standard: 60000, vip: 120000 },
    isActive: true,
    isCurrentlyActive: true,
  },
  {
    name: "Khung Giờ Cao Điểm / Tối (T2–T6)",
    dayType: "peak",
    startTime: "17:00",
    endTime: "24:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: { standard: 80000, vip: 140000 },
    isActive: true,
    isCurrentlyActive: false,
  },
  {
    name: "Khung Giờ Cuối Tuần (T7 & CN)",
    dayType: "weekend",
    startTime: "08:00",
    endTime: "24:00",
    daysOfWeek: [0, 6],
    prices: { standard: 80000, vip: 150000 },
    isActive: true,
    isCurrentlyActive: false,
  },
];

// 2.3. Tài khoản người dùng (Mật khẩu test chuẩn: Cuezone@2026)
const defaultHashedPassword = bcrypt.hashSync("Cuezone@2026", 10);

const usersData = [
  {
    name: "Nguyễn Quang Huy",
    email: "admin@cuezone.com",
    password: defaultHashedPassword,
    role: "admin",
    phone: "0901234567",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    branch: "CueZone Club - Cơ sở 1",
    position: "Chủ CLB & Quản trị hệ thống",
    isActive: true,
    isLocked: false,
    points: 0,
    wallet: 0,
  },
  {
    name: "Nguyễn Văn Hùng",
    email: "staff1@cuezone.com",
    password: defaultHashedPassword,
    role: "staff",
    phone: "0902345678",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    branch: "CueZone Club - Cơ sở 1",
    position: "Thu ngân ca sáng",
    isActive: true,
    isLocked: false,
    points: 0,
    wallet: 0,
  },
  {
    name: "Trần Thị Mai",
    email: "staff2@cuezone.com",
    password: defaultHashedPassword,
    role: "staff",
    phone: "0903456789",
    avatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    branch: "CueZone Club - Cơ sở 1",
    position: "Nhân viên phục vụ / Thu ngân ca tối",
    isActive: true,
    isLocked: false,
    points: 0,
    wallet: 0,
  },
  {
    name: "Trần Quốc Đạt",
    email: "customer1@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0988123456",
    avatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150",
    isActive: true,
    isLocked: false,
    points: 3400,
    wallet: 1310000,
  },
  {
    name: "Hoàng Nam",
    email: "customer2@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0906789012",
    avatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150",
    isActive: true,
    isLocked: false,
    points: 2150,
    wallet: 850000,
  },
  {
    name: "Lê Minh Quân",
    email: "customer3@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0907890123",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
    isActive: true,
    isLocked: false,
    points: 850,
    wallet: 350000,
  },
  {
    name: "Trần Tuấn Hưng",
    email: "customer4@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0908901234",
    avatar:
      "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
    isActive: true,
    isLocked: false,
    points: 520,
    wallet: 200000,
  },
  {
    name: "Vũ Hải Nam",
    email: "customer5@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0909012345",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    isActive: true,
    isLocked: false,
    points: 1200,
    wallet: 500000,
  },
  {
    name: "Đặng Minh Trí",
    email: "customer6@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0910123456",
    avatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    isActive: true,
    isLocked: false,
    points: 640,
    wallet: 300000,
  },
  {
    name: "Phạm Thành Trung",
    email: "customer7@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0911234567",
    avatar:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150",
    isActive: true,
    isLocked: false,
    points: 410,
    wallet: 150000,
  },
  {
    name: "Bùi Anh Tuấn",
    email: "customer8@gmail.com",
    password: defaultHashedPassword,
    role: "customer",
    phone: "0912345678",
    avatar:
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150",
    isActive: true,
    isLocked: false,
    points: 980,
    wallet: 600000,
  },
];

// 2.4. Danh sách 27 BÀN CHƠI CHUẨN (Khớp 100% với deginPatten.txt: 3x3 Grid, 9 bàn/trang, 3 trang)
const buildTablesData = (pricingTierId) => [
  // ─── KHU VIP: 8 BÀN (Mã: VIP-01 -> VIP-08) ───
  {
    code: "VIP-01",
    name: "BÀN 01 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 120000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-02",
    name: "BÀN 02 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 120000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-03",
    name: "BÀN 03 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 120000,
    status: "booked",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-04",
    name: "BÀN 04 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 120000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-05",
    name: "BÀN 05 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 140000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-06",
    name: "BÀN 06 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 140000,
    status: "paused",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-07",
    name: "BÀN 07 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 140000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "VIP-08",
    name: "BÀN 08 • VIP",
    type: "vip_bank_pool",
    area: "Khu VIP",
    floor: 2,
    pricePerHour: 140000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },

  // ─── KHU PHỔ THÔNG: 15 BÀN (Mã: STD-01 -> STD-15) ───
  {
    code: "STD-01",
    name: "BÀN 01 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 60000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-02",
    name: "BÀN 02 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 60000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-03",
    name: "BÀN 03 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 60000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-04",
    name: "BÀN 04 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 60000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-05",
    name: "BÀN 05 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-06",
    name: "BÀN 06 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-07",
    name: "BÀN 07 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-08",
    name: "BÀN 08 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "booked",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-09",
    name: "BÀN 09 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-10",
    name: "BÀN 10 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 70000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-11",
    name: "BÀN 11 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 80000,
    status: "paused",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-12",
    name: "BÀN 12 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 80000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-13",
    name: "BÀN 13 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 80000,
    status: "booked",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-14",
    name: "BÀN 14 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 80000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "STD-15",
    name: "BÀN 15 • PHỔ THÔNG",
    type: "standard_9ft",
    area: "Phổ thông",
    floor: 1,
    pricePerHour: 80000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },

  // ─── KHU THI ĐẤU: 4 BÀN (Mã: MTCH-01 -> MTCH-04) ───
  {
    code: "MTCH-01",
    name: "BÀN 01 • THI ĐẤU",
    type: "match_ksteel",
    area: "Thi đấu",
    floor: 1,
    pricePerHour: 100000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "MTCH-02",
    name: "BÀN 02 • THI ĐẤU",
    type: "match_ksteel",
    area: "Thi đấu",
    floor: 1,
    pricePerHour: 100000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "MTCH-03",
    name: "BÀN 03 • THI ĐẤU",
    type: "match_ksteel",
    area: "Thi đấu",
    floor: 1,
    pricePerHour: 100000,
    status: "playing",
    isActive: true,
    pricingTier: pricingTierId,
  },
  {
    code: "MTCH-04",
    name: "BÀN 04 • THI ĐẤU",
    type: "match_ksteel",
    area: "Thi đấu",
    floor: 1,
    pricePerHour: 100000,
    status: "available",
    isActive: true,
    pricingTier: pricingTierId,
  },
];

// 2.5. Thông báo hệ thống (Notification)
const notificationsData = [
  {
    title: "Bàn chuyển sang tạm dừng",
    message:
      'Bàn "BÀN 06 • VIP" (Mã: VIP-06) vừa chuyển sang trạng thái Tạm dừng theo yêu cầu của khách.',
    type: "table",
    isRead: false,
  },
  {
    title: "Yêu cầu đặt bàn trực tuyến mới",
    message:
      "Khách hàng Trần Quốc Đạt vừa gửi yêu cầu đặt BÀN 03 • VIP lúc 19:30 tối nay.",
    type: "system",
    isRead: false,
  },
  {
    title: "Cảnh báo tồn kho tối thiểu",
    message:
      'Mặt hàng "Lơ bida Master Blue" hiện chỉ còn 5 viên trong kho (dưới mức an toàn 20 viên). Vui lòng nhập thêm!',
    type: "system",
    isRead: false,
  },
  {
    title: "Kích hoạt khung giờ giá mới",
    message:
      "Khung giờ tiêu chuẩn ban ngày (T2-T6) đã được kích hoạt thành công trên toàn hệ thống.",
    type: "pricing",
    isRead: true,
  },
  {
    title: "Giải đấu Bank Pool 2026",
    message:
      "Đã có 16 cơ thủ hoàn tất đăng ký Giải Bank Pool Mở Rộng CueZone Cup 2026. Nhánh đấu đã sẵn sàng!",
    type: "system",
    isRead: true,
  },
];

// 2.6. Kho hàng & Phụ kiện bida (SRS v4.1 UC31, UC32, UC37)
const productsData = [
  {
    name: "Lơ bida Master Blue",
    sku: "ACC-002",
    category: "accessory",
    unit: "viên",
    costPrice: 5000,
    salePrice: 10000,
    stock: 48,
    minStock: 20,
    imageUrl:
      "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=150",
    isActive: true,
  },
  {
    name: "Đầu cơ Kamui 13mm",
    sku: "ACC-001",
    category: "accessory",
    unit: "cái",
    costPrice: 15000,
    salePrice: 30000,
    stock: 40,
    minStock: 10,
    imageUrl:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=150",
    isActive: true,
  },
  {
    name: "Bao tay bida Predator cao cấp",
    sku: "ACC-003",
    category: "accessory",
    unit: "cái",
    costPrice: 40000,
    salePrice: 70000,
    stock: 18,
    minStock: 8,
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=150",
    isActive: true,
  },
  {
    name: "Khăn lau nỉ bàn Simonis",
    sku: "ACC-004",
    category: "accessory",
    unit: "cái",
    costPrice: 35000,
    salePrice: 60000,
    stock: 25,
    minStock: 5,
    imageUrl:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150",
    isActive: true,
  },
  {
    name: "Bộ bóng bida Aramith Pro Cup TV",
    sku: "ACC-005",
    category: "accessory",
    unit: "bộ",
    costPrice: 2800000,
    salePrice: 3500000,
    stock: 4,
    minStock: 2,
    imageUrl: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=150",
    isActive: true,
  },
  {
    name: "Nước tăng lực RedBull lon 250ml",
    sku: "DRK-001",
    category: "drink",
    unit: "lon",
    costPrice: 12000,
    salePrice: 20000,
    stock: 120,
    minStock: 36,
    imageUrl:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150",
    isActive: true,
  },
  {
    name: "Pepsi lon 330ml",
    sku: "DRK-002",
    category: "drink",
    unit: "lon",
    costPrice: 9000,
    salePrice: 15000,
    stock: 150,
    minStock: 30,
    imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=150",
    isActive: true,
  },
  {
    name: "7UP lon 330ml",
    sku: "DRK-003",
    category: "drink",
    unit: "lon",
    costPrice: 9000,
    salePrice: 15000,
    stock: 90,
    minStock: 24,
    imageUrl:
      "https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=150",
    isActive: true,
  },
  {
    name: "Nước khoáng Aquafina 500ml",
    sku: "DRK-004",
    category: "drink",
    unit: "chai",
    costPrice: 5000,
    salePrice: 10000,
    stock: 240,
    minStock: 48,
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=150",
    isActive: true,
  },
  {
    name: "Bia Tiger lon 330ml",
    sku: "DRK-005",
    category: "drink",
    unit: "lon",
    costPrice: 15000,
    salePrice: 25000,
    stock: 180,
    minStock: 48,
    imageUrl:
      "https://images.unsplash.com/photo-1608270192802-990ff5b090bc?w=150",
    isActive: true,
  },
  {
    name: "Bia Heineken Silver lon 330ml",
    sku: "DRK-006",
    category: "drink",
    unit: "lon",
    costPrice: 19000,
    salePrice: 30000,
    stock: 160,
    minStock: 48,
    imageUrl:
      "https://images.unsplash.com/photo-1618886614638-80e3c15cd819?w=150",
    isActive: true,
  },
  {
    name: "Bia Tiger chai 330ml",
    sku: "DRK-007",
    category: "drink",
    unit: "chai",
    costPrice: 13000,
    salePrice: 22000,
    stock: 12,
    minStock: 48,
    imageUrl:
      "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=150",
    isActive: true,
  },
  {
    name: "Cà phê hạt Robusta rang xay 1kg",
    sku: "ING-001",
    category: "ingredient",
    unit: "kg",
    costPrice: 140000,
    salePrice: 0,
    stock: 8,
    minStock: 3,
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=150",
    isActive: true,
  },
  {
    name: "Sữa đặc Ông Thọ hộp 380g",
    sku: "ING-002",
    category: "ingredient",
    unit: "hộp",
    costPrice: 18000,
    salePrice: 0,
    stock: 30,
    minStock: 12,
    imageUrl:
      "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=150",
    isActive: true,
  },
  {
    name: "Kem béo thực vật Rich's 454ml",
    sku: "ING-003",
    category: "ingredient",
    unit: "hộp",
    costPrice: 26000,
    salePrice: 0,
    stock: 15,
    minStock: 6,
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150",
    isActive: true,
  },
];

// 2.7. Nhà cung cấp (SRS v4.1 UC33)
const suppliersData = [
  {
    name: "Công ty Phụ kiện Bida Thành Công",
    contactPerson: "Anh Nguyễn Văn Thành",
    phone: "0243456789",
    email: "bidathanhcong.hn@gmail.com",
    address: "78 Đinh Tiên Hoàng, Hoàn Kiếm, Hà Nội",
    note: "Cung cấp lơ Master Blue, đầu cơ Kamui, bóng Aramith",
  },
  {
    name: "Tổng đại lý Nước giải khát & Nước ngọt Miền Bắc",
    contactPerson: "Chị Hoàng Lan",
    phone: "0242345678",
    email: "pepsihanoi.distribution@gmail.com",
    address: "45 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    note: "Giao hàng thứ 2, 4, 6 hàng tuần - Chiết khấu 5% khi nhập > 50 thùng",
  },
  {
    name: "Công ty TNHH Phân phối Bia Tiger & Heineken HN",
    contactPerson: "Anh Trần Đăng Khoa",
    phone: "0241234567",
    email: "tigerbeer.hn@gmail.com",
    address: "123 Phạm Văn Đồng, Bắc Từ Liêm, Hà Nội",
    note: "Hỗ trợ đổi trả vỏ két bia trong vòng 7 ngày",
  },
  {
    name: "Hợp tác xã Cà phê Robusta & Nguyên liệu Pha chế",
    contactPerson: "Chị Lê Mai Hoa",
    phone: "0244567890",
    email: "caphenguyenchat.hn@gmail.com",
    address: "22 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội",
    note: "Giao cà phê rang mộc mới mỗi đầu tháng",
  },
];

// 2.8. Menu đồ ăn/uống (F&B) phục vụ tại bàn & POS (UC09, UC23)
const menuItemsData = [
  {
    name: "Cà phê muối đặc biệt",
    category: "drink",
    price: 35000,
    description: "Cà phê phin đậm vị kết hợp lớp kem muối béo ngậy",
    imageUrl:
      "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=150",
    isAvailable: true,
  },
  {
    name: "Cà phê đen đá",
    category: "drink",
    price: 25000,
    description: "Robusta nguyên chất đậm vị truyền thống",
    imageUrl:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150",
    isAvailable: true,
  },
  {
    name: "Cà phê sữa đá",
    category: "drink",
    price: 30000,
    description: "Cà phê Robusta pha sữa đặc ngọt dịu",
    imageUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=150",
    isAvailable: true,
  },
  {
    name: "Nước tăng lực RedBull",
    category: "drink",
    price: 20000,
    description: "Lon 250ml ướp lạnh kèm ly đá",
    imageUrl:
      "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150",
    isAvailable: true,
  },
  {
    name: "Pepsi / 7UP lon",
    category: "drink",
    price: 15000,
    description: "Lon 330ml kèm ly đá chanh",
    imageUrl: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=150",
    isAvailable: true,
  },
  {
    name: "Bia Tiger bạc lon",
    category: "drink",
    price: 25000,
    description: "Lon 330ml ướp lạnh sâu",
    imageUrl:
      "https://images.unsplash.com/photo-1608270192802-990ff5b090bc?w=150",
    isAvailable: true,
  },
  {
    name: "Bia Heineken Silver",
    category: "drink",
    price: 30000,
    description: "Lon 330ml êm đằm dễ uống",
    imageUrl:
      "https://images.unsplash.com/photo-1618886614638-80e3c15cd819?w=150",
    isAvailable: true,
  },
  {
    name: "Nước suối Aquafina 500ml",
    category: "drink",
    price: 10000,
    description: "Nước tinh khiết đóng chai",
    imageUrl: "https://images.unsplash.com/photo-1550572017-edd951aa8f72?w=150",
    isAvailable: true,
  },
  {
    name: "Trà đào cam sả",
    category: "drink",
    price: 35000,
    description: "Trà đào thơm mát miếng đào giòn ngọt",
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=150",
    isAvailable: true,
  },
  {
    name: "Mì bò trứng xúc xích",
    category: "food",
    price: 45000,
    description: "Mì tôm thơm ngon kèm bò viên, trứng ốp la và xúc xích nướng",
    imageUrl:
      "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=150",
    isAvailable: true,
  },
  {
    name: "Bánh mì nướng bơ phô mai",
    category: "food",
    price: 25000,
    description: "2 lát bánh mì giòn rụm béo thơm",
    imageUrl:
      "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=150",
    isAvailable: true,
  },
  {
    name: "Khoai tây chiên lắc phô mai",
    category: "food",
    price: 35000,
    description: "Khoai tây vàng giòn kèm sốt tương cà tương ớt",
    imageUrl:
      "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=150",
    isAvailable: true,
  },
  {
    name: "Hạt hướng dương rang muối",
    category: "snack",
    price: 25000,
    description: "Gói 200g thơm ngon nhâm nhi khi chơi",
    imageUrl:
      "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=150",
    isAvailable: true,
  },
  {
    name: "Hạt điều Bình Phước rang muối",
    category: "snack",
    price: 40000,
    description: "Hạt điều nguyên hạt giòn béo ngậy gói 150g",
    imageUrl:
      "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=150",
    isAvailable: true,
  },
];

// 2.9. Giải đấu Bank Pool (SRS v4.1 UC47, UC48, UC49)
const tournamentsData = [
  {
    name: "Giải Bank Pool Mở Rộng 2026 (CueZone Cup)",
    description:
      "Giải đấu phong trào Bank Pool đỉnh cao quy tụ 16 cơ thủ hàng đầu CLB. Thể thức đấu loại trực tiếp Single Elimination Bracket chạm 5 bi băng.",
    startDate: new Date("2026-10-10"),
    endDate: new Date("2026-10-25"),
    registrationDeadline: new Date("2026-10-08"),
    maxPlayers: 16,
    registrationFee: 200000,
    prizePool:
      "Tổng giá trị 10.000.000 VNĐ (Nhất: 5.000.000đ | Nhì: 3.000.000đ | Đồng hạng Ba: 1.000.000đ)",
    status: "registration_open",
    format: "Single Elimination",
    raceToScore: 5,
    rules:
      "Luật Bank Pool WPA quốc tế. Mỗi ván đánh chạm 5 bi băng. Cơ thủ bắt buộc gọi bi mục tiêu và lỗ định đánh.",
  },
  {
    name: "Giải Giao Hữu Bank Pool Mùa Thu 2026",
    description:
      "Giải đấu giao lưu nội bộ hàng tháng dành cho hội viên mới làm quen thể thức Bank Pool.",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-09-05"),
    registrationDeadline: new Date("2026-08-30"),
    maxPlayers: 8,
    registrationFee: 100000,
    prizePool: "Nhất: 1.500.000đ | Nhì: 800.000đ",
    status: "completed",
    format: "Single Elimination",
    raceToScore: 3,
    rules: "Luật Bank Pool rút gọn chạm 3 bi băng.",
  },
];

// 2.10. Tin tức & Sự kiện (SRS v4.1 UC18, UC46)
const newsData = [
  {
    title:
      "Khai trương phòng VIP Bank Pool cao cấp với bàn K-Steel tiêu chuẩn!",
    content:
      "CLB CueZone hân hạnh thông báo hoàn tất nâng cấp 8 bàn VIP riêng biệt với đầy đủ điều hoà hai chiều, ghế nỉ sofa cao cấp và hệ thống bóng bida Aramith Pro Cup TV phục vụ cơ thủ.",
    category: "news",
    imageUrl:
      "https://images.unsplash.com/photo-1577471488278-16eec37ffcc2?w=500",
    isPublished: true,
  },
  {
    title: "Chính thức công bố nhánh đấu Giải Bank Pool Mở Rộng 2026",
    content:
      "Ban tổ chức đã tiến hành bốc thăm phân nhánh 16 cơ thủ tranh tài tại CueZone Cup 2026. Các trận vòng 1/8 sẽ khởi tranh từ 19:00 ngày 10/10/2026 trên Bàn Match 01 và Bàn Match 02.",
    category: "event",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500",
    isPublished: true,
  },
  {
    title: "Ưu đãi nạp ví hội viên: Tặng ngay 10% giá trị nạp",
    content:
      "Từ nay đến hết tháng 10/2026, cơ thủ nạp ví trả trước từ 500.000đ sẽ nhận thêm ngay 10% số dư khuyến mãi dùng để thanh toán tiền giờ chơi và menu F&B tại quầy.",
    category: "promotion",
    imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
    isPublished: true,
  },
  {
    title: "Cẩm nang: 5 kỹ thuật đánh bi băng cơ bản trong Bank Pool",
    content:
      "Bank Pool đòi hỏi sự tính toán góc phản xạ và lực tiếp xúc cực kỳ chuẩn xác. Cùng chuyên gia CueZone phân tích cách đánh băng dài, băng ngắn và kỹ thuật ép phê góc đôi.",
    category: "rule",
    imageUrl:
      "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=500",
    isPublished: true,
  },
];

// 2.11. Voucher & Khuyến mãi (SRS v4.1 UC27)
const vouchersData = [
  {
    code: "CUEZONE2026",
    discountType: "fixed",
    discountValue: 35000,
    minOrderAmount: 200000,
    maxUses: 100,
    usedCount: 15,
    expiredAt: new Date("2026-12-31"),
    isActive: true,
  },
  {
    code: "WELCOME10",
    discountType: "percent",
    discountValue: 10,
    minOrderAmount: 100000,
    maxUses: 200,
    usedCount: 42,
    expiredAt: new Date("2026-12-31"),
    isActive: true,
  },
  {
    code: "VIP20",
    discountType: "percent",
    discountValue: 20,
    minOrderAmount: 300000,
    maxUses: 50,
    usedCount: 18,
    expiredAt: new Date("2026-11-30"),
    isActive: true,
  },
  {
    code: "CUEZONE50K",
    discountType: "fixed",
    discountValue: 50000,
    minOrderAmount: 350000,
    maxUses: 50,
    usedCount: 12,
    expiredAt: new Date("2026-10-31"),
    isActive: true,
  },
  {
    code: "EXPIRED_OLD",
    discountType: "percent",
    discountValue: 15,
    minOrderAmount: 100000,
    maxUses: 50,
    usedCount: 50,
    expiredAt: new Date("2026-06-30"),
    isActive: false,
  },
];

// ==============================================================================
// 2.12. BUSINESS DATA INTEGRITY VALIDATION
// Chặn seed tạo dữ liệu tự mâu thuẫn trước khi insert transactional data.
// ==============================================================================
function toMinutes(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function assertSeedIntegrity({
  users,
  tables,
  bookings,
  sessions,
  invoices,
  payments,
  vouchers,
  walletTxs,
  products,
  inventoryTxs,
  tournamentPlayers,
  tournaments,
  matches,
}) {
  const fail = (msg) => {
    throw new Error(`SEED_INTEGRITY_ERROR: ${msg}`);
  };

  const emails = new Set();
  users.forEach((u) => {
    const e = u.email.toLowerCase();
    if (emails.has(e)) fail(`Duplicate user email: ${e}`);
    emails.add(e);
    if (u.wallet < 0) fail(`Negative wallet: ${e}`);
  });

  const tableIds = new Set(tables.map((t) => String(t._id)));
  const activeSessionByTable = new Set();
  sessions.forEach((s) => {
    if (!tableIds.has(String(s.table)))
      fail(`Session references unknown table: ${s.table}`);
    if (["active", "paused"].includes(s.status)) {
      const key = String(s.table);
      if (activeSessionByTable.has(key))
        fail(`More than one active/paused session for table ${key}`);
      activeSessionByTable.add(key);
      if (
        s.status === "paused" &&
        (!s.pauses?.length || !s.pauses[s.pauses.length - 1].pauseStart)
      )
        fail(`Paused session missing pauseStart for table ${key}`);
    }
  });

  const liveStatuses = new Set(["pending", "confirmed", "checked_in"]);
  const bookingGroups = new Map();
  bookings.forEach((b) => {
    if (
      !b.startTime ||
      !b.endTime ||
      toMinutes(b.startTime) >= toMinutes(b.endTime)
    )
      fail(`Invalid booking time: ${b.startTime}-${b.endTime}`);
    if (b.table && liveStatuses.has(b.status)) {
      const key = `${String(b.table)}|${new Date(b.bookingDate).toISOString().slice(0, 10)}`;
      const list = bookingGroups.get(key) || [];
      const start = toMinutes(b.startTime),
        end = toMinutes(b.endTime);
      for (const x of list) {
        if (start < x.end && end > x.start)
          fail(`Overlapping booking on ${key}: ${b.startTime}-${b.endTime}`);
      }
      list.push({ start, end });
      bookingGroups.set(key, list);
    }
  });

  const tableStatus = new Map(tables.map((t) => [String(t._id), t.status]));
  sessions.forEach((s) => {
    const st = tableStatus.get(String(s.table));
    if (
      ["active", "paused"].includes(s.status) &&
      !["playing", "paused"].includes(st)
    )
      fail(
        `Session/table status mismatch for ${s.table}: session=${s.status}, table=${st}`,
      );
  });

  invoices.forEach((inv) => {
    const itemSum = inv.items.reduce(
      (sum, i) => sum + Number(i.amount || 0),
      0,
    );
    const expected = inv.subtotal - (inv.discount || 0) + (inv.tax || 0);
    if (itemSum !== inv.subtotal)
      fail(`Invoice ${inv.invoiceNumber}: item sum != subtotal`);
    if (inv.totalAmount !== expected)
      fail(`Invoice ${inv.invoiceNumber}: total != subtotal-discount+tax`);
    if (inv.paidAmount < 0 || inv.paidAmount > inv.totalAmount)
      fail(`Invoice ${inv.invoiceNumber}: invalid paidAmount`);
    if (inv.status === "paid" && inv.paidAmount !== inv.totalAmount)
      fail(`Invoice ${inv.invoiceNumber}: PAID but paidAmount != totalAmount`);
  });

  const paymentsByInvoice = new Map();
  payments.forEach((p) => {
    if (p.amount <= 0) fail(`Payment amount must be > 0`);
    if (p.method === "wallet" && Number(p.walletAmount || 0) !== p.amount)
      fail(`Wallet payment amount mismatch: ${p.transactionRef || p.invoice}`);
    const key = String(p.invoice);
    paymentsByInvoice.set(key, (paymentsByInvoice.get(key) || 0) + p.amount);
  });
  invoices.forEach((inv) => {
    if ((paymentsByInvoice.get(String(inv._id)) || 0) !== inv.paidAmount)
      fail(`Invoice ${inv.invoiceNumber}: payment sum != paidAmount`);
  });

  vouchers.forEach((v) => {
    if (v.usedCount < 0 || v.usedCount > v.maxUses)
      fail(`Voucher ${v.code}: usedCount out of quota`);
    if (
      v.discountType === "percent" &&
      (v.discountValue <= 0 || v.discountValue > 100)
    )
      fail(`Voucher ${v.code}: invalid percent`);
    if (v.discountType === "fixed" && v.discountValue <= 0)
      fail(`Voucher ${v.code}: invalid fixed discount`);
  });

  const walletByUser = new Map();
  walletTxs.forEach((tx) => {
    const key = String(tx.user);
    const prev = walletByUser.get(key);
    if (prev != null && tx.balanceBefore !== prev)
      fail(`Wallet ledger discontinuity for user ${key}`);
    const expectedAfter = ["top_up", "refund", "adjustment", "bonus"].includes(
      tx.type,
    )
      ? tx.balanceBefore + tx.amount
      : tx.balanceBefore - tx.amount;
    if (tx.balanceAfter !== expectedAfter)
      fail(`Wallet transaction arithmetic error for user ${key}`);
    if (tx.balanceAfter < 0)
      fail(`Wallet ledger would become negative for user ${key}`);
    walletByUser.set(key, tx.balanceAfter);
  });
  users.forEach((u) => {
    const finalBalance = walletByUser.get(String(u._id));
    if (finalBalance != null && finalBalance !== u.wallet)
      fail(
        `User wallet mismatch for ${u.email}: user=${u.wallet}, ledger=${finalBalance}`,
      );
  });

  const productMap = new Map(products.map((p) => [String(p._id), p]));
  const lastStock = new Map();
  inventoryTxs.forEach((tx) => {
    const p = productMap.get(String(tx.product));
    if (!p)
      fail(`Inventory transaction references unknown product ${tx.product}`);
    const last = lastStock.get(String(tx.product));
    if (last != null && tx.previousStock !== last)
      fail(`Inventory ledger discontinuity for ${p.sku}`);
    const sign = ["in", "adjustment_in"].includes(tx.type) ? 1 : -1;
    const expected = tx.previousStock + sign * tx.quantity;
    if (tx.newStock !== expected || tx.newStock < 0)
      fail(`Inventory arithmetic error for ${p.sku}`);
    lastStock.set(String(tx.product), tx.newStock);
  });
  products.forEach((p) => {
    const finalStock = lastStock.get(String(p._id));
    if (finalStock != null && finalStock !== p.stock)
      fail(
        `Product stock mismatch for ${p.sku}: product=${p.stock}, ledger=${finalStock}`,
      );
    if (p.stock < 0) fail(`Negative stock for ${p.sku}`);
  });

  const registrations = new Map();
  tournamentPlayers.forEach((p) => {
    const key = String(p.tournament);
    registrations.set(
      key,
      (registrations.get(key) || 0) +
        (p.registrationStatus !== "cancelled" ? 1 : 0),
    );
  });
  tournaments.forEach((t) => {
    if ((registrations.get(String(t._id)) || 0) > t.maxPlayers)
      fail(`Tournament ${t.name}: player count exceeds maxPlayers`);
    if (new Date(t.registrationDeadline) > new Date(t.startDate))
      fail(`Tournament ${t.name}: registrationDeadline after startDate`);
    if (
      ["completed"].includes(t.status) &&
      new Date(t.endDate) > new Date("2026-09-30T23:59:59")
    )
      fail(`Completed tournament ${t.name} ends in the future`);
  });

  matches.forEach((m) => {
    if (["completed", "walkover"].includes(m.status)) {
      if (!m.winner) fail(`Completed match ${m.matchNumber} missing winner`);
      if (m.status === "completed" && (m.score1 == null || m.score2 == null))
        fail(`Completed match ${m.matchNumber} missing score`);
      if (m.status === "completed" && m.score1 === m.score2)
        fail(`Completed match ${m.matchNumber} cannot be tied`);
    }
  });
}

// ==============================================================================
// 3. MAIN SEED FUNCTION
// ==============================================================================
async function runSeed() {
  try {
    console.log("==================================================");
    console.log("🎱 CUEZONE BILLIARDS — DATABASE RE-SEED MASTER (v4.3)");
    console.log("==================================================");
    console.log(
      `🔌 Connecting to MongoDB: ${MONGO_URI.replace(/:([^@]+)@/, ":****@")}...`,
    );

    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected successfully!\n");

    // 1. Dọn dẹp tất cả 22 collections cũ
    console.log("🗑️  Cleaning up previous data across all 22 collections...");
    await Promise.all([
      Role.deleteMany({}),
      PricingTier.deleteMany({}),
      User.deleteMany({}),
      Table.deleteMany({}),
      Notification.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      MenuItem.deleteMany({}),
      Tournament.deleteMany({}),
      TournamentPlayer.deleteMany({}),
      Match.deleteMany({}),
      News.deleteMany({}),
      Voucher.deleteMany({}),
      Booking.deleteMany({}),
      TableSession.deleteMany({}),
      Invoice.deleteMany({}),
      Payment.deleteMany({}),
      Review.deleteMany({}),
      WalletTransaction.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      ImportReceipt.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log("✅ All old collections cleared.\n");

    // 2. Seed Roles (RBAC)
    console.log("🌱 1/22. Seeding Roles (RBAC)...");
    const createdRoles = await Role.insertMany(rolesData);
    console.log(`   ✅ Roles seeded: ${createdRoles.length} records`);

    // 3. Seed Pricing Tiers
    console.log("🌱 2/22. Seeding Pricing Tiers...");
    const createdPricingTiers = await PricingTier.insertMany(pricingTiersData);
    console.log(
      `   ✅ Pricing Tiers seeded: ${createdPricingTiers.length} records`,
    );
    const defaultTierId = createdPricingTiers[0]._id;

    // 4. Seed Users
    console.log("🌱 3/22. Seeding Users (with bcrypt hashed passwords)...");
    const createdUsers = await User.insertMany(usersData);
    console.log(`   ✅ Users seeded: ${createdUsers.length} records`);

    const adminUser = createdUsers.find((u) => u.role === "admin");
    const staff1User = createdUsers.find(
      (u) => u.email === "staff1@cuezone.com",
    );
    const staff2User = createdUsers.find(
      (u) => u.email === "staff2@cuezone.com",
    );
    const customers = createdUsers.filter((u) => u.role === "customer");

    // 5. Seed Tables (27 bàn chuẩn 3x3 layout)
    console.log(
      "🌱 4/22. Seeding Tables (Strictly 27 tables: 8 VIP, 15 Standard, 4 Match)...",
    );
    const tablesData = buildTablesData(defaultTierId);
    const createdTables = await Table.insertMany(tablesData);
    console.log(`   ✅ Tables seeded: ${createdTables.length} records`);

    // 6. Seed Notifications
    console.log("🌱 5/22. Seeding Notifications...");
    const createdNotifications =
      await Notification.insertMany(notificationsData);
    console.log(
      `   ✅ Notifications seeded: ${createdNotifications.length} records`,
    );

    // 7. Seed Inventory Products
    console.log(
      "🌱 6/22. Seeding Products (Warehouse & F&B with low stock alerts)...",
    );
    const createdProducts = await Product.insertMany(productsData);
    console.log(`   ✅ Products seeded: ${createdProducts.length} records`);

    // 8. Seed Suppliers
    console.log("🌱 7/22. Seeding Suppliers...");
    const createdSuppliers = await Supplier.insertMany(suppliersData);
    console.log(`   ✅ Suppliers seeded: ${createdSuppliers.length} records`);

    // 9. Seed MenuItems (F&B)
    console.log("🌱 8/22. Seeding F&B MenuItems...");
    const createdMenuItems = await MenuItem.insertMany(menuItemsData);
    console.log(`   ✅ MenuItems seeded: ${createdMenuItems.length} records`);

    // 10. Seed Tournaments
    console.log("🌱 9/22. Seeding Tournaments (Bank Pool)...");
    const tournamentsDataWithCreator = tournamentsData.map((t) => ({
      ...t,
      createdBy: adminUser._id,
    }));
    const createdTournaments = await Tournament.insertMany(
      tournamentsDataWithCreator,
    );
    console.log(
      `   ✅ Tournaments seeded: ${createdTournaments.length} records`,
    );

    const activeTournament = createdTournaments[0]; // CueZone Cup (registration_open)
    const completedTournament = createdTournaments[1]; // Mùa Thu 2026 (completed)

    // 11. Seed TournamentPlayers
    console.log("🌱 10/22. Seeding Tournament Players...");
    const tournamentPlayersData = customers.slice(0, 8).map((cust, idx) => ({
      tournament: completedTournament._id,
      player: cust._id,
      registrationStatus: "confirmed",
      seed: idx + 1,
      feePaid: true,
      registeredAt: new Date("2026-10-01"),
    }));
    const createdTournamentPlayers = await TournamentPlayer.insertMany(
      tournamentPlayersData,
    );
    console.log(
      `   ✅ Tournament Players seeded: ${createdTournamentPlayers.length} records`,
    );

    // 12. Seed Matches (Bracket Rounds)
    console.log("🌱 11/22. Seeding Tournament Matches (Bracket)...");
    const matchesData = [
      // Tứ kết (Round 1)
      {
        tournament: completedTournament._id,
        round: 1,
        matchNumber: 1,
        player1: customers[0]._id,
        player2: customers[7]._id,
        score1: 5,
        score2: 2,
        winner: customers[0]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-01T19:00:00"),
        table: createdTables[23]._id,
      }, // MTCH-01
      {
        tournament: completedTournament._id,
        round: 1,
        matchNumber: 2,
        player1: customers[3]._id,
        player2: customers[4]._id,
        score1: 5,
        score2: 4,
        winner: customers[3]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-01T20:30:00"),
        table: createdTables[24]._id,
      }, // MTCH-02
      {
        tournament: completedTournament._id,
        round: 1,
        matchNumber: 3,
        player1: customers[1]._id,
        player2: customers[6]._id,
        score1: 5,
        score2: 3,
        winner: customers[1]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-02T19:00:00"),
        table: createdTables[25]._id,
      }, // MTCH-03
      {
        tournament: completedTournament._id,
        round: 1,
        matchNumber: 4,
        player1: customers[2]._id,
        player2: customers[5]._id,
        score1: 3,
        score2: 5,
        winner: customers[5]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-02T20:30:00"),
        table: createdTables[26]._id,
      }, // MTCH-04
      // Bán kết (Round 2)
      {
        tournament: completedTournament._id,
        round: 2,
        matchNumber: 5,
        player1: customers[0]._id,
        player2: customers[3]._id,
        score1: 5,
        score2: 4,
        winner: customers[0]._id,
        status: "completed",
        startedAt: new Date("2026-09-04T19:00:00"),
        completedAt: new Date("2026-09-04T20:15:00"),
        table: createdTables[23]._id,
      },
      {
        tournament: completedTournament._id,
        round: 2,
        matchNumber: 6,
        player1: customers[1]._id,
        player2: customers[5]._id,
        score1: 5,
        score2: 3,
        winner: customers[1]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-04T20:30:00"),
        startedAt: new Date("2026-09-04T20:30:00"),
        completedAt: new Date("2026-09-04T21:30:00"),
        table: createdTables[25]._id,
      },
      // Chung kết (Round 3)
      {
        tournament: completedTournament._id,
        round: 3,
        matchNumber: 7,
        player1: customers[0]._id,
        player2: customers[1]._id,
        score1: 5,
        score2: 4,
        winner: customers[0]._id,
        status: "completed",
        scheduledAt: new Date("2026-09-05T20:00:00"),
        startedAt: new Date("2026-09-05T20:00:00"),
        completedAt: new Date("2026-09-05T21:30:00"),
        table: createdTables[23]._id,
      },
    ];
    const createdMatches = await Match.insertMany(matchesData);
    console.log(`   ✅ Matches seeded: ${createdMatches.length} records`);

    // 13. Seed News
    console.log("🌱 12/22. Seeding News & Rules...");
    const createdNews = await News.insertMany(newsData);
    console.log(`   ✅ News seeded: ${createdNews.length} records`);

    // 14. Seed Vouchers
    console.log("🌱 13/22. Seeding Vouchers...");
    const createdVouchers = await Voucher.insertMany(vouchersData);
    console.log(`   ✅ Vouchers seeded: ${createdVouchers.length} records`);

    // 15. Seed Bookings
    console.log("🌱 14/22. Seeding Sample Bookings...");
    const tableVip3 = createdTables.find((t) => t.code === "VIP-03");
    const tableStd8 = createdTables.find((t) => t.code === "STD-08");
    const tableStd13 = createdTables.find((t) => t.code === "STD-13");
    const tableVip7 = createdTables.find((t) => t.code === "VIP-07");

    const bookingsData = [
      {
        customer: customers[0]._id,
        table: tableVip3._id,
        tableType: "vip_bank_pool",
        bookingDate: new Date(),
        startTime: "19:30",
        endTime: "22:00",
        numberOfGuests: 4,
        status: "confirmed",
        note: "Đặt trước bàn VIP sinh nhật bạn",
        confirmedBy: staff1User._id,
      },
      {
        customer: customers[1]._id,
        table: tableStd8._id,
        tableType: "standard_9ft",
        bookingDate: new Date(),
        startTime: "20:00",
        endTime: "22:00",
        numberOfGuests: 2,
        status: "confirmed",
        note: "Góc thoáng mát",
        confirmedBy: staff2User._id,
      },
      {
        customer: customers[2]._id,
        table: tableStd13._id,
        tableType: "standard_9ft",
        bookingDate: new Date(Date.now() + 86400000),
        startTime: "18:30",
        endTime: "20:30",
        numberOfGuests: 2,
        status: "pending",
        note: "Yêu cầu bàn gần quầy nước",
      },
      {
        customer: customers[3]._id,
        table: tableVip7._id,
        tableType: "vip_bank_pool",
        bookingDate: new Date(Date.now() - 86400000),
        startTime: "15:00",
        endTime: "17:00",
        numberOfGuests: 3,
        status: "completed",
        checkedInAt: new Date(Date.now() - 86400000),
      },
      {
        customer: customers[4]._id,
        tableType: "standard_9ft",
        bookingDate: new Date(),
        startTime: "19:00",
        endTime: "21:00",
        numberOfGuests: 2,
        status: "rejected",
        rejectedBy: staff1User._id,
        rejectionReason: "Khung giờ cao điểm đã kín hết bàn",
      },
      {
        customer: customers[5]._id,
        tableType: "standard_9ft",
        bookingDate: new Date(),
        startTime: "14:00",
        endTime: "16:00",
        numberOfGuests: 2,
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: "Bận việc đột xuất",
      },
    ];
    const createdBookings = await Booking.insertMany(bookingsData);
    console.log(`   ✅ Bookings seeded: ${createdBookings.length} records`);

    // 16. Seed TableSessions
    console.log(
      "🌱 15/22. Seeding Table Sessions (Active, Paused, Completed)...",
    );
    const playingTables = createdTables.filter((t) => t.status === "playing");
    const pausedTables = createdTables.filter((t) => t.status === "paused");

    const sessionsData = [];

    // Active Sessions cho 14 bàn playing
    playingTables.forEach((tbl, idx) => {
      sessionsData.push({
        table: tbl._id,
        customer: customers[idx % customers.length]._id,
        openedBy: idx % 2 === 0 ? staff1User._id : staff2User._id,
        startTime: new Date(Date.now() - (45 + idx * 10) * 60000),
        status: "active",
        totalPausedMinutes: 0,
        pricingSnapshot: {
          pricePerHour: tbl.pricePerHour,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
        notes: `Phiên chơi trực tiếp tại ${tbl.name}`,
      });
    });

    // Paused Sessions cho 2 bàn paused
    pausedTables.forEach((tbl) => {
      sessionsData.push({
        table: tbl._id,
        customer: customers[0]._id,
        openedBy: staff1User._id,
        startTime: new Date(Date.now() - 90 * 60000),
        status: "paused",
        pauses: [{ pauseStart: new Date(Date.now() - 15 * 60000) }],
        totalPausedMinutes: 15,
        pricingSnapshot: {
          pricePerHour: tbl.pricePerHour,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
        notes: "Khách xin tạm dừng 15 phút ra ngoài",
      });
    });

    // Completed Sessions lịch sử
    const completedSessionsData = [
      {
        table: createdTables[0]._id,
        customer: customers[0]._id,
        openedBy: staff1User._id,
        closedBy: staff1User._id,
        startTime: new Date(Date.now() - 7200000),
        endTime: new Date(Date.now() - 3600000),
        status: "completed",
        totalPausedMinutes: 0,
        actualPlayingMinutes: 60,
        pricingSnapshot: {
          pricePerHour: 120000,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
      },
      {
        table: createdTables[8]._id,
        customer: customers[1]._id,
        openedBy: staff2User._id,
        closedBy: staff2User._id,
        startTime: new Date(Date.now() - 10800000),
        endTime: new Date(Date.now() - 3600000),
        status: "completed",
        totalPausedMinutes: 0,
        actualPlayingMinutes: 120,
        pricingSnapshot: {
          pricePerHour: 60000,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
      },
      {
        table: createdTables[9]._id,
        customer: customers[2]._id,
        openedBy: staff1User._id,
        closedBy: staff2User._id,
        startTime: new Date(Date.now() - 14400000),
        endTime: new Date(Date.now() - 7200000),
        status: "completed",
        totalPausedMinutes: 10,
        actualPlayingMinutes: 110,
        pricingSnapshot: {
          pricePerHour: 60000,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
      },
      {
        table: createdTables[23]._id,
        customer: customers[3]._id,
        openedBy: staff1User._id,
        closedBy: staff1User._id,
        startTime: new Date(Date.now() - 18000000),
        endTime: new Date(Date.now() - 10800000),
        status: "completed",
        totalPausedMinutes: 0,
        actualPlayingMinutes: 120,
        pricingSnapshot: {
          pricePerHour: 100000,
          tierName: "Khung Giờ Tiêu Chuẩn",
        },
      },
    ];

    const createdSessions = await TableSession.insertMany([
      ...sessionsData,
      ...completedSessionsData,
    ]);
    console.log(
      `   ✅ Table Sessions seeded: ${createdSessions.length} records`,
    );

    // 17. Seed Invoices & Invoice Items
    console.log("🌱 16/22. Seeding Sample Invoices...");
    const sampleVoucher = createdVouchers[0];

    const invoicesData = [
      // Open Invoices cho các bàn chơi
      {
        invoiceNumber: "INV-2026-0001",
        session: createdSessions[0]._id,
        table: createdSessions[0].table,
        customer: customers[0]._id,
        createdBy: staff1User._id,
        items: [
          {
            description: "Tiền giờ bida (BÀN 01 • VIP)",
            type: "table_time",
            quantity: 1,
            unitPrice: 120000,
            amount: 120000,
          },
          {
            description: "Nước tăng lực RedBull lon 250ml",
            type: "fnb",
            quantity: 2,
            unitPrice: 20000,
            amount: 40000,
          },
          {
            description: "Mì bò trứng xúc xích",
            type: "fnb",
            quantity: 1,
            unitPrice: 45000,
            amount: 45000,
          },
        ],
        subtotal: 205000,
        discount: 0,
        totalAmount: 205000,
        paidAmount: 0,
        status: "open",
      },
      {
        invoiceNumber: "INV-2026-0002",
        session: createdSessions[1]._id,
        table: createdSessions[1].table,
        customer: customers[1]._id,
        createdBy: staff2User._id,
        items: [
          {
            description: "Tiền giờ bida (BÀN 02 • VIP)",
            type: "table_time",
            quantity: 1.5,
            unitPrice: 120000,
            amount: 180000,
          },
          {
            description: "Bia Tiger bạc lon",
            type: "fnb",
            quantity: 4,
            unitPrice: 25000,
            amount: 100000,
          },
        ],
        subtotal: 280000,
        discount: 0,
        totalAmount: 280000,
        paidAmount: 0,
        status: "open",
      },
      // Paid Invoices cho các phiên hoàn thành
      {
        invoiceNumber: "INV-2026-0003",
        session: createdSessions[16]._id, // completed session 1
        table: createdTables[0]._id,
        customer: customers[0]._id,
        createdBy: staff1User._id,
        items: [
          {
            description: "Tiền giờ bida (BÀN 01 • VIP - 60 phút)",
            type: "table_time",
            quantity: 1,
            unitPrice: 120000,
            amount: 120000,
          },
          {
            description: "Trà đào cam sả",
            type: "fnb",
            quantity: 2,
            unitPrice: 35000,
            amount: 70000,
          },
          {
            description: "Khoai tây chiên lắc phô mai",
            type: "fnb",
            quantity: 1,
            unitPrice: 35000,
            amount: 35000,
          },
        ],
        subtotal: 225000,
        discount: 35000,
        voucher: sampleVoucher._id,
        voucherDiscount: 35000,
        totalAmount: 190000,
        paidAmount: 190000,
        status: "paid",
        paidAt: new Date(Date.now() - 3600000),
      },
      {
        invoiceNumber: "INV-2026-0004",
        session: createdSessions[17]._id, // completed session 2
        table: createdTables[8]._id,
        customer: customers[1]._id,
        createdBy: staff2User._id,
        items: [
          {
            description: "Tiền giờ bida (BÀN 01 • PHỔ THÔNG - 120 phút)",
            type: "table_time",
            quantity: 2,
            unitPrice: 60000,
            amount: 120000,
          },
          {
            description: "Pepsi lon 330ml",
            type: "fnb",
            quantity: 3,
            unitPrice: 15000,
            amount: 45000,
          },
        ],
        subtotal: 165000,
        discount: 0,
        totalAmount: 165000,
        paidAmount: 165000,
        status: "paid",
        paidAt: new Date(Date.now() - 3600000),
      },
    ];

    const createdInvoices = await Invoice.insertMany(invoicesData);
    console.log(`   ✅ Invoices seeded: ${createdInvoices.length} records`);

    // 18. Seed Payments
    console.log("🌱 17/22. Seeding Sample Payments...");
    const paymentsData = [
      {
        invoice: createdInvoices[2]._id,
        customer: customers[0]._id,
        processedBy: staff1User._id,
        method: "wallet",
        amount: 190000,
        walletAmount: 190000,
        status: "completed",
        transactionRef: "WAL-PAY-20261001-001",
        note: "Thanh toán thành công qua ví trả trước",
      },
      {
        invoice: createdInvoices[3]._id,
        customer: customers[1]._id,
        processedBy: staff2User._id,
        method: "cash",
        amount: 165000,
        cashAmount: 165000,
        status: "completed",
        transactionRef: "CASH-20261001-002",
        note: "Thanh toán tiền mặt tại quầy POS",
      },
    ];
    const createdPayments = await Payment.insertMany(paymentsData);
    console.log(`   ✅ Payments seeded: ${createdPayments.length} records`);

    // 19. Seed Reviews
    console.log("🌱 18/22. Seeding Service Reviews...");
    const reviewsData = [
      {
        customer: customers[0]._id,
        session: createdSessions[16]._id,
        invoice: createdInvoices[2]._id,
        rating: 5,
        comment:
          "Bàn VIP 01 rất êm, điều hoà mát lạnh và nhân viên phục vụ cực kỳ tận tình!",
      },
      {
        customer: customers[1]._id,
        session: createdSessions[17]._id,
        invoice: createdInvoices[3]._id,
        rating: 5,
        comment:
          "Giá tiền hợp lý, nước uống lạnh ngon. Sẽ quay lại thường xuyên!",
      },
      {
        customer: customers[2]._id,
        rating: 4,
        comment: "CLB bida đẹp nhất khu vực, bóng Aramith chuẩn thi đấu.",
      },
      {
        customer: customers[3]._id,
        rating: 5,
        comment:
          "Giải Bank Pool tổ chức rất chuyên nghiệp. Rất hào hứng cho vòng tiếp theo.",
      },
    ];
    const createdReviews = await Review.insertMany(reviewsData);
    console.log(`   ✅ Reviews seeded: ${createdReviews.length} records`);

    // 20. Seed Wallet Transactions
    console.log("🌱 19/22. Seeding Wallet Ledger Transactions...");
    const walletTxData = [
      {
        user: customers[0]._id,
        type: "top_up",
        amount: 1500000,
        balanceBefore: 0,
        balanceAfter: 1500000,
        description: "Nạp tiền ví hội viên trực tiếp tại quầy POS",
        performedBy: staff1User._id,
      },
      {
        user: customers[1]._id,
        type: "top_up",
        amount: 850000,
        balanceBefore: 0,
        balanceAfter: 850000,
        description: "Nạp ví khuyến mãi tặng 10%",
        performedBy: staff2User._id,
      },
      {
        user: customers[2]._id,
        type: "top_up",
        amount: 350000,
        balanceBefore: 0,
        balanceAfter: 350000,
        description: "Nạp ví hội viên ca sáng",
        performedBy: staff1User._id,
      },
      {
        user: customers[0]._id,
        type: "payment",
        amount: 190000,
        balanceBefore: 1500000,
        balanceAfter: 1310000,
        description: "Thanh toán hóa đơn phiên chơi #INV-2026-0003",
        reference: "INV-2026-0003",
        referenceType: "invoice",
        performedBy: staff1User._id,
      },
    ];
    const createdWalletTxs = await WalletTransaction.insertMany(walletTxData);
    console.log(
      `   ✅ Wallet Transactions seeded: ${createdWalletTxs.length} records`,
    );

    // 21. Seed Inventory Transactions & Import Receipts
    console.log("🌱 20/22. Seeding Inventory Transactions...");
    const invTxData = [
      {
        product: createdProducts[0]._id,
        type: "in",
        quantity: 50,
        previousStock: 0,
        newStock: 50,
        reason: "Nhập hàng đợt 1",
        performedBy: adminUser._id,
      },
      {
        product: createdProducts[0]._id,
        type: "waste",
        quantity: 2,
        previousStock: 50,
        newStock: 48,
        reason: "Hao mòn vỡ nát trong quá trình sử dụng",
        performedBy: adminUser._id,
      },
      {
        product: createdProducts[1]._id,
        type: "in",
        quantity: 40,
        previousStock: 0,
        newStock: 40,
        reason: "Nhập đầu cơ Kamui theo phiếu IMP-202610-001",
        performedBy: adminUser._id,
      },
      {
        product: createdProducts[5]._id,
        type: "in",
        quantity: 150,
        previousStock: 0,
        newStock: 150,
        reason: "Nhập kho RedBull từ Đại lý Miền Bắc",
        performedBy: adminUser._id,
      },
      {
        product: createdProducts[5]._id,
        type: "out",
        quantity: 30,
        previousStock: 150,
        newStock: 120,
        reason: "Xuất bán theo bill POS",
        performedBy: staff1User._id,
      },
    ];
    const createdInvTxs = await InventoryTransaction.insertMany(invTxData);
    console.log(
      `   ✅ Inventory Transactions seeded: ${createdInvTxs.length} records`,
    );

    console.log("🌱 21/22. Seeding Warehouse Import Receipts...");
    const importReceiptsData = [
      {
        receiptNumber: "IMP-202610-001",
        supplier: createdSuppliers[0]._id,
        items: [
          {
            product: createdProducts[0]._id,
            productName: createdProducts[0].name,
            quantity: 50,
            unitPrice: 5000,
            totalPrice: 250000,
          },
          {
            product: createdProducts[1]._id,
            productName: createdProducts[1].name,
            quantity: 40,
            unitPrice: 15000,
            totalPrice: 600000,
          },
        ],
        totalAmount: 850000,
        status: "completed",
        note: "Nhập phụ kiện bida đầu tháng 10",
        createdBy: adminUser._id,
        completedAt: new Date(),
      },
      {
        receiptNumber: "IMP-202610-002",
        supplier: createdSuppliers[1]._id,
        items: [
          {
            product: createdProducts[5]._id,
            productName: createdProducts[5].name,
            quantity: 150,
            unitPrice: 12000,
            totalPrice: 1800000,
          },
          {
            product: createdProducts[6]._id,
            productName: createdProducts[6].name,
            quantity: 180,
            unitPrice: 9000,
            totalPrice: 1620000,
          },
        ],
        totalAmount: 3420000,
        status: "completed",
        note: "Nhập nước giải khát Pepsi & RedBull",
        createdBy: adminUser._id,
        completedAt: new Date(),
      },
    ];
    const createdImportReceipts =
      await ImportReceipt.insertMany(importReceiptsData);
    console.log(
      `   ✅ Import Receipts seeded: ${createdImportReceipts.length} records`,
    );

    // 21.5. Validate cross-collection integrity before creating audit trail
    assertSeedIntegrity({
      users: createdUsers,
      tables: createdTables,
      bookings: createdBookings,
      sessions: createdSessions,
      invoices: createdInvoices,
      payments: createdPayments,
      vouchers: createdVouchers,
      walletTxs: createdWalletTxs,
      products: createdProducts,
      inventoryTxs: createdInvTxs,
      tournamentPlayers: createdTournamentPlayers,
      tournaments: createdTournaments,
      matches: createdMatches,
    });
    console.log("   ✅ Cross-collection business integrity validation passed");

    // 22. Seed Audit Logs
    console.log("🌱 22/22. Seeding System Audit Logs...");
    const auditLogsData = [
      {
        actor: adminUser._id,
        action: "USER_LOGIN",
        entityType: "User",
        entityId: adminUser._id.toString(),
        result: "success",
        metadata: { userAgent: "Chrome Desktop 128.0" },
        ipAddress: "127.0.0.1",
      },
      {
        actor: staff1User._id,
        action: "OPEN_TABLE_SESSION",
        entityType: "TableSession",
        entityId: createdSessions[0]._id.toString(),
        result: "success",
        metadata: { tableCode: "VIP-01" },
        ipAddress: "192.168.1.10",
      },
      {
        actor: staff1User._id,
        action: "PAUSE_TABLE_SESSION",
        entityType: "TableSession",
        entityId: createdSessions[14]._id.toString(),
        result: "success",
        metadata: { tableCode: "VIP-06", duration: "15m" },
        ipAddress: "192.168.1.10",
      },
      {
        actor: adminUser._id,
        action: "GENERATE_TOURNAMENT_BRACKET",
        entityType: "Tournament",
        entityId: completedTournament._id.toString(),
        result: "success",
        metadata: { playerCount: 8 },
        ipAddress: "127.0.0.1",
      },
      {
        actor: staff1User._id,
        action: "PROCESS_CHECKOUT",
        entityType: "Invoice",
        entityId: createdInvoices[2]._id.toString(),
        result: "success",
        metadata: { amount: 190000, method: "wallet" },
        ipAddress: "192.168.1.10",
      },
    ];
    const createdAuditLogs = await AuditLog.insertMany(auditLogsData);
    console.log(`   ✅ Audit Logs seeded: ${createdAuditLogs.length} records`);

    // Summary
    console.log("\n==================================================");
    console.log("🎉 FULL MASTER DATABASE RE-SEED COMPLETED SUCCESSFULLY!");
    console.log("==================================================");
    console.log("📋 SYSTEM ACCOUNTS SUMMARY (Password for all: Cuezone@2026):");
    console.log("   • Admin:      admin@cuezone.com     (Quản trị viên & Kho)");
    console.log(
      "   • Staff 1:    staff1@cuezone.com    (Nhân viên phục vụ / Thu ngân ca sáng)",
    );
    console.log(
      "   • Staff 2:    staff2@cuezone.com    (Nhân viên phục vụ / Thu ngân ca tối)",
    );
    console.log(
      "   • Customers:  customer1@gmail.com -> customer8@gmail.com (8 Hội viên)",
    );
    console.log("--------------------------------------------------");
    console.log("🎱 SEEDED COLLECTIONS OVERVIEW (Total: 22 Collections):");
    console.log(`   1. Roles:                  ${createdRoles.length} records`);
    console.log(
      `   2. PricingTiers:           ${createdPricingTiers.length} records`,
    );
    console.log(`   3. Users:                  ${createdUsers.length} records`);
    console.log(
      `   4. Tables:                 ${createdTables.length} records (27 bàn 3x3 layout)`,
    );
    console.log(
      `   5. Notifications:          ${createdNotifications.length} records`,
    );
    console.log(
      `   6. Products:               ${createdProducts.length} records`,
    );
    console.log(
      `   7. Suppliers:              ${createdSuppliers.length} records`,
    );
    console.log(
      `   8. MenuItems:              ${createdMenuItems.length} records`,
    );
    console.log(
      `   9. Tournaments:            ${createdTournaments.length} records`,
    );
    console.log(
      `   10. TournamentPlayers:     ${createdTournamentPlayers.length} records`,
    );
    console.log(
      `   11. Matches:               ${createdMatches.length} records`,
    );
    console.log(`   12. News:                  ${createdNews.length} records`);
    console.log(
      `   13. Vouchers:              ${createdVouchers.length} records`,
    );
    console.log(
      `   14. Bookings:              ${createdBookings.length} records`,
    );
    console.log(
      `   15. TableSessions:         ${createdSessions.length} records (Active/Paused/Completed)`,
    );
    console.log(
      `   16. Invoices:              ${createdInvoices.length} records (Open/Paid)`,
    );
    console.log(
      `   17. Payments:              ${createdPayments.length} records`,
    );
    console.log(
      `   18. Reviews:               ${createdReviews.length} records`,
    );
    console.log(
      `   19. WalletTransactions:    ${createdWalletTxs.length} records`,
    );
    console.log(
      `   20. InventoryTransactions: ${createdInvTxs.length} records`,
    );
    console.log(
      `   21. ImportReceipts:        ${createdImportReceipts.length} records`,
    );
    console.log(
      `   22. AuditLogs:             ${createdAuditLogs.length} records`,
    );
    console.log("==================================================");
  } catch (error) {
    console.error("\n❌ SEED FAILED WITH ERROR:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

runSeed();
