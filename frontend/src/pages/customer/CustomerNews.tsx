import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Newspaper,
  Calendar,
  Filter,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  Button,
  Card,
  Tag,
  Typography,
} from "../../shared/ui";

const { Title, Text, Paragraph } = Typography;

interface NewsArticle {
  id: string;
  category: "all" | "promo" | "tournament" | "tips" | "event";
  categoryLabel: string;
  tagColor: string;
  title: string;
  desc: string;
  date: string;
  author: string;
  image: string;
  featured?: boolean;
}

const ARTICLES: NewsArticle[] = [
  {
    id: "art-1",
    category: "promo",
    categoryLabel: "Khuyến Mãi",
    tagColor: "red",
    featured: true,
    title: "Chương Trình Giờ Vàng: Giảm 20% Tiền Bàn Từ 13:00 Đến 17:00 Hàng Ngày",
    desc: "Thỏa sức luyện cơ với mức giá giờ chơi chỉ từ 40.000đ/giờ tại toàn bộ hệ thống 20 bàn thi đấu CueZone. Tặng kèm 01 phần nước ngọt hoặc nước suối cho nhóm từ 3 người.",
    date: "01/10/2026",
    author: "Ban Quản Lý CueZone",
    image: "/news/news-promo-goldhour.jpg",
  },
  {
    id: "art-2",
    category: "tournament",
    categoryLabel: "Giải Đấu",
    tagColor: "gold",
    title: "Chính Thức Mở Đăng Ký Giải Bank Pool Championship Q2 Với Tổng Thưởng 15 Triệu",
    desc: "Cơ hội cọ xát với các cơ thủ hàng đầu miền Nam. Giải đấu giới hạn 32 suất cơ thủ, diễn ra từ ngày 15/10 đến 18/10/2026 tại sảnh thi đấu trung tâm.",
    date: "28/09/2026",
    author: "Tổ Trọng Tài CueZone",
    image: "/news/news-bankpool-tourney.jpg",
  },
  {
    id: "art-3",
    category: "tips",
    categoryLabel: "Mẹo & Kỹ Thuật",
    tagColor: "cyan",
    title: "Bí Quyết Canh Điểm Chạm Băng Chính Xác (Hệ Thống Góc Dội Đối Xứng)",
    desc: "Hướng dẫn chi tiết phương pháp chia đôi góc băng và ước lượng độ biến dạng của băng cao su Artemis khi đánh lực vừa và lực mạnh.",
    date: "25/09/2026",
    author: "HLV Quốc Gia Tuấn Anh",
    image: "/news/news-cue-technique.jpg",
  },
  {
    id: "art-4",
    category: "promo",
    categoryLabel: "Khuyến Mãi",
    tagColor: "green",
    title: "Đăng Ký Hội Viên Mới: Tặng Ngay Voucher Giờ Chơi 50.000đ Trực Tiếp Vào Tài Khoản",
    desc: "Chương trình chào đón thành viên mới gia nhập cộng đồng cơ thủ CueZone. Đăng ký tài khoản miễn phí và nhận voucher áp dụng ngay cho buổi chơi đầu tiên.",
    date: "20/09/2026",
    author: "Phòng Chăm Sóc Khách Hàng",
    image: "/news/news-club-hero.jpg",
  },
  {
    id: "art-5",
    category: "event",
    categoryLabel: "Sự Kiện",
    tagColor: "purple",
    title: "Buổi Giao Lưu & Thử Cơ Bida Custom Cùng Cơ Thủ Hàng Đầu Việt Nam",
    desc: "Trải nghiệm các dòng gậy cơ cao cấp Predator, Mezz và Predator Revo shaft hoàn toàn miễn phí tại không gian VIP Lounge CueZone.",
    date: "15/09/2026",
    author: "Ban Tổ Chức Sự Kiện",
    image: "/news/news-cue-technique.jpg",
  },
  {
    id: "art-6",
    category: "tips",
    categoryLabel: "Mẹo & Kỹ Thuật",
    tagColor: "cyan",
    title: "Cách Kiểm Soát Lực Và Ephe Trong Cú Đánh Bank Dội 2 Băng Ngang",
    desc: "Phân tích độ văng của bi Aramith Pro TV Cup và cách đặt mũi cơ tiếp xúc bi cái để bi mục tiêu đi đúng quỹ đạo dự kiến.",
    date: "10/09/2026",
    author: "HLV Tuấn Anh",
    image: "/news/news-bankpool-tourney.jpg",
  },
];

const CustomerNews = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredArticles =
    selectedCategory === "all"
      ? ARTICLES
      : ARTICLES.filter((a) => a.category === selectedCategory);

  const featuredArticle = ARTICLES.find((a) => a.featured);

  return (
    <div className="space-y-10">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-200/90 p-8 sm:p-10 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <Newspaper className="h-4 w-4 text-emerald-600" />
          TẠP CHÍ & BẢN TIN CƠ THỦ CUEZONE
        </div>
        <Title level={1} className="!text-3xl sm:!text-4xl !font-black !text-slate-900 !mb-0">
          Tin Tức, Ưu Đãi & Cẩm Nang Bida
        </Title>
        <Paragraph className="!text-sm !text-slate-600 !leading-relaxed !max-w-2xl !mb-0">
          Cập nhật liên tục các ưu đãi giờ vàng, lịch trình giải đấu mở rộng và các bài viết kỹ thuật chia sẻ từ các huấn luyện viên bida giàu kinh nghiệm.
        </Paragraph>
      </div>

      {/* Featured Big Banner */}
      {featuredArticle && selectedCategory === "all" && (
        <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 group">
          <div className="lg:col-span-7 h-72 lg:h-96 overflow-hidden relative">
            <img
              src={featuredArticle.image}
              alt={featuredArticle.title}
              onError={(e) => {
                e.currentTarget.src = "/news/news-club-hero.jpg";
              }}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute top-4 left-4">
              <Tag color="red" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
                TIN TIÊU ĐIỂM
              </Tag>
            </div>
          </div>

          <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>{featuredArticle.date}</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">{featuredArticle.author}</span>
              </div>

              <Title level={2} className="!text-xl sm:!text-2xl !font-bold !text-slate-900 !mb-0 leading-snug">
                {featuredArticle.title}
              </Title>

              <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !mb-0">
                {featuredArticle.desc}
              </Paragraph>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="primary"
                size="sm"
                to="/customer/booking"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                className="!text-xs !font-bold !bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 text-white !rounded-xl"
              >
                Đặt Bàn Nhận Ưu Đãi
              </Button>
              <Button
                variant="outline"
                size="sm"
                to="/register"
                className="!text-xs !font-bold !border-slate-300 !rounded-xl"
              >
                Đăng Ký Hội Viên
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Category Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5 mr-1">
            <Filter className="h-4 w-4 text-slate-400" /> Danh mục:
          </span>
          {[
            { key: "all", label: "Tất Cả Bài Viết" },
            { key: "promo", label: "Khuyến Mãi & Giờ Vàng" },
            { key: "tournament", label: "Giải Đấu Bank Pool" },
            { key: "tips", label: "Kỹ Thuật Cơ Thủ" },
            { key: "event", label: "Sự Kiện CLB" },
          ].map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? "primary" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
              className={`!text-xs !h-8 !px-3.5 !rounded-xl transition-all ${
                selectedCategory === cat.key
                  ? "!bg-emerald-600 !border-emerald-600 text-white font-bold shadow-xs"
                  : "!border-slate-200 !bg-white !text-slate-600 hover:!border-slate-300"
              }`}
            >
              {cat.label}
            </Button>
          ))}
        </div>

        <Text className="!text-xs !text-slate-400">
          Hiển thị {filteredArticles.length} bài viết
        </Text>
      </div>

      {/* Grid bài viết */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredArticles.map((art) => (
          <Card
            key={art.id}
            className="!rounded-2xl !border-slate-200 !bg-white hover:!shadow-lg transition-all overflow-hidden flex flex-col justify-between group p-0"
          >
            <div>
              <div className="h-48 w-full overflow-hidden relative">
                <img
                  src={art.image}
                  alt={art.title}
                  onError={(e) => {
                    e.currentTarget.src = "/news/news-club-hero.jpg";
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Tag color={art.tagColor} className="!text-[10px] !font-bold !px-2.5 !py-0.5 !rounded-md uppercase backdrop-blur-md">
                    {art.categoryLabel}
                  </Tag>
                </div>
              </div>

              <div className="p-5 space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>{art.date}</span>
                  <span>•</span>
                  <span>{art.author}</span>
                </div>

                <Title level={3} className="!text-base !font-bold !text-slate-900 !mb-1 leading-snug group-hover:!text-emerald-700 transition-colors">
                  {art.title}
                </Title>

                <Paragraph className="!text-xs !text-slate-600 !leading-relaxed !line-clamp-3 !mb-0">
                  {art.desc}
                </Paragraph>
              </div>
            </div>

            <div className="p-5 pt-0 border-t border-slate-100 mt-2 flex items-center justify-between">
              <Link
                to={art.category === "promo" ? "/register" : art.category === "tournament" ? "/customer/tournaments" : "/customer/rules"}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
              >
                Xem chi tiết <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CustomerNews;
