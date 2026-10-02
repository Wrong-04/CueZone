import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import {
  Lock,
  Mail,
  Zap,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  User,
  Eye,
  ChevronDown,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../../contexts/AuthContext";
import { UserRole } from "../../types";
import {
  SEED_ACCOUNTS,
  type SeedAccount,
  findSeedAccountByEmail,
} from "../../mock/seedData";
import {
  Button,
  Checkbox,
  Form,
  Input,
  Space,
  Tag,
  Typography,
  Tabs,
  Modal,
  message,
} from "../../shared/ui";
import { AuthBrandingPanel } from "../../components/auth/AuthBrandingPanel";

const { Title, Text } = Typography;

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("customer");
  const [email, setEmail] = useState<string>("customer@cuezone.com");
  const [password, setPassword] = useState<string>("password123");
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showDemoAccounts, setShowDemoAccounts] = useState<boolean>(false);

  // Forgot password OTP flow
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("customer@cuezone.com");
  const [forgotOtp, setForgotOtp] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [forgotStep, setForgotStep] = useState<"email" | "otp">("email");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const { login, loginWithSeed } = useAuth();
  const navigate = useNavigate();

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === "customer") {
      setEmail("customer@cuezone.com");
      setPassword("password123");
    } else {
      setEmail("admin@cuezone.com");
      setPassword("password123");
    }
  };

  const handleSelectSeed = (seed: SeedAccount) => {
    setEmail(seed.email);
    setPassword(seed.password);
    if (seed.role === UserRole.CUSTOMER) {
      setActiveTab("customer");
    } else {
      setActiveTab("staff");
    }
    message.info(`Đã điền tài khoản: ${seed.name}`);
  };

  const handleInstantSeedLogin = async (seed: SeedAccount) => {
    handleSelectSeed(seed);
    setLoading(true);
    try {
      loginWithSeed(seed);
      message.success(`Đăng nhập thành công với vai trò: ${seed.roleTitle}`);
      navigate(seed.targetPath);
    } catch {
      message.error("Đăng nhập thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!email) {
      message.warning("Vui lòng nhập email hoặc tài khoản đăng nhập!");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      const matchedSeed = findSeedAccountByEmail(email);
      const targetRole =
        matchedSeed?.role ||
        (email.includes("admin")
          ? UserRole.ADMIN
          : email.includes("staff")
          ? UserRole.STAFF
          : UserRole.CUSTOMER);

      const targetPath =
        targetRole === UserRole.CUSTOMER
          ? "/customer"
          : targetRole === UserRole.STAFF
          ? "/admin/tables"
          : "/admin";

      message.success("Đăng nhập CueZone thành công!");
      navigate(targetPath);
    } catch {
      message.error("Đăng nhập thất bại, vui lòng kiểm tra lại thông tin!");
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
                items={[
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
                ]}
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
                      ? "customer@cuezone.com hoặc 0912 345 678"
                      : "admin@cuezone.com, staff@cuezone.com"
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
                      onClick={() => {
                        setForgotEmail(email || "customer@cuezone.com");
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

            {/* HỘP TEST TÀI KHOẢN MẪU (THU GỌN GỌN GÀNG, KHÔNG PHÁ HỎNG GIAO DIỆN) */}
            <div className="mt-5 pt-3 border-t border-slate-200">
              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3">
                <div
                  className="flex items-center justify-between cursor-pointer select-none"
                  onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                >
                  <Space align="center" size={6}>
                    <Zap className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600/20" />
                    <Text strong className="!text-xs !text-emerald-800">
                      Tài khoản thử nghiệm (1-Click Demo)
                    </Text>
                  </Space>
                  <Space align="center" size={4}>
                    <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 !bg-emerald-100 !text-emerald-800 !font-bold">
                      3 Vai trò
                    </Tag>
                    <ChevronDown
                      className={clsx(
                        "h-3.5 w-3.5 text-slate-500 transition-transform duration-200",
                        showDemoAccounts && "rotate-180"
                      )}
                    />
                  </Space>
                </div>

                {showDemoAccounts && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200 space-y-2 animate-fade-in">
                    <Text className="!text-[11px] !text-slate-500 block mb-1.5">
                      Bấm vào vai trò bất kỳ để điền form hoặc bấm &quot;Vào ngay&quot; để đăng nhập tức thì:
                    </Text>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SEED_ACCOUNTS.map((acc) => (
                        <div
                          key={acc.id}
                          className="rounded-xl border border-slate-200 bg-white p-2.5 hover:border-emerald-500 hover:shadow-sm transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Text strong className="!text-[11px] !text-slate-900 truncate">
                                {acc.role === UserRole.ADMIN
                                  ? "Admin (Chủ CLB)"
                                  : acc.role === UserRole.STAFF
                                  ? "Staff (Vận Hành)"
                                  : "Hội Viên (Cơ Thủ)"}
                              </Text>
                            </div>
                            <Text className="!text-[10px] !text-slate-500 truncate block">
                              {acc.email}
                            </Text>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSelectSeed(acc)}
                              className="!p-0 !h-auto !text-[10px] !text-slate-500 hover:!text-slate-900"
                            >
                              Điền form
                            </Button>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => handleInstantSeedLogin(acc)}
                              disabled={loading}
                              rightIcon={<ArrowRight className="h-2.5 w-2.5" />}
                              className="!p-0 !h-auto !text-[10px] !font-bold !text-emerald-600 hover:!text-emerald-700"
                            >
                              Vào ngay
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
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
                      onClick={() => {
                        if (!forgotEmail) {
                          message.warning("Vui lòng nhập địa chỉ email!");
                          return;
                        }
                        setIsSendingOtp(true);
                        setTimeout(() => {
                          setIsSendingOtp(false);
                          setForgotStep("otp");
                          message.success(`Đã gửi mã xác thực OTP 4 chữ số về email: ${forgotEmail}`);
                        }, 700);
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
                    Mã OTP 4 số đã được gửi đến: <strong>{forgotEmail}</strong>. (Mã thử nghiệm: <strong>8888</strong>)
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Nhập mã OTP 4 số:
                    </label>
                    <Input
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      maxLength={4}
                      placeholder="8888"
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
                      placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
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
                        onClick={() => {
                          if (forgotOtp.length < 4) {
                            message.warning("Vui lòng nhập đủ 4 chữ số mã OTP!");
                            return;
                          }
                          if (forgotNewPassword.length < 6) {
                            message.warning("Mật khẩu mới tối thiểu 6 ký tự!");
                            return;
                          }
                          setIsResetting(true);
                          setTimeout(() => {
                            setIsResetting(false);
                            setShowForgotModal(false);
                            setForgotStep("email");
                            setForgotOtp("");
                            setForgotNewPassword("");
                            message.success("Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.");
                          }, 800);
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


