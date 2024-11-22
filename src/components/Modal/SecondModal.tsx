import { useModalStore } from './base/modalStore';
import ThirdModal from './ThirdModal';

function SecondModal() {
  const { openModal } = useModalStore();

  const openThirdModal = () => {
    openModal('thirdModal', 'Third Modal', <ThirdModal />);
  };

  return (
    <div>
      <p>This is the second modal.</p>
      <button
        onClick={openThirdModal}
        className="px-4 py-2 bg-green-600 text-white rounded cursor-pointer"
      >
        Open Third Modal
      </button>
    </div>
  );
}

export default SecondModal;
