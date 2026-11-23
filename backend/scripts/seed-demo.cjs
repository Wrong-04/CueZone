// Script làm tươi dữ liệu vận hành cho buổi demo CueZone (an toàn, chạy lại nhiều lần không trùng lặp).
// Cách chạy: pnpm --filter backend seed:demo
// Giữ nguyên tài khoản, 27 bàn, 44 sản phẩm, nhà cung cấp, giải đấu, voucher và lịch sử thật;
// chỉ chuẩn hóa các trường còn thiếu và cập nhật dữ liệu vận hành demo theo đúng ngày giờ hiện tại.

const dns = require("node:dns");
const path = require("node:path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

// Tránh lỗi querySrv ECONNREFUSED trên một số mạng nội bộ khi kết nối MongoDB Atlas
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const VN_OFFSET_MS = 7 * 3600000;

function formatVnDate(date) {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  const y = vn.getUTCFullYear();
  const m = String(vn.getUTCMonth() + 1).padStart(2, "0");
  const d = String(vn.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatVnHHMM(date) {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  const h = String(vn.getUTCHours()).padStart(2, "0");
  const m = String(vn.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

async function main() {
  // Bảo vệ không cho chạy nhầm trên môi trường production
  if (process.env.NODE_ENV === "production") {
    console.error("[seed:demo] Từ chối chạy trên môi trường NODE_ENV=production.");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error("[seed:demo] Thiếu biến môi trường MONGO_URI / MONGODB_URI trong backend/.env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const now = new Date();
  const nowMs = now.getTime();
  const todayStr = formatVnDate(now);

  console.log(`[seed:demo] Kết nối DB: ${db.databaseName} | Thời điểm: ${todayStr} ${formatVnHHMM(now)} (VN)`);

  // 1. Dọn danh mục rác test ("thuốc" viết thường, không có sản phẩm nào tham chiếu)
  const junkCat = await db.collection("categories").findOne({ name: "thuốc" });
  if (junkCat) {
    const catFilters = [
      { category: junkCat._id },
      { categoryId: junkCat._id },
      { category: "thuốc" },
    ];
    if (junkCat.code) catFilters.push({ category: junkCat.code });
    const prodCount = await db.collection("products").countDocuments({ $or: catFilters });
    if (prodCount === 0) {
      await db.collection("categories").deleteOne({ _id: junkCat._id });
      console.log("[seed:demo] Đã xóa danh mục rác 'thuốc' (0 sản phẩm).");
    }
  }

  // 2. Gỡ quyền cũ 'wallet' khỏi role customer để đồng bộ với code hiện tại
  const roleRes = await db.collection("roles").updateMany(
    { "permissions.module": "wallet" },
    { $pull: { permissions: { module: "wallet" } } },
  );
  if (roleRes.modifiedCount > 0) {
    console.log(`[seed:demo] Đã gỡ quyền 'wallet' cũ khỏi ${roleRes.modifiedCount} role.`);
  }

  // 2b. Dọn các trường dữ liệu cũ (legacy) không còn nằm trong Mongoose schema hiện tại
  const cleanupTasks = [
    {
      col: "users",
      filter: { $or: [{ points: { $exists: true } }, { wallet: { $exists: true } }, { roleId: { $exists: true } }] },
      unset: { points: "", wallet: "", roleId: "" },
    },
    {
      col: "pool_tables",
      filter: { maintenanceReason: { $exists: true } },
      unset: { maintenanceReason: "" },
    },
    {
      col: "goods_receipts",
      filter: { $or: [{ name: { $exists: true } }, { startDate: { $exists: true } }] },
      unset: { name: "", startDate: "" },
    },
    {
      col: "vouchers",
      filter: {
        $or: [
          { usedCount: { $exists: true } },
          { expiredAt: { $exists: true } },
          { date: { $exists: true } },
          { name: { $exists: true } },
        ],
      },
      unset: { usedCount: "", expiredAt: "", date: "", name: "" },
    },
    {
      col: "wallets",
      filter: { status: { $exists: true } },
      unset: { status: "" },
    },
    {
      // Chỉ gỡ các trường hóa đơn legacy trên các bản ghi ĐÃ có object receipt mới
      col: "invoices",
      filter: {
        receipt: { $exists: true, $ne: null },
        $or: [{ invoiceNumber: { $exists: true } }, { payment: { $exists: true } }],
      },
      unset: {
        invoiceNumber: "",
        session: "",
        table: "",
        customer: "",
        createdBy: "",
        items: "",
        subtotal: "",
        discount: "",
        tax: "",
        totalAmount: "",
        paidAmount: "",
        paidAt: "",
        payment: "",
        voucher: "",
        voucherDiscount: "",
      },
    },
  ];
  for (const task of cleanupTasks) {
    const res = await db.collection(task.col).updateMany(task.filter, { $unset: task.unset });
    if (res.modifiedCount > 0) {
      console.log(`[seed:demo] Đã dọn trường thừa legacy trên ${res.modifiedCount} bản ghi của '${task.col}'.`);
    }
  }

  // 3. Chuẩn hóa trường 'kind' cho phiếu nhập kho cũ và tạo 1 phiếu Tồn đầu kỳ (opening) mẫu
  const backfilled = await db.collection("goods_receipts").updateMany(
    { kind: { $exists: false } },
    { $set: { kind: "purchase" } },
  );
  if (backfilled.modifiedCount > 0) {
    console.log(`[seed:demo] Đã bổ sung kind='purchase' cho ${backfilled.modifiedCount} phiếu nhập cũ.`);
  }

  const adminUser =
    (await db.collection("users").findOne({ email: "admin@cuezone.com" })) ||
    (await db.collection("users").findOne({ role: "admin" }));
  const staffUser =
    (await db.collection("users").findOne({ email: "staff1@cuezone.com" })) ||
    (await db.collection("users").findOne({ role: "staff" })) ||
    adminUser;

  const accessoryProducts = await db
    .collection("products")
    .find({ productType: "accessory" })
    .limit(3)
    .toArray();
  const fnbProducts = await db
    .collection("products")
    .find({ productType: "fnb", stock: { $gt: 0 } })
    .limit(6)
    .toArray();

  if (adminUser && accessoryProducts.length > 0) {
    const openingItems = accessoryProducts.map((p) => {
      const qty = 20;
      const unitCost = Number(p.costPrice ?? p.salePrice ?? 10000);
      return {
        product: p._id,
        productName: p.name,
        sku: p.sku || `SKU-${String(p._id).slice(-4).toUpperCase()}`,
        unit: p.unit || "Cái",
        quantity: qty,
        unitCost,
        totalCost: qty * unitCost,
      };
    });
    const openingTotal = openingItems.reduce((s, i) => s + i.totalCost, 0);
    await db.collection("goods_receipts").updateOne(
      { receiptNumber: "OPEN-DEMO-001" },
      {
        $set: {
          receiptNumber: "OPEN-DEMO-001",
          kind: "opening",
          items: openingItems,
          totalAmount: openingTotal,
          status: "completed",
          note: "[DEMO] Phiếu khai báo tồn đầu kỳ vật tư bàn bida",
          createdBy: adminUser._id,
          completedBy: adminUser._id,
          completedAt: new Date(nowMs - 2 * 86400000),
          updatedAt: now,
        },
        $setOnInsert: { createdAt: new Date(nowMs - 2 * 86400000) },
        $unset: { supplier: "" },
      },
      { upsert: true },
    );
    console.log("[seed:demo] Đã chuẩn bị phiếu tồn đầu kỳ OPEN-DEMO-001.");
  }

  // 4. Lấy danh sách bàn & khách hàng mẫu để thiết lập sơ đồ bàn POS sống động
  const tables = await db.collection("pool_tables").find({}).sort({ code: 1 }).toArray();
  if (tables.length === 0) {
    console.warn("[seed:demo] Không có bàn nào trong pool_tables, bỏ qua bước cập nhật bàn và hóa đơn.");
    await mongoose.disconnect();
    return;
  }
  const tableByCode = new Map(tables.map((t) => [t.code, t]));

  const customer1 = await db.collection("users").findOne({ email: "customer1@gmail.com" });
  const customer2 = await db.collection("users").findOne({ email: "customer2@gmail.com" });
  const customer3 = await db.collection("users").findOne({ email: "customer3@gmail.com" });
  const customer4 = await db.collection("users").findOne({ email: "customer5@gmail.com" });

  // Reset toàn bộ bàn về trống trước khi gán trạng thái demo chuẩn
  await db.collection("pool_tables").updateMany(
    {},
    {
      $set: { status: "available", updatedAt: now },
      $unset: { currentSession: "", bookedInfo: "" },
    },
  );

  const makeOrderItem = (prod, qty, minutesAgo) => ({
    id: new mongoose.Types.ObjectId().toString(),
    productId: prod._id,
    name: prod.name,
    price: Number(prod.salePrice || 15000),
    quantity: qty,
    category: prod.category || "Đồ uống",
    orderTime: formatVnHHMM(new Date(nowMs - minutesAgo * 60000)),
    status: "served",
  });

  const p0 = fnbProducts[0];
  const p1 = fnbProducts[1] || p0;
  const p2 = fnbProducts[2] || null;

  // 4a. 4 bàn ĐANG CHƠI (playing)
  const playingSpecs = [
    {
      code: "VIP-01",
      minutesAgo: 42,
      customer: customer1,
      fallbackName: "Trần Quốc Đạt",
      fallbackPhone: "0988123456",
      orders: p0
        ? [makeOrderItem(p0, 2, 30), ...(p1 && String(p1._id) !== String(p0._id) ? [makeOrderItem(p1, 1, 15)] : [])]
        : [],
      note: "Khách VIP Vàng - hay chơi bàn góc",
    },
    {
      code: "MTCH-01",
      minutesAgo: 78,
      customer: customer2,
      fallbackName: "Hoàng Nam",
      fallbackPhone: "0906789012",
      orders: p1
        ? [makeOrderItem(p1, 2, 50), ...(p2 && String(p2._id) !== String(p1._id) ? [makeOrderItem(p2, 1, 20)] : [])]
        : [],
      note: "Tập luyện giải Bank Pool",
    },
    {
      code: "STD-01",
      minutesAgo: 25,
      customer: customer3,
      fallbackName: "Lê Minh Quân",
      fallbackPhone: "0907890123",
      orders: p0 ? [makeOrderItem(p0, 2, 10)] : [],
      note: "",
    },
    {
      code: "STD-02",
      minutesAgo: 55,
      customer: null,
      fallbackName: "Nguyễn Quang Huy",
      fallbackPhone: "0912345678",
      orders: [],
      note: "Khách vãng lai - tiện demo gọi món/gộp bàn",
    },
  ];

  const activeSessionByCode = {};
  for (const spec of playingSpecs) {
    const tbl = tableByCode.get(spec.code);
    if (!tbl) continue;
    const startedAt = nowMs - spec.minutesAgo * 60000;
    const sessionId = new mongoose.Types.ObjectId().toString();
    activeSessionByCode[spec.code] = { table: tbl, sessionId };
    await db.collection("pool_tables").updateOne(
      { _id: tbl._id },
      {
        $set: {
          status: "playing",
          currentSession: {
            sessionId,
            checkoutState: "open",
            sessionStart: formatVnHHMM(new Date(startedAt)),
            startedAt,
            pricePerHour: Number(tbl.pricePerHour || 80000),
            isPaused: false,
            totalPausedMs: 0,
            carriedCost: 0,
            customerName: spec.customer?.name || spec.fallbackName,
            customerPhone: spec.customer?.phone || spec.fallbackPhone,
            ...(spec.customer ? { customerId: spec.customer._id, isMember: true } : { isMember: false }),
            orders: spec.orders,
            note: spec.note,
            deposit: 0,
            transfers: [],
          },
          updatedAt: now,
        },
      },
    );
  }

  // 4b. 1 bàn TẠM DỪNG (paused - mới tạm dừng 10 phút)
  const pausedTbl = tableByCode.get("VIP-02");
  if (pausedTbl) {
    const startedAt = nowMs - 65 * 60000;
    const pausedAt = nowMs - 10 * 60000;
    await db.collection("pool_tables").updateOne(
      { _id: pausedTbl._id },
      {
        $set: {
          status: "paused",
          currentSession: {
            sessionId: new mongoose.Types.ObjectId().toString(),
            checkoutState: "open",
            sessionStart: formatVnHHMM(new Date(startedAt)),
            startedAt,
            pricePerHour: Number(pausedTbl.pricePerHour || 120000),
            isPaused: true,
            pausedAt,
            totalPausedMs: 0,
            carriedCost: 0,
            customerName: customer4?.name || "Vũ Hải Nam",
            customerPhone: customer4?.phone || "0909012345",
            ...(customer4 ? { customerId: customer4._id, isMember: true } : { isMember: false }),
            orders: p0 ? [makeOrderItem(p0, 2, 40)] : [],
            note: "Khách tạm nghỉ giải lao 10 phút",
            deposit: 0,
            transfers: [],
          },
          updatedAt: now,
        },
      },
    );
  }

  // 4c. 1 bàn BẢO TRÌ (maintenance) để đủ 5 màu trạng thái trên sơ đồ bàn
  const maintTbl =
    tableByCode.get("STD-12") ||
    tables.find((t) => t.code.startsWith("STD-") && !["STD-01", "STD-02", "STD-03"].includes(t.code));
  if (maintTbl) {
    await db.collection("pool_tables").updateOne(
      { _id: maintTbl._id },
      { $set: { status: "maintenance", updatedAt: now } },
    );
  }

  // 5. Tạo 3 lịch đặt bàn hôm nay (2 'approved' gắn đúng bookingId vào pool_tables.bookedInfo, 1 'pending' chờ duyệt)
  await db.collection("bookings").deleteMany({ note: /^\[DEMO\]/ });

  const bookSoonDate = new Date(nowMs + 10 * 60000); // +10 phút -> GIỮ BÀN ĐÓN KHÁCH (xanh dương)
  const bookLaterDate = new Date(nowMs + 90 * 60000); // +90 phút -> BÀN TRỐNG + tag Hẹn HH:mm
  const bookPendingDate = new Date(nowMs + 120 * 60000); // +120 phút -> chờ duyệt trong Drawer Lịch Hẹn

  const mtch02 = tableByCode.get("MTCH-02");
  const std03 = tableByCode.get("STD-03");
  const vip03 = tableByCode.get("VIP-03");

  const demoBookings = [];
  if (mtch02) {
    const bookingId = new mongoose.Types.ObjectId();
    const timeStr = formatVnHHMM(bookSoonDate);
    const dateStr = formatVnDate(bookSoonDate);
    demoBookings.push({
      _id: bookingId,
      customerName: "Phạm Minh Tuấn",
      phone: "0911223344",
      table: mtch02._id,
      tableName: mtch02.name,
      date: dateStr,
      time: timeStr,
      duration: 2,
      estimatedCost: Number(mtch02.pricePerHour || 100000) * 2,
      deposit: 50000,
      paymentStatus: "paid",
      status: "approved",
      note: "[DEMO] Đã cọc VietQR 50k - chuẩn bị nhận bàn",
      preOrderItems: [],
      inventoryReserved: false,
      startDate: bookSoonDate,
      endDate: new Date(bookSoonDate.getTime() + 2 * 3600000),
      createdAt: new Date(nowMs - 3600000),
      updatedAt: now,
    });
    await db.collection("pool_tables").updateOne(
      { _id: mtch02._id },
      {
        $set: {
          status: "booked",
          bookedInfo: {
            customerName: "Phạm Minh Tuấn",
            phone: "0911223344",
            time: `${timeStr} (${dateStr})`,
            bookingId: String(bookingId),
          },
          updatedAt: now,
        },
      },
    );
  }

  if (std03) {
    const bookingId = new mongoose.Types.ObjectId();
    const timeStr = formatVnHHMM(bookLaterDate);
    const dateStr = formatVnDate(bookLaterDate);
    demoBookings.push({
      _id: bookingId,
      customerName: "Đặng Minh Trí",
      phone: "0910123456",
      table: std03._id,
      tableName: std03.name,
      date: dateStr,
      time: timeStr,
      duration: 2,
      estimatedCost: Number(std03.pricePerHour || 60000) * 2,
      deposit: 50000,
      paymentStatus: "paid",
      status: "approved",
      note: "[DEMO] Lịch hẹn sau 90 phút - vẫn cho đón khách chơi nhanh",
      preOrderItems: [],
      inventoryReserved: false,
      startDate: bookLaterDate,
      endDate: new Date(bookLaterDate.getTime() + 2 * 3600000),
      createdAt: new Date(nowMs - 2 * 3600000),
      updatedAt: now,
    });
    await db.collection("pool_tables").updateOne(
      { _id: std03._id },
      {
        $set: {
          status: "booked",
          bookedInfo: {
            customerName: "Đặng Minh Trí",
            phone: "0910123456",
            time: `${timeStr} (${dateStr})`,
            bookingId: String(bookingId),
          },
          updatedAt: now,
        },
      },
    );
  }

  if (vip03) {
    const timeStr = formatVnHHMM(bookPendingDate);
    const dateStr = formatVnDate(bookPendingDate);
    demoBookings.push({
      customerName: "Nguyễn Thị Lan",
      phone: "0933445566",
      table: vip03._id,
      tableName: vip03.name,
      date: dateStr,
      time: timeStr,
      duration: 2,
      estimatedCost: Number(vip03.pricePerHour || 120000) * 2,
      deposit: 0,
      paymentStatus: "not_required",
      status: "pending",
      note: "[DEMO] Yêu cầu đặt bàn chờ thu ngân xác nhận",
      preOrderItems: [],
      inventoryReserved: false,
      startDate: bookPendingDate,
      endDate: new Date(bookPendingDate.getTime() + 2 * 3600000),
      createdAt: new Date(nowMs - 15 * 60000),
      updatedAt: now,
    });
  }

  if (demoBookings.length > 0) {
    await db.collection("bookings").insertMany(demoBookings);
    console.log(`[seed:demo] Đã tạo ${demoBookings.length} lịch hẹn đặt bàn hôm nay (2 approved có bookingId, 1 pending).`);
  }

  // 6. Tạo 1 đơn gọi món trực tuyến đang 'pending' trên bàn VIP-01 để demo chuông/badge duyệt món
  await db.collection("customerorders").deleteMany({ note: /^\[DEMO\]/ });
  const vip01Active = activeSessionByCode["VIP-01"];
  if (vip01Active && p0 && customer1) {
    const orderItems = [
      {
        productId: p0._id,
        name: p0.name,
        category: p0.category || "drink",
        unitPrice: Number(p0.salePrice || 15000),
        quantity: 2,
      },
    ];
    if (p2 && String(p2._id) !== String(p0._id)) {
      orderItems.push({
        productId: p2._id,
        name: p2.name,
        category: p2.category || "food",
        unitPrice: Number(p2.salePrice || 25000),
        quantity: 1,
      });
    }
    const totalAmt = orderItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    await db.collection("customerorders").insertOne({
      orderCode: `FNB-DEMO-${Date.now().toString().slice(-6)}`,
      customerId: customer1._id,
      tableId: vip01Active.table._id,
      tableCode: vip01Active.table.code,
      tableName: vip01Active.table.name,
      sessionId: vip01Active.sessionId,
      items: orderItems,
      totalAmount: totalAmt,
      note: "[DEMO] Ít đá giúp mình nhé",
      status: "pending",
      statusMessage: "Đang chờ quầy duyệt",
      createdAt: new Date(nowMs - 3 * 60000),
      updatedAt: now,
    });
    console.log("[seed:demo] Đã tạo 1 đơn gọi món trực tuyến pending trên VIP-01.");
  }

  // 7. Làm tươi khách chờ demo trong DS Chờ (chỉ xóa bản ghi demo, không xóa khách thật)
  await db.collection("waitlists").deleteMany({ note: /^\[DEMO\]/ });
  await db.collection("waitlists").insertMany([
    {
      customerName: "Trần Quốc Bảo",
      phone: "0987654321",
      guests: 2,
      preferredType: "Bàn VIP",
      status: "waiting",
      note: "[DEMO] Yêu cầu cơ carbon",
      joinedTime: formatVnHHMM(new Date(nowMs - 8 * 60000)),
      createdAt: new Date(nowMs - 8 * 60000),
      updatedAt: now,
    },
    {
      customerName: "Lê Anh Khoa",
      phone: "0977889900",
      guests: 4,
      preferredType: "Bàn Bida Lỗ (Pool)",
      status: "waiting",
      note: "[DEMO] Nhóm 4 người chơi giải trí",
      joinedTime: formatVnHHMM(new Date(nowMs - 4 * 60000)),
      createdAt: new Date(nowMs - 4 * 60000),
      updatedAt: now,
    },
  ]);
  console.log("[seed:demo] Đã cập nhật 2 khách demo đang chờ trong DS Chờ.");

  // 8. Tạo 6 hóa đơn 'paid' đúng schema invoice.model.ts (sessionId, tableId, status, receipt)
  //    để Dashboard doanh thu & biểu đồ 7 ngày hiển thị số liệu chính xác
  await db.collection("invoices").deleteMany({
    $or: [
      { sessionId: /^DEMO-SESS-/ },
      { "receipt.invoiceCode": /^INV-DEMO-/ },
      { invoiceNumber: /^INV-DEMO-/ },
    ],
  });

  const demoInvoiceSpecs = [
    { sessionId: "DEMO-SESS-001", code: "INV-DEMO-001", hoursAgo: 2, tableCode: "STD-04", tablePrice: 120000, fnbPrice: 60000, method: "transfer", customer: customer1 },
    { sessionId: "DEMO-SESS-002", code: "INV-DEMO-002", hoursAgo: 4, tableCode: "VIP-04", tablePrice: 240000, fnbPrice: 95000, method: "cash", customer: customer2 },
    { sessionId: "DEMO-SESS-003", code: "INV-DEMO-003", hoursAgo: 6, tableCode: "MTCH-03", tablePrice: 200000, fnbPrice: 45000, method: "transfer", customer: customer3 },
    { sessionId: "DEMO-SESS-004", code: "INV-DEMO-004", hoursAgo: 26, tableCode: "VIP-05", tablePrice: 360000, fnbPrice: 120000, method: "transfer", customer: customer1 },
    { sessionId: "DEMO-SESS-005", code: "INV-DEMO-005", hoursAgo: 50, tableCode: "STD-05", tablePrice: 180000, fnbPrice: 75000, method: "cash", customer: customer4 },
    { sessionId: "DEMO-SESS-006", code: "INV-DEMO-006", hoursAgo: 74, tableCode: "MTCH-04", tablePrice: 300000, fnbPrice: 90000, method: "transfer", customer: customer2 },
  ];

  const invoiceDocs = [];
  for (const spec of demoInvoiceSpecs) {
    const tbl = tableByCode.get(spec.tableCode) || tables[0];
    const paidDate = new Date(nowMs - spec.hoursAgo * 3600000);
    const startDate = new Date(paidDate.getTime() - 120 * 60000);
    const total = spec.tablePrice + spec.fnbPrice;
    const cust = spec.customer || customer1;

    invoiceDocs.push({
      sessionId: spec.sessionId,
      tableId: tbl._id,
      status: "paid",
      receipt: {
        invoiceCode: spec.code,
        tableId: String(tbl._id),
        tableCode: tbl.code,
        tableName: tbl.name,
        customerName: cust?.name || "Khách lẻ",
        customerPhone: cust?.phone || "",
        ...(cust ? { memberId: String(cust._id) } : {}),
        sessionStart: formatVnHHMM(startDate),
        sessionEnd: formatVnHHMM(paidDate),
        durationMinutes: 120,
        playingCost: spec.tablePrice,
        carriedCost: 0,
        fnbTotal: spec.fnbPrice,
        subtotal: total,
        discountAmount: 0,
        finalAmount: total,
        paymentMethod: spec.method,
        paymentDetails: {
          cashAmount: spec.method === "cash" ? total : 0,
          transferAmount: spec.method === "transfer" ? total : 0,
        },
        orders: p0
          ? [
              {
                id: new mongoose.Types.ObjectId().toString(),
                productId: String(p0._id),
                name: p0.name,
                price: spec.fnbPrice,
                quantity: 1,
                category: p0.category || "Đồ uống",
                status: "served",
              },
            ]
          : [],
        cashierName: staffUser?.name || "Thu ngân",
        paidAt: paidDate.toISOString(),
        note: "[DEMO] Hóa đơn thanh toán tại quầy POS",
      },
      createdAt: paidDate,
      updatedAt: paidDate,
    });
  }

  if (invoiceDocs.length > 0) {
    await db.collection("invoices").insertMany(invoiceDocs);
    console.log(`[seed:demo] Đã tạo ${invoiceDocs.length} hóa đơn paid chuẩn schema Invoice (3 hóa đơn hôm nay + 3 ngày gần đây).`);
  }

  console.log("[seed:demo] HOÀN TẤT! Database đã sẵn sàng cho buổi demo.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("[seed:demo] LỖI:", err?.message || err);
  process.exit(1);
});
