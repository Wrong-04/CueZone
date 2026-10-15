# CueZone — Hệ Thống Quản Lý CLB Bida & Giải Đấu Bank Pool

Hệ thống quản lý vận hành CLB Bida toàn diện kết hợp giải đấu Bank Pool chuyên nghiệp, liên thông liền mạch giữa Quản trị (Admin), Nhân viên ca trực (Staff), Hội viên (Customer) và Khách vãng lai (Guest).

---

## 🎱 Tính Năng Chính

### 1. Cổng Khách & Hội Viên (Guest & Member Portal)
- **Khách vãng lai (Guest)**: Tra cứu danh sách bàn trống theo thời gian thực, xem bộ quy tắc thi đấu Bank Pool chuẩn quốc tế, theo dõi thông tin giải đấu & lệ phí tham gia, lọc tin tức & khuyến mãi.
- **Hội viên (Customer)**: Thẻ thành viên VIP điện tử, tích lũy điểm thưởng giờ chơi & F&B, quản lý lịch sử đặt bàn, theo dõi thứ hạng ELO cơ thủ.
- **Đăng ký & Xác thực**: Đăng ký tài khoản với xác thực mã OTP qua Email/SĐT.

### 2. Cổng Quản Trị & Vận Hành (Staff & Admin)
- **Sơ đồ bàn Realtime**: Mở bàn, tính giờ tự động, chuyển bàn, gộp bàn và tạm dừng bàn thi đấu.
- **POS & Order F&B**: Phục vụ đồ uống, thức ăn nhanh trực tiếp tại bàn, in hóa đơn thanh toán.
- **Điều hành Giải đấu**: Quản lý lịch thi đấu, phân nhánh đấu (Single Elimination/Round Robin), cập nhật tỉ số trực tiếp.
- **Báo cáo & Kho hàng**: Thống kê doanh thu giờ bàn, doanh số F&B, tồn kho và lịch sử giao ca nhân viên.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons.
- **Thư viện UI chuẩn hóa**: Bộ component dùng chung tại `src/shared/ui/` theo chuẩn token Simonis Emerald (`#059669`) & Obsidian Slate.
- **Backend**: Node.js, Express, RESTful APIs.

---

## 🚀 Hướng Dẫn Khởi Chạy (Quick Start)

### 1. Cấu hình môi trường
Tạo file `.env` tại thư mục `backend/` và `frontend/` dựa theo mẫu `.env.example`:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Khởi chạy toàn bộ hệ thống
Tại thư mục gốc dự án:
```bash
yarn install
yarn dev
```

### 3. Hoặc chạy riêng lẻ từng phần

**Chạy Backend (Port 5000):**
```bash
cd backend
yarn install
yarn dev
```

**Chạy Frontend (Port 5173):**
```bash
cd frontend
yarn install
yarn dev
```

Truy cập hệ thống tại: `http://localhost:5173`

---

## 🔑 Tài Khoản Thử Nghiệm (Seed Accounts)

Mật khẩu mặc định cho toàn bộ tài khoản: `password123`

| Vai trò | Email đăng nhập | Quyền hạn & Chức năng |
| :--- | :--- | :--- |
| **Admin (Chủ CLB)** | `admin@cuezone.com` | Quản trị toàn quyền, cấu hình giá giờ, nhân sự, báo cáo doanh thu |
| **Staff (Vận hành)** | `staff@cuezone.com` | Mở/đóng bàn, duyệt đặt bàn, order F&B, in hóa đơn và giao ca |
| **Customer (Hội viên)** | `customer@cuezone.com` | Đặt bàn trước, tích điểm, tham gia giải đấu Bank Pool |

---

## 📌 Quy Định Phát Triển (UI Rules)
Dự án áp dụng quy định giao diện nghiêm ngặt tại [AGENTS.md](file:///Users/mac/Documents/CueZone/AGENTS.md):
- Bắt buộc tái sử dụng các component chuẩn hóa từ `src/shared/ui/` (`Button`, `Form`, `Input`, `Card`, `Typography`, `Tabs`, `Modal`, `message`).
- Tuyệt đối không hardcode mã màu ngoài bảng token hệ thống (`--brand: #059669`, Dark Obsidian).
