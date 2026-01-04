'use client';

import { Col, Row, Tabs, TabsProps } from 'antd';
import { useEffect, useState } from 'react';

interface ResponsiveProductLayoutProps {
  spuCateContent: React.ReactNode;
  spuContent: React.ReactNode;
  skuContent: React.ReactNode;
  isEditing?: boolean;
  editContent?: React.ReactNode;
}

/**
 * 响应式商品管理布局组件
 * 
 * 支持三种屏幕尺寸:
 * - 手机 (<768px): 使用 Tab 切换
 * - 平板 (768px-1024px): 使用 Tab 切换
 * - 桌面 (≥1024px): 三栏布局
 */
export function ResponsiveProductLayout({
  spuCateContent,
  spuContent,
  skuContent,
  isEditing = false,
  editContent,
}: ResponsiveProductLayoutProps) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [activeTab, setActiveTab] = useState<string>('spucate');

  // 监听屏幕尺寸变化
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 手机和平板: 使用 Tab 切换
  if (screenSize !== 'desktop') {
    const tabItems: TabsProps['items'] = [
      {
        key: 'spucate',
        label: 'SPU 分类',
        children: (
          <div className="p-4 bg-white rounded-lg">
            {spuCateContent}
          </div>
        ),
      },
      {
        key: 'spu',
        label: 'SPU',
        children: (
          <div className="p-4 bg-white rounded-lg">
            {spuContent}
          </div>
        ),
      },
      {
        key: 'sku',
        label: 'SKU',
        children: (
          <div className="p-4 bg-white rounded-lg">
            {skuContent}
          </div>
        ),
      },
    ];

    return (
      <div className="w-full">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          className="responsive-tabs"
        />
      </div>
    );
  }

  // 桌面: 三栏布局
  const colHeight = '100vh';
  
  return (
    <div style={{ height: colHeight, overflow: 'auto' }}>
      <Row gutter={[16, 16]} className="w-full h-full">
        <Col 
          span={8} 
          className="bg-white rounded-lg p-4 border border-slate-200 product-col"
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            scrollbarColor: '#999 #f1f1f1'
          }}
        >
          <style jsx>{`
            .product-col::-webkit-scrollbar {
              width: 8px;
            }
            .product-col::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 4px;
            }
            .product-col::-webkit-scrollbar-thumb {
              background: #999;
              border-radius: 4px;
            }
            .product-col::-webkit-scrollbar-thumb:hover {
              background: #666;
            }
          `}</style>
          {spuCateContent}
        </Col>
        <Col 
          span={8} 
          className="bg-white rounded-lg p-4 border border-slate-200 product-col"
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto',
            scrollbarWidth: 'auto',
            scrollbarColor: '#999 #f1f1f1'
          }}
        >
          {spuContent}
        </Col>
        <Col 
          flex="1" 
          className="bg-white rounded-lg p-4 border border-slate-200"
          style={{ 
            display: 'flex', 
            flexDirection: 'column',
            height: '100%',
            overflowY: 'auto'
          }}
        >
          {skuContent}
        </Col>
      </Row>
    </div>
  );
}
