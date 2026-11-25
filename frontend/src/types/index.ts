export const UserRole = {
  ADMIN: "admin",
  STAFF: "staff",
  CASHIER: "cashier",
  WAREHOUSE: "warehouse",
  REFEREE: "referee",
  CUSTOMER: "customer",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  bio?: string;
  favoriteGame?: string;
  notificationSettings?: {
    bookingReminder?: boolean;
    tournamentNews?: boolean;
  };
  elo?: number;
  rank?: string;
  isActive: boolean;
  isLocked: boolean;
  branch?: string;
  position?: string;
  // Quyền hiệu lực theo ma trận RBAC, trả về từ /auth/profile và /auth/login.
  permissions?: RolePermission[];
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  module: string;
  actions: string[];
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  inheritedPoints?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const TableStatus = {
  AVAILABLE: "available",
  PLAYING: "playing",
  PAUSED: "paused",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const TableType = {
  POOL: "pool",
  CAROM: "carom",
  SNOOKER: "snooker",
} as const;
export type TableType = (typeof TableType)[keyof typeof TableType];

export type TableEquipmentCondition = "ok" | "low" | "broken";

export interface TableEquipment {
  ballsSetCount: number;
  cueCount: number;
  chalkCount: number;
  triangleCount: number;
  glovesCount: number;
  feltCondition: TableEquipmentCondition;
  lightCondition: TableEquipmentCondition;
  note?: string;
}

export interface BilliardTable {
  _id: string;
  code: string;
  name: string;
  type: TableType;
  area: string;
  floor: number;
  pricePerHour: number;
  status: TableStatus;
  isActive: boolean;
  pricingTier?: string;
  // Vật tư ban đầu của bàn (bộ bi, cơ/gậy, phấn/lơ, tam giác, găng tay + tình trạng nỉ/đèn)
  equipment?: TableEquipment;
  // Các thuộc tính trạng thái khả dụng phục vụ luồng đặt bàn
  isAvailable?: boolean;
  unavailableReason?: "booked" | "playing" | null;
  createdAt: string;
  updatedAt: string;
}

export interface PricingTier {
  _id: string;
  name: string;
  dayType: string;
  startTime: string;
  endTime: string;
  daysOfWeek?: number[];
  prices: {
    standard: number;
    vip: number;
    match?: number;
  };
  isActive: boolean;
  isCurrentlyActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FnbStockItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  categoryName: string;
  price: number;
  priceFormatted: string;
  stockQuantity: number;
  minThreshold: number;
  unit: string;
  image: string;
  isMadeToOrder?: boolean;
  costPrice?: number;
  isForSale?: boolean;
  productType?: "fnb" | "ingredient" | "accessory";
}
