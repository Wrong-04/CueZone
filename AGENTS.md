# Quy Định Phát Triển Giao Diện (UI Rules) - CueZone

## 1. Bắt Buộc Sử Dụng Thư Viện Shared UI (`src/shared/ui`)
Tất cả các trang (pages) và components trong dự án **BẮT BUỘC** phải tái sử dụng các component chuẩn hóa đã được xây dựng sẵn trong thư mục `src/shared/ui/`:

- **Button**: Sử dụng `<Button variant="..." size="...">` thay thế cho thẻ `<button>` thuần.
  - Các biến thể: `primary`, `secondary`, `outline`, `ghost`, `link`, `danger`.
  - Hỗ trợ icon (`leftIcon`, `rightIcon`), chuyển trang (`to="..."`, `href="..."`), loading state.
- **Form & Input**:
  - Dùng `<Form>`, `<Form.Item>` thay vì thẻ `<form>` thuần.
  - Dùng `<Input>`, `<Input.Password>`, `<Input.TextArea>`, `<Input.Search>` thay vì `<input>`.
- **Typography**:
  - Dùng `Typography.Title`, `Typography.Text`, `Typography.Paragraph` cho toàn bộ văn bản và tiêu đề.
- **Lựa chọn & Tương tác**:
  - Dùng `<Checkbox>`, `<Radio>`, `<Select>`, `<Dropdown>`, `<ChoiceInput>`, `<SegmentedPillList>`.
- **Hiển thị & Bố cục**:
  - Dùng `<Card>`, `<Tag>`, `<Badge>`, `<Space>`, `<Tooltip>`, `<Alert>`, `<Table>`, `<DataTable>`, `<Modal>`, `<Dialog>`, `<Result>`, `<Spin>`.
- **Thông báo**:
  - Dùng `message` (`message.success()`, `message.error()`, `message.info()`, `message.warning()`) từ `src/shared/ui`.

## 2. Nghiêm Cấm
- **KHÔNG** tự ý dùng thẻ HTML nguyên thủy (`<button>`, `<input>`, `<form>`) khi đã có component tương ứng trong `src/shared/ui`.
- **KHÔNG** cài đặt thêm các thư viện UI bên ngoài trùng lặp chức năng.
- **KHÔNG** hardcode các mã màu ngoài hệ thống token (`--brand: #059669`, `primary-*` Simonis Emerald & Obsidian).
- **KHÔNG** dùng emoji thuần túy (như 📍, ⏰, 📞, 💰, 🏆, 🔥, ⭐...) trong giao diện người dùng. **BẮT BUỘC** sử dụng các icon chuẩn hóa từ `@ant-design/icons` (ví dụ: `<EnvironmentOutlined />`, `<ClockCircleOutlined />`, `<PhoneOutlined />`, `<DollarOutlined />`, `<TrophyOutlined />`...) để đảm bảo tính chuyên nghiệp, nhất quán và thẩm mỹ cao cấp.
