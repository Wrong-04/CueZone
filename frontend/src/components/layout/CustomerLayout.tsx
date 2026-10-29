import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../../contexts/AuthContext";
import { Button, Space, Tag, message } from "../../shared/ui";
import { notificationService, type Notification } from "../../services/notification.service";
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
  CheckOutlined,
} from "@ant-design/icons";

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:5000";

const CustomerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notificationData, setNotificationData] = useState<{
    userId: string;
    notifications: Notification[];
    unreadCount: number;
  } | null>(null);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement>(null);
  const userId = user?._id;
  const notifications = notificationData?.userId === userId ? notificationData.notifications : [];
  const unreadCount = notificationData?.userId === userId ? notificationData.unreadCount : 0;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    setNotificationsLoading(true);
    setNotificationError("");
    try {
      const result = await notificationService.getAll(1, 20);
      setNotificationData({ userId, ...result });
    } catch {
      setNotificationError("Không thể tải thông báo. Vui lòng thử lại.");
    } finally {
      setNotificationsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    const initialFetch = window.setTimeout(() => void fetchNotifications(), 0);
    const socket: Socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socket.on("notification:new", () => void fetchNotifications());
    const interval = window.setInterval(() => void fetchNotifications(), 30000);

    return () => {
      window.clearTimeout(initialFetch);
      window.clearInterval(interval);
      socket.disconnect();
    };
  }, [userId, fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target as Node)
      ) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    if (!userId) return;
    const notification = notifications.find((item) => item._id === id);
    if (!notification || notification.isRead) return;
    setMarkingReadId(id);
    try {
      await notificationService.markRead(id);
      setNotificationData((current) =>
        current?.userId === userId
          ? {
              ...current,
              notifications: current.notifications.map((item) =>
                item._id === id ? { ...item, isRead: true } : item,
              ),
              unreadCount: Math.max(0, current.unreadCount - 1),
            }
          : current,
      );
    } catch {
      message.error("Không thể đánh dấu thông báo đã đọc. Vui lòng thử lại.");
    } finally {
      setMarkingReadId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    setMarkingAllRead(true);
    try {
      await notificationService.markAllRead();
      setNotificationData((current) =>
        current?.userId === userId
          ? {
              ...current,
              notifications: current.notifications.map((item) => ({ ...item, isRead: true })),
              unreadCount: 0,
            }
          : current,
      );
    } catch {
      message.error("Không thể đánh dấu tất cả thông báo đã đọc. Vui lòng thử lại.");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatNotificationTime = (createdAt: string) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
              <PhoneOutlined className="text-emerald-400" /> Hotline:{" "}
              <strong className="text-emerald-400 font-bold">1900 6868</strong>
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
                    <span
                      className={isActive ? "text-emerald-600 text-sm" : "text-slate-400 text-sm"}
                    >
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
                  <Link
                    to="/customer/wallet"
                    className="h-9 px-3 rounded-xl bg-emerald-50/90 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition shadow-2xs group"
                    title="Ví trả trước CueZone Pay"
                  >
                    <WalletOutlined className="text-emerald-600 text-sm group-hover:scale-110 transition-transform" />
                    <span>750.000đ</span>
                  </Link>

                  <div className="relative" ref={notificationPanelRef}>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !showNotifPanel;
                        setShowNotifPanel(next);
                        if (next) void fetchNotifications();
                      }}
                      aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
                      aria-expanded={showNotifPanel}
                      aria-haspopup="dialog"
                      className="relative h-9 w-9 flex items-center justify-center rounded-xl border border-slate-200/80 text-slate-600 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50/50 transition shrink-0 cursor-pointer"
                      title="Hộp thư thông báo"
                    >
                      <BellOutlined className="text-sm" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifPanel && (
                      <section
                        role="dialog"
                        aria-label="Danh sách thông báo"
                        className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl z-[60]"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                          <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900">Thông báo</h2>
                            <p className="text-[11px] text-slate-500">
                              {unreadCount > 0
                                ? `${unreadCount} thông báo chưa đọc`
                                : "Bạn đã xem hết thông báo"}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleMarkAllRead()}
                              disabled={markingAllRead}
                              className="shrink-0 text-xs font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                            >
                              {markingAllRead ? "Đang cập nhật..." : "Đánh dấu tất cả đã đọc"}
                            </button>
                          )}
                        </div>

                        <div className="max-h-[min(28rem,70vh)] overflow-y-auto" aria-live="polite">
                          {notificationsLoading && notifications.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-slate-500">
                              Đang tải thông báo...
                            </div>
                          ) : notificationError ? (
                            <div className="px-4 py-8 text-center">
                              <p className="text-sm text-rose-600">{notificationError}</p>
                              <button
                                type="button"
                                onClick={() => void fetchNotifications()}
                                className="mt-3 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                              >
                                Thử tải lại
                              </button>
                            </div>
                          ) : notifications.length === 0 ? (
                            <div className="px-4 py-10 text-center">
                              <BellOutlined className="text-2xl text-slate-300" />
                              <p className="mt-2 text-sm text-slate-500">Chưa có thông báo nào.</p>
                            </div>
                          ) : (
                            notifications.map((notification) => (
                              <article
                                key={notification._id}
                                className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
                                  notification.isRead ? "bg-white" : "bg-emerald-50/60"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      {!notification.isRead && (
                                        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                                      )}
                                      <h3
                                        className={`text-sm leading-5 ${notification.isRead ? "font-medium text-slate-700" : "font-bold text-slate-900"}`}
                                      >
                                        {notification.title}
                                      </h3>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-600">
                                      {notification.content}
                                    </p>
                                    <time
                                      className="mt-2 block text-[11px] text-slate-400"
                                      dateTime={notification.createdAt}
                                    >
                                      {formatNotificationTime(notification.createdAt)}
                                    </time>
                                  </div>
                                  {!notification.isRead && (
                                    <button
                                      type="button"
                                      onClick={() => void handleMarkRead(notification._id)}
                                      disabled={markingReadId === notification._id}
                                      aria-label={`Đánh dấu đã đọc: ${notification.title}`}
                                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                      <CheckOutlined />
                                      {markingReadId === notification._id
                                        ? "Đang lưu"
                                        : "Đánh dấu đã đọc"}
                                    </button>
                                  )}
                                </div>
                              </article>
                            ))
                          )}
                        </div>
                      </section>
                    )}
                  </div>

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
                    <Tag
                      color="green"
                      className="!m-0 !text-[10px] !px-1.5 !py-0 !leading-4 !font-bold hidden xl:inline-flex"
                    >
                      VIP
                    </Tag>
                  </Link>

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
                  <span className={isActive ? "text-white" : "text-slate-400"}>{item.icon}</span>
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
                <span>Ví CueZone</span>
              </Link>
            )}
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
                Hệ thống CLB Bida chuẩn thi đấu quốc tế và điều hành giải đấu Bank Pool chuyên
                nghiệp hàng đầu.
              </p>
              <div className="pt-1 flex items-center gap-2 text-emerald-400 font-semibold">
                <PhoneOutlined /> 1900 6868 • Hỗ trợ 24/7
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3">
                Cổng Khách Hàng
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link to="/customer" className="hover:text-emerald-400 transition">
                    Trang chủ khám phá
                  </Link>
                </li>
                <li>
                  <Link to="/customer/booking" className="hover:text-emerald-400 transition">
                    Đặt bàn theo khung giờ
                  </Link>
                </li>
                <li>
                  <Link to="/customer/tournaments" className="hover:text-emerald-400 transition">
                    Giải đấu Bank Pool mở rộng
                  </Link>
                </li>
                <li>
                  <Link to="/customer/rules" className="hover:text-emerald-400 transition">
                    Luật Bank Pool chuẩn WPA
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-white uppercase text-xs tracking-wider mb-3">
                Đặc Quyền Hội Viên
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link to="/register" className="hover:text-emerald-400 transition">
                    Đăng ký thành viên VIP
                  </Link>
                </li>
                <li>
                  <Link to="/customer/news" className="hover:text-emerald-400 transition">
                    Giờ vàng giảm giá 20%
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-emerald-400 transition">
                    Tra cứu điểm thưởng & ELO
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-emerald-400 transition">
                    Cổng quản trị CLB (Staff)
                  </Link>
                </li>
              </ul>
            </div>

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
