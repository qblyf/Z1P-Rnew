import {
  ShoppingCart,
  Package,
  Database,
  Download,
  FileText,
  Clock,
  LogOut,
  Settings,
  LucideIcon,
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Package,
  Database,
  Download,
  FileText,
  Clock,
  LogOut,
  Settings,
};

export function getIcon(iconName?: string, size: number = 20) {
  if (!iconName || !iconMap[iconName]) {
    return null;
  }
  const Icon = iconMap[iconName];
  return <Icon size={size} />;
}
