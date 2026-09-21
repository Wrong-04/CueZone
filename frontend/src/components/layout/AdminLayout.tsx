import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";

const menuItems = [
  { path: "/admin", label: "Tổng quan", icon: "📊" },
  { path: "/admin/tables", label: "Quản lý Bàn", icon: "🎱" },
  { path: "/admin/booking", label: "Đặt bàn", icon: "📅" },
  { path: "/admin/tournaments", label: "Giải đấu", icon: "🏆" },
  { path: "/admin/fnb", label: "Thực đơn F&B", icon: "🍹" },
  { path: "/admin/inventory", label: "Kho hàng", icon: "📦" },
  { path: "/admin/invoices", label: "Hóa đơn", icon: "🧾" },
  { path: "/admin/reports", label: "Báo cáo", icon: "📈" },
  { path: "/admin/employees", label: "Nhân sự", icon: "👥" },
  { path: "/admin/news", label: "Tin tức", icon: "📰" },
  { path: "/admin/settings", label: "Cài đặt", icon: "⚙️" },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-navy-800 text-white flex flex-col transition-all duration-300 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">CZ</span>
            </div>
            {sidebarOpen && (
              <span className="text-lg font-bold tracking-tight">CueZone</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition hidden lg:block"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                  isActive
                    ? "bg-primary-500 text-white"
                    : "text-gray-300 hover:bg-navy-700 hover:text-white"
                }`}
              >
                <span className="text-xl flex-shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="border-t border-navy-700 p-3">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0) || "U"}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.role}</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="w-full mt-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition text-left"
            >
              Đăng xuất
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button className="relative p-2 text-gray-400 hover:text-gray-600">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>

    <ConfirmModal
      open={showLogoutConfirm}
      title="Đăng xuất"
      message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?"
      confirmLabel="Đăng xuất"
      cancelLabel="Hủy"
      onConfirm={confirmLogout}
      onCancel={() => setShowLogoutConfirm(false)}
    />
    </>
  );
};

export default AdminLayout;
