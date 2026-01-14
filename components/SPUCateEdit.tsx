import { SPUCate } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { editSPUCateInfo, getSPUCateInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { EditSPUCateInfo } from '@zsqk/z1-sdk/es/z1p/product-types';
import { Button, Form, Input, Radio, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';

import {
  useSPUCateIDContext,
  useSPUCateListUpdate,
} from '../datahooks/product';
import SelectSPUCate from './SelectSPUCate';
import { lessAwait, postAwait } from '../error';
import { useTokenContext } from '../datahooks/auth';
import { ChangeTable } from './ChangeTable';
import Upload from './Upload';
import { UploadFile } from 'antd/lib/upload/interface';
import _ from 'lodash';
const { TextArea } = Input;

/**
 * [组件] SPU 分类 编辑
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SPUCateEdit() {
  const { spuCateID } = useSPUCateIDContext();
  const [preData, setPreData] = useState<SPUCate>();
  const [input, setInput] = useState<Parameters<EditSPUCateInfo>[1]>({});
  const [icon, setIcon] = useState<UploadFile>();
  const [activeTab, setActiveTab] = useState<string>('basic');

  useEffect(() => {
    if (!preData?.icon) {
      setIcon(undefined);
      return;
    }
    setIcon({
      uid: String(Math.random()).slice(2),
      name: _.last(preData.icon.split('/')) || '',
      status: 'done',
      url: preData.icon,
    });
  }, [preData]);

  const reUpdate = useSPUCateListUpdate();

  useEffect(() => {
    if (!spuCateID) {
      return;
    }
    // 拉取 spuCateID 的数据
    lessAwait(getSPUCateInfo, {
      finallyCallback: (_err, v) => {
        if (!v) {
          return;
        }
        setPreData(v);
        setInput({});
      },
    })(spuCateID);
  }, [spuCateID]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!spuCateID || !preData) {
    // 可能没有选择 spuCateID (不该出现), 也可能数据没有加载完全 (临时情况)
    return <>暂无数据</>;
  }

  return (
    <>
      <div>编辑 SPU 分类</div>

      <Form layout="vertical" autoComplete="off">
        <Form.Item label="ID" tooltip="唯一标识符, 不可修改">
          <Input value={preData.id} disabled />
        </Form.Item>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
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

                  {/* 暂时关闭前端的编号管理功能 */}
                  {/* <Form.Item label="编号" tooltip="自定义的方便进行查找的编号">
                    <Input
                      value={input.number ?? preData.number}
                      onChange={(e) => {
                        setInput(update(input, { number: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item> */}

                  <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
                    <Input
                      value={input.spell ?? preData.spell}
                      onChange={e => {
                        setInput(update(input, { spell: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="分类图标" tooltip="非必填，一张">
                    <Upload
                      maxCount={1}
                      listType="picture-card"
                      dir="z1p/"
                      imgList={icon ? [icon] : []}
                      setImgList={e => {
                        setIcon(e[0]);
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="上级分类" tooltip="选择一个上级分类">
                    <SelectSPUCate
                      selectedSPUCateID={input.pid ?? preData.pid}
                      onSelect={id => {
                        setInput(update(input, { pid: { $set: id } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="排序号" tooltip="相同上级分类 从低到高显示">
                    <Input value={preData.order} disabled />
                  </Form.Item>

                  <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
                    <TextArea
                      value={input.remarks ?? preData.remarks}
                      onChange={e => {
                        setInput(update(input, { remarks: { $set: e.target.value } }));
                      }}
                    />
                  </Form.Item>

                  <Form.Item label="状态" tooltip="选择一种状态">
                    <Radio.Group
                      onChange={e => {
                        setInput(update(input, { state: { $set: e.target.value } }));
                      }}
                      value={input.state ?? preData.state}
                    >
                      <Radio value={'valid'}>有效</Radio>
                      <Radio value={'invalid'}>无效</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Form>
              ),
            },
            {
              key: 'operations',
              label: '操作记录',
              children: (
                <ChangeTable logFor={[`spu_cate_${spuCateID}`]} />
              ),
            },
          ]}
        />

        {activeTab !== 'operations' && (
          <Form.Item style={{ marginTop: '24px' }}>
            <Button
              type="primary"
              onClick={postAwait(async () => {
                if (preData.icon !== icon?.url) {
                  input.icon = icon?.url || null;
                }
                await editSPUCateInfo(spuCateID, input, { auth: token });
                await reUpdate();
                // TODO: 根据后端结果按需修改 state 数据
                // const i = spuCateList.findIndex((v) => v.id === spuCateID);
                // setSPUCateList(
                //   update(spuCateList, {
                //     [i]: { $set: { ...spuCateList[i], ...input } },
                //   })
                // );
              })}
            >
              提交修改
            </Button>
          </Form.Item>
        )}
      </Form>
    </>
  );
}
