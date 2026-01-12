import { SPU, SkuID, SPUCate, SKU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { paramsDetail } from '@zsqk/z1-sdk/es/z1p/params-value';
import {
  appendSKUInfo,
  getSPUInfo,
  editSPUwithSKUs,
} from '@zsqk/z1-sdk/es/z1p/product';
import { genSKUNameWithoutKey, SKUDetails } from '@zsqk/z1-sdk/es/z1p/sku';
import {
  Alert,
  Button,
  Col,
  Drawer,
  Form,
  Input,
  Row,
  Select,
  Table,
  Tooltip,
  message,
} from 'antd';
import { EditOutlined, BarcodeOutlined, PlusOutlined } from '@ant-design/icons';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';

import {
  useSPUCateIDContext,
  useSPUCateListContext,
  useSpuIDContext,
} from '../datahooks/product';
import { lessAwait, postAwait } from '../error';
import { RenderSKU } from './render/RenderSKU';
import { SKUAdd } from './SKUAdd';
import { withSNspuCateIDs } from '../constant/data';
import { useTokenContext } from '../datahooks/auth';

type ErrorMsg = string;

export function validateGTIN(gtin: string): true | ErrorMsg {
  // 检查 GTIN 的长度
  const length = gtin.length;
  if (length !== 8 && length !== 12 && length !== 13 && length !== 14) {
    return '长度不正确';
  }

  let sum = 0;
  for (let i = 0; i < gtin.length; i++) {
    let num = parseInt(gtin[i]);
    if (isNaN(num)) {
      return '不是纯数字';
    }
    // 注意：字符串的索引是从左到右，所以我们需要反转奇偶性
    sum += ((gtin.length - i) % 2 === 0 ? 3 : 1) * num;
  }
  return sum % 10 === 0 ? true : '校验码不正确';
}

const { Option } = Select;

/**
 * 从 SKU 列表中提取实际使用的颜色、配置、版本
 * 仅保留已被使用的值
 */
function extractUsedValues(skuIDs: any[]) {
  const colors = new Set<string>();
  const specs = new Set<string>();
  const combos = new Set<string>();

  for (const sku of skuIDs) {
    if ('color' in sku && sku.color) {
      colors.add(sku.color);
    }
    if ('spec' in sku && sku.spec) {
      specs.add(sku.spec);
    }
    if ('combo' in sku && sku.combo) {
      combos.add(sku.combo);
    }
  }

  return {
    colors: Array.from(colors).map((name, id) => ({ id, name })),
    specs: Array.from(specs).map((name, id) => ({ id, name })),
    combos: Array.from(combos).map((name, id) => ({ id, name })),
  };
}

/**
 * [组件] 管理 SKU
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SKUManager(props: { 
  offsetTop?: number;
  onWantEditSKU?: (skuID: SkuID) => void;
}) {
  const { onWantEditSKU } = props;
  const { spuID } = useSpuIDContext();
  const [spu, setSPU] = useState<SPU>();

  const [selectedCombos, setSelectedCombos] = useState<string[]>([]);
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);

  // 从实际使用的 SKU 中提取颜色、配置、版本
  const [colors, setColors] = useState<{ id: number; name: string }[]>([]);
  const [specs, setSpecs] = useState<{ id: number; name: string }[]>([]);
  const [combos, setCombos] = useState<{ id: number; name: string }[]>([]);

  // 表格中实际使用的值
  const [usedColors, setUsedColors] = useState<Set<string>>(new Set());
  const [usedSpecs, setUsedSpecs] = useState<Set<string>>(new Set());
  const [usedCombos, setUsedCombos] = useState<Set<string>>(new Set());

  // 用于过滤 SKU 列表的选中规格
  const [filterCombo, setFilterCombo] = useState<string | null>(null);
  const [filterSpec, setFilterSpec] = useState<string | null>(null);
  const [filterColor, setFilterColor] = useState<string | null>(null);
  
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  const [newComboValue, setNewComboValue] = useState('');
  const [isAddingSpec, setIsAddingSpec] = useState(false);
  const [newSpecValue, setNewSpecValue] = useState('');
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [newColorValue, setNewColorValue] = useState('');

  // 以下数据目的是不允许用户直接删除之前的规格,
  //   但允许用户删除自己刚创建的非正式规格.
  // TODO: 目前是有局限的, 主要因为如果 SKU 新增了, 但是 SKU 新增时没有修改
  //   preCombos 等数据, 如果用户没有什么操作触发 spuID 变化, 那么此时选择移除
  //   相关 combo, 虽然已经是正式规格了, 但是因为不存在于 preCombos 中,
  //   所以仍会允许用户删除. 这个优化涉及到多组件间状态共享,
  //   因为用户刚正式新增的 SKU 一般不会移除, 所以不将此作为常见场景处理.
  const [preCombos, setPreCombos] = useState<string[]>([]);
  const [preSpecs, setPreSpecs] = useState<string[]>([]);
  const [preColors, setPreColors] = useState<string[]>([]);

  // 当创建新的 SKU 时, 需要给出配置
  const [selected, setSelected] = useState<SKUDetails>();

  const [hasSetParams, setHasSetParams] = useState<boolean>(false);

  useEffect(() => {
    if (!spuID) {
      return;
    }
    lessAwait(async () => {
      const spu = await getSPUInfo(spuID);

      // 从实际使用的 SKU 中提取颜色、配置、版本
      const { colors: usedColors, specs: usedSpecs, combos: usedCombos } = extractUsedValues(spu.skuIDs);
      setColors(usedColors);
      setSpecs(usedSpecs);
      setCombos(usedCombos);

      // 根据 SPU 数据获取所有已被选择的规格, 并填入已选择数据
      const color = new Set<string>();
      const spec = new Set<string>();
      const combo = new Set<string>();
      for (const sku of spu.skuIDs) {
        if ('color' in sku) {
          color.add(sku.color);
        }
        if ('spec' in sku) {
          spec.add(sku.spec);
        }
        if ('combo' in sku) {
          combo.add(sku.combo);
        }
      }
      setSelectedColors([...color]);
      setSelectedSpecs([...spec]);
      setSelectedCombos([...combo]);

      setPreColors([...color]);
      setPreSpecs([...spec]);
      setPreCombos([...combo]);

      setSPU(spu);
    })();
  }, [spuID]);

  useEffect(() => {
    const fn = async () => {
      if (!spuID) {
        return;
      }
      const res = await paramsDetail({ spu: spuID });
      setHasSetParams(Boolean(res.length));
    };
    fn();
  }, [spuID]);

  // 监听窗口焦点事件，当参数配置页面关闭时重新检查参数
  useEffect(() => {
    const handleFocus = async () => {
      if (!spuID) {
        return;
      }
      const res = await paramsDetail({ spu: spuID });
      setHasSetParams(Boolean(res.length));
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [spuID]);

  // 使用 useCallback 稳定回调函数的引用，避免无限循环
  const handleUsedValuesChange = useCallback((used: { colors: Set<string>; specs: Set<string>; combos: Set<string> }) => {
    setUsedColors(used.colors);
    setUsedSpecs(used.specs);
    setUsedCombos(used.combos);
  }, []);

  const handleWantAddSKU = useCallback((skuInfo: SKUDetails) => {
    setSelected(skuInfo);
  }, []);

  const handleWantEditSKU = useCallback((skuID: SkuID) => {
    if (onWantEditSKU) {
      onWantEditSKU(skuID);
    }
  }, [onWantEditSKU]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!spuID) {
    return <>未选择 SPU</>;
  }

  if (!spu) {
    return <>暂无 SPU 数据</>;
  }

  // 如果 SPU 下已经有 SKU, 则根据这些 SKU 的规律显示 版本, 配置, 颜色.
  let canSetColor = true;
  let canSetSpec = true;
  let canSetCombo = true;
  if (spu.skuIDs.length !== 0) {
    if (!('color' in spu.skuIDs[0])) {
      canSetColor = false;
    }
    if (!('spec' in spu.skuIDs[0])) {
      canSetSpec = false;
    }
    if (!('combo' in spu.skuIDs[0])) {
      canSetCombo = false;
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Fixed SPU ID Header - Does not scroll */}
      <div style={{ marginBottom: '8px', fontSize: '12px', color: '#666', flexShrink: 0, padding: '8px 0' }}>
        SPU ID: {spuID}, 名称: {spu.name}
      </div>

      {/* Scrollable Container - Contains selectors, form, table, and action buttons */}
      <div style={{ flex: 1, minHeight: 0 }} className="sku-form-scroll">
        <style jsx>{`
          .sku-form-scroll {
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .sku-table-wrapper {
            flex: 1;
            display: flex;
            flex-direction: column;
            padding-bottom: 80px;
          }
          .sku-table-container {
            flex: 1;
            min-height: 0;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            scrollbar-width: auto;
            scrollbar-color: #999 #f1f1f1;
            padding-bottom: 120px;
          }
          .sku-table-container::-webkit-scrollbar {
            width: 8px;
          }
          .sku-table-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
          }
          .sku-table-container::-webkit-scrollbar-thumb {
            background: #999;
            border-radius: 4px;
          }
          .sku-table-container::-webkit-scrollbar-thumb:hover {
            background: #666;
          }
          .sku-form-content {
            flex: 1;
            display: flex;
            flex-direction: column;
          }
          .sku-form-selectors {
            flex-shrink: 0;
          }
          .sku-action-buttons {
            flex-shrink: 0;
            padding: 16px;
            border-top: 1px solid #f0f0f0;
            background-color: #fff;
            display: flex;
            gap: 8px;
            justify-content: space-between;
          }
        `}</style>
        <Form layout="vertical" className="sku-table-wrapper">
          <div className="sku-form-content">
            {/* Selectors Section - Does not scroll independently */}
            <div className="sku-form-selectors">
              <>
                <Form.Item label="版本" tooltip="可能有的多种版本" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {combos.map(v => {
                  const count = spu.skuIDs.filter(sku => (sku as any).combo === v.name).length;
                  const isUsed = count > 0;
                  return (
                    <div
                      key={`combo-${v.id}`}
                      onClick={() => {
                        // 改为过滤逻辑：点击切换过滤状态
                        if (filterCombo === v.name) {
                          setFilterCombo(null);
                        } else {
                          setFilterCombo(v.name);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: filterCombo === v.name ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        backgroundColor: filterCombo === v.name ? '#e6f7ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.3s',
                        position: 'relative',
                      }}
                    >
                      {v.name}
                      {isUsed && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ff4d4f',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
                {selectedCombos.filter(c => !combos.map(v => v.name).includes(c)).map(customCombo => (
                  <div
                    key={`custom-combo-${customCombo}`}
                    onClick={() => {
                      setSelectedCombos(selectedCombos.filter(item => item !== customCombo));
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '2px solid #1890ff',
                      backgroundColor: '#e6f7ff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                    }}
                  >
                    {customCombo}
                  </div>
                ))}
                {isAddingCombo ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Input
                      placeholder="输入新版本"
                      value={newComboValue}
                      onChange={(e) => setNewComboValue(e.target.value)}
                      style={{ width: '100px', height: '32px' }}
                      autoFocus
                      onPressEnter={() => {
                        const value = newComboValue.trim();
                        if (value && !selectedCombos.includes(value)) {
                          setSelectedCombos([...selectedCombos, value]);
                          setNewComboValue('');
                          setIsAddingCombo(false);
                        } else if (value && selectedCombos.includes(value)) {
                          message.warning('该版本已存在');
                        }
                      }}
                    />
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        const value = newComboValue.trim();
                        if (value && !selectedCombos.includes(value)) {
                          setSelectedCombos([...selectedCombos, value]);
                          setNewComboValue('');
                          setIsAddingCombo(false);
                        } else if (value && selectedCombos.includes(value)) {
                          message.warning('该版本已存在');
                        }
                      }}
                    >
                      确认
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsAddingCombo(false);
                        setNewComboValue('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
                    onClick={() => {
                      setIsAddingCombo(true);
                      // 如果还没有版本，新增时启用版本列
                      if (!canSetCombo) {
                        // 这里会通过 selectedCombos 的变化触发表格更新
                      }
                    }}
                  >
                    + 新增
                  </Button>
                )}
              </div>
            </Form.Item>
            <Form.Item label="配置" tooltip="可能有的多种配置" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {specs.map(v => {
                  const count = spu.skuIDs.filter(sku => (sku as any).spec === v.name).length;
                  const isUsed = count > 0;
                  return (
                    <div
                      key={`spec-${v.id}`}
                      onClick={() => {
                        // 改为过滤逻辑：点击切换过滤状态
                        if (filterSpec === v.name) {
                          setFilterSpec(null);
                        } else {
                          setFilterSpec(v.name);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: filterSpec === v.name ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        backgroundColor: filterSpec === v.name ? '#e6f7ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.3s',
                        position: 'relative',
                      }}
                    >
                      {v.name}
                      {isUsed && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ff4d4f',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
                {selectedSpecs.filter(c => !specs.map(v => v.name).includes(c)).map(customSpec => (
                  <div
                    key={`custom-spec-${customSpec}`}
                    onClick={() => {
                      setSelectedSpecs(selectedSpecs.filter(item => item !== customSpec));
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '2px solid #1890ff',
                      backgroundColor: '#e6f7ff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                    }}
                  >
                    {customSpec}
                  </div>
                ))}
                {isAddingSpec ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Input
                      placeholder="输入新配置"
                      value={newSpecValue}
                      onChange={(e) => setNewSpecValue(e.target.value)}
                      style={{ width: '100px', height: '32px' }}
                      autoFocus
                      onPressEnter={() => {
                        const value = newSpecValue.trim();
                        if (value && !selectedSpecs.includes(value)) {
                          setSelectedSpecs([...selectedSpecs, value]);
                          setNewSpecValue('');
                          setIsAddingSpec(false);
                        } else if (value && selectedSpecs.includes(value)) {
                          message.warning('该配置已存在');
                        }
                      }}
                    />
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        const value = newSpecValue.trim();
                        if (value && !selectedSpecs.includes(value)) {
                          setSelectedSpecs([...selectedSpecs, value]);
                          setNewSpecValue('');
                          setIsAddingSpec(false);
                        } else if (value && selectedSpecs.includes(value)) {
                          message.warning('该配置已存在');
                        }
                      }}
                    >
                      确认
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsAddingSpec(false);
                        setNewSpecValue('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
                    onClick={() => {
                      setIsAddingSpec(true);
                      // 如果还没有配置，新增时启用配置列
                      if (!canSetSpec) {
                        // 这里会通过 selectedSpecs 的变化触发表格更新
                      }
                    }}
                  >
                    + 新增
                  </Button>
                )}
              </div>
            </Form.Item>
            <Form.Item label="颜色" tooltip="可能有的多种颜色" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {colors.map(v => {
                  const count = spu.skuIDs.filter(sku => (sku as any).color === v.name).length;
                  const isUsed = count > 0;
                  return (
                    <div
                      key={`color-${v.id}`}
                      onClick={() => {
                        // 改为过滤逻辑：点击切换过滤状态
                        if (filterColor === v.name) {
                          setFilterColor(null);
                        } else {
                          setFilterColor(v.name);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '4px',
                        border: filterColor === v.name ? '2px solid #1890ff' : '1px solid #d9d9d9',
                        backgroundColor: filterColor === v.name ? '#e6f7ff' : '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.3s',
                        position: 'relative',
                      }}
                    >
                      {v.name}
                      {isUsed && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            backgroundColor: '#ff4d4f',
                            color: '#fff',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
                {selectedColors.filter(c => !colors.map(v => v.name).includes(c)).map(customColor => (
                  <div
                    key={`custom-color-${customColor}`}
                    onClick={() => {
                      setSelectedColors(selectedColors.filter(item => item !== customColor));
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '4px',
                      border: '2px solid #1890ff',
                      backgroundColor: '#e6f7ff',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.3s',
                    }}
                  >
                    {customColor}
                  </div>
                ))}
                {isAddingColor ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Input
                      placeholder="输入新颜色"
                      value={newColorValue}
                      onChange={(e) => setNewColorValue(e.target.value)}
                      style={{ width: '100px', height: '32px' }}
                      autoFocus
                      onPressEnter={() => {
                        const value = newColorValue.trim();
                        if (value && !selectedColors.includes(value)) {
                          setSelectedColors([...selectedColors, value]);
                          setNewColorValue('');
                          setIsAddingColor(false);
                        } else if (value && selectedColors.includes(value)) {
                          message.warning('该颜色已存在');
                        }
                      }}
                    />
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => {
                        const value = newColorValue.trim();
                        if (value && !selectedColors.includes(value)) {
                          setSelectedColors([...selectedColors, value]);
                          setNewColorValue('');
                          setIsAddingColor(false);
                        } else if (value && selectedColors.includes(value)) {
                          message.warning('该颜色已存在');
                        }
                      }}
                    >
                      确认
                    </Button>
                    <Button
                      size="small"
                      onClick={() => {
                        setIsAddingColor(false);
                        setNewColorValue('');
                      }}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="small"
                    onClick={() => {
                      setIsAddingColor(true);
                      // 如果还没有颜色，新增时启用颜色列
                      if (!canSetColor) {
                        // 这里会通过 selectedColors 的变化触发表格更新
                      }
                    }}
                  >
                    + 新增
                  </Button>
                )}
              </div>
            </Form.Item>

            <Form.Item label="参数" tooltip="SPU/SKU参数设置">
              {hasSetParams ? (
                <span>已设置</span>
              ) : (
                <span style={{ color: 'red' }}>未设置</span>
              )}
              <Button
                size="small"
                style={{ marginLeft: '10px' }}
                onClick={() => {
                  window.open(
                    `/spu-sku-param-config?spuID=${spuID}&name=${spu.name}`
                  );
                }}
              >
                设置参数
              </Button>
            </Form.Item>
              </>
            </div>

            {/* Table Container - Scrolls with content */}
            <div className="sku-table-container">
              <EditRelationshipSPUwithSKUs
                  allSKUs={spu.skuIDs}
                  colors={colors}
                  specs={specs}
                  combos={combos}
                  selectedColors={selectedColors}
                  selectedSpecs={selectedSpecs}
                  selectedCombos={selectedCombos}
                  spu={spu}
                  onWantAddSKU={handleWantAddSKU}
                  onUsedValuesChange={handleUsedValuesChange}
                  onWantEditSKU={handleWantEditSKU}
                  filterCombo={filterCombo}
                  filterSpec={filterSpec}
                  filterColor={filterColor}
                canSetCombo={canSetCombo}
                canSetSpec={canSetSpec}
                canSetColor={canSetColor}
                onChange={v => {
                  const fn = async () => {
                    // 更新后端数据
                    await editSPUwithSKUs(spu.id, v, { auth: token });

                    // 从实际使用的 SKU 中提取颜色、配置、版本
                    const { colors: usedColors, specs: usedSpecs, combos: usedCombos } = extractUsedValues(v);
                    setColors(usedColors);
                    setSpecs(usedSpecs);
                    setCombos(usedCombos);

                    // 根据 SPU 数据获取所有已被选择的规格, 并填入已选择数据
                    const color = new Set<string>();
                    const spec = new Set<string>();
                    const combo = new Set<string>();
                    for (const sku of v) {
                      if ('color' in sku) {
                        color.add(sku.color);
                      }
                      if ('spec' in sku) {
                        spec.add(sku.spec);
                      }
                      if ('combo' in sku) {
                        combo.add(sku.combo);
                      }
                    }
                    setSelectedColors([...color]);
                    setSelectedSpecs([...spec]);
                    setSelectedCombos([...combo]);

                    // 前端更新 SPU 属性
                    setSPU(
                      update(spu, {
                        skuIDs: { $set: v },
                      })
                    );
                  };

                  postAwait(fn)();
                }}
              />
            </div>
          </div>
        </Form>
      </div>

      <Drawer
        title={`生成 SKU: ${selected ? genSKUName(selected) : ''}`}
        placement="right"
        onClose={() => setSelected(undefined)}
        open={!!selected}
        width={600}
      >
        {selected ? (
          <SKUAdd
            spu={{ spuID, name: spu.name }}
            selected={selected}
            onComplete={skuID => {
              // 更新 SPU 的 SKU 关联数据
              setSPU(
                update(spu, {
                  // 这里受到 update 和 TS 的影响, 无法判断出有效类型
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  skuIDs: { $push: [{ skuID, ...selected }] as any },
                })
              );
              setSelected(undefined);
            }}
          />
        ) : null}
      </Drawer>
    </div>
  );
}

/**
 * [组件] 编辑 SPU 与其下所有 SKUs 的关系
 * @author Lian Zheren <lzr@go0356.com>
 */
function EditRelationshipSPUwithSKUs(props: {
  allSKUs: { skuID: number; color?: string; spec?: string; combo?: string }[];
  onChange: (v: SPU['skuIDs']) => void | Promise<void>;
  colors?: { id: number; name: string }[];
  specs?: { id: number; name: string }[];
  combos?: { id: number; name: string }[];
  selectedColors?: string[];
  selectedSpecs?: string[];
  selectedCombos?: string[];
  onUsedValuesChange?: (used: { colors: Set<string>; specs: Set<string>; combos: Set<string> }) => void;
  onWantEditSKU?: (skuID: SkuID) => void;
  spu?: SPU;
  onWantAddSKU?: (skuInfo: SKUDetails) => void;
  filterCombo?: string | null;
  filterSpec?: string | null;
  filterColor?: string | null;
  canSetCombo?: boolean;
  canSetSpec?: boolean;
  canSetColor?: boolean;
}) {
  const { allSKUs, onChange, colors = [], specs = [], combos = [], selectedColors = [], selectedSpecs = [], selectedCombos = [], onUsedValuesChange, spu, onWantAddSKU, filterCombo, filterSpec, filterColor, canSetCombo = true, canSetSpec = true, canSetColor = true } = props;
  const [inputSKUs, setInputSKUs] = useState(allSKUs);
  const [newRowData, setNewRowData] = useState<{ combo?: string; spec?: string; color?: string } | null>(null);

  // 合并已有的值和新增的值
  const allCombos = useMemo(() => {
    const comboSet = new Set(combos.map(c => c.name));
    selectedCombos.forEach(c => comboSet.add(c));
    return Array.from(comboSet).map((name, id) => ({ id, name }));
  }, [combos, selectedCombos]);

  const allSpecs = useMemo(() => {
    const specSet = new Set(specs.map(s => s.name));
    selectedSpecs.forEach(s => specSet.add(s));
    return Array.from(specSet).map((name, id) => ({ id, name }));
  }, [specs, selectedSpecs]);

  const allColors = useMemo(() => {
    const colorSet = new Set(colors.map(c => c.name));
    selectedColors.forEach(c => colorSet.add(c));
    return Array.from(colorSet).map((name, id) => ({ id, name }));
  }, [colors, selectedColors]);

  // 计算过滤后的 SKU 列表
  const filteredSKUs = useMemo(() => {
    return inputSKUs.filter(sku => {
      // 如果有过滤条件，则检查 SKU 是否匹配
      if (filterCombo && sku.combo !== filterCombo) {
        return false;
      }
      if (filterSpec && sku.spec !== filterSpec) {
        return false;
      }
      if (filterColor && sku.color !== filterColor) {
        return false;
      }
      return true;
    });
  }, [inputSKUs, filterCombo, filterSpec, filterColor]);

  // 每次上层数据发生变动, 都要重新修改 input 数据.
  useEffect(() => {
    setInputSKUs(allSKUs);
  }, [allSKUs]);

  // 监听表格数据变化，计算实际使用的值
  useEffect(() => {
    if (onUsedValuesChange) {
      const usedColors = new Set<string>();
      const usedSpecs = new Set<string>();
      const usedCombos = new Set<string>();

      for (const sku of inputSKUs) {
        if (sku.color) usedColors.add(sku.color);
        if (sku.spec) usedSpecs.add(sku.spec);
        if (sku.combo) usedCombos.add(sku.combo);
      }

      onUsedValuesChange({ colors: usedColors, specs: usedSpecs, combos: usedCombos });
    }
  }, [inputSKUs, onUsedValuesChange]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Table
        rowKey="skuID"
        columns={[
          { title: 'ID', dataIndex: 'skuID' },
          ...(canSetCombo || selectedCombos.length > 0 ? [{
            title: '版本',
            dataIndex: 'combo',
            render: (combo: any, item: any) => {
              return (
                <Select
                  value={combo || undefined}
                  placeholder="选择版本"
                  allowClear
                  onChange={value => {
                    if (item.skuID === -1) {
                      setNewRowData({ ...newRowData, combo: value });
                    } else {
                      const i = inputSKUs.findIndex(v => v.skuID === item.skuID);
                      setInputSKUs(
                        update(inputSKUs, {
                          [i]: { combo: { $set: value } },
                        })
                      );
                    }
                  }}
                >
                  {allCombos.map(v => (
                    <Select.Option key={v.name} value={v.name}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              );
            },
          }] : []),
          ...(canSetSpec || selectedSpecs.length > 0 ? [{
            title: '配置',
            dataIndex: 'spec',
            render: (spec: any, item: any) => {
              return (
                <Select
                  value={spec || undefined}
                  placeholder="选择配置"
                  allowClear
                  onChange={value => {
                    if (item.skuID === -1) {
                      setNewRowData({ ...newRowData, spec: value });
                    } else {
                      const i = inputSKUs.findIndex(v => v.skuID === item.skuID);
                      setInputSKUs(
                        update(inputSKUs, {
                          [i]: { spec: { $set: value } },
                        })
                      );
                    }
                  }}
                >
                  {allSpecs.map(v => (
                    <Select.Option key={v.name} value={v.name}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              );
            },
          }] : []),
          ...(canSetColor || selectedColors.length > 0 ? [{
            title: '颜色',
            dataIndex: 'color',
            render: (color: any, item: any) => {
              return (
                <Select
                  value={color || undefined}
                  placeholder="选择颜色"
                  allowClear
                  onChange={value => {
                    if (item.skuID === -1) {
                      setNewRowData({ ...newRowData, color: value });
                    } else {
                      const i = inputSKUs.findIndex(v => v.skuID === item.skuID);
                      setInputSKUs(
                        update(inputSKUs, {
                          [i]: { color: { $set: value } },
                        })
                      );
                    }
                  }}
                >
                  {allColors.map(v => (
                    <Select.Option key={v.name} value={v.name}>
                      {v.name}
                    </Select.Option>
                  ))}
                </Select>
              );
            },
          }] : []),
          {
            title: '69码',
            dataIndex: 'skuID',
            render: (skuID: any, item: any) => {
              if (item.skuID === -1) {
                return <>-</>;
              }
              return (
                <Tooltip
                  title={<RenderSKU id={skuID} propertyName="gtins" />}
                  placement="top"
                >
                  <BarcodeOutlined style={{ cursor: 'pointer', fontSize: '16px', color: '#1890ff' }} />
                </Tooltip>
              );
            },
          },
          {
            title: '操作',
            render: (_: any, item: any) => {
              if (item.skuID === -1) {
                return (
                  <Tooltip title="创建">
                    <PlusOutlined
                      style={{ cursor: 'pointer', fontSize: '16px', color: '#1890ff' }}
                      onClick={() => {
                        if (newRowData && onWantAddSKU) {
                          onWantAddSKU(newRowData as SKUDetails);
                        }
                      }}
                    />
                  </Tooltip>
                );
              }
              return (
                <Tooltip title="编辑">
                  <EditOutlined
                    style={{ cursor: 'pointer', fontSize: '16px', color: '#1890ff' }}
                    onClick={() => {
                      props.onWantEditSKU?.(item.skuID);
                    }}
                  />
                </Tooltip>
              );
            },
          },
        ]}
        dataSource={newRowData ? [...filteredSKUs, { skuID: -1, ...newRowData }] : filteredSKUs}
        size="small"
        pagination={false}
        title={() => `SKU 列表`}
        footer={undefined}
      />
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #f0f0f0', backgroundColor: '#fff', flexShrink: 0 }}>
        <Button
          onClick={() => {
            setNewRowData({ combo: undefined, spec: undefined, color: undefined });
          }}
          disabled={newRowData !== null}
        >
          + 新增
        </Button>
        <Button
          type="primary"
          onClick={() => {
            try {
              const newData = inputSKUs.map(v => {
                const res: (typeof allSKUs)[0] = { skuID: v.skuID };
                if (v.color) res.color = v.color;
                if (v.spec) res.spec = v.spec;
                if (v.combo) res.combo = v.combo;
                return res;
              });
              onChange(newData as SPU['skuIDs']);
            } catch (err) {
              console.error(err);
            }
          }}
        >
          确认修改
        </Button>
      </div>
    </div>
  );
}

/**
 * @todo 放在合适的位置
 * @author Lian Zheren <lzr@go0356.com>
 */
export function getAllPids(list: Pick<SPUCate, 'id' | 'pid'>[], id: number) {
  let arr: number[] = [id];
  while (true) {
    const it = list.find(v => v.id === arr[0]);
    if (it) {
      arr = [it.pid, ...arr];
    } else {
      break;
    }
  }
  return arr;
}

/**
 * 为 SKU 生成名称
 * 生成的是预估名称, 顺序由亦凡确认.
 * @author Lian Zheren <lzr@go0356.com>
 */
function genSKUName(v: SKUDetails): string {
  let str: string[] = [];
  if ('combo' in v) {
    str.push(`版本: ${v.combo}`);
  }
  if ('spec' in v) {
    str.push(`配置: ${v.spec}`);
  }
  if ('color' in v) {
    str.push(`颜色: ${v.color}`);
  }
  return str.join(', ');
}
