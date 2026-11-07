import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  SyncOutlined,
  MinusOutlined,
  PlusOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Space,
} from "../../shared/ui";
import { bookingService, posService } from "../../services/pos.service";
import { defaultPricingTiers } from "../../utils/pricing";
import type { PricingTier } from "../../types";
import { getSocket } from "../../services/socket.service";
import { productService, type ProductMenu } from "../../services/product.service";
import { useAuth } from "../../contexts/AuthContext";
import QRCode from "qrcode";

const { Title, Paragraph } = Typography;

interface BookingTableItem {
  id: string;
  code: string;
  name: string;
  type: string;
  typeName: string;
  price: number;
  priceFormatted: string;
}

const CustomerBooking = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preSelectedParam = searchParams.get("table") || "";
  const [now] = useState(() => Date.now());

  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(defaultPricingTiers);
  const [tablesList, setTablesList] = useState<BookingTableItem[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(true);
  const [selectedTableId, setSelectedTableId] = useState<string>(preSelectedParam);
  const [tableType, setTableType] = useState<"" | "pool" | "carom" | "snooker">("");
  const [name, setName] = useState<string>(user?.name || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");

  const dateOptions = useMemo(() => {
    const formatVn = (daysOffset: number) => {
      const d = new Date(now + 7 * 3600000 + daysOffset * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const dd = iso.slice(8, 10);
      const mm = iso.slice(5, 7);
      const label =
        daysOffset === 0
          ? `Hôm nay (${dd}/${mm})`
          : daysOffset === 1
            ? `Ngày mai (${dd}/${mm})`
            : `Ngày kia (${dd}/${mm})`;
      return { value: iso, label };
    };
    return [formatVn(0), formatVn(1), formatVn(2)];
  }, [now]);

  const [date, setDate] = useState<string>(() => {
    const currentH = new Date().getHours();
    // Nếu hiện tại đã quá 22:30 đêm thì mặc định chọn Ngày mai
    const daysOffset = currentH >= 22 ? 1 : 0;
    const d = new Date(now + 7 * 3600000 + daysOffset * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const timeOptions = useMemo(() => {
    const slots: { value: string; label: string; disabled?: boolean }[] = [];
    const todayIso = new Date(now + 7 * 3600000).toISOString().slice(0, 10);
    const isToday = date === todayIso;
    const currentH = new Date().getHours();
    const currentM = new Date().getMinutes();

    const dayOfWeek = new Date(date).getDay();

    // Hỗ trợ đặt bàn 24/7 theo đúng Cấu hình Khung giờ & Bảng giá từ hệ thống
    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const val = `${hh}:${mm}`;
        let label = val;

        const isPast = isToday && (h < currentH || (h === currentH && currentM >= m));

        // Khớp chính xác với cấu hình bảng giá trong Database
        const timeMins = h * 60 + m;
        const matchedTier = pricingTiers.find((tier) => {
          if (tier.daysOfWeek && tier.daysOfWeek.length > 0 && !tier.daysOfWeek.includes(dayOfWeek)) {
            return false;
          }
          const [sH, sM] = tier.startTime.split(":").map(Number);
          const [eH, eM] = tier.endTime === "24:00" ? [24, 0] : tier.endTime.split(":").map(Number);
          const startMins = sH * 60 + sM;
          const endMins = eH * 60 + eM;
          return timeMins >= startMins && timeMins < endMins;
        });

        if (matchedTier) {
          const pricePool = matchedTier.prices?.standard ? `${Math.round(matchedTier.prices.standard / 1000)}k` : "";
          if (matchedTier.name.includes("Đêm Khuya") || matchedTier.startTime === "00:00") {
            label += ` (🌙 Đêm Khuya • ${pricePool}/h)`;
          } else if (matchedTier.name.includes("Cao Điểm") || matchedTier.dayType === "peak") {
            label += ` (🔥 Cao Điểm • ${pricePool}/h)`;
          } else if (matchedTier.name.includes("Cuối Tuần") || matchedTier.dayType === "weekend") {
            label += ` (🎉 Cuối Tuần • ${pricePool}/h)`;
          } else {
            label += ` (☀️ Tiêu Chuẩn • ${pricePool}/h)`;
          }
        } else {
          if (h >= 0 && h <= 5) label += " (🌙 Cú đêm)";
        }

        if (isPast) label += " — Đã qua";

        slots.push({ value: val, label, disabled: isPast });
      }
    }
    return slots;
  }, [date, now, pricingTiers]);

  const isTodayAllSlotsPassed = useMemo(() => {
    return timeOptions.length > 0 && timeOptions.every((slot) => slot.disabled);
  }, [timeOptions]);

  const [time, setTime] = useState<string>(() => {
    const currentH = new Date().getHours();
    if (currentH >= 22) return "10:00";
    const nextH = Math.min(23, Math.max(9, currentH + 1));
    return `${String(nextH).padStart(2, "0")}:00`;
  });

  // Tự động nhảy sang khung giờ hợp lệ tiếp theo nếu giờ hiện tại đã qua
  useEffect(() => {
    const validSlot = timeOptions.find((slot) => !slot.disabled);
    const currentSlotObj = timeOptions.find((slot) => slot.value === time);
    if ((!currentSlotObj || currentSlotObj.disabled) && validSlot) {
      setTime(validSlot.value);
    }
  }, [timeOptions, time]);
  const [duration, setDuration] = useState<number>(2);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);
  const [availabilityVersion, setAvailabilityVersion] = useState<number>(0);
  const [menuItems, setMenuItems] = useState<ProductMenu[]>([]);
  const [selectedFnb, setSelectedFnb] = useState<Record<string, number>>({});
  const [bookingQr, setBookingQr] = useState<{ dataUrl: string; booking: any } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    posService
      .getPricingTiers()
      .then((tiers) => {
        if (Array.isArray(tiers) && tiers.length > 0) {
          setPricingTiers(tiers);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    productService
      .getFnbMenu()
      .then(setMenuItems)
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "Không thể tải thực đơn F&B"),
      );
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const refreshAvailability = () => setAvailabilityVersion((version) => version + 1);
    socket.on("table:public_status_changed", refreshAvailability);
    socket.on("table:guest_status_changed", refreshAvailability);
    return () => {
      socket.off("table:public_status_changed", refreshAvailability);
      socket.off("table:guest_status_changed", refreshAvailability);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingTables(true);
      try {
        const data = await bookingService.getAvailableTables({
          date,
          time,
          duration,
          ...(tableType ? { type: tableType } : {}),
        });
        if (isMounted) {
          const mapped: BookingTableItem[] = data.map((table) => ({
            id: table.id,
            code: table.code,
            name: table.name.split("•")[0].split("-")[0].trim(),
            type: table.type,
            typeName:
              table.type === "carom"
                ? "Bàn Bida Carom (Phăng)"
                : table.type === "snooker"
                  ? "Bàn Bida Snooker"
                  : "Bàn Bida Lỗ (Pool)",
            price: table.pricePerHour,
            priceFormatted: `${table.pricePerHour.toLocaleString("vi-VN")}đ/h`,
            status: "available",
          }));
          setTablesList(mapped);
          const preselected = mapped.find(
            (table) => table.id === preSelectedParam || table.code === preSelectedParam,
          );
          setSelectedTableId((current) => {
            const retainedTable = mapped.find(
              (table) => table.id === current || table.code === current,
            );
            return (retainedTable || preselected || mapped[0])?.id || "";
          });
        }
      } catch (err) {
        if (isMounted) {
          setTablesList([]);
          message.error(
            err instanceof Error ? err.message : "Không thể kiểm tra bàn trống trong khung giờ này",
          );
        }
      } finally {
        if (isMounted) setLoadingTables(false);
      }
    }, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [date, time, duration, tableType, preSelectedParam, availabilityVersion]);

  const selectedTable =
    tablesList.find((t) => t.id === selectedTableId || t.code === selectedTableId) ||
    tablesList[0] ||
    null;
  const totalCost = selectedTable ? selectedTable.price * duration : 0;
  const preOrderItems = Object.entries(selectedFnb)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const preOrderTotal = preOrderItems.reduce((sum, item) => {
    const product = menuItems.find((menuItem) => menuItem._id === item.productId);
    return sum + (product?.salePrice || 0) * item.quantity;
  }, 0);

  const updateFnbQuantity = (productId: string, delta: number) => {
    setSelectedFnb((current) => {
      const quantity = Math.max(0, (current[productId] || 0) + delta);
      if (quantity === 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      return { ...current, [productId]: quantity };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      message.warning("Vui lòng nhập họ và tên của bạn!");
      return;
    }
    if (!phone.trim()) {
      message.warning("Vui lòng nhập số điện thoại để giữ bàn!");
      return;
    }
    if (!selectedTable) {
      message.warning("Vui lòng chọn một bàn bida!");
      return;
    }

    const start = new Date(`${date}T${time}:00+07:00`);
    if (start.getTime() <= Date.now()) {
      message.warning("Khung giờ đặt bàn phải ở tương lai! Vui lòng chọn giờ khác.");
      return;
    }

    try {
      setLoading(true);
      const booking = await bookingService.createPublic({
        customerName: name.trim(),
        phone: phone.trim(),
        tableId: selectedTable.id,
        date,
        time,
        duration,
        deposit: 0,
        note: note.trim() || undefined,
        preOrderItems,
      });
      setLoadingQr(true);
      const dataUrl = await QRCode.toDataURL(booking.qrToken, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setBookingQr({ dataUrl, booking });
      setShowSuccessModal(true);
      setAvailabilityVersion((version) => version + 1);
      message.success("Đặt bàn đã được xác nhận tự động.");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || err.message || "Không thể đặt bàn, vui lòng thử lại!";
      message.error(errMsg);
    } finally {
      setLoadingQr(false);
      setLoading(false);
    }
  };

  const selectedDateLabel = dateOptions.find((d) => d.value === date)?.label || date;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <CalendarOutlined className="text-emerald-600" />
          ĐẶT CHỖ TRỰC TUYẾN KHÔNG CẦN CỌC
        </div>
        <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
          Đặt Bàn Bida Chuẩn Thi Đấu
        </Title>
        <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !max-w-2xl !mb-0">
          Chọn bàn và khung giờ còn trống. Lịch được xác nhận tự động; nhân viên sẽ nhận thông báo
          để chuẩn bị bàn.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-6">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
                  1. Chọn Bàn Bida
                </Title>
                {loadingTables && tablesList.length > 0 && (
                  <SyncOutlined spin className="text-emerald-600 text-xs" />
                )}
              </div>
              <Tag color={loadingTables && tablesList.length === 0 ? "default" : "green"} className="!text-xs !font-bold">
                {loadingTables && tablesList.length === 0
                  ? "ĐANG TẢI..."
                  : `${tablesList.length} BÀN SẴN SÀNG`}
              </Tag>
            </div>

            {loadingTables && tablesList.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-slate-200/60 bg-slate-50/70 flex flex-col justify-between h-28 space-y-2"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="h-4 w-12 bg-slate-200 rounded-md" />
                        <div className="h-4 w-20 bg-slate-200 rounded-md" />
                      </div>
                      <div className="h-3 w-28 bg-slate-200 rounded-md mt-1" />
                    </div>
                    <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center">
                      <div className="h-4 w-16 bg-slate-200 rounded-md" />
                      <div className="h-3 w-12 bg-slate-200 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : tablesList.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {isTodayAllSlotsPassed ? (
                  <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl text-amber-800 text-xs text-center space-y-2 max-w-md mx-auto shadow-2xs">
                    <div className="font-bold flex items-center justify-center gap-1.5 text-amber-900">
                      <ClockCircleOutlined className="text-amber-600" />
                      Các khung giờ đặt bàn hôm nay đã kết thúc
                    </div>
                    <p className="text-slate-600 mb-0 leading-relaxed">
                      Hiện tại đã qua giờ nhận đặt bàn của hôm nay ({dateOptions[0]?.label}). Quý khách vui lòng chọn{" "}
                      <span
                        className="font-bold text-emerald-700 underline cursor-pointer hover:text-emerald-800"
                        onClick={() => setDate(dateOptions[1]?.value)}
                      >
                        {dateOptions[1]?.label}
                      </span>{" "}
                      để xem các bàn còn trống và đặt trước!
                    </p>
                  </div>
                ) : (
                  <div>
                    Không có bàn trống cho khung giờ đã chọn. Vui lòng đổi loại bàn hoặc thời gian khác.
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`grid grid-cols-2 sm:grid-cols-3 gap-3 transition-opacity duration-200 ${
                  loadingTables ? "opacity-60 pointer-events-none" : "opacity-100"
                }`}
              >
                {tablesList.map((t) => {
                  const isSelected = t.id === selectedTableId || t.code === selectedTableId;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTableId(t.id)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-50/80 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                              {t.code}
                            </span>
                            <span
                              className={`font-black text-sm whitespace-nowrap truncate ${isSelected ? "text-emerald-800" : "text-slate-800"}`}
                            >
                              {t.name}
                            </span>
                          </div>
                          {isSelected && (
                            <CheckCircleOutlined className="text-emerald-600 shrink-0 ml-1 text-sm" />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1 truncate">
                          {t.typeName}
                        </span>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">{t.priceFormatted}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold whitespace-nowrap">
                          Trống giờ này
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
            <SafetyCertificateOutlined className="text-lg text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-900 block font-bold">
                Cam kết chất lượng từ CueZone:
              </strong>
              <p>
                Mọi bàn đặt trước đều được nhân viên làm sạch mặt vải Simonis, chải bụi, đánh bóng
                bộ bi Aramith và chuẩn bị sẵn khay cơ trước giờ hẹn 10 phút.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-sm space-y-5">
            <Title
              level={3}
              className="!text-base !font-bold !text-slate-900 !mb-0 pb-3 border-b border-slate-100"
            >
              2. Thông Tin Khung Giờ & Liên Hệ
            </Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Loại bàn</label>
                <Select
                  value={tableType}
                  onChange={(value) => setTableType(value as typeof tableType)}
                  className="w-full !h-10"
                  options={[
                    { value: "", label: "Tất cả loại bàn" },
                    { value: "pool", label: "Bàn lỗ (Pool)" },
                    { value: "carom", label: "Bàn Carom" },
                    { value: "snooker", label: "Bàn Snooker" },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên cơ thủ *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Đặng Tuấn Anh"
                  prefix={<UserOutlined className="text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại nhận tin giữ bàn *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  prefix={<PhoneOutlined className="text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày chơi</label>
                  <Select
                    value={date}
                    onChange={(val) => setDate(val)}
                    className="w-full !h-10"
                    options={dateOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <Select
                    value={time}
                    onChange={(val) => setTime(val)}
                    className="w-full !h-10"
                    options={timeOptions}
                  />
                </div>
              </div>

              {/* Phím tắt đặt chơi đêm / rạng sáng */}
              <div className="flex items-center justify-between bg-indigo-50/70 border border-indigo-100 rounded-xl px-2.5 py-1.5 text-[11px]">
                <span className="text-slate-600 font-medium flex items-center gap-1">
                  <span>🌙</span> Quán mở 24/7 xuyên đêm
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDate(dateOptions[1]?.value);
                    setTime("00:00");
                  }}
                  className="font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Đặt đêm nay (00:00 - 05:00) ➔
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Dự kiến số giờ chơi
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        duration === h
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {h} Giờ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú đặc biệt (Tùy chọn)
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yêu cầu gậy cơ riêng, đá chanh, bật điều hòa..."
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    <ShoppingOutlined className="mr-1.5 text-emerald-600" />
                    Đặt trước món F&B (tùy chọn)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {preOrderItems.reduce((sum, item) => sum + item.quantity, 0)} món
                  </span>
                </div>
                {menuItems.length === 0 ? (
                  <p className="text-xs text-slate-500">Hiện chưa có món F&B để đặt trước.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {menuItems.map((item) => {
                      const quantity = selectedFnb[item._id] || 0;
                      return (
                        <div
                          key={item._id}
                          className="flex items-center justify-between gap-2 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.salePrice.toLocaleString("vi-VN")}đ
                              {item.isOutOfStock ? " • Hết hàng" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              htmlType="button"
                              variant="outline"
                              size="sm"
                              icon={<MinusOutlined />}
                              disabled={quantity === 0}
                              onClick={() => updateFnbQuantity(item._id, -1)}
                              aria-label={`Giảm ${item.name}`}
                            />
                            <span className="w-4 text-center text-xs font-bold">{quantity}</span>
                            <Button
                              htmlType="button"
                              variant="outline"
                              size="sm"
                              icon={<PlusOutlined />}
                              disabled={item.isOutOfStock || quantity >= 50}
                              onClick={() => updateFnbQuantity(item._id, 1)}
                              aria-label={`Tăng ${item.name}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {preOrderItems.length > 0 && (
                  <div className="border-t border-slate-100 pt-2 text-right text-xs font-bold text-emerald-700">
                    Món F&B tạm tính: {preOrderTotal.toLocaleString("vi-VN")}đ
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Bàn đã chọn:</span>
                  <strong className="text-slate-900">
                    {selectedTable
                      ? `${selectedTable.name} (${selectedTable.typeName})`
                      : "Đang tải dữ liệu bàn..."}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Đơn giá giờ:</span>
                  <span>{selectedTable?.priceFormatted || "---"}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Thời lượng:</span>
                  <span>
                    {duration} tiếng ({time} - {selectedDateLabel})
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                  <span className="text-slate-900">Chi phí tạm tính:</span>
                  <span className="text-emerald-700 text-base">
                    {totalCost.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="w-full !h-12 !text-sm !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white shadow-lg shadow-emerald-600/25 !rounded-xl"
              >
                Xác Nhận Giữ Bàn Ngay
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <Modal
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={[
          <Button
            key="ok"
            variant="primary"
            onClick={() => setShowSuccessModal(false)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đã Hiểu & Đóng
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <CheckCircleOutlined className="text-emerald-600 text-lg" />
            <span className="text-slate-900 font-bold">Mã QR Đặt Bàn</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <p className="text-sm">
            Đặt bàn của <strong>{bookingQr?.booking.customerName || name}</strong> đã được xác nhận.
            Đưa mã này cho nhân viên khi đến quán để xác nhận bàn và món đặt trước.
          </p>
          <div className="flex justify-center">
            {bookingQr?.dataUrl ? (
              <img src={bookingQr.dataUrl} alt="Mã QR xác nhận đặt bàn" className="h-56 w-56" />
            ) : loadingQr ? (
              <SyncOutlined spin className="py-12 text-3xl text-emerald-600" />
            ) : null}
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-emerald-600" />
              <span>
                <strong>Bàn:</strong>{" "}
                {bookingQr?.booking.tableCode
                  ? `${bookingQr.booking.tableCode} • ${bookingQr.booking.tableName}`
                  : selectedTable
                    ? `${selectedTable.code} • ${selectedTable.name} (${selectedTable.typeName})`
                    : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockCircleOutlined className="text-emerald-600" />
              <span>
                <strong>Thời gian:</strong> {bookingQr?.booking.time || time} (
                {bookingQr?.booking.date || selectedDateLabel}) - Thời lượng dự kiến:{" "}
                {bookingQr?.booking.duration || duration} giờ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneOutlined className="text-emerald-600" />
              <span>
                <strong>SĐT xác nhận:</strong> {phone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-emerald-600" />
              <span>
                <strong>Chi phí bàn:</strong>{" "}
                {(bookingQr?.booking.estimatedCost || totalCost).toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
            {bookingQr?.booking.preOrderItems?.length > 0 && (
              <div className="border-t border-emerald-200 pt-2">
                <strong>Món F&B đặt trước:</strong>
                <ul className="mt-1 list-disc pl-5">
                  {bookingQr?.booking?.preOrderItems?.map((item: any) => (
                    <li key={String(item.productId)}>
                      {item.name} × {item.quantity} —{" "}
                      {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                    </li>
                  ))}
                </ul>
                <p className="mt-1 font-bold">
                  Tổng món: {preOrderTotal.toLocaleString("vi-VN")}đ (thanh toán tại quầy)
                </p>
              </div>
            )}
          </div>
          <p className="text-slate-500">
            Lịch đặt đã được xác nhận. Bạn có thể hủy trước giờ chơi ít nhất 2 tiếng tại{" "}
            <Link to="/customer/history" className="font-semibold text-emerald-700">
              Lịch sử đặt chỗ
            </Link>
            .
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerBooking;
