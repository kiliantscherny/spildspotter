// API client for communicating with the FastAPI backend

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ApiStore {
  id: string;
  label: string;
  city: string;
  brand: string;
}

export interface ApiClearanceItem {
  image: string;
  product: string;
  category: string;
  new_price: string;
  original_price: string;
  discount: string;
  stock: string;
}

export interface ApiStoreDetails {
  id: string;
  name: string;
  brand: string;
  street: string;
  city: string;
  zip: string;
}

export async function fetchBrands(): Promise<string[]> {
  const response = await fetch(`${API_BASE}/api/brands`);
  if (!response.ok) throw new Error("Failed to fetch brands");
  return response.json();
}

export async function fetchStores(brand?: string): Promise<ApiStore[]> {
  const params = brand ? `?brand=${encodeURIComponent(brand)}` : "";
  const response = await fetch(`${API_BASE}/api/stores${params}`);
  if (!response.ok) throw new Error("Failed to fetch stores");
  return response.json();
}

export async function fetchStoreDetails(
  storeId: string
): Promise<ApiStoreDetails | null> {
  const response = await fetch(`${API_BASE}/api/stores/${storeId}`);
  if (!response.ok) return null;
  return response.json();
}

export async function fetchClearanceItems(
  storeId: string
): Promise<ApiClearanceItem[]> {
  const response = await fetch(`${API_BASE}/api/stores/${storeId}/clearances`);
  if (!response.ok) throw new Error("Failed to fetch clearance items");
  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
