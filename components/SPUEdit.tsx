import { SPU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import {
  editSPUInfo,
  getSPUInfo,
  invalidateSPUInfo,
} from '@zsqk/z1-sdk/es/z1p/product';
import { EditSPUInfo } from '@zsqk/z1-sdk/es/z1p/product-types';
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Drawer,
  Tabs,
} from 'antd';
import { useEffect, useState, useCallback } from 'react';
import TextArea from 'antd/lib/input/TextArea';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';
import _ from 'lodash';
import { UploadFile } from 'antd/lib/upload/interface';
import dayjs from 'dayjs';

import { useSpuIDContext, useSpuListContext } from '../datahooks/product';
import { lessAwait, postAwait } from '../error';
import SelectSPUCate from './SelectSPUCate';
import { useBrandListContext } from '../datahooks/brand';
import Upload from './Upload';
import { useTokenContext } from '../datahooks/auth';
import { ChangeTable } from './ChangeTable';

type SPUEditing = Omit<SPU, 'images'> & {
  images: {
    thumbnail?: UploadFile | null;
    mainImages?: UploadFile[];
    detailsImages?: UploadFile[];
  };
};

/**
 * [组件] 编辑 SPU
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SPUEdit() {
  const [preData, setPreData] = useState<SPUEditing>();
  const { spuID } = useSpuIDContext();
  const { spuList, setSpuList } = useSpuListContext();
  const { brandList } = useBrandListContext();
  const [input, setInput] = useState<Partial<SPUEditing>>({});
  const [showChangeDrawer, setShowChangeDrawer] = useState(false);

  const transSpuDataToEditingData = useCallback((spu: SPU): SPUEditing => {
    return {
      ...spu,
      images: {
        thumbnail: spu.images.thumbnail
          ? {
              uid: String(Math.random()).slice(10),
              name: _.last(spu.images.thumbnail.split('/')) || '',
              status: 'done',
              url: spu.images.thumbnail,
            }
          : null,
        mainImages: (spu.images.mainImages || []).map(img => {
          return {
            uid: String(Math.random()).slice(10),
            name: _.last(img.split('/')) || '',
            status: 'done',
            url: img,
          };
        }),
        detailsImages: (spu.images.detailsImages || []).map(img => {
          return {
            uid: String(Math.random()).slice(10),
            name: _.last(img.split('/')) || '',
            status: 'done',
            url: img,
          };
        }),
      },
    };
  }, []);

  useEffect(() => {
    lessAwait(async () => {
      if (!spuID) {
        return;
      }
      const spu = await getSPUInfo(spuID);
      setPreData(transSpuDataToEditingData(spu));
      setInput({});
    })();
  }, [spuID, transSpuDataToEditingData]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!spuID || !preData) {
    return <>暂无 SPU 数据</>;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>编辑 SPU</h2>
          <span style={{ color: '#666' }}>ID: {spuID}</span>
        </div>
        <Space>
          {preData.state === 'invalid' ? (
            <Button
              danger
              onClick={postAwait(async () => {
                // TODO: 完成功能
                alert('需要完成该功能');
              })}
            >
              启用
            </Button>
          ) : (
            <Button
              danger
              onClick={postAwait(
                async () => {
                  // TODO: 完成功能
                  alert('需要完成该功能');
                },
                { confirmText: `停用 SPU 前请确认 SPU 下没有任何在用的 SKU.` }
              )}
              disabled
            >
              停用
            </Button>
          )}
          <Button
            type="primary"
            onClick={postAwait(async () => {
              if (!Object.keys(input).length) {
                throw new Error('无变动不需提交');
              }
              const params: Parameters<EditSPUInfo>[1] = {
                ...input,
                images: input.images
                  ? ({
                      thumbnail: input.images.thumbnail
                        ? input.images.thumbnail.url
                        : '',
                      mainImages: (input.images.mainImages || [])
                        .map(img => img.url || '')
                        .filter(url => Boolean(url)),
                      detailsImages: (input.images.detailsImages || [])
                        .map(img => img.url || '')
                        .filter(url => Boolean(url)),
                    } as Parameters<EditSPUInfo>[1]['images'])
                  : undefined,
              };

              // 修改服务端数据
              await editSPUInfo(spuID, params, { auth: token });

              // 请求成功后 按需修改本组件数据
              const newData = { ...preData, ...input };
              setPreData(newData);

              // 请求成功后 初始化用户输入数据
              setInput({});

              // 请求成功后 按需修改 上下文 数据
              const i = spuList.findIndex(v => v.id === spuID);
              setSpuList(update(spuList, { [i]: { $set: newData } }));
            })}
          >
            确认修改
          </Button>
          <Button
            onClick={() => setShowChangeDrawer(true)}
          >
            查看变动记录
          </Button>
          <Button
            danger
            onClick={postAwait(
              async () => {
                await invalidateSPUInfo(spuID, { auth: token });
                // TODO: 更好的前端体验
              },
              { successText: '已经移除成功, 但前端可能需要刷新后才能生效.' }
            )}
          >
            移除
          </Button>
        </Space>
      </div>

      <Form layout="vertical" autoComplete="off">
        <Tabs
          items={[
            {
              key: 'basic',
              label: '基本信息',
              children: (
                <Form layout="vertical" autoComplete="off">
                  <Form.Item label="名称" tooltip="SPU 分类的名称, 唯一">
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
                    />
                  </Form.Item>

                  <Form.Item label="上市时间">
                    <DatePicker
                      style={{ width: '100%' }}
                      allowClear
                      value={
                        input.marketTime
                          ? dayjs(input.marketTime)
                          : preData.marketTime && dayjs(preData.marketTime).isValid()
                            ? dayjs(preData.marketTime)
                            : undefined
                      }
                      onChange={v => {
                        const vStr: string | undefined = v
                          ? v.format('YYYY-MM-DD')
                          : undefined;
                        setInput(
                          update(input, {
                            marketTime: { $set: vStr },
                          })
                        );
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
                    <Input
                      value={input.spell ?? preData.spell}
                      onChange={e => {
                        setInput(update(input, { spell: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="SPU 分类" tooltip="选择一个上级分类">
                    <SelectSPUCate
                      selectedSPUCateID={input.cateID ?? preData.cateID}
                      onSelect={id => {
                        setInput(update(input, { cateID: { $set: id } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="排序号" tooltip="相同上级分类 从低到高显示">
                    <InputNumber
                      style={{ width: '100%' }}
                      value={input.order ?? preData.order}
                      onChange={e => {
                        setInput(update(input, { order: { $set: Number(e) } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="品牌"
                    tooltip={`如果缺少品牌, 请去品牌管理中进行添加`}
                  >
                    <Select
                      value={input.brand ?? preData.brand}
                      showSearch
                      placeholder="选择品牌"
                      optionFilterProp="children"
                      onChange={v => {
                        setInput(update(input, { brand: { $set: v } }));
                      }}
                    >
                      {brandList.map(b => {
                        return (
                          <Select.Option key={b.name} value={b.name}>
                            {b.name} {b.spell}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  </Form.Item>

                  <Form.Item label="系列" tooltip={`比如 "Mate", "iPhone Pro"`}>
                    <Input
                      value={input.series ?? preData.series}
                      onChange={e => {
                        setInput(update(input, { series: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item
                    label="代际"
                    tooltip={`可为空, 比如 iPhone 13 的代际为 "13"`}
                  >
                    <Input
                      value={input.generation ?? preData.generation}
                      onChange={e => {
                        setInput(update(input, { generation: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="描述" tooltip="本 SPU 的一句话描述">
                    <Input
                      value={input.desc ?? preData.desc}
                      onChange={e => {
                        setInput(update(input, { desc: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
                    <TextArea
                      value={input.remarks ?? preData.remarks}
                      onChange={e => {
                        setInput(update(input, { remarks: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'mall',
              label: '商城信息',
              children: (
                <Form layout="vertical" autoComplete="off">
                  <Form.Item label="主图" tooltip="最多6张，建议尺寸 800 * 800px">
                    <Upload
                      maxCount={6}
                      multiple
                      listType="picture-card"
                      dir="z1p/"
                      imgList={input.images?.mainImages ?? preData.images.mainImages}
                      setImgList={e => {
                        setInput({
                          ...input,
                          images: {
                            ...input.images,
                            mainImages: e,
                          },
                        });
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="图文详情">
                    <Upload
                      maxCount={100}
                      multiple
                      listType="picture-card"
                      dir="z1p/"
                      imgList={
                        input.images?.detailsImages ?? preData.images.detailsImages
                      }
                      setImgList={e => {
                        setInput({
                          ...input,
                          images: {
                            ...input.images,
                            detailsImages: e,
                          },
                        });
                      }}
                    />
                  </Form.Item>
                </Form>
              ),
            },
          ]}
        />
      </Form>
      
      {/* Change History Drawer */}
      <Drawer
        title="变动记录"
        placement="right"
        onClose={() => setShowChangeDrawer(false)}
        open={showChangeDrawer}
        width={600}
      >
        <ChangeTable logFor={[`spu_${spuID}`]} />
      </Drawer>
    </>
  );
}
