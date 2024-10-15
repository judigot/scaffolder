import { generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects } from '@/utils/generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects';
import { useEffect, useState } from 'react';

function App() {
  const [JSONSchemaTransformation, setJSONSchemaTransformation] =
    useState<string>('');
  const [arrayOfObjectsTransformation, setArrayOfObjectsTransformation] =
    useState<string>('');
  const [objectTransformation, setObjectTransformation] = useState<string>('');
  const [sampleData, setSampleData] = useState<string>('');

  useEffect(() => {
    const typeMappings = {
      primaryKey: {
        typescript: 'number',
      },
      password: {
        typescript: 'string',
      },
      number: {
        typescript: 'number',
      },
      float: {
        typescript: 'number',
      },
      string: {
        typescript: 'string',
      },
      boolean: {
        typescript: 'boolean',
      },
      Date: {
        typescript: 'Date',
      },
    } as const;

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
          created_at: '2023-06-18T10:17:19.846Z',
          updated_at: '2024-06-18T10:17:19.846Z',
        },
        {
          user_id: 2,
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane.doe@example.com',
          username: 'janedoe',
          password:
            '$2b$10$M/WlJFeICXSTwvlM54X75u9Tg5Y3w/ak5T7O96cYY7mW0vJ2NFA7m',
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

    const arrayOfObjectsVariable = [
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
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'JSONSchema',
        typeMappings,
        arrayOfObjectsVariableOrObject: jsonSchema,
        isDateStringFormat: true,
      }),
    );

    setArrayOfObjectsTransformation(
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'arrayOfObjects',
        typeMappings,
        arrayOfObjectsVariableOrObject: arrayOfObjectsVariable,
        isDateStringFormat: true,
      }),
    );

    setObjectTransformation(
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'Object',
        typeMappings,
        arrayOfObjectsVariableOrObject: objectVariable,
        isDateStringFormat: true,
      }),
    );

    setSampleData(
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'UserPost',
        typeMappings,
        arrayOfObjectsVariableOrObject: sampleData,
        isDateStringFormat: true,
      }),
    );
  }, []);

  return (
    <div
      style={{
        zoom: '50%',
        textAlign: 'center',
      }}
    >
      <h4>jsonSchema result:</h4>
      <code>{JSONSchemaTransformation}</code>
      <br />
      <br />

      <h4>arrayOfObjects result:</h4>
      <code>{arrayOfObjectsTransformation}</code>
      <br />
      <br />

      <h4>object result:</h4>
      <code>{objectTransformation}</code>
      <br />
      <br />

      <h4>sampleData result:</h4>
      <code>{sampleData}</code>
      <br />
      <br />
    </div>
  );
}

export default App;
