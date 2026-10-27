import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  User,
  Eye,
} from "lucide-react";
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
  Tabs,
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

const LOGIN_TABS = [
  {
    key: "customer",
    label: (
      <Space size={6} align="center">
        <User className="h-4 w-4 text-emerald-600" />
        <span className="font-semibold">Hội Viên / Khách Chơi</span>
      </Space>
    ),
  },
  {
    key: "staff",
    label: (
      <Space size={6} align="center">
        <ShieldCheck className="h-4 w-4 text-slate-500" />
        <span className="font-semibold">Nhân Viên & Quản Lý</span>
      </Space>
    ),
  },
];

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("customer");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // Forgot password OTP flow
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotOtp, setForgotOtp] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);

  }, []);

  const handleFormSubmit = useCallback(async () => {
    const trimmedIdentifier = email.trim();
    if (!trimmedIdentifier) {
      message.warning("Vui lòng nhập email hoặc số điện thoại đăng nhập!");
      return;
    }
    if (!password) {
      message.warning("Vui lòng nhập mật khẩu!");
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(trimmedIdentifier, password);
      message.success("Đăng nhập CueZone thành công!");
      navigate(getRoleNavigationPath(loggedInUser?.role));
    } catch (err: any) {
      message.error(err?.message || "Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!");
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

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
        {/* =========================================================================
            CỘT TRÁI (52%): SHOWCASE ĐẶC QUYỀN HỘI VIÊN & THẺ THÀNH VIÊN VIP LOUNGE
            ========================================================================= */}
        <AuthBrandingPanel />

        {/* =========================================================================
            CỘT PHẢI (48%): PORTAL ĐĂNG NHẬP CHUẨN SHARED/UI (TABS KHÁCH HÀNG & NHÂN VIÊN)
            ========================================================================= */}
        <div className="relative flex-1 min-h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 bg-white border-l border-slate-200/80">
          {/* Header Mobile */}
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

          {/* Form Container Trung Tâm */}
          <div className="my-auto w-full max-w-md mx-auto py-4">
            {/* Header Form */}
            <div className="mb-5">
              <Space align="center" size={8} className="mb-1.5">
                <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !tracking-tight !mb-0">
                  Chào Mừng Đến CueZone
                </Title>
              </Space>
              <Text className="!text-xs !text-slate-500 block">
                Hệ thống đặt bàn, quản lý hội viên và điều hành giải đấu billiards
              </Text>
            </div>

            {/* TAB CHUYỂN ĐỔI: [HỘI VIÊN / KHÁCH HÀNG] VS [NHÂN VIÊN & QUẢN TRỊ] */}
            <div className="mb-4">
              <Tabs
                activeKey={activeTab}
                onChange={handleTabChange}
                className="cuezone-login-tabs [&_.ant-tabs-nav]:!mb-4 [&_.ant-tabs-tab]:!text-xs [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab]:!py-2 [&_.ant-tabs-tab]:!text-slate-500 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-700 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
                items={LOGIN_TABS}
              />
            </div>

            {/* Thông báo bối cảnh của Tab được chọn */}
            {activeTab === "customer" ? (
              <div className="mb-4 rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-3.5 flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Text strong className="!text-xs !text-emerald-900 block">
                    Đăng nhập tài khoản Hội Viên
                  </Text>
                  <Text className="!text-[11px] !text-emerald-700 leading-snug">
                    Tích điểm cơ thủ, xem lịch sử đặt bàn và nhận ưu đãi giờ chơi.
                  </Text>
                </div>
              </div>
            ) : (
              <div className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3.5 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <Text strong className="!text-xs !text-amber-900 block">
                    Cổng Vận Hành & Quản Trị Hệ Thống
                  </Text>
                  <Text className="!text-[11px] !text-amber-700 leading-snug">
                    Dành cho Thu ngân, Trọng tài, Nhân viên kho và Quản lý CLB.
                  </Text>
                </div>
              </div>
            )}

            {/* FORM ĐĂNG NHẬP CHÍNH */}
            <Form
              layout="vertical"
              onFinish={handleFormSubmit}
              requiredMark={false}
              className="space-y-3.5"
            >
              <Form.Item
                label={
                  <Text className="!text-xs !font-semibold !text-slate-700">
                    {activeTab === "customer" ? "Email hoặc Số điện thoại" : "Email tài khoản nội bộ"}
                  </Text>
                }
                className="!mb-3"
              >
                <Input
                  type={activeTab === "customer" ? "text" : "email"}
                  size="large"
                  prefix={
                    activeTab === "customer" ? (
                      <Mail className="h-4 w-4 text-slate-400 mr-2" />
                    ) : (
                      <Mail className="h-4 w-4 text-slate-400 mr-2" />
                    )
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    activeTab === "customer"
                      ? "customer1@gmail.com hoặc 0988123456"
                      : "admin@cuezone.com, staff1@cuezone.com"
                  }
                  allowClear
                  className="!h-11 !rounded-xl !border-slate-200 !bg-slate-50/80 hover:!bg-white focus:!bg-white !text-slate-900 text-xs placeholder:!text-slate-400 focus:!border-emerald-600 shadow-2xs"
                />
              </Form.Item>

              <Form.Item
                label={
                  <div className="flex w-full items-center justify-between">
                    <Text className="!text-xs !font-semibold !text-slate-700">Mật khẩu</Text>
                    <Button
                      variant="link"
                      size="sm"
                      disabled
                      title="Khôi phục mật khẩu chưa được kết nối backend"
                      onClick={() => {
                        setForgotEmail(email);
                        setShowForgotModal(true);
                      }}
                      className="!p-0 !h-auto !text-[11px] !font-medium !text-emerald-600 hover:!text-emerald-700"
                    >
                      Quên mật khẩu?
                    </Button>
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

              <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                >
                  <Text className="!text-xs !text-slate-600">Ghi nhớ đăng nhập trên thiết bị này</Text>
                </Checkbox>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                rightIcon={!loading ? <ArrowRight className="h-4 w-4 ml-1.5" /> : undefined}
                className="w-full !h-12 !text-sm !font-bold !rounded-xl shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.008] active:scale-[0.99] mt-2 !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white"
              >
                {loading
                  ? "Đang xác thực thông tin..."
                  : activeTab === "customer"
                  ? "Đăng Nhập Hội Viên"
                  : "Đăng Nhập Quản Trị"}
              </Button>
            </Form>

            {/* Gợi ý tài khoản demo để đăng nhập nhanh */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600">
              <div className="font-semibold text-slate-800 mb-1 flex items-center justify-between">
                <span>Tài khoản trải nghiệm hệ thống:</span>
                <span className="text-[10px] text-emerald-600 font-medium">Bấm để điền nhanh</span>
              </div>
              {activeTab === "customer" ? (
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-slate-500">Hội viên: <strong className="text-slate-700">customer1@gmail.com</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("customer1@gmail.com");
                      setPassword("admin123");
                    }}
                    className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                  >
                    Điền
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500">Admin: <strong className="text-slate-700">admin@cuezone.com</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("admin@cuezone.com");
                        setPassword("password123");
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      Điền (Admin)
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-slate-500">Thu ngân: <strong className="text-slate-700">staff1@cuezone.com</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("staff1@cuezone.com");
                        setPassword("admin123");
                      }}
                      className="text-emerald-600 hover:text-emerald-700 font-bold underline cursor-pointer"
                    >
                      Điền (Staff)
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DÀNH CHO KHÁCH VÃNG LAI: KHÔNG CẦN TÀI KHOẢN VẪN TRA CỨU ĐƯỢC BÀN */}
            {activeTab === "customer" && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between shadow-2xs">
                  <div className="pr-3">
                    <Space align="center" size={6} className="mb-0.5">
                      <Eye className="h-3.5 w-3.5 text-emerald-600" />
                      <Text strong className="!text-xs !text-slate-900">
                        Khách Vãng Lai (Không Cần Tài Khoản)
                      </Text>
                    </Space>
                    <Text className="!text-[11px] !text-slate-500 block">
                      Xem danh sách bàn trống theo thời gian thực & đặt bàn nhanh
                    </Text>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    to="/customer"
                    className="!text-xs !h-8 !px-3 !border-slate-300 !bg-white !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 flex-shrink-0"
                  >
                    Xem Ngay
                  </Button>
                </div>

                {/* Link Đăng Ký Hội Viên Mới */}
                <div className="mt-3.5 text-center text-xs text-slate-500">
                  <Text className="!text-xs !text-slate-500">Chưa có thẻ hội viên?</Text>{" "}
                  <Button
                    variant="link"
                    to="/register"
                    className="!p-0 !h-auto !text-xs !font-bold !text-emerald-600 hover:!text-emerald-700 ml-1 inline-block"
                  >
                    Đăng ký tài khoản miễn phí
                  </Button>
                </div>
              </div>
            )}

          </div>

          {/* Modal Quên mật khẩu qua OTP (Send OTP Reset Email -> Verify OTP) */}
          <Modal
            open={showForgotModal}
            onCancel={() => {
              setShowForgotModal(false);
              setForgotStep("email");
            }}
            footer={null}
            title={
              <span className="text-slate-900 font-bold text-sm">
                {forgotStep === "email" ? "Khôi Phục Mật Khẩu Qua Email" : "Xác Thực OTP & Đặt Mật Khẩu Mới"}
              </span>
            }
          >
            <div className="py-2 space-y-4 text-xs">
              {forgotStep === "email" ? (
                <>
                  <p className="text-slate-600 text-xs leading-relaxed mb-0">
                    Nhập địa chỉ email tài khoản CueZone của bạn. Hệ thống sẽ gửi mã xác thực OTP 4 chữ số để tiến hành đặt lại mật khẩu.
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
                          message.success(resMsg || `Đã gửi mã xác thực OTP 6 chữ số về email: ${trimmedEmail}`);
                        } catch (err: any) {
                          message.error(err.message || "Không thể gửi mã xác thực. Vui lòng thử lại!");
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
                    Mã OTP 6 số đã được gửi đến: <strong>{forgotEmail}</strong>. Vui lòng kiểm tra hộp thư email (kể cả thư rác/spam).
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
                          if (!/[a-zA-Z]/.test(forgotNewPassword) || !/[0-9]/.test(forgotNewPassword)) {
                            message.warning("Mật khẩu mới phải chứa cả chữ cái và chữ số!");
                            return;
                          }
                          setIsResetting(true);
                          try {
                            const resMsg = await authService.resetPassword(
                              forgotEmail.trim(),
                              forgotOtp.trim(),
                              forgotNewPassword
                            );
                            message.success(resMsg || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.");
                            setShowForgotModal(false);
                            setForgotStep("email");
                            setForgotOtp("");
                            setForgotNewPassword("");
                          } catch (err: any) {
                            message.error(err.message || "Đặt lại mật khẩu thất bại, vui lòng thử lại!");
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

          {/* Footer Bản Quyền */}
          <div className="pt-3 text-center text-[11px] text-slate-500">
            <Text className="!text-[11px] !text-slate-500">
              CueZone Billiards Management & Bank Pool Tournament System • Phiên bản 2.0
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LoginPage;


