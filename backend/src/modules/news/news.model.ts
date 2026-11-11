import mongoose, { Schema, Document } from "mongoose";
import { randomUUID } from "node:crypto";

export type NewsCategory = "promo" | "tournament" | "tips" | "event" | "announcement";
export type NewsStatus = "draft" | "published" | "scheduled";

export interface INewsArticle extends Document {
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
  publishedAt?: Date;
  pushNotificationSent?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NewsArticleSchema = new Schema<INewsArticle>(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ["promo", "tournament", "tips", "event", "announcement"],
      default: "promo",
    },
    categoryLabel: { type: String, default: "Khuyến Mãi" },
    tagColor: { type: String, default: "red" },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "scheduled"],
      default: "published",
      index: true,
    },
    isFeatured: { type: Boolean, default: false, index: true },
    author: { type: String, default: "Ban Quản Lý CueZone" },
    authorRole: { type: String, default: "Điều hành CLB" },
    date: { type: String, required: true },
    readTime: { type: String, default: "3 phút đọc" },
    viewCount: { type: Number, default: 0, min: 0 },
    image: { type: String, default: "/news/news-promo-goldhour.jpg" },
    excerpt: { type: String, default: "" },
    content: { type: [String], default: [] },
    publishedAt: { type: Date },
    pushNotificationSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export function generateSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  const uniqueSuffix = randomUUID();
  return `${cleanTitle}-${uniqueSuffix}`;
}

NewsArticleSchema.pre("validate", function (next) {
  if (this.title && !this.slug) {
    this.slug = generateSlug(this.title);
  }
  next();
});

export const NewsArticle = mongoose.model<INewsArticle>("NewsArticle", NewsArticleSchema);
