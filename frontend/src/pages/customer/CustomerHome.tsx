import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  TrophyOutlined,
  ReadOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  FireOutlined,
  CrownOutlined,
  TeamOutlined,
  RightOutlined,
  StarFilled,
  CoffeeOutlined,
  VideoCameraOutlined,
  ThunderboltOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Typography } from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";
import { posService } from "../../services/pos.service";
import { getSocket } from "../../services/socket.service";

const { Title, Text, Paragraph } = Typography;

const PROMOTIONS = [
  {
    id: "p1",
    tag: "GIỜ VÀNG",
    tagColor: "red",
    title: "Giảm 20% Tiền Bàn Khung Giờ 13:00 - 17:00",
    desc: "Áp dụng từ Thứ 2 đến Thứ 6 hàng tuần cho tất cả các loại bàn bida tại CLB.",
    valid: "Áp dụng đến 31/12/2026",
  },
  {
    id: "p2",
    tag: "HỘI VIÊN MỚI",
    tagColor: "green",
    title: "Tặng Voucher 50.000đ & 01 Phần Nước Ép",
    desc: "Dành riêng cho khách hàng đăng ký tài khoản hội viên CueZone lần đầu tiên.",
    valid: "Nhận ngay khi đăng ký",
  },
  {
    id: "p3",
    tag: "COMBO NHÓM",
    tagColor: "gold",
    title: "Combo Cơ Thủ: 3 Giờ Chơi + 4 Đồ Uống + Snack",
    desc: "Tiết kiệm 25% chi phí cho các buổi giao lưu cơ thủ từ 4 người trở lên.",
    valid: "Áp dụng cả tuần",
  },
];

const CLUB_AMENITIES = [
  {
    icon: <SafetyCertificateOutlined className="text-xl text-emerald-600" />,
    title: "Bàn Thi Đấu Tiêu Chuẩn",
    desc: "Vải Simonis 860 chính hãng, băng cao su Artemis và bi Aramith Pro TV Cup.",
  },
  {
    icon: <VideoCameraOutlined className="text-xl text-emerald-600" />,
    title: "Camera VAR Góc Lỗ",
    desc: "Hệ thống quay chậm hỗ trợ trọng tài xác định bi chạm băng trong các trận thi đấu giải.",
  },
  {
    icon: <CoffeeOutlined className="text-xl text-emerald-600" />,
    title: "Menu F&B Phục Vụ Tại Bàn",
    desc: "Cà phê pha máy, nước ép nguyên chất, thức ăn nóng phục vụ liên tục.",
  },
  {
    icon: <TeamOutlined className="text-xl text-emerald-600" />,
    title: "Trọng Tài & Huấn Luyện Viên",
    desc: "Hỗ trợ xếp bi, bấm giờ và hướng dẫn kỹ thuật dội băng cho người mới.",
  },
];

const formatTableType = (name?: string, type?: string) => {
  const raw = (name || type || "").toLowerCase();
  if (raw.includes("snooker")) return "Bida Snooker";
  if (raw.includes("carom") || raw.includes("phăng")) return "Carom (Phăng)";
  return "Bida Lỗ (Pool)";
};

const formatBookedTime = (timeStr?: string) => {
  if (!timeStr) return "Đã đặt trước";
  const clean = timeStr.replace(/\(.*?\)/g, "").trim();
  return clean.startsWith("Đặt lúc") ? clean.replace("Đặt lúc", "Hẹn").trim() : `Hẹn ${clean}`;
};

const CustomerHome = () => {
  const { user } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [socketConnected, setSocketConnected] = useState<boolean>(true);

  const fetchTables = useCallback(async () => {
    try {
      const data = await posService.getPublicTables();
      setTables(data);
    } catch (err) {
      console.error("Lỗi tải sơ đồ bàn trực tuyến:", err);
    } finally {
      setLoadingTables(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();

    const socket = getSocket();
    setSocketConnected(socket.connected);
    const onConnect = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const handleUpdate = () => {
      fetchTables();
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("table:public_status_changed", handleUpdate);
    socket.on("table:guest_status_changed", handleUpdate);
    socket.on("table:status_changed", handleUpdate);
    socket.on("table:timer_started", handleUpdate);

    const interval = setInterval(fetchTables, 15000);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("table:public_status_changed", handleUpdate);
      socket.off("table:guest_status_changed", handleUpdate);
      socket.off("table:status_changed", handleUpdate);
      socket.off("table:timer_started", handleUpdate);
      clearInterval(interval);
    };
  }, [fetchTables]);

  const stats = useMemo(() => {
    const total = tables.length;
    let available = 0;
    let playing = 0;
    let booked = 0;
    let pool = 0;
    let carom = 0;
    let snooker = 0;
    for (const t of tables) {
      if (t.status === "available") available++;
      else if (t.status === "playing" || t.status === "paused") playing++;
      else if (t.status === "booked") booked++;

      const isPool =
        t.type === "pool" || t.typeName?.includes("Lỗ") || t.typeName?.includes("Pool");
      const isCarom =
        t.type === "carom" || t.typeName?.includes("Carom") || t.typeName?.includes("Phăng");
      const isSnooker = t.type === "snooker" || t.typeName?.includes("Snooker");
      if (isPool) pool++;
      else if (isCarom) carom++;
      else if (isSnooker) snooker++;
    }
    return { total, available, playing, booked, pool, carom, snooker };
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (filterType === "all") return true;
      if (filterType === "available") return t.status === "available";
      return t.type === filterType;
    });
  }, [tables, filterType]);

  return (
    <div className="space-y-12">
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-[#f0fdf4] to-[#ecfdf5] border border-emerald-100 shadow-xs p-8 sm:p-12 xl:p-16">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/60 text-emerald-800 text-xs font-bold tracking-wide shadow-2xs">
            <ThunderboltOutlined className="text-emerald-600" />
            <span>HỆ THỐNG CLB BIDA & GIẢI ĐẤU BANK POOL ĐẲNG CẤP</span>
          </div>

          <Title
            level={1}
            className="!text-3xl sm:!text-5xl !font-black !text-slate-900 !leading-tight !tracking-tight !mb-0"
          >
            Trải Nghiệm Cơ Thủ Chuẩn Mực <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
              Không Gian Thể Thao Đẳng Cấp
            </span>
          </Title>

          <Paragraph className="!text-base !text-slate-600 !leading-relaxed !max-w-2xl !mb-0">
            CueZone sở hữu hệ thống {stats.total > 0 ? stats.total : 27} bàn bida thi đấu quốc tế
            (Pool, Carom 3 băng, Snooker), hệ thống giải đấu Bank Pool hàng tuần có trọng tài chuyên
            nghiệp, và công nghệ đặt bàn realtime không cần cọc.
          </Paragraph>

          {/* Social Proof */}
          <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-0.5 text-amber-400">
              <StarFilled />
              <StarFilled />
              <StarFilled />
              <StarFilled />
              <StarFilled />
            </div>
            <span className="font-bold text-slate-700">4.9/5.0</span>
            <span>• Được hơn 1,200+ cơ thủ phong trào & chuyên nghiệp tin chọn</span>
          </div>

          {/* Action Buttons (Adaptive for Member vs Guest) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="primary"
              size="large"
              to="/customer/booking"
              rightIcon={<CalendarOutlined />}
              className="!h-12 !px-6 !text-sm !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white shadow-lg shadow-emerald-600/25 !rounded-xl"
            >
              Đặt Bàn Trực Tuyến Ngay
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="large"
                to="/customer/fnb"
                rightIcon={<CoffeeOutlined className="text-emerald-600" />}
                className="!h-12 !px-6 !text-sm !font-bold !border-emerald-600/40 !bg-white hover:!bg-emerald-50 !text-emerald-800 !rounded-xl shadow-xs"
              >
                Gọi Món F&B Tại Bàn
              </Button>
            ) : (
              <Button
                variant="outline"
                size="large"
                to="/register"
                rightIcon={<ArrowRightOutlined className="text-emerald-600" />}
                className="!h-12 !px-6 !text-sm !font-bold !border-emerald-600/40 !bg-white hover:!bg-emerald-50 !text-emerald-800 !rounded-xl shadow-xs"
              >
                Đăng Ký Hội Viên (Nhận Ưu Đãi 20%)
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-emerald-200/60 relative z-10">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1">
              <FireOutlined /> {stats.total > 0 ? `${stats.total} BÀN THI ĐẤU` : "27 BÀN THI ĐẤU"}
            </div>
            <div className="text-2xl font-black text-slate-900">
              {stats.total > 0 ? `${stats.available} Sẵn Sàng` : "Sẵn Sàng"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Vải Simonis 860 chính hãng</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-1">
              <TrophyOutlined /> GIẢI BANK POOL
            </div>
            <div className="text-2xl font-black text-slate-900">15.000.000đ</div>
            <div className="text-xs text-slate-500 mt-0.5">Tổng thưởng giải Q4 mở rộng</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold mb-1">
              <ClockCircleOutlined /> GIỜ VÀNG ƯU ĐÃI
            </div>
            <div className="text-2xl font-black text-slate-900">Giảm 20%</div>
            <div className="text-xs text-slate-500 mt-0.5">Khung giờ 13:00 - 17:00</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-1">
              <CrownOutlined /> ĐẶC QUYỀN VIP
            </div>
            <div className="text-2xl font-black text-slate-900">Tích Điểm 10%</div>
            <div className="text-xs text-slate-500 mt-0.5">Đổi giờ chơi & voucher F&B</div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              THEO DÕI THỜI GIAN THỰC
            </div>
            <Title
              level={2}
              className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0 tracking-tight"
            >
              Sơ Đồ Bàn Trực Tuyến
            </Title>
            <Text className="!text-xs sm:!text-sm !text-slate-500 block">
              Xem bàn trống và thời gian thực trực tiếp tại CLB. Chọn bàn ưa thích và đặt trước
              nhanh chóng để không phải chờ đợi.
            </Text>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {socketConnected ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-bold shadow-2xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span>Trực tiếp (Live)</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Đang kết nối lại...</span>
              </div>
            )}
            <Button
              variant="primary"
              to="/customer/booking"
              rightIcon={<ArrowRightOutlined className="text-xs" />}
              className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !h-9 !px-4 !rounded-xl shadow-sm shadow-emerald-600/20"
            >
              Đặt Bàn Ngay
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: "all", label: `Tất cả (${stats.total})` },
              { key: "available", label: `Bàn trống (${stats.available})`, highlight: true },
              { key: "pool", label: `Bida Lỗ - Pool (${stats.pool})` },
              { key: "carom", label: `Carom - Phăng (${stats.carom})` },
              { key: "snooker", label: `Snooker (${stats.snooker})` },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilterType(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterType === item.key
                    ? "bg-slate-900 text-white shadow-xs"
                    : item.highlight
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-50 text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {item.highlight && filterType !== item.key && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3.5 sm:gap-4 text-xs font-medium text-slate-600 px-2 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              <span>
                <strong className="text-slate-900 font-bold">{stats.available}</strong> Trống
              </span>
            </span>
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>
                <strong className="text-slate-900 font-bold">{stats.playing}</strong> Đang chơi
              </span>
            </span>
            {stats.booked > 0 && (
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span>
                  <strong className="text-slate-900 font-bold">{stats.booked}</strong> Đã đặt
                </span>
              </span>
            )}
          </div>
        </div>

        {loadingTables && tables.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
            <SyncOutlined spin className="text-emerald-600 text-2xl" />
            <span className="text-xs text-slate-500">Đang đồng bộ sơ đồ bàn từ CLB...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-3.5">
            {filteredTables.map((table) => {
              const isAvail = table.status === "available";
              const isPlaying = table.status === "playing" || table.status === "paused";
              const isBooked = table.status === "booked";
              const cleanTableName = (table.name || "").split("•")[0].split("-")[0].trim();

              return (
                <div
                  key={table.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    isAvail
                      ? "bg-white border-emerald-200/90 hover:border-emerald-500 hover:shadow-md ring-1 ring-emerald-500/10 cursor-pointer group"
                      : isPlaying
                        ? table.isPaused
                          ? "bg-amber-50/40 border-amber-200/80"
                          : "bg-slate-50/80 border-slate-200/90 hover:border-slate-300"
                        : isBooked
                          ? "bg-blue-50/40 border-blue-200/80 hover:border-blue-300"
                          : "bg-slate-100/60 border-slate-200/60 opacity-80"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                          {table.code}
                        </span>
                        <span
                          className={`font-bold text-sm whitespace-nowrap truncate ${isAvail ? "text-slate-900 group-hover:text-emerald-700" : "text-slate-800"} transition-colors`}
                        >
                          {cleanTableName}
                        </span>
                      </div>
                      <span
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ml-1.5 ${
                          isAvail
                            ? "bg-emerald-500 ring-2 ring-emerald-200"
                            : isPlaying
                              ? table.isPaused
                                ? "bg-amber-500 ring-2 ring-amber-200"
                                : "bg-rose-500 ring-2 ring-rose-200 animate-pulse"
                              : isBooked
                                ? "bg-blue-500 ring-2 ring-blue-200"
                                : "bg-slate-400"
                        }`}
                      />
                    </div>

                    <span className="text-[11px] font-medium text-slate-500 block mb-1">
                      {formatTableType(table.typeName, table.type)}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <span className="text-xs font-black text-emerald-700 shrink-0">
                      {table.pricePerHour
                        ? `${table.pricePerHour.toLocaleString("vi-VN")}đ/h`
                        : "60.000đ/h"}
                    </span>
                    {isAvail ? (
                      <Link
                        to={`/customer/booking?table=${table.id}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-2xs whitespace-nowrap shrink-0"
                      >
                        <span>Đặt ngay</span>
                        <span>→</span>
                      </Link>
                    ) : isPlaying ? (
                      <div
                        className={`text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap ${table.isPaused ? "text-amber-700" : "text-slate-600"}`}
                      >
                        <ClockCircleOutlined className="text-[10px]" />
                        <span>
                          {table.isPaused
                            ? `Tạm dừng • ${table.durationFormatted || "0p"}`
                            : `Chơi ${table.durationFormatted || "0p"}`}
                        </span>
                      </div>
                    ) : isBooked ? (
                      <div className="text-right flex flex-col items-end">
                        <span className="text-[11px] text-blue-700 font-bold block whitespace-nowrap">
                          {formatBookedTime(table.bookedTime)}
                        </span>
                        <Link
                          to={`/customer/booking?table=${table.id}`}
                          className="text-[10px] font-semibold text-slate-500 hover:text-blue-700 underline block whitespace-nowrap"
                        >
                          Đặt giờ khác →
                        </Link>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-semibold">Bảo trì</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none">
          <img
            src="/cuezone_billiards_hero.jpg"
            alt="Tournament"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Tag color="gold" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
              GIẢI ĐẤU NỔI BẬT Q4/2026
            </Tag>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <ClockCircleOutlined /> Khởi tranh ngày 15/10/2026
            </span>
          </div>

          <Title
            level={2}
            className="!text-2xl sm:!text-4xl !font-black !text-white !mb-1 leading-tight"
          >
            CueZone Bank Pool Open Championship
          </Title>

          <Paragraph className="!text-sm !text-slate-300 !leading-relaxed !mb-0">
            Giải đấu Bank Pool quy tụ 32 cơ thủ hàng đầu khu vực miền Nam. Tổng giá trị giải thưởng
            lên đến 15.000.000 VNĐ cùng Cúp Vô Địch và cộng 250 điểm ELO vào hệ thống hội viên
            CueZone.
          </Paragraph>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Lệ phí thi đấu</div>
              <div className="text-lg font-black text-amber-300">200.000 VNĐ</div>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Giải nhất</div>
              <div className="text-lg font-black text-emerald-400">8.000.000 VNĐ + Cúp</div>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Quy mô giải</div>
              <div className="text-lg font-black text-white">32 Cơ Thủ (Còn 8 suất)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="large"
              to="/customer/tournaments"
              rightIcon={<ArrowRightOutlined />}
              className="!h-11 !px-5 !text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 shadow-md"
            >
              Xem Thể Lệ & Lệ Phí Chi Tiết
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="large"
                to="/customer/tournaments"
                className="!h-11 !px-5 !text-xs !font-bold !border-slate-700 !bg-slate-800/80 !text-slate-200 hover:!border-emerald-500 hover:!text-white"
              >
                Đăng Ký Tham Gia Ngay
              </Button>
            ) : (
              <Button
                variant="outline"
                size="large"
                to="/register"
                className="!h-11 !px-5 !text-xs !font-bold !border-slate-700 !bg-slate-800/80 !text-slate-200 hover:!border-emerald-500 hover:!text-white"
              >
                Đăng Ký Tài Khoản Thi Đấu
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md">
            <ReadOutlined className="text-emerald-600" />
            CẨM NANG THỂ THAO
          </div>
          <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
            Luật Thi Đấu Bank Pool Chuẩn Quốc Tế
          </Title>
          <Text className="!text-xs !text-slate-500 block">
            Nắm vững 4 quy tắc cơ bản trước khi bước vào bàn thi đấu tại CLB CueZone
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm flex items-center justify-center mb-3">
              01
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Chạm Băng Bắt Buộc
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Bi mục tiêu bắt buộc phải dội ít nhất <strong>01 băng</strong> trước khi vào lỗ. Đánh
              bi thẳng trực tiếp vào lỗ không được tính điểm.
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 font-black text-sm flex items-center justify-center mb-3">
              02
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Gọi Bi & Gọi Lỗ
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Trước cú đánh, cơ thủ phải tuyên bố rõ số bi mục tiêu và miệng lỗ định đưa bi vào.
              Không bắt buộc chỉ định số lần dội băng.
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 font-black text-sm flex items-center justify-center mb-3">
              03
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Lỗi & Phạt Bi
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Khi phạm quy (bi cái vào lỗ, bi văng khỏi bàn), cơ thủ bị trừ 01 bi điểm số đã ăn. Đối
              thủ nhận quyền bi trong tay (Ball in hand).
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 font-black text-sm flex items-center justify-center mb-3">
              04
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Chạm 5 Ván Thắng
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Cơ thủ đầu tiên đưa thành công 5 bi mục tiêu hợp lệ vào lỗ sẽ chiến thắng ván đấu (Thể
              thức chuẩn Race to 5).
            </Paragraph>
          </Card>
        </div>

        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="large"
            to="/customer/rules"
            rightIcon={<ArrowRightOutlined />}
            className="!h-11 !px-6 !text-xs !font-bold !border-slate-300 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl"
          >
            Đọc Toàn Bộ Cẩm Nang & Tình Huống Luật Bank Pool
          </Button>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md mb-1.5">
              ƯU ĐÃI ĐỘC QUYỀN
            </div>
            <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
              Chương Trình Khuyến Mãi Hàng Tuần
            </Title>
            <Text className="!text-xs !text-slate-500">
              Tiết kiệm chi phí với giờ vàng giảm giá và ưu đãi thành viên mới
            </Text>
          </div>

          <Button
            variant="outline"
            size="sm"
            to="/customer/news"
            rightIcon={<RightOutlined className="text-xs" />}
            className="!text-xs !font-bold !border-slate-300"
          >
            Xem Tất Cả Tin Tức & Khuyến Mãi
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROMOTIONS.map((promo) => (
            <Card
              key={promo.id}
              className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <Tag
                  color={promo.tagColor}
                  className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase"
                >
                  {promo.tag}
                </Tag>
                <Title
                  level={3}
                  className="!text-base !font-bold !text-slate-900 !mb-1 leading-snug"
                >
                  {promo.title}
                </Title>
                <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
                  {promo.desc}
                </Paragraph>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">{promo.valid}</span>
                <Link
                  to={user ? "/customer/booking" : "/register"}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  Nhận ưu đãi <RightOutlined className="text-[10px]" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-xs space-y-6">
        <div className="text-center max-w-lg mx-auto space-y-1.5">
          <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
            Tiện Ích Chuẩn Thi Đấu Tại CueZone
          </Title>
          <Text className="!text-xs !text-slate-500">
            Cam kết chất lượng phục vụ tốt nhất để mọi cơ thủ thỏa sức tỏa sáng trên từng đường cơ
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {CLUB_AMENITIES.map((am, i) => (
            <div key={i} className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-emerald-100/70 flex items-center justify-center">
                {am.icon}
              </div>
              <Text strong className="!text-sm !text-slate-900 block">
                {am.title}
              </Text>
              <Text className="!text-xs !text-slate-500 leading-relaxed block">{am.desc}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-10 text-center space-y-4 shadow-xl shadow-emerald-700/20">
        <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-white !mb-0">
          Sẵn Sàng Cho Trận Đấu Bida Đỉnh Cao?
        </Title>
        <Paragraph className="!text-xs sm:!text-sm !text-emerald-100 !max-w-xl !mx-auto !leading-relaxed !mb-0">
          Đăng ký tài khoản hội viên CueZone miễn phí ngay hôm nay để nhận voucher giảm 20%, tích
          điểm sau mỗi giờ chơi và cập nhật thứ hạng ELO cơ thủ.
        </Paragraph>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="large"
            to="/customer/booking"
            className="!h-11 !px-6 !text-xs !font-bold !bg-white !text-emerald-800 !border-white hover:!bg-emerald-50 !rounded-xl shadow-xs"
          >
            Đặt Bàn Ngay
          </Button>
          {user ? (
            <Button
              variant="outline"
              size="large"
              to="/customer/fnb"
              className="!h-11 !px-6 !text-xs !font-bold !border-emerald-300/60 !bg-emerald-800/40 !text-white hover:!bg-emerald-800/60 !rounded-xl"
            >
              Gọi Món F&B Tại Bàn
            </Button>
          ) : (
            <Button
              variant="outline"
              size="large"
              to="/register"
              className="!h-11 !px-6 !text-xs !font-bold !border-emerald-300/60 !bg-emerald-800/40 !text-white hover:!bg-emerald-800/60 !rounded-xl"
            >
              Đăng Ký Thẻ Hội Viên
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
