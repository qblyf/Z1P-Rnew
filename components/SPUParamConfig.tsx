'use client';

import { EditOutlined } from '@ant-design/icons';
import {
  batchAddParamsValue,
  batchEditParamsValue,
  paramsDetail,
} from '@zsqk/z1-sdk/es/z1p/params-value';
import { paramsDefinitionDetail } from '@zsqk/z1-sdk/es/z1p/params-definition';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import {
  Anchor,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import { useEffect, useCallback, useMemo, useState } from 'react';

import { useTokenContext } from '../datahooks/auth';
import { useParamFilter } from '../datahooks/useParamFilter';

type Definition = Awaited<ReturnType<typeof paramsDefinitionDetail>>[0];
type DefinitionExt = Omit<Definition, 'options'> & {
  options: {
    isCustom: boolean;
    option: string | null;
  }[];
};
type Value = Awaited<ReturnType<typeof paramsDetail>>[0];
type NewValue = Parameters<typeof batchAddParamsValue>[0]['list'][0];
type Group = {
  groupDescription: string | null;
  groupID: number;
  groupName: string;
  groupWeight: number;
};

interface SPUParamConfigProps {
  spuID: number;
  skuID?: number;
}

/**
 * [组件] SPU/SKU参数配置
 * 从 spu-sku-param-config 页面提取的组件版本
 */
export default function SPUParamConfig({ spuID, skuID }: SPUParamConfigProps) {
  const [definitionList, setDefinitionList] = useState<Definition[]>([]);
  const [definitionExtList, setDefinitionExtList] = useState<DefinitionExt[]>([]);
  const [editingCustomDefinitionID, setEditingCustomDefinitionID] = useState<number | null>(null);
  const [editingCustomValue, setEditingCustomValue] = useState<string | null>(null);
  const [pValueList, setPValueList] = useState<Value[]>([]);
  const [pValueListEditing, setPValueListEditing] = useState<Value[] | NewValue[]>([]);
  const [skuList, setSkuList] = useState<any[]>([]);
  const [skuParamValuesMap, setSkuParamValuesMap] = useState<Record<number, Value[]>>({});

  const { token } = useTokenContext();
  const { selectedFilters, toggleFilter, clearFilters, hasActiveFilters } = useParamFilter();

  useEffect(() => {
    if (!token || !spuID) return;
    const fn = async () => {
      try {
        const res = await paramsDefinitionDetail({ spu: spuID, sku: skuID }, { token });
        setDefinitionList(
          res.sort((defA, defB) => {
            if (defA.groupWeight !== defB.groupWeight) {
              return defA.groupWeight - defB.groupWeight;
            }
            return defA.definitionWeight - defB.definitionWeight;
          })
        );
      } catch (err) {
        message.error(`获取商品参数定义失败：${err instanceof Error ? err.message : ''}`);
      }
    };
    fn();
  }, [skuID, spuID, token]);

  const getPValueList = useCallback(() => {
    const fn = async () => {
      try {
        const res = await paramsDetail({ spu: spuID, sku: skuID });
        setPValueList(res);
        setPValueListEditing(res);
      } catch (err) {
        message.error(`获取商品参数值失败：${err instanceof Error ? err.message : ''}`);
      }
    };
    return fn();
  }, [skuID, spuID]);

  useEffect(() => {
    if (spuID) getPValueList();
  }, [getPValueList, skuID, spuID]);

  // 获取SKU列表
  useEffect(() => {
    if (!spuID || !token) return;
    const fn = async () => {
      try {
        const res = await getSKUListJoinSPU(
          { limit: 1000, offset: 0, orderBy: { key: 'p.id', sort: 'DESC' } },
          { sku: ['id', 'name', 'gtins', 'state'], spu: ['brand'] }
        );
        const filteredRes = res.filter((item: any) => item.spuID === spuID);
        setSkuList(filteredRes);

        const paramValuesMap: Record<number, Value[]> = {};
        for (const sku of filteredRes) {
          try {
            const skuParams = await paramsDetail({ spu: spuID, sku: sku.id });
            paramValuesMap[sku.id] = skuParams;
          } catch (err) {
            paramValuesMap[sku.id] = [];
          }
        }
        setSkuParamValuesMap(paramValuesMap);
      } catch (err) {
        console.error(`获取SKU列表失败：${err instanceof Error ? err.message : ''}`);
      }
    };
    fn();
  }, [spuID, token]);

  useEffect(() => {
    const extList: DefinitionExt[] = definitionList.map(def => {
      const pValue = pValueList.find(pv => pv.definitionID === def.definitionID);
      const isValueFromOptions = pValue && pValue.value && def.options.findIndex(opt => opt === pValue.value) >= 0;
      const customOptionValue: null | string = isValueFromOptions ? null : pValue?.value || null;
      const options: DefinitionExt['options'] = Array.from(new Set(def.options))
        .map(opt => ({ isCustom: false, option: opt } as DefinitionExt['options'][0]))
        .concat({ isCustom: true, option: customOptionValue } as DefinitionExt['options'][0]);
      return { ...def, options };
    });
    setDefinitionExtList(extList);
  }, [definitionList, pValueList]);

  const groups = useMemo(() => {
    const res: Group[] = [];
    definitionList.forEach(def => {
      if (!res.find(g => g.groupID === def.groupID)) {
        res.push({
          groupDescription: def.groupDescription,
          groupID: def.groupID,
          groupName: def.groupName,
          groupWeight: def.groupWeight,
        });
      }
    });
    return res;
  }, [definitionList]);

  const filteredSkuList = useMemo(() => {
    if (!hasActiveFilters) return skuList;
    return skuList.filter(sku => {
      const skuParams = skuParamValuesMap[sku.id] || [];
      return Object.entries(selectedFilters).every(([definitionID, selectedValue]) => {
        const paramValue = skuParams.find(pv => pv.definitionID === Number(definitionID));
        return paramValue?.value === selectedValue;
      });
    });
  }, [skuList, selectedFilters, hasActiveFilters, skuParamValuesMap]);

  // 更新参数值（用于选择参数选项时）
  const updateParamValue = useCallback((definitionID: number, value: string | null) => {
    setPValueListEditing(prev => {
      // 查找已有的值（可能是Value类型或NewValue类型）
      const existingIndex = prev.findIndex(pv => {
        if ('definitionID' in pv) {
          return pv.definitionID === definitionID;
        }
        if ('paramDefinition' in pv) {
          return pv.paramDefinition === definitionID;
        }
        return false;
      });
      
      if (existingIndex >= 0) {
        // 更新已有的值
        const updated = [...prev] as any[];
        updated[existingIndex] = { ...updated[existingIndex], value: value || '' };
        return updated;
      } else {
        // 新增值 - 使用paramDefinition字段
        const newValue = {
          spu: spuID,
          sku: skuID || null,
          paramDefinition: definitionID,
          value: value || '',
        };
        return [...prev, newValue] as any;
      }
    });
  }, [spuID, skuID]);

  const handleSave = async () => {
    if (!token) return;
    const newValues: NewValue[] = pValueListEditing.filter(pv => !('valueID' in pv) && pv.value) as NewValue[];
    const updatedValues: Value[] = pValueListEditing.filter(pv => {
      if (!('valueID' in pv)) return false;
      const originalValue = pValueList.find(opv => opv.valueID === pv.valueID);
      if (!originalValue) return false;
      return pv.value !== originalValue.value;
    }) as Value[];

    if (!newValues.length && !updatedValues.length) {
      message.warning('没有内容需要保存');
      return;
    }

    if (newValues.length) {
      try {
        await batchAddParamsValue({ list: newValues }, { token });
        message.success('批量新增商品参数值成功');
      } catch (err) {
        message.error(`批量新增商品参数值失败：${err instanceof Error ? err.message : ''}`);
      }
    }
    if (updatedValues.length) {
      try {
        await batchEditParamsValue({
          list: updatedValues.map(v => ({
            id: v.valueID,
            spu: v.spu,
            sku: v.sku,
            paramDefinition: v.definitionID,
            value: v.value,
          })),
        }, { token });
        message.success('批量修改商品参数值成功');
      } catch (err) {
        message.error(`批量修改商品参数值失败：${err instanceof Error ? err.message : ''}`);
      }
    }
    await getPValueList();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <Row>
          <Col span={4} style={{ borderRight: '2px solid #f3f3f3', paddingBottom: '20px' }}>
            <Anchor
              items={groups.map(g => ({
                key: `${g.groupName}-${g.groupID}`,
                href: `#param-${g.groupName}-${g.groupID}`,
                title: g.groupName,
              }))}
            />
          </Col>
          <Col span={20}>
            {groups.map(g => (
              <div
                id={`param-${g.groupName}-${g.groupID}`}
                key={`${g.groupName}-${g.groupID}`}
                style={{ padding: '0 24px 24px' }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#000' }}>{g.groupName}</div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '12px', marginTop: '6px' }}>
                  💡 点击参数值设置SPU参数，同时过滤下方SKU列表
                </div>
                {definitionExtList
                  .filter(def => def.groupName === g.groupName && def.groupID === g.groupID)
                  .map(def => {
                    const customOption = def.options.slice(-1)[0];
                    // 获取当前参数的编辑值
                    const currentValue = pValueListEditing.find(pv => {
                      if ('definitionID' in pv) return pv.definitionID === def.definitionID;
                      if ('paramDefinition' in pv) return (pv as any).paramDefinition === def.definitionID;
                      return false;
                    })?.value;
                    return (
                      <div key={def.definitionID} style={{ paddingLeft: '20px', display: 'flex', alignItems: 'top', margin: '16px 0' }}>
                        <div style={{ fontWeight: '400', fontSize: '14px', color: '#666', flexShrink: 0, width: '100px', textAlign: 'right', marginRight: '30px', lineHeight: '32px' }}>
                          <Tooltip placement="topLeft" title={def.definitionName}>{def.definitionName}</Tooltip>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                          {def.options.slice(0, -1).map(opt => {
                            const isSelected = currentValue === opt.option;
                            return (
                              <Radio
                                style={{ height: '32px', lineHeight: '32px' }}
                                key={opt.option}
                                checked={isSelected}
                                onClick={() => {
                                  if (opt.option) {
                                    updateParamValue(def.definitionID, opt.option);
                                    toggleFilter(def.definitionID, opt.option);
                                  }
                                }}
                              >
                                <Tooltip placement="topLeft" title={opt.option}>
                                  <span style={{ maxWidth: '100px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.option}</span>
                                </Tooltip>
                              </Radio>
                            );
                          })}
                          {customOption.option === null && (
                            <Button type="link" style={{ paddingLeft: 0 }} onClick={() => { setEditingCustomDefinitionID(def.definitionID); setEditingCustomValue(null); }}>
                              +自定义
                            </Button>
                          )}
                          {customOption.option !== null && (
                            <div style={{ position: 'relative' }}>
                              <Radio
                                style={{ height: '32px', lineHeight: '32px' }}
                                checked={currentValue === customOption.option}
                                onClick={() => {
                                  if (customOption.option) {
                                    updateParamValue(def.definitionID, customOption.option);
                                    toggleFilter(def.definitionID, customOption.option);
                                  }
                                }}
                              />
                              <span
                                style={{ border: '1px solid #91CAFF', color: '#1677FF', background: '#E6F4FF', padding: '2px 4px', cursor: 'pointer' }}
                                onClick={() => { setEditingCustomDefinitionID(def.definitionID); setEditingCustomValue(customOption.option); }}
                              >
                                {customOption.option}<EditOutlined />
                              </span>
                              <div style={{ color: 'red', position: 'absolute', left: 24, top: 24, width: 'max-content', fontSize: '12px' }}>*自定义内容仅勾选后生效</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}
          </Col>
        </Row>

        {/* SKU 列表 */}
        <div style={{ padding: '16px', background: '#fafafa', marginTop: '16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '12px' }}>
            SKU 列表 {hasActiveFilters && <span style={{ fontSize: '12px', color: '#666' }}>(已应用过滤条件)</span>}
          </div>
          {hasActiveFilters && (
            <div style={{ marginBottom: '12px' }}>
              {Object.entries(selectedFilters).map(([defID, value]) => {
                const def = definitionList.find(d => d.definitionID === Number(defID));
                return (
                  <Tag key={`${defID}-${value}`} closable onClose={() => toggleFilter(Number(defID), value)} style={{ marginBottom: '4px' }}>
                    {def?.definitionName}: {value}
                  </Tag>
                );
              })}
              <Button type="link" size="small" onClick={clearFilters}>清除所有过滤</Button>
            </div>
          )}
          <Table
            size="small"
            rowKey="id"
            dataSource={filteredSkuList}
            columns={[
              { dataIndex: 'name', title: 'SKU 名称', width: 200 },
              { dataIndex: 'gtins', title: 'GTINs', render: (v: string[]) => v?.join(', ') || '-' },
              { dataIndex: 'state', title: '状态', render: (v: string) => v === 'invalid' ? <Tag color="red">无效</Tag> : v === 'valid' ? <Tag color="green">有效</Tag> : '-' },
            ]}
            pagination={{ defaultPageSize: 10, pageSizeOptions: [10, 20, 50] }}
          />
        </div>
      </div>

      {/* 底部操作栏 */}
      <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button type="primary" onClick={handleSave}>保存</Button>
      </div>

      {/* 自定义参数值弹窗 */}
      <Modal
        title="自定义参数值"
        open={editingCustomDefinitionID !== null}
        onCancel={() => { setEditingCustomDefinitionID(null); setEditingCustomValue(null); }}
        onOk={() => {
          if (!editingCustomDefinitionID || !editingCustomValue) return;
          const indexDef = definitionExtList.findIndex(def => def.definitionID === editingCustomDefinitionID);
          if (indexDef < 0) return;
          // 更新definitionExtList中的自定义选项
          setDefinitionExtList([
            ...definitionExtList.slice(0, indexDef),
            { ...definitionExtList[indexDef], options: [...definitionExtList[indexDef].options.slice(0, -1), { isCustom: true, option: editingCustomValue }] },
            ...definitionExtList.slice(indexDef + 1),
          ]);
          // 同时更新pValueListEditing
          updateParamValue(editingCustomDefinitionID, editingCustomValue);
          setEditingCustomDefinitionID(null);
          setEditingCustomValue(null);
        }}
        okButtonProps={{ disabled: !editingCustomValue }}
      >
        {editingCustomDefinitionID !== null && (
          <Form labelCol={{ span: 6 }} wrapperCol={{ span: 16 }} autoComplete="off">
            <Form.Item label="参数名称:">
              <Input disabled value={definitionExtList.find(def => def.definitionID === editingCustomDefinitionID)?.definitionName} />
            </Form.Item>
            <Form.Item label="参数值:">
              <Input value={editingCustomValue ?? undefined} placeholder="请输入" onChange={ev => { const v = ev.target.value.trim(); if (v) setEditingCustomValue(v); }} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
