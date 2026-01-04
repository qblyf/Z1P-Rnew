'use client';

import { Brand } from '@zsqk/z1-sdk/es/z1p/alltypes';
import {
  addBrandInfo,
  editBrandInfo,
  getBrandBaseList,
  getBrandInfo,
} from '@zsqk/z1-sdk/es/z1p/brand';
import { PageHeader } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Form,
  Input,
  Row,
  Switch,
  Tabs,
  TabsProps,
  Tag,
} from 'antd';
import { Suspense, useEffect, useState } from 'react';
import update from 'immutability-helper';
import pinyin from 'tiny-pinyin';

import { Content } from '../../components/style/Content';
import { lessAwait, postAwait } from '../../error';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import Head from 'next/head';
import PageWrap from '../../components/PageWrap';
import { useTokenContext } from '../../datahooks/auth';

type BaseBrands = Awaited<ReturnType<typeof getBrandBaseList>>;

function BrandManage() {
  const { brandList: brands } = useBrandListContext();
  const [selected, setSelected] = useState<string>();

  // TODO: 可以考虑将此作为 state
  const selectedBrand = selected
    ? brands?.find(v => v.name === selected)
    : undefined;

  return (
    <>
      <Row>
        <Col flex="auto">
          {brands ? (
            <BrandList
              brands={brands}
              onClick={v => {
                if (v === selected) {
                  setSelected(undefined);
                } else {
                  setSelected(v);
                }
              }}
            />
          ) : (
            '载入中'
          )}
        </Col>
        <Col>
          <Form layout="vertical">
            <BrandInfo
              name={selected}
              onInput={input => {
                setSelected(input);
                // TODO: 如果找不到, 再去后端找一下
              }}
            />
            {selected && selectedBrand ? (
              <BrandEdit name={selected} />
            ) : (
              <BrandAdd name={selected ?? ''} />
            )}
          </Form>
        </Col>
      </Row>
    </>
  );
}

/**
 * [组件] 品牌列表
 */
function BrandList(props: {
  brands: BaseBrands;
  onClick: (name: string | undefined) => void;
}) {
  const { brands, onClick } = props;
  return (
    <>
      {brands.map(b => {
        return (
          <Tag
            key={b.name}
            color={b.color}
            onClick={() => {
              onClick(b.name);
            }}
          >
            {b.name} {b.spell}
          </Tag>
        );
      })}
    </>
  );
}

function BrandInfo(props: { name?: string; onInput: (v: string) => void }) {
  const { name, onInput } = props;
  const [input, setInput] = useState<string>();

  useEffect(() => {
    setInput(undefined);
  }, [name]);

  return (
    <>
      <Form.Item label="名称" tooltip="品牌的名称, 唯一">
        <Input
          value={input ?? name}
          onChange={e => {
            setInput(e.target.value);
          }}
          onBlur={() => {
            input && onInput(input);
          }}
          onPressEnter={() => {
            input && onInput(input);
          }}
        />
      </Form.Item>
    </>
  );
}

function BrandEdit(props: { name: string }) {
  const { name } = props;

  // 完善类型
  const [input, setInput] = useState<{
    spell?: string;
    order?: string;
    color?: string;
    logo?: string;
    display?: boolean;
  }>({});
  const [preData, setPreData] = useState<Brand>();

  useEffect(() => {
    const fn = async () => {
      // TODO: 新增权限校验
      const info = await getBrandInfo(name);
      setPreData(info);
    };
    setInput({})
    lessAwait(fn)();
  }, [name]);

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  if (!preData) {
    return <>暂未找到品牌数据.</>;
  }

  return (
    <>
      <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
        <Input
          value={input.spell ?? preData.spell}
          onChange={e => {
            setInput(
              update(input, {
                spell: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="相同分类 从低到高显示">
        <Input
          value={input.order ?? preData.order}
          onChange={e => {
            setInput(
              update(input, {
                order: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="颜色" tooltip="该品牌名称展示时文字的颜色">
        <Input
          value={input.color ?? preData.color}
          onChange={e => {
            setInput(
              update(input, {
                color: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="LOGO" tooltip="LOGO 图片 URL">
        <Input
          value={input.logo ?? preData.logo}
          onChange={e => {
            setInput(
              update(input, {
                logo: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时将其展示出来">
        <Switch
          checked={input.display ?? preData.display}
          onChange={v =>
            setInput(
              update(input, {
                display: { $set: v },
              })
            )
          }
        />
      </Form.Item>

      <Button
        onClick={postAwait(async () => {
          let order: undefined | number;
          if (input.order !== undefined) {
            order = Number(input.order);
          }
          await editBrandInfo(name, { ...input, order }, { auth: token });
        })}
      >
        确认修改
      </Button>
    </>
  );
}

function BrandAdd(props: { name: string }) {
  const { name } = props;
  const [input, setInput] = useState({
    spell: pinyin.convertToFirstLetter(name),
    order: '',
    color: '',
    logo: '',
    display: true,
  });

  useEffect(() => {
    setInput(
      update(input, { spell: { $set: pinyin.convertToFirstLetter(name) } })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]); // 因为不希望 name 强行绑定 spell, 所以不让 input 参与

  const { token } = useTokenContext();
  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  return (
    <>
      <Form.Item label="拼音码" tooltip="名称的拼音码, 方便进行查找">
        <Input
          value={input.spell}
          onChange={e => {
            setInput(
              update(input, {
                spell: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="排序号" tooltip="相同分类 从低到高显示">
        <Input
          value={input.order}
          onChange={e => {
            setInput(
              update(input, {
                order: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="颜色" tooltip="该品牌名称展示时文字的颜色">
        <Input
          value={input.color}
          onChange={e => {
            setInput(
              update(input, {
                color: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="LOGO" tooltip="LOGO 图片 URL">
        <Input
          value={input.logo}
          onChange={e => {
            setInput(
              update(input, {
                logo: { $set: e.target.value },
              })
            );
          }}
        />
      </Form.Item>

      <Form.Item label="是否展示" tooltip="是否在快捷选择品牌时将其展示出来">
        <Switch
          checked={input.display}
          onChange={v =>
            setInput(
              update(input, {
                display: { $set: v },
              })
            )
          }
        />
      </Form.Item>

      <Button
        onClick={postAwait(async () => {
          // 检查数据
          const order = Number(input.order);
          // 处理数据, 无效 URL 则置空
          const logo = input.logo === '' ? undefined : input.logo;
          // 提交数据
          await addBrandInfo({ name, ...input, order, logo }, { auth: token });
        })}
      >
        创建
      </Button>
    </>
  );
}

export default function () {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  );
}

/**
 * [页面] 基础数据管理
 * @author Lian Zheren <lzr@go0356.com>
 */
function ClientPage() {
  const items: TabsProps['items'] = [
    {
      label: '品牌 管理',
      key: 'brand',
      children: (
        <BrandListProvider>
          <BrandManage />
        </BrandListProvider>
      ),
    },
  ];

  return (
    <PageWrap ppKey="product-manage">
      <Head>
        <title>基础数据管理</title>
      </Head>
      <PageHeader
        title="基础数据管理"
        subTitle="可进行多种基础数据的管理."
      ></PageHeader>
      <Content>
        <Tabs defaultActiveKey="brand" items={items} />
      </Content>
    </PageWrap>
  );
}
