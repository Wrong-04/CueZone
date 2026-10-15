import { Link } from "react-router-dom";
import {
  TrophyOutlined,
  ReadOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
  FireOutlined,
  CrownOutlined,
  TeamOutlined,
  RightOutlined,
  StarFilled,
  CoffeeOutlined,
  VideoCameraOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Tag,
  Typography,
} from "../../shared/ui";
import { useAuth } from "../../contexts/AuthContext";

const { Title, Text, Paragraph } = Typography;

// Mock 20 bàn bida realtime cho khách theo dõi
const REALTIME_TABLES = [
  { id: "TB-01", name: "Bàn 01", type: "Standard 9FT", status: "playing", time: "45p", price: "50.000đ/h", brand: "Min Table" },
  { id: "TB-02", name: "Bàn 02", type: "Standard 9FT", status: "available", price: "50.000đ/h", brand: "Min Table" },
  { id: "TB-03", name: "Bàn 03", type: "Standard 9FT", status: "available", price: "50.000đ/h", brand: "Min Table" },
  { id: "TB-04", name: "Bàn 04", type: "Standard 9FT", status: "playing", time: "1h 15p", price: "50.000đ/h", brand: "Min Table" },
  { id: "TB-05", name: "Bàn 05", type: "Standard 9FT", status: "available", price: "50.000đ/h", brand: "Aileex Crown" },
  { id: "TB-06", name: "Bàn 06", type: "Standard 9FT", status: "available", price: "50.000đ/h", brand: "Aileex Crown" },
  { id: "TB-07", name: "Bàn 07", type: "Standard 9FT", status: "playing", time: "20p", price: "50.000đ/h", brand: "Aileex Crown" },
  { id: "TB-08", name: "Bàn 08", type: "Standard 9FT", status: "available", price: "50.000đ/h", brand: "Aileex Crown" },
  { id: "TB-09", name: "Bàn 09", type: "VIP Lounge", status: "available", price: "70.000đ/h", brand: "Rasson Ox" },
  { id: "TB-10", name: "Bàn 10", type: "VIP Lounge", status: "available", price: "70.000đ/h", brand: "Rasson Ox" },
  { id: "TB-11", name: "Bàn 11", type: "VIP Lounge", status: "playing", time: "30p", price: "70.000đ/h", brand: "Rasson Ox" },
  { id: "TB-12", name: "Bàn 12", type: "VIP Lounge", status: "available", price: "70.000đ/h", brand: "Rasson Ox" },
  { id: "TB-13", name: "Bàn 13", type: "Match Arena", status: "available", price: "80.000đ/h", brand: "K-Steel Pro (VAR)" },
  { id: "TB-14", name: "Bàn 14", type: "Match Arena", status: "available", price: "80.000đ/h", brand: "K-Steel Pro (VAR)" },
];

const PROMOTIONS = [
  {
    id: "p1",
    tag: "GIỜ VÀNG",
    tagColor: "red",
    title: "Giảm 20% Tiền Bàn Khung Giờ 13:00 - 17:00",
    desc: "Áp dụng từ Thứ 2 đến Thứ 6 hàng tuần cho tất cả các loại bàn bida tại CLB.",
    valid: "Áp dụng đến 31/12/2026",
  },
  {
    id: "p2",
    tag: "HỘI VIÊN MỚI",
    tagColor: "green",
    title: "Tặng Voucher 50.000đ & 01 Phần Nước Ép",
    desc: "Dành riêng cho khách hàng đăng ký tài khoản hội viên CueZone lần đầu tiên.",
    valid: "Nhận ngay khi đăng ký",
  },
  {
    id: "p3",
    tag: "COMBO NHÓM",
    tagColor: "gold",
    title: "Combo Cơ Thủ: 3 Giờ Chơi + 4 Đồ Uống + Snack",
    desc: "Tiết kiệm 25% chi phí cho các buổi giao lưu cơ thủ từ 4 người trở lên.",
    valid: "Áp dụng cả tuần",
  },
];

const CLUB_AMENITIES = [
  { icon: <SafetyCertificateOutlined className="text-xl text-emerald-600" />, title: "Bàn Thi Đấu Tiêu Chuẩn", desc: "Vải Simonis 860 chính hãng, băng cao su Artemis và bi Aramith Pro TV Cup." },
  { icon: <VideoCameraOutlined className="text-xl text-emerald-600" />, title: "Camera VAR Góc Lỗ", desc: "Hệ thống quay chậm hỗ trợ trọng tài xác định bi chạm băng trong các trận thi đấu giải." },
  { icon: <CoffeeOutlined className="text-xl text-emerald-600" />, title: "Menu F&B Phục Vụ Tại Bàn", desc: "Cà phê pha máy, nước ép nguyên chất, thức ăn nóng phục vụ liên tục." },
  { icon: <TeamOutlined className="text-xl text-emerald-600" />, title: "Trọng Tài & Huấn Luyện Viên", desc: "Hỗ trợ xếp bi, bấm giờ và hướng dẫn kỹ thuật dội băng cho người mới." },
];

const CustomerHome = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-12">
      {/* =========================================================================
          1. HERO SECTION SÁNG SỦA, SANG TRỌNG (LUXURY BILLIARDS LOUNGE)
          ========================================================================= */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-white via-[#f0fdf4] to-[#ecfdf5] border border-emerald-100 shadow-xs p-8 sm:p-12 xl:p-16">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-teal-300/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/60 text-emerald-800 text-xs font-bold tracking-wide shadow-2xs">
            <ThunderboltOutlined className="text-emerald-600" />
            <span>HỆ THỐNG CLB BIDA & GIẢI ĐẤU BANK POOL ĐẲNG CẤP</span>
          </div>

          <Title level={1} className="!text-3xl sm:!text-5xl !font-black !text-slate-900 !leading-tight !tracking-tight !mb-0">
            Trải Nghiệm Cơ Thủ Chuẩn Mực <br />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 bg-clip-text text-transparent">
              Không Gian Thể Thao Đẳng Cấp
            </span>
          </Title>

          <Paragraph className="!text-base !text-slate-600 !leading-relaxed !max-w-2xl !mb-0">
            CueZone mang đến 20 bàn bida thi đấu quốc tế (Min, Rasson, K-Steel), hệ thống giải đấu Bank Pool hàng tuần có trọng tài chuyên nghiệp, và công nghệ đặt bàn realtime không cần cọc.
          </Paragraph>

          {/* Social Proof */}
          <div className="flex items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-0.5 text-amber-400">
              <StarFilled />
              <StarFilled />
              <StarFilled />
              <StarFilled />
              <StarFilled />
            </div>
            <span className="font-bold text-slate-700">4.9/5.0</span>
            <span>• Được hơn 1,200+ cơ thủ phong trào & chuyên nghiệp tin chọn</span>
          </div>

          {/* Action Buttons (Adaptive for Member vs Guest) */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Button
              variant="primary"
              size="large"
              to="/customer/booking"
              rightIcon={<CalendarOutlined />}
              className="!h-12 !px-6 !text-sm !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white shadow-lg shadow-emerald-600/25 !rounded-xl"
            >
              Đặt Bàn Trực Tuyến Ngay
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="large"
                to="/customer/fnb"
                rightIcon={<CoffeeOutlined className="text-emerald-600" />}
                className="!h-12 !px-6 !text-sm !font-bold !border-emerald-600/40 !bg-white hover:!bg-emerald-50 !text-emerald-800 !rounded-xl shadow-xs"
              >
                Gọi Món F&B Tại Bàn
              </Button>
            ) : (
              <Button
                variant="outline"
                size="large"
                to="/register"
                rightIcon={<ArrowRightOutlined className="text-emerald-600" />}
                className="!h-12 !px-6 !text-sm !font-bold !border-emerald-600/40 !bg-white hover:!bg-emerald-50 !text-emerald-800 !rounded-xl shadow-xs"
              >
                Đăng Ký Hội Viên (Nhận Ưu Đãi 20%)
              </Button>
            )}
          </div>
        </div>

        {/* 4 Thống kê nổi bật bên dưới Hero */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10 pt-8 border-t border-emerald-200/60 relative z-10">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold mb-1">
              <FireOutlined /> 20 BÀN THI ĐẤU
            </div>
            <div className="text-2xl font-black text-slate-900">18 Sẵn Sàng</div>
            <div className="text-xs text-slate-500 mt-0.5">Vải Simonis 860 chính hãng</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-amber-600 text-xs font-bold mb-1">
              <TrophyOutlined /> GIẢI BANK POOL
            </div>
            <div className="text-2xl font-black text-slate-900">15.000.000đ</div>
            <div className="text-xs text-slate-500 mt-0.5">Tổng thưởng giải Q2 mở rộng</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-blue-600 text-xs font-bold mb-1">
              <ClockCircleOutlined /> GIỜ VÀNG ƯU ĐÃI
            </div>
            <div className="text-2xl font-black text-slate-900">Giảm 20%</div>
            <div className="text-xs text-slate-500 mt-0.5">Khung giờ 13:00 - 17:00</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-1">
              <CrownOutlined /> ĐẶC QUYỀN VIP
            </div>
            <div className="text-2xl font-black text-slate-900">Tích Điểm 10%</div>
            <div className="text-xs text-slate-500 mt-0.5">Đổi giờ chơi & voucher F&B</div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. SƠ ĐỒ & BẢNG TRẠNG THÁI 20 BÀN REALTIME (LIVE TABLE MAP)
          ========================================================================= */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md mb-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              THỜI GIAN THỰC (REALTIME)
            </div>
            <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
              Tình Trạng Bàn Đang Hoạt Động
            </Title>
            <Text className="!text-xs !text-slate-500">
              Kiểm tra nhanh bàn trống, loại bàn và giá giờ để chọn vị trí chơi ưng ý nhất
            </Text>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              <span className="text-slate-700">Trống (Sẵn sàng)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              <span className="text-slate-700">Đang chơi</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              to="/customer/booking"
              rightIcon={<RightOutlined className="text-xs" />}
              className="!text-xs !font-bold !border-slate-300"
            >
              Vào Trang Đặt Bàn
            </Button>
          </div>
        </div>

        {/* Lưới hiển thị các bàn */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {REALTIME_TABLES.map((table) => {
            const isAvail = table.status === "available";
            return (
              <div
                key={table.id}
                className={`p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  isAvail
                    ? "bg-white border-slate-200/90 hover:border-emerald-500 hover:shadow-md cursor-pointer group"
                    : "bg-slate-50 border-slate-200/60 opacity-85"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-black text-sm text-slate-800 group-hover:text-emerald-700 transition-colors">
                      {table.name}
                    </span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isAvail ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-rose-500"
                      }`}
                    />
                  </div>

                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 block w-fit mb-1.5">
                    {table.type}
                  </span>

                  <div className="text-[11px] text-slate-500 font-medium">
                    {table.brand}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700">
                    {table.price}
                  </span>
                  {isAvail ? (
                    <Link
                      to={`/customer/booking?table=${table.id}`}
                      className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
                    >
                      Đặt ngay
                    </Link>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {table.time}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          3. FEATURED TOURNAMENT (GIẢI ĐẤU NỔI BẬT NHẤT)
          ========================================================================= */}
      <section className="rounded-3xl bg-slate-900 text-white p-8 sm:p-10 relative overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 pointer-events-none">
          <img
            src="/cuezone_billiards_hero.jpg"
            alt="Tournament"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Tag color="gold" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
              GIẢI ĐẤU NỔI BẬT Q2/2026
            </Tag>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
              <ClockCircleOutlined /> Khởi tranh ngày 15/10/2026
            </span>
          </div>

          <Title level={2} className="!text-2xl sm:!text-4xl !font-black !text-white !mb-1 leading-tight">
            CueZone Bank Pool Open Championship
          </Title>

          <Paragraph className="!text-sm !text-slate-300 !leading-relaxed !mb-0">
            Giải đấu Bank Pool quy tụ 32 cơ thủ hàng đầu khu vực miền Nam. Tổng giá trị giải thưởng lên đến 15.000.000 VNĐ cùng Cúp Vô Địch và cộng 250 điểm ELO vào hệ thống hội viên CueZone.
          </Paragraph>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-2">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Lệ phí thi đấu</div>
              <div className="text-lg font-black text-amber-300">200.000 VNĐ</div>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Giải nhất</div>
              <div className="text-lg font-black text-emerald-400">8.000.000 VNĐ + Cúp</div>
            </div>
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md col-span-2 sm:col-span-1">
              <div className="text-[11px] text-slate-400 uppercase font-bold">Quy mô giải</div>
              <div className="text-lg font-black text-white">32 Cơ Thủ (Còn 8 suất)</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="large"
              to="/customer/tournaments"
              rightIcon={<ArrowRightOutlined />}
              className="!h-11 !px-5 !text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 shadow-md"
            >
              Xem Thể Lệ & Lệ Phí Chi Tiết
            </Button>
            {user ? (
              <Button
                variant="outline"
                size="large"
                to="/customer/tournaments"
                className="!h-11 !px-5 !text-xs !font-bold !border-slate-700 !bg-slate-800/80 !text-slate-200 hover:!border-emerald-500 hover:!text-white"
              >
                Đăng Ký Tham Gia Ngay
              </Button>
            ) : (
              <Button
                variant="outline"
                size="large"
                to="/register"
                className="!h-11 !px-5 !text-xs !font-bold !border-slate-700 !bg-slate-800/80 !text-slate-200 hover:!border-emerald-500 hover:!text-white"
              >
                Đăng Ký Tài Khoản Thi Đấu
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. KHÁM PHÁ BỘ LUẬT BANK POOL (CUSHION REQUIREMENT SHOWCASE)
          ========================================================================= */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md">
            <ReadOutlined className="text-emerald-600" />
            CẨM NANG THỂ THAO
          </div>
          <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
            Luật Thi Đấu Bank Pool Chuẩn Quốc Tế
          </Title>
          <Text className="!text-xs !text-slate-500 block">
            Nắm vững 4 quy tắc cơ bản trước khi bước vào bàn thi đấu tại CLB CueZone
          </Text>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 font-black text-sm flex items-center justify-center mb-3">
              01
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Chạm Băng Bắt Buộc
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Bi mục tiêu bắt buộc phải dội ít nhất <strong>01 băng</strong> trước khi vào lỗ. Đánh bi thẳng trực tiếp vào lỗ không được tính điểm.
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-teal-50 text-teal-700 font-black text-sm flex items-center justify-center mb-3">
              02
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Gọi Bi & Gọi Lỗ
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Trước cú đánh, cơ thủ phải tuyên bố rõ số bi mục tiêu và miệng lỗ định đưa bi vào. Không bắt buộc chỉ định số lần dội băng.
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-rose-50 text-rose-700 font-black text-sm flex items-center justify-center mb-3">
              03
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Lỗi & Phạt Bi
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Khi phạm quy (bi cái vào lỗ, bi văng khỏi bàn), cơ thủ bị trừ 01 bi điểm số đã ăn. Đối thủ nhận quyền bi trong tay (Ball in hand).
            </Paragraph>
          </Card>

          <Card className="!rounded-2xl !border-slate-200 !bg-white hover:!border-emerald-500/60 hover:!shadow-md transition-all">
            <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 font-black text-sm flex items-center justify-center mb-3">
              04
            </div>
            <Title level={4} className="!text-sm !font-bold !text-slate-900 !mb-1.5">
              Chạm 5 Ván Thắng
            </Title>
            <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
              Cơ thủ đầu tiên đưa thành công 5 bi mục tiêu hợp lệ vào lỗ sẽ chiến thắng ván đấu (Thể thức chuẩn Race to 5).
            </Paragraph>
          </Card>
        </div>

        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="large"
            to="/customer/rules"
            rightIcon={<ArrowRightOutlined />}
            className="!h-11 !px-6 !text-xs !font-bold !border-slate-300 hover:!border-emerald-600 hover:!text-emerald-700 !rounded-xl"
          >
            Đọc Toàn Bộ Cẩm Nang & Tình Huống Luật Bank Pool
          </Button>
        </div>
      </section>

      {/* =========================================================================
          5. KHUYẾN MÃI & ƯU ĐÃI NỔI BẬT
          ========================================================================= */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md mb-1.5">
              ƯU ĐÃI ĐỘC QUYỀN
            </div>
            <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
              Chương Trình Khuyến Mãi Hàng Tuần
            </Title>
            <Text className="!text-xs !text-slate-500">
              Tiết kiệm chi phí với giờ vàng giảm giá và ưu đãi thành viên mới
            </Text>
          </div>

          <Button
            variant="outline"
            size="sm"
            to="/customer/news"
            rightIcon={<RightOutlined className="text-xs" />}
            className="!text-xs !font-bold !border-slate-300"
          >
            Xem Tất Cả Tin Tức & Khuyến Mãi
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PROMOTIONS.map((promo) => (
            <Card
              key={promo.id}
              className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-lg transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <Tag color={promo.tagColor} className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase">
                  {promo.tag}
                </Tag>
                <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-1 leading-snug">
                  {promo.title}
                </Title>
                <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
                  {promo.desc}
                </Paragraph>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  {promo.valid}
                </span>
                <Link
                  to={user ? "/customer/booking" : "/register"}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1"
                >
                  Nhận ưu đãi <RightOutlined className="text-[10px]" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* =========================================================================
          6. TIỆN ÍCH & DỊCH VỤ CLB CUEZONE
          ========================================================================= */}
      <section className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-12 shadow-xs space-y-6">
        <div className="text-center max-w-lg mx-auto space-y-1.5">
          <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0">
            Tiện Ích Chuẩn Thi Đấu Tại CueZone
          </Title>
          <Text className="!text-xs !text-slate-500">
            Cam kết chất lượng phục vụ tốt nhất để mọi cơ thủ thỏa sức tỏa sáng trên từng đường cơ
          </Text>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
          {CLUB_AMENITIES.map((am, i) => (
            <div key={i} className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="h-10 w-10 rounded-xl bg-emerald-100/70 flex items-center justify-center">
                {am.icon}
              </div>
              <Text strong className="!text-sm !text-slate-900 block">
                {am.title}
              </Text>
              <Text className="!text-xs !text-slate-500 leading-relaxed block">
                {am.desc}
              </Text>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================================
          7. CTA CUỐI TRANG: ĐĂNG KÝ HỘI VIÊN & ĐẶT BÀN
          ========================================================================= */}
      <section className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-10 text-center space-y-4 shadow-xl shadow-emerald-700/20">
        <Title level={2} className="!text-2xl sm:!text-3xl !font-black !text-white !mb-0">
          Sẵn Sàng Cho Trận Đấu Bida Đỉnh Cao?
        </Title>
        <Paragraph className="!text-xs sm:!text-sm !text-emerald-100 !max-w-xl !mx-auto !leading-relaxed !mb-0">
          Đăng ký tài khoản hội viên CueZone miễn phí ngay hôm nay để nhận voucher giảm 20%, tích điểm sau mỗi giờ chơi và cập nhật thứ hạng ELO cơ thủ.
        </Paragraph>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="large"
            to="/customer/booking"
            className="!h-11 !px-6 !text-xs !font-bold !bg-white !text-emerald-800 !border-white hover:!bg-emerald-50 !rounded-xl shadow-xs"
          >
            Đặt Bàn Ngay
          </Button>
          {user ? (
            <Button
              variant="outline"
              size="large"
              to="/customer/fnb"
              className="!h-11 !px-6 !text-xs !font-bold !border-emerald-300/60 !bg-emerald-800/40 !text-white hover:!bg-emerald-800/60 !rounded-xl"
            >
              Gọi Món F&B Tại Bàn
            </Button>
          ) : (
            <Button
              variant="outline"
              size="large"
              to="/register"
              className="!h-11 !px-6 !text-xs !font-bold !border-emerald-300/60 !bg-emerald-800/40 !text-white hover:!bg-emerald-800/60 !rounded-xl"
            >
              Đăng Ký Thẻ Hội Viên
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
