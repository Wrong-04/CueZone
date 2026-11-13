import { useEffect, useRef, useState } from "react";
import {
  ReadOutlined, PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  PushpinOutlined, EyeOutlined, ReloadOutlined,
} from "@ant-design/icons";
import {
  Alert, Button, Input, Modal, Pagination, Select, Spin, Table, Tag, Typography, message,
  type TableColumnsType,
} from "../../shared/ui";
import { newsService, type NewsArticleItem, type NewsInput } from "../../services/news.service";

const categories = [
  { value: "promo", label: "Khuyến mãi" },
  { value: "tournament", label: "Giải đấu" },
  { value: "tips", label: "Mẹo & Kỹ thuật" },
  { value: "event", label: "Sự kiện CLB" },
  { value: "announcement", label: "Thông báo" },
];
const emptyForm = (): NewsInput => ({
  title: "", category: "promo", status: "published", isFeatured: false,
  author: "Ban Quản Lý CueZone", authorRole: "Điều hành CLB", readTime: "3 phút đọc",
  image: "", excerpt: "", content: [],
});
const errorMessage = (error: unknown, fallback: string) => {
  const response = error as { response?: { data?: { message?: string } } };
  return response.response?.data?.message || fallback;
};

export default function NewsManagementPage() {
  const [articles, setArticles] = useState<NewsArticleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NewsInput>(emptyForm);
  const [contentText, setContentText] = useState("");
  const [preview, setPreview] = useState<NewsArticleItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const uploadVersion = useRef(0);
  const pageSize = 12;

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setLoadError("");
      try {
        const result = await newsService.getAdminArticles({ search, category, status, page, limit: pageSize });
        if (!active) return;
        const lastPage = Math.max(1, result.pagination.totalPages);
        if (page > lastPage) { setPage(lastPage); return; }
        setArticles(result.articles);
        setTotal(result.pagination.total);
      } catch (error) {
        if (active) {
          setArticles([]);
          setLoadError(errorMessage(error, "Không thể tải tin tức. Vui lòng thử lại."));
        }
      } finally {
        if (active) setLoading(false);
      }
    }, 200);
    return () => { active = false; window.clearTimeout(timer); };
  }, [search, category, status, page, reload]);

  const closeEditor = () => {
    if (saving || uploading) return;
    uploadVersion.current += 1;
    setEditorOpen(false);
  };
  const openEditor = (article?: NewsArticleItem) => {
    uploadVersion.current += 1;
    setEditingId(article?._id || null);
    setForm(article ? {
      title: article.title, category: article.category,
      status: article.status === "published" ? "published" : "draft",
      isFeatured: article.isFeatured, author: article.author, authorRole: article.authorRole,
      readTime: article.readTime, image: article.image, excerpt: article.excerpt, content: article.content,
    } : emptyForm());
    setContentText(article?.content.join("\n\n") || "");
    setEditorOpen(true);
  };
  const save = async (overrideStatus?: NewsInput["status"]) => {
    if (saving || uploading) return;
    if (!form.title.trim() || !form.excerpt.trim() || !contentText.trim()) {
      message.warning("Vui lòng nhập tiêu đề, tóm tắt và nội dung bài viết.");
      return;
    }
    const finalStatus = overrideStatus || form.status;
    setSaving(true);
    try {
      const input = {
        ...form,
        status: finalStatus,
        content: contentText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
      };
      if (editingId) await newsService.updateArticle(editingId, input);
      else await newsService.createArticle(input);
      setEditorOpen(false);
      setReload((value) => value + 1);
      message.success(input.status === "published" ? "Đã lưu và xuất bản bài viết." : "Đã lưu bản nháp.");
    } catch (error) {
      message.error(errorMessage(error, "Không thể lưu bài viết. Nội dung vẫn được giữ trong biểu mẫu."));
    } finally { setSaving(false); }
  };
  const upload = async (file: File) => {
    if (uploading) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      message.warning("Chỉ chấp nhận ảnh JPG, PNG, WEBP tối đa 5 MB.");
      return;
    }
    const version = uploadVersion.current;
    setUploading(true);
    try {
      const image = await newsService.uploadBanner(file);
      if (version === uploadVersion.current) setForm((value) => ({ ...value, image }));
      message.success("Đã tải ảnh bìa. Bấm lưu để gắn ảnh vào bài viết.");
    } catch (error) {
      message.error(errorMessage(error, "Không thể tải ảnh. Vui lòng thử lại."));
    } finally { setUploading(false); }
  };
  const togglePublish = async (article: NewsArticleItem) => {
    if (busyId) return;
    setBusyId(article._id);
    const nextStatus = article.status === "published" ? "draft" : "published";
    try {
      await newsService.updateArticle(article._id, { status: nextStatus });
      setReload((value) => value + 1);
      message.success(nextStatus === "published" ? "Đã xuất bản bài viết lên trang khách hàng." : "Đã chuyển bài viết về bản nháp.");
    } catch (error) { message.error(errorMessage(error, "Không thể cập nhật trạng thái xuất bản.")); }
    finally { setBusyId(null); }
  };
  const pin = async (article: NewsArticleItem) => {
    if (busyId) return;
    setBusyId(article._id);
    try {
      await newsService.updateArticle(article._id, { isFeatured: !article.isFeatured });
      setReload((value) => value + 1);
      message.success(article.isFeatured ? "Đã bỏ ghim bài viết." : "Đã ghim bài viết.");
    } catch (error) { message.error(errorMessage(error, "Không thể cập nhật trạng thái ghim.")); }
    finally { setBusyId(null); }
  };
  const remove = (article: NewsArticleItem) => Modal.confirm({
    title: "Xóa bài viết?", content: `Bài viết “${article.title}” sẽ bị gỡ khỏi cả trang quản trị và bản tin khách hàng.`,
    okText: "Xóa bài viết", cancelText: "Hủy", okType: "danger",
    onOk: async () => {
      try {
        await newsService.deleteArticle(article._id);
        setReload((value) => value + 1);
        message.success("Đã xóa bài viết.");
      } catch (error) {
        message.error(errorMessage(error, "Không thể xóa bài viết."));
        throw error;
      }
    },
  });
  const actions = (article: NewsArticleItem) => (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" leftIcon={<EyeOutlined />} onClick={() => setPreview(article)}>Xem trước</Button>
      <Button size="sm" variant="outline" leftIcon={<EditOutlined />} onClick={() => openEditor(article)}>Sửa</Button>
      <Button size="sm" variant={article.status === "published" ? "outline" : "primary"}
        disabled={!!busyId} loading={busyId === article._id} onClick={() => void togglePublish(article)}>
        {article.status === "published" ? "Gỡ xuất bản" : "Xuất bản ngay"}
      </Button>
      <Button size="sm" variant={article.isFeatured ? "primary" : "outline"} leftIcon={<PushpinOutlined />}
        disabled={!!busyId} loading={busyId === article._id} onClick={() => void pin(article)}>
        {article.isFeatured ? "Bỏ ghim" : "Ghim"}
      </Button>
      <Button size="sm" variant="danger-outline" leftIcon={<DeleteOutlined />} onClick={() => remove(article)}>Xóa</Button>
    </div>
  );
  const columns: TableColumnsType<NewsArticleItem> = [
    { title: "Bài viết", dataIndex: "title" },
    { title: "Chuyên mục", dataIndex: "categoryLabel" },
    { title: "Ngày đăng", dataIndex: "date" },
    { title: "Trạng thái", render: (_, article) => article.status === "published" ? "Đã xuất bản" : "Bản nháp" },
    { title: "Thao tác", render: (_, article) => actions(article) },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography.Title level={2} className="!mb-1"><ReadOutlined /> Tin tức & Sự kiện CLB</Typography.Title>
          <p className="text-slate-500">Biên tập, lưu bản nháp và xuất bản tin tức cho khách hàng.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<ReloadOutlined />} onClick={() => setReload((value) => value + 1)}>Làm mới</Button>
          <Button leftIcon={<PlusOutlined />} onClick={() => openEditor()}>Tạo bài viết</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Input aria-label="Tìm bài viết" placeholder="Tìm tiêu đề, tác giả..." prefix={<SearchOutlined />}
          className="!w-full sm:!w-64" maxLength={200} value={search} allowClear
          onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        <Select aria-label="Lọc chuyên mục" className="!min-w-48" value={category}
          options={[{ value: "all", label: "Tất cả chuyên mục" }, ...categories]}
          onChange={(value) => { setCategory(value); setPage(1); }} />
        <Select aria-label="Lọc trạng thái" className="!min-w-44" value={status}
          options={[{ value: "all", label: "Tất cả trạng thái" }, { value: "published", label: "Đã xuất bản" },
            { value: "draft", label: "Bản nháp" }, { value: "featured", label: "Đã ghim" }]}
          onChange={(value) => { setStatus(value); setPage(1); }} />
        <Button variant="outline" onClick={() => setView(view === "grid" ? "table" : "grid")}>
          {view === "grid" ? "Xem danh sách" : "Xem thẻ ảnh"}
        </Button>
      </div>
      {loadError ? <Alert type="error" showIcon title={loadError}
        action={<Button variant="outline" onClick={() => { setLoadError(""); setLoading(true); setReload((value) => value + 1); }}>Thử lại</Button>} /> : loading ? (
        <div role="status" className="py-16 text-center"><Spin /><p>Đang tải bài viết...</p></div>
      ) : articles.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p>Chưa có bài viết phù hợp. Hãy đổi bộ lọc hoặc tạo bài viết mới.</p>
        </div>
      ) : view === "table" ? (
        <Table rowKey="_id" dataSource={articles} columns={columns} pagination={false} scroll={{ x: 900 }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article key={article._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
              {article.image ? (
                <img src={article.image} alt={article.title} className="aspect-video w-full object-cover"
                  onError={(event) => { event.currentTarget.style.display = "none"; }} />
              ) : (
                <div className="aspect-video w-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <ReadOutlined className="text-3xl" />
                </div>
              )}
              <div className="p-5 space-y-3 flex-1">
                <div className="flex flex-wrap gap-2"><Tag color={article.tagColor}>{article.categoryLabel}</Tag>
                  <Tag color={article.status === "published" ? "green" : "orange"}>
                    {article.status === "published" ? "Đã xuất bản" : "Bản nháp"}
                  </Tag></div>
                <h3 className="font-bold text-slate-900">{article.title}</h3>
                <p className="text-sm text-slate-600 line-clamp-3">{article.excerpt}</p>
                <p className="text-xs text-slate-500">{article.author} · {article.date} · {article.viewCount} lượt xem</p>
                {actions(article)}
              </div>
            </article>
          ))}
        </div>
      )}
      {!loadError && <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false}
        onChange={setPage} showTotal={(count) => `${count} bài viết`} />}
      <Modal title={editingId ? "Chỉnh sửa bài viết" : "Tạo bài viết"} open={editorOpen} width={780}
        onCancel={closeEditor} maskClosable={false} closable={!saving && !uploading}
        footer={<div className="flex justify-end gap-2">
          <Button variant="outline" disabled={saving || uploading} onClick={closeEditor}>Hủy</Button>
          <Button variant="outline" disabled={saving || uploading} onClick={() => void save("draft")}>
            Lưu bản nháp
          </Button>
          <Button loading={saving} disabled={uploading} onClick={() => void save("published")}>
            Xuất bản ngay
          </Button>
        </div>}>
        <div className="space-y-4 py-2">
          <label className="block">Tiêu đề *<Input value={form.title} maxLength={300}
            onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="block">Chuyên mục<Select className="w-full" value={form.category} options={categories}
            onChange={(value) => setForm({ ...form, category: value as NewsInput["category"] })} /></label>
          <fieldset disabled={uploading || saving} className="space-y-3">
            <legend className="text-sm font-medium text-slate-700">Ảnh bìa</legend>
            {form.image ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video max-h-56 bg-slate-50 flex items-center justify-center">
                <img src={form.image} alt="Xem trước ảnh bìa" className="w-full h-full object-cover" />
                <Button size="sm" variant="danger-outline" className="!absolute top-2 right-2 bg-white/90 backdrop-blur"
                  onClick={() => setForm({ ...form, image: "" })}>
                  Gỡ ảnh
                </Button>
              </div>
            ) : null}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-sm">
                Tải ảnh từ máy (JPG, PNG, WEBP, tối đa 5 MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" className="block w-full mt-1 text-sm file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void upload(file); }} />
              </label>
              <label className="block text-sm">
                Hoặc nhập URL ảnh HTTPS
                <Input className="mt-1" placeholder="https://..." value={form.image}
                  onChange={(event) => setForm({ ...form, image: event.target.value })} />
              </label>
            </div>
          </fieldset>
          {uploading && <p role="status">Đang tải ảnh bìa...</p>}
          <label className="block">Tóm tắt *<Input.TextArea rows={2} maxLength={2000} value={form.excerpt}
            onChange={(event) => setForm({ ...form, excerpt: event.target.value })} /></label>
          <label className="block">Nội dung * (để một dòng trống giữa các đoạn)
            <Input.TextArea rows={7} maxLength={100000} value={contentText} onChange={(event) => setContentText(event.target.value)} />
          </label>
          <label className="block">Tác giả<Input value={form.author} maxLength={120} onChange={(event) => setForm({ ...form, author: event.target.value })} /></label>
          <label className="flex gap-2 items-center"><input type="checkbox" checked={form.isFeatured}
            onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />Ghim bài viết nổi bật</label>
        </div>
      </Modal>
      <Modal title="Xem trước bài viết" open={!!preview} onCancel={() => setPreview(null)} footer={null} width={760}>
        {preview && <article className="space-y-4">
          {preview.image && <img src={preview.image} alt={preview.title} className="aspect-video object-cover w-full rounded-xl" />}
          <h2 className="text-2xl font-bold">{preview.title}</h2>
          <p className="text-sm text-slate-500">{preview.author} · {preview.date}</p>
          <p className="font-semibold">{preview.excerpt}</p>
          {preview.content.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}
        </article>}
      </Modal>
    </div>
  );
}
