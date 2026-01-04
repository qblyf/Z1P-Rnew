'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useNavigation } from '../../datahooks/navigation';
import { NavMenu } from './NavMenu';
import { UserProfile } from './UserProfile';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { menuConfig } = useNavigation();

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">Z1</span>
            </div>
            <span className="hidden sm:inline text-lg font-bold text-slate-800">
              Z1 平台
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-1">
            {menuConfig.map((item) => (
              <NavMenu key={item.id} item={item} />
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            <UserProfile />

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {isOpen ? (
                <X size={24} className="text-slate-600" />
              ) : (
                <Menu size={24} className="text-slate-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="lg:hidden pb-4 border-t border-slate-200">
            <div className="space-y-1 pt-4">
              {menuConfig.map((item) => (
                <NavMenu key={item.id} item={item} isMobile />
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
