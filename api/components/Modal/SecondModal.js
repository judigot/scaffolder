import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useModalStore } from '../../components/Modal/base/modalStore';
import ThirdModal from '../../components/Modal/ThirdModal';
function SecondModal() {
  const { openModal } = useModalStore();
  const openThirdModal = () => {
    openModal('thirdModal', 'Third Modal', _jsx(ThirdModal, {}));
  };
  return _jsxs('div', {
    children: [
      _jsx('p', { children: 'This is the second modal.' }),
      _jsx('button', {
        onClick: openThirdModal,
        className: 'px-4 py-2 bg-green-600 text-white rounded cursor-pointer',
        children: 'Open Third Modal',
      }),
    ],
  });
}
export default SecondModal;
