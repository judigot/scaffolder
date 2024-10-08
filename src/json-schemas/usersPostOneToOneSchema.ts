export const usersPostOneToOneSchema = {
  user: [
    {
      user_id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      created_at: '2023-06-18T10:17:19.846Z',
      updated_at: '2024-06-18T10:17:19.846Z',
    },
    {
      user_id: 2,
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane.doe@example.com',
      username: 'janedoe',
      password: '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
      created_at: '2024-06-18T10:17:19.846Z',
      updated_at: '2024-06-18T10:17:19.846Z',
    },
  ],
  post: [
    {
      post_id: 1,
      user_id: 1,
      title: "John's Post",
      content: 'Lorem ipsum',
      created_at: '2023-06-18T10:17:19.846Z',
      updated_at: '2024-06-18T10:17:19.846Z',
    },
    {
      post_id: 2,
      user_id: 2,
      title: "Jane's Post",
      content: null,
      created_at: '2024-06-18T10:17:19.846Z',
      updated_at: '2024-06-18T10:17:19.846Z',
    },
  ],
};
