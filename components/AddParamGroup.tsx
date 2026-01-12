'use client';

import { Button, Form, Input, InputNumber } from 'antd';
import { useState } from 'react';
import { postAwait } from '../error';
import { addParamsGroup } from '@zsqk/z1-sdk/es/z1p/params-groups';
import { useTokenContext } from '../datahooks/auth';

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 },
  style: { width: '100%', marginBottom: '22px' },
};
export const reg = new RegExp(/^[\u4e00-\u9fa5a-zA-Z0-9]+$/);
/**
 * [业务组件 FC]新增参数组
 * @param props
 * @returns JSX.Element
 * @author Guo Yafang
 */
export function AddParamGroup(props: {
  onOk: (e: 'cancal' | 'ok') => void;
}): JSX.Element {
  const { token } = useTokenContext();
  const { onOk } = props;
  // 参数组名
  const [name, setName] = useState<string>();
  // 权重值
  const [weight, setWeight] = useState<number>();

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
            const res = await addParamsGroup({ name, weight }, { token });
            if (res) {
              setName(undefined);
              setWeight(undefined);
              onOk('ok');
            }
          })}
        >
          确认
        </Button>
      </div>
    </div>
  );
}
