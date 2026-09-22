import React, { useState, useEffect, useRef } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import { notificationService, type Notification } from "../../services/notification.service";

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:5000";

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

const typeIcons: Record<string, string> = {
  user: "👤",
  table: "🎱",
  pricing: "💰",
  role: "🛡️",
  system: "⚙️",
};

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // silently fail
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", () => {
      fetchNotifications();
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      fetchNotifications();
    } catch { /* noop */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      fetchNotifications();
    } catch { /* noop */ }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Vừa xong";
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
  };

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
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              ☰
            </button>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  const next = !showNotifPanel;
                  setShowNotifPanel(next);
                  if (next) fetchNotifications();
                }}
                className="relative p-2 text-gray-400 hover:text-gray-600 transition"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown panel */}
              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-scale-in">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-navy-800 text-sm">Thông báo</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary-500 hover:text-primary-600 font-medium"
                      >
                        Đọc tất cả
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 text-sm">
                        <p className="text-3xl mb-2">🔔</p>
                        Không có thông báo nào
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n._id}
                          onClick={() => !n.isRead && handleMarkRead(n._id)}
                          className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                            !n.isRead ? "bg-primary-50/40" : ""
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-lg flex-shrink-0 mt-0.5">
                              {typeIcons[n.type] || "⚙️"}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium truncate ${
                                  !n.isRead ? "text-navy-800" : "text-gray-700"
                                }`}>
                                  {n.title}
                                </p>
                                {!n.isRead && (
                                  <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                {timeAgo(n.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
              <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div key={location.pathname} className="animate-slide-up">
            <Outlet />
          </div>
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
