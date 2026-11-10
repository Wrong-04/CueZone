import React, { useState } from "react";
import {
  UsergroupAddOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Button, Input, Modal, Select, Tag, Tooltip, Typography } from "../../../shared/ui";
import type { PosTable } from "../../../types/pos";

const { Text } = Typography;

export interface WaitlistItem {
  id: string;
  _id?: string;
  customerName: string;
  phone: string;
  guests: number;
  preferredType: string;
  joinedTime: string;
  note?: string;
}

interface PosWaitlistModalProps {
  open: boolean;
  onClose: () => void;
  waitlist: WaitlistItem[];
  availableTables: PosTable[];
  newWaitName: string;
  setNewWaitName: (val: string) => void;
  newWaitPhone: string;
  setNewWaitPhone: (val: string) => void;
  newWaitGuests: number;
  setNewWaitGuests: (val: number) => void;
  newWaitType: string;
  setNewWaitType: (val: string) => void;
  newWaitNote: string;
  setNewWaitNote: (val: string) => void;
  onAddWaitlist: () => void;
  onAssignWaitlist: (item: WaitlistItem, targetTableId: string) => void;
  onRemoveWaitlist: (id: string) => void;
  getTableOptionsForGuest: (preferredType: string) => any[];
}

export const PosWaitlistModal: React.FC<PosWaitlistModalProps> = ({
  open,
  onClose,
  waitlist,
  availableTables,
  newWaitName,
  setNewWaitName,
  newWaitPhone,
  setNewWaitPhone,
  newWaitGuests,
  setNewWaitGuests,
  newWaitType,
  setNewWaitType,
  newWaitNote,
  setNewWaitNote,
  onAddWaitlist,
  onAssignWaitlist,
  onRemoveWaitlist,
  getTableOptionsForGuest,
}) => {
  const [selectedWaitlistTable, setSelectedWaitlistTable] = useState<Record<string, string>>({});

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={
        <div className="flex items-center gap-2 flex-wrap pr-4">
          <UsergroupAddOutlined className="text-emerald-600 text-lg" />
          <span className="font-bold text-slate-900 text-base">Danh Sách Khách Đang Chờ Bàn</span>
          <Tag color="green" className="!rounded-full !px-2 !font-bold">
            {waitlist.length} khách đang đợi
          </Tag>
          <Tag
            color={availableTables.length > 0 ? "blue" : "volcano"}
            className="!rounded-full !px-2 !font-bold"
          >
            Toàn quán: {availableTables.length} bàn trống
          </Tag>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <span className="font-bold text-xs text-slate-800 block mb-2.5">
            + Thêm khách vào danh sách chờ bàn
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Tên khách <span className="text-red-500">*</span>
              </label>
              <Input
                value={newWaitName}
                onChange={(e) => setNewWaitName(e.target.value)}
                placeholder="VD: Anh Nam"
                size="small"
                className="!rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <Input
                value={newWaitPhone}
                onChange={(e) => setNewWaitPhone(e.target.value)}
                placeholder="09xx..."
                size="small"
                className="!rounded-lg"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Số lượng khách
              </label>
              <Select
                value={newWaitGuests}
                onChange={(val) => setNewWaitGuests(Number(val))}
                size="small"
                className="w-full !rounded-lg"
                options={[
                  { value: 1, label: "1 người" },
                  { value: 2, label: "2 người" },
                  { value: 3, label: "3 người" },
                  { value: 4, label: "4 người" },
                  { value: 6, label: "6+ người" },
                ]}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Loại bàn mong muốn
              </label>
              <Select
                value={newWaitType}
                onChange={(val) => setNewWaitType(String(val))}
                size="small"
                className="w-full !rounded-lg"
                options={(() => {
                  const types = Array.from(new Set(availableTables.map((t) => t.typeName).filter(Boolean)));
                  if (types.length === 0) {
                    return [
                      { value: "Bàn Bida Lỗ (Pool)", label: "Bàn Bida Lỗ (Pool)" },
                      { value: "Bàn Bida Carom (Phăng)", label: "Bàn Bida Carom (Phăng)" },
                      { value: "Bàn Bida Snooker", label: "Bàn Bida Snooker" },
                    ];
                  }
                  return types.map((t) => ({ value: t, label: t }));
                })()}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 mt-2.5 pt-2 border-t border-slate-200/80">
            <div className="flex-1 w-full">
              <Input
                value={newWaitNote}
                onChange={(e) => setNewWaitNote(e.target.value)}
                placeholder="Ghi chú (yêu cầu vị trí, đồ uống trước...)"
                size="small"
                className="!rounded-lg w-full"
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onAddWaitlist}
              leftIcon={<PlusOutlined />}
              className="!rounded-lg !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-7.5 whitespace-nowrap"
            >
              Thêm Vào Danh Sách
            </Button>
          </div>
        </div>

        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
            <span className="font-bold text-xs text-slate-800">
              Khách đang chờ (Thứ tự ưu tiên theo thời gian đến)
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <InfoCircleOutlined className="text-emerald-600 shrink-0" />
              <span>Thu ngân có thể chọn bàn trống muốn xếp hoặc bấm &quot;Xếp Bàn&quot; để xếp nhanh</span>
            </span>
          </div>

          {waitlist.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Text className="!text-slate-400 text-xs">
                Hiện không có khách nào trong danh sách chờ.
              </Text>
            </div>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
              {waitlist.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {item.customerName}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          ({item.phone})
                        </span>
                        <Tag
                          color="cyan"
                          className="!rounded-full !px-1.5 !py-0 !text-[10px] !m-0"
                        >
                          {item.guests} người
                        </Tag>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span>
                          Nhu cầu bàn:{" "}
                          <strong className="text-slate-700">{item.preferredType}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Thời gian vào:{" "}
                          <strong className="text-slate-700 font-mono">{item.joinedTime}</strong>
                        </span>
                        {item.note && (
                          <>
                            <span>•</span>
                            <span className="italic text-slate-400 truncate max-w-[150px]">
                              &quot;{item.note}&quot;
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-end sm:self-center shrink-0">
                    <Select
                      placeholder={
                        availableTables.length > 0 ? "-- Chọn bàn xếp khách --" : "Hết bàn trống"
                      }
                      value={
                        selectedWaitlistTable[item.id] ||
                        (availableTables.find((t) => t.typeName === item.preferredType)?.id ??
                          availableTables[0]?.id)
                      }
                      onChange={(val) =>
                        setSelectedWaitlistTable((prev) => ({ ...prev, [item.id]: String(val) }))
                      }
                      disabled={availableTables.length === 0}
                      className="w-48 sm:w-60 !text-xs !h-8 font-medium"
                      options={getTableOptionsForGuest(item.preferredType)}
                    />

                    <Button
                      variant="primary"
                      size="sm"
                      disabled={availableTables.length === 0}
                      onClick={() => {
                        const chosenId =
                          selectedWaitlistTable[item.id] ||
                          (availableTables.find((t) => t.typeName === item.preferredType)?.id ??
                            availableTables[0]?.id);
                        if (chosenId) {
                          onAssignWaitlist(item, chosenId);
                        }
                      }}
                      leftIcon={<PlayCircleOutlined />}
                      className="!rounded-lg !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !text-xs !h-8 shadow-2xs whitespace-nowrap"
                    >
                      Xếp Bàn
                    </Button>
                    <Tooltip title="Xóa khỏi danh sách chờ">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRemoveWaitlist(item.id)}
                        leftIcon={<DeleteOutlined />}
                        className="!rounded-lg !text-xs !h-8 !w-8 !p-0 !border-slate-200 !text-slate-400 hover:!text-red-600 hover:!border-red-300 shrink-0"
                      />
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PosWaitlistModal;
