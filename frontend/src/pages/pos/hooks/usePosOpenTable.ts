import { useState } from "react";
import { message } from "../../../shared/ui";
import { posService } from "../../../services/pos.service";
import { waitlistService } from "../../../services/waitlist.service";
import type { PosTable, BookingRequest } from "../../../types/pos";

interface UsePosOpenTableProps {
  selectedTable: PosTable | null;
  setSelectedTable: (table: PosTable | null) => void;
  save: (action: () => Promise<any>) => Promise<boolean>;
  pendingWaitlistEntryId: string | null;
  clearPendingWaitlist: () => void;
  fetchWaitlist: () => Promise<void>;
}

export function usePosOpenTable({
  selectedTable,
  setSelectedTable,
  save,
  pendingWaitlistEntryId,
  clearPendingWaitlist,
  fetchWaitlist,
}: UsePosOpenTableProps) {
  const [openModalVisible, setOpenModalVisible] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [sessionNote, setSessionNote] = useState<string>("");
  const [isCheckInMode, setIsCheckInMode] = useState<boolean>(false);
  const [isMemberCustomer, setIsMemberCustomer] = useState<boolean>(false);
  const [openModalMemberInfo, setOpenModalMemberInfo] = useState<{
    name: string;
    phone: string;
    rank?: string;
  } | null>(null);
  const [isSearchingOpenMember, setIsSearchingOpenMember] = useState<boolean>(false);

  const handlePhoneChangeInOpenModal = async (phoneInput: string) => {
    setCustomerPhone(phoneInput);
    const clean = phoneInput.trim().replace(/[\s.-]/g, "");
    if (clean.length >= 8) {
      setIsSearchingOpenMember(true);
      try {
        const res = await posService.lookupCustomer(clean);
        if (res.success && res.data) {
          setOpenModalMemberInfo({
            name: res.data.name,
            phone: res.data.phone,
            rank: res.data.rank,
          });
          setCustomerName(res.data.name);
          setIsMemberCustomer(true);
        } else {
          setOpenModalMemberInfo(null);
          setIsMemberCustomer(false);
        }
      } catch {
        setOpenModalMemberInfo(null);
        setIsMemberCustomer(false);
      } finally {
        setIsSearchingOpenMember(false);
      }
    } else {
      setOpenModalMemberInfo(null);
      setIsMemberCustomer(false);
    }
  };

  const handleOpenTable = async () => {
    if (!selectedTable) return;
    if (selectedTable.status !== "available" && selectedTable.status !== "booked") {
      message.warning("Bàn này không ở trạng thái sẵn sàng để mở!");
      return;
    }

    const ok = await save(() =>
      posService.open(selectedTable.id, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: sessionNote.trim(),
        bookingId: isCheckInMode ? selectedTable.bookedInfo?.bookingId : undefined,
        isMember: isMemberCustomer,
      }),
    );
    if (!ok) return;

    if (pendingWaitlistEntryId) {
      waitlistService
        .updateStatus(pendingWaitlistEntryId, "seated", selectedTable.id)
        .then(() => fetchWaitlist())
        .catch(() => {});
      clearPendingWaitlist();
    }

    message.success(`Đã mở ${selectedTable.name} & bắt đầu tính giờ thành công!`);
    setOpenModalVisible(false);
    setSelectedTable(null);
    setCustomerName("");
    setCustomerPhone("");
    setSessionNote("");
    setIsMemberCustomer(false);
    setOpenModalMemberInfo(null);
    setIsCheckInMode(false);
  };

  const handleOpenTableModal = (table: PosTable, isCheckIn = false) => {
    setSelectedTable(table);
    setIsCheckInMode(isCheckIn);
    if (isCheckIn && table.bookedInfo) {
      setCustomerName(table.bookedInfo.customerName || "");
      setCustomerPhone(table.bookedInfo.phone || "");
      setSessionNote(`Lịch hẹn lúc ${table.bookedInfo.time}`);
      if (table.bookedInfo.phone) {
        void handlePhoneChangeInOpenModal(table.bookedInfo.phone);
      }
    } else {
      setCustomerName("");
      setCustomerPhone("");
      setSessionNote("");
      setIsMemberCustomer(false);
      setOpenModalMemberInfo(null);
    }
    setOpenModalVisible(true);
  };

  const handleCheckInFromBooking = (tableId: string, booking: BookingRequest) => {
    const table = selectedTable && selectedTable.id === tableId ? selectedTable : null;
    if (table) {
      setSelectedTable(table);
      setIsCheckInMode(true);
      setCustomerName(booking.customerName);
      setCustomerPhone(booking.phone);
      setSessionNote(`Nhận bàn hẹn lúc ${booking.time} (${booking.date})`);
      setOpenModalVisible(true);
      if (booking.phone) {
        void handlePhoneChangeInOpenModal(booking.phone);
      }
    }
  };

  return {
    openModalVisible,
    setOpenModalVisible,
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    sessionNote,
    setSessionNote,
    isCheckInMode,
    setIsCheckInMode,
    isMemberCustomer,
    setIsMemberCustomer,
    openModalMemberInfo,
    isSearchingOpenMember,
    handlePhoneChangeInOpenModal,
    handleOpenTable,
    handleOpenTableModal,
    handleCheckInFromBooking,
  };
}
