import { TreeSelect } from 'antd';

import { getSPUCateBaseList } from '@zsqk/z1-sdk/es/z1p/product';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SHOW_PARENT = TreeSelect.SHOW_PARENT;
type Data = Awaited<ReturnType<typeof getSPUCateBaseList>>[0];

interface CateOptions {
  value: number;
  label: string;
  title: string;
  key: number;
  pid: number;
  disabled: boolean;
  children?: CateOptions[];
}

export function genOptions(
  cates: Data[],
  filterOptions: number[]
): Array<CateOptions> {
  if (!cates.length) {
    return [];
  }
  const catesArr = cates;
  const cateOptions = catesArr.map((cate: Data) => {
    return {
      value: cate.id,
      label: cate.name,
      title: cate.name,
      key: cate.id,
      pid: cate.pid,
      disabled: !!(filterOptions.length && filterOptions.includes(cate.id)),
      children: [],
    };
  });

  function putIt(pid: number, data: CateOptions[]): CateOptions[] {
    return data.reduce((acc, v) => {
      const arr = acc;
      if (v.pid === pid) {
        const obj = {
          ...v,
          children: putIt(v.value, data).concat(v.children || []),
        };
        arr.push(obj);
      }
      return arr;
    }, [] as CateOptions[]);
  }

  return putIt(0, cateOptions);
}

type Test = Omit<React.ComponentProps<typeof TreeSelect>, 'onChange' | 'value'>;

/**
 * 选择SPU分类 多选
 * @param props
 * @returns JSX.Element
 * @author Guo Yafang
 */
export default function SelectCates(
  props: {
    value?: number[];
    onChange?: (value: number) => void;
  } & Omit<React.ComponentProps<typeof MySelectCate>, 'value' | 'onChange'>
): JSX.Element {
  return (
    <MySelectCate {...(props as React.ComponentProps<typeof MySelectCate>)} />
  );
}

function MySelectCate(
  props: {
    value?: number[] | number;
    onChange?: (value: number[] | number) => void;
    filterOptions?: number[];
    style?: React.CSSProperties;
    showTopCate?: boolean;
  } & Test
): JSX.Element {
  const {
    onChange,
    filterOptions = [],
    dropdownStyle,
    value,
    showTopCate = false,
    ...restProps
  } = props;
  const [cates, setCates] = useState<Data[]>();

  const getCatesList = useCallback(() => {
    const fn = async () => {
      const res = await getSPUCateBaseList();
      setCates(res);
    };
    fn();
  }, []);

  useEffect(() => {
    getCatesList();
  }, [getCatesList]);

  let treeData = useMemo(() => {
    if (cates) {
      return genOptions(cates, filterOptions);
    }
    return [];
  }, [cates, filterOptions]);

  if (showTopCate) {
    treeData = [
      {
        value: 0,
        label: '全部',
        title: '全部',
        key: 0,
        pid: -1,
        disabled: false,
        children: treeData,
      },
    ];
  }

  const newDropdownStyle = {
    ...dropdownStyle,
  };

  return (
    <TreeSelect
      {...restProps}
      multiple
      value={value}
      showSearch={true}
      treeData={treeData}
      onChange={onChange as React.ComponentProps<typeof TreeSelect>['onChange']}
      treeCheckable={false}
      placeholder={value === 0 ? '顶级分类' : '请选择分类'}
      dropdownStyle={newDropdownStyle}
      showCheckedStrategy={SHOW_PARENT}
      getPopupContainer={(triggerNode: { parentNode: HTMLElement }) =>
        triggerNode.parentNode
      }
      filterTreeNode={(inputValue, treeNode) => {
        if (treeNode !== undefined && treeNode.title) {
          return (
            treeNode.title
              .toString()
              .toLocaleLowerCase()
              .indexOf(inputValue.toLocaleLowerCase()) >= 0 ||
            treeNode.spell
              .toString()
              .toLocaleLowerCase()
              .indexOf(inputValue.toLocaleLowerCase()) >= 0
          );
        }
        return false;
      }}
    />
  );
}
