import { useState, useMemo } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import { productService } from "../../../services/product.service";
import { isFnbItemPrepared } from "../../../utils/fnb";
import type { PosTable, PosOrderItem } from "../../../types/pos";
import type { FnbStockItem } from "../PosTableFloorPage";

// ============================================================================
// HOOK QUẢN LÝ GỌI MÓN F&B TẠI BÀN & HỦY MÓN HOÀN KHO (USE POS FNB)
// Sơ đồ luồng dữ liệu:
//   PosFnbModal / PosCancelItemModal
//     -> usePosFnb (lọc menu, tạo giỏ gọi món, tính F&B tổng hợp, xử lý hủy món)
//     -> posService.updateOrders() / posService.cancelOrderItem()
//     -> Backend: SessionService.updateOrders() / SessionService.cancelOrderItem()
//     -> Cập nhật currentSession.orders + hoàn tồn kho Product (khi hủy món có restoreStock) + Socket.IO
// ============================================================================

interface UsePosFnbProps {
  selectedTable: PosTable | null;
  setSelectedTable: (table: PosTable | null) => void;
  save: (action: () => Promise<any>) => Promise<boolean>;
  loadTables: (silent?: boolean) => Promise<void>;
  fnbStock: FnbStockItem[];
  setFnbStock: React.Dispatch<React.SetStateAction<FnbStockItem[]>>;
}

export function usePosFnb({
  selectedTable,
  setSelectedTable,
  save,
  loadTables,
  fnbStock,
  setFnbStock,
}: UsePosFnbProps) {
  const [fnbModalVisible, setFnbModalVisible] = useState<boolean>(false);
  const [fnbTab, setFnbTab] = useState<"order" | "manage">("order");
  const [fnbCategory, setFnbCategory] = useState<string>("all");
  const [fnbSearchText, setFnbSearchText] = useState<string>("");
  const [newOrderList, setNewOrderList] = useState<PosOrderItem[]>([]);

  // Cancel item modal states
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancellingItem, setCancellingItem] = useState<PosOrderItem | null>(null);
  const [cancelQty, setCancelQty] = useState<number>(1);
  const [cancelReason, setCancelReason] = useState<string>("Khách đổi ý / Chưa dùng");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [restoreStock, setRestoreStock] = useState<boolean>(true);

  // Dynamic F&B category options
  const fnbCategoryOptions = useMemo(() => {
    const labelMap = new Map<string, string>();
    for (const item of fnbStock) {
      if (!item.category || labelMap.has(item.category)) continue;
      labelMap.set(item.category, item.categoryName || item.category);
    }
    const options = [{ value: "all", label: "Tất cả danh mục" }];
    for (const [value, label] of labelMap.entries()) {
      options.push({ value, label });
    }
    return options;
  }, [fnbStock]);

  const filteredFnbStock = useMemo(() => {
    return fnbStock.filter((item) => {
      const matchCategory = fnbCategory === "all" || item.category === fnbCategory;
      const matchSearch =
        !fnbSearchText.trim() ||
        item.name.toLowerCase().includes(fnbSearchText.toLowerCase().trim());
      return matchCategory && matchSearch;
    });
  }, [fnbStock, fnbCategory, fnbSearchText]);

  const activeServedOrders = useMemo(() => {
    return (
      selectedTable?.currentSession?.orders?.filter(
        (o) => o.status !== "cancelled" && (Number(o.quantity) || 0) > 0,
      ) || []
    );
  }, [selectedTable]);

  const cancelledOrders = useMemo(() => {
    return (
      selectedTable?.currentSession?.orders?.filter(
        (o) => o.status === "cancelled" || (Number(o.cancelledQuantity) || 0) > 0,
      ) || []
    );
  }, [selectedTable]);

  const activeFnbTotal = useMemo(() => {
    return activeServedOrders.reduce(
      (acc, cur) => acc + (Number(cur.price) || 0) * (Number(cur.quantity) || 0),
      0,
    );
  }, [activeServedOrders]);

  /**
   * Mở modal gọi món F&B cho bàn được chọn và đồng bộ lại tồn kho thực đơn mới nhất từ server.
   * Luồng đi: Nút Gọi món -> productService.getFnbMenu() -> cập nhật fnbStock theo thời gian thực.
   *
   * @param {PosTable} table - Bàn đang chơi cần gọi hoặc quản lý món F&B
   * @returns {Promise<void>}
   */
  const handleOpenFnbModal = async (table: PosTable) => {
    setSelectedTable(table);
    setNewOrderList([]);
    setFnbSearchText("");
    setFnbCategory("all");
    const hasExisting =
      table.currentSession?.orders &&
      table.currentSession.orders.some((o) => o.status !== "cancelled" && o.quantity > 0);
    setFnbTab(hasExisting ? "manage" : "order");
    setFnbModalVisible(true);

    try {
      const liveProducts = await productService.getFnbMenu();
      if (Array.isArray(liveProducts)) {
        const mappedStock: FnbStockItem[] = liveProducts.map((p) => ({
          id: String(p._id),
          code: p.sku || `PRD-${String(p._id).slice(-4).toUpperCase()}`,
          name: p.name,
          category: p.category,
          categoryName: p.categoryName || p.category,
          price: p.salePrice,
          priceFormatted: `${p.salePrice.toLocaleString("vi-VN")}đ`,
          stockQuantity: p.stock ?? 0,
          minThreshold: 10,
          unit: (p as any).unit || "Phần",
          image: p.imageUrl,
          isMadeToOrder: (p as any).isMadeToOrder,
        }));
        setFnbStock(mappedStock);
      }
    } catch (err) {
      console.error("Lỗi cập nhật tồn kho F&B trực tiếp:", err);
    }
  };

  /**
   * Thêm một phần món ăn/đồ uống vào giỏ gọi tạm (chặn nếu hàng đóng gói đã hết tồn kho).
   *
   * @param {FnbStockItem} stockItem - Mặt hàng F&B được thu ngân bấm chọn
   * @returns {void}
   */
  const handleAddFnbItem = (stockItem: FnbStockItem) => {
    const isPrepared = isFnbItemPrepared(stockItem);

    if (!isPrepared && stockItem.stockQuantity <= 0) {
      message.warning(`Món đóng gói "${stockItem.name}" đã hết hàng trong kho!`);
      return;
    }

    setNewOrderList((prev) => {
      const existing = prev.find((o) => o.id === stockItem.id);
      if (existing) {
        return prev.map((o) => (o.id === stockItem.id ? { ...o, quantity: o.quantity + 1 } : o));
      }
      return [
        ...prev,
        {
          id: stockItem.id,
          productId: stockItem.id,
          name: stockItem.name,
          price: stockItem.price,
          quantity: 1,
          category: stockItem.category,
          orderTime: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
          status: "served",
        },
      ];
    });

    if (!isPrepared) {
      setFnbStock((prev) =>
        prev.map((item) =>
          item.id === stockItem.id ? { ...item, stockQuantity: item.stockQuantity - 1 } : item,
        ),
      );
    }
  };

  /**
   * Tăng hoặc giảm số lượng của một món đang nằm trong giỏ chờ xác nhận.
   *
   * @param {string} itemId - Mã món trong giỏ gọi tạm
   * @param {number} delta - Số lượng thay đổi (+1 hoặc -1)
   * @returns {void}
   */
  const handleUpdateNewOrderItemQty = (itemId: string, delta: number) => {
    setNewOrderList((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter(Boolean) as PosOrderItem[];
    });

    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, stockQuantity: Math.max(0, item.stockQuantity - delta) }
          : item,
      ),
    );
  };

  /**
   * Gỡ bỏ hẳn một món khỏi giỏ chờ gọi và hoàn trả tồn kho tạm tính trên UI.
   *
   * @param {string} itemId - Mã món cần xóa khỏi giỏ tạm
   * @returns {void}
   */
  const handleRemoveNewOrderItem = (itemId: string) => {
    const itemToRemove = newOrderList.find((o) => o.id === itemId);
    if (!itemToRemove) return;
    setNewOrderList((prev) => prev.filter((o) => o.id !== itemId));
    setFnbStock((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, stockQuantity: item.stockQuantity + itemToRemove.quantity }
          : item,
      ),
    );
  };

  /**
   * Xác nhận gửi danh sách món mới vào phiên chơi hiện tại của bàn trên server.
   * Luồng đi: Nút Xác nhận gọi món -> posService.updateOrders() -> POST /tables/:id/session/orders -> loadTables().
   *
   * @returns {Promise<void>}
   */
  const handleConfirmAddFnbOrder = async () => {
    if (!selectedTable?.currentSession) return;
    if (newOrderList.length === 0) return;

    const existingOrders = selectedTable.currentSession.orders || [];
    const mergedOrders: PosOrderItem[] = [...existingOrders];

    for (const newItem of newOrderList) {
      const match = mergedOrders.find((o) => o.id === newItem.id && o.status !== "cancelled");
      if (match) {
        match.quantity += newItem.quantity;
      } else {
        mergedOrders.push(newItem);
      }
    }

    const ok = await save(async () => {
      await posService.updateOrders(
        selectedTable.id,
        selectedTable.currentSession!.sessionId,
        mergedOrders,
      );
    });
    if (!ok) return;
    message.success(`Đã thêm món vào ${selectedTable.name}!`);
    setNewOrderList([]);
    setFnbTab("manage");
    await loadTables();
  };

  const isPackagedItem = (item?: PosOrderItem | null): boolean => {
    if (!item) return false;
    const matchedStock = fnbStock.find(
      (s) => s.id === String(item.productId || item.id) || s.name === item.name,
    );
    if (matchedStock && matchedStock.isMadeToOrder !== undefined) {
      return !matchedStock.isMadeToOrder;
    }
    return !isFnbItemPrepared(matchedStock || item);
  };

  /**
   * Mở modal hủy món đã gọi cho một dòng order cụ thể và gợi ý mặc định cờ hoàn kho.
   *
   * @param {PosOrderItem} item - Dòng món F&B cần hủy toàn phần hoặc một phần
   * @returns {void}
   */
  const handleOpenCancelModal = (item: PosOrderItem) => {
    setCancellingItem(item);
    setCancelQty(item.quantity);
    const defaultReason = "Khách đổi ý / Chưa dùng";
    setCancelReason(defaultReason);
    setCustomCancelReason("");
    setRestoreStock(isPackagedItem(item));
    setCancelModalVisible(true);
  };

  /**
   * Cập nhật lý do hủy món và tự động bật/tắt hoàn trả tồn kho theo loại lý do.
   * (Món hỏng/đổ vỡ hoặc thiếu đồ sẽ không hoàn kho để ghi nhận hao hụt thực tế).
   *
   * @param {string} reasonOption - Lý do hủy thu ngân vừa chọn
   * @returns {void}
   */
  const handleSelectCancelReason = (reasonOption: string) => {
    setCancelReason(reasonOption);
    if (reasonOption === "Món lỗi / Hỏng / Đổ vỡ" || reasonOption === "Quán hết món / Thiếu đồ") {
      setRestoreStock(false);
    } else {
      setRestoreStock(isPackagedItem(cancellingItem));
    }
  };

  /**
   * Gửi yêu cầu hủy số lượng món đã chọn xuống backend để cập nhật phiên chơi và hoàn kho (nếu chọn).
   * Luồng đi: PosCancelItemModal -> posService.cancelOrderItem() -> POST /tables/:id/session/orders/cancel -> loadTables().
   *
   * @returns {Promise<void>}
   */
  const handleConfirmCancelItem = async () => {
    if (!selectedTable?.currentSession || !cancellingItem) return;
    const finalReason = cancelReason === "Khác" ? customCancelReason.trim() : cancelReason;
    if (!finalReason) {
      message.warning("Vui lòng chọn hoặc nhập lý do hủy món");
      return;
    }

    const ok = await save(async () => {
      await posService.cancelOrderItem(
        selectedTable.id,
        selectedTable.currentSession!.sessionId,
        cancellingItem.id,
        cancelQty,
        finalReason,
        restoreStock,
      );
    });

    if (!ok) return;
    message.success(
      restoreStock
        ? `Đã hủy ${cancelQty}x "${cancellingItem.name}" và hoàn trả tồn kho!`
        : `Đã hủy ${cancelQty}x "${cancellingItem.name}" (ghi nhận hao hụt)!`,
    );
    setCancelModalVisible(false);
    setCancellingItem(null);
    await loadTables();
  };

  return {
    fnbModalVisible,
    setFnbModalVisible,
    fnbTab,
    setFnbTab,
    fnbCategory,
    setFnbCategory,
    fnbSearchText,
    setFnbSearchText,
    newOrderList,
    cancelModalVisible,
    setCancelModalVisible,
    cancellingItem,
    cancelQty,
    setCancelQty,
    cancelReason,
    customCancelReason,
    setCustomCancelReason,
    restoreStock,
    setRestoreStock,
    fnbCategoryOptions,
    filteredFnbStock,
    activeServedOrders,
    cancelledOrders,
    activeFnbTotal,
    handleOpenFnbModal,
    handleAddFnbItem,
    handleUpdateNewOrderItemQty,
    handleRemoveNewOrderItem,
    handleConfirmAddFnbOrder,
    handleOpenCancelModal,
    handleSelectCancelReason,
    handleConfirmCancelItem,
  };
}
