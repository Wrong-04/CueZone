import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  TeamOutlined,
  PlusOutlined,
  SearchOutlined,
  UserOutlined,
  EditOutlined,
  LockOutlined,
  UnlockOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  SafetyCertificateOutlined,
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
  type TableColumnsType,
} from "../../shared/ui";
import { UserRole, type User } from "../../types";
import { employeeService } from "../../services/employee.service";
import { PermissionMatrixPanel } from "../../components/employees/PermissionMatrixPanel";

const { Title, Text } = Typography;

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: "Quản lý CLB",
  [UserRole.CASHIER]: "Thu ngân",
  [UserRole.STAFF]: "Nhân viên phục vụ",
  [UserRole.WAREHOUSE]: "Thủ kho",
};

const ROLE_COLORS: Record<string, string> = {
  [UserRole.ADMIN]: "orange",
  [UserRole.CASHIER]: "green",
  [UserRole.STAFF]: "blue",
  [UserRole.WAREHOUSE]: "purple",
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

interface EmployeeFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  position: string;
  branch: string;
}

const EMPTY_FORM: EmployeeFormData = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: UserRole.STAFF,
  position: "",
  branch: "",
};

const getErrorMessage = (err: unknown): string => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || "Đã có lỗi xảy ra";
};

// ── Page ──────────────────────────────────────────────────────────────────────

export const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [activeTab, setActiveTab] = useState<string>("staff");
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<EmployeeFormData>(EMPTY_FORM);

  const loadEmployees = useCallback(async () => {
    try {
      setEmployees(await employeeService.getAll());
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleRefresh = () => {
    setLoading(true);
    loadEmployees();
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const handleOpenEdit = (emp: User) => {
    setEditing(emp);
    setForm({
      name: emp.name,
      email: emp.email,
      phone: emp.phone || "",
      password: "",
      role: emp.role,
      position: emp.position || "",
      branch: emp.branch || "",
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      message.warning("Vui lòng nhập họ tên nhân viên!");
      return;
    }
    if (!editing) {
      if (!form.email.trim()) {
        message.warning("Vui lòng nhập địa chỉ email!");
        return;
      }
      if (
        form.password.length < 8 ||
        !/[a-zA-Z]/.test(form.password) ||
        !/\d/.test(form.password)
      ) {
        message.warning("Mật khẩu tối thiểu 8 ký tự, gồm cả chữ cái và số!");
        return;
      }
    }

    // Tạo mới: không gửi SĐT rỗng. Sửa: gửi "" để backend xóa SĐT (chuyển thành null).
    const payload: Record<string, string> = {
      name: form.name.trim(),
      role: form.role,
      position: form.position.trim(),
      branch: form.branch.trim(),
    };
    if (editing || form.phone.trim()) payload.phone = form.phone.trim();

    setSaving(true);
    try {
      if (editing) {
        await employeeService.update(editing._id, payload);
        message.success(`Đã cập nhật nhân viên "${payload.name}"!`);
      } else {
        await employeeService.create({
          ...payload,
          email: form.email.trim().toLowerCase(),
          password: form.password,
        });
        message.success(`Đã thêm nhân viên "${payload.name}"!`);
      }
      handleCloseModal();
      await loadEmployees();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (emp: User) => {
    try {
      const updated = await employeeService.toggleLock(emp._id);
      setEmployees((prev) => prev.map((e) => (e._id === emp._id ? { ...e, ...updated } : e)));
      if (updated.isLocked) message.warning(`Đã khóa tài khoản ${emp.name}!`);
      else message.success(`Đã mở khóa tài khoản ${emp.name}!`);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const handleToggleActive = async (emp: User) => {
    try {
      const updated = await employeeService.toggleActive(emp._id);
      setEmployees((prev) => prev.map((e) => (e._id === emp._id ? { ...e, ...updated } : e)));
      if (updated.isActive) message.success(`Đã kích hoạt tài khoản ${emp.name}!`);
      else message.warning(`Đã vô hiệu hóa tài khoản ${emp.name}!`);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return employees.filter((emp) => {
      const matchRole = roleFilter === "all" || emp.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "locked" && emp.isLocked) ||
        (statusFilter === "active" && emp.isActive && !emp.isLocked);
      const matchQuery =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q) ||
        (emp.phone || "").toLowerCase().includes(q) ||
        (emp.position || "").toLowerCase().includes(q);
      return matchRole && matchStatus && matchQuery;
    });
  }, [employees, roleFilter, statusFilter, searchQuery]);

  const metrics = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.isActive && !e.isLocked).length,
      locked: employees.filter((e) => e.isLocked).length,
      admins: employees.filter((e) => e.role === UserRole.ADMIN).length,
    }),
    [employees],
  );

  const columns: TableColumnsType<User> = [
    {
      title: "Họ tên",
      key: "name",
      render: (_: unknown, record: User) => (
        <div className="flex items-center gap-3">
          {record.avatar ? (
            <img
              src={record.avatar}
              alt={record.name}
              className="w-10 h-10 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
              <UserOutlined />
            </div>
          )}
          <div>
            <span className="font-bold text-slate-900 text-sm block">{record.name}</span>
            <span className="text-[11px] text-slate-400 block">{record.position || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Vai trò",
      dataIndex: "role",
      key: "role",
      width: 160,
      render: (role: UserRole) => (
        <Tag
          color={ROLE_COLORS[role] || "default"}
          className="!rounded-md !px-2 !py-0.5 !text-xs !font-bold"
        >
          {ROLE_LABELS[role] || role}
        </Tag>
      ),
    },
    {
      title: "Liên hệ",
      key: "contact",
      width: 220,
      render: (_: unknown, record: User) => (
        <div className="text-xs">
          <span className="font-mono text-slate-800 font-bold block">{record.phone || "—"}</span>
          <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
            {record.email}
          </span>
        </div>
      ),
    },
    {
      title: "Chi nhánh",
      dataIndex: "branch",
      key: "branch",
      width: 140,
      render: (branch?: string) => <span className="text-xs text-slate-700">{branch || "—"}</span>,
    },
    {
      title: "Ngày tạo",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 120,
      render: (v: string) => (
        <span className="text-xs text-slate-600">{new Date(v).toLocaleDateString("vi-VN")}</span>
      ),
    },
    {
      title: "Tài khoản",
      key: "account_status",
      width: 130,
      align: "center",
      render: (_: unknown, record: User) =>
        record.isLocked ? (
          <Tag color="error" className="!rounded-full !px-2.5 !text-[11px] !font-bold">
            ĐÃ KHÓA
          </Tag>
        ) : record.isActive ? (
          <Tag color="green" className="!rounded-full !px-2.5 !text-[11px] !font-bold">
            HOẠT ĐỘNG
          </Tag>
        ) : (
          <Tag color="default" className="!rounded-full !px-2.5 !text-[11px] !font-bold">
            VÔ HIỆU HÓA
          </Tag>
        ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 290,
      align: "right",
      render: (_: unknown, record: User) => (
        <div className="flex items-center justify-end gap-1.5">
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
            {record.isLocked ? "Mở khóa" : "Khóa"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(record)}
            className="!text-[11px] !h-8 !px-2 !rounded-xl !bg-slate-100 hover:!bg-slate-200 !text-slate-700"
          >
            {record.isActive ? "Vô hiệu hóa" : "Kích hoạt"}
          </Button>
        </div>
      ),
    },
  ];

  const kpis = [
    { label: "Tổng nhân sự", value: metrics.total, icon: <TeamOutlined />, tone: "slate" },
    {
      label: "Đang hoạt động",
      value: metrics.active,
      icon: <CheckCircleOutlined />,
      tone: "emerald",
    },
    { label: "Đã khóa", value: metrics.locked, icon: <LockOutlined />, tone: "rose" },
    {
      label: "Quản lý (Admin)",
      value: metrics.admins,
      icon: <SafetyCertificateOutlined />,
      tone: "purple",
    },
  ];
  const toneClass: Record<string, string> = {
    slate: "bg-slate-50 border-slate-200 text-slate-800",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <TeamOutlined className="text-xl" />
              </div>
              <Title
                level={2}
                className="!text-xl sm:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight"
              >
                Quản Lý Nhân Sự & Phân Quyền
              </Title>
            </div>
            <Text className="!text-xs sm:!text-sm !text-slate-500 max-w-2xl block">
              Tạo tài khoản nhân viên, gán vai trò truy cập hệ thống và khóa/mở khóa tài khoản.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<ReloadOutlined />}
              onClick={handleRefresh}
              className="!rounded-xl !text-xs !text-slate-600"
            >
              Làm mới
            </Button>
            <Button
              variant="primary"
              size="md"
              leftIcon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold shadow-sm"
            >
              Thêm nhân viên
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          {kpis.map((k) => (
            <div key={k.label} className={`p-4 rounded-2xl border ${toneClass[k.tone]}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider">{k.label}</span>
                {k.icon}
              </div>
              <span className="text-2xl sm:text-3xl font-black tracking-tight">{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-3xl border border-slate-200 shadow-xs">
        <SegmentedPillList
          items={[
            { key: "staff", label: "Hồ sơ nhân sự", badge: employees.length },
            { key: "permissions", label: "Phân quyền vai trò" },
          ]}
          activeKey={activeTab}
          onSelect={(key) => setActiveTab(key)}
        />
      </div>

      {activeTab === "permissions" && <PermissionMatrixPanel roleLabels={ROLE_LABELS} />}

      {activeTab === "staff" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={roleFilter}
                onChange={(val) => setRoleFilter(val)}
                className="!w-44 !rounded-xl !text-xs"
                options={[{ value: "all", label: "Tất cả vai trò" }, ...ROLE_OPTIONS]}
              />
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                className="!w-44 !rounded-xl !text-xs"
                options={[
                  { value: "all", label: "Tất cả trạng thái" },
                  { value: "active", label: "Đang hoạt động" },
                  { value: "locked", label: "Đã khóa" },
                ]}
              />
            </div>

            <div className="w-full sm:w-72">
              <Input
                placeholder="Tìm tên, email, SĐT, chức danh..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                className="!rounded-xl !h-10 text-xs"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <Table<User>
              columns={columns}
              dataSource={filteredEmployees}
              rowKey="_id"
              loading={loading}
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

      <Modal
        open={modalOpen}
        onCancel={handleCloseModal}
        footer={null}
        width={600}
        title={
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <UserOutlined className="text-emerald-600 text-lg" />
            <span className="font-black text-slate-900 text-base">
              {editing ? "Chỉnh sửa nhân viên" : "Thêm nhân viên mới"}
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
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại:</label>
              <Input
                placeholder="0901..."
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="!h-10 !rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email: {!editing && <span className="text-rose-500">*</span>}
              </label>
              <Input
                type="email"
                placeholder="nhanvien@cuezone.vn"
                value={form.email}
                disabled={!!editing}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            {!editing && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu: <span className="text-rose-500">*</span>
                </label>
                <Input.Password
                  placeholder="Tối thiểu 8 ký tự, gồm chữ và số"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="!h-10 !rounded-xl text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vai trò hệ thống:
              </label>
              <Select
                value={form.role}
                onChange={(val) => setForm((prev) => ({ ...prev, role: val as UserRole }))}
                className="!w-full !rounded-xl !text-xs !h-10"
                options={ROLE_OPTIONS}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chức danh:</label>
              <Input
                placeholder="Phục vụ khu VIP, Thu ngân..."
                value={form.position}
                onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Chi nhánh:</label>
              <Input
                placeholder="Tên chi nhánh"
                value={form.branch}
                onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
                className="!h-10 !rounded-xl text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              size="md"
              onClick={handleCloseModal}
              className="!rounded-xl !text-xs"
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={saving}
              onClick={handleSave}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold px-6 !text-xs"
            >
              {editing ? "Cập nhật" : "Lưu nhân viên"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmployeesPage;
