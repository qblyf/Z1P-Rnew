import { SpuKeyword, SpuKeyWordID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Button, Input, InputNumber, Select, Space, Table, Tag, Tooltip, message } from 'antd';
import { useState, useRef } from 'react';

interface SearchKeywordsManagerProps {
  keywords: SpuKeyword[];
  onChange: (keywords: SpuKeyword[]) => void;
}

interface ExtendedKeyword extends SpuKeyword {
  externalId: number;
}

interface TableRecord {
  key: string;
  externalId: number;
  id: SpuKeyWordID;
  dimension: string;
  weight: number;
  keywords: string;
  rawKeywords: string[];
}

const DIMENSION_OPTIONS = [
  { label: '品类', value: SpuKeyWordID.品类 },
  { label: '品牌', value: SpuKeyWordID.品牌 },
  { label: '系列', value: SpuKeyWordID.系列 },
  { label: '代际', value: SpuKeyWordID.代际 }
];

// 用于生成唯一ID的计数器（在模块级别）
let idCounter = -1;

const generateExternalId = (): number => {
  return --idCounter;
};

const generateRandomId = (): number => {
  return Math.floor(Math.random() * 1000000) + 1;
};

export default function SearchKeywordsManager({ keywords, onChange }: SearchKeywordsManagerProps) {
  const [editingExternalId, setEditingExternalId] = useState<number | null>(null);
  const [tempKeywords, setTempKeywords] = useState<string>('');
  const [editingData, setEditingData] = useState<{
    id: SpuKeyWordID;
    weight: number;
    keywords: string[];
  } | null>(null);

  // 将原始keywords转换为带externalId的扩展格式
  // 使用数组索引作为稳定的externalId
  const extendedKeywords: ExtendedKeyword[] = (keywords || []).map((kw, index) => ({
    ...kw,
    externalId: index + 1  // 使用1-based索引作为externalId
  }));

  // 构建表格数据
  const tableData: TableRecord[] = extendedKeywords
    .map((kw) => ({
      key: kw.externalId.toString(),
      externalId: kw.externalId,
      id: kw.id,
      dimension: DIMENSION_OPTIONS.find(opt => opt.value === kw.id)?.label || kw.id,
      weight: kw.weight,
      keywords: kw.keywords.join('，'),
      rawKeywords: [...kw.keywords]
    }))
    .sort((a, b) => b.weight - a.weight);

  const handleAddKeyword = () => {
    if (editingExternalId !== null) return; // 如果有正在编辑的行，则禁用新增
    
    const newExternalId = generateExternalId(); // 新增行使用-1开始的负数ID
    setEditingExternalId(newExternalId);
    setEditingData({
      id: SpuKeyWordID.品类,
      weight: 1,
      keywords: []
    });
    setTempKeywords('');
  };

  const handleSaveNewKeyword = () => {
    if (!tempKeywords.trim() || !editingData) return;

    const keywordArray = tempKeywords.split('，').filter(k => k.trim());
    if (!keywordArray.length || !editingData.weight || !editingData.id) {
      message.warning('请输入完整的关键词信息');
      return;
    }

    const newKeywordItem: SpuKeyword = {
      id: editingData.id,
      keywords: keywordArray,
      weight: editingData.weight
    };

    onChange([...keywords, newKeywordItem]);
    setEditingExternalId(null);
    setEditingData(null);
    setTempKeywords('');
  };

  const handleCancelNewKeyword = () => {
    setEditingExternalId(null);
    setEditingData(null);
    setTempKeywords('');
  };

  const handleEditKeyword = (record: TableRecord) => {
    if (editingExternalId !== null) return; // 如果已有其他行在编辑，则不允许编辑
    
    setEditingExternalId(record.externalId);
    setEditingData({
      id: record.id,
      weight: record.weight,
      keywords: record.rawKeywords
    });
    setTempKeywords(record.keywords);
  };

  const handleSaveEdit = (record: TableRecord) => {
    if (!editingData) return;

    const keywordArray = tempKeywords.split('，').filter(k => k.trim());
    if (!keywordArray.length || !editingData.weight) {
      message.warning('请输入完整的关键词信息');
      return;
    }

    // 找到要更新的关键词在原数组中的位置
    const targetIndex = extendedKeywords.findIndex(kw => kw.externalId === record.externalId);
    if (targetIndex !== -1) {
      const updatedKeywords = [...keywords];
      updatedKeywords[targetIndex] = {
        id: editingData.id,
        keywords: keywordArray,
        weight: editingData.weight
      };
      onChange(updatedKeywords);
    }

    setEditingExternalId(null);
    setEditingData(null);
    setTempKeywords('');
  };

  const handleCancelEdit = () => {
    setEditingExternalId(null);
    setEditingData(null);
    setTempKeywords('');
  };

  const handleDeleteKeyword = (record: TableRecord) => {
    const targetIndex = extendedKeywords.findIndex(kw => kw.externalId === record.externalId);
    if (targetIndex !== -1) {
      const updatedKeywords = keywords.filter((_, index) => index !== targetIndex);
      onChange(updatedKeywords);
    }
  };

  const columns = [
    {
      title: '维度',
      dataIndex: 'dimension',
      key: 'dimension',
      width: 120,
      render: (_value: unknown, record: TableRecord) => {
        const isEditing = editingExternalId === record.externalId;
        
        if (isEditing) {
          return (
            <Select
              value={editingData?.id || record.id}
              onChange={value => {
                setEditingData(prev => prev ? { ...prev, id: value } : null);
              }}
              style={{ width: '100%' }}
              options={DIMENSION_OPTIONS}
            />
          );
        }
        return record.dimension;
      }
    },
    {
      title: '权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      render: (_value: unknown, record: TableRecord) => {
        const isEditing = editingExternalId === record.externalId;
        
        if (isEditing) {
          return (
            <InputNumber
              min={1}
              value={editingData?.weight || record.weight}
              onChange={value => {
                setEditingData(prev => prev ? { ...prev, weight: value || 1 } : null);
              }}
              style={{ width: '100%' }}
            />
          );
        }
        return record.weight;
      }
    },
    {
      title: '关键词',
      dataIndex: 'keywords',
      key: 'keywords',
      render: (_value: unknown, record: TableRecord) => {
        const isEditing = editingExternalId === record.externalId;
        
        if (isEditing) {
          return (
            <Input
              value={tempKeywords}
              onChange={e => setTempKeywords(e.target.value)}
              placeholder="输入关键词，多个关键词用逗号分隔"
            />
          );
        }
        
        return (
          <Space wrap>
            {record.rawKeywords.map((keyword: string, idx: number) => (
              <Tag key={idx} color="blue">{keyword}</Tag>
            ))}
          </Space>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_value: unknown, record: TableRecord) => {
        const isEditing = editingExternalId === record.externalId;
        
        if (isEditing) {
          return (
            <Space>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => record.externalId < 0 ? handleSaveNewKeyword() : handleSaveEdit(record)}
              >
                保存
              </Button>
              <Button 
                size="small" 
                onClick={record.externalId < 0 ? handleCancelNewKeyword : handleCancelEdit}
              >
                取消
              </Button>
            </Space>
          );
        }
        
        return (
          <Space>
            <Button size="small" onClick={() => handleEditKeyword(record)}>
              编辑
            </Button>
            <Button 
              size="small" 
              danger 
              onClick={() => handleDeleteKeyword(record)}
            >
              删除
            </Button>
          </Space>
        );
      }
    }
  ];

  // 添加新增行到表格数据末尾
  const displayData = editingExternalId !== null && editingExternalId < 0
    ? [...tableData, { 
        key: editingExternalId.toString(),
        externalId: editingExternalId,
        id: editingData?.id || SpuKeyWordID.品类,
        dimension: DIMENSION_OPTIONS.find(opt => opt.value === (editingData?.id || SpuKeyWordID.品类))?.label || (editingData?.id || SpuKeyWordID.品类),
        weight: editingData?.weight || 1, 
        keywords: tempKeywords,
        rawKeywords: editingData?.keywords || []
      }]
    : tableData;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Tooltip 
          title={editingExternalId !== null ? '请保存后新增' : ''}
          trigger={editingExternalId !== null ? 'hover' : []}
        >
          <Button 
            type="primary" 
            onClick={handleAddKeyword}
            disabled={editingExternalId !== null}
          >
            新增关键词
          </Button>
        </Tooltip>
        <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
          说明：用于网站搜索商品时的关键词匹配，多个关键词使用逗号&quot;，&quot;分隔
        </div>
      </div>
      
      <Table
        dataSource={displayData}
        columns={columns}
        pagination={false}
        rowKey="key"
        scroll={{ y: 300 }}
      />
    </div>
  );
}