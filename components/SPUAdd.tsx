import { AddSPUInfo } from '@zsqk/z1-sdk/es/z1p/product-types';
import { addSPUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, DatePicker, Form, Input, Select } from 'antd';
import { useState, useMemo } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';
import _ from 'lodash';
import { UploadFile } from 'antd/lib/upload/interface';
import dayjs from 'dayjs';

import {
  useSPUCateIDContext,
  useSPUCateListContext,
  useSpuListContext,
} from '../datahooks/product';
import TextArea from 'antd/lib/input/TextArea';
import { postAwait } from '../error';
import { useBrandListContext } from '../datahooks/brand';
import Upload from './Upload';
import { useTokenContext } from '../datahooks/auth';

/**
 * [组件] 新增 SPU
 *
 * 功能:
 *
 * 1. 检查已选择的 SPU 分类, 必须为最末级.
 * 2. 提交成功后自动更新上下文 SPU 列表数据.
 */
export default function SPUAdd() {
  const { spuCateID } = useSPUCateIDContext();
  const { spuCateList } = useSPUCateListContext();
  const { spuList, setSpuList } = useSpuListContext();
  const { brandList } = useBrandListContext();
  const [input, setInput] = useState<
    Omit<Parameters<AddSPUInfo>[0], 'order' | 'cateID'>
  >({
    name: '',
    spell: '',
    brand: '',
    series: '',
    generation: '',
    desc: '',
    remarks: '',
    images: { thumbnail: '', mainImages: [], detailsImages: [] },
    marketTime: '',
  });
  const [order, setOrder] = useState('');
  const [mainImages, setMainImages] = useState<UploadFile[]>([]);
  const [detailsImages, setDetailsImages] = useState<UploadFile[]>([]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  const init = () => {
    setOrder('');
    setInput({
      name: '',
      spell: '',
      brand: '',
      series: '',
      generation: '',
      desc: '',
      remarks: '',
      images: { thumbnail: '', mainImages: [], detailsImages: [] },
      marketTime: '',
    });
  };

  const similarSpuName = useMemo(() => {
    const s = pinyin
      .convertToPinyin(input.name.replaceAll(/\s/g, ''))
      .toLowerCase();
    if (!s) {
      return null;
    }
    const similars = spuList
      .filter(spu =>
        pinyin
          .convertToPinyin(spu.name.replaceAll(/\s/g, ''))
          .toLowerCase()
          .includes(s)
      )
      .sort(
        (spuA, spuB) =>
          pinyin.convertToPinyin(spuA.name.replaceAll(/\s/g, '')).toLowerCase()
            .length -
          pinyin.convertToPinyin(spuB.name.replaceAll(/\s/g, '')).toLowerCase()
            .length
      );
    if (!similars.length) {
      return null;
    }
    return similars[0].name;
  }, [input.name, spuList]);

  if (!spuCateID) {
    return <>请在商品分类中选择到要新增SPU的最末级分类</>;
  }

  const isLast = spuCateList.every(v => v.pid !== spuCateID);
  if (!isLast) {
    return <>请在商品分类中选择到要新增SPU的最末级分类</>;
  }

  const spuCate = spuCateList.find(v => v.id === spuCateID);
  if (!spuCate) {
    return <>没有找到 spuCate</>;
  }

  return (
    <>
      <h2>新增 SPU</h2>

      <Form layout="vertical" autoComplete="off">
        <Form.Item
          label="名称"
          tooltip="SPU 的名称, 唯一"
          extra={
            similarSpuName ? (
              <>
                <span style={{ color: 'red' }}>存在相似SPU, 请确认：</span>
                {similarSpuName}
              </>
            ) : (
              ''
            )
          }
        >
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
          />
        </Form.Item>

        <Form.Item label="上市时间">
          <DatePicker
            style={{ width: '100%' }}
            allowClear
            value={
              input.marketTime
                ? dayjs(input.marketTime)
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

        <Form.Item label="SPU 分类" tooltip="SPU 所在的 分类">
          {spuCate.name}
        </Form.Item>

        <Form.Item label="排序号" tooltip="相同分类 从低到高显示">
          <Input
            value={order}
            onChange={e => {
              setOrder(e.target.value);
            }}
          />
        </Form.Item>

        <Form.Item
          label="品牌"
          tooltip={`如果缺少品牌, 请去品牌管理中进行添加`}
        >
          <Input
            value={input.brand}
            onChange={e => {
              setInput(update(input, { brand: { $set: e.target.value } }));
            }}
            disabled
          />

          <Select
            value={input.brand}
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
            value={input.series}
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
            value={input.generation}
            onChange={e => {
              setInput(update(input, { generation: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item label="描述" tooltip="本 SPU 的一句话描述">
          <Input
            value={input.desc}
            onChange={e => {
              setInput(update(input, { desc: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item label="主图" tooltip="最多6张，建议尺寸 800 * 800px">
          <Upload
            maxCount={6}
            multiple
            listType="picture-card"
            dir="z1p/"
            imgList={mainImages}
            setImgList={e => {
              setMainImages(e);
            }}
          />
        </Form.Item>

        <Form.Item label="图文详情">
          <Upload
            maxCount={100}
            multiple
            listType="picture-card"
            dir="z1p/"
            imgList={detailsImages}
            setImgList={e => {
              setDetailsImages(e);
            }}
          />
        </Form.Item>

        <Form.Item label="备注" tooltip="自定义的文字 方便了解该分类">
          <TextArea
            value={input.remarks}
            onChange={e => {
              setInput(update(input, { remarks: { $set: e.target.value } }));
            }}
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            onClick={postAwait(async () => {
              input.images.mainImages = mainImages
                .map(img => img.url || '')
                .filter(url => Boolean(url));
              input.images.detailsImages = detailsImages
                .map(img => img.url || '')
                .filter(url => Boolean(url));
              const info = {
                ...input,
                order: Number(order),
                cateID: spuCateID,
              };
              const id = await addSPUInfo(
                {
                  ...input,
                  order: Number(order),
                  cateID: spuCateID,
                },
                { auth: token }
              );
              init();
              // update spu list
              setSpuList(
                update(spuList, { $push: [{ ...info, id, skuIDs: [] }] })
              );
            })}
          >
            提交修改
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
