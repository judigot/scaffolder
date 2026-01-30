import { create } from 'zustand';

interface IStore {
  isSQLSchemaModalOpen: boolean;
  setIsSQLSchemaModalOpen: (isOpen: boolean) => void;

  isTableNameModalOpen: boolean;
  setIsTableNameModalOpen: (isOpen: boolean) => void;

  SQLSchemaEditable: string;
  setSQLSchemaEditable: (query: string) => void;
}

export const useModalStore = create<IStore>((set) => ({
  isSQLSchemaModalOpen: false,
  setIsSQLSchemaModalOpen: (isOpen) => {
    set({ isSQLSchemaModalOpen: isOpen });
  },
  isTableNameModalOpen: false,
  setIsTableNameModalOpen: (isOpen) => {
    set({ isSQLSchemaModalOpen: isOpen });
  },
  SQLSchemaEditable: '',
  setSQLSchemaEditable: (SQLSchemaEditable) => {
    set({ SQLSchemaEditable });
  },
}));
