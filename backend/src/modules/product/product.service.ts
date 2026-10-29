import { Product, IProduct } from "./product.model";
import { CreateProductDTO, UpdateProductDTO } from "./dto/product.dto";
import { uploadProductImage } from "../../config/cloudinary.config";

export class ProductService {
  async getFnbMenu(): Promise<any[]> {
    const fnbCategories = ["drink", "food", "snack"];
    const products = await Product.find({
      category: { $in: fnbCategories },
      isForSale: true,
      isActive: true,
    }).sort({ category: 1, name: 1 });

    return products.map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      salePrice: p.salePrice,
      imageUrl: p.imageUrl,
      description: p.description,
      stock: p.stock,
      isOutOfStock: p.stock === 0,
    }));
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
