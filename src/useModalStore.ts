import { create } from 'zustand';

interface IStore {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  SQLSchemaEditable: string;
  setSQLSchemaEditable: (query: string) => void;
}

export const useModalStore = create<IStore>((set) => ({
  isModalOpen: false,
  setIsModalOpen: (isOpen) => {
    set({ isModalOpen: isOpen });
  },
  SQLSchemaEditable: '',
  setSQLSchemaEditable: (SQLSchemaEditable) => {
    set({ SQLSchemaEditable });
  },
}));
