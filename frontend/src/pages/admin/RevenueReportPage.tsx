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
  SegmentedPillList,
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

  const reportPills = [
    { key: "revenue", label: "Báo Cáo Doanh Thu CLB" },
    { key: "performance", label: "Hiệu Suất & Công Suất Từng Bàn" },
  ];

  const [period, setPeriod] = useState<PeriodType>("week");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueReportData | null>(null);

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
        stack: "Stack 0",
      },
      {
        label: "Doanh thu F&B",
        data: fnbRevenues,
        backgroundColor: "rgba(59, 130, 246, 0.85)", // Blue 500
        hoverBackgroundColor: "rgba(37, 99, 235, 1)",
        borderRadius: 6,
        stack: "Stack 0",
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
            return `${context.dataset.label}: ${val.toLocaleString("vi-VN")} đ`;
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
  const pmLabels = data?.paymentMethods.map((pm) => pm.label) || [];
  const pmAmounts = data?.paymentMethods.map((pm) => pm.amount) || [];
  const pmColors = [
    "#10B981", // Emerald
    "#3B82F6", // Blue
    "#8B5CF6", // Purple
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#6B7280", // Gray
  ];

  const doughnutData = {
    labels: pmLabels,
    datasets: [
      {
        data: pmAmounts,
        backgroundColor: pmColors.slice(0, pmLabels.length),
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

  return (
    <div className="space-y-6 p-2 sm:p-4 max-w-[1400px] mx-auto">
      {/* ── TOP LEVEL UNIFIED REPORT TABS SWITCHER ── */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200/90 shadow-xs flex items-center justify-between">
        <SegmentedPillList
          items={reportPills}
          activeKey={currentTab}
          onSelect={handleTabChange}
        />
      </div>

      {currentTab === "performance" ? (
        <TablePerformanceReportPage />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <BarChartOutlined className="text-2xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Báo cáo & Phân tích Doanh thu Tổng hợp
              </h1>
              <p className="text-sm text-slate-500">
                Đánh giá tổng quan hiệu quả kinh doanh CLB, doanh thu tiền giờ, dịch vụ F&B và voucher.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchRevenue}
            loading={loading}
            className="hover:border-emerald-500"
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* SCRUM-996: Error state with retry */}
      {error && (
        <Alert
          type="error"
          message="Lỗi tải dữ liệu doanh thu"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="text-2xl font-black text-slate-900 font-mono">
            {loading ? "..." : `${(kpis?.totalRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2 flex items-center justify-between">
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
          <div className="text-2xl font-black text-cyan-600 font-mono">
            {loading ? "..." : `${(kpis?.tableRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Chiếm{" "}
            {((kpis?.tableRevenue || 0) + (kpis?.fnbRevenue || 0)) > 0
              ? `${(((kpis?.tableRevenue || 0) / ((kpis?.tableRevenue || 0) + (kpis?.fnbRevenue || 0))) * 100).toFixed(1)}%`
              : "0%"}{" "}
            cơ cấu phát sinh
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
          <div className="text-2xl font-black text-blue-600 font-mono">
            {loading ? "..." : `${(kpis?.fnbRevenue || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Chiếm{" "}
            {((kpis?.tableRevenue || 0) + (kpis?.fnbRevenue || 0)) > 0
              ? `${(((kpis?.fnbRevenue || 0) / ((kpis?.tableRevenue || 0) + (kpis?.fnbRevenue || 0))) * 100).toFixed(1)}%`
              : "0%"}{" "}
            cơ cấu phát sinh
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
          <div className="text-2xl font-black text-amber-600 font-mono">
            {loading ? "..." : `${(kpis?.discountAmount || 0).toLocaleString("vi-VN")} đ`}
          </div>
          <div className="text-xs text-slate-400 mt-2">
            Khuyến mãi & chiết khấu thành viên
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* SCRUM-993: Chart.js Biểu đồ phân tích doanh thu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Timeline Bar Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
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
          className="border border-slate-100 rounded-xl"
        />
      </Card>
        </>
      )}
    </div>
  );
};

export default RevenueReportPage;
