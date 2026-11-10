import { useState, useEffect } from "react";
import {
  UserOutlined,
  SearchOutlined,
  DollarOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { Modal, Button, Input, message, Tag } from "../../shared/ui";
import { posService } from "../../services/pos.service";
import { tournamentService } from "../../services/tournament.service";
import type { TournamentItem } from "../../services/tournament.service";

interface CounterRegistrationModalProps {
  open: boolean;
  tournament: TournamentItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CounterRegistrationModal({
  open,
  tournament,
  onClose,
  onSuccess,
}: CounterRegistrationModalProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<{
    id?: string;
    name: string;
    phone: string;
    rank?: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) {
      setQuery("");
      setSearching(false);
      setSubmitting(false);
      setFoundCustomer(null);
      setPaymentMethod("cash");
      setNote("");
    }
  }, [open]);

  const handleSearchCustomer = async () => {
    const trimmed = query.trim();
    if (!trimmed || (trimmed.replace(/\D/g, "").length < 8 && trimmed.length < 2)) {
      message.warning("Vui lòng nhập số điện thoại hoặc tên hội viên");
      return;
    }

    setSearching(true);
    setFoundCustomer(null);
    try {
      const res = await posService.lookupCustomer(trimmed);
      if (res.success && res.data) {
        setFoundCustomer({
          id: (res.data as any)._id || (res.data as any).id,
          name: res.data.name,
          phone: res.data.phone,
          rank: res.data.rank,
        });
        message.success(`Đã tìm thấy hội viên: ${res.data.name}`);
      } else {
        message.error("Không tìm thấy hội viên phù hợp");
      }
    } catch {
      message.error("Lỗi khi tra cứu hội viên");
    } finally {
      setSearching(false);
    }
  };

  const handleRegister = async () => {
    if (!tournament || !foundCustomer?.id) {
      message.warning("Vui lòng tra cứu và chọn hội viên hợp lệ");
      return;
    }

    setSubmitting(true);
    try {
      await tournamentService.registerPlayerAtCounter(tournament._id, {
        customerId: foundCustomer.id,
        paymentMethod,
        note: note.trim() || undefined,
      });

      message.success(`Đã ghi danh cơ thủ ${foundCustomer.name} thành công!`);
      onSuccess();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Ghi danh tại quầy không thành công");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tournament) return null;

  return (
    <Modal
      open={open}
      onCancel={() => {
        if (!submitting) onClose();
      }}
      footer={null}
      width={520}
      title={
        <div className="flex items-center gap-2 text-slate-900 pb-2 border-b border-slate-100">
          <UserOutlined className="text-emerald-700 text-lg" />
          <span className="font-bold text-base">Ghi Danh Giải Đấu Tại Quầy</span>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs text-slate-700">
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl flex items-center justify-between">
          <div>
            <span className="font-bold text-slate-900 text-sm block">{tournament.name}</span>
            <span className="text-[11px] text-slate-500 font-mono">
              Lệ phí:{" "}
              {tournament.registrationFee > 0
                ? `${tournament.registrationFee.toLocaleString("vi-VN")}đ`
                : "Miễn phí"}
            </span>
          </div>
          <Tag color="blue" className="!rounded-md !m-0 !font-semibold">
            QUẦY LỄ TÂN
          </Tag>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
            Tìm hội viên theo số điện thoại hoặc họ tên
          </label>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập SĐT hoặc tên cơ thủ (ví dụ 0908888999 hoặc Nguyễn Văn A)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchCustomer()}
              disabled={searching || submitting}
              className="!rounded-xl text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              loading={searching}
              onClick={handleSearchCustomer}
              leftIcon={<SearchOutlined />}
              className="!rounded-xl shrink-0"
            >
              Tìm
            </Button>
          </div>
        </div>

        {foundCustomer && (
          <div className="p-3 bg-white border border-emerald-200 rounded-2xl shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                <CheckCircleOutlined className="text-emerald-700" />
                {foundCustomer.name}
              </span>
              <span className="text-slate-500 font-mono text-[11px]">
                <PhoneOutlined className="mr-1" />
                {foundCustomer.phone}
              </span>
            </div>
            {foundCustomer.rank && (
              <span className="text-[11px] text-slate-400 block">
                Hạng thành viên: {foundCustomer.rank}
              </span>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
            Hình thức thu lệ phí
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                paymentMethod === "cash"
                  ? "border-emerald-700 bg-emerald-50/60 text-emerald-950 shadow-2xs font-bold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <DollarOutlined
                className={paymentMethod === "cash" ? "text-emerald-700" : "text-slate-400"}
              />
              <div>
                <span className="block text-xs">Tiền mặt tại quầy</span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  Thu trực tiếp tại quầy
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod("bank_transfer")}
              className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                paymentMethod === "bank_transfer"
                  ? "border-emerald-700 bg-emerald-50/60 text-emerald-950 shadow-2xs font-bold"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <CreditCardOutlined
                className={paymentMethod === "bank_transfer" ? "text-emerald-700" : "text-slate-400"}
              />
              <div>
                <span className="block text-xs">Chuyển khoản quẹt mã</span>
                <span className="block text-[10px] text-slate-400 font-normal">
                  Khách chuyển khoản trực tiếp
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
            Ghi chú nhân viên (tùy chọn)
          </label>
          <Input
            placeholder="Ví dụ: Đã thu 150k tiền mặt ca sáng"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            className="!rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={submitting}
            className="!rounded-xl"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={submitting}
            disabled={!foundCustomer}
            onClick={handleRegister}
            className="!rounded-xl"
          >
            Xác nhận ghi danh & Thu phí
          </Button>
        </div>
      </div>
    </Modal>
  );
}
