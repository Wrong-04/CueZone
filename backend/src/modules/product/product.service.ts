// ============================================================================
// SƠ ĐỒ LUỒNG DỮ LIỆU: SERVICE NGHIỆP VỤ SẢN PHẨM & THỰC ĐƠN F&B (ProductService)
// product.controller.ts -> ProductService -> MongoDB (Product & Category) & Cloudinary
// - Phân biệt món chế biến tại chỗ (`isMadeToOrder`: không phụ thuộc tồn kho)
//   và hàng đóng gói (trừ `stock` khi bán, `isOutOfStock = stock === 0`).
// ============================================================================
import { Product, IProduct } from "./product.model";
import Category from "./category.model";
import { CreateProductDTO, UpdateProductDTO } from "./dto/product.dto";
import { uploadProductImage } from "../../config/cloudinary.config";

export class ProductService {
  /**
   * Lấy danh sách món F&B đang mở bán (`productType: "fnb"`, `isForSale`, `isActive`) kèm tên danh mục.
   *
   * @returns {Promise<any[]>} Danh sách món đã chuẩn hóa cờ isMadeToOrder và isOutOfStock
   */
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

  /**
   * Lấy toàn bộ sản phẩm trong cơ sở dữ liệu và ghép tên danh mục tương ứng.
   *
   * @returns {Promise<any[]>} Danh sách toàn bộ sản phẩm sắp xếp theo tên
   */
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

  /**
   * Tìm chi tiết một sản phẩm theo ID (ném lỗi nếu không tồn tại).
   *
   * @param {string} id - Mã định danh sản phẩm
   * @returns {Promise<IProduct>} Tài liệu Product từ MongoDB
   */
  async getById(id: string): Promise<IProduct> {
    const product = await Product.findById(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    return product;
  }

  /**
   * Tải buffer ảnh lên Cloudinary và trả về đường dẫn URL bảo mật.
   *
   * @param {Buffer} buffer - Dữ liệu nhị phân ảnh đọc từ Multer
   * @returns {Promise<string>} URL ảnh sau khi tải lên Cloudinary
   */
  async uploadDirectImage(buffer: Buffer): Promise<string> {
    const uploadedImage = await uploadProductImage(buffer);
    return uploadedImage.secure_url;
  }

  /**
   * Tải ảnh mới lên Cloudinary và cập nhật trường imageUrl cho sản phẩm tương ứng.
   *
   * @param {string} id - Mã định danh sản phẩm cần cập nhật ảnh
   * @param {Buffer} buffer - Dữ liệu nhị phân ảnh mới
   * @returns {Promise<IProduct>} Tài liệu Product sau khi lưu imageUrl mới
   */
  async replaceImage(id: string, buffer: Buffer): Promise<IProduct> {
    const product = await Product.findById(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");

    const uploadedImage = await uploadProductImage(buffer);
    product.imageUrl = uploadedImage.secure_url;
    await product.save();

    return product;
  }

  /**
   * Tạo sản phẩm mới và tự suy luận `productType` ("fnb" | "accessory" | "ingredient") nếu chưa truyền.
   *
   * @param {CreateProductDTO} dto - Dữ liệu tạo sản phẩm mới
   * @returns {Promise<IProduct>} Bản ghi sản phẩm vừa tạo trong MongoDB
   */
  async create(dto: CreateProductDTO): Promise<IProduct> {
    let productType = dto.productType;
    if (!productType) {
      if (dto.category === "accessory") productType = "accessory";
      else if (dto.category === "ingredient") productType = "ingredient";
      else productType = "fnb";
    }
    return Product.create({ ...dto, productType });
  }

  /**
   * Cập nhật thông tin sản phẩm theo ID và trả về bản ghi mới nhất.
   *
   * @param {string} id - Mã định danh sản phẩm
   * @param {UpdateProductDTO} dto - Các trường cần cập nhật
   * @returns {Promise<IProduct>} Sản phẩm sau khi cập nhật
   */
  async update(id: string, dto: UpdateProductDTO): Promise<IProduct> {
    const product = await Product.findByIdAndUpdate(id, dto, { new: true });
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    return product;
  }

  /**
   * Xóa một sản phẩm khỏi MongoDB theo ID.
   *
   * @param {string} id - Mã định danh sản phẩm cần xóa
   * @returns {Promise<void>}
   */
  async delete(id: string): Promise<void> {
    const product = await Product.findByIdAndDelete(id);
    if (!product) throw new Error("Không tìm thấy sản phẩm");
  }
}
