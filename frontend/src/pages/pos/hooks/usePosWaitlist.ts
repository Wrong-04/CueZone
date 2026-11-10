import { useState, useCallback, useEffect } from "react";
import { message } from "../../../shared/ui";
import { waitlistService } from "../../../services/waitlist.service";
import { getSocket } from "../../../services/socket.service";
import type { PosTable } from "../../../types/pos";

export interface WaitlistEntry {
  id: string;
  _id?: string;
  customerName: string;
  phone: string;
  guests: number;
  preferredType: string;
  joinedTime: string;
  note?: string;
}

interface UsePosWaitlistProps {
  tables: PosTable[];
  onSelectTableForWaitlist: (
    table: PosTable,
    customerName: string,
    phone: string,
    sessionNote: string,
    waitlistEntryId: string,
  ) => void;
}

export function usePosWaitlist({ tables, onSelectTableForWaitlist }: UsePosWaitlistProps) {
  const [waitlistModalVisible, setWaitlistModalVisible] = useState<boolean>(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [pendingWaitlistEntryId, setPendingWaitlistEntryId] = useState<string | null>(null);

  const [newWaitName, setNewWaitName] = useState("");
  const [newWaitPhone, setNewWaitPhone] = useState("");
  const [newWaitGuests, setNewWaitGuests] = useState(2);
  const [newWaitType, setNewWaitType] = useState("Bàn Bida Lỗ (Pool)");
  const [newWaitNote, setNewWaitNote] = useState("");

  const fetchWaitlist = useCallback(async () => {
    try {
      const list = await waitlistService.getAll();
      setWaitlist(
        list.map((w) => ({
          ...w,
          id: String(w._id || w.id),
        })),
      );
    } catch (e) {
      console.error("Lỗi tải danh sách chờ:", e);
    }
  }, []);

  useEffect(() => {
    fetchWaitlist();
    const socket = getSocket();
    const handleSync = () => {
      fetchWaitlist();
    };
    socket.on("waitlist:updated", handleSync);
    window.addEventListener("waitlist:updated", handleSync);
    return () => {
      socket.off("waitlist:updated", handleSync);
      window.removeEventListener("waitlist:updated", handleSync);
    };
  }, [fetchWaitlist]);

  const handleAddWaitlist = async () => {
    if (!newWaitName.trim() || !newWaitPhone.trim()) {
      message.warning("Vui lòng nhập tên và số điện thoại khách chờ");
      return;
    }
    try {
      await waitlistService.create({
        customerName: newWaitName.trim(),
        phone: newWaitPhone.trim(),
        guests: newWaitGuests,
        preferredType: newWaitType,
        note: newWaitNote.trim(),
      });
      setNewWaitName("");
      setNewWaitPhone("");
      setNewWaitNote("");
      message.success("Đã thêm khách vào danh sách chờ bàn");
      fetchWaitlist();
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || "Không thể thêm khách chờ");
    }
  };

  const handleAssignWaitlist = (entry: WaitlistEntry, chosenTableId?: string) => {
    let targetTable: PosTable | undefined;

    if (chosenTableId) {
      targetTable = tables.find((t) => t.id === chosenTableId && t.status === "available");
    }

    if (!targetTable) {
      targetTable =
        tables.find(
          (t) =>
            t.status === "available" &&
            (t.typeName === entry.preferredType || !entry.preferredType),
        ) || tables.find((t) => t.status === "available");
    }

    if (!targetTable) {
      message.warning(
        `Toàn quán hiện không còn bàn trống nào để xếp cho khách ${entry.customerName}!`,
      );
      return;
    }

    setPendingWaitlistEntryId(entry.id);
    setWaitlistModalVisible(false);
    onSelectTableForWaitlist(
      targetTable,
      entry.customerName,
      entry.phone,
      entry.note ? `Khách chờ: ${entry.note}` : "Khách từ danh sách chờ",
      entry.id,
    );
    message.info(
      `Đang xếp ${targetTable.name} cho khách ${entry.customerName}. Vui lòng bấm xác nhận mở bàn!`,
    );
  };

  const handleRemoveWaitlist = async (id: string) => {
    try {
      await waitlistService.remove(id);
      message.info("Đã xóa khách khỏi danh sách chờ");
      fetchWaitlist();
    } catch {
      message.error("Không thể xóa khỏi danh sách chờ");
    }
  };

  const clearPendingWaitlist = () => {
    setPendingWaitlistEntryId(null);
  };

  return {
    waitlistModalVisible,
    setWaitlistModalVisible,
    waitlist,
    pendingWaitlistEntryId,
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
    handleAddWaitlist,
    handleAssignWaitlist,
    handleRemoveWaitlist,
    clearPendingWaitlist,
    fetchWaitlist,
  };
}
