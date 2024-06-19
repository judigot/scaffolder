import { useEffect } from 'react';
import { frameworks, useFormStore } from '@/useFormStore';
import { useTransformationsStore } from '@/useTransformationsStore';

import '@/styles/scss/main.scss';

function App() {
  const {
    formData: { schemaInput, backendDir, frontendDir, dbConnection, framework },
    setFormData,
  } = useFormStore();

  const {
    interfaces,
    SQLSchema,
    mockData,
    deleteTablesQueries,
    joins,
    aggregateJoins,
    includeInsertData,
    setIncludeInsertData,
    setTransformations,
  } = useTransformationsStore();

  useEffect(() => {
    setTransformations();
  }, [schemaInput, includeInsertData, setTransformations]);

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
      setFormData({
        [name]: type === 'checkbox' ? !!(checked ?? false) : value,
      });
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch((err: unknown) => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="text-white bg-black">
      <div className="bg-gray-900 text-white p-4">
        <h1 className="text-2xl font-bold">App Scaffolder</h1>
      </div>
      <div className="grid gap-4 p-4">
        {/* First row with form, create tables, and delete tables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">JSON Schema</h2>
            <form className="space-y-4">
              <textarea
                id="schemaInput"
                name="schemaInput"
                value={schemaInput}
                onChange={handleChange}
                rows={10}
                className="mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              />
              <label
                htmlFor="backendDir"
                className="block text-sm font-medium text-gray-400"
              >
                Backend Directory:
                <input
                  type="text"
                  id="backendDir"
                  name="backendDir"
                  value={backendDir}
                  onChange={handleChange}
                  className="p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              </label>
              <label
                htmlFor="frontendDir"
                className="block text-sm font-medium text-gray-400"
              >
                Frontend Directory:
                <input
                  type="text"
                  id="frontendDir"
                  name="frontendDir"
                  value={frontendDir}
                  onChange={handleChange}
                  className="p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              </label>
              <label
                htmlFor="dbConnection"
                className="block text-sm font-medium text-gray-400"
              >
                Database Connection:
                <input
                  type="text"
                  id="dbConnection"
                  name="dbConnection"
                  value={dbConnection}
                  onChange={handleChange}
                  className="p-2 h-10 mt-1 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
                />
              </label>
              <label
                htmlFor="framework"
                className="block text-sm font-medium text-gray-400"
              >
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
                      <option key={key}>{value}</option>
                    ),
                  )}
                </select>
              </label>
            </form>
          </div>

          <div className="bg-gray-800 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">Create Tables</h2>
            <textarea
              id="SQLSchema"
              value={SQLSchema}
              readOnly
              rows={15}
              className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
            <label
              htmlFor="includeInsertData"
              className="block text-sm font-medium text-gray-400 mt-4"
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
            <h2 className="text-xl font-bold mb-2">Interfaces</h2>
            <textarea
              id="interfaces"
              value={interfaces}
              readOnly
              rows={10}
              className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
            <button
              onClick={() => {
                handleCopy(interfaces);
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
