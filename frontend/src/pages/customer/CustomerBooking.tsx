// =========================================================================================
// 1. IMPORTS — Thư viện UI, Router, Services & Tiện ích Đặt Bàn
// =========================================================================================
import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarOutlined,
  UserOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
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
import { isFnbWarehouseItem } from "../../utils/fnb";

const { Title, Paragraph } = Typography;

// =========================================================================================
// 2. KIỂU DỮ LIỆU (TYPES & INTERFACES)
// =========================================================================================

/**
 * Cấu trúc thông tin mỗi bàn bida hiển thị trên giao diện đặt bàn
 * [LƯU Ý LUỒNG MỚI]:
 * - isAvailable: Cho biết bàn có đang trống trong khung giờ đã chọn hay không.
 * - unavailableReason: "booked" (đã có khách đặt trước) | "playing" (đang có khách chơi tại quán) | null (bàn trống).
 */
interface BookingTableItem {
  id: string;
  code: string;
  name: string;
  area: string;
  type: string;
  typeName: string;
  isVip: boolean;
  isTournament: boolean;
  price: number;
  priceFormatted: string;
  isAvailable: boolean;                          // Bàn có thể đặt hay không
  unavailableReason: "booked" | "playing" | null; // Lý do không thể đặt (đã đặt hoặc đang chơi)
}

/**
 * Thông tin giao dịch thanh toán tiền cọc qua cổng SePay VietQR
 */
interface BookingPaymentInfo {
  reference: string;
  status: "awaiting_payment" | "paid" | "expired" | "cancelled" | "refund_required";
  amount: number;
  deadline: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  qrUrl?: string | null;
}

// =========================================================================================
// 3. HẰNG SỐ & HÀM TIỆN ÍCH (CONSTANTS & HELPERS)
// =========================================================================================
// Danh mục phân loại bàn phục vụ bộ lọc (Filter)
const TABLE_CATEGORIES = [
  { key: "", label: "Tất Cả Loại Bàn" },
  { key: "vip", label: "Bàn VIP" },
  { key: "match", label: "Bàn Thi Đấu" },
  { key: "pool", label: "Bida Lỗ (Pool)" },
  { key: "carom", label: "Bida Carom (Phăng)" },
  { key: "snooker", label: "Bida Snooker" },
];

/**
 * Kiểm tra xem bàn có phải là bàn thi đấu chuẩn giải đấu hay không
 */
function isTournamentTable(table: { area?: string; code?: string }) {
  const area = table.area?.trim().toLowerCase() || "";
  return (
    area.includes("match") ||
    area.includes("thi đấu") ||
    table.code?.toUpperCase().startsWith("MTCH") === true
  );
}

// =========================================================================================
// 4. COMPONENT CHÍNH: TRANG ĐẶT BÀN TRỰC TUYẾN CHO KHÁCH HÀNG
// =========================================================================================
export const CustomerBooking = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preSelectedParam = searchParams.get("table") || "";
  const [now] = useState(() => Date.now());

  // ---------------------------------------------------------------------------------------
  // 4.1 CÁC STATE QUẢN LÝ DỮ LIỆU ĐẶT BÀN & THANH TOÁN CỌC
  // ---------------------------------------------------------------------------------------
  const [tablesList, setTablesList] = useState<BookingTableItem[]>([]); // Danh sách bàn lấy từ API
  const [loadingTables, setLoadingTables] = useState<boolean>(true);   // Trạng thái đang tải danh sách bàn
  const [selectedTableId, setSelectedTableId] = useState<string>(preSelectedParam); // ID bàn khách đang chọn

  // [LUỒNG MỚI]: State lưu bàn không khả dụng mà khách vừa bấm vào -> hiển thị Pop-up thông báo
  const [unavailablePopupTable, setUnavailablePopupTable] = useState<BookingTableItem | null>(null);

  const [tableType, setTableType] = useState<
    "" | "vip" | "match" | "pool" | "carom" | "snooker"
  >(""); // Loại bàn đang lọc
  const [name, setName] = useState<string>(user?.name || "");   // Tên khách hàng
  const [phone, setPhone] = useState<string>(user?.phone || ""); // Số điện thoại liên hệ

  // Tự động điền họ tên & số điện thoại nếu khách đã đăng nhập tài khoản
  useEffect(() => {
    if (user?.name && !name.trim()) setName(user.name);
    if (user?.phone && !phone.trim()) setPhone(user.phone);
  }, [user?.name, user?.phone, name, phone]);

  /**
   * Tạo danh sách 3 ngày cho phép khách đặt bàn (Hôm nay, Ngày mai, Ngày kia).
   *
   * @returns {Array<{ value: string, label: string, rawDate: string }>} Danh sách các lựa chọn ngày
   */
  const dateOptions = useMemo(() => {
    /**
     * Định dạng ngày theo lịch và múi giờ Việt Nam UTC+7.
     *
     * @param {number} daysOffset - Số ngày cộng thêm tính từ ngày hiện tại (0: hôm nay, 1: ngày mai, 2: ngày kia)
     * @returns {{ value: string, label: string, rawDate: string }} Đối tượng thông tin ngày đặt bàn
     */
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

  /**
   * Xác định khung giờ đặt bàn gần nhất với thời điểm hiện tại (cách 0 - 30 phút).
   *
   * @returns {string} Chuỗi giờ dạng HH:mm
   */
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

  /**
   * Tạo danh sách các khung giờ 30 phút trong ngày và tự động lọc bỏ giờ trong quá khứ nếu chọn hôm nay.
   *
   * @returns {Array<{ value: string, label: string }>} Danh sách các slot giờ cho phép đặt bàn
   */
  const timeOptions = useMemo(() => {
    const slots: { value: string; label: string }[] = [];
    const currentH = new Date().getHours();
    const currentM = new Date().getMinutes();

    for (let h = 0; h < 24; h++) {
      for (const m of [0, 30]) {
        const hh = String(h).padStart(2, "0");
        const mm = String(m).padStart(2, "0");
        const val = `${hh}:${mm}`;
        const isPast = isToday && (h < currentH || (h === currentH && currentM >= m));
        if (!isPast) slots.push({ value: val, label: val });
      }
    }
    return slots;
  }, [isToday]);

  // Tự động ghim khung giờ hợp lệ đầu tiên nếu khung giờ đang chọn bị quá hạn
  useEffect(() => {
    const validSlot = timeOptions[0];
    const currentSlotObj = timeOptions.find((slot) => slot.value === time);
    if (!currentSlotObj && validSlot) {
      setTime(validSlot.value);
    }
  }, [timeOptions, time]);

  const [duration, setDuration] = useState<number>(2);                               // Thời lượng chơi (mặc định 2 tiếng)
  const [note, setNote] = useState<string>("");                                       // Ghi chú của khách
  const [loading, setLoading] = useState<boolean>(false);                             // Loading khi bấm nút Đặt bàn
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);           // Modal hiển thị mã QR cọc SePay
  const [availabilityVersion, setAvailabilityVersion] = useState<number>(0);         // Trigger để reload danh sách bàn khi có thay đổi
  const [menuItems, setMenuItems] = useState<ProductMenu[]>([]);                     // Danh sách món F&B
  const [loadingMenu, setLoadingMenu] = useState(true);                              // Loading thực đơn F&B
  const [showFnbMenuModal, setShowFnbMenuModal] = useState(false);                   // Modal chọn món F&B đặt trước
  const [selectedFnb, setSelectedFnb] = useState<Record<string, number>>({});         // Món F&B khách đã chọn kèm số lượng
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);               // Thông tin đơn sau khi đã thanh toán cọc thành công
  const [paymentIntent, setPaymentIntent] = useState<BookingPaymentInfo | null>(null);// Thông tin cọc SePay (mã QR, số tiền, hạn 5 phút)
  const [paymentCheckError, setPaymentCheckError] = useState("");
  const [cancellingPayment, setCancellingPayment] = useState(false);
  const [confirmingCancelPayment, setConfirmingCancelPayment] = useState(false);
  const [countdownNowMs, setCountdownNowMs] = useState<number>(() => Date.now());

  const paymentDeadlineMs =
    paymentIntent?.status === "awaiting_payment" && paymentIntent.deadline
      ? new Date(paymentIntent.deadline).getTime()
      : NaN;
  const paymentSecondsLeft = Number.isFinite(paymentDeadlineMs)
    ? Math.max(0, Math.floor((paymentDeadlineMs - countdownNowMs) / 1000))
    : null;

  // Đồng hồ đếm ngược thời gian giữ chỗ cọc VietQR mỗi giây
  useEffect(() => {
    if (!Number.isFinite(paymentDeadlineMs)) return;
    const immediateTimer = window.setTimeout(() => setCountdownNowMs(Date.now()), 0);
    const interval = window.setInterval(() => setCountdownNowMs(Date.now()), 1000);
    return () => {
      window.clearTimeout(immediateTimer);
      window.clearInterval(interval);
    };
  }, [paymentDeadlineMs]);

  // ---------------------------------------------------------------------------------------
  // EFFECT: Polling kiểm tra trạng thái thanh toán tiền cọc mỗi 3 giây
  // Khi khách quét mã QR VietQR chuyển khoản, SePay nhận tiền -> API trả về status: "paid"
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (!paymentIntent?.reference) return;
    const deadline = new Date(paymentIntent.deadline).getTime();
    const awaitingPayment = paymentIntent.status === "awaiting_payment";
    const checkingLateWebhook =
      paymentIntent.status === "expired" && Number.isFinite(deadline) && Date.now() < deadline + 120_000;
    if (!awaitingPayment && !checkingLateWebhook) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const checkPayment = async () => {
      try {
        const status = await bookingService.getPublicPaymentStatus(paymentIntent.reference);
        if (!active) return;
        setPaymentIntent((current) => (current ? { ...current, ...status } : status));
        if (status.status !== "awaiting_payment") setConfirmingCancelPayment(false);
        setPaymentCheckError("");
        if (status.status === "paid") {
          setConfirmedBooking(status.booking);
          setAvailabilityVersion((version) => version + 1);
          message.success("Đã nhận cọc SePay, bàn đã được giữ thành công.");
        } else if (status.status === "expired" || status.status === "refund_required") {
          setAvailabilityVersion((version) => version + 1);
          const statusDeadline = new Date(status.deadline).getTime();
          if (
            status.status === "expired" &&
            Number.isFinite(statusDeadline) &&
            Date.now() < statusDeadline + 120_000
          ) {
            timer = setTimeout(checkPayment, 3000);
          }
        } else {
          timer = setTimeout(checkPayment, 3000);
        }
      } catch (error) {
        if (!active) return;
        setPaymentCheckError(
          error instanceof Error ? error.message : "Chưa kiểm tra được trạng thái chuyển khoản",
        );
        timer = setTimeout(checkPayment, 5000);
      }
    };

    timer = setTimeout(checkPayment, 3000);
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [paymentIntent?.deadline, paymentIntent?.reference, paymentIntent?.status]);

  // ---------------------------------------------------------------------------------------
  // EFFECT: Tải danh mục thực đơn đồ uống & đồ ăn vặt F&B
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    const loadMenu = () => {
      productService
        .getFnbMenu()
        .then((items) => {
          if (active) {
            setMenuItems(items.filter((item) => !isFnbWarehouseItem(item.name, item.category, item.productType)));
          }
        })
        .catch((error) =>
          message.error(error instanceof Error ? error.message : "Không thể tải thực đơn đồ uống"),
        )
        .finally(() => {
          if (active) setLoadingMenu(false);
        });
    };

    loadMenu();

    const socket = getSocket();
    socket.on("menu:updated", loadMenu);
    socket.on("fnb:updated", loadMenu);

    return () => {
      active = false;
      socket.off("menu:updated", loadMenu);
      socket.off("fnb:updated", loadMenu);
    };
  }, []);

  // ---------------------------------------------------------------------------------------
  // EFFECT: Lắng nghe sự kiện Socket.io thời gian thực
  // Khi có khách khác vừa đặt bàn hoặc nhân viên mở bàn ở quầy POS -> Tự động reload danh sách
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    const socket = getSocket();
    const refreshAvailability = () => setAvailabilityVersion((version) => version + 1);
    socket.on("connect", refreshAvailability);
    socket.on("table:public_status_changed", refreshAvailability);
    socket.on("table:guest_status_changed", refreshAvailability);
    socket.on("table:status_changed", refreshAvailability);
    socket.on("table:status-changed", refreshAvailability);
    socket.on("table:timer_started", refreshAvailability);
    socket.on("booking:created", refreshAvailability);
    socket.on("booking:updated", refreshAvailability);
    socket.on("booking:cancelled", refreshAvailability);
    return () => {
      socket.off("connect", refreshAvailability);
      socket.off("table:public_status_changed", refreshAvailability);
      socket.off("table:guest_status_changed", refreshAvailability);
      socket.off("table:status_changed", refreshAvailability);
      socket.off("table:status-changed", refreshAvailability);
      socket.off("table:timer_started", refreshAvailability);
      socket.off("booking:created", refreshAvailability);
      socket.off("booking:updated", refreshAvailability);
      socket.off("booking:cancelled", refreshAvailability);
    };
  }, []);

  // ---------------------------------------------------------------------------------------
  // EFFECT [TRỌNG TÂM LUỒNG MỚI]: Tải danh sách bàn theo Ngày, Giờ, Thời lượng
  // - Gọi API getAvailableTables: Server trả về TẤT CẢ các bàn kèm cờ `isAvailable` và `unavailableReason`
  // - Ánh xạ dữ liệu: Bàn trống -> isAvailable: true | Bàn bận -> isAvailable: false
  // - Tự động chọn bàn trống đầu tiên nếu bàn trước đó không còn hợp lệ
  // ---------------------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(async () => {
      setLoadingTables(true);
      try {
        const data = await bookingService.getAvailableTables({
          date,
          time,
          duration,
          ...(tableType && tableType !== "vip" && tableType !== "match"
            ? { type: tableType }
            : {}),
        });
        if (isMounted) {
          const mapped: BookingTableItem[] = data
            .filter((table) => {
              if (tableType === "vip") {
                return (
                  table.code?.toUpperCase().startsWith("VIP") ||
                  table.area?.toLowerCase().includes("vip")
                );
              }
              return tableType !== "match" || isTournamentTable(table);
            })
            .map((table) => {
              const isVip =
                table.code?.toUpperCase().startsWith("VIP") ||
                table.area?.toLowerCase().includes("vip");
              const isTournament = isTournamentTable(table);
              const typeName =
                table.type === "carom"
                  ? "Bàn Carom"
                  : table.type === "snooker"
                    ? "Bàn Snooker"
                    : "Bàn Lỗ (Pool)";
              return {
                id: table.id,
                code: table.code,
                name: table.name.split("•")[0].split("-")[0].trim(),
                area: table.area || "",
                type: table.type,
                typeName: isTournament
                  ? `Bàn Thi Đấu · ${typeName}`
                  : isVip
                    ? `Bàn VIP · ${typeName}`
                    : typeName,
                isVip,
                isTournament,
                price: table.pricePerHour,
                priceFormatted: `${table.pricePerHour.toLocaleString("vi-VN")}đ/h`,
                // [LUỒNG MỚI]: Cập nhật trạng thái bàn khả dụng hay không
                isAvailable: table.isAvailable !== false,
                unavailableReason: table.unavailableReason ?? null,
              };
            });
          setTablesList(mapped);
          const preselected = mapped.find(
            (table) => table.id === preSelectedParam || table.code === preSelectedParam,
          );
          setSelectedTableId((current) => {
            const retainedTable = mapped.find(
              (table) => table.id === current || table.code === current,
            );
            // Ưu tiên giữ bàn đang chọn nếu còn trống, nếu không thì chọn bàn trống đầu tiên
            const firstAvailable = mapped.find((table) => table.isAvailable);
            return (retainedTable || preselected || firstAvailable || mapped[0])?.id || "";
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

  // ---------------------------------------------------------------------------------------
  // 4.3 DỮ LIỆU SUY XUẤT & XỬ LÝ SỰ KIỆN (DERIVED STATE & EVENT HANDLERS)
  // ---------------------------------------------------------------------------------------

  // [LUỒNG MỚI]: Bàn được chọn để đặt bắt buộc phải là bàn có `isAvailable: true`
  // Khách bấm vào bàn bận sẽ chỉ hiện pop-up thông báo chứ không gán vào selectedTable
  const selectedTable =
    tablesList.find((t) => (t.id === selectedTableId || t.code === selectedTableId) && t.isAvailable) ||
    tablesList.find((t) => t.isAvailable) ||
    null;

  // Tiền giờ chơi dự kiến = giá theo giờ * số giờ
  const totalCost = selectedTable ? selectedTable.price * duration : 0;

  // Danh sách các món F&B khách đã chọn số lượng > 0
  const preOrderItems = Object.entries(selectedFnb)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

  // Tổng tiền món F&B đặt trước
  const preOrderTotal = preOrderItems.reduce((sum, item) => {
    const product = menuItems.find((menuItem) => menuItem._id === item.productId);
    return sum + (product?.salePrice || 0) * item.quantity;
  }, 0);

  // Tổng tạm tính = Tiền giờ chơi + Tiền F&B
  const estimatedTotal = totalCost + preOrderTotal;

  // Tiền đặt cọc bắt buộc = 50% tổng tạm tính
  const depositEstimate = Math.ceil(estimatedTotal / 2);

  /**
   * Cập nhật số lượng của một món ăn hoặc thức uống trong danh sách đặt trước.
   *
   * @param {string} productId - Mã định danh của món F&B
   * @param {number} delta - Số lượng tăng hoặc giảm (+1 hoặc -1)
   * @returns {void}
   */
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

  /**
   * Xử lý xác thực form và gửi yêu cầu đặt bàn kèm tạo giao dịch cọc SePay.
   *
   * @param {React.FormEvent} e - Sự kiện submit form từ giao diện người dùng
   * @returns {Promise<void>}
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Nếu đang có yêu cầu cọc chờ thanh toán thì mở lại Modal
    if (paymentIntent?.status === "awaiting_payment") {
      setShowSuccessModal(true);
      return;
    }
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
    // [LUỒNG MỚI]: Ngăn chặn việc gửi yêu cầu đặt cho bàn đã có người đặt hoặc đang chơi
    if (!selectedTable.isAvailable) {
      message.warning("Bàn này đã được đặt hoặc đang có khách chơi. Vui lòng chọn bàn trống!");
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
      setPaymentIntent(booking.payment);
      setPaymentCheckError("");
      setConfirmingCancelPayment(false);
      setShowSuccessModal(true); // Mở Modal chuyển khoản QR
      setAvailabilityVersion((version) => version + 1);
      message.info("Vui lòng chuyển khoản tiền cọc trong 5 phút để giữ khung giờ.");
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || err.message || "Không thể đặt bàn, vui lòng thử lại!";
      if (err.response?.status === 409) {
        setAvailabilityVersion((version) => version + 1);
      }
      if (err.response?.data?.code === "FNB_MENU_CHANGED") {
        try {
          const currentMenu = (await productService.getFnbMenu()).filter(
            (item) => !isFnbWarehouseItem(item.name, item.category, item.productType),
          );
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

  /**
   * Xử lý khi khách bấm nút "Hủy yêu cầu đặt cọc" trong Modal
   */
  const handleCancelDeposit = async () => {
    if (!paymentIntent?.reference || paymentIntent.status !== "awaiting_payment") return;
    setCancellingPayment(true);
    try {
      const result = await bookingService.cancelPublicPayment(paymentIntent.reference);
      setPaymentIntent((current) =>
        current ? { ...current, status: result.status } : current,
      );
      setConfirmingCancelPayment(false);
      setAvailabilityVersion((version) => version + 1);
      setPaymentCheckError("");
      if (result.status === "cancelled") {
        message.success("Đã hủy yêu cầu đặt cọc và giải phóng khung giờ.");
      } else {
        message.info("Yêu cầu đặt cọc đã hết hạn, khung giờ không còn được giữ.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Không thể hủy yêu cầu đặt cọc";
      setConfirmingCancelPayment(false);
      setPaymentCheckError(errorMessage);
      message.error(errorMessage);
    } finally {
      setCancellingPayment(false);
    }
  };

  const selectedDateLabel = dateOptions.find((d) => d.value === date)?.label || date;

  // ---------------------------------------------------------------------------------------
  // 4.4 GIAO DIỆN HIỂN THỊ CHÍNH (MAIN RENDER JSX)
  // ---------------------------------------------------------------------------------------
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
                  Không có bàn nào khả dụng cho khung giờ {time} ({selectedDateLabel})
                </div>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Quý khách vui lòng đổi sang khung giờ khác hoặc ngày mai ở form bên phải để xem các bàn còn trống.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {tablesList.map((t) => {
                  const isSelected = t.id === selectedTableId || t.code === selectedTableId;
                  const isUnavailable = !t.isAvailable; // Bàn đã có khách đặt hoặc đang chơi
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        // [LUỒNG MỚI]: Nếu bàn không khả dụng -> Mở Modal thông báo cho khách biết lý do
                        // Nếu bàn còn trống -> Cho phép chọn bàn để đặt
                        if (isUnavailable) {
                          setUnavailablePopupTable(t);
                        } else {
                          setSelectedTableId(t.id);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${isUnavailable
                          ? "bg-slate-50 border-slate-200 opacity-80 hover:border-slate-300" // Kiểu hiển thị mờ cho bàn không khả dụng
                          : isSelected
                            ? "bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/30 shadow-xs" // Kiểu bàn đang được chọn
                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80" // Kiểu bàn trống mặc định
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {t.code}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {t.isVip && (
                              <span className="text-[9px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                                VIP
                              </span>
                            )}
                            {t.isTournament && (
                              <span className="text-[9px] font-black text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                                THI ĐẤU
                              </span>
                            )}
                            {!isUnavailable && isSelected && (
                              <CheckCircleOutlined className="text-emerald-600 text-sm" />
                            )}
                          </span>
                        </div>
                        <span className={`font-black text-sm block ${isSelected && !isUnavailable ? "text-emerald-900" : "text-slate-900"}`}>
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase mt-0.5">
                          {t.typeName}
                        </span>
                        {(t.isVip || t.isTournament) && t.area && (
                          <span className={`text-[10px] font-medium block mt-0.5 ${t.isTournament ? "text-blue-600" : "text-purple-600"
                            }`}>
                            {t.area}
                          </span>
                        )}
                      </div>

                      {/* Hiển thị giá tiền và nhãn trạng thái bàn */}
                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700">{t.priceFormatted}</span>
                        {/* [LUỒNG MỚI]: Phân biệt hiển thị Bàn trống vs Đã được đặt / Đang chơi */}
                        {isUnavailable ? (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.unavailableReason === "playing"
                              ? "text-blue-700 bg-blue-50"
                              : "text-rose-700 bg-rose-50"
                            }`}>
                            {t.unavailableReason === "playing" ? "Đang chơi" : "Đã được đặt"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-semibold">Bàn trống</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* [LUỒNG MỚI]: Chú thích (Legend) để khách hàng dễ phân biệt màu sắc các trạng thái bàn */}
            {!loadingTables && tablesList.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-400" />
                  Bàn trống (có thể đặt)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-rose-50 border border-rose-300" />
                  Đã được đặt trước
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-50 border border-blue-300" />
                  Đang có khách chơi
                </span>
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
                      className={`h-9 rounded-xl border text-xs font-bold transition-all cursor-pointer ${duration === h
                          ? "bg-slate-900 border-slate-900 text-white shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        }`}
                    >
                      {h >= 5 ? "5h" : `${h}h`}
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
                <div className="pt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between text-slate-700">
                    <span>Tổng tạm tính (bàn + món):</span>
                    <strong>{estimatedTotal.toLocaleString("vi-VN")} đ</strong>
                  </div>
                  <div className="flex items-center justify-between font-bold text-sm">
                    <span className="text-slate-900">Cọc trước 50%:</span>
                    <span className="text-emerald-700 text-base">
                      {depositEstimate.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 -mt-2 mb-0">
                Bàn chỉ được xác nhận sau khi SePay ghi nhận đúng số tiền cọc. Yêu cầu chuyển khoản giữ khung giờ trong 5 phút.
              </p>

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
                {paymentIntent?.status === "awaiting_payment"
                  ? "Tiếp Tục Thanh Toán Cọc"
                  : "Tạo Mã QR & Thanh Toán Cọc"}
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

      {/* ================================================================================= */}
      {/* [LUỒNG MỚI]: POP-UP THÔNG BÁO KHI KHÁCH B BẤM VÀO BÀN ĐÃ CÓ NGƯỜI ĐẶT / ĐANG CHƠI */}
      {/* Giúp khách nắm bắt rõ bàn này hiện không thể đặt và hướng dẫn chọn bàn trống khác   */}
      {/* ================================================================================= */}
      <Modal
        open={!!unavailablePopupTable}
        onCancel={() => setUnavailablePopupTable(null)}
        footer={[
          <Button
            key="close"
            variant="primary"
            onClick={() => setUnavailablePopupTable(null)}
            className="!text-xs !bg-slate-800 hover:!bg-slate-900 !border-slate-800 text-white font-bold !rounded-xl"
          >
            Đã hiểu
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            {unavailablePopupTable?.unavailableReason === "playing" ? (
              <ClockCircleOutlined className="text-blue-600 text-lg" />
            ) : (
              <InfoCircleOutlined className="text-rose-600 text-lg" />
            )}
            <span className="text-slate-900 font-bold">
              {unavailablePopupTable?.unavailableReason === "playing"
                ? "Bàn đang có khách chơi"
                : "Bàn đã được đặt trước"}
            </span>
          </Space>
        }
      >
        <div className="space-y-3 py-2 text-xs text-slate-700">
          <div className={`rounded-xl border p-4 space-y-1.5 ${unavailablePopupTable?.unavailableReason === "playing"
              ? "border-blue-200 bg-blue-50 text-blue-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
            }`}>
            <div className="font-bold text-sm">
              {unavailablePopupTable?.name} ({unavailablePopupTable?.code})
            </div>
            <p className="mb-0">
              {unavailablePopupTable?.unavailableReason === "playing"
                ? "Bàn này hiện đang có khách chơi. Vui lòng chọn bàn khác hoặc đặt vào khung giờ sau để được phục vụ."
                : "Bàn này đã được khách khác đặt trước cho khung giờ bạn chọn. Vui lòng chọn một bàn khác hoặc đổi sang khung giờ khác."}
            </p>
          </div>
          <p className="text-slate-500 mb-0">
            Các bàn hiển thị nhãn <strong className="text-emerald-700">Bàn trống</strong> vẫn còn chỗ — hãy chọn một trong số đó để tiếp tục đặt bàn.
          </p>
        </div>
      </Modal>

      {/* ================================================================================= */}
      {/* MODAL THANH TOÁN TIỀN CỌC QUA VIETQR / KẾT QUẢ ĐẶT BÀN                            */}
      {/* Hiển thị mã QR ngân hàng từ cổng SePay trong 5 phút. Tự động kiểm tra trạng thái    */}
      {/* ================================================================================= */}
      <Modal
        open={showSuccessModal}
        onCancel={() => {
          if (paymentIntent?.status !== "awaiting_payment") setShowSuccessModal(false);
        }}
        closable={paymentIntent?.status !== "awaiting_payment"}
        maskClosable={paymentIntent?.status !== "awaiting_payment"}
        footer={
          paymentIntent?.status === "awaiting_payment"
            ? confirmingCancelPayment
              ? [
                <Button
                  key="keep"
                  disabled={cancellingPayment}
                  onClick={() => setConfirmingCancelPayment(false)}
                  className="!text-xs !font-bold !rounded-xl"
                >
                  Quay lại thanh toán
                </Button>,
                <Button
                  key="confirm-cancel"
                  variant="danger"
                  loading={cancellingPayment}
                  onClick={handleCancelDeposit}
                  className="!text-xs !font-bold !rounded-xl"
                >
                  Xác nhận hủy đặt cọc
                </Button>,
              ]
              : [
                <Button
                  key="cancel"
                  variant="danger-outline"
                  onClick={() => setConfirmingCancelPayment(true)}
                  className="!text-xs !font-bold !rounded-xl"
                >
                  Hủy yêu cầu đặt cọc
                </Button>,
                <Button
                  key="wait"
                  variant="primary"
                  disabled
                  className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                >
                  Đang chờ thanh toán...
                </Button>,
              ]
            : [
              <Button
                key="close"
                variant="primary"
                onClick={() => setShowSuccessModal(false)}
                className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
              >
                Đóng
              </Button>,
            ]
        }
        title={
          <Space align="center" size={8}>
            {paymentIntent?.status === "paid" ? (
              <CheckCircleOutlined className="text-emerald-600 text-lg" />
            ) : paymentIntent?.status === "cancelled" ? (
              <CloseCircleOutlined className="text-rose-600 text-lg" />
            ) : (
              <DollarOutlined className="text-emerald-600 text-lg" />
            )}
            <span className="text-slate-900 font-bold">
              {paymentIntent?.status === "paid"
                ? "Đặt Bàn Thành Công!"
                : paymentIntent?.status === "cancelled"
                  ? "Đã Hủy Yêu Cầu Đặt Cọc"
                  : paymentIntent?.status === "awaiting_payment"
                    ? "Thanh Toán Cọc Đặt Bàn"
                    : "Yêu Cầu Đặt Bàn Chưa Hoàn Tất"}
            </span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          {paymentIntent?.status === "awaiting_payment" && confirmingCancelPayment ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 space-y-2">
              <strong>Bạn có chắc muốn hủy yêu cầu đặt cọc này?</strong>
              <p className="mb-0">
                Khung giờ sẽ được giải phóng. Nếu bạn đã chuyển khoản, giao dịch có thể cần nhân viên đối soát hoặc hoàn tiền.
              </p>
            </div>
          ) : paymentIntent?.status === "awaiting_payment" ? (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span>
                  Chuyển đúng <strong>{paymentIntent.amount.toLocaleString("vi-VN")}đ</strong> trong 5 phút. Bàn chỉ được xác nhận khi SePay báo giao dịch thành công.
                </span>
                {paymentSecondsLeft !== null && (
                  <span className="inline-flex items-center gap-1.5 font-mono font-bold text-amber-950 bg-amber-200/70 px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                    <ClockCircleOutlined />
                    {paymentSecondsLeft > 0
                      ? `Còn ${String(Math.floor(paymentSecondsLeft / 60)).padStart(2, "0")}:${String(paymentSecondsLeft % 60).padStart(2, "0")}`
                      : "Đã hết thời gian giữ chỗ"}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {paymentIntent.qrUrl && (
                  <img
                    src={paymentIntent.qrUrl}
                    alt="Mã QR thanh toán cọc đặt bàn SePay"
                    className="w-48 h-48 rounded-xl border border-slate-200 bg-white p-2"
                  />
                )}
                <div className="space-y-2 text-xs">
                  <div>Ngân hàng: <strong>{paymentIntent.bankCode}</strong></div>
                  <div>Số tài khoản: <strong className="font-mono">{paymentIntent.accountNumber}</strong></div>
                  <div>Chủ tài khoản: <strong>{paymentIntent.accountName}</strong></div>
                  <div>Nội dung chuyển khoản: <strong className="font-mono text-emerald-700">{paymentIntent.reference}</strong></div>
                  <div>Số tiền cọc: <strong className="text-emerald-700">{paymentIntent.amount.toLocaleString("vi-VN")}đ</strong></div>
                </div>
              </div>
              {paymentCheckError && (
                <p className="text-amber-700 mb-0">
                  {paymentCheckError} — hệ thống sẽ tiếp tục kiểm tra tự động.
                </p>
              )}
              <p className="text-slate-500 mb-0">Đang chờ SePay xác nhận giao dịch…</p>
            </>
          ) : paymentIntent?.status === "paid" ? (
            <>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1.5">
                <div className="text-sm font-bold flex items-center gap-2">
                  <CheckCircleOutlined className="text-emerald-600" />
                  Đã nhận cọc và giữ bàn thành công.
                </div>
                <p className="mb-0">
                  Khi đến quán, vui lòng đọc số điện thoại{" "}
                  <strong className="font-mono">{confirmedBooking?.phone || phone}</strong>{" "}
                  cho nhân viên để nhận bàn.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2">
                  <EnvironmentOutlined className="text-emerald-600" />
                  <span><strong>Bàn:</strong> {confirmedBooking?.tableCode} • {confirmedBooking?.tableName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockCircleOutlined className="text-emerald-600" />
                  <span>
                    <strong>Thời gian hẹn:</strong> {confirmedBooking?.time} ({confirmedBooking?.date}) • Dự kiến {confirmedBooking?.duration} giờ
                  </span>
                </div>
                <div><strong>Tiền cọc đã thanh toán:</strong> {confirmedBooking?.deposit?.toLocaleString("vi-VN")} VNĐ</div>
              </div>
              <p className="text-slate-500">
                Bạn có thể theo dõi lịch đặt tại{" "}
                <Link to="/customer/history" className="font-semibold text-emerald-700">
                  Lịch sử & Hóa đơn
                </Link>.
              </p>
            </>
          ) : paymentIntent?.status === "cancelled" ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800 space-y-2">
              <strong>Yêu cầu đặt cọc đã được hủy.</strong>
              <p className="mb-0">
                Khung giờ không còn được giữ. Nếu muốn đặt lại, hãy đóng cửa sổ này và tạo yêu cầu mới.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 space-y-2">
              <strong>
                {paymentIntent?.status === "expired"
                  ? "Đã hết 5 phút thanh toán; khung giờ không còn được giữ. Nếu bạn đã chuyển trước hạn, vui lòng liên hệ nhân viên để đối soát."
                  : "Giao dịch chưa thể tự động xác nhận hoặc cần hoàn tiền."}
              </strong>
              <p className="mb-0">
                Nếu bạn đã chuyển khoản, vui lòng liên hệ nhân viên CueZone và cung cấp mã{" "}
                <strong className="font-mono">{paymentIntent?.reference}</strong> để được đối soát.
              </p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default CustomerBooking;
