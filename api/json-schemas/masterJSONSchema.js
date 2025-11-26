export default {
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
  user: [
    {
      user_id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      created_at: '2023-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
    {
      user_id: 2,
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane.doe@example.com',
      username: 'janedoe',
      password: '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      created_at: '2024-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
  ],
  profile: [
    {
      profile_id: 1,
      user_id: 1,
      bio: 'Software Developer',
      created_at: '2023-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
    {
      profile_id: 2,
      user_id: 2,
      bio: 'UI/UX Designer',
      created_at: '2024-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
  ],
  posts: [
    {
      post_id: 1,
      user_id: 1,
      title: "John's Post",
      content: 'Lorem ipsum',
      created_at: '2023-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
    {
      post_id: 2,
      user_id: 1,
      title: "John's 2nd Post",
      content: 'Lorem ipsum',
      created_at: '2023-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
    {
      post_id: 3,
      user_id: 2,
      title: "Jane's Post",
      content: null,
      created_at: '2024-06-18T10:17:19.123456Z',
      updated_at: '2024-06-18T10:17:19.123456Z',
    },
  ],
};
