import mongoose from "mongoose";
import { NewsArticle, INewsArticle } from "./news.model";
import { uploadNewsImage } from "../../config/cloudinary.config";

export interface CreateNewsDTO {
  title: string;
  category?: INewsArticle["category"];
  status?: "draft" | "published";
  isFeatured?: boolean;
  author?: string;
  authorRole?: string;
  readTime?: string;
  image?: string;
  excerpt?: string;
  content?: string[];
}

export type UpdateNewsDTO = Partial<CreateNewsDTO>;

export interface GetNewsQuery {
  category?: unknown;
  search?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
}

const categoryMeta = {
  promo: { categoryLabel: "Khuyến Mãi", tagColor: "red" },
  tournament: { categoryLabel: "Giải Đấu", tagColor: "gold" },
  tips: { categoryLabel: "Mẹo & Kỹ Thuật", tagColor: "cyan" },
  event: { categoryLabel: "Sự Kiện", tagColor: "purple" },
  announcement: { categoryLabel: "Thông Báo", tagColor: "blue" },
};

const invalidInput = (message: string) => Object.assign(new Error(message), { httpCode: 400 });

function queryText(value: unknown): string {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > 200) {
    throw invalidInput("Tham số tìm kiếm không hợp lệ hoặc vượt quá 200 ký tự");
  }
  return value.trim();
}

function pageNumber(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  if (typeof value !== "string" && typeof value !== "number") {
    throw invalidInput("Tham số phân trang không hợp lệ");
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) {
    throw invalidInput("Tham số phân trang phải là số nguyên dương");
  }
  return number;
}

function articleInput(input: unknown, partial = false): UpdateNewsDTO {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw invalidInput("Thông tin bài viết không hợp lệ");
  }
  const data = input as Record<string, unknown>;
  const result: UpdateNewsDTO = {};
  const stringLimits = {
    title: 300, author: 120, authorRole: 120, readTime: 50, image: 2048, excerpt: 2000,
  } as const;
  for (const key of Object.keys(stringLimits) as (keyof typeof stringLimits)[]) {
    if (data[key] === undefined) continue;
    if (typeof data[key] !== "string" || data[key].length > stringLimits[key]) {
      throw invalidInput(`Trường ${key} không hợp lệ hoặc quá dài`);
    }
    result[key] = data[key].trim();
  }
  if ((!partial || result.title !== undefined) && !result.title) {
    throw invalidInput("Tiêu đề bài viết không được để trống");
  }
  if (data.category !== undefined) {
    if (typeof data.category !== "string" || !Object.prototype.hasOwnProperty.call(categoryMeta, data.category)) {
      throw invalidInput("Chuyên mục không hợp lệ");
    }
    result.category = data.category as INewsArticle["category"];
  }
  if (data.status !== undefined) {
    if (data.status !== "draft" && data.status !== "published") {
      throw invalidInput("Chỉ hỗ trợ bản nháp hoặc xuất bản ngay");
    }
    result.status = data.status;
  }
  if (data.isFeatured !== undefined) {
    if (typeof data.isFeatured !== "boolean") throw invalidInput("Trạng thái ghim không hợp lệ");
    result.isFeatured = data.isFeatured;
  }
  if (data.content !== undefined) {
    if (!Array.isArray(data.content) || data.content.length > 200 ||
      data.content.some((paragraph) => typeof paragraph !== "string") ||
      data.content.join("").length > 100000) {
      throw invalidInput("Nội dung phải là các đoạn văn bản, tối đa 100.000 ký tự và 200 đoạn");
    }
    result.content = data.content.map((paragraph: string) => paragraph.trim()).filter(Boolean);
  }
  if (result.image) {
    const localCover = /^\/news\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(result.image);
    let secureUrl = false;
    try {
      const url = new URL(result.image);
      secureUrl = url.protocol === "https:" && !url.username && !url.password;
    } catch {
      secureUrl = false;
    }
    if (!localCover && !secureUrl) throw invalidInput("Ảnh bìa phải là URL HTTPS hoặc ảnh trong /news/");
  }
  return result;
}

export class NewsService {
  private async list(query: GetNewsQuery, publicOnly: boolean) {
    const filter: mongoose.FilterQuery<INewsArticle> = publicOnly ? { status: "published" } : {};
    const category = queryText(query.category);
    if (category && category !== "all") {
      if (!Object.prototype.hasOwnProperty.call(categoryMeta, category)) throw invalidInput("Chuyên mục không hợp lệ");
      filter.category = category;
    }
    const status = queryText(query.status);
    if (!publicOnly && status && status !== "all") {
      if (status === "featured") filter.isFeatured = true;
      else if (["draft", "published", "scheduled"].includes(status)) filter.status = status;
      else throw invalidInput("Trạng thái bài viết không hợp lệ");
    }
    const search = queryText(query.search);
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { excerpt: regex }, ...(!publicOnly ? [{ author: regex }] : [])];
    }
    const page = pageNumber(query.page, 1);
    const limit = Math.min(50, pageNumber(query.limit, 20));
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip)) throw invalidInput("Trang yêu cầu quá lớn");
    const [articles, total] = await Promise.all([
      NewsArticle.find(filter).sort({ isFeatured: -1, publishedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip).limit(limit).lean(),
      NewsArticle.countDocuments(filter),
    ]);
    return { articles, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  getPublicArticles(query: GetNewsQuery) {
    return this.list(query, true);
  }

  getAdminArticles(query: GetNewsQuery) {
    return this.list(query, false);
  }

  async getPublicArticleDetail(slugOrId: string) {
    const query = mongoose.isValidObjectId(slugOrId)
      ? { $or: [{ _id: slugOrId }, { slug: slugOrId }], status: "published" }
      : { slug: slugOrId, status: "published" };
    const article = await NewsArticle.findOneAndUpdate(query, { $inc: { viewCount: 1 } }, { new: true }).lean();
    if (!article) {
      throw Object.assign(new Error("Không tìm thấy bài viết hoặc bài viết chưa được xuất bản"), { httpCode: 404 });
    }
    const related = await NewsArticle.find({
      _id: { $ne: article._id }, category: article.category, status: "published",
    }).sort({ createdAt: -1 }).limit(3).lean();
    return { article, related };
  }

  async getById(id: string) {
    if (!mongoose.isValidObjectId(id)) throw invalidInput("ID bài viết không hợp lệ");
    const article = await NewsArticle.findById(id).lean();
    if (!article) throw Object.assign(new Error("Không tìm thấy bài viết"), { httpCode: 404 });
    return article;
  }

  async create(input: unknown) {
    const data = articleInput(input);
    const category = data.category || "promo";
    const status = data.status || "draft";
    const article = new NewsArticle({
      ...data, category, status, ...categoryMeta[category],
      date: new Intl.DateTimeFormat("vi-VN").format(new Date()),
      publishedAt: status === "published" ? new Date() : undefined,
    });
    return article.save();
  }

  async update(id: string, input: unknown) {
    if (!mongoose.isValidObjectId(id)) throw invalidInput("ID bài viết không hợp lệ");
    const data = articleInput(input, true);
    const existing = await NewsArticle.findById(id);
    if (!existing) throw Object.assign(new Error("Không tìm thấy bài viết để cập nhật"), { httpCode: 404 });
    if (data.status === "published" && existing.status !== "published" && !existing.publishedAt) {
      existing.publishedAt = new Date();
      existing.date = new Intl.DateTimeFormat("vi-VN").format(existing.publishedAt);
    }
    Object.assign(existing, data, data.category ? categoryMeta[data.category] : {});
    return existing.save();
  }

  async delete(id: string) {
    if (!mongoose.isValidObjectId(id)) throw invalidInput("ID bài viết không hợp lệ");
    const deleted = await NewsArticle.findByIdAndDelete(id);
    if (!deleted) throw Object.assign(new Error("Không tìm thấy bài viết để xóa"), { httpCode: 404 });
    return deleted;
  }

  async uploadBanner(buffer: Buffer): Promise<string> {
    const result = await uploadNewsImage(buffer);
    return result.secure_url;
  }
}
