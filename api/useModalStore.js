import { create } from 'zustand';
export const useModalStore = create((set) => ({
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
