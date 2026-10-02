import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import {
  ArrowLeftOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Button,
  Input,
  Space,
  Typography,
  Alert,
} from "../../shared/ui";
import { AuthBrandingPanel } from "../../components/auth/AuthBrandingPanel";

const { Title, Text } = Typography;

const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

const RegisterPage: React.FC = () => {
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_SECONDS);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sendingRef = useRef(false);
  const { sendVerificationCode, verifyAndRegister } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const validateForm = (): string | null => {
    if (!name.trim()) return "Vui lòng nhập họ và tên của bạn";
    if (!email.trim()) return "Vui lòng nhập địa chỉ email hợp lệ";
    if (password !== confirmPassword) return "Mật khẩu xác nhận không khớp";
    if (password.length < 8) return "Mật khẩu phải có ít nhất 8 ký tự";
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return "Mật khẩu phải chứa cả chữ cái và số";
    }
    return null;
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sendingRef.current) return;
    setError("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    sendingRef.current = true;
    setLoading(true);
    try {
      await sendVerificationCode(name, email, password, phone || undefined);
      setStep("otp");
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_SECONDS);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Không thể gửi mã xác minh");
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
      await sendVerificationCode(name, email, password, phone || undefined);
      setOtp(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_SECONDS);
      setError("");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Không thể gửi lại mã");
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const code = otp.join("");
    if (code.length !== OTP_LENGTH) {
      setError("Vui lòng nhập đủ 4 chữ số");
      return;
    }

    setLoading(true);
    try {
      await verifyAndRegister(email, code);
      navigate("/customer");
    } catch (err: any) {
      setError(err.message || "Xác minh thất bại");
      setOtp(Array(OTP_LENGTH).fill(""));
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#059669",
          colorBgContainer: "#0b131e",
          colorBorder: "#1e293b",
          colorText: "#f1f5f9",
          colorTextPlaceholder: "#64748b",
          borderRadius: 8,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
        components: {
          Input: {
            colorBgContainer: "#0b131e",
            colorBorder: "#1e293b",
            activeBorderColor: "#059669",
            hoverBorderColor: "#10b981",
            activeShadow: "0 0 0 2px rgba(5, 150, 105, 0.2)",
            colorText: "#f1f5f9",
            colorTextPlaceholder: "#64748b",
          },
        },
      }}
    >
      <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#070d14] text-slate-100 flex flex-col lg:flex-row selection:bg-emerald-500 selection:text-white">
        {/* =========================================================================
            CỘT TRÁI (52%): THƯƠNG HIỆU & ĐẶC QUYỀN HỘI VIÊN (ĐỒNG BỘ VỚI FORM LOGIN)
            ========================================================================= */}
        <AuthBrandingPanel
          badgeText="GIA NHẬP HỘI VIÊN CUEZONE CLUB"
          titlePrefix="Khởi Đầu Đam Mê,"
          titleHighlight="Đặc Quyền Hội Viên"
          description="Đăng ký tài khoản ngay hôm nay để nhận voucher trải nghiệm 50.000đ, tham gia cộng đồng cơ thủ bida chuẩn quốc tế và tận hưởng quyền lợi độc quyền."
        />

        {/* =========================================================================
            CỘT PHẢI (48%): PORTAL ĐĂNG KÝ & XÁC MINH OTP
            ========================================================================= */}
        <div className="relative flex-1 min-h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 bg-gradient-to-b from-[#080e18] via-[#09121d] to-[#060a10]">
          {/* Header Mobile */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-800">
            <Space align="center" size={8}>
              <img
                src="/cuezone-favicon.svg?v=2"
                alt="CueZone Logo"
                className="h-8 w-8 rounded-lg ring-1 ring-emerald-500/50 p-0.5 bg-slate-900"
              />
              <Text className="!text-lg !font-black !text-white !mb-0">
                CUE<span className="text-emerald-400">ZONE</span>
              </Text>
            </Space>
            <Button
              variant="outline"
              size="sm"
              to="/customer"
              className="!text-xs !h-8 !px-3 !border-slate-800 !bg-slate-900 !text-slate-300"
            >
              Cổng Khách
            </Button>
          </div>

          {/* Form Container Trung Tâm */}
          <div className="my-auto w-full max-w-md mx-auto py-4">
            {step === "form" ? (
              <>
                {/* Header Form */}
                <div className="mb-5">
                  <Title level={2} className="!text-2xl !font-bold !text-white !tracking-tight !mb-1">
                    Đăng Ký Tài Khoản
                  </Title>
                  <Text className="!text-xs !text-slate-400 block">
                    Tham gia hệ thống CueZone Billiards để nhận voucher và đặt bàn ưu tiên
                  </Text>
                </div>

                {/* Banner Ưu Đãi Tân Thủ */}
                <div className="mb-5 rounded-xl border border-emerald-900/40 bg-emerald-950/25 p-3 flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <Text strong className="!text-xs !text-emerald-300 block">
                      Ưu Đãi Hội Viên Mới
                    </Text>
                    <Text className="!text-[11px] !text-slate-400 leading-snug">
                      Nhận ngay voucher trải nghiệm 50.000đ trực tiếp vào tài khoản sau khi hoàn tất xác minh email.
                    </Text>
                  </div>
                </div>

                {/* Thông báo lỗi */}
                {error && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      message={error}
                      showIcon
                      className="!bg-rose-950/30 !border-rose-900/50 !text-rose-300 !text-xs !rounded-xl"
                    />
                  </div>
                )}

                {/* Form Đăng ký */}
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Họ và tên
                    </label>
                    <Input
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      prefix={<UserOutlined className="text-slate-500 mr-1.5" />}
                      className="!bg-[#0b131e] !border-slate-800 hover:!border-slate-700 focus:!border-emerald-500 focus-within:!border-emerald-500 !text-slate-200 !h-11 !rounded-xl [&_input]:!bg-transparent [&_input]:!text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Email
                    </label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      prefix={<MailOutlined className="text-slate-500 mr-1.5" />}
                      className="!bg-[#0b131e] !border-slate-800 hover:!border-slate-700 focus:!border-emerald-500 focus-within:!border-emerald-500 !text-slate-200 !h-11 !rounded-xl [&_input]:!bg-transparent [&_input]:!text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Số điện thoại <span className="text-slate-500 font-normal">(tùy chọn)</span>
                    </label>
                    <Input
                      type="tel"
                      placeholder="0912 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      prefix={<PhoneOutlined className="text-slate-500 mr-1.5" />}
                      className="!bg-[#0b131e] !border-slate-800 hover:!border-slate-700 focus:!border-emerald-500 focus-within:!border-emerald-500 !text-slate-200 !h-11 !rounded-xl [&_input]:!bg-transparent [&_input]:!text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Mật khẩu
                    </label>
                    <Input.Password
                      placeholder="Ít nhất 8 ký tự, gồm chữ và số"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-500 mr-1.5" />}
                      className="!bg-[#0b131e] !border-slate-800 hover:!border-slate-700 focus:!border-emerald-500 focus-within:!border-emerald-500 !text-slate-200 !h-11 !rounded-xl [&_input]:!bg-transparent [&_input]:!text-slate-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Xác nhận mật khẩu
                    </label>
                    <Input.Password
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      prefix={<LockOutlined className="text-slate-500 mr-1.5" />}
                      className="!bg-[#0b131e] !border-slate-800 hover:!border-slate-700 focus:!border-emerald-500 focus-within:!border-emerald-500 !text-slate-200 !h-11 !rounded-xl [&_input]:!bg-transparent [&_input]:!text-slate-100"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="primary"
                      htmlType="submit"
                      loading={loading || sendingRef.current}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      className="!w-full !h-11 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/50"
                    >
                      {loading ? "Đang Gửi Mã Xác Thực..." : "Tiếp Tục & Nhận Mã OTP"}
                    </Button>
                  </div>
                </form>

                {/* Footer Liên Kết Đăng Nhập */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
                  <span>Đã có tài khoản hội viên? </span>
                  <Link
                    to="/login"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* Header OTP */}
                <div className="mb-5 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-950/50">
                    <SafetyCertificateOutlined className="text-2xl" />
                  </div>
                  <Title level={2} className="!text-2xl !font-bold !text-white !tracking-tight !mb-1">
                    Xác Minh Email
                  </Title>
                  <Text className="!text-xs !text-slate-400 block">
                    Nhập mã xác thực 4 chữ số đã được gửi đến:
                  </Text>
                  <span className="font-semibold text-emerald-400 text-xs break-all mt-1 inline-block">
                    {email}
                  </span>
                </div>

                {/* Thông báo lỗi */}
                {error && (
                  <div className="mb-4">
                    <Alert
                      type="error"
                      message={error}
                      showIcon
                      className="!bg-rose-950/30 !border-rose-900/50 !text-rose-300 !text-xs !rounded-xl"
                    />
                  </div>
                )}

                {/* Form Nhập OTP */}
                <form onSubmit={handleVerify} className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-3 text-center">
                      Nhập mã 4 chữ số (OTP)
                    </label>
                    <div className="flex justify-center gap-3.5" onPaste={handleOtpPaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            otpRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-13 h-14 text-center text-2xl font-bold bg-slate-900/80 text-white border border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
                          required
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    htmlType="submit"
                    loading={loading}
                    className="!w-full !h-11 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-950/50"
                  >
                    {loading ? "Đang Xác Minh..." : "Xác Minh & Kích Hoạt Tài Khoản"}
                  </Button>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setStep("form");
                        setError("");
                        setOtp(Array(OTP_LENGTH).fill(""));
                      }}
                      leftIcon={<ArrowLeftOutlined />}
                      className="!text-slate-400 hover:!text-slate-200 !p-0"
                    >
                      Quay lại sửa thông tin
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleResend}
                      disabled={resendCooldown > 0 || loading}
                      className="!text-emerald-400 hover:!text-emerald-300 !p-0 disabled:!opacity-50"
                    >
                      {resendCooldown > 0 ? `Gửi lại sau ${resendCooldown}s` : "Gửi lại mã OTP"}
                    </Button>
                  </div>
                </form>

                {/* Footer Liên Kết Đăng Nhập */}
                <div className="mt-8 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
                  <span>Đã có tài khoản? </span>
                  <Link
                    to="/login"
                    className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4"
                  >
                    Đăng nhập ngay
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Footer Phải */}
          <div className="text-center text-[11px] text-slate-500 py-3 border-t border-slate-900">
            <span>CueZone Billiards Management & Bank Pool Tournament System • Phiên bản 2.0</span>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default RegisterPage;
