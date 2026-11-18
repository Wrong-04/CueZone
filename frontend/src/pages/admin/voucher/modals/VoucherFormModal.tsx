// ============================================================================
// 1. IMPORTS
// ============================================================================
import React, { type FormEvent } from "react";
import dayjs from "dayjs";
import {
  GiftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import { Button, DatePicker, Input, Modal, Select } from "../../../../shared/ui";
import type { Voucher } from "../../../../services/voucher.service";
import { localDateTime, type VoucherForm } from "../types/voucher.types";

// ============================================================================
// 2. TYPES & INTERFACES
// ============================================================================
interface VoucherFormModalProps {
  open: boolean;
  editing: Voucher | null;
  form: VoucherForm;
  saving: boolean;
  onClose: () => void;
  setForm: React.Dispatch<React.SetStateAction<VoucherForm>>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

// ============================================================================
// 3. MAIN COMPONENT: MODAL TẠO MỚI / CHỈNH SỬA VOUCHER
// ============================================================================
export const VoucherFormModal: React.FC<VoucherFormModalProps> = ({
  open,
  editing,
  form,
  saving,
  onClose,
  setForm,
  onSubmit,
}) => {
  // Sinh mã ngẫu nhiên tiền tố CZ + 4 ký tự ngẫu nhiên
  const generateRandomCode = () => {
    const prefix = "CZ";
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    setForm((prev) => ({ ...prev, code: `${prefix}${randomChars}` }));
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      className="!w-full max-w-2xl"
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
          <GiftOutlined className="text-emerald-600 text-lg" />
          {editing ? `Cập nhật voucher: ${editing.code}` : "Tạo voucher mới"}
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4 pt-2">
        {/* Nhóm 1: Thông tin chương trình */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Thông tin chương trình
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Mã voucher <span className="text-rose-500">*</span>
                </span>
                {!editing && (
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ReloadOutlined className="text-[10px]" /> Sinh mã ngẫu nhiên
                  </button>
                )}
              </div>
              <Input
                required
                maxLength={32}
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })}
                placeholder="VD: CUEZONE20"
                className="font-mono uppercase !rounded-xl !h-10 text-sm font-bold text-emerald-800 tracking-wider w-full"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                Mã duy nhất (tối đa 32 ký tự, viết hoa)
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Tên / Mô tả chương trình
                </span>
              </div>
              <Input
                maxLength={250}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="VD: Ưu đãi giờ vàng cho hội viên mới"
                className="!rounded-xl !h-10 text-sm w-full"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                Mô tả ngắn gọn mục đích và nội dung ưu đãi
              </span>
            </div>
          </div>
        </div>

        {/* Nhóm 2: Mức giảm & Điều kiện áp dụng */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. Mức giảm & Điều kiện áp dụng
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Cặp 1: Hình thức giảm & Mức giảm */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Hình thức giảm giá <span className="text-rose-500">*</span>
              </span>
              <Select
                disabled={Boolean(editing && editing.usageCount > 0)}
                value={form.discountType}
                onChange={(value) => setForm({ ...form, discountType: value })}
                options={[
                  { value: "percent", label: "Phần trăm (%)" },
                  { value: "fixed", label: "Số tiền cố định (đ)" },
                ]}
                className="w-full !rounded-xl !h-10 text-sm"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                {form.discountType === "percent" ? "Trừ theo % tổng hóa đơn" : "Trừ trực tiếp số tiền cố định"}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Mức giảm ({form.discountType === "percent" ? "%" : "đ"}) <span className="text-rose-500">*</span>
              </span>
              <Input
                required
                type="number"
                min={form.discountType === "fixed" ? 1000 : 1}
                step="any"
                max={form.discountType === "percent" ? 100 : undefined}
                disabled={Boolean(editing && editing.usageCount > 0)}
                value={form.discountValue}
                onChange={(event) => setForm({ ...form, discountValue: event.target.value })}
                placeholder={form.discountType === "percent" ? "VD: 20" : "VD: 50.000"}
                className={`w-full !rounded-xl !h-10 text-sm ${editing && editing.usageCount > 0 ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                {editing && editing.usageCount > 0
                  ? `Đã khóa do voucher đã có ${editing.usageCount} lượt dùng`
                  : form.discountType === "percent"
                    ? "Nhập từ 1% đến 100%"
                    : "Số tiền giảm cụ thể (VNĐ)"}
              </span>
            </div>

            {/* Cặp 2: Giảm tối đa & Hóa đơn tối thiểu */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Mức giảm tối đa (đ)
              </span>
              <Input
                type="number"
                min={0}
                step="any"
                disabled={form.discountType === "fixed"}
                value={form.discountType === "fixed" ? "" : form.maxDiscountAmount}
                onChange={(event) => setForm({ ...form, maxDiscountAmount: event.target.value })}
                placeholder={form.discountType === "fixed" ? "Không áp dụng cho tiền cố định" : "VD: 50.000"}
                className={`w-full !rounded-xl !h-10 text-sm ${form.discountType === "fixed" ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                {form.discountType === "fixed"
                  ? "Giảm cố định không cần trần tiền"
                  : "Trần giảm tối đa (chống thất thoát doanh thu)"}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Hóa đơn tối thiểu (đ)
              </span>
              <Input
                required
                type="number"
                min={0}
                step="any"
                value={form.minOrderAmount}
                onChange={(event) => setForm({ ...form, minOrderAmount: event.target.value })}
                placeholder="0đ = Áp dụng mọi hóa đơn"
                className="w-full !rounded-xl !h-10 text-sm"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                Hóa đơn phải đạt từ mức này mới được giảm
              </span>
            </div>

            {/* Cặp 3: Đối tượng áp dụng & Giới hạn số lượt dùng */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Đối tượng áp dụng <span className="text-rose-500">*</span>
              </span>
              <Select
                value={form.targetAudience}
                onChange={(value) => setForm({ ...form, targetAudience: value })}
                options={[
                  { value: "all", label: "Tất cả Hội viên (Ưu đãi chung)" },
                  { value: "new_member", label: "🎁 Chào mừng Hội viên mới (Tự động tặng khi đăng ký)" },
                  { value: "vip", label: "⭐ Chỉ Hội viên VIP (Hạng Bạc trở lên)" },
                ]}
                className="w-full !rounded-xl !h-10 text-sm"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                {form.targetAudience === "new_member"
                  ? "Tự động hiển thị và tặng khi khách tạo tài khoản"
                  : form.targetAudience === "vip"
                    ? "Chỉ khách hàng có hạng thẻ VIP (Bạc trở lên)"
                    : "Đối tượng khách hàng được phép hưởng mã"}
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Số lượt sử dụng tối đa
              </span>
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(event) => setForm({ ...form, maxUses: event.target.value })}
                placeholder="Để trống nếu không giới hạn"
                className="w-full !rounded-xl !h-10 text-sm"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                Tổng số lần mã này có thể dùng tại quán
              </span>
            </div>
          </div>
        </div>

        {/* Nhóm 3: Thời gian hiệu lực */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Thời gian hiệu lực
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100/70 transition-colors select-none">
              <input
                type="checkbox"
                checked={form.isUnlimitedExpiry}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setForm({
                    ...form,
                    isUnlimitedExpiry: checked,
                    expiresAt: checked
                      ? ""
                      : form.expiresAt || localDateTime(new Date(Date.now() + 30 * 24 * 60 * 1000)),
                  });
                }}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
              />
              <span>Vô thời hạn (Không bao giờ hết hạn)</span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Thời gian bắt đầu <span className="text-rose-500">*</span>
              </span>
              <DatePicker
                showTime={{ format: "HH:mm" }}
                format="DD/MM/YYYY HH:mm"
                value={form.startsAt ? dayjs(form.startsAt) : null}
                onChange={(val) => setForm({ ...form, startsAt: val && !Array.isArray(val) ? val.toISOString() : "" })}
                className="w-full !rounded-xl !h-10 text-sm"
                placeholder="Chọn thời gian bắt đầu"
              />
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                Thời điểm mã bắt đầu có thể áp dụng tại quầy
              </span>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-700 block">
                Thời gian kết thúc {form.isUnlimitedExpiry ? "" : <span className="text-rose-500">*</span>}
              </span>
              {form.isUnlimitedExpiry ? (
                <div className="w-full !h-10 rounded-xl bg-emerald-50/80 border border-emerald-200/90 flex items-center px-3.5 text-xs font-semibold text-emerald-800 gap-1.5">
                  <CheckCircleOutlined className="text-emerald-600" /> Mã có hiệu lực vô thời hạn
                </div>
              ) : (
                <DatePicker
                  showTime={{ format: "HH:mm" }}
                  format="DD/MM/YYYY HH:mm"
                  value={form.expiresAt ? dayjs(form.expiresAt) : null}
                  onChange={(val) => setForm({ ...form, expiresAt: val && !Array.isArray(val) ? val.toISOString() : "" })}
                  className="w-full !rounded-xl !h-10 text-sm"
                  placeholder="Chọn thời gian kết thúc"
                />
              )}
              <span className="text-[11px] text-slate-400 block min-h-[16px]">
                {form.isUnlimitedExpiry
                  ? "Mã sẽ luôn có hiệu lực cho đến khi tắt thủ công"
                  : "Hết thời gian này mã sẽ tự động chuyển sang Đã hết hạn"}
              </span>
            </div>
          </div>
        </div>

        {/* Nút hành động Modal */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            htmlType="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="!rounded-xl !h-10 px-5 text-sm font-semibold !border-slate-300 !text-slate-700 hover:!bg-slate-100"
          >
            Hủy bỏ
          </Button>
          <Button
            htmlType="submit"
            loading={saving}
            className="!rounded-xl !h-10 px-6 !bg-emerald-600 hover:!bg-emerald-700 font-bold text-sm shadow-sm text-white border-0"
          >
            {editing ? "Lưu thay đổi" : "Tạo voucher"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
