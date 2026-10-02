import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppstoreOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  BulbOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  Table,
  Modal,
  Space,
  SegmentedPillList,
  SearchFilterInput,
  message,
} from "../../shared/ui";
import type { BilliardTable, PricingTier, TableType } from "../../types";

const { Title, Text } = Typography;

// Initial 11 tables matching CueZone Billiards Club floor
const DEFAULT_TABLES: BilliardTable[] = [
  {
    _id: "TB-01",
    code: "T01",
    name: "Bàn 01",
    type: "standard_9ft",
    area: "Tầng 1 - Khu A (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "playing",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-02",
    code: "T02",
    name: "Bàn 02",
    type: "standard_9ft",
    area: "Tầng 1 - Khu A (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "available",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-03",
    code: "T03",
    name: "Bàn 03",
    type: "standard_9ft",
    area: "Tầng 1 - Khu A (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "playing",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-05",
    code: "T05",
    name: "Bàn 05",
    type: "standard_9ft",
    area: "Tầng 1 - Khu B (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "available",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-06",
    code: "T06",
    name: "Bàn 06",
    type: "standard_9ft",
    area: "Tầng 1 - Khu B (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "booked",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-08",
    code: "T08",
    name: "Bàn 08",
    type: "standard_9ft",
    area: "Tầng 1 - Khu B (Standard Floor)",
    floor: 1,
    pricePerHour: 50000,
    status: "maintenance",
    isActive: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-09",
    code: "V09",
    name: "Bàn VIP 09",
    type: "vip_bank_pool",
    area: "Tầng 2 - Phòng VIP Lounge",
    floor: 2,
    pricePerHour: 70000,
    status: "playing",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-10",
    code: "V10",
    name: "Bàn VIP 10",
    type: "vip_bank_pool",
    area: "Tầng 2 - Phòng VIP Lounge",
    floor: 2,
    pricePerHour: 70000,
    status: "available",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-12",
    code: "V12",
    name: "Bàn VIP 12",
    type: "vip_bank_pool",
    area: "Tầng 2 - Phòng VIP Lounge",
    floor: 2,
    pricePerHour: 70000,
    status: "available",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-13",
    code: "M13",
    name: "Bàn Match 13",
    type: "match_ksteel",
    area: "Tầng 2 - Khán Đài Thi Đấu K-Steel VAR",
    floor: 2,
    pricePerHour: 80000,
    status: "playing",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "TB-14",
    code: "M14",
    name: "Bàn Match 14",
    type: "match_ksteel",
    area: "Tầng 2 - Khán Đài Thi Đấu K-Steel VAR",
    floor: 2,
    pricePerHour: 80000,
    status: "available",
    isActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

// Initial 4 Club Pricing Tiers
const DEFAULT_PRICING_TIERS: PricingTier[] = [
  {
    _id: "PT-01",
    name: "Khung Giờ Sáng (Tập Luyện & Học Sinh/SV)",
    dayType: "weekday",
    startTime: "08:00",
    endTime: "14:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: {
      standard: 40000,
      vip: 60000,
    },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "PT-02",
    name: "Khung Giờ Tiêu Chuẩn (Buổi Chiều)",
    dayType: "weekday",
    startTime: "14:00",
    endTime: "18:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: {
      standard: 50000,
      vip: 70000,
    },
    isActive: true,
    isCurrentlyActive: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "PT-03",
    name: "Khung Giờ Vàng (Peak Evening)",
    dayType: "peak",
    startTime: "18:00",
    endTime: "23:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    prices: {
      standard: 60000,
      vip: 85000,
    },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
  {
    _id: "PT-04",
    name: "Khung Giờ Cuối Tuần & Lễ (Weekend All Day)",
    dayType: "weekend",
    startTime: "08:00",
    endTime: "23:59",
    daysOfWeek: [0, 6],
    prices: {
      standard: 60000,
      vip: 90000,
    },
    isActive: true,
    isCurrentlyActive: false,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

export const TablesManagementPage: React.FC = () => {
  const navigate = useNavigate();

  // Active Tab: tables | pricing | automation
  const [activeTab, setActiveTab] = useState<string>("tables");

  // Load Tables
  const [tables, setTables] = useState<BilliardTable[]>(() => {
    const saved = localStorage.getItem("cuezone_tables_catalog");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_TABLES;
  });

  // Load Pricing Tiers
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>(() => {
    const saved = localStorage.getItem("cuezone_pricing_tiers");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return DEFAULT_PRICING_TIERS;
  });

  // Persist Tables & Sync with POS
  useEffect(() => {
    localStorage.setItem("cuezone_tables_catalog", JSON.stringify(tables));

    // Also sync to cuezone_pos_tables if already exists
    const posRaw = localStorage.getItem("cuezone_pos_tables");
    if (posRaw) {
      try {
        const currentPosTables = JSON.parse(posRaw);
        const updatedPos = tables.map((t) => {
          const existing = currentPosTables.find((pt: any) => pt.id === t._id || pt.code === t.code);
          return {
            id: t._id,
            name: t.name,
            code: t.code,
            type: t.type === "standard_9ft" ? "standard" : t.type === "vip_bank_pool" ? "vip" : "match",
            typeName:
              t.type === "standard_9ft"
                ? "Bàn Thường 9FT"
                : t.type === "vip_bank_pool"
                ? "Bàn VIP Bank Pool"
                : "Bàn Match K-Steel (VAR)",
            pricePerHour: t.pricePerHour,
            status: t.status === "maintenance" ? "maintenance" : existing?.status || "available",
            currentSession: existing?.currentSession,
            bookedInfo: existing?.bookedInfo,
          };
        });
        localStorage.setItem("cuezone_pos_tables", JSON.stringify(updatedPos));
      } catch {
        // fallback
      }
    }
  }, [tables]);

  // Persist Pricing Tiers
  useEffect(() => {
    localStorage.setItem("cuezone_pricing_tiers", JSON.stringify(pricingTiers));
  }, [pricingTiers]);

  // Table Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Table Modal States
  const [tableModalVisible, setTableModalVisible] = useState<boolean>(false);
  const [editingTable, setEditingTable] = useState<BilliardTable | null>(null);
  const [tableCode, setTableCode] = useState<string>("");
  const [tableName, setTableName] = useState<string>("");
  const [tableType, setTableType] = useState<TableType>("standard_9ft");
  const [tableArea, setTableArea] = useState<string>("Tầng 1 - Khu A");
  const [tableFloor, setTableFloor] = useState<number>(1);
  const [tablePrice, setTablePrice] = useState<number>(50000);

  // Pricing Modal States
  const [pricingModalVisible, setPricingModalVisible] = useState<boolean>(false);
  const [editingPricing, setEditingPricing] = useState<PricingTier | null>(null);
  const [pricingName, setPricingName] = useState<string>("");
  const [pricingDayType, setPricingDayType] = useState<string>("weekday");
  const [pricingStartTime, setPricingStartTime] = useState<string>("08:00");
  const [pricingEndTime, setPricingEndTime] = useState<string>("14:00");
  const [pricingStandardPrice, setPricingStandardPrice] = useState<number>(50000);
  const [pricingVipPrice, setPricingVipPrice] = useState<number>(70000);

  // Delete Confirm Modal
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: "table" | "pricing"; name: string } | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const total = tables.length;
    const standard = tables.filter((t) => t.type === "standard_9ft").length;
    const vip = tables.filter((t) => t.type === "vip_bank_pool").length;
    const match = tables.filter((t) => t.type === "match_ksteel").length;
    const maintenance = tables.filter((t) => t.status === "maintenance").length;
    return { total, standard, vip, match, maintenance };
  }, [tables]);

  // Filtered Tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchType = filterType === "all" || t.type === filterType;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "maintenance" ? t.status === "maintenance" : t.status !== "maintenance");
      const matchQuery =
        !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.area.toLowerCase().includes(searchQuery.toLowerCase());
      return matchType && matchStatus && matchQuery;
    });
  }, [tables, filterType, filterStatus, searchQuery]);

  // Tab Items for Segmented Pill List
  const tabPills = [
    { key: "tables", label: "Danh Mục Bàn Bida", badge: stats.total, dotClassName: "bg-emerald-500" },
    { key: "pricing", label: "Cấu Hình Bảng Giá Khung Giờ", badge: pricingTiers.length, dotClassName: "bg-blue-500" },
    { key: "automation", label: "Quy Tắc Tính Giờ & Tự Động Hóa", dotClassName: "bg-amber-500" },
  ];

  // ── Handlers: Table CRUD ────────────────────────────────────────────────────
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableCode(`T${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableName(`Bàn ${tables.length + 1 < 10 ? "0" + (tables.length + 1) : tables.length + 1}`);
    setTableType("standard_9ft");
    setTableArea("Tầng 1 - Khu C");
    setTableFloor(1);
    setTablePrice(50000);
    setTableModalVisible(true);
  };

  const handleOpenEditTable = (table: BilliardTable) => {
    setEditingTable(table);
    setTableCode(table.code);
    setTableName(table.name);
    setTableType(table.type);
    setTableArea(table.area);
    setTableFloor(table.floor);
    setTablePrice(table.pricePerHour);
    setTableModalVisible(true);
  };

  const handleSaveTable = () => {
    if (!tableName.trim() || !tableCode.trim()) {
      message.warning("Vui lòng điền đầy đủ Mã bàn và Tên bàn!");
      return;
    }

    if (editingTable) {
      setTables((prev) =>
        prev.map((t) =>
          t._id === editingTable._id
            ? {
                ...t,
                code: tableCode.trim(),
                name: tableName.trim(),
                type: tableType,
                area: tableArea.trim(),
                floor: Number(tableFloor),
                pricePerHour: Number(tablePrice),
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : t
        )
      );
      message.success(`Đã cập nhật thông số ${tableName} thành công!`);
    } else {
      const newTable: BilliardTable = {
        _id: `TB-${Date.now().toString().slice(-4)}`,
        code: tableCode.trim(),
        name: tableName.trim(),
        type: tableType,
        area: tableArea.trim(),
        floor: Number(tableFloor),
        pricePerHour: Number(tablePrice),
        status: "available",
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setTables((prev) => [...prev, newTable]);
      message.success(`Đã thêm ${tableName} vào danh mục bàn thành công!`);
    }

    setTableModalVisible(false);
  };

  const handleToggleMaintenance = (table: BilliardTable) => {
    const isMaintenance = table.status === "maintenance";
    const nextStatus = isMaintenance ? "available" : "maintenance";
    setTables((prev) =>
      prev.map((t) => (t._id === table._id ? { ...t, status: nextStatus, isActive: !isMaintenance } : t))
    );
    if (!isMaintenance) {
      message.info(`Đã chuyển ${table.name} sang chế độ bảo trì nỉ!`);
    } else {
      message.success(`Đã hoàn tất bảo trì, ${table.name} sẵn sàng hoạt động!`);
    }
  };

  // ── Handlers: Pricing CRUD ──────────────────────────────────────────────────
  const handleOpenAddPricing = () => {
    setEditingPricing(null);
    setPricingName("");
    setPricingDayType("weekday");
    setPricingStartTime("08:00");
    setPricingEndTime("14:00");
    setPricingStandardPrice(50000);
    setPricingVipPrice(70000);
    setPricingModalVisible(true);
  };

  const handleOpenEditPricing = (tier: PricingTier) => {
    setEditingPricing(tier);
    setPricingName(tier.name);
    setPricingDayType(tier.dayType);
    setPricingStartTime(tier.startTime);
    setPricingEndTime(tier.endTime);
    setPricingStandardPrice(tier.prices.standard);
    setPricingVipPrice(tier.prices.vip);
    setPricingModalVisible(true);
  };

  const handleSavePricing = () => {
    if (!pricingName.trim()) {
      message.warning("Vui lòng nhập tên khung giờ!");
      return;
    }

    if (editingPricing) {
      setPricingTiers((prev) =>
        prev.map((p) =>
          p._id === editingPricing._id
            ? {
                ...p,
                name: pricingName.trim(),
                dayType: pricingDayType,
                startTime: pricingStartTime,
                endTime: pricingEndTime,
                prices: {
                  standard: Number(pricingStandardPrice),
                  vip: Number(pricingVipPrice),
                },
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : p
        )
      );
      message.success(`Đã cập nhật biểu giá khung giờ "${pricingName}"!`);
    } else {
      const newTier: PricingTier = {
        _id: `PT-${Date.now().toString().slice(-4)}`,
        name: pricingName.trim(),
        dayType: pricingDayType,
        startTime: pricingStartTime,
        endTime: pricingEndTime,
        prices: {
          standard: Number(pricingStandardPrice),
          vip: Number(pricingVipPrice),
        },
        isActive: true,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };
      setPricingTiers((prev) => [...prev, newTier]);
      message.success(`Đã thêm khung giờ "${pricingName}" vào hệ thống!`);
    }

    setPricingModalVisible(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === "table") {
      setTables((prev) => prev.filter((t) => t._id !== deleteTarget.id));
      message.success(`Đã xóa bàn ${deleteTarget.name} khỏi danh mục!`);
    } else {
      setPricingTiers((prev) => prev.filter((p) => p._id !== deleteTarget.id));
      message.success(`Đã xóa khung giờ "${deleteTarget.name}"!`);
    }

    setDeleteConfirmVisible(false);
    setDeleteTarget(null);
  };

  // Table Columns Definition
  const tableColumns = [
    {
      title: "Mã & Tên Bàn",
      key: "name",
      render: (_: any, record: BilliardTable) => (
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
            {record.code}
          </span>
          <div>
            <strong className="text-sm text-slate-900 block">{record.name}</strong>
            <span className="text-[11px] text-slate-400">Tạo ngày: {record.createdAt}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Phân Loại Bàn",
      key: "type",
      render: (_: any, record: BilliardTable) => (
        <div>
          {record.type === "standard_9ft" && (
            <Tag color="default" className="!font-bold !bg-slate-100 !text-slate-700">
              BÀN THƯỜNG 9FT
            </Tag>
          )}
          {record.type === "vip_bank_pool" && (
            <Tag color="gold" className="!font-bold">
              VIP BANK POOL
            </Tag>
          )}
          {record.type === "match_ksteel" && (
            <Tag color="green" className="!font-bold">
              MATCH K-STEEL (VAR)
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Khu Vực & Tầng",
      dataIndex: "area",
      key: "area",
      render: (area: string) => <span className="text-xs text-slate-700 font-medium">{area}</span>,
    },
    {
      title: "Đơn Giá Giờ Chuẩn",
      key: "pricePerHour",
      render: (_: any, record: BilliardTable) => (
        <span className="font-mono font-bold text-emerald-700 text-sm">
          {record.pricePerHour.toLocaleString("vi-VN")}đ<span className="text-xs font-normal text-slate-400">/h</span>
        </span>
      ),
    },
    {
      title: "Trang Thiết Bị Chuẩn",
      key: "equipment",
      render: (_: any, record: BilliardTable) => (
        <div className="text-[11px] text-slate-500 space-y-0.5">
          <div className="flex items-center gap-1">
            <CheckCircleOutlined className="text-emerald-500 text-xs" />
            <span>{record.type === "standard_9ft" ? "Nỉ Simonis 860 tiêu chuẩn" : "Nỉ Simonis 860 HR Competition"}</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircleOutlined className="text-emerald-500 text-xs" />
            <span>{record.type === "match_ksteel" ? "Bóng Aramith Tournament TV Pro" : "Bóng Aramith Pro Cup"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Trạng Thái",
      key: "status",
      render: (_: any, record: BilliardTable) => (
        <div>
          {record.status === "maintenance" ? (
            <Tag color="error" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
              BẢO TRÌ NỈ
            </Tag>
          ) : (
            <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SẴN SÀNG HOẠT ĐỘNG
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Thao Tác",
      key: "actions",
      align: "right" as const,
      render: (_: any, record: BilliardTable) => (
        <Space size={4}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditTable(record)}
            leftIcon={<EditOutlined />}
            className="!h-7 !px-2 !rounded-lg !text-xs !border-slate-300 !text-slate-700 hover:!border-emerald-600"
          >
            Sửa
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleMaintenance(record)}
            leftIcon={<ToolOutlined />}
            className={`!h-7 !px-2 !rounded-lg !text-xs ${
              record.status === "maintenance"
                ? "!bg-emerald-50 !border-emerald-300 !text-emerald-800"
                : "!border-amber-300 !bg-amber-50/60 !text-amber-800 hover:!bg-amber-100"
            }`}
          >
            {record.status === "maintenance" ? "Mở Lại" : "Bảo Trì"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setDeleteTarget({ id: record._id, type: "table", name: `${record.name} (${record.code})` });
              setDeleteConfirmVisible(true);
            }}
            leftIcon={<DeleteOutlined />}
            className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-slate-300 !text-slate-400 hover:!text-rose-600 hover:!border-rose-300"
            title="Xóa bàn"
          />
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── 1. HEADER & TOP CONTROLS ────────────────────────────────────────── */}
      <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Title level={3} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Quản Lý Danh Mục Bàn & Cấu Hình Bảng Giá
              </Title>
              <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold !m-0">
                FLOOR CATALOG
              </Tag>
            </div>
            <Text className="!text-xs !text-slate-500 block">
              Quản trị quy mô bàn bida, thông số kỹ thuật nỉ Simonis và cấu hình biểu giá linh hoạt theo từng khung giờ
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Realtime active pricing pill */}
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-2 shadow-2xs">
              <ClockCircleOutlined className="text-emerald-700 text-xs" />
              <span className="text-xs text-emerald-900 font-semibold">
                Đang áp dụng: <strong>Khung Giờ Chiều (14:00 - 18:00)</strong>
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/pos")}
              leftIcon={<ThunderboltOutlined />}
              className="!h-9 !rounded-xl !border-slate-300 !text-slate-700 hover:!border-emerald-600 font-medium !text-xs"
            >
              Mở Sơ Đồ Bàn POS
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddTable}
              leftIcon={<PlusOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white shadow-2xs"
            >
              Thêm Bàn Mới
            </Button>
          </div>
        </div>

        {/* Tab Selector using SegmentedPillList */}
        <div className="p-3 bg-slate-50/70">
          <SegmentedPillList
            items={tabPills}
            activeKey={activeTab}
            onSelect={(key) => setActiveTab(key)}
          />
        </div>
      </Card>

      {/* ── 2. TAB 1: DANH MỤC BÀN BIDA (TABLE CATALOG) ────────────────────── */}
      {activeTab === "tables" && (
        <div className="space-y-4">
          {/* KPI Strip: Floor Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 mb-1">Tổng quy mô sàn</span>
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.total} Bàn</span>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 mb-1">Bàn Thường 9FT</span>
              <span className="text-2xl font-black text-slate-800 font-mono">{stats.standard} Bàn</span>
            </div>
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-semibold text-amber-800 mb-1">Bàn VIP Bank Pool</span>
              <span className="text-2xl font-black text-amber-800 font-mono">{stats.vip} Bàn</span>
            </div>
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between shadow-2xs">
              <span className="text-xs font-semibold text-emerald-800 mb-1">Bàn Match K-Steel</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{stats.match} Bàn</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-xs font-semibold text-slate-500 mb-1">Đang bảo trì nỉ</span>
              <span className="text-2xl font-black text-rose-600 font-mono">{stats.maintenance} Bàn</span>
            </div>
          </div>

          {/* Filter Toolbar & Data Table */}
          <Card styles={{ body: { padding: 0 } }} className="!rounded-2xl !border-slate-200 shadow-2xs overflow-hidden bg-white">
            <div className="p-3.5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex flex-wrap items-center gap-2.5">
                <Select
                  value={filterType}
                  onChange={(val) => setFilterType(val)}
                  className="!w-44 !rounded-lg !text-xs"
                  options={[
                    { value: "all", label: "Tất cả loại bàn" },
                    { value: "standard_9ft", label: "Bàn Thường 9FT" },
                    { value: "vip_bank_pool", label: "Bàn VIP Bank Pool" },
                    { value: "match_ksteel", label: "Bàn Match K-Steel" },
                  ]}
                />

                <Select
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                  className="!w-40 !rounded-lg !text-xs"
                  options={[
                    { value: "all", label: "Tất cả trạng thái" },
                    { value: "active", label: "Đang hoạt động" },
                    { value: "maintenance", label: "Đang bảo trì nỉ" },
                  ]}
                />
              </div>

              <SearchFilterInput
                value={searchQuery}
                onChange={(val) => setSearchQuery(val)}
                placeholder="Tìm mã bàn, tên bàn, khu vực..."
                width={280}
              />
            </div>

            {/* Table component from shared UI */}
            <div className="overflow-x-auto">
              <Table
                dataSource={filteredTables.map((t) => ({ ...t, key: t._id }))}
                columns={tableColumns}
                pagination={{ pageSize: 8, showTotal: (total) => `Tổng cộng ${total} bàn bida` }}
                className="[&_.ant-table-thead_th]:!bg-slate-50 [&_.ant-table-thead_th]:!text-slate-600 [&_.ant-table-thead_th]:!text-xs [&_.ant-table-tbody_td]:!py-3.5"
              />
            </div>
          </Card>
        </div>
      )}

      {/* ── 3. TAB 2: CẤU HÌNH BẢNG GIÁ KHUNG GIỜ (PRICING TIERS) ───────────── */}
      {activeTab === "pricing" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0">
                Biểu Giá Giờ Chơi Theo Khung Giờ
              </Title>
              <Text className="!text-xs !text-slate-500">
                Tự động áp dụng mức giá tương ứng theo thời gian khách mở bàn tại quầy POS
              </Text>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddPricing}
              leftIcon={<PlusOutlined />}
              className="!h-9 !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs text-white"
            >
              Thêm Khung Giờ Mới
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pricingTiers.map((tier) => (
              <Card
                key={tier._id}
                styles={{ body: { padding: 0 } }}
                className={`!rounded-2xl border transition-all overflow-hidden shadow-2xs hover:shadow-sm ${
                  tier.isCurrentlyActive ? "!border-emerald-500 bg-white ring-1 ring-emerald-500/20" : "!border-slate-200 bg-white"
                }`}
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <ClockCircleOutlined className="text-emerald-600 text-base" />
                    <div>
                      <strong className="text-sm text-slate-900 block">{tier.name}</strong>
                      <span className="font-mono text-xs text-slate-500 font-bold">
                        {tier.startTime} – {tier.endTime}
                      </span>
                    </div>
                  </div>

                  <div>
                    {tier.isCurrentlyActive && (
                      <Tag color="green" className="!rounded-full !px-2.5 !py-0.5 !font-bold inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        ĐANG ÁP DỤNG
                      </Tag>
                    )}
                    {tier.dayType === "peak" && (
                      <Tag color="gold" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                        GIỜ VÀNG PEAK
                      </Tag>
                    )}
                    {tier.dayType === "weekend" && (
                      <Tag color="blue" className="!rounded-full !px-2.5 !py-0.5 !font-bold">
                        CUỐI TUẦN
                      </Tag>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="text-[11px] text-slate-500 block mb-1">Bàn Thường 9FT</span>
                      <strong className="text-sm font-black text-slate-900 font-mono">
                        {tier.prices.standard.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
                      <span className="text-[11px] text-amber-800 block mb-1">Bàn VIP Bank Pool</span>
                      <strong className="text-sm font-black text-amber-900 font-mono">
                        {tier.prices.vip.toLocaleString("vi-VN")}đ
                      </strong>
                    </div>

                    <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                      <span className="text-[11px] text-emerald-800 block mb-1">Match K-Steel</span>
                      <strong className="text-sm font-black text-emerald-800 font-mono">
                        {(tier.prices.vip + 10000).toLocaleString("vi-VN")}đ
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">
                      Áp dụng: {tier.dayType === "weekend" ? "Thứ 7 & Chủ Nhật" : "Thứ 2 đến Thứ 6 hàng tuần"}
                    </span>

                    <Space size={6}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditPricing(tier)}
                        leftIcon={<EditOutlined />}
                        className="!h-7 !px-2.5 !rounded-lg !text-xs !border-slate-300"
                      >
                        Sửa Giá
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteTarget({ id: tier._id, type: "pricing", name: tier.name });
                          setDeleteConfirmVisible(true);
                        }}
                        leftIcon={<DeleteOutlined />}
                        className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-slate-300 !text-slate-400 hover:!text-rose-600 hover:!border-rose-300"
                        title="Xóa khung giờ"
                      />
                    </Space>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. TAB 3: QUY TẮC TÍNH GIỜ & TỰ ĐỘNG HÓA (SMART RULES) ─────────── */}
      {activeTab === "automation" && (
        <div className="space-y-4">
          <div>
            <Title level={4} className="!text-base !font-black !text-slate-900 !mb-0">
              Quy Tắc Thu Ngân & Tự Động Hóa Thông Minh
            </Title>
            <Text className="!text-xs !text-slate-500">
              Các thiết lập thuật toán tính tiền giờ, phân chia block và tích hợp rơ-le điều khiển thiết bị
            </Text>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card styles={{ body: { padding: "16px" } }} className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <ClockCircleOutlined />
                <span>Quy tắc Block 15 Phút Đầu Tiên</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi mở bàn tính giờ, hệ thống áp dụng mức tính tối thiểu là 15 phút đầu tiên. Trường hợp khách chơi dưới 15 phút, bill tạm tính tự động làm tròn thành 15 phút để bảo toàn chi phí lau nỉ, bóng và phục vụ ban đầu.
              </p>
            </Card>

            <Card styles={{ body: { padding: "16px" } }} className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <SettingOutlined />
                <span>Tự Động Tính Tiền Lũy Tiến Sau 15 Phút</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Từ phút thứ 16 trở đi, hệ thống tính chuẩn xác theo từng 1 phút (block 1 phút = Đơn giá giờ / 60). Cơ chế này tạo sự minh bạch tuyệt đối cho khách hàng, không làm tròn quá tay gây phàn nàn.
              </p>
            </Card>

            <Card styles={{ body: { padding: "16px" } }} className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <BulbOutlined />
                <span>Tích Hợp Rơ-Le Điều Khiển Đèn Bàn Tự Động (IoT Smart Relay)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi thu ngân bấm <strong>Bật Bàn Tính Giờ</strong> trên POS, rơ-le thông minh tự động bật sáng đèn chụp của bàn đó. Khi hoàn tất thanh toán, đèn duy trì 30 giây để cơ thủ dọn bao cơ rồi tự động tắt.
              </p>
            </Card>

            <Card styles={{ body: { padding: "16px" } }} className="!rounded-2xl !border-slate-200 shadow-2xs bg-white space-y-2">
              <div className="flex items-center gap-2 text-purple-700 font-bold text-sm">
                <SafetyCertificateOutlined />
                <span>Cơ Chế Tự Động Chia Khung Giờ (Split Time Rate)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-0">
                Khi phiên chơi của khách kéo dài vắt qua 2 khung giờ khác nhau (ví dụ: chơi từ 17:00 đến 19:30, đi qua mốc 18:00 Giờ Vàng), hệ thống tự động tách làm 2 khoảng giá: 60 phút giá Chiều và 90 phút giá Giờ Vàng.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODAL 1: THÊM / CHỈNH SỬA BÀN BIDA ─────────────────────────────────── */}
      <Modal
        open={tableModalVisible}
        onCancel={() => setTableModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <AppstoreOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              {editingTable ? `Chỉnh Sửa Thông Tin ${editingTable.name}` : "Thêm Bàn Bida Mới"}
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Mã bàn (Code):</label>
              <Input
                placeholder="T01, V09, M13..."
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                className="!h-9 !rounded-xl font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tên hiển thị:</label>
              <Input
                placeholder="Bàn 01, Bàn VIP 09..."
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="!h-9 !rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phân loại bàn:</label>
              <Select
                value={tableType}
                onChange={(val) => setTableType(val as TableType)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "standard_9ft", label: "Bàn Thường 9FT" },
                  { value: "vip_bank_pool", label: "Bàn VIP Bank Pool" },
                  { value: "match_ksteel", label: "Bàn Match K-Steel" },
                ]}
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Đơn giá giờ chuẩn (VNĐ):</label>
              <Input
                type="number"
                value={tablePrice}
                onChange={(e) => setTablePrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Khu vực đặt bàn:</label>
              <Input
                placeholder="Tầng 1 - Khu A, Tầng 2 - VIP..."
                value={tableArea}
                onChange={(e) => setTableArea(e.target.value)}
                className="!h-9 !rounded-xl"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tầng:</label>
              <Select
                value={tableFloor}
                onChange={(val) => setTableFloor(Number(val))}
                className="!w-full !rounded-xl"
                options={[
                  { value: 1, label: "Tầng 1 (Khu Sàn Chính)" },
                  { value: 2, label: "Tầng 2 (Phòng VIP & Match)" },
                ]}
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
            <span className="font-bold block">Chuẩn trang thiết bị mặc định:</span>
            <span>• Nỉ thi đấu: Simonis 860 HR (Bỉ)</span>
            <br />
            <span>• Bi thi đấu: Aramith Tournament TV Pro Cup (Bỉ)</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setTableModalVisible(false)} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveTable}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Lưu Thông Tin Bàn
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 2: THÊM / CHỈNH SỬA KHUNG GIỜ ───────────────────────────────── */}
      <Modal
        open={pricingModalVisible}
        onCancel={() => setPricingModalVisible(false)}
        footer={null}
        title={
          <Space align="center" size={8}>
            <ClockCircleOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              {editingPricing ? `Cập Nhật Biểu Giá: ${editingPricing.name}` : "Thêm Khung Giờ Mới"}
            </span>
          </Space>
        }
      >
        <div className="py-2 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Tên khung giờ:</label>
            <Input
              placeholder="Khung Giờ Sáng, Giờ Vàng Tối..."
              value={pricingName}
              onChange={(e) => setPricingName(e.target.value)}
              className="!h-9 !rounded-xl"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Loại ngày:</label>
              <Select
                value={pricingDayType}
                onChange={(val) => setPricingDayType(val)}
                className="!w-full !rounded-xl"
                options={[
                  { value: "weekday", label: "Ngày Thường" },
                  { value: "peak", label: "Giờ Cao Điểm" },
                  { value: "weekend", label: "Cuối Tuần" },
                ]}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Từ giờ:</label>
              <Input
                placeholder="08:00"
                value={pricingStartTime}
                onChange={(e) => setPricingStartTime(e.target.value)}
                className="!h-9 !rounded-xl font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Đến giờ:</label>
              <Input
                placeholder="14:00"
                value={pricingEndTime}
                onChange={(e) => setPricingEndTime(e.target.value)}
                className="!h-9 !rounded-xl font-mono text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Giá Bàn Thường 9FT (VNĐ/h):</label>
              <Input
                type="number"
                value={pricingStandardPrice}
                onChange={(e) => setPricingStandardPrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Giá Bàn VIP Bank Pool (VNĐ/h):</label>
              <Input
                type="number"
                value={pricingVipPrice}
                onChange={(e) => setPricingVipPrice(Number(e.target.value))}
                className="!h-9 !rounded-xl font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPricingModalVisible(false)} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSavePricing}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
            >
              Lưu Biểu Giá
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── MODAL 3: XÁC NHẬN XÓA ────────────────────────────────────────────── */}
      <Modal
        open={deleteConfirmVisible}
        onCancel={() => setDeleteConfirmVisible(false)}
        footer={null}
        width={420}
        title={
          <Space align="center" size={8}>
            <ExclamationCircleOutlined className="text-rose-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">Xác Nhận Xóa Dữ Liệu</span>
          </Space>
        }
      >
        <div className="py-2 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed mb-0">
            Bạn có chắc chắn muốn xóa <strong>{deleteTarget?.name}</strong> khỏi hệ thống? Thao tác này không thể hoàn tác.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmVisible(false)} className="!rounded-xl">
              Hủy Bỏ
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDelete}
              className="!rounded-xl font-bold px-4"
            >
              Xác Nhận Xóa
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TablesManagementPage;
