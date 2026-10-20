# tournament-management Specification

## Purpose
TBD - created by archiving change tournament-management-setup. Update Purpose after archive.
## Requirements
### Requirement: Admin thiết lập giải đấu Bank Pool
The system SHALL allow Admin and staff users to set up a new Bank Pool tournament with parameters: tournament name, match dates (`startDate`, `endDate`), registration deadline (`registrationDeadline`), entry fee, prize pool, and max participants scale (`maxPlayers`). The initial status MUST be `draft`.

#### Scenario: Tạo giải đấu thành công với thông tin hợp lệ
- **WHEN** Quản trị viên gửi yêu cầu tạo giải đấu với đầy đủ tên, ngày thi đấu hợp lệ, hạn đăng ký trước ngày thi đấu và quy mô 16 cơ thủ
- **THEN** Hệ thống lưu giải đấu vào cơ sở dữ liệu với trạng thái `draft` và trả về mã giải đấu cùng thông tin chi tiết với HTTP 201

#### Scenario: Từ chối tạo giải đấu khi thiếu thông tin bắt buộc
- **WHEN** Quản trị viên gửi yêu cầu tạo giải đấu nhưng để trống tên giải đấu hoặc ngày thi đấu
- **THEN** Hệ thống từ chối lưu và trả về thông báo lỗi rõ ràng với mã HTTP 400

#### Scenario: Từ chối tạo giải đấu khi quy mô cơ thủ không hợp lệ
- **WHEN** Quản trị viên gửi quy mô số lượng cơ thủ không thuộc tập giá trị chuẩn `[8, 16, 32]` (ví dụ: 10 hoặc 50)
- **THEN** Hệ thống từ chối yêu cầu và báo lỗi quy mô giải đấu chỉ hỗ trợ 8, 16 hoặc 32 cơ thủ

### Requirement: Kiểm tra quy tắc dữ liệu ngày tháng và hạn đăng ký giải đấu
The system MUST validate date logic: `registrationDeadline` MUST be before or equal to `startDate`, and `startDate` MUST be before or equal to `endDate`.

#### Scenario: Từ chối khi hạn đăng ký sau ngày bắt đầu thi đấu
- **WHEN** Quản trị viên nhập hạn đăng ký có thời gian sau ngày bắt đầu thi đấu
- **THEN** Hệ thống báo lỗi "Hạn đăng ký phải trước thời gian bắt đầu thi đấu" và từ chối cập nhật hoặc tạo mới

#### Scenario: Từ chối khi ngày kết thúc trước ngày bắt đầu
- **WHEN** Quản trị viên nhập ngày kết thúc sớm hơn ngày bắt đầu thi đấu
- **THEN** Hệ thống báo lỗi "Ngày kết thúc thi đấu phải sau ngày bắt đầu" và không cho phép lưu

### Requirement: Chuyển đổi trạng thái vòng đời giải đấu sang REGISTRATION_OPEN
The system SHALL allow administrators to transition tournament status from `draft` to `registration_open`. When opening registration, the system MUST verify that the tournament has all required fields and that current time has not exceeded the registration deadline.

#### Scenario: Mở đăng ký giải đấu thành công
- **WHEN** Quản trị viên gửi yêu cầu chuyển trạng thái giải đấu từ `draft` sang `registration_open` và giải đấu thỏa mãn mọi quy tắc
- **THEN** Trạng thái giải đấu được cập nhật thành `registration_open` và trả về thông báo thành công

#### Scenario: Không thể mở đăng ký giải đấu nếu hạn đăng ký đã qua
- **WHEN** Quản trị viên cố gắng chuyển trạng thái giải đấu sang `registration_open` nhưng hạn đăng ký của giải đã trôi qua so với thời điểm hiện tại
- **THEN** Hệ thống từ chối chuyển trạng thái và thông báo "Hạn đăng ký giải đấu đã hết hạn, không thể mở đăng ký"

### Requirement: Phân quyền bảo mật RBAC cho quản lý giải đấu
The system MUST enforce strict role-based access control. Only authenticated users with `admin` or `staff` role SHALL be allowed to create, update, or transition tournament lifecycle states.

#### Scenario: Người dùng chưa đăng nhập hoặc không đủ thẩm quyền bị từ chối
- **WHEN** Người dùng vãng lai hoặc hội viên thông thường gửi yêu cầu tạo hoặc đổi trạng thái giải đấu
- **THEN** Hệ thống từ chối truy cập với HTTP 401 hoặc HTTP 403

### Requirement: Trải nghiệm người dùng và xác nhận thay đổi trạng thái giải đấu
The user interface MUST display a confirmation modal before triggering sensitive tournament lifecycle state transitions, and SHALL display toast notifications with clear feedback upon operation completion.

#### Scenario: Xác nhận trước khi mở đăng ký giải đấu
- **WHEN** Quản trị viên bấm nút "Mở đăng ký" cho một giải đấu đang ở trạng thái nháp (`draft`)
- **THEN** Giao diện hiển thị Modal xác nhận yêu cầu xác nhận hành động, và chỉ gửi API khi quản trị viên xác nhận

