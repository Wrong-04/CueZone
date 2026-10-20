export interface CreateProductDTO {
  name: string;
  sku: string;
  category: 'accessory' | 'drink' | 'food' | 'snack' | 'ingredient';
  unit: string;
  costPrice?: number;
  salePrice?: number;
  stock?: number;
  minStock?: number;
  imageUrl?: string;
  description?: string;
  isForSale?: boolean;
  isActive?: boolean;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {}
