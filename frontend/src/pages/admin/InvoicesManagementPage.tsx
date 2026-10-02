import React, { useState, useEffect, useMemo } from "react";
import {
  FileTextOutlined,
  PrinterOutlined,
  QrcodeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Input,
  Select,
  SegmentedPillList,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InvoiceItemOrder {
  id: string;
  name: string;
  category: "table_time" | "coffee" | "tea" | "juice" | "beer" | "food" | "snack" | "equipment";
  quantity: number;
  unit: string;
  price: number;
  subtotal: number;
}

export interface ClubInvoice {
  id: string;
  code: string;
  tableName: string;
  tableCode: string;
  customerName: string;
  customerPhone: string;
  memberRank: "Diamond" | "Gold" | "Silver" | "Normal";
  discountPercent: number; // e.g. 15 for Diamond, 10 for Gold
  cashierName: string;
  timeIn: string;
  timeOut: string;
  durationText: string;
  durationMinutes: number;
  tableFee: number;
  fnbFee: number;
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  paymentMethod: "vietqr" | "cash" | "cuezone_pay" | "card" | "pending";
  paymentMethodText: string;
  status: "paid" | "pending" | "cancelled";
  statusText: string;
  date: string;
  items: InvoiceItemOrder[];
  note?: string;
}

// ── Mock Initial Invoices ─────────────────────────────────────────────────────

const INITIAL_INVOICES: ClubInvoice[] = [
  {
    id: "inv-01",
    code: "HD-2026-0891",
    tableName: "Bàn 01 (Bàn Thường 9FT)",
    tableCode: "T01",
    customerName: "Nguyễn Hải Long",
    customerPhone: "0908 112 334",
    memberRank: "Gold",
    discountPercent: 10,
    cashierName: "Trần Đình Trọng (Ca Sáng)",
    timeIn: "10:15",
    timeOut: "12:45",
    durationText: "2 giờ 30 phút",
    durationMinutes: 150,
    tableFee: 125000,
    fnbFee: 135000,
    subtotal: 260000,
    discountAmount: 26000,
    finalTotal: 234000,
    paymentMethod: "vietqr",
    paymentMethodText: "VietQR Ngân Hàng",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm nay, 12:48",
    items: [
      {
        id: "it-1",
        name: "Giờ chơi Bàn Thường 9FT (150 phút)",
        category: "table_time",
        quantity: 2.5,
        unit: "Giờ",
        price: 50000,
        subtotal: 125000,
      },
      {
        id: "it-2",
        name: "Cà Phê Muối CueZone Signature",
        category: "coffee",
        quantity: 2,
        unit: "Ly",
        price: 35000,
        subtotal: 70000,
      },
      {
        id: "it-3",
        name: "Bò Khô Cháy Tỏi Chanh Ớt",
        category: "snack",
        quantity: 1,
        unit: "Hũ",
        price: 65000,
        subtotal: 65000,
      },
    ],
    note: "Khách quen CLB, mượn cơ Predator",
  },
  {
    id: "inv-02",
    code: "HD-2026-0892",
    tableName: "Bàn Match 13 (K-Steel VAR)",
    tableCode: "M13",
    customerName: "Trọng tài Bùi Quốc Bảo (Giải Bank Pool)",
    customerPhone: "0934 998 811",
    memberRank: "Normal",
    discountPercent: 0,
    cashierName: "Nguyễn Hải Long",
    timeIn: "10:30",
    timeOut: "13:15",
    durationText: "2 giờ 45 phút",
    durationMinutes: 165,
    tableFee: 220000,
    fnbFee: 766000,
    subtotal: 986000,
    discountAmount: 0,
    finalTotal: 986000,
    paymentMethod: "card",
    paymentMethodText: "Thẻ Visa / Master",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm nay, 13:20",
    items: [
      {
        id: "it-4",
        name: "Giờ chơi Bàn Match K-Steel VAR (165 phút)",
        category: "table_time",
        quantity: 2.75,
        unit: "Giờ",
        price: 80000,
        subtotal: 220000,
      },
      {
        id: "it-5",
        name: "Nước Ép Bưởi Hồng Ép Lạnh",
        category: "juice",
        quantity: 2,
        unit: "Ly",
        price: 45000,
        subtotal: 90000,
      },
      {
        id: "it-6",
        name: "Trà Đào Cam Sả Tươi",
        category: "tea",
        quantity: 2,
        unit: "Ly",
        price: 38000,
        subtotal: 76000,
      },
      {
        id: "it-7",
        name: "Lơ Bida Kamui Roku Xanh Chuẩn Giải",
        category: "equipment",
        quantity: 1,
        unit: "Cục",
        price: 600000,
        subtotal: 600000,
      },
    ],
    note: "Bàn đấu bán kết Q3 - Có camera VAR ghi hình",
  },
  {
    id: "inv-03",
    code: "HD-2026-0893",
    tableName: "Bàn VIP 10 (Bank Pool VIP)",
    tableCode: "VIP10",
    customerName: "Hoàng Minh Trí",
    customerPhone: "0933 123 456",
    memberRank: "Diamond",
    discountPercent: 15,
    cashierName: "Lê Văn Hùng (Ca Chiều)",
    timeIn: "11:00",
    timeOut: "14:00",
    durationText: "3 giờ 00 phút",
    durationMinutes: 180,
    tableFee: 210000,
    fnbFee: 425000,
    subtotal: 635000,
    discountAmount: 95250,
    finalTotal: 539750,
    paymentMethod: "cuezone_pay",
    paymentMethodText: "Ví CueZone Pay",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm nay, 14:05",
    items: [
      {
        id: "it-8",
        name: "Giờ chơi Bàn VIP Bank Pool (180 phút)",
        category: "table_time",
        quantity: 3,
        unit: "Giờ",
        price: 70000,
        subtotal: 210000,
      },
      {
        id: "it-9",
        name: "Bia Heineken Silver Lon 330ml",
        category: "beer",
        quantity: 6,
        unit: "Lon",
        price: 35000,
        subtotal: 210000,
      },
      {
        id: "it-10",
        name: "Cơm Chiên Hải Sản Hoàng Gia",
        category: "food",
        quantity: 2,
        unit: "Dĩa",
        price: 75000,
        subtotal: 150000,
      },
      {
        id: "it-11",
        name: "Bò Khô Cháy Tỏi Chanh Ớt",
        category: "snack",
        quantity: 1,
        unit: "Hũ",
        price: 65000,
        subtotal: 65000,
      },
    ],
    note: "Hội viên Diamond, trừ trực tiếp số dư ví CLB",
  },
  {
    id: "inv-04",
    code: "HD-2026-0894",
    tableName: "Bàn 04 (Bàn Thường 9FT)",
    tableCode: "T04",
    customerName: "Vũ Minh Quân",
    customerPhone: "0988 776 554",
    memberRank: "Normal",
    discountPercent: 0,
    cashierName: "Trần Đình Trọng",
    timeIn: "12:00",
    timeOut: "13:40",
    durationText: "1 giờ 40 phút",
    durationMinutes: 100,
    tableFee: 85000,
    fnbFee: 76000,
    subtotal: 161000,
    discountAmount: 0,
    finalTotal: 161000,
    paymentMethod: "cash",
    paymentMethodText: "Tiền Mặt",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm nay, 13:42",
    items: [
      {
        id: "it-12",
        name: "Giờ chơi Bàn Thường 9FT (100 phút)",
        category: "table_time",
        quantity: 1.67,
        unit: "Giờ",
        price: 50000,
        subtotal: 85000,
      },
      {
        id: "it-13",
        name: "Trà Đào Cam Sả Tươi",
        category: "tea",
        quantity: 2,
        unit: "Ly",
        price: 38000,
        subtotal: 76000,
      },
    ],
  },
  {
    id: "inv-05",
    code: "HD-2026-0895",
    tableName: "Bàn 06 (Bàn Thường 9FT)",
    tableCode: "T06",
    customerName: "Phan Hải Đăng",
    customerPhone: "0912 345 678",
    memberRank: "Silver",
    discountPercent: 5,
    cashierName: "Nguyễn Hải Long",
    timeIn: "13:10",
    timeOut: "Đang chơi...",
    durationText: "Khoảng 50 phút",
    durationMinutes: 50,
    tableFee: 42000,
    fnbFee: 131000,
    subtotal: 173000,
    discountAmount: 8650,
    finalTotal: 164350,
    paymentMethod: "pending",
    paymentMethodText: "Chờ Thanh Toán",
    status: "pending",
    statusText: "Đang Mở Bàn",
    date: "Hôm nay, 13:10",
    items: [
      {
        id: "it-14",
        name: "Giờ chơi Bàn Thường 9FT (Tạm tính 50p)",
        category: "table_time",
        quantity: 0.83,
        unit: "Giờ",
        price: 50000,
        subtotal: 42000,
      },
      {
        id: "it-15",
        name: "Cà Phê Muối CueZone Signature",
        category: "coffee",
        quantity: 1,
        unit: "Ly",
        price: 35000,
        subtotal: 35000,
      },
      {
        id: "it-16",
        name: "Bia Corona Extra Chai 355ml",
        category: "beer",
        quantity: 2,
        unit: "Chai",
        price: 48000,
        subtotal: 96000,
      },
    ],
    note: "Khách đang chơi, chưa chốt giờ",
  },
  {
    id: "inv-06",
    code: "HD-2026-0896",
    tableName: "Bàn 08 (Bàn Thường 9FT)",
    tableCode: "T08",
    customerName: "Khách hủy bàn sớm",
    customerPhone: "0900 000 000",
    memberRank: "Normal",
    discountPercent: 0,
    cashierName: "Trần Đình Trọng",
    timeIn: "09:00",
    timeOut: "09:10",
    durationText: "10 phút",
    durationMinutes: 10,
    tableFee: 0,
    fnbFee: 0,
    subtotal: 0,
    discountAmount: 0,
    finalTotal: 0,
    paymentMethod: "pending",
    paymentMethodText: "Không phát sinh",
    status: "cancelled",
    statusText: "Đã Hủy",
    date: "Hôm nay, 09:15",
    items: [],
    note: "Khách bận đột xuất rời đi sau 10p, miễn phí tiền giờ",
  },
  {
    id: "inv-07",
    code: "HD-2026-0885",
    tableName: "Bàn Match 14 (K-Steel VAR)",
    tableCode: "M14",
    customerName: "Trần Đình Trọng (Cơ Thủ ELO 1750)",
    customerPhone: "0901 223 344",
    memberRank: "Gold",
    discountPercent: 10,
    cashierName: "Lê Văn Hùng",
    timeIn: "19:00",
    timeOut: "22:30",
    durationText: "3 giờ 30 phút",
    durationMinutes: 210,
    tableFee: 280000,
    fnbFee: 740000,
    subtotal: 1020000,
    discountAmount: 102000,
    finalTotal: 918000,
    paymentMethod: "vietqr",
    paymentMethodText: "VietQR Ngân Hàng",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm qua, 22:35",
    items: [
      {
        id: "it-17",
        name: "Giờ chơi Bàn Match K-Steel VAR (210 phút)",
        category: "table_time",
        quantity: 3.5,
        unit: "Giờ",
        price: 80000,
        subtotal: 280000,
      },
      {
        id: "it-18",
        name: "Bia Heineken Silver Lon 330ml",
        category: "beer",
        quantity: 8,
        unit: "Lon",
        price: 35000,
        subtotal: 280000,
      },
      {
        id: "it-19",
        name: "Mì Xào Bò Trứng Ốp La",
        category: "food",
        quantity: 2,
        unit: "Dĩa",
        price: 55000,
        subtotal: 110000,
      },
      {
        id: "it-20",
        name: "Bao Tay Bida Predator Special Edition",
        category: "equipment",
        quantity: 1,
        unit: "Chiếc",
        price: 350000,
        subtotal: 350000,
      },
    ],
  },
  {
    id: "inv-08",
    code: "HD-2026-0884",
    tableName: "Bàn 03 (Bàn Thường 9FT)",
    tableCode: "T03",
    customerName: "Đỗ Tuấn Kiệt",
    customerPhone: "0945 678 901",
    memberRank: "Silver",
    discountPercent: 5,
    cashierName: "Nguyễn Hải Long",
    timeIn: "20:00",
    timeOut: "22:00",
    durationText: "2 giờ 00 phút",
    durationMinutes: 120,
    tableFee: 100000,
    fnbFee: 121000,
    subtotal: 221000,
    discountAmount: 11050,
    finalTotal: 209950,
    paymentMethod: "cash",
    paymentMethodText: "Tiền Mặt",
    status: "paid",
    statusText: "Đã Thanh Toán",
    date: "Hôm qua, 22:05",
    items: [
      {
        id: "it-21",
        name: "Giờ chơi Bàn Thường 9FT (120 phút)",
        category: "table_time",
        quantity: 2,
        unit: "Giờ",
        price: 50000,
        subtotal: 100000,
      },
      {
        id: "it-22",
        name: "Trà Đào Cam Sả Tươi",
        category: "tea",
        quantity: 2,
        unit: "Ly",
        price: 38000,
        subtotal: 76000,
      },
      {
        id: "it-23",
        name: "Nước Ép Bưởi Hồng Ép Lạnh",
        category: "juice",
        quantity: 1,
        unit: "Ly",
        price: 45000,
        subtotal: 45000,
      },
    ],
  },
];

export const InvoicesManagementPage: React.FC = () => {
  // ── 1. STATE ──────────────────────────────────────────────────────────────
  const [invoicesList, setInvoicesList] = useState<ClubInvoice[]>(() => {
    const saved = localStorage.getItem("cuezone_admin_invoices");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_INVOICES;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_admin_invoices", JSON.stringify(invoicesList));
  }, [invoicesList]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Invoice Detail Modal & Print Preview
  const [selectedInvoice, setSelectedInvoice] = useState<ClubInvoice | null>(null);

  // Quick Checkout / Create Invoice Modal
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({
    tableName: "Bàn 02 (Bàn Thường 9FT)",
    customerName: "",
    customerPhone: "",
    durationHours: 2,
    tableHourlyRate: 50000,
    fnbTotal: 70000,
    paymentMethod: "vietqr" as ClubInvoice["paymentMethod"],
    memberRank: "Normal" as ClubInvoice["memberRank"],
    note: "",
  });

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────
  const handlePrintBill = () => {
    message.success("Đang gửi lệnh in phiếu hóa đơn ra máy in nhiệt tại quầy...");
  };

  const handleQuickCheckout = () => {
    if (!newInvoiceForm.customerName.trim()) {
      message.warning("Vui lòng nhập tên khách hàng!");
      return;
    }

    const tableFee = Math.round(newInvoiceForm.durationHours * newInvoiceForm.tableHourlyRate);
    const fnbFee = Number(newInvoiceForm.fnbTotal) || 0;
    const subtotal = tableFee + fnbFee;
    const discountRate =
      newInvoiceForm.memberRank === "Diamond"
        ? 0.15
        : newInvoiceForm.memberRank === "Gold"
        ? 0.1
        : newInvoiceForm.memberRank === "Silver"
        ? 0.05
        : 0;
    const discountAmount = Math.round(subtotal * discountRate);
    const finalTotal = subtotal - discountAmount;

    const methodMap: Record<string, string> = {
      vietqr: "VietQR Ngân Hàng",
      cash: "Tiền Mặt",
      cuezone_pay: "Ví CueZone Pay",
      card: "Thẻ Visa / Master",
    };

    const newCode = `HD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const created: ClubInvoice = {
      id: `inv-${Date.now()}`,
      code: newCode,
      tableName: newInvoiceForm.tableName,
      tableCode: newInvoiceForm.tableName.split(" ")[1] || "TB",
      customerName: newInvoiceForm.customerName.trim(),
      customerPhone: newInvoiceForm.customerPhone.trim() || "0900 000 000",
      memberRank: newInvoiceForm.memberRank,
      discountPercent: discountRate * 100,
      cashierName: "Trần Đình Trọng (Ca Sáng)",
      timeIn: "11:30",
      timeOut: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      durationText: `${newInvoiceForm.durationHours} giờ 00 phút`,
      durationMinutes: newInvoiceForm.durationHours * 60,
      tableFee,
      fnbFee,
      subtotal,
      discountAmount,
      finalTotal,
      paymentMethod: newInvoiceForm.paymentMethod,
      paymentMethodText: methodMap[newInvoiceForm.paymentMethod] || "Tiền Mặt",
      status: "paid",
      statusText: "Đã Thanh Toán",
      date: `Hôm nay, ${new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      items: [
        {
          id: `it-${Date.now()}-1`,
          name: `Giờ chơi ${newInvoiceForm.tableName} (${newInvoiceForm.durationHours}h)`,
          category: "table_time",
          quantity: newInvoiceForm.durationHours,
          unit: "Giờ",
          price: newInvoiceForm.tableHourlyRate,
          subtotal: tableFee,
        },
        ...(fnbFee > 0
          ? [
              {
                id: `it-${Date.now()}-2`,
                name: "Đồ uống & Món ăn phục vụ tại bàn",
                category: "coffee" as const,
                quantity: 1,
                unit: "Phần",
                price: fnbFee,
                subtotal: fnbFee,
              },
            ]
          : []),
      ],
      note: newInvoiceForm.note,
    };

    setInvoicesList((prev) => [created, ...prev]);
    message.success(`Đã thanh toán và lập hóa đơn ${created.code} thành công!`);
    setCreateModalVisible(false);
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem("cuezone_admin_invoices");
    setInvoicesList(INITIAL_INVOICES);
    message.success("Đã khôi phục danh sách hóa đơn về mặc định!");
  };

  // ── 3. FILTER & METRICS ───────────────────────────────────────────────────
  const filteredInvoices = useMemo(() => {
    return invoicesList.filter((inv) => {
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      const matchMethod = methodFilter === "all" || inv.paymentMethod === methodFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        inv.code.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.toLowerCase().includes(q) ||
        inv.tableName.toLowerCase().includes(q);

      return matchStatus && matchMethod && matchQuery;
    });
  }, [invoicesList, statusFilter, methodFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalCount = invoicesList.length;
    const paidList = invoicesList.filter((i) => i.status === "paid");
    const totalRevenue = paidList.reduce((acc, cur) => acc + cur.finalTotal, 0);
    const totalTableFee = paidList.reduce((acc, cur) => acc + cur.tableFee, 0);
    const totalFnbFee = paidList.reduce((acc, cur) => acc + cur.fnbFee, 0);
    const pendingCount = invoicesList.filter((i) => i.status === "pending").length;

    return {
      totalCount,
      paidCount: paidList.length,
      totalRevenue,
      totalTableFee,
      totalFnbFee,
      pendingCount,
    };
  }, [invoicesList]);

  // Pill filter items
  const statusPills = [
    { key: "all", label: "Tất cả hóa đơn", badge: invoicesList.length },
    {
      key: "paid",
      label: "Đã thanh toán",
      badge: invoicesList.filter((i) => i.status === "paid").length,
    },
    {
      key: "pending",
      label: "Đang mở bàn (Chờ chốt)",
      badge: invoicesList.filter((i) => i.status === "pending").length,
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      badge: invoicesList.filter((i) => i.status === "cancelled").length,
    },
  ];

  // Table Columns
  const columns: TableColumnsType<ClubInvoice> = [
    {
      title: "Mã Hóa Đơn",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (code: string) => (
        <span className="font-mono font-black text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          {code}
        </span>
      ),
    },
    {
      title: "Bàn & Khách Hàng",
      key: "table_customer",
      render: (_: unknown, record: ClubInvoice) => (
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-slate-900 text-sm">{record.tableName}</span>
            {record.memberRank !== "Normal" && (
              <Tag
                color={
                  record.memberRank === "Diamond"
                    ? "purple"
                    : record.memberRank === "Gold"
                    ? "gold"
                    : "blue"
                }
                className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold"
              >
                {record.memberRank} (-{record.discountPercent}%)
              </Tag>
            )}
          </div>
          <span className="text-xs text-slate-500">
            {record.customerName} • {record.customerPhone}
          </span>
        </div>
      ),
    },
    {
      title: "Thời Gian",
      key: "time",
      width: 150,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">{record.durationText}</span>
          <span className="text-[11px] text-slate-400">
            {record.timeIn} - {record.timeOut}
          </span>
        </div>
      ),
    },
    {
      title: "Tiền Giờ / F&B",
      key: "breakdown",
      width: 150,
      render: (_: unknown, record: ClubInvoice) => (
        <div className="text-xs font-mono">
          <div className="text-slate-600">
            Bàn: <strong>{record.tableFee.toLocaleString("vi-VN")}đ</strong>
          </div>
          <div className="text-emerald-700">
            F&B: <strong>{record.fnbFee.toLocaleString("vi-VN")}đ</strong>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng Thanh Toán",
      dataIndex: "finalTotal",
      key: "finalTotal",
      width: 150,
      render: (total: number, record: ClubInvoice) => (
        <div>
          <span className="font-black text-emerald-800 text-base font-mono block">
            {total.toLocaleString("vi-VN")}đ
          </span>
          <span className="text-[11px] text-slate-400">
            {record.paymentMethodText}
          </span>
        </div>
      ),
    },
    {
      title: "Trạng Thái",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (status: string) => {
        if (status === "paid") {
          return (
            <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
              <CheckCircleOutlined /> ĐÃ XONG
            </Tag>
          );
        }
        if (status === "pending") {
          return (
            <Tag color="warning" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
              <SyncOutlined spin /> ĐANG CHƠI
            </Tag>
          );
        }
        return (
          <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold inline-flex items-center gap-1">
            <CloseCircleOutlined /> ĐÃ HỦY
          </Tag>
        );
      },
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 120,
      align: "right",
      render: (_: unknown, record: ClubInvoice) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedInvoice(record)}
          leftIcon={<EyeOutlined />}
          className="!rounded-xl !text-xs !h-8 !border-slate-300 !text-slate-700 hover:!bg-emerald-50 hover:!text-emerald-700 hover:!border-emerald-300 font-bold"
        >
          Xem Bill
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── COMMAND HEADER & SUMMARY METRICS ──────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <FileTextOutlined className="text-xl" />
              </div>
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Quản Lý Hóa Đơn & Thu Ngân Bida
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE BILLING DESK
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Quản lý danh sách hóa đơn thanh toán bàn bida, dịch vụ F&B, tích hợp in phiếu bill nhiệt, quét mã VietQR và chiết khấu thành viên CLB.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetToDefaults}
              className="!rounded-xl !text-xs !text-slate-600"
            >
              Mặc định
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Thanh Toán Bàn Mới
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Doanh thu đã thu
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <DollarOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight truncate">
                {metrics.totalRevenue.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Hóa đơn hoàn tất
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <CheckCircleOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                {metrics.paidCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700">chứng từ</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Đang chơi (Chưa thanh toán)
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <SyncOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-amber-800 tracking-tight">
                {metrics.pendingCount}
              </span>
              <span className="text-xs font-semibold text-amber-700">bàn mở</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Doanh số F&B gọi kèm
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <ThunderboltOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-blue-800 tracking-tight truncate">
                {metrics.totalFnbFee.toLocaleString("vi-VN")}đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FILTER TOOLBAR ────────────────────────────────────────────────── */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        {/* Status Pills */}
        <div className="overflow-x-auto pb-1">
          <SegmentedPillList
            items={statusPills}
            activeKey={statusFilter}
            onSelect={(key) => setStatusFilter(key)}
          />
        </div>

        {/* Second Row: Payment Method, Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <FilterOutlined /> Hình thức:
            </span>
            <Select
              value={methodFilter}
              onChange={(val) => setMethodFilter(val)}
              className="!w-48 !rounded-xl !text-xs"
              options={[
                { value: "all", label: "Tất cả hình thức" },
                { value: "vietqr", label: "VietQR Ngân Hàng" },
                { value: "cash", label: "Tiền Mặt" },
                { value: "cuezone_pay", label: "Ví CueZone Pay" },
                { value: "card", label: "Thẻ Visa / Master" },
              ]}
            />
          </div>

          <div className="w-full sm:w-72">
            <Input
              placeholder="Tìm mã HD, khách hàng, số bàn..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              className="!rounded-xl !h-10 text-xs"
            />
          </div>
        </div>
      </div>

      {/* ── INVOICES TABLE ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <Table<ClubInvoice>
          columns={columns}
          dataSource={filteredInvoices}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total, range) =>
              `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} hóa đơn`,
            className: "!px-4 !py-3",
          }}
        />
      </div>

      {/* ── MODAL: CHI TIẾT & IN PHIẾU HÓA ĐƠN (PRINT BILL PREVIEW) ─────────── */}
      <Modal
        open={Boolean(selectedInvoice)}
        onCancel={() => setSelectedInvoice(null)}
        footer={null}
        width={540}
        title={
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileTextOutlined className="text-emerald-600 text-lg" />
              <span className="font-black text-slate-900 text-base">
                Phiếu Thanh Toán Bida
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<PrinterOutlined />}
              onClick={handlePrintBill}
              className="!rounded-xl !text-xs !border-slate-300 font-bold"
            >
              In Bill Nhiệt
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div className="py-4 space-y-4 text-xs font-sans">
            {/* Bill Receipt Card */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5 text-slate-800">
              {/* Receipt Header */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <span className="font-black text-base tracking-widest text-slate-900 block">
                  CUEZONE BILLIARDS CLUB
                </span>
                <span className="text-[11px] text-slate-500 block">
                  246 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Hotline: 0909 888 999 • Wifi: CueZone_VIP (Pass: 88888888)
                </span>
              </div>

              {/* Meta information */}
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div>
                  Mã HD: <strong className="font-mono">{selectedInvoice.code}</strong>
                </div>
                <div className="text-right">
                  Ngày: <strong>{selectedInvoice.date}</strong>
                </div>
                <div>
                  Khu vực: <strong className="text-emerald-800">{selectedInvoice.tableName}</strong>
                </div>
                <div className="text-right">
                  Thu ngân: <strong>{selectedInvoice.cashierName}</strong>
                </div>
                <div>
                  Khách hàng: <strong>{selectedInvoice.customerName}</strong>
                </div>
                <div className="text-right">
                  Hạng thẻ:{" "}
                  <strong className="text-purple-700">
                    {selectedInvoice.memberRank}
                  </strong>
                </div>
                <div>
                  Giờ vào: <strong>{selectedInvoice.timeIn}</strong>
                </div>
                <div className="text-right">
                  Giờ ra: <strong>{selectedInvoice.timeOut}</strong>
                </div>
              </div>

              {/* Table of items */}
              <div className="pt-2 border-t border-dashed border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-300 text-slate-500 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-1.5">Tên Dịch Vụ</th>
                      <th className="py-1.5 text-center">SL</th>
                      <th className="py-1.5 text-right">Đơn Giá</th>
                      <th className="py-1.5 text-right">Thành Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedInvoice.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2 text-center">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2 text-right font-mono">
                          {item.price.toLocaleString("vi-VN")}đ
                        </td>
                        <td className="py-2 text-right font-mono font-bold">
                          {item.subtotal.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-3 border-t border-slate-300 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Tiền giờ bàn:</span>
                  <span className="font-mono">{selectedInvoice.tableFee.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Dịch vụ F&B & Đồ uống:</span>
                  <span className="font-mono">{selectedInvoice.fnbFee.toLocaleString("vi-VN")}đ</span>
                </div>
                <div className="flex justify-between">
                  <span>Tạm tính (Subtotal):</span>
                  <span className="font-mono font-bold">{selectedInvoice.subtotal.toLocaleString("vi-VN")}đ</span>
                </div>

                {selectedInvoice.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Ưu đãi hội viên ({selectedInvoice.discountPercent}%):</span>
                    <span className="font-mono">-{selectedInvoice.discountAmount.toLocaleString("vi-VN")}đ</span>
                  </div>
                )}

                <div className="flex justify-between text-base font-black text-slate-900 pt-2 border-t border-dashed border-slate-300">
                  <span>TỔNG CỘNG:</span>
                  <span className="font-mono text-emerald-700">
                    {selectedInvoice.finalTotal.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-500 pt-1">
                  <span>Hình thức thanh toán:</span>
                  <strong>{selectedInvoice.paymentMethodText}</strong>
                </div>
              </div>

              {/* VietQR Box preview */}
              <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-[11px] font-bold text-slate-700">
                  <QrcodeOutlined /> Thanh toán VietQR NAPAS 24/7
                </div>
                <div className="text-[11px] text-slate-400 italic">
                  Xin cảm ơn Quý khách & Hẹn gặp lại tại CueZone!
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setSelectedInvoice(null)}
                className="!rounded-xl !text-xs"
              >
                Đóng
              </Button>
              <Button
                variant="primary"
                size="md"
                leftIcon={<PrinterOutlined />}
                onClick={handlePrintBill}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold text-xs px-6"
              >
                In Hóa Đơn
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL: THANH TOÁN BÀN MỚI ──────────────────────────────────────── */}
      <Modal
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={580}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <PlusOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Lập Hóa Đơn & Chốt Bàn Thanh Toán
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn bàn thanh toán:
            </label>
            <Select
              value={newInvoiceForm.tableName}
              onChange={(val) => {
                const isMatch = val.includes("Match");
                const isVIP = val.includes("VIP");
                const rate = isMatch ? 80000 : isVIP ? 70000 : 50000;
                setNewInvoiceForm((prev) => ({
                  ...prev,
                  tableName: val,
                  tableHourlyRate: rate,
                }));
              }}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "Bàn 01 (Bàn Thường 9FT)", label: "Bàn 01 (Bàn Thường 9FT - 50k/h)" },
                { value: "Bàn 02 (Bàn Thường 9FT)", label: "Bàn 02 (Bàn Thường 9FT - 50k/h)" },
                { value: "Bàn VIP 10 (Bank Pool VIP)", label: "Bàn VIP 10 (Bank Pool - 70k/h)" },
                { value: "Bàn Match 13 (K-Steel VAR)", label: "Bàn Match 13 (K-Steel VAR - 80k/h)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tên khách hàng: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Hoàng Minh Trí"
                value={newInvoiceForm.customerName}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    customerName: e.target.value,
                  }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại:
              </label>
              <Input
                placeholder="0908..."
                value={newInvoiceForm.customerPhone}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    customerPhone: e.target.value,
                  }))
                }
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Thời lượng chơi (Giờ):
              </label>
              <Input
                type="number"
                value={newInvoiceForm.durationHours}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    durationHours: parseFloat(e.target.value) || 1,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hạng thẻ thành viên:
              </label>
              <Select
                value={newInvoiceForm.memberRank}
                onChange={(val) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    memberRank: val as ClubInvoice["memberRank"],
                  }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "Normal", label: "Khách thường (0%)" },
                  { value: "Silver", label: "Silver Member (-5%)" },
                  { value: "Gold", label: "Gold Member (-10%)" },
                  { value: "Diamond", label: "Diamond VIP (-15%)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tiền đồ uống F&B gọi kèm (VNĐ):
              </label>
              <Input
                type="number"
                value={newInvoiceForm.fnbTotal}
                onChange={(e) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    fnbTotal: parseInt(e.target.value) || 0,
                  }))
                }
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phương thức thanh toán:
              </label>
              <Select
                value={newInvoiceForm.paymentMethod}
                onChange={(val) =>
                  setNewInvoiceForm((prev) => ({
                    ...prev,
                    paymentMethod: val as ClubInvoice["paymentMethod"],
                  }))
                }
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "vietqr", label: "VietQR Ngân Hàng" },
                  { value: "cash", label: "Tiền Mặt" },
                  { value: "cuezone_pay", label: "Ví CueZone Pay" },
                  { value: "card", label: "Thẻ Visa / Master" },
                ]}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex justify-between items-center text-xs">
            <div>
              <span className="font-semibold text-emerald-800 block">
                Tổng ước tính cần thu:
              </span>
              <span className="text-[11px] text-emerald-600">
                (Đã gồm tiền giờ bàn + F&B - Chiết khấu thẻ)
              </span>
            </div>
            <span className="font-black text-emerald-950 text-xl font-mono">
              {(
                Math.round(
                  newInvoiceForm.durationHours * newInvoiceForm.tableHourlyRate +
                    newInvoiceForm.fnbTotal
                ) *
                (1 -
                  (newInvoiceForm.memberRank === "Diamond"
                    ? 0.15
                    : newInvoiceForm.memberRank === "Gold"
                    ? 0.1
                    : newInvoiceForm.memberRank === "Silver"
                    ? 0.05
                    : 0))
              ).toLocaleString("vi-VN")}
              đ
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setCreateModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleQuickCheckout}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Hoàn Tất & Thu Tiền
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InvoicesManagementPage;
