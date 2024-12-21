import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import CustomModal from '@/components/Modal/base/CustomModal.tsx';

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
