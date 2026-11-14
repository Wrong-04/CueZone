# CueZone — Hệ Thống Quản Lý CLB Bida & Giải Đấu Bank Pool

Hệ thống quản lý vận hành CLB Bida toàn diện kết hợp điều hành giải đấu Bank Pool, kết nối thời gian thực trên nền tảng Web giữa **Quản trị viên (Admin)**, **Thu ngân / Nhân viên vận hành (POS / Staff)** và **Khách hàng / Hội viên (Customer)**.

---

## Tính Năng Chính

### 1. Cổng Khách Hàng & Hội Viên (`/customer`)

- **Tra cứu & Đặt bàn trước (`Booking`):** Xem sơ đồ bàn trống theo thời gian thực, đặt bàn trực tuyến theo khung giờ, đặt cọc và check-in tại quầy.
- **Theo dõi phiên chơi & Thanh toán (`CustomerPlaySession`):** Xem tiền giờ tạm tính theo từng khung giá, danh sách món đã gọi, áp dụng mã Voucher và gửi yêu cầu thanh toán (`cash` / `transfer`) để quầy xác nhận.
- **Gọi món tại bàn (`CustomerFnB`):** Xem thực đơn F&B theo danh mục động từ cơ sở dữ liệu, đặt món trực tiếp vào phiên bàn đang chơi.
- **Trung tâm Hội viên (`CustomerMembershipCenter`):** Tự động tích lũy điểm thưởng theo hóa đơn chi tiêu (1 điểm / 10.000đ) và phân hạng động theo điểm ví (`Đồng` từ 0 điểm, `Bạc` từ 500 điểm, `Vàng` từ 1.500 điểm) với ưu đãi giảm giá giờ chơi & F&B tương ứng.
- **Ví trả trước & Thanh toán trực tuyến (`CustomerWallet`):** Nạp tiền qua VNPay Sandbox hoặc gửi yêu cầu nạp ví đối soát tại quầy, thanh toán hóa đơn bằng số dư ví, xem lịch sử biến động số dư và lịch sử chơi/đánh giá (`PlayReview`).
- **Giải đấu, Tin tức & Luật chơi:** Xem danh sách giải đấu Bank Pool, đăng ký tham gia, xem nhánh đấu, tin tức CLB và điều lệ/luật thi đấu.
- **Xác thực tài khoản:** Đăng ký, đăng nhập JWT + Refresh Token, Google OAuth, quên/đổi mật khẩu qua OTP Email.

### 2. Giao Diện Thu Ngân & Sơ Đồ Bàn POS (`/admin/pos`)

- **Sơ đồ bàn thời gian thực (Socket.io):** Theo dõi trạng thái bàn (`available`, `playing`, `paused`, `booked`), mở bàn, check-in lịch đặt trước, tạm dừng tính giờ, chuyển bàn / gộp bàn (bảo toàn tiền giờ lũy kế `carriedCost` và lịch sử chuyển bàn), quản lý danh sách chờ (`Waitlist`).
- **Order & Kiểm soát món tại bàn:** Thêm đồ uống, món ăn, phụ kiện vào phiên chơi; hỗ trợ hủy món có ghi nhận lý do và hoàn tồn kho sản phẩm.
- **Nhận diện & Đăng ký nhanh hội viên tại quầy:** Tra cứu SĐT để tự động áp dụng đúng hạng & mức giảm giá theo điểm tích lũy thực tế (`getMemberTier`), hiển thị danh sách voucher khả dụng hoặc đăng ký nhanh hội viên mới.
- **Thanh toán đa phương thức & In hóa đơn:** Kiểm tra điều kiện Voucher (`minOrderAmount`, hiệu lực thời gian, tổng lượt, giới hạn 1 lần/khách, quyền hội viên VIP từ hạng Bạc trở lên), hỗ trợ thanh toán Tiền mặt, Chuyển khoản QR, Ví hội viên, hoặc Kết hợp (`split`), xuất phiếu thanh toán nhiệt.

### 3. Cổng Quản Trị Hệ Thống (`/admin`)

- **Quản lý Bàn, Lịch đặt & Khung giá (`PricingTier`):** Thiết lập loại bàn, khu vực và bảng giá giờ linh hoạt theo khung giờ.
- **Thực đơn F&B & Danh mục động (`ProductCategory`):** Tách bạch loại hàng hóa (`fnb` bán tại quầy/khách gọi, `ingredient` nguyên liệu nội bộ, `accessory` phụ kiện/vật tư), quản lý danh mục trực tiếp trên MongoDB không hardcode.
- **Kho & Chuỗi cung ứng:** Quản lý nhà cung cấp (`Supplier`), lập phiếu nhập kho (`GoodsReceipt`), kiểm kê & điều chỉnh tồn kho (`StockCheck`), theo dõi hao hụt vật tư (`AccessoryWaste`), thống kê xuất nhập tồn.
- **Quản lý Ưu đãi & Voucher (`VoucherManagementPage`):** Tạo mã giảm `%` (có trần tối đa) hoặc giảm tiền cố định; phân nhóm đối tượng (`all`, `new_member`, `vip`); kiểm soát thời gian bắt đầu/kết thúc (bao gồm vô thời hạn), lọc theo trạng thái (`Đang hoạt động`, `Sắp bắt đầu`, `Tạm dừng`, `Hết hạn / Hết lượt`) và xem lịch sử lượt dùng.
- **Điều hành Giải đấu Bank Pool (`AdminTournamentsPage` & `TournamentFeesPage`):** Tạo giải đấu, đăng ký cơ thủ tại quầy hoặc online, đối soát lệ phí (hỗ trợ SePay Webhook), sinh nhánh đấu và cập nhật tỉ số trận đấu.
- **Nhân sự, Hóa đơn, Ví & Báo cáo:** Quản lý nhân viên theo các vai trò hệ thống (`admin`, `staff`, `cashier`, `warehouse`, `referee`, `customer`), duyệt nạp ví, quản lý hóa đơn (bao gồm hoàn lượt voucher khi hủy hóa đơn), tin tức, cấu hình hệ thống, và báo cáo doanh thu / hiệu suất bàn / kho hàng (biểu đồ Chart.js, Recharts & xuất Excel).

---

## Công Nghệ & Kiến Trúc

- **Monorepo (`pnpm` workspace):** gồm 2 package chính là `backend/` và `frontend/`.
- **Frontend:** React 19, TypeScript 5.4, Vite 5, Tailwind CSS 3, Ant Design 6 + `@ant-design/icons`, UI Wrapper tokens tại `frontend/src/shared/ui/`, React Router DOM 6, Axios, Socket.io-client, Chart.js / Recharts, `xlsx`, `qrcode` / `html5-qrcode`.
- **Backend:** Node.js, Express 4, TypeScript 5.4, Mongoose 8, Socket.io 4, JWT (`jsonwebtoken`) + `bcryptjs`, `class-validator`, Nodemailer, Cloudinary, VNPay Sandbox / SePay Webhook, `node-cron`, ExcelJS.
- **Cơ sở dữ liệu:** MongoDB (yêu cầu hỗ trợ Transaction — Replica Set hoặc MongoDB Atlas).

### Cấu Trúc Thư Mục Chính

```text
CueZone/
├── backend/
│   ├── scripts/             # Kịch bản migration & kiểm thử tích hợp (check:*)
│   ├── src/
│   │   ├── config/          # Cấu hình DB, môi trường, chuẩn hóa ERD
│   │   ├── modules/         # auth, booking, customer-order, fnb, goods-receipt, inventory,
│   │   │                    # invoice, match, member, news, notification, payment, pricing,
│   │   │                    # product, report, review, role, rule, session, supplier, table,
│   │   │                    # tournament, user, voucher, waitlist, wallet, audit
│   │   └── utils/           # Socket holder & tiện ích dùng chung
│   ├── seed.js              # Script nạp dữ liệu mẫu demo
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── admin/       # Các màn hình quản trị & báo cáo
│   │   │   ├── auth/        # Đăng nhập, đăng ký, quên mật khẩu
│   │   │   ├── customer/    # Cổng khách hàng & hội viên
│   │   │   └── pos/         # Sơ đồ bàn, thu ngân & hooks/modals POS
│   │   ├── services/        # Tầng gọi API & Socket
│   │   ├── shared/ui/       # Design system bọc Ant Design theo token hệ thống
│   │   └── types/           # Định nghĩa TypeScript dùng chung
│   ├── vite.config.ts       # Dev server port 5556, proxy /api & /socket.io -> :5000
│   └── Dockerfile
├── docker-compose.yml
├── AGENTS.md                # Quy ước phát triển & kiểm thử dự án
└── package.json
```

---

## Hướng Dẫn Cài Đặt & Khởi Chạy

### Yêu cầu môi trường

- **Node.js** >= 20 LTS
- **pnpm** 10 (`packageManager`: `pnpm@10.34.7`)
- **MongoDB** chạy dạng Replica Set (local hoặc MongoDB Atlas) để hỗ trợ `mongoose.connection.transaction`

### Bước 1: Tạo file cấu hình `.env`

Sao chép từ các file mẫu có sẵn:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Kiểm tra các biến quan trọng:

- **`backend/.env`:**
  - `PORT=5000`
  - `CLIENT_URL=http://localhost:5556`
  - `MONGO_URI` (MongoDB local replica set hoặc MongoDB Atlas URI)
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`
  - Các biến tùy chọn theo tính năng sử dụng: `CLOUDINARY_*` (upload ảnh), `SMTP_*` / `EMAIL_FROM` (gửi OTP Email), `GOOGLE_CLIENT_*` (đăng nhập Google), `VNPAY_*` (nạp ví Sandbox — lưu ý chỉnh `VNPAY_RETURN_URL=http://localhost:5556/customer/wallet` nếu chạy frontend ở cổng `5556`), `SEPAY_*` (đối soát chuyển khoản giải đấu).
- **`frontend/.env`:**
  - `VITE_API_URL=http://localhost:5000/api/v1`
  - `VITE_SOCKET_URL=http://localhost:5000`
  - `VITE_APP_NAME="CueZone Billiards System"`
  - `VITE_GOOGLE_CLIENT_ID` (nếu bật Google OAuth)

### Bước 2: Cài đặt dependencies

Tại thư mục gốc dự án:

```bash
pnpm install
```

### Bước 3: Nạp dữ liệu mẫu (tùy chọn, dùng cho môi trường dev)

> **Cảnh báo:** Lệnh `seed` sẽ **xóa toàn bộ dữ liệu hiện có** của các collection mẫu trong database cấu hình tại `MONGO_URI` rồi nạp lại dữ liệu demo (không chạy ở `NODE_ENV=production`). Chỉ thực hiện trên database dev/test cá nhân.

```bash
pnpm --filter backend seed -- --yes
```

### Bước 4: Khởi chạy môi trường phát triển

Khởi động đồng thời cả Backend (`:5000`) và Frontend (`:5556`) từ thư mục gốc:

```bash
pnpm dev
```

- **Frontend Web:** [http://localhost:5556](http://localhost:5556)
- **Backend API:** [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
- **Socket.io:** `http://localhost:5000`

### Chạy bằng Docker Compose (tùy chọn)

Đảm bảo đã cấu hình đầy đủ `backend/.env` (đặc biệt `MONGO_URI`), sau đó chạy tại thư mục gốc:

```bash
docker compose up -d --build
```

- **Frontend (Nginx):** [http://localhost:5556](http://localhost:5556) (proxy `/api/v1` và `/socket.io` tới container backend)
- **Backend API:** [http://localhost:5000](http://localhost:5000)

---

## Các Lệnh Build, Format & Kiểm Thử

### Build & Định dạng code

```bash
# Build toàn bộ backend (tsc) và frontend (tsc -b && vite build)
pnpm build

# Kiểm tra / format code toàn workspace với Prettier
pnpm format:check
pnpm format

# Lint frontend bằng oxlint
pnpm --filter frontend lint
```

### Kiểm thử tích hợp Backend

> Các script `check:*` kết nối tới `MONGO_URI` trong `backend/.env` nhưng tạo một database tạm riêng (và xóa sau khi chạy xong). Cần MongoDB có Transaction (Replica Set / Atlas).

```bash
pnpm --filter backend check:pos              # Luồng mở bàn, tính tiền, POS, hạng thành viên
pnpm --filter backend check:vouchers         # CRUD Voucher, validate điều kiện, redeem & lịch sử
pnpm --filter backend check:customer-orders  # Luồng đặt món từ cổng khách hàng
pnpm --filter backend check:tournament-reg   # Đăng ký giải đấu & lệ phí
pnpm --filter backend check:bracket          # Sinh nhánh đấu & trận đấu
pnpm --filter backend check:news             # Quản lý tin tức
```

---

## Tài Khoản Demo (Sau Khi Chạy `seed.js`)

> Mật khẩu mặc định cho tất cả tài khoản demo: **`admin123`**

| Vai trò              | Họ tên (Seed)                      | Email đăng nhập       | Số điện thoại | Ghi chú sử dụng                                                |
| :------------------- | :--------------------------------- | :-------------------- | :------------ | :------------------------------------------------------------- |
| **Admin**            | Nguyễn Tiến Dũng (Chủ CLB)         | `admin@cuezone.com`   | `0901234567`  | Quản trị toàn hệ thống (`/admin`)                              |
| **Staff (Ca sáng)**  | Nguyễn Văn Hùng                    | `staff1@cuezone.com`  | `0902345678`  | Sơ đồ bàn, thu ngân POS (`/admin/pos`)                         |
| **Staff (Ca tối)**   | Trần Thị Mai                       | `staff2@cuezone.com`  | `0903456789`  | Phục vụ, thu ngân, duyệt booking (`/admin/pos`)                |
| **Staff (Vận hành)** | Lê Thuỳ Trang (Nhân Viên Vận Hành) | `staff@cuezone.com`   | —             | Vận hành quầy & sơ đồ bàn                                      |
| **Customer**         | Trần Quốc Đạt                      | `customer1@gmail.com` | `0988123456`  | Cổng khách hàng (`/customer`), cùng `customer2`..`8@gmail.com` |

---
