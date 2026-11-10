import type { User } from "../types";

// Key dạng "module.action", khớp backend/src/modules/role/permission.catalog.ts.
export type PermissionKey =
  | "pos.read"
  | "pos.operate"
  | "tables.manage"
  | "bookings.manage"
  | "invoices.read"
  | "fnb_orders.manage"
  | "products.manage"
  | "inventory.read"
  | "inventory.manage"
  | "suppliers.manage"
  | "tournaments.manage"
  | "wallet.operate"
  | "vouchers.manage"
  | "pricing.manage"
  | "reports.read";

export const STAFF_ROLES = ["admin", "staff", "cashier", "warehouse", "referee"];

export const hasPermission = (user: User | null | undefined, key: PermissionKey): boolean => {
  if (!user) return false;
  if (user.role === "admin") return true;
  const [module, action] = key.split(".");
  return !!user.permissions?.some((p) => p.module === module && p.actions.includes(action));
};

// Trang đích sau đăng nhập: trang đầu tiên trong danh sách mà user có quyền.
const LANDING_PAGES: { path: string; permission: PermissionKey }[] = [
  { path: "/pos", permission: "pos.read" },
  { path: "/wallet-topups", permission: "wallet.operate" },
  { path: "/stock-catalog", permission: "inventory.read" },
  { path: "/goods-receipts", permission: "inventory.manage" },
  { path: "/tournaments", permission: "tournaments.manage" },
  { path: "/booking", permission: "bookings.manage" },
  { path: "/fnb-orders", permission: "fnb_orders.manage" },
  { path: "/invoices", permission: "invoices.read" },
  { path: "/fnb", permission: "products.manage" },
  { path: "/suppliers", permission: "suppliers.manage" },
  { path: "/vouchers", permission: "vouchers.manage" },
  { path: "/reports", permission: "reports.read" },
];

export const getHomePath = (user: User | null | undefined): string => {
  if (!user || user.role === "customer") return "/customer";
  if (user.role === "admin") return "/dashboard";
  return LANDING_PAGES.find((p) => hasPermission(user, p.permission))?.path || "/no-access";
};
