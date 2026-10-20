## 1. Backend Core & Schema (SCRUM-154, SCRUM-150)

- [x] 1.1 Khởi tạo schema `Tournament` và `TournamentPlayer` trong `backend/src/modules/tournament/tournament.model.ts` với đầy đủ enum trạng thái vòng đời.
- [x] 1.2 Tạo DTO và các hàm kiểm tra validation logic trong `backend/src/modules/tournament/dto/tournament.dto.ts` (kiểm tra hạn đăng ký < ngày thi đấu, startDate <= endDate, lệ phí >= 0, quy mô 8/16/32).

## 2. Backend Services, Controller & Routing (SCRUM-153, SCRUM-152)

- [x] 2.1 Xây dựng `TournamentService` trong `backend/src/modules/tournament/tournament.service.ts` xử lý tạo mới giải đấu DRAFT, lấy danh sách, lấy chi tiết, cập nhật giải đấu, và chuyển trạng thái sang REGISTRATION_OPEN.
- [x] 2.2 Xây dựng `TournamentController` và định tuyến router bảo vệ bởi `requirePosStaff` trong `backend/src/modules/tournament/tournament.routes.ts`.
- [x] 2.3 Đăng ký route `/tournaments` vào `protectedRouter` trong `backend/src/routes/index.ts`.

## 3. Frontend API Service & UI Integration (SCRUM-151, SCRUM-155)

- [x] 3.1 Xây dựng service `frontend/src/services/tournament.service.ts` gọi trực tiếp các API giải đấu.
- [x] 3.2 Tích hợp danh sách giải đấu thực tế vào `frontend/src/pages/admin/AdminTournamentsPage.tsx`, thay thế hoàn toàn mock data tĩnh.
- [x] 3.3 Hoàn thiện Modal tạo giải đấu mới (SCRUM-151) với đầy đủ trường dữ liệu: tên, ngày thi đấu, hạn đăng ký, lệ phí, quy mô 8/16/32, bàn chỉ định, quỹ thưởng.
- [x] 3.4 Hoàn thiện giao diện chuyển đổi trạng thái vòng đời (SCRUM-155): Thêm nút "Mở Đăng Ký" cho giải đấu DRAFT kèm Modal xác nhận trước khi thực thi và toast phản hồi kết quả.

## 4. Testing & Verification (SCRUM-156)

- [x] 4.1 Viết script kiểm thử tích hợp `backend/scripts/check-tournament.cjs` xác minh tạo giải đấu DRAFT, bắt lỗi validation không hợp lệ và chuyển trạng thái sang REGISTRATION_OPEN.
- [x] 4.2 Chạy kiểm thử tự động, build cả 2 workspace và xác nhận không có lỗi runtime.
