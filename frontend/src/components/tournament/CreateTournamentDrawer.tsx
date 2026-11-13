import React from "react";
import dayjs from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Input, DatePicker, Select, Drawer } from "../../shared/ui";

export interface NewTourneyFormData {
  title: string;
  raceTo: number;
  feeAmount: number;
  prizePool: string;
  firstPrize: string;
  secondPrize: string;
  thirdPrize: string;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  maxParticipants: number;
  assignedTables: string;
  description: string;
}

interface CreateTournamentDrawerProps {
  open: boolean;
  loading: boolean;
  formData: NewTourneyFormData;
  onChange: React.Dispatch<React.SetStateAction<NewTourneyFormData>>;
  onSave: () => void;
  onClose: () => void;
}

const toDay = (v: string) => (v ? dayjs(v) : null);

export const CreateTournamentDrawer: React.FC<CreateTournamentDrawerProps> = ({
  open,
  loading,
  formData,
  onChange,
  onSave,
  onClose,
}) => {
  // Lịch chỉ cho chọn: hạn đăng ký >= hôm nay; khai mạc >= hạn đăng ký; bế mạc >= khai mạc.
  const regDay = toDay(formData.registrationDeadline);
  const startDay = toDay(formData.startDate);
  const today = dayjs().startOf("day");
  const noPast = (d: dayjs.Dayjs) => d.isBefore(today);
  const disableReg = (d: dayjs.Dayjs) => noPast(d) || (!!startDay && d.isAfter(startDay, "day"));
  const disableStart = (d: dayjs.Dayjs) =>
    noPast(d) || (!!regDay && d.isBefore(regDay, "day"));
  const disableEnd = (d: dayjs.Dayjs) =>
    noPast(d) || (!!startDay && d.isBefore(startDay, "day"));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={560}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shadow-xs">
            <PlusOutlined className="text-base" />
          </div>
          <div>
            <span className="font-bold text-slate-900 text-base block leading-tight">
              Khởi Tạo Giải Đấu Mới
            </span>
            <span className="text-xs text-slate-500 font-normal">
              Thiết lập thông số kỹ thuật giải đấu Bank Pool ở trạng thái Bản Nháp (DRAFT)
            </span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5 px-2 py-1">
          <Button
            variant="outline"
            size="md"
            disabled={loading}
            onClick={onClose}
            className="!rounded-xl !text-xs"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="md"
            loading={loading}
            onClick={onSave}
            className="!bg-[#064e3b] hover:!bg-[#047857] !border-[#064e3b] !rounded-xl !font-bold px-6 !text-xs shadow-xs"
          >
            Lưu Bản Nháp (DRAFT)
          </Button>
        </div>
      }
    >
      <div className="py-2 space-y-4 text-xs">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Tên giải đấu chính thức: <span className="text-rose-500">*</span>
          </label>
          <Input
            placeholder="Ví dụ: CueZone Bank Pool Championship Q4/2026"
            value={formData.title}
            onChange={(e) => onChange((prev) => ({ ...prev, title: e.target.value }))}
            className="!h-10 !rounded-xl text-xs"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Hạn chót đăng ký: <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              value={formData.registrationDeadline ? dayjs(formData.registrationDeadline) : null}
              disabledDate={disableReg}
              onChange={(date) =>
                onChange((prev) => ({
                  ...prev,
                  registrationDeadline:
                    date && !Array.isArray(date) ? date.format("YYYY-MM-DDTHH:mm") : "",
                }))
              }
              placeholder="Chọn ngày & giờ"
              className="!w-full !h-10 !rounded-xl !text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Số lượng cơ thủ tối đa (Quy mô):
            </label>
            <Select
              value={formData.maxParticipants}
              onChange={(val) => onChange((prev) => ({ ...prev, maxParticipants: val }))}
              className="!w-full !rounded-xl !text-xs !h-10"
              options={[
                { value: 8, label: "8 Cơ thủ (Vòng tứ kết)" },
                { value: 16, label: "16 Cơ thủ (Chuẩn CLB)" },
                { value: 32, label: "32 Cơ thủ (Giải mở rộng)" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ngày bắt đầu thi đấu: <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              value={formData.startDate ? dayjs(formData.startDate) : null}
              disabledDate={disableStart}
              onChange={(date) =>
                onChange((prev) => ({
                  ...prev,
                  startDate:
                    date && !Array.isArray(date) ? date.format("YYYY-MM-DDTHH:mm") : "",
                }))
              }
              placeholder="Chọn ngày & giờ"
              className="!w-full !h-10 !rounded-xl !text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Ngày bế mạc (kết thúc): <span className="text-rose-500">*</span>
            </label>
            <DatePicker
              showTime={{ format: "HH:mm" }}
              format="DD/MM/YYYY HH:mm"
              value={formData.endDate ? dayjs(formData.endDate) : null}
              disabledDate={disableEnd}
              onChange={(date) =>
                onChange((prev) => ({
                  ...prev,
                  endDate: date && !Array.isArray(date) ? date.format("YYYY-MM-DDTHH:mm") : "",
                }))
              }
              placeholder="Chọn ngày & giờ"
              className="!w-full !h-10 !rounded-xl !text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Thể thức Race to (Số ván chạm):
            </label>
            <Input
              type="number"
              value={formData.raceTo}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  raceTo: parseInt(e.target.value) || 5,
                }))
              }
              className="!h-10 !rounded-xl text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lệ phí tham gia (VNĐ):
            </label>
            <Input
              type="number"
              value={formData.feeAmount}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  feeAmount: parseInt(e.target.value) || 0,
                }))
              }
              className="!h-10 !rounded-xl text-xs font-mono"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tổng quỹ giải thưởng & Danh hiệu:
            </label>
            <Input
              value={formData.prizePool}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, prizePool: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Giải Nhất (Vô địch):
            </label>
            <Input
              placeholder="VD: 10.000.000đ + Cúp Vàng"
              value={formData.firstPrize}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, firstPrize: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Giải Nhì (Á quân):
            </label>
            <Input
              placeholder="VD: 5.000.000đ + Cờ lưu niệm"
              value={formData.secondPrize}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, secondPrize: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Giải Ba (Đồng hạng):
            </label>
            <Input
              placeholder="VD: 2.500.000đ"
              value={formData.thirdPrize}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, thirdPrize: e.target.value }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Bàn thi đấu chỉ định:
            </label>
            <Input
              placeholder="Bàn Match 13 (VAR), Bàn Match 14 (VAR)..."
              value={formData.assignedTables}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  assignedTables: e.target.value,
                }))
              }
              className="!h-10 !rounded-xl text-xs"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Mô tả chi tiết giải đấu:
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Mô tả thể thức thi đấu, thể lệ giao lưu hoặc ghi chú quan trọng..."
              value={formData.description}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="!rounded-xl text-xs"
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
};
