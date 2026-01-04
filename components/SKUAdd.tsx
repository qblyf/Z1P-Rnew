import { SkuID, SpuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Button, Form, Input, Row, Select, Switch } from 'antd';
import { useEffect, useState } from 'react';
import pinyin from 'tiny-pinyin';
import update from 'immutability-helper';
import _ from 'lodash';
import { UploadFile } from 'antd/lib/upload/interface';

import { getAllPids, validateGTIN } from './SKUManager';
import { postAwait } from '../error';
import { appendSKUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import {
  useSPUCateIDContext,
  useSPUCateListContext,
} from '../datahooks/product';
import { withSNspuCateIDs } from '../constant/data';
import { genSKUNameWithoutKey, SKUDetails } from '@zsqk/z1-sdk/es/z1p/sku';
import Upload from './Upload';
import { useTokenContext } from '../datahooks/auth';

/**
 * [组件] 新增 SKU
 *
 * 上下文依赖:
 *
 * 1. useSPUCateListContext
 * 2. useSPUCateIDContext
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function SKUAdd(props: {
  spu: { spuID: SpuID; name: string };
  selected: SKUDetails;
  onComplete: (id: SkuID) => void;
}) {
  const { spu, selected, onComplete } = props;
  const [input, setInput] = useState({
    name: `${spu.name} ${genSKUNameWithoutKey(selected)}`,
    gtins: [] as string[],
    spell: pinyin.convertToFirstLetter(
      `${spu.name} ${genSKUNameWithoutKey(selected)}`
    ),
    listPrice: '',
    unit: '',
    grossWeight: '',
    thumbnail: '',
    remarks: '',
    defaultSNRules: { sn1: '0', sn2: '0', sn3: '0' },
  });
  const [gtinsErr, setGtinsErr] = useState<Record<string, string>>({});
  const [image, setImage] = useState<UploadFile>();
  const [status, setStatus] = useState<'inProgress' | 'complete'>('inProgress');

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (status === 'complete') {
    return <>已完成</>;
  }
  return (
    <Form layout="vertical">
      <Form.Item label="名称" tooltip="SKU 的名称, 唯一">
        <Input
          value={input.name}
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
                value={gtin}
                status={gtinsErr[gtin] !== undefined ? 'error' : undefined}
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
                <span style={{ color: 'red' }}>GTIN 码无效，请检查！</span>
              )}
            </div>
          );
        })}
      </Form.Item>

      {/* 暂时关闭前端的编号管理功能 */}
      {/* <Form.Item label="编号" tooltip="自定义的方便进行查找的编号">
        <Input
          value={input.number}
          onChange={e => {
            setInput(update(input, { number: { $set: e.target.value } }));
          }}
        />
      </Form.Item> */}

      <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
        <Input
          value={input.spell}
          onChange={e => {
            setInput(update(input, { spell: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="官网价" tooltip="官网价, 厂商指导价">
        <Input
          value={input.listPrice}
          onChange={e => {
            setInput(update(input, { listPrice: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="单位" tooltip="例如 台, 张">
        <Input
          value={input.unit}
          onChange={e => {
            setInput(update(input, { unit: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <Form.Item label="毛重" tooltip="必须以 kg/g 结尾，支持小数如 1.5kg">
        <Input
          placeholder="必须以 kg/g 结尾，如 1.5kg"
          value={input.grossWeight}
          onChange={e => {
            setInput(update(input, { grossWeight: { $set: e.target.value } }));
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

      <EditDefaultSNRulesFormItem
        defaultSNRules={input.defaultSNRules}
        setDefaultSNRules={v => {
          setInput(update(input, { defaultSNRules: { $set: v } }));
        }}
      />

      <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
        <Input.TextArea
          value={input.remarks}
          onChange={e => {
            setInput(update(input, { remarks: { $set: e.target.value } }));
          }}
        />
      </Form.Item>

      <EditDefaultSNRulesFormItem
        defaultSNRules={input.defaultSNRules}
        setDefaultSNRules={v => {
          setInput(update(input, { defaultSNRules: { $set: v } }));
        }}
      />

      <Form.Item>
        <Button
          type="primary"
          onClick={postAwait(async () => {
            const { listPrice, defaultSNRules, ...rest } = input;
            if (rest.grossWeight && !rest.grossWeight.match(/^(\d+\.?\d*)(kg|g)$/)) {
              throw new Error('毛重必须以 kg/g 结尾，支持小数如 1.5kg');
            }
            if (image) {
              rest.thumbnail = image.url || '';
            }
            // TODO: 如果 listPrice 无效
            const skuID = await appendSKUInfo(
              { spuID: spu.spuID, ...selected },
              {
                ...rest,
                listPrice: Math.round(Number(listPrice) * 100),
                defaultSNRules: {
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
                },
              },
              { auth: token }
            );
            setStatus('complete');
            onComplete(skuID);
          })}
        >
          提交创建
        </Button>
      </Form.Item>
    </Form>
  );
}

/** 默认的非强制序列号时 SKU 规则的默认数据 */
const withoutSN = { sn1: '0', sn2: '0', sn3: '0' };
/** 默认的强制序列号时 SKU 规则的默认数据 */
const withSN = { sn1: 'auto', sn2: '0', sn3: '0' };

/**
 * 校验用户输入的 input SN 规则是否有效
 * @author Lian Zheren <lzr@go0356.com>
 */
function checkSNRuleValid(v: string): boolean {
  if (v === '0' || v === 'auto') {
    return true;
  }
  const n = Number(v);
  if (Number.isSafeInteger(n) && n > 0) {
    return true;
  }
  return false;
}

/**
 * [业务组件] 修改 defaultSNRules 值
 * @author Lian Zheren <lzr@go0356.com>
 */
export function EditDefaultSNRulesFormItem(props: {
  defaultSNRules: {
    sn1: string;
    sn2: string;
    sn3: string;
  };
  setDefaultSNRules: (v: { sn1: string; sn2: string; sn3: string }) => void;
}) {
  const { defaultSNRules, setDefaultSNRules } = props;

  // 获取当前选中的所有 SPU 分类及上级分类的 ID
  // 然后根据 SKU 所属的 SPU 的分类判断
  const { spuCateList } = useSPUCateListContext();
  const { spuCateID } = useSPUCateIDContext();
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (init) {
      return;
    }
    const defaultSNRules = (() => {
      if (!spuCateID) {
        return withoutSN;
      }
      const cateIDs = getAllPids(spuCateList, spuCateID);
      const set = new Set([...cateIDs, ...withSNspuCateIDs]);
      if (set.size === cateIDs.length + withSNspuCateIDs.length) {
        return withoutSN;
      }
      return withSN;
    })();
    setDefaultSNRules(defaultSNRules);
    setInit(true);
  }, [spuCateList, spuCateID, setDefaultSNRules, init]);

  let sn1Name = '序列号 1';
  let sn2Name = '序列号 2';
  let sn3Name = '序列号 3';

  if (defaultSNRules.sn2 !== '0') {
    sn2Name = 'SN';
    if (defaultSNRules.sn3 !== '0') {
      sn1Name = 'MEID';
    } else {
      sn1Name = 'IMEI / MEID';
    }
  }
  if (defaultSNRules.sn3 !== '0') {
    sn3Name = 'MEID';
    if (defaultSNRules.sn2 !== '0') {
      sn1Name = 'IMEI';
    } else {
      sn1Name = 'IMEI / SN';
    }
  }

  let sn1Valid = checkSNRuleValid(defaultSNRules.sn1);
  let sn2Valid = checkSNRuleValid(defaultSNRules.sn2);
  let sn3Valid = checkSNRuleValid(defaultSNRules.sn3);

  return (
    <>
      <Form.Item
        label="默认 是否唯一序列号"
        tooltip="仅限初次同步 SKU 时写入到账套中"
      >
        <Select
          value={defaultSNRules.sn1 === '0' ? 'withoutSN' : 'withSN'}
          onChange={v => {
            if (v === 'withoutSN') {
              setDefaultSNRules({ sn1: '0', sn2: '0', sn3: '0' });
            }
            if (v === 'withSN') {
              setDefaultSNRules(withSN);
            }
          }}
        >
          <Select.Option value="withSN">是</Select.Option>
          <Select.Option value="withoutSN">否</Select.Option>
        </Select>
      </Form.Item>

      {defaultSNRules.sn1 !== '0' && (
        <>
          <Form.Item
            label={sn1Name}
            tooltip="序列号 1, 可以填写 SN / IMEI / MEID 等, 留空则不限制长度"
            validateStatus={sn1Valid ? undefined : 'error'}
            help={!sn1Valid && '只可填入大于 0 的整数数字'}
          >
            <Row>
              <Switch checkedChildren="必须开启" checked disabled />
            </Row>
            <Row>序列号长度限制:</Row>
            <Row>
              <Input
                placeholder="留空则不限制长度"
                value={defaultSNRules.sn1 === 'auto' ? '' : defaultSNRules.sn1}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '') {
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn1: { $set: 'auto' },
                      })
                    );
                    return;
                  }
                  setDefaultSNRules(
                    update(defaultSNRules, {
                      sn1: { $set: v },
                    })
                  );
                }}
              />
            </Row>
          </Form.Item>

          <Form.Item
            label={sn2Name}
            tooltip="序列号 2, 可以填写 SN 等, 留空则不限制长度"
            validateStatus={sn2Valid ? undefined : 'error'}
            help={!sn2Valid && '只可填入大于 0 的整数数字'}
          >
            <Row>
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                checked={defaultSNRules.sn2 !== '0'}
                onChange={v => {
                  if (v) {
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn2: { $set: 'auto' },
                      })
                    );
                  } else {
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn2: { $set: '0' },
                      })
                    );
                  }
                }}
              />
            </Row>
            <Row>序列号长度限制:</Row>
            <Row>
              {defaultSNRules.sn2 === '0' ? (
                <Input placeholder="尚未开启序列号使用" disabled />
              ) : (
                <Input
                  placeholder="留空则不限制长度"
                  value={
                    defaultSNRules.sn2 === 'auto' ? '' : defaultSNRules.sn2
                  }
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') {
                      setDefaultSNRules(
                        update(defaultSNRules, {
                          sn2: { $set: 'auto' },
                        })
                      );
                      return;
                    }
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn2: { $set: v },
                      })
                    );
                  }}
                />
              )}
            </Row>
          </Form.Item>

          <Form.Item
            label={sn3Name}
            tooltip="序列号 3, 可以填写 MEID 等, 留空则不限制长度"
            validateStatus={sn3Valid ? undefined : 'error'}
            help={!sn3Valid && '只可填入大于 0 的整数数字'}
          >
            <Row>
              <Switch
                checkedChildren="开启"
                unCheckedChildren="关闭"
                checked={defaultSNRules.sn3 !== '0'}
                onChange={v => {
                  if (v) {
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn3: { $set: 'auto' },
                      })
                    );
                  } else {
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn3: { $set: '0' },
                      })
                    );
                  }
                }}
              />
            </Row>
            <Row>序列号长度限制:</Row>
            <Row>
              {defaultSNRules.sn3 === '0' ? (
                <Input placeholder="尚未开启序列号使用" disabled />
              ) : (
                <Input
                  placeholder="留空则不限制长度"
                  value={
                    defaultSNRules.sn3 === 'auto' ? '' : defaultSNRules.sn3
                  }
                  onChange={e => {
                    const v = e.target.value;
                    if (v === '') {
                      setDefaultSNRules(
                        update(defaultSNRules, {
                          sn3: { $set: 'auto' },
                        })
                      );
                      return;
                    }
                    setDefaultSNRules(
                      update(defaultSNRules, {
                        sn3: { $set: v },
                      })
                    );
                  }}
                />
              )}
            </Row>
          </Form.Item>
        </>
      )}
    </>
  );
}
