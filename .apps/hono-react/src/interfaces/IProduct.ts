export interface IProduct {
  id: number;
  product_name: string;
}

export function isIProduct(data: unknown): data is IProduct {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'product_name' in data &&
    typeof data.id === 'number' &&
    typeof data.product_name === 'string'
  );
}

export function isIProductArray(data: unknown): data is IProduct[] {
  return Array.isArray(data) && data.every(isIProduct);
}