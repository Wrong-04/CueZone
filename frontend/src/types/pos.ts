export interface PosTableSession {
  sessionId: string;
  sessionStart: string;
  startedAt: number;
  pricePerHour?: number;
  carriedCost?: number;
  deposit?: number;
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
  bookedInfo?: { customerName: string; phone: string; time: string; bookingId: string };
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
  deposit: number;
  note?: string;
  status: "pending" | "approved" | "rejected" | "checked_in";
  rejectionReason?: string;
  createdAt: string;
}

export interface CheckoutReceipt {
  tableName: string;
  typeName: string;
  customerName: string;
  customerPhone?: string;
  sessionStart: string;
  sessionEnd: string;
  durationFormatted: string;
  durationMinutes: number;
  pricePerHour: number;
  playingCost: number;
  orders: PosOrderItem[];
  fnbTotal: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  deposit: number;
  finalAmount: number;
  refundAmount: number;
  paymentMethod: "cash";
  invoiceCode: string;
  checkoutTime: string;
}
