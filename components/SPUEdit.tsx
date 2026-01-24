import { SPU } from '@zsqk/z1-sdk/es/z1p/alltypes';
import {
  editSPUInfo,
  getSPUInfo,
  invalidateSPUInfo,
  getSKUsInfo as getSKUsInfoAPI,
} from '@zsqk/z1-sdk/es/z1p/product';
import { getSKUsInfo } from '../data/product';
import { paramsDetail } from '@zsqk/z1-sdk/es/z1p/params-value';
import { EditSPUInfo } from '@zsqk/z1-sdk/es/z1p/product-types';
import {
  Badge,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tabs,
  Drawer,
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
import SKUManager from './SKUManager';
import { SKUEdit } from './SKUEdit';
import SPUParamConfig from './SPUParamConfig';
import './SPUEdit.css';

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
export default function SPUEdit(props: { defaultTab?: string }) {
  const { defaultTab = 'basic' } = props;
  const [preData, setPreData] = useState<SPUEditing>();
  const { spuID } = useSpuIDContext();
  const { spuList, setSpuList } = useSpuListContext();
  const { brandList } = useBrandListContext();
  const [input, setInput] = useState<Partial<SPUEditing>>({});
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [showSkuEditDrawer, setShowSkuEditDrawer] = useState(false);
  const [selectedSkuID, setSelectedSkuID] = useState<number | undefined>();
  const [selectedSkuName, setSelectedSkuName] = useState<string>('');
  const [hasSetParams, setHasSetParams] = useState<boolean>(true); // 默认true避免闪烁

  // 当defaultTab变化时更新activeTab
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // 检查参数是否已设置
  useEffect(() => {
    if (!spuID) return;
    const checkParams = async () => {
      try {
        const res = await paramsDetail({ spu: spuID });
        setHasSetParams(res.length > 0);
      } catch {
        // 忽略错误
      }
    };
    checkParams();
  }, [spuID]);

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

  // 检查商城信息是否已维护（主图或图文详情至少有一个）
  const hasMallInfo = (preData.images.mainImages && preData.images.mainImages.length > 0) ||
    (preData.images.detailsImages && preData.images.detailsImages.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="spu-edit-tabs"
          style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
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

                  <Form.Item label="排序号" tooltip="从高到低显示">
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

                  <Form.Item>
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
                        提交修改
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
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'mall',
              label: hasMallInfo ? '商城信息' : <Badge dot color="red"><span style={{ paddingRight: 6 }}>商城信息</span></Badge>,
              children: (
                <Form layout="vertical" autoComplete="off">
                  <Form.Item label="主图" tooltip="最多6张，建议尺寸 800 * 800px。支持批量上传，可一次选择多张图片">
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

                  <Form.Item label="图文详情" tooltip="最多100张。支持批量上传，可一次选择多张图片">
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

                  <Form.Item>
                    <Button
                      type="primary"
                      onClick={postAwait(async () => {
                        if (!input.images || (!input.images.mainImages && !input.images.detailsImages)) {
                          throw new Error('无变动不需提交');
                        }
                        const params: Parameters<EditSPUInfo>[1] = {
                          images: {
                            thumbnail: input.images.thumbnail
                              ? (input.images.thumbnail.url || '')
                              : '',
                            mainImages: (input.images.mainImages || [])
                              .map(img => img.url || '')
                              .filter(url => Boolean(url)),
                            detailsImages: (input.images.detailsImages || [])
                              .map(img => img.url || '')
                              .filter(url => Boolean(url)),
                          },
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
                      提交修改
                    </Button>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'sku',
              label: 'SKU编辑',
              children: (
                <SKUManager 
                  onWantEditSKU={async (skuID) => {
                    setSelectedSkuID(skuID);
                    setShowSkuEditDrawer(true);
                    
                    // 异步获取 SKU 名称 - 使用 API 直接获取，不使用缓存
                    try {
                      console.log('正在获取 SKU 名称, SKU ID:', skuID);
                      const skuInfo = await getSKUsInfoAPI([skuID]);
                      console.log('SKU 信息返回:', skuInfo);
                      
                      if (skuInfo && skuInfo.length > 0 && !('errInfo' in skuInfo[0])) {
                        console.log('设置 SKU 名称:', skuInfo[0].name);
                        setSelectedSkuName(skuInfo[0].name);
                      } else {
                        console.log('SKU 信息无效或包含错误');
                      }
                    } catch (error) {
                      console.error('获取 SKU 名称失败:', error);
                      // 如果获取失败，尝试从 preData 中获取
                      if (preData?.skuIDs) {
                        const sku = preData.skuIDs.find((s: any) => s.skuID === skuID);
                        if (sku && 'name' in sku) {
                          console.log('从 preData 获取 SKU 名称:', sku.name);
                          setSelectedSkuName(sku.name as string);
                        }
                      }
                    }
                  }}
                />
              ),
            },
            {
              key: 'params',
              label: hasSetParams ? '参数' : <Badge dot color="red"><span style={{ paddingRight: 6 }}>参数</span></Badge>,
              children: (
                <SPUParamConfig spuID={spuID} />
              ),
            },
            {
              key: 'operations',
              label: '操作记录',
              children: (
                <ChangeTable logFor={[`spu_${spuID}`]} />
              ),
            },
          ]}
        />

        {/* SKU 编辑 Drawer */}
        {selectedSkuID && (
          <Drawer
            title={selectedSkuName ? `编辑 SKU - ${selectedSkuName}` : '编辑 SKU (加载中...)'}
            placement="right"
            onClose={() => {
              setShowSkuEditDrawer(false);
              setSelectedSkuID(undefined);
              setSelectedSkuName('');
            }}
            open={showSkuEditDrawer}
            width="33.33%"
            afterOpenChange={(open) => {
              // 当抽屉打开时，刷新 SKU 名称 - 使用 API 直接获取，不使用缓存
              if (open && selectedSkuID) {
                const refreshSkuName = async () => {
                  try {
                    console.log('刷新 SKU 名称, SKU ID:', selectedSkuID);
                    const skuInfo = await getSKUsInfoAPI([selectedSkuID]);
                    console.log('刷新后的 SKU 信息:', skuInfo);
                    if (skuInfo && skuInfo.length > 0 && !('errInfo' in skuInfo[0])) {
                      console.log('更新 SKU 名称为:', skuInfo[0].name);
                      setSelectedSkuName(skuInfo[0].name);
                    }
                  } catch (error) {
                    console.error('刷新 SKU 名称失败:', error);
                  }
                };
                refreshSkuName();
              }
            }}
          >
            <SKUEdit 
              selectedSkuID={selectedSkuID}
              onNameChange={(name) => {
                setSelectedSkuName(name);
              }}
            />
          </Drawer>
        )}
      </div>
  );
}
