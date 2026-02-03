export interface IOrder {
  id: number;
  customer_id: number;
}

export function isIOrder(data: unknown): data is IOrder {
  return (
    data !== null &&
    typeof data === 'object' &&
    'id' in data &&
    'customer_id' in data &&
    typeof data.id === 'number' &&
    typeof data.customer_id === 'number'
  );
}

export function isIOrderArray(data: unknown): data is IOrder[] {
  return Array.isArray(data) && data.every(isIOrder);
}