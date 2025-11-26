import { jsx as _jsx, Fragment as _Fragment } from 'react/jsx-runtime';
import { useModalStore } from '../../../components/Modal/base/modalStore';
import CustomModal from '../../../components/Modal/base/CustomModal';
function ModalProvider() {
  const { modals, closeModal } = useModalStore();
  return _jsx(_Fragment, {
    children: modals.map((modal) =>
      _jsx(
        CustomModal,
        {
          isOpen: true,
          title: modal.title,
          onClose: () => {
            closeModal(modal.id);
          },
          children: modal.content,
        },
        modal.id,
      ),
    ),
  });
}
export default ModalProvider;
