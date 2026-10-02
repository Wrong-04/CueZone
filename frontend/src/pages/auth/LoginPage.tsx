import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfigProvider, theme } from "antd";
import {
  Lock,
  Mail,
  Zap,
  ArrowRight,
  Sparkles,
  Trophy,
  ShieldCheck,
  UserCheck,
  User,
  CreditCard,
  Eye,
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
  Card,
  Checkbox,
  Form,
  Input,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

const ROLE_ICONS: Record<string, React.ReactNode> = {
  [UserRole.ADMIN]: <ShieldCheck className="h-3.5 w-3.5" />,
  [UserRole.STAFF]: <UserCheck className="h-3.5 w-3.5" />,
  [UserRole.CUSTOMER]: <User className="h-3.5 w-3.5" />,
};

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState<string>("admin@cuezone.com");
  const [password, setPassword] = useState<string>("password123");
  const [selectedSeed, setSelectedSeed] = useState<SeedAccount>(SEED_ACCOUNTS[0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const { login, loginWithSeed } = useAuth();
  const navigate = useNavigate();

  const handleSelectSeed = (seed: SeedAccount) => {
    setSelectedSeed(seed);
    setEmail(seed.email);
    setPassword(seed.password);
  };

  const handleInstantSeedLogin = async (seed: SeedAccount) => {
    handleSelectSeed(seed);
    setLoading(true);
    try {
      loginWithSeed(seed);
      message.success(`Đăng nhập vai trò: ${seed.roleTitle}`);
      navigate(seed.targetPath);
    } catch {
      message.error("Đăng nhập thất bại. Vui lòng thử lại!");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async () => {
    if (!email) {
      message.warning("Vui lòng nhập email đăng nhập!");
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

      message.success("Đăng nhập thành công!");
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
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: "#059669",
          colorBgContainer: "#0b131e",
          colorBorder: "#1e293b",
          borderRadius: 8,
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <div className="relative min-h-screen w-screen overflow-x-hidden bg-[#070d14] text-slate-100 flex flex-col lg:flex-row selection:bg-emerald-500 selection:text-white">
        {/* CỘT TRÁI (50%): HERO & CONTEXT DIAGRAM SYSTEM ARCHITECTURE */}
        <div className="relative hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-8 xl:p-12 overflow-hidden border-r border-emerald-950/60">
          <div className="absolute inset-0 z-0">
            <img
              src="/cuezone_billiards_hero.jpg"
              alt="CueZone Billiards Club & Lounge"
              className="h-full w-full object-cover object-center filter brightness-[0.32] contrast-[1.15]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070d14] via-[#070d14]/65 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#070d14]/40 to-[#070d14]" />
            <div className="absolute inset-0 bg-emerald-950/25 mix-blend-color" />
          </div>

          {/* Header trái */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/cuezone-favicon.svg?v=2"
                alt="CueZone Logo"
                className="h-10 w-10 rounded-xl shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/50"
              />
              <div>
                <Space align="center" size={6}>
                  <Text className="!text-xl !font-black !tracking-wider !text-white !mb-0">
                    CUE<span className="text-emerald-400">ZONE</span>
                  </Text>
                  <Tag color="green" className="!rounded-full !px-2 !py-0 !text-[10px] !font-bold !border-emerald-500/40 !bg-emerald-500/20 !text-emerald-300">
                    BANK POOL & CLUB
                  </Tag>
                </Space>
                <Text className="!text-[11px] !text-slate-400 block leading-tight">
                  Billiards Clubs & Bank Pool Tournament System
                </Text>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              to="/customer"
              rightIcon={<ArrowRight className="h-3.5 w-3.5 text-emerald-400" />}
              className="!border-slate-800 !bg-slate-900/60 !text-slate-300 hover:!border-emerald-500 hover:!text-emerald-300 backdrop-blur-md !text-xs !h-8 !px-3"
            >
              Cổng Khách Hàng
            </Button>
          </div>

          {/* Giữa: Giới thiệu hệ thống & Sơ đồ phân vai trò chuẩn Context Diagram */}
          <div className="relative z-10 max-w-lg space-y-4 my-auto py-6">
            <Tag
              color="green"
              className="!inline-flex !items-center !gap-1.5 !rounded-full !border-emerald-500/40 !bg-emerald-500/15 !px-3 !py-0.5 !text-[11px] !font-semibold !text-emerald-300 shadow-sm shadow-emerald-500/10"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>HỆ THỐNG QUẢN TRỊ CLB & GIẢI ĐẤU TOÀN DIỆN</span>
            </Tag>

            <Title level={1} className="!text-3xl xl:!text-4xl !font-extrabold !text-white !leading-tight !mb-0">
              Vận Hành Chuẩn Xác <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent">
                Kết Nối 4 Vai Trò Hệ Thống
              </span>
            </Title>

            <Paragraph className="!text-xs xl:!text-sm !text-slate-300 !leading-relaxed !mb-0">
              Được thiết kế chuyên biệt cho mô hình CLB Billiards & Giải đấu Bank Pool, liên thông liền mạch giữa Quản trị, Vận hành bàn, Hội viên và Khách vãng lai.
            </Paragraph>

            {/* 4 Khối Vai Trò theo đúng Context Diagram */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Card className="!rounded-xl !border-emerald-900/40 !bg-slate-950/60 backdrop-blur-md [&>.ant-card-body]:!p-3">
                <Space align="center" size={6} className="mb-1">
                  <ShieldCheck className="h-4 w-4 text-red-400" />
                  <Text strong className="!text-xs !text-white">Admin (Chủ CLB)</Text>
                </Space>
                <Text className="!text-[11px] !text-slate-400 block leading-snug">
                  Cấu hình giá giờ bàn, nhân sự, kho hàng, giải đấu & xem báo cáo doanh thu.
                </Text>
              </Card>

              <Card className="!rounded-xl !border-emerald-900/40 !bg-slate-950/60 backdrop-blur-md [&>.ant-card-body]:!p-3">
                <Space align="center" size={6} className="mb-1">
                  <UserCheck className="h-4 w-4 text-emerald-400" />
                  <Text strong className="!text-xs !text-white">Staff (Vận Hành)</Text>
                </Space>
                <Text className="!text-[11px] !text-slate-400 block leading-snug">
                  Mở bàn realtime, duyệt đặt bàn, duyệt order F&B, in hóa đơn & giao ca.
                </Text>
              </Card>

              <Card className="!rounded-xl !border-emerald-900/40 !bg-slate-950/60 backdrop-blur-md [&>.ant-card-body]:!p-3">
                <Space align="center" size={6} className="mb-1">
                  <User className="h-4 w-4 text-amber-400" />
                  <Text strong className="!text-xs !text-white">Customer (Hội Viên)</Text>
                </Space>
                <Text className="!text-[11px] !text-slate-400 block leading-snug">
                  Tra cứu bàn realtime, đặt bàn trước, order F&B, tích điểm & thi đấu giải.
                </Text>
              </Card>

              <Card className="!rounded-xl !border-emerald-900/40 !bg-slate-950/60 backdrop-blur-md [&>.ant-card-body]:!p-3">
                <Space align="center" size={6} className="mb-1">
                  <Eye className="h-4 w-4 text-sky-400" />
                  <Text strong className="!text-xs !text-white">Guest (Khách Vãng Lai)</Text>
                </Space>
                <Text className="!text-[11px] !text-slate-400 block leading-snug">
                  Xem menu F&B, kiểm tra bàn trống, xem giải đấu và đăng ký hội viên.
                </Text>
              </Card>
            </div>
          </div>

          {/* Footer trái: VNPay Integration & Trạng thái CLB */}
          <div className="relative z-10 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <Space align="center" size={8}>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <Text className="!text-[11px] !text-slate-400">
                CLB hoạt động: <strong className="text-emerald-400 font-semibold">18 Bàn Thi Đấu</strong>
              </Text>
            </Space>
            <Space align="center" size={6}>
              <CreditCard className="h-3.5 w-3.5 text-emerald-400" />
              <Text className="!text-[11px] !text-slate-400">Tích hợp cổng thanh toán VNPay QR</Text>
            </Space>
          </div>
        </div>

        {/* CỘT PHẢI (50%): FORM ĐĂNG NHẬP CHUẨN SHARED/UI */}
        <div className="relative flex-1 min-h-screen flex flex-col justify-between p-6 sm:p-8 lg:p-10 xl:p-12 bg-gradient-to-b from-[#080e18] via-[#09121d] to-[#060a10]">
          {/* Header mobile */}
          <div className="lg:hidden flex items-center justify-between pb-4 border-b border-slate-800">
            <Space align="center" size={8}>
              <img
                src="/cuezone-favicon.svg?v=2"
                alt="CueZone Logo"
                className="h-8 w-8 rounded-lg ring-1 ring-emerald-500/50"
              />
              <Text className="!text-lg !font-black !text-white !mb-0">
                CUE<span className="text-emerald-400">ZONE</span>
              </Text>
            </Space>
            <Button variant="outline" size="sm" to="/customer" className="!text-xs !h-7 !px-2.5">
              Cổng Khách
            </Button>
          </div>

          {/* Form container trung tâm */}
          <div className="my-auto w-full max-w-sm mx-auto py-4">
            {/* Tiêu đề */}
            <div className="mb-4">
              <Title level={2} className="!text-2xl !font-bold !text-white !tracking-tight !mb-1">
                Đăng Nhập Hệ Thống
              </Title>
              <Text className="!text-xs !text-slate-400">
                Chọn vai trò theo cấu trúc hệ thống CueZone
              </Text>
            </div>

            {/* Quick Role Switcher Pills (Chính xác 3 role đăng nhập: Admin, Staff, Customer) */}
            <Card
              className="!mb-4 !rounded-xl !border-emerald-950/80 !bg-slate-900/60 backdrop-blur-sm shadow-sm shadow-emerald-950/50 [&>.ant-card-body]:!p-2.5"
            >
              <div className="flex items-center justify-between mb-2">
                <Space align="center" size={4}>
                  <Zap className="h-3 w-3 fill-emerald-400 text-emerald-400" />
                  <Text strong className="!text-[11px] !text-emerald-400">
                    Chọn nhanh vai trò:
                  </Text>
                </Space>
                <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 !bg-emerald-500/10 !text-emerald-400">
                  Context Diagram
                </Tag>
              </div>

              {/* 3 Nút Role tương ứng 3 thực thể đăng nhập */}
              <div className="grid grid-cols-3 gap-1.5">
                {SEED_ACCOUNTS.map((acc) => {
                  const isCurrent = selectedSeed.id === acc.id;
                  return (
                    <Tooltip key={acc.id} title={`${acc.name} - ${acc.description}`}>
                      <Button
                        variant={isCurrent ? "primary" : "outline"}
                        size="sm"
                        onClick={() => handleSelectSeed(acc)}
                        leftIcon={ROLE_ICONS[acc.role]}
                        className={clsx(
                          "!h-9 !px-2 !text-xs !rounded-lg flex items-center justify-center transition-all !w-full",
                          isCurrent
                            ? "!bg-emerald-600 !text-white !font-bold !border-emerald-500 shadow-md shadow-emerald-600/30"
                            : "!bg-slate-950/70 !text-slate-400 !border-slate-800 hover:!text-slate-200 hover:!border-slate-700"
                        )}
                      >
                        {acc.role === UserRole.ADMIN
                          ? "Admin"
                          : acc.role === UserRole.STAFF
                          ? "Staff"
                          : "Customer"}
                      </Button>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Chi tiết nhiệm vụ của vai trò được chọn + Nút Đăng nhập 1-click */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex orientation-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] w-full">
                  <div className="truncate pr-2">
                    <Text strong className="!text-[11px] !text-slate-200">
                      {selectedSeed.name}
                    </Text>
                    <Text className="!text-[10px] !text-emerald-400 block truncate">
                      {selectedSeed.description}
                    </Text>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleInstantSeedLogin(selectedSeed)}
                    disabled={loading}
                    rightIcon={<ArrowRight className="h-3 w-3" />}
                    className="!p-0 !h-auto !text-[11px] !font-bold !text-emerald-400 hover:!text-emerald-300 flex-shrink-0"
                  >
                    Vào ngay
                  </Button>
                </div>
              </div>
            </Card>

            {/* Form đăng nhập chính (Sử dụng Form, Form.Item, Input từ shared/ui) */}
            <Form
              layout="vertical"
              onFinish={handleFormSubmit}
              requiredMark={false}
              className="space-y-3"
            >
              <Form.Item
                label={<Text className="!text-xs !font-semibold !text-slate-300">Email đăng nhập</Text>}
                className="!mb-3"
              >
                <Input
                  type="email"
                  size="large"
                  prefix={<Mail className="h-4 w-4 text-slate-400 mr-1.5" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cuezone.com, staff@cuezone.com..."
                  allowClear
                  className="!h-10 !rounded-lg !border-slate-800 !bg-slate-950/80 !text-white text-xs placeholder:!text-slate-600 focus:!border-emerald-500"
                />
              </Form.Item>

              <Form.Item
                label={
                  <div className="flex w-full items-center justify-between">
                    <Text className="!text-xs !font-semibold !text-slate-300">Mật khẩu</Text>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => message.info("Chế độ thử nghiệm: Mật khẩu mặc định là 'password123'")}
                      className="!p-0 !h-auto !text-[11px] !font-medium !text-emerald-400 hover:!text-emerald-300"
                    >
                      Quên mật khẩu?
                    </Button>
                  </div>
                }
                className="!mb-3"
              >
                <Input.Password
                  size="large"
                  prefix={<Lock className="h-4 w-4 text-slate-400 mr-1.5" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="!h-10 !rounded-lg !border-slate-800 !bg-slate-950/80 !text-white text-xs placeholder:!text-slate-600 focus:!border-emerald-500"
                />
              </Form.Item>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                >
                  <Text className="!text-xs !text-slate-300">Ghi nhớ tài khoản</Text>
                </Checkbox>
                <Text className="!text-[11px] !text-slate-500">Mặc định: password123</Text>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                rightIcon={!loading ? <ArrowRight className="h-4 w-4 ml-1" /> : undefined}
                className="w-full !h-11 !text-xs !font-bold !rounded-lg shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.01] active:scale-[0.99] mt-1 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
              >
                {loading ? "Đang kết nối hệ thống..." : "Đăng Nhập"}
              </Button>
            </Form>

            {/* KHU VỰC DÀNH CHO GUEST (KHÁCH VÃNG LAI) & ĐĂNG KÝ HỘI VIÊN THEO SƠ ĐỒ */}
            <Card className="!mt-4 !rounded-xl !border-slate-800/80 !bg-slate-950/60 [&>.ant-card-body]:!p-3">
              <div className="flex items-center justify-between">
                <div>
                  <Space align="center" size={6}>
                    <Eye className="h-3.5 w-3.5 text-sky-400" />
                    <Text strong className="!text-xs !text-white">Khách Vãng Lai (Guest)</Text>
                  </Space>
                  <Text className="!text-[11px] !text-slate-400 block mt-0.5">
                    Tra cứu bàn trống, xem menu F&B không cần đăng nhập
                  </Text>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  to="/customer"
                  className="!text-xs !h-8 !px-3 !border-slate-700 !bg-slate-900/80 !text-sky-300 hover:!border-sky-500 hover:!text-white flex-shrink-0"
                >
                  Vào Cổng Khách
                </Button>
              </div>
            </Card>

            {/* Chuyển trang đăng ký hội viên (Account Registration) */}
            <div className="mt-3 text-center text-xs text-slate-400">
              <Text className="!text-xs !text-slate-400">Bạn muốn trở thành hội viên?</Text>{" "}
              <Button
                variant="link"
                to="/register"
                className="!p-0 !h-auto !text-xs !font-bold !text-emerald-400 hover:!text-emerald-300 ml-1 inline-block"
              >
                Đăng ký tài khoản (Account registration)
              </Button>
            </div>
          </div>

          {/* Footer thông tin */}
          <div className="pt-2 text-center text-[11px] text-slate-600">
            <Text className="!text-[11px] !text-slate-600">
              Billiards Clubs & Bank Pool Tournament System • Phiên bản 1.0
            </Text>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default LoginPage;

