# CueZone — Hướng dẫn cho agent

- Dùng pnpm cho workspace `frontend/` và `backend/`; scripts nằm trong `package.json`.
- Dữ liệu nghiệp vụ: frontend gọi API, backend đọc/ghi MongoDB. Không thêm mock, token giả hoặc lưu nghiệp vụ trong localStorage; các màn chưa chuyển API phải được nêu rõ.
- UI tái sử dụng `frontend/src/shared/ui`: Button, Form/Form.Item, Input, Typography, lựa chọn, bố cục và `message`. Không dùng thẻ HTML thay thế khi đã có component tương ứng hoặc thêm thư viện UI trùng chức năng.
- Giữ brand Simonis Emerald & Obsidian; dùng token màu (`--brand`, `primary-*`), không hardcode màu ngoài hệ thống.
- Icon dùng `@ant-design/icons`, không dùng emoji trong UI.
- Giữ thay đổi của người dùng; sửa tối thiểu, tái sử dụng code sẵn có. Kiểm tra đầu vào, quyền truy cập và báo lỗi thật, không báo thành công khi chưa lưu.
- Trước khi bàn giao, chạy build hai workspace; thay đổi auth/POS/đặt bàn chạy thêm `pnpm --filter backend check:pos` (database tạm, cần MongoDB hỗ trợ transaction). Nêu rõ kiểm tra chưa chạy hoặc còn lỗi.
