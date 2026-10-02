import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Trophy,
  BookOpen,
  Newspaper,
  Calendar,
  ArrowRight,
  Sparkles,
  Clock,
  Coins,
  CheckCircle2,
  Filter,
  Flame,
  Award,
  HelpCircle,
  ChevronRight,
  Users,
} from "lucide-react";
import {
  Button,
  Card,
  Tag,
  Space,
  Typography,
  Tabs,
  Modal,
} from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

interface TournamentItem {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  format: string;
  fee: string;
  prizePool: string;
  date: string;
  participants: string;
  rulesDetail: string[];
  feeDetail: string;
}

const TOURNAMENTS: TournamentItem[] = [
  {
    id: "tourney_1",
    title: "CueZone Bank Pool Open Championship Q2/2026",
    badge: "GIẢI MỞ RỘNG TOÀN QUỐC",
    badgeColor: "gold",
    format: "Loại trực tiếp (Single Elimination) • Race to 5 (Chạm 5 ván thắng)",
    fee: "200.000 VNĐ / Cơ thủ",
    prizePool: "15.000.000 VNĐ + Cúp Vô Địch",
    date: "15/10/2026 - 18/10/2026 (Khởi tranh lúc 09:00)",
    participants: "32 Cơ thủ (Đã đăng ký: 24/32)",
    feeDetail:
      "Lệ phí tham gia 200.000 VNĐ đã bao gồm tiền bàn thi đấu suốt giải, 01 áo đấu CLB và nước uống miễn phí. Đóng lệ phí tại quầy thu ngân hoặc chuyển khoản qua VNPay QR trước ngày 14/10.",
    rulesDetail: [
      "Áp dụng chuẩn Luật Bank Pool Quốc tế (BCA/WPA Rules).",
      "Luật Gọi Bi & Gọi Lỗ (Call Shot): Bắt buộc chỉ rõ số bi và lỗ mục tiêu trước khi đánh.",
      "Bi mục tiêu bắt buộc phải chạm ít nhất 1 băng trước khi rơi vào lỗ được gọi.",
      "Các bi vào lỗ sai quy cách hoặc vào lỗ mà không chạm băng sẽ được nhặt lại đặt tại điểm Foot Spot.",
      "Mỗi cú đánh có thời gian shot clock 40 giây (có 1 lần xin hội ý 30 giây mỗi ván).",
      "Trang phục: Quần tây tối màu, áo polo có cổ, giày thể thao sạch sẽ.",
    ],
  },
  {
    id: "tourney_2",
    title: "Bank Pool Weekly Challenge - Cuối Tuần Cơ Thủ",
    badge: "GIẢI NỘI BỘ THƯỜNG NIÊN",
    badgeColor: "green",
    format: "Chia bảng vòng tròn & Vòng knock-out • Race to 4",
    fee: "100.000 VNĐ / Cơ thủ",
    prizePool: "5.000.000 VNĐ + Điểm ELO Hội Viên",
    date: "Chủ Nhật hàng tuần (Bắt đầu lúc 14:00)",
    participants: "16 Cơ thủ (Đã đăng ký: 12/16)",
    feeDetail:
      "Lệ phí 100.000 VNĐ / cơ thủ. Thành viên có thẻ VIP Diamond được giảm 50% lệ phí tham gia giải.",
    rulesDetail: [
      "Áp dụng luật Bank Pool chạm 1 băng cơ bản.",
      "Thời gian mỗi trận tối đa 45 phút, không áp dụng shot-clock nghiêm ngặt.",
      "Cơ thủ phạm quy 3 lỗi liên tiếp trong 1 ván sẽ bị xử thua ván đó.",
      "Điểm số được cập nhật trực tiếp vào hệ thống tính hạng ELO của CLB CueZone.",
    ],
  },
];

interface NewsItem {
  id: string;
  category: "all" | "promo" | "tournament" | "tips";
  categoryLabel: string;
  title: string;
  desc: string;
  date: string;
  image: string;
  tagColor: string;
}

const NEWS_LIST: NewsItem[] = [
  {
    id: "news_1",
    category: "promo",
    categoryLabel: "Khuyến Mãi",
    title: "Giờ Vàng Ưu Đãi: Giảm 20% Tiền Giờ Chơi Cho Cơ Thủ",
    desc: "Áp dụng khung giờ 13h00 - 17h00 từ Thứ 2 đến Thứ 6. Tặng thêm 01 nước suối cho khách chơi từ 2 tiếng trở lên.",
    date: "01/10/2026",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80",
    tagColor: "red",
  },
  {
    id: "news_2",
    category: "tournament",
    categoryLabel: "Giải Đấu",
    title: "Công Bố Thể Thức Mới Của Giải Bank Pool Championship Q2",
    desc: "Mở rộng số lượng cơ thủ lên 32 suất, tăng tổng giải thưởng lên 15 triệu đồng cùng hệ thống camera VAR góc lỗ.",
    date: "28/09/2026",
    image: "https://images.unsplash.com/photo-1544698310-74ea9d1c8288?auto=format&fit=crop&w=600&q=80",
    tagColor: "gold",
  },
  {
    id: "news_3",
    category: "tips",
    categoryLabel: "Mẹo & Kỹ Thuật",
    title: "Bí Quyết Canh Điểm Chạm Băng Chính Xác Tuyệt Đối",
    desc: "Phương pháp chia đôi góc băng và kiểm soát lực tay để bi mục tiêu dội băng chuẩn xác vào lỗ góc.",
    date: "25/09/2026",
    image: "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80",
    tagColor: "cyan",
  },
  {
    id: "news_4",
    category: "promo",
    categoryLabel: "Khuyến Mãi",
    title: "Đăng Ký Tài Khoản Mới: Nhận Ngay Voucher Giờ Chơi 50.000đ",
    desc: "Khách hàng đăng ký tài khoản hội viên và xác thực email sẽ được tặng voucher giảm giá áp dụng ngay lần chơi đầu tiên.",
    date: "20/09/2026",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80",
    tagColor: "green",
  },
];

interface CustomerHomeProps {
  initialTab?: string;
}

const CustomerHome = ({ initialTab }: CustomerHomeProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab") || initialTab || "overview";
  const [activeTab, setActiveTab] = useState<string>(urlTab);

  const [selectedTournament, setSelectedTournament] = useState<TournamentItem | null>(null);
  const [newsFilter, setNewsFilter] = useState<"all" | "promo" | "tournament" | "tips">("all");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (searchParams.get("tab")) {
      setActiveTab(searchParams.get("tab")!);
    }
  }, [initialTab, searchParams]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams(key === "overview" ? {} : { tab: key });
  };

  const filteredNews = newsFilter === "all" ? NEWS_LIST : NEWS_LIST.filter((n) => n.category === newsFilter);

  return (
    <div className="space-y-6">
      {/* =========================================================================
          HERO BANNER DÀNH CHO KHÁCH CHƯA ĐĂNG NHẬP (GUEST PORTAL)
          ========================================================================= */}
      <div className="relative rounded-2xl overflow-hidden border border-emerald-950/80 bg-gradient-to-r from-[#06121a] via-[#091823] to-[#040910] p-6 sm:p-8 xl:p-10 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img
            src="/cuezone_billiards_hero.jpg"
            alt="CueZone Billiards"
            className="w-full h-full object-cover object-center opacity-15 filter brightness-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#06121a] via-[#06121a]/90 to-transparent" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <Tag
            color="green"
            className="!inline-flex !items-center !gap-1.5 !rounded-full !border-emerald-500/40 !bg-emerald-500/15 !px-3 !py-0.5 !text-xs !font-bold !text-emerald-300"
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            CỔNG THÔNG TIN CLB & GIẢI ĐẤU BANK POOL
          </Tag>

          <Title level={1} className="!text-3xl sm:!text-4xl !font-extrabold !text-white !leading-tight !mb-0">
            Trải Nghiệm Bida Đỉnh Cao <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400 bg-clip-text text-transparent">
              Chuẩn Quốc Tế Tại CueZone
            </span>
          </Title>

          <Paragraph className="!text-sm !text-slate-300 !leading-relaxed !mb-0">
            Dành cho khách chơi và cơ thủ: Xem trực tiếp luật thi đấu Bank Pool, theo dõi lịch trình giải đấu mở rộng và cập nhật các chương trình ưu đãi mới nhất.
          </Paragraph>

          {/* Quick CTAs theo đúng Use Case của Guest */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="large"
              to="/register"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="!h-11 !px-5 !text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 shadow-lg shadow-emerald-600/30"
            >
              Đăng Ký Hội Viên (Nhận Ưu Đãi 20%)
            </Button>
            <Button
              variant="outline"
              size="large"
              to="/login"
              className="!h-11 !px-5 !text-xs !font-semibold !border-slate-700 !bg-slate-900/80 !text-slate-200 hover:!border-emerald-500 hover:!text-emerald-300"
            >
              Đăng Nhập Tài Khoản
            </Button>
            <Button
              variant="ghost"
              size="large"
              to="/customer/booking"
              rightIcon={<Calendar className="h-4 w-4 text-emerald-400" />}
              className="!h-11 !px-4 !text-xs !text-slate-300 hover:!text-white hover:!bg-slate-800/60"
            >
              Đặt Bàn Nhanh
            </Button>
          </div>
        </div>

        {/* 3 Thẻ thống kê realtime góc phải */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <Flame className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <Text strong className="!text-xs !text-white block">18/20 Bàn Sẵn Sàng</Text>
              <Text className="!text-[11px] !text-emerald-400 font-medium">Bàn Min, Rasson quốc tế</Text>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30">
              <Trophy className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <Text strong className="!text-xs !text-white block">2 Giải Bank Pool Mở</Text>
              <Text className="!text-[11px] !text-amber-400 font-medium">Tổng thưởng 20.000.000đ</Text>
            </div>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 col-span-2 sm:col-span-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 border border-sky-500/30">
              <Clock className="h-5 w-5 text-sky-400" />
            </div>
            <div>
              <Text strong className="!text-xs !text-white block">Mở Cửa 08:00 - 24:00</Text>
              <Text className="!text-[11px] !text-sky-400 font-medium">Giờ vàng giảm 20%</Text>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TABS ĐIỀU HƯỚNG TẬP TRUNG TOÀN BỘ 5 USE CASE CỦA GUEST
          ========================================================================= */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm">
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          className="cuezone-guest-tabs [&_.ant-tabs-nav]:!mb-6 [&_.ant-tabs-tab]:!text-sm [&_.ant-tabs-tab]:!text-slate-400 [&_.ant-tabs-tab-active_.ant-tabs-tab-btn]:!text-emerald-400 [&_.ant-tabs-ink-bar]:!bg-emerald-500 font-medium"
          items={[
            {
              key: "overview",
              label: (
                <Space size={6} align="center">
                  <Sparkles className="h-4 w-4" />
                  <span>Tổng Quan & Khám Phá</span>
                </Space>
              ),
              children: (
                <div className="space-y-6">
                  {/* Khối giới thiệu 3 chuyên mục chính */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card
                      className="!rounded-xl !border-slate-800 !bg-slate-950/80 hover:!border-emerald-500/50 transition-all cursor-pointer"
                      onClick={() => handleTabChange("tournaments")}
                    >
                      <Space align="center" size={10} className="mb-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                          <Trophy className="h-4 w-4 text-amber-400" />
                        </div>
                        <Text strong className="!text-sm !text-white">Giải Đấu & Lệ Phí</Text>
                      </Space>
                      <Text className="!text-xs !text-slate-400 block mb-3">
                        Xem lịch thi đấu, thể lệ chi tiết và mức lệ phí tham gia các giải đấu Bank Pool hàng tuần.
                      </Text>
                      <Text className="!text-xs !text-emerald-400 font-semibold inline-flex items-center gap-1">
                        Xem thông tin giải đấu <ChevronRight className="h-3 w-3" />
                      </Text>
                    </Card>

                    <Card
                      className="!rounded-xl !border-slate-800 !bg-slate-950/80 hover:!border-emerald-500/50 transition-all cursor-pointer"
                      onClick={() => handleTabChange("rules")}
                    >
                      <Space align="center" size={10} className="mb-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-emerald-400" />
                        </div>
                        <Text strong className="!text-sm !text-white">Luật Bank Pool Chuẩn</Text>
                      </Space>
                      <Text className="!text-xs !text-slate-400 block mb-3">
                        Nắm rõ quy tắc bi chạm băng bắt buộc, luật gọi bi - gọi lỗ và các lỗi phạm quy khi thi đấu.
                      </Text>
                      <Text className="!text-xs !text-emerald-400 font-semibold inline-flex items-center gap-1">
                        Đọc luật chi tiết <ChevronRight className="h-3 w-3" />
                      </Text>
                    </Card>

                    <Card
                      className="!rounded-xl !border-slate-800 !bg-slate-950/80 hover:!border-emerald-500/50 transition-all cursor-pointer"
                      onClick={() => handleTabChange("news")}
                    >
                      <Space align="center" size={10} className="mb-2">
                        <div className="h-8 w-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                          <Newspaper className="h-4 w-4 text-sky-400" />
                        </div>
                        <Text strong className="!text-sm !text-white">Tin Tức & Ưu Đãi</Text>
                      </Space>
                      <Text className="!text-xs !text-slate-400 block mb-3">
                        Cập nhật khuyến mãi giờ vàng, voucher thành viên mới và mẹo nâng cao kỹ thuật bida.
                      </Text>
                      <Text className="!text-xs !text-emerald-400 font-semibold inline-flex items-center gap-1">
                        Xem tin tức & ưu đãi <ChevronRight className="h-3 w-3" />
                      </Text>
                    </Card>
                  </div>

                  {/* Thông tin câu lạc bộ & Đặt bàn */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="space-y-1 text-center md:text-left">
                      <Text strong className="!text-sm !text-white block">
                        Bạn muốn chơi thử hoặc tổ chức trận đấu giao hữu?
                      </Text>
                      <Text className="!text-xs !text-slate-400">
                        CueZone phục vụ 20 bàn chuẩn quốc tế tại 123 Nguyễn Thị Minh Khai, Q.3, TP.HCM. Hotline: 1900 6868
                      </Text>
                    </div>
                    <Space size={8}>
                      <Button
                        variant="outline"
                        size="sm"
                        to="/customer/booking"
                        className="!text-xs !border-slate-700 !bg-slate-900 !text-slate-200"
                      >
                        Kiểm Tra Bàn Trống
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        to="/register"
                        className="!text-xs !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                      >
                        Đăng Ký Hội Viên
                      </Button>
                    </Space>
                  </div>
                </div>
              ),
            },
            {
              key: "tournaments",
              label: (
                <Space size={6} align="center">
                  <Trophy className="h-4 w-4 text-amber-400" />
                  <span>Giải Đấu & Lệ Phí (Tournament Info)</span>
                </Space>
              ),
              children: (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <Title level={3} className="!text-lg !font-bold !text-white !mb-0">
                        Thông Tin Các Giải Đấu Bank Pool
                      </Title>
                      <Text className="!text-xs !text-slate-400">
                        Cơ hội cọ xát đỉnh cao cùng các cơ thủ phong trào và chuyên nghiệp
                      </Text>
                    </div>
                    <Tag color="gold" className="!text-xs !px-2.5 !py-1 !font-bold">
                      HỆ THỐNG GIẢI THƯỞNG 2026
                    </Tag>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {TOURNAMENTS.map((tourney) => (
                      <div
                        key={tourney.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col justify-between hover:border-emerald-600/50 transition-all shadow-md"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <Tag
                              color={tourney.badgeColor}
                              className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase"
                            >
                              {tourney.badge}
                            </Tag>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Users className="h-3.5 w-3.5 text-slate-400" />
                              {tourney.participants}
                            </span>
                          </div>

                          <Title level={4} className="!text-base !font-bold !text-white !mb-1">
                            {tourney.title}
                          </Title>

                          <div className="space-y-1.5 text-xs text-slate-300">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span>{tourney.date}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Coins className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                              <span>
                                Lệ phí tham gia: <strong className="text-amber-400">{tourney.fee}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Award className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                              <span>
                                Tổng giải thưởng: <strong className="text-emerald-400">{tourney.prizePool}</strong>
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <CheckCircle2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                              <span>{tourney.format}</span>
                            </div>
                          </div>
                        </div>

                        {/* Nút xem thể lệ & lệ phí chi tiết (Mở Modal theo use case diagram) */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setSelectedTournament(tourney)}
                            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                            className="!text-xs !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                          >
                            Xem Thể Lệ & Lệ Phí Chi Tiết
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            to="/register"
                            className="!text-xs !text-slate-400 hover:!text-emerald-400"
                          >
                            Đăng Ký Tham Gia
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
            {
              key: "rules",
              label: (
                <Space size={6} align="center">
                  <BookOpen className="h-4 w-4 text-emerald-400" />
                  <span>Luật Chơi Bank Pool (Bank Pool Rules)</span>
                </Space>
              ),
              children: (
                <div className="space-y-6">
                  <div className="pb-2 border-b border-slate-800">
                    <Title level={3} className="!text-lg !font-bold !text-white !mb-0">
                      Bộ Quy Tắc Thi Đấu Bank Pool Chuẩn Quốc Tế
                    </Title>
                    <Text className="!text-xs !text-slate-400">
                      Bank Pool là thể loại bida đòi hỏi kỹ thuật dội băng điêu luyện và tư duy chiến thuật cao
                    </Text>
                  </div>

                  {/* 4 Trụ cột luật thi đấu */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-emerald-950/80 bg-slate-950/60 p-4 space-y-2">
                      <Space align="center" size={8}>
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-xs text-emerald-400">
                          1
                        </div>
                        <Text strong className="!text-sm !text-white">
                          Bắt Buộc Chạm Băng (Cushion Requirement)
                        </Text>
                      </Space>
                      <Paragraph className="!text-xs !text-slate-300 !leading-relaxed !mb-0">
                        Bi mục tiêu bắt buộc phải dội vào ít nhất <strong>01 băng</strong> trước khi rơi vào lỗ chỉ định. Bất kỳ cú đánh nào đưa bi thẳng trực tiếp vào lỗ mà không chạm băng đều bị tính là không hợp lệ; bi đó sẽ được nhặt lại đặt lên điểm Foot Spot.
                      </Paragraph>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                      <Space align="center" size={8}>
                        <div className="h-7 w-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center font-bold text-xs text-teal-400">
                          2
                        </div>
                        <Text strong className="!text-sm !text-white">
                          Gọi Bi & Gọi Lỗ (Call Shot)
                        </Text>
                      </Space>
                      <Paragraph className="!text-xs !text-slate-300 !leading-relaxed !mb-0">
                        Trước mỗi cú đánh, cơ thủ phải tuyên bố rõ số bi mục tiêu và miệng lỗ dự định đưa bi vào. Không bắt buộc phải thông báo số băng dội hay các va chạm phụ (carom/kiss). Nếu bi mục tiêu vào đúng lỗ đã gọi sau khi dội băng, cơ thủ được tính 01 điểm và tiếp tục lượt đánh.
                      </Paragraph>
                    </div>

                    <div className="rounded-xl border border-red-950/80 bg-slate-950/60 p-4 space-y-2">
                      <Space align="center" size={8}>
                        <div className="h-7 w-7 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold text-xs text-red-400">
                          3
                        </div>
                        <Text strong className="!text-sm !text-white">
                          Các Lỗi Phạm Quy (Fouls & Penalties)
                        </Text>
                      </Space>
                      <Paragraph className="!text-xs !text-slate-300 !leading-relaxed !mb-0">
                        Phạm quy xảy ra khi: Bi cái vào lỗ (scratch), bi cái không chạm bi mục tiêu, bi văng khỏi bàn, hoặc cơ thủ chạm tay/quần áo vào bi. Khi phạm lỗi, cơ thủ bị phạt 01 bi (phải nhặt 1 bi đã ghi điểm trước đó đặt lại bàn). Đối thủ được hưởng bi cái trong tay (Ball in hand).
                      </Paragraph>
                    </div>

                    <div className="rounded-xl border border-amber-950/80 bg-slate-950/60 p-4 space-y-2">
                      <Space align="center" size={8}>
                        <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-xs text-amber-400">
                          4
                        </div>
                        <Text strong className="!text-sm !text-white">
                          Điều Kiện Chiến Thắng (Victory Condition)
                        </Text>
                      </Space>
                      <Paragraph className="!text-xs !text-slate-300 !leading-relaxed !mb-0">
                        Trong ván thi đấu chuẩn 9 bi hoặc 15 bi, cơ thủ đầu tiên đưa hợp lệ <strong>5 bi mục tiêu</strong> vào lỗ (hoặc 8 bi trong thể thức 15 bi) sẽ là người chiến thắng ván đấu (Chạm 5).
                      </Paragraph>
                    </div>
                  </div>

                  {/* Sơ đồ quy ước minh họa */}
                  <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex items-start gap-3">
                    <HelpCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <Text strong className="!text-xs !text-slate-200 block">
                        Lưu ý dành cho cơ thủ mới làm quen:
                      </Text>
                      <Text className="!text-xs !text-slate-400">
                        Cú đánh dội băng trực tiếp (Cross Bank) hoặc dội 2 băng (Double Bank) đều được tính điểm như nhau nếu bi vào đúng lỗ đã gọi. Trọng tài CueZone sẽ giám sát và hỗ trợ bắt lỗi chính xác trong các trận đấu giải.
                      </Text>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "news",
              label: (
                <Space size={6} align="center">
                  <Newspaper className="h-4 w-4 text-sky-400" />
                  <span>Tin Tức & Ưu Đãi (News & Promotions)</span>
                </Space>
              ),
              children: (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
                    <div>
                      <Title level={3} className="!text-lg !font-bold !text-white !mb-0">
                        Tin Tức & Chương Trình Khuyến Mãi
                      </Title>
                      <Text className="!text-xs !text-slate-400">
                        Cập nhật các sự kiện bida, giải đấu và ưu đãi đặc quyền cho khách hàng
                      </Text>
                    </div>

                    {/* Bộ lọc theo danh mục (Filter by Category) */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                        <Filter className="h-3.5 w-3.5" /> Lọc:
                      </span>
                      {[
                        { key: "all", label: "Tất cả" },
                        { key: "promo", label: "Khuyến mãi" },
                        { key: "tournament", label: "Giải đấu" },
                        { key: "tips", label: "Mẹo bida" },
                      ].map((cat) => (
                        <Button
                          key={cat.key}
                          variant={newsFilter === cat.key ? "primary" : "outline"}
                          size="sm"
                          onClick={() => setNewsFilter(cat.key as any)}
                          className={`!text-xs !h-7 !px-2.5 !rounded-lg ${
                            newsFilter === cat.key
                              ? "!bg-emerald-600 !border-emerald-600 !text-white font-bold"
                              : "!border-slate-800 !bg-slate-900 !text-slate-400 hover:!text-white"
                          }`}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Danh sách tin tức */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredNews.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex flex-col justify-between hover:border-emerald-600/50 transition-all shadow-md group"
                      >
                        <div>
                          <div className="h-36 w-full overflow-hidden relative">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute top-2 left-2">
                              <Tag
                                color={item.tagColor}
                                className="!text-[10px] !font-bold !px-2 !py-0.5 !rounded-md uppercase backdrop-blur-md"
                              >
                                {item.categoryLabel}
                              </Tag>
                            </div>
                          </div>

                          <div className="p-3.5 space-y-1.5">
                            <span className="text-[10px] text-slate-500 font-mono block">
                              {item.date}
                            </span>
                            <Title level={4} className="!text-xs !font-bold !text-white !line-clamp-2 !mb-1 group-hover:!text-emerald-400 transition-colors">
                              {item.title}
                            </Title>
                            <Paragraph className="!text-[11px] !text-slate-400 !line-clamp-3 !leading-relaxed !mb-0">
                              {item.desc}
                            </Paragraph>
                          </div>
                        </div>

                        <div className="p-3.5 pt-0 border-t border-slate-900 mt-2">
                          <Button
                            variant="link"
                            size="sm"
                            to="/register"
                            rightIcon={<ChevronRight className="h-3 w-3" />}
                            className="!p-0 !h-auto !text-xs !font-semibold !text-emerald-400 hover:!text-emerald-300"
                          >
                            Xem chi tiết & nhận quà
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* =========================================================================
          MODAL CHI TIẾT THỂ LỆ & LỆ PHÍ THI ĐẤU (VIEW RULES & FEE DETAILS)
          ========================================================================= */}
      <Modal
        open={Boolean(selectedTournament)}
        onCancel={() => setSelectedTournament(null)}
        footer={[
          <Button
            key="close"
            variant="outline"
            onClick={() => setSelectedTournament(null)}
            className="!text-xs"
          >
            Đóng
          </Button>,
          <Button
            key="register"
            variant="primary"
            to="/register"
            onClick={() => setSelectedTournament(null)}
            className="!text-xs !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-bold"
          >
            Đăng Ký Tài Khoản Tham Gia Giải
          </Button>,
        ]}
        title={
          <Space align="center" size={8}>
            <Trophy className="h-4 w-4 text-amber-400" />
            <span className="text-white text-sm font-bold">
              {selectedTournament?.title}
            </span>
          </Space>
        }
        className="[&_.ant-modal-content]:!bg-slate-900 [&_.ant-modal-content]:!border [&_.ant-modal-content]:!border-slate-800"
      >
        {selectedTournament && (
          <div className="space-y-4 py-2 text-xs text-slate-200">
            {/* Lệ phí & Quyền lợi */}
            <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
              <Space align="center" size={6} className="mb-1">
                <Coins className="h-4 w-4 text-amber-400" />
                <Text strong className="!text-xs !text-amber-300">
                  Quy Định Lệ Phí Tham Gia ({selectedTournament.fee})
                </Text>
              </Space>
              <Paragraph className="!text-xs !text-slate-300 !mb-0 !leading-relaxed">
                {selectedTournament.feeDetail}
              </Paragraph>
            </div>

            {/* Thể lệ thi đấu chi tiết */}
            <div>
              <Text strong className="!text-xs !text-white block mb-2">
                Thể Lệ Thi Đấu Chính Thức:
              </Text>
              <ul className="space-y-2 pl-1">
                {selectedTournament.rulesDetail.map((rule, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-300">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Thời gian & Địa điểm */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Địa điểm thi đấu:</span>
                <strong className="text-slate-200">CLB CueZone, 123 Nguyễn Thị Minh Khai, Q.3, TP.HCM</strong>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Tổng giải thưởng:</span>
                <strong className="text-emerald-400 font-bold">{selectedTournament.prizePool}</strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default CustomerHome;
