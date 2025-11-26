import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import InputValueModal from '../../../components/EditNameForm';
import { create } from 'zustand';
export const useModalStore = create((set) => ({
  modals: [],
  openModal: (id, title, content) => {
    set((state) => ({
      modals: [...state.modals, { id, title, content }],
    }));
  },
  openRandomModal: ({ title, content }) => {
    const id = Math.random().toString(36).substring(2, 10);
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
  promptModal: ({ title, description, confirmButtonText, denyButtonText }) => {
    const id = Math.random().toString(36).substring(2, 10);
    // Return a promise to resolve user interaction
    return new Promise((resolve) => {
      const handleKeyPress = (e) => {
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
            content: _jsxs('div', {
              children: [
                description != null && _jsx('p', { children: description }),
                _jsx('div', {
                  className: 'flex justify-end',
                  children: _jsxs('form', {
                    onSubmit: (e) => {
                      e.preventDefault();
                      resolve(true);
                      window.removeEventListener('keydown', handleKeyPress);
                      set((state) => ({
                        modals: state.modals.filter((modal) => modal.id !== id),
                      }));
                    },
                    children: [
                      _jsx('button', {
                        type: 'button',
                        onClick: () => {
                          resolve(false);
                          window.removeEventListener('keydown', handleKeyPress);
                          set((state) => ({
                            modals: state.modals.filter(
                              (modal) => modal.id !== id,
                            ),
                          }));
                        },
                        className:
                          'mt-4 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400',
                        children: denyButtonText,
                      }),
                      '\u00A0',
                      _jsx('button', {
                        type: 'submit',
                        className:
                          'mt-4 px-4 py-2 bg-blue-500 text-gray-800 rounded-lg hover:bg-gray-400',
                        children: confirmButtonText,
                      }),
                    ],
                  }),
                }),
              ],
            }),
          },
        ],
      }));
    });
  },
  editValue: ({ title, oldValue }) => {
    const id = Math.random().toString(36).substring(2, 10);
    return new Promise((resolve) => {
      set((state) => ({
        modals: [
          ...state.modals,
          {
            id,
            title,
            content: _jsx(InputValueModal, {
              id: id,
              oldValue: oldValue,
              resolve: resolve,
            }),
          },
        ],
      }));
    });
  },
  newValue: ({ title }) => {
    const id = Math.random().toString(36).substring(2, 10);
    return new Promise((resolve) => {
      set((state) => ({
        modals: [
          ...state.modals,
          {
            id,
            title,
            content: _jsx(InputValueModal, {
              id: id,
              oldValue: '',
              resolve: resolve,
            }),
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
