import React, { useState, useEffect, useMemo } from "react";
import {
  ReadOutlined,
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  PushpinOutlined,
  SendOutlined,
  CalendarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  FireOutlined,
  TrophyOutlined,
  GiftOutlined,
  ToolOutlined,
  BellOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ShareAltOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tag,
  Typography,
  message,
  Modal,
  Table,
  Input,
  Select,
  Tooltip,
  type TableColumnsType,
} from "../../shared/ui";

const { Title, Text } = Typography;

// ── Types ─────────────────────────────────────────────────────────────────────

export type NewsCategory = "promo" | "tournament" | "tips" | "event" | "announcement";

export interface NewsArticleItem {
  id: string;
  title: string;
  category: NewsCategory;
  categoryLabel: string;
  tagColor: "red" | "gold" | "cyan" | "purple" | "blue" | "green";
  status: "published" | "draft" | "scheduled";
  isFeatured: boolean;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  viewCount: number;
  image: string;
  excerpt: string;
  content: string[];
  pushNotificationSent?: boolean;
}

// ── Curated Cover Images Gallery ──────────────────────────────────────────────

export const AVAILABLE_COVERS = [
  {
    url: "/news/news-promo-goldhour.jpg",
    label: "Giờ Vàng Khuyến Mãi",
    desc: "Bàn bida xanh Simonis & ánh đèn quầy bar hiện đại",
  },
  {
    url: "/news/news-tournament-trophy.jpg",
    label: "Cúp Vàng Vô Địch",
    desc: "Lễ trao cúp vàng WBC sang trọng bên bàn bida",
  },
  {
    url: "/news/news-bankpool-tourney.jpg",
    label: "Giải Đấu Bank Pool",
    desc: "Trọng tài & cơ thủ tập trung bên bàn thi đấu",
  },
  {
    url: "/news/news-maintenance-simonis.jpg",
    label: "Bảo Trì & Vải Simonis",
    desc: "Kỹ thuật viên căng vải nỉ Simonis 860 cao cấp",
  },
  {
    url: "/news/news-cue-technique.jpg",
    label: "Kỹ Thuật Đánh Cơ",
    desc: "Góc đánh bi chuẩn xác & gậy carbon cao cấp",
  },
  {
    url: "/news/news-club-hero.jpg",
    label: "Không Gian CLB VIP",
    desc: "Sảnh thi đấu rộng rãi, sang trọng và hiện đại",
  },
];

// ── Initial Mock Articles Data ────────────────────────────────────────────────

const INITIAL_NEWS: NewsArticleItem[] = [
  {
    id: "news-01",
    title: "Chương Trình Giờ Vàng: Giảm 20% Tiền Bàn Từ 13:00 Đến 17:00 Hàng Ngày",
    category: "promo",
    categoryLabel: "Khuyến Mãi",
    tagColor: "red",
    status: "published",
    isFeatured: true,
    author: "Ban Quản Lý CueZone",
    authorRole: "Điều hành CLB",
    date: "01/10/2026",
    readTime: "3 phút đọc",
    viewCount: 3420,
    image: "/news/news-promo-goldhour.jpg",
    excerpt:
      "Thỏa sức luyện cơ với mức giá giờ chơi chỉ từ 40.000đ/giờ tại toàn bộ hệ thống 20 bàn thi đấu CueZone. Tặng kèm 01 phần nước ngọt hoặc nước suối cho nhóm từ 3 người.",
    content: [
      "Nhằm tạo điều kiện tốt nhất cho các cơ thủ có không gian tập luyện chuyên sâu với chi phí tối ưu, CueZone chính thức áp dụng chương trình ưu đãi Giờ Vàng Đặc Biệt tại toàn bộ sảnh chơi.",
      "Chi tiết ưu đãi: Giảm ngay 20% trên tổng hóa đơn tiền giờ chơi từ 13:00 đến 17:00 các ngày từ Thứ Hai đến Thứ Sáu hàng tuần. Áp dụng cho cả bàn Standard và Bàn Thi Đấu Tournament.",
      "Đặc biệt: Khi đi theo nhóm từ 3 cơ thủ trở lên và đặt bàn trước qua ứng dụng di động CueZone, quý khách sẽ được tặng kèm 01 phần nước ngọt hoặc nước khoáng ướp lạnh cho mỗi thành viên.",
      "Lưu ý: Không áp dụng đồng thời với các voucher ưu đãi thành viên Kim Cương và không áp dụng vào các ngày lễ Tết.",
    ],
    pushNotificationSent: true,
  },
  {
    id: "news-02",
    title: "Khép Lại Giải Đấu CueZone Open 2026: Cơ Thủ Trần Tuấn Minh Đăng Quang Vô Địch",
    category: "tournament",
    categoryLabel: "Giải Đấu",
    tagColor: "gold",
    status: "published",
    isFeatured: true,
    author: "Tổ Trọng Tài CueZone",
    authorRole: "Trọng tài trưởng",
    date: "29/09/2026",
    readTime: "4 phút đọc",
    viewCount: 4890,
    image: "/news/news-tournament-trophy.jpg",
    excerpt:
      "Trận chung kết kịch tính nghẹt thở với tỷ số sát nút 9-8 đã tìm ra chủ nhân của chiếc cúp vàng WBC danh giá và phần thưởng 25.000.000 VNĐ tiền mặt.",
    content: [
      "Sau 4 ngày tranh tài nảy lửa giữa 32 cơ thủ xuất sắc nhất đến từ các câu lạc bộ bida hàng đầu khu vực miền Nam, giải đấu CueZone Open Championship Mùa Thu 2026 đã chính thức khép lại với những màn rượt đuổi tỷ số kinh điển.",
      "Ở trận chung kết diễn ra tối qua, cơ thủ hạt giống số 1 Trần Tuấn Minh đã có cú lội ngược dòng ngoạn mục từ thế bị dẫn 6-8 để giành chiến thắng chung cuộc 9-8 trước đối thủ kỳ cựu Lê Hoàng Quân.",
      "Cơ thủ vô địch nhận cúp WBC mạ vàng, huy chương vàng, bằng chứng nhận vinh danh của CLB và phần thưởng 25 triệu đồng. Điểm số ELO của anh cũng chính thức chạm mốc 1,980 điểm trên bảng xếp hạng toàn quốc.",
      "Ban tổ chức xin gửi lời cảm ơn chân thành đến tất cả các vận động viên, tổ trọng tài VAR và đông đảo quý khán giả đã đồng hành cổ vũ nhiệt tình suốt giải đấu.",
    ],
    pushNotificationSent: true,
  },
  {
    id: "news-03",
    title: "Chính Thức Mở Đăng Ký Giải Bank Pool Championship Q2 Với Tổng Thưởng 15 Triệu",
    category: "tournament",
    categoryLabel: "Giải Đấu",
    tagColor: "gold",
    status: "published",
    isFeatured: false,
    author: "Ban Tổ Chức Giải",
    authorRole: "Ban thi đấu",
    date: "28/09/2026",
    readTime: "2 phút đọc",
    viewCount: 2750,
    image: "/news/news-bankpool-tourney.jpg",
    excerpt:
      "Cơ hội cọ xát đỉnh cao thể loại Bank Pool theo chuẩn WPA. Giới hạn 32 suất cơ thủ, diễn ra từ ngày 15/10 đến 18/10/2026 tại sảnh thi đấu trung tâm có hỗ trợ VAR quay chậm.",
    content: [
      "Giải đấu Bank Pool quy tụ các bậc thầy canh băng và điều bi chuẩn xác. Thể thức thi đấu: Loại trực tiếp (Single Elimination), Chạm 5 ván thắng (Race to 5).",
      "Luật thi đấu: Toàn bộ các đường bi vào lỗ bắt buộc phải là cú đánh đập băng (Bank shot hợp lệ), tính điểm theo luật hiện hành của Hiệp hội Bida Thế giới WPA.",
      "Toàn bộ bàn đấu đều được trang bị camera VAR góc cao để trọng tài đối chiếu các tình huống chạm băng nhạy cảm. Cơ thủ có thể đăng ký trực tuyến ngay trên App hoặc tại quầy thu ngân.",
    ],
    pushNotificationSent: false,
  },
  {
    id: "news-04",
    title: "Hoàn Tất Nâng Cấp 100% Vải Bàn Simonis 860 Tournament Chuẩn Quốc Tế",
    category: "announcement",
    categoryLabel: "Thông Báo",
    tagColor: "blue",
    status: "published",
    isFeatured: false,
    author: "Bộ Phận Kỹ Thuật",
    authorRole: "Trưởng nhóm kỹ thuật",
    date: "25/09/2026",
    readTime: "3 phút đọc",
    viewCount: 1620,
    image: "/news/news-maintenance-simonis.jpg",
    excerpt:
      "CueZone tiến hành căng mới toàn bộ mặt nỉ Simonis 860 sắc xanh Blue-Green và cân chỉnh độ phẳng tia laser điện tử cho toàn bộ 20 bàn thi đấu.",
    content: [
      "Để mang đến trải nghiệm lướt bi mượt mà và đường cơ chuẩn xác từng milimet, CueZone vừa hoàn tất chu kỳ bảo dưỡng định kỳ toàn bộ trang thiết bị câu lạc bộ.",
      "100% vải mặt bàn và vải băng đã được thay mới bằng dòng vải nỉ lừng danh thế giới Iwan Simonis 860 nhập khẩu trực tiếp từ Vương quốc Bỉ (tỷ lệ 90% len lông cừu nguyên chất và 10% sợi nylon dệt chặt).",
      "Kèm theo đó, đội ngũ kỹ thuật đã sử dụng máy cân bằng laser điện tử để tinh chỉnh độ phẳng phiến đá tự nhiên của tất cả 20 bàn, đảm bảo bi chạy không bị lệch hướng kể cả với những cú đánh lực siêu nhẹ (soft roll).",
    ],
    pushNotificationSent: false,
  },
  {
    id: "news-05",
    title: "Bí Quyết Canh Điểm Chạm Băng Chính Xác (Hệ Thống Góc Dội Đối Xứng)",
    category: "tips",
    categoryLabel: "Mẹo & Kỹ Thuật",
    tagColor: "cyan",
    status: "published",
    isFeatured: false,
    author: "HLV Quốc Gia Tuấn Anh",
    authorRole: "Huấn luyện viên trưởng",
    date: "22/09/2026",
    readTime: "5 phút đọc",
    viewCount: 2980,
    image: "/news/news-cue-technique.jpg",
    excerpt:
      "Hướng dẫn chi tiết phương pháp chia đôi góc băng và ước lượng độ biến dạng của băng cao su Artemis khi đánh lực vừa và lực mạnh.",
    content: [
      "Trong bộ môn bida lỗ và bank pool, việc tính toán chính xác điểm chạm băng (cushion point) là kỹ năng cốt lõi phân định giữa người chơi nghiệp dư và vận động viên chuyên nghiệp.",
      "Bài viết phân tích nguyên lý Hệ Thống Nút Điểm (Diamond System), công thức: Điểm ngắm = Điểm xuất phát / 2 + Độ dội góc tới.",
      "Lời khuyên từ HLV: Luôn giữ thẳng tay cầm cơ, kiểm soát nhịp nhấp cơ đều đặn từ 2 đến 3 nhịp và hạn chế đặt ephe không cần thiết khi thực hiện những cú đánh băng dài.",
    ],
    pushNotificationSent: false,
  },
  {
    id: "news-06",
    title: "Đặc Quyền Hội Viên Kim Cương (Diamond Club): Tích Điểm Đổi Giờ Chơi & Giảm 15% F&B",
    category: "event",
    categoryLabel: "Sự Kiện",
    tagColor: "purple",
    status: "published",
    isFeatured: false,
    author: "Phòng Chăm Sóc Khách Hàng",
    authorRole: "Trưởng phòng CSKH",
    date: "18/09/2026",
    readTime: "3 phút đọc",
    viewCount: 1840,
    image: "/news/news-club-hero.jpg",
    excerpt:
      "Chính sách tri ân hội viên thân thiết với tủ đựng cơ riêng có khóa từ, ưu tiên giữ bàn VIP qua Hotline, và tặng 2 giờ chơi miễn phí trong tuần sinh nhật.",
    content: [
      "CueZone vinh hạnh ra mắt chính sách nâng hạng Diamond Club dành riêng cho các thành viên có tổng số giờ chơi tích lũy từ 50 giờ/tháng trở lên.",
      "Quyền lợi độc quyền: Tặng tủ để gậy cá nhân khóa vân tay riêng biệt tại sảnh VIP, giảm 15% toàn bộ menu đồ ăn thức uống F&B, và miễn phí 100% dịch vụ thay đầu cơ định kỳ bằng đầu cơ Kamui Nhật Bản.",
    ],
    pushNotificationSent: false,
  },
];

// ── Main Component ────────────────────────────────────────────────────────────

const NewsManagementPage: React.FC = () => {
  // Local Storage Data Management
  const [articles, setArticles] = useState<NewsArticleItem[]>(() => {
    const saved = localStorage.getItem("cuezone_admin_news");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved news data:", e);
      }
    }
    return INITIAL_NEWS;
  });

  useEffect(() => {
    localStorage.setItem("cuezone_admin_news", JSON.stringify(articles));
  }, [articles]);

  // Filters & Controls
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Modals State
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [pushModalVisible, setPushModalVisible] = useState<boolean>(false);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticleItem | null>(null);

  // Form State for Create / Edit
  interface ArticleFormData {
    title: string;
    category: NewsCategory;
    tagColor: NewsArticleItem["tagColor"];
    status: NewsArticleItem["status"];
    isFeatured: boolean;
    author: string;
    authorRole: string;
    readTime: string;
    image: string;
    excerpt: string;
    contentString: string;
    sendPush: boolean;
  }

  const [formData, setFormData] = useState<ArticleFormData>({
    title: "",
    category: "promo",
    tagColor: "red",
    status: "published",
    isFeatured: false,
    author: "Ban Quản Lý CueZone",
    authorRole: "Điều hành CLB",
    readTime: "3 phút đọc",
    image: "/news/news-promo-goldhour.jpg",
    excerpt: "",
    contentString: "",
    sendPush: false,
  });

  // Push Broadcast Modal Form
  const [pushChannel, setPushChannel] = useState<string>("all");
  const [pushTitle, setPushTitle] = useState<string>("");
  const [pushMessage, setPushMessage] = useState<string>("");

  // Category Configuration
  const categoryMap: Record<NewsCategory, { label: string; color: NewsArticleItem["tagColor"]; icon: React.ReactNode }> = {
    promo: { label: "Khuyến Mãi", color: "red", icon: <GiftOutlined /> },
    tournament: { label: "Giải Đấu", color: "gold", icon: <TrophyOutlined /> },
    tips: { label: "Mẹo & Kỹ Thuật", color: "cyan", icon: <ThunderboltOutlined /> },
    event: { label: "Sự Kiện", color: "purple", icon: <FireOutlined /> },
    announcement: { label: "Thông Báo", color: "blue", icon: <ToolOutlined /> },
  };

  // ── Calculated KPI Metrics ────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const total = articles.length;
    const published = articles.filter((a) => a.status === "published").length;
    const featured = articles.filter((a) => a.isFeatured).length;
    const totalViews = articles.reduce((sum, a) => sum + (a.viewCount || 0), 0);
    return { total, published, featured, totalViews };
  }, [articles]);

  // ── Filtered Articles List ────────────────────────────────────────────────

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      // Search
      const matchSearch =
        !searchQuery.trim() ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.author.toLowerCase().includes(searchQuery.toLowerCase());

      // Category
      const matchCategory = selectedCategory === "all" || article.category === selectedCategory;

      // Status
      const matchStatus =
        selectedStatus === "all"
          ? true
          : selectedStatus === "featured"
          ? article.isFeatured
          : article.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [articles, searchQuery, selectedCategory, selectedStatus]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenCreate = () => {
    setFormData({
      title: "",
      category: "promo",
      tagColor: "red",
      status: "published",
      isFeatured: false,
      author: "Ban Quản Lý CueZone",
      authorRole: "Điều hành CLB",
      readTime: "3 phút đọc",
      image: "/news/news-promo-goldhour.jpg",
      excerpt: "",
      contentString: "",
      sendPush: false,
    });
    setCreateModalVisible(true);
  };

  const handleOpenEdit = (article: NewsArticleItem) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      category: article.category,
      tagColor: article.tagColor,
      status: article.status,
      isFeatured: article.isFeatured,
      author: article.author,
      authorRole: article.authorRole,
      readTime: article.readTime,
      image: article.image,
      excerpt: article.excerpt,
      contentString: article.content.join("\n\n"),
      sendPush: false,
    });
    setEditModalVisible(true);
  };

  const handleOpenPreview = (article: NewsArticleItem) => {
    setSelectedArticle(article);
    setPreviewModalVisible(true);
  };

  const handleToggleFeature = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setArticles((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const nextState = !a.isFeatured;
          message.success(
            nextState ? `Đã ghim bài viết "${a.title.slice(0, 30)}..." lên vị trí nổi bật!` : `Đã bỏ ghim bài viết!`
          );
          return { ...a, isFeatured: nextState };
        }
        return a;
      })
    );
  };

  const handleDeleteArticle = (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Modal.confirm({
      title: "Xác nhận gỡ bài viết",
      content: `Bạn có chắc chắn muốn xóa bài viết "${title}" khỏi hệ thống bản tin của CueZone? Thao tác này sẽ gỡ bài viết khỏi app khách hàng.`,
      okText: "Gỡ bài viết",
      okType: "danger",
      cancelText: "Hủy",
      onOk: () => {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        message.success("Đã xóa bài viết thành công!");
      },
    });
  };

  const handleSaveCreate = () => {
    if (!formData.title.trim()) {
      message.warning("Vui lòng nhập tiêu đề bài viết!");
      return;
    }
    if (!formData.excerpt.trim()) {
      message.warning("Vui lòng nhập đoạn tóm tắt bài viết!");
      return;
    }

    const catInfo = categoryMap[formData.category] || categoryMap.promo;
    const paragraphs = formData.contentString
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    const newArticle: NewsArticleItem = {
      id: `news-${Date.now()}`,
      title: formData.title.trim(),
      category: formData.category,
      categoryLabel: catInfo.label,
      tagColor: catInfo.color,
      status: formData.status,
      isFeatured: formData.isFeatured,
      author: formData.author.trim() || "Ban Quản Lý CueZone",
      authorRole: formData.authorRole.trim() || "Điều hành CLB",
      date: new Date().toLocaleDateString("vi-VN"),
      readTime: formData.readTime.trim() || "3 phút đọc",
      viewCount: 1,
      image: formData.image,
      excerpt: formData.excerpt.trim(),
      content: paragraphs.length > 0 ? paragraphs : [formData.excerpt.trim()],
      pushNotificationSent: formData.sendPush,
    };

    setArticles((prev) => [newArticle, ...prev]);
    setCreateModalVisible(false);
    message.success(
      formData.sendPush
        ? `Đã tạo bài viết và gửi thông báo đẩy đến toàn bộ khách hàng!`
        : `Tạo bài viết mới thành công!`
    );
  };

  const handleSaveEdit = () => {
    if (!selectedArticle) return;
    if (!formData.title.trim()) {
      message.warning("Vui lòng nhập tiêu đề bài viết!");
      return;
    }

    const catInfo = categoryMap[formData.category] || categoryMap.promo;
    const paragraphs = formData.contentString
      .split("\n\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    setArticles((prev) =>
      prev.map((a) => {
        if (a.id === selectedArticle.id) {
          return {
            ...a,
            title: formData.title.trim(),
            category: formData.category,
            categoryLabel: catInfo.label,
            tagColor: catInfo.color,
            status: formData.status,
            isFeatured: formData.isFeatured,
            author: formData.author.trim(),
            authorRole: formData.authorRole.trim(),
            readTime: formData.readTime.trim(),
            image: formData.image,
            excerpt: formData.excerpt.trim(),
            content: paragraphs.length > 0 ? paragraphs : [formData.excerpt.trim()],
            pushNotificationSent: a.pushNotificationSent || formData.sendPush,
          };
        }
        return a;
      })
    );

    setEditModalVisible(false);
    setSelectedArticle(null);
    message.success("Cập nhật bài viết thành công!");
  };

  const handleResetData = () => {
    Modal.confirm({
      title: "Khôi phục dữ liệu mẫu ban đầu?",
      content: "Hành động này sẽ khôi phục 6 bài viết tin tức & thông báo chuẩn ban đầu của CueZone.",
      okText: "Khôi phục",
      cancelText: "Hủy",
      onOk: () => {
        setArticles(INITIAL_NEWS);
        localStorage.setItem("cuezone_admin_news", JSON.stringify(INITIAL_NEWS));
        message.success("Đã khôi phục danh mục tin tức mẫu!");
      },
    });
  };

  const handleSendBroadcastPush = () => {
    if (!pushTitle.trim()) {
      message.warning("Vui lòng nhập tiêu đề thông báo push!");
      return;
    }
    if (!pushMessage.trim()) {
      message.warning("Vui lòng nhập nội dung thông báo!");
      return;
    }

    const channelName =
      pushChannel === "all"
        ? "Toàn bộ Hội viên CueZone"
        : pushChannel === "vip"
        ? "Hội viên Kim Cương & VIP"
        : "Vận động viên thi đấu";

    message.success(`Đã gửi thông báo đẩy khẩn cấp tới "${channelName}" thành công!`);
    setPushModalVisible(false);
    setPushTitle("");
    setPushMessage("");
  };

  // ── Table Columns Definition ──────────────────────────────────────────────

  const columns: TableColumnsType<NewsArticleItem> = [
    {
      title: "Bài viết & Ảnh bìa",
      key: "article",
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="relative w-20 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 shadow-2xs">
            <img
              src={record.image}
              alt={record.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/news/news-club-hero.jpg";
              }}
            />
            {record.isFeatured && (
              <span className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1 rounded shadow">
                HOT
              </span>
            )}
          </div>
          <div className="min-w-0 max-w-md">
            <div className="flex items-center gap-1.5 mb-1">
              <Tag color={record.tagColor} className="!text-[11px] !px-1.5 !py-0 !leading-none font-bold">
                {record.categoryLabel}
              </Tag>
              {record.isFeatured && (
                <Tag color="gold" className="!text-[11px] !px-1.5 !py-0 !leading-none font-bold">
                  Nổi bật
                </Tag>
              )}
            </div>
            <Typography.Text
              strong
              className="!text-slate-900 !text-sm block truncate hover:!text-emerald-600 cursor-pointer font-bold"
              onClick={() => handleOpenPreview(record)}
            >
              {record.title}
            </Typography.Text>
            <Typography.Text className="!text-xs !text-slate-500 block truncate">
              {record.excerpt}
            </Typography.Text>
          </div>
        </div>
      ),
    },
    {
      title: "Tác giả / Ngày đăng",
      key: "author",
      width: 170,
      render: (_, record) => (
        <div>
          <div className="flex items-center gap-1 text-xs text-slate-800 font-semibold">
            <UserOutlined className="text-emerald-600 text-xs" />
            <span>{record.author}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
            <CalendarOutlined className="text-slate-400" />
            <span>{record.date}</span>
            <span>•</span>
            <span>{record.readTime}</span>
          </div>
        </div>
      ),
    },
    {
      title: "Lượt xem",
      key: "views",
      width: 110,
      render: (_, record) => (
        <div className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 w-fit">
          <EyeOutlined />
          <span>{record.viewCount.toLocaleString()}</span>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 130,
      render: (_, record) => {
        if (record.status === "published") {
          return (
            <Tag color="green" className="!inline-flex !items-center !gap-1 !font-bold">
              <CheckCircleOutlined /> Đã xuất bản
            </Tag>
          );
        }
        if (record.status === "draft") {
          return (
            <Tag color="orange" className="!inline-flex !items-center !gap-1 !font-bold">
              <ClockCircleOutlined /> Bản nháp
            </Tag>
          );
        }
        return <Tag color="blue" className="!font-bold">Lên lịch</Tag>;
      },
    },
    {
      title: "Ghim nổi bật",
      key: "featured",
      width: 110,
      render: (_, record) => (
        <Button
          size="sm"
          variant={record.isFeatured ? "primary" : "outline"}
          leftIcon={<PushpinOutlined />}
          onClick={(e) => handleToggleFeature(record.id, e)}
          className={
            record.isFeatured
              ? "!bg-amber-500 !border-amber-500 !text-white !font-bold shadow-2xs"
              : "!border-slate-300 !text-slate-600 hover:!border-amber-400"
          }
        >
          {record.isFeatured ? "Đã ghim" : "Ghim"}
        </Button>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 130,
      render: (_, record) => (
        <div className="flex items-center gap-1.5">
          <Tooltip title="Xem trước giao diện">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<EyeOutlined />}
              onClick={() => handleOpenPreview(record)}
              className="!border-slate-300 !text-slate-700 hover:!bg-emerald-50 hover:!text-emerald-700 hover:!border-emerald-300"
            />
          </Tooltip>
          <Tooltip title="Chỉnh sửa bài viết">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
              className="!border-slate-300 !text-slate-700 hover:!bg-amber-50 hover:!text-amber-700 hover:!border-amber-300"
            />
          </Tooltip>
          <Tooltip title="Gỡ bài viết">
            <Button
              size="sm"
              variant="danger"
              leftIcon={<DeleteOutlined />}
              onClick={(e) => handleDeleteArticle(record.id, record.title, e)}
            />
          </Tooltip>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Page Header (Light Theme) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-emerald-50 via-teal-50 to-transparent rounded-full blur-3xl pointer-events-none opacity-60 -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-2xl shadow-2xs">
              <ReadOutlined />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Title level={2} className="!text-xl md:!text-2xl !font-black !text-slate-900 !mb-0 tracking-tight">
                  Quản Lý Tin Tức & Bản Tin CLB
                </Title>
                <Tag color="green" className="!px-2.5 !py-0.5 !text-xs !font-black !rounded-full">
                  CUEZONE CMS
                </Tag>
              </div>
              <Text className="!text-xs md:!text-sm !text-slate-500">
                Biên tập khuyến mãi giờ vàng, giải đấu cọ xát, cẩm nang kỹ thuật và chính sách hội viên VIP
              </Text>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              variant="outline"
              leftIcon={<BellOutlined />}
              onClick={() => setPushModalVisible(true)}
              className="!border-amber-300 !text-amber-800 !bg-amber-50/70 hover:!bg-amber-100 font-semibold !rounded-xl !h-9 text-xs"
            >
              Gửi thông báo Push
            </Button>

            <Button
              variant="outline"
              leftIcon={<ReloadOutlined />}
              onClick={handleResetData}
              className="!border-slate-200 !text-slate-700 hover:!bg-slate-50 !rounded-xl !h-9 text-xs"
            >
              Khôi phục mẫu
            </Button>

            <Button
              variant="primary"
              leftIcon={<PlusOutlined />}
              onClick={handleOpenCreate}
              className="!bg-emerald-600 hover:!bg-emerald-700 !border-emerald-600 font-bold !rounded-xl !h-9 text-xs text-white shadow-2xs"
            >
              Tạo bài viết mới
            </Button>
          </div>
        </div>
      </div>

      {/* ── 2. Metric KPI Cards (Clean Light Theme) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Tổng bài viết</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">5 Chuyên mục nội dung</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            <FileTextOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-teal-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Đang xuất bản (Public)</span>
            <div className="text-2xl font-black text-teal-700 mt-1">{metrics.published}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Hiển thị trên App Khách hàng</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 text-xl">
            <CheckCircleOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-amber-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Đã ghim nổi bật (Hot)</span>
            <div className="text-2xl font-black text-amber-700 mt-1">{metrics.featured}</div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Ưu tiên vị trí Top Banner</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl">
            <PushpinOutlined />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:border-indigo-300 transition-all flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 block font-medium">Tổng lượt tiếp cận</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">
              {metrics.totalViews.toLocaleString()}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-0.5 block">Tăng +24% tháng này</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 text-xl">
            <EyeOutlined />
          </div>
        </div>
      </div>

      {/* ── 3. Filters & View Control Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Tìm tiêu đề, tác giả..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
              />
            </div>

            <div className="w-full sm:w-48">
              <Select
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val)}
                className="w-full"
                options={[
                  { label: "Tất cả chuyên mục", value: "all" },
                  { label: "Khuyến Mãi", value: "promo" },
                  { label: "Giải Đấu", value: "tournament" },
                  { label: "Mẹo & Kỹ Thuật", value: "tips" },
                  { label: "Sự Kiện CLB", value: "event" },
                  { label: "Thông Báo", value: "announcement" },
                ]}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                value={selectedStatus}
                onChange={(val) => setSelectedStatus(val)}
                className="w-full"
                options={[
                  { label: "Tất cả trạng thái", value: "all" },
                  { label: "Đã xuất bản", value: "published" },
                  { label: "Bài ghim nổi bật", value: "featured" },
                  { label: "Bản nháp", value: "draft" },
                ]}
              />
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <span className="text-xs text-slate-500 font-medium mr-1">Hiển thị:</span>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "primary" : "outline"}
              leftIcon={<AppstoreOutlined />}
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "!bg-emerald-600 font-bold" : "!border-slate-300 !text-slate-700"}
            >
              Thẻ ảnh
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "primary" : "outline"}
              leftIcon={<BarsOutlined />}
              onClick={() => setViewMode("table")}
              className={viewMode === "table" ? "!bg-emerald-600 font-bold" : "!border-slate-300 !text-slate-700"}
            >
              Danh sách
            </Button>
          </div>
        </div>
      </div>

      {/* ── 4. Main Articles Content ── */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <FileTextOutlined className="text-4xl text-slate-400 mb-2" />
              <Title level={4} className="!text-slate-800 !text-base !mb-1">
                Không tìm thấy bài viết nào
              </Title>
              <Text className="!text-xs !text-slate-500">
                Thử đổi từ khóa tìm kiếm hoặc lọc theo chuyên mục khác
              </Text>
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-emerald-400 hover:shadow-md transition-all duration-300 flex flex-col group shadow-xs"
              >
                {/* Image Cover */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = "/news/news-club-hero.jpg";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                    <Tag
                      color={article.tagColor}
                      className="!text-[11px] !font-bold !px-2.5 !py-0.5 !rounded-full shadow-md"
                    >
                      {article.categoryLabel}
                    </Tag>
                    {article.isFeatured && (
                      <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                        <PushpinOutlined /> Nổi bật
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-3 right-3">
                    {article.status === "published" ? (
                      <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <CheckCircleOutlined /> Đang hiển thị
                      </span>
                    ) : (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1">
                        <ClockCircleOutlined /> Bản nháp
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Meta: Views & Read time */}
                  <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-white">
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      <EyeOutlined className="text-emerald-400" />
                      {article.viewCount.toLocaleString()} lượt đọc
                    </span>
                    <span className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      <ClockCircleOutlined className="text-slate-300" />
                      {article.readTime}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <Typography.Title
                      level={4}
                      className="!text-slate-900 !text-base !font-bold !mb-2 line-clamp-2 group-hover:!text-emerald-600 transition-colors cursor-pointer leading-snug"
                      onClick={() => handleOpenPreview(article)}
                    >
                      {article.title}
                    </Typography.Title>
                    <Typography.Paragraph className="!text-xs !text-slate-500 line-clamp-2 !mb-0 leading-relaxed">
                      {article.excerpt}
                    </Typography.Paragraph>
                  </div>

                  {/* Author & Actions Footer */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-3 text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">
                          {article.author.charAt(0)}
                        </div>
                        <span className="text-slate-700 font-semibold truncate max-w-[140px]">
                          {article.author}
                        </span>
                      </div>
                      <span className="text-slate-400">{article.date}</span>
                    </div>

                    {/* Quick Button Group */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<EyeOutlined />}
                        className="flex-1 !text-xs !border-slate-200 !text-slate-700 hover:!bg-emerald-50 hover:!text-emerald-700 hover:!border-emerald-300 font-semibold"
                        onClick={() => handleOpenPreview(article)}
                      >
                        Xem trước
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<EditOutlined />}
                        className="flex-1 !text-xs !border-slate-200 !text-slate-700 hover:!bg-amber-50 hover:!text-amber-700 hover:!border-amber-300 font-semibold"
                        onClick={() => handleOpenEdit(article)}
                      >
                        Sửa
                      </Button>
                      <Tooltip title={article.isFeatured ? "Bỏ ghim bài viết" : "Ghim lên đầu"}>
                        <Button
                          size="sm"
                          variant={article.isFeatured ? "primary" : "outline"}
                          leftIcon={<PushpinOutlined />}
                          onClick={(e) => handleToggleFeature(article.id, e)}
                          className={
                            article.isFeatured
                              ? "!bg-amber-500 !border-amber-500 !text-white shadow-2xs"
                              : "!border-slate-200 !text-slate-500 hover:!text-amber-600"
                          }
                        />
                      </Tooltip>
                      <Tooltip title="Gỡ bài viết">
                        <Button
                          size="sm"
                          variant="danger"
                          leftIcon={<DeleteOutlined />}
                          onClick={(e) => handleDeleteArticle(article.id, article.title, e)}
                        />
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-0 overflow-hidden shadow-xs">
          <Table<NewsArticleItem>
            dataSource={filteredArticles}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 8 }}
          />
        </div>
      )}

      {/* ── 5. Modal: Create Article ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <PlusOutlined className="text-emerald-600" />
            <span>Tạo Bài Viết / Thông Báo Mới</span>
          </div>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        width={780}
        footer={[
          <Button key="cancel" variant="ghost" onClick={() => setCreateModalVisible(false)}>
            Hủy bỏ
          </Button>,
          <Button key="save" variant="primary" onClick={handleSaveCreate} leftIcon={<CheckCircleOutlined />}>
            Đăng bài viết
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề bài viết <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="VD: Chương Trình Giờ Vàng: Giảm 20% Tiền Bàn Từ 13:00 Đến 17:00..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyên mục</label>
              <Select
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val as NewsCategory })}
                className="w-full"
                options={[
                  { label: "Khuyến Mãi (Giờ vàng, Voucher)", value: "promo" },
                  { label: "Giải Đấu (Championship, Giao lưu)", value: "tournament" },
                  { label: "Mẹo & Kỹ Thuật (Hướng dẫn đánh cơ)", value: "tips" },
                  { label: "Sự Kiện CLB (Hội viên VIP, Gặp gỡ)", value: "event" },
                  { label: "Thông Báo (Bảo trì nỉ bàn, Giờ mở cửa)", value: "announcement" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái phát hành</label>
              <Select
                value={formData.status}
                onChange={(val) =>
                  setFormData({ ...formData, status: val as NewsArticleItem["status"] })
                }
                className="w-full"
                options={[
                  { label: "Xuất bản ngay (Hiển thị công khai)", value: "published" },
                  { label: "Lưu bản nháp (Chưa công khai)", value: "draft" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn ảnh bìa bài viết (Chuẩn tỉ lệ 16:9 sắc nét)
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {AVAILABLE_COVERS.map((cov) => (
                <div
                  key={cov.url}
                  onClick={() => setFormData({ ...formData, image: cov.url })}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-[16/9] relative group ${
                    formData.image === cov.url
                      ? "border-emerald-600 ring-2 ring-emerald-500/30"
                      : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
                  }`}
                >
                  <img src={cov.url} alt={cov.label} className="w-full h-full object-cover" />
                  {formData.image === cov.url && (
                    <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                      <CheckCircleOutlined className="text-white text-base drop-shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Input
              placeholder="Hoặc nhập đường dẫn ảnh tùy chỉnh (URL)..."
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trích dẫn ngắn gọn (Excerpt / Tóm tắt) <span className="text-rose-500">*</span>
            </label>
            <Input.TextArea
              rows={2}
              placeholder="Tóm tắt 1-2 câu hiển thị ở danh sách bài viết trên App..."
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung chi tiết bài viết (Cách nhau 2 dòng trống để chia đoạn)
            </label>
            <Input.TextArea
              rows={5}
              placeholder="Nhập nội dung đầy đủ của bài viết..."
              value={formData.contentString}
              onChange={(e) => setFormData({ ...formData, contentString: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tác giả biên tập</label>
              <Input
                placeholder="VD: Ban Quản Lý CueZone"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian đọc ước tính</label>
              <Input
                placeholder="VD: 3 phút đọc"
                value={formData.readTime}
                onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="font-bold text-amber-700">Ghim bài viết lên vị trí Nổi Bật (Top Banner)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
              <input
                type="checkbox"
                checked={formData.sendPush}
                onChange={(e) => setFormData({ ...formData, sendPush: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span>Gửi thông báo đẩy (Push Notification) đến toàn bộ ứng dụng khách hàng ngay khi đăng</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* ── 6. Modal: Edit Article ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <EditOutlined className="text-amber-600" />
            <span>Chỉnh Sửa Bài Viết</span>
          </div>
        }
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setSelectedArticle(null);
        }}
        width={780}
        footer={[
          <Button
            key="cancel"
            variant="ghost"
            onClick={() => {
              setEditModalVisible(false);
              setSelectedArticle(null);
            }}
          >
            Hủy bỏ
          </Button>,
          <Button key="save" variant="primary" onClick={handleSaveEdit} leftIcon={<CheckCircleOutlined />}>
            Lưu thay đổi
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề bài viết <span className="text-rose-500">*</span>
            </label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyên mục</label>
              <Select
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val as NewsCategory })}
                className="w-full"
                options={[
                  { label: "Khuyến Mãi", value: "promo" },
                  { label: "Giải Đấu", value: "tournament" },
                  { label: "Mẹo & Kỹ Thuật", value: "tips" },
                  { label: "Sự Kiện CLB", value: "event" },
                  { label: "Thông Báo", value: "announcement" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Trạng thái phát hành</label>
              <Select
                value={formData.status}
                onChange={(val) =>
                  setFormData({ ...formData, status: val as NewsArticleItem["status"] })
                }
                className="w-full"
                options={[
                  { label: "Đã xuất bản (Công khai)", value: "published" },
                  { label: "Bản nháp (Ẩn)", value: "draft" },
                ]}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ảnh bìa bài viết</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2">
              {AVAILABLE_COVERS.map((cov) => (
                <div
                  key={cov.url}
                  onClick={() => setFormData({ ...formData, image: cov.url })}
                  className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-[16/9] relative group ${
                    formData.image === cov.url
                      ? "border-emerald-600 ring-2 ring-emerald-500/30"
                      : "border-slate-200 opacity-70 hover:opacity-100 hover:border-slate-400"
                  }`}
                >
                  <img src={cov.url} alt={cov.label} className="w-full h-full object-cover" />
                  {formData.image === cov.url && (
                    <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center">
                      <CheckCircleOutlined className="text-white text-base drop-shadow" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Input
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tóm tắt ngắn (Excerpt)</label>
            <Input.TextArea
              rows={2}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung chi tiết</label>
            <Input.TextArea
              rows={6}
              value={formData.contentString}
              onChange={(e) => setFormData({ ...formData, contentString: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tác giả</label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Thời gian đọc</label>
              <Input
                value={formData.readTime}
                onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-800">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="font-bold text-amber-700">Ghim bài viết lên vị trí Nổi Bật (Top Banner)</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* ── 7. Modal: Live Article Preview (Reading Experience) ── */}
      <Modal
        title={
          <div className="flex items-center justify-between text-slate-900 pr-6">
            <div className="flex items-center gap-2 font-bold">
              <EyeOutlined className="text-emerald-600" />
              <span>Xem Trước Bản Tin (Customer App View)</span>
            </div>
            {selectedArticle && (
              <Tag color={selectedArticle.tagColor} className="!text-xs !font-bold">
                {selectedArticle.categoryLabel}
              </Tag>
            )}
          </div>
        }
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false);
          setSelectedArticle(null);
        }}
        width={760}
        footer={[
          <Button
            key="close"
            variant="outline"
            onClick={() => {
              setPreviewModalVisible(false);
              setSelectedArticle(null);
            }}
          >
            Đóng xem trước
          </Button>,
          selectedArticle && (
            <Button
              key="edit"
              variant="primary"
              leftIcon={<EditOutlined />}
              onClick={() => {
                const art = selectedArticle;
                setPreviewModalVisible(false);
                handleOpenEdit(art);
              }}
            >
              Chỉnh sửa bài này
            </Button>
          ),
        ]}
      >
        {selectedArticle && (
          <div className="space-y-5 py-2">
            {/* Banner Cover */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200 bg-black shadow-md">
              <img
                src={selectedArticle.image}
                alt={selectedArticle.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/news/news-club-hero.jpg";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag color={selectedArticle.tagColor} className="!font-bold">
                    {selectedArticle.categoryLabel}
                  </Tag>
                  {selectedArticle.isFeatured && (
                    <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      <PushpinOutlined /> Nổi bật
                    </span>
                  )}
                </div>
                <Typography.Title level={3} className="!text-white !text-xl md:!text-2xl !font-black !mb-0 drop-shadow-md leading-tight">
                  {selectedArticle.title}
                </Typography.Title>
              </div>
            </div>

            {/* Author Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
                  {selectedArticle.author.charAt(0)}
                </div>
                <div>
                  <div className="text-slate-900 font-bold">{selectedArticle.author}</div>
                  <div className="text-[11px] text-slate-500">{selectedArticle.authorRole}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <CalendarOutlined /> {selectedArticle.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <ClockCircleOutlined /> {selectedArticle.readTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <EyeOutlined /> {selectedArticle.viewCount.toLocaleString()} lượt đọc
                </span>
              </div>
            </div>

            {/* Excerpt Lead Box */}
            <div className="p-4 rounded-xl bg-emerald-50 border-l-4 border-emerald-600 text-slate-800 text-sm leading-relaxed italic">
              "{selectedArticle.excerpt}"
            </div>

            {/* Content Paragraphs */}
            <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
              {selectedArticle.content.map((p, idx) => (
                <p key={idx} className="!mb-0 text-justify">
                  {p}
                </p>
              ))}
            </div>

            {/* Footer Tip Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
                  <ThunderboltOutlined />
                </div>
                <div>
                  <div className="text-slate-900 text-xs font-bold">Ưu đãi áp dụng trên toàn hệ thống CueZone</div>
                  <div className="text-[11px] text-slate-500">
                    Mở app để nhận thông báo giải đấu và đặt bàn trước
                  </div>
                </div>
              </div>
              <Button size="sm" variant="primary" leftIcon={<ShareAltOutlined />}>
                Chia sẻ bài viết
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── 8. Modal: Broadcast Push Notification ── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <BellOutlined className="text-amber-600" />
            <span>Gửi Thông Báo Đẩy Nhanh (Push Notification)</span>
          </div>
        }
        open={pushModalVisible}
        onCancel={() => setPushModalVisible(false)}
        width={540}
        footer={[
          <Button key="cancel" variant="ghost" onClick={() => setPushModalVisible(false)}>
            Hủy
          </Button>,
          <Button
            key="send"
            variant="primary"
            leftIcon={<SendOutlined />}
            onClick={handleSendBroadcastPush}
            className="!bg-amber-600 hover:!bg-amber-700 !border-amber-600 text-white font-bold"
          >
            Phát sóng thông báo
          </Button>,
        ]}
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kênh đối tượng nhận tin
            </label>
            <Select
              value={pushChannel}
              onChange={(val) => setPushChannel(val)}
              className="w-full"
              options={[
                { label: "Toàn bộ Hội viên CueZone (Tất cả tài khoản)", value: "all" },
                { label: "Hội viên Kim Cương & Khách VIP (Diamond Club)", value: "vip" },
                { label: "Vận động viên tham gia giải đấu", value: "tourney" },
              ]}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề thông báo <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="VD: [HOT] Giờ vàng giảm 20% tiền bàn hôm nay bắt đầu lúc 13:00!"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung thông báo (Tối đa 160 ký tự) <span className="text-rose-500">*</span>
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập thông điệp ngắn gọn gửi trực tiếp đến màn hình khóa điện thoại của khách hàng..."
              value={pushMessage}
              onChange={(e) => setPushMessage(e.target.value)}
            />
          </div>

          <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
            <ThunderboltOutlined className="text-base text-amber-600 shrink-0 mt-0.5" />
            <span>
              Thông báo push sẽ được gửi tức thì qua dịch vụ Firebase Cloud Messaging (FCM) đến tất cả
              thiết bị di động của hội viên đã cài đặt ứng dụng CueZone.
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default NewsManagementPage;
