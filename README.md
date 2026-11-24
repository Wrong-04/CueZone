# CueZone — Hệ Thống Quản Lý CLB Bida & Giải Đấu Bank Pool

## Giới Thiệu Dự Án

**CueZone** là nền tảng Web quản lý vận hành toàn diện dành cho câu lạc bộ bida hiện đại, kết hợp hệ thống tổ chức và điều hành giải đấu **Bank Pool**. Dự án giải quyết bài toán số hóa quy trình phục vụ tại quán — từ đặt bàn trực tuyến, tính giờ tự động theo khung giá, gọi món tại bàn, kiểm soát tồn kho cho tới thanh toán VietQR tự động và chăm sóc hội viên.

Hệ thống được thiết kế đồng bộ thời gian thực qua **Socket.io** cho 3 nhóm người dùng chính:
- **Khách hàng / Hội viên:** Đặt bàn trước, theo dõi tiền giờ & gọi món ngay tại bàn, tích điểm nâng hạng và đăng ký giải đấu.
- **Thu ngân / Nhân viên vận hành (POS):** Theo dõi sơ đồ bàn trực tiếp, điều phối lịch hẹn/hàng chờ, chuyển/gộp bàn, duyệt đơn gọi món và thanh toán nhanh.
- **Quản trị viên (Admin):** Quản lý bàn chơi, khung giá, kho hàng, nhà cung cấp, voucher, giải đấu, nhân sự và theo dõi báo cáo doanh thu.

---

## Tính Năng Chính

### 1. Cổng Khách Hàng & Hội Viên (`/customer`)
- **Đặt bàn trực tuyến:** Xem sơ đồ bàn trống thời gian thực, đặt bàn theo khung giờ, đặt trước món F&B và thanh toán tiền cọc tự động qua **SePay VietQR**.
- **Phiên chơi & Gọi món tại bàn:** Theo dõi tiền giờ tạm tính, gọi đồ uống/món ăn trực tiếp vào bàn đang chơi, áp dụng Voucher và gửi yêu cầu thanh toán tới quầy.
- **Hồ sơ & Hạng hội viên:** Tích điểm tự động từ hóa đơn, phân hạng động (**Đồng / Bạc / Vàng**) kèm ưu đãi giảm giá bàn & F&B, quản lý hồ sơ cá nhân và lịch sử chơi.
- **Giải đấu & Tin tức:** Đăng ký giải đấu Bank Pool, thanh toán lệ phí VietQR, theo dõi nhánh đấu, luật chơi và tin tức CLB.

### 2. Quầy Thu Ngân & Sơ Đồ Bàn POS (`/pos`)
- **Sơ đồ bàn thời gian thực:** Theo dõi 5 trạng thái bàn (`Đang chơi`, `Tạm dừng`, `Đã đặt`, `Bàn trống`, `Bảo trì`), lọc theo tầng/khu vực/loại bàn và tìm kiếm nhanh.
- **Vận hành bàn chơi:** Mở bàn (tự nhận diện hội viên qua SĐT), check-in khách đặt trước, tạm dừng/tiếp tục tính giờ, **chuyển bàn** và **gộp bàn** bảo toàn tiền giờ lũy kế (`carriedCost`).
- **Phê duyệt & Hàng chờ tại quầy:** Tiếp nhận đơn gọi món trực tuyến (kèm cảnh báo realtime), xác nhận yêu cầu thanh toán tại bàn, quản lý lịch hẹn và danh sách khách chờ bàn (`Waitlist`).
- **Thanh toán & In phiếu:** Áp dụng ưu đãi hội viên, kiểm tra điều kiện Voucher, hỗ trợ Tiền mặt / Chuyển khoản QR / Kết hợp và in phiếu tạm tính, hóa đơn.

### 3. Cổng Quản Trị Hệ Thống (`/dashboard`)
- **Dashboard & Báo cáo:** Theo dõi doanh thu, cơ cấu tiền giờ / F&B, hiệu suất bàn chơi và xuất báo cáo Excel.
- **Bàn chơi & Khung giá:** Quản lý danh sách bàn (Pool, Carom, Snooker), bảo trì nỉ và thiết lập khung giá động theo giờ.
- **Kho hàng & Nhập kho:** Quản lý thực đơn F&B, phụ kiện/vật tư, nhà cung cấp, phiếu nhập hàng, phiếu tồn đầu kỳ, kiểm kê tồn kho và hao hụt vật tư.
- **Voucher, Giải đấu & Nhân sự:** Quản lý mã khuyến mãi, điều hành giải đấu Bank Pool (check-in QR, chia nhánh, cập nhật tỉ số), phân quyền nhân sự theo vai trò và quản lý hóa đơn.

---

## Công Nghệ Sử Dụng

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Ant Design 6, React Router DOM, Axios, Socket.io-client, Chart.js / Recharts.
- **Backend:** Node.js, Express, TypeScript, Mongoose, Socket.io, JWT, Nodemailer, Cloudinary, SePay Webhook.
- **Cơ sở dữ liệu:** MongoDB (Atlas / Replica Set hỗ trợ Transaction).
- **Quản lý gói:** `pnpm` workspace (`backend/` & `frontend/`).

---

## Cài Đặt & Khởi Chạy

### Yêu cầu
- **Node.js** >= 20 LTS
- **pnpm** 10
- **MongoDB** (Atlas hoặc Replica Set)

### Khởi chạy local
```bash
# 1. Cài đặt dependencies
pnpm install

# 2. Tạo file cấu hình môi trường từ file mẫu
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Chạy đồng thời Backend (:5000) và Frontend (:5556)
pnpm dev
```

- **Frontend:** `http://localhost:5556`
- **Backend API:** `http://localhost:5000/api/v1`

### Build & Kiểm tra
```bash
pnpm build                    # Build toàn bộ backend & frontend
pnpm --filter frontend lint   # Kiểm tra lint frontend
```

---

## Triển Khai (Vercel)

Dự án đã có sẵn cấu hình [backend/vercel.json](backend/vercel.json) và [frontend/vercel.json](frontend/vercel.json) cho mô hình 2 project từ cùng một repository:
- **Backend:** Root Directory = `backend`, cấu hình biến môi trường từ `backend/.env` và trỏ `CLIENT_URL` về domain Frontend.
- **Frontend:** Root Directory = `frontend`, cấu hình `VITE_API_URL` và `VITE_SOCKET_URL` trỏ về domain Backend.
