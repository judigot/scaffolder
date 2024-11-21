import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const CustomModal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children?: React.ReactNode;
}) => {
  const modalContainer = document.createElement('div');

  useEffect(() => {
    document.body.appendChild(modalContainer);

    return () => {
      document.body.removeChild(modalContainer);
    };
  }, [modalContainer]);

  useEffect(() => {
    const handleKeyDown = (e: { key: string }) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
      onKeyDown={() => {
        //
      }}
      role="button"
      tabIndex={0}
      aria-label="Close modal"
    >
      <div
        className="bg-gray-900 rounded shadow-md p-4 relative"
        style={{
          minWidth: '300px',
          minHeight: '150px', // Minimum dimensions
        }}
        onClick={(e) => {
          e.stopPropagation();
        }} // Prevent background click
        onKeyDown={() => {
          //
        }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      >
        {title && (
          <h2 className="text-xl font-bold text-indigo-400">{title}</h2>
        )}
        <div>
          {children !== undefined ? (
            children
          ) : (
            <p className="text-gray-500 text-center">No content provided.</p>
          )}
        </div>
        <button
          className="absolute top-2 right-2 text-gray-300 hover:text-indigo-400"
          onClick={onClose}
        >
          ✖
        </button>
      </div>
    </div>,
    modalContainer,
  );
};

export default CustomModal;
