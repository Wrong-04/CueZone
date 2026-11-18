// ============================================================================
// 1. IMPORTS
// ============================================================================
import React from "react";
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  GiftOutlined,
  HistoryOutlined,
  PoweroffOutlined,
} from "@ant-design/icons";
import { Button, Tag } from "../../../../shared/ui";
import type { Voucher } from "../../../../services/voucher.service";
import {
  formatMoney,
  safeFormatDate,
  getVoucherStatus,
} from "../types/voucher.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface VoucherTableViewProps {
  vouchers: Voucher[];
  loading: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (voucher: Voucher) => void;
  onToggleActive: (voucher: Voucher) => void;
  onDelete: (voucher: Voucher) => void;
  onShowUsage: (voucher: Voucher) => void;
  onCopyCode: (code: string) => void;
}

// ============================================================================
// 4. MAIN COMPONENT: BẢNG HIỂN THỊ DANH SÁCH VOUCHER & CHƯƠNG TRÌNH ƯU ĐÃI
// ============================================================================
export const VoucherTableView: React.FC<VoucherTableViewProps> = ({
  vouchers,
  loading,
  onOpenCreate,
  onOpenEdit,
  onToggleActive,
  onDelete,
  onShowUsage,
  onCopyCode,
}) => {
  if (loading) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm whitespace-nowrap">
        Đang tải danh sách ưu đãi...
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <div className="py-12 text-center">
        <GiftOutlined className="text-3xl text-slate-300" />
        <p className="mt-2 text-sm text-slate-500 font-medium whitespace-nowrap">
          Không tìm thấy mã ưu đãi nào phù hợp.
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={onOpenCreate}
          className="mt-3 !rounded-xl whitespace-nowrap"
        >
          + Tạo mã ưu đãi đầu tiên
        </Button>
      </div>
    );
  }

  return (
    <table className="w-full min-w-[960px] text-left text-sm border-collapse">
      <thead>
        <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          <th className="py-3 px-4 w-48 whitespace-nowrap">Mã ưu đãi</th>
          <th className="py-3 px-4 w-40 whitespace-nowrap">Mức giảm giá</th>
          <th className="py-3 px-4 w-36 whitespace-nowrap">Đối tượng</th>
          <th className="py-3 px-4 w-36 whitespace-nowrap">Điều kiện đơn</th>
          <th className="py-3 px-4 w-44 whitespace-nowrap">Thời gian hiệu lực</th>
          <th className="py-3 px-4 w-28 text-center whitespace-nowrap">Lượt sử dụng</th>
          <th className="py-3 px-4 w-32 text-center whitespace-nowrap">Trạng thái</th>
          <th className="py-3 px-4 w-44 text-right whitespace-nowrap">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {vouchers.map((voucher) => {
          const status = getVoucherStatus(voucher);
          const isPercent = voucher.discountType === "percent";
          const usagePercent = voucher.maxUses
            ? Math.min(100, Math.round((voucher.usageCount / voucher.maxUses) * 100))
            : null;

          return (
            <tr key={voucher._id} className="hover:bg-slate-50/80 transition-colors">
              {/* Cột 1: Mã voucher & Tên mô tả */}
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="font-mono text-sm font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 whitespace-nowrap">
                    {voucher.code}
                  </span>
                  <button
                    type="button"
                    title="Sao chép mã"
                    onClick={() => onCopyCode(voucher.code)}
                    className="text-slate-400 hover:text-emerald-600 transition-colors p-1"
                  >
                    <CopyOutlined className="text-xs" />
                  </button>
                </div>
                {voucher.description && (
                  <div className="text-xs text-slate-500 mt-1 max-w-xs line-clamp-1">
                    {voucher.description}
                  </div>
                )}
              </td>

              {/* Cột 2: Mức giảm giá */}
              <td className="py-3.5 px-4 font-medium text-slate-900">
                {isPercent ? (
                  <div>
                    <span className="text-emerald-700 font-bold text-base whitespace-nowrap">
                      Giảm {voucher.discountValue}%
                    </span>
                    {voucher.maxDiscountAmount ? (
                      <div className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                        Tối đa:{" "}
                        <span className="font-semibold text-slate-700">
                          {formatMoney(voucher.maxDiscountAmount)}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                        Không trần tối đa
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <span className="text-emerald-700 font-bold text-base whitespace-nowrap">
                      Giảm {formatMoney(voucher.discountValue)}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5 whitespace-nowrap">
                      Trừ trực tiếp hóa đơn
                    </div>
                  </div>
                )}
              </td>

              {/* Cột 3: Đối tượng áp dụng */}
              <td className="py-3.5 px-4 whitespace-nowrap">
                {voucher.targetAudience === "vip" ? (
                  <Tag color="gold" className="!rounded-md !px-2 !font-semibold whitespace-nowrap">
                    ⭐ Hội viên VIP
                  </Tag>
                ) : voucher.targetAudience === "new_member" ? (
                  <Tag color="cyan" className="!rounded-md !px-2 !font-semibold whitespace-nowrap">
                    🎁 Hội viên mới
                  </Tag>
                ) : (
                  <Tag color="default" className="!rounded-md !px-2 text-slate-600 whitespace-nowrap">
                    Tất cả hội viên
                  </Tag>
                )}
              </td>

              {/* Cột 4: Điều kiện đơn tối thiểu */}
              <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                {voucher.minOrderAmount && voucher.minOrderAmount > 0 ? (
                  <div>
                    Đơn từ:{" "}
                    <span className="font-semibold text-slate-800">
                      {formatMoney(voucher.minOrderAmount)}
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">Không yêu cầu</span>
                )}
              </td>

              {/* Cột 5: Thời gian hiệu lực */}
              <td className="py-3.5 px-4 text-xs whitespace-nowrap">
                <div className="text-slate-700 whitespace-nowrap">
                  <span className="text-slate-400 text-[11px]">Từ:</span>{" "}
                  {safeFormatDate(voucher.startsAt)}
                </div>
                <div className="text-slate-700 mt-0.5 whitespace-nowrap">
                  <span className="text-slate-400 text-[11px]">Đến:</span>{" "}
                  {safeFormatDate(voucher.expiresAt)}
                </div>
              </td>

              {/* Cột 6: Lượt sử dụng */}
              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                <div className="font-bold text-slate-800 text-sm whitespace-nowrap">
                  {voucher.usageCount}
                  {voucher.maxUses ? (
                    <span className="text-slate-400 text-xs font-normal">
                      {" "}/ {voucher.maxUses}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-normal"> / ∞</span>
                  )}
                </div>
                {usagePercent !== null && (
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        usagePercent >= 100
                          ? "bg-rose-500"
                          : usagePercent >= 80
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                )}
              </td>

              {/* Cột 7: Trạng thái */}
              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                <Tag
                  color={status.color}
                  className="!rounded-full !px-2.5 !py-0.5 font-semibold text-xs whitespace-nowrap"
                >
                  {status.label}
                </Tag>
              </td>

              {/* Cột 8: Cụm nút thao tác */}
              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<EditOutlined />}
                    onClick={() => onOpenEdit(voucher)}
                    title="Chỉnh sửa voucher"
                    className="!rounded-lg !px-2 text-slate-600 hover:text-emerald-700 whitespace-nowrap"
                  />
                  <Button
                    size="sm"
                    variant={voucher.isActive ? "outline" : "primary"}
                    icon={<PoweroffOutlined />}
                    onClick={() => onToggleActive(voucher)}
                    title={voucher.isActive ? "Tạm dừng mã này" : "Kích hoạt lại mã"}
                    className={`!rounded-lg !px-2 whitespace-nowrap ${
                      voucher.isActive ? "text-amber-600 hover:bg-amber-50" : "!bg-emerald-600"
                    }`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<HistoryOutlined />}
                    onClick={() => onShowUsage(voucher)}
                    title="Xem lịch sử sử dụng"
                    className="!rounded-lg !px-2.5 text-slate-600 hover:text-sky-700 whitespace-nowrap"
                  >
                    Lịch sử
                  </Button>
                  {voucher.usageCount === 0 && (
                    <Button
                      size="sm"
                      variant="danger-outline"
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(voucher)}
                      title="Xóa voucher"
                      className="!rounded-lg !px-2 text-rose-600 hover:bg-rose-50 whitespace-nowrap"
                    />
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};
