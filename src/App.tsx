import { useEffect, useState } from 'react';
import { frameworks, useFormStore } from '@/useFormStore';
import { useTransformationsStore } from '@/useTransformationsStore';

import '@/styles/scss/main.scss';
import { useModalStore } from '@/useModalStore';
import { ISchemaInfo } from '@/interfaces/interfaces';

function App() {
  const {
    setExample1,
    setExample2,
    formData: {
      schemaInput,
      backendDir,
      frontendDir,
      dbConnection,
      framework,
      includeInsertData,
      insertOption,
      includeTypeGuards,
    },
    // setFormData,
  } = useFormStore();

  const {
    getSchemaInfo,
    interfaces,
    SQLSchema,
    mockData,
    deleteTablesQueries,
    joins,
    aggregateJoins,
    setTransformations,
  } = useTransformationsStore();

  const [generationStatus, setGenerationStatus] = useState<{
    isBackendDirValid: boolean;
    isFrontendDirValid: boolean;
    isDBConnectionValid: boolean;
  }>({
    isBackendDirValid: true,
    isFrontendDirValid: true,
    isDBConnectionValid: true,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    setTransformations();
  }, [
    schemaInput,
    includeInsertData,
    insertOption,
    includeTypeGuards,
    setTransformations,
  ]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;

    useFormStore.setState((state) => {
      const newFormData = {
        ...state.formData,
        [name]: type === 'checkbox' ? !!(checked ?? false) : value,
      };

      return { formData: newFormData };
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      console.error('Failed to copy text: ', err);
    });
  };

  const { setSQLSchemaEditable, setIsModalOpen } = useModalStore();

  return (
    <div className="text-white bg-black">
      <div className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold text-center">App Scaffolder</h1>
      </div>
      <div className="grid gap-4 p-4">
        {/* First row with form, create tables, and delete tables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">JSON Database Schema</h2>
            <form className="space-y-4">
              <div className="float-right">
                <button
                  type="button"
                  onClick={() => {
                    setExample1();
                  }}
                  className="px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Example 1
                </button>
                &nbsp; &nbsp;
                <button
                  type="button"
                  onClick={() => {
                    setExample2();
                  }}
                  className="px-2 py-0.5 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-900 focus:outline-none focus:ring focus:ring-gray-500 focus:ring-opacity-50"
                >
                  Example 2
                </button>
              </div>

              <br />
              <textarea
                id="schemaInput"
                name="schemaInput"
                value={schemaInput}
                onChange={handleChange}
                rows={10}
                className="p-2 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              />
              <label htmlFor="backendDir" className="block text-sm font-medium">
                Backend Directory:
                {!generationStatus.isBackendDirValid && (
                  <i className="text-red-500">
                    &nbsp;Invalid backend directory
                  </i>
                )}
                <input
                  type="text"
                  id="backendDir"
                  name="backendDir"
                  value={backendDir}
                  onChange={handleChange}
                  className={`p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isBackendDirValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </label>
              <label
                htmlFor="frontendDir"
                className="block text-sm font-medium"
              >
                Frontend Directory:
                {!generationStatus.isFrontendDirValid && (
                  <i className="text-red-500">
                    &nbsp;Invalid frontend directory
                  </i>
                )}
                <input
                  type="text"
                  id="frontendDir"
                  name="frontendDir"
                  value={frontendDir}
                  onChange={handleChange}
                  className={`p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isFrontendDirValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
              </label>
              <label
                htmlFor="dbConnection"
                className="block text-sm font-medium"
              >
                Database Connection:
                {!generationStatus.isDBConnectionValid && (
                  <i className="text-red-500">
                    &nbsp;Invalid connection string
                  </i>
                )}
                <input
                  type="text"
                  id="dbConnection"
                  name="dbConnection"
                  value={dbConnection}
                  onChange={handleChange}
                  className={`p-2 h-10 mt-1 block w-full border bg-gray-900 text-white rounded-md shadow-sm focus:ring focus:ring-indigo-500 focus:ring-opacity-50 ${
                    generationStatus.isDBConnectionValid
                      ? 'border-gray-700 focus:border-indigo-500'
                      : 'border-red-500 focus:border-red-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    fetch(`http://localhost:5000/introspect`, {
                      // *GET, POST, PATCH, PUT, DELETE
                      method: 'POST',
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                      },
                      // For POST, PATCH, and PUT requests
                      body: JSON.stringify({ dbConnection }),
                    })
                      .then((response) => response.json())
                      .then((schemaInfo: ISchemaInfo[]) => {
                        /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(schemaInfo, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()
                      })
                      .catch(() => {
                        // Failure
                      });
                  }}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  Introspect Database
                </button>
              </label>
              <label htmlFor="framework" className="block text-sm font-medium">
                Framework:
                <select
                  id="framework"
                  name="framework"
                  value={framework}
                  onChange={handleChange}
                  className="p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                >
                  <option value={''}>Select a framework</option>
                  {Object.entries(frameworks).map(
                    ([key, value]: [string, string]) => (
                      <option key={key} value={value}>
                        {value}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsLoading(true);
                  fetch(`http://localhost:5000/scaffoldProject`, {
                    method: 'POST',
                    headers: {
                      Accept: 'application/json',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      relationships: getSchemaInfo(),
                      interfaces,
                      backendDir,
                      frontendDir,
                      dbConnection,
                      framework,
                      SQLSchema,
                    }),
                  })
                    .then((response) => response.json())
                    .then((result: typeof generationStatus) => {
                      // Success
                      setGenerationStatus(result);
                    })
                    .catch((error: unknown) => {
                      // Failure
                      if (typeof error === `string`) {
                        throw Error(`There was an error: error`);
                      }
                      if (error instanceof Error) {
                        throw Error(`There was an error: ${error.message}`);
                      }
                    })
                    .finally(() => {
                      setIsLoading(false);
                    });
                }}
                className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {isLoading && 'Generating...'}
                {!isLoading && 'Generate App'}
              </button>
            </form>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Create Tables</h2>
            <textarea
              id="SQLSchema"
              title="Double click to edit schema"
              value={SQLSchema}
              readOnly
              onDoubleClick={() => {
                setSQLSchemaEditable(SQLSchema);
                setIsModalOpen(true);
              }}
              rows={15}
              className="cursor-pointer p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
            <label
              htmlFor="includeInsertData"
              className="block text-sm font-medium mt-4"
            >
              <input
                type="checkbox"
                id="includeInsertData"
                name="includeInsertData"
                checked={includeInsertData}
                onChange={handleChange}
                className="mr-2"
              />
              Include Insert Data
            </label>
            {includeInsertData && (
              <div className="mt-2">
                <label className="block text-sm font-medium">
                  <input
                    type="radio"
                    name="insertOption"
                    value="SQLInsertQueries"
                    checked={insertOption === 'SQLInsertQueries'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Rows from JSON Database Schema
                </label>
                <label className="block text-sm font-medium">
                  <input
                    type="radio"
                    name="insertOption"
                    value="SQLInsertQueriesFromMockData"
                    checked={insertOption === 'SQLInsertQueriesFromMockData'}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Rows from mock data
                </label>
              </div>
            )}
            <button
              onClick={() => {
                handleCopy(SQLSchema);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Database Schema
            </button>
            <br />
            {schemaInput !== '' && dbConnection !== '' && (
              <button
                onClick={() => {
                  handleCopy(SQLSchema);
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Execute Query
              </button>
            )}
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Delete Tables</h2>
            <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
              {deleteTablesQueries.map((value, i) => (
                <p key={i} className="whitespace-pre-wrap">
                  {value}
                </p>
              ))}
            </div>
            <button
              onClick={() => {
                handleCopy(deleteTablesQueries.join('\n'));
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Delete Queries
            </button>
            <br />
            {schemaInput !== '' && dbConnection !== '' && (
              <button
                onClick={() => {
                  handleCopy(SQLSchema);
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Execute Query
              </button>
            )}
          </div>
        </div>

        {/* Second row with other content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Join Queries</h2>
            <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
              {joins.map((value, i) => (
                <div key={i}>
                  <p className="whitespace-pre-wrap">{value}</p>
                  <br />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                handleCopy(joins.join('\n'));
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Join Queries
            </button>
            <br />

            {schemaInput !== '' && dbConnection !== '' && (
              <button
                onClick={() => {
                  handleCopy(SQLSchema);
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Execute Query
              </button>
            )}
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Aggregate Join Queries</h2>
            <div className="block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 p-2">
              {aggregateJoins.map((value, i) => (
                <div key={i}>
                  <p className="whitespace-pre-wrap">{value}</p>
                  <br />
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                handleCopy(aggregateJoins.join('\n'));
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Join Queries
            </button>
            <br />
            {schemaInput !== '' && dbConnection !== '' && (
              <button
                onClick={() => {
                  handleCopy(SQLSchema);
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              >
                Execute Query
              </button>
            )}
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <div className="float-right">
              <label
                htmlFor="includeTypeGuards"
                className="block text-sm font-medium mt-4"
              >
                <input
                  type="checkbox"
                  id="includeTypeGuards"
                  name="includeTypeGuards"
                  checked={includeTypeGuards}
                  onChange={handleChange}
                  className="mr-2"
                />
                Include Type Guards
              </label>
            </div>
            <h2 className="text-xl font-bold mb-2">Interfaces</h2>
            <br />
            <div className="">
              {typeof interfaces === 'string' ? (
                <textarea
                  id="interfaces"
                  value={interfaces}
                  readOnly
                  rows={10}
                  className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {Object.entries(interfaces).map(
                    ([interfaceName, content]) => (
                      <div key={interfaceName} className="mb-4">
                        <h3 className="text-base font-semibold text-white mb-2">
                          {interfaceName}.ts
                        </h3>
                        <textarea
                          value={content}
                          readOnly
                          rows={10}
                          className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                          style={{ height: '150px' }}
                        />
                        <button
                          onClick={() => {
                            handleCopy(content);
                          }}
                          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                        >
                          Copy {interfaceName}
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                const content =
                  typeof interfaces === 'string'
                    ? interfaces
                    : Object.entries(interfaces)
                        .map(
                          ([fileName, content]) =>
                            `\n/* ${fileName}.ts */\n${content}`,
                        )
                        .join('\n');
                handleCopy(content);
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Interfaces
            </button>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Mock Data</h2>
            <textarea
              id="mockData"
              value={JSON.stringify(mockData, null, 2)}
              readOnly
              rows={10}
              className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
            <button
              onClick={() => {
                handleCopy(JSON.stringify(mockData, null, 2));
              }}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Copy Mock Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
