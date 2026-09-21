import React, { useState, useEffect } from "react";
import { tableService, pricingService } from "../../services/table.service";
import type { BilliardTable, PricingTier } from "../../types";

const tableTypeLabels: Record<string, string> = {
  standard_9ft: "Bàn Thường 9FT",
  vip_bank_pool: "Bàn VIP Bank Pool",
  match_ksteel: "Bàn Match K-Steel",
};

const tableTypeValues = [
  { value: "standard_9ft", label: "Bàn Thường 9FT" },
  { value: "vip_bank_pool", label: "Bàn VIP Bank Pool" },
  { value: "match_ksteel", label: "Bàn Match K-Steel" },
];

const dayTypeLabels: Record<string, string> = {
  weekday: "Ngày thường (T2–T6)",
  weekend: "Cuối tuần (T7 & CN)",
  peak: "Giờ cao điểm",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  available: { label: "Hoạt động", color: "bg-green-50 text-green-700" },
  playing: { label: "Đang chơi", color: "bg-red-50 text-red-600" },
  booked: { label: "Đặt trước", color: "bg-blue-50 text-blue-600" },
  maintenance: { label: "Bảo trì", color: "bg-yellow-50 text-yellow-700" },
};

const emptyTableForm = {
  code: "",
  name: "",
  type: "standard_9ft",
  area: "",
  floor: 1,
  pricePerHour: 0,
};

const emptyPricingForm = {
  name: "",
  dayType: "weekday",
  startTime: "08:00",
  endTime: "17:00",
  standardPrice: 0,
  vipPrice: 0,
};

const TablesManagementPage = () => {
  const [activeTab, setActiveTab] = useState<"pricing" | "tables">("pricing");
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [tables, setTables] = useState<BilliardTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [tablesPerPage] = useState(6);

  // Table modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
  const [tableForm, setTableForm] = useState(emptyTableForm);
  const [tableSubmitting, setTableSubmitting] = useState(false);

  // Table delete
  const [showTableDeleteConfirm, setShowTableDeleteConfirm] = useState(false);
  const [deletingTableId, setDeletingTableId] = useState<string | null>(null);

  // Pricing modal states
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPricing, setEditingPricing] = useState<PricingTier | null>(null);
  const [pricingForm, setPricingForm] = useState(emptyPricingForm);
  const [pricingSubmitting, setPricingSubmitting] = useState(false);

  // Pricing delete
  const [showPricingDeleteConfirm, setShowPricingDeleteConfirm] = useState(false);
  const [deletingPricingId, setDeletingPricingId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tiers, tableData] = await Promise.all([
        pricingService.getAll(),
        tableService.getAll(),
      ]);
      setPricingTiers(tiers);
      setTables(tableData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(tables.length / tablesPerPage);
  const paginatedTables = tables.slice(
    (currentPage - 1) * tablesPerPage,
    currentPage * tablesPerPage
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("vi-VN").format(price) + " VND";

  const getActiveTierName = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    if (day === 0 || day === 6) return "Weekend";
    if (hour >= 17) return "Peak";
    return "Sáng";
  };

  // ─── Table CRUD ────────────────────────────────────────

  const openCreateTableModal = () => {
    setEditingTable(null);
    setTableForm(emptyTableForm);
    setShowTableModal(true);
  };

  const openEditTableModal = (table: BilliardTable) => {
    setEditingTable(table);
    setTableForm({
      code: table.code,
      name: table.name,
      type: table.type,
      area: table.area,
      floor: table.floor,
      pricePerHour: table.pricePerHour,
    });
    setShowTableModal(true);
  };

  const handleTableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTableSubmitting(true);
    try {
      if (editingTable) {
        await tableService.update(editingTable._id, tableForm);
        showToast("Cập nhật bàn thành công!", "success");
      } else {
        await tableService.create(tableForm);
        showToast("Thêm bàn mới thành công!", "success");
      }
      setShowTableModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Thao tác thất bại", "error");
    } finally {
      setTableSubmitting(false);
    }
  };

  const openTableDeleteConfirm = (id: string) => {
    setDeletingTableId(id);
    setShowTableDeleteConfirm(true);
  };

  const handleDeleteTable = async () => {
    if (!deletingTableId) return;
    try {
      await tableService.delete(deletingTableId);
      showToast("Xóa bàn thành công!", "success");
      setShowTableDeleteConfirm(false);
      setDeletingTableId(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Xóa bàn thất bại", "error");
    }
  };

  const handleToggleMaintenance = async (table: BilliardTable) => {
    const newStatus = table.status === "maintenance" ? "available" : "maintenance";
    try {
      await tableService.updateStatus(table._id, newStatus);
      showToast(
        newStatus === "maintenance"
          ? `Bàn ${table.code} đã chuyển sang trạng thái bảo trì`
          : `Bàn ${table.code} đã hoạt động trở lại`,
        "success"
      );
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Cập nhật trạng thái thất bại", "error");
    }
  };

  // ─── Pricing CRUD ──────────────────────────────────────

  const openCreatePricingModal = () => {
    setEditingPricing(null);
    setPricingForm(emptyPricingForm);
    setShowPricingModal(true);
  };

  const openEditPricingModal = (tier: PricingTier) => {
    setEditingPricing(tier);
    setPricingForm({
      name: tier.name,
      dayType: tier.dayType,
      startTime: tier.startTime,
      endTime: tier.endTime,
      standardPrice: tier.prices.standard,
      vipPrice: tier.prices.vip,
    });
    setShowPricingModal(true);
  };

  const handlePricingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPricingSubmitting(true);
    const payload = {
      name: pricingForm.name,
      dayType: pricingForm.dayType,
      startTime: pricingForm.startTime,
      endTime: pricingForm.endTime,
      prices: {
        standard: pricingForm.standardPrice,
        vip: pricingForm.vipPrice,
      },
    };
    try {
      if (editingPricing) {
        await pricingService.update(editingPricing._id, payload);
        showToast("Cập nhật bảng giá thành công!", "success");
      } else {
        await pricingService.create(payload);
        showToast("Thêm khung giờ mới thành công!", "success");
      }
      setShowPricingModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Thao tác thất bại", "error");
    } finally {
      setPricingSubmitting(false);
    }
  };

  const openPricingDeleteConfirm = (id: string) => {
    setDeletingPricingId(id);
    setShowPricingDeleteConfirm(true);
  };

  const handleDeletePricing = async () => {
    if (!deletingPricingId) return;
    try {
      await pricingService.delete(deletingPricingId);
      showToast("Xóa khung giờ thành công!", "success");
      setShowPricingDeleteConfirm(false);
      setDeletingPricingId(null);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Xóa khung giờ thất bại", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">
            Admin – Quản lý Danh mục Bàn & Cấu hình Bảng giá
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2 py-1 bg-primary-50 text-primary-700 text-xs rounded-md font-medium">
              Screen 18/21
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pricing")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "pricing"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          ⏰ Cấu hình Bảng giá Khung Giờ
        </button>
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-5 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "tables"
              ? "border-primary-500 text-primary-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          🎱 Danh Mục Bida & VIP Room
        </button>
      </div>

      {/* Active tier notification */}
      <div className="flex items-center justify-end">
        <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          Áp dụng bảng giá thời gian thực: Khung Giờ {getActiveTierName()}
        </span>
      </div>

      {/* Pricing Tab */}
      {activeTab === "pricing" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Pricing tiers */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-navy-800">Khung Giờ & Bảng Giá Áp Dụng</h3>
                <p className="text-xs text-gray-500 mt-1">Quy định mức thu cước theo các khung giờ và loại bàn</p>
              </div>
              <button
                onClick={openCreatePricingModal}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
              >
                + Thêm Khung Giờ
              </button>
            </div>

            <div className="space-y-4">
              {pricingTiers.map((tier, index) => (
                <div
                  key={tier._id}
                  className={`border rounded-xl p-5 transition ${
                    tier.isCurrentlyActive
                      ? "border-primary-300 bg-primary-50/30"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary-500 text-white rounded-lg flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <div>
                        <h4 className="font-semibold text-sm text-navy-800">{tier.name}</h4>
                        <p className="text-xs text-gray-500">
                          {tier.dayType === "weekday"
                            ? "T2 – T6"
                            : tier.dayType === "weekend"
                            ? "T7 & CN"
                            : "T2 – T6"}
                          : {tier.startTime} – {tier.endTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tier.isCurrentlyActive && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          Đang áp dụng
                        </span>
                      )}
                      {tier.dayType === "peak" && (
                        <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
                          GIỜ VÀNG CLB
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Bàn Thường (9FT Rasson)</p>
                      <p className="text-lg font-bold text-navy-800">
                        {formatPrice(tier.prices.standard)}
                        <span className="text-xs font-normal text-gray-500"> / giờ</span>
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">Bàn VIP Bank Pool (K-Steel)</p>
                      <p className="text-lg font-bold text-primary-600">
                        {formatPrice(tier.prices.vip)}
                        <span className="text-xs font-normal text-gray-500"> / giờ</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400">
                      {tier.dayType === "weekday"
                        ? "⚙️ Áp dụng từ thứ 2 đến thứ 6"
                        : tier.dayType === "weekend"
                        ? "📅 Tự động kích hoạt Thứ 7 & Chủ Nhật"
                        : "⚡ Khung giờ hiện hành theo thời gian hệ thống"}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => openEditPricingModal(tier)}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        onClick={() => openPricingDeleteConfirm(tier._id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Rounding rule */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
              <div className="flex items-start gap-3">
                <span className="text-yellow-600 mt-0.5">💡</span>
                <div>
                  <p className="text-sm font-medium text-yellow-800">Quy tắc làm tròn:</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Sau 15 phút đầu tiên tính block tiêu chuẩn 1 phút, tiền giờ tự động nhân theo đơn giá của khung giờ tương ứng mà bàn đang mở.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Tables list */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold text-navy-800">
                  Danh sách {tables.length} Bàn Bida tại CLB
                </h3>
                <p className="text-xs text-gray-500 mt-1">Cấu hình phân loại thiết bị, phòng bàn và gán bảng giá</p>
              </div>
              <button
                onClick={openCreateTableModal}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
              >
                <span>+</span> Thêm Bàn Mới
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="pb-3 pr-4">Mã Bàn</th>
                    <th className="pb-3 pr-4">Khu vực</th>
                    <th className="pb-3 pr-4">Loại Bàn</th>
                    <th className="pb-3 pr-4">Khung Giá</th>
                    <th className="pb-3 pr-4">Đơn Giá (VND/h)</th>
                    <th className="pb-3 pr-4">Trạng thái</th>
                    <th className="pb-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedTables.map((table) => (
                    <tr key={table._id} className="hover:bg-gray-50 transition">
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-sm text-navy-800">{table.code}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-600">{table.area}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-600">
                          {tableTypeLabels[table.type] || table.type}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm text-gray-600">Khung Giờ Tối Peak</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-semibold text-primary-600">
                          {formatPrice(table.pricePerHour)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            statusLabels[table.status]?.color || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              table.status === "available"
                                ? "bg-green-500"
                                : table.status === "playing"
                                ? "bg-red-500"
                                : table.status === "booked"
                                ? "bg-blue-500"
                                : "bg-yellow-500"
                            }`}
                          ></span>
                          {statusLabels[table.status]?.label || table.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditTableModal(table)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                          >
                            Sửa
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleToggleMaintenance(table)}
                            className={`text-sm font-medium ${
                              table.status === "maintenance"
                                ? "text-green-600 hover:text-green-700"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {table.status === "maintenance" ? "Khôi phục" : "Bảo trì"}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => openTableDeleteConfirm(table._id)}
                            className="text-sm text-red-500 hover:text-red-700 font-medium"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>
                Hiển thị {(currentPage - 1) * tablesPerPage + 1} -{" "}
                {Math.min(currentPage * tablesPerPage, tables.length)} trong tổng số{" "}
                {tables.length} bàn tại CLB
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      page === currentPage
                        ? "bg-primary-500 text-white"
                        : "border border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tables tab */}
      {activeTab === "tables" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-navy-800">Danh mục bàn Bida & VIP Room</h3>
            <button
              onClick={openCreateTableModal}
              className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition"
            >
              + Thêm bàn mới
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table._id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-navy-800">{table.code}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      statusLabels[table.status]?.color || "bg-gray-100"
                    }`}
                  >
                    {statusLabels[table.status]?.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{table.area}</p>
                <p className="text-sm text-gray-500">{tableTypeLabels[table.type]}</p>
                <p className="mt-2 text-lg font-bold text-primary-600">
                  {formatPrice(table.pricePerHour)}
                  <span className="text-xs font-normal text-gray-500"> / giờ</span>
                </p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditTableModal(table)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Sửa
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => handleToggleMaintenance(table)}
                    className={`text-sm font-medium ${
                      table.status === "maintenance"
                        ? "text-green-600 hover:text-green-700"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {table.status === "maintenance" ? "Khôi phục" : "Bảo trì"}
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    onClick={() => openTableDeleteConfirm(table._id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium"
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          🔒 Mọi thay đổi về đơn giá khung giờ sẽ lập tức áp dụng cho các bàn mở phiên chơi mới tiếp theo.
        </p>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
            Hủy thay đổi
          </button>
          <button className="px-5 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition">
            ✓ Lưu Cấu Hình Bảng Giá
          </button>
        </div>
      </div>

      {/* ═══════════════ TABLE MODAL ═══════════════ */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTableModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1B365D]">
                {editingTable ? "Chỉnh sửa Bàn" : "Thêm Bàn Mới"}
              </h3>
            </div>
            <form onSubmit={handleTableSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã Bàn *</label>
                  <input
                    type="text"
                    required
                    value={tableForm.code}
                    onChange={(e) => setTableForm({ ...tableForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="VD: B01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên Bàn *</label>
                  <input
                    type="text"
                    required
                    value={tableForm.name}
                    onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="VD: Bàn số 1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại Bàn *</label>
                  <select
                    required
                    value={tableForm.type}
                    onChange={(e) => setTableForm({ ...tableForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                  >
                    {tableTypeValues.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực *</label>
                  <input
                    type="text"
                    required
                    value={tableForm.area}
                    onChange={(e) => setTableForm({ ...tableForm, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="VD: Tầng 1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tầng</label>
                  <input
                    type="number"
                    min="1"
                    value={tableForm.floor}
                    onChange={(e) => setTableForm({ ...tableForm, floor: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn Giá / Giờ (VND) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={tableForm.pricePerHour}
                    onChange={(e) => setTableForm({ ...tableForm, pricePerHour: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowTableModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={tableSubmitting}
                  className="px-4 py-2 bg-[#D96B27] hover:bg-[#c45f22] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {tableSubmitting ? "Đang lưu..." : editingTable ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ TABLE DELETE CONFIRM ═══════════ */}
      {showTableDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowTableDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-[#1B365D] mb-2">Xác nhận xóa bàn</h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa bàn này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowTableDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeleteTable}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ PRICING MODAL ═══════════════ */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPricingModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-[#1B365D]">
                {editingPricing ? "Chỉnh sửa Khung Giờ" : "Thêm Khung Giờ Mới"}
              </h3>
            </div>
            <form onSubmit={handlePricingSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Khung Giờ *</label>
                <input
                  type="text"
                  required
                  value={pricingForm.name}
                  onChange={(e) => setPricingForm({ ...pricingForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                  placeholder="VD: Khung giờ cao điểm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại Ngày *</label>
                <select
                  required
                  value={pricingForm.dayType}
                  onChange={(e) => setPricingForm({ ...pricingForm, dayType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                >
                  <option value="weekday">{dayTypeLabels.weekday}</option>
                  <option value="weekend">{dayTypeLabels.weekend}</option>
                  <option value="peak">{dayTypeLabels.peak}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ Bắt Đầu *</label>
                  <input
                    type="time"
                    required
                    value={pricingForm.startTime}
                    onChange={(e) => setPricingForm({ ...pricingForm, startTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ Kết Thúc *</label>
                  <input
                    type="time"
                    required
                    value={pricingForm.endTime}
                    onChange={(e) => setPricingForm({ ...pricingForm, endTime: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá Bàn Thường (VND/h) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pricingForm.standardPrice}
                    onChange={(e) => setPricingForm({ ...pricingForm, standardPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá Bàn VIP (VND/h) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pricingForm.vipPrice}
                    onChange={(e) => setPricingForm({ ...pricingForm, vipPrice: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B27]/30 focus:border-[#D96B27]"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowPricingModal(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pricingSubmitting}
                  className="px-4 py-2 bg-[#D96B27] hover:bg-[#c45f22] text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
                >
                  {pricingSubmitting ? "Đang lưu..." : editingPricing ? "Cập nhật" : "Thêm mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ PRICING DELETE CONFIRM ═══════════ */}
      {showPricingDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowPricingDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-bold text-[#1B365D] mb-2">Xác nhận xóa khung giờ</h3>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa khung giờ này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowPricingDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDeletePricing}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TablesManagementPage;
