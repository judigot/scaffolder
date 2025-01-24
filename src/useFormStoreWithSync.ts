/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { create } from 'zustand';
import { persist, createJSONStorage, PersistOptions } from 'zustand/middleware';
import extractDBConnectionInfo from '@/utils/extractDBConnectionInfo.ts';
import { DBTypes, IJSONSchema, ISchemaInfo } from '@/interfaces/interfaces.ts';
import { SQLQueries } from '@/utils/mappings.ts';
import { CREATION_MODES } from '@/constants.ts';
import { manyToMany, oneToMany, oneToOne } from '@/schema-infos/index.ts';
import identifySchema from '@/utils/identifySchema.ts';
import {
  usersPostOneToOneSchema,
  usersPostsOneToManySchema,
  POSSchema,
} from '@/json-schemas/index.ts';
import { useTransformationsStore } from '@/useTransformationsStore.ts';

const ENABLE_TAB_SYNC = true;
const SYNC_CHANNEL_NAME = 'scaffolder-sync';
interface ISyncMessage {
  type: 'STATE_UPDATE';
  payload: {
    formData?: IFormData;
    schemaInfo?: ISchemaInfo[];
  };
}
const createSyncChannel = () => {
  if (!ENABLE_TAB_SYNC) {
    return null;
  }

  try {
    return new BroadcastChannel(SYNC_CHANNEL_NAME);
  } catch {
    console.warn(
      'BroadcastChannel not supported, falling back to localStorage',
    );
    return null;
  }
};
function isSyncMessage(value: unknown): value is ISyncMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'STATE_UPDATE' &&
    'payload' in value &&
    typeof value.payload === 'object' &&
    value.payload !== null
  );
}
const handleSyncMessage = (
  message: MessageEvent<ISyncMessage>,
  set: (state: Partial<IFormStore>) => void,
) => {
  if (message.data.type === 'STATE_UPDATE') {
    const { formData, schemaInfo } = message.data.payload;
    const updates: Partial<IFormStore> = {};

    if (formData) {
      updates.formData = formData;
      const newDbType = determineSQLDatabaseType(formData.dbConnection);
      updates.dbType = newDbType;
      updates.quote = SQLQueries.quote[newDbType];
    }

    if (schemaInfo) {
      updates.schemaInfo = schemaInfo;
    }

    if (Object.keys(updates).length > 0) {
      set(updates);
    }
  }
};
const broadcastStateChange = (updates: Partial<IFormStore>) => {
  if (!ENABLE_TAB_SYNC) {
    return;
  }

  const payload: ISyncMessage['payload'] = {};

  if ('formData' in updates && updates.formData) {
    payload.formData = updates.formData;
  }
  if ('schemaInfo' in updates && updates.schemaInfo) {
    payload.schemaInfo = updates.schemaInfo;
  }

  if (Object.keys(payload).length === 0) {
    return;
  }

  const message: ISyncMessage = {
    type: 'STATE_UPDATE',
    payload,
  };

  if (syncChannel) {
    syncChannel.postMessage(message);
  } else {
    // Fallback to localStorage if BroadcastChannel is not supported
    const timestamp = Date.now();
    localStorage.setItem(
      `${SYNC_CHANNEL_NAME}-${String(timestamp)}`,
      JSON.stringify(message),
    );
    // Clean up old messages
    Object.keys(localStorage)
      .filter((key) => key.startsWith(SYNC_CHANNEL_NAME))
      .sort()
      .slice(0, -10) // Keep only the last 10 messages
      .forEach((key) => {
        localStorage.removeItem(key);
      });
  }
};
const setupTabSync = (set: (state: Partial<IFormStore>) => void) => {
  if (!ENABLE_TAB_SYNC) {
    return;
  }

  if (syncChannel) {
    syncChannel.onmessage = (message: MessageEvent<ISyncMessage>) => {
      handleSyncMessage(message, set);
    };
    return;
  }

  // Fallback: Poll localStorage for changes
  let lastChecked = Date.now();
  const pollInterval = setInterval(() => {
    const currentTime = Date.now();
    Object.entries(localStorage)
      .filter(([key, value]) => {
        const timestamp = parseInt(
          key.replace(`${SYNC_CHANNEL_NAME}-`, ''),
          10,
        );
        return Boolean(
          key.startsWith(SYNC_CHANNEL_NAME) && timestamp > lastChecked && value,
        );
      })
      .forEach(([, value]) => {
        if (typeof value !== 'string') {
          return;
        }
        try {
          const parsed: unknown = JSON.parse(value);
          if (isSyncMessage(parsed)) {
            const event = new MessageEvent<ISyncMessage>('message', {
              data: parsed,
            });
            handleSyncMessage(event, set);
          }
        } catch (error) {
          console.error('Error parsing sync message:', error);
        }
      });
    lastChecked = currentTime;
  }, 1000);

  // Cleanup on unmount
  window.addEventListener('unload', () => {
    clearInterval(pollInterval);
  });
};
const syncChannel = createSyncChannel();


export const frameworks = {
  LARAVEL: 'Laravel',
  NEXTJS: 'Next.js',
  // SPRING_BOOT: 'Spring Boot',
} as const;

export interface IFormData {
  schemaInput: IJSONSchema;
  backendUrl: string;
  backendDir: string;
  frontendDir: string;
  dbConnection: string;
  framework: (typeof frameworks)[keyof typeof frameworks] | '';
  includeInsertData: boolean;
  insertOption: string;
  includeTypeGuards: boolean;
  outputOnSingleFile: boolean;
}

interface IFormStore {
  formData: IFormData;
  schemaInfo: ISchemaInfo[];
  dbType: DBTypes | undefined;
  quote: string;
  creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES];
  setSchemaInfo: (schemaInfo: ISchemaInfo[]) => void;
  setCreationMode: (
    creationMode: (typeof CREATION_MODES)[keyof typeof CREATION_MODES],
  ) => void;
  setFormData: (data: Partial<IFormData>) => void;
  setOneToOne: () => void;
  setOneToMany: () => void;
  setManyToMany: () => void;
  setDBType: (dbType: DBTypes) => void;
}

const initialFormData: IFormData = {
  schemaInput: usersPostOneToOneSchema,
  backendUrl: 'http://localhost:8000/api',
  backendDir: 'C:/Users/Jude/Desktop/laravel',
  // backendDir: 'C:/Users/Username/Desktop/app/backend',
  frontendDir: 'C:/Users/Jude/Desktop/laravel/frontend',
  // frontendDir: 'C:/Users/Username/Desktop/app/frontend',
  dbConnection: 'postgresql://root:123@localhost:5432/laravel',
  framework: frameworks.LARAVEL,
  includeInsertData: true,
  insertOption: 'SQLInsertQueries',
  includeTypeGuards: true,
  outputOnSingleFile: false,
};

function determineSQLDatabaseType(dbConnection: string): DBTypes {
  const dbType = extractDBConnectionInfo(dbConnection).dbType;
  return dbType;
}

const persistConfig: PersistOptions<IFormStore, unknown> = {
  name: 'formData',
  storage: createJSONStorage(() => localStorage),
  partialize: (state): Pick<IFormStore, 'formData' | 'schemaInfo'> => ({
    formData: state.formData,
    schemaInfo: state.schemaInfo,
  }),
};

export const useFormStore = create<IFormStore>()(
  persist((set, get) => {
    setupTabSync(set);

    const initialDbType = determineSQLDatabaseType(
      initialFormData.dbConnection,
    );
    const initialQuote = SQLQueries.quote[initialDbType];

    const subscribeToChanges = () => {
      const { setTransformations } = useTransformationsStore.getState();
      const { schemaInfo } = get();
      setTransformations(schemaInfo);
    };

    return {
      formData: initialFormData,
      schemaInfo: oneToOne,
      dbType: initialDbType,
      quote: initialQuote,
      creationMode: CREATION_MODES.JSON_SCHEMA,
      setSchemaInfo: (schemaInfo) => {
        set({ schemaInfo });
        broadcastStateChange({ schemaInfo });
        subscribeToChanges();
      },
      setCreationMode: (creationMode) => {
        set({ creationMode });
      },
      setFormData: (data) => {
        set((state) => {
          const newDbConnection =
            data.dbConnection ?? state.formData.dbConnection;
          const newDbType = determineSQLDatabaseType(newDbConnection);
          const updates = {
            formData: { ...state.formData, ...data },
            dbType: newDbType,
            quote: SQLQueries.quote[newDbType],
          };
          broadcastStateChange(updates);
          return updates;
        });

        const { schemaInput } = get().formData;
        const oldSchemaInfo = get().schemaInfo;
        const newSchemaInfo = identifySchema(schemaInput);

        // Prevent unnecessary transformations when schemaInfo is unchanged
        if (JSON.stringify(oldSchemaInfo) !== JSON.stringify(newSchemaInfo)) {
          get().setSchemaInfo(newSchemaInfo);
        }
      },
      setOneToOne: () => {
        set((state) => {
          const updates = {
            formData: {
              ...state.formData,
              schemaInput: usersPostOneToOneSchema,
            },
          };
          broadcastStateChange(updates);
          return updates;
        });
        get().setSchemaInfo(oneToOne);
      },
      setOneToMany: () => {
        set((state) => {
          const updates = {
            formData: {
              ...state.formData,
              schemaInput: usersPostsOneToManySchema,
            },
          };
          broadcastStateChange(updates);
          return updates;
        });
        get().setSchemaInfo(oneToMany);
      },
      setManyToMany: () => {
        set((state) => {
          const updates = {
            formData: {
              ...state.formData,
              schemaInput: POSSchema,
            },
          };
          broadcastStateChange(updates);
          return updates;
        });
        get().setSchemaInfo(manyToMany);
      },
      setDBType: (dbType) => {
        set((state) => {
          let connectionString = state.formData.dbConnection;

          switch (dbType) {
            case 'postgresql':
              connectionString = connectionString
                .replace(/^\w+:\/\//, 'postgresql://')
                .replace(/:\d+\//, ':5432/');
              break;
            case 'mysql':
              connectionString = connectionString
                .replace(/^\w+:\/\//, 'mysql://')
                .replace(/:\d+\//, ':3306/');
              break;
            default:
              throw new Error(`Unsupported database type: ${String(dbType)}`);
          }

          const newDbType = determineSQLDatabaseType(connectionString);
          const updates = {
            formData: {
              ...state.formData,
              dbConnection: connectionString,
            },
            dbType: newDbType,
            quote: SQLQueries.quote[newDbType],
          };
          broadcastStateChange(updates);
          return updates;
        });
        subscribeToChanges();
      },
    };
  }, persistConfig),
);
