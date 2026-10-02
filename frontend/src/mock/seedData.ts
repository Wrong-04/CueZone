import { UserRole, type User } from '../types';

export interface SeedAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  roleTitle: string;
  badge: string;
  badgeBg: string;
  avatar: string;
  ballNumber: number;
  ballBg: string;
  ballTextColor: string;
  description: string;
  targetPath: string;
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  {
    id: 'seed_admin_1',
    name: 'Nguyễn Tiến Dũng (Chủ CLB)',
    email: 'admin@cuezone.com',
    password: 'password123',
    role: UserRole.ADMIN,
    roleTitle: 'Quản trị viên (Admin)',
    badge: 'Admin CLB',
    badgeBg: 'bg-red-500/15 text-red-400 border-red-500/30',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    ballNumber: 8,
    ballBg: 'bg-neutral-900 border-2 border-neutral-700 shadow-inner',
    ballTextColor: 'text-white',
    description: 'Cấu hình giá giờ bàn, tài khoản, giải đấu, kho hàng & báo cáo doanh thu',
    targetPath: '/admin',
  },
  {
    id: 'seed_staff_1',
    name: 'Lê Thuỳ Trang (Nhân Viên Vận Hành)',
    email: 'staff@cuezone.com',
    password: 'password123',
    role: UserRole.STAFF,
    roleTitle: 'Nhân viên vận hành & POS (Staff)',
    badge: 'Staff Vận Hành',
    badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    ballNumber: 1,
    ballBg: 'bg-emerald-600 border-2 border-emerald-400 shadow-inner',
    ballTextColor: 'text-white',
    description: 'Mở bàn, duyệt đặt bàn, order F&B, in hóa đơn & báo cáo giao ca',
    targetPath: '/admin/tables',
  },
  {
    id: 'seed_customer_1',
    name: 'Đặng Tuấn Anh (Hội Viên)',
    email: 'customer@cuezone.com',
    password: 'password123',
    role: UserRole.CUSTOMER,
    roleTitle: 'Khách hàng hội viên (Customer)',
    badge: 'Hội Viên CLB',
    badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80',
    ballNumber: 7,
    ballBg: 'bg-amber-700 border-2 border-amber-600 shadow-inner',
    ballTextColor: 'text-white',
    description: 'Tra cứu bàn realtime, đặt bàn trước, gọi món F&B, tích điểm & thi đấu',
    targetPath: '/customer',
  },
];

export const CLUB_HIGHLIGHTS = [
  {
    icon: '🎱',
    title: '18+ Bàn Tiêu Chuẩn Quốc Tế',
    desc: 'Bàn thi đấu 9FT Aileex, Min Table, vải nỉ Simonis 860 cao cấp chuẩn giải',
  },
  {
    icon: '⚡',
    title: 'Tự Động Tính Giờ & Bật Bàn',
    desc: 'Hệ thống tự động đồng bộ thời gian chơi, chuyển bàn và tách tiền giờ linh hoạt',
  },
  {
    icon: '🏆',
    title: 'Giải Đấu & Xếp Hạng ELO',
    desc: 'Cập nhật bảng đấu trực tiếp, tính điểm handicap và xếp hạng cơ thủ tự động',
  },
  {
    icon: '🍹',
    title: 'Tích Hợp F&B Tại Bàn',
    desc: 'Menu đồ uống, bia tươi và đồ ăn nhẹ được order và tính vào hoá đơn bàn',
  },
];

export function findSeedAccountByEmail(email: string): SeedAccount | undefined {
  const normalized = email.trim().toLowerCase();
  const direct = SEED_ACCOUNTS.find((acc) => acc.email.toLowerCase() === normalized);
  if (direct) return direct;
  if (normalized.includes('cashier') || normalized.includes('warehouse') || normalized.includes('referee') || normalized.includes('staff')) {
    return SEED_ACCOUNTS.find((acc) => acc.role === UserRole.STAFF);
  }
  if (normalized.includes('admin')) {
    return SEED_ACCOUNTS.find((acc) => acc.role === UserRole.ADMIN);
  }
  if (normalized.includes('customer') || normalized.includes('guest') || normalized.includes('vip')) {
    return SEED_ACCOUNTS.find((acc) => acc.role === UserRole.CUSTOMER);
  }
  return undefined;
}

export function createMockUserFromSeed(seed: SeedAccount): User {
  return {
    _id: seed.id,
    name: seed.name,
    email: seed.email,
    role: seed.role,
    phone: '0901234567',
    avatar: seed.avatar,
    isActive: true,
    isLocked: false,
    branch: 'CueZone Club - Chi nhánh Landmark',
    position: seed.roleTitle,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: new Date().toISOString(),
  };
}
