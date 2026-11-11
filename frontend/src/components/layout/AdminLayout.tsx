import { useState, useEffect, useRef, useMemo, type ReactNode } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import {
  DashboardOutlined,
  ReadOutlined,
  AppstoreOutlined,
  TrophyOutlined,
  CoffeeOutlined,
  InboxOutlined,
  FileTextOutlined,
  LineChartOutlined,
  TeamOutlined,
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
  GiftOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from "@ant-design/icons";

import { useAuth } from "../../contexts/AuthContext";
import { hasPermission, type PermissionKey } from "../../utils/permissions";
import ConfirmModal from "../ui/ConfirmModal";
import { notificationService, type Notification } from "../../services/notification.service";
import { Tooltip } from "../../shared/ui";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:5000";

export interface MenuItemConfig {
  path: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
  permission?: PermissionKey;
  badge?: string;
  isSpecial?: boolean;
}

export interface MenuGroupConfig {
  id: string;
  title: string;
  roles?: string[];
  items: MenuItemConfig[];
}

const menuGroups: MenuGroupConfig[] = [
  {
    id: "operations",
    title: "Vận Hành Quầy",
    items: [
      {
        path: "/pos",
        label: "Sơ Đồ Bàn (POS)",
        icon: <ThunderboltOutlined />,
        permission: "pos.read",
        badge: "Chính",
        isSpecial: true,
      },
      {
        path: "/dashboard",
        label: "Tổng Quan CLB",
        icon: <DashboardOutlined />,
        roles: ["admin"],
      },
    ],
  },
  {
    id: "fnb-inventory",
    title: "Hàng Hóa & Kho",
    items: [
      {
        path: "/fnb",
        label: "Thực Đơn & Dịch Vụ",
        icon: <CoffeeOutlined />,
        permission: "products.manage",
      },
      {
        path: "/inventory",
        label: "Kho Hàng & Vật Tư",
        icon: <InboxOutlined />,
        permission: "inventory.read",
      },
    ],
  },
  {
    id: "tournament-promos",
    title: "Giải Đấu & Ưu Đãi",
    items: [
      {
        path: "/tournaments",
        label: "Giải Đấu & Trọng Tài",
        icon: <TrophyOutlined />,
        permission: "tournaments.manage",
      },
      {
        path: "/news",
        label: "Tin Tức & Sự Kiện",
        icon: <ReadOutlined />,
        permission: "news.manage",
      },
      {
        path: "/vouchers",
        label: "Khuyến Mãi & Voucher",
        icon: <GiftOutlined />,
        permission: "vouchers.manage",
      },
    ],
  },
  {
    id: "finance",
    title: "Tài Chính & Hóa Đơn",
    items: [
      {
        path: "/invoices",
        label: "Hóa Đơn & Sổ Quỹ",
        icon: <FileTextOutlined />,
        permission: "invoices.read",
      },
    ],
  },
  {
    id: "system",
    title: "Quản Trị & Hệ Thống",
    items: [
      {
        path: "/reports",
        label: "Báo Cáo & Thống Kê",
        icon: <LineChartOutlined />,
        permission: "reports.read",
      },
      {
        path: "/tables",
        label: "Quản Lý Bàn & Bảng Giá",
        icon: <AppstoreOutlined />,
        permission: "tables.manage",
      },
      {
        path: "/employees",
        label: "Nhân Sự CLB",
        icon: <TeamOutlined />,
        roles: ["admin"],
      },
      {
        path: "/settings",
        label: "Cài Đặt Hệ Thống",
        icon: <SettingOutlined />,
        roles: ["admin"],
      },
    ],
  },
];

const roleLabels: Record<string, string> = {
  admin: "Chủ Quán (Admin)",
  staff: "Nhân Viên Vận Hành",
  cashier: "Thu Ngân",
  warehouse: "Thủ Kho",
  referee: "Trọng Tài",
  customer: "Hội Viên CLB",
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
      console.error("Không thể tải thông báo:", error);
    }
  };

  useEffect(() => {
    void fetchNotifications();

    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 30000);

    const socket: Socket = io(SOCKET_URL, {
      transports: ["websocket"],
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
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
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

  const isPathActive = (path: string) => {
    if (location.pathname === path) return true;
    if (path === "/pos" && location.pathname === "/admin/pos") return true;
    if (path === "/dashboard" && location.pathname === "/admin") return true;
    if (
      path === "/invoices" &&
      (location.pathname === "/wallet-topups" || location.pathname === "/tournament-fees")
    )
      return true;
    if (path === "/reports" && location.pathname === "/table-performance") return true;
    if (
      path === "/inventory" &&
      (location.pathname === "/catalog-management" || location.pathname === "/suppliers")
    )
      return true;
    return false;
  };

  const visibleGroups = useMemo<MenuGroupConfig[]>(() => {
    const list: MenuGroupConfig[] = [];
    menuGroups.forEach((group) => {
      const groupHasRole = !group.roles || (user?.role && group.roles.includes(user.role));
      if (!groupHasRole) return;

      const visibleItems = group.items.filter(
        (item) =>
          (!item.roles || (user?.role && item.roles.includes(user.role))) &&
          (!item.permission || hasPermission(user, item.permission)),
      );

      if (visibleItems.length > 0) {
        list.push({
          ...group,
          items: visibleItems,
        });
      }
    });
    return list;
  }, [user]);

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
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight leading-none">
                    CUE<span className="text-emerald-400">ZONE</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium tracking-wide mt-0.5">
                    Billiards Club POS
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-white transition hidden lg:block p-1 rounded-md hover:bg-navy-700"
              aria-label={sidebarOpen ? "Thu gọn sidebar" : "Mở rộng sidebar"}
              title={sidebarOpen ? "Thu gọn menu" : "Mở rộng menu"}
            >
              {sidebarOpen ? (
                <LeftOutlined className="text-xs" />
              ) : (
                <RightOutlined className="text-xs" />
              )}
            </button>
          </div>

          {/* Navigation - 5 Business Groups, Direct 1-Click Items */}
          <nav className="flex-1 py-3 px-2 space-y-3.5 overflow-y-auto">
            {visibleGroups.map((group, groupIdx) => (
              <div key={group.id} className="space-y-1">
                {/* Group Heading */}
                {sidebarOpen ? (
                  <div className="px-3 pt-1 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase select-none">
                    {group.title}
                  </div>
                ) : (
                  groupIdx > 0 && <div className="my-2 border-t border-navy-700/60" />
                )}

                {/* Group Items */}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isPathActive(item.path);

                    // SPECIAL POS BUTTON HIGHLIGHT
                    if (item.isSpecial) {
                      const buttonContent = (
                        <Link
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all shadow-md ${
                            isActive
                              ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold ring-2 ring-emerald-400 shadow-emerald-900/50"
                              : "bg-navy-700/90 hover:bg-emerald-700/70 text-emerald-200 border border-emerald-500/30"
                          } ${!sidebarOpen ? "justify-center" : ""}`}
                        >
                          <span className="text-lg text-emerald-300 flex-shrink-0 animate-pulse">
                            {item.icon}
                          </span>

                          {sidebarOpen && (
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <span className="text-sm font-bold text-white tracking-wide truncate">
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase rounded bg-amber-400 text-slate-900 shadow-xs">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          )}
                        </Link>
                      );

                      return (
                        <div key={item.path} className="mb-2">
                          {!sidebarOpen ? (
                            <Tooltip title={`${item.label} (${item.badge || "Chính"})`} placement="right">
                              {buttonContent}
                            </Tooltip>
                          ) : (
                            buttonContent
                          )}
                        </div>
                      );
                    }

                    // REGULAR DIRECT ITEM
                    const regularContent = (
                      <Link
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
                          isActive
                            ? "bg-emerald-600 text-white font-bold shadow-xs"
                            : "text-gray-300 hover:bg-navy-700/60 hover:text-white"
                        } ${!sidebarOpen ? "justify-center" : ""}`}
                      >
                        <span className="text-base flex-shrink-0 text-slate-300">{item.icon}</span>

                        {sidebarOpen && (
                          <span className="text-xs font-medium tracking-wide truncate">
                            {item.label}
                          </span>
                        )}
                      </Link>
                    );

                    return (
                      <div key={item.path}>
                        {!sidebarOpen ? (
                          <Tooltip title={item.label} placement="right">
                            {regularContent}
                          </Tooltip>
                        ) : (
                          regularContent
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Sidebar Footer: Logout */}
          <div className="border-t border-navy-700 p-2.5">
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
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-500 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100"
                aria-label="Mở hoặc thu gọn menu"
              >
                <MenuOutlined className="text-base" />
              </button>

              {/* Quick POS Zen Mode button */}
              <Tooltip title={sidebarOpen ? "Thu gọn menu (POS Zen Mode)" : "Mở rộng menu"}>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition font-medium"
                >
                  {sidebarOpen ? <FullscreenOutlined /> : <FullscreenExitOutlined />}
                  <span>{sidebarOpen ? "Chế độ rộng" : "Hiện menu"}</span>
                </button>
              </Tooltip>

              <span className="text-xs text-gray-500 font-mono">
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
                      <h3 className="font-semibold text-navy-800 text-sm">Thông báo</h3>

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
                                      !n.isRead ? "text-navy-800" : "text-gray-700"
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
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name}</p>

                  <p className="text-xs text-gray-500 leading-tight">
                    {roleLabels[user?.role || ""] || user?.role}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main
            className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 ${
              location.pathname === "/tournaments"
                ? "p-0"
                : location.pathname === "/pos"
                  ? "p-3 sm:p-4 md:p-5"
                  : "p-6"
            }`}
          >
            <div key={location.pathname} className="animate-slide-up max-w-full min-w-0">
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
