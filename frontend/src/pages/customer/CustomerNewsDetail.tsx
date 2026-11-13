import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CalendarOutlined as Calendar,
  EyeOutlined as Eye,
  ClockCircleOutlined as Clock,
  ArrowLeftOutlined as ArrowLeft,
  ShareAltOutlined as Share2,
  RightOutlined as ChevronRight,
  StarOutlined as Sparkles,
  ReadOutlined as Newspaper,
} from "@ant-design/icons";
import { Alert, Button, Tag, Typography, message } from "../../shared/ui";
import { newsService, type NewsArticleItem } from "../../services/news.service";

const { Title, Paragraph } = Typography;

const CustomerNewsDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<NewsArticleItem | null>(null);
  const [related, setRelated] = useState<NewsArticleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!slug) return;
    let isMounted = true;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        setLoadError(false);
        setArticle(null);
        setRelated([]);
        const data = await newsService.getPublicArticleDetail(slug);
        if (isMounted) {
          setArticle(data.article);
          setRelated(data.related || []);
        }
      } catch (err: unknown) {
        console.error("Lỗi tải chi tiết bài viết:", err);
        // 404 = bài không tồn tại/chưa xuất bản (màn "Không tìm thấy"); lỗi khác cho phép thử lại
        if (isMounted && (err as { response?: { status?: number } })?.response?.status !== 404) setLoadError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return () => {
      isMounted = false;
    };
  }, [slug, reload]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      message.success("Đã sao chép liên kết bài viết vào bộ nhớ tạm!");
    } catch {
      message.error("Không thể sao chép. Bạn có thể chia sẻ đường dẫn trên thanh địa chỉ.");
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm font-semibold text-slate-600">Đang tải nội dung bài viết...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-4">
        <Alert
          type="error"
          showIcon
          title="Không thể tải bài viết. Vui lòng kiểm tra kết nối và thử lại."
          action={
            <Button variant="outline" onClick={() => setReload((value) => value + 1)}>
              Thử lại
            </Button>
          }
        />
        <Link to="/customer/news" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách tin tức
        </Link>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center bg-white rounded-3xl border border-slate-200 p-8">
        <Newspaper className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <Title level={2} className="!text-xl !font-bold !text-slate-800">
          Không tìm thấy bài viết
        </Title>
        <Paragraph className="!text-slate-500 !text-sm mt-2 mb-6">
          Bài viết bạn đang tìm kiếm có thể đã bị gỡ, hoặc đường dẫn không còn tồn tại trên hệ thống
          CueZone.
        </Paragraph>
        <Button
          variant="primary"
          onClick={() => navigate("/customer/news")}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="!bg-emerald-600 !border-emerald-600 text-white !rounded-xl"
        >
          Quay lại Bản tin
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <Link
          to="/customer/news"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách tin tức
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
            className="!text-xs !rounded-xl !border-slate-300"
          >
            Chia sẻ
          </Button>
        </div>
      </div>

      <article className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        {article.image && (
          <div className="w-full h-80 sm:h-96 relative overflow-hidden">
            <img
              src={article.image}
              alt={article.title}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-5 left-5">
              <Tag color="red" className="!text-xs !font-bold !px-3 !py-1 !rounded-md uppercase">
                {article.categoryLabel || "Tin tức CLB"}
              </Tag>
            </div>
          </div>
        )}

        <div className="p-8 sm:p-12 space-y-6">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500 border-b border-slate-100 pb-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              {article.date}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-bold">
              {article.author}
              {article.authorRole ? ` (${article.authorRole})` : ""}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {article.readTime || "3 phút đọc"}
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <Eye className="w-3.5 h-3.5" />
              {article.viewCount || 1} lượt xem
            </span>
          </div>

          <Title level={1} className="!text-2xl sm:!text-3xl !font-black !text-slate-900 !mb-0 leading-tight">
            {article.title}
          </Title>

          {article.excerpt && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 text-emerald-950 font-medium text-sm leading-relaxed">
              {article.excerpt}
            </div>
          )}

          <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed pt-2">
            {Array.isArray(article.content) && article.content.length > 0 ? (
              article.content.map((para, idx) => (
                <p key={idx} className="whitespace-pre-line text-justify">
                  {para}
                </p>
              ))
            ) : (
              <p className="italic text-slate-400">Nội dung chi tiết đang được cập nhật...</p>
            )}
          </div>

          <div className="mt-10 p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 uppercase tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> Trải nghiệm tại CueZone
              </div>
              <h4 className="text-base font-bold text-white">Sẵn sàng trải nghiệm bàn đấu chuyên nghiệp?</h4>
              <p className="text-xs text-slate-300">Đặt bàn online ngay hôm nay để nhận ưu đãi giờ vàng!</p>
            </div>
            <Button
              variant="primary"
              to="/customer/booking"
              className="!bg-emerald-500 hover:!bg-emerald-400 !border-emerald-500 !text-slate-950 !font-black !text-xs !rounded-xl !px-6"
            >
              Đặt Bàn Ngay
            </Button>
          </div>
        </div>
      </article>

      {related.length > 0 && (
        <div className="space-y-4 pt-6">
          <Title level={3} className="!text-lg !font-bold !text-slate-900 !mb-0">
            Bài viết liên quan
          </Title>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map((rel) => (
              <Link
                key={rel._id}
                to={`/customer/news/${encodeURIComponent(rel.slug || rel._id)}`}
                className="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                {rel.image && (
                  <div className="h-32 overflow-hidden relative">
                    <img
                      src={rel.image}
                      alt={rel.title}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-4 space-y-1">
                  <div className="text-[11px] text-slate-400 font-semibold">{rel.date}</div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                    {rel.title}
                  </h4>
                </div>
                <div className="p-4 pt-0 text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  Đọc ngay <ChevronRight className="w-3 h-3" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerNewsDetail;
