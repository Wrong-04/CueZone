import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ReadOutlined, CalendarOutlined } from "@ant-design/icons";
import { Alert, Button, Pagination, Spin, Tag, Typography } from "../../shared/ui";
import { newsService, type NewsArticleItem } from "../../services/news.service";

const categories = [
  { key: "all", label: "Tất cả" }, { key: "promo", label: "Khuyến mãi" },
  { key: "tournament", label: "Giải đấu" }, { key: "tips", label: "Mẹo & Kỹ thuật" },
  { key: "event", label: "Sự kiện CLB" }, { key: "announcement", label: "Thông báo" },
];

export default function CustomerNews() {
  const [category, setCategory] = useState("all");
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await newsService.getPublicArticles({ category, page, limit: 12 });
        if (active) {
          setArticles(result.articles);
          setTotal(result.pagination.total);
        }
      } catch {
        if (active) { setArticles([]); setLoadError("Không thể tải tin tức. Vui lòng thử lại."); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [category, page, reload]);
  const featured = articles.find((article) => article.isFeatured);
  const articleLink = (article: NewsArticleItem) => `/customer/news/${encodeURIComponent(article.slug || article._id)}`;

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-white border border-slate-200 p-8">
        <p className="text-brand font-semibold"><ReadOutlined /> BẢN TIN CUEZONE</p>
        <Typography.Title level={1}>Tin tức, Ưu đãi & Sự kiện CLB</Typography.Title>
        <p className="text-slate-600">Cập nhật hoạt động câu lạc bộ, khuyến mãi và cẩm nang kỹ thuật bida.</p>
      </header>
      <div className="flex flex-wrap gap-2" aria-label="Lọc chuyên mục">
        {categories.map((item) => <Button key={item.key} variant={category === item.key ? "primary" : "outline"}
          aria-pressed={category === item.key} onClick={() => { setCategory(item.key); setPage(1); }}>
          {item.label}
        </Button>)}
      </div>
      {loadError ? <Alert type="error" showIcon title={loadError}
        action={<Button variant="outline" onClick={() => setReload((value) => value + 1)}>Thử lại</Button>} /> : loading ? (
        <div role="status" className="py-16 text-center"><Spin /><p>Đang tải bản tin CueZone...</p></div>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl">
          <ReadOutlined className="text-3xl text-slate-400" />
          <h2 className="font-bold mt-3">Chưa có bài viết trong chuyên mục này</h2>
          <p className="text-slate-500">Vui lòng chọn chuyên mục khác hoặc quay lại sau.</p>
        </div>
      ) : <>
        {featured && page === 1 && category === "all" && (
          <article className="grid grid-cols-1 lg:grid-cols-2 bg-white border border-slate-200 rounded-3xl overflow-hidden">
            {featured.image ? (
              <img src={featured.image} alt={featured.title} className="w-full h-72 object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="w-full h-72 bg-slate-100 flex items-center justify-center text-slate-400">
                <ReadOutlined className="text-4xl" />
              </div>
            )}
            <div className="p-8 space-y-4">
              <Tag color="gold">TIN TIÊU ĐIỂM</Tag>
              <h2 className="text-2xl font-bold">{featured.title}</h2>
              <p className="text-slate-600">{featured.excerpt}</p>
              <p className="text-sm text-slate-500">{featured.author} · {featured.date}</p>
              <Link to={articleLink(featured)} className="text-brand font-bold underline">Đọc bài viết tiêu điểm</Link>
            </div>
          </article>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => <article key={article._id}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
            {article.image ? (
              <img src={article.image} alt={article.title} className="w-full aspect-video object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }} />
            ) : (
              <div className="w-full aspect-video bg-slate-100 flex items-center justify-center text-slate-400">
                <ReadOutlined className="text-3xl" />
              </div>
            )}
            <div className="p-5 space-y-3 flex-1">
              <Tag color={article.tagColor}>{article.categoryLabel}</Tag>
              <p className="text-xs text-slate-500"><CalendarOutlined /> {article.date} · {article.author}</p>
              <h2 className="text-lg font-bold">{article.title}</h2>
              <p className="text-sm text-slate-600 line-clamp-3">{article.excerpt}</p>
            </div>
            <Link to={articleLink(article)} className="p-5 pt-0 text-brand font-bold underline">Xem chi tiết</Link>
          </article>)}
        </div>
        <Pagination current={page} pageSize={12} total={total} showSizeChanger={false}
          onChange={setPage} showTotal={(count) => `${count} bài viết`} />
      </>}
    </div>
  );
}
