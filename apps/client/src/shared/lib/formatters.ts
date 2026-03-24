export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function calcDiscountedPrice(price: number, discount: number): number {
  if (discount <= 0) return price;
  return Math.round(price * (1 - discount / 100) * 100) / 100;
}
