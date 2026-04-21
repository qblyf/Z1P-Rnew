'use client';

import { EditOutlined } from '@ant-design/icons';
import {
  batchAddParamsValue,
  batchEditParamsValue,
  paramsDetail,
} from '@zsqk/z1-sdk/es/z1p/params-value';
import { paramsDefinitionDetail } from '@zsqk/z1-sdk/es/z1p/params-definition';
import { getSKUListJoinSPU } from '@zsqk/z1-sdk/es/z1p/product';
import { GetSKUListOrderByKey } from '@zsqk/z1-sdk/es/z1p/product-types';
import { OrderBySort } from '@zsqk/z1-sdk/es/types/basetypes';
import { PageHeader } from '@ant-design/pro-components';
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
  notification,
} from 'antd';
import { useEffect, useCallback, useMemo, useState, Suspense } from 'react';

import Head from 'next/head';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';
import { useParamFilter } from '../../datahooks/useParamFilter';
import { useSearchParams } from 'next/navigation';

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

/**
 * [页面] SPU/SKU参数设置
 * @author zhaoxuxu <zhaoxuxujc@gmail.com>
 */
function Page() {
  const searchParams = useSearchParams();
  const spuID =
    searchParams?.get('spuID') !== null
      ? Number(searchParams?.get('spuID'))
      : undefined;
  const skuID =
    searchParams?.get('skuID') !== null
      ? Number(searchParams?.get('skuID'))
      : undefined;
  const name = searchParams?.get('name');

  const [definitionList, setDefinitionList] = useState<Definition[]>([]);
  const [definitionExtList, setDefinitionExtList] = useState<DefinitionExt[]>(
    []
  );
  const [editingCustomDefinitionID, setEditingCustomDefinitionID] = useState<
    number | null
  >(null);
  const [editingCustomValue, setEditingCustomValue] = useState<string | null>(
    null
  );
  const [pValueList, setPValueList] = useState<Value[]>([]);
  const [pValueListEditing, setPValueListEditing] = useState<
    Value[] | NewValue[]
  >([]);
  const [skuList, setSkuList] = useState<{ id: number; spuID: number; name: string; gtins?: string; state?: number }[]>([]);
  const [skuParamValuesMap, setSkuParamValuesMap] = useState<
    Record<number, Value[]>
  >({});

  const { token } = useTokenContext();
  const { selectedFilters, toggleFilter, clearFilters, hasActiveFilters } =
    useParamFilter();

  useEffect(() => {
    // 获取商品参数定义
    if (!token) {
      return;
    }
    const fn = async () => {
      try {
        const res = await paramsDefinitionDetail(
          { spu: spuID, sku: skuID },
          { token }
        );
        setDefinitionList(
          res.sort((defA, defB) => {
            if (defA.groupWeight !== defB.groupWeight) {
              return defA.groupWeight - defB.groupWeight;
            }
            return defA.definitionWeight - defB.definitionWeight;
          })
        );
      } catch (err) {
        const msg = `获取商品参数定义失败：${
          err instanceof Error ? err.message : ''
        }`;
        notification.error({ message: msg });
        console.error(msg);
      }
    };
    fn();
  }, [skuID, spuID, token]);

  const getPValueList = useCallback(() => {
    // 获取商品参数值
    const fn = async () => {
      try {
        const res = await paramsDetail({ spu: spuID, sku: skuID });
        setPValueList(res);
        setPValueListEditing(res);
      } catch (err) {
        const msg = `获取商品参数值失败：${
          err instanceof Error ? err.message : ''
        }`;
        notification.error({ message: msg });
        console.error(msg);
      }
    };
    return fn();
  }, [skuID, spuID]);

  useEffect(() => {
    getPValueList();
  }, [getPValueList, skuID, spuID]);

  // 获取SKU列表
  useEffect(() => {
    if (!spuID || !token) {
      return;
    }
    const fn = async () => {
      try {
        const res = await getSKUListJoinSPU(
          {
            limit: 1000,
            offset: 0,
            orderBy: [{ key: GetSKUListOrderByKey.skuID, sort: OrderBySort.降序 }],
          },
          { 
            sku: ['id', 'name', 'gtins', 'state'],
            spu: ['brand']
          }
        );
        // 过滤出属于当前SPU的SKU
        const filteredRes = (res as (typeof res[0] & { spuID: number })[]).filter((item) => item.spuID === spuID);
        setSkuList(filteredRes as any);

        // 为每个SKU获取其参数值
        const paramValuesMap: Record<number, Value[]> = {};
        for (const sku of filteredRes) {
          try {
            const skuParams = await paramsDetail({ spu: spuID, sku: sku.id });
            paramValuesMap[sku.id] = skuParams;
          } catch (err) {
            console.error(`获取SKU ${sku.id} 的参数值失败:`, err);
            paramValuesMap[sku.id] = [];
          }
        }
        setSkuParamValuesMap(paramValuesMap);
      } catch (err) {
        const msg = `获取SKU列表失败：${
          err instanceof Error ? err.message : ''
        }`;
        console.error(msg);
      }
    };
    fn();
  }, [spuID, token]);

  useEffect(() => {
    // 根据 definitionList 和 pValueList 整理出 definitionExtList
    const extList: DefinitionExt[] = definitionList.map(def => {
      const pValue = pValueList.find(
        pv => pv.definitionID === def.definitionID
      );
      const isValueFromOptions =
        pValue &&
        pValue.value &&
        def.options.findIndex(opt => opt === pValue.value) >= 0;
      const customOptionValue: null | string = isValueFromOptions
        ? null
        : pValue?.value || null;
      const options: DefinitionExt['options'] = Array.from(new Set(def.options))
        .map(opt => {
          return {
            isCustom: false,
            option: opt,
          } as DefinitionExt['options'][0];
        })
        .concat({
          isCustom: true,
          option: customOptionValue,
        } as DefinitionExt['options'][0]);
      return {
        ...def,
        options,
      };
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

  // 计算过滤后的SKU列表
  const filteredSkuList = useMemo(() => {
    if (!hasActiveFilters) {
      return skuList;
    }

    return skuList.filter(sku => {
      // 获取该SKU的参数值
      const skuParams = skuParamValuesMap[sku.id] || [];
      
      // 检查SKU是否包含所有选中的参数值
      return Object.entries(selectedFilters).every(
        ([definitionID, selectedValue]) => {
          const paramValue = skuParams.find(
            pv => pv.definitionID === Number(definitionID)
          );
          return paramValue?.value === selectedValue;
        }
      );
    });
  }, [skuList, selectedFilters, hasActiveFilters, skuParamValuesMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <PageWrap ppKey="product-manage">
        <Head>
          <title>{name}</title>
        </Head>
        <PageHeader title={name} subTitle="SPU/SKU参数设置"></PageHeader>
      </PageWrap>
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '0 20px',
          }}
        >
          <Row>
            <Col
              span={4}
              style={{ borderRight: '2px solid #f3f3f3', paddingBottom: '80px' }}
            >
              <Anchor
                items={groups.map(g => ({
                  key: `${g.groupName}-${g.groupID}`,
                  href: `#${g.groupName}-${g.groupID}`,
                  title: g.groupName,
                }))}
              />
            </Col>
            <Col span={20}>
              {groups.map(g => (
                <div
                  id={`${g.groupName}-${g.groupID}`}
                  key={`${g.groupName}-${g.groupID}`}
                  style={{
                    padding: '0 32px 32px',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      color: '#000000',
                    }}
                  >
                    {g.groupName}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999999',
                      marginBottom: '16px',
                      marginTop: '8px',
                    }}
                  >
                    💡 点击参数值可过滤下方 SKU 列表。如需修改参数值，请使用下方"修改 SPU 与 SKUs 的关系"功能。
                  </div>
                  {definitionExtList
                    .filter(
                      def =>
                        def.groupName === g.groupName && def.groupID === g.groupID
                    )
                    .map(def => {
                      const customOption = def.options.slice(-1)[0];
                      return (
                        <div
                          key={def.definitionID}
                          style={{
                            paddingLeft: '30px',
                            display: 'flex',
                            alignItems: 'top',
                            margin: '23px 0',
                          }}
                        >
                          <div
                            style={{
                              fontWeight: '400',
                              fontSize: '14px',
                              color: '#666666',
                              flexShrink: 0,
                              flexGrow: 0,
                              width: '100px',
                              textAlign: 'right',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginRight: '40px',
                              lineHeight: '32px',
                            }}
                          >
                            <Tooltip
                              placement="topLeft"
                              title={def.definitionName}
                            >
                              {def.definitionName}
                            </Tooltip>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              flexShrink: 1,
                              flexGrow: 1,
                              flexWrap: 'wrap',
                              alignItems: 'center',
                            }}
                          >
                            {def.options.slice(0, -1).map(opt => {
                              const isSelected = selectedFilters[def.definitionID] === opt.option;
                              return (
                                <Radio
                                  style={{ height: '32px', lineHeight: '32px' }}
                                  key={opt.option}
                                  checked={isSelected}
                                  onClick={() => {
                                    // 只更新过滤状态，不修改参数值
                                    if (opt.option) {
                                      toggleFilter(def.definitionID, opt.option);
                                    }
                                  }}
                                >
                                  <div
                                    style={{
                                      fontWeight: '400',
                                      fontSize: '14px',
                                      color: '#666666',
                                      flexShrink: 0,
                                      flexGrow: 0,
                                      maxWidth: '100px',
                                      textAlign: 'left',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    <Tooltip
                                      placement="topLeft"
                                      title={opt.option}
                                    >
                                      {opt.option}
                                    </Tooltip>
                                  </div>
                                </Radio>
                              );
                            })}
                            {customOption.option === null && (
                              <Button
                                type="link"
                                style={{ paddingLeft: 0 }}
                                onClick={() => {
                                  setEditingCustomDefinitionID(def.definitionID);
                                  setEditingCustomValue(null);
                                }}
                              >
                                +自定义
                              </Button>
                            )}
                            {customOption.option !== null && (
                              <div
                                style={{
                                  position: 'relative',
                                }}
                              >
                                <Radio
                                  style={{ height: '32px', lineHeight: '32px' }}
                                  checked={selectedFilters[def.definitionID] === customOption.option}
                                  onClick={() => {
                                    // 只更新过滤状态，不修改参数值
                                    if (customOption.option) {
                                      toggleFilter(
                                        def.definitionID,
                                        customOption.option
                                      );
                                    }
                                  }}
                                ></Radio>
                                <span
                                  style={{
                                    border: '1px solid #91CAFF',
                                    color: '#1677FF',
                                    background: '#E6F4FF',
                                    padding: '2px 4px',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() => {
                                    setEditingCustomDefinitionID(
                                      def.definitionID
                                    );
                                    setEditingCustomValue(customOption.option);
                                  }}
                                >
                                  {customOption.option}
                                  <EditOutlined />
                                </span>
                                <div
                                  style={{
                                    color: 'red',
                                    position: 'absolute',
                                    left: 24,
                                    top: 24,
                                    width: 'max-content',
                                  }}
                                >
                                  *自定义内容仅勾选后生效
                                </div>
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
        </div>

        {/* SKU 列表过滤和显示 */}
        <div
          style={{
            padding: '20px',
            background: '#fafafa',
            marginTop: '20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: '16px',
            marginBottom: '16px',
          }}
        >
          SKU 列表
          {hasActiveFilters && (
            <span style={{ marginLeft: '16px', fontSize: '14px' }}>
              (已应用过滤条件)
            </span>
          )}
        </div>

        {/* 过滤条件显示 */}
        {hasActiveFilters && (
          <div style={{ marginBottom: '16px' }}>
            {Object.entries(selectedFilters).map(([defID, value]) => {
              const def = definitionList.find(
                d => d.definitionID === Number(defID)
              );
              return (
                <Tag
                  key={`${defID}-${value}`}
                  closable
                  onClose={() => {
                    toggleFilter(Number(defID), value);
                  }}
                  style={{ marginBottom: '8px' }}
                >
                  {def?.definitionName}: {value}
                </Tag>
              );
            })}
            <Button
              type="link"
              size="small"
              onClick={clearFilters}
              style={{ marginLeft: '8px' }}
            >
              清除所有过滤
            </Button>
          </div>
        )}

        {/* SKU 列表表格 */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          <Table
            size="small"
            rowKey="id"
            dataSource={filteredSkuList}
            columns={[
              { dataIndex: 'name', title: 'SKU 名称', width: 200 },
              {
                dataIndex: 'gtins',
                title: 'GTINs',
                render: (v: string[]) => v?.join(', ') || '-',
              },
              {
                dataIndex: 'state',
                title: '状态',
                render: (v: string) => {
                  if (v === 'invalid') {
                    return <Tag color="red">无效</Tag>;
                  }
                  if (v === 'valid') {
                    return <Tag color="green">有效</Tag>;
                  }
                  return '-';
                },
              },
            ]}
            pagination={{
              defaultPageSize: 20,
              pageSizeOptions: [10, 20, 50],
            }}
            style={{ marginTop: '16px' }}
          />
        </div>
      </div>
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          width: '100vw',
          borderTop: '2px solid #f3f3f3',
          height: '60px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingRight: '60px',
          background: 'white',
          zIndex: 100,
        }}
      >
        <Button
          onClick={() => {
            window.close();
          }}
        >
          关闭
        </Button>
        <Button
          onClick={async () => {
            if (!token) {
              return;
            }
            const newValues: NewValue[] = pValueListEditing.filter(pv => {
              return !('valueID' in pv) && pv.value;
            }) as NewValue[];
            const updatedValues: Value[] = pValueListEditing.filter(pv => {
              if (!('valueID' in pv)) {
                // 新增值
                return false;
              }
              const originalValue = pValueList.find(
                opv => opv.valueID === pv.valueID
              );
              if (!originalValue) {
                throw new Error('impossible here, 没有找到对应的原值');
              }
              if (pv.value === originalValue.value) {
                // 值没有改变
                return false;
              }
              return true;
            }) as Value[];
            if (newValues.length && updatedValues.length) {
              notification.warning({ message: '没有内容需要保存' });
            }

            if (newValues.length) {
              try {
                await batchAddParamsValue({ list: newValues }, { token });
                notification.success({ message: '批量新增商品参数值成功' });
              } catch (err) {
                const msg = `批量新增商品参数值失败：${
                  err instanceof Error ? err.message : ''
                }`;
                notification.error({ message: msg });
                console.error(msg);
              }
            }
            if (updatedValues.length) {
              try {
                await batchEditParamsValue(
                  {
                    list: updatedValues.map(v => ({
                      id: v.valueID,
                      spu: v.spu,
                      sku: v.sku,
                      paramDefinition: v.definitionID,
                      value: v.value,
                    })),
                  },
                  { token }
                );
                notification.success({ message: '批量修改商品参数值成功' });
              } catch (err) {
                const msg = `批量修改商品参数值失败：${
                  err instanceof Error ? err.message : ''
                }`;
                notification.error({ message: msg });
                console.error(msg);
              }
            }
            await getPValueList();
            notification.success({ message: '获取商品参数值成功' });
          }}
          type="primary"
          style={{ marginLeft: '30px' }}
        >
          保存
        </Button>
      </div>
      <Modal
        title="自定义参数值"
        open={editingCustomDefinitionID !== null}
        onCancel={() => {
          setEditingCustomDefinitionID(null);
          setEditingCustomValue(null);
        }}
        onOk={() => {
          const indexDef = definitionExtList.findIndex(
            def => def.definitionID === editingCustomDefinitionID
          );
          if (indexDef < 0) {
            return;
          }
          setDefinitionExtList([
            ...definitionExtList.slice(0, indexDef),
            {
              ...definitionExtList[indexDef],
              options: [
                ...definitionExtList[indexDef].options.slice(0, -1),
                {
                  isCustom: true,
                  option: editingCustomValue,
                },
              ],
            },
            ...definitionExtList.slice(indexDef + 1),
          ]);
          setEditingCustomDefinitionID(null);
          setEditingCustomValue(null);
        }}
        okButtonProps={{
          disabled: !editingCustomValue,
        }}
      >
        {editingCustomDefinitionID !== null && (
          <Form
            name="basic"
            labelCol={{ span: 6 }}
            wrapperCol={{ span: 16 }}
            initialValues={{ remember: true }}
            autoComplete="off"
          >
            <Form.Item label="参数名称:">
              <Input
                disabled
                value={
                  definitionExtList.find(
                    def => def.definitionID === editingCustomDefinitionID
                  )?.definitionName
                }
              />
            </Form.Item>
            <Form.Item label="参数值:">
              <Input
                value={editingCustomValue ?? undefined}
                placeholder="请输入"
                onChange={ev => {
                  const v = ev.target.value.trim();
                  if (v) {
                    setEditingCustomValue(v);
                  }
                }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}

export default function () {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
