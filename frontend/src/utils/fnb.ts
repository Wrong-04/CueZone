export const FNB_CATEGORY_LABELS: Record<string, string> = {
  drink: "Đồ uống",
  coffee: "Cà phê",
  tea: "Trà & Nước ngọt",
  beer: "Bia & Đồ có cồn",
  food: "Đồ ăn chính",
  snack: "Đồ ăn vặt",
  accessory: "Bao tay & Tiện ích",
  equipment: "Bao tay & Tiện ích",
};

export const CUSTOMER_FNB_CATEGORY_LABELS: Record<string, string> = {
  coffee: "Cà phê",
  tea: "Trà trái cây",
  juice: "Nước giải khát",
  beer: "Bia & Đồ có cồn",
  food: "Món ăn nóng",
  snack: "Ăn vặt",
  equipment: "Phụ kiện bida",
};

export const getFnbCategoryLabel = (category?: string): string => {
  if (!category) return "Khác";
  const normalizedCategory = category.toLowerCase().trim();
  return FNB_CATEGORY_LABELS[normalizedCategory] || category;
};

export const getCustomerFnbCategoryLabel = (category: string): string =>
  CUSTOMER_FNB_CATEGORY_LABELS[category] || getFnbCategoryLabel(category);

export const resolveFnbCategory = (name: string, rawCategory?: string): string => {
  const normalizedName = name.toLocaleLowerCase("vi-VN");
  const category = rawCategory?.toLocaleLowerCase("vi-VN").trim() || "";

  if (category === "food" || category.includes("ăn") || category.includes("món")) return "food";
  if (category === "snack" || category.includes("vặt")) return "snack";
  if (category === "accessory" || category.includes("phụ kiện")) return "equipment";
  if (category === "equipment") return category;
  if (normalizedName.includes("cà phê") || normalizedName.includes("cafe") || normalizedName.includes("coffee")) {
    return "coffee";
  }
  if (normalizedName.includes("trà") || normalizedName.includes("tea")) return "tea";
  if (
    normalizedName.includes("bia") ||
    normalizedName.includes("beer") ||
    normalizedName.includes("heineken") ||
    normalizedName.includes("tiger")
  ) {
    return "beer";
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
  unit?: string;
  category?: string;
}): boolean => {
  const unit = item.unit?.toLowerCase();
  const category = item.category?.toLowerCase();
  return Boolean(
    item.isMadeToOrder ||
      (unit && ["ly", "tô", "đĩa", "phần", "suất"].includes(unit)) ||
      (category && ["food", "coffee", "tea"].includes(category)),
  );
};

export const isFnbItemOutOfStock = (item: {
  stock?: number;
  stockQuantity?: number;
}): boolean => (item.stock ?? item.stockQuantity ?? 0) <= 0;
