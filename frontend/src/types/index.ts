export interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  product?: Product;
}

export interface Order {
  id: number;
  customer_id: number;
  total_amount: number;
  status: string;
  created_at: string;
  customer?: Customer;
  items: OrderItem[];
}

export interface OrderItemInput {
  product_id: number;
  quantity: number;
}
