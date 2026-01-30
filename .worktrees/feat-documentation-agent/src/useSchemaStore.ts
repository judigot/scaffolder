import { create } from 'zustand';
import type { ISchemaInfo } from '@/interfaces/interfaces.ts';
import type { IFile, IFolder, IStructure } from '@/components/FileViewer.tsx';
import equal from 'fast-deep-equal';
import masterSchema from '@/schema-infos/masterSchema.ts';

export interface ISchemaFile {
  name: string;
  filePath: string;
  content: ISchemaInfo[];
}

interface ISchemaStore {
  /* Available schemas from userFiles */
  availableSchemas: ISchemaFile[];

  /* Currently selected schema */
  selectedSchemaName: string | null;

  /* Original schema content (for dirty tracking) */
  originalSchemaContent: ISchemaInfo[] | null;

  /* Loading and saving states */
  isSaving: boolean;
  isDeleting: boolean;
  saveError: string | null;
  deleteError: string | null;

  /* Actions */
  setAvailableSchemas: (schemas: ISchemaFile[]) => void;
  loadSchemasFromUserFiles: (userFiles: IStructure) => void;
  selectSchema: (schemaName: string | null) => ISchemaInfo[] | null;
  setOriginalSchemaContent: (content: ISchemaInfo[] | null) => void;
  isDirty: (currentContent: ISchemaInfo[]) => boolean;
  getSchemaByName: (name: string) => ISchemaFile | null;

  /* CRUD state setters */
  setSaving: (isSaving: boolean) => void;
  setDeleting: (isDeleting: boolean) => void;
  setSaveError: (error: string | null) => void;
  setDeleteError: (error: string | null) => void;

  /* Schema operations (UI helpers) */
  generateUniqueSchemaName: (baseName: string) => string;
  generateDuplicateName: (originalName: string) => string;
}

const isISchemaInfoArray = (val: unknown): val is ISchemaInfo[] => {
  if (!Array.isArray(val)) {
    return false;
  }
  return val.every((item): item is ISchemaInfo => {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    if (!('tableName' in item) || !('columnsInfo' in item)) {
      return false;
    }
    /* eslint-disable-next-line no-type-assertion/no-type-assertion */
    const tableNameProp = (item as { tableName: unknown }).tableName;
    /* eslint-disable-next-line no-type-assertion/no-type-assertion */
    const columnsInfoProp = (item as { columnsInfo: unknown }).columnsInfo;
    return typeof tableNameProp === 'string' && Array.isArray(columnsInfoProp);
  });
};

const parseSchemaContent = (content: string): ISchemaInfo[] | null => {
  try {
    const parsed: unknown = JSON.parse(content);
    if (isISchemaInfoArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const extractSchemasFromUserFiles = (userFiles: IStructure): ISchemaFile[] => {
  const schemas: ISchemaFile[] = [];

  const schemasFolder = userFiles.find(
    (item): item is IFolder =>
      item.name === 'Schemas' && item.type === 'folder',
  );

  if (!schemasFolder) {
    return schemas;
  }

  for (const child of schemasFolder.children) {
    if (child.type !== 'file') {
      continue;
    }

    const file: IFile = child;
    const isJsonFile = file.name.endsWith('.json');

    if (!isJsonFile) {
      continue;
    }

    const content = parseSchemaContent(file.content);

    if (content === null) {
      continue;
    }

    const schemaName = file.name.replace(/\.json$/, '');

    schemas.push({
      name: schemaName,
      filePath: `Schemas/${file.name}`,
      content,
    });
  }

  return schemas;
};

export const useSchemaStore = create<ISchemaStore>()((set, get) => ({
  availableSchemas: [],
  selectedSchemaName: null,
  originalSchemaContent: null,
  isSaving: false,
  isDeleting: false,
  saveError: null,
  deleteError: null,

  setAvailableSchemas: (schemas) => {
    set({ availableSchemas: schemas });
  },

  loadSchemasFromUserFiles: (userFiles) => {
    const schemas = extractSchemasFromUserFiles(userFiles);
    set({ availableSchemas: schemas });
  },

  selectSchema: (schemaName) => {
    if (schemaName === null) {
      set({
        selectedSchemaName: null,
        originalSchemaContent: null,
      });
      return null;
    }

    const schema = get().availableSchemas.find((s) => s.name === schemaName);

    if (!schema) {
      return null;
    }

    /* Deep clone the content to avoid reference issues */
    const clonedContent: unknown = JSON.parse(JSON.stringify(schema.content));

    if (!isISchemaInfoArray(clonedContent)) {
      return null;
    }

    set({
      selectedSchemaName: schemaName,
      originalSchemaContent: clonedContent,
    });

    return clonedContent;
  },

  setOriginalSchemaContent: (content) => {
    if (content === null) {
      set({ originalSchemaContent: null });
      return;
    }

    /* Deep clone to avoid reference issues */
    const clonedContent: unknown = JSON.parse(JSON.stringify(content));
    if (isISchemaInfoArray(clonedContent)) {
      set({ originalSchemaContent: clonedContent });
    }
  },

  isDirty: (currentContent) => {
    const { originalSchemaContent, selectedSchemaName } = get();

    /* If no schema is selected, check against master schema */
    if (selectedSchemaName === null) {
      return !equal(currentContent, masterSchema);
    }

    /* If no original content, it's dirty if there's any current content */
    if (originalSchemaContent === null) {
      return currentContent.length > 0;
    }

    return !equal(currentContent, originalSchemaContent);
  },

  getSchemaByName: (name) => {
    return get().availableSchemas.find((s) => s.name === name) ?? null;
  },

  setSaving: (isSaving) => {
    set({ isSaving });
  },

  setDeleting: (isDeleting) => {
    set({ isDeleting });
  },

  setSaveError: (error) => {
    set({ saveError: error });
  },

  setDeleteError: (error) => {
    set({ deleteError: error });
  },

  generateUniqueSchemaName: (baseName) => {
    const { availableSchemas } = get();
    const existingNames = new Set(availableSchemas.map((s) => s.name));

    if (!existingNames.has(baseName)) {
      return baseName;
    }

    let counter = 2;
    let newName = `${baseName} (${String(counter)})`;

    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseName} (${String(counter)})`;
    }

    return newName;
  },

  generateDuplicateName: (originalName) => {
    const { availableSchemas } = get();
    const existingNames = new Set(availableSchemas.map((s) => s.name));

    const baseCopyName = `${originalName} - Copy`;

    if (!existingNames.has(baseCopyName)) {
      return baseCopyName;
    }

    let counter = 2;
    let newName = `${baseCopyName} (${String(counter)})`;

    while (existingNames.has(newName)) {
      counter++;
      newName = `${baseCopyName} (${String(counter)})`;
    }

    return newName;
  },
}));

export default useSchemaStore;
