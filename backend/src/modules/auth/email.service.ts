import nodemailer from "nodemailer";

const fromAddress =
  process.env.EMAIL_FROM || '"CueZone Billiards" <cuezonewdp@gmail.com>';

let transporter: nodemailer.Transporter | null = null;

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
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-block; background: #D96B27; color: #fff; font-weight: bold; font-size: 20px; padding: 10px 14px; border-radius: 10px;">CZ</div>
      </div>
      <h2 style="color: #1B365D; text-align: center; margin: 0 0 8px;">Xác minh địa chỉ email</h2>
      <p style="color: #4b5563; text-align: center;">
        ${name ? `Xin chào <strong>${name}</strong>,` : "Xin chào,"}
        bạn đang đăng ký tài khoản tại <strong>CueZone Billiards</strong>.
      </p>
      <p style="color: #4b5563; text-align: center; margin-bottom: 16px;">
        Mã xác minh của bạn là:
      </p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="display: inline-block; background: #fff7ed; color: #D96B27; font-size: 36px; font-weight: bold; letter-spacing: 10px; padding: 14px 22px; border-radius: 10px; border: 1px solid #fed7aa;">${code}</span>
      </div>
      <p style="color: #6b7280; font-size: 14px; text-align: center;">
        Mã có hiệu lực trong <strong>5 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.
      </p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        Nếu bạn không yêu cầu email này, vui lòng bỏ qua.
      </p>
    </div>
  `;

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject: "CueZone - Mã xác minh tài khoản (4 chữ số)",
    text: `Mã xác minh tài khoản CueZone của bạn là: ${code}. Mã có hiệu lực trong 5 phút.`,
    html,
  });
}
