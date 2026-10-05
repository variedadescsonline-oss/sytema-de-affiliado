import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'warning' | 'primary';
  disabled?: boolean;
}

interface ActionDotsMenuProps {
  items: ActionMenuItem[];
  title?: string;
  align?: 'right' | 'left';
}

export const ActionDotsMenu: React.FC<ActionDotsMenuProps> = ({
  items,
  title = 'Más opciones',
  align = 'right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title={title}
        aria-label={title}
        className="p-1.5 min-w-[36px] min-h-[36px] rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:bg-slate-200"
      >
        <MoreVertical className="w-4 h-4 text-slate-600" />
      </button>

      {isOpen && (
        <div
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-xs`}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                item.onClick();
              }}
              className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer ${
                item.tone === 'danger'
                  ? 'text-red-700 hover:bg-red-50'
                  : item.tone === 'warning'
                  ? 'text-amber-700 hover:bg-amber-50'
                  : item.tone === 'primary'
                  ? 'text-blue-700 font-semibold'
                  : 'text-slate-700'
              }`}
            >
              {item.icon && <span className="w-4 h-4 shrink-0 flex items-center">{item.icon}</span>}
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
