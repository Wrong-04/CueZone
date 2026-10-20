## Context

CueZone là hệ thống quản lý câu lạc bộ Billiards với các tính năng POS, đặt bàn, tính tiền và giải đấu Bank Pool. Hiện tại trên giao diện quản trị (`AdminTournamentsPage`), dữ liệu giải đấu đang sử dụng mock data (`INITIAL_TOURNAMENTS`). Cần triển khai module quản lý giải đấu hoàn chỉnh từ backend (Mongoose schema, validation rules, API endpoints, RBAC) đến frontend (service API, form tạo giải đấu, xác nhận vòng đời DRAFT → REGISTRATION_OPEN) đáp ứng trọn vẹn nhóm subtasks SCRUM-150 đến SCRUM-156.

## Goals / Non-Goals

**Goals:**
- **SCRUM-154**: Thiết kế Mongoose model `Tournament` và enum trạng thái vòng đời giải đấu (`draft`, `registration_open`, `registration_closed`, `bracket_generated`, `in_progress`, `completed`).
- **SCRUM-150**: Bổ sung validation chặt chẽ: tên giải đấu, hạn đăng ký (`registrationDeadline` < `startDate`), `startDate <= endDate`, lệ phí >= 0, quy mô `maxPlayers` thuộc tập `[8, 16, 32]`.
- **SCRUM-153**: Xây dựng API tạo mới (`POST /api/v1/tournaments`), lấy danh sách (`GET /api/v1/tournaments`), lấy chi tiết (`GET /api/v1/tournaments/:id`), và cập nhật (`PUT /api/v1/tournaments/:id`) giải đấu Master.
- **SCRUM-152**: Xây dựng API chuyển trạng thái vòng đời sang `REGISTRATION_OPEN` (`PATCH /api/v1/tournaments/:id/status`).
- **SCRUM-151**: Xây dựng UI form tạo và cấu hình giải đấu Bank Pool trên `AdminTournamentsPage` kết nối API thực tế.
- **SCRUM-155**: Xây dựng UI hiển thị trạng thái và thao tác chuyển vòng đời (DRAFT → REGISTRATION_OPEN) kèm modal xác nhận & thông báo popup/toast.
- **SCRUM-156**: Viết script kiểm thử tự động xác minh tạo giải đấu, validation và chuyển trạng thái.

**Non-Goals:**
- Tự động sinh nhánh đấu Single Elimination (thuộc về subtask giải đấu tiếp theo).
- Hệ thống thanh toán trực tuyến tiền lệ phí giải đấu qua cổng ngân hàng (lệ phí hiện tại ghi nhận trực tiếp/ví nội bộ).
- Chấm điểm VAR trọng tài thời gian thực (đã có component giao diện mô phỏng riêng).

## Decisions

1. **Mongoose Schema cấu trúc nhúng (`Tournament.players`)**:
   - *Rationale*: Khớp với thiết kế NoSQL đã được định nghĩa trong `backend/seed.js`, giúp truy vấn giải đấu kèm danh sách người chơi đăng ký nhanh chóng trong 1 query mà không cần join phức tạp.
   - *Alternative*: Tạo collection riêng `TournamentPlayer` -> Phức tạp hơn, không cần thiết cho quy mô 8-32 cơ thủ.

2. **Quy tắc kiểm tra vòng đời (Lifecycle Transition)**:
   - *Draft* chỉ có thể chuyển sang *Registration Open* khi `registrationDeadline` còn hiệu lực (tương lai) và thông tin cơ bản hợp lệ.
   - Khi ở trạng thái `draft`, admin được phép sửa toàn bộ thông tin. Khi đã mở đăng ký hoặc đang đấu, chỉ được phép sửa một số trường giới hạn (mô tả, ghi chú).

3. **Phân quyền và bảo mật**:
   - Sử dụng `requirePosStaff` middleware kiểm tra token JWT hợp lệ và quyền `admin` / `staff`.
   - Lưu trữ `createdBy` dựa vào `req.user.userId`.

4. **Frontend UI State Feedback**:
   - Tuân thủ tiêu chuẩn chất lượng: Thao tác chuyển đổi trạng thái vòng đời bắt buộc có Modal xác nhận (Confirmation Dialog) và Toast hiển thị kết quả.

## Risks / Trade-offs

- **[Khác biệt múi giờ khi so sánh hạn đăng ký]** → Chuyển đổi toàn bộ thời gian sang đối tượng `Date` của JavaScript và so sánh theo timestamp UTC chuẩn để tránh lệch múi giờ client/server.
- **[Dữ liệu seed có sẵn trong DB]** → Giữ nguyên các tournament đã được seed trong `backend/seed.js` để không phá vỡ dữ liệu kiểm thử hiện tại.
