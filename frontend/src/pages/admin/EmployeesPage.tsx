import React, { useState, useEffect } from "react";
import { employeeService } from "../../services/employee.service";
import type { User } from "../../types";
import { UserRole } from "../../types";

const roleLabels: Record<string, string> = {
  [UserRole.ADMIN]: "Quản lý CLB",
  [UserRole.STAFF]: "Nhân viên Phục vụ",
  [UserRole.CASHIER]: "Thu ngân",
  [UserRole.WAREHOUSE]: "Thủ kho",
  [UserRole.REFEREE]: "Điều phối Giải đấu",
  [UserRole.CUSTOMER]: "Khách hàng",
};

const roleBadgeColors: Record<string, string> = {
  [UserRole.ADMIN]: "bg-orange-100 text-orange-700",
  [UserRole.STAFF]: "bg-blue-100 text-blue-700",
  [UserRole.CASHIER]: "bg-green-100 text-green-700",
  [UserRole.WAREHOUSE]: "bg-purple-100 text-purple-700",
  [UserRole.REFEREE]: "bg-yellow-100 text-yellow-700",
  [UserRole.CUSTOMER]: "bg-gray-100 text-gray-700",
};

const permissionModules = [
  {
    name: "Quản lý Bàn & Billing",
    permissions: [
      { key: "open_table", label: "Mở bàn & Đặt bàn trước", desc: "Tạo phiên chơi mới và nhận lịch đặt bàn" },
      { key: "print_invoice", label: "In hóa đơn & Áp dụng ưu đãi", desc: "Chốt giờ, xuất bill tạm tính và chiết khấu VIP" },
      { key: "cancel_invoice", label: "Hủy hóa đơn / Cho nợ", desc: "Yêu cầu quyền Quản lý CLB phê duyệt", restricted: true },
    ],
  },
  {
    name: "Quản lý Kho & F&B",
    permissions: [
      { key: "view_inventory", label: "Xem tồn kho thực đơn F&B", desc: "Tra cứu số lượng đồ uống & phụ kiện sẵn có" },
      { key: "manage_inventory", label: "Lập phiếu nhập / xuất kho", desc: "Dành riêng cho vị trí Thủ kho" },
      { key: "audit_inventory", label: "Kiểm kê & Cân bằng kho", desc: "Điều chỉnh số lượng chênh lệch thực tế" },
    ],
  },
  {
    name: "Quản lý Giải đấu Bank Pool",
    permissions: [
      { key: "register_player", label: "Đăng ký cơ thủ & Thu lệ phí", desc: "Xác nhận cơ thủ và thu lệ phí tham gia giải" },
      { key: "update_score", label: "Cập nhật tỷ số trận đấu", desc: "" },
    ],
  },
];

const employeeRoles = Object.entries(roleLabels)
  .filter(([k]) => k !== UserRole.CUSTOMER)
  .map(([value, label]) => ({ value, label }));

interface EmployeeFormData {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  position: string;
}

const emptyForm: EmployeeFormData = {
  name: "",
  email: "",
  password: "",
  role: UserRole.STAFF,
  phone: "",
  position: "",
};

const EmployeesPage = () => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("true");
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof EmployeeFormData, string>>>({});

  useEffect(() => {
    fetchEmployees();
  }, [filterRole, filterStatus]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (filterRole !== "all") filters.role = filterRole;
      if (filterStatus !== "all") filters.isActive = filterStatus;
      if (search) filters.search = search;
      const data = await employeeService.getAll(filters);
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEmployees();
  };

  const handleToggleLock = async (id: string) => {
    try {
      await employeeService.toggleLock(id);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await employeeService.toggleActive(id);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const validateForm = (isEdit: boolean): boolean => {
    const errors: Partial<Record<keyof EmployeeFormData, string>> = {};
    if (!formData.name.trim()) errors.name = "Họ tên không được để trống";
    if (!formData.email.trim()) errors.email = "Email không được để trống";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Email không hợp lệ";
    if (!isEdit && !formData.password) errors.password = "Mật khẩu không được để trống";
    else if (formData.password && (formData.password.length < 8 || !/[a-zA-Z]/.test(formData.password) || !/\d/.test(formData.password)))
      errors.password = "Mật khẩu phải chứa cả chữ cái và số, tối thiểu 8 ký tự";
    if (!formData.role) errors.role = "Vui lòng chọn vai trò";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm(false)) return;
    setSubmitting(true);
    try {
      await employeeService.create({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        position: formData.position.trim() || undefined,
      });
      setShowCreateModal(false);
      setFormData(emptyForm);
      setFormErrors({});
      fetchEmployees();
    } catch (err: any) {
      const msg = err.message || "Tạo tài khoản thất bại";
      if (/mật khẩu/i.test(msg)) setFormErrors({ password: msg });
      else if (/email/i.test(msg)) setFormErrors({ email: msg });
      else if (/họ tên/i.test(msg)) setFormErrors({ name: msg });
      else setFormErrors({ email: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (emp: User) => {
    setSelectedEmployee(emp);
    setFormData({
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      phone: emp.phone || "",
      position: emp.position || "",
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!validateForm(true)) return;
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        role: formData.role,
        phone: formData.phone.trim() || undefined,
        position: formData.position.trim() || undefined,
      };
      if (formData.password) payload.password = formData.password;
      await employeeService.update(selectedEmployee._id, payload);
      setShowEditModal(false);
      setSelectedEmployee(null);
      setFormData(emptyForm);
      setFormErrors({});
      fetchEmployees();
    } catch (err: any) {
      const msg = err.message || "Cập nhật thất bại";
      if (/mật khẩu/i.test(msg)) setFormErrors({ password: msg });
      else if (/email/i.test(msg)) setFormErrors({ email: msg });
      else if (/họ tên/i.test(msg)) setFormErrors({ name: msg });
      else setFormErrors({ email: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      await employeeService.delete(selectedEmployee._id);
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateModal = () => {
    setFormData(emptyForm);
    setFormErrors({});
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Quản lý Tài khoản & Phân quyền</h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý danh sách nhân viên và phân quyền hệ thống</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2"
        >
          <span>+</span> Tạo Tài Khoản Nhân Viên
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tìm theo tên nhân viên, email, SĐT..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="all">Vai trò: Tất cả</option>
            {Object.entries(roleLabels)
              .filter(([k]) => k !== UserRole.CUSTOMER)
              .map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="all">Trạng thái: Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Tạm khóa</option>
          </select>

          <span className="text-sm text-gray-500">
            Tổng cộng: <span className="font-semibold text-navy-800">{employees.length} nhân sự</span>
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex gap-6">
        {/* Employee table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-navy-800">
              Danh sách Tài khoản Nhân viên
              <span className="ml-2 text-sm font-normal text-gray-500">{employees.length}</span>
            </h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {employees.filter((e) => e.isActive && !e.isLocked).length} Đang hoạt động
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                {employees.filter((e) => e.isLocked).length} Tạm khóa
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Mã NV</th>
                  <th className="px-6 py-3">Họ tên</th>
                  <th className="px-6 py-3">Vai trò (Role)</th>
                  <th className="px-6 py-3">Email / SĐT</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => (
                  <tr key={emp._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-semibold text-primary-600">
                        NV{emp._id.slice(-3).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 font-bold text-sm">
                            {emp.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm text-navy-800">{emp.name}</p>
                          {emp.position && (
                            <p className="text-xs text-gray-500">{emp.position}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${roleBadgeColors[emp.role] || "bg-gray-100 text-gray-700"}`}>
                        {roleLabels[emp.role] || emp.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800">{emp.email}</p>
                      <p className="text-xs text-gray-500">{emp.phone || "-"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          emp.isLocked
                            ? "bg-gray-100 text-gray-600"
                            : emp.isActive
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-600"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            emp.isLocked ? "bg-gray-400" : emp.isActive ? "bg-green-500" : "bg-red-500"
                          }`}
                        ></span>
                        {emp.isLocked ? "Tạm khóa" : emp.isActive ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowPermissionModal(true);
                          }}
                          className="text-xs px-3 py-1.5 bg-navy-800 text-white rounded-lg hover:bg-navy-900 transition"
                        >
                          Phân quyền
                        </button>
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            setSelectedEmployee(emp);
                            setShowDeleteModal(true);
                          }}
                          className="text-xs px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
                        >
                          Xóa
                        </button>
                        {emp.isLocked ? (
                          <button
                            onClick={() => handleToggleLock(emp._id)}
                            className="text-xs px-3 py-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition"
                          >
                            Mở khóa
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleLock(emp._id)}
                            className="text-xs px-3 py-1.5 text-gray-500 hover:text-red-600 transition"
                          >
                            Khóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {employees.length === 0 && !loading && (
            <div className="py-12 text-center text-gray-500">
              <p className="text-4xl mb-3">👥</p>
              <p>Không tìm thấy nhân viên nào</p>
            </div>
          )}

          {/* Pagination placeholder */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Hiển thị 1 - {employees.length} trong tổng số {employees.length} nhân viên</span>
            <div className="flex items-center gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">&lt;</button>
              <button className="px-3 py-1 bg-primary-500 text-white rounded">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">&gt;</button>
            </div>
          </div>
        </div>

        {/* Permission Matrix Panel */}
        {showPermissionModal && selectedEmployee && (
          <div className="w-[420px] flex-shrink-0 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-800">Ma Trận Phân Quyền Role</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cấu hình quyền truy cập tính năng hệ thống</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium">
                  Role: {roleLabels[selectedEmployee.role] || selectedEmployee.role}
                </span>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto">
              {permissionModules.map((mod) => (
                <div key={mod.name}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-sm text-navy-800">{mod.name}</h4>
                    <span className="text-xs text-gray-500">
                      {mod.permissions.filter((_, i) => i < 2).length} / {mod.permissions.length} Quyền
                    </span>
                  </div>
                  <div className="space-y-3">
                    {mod.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                            {perm.label}
                            {perm.restricted && (
                              <span className="px-1.5 py-0.5 bg-red-50 text-red-500 text-[10px] rounded font-normal">
                                Giới hạn
                              </span>
                            )}
                          </p>
                          {perm.desc && (
                            <p className="text-xs text-gray-500 mt-0.5">{perm.desc}</p>
                          )}
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked={!perm.restricted}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <button className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">
                Khôi phục mặc định
              </button>
              <button className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition">
                Lưu Phân Quyền Role
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== CREATE MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCreateModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-navy-800">Tạo Tài Khoản Nhân Viên</h3>
                <p className="text-xs text-gray-500 mt-0.5">Điền thông tin để tạo tài khoản mới</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                  placeholder="Nguyễn Văn A"
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.email ? "border-red-400" : "border-gray-200"}`}
                  placeholder="nhanvien@cuezone.vn"
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu <span className="text-red-500">*</span></label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.password ? "border-red-400" : "border-gray-200"}`}
                  placeholder="Ít nhất 8 ký tự, gồm chữ và số"
                />
                {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò <span className="text-red-500">*</span></label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${formErrors.role ? "border-red-400" : "border-gray-200"}`}
                  >
                    {employeeRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {formErrors.role && <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0901234567"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chức danh</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Nhân viên phục vụ"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleCreate}
                disabled={submitting}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {submitting ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT MODAL ==================== */}
      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEditModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-navy-800">Chỉnh Sửa Nhân Viên</h3>
                <p className="text-xs text-gray-500 mt-0.5">Cập nhật thông tin tài khoản {selectedEmployee.name}</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.name ? "border-red-400" : "border-gray-200"}`}
                />
                {formErrors.name && <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.email ? "border-red-400" : "border-gray-200"}`}
                />
                {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới (để trống nếu không đổi)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${formErrors.password ? "border-red-400" : "border-gray-200"}`}
                  placeholder="Để trống nếu không muốn đổi"
                />
                {formErrors.password && <p className="text-xs text-red-500 mt-1">{formErrors.password}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vai trò <span className="text-red-500">*</span></label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white ${formErrors.role ? "border-red-400" : "border-gray-200"}`}
                  >
                    {employeeRoles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  {formErrors.role && <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chức danh</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Hủy
              </button>
              <button
                onClick={handleEdit}
                disabled={submitting}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== DELETE MODAL ==================== */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🗑️</span>
              </div>
              <h3 className="font-bold text-lg text-navy-800 mb-2">Xóa Tài Khoản Nhân Viên</h3>
              <p className="text-sm text-gray-500 mb-1">
                Bạn có chắc chắn muốn xóa tài khoản <span className="font-semibold text-gray-800">{selectedEmployee.name}</span>?
              </p>
              <p className="text-xs text-red-500">Hành động này không thể hoàn tác.</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-center gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
              >
                {submitting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;
