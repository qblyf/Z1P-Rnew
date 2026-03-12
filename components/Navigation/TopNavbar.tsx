'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { Breadcrumb } from './Breadcrumb';

interface TopNavbarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function TopNavbar({ collapsed, onToggleCollapse }: TopNavbarProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4">
        {/* Left Section - Collapse Button and Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-gray-600" />
          </button>
          <Breadcrumb />
        </div>

        {/* Right Section - User Profile */}
        <div className="flex items-center">
          <UserProfile />
        </div>
      </div>
    </header>
  );
}