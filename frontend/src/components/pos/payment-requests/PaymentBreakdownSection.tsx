// ============================================================================
// 1. IMPORTS
// ============================================================================
import { ClockCircleOutlined, CoffeeOutlined } from "@ant-design/icons";
import { Tag, Typography } from "../../../shared/ui";
import { type CheckoutRequest } from "../../../services/customer-order.service";
import { type ClubBankInfo } from "../../../services/tournament.service";
import { getSepayQrUrl } from "../../../utils/sepay-qr";
import { getTypeLabel } from "../../../pages/pos/constants/posConstants";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface SepayPaymentDetailsProps {
  bank: ClubBankInfo | null;
  loading: boolean;
  error: string;
  amount: number;
  tableCode: string;
}

interface PaymentBreakdownSectionProps {
  request: CheckoutRequest;
  activeOrders: CheckoutRequest["orders"];
}

// ============================================================================
// 3. CONSTANTS & HELPERS
// ============================================================================
const { Text } = Typography;

export function formatMoney(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

// ============================================================================
// 4. SUB-COMPONENTS: HIỂN THỊ MÃ QR SEPAY & BẢNG KÊ CHI TIẾT HÓA ĐƠN
// ============================================================================

/**
 * Hiển thị mã QR động SePay và thông tin tài khoản nhận chuyển khoản
 */
export function SepayPaymentDetails({
  bank,
  loading,
  error,
  amount,
  tableCode,
}: SepayPaymentDetailsProps) {
  if (loading) return <Text type="secondary">Đang tải thông tin tài khoản SePay…</Text>;
  if (error) return <Text type="danger">{error}</Text>;
  if (!bank) return <Text type="danger">Chưa có thông tin tài khoản SePay.</Text>;

  return (
    <div className="flex items-center gap-3">
      <img
        src={getSepayQrUrl(bank, amount, tableCode)}
        alt={`Mã QR SePay bàn ${tableCode}`}
        className="h-24 w-24 rounded-lg border border-emerald-200 bg-white p-1 object-contain"
      />
      <div className="min-w-0 space-y-1 text-[11px]">
        <Tag color="green" className="!m-0 !text-[10px] !font-bold whitespace-nowrap">
          SEPAY · {bank.bankCode}
        </Tag>
        <div className="truncate text-slate-600">
          STK: <strong className="font-mono text-slate-900">{bank.accountNumber}</strong>
        </div>
        <div className="truncate text-slate-600">
          Chủ TK: <strong className="text-slate-900">{bank.accountName}</strong>
        </div>
        <div className="font-mono font-bold text-emerald-700 whitespace-nowrap">
          {formatMoney(amount)}
        </div>
        <div className="font-mono text-slate-500">Nội dung: CueZone {tableCode}</div>
      </div>
    </div>
  );
}

/**
 * Hiển thị thông tin bàn chơi, bảng kê tiền giờ + F&B và các khoản giảm trừ / tổng thanh toán
 */
export function PaymentBreakdownSection({
  request,
  activeOrders,
}: PaymentBreakdownSectionProps) {
  return (
    <>
      {/* Khối 1: Thông tin bàn, thời lượng chơi & hạng hội viên */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
          <div>
            <Text strong className="block text-sm">
              {request.tableCode} · {request.tableName}
            </Text>
            <Text type="secondary">
              {getTypeLabel(request.tableType)} · Bắt đầu lúc {request.sessionStart}
            </Text>
          </div>
          <Tag color="green" className="whitespace-nowrap">
            <ClockCircleOutlined /> {request.durationFormatted} ({request.durationMinutes} phút)
          </Tag>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <div>
            <Text strong>{request.customerName}</Text>
            <Text type="secondary" className="ml-2">
              {request.customerPhone || "Chưa có SĐT"}
            </Text>
          </div>
          <Tag color="gold" className="whitespace-nowrap">
            Hội viên {request.membershipTierName}
          </Tag>
        </div>
      </div>

      {/* Khối 2: Bảng kê chi tiết tiền giờ & các món F&B */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3">
        <Text strong className="mb-2 block">
          Bảng kê dịch vụ sử dụng
        </Text>
        <div className="space-y-2">
          <div className="flex justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <ClockCircleOutlined className="text-indigo-600" />
              Tiền giờ chơi ({request.durationMinutes} phút)
            </span>
            <Text strong className="whitespace-nowrap">{formatMoney(request.playingCost)}</Text>
          </div>
          <div className="flex justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <CoffeeOutlined className="text-amber-600" />
              Đồ uống & dịch vụ ({activeOrders.length} món)
            </span>
            <Text strong className="whitespace-nowrap">{formatMoney(request.fnbTotal)}</Text>
          </div>
          {activeOrders.length > 0 && (
            <div className="space-y-1 rounded-xl bg-slate-50 p-2">
              {activeOrders.map((order, index) => (
                <div
                  key={order.id || `${order.name}-${index}`}
                  className="flex justify-between gap-3 text-slate-600"
                >
                  <span>
                    {order.name} × {order.quantity}
                  </span>
                  <span className="shrink-0 font-mono whitespace-nowrap">
                    {formatMoney(order.price * order.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Khối 3: Chiết khấu hội viên, voucher, tiền cọc & tổng thanh toán */}
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex justify-between">
          <span>Tổng tiền dịch vụ</span>
          <span className="font-mono whitespace-nowrap">{formatMoney(request.subtotal)}</span>
        </div>
        {request.membershipDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Ưu đãi hội viên ({request.membershipTierName})</span>
            <span className="font-mono whitespace-nowrap">
              -{formatMoney(request.membershipDiscountAmount)}
            </span>
          </div>
        )}
        {request.voucherDiscountAmount > 0 && (
          <div className="flex justify-between text-emerald-700">
            <span>Voucher {request.voucherCode}</span>
            <span className="font-mono whitespace-nowrap">
              -{formatMoney(request.voucherDiscountAmount)}
            </span>
          </div>
        )}
        {request.deposit > 0 && (
          <div className="flex justify-between text-amber-700">
            <span>Tiền cọc đã trừ</span>
            <span className="font-mono whitespace-nowrap">-{formatMoney(request.deposit)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
          <span>TỔNG CỘNG THANH TOÁN</span>
          <span className="font-mono text-lg text-emerald-700 whitespace-nowrap">
            {formatMoney(request.totalDue)}
          </span>
        </div>
      </div>
    </>
  );
}
