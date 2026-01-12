import {
  addSPUCateInfo,
  getSPUCateAvailableID,
} from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Form, Input } from 'antd';
import { useEffect, useState } from 'react';
import pinyin from 'tiny-pinyin';

import {
  // TODO: 根据后端结果按需修改 state 数据
  // useSPUCateListContext,
  useSPUCateListUpdate,
} from '../datahooks/product';
import SelectSPUCate from './SelectSPUCate';
import { postAwait } from '../error';
import { SPUCateID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { useTokenContext } from '../datahooks/auth';
import Upload from './Upload';
import { UploadFile } from 'antd/lib/upload/interface';
import _ from 'lodash';
const { TextArea } = Input;

/**
 * [组件] SPU 分类 新增
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SPUCateAdd(props: { pid?: SPUCateID }) {
  const [id, setID] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [spell, setSpell] = useState<string>('');
  const [pid, setPid] = useState<SPUCateID | undefined>(props.pid);
  const [remarks, setRemarks] = useState<string>('');
  const [icon, setIcon] = useState<UploadFile>();

  // TODO: 根据后端结果按需修改 state 数据
  // const { spuCateList, setSPUCateList } = useSPUCateListContext();
  const reUpdate = useSPUCateListUpdate();

  useEffect(() => {
    getSPUCateAvailableID().then(v => {
      setID(`${v}`);
    });
  }, []);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  return (
    <>
      <h2>新增 SPU 分类</h2>

      <Form layout="vertical" autoComplete="off">
        <Form.Item label="ID" tooltip="唯一标识符">
          <Input
            value={id}
            onChange={e => {
              setID(e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item label="名称" tooltip="SPU 分类的名称, 唯一">
          <Input
            value={name}
            onChange={e => {
              const v = e.target.value;
              setSpell(pinyin.convertToFirstLetter(v));
              setName(v);
            }}
          />
        </Form.Item>

        {/* 暂时关闭前端的编号管理功能 */}
        {/* <Form.Item label="编号" tooltip="自定义的方便进行查找的编号">
          <Input
            value={number}
            onChange={(e) => {
              setNumber(e.target.value);
            }}
          />
        </Form.Item> */}

        <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
          <Input
            value={spell}
            onChange={e => {
              setSpell(e.target.value);
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
            defaultSPUCateID={props.pid}
            onSelect={id => {
              setPid(id);
            }}
          />
        </Form.Item>

        <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
          <TextArea
            value={remarks}
            onChange={e => {
              setRemarks(e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            onClick={postAwait(async () => {
              if (pid === undefined) {
                throw new Error('请先选择上级分类');
              }
              const p: Parameters<typeof addSPUCateInfo>[0] = {
                name,
                spell,
                pid,
                remarks,
                icon: icon?.url,
              };
              if (id !== '') {
                p.id = Number(id);
                if (!Number.isSafeInteger(p.id) || p.id < 1) {
                  throw new Error('无效的 ID 设置');
                }
              }
              await addSPUCateInfo(p, { auth: token });
              await reUpdate();
              setName('');
              setSpell('');
              setRemarks('');

              // TODO: 根据后端结果按需修改 state 数据
              // const i = spuCateList.findIndex((v) => v.id === spuCateID);
              // setSPUCateList(
              //   update(spuCateList, {
              //     [i]: { $set: { ...spuCateList[i], ...input } },
              //   })
              // );
            })}
          >
            提交新增
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
