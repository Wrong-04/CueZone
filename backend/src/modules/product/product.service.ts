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

    const allCategories = await Category.find().lean();
    const catMap = new Map<string, { code: string; name: string }>();
    allCategories.forEach((c) => {
      const info = { code: c.code, name: c.name || c.code };
      catMap.set(c._id.toString(), info);
      if (c.code) catMap.set(String(c.code).toLowerCase(), info);
    });

    return products.map((p) => {
      const rawCat = String(p.category || "").trim();
      const matchedCat = catMap.get(rawCat) || catMap.get(rawCat.toLowerCase());
      const resolvedCategory = matchedCat?.code || rawCat;
      const madeToOrder = Boolean(
        p.isMadeToOrder ??
          (p as any).isTheMakeToOrder ??
          (p as any).isthemaketoorder,
      );

      return {
        _id: p._id,
        name: p.name,
        sku: p.sku,
        category: resolvedCategory,
        categoryName: matchedCat?.name || resolvedCategory,
        productType: p.productType,
        unit: p.unit || "Phần",
        salePrice: p.salePrice,
        imageUrl: p.imageUrl,
        description: p.description,
        stock: p.stock,
        isMadeToOrder: madeToOrder,
        isOutOfStock: madeToOrder ? !p.isForSale : p.stock === 0,
      };
    });
  }

  async getAll(): Promise<any[]> {
    const products = await Product.find().sort({ name: 1 }).lean();
    const allCategories = await Category.find().lean();
    const catMap = new Map<string, string>();
    allCategories.forEach((c) => {
      catMap.set(c._id.toString(), c.name || c.code);
      if (c.code) catMap.set(String(c.code).toLowerCase(), c.name || c.code);
    });

    return products.map((p) => {
      const rawCat = String(p.category || "").trim();
      const resolvedCatName = catMap.get(rawCat) || catMap.get(rawCat.toLowerCase()) || rawCat;
      return {
        ...p,
        categoryName: resolvedCatName,
      };
    });
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
