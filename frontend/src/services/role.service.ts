import api from "./api";
import type { ApiResponse, RolePermission } from "../types";

export interface PermissionCatalogModule {
  module: string;
  label: string;
  actions: { key: string; label: string }[];
}

export interface RolePermissionConfig {
  role: string;
  permissions: RolePermission[];
  customized: boolean;
}

export interface PermissionMatrix {
  catalog: PermissionCatalogModule[];
  roles: RolePermissionConfig[];
}

const unwrap = <T>(data: ApiResponse<T>): T => {
  if (!data.success) throw new Error(data.message);
  return data.data as T;
};

export const roleService = {
  async getMatrix(): Promise<PermissionMatrix> {
    const { data } = await api.get<ApiResponse<PermissionMatrix>>("/roles/matrix");
    return unwrap(data);
  },

  async savePermissions(
    role: string,
    permissions: RolePermission[],
  ): Promise<RolePermissionConfig> {
    const { data } = await api.put<ApiResponse<RolePermissionConfig>>(
      `/roles/${role}/permissions`,
      { permissions },
    );
    return unwrap(data);
  },

  async resetPermissions(role: string): Promise<RolePermissionConfig> {
    const { data } = await api.delete<ApiResponse<RolePermissionConfig>>(
      `/roles/${role}/permissions`,
    );
    return unwrap(data);
  },
};
