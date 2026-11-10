import { requirePermission } from "./auth.middleware";

// Xem tồn kho, báo cáo kho, phiếu kiểm (ma trận RBAC: inventory.read).
export const requireInventoryRead = requirePermission("inventory", "read");
