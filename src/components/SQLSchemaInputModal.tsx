import { ISchemaInfo } from '@/interfaces/interfaces';
import { useFormStore } from '@/useFormStore';
import { useModalStore } from '@/useModalStore';
import useTransformationsStore from '@/useTransformationsStore';
import React, { FormEvent, useEffect, useState } from 'react';

interface IForm {
  SQLSchemaEditable: string;
}

function SQLSchemaInputModal() {
  const {
    formData: { dbConnection },
  } = useFormStore();
  const { isModalOpen, setIsModalOpen, SQLSchemaEditable } = useModalStore();
  const { setIntrospectedSchema } = useTransformationsStore();

  const [formData, setFormData] = useState<IForm>({ SQLSchemaEditable: '' });
  const [isEdited, setIsEdited] = useState<boolean>(false);

  useEffect(() => {
    setFormData({ SQLSchemaEditable });
    setIsEdited(false);
  }, [SQLSchemaEditable]);

  const handleInputChange = (e: FormEvent<HTMLTextAreaElement>) => {
    const { value } = e.currentTarget;
    setFormData({ SQLSchemaEditable: value });
    setIsEdited(true);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    function isSchemaInput(data: unknown): data is IForm {
      return (
        data !== null &&
        typeof data === 'object' &&
        'SQLSchemaEditable' in data &&
        typeof data.SQLSchemaEditable === 'string'
      );
    }

    if (isSchemaInput(data)) {
      fetch('http://localhost:5000/executeCustomSchema', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dbConnection,
          SQLSchemaEditable: data.SQLSchemaEditable,
        }),
      })
        .then((response) => response.json())
        .then((schemaInfoNew: ISchemaInfo[]) => {
          /* prettier-ignore */ (() => { const QuickLog = schemaInfoNew; const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv(QuickLog)); })();
          setIntrospectedSchema(schemaInfoNew);
        })
        .catch(() => {
          // Handle error
        });

      setIsModalOpen(false);
      setIsEdited(false);
      resetForm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isEdited) {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && !isEdited) {
      setIsModalOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setIsEdited(false);
  };

  if (!isModalOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center"
      onKeyDown={() => {
        //
      }}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full space-y-4">
        <h1 className="text-lg font-bold text-white">Edit SQL Schema</h1>
        <form className="flex flex-col space-y-4" onSubmit={handleSubmit}>
          <div>
            <textarea
              id="SQLSchemaEditable"
              name="SQLSchemaEditable"
              value={formData.SQLSchemaEditable}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={10}
              className="h-[150px] p-2 block w-full border border-gray-700 bg-gray-900 text-white rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring focus:ring-indigo-500 focus:ring-opacity-50"
            >
              Execute Query
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SQLSchemaInputModal;
