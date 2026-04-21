'use client';

import { useTabs } from '../../datahooks/tabs';
import { CloseOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { memo, useCallback, useMemo } from 'react';

export const TabBar = memo(function TabBar() {
  const { tabs, activeKey, setActiveTab, removeTab, clearOtherTabs, clearAllTabs } = useTabs();

  const handleContextMenu = useCallback((e: React.MouseEvent, tabKey: string) => {
    e.preventDefault();
  }, []);

  // 动态生成菜单项（依赖 tabs 状态）
  const getContextMenuItems = useCallback((tabKey: string): MenuProps['items'] => {
    const tab = tabs.find((t) => t.key === tabKey);
    const closableTabs = tabs.filter((t) => t.closable);

    return [
      {
        key: 'close',
        label: '关闭',
        disabled: !tab?.closable,
        onClick: ({ key }: { key: string }) => removeTab(key),
      },
      {
        key: 'closeOthers',
        label: '关闭其他',
        disabled: closableTabs.length <= 1,
        onClick: ({ key }: { key: string }) => clearOtherTabs(key),
      },
      {
        key: 'closeAll',
        label: '关闭所有',
        disabled: closableTabs.length === 0,
        onClick: () => clearAllTabs(),
      },
    ];
  }, [tabs, removeTab, clearOtherTabs, clearAllTabs]);

  const hasClosableTabs = useMemo(() => tabs.some((t) => t.closable), [tabs]);

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 flex items-center gap-1 overflow-x-auto overflow-y-hidden h-10 flex-shrink-0">
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        
        return (
          <Dropdown
            key={tab.key}
            menu={{ items: getContextMenuItems(tab.key) }}
            trigger={['contextMenu']}
          >
            <div
              className={`
                group flex items-center gap-2 px-3 py-1.5 rounded-t-lg cursor-pointer
                transition-colors whitespace-nowrap select-none
                ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }
              `}
              onClick={() => setActiveTab(tab.key)}
              onContextMenu={(e) => handleContextMenu(e, tab.key)}
            >
              <span className="text-sm">{tab.label}</span>
              {tab.closable && (
                <CloseOutlined
                  className={`
                    text-xs opacity-0 group-hover:opacity-100 transition-opacity
                    ${isActive ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.key);
                  }}
                />
              )}
            </div>
          </Dropdown>
        );
      })}
      
      {/* 关闭所有按钮 */}
      {hasClosableTabs && (
        <div
          className="ml-2 px-2 py-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          title="关闭所有标签页"
          onClick={clearAllTabs}
        >
          <CloseCircleOutlined className="text-sm" />
        </div>
      )}
    </div>
  );
});
