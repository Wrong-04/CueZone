import type { FnbStockItem } from "../../../../types";

export interface FnbMetrics {
  totalItems: number;
  availableCount: number;
  lowOrOutCount: number;
  madeToOrderCount: number;
}

export interface EditingItemData {
  id?: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  minThreshold: number;
  isForSale: boolean;
  image?: string;
  code?: string;
  isMadeToOrder?: boolean;
}

export const FALLBACK_GENERAL_UNITS = [
  "Phần",
  "Ly",
  "Lon",
  "Chai",
  "Đĩa",
  "Tô",
  "Gói",
  "Hộp",
  "Cái",
];

export const isFreshPreparedCategory = (category?: string): boolean => {
  return category === "coffee" || category === "tea" || category === "food";
};

export const isItemMadeToOrder = (
  item?: Partial<FnbStockItem> | null,
): boolean => {
  if (!item) return false;
  return item.isMadeToOrder !== undefined
    ? Boolean(item.isMadeToOrder)
    : isFreshPreparedCategory(item.category);
};

export const isItemOutOfStock = (
  item?: Partial<FnbStockItem> | null,
): boolean => {
  if (!item) return false;
  if (item.isForSale === false) return true;
  if (isItemMadeToOrder(item)) return false;
  return (item.stockQuantity ?? 0) <= 0;
};

export const getItemPrepType = (category: string, explicitMadeToOrder?: boolean) => {
  const madeToOrder =
    explicitMadeToOrder !== undefined
      ? explicitMadeToOrder
      : isFreshPreparedCategory(category);
  if (!madeToOrder) return "packaged_stock";
  if (category === "food") return "cooked_food";
  return "fresh_beverage";
};

export const getItemLocationName = (category: string): string => {
  if (category === "coffee" || category === "tea") return "Quầy Pha Chế";
  if (category === "food") return "Bếp Nóng";
  if (category === "beer" || category === "juice") return "Tủ Mát Đồ Uống";
  return "Kệ Quầy Bar";
};

export const resolveProductImage = (currentUrl?: string): string => {
  if (
    currentUrl &&
    currentUrl.trim() &&
    !currentUrl.includes("photo-1538481199705") &&
    !currentUrl.includes("photo-1618886614638") &&
    !currentUrl.startsWith("/fnb/fnb-")
  ) {
    return currentUrl.trim();
  }
  return "";
};

export const generateSkuForCategory = (category: string, currentCount: number): string => {
  const prefixMap: Record<string, string> = {
    coffee: "CF",
    tea: "TEA",
    juice: "DRK",
    beer: "BEER",
    food: "FOOD",
    snack: "SNK",
  };
  const prefix = prefixMap[category] || "FNB";
  const num = String(currentCount + 1).padStart(3, "0");
  return `${prefix}-${num}`;
};

export const normalizeUnitLabel = (unit?: string): string => {
  const trimmed = String(unit || "").trim();
  if (!trimmed) return "Phần";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

export const getDefaultUnitForCategory = (category: string, items: FnbStockItem[] = []) => {
  const catLower = String(category || "").toLowerCase();
  const unitCounts = new Map<string, number>();

  for (const item of items) {
    if (String(item.category || "").toLowerCase() !== catLower) continue;
    const normalized = normalizeUnitLabel(item.unit);
    unitCounts.set(normalized, (unitCounts.get(normalized) || 0) + 1);
  }

  if (unitCounts.size > 0) {
    let topUnit = "";
    let topCount = -1;
    for (const [unit, count] of unitCounts.entries()) {
      if (count > topCount) {
        topUnit = unit;
        topCount = count;
      }
    }
    if (topUnit) return topUnit;
  }

  return "Phần";
};

export const getCommonUnitsForCategory = (category: string, items: FnbStockItem[] = []) => {
  const catLower = String(category || "").toLowerCase();
  const seen = new Set<string>();
  const result: string[] = [];

  const pushUnit = (raw?: string) => {
    if (!raw || !raw.trim()) return;
    const normalized = normalizeUnitLabel(raw);
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  };

  for (const item of items) {
    if (String(item.category || "").toLowerCase() === catLower) {
      pushUnit(item.unit);
    }
  }

  for (const item of items) {
    pushUnit(item.unit);
  }

  for (const u of FALLBACK_GENERAL_UNITS) {
    pushUnit(u);
  }

  return result;
};
