import { describe, it, expect } from 'vitest';
import { processCommand } from '@/utils/project-builder/template-processors/processCommand.ts';
import { getSchemaInfo } from '@/utils/getSchemaInfo.ts';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IStructure } from '@/components/FileViewer.tsx';
import type { IFormStore } from '@/useFormStore.ts';
import { frameworks } from '@/useFormStore.ts';
import { CREATION_MODES } from '@/constants.ts';

describe('USE_USER_ENV template command', () => {
  const createSchema = (): ISchemaInfo[] => [
    {
      tableName: 'users',
      columnsInfo: [
        {
          column_name: 'id',
          data_type: 'number',
          primary_key: true,
          is_nullable: 'NO',
        },
      ],
      childTables: [],
    },
  ];

  const createUserFiles = (): IStructure => [
    {
      type: 'folder',
      name: 'Projects',
      children: [],
    },
  ];

  const createFormData = (): IFormStore => ({
    schemaInput: {},
    backendUrl: 'http://localhost:5000',
    backendDir: '',
    frontendDir: '',
    dbConnection: 'postgresql://localhost:5432/test',
    framework: frameworks.LARAVEL,
    includeInsertData: false,
    insertOption: 'SQLInsertQueriesFromMockData',
    includeTypeGuards: false,
    outputOnSingleFile: false,
    dbType: 'postgresql',
    quote: '"',
    publicRepoURL: '',
    clientID: '',
    clientSecret: '',
    creationMode: CREATION_MODES.SCHEMA_BUILDER,
    dbUsername: '',
    dbPassword: '',
    dbHost: '',
    dbPort: 5432,
    dbName: '',
    setCreationMode: (): void => {
      /* stub */
    },
    setMasterSchema: (): void => {
      /* stub */
    },
    setOneToOne: (): void => {
      /* stub */
    },
    setOneToMany: (): void => {
      /* stub */
    },
    setManyToMany: (): void => {
      /* stub */
    },
    setDBType: (): void => {
      /* stub */
    },
    setQuote: (): void => {
      /* stub */
    },
    setFramework: (): void => {
      /* stub */
    },
    setBackendUrl: (): void => {
      /* stub */
    },
    setBackendDir: (): void => {
      /* stub */
    },
    setFrontendDir: (): void => {
      /* stub */
    },
    setDBConnection: (): void => {
      /* stub */
    },
    setDBUsername: (): void => {
      /* stub */
    },
    setDBPassword: (): void => {
      /* stub */
    },
    setDBHost: (): void => {
      /* stub */
    },
    setDBPort: (): void => {
      /* stub */
    },
    setDBName: (): void => {
      /* stub */
    },
    setIncludeInsertData: (): void => {
      /* stub */
    },
    setInsertOption: (): void => {
      /* stub */
    },
    setIncludeTypeGuards: (): void => {
      /* stub */
    },
    setOutputOnSingleFile: (): void => {
      /* stub */
    },
    setPublicRepoURL: (): void => {
      /* stub */
    },
    setClientID: (): void => {
      /* stub */
    },
    setClientSecret: (): void => {
      /* stub */
    },
    setDbConnection: (): void => {
      /* stub */
    },
  });

  const schemaInfo = createSchema();
  const schemaInfoParsed = getSchemaInfo(schemaInfo);
  const userFiles = createUserFiles();
  const formData = createFormData();

  it('should replace USE_USER_ENV with string value', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=sk-1234567890abcdef');
  });

  it('should replace USE_USER_ENV with number value (converted to string)', () => {
    const template = 'PORT=[[USE_USER_ENV(PORT)]]';
    const userMetadata = {
      env: {
        PORT: 3000,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('PORT=3000');
  });

  it('should replace USE_USER_ENV with boolean value (converted to string)', () => {
    const template = 'DEBUG=[[USE_USER_ENV(DEBUG)]]';
    const userMetadata = {
      env: {
        DEBUG: true,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('DEBUG=true');
  });

  it('should replace USE_USER_ENV with array value (joined with commas)', () => {
    const template = 'ALLOWED_ORIGINS=[[USE_USER_ENV(ALLOWED_ORIGINS)]]';
    const userMetadata = {
      env: {
        ALLOWED_ORIGINS: ['http://localhost:3000', 'https://example.com'],
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe(
      'ALLOWED_ORIGINS=http://localhost:3000,https://example.com',
    );
  });

  it('should replace USE_USER_ENV with object value (JSON stringified)', () => {
    const template = 'DATABASE_CONFIG=[[USE_USER_ENV(DATABASE_CONFIG)]]';
    const userMetadata = {
      env: {
        DATABASE_CONFIG: {
          host: 'localhost',
          port: 5432,
        },
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('DATABASE_CONFIG={"host":"localhost","port":5432}');
  });

  it('should return empty string when userMetadata is null', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = null;

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when userMetadata is undefined', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      undefined,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when env property is missing', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      otherProperty: 'value',
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when env property is not an object', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: 'not-an-object',
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when variable does not exist in env', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: {
        OTHER_KEY: 'value',
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when variable value is null', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: {
        API_KEY: null,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should return empty string when variable value is undefined', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: {
        API_KEY: undefined,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should handle multiple USE_USER_ENV commands in same template', () => {
    const template =
      'API_KEY=[[USE_USER_ENV(API_KEY)]]\nDATABASE_URL=[[USE_USER_ENV(DATABASE_URL)]]\nPORT=[[USE_USER_ENV(PORT)]]';
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
        DATABASE_URL: 'postgresql://localhost:5432/testdb',
        PORT: 3000,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe(
      'API_KEY=sk-1234567890abcdef\nDATABASE_URL=postgresql://localhost:5432/testdb\nPORT=3000',
    );
  });

  it('should handle USE_USER_ENV with whitespace in variable name', () => {
    const template = 'API_KEY=[[USE_USER_ENV(  API_KEY  )]]';
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=sk-1234567890abcdef');
  });

  it('should handle empty string value', () => {
    const template = 'API_KEY=[[USE_USER_ENV(API_KEY)]]';
    const userMetadata = {
      env: {
        API_KEY: '',
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=');
  });

  it('should handle zero as number value', () => {
    const template = 'TIMEOUT=[[USE_USER_ENV(TIMEOUT)]]';
    const userMetadata = {
      env: {
        TIMEOUT: 0,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('TIMEOUT=0');
  });

  it('should handle false as boolean value', () => {
    const template = 'ENABLED=[[USE_USER_ENV(ENABLED)]]';
    const userMetadata = {
      env: {
        ENABLED: false,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('ENABLED=false');
  });

  it('should handle empty array', () => {
    const template = 'ALLOWED_ORIGINS=[[USE_USER_ENV(ALLOWED_ORIGINS)]]';
    const userMetadata = {
      env: {
        ALLOWED_ORIGINS: [],
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('ALLOWED_ORIGINS=');
  });

  it('should handle empty object', () => {
    const template = 'CONFIG=[[USE_USER_ENV(CONFIG)]]';
    const userMetadata = {
      env: {
        CONFIG: {},
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('CONFIG={}');
  });

  it('should handle nested objects in JSON stringification', () => {
    const template = 'CONFIG=[[USE_USER_ENV(CONFIG)]]';
    const userMetadata = {
      env: {
        CONFIG: {
          database: {
            host: 'localhost',
            port: 5432,
          },
          api: {
            baseUrl: 'https://api.example.com',
          },
        },
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe(
      'CONFIG={"database":{"host":"localhost","port":5432},"api":{"baseUrl":"https://api.example.com"}}',
    );
  });

  it('should handle array with mixed types', () => {
    const template = 'VALUES=[[USE_USER_ENV(VALUES)]]';
    const userMetadata = {
      env: {
        VALUES: ['string', 123, true, null],
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('VALUES=string,123,true,');
  });

  it('should handle complex real-world example', () => {
    const template = `# Environment Configuration
API_KEY=[[USE_USER_ENV(API_KEY)]]
DATABASE_URL=[[USE_USER_ENV(DATABASE_URL)]]
PORT=[[USE_USER_ENV(PORT)]]
DEBUG=[[USE_USER_ENV(DEBUG)]]
ALLOWED_ORIGINS=[[USE_USER_ENV(ALLOWED_ORIGINS)]]
`;
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
        DATABASE_URL: 'postgresql://localhost:5432/testdb',
        PORT: 3000,
        DEBUG: true,
        ALLOWED_ORIGINS: ['http://localhost:3000', 'https://example.com'],
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe(`# Environment Configuration
API_KEY=sk-1234567890abcdef
DATABASE_URL=postgresql://localhost:5432/testdb
PORT=3000
DEBUG=true
ALLOWED_ORIGINS=http://localhost:3000,https://example.com
`);
  });

  it('should handle mixed valid and missing variables', () => {
    const template =
      'API_KEY=[[USE_USER_ENV(API_KEY)]]\nMISSING=[[USE_USER_ENV(MISSING)]]\nPORT=[[USE_USER_ENV(PORT)]]';
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
        PORT: 3000,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe('API_KEY=sk-1234567890abcdef\nMISSING=\nPORT=3000');
  });

  it('should handle USE_USER_ENV in multiline template', () => {
    const template = `const config = {
  apiKey: '[[USE_USER_ENV(API_KEY)]]',
  databaseUrl: '[[USE_USER_ENV(DATABASE_URL)]]',
  port: [[USE_USER_ENV(PORT)]],
};`;
    const userMetadata = {
      env: {
        API_KEY: 'sk-1234567890abcdef',
        DATABASE_URL: 'postgresql://localhost:5432/testdb',
        PORT: 3000,
      },
    };

    const result = processCommand(
      template,
      userFiles,
      schemaInfoParsed,
      undefined,
      undefined,
      undefined,
      formData,
      userMetadata,
    );

    expect(result).toBe(`const config = {
  apiKey: 'sk-1234567890abcdef',
  databaseUrl: 'postgresql://localhost:5432/testdb',
  port: 3000,
};`);
  });
});
