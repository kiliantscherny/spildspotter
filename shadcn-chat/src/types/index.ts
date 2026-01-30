// Types for the chat application

export interface Store {
  id: string;
  label: string;
  city: string;
  brand: string;
}

export interface ClearanceItem {
  image: string;
  product: string;
  category: string;
  newPrice: string;
  originalPrice: string;
  discount: string;
  stock: string;
}

export interface StoreInfo {
  name: string;
  brand: string;
  address: string;
  city: string;
}
