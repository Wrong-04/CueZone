import { useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Space, Typography, Tag, Modal } from "../../shared/ui";
import {
  EnvironmentOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  WalletOutlined,
  TrophyOutlined,
  BellOutlined,
  UserOutlined,
  CalendarOutlined,
  HistoryOutlined,
  CoffeeOutlined,
  BookOutlined,
  ReadOutlined,
  HomeOutlined,
  PhoneOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifModal, setShowNotifModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const guestNavLinks = [
    { to: "/customer", label: "Trang chủ", icon: <HomeOutlined /> },
    { to: "/customer/booking", label: "Đặt bàn online", icon: <CalendarOutlined /> },
    { to: "/customer/tournaments", label: "Giải đấu & Lệ phí", icon: <TrophyOutlined /> },
    { to: "/customer/rules", label: "Luật Bank Pool", icon: <BookOutlined /> },
    { to: "/customer/news", label: "Tin tức & Ưu đãi", icon: <ReadOutlined /> },
  ];

  const memberNavLinks = [
    { to: "/customer", label: "Trang chủ", icon: <HomeOutlined /> },
    { to: "/customer/booking", label: "Đặt bàn", icon: <CalendarOutlined /> },
    { to: "/customer/fnb", label: "Gọi món F&B", icon: <CoffeeOutlined /> },
    { to: "/customer/tournaments", label: "Giải đấu & ELO", icon: <TrophyOutlined /> },
    { to: "/customer/history", label: "Lịch sử & Đánh giá", icon: <HistoryOutlined /> },
    { to: "/customer/news", label: "Tin tức", icon: <ReadOutlined /> },
  ];

  const navLinks = user ? memberNavLinks : guestNavLinks;

  const mockNotifications = [
    {
      id: "n1",
      title: "Nhắc nhở ca chơi sắp tới",
      desc: "Bàn VIP 01 của bạn đã sẵn sàng lúc 14:00 hôm nay. Vui lòng check-in trước 15 phút.",
      time: "10 phút trước",
      read: false,
    },
    {
      id: "n2",
      title: "Hoàn tất nạp ví CueZone Pay",
      desc: "Tài khoản của bạn đã được cộng +500.000 VNĐ qua VietQR Techcombank.",
      time: "2 giờ trước",
      read: false,
    },
    {
      id: "n3",
      title: "Xác nhận ghi danh Giải Bank Pool Q2",
      desc: "Bạn đã đăng ký thành công giải Bank Pool Open Q2. Lệ phí 200k đã khấu trừ ví.",
      time: "Hôm qua",
      read: true,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top micro bar for Club info */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 hidden sm:block border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <EnvironmentOutlined className="text-emerald-400" />
              123 Nguyễn Thị Minh Khai, Q.3, TP.HCM
            </span>
            <span className="flex items-center gap-1.5">
              <ClockCircleOutlined className="text-emerald-400" />
              08:00 - 24:00 (Hàng ngày)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <PhoneOutlined className="text-emerald-400" /> Hotline: <strong className="text-emerald-400 font-bold">1900 6868</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">CLB Bida & Hệ Thống Giải Đấu Bank Pool</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3 lg:gap-4">
            {/* Logo */}
            <Link to="/customer" className="flex items-center gap-2.5 shrink-0 group">
              <div className="relative">
                <img
                  src="/cuezone-favicon.svg?v=2"
                  alt="CueZone"
                  className="w-9 h-9 rounded-xl flex-shrink-0 ring-1 ring-emerald-500/40 p-0.5 bg-slate-950 shadow-xs group-hover:scale-105 transition-transform"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-lg font-black text-slate-900 tracking-tight">
                    CUE<span className="text-emerald-600">ZONE</span>
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 rounded bg-emerald-100 text-emerald-800">
                    CLUB
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                  Billiards & Bank Pool
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Bar (Strictly 1 line, whitespace-nowrap, sleek) */}
            <nav className="hidden lg:flex items-center gap-1 shrink-0">
              {navLinks.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-2 transition-all ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <span className={isActive ? "text-emerald-600 text-sm" : "text-slate-400 text-sm"}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Tools (Clean, unified height 36px/h-9, no bulky multi-line text) */}
            <div className="flex items-center gap-2 shrink-0">
              {user ? (
                <>
                  {/* Ví CueZone Pay badge (Sleek 1-line pill) */}
                  <Link
                    to="/customer/wallet"
                    className="h-9 px-3 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition shadow-2xs group"
                    title="Ví trả trước CueZone Pay"
                  >
                    <WalletOutlined className="text-emerald-600 text-sm group-hover:scale-110 transition-transform" />
                    <span>750.000đ</span>
                  </Link>

                  {/* Thông báo chuông icon button */}
                  <button
                    type="button"
                    onClick={() => setShowNotifModal(true)}
                    className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition shrink-0 cursor-pointer"
                    title="Hộp thư thông báo"
                  >
                    <BellOutlined className="text-sm" />
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </button>

                  {/* User Profile Pill */}
                  <Link
                    to="/customer/profile"
                    className="h-9 px-2.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 inline-flex items-center gap-2 whitespace-nowrap shrink-0 transition"
                    title="Hồ sơ hội viên"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                      {user.name?.charAt(0) || <UserOutlined />}
                    </div>
                    <span className="text-xs font-semibold text-slate-800 hidden sm:inline truncate max-w-[130px]">
                      {user.name}
                    </span>
                    <Tag color="green" className="!m-0 !text-[10px] !px-1.5 !py-0 !leading-4 !font-bold hidden xl:inline-flex">
                      VIP
                    </Tag>
                  </Link>

                  {/* Đăng xuất */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    leftIcon={<LogoutOutlined className="text-sm" />}
                    className="!h-9 !px-2.5 !text-xs !text-slate-500 hover:!text-rose-600 hover:!bg-rose-50 !rounded-xl shrink-0"
                    title="Đăng xuất"
                  >
                    <span className="hidden sm:inline">Thoát</span>
                  </Button>
                </>
              ) : (
                <Space align="center" size={8}>
                  <Button
                    variant="outline"
                    size="sm"
                    to="/register"
                    className="!text-xs !h-9 !px-4 !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl font-semibold whitespace-nowrap"
                  >
                    Đăng Ký
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    to="/login"
                    className="!text-xs !h-9 !px-4 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 !rounded-xl whitespace-nowrap"
                  >
                    Đăng Nhập
                  </Button>
                </Space>
              )}
            </div>
          </div>

          {/* Mobile navigation row (Single-row scrollbar) */}
          <div className="flex lg:hidden overflow-x-auto py-2.5 gap-1.5 border-t border-slate-100 scrollbar-none">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-slate-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            {user && (
              <Link
                to="/customer/wallet"
                className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 transition ${
                  location.pathname === "/customer/wallet"
                    ? "bg-emerald-600 text-white font-bold shadow-2xs"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <WalletOutlined />
                <span>Ví: 750k</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Modal Thông Báo Hội Viên */}
      <Modal
        open={showNotifModal}
        onCancel={() => setShowNotifModal(false)}
        footer={[
          <Button
            key="close"
            variant="outline"
            size="sm"
            onClick={() => setShowNotifModal(false)}
            className="!rounded-xl !text-xs"
          >
            Đóng
          </Button>,
          <Button
            key="all"
            variant="primary"
            size="sm"
            to="/customer/profile"
            onClick={() => setShowNotifModal(false)}
            className="!rounded-xl !text-xs !bg-emerald-600 !border-emerald-600"
          >
            Cài Đặt Thông Báo
          </Button>,
        ]}
        title={
          <div className="flex items-center gap-2">
            <BellOutlined className="text-emerald-600" />
            <span className="font-bold text-slate-900 text-sm">Hộp Thư Thông Báo CLB</span>
            <Tag color="green" className="!text-[10px] !font-bold">2 Chưa Đọc</Tag>
          </div>
        }
      >
        <div className="space-y-3 py-2">
          {mockNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-3.5 rounded-2xl border transition ${
                notif.read ? "bg-white border-slate-200" : "bg-emerald-50/40 border-emerald-200/80"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <Text strong className="!text-xs !text-slate-900">
                  {notif.title}
                </Text>
                <span className="text-[10px] text-slate-400">{notif.time}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                {notif.desc}
              </p>
            </div>
          ))}
        </div>
      </Modal>

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <Outlet />
      </main>

      {/* Premium Footer */}
      <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 pt-12 pb-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-slate-800">
            {/* Cột 1: Brand & Slogan */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <img
                  src="/cuezone-favicon.svg?v=2"
                  alt="CueZone Logo"
                  className="w-8 h-8 rounded-lg p-0.5 bg-white ring-1 ring-emerald-500"
                />
                <span className="text-lg font-black text-white">
                  CUE<span className="text-emerald-400">ZONE</span>
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                Hệ thống CLB Bida chuẩn thi đấu quốc tế và điều hành giải đấu Bank Pool chuyên nghiệp hàng đầu.
              </p>
              <div className="pt-1 flex items-center gap-2 text-emerald-400 font-semibold">
                <PhoneOutlined /> 1900 6868 • Hỗ trợ 24/7
              </div>
            </div>

            {/* Cột 2: Cổng Khách Hàng */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3">
                Cổng Khách Hàng
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/customer" className="hover:text-emerald-400 transition">Trang chủ khám phá</Link></li>
                <li><Link to="/customer/booking" className="hover:text-emerald-400 transition">Đặt bàn theo khung giờ</Link></li>
                <li><Link to="/customer/tournaments" className="hover:text-emerald-400 transition">Giải đấu Bank Pool mở rộng</Link></li>
                <li><Link to="/customer/rules" className="hover:text-emerald-400 transition">Luật Bank Pool chuẩn WPA</Link></li>
              </ul>
            </div>

            {/* Cột 3: Hội Viên & Ưu Đãi */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3">
                Đặc Quyền Hội Viên
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link to="/register" className="hover:text-emerald-400 transition">Đăng ký thành viên VIP</Link></li>
                <li><Link to="/customer/news" className="hover:text-emerald-400 transition">Giờ vàng giảm giá 20%</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition">Tra cứu điểm thưởng & ELO</Link></li>
                <li><Link to="/login" className="hover:text-emerald-400 transition">Cổng quản trị CLB (Staff)</Link></li>
              </ul>
            </div>

            {/* Cột 4: Thông tin hoạt động */}
            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3">
                Địa Chỉ & Giờ Mở Cửa
              </h4>
              <p className="text-slate-400 flex items-center gap-2">
                <EnvironmentOutlined className="text-emerald-400 flex-shrink-0" />
                <span>123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh</span>
              </p>
              <p className="text-slate-400 flex items-center gap-2">
                <ClockCircleOutlined className="text-emerald-400 flex-shrink-0" />
                <span>Hoạt động: 08:00 - 24:00 các ngày trong tuần</span>
              </p>
              <p className="text-slate-400 flex items-center gap-2">
                <CreditCardOutlined className="text-emerald-400 flex-shrink-0" />
                <span>Thanh toán: Tiền mặt, Thẻ, VNPay QR Code</span>
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-center sm:text-left">
            <span>© 2026 CueZone Billiards Club. Hệ Thống Vận Hành CLB & Giải Đấu Bank Pool.</span>
            <span>Phiên bản 2.0 • Giao diện chuẩn UI/UX</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;

