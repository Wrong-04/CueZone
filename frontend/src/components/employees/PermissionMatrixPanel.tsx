import React, { useEffect, useMemo, useState } from "react";
import { SafetyCertificateOutlined, UndoOutlined, SaveOutlined } from "@ant-design/icons";
import { Button, Checkbox, Spin, Tag, message } from "../../shared/ui";
import {
  roleService,
  type PermissionCatalogModule,
  type RolePermissionConfig,
} from "../../services/role.service";
import type { RolePermission } from "../../types";

interface PermissionMatrixPanelProps {
  roleLabels: Record<string, string>;
}

// Map role -> tập "module.action" đang bật.
type Draft = Record<string, Set<string>>;

const toSet = (perms: RolePermission[]) =>
  new Set(perms.flatMap((p) => p.actions.map((a) => `${p.module}.${a}`)));

const toPermissions = (keys: Set<string>): RolePermission[] => {
  const map = new Map<string, string[]>();
  keys.forEach((key) => {
    const [module, action] = key.split(".");
    map.set(module, [...(map.get(module) || []), action]);
  });
  return [...map.entries()].map(([module, actions]) => ({ module, actions }));
};

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((k) => b.has(k));

const getErrorMessage = (err: unknown): string => {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e?.response?.data?.message || e?.message || "Đã có lỗi xảy ra";
};

export const PermissionMatrixPanel: React.FC<PermissionMatrixPanelProps> = ({ roleLabels }) => {
  const [catalog, setCatalog] = useState<PermissionCatalogModule[]>([]);
  const [roles, setRoles] = useState<RolePermissionConfig[]>([]);
  const [draft, setDraft] = useState<Draft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyMatrix = (nextRoles: RolePermissionConfig[]) => {
    setRoles(nextRoles);
    setDraft(Object.fromEntries(nextRoles.map((r) => [r.role, toSet(r.permissions)])));
  };

  useEffect(() => {
    roleService
      .getMatrix()
      .then((matrix) => {
        setCatalog(matrix.catalog);
        applyMatrix(matrix.roles);
      })
      .catch((err) => message.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const dirtyRoles = useMemo(
    () => roles.filter((r) => draft[r.role] && !sameSet(draft[r.role], toSet(r.permissions))),
    [roles, draft],
  );

  const toggle = (role: string, key: string, checked: boolean) => {
    setDraft((prev) => {
      const next = new Set(prev[role]);
      if (checked) next.add(key);
      else next.delete(key);
      return { ...prev, [role]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await Promise.all(
        dirtyRoles.map((r) => roleService.savePermissions(r.role, toPermissions(draft[r.role]))),
      );
      applyMatrix(roles.map((r) => saved.find((s) => s.role === r.role) || r));
      message.success(
        "Đã lưu phân quyền. Nhân viên đang đăng nhập cần tải lại trang để cập nhật menu.",
      );
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (role: string) => {
    try {
      const reset = await roleService.resetPermissions(role);
      applyMatrix(roles.map((r) => (r.role === role ? reset : r)));
      message.success(`Đã khôi phục quyền mặc định cho ${roleLabels[role] || role}`);
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 flex justify-center">
        <Spin />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-900 mb-0.5 flex items-center gap-2">
            <SafetyCertificateOutlined className="text-emerald-600" />
            Ma trận phân quyền theo vai trò
          </h3>
          <p className="text-xs text-slate-500 mb-0">
            Admin luôn có toàn quyền. Quản lý nhân sự và phân quyền chỉ dành cho Admin. Thay đổi có
            hiệu lực ngay với mọi API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<UndoOutlined />}
            disabled={!dirtyRoles.length || saving}
            onClick={() => applyMatrix(roles)}
            className="!rounded-xl !text-xs"
          >
            Hoàn tác
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<SaveOutlined />}
            loading={saving}
            disabled={!dirtyRoles.length}
            onClick={handleSave}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl !font-bold"
          >
            Lưu thay đổi{dirtyRoles.length ? ` (${dirtyRoles.length})` : ""}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
            <tr>
              <th className="py-3 px-6">Chức năng & quyền hạn</th>
              <th className="py-3 px-4 text-center">{roleLabels.admin || "Admin"}</th>
              {roles.map((r) => (
                <th key={r.role} className="py-3 px-4 text-center align-top">
                  <div>{roleLabels[r.role] || r.role}</div>
                  <div className="mt-1 flex flex-col items-center gap-1">
                    <Tag
                      color={r.customized ? "blue" : "default"}
                      className="!rounded-full !text-[10px] !m-0"
                    >
                      {r.customized ? "Tùy chỉnh" : "Mặc định"}
                    </Tag>
                    {r.customized && (
                      <button
                        type="button"
                        onClick={() => handleReset(r.role)}
                        className="text-[10px] font-medium text-slate-500 hover:text-emerald-700 underline"
                      >
                        Khôi phục mặc định
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {catalog.map((mod) => (
              <React.Fragment key={mod.module}>
                <tr className="bg-slate-50/60">
                  <td
                    colSpan={roles.length + 2}
                    className="py-2 px-6 font-black text-slate-800 text-[11px] uppercase tracking-wider"
                  >
                    {mod.label}
                  </td>
                </tr>
                {mod.actions.map((action) => {
                  const key = `${mod.module}.${action.key}`;
                  return (
                    <tr key={key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 pl-10 text-slate-700">{action.label}</td>
                      <td className="py-3 px-4 text-center">
                        <Checkbox checked disabled aria-label={`Admin: ${action.label}`} />
                      </td>
                      {roles.map((r) => (
                        <td key={r.role} className="py-3 px-4 text-center">
                          <Checkbox
                            checked={draft[r.role]?.has(key) ?? false}
                            disabled={saving}
                            onChange={(e) => toggle(r.role, key, e.target.checked)}
                            aria-label={`${roleLabels[r.role] || r.role}: ${action.label}`}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PermissionMatrixPanel;
