import { create } from 'zustand';
export const useModalStore = create((set) => ({
  modals: [],
  openModal: (id, title, content) => {
    set((state) => {
      return {
        modals: [...state.modals, { id, title, content }],
      };
    });
  },
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
}));
