import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ICustomModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  useStaticPortal?: boolean;
}

function CustomModal({
  isOpen,
  title,
  onClose,
  children,
  useStaticPortal = false,
}: ICustomModalProps) {
  const modal = useRef<HTMLDivElement>(null);
  const modalRoot = useStaticPortal
    ? document.getElementById('static-modal-root') // For static portals
    : document.createElement('div');

  useEffect(() => {
    if (!modalRoot) {
      return;
    }

    if (!useStaticPortal) {
      document.body.appendChild(modalRoot);
    }

    modal.current?.focus();

    return () => {
      if (!useStaticPortal) {
        document.body.removeChild(modalRoot);
      }
    };
  }, [modalRoot, useStaticPortal, onClose]);

  if (!modalRoot) {
    return null;
  }
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={modal}
      role="button"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose(); // Close modal on Escape key press
        }
      }}
      tabIndex={-1} // -1 means it cannot be tabbed
      className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        role="button"
        onKeyDown={() => {
          return;
        }}
        tabIndex={-1} // -1 means it cannot be tabbed
        className="relative bg-white dark:bg-gray-800 shadow-lg rounded-lg w-[90%] sm:w-[500px] p-6 animate-scale-up cursor-auto"
        onClick={(e) => {
          e.stopPropagation(); // Prevent clicking from triggering background onClick
        }}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none transition-colors duration-200 select-none"
          >
            ❌
          </button>
        </div>
        <div className="mt-4 text-gray-600 dark:text-gray-300">{children}</div>
      </div>
    </div>,
    modalRoot,
  );
}

export default CustomModal;
