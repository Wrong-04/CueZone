import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const fromAddress =
  process.env.EMAIL_FROM || '"CueZone Billiards" <cuezonewdp@gmail.com>';

let transporter: nodemailer.Transporter | null = null;
let baseEmailTemplate: string | null = null;

function getBaseTemplate(): string {
  if (!baseEmailTemplate) {
    const candidates = [
      path.resolve(__dirname, "../../templates/email.template.html"),
      path.resolve(process.cwd(), "src/templates/email.template.html"),
      path.resolve(process.cwd(), "templates/email.template.html"),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        baseEmailTemplate = fs.readFileSync(p, "utf-8");
        break;
      }
    }
    if (!baseEmailTemplate) {
      baseEmailTemplate = `<!DOCTYPE html><html><body>{{BODY_CONTENT}}</body></html>`;
    }
  }
  return baseEmailTemplate;
}

function renderEmail(options: {
  title: string;
  greeting: string;
  message: string;
  bodyContent: string;
}): string {
  const template = getBaseTemplate();
  return template
    .replace(/{{TITLE}}/g, options.title)
    .replace(/{{GREETING}}/g, options.greeting)
    .replace(/{{MESSAGE}}/g, options.message)
    .replace(/{{BODY_CONTENT}}/g, options.bodyContent);
}

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER || "cuezonewdp@gmail.com",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }
  return transporter;
}

export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string
): Promise<void> {
  const bodyContent = `
    <div class="otp-box">
      <div class="otp-label">MÃ XÁC MINH CỦA BẠN</div>
      <div class="otp-code">${code}</div>
      <div class="otp-expire">⏱️ Mã có hiệu lực trong vòng 5 phút</div>
    </div>
    <div class="notice-card">
      <strong>Lưu ý bảo mật:</strong> Tuyệt đối không cung cấp mã xác minh này cho bất kỳ ai để đảm bảo an toàn tài khoản hội viên của bạn.
    </div>
  `;

  const html = renderEmail({
    title: "CueZone - Xác minh đăng ký tài khoản",
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message: "Bạn đang thực hiện đăng ký tài khoản hội viên tại <strong>CueZone Billiards</strong>. Vui lòng nhập mã OTP bên dưới để kích hoạt tài khoản của mình:",
    bodyContent,
  });

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: "CueZone - Mã xác thực đăng ký tài khoản",
    text: `Mã xác thực tài khoản CueZone của bạn là: ${code}. Mã có hiệu lực trong 5 phút.`,
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  code: string,
  name?: string
): Promise<void> {
  const bodyContent = `
    <div class="otp-box">
      <div class="otp-label">MÃ OTP ĐẶT LẠI MẬT KHẨU</div>
      <div class="otp-code">${code}</div>
      <div class="otp-expire">⏱️ Mã có hiệu lực trong vòng 10 phút (Sử dụng 1 lần)</div>
    </div>
    <div class="notice-card">
      <strong>Cảnh báo an toàn:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, có thể ai đó đang cố truy cập tài khoản. Vui lòng bỏ qua email này hoặc liên hệ hotline CueZone để được hỗ trợ.
    </div>
  `;

  const html = renderEmail({
    title: "CueZone - Khôi phục mật khẩu",
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message: "Hệ thống CueZone nhận được yêu cầu cấp lại mật khẩu cho tài khoản liên kết với địa chỉ email này. Sử dụng mã OTP sau để hoàn tất quá trình:",
    bodyContent,
  });

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: "CueZone - Mã OTP đặt lại mật khẩu",
    text: `Mã OTP đặt lại mật khẩu CueZone của bạn là: ${code}. Mã có hiệu lực trong 10 phút.`,
    html,
  });
}

/**
 * SCRUM-727: Gửi email chào mừng / xác thực sau khi đăng ký tài khoản thành công
 */
export async function sendWelcomeRegistrationEmail(
  to: string,
  name?: string
): Promise<void> {
  const bodyContent = `
    <div class="welcome-card">
      <h3>🎉 ĐẶC QUYỀN HỘI VIÊN ĐÃ SẴN SÀNG</h3>
      <p>
        Tài khoản của bạn đã được kích hoạt thành công trên toàn hệ thống CueZone Billiards Club.
      </p>
    </div>
    <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-weight: 700; color: #047857; font-size: 14px;">✨ Các tiện ích dành riêng cho bạn:</p>
      <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.7;">
        <li>Đặt trước bàn chơi tại tất cả chi nhánh không lo hết bàn.</li>
        <li>Gọi món ăn, nước uống và phụ kiện trực tiếp tại bàn.</li>
        <li>Theo dõi lịch sử thi đấu và cập nhật bảng xếp hạng giải đấu Bank Pool.</li>
      </ul>
    </div>
  `;

  const html = renderEmail({
    title: "Chào mừng gia nhập CueZone Billiards Club",
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message: "Chúc mừng bạn đã gia nhập đại gia đình <strong>CueZone Billiards</strong>! Chúng tôi rất vinh hạnh được đồng hành cùng những trận cơ bida đỉnh cao của bạn.",
    bodyContent,
  });

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: "Chào mừng bạn đến với CueZone Billiards Club",
    text: `Chào mừng ${name || "Hội viên mới"} đã đăng ký tài khoản thành công tại CueZone Billiards Club!`,
    html,
  });
}

