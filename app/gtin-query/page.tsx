'use client';

import { useState } from 'react';
import Head from 'next/head';
import { Suspense } from 'react';
import {
  Card,
  Input,
  Button,
  Table,
  Tag,
  Space,
  Typography,
  Divider,
  message,
  Spin,
  Row,
  Col,
} from 'antd';
import { SearchOutlined, ClearOutlined, CopyOutlined, DownloadOutlined } from '@ant-design/icons';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { SKU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import * as XLSX from 'xlsx';
import PageWrap from '../../components/PageWrap';
import { getAwait } from '../../error';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface GTINQueryResult {
  key: string;
  gtin: string;
  found: boolean;
  skuId?: number;
  skuName?: string;
  spuId?: number;
  spuName?: string;
  brand?: string;
  state?: string;
  gtins?: string[];
}

export default function GTINQueryPage() {
  const [inputGtins, setInputGtins] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GTINQueryResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = getAwait(async () => {
    // 解析输入的GTIN
    const gtinList = inputGtins
      .split(/[\n,，;；]/)
      .map(g => g.trim())
      .filter(g => g.length > 0);

    const MAX_LIMIT = 2000;
    const BATCH_SIZE = 100;

    if (gtinList.length === 0) {
      message.warning('请输入至少一个69码');
      return;
    }

    if (gtinList.length > MAX_LIMIT) {
      message.warning(`最多只能一次查询 ${MAX_LIMIT} 个69码`);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    setResults([]);

    const queryResults: GTINQueryResult[] = [];

    try {
      // 分批处理，每批100条
      for (let i = 0; i < gtinList.length; i += BATCH_SIZE) {
        const batch = gtinList.slice(i, i + BATCH_SIZE);

        // 逐个查询每批中的每个GTIN
        for (const gtin of batch) {
          const result: GTINQueryResult = {
            key: gtin,
            gtin,
            found: false,
          };

          try {
            // 使用 getSKUListJoinSPU 查询，gtinKeyword 支持模糊匹配
            const skus = await getSKUListJoinSPU(
              {
                limit: 10,
                offset: 0,
                gtinKeyword: gtin,
              },
              {
                sku: ['id', 'name', 'gtins', 'state'],
                spu: ['spuName', 'brand'],
              }
            );

            // 精确匹配GTIN（因为 gtinKeyword 是模糊匹配）
            const exactMatch = skus.find(sku =>
              sku.gtins && sku.gtins.some(g => g === gtin || g.includes(gtin))
            );

            if (exactMatch) {
              result.found = true;
              result.skuId = exactMatch.id;
              result.skuName = exactMatch.name;
              result.state = exactMatch.state;
              result.gtins = exactMatch.gtins;
              if ('spuID' in exactMatch) {
                result.spuId = (exactMatch as any).spuID;
              }
              if ('spu' in exactMatch && exactMatch.spu) {
                const spu = exactMatch.spu as { spuName?: string; brand?: string };
                result.spuName = spu.spuName;
                result.brand = spu.brand;
              }
            }
          } catch (err) {
            console.error(`查询GTIN ${gtin}失败:`, err);
          }

          queryResults.push(result);
        }
      }

      setResults(queryResults);

      const foundCount = queryResults.filter(r => r.found).length;
      message.success(`查询完成：找到 ${foundCount}/${queryResults.length} 个69码`);
    } catch (err) {
      console.error('查询失败:', err);
      message.error('查询失败');
    } finally {
      setLoading(false);
    }
  });

  const handleClear = () => {
    setInputGtins('');
    setResults([]);
    setHasSearched(false);
  };

  const handleCopyFound = () => {
    const foundGtins = results.filter(r => r.found).map(r => r.gtin).join('\n');
    navigator.clipboard.writeText(foundGtins);
    message.success('已复制找到的69码');
  };

  const handleCopyNotFound = () => {
    const notFoundGtins = results.filter(r => !r.found).map(r => r.gtin).join('\n');
    navigator.clipboard.writeText(notFoundGtins);
    message.success('已复制未找到的69码');
  };

  const handleDownload = () => {
    const exportData = results.map(r => ({
      '69码': r.gtin,
      '状态': r.found ? '已找到' : '未找到',
      'SKU ID': r.skuId || '',
      'SKU 名称': r.skuName || '',
      'SPU ID': r.spuId || '',
      'SPU 名称': r.spuName || '',
      '品牌': r.brand || '',
      'SKU状态': r.state || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '69码查询结果');
    XLSX.writeFile(wb, `69码查询结果_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
    message.success('下载成功');
  };

  const columns = [
    {
      title: '69码',
      dataIndex: 'gtin',
      key: 'gtin',
      width: 180,
      fixed: 'left' as const,
    },
    {
      title: '状态',
      dataIndex: 'found',
      key: 'found',
      width: 100,
      render: (found: boolean) => found
        ? <Tag color="green">已找到</Tag>
        : <Tag color="red">未找到</Tag>,
    },
    {
      title: 'SKU ID',
      dataIndex: 'skuId',
      key: 'skuId',
      width: 100,
      render: (id: number) => id || '-',
    },
    {
      title: 'SKU 名称',
      dataIndex: 'skuName',
      key: 'skuName',
      width: 300,
      ellipsis: true,
    },
    {
      title: 'SPU ID',
      dataIndex: 'spuId',
      key: 'spuId',
      width: 100,
      render: (id: number) => id || '-',
    },
    {
      title: 'SPU 名称',
      dataIndex: 'spuName',
      key: 'spuName',
      width: 250,
      ellipsis: true,
    },
    {
      title: '品牌',
      dataIndex: 'brand',
      key: 'brand',
      width: 100,
    },
    {
      title: 'SKU状态',
      dataIndex: 'state',
      key: 'state',
      width: 100,
      render: (state: string) => {
        if (state === 'valid') return <Tag color="green">有效</Tag>;
        if (state === 'invalid') return <Tag color="red">无效</Tag>;
        return <Tag>未知</Tag>;
      },
    },
  ];

  return (
    <Suspense fallback={<Spin tip="加载中..." />}>
      <PageWrap ppKey="product-manage">
        <Head>
          <title>69码批量查询</title>
        </Head>

        <div style={{ padding: '24px' }}>
          {/* 页面标题 */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              margin: 0,
              marginBottom: '8px'
            }}>
              69码批量查询
            </h1>
            <p style={{
              color: '#666',
              margin: 0,
              fontSize: '14px'
            }}>
              输入69码（GTIN）列表，批量查询对应的商品信息，每次最多2000个
            </p>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          {/* 输入区域 */}
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={24}>
                <Text strong>输入69码（每行一个，或用逗号、分号分隔，最多2000个）：</Text>
                <TextArea
                  placeholder={`示例：\n6936520859450\n6974752440923\n6977887510721\n（每次最多输入2000个）`}
                  value={inputGtins}
                  onChange={e => setInputGtins(e.target.value)}
                  rows={6}
                  style={{ marginTop: 8, fontFamily: 'monospace' }}
                />
              </Col>
            </Row>
            <Row justify="end" style={{ marginTop: 16 }}>
              <Space>
                <Button
                  onClick={handleClear}
                  disabled={loading}
                  icon={<ClearOutlined />}
                >
                  清空
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleSearch()}
                  loading={loading}
                  icon={<SearchOutlined />}
                >
                  查询
                </Button>
              </Space>
            </Row>
          </Card>

          {/* 结果统计 */}
          {hasSearched && (
            <Card style={{ marginBottom: 16 }}>
              <Space size="large">
                <Tag color="blue">总计: {results.length}</Tag>
                <Tag color="green">已找到: {results.filter(r => r.found).length}</Tag>
                <Tag color="red">未找到: {results.filter(r => !r.found).length}</Tag>
                {results.filter(r => r.found).length > 0 && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyFound}
                  >
                    复制已找到
                  </Button>
                )}
                {results.filter(r => !r.found).length > 0 && (
                  <Button
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyNotFound}
                  >
                    复制未找到
                  </Button>
                )}
                {results.length > 0 && (
                  <Button
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                  >
                    下载结果
                  </Button>
                )}
              </Space>
            </Card>
          )}

          {/* 结果表格 */}
          <Card>
            <Table
              size="middle"
              rowKey="key"
              dataSource={results}
              loading={loading}
              columns={columns}
              pagination={{
                defaultPageSize: 50,
                pageSizeOptions: [20, 50, 100, 200],
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => `共 ${total} 条记录`,
              }}
              scroll={{ x: 1200 }}
            />
          </Card>
        </div>
      </PageWrap>
    </Suspense>
  );
}
