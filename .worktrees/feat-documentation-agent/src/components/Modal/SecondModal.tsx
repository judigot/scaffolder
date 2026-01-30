import { useModalStore } from '@/components/Modal/base/modalStore.tsx';
import ThirdModal from '@/components/Modal/ThirdModal.tsx';

function SecondModal() {
  const { openModal } = useModalStore();

  const openThirdModal = () => {
    openModal('thirdModal', 'Third Modal', <ThirdModal />);
  };

  return (
    <div>
      <p>This is the second modal.</p>
      <button
        type="button"
        onClick={openThirdModal}
        className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer"
      >
        Open Third Modal
      </button>
    </div>
  );
}

export default SecondModal;
