const schema = {
  customer: [
    {
      customer_id: 1,
      name: 'John Doe',
    },
  ],
  order: [
    {
      order_id: 1,
      customer_id: 1,
    },
  ],
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
  ],
};
export default schema;
