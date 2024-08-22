export interface MovementDetails {
  idProduct: string;
  isUnitPrice: boolean;
  quantity: number;
}

export interface DetailsWithStock {
  detail_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  category_id: string;
  category_name: string;
  unit_id: string;
  unit_name: string;
  is_unit_price: string;
  product_sales_price_id: string;
  unit_price: number;
  wholesale_price: number;
  purchase_price: number;
  remaining_stock: number;
}
