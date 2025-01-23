import EditValueModal from '@/components/EditNameForm.tsx';
import { create } from 'zustand';

type ModalIDs = string;

interface IModal {
  id: ModalIDs;
  title: string;
  content: React.ReactNode;
}

interface IModalState {
  modals: IModal[];
  openModal: (id: ModalIDs, title: string, content: React.ReactNode) => void;
  openRandomModal: (props: { title: string; content: React.ReactNode }) => void;
  promptModal: (props: {
    title: string;
    description?: string;
    trueText: string;
    falseText: string;
  }) => Promise<boolean>;
  newValue: (props: { title: string }) => Promise<string>;
  editValue: (props: { title: string; oldValue: string }) => Promise<string>;
  closeModal: (id: ModalIDs) => void;
}

export const useModalStore = create<IModalState>((set) => ({
  modals: [],
  openModal: (id, title, content) => {
    set((state) => ({
      modals: [...state.modals, { id, title, content }],
    }));
  },
  openRandomModal: ({
    title,
    content,
  }: {
    title: string;
    content: React.ReactNode;
  }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    set((state) => ({
      modals: [
        ...state.modals,
        {
          id,
          title,
          content,
        },
      ],
    }));
  },
  promptModal: ({ title, description, trueText, falseText }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    // Return a promise to resolve user interaction
    return new Promise<boolean>((resolve) => {
      set((state) => ({
        modals: [
          ...state.modals,
          {
            id,
            title,
            content: (
              <div>
                {description != null && <p>{description}</p>}
                <div className="flex justify-end">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      resolve(true);
                      set((state) => ({
                        modals: state.modals.filter((modal) => modal.id !== id),
                      }));
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        resolve(false);
                        set((state) => ({
                          modals: state.modals.filter(
                            (modal) => modal.id !== id,
                          ),
                        }));
                      }}
                      className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      {falseText}
                    </button>
                    &nbsp;
                    <button
                      type="submit"
                      className="mt-4 px-4 py-2 bg-blue-500 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      {trueText}
                    </button>
                  </form>
                </div>
              </div>
            ),
          },
        ],
      }));
    });
  },
  editValue: ({ title, oldValue }: { title: string; oldValue: string }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    return new Promise<string>((resolve) => {
      set((state) => ({
        modals: [
          ...state.modals,
          {
            id,
            title,
            content: (
              <EditValueModal id={id} oldValue={oldValue} resolve={resolve} />
            ),
          },
        ],
      }));
    });
  },
  newValue: ({ title }: { title: string }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    return new Promise<string>((resolve) => {
      set((state) => ({
        modals: [
          ...state.modals,
          {
            id,
            title,
            content: (
              <EditValueModal id={id} oldValue="" resolve={resolve} />
            ),
          },
        ],
      }));
    });
  },
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter((modal) => modal.id !== id),
    }));
  },
}));
