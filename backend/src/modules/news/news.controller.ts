import { Request, Response, NextFunction } from "express";
import { NewsService } from "./news.service";

const newsService = new NewsService();

export const getPublicArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await newsService.getPublicArticles({
      category: req.query.category as string,
      search: req.query.search as string,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({
      success: true,
      message: "Lấy danh sách tin tức thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublicArticleDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slugOrId = req.params.slugOrId;
    const result = await newsService.getPublicArticleDetail(slugOrId);
    res.json({
      success: true,
      message: "Lấy chi tiết tin tức thành công",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const articles = await newsService.getAdminArticles({
      status: req.query.status as string,
      category: req.query.category as string,
      search: req.query.search,
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({
      success: true,
      message: "Lấy danh sách bài viết quản trị thành công",
      data: articles,
    });
  } catch (error) {
    next(error);
  }
};

export const getArticleById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await newsService.getById(req.params.id);
    res.json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const createArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await newsService.create(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo bài viết mới thành công",
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const updateArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await newsService.update(req.params.id, req.body);
    res.json({
      success: true,
      message: "Cập nhật bài viết thành công",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await newsService.delete(req.params.id);
    res.json({
      success: true,
      message: "Xóa bài viết thành công",
      data: deleted,
    });
  } catch (error) {
    next(error);
  }
};

export const uploadBanner = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn tệp hình ảnh để tải lên",
      });
    }

    const bannerUrl = await newsService.uploadBanner(req.file.buffer);
    res.json({ success: true, message: "Tải lên ảnh bìa thành công", data: { url: bannerUrl } });
  } catch (error) {
    next(error);
  }
};
