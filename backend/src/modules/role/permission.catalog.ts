import { Role, IPermission } from "./role.model";
import { UserRole } from "../user/user.model";

// Danh mục quyền duy nhất của hệ thống: mỗi route nghiệp vụ gắn requirePermission(module, action)
// bằng đúng key ở đây. Thêm quyền mới = thêm action vào catalog + gắn vào route.
export const PERMISSION_CATALOG = [
  {
    module: "pos",
    label: "Vận hành bàn (POS)",
    actions: [
      { key: "read", label: "Xem sơ đồ bàn, bảng giá, tra cứu khách" },
      { key: "operate", label: "Mở/đóng phiên, chuyển/gộp bàn, thanh toán, áp voucher" },
    ],
  },
  {
    module: "tables",
    label: "Danh mục bàn",
    actions: [{ key: "manage", label: "Thêm, sửa, xóa bàn" }],
  },
  {
    module: "bookings",
    label: "Đặt bàn",
    actions: [{ key: "manage", label: "Xem, tạo, duyệt đặt bàn" }],
  },
  {
    module: "invoices",
    label: "Hóa đơn",
    actions: [
      { key: "read", label: "Xem danh sách và chi tiết hóa đơn" },
      { key: "manage", label: "Hủy hóa đơn và quản lý hóa đơn" },
    ],
  },
  {
    module: "fnb_orders",
    label: "Order F&B",
    actions: [{ key: "manage", label: "Xử lý hàng đợi order, yêu cầu thanh toán" }],
  },
  {
    module: "products",
    label: "Thực đơn F&B",
    actions: [{ key: "manage", label: "Thêm, sửa, xóa món" }],
  },
  {
    module: "inventory",
    label: "Kho hàng",
    actions: [
      { key: "read", label: "Xem tồn kho, báo cáo kho, phiếu kiểm" },
      { key: "manage", label: "Nhập/xuất kho, kiểm kê, hao hụt, danh mục hàng hóa" },
    ],
  },
  {
    module: "suppliers",
    label: "Nhà cung cấp",
    actions: [{ key: "manage", label: "Quản lý nhà cung cấp" }],
  },
  {
    module: "tournaments",
    label: "Giải đấu",
    actions: [{ key: "manage", label: "Tạo/sửa giải, đối soát lệ phí" }],
  },
  {
    module: "wallet",
    label: "Ví hội viên",
    actions: [{ key: "operate", label: "Đối soát yêu cầu nạp ví" }],
  },
  {
    module: "vouchers",
    label: "Voucher",
    actions: [{ key: "manage", label: "Tạo, sửa, xóa voucher" }],
  },
  {
    module: "pricing",
    label: "Bảng giá",
    actions: [{ key: "manage", label: "Tạo, sửa, kích hoạt bảng giá" }],
  },
  {
    module: "reports",
    label: "Báo cáo",
    actions: [{ key: "read", label: "Xem báo cáo doanh thu, hiệu suất bàn" }],
  },
] as const;

export type PermissionModule = (typeof PERMISSION_CATALOG)[number]["module"];

// Vai trò nhân sự cấu hình được trên ma trận. Admin luôn toàn quyền (không cấu hình để tránh tự khóa),
// customer dùng requireRole(CUSTOMER) cho API tự phục vụ nên không nằm trong ma trận.
export const CONFIGURABLE_ROLES = [
  UserRole.STAFF,
  UserRole.CASHIER,
  UserRole.WAREHOUSE,
  UserRole.REFEREE,
] as const;

const POS_STAFF_DEFAULTS: IPermission[] = [
  { module: "pos", actions: ["read", "operate"] },
  { module: "tables", actions: ["manage"] },
  { module: "bookings", actions: ["manage"] },
  { module: "invoices", actions: ["read", "manage"] },
  { module: "fnb_orders", actions: ["manage"] },
  { module: "products", actions: ["manage"] },
  { module: "tournaments", actions: ["manage"] },
  { module: "wallet", actions: ["operate"] },
];

// Mặc định giữ đúng hành vi của các middleware cũ (requirePosStaff, requireInventoryRead,
// requireProductManager, requireSupplierManager...). Admin chỉnh trên UI sẽ ghi đè vào collection roles.
export const DEFAULT_ROLE_PERMISSIONS: Record<string, IPermission[]> = {
  [UserRole.STAFF]: [...POS_STAFF_DEFAULTS, { module: "inventory", actions: ["read"] }],
  [UserRole.CASHIER]: [...POS_STAFF_DEFAULTS],
  [UserRole.WAREHOUSE]: [
    { module: "inventory", actions: ["read", "manage"] },
    { module: "suppliers", actions: ["manage"] },
  ],
  [UserRole.REFEREE]: [],
};

// ponytail: collection roles có thể chứa bản ghi cũ (định dạng trước RBAC động: "manager", "tables:update"...).
// Chỉ tin bản ghi có rbacVersion hiện tại; bản ghi cũ bị bỏ qua và dùng mặc định, khỏi cần migration.
export const RBAC_VERSION = 1;

export const ALL_PERMISSIONS: IPermission[] = PERMISSION_CATALOG.map((m) => ({
  module: m.module,
  actions: m.actions.map((a) => a.key),
}));

export function isValidPermission(module: string, action: string): boolean {
  return PERMISSION_CATALOG.some(
    (m) => m.module === module && m.actions.some((a) => a.key === action),
  );
}

// Lọc bỏ module/action không có trong catalog và gộp trùng.
export function normalizePermissions(input: unknown): IPermission[] {
  if (!Array.isArray(input)) throw new Error("Danh sách quyền không hợp lệ");
  const map = new Map<string, Set<string>>();
  for (const item of input) {
    const module = typeof item?.module === "string" ? item.module : "";
    const actions: unknown[] = Array.isArray(item?.actions) ? item.actions : [];
    for (const action of actions) {
      if (typeof action !== "string" || !isValidPermission(module, action)) {
        throw new Error(`Quyền không hợp lệ: ${module}.${String(action)}`);
      }
      if (!map.has(module)) map.set(module, new Set());
      map.get(module)!.add(action);
    }
  }
  return [...map.entries()].map(([module, actions]) => ({ module, actions: [...actions] }));
}

export async function getEffectivePermissions(role: string): Promise<IPermission[]> {
  if (role === UserRole.ADMIN) return ALL_PERMISSIONS;
  if (!(CONFIGURABLE_ROLES as readonly string[]).includes(role)) return [];
  const doc = await Role.findOne({ name: role, rbacVersion: RBAC_VERSION }).lean();
  return doc ? doc.permissions : DEFAULT_ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(perms: IPermission[], module: string, action: string): boolean {
  return perms.some((p) => p.module === module && p.actions.includes(action));
}
