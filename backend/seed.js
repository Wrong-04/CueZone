/**
 * CUEZONE BILLIARDS — DATABASE SEED
 * Chạy: node seed.js (từ thư mục backend/)
 * Đảm bảo đã có file .env với MONGO_URI hợp lệ
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/cuezone_db";

// ==========================================
// SCHEMAS (Định nghĩa nhanh để seed)
// ==========================================

const UserSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    password: String,
    role: String,
    phone: String,
    avatar: String,
    isActive: Boolean,
    points: Number,
    wallet: Number,
  },
  { timestamps: true },
);
const TableSchema = new mongoose.Schema(
  {
    tableNumber: Number,
    name: String,
    type: String,
    status: String,
    pricePerHour: Number,
    priceNight: Number,
    description: String,
  },
  { timestamps: true },
);
const ProductSchema = new mongoose.Schema(
  {
    name: String,
    sku: String,
    category: String,
    unit: String,
    costPrice: Number,
    salePrice: Number,
    stock: Number,
    minStock: Number,
    imageUrl: String,
    isActive: Boolean,
  },
  { timestamps: true },
);
const SupplierSchema = new mongoose.Schema(
  {
    name: String,
    contactPerson: String,
    phone: String,
    email: String,
    address: String,
    note: String,
  },
  { timestamps: true },
);
const MenuItemSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    price: Number,
    imageUrl: String,
    description: String,
    isAvailable: Boolean,
  },
  { timestamps: true },
);
const TournamentSchema = new mongoose.Schema(
  {
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    maxPlayers: Number,
    registrationFee: Number,
    prizePool: String,
    status: String,
    rules: String,
  },
  { timestamps: true },
);
const NewsSchema = new mongoose.Schema(
  {
    title: String,
    content: String,
    imageUrl: String,
    category: String,
    isPublished: Boolean,
  },
  { timestamps: true },
);
const VoucherSchema = new mongoose.Schema(
  {
    code: String,
    discountType: String,
    discountValue: Number,
    minOrderAmount: Number,
    maxUses: Number,
    usedCount: Number,
    expiredAt: Date,
    isActive: Boolean,
  },
  { timestamps: true },
);

const User = mongoose.model("User", UserSchema);
const Table = mongoose.model("Table", TableSchema);
const Product = mongoose.model("Product", ProductSchema);
const Supplier = mongoose.model("Supplier", SupplierSchema);
const MenuItem = mongoose.model("MenuItem", MenuItemSchema);
const Tournament = mongoose.model("Tournament", TournamentSchema);
const News = mongoose.model("News", NewsSchema);
const Voucher = mongoose.model("Voucher", VoucherSchema);

// ==========================================
// DATA
// ==========================================

// UC01, UC02, UC42, UC43 — Tài khoản người dùng
const users = [
  {
    name: "Admin CueZone",
    email: "admin@cuezone.com",
    password: "123",
    role: "admin",
    phone: "0901234567",
    isActive: true,
    points: 0,
    wallet: 0,
  },
  {
    name: "Nguyễn Văn Hùng",
    email: "staff1@cuezone.com",
    password: "123",
    role: "staff",
    phone: "0902345678",
    isActive: true,
    points: 0,
    wallet: 0,
  },
  {
    name: "Trần Thị Mai",
    email: "staff2@cuezone.com",
    password: "123",
    role: "staff",
    phone: "0903456789",
    isActive: true,
    points: 0,
    wallet: 0,
  },
  {
    name: "Lê Quang Kho",
    email: "warehouse@cuezone.com",
    password: "123",
    role: "warehouse",
    phone: "0904567890",
    isActive: true,
    points: 0,
    wallet: 0,
  },
  {
    name: "Phạm Minh Tuấn",
    email: "customer1@gmail.com",
    password: "123",
    role: "customer",
    phone: "0905678901",
    isActive: true,
    points: 1250,
    wallet: 500000,
  },
  {
    name: "Hoàng Bá Long",
    email: "customer2@gmail.com",
    password: "123",
    role: "customer",
    phone: "0906789012",
    isActive: true,
    points: 3400,
    wallet: 1200000,
  },
  {
    name: "Vũ Thành Đạt",
    email: "customer3@gmail.com",
    password: "123",
    role: "customer",
    phone: "0907890123",
    isActive: true,
    points: 850,
    wallet: 200000,
  },
  {
    name: "Đỗ Thanh Bình",
    email: "customer4@gmail.com",
    password: "123",
    role: "customer",
    phone: "0908901234",
    isActive: true,
    points: 5600,
    wallet: 3000000,
  },
];

// UC44 — Bàn & Cấu hình giá giờ
const tables = [
  {
    tableNumber: 1,
    name: "Bàn 01",
    type: "Pool",
    status: "available",
    pricePerHour: 60000,
    priceNight: 80000,
    description: "Bàn Pool tiêu chuẩn 9 feet",
  },
  {
    tableNumber: 2,
    name: "Bàn 02",
    type: "Pool",
    status: "playing",
    pricePerHour: 60000,
    priceNight: 80000,
    description: "Bàn Pool tiêu chuẩn 9 feet",
  },
  {
    tableNumber: 3,
    name: "Bàn 03",
    type: "Pool",
    status: "booked",
    pricePerHour: 60000,
    priceNight: 80000,
    description: "Bàn Pool tiêu chuẩn 9 feet",
  },
  {
    tableNumber: 4,
    name: "Bàn 04",
    type: "Pool",
    status: "available",
    pricePerHour: 60000,
    priceNight: 80000,
    description: "Bàn Pool tiêu chuẩn 9 feet",
  },
  {
    tableNumber: 5,
    name: "Bàn 05",
    type: "Carom",
    status: "available",
    pricePerHour: 70000,
    priceNight: 90000,
    description: "Bàn Carom 3 băng cao cấp",
  },
  {
    tableNumber: 6,
    name: "Bàn 06",
    type: "Carom",
    status: "playing",
    pricePerHour: 70000,
    priceNight: 90000,
    description: "Bàn Carom 3 băng cao cấp",
  },
  {
    tableNumber: 7,
    name: "Bàn 07",
    type: "Carom",
    status: "maintenance",
    pricePerHour: 70000,
    priceNight: 90000,
    description: "Bàn Carom 3 băng cao cấp",
  },
  {
    tableNumber: 8,
    name: "Bàn 08",
    type: "Pool",
    status: "available",
    pricePerHour: 60000,
    priceNight: 80000,
    description: "Bàn Pool tiêu chuẩn 9 feet",
  },
  {
    tableNumber: 9,
    name: "Bàn VIP 01",
    type: "Pool",
    status: "available",
    pricePerHour: 120000,
    priceNight: 150000,
    description: "Phòng VIP riêng biệt, điều hoà",
  },
  {
    tableNumber: 10,
    name: "Bàn VIP 02",
    type: "Carom",
    status: "available",
    pricePerHour: 130000,
    priceNight: 160000,
    description: "Phòng VIP riêng biệt, điều hoà",
  },
];

// UC09, UC23 — Menu F&B
const menuItems = [
  // Đồ uống
  {
    name: "Nước lọc đóng chai",
    category: "drink",
    price: 10000,
    description: "Chai 500ml",
    isAvailable: true,
  },
  {
    name: "Trà đá",
    category: "drink",
    price: 10000,
    description: "Trà đá miễn phí kèm ấm",
    isAvailable: true,
  },
  {
    name: "Pepsi / 7UP lon",
    category: "drink",
    price: 15000,
    description: "Lon 330ml",
    isAvailable: true,
  },
  {
    name: "Bia Tiger lon",
    category: "drink",
    price: 25000,
    description: "Lon 330ml",
    isAvailable: true,
  },
  {
    name: "Bia Heineken lon",
    category: "drink",
    price: 30000,
    description: "Lon 330ml",
    isAvailable: true,
  },
  {
    name: "Bia Tiger chai",
    category: "drink",
    price: 22000,
    description: "Chai 333ml",
    isAvailable: true,
  },
  {
    name: "Cà phê đen đá",
    category: "drink",
    price: 25000,
    description: "Cà phê phin truyền thống",
    isAvailable: true,
  },
  {
    name: "Cà phê sữa đá",
    category: "drink",
    price: 30000,
    description: "Cà phê sữa đặc",
    isAvailable: true,
  },
  {
    name: "Nước cam tươi",
    category: "drink",
    price: 35000,
    description: "Cam vắt tươi 100%",
    isAvailable: true,
  },
  {
    name: "Sinh tố bơ",
    category: "drink",
    price: 40000,
    description: "Sinh tố bơ sữa tươi",
    isAvailable: true,
  },
  // Đồ ăn nhẹ
  {
    name: "Hạt hướng dương",
    category: "snack",
    price: 20000,
    description: "Gói 200g",
    isAvailable: true,
  },
  {
    name: "Hạt điều rang muối",
    category: "snack",
    price: 35000,
    description: "Gói 100g",
    isAvailable: true,
  },
  {
    name: "Bánh mì nướng phô mai",
    category: "snack",
    price: 25000,
    description: "2 miếng",
    isAvailable: true,
  },
  {
    name: "Khoai tây chiên",
    category: "snack",
    price: 30000,
    description: "Suất nhỏ kèm tương ớt",
    isAvailable: true,
  },
  {
    name: "Xúc xích nướng",
    category: "snack",
    price: 20000,
    description: "1 cái",
    isAvailable: true,
  },
  {
    name: "Mì gói nấu",
    category: "snack",
    price: 25000,
    description: "Các loại",
    isAvailable: true,
  },
];

// UC31, UC32 — Danh mục hàng hóa & Tồn kho
const products = [
  // Đồ uống (kho)
  {
    name: "Pepsi lon 330ml",
    sku: "DRK-001",
    category: "drink",
    unit: "lon",
    costPrice: 9000,
    salePrice: 15000,
    stock: 120,
    minStock: 24,
    isActive: true,
  },
  {
    name: "7UP lon 330ml",
    sku: "DRK-002",
    category: "drink",
    unit: "lon",
    costPrice: 9000,
    salePrice: 15000,
    stock: 80,
    minStock: 24,
    isActive: true,
  },
  {
    name: "Bia Tiger lon 330ml",
    sku: "DRK-003",
    category: "drink",
    unit: "lon",
    costPrice: 14000,
    salePrice: 25000,
    stock: 200,
    minStock: 48,
    isActive: true,
  },
  {
    name: "Bia Heineken lon 330ml",
    sku: "DRK-004",
    category: "drink",
    unit: "lon",
    costPrice: 18000,
    salePrice: 30000,
    stock: 150,
    minStock: 48,
    isActive: true,
  },
  {
    name: "Bia Tiger chai 333ml",
    sku: "DRK-005",
    category: "drink",
    unit: "chai",
    costPrice: 12000,
    salePrice: 22000,
    stock: 10,
    minStock: 48,
    isActive: true,
  }, // Low stock
  {
    name: "Nước lọc Aquafina 500ml",
    sku: "DRK-006",
    category: "drink",
    unit: "chai",
    costPrice: 5000,
    salePrice: 10000,
    stock: 200,
    minStock: 50,
    isActive: true,
  },
  // Phụ kiện bida
  {
    name: "Đầu cơ 13mm",
    sku: "ACC-001",
    category: "accessory",
    unit: "cái",
    costPrice: 15000,
    salePrice: 0,
    stock: 30,
    minStock: 10,
    isActive: true,
  },
  {
    name: "Lơ xanh (Chalk)",
    sku: "ACC-002",
    category: "accessory",
    unit: "viên",
    costPrice: 5000,
    salePrice: 0,
    stock: 5,
    minStock: 20,
    isActive: true,
  }, // Low stock
  {
    name: "Bao tay bida",
    sku: "ACC-003",
    category: "accessory",
    unit: "cái",
    costPrice: 20000,
    salePrice: 0,
    stock: 15,
    minStock: 5,
    isActive: true,
  },
  {
    name: "Khăn lau bàn",
    sku: "ACC-004",
    category: "accessory",
    unit: "cái",
    costPrice: 30000,
    salePrice: 0,
    stock: 20,
    minStock: 5,
    isActive: true,
  },
  // Nguyên liệu pha chế
  {
    name: "Cà phê hạt rang xay 1kg",
    sku: "ING-001",
    category: "ingredient",
    unit: "kg",
    costPrice: 120000,
    salePrice: 0,
    stock: 3,
    minStock: 2,
    isActive: true,
  },
  {
    name: "Sữa đặc Ông Thọ hộp",
    sku: "ING-002",
    category: "ingredient",
    unit: "hộp",
    costPrice: 18000,
    salePrice: 0,
    stock: 24,
    minStock: 10,
    isActive: true,
  },
];

// UC33 — Nhà cung cấp
const suppliers = [
  {
    name: "Công ty TNHH Bia Sài Gòn Miền Bắc",
    contactPerson: "Anh Khoa",
    phone: "0241234567",
    email: "saigonbeer.hn@gmail.com",
    address: "123 Phạm Văn Đồng, Hà Nội",
    note: "Giao hàng thứ 2, 4, 6",
  },
  {
    name: "Đại lý nước giải khát Pepsi HN",
    contactPerson: "Chị Lan",
    phone: "0242345678",
    email: "pepsihn@gmail.com",
    address: "45 Nguyễn Trãi, Hà Nội",
    note: "Thanh toán cuối tháng",
  },
  {
    name: "Phụ kiện Bida Thành Công",
    contactPerson: "Anh Thành",
    phone: "0243456789",
    email: "bidathanhcong@gmail.com",
    address: "78 Đinh Tiên Hoàng, Hà Nội",
    note: "Nhập phụ kiện mỗi tháng 1 lần",
  },
  {
    name: "Cà phê Trung Nguyên chi nhánh HN",
    contactPerson: "Chị Hoa",
    phone: "0244567890",
    email: "trungnguyen.hn@gmail.com",
    address: "22 Lý Thường Kiệt, Hà Nội",
    note: "",
  },
];

// UC47, UC48, UC49 — Giải đấu Bank Pool
const tournaments = [
  {
    name: "Giải Bank Pool Mở Rộng CueZone Cup 2026",
    description:
      "Giải đấu phong trào Bank Pool lớn nhất CLB, mở cho tất cả hội viên từ hạng Bạc trở lên. Thể thức thi đấu vòng tròn tính điểm → Top 8 vào bán kết → Chung kết.",
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-15"),
    maxPlayers: 16,
    registrationFee: 200000,
    prizePool:
      "Giải Nhất: 3.000.000đ | Giải Nhì: 1.500.000đ | Giải Ba: 800.000đ",
    status: "registering",
    rules:
      "Luật Bank Pool tiêu chuẩn Việt Nam. Mỗi ván đấu thi đấu đến 5 bi. Cơ thủ phải tuyên bố bi sẽ đánh trước mỗi cú đánh.",
  },
  {
    name: "Giải Nội Bộ CueZone Tháng 8/2026",
    description:
      "Giải giao hữu nội bộ hàng tháng, thể thức đấu loại trực tiếp (Knock-out).",
    startDate: new Date("2026-08-20"),
    endDate: new Date("2026-08-25"),
    maxPlayers: 8,
    registrationFee: 100000,
    prizePool: "Giải Nhất: 1.000.000đ | Giải Nhì: 500.000đ",
    status: "finished",
    rules: "Luật Bank Pool tiêu chuẩn. Knock-out đơn.",
  },
];

// UC18, UC46 — Tin tức & Sự kiện
const news = [
  {
    title: "CueZone khai trương thêm 2 bàn VIP mới!",
    content:
      "CLB CueZone vừa nâng cấp và khai trương thêm 2 phòng VIP riêng biệt với đầy đủ điều hoà, ghế sofa cao cấp...",
    category: "news",
    isPublished: true,
  },
  {
    title: "Lịch giải CueZone Cup 2026 chính thức công bố",
    content:
      "Ban tổ chức CLB CueZone xin thông báo lịch thi đấu chính thức của giải Bank Pool CueZone Cup 2026...",
    category: "event",
    isPublished: true,
  },
  {
    title: "Khuyến mãi tháng 9: Nạp ví 500k tặng 50k",
    content:
      "Trong tháng 9/2026, khi nạp từ 500.000đ vào ví trả trước, hội viên sẽ được tặng thêm 50.000đ bonus...",
    category: "promotion",
    isPublished: true,
  },
  {
    title: "Hướng dẫn luật Bank Pool cơ bản",
    content:
      "Bank Pool là một môn bida được chơi trên bàn Pool 9 feet. Người chơi phải đánh bi sao cho bi chạm băng trước khi vào lỗ...",
    category: "rule",
    isPublished: true,
  },
];

// UC27 — Voucher / Mã giảm giá
const vouchers = [
  {
    code: "WELCOME10",
    discountType: "percent",
    discountValue: 10,
    minOrderAmount: 100000,
    maxUses: 100,
    usedCount: 23,
    expiredAt: new Date("2026-12-31"),
    isActive: true,
  },
  {
    code: "CUEZONE50K",
    discountType: "fixed",
    discountValue: 50000,
    minOrderAmount: 300000,
    maxUses: 50,
    usedCount: 12,
    expiredAt: new Date("2026-10-31"),
    isActive: true,
  },
  {
    code: "VIP20",
    discountType: "percent",
    discountValue: 20,
    minOrderAmount: 200000,
    maxUses: 30,
    usedCount: 5,
    expiredAt: new Date("2026-11-30"),
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

// ==========================================
// SEED FUNCTION
// ==========================================
async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected!\n");

    // Xoá dữ liệu cũ
    console.log("🗑️  Clearing old data...");
    await Promise.all([
      User.deleteMany({}),
      Table.deleteMany({}),
      Product.deleteMany({}),
      Supplier.deleteMany({}),
      MenuItem.deleteMany({}),
      Tournament.deleteMany({}),
      News.deleteMany({}),
      Voucher.deleteMany({}),
    ]);

    // Insert dữ liệu mới
    console.log("🌱 Seeding data...\n");

    await User.insertMany(users);
    console.log(`  ✅ Users:       ${users.length} records`);

    await Table.insertMany(tables);
    console.log(`  ✅ Tables:      ${tables.length} records`);

    await MenuItem.insertMany(menuItems);
    console.log(`  ✅ Menu Items:  ${menuItems.length} records`);

    await Product.insertMany(products);
    console.log(`  ✅ Products:    ${products.length} records`);

    await Supplier.insertMany(suppliers);
    console.log(`  ✅ Suppliers:   ${suppliers.length} records`);

    await Tournament.insertMany(tournaments);
    console.log(`  ✅ Tournaments: ${tournaments.length} records`);

    await News.insertMany(news);
    console.log(`  ✅ News:        ${news.length} records`);

    await Voucher.insertMany(vouchers);
    console.log(`  ✅ Vouchers:    ${vouchers.length} records`);

    console.log("\n🎱 Seed completed successfully!");
    console.log("📌 Test accounts:");
    console.log("   Admin    → admin@cuezone.com");
    console.log("   Staff    → staff1@cuezone.com");
    console.log("   Warehouse → warehouse@cuezone.com");
    console.log("   Customer → customer1@gmail.com");
  } catch (err) {
    console.error("❌ Seed failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB.");
  }
}

seed();
