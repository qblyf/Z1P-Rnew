'use client';

import { addParamsDefinition } from '@zsqk/z1-sdk/es/z1p/params-definition';
import { Button, Form, Input, InputNumber, Table, Typography } from 'antd';
import { useState } from 'react';
import SelectCates from './SelectCates';
import { postAwait } from '../error';
import { useTokenContext } from '../datahooks/auth';
import update from 'immutability-helper';
import { CateID } from '@zsqk/z1-sdk/es/types/category-types';
import SelectParamsGroup from './SelectParamsGroup';
const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 },
  style: { width: '100%', marginBottom: '20px' },
};
/**
 * [业务组件 FC]新增参数定义
 * @param props
 * @returns JSX.Element
 * @author Guo Yafang
 */
export function AddParam(props: {
  paramGroupID: number;
  onOk: (e: 'cancal' | 'ok') => void;
}): JSX.Element {
  const { token } = useTokenContext();
  const { paramGroupID, onOk } = props;
  // 参数值列表
  const [data, setData] = useState<
    Array<{
      key: number;
      name: string;
    }>
  >([{ key: 1, name: '' }]);
  const [count, setCount] = useState(data.length);
  // 参数组
  const [group, setGroup] = useState<number>(paramGroupID);
  // 参数名
  const [name, setName] = useState<string>();
  // 权重值
  const [weight, setWeight] = useState<number>();
  // 适用分类
  const [categoryIDs, setCategoryIDs] = useState<CateID[]>();

  const handleAdd = () => {
    const newData = {
      key: count + 1,
      name: '',
    };
    setData([...data, newData]);
    setCount(count + 1);
  };

  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  const columns = [
    {
      title: '参数值',
      dataIndex: 'name',
      width: '30%',
      render: (_v: unknown, record: { name: string; key: number }) => {
        return (
          <Input
            showCount
            maxLength={200}
            value={record.name}
            onChange={e => {
              const i = data.findIndex(d => d.key === record.key);
              setData(
                update(data, {
                  [i]: { name: { $set: e.target.value } },
                })
              );
            }}
          />
        );
      },
    },
  ];
  return (
    <div
      style={{
        maxHeight: '600px',
        minHeight: '600px',
        overflowY: 'auto',
        paddingLeft: '69px',
        paddingRight: '69px',
        paddingBottom: '50px',
      }}
    >
      <Form>
        <Typography.Title
          level={5}
          style={{ fontSize: '14px', marginBottom: '12px', marginTop: '0' }}
        >
          基础信息
        </Typography.Title>
        <Form.Item label="参数组" required {...formItemLayout}>
          <SelectParamsGroup
            value={group}
            placeholder="请选择"
            onChange={e => setGroup(e)}
          />
        </Form.Item>
        <Form.Item label="参数名" required {...formItemLayout}>
          <Input
            showCount
            maxLength={20}
            value={name}
            placeholder="请输入"
            onChange={e => setName(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="权重值" required {...formItemLayout}>
          <InputNumber
            min={0}
            max={999}
            step={1}
            precision={0}
            value={weight}
            placeholder="请输入"
            onChange={e => setWeight(e ?? undefined)}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="适用分类" {...formItemLayout}>
          <SelectCates
            value={categoryIDs}
            onChange={e => {
              if (Array.isArray(e)) {
                setCategoryIDs(e);
                return;
              }
              setCategoryIDs(undefined);
            }}
          />
        </Form.Item>
        <Typography.Title
          level={5}
          style={{ fontSize: '14px', marginBottom: '12px', marginTop: '0' }}
        >
          参数值列表
        </Typography.Title>
        <Table
          columns={columns}
          dataSource={data}
          pagination={false}
          bordered
        />
        <div
          style={{
            overflow: 'hidden',
            borderBottom: '1px solid rgb(240, 240, 240)',
            borderLeft: '1px solid rgb(240, 240, 240)',
            borderRight: '1px solid rgb(240, 240, 240)',
          }}
        >
          <Button
            onClick={handleAdd}
            type="primary"
            style={{ float: 'right', margin: '13px 10px 13px 0' }}
          >
            添加
          </Button>
        </div>
      </Form>

      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          textAlign: 'right',
          padding: '12px 40px 14px 40px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
        }}
      >
        <Button style={{ marginRight: '30px' }} onClick={() => onOk('cancal')}>
          取消
        </Button>
        <Button
          type="primary"
          onClick={postAwait(async () => {
            if (!name) {
              throw new Error('请输入参数名');
            }
            if (typeof weight !== 'number') {
              throw new Error('请输入权重值');
            }
            await addParamsDefinition(
              {
                group,
                categoryIDs:
                  categoryIDs && categoryIDs.length ? categoryIDs : [],
                name,
                options: [
                  ...new Set(data.map(i => i.name).filter(i => i !== '')),
                ],
                weight,
              },
              { token }
            ).then(() => {
              onOk('ok');
            });
          })}
        >
          确认
        </Button>
      </div>
    </div>
  );
}
