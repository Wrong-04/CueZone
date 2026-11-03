import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CalendarOutlined, ClockCircleOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Modal, Space, message } from "../../shared/ui";
import { bookingService, type BookingQrDetails } from "../../services/pos.service";

interface BookingQrScannerProps {
  open: boolean;
  onClose: () => void;
}

export default function BookingQrScanner({ open, onClose }: BookingQrScannerProps) {
  const [booking, setBooking] = useState<BookingQrDetails | null>(null);
  const [scanError, setScanError] = useState("");
  const [scanAttempt, setScanAttempt] = useState(0);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!open || booking) return;
    let active = true;
    let started = false;
    const scanner = new Html5Qrcode("booking-qr-reader", { verbose: false });
    processingRef.current = false;

    void scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          if (processingRef.current) return;
          processingRef.current = true;
          try {
            if (started) {
              await scanner.stop();
              started = false;
              scanner.clear();
            }
            const result = await bookingService.resolveQr(decodedText.trim());
            if (active) {
              setBooking(result);
              setScanError("");
            }
          } catch (error) {
            if (active) {
              const text =
                error instanceof Error ? error.message : "Không thể xác thực mã QR đặt bàn";
              setScanError(text);
              setScanAttempt((attempt) => attempt + 1);
            }
          }
        },
        () => undefined,
      )
      .then(() => {
        started = true;
        if (!active) {
          return scanner.stop().then(() => {
            started = false;
            scanner.clear();
          });
        }
      })
      .catch((error: unknown) => {
        if (active) {
          const text =
            error instanceof Error
              ? `Không thể mở camera: ${error.message}`
              : "Không thể mở camera để quét mã QR";
          setScanError(text);
          message.error(text);
        }
      });

    return () => {
      active = false;
      if (started) {
        void scanner
          .stop()
          .then(() => scanner.clear())
          .catch((error: unknown) => console.error("Không thể dừng camera quét QR:", error));
      }
    };
  }, [open, booking, scanAttempt]);

  const handleClose = () => {
    setBooking(null);
    setScanError("");
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={[
        booking ? (
          <Button
            key="scan-again"
            variant="outline"
            onClick={() => {
              setBooking(null);
              setScanError("");
              setScanAttempt((attempt) => attempt + 1);
            }}
          >
            Quét mã khác
          </Button>
        ) : null,
        <Button key="close" variant="primary" onClick={handleClose}>
          Đóng
        </Button>,
      ]}
      title={
        <Space>
          <span className="font-bold text-slate-900">
            {booking ? "Thông tin nhận bàn" : "Quét QR đặt bàn"}
          </span>
        </Space>
      }
    >
      {booking ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase text-emerald-700">Dẫn khách đến</p>
            <p className="mt-1 text-2xl font-black text-emerald-900">
              {booking.table.code} · {booking.table.name}
            </p>
          </div>
          <div className="space-y-2 text-slate-700">
            <p>
              <UserOutlined className="mr-2 text-emerald-600" />
              {booking.customerName}
            </p>
            <p>
              <PhoneOutlined className="mr-2 text-emerald-600" />
              {booking.phone}
            </p>
            <p>
              <CalendarOutlined className="mr-2 text-emerald-600" />
              {booking.date}
              <ClockCircleOutlined className="ml-4 mr-2 text-emerald-600" />
              {booking.time} · {booking.duration} giờ
            </p>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 font-bold text-slate-900">Món F&B đặt trước</p>
            {booking.preOrderItems.length > 0 ? (
              <>
                <ul className="space-y-1">
                  {booking.preOrderItems.map((item) => (
                    <li key={item.productId} className="flex justify-between gap-3">
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <span className="whitespace-nowrap">
                        {(item.unitPrice * item.quantity).toLocaleString("vi-VN")}đ
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-right font-bold">
                  Tổng món: {booking.preOrderTotal.toLocaleString("vi-VN")}đ
                </p>
              </>
            ) : (
              <p className="text-slate-500">Không có món đặt trước.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div id="booking-qr-reader" className="min-h-64 overflow-hidden rounded-xl" />
          <p className="text-center text-xs text-slate-500">
            Cho phép sử dụng camera và đưa mã QR đặt bàn vào khung quét.
          </p>
          {scanError && <p className="text-center text-sm text-rose-600">{scanError}</p>}
        </div>
      )}
    </Modal>
  );
}
