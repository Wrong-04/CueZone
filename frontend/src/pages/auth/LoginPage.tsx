import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import { Lock, Mail, ArrowRight } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { authService } from "../../services/auth.service";
import { UserRole } from "../../types";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Space,
  Typography,
  Modal,
  message,
} from "../../shared/ui";
import { AuthBrandingPanel } from "../../components/auth/AuthBrandingPanel";

const { Title, Text } = Typography;

const getRoleNavigationPath = (role?: string): string => {
  switch (role) {
    case UserRole.CUSTOMER:
      return "/customer";
    case UserRole.STAFF:
      return "/pos";
    case UserRole.ADMIN:
      return "/dashboard";
    case UserRole.CASHIER:
      return "/wallet-topups";
    case UserRole.WAREHOUSE:
      return "/stock-catalog";
    case UserRole.REFEREE:
      return "/tournaments";
    default:
      return "/customer";
  }
};

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotOtp, setForgotOtp] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFormSubmit = useCallback(async () => {
    const trimmed = identifier.trim();
    if (!trimmed) {
      message.warning("Vui lòng nhập email hoặc số điện thoại đăng nhập!");
      return;
    }
    if (!password) {
      message.warning("Vui lòng nhập mật khẩu!");
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(trimmed, password);
      message.success("Đăng nhập CueZone thành công!");
      navigate(getRoleNavigationPath(loggedInUser?.role));
    } catch (err: any) {
      message.error(err?.message || "Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  }, [identifier, password, login, navigate]);

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
        <AuthBrandingPanel />

        <div className="relative flex-1 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 bg-white border-l border-slate-200/80">
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
              to="/customer"
              className="!text-xs !h-8 !px-3 !border-slate-300 !bg-slate-50 !text-slate-700"
            >
              Cổng Khách
            </Button>
          </div>

          <div className="my-auto w-full max-w-sm sm:max-w-md mx-auto py-8">
            <div className="mb-7">
              <Title
                level={2}
                className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !tracking-tight !mb-2"
              >
                Đăng Nhập
              </Title>
              <Text className="!text-sm !text-slate-500 block leading-relaxed">
                Chào mừng bạn trở lại với hệ thống quản lý & đặt bàn CueZone
              </Text>
            </div>

            <Form
              layout="vertical"
              onFinish={handleFormSubmit}
              requiredMark={false}
              className="space-y-4"
            >
              <Form.Item
                label={
                  <Text className="!text-xs !font-semibold !text-slate-700">
                    Email hoặc Số điện thoại
                  </Text>
                }
                className="!mb-3"
              >
                <Input
                  type="text"
                  size="large"
                  prefix={<Mail className="h-4 w-4 text-slate-400 mr-2" />}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com hoặc 0988123456"
                  allowClear
                  className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                />
              </Form.Item>

              <Form.Item
                label={
                  <div className="flex w-full items-center justify-between">
                    <Text className="!text-xs !font-semibold !text-slate-700">Mật khẩu</Text>
                    <Link
                      to="/forgot-password"
                      className="!text-xs !font-medium !text-emerald-600 hover:!text-emerald-700 hover:underline cursor-pointer"
                    >
                      Quên mật khẩu?
                    </Link>
                  </div>
                }
                className="!mb-3"
              >
                <Input.Password
                  size="large"
                  prefix={<Lock className="h-4 w-4 text-slate-400 mr-2" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                />
              </Form.Item>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5 pb-1">
                <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}>
                  <Text className="!text-xs !text-slate-600">
                    Ghi nhớ đăng nhập
                  </Text>
                </Checkbox>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                rightIcon={!loading ? <ArrowRight className="h-4 w-4 ml-1.5" /> : undefined}
                className="w-full !h-12 !text-sm !font-bold !rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.008] active:scale-[0.99] !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white"
              >
                {loading ? "Đang xác thực thông tin..." : "Đăng Nhập"}
              </Button>
            </Form>

            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div>
                <span>Chưa có tài khoản?</span>{" "}
                <Link
                  to="/register"
                  className="font-bold text-emerald-600 hover:text-emerald-700 hover:underline ml-1"
                >
                  Đăng ký ngay
                </Link>
              </div>

              <div>
                <Link
                  to="/customer"
                  className="font-medium text-slate-600 hover:text-emerald-600 hover:underline"
                >
                  Vào với tư cách Khách ➔
                </Link>
              </div>
            </div>
          </div>

          <Modal
            open={showForgotModal}
            onCancel={() => {
              setShowForgotModal(false);
              setForgotStep("email");
            }}
            footer={null}
            title={
              <span className="text-slate-900 font-bold text-sm">
                {forgotStep === "email"
                  ? "Khôi Phục Mật Khẩu Qua Email"
                  : "Xác Thực OTP & Đặt Mật Khẩu Mới"}
              </span>
            }
          >
            <div className="py-2 space-y-4 text-xs">
              {forgotStep === "email" ? (
                <>
                  <p className="text-slate-600 text-xs leading-relaxed mb-0">
                    Nhập địa chỉ email tài khoản CueZone của bạn. Hệ thống sẽ gửi mã xác thực OTP 6
                    chữ số để tiến hành đặt lại mật khẩu.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Email nhận mã OTP:
                    </label>
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="!h-10 !rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForgotModal(false)}
                      className="!rounded-xl"
                    >
                      Hủy bỏ
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isSendingOtp}
                      onClick={async () => {
                        const trimmedEmail = forgotEmail.trim();
                        if (!trimmedEmail) {
                          message.warning("Vui lòng nhập địa chỉ email!");
                          return;
                        }
                        setIsSendingOtp(true);
                        try {
                          const resMsg = await authService.forgotPassword(trimmedEmail);
                          setForgotStep("otp");
                          message.success(
                            resMsg || `Đã gửi mã xác thực OTP 6 chữ số về email: ${trimmedEmail}`,
                          );
                        } catch (err: any) {
                          message.error(
                            err.message || "Không thể gửi mã xác thực. Vui lòng thử lại!",
                          );
                        } finally {
                          setIsSendingOtp(false);
                        }
                      }}
                      className="!bg-emerald-600 !border-emerald-600 !rounded-xl font-bold"
                    >
                      Gửi Mã OTP
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
                    Mã OTP 6 số đã được gửi đến: <strong>{forgotEmail}</strong>. Vui lòng kiểm tra
                    hộp thư email (kể cả thư rác/spam).
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nhập mã OTP 6 số:
                    </label>
                    <Input
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      maxLength={6}
                      placeholder="123456"
                      className="!h-10 !rounded-xl text-center font-mono font-bold tracking-widest text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Mật khẩu mới:
                    </label>
                    <Input.Password
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="Tối thiểu 8 ký tự, gồm cả chữ và số"
                      className="!h-10 !rounded-xl"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForgotStep("email")}
                      className="!text-xs !text-slate-500"
                    >
                      Gửi lại mã khác
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowForgotModal(false)}
                        className="!rounded-xl"
                      >
                        Đóng
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={isResetting}
                        onClick={async () => {
                          if (forgotOtp.length !== 6) {
                            message.warning("Vui lòng nhập đủ 6 chữ số mã OTP!");
                            return;
                          }
                          if (forgotNewPassword.length < 8) {
                            message.warning("Mật khẩu mới phải có ít nhất 8 ký tự!");
                            return;
                          }
                          if (
                            !/[a-zA-Z]/.test(forgotNewPassword) ||
                            !/[0-9]/.test(forgotNewPassword)
                          ) {
                            message.warning("Mật khẩu mới phải chứa cả chữ cái và chữ số!");
                            return;
                          }
                          setIsResetting(true);
                          try {
                            const resMsg = await authService.resetPassword(
                              forgotEmail.trim(),
                              forgotOtp.trim(),
                              forgotNewPassword,
                            );
                            message.success(
                              resMsg || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.",
                            );
                            setShowForgotModal(false);
                            setForgotStep("email");
                            setForgotOtp("");
                            setForgotNewPassword("");
                          } catch (err: any) {
                            message.error(
                              err.message || "Đặt lại mật khẩu thất bại, vui lòng thử lại!",
                            );
                          } finally {
                            setIsResetting(false);
                          }
                        }}
                        className="!bg-emerald-600 !border-emerald-600 !rounded-xl font-bold"
                      >
                        Xác Nhận Đặt Lại
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Modal>

          <div className="pt-4 text-center text-[11px] text-slate-400">
            <Text className="!text-[11px] !text-slate-400">
              © 2026 CueZone Billiards System. All rights reserved.
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LoginPage;
