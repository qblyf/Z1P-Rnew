import {
  ShoppingCart,
  Package,
  Database,
  Download,
  FileText,
  Clock,
  LogOut,
  Settings,
} from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: string; // 改为字符串，表示图标类型
  children?: MenuItem[];
  requiredPermission?: string;
}

export const MENU_CONFIG: MenuItem[] = [
  {
    id: 'product',
    label: '商品管理',
    icon: 'ShoppingCart',
    children: [
      {
        id: 'product-manage',
        label: '商品管理',
        href: '/product-manage',
      },
      {
        id: 'spu-list',
        label: 'SPU 列表',
        href: '/spu-list',
      },
      {
        id: 'sku-list',
        label: 'SKU 列表',
        href: '/sku-list',
      },
      {
        id: 'spu-name-check',
        label: 'SPU 命名规范检查',
        href: '/spu-name-check',
      },
    ],
  },
  {
    id: 'data-match',
    label: '商品智能匹配',
    icon: 'Search',
    children: [
      {
        id: 'smart-match',
        label: '在线匹配',
        href: '/smart-match',
      },
      {
        id: 'table-match',
        label: '表格匹配',
        href: '/table-match',
      },
    ],
  },
  {
    id: 'data',
    label: '数据管理',
    icon: 'Database',
    children: [
      {
        id: 'basedata-manage',
        label: '基础数据管理',
        href: '/basedata-manage',
      },
      {
        id: 'sku-spec-sorting',
        label: 'SKU 规格排序设置',
        href: '/sku-spec-sorting',
      },
      {
        id: 'data-export',
        label: '数据导出',
        href: '/data-export',
      },
      {
        id: 'data-sync',
        label: '数据同步',
        href: 'https://p.z1.pub/sync',
      },
    ],
  },
  {
    id: 'system',
    label: '系统管理',
    icon: 'Settings',
    children: [
      {
        id: 'log',
        label: '更新日志',
        href: '/log',
      },
      {
        id: 'changes',
        label: '操作审计',
        href: '/changes',
      },
      {
        id: 'system-maintenance-time',
        label: '账套维护时间',
        href: '/system-maintenance-time',
      },
    ],
  },
];
