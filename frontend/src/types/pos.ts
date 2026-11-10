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
  transfers?: SessionTransferRecord[];
}

export interface SessionTransferRecord {
  action: "transfer" | "merge";
  fromTableId: string;
  fromTableCode: string;
  fromTableName: string;
  toTableId: string;
  toTableCode: string;
  toTableName: string;
  transferredAt: string;
  transferredBy?: {
    id?: string;
    name?: string;
  };
  carriedCostSnapshot: number;
  carriedFnbCount: number;
  previousPricePerHour?: number;
  newPricePerHour?: number;
  reason?: string;
}

export interface PosOrderItem {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  orderTime: string;
  status: "served" | "pending" | "cancelled";
  cancelledQuantity?: number;
  cancelReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  stockRestored?: boolean;
  originTableName?: string;
}

export interface PosTable {
  id: string;
  name: string;
  code: string;
  type: "pool" | "carom" | "snooker";
  typeName: string;
  pricePerHour: number;
  area?: string;
  floor?: number;
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
  status: "pending" | "approved" | "rejected" | "checked_in" | "confirmed" | "cancelled";
  rejectionReason?: string;
  tableType?: string;
  createdAt: string;
}

export interface SplitTimeSlot {
  tierName: string;
  startTime: string;
  endTime: string;
  minutes: number;
  pricePerHour: number;
  cost: number;
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
  carriedCost?: number;
  transfers?: SessionTransferRecord[];
  timeSlots?: SplitTimeSlot[];
  orders: PosOrderItem[];
  fnbTotal: number;
  subtotal: number;
  discountPercent: number;
  voucherCode?: string;
  discountAmount: number;
  deposit: number;
  finalAmount: number;
  refundAmount: number;
  paymentMethod:
    | "cash"
    | "vnpay"
    | "transfer"
    | "card"
    | "split"
    | "cash_qr"
    | string;
  paymentDetails?: {
    cashAmount: number;
    transferAmount: number;
  };
  earnedPoints?: number;
  pointsAwarded?: number;
  invoiceCode: string;
  checkoutTime: string;
}

export interface EligibleMoveTargetItem {
  id: string;
  code: string;
  name: string;
  type: string;
  area?: string;
  floor?: number;
  status: string;
  pricePerHour: number;
  priceDiffPerHour?: number;
  isSamePrice?: boolean;
  customerName?: string;
  customerPhone?: string;
  durationMinutes?: number;
  currentCost?: number;
  ordersCount?: number;
  carriedCost?: number;
}

export interface EligibleMoveTargetsResponse {
  source: {
    id: string;
    code: string;
    name: string;
    type: string;
    pricePerHour: number;
    durationMinutes: number;
    currentCost: number;
    ordersCount: number;
    deposit: number;
    customerName: string;
  };
  targets: EligibleMoveTargetItem[];
}
