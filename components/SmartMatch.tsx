'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, CheckCircle, XCircle, Download } from 'lucide-react';
import { Card, Input, Button, Table, Tag, Space, message, Spin } from 'antd';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { SKUState } from '@zsqk/z1-sdk/es/z1p/alltypes';

interface MatchResult {
  inputName: string;
  matchedSKU: string | null;
  matchedSPU: string | null;
  matchedBrand: string | null;
  similarity: number;
  status: 'matched' | 'unmatched';
}

interface SKUData {
  id: number;
  name: string;
  spuName?: string;
  brand?: string;
}

// 简化的匹配算法
class SimpleMatcher {
  // 标准化字符串
  normalize(str: string | null | undefined): string {
    if (!str) return '';
    return str
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/苹果/g, 'apple')
      .replace(/华为/g, 'huawei')
      .replace(/荣耀/g, 'honor')
      .replace(/小米/g, 'xiaomi')
      .replace(/vivo/g, 'vivo')
      .replace(/oppo/g, 'oppo');
  }

  // 提取品牌
  extractBrand(str: string): string | null {
    const lowerStr = str.toLowerCase();
    const brands = ['apple', 'huawei', 'honor', 'xiaomi', 'vivo', 'oppo', 'samsung', 'oneplus', 'realme'];
    
    for (const brand of brands) {
      if (lowerStr.includes(brand)) {
        return brand;
      }
    }
    
    // 中文品牌
    if (lowerStr.includes('苹果')) return 'apple';
    if (lowerStr.includes('华为')) return 'huawei';
    if (lowerStr.includes('荣耀')) return 'honor';
    if (lowerStr.includes('小米')) return 'xiaomi';
    
    return null;
  }

  // 提取型号（包括字母和数字）
  extractModel(str: string): string | null {
    const lowerStr = str.toLowerCase();
    
    // 先尝试匹配常见的完整型号格式
    // Y300i, Y300, Y3, X Note, Mate60, iPhone15等
    
    // 1. 匹配 "字母+数字+可选字母" 格式（如 Y300i, Y3, Mate60）
    const simpleModelPattern = /\b([a-z])(\d+)([a-z]*)\b/gi;
    const simpleMatches = lowerStr.match(simpleModelPattern);
    
    // 2. 匹配 "字母 字母" 格式（如 X Note, X Fold）
    const wordModelPattern = /\b([a-z]+)\s+([a-z]+)\b/gi;
    const wordMatches = lowerStr.match(wordModelPattern);
    
    // 优先返回包含数字的型号（更具体）
    if (simpleMatches && simpleMatches.length > 0) {
      // 过滤掉容量相关的匹配（如 5g, 4gb）
      const filtered = simpleMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('gb') && 
               !lower.includes('g') && 
               !lower.endsWith('g') &&
               !/^\d+g$/.test(lower);
      });
      
      if (filtered.length > 0) {
        // 返回最长的匹配（通常是最完整的型号）
        return filtered.sort((a, b) => b.length - a.length)[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    // 如果没有数字型号，返回字母型号（如 X Note）
    if (wordMatches && wordMatches.length > 0) {
      // 过滤掉常见的非型号词组
      const filtered = wordMatches.filter(m => {
        const lower = m.toLowerCase();
        return !lower.includes('全网通') && 
               !lower.includes('版本') &&
               !lower.includes('网通');
      });
      
      if (filtered.length > 0) {
        return filtered[0].toLowerCase().replace(/\s+/g, '');
      }
    }
    
    return null;
  }

  // 提取容量
  extractCapacity(str: string): string | null {
    // 匹配 12+512, 12GB+512GB, 4+128 等格式
    const capacityPattern = /(\d+)\s*(?:gb)?\s*\+\s*(\d+)\s*(?:gb)?/gi;
    const match = str.match(capacityPattern);
    
    if (match && match.length > 0) {
      const nums = match[0].match(/\d+/g);
      if (nums && nums.length === 2) {
        return `${nums[0]}+${nums[1]}`;
      }
    }
    
    // 匹配单个容量 128GB, 256GB等
    const singlePattern = /(\d+)\s*gb/gi;
    const singleMatch = str.match(singlePattern);
    if (singleMatch && singleMatch.length > 0) {
      const num = singleMatch[0].match(/\d+/);
      if (num) {
        return num[0];
      }
    }
    
    return null;
  }

  // 提取颜色
  extractColor(str: string): string | null {
    const colors = [
      '黑', '白', '蓝', '红', '绿', '紫', '粉', '金', '银', '灰',
      '墨黛', '雾凇', '雾松', '星空', '极光', '钛', '午夜', '星光'
    ];
    
    const lowerStr = str.toLowerCase();
    for (const color of colors) {
      if (lowerStr.includes(color)) {
        return color;
      }
    }
    
    return null;
  }

  // 计算相似度（改进版）
  calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = this.normalize(str1);
    const normalized2 = this.normalize(str2);

    if (normalized1 === normalized2) return 1.0;
    
    // 提取关键信息
    const brand1 = this.extractBrand(str1);
    const brand2 = this.extractBrand(str2);
    const model1 = this.extractModel(str1);
    const model2 = this.extractModel(str2);
    const capacity1 = this.extractCapacity(str1);
    const capacity2 = this.extractCapacity(str2);
    const color1 = this.extractColor(str1);
    const color2 = this.extractColor(str2);
    
    // 品牌必须匹配
    if (brand1 && brand2 && brand1 !== brand2) {
      return 0.1; // 品牌不匹配，直接拒绝
    }
    
    // 型号必须匹配（最关键）
    if (model1 && model2) {
      if (model1 !== model2) {
        // 型号不匹配，直接拒绝
        // Y300i vs xnote 应该被拒绝
        return 0.2;
      }
    }
    
    // 如果没有提取到型号，使用更严格的匹配
    if (!model1 || !model2) {
      // 至少要有包含关系
      if (!normalized2.includes(normalized1) && !normalized1.includes(normalized2)) {
        return 0.3;
      }
    }
    
    let score = 0;
    let totalWeight = 0;
    
    // 品牌匹配（权重30%）
    if (brand1 && brand2) {
      totalWeight += 0.3;
      if (brand1 === brand2) {
        score += 0.3;
      }
    }
    
    // 型号匹配（权重50%）- 最关键
    if (model1 && model2) {
      totalWeight += 0.5;
      if (model1 === model2) {
        score += 0.5;
      }
    }
    
    // 容量匹配（权重15%）
    if (capacity1 && capacity2) {
      totalWeight += 0.15;
      if (capacity1 === capacity2) {
        score += 0.15;
      }
    }
    
    // 颜色匹配（权重5%）
    if (color1 && color2) {
      totalWeight += 0.05;
      if (color1 === color2 || 
          (color1.includes('雾凇') && color2.includes('雾松')) ||
          (color1.includes('雾松') && color2.includes('雾凇'))) {
        score += 0.05;
      }
    }
    
    // 如果没有足够的信息进行匹配，使用基础字符串相似度
    if (totalWeight < 0.5) {
      if (normalized2.includes(normalized1) || normalized1.includes(normalized2)) {
        return 0.5;
      }
      
      // 简单的关键词匹配
      const words1 = normalized1.match(/[\u4e00-\u9fa5]+|[a-z0-9]+/gi) || [];
      const words2 = normalized2.match(/[\u4e00-\u9fa5]+|[a-z0-9]+/gi) || [];
      
      let matchCount = 0;
      for (const word of words1) {
        if (words2.some(w => w.includes(word) || word.includes(w))) {
          matchCount++;
        }
      }
      
      return words1.length > 0 ? matchCount / words1.length * 0.6 : 0;
    }
    
    return totalWeight > 0 ? score / totalWeight : 0;
  }

  // 查找最佳匹配
  findBestMatch(input: string, skuList: SKUData[], threshold: number = 0.6): {
    sku: SKUData | null;
    similarity: number;
  } {
    let bestMatch: SKUData | null = null;
    let bestScore = 0;

    for (const sku of skuList) {
      const score1 = this.calculateSimilarity(input, sku.name);
      const score2 = sku.spuName ? this.calculateSimilarity(input, sku.spuName) : 0;
      const score = Math.max(score1, score2);

      if (score > bestScore && score >= threshold) {
        bestScore = score;
        bestMatch = sku;
      }
    }

    return { sku: bestMatch, similarity: bestScore };
  }
}

export function SmartMatchComponent() {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSKU, setLoadingSKU] = useState(true);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [skuList, setSKUList] = useState<SKUData[]>([]);
  const matcher = new SimpleMatcher();

  // 加载SKU数据
  useEffect(() => {
    const loadSKUData = async () => {
      try {
        setLoadingSKU(true);
        const data = await getSKUListJoinSPU(
          {
            states: [SKUState.在用],
            limit: 10000,
            offset: 0,
            orderBy: { key: 'p.id', sort: 'DESC' },
          },
          {
            sku: ['id', 'name'],
            spu: ['spuName', 'brand'],
          }
        );
        setSKUList(data);
        message.success(`已加载 ${data.length} 个SKU商品`);
      } catch (error) {
        message.error('加载SKU数据失败');
        console.error(error);
      } finally {
        setLoadingSKU(false);
      }
    };
    loadSKUData();
  }, []);

  const handleMatch = async () => {
    if (!inputText.trim()) {
      message.warning('请输入商品名称');
      return;
    }

    if (skuList.length === 0) {
      message.warning('SKU数据未加载完成，请稍候');
      return;
    }

    setLoading(true);
    try {
      // 将输入按行分割
      const lines = inputText.split('\n').filter(line => line.trim());
      
      // 对每一行进行匹配
      const matchResults: MatchResult[] = lines.map(line => {
        const { sku, similarity } = matcher.findBestMatch(line.trim(), skuList);
        
        if (sku) {
          return {
            inputName: line.trim(),
            matchedSKU: sku.name || null,
            matchedSPU: sku.spuName || null,
            matchedBrand: sku.brand || null,
            similarity,
            status: 'matched' as const,
          };
        } else {
          return {
            inputName: line.trim(),
            matchedSKU: null,
            matchedSPU: null,
            matchedBrand: null,
            similarity: 0,
            status: 'unmatched' as const,
          };
        }
      });

      setResults(matchResults);
      const matchedCount = matchResults.filter(r => r.status === 'matched').length;
      message.success(`匹配完成，共处理 ${lines.length} 条记录，成功匹配 ${matchedCount} 条`);
    } catch (error) {
      message.error('匹配失败，请重试');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (results.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    const csvContent = [
      ['输入商品名称', '匹配状态', '匹配的SKU', '匹配的SPU', '品牌', '相似度'],
      ...results.map(r => [
        r.inputName,
        r.status === 'matched' ? '已匹配' : '未匹配',
        r.matchedSKU || '-',
        r.matchedSPU || '-',
        r.matchedBrand || '-',
        r.status === 'matched' ? `${(r.similarity * 100).toFixed(0)}%` : '-',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `智能匹配结果_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    message.success('导出成功');
  };

  const columns = [
    {
      title: '输入商品名称',
      dataIndex: 'inputName',
      key: 'inputName',
      width: '25%',
    },
    {
      title: '匹配状态',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status: string) => (
        status === 'matched' ? (
          <Tag icon={<CheckCircle size={14} />} color="success">
            已匹配
          </Tag>
        ) : (
          <Tag icon={<XCircle size={14} />} color="error">
            未匹配
          </Tag>
        )
      ),
    },
    {
      title: '匹配的SKU',
      dataIndex: 'matchedSKU',
      key: 'matchedSKU',
      width: '25%',
      render: (text: string | null) => text || '-',
    },
    {
      title: '匹配的SPU',
      dataIndex: 'matchedSPU',
      key: 'matchedSPU',
      width: '15%',
      render: (text: string | null) => text || '-',
    },
    {
      title: '品牌',
      dataIndex: 'matchedBrand',
      key: 'matchedBrand',
      width: '10%',
      render: (text: string | null) => text || '-',
    },
    {
      title: '相似度',
      dataIndex: 'similarity',
      key: 'similarity',
      width: '10%',
      render: (similarity: number, record: MatchResult) => (
        record.status === 'matched' ? (
          <Tag color={similarity >= 0.8 ? 'green' : similarity >= 0.6 ? 'orange' : 'red'}>
            {(similarity * 100).toFixed(0)}%
          </Tag>
        ) : '-'
      ),
    },
  ];

  if (loadingSKU) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="正在加载SKU数据..." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                输入商品名称（每行一个）
              </label>
              <div className="text-sm text-slate-500">
                已加载 {skuList.length} 个SKU商品
              </div>
            </div>
            <Input.TextArea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入商品名称，每行一个&#10;例如：&#10;华为 Mate 60 Pro 12+256 雅川青&#10;苹果 iPhone 15 Pro Max 256GB 钛金色&#10;小米14 Ultra 16GB+512GB 黑色"
              rows={10}
              disabled={loading}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              支持批量输入，系统将自动匹配最相似的SKU商品（相似度阈值：60%）
            </div>
            <Space>
              <Button
                onClick={() => {
                  setInputText('');
                  setResults([]);
                }}
                disabled={loading}
              >
                清空
              </Button>
              <Button
                type="primary"
                icon={loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                onClick={handleMatch}
                disabled={loading || !inputText.trim()}
              >
                {loading ? '匹配中...' : '开始匹配'}
              </Button>
            </Space>
          </div>
        </div>
      </Card>

      {results.length > 0 && (
        <Card 
          title={
            <div className="flex justify-between items-center">
              <span>匹配结果</span>
              <Button
                icon={<Download size={16} />}
                onClick={exportResults}
                size="small"
              >
                导出CSV
              </Button>
            </div>
          }
        >
          <div className="mb-4 flex gap-4">
            <Tag color="blue">
              总计：{results.length} 条
            </Tag>
            <Tag color="success">
              已匹配：{results.filter(r => r.status === 'matched').length} 条
            </Tag>
            <Tag color="error">
              未匹配：{results.filter(r => r.status === 'unmatched').length} 条
            </Tag>
          </div>
          <Table
            columns={columns}
            dataSource={results}
            rowKey={(record, index) => `${record.inputName}-${index}`}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条记录`,
            }}
          />
        </Card>
      )}
    </div>
  );
}
