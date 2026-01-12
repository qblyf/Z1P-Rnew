import { OrderBySort } from '@zsqk/z1-sdk/es/types/basetypes';
import { ParamsGroup } from '@zsqk/z1-sdk/es/types/params-group-types';
import {
  paramsGroupCount,
  paramsGroupList,
} from '@zsqk/z1-sdk/es/z1p/params-groups';
import { Select } from 'antd';
import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useTokenContext } from '../datahooks/auth';

const Option = Select.Option;
/**
 * [通用组件 FC]选择参数组 单选
 * @returns JSX.Element
 * @author Guo Yafang
 */
export default function SelectParamsGroup(props: {
  value: number;
  onChange: (e: number) => void;
  disabled?: boolean;
  placeholder?: string;
}): JSX.Element {
  const { token } = useTokenContext();
  const { value, onChange, disabled, placeholder = '请选择' } = props;
  // 参数组数据
  const [list, setList] = useState<ParamsGroup[]>([]);

  // 获取 参数组 列表
  const fn = useCallback(async () => {
    if (!token) {
      return;
    }
    const count = await paramsGroupCount({}, { token });
    if (count === 0) {
      setList([]);
      return;
    }
    const res = await paramsGroupList(
      {
        limit: count,
        offset: 0,
        orderBy: [
          {
            key: 'weight',
            sort: OrderBySort.升序,
          },
        ],
      },
      { token }
    );
    setList(res);
  }, [token]);

  useEffect(() => {
    fn();
  }, [fn]);

  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  const options = list.map(v => (
    <Option key={v.id} value={v.id}>
      {v.name}
    </Option>
  ));
  return (
    <Select
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
    >
      {options}
    </Select>
  );
}
