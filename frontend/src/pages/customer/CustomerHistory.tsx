import React, { useState } from "react";
import {
  CalendarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarFilled,
  DollarOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Typography,
  Tabs,
  Modal,
  Input,
  message,
  Space,
} from "../../shared/ui";

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
  status: "confirmed" | "completed" | "cancelled";
  statusLabel: string;
  createdAt: string;
}

interface SessionItem {
  id: string;
  code: string;
  tableName: string;
  tableType: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  tableCost: number;
  fnbCost: number;
  totalCost: number;
  reviewed?: boolean;
  rating?: number;
  reviewComment?: string;
}

const INITIAL_BOOKINGS: BookingItem[] = [
  {
    id: "bk-1",
    code: "CZ-BK9821",
    tableName: "Bàn 09",
    tableType: "Bàn VIP Bank Pool",
    date: "Hôm nay, 02/10/2026",
    time: "19:00 - 21:00",
    duration: 2,
    totalCost: 140000,
    status: "confirmed",
    statusLabel: "Đã Giữ Chỗ (Sắp tới)",
    createdAt: "02/10/2026 09:30",
  },
  {
    id: "bk-2",
    code: "CZ-BK8712",
    tableName: "Bàn 13",
    tableType: "Bàn Match K-Steel VAR",
    date: "04/10/2026",
    time: "14:00 - 17:00",
    duration: 3,
    totalCost: 240000,
    status: "confirmed",
    statusLabel: "Đã Giữ Chỗ",
    createdAt: "01/10/2026 15:20",
  },
  {
    id: "bk-3",
    code: "CZ-BK6510",
    tableName: "Bàn 02",
    tableType: "Bàn Thường 9FT",
    date: "28/09/2026",
    time: "20:00 - 22:00",
    duration: 2,
    totalCost: 100000,
    status: "completed",
    statusLabel: "Đã Hoàn Tất",
    createdAt: "28/09/2026 11:00",
  },
  {
    id: "bk-4",
    code: "CZ-BK5401",
    tableName: "Bàn 05",
    tableType: "Bàn Thường 9FT",
    date: "20/09/2026",
    time: "18:00 - 20:00",
    duration: 2,
    totalCost: 100000,
    status: "cancelled",
    statusLabel: "Đã Hủy",
    createdAt: "19/09/2026 14:15",
  },
];

const INITIAL_SESSIONS: SessionItem[] = [
  {
    id: "ses-1",
    code: "INV-2026-0982",
    tableName: "Bàn 03",
    tableType: "Bàn Thường 9FT Min Table",
    date: "01/10/2026",
    startTime: "18:30",
    endTime: "21:00",
    durationHours: 2.5,
    tableCost: 125000,
    fnbCost: 67000,
    totalCost: 192000,
    reviewed: true,
    rating: 5,
    reviewComment: "Bàn nỉ Simonis 860 siêu mượt, băng cao su nảy chuẩn. Cà phê muối rất ngon!",
  },
  {
    id: "ses-2",
    code: "INV-2026-0810",
    tableName: "Bàn 09",
    tableType: "Bàn VIP Bank Pool",
    date: "26/09/2026",
    startTime: "19:00",
    endTime: "22:00",
    durationHours: 3,
    tableCost: 210000,
    fnbCost: 110000,
    totalCost: 320000,
    reviewed: false,
  },
  {
    id: "ses-3",
    code: "INV-2026-0744",
    tableName: "Bàn 13",
    tableType: "Bàn Match K-Steel VAR",
    date: "18/09/2026",
    startTime: "14:00",
    endTime: "16:30",
    durationHours: 2.5,
    tableCost: 200000,
    fnbCost: 70000,
    totalCost: 270000,
    reviewed: true,
    rating: 5,
    reviewComment: "Hệ thống VAR bắt tình huống chạm băng cực kỳ rõ nét và công tâm!",
  },
];

export const CustomerHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("bookings");
  const [bookings, setBookings] = useState<BookingItem[]>(INITIAL_BOOKINGS);
  const [sessions, setSessions] = useState<SessionItem[]>(INITIAL_SESSIONS);

  // State cho việc Hủy đặt bàn (Cancel Booking)
  const [cancellingBooking, setCancellingBooking] = useState<BookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // State cho việc Đánh giá phiên chơi (Submit Service Review)
  const [reviewingSession, setReviewingSession] = useState<SessionItem | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Chi tiết booking
  const [viewingBooking, setViewingBooking] = useState<BookingItem | null>(null);

  const handleConfirmCancel = () => {
    if (!cancellingBooking) return;
    if (!cancelReason.trim()) {
      message.warning("Vui lòng nhập lý do hủy đặt bàn");
      return;
    }

    setIsSubmittingCancel(true);
    setTimeout(() => {
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancellingBooking.id
            ? { ...b, status: "cancelled", statusLabel: "Đã Hủy" }
            : b
        )
      );
      setIsSubmittingCancel(false);
      setCancellingBooking(null);
      setCancelReason("");
      message.success("Đã hủy lịch đặt bàn thành công");
    }, 600);
  };

  const handleConfirmReview = () => {
    if (!reviewingSession) return;
    setIsSubmittingReview(true);
    setTimeout(() => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === reviewingSession.id
            ? {
                ...s,
                reviewed: true,
                rating: reviewRating,
                reviewComment: reviewComment || "Rất hài lòng với dịch vụ CLB!",
              }
            : s
        )
      );
      setIsSubmittingReview(false);
      setReviewingSession(null);
      setReviewComment("");
      message.success("Cảm ơn bạn đã gửi đánh giá trải nghiệm dịch vụ!");
    }, 600);
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-3">
        <Tag color="green" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
          <CalendarOutlined className="mr-1.5" /> HOẠT ĐỘNG & LỊCH SỬ HỘI VIÊN
        </Tag>
        <Title level={1} className="!text-2xl sm:!text-4xl !font-black !text-slate-900 !mb-1 tracking-tight">
          Lịch Đặt Bàn & Lịch Sử Phiên Chơi
        </Title>
        <Paragraph className="!text-xs sm:!text-sm !text-slate-500 max-w-3xl leading-relaxed !mb-0">
          Theo dõi các lượt đặt bàn sắp tới, quản lý hủy lịch giữ chỗ và xem lại nhật ký các trận cơ cùng hóa đơn chi tiết tại CueZone.
        </Paragraph>
      </div>

      {/* Tabs Chuyển Đổi: Lịch Đặt Bàn vs Lịch Sử Phiên Chơi */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key)}
          className="[&_.ant-tabs-nav]:!mb-6 [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!font-bold [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-600 [&_.ant-tabs-ink-bar]:!bg-emerald-600"
          items={[
            {
              key: "bookings",
              label: (
                <Space size={6} align="center">
                  <CalendarOutlined />
                  <span>Lịch Đặt Bàn Của Tôi ({bookings.filter((b) => b.status === "confirmed").length})</span>
                </Space>
              ),
            },
            {
              key: "sessions",
              label: (
                <Space size={6} align="center">
                  <ClockCircleOutlined />
                  <span>Nhật Ký Phiên Chơi ({sessions.length})</span>
                </Space>
              ),
            },
          ]}
        />

        {/* TAB 1: DANH SÁCH LỊCH ĐẶT BÀN */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <CalendarOutlined className="text-4xl text-slate-300 mb-3" />
                <p>Bạn chưa có lịch đặt bàn nào.</p>
                <Button variant="primary" to="/customer/booking" className="mt-3 !rounded-xl">
                  Đặt Bàn Ngay
                </Button>
              </div>
            ) : (
              bookings.map((booking) => (
                <Card
                  key={booking.id}
                  className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-200 hover:!shadow-md transition-all p-5 sm:p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Tag
                          color={
                            booking.status === "confirmed"
                              ? "green"
                              : booking.status === "completed"
                              ? "blue"
                              : "default"
                          }
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

                      {booking.status === "confirmed" && (
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
              ))
            )}
          </div>
        )}

        {/* TAB 2: LỊCH SỬ PHIÊN CHƠI */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card
                key={session.id}
                className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-md transition-all p-5 sm:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Tag color="cyan" className="!text-xs !font-bold !px-2.5 !py-0.5 !rounded-md uppercase">
                        ĐÃ THANH TOÁN
                      </Tag>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {session.code}
                      </span>
                      <span className="text-xs text-slate-400">• Ngày chơi: {session.date}</span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <Title level={4} className="!text-lg !font-bold !text-slate-900 !mb-0">
                        {session.tableName}
                      </Title>
                      <Text className="!text-xs !text-slate-500">
                        {session.tableType}
                      </Text>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[11px]">Thời gian chơi:</span>
                        <strong>{session.startTime} - {session.endTime} ({session.durationHours}h)</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tiền giờ bàn:</span>
                        <strong>{session.tableCost.toLocaleString("vi-VN")}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tiền đồ uống F&B:</span>
                        <strong>{session.fnbCost.toLocaleString("vi-VN")}đ</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px]">Tổng hóa đơn:</span>
                        <strong className="text-emerald-700 text-sm">{session.totalCost.toLocaleString("vi-VN")}đ</strong>
                      </div>
                    </div>

                    {session.reviewed && session.reviewComment && (
                      <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-xs text-amber-500">
                          {Array.from({ length: session.rating || 5 }).map((_, i) => (
                            <StarFilled key={i} />
                          ))}
                          <span className="text-slate-700 font-semibold ml-1">Đánh giá của bạn:</span>
                        </div>
                        <p className="text-xs text-slate-600 italic !mb-0">
                          "{session.reviewComment}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="self-end lg:self-center flex items-center gap-2">
                    {!session.reviewed ? (
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<StarFilled className="text-amber-300" />}
                        onClick={() => {
                          setReviewingSession(session);
                          setReviewRating(5);
                          setReviewComment("");
                        }}
                        className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
                      >
                        Đánh Giá Trải Nghiệm
                      </Button>
                    ) : (
                      <Tag color="green" className="!px-3 !py-1 !text-xs !rounded-lg !border-emerald-200 font-semibold">
                        <CheckCircleOutlined className="mr-1" /> Đã gửi đánh giá
                      </Tag>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: XEM CHI TIẾT LỊCH ĐẶT BÀN */}
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
            <span className="text-slate-900 font-bold">Chi Tiết Lịch Giữ Bàn</span>
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
                <span className="text-slate-500">Bàn thi đấu:</span>
                <span className="font-bold text-slate-900">{viewingBooking.tableName} ({viewingBooking.tableType})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ngày giờ chơi:</span>
                <span className="font-semibold text-slate-900">{viewingBooking.time} ({viewingBooking.date})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Thời lượng dự kiến:</span>
                <span className="font-semibold text-slate-900">{viewingBooking.duration} giờ</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chi phí tạm tính:</span>
                <span className="font-bold text-emerald-600">{viewingBooking.totalCost.toLocaleString("vi-VN")} VNĐ</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-500">Địa chỉ CLB:</span>
                <span className="font-medium text-slate-800 text-right">123 Nguyễn Thị Minh Khai, Q.3, TP.HCM</span>
              </div>
            </div>
            <p className="text-slate-500 leading-relaxed">
              Vui lòng đến đúng giờ để nhận bàn. CLB hỗ trợ giữ bàn tối đa 15 phút. Nếu cần hỗ trợ khẩn cấp, vui lòng gọi hotline <strong>1900 6868</strong>.
            </p>
          </div>
        )}
      </Modal>

      {/* MODAL 2: HỦY ĐẶT BÀN & NHẬP LÝ DO (Cancel Booking with Reason) */}
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
              Bạn có chắc chắn muốn hủy lịch giữ chỗ cho <strong>{cancellingBooking.tableName}</strong> lúc <strong>{cancellingBooking.time}</strong> ngày <strong>{cancellingBooking.date}</strong> không?
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vui lòng cho biết lý do hủy bàn: <span className="text-red-500">*</span>
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Ví dụ: Bận việc đột xuất, đổi thời gian chơi, nhóm bạn hủy hẹn..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="!text-xs !rounded-xl"
              />
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 leading-relaxed">
              Lưu ý: Hủy bàn trước 2 tiếng sẽ không ảnh hưởng đến tỷ lệ uy tín đặt bàn và điểm tích lũy của bạn tại CueZone.
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: ĐÁNH GIÁ DỊCH VỤ PHIÊN CHƠI (Submit Service Review) */}
      <Modal
        open={!!reviewingSession}
        onCancel={() => setReviewingSession(null)}
        footer={[
          <Button
            key="cancel"
            variant="outline"
            onClick={() => setReviewingSession(null)}
            className="!text-xs !rounded-xl"
          >
            Hủy Bỏ
          </Button>,
          <Button
            key="submit"
            variant="primary"
            loading={isSubmittingReview}
            onClick={handleConfirmReview}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Gửi Đánh Giá
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <StarFilled className="text-amber-500" />
            <span className="text-slate-900 font-bold">Đánh Giá Trải Nghiệm Trận Cơ</span>
          </Space>
        }
      >
        {reviewingSession && (
          <div className="space-y-4 py-2 text-xs text-slate-700">
            <p className="text-slate-600">
              Trải nghiệm của bạn tại <strong>{reviewingSession.tableName}</strong> vào ngày <strong>{reviewingSession.date}</strong> thế nào?
            </p>

            {/* Chọn Sao */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
              <span className="text-xs text-slate-500 font-medium block">
                Mức độ hài lòng của bạn:
              </span>
              <div className="flex items-center justify-center gap-2 text-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none"
                  >
                    <StarFilled
                      className={
                        star <= reviewRating ? "text-amber-400" : "text-slate-200"
                      }
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-emerald-700 block">
                {reviewRating === 5
                  ? "Tuyệt vời! Bàn nỉ & cơ chuẩn thi đấu"
                  : reviewRating === 4
                  ? "Hài lòng, dịch vụ tốt"
                  : reviewRating === 3
                  ? "Bình thường"
                  : "Cần cải thiện thêm"}
              </span>
            </div>

            {/* Ý kiến đóng góp */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nhận xét chi tiết (chất lượng bàn, ánh sáng, phục vụ, đồ uống):
              </label>
              <Input.TextArea
                rows={3}
                placeholder="Chia sẻ cảm nhận của bạn để CueZone nâng cao chất lượng dịch vụ..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="!text-xs !rounded-xl"
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerHistory;
