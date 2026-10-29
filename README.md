# CueZone — Hệ Thống Quản Lý CLB Bida & Giải Đấu Bank Pool

Hệ thống quản lý vận hành CLB Bida toàn diện kết hợp giải đấu Bank Pool chuyên nghiệp, liên thông liền mạch trên nền tảng Web giữa Quản trị (Admin), Nhân viên phục vụ / Thu ngân (Staff) và Hội viên (Customer).

---

## 🎱 Tính Năng Chính

### 1. Cổng Khách & Hội Viên (Web Customer Portal)
- **Khách vãng lai**: Tra cứu sơ đồ bàn trống theo thời gian thực, xem thực đơn F&B, xem luật thi đấu Bank Pool chuẩn quốc tế, theo dõi lịch thi đấu, tin tức & khuyến mãi.
- **Hội viên (Member)**: Đặt bàn trước trực tuyến, gọi món trực tiếp tại bàn (giỏ hàng online), thẻ thành viên VIP, tích lũy điểm thưởng và quản lý ví trả trước (VNPay).
- **Xác thực**: Đăng ký, đăng nhập JWT, đổi/quên mật khẩu qua mã OTP Email.

### 2. Giao diện Quản Lý Bàn & Thu Ngân (Staff / Web Table Management)
- **Sơ đồ bàn Realtime**: Theo dõi trạng thái 27 bàn trực quan qua Socket.io, đếm giờ tự động theo block, mở bàn, tạm dừng, chuyển bàn và ghép bàn.
- **Order F&B & In hóa đơn**: Thêm món vào hóa đơn bàn, áp dụng voucher giảm giá, thanh toán tiền mặt/chuyển khoản/ví, in hóa đơn nhiệt.
- **Tiếp nhận đơn online**: Duyệt đơn đặt bàn trước và đơn gọi món trực tiếp từ khách.

### 3. Cổng Quản Trị Hệ Thống (Admin Portal)
- **Quản lý Nhân sự & Phân quyền (RBAC)**: Quản lý danh sách nhân viên, phân quyền 3 role chuẩn (`admin`, `staff`, `customer`), khóa/kích hoạt tài khoản.
- **Quản trị Bàn & Bảng giá**: Danh mục 27 bàn (Lỗ 9FT / Ba băng), cấu hình bảng giá giờ theo khung giờ ngày/đêm và ngày lễ.
- **Quản lý Kho & Chuỗi cung ứng**: Quản lý danh mục hàng hóa, nhà cung cấp, lập phiếu nhập kho, tự động xuất kho theo bill bán, kiểm kê và cân bằng kho.
- **Điều hành Giải đấu Bank Pool**: Tạo giải, quản lý danh sách cơ thủ, sinh cây nhánh đấu Knock-out (Bracket), cập nhật tỉ số trực tiếp.
- **Báo cáo & Thống kê**: Biểu đồ doanh thu Chart.js (tiền bàn, F&B, voucher), báo cáo hiệu suất khai thác bàn.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Ant Design (`antd`) bọc theo Brand UI Tokens tại `frontend/src/shared/ui/`, `@ant-design/icons`, Socket.io-client.
- **Backend**: Node.js, Express, TypeScript, Mongoose, Socket.io, Nodemailer, VNPay SDK.
- **Cơ sở dữ liệu**: MongoDB Atlas (hỗ trợ Transaction đa bảng).
- **Quản lý gói (Package Manager)**: `pnpm` workspace (`frontend`, `backend`).

---

## 🚀 Hướng Dẫn Khởi Chạy (Quick Start)

### 1. Cấu hình môi trường (.env)
Đảm bảo đã tạo file `.env` tại cả 2 thư mục `backend/` và `frontend/` dựa theo mẫu `.env.example`:

```bash
# Frontend
cp frontend/.env.example frontend/.env

# Backend
cp backend/.env.example backend/.env
```

### 2. Cài đặt dependencies
Tại thư mục gốc dự án:
```bash
pnpm install
```

### 3. Khởi chạy toàn bộ hệ thống (Dev Server)
Khởi động đồng thời cả Backend (port 5000) và Frontend (port 5173) bằng lệnh duy nhất:
```bash
pnpm dev
```

* **Frontend Web**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000/api/v1](http://localhost:5000/api/v1)
* **Socket.io**: `http://localhost:5000`

### 4. Lệnh kiểm thử & Build
```bash
pnpm build
pnpm --filter backend check:pos
```

---

## 🔑 Tài Khoản Kiểm Thử (Seed Accounts)

> Mật khẩu mặc định cho tất cả tài khoản: **`admin123`**

| Vai trò | Email đăng nhập | Mô tả quyền hạn & Chức năng |
| :--- | :--- | :--- |
| **Admin** | `admin@cuezone.com` | Quản trị toàn quyền: Bàn, nhân sự, bảng giá, kho hàng, giải đấu, báo cáo |
| **Staff (Ca sáng)** | `staff1@cuezone.com` | Thu ngân: Vào thẳng giao diện Quản lý Bàn (`/admin/pos`), mở bàn, tính giờ, checkout |
| **Staff (Ca tối)** | `staff2@cuezone.com` | Phục vụ / Thu ngân: Thao tác mở/đóng bàn, gọi món, duyệt booking |
| **Customer** | `customer1@gmail.com` | Khách hàng: Cổng Web Portal (`/customer`), số dư ví: 1.310.000đ, 3.400 điểm |

---

## 📌 Quy Định Phát Triển (UI & Code Conventions)
Dự án áp dụng quy định kiến trúc và giao diện nghiêm ngặt tại [AGENTS.md](AGENTS.md):
- Bắt buộc tái sử dụng các component chuẩn hóa từ `frontend/src/shared/ui/` (`Button`, `Card`, `Typography`, `Tabs`, `Modal`, `DataTable`, `message`, v.v.).
- Tuyệt đối không hardcode mã màu ngoài bảng token hệ thống (Simonis Emerald `--brand: #059669`, Obsidian Slate).
- Sử dụng `@ant-design/icons`, không dùng emoji làm biểu tượng chính trong UI.
