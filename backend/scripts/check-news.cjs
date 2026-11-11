const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { NewsArticle, generateSlug } = require("../dist/modules/news/news.model");
const { NewsService } = require("../dist/modules/news/news.service");

async function main() {
  const service = new NewsService();
  const originals = new Map();
  const replace = (target, key, value) => {
    if (!originals.has(target)) originals.set(target, new Map());
    if (!originals.get(target).has(key)) originals.get(target).set(key, target[key]);
    target[key] = value;
  };
  let server;
  try {
    mongoose.set("bufferCommands", false);
    const slug = generateSlug("Chương trình giờ vàng: Giảm 20% tiền bàn!");
    assert.match(slug, /^chuong-trinh-gio-vang-giam-20-tien-ban-/);
    assert.notEqual(generateSlug("Trùng tiêu đề"), generateSlug("Trùng tiêu đề"));
    let filter;
    let options = {};
    replace(NewsArticle, "find", (query) => {
      filter = query;
      const chain = {
        sort: (value) => { options.sort = value; return chain; },
        skip: (value) => { options.skip = value; return chain; },
        limit: (value) => { options.limit = value; return chain; },
        lean: async () => [],
      };
      return chain;
    });
    replace(NewsArticle, "countDocuments", async () => 23);
    const publicList = await service.getPublicArticles({ search: "([a]+)", category: "promo", page: "2", limit: "5" });
    assert.equal(filter.status, "published");
    assert.equal(filter.category, "promo");
    assert(filter.$or[0].title.test("Ưu đãi ([a]+)"));
    assert(!filter.$or[0].title.test("aaaa"));
    assert.equal(options.sort.publishedAt, -1);
    assert.equal(options.skip, 5);
    assert.equal(options.limit, 5);
    assert.deepEqual(publicList.pagination, { page: 2, limit: 5, total: 23, totalPages: 5 });
    await service.getAdminArticles({ status: "draft", limit: "100" });
    assert.equal(filter.status, "draft");
    assert.equal(options.limit, 50);
    await service.getAdminArticles({ status: "featured" });
    assert.equal(filter.isFeatured, true);
    for (const query of [{ search: {} }, { search: "x".repeat(201) }, { page: "Infinity" },
      { page: "1.5" }, { limit: 0 }, { category: "__proto__" }, { status: "other" }]) {
      await assert.rejects(service.getAdminArticles(query), { httpCode: 400 });
    }
    let detailQuery;
    replace(NewsArticle, "findOneAndUpdate", (query, update) => {
      detailQuery = query;
      assert.deepEqual(update, { $inc: { viewCount: 1 } });
      return { lean: async () => null };
    });
    await assert.rejects(service.getPublicArticleDetail("khong-ton-tai"), { httpCode: 404 });
    assert.equal(detailQuery.status, "published");
    await assert.rejects(service.getById("invalid"), { httpCode: 400 });
    replace(NewsArticle, "findById", () => ({ lean: async () => null }));
    await assert.rejects(service.getById("0123456789abcdef01234567"), { httpCode: 404 });
    for (const input of [null, [], { title: {} }, { title: "" }, { title: "Tin", status: "scheduled" },
      { title: "Tin", image: "javascript:alert(1)" }, { title: "Tin", content: [{}] }]) {
      await assert.rejects(service.create(input), { httpCode: 400 });
    }
    replace(NewsArticle.prototype, "save", async function () { await this.validate(); return this; });
    const draft = await service.create({ title: "Tin mới", viewCount: 999, slug: "tuy-chinh", publishedAt: new Date(), pushNotificationSent: true });
    assert.equal(draft.status, "draft");
    assert.equal(draft.viewCount, 0);
    assert.equal(draft.publishedAt, undefined);
    assert.equal(draft.pushNotificationSent, false);
    assert.notEqual(draft.slug, "tuy-chinh");
    const published = await service.create({ title: "Tin xuất bản", status: "published", category: "event" });
    assert(published.publishedAt instanceof Date);
    assert.equal(published.categoryLabel, "Sự Kiện");
    const originalSlug = draft.slug;
    replace(NewsArticle, "findById", async () => draft);
    await service.update(String(draft._id), { title: "Tiêu đề đã sửa", status: "published", viewCount: 100, slug: "ghi-de" });
    assert.equal(draft.slug, originalSlug);
    assert.equal(draft.viewCount, 0);
    assert(draft.publishedAt instanceof Date);
    const { App } = require("../dist/app");
    server = new App().app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}/api/v1`;
    const anonymousAdmin = await fetch(`${base}/news`);
    assert.equal(anonymousAdmin.status, 401);
    const publicResponse = await fetch(`${base}/public/news?search=%28`);
    assert.equal(publicResponse.status, 200);
    const body = await publicResponse.json();
    assert(Array.isArray(body.data.articles));
    assert.equal(body.data.pagination.total, 23);
    const oldConsoleError = console.error;
    console.error = () => {};
    try {
      assert.equal((await fetch(`${base}/public/news?page=Infinity`)).status, 400);
      assert.equal((await fetch(`${base}/public/news/khong-ton-tai`)).status, 404);
    } finally { console.error = oldConsoleError; }
    const { publicRouter } = require("../dist/routes");
    const newsMounts = publicRouter.stack.filter((layer) => layer.handle?.stack?.some((route) => route.route?.path === "/:slugOrId"));
    assert.equal(newsMounts.length, 1);
    console.log("Đạt: slug, truy vấn thực, phân trang, dữ liệu đầu vào, lỗi HTTP, xuất bản, route công khai/quản trị.");
    console.log("Giới hạn: thay thế phương thức model trong bộ nhớ; không kết nối hoặc ghi MongoDB, không kiểm thử Cloudinary thật.");
  } finally {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    for (const [target, entries] of originals) for (const [key, value] of entries) target[key] = value;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
