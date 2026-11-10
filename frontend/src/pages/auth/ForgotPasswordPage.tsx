import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import {
  ArrowLeftOutlined,
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
} from "@ant-design/icons";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { authService } from "../../services/auth.service";
import { Button, Input, Space, Typography, Alert, message } from "../../shared/ui";
import { AuthBrandingPanel } from "../../components/auth/AuthBrandingPanel";

const { Title, Text } = Typography;

const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<"email" | "otp" | "password" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_SECONDS);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sendingRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sendingRef.current) return;
    setError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Vui lòng nhập địa chỉ email của bạn");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Địa chỉ email không đúng định dạng");
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    try {
      const resMsg = await authService.forgotPassword(trimmedEmail);
      setStep("otp");
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_SECONDS);
      message.success(resMsg || `Đã gửi mã OTP 6 chữ số về email: ${trimmedEmail}`);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Không thể gửi mã xác nhận. Vui lòng kiểm tra lại email!");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || sendingRef.current) return;
    setError("");
    sendingRef.current = true;
    setLoading(true);
    try {
      const resMsg = await authService.forgotPassword(email.trim().toLowerCase());
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_SECONDS);
      message.success(resMsg || "Đã gửi lại mã OTP mới đến email của bạn");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Không thể gửi lại mã OTP");
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setOtp(next);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIndex]?.focus();
  };

  const handleContinueToPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Vui lòng nhập đủ 6 chữ số mã OTP");
      return;
    }
    setStep("password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Mã OTP chưa đủ 6 chữ số, vui lòng kiểm tra lại");
      setStep("otp");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự");
      return;
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Mật khẩu mới phải chứa cả chữ cái và số");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Xác nhận mật khẩu mới không khớp");
      return;
    }

    setLoading(true);
    try {
      const resMsg = await authService.resetPassword(email.trim().toLowerCase(), code, newPassword);
      setStep("success");
      message.success(resMsg || "Đặt lại mật khẩu thành công!");
    } catch (err: any) {
      setError(err.message || "Đặt lại mật khẩu thất bại, vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#059669",
          colorBgContainer: "#ffffff",
          colorBorder: "#e2e8f0",
          colorText: "#0f172a",
          colorTextPlaceholder: "#94a3b8",
          borderRadius: 12,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#f8fafc] text-slate-800 flex flex-col lg:flex-row selection:bg-emerald-500 selection:text-white">
        <AuthBrandingPanel
          badgeText="BẢO MẬT & KHÔI PHỤC TÀI KHOẢN"
          titlePrefix="An Tâm Trải Nghiệm,"
          titleHighlight="Bảo Mật Tối Đa"
          description="Hệ thống xác thực mã OTP qua email giúp bạn chủ động khôi phục tài khoản hội viên CueZone nhanh chóng và tuyệt đối bảo mật."
        />

        <div className="relative flex-1 min-h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 bg-white border-l border-slate-200/80">
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-200">
            <Space align="center" size={8}>
              <img
                src="/cuezone-favicon.svg?v=2"
                alt="CueZone Logo"
                className="h-8 w-8 rounded-lg ring-1 ring-emerald-500/50 p-0.5 bg-slate-900"
              />
              <Text className="!text-lg !font-black !text-slate-900 !mb-0">
                CUE<span className="text-emerald-600">ZONE</span>
              </Text>
            </Space>
            <Button
              variant="outline"
              size="sm"
              to="/login"
              className="!text-xs !h-8 !px-3 !border-slate-300 !bg-slate-50 !text-slate-700"
            >
              Đăng Nhập
            </Button>
          </div>

          <div className="my-auto w-full max-w-md mx-auto py-4">
            {step === "email" && (
              <>
                <div className="mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-3 shadow-xs">
                    <KeyOutlined className="text-2xl" />
                  </div>
                  <Title
                    level={2}
                    className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !tracking-tight !mb-1"
                  >
                    Quên Mật Khẩu?
                  </Title>
                  <Text className="!text-xs !text-slate-500 block leading-relaxed">
                    Nhập email đăng ký tài khoản của bạn để nhận mã xác thực OTP khôi phục mật khẩu.
                  </Text>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      title={error}
                      showIcon
                      className="!bg-rose-50 !border-rose-200 !text-rose-700 !text-xs !rounded-xl"
                    />
                  </div>
                )}

                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Địa chỉ Email đăng ký
                    </label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      autoComplete="email"
                      onChange={(e) => setEmail(e.target.value)}
                      prefix={<MailOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      htmlType="submit"
                      loading={loading || sendingRef.current}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      className="!w-full !h-12 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25"
                    >
                      {loading ? "Đang Gửi Mã OTP..." : "Tiếp Tục & Nhận Mã OTP"}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-200 text-center text-xs text-slate-500">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold"
                  >
                    <ArrowLeftOutlined className="text-xs" /> Quay lại trang đăng nhập
                  </Link>
                </div>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-3 shadow-xs">
                    <SafetyCertificateOutlined className="text-2xl" />
                  </div>
                  <Title
                    level={2}
                    className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !tracking-tight !mb-1"
                  >
                    Xác Thực Mã OTP
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    Nhập mã xác thực 6 số gửi đến hộp thư:
                  </Text>
                  <span className="font-semibold text-emerald-700 text-xs break-all mt-0.5 inline-block">
                    {email}
                  </span>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      title={error}
                      showIcon
                      className="!bg-rose-50 !border-rose-200 !text-rose-700 !text-xs !rounded-xl"
                    />
                  </div>
                )}

                <form onSubmit={handleContinueToPassword} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-2 text-center">
                      Nhập mã OTP 6 chữ số
                    </label>
                    <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          aria-label={`Chữ số OTP thứ ${index + 1}`}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-10 sm:w-11 h-12 sm:h-13 text-center text-xl font-bold bg-slate-50 text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner font-mono"
                          required
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      htmlType="submit"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      className="!w-full !h-12 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25"
                    >
                      Tiếp Tục Đặt Mật Khẩu
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("email");
                        setError("");
                      }}
                      leftIcon={<ArrowLeftOutlined />}
                      className="!text-slate-500 hover:!text-slate-800 !p-0"
                    >
                      Đổi email khác
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || loading}
                      className="!text-emerald-600 hover:!text-emerald-700 !p-0 disabled:!opacity-50 font-semibold"
                    >
                      {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã OTP"}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {step === "password" && (
              <>
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mb-3 shadow-xs">
                    <KeyOutlined className="text-2xl" />
                  </div>
                  <Title
                    level={2}
                    className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !tracking-tight !mb-1"
                  >
                    Thiết Lập Mật Khẩu Mới
                  </Title>
                  <Text className="!text-xs !text-slate-500 block">
                    Nhập mật khẩu mới cho tài khoản: <strong>{email}</strong>
                  </Text>
                </div>

                {error && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      title={error}
                      showIcon
                      className="!bg-rose-50 !border-rose-200 !text-rose-700 !text-xs !rounded-xl"
                    />
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu mới
                    </label>
                    <Input.Password
                      placeholder="Tối thiểu 8 ký tự, gồm cả chữ và số"
                      value={newPassword}
                      autoComplete="new-password"
                      onChange={(e) => setNewPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Xác nhận mật khẩu mới
                    </label>
                    <Input.Password
                      placeholder="Nhập lại mật khẩu mới"
                      value={confirmPassword}
                      autoComplete="new-password"
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-400 mr-1.5" />}
                      className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      htmlType="submit"
                      loading={loading}
                      className="!w-full !h-12 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-md shadow-emerald-600/25"
                    >
                      {loading ? "Đang Cập Nhật..." : "Lưu Mật Khẩu Mới"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("otp");
                        setError("");
                      }}
                      leftIcon={<ArrowLeftOutlined />}
                      className="!text-slate-500 hover:!text-slate-800 !p-0"
                    >
                      Quay lại sửa mã OTP
                    </Button>
                  </div>
                </form>
              </>
            )}

            {step === "success" && (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <Title level={2} className="!text-2xl !font-black !text-slate-900 !mb-1">
                  Đổi Mật Khẩu Thành Công!
                </Title>
                <Text className="!text-xs !text-slate-600 block max-w-sm mx-auto leading-relaxed">
                  Mật khẩu tài khoản của bạn đã được cập nhật thành công. Vui lòng đăng nhập lại bằng
                  mật khẩu mới.
                </Text>
                <div className="pt-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate("/login")}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="!w-full !h-12 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold text-sm"
                  >
                    Đăng Nhập Ngay
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] text-slate-400 py-3 border-t border-slate-100">
            <span>CueZone Billiards Management & Bank Pool Tournament System • Phiên bản 2.0</span>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default ForgotPasswordPage;
