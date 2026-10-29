import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

const fromAddress = process.env.EMAIL_FROM || '"CueZone Billiards" <cuezonewdp@gmail.com>';

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
  badgeText?: string;
  preheader?: string;
  ctaButton?: string;
  referenceId?: string;
}): string {
  const template = getBaseTemplate();
  const now = new Date();
  const timeString =
    new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now) + " (GMT+7)";

  const ref =
    options.referenceId || `CZ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return template
    .replace(/{{TITLE}}/g, options.title)
    .replace(/{{PREHEADER}}/g, options.preheader || options.title)
    .replace(/{{BADGE_TEXT}}/g, options.badgeText || "CUEZONE BILLIARDS")
    .replace(/{{GREETING}}/g, options.greeting)
    .replace(/{{MESSAGE}}/g, options.message)
    .replace(/{{BODY_CONTENT}}/g, options.bodyContent)
    .replace(/{{CTA_BUTTON}}/g, options.ctaButton || "")
    .replace(/{{REFERENCE_ID}}/g, ref)
    .replace(/{{GENERATED_TIME}}/g, timeString);
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
  name?: string,
): Promise<void> {
  const bodyContent = `
    <!-- OTP Display Box -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background-color: #f8fafc; border: 1.5px dashed #94a3b8; border-radius: 14px; text-align: center;">
      <tr>
        <td style="padding: 22px 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
            MÃ XÁC MINH OTP KÍCH HOẠT TÀI KHOẢN
          </div>
          <div style="display: inline-block; font-family: 'SF Pro Mono', 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #047857; letter-spacing: 10px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 10px 18px 10px 28px;">
            ${code}
          </div>
          <div style="margin-top: 14px; font-size: 12.5px; color: #059669; font-weight: 600;">
            ⏱️ Mã có hiệu lực trong vòng 5 phút (Tối đa 5 lần nhập)
          </div>
        </td>
      </tr>
    </table>

    <!-- Notice Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
      <tr>
        <td style="font-size: 13px; color: #92400e; line-height: 1.5;">
          <strong>Lưu ý bảo mật:</strong> Tuyệt đối không cung cấp mã xác minh này cho bất kỳ ai để đảm bảo an toàn tài khoản hội viên của bạn.
        </td>
      </tr>
    </table>
  `;

  const html = renderEmail({
    title: "CueZone - Xác minh đăng ký tài khoản",
    badgeText: "XÁC MINH ĐĂNG KÝ HỘI VIÊN",
    preheader: `Mã OTP kích hoạt tài khoản CueZone của bạn là ${code}. Hiệu lực 5 phút.`,
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message:
      "Bạn đang thực hiện đăng ký tài khoản hội viên tại <strong>CueZone Billiards Club</strong>. Vui lòng nhập mã OTP gồm 6 chữ số dưới đây vào giao diện đăng ký để hoàn tất kích hoạt tài khoản:",
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
  name?: string,
): Promise<void> {
  const bodyContent = `
    <!-- OTP Display Box -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background-color: #f8fafc; border: 1.5px dashed #f87171; border-radius: 14px; text-align: center;">
      <tr>
        <td style="padding: 22px 16px;">
          <div style="font-size: 11px; font-weight: 800; color: #b91c1c; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px;">
            MÃ OTP KHÔI PHỤC MẬT KHẨU
          </div>
          <div style="display: inline-block; font-family: 'SF Pro Mono', 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #b91c1c; letter-spacing: 10px; background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 10px 18px 10px 28px;">
            ${code}
          </div>
          <div style="margin-top: 14px; font-size: 12.5px; color: #dc2626; font-weight: 600;">
            ⏱️ Mã có hiệu lực trong vòng 10 phút (Sử dụng 1 lần duy nhất)
          </div>
        </td>
      </tr>
    </table>

    <!-- Warning Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin: 16px 0;">
      <tr>
        <td style="font-size: 13px; color: #991b1b; line-height: 1.5;">
          <strong>Cảnh báo quan trọng:</strong> Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc thông báo ngay cho quản trị viên hệ thống để bảo vệ tài khoản.
        </td>
      </tr>
    </table>
  `;

  const html = renderEmail({
    title: "CueZone - Khôi phục mật khẩu tài khoản",
    badgeText: "BẢO MẬT & ĐẶT LẠI MẬT KHẨU",
    preheader: `Mã OTP đặt lại mật khẩu CueZone là ${code}. Hiệu lực 10 phút.`,
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message:
      "Hệ thống CueZone nhận được yêu cầu cấp lại mật khẩu cho tài khoản liên kết với địa chỉ email này. Sử dụng mã OTP sau để hoàn tất quá trình đổi mật khẩu mới:",
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

export async function sendWelcomeRegistrationEmail(to: string, name?: string): Promise<void> {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const bodyContent = `
    <!-- Welcome Card -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0; background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); border: 1.5px solid #a7f3d0; border-radius: 14px; text-align: center;">
      <tr>
        <td style="padding: 24px 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
          <div style="font-size: 17px; font-weight: 800; color: #166534; margin-bottom: 6px;">ĐẶC QUYỀN HỘI VIÊN ĐÃ KÍCH HOẠT</div>
          <div style="font-size: 13.5px; color: #15803d; line-height: 1.6;">
            Chào mừng bạn đã trở thành hội viên chính thức của <strong>CueZone Billiards Club</strong>. Bạn được tặng ngay voucher trải nghiệm <strong>50.000đ</strong> và quyền lợi đặt bàn ưu tiên.
          </div>
        </td>
      </tr>
    </table>

    <!-- Benefit details -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 18px; margin: 18px 0;">
      <tr>
        <td>
          <p style="margin: 0 0 10px 0; font-weight: 700; color: #047857; font-size: 14px;">✨ Các tiện ích dành riêng cho bạn:</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.75;">
            <li><strong>Đặt trước bàn chơi:</strong> Chọn bàn Pool, Carom hoặc Snooker yêu thích mọi lúc.</li>
            <li><strong>Menu F&B tại bàn:</strong> Đặt đồ uống, món ăn trực tiếp từ điện thoại.</li>
            <li><strong>Giải đấu Bank Pool:</strong> Theo dõi bảng xếp hạng, đăng ký thi đấu và tích điểm cơ thủ.</li>
          </ul>
        </td>
      </tr>
    </table>
  `;

  const ctaButton = `
    <!-- CTA Button -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" align="center" style="margin: 24px 0 12px 0;">
      <tr>
        <td align="center">
          <a href="${clientUrl}/login" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
            Đăng Nhập Khám Phá Ngay &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = renderEmail({
    title: "Chào mừng gia nhập CueZone Billiards Club",
    badgeText: "CHÀO MỪNG TÂN HỘI VIÊN",
    preheader: "Chúc mừng bạn đã gia nhập CueZone Billiards Club! Voucher 50.000đ đã sẵn sàng.",
    greeting: name ? `Xin chào ${name},` : "Xin chào bạn,",
    message:
      "Chúc mừng bạn đã gia nhập đại gia đình <strong>CueZone Billiards</strong>! Chúng tôi rất vinh hạnh được đồng hành cùng những trận cơ bida đỉnh cao và những trải nghiệm thư giãn tuyệt vời của bạn.",
    bodyContent,
    ctaButton,
  });

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: "Chào mừng bạn đến với CueZone Billiards Club",
    text: `Chào mừng ${name || "Hội viên mới"} đã đăng ký tài khoản thành công tại CueZone Billiards Club!`,
    html,
  });
}
