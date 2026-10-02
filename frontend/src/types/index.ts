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
  isActive: boolean;
  isLocked: boolean;
  branch?: string;
  position?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export const TableStatus = {
  AVAILABLE: "available",
  PLAYING: "playing",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
} as const;
export type TableStatus = (typeof TableStatus)[keyof typeof TableStatus];

export const TableType = {
  STANDARD_9FT: "standard_9ft",
  VIP_BANK_POOL: "vip_bank_pool",
  MATCH_KSTEEL: "match_ksteel",
} as const;
export type TableType = (typeof TableType)[keyof typeof TableType];

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
  };
  isActive: boolean;
  isCurrentlyActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

