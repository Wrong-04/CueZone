import mongoose from "mongoose";
import { Product, IProduct } from "./product.model";
import Category from "./category.model";
import { CreateProductDTO, UpdateProductDTO } from "./dto/product.dto";
import { uploadProductImage } from "../../config/cloudinary.config";

export class ProductService {
  async getFnbMenu(): Promise<any[]> {
    const products = await Product.find({
      productType: "fnb",
      isForSale: true,
      isActive: true,
    }).sort({ category: 1, name: 1 });

    const rawCategoryValues = products.map((p) => String(p.category || "").trim());
    const objectIds = rawCategoryValues.filter((c) => mongoose.Types.ObjectId.isValid(c));
    const catMap = new Map<string, string>();

    if (objectIds.length > 0) {
      try {
        const foundCats = await Category.find({ _id: { $in: objectIds } }).lean();
        foundCats.forEach((c) => {
          catMap.set(c._id.toString(), c.name || c.code);
        });
      } catch (err) {
        console.error("Lỗi khi tìm danh mục F&B:", err);
      }
    }

    return products.map((p) => {
      const rawCat = String(p.category || "").trim();
      const resolvedCategory = catMap.get(rawCat) || rawCat;

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: resolvedCategory,
        productType: p.productType,
        unit: p.unit || "Phần",
        salePrice: p.salePrice,
        imageUrl: p.imageUrl,
        description: p.description,
        stock: p.stock,
        isMadeToOrder: Boolean(
          (p as any).isthemaketoorder ??
          (p as any).isTheMakeToOrder ??
          p.isMadeToOrder
        ),
        isOutOfStock: Boolean(
          (p as any).isthemaketoorder ??
          (p as any).isTheMakeToOrder ??
          p.isMadeToOrder
        )
          ? !p.isForSale
          : p.stock === 0,
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

  async uploadDirectImage(buffer: Buffer): Promise<string> {
    const uploadedImage = await uploadProductImage(buffer);
    return uploadedImage.secure_url;
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
    let productType = dto.productType;
    if (!productType) {
      if (dto.category === "accessory") productType = "accessory";
      else if (dto.category === "ingredient") productType = "ingredient";
      else productType = "fnb";
    }
    return Product.create({ ...dto, productType });
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
