import { SKU, SkuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { paramsDetail } from '@zsqk/z1-sdk/es/z1p/params-value';
import {
  editSKUInfo,
  getSKUInfo,
  invalidateSKUInfo,
} from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Col, Form, Input, Row, Space } from 'antd';
import { useEffect, useState } from 'react';
import _ from 'lodash';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';
import { UploadFile } from 'antd/lib/upload/interface';

import { useSpuIDContext } from '../datahooks/product';
import { lessAwait, postAwait } from '../error';
import { EditDefaultSNRulesFormItem } from './SKUAdd';
import Upload from './Upload';
import { useTokenContext } from '../datahooks/auth';
import { ChangeTable } from './ChangeTable';
import { validateGTIN } from './SKUManager';

/**
 * [组件] 修改 SKU
 * @author Lian Zheren <lzr@go0356.com>
 */
export function SKUEdit(props: { selectedSkuID: SkuID }) {
  const { selectedSkuID } = props;
  const [preData, setPreData] = useState<SKU>();
  const [input, setInput] = useState<{
    name?: string;
    gtins?: string[];
    number?: string;
    spell?: string;
    listPrice?: string;
    unit?: string;
    grossWeight?: string;
    thumbnail?: string;
    remarks?: string;
    defaultSNRules?: {
      sn1: string;
      sn2: string;
      sn3: string;
    };
  }>({});
  const [image, setImage] = useState<UploadFile>();

  const { spuID } = useSpuIDContext();

  const [hasSetParams, setHasSetParams] = useState<boolean>(false);

  const [gtinsErr, setGtinsErr] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!preData?.thumbnail) {
      return;
    }
    setImage({
      uid: String(Math.random()).slice(2),
      name: _.last(preData.thumbnail.split('/')) || '',
      status: 'done',
      url: preData.thumbnail,
    });
  }, [preData]);

  useEffect(() => {
    // 拉取 SKU 数据
    lessAwait(async () => {
      const sku = await getSKUInfo(selectedSkuID);
      setPreData(sku);
    })();
  }, [selectedSkuID]);

  useEffect(() => {
    const fn = async () => {
      if (!preData?.id) {
        return;
      }
      const res = await paramsDetail({ sku: preData?.id });
      setHasSetParams(Boolean(res.length));
    };
    fn();
  }, [preData]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!preData) {
    return <>等待 SKU 数据加载</>;
  }

  if (spuID !== preData.spuID) {
    return <>已经切换 SPU, 请关闭后重新选择.</>;
  }

  // console.log('input.gtins', input.gtins);

  return (
    <>
      <Form layout="vertical">
        <Form.Item label="名称" tooltip="SKU 的名称, 唯一">
          <Input
            value={input.name ?? preData.name}
            onChange={e => {
              const v = e.target.value;
              setInput(
                update(input, {
                  name: { $set: v },
                  spell: { $set: pinyin.convertToFirstLetter(v) },
                })
              );
            }}
            disabled
          />
        </Form.Item>

        <Form.Item
          label="GS1 条码"
          tooltip="商品 GS1 条码 (69 码), GTIN 码, 可设置多条."
        >
          {input.gtins ? (
            <>
              <Button
                size="small"
                onClick={() => {
                  setInput(
                    update(input, {
                      gtins: { $push: [''] },
                    })
                  );
                }}
              >
                新增条码
              </Button>
              {input.gtins.map((gtin, i) => {
                return (
                  <div key={`${i}`}>
                    <Input
                      status={
                        gtinsErr[gtin] !== undefined ? 'error' : undefined
                      }
                      value={gtin}
                      onBlur={e => {
                        if (!e.target.value) {
                          return;
                        }
                        const checkRes = validateGTIN(e.target.value);
                        if (checkRes === true) {
                          setGtinsErr(pre => {
                            const ret = { ...pre };
                            delete ret[gtin];
                            return ret;
                          });
                        } else {
                          setGtinsErr(pre => ({
                            ...pre,
                            [gtin]: checkRes,
                          }));
                        }
                      }}
                      onChange={e => {
                        setInput(
                          update(input, {
                            gtins: { [i]: { $set: e.target.value.trim() } },
                          })
                        );
                      }}
                    />
                    {gtinsErr[gtin] !== undefined && (
                      <span style={{ color: 'red' }}>
                        GTIN 码无效，请检查！
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <Button
                size="small"
                onClick={() => {
                  setInput(update(input, { gtins: { $set: preData.gtins } }));
                }}
              >
                修改
              </Button>
              {preData.gtins.map(gtin => {
                return <Input disabled key={gtin} value={gtin} />;
              })}
            </>
          )}
        </Form.Item>

        {/* 暂时关闭前端的编号管理功能 */}
        {/* <Form.Item label="编号" tooltip="自定义的方便进行查找的编号">
        <Input
          value={input.number ?? preData.number}
          onChange={e => {
            setInput(update(input, { number: { $set: e.target.value } }));
          }}
        />
      </Form.Item> */}

        <Form.Item label="参数" tooltip="SPU/SKU参数设置">
          {hasSetParams ? (
            <span>已设置</span>
          ) : (
            <span style={{ color: 'red' }}>未设置</span>
          )}
          <Button
            size="small"
            onClick={() => {
              window.open(
                `/spu-sku-param-config?skuID=${preData.id}&name=${preData.name}`
              );
            }}
            style={{ marginLeft: '10px' }}
          >
            设置参数
          </Button>
        </Form.Item>

        <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
          <Input
            value={input.spell ?? preData.spell}
            onChange={e => {
              setInput(update(input, { spell: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item label="官网价" tooltip="官网价, 厂商指导价">
          <Input
            value={input.listPrice ?? Number(preData.listPrice) / 100}
            onChange={e => {
              setInput(update(input, { listPrice: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item label="单位" tooltip="例如 台, 张">
          <Input
            value={input.unit ?? preData.unit}
            onChange={e => {
              setInput(update(input, { unit: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item label="毛重" tooltip="必须以 kg/g 结尾，支持小数如 1.5kg">
          <Input
            placeholder="必须以 kg/g 结尾，如 1.5kg"
            value={input.grossWeight ?? preData.grossWeight}
            onChange={e => {
              setInput(
                update(input, { grossWeight: { $set: e.target.value } })
              );
            }}
          />
        </Form.Item>

        <Form.Item label="缩略图" tooltip="建议尺寸 800 * 800px">
          <Upload
            maxCount={1}
            listType="picture-card"
            dir="z1p/"
            imgList={image ? [image] : []}
            setImgList={e => {
              setImage(e[0]);
            }}
          />
        </Form.Item>

        <Form.Item
          label="默认序列号规则"
          tooltip="仅限初次同步 SKU 时写入到账套中"
        >
          <Button
            size="small"
            onClick={() => {
              setInput(
                update(input, {
                  defaultSNRules: {
                    $set: {
                      sn1: preData.defaultSNRules.sn1.toString(),
                      sn2: preData.defaultSNRules.sn2.toString(),
                      sn3: preData.defaultSNRules.sn3.toString(),
                    },
                  },
                })
              );
            }}
          >
            修改
          </Button>
          {input.defaultSNRules ? (
            <EditDefaultSNRulesFormItem
              defaultSNRules={input.defaultSNRules}
              setDefaultSNRules={v => {
                setInput(
                  update(input, {
                    defaultSNRules: { $set: v },
                  })
                );
              }}
            />
          ) : (
            <RenderSNs v={preData.defaultSNRules} />
          )}
        </Form.Item>

        <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
          <Input.TextArea
            value={input.remarks ?? preData.remarks}
            onChange={e => {
              setInput(update(input, { remarks: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              onClick={postAwait(async () => {
                const { listPrice, defaultSNRules, ...rest } = input;

                const patch: Awaited<Parameters<typeof editSKUInfo>[1]> = rest as any;
                if (listPrice) {
                  patch.listPrice = Number(listPrice) * 100;
                }
                if (defaultSNRules) {
                  patch.defaultSNRules = {
                    sn1:
                      defaultSNRules.sn1 === 'auto'
                        ? 'auto'
                        : Number(defaultSNRules.sn1),
                    sn2:
                      defaultSNRules.sn2 === 'auto'
                        ? 'auto'
                        : Number(defaultSNRules.sn2),
                    sn3:
                      defaultSNRules.sn3 === 'auto'
                        ? 'auto'
                        : Number(defaultSNRules.sn3),
                  };
                }
                if (patch.grossWeight && !patch.grossWeight.match(/^(\d+\.?\d*)(kg|g)$/)) {
                  throw new Error('毛重必须以 kg/g 结尾');
                }
                if (image) {
                  patch.thumbnail = image.url;
                }
                await editSKUInfo(selectedSkuID, patch, { auth: token });
                
                // 更新前端状态
                if (preData) {
                  setPreData(update(preData, {
                    name: { $set: (patch as any).name ?? preData.name },
                    gtins: { $set: patch.gtins ?? preData.gtins },
                    spell: { $set: (patch as any).spell ?? (preData as any).spell },
                    listPrice: { $set: patch.listPrice ?? preData.listPrice },
                    unit: { $set: patch.unit ?? preData.unit },
                    grossWeight: { $set: patch.grossWeight ?? preData.grossWeight },
                    thumbnail: { $set: patch.thumbnail ?? preData.thumbnail },
                    remarks: { $set: patch.remarks ?? preData.remarks },
                    defaultSNRules: { $set: patch.defaultSNRules ?? preData.defaultSNRules },
                  }) as any);
                }
                
                // 清空输入状态
                setInput({});
              })}
            >
              提交修改
            </Button>
            <Button
              danger
              onClick={postAwait(
                async () => {
                  await invalidateSKUInfo(selectedSkuID, { auth: token });
                },
                { successText: '已移除成功' }
              )}
            >
              移除
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <ChangeTable
        logFor={[`sku_${selectedSkuID}`]}
        columnKeys={['operate', 'createdAt', 'createdBy']}
      />
    </>
  );
}

function RenderSNs(props: { v: SKU['defaultSNRules'] }) {
  return (
    <>
      <Row>
        <Col span={6}>SN1</Col>
        <Col flex="1">
          {props.v.sn1 === 0
            ? '非强制序列号'
            : props.v.sn1 === 'auto'
              ? '强制序列号 (不限长度)'
              : `强制序列号 (固定长度为 ${props.v.sn1})`}
        </Col>
      </Row>
      <Row>
        <Col span={6}>SN2</Col>
        <Col flex="1">
          {props.v.sn2 === 0
            ? '非强制序列号'
            : props.v.sn2 === 'auto'
              ? '强制序列号 (不限长度)'
              : `强制序列号 (固定长度为 ${props.v.sn2})`}
        </Col>
      </Row>
      <Row>
        <Col span={6}>SN3</Col>
        <Col flex="1">
          {props.v.sn3 === 0
            ? '非强制序列号'
            : props.v.sn3 === 'auto'
              ? '强制序列号 (不限长度)'
              : `强制序列号 (固定长度为 ${props.v.sn3})`}
        </Col>
      </Row>
    </>
  );
}
