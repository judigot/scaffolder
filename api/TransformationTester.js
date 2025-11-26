import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { generateInterface } from './utils/_interfaceGenerator';
import { useEffect, useState } from 'react';
function App() {
  const [JSONSchemaTransformation, setJSONSchemaTransformation] = useState('');
  const [arrayOfObjectsTransformation, setArrayOfObjectsTransformation] =
    useState('');
  const [objectTransformation, setObjectTransformation] = useState('');
  const [sampleData, setSampleData] = useState('');
  useEffect(() => {
    const jsonSchema = {
      user: [
        {
          user_id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          username: 'johndoe',
          password:
            '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
          created_at: '2023-06-18T10:17:19.000Z',
          updated_at: '2024-06-18T10:17:19.000Z',
        },
        {
          user_id: 2,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.com',
          username: 'janedoe',
          password:
            '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
          created_at: '2024-06-18T10:17:19.000Z',
          updated_at: '2024-06-18T10:17:19.000Z',
        },
      ],
      post: [
        {
          post_id: 1,
          user_id: 1,
          title: "John's Post",
          content: 'Lorem ipsum',
          created_at: '2023-06-18T10:17:19.000Z',
          updated_at: '2024-06-18T10:17:19.000Z',
        },
        {
          post_id: 2,
          user_id: 2,
          title: "Jane's Post",
          content: null,
          created_at: '2024-06-18T10:17:19.000Z',
          updated_at: '2024-06-18T10:17:19.000Z',
        },
      ],
    };
    const arrayOfObjectsVariable = [
      {
        post_id: 1,
        user_id: 1,
        title: "John's Post",
        content: 'Lorem ipsum',
        created_at: '2023-06-18T10:17:19.000Z',
        updated_at: '2024-06-18T10:17:19.000Z',
      },
      {
        post_id: 2,
        user_id: 2,
        title: "Jane's Post",
        content: null,
        created_at: '2024-06-18T10:17:19.000Z',
        updated_at: '2024-06-18T10:17:19.000Z',
      },
    ];
    const objectVariable = {
      key1: 1,
      key2: 'Value',
    };
    const sampleData = {
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com',
        isActive: true,
        createdAt: '2023-10-01T14:48:00.000Z',
        posts: [
          {
            id: 101,
            title: 'My First Post',
            content: 'This is the content of my first post.',
            tags: ['typescript', 'javascript'],
            createdAt: '2023-10-02T10:15:00.000Z',
            comments: [
              {
                id: 201,
                text: 'Great post!',
                author: 'Jane Smith',
                createdAt: '2023-10-03T11:30:00.000Z',
              },
              {
                id: 202,
                text: 'Thanks for sharing!',
                author: 'Bob Johnson',
                createdAt: '2023-10-04T09:45:00.000Z',
              },
            ],
          },
          {
            id: 102,
            title: 'Another Post',
            content: 'Here is some more content for another post.',
            tags: ['coding', 'react'],
            createdAt: '2023-10-05T12:20:00.000Z',
            comments: [],
          },
        ],
      },
    };
    setJSONSchemaTransformation(
      generateInterface({
        interfaceName: 'JSONSchema',
        data: jsonSchema,
        isDateStringFormat: true,
      }),
    );
    setArrayOfObjectsTransformation(
      generateInterface({
        interfaceName: 'arrayOfObjects',
        data: arrayOfObjectsVariable,
        isDateStringFormat: true,
      }),
    );
    setObjectTransformation(
      generateInterface({
        interfaceName: 'Object',
        data: objectVariable,
        isDateStringFormat: true,
      }),
    );
    setSampleData(
      generateInterface({
        interfaceName: 'UserPost',
        data: sampleData,
        isDateStringFormat: true,
      }),
    );
  }, []);
  return _jsxs('div', {
    style: {
      zoom: '50%',
      textAlign: 'center',
    },
    children: [
      _jsx('h4', { children: 'jsonSchema result:' }),
      _jsx('code', { children: JSONSchemaTransformation }),
      _jsx('br', {}),
      _jsx('br', {}),
      _jsx('h4', { children: 'arrayOfObjects result:' }),
      _jsx('code', { children: arrayOfObjectsTransformation }),
      _jsx('br', {}),
      _jsx('br', {}),
      _jsx('h4', { children: 'object result:' }),
      _jsx('code', { children: objectTransformation }),
      _jsx('br', {}),
      _jsx('br', {}),
      _jsx('h4', { children: 'sampleData result:' }),
      _jsx('code', { children: sampleData }),
      _jsx('br', {}),
      _jsx('br', {}),
    ],
  });
}
export default App;
