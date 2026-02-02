export interface IOrderProduct {
  id: number;
  order_id: number;
  product_id: number;
}

export function isIOrderProduct(data: unknown): data is IOrderProduct {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'order_id' in data &&
    'product_id' in data &&
    typeof data.id === 'number' &&
    typeof data.order_id === 'number' &&
    typeof data.product_id === 'number'
  );
}

export function isIOrderProductArray(data: unknown): data is IOrderProduct[] {
  return Array.isArray(data) && data.every(isIOrderProduct);
}
