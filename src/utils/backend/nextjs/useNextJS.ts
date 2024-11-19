import { IStructure } from '@/components/FileViewer';
import { ISchemaInfo } from '@/interfaces/interfaces';
import createControllers from '@/utils/backend/nextjs/createControllers';
import createAPIRoutes from '@/utils/backend/nextjs/createAPIRoutes';
import createDatabaseClient from '@/utils/backend/nextjs/createDatabaseClient';
import createDataTypeParser from '@/utils/backend/nextjs/createDataTypeParser';

export function useNextJS({
  schemaInfo,
}: {
  schemaInfo: ISchemaInfo[];
}): IStructure {
  const fileStructure: IStructure = [
    {
      type: 'folder',
      name: 'src',
      files: [
        {
          type: 'folder',
          name: 'app',
          files: [
            {
              type: 'folder',
              name: 'api',
              files: createAPIRoutes(schemaInfo),
            },
            {
              type: 'folder',
              name: 'Http',
              files: [
                {
                  type: 'folder',
                  name: 'Controllers',
                  files: createControllers(schemaInfo),
                },
              ],
            },
          ],
        },
        {
          type: 'folder',
          name: 'prisma',
          files: [createDatabaseClient()],
        },
        {
          type: 'folder',
          name: 'utils',
          files: [createDataTypeParser()],
        },
      ],
    },
  ];

  // /*prettier-ignore*/ (($= fileStructure) => { const isObject = (obj: unknown): obj is Record<string, unknown> => { return obj !== null && typeof obj === 'object'; }; const isArrayOfObjects = (arr: unknown): arr is Record<string, unknown>[] => { return Array.isArray(arr) && arr.every(isObject); }; const parentDiv: HTMLElement = document.getElementById('quicklogContainer') ?? (() => { const div = document.createElement('div'); div.id = 'quicklogContainer'; div.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 1000; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; max-height: 90vh; overflow-y: auto; padding: 10px; box-sizing: border-box;'; const helperButtonsDiv = document.createElement('div'); helperButtonsDiv.style.cssText = 'position: sticky; bottom: 0; display: flex; flex-direction: column; z-index: 1001;'; const clearButton = document.createElement('button'); clearButton.textContent = 'Clear'; clearButton.style.cssText = 'margin-top: 10px; background-color: red; color: white; border: none; padding: 5px; cursor: pointer; border-radius: 5px;'; clearButton.onclick = () => { if (parentDiv instanceof HTMLElement) { parentDiv.remove(); } }; helperButtonsDiv.appendChild(clearButton); document.body.appendChild(div); div.appendChild(helperButtonsDiv); return div; })(); const createTable = (obj: Record<string, unknown>): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; Object.entries(obj).forEach(([key, value]) => { const row = document.createElement('tr'); const keyCell = document.createElement('td'); const valueCell = document.createElement('td'); keyCell.textContent = key; valueCell.textContent = String(value); keyCell.style.cssText = 'border: 1px solid black; padding: 5px;'; valueCell.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(keyCell); row.appendChild(valueCell); table.appendChild(row); }); return table; }; const createTableFromArray = ( arr: Record<string, unknown>[], ): HTMLTableElement => { const table = document.createElement('table'); table.style.cssText = 'border-collapse: collapse; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; font: bold 25px "Comic Sans MS"; margin-bottom: 10px;'; const headers = Object.keys(arr[0]); const headerRow = document.createElement('tr'); headers.forEach((header) => { const th = document.createElement('th'); th.textContent = header; th.style.cssText = 'border: 1px solid black; padding: 5px;'; headerRow.appendChild(th); }); table.appendChild(headerRow); arr.forEach((obj) => { const row = document.createElement('tr'); headers.forEach((header) => { const td = document.createElement('td'); td.textContent = String(obj[header]); td.style.cssText = 'border: 1px solid black; padding: 5px;'; row.appendChild(td); }); table.appendChild(row); }); return table; }; const createChildDiv = (data: unknown): HTMLElement => { const newDiv = document.createElement('div'); const jsonData = JSON.stringify(data, null, 2); if (isArrayOfObjects(data)) { const table = createTableFromArray(data); newDiv.appendChild(table); } else if (isObject(data)) { const table = createTable(data); newDiv.appendChild(table); } else { newDiv.textContent = String(data); } newDiv.style.cssText = 'font: bold 25px "Comic Sans MS"; width: max-content; max-width: 500px; word-wrap: break-word; background-color: yellow; box-shadow: white 0px 0px 5px 1px; padding: 5px; border: 3px solid black; border-radius: 10px; color: black !important; cursor: pointer; margin-bottom: 10px;'; const handleMouseDown = (e: MouseEvent) => { e.preventDefault(); const clickedDiv = e.target instanceof Element && e.target.closest('div'); if (clickedDiv !== null && e.button === 0 && clickedDiv === newDiv) { void navigator.clipboard.writeText(jsonData).then(() => { clickedDiv.style.backgroundColor = 'gold'; setTimeout(() => { clickedDiv.style.backgroundColor = 'yellow'; }, 1000); }); } }; const handleRightClick = (e: MouseEvent) => { e.preventDefault(); if (parentDiv.contains(newDiv)) { parentDiv.removeChild(newDiv); if (!parentDiv.hasChildNodes()) { parentDiv.remove(); } } }; newDiv.addEventListener('mousedown', handleMouseDown); newDiv.addEventListener('contextmenu', handleRightClick); return newDiv; }; parentDiv.prepend(createChildDiv($)); })();

  return fileStructure;
}
