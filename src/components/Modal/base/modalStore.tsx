import InputValueModal from '@/components/EditNameForm.tsx';
import { create } from 'zustand';

type ModalIDs = string;

interface IModal {
  id: ModalIDs;
  title: string;
  content: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
}

interface IModalState {
  modals: IModal[];
  openModal: (id: ModalIDs, title: string, content: React.ReactNode) => void;
  openRandomModal: (props: {
    title: string;
    content: React.ReactNode;
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
  }) => void;
  promptModal: (props: {
    title: string;
    description?: string;
    confirmButtonText: string;
    denyButtonText: string;
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
    size = 'medium',
  }: {
    title: string;
    content: React.ReactNode;
    size?: 'small' | 'medium' | 'large' | 'fullscreen';
  }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    set((state) => ({
      modals: [
        ...state.modals,
        {
          id,
          title,
          content,
          size,
        },
      ],
    }));
  },
  promptModal: ({ title, description, confirmButtonText, denyButtonText }) => {
    const id: string = Math.random().toString(36).substring(2, 10);

    // Return a promise to resolve user interaction
    return new Promise<boolean>((resolve) => {
      const handleKeyPress = (e: KeyboardEvent): void => {
        if (e.key === 'Enter') {
          e.preventDefault();
          resolve(true);
          set((state) => ({
            modals: state.modals.filter((modal) => modal.id !== id),
          }));
          window.removeEventListener('keydown', handleKeyPress);
        }
      };

      window.addEventListener('keydown', handleKeyPress);

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
                      window.removeEventListener('keydown', handleKeyPress);
                      set((state) => ({
                        modals: state.modals.filter((modal) => modal.id !== id),
                      }));
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        resolve(false);
                        window.removeEventListener('keydown', handleKeyPress);
                        set((state) => ({
                          modals: state.modals.filter(
                            (modal) => modal.id !== id,
                          ),
                        }));
                      }}
                      className="mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      {denyButtonText}
                    </button>
                    &nbsp;
                    <button
                      type="submit"
                      className="mt-4 px-4 py-2 bg-blue-500 text-gray-800 rounded-lg hover:bg-gray-400"
                    >
                      {confirmButtonText}
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
              <InputValueModal id={id} oldValue={oldValue} resolve={resolve} />
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
            content: <InputValueModal id={id} oldValue="" resolve={resolve} />,
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
