# Triển khai CueZone trên Vercel

## Hai project

- `cuezone-api`: Express, Root Directory `backend`, Node.js 24.x.
- `cuezone-web`: Vite, Root Directory `frontend`, Node.js 24.x.
- Chạy CLI từ **root repository**, không deploy trực tiếp thư mục con: workspace cần `pnpm-lock.yaml` chung. Root `package.json` pin pnpm 10.34.7; đặt `ENABLE_EXPERIMENTAL_COREPACK=1` cho cả hai project để Vercel dùng đúng phiên bản.
- `.vercelignore` loại bỏ `.env*`, output local, scripts kiểm tra, seed, ghi chú và các lockfile npm/yarn cũ (chỉ upload `pnpm-lock.yaml`). Luôn xem dry-run trước upload.

## Biến môi trường

Backend: `NODE_ENV=production`, `CLIENT_URL=https://cuezone-web.vercel.app`, `MONGO_URI` Atlas/replica set, JWT secret ngẫu nhiên riêng cho production, thời hạn JWT, SMTP, Cloudinary và các biến `SEPAY_*` từ `backend/.env.example`. Không dùng JWT key mặc định trong source. Đặt backend env thành Secret qua stdin hoặc dashboard, không truyền giá trị trong command line/Git.

Frontend chỉ cần giá trị công khai:

```env
VITE_API_URL=https://cuezone-api.vercel.app/api/v1
VITE_SOCKET_URL=https://cuezone-api.vercel.app
VITE_APP_NAME=CueZone Billiards System
```

Vite nhúng env khi build: thay env phải deploy lại frontend. Không đưa JWT/DB/SePay key vào bất kỳ `VITE_*` nào.

## Deploy lại

Thực hiện từ root, dùng tài khoản có quyền hai project. Nếu CLI chưa có trên PATH, dùng `pnpm dlx vercel@65.12.1` thay `vercel`:

```bash
pnpm build
pnpm --filter frontend lint
(cd backend && node scripts/check-vercel.cjs)

vercel link --yes --scope thehieu03s-projects --project cuezone-api
vercel deploy --dry --json
vercel deploy --prod --yes

vercel link --yes --scope thehieu03s-projects --project cuezone-web
vercel deploy --dry --json
vercel deploy --prod --yes
```

`check-vercel.cjs` chỉ tạo/xóa DB `cz_check_vercel_*`, không ghi DB ứng dụng. Build backend Vercel dùng root entrypoint `backend/server.ts`, HTTP chờ MongoDB/index sẵn sàng. Khóa `functions["package.json"]` là entrypoint builder Express dùng trước khi chọn `server.ts`; templates được include rõ ràng, không đổi thành `functions["server.ts"]` nếu chưa kiểm chứng output bundle.

## Webhook SePay

```text
POST https://cuezone-api.vercel.app/api/v1/public/sepay/webhook
Authorization: Apikey <SEPAY_WEBHOOK_KEY>
```

Production cần public, không bị Vercel Authentication/Deployment Protection chặn webhook. Xác thực vẫn do API Key của ứng dụng thực hiện. Người sở hữu cập nhật URL trong dashboard SePay và kiểm chứng gửi thử/giao dịch thực tế. Không tự gửi webhook giả giao dịch tiền vào production.

Khóa SePay từng chia sẻ qua chat cần rotate đồng bộ ở SePay và biến môi trường Vercel trước sử dụng tiền thật.

## Giới hạn vận hành

- Atlas hiện tại được dùng lại; không chạy seed/migration/reset trên production khi deploy.
- WebSocket-only, reconnect khi function hết duration. Broadcast Socket.IO hiện chỉ trong một instance, không đảm bảo tức thì giữa nhiều instance; giao diện có refetch HTTP thông báo mỗi 30 giây. Muốn realtime đa instance cần adapter/pub-sub hoặc backend chạy liên tục.
- Tác vụ email fire-and-forget hiện có cần kiểm chứng riêng trên serverless; deploy thành công không chứng minh email đã tới hộp thư.
- Thanh toán thật, phân bổ suất, hoàn tiền thủ công/Zalo cần acceptance riêng; smoke test HTTP không thay thế.
- Không cần Cloudflare Tunnel cho endpoint Vercel. Tunnel local cũ không tự bị tắt hoặc thay webhook dashboard.
- Rollback bản cập nhật bằng Vercel dashboard/CLI về deployment đã kiểm chứng trước đó; không rollback dữ liệu ngân hàng bằng cách đổi deployment.
