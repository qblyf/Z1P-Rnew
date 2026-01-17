'use client';

import { useCallback, useEffect, useState } from 'react';
import { getChangeList } from '@zsqk/z1-sdk/es/z1p/changes';
import { ChangeLog } from '@zsqk/z1-sdk/es/z1p/changes-types';
import { useTokenContext } from '../datahooks/auth';
import Table, { ColumnsType } from 'antd/lib/table';

export function ChangeTable(props: {
  /**
   * 要查看的相关数据, 不填则为查看全部数据
   */
  logFor?: ChangeLog['logFor'][];
  /**
   * 要显示的列, 不填则为全部显示
   */
  columnKeys?: string[];
}) {
  const { logFor, columnKeys } = props;
  const [data, setData] = useState<ChangeLog[]>();
  const { token } = useTokenContext();

  const getFn = useCallback(
    (token: string) =>
      getChangeList(
        { logFor, limit: 10, orderBy: { key: 'logID', sort: 'DESC' } },
        { auth: token }
      )
        .then(v => {
          setData(v);
        })
        .catch(err => {
          console.error('getChangeList', err);
        }),
    [logFor]
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    getFn(token);
  }, [token, getFn]);

  return (
    <ChangeTableWithoutData
      data={data}
      columnKeys={columnKeys}
    />
  );
}

function ChangeTableWithoutData(props: {
  data?: ChangeLog[];
  columnKeys?: string[];
}) {
  const { data, columnKeys } = props;
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  // 将操作类型转换为更友好的中文描述
  const getOperationText = (operate: string, logFor: string) => {
    const operationMap: { [key: string]: string } = {
      'add_spu': '新增商品',
      'edit_spu': '修改商品',
      'delete_spu': '删除商品',
      'add_sku': '新增规格',
      'edit_sku': '修改规格',
      'delete_sku': '删除规格',
      'add': '新增',
      'edit': '修改',
      'delete': '删除',
      'update': '更新',
      'create': '创建',
      'remove': '移除'
    };
    
    return operationMap[operate] || operate;
  };

  // 获取修改的字段名称列表
  const getChangedFieldNames = (record: ChangeLog): string[] => {
    const isEditOperation = (record as any).operate?.includes('edit') || (record as any).operate?.includes('update');
    
    if (!isEditOperation) {
      return [];
    }
    
    const original = (record as any).original || {};
    const present = (record as any).present || {};
    
    // 获取所有修改的字段
    const allKeys = new Set([...Object.keys(original), ...Object.keys(present)]);
    const changedFields = Array.from(allKeys).filter(key => {
      const origValue = original[key];
      const presentValue = present[key];
      return JSON.stringify(origValue) !== JSON.stringify(presentValue);
    });
    
    // 转换为友好的字段名称
    return changedFields.map(key => getFriendlyFieldName(key));
  };

  // 将变动项转换为更友好的描述
  const getLogForText = (logFor: string) => {
    if (logFor.startsWith('spu_')) {
      const spuId = logFor.replace('spu_', '');
      return `商品 ${spuId}`;
    }
    if (logFor.startsWith('sku_')) {
      const skuId = logFor.replace('sku_', '');
      return `规格 ${skuId}`;
    }
    return logFor;
  };

  const columns: ColumnsType<ChangeLog> = [
    {
      title: '时间',
      render: (_, { createdAt }) => <RenderDateTime muts={createdAt} />,
      key: 'createdAt',
      width: 160,
      sorter: (a, b) => Number(a.createdAt) - Number(b.createdAt),
      defaultSortOrder: 'descend' as const,
    },
    {
      title: '操作人',
      key: 'createdBy',
      render: (_, { createdBy }) => <RenderUser userIdent={createdBy} />,
      width: 100,
    },
    { 
      title: '操作项', 
      key: 'logFor', 
      width: 120,
      render: (_, { logFor }) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {getLogForText(logFor)}
        </span>
      )
    },
    { 
      title: '操作类型', 
      key: 'operate', 
      width: 200,
      render: (_, record) => {
        const { operate, logFor } = record;
        const operationType = getOperationText(operate, logFor);
        const color = operate.includes('add') || operate.includes('create') ? '#52c41a' : 
                     operate.includes('edit') || operate.includes('update') ? '#1890ff' : 
                     operate.includes('delete') || operate.includes('remove') ? '#ff4d4f' : '#666';
        
        // 获取修改的字段列表
        const changedFields = getChangedFieldNames(record);
        
        return (
          <div>
            <span style={{ color, fontWeight: 500 }}>
              {operationType}
            </span>
            {changedFields.length > 0 && (
              <div style={{ fontSize: '12px', color: '#999', marginTop: '2px' }}>
                {changedFields.join('、')}
              </div>
            )}
          </div>
        );
      }
    },
  ];

  return (
    <Table
      rowKey="logID"
      size="small"
      columns={columns.filter(v => {
        if (columnKeys === undefined || typeof v.key !== 'string') {
          return true;
        }
        return columnKeys.includes(v.key);
      })}
      dataSource={data}
      pagination={false}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: (keys) => setExpandedRowKeys(keys as React.Key[]),
        expandedRowRender: (record) => (
          <div style={{ padding: '12px 16px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', color: '#333' }}>操作详情</div>
            <RenderChangeDetail log={record} />
          </div>
        ),
        rowExpandable: (record) => {
          // 检查是否有详细信息可以展示
          const hasPresent = 'present' in record && record.present && Object.keys(record.present as any).length > 0;
          const hasChange = 'change' in record && record.change && Object.keys(record.change as any).length > 0;
          const hasOriginal = 'original' in record && record.original && Object.keys(record.original as any).length > 0;
          
          return !!(hasPresent || hasChange || hasOriginal);
        },
      }}
    />
  );
}

function RenderDateTime(props: { muts: string | number }) {
  const date = new Date(Number(props.muts));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // 如果是今天，显示相对时间
  if (diffDays === 0) {
    if (diffMinutes < 1) {
      return <span style={{ color: '#52c41a' }}>刚刚</span>;
    } else if (diffMinutes < 60) {
      return <span style={{ color: '#52c41a' }}>{diffMinutes}分钟前</span>;
    } else {
      return <span style={{ color: '#1890ff' }}>{diffHours}小时前</span>;
    }
  }
  
  // 如果是昨天
  if (diffDays === 1) {
    return <span style={{ color: '#faad14' }}>昨天 {date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>;
  }
  
  // 如果是一周内
  if (diffDays < 7) {
    return <span style={{ color: '#722ed1' }}>{diffDays}天前</span>;
  }
  
  // 超过一周，显示完整日期
  return (
    <span style={{ color: '#666' }}>
      {date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })}
    </span>
  );
}

function RenderUser(props: { userIdent: string }) {
  return <span>{props.userIdent}</span>;
}

function RenderChangeDetail(props: { log: ChangeLog }) {
  const { log } = props;
  const isEditOperation = (log as any).operate?.includes('edit') || (log as any).operate?.includes('update');
  
  // 如果是修改操作，显示修改前后对比
  if (isEditOperation && 'original' in log && 'present' in log) {
    const original = (log as any).original || {};
    const present = (log as any).present || {};
    
    // 获取所有修改的字段
    const allKeys = new Set([...Object.keys(original), ...Object.keys(present)]);
    const changedFields = Array.from(allKeys).filter(key => {
      const origValue = original[key];
      const presentValue = present[key];
      return JSON.stringify(origValue) !== JSON.stringify(presentValue);
    });
    
    if (changedFields.length === 0) {
      return <div style={{ color: '#999', fontSize: '12px' }}>暂无详细信息</div>;
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {changedFields.map((key, idx) => {
          const origValue = original[key];
          const presentValue = present[key];
          
          return (
            <div
              key={idx}
              style={{
                padding: '12px',
                backgroundColor: '#fff',
                borderRadius: '6px',
                border: '1px solid #d6f7ff',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ 
                fontSize: '13px', 
                color: '#1890ff', 
                marginBottom: '12px', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: '#1890ff' 
                }}></span>
                {getFriendlyFieldName(key)}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'start' }}>
                {/* 修改前 */}
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#d46b08', 
                    marginBottom: '6px', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ color: '#faad14' }}>●</span>
                    修改前
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#fff7e6',
                    borderRadius: '4px',
                    border: '1px solid #ffd591',
                    fontSize: '12px', 
                    color: '#333', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {formatDetailValue(origValue)}
                  </div>
                </div>
                
                {/* 修改后 */}
                <div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#389e0d', 
                    marginBottom: '6px', 
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span style={{ color: '#52c41a' }}>●</span>
                    修改后
                  </div>
                  <div style={{
                    padding: '8px',
                    backgroundColor: '#f6ffed',
                    borderRadius: '4px',
                    border: '1px solid #b7eb8f',
                    fontSize: '12px', 
                    color: '#333', 
                    whiteSpace: 'pre-wrap', 
                    wordBreak: 'break-word',
                    lineHeight: '1.5',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    {formatDetailValue(presentValue)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  // 非修改操作，使用原有逻辑
  const items: { label: string; type: 'change' | 'add' | 'remove'; value: any }[] = [];

  if ('present' in log && (log as any).present && Object.keys((log as any).present).length > 0) {
    items.push({ label: '修改后的内容', type: 'change', value: (log as any).present });
  }

  if ('change' in log && (log as any).change && Object.keys((log as any).change).length > 0) {
    items.push({ label: '新增的内容', type: 'add', value: (log as any).change });
  }

  if ('original' in log && (log as any).original && Object.keys((log as any).original).length > 0) {
    items.push({ label: '修改前的内容', type: 'remove', value: (log as any).original });
  }

  if (items.length === 0) {
    return <div style={{ color: '#999', fontSize: '12px' }}>暂无详细信息</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {items.map((item, idx) => (
        <div
          key={idx}
          style={{
            padding: '12px',
            backgroundColor: '#fff',
            borderRadius: '6px',
            borderLeft: `4px solid ${item.type === 'change' ? '#1890ff' : item.type === 'add' ? '#52c41a' : '#ff4d4f'}`,
            border: `1px solid ${item.type === 'change' ? '#d6f7ff' : item.type === 'add' ? '#d9f7be' : '#ffccc7'}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ 
            fontSize: '13px', 
            color: item.type === 'change' ? '#1890ff' : item.type === 'add' ? '#52c41a' : '#ff4d4f', 
            marginBottom: '8px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: item.type === 'change' ? '#1890ff' : item.type === 'add' ? '#52c41a' : '#ff4d4f' 
            }}></span>
            {item.label}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#333', 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            lineHeight: '1.5'
          }}>
            {formatDetailValue(item.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDetailValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  // 如果是字符串，尝试解析为 JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return formatDetailValue(parsed);
    } catch {
      // 不是 JSON，直接返回字符串
      return value;
    }
  }
  
  if (typeof value === 'object') {
    // 如果是数组，检查是否是 skuIDs 数组
    if (Array.isArray(value)) {
      // 检查是否是 SKU 对象数组
      if (value.length > 0 && value[0] && typeof value[0] === 'object' && 'skuID' in value[0]) {
        return formatSkuIDsArray(value);
      }
      return `[${value.join(', ')}]`;
    }
    
    // 检查是否是单个 SKU 对象
    if ('skuID' in value && (value.spec || value.color || value.combo)) {
      return formatSingleSku(value);
    }
    
    // 检查是否是 images 对象
    if ('mainImages' in value || 'detailsImages' in value || 'thumbnail' in value) {
      return formatImagesDetail(value);
    }
    
    // 处理普通对象，逐个字段格式化
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return '{}';
    }
    
    return entries
      .map(([key, val]) => {
        if (key === 'images' && val && typeof val === 'object') {
          return `图片: ${formatImageObject(val)}`;
        }
        if (key === 'skuIDs') {
          if (Array.isArray(val)) {
            return `SKU规格: ${formatSkuIDsArray(val)}`;
          } else if (val && typeof val === 'object' && 'skuID' in val) {
            return `SKU规格: ${formatSingleSku(val)}`;
          } else if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) {
                return `SKU规格: ${formatSkuIDsArray(parsed)}`;
              } else if (parsed && typeof parsed === 'object' && 'skuID' in parsed) {
                return `SKU规格: ${formatSingleSku(parsed)}`;
              }
            } catch {
              // 不是 JSON，直接返回
            }
          }
        }
        // 将技术字段名转换为更友好的显示名称
        const friendlyKey = getFriendlyFieldName(key);
        return `${friendlyKey}: ${formatHumanReadable(val)}`;
      })
      .join('\n');
  }
  return String(value);
}

function formatImagesDetail(images: any): string {
  const parts: string[] = [];
  
  if (images.thumbnail) {
    parts.push(`缩略图: 1张`);
  }
  
  if (images.mainImages && Array.isArray(images.mainImages) && images.mainImages.length > 0) {
    parts.push(`主图: ${images.mainImages.length}张`);
  }
  
  if (images.detailsImages && Array.isArray(images.detailsImages) && images.detailsImages.length > 0) {
    parts.push(`详情图: ${images.detailsImages.length}张`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : '无图片';
}

function getFriendlyFieldName(key: string): string {
  const fieldMap: { [key: string]: string } = {
    // 基本信息
    'name': '商品名称',
    'title': '标题',
    'description': '商品描述',
    'summary': '商品简介',
    'spell': '拼音码',
    'remarks': '备注',
    'remark': '备注说明',
    
    // SPU相关
    'series': '系列',
    'generation': '代数',
    'order': '排序号',
    'spuCateID': '商品分类',
    'skuIDs': 'SKU规格',
    
    // 价格相关
    'price': '价格',
    'listPrice': '官网价',
    'originalPrice': '原价',
    'salePrice': '售价',
    'costPrice': '成本价',
    'marketPrice': '市场价',
    
    // 库存相关
    'stock': '库存数量',
    'inventory': '库存',
    'quantity': '数量',
    'availableStock': '可用库存',
    
    // 分类相关
    'category': '商品分类',
    'categoryId': '分类ID',
    'brand': '品牌',
    'brandId': '品牌ID',
    
    // 规格相关
    'color': '颜色',
    'spec': '配置',
    'combo': '版本',
    'size': '尺寸',
    'weight': '重量',
    'grossWeight': '毛重',
    'unit': '单位',
    'dimensions': '规格尺寸',
    'defaultSNRules': '默认序列号规则',
    
    // 状态相关
    'status': '状态',
    'state': '状态',
    'isActive': '是否启用',
    'isVisible': '是否显示',
    'isDeleted': '是否删除',
    'published': '是否发布',
    'display': '是否展示',
    
    // 时间相关
    'createdAt': '创建时间',
    'updatedAt': '更新时间',
    'publishedAt': '发布时间',
    'deletedAt': '删除时间',
    'releaseDate': '发布日期',
    
    // ID相关
    'id': 'ID',
    'skuID': 'SKU编号',
    'spuID': 'SPU编号',
    'productId': '商品ID',
    'userId': '用户ID',
    
    // 媒体相关
    'images': '商品图片',
    'thumbnail': '缩略图',
    'mainImage': '主图',
    'mainImages': '主图',
    'detailImages': '详情图',
    'detailsImages': '详情图',
    'video': '商品视频',
    'logo': 'LOGO',
    
    // 商品码相关
    'gtins': '商品条码',
    'barcode': '条形码',
    'qrcode': '二维码',
    'sku': 'SKU码',
    'number': '编号',
    
    // 销售相关
    'sales': '销量',
    'views': '浏览量',
    'likes': '点赞数',
    'rating': '评分',
    'reviews': '评价数',
    
    // 物流相关
    'shipping': '运费',
    'shippingWeight': '运输重量',
    'packageSize': '包装尺寸',
    
    // 其他
    'tags': '标签',
    'keywords': '关键词',
    'seoTitle': 'SEO标题',
    'seoDescription': 'SEO描述',
    'notes': '备注',
  };
  
  return fieldMap[key] || key;
}

function formatHumanReadable(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  
  // 如果是字符串，尝试解析为 JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return formatHumanReadable(parsed);
    } catch {
      // 不是 JSON，直接返回字符串
      return value;
    }
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      // 检查是否是 SKU 对象数组
      if (value.length > 0 && value[0] && typeof value[0] === 'object' && 'skuID' in value[0]) {
        return formatSkuIDsArray(value);
      }
      return `[${value.join(', ')}]`;
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function formatImageObject(images: any): string {
  if (!images || typeof images !== 'object') {
    return String(images);
  }
  
  const parts: string[] = [];
  
  if (images.thumbnail) {
    parts.push(`缩略图: 1张`);
  }
  
  if (images.mainImages && Array.isArray(images.mainImages)) {
    parts.push(`主图: ${images.mainImages.length}张`);
  }
  
  if (images.detailsImages && Array.isArray(images.detailsImages)) {
    parts.push(`详情图: ${images.detailsImages.length}张`);
  }
  
  return parts.length > 0 ? parts.join(' | ') : '无图片';
}

function formatSkuIDsArray(skuIDs: any[]): string {
  if (!Array.isArray(skuIDs) || skuIDs.length === 0) {
    return '无商品规格';
  }
  
  // 处理单个 SKU 对象的情况
  if (skuIDs.length === 1) {
    const sku = skuIDs[0];
    if (sku && typeof sku === 'object') {
      return formatSingleSku(sku);
    }
    return String(sku);
  }
  
  // 多个 SKU 时，显示汇总信息
  const skuDetails = skuIDs.map((sku) => {
    if (sku && typeof sku === 'object') {
      return formatSingleSku(sku);
    }
    return String(sku);
  });
  
  return skuDetails.join('\n');
}

function formatSingleSku(sku: any): string {
  if (!sku || typeof sku !== 'object') {
    return String(sku);
  }
  
  const parts: string[] = [];
  
  // 按照优先级添加规格信息
  if (sku.spec) parts.push(`规格: ${sku.spec}`);
  if (sku.color) parts.push(`颜色: ${sku.color}`);
  if (sku.combo) parts.push(`版本: ${sku.combo}`);
  if (sku.size) parts.push(`尺寸: ${sku.size}`);
  if (sku.weight) parts.push(`重量: ${sku.weight}`);
  
  // 添加其他字段
  const excludeKeys = ['spec', 'color', 'combo', 'size', 'weight', 'skuID'];
  Object.entries(sku).forEach(([key, value]) => {
    if (!excludeKeys.includes(key) && value !== null && value !== undefined) {
      const friendlyKey = getFriendlyFieldName(key);
      parts.push(`${friendlyKey}: ${formatHumanReadable(value)}`);
    }
  });
  
  // 添加 SKU ID
  if (sku.skuID) {
    parts.push(`SKU编号: ${sku.skuID}`);
  }
  
  return parts.join('\n');
}
