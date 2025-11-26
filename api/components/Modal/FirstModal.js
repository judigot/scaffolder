import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useModalStore } from './base/modalStore';
import SecondModal from '../../components/Modal/SecondModal';
function FirstModal({ data }) {
  const { openModal } = useModalStore();
  const openSecondModal = () => {
    openModal('secondModal', 'Second Modal', _jsx(SecondModal, {}));
  };
  return _jsxs('div', {
    children: [
      _jsx('p', { children: 'This is the first modal.' }),
      _jsx('br', {}),
      _jsx('p', { children: 'Data passed into the modal:' }),
      _jsx('code', { children: JSON.stringify(data, null, 4) }),
      _jsx('br', {}),
      _jsx('br', {}),
      _jsx('button', {
        onClick: openSecondModal,
        className: 'px-4 py-2 bg-blue-600 text-white rounded',
        children: 'Open Second Modal',
      }),
    ],
  });
}
export default FirstModal;
