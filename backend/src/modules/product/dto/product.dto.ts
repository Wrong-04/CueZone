export interface CreateProductDTO {
  name: string;
  sku: string;
  category: string;
  productType?: "fnb" | "ingredient" | "accessory";
  unit: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  minStock?: number;
  imageUrl?: string;
  description?: string;
  isForSale?: boolean;
  isActive?: boolean;
  isMadeToOrder?: boolean;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}
