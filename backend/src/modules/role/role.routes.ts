import { Router } from "express";
import { requireRole } from "../../middlewares/auth.middleware";
import { UserRole } from "../user/user.model";
import { Role } from "./role.model";
import {
  PERMISSION_CATALOG,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  RBAC_VERSION,
  getEffectivePermissions,
  normalizePermissions,
} from "./permission.catalog";

const router = Router();

// Chỉ Admin được xem/sửa ma trận phân quyền (không cấu hình được, tránh leo thang quyền).
router.use(requireRole(UserRole.ADMIN));

const isConfigurable = (role: string) => (CONFIGURABLE_ROLES as readonly string[]).includes(role);

router.get("/matrix", async (_req, res, next) => {
  try {
    const customized = await Role.find({
      name: { $in: CONFIGURABLE_ROLES },
      rbacVersion: RBAC_VERSION,
    })
      .select("name")
      .lean();
    const customizedNames = new Set(customized.map((r) => r.name));
    const roles = await Promise.all(
      CONFIGURABLE_ROLES.map(async (role) => ({
        role,
        permissions: await getEffectivePermissions(role),
        customized: customizedNames.has(role),
      })),
    );
    res.json({ success: true, data: { catalog: PERMISSION_CATALOG, roles } });
  } catch (error) {
    next(error);
  }
});

router.put("/:role/permissions", async (req, res, next) => {
  try {
    const role = req.params.role;
    if (!isConfigurable(role)) {
      res.status(400).json({ success: false, message: "Vai trò này không cấu hình được quyền" });
      return;
    }
    const permissions = normalizePermissions(req.body?.permissions);
    await Role.findOneAndUpdate(
      { name: role },
      {
        $set: { permissions, rbacVersion: RBAC_VERSION },
        $setOnInsert: { displayName: role, isDefault: true },
      },
      { upsert: true },
    );
    res.json({
      success: true,
      message: "Đã lưu phân quyền",
      data: { role, permissions, customized: true },
    });
  } catch (error: any) {
    if (String(error?.message).includes("không hợp lệ")) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
});

// Khôi phục mặc định: gỡ cấu hình tùy chỉnh để role dùng lại DEFAULT_ROLE_PERMISSIONS.
router.delete("/:role/permissions", async (req, res, next) => {
  try {
    const role = req.params.role;
    if (!isConfigurable(role)) {
      res.status(400).json({ success: false, message: "Vai trò này không cấu hình được quyền" });
      return;
    }
    await Role.updateOne({ name: role }, { $unset: { rbacVersion: 1 } });
    res.json({
      success: true,
      message: "Đã khôi phục quyền mặc định",
      data: { role, permissions: DEFAULT_ROLE_PERMISSIONS[role] || [], customized: false },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
