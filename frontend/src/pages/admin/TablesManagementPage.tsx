// ── 1. IMPORTS ────────────────────────────────────────────────────────────────
import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PlusOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, Card, Tag, Typography, SegmentedPillList } from "../../shared/ui";

import { useTablesData } from "./tables/hooks/useTablesData";
import { TablesKpiCards } from "./tables/components/TablesKpiCards";
import { TableTableView } from "./tables/components/TableTableView";
import { TablePricingTierView } from "./tables/components/TablePricingTierView";
import { TableFormModal } from "./tables/modals/TableFormModal";
import { PricingTierModal } from "./tables/modals/PricingTierModal";
import { DeleteConfirmModal } from "./tables/modals/DeleteConfirmModal";

import { formatActivePricingLabel } from "./tables/types/tables.types";

// ── 2. TYPES & INTERFACES ─────────────────────────────────────────────────────
// Types are imported from ./tables/types/tables.types

// ── 3. CONSTANTS & HELPERS ────────────────────────────────────────────────────
const { Title, Text } = Typography;

// ── 4. MAIN COMPONENT ─────────────────────────────────────────────────────────
export const TablesManagementPage: React.FC = () => {
  const navigate = useNavigate();

  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    currentPage,
    setCurrentPage,
    pageSize,
    tables,
    pricingTiers,
    loading,
    saving,
    currentTime,
    filterType,
    setFilterType,
    filterFloor,
    setFilterFloor,
    filterArea,
    setFilterArea,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    timelineDayFilter,
    setTimelineDayFilter,
    tableModalVisible,
    setTableModalVisible,
    editingTable,
    tableCode,
    setTableCode,
    tableName,
    setTableName,
    tableType,
    setTableType,
    tableArea,
    tableFloor,
    setTableFloor,
    tablePrice,
    pricingModalVisible,
    setPricingModalVisible,
    editingPricing,
    pricingName,
    setPricingName,
    pricingDayType,
    setPricingDayType,
    pricingStartTime,
    setPricingStartTime,
    pricingEndTime,
    setPricingEndTime,
    pricingStandardPrice,
    setPricingStandardPrice,
    pricingVipPrice,
    setPricingVipPrice,
    pricingMatchPrice,
    setPricingMatchPrice,
    pricingIsActive,
    setPricingIsActive,
    deleteConfirmVisible,
    setDeleteConfirmVisible,
    deleteTarget,
    setDeleteTarget,
    activePricingTier,
    distinctFloors,
    distinctAreas,
    stats,
    filteredTables,
    isFiltering,
    timelineSegments,
    handleResetFilters,
    handleSelectArea,
    handleOpenAddTable,
    handleOpenEditTable,
    handleSaveTable,
    handleToggleMaintenance,
    handleOpenAddPricing,
    handleOpenEditPricing,
    handleSavePricing,
    handleToggleTierActive,
    handleConfirmDelete,
  } = useTablesData();

  // Tab Pills
  const tabPills = useMemo(() => {
    return [
      { key: "tables", label: "Danh Sách Bàn", count: tables.length },
      { key: "pricing", label: "Bảng Giá Theo Khung Giờ", count: pricingTiers.length },
    ];
  }, [tables.length, pricingTiers.length]);

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* ── 1. Page Header & Command Bar ── */}
      <Card
        styles={{ body: { padding: 0 } }}
        className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden"
      >
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Title
                level={3}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight whitespace-nowrap"
              >
                Quản Lý Bàn & Bảng Giá
              </Title>
              <Tag
                color="green"
                className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold !m-0 whitespace-nowrap"
              >
                {activePricingTier
                  ? `Đang áp dụng: ${formatActivePricingLabel(activePricingTier)}`
                  : "Biểu giá chuẩn bàn"}
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500 block leading-relaxed [text-wrap:balance]">
              Quản lý danh sách bàn bida, phân khu và thiết lập đơn giá giờ chơi theo khung giờ
            </Text>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap whitespace-nowrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs whitespace-nowrap"
            >
              Mở Sơ Đồ Bàn POS
            </Button>

            {activeTab === "tables" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddTable}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
              >
                Thêm Bàn Mới
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAddPricing}
                leftIcon={<PlusOutlined />}
                className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs whitespace-nowrap"
              >
                Thêm Khung Giờ Mới
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 py-2.5 bg-slate-50/70">
          <SegmentedPillList
            items={tabPills}
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          />
        </div>
      </Card>

      {/* ── 2. Content theo Tab ── */}
      {activeTab === "tables" && (
        <div className="space-y-4">
          {/* 5 Thẻ KPI Đồng Bộ Design System */}
          <TablesKpiCards stats={stats} />

          {/* Bảng Danh Sách Bàn / Sơ Đồ Sàn */}
          <TableTableView
            tables={tables}
            filteredTables={filteredTables}
            loading={loading}
            viewMode={viewMode}
            setViewMode={setViewMode}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            pageSize={pageSize}
            filterType={filterType}
            setFilterType={setFilterType}
            filterFloor={filterFloor}
            setFilterFloor={setFilterFloor}
            filterArea={filterArea}
            setFilterArea={setFilterArea}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            distinctFloors={distinctFloors}
            distinctAreas={distinctAreas}
            isFiltering={isFiltering}
            onResetFilters={handleResetFilters}
            onOpenEditTable={handleOpenEditTable}
            onToggleMaintenance={handleToggleMaintenance}
            onOpenDeleteConfirm={(table) => {
              setDeleteTarget({
                id: table._id,
                type: "table",
                name: `${table.name} (${table.code})`,
              });
              setDeleteConfirmVisible(true);
            }}
          />
        </div>
      )}

      {activeTab === "pricing" && (
        <TablePricingTierView
          pricingTiers={pricingTiers}
          activePricingTier={activePricingTier}
          currentTime={currentTime}
          timelineDayFilter={timelineDayFilter}
          setTimelineDayFilter={setTimelineDayFilter}
          timelineSegments={timelineSegments}
          onOpenEditPricing={handleOpenEditPricing}
          onToggleTierActive={handleToggleTierActive}
          onOpenDeleteConfirm={(tier) => {
            setDeleteTarget({ id: tier._id, type: "pricing", name: tier.name });
            setDeleteConfirmVisible(true);
          }}
        />
      )}

      {/* ── 3. Modals ── */}
      <TableFormModal
        visible={tableModalVisible}
        onCancel={() => setTableModalVisible(false)}
        editingTable={editingTable}
        tableCode={tableCode}
        setTableCode={setTableCode}
        tableName={tableName}
        setTableName={setTableName}
        tableType={tableType}
        setTableType={setTableType}
        tableFloor={tableFloor}
        setTableFloor={setTableFloor}
        tableArea={tableArea}
        onSelectArea={handleSelectArea}
        tablePrice={tablePrice}
        saving={saving}
        distinctFloors={distinctFloors}
        onSave={handleSaveTable}
      />

      <PricingTierModal
        visible={pricingModalVisible}
        onCancel={() => setPricingModalVisible(false)}
        editingPricing={editingPricing}
        pricingName={pricingName}
        setPricingName={setPricingName}
        pricingDayType={pricingDayType}
        setPricingDayType={setPricingDayType}
        pricingIsActive={pricingIsActive}
        setPricingIsActive={setPricingIsActive}
        pricingStartTime={pricingStartTime}
        setPricingStartTime={setPricingStartTime}
        pricingEndTime={pricingEndTime}
        setPricingEndTime={setPricingEndTime}
        pricingStandardPrice={pricingStandardPrice}
        setPricingStandardPrice={setPricingStandardPrice}
        pricingVipPrice={pricingVipPrice}
        setPricingVipPrice={setPricingVipPrice}
        pricingMatchPrice={pricingMatchPrice}
        setPricingMatchPrice={setPricingMatchPrice}
        saving={saving}
        onSave={handleSavePricing}
      />

      <DeleteConfirmModal
        visible={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        deleteTarget={deleteTarget}
        saving={saving}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default TablesManagementPage;
