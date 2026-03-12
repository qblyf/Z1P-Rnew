'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MenuItem } from '../../constant/navigation';
import { useNavigation } from '../../datahooks/navigation';
import { getIcon } from '../../utils/getIcon';

interface SidebarProps {
  collapsed?: boolean;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ 
  collapsed = false, 
  isMobile = false, 
  isOpen = false, 
  onClose 
}: SidebarProps) {
  const { menuConfig, currentMenu, parentMenu } = useNavigation();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const toggleExpanded = (menuId: string) => {
    const newExpanded = new Set(expandedMenus);
    if (newExpanded.has(menuId)) {
      newExpanded.delete(menuId);
    } else {
      newExpanded.add(menuId);
    }
    setExpandedMenus(newExpanded);
  };

  const isMenuActive = (item: MenuItem) => {
    return currentMenu?.id === item.id || 
           parentMenu?.id === item.id ||
           item.children?.some((child) => child.id === currentMenu?.id);
  };

  const isChildActive = (child: MenuItem) => {
    return currentMenu?.id === child.id;
  };

  const showText = !collapsed || isMobile;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? `fixed left-0 top-0 h-full z-50 transform transition-transform duration-300 ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:relative lg:translate-x-0`
          : 'relative'
        }
        bg-white border-r border-gray-200 transition-all duration-300 ${
          collapsed && !isMobile ? 'w-20' : 'w-64'
        }
      `}>
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="h-16 flex items-center px-4 border-b border-gray-200">
            <Link href="/" className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)'
                }}
              >
                <span className="text-white font-bold text-sm">Z1</span>
              </div>
              {showText && (
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-gray-900 truncate">
                    Z1 数据管理
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    企业级数据平台
                  </div>
                </div>
              )}
            </Link>
          </div>

          {/* Menu Section */}
          <div className="flex-1 overflow-y-auto py-4 sidebar-scroll">
            <nav className="px-2 space-y-1">
              {menuConfig.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isActive = isMenuActive(item);
                const isExpanded = expandedMenus.has(item.id) || isActive;

                return (
                  <div key={item.id}>
                    {hasChildren ? (
                      <div>
                        <button
                          onClick={() => toggleExpanded(item.id)}
                          className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                            isActive
                              ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                        >
                          <div className="flex-shrink-0 w-5 h-5 mr-3">
                            {getIcon(item.icon)}
                          </div>
                          {showText && (
                            <>
                              <span className="flex-1 text-left truncate">{item.label}</span>
                              <div className="ml-2">
                                {isExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </div>
                            </>
                          )}
                        </button>
                        
                        {showText && isExpanded && (
                          <div className="mt-1 ml-8 space-y-1">
                            {item.children!.map((child) => (
                              <div key={child.id}>
                                {child.href?.startsWith('http') ? (
                                  <a 
                                    href={child.href} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                      isChildActive(child)
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                  >
                                    {child.label}
                                  </a>
                                ) : (
                                  <Link 
                                    href={child.href || '#'}
                                    className={`block px-3 py-2 text-sm rounded-lg transition-colors ${
                                      isChildActive(child)
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                    onClick={isMobile ? onClose : undefined}
                                  >
                                    {child.label}
                                  </Link>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {item.href?.startsWith('http') ? (
                          <a 
                            href={item.href} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">
                              {getIcon(item.icon)}
                            </div>
                            {showText && <span className="truncate">{item.label}</span>}
                          </a>
                        ) : (
                          <Link 
                            href={item.href || '#'}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              isActive
                                ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600'
                                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                            onClick={isMobile ? onClose : undefined}
                          >
                            <div className="flex-shrink-0 w-5 h-5 mr-3">
                              {getIcon(item.icon)}
                            </div>
                            {showText && <span className="truncate">{item.label}</span>}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}