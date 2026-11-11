import api from "./api";

export type NewsCategory = "promo" | "tournament" | "tips" | "event" | "announcement";
export type NewsStatus = "draft" | "published" | "scheduled";

export interface NewsArticleItem {
  _id: string;
  title: string;
  slug: string;
  category: NewsCategory;
  categoryLabel: string;
  tagColor: string;
  status: NewsStatus;
  isFeatured: boolean;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  viewCount: number;
  image: string;
  excerpt: string;
  content: string[];
  publishedAt?: string;
  pushNotificationSent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicNewsResponse {
  articles: NewsArticleItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PublicNewsDetailResponse {
  article: NewsArticleItem;
  related: NewsArticleItem[];
}

export interface GetNewsParams {
  category?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export type NewsInput = Pick<NewsArticleItem,
  "title" | "category" | "isFeatured" | "author" | "authorRole" | "readTime" | "image" | "excerpt" | "content"
> & { status: "draft" | "published" };

export const newsService = {
  getPublicArticles: async (params?: GetNewsParams): Promise<PublicNewsResponse> => {
    const response = await api.get<{ success: boolean; data: PublicNewsResponse }>("/public/news", {
      params,
    });
    return response.data.data;
  },

  getPublicArticleDetail: async (slugOrId: string): Promise<PublicNewsDetailResponse> => {
    const response = await api.get<{ success: boolean; data: PublicNewsDetailResponse }>(
      `/public/news/${encodeURIComponent(slugOrId)}`,
    );
    return response.data.data;
  },

  getAdminArticles: async (params?: GetNewsParams): Promise<PublicNewsResponse> => {
    const response = await api.get<{ success: boolean; data: PublicNewsResponse }>("/news", {
      params,
    });
    return response.data.data;
  },

  getAdminArticleById: async (id: string): Promise<NewsArticleItem> => {
    const response = await api.get<{ success: boolean; data: NewsArticleItem }>(`/news/${id}`);
    return response.data.data;
  },

  createArticle: async (data: NewsInput): Promise<NewsArticleItem> => {
    const response = await api.post<{ success: boolean; data: NewsArticleItem }>("/news", data);
    return response.data.data;
  },

  updateArticle: async (id: string, data: Partial<NewsInput>): Promise<NewsArticleItem> => {
    const response = await api.put<{ success: boolean; data: NewsArticleItem }>(`/news/${id}`, data);
    return response.data.data;
  },

  deleteArticle: async (id: string): Promise<void> => {
    await api.delete(`/news/${id}`);
  },

  uploadBanner: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post<{ success: boolean; data: { url: string } }>(
      "/news/upload-banner",
      formData,
    );
    return response.data.data.url;
  },
};
