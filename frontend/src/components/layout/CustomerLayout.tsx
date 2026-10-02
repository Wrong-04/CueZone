import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Space, Typography } from "../../shared/ui";
import { Sparkles, Trophy, BookOpen, Newspaper, Calendar, Phone, MapPin, Clock } from "lucide-react";

const { Text } = Typography;

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { to: "/customer", label: "Trang chủ", icon: <Sparkles className="h-4 w-4" /> },
    { to: "/customer/booking", label: "Đặt bàn online", icon: <Calendar className="h-4 w-4" /> },
    { to: "/customer/tournaments", label: "Giải đấu & Lệ phí", icon: <Trophy className="h-4 w-4" /> },
    { to: "/customer/rules", label: "Luật Bank Pool", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/customer/news", label: "Tin tức & Ưu đãi", icon: <Newspaper className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top micro bar for Club info */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4 hidden sm:block border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              123 Nguyễn Thị Minh Khai, Q.3, TP.HCM
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              08:00 - 24:00 (Hàng ngày)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              Hotline: <strong className="text-emerald-400 font-bold">1900 6868</strong>
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">CLB Bida & Giải đấu Bank Pool</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white/95 border-b border-slate-200 sticky top-0 z-50 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18">
            <div className="flex items-center gap-6 xl:gap-10">
              <Link to="/customer" className="flex items-center gap-3 group">
                <div className="relative">
                  <img
                    src="/cuezone-favicon.svg?v=2"
                    alt="CueZone"
                    className="w-10 h-10 rounded-xl flex-shrink-0 ring-1 ring-emerald-500/40 p-0.5 bg-slate-950 shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xl font-black text-slate-900 tracking-tight leading-none">
                      CUE<span className="text-emerald-600">ZONE</span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      CLUB
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block font-medium">
                    Billiards & Bank Pool
                  </span>
                </div>
              </Link>

              {/* Navigation Bar */}
              <nav className="hidden lg:flex items-center gap-1">
                {navLinks.map((item) => {
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                      }`}
                    >
                      <span className={isActive ? "text-emerald-600" : "text-slate-400"}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Auth Actions */}
            <div className="flex items-center gap-3">
              {user ? (
                <Space align="center" size={10}>
                  <Link
                    to="/customer/profile"
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                  >
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      {user.name?.charAt(0) || "U"}
                    </div>
                    <div className="text-left hidden sm:block">
                      <Text strong className="!text-xs !text-slate-800 block leading-tight">
                        {user.name}
                      </Text>
                      <Text className="!text-[10px] !text-emerald-600 font-medium block">
                        Hội Viên CLB
                      </Text>
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="!text-xs !text-slate-500 hover:!text-red-600"
                  >
                    Đăng xuất
                  </Button>
                </Space>
              ) : (
                <Space align="center" size={8}>
                  <Button
                    variant="outline"
                    size="sm"
                    to="/register"
                    className="!text-xs !h-9 !px-4 !border-slate-300 !text-slate-700 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl font-semibold"
                  >
                    Đăng Ký
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    to="/login"
                    className="!text-xs !h-9 !px-4 !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 text-white font-bold shadow-md shadow-emerald-600/25 !rounded-xl"
                  >
                    Đăng Nhập
                  </Button>
                </Space>
              )}
            </div>
          </div>

          {/* Mobile navigation row */}
          <div className="flex lg:hidden overflow-x-auto py-2.5 gap-2 border-t border-slate-100 scrollbar-none">
            {navLinks.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    isActive
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

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
                <Phone className="h-3.5 w-3.5" /> 1900 6868 • Hỗ trợ 24/7
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
              <p className="text-slate-400">📍 123 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh</p>
              <p className="text-slate-400">⏰ Hoạt động: 08:00 - 24:00 các ngày trong tuần</p>
              <p className="text-slate-400">💳 Thanh toán: Tiền mặt, Thẻ, VNPay QR Code</p>
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

