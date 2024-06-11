import { useState, useEffect, useCallback } from 'react';
import JSON5 from 'json5';
import generateTypescriptInterfaces from './utils/generateInterfaceTypescript';
import generateSQLCreateTables from './utils/generateSQLSchema';
import generateMockData from './utils/generateMockData';
import generateInsertQueries from './utils/generateInsertQueries';

import '@/styles/style.css';
import generateJoinQueries from '@/utils/generateJoinQueries';

function App(): JSX.Element {
  const FRAMEWORKS = {
    NEXTJS: 'Next.js',
    LARAVEL: 'Laravel',
    SPRING_BOOT: 'Spring Boot',
  } as const;

  const [framework, setFramework] = useState<
    (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS]
  >(FRAMEWORKS.LARAVEL);

  const [schemaInput, setRawSchema] = useState<string>('');
  const [backendDir, setBackendDir] = useState<string>('');
  const [frontendDir, setFrontendDir] = useState<string>('');
  const [dbConnection, setDatabaseConnection] = useState<string>('');
  const [interfaces, setInterfaces] = useState<string>('');
  const [SQLSchema, setSQLSchema] = useState<string>('');
  const [mockData, setMockData] = useState<Record<string, unknown[]>>({});
  const [foreignKeys, setForeignKeys] = useState<string[]>([]);
  const [includeInsertData, setIncludeInsertData] = useState<boolean>(false);

  /* Load saved form data from localStorage */
  useEffect(() => {
    const savedSchema = localStorage.getItem('rawSchema');
    const savedBackendDir = localStorage.getItem('backendDir');
    const savedFrontendDir = localStorage.getItem('frontendDir');
    const savedDbConnection = localStorage.getItem('dbConnection');
    const savedFramework = localStorage.getItem('framework');
    const savedIncludeInsertData = localStorage.getItem('includeInsertData');

    if (savedSchema != null) setRawSchema(savedSchema);
    if (savedBackendDir != null) setBackendDir(savedBackendDir);
    if (savedFrontendDir != null) setFrontendDir(savedFrontendDir);
    if (savedDbConnection != null) setDatabaseConnection(savedDbConnection);
    if (savedFramework != null)
      setFramework(
        savedFramework as (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS],
      );
    if (savedIncludeInsertData != null)
      setIncludeInsertData(savedIncludeInsertData === 'true');
  }, []);

  const processSchema = useCallback(
    (schemaString: string) => {
      if (schemaString === '') {
        setInterfaces('');
        setSQLSchema('');
        setMockData({});
        setForeignKeys([]);
        return;
      }

      try {
        const parsedSchema: Record<string, unknown[]> =
          JSON5.parse(schemaString);

        setInterfaces(generateTypescriptInterfaces(parsedSchema));
        setSQLSchema(
          generateSQLCreateTables(parsedSchema) +
            (includeInsertData
              ? '\n\n' + generateInsertQueries(parsedSchema)
              : ''),
        );
        setMockData(generateMockData(parsedSchema));
        setForeignKeys(generateJoinQueries(parsedSchema));
      } catch (e) {
        setInterfaces('Invalid JSON input');
        setSQLSchema('Invalid JSON input');
        setMockData({});
        setForeignKeys(['Invalid JSON input']);
      }
    },
    [includeInsertData],
  );

  useEffect(() => {
    processSchema(schemaInput);
  }, [schemaInput, includeInsertData, processSchema]);

  /* Save form data to localStorage */
  const handleRawSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRawSchema = e.target.value;
    setRawSchema(newRawSchema);
    localStorage.setItem('rawSchema', newRawSchema);
  };

  const handleBackendDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newBackendDir = e.target.value;
    setBackendDir(newBackendDir);
    localStorage.setItem('backendDir', newBackendDir);
  };

  const handleFrontendDirChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFrontendDir = e.target.value;
    setFrontendDir(newFrontendDir);
    localStorage.setItem('frontendDir', newFrontendDir);
  };

  const handleDatabaseConnectionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newDbConnection = e.target.value;
    setDatabaseConnection(newDbConnection);
    localStorage.setItem('dbConnection', newDbConnection);
  };

  const handleFrameworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFramework = e.target
      .value as (typeof FRAMEWORKS)[keyof typeof FRAMEWORKS];
    setFramework(newFramework);
    localStorage.setItem('framework', newFramework);
  };

  const handleIncludeInsertDataChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newIncludeInsertData = e.target.checked;
    setIncludeInsertData(newIncludeInsertData);
    localStorage.setItem('includeInsertData', String(newIncludeInsertData));
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="container">
      <div className="header">
        <h1>App Scaffolder</h1>
      </div>

      <form>
        <textarea
          name="rawSchema"
          id="rawSchema"
          value={schemaInput}
          onChange={handleRawSchemaChange}
          placeholder="Enter JSON schema here..."
          rows={10}
          className="textarea"
        />
        <input
          type="text"
          name="backendDir"
          id="backendDir"
          placeholder="Backend root directory"
          value={backendDir}
          onChange={handleBackendDirChange}
        />
        <br />
        <input
          type="text"
          name="frontendDir"
          id="frontendDir"
          placeholder="Frontend root directory"
          value={frontendDir}
          onChange={handleFrontendDirChange}
        />
        <br />
        <input
          type="text"
          name="databaseConnection"
          id="databaseConnection"
          placeholder="Database connection"
          value={dbConnection}
          onChange={handleDatabaseConnectionChange}
        />
        <br />
        <select
          onChange={handleFrameworkChange}
          value={framework}
          name="framework"
          id="framework"
        >
          {Object.entries(FRAMEWORKS).map(([key, value]: [string, string]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </form>
      <br />
      {schemaInput !== '' && backendDir !== '' && (
        <button
          onClick={() => {
            fetch(
              `${String(import.meta.env.VITE_BACKEND_URL)}/${String(import.meta.env.VITE_API_URL)}/createFile`,
              {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  targetDirectory: backendDir,
                  framework,
                  content: 'Test Content',
                }),
              },
            )
              .then((response) => response.json())
              .then((result) => {
                // eslint-disable-next-line no-console
                console.log(JSON.stringify(result, null, 4));
              })
              .catch((error: unknown) => {
                throw new Error(String(error));
              });
          }}
        >
          Generate Project Files
        </button>
      )}
      <div className="columns">
        <div className="column">
          <h2>Foreign Keys</h2>
          <div className="join-queries">
            {foreignKeys.map((value, i) => (
              <p key={i}>{value}</p>
            ))}
          </div>
          <br />
          <button
            onClick={() => {
              handleCopy(foreignKeys.join('\n'));
            }}
            className="button"
          >
            Copy Join Queries
          </button>
          <h2>Database Schema</h2>
          <div className="checkbox-container">
            <label>
              <input
                type="checkbox"
                checked={includeInsertData}
                onChange={handleIncludeInsertDataChange}
              />
              Include Insert Data
            </label>
          </div>
          <textarea value={SQLSchema} readOnly rows={15} className="textarea" />
          <button
            onClick={() => {
              handleCopy(SQLSchema);
            }}
            className="button"
          >
            Copy Database Schema
          </button>
          &nbsp;
          {schemaInput !== '' && dbConnection !== '' && (
            <button
              onClick={() => {
                handleCopy(SQLSchema);
              }}
              className="button"
            >
              Execute Query
            </button>
          )}
        </div>

        <div className="column">
          <h2>Interfaces</h2>
          <textarea
            value={interfaces}
            readOnly
            rows={10}
            className="textarea"
          />
          <button
            onClick={() => {
              handleCopy(interfaces);
            }}
            className="button"
          >
            Copy Interfaces
          </button>
          <h2>Mock Data</h2>
          <textarea
            value={JSON.stringify(mockData, null, 2)}
            readOnly
            rows={10}
            className="textarea"
          />
          <button
            onClick={() => {
              handleCopy(JSON.stringify(mockData, null, 2));
            }}
            className="button"
          >
            Copy Mock Data
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
