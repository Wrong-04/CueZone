import React, { useState, useEffect, useCallback, useMemo } from "react";
import dayjs, { Dayjs } from "dayjs";
import {
  FileExcelOutlined,
  ReloadOutlined,
  SearchOutlined,
  InboxOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  DeleteOutlined,
  DollarOutlined,
  ShoppingOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  Tag,
  DatePicker,
  Alert,
  message,
  type TableColumnsType,
} from "../../shared/ui";
import {
  inventoryReportService,
  type InventoryReportItem,
  type InventoryReportResponse,
} from "../../services/inventory-report.service";

const { RangePicker } = DatePicker;

export const InventoryReportPage: React.FC = () => {
  // Dates: Mặc định tháng hiện tại
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("day"),
  ]);

  const [category, setCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryReportResponse | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fromDate = dateRange[0].startOf("day").toISOString();
      const toDate = dateRange[1].endOf("day").toISOString();

      const result = await inventoryReportService.getReport({
        fromDate,
        toDate,
        category: category !== "all" ? category : undefined,
        search: searchTerm.trim() || undefined,
      });

      setData(result);
    } catch (err: any) {
      console.error("Lỗi tải báo cáo Xuất Nhập Tồn:", err);
      setError(
        err?.response?.data?.message ||
          "Không thể tải dữ liệu báo cáo Xuất – Nhập – Tồn. Vui lòng thử lại sau.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, category, searchTerm]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const fromDate = dateRange[0].startOf("day").toISOString();
      const toDate = dateRange[1].endOf("day").toISOString();

      await inventoryReportService.exportExcel({
        fromDate,
        toDate,
        category: category !== "all" ? category : undefined,
        search: searchTerm.trim() || undefined,
      });

      message.success("Xuất báo cáo Excel thành công!");
    } catch (err: any) {
      console.error("Lỗi xuất Excel:", err);
      message.error(err?.response?.data?.message || "Không thể xuất file Excel. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const setPresetRange = (preset: "today" | "7days" | "thisMonth") => {
    if (preset === "today") {
      setDateRange([dayjs().startOf("day"), dayjs().endOf("day")]);
    } else if (preset === "7days") {
      setDateRange([dayjs().subtract(6, "day").startOf("day"), dayjs().endOf("day")]);
    } else if (preset === "thisMonth") {
      setDateRange([dayjs().startOf("month"), dayjs().endOf("day")]);
    }
  };

  const isPresetActive = (preset: "today" | "7days" | "thisMonth") => {
    const start = dateRange[0].format("YYYY-MM-DD");
    const end = dateRange[1].format("YYYY-MM-DD");
    if (preset === "today") {
      return start === dayjs().format("YYYY-MM-DD") && end === dayjs().format("YYYY-MM-DD");
    }
    if (preset === "7days") {
      return start === dayjs().subtract(6, "day").format("YYYY-MM-DD") && end === dayjs().format("YYYY-MM-DD");
    }
    if (preset === "thisMonth") {
      return start === dayjs().startOf("month").format("YYYY-MM-DD") && end === dayjs().format("YYYY-MM-DD");
    }
    return false;
  };

  const getCategoryTag = (cat: string) => {
    const map: Record<string, { label: string; color: string }> = {
      accessory: { label: "Phụ kiện", color: "purple" },
      drink: { label: "Đồ uống", color: "blue" },
      food: { label: "Thức ăn", color: "gold" },
      snack: { label: "Đồ ăn nhẹ", color: "orange" },
      ingredient: { label: "Nguyên liệu", color: "cyan" },
    };
    const info = map[cat] || { label: cat || "Khác", color: "default" };
    return <Tag color={info.color}>{info.label}</Tag>;
  };

  const columns: TableColumnsType<InventoryReportItem> = useMemo(
    () => [
      {
        title: "STT",
        key: "index",
        width: 50,
        align: "center",
        render: (_: any, __: any, index: number) => (
          <span className="text-xs text-slate-400 font-mono">{index + 1}</span>
        ),
      },
      {
        title: "Mã SKU",
        dataIndex: "sku",
        key: "sku",
        width: 100,
        render: (sku: string) => (
          <span className="font-mono font-bold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {sku}
          </span>
        ),
      },
      {
        title: "Tên hàng hóa",
        dataIndex: "name",
        key: "name",
        render: (name: string, record) => (
          <div className="min-w-[140px]">
            <div className="font-medium text-slate-900 text-sm leading-snug">{name}</div>
            <div className="text-[11px] text-slate-400">ĐVT: {record.unit}</div>
          </div>
        ),
      },
      {
        title: "Loại",
        dataIndex: "category",
        key: "category",
        width: 110,
        align: "center",
        render: (cat: string) => getCategoryTag(cat),
      },
      {
        title: "Tồn đầu",
        dataIndex: "openingStock",
        key: "openingStock",
        align: "right",
        width: 85,
        render: (val: number) => (
          <span className="font-semibold text-slate-700 font-mono text-xs">
            {val.toLocaleString("vi-VN")}
          </span>
        ),
      },
      {
        title: "Nhập kỳ",
        dataIndex: "inStock",
        key: "inStock",
        align: "right",
        width: 90,
        render: (val: number) => (
          <span className={`font-mono text-xs ${val > 0 ? "font-bold text-emerald-600" : "text-slate-400"}`}>
            {val > 0 ? `+${val.toLocaleString("vi-VN")}` : 0}
          </span>
        ),
      },
      {
        title: "Xuất bán",
        dataIndex: "outStock",
        key: "outStock",
        align: "right",
        width: 90,
        render: (val: number) => (
          <span className={`font-mono text-xs ${val > 0 ? "font-bold text-blue-600" : "text-slate-400"}`}>
            {val > 0 ? `-${val.toLocaleString("vi-VN")}` : 0}
          </span>
        ),
      },
      {
        title: "Xuất hủy",
        dataIndex: "wasteStock",
        key: "wasteStock",
        align: "right",
        width: 95,
        render: (val: number) => (
          <span className={`font-mono text-xs ${val > 0 ? "font-bold text-rose-600" : "text-slate-400"}`}>
            {val > 0 ? `-${val.toLocaleString("vi-VN")}` : 0}
          </span>
        ),
      },
      {
        title: "Tồn cuối",
        dataIndex: "closingStock",
        key: "closingStock",
        align: "right",
        width: 95,
        render: (val: number) => (
          <span
            className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
              val <= 5 ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {val.toLocaleString("vi-VN")}
          </span>
        ),
      },
      {
        title: "Đơn giá vốn",
        dataIndex: "costPrice",
        key: "costPrice",
        align: "right",
        width: 110,
        render: (val: number) => (
          <span className="text-slate-600 font-mono text-xs">
            {val.toLocaleString("vi-VN")} đ
          </span>
        ),
      },
      {
        title: "Giá trị tồn cuối",
        dataIndex: "closingValue",
        key: "closingValue",
        align: "right",
        width: 130,
        render: (val: number) => (
          <span className="font-bold text-emerald-700 font-mono text-xs">
            {val.toLocaleString("vi-VN")} đ
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5 p-2 sm:p-5 max-w-[1440px] mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <BarChartOutlined className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-0.5">
              Báo cáo Xuất – Nhập – Tồn
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mb-0">
              Đối soát biến động cân đối kho, xuất hủy phụ kiện và giá trị tồn hàng hóa định kỳ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchReport}
            loading={loading}
            className="rounded-xl hover:border-emerald-500 font-medium"
          >
            Làm mới
          </Button>

          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            onClick={handleExportExcel}
            loading={exporting}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none font-bold text-white shadow-sm shadow-emerald-600/20"
          >
            Excel
          </Button>
        </div>
      </div>

      {error && (
        <Alert
          type="error"
          title="Lỗi tải dữ liệu"
          description={error}
          showIcon
          closable={{ onClose: () => setError(null) }}
          className="rounded-xl"
        />
      )}

      {/* Filter Toolbar */}
      <Card className="rounded-2xl shadow-xs border-slate-200/90 bg-white">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          {/* Quick presets & RangePicker */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Thời gian:
            </span>
            <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50 gap-0.5">
              <button
                type="button"
                onClick={() => setPresetRange("today")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isPresetActive("today")
                    ? "bg-white shadow-xs text-emerald-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("7days")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isPresetActive("7days")
                    ? "bg-white shadow-xs text-emerald-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                7 ngày qua
              </button>
              <button
                type="button"
                onClick={() => setPresetRange("thisMonth")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  isPresetActive("thisMonth")
                    ? "bg-white shadow-xs text-emerald-700 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tháng này
              </button>
            </div>

            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              className="w-64 rounded-xl"
            />
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={category}
              onChange={setCategory}
              className="w-40"
              options={[
                { label: "Tất cả loại hàng", value: "all" },
                { label: "Phụ kiện", value: "accessory" },
                { label: "Đồ uống", value: "drink" },
                { label: "Thức ăn", value: "food" },
                { label: "Đồ ăn nhẹ", value: "snack" },
                { label: "Nguyên liệu", value: "ingredient" },
              ]}
            />

            <Input
              placeholder="Tìm theo tên hoặc SKU..."
              prefix={<SearchOutlined className="text-slate-400" />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={fetchReport}
              className="w-64 rounded-xl"
              allowClear
            />
          </div>
        </div>
      </Card>

      {/* 6 Harmonized KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Card 1: Mặt hàng */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Mặt hàng
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm">
              <ShoppingOutlined />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {data?.summary?.totalProducts || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Trong danh mục</div>
        </div>

        {/* Card 2: Tồn đầu kỳ */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
              Tồn đầu kỳ
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-sm">
              <InboxOutlined />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 font-mono">
            {(data?.summary?.totalOpeningStock || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Số lượng đầu kỳ</div>
        </div>

        {/* Card 3: Nhập trong kỳ */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/70 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
              Nhập trong kỳ
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
              <ArrowUpOutlined />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {(data?.summary?.totalInStock || 0) > 0 ? "+" : ""}
            {(data?.summary?.totalInStock || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-emerald-600/80 mt-1">Qua phiếu nhập</div>
        </div>

        {/* Card 4: Xuất bán */}
        <div className="bg-white rounded-2xl p-4 border border-blue-200/70 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">
              Xuất bán POS
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
              <ArrowDownOutlined />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-600 font-mono">
            {(data?.summary?.totalOutStock || 0) > 0 ? "-" : ""}
            {(data?.summary?.totalOutStock || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-blue-600/80 mt-1">Theo hóa đơn bán lẻ</div>
        </div>

        {/* Card 5: Xuất hủy */}
        <div className="bg-white rounded-2xl p-4 border border-rose-200/70 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wide">
              Xuất hủy / Hao
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
              <DeleteOutlined />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {(data?.summary?.totalWasteStock || 0) > 0 ? "-" : ""}
            {(data?.summary?.totalWasteStock || 0).toLocaleString("vi-VN")}
          </div>
          <div className="text-[11px] text-rose-600/80 mt-1">Hao mòn, cơ lơ hỏng</div>
        </div>

        {/* Card 6: Giá trị tồn cuối */}
        <div className="bg-white rounded-2xl p-4 border border-teal-200/70 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
              Giá trị tồn cuối
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-sm">
              <DollarOutlined />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-700 font-mono tracking-tight">
            {((data?.summary?.totalClosingValue || 0) / 1000000).toFixed(2)}M đ
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {(data?.summary?.totalClosingStock || 0).toLocaleString("vi-VN")} đơn vị tồn
          </div>
        </div>
      </div>

      {/* Main Table */}
      <Card className="rounded-2xl shadow-xs border-slate-200/90 overflow-hidden bg-white">
        <div className="pb-3 mb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 mb-0">
              Bảng tổng hợp chi tiết theo mã SKU
            </h2>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {data?.items?.length || 0} sản phẩm
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Dữ liệu tổng hợp theo thời gian thực từ sổ cái kho
          </span>
        </div>

        <Table<InventoryReportItem>
          columns={columns}
          dataSource={data?.items || []}
          rowKey="productId"
          loading={loading}
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ["15", "30", "50", "100"],
            showTotal: (total, range) =>
              `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} mặt hàng`,
          }}
          scroll={{ x: 1050 }}
          bordered
          className="border border-slate-100 rounded-xl"
          summary={(pageData) => {
            let totalOpening = 0;
            let totalIn = 0;
            let totalOut = 0;
            let totalWaste = 0;
            let totalClosing = 0;
            let totalValue = 0;

            pageData.forEach((row) => {
              totalOpening += row.openingStock || 0;
              totalIn += row.inStock || 0;
              totalOut += row.outStock || 0;
              totalWaste += row.wasteStock || 0;
              totalClosing += row.closingStock || 0;
              totalValue += row.closingValue || 0;
            });

            return (
              <Table.Summary.Row className="bg-slate-50/80 font-bold text-xs">
                <Table.Summary.Cell index={0} colSpan={4} className="text-right pr-4 font-bold text-slate-700">
                  Tổng trang này:
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} className="text-right font-mono text-slate-800">
                  {totalOpening.toLocaleString("vi-VN")}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} className="text-right font-mono text-emerald-600">
                  {totalIn > 0 ? `+${totalIn.toLocaleString("vi-VN")}` : 0}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={3} className="text-right font-mono text-blue-600">
                  {totalOut > 0 ? `-${totalOut.toLocaleString("vi-VN")}` : 0}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} className="text-right font-mono text-rose-600">
                  {totalWaste > 0 ? `-${totalWaste.toLocaleString("vi-VN")}` : 0}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} className="text-right font-mono text-emerald-800">
                  {totalClosing.toLocaleString("vi-VN")}
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6} className="text-right font-mono text-slate-400">
                  —
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7} className="text-right font-mono text-emerald-700">
                  {totalValue.toLocaleString("vi-VN")} đ
                </Table.Summary.Cell>
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default InventoryReportPage;
