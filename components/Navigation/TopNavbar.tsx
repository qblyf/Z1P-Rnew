'use client';

import Link from 'next/link';
import { useNavigation } from '../../datahooks/navigation';
import { useMenuState } from '../../datahooks/menuState';
import { UserProfile } from './UserProfile';
import { getIcon } from '../../utils/getIcon';

export function TopNavbar() {
  const { menuConfig } = useNavigation();
  const { selectedParentMenuId, setSelectedParentMenuId } = useMenuState();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-16 px-4 flex items-center justify-between">
        {/* Logo and Title */}
        <Link href="/" className="flex items-center gap-3 flex-shrink-0">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)'
            }}
          >
            <span className="text-white font-bold text-sm">Z1</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Z1 数据管理平台
            </div>
          </div>
        </Link>

        {/* Primary Menu (一级菜单) */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {menuConfig.map((item) => {
            const isActive = selectedParentMenuId === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedParentMenuId(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {getIcon(item.icon, 18)}
                <span className="text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section - User Profile */}
        <div className="flex items-center">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}