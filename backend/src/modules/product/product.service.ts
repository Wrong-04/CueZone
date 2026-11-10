import mongoose from "mongoose";
import { Product, IProduct } from "./product.model";
import Category from "./category.model";
import { CreateProductDTO, UpdateProductDTO } from "./dto/product.dto";
import { uploadProductImage } from "../../config/cloudinary.config";

const FNB_CATEGORY_CODES = ["drink", "food", "snack"];

export async function getFnbCategoryConfig(session?: mongoose.ClientSession) {
  let query = Category.find().select("_id code name isActive").lean();
  if (session) query = query.session(session);
  const categories = await query;
  const categoriesByCode = new Map(categories.map((category) => [category.code, category]));
  const legacyCategoryCodes = FNB_CATEGORY_CODES.filter(
    (code) => !categoriesByCode.has(code) || categoriesByCode.get(code)?.isActive !== false,
  );
  const activeCategories = categories.filter(
    (category) => category.isActive !== false && FNB_CATEGORY_CODES.includes(category.code),
  );

  return {
    values: [
      ...legacyCategoryCodes,
      ...activeCategories.map((category) => String(category._id)),
    ],
    names: new Map(
      activeCategories.map((category) => [
        String(category._id),
        category.name || category.code,
      ]),
    ),
  };
}

export class ProductService {
  async getFnbMenu(): Promise<any[]> {
    const categoryConfig = await getFnbCategoryConfig();
    const products = await Product.find({
      category: { $in: categoryConfig.values },
      isForSale: true,
      isActive: true,
    }).sort({ category: 1, name: 1 });

    return products.map((p) => {
      const rawCat = String(p.category || "").trim();
      const resolvedCategory = categoryConfig.names.get(rawCat) || rawCat;

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: resolvedCategory,
        unit: p.unit || "Phần",
        salePrice: p.salePrice,
        imageUrl: p.imageUrl,
        description: p.description,
        stock: p.stock,
        isMadeToOrder: Boolean(p.isMadeToOrder),
        isOutOfStock: p.isMadeToOrder ? !p.isForSale : p.stock === 0,
      };
    });
  }

  async getAll(): Promise<IProduct[]> {
    return Product.find().sort({ name: 1 });
  }

  async getById(id: string): Promise<IProduct> {
    const product = await Product.findById(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    return product;
  }

  async replaceImage(id: string, buffer: Buffer): Promise<IProduct> {
    const product = await Product.findById(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    const uploadedImage = await uploadProductImage(buffer);
    product.imageUrl = uploadedImage.secure_url;
    await product.save();

    return product;
  }

  async create(dto: CreateProductDTO): Promise<IProduct> {
    return Product.create(dto);
  }

  async update(id: string, dto: UpdateProductDTO): Promise<IProduct> {
    const product = await Product.findByIdAndUpdate(id, dto, { new: true });
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    return product;
  }

  async delete(id: string): Promise<void> {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");
  }
}
