export const POSSchema = {
  product: [
    {
      product_id: 1,
      product_name: 'Water',
    },
    {
      product_id: 2,
      product_name: 'Yogurt',
    },
  ],
  customer: [
    {
      customer_id: 1,
      name: 'John Doe',
    },
    {
      customer_id: 2,
      name: 'Jane Doe',
    },
  ],
  order: [
    {
      order_id: 1,
      customer_id: 1,
    },
    {
      order_id: 2,
      customer_id: 1,
    },
    {
      order_id: 3,
      customer_id: 2,
    },
  ],
  order_product: [
    {
      order_product_id: 1,
      order_id: 1,
      product_id: 1,
    },
    {
      order_product_id: 2,
      order_id: 1,
      product_id: 2,
    },
    {
      order_product_id: 3,
      order_id: 2,
      product_id: 2,
    },
  ],
};
