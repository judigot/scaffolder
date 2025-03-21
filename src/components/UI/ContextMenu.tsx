import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Interface for a context menu item
 */
export interface IContextMenuItem {
  /** Unique identifier for the menu item */
  id: string;
  /** Icon component to display (optional) */
  icon?: React.ReactNode;
  /** Label text for the menu item */
  label: string;
  /** Click handler for the menu item */
  onClick: () => void;
  /** Whether the item is disabled (optional) */
  disabled?: boolean;
  /** Additional CSS class names for styling (optional) */
  className?: string;
}

/**
 * Props for the ContextMenu component
 */
export interface IContextMenuProps {
  /** X position for the menu */
  x: number;
  /** Y position for the menu */
  y: number;
  /** Array of menu items to display */
  menuItems: IContextMenuItem[];
  /** Callback when the menu is closed */
  onClose: () => void;
  /** Width of the menu (default: 14rem) */
  width?: string;
  /** Whether the menu should append to document.body (default: false) */
  appendToBody?: boolean;
  /** Additional CSS class names for styling (optional) */
  className?: string;
}

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
}: IContextMenuProps): React.ReactElement => {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Handle smart positioning to keep menu within viewport
  const [position, setPosition] = useState({ left: String(x) + 'px', top: String(y) + 'px' });
  
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
        top: String(Math.max(0, top)) + 'px' 
      });
    }
  }, [x, y]);
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
    const handleKeyDown = (event: KeyboardEvent) => {
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
    const menu = (
      <div
        ref={menuRef}
        className={`fixed z-50 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 text-white ${className}`}
        style={{
          left: position.left,
          top: position.top,
          width,
        }}
        role="menu"
        aria-orientation="vertical"
      >
        {menuItems.map((item) => {
          const isDisabled = Boolean(item.disabled);
          return (
            <button
              key={item.id}
              className={`flex items-center px-3 py-2 hover:bg-gray-700 cursor-pointer w-full text-left ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : ''
              } ${item.className ?? ''}`}
              onClick={() => {
                if (!isDisabled) {
                  onClose();
                  item.onClick();
                }
              }}
              disabled={isDisabled}
              role="menuitem"
            >
              {item.icon !== undefined && <div className="mr-2 text-yellow-500">{item.icon}</div>}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    );

    if (appendToBody) {
      return typeof document !== 'undefined' ? ReactDOM.createPortal(menu, document.body) : menu;
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
export const useContextMenu = () => {
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
  }, []);
  
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);
  
  return {
    contextMenuPosition,
    handleContextMenu,
    handleCloseContextMenu,
    isContextMenuOpen: contextMenuPosition !== null
  };
};

export default ContextMenu; 