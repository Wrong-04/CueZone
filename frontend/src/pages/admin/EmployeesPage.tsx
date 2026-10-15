import React, { useState, useEffect, useMemo } from "react";
import {
  TeamOutlined,
  PlusOutlined,
  SearchOutlined,
  ScheduleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  TrophyOutlined,
  StarOutlined,
  AppstoreOutlined,
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
  Card,
  type TableColumnsType,
} from "../../shared/ui";
import { UserRole } from "../../types";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClubEmployee {
  id: string;
  code: string;
  name: string;
  avatar: string;
  role: UserRole;
  roleName: string;
  position: string;
  email: string;
  phone: string;
  shift: "morning" | "evening" | "night" | "fulltime";
  shiftName: string;
  assignedArea: string; // e.g. "Bàn 01 - 06", "Khu VIP 10 - 12", "Bàn Match 13 - 14 VAR"
  onDutyStatus: "on_duty" | "off_duty" | "leave";
  isActive: boolean;
  isLocked: boolean;
  joinDate: string;
  tablesServedMonth: number;
  fnbOrdersServed: number;
  ratingScore: number;
}

export interface ShiftInfo {
  key: "morning" | "evening" | "night";
  name: string;
  timeRange: string;
  leaderName: string;
  staffCount: number;
  status: "active" | "completed" | "upcoming";
  tablesAssigned: string;
  notes: string;
}

export interface PermissionItem {
  key: string;
  label: string;
  desc: string;
  module: string;
  enabledRoles: UserRole[];
}

// ── Mock Initial Employees Data ───────────────────────────────────────────────

const INITIAL_EMPLOYEES: ClubEmployee[] = [
  {
    id: "emp-01",
    code: "NV-001",
    name: "Nguyễn Hải Long",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
    role: UserRole.ADMIN,
    roleName: "Quản Lý Điều Hành CLB",
    position: "Club General Manager",
    email: "hailong.cuezone@gmail.com",
    phone: "0908 112 334",
    shift: "fulltime",
    shiftName: "Toàn Thời Gian",
    assignedArea: "Toàn bộ CLB & Hệ thống POS",
    onDutyStatus: "on_duty",
    isActive: true,
    isLocked: false,
    joinDate: "01/01/2025",
    tablesServedMonth: 120,
    fnbOrdersServed: 180,
    ratingScore: 4.9,
  },
  {
    id: "emp-02",
    code: "NV-002",
    name: "Trần Đình Trọng",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    role: UserRole.CASHIER,
    roleName: "Thu Ngân Trưởng",
    position: "Head Cashier (Ca Sáng)",
    email: "dinhtrong.cashier@cuezone.vn",
    phone: "0901 223 344",
    shift: "morning",
    shiftName: "Ca Sáng (08:00 - 16:00)",
    assignedArea: "Quầy Thu Ngân & Sơ đồ POS Tầng 1",
    onDutyStatus: "off_duty",
    isActive: true,
    isLocked: false,
    joinDate: "15/03/2025",
    tablesServedMonth: 210,
    fnbOrdersServed: 320,
    ratingScore: 4.8,
  },
  {
    id: "emp-03",
    code: "NV-003",
    name: "Lê Văn Hùng",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80",
    role: UserRole.CASHIER,
    roleName: "Thu Ngân Ca Tối",
    position: "Senior Cashier (Ca Chiều/Tối)",
    email: "vanhung.cashier@cuezone.vn",
    phone: "0918 332 211",
    shift: "evening",
    shiftName: "Ca Tối (16:00 - 24:00)",
    assignedArea: "Quầy Thu Ngân & POS Khu VIP",
    onDutyStatus: "on_duty",
    isActive: true,
    isLocked: false,
    joinDate: "01/06/2025",
    tablesServedMonth: 245,
    fnbOrdersServed: 410,
    ratingScore: 4.9,
  },
  {
    id: "emp-04",
    code: "NV-004",
    name: "Bùi Quốc Bảo",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
    role: UserRole.REFEREE,
    roleName: "Trọng Tài Bank Pool Quốc Gia",
    position: "Chief Tournament Referee",
    email: "quocbao.referee@cuezone.vn",
    phone: "0934 998 811",
    shift: "evening",
    shiftName: "Ca Tối (16:00 - 24:00)",
    assignedArea: "Bàn Match 13 & Match 14 (Khu VAR)",
    onDutyStatus: "on_duty",
    isActive: true,
    isLocked: false,
    joinDate: "10/05/2025",
    tablesServedMonth: 65,
    fnbOrdersServed: 80,
    ratingScore: 5.0,
  },
  {
    id: "emp-05",
    code: "NV-005",
    name: "Nguyễn Văn Nam",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80",
    role: UserRole.WAREHOUSE,
    roleName: "Thủ Kho Vật Tư Bida & F&B",
    position: "Warehouse & Inventory Specialist",
    email: "vannam.warehouse@cuezone.vn",
    phone: "0944 556 677",
    shift: "morning",
    shiftName: "Ca Sáng (08:00 - 16:00)",
    assignedArea: "Tổng Kho Vật Tư & Tủ Cơ VIP",
    onDutyStatus: "off_duty",
    isActive: true,
    isLocked: false,
    joinDate: "20/04/2025",
    tablesServedMonth: 40,
    fnbOrdersServed: 60,
    ratingScore: 4.7,
  },
  {
    id: "emp-06",
    code: "NV-006",
    name: "Vũ Minh Quân",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80",
    role: UserRole.STAFF,
    roleName: "Nhân Viên Phục Vụ Bàn VIP",
    position: "VIP Area Table Runner",
    email: "minhquan.staff@cuezone.vn",
    phone: "0988 776 554",
    shift: "evening",
    shiftName: "Ca Tối (16:00 - 24:00)",
    assignedArea: "Bàn VIP 10, VIP 11, VIP 12",
    onDutyStatus: "on_duty",
    isActive: true,
    isLocked: false,
    joinDate: "01/08/2025",
    tablesServedMonth: 310,
    fnbOrdersServed: 480,
    ratingScore: 4.9,
  },
  {
    id: "emp-07",
    code: "NV-007",
    name: "Phan Hải Đăng",
    avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=150&q=80",
    role: UserRole.STAFF,
    roleName: "Nhân Viên Phục Vụ Bàn Thường",
    position: "Table Attendant (Ca Chiều)",
    email: "haidang.staff@cuezone.vn",
    phone: "0912 345 678",
    shift: "evening",
    shiftName: "Ca Tối (16:00 - 24:00)",
    assignedArea: "Bàn 01 đến Bàn 06",
    onDutyStatus: "on_duty",
    isActive: true,
    isLocked: false,
    joinDate: "15/08/2025",
    tablesServedMonth: 290,
    fnbOrdersServed: 395,
    ratingScore: 4.8,
  },
  {
    id: "emp-08",
    code: "NV-008",
    name: "Đỗ Tuấn Kiệt",
    avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80",
    role: UserRole.STAFF,
    roleName: "Nhân Viên Phục Vụ Ca Đêm",
    position: "Night Shift Table Attendant",
    email: "tuankiet.staff@cuezone.vn",
    phone: "0945 678 901",
    shift: "night",
    shiftName: "Ca Đêm (00:00 - 04:00)",
    assignedArea: "Khu Vực Bàn Đấu & Bảo Dưỡng Nỉ Bàn",
    onDutyStatus: "off_duty",
    isActive: true,
    isLocked: false,
    joinDate: "01/09/2025",
    tablesServedMonth: 180,
    fnbOrdersServed: 230,
    ratingScore: 4.6,
  },
];

const SHIFT_SCHEDULES: ShiftInfo[] = [
  {
    key: "morning",
    name: "Ca Sáng (08:00 - 16:00)",
    timeRange: "08:00 - 16:00 (8 Tiếng)",
    leaderName: "Trần Đình Trọng (Thu Ngân Trưởng)",
    staffCount: 3,
    status: "completed",
    tablesAssigned: "Bàn 01 đến Bàn 14 (Tất cả khu vực)",
    notes: "Đã bàn giao tiền mặt quầy thu ngân và kiểm tra bóng bida lúc 16:00",
  },
  {
    key: "evening",
    name: "Ca Chiều / Tối (16:00 - 24:00 - CA VÀNG)",
    timeRange: "16:00 - 24:00 (8 Tiếng)",
    leaderName: "Nguyễn Hải Long (Quản Lý CLB)",
    staffCount: 5,
    status: "active",
    tablesAssigned: "Khu VIP 10-12, Match 13-14 (VAR On), Bàn thường",
    notes: "Khung giờ cao điểm giải đấu Bank Pool, tăng cường 2 nhân viên chăm sóc bàn Match",
  },
  {
    key: "night",
    name: "Ca Đêm (00:00 - 04:00 / Khách Xuyên Đêm)",
    timeRange: "00:00 - 04:00 (4 Tiếng)",
    leaderName: "Đỗ Tuấn Kiệt (Trưởng Ca Đêm)",
    staffCount: 2,
    status: "upcoming",
    tablesAssigned: "Bàn 01 - Bàn 04 & Bàn VIP 10",
    notes: "Bảo dưỡng hút bụi nỉ bàn Simonis, đánh bóng bi Aramith sau giờ đóng cửa",
  },
];

const PERMISSIONS_LIST: PermissionItem[] = [
  {
    key: "pos_open_table",
    label: "Mở Bàn Bida & Nhận Đặt Bàn",
    desc: "Khởi tạo phiên chơi mới, xếp bàn và duyệt đặt bàn trước",
    module: "Bàn & Billing",
    enabledRoles: [UserRole.ADMIN, UserRole.CASHIER, UserRole.STAFF],
  },
  {
    key: "pos_checkout",
    label: "In Hóa Đơn & Chốt Giờ Thanh Toán",
    desc: "Xuất bill tính giờ chơi, thu tiền khách và áp dụng chiết khấu thẻ",
    module: "Bàn & Billing",
    enabledRoles: [UserRole.ADMIN, UserRole.CASHIER],
  },
  {
    key: "pos_cancel_invoice",
    label: "Hủy Hóa Đơn / Miễn Phí Giờ Chơi",
    desc: "Yêu cầu quyền Quản lý phê duyệt khi xảy ra lỗi sự cố",
    module: "Bàn & Billing",
    enabledRoles: [UserRole.ADMIN],
  },
  {
    key: "wh_view_stock",
    label: "Xem Tồn Kho Thực Đơn F&B & Phụ Kiện",
    desc: "Tra cứu số lượng đồ uống, cơ bida và phụ kiện sẵn có",
    module: "Kho Hàng & Vật Tư",
    enabledRoles: [UserRole.ADMIN, UserRole.CASHIER, UserRole.WAREHOUSE, UserRole.STAFF],
  },
  {
    key: "wh_create_slips",
    label: "Lập Phiếu Nhập / Xuất Kho",
    desc: "Ghi nhận hàng về từ nhà phân phối hoặc xuất thay nỉ bàn",
    module: "Kho Hàng & Vật Tư",
    enabledRoles: [UserRole.ADMIN, UserRole.WAREHOUSE],
  },
  {
    key: "tourney_scoring",
    label: "Chấm Điểm Trọng Tài & Ghi Nhận VAR",
    desc: "Cập nhật tỉ số ván đấu Bank Pool và xem lại camera 60fps",
    module: "Giải Đấu & Trọng Tài",
    enabledRoles: [UserRole.ADMIN, UserRole.REFEREE],
  },
  {
    key: "hr_manage_shifts",
    label: "Phân Ca Trực & Quản Lý Hồ Sơ Nhân Sự",
    desc: "Cấu hình lịch làm việc, đổi ca và khóa/mở khóa tài khoản",
    module: "Nhân Sự & Hệ Thống",
    enabledRoles: [UserRole.ADMIN],
  },
];

export const EmployeesPage: React.FC = () => {
  // ── 1. STATE ──────────────────────────────────────────────────────────────
  const [employeesList, setEmployeesList] = useState<ClubEmployee[]>(() => {
    const saved = localStorage.getItem("cuezone_admin_employees");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_EMPLOYEES;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_admin_employees", JSON.stringify(employeesList));
  }, [employeesList]);

  // Main Tabs
  const [activeTab, setActiveTab] = useState<string>("staff");

  // Filters
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dutyFilter, setDutyFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [selectedEmp, setSelectedEmp] = useState<ClubEmployee | null>(null);

  // Form State
  interface EmployeeFormData {
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    position: string;
    shift: ClubEmployee["shift"];
    assignedArea: string;
  }

  const [empForm, setEmpForm] = useState<EmployeeFormData>({
    name: "",
    email: "",
    phone: "",
    role: UserRole.STAFF,
    position: "Nhân viên phục vụ",
    shift: "evening",
    assignedArea: "Khu vực Bàn 01 - 06",
  });

  // ── 2. ACTIONS ────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEmpForm({
      name: "",
      email: "",
      phone: "",
      role: UserRole.STAFF,
      position: "Nhân viên phục vụ bàn",
      shift: "evening",
      assignedArea: "Khu vực Bàn 01 - 06",
    });
    setCreateModalVisible(true);
  };

  const handleOpenEdit = (emp: ClubEmployee) => {
    setSelectedEmp(emp);
    setEmpForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      role: emp.role,
      position: emp.position,
      shift: emp.shift,
      assignedArea: emp.assignedArea,
    });
    setEditModalVisible(true);
  };

  const handleSaveCreate = () => {
    if (!empForm.name.trim()) {
      message.warning("Vui lòng nhập họ tên nhân viên!");
      return;
    }
    if (!empForm.email.trim()) {
      message.warning("Vui lòng nhập địa chỉ email!");
      return;
    }

    const roleNameMap: Record<string, string> = {
      [UserRole.ADMIN]: "Quản Lý CLB",
      [UserRole.CASHIER]: "Thu Ngân Quầy",
      [UserRole.STAFF]: "Nhân Viên Phục Vụ",
      [UserRole.REFEREE]: "Trọng Tài Bida",
      [UserRole.WAREHOUSE]: "Thủ Kho Vật Tư",
    };

    const shiftNameMap: Record<string, string> = {
      morning: "Ca Sáng (08:00 - 16:00)",
      evening: "Ca Tối (16:00 - 24:00)",
      night: "Ca Đêm (00:00 - 04:00)",
      fulltime: "Toàn Thời Gian",
    };

    const newCode = `NV-${String(employeesList.length + 1).padStart(3, "0")}`;

    const created: ClubEmployee = {
      id: `emp-${Date.now()}`,
      code: newCode,
      name: empForm.name.trim(),
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
      role: empForm.role,
      roleName: roleNameMap[empForm.role] || "Nhân viên",
      position: empForm.position.trim() || "Nhân viên",
      email: empForm.email.trim(),
      phone: empForm.phone.trim() || "0900 000 000",
      shift: empForm.shift,
      shiftName: shiftNameMap[empForm.shift] || "Ca Tối",
      assignedArea: empForm.assignedArea.trim() || "Bàn bida chỉ định",
      onDutyStatus: "on_duty",
      isActive: true,
      isLocked: false,
      joinDate: new Date().toLocaleDateString("vi-VN"),
      tablesServedMonth: 0,
      fnbOrdersServed: 0,
      ratingScore: 5.0,
    };

    setEmployeesList((prev) => [created, ...prev]);
    message.success(`Đã thêm thành công nhân viên "${created.name}" (${created.code})!`);
    setCreateModalVisible(false);
  };

  const handleSaveEdit = () => {
    if (!selectedEmp) return;
    if (!empForm.name.trim()) {
      message.warning("Vui lòng nhập họ tên nhân viên!");
      return;
    }

    const roleNameMap: Record<string, string> = {
      [UserRole.ADMIN]: "Quản Lý CLB",
      [UserRole.CASHIER]: "Thu Ngân Quầy",
      [UserRole.STAFF]: "Nhân Viên Phục Vụ",
      [UserRole.REFEREE]: "Trọng Tài Bida",
      [UserRole.WAREHOUSE]: "Thủ Kho Vật Tư",
    };

    const shiftNameMap: Record<string, string> = {
      morning: "Ca Sáng (08:00 - 16:00)",
      evening: "Ca Tối (16:00 - 24:00)",
      night: "Ca Đêm (00:00 - 04:00)",
      fulltime: "Toàn Thời Gian",
    };

    setEmployeesList((prev) =>
      prev.map((e) =>
        e.id === selectedEmp.id
          ? {
              ...e,
              name: empForm.name.trim(),
              email: empForm.email.trim(),
              phone: empForm.phone.trim(),
              role: empForm.role,
              roleName: roleNameMap[empForm.role] || e.roleName,
              position: empForm.position.trim(),
              shift: empForm.shift,
              shiftName: shiftNameMap[empForm.shift] || e.shiftName,
              assignedArea: empForm.assignedArea.trim(),
            }
          : e
      )
    );

    message.success(`Đã cập nhật thông tin nhân viên "${empForm.name}"!`);
    setEditModalVisible(false);
    setSelectedEmp(null);
  };

  const handleToggleLock = (emp: ClubEmployee) => {
    const nextLocked = !emp.isLocked;
    setEmployeesList((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, isLocked: nextLocked } : e))
    );
    if (nextLocked) {
      message.warning(`Đã tạm khóa tài khoản nhân viên ${emp.name}!`);
    } else {
      message.success(`Đã mở khóa tài khoản nhân viên ${emp.name}!`);
    }
  };

  const handleToggleDuty = (emp: ClubEmployee) => {
    const nextDuty = emp.onDutyStatus === "on_duty" ? "off_duty" : "on_duty";
    setEmployeesList((prev) =>
      prev.map((e) => (e.id === emp.id ? { ...e, onDutyStatus: nextDuty } : e))
    );
    if (nextDuty === "on_duty") {
      message.success(`Điểm danh: ${emp.name} đã vào ca trực!`);
    } else {
      message.info(`Bàn giao: ${emp.name} đã hết ca trực.`);
    }
  };

  const handleResetToDefaults = () => {
    localStorage.removeItem("cuezone_admin_employees");
    setEmployeesList(INITIAL_EMPLOYEES);
    message.success("Đã khôi phục danh sách nhân sự về dữ liệu mẫu chuẩn!");
  };

  // ── 3. FILTERED EMPLOYEES & METRICS ───────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    return employeesList.filter((emp) => {
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      const matchDuty = dutyFilter === "all" || emp.onDutyStatus === dutyFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.code.toLowerCase().includes(q) ||
        emp.phone.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        emp.position.toLowerCase().includes(q);

      return matchRole && matchDuty && matchQuery;
    });
  }, [employeesList, roleFilter, dutyFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalStaff = employeesList.length;
    const onDutyCount = employeesList.filter((e) => e.onDutyStatus === "on_duty").length;
    const waiterCount = employeesList.filter((e) => e.role === UserRole.STAFF).length;
    const specialistCount = employeesList.filter(
      (e) => e.role === UserRole.CASHIER || e.role === UserRole.REFEREE
    ).length;

    return { totalStaff, onDutyCount, waiterCount, specialistCount };
  }, [employeesList]);

  // Main navigation tabs
  const mainPills = [
    {
      key: "staff",
      label: "Hồ Sơ Nhân Sự CLB",
      badge: employeesList.length,
    },
    {
      key: "shifts",
      label: "Phân Ca Trực Hôm Nay",
      badge: "3 Ca Trực",
      dotClassName: "bg-emerald-500 animate-ping",
    },
    {
      key: "permissions",
      label: "Ma Trận Phân Quyền Role",
      badge: `${PERMISSIONS_LIST.length} Quyền`,
    },
    {
      key: "performance",
      label: "Hiệu Suất & Đánh Giá Phục Vụ",
      badge: "Top Rating",
    },
  ];

  // Employee Table Columns
  const employeeColumns: TableColumnsType<ClubEmployee> = [
    {
      title: "Mã NV",
      dataIndex: "code",
      key: "code",
      width: 100,
      render: (code: string) => (
        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
          {code}
        </span>
      ),
    },
    {
      title: "Họ Tên & Trạng Thái Ca",
      key: "name_duty",
      render: (_: unknown, record: ClubEmployee) => (
        <div className="flex items-center gap-3">
          <img
            src={record.avatar}
            alt={record.name}
            className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-2xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">{record.name}</span>
              {record.onDutyStatus === "on_duty" ? (
                <Tag color="green" className="!rounded-full !px-2 !py-0 !text-[10px] !font-bold">
                  ĐANG TRỰC CA
                </Tag>
              ) : (
                <Tag color="default" className="!rounded-full !px-2 !py-0 !text-[10px]">
                  HẾT CA
                </Tag>
              )}
            </div>
            <span className="text-[11px] text-slate-400 block">{record.position}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Vai Trò (Role)",
      dataIndex: "role",
      key: "role",
      width: 150,
      render: (role: UserRole, record: ClubEmployee) => {
        const colorMap: Record<string, string> = {
          [UserRole.ADMIN]: "orange",
          [UserRole.CASHIER]: "green",
          [UserRole.STAFF]: "blue",
          [UserRole.REFEREE]: "gold",
          [UserRole.WAREHOUSE]: "purple",
        };
        return (
          <Tag color={colorMap[role] || "default"} className="!rounded-md !px-2 !py-0.5 !text-xs !font-bold">
            {record.roleName}
          </Tag>
        );
      },
    },
    {
      title: "Ca Trực & Khu Vực Bàn",
      key: "shift_area",
      render: (_: unknown, record: ClubEmployee) => (
        <div className="text-xs">
          <span className="font-bold text-slate-800 block">{record.shiftName}</span>
          <span className="text-[11px] text-emerald-700 font-medium">
            Phụ trách: {record.assignedArea}
          </span>
        </div>
      ),
    },
    {
      title: "Liên Hệ",
      key: "contact",
      width: 170,
      render: (_: unknown, record: ClubEmployee) => (
        <div className="text-xs">
          <span className="font-mono text-slate-800 font-bold block">{record.phone}</span>
          <span className="text-[11px] text-slate-400 block truncate max-w-[160px]">
            {record.email}
          </span>
        </div>
      ),
    },
    {
      title: "Tài Khoản",
      key: "account_status",
      width: 120,
      align: "center",
      render: (_: unknown, record: ClubEmployee) => (
        <Tag
          color={record.isLocked ? "error" : "green"}
          className="!rounded-full !px-2.5 !py-0.5 !text-[11px] !font-bold"
        >
          {record.isLocked ? "TẠM KHÓA" : "HOẠT ĐỘNG"}
        </Tag>
      ),
    },
    {
      title: "Thao Tác",
      key: "actions",
      width: 180,
      align: "right",
      render: (_: unknown, record: ClubEmployee) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleToggleDuty(record)}
            className={`!text-[11px] !h-8 !px-2 !rounded-xl font-bold ${
              record.onDutyStatus === "on_duty"
                ? "!border-slate-200 !text-slate-600 hover:!bg-slate-100"
                : "!border-emerald-300 !text-emerald-700 hover:!bg-emerald-50"
            }`}
          >
            {record.onDutyStatus === "on_duty" ? "Hết Ca" : "Vào Ca"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenEdit(record)}
            leftIcon={<EditOutlined />}
            className="!text-[11px] !h-8 !px-2 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700"
          >
            Sửa
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleLock(record)}
            leftIcon={record.isLocked ? <UnlockOutlined /> : <LockOutlined />}
            className={`!text-[11px] !h-8 !px-2 !rounded-xl ${
              record.isLocked
                ? "!bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100"
                : "!bg-rose-50 !text-rose-600 hover:!bg-rose-100"
            }`}
          >
            {record.isLocked ? "Mở" : "Khóa"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── COMMAND HEADER & SUMMARY KPI CARDS ────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TeamOutlined className="text-xl" />
              </div>
              <Title level={2} className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                Quản Lý Nhân Sự, Phân Ca & Phân Quyền CLB
              </Title>
              <Tag color="green" className="!rounded-full !px-3 !py-0.5 !text-xs !font-black">
                CUEZONE WORKFORCE & SHIFT HUB
              </Tag>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Quản lý đội ngũ nhân viên phục vụ bàn bida, thu ngân, trọng tài giải đấu, thủ kho, bảng phân ca trực hàng ngày và chấm công thời gian thực.
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
              variant="outline"
              size="md"
              leftIcon={<ScheduleOutlined />}
              onClick={() => setActiveTab("shifts")}
              className="!rounded-xl !text-xs font-bold !text-slate-700"
            >
              Xem Ca Trực Hôm Nay
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Thêm Nhân Viên Mới
            </Button>
          </div>
        </div>

        {/* Counter KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 relative z-10">
          <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                Tổng nhân sự CLB
              </span>
              <span className="w-6 h-6 rounded-lg bg-white flex items-center justify-center text-slate-400 text-xs border border-slate-200">
                <TeamOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {metrics.totalStaff}
              </span>
              <span className="text-xs font-semibold text-slate-500">nhân viên</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
                Đang trong ca trực
              </span>
              <span className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs border border-emerald-200">
                <ClockCircleOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 tracking-tight">
                {metrics.onDutyCount}
              </span>
              <span className="text-xs font-semibold text-emerald-700">nhân sự online</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">
                Phục vụ & Chăm bàn
              </span>
              <span className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 text-xs border border-blue-200">
                <AppstoreOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-blue-800 tracking-tight">
                {metrics.waiterCount}
              </span>
              <span className="text-xs font-semibold text-blue-700">chăm sóc 14 bàn</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-purple-800 font-semibold uppercase tracking-wider">
                Thu ngân & Trọng tài
              </span>
              <span className="w-6 h-6 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 text-xs border border-purple-200">
                <TrophyOutlined />
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-purple-800 tracking-tight">
                {metrics.specialistCount}
              </span>
              <span className="text-xs font-semibold text-purple-700">chuyên viên POS & VAR</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN TABS SWITCHER ────────────────────────────────────────────── */}
      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <SegmentedPillList
          items={mainPills}
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
        />
      </div>

      {/* ── TAB 1: HỒ SƠ NHÂN SỰ CLB ───────────────────────────────────────── */}
      {activeTab === "staff" && (
        <div className="space-y-4">
          {/* Sub Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={roleFilter}
                onChange={(val) => setRoleFilter(val)}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả vai trò (Roles)" },
                  { value: UserRole.STAFF, label: "Nhân viên Phục vụ" },
                  { value: UserRole.CASHIER, label: "Thu ngân Quầy" },
                  { value: UserRole.REFEREE, label: "Trọng tài Bank Pool" },
                  { value: UserRole.WAREHOUSE, label: "Thủ kho Vật tư" },
                  { value: UserRole.ADMIN, label: "Quản lý CLB" },
                ]}
              />

              <Select
                value={dutyFilter}
                onChange={(val) => setDutyFilter(val)}
                className="!w-40 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả tình trạng ca" },
                  { value: "on_duty", label: "Đang trực ca" },
                  { value: "off_duty", label: "Hết ca trực" },
                ]}
              />
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Tìm tên, mã NV, chức vụ, SĐT..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <Table<ClubEmployee>
              columns={employeeColumns}
              dataSource={filteredEmployees}
              rowKey="id"
              pagination={{
                pageSize: 8,
                showTotal: (total, range) =>
                  `Hiển thị ${range[0]}-${range[1]} trên tổng số ${total} nhân sự`,
                className: "!px-4 !py-3",
              }}
            />
          </div>
        </div>
      )}

      {/* ── TAB 2: PHÂN CA TRỰC HÔM NAY ────────────────────────────────────── */}
      {activeTab === "shifts" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SHIFT_SCHEDULES.map((shift) => (
              <Card
                key={shift.key}
                className="!rounded-3xl border border-slate-200 shadow-xs p-5 flex flex-col justify-between bg-white relative overflow-hidden"
              >
                {shift.status === "active" && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full pointer-events-none" />
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Tag
                      color={
                        shift.status === "active"
                          ? "green"
                          : shift.status === "completed"
                          ? "default"
                          : "blue"
                      }
                      className="!rounded-full !px-3 !py-0.5 !text-xs !font-bold inline-flex items-center gap-1"
                    >
                      {shift.status === "active" && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1" />}
                      {shift.status === "active"
                        ? "ĐANG DIỄN RA"
                        : shift.status === "completed"
                        ? "ĐÃ BÀN GIAO"
                        : "CHUẨN BỊ CA"}
                    </Tag>

                    <span className="font-mono text-xs font-bold text-slate-500">
                      {shift.staffCount} nhân sự
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 mb-1 leading-snug">
                    {shift.name}
                  </h3>
                  <div className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                    <ClockCircleOutlined />
                    <span>{shift.timeRange}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2 mb-4">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Trưởng ca phụ trách:</span>
                      <strong className="text-slate-900">{shift.leaderName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Phạm vi bàn trực:</span>
                      <strong className="text-emerald-700">{shift.tablesAssigned}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Ghi chú bàn giao:</span>
                      <span className="text-slate-600 italic">{shift.notes}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Chấm công tự động qua POS</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      message.info(`Đã mở danh sách nhân viên trực thuộc ca: ${shift.name}`)
                    }
                    className="!rounded-xl !text-xs font-bold"
                  >
                    Xem Chi Tiết Ca
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {/* Current On-Duty Roster */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900 mb-0.5">
                  Danh Sách Nhân Viên Đang Trực Ca Vàng Chiều / Tối
                </h3>
                <p className="text-xs text-slate-500 mb-0">
                  Thời gian thực: 16:00 - 24:00 • Khu vực bàn hoạt động 100% công suất
                </p>
              </div>
              <Tag color="green" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
                5 NHÂN SỰ ĐANG TRỰC
              </Tag>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {employeesList
                .filter((e) => e.onDutyStatus === "on_duty")
                .map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between bg-slate-50/60"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20"
                      />
                      <div>
                        <span className="font-bold text-slate-900 text-xs block">{emp.name}</span>
                        <span className="text-[11px] text-emerald-700">{emp.assignedArea}</span>
                      </div>
                    </div>
                    <Tag color="green" className="!rounded-full !text-[10px] !font-bold">
                      {emp.roleName.split(" ")[0]}
                    </Tag>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MA TRẬN PHÂN QUYỀN ROLE ─────────────────────────────────── */}
      {activeTab === "permissions" && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Ma Trận Phân Quyền Vai Trò Hệ Thống CueZone
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Quy định quyền truy cập tính năng POS, quản lý kho, bảng điểm trọng tài và thu ngân
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => message.success("Đã lưu ma trận phân quyền hệ thống thành công!")}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
            >
              Lưu Cấu Hình Phân Quyền
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-6">Phân Hệ & Quyền Hạn</th>
                  <th className="py-3 px-4 text-center">Quản Lý (ADMIN)</th>
                  <th className="py-3 px-4 text-center">Thu Ngân (CASHIER)</th>
                  <th className="py-3 px-4 text-center">Phục Vụ (STAFF)</th>
                  <th className="py-3 px-4 text-center">Trọng Tài (REFEREE)</th>
                  <th className="py-3 px-4 text-center">Thủ Kho (WAREHOUSE)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSIONS_LIST.map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6">
                      <span className="font-bold text-slate-900 text-xs block">{perm.label}</span>
                      <span className="text-[11px] text-slate-400">
                        {perm.module} • {perm.desc}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Tag color="green" className="!rounded-full font-bold">
                        Cho phép
                      </Tag>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {perm.enabledRoles.includes(UserRole.CASHIER) ? (
                        <Tag color="green" className="!rounded-full font-bold">
                          Cho phép
                        </Tag>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {perm.enabledRoles.includes(UserRole.STAFF) ? (
                        <Tag color="green" className="!rounded-full font-bold">
                          Cho phép
                        </Tag>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {perm.enabledRoles.includes(UserRole.REFEREE) ? (
                        <Tag color="green" className="!rounded-full font-bold">
                          Cho phép
                        </Tag>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {perm.enabledRoles.includes(UserRole.WAREHOUSE) ? (
                        <Tag color="green" className="!rounded-full font-bold">
                          Cho phép
                        </Tag>
                      ) : (
                        <span className="text-slate-300 font-bold">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: HIỆU SUẤT & ĐÁNH GIÁ PHỤC VỤ ────────────────────────────── */}
      {activeTab === "performance" && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-black text-slate-900 mb-0.5">
                Bảng Đánh Giá Hiệu Suất & Đóng Góp Nhân Viên
              </h3>
              <p className="text-xs text-slate-500 mb-0">
                Thống kê số lượng lượt phục vụ bàn bida, món F&B order và điểm đánh giá hài lòng từ khách
              </p>
            </div>
            <Tag color="gold" className="!rounded-full !px-3 !py-1 !text-xs !font-bold">
              THƯỞNG DOANH SỐ THÁNG
            </Tag>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {employeesList.slice(0, 4).map((emp, index) => (
              <div
                key={emp.id}
                className="p-5 rounded-3xl border border-slate-200 bg-white shadow-2xs hover:shadow-xs hover:border-emerald-300 transition-all text-center space-y-3"
              >
                <div className="relative inline-block">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-16 h-16 rounded-2xl object-cover mx-auto ring-4 ring-emerald-500/10 shadow-xs"
                  />
                  {index === 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-xs shadow-xs">
                      <StarOutlined />
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="font-black text-slate-900 text-sm mb-0.5">{emp.name}</h4>
                  <span className="text-[11px] text-slate-400 block">{emp.position}</span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phục vụ bàn:</span>
                    <strong className="text-slate-800">{emp.tablesServedMonth} lượt</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Order F&B:</span>
                    <strong className="text-emerald-700">{emp.fnbOrdersServed} món</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Điểm Rating:</span>
                    <strong className="text-amber-600 font-bold">{emp.ratingScore} / 5.0</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MODAL: THÊM / CHỈNH SỬA NHÂN VIÊN ──────────────────────────────── */}
      <Modal
        open={createModalVisible || editModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          setEditModalVisible(false);
          setSelectedEmp(null);
        }}
        footer={null}
        width={600}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              {createModalVisible ? "Thêm Mới Nhân Viên CLB Bida" : "Chỉnh Sửa Hồ Sơ Nhân Viên"}
            </span>
          </div>
        }
      >
        <div className="py-4 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Nguyễn Văn A"
                value={empForm.name}
                onChange={(e) => setEmpForm((prev) => ({ ...prev, name: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại: <span className="text-rose-500">*</span>
              </label>
              <Input
                placeholder="0901..."
                value={empForm.phone}
                onChange={(e) => setEmpForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Địa chỉ Email: <span className="text-rose-500">*</span>
              </label>
              <Input
                type="email"
                placeholder="nhanvien@cuezone.vn"
                value={empForm.email}
                onChange={(e) => setEmpForm((prev) => ({ ...prev, email: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vai trò hệ thống (Role):
              </label>
              <Select
                value={empForm.role}
                onChange={(val) => setEmpForm((prev) => ({ ...prev, role: val }))}
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: UserRole.STAFF, label: "Nhân viên Phục vụ bàn" },
                  { value: UserRole.CASHIER, label: "Thu ngân Quầy POS" },
                  { value: UserRole.REFEREE, label: "Trọng tài Bank Pool" },
                  { value: UserRole.WAREHOUSE, label: "Thủ kho Vật tư" },
                  { value: UserRole.ADMIN, label: "Quản lý CLB" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chức danh công việc:
              </label>
              <Input
                placeholder="Phục vụ khu VIP, Thu ngân..."
                value={empForm.position}
                onChange={(e) => setEmpForm((prev) => ({ ...prev, position: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Ca làm việc mặc định:
              </label>
              <Select
                value={empForm.shift}
                onChange={(val) => setEmpForm((prev) => ({ ...prev, shift: val }))}
                className="!w-full !rounded-xl !text-xs !h-10"
                options={[
                  { value: "morning", label: "Ca Sáng (08:00 - 16:00)" },
                  { value: "evening", label: "Ca Tối (16:00 - 24:00)" },
                  { value: "night", label: "Ca Đêm (00:00 - 04:00)" },
                  { value: "fulltime", label: "Toàn Thời Gian" },
                ]}
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phân công phụ trách khu vực bàn bida:
              </label>
              <Input
                placeholder="Ví dụ: Bàn 01 - 06, Khu VIP 10 - 12, Bàn Match 13 VAR..."
                value={empForm.assignedArea}
                onChange={(e) => setEmpForm((prev) => ({ ...prev, assignedArea: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setCreateModalVisible(false);
                setEditModalVisible(false);
                setSelectedEmp(null);
              }}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={createModalVisible ? handleSaveCreate : handleSaveEdit}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              {createModalVisible ? "Lưu Nhân Viên" : "Cập Nhật Hồ Sơ"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
