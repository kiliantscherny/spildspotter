import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) {
    return "";
  }

  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(numericPrice)) {
    return "";
  }

  const parts = numericPrice.toFixed(2).split('.');
  if (parts[1] === '00') {
    return `${parts[0]}.- kr`;
  }
  return `${numericPrice.toFixed(2)} kr`;
}
