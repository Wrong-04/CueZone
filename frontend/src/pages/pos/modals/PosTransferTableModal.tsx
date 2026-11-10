import React from "react";
import {
  SwapOutlined,
  BranchesOutlined,
  SyncOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import clsx from "clsx";
import { Button, Input, Modal, Select, Space, Tag } from "../../../shared/ui";
import type { PosTable } from "../../../types/pos";

interface PosTransferTableModalProps {
  open: boolean;
  onClose: () => void;
  transferAction: "transfer" | "merge";
  onSwitchAction: (action: "transfer" | "merge") => void | Promise<void>;
  selectedTable: PosTable | null;
  tables: PosTable[];
  targetTableId: string;
  setTargetTableId: (val: string) => void;
  loadingMoveTargets: boolean;
  eligibleMoveData: any;
  transferReason: string;
  setTransferReason: (val: string) => void;
  onConfirmTransferOrMerge: () => void;
  saving?: boolean;
  loading?: boolean;
  loadError?: any;
}

export const PosTransferTableModal: React.FC<PosTransferTableModalProps> = ({
  open,
  onClose,
  transferAction,
  onSwitchAction,
  selectedTable,
  tables,
  targetTableId,
  setTargetTableId,
  loadingMoveTargets,
  eligibleMoveData,
  transferReason,
  setTransferReason,
  onConfirmTransferOrMerge,
  saving = false,
  loading = false,
  loadError,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnClose
      title={
        <div className="flex items-center justify-between pr-4">
          <Space align="center" size={8}>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              {transferAction === "transfer" ? (
                <SwapOutlined className="text-base" />
              ) : (
                <BranchesOutlined className="text-base" />
              )}
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base block">
                {transferAction === "transfer" ? "Chuyển Bàn Chơi" : "Gộp Bàn Chơi"}
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                {transferAction === "transfer"
                  ? "Chuyển thời gian chơi và dịch vụ F&B sang bàn trống mới"
                  : "Dồn tiền giờ và F&B của bàn này vào bàn khác"}
              </span>
            </div>
          </Space>
        </div>
      }
    >
      <div className="py-2 space-y-4">
        {/* Action Tabs: Chuyển bàn vs Gộp bàn */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => void onSwitchAction("transfer")}
            className={clsx(
              "!flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              transferAction === "transfer"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <SwapOutlined />
            Đổi Sang Bàn Trống
          </button>
          <button
            type="button"
            onClick={() => void onSwitchAction("merge")}
            className={clsx(
              "!flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5",
              transferAction === "merge"
                ? "bg-white text-emerald-800 shadow-xs"
                : "text-slate-500 hover:text-slate-900",
            )}
          >
            <BranchesOutlined />
            Gộp Vào Bàn Khác
          </button>
        </div>

        {/* Source Table Summary Card */}
        {selectedTable?.currentSession && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  Bàn hiện tại: <strong className="text-emerald-700">{selectedTable.name}</strong> ({selectedTable.typeName})
                </span>
                <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !m-0 font-medium">
                  {selectedTable.status === "paused" ? "Tạm dừng" : "Đang chơi"}
                </Tag>
              </div>
              <span className="text-[11px] text-slate-500">
                Khách hàng: <strong className="text-slate-700">{selectedTable.currentSession.customerName || "Khách lẻ"}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Thời gian đã chơi</span>
                <span className="font-bold font-mono text-slate-800 text-xs">
                  {(() => {
                    const now = Date.now();
                    const elapsed = Math.max(
                      0,
                      now -
                        selectedTable.currentSession.startedAt -
                        (selectedTable.currentSession.totalPausedMs || 0),
                    );
                    const mins = Math.floor(elapsed / 60000);
                    const hrs = Math.floor(mins / 60);
                    const remMins = mins % 60;
                    return hrs > 0 ? `${hrs}h ${remMins}p` : `${remMins} phút`;
                  })()}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">Tiền giờ tạm tính</span>
                <span className="font-bold font-mono text-emerald-700 text-xs">
                  {(() => {
                    const now = Date.now();
                    const elapsed = Math.max(
                      0,
                      now -
                        selectedTable.currentSession.startedAt -
                        (selectedTable.currentSession.totalPausedMs || 0),
                    );
                    const mins = Math.floor(elapsed / 60000);
                    const rate =
                      selectedTable.currentSession.pricePerHour || selectedTable.pricePerHour;
                    const cost = Math.round((mins * rate) / 60);
                    return `${cost.toLocaleString("vi-VN")}đ`;
                  })()}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-500 block">F&B đang dùng</span>
                <span className="font-bold font-mono text-slate-800 text-xs">
                  {(() => {
                    const orders = (selectedTable.currentSession.orders || []).filter(
                      (o) => o.status !== "cancelled",
                    );
                    const count = orders.reduce((sum, o) => sum + o.quantity, 0);
                    const fnbCost = orders.reduce((sum, o) => sum + o.price * o.quantity, 0);
                    return `${count} món (${fnbCost.toLocaleString("vi-VN")}đ)`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Target Table Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700">
              {transferAction === "transfer" ? "Chuyển đến bàn:" : "Gộp vào bàn:"}
            </label>
            {loadingMoveTargets && (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <SyncOutlined spin className="text-[10px]" /> Đang kiểm tra bàn khả dụng...
              </span>
            )}
          </div>

          <Select
            placeholder={
              transferAction === "transfer"
                ? "-- Chọn bàn trống muốn chuyển đến --"
                : "-- Chọn bàn đang chơi để gộp vào --"
            }
            value={targetTableId || undefined}
            onChange={(val) => setTargetTableId(String(val))}
            className="!w-full !rounded-xl"
            options={
              eligibleMoveData?.targets?.length
                ? eligibleMoveData.targets.map((t: any) => {
                    const typeLabel =
                      t.type === "pool"
                        ? "Bida Lỗ"
                        : t.type === "carom"
                          ? "Bida Phăng"
                          : t.type === "snooker"
                            ? "Bida Snooker"
                            : t.type || "Bàn";

                    if (transferAction === "transfer") {
                      const diffText =
                        t.priceDiffPerHour && t.priceDiffPerHour !== 0
                          ? ` (${t.priceDiffPerHour > 0 ? "+" : ""}${t.priceDiffPerHour.toLocaleString("vi-VN")}đ/h)`
                          : "";
                      return {
                        value: t.id,
                        label: `${t.name} (${typeLabel}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h${diffText}`,
                      };
                    } else {
                      const mins = t.durationMinutes || 0;
                      const hrs = Math.floor(mins / 60);
                      const remMins = mins % 60;
                      const durationText = hrs > 0 ? `${hrs}h ${remMins}p` : `${remMins}p`;
                      return {
                        value: t.id,
                        label: `${t.name} (${typeLabel}) • Khách: ${t.customerName || "Khách lẻ"} • Chơi ${durationText} • ${(t.currentCost || 0).toLocaleString("vi-VN")}đ`,
                      };
                    }
                  })
                : tables
                    .filter((t) => t.id !== selectedTable?.id)
                    .filter((t) =>
                      transferAction === "transfer"
                        ? t.status === "available"
                        : t.status === "playing" || t.status === "paused",
                    )
                    .map((t) => ({
                      value: t.id,
                      label: `${t.name} (${t.typeName}) • ${t.pricePerHour.toLocaleString("vi-VN")}đ/h`,
                    }))
            }
          />
        </div>

        {/* Pricing Option (When Transferring to a table with different rate) */}
        {transferAction === "transfer" && targetTableId && (() => {
          const target =
            tables.find((t) => t.id === targetTableId) ||
            eligibleMoveData?.targets.find((t: any) => t.id === targetTableId);
          const sourceRate =
            selectedTable?.currentSession?.pricePerHour || selectedTable?.pricePerHour || 0;
          const targetRate = target?.pricePerHour || 0;
          const isDiff = targetRate !== sourceRate && targetRate > 0;

          if (!isDiff) return null;

          return (
            <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 space-y-1">
              <div className="flex items-center justify-between font-bold">
                <span>Chênh lệch đơn giá bàn:</span>
                <span className="font-mono text-blue-800">
                  {sourceRate.toLocaleString("vi-VN")}đ/h ➜ {targetRate.toLocaleString("vi-VN")}đ/h (
                  {targetRate > sourceRate
                    ? `+${(targetRate - sourceRate).toLocaleString("vi-VN")}đ/h`
                    : `${(targetRate - sourceRate).toLocaleString("vi-VN")}đ/h`}
                  )
                </span>
              </div>
              <p className="text-[11px] text-blue-700 mb-0 leading-relaxed">
                Hệ thống <strong>tự động tính theo giá từng bàn</strong>: Giờ chơi ở bàn cũ tính theo giá <strong>{sourceRate.toLocaleString("vi-VN")}đ/h</strong>, thời gian tiếp theo tại bàn mới tính theo giá <strong>{targetRate.toLocaleString("vi-VN")}đ/h</strong>.
              </p>
            </div>
          );
        })()}

        {/* Merge Summary Preview (When Merging into a playing table) */}
        {transferAction === "merge" && targetTableId && (() => {
          const target = tables.find((t) => t.id === targetTableId);
          if (!target || !target.currentSession) return null;

          const now = Date.now();
          // Source cost
          const sElapsed = Math.max(
            0,
            now -
              (selectedTable?.currentSession?.startedAt || now) -
              (selectedTable?.currentSession?.totalPausedMs || 0),
          );
          const sMins = Math.floor(sElapsed / 60000);
          const sRate =
            selectedTable?.currentSession?.pricePerHour || selectedTable?.pricePerHour || 0;
          const sPlayingCost =
            Math.round((sMins * sRate) / 60) + (selectedTable?.currentSession?.carriedCost || 0);
          const sOrders = (selectedTable?.currentSession?.orders || []).filter(
            (o) => o.status !== "cancelled",
          );
          const sFnbCost = sOrders.reduce((sum, o) => sum + o.price * o.quantity, 0);

          // Target cost
          const tElapsed = Math.max(
            0,
            now -
              (target.currentSession?.startedAt || now) -
              (target.currentSession?.totalPausedMs || 0),
          );
          const tMins = Math.floor(tElapsed / 60000);
          const tRate = target.currentSession?.pricePerHour || target.pricePerHour || 0;
          const tPlayingCost =
            Math.round((tMins * tRate) / 60) + (target.currentSession?.carriedCost || 0);
          const tOrders = (target.currentSession?.orders || []).filter(
            (o) => o.status !== "cancelled",
          );
          const tFnbCost = tOrders.reduce((sum, o) => sum + o.price * o.quantity, 0);

          const totalEstimated = sPlayingCost + sFnbCost + tPlayingCost + tFnbCost;

          return (
            <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-950 space-y-2">
              <div className="flex items-center justify-between font-bold border-b border-purple-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <BranchesOutlined className="text-purple-700" /> Xem trước kết quả sau khi gộp:
                </span>
                <Tag color="purple" className="!m-0 !font-bold">
                  Hóa đơn tổng {target.name}
                </Tag>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Tiền giờ chốt từ {selectedTable?.name}:</span>
                  <span className="font-mono font-bold text-slate-800">
                    +{sPlayingCost.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tiền giờ hiện tại ({target.name}):</span>
                  <span className="font-mono font-bold text-slate-800">
                    +{tPlayingCost.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Món F&B chuyển sang ({sOrders.length} món từ {selectedTable?.name}):
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    +{sFnbCost.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">
                    Món F&B hiện có tại {target.name} ({tOrders.length} món):
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    +{tFnbCost.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <div className="flex justify-between font-bold text-xs pt-1.5 border-t border-purple-200 text-purple-900">
                  <span>TỔNG HÓA ĐƠN DỰ KIẾN:</span>
                  <span className="font-mono text-emerald-700 text-sm">
                    {totalEstimated.toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Quick Reasons Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            {transferAction === "transfer" ? "Lý do chuyển bàn (Chọn nhanh):" : "Lý do gộp bàn (Chọn nhanh):"}
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(transferAction === "transfer"
              ? [
                  "Khách đổi bàn VIP",
                  "Khách đổi góc thoáng hơn",
                  "Bàn gặp sự cố kỹ thuật",
                  "Khách đổi thể loại bàn",
                  "Theo yêu cầu của khách",
                ]
              : [
                  "Khách gộp nhóm bạn",
                  "Thanh toán chung hóa đơn",
                  "Khách chuyển sang chơi chung",
                  "Theo yêu cầu của khách",
                ]
            ).map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() => setTransferReason(reason)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all cursor-pointer",
                  transferReason === reason
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800 font-bold"
                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                {reason}
              </button>
            ))}
          </div>
          <Input
            placeholder="Hoặc nhập lý do chi tiết..."
            value={transferReason}
            onChange={(e) => setTransferReason(e.target.value)}
            className="!rounded-lg !text-xs"
          />
        </div>

        {/* Operational Notice */}
        <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
          <InfoCircleOutlined className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px]">
            {transferAction === "transfer" ? (
              <span>
                Phiên chơi sẽ chuyển sang bàn mới. Bàn cũ (
                <strong>{selectedTable?.name}</strong>) sẽ kết thúc và tự động chuyển về trạng thái{" "}
                <strong>Trống</strong> để đón khách mới.
              </span>
            ) : (
              <span>
                Sau khi gộp, toàn bộ tiền giờ và món F&B của{" "}
                <strong>{selectedTable?.name}</strong> sẽ được chuyển vào{" "}
                <strong>
                  {tables.find((t) => t.id === targetTableId)?.name || "bàn mới"}
                </strong>
                . Bàn cũ (<strong>{selectedTable?.name}</strong>) sẽ kết thúc phiên và tự động chuyển
                về trạng thái <strong>Trống</strong> để đón khách mới.
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="!rounded-xl"
          >
            Hủy
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmTransferOrMerge}
            loading={saving}
            disabled={loading || !!loadError || !targetTableId}
            leftIcon={<SwapOutlined />}
            className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 !rounded-xl font-bold px-4"
          >
            {transferAction === "transfer" ? "Xác Nhận Chuyển Bàn" : "Xác Nhận Gộp Bàn"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PosTransferTableModal;
