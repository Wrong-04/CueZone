import React, { useState, useMemo } from "react";
import {
  LineChartOutlined,
  RiseOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  DownloadOutlined,
  PrinterOutlined,
  CoffeeOutlined,
  CrownOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Select,
  SegmentedPillList,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DailyRevenueStat {
  date: string;
  dayOfWeek: string;
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  customerCount: number;
  occupancyRate: number; // Percentage
}

export interface TablePerformanceStat {
  tableCode: string;
  tableName: string;
  type: "match" | "vip" | "standard";
  typeName: string;
  hourlyRate: number;
  totalHoursPlayed: number;
  occupancyPercent: number;
  tableRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  rank: number;
}

export interface FnbItemStat {
  sku: string;
  name: string;
  category: string;
  quantitySold: number;
  unit: string;
  unitPrice: number;
  totalRevenue: number;
  profitMargin: number; // Percentage
}

export interface MemberSpendingStat {
  rank: number;
  name: string;
  phone: string;
  tier: "Diamond" | "Gold" | "Silver" | "Normal";
  totalSpent: number;
  hoursPlayed: number;
  visitCount: number;
  lastVisit: string;
}

// ── Mock Initial Analytics Data ───────────────────────────────────────────────

const WEEKLY_REVENUE_DATA: DailyRevenueStat[] = [
  {
    date: "26/09/2026",
    dayOfWeek: "Thứ Hai",
    tableRevenue: 11500000,
    fnbRevenue: 7000000,
    totalRevenue: 18500000,
    customerCount: 105,
    occupancyRate: 64,
  },
  {
    date: "27/09/2026",
    dayOfWeek: "Thứ Ba",
    tableRevenue: 13200000,
    fnbRevenue: 8000000,
    totalRevenue: 21200000,
    customerCount: 122,
    occupancyRate: 68,
  },
  {
    date: "28/09/2026",
    dayOfWeek: "Thứ Tư",
    tableRevenue: 15300000,
    fnbRevenue: 9500000,
    totalRevenue: 24800000,
    customerCount: 140,
    occupancyRate: 72,
  },
  {
    date: "29/09/2026",
    dayOfWeek: "Thứ Năm",
    tableRevenue: 17500000,
    fnbRevenue: 10500000,
    totalRevenue: 28000000,
    customerCount: 158,
    occupancyRate: 76,
  },
  {
    date: "30/09/2026",
    dayOfWeek: "Thứ Sáu",
    tableRevenue: 26000000,
    fnbRevenue: 16500000,
    totalRevenue: 42500000,
    customerCount: 235,
    occupancyRate: 88,
  },
  {
    date: "01/10/2026",
    dayOfWeek: "Thứ Bảy",
    tableRevenue: 35200000,
    fnbRevenue: 23000000,
    totalRevenue: 58200000,
    customerCount: 310,
    occupancyRate: 96,
  },
  {
    date: "02/10/2026",
    dayOfWeek: "Chủ Nhật (Hôm nay)",
    tableRevenue: 35463000,
    fnbRevenue: 19987000,
    totalRevenue: 55450000,
    customerCount: 295,
    occupancyRate: 94,
  },
];

const TABLE_PERFORMANCE_DATA: TablePerformanceStat[] = [
  {
    rank: 1,
    tableCode: "M13",
    tableName: "Bàn Match 13 (K-Steel VAR)",
    type: "match",
    typeName: "Bàn Thi Đấu VAR",
    hourlyRate: 80000,
    totalHoursPlayed: 198,
    occupancyPercent: 88.5,
    tableRevenue: 15840000,
    fnbRevenue: 11450000,
    totalRevenue: 27290000,
  },
  {
    rank: 2,
    tableCode: "M14",
    tableName: "Bàn Match 14 (K-Steel VAR)",
    type: "match",
    typeName: "Bàn Thi Đấu VAR",
    hourlyRate: 80000,
    totalHoursPlayed: 185,
    occupancyPercent: 82.6,
    tableRevenue: 14800000,
    fnbRevenue: 10200000,
    totalRevenue: 25000000,
  },
  {
    rank: 3,
    tableCode: "VIP10",
    tableName: "Bàn VIP 10 (Bank Pool VIP)",
    type: "vip",
    typeName: "Bàn VIP Cao Cấp",
    hourlyRate: 70000,
    totalHoursPlayed: 192,
    occupancyPercent: 85.7,
    tableRevenue: 13440000,
    fnbRevenue: 9800000,
    totalRevenue: 23240000,
  },
  {
    rank: 4,
    tableCode: "VIP11",
    tableName: "Bàn VIP 11 (Bank Pool VIP)",
    type: "vip",
    typeName: "Bàn VIP Cao Cấp",
    hourlyRate: 70000,
    totalHoursPlayed: 175,
    occupancyPercent: 78.1,
    tableRevenue: 12250000,
    fnbRevenue: 8500000,
    totalRevenue: 20750000,
  },
  {
    rank: 5,
    tableCode: "VIP12",
    tableName: "Bàn VIP 12 (Bank Pool VIP)",
    type: "vip",
    typeName: "Bàn VIP Cao Cấp",
    hourlyRate: 70000,
    totalHoursPlayed: 168,
    occupancyPercent: 75.0,
    tableRevenue: 11760000,
    fnbRevenue: 7900000,
    totalRevenue: 19660000,
  },
  {
    rank: 6,
    tableCode: "T01",
    tableName: "Bàn 01 (Bàn Thường 9FT)",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    hourlyRate: 50000,
    totalHoursPlayed: 182,
    occupancyPercent: 81.2,
    tableRevenue: 9100000,
    fnbRevenue: 6400000,
    totalRevenue: 15500000,
  },
  {
    rank: 7,
    tableCode: "T02",
    tableName: "Bàn 02 (Bàn Thường 9FT)",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    hourlyRate: 50000,
    totalHoursPlayed: 170,
    occupancyPercent: 75.9,
    tableRevenue: 8500000,
    fnbRevenue: 5900000,
    totalRevenue: 14400000,
  },
  {
    rank: 8,
    tableCode: "T03",
    tableName: "Bàn 03 (Bàn Thường 9FT)",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    hourlyRate: 50000,
    totalHoursPlayed: 165,
    occupancyPercent: 73.7,
    tableRevenue: 8250000,
    fnbRevenue: 5800000,
    totalRevenue: 14050000,
  },
];

const FNB_BESTSELLERS_DATA: FnbItemStat[] = [
  {
    sku: "CF-01",
    name: "Cà Phê Muối CueZone Signature",
    category: "Cà Phê",
    quantitySold: 640,
    unit: "Ly",
    unitPrice: 35000,
    totalRevenue: 22400000,
    profitMargin: 68.5,
  },
  {
    sku: "BEER-01",
    name: "Bia Heineken Silver Lon 330ml (Ướp Lạnh)",
    category: "Bia & Đồ Có Cồn",
    quantitySold: 580,
    unit: "Lon",
    unitPrice: 35000,
    totalRevenue: 20300000,
    profitMargin: 46.0,
  },
  {
    sku: "TEA-01",
    name: "Trà Đào Cam Sả Tươi",
    category: "Trà Trái Cây",
    quantitySold: 420,
    unit: "Ly",
    unitPrice: 38000,
    totalRevenue: 15960000,
    profitMargin: 72.0,
  },
  {
    sku: "FOOD-01",
    name: "Mì Xào Bò Trứng Ốp La",
    category: "Món Ăn Nóng",
    quantitySold: 260,
    unit: "Dĩa",
    unitPrice: 55000,
    totalRevenue: 14300000,
    profitMargin: 58.0,
  },
  {
    sku: "SNK-01",
    name: "Bò Khô Cháy Tỏi Chanh Ớt",
    category: "Ăn Vặt",
    quantitySold: 195,
    unit: "Hũ",
    unitPrice: 65000,
    totalRevenue: 12675000,
    profitMargin: 62.0,
  },
  {
    sku: "BEER-02",
    name: "Bia Corona Extra Chai 355ml",
    category: "Bia & Đồ Có Cồn",
    quantitySold: 210,
    unit: "Chai",
    unitPrice: 48000,
    totalRevenue: 10080000,
    profitMargin: 42.5,
  },
  {
    sku: "EQ-01",
    name: "Lơ Bida Kamui Roku Xanh Chuẩn Giải",
    category: "Phụ Kiện",
    quantitySold: 25,
    unit: "Cục",
    unitPrice: 600000,
    totalRevenue: 15000000,
    profitMargin: 50.0,
  },
];

const MEMBER_SPENDING_DATA: MemberSpendingStat[] = [
  {
    rank: 1,
    name: "Hoàng Minh Trí",
    phone: "0933 123 456",
    tier: "Diamond",
    totalSpent: 18500000,
    hoursPlayed: 54,
    visitCount: 18,
    lastVisit: "Hôm nay, 14:05",
  },
  {
    rank: 2,
    name: "Nguyễn Hải Long",
    phone: "0908 112 334",
    tier: "Gold",
    totalSpent: 14200000,
    hoursPlayed: 48,
    visitCount: 16,
    lastVisit: "Hôm nay, 12:48",
  },
  {
    rank: 3,
    name: "Trần Đình Trọng",
    phone: "0901 223 344",
    tier: "Gold",
    totalSpent: 12600000,
    hoursPlayed: 42,
    visitCount: 14,
    lastVisit: "Hôm qua, 22:35",
  },
  {
    rank: 4,
    name: "Lê Quốc Bảo",
    phone: "0918 332 211",
    tier: "Diamond",
    totalSpent: 11800000,
    hoursPlayed: 38,
    visitCount: 12,
    lastVisit: "30/09/2026",
  },
  {
    rank: 5,
    name: "Vũ Minh Quân",
    phone: "0988 776 554",
    tier: "Silver",
    totalSpent: 8400000,
    hoursPlayed: 32,
    visitCount: 10,
    lastVisit: "Hôm nay, 13:42",
  },
];

export const ReportsAnalyticsPage: React.FC = () => {
  // ── 1. STATE ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>("revenue");
  const [timeRange, setTimeRange] = useState<string>("week");

  // Export Modal
  const [exportModalVisible, setExportModalVisible] = useState<boolean>(false);

  // Metrics summary
  const summary = useMemo(() => {
    const totalRev = WEEKLY_REVENUE_DATA.reduce((acc, cur) => acc + cur.totalRevenue, 0);
    const tableRev = WEEKLY_REVENUE_DATA.reduce((acc, cur) => acc + cur.tableRevenue, 0);
    const fnbRev = WEEKLY_REVENUE_DATA.reduce((acc, cur) => acc + cur.fnbRevenue, 0);
    const totalCustomers = WEEKLY_REVENUE_DATA.reduce((acc, cur) => acc + cur.customerCount, 0);
    const avgOccupancy = Math.round(
      WEEKLY_REVENUE_DATA.reduce((acc, cur) => acc + cur.occupancyRate, 0) /
        WEEKLY_REVENUE_DATA.length
    );
    const grossProfit = Math.round(tableRev * 0.85 + fnbRev * 0.58);

    return {
      totalRev,
      tableRev,
      fnbRev,
      totalCustomers,
      avgOccupancy,
      grossProfit,
    };
  }, []);

  // Main Pills
  const mainPills = [
    {
      key: "revenue",
      label: "Doanh Thu & Biểu Đồ Tuần",
      badge: "7 Ngày",
    },
    {
      key: "tables",
      label: "Hiệu Suất Từng Bàn Bida",
      badge: TABLE_PERFORMANCE_DATA.length,
    },
    {
      key: "fnb",
      label: "Top F&B & Món Bán Chạy",
      badge: FNB_BESTSELLERS_DATA.length,
    },
    {
      key: "members",
      label: "Khách Hàng & VIP Spending",
      badge: "Top 5 VIP",
    },
  ];

  // Actions
  const handleExportExcel = () => {
    message.success("Đang tạo và tải xuống file Excel báo cáo doanh thu CLB...");
    setExportModalVisible(false);
  };

  const handlePrintReport = () => {
    message.success("Đang gửi lệnh in báo cáo ca doanh thu ra máy in báo cáo...");
  };

  // Table Columns for Table Performance
  const tableColumns: TableColumnsType<TablePerformanceStat> = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 70,
      align: "center",
      render: (rank: number) => {
        if (rank === 1) {
          return (
            <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 font-black text-xs flex items-center justify-center mx-auto border border-amber-300">
              <CrownOutlined />
            </div>
          );
        }
        if (rank <= 3) {
          return (
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center mx-auto border border-emerald-200">
              {rank}
            </div>
          );
        }
        return <span className="font-bold text-slate-500">{rank}</span>;
      },
    },
    {
      title: "Tên Bàn & Phân Loại",
      key: "table",
      render: (_: unknown, record: TablePerformanceStat) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">{record.tableName}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Tag
              color={record.type === "match" ? "red" : record.type === "vip" ? "purple" : "blue"}
              className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold"
            >
              {record.typeName}
            </Tag>
            <span className="text-[11px] text-slate-400 font-mono">
              {record.hourlyRate.toLocaleString("vi-VN")}đ/h
            </span>
          </div>
        </div>
      ),
    },
    {
      title: "Số Giờ Chơi",
      dataIndex: "totalHoursPlayed",
      key: "totalHoursPlayed",
      width: 120,
      align: "center",
      render: (h: number) => (
        <span className="font-mono font-bold text-slate-800 text-xs">{h} giờ</span>
      ),
    },
    {
      title: "Công Suất (%)",
      dataIndex: "occupancyPercent",
      key: "occupancyPercent",
      width: 150,
      render: (p: number) => (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800 font-mono">{p}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full rounded-full ${
                p >= 80 ? "bg-emerald-500" : p >= 70 ? "bg-blue-500" : "bg-amber-500"
              }`}
              style={{ width: `${p}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Tiền Giờ Bàn",
      dataIndex: "tableRevenue",
      key: "tableRevenue",
      width: 140,
      render: (rev: number) => (
        <span className="font-mono text-slate-700 text-xs">
          {rev.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "F&B Kèm Theo",
      dataIndex: "fnbRevenue",
      key: "fnbRevenue",
      width: 140,
      render: (fnb: number) => (
        <span className="font-mono text-blue-700 text-xs font-semibold">
          {fnb.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Tổng Doanh Thu Bàn",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 160,
      render: (total: number) => (
        <span className="font-mono font-black text-emerald-800 text-sm">
          {total.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
  ];

  // Table Columns for FNB Analytics
  const fnbColumns: TableColumnsType<FnbItemStat> = [
    {
      title: "Mã SKU",
      dataIndex: "sku",
      key: "sku",
      width: 100,
      render: (sku: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200">
          {sku}
        </span>
      ),
    },
    {
      title: "Tên Món Ăn / Đồ Uống",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: FnbItemStat) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">{name}</span>
          <span className="text-[11px] text-slate-400">{record.category}</span>
        </div>
      ),
    },
    {
      title: "Số Lượng Đã Bán",
      key: "qty",
      width: 130,
      align: "center",
      render: (_: unknown, record: FnbItemStat) => (
        <span className="font-mono font-black text-slate-800 text-sm">
          {record.quantitySold} {record.unit}
        </span>
      ),
    },
    {
      title: "Đơn Giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 120,
      render: (p: number) => (
        <span className="font-mono text-slate-600 text-xs">
          {p.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Tổng Doanh Thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      width: 150,
      render: (rev: number) => (
        <span className="font-mono font-black text-emerald-800 text-sm">
          {rev.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Biên Lợi Nhuận",
      dataIndex: "profitMargin",
      key: "profitMargin",
      width: 120,
      align: "center",
      render: (m: number) => (
        <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold font-mono">
          +{m}%
        </Tag>
      ),
    },
  ];

  // Table Columns for Member Spending
  const memberColumns: TableColumnsType<MemberSpendingStat> = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 70,
      align: "center",
      render: (rank: number) => (
        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center mx-auto border border-slate-200">
          {rank}
        </div>
      ),
    },
    {
      title: "Khách Hàng / VĐV",
      key: "customer",
      render: (_: unknown, record: MemberSpendingStat) => (
        <div>
          <span className="font-bold text-slate-900 text-sm block">{record.name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Tag
              color={
                record.tier === "Diamond"
                  ? "purple"
                  : record.tier === "Gold"
                  ? "gold"
                  : "blue"
              }
              className="!rounded-md !px-1.5 !py-0 !text-[10px] !font-bold"
            >
              {record.tier} VIP
            </Tag>
            <span className="text-[11px] text-slate-400">{record.phone}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Tổng Chi Tiêu (VND)",
      dataIndex: "totalSpent",
      key: "totalSpent",
      width: 160,
      render: (spent: number) => (
        <span className="font-mono font-black text-emerald-800 text-sm">
          {spent.toLocaleString("vi-VN")}đ
        </span>
      ),
    },
    {
      title: "Giờ Chơi Bida",
      dataIndex: "hoursPlayed",
      key: "hoursPlayed",
      width: 120,
      align: "center",
      render: (h: number) => <span className="font-semibold text-slate-700">{h} giờ</span>,
    },
    {
      title: "Số Lần Đến CLB",
      dataIndex: "visitCount",
      key: "visitCount",
      width: 130,
      align: "center",
      render: (v: number) => (
        <span className="font-bold text-slate-900 font-mono">{v} lần</span>
      ),
    },
    {
      title: "Lần Chơi Gần Nhất",
      dataIndex: "lastVisit",
      key: "lastVisit",
      width: 150,
      render: (visit: string) => (
        <span className="text-xs text-slate-500">{visit}</span>
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
                <LineChartOutlined className="text-xl" />
              </div>
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Báo Cáo Doanh Thu & Hiệu Suất CLB Bida
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                EXECUTIVE CLUB ANALYTICS
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Phân tích cơ cấu doanh thu tiền giờ bida, hiệu suất sử dụng bàn (Occupancy Rate), danh mục F&B bán chạy và chỉ số chi tiêu hội viên thân thiết CueZone.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<PrinterOutlined />}
              onClick={handlePrintReport}
              className="!rounded-xl !text-xs !text-slate-700 font-bold"
            >
              In Báo Cáo Ca
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<DownloadOutlined />}
              onClick={() => setExportModalVisible(true)}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Xuất File Báo Cáo
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Tổng doanh thu tuần
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <RiseOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-800 tracking-tight truncate">
                {summary.totalRev.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
              +18.4% so với tuần trước
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Doanh thu tiền giờ bàn
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <TrophyOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight truncate">
                {summary.tableRev.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <span className="text-[11px] text-blue-600 font-medium mt-1 block">
              Chiếm 62% tổng doanh thu CLB
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">
                Doanh thu F&B & Đồ uống
              </span>
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-xs border border-amber-200">
                <CoffeeOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-amber-900 tracking-tight truncate">
                {summary.fnbRev.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <span className="text-[11px] text-amber-700 font-medium mt-1 block">
              Chiếm 38% tổng doanh thu CLB
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider">
                Công suất lấp đầy bàn
              </span>
              <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs border border-purple-200">
                <ThunderboltOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-purple-900 tracking-tight">
                {summary.avgOccupancy}%
              </span>
              <span className="text-xs font-semibold text-purple-700">trung bình</span>
            </div>
            <span className="text-[11px] text-purple-600 font-medium mt-1 block">
              Cao điểm cuối tuần đạt 96%
            </span>
          </div>
        </div>
      </div>

      {/* ── TIME RANGE SELECTOR & MAIN TABS ───────────────────────────────── */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="overflow-x-auto pb-1">
          <SegmentedPillList
            items={mainPills}
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-slate-500">Kỳ báo cáo:</span>
          <Select
            value={timeRange}
            onChange={(val) => setTimeRange(val)}
            className="!w-44 !rounded-xl !text-xs"
            options={[
              { value: "week", label: "7 Ngày Gần Nhất" },
              { value: "month", label: "Tháng Này (10/2026)" },
              { value: "last_month", label: "Tháng Trước (09/2026)" },
              { value: "quarter", label: "Quý 4/2026" },
            ]}
          />
        </div>
      </div>

      {/* ── TAB 1: DOANH THU & BIỂU ĐỒ TUẦN ─────────────────────────────────── */}
      {activeTab === "revenue" && (
        <div className="space-y-6">
          {/* Visual Bar Chart (Simulated CSS Bar Chart) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-0.5">
                  Biểu Đồ Doanh Thu 7 Ngày Gần Nhất
                </h3>
                <p className="text-xs text-slate-500 mb-0">
                  Phân bổ doanh thu tiền giờ bida (xanh lục) và doanh thu F&B đồ uống (xanh lam)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Tiền Giờ Bàn
                </span>
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-3 h-3 rounded-full bg-blue-500" /> Dịch Vụ F&B
                </span>
              </div>
            </div>

            {/* CSS Bar Chart Layout */}
            <div className="pt-4 pb-2 grid grid-cols-7 gap-2 sm:gap-4 items-end h-72">
              {WEEKLY_REVENUE_DATA.map((item) => {
                const maxVal = 60000000;
                const tableHeightPercent = Math.round((item.tableRevenue / maxVal) * 100);
                const fnbHeightPercent = Math.round((item.fnbRevenue / maxVal) * 100);

                return (
                  <div key={item.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="font-mono text-[10.5px] font-bold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(item.totalRevenue / 1000000).toFixed(1)}M
                    </span>

                    {/* Stacked bar */}
                    <div className="w-full max-w-[48px] flex flex-col gap-1 items-stretch">
                      {/* F&B bar */}
                      <div
                        className="bg-blue-500 rounded-t-lg transition-all duration-500 group-hover:bg-blue-600"
                        style={{ height: `${fnbHeightPercent}%`, minHeight: "12px" }}
                        title={`F&B: ${item.fnbRevenue.toLocaleString("vi-VN")}đ`}
                      />
                      {/* Table bar */}
                      <div
                        className="bg-emerald-500 rounded-b-lg transition-all duration-500 group-hover:bg-emerald-600"
                        style={{ height: `${tableHeightPercent}%`, minHeight: "20px" }}
                        title={`Tiền giờ: ${item.tableRevenue.toLocaleString("vi-VN")}đ`}
                      />
                    </div>

                    <div className="text-center pt-1 border-t border-slate-100 w-full">
                      <span className="font-bold text-slate-900 text-xs block">{item.dayOfWeek.replace("Thứ ", "T")}</span>
                      <span className="text-[10px] text-slate-400 block">{item.date.slice(0, 5)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900 mb-0.5">
                Bảng Kê Chi Tiết Doanh Thu Từng Ngày
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Ngày / Thứ</th>
                    <th className="py-3 px-4 text-right">Tiền Giờ Bàn</th>
                    <th className="py-3 px-4 text-right">Doanh Số F&B</th>
                    <th className="py-3 px-4 text-right">Tổng Doanh Thu</th>
                    <th className="py-3 px-4 text-center">Lượt Khách</th>
                    <th className="py-3 px-4 text-center">Công Suất</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {WEEKLY_REVENUE_DATA.map((d) => (
                    <tr key={d.date} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{d.dayOfWeek}</span>
                        <span className="text-[11px] text-slate-400">{d.date}</span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                        {d.tableRevenue.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-blue-700">
                        {d.fnbRevenue.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                        {d.totalRevenue.toLocaleString("vi-VN")}đ
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-800">
                        {d.customerCount} lượt
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Tag color={d.occupancyRate >= 85 ? "green" : "blue"} className="!rounded-full font-mono">
                          {d.occupancyRate}%
                        </Tag>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: HIỆU SUẤT TỪNG BÀN BIDA ─────────────────────────────────── */}
      {activeTab === "tables" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Báo Cáo Hiệu Suất Từng Bàn Bida & Doanh Thu Đóng Góp
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Xếp hạng các bàn bida có số giờ chơi cao nhất và doanh thu sinh lời lớn nhất CLB
              </p>
            </div>
            <Tag color="cyan" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              14 BÀN ĐANG HOẠT ĐỘNG
            </Tag>
          </div>

          <Table<TablePerformanceStat>
            columns={tableColumns}
            dataSource={TABLE_PERFORMANCE_DATA}
            rowKey="tableCode"
            pagination={false}
          />
        </div>
      )}

      {/* ── TAB 3: TOP F&B & MÓN BÁN CHẠY ──────────────────────────────────── */}
      {activeTab === "fnb" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Top Mặt Hàng F&B & Phụ Kiện Bán Chạy Nhất (Best-sellers)
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Thống kê số lượng ly/dĩa/lon tiêu thụ tại quầy bar và bàn chơi bida
              </p>
            </div>
            <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              F&B PROFIT MARGIN: 66.4%
            </Tag>
          </div>

          <Table<FnbItemStat>
            columns={fnbColumns}
            dataSource={FNB_BESTSELLERS_DATA}
            rowKey="sku"
            pagination={false}
          />
        </div>
      )}

      {/* ── TAB 4: KHÁCH HÀNG & VIP SPENDING ────────────────────────────────── */}
      {activeTab === "members" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Bảng Vinh Danh Top Khách Hàng & Hội Viên VIP CLB
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Thống kê tổng mức chi tiêu, số giờ cơ và số lần ghé thăm của khách hàng trung thành
              </p>
            </div>
            <Tag color="purple" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              VIP RETENTION: 78.5%
            </Tag>
          </div>

          <Table<MemberSpendingStat>
            columns={memberColumns}
            dataSource={MEMBER_SPENDING_DATA}
            rowKey="phone"
            pagination={false}
          />
        </div>
      )}

      {/* ── MODAL: XUẤT FILE BÁO CÁO EXCEL ─────────────────────────────────── */}
      <Modal
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
        width={500}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <DownloadOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              Xuất Báo Cáo Doanh Thu Bida
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn định dạng xuất dữ liệu:
            </label>
            <Select
              defaultValue="excel"
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "excel", label: "Microsoft Excel (.xlsx) - Đầy đủ công thức & biểu đồ" },
                { value: "pdf", label: "Tài liệu PDF (.pdf) - Chuẩn in ấn báo cáo hội đồng quản trị" },
                { value: "csv", label: "Tệp CSV (.csv) - Đồng bộ phần mềm kế toán" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phạm vi số liệu:
            </label>
            <Select
              defaultValue="all"
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: "all", label: "Toàn bộ doanh thu tiền giờ bàn, F&B và chi tiết từng bàn" },
                { value: "table_only", label: "Chỉ doanh thu tiền giờ bàn" },
                { value: "fnb_only", label: "Chỉ doanh thu ẩm thực F&B" },
              ]}
            />
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircleOutlined className="text-emerald-600 text-base" />
            <span>File báo cáo sẽ được ký điện tử và xuất trực tiếp từ máy chủ CueZone.</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => setExportModalVisible(false)}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExportExcel}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              Tải Xuống Báo Cáo
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ReportsAnalyticsPage;
