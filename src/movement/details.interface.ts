export interface MovementDetails {
  idProduct: string;
  isUnitPrice: boolean;
  quantity: number;
  quantityDelivered?: number;
}

export interface IInvoiceData {
  details: DetailsWithStock[];
  amountPaid: number;
  language: 'FR' | 'ENG';
  client: string;
  format: 'TICKET' | 'A4';
  reference: string;
}

export interface DetailsWithStock {
  detail_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  quantity_delivered?: number;
  category_id: string;
  category_name: string;
  unit_id: string;
  unit_name: string;
  is_unit_price: boolean;
  product_sales_price_id: string;
  unit_price: number;
  wholesale_price: number;
  purchase_price: number;
  remaining_stock: number;
}

export interface DetailsNotDelivered {
  detail_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  quantity_delivered: number;
}

export interface selectDetailId {
  id: number;
}
