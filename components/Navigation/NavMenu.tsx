'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MenuItem } from '../../constant/navigation';
import { useNavigation } from '../../datahooks/navigation';
import { getIcon } from '../../utils/getIcon';

interface NavMenuProps {
  item: MenuItem;
  isMobile?: boolean;
}

export function NavMenu({ item, isMobile = false }: NavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { currentMenu, parentMenu } = useNavigation();

  const isActive =
    currentMenu?.id === item.id ||
    parentMenu?.id === item.id ||
    item.children?.some((child) => child.id === currentMenu?.id);

  const hasChildren = item.children && item.children.length > 0;

  if (isMobile) {
    return (
      <div className="px-2">
        {hasChildren ? (
          <div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2">
                {getIcon(item.icon)}
                <span className="font-medium">{item.label}</span>
              </div>
              <ChevronDown
                size={16}
                className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="mt-1 ml-4 space-y-1 border-l-2 border-slate-200 pl-2">
                {item.children!.map((child) => (
                  child.href?.startsWith('http') ? (
                    <a key={child.id} href={child.href} target="_blank" rel="noopener noreferrer">
                      <div
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentMenu?.id === child.id
                            ? 'bg-emerald-50 text-emerald-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {child.label}
                      </div>
                    </a>
                  ) : (
                    <Link key={child.id} href={child.href || '#'}>
                      <div
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentMenu?.id === child.id
                            ? 'bg-emerald-50 text-emerald-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {child.label}
                      </div>
                    </Link>
                  )
                ))}
              </div>
            )}
          </div>
        ) : (
          item.href?.startsWith('http') ? (
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </a>
          ) : (
            <Link href={item.href || '#'}>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600 font-medium'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          )
        )}
      </div>
    );
  }

  // Desktop Menu
  return (
    <div className="relative group">
      {hasChildren ? (
        <button
          className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
            isActive
              ? 'text-emerald-600 bg-emerald-50'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          {getIcon(item.icon)}
          <span className="font-medium text-sm">{item.label}</span>
          <ChevronDown size={16} className="group-hover:rotate-180 transition-transform" />
        </button>
      ) : (
        item.href?.startsWith('http') ? (
          <a href={item.href} target="_blank" rel="noopener noreferrer">
            <div
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </a>
        ) : (
          <Link href={item.href || '#'}>
            <div
              className={`flex items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </Link>
        )
      )}

      {/* Dropdown Menu */}
      {hasChildren && (
        <div className="absolute left-0 top-full w-48 bg-white rounded-lg shadow-lg border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-2 z-50">
          {item.children!.map((child) => (
            child.href?.startsWith('http') ? (
              <a key={child.id} href={child.href} target="_blank" rel="noopener noreferrer">
                <div
                  className={`px-4 py-2 transition-colors ${
                    currentMenu?.id === child.id
                      ? 'bg-emerald-50 text-emerald-600 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {child.label}
                </div>
              </a>
            ) : (
              <Link key={child.id} href={child.href || '#'}>
                <div
                  className={`px-4 py-2 transition-colors ${
                    currentMenu?.id === child.id
                      ? 'bg-emerald-50 text-emerald-600 font-medium'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {child.label}
                </div>
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  );
}
