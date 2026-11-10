import { requirePermission } from "./auth.middleware";

// Quản lý hàng hóa/kho: nhập xuất, kiểm kê, hao hụt, danh mục (ma trận RBAC: inventory.manage).
export const requireProductManager = requirePermission("inventory", "manage");
