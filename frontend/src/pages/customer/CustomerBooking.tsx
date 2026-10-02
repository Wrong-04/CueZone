import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  User,
  Phone,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Card,
  Tag,
  Input,
  Select,
  Typography,
  message,
  Modal,
  Space,
} from "../../shared/ui";

const { Title, Paragraph } = Typography;

const TABLES_LIST = [
  { id: "TB-01", name: "Bàn 01", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-02", name: "Bàn 02", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-03", name: "Bàn 03", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-05", name: "Bàn 05", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-06", name: "Bàn 06", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-08", name: "Bàn 08", type: "standard", typeName: "Bàn Thường 9FT", price: 50000, priceFormatted: "50.000đ/h" },
  { id: "TB-09", name: "Bàn 09", type: "vip", typeName: "Bàn VIP Bank Pool", price: 70000, priceFormatted: "70.000đ/h" },
  { id: "TB-10", name: "Bàn 10", type: "vip", typeName: "Bàn VIP Bank Pool", price: 70000, priceFormatted: "70.000đ/h" },
  { id: "TB-12", name: "Bàn 12", type: "vip", typeName: "Bàn VIP Bank Pool", price: 70000, priceFormatted: "70.000đ/h" },
  { id: "TB-13", name: "Bàn 13", type: "match", typeName: "Bàn Match K-Steel (VAR)", price: 80000, priceFormatted: "80.000đ/h" },
  { id: "TB-14", name: "Bàn 14", type: "match", typeName: "Bàn Match K-Steel (VAR)", price: 80000, priceFormatted: "80.000đ/h" },
];

const CustomerBooking = () => {
  const [searchParams] = useSearchParams();
  const preSelectedTable = searchParams.get("table") || "TB-02";

  const [selectedTableId, setSelectedTableId] = useState<string>(preSelectedTable);
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [date, setDate] = useState<string>("Hôm nay");
  const [time, setTime] = useState<string>("14:00");
  const [duration, setDuration] = useState<number>(2);
  const [note, setNote] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  useEffect(() => {
    if (searchParams.get("table")) {
      setSelectedTableId(searchParams.get("table")!);
    }
  }, [searchParams]);

  const selectedTable = TABLES_LIST.find((t) => t.id === selectedTableId) || TABLES_LIST[0];
  const totalCost = selectedTable.price * duration;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      message.warning("Vui lòng nhập họ và tên của bạn!");
      return;
    }
    if (!phone.trim()) {
      message.warning("Vui lòng nhập số điện thoại để giữ bàn!");
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShowSuccessModal(true);
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <Calendar className="h-4 w-4 text-emerald-600" />
          ĐẶT CHỖ TRỰC TUYẾN KHÔNG CẦN CỌC
        </div>
        <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
          Đặt Bàn Bida Chuẩn Thi Đấu
        </Title>
        <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !max-w-2xl !mb-0">
          Chọn bàn bida ưa thích, xác định thời gian chơi và hoàn tất giữ chỗ chỉ trong 30 giây. Bàn được giữ tối đa 15 phút sau giờ hẹn.
        </Paragraph>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Chọn bàn trực quan */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0">
                1. Chọn Bàn Bida Trống
              </Title>
              <Tag color="green" className="!text-xs !font-bold">
                {TABLES_LIST.length} BÀN SẴN SÀNG
              </Tag>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TABLES_LIST.map((t) => {
                const isSelected = t.id === selectedTableId;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTableId(t.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-500/20 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-black text-sm ${isSelected ? "text-emerald-800" : "text-slate-800"}`}>
                        {t.name}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase block mb-1">
                      {t.typeName}
                    </span>
                    <span className="text-xs font-bold text-emerald-700">
                      {t.priceFormatted}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Tiêu chuẩn dịch vụ */}
          <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-900 block font-bold">Cam kết chất lượng từ CueZone:</strong>
              <p>
                Mọi bàn đặt trước đều được nhân viên làm sạch mặt vải Simonis, chải bụi, đánh bóng bộ bi Aramith và chuẩn bị sẵn khay cơ trước giờ hẹn 10 phút.
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin đặt & Tạm tính tiền */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="!rounded-3xl !border-slate-200 !bg-white p-6 shadow-sm space-y-5">
            <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-0 pb-3 border-b border-slate-100">
              2. Thông Tin Khung Giờ & Liên Hệ
            </Title>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên cơ thủ *</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Đặng Tuấn Anh"
                  prefix={<User className="h-4 w-4 text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại nhận tin giữ bàn *</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912 345 678"
                  prefix={<Phone className="h-4 w-4 text-slate-400 mr-1.5" />}
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày chơi</label>
                  <Select
                    value={date}
                    onChange={(val) => setDate(val)}
                    className="w-full !h-10"
                    options={[
                      { value: "Hôm nay", label: "Hôm nay" },
                      { value: "Ngày mai", label: "Ngày mai" },
                      { value: "Cuối tuần", label: "Cuối tuần" },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <Select
                    value={time}
                    onChange={(val) => setTime(val)}
                    className="w-full !h-10"
                    options={[
                      { value: "10:00", label: "10:00" },
                      { value: "13:00", label: "13:00 (Giờ vàng)" },
                      { value: "14:00", label: "14:00 (Giờ vàng)" },
                      { value: "15:00", label: "15:00 (Giờ vàng)" },
                      { value: "18:00", label: "18:00" },
                      { value: "19:00", label: "19:00" },
                      { value: "20:00", label: "20:00" },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dự kiến số giờ chơi</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setDuration(h)}
                      className={`py-2 rounded-xl text-xs font-bold border transition ${
                        duration === h
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {h} Giờ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú đặc biệt (Tùy chọn)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Yêu cầu gậy cơ riêng, đá chanh, bật điều hòa..."
                  className="!h-10 !rounded-xl !text-xs"
                />
              </div>

              {/* Tóm tắt tiền tạm tính */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Bàn đã chọn:</span>
                  <strong className="text-slate-900">{selectedTable.name} ({selectedTable.typeName})</strong>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Đơn giá giờ:</span>
                  <span>{selectedTable.priceFormatted}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Thời lượng:</span>
                  <span>{duration} tiếng ({time} - {date})</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-sm">
                  <span className="text-slate-900">Chi phí tạm tính:</span>
                  <span className="text-emerald-700 text-base">{totalCost.toLocaleString("vi-VN")} đ</span>
                </div>
              </div>

              <Button
                variant="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                className="w-full !h-12 !text-sm !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white shadow-lg shadow-emerald-600/25 !rounded-xl"
              >
                Xác Nhận Giữ Bàn Ngay
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Modal Đặt Bàn Thành Công */}
      <Modal
        open={showSuccessModal}
        onCancel={() => setShowSuccessModal(false)}
        footer={[
          <Button
            key="ok"
            variant="primary"
            onClick={() => setShowSuccessModal(false)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white font-bold !rounded-xl"
          >
            Đã Hiểu & Đóng
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <span className="text-slate-900 font-bold">Đặt Bàn Thành Công!</span>
          </Space>
        }
      >
        <div className="space-y-4 py-2 text-xs text-slate-700">
          <p className="text-sm">
            Cảm ơn cơ thủ <strong>{name}</strong>! Yêu cầu đặt bàn của bạn đã được chuyển đến quầy lễ tân CueZone.
          </p>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1.5">
            <div>📍 <strong>Bàn:</strong> {selectedTable.name} ({selectedTable.typeName})</div>
            <div>⏰ <strong>Thời gian:</strong> {time} ({date}) - Thời lượng dự kiến: {duration} giờ</div>
            <div>📞 <strong>SĐT xác nhận:</strong> {phone}</div>
            <div>💰 <strong>Chi phí tạm tính:</strong> {totalCost.toLocaleString("vi-VN")} VNĐ (Thanh toán tại quầy)</div>
          </div>
          <p className="text-slate-500">
            CLB sẽ giữ bàn cho bạn tối đa 15 phút. Nếu có thay đổi, vui lòng gọi hotline <strong>1900 6868</strong> để được hỗ trợ.
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerBooking;
