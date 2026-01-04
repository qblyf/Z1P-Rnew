'use client';

import { Button, Form, Input, InputNumber } from 'antd';
import { useState } from 'react';
import { postAwait } from '../error';
import { editParamsGroup } from '@zsqk/z1-sdk/es/z1p/params-groups';
import { useTokenContext } from '../datahooks/auth';
import { MyParamsGroup } from '../app/product-param-manage/page';
import { reg } from './AddParamGroup';

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 },
  style: { width: '100%', marginBottom: '22px' },
};
/**
 * [业务组件 FC]编辑组件
 * @param props
 * @returns JSX.Element
 * @author Guo Yafang
 */
export function EditParamGroup(props: {
  data: MyParamsGroup;
  onOk: (e: 'cancal' | 'ok') => void;
}): JSX.Element {
  const { token } = useTokenContext();
  const { data, onOk } = props;
  // 参数组名
  const [name, setName] = useState<string | undefined>(data.name);
  // 权重值
  const [weight, setWeight] = useState<number | undefined>(data.weight);

  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }
  return (
    <div
      style={{
        overflowY: 'auto',
        paddingBottom: '119px',
      }}
    >
      <Form>
        <Form.Item
          label="参数组名称"
          required
          {...formItemLayout}
          extra="说明：不允许输入空格和特殊字符，只允许汉字、字母和数字，限制10个字符长度"
        >
          <Input
            value={name}
            showCount
            maxLength={10}
            placeholder="请输入"
            style={{ marginBottom: '7px' }}
            onChange={e => setName(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="权重值" required {...formItemLayout}>
          <InputNumber
            value={weight}
            min={0}
            max={999}
            step={1}
            precision={0}
            placeholder="请输入"
            style={{ marginBottom: '27px', width: '100%' }}
            onChange={e => setWeight(e ?? undefined)}
          />
        </Form.Item>
      </Form>

      <div
        style={{
          borderTop: '1px solid #f0f0f0',
          textAlign: 'right',
          padding: '12px 40px 14px 40px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          background: '#fff',
          right: 0,
        }}
      >
        <Button style={{ marginRight: '30px' }} onClick={() => onOk('cancal')}>
          取消
        </Button>
        <Button
          type="primary"
          onClick={postAwait(async () => {
            if (!name) {
              throw new Error('请输入参数组名称');
            }
            if (!reg.test(name)) {
              throw new Error(
                '参数组名称不允许输入空格和特殊字符，只允许汉字、字母和数字'
              );
            }
            if (typeof weight !== 'number') {
              throw new Error('请输入权重值');
            }
            await editParamsGroup(
              { id: data.id, name, weight },
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
