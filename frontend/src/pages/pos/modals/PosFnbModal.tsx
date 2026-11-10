import React from "react";
import {
  CoffeeOutlined,
  PlusOutlined,
  SearchOutlined,
  MinusOutlined,
  DeleteOutlined,
  RollbackOutlined,
  HistoryOutlined,
} from "@ant-design/icons";
import clsx from "clsx";
import { Button, Input, Modal, Select, Space, Tag } from "../../../shared/ui";
import type { PosOrderItem, PosTable } from "../../../types/pos";

export interface PosProductItem {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
  category?: string;
  unit?: string;
  isMadeToOrder?: boolean;
}

export interface PosNewOrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PosFnbModalProps {
  open: boolean;
  onClose: () => void;
  selectedTable: PosTable | null;
  fnbTab: "manage" | "order";
  setFnbTab: (tab: "manage" | "order") => void;
  activeServedOrders: PosOrderItem[];
  cancelledOrders: any[];
  activeFnbTotal: number;
  fnbSearchText: string;
  setFnbSearchText: (val: string) => void;
  fnbCategory: string;
  setFnbCategory: (val: string) => void;
  fnbCategoryOptions: Array<{ value: string; label: string }>;
  filteredFnbStock: any[];
  newOrderList: PosNewOrderItem[];
  onAddFnbItem: (item: any) => void;
  onUpdateNewOrderItemQty: (id: string, delta: number) => void;
  onRemoveNewOrderItem: (id: string) => void;
  onConfirmAddFnbOrder: () => void;
  onOpenCancelModal: (item: PosOrderItem) => void;
  saving: boolean;
  loading: boolean;
}

export const PosFnbModal: React.FC<PosFnbModalProps> = ({
  open,
  onClose,
  selectedTable,
  fnbTab,
  setFnbTab,
  activeServedOrders,
  cancelledOrders,
  activeFnbTotal,
  fnbSearchText,
  setFnbSearchText,
  fnbCategory,
  setFnbCategory,
  fnbCategoryOptions,
  filteredFnbStock,
  newOrderList,
  onAddFnbItem,
  onUpdateNewOrderItemQty,
  onRemoveNewOrderItem,
  onConfirmAddFnbOrder,
  onOpenCancelModal,
  saving,
  loading,
}) => {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={840}
      title={
        <div className="flex items-center justify-between pr-4">
          <Space align="center" size={8}>
            <CoffeeOutlined className="text-emerald-600 text-lg" />
            <span className="font-bold text-slate-900 text-base">
              F&B - {selectedTable?.name}
            </span>
          </Space>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFnbTab("manage")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                fnbTab === "manage"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <CoffeeOutlined />
              Món Trên Bàn ({activeServedOrders.reduce((sum, i) => sum + i.quantity, 0)})
            </button>
            <button
              type="button"
              onClick={() => setFnbTab("order")}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                fnbTab === "order"
                  ? "bg-white text-emerald-800 shadow-xs"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <PlusOutlined />
              Gọi Thêm Món {newOrderList.length > 0 && `(${newOrderList.reduce((sum, i) => sum + i.quantity, 0)})`}
            </button>
          </div>
        </div>
      }
    >
      {fnbTab === "order" ? (
        <div className="py-2 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Left: Menu & Search */}
          <div className="md:col-span-7 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                prefix={<SearchOutlined className="text-slate-400 text-xs" />}
                placeholder="Tìm tên món nhanh..."
                value={fnbSearchText}
                onChange={(e) => setFnbSearchText(e.target.value)}
                allowClear
                size="small"
                className="!rounded-lg !text-xs flex-1"
              />
              <Select
                value={fnbCategory}
                onChange={(val) => setFnbCategory(String(val))}
                className="!w-36 !rounded-lg !text-xs shrink-0"
                options={fnbCategoryOptions}
              />
            </div>

            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1">
              {filteredFnbStock.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  Không tìm thấy món nào phù hợp.
                </div>
              ) : (
                filteredFnbStock.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 bg-white flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                        {item.isMadeToOrder || (item.unit && ["ly", "tô", "đĩa", "phần", "suất"].includes(item.unit.toLowerCase())) || (item.category && ["food", "coffee", "tea"].includes(item.category.toLowerCase())) ? (
                          <Tag color="purple" className="!text-[9px] !px-1.5 !py-0 !border-0 font-bold !rounded shadow-2xs">
                            CHẾ BIẾN
                          </Tag>
                        ) : item.stockQuantity <= 0 ? (
                          <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0">
                            HẾT HÀNG
                          </Tag>
                        ) : item.stockQuantity < 10 ? (
                          <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0">
                            Còn {item.stockQuantity}
                          </Tag>
                        ) : (
                          <Tag
                            color="default"
                            className="!text-[9px] !px-1.5 !py-0 !border-0 !bg-slate-100"
                          >
                            Còn {item.stockQuantity}
                          </Tag>
                        )}
                      </div>
                      <span className="text-xs font-bold text-emerald-600 block mt-0.5 font-mono">
                        {item.price.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    {(() => {
                      const isPrepared = item.isMadeToOrder || (item.unit && ["ly", "tô", "đĩa", "phần", "suất"].includes(item.unit.toLowerCase())) || (item.category && ["food", "coffee", "tea"].includes(item.category.toLowerCase()));
                      const isOutOfStock = !isPrepared && item.stockQuantity <= 0;
                      return (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isOutOfStock}
                          onClick={() => onAddFnbItem(item)}
                          leftIcon={<PlusOutlined />}
                          className="!text-xs !h-8 !px-3 !rounded-xl !border-emerald-300 !text-emerald-800 hover:!bg-emerald-50 shrink-0"
                        >
                          Thêm
                        </Button>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: New Order Draft Cart */}
          <div className="md:col-span-5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 mb-2">
                <span className="text-xs font-bold text-slate-800">Món mới chuẩn bị thêm:</span>
                <span className="text-xs font-mono text-slate-500">
                  {newOrderList.length} loại
                </span>
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {newOrderList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    Chưa chọn món mới nào. Bấm &quot;Thêm&quot; từ thực đơn bên trái.
                  </div>
                ) : (
                  newOrderList.map((order) => (
                    <div
                      key={order.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0 pr-1">
                        <span
                          className="font-semibold text-slate-800 block truncate"
                          title={order.name}
                        >
                          {order.name}
                        </span>
                        <span className="text-[11px] text-emerald-700 font-bold font-mono">
                          {(order.price * order.quantity).toLocaleString("vi-VN")}đ
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Space size={3} align="center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateNewOrderItemQty(order.id, -1)}
                            className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-slate-300 !text-slate-700 hover:!border-slate-400"
                          >
                            <MinusOutlined className="text-xs" />
                          </Button>
                          <span className="font-bold text-xs w-5 text-center font-mono">
                            {order.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateNewOrderItemQty(order.id, 1)}
                            className="!h-7 !w-7 !p-0 !min-w-0 !rounded-lg !border-emerald-300 !bg-emerald-50/50 !text-emerald-800 hover:!bg-emerald-100"
                          >
                            <PlusOutlined className="text-xs" />
                          </Button>
                        </Space>

                        <button
                          type="button"
                          onClick={() => onRemoveNewOrderItem(order.id)}
                          title="Bỏ món này khỏi giỏ"
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1 cursor-pointer"
                        >
                          <DeleteOutlined className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total & Submit */}
            <div className="pt-3 border-t border-slate-200 mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Tổng tiền thêm mới:</span>
                <span className="text-base text-emerald-700 font-black font-mono">
                  {newOrderList
                    .reduce((acc, cur) => acc + cur.price * cur.quantity, 0)
                    .toLocaleString("vi-VN")}
                  đ
                </span>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={onConfirmAddFnbOrder}
                loading={saving}
                disabled={loading || newOrderList.length === 0}
                className="!w-full !rounded-xl !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold text-xs !h-9 shadow-xs"
              >
                Xác Nhận Thêm Món ({newOrderList.reduce((acc, cur) => acc + cur.quantity, 0)} món)
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Món Đang Phục Vụ & Hủy Món */
        <div className="py-2 space-y-4">
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-800 font-medium block">
                Tổng tiền món đang phục vụ trên bàn:
              </span>
              <span className="text-base font-black text-emerald-700 font-mono">
                {activeFnbTotal.toLocaleString("vi-VN")}đ
              </span>
            </div>
            <Tag
              color="green"
              className="!font-bold font-mono !text-xs !px-2.5 !py-1 !rounded-lg !border-emerald-300 !bg-emerald-100/70 !text-emerald-800"
            >
              {activeServedOrders.length} loại • {activeServedOrders.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)} món
            </Tag>
          </div>

          {/* List active items */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">
              Danh sách món đang phục vụ ({activeServedOrders.length} loại • {activeServedOrders.reduce((sum, i) => sum + i.quantity, 0)} món):
            </span>

            {activeServedOrders.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Bàn hiện chưa có món nào đang phục vụ. Bấm tab &quot;Gọi Thêm Món&quot; để thêm.
              </div>
            ) : (
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                {activeServedOrders.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{item.name}</span>
                        <Tag color="green" className="!text-[10px] !px-1.5 !py-0 !border-0 font-medium">
                          Đang dùng x{item.quantity}
                        </Tag>
                        {item.originTableName && (
                          <Tag color="purple" className="!text-[10px] !px-1.5 !py-0 !border-0 font-medium">
                            Gộp từ {item.originTableName}
                          </Tag>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                        <span>
                          Đơn giá:{" "}
                          <strong className="text-slate-700 font-mono">
                            {item.price.toLocaleString("vi-VN")}đ
                          </strong>
                        </span>
                        <span>•</span>
                        <span>
                          Thành tiền:{" "}
                          <strong className="text-emerald-700 font-mono">
                            {(item.price * item.quantity).toLocaleString("vi-VN")}đ
                          </strong>
                        </span>
                        {item.orderTime && (
                          <>
                            <span>•</span>
                            <span>Gọi lúc: {item.orderTime}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCancelModal(item)}
                      leftIcon={<RollbackOutlined />}
                      className="!text-xs !h-8 !px-3 !rounded-xl !border-rose-300 !text-rose-700 hover:!bg-rose-50"
                    >
                      Trả / Hủy
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List cancelled items history */}
          {cancelledOrders.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <HistoryOutlined />
                Lịch sử món đã hủy / trả lại ({cancelledOrders.length} món):
              </span>

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {cancelledOrders.map((cItem, idx) => (
                  <div
                    key={`cancel-${cItem.id}-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between text-slate-500"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-700 line-through">
                          {cItem.name}
                        </span>
                        <Tag color="error" className="!text-[9px] !px-1.5 !py-0 !border-0 font-bold">
                          Đã hủy x{cItem.cancelledQuantity || cItem.quantity}
                        </Tag>
                        {cItem.stockRestored === false ? (
                          <Tag color="warning" className="!text-[9px] !px-1.5 !py-0 !border-0 font-medium">
                            Hao hụt (Không nhập kho)
                          </Tag>
                        ) : (
                          <Tag color="cyan" className="!text-[9px] !px-1.5 !py-0 !border-0 font-medium">
                            Đã hoàn kho
                          </Tag>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Lý do: <strong className="text-slate-700">{cItem.cancelReason || "Khách trả lại"}</strong>
                        {cItem.cancelledBy && ` • Bởi ${cItem.cancelledBy}`}
                        {cItem.cancelledAt &&
                          ` • Lúc ${new Date(cItem.cancelledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`}
                      </div>
                    </div>
                    <span className="text-xs font-mono line-through text-slate-400">
                      {((cItem.price * (cItem.cancelledQuantity || cItem.quantity))).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default PosFnbModal;
