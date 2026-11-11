export const FNB_CATEGORY_LABELS: Record<string, string> = {
  drink: "Đồ uống",
  coffee: "Cà phê",
  tea: "Trà trái cây",
  juice: "Nước giải khát",
  beer: "Bia & Đồ có cồn",
  food: "Món ăn nóng",
  snack: "Đồ ăn vặt",
};

export const CUSTOMER_FNB_CATEGORY_LABELS: Record<string, string> = {
  coffee: "Cà phê",
  tea: "Trà trái cây",
  juice: "Nước giải khát",
  beer: "Bia & Đồ có cồn",
  food: "Món ăn nóng",
  snack: "Ăn vặt",
};

export const getFnbCategoryLabel = (category?: string): string => {
  if (!category) return "Khác";
  const normalizedCategory = category.toLowerCase().trim();
  return FNB_CATEGORY_LABELS[normalizedCategory] || category;
};

export const getCustomerFnbCategoryLabel = (category: string): string =>
  CUSTOMER_FNB_CATEGORY_LABELS[category] || FNB_CATEGORY_LABELS[category.toLowerCase()] || category;

export const isFnbWarehouseItem = (
  _name?: string,
  rawCategory?: string,
  productType?: string,
): boolean => {
  if (productType === "ingredient" || productType === "accessory") return true;
  if (productType === "fnb") return false;

  const category = (rawCategory || "").toLowerCase().trim();
  if (
    category === "accessory" ||
    category === "equipment" ||
    category === "ingredient" ||
    category.includes("nguyên liệu") ||
    category.includes("phụ kiện")
  ) {
    return true;
  }
  return false;
};

export const resolveFnbCategory = (name: string, rawCategory?: string): string => {
  const normalizedName = name.toLocaleLowerCase("vi-VN");
  const category = rawCategory?.toLocaleLowerCase("vi-VN").trim() || "";

  // 1. Nhận diện các nhóm đồ uống / món ăn theo tên món ưu tiên cao nhất
  if (
    normalizedName.includes("bia") ||
    normalizedName.includes("beer") ||
    normalizedName.includes("heineken") ||
    normalizedName.includes("tiger")
  ) {
    return "beer";
  }
  if (normalizedName.includes("cà phê") || normalizedName.includes("cafe") || normalizedName.includes("coffee")) {
    return "coffee";
  }
  if (normalizedName.includes("trà") || normalizedName.includes("tea")) {
    return "tea";
  }

  // 2. Nhận diện theo nhóm danh mục
  if (category === "beer") return "beer";
  if (category === "coffee") return "coffee";
  if (category === "tea") return "tea";
  if (
    category === "food" ||
    category.includes("ăn") ||
    category.includes("món") ||
    /mì|phở|bún|bánh|cơm/i.test(normalizedName)
  ) {
    return "food";
  }
  if (
    category === "snack" ||
    category.includes("vặt") ||
    /hạt|khoai|chiên|khô|snack/i.test(normalizedName)
  ) {
    return "snack";
  }
  if (category === "juice" || category === "drink") return "juice";

  // 3. Nếu là danh mục ẩm thực tùy chỉnh từ F&B (không phải nguyên liệu, không phải phụ kiện)
  if (
    rawCategory &&
    rawCategory.trim() &&
    !["drink", "nguyên liệu", "ingredient", "accessory", "equipment", "phụ kiện"].includes(category)
  ) {
    return rawCategory.trim();
  }

  return "juice";
};

export const getFnbImageUrl = (
  name: string,
  category?: string,
  imageUrl?: string,
): string => {
  if (imageUrl) return imageUrl;
  const normalizedName = name.toLocaleLowerCase("vi-VN");
  const normalizedCategory = category?.toLocaleLowerCase("vi-VN") || "";

  if (
    normalizedName.includes("bia") ||
    normalizedName.includes("beer") ||
    normalizedName.includes("heineken") ||
    normalizedName.includes("tiger")
  ) {
    return "/fnb/fnb-cold-beer.jpg";
  }
  if (
    normalizedName.includes("cà phê") ||
    normalizedName.includes("cafe") ||
    normalizedName.includes("coffee") ||
    normalizedCategory === "coffee"
  ) {
    return "/fnb/fnb-salt-coffee.jpg";
  }
  if (
    normalizedName.includes("trà") ||
    normalizedName.includes("tea") ||
    normalizedName.includes("đào") ||
    normalizedCategory === "tea"
  ) {
    return "/fnb/fnb-peach-tea.jpg";
  }
  if (
    ["mì", "xúc xích", "bò", "bánh mì", "cơm"].some((keyword) =>
      normalizedName.includes(keyword),
    ) ||
    normalizedCategory === "food"
  ) {
    return "/fnb/fnb-beef-noodles.jpg";
  }
  if (
    ["hướng dương", "hạt điều", "khô", "khoai"].some((keyword) =>
      normalizedName.includes(keyword),
    ) ||
    normalizedCategory === "snack"
  ) {
    return "/fnb/fnb-beef-jerky.jpg";
  }
  if (normalizedCategory === "equipment") return "/fnb/fnb-billiard-gear.jpg";
  return "/fnb/fnb-peach-tea.jpg";
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
