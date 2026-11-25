// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU MÀN THỰC ĐƠN & DỊCH VỤ F&B (/fnb)
// Dành cho Admin / Nhân viên quản lý kho & thực đơn:
//   FnBInventoryPage (UI & Bộ lọc)
//     -> useFnbInventory (nạp món, phân loại pha chế vs đóng gói, CRUD món)
//     -> productService (/products/*) + fetchCategories (/catalog-management/categories)
//     -> Backend: ProductController / ProductService -> emitMenuUpdated() (Socket.IO)
//     -> Đồng bộ tức thì lên PosFnbModal (/pos) & CustomerFnB (/customer/fnb)
// ============================================================================
// ── 1. IMPORTS ────────────────────────────────────────────────────────────────
import React from "react";
import { useNavigate } from "react-router-dom";
import { InboxOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Tag, Typography, message } from "../../shared/ui";
import { Spin } from "antd";

import { useFnbInventory } from "./fnb/hooks/useFnbInventory";
import { FnbCardGridView } from "./fnb/components/FnbCardGridView";
import { FnbTableView } from "./fnb/components/FnbTableView";
import { FnbKpiCards } from "./fnb/components/FnbKpiCards";
import { FnbFilterToolbar } from "./fnb/components/FnbFilterToolbar";
import { FnbItemModal } from "./fnb/modals/FnbItemModal";

// ── 2. TYPES & INTERFACES ─────────────────────────────────────────────────────
// Types are managed inside ./fnb/types/fnb.types

// ── 3. CONSTANTS & HELPERS ────────────────────────────────────────────────────
const { Title, Text } = Typography;

// ── 4. MAIN COMPONENT: TRANG QUẢN LÝ THỰC ĐƠN & DỊCH VỤ F&B (/fnb) ──────────
/**
 * Trang quản trị thực đơn đồ ăn/thức uống, cấu hình món pha chế và hàng đóng gói bán tại bàn.
 *
 * @returns {JSX.Element} Giao diện quản lý thực đơn F&B kèm KPI, bộ lọc và modal thêm/sửa món
 */
export const FnBInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    canManageInventory,
    stockList,
    dbCategories,
    loading,
    viewMode,
    setViewMode,
    selectedCategory,
    setSelectedCategory,
    stockStatusFilter,
    setStockStatusFilter,
    serviceTypeFilter,
    setServiceTypeFilter,
    photoStatusFilter,
    setPhotoStatusFilter,
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    editItemModalVisible,
    setEditItemModalVisible,
    isCreatingNew,
    editingItemData,
    setEditingItemData,
    isFilterActive,
    fnbMetrics,
    categoryPillItems,
    filteredItems,
    fetchProductsFromDb,
    handleResetFilters,
    handleToggleZeroStock,
    handleOpenCreateModal,
    handleOpenEditItemModal,
    handleSaveItemDetails,
  } = useFnbInventory();

  return (
    <div className="space-y-6 pb-12 max-w-[1440px] mx-auto">
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <InboxOutlined className="text-xl" />
              </div>
              <Title
                level={2}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
              >
                Thực Đơn Món Ăn & Thức Uống F&B
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black whitespace-nowrap">
                MENU DỊCH VỤ CLB
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 block leading-relaxed [text-wrap:balance]">
              Quản lý menu đồ ăn, thức uống, cấu hình món chế biến và kiểm soát tồn kho hàng đóng gói phục vụ tại bàn.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 whitespace-nowrap">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={() => {
                void fetchProductsFromDb(true);
                message.success("Đã làm mới danh sách thực đơn!");
              }}
              className="!rounded-xl !text-xs !text-slate-600 hover:!text-slate-900 whitespace-nowrap"
            >
              Làm mới
            </Button>
            {canManageInventory && (
              <Button
                variant="secondary"
                size="md"
                to="/inventory"
                leftIcon={<InboxOutlined />}
                className="!rounded-xl !text-xs !bg-slate-100 hover:!bg-slate-200 !text-slate-700 !font-semibold whitespace-nowrap"
              >
                Xem Kho Hàng
              </Button>
            )}
            {canManageInventory && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<PlusOutlined />}
                onClick={handleOpenCreateModal}
                className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm whitespace-nowrap"
              >
                Thêm Món Mới
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4 THẺ KPI SUMMARY CARDS (ĐỒNG BỘ DESIGN SYSTEM) ────────────────── */}
      <FnbKpiCards metrics={fnbMetrics} />

      {/* ── FILTER TOOLBAR & VIEW SWITCHER ────────────────────────────────── */}
      <FnbFilterToolbar
        categoryPillItems={categoryPillItems}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        stockStatusFilter={stockStatusFilter}
        setStockStatusFilter={setStockStatusFilter}
        serviceTypeFilter={serviceTypeFilter}
        setServiceTypeFilter={setServiceTypeFilter}
        photoStatusFilter={photoStatusFilter}
        setPhotoStatusFilter={setPhotoStatusFilter}
        sortOption={sortOption}
        setSortOption={setSortOption}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isFilterActive={isFilterActive}
        onResetFilters={handleResetFilters}
        totalFiltered={filteredItems.length}
        totalItems={stockList.length}
      />

      {/* ── MAIN CONTENT (GRID HOẶC TABLE) ─────────────────────────────────── */}
      {loading && stockList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-xs min-h-[480px] flex flex-col items-center justify-center">
          <Spin size="large" />
          <div className="mt-3 text-slate-500 font-semibold text-sm whitespace-nowrap">
            Đang tải thực đơn từ hệ thống...
          </div>
        </div>
      ) : viewMode === "grid" ? (
        <FnbCardGridView
          items={filteredItems}
          canManageInventory={canManageInventory}
          onToggleZeroStock={handleToggleZeroStock}
          onOpenEditModal={handleOpenEditItemModal}
          onNavigateToInventory={() => navigate("/inventory")}
        />
      ) : (
        <FnbTableView
          items={filteredItems}
          loading={loading}
          canManageInventory={canManageInventory}
          onToggleZeroStock={handleToggleZeroStock}
          onOpenEditModal={handleOpenEditItemModal}
          onNavigateToInventory={() => navigate("/inventory")}
        />
      )}

      {/* ── MODAL THÊM / SỬA MÓN ────────────────────────────────────────────── */}
      <FnbItemModal
        visible={editItemModalVisible}
        isCreatingNew={isCreatingNew}
        itemData={editingItemData}
        categories={dbCategories}
        stockList={stockList}
        onCancel={() => setEditItemModalVisible(false)}
        onChangeData={setEditingItemData}
        onSave={handleSaveItemDetails}
        onNavigateToInventory={() => navigate("/inventory")}
      />
    </div>
  );
};

export default FnBInventoryPage;
