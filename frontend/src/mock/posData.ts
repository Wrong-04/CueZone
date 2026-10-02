export interface PosTableSession {
  sessionStart: string;
  startedAt: number; // Date.now() timestamp
  isPaused: boolean;
  pausedAt?: number;
  totalPausedMs: number;
  customerName: string;
  customerPhone?: string;
  isMember: boolean;
  memberRank?: "Standard" | "Gold" | "Diamond VIP";
  orders: PosOrderItem[];
  note?: string;
}

export interface PosOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  orderTime: string;
  status: "served" | "pending";
}

export interface PosTable {
  id: string;
  name: string;
  code: string;
  type: "standard" | "vip" | "match";
  typeName: string;
  pricePerHour: number;
  status: "available" | "playing" | "paused" | "booked" | "maintenance";
  bookedInfo?: {
    customerName: string;
    phone: string;
    time: string;
    bookingId: string;
  };
  currentSession?: PosTableSession;
}

export interface BookingRequest {
  id: string;
  customerName: string;
  phone: string;
  tableId: string;
  tableName: string;
  date: string;
  time: string;
  duration: number;
  estimatedCost: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

export interface FnbStockItem {
  id: string;
  code: string;
  name: string;
  category: "coffee" | "tea" | "juice" | "beer" | "food" | "snack" | "equipment";
  categoryName: string;
  price: number;
  priceFormatted: string;
  stockQuantity: number;
  minThreshold: number;
  unit: string;
  image: string;
}

export interface TournamentMatchScore {
  matchId: string;
  tournamentName: string;
  tableId: string;
  tableName: string;
  refereeName: string;
  raceTo: number;
  currentRack: number;
  activePlayerTurn: 1 | 2;
  player1: {
    id: string;
    name: string;
    rank: string;
    elo: number;
    avatar: string;
    score: number;
    fouls: number;
    bankShots: number;
  };
  player2: {
    id: string;
    name: string;
    rank: string;
    elo: number;
    avatar: string;
    score: number;
    fouls: number;
    bankShots: number;
  };
  status: "in_progress" | "finished";
  winnerId?: string;
}

// ── Initial Mock Data ──────────────────────────────────────────────────────────

const now = Date.now();

export const INITIAL_POS_TABLES: PosTable[] = [
  {
    id: "TB-01",
    name: "Bàn 01",
    code: "T01",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "playing",
    currentSession: {
      sessionStart: "10:15",
      startedAt: now - 3600000 * 1.5, // 1h 30m ago
      isPaused: false,
      totalPausedMs: 0,
      customerName: "Nguyễn Hải Long",
      customerPhone: "0908 112 334",
      isMember: true,
      memberRank: "Gold",
      orders: [
        { id: "o-1", name: "Cà Phê Muối CueZone Signature", price: 35000, quantity: 2, category: "coffee", orderTime: "10:20", status: "served" },
        { id: "o-2", name: "Bò Khô Cháy Tỏi Chanh Ớt", price: 65000, quantity: 1, category: "snack", orderTime: "10:45", status: "served" },
      ],
      note: "Khách quen CLB, mượn cơ Predator",
    },
  },
  {
    id: "TB-02",
    name: "Bàn 02",
    code: "T02",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "available",
  },
  {
    id: "TB-03",
    name: "Bàn 03",
    code: "T03",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "paused",
    currentSession: {
      sessionStart: "10:45",
      startedAt: now - 3600000 * 0.8,
      isPaused: true,
      pausedAt: now - 300000,
      totalPausedMs: 300000,
      customerName: "Trần Anh Khoa",
      customerPhone: "0912 445 566",
      isMember: false,
      orders: [
        { id: "o-3", name: "Bia Heineken Silver", price: 35000, quantity: 4, category: "beer", orderTime: "10:50", status: "served" },
      ],
      note: "Khách giải lao hút thuốc 10 phút",
    },
  },
  {
    id: "TB-05",
    name: "Bàn 05",
    code: "T05",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "available",
  },
  {
    id: "TB-06",
    name: "Bàn 06",
    code: "T06",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "booked",
    bookedInfo: {
      customerName: "Vũ Minh Quân",
      phone: "0988 776 554",
      time: "14:00 (Hôm nay)",
      bookingId: "BK-102",
    },
  },
  {
    id: "TB-08",
    name: "Bàn 08",
    code: "T08",
    type: "standard",
    typeName: "Bàn Thường 9FT",
    pricePerHour: 50000,
    status: "maintenance",
  },
  {
    id: "TB-09",
    name: "Bàn VIP 09",
    code: "V09",
    type: "vip",
    typeName: "Bàn VIP Bank Pool",
    pricePerHour: 70000,
    status: "playing",
    currentSession: {
      sessionStart: "09:30",
      startedAt: now - 3600000 * 2.2, // 2h 12m ago
      isPaused: false,
      totalPausedMs: 0,
      customerName: "Đặng Tuấn Anh",
      customerPhone: "0912 345 678",
      isMember: true,
      memberRank: "Diamond VIP",
      orders: [
        { id: "o-4", name: "Trà Đào Cam Sả Tươi", price: 38000, quantity: 2, category: "tea", orderTime: "09:40", status: "served" },
        { id: "o-5", name: "Cơm Chiên Hải Sản Hoàng Gia", price: 75000, quantity: 2, category: "food", orderTime: "11:00", status: "served" },
        { id: "o-6", name: "Bia Corona Extra Chai", price: 48000, quantity: 4, category: "beer", orderTime: "11:10", status: "served" },
      ],
      note: "Đang giao lưu Bank Pool độ giờ",
    },
  },
  {
    id: "TB-10",
    name: "Bàn VIP 10",
    code: "V10",
    type: "vip",
    typeName: "Bàn VIP Bank Pool",
    pricePerHour: 70000,
    status: "available",
  },
  {
    id: "TB-12",
    name: "Bàn VIP 12",
    code: "V12",
    type: "vip",
    typeName: "Bàn VIP Bank Pool",
    pricePerHour: 70000,
    status: "available",
  },
  {
    id: "TB-13",
    name: "Bàn Match 13",
    code: "M13",
    type: "match",
    typeName: "Bàn Match K-Steel (VAR)",
    pricePerHour: 80000,
    status: "playing",
    currentSession: {
      sessionStart: "10:30",
      startedAt: now - 3600000 * 1.1,
      isPaused: false,
      totalPausedMs: 0,
      customerName: "Trọng tài Bùi Quốc Bảo (Giải Bank Pool)",
      customerPhone: "0934 998 811",
      isMember: true,
      orders: [
        { id: "o-7", name: "Nước Ép Bưởi Hồng Ép Lạnh", price: 45000, quantity: 2, category: "juice", orderTime: "10:35", status: "served" },
      ],
      note: "Bàn đấu bán kết Q3 - Có camera VAR ghi hình",
    },
  },
  {
    id: "TB-14",
    name: "Bàn Match 14",
    code: "M14",
    type: "match",
    typeName: "Bàn Match K-Steel (VAR)",
    pricePerHour: 80000,
    status: "available",
  },
];

export const INITIAL_BOOKING_REQUESTS: BookingRequest[] = [
  {
    id: "BK-101",
    customerName: "Hoàng Minh Trí",
    phone: "0933 123 456",
    tableId: "TB-02",
    tableName: "Bàn 02 (Bàn Thường 9FT)",
    date: "Hôm nay",
    time: "14:30",
    duration: 2,
    estimatedCost: 100000,
    status: "pending",
    createdAt: "10 phút trước",
  },
  {
    id: "BK-102",
    customerName: "Vũ Minh Quân",
    phone: "0988 776 554",
    tableId: "TB-06",
    tableName: "Bàn 06 (Bàn Thường 9FT)",
    date: "Hôm nay",
    time: "14:00",
    duration: 3,
    estimatedCost: 150000,
    status: "approved",
    createdAt: "30 phút trước",
  },
  {
    id: "BK-103",
    customerName: "Ngô Đức Duy",
    phone: "0977 443 211",
    tableId: "TB-10",
    tableName: "Bàn VIP 10 (Bàn VIP Bank Pool)",
    date: "Hôm nay",
    time: "16:00",
    duration: 2,
    estimatedCost: 140000,
    status: "pending",
    createdAt: "45 phút trước",
  },
  {
    id: "BK-104",
    customerName: "Phạm Thành Đạt",
    phone: "0909 888 777",
    tableId: "TB-13",
    tableName: "Bàn Match 13 (Bàn Match K-Steel)",
    date: "Hôm nay",
    time: "11:00",
    duration: 2,
    estimatedCost: 160000,
    status: "rejected",
    rejectionReason: "Trùng khung giờ thi đấu giải bán kết Bank Pool nội bộ",
    createdAt: "2 giờ trước",
  },
  {
    id: "BK-105",
    customerName: "Lê Văn Hùng",
    phone: "0918 332 211",
    tableId: "TB-05",
    tableName: "Bàn 05 (Bàn Thường 9FT)",
    date: "Hôm nay",
    time: "19:30",
    duration: 4,
    estimatedCost: 200000,
    status: "pending",
    createdAt: "5 phút trước",
  },
];

export const INITIAL_FNB_STOCK: FnbStockItem[] = [
  {
    id: "fnb-01",
    code: "CF-01",
    name: "Cà Phê Muối CueZone Signature",
    category: "coffee",
    categoryName: "Cà Phê",
    price: 35000,
    priceFormatted: "35.000đ",
    stockQuantity: 45,
    minThreshold: 15,
    unit: "Ly",
    image: "/fnb/fnb-salt-coffee.jpg",
  },
  {
    id: "fnb-02",
    code: "CF-02",
    name: "Bạc Xỉu Sữa Tươi Nóng / Đá",
    category: "coffee",
    categoryName: "Cà Phê",
    price: 32000,
    priceFormatted: "32.000đ",
    stockQuantity: 38,
    minThreshold: 15,
    unit: "Ly",
    image: "/fnb/fnb-salt-coffee.jpg",
  },
  {
    id: "fnb-03",
    code: "TEA-01",
    name: "Trà Đào Cam Sả Tươi",
    category: "tea",
    categoryName: "Trà Trái Cây",
    price: 38000,
    priceFormatted: "38.000đ",
    stockQuantity: 28,
    minThreshold: 10,
    unit: "Ly",
    image: "/fnb/fnb-peach-tea.jpg",
  },
  {
    id: "fnb-04",
    code: "JUI-01",
    name: "Nước Ép Bưởi Hồng Ép Lạnh",
    category: "juice",
    categoryName: "Nước Ép",
    price: 45000,
    priceFormatted: "45.000đ",
    stockQuantity: 8, // Sắp hết
    minThreshold: 10,
    unit: "Ly",
    image: "/fnb/fnb-peach-tea.jpg",
  },
  {
    id: "fnb-05",
    code: "BEER-01",
    name: "Bia Heineken Silver Lon 330ml",
    category: "beer",
    categoryName: "Bia & Đồ Có Cồn",
    price: 35000,
    priceFormatted: "35.000đ",
    stockQuantity: 120,
    minThreshold: 24,
    unit: "Lon",
    image: "/fnb/fnb-cold-beer.jpg",
  },
  {
    id: "fnb-06",
    code: "BEER-02",
    name: "Bia Corona Extra Chai 355ml",
    category: "beer",
    categoryName: "Bia & Đồ Có Cồn",
    price: 48000,
    priceFormatted: "48.000đ",
    stockQuantity: 5, // Sắp hết
    minThreshold: 12,
    unit: "Chai",
    image: "/fnb/fnb-cold-beer.jpg",
  },
  {
    id: "fnb-07",
    code: "FOOD-01",
    name: "Mì Xào Bò Trứng Ốp La",
    category: "food",
    categoryName: "Món Ăn Nóng",
    price: 55000,
    priceFormatted: "55.000đ",
    stockQuantity: 30,
    minThreshold: 10,
    unit: "Phần",
    image: "/fnb/fnb-beef-noodles.jpg",
  },
  {
    id: "fnb-08",
    code: "FOOD-02",
    name: "Cơm Chiên Hải Sản Hoàng Gia",
    category: "food",
    categoryName: "Món Ăn Nóng",
    price: 75000,
    priceFormatted: "75.000đ",
    stockQuantity: 0, // Hết hàng
    minThreshold: 10,
    unit: "Dĩa",
    image: "/fnb/fnb-seafood-rice.jpg",
  },
  {
    id: "fnb-09",
    code: "SNK-01",
    name: "Bò Khô Cháy Tỏi Chanh Ớt",
    category: "snack",
    categoryName: "Ăn Vặt",
    price: 65000,
    priceFormatted: "65.000đ",
    stockQuantity: 18,
    minThreshold: 8,
    unit: "Hũ",
    image: "/fnb/fnb-beef-jerky.jpg",
  },
  {
    id: "fnb-10",
    code: "EQ-01",
    name: "Lơ Bida Kamui Roku Xanh Chuẩn Giải",
    category: "equipment",
    categoryName: "Phụ Kiện",
    price: 600000,
    priceFormatted: "600.000đ",
    stockQuantity: 14,
    minThreshold: 5,
    unit: "Cục",
    image: "/fnb/fnb-billiard-gear.jpg",
  },
  {
    id: "fnb-11",
    code: "EQ-02",
    name: "Bao Tay Bida Predator Special Edition",
    category: "equipment",
    categoryName: "Phụ Kiện",
    price: 350000,
    priceFormatted: "350.000đ",
    stockQuantity: 22,
    minThreshold: 5,
    unit: "Chiếc",
    image: "/fnb/fnb-billiard-gear.jpg",
  },
];

export const INITIAL_TOURNAMENT_MATCH: TournamentMatchScore = {
  matchId: "MATCH-BP-01",
  tournamentName: "CueZone Bank Pool Master Q3 - Vòng Bán Kết 1",
  tableId: "TB-13",
  tableName: "Bàn Match 13 (K-Steel VAR)",
  refereeName: "Bùi Quốc Bảo (Trọng tài Quốc gia)",
  raceTo: 5,
  currentRack: 4,
  activePlayerTurn: 1,
  player1: {
    id: "P1",
    name: "Đặng Tuấn Anh",
    rank: "Master",
    elo: 1850,
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
    score: 2,
    fouls: 1,
    bankShots: 11,
  },
  player2: {
    id: "P2",
    name: "Trần Minh Quang",
    rank: "Senior",
    elo: 1820,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    score: 1,
    fouls: 2,
    bankShots: 8,
  },
  status: "in_progress",
};
