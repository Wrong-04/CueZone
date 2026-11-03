import { useEffect, useState } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import { Button, Card, Tag, Typography, Modal, Input, message, Space } from "../../shared/ui";
import { bookingService } from "../../services/pos.service";
import type { BookingRequest } from "../../types/pos";
import QRCode from "qrcode";

const { Title, Text, Paragraph } = Typography;

interface BookingItem {
  id: string;
  code: string;
  tableName: string;
  tableType: string;
  date: string;
  time: string;
  duration: number;
  totalCost: number;
  status: BookingRequest["status"];
  statusLabel: string;
  createdAt: string;
  canCancel: boolean;
}

const statusLabels: Record<BookingRequest["status"], string> = {
  pending: "Chờ xác nhận",
  approved: "Đã xác nhận",
  confirmed: "Đã xác nhận",
  rejected: "Bị từ chối",
  checked_in: "Đã nhận bàn",
  cancelled: "Đã hủy",
};

const statusColors: Record<BookingRequest["status"], string> = {
  pending: "gold",
  approved: "green",
  confirmed: "green",
  rejected: "red",
  checked_in: "blue",
  cancelled: "default",
};

const formatDate = (value: string, includeTime = false) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    ...(includeTime ? { timeStyle: "short" as const } : {}),
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));

const mapBooking = (booking: BookingRequest): BookingItem => {
  const startsAt = new Date(`${booking.date}T${booking.time}:00+07:00`).getTime();
  return {
    id: booking.id,
    code: `CZ-${booking.id.slice(-6).toUpperCase()}`,
    tableName: booking.tableName,
    tableType: booking.tableType || "Bàn bida",
    date: formatDate(`${booking.date}T12:00:00+07:00`),
    time: booking.time,
    duration: booking.duration,
    totalCost: booking.estimatedCost,
    status: booking.status,
    statusLabel: statusLabels[booking.status],
    createdAt: booking.createdAt ? formatDate(booking.createdAt, true) : "",
    canCancel:
      ["pending", "approved"].includes(booking.status) &&
      startsAt - 2 * 60 * 60 * 1000 > Date.now(),
  };
};

const CustomerHistory = () => {
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null);
  const [viewingBooking, setViewingBooking] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [bookingQr, setBookingQr] = useState<{ code: string; image: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const refreshBookings = async () => {
    const records = await bookingService.getMine();
    setBookings(records.map(mapBooking));
    setLoadError("");
  };

  const reportLoadError = (error: unknown) => {
    const text = error instanceof Error ? error.message : "Không thể tải lịch sử đặt chỗ";
    setLoadError(text);
    message.error(text);
  };

  useEffect(() => {
    refreshBookings()
      .catch(reportLoadError)
      .finally(() => setLoading(false));
  }, []);

  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    if (!cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy đặt bàn");
      return;
    }

    setIsSubmittingCancel(true);
    try {
      await bookingService.cancelMine(cancellingBooking.id, cancelReason.trim());
      await refreshBookings();
      setCancellingBooking(null);
      setCancelReason("");
      message.success("Đã hủy lịch đặt bàn thành công");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể hủy lịch đặt bàn");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleShowQr = async (booking: BookingItem) => {
    setLoadingQr(true);
    try {
      const { qrToken } = await bookingService.issueQr(booking.id);
      const image = await QRCode.toDataURL(qrToken, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      });
      setBookingQr({ code: booking.code, image });
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Không thể tạo mã QR đặt bàn");
    } finally {
      setLoadingQr(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-3">
        <Tag color="green" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
          <CalendarOutlined className="mr-1.5" /> LỊCH SỬ ĐẶT CHỖ
        </Tag>
        <Title
          level={1}
          className="!text-2xl sm:!text-4xl !font-black !text-slate-900 !mb-1 tracking-tight"
        >
          Lịch Đặt Bàn Của Tôi
        </Title>
        <Paragraph className="!text-xs sm:!text-sm !text-slate-500 max-w-3xl leading-relaxed !mb-0">
          Theo dõi lịch đặt bàn đã xác nhận và hủy lịch trước giờ chơi ít nhất 2 tiếng.
        </Paragraph>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
            Lịch đặt của bạn ({bookings.length})
          </Title>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshBookings().catch(reportLoadError)}
            loading={loading}
            className="!rounded-xl"
          >
            Làm mới
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Đang tải lịch sử đặt chỗ...</div>
        ) : loadError ? (
          <div className="py-12 text-center text-rose-600">{loadError}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarOutlined className="text-4xl text-slate-300 mb-3" />
            <p>Bạn chưa có lịch đặt bàn nào.</p>
            <Button variant="primary" to="/customer/booking" className="mt-3 !rounded-xl">
              Đặt Bàn Ngay
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-200 hover:!shadow-md transition-all p-5 sm:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Tag
                        color={statusColors[booking.status]}
                        className="!text-xs !font-bold !px-2.5 !py-0.5 !rounded-md uppercase"
                      >
                        {booking.statusLabel}
                      </Tag>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {booking.code}
                      </span>
                      <span className="text-xs text-slate-400">• Đặt lúc: {booking.createdAt}</span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <Title level={4} className="!text-lg !font-bold !text-slate-900 !mb-0">
                        {booking.tableName}
                      </Title>
                      <Text className="!text-xs !text-emerald-700 font-semibold">
                        ({booking.tableType})
                      </Text>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-5 text-xs text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <CalendarOutlined className="text-emerald-600" />
                        {booking.date}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <ClockCircleOutlined className="text-emerald-600" />
                        {booking.time} ({booking.duration} tiếng)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <DollarOutlined className="text-emerald-600" />
                        Tạm tính: <strong>{booking.totalCost.toLocaleString("vi-VN")}đ</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingBooking(booking)}
                      className="!text-xs !rounded-xl"
                    >
                      Chi Tiết
                    </Button>
                    {booking.status === "approved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={loadingQr}
                        onClick={() => void handleShowQr(booking)}
                        icon={<QrcodeOutlined />}
                        className="!text-xs !rounded-xl"
                      >
                        Mã QR
                      </Button>
                    )}
                    {booking.canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setCancellingBooking(booking)}
                        className="!text-xs !rounded-xl"
                      >
                        Hủy Đặt Bàn
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!bookingQr}
        onCancel={() => setBookingQr(null)}
        footer={[
          <Button
            key="close-qr"
            variant="outline"
            onClick={() => setBookingQr(null)}
            className="!text-xs !rounded-xl"
          >
            Đóng
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <QrcodeOutlined className="text-emerald-600" />
            <span className="text-slate-900 font-bold">Mã QR đặt bàn {bookingQr?.code}</span>
          </Space>
        }
      >
        {bookingQr && (
          <div className="space-y-3 py-2 text-center">
            <img
              src={bookingQr.image}
              alt="Mã QR xác nhận đặt bàn"
              className="mx-auto h-56 w-56"
            />
            <p className="text-xs text-slate-600">
              Đưa mã này cho nhân viên để xác nhận bàn và các món F&B đặt trước.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!viewingBooking}
        onCancel={() => setViewingBooking(null)}
        footer={[
          <Button
            key="close"
            variant="outline"
            onClick={() => setViewingBooking(null)}
            className="!text-xs !rounded-xl"
          >
            Đóng
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <CalendarOutlined className="text-emerald-600" />
            <span className="text-slate-900 font-bold">Chi Tiết Lịch Đặt Bàn</span>
          </Space>
        }
      >
        {viewingBooking && (
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đặt bàn:</span>
                <span className="font-mono font-bold text-slate-900">{viewingBooking.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bàn:</span>
                <span className="font-bold text-slate-900">
                  {viewingBooking.tableName} ({viewingBooking.tableType})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày giờ chơi:</span>
                <span className="font-semibold text-slate-900">
                  {viewingBooking.time} ({viewingBooking.date})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời lượng dự kiến:</span>
                <span className="font-semibold text-slate-900">{viewingBooking.duration} giờ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-semibold text-slate-900">{viewingBooking.statusLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chi phí tạm tính:</span>
                <span className="font-bold text-emerald-600">
                  {viewingBooking.totalCost.toLocaleString("vi-VN")} VNĐ
                </span>
              </div>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Lịch chưa nhận bàn có thể hủy trước giờ chơi ít nhất 2 tiếng.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!cancellingBooking}
        onCancel={() => setCancellingBooking(null)}
        footer={[
          <Button
            key="back"
            variant="outline"
            onClick={() => setCancellingBooking(null)}
            className="!text-xs !rounded-xl"
          >
            Giữ Lại Lịch Đặt
          </Button>,
          <Button
            key="confirm"
            variant="danger"
            loading={isSubmittingCancel}
            onClick={handleConfirmCancel}
            className="!text-xs !rounded-xl"
          >
            Xác Nhận Hủy
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <ExclamationCircleOutlined className="text-rose-600" />
            <span className="text-slate-900 font-bold">Xác Nhận Hủy Đặt Bàn</span>
          </Space>
        }
      >
        {cancellingBooking && (
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <p className="text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn hủy lịch đặt bàn cho{" "}
              <strong>{cancellingBooking.tableName}</strong> lúc{" "}
              <strong>{cancellingBooking.time}</strong> ngày{" "}
              <strong>{cancellingBooking.date}</strong> không?
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Lý do hủy (bắt buộc):
              </label>
              <Input.TextArea
                rows={3}
                maxLength={1000}
                placeholder="Ví dụ: Bận việc đột xuất, đổi thời gian chơi..."
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className="!text-xs !rounded-xl"
              />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 leading-relaxed">
              Chỉ có thể hủy lịch chưa nhận bàn và trước giờ chơi ít nhất 2 tiếng.
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerHistory;
