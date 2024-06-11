import { useState, useEffect, useCallback } from 'react';
import JSON5 from 'json5';
import generateTypescriptInterfaces from './utils/generateTypeScriptInterfaces';
import generateSQLCreateTables from './utils/generateSQLSchema';
import generateMockData from './utils/generateMockData';
import generateInsertQueries from './utils/generateInsertQueries';

import '@/styles/style.css';
import generateJoinQueries from '@/utils/generateJoinQueries';

function App(): JSX.Element {
  const [rawSchema, setRawSchema] = useState<string>('');
  const [interfaces, setInterfaces] = useState<string>('');
  const [SQLSchema, setSQLSchema] = useState<string>('');
  const [mockData, setMockData] = useState<Record<string, unknown[]>>({});
  const [foreignKeys, setForeignKeys] = useState<string[]>([]);

  const [includeInsertData, setIncludeInsertData] = useState<boolean>(false);

  useEffect(() => {
    const savedSchema = localStorage.getItem('rawSchema');
    if (savedSchema != null) {
      setRawSchema(savedSchema);
    }
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
    processSchema(rawSchema);
  }, [rawSchema, includeInsertData, processSchema]);

  const handleRawSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newRawSchema = e.target.value;
    setRawSchema(newRawSchema);
    localStorage.setItem('rawSchema', newRawSchema);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        // eslint-disable-next-line no-alert
        // alert('Copied to clipboard');
      })
      .catch((err: unknown) => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="container">
      <div className="header">
        <h1>App Scaffolder</h1>
      </div>
      <textarea
        name="rawSchema"
        id="rawSchema"
        value={rawSchema}
        onChange={handleRawSchemaChange}
        placeholder="Enter JSON schema here..."
        rows={10}
        className="textarea"
      />
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
                onChange={(e) => {
                  setIncludeInsertData(e.target.checked);
                }}
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
