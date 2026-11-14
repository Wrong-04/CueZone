export const isFnbWarehouseItem = (
  name?: string,
  rawCategory?: string,
  productType?: string,
): boolean => {
  // 1. Phụ kiện bida hoặc nguyên liệu kho nhận diện qua tên hoặc category ưu tiên hàng đầu
  const category = (rawCategory || "").toLowerCase().trim();
  if (
    category === "accessory" ||
    category === "equipment" ||
    category === "ingredient" ||
    category === "table_supplies" ||
    category === "maintenance" ||
    category.includes("nguyên liệu") ||
    category.includes("phụ kiện") ||
    category.includes("vật tư")
  ) {
    return true;
  }
  const n = String(name || "").toLowerCase();
  if (
    /bóng|cơ\b|lơ\b|đầu cơ|găng|bao tay|khăn lau|nỉ bàn|hạt robusta|sữa đặc|kem béo|rich's|bột pha/i.test(
      n,
    )
  ) {
    return true;
  }

  // 2. Kiểm tra theo trường productType
  if (productType === "ingredient" || productType === "accessory") return true;
  if (productType === "fnb") return false;

  return false;
};

export const isFnbItemPrepared = (item: {
  isMadeToOrder?: boolean;
  isTheMakeToOrder?: boolean;
  isthemaketoorder?: boolean;
  unit?: string;
  category?: string;
}): boolean => {
  const unit = item.unit?.toLowerCase();
  const category = item.category?.toLowerCase();
  return Boolean(
    item.isMadeToOrder ||
      item.isTheMakeToOrder ||
      item.isthemaketoorder ||
      (unit && ["ly", "tô", "đĩa", "phần", "suất"].includes(unit)) ||
      (category && ["food", "coffee", "tea"].includes(category)),
  );
};

export const isFnbItemOutOfStock = (item: {
  stock?: number;
  stockQuantity?: number;
}): boolean => (item.stock ?? item.stockQuantity ?? 0) <= 0;
