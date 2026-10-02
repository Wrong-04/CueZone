import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Space, Typography } from "../../shared/ui";
import { Sparkles, Trophy, BookOpen, Newspaper, Calendar } from "lucide-react";

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
    { to: "/customer/tournaments", label: "Giải đấu & Lệ phí", icon: <Trophy className="h-4 w-4" /> },
    { to: "/customer?tab=rules", label: "Luật Bank Pool", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/customer/news", label: "Tin tức & Ưu đãi", icon: <Newspaper className="h-4 w-4" /> },
    { to: "/customer/booking", label: "Đặt bàn", icon: <Calendar className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6 xl:gap-8">
              <Link to="/customer" className="flex items-center gap-2.5">
                <img
                  src="/cuezone-favicon.svg?v=2"
                  alt="CueZone"
                  className="w-9 h-9 rounded-xl flex-shrink-0 ring-1 ring-emerald-500/50 p-0.5 bg-slate-950 shadow-md shadow-emerald-500/10"
                />
                <span className="text-xl font-black text-white tracking-tight">
                  CUE<span className="text-emerald-400">ZONE</span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((item) => {
                  const isActive =
                    item.to.includes("?tab=rules")
                      ? location.pathname === "/customer" && location.search.includes("rules")
                      : location.pathname === item.to && !location.search.includes("rules");
                  return (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {user ? (
                <Space align="center" size={8}>
                  <Link
                    to="/customer/profile"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                  >
                    <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-xs">
                        {user.name?.charAt(0)}
                      </span>
                    </div>
                    <Text className="!text-xs !font-medium !text-slate-200">{user.name}</Text>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="!text-xs !text-slate-400 hover:!text-red-400"
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
                    className="!text-xs !border-slate-700 !bg-slate-900 !text-slate-300 hover:!border-emerald-500 hover:!text-emerald-300"
                  >
                    Đăng Ký
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    to="/login"
                    className="!text-xs !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-bold shadow-md shadow-emerald-600/20"
                  >
                    Đăng Nhập
                  </Button>
                </Space>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <Text className="!text-xs !text-slate-400">
            © 2026 CueZone Billiards Club & Bank Pool Tournament System. All rights reserved.
          </Text>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link to="/customer?tab=rules" className="hover:text-emerald-400 transition">Luật Bank Pool</Link>
            <Link to="/customer/tournaments" className="hover:text-emerald-400 transition">Giải Đấu</Link>
            <Link to="/customer/news" className="hover:text-emerald-400 transition">Ưu Đãi & Tin Tức</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomerLayout;

