import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
function CustomModal({
  isOpen,
  title,
  onClose,
  children,
  useStaticPortal = false,
  initialFocusRef,
}) {
  const modal = useRef(null);
  const modalRoot = useStaticPortal
    ? document.getElementById('static-modal-root')
    : document.createElement('div');
  // Store the element that had focus before modal opened
  const previousActiveElement = useRef(null);
  // Focus trap refs
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);
  // Store original styles
  const originalStyles = useRef({
    paddingRight: '',
    overflow: '',
  });
  const handleTabKey = useCallback((e) => {
    if (!modal.current) {
      return;
    }
    const focusableElements = modal.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    // If pressing Shift + Tab and first element is active, move to last focusable element
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    }
    // If pressing Tab and last element is active, move to first focusable element
    else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, []);
  useEffect(() => {
    if (!modalRoot || !isOpen) {
      return;
    }
    // Store current active element and ensure it's an HTMLElement
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      previousActiveElement.current = activeElement;
    }
    if (!useStaticPortal) {
      document.body.appendChild(modalRoot);
    }
    // Store original styles
    const computedStyle = window.getComputedStyle(document.body);
    originalStyles.current = {
      paddingRight: computedStyle.paddingRight,
      overflow: computedStyle.overflow,
    };
    // Check if scrollbar exists
    const hasScrollbar =
      window.innerWidth > document.documentElement.clientWidth;
    // Only add padding if scrollbar exists
    if (hasScrollbar) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${String(scrollbarWidth)}px`;
    }
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
    // Set initial focus
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus();
    } else {
      firstFocusableRef.current?.focus();
    }
    // Handle escape key and tab trap
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key === 'Tab') {
        handleTabKey(event);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      if (!useStaticPortal) {
        document.body.removeChild(modalRoot);
      }
      // Restore all original styles
      document.body.style.overflow = originalStyles.current.overflow;
      document.body.style.paddingRight = originalStyles.current.paddingRight;
      document.body.classList.remove('modal-open');
      // Return focus to previous element
      if (
        previousActiveElement.current &&
        'focus' in previousActiveElement.current
      ) {
        previousActiveElement.current.focus();
      }
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    modalRoot,
    useStaticPortal,
    onClose,
    isOpen,
    handleTabKey,
    initialFocusRef,
  ]);
  if (!modalRoot || !isOpen) {
    return null;
  }
  return createPortal(
    _jsxs('div', {
      ref: modal,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'modal-title',
      className:
        'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[1000] transition-opacity duration-300 ease-in-out',
      children: [
        _jsx('button', {
          ref: firstFocusableRef,
          type: 'button',
          className: 'absolute inset-0 w-full h-full border-0 bg-transparent',
          onClick: onClose,
          'aria-label': 'Close modal overlay',
        }),
        _jsxs('div', {
          role: 'document',
          className:
            'relative bg-white dark:bg-gray-800 shadow-lg rounded-lg w-[90%] sm:w-[500px] p-6 animate-scale-up cursor-auto',
          children: [
            _jsxs('div', {
              className: 'flex justify-between items-center',
              children: [
                _jsx('h2', {
                  id: 'modal-title',
                  className:
                    'text-2xl font-semibold text-gray-800 dark:text-gray-200',
                  children: title,
                }),
                _jsx('button', {
                  ref: lastFocusableRef,
                  onClick: onClose,
                  'aria-label': 'Close modal',
                  className:
                    'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 select-none rounded-lg p-1',
                  children: '\u274C',
                }),
              ],
            }),
            _jsx('div', {
              className: 'mt-4 text-gray-600 dark:text-gray-300',
              children: children,
            }),
          ],
        }),
      ],
    }),
    modalRoot,
  );
}
export default CustomModal;
