import { useModalStore } from './modalStore';
import CustomModal from './CustomModal';

function ModalProvider() {
  const { modals, closeModal } = useModalStore();

  return (
    <>
      {modals.map((modal) => (
        <CustomModal
          key={modal.id}
          isOpen={true}
          title={modal.title}
          onClose={() => {
            closeModal(modal.id);
          }}
        >
          {modal.content}
        </CustomModal>
      ))}
    </>
  );
}

export default ModalProvider;
