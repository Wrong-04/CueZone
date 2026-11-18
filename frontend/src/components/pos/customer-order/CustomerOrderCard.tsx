// ============================================================================
// 1. IMPORTS
// ============================================================================
// 1.1 Thư viện bên ngoài
import React from "react";
import {
  CheckOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  InfoCircleOutlined,
  PrinterOutlined,
} from "@ant-design/icons";

// 1.2 UI Components & Services nội bộ
import { Button, Tooltip, message } from "../../../shared/ui";

// 1.4 Types
import type {
  CustomerOrder,
  CustomerOrderStatus,
} from "../../../services/customer-order.service";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface CustomerOrderCardProps {
  order: CustomerOrder;
  isBusy: boolean;
  onUpdateStatus: (order: CustomerOrder, nextStatus: CustomerOrderStatus) => void;
  onOpenReject: (order: CustomerOrder) => void;
}

// ============================================================================
// 3. CONSTANTS & HELPERS (CẤU HÌNH TRẠNG THÁI, PHÂN LOẠI PHỤ KIỆN & IN PHIẾU)
// ============================================================================
const STATUS_CONFIG: Record<
  CustomerOrderStatus,
  { label: string; tagBg: string }
> = {
  pending: {
    label: "Chờ xác nhận",
    tagBg: "bg-amber-50 text-amber-800 border-amber-300",
  },
  preparing: {
    label: "Đang pha chế / Bếp",
    tagBg: "bg-blue-50 text-blue-800 border-blue-200",
  },
  ready: {
    label: "Sẵn sàng phục vụ",
    tagBg: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  served: {
    label: "Đã phục vụ",
    tagBg: "bg-slate-100 text-slate-600 border-slate-200",
  },
  rejected: {
    label: "Đã từ chối",
    tagBg: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

const FNB_KEYWORDS = [
  "nước", "trà", "cà phê", "cafe", "bia", "mì", "cơm", "bò", "gà",
  "xúc xích", "khoai", "nem", "hướng dương", "bánh", "sting", "coca",
  "pepsi", "redbull", "cam", "chanh", "khô bò", "khô gà", "lon", "chai",
];

// Kiểm tra xem đơn gọi có phải toàn phụ kiện bida (lơ, găng tay, cơ...) để hiển thị nhãn phù hợp
function isAccessoryOrder(order: CustomerOrder): boolean {
  if (!order.items || order.items.length === 0) return false;
  const hasFnb = order.items.some((item) => {
    const name = item.name.toLowerCase();
    return FNB_KEYWORDS.some((kw) => name.includes(kw));
  });
  return !hasFnb;
}

// In phiếu order bếp / bar / kho khổ 80mm
export function printOrderTicket(order: CustomerOrder): void {
  const printWindow = window.open("", "_blank", "width=380,height=560");
  if (!printWindow) {
    message.warning("Vui lòng cho phép mở popup để in phiếu order");
    return;
  }

  const itemsHtml = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px dashed #bbb;">
        <td style="padding: 7px 0; font-weight: bold; font-size: 13px;">${item.name}</td>
        <td style="padding: 7px 0; text-align: center; font-size: 15px; font-weight: 900;">x${item.quantity}</td>
      </tr>`,
    )
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Phiếu Bếp / Kho - ${order.tableName}</title>
        <style>
          body { font-family: monospace, sans-serif; padding: 12px; max-width: 280px; margin: 0 auto; color: #000; }
          h2 { text-align: center; margin: 0; font-size: 17px; }
          p { margin: 4px 0; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .badge { font-size: 15px; font-weight: bold; text-align: center; background: #e5e7eb; padding: 5px; border-radius: 4px; margin: 6px 0; }
        </style>
      </head>
      <body>
        <h2>CUEZONE CLUB</h2>
        <p style="text-align: center; font-size: 11px;">PHIẾU ORDER TẠI BÀN (BẾP / BAR / KHO)</p>
        <div class="divider"></div>
        <div class="badge">${order.tableName}</div>
        <p>Mã đơn: <strong>#${order.orderCode}</strong></p>
        <p>Giờ gọi: ${new Date(order.createdAt).toLocaleTimeString("vi-VN")} (${new Date(order.createdAt).toLocaleDateString("vi-VN")})</p>
        ${order.note ? `<p style="background: #fef3c7; padding: 4px; border: 1px solid #fde68a;">Ghi chú: <strong>${order.note}</strong></p>` : ""}
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; text-align: left; font-size: 11px;">
              <th>TÊN MÓN / PHỤ KIỆN</th>
              <th style="text-align: center;">SL</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="divider"></div>
        <p style="text-align: center; font-size: 10px;">--- Vui lòng chuẩn bị và giao ra bàn ---</p>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ============================================================================
// 4. MAIN COMPONENT: THẺ ĐƠN GỌI MÓN F&B / PHỤ KIỆN TỪ KHÁCH TẠI BÀN
// ============================================================================
export const CustomerOrderCard: React.FC<CustomerOrderCardProps> = ({
  order,
  isBusy,
  onUpdateStatus,
  onOpenReject,
}) => {
  const isPending = order.status === "pending";
  const isPreparing = order.status === "preparing";
  const isReady = order.status === "ready";
  const statusMeta = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const isAccessory = isAccessoryOrder(order);
  const hoursOld = (Date.now() - new Date(order.createdAt).getTime()) / 3600000;
  const isOldOrder = hoursOld > 24;

  let customStatusLabel = statusMeta.label;
  let customTagBg = statusMeta.tagBg;
  if (isPreparing && isAccessory) {
    customStatusLabel = "Đang chuẩn bị đồ";
    customTagBg = "bg-purple-50 text-purple-700 border-purple-200";
  } else if (isReady && isAccessory) {
    customStatusLabel = "Đã lấy đồ xong";
    customTagBg = "bg-emerald-50 text-emerald-800 border-emerald-300";
  }

  return (
    <div
      className={`rounded-2xl border transition-all p-3.5 space-y-3 shadow-2xs ${
        isPending
          ? "bg-amber-50/40 border-amber-300 ring-1 ring-amber-200"
          : isOldOrder
            ? "bg-slate-50/80 border-slate-300 opacity-90"
            : "bg-white border-slate-200"
      }`}
    >
      {/* Hàng đầu: Tên bàn, Mã đơn & Trạng thái */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-700 text-white text-xs font-black tracking-tight whitespace-nowrap">
              {order.tableName}
            </span>
            <span className="text-[11px] font-mono font-bold text-slate-500 whitespace-nowrap">
              #{order.orderCode}
            </span>
            {isOldOrder && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 whitespace-nowrap">
                Đơn cũ ({Math.floor(hoursOld / 24)} ngày trước)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5 whitespace-nowrap">
            <ClockCircleOutlined className="text-slate-400 text-[10px]" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              ({new Date(order.createdAt).toLocaleDateString("vi-VN")})
            </span>
          </div>
        </div>

        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${customTagBg}`}>
          {customStatusLabel}
        </span>
      </div>

      {/* Chi tiết các món khách gọi & Ghi chú */}
      <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-2.5 space-y-1.5 text-xs">
        {order.items.map((item, idx) => (
          <div key={`${order._id}-${idx}`} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-black text-slate-800 text-xs">{item.quantity}x</span>
              <span className="truncate text-slate-800 font-medium">{item.name}</span>
            </div>
            <span className="font-mono text-slate-600 shrink-0 font-semibold text-[11px] whitespace-nowrap">
              {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
            </span>
          </div>
        ))}

        {order.note && (
          <div className="pt-1.5 mt-1 border-t border-slate-200/80 text-[11px] text-amber-900 bg-amber-50/90 p-1.5 rounded-lg flex items-start gap-1.5">
            <InfoCircleOutlined className="text-amber-600 text-xs shrink-0 mt-0.5" />
            <span>
              <strong>Ghi chú:</strong> {order.note}
            </span>
          </div>
        )}
      </div>

      {/* Tổng tiền & Cụm nút thao tác duyệt / từ chối / in phiếu */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <div>
          <span className="text-[10px] text-slate-400 block whitespace-nowrap">Tổng tiền món:</span>
          <span className="font-mono font-black text-sm text-emerald-700 whitespace-nowrap">
            {order.totalAmount.toLocaleString("vi-VN")}đ
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <Tooltip title="In phiếu (80mm)">
            <Button
              variant="outline"
              size="sm"
              onClick={() => printOrderTicket(order)}
              icon={<PrinterOutlined className="text-slate-600" />}
              className="!h-8 !w-8 !p-0 !rounded-xl !border-slate-300 hover:!bg-slate-100 shrink-0"
            />
          </Tooltip>

          {isOldOrder && !isPending ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => onOpenReject(order)}
                leftIcon={<CloseOutlined className="text-rose-500" />}
                className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50 whitespace-nowrap shrink-0"
              >
                Hủy đơn
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={isBusy}
                onClick={() => onUpdateStatus(order, "served")}
                leftIcon={<CheckOutlined />}
                className="!h-8 !px-3 !rounded-xl text-xs font-bold !bg-emerald-600 hover:!bg-emerald-700 text-white shadow-2xs whitespace-nowrap shrink-0"
              >
                Đóng đơn cũ
              </Button>
            </>
          ) : (
            <>
              {isPending && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onOpenReject(order)}
                    leftIcon={<CloseOutlined className="text-rose-500" />}
                    className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50 whitespace-nowrap shrink-0"
                  >
                    Từ chối
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onUpdateStatus(order, "preparing")}
                    leftIcon={<CheckOutlined />}
                    className="!h-8 !px-3 !rounded-xl text-xs font-bold !bg-emerald-600 hover:!bg-emerald-700 text-white shadow-2xs whitespace-nowrap shrink-0"
                  >
                    Xác nhận duyệt
                  </Button>
                </>
              )}

              {isPreparing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onOpenReject(order)}
                    leftIcon={<CloseOutlined className="text-rose-500" />}
                    className="!h-8 !px-2.5 !rounded-xl text-xs font-semibold !text-rose-600 !border-rose-200 hover:!bg-rose-50 whitespace-nowrap shrink-0"
                  >
                    Hủy
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => onUpdateStatus(order, isAccessory ? "served" : "ready")}
                    leftIcon={<CheckOutlined />}
                    className={`!h-8 !px-3 !rounded-xl text-xs font-bold text-white shadow-2xs whitespace-nowrap shrink-0 ${
                      isAccessory
                        ? "!bg-purple-600 hover:!bg-purple-700"
                        : "!bg-blue-600 hover:!bg-blue-700"
                    }`}
                  >
                    {isAccessory ? "Đã giao tại bàn" : "Báo xong món"}
                  </Button>
                </>
              )}

              {isReady && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onUpdateStatus(order, "served")}
                  leftIcon={<CheckOutlined className="text-emerald-600" />}
                  className="!h-8 !px-3 !rounded-xl text-xs font-bold !border-emerald-300 !text-emerald-700 hover:!bg-emerald-50 whitespace-nowrap shrink-0"
                >
                  Đã phục vụ
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
