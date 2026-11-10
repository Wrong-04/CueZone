import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ShoppingOutlined,
  RightOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Space,
} from "../../shared/ui";
import { bookingService } from "../../services/pos.service";
import { getSocket } from "../../services/socket.service";
import { productService, type ProductMenu } from "../../services/product.service";
import { useAuth } from "../../contexts/AuthContext";
import {
  isVietnameseMobilePhone,
  normalizeVietnameseMobilePhone,
} from "../../utils/phone";
import { CustomerFnbMenuModal } from "../../components/customer/CustomerFnbMenuModal";

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

const TABLE_CATEGORIES = [
  { key: "", label: "Tất Cả Loại Bàn" },
  { key: "pool", label: "Bida Lỗ (Pool)" },
  { key: "carom", label: "Bida Carom (Phăng)" },
  { key: "snooker", label: "Bida Snooker" },
];

export const CustomerBooking = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preSelectedParam = searchParams.get("table") || "";
  const [now] = useState(() => Date.now());

  const [tablesList, setTablesList] = useState<BookingTableItem[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(true);
  const [selectedTableId, setSelectedTableId] = useState<string>(preSelectedParam);
  const [tableType, setTableType] = useState<"" | "pool" | "carom" | "snooker">("");
  const [name, setName] = useState<string>(user?.name || "");
  const [phone, setPhone] = useState<string>(user?.phone || "");

  useEffect(() => {
    if (user?.name && !name.trim()) setName(user.name);
    if (user?.phone && !phone.trim()) setPhone(user.phone);
  }, [user?.name, user?.phone, name, phone]);

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
      return { value: iso, label, rawDate: `${dd}/${mm}` };
    };
    return [formatVn(0), formatVn(1), formatVn(2)];
  }, [now]);

  const todayIso = useMemo(() => new Date(now + 7 * 3600000).toISOString().slice(0, 10), [now]);

  // Tìm khung giờ gần nhất với thời điểm hiện tại (Slot tiếp theo cách 0-30 phút)
  const closestSlotValue = useMemo(() => {
    const d = new Date();
    const curH = d.getHours();
    const curM = d.getMinutes();
    if (curM < 25) {
      return `${String(curH).padStart(2, "0")}:30`;
    }
    const nextH = (curH + 1) % 24;
    return `${String(nextH).padStart(2, "0")}:00`;
  }, []);

  const [date, setDate] = useState<string>(todayIso);
  const [time, setTime] = useState<string>(closestSlotValue);

  const isToday = date === todayIso;

  const timeOptions = useMemo(() => {
    const slots: { value: string; label: string; disabled?: boolean }[] = [];
    const currentH = new Date().getHours();
    const currentM = new Date().getMinutes();

    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const val = `${hh}:${mm}`;
        let label = val;

        const isPast = isToday && (h < currentH || (h === currentH && currentM >= m));
        if (isPast) {
          label += " (Đã qua)";
        }

        slots.push({ value: val, label, disabled: isPast });
      }
    }
    return slots;
  }, [isToday]);

  // Tự động ghim khung giờ hợp lệ nếu giờ đang chọn bị quá hạn
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
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [showFnbMenuModal, setShowFnbMenuModal] = useState(false);
  const [selectedFnb, setSelectedFnb] = useState<Record<string, number>>({});
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  useEffect(() => {
    let active = true;
    productService
      .getFnbMenu()
      .then((items) => {
        if (active) setMenuItems(items);
      })
      .catch((error) =>
        message.error(error instanceof Error ? error.message : "Không thể tải thực đơn đồ uống"),
      )
      .finally(() => {
        if (active) setLoadingMenu(false);
      });
    return () => {
      active = false;
    };
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
                ? "Bàn Carom"
                : table.type === "snooker"
                  ? "Bàn Snooker"
                  : "Bàn Lỗ (Pool)",
            price: table.pricePerHour,
            priceFormatted: `${table.pricePerHour.toLocaleString("vi-VN")}đ/h`,
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
      message.warning("Vui lòng nhập tên người đặt bàn!");
      return;
    }
    if (!phone.trim()) {
      message.warning("Vui lòng nhập số điện thoại để giữ bàn!");
      return;
    }
    const normalizedPhone = normalizeVietnameseMobilePhone(phone);
    if (!isVietnameseMobilePhone(phone) || !normalizedPhone) {
      message.warning("Vui lòng nhập số di động Việt Nam hợp lệ (ví dụ: 0912345678).");
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
        phone: normalizedPhone,
        tableId: selectedTable.id,
        date,
        time,
        duration,
        deposit: 0,
        note: note.trim() || undefined,
        preOrderItems,
      });
      setConfirmedBooking(booking);
      setShowSuccessModal(true);
      setAvailabilityVersion((version) => version + 1);
      message.success("Đặt bàn thành công! Quán đã sẵn sàng đón tiếp bạn.");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || err.message || "Không thể đặt bàn, vui lòng thử lại!";
      if (err.response?.status === 409) {
        setAvailabilityVersion((version) => version + 1);
      }
      if (err.response?.data?.code === "FNB_MENU_CHANGED") {
        try {
          const currentMenu = await productService.getFnbMenu();
          const currentProductIds = new Set(currentMenu.map((item) => item._id));
          setMenuItems(currentMenu);
          setLoadingMenu(false);
          setSelectedFnb((selected) =>
            Object.fromEntries(
              Object.entries(selected).filter(
                ([productId]) => currentProductIds.has(productId),
              ),
            ),
          );
          message.warning("Thực đơn vừa thay đổi; món đã ngừng bán được bỏ khỏi đơn đặt trước.");
        } catch (menuError) {
          message.error(
            menuError instanceof Error
              ? menuError.message
              : "Không thể cập nhật thực đơn F&B",
          );
        }
      } else {
        message.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedDateLabel = dateOptions.find((d) => d.value === date)?.label || date;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner Thanh Lịch */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 sm:p-8 border border-emerald-900/60 shadow-lg relative overflow-hidden">
        <div className="max-w-2xl space-y-2 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wide">
            <CalendarOutlined /> Đặt Bàn Bida Trực Tuyến
          </div>
          <Title level={1} className="!text-2xl sm:!text-3xl !font-black !text-white !mb-1 tracking-tight">
            Chọn Bàn & Khung Giờ Đến Chơi
          </Title>
          <Paragraph className="!text-xs sm:!text-sm !text-slate-300 leading-relaxed !mb-0">
            Giữ bàn miễn phí 15 phút. Tiền bàn tự động tính theo số phút chơi thực tế khi bạn nhận bàn tại CLB.
          </Paragraph>
        </div>
      </div>

      {/* Bố Cục 2 Cột Chuẩn Mực */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7 cột): Danh Sách Bàn Bida & Bộ Lọc Loại Bàn */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
              <div className="min-w-0">
                <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0.5 whitespace-nowrap">
                  1. Chọn Bàn Bida
                </Title>
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  Khung giờ đang xem: <strong className="text-slate-800">{time}</strong> · {selectedDateLabel}
                </div>
              </div>

              {/* Bộ lọc loại bàn dạng Dropdown chọn nhanh gọn, không rớt dòng */}
              <div className="w-full sm:w-48 shrink-0">
                <Select
                  value={tableType}
                  onChange={(val) => setTableType(val as typeof tableType)}
                  className="w-full !h-9 text-xs"
                  options={TABLE_CATEGORIES.map((cat) => ({ value: cat.key, label: cat.label }))}
                />
              </div>
            </div>

            {/* Trạng thái danh sách bàn */}
            {loadingTables && tablesList.length === 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse py-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 h-28"
                  />
                ))}
              </div>
            ) : tablesList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl">
                  <ClockCircleOutlined />
                </div>
                <div className="font-bold text-slate-800 text-sm">
                  Không còn bàn trống cho khung giờ {time} ({selectedDateLabel})
                </div>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Quý khách vui lòng đổi sang khung giờ khác hoặc ngày mai ở form bên phải để xem các bàn còn trống.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tablesList.map((t) => {
                  const isSelected = t.id === selectedTableId || t.code === selectedTableId;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTableId(t.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {t.code}
                          </span>
                          {isSelected && (
                            <CheckCircleOutlined className="text-emerald-600 text-sm" />
                          )}
                        </div>
                        <span className={`font-black text-sm block ${isSelected ? "text-emerald-900" : "text-slate-900"}`}>
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">
                          {t.typeName}
                        </span>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">{t.priceFormatted}</span>
                        <span className="text-[10px] text-emerald-600 font-semibold">Bàn trống</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cam kết chất lượng bàn */}
            <div className="mt-4 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2 leading-relaxed">
              <SafetyCertificateOutlined className="text-emerald-600 text-sm mt-0.5 shrink-0" />
              <span>
                <strong>Cam kết dịch vụ CueZone:</strong> Bàn đặt trước luôn được chải sạch mặt vải nỉ Simonis, lau bóng bộ bi Aramith và xếp sẵn khay cơ trước giờ hẹn 10 phút.
              </span>
            </div>
          </Card>
        </div>

        {/* CỘT PHẢI (5 cột): Thông Tin Khung Giờ & Liên Hệ */}
        <div className="lg:col-span-5 space-y-5">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-xs space-y-4">
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0 pb-3 border-b border-slate-100">
              2. Thông Tin Khung Giờ & Nhận Bàn
            </Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên *
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Trần Quốc Đạt"
                  prefix={<UserOutlined className="text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại nhận bàn *
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0988 123 456"
                  prefix={<PhoneOutlined className="text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs font-mono"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Đọc số điện thoại này tại quầy lễ tân để nhận bàn nhanh
                </span>
              </div>

              {/* Grid 2 cột: Ngày nhận bàn & Giờ nhận bàn */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ngày nhận bàn:
                  </label>
                  <Select
                    value={date}
                    onChange={(val) => {
                      setDate(val);
                      if (val === todayIso) {
                        setTime(closestSlotValue);
                      }
                    }}
                    className="w-full !h-10 font-medium"
                    options={dateOptions}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Giờ nhận bàn:
                  </label>
                  <Select
                    value={time}
                    onChange={(val) => setTime(val)}
                    className="w-full !h-10 font-bold"
                    options={timeOptions}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Thời lượng dự kiến:
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      className={`h-9 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        duration === h
                          ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {h >= 5 ? "5h+" : `${h}h`}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Chỉ dùng để tạm tính chi phí. Bạn có thể chơi thêm thoải mái.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú (Tùy chọn)
                </label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yêu cầu gậy cơ riêng, đá chanh..."
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              {/* Đặt trước nước uống & đồ ăn (Tùy chọn) */}
              <div className="rounded-2xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <ShoppingOutlined className="text-emerald-600" />
                    Đặt trước đồ uống & món (Tùy chọn)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {preOrderItems.reduce((sum, item) => sum + item.quantity, 0)} món
                  </span>
                </div>
                <Button
                  htmlType="button"
                  variant="outline"
                  leftIcon={<ShoppingOutlined />}
                  onClick={() => setShowFnbMenuModal(true)}
                  disabled={loadingMenu || menuItems.length === 0}
                  className="!w-full !rounded-xl !border-emerald-300 !text-emerald-800 hover:!bg-emerald-50"
                >
                  {loadingMenu ? "Đang tải thực đơn..." : "Chọn món đặt trước"}
                </Button>
                {preOrderItems.length > 0 && (
                  <div className="border-t border-slate-100 pt-2 text-right text-xs font-bold text-emerald-700">
                    Tạm tính: {preOrderTotal.toLocaleString("vi-VN")}đ
                  </div>
                )}
              </div>

              {/* Tóm tắt chi phí */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Bàn đã chọn:</span>
                  <strong className="text-slate-900 font-bold">
                    {selectedTable ? `${selectedTable.name} (${selectedTable.typeName})` : "---"}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Giờ nhận bàn:</span>
                  <span className="font-semibold text-slate-800">
                    {time} ({selectedDateLabel}) • {duration} tiếng
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                  <span className="text-slate-900">Chi phí tạm tính:</span>
                  <span className="text-emerald-700 text-base">
                    {(totalCost + preOrderTotal).toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              {/* Lời nhắc chính sách giữ bàn */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-2xl text-[11px] text-emerald-900 leading-relaxed flex items-start gap-1.5">
                <InfoCircleOutlined className="text-emerald-700 text-xs mt-0.5 shrink-0" />
                <span>
                  <strong>Chính sách giữ bàn:</strong> Quán giữ bàn tối đa <strong>15 phút</strong> sau giờ hẹn ({time}). Bạn chỉ cần đọc số điện thoại khi đến quầy để mở bàn ngay.
                </span>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="w-full !h-12 !text-sm !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white shadow-md shadow-emerald-600/20 !rounded-xl cursor-pointer"
              >
                Xác Nhận Đặt Bàn Ngay
                <RightOutlined className="text-xs ml-1" />
              </Button>
            </form>
          </Card>
        </div>
      </div>

      <CustomerFnbMenuModal
        open={showFnbMenuModal}
        onClose={() => setShowFnbMenuModal(false)}
        items={menuItems}
        loading={loadingMenu}
        selectedQuantities={selectedFnb}
        onQuantityChange={updateFnbQuantity}
        onConfirm={() => setShowFnbMenuModal(false)}
        confirmLabel="Lưu lựa chọn"
      />

      {/* Modal Xác Nhận Thành Công */}
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
            <span className="text-slate-900 font-bold">Đặt Bàn Thành Công!</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 space-y-1.5">
            <div className="text-sm font-bold flex items-center gap-2">
              <CheckCircleOutlined className="text-emerald-600" />
              <span>Yêu cầu giữ bàn đã được xác nhận!</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed mb-0">
              Khi đến quán, quý khách chỉ cần đọc số điện thoại{" "}
              <strong className="font-mono text-emerald-950 font-bold">{phone}</strong>{" "}
              cho nhân viên lễ tân/quầy thu ngân để mở bàn ngay mà không cần xuất trình mã QR.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-2">
              <EnvironmentOutlined className="text-emerald-600" />
              <span>
                <strong>Bàn:</strong>{" "}
                {confirmedBooking?.tableCode
                  ? `${confirmedBooking.tableCode} • ${confirmedBooking.tableName}`
                  : selectedTable
                    ? `${selectedTable.code} • ${selectedTable.name} (${selectedTable.typeName})`
                    : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ClockCircleOutlined className="text-emerald-600" />
              <span>
                <strong>Thời gian hẹn:</strong> {confirmedBooking?.time || time} (
                {confirmedBooking?.date || selectedDateLabel}) • Dự kiến {confirmedBooking?.duration || duration} giờ
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-amber-300/80 text-[11px] text-amber-900 flex items-start gap-1.5">
              <InfoCircleOutlined className="text-amber-600 text-xs mt-0.5 shrink-0" />
              <span>
                <strong>Lưu ý:</strong> Bàn được giữ tối đa <strong>15 phút</strong> sau giờ hẹn. Tiền bàn tính theo số phút thực tế từ lúc nhân viên mở bàn.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PhoneOutlined className="text-emerald-600" />
              <span>
                <strong>SĐT nhận bàn:</strong> {phone}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-emerald-600" />
              <span>
                <strong>Chi phí bàn tạm tính:</strong>{" "}
                {(confirmedBooking?.estimatedCost || totalCost).toLocaleString("vi-VN")} VNĐ
              </span>
            </div>
          </div>
          <p className="text-slate-500">
            Lịch đặt đã được lưu vào hệ thống. Bạn có thể theo dõi hoặc hủy trước giờ chơi ít nhất 2 tiếng tại{" "}
            <Link to="/customer/history" className="font-semibold text-emerald-700">
              Lịch sử & Hóa đơn
            </Link>
            .
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerBooking;
