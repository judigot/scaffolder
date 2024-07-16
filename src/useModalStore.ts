import { create } from 'zustand';

interface IStore {
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  SQLShemaEditable: string;
  setSQLShemaEditable: (query: string) => void;
}

export const useModalStore = create<IStore>((set) => ({
  isModalOpen: false,
  setIsModalOpen: (isOpen) => {
    set({ isModalOpen: isOpen });
  },
  SQLShemaEditable: '',
  setSQLShemaEditable: (SQLShemaEditable) => {
    set({ SQLShemaEditable });
  },
}));
