## Why

Hiện tại trên hệ thống CueZone, trang quản lý giải đấu (`AdminTournamentsPage`) đang hoàn toàn sử dụng dữ liệu giả lập (mock data), backend chưa có module quản lý giải đấu Bank Pool thực tế. Theo yêu cầu từ bảng công việc (SCRUM-150 đến SCRUM-156), Admin cần thiết lập giải đấu Bank Pool: Tên giải, ngày thi đấu, hạn đăng ký, lệ phí, quy mô (8/16/32 cơ thủ), và kiểm soát vòng đời giải đấu (tạo DRAFT → mở đăng ký REGISTRATION_OPEN).

## What Changes

- **Backend (Tournament Module)**:
  - Tạo model Mongoose `Tournament` với schema đầy đủ theo chuẩn thiết kế NoSQL: tên giải, mô tả, ngày bắt đầu (`startDate`), ngày kết thúc (`endDate`), hạn đăng ký (`registrationDeadline`), số lượng người chơi tối đa (`maxPlayers`: 8, 16, 32), lệ phí tham gia (`registrationFee`), quỹ thưởng (`prizePool`), thể thức (`format`, `raceToScore`), trạng thái vòng đời (`status`: DRAFT, REGISTRATION_OPEN, REGISTRATION_CLOSED, IN_PROGRESS, COMPLETED), và danh sách cơ thủ nhúng (`players`).
  - Thêm DTO và validation logic: tên không để trống, hạn đăng ký phải trước ngày bắt đầu (`registrationDeadline < startDate`), `startDate <= endDate`, lệ phí >= 0, quy mô `maxPlayers` chỉ chấp nhận các giá trị 8, 16, 32.
  - Xây dựng API Service & Controller:
    - `POST /api/v1/tournaments`: Tạo mới giải đấu ở trạng thái `draft`.
    - `GET /api/v1/tournaments`: Lấy danh sách giải đấu (có lọc trạng thái, tìm kiếm, phân trang).
    - `GET /api/v1/tournaments/:id`: Lấy chi tiết giải đấu.
    - `PUT /api/v1/tournaments/:id`: Cập nhật cấu hình giải đấu khi còn ở trạng thái `draft`.
    - `PATCH /api/v1/tournaments/:id/status`: Chuyển đổi trạng thái vòng đời, đặc biệt quy tắc mở đăng ký `draft` -> `registration_open`.
  - Phân quyền RBAC: Chỉ tài khoản quyền Admin/Staff (`requirePosStaff` hoặc Admin) mới có quyền tạo, sửa và chuyển trạng thái giải đấu.
- **Frontend (Tournament Setup & Lifecycle UI)**:
  - Xây dựng service API `tournament.service.ts` kết nối trực tiếp với backend endpoints thực tế.
  - Cập nhật màn hình `AdminTournamentsPage`:
    - Thay thế dữ liệu mock giải đấu bằng dữ liệu gọi trực tiếp từ backend API.
    - Modal tạo giải đấu: chọn tên giải, ngày thi đấu, hạn đăng ký, thể thức race to, quy mô (8/16/32 cơ thủ), lệ phí, quỹ thưởng.
    - Modal xác nhận chuyển trạng thái sang `registration_open` (Bắt buộc confirmation modal theo tiêu chuẩn UX phản hồi trạng thái).
    - Hiển thị toast/popup thông báo thành công hoặc thất bại rõ ràng.
- **Testing & Verification**:
  - Viết integration test script kiểm thử: tạo giải đấu DRAFT, validate lỗi dữ liệu không hợp lệ (hạn đăng ký sau ngày thi đấu, quy mô không đúng), chuyển trạng thái sang REGISTRATION_OPEN thành công.

## Capabilities

### New Capabilities
- `tournament-management`: Thiết lập giải đấu Bank Pool (tên, thời gian, hạn đăng ký, lệ phí, quy mô 8/16/32) và quản lý vòng đời giải đấu từ DRAFT chuyển sang REGISTRATION_OPEN.

### Modified Capabilities
<!-- Không có capability cũ bị thay đổi requirement vì đây là module tournament thực tế đầu tiên -->

## Impact

- **Backend**: Thêm module `backend/src/modules/tournament/` (`tournament.model.ts`, `tournament.service.ts`, `tournament.controller.ts`, `tournament.routes.ts`, `dto/tournament.dto.ts`), đăng ký router trong `backend/src/routes/index.ts`.
- **Frontend**: Tạo `frontend/src/services/tournament.service.ts`, kết nối `frontend/src/pages/admin/AdminTournamentsPage.tsx` vào API backend.
- **Dependencies**: Tận dụng các thư viện sẵn có (`mongoose`, `express`, `antd`, `@ant-design/icons`, `dayjs`, `axios`), không cài thêm thư viện ngoài.
