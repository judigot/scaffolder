import { generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects } from '@/utils/generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects';
import { describe, it, expect } from 'vitest';

const normalizeCodeString = (code: string): string => {
  return code
    .replace(/\s+/g, '') // Replace multiple whitespace with a single space
    .trim(); // Trim leading and trailing whitespace
};

describe('Generated Code String Comparison Tests', () => {
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

  it('should generate correct code for arrayOfObjectsVariable', () => {
    const expectedCode = `
export interface IArrayOfObjects {
  post_id: number;
  user_id: number;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export function isIArrayOfObjects(
  data: unknown,
): data is IArrayOfObjects | IArrayOfObjects[] {
  if (Array.isArray(data)) {
    return data.every(isIArrayOfObjects);
  }

  if (data === null || typeof data !== 'object') return false;
  if (!('post_id' in data)) return false;
  if (!('user_id' in data)) return false;
  if (!('title' in data)) return false;
  if (!('content' in data)) return false;
  if (!('created_at' in data)) return false;
  if (!('updated_at' in data)) return false;
  if (typeof data.post_id !== 'number') return false;
  if (typeof data.user_id !== 'number') return false;
  if (typeof data.title !== 'string') return false;
  if (typeof data.content !== 'string' && data.content !== null) return false;
  if (typeof data.created_at !== 'string') return false;
  if (typeof data.updated_at !== 'string') return false;

  return true;
}

export function isIArrayOfObjectsArray(
  data: unknown,
): data is IArrayOfObjects[] {
  return Array.isArray(data) && data.every(isIArrayOfObjects);
}
    `.trim();

    const generatedCode =
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'arrayOfObjects',
        arrayOfObjectsVariableOrObject: arrayOfObjectsVariable,
        typeMappings,
        isDateStringFormat: true,
      }).trim();

    expect(normalizeCodeString(generatedCode)).toBe(
      normalizeCodeString(expectedCode),
    );
  });

  it('should generate correct code for objectVariable', () => {
    const expectedCode = `
export interface IObject {
  key1: number;
  key2: string;
}
export function isIObject(data: unknown): data is IObject {
  if (Array.isArray(data)) {
    return data.every(isIObject);
  }
  if (data === null || typeof data !== 'object') return false;
  if (!('key1' in data)) return false;
  if (!('key2' in data)) return false;
  if (!(typeof data.key1 === 'number')) return false;
  if (!(typeof data.key2 === 'string')) return false;
  return true;
}
export function isIObjectArray(data: unknown): data is IObject[] {
  return Array.isArray(data) && data.every(isIObject);
}
    `.trim();

    const generatedCode =
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'Object',
        arrayOfObjectsVariableOrObject: objectVariable,
        typeMappings,
        isDateStringFormat: true,
      }).trim();

    expect(normalizeCodeString(generatedCode)).toBe(
      normalizeCodeString(expectedCode),
    );
  });

  it('should generate correct code for JSONSchema', () => {
    const expectedCode = `
export interface IJSONSchema {
  user: {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    password: string;
    created_at: string;
    updated_at: string;
  };
  post: {
    post_id: number;
    user_id: number;
    title: string;
    content: string;
    created_at: string;
    updated_at: string;
  };
}
export function isIJSONSchema(data: unknown): data is IJSONSchema {
  if (Array.isArray(data)) {
    return data.every(isIJSONSchema);
  }

  type IUser = IJSONSchema['user'];
  type IPost = IJSONSchema['post'];

  function isUser(data: unknown): data is IUser {
    if (Array.isArray(data)) {
      return data.every(isIJSONSchema);
    }
    if (data === null || typeof data !== 'object') return false;
    if (!('user_id' in data)) return false;
    if (!('first_name' in data)) return false;
    if (!('last_name' in data)) return false;
    if (!('email' in data)) return false;
    if (!('username' in data)) return false;
    if (!('password' in data)) return false;
    if (!('created_at' in data)) return false;
    if (!('updated_at' in data)) return false;
    if (!(typeof data.user_id === 'number')) return false;
    if (!(typeof data.first_name === 'string')) return false;
    if (!(typeof data.last_name === 'string')) return false;
    if (!(typeof data.email === 'string')) return false;
    if (!(typeof data.username === 'string')) return false;
    if (!(typeof data.password === 'string')) return false;
    if (!(typeof data.created_at === 'string')) return false;
    if (!(typeof data.updated_at === 'string')) return false;
    return true;
  }

  function isPost(data: unknown): data is IPost {
    if (Array.isArray(data)) {
      return data.every(isIJSONSchema);
    }
    if (data === null || typeof data !== 'object') return false;
    if (!('post_id' in data)) return false;
    if (!('user_id' in data)) return false;
    if (!('title' in data)) return false;
    if (!('content' in data)) return false;
    if (!('created_at' in data)) return false;
    if (!('updated_at' in data)) return false;
    if (!(typeof data.post_id === 'number')) return false;
    if (!(typeof data.user_id === 'number')) return false;
    if (!(typeof data.title === 'string')) return false;
    if (!(typeof data.content === 'string' || data.content === null))
      return false;
    if (!(typeof data.created_at === 'string')) return false;
    if (!(typeof data.updated_at === 'string')) return false;
    return true;
  }
  if (data === null || typeof data !== 'object') return false;
  if (!('user' in data)) return false;
  if (!('post' in data)) return false;

  if (!(Array.isArray(data.user) && data.user.every(isUser))) return false;
  if (!(Array.isArray(data.post) && data.post.every(isPost))) return false;
  return true;
}
export function isIJSONSchemaArray(data: unknown): data is IJSONSchema[] {
  return Array.isArray(data) && data.every(isIJSONSchema);
}
    `;

    const generatedCode =
      generateInterfaceAndTypeGuardFromAnObjectOrArrayOfObjects({
        interfaceName: 'JSONSchema',
        arrayOfObjectsVariableOrObject: jsonSchema,
        typeMappings,
        isDateStringFormat: true,
      }).trim();

    expect(normalizeCodeString(generatedCode)).toBe(
      normalizeCodeString(expectedCode),
    );
  });
});
