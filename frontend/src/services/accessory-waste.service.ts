import api from "./api";

export interface AccessoryWasteProduct {
  _id: string;
  sku?: string;
  name?: string;
  unit?: string;
  costPrice?: number;
  salePrice?: number;
}

export interface AccessoryWasteItem {
  _id: string;
  disposalNumber: string;
  product: AccessoryWasteProduct;
  productName?: string;
  sku?: string;
  unit?: string;
  costPrice?: number;
  totalValue?: number;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  note?: string;
  type: string;
  performedBy: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  createdAt: string;
}

export interface WasteAuditStat {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  currentStock: number;
  totalWasteQuantity: number;
  wasteIncidentsCount: number;
  wasteRatePercent: number;
}

export interface AccessoryWasteFilter {
  page?: number;
  limit?: number;
  search?: string;
  product?: string;
  fromDate?: string;
  toDate?: string;
}

export interface CreateAccessoryWasteInput {
  productId?: string;
  product?: string;
  quantity: number;
  reason: string;
  note?: string;
}

export const accessoryWasteService = {
  async getWastes(filter: AccessoryWasteFilter = {}) {
    const res = await api.get<{
      success: boolean;
      data: AccessoryWasteItem[];
      pagination: { page: number; limit: number; total: number; pages: number };
    }>("/inventory/waste", { params: filter });
    return res.data;
  },

  async getWasteStats() {
    const res = await api.get<{
      success: boolean;
      data: {
        totalDisposalsCount: number;
        totalDamagedUnits: number;
        products: WasteAuditStat[];
      };
    }>("/inventory/waste/stats");
    return res.data.data;
  },

  async createWaste(input: CreateAccessoryWasteInput) {
    const payload = {
      ...input,
      product: input.product || input.productId,
      productId: input.productId || input.product,
    };
    const res = await api.post<{
      success: boolean;
      message: string;
      data: AccessoryWasteItem;
    }>("/inventory/waste", payload);
    return res.data;
  },
};

