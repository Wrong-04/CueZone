export enum UserRole {
  ADMIN = "admin",
  STAFF = "staff",
  CASHIER = "cashier",
  WAREHOUSE = "warehouse",
  REFEREE = "referee",
  CUSTOMER = "customer",
}

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

export enum TableStatus {
  AVAILABLE = "available",
  PLAYING = "playing",
  BOOKED = "booked",
  MAINTENANCE = "maintenance",
}

export enum TableType {
  STANDARD_9FT = "standard_9ft",
  VIP_BANK_POOL = "vip_bank_pool",
  MATCH_KSTEEL = "match_ksteel",
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
  createdAt: string;
  updatedAt: string;
}

export interface PricingTier {
  _id: string;
  name: string;
  dayType: string;
  startTime: string;
  endTime: string;
  prices: {
    standard: number;
    vip: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
