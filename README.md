# CueZone — Hướng dẫn chạy dự án

1. Tạo file `.env` ở từng folder `backend` và `frontend`.

2. Copy paste nội dung của file `.env.example` vào.

   > **Lưu ý:** Nếu có thêm key ở `.env` nhớ paste vào `.env.example`.

3. Thêm các value vào key tương ứng (tuỳ chọn).

4. Chạy `yarn dev` ở folder gốc để chạy cả backend và frontend cùng lúc:
   ```bash
   yarn dev
   ```

5. Hoặc `cd` vào từng folder và chạy riêng lẻ:

   **Chạy backend:**
   ```bash
   cd backend
   yarn install
   yarn dev
   ```

   **Chạy frontend:**
   ```bash
   cd frontend
   yarn install
   yarn dev
   ```
