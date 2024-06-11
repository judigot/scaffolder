import React, { useState, useEffect, useCallback } from 'react';
import JSON5 from 'json5';
import generateTypescriptInterfaces from './utils/generateInterfaceTypescript';
import generateSQLCreateTables from './utils/generateSQLSchema';
import generateMockData from './utils/generateMockData';
import generateInsertQueries from './utils/generateInsertQueries';
import generateJoinQueries from '@/utils/generateJoinQueries';
import '@/styles/style.css';

const FRAMEWORKS = ['Next.js', 'Laravel', 'Spring Boot'];

interface IFormInputValues {
  schemaInput: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  framework: string;
}

const defaultValues: IFormInputValues = {
  schemaInput: '',
  backendDir: '',
  frontendDir: '',
  dbConnection: '',
  framework: 'Laravel',
};

function App(): JSX.Element {
  const [formData, setFormData] = useState<IFormInputValues>(defaultValues);
  const [includeInsertData, setIncludeInsertData] = useState<boolean>(false);

  const [interfaces, setInterfaces] = useState<string>('');
  const [SQLSchema, setSQLSchema] = useState<string>('');
  const [mockData, setMockData] = useState<Record<string, unknown[]>>({});
  const [foreignKeys, setForeignKeys] = useState<string[]>([]);

  useEffect(() => {
    const savedData = localStorage.getItem('formData');
    if (savedData != null) {
      const parsedData = JSON.parse(savedData) as IFormInputValues;
      setFormData(parsedData);
    }
  }, []);

  useEffect(() => {
    if (formData !== defaultValues) {
      localStorage.setItem('formData', JSON.stringify(formData));
    }
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    if (name === 'includeInsertData') {
      setIncludeInsertData(checked ?? false);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: type === 'checkbox' ? !!(checked ?? false) : value,
      }));
    }
  };

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
    processSchema(formData.schemaInput);
  }, [formData.schemaInput, includeInsertData, processSchema]);

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

      <form className="form">
        <label htmlFor="schemaInput" className="form-label">
          Schema Input:
          <textarea
            id="schemaInput"
            name="schemaInput"
            value={formData.schemaInput}
            onChange={handleChange}
            rows={10}
            className="form-textarea"
          />
        </label>
        <label htmlFor="backendDir" className="form-label">
          Backend Directory:
          <input
            type="text"
            id="backendDir"
            name="backendDir"
            value={formData.backendDir}
            onChange={handleChange}
            className="form-input"
          />
        </label>
        <label htmlFor="frontendDir" className="form-label">
          Frontend Directory:
          <input
            type="text"
            id="frontendDir"
            name="frontendDir"
            value={formData.frontendDir}
            onChange={handleChange}
            className="form-input"
          />
        </label>
        <label htmlFor="dbConnection" className="form-label">
          Database Connection:
          <input
            type="text"
            id="dbConnection"
            name="dbConnection"
            value={formData.dbConnection}
            onChange={handleChange}
            className="form-input"
          />
        </label>
        <label htmlFor="framework" className="form-label">
          Framework:
          <select
            id="framework"
            name="framework"
            value={formData.framework}
            onChange={handleChange}
            className="form-select"
          >
            {FRAMEWORKS.map((framework) => (
              <option key={framework} value={framework}>
                {framework}
              </option>
            ))}
          </select>
        </label>
      </form>

      {formData.schemaInput !== '' && formData.backendDir !== '' && (
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
                  targetDirectory: formData.backendDir,
                  framework: formData.framework,
                  content: 'Test Content',
                }),
              },
            )
              .then((response) => response.json())
              .then(() => {
                return;
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
          <h2>Database Schema</h2>
          <label htmlFor="includeInsertData" className="form-checkbox-label">
            <input
              type="checkbox"
              id="includeInsertData"
              name="includeInsertData"
              checked={includeInsertData}
              onChange={handleChange}
              className="form-checkbox"
            />
            Include Insert Data
          </label>
          <br />
          <textarea id="SQLSchema" value={SQLSchema} readOnly rows={15} />
          <button
            onClick={() => {
              handleCopy(SQLSchema);
            }}
            className="button"
          >
            Copy Database Schema
          </button>
          <h2>Foreign Keys</h2>
          <div className="join-queries">
            {foreignKeys.map((value, i) => (
              <p key={i}>{value}</p>
            ))}
          </div>
          <button
            onClick={() => {
              handleCopy(foreignKeys.join('\n'));
            }}
            className="button"
          >
            Copy Join Queries
          </button>
          &nbsp;
          {formData.schemaInput !== '' && formData.dbConnection !== '' && (
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
          <textarea id="interfaces" value={interfaces} readOnly rows={10} />
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
            id="mockData"
            value={JSON.stringify(mockData, null, 2)}
            readOnly
            rows={10}
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
