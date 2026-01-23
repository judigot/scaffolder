import { useModalStore } from './base/modalStore.tsx';

import SecondModal from '@/components/Modal/SecondModal.tsx';

function FirstModal({ data }: { data: { message: string } }) {
  const { openModal } = useModalStore();

  const openSecondModal = () => {
    openModal('secondModal', 'Second Modal', <SecondModal />);
  };

  return (
    <div>
      <p>This is the first modal.</p>
      <br />
      <p>Data passed into the modal:</p>
      <code>{JSON.stringify(data, null, 4)}</code>
      <br />
      <br />
      <button
        type="button"
        onClick={openSecondModal}
        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
      >
        Open Second Modal
      </button>
    </div>
  );
}

export default FirstModal;
