// ============================================================================
// 1. IMPORTS & TYPES
// ============================================================================
import { message } from "../../../../shared/ui";
import type { CustomerOrder } from "../../../../services/customer-order.service";

/**
 * Tiện ích in phiếu order bếp / quầy bar trực tiếp qua pop-up trình duyệt (80mm)
 * @param order Đối tượng đơn hàng gọi món của khách
 */
export function printKitchenTicket(order: CustomerOrder) {
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
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <p style="text-align: center; font-size: 10px; color: #666;">In lúc: ${new Date().toLocaleTimeString("vi-VN")}</p>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}
