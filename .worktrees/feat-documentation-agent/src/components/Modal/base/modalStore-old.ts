import { create } from 'zustand';

type ModalIDs = 'firstModal' | 'secondModal' | 'thirdModal';

interface IModal {
  id: ModalIDs;
  title: string;
  content: React.ReactNode;
}

interface IModalState {
  modals: IModal[];
  openModal: (id: ModalIDs, title: string, content: React.ReactNode) => void;
  closeModal: (id: ModalIDs) => void;
}

export const useModalStore = create<IModalState>((set) => ({
  modals: [],
  openModal: (id, title, content) => {
    set((state) => {
      return {
        modals: [...state.modals, { id, title, content }],
      };
    });
  },
  closeModal: (id: ModalIDs) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
}));
