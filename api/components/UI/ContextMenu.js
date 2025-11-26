import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
/**
 * A reusable context menu component for displaying custom right-click menus
 *
 * @example
 * ```tsx
 * // Basic usage
 * const [contextMenu, setContextMenu] = useState<{x: number, y: number} | null>(null);
 *
 * const handleContextMenu = (e: React.MouseEvent) => {
 *   e.preventDefault();
 *   setContextMenu({ x: e.clientX, y: e.clientY });
 * };
 *
 * const handleClose = () => setContextMenu(null);
 *
 * // In your JSX:
 * <div onContextMenu={handleContextMenu}>Right-click me</div>
 *
 * {contextMenu && (
 *   <ContextMenu
 *     x={contextMenu.x}
 *     y={contextMenu.y}
 *     menuItems={[
 *       { id: 'item1', icon: <EditIcon />, label: 'Edit', onClick: () => console.log('Edit clicked') },
 *       { id: 'item2', icon: <DeleteIcon />, label: 'Delete', onClick: () => console.log('Delete clicked') }
 *     ]}
 *     onClose={handleClose}
 *   />
 * )}
 * ```
 */
export const ContextMenu = ({
  x,
  y,
  menuItems,
  onClose,
  width = '14rem',
  appendToBody = false,
  className = '',
}) => {
  const menuRef = useRef(null);
  // Handle smart positioning to keep menu within viewport
  const [position, setPosition] = useState({
    left: String(x) + 'px',
    top: String(y) + 'px',
  });
  // Calculate position to ensure menu stays within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = x;
      let top = y;
      // Adjust horizontal position if needed
      if (x + rect.width > viewportWidth) {
        left = x - rect.width;
      }
      // Adjust vertical position if needed
      if (y + rect.height > viewportHeight) {
        top = y - rect.height;
      }
      setPosition({
        left: String(Math.max(0, left)) + 'px',
        top: String(Math.max(0, top)) + 'px',
      });
    }
  }, [x, y]);
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Type guard to ensure we're dealing with a Node
      const targetNode = event.target;
      if (!(targetNode instanceof Node)) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(targetNode)) {
        onClose();
      }
    };
    // Handle escape key
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);
  // Create portal for menu if appendToBody is true
  const renderMenu = () => {
    const menu = _jsx('div', {
      ref: menuRef,
      className: `fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 text-white ${className}`,
      style: {
        left: position.left,
        top: position.top,
        width,
      },
      role: 'menu',
      'aria-orientation': 'vertical',
      children: menuItems.map((item) => {
        const isDisabled = Boolean(item.disabled);
        return _jsxs(
          'button',
          {
            type: 'button',
            className: `flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer w-full text-left ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${item.className ?? ''}`,
            onClick: () => {
              if (!isDisabled) {
                onClose();
                item.onClick();
              }
            },
            disabled: isDisabled,
            role: 'menuitem',
            children: [
              item.icon !== undefined &&
                _jsx('div', {
                  className: 'mr-2 text-yellow-500',
                  children: item.icon,
                }),
              _jsx('span', { children: item.label }),
            ],
          },
          item.id,
        );
      }),
    });
    if (appendToBody) {
      return typeof document !== 'undefined'
        ? ReactDOM.createPortal(menu, document.body)
        : menu;
    }
    return menu;
  };
  return renderMenu();
};
/**
 * Hook for handling context menu state and events
 *
 * @returns Object containing context menu state and handlers
 *
 * @example
 * ```tsx
 * const { contextMenuPosition, handleContextMenu, handleCloseContextMenu, isContextMenuOpen } = useContextMenu();
 *
 * // In your JSX:
 * <div onContextMenu={handleContextMenu}>Right-click me</div>
 *
 * {isContextMenuOpen && (
 *   <ContextMenu
 *     x={contextMenuPosition.x}
 *     y={contextMenuPosition.y}
 *     menuItems={menuItems}
 *     onClose={handleCloseContextMenu}
 *   />
 * )}
 * ```
 */
// export const useContextMenu = () => {
//   const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
//   const handleContextMenu = useCallback((event: React.MouseEvent) => {
//     event.preventDefault();
//     event.stopPropagation();
//     setContextMenuPosition({ x: event.clientX, y: event.clientY });
//   }, []);
//   const handleCloseContextMenu = useCallback(() => {
//     setContextMenuPosition(null);
//   }, []);
//   return {
//     contextMenuPosition,
//     handleContextMenu,
//     handleCloseContextMenu,
//     isContextMenuOpen: contextMenuPosition !== null
//   };
// };
export default ContextMenu;
