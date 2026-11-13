import React, { useState, useEffect, useCallback } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  TrophyOutlined,
  ClockCircleOutlined,
  FireOutlined,
  DollarOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  Card,
  Tag,
  DatePicker,
  Alert,
  Table,
  type TableColumnsType,
} from "../../shared/ui";
import {
  tablePerformanceService,
  type TablePerformanceReportData,
  type TablePerformanceItem,
  type TableTypePerformance,
} from "../../services/table-performance.service";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const { RangePicker } = DatePicker;

type PeriodType = "day" | "week" | "month" | "year" | "custom";

export interface TablePerformanceReportPageProps {
  refreshTrigger?: number;
  onLoadingChange?: (loading: boolean) => void;
}

export const TablePerformanceReportPage: React.FC<TablePerformanceReportPageProps> = ({
  refreshTrigger,
  onLoadingChange,
}) => {
  const [period, setPeriod] = useState<PeriodType>("week");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(6, "day"),
    dayjs(),
  ]);
  const [tableType, setTableType] = useState<string>("all");

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TablePerformanceReportData | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = { period, type: tableType !== "all" ? tableType : undefined };
      if (period === "custom") {
        params.fromDate = dateRange[0].startOf("day").toISOString();
        params.toDate = dateRange[1].endOf("day").toISOString();
      }

      const res = await tablePerformanceService.getReport(params);
      setData(res);
    } catch (err: any) {
      console.error("Lỗi tải báo cáo hiệu suất bàn:", err);
      setError(
        err?.response?.data?.message ||
          "Không thể tải dữ liệu hiệu suất bàn chơi. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  }, [period, dateRange, tableType]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      fetchReport();
    }
  }, [refreshTrigger, fetchReport]);

  useEffect(() => {
    onLoadingChange?.(loading);
  }, [loading, onLoadingChange]);

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

  // ── Biểu đồ tỷ lệ lấp đầy theo khung giờ (Line Chart với Gradient Fill) ──────
  const chartLabels = data?.hourlyFillRates.map((h) => h.label) || [];
  const chartValues = data?.hourlyFillRates.map((h) => h.occupancyPercent) || [];

  const fillRateChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "Tỷ lệ lấp đầy bàn (%)",
        data: chartValues,
        borderColor: "#10B981", // Emerald 500
        backgroundColor: "rgba(16, 185, 129, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "#047857",
        pointBorderColor: "#FFFFFF",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const fillRateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1F2937",
        titleFont: { size: 12, weight: "bold" as const },
        bodyFont: { size: 12 },
        padding: 10,
        callbacks: {
          label: (context: any) => ` Tỷ lệ lấp đầy: ${context.raw}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6B7280", font: { size: 11 } },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: "#F3F4F6" },
        ticks: {
          color: "#6B7280",
          font: { size: 11 },
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  // ── Columns so sánh 3 loại bàn (SCRUM-1019, SCRUM-1024) ────────────────────
  const typeColumns: TableColumnsType<TableTypePerformance> = [
    {
      title: "Loại bàn chơi",
      dataIndex: "typeName",
      key: "typeName",
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          <Tag
            color={
              record.type === "pool"
                ? "blue"
                : record.type === "carom"
                ? "gold"
                : "purple"
            }
            className="!font-bold !rounded-md"
          >
            {record.type.toUpperCase()}
          </Tag>
          <span className="font-bold text-slate-900">{name}</span>
        </div>
      ),
    },
    {
      title: "Số lượng bàn",
      dataIndex: "tableCount",
      key: "tableCount",
      align: "center",
      width: 120,
      render: (count: number) => <span className="font-semibold">{count} bàn</span>,
    },
    {
      title: "Tổng giờ chơi",
      dataIndex: "totalPlayHours",
      key: "totalPlayHours",
      align: "right",
      width: 130,
      render: (hours: number) => (
        <span className="font-mono font-bold text-slate-800">{hours} giờ</span>
      ),
    },
    {
      title: "Giờ TB / Bàn",
      dataIndex: "averageHoursPerTable",
      key: "averageHoursPerTable",
      align: "right",
      width: 130,
      render: (avg: number) => (
        <span className="font-mono text-slate-600">{avg} giờ/bàn</span>
      ),
    },
    {
      title: "Tỷ lệ khai thác (Utilization)",
      dataIndex: "utilizationRate",
      key: "utilizationRate",
      align: "right",
      width: 180,
      render: (rate: number) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-bold text-slate-900 font-mono">{rate}%</span>
          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                rate >= 75
                  ? "bg-emerald-500"
                  : rate >= 50
                  ? "bg-blue-500"
                  : "bg-amber-500"
              }`}
              style={{ width: `${Math.min(100, rate)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Doanh thu tiền giờ",
      dataIndex: "tableRevenue",
      key: "tableRevenue",
      align: "right",
      width: 160,
      render: (val: number) => (
        <span className="font-mono font-semibold text-emerald-600">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      align: "right",
      width: 160,
      render: (val: number) => (
        <span className="font-mono font-black text-slate-900">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  // ── Columns Top Bàn (SCRUM-1023) ───────────────────────────────────────────
  const topTableColumns: TableColumnsType<TablePerformanceItem> = [
    {
      title: "Hạng",
      dataIndex: "rank",
      key: "rank",
      width: 80,
      align: "center",
      render: (rank: number) => {
        if (rank === 1) return <Tag color="gold" className="!font-black !px-2">#1 VÀNG</Tag>;
        if (rank === 2) return <Tag color="default" className="!font-bold !px-2">#2 BẠC</Tag>;
        if (rank === 3) return <Tag color="orange" className="!font-bold !px-2">#3 ĐỒNG</Tag>;
        return <span className="font-mono font-bold text-slate-500">#{rank}</span>;
      },
    },
    {
      title: "Tên bàn",
      key: "tableName",
      render: (_: any, record) => (
        <div>
          <div className="font-bold text-slate-900">{record.tableName}</div>
          <div className="text-xs text-slate-400 font-mono">Mã: {record.tableCode || record.tableId.slice(-4)}</div>
        </div>
      ),
    },
    {
      title: "Loại bàn",
      dataIndex: "typeName",
      key: "typeName",
      width: 160,
      render: (name: string, record) => (
        <Tag
          color={
            record.type === "pool" ? "blue" : record.type === "carom" ? "gold" : "purple"
          }
        >
          {name}
        </Tag>
      ),
    },
    {
      title: "Số lượt chơi",
      dataIndex: "sessionCount",
      key: "sessionCount",
      align: "center",
      width: 120,
      render: (count: number) => <span className="font-medium">{count} lượt</span>,
    },
    {
      title: "Tổng giờ chơi",
      dataIndex: "totalPlayHours",
      key: "totalPlayHours",
      align: "right",
      width: 130,
      render: (hours: number) => (
        <span className="font-mono font-bold text-emerald-600">{hours} giờ</span>
      ),
    },
    {
      title: "Tỷ lệ khai thác",
      dataIndex: "utilizationRate",
      key: "utilizationRate",
      align: "right",
      width: 140,
      render: (rate: number) => (
        <Tag
          color={rate >= 75 ? "green" : rate >= 50 ? "blue" : "orange"}
          className="!font-mono !font-bold"
        >
          {rate}%
        </Tag>
      ),
    },
    {
      title: "Tiền giờ",
      dataIndex: "tableRevenue",
      key: "tableRevenue",
      align: "right",
      width: 140,
      render: (val: number) => (
        <span className="font-mono text-slate-700">{val.toLocaleString("vi-VN")} đ</span>
      ),
    },
    {
      title: "Tổng doanh thu",
      dataIndex: "totalRevenue",
      key: "totalRevenue",
      align: "right",
      width: 160,
      render: (val: number) => (
        <span className="font-mono font-bold text-slate-900">
          {val.toLocaleString("vi-VN")} đ
        </span>
      ),
    },
  ];

  const TYPE_LABEL_MAP: Record<string, string> = {
    all: "Tất cả 3 loại bàn",
    pool: "Bida Lỗ (Pool)",
    carom: "Bida Phăng (Carom)",
    snooker: "Bida Thi Đấu (Snooker)",
  };

  const activeSummary = React.useMemo(() => {
    if (!data?.summary) return null;
    if (tableType === "all") return data.summary;

    const matchedType = data.typeComparison?.find((tc) => tc.type === tableType);
    if (matchedType) {
      return {
        totalTables: matchedType.tableCount,
        totalPlayHours: matchedType.totalPlayHours,
        averageUtilizationRate: matchedType.utilizationRate,
        totalRevenue: matchedType.totalRevenue,
        peakHour: data.summary.peakHour,
      };
    }
    return data.summary;
  }, [data, tableType]);

  const summary = activeSummary;

  return (
    <div className="space-y-6">
      {error && (
        <Alert
          type="error"
          title="Lỗi tải dữ liệu"
          description={error}
          showIcon
          closable={{ onClose: () => setError(null) }}
        />
      )}

      {/* Filter Bar */}
      <Card className="rounded-2xl shadow-xs border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
              Thời gian:
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
              <button
                type="button"
                onClick={() => handlePeriodChange("day")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  period === "day"
                    ? "bg-cyan-600 text-white shadow-xs"
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
                    ? "bg-cyan-600 text-white shadow-xs"
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
                    ? "bg-cyan-600 text-white shadow-xs"
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
                    ? "bg-cyan-600 text-white shadow-xs"
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
                    ? "bg-cyan-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tùy chọn
              </button>
            </div>

            {period === "custom" && (
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
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Loại bàn:
            </span>
            <div className="relative inline-flex items-center">
              <select
                id="table-type-select"
                aria-label="Chọn loại bàn bida"
                value={tableType}
                onChange={(e) => setTableType(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-3.5 pr-8 py-2 shadow-2xs outline-none hover:border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition cursor-pointer min-w-44"
              >
                <option value="all">Tất cả 3 loại bàn</option>
                <option value="pool">Bida Lỗ (Pool)</option>
                <option value="carom">Bida Phăng (Carom)</option>
                <option value="snooker">Bida Thi Đấu (Snooker)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tỷ lệ khai thác (Utilization)
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-lg">
              <ClockCircleOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-cyan-700 font-mono truncate">
            {summary?.averageUtilizationRate || 0}%
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Tổng số phút chơi / Công suất mở cửa CLB
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-cyan-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng giờ chơi thực tế
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg">
              <TableOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono truncate">
            {summary?.totalPlayHours || 0} giờ
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            {tableType === "all"
              ? `Trên tổng số ${summary?.totalTables || 0} bàn hoạt động`
              : `Trên tổng số ${summary?.totalTables || 0} bàn ${TYPE_LABEL_MAP[tableType]} hoạt động`}
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Khung giờ cao điểm nhất
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg">
              <FireOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 font-mono truncate">
            {summary?.peakHour || "19:00 - 20:00"}
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Thời điểm tỷ lệ lấp đầy bàn đạt đỉnh
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-rose-500" />
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tổng doanh thu từ bàn
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
              <DollarOutlined />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono truncate">
            {((summary?.totalRevenue || 0) / 1000000).toFixed(2)}M đ
          </div>
          <div className="text-xs text-slate-400 mt-2 truncate">
            Gồm tiền giờ và dịch vụ phát sinh tại bàn
          </div>
          <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
        </div>
      </div>

      {/* SCRUM-1024: Biểu đồ tỷ lệ lấp đầy theo khung giờ */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-base font-black text-slate-900 mb-0">
                Biểu đồ tỷ lệ lấp đầy bàn theo khung giờ trong ngày (08:00 - 24:00)
              </h3>
              {tableType !== "all" && (
                <Tag color="cyan" className="!font-bold !rounded-md">
                  Đang lọc: {TYPE_LABEL_MAP[tableType]}
                </Tag>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-0">
              Nhận diện các khung giờ vắng khách để áp dụng chính sách giảm giá kích cầu và tối ưu nhân sự phục vụ.
            </p>
          </div>
          <Tag color="cyan" className="!font-bold">Giờ mở cửa: 08:00 - 24:00</Tag>
        </div>

        <div className="h-72 relative">
          <Line data={fillRateChartData} options={fillRateChartOptions} />
        </div>
      </div>

      {/* SCRUM-1019 & SCRUM-1024: Bảng so sánh 3 loại bàn */}
      <Card className="rounded-2xl shadow-xs border-slate-200 overflow-hidden">
        <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-0.5">
              So sánh hiệu quả khai thác giữa 3 loại bàn chơi
            </h2>
            <p className="text-xs text-slate-500 mb-0">
              Đối chiếu số lượng bàn, thời lượng sử dụng và doanh thu sinh lời của từng loại bàn.
            </p>
          </div>
        </div>

        <Table<TableTypePerformance>
          columns={typeColumns}
          dataSource={
            tableType === "all"
              ? (data?.typeComparison || [])
              : (data?.typeComparison || []).filter((tc) => tc.type === tableType)
          }
          rowKey="type"
          loading={loading}
          pagination={false}
          bordered
          scroll={{ x: 750 }}
          className="border border-slate-100 rounded-xl"
        />
      </Card>

      {/* SCRUM-1023: Xếp hạng top bàn hoạt động nhiều nhất */}
      <Card className="rounded-2xl shadow-xs border-slate-200 overflow-hidden">
        <div className="pb-3 mb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-lg" />
            <h2 className="text-base font-bold text-slate-900 mb-0">
              Bảng xếp hạng hiệu suất từng bàn bida
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Sắp xếp theo tổng số giờ chơi và doanh thu giảm dần
          </span>
        </div>

        <Table<TablePerformanceItem>
          columns={topTableColumns}
          dataSource={
            tableType === "all"
              ? (data?.topTables || [])
              : (data?.topTables || []).filter((t) => t.type === tableType)
          }
          rowKey="tableId"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
          scroll={{ x: 900 }}
          className="border border-slate-100 rounded-xl"
        />
      </Card>
    </div>
  );
};

export default TablePerformanceReportPage;

