import { useEffect, useState } from 'react';
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
    SQLInsertQueries,
    mockData,
    deleteTablesQueries,
    joins,
    aggregateJoins,
    setTransformations,
  } = useTransformationsStore();

  const [includeInsertData, setIncludeInsertData] = useState<boolean>(false);

  useEffect(() => {
    setTransformations();
  }, [schemaInput, setTransformations]);

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
        <h1 className="text-2xl font-bold text-center">App Scaffolder</h1>
      </div>
      <div className="grid gap-4 p-4">
        {/* First row with form, create tables, and delete tables */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 p-4 shadow-md rounded-md">
            <h2 className="text-xl font-bold mb-2">JSON Database Schema</h2>
            <form className="space-y-4">
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
                className="block text-sm font-medium"
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
                className="block text-sm font-medium"
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
                      .then((result: Record<string, unknown>) => {
                        // Success

                        /* prettier-ignore */ (() => { const QuickLog = JSON.stringify(result, null, 4); const parentDiv = document.getElementById('quicklogContainer') ?? (() => {const div = document.createElement('div');div.id = 'quicklogContainer';div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end;';document.body.appendChild(div);return div; })(); const createChildDiv = (text: typeof QuickLog) => {const newDiv = Object.assign(document.createElement('div'), { textContent: text, style: 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer;',});const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div');if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { const textArea = document.createElement('textarea'); textArea.value = clickedDiv.textContent ?? ''; document.body.appendChild(textArea); textArea.select(); document.execCommand('copy'); document.body.removeChild(textArea);clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }};const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); }};newDiv.addEventListener('mousedown', handleMouseDown);newDiv.addEventListener('contextmenu', handleRightClick);return newDiv; };parentDiv.prepend(createChildDiv(QuickLog)); })()
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
              value={`${SQLSchema}${includeInsertData ? `\n\n${SQLInsertQueries}` : ''}`}
              readOnly
              rows={15}
              className="p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
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
            <button
              onClick={() => {
                handleCopy(
                  `${SQLSchema}${includeInsertData ? `\n\n${SQLInsertQueries}` : ''}`,
                );
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
