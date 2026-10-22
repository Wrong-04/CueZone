
import { useState, useEffect, useRef, type ReactNode } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import {
  DashboardOutlined,
  AppstoreOutlined,
  CalendarOutlined,
  TrophyOutlined,
  CoffeeOutlined,
  InboxOutlined,
  FileTextOutlined,
  LineChartOutlined,
  TeamOutlined,
  ReadOutlined,
  SettingOutlined,
  UserOutlined,
  DollarOutlined,
  WalletOutlined,
  SafetyCertificateOutlined,
  MenuOutlined,
  BellOutlined,
  LeftOutlined,
  RightOutlined,
  ThunderboltOutlined,
  LogoutOutlined,
  TagsOutlined,
  ShopOutlined,
} from "@ant-design/icons";

import { useAuth } from "../../contexts/AuthContext";
import ConfirmModal from "../ui/ConfirmModal";
import {
  notificationService,
  type Notification,
} from "../../services/notification.service";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") ||
  "http://localhost:5000";

interface MenuItemConfig {
  path: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
}

const menuItems: MenuItemConfig[] = [
  {
    path: "/pos",
    label: "POS Sơ Đồ Bàn",
    icon: <ThunderboltOutlined />,
    roles: ["admin", "staff"],
  },
  {
    path: "/dashboard",
    label: "Tổng quan",
    icon: <DashboardOutlined />,
    roles: ["admin"],
  },
  {
    path: "/tables",
    label: "Quản lý Bàn",
    icon: <AppstoreOutlined />,
    roles: ["admin"],
  },
  {
    path: "/booking",
    label: "Duyệt Đặt Bàn",
    icon: <CalendarOutlined />,
    roles: ["admin", "staff"],
  },
  {
    path: "/fnb",
    label: "Thực đơn F&B",
    icon: <CoffeeOutlined />,
    roles: ["admin", "staff"],
  },
  {
    path: "/tournaments",
    label: "Giải đấu & Trọng tài",
    icon: <TrophyOutlined />,
    roles: ["admin", "staff"],
  },

  // 1. Kho hàng: xem tồn kho và tình trạng sản phẩm
  {
    path: "/inventory",
    label: "Kho hàng",
    icon: <InboxOutlined />,
    roles: ["admin", "staff"],
  },

  // 2. Quản lý sản phẩm và danh mục
  {
    path: "/catalog-management",
    label: "Danh mục sản phẩm",
    icon: <TagsOutlined />,
    roles: ["admin"],
  },

  // 3. Quản lý nhà cung cấp
  {
    path: "/suppliers",
    label: "Nhà cung cấp",
    icon: <ShopOutlined />,
    roles: ["admin"],
  },

  {
    path: "/invoices",
    label: "Hóa đơn",
    icon: <FileTextOutlined />,
    roles: ["admin", "staff"],
  },
  {
    path: "/wallet-topups",
    label: "Đối soát nạp ví",
    icon: <WalletOutlined />,
    roles: ["admin", "staff", "cashier"],
  },
  {
    path: "/tournament-fees",
    label: "Đối soát lệ phí giải",
    icon: <TrophyOutlined />,
    roles: ["admin", "staff", "cashier"],
  },
  {
    path: "/reports",
    label: "Báo cáo",
    icon: <LineChartOutlined />,
    roles: ["admin"],
  },
  {
    path: "/employees",
    label: "Nhân sự",
    icon: <TeamOutlined />,
    roles: ["admin"],
  },
  {
    path: "/news",
    label: "Tin tức",
    icon: <ReadOutlined />,
    roles: ["admin"],
  },
  {
    path: "/settings",
    label: "Cài đặt",
    icon: <SettingOutlined />,
    roles: ["admin"],
  },
];

const roleLabels: Record<string, string> = {
  admin: "Quản Trị Viên",
  staff: "Nhân Viên Vận Hành & Thu Ngân",
  cashier: "Thu Ngân",
  customer: "Hội Viên",
};

const typeIcons: Record<string, ReactNode> = {
  user: <UserOutlined />,
  table: <AppstoreOutlined />,
  pricing: <DollarOutlined />,
  wallet: <WalletOutlined />,
  tournament: <TrophyOutlined />,
  role: <SafetyCertificateOutlined />,
  system: <SettingOutlined />,
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
    } catch (error) {
      // Không làm gián đoạn giao diện nếu API thông báo gặp lỗi.
      console.error("Không thể tải thông báo:", error);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    socket.on("notification:new", () => {
      void fetchNotifications();
    });

    socket.on("connect_error", (error) => {
      console.warn("Socket.IO chưa kết nối được:", error.message);
    });

    return () => {
      window.clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setShowNotifPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markRead(id);
      await fetchNotifications();
    } catch (error) {
      console.error("Không thể đánh dấu thông báo đã đọc:", error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      await fetchNotifications();
    } catch (error) {
      console.error("Không thể đánh dấu tất cả thông báo:", error);
    }
  };

  const timeAgo = (dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();

    if (!Number.isFinite(timestamp)) {
      return "";
    }

    const diff = Math.max(0, Date.now() - timestamp);
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
    setShowLogoutConfirm(false);
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
              <img
                src="/favicon.svg"
                alt="CueZone"
                className="w-10 h-10 rounded-xl flex-shrink-0 shadow-md shadow-emerald-950/50"
              />

              {sidebarOpen && (
                <span className="text-lg font-bold tracking-tight">
                  CUE<span className="text-emerald-400">ZONE</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white transition hidden lg:block p-1"
              aria-label={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
            >
              {sidebarOpen ? (
                <LeftOutlined className="text-xs" />
              ) : (
                <RightOutlined className="text-xs" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {menuItems
              .filter(
                (item) =>
                  !item.roles ||
                  (user?.role && item.roles.includes(user.role)),
              )
              .map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  (item.path === "/pos" &&
                    location.pathname === "/admin/pos") ||
                  (item.path === "/dashboard" &&
                    location.pathname === "/admin");

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition ${
                      isActive
                        ? "bg-primary-500 text-white shadow-xs font-semibold"
                        : "text-gray-300 hover:bg-navy-700 hover:text-white"
                    }`}
                  >
                    <span className="text-lg flex-shrink-0">
                      {item.icon}
                    </span>

                    {sidebarOpen && (
                      <span className="text-sm font-medium">
                        {item.label}
                      </span>
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* Sidebar Footer: Logout */}
          <div className="border-t border-navy-700 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-400 hover:text-rose-400 hover:bg-navy-700 rounded-lg transition ${
                !sidebarOpen ? "justify-center" : ""
              }`}
              title="Đăng xuất khỏi hệ thống"
            >
              <LogoutOutlined className="text-base flex-shrink-0" />
              {sidebarOpen && <span>Đăng xuất</span>}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
                aria-label="Mở hoặc thu gọn menu"
              >
                <MenuOutlined className="text-base" />
              </button>

              <span className="text-sm text-gray-500">
                {new Date().toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Notification bell */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => {
                    const next = !showNotifPanel;

                    setShowNotifPanel(next);

                    if (next) {
                      void fetchNotifications();
                    }
                  }}
                  className="relative p-2 text-gray-400 hover:text-gray-600 transition flex items-center justify-center"
                  aria-label="Thông báo"
                >
                  <BellOutlined className="text-xl" />

                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification dropdown */}
                {showNotifPanel && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-scale-in">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h3 className="font-semibold text-navy-800 text-sm">
                        Thông báo
                      </h3>

                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleMarkAllRead()}
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
                          <p className="text-2xl mb-2 text-gray-400">
                            <BellOutlined />
                          </p>
                          Không có thông báo nào
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => {
                              if (!n.isRead) {
                                void handleMarkRead(n._id);
                              }
                            }}
                            className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${
                              !n.isRead ? "bg-primary-50/40" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-base flex-shrink-0 mt-0.5 text-gray-600">
                                {typeIcons[n.type] || <SettingOutlined />}
                              </span>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p
                                    className={`text-sm font-medium truncate ${
                                      !n.isRead
                                        ? "text-navy-800"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {n.title}
                                  </p>

                                  {!n.isRead && (
                                    <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                                  )}
                                </div>

                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                  {n.content}
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

              {/* User information */}
              <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
                <div className="w-9 h-9 bg-emerald-600 rounded-full flex items-center justify-center shadow-xs">
                  <span className="text-white font-bold text-sm">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                </div>

                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">
                    {user?.name}
                  </p>

                  <p className="text-xs text-gray-500 leading-tight">
                    {roleLabels[user?.role || ""] || user?.role}
                  </p>
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

      {/* Logout confirmation */}
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
