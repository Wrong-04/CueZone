import { useState } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import type { PosTable, EligibleMoveTargetsResponse } from "../../../types/pos";

interface UsePosTransferProps {
  tables: PosTable[];
  selectedTable: PosTable | null;
  setSelectedTable: (table: PosTable | null) => void;
  save: (action: () => Promise<any>) => Promise<boolean>;
  loadTables: (silent?: boolean) => Promise<void>;
}

export function usePosTransfer({
  tables,
  selectedTable,
  setSelectedTable,
  save,
  loadTables,
}: UsePosTransferProps) {
  const [transferModalVisible, setTransferModalVisible] = useState<boolean>(false);
  const [targetTableId, setTargetTableId] = useState<string>("");
  const [transferAction, setTransferAction] = useState<"transfer" | "merge">("transfer");
  const [transferReason, setTransferReason] = useState<string>("");
  const [eligibleMoveData, setEligibleMoveData] = useState<EligibleMoveTargetsResponse | null>(null);
  const [loadingMoveTargets, setLoadingMoveTargets] = useState<boolean>(false);

  const handleOpenTransferModal = async (
    table: PosTable,
    action: "transfer" | "merge" = "transfer",
  ) => {
    setSelectedTable(table);
    setTransferAction(action);
    setTargetTableId("");
    setTransferReason("");
    setTransferModalVisible(true);
    setLoadingMoveTargets(true);
    try {
      const res = await posService.getMoveTargets(table.id, action);
      setEligibleMoveData(res);
    } catch (err: any) {
      console.error("Lỗi lấy danh sách bàn khả dụng:", err);
      setEligibleMoveData(null);
    } finally {
      setLoadingMoveTargets(false);
    }
  };

  const handleSwitchTransferAction = async (action: "transfer" | "merge") => {
    setTransferAction(action);
    setTargetTableId("");
    if (!selectedTable) return;
    setLoadingMoveTargets(true);
    try {
      const res = await posService.getMoveTargets(selectedTable.id, action);
      setEligibleMoveData(res);
    } catch (err: any) {
      console.error("Lỗi đổi hành động chuyển/gộp bàn:", err);
      setEligibleMoveData(null);
    } finally {
      setLoadingMoveTargets(false);
    }
  };

  const handleTransferOrMerge = async () => {
    if (!selectedTable || !selectedTable.currentSession || !targetTableId) {
      message.warning("Vui lòng chọn bàn đích!");
      return;
    }

    const targetTable =
      tables.find((t) => t.id === targetTableId) ||
      eligibleMoveData?.targets?.find((t) => t.id === targetTableId);
    if (!targetTable) return;

    const ok = await save(() =>
      posService.move(selectedTable, targetTableId, transferAction, {
        reason: transferReason.trim() || undefined,
        pricingOption: "target_table",
      }),
    );
    if (!ok) return;

    message.success(
      `Đã ${transferAction === "transfer" ? "chuyển" : "gộp"} ${selectedTable.name} sang ${targetTable.name}!`,
    );

    setTransferModalVisible(false);
    setSelectedTable(null);
    setTargetTableId("");
    setTransferReason("");
    setEligibleMoveData(null);
    await loadTables();
  };

  return {
    transferModalVisible,
    setTransferModalVisible,
    targetTableId,
    setTargetTableId,
    transferAction,
    setTransferAction,
    transferReason,
    setTransferReason,
    eligibleMoveData,
    loadingMoveTargets,
    handleOpenTransferModal,
    handleSwitchTransferAction,
    handleTransferOrMerge,
  };
}
