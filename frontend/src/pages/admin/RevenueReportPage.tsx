import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import dayjs, { Dayjs } from "dayjs";
import { TablePerformanceReportPage } from "./TablePerformanceReportPage";
import {
  DollarOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  TagOutlined,
  ReloadOutlined,
  BarChartOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Button,
  Card,
  Tag,
  DatePicker,
  Spin,
  Alert,
  Table,
  type TableColumnsType,
} from "../../shared/ui";
import {
  revenueReportService,
  type RevenueReportData,
  type RevenueTimelinePoint,
} from "../../services/revenue-report.service";

// Register Chart.js modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const { RangePicker } = DatePicker;

type PeriodType = "day" | "week" | "month" | "year" | "custom";

export const RevenueReportPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "revenue";

  const handleTabChange = (key: string) => {
    setSearchParams(key === "revenue" ? {} : { tab: key });
  };

  const [period, setPeriod] = useState<PeriodType>("week");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueReportData | null>(null);

  const [perfRefreshTrigger, setPerfRefreshTrigger] = useState<number>(0);
  const [perfLoading, setPerfLoading] = useState<boolean>(false);

  const fetchRevenue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let queryParams: any = { period };

      if (period === "custom") {
        queryParams.fromDate = dateRange[0].startOf("day").toISOString();
        queryParams.toDate = dateRange[1].endOf("day").toISOString();
      }

      const res = await revenueReportService.getRevenueReport(queryParams);
      setData(res);
    } catch (err: any) {
      console.error("Lỗi tải báo cáo doanh thu:", err);
      setError(
        err?.response?.data?.message ||
          "Không thể tải dữ liệu doanh thu. Vui lòng kiểm tra kết nối mạng và thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }, [period, dateRange]);

  const handleRefresh = () => {
    if (currentTab === "revenue") {
      fetchRevenue();
    } else {
      setPerfRefreshTrigger((prev) => prev + 1);
    }
  };

  const isRefreshing = currentTab === "revenue" ? loading : perfLoading;

  useEffect(() => {
    fetchRevenue();
  }, [fetchRevenue]);

  const handlePeriodChange = (newPeriod: PeriodType) => {
    setPeriod(newPeriod);
    if (newPeriod === "day") {
      setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
    } else if (newPeriod === "week") {
      setDateRange([dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")]);
    } else if (newPeriod === "month") {
      setDateRange([dayjs().subtract(29, "day").startOf("day"), dayjs().endOf("day")]);
    } else if (newPeriod === "year") {
      setDateRange([dayjs().startOf("year"), dayjs().endOf("year")]);
    }
  };

  // ── Prepare Chart.js Bar Data ───────────────────────────────────────────────
  const labels = data?.timeline.map((t) => t.label) || [];
  const tableRevenues = data?.timeline.map((t) => t.tableRevenue) || [];
  const fnbRevenues = data?.timeline.map((t) => t.fnbRevenue) || [];

  const barChartData = {
    labels,
    datasets: [
      {
        label: "Doanh thu Tiền Giờ",
        data: tableRevenues,
        backgroundColor: "rgba(16, 185, 129, 0.85)", // Emerald 500
        hoverBackgroundColor: "rgba(5, 150, 105, 1)",
        borderRadius: 6,
      },
      {
        label: "Doanh thu F&B",
        data: fnbRevenues,
        backgroundColor: "rgba(59, 130, 246, 0.85)", // Blue 500
        hoverBackgroundColor: "rgba(37, 99, 235, 1)",
        borderRadius: 6,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: { family: "sans-serif", size: 12, weight: 600 as any },
          color: "#374151",
          boxWidth: 14,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "#1F2937",
        titleFont: { size: 13, weight: "bold" as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const dataIndex = context.dataIndex;
            const tableVal = tableRevenues[dataIndex] || 0;
            const fnbVal = fnbRevenues[dataIndex] || 0;
            const grossVal = tableVal + fnbVal;
            const pct = grossVal > 0 ? ((val / grossVal) * 100).toFixed(1) : "0";
            return ` ${context.dataset.label}: ${val.toLocaleString("vi-VN")} đ (${pct}% doanh thu gộp)`;
          },
          afterBody: (items: any[]) => {
            if (!items || items.length === 0) return "";
            const dataIndex = items[0].dataIndex;
            const tableVal = tableRevenues[dataIndex] || 0;
            const fnbVal = fnbRevenues[dataIndex] || 0;
            const grossVal = tableVal + fnbVal;
            return `Tổng doanh thu gộp mốc này: ${grossVal.toLocaleString("vi-VN")} đ`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280", font: { size: 11 } },
      },
      y: {
        grid: { color: "#F3F4F6" },
        ticks: {
          color: "#6B7280",
          font: { size: 11 },
          callback: (value: any) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
            return value;
          },
        },
      },
    },
  };

  // ── Prepare Doughnut Data (Payment Methods) ─────────────────────────────────
  const PAYMENT_LABEL_MAP: Record<string, string> = {
    cash: "Tiền mặt",
    transfer: "Chuyển khoản",
    banking: "Chuyển khoản",
    bank: "Chuyển khoản",
    vietqr: "Chuyển khoản VietQR",
    member_balance: "Ví hội viên",
    wallet: "Ví hội viên",
    cuezone_pay: "Ví hội viên",
    momo: "MoMo",
    vnpay: "VNPay",
    card: "Thẻ ngân hàng",
  };

  const COLOR_MAP: Record<string, string> = {
    cash: "#10B981", // Emerald
    "Tiền mặt": "#10B981",
    transfer: "#3B82F6", // Blue
    "Chuyển khoản": "#3B82F6",
    member_balance: "#8B5CF6", // Purple
    "Ví hội viên": "#8B5CF6",
  };

  const rawPaymentMethods =
    data?.paymentMethods && data.paymentMethods.length > 0
      ? data.paymentMethods
      : [
          { method: "cash", label: "Tiền mặt", amount: 0, count: 0, percentage: 0 },
          { method: "transfer", label: "Chuyển khoản", amount: 0, count: 0, percentage: 0 },
          { method: "member_balance", label: "Ví hội viên", amount: 0, count: 0, percentage: 0 },
        ];

  const pmLabels = rawPaymentMethods.map(
    (pm) => PAYMENT_LABEL_MAP[pm.method] || PAYMENT_LABEL_MAP[pm.label] || pm.label || "Khác"
  );
  const pmAmounts = rawPaymentMethods.map((pm) => pm.amount);
  const pmColors = rawPaymentMethods.map(
    (pm) => COLOR_MAP[pm.method] || COLOR_MAP[pm.label] || "#6B7280"
  );

  const doughnutData = {
    labels: pmLabels,
    datasets: [
      {
        data: pmAmounts,
        backgroundColor: pmColors,
        borderWidth: 2,
        borderColor: "#FFFFFF",
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          font: { size: 11, weight: 600 as any },
          padding: 12,
          boxWidth: 12,
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label: string, i: number) => {
              const val = datasets[0]?.data?.[i] || 0;
              const total = datasets[0]?.data?.reduce((a: number, b: number) => a + b, 0) || 0;
              const pct = total > 0 ? ((val / total) * 100).toFixed(0) : "0";
              return {
                text: `${label} (${pct}%)`,
                fillStyle: datasets[0]?.backgroundColor?.[i] || "#10B981",
                strokeStyle: "#FFFFFF",
                lineWidth: 1,
                hidden: false,
                index: i,
              };
            });
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            const total = pmAmounts.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
            return ` ${context.label}: ${val.toLocaleString("vi-VN")} đ (${pct}%)`;
          },
        },
      },
    },
    cutout: "68%",
  };

  // Table columns for timeline breakdown
  const timelineColumns: TableColumnsType<RevenueTimelinePoint> = [
    {
      title: "Mốc thời gian",
      dataIndex: "label",
      key: "label",
      render: (label: string) => <span className="font-semibold text-slate-800">{label}</span>,
    },
    {
      title: "Tiền giờ bàn",
      dataIndex: "tableRevenue",
      key: "tableRevenue",
      align: "right",
      render: (val: number) => (
        <span className="font-mono text-emerald-600 font-semibold">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Doanh thu F&B",
      dataIndex: "fnbRevenue",
      key: "fnbRevenue",
      align: "right",
      render: (val: number) => (
        <span className="font-mono text-blue-600 font-semibold">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Giảm giá / Voucher",
      dataIndex: "discountAmount",
      key: "discountAmount",
      align: "right",
      render: (val: number) => (
        <span className={val > 0 ? "font-mono text-amber-600 font-semibold" : "text-slate-400"}>
          {val > 0 ? `-${val.toLocaleString("vi-VN")} đ` : "0 đ"}
        </span>
      ),
    },
    {
      title: "Tổng thực thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      align: "right",
      render: (val: number) => (
        <span className="font-mono font-black text-slate-900 text-sm">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Số hóa đơn",
      dataIndex: "invoiceCount",
      key: "invoiceCount",
      align: "center",
      width: 100,
      render: (val: number) => <Tag color="blue">{val} đơn</Tag>,
    },
  ];

  const kpis = data?.kpis;
  const isZeroRevenue = (kpis?.totalRevenue || 0) === 0;
  const grossRevenue = (kpis?.tableRevenue || 0) + (kpis?.fnbRevenue || 0);

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-[1400px] mx-auto">
      {/* ── TOP BANNER: BÁO CÁO & THỐNG KÊ HOẠT ĐỘNG CLB ── */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl shrink-0 shadow-2xs border border-emerald-100">
              <BarChartOutlined />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 mb-0 tracking-tight">
                  Báo Cáo & Thống Kê Hoạt Động CLB
                </h1>
                <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                  CUEZONE ANALYTICS
                </Tag>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mb-0">
                Phân tích doanh thu tiền giờ, dịch vụ F&B, voucher và hiệu suất khai thác từng bàn bida theo thời gian thực.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 bg-slate-50 px-3.5 py-1.5 rounded-2xl border border-slate-200 text-xs text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Dữ liệu thực tế từ MongoDB</span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION TAB BAR (BÁO CÁO DOANH THU & HIỆU SUẤT TỪNG BÀN) ── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap sm:flex-nowrap p-1 bg-slate-100/90 rounded-2xl gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            type="button"
            onClick={() => handleTabChange("revenue")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
              currentTab === "revenue"
                ? "bg-white text-emerald-800 shadow-sm ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <DollarOutlined className={currentTab === "revenue" ? "text-emerald-600 text-sm sm:text-base" : "text-slate-400 text-sm sm:text-base"} />
            <span>Báo Cáo Doanh Thu CLB</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                currentTab === "revenue"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              Tài chính & F&B
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("performance")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer ${
              currentTab === "performance"
                ? "bg-white text-cyan-800 shadow-sm ring-1 ring-slate-200/60"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <DashboardOutlined className={currentTab === "performance" ? "text-cyan-600 text-sm sm:text-base" : "text-slate-400 text-sm sm:text-base"} />
            <span>Hiệu Suất & Công Suất Từng Bàn</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                currentTab === "performance"
                  ? "bg-cyan-50 text-cyan-700 border border-cyan-200/60"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              Khai thác bàn
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <Button
            variant="primary"
            size="md"
            icon={<ReloadOutlined className={isRefreshing ? "animate-spin" : ""} />}
            onClick={handleRefresh}
            loading={isRefreshing}
            className="!rounded-xl !font-bold px-5 !text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 shadow-2xs"
          >
            Làm mới dữ liệu
          </Button>
        </div>
      </div>

      {currentTab === "performance" ? (
        <TablePerformanceReportPage
          refreshTrigger={perfRefreshTrigger}
          onLoadingChange={setPerfLoading}
        />
      ) : (
        <>

      {/* SCRUM-996: Error state with retry */}
      {error && (
        <Alert
          type="error"
          title="Lỗi tải dữ liệu doanh thu"
          description={
            <div className="flex items-center justify-between mt-1">
              <span>{error}</span>
              <Button size="small" type="primary" danger onClick={fetchRevenue}>
                Thử lại
              </Button>
            </div>
          }
          showIcon
        />
      )}

      {/* Filter Bar: SCRUM-991 */}
      <Card className="rounded-2xl shadow-xs border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Thời gian:
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => handlePeriodChange("day")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "day"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("week")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "week"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("month")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "month"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                30 ngày qua
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("year")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "year"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Năm nay
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange("custom")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "custom"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tùy chọn
              </button>
            </div>
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  }
                }}
                format="DD/MM/YYYY"
                allowClear={false}
                className="w-64"
              />
            </div>
          )}
        </div>
      </Card>

      {/* SCRUM-991: 4 thẻ KPI tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Tổng doanh thu */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng doanh thu
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              <DollarOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
            {loading ? "..." : `${(kpis?.totalRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-wrap items-center justify-between gap-1">
            <span>Tổng {kpis?.invoiceCount || 0} hóa đơn</span>
            <span>AOV: {(kpis?.averageBillValue || 0).toLocaleString("vi-VN")} đ</span>
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        {/* KPI 2: Doanh thu tiền giờ */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Doanh thu tiền giờ
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
              <ClockCircleOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-600 font-mono truncate">
            {loading ? "..." : `${(kpis?.tableRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Chiếm{" "}
            {grossRevenue > 0
              ? `${(((kpis?.tableRevenue || 0) / grossRevenue) * 100).toFixed(1)}%`
              : "0%"}{" "}
            cơ cấu doanh thu gộp
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
        </div>

        {/* KPI 3: Doanh thu F&B */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Doanh thu F&B
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg">
              <CoffeeOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 font-mono truncate">
            {loading ? "..." : `${(kpis?.fnbRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Chiếm{" "}
            {grossRevenue > 0
              ? `${(((kpis?.fnbRevenue || 0) / grossRevenue) * 100).toFixed(1)}%`
              : "0%"}{" "}
            cơ cấu doanh thu gộp
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
        </div>

        {/* KPI 4: Tiền giảm giá / Voucher */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tiền giảm giá (Voucher)
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              <TagOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono truncate">
            {loading ? "..." : `${(kpis?.discountAmount || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Khuyến mãi & chiết khấu thành viên (Giảm trừ{" "}
            {grossRevenue > 0
              ? `${(((kpis?.discountAmount || 0) / grossRevenue) * 100).toFixed(1)}%`
              : "0%"}
            )
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* SCRUM-993: Chart.js Biểu đồ phân tích doanh thu */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Timeline Bar Chart */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-black text-slate-900 mb-0.5">
                Biểu đồ diễn biến doanh thu theo thời gian
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Phân tích cơ cấu doanh thu tiền giờ bàn và dịch vụ F&B đồ ăn uống.
              </p>
            </div>
          </div>

          <div className="h-80 relative">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spin tip="Đang tải dữ liệu biểu đồ..." />
              </div>
            ) : isZeroRevenue ? (
              /* SCRUM-996: Empty state */
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <BarChartOutlined className="text-4xl mb-2 text-slate-300" />
                <p className="text-sm font-medium mb-1">Chưa có dữ liệu doanh thu trong khoảng thời gian này</p>
                <p className="text-xs text-slate-400">Các hóa đơn thanh toán từ POS sẽ xuất hiện ở đây.</p>
              </div>
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>
        </div>

        {/* Right side: Doughnut Chart Payment Methods */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="mb-4 pb-2 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-0.5">
              Cơ cấu phương thức thanh toán
            </h3>
            <p className="text-xs text-slate-500 mb-0">Tỷ lệ thanh toán tiền mặt, chuyển khoản, ví</p>
          </div>

          <div className="h-64 relative flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Spin tip="Đang tải..." />
              </div>
            ) : pmAmounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                Chưa có dữ liệu phương thức thanh toán
              </div>
            ) : (
              <Doughnut data={doughnutData} options={doughnutOptions} />
            )}
          </div>

          {/* Quick list top products */}
          {data?.topProducts && data.topProducts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700 mb-2">Top F&B bán chạy:</div>
              <div className="space-y-1.5">
                {data.topProducts.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate max-w-[160px]">{p.name}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {p.revenue.toLocaleString("vi-VN")} đ ({p.quantity})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdown Table */}
      <Card className="rounded-2xl shadow-xs border-slate-200 overflow-hidden">
        <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 mb-0">
            Chi tiết doanh thu theo từng mốc thời gian
          </h2>
          <span className="text-xs text-slate-400">
            Đối soát tổng hợp tiền giờ, đồ uống và thực thu
          </span>
        </div>

        <Table<RevenueTimelinePoint>
          columns={timelineColumns}
          dataSource={data?.timeline || []}
          rowKey="key"
          loading={loading}
          pagination={false}
          bordered
          scroll={{ x: 850 }}
          className="border border-slate-100 rounded-xl"
        />
      </Card>
        </>
      )}
    </div>
  );
};

export default RevenueReportPage;
