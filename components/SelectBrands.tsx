import { Select, Tag } from 'antd';
import { useEffect, useState } from 'react';
import { useBrandListContext } from '../datahooks/brand';

/**
 * [组件] 选择品牌 (可多选)
 * 
 * 功能点:
 * 
 * 1. 展示品牌.
 * 2. 可多选品牌.
 * 3. 支持默认值.
 * 4. 支持选择后的回调.
 * 5. 支持根据名称和拼音码搜索.
 *
 * 上下文依赖:
 *
 * 1. useBrandListContext
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function SelectBrands(props: {
  defaultSelected?: string[];
  onSelected?: (s: string[]) => void;
}) {
  const { defaultSelected, onSelected } = props;
  const { brandList } = useBrandListContext();

  const [selectedBrands, setSelectedBrands] = useState(defaultSelected);

  // 因为 antd 该组件不支持服务端渲染, 所以特意额外增加副作用
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 500);
  });
  if (loading) {
    return <>loading</>;
  }

  return (
    <Select
      mode="multiple"
      showArrow
      tagRender={props => {
        const { value, closable, onClose } = props;
        const s = brandList.find(v => v.name === value);
        return (
          <Tag
            color={s?.color}
            onMouseDown={event => {
              event.preventDefault();
              event.stopPropagation();
            }}
            closable={closable}
            onClose={onClose}
            style={{ marginRight: 3 }}
          >
            {value}
          </Tag>
        );
      }}
      style={{ width: '100%' }}
      optionFilterProp="label"
      options={brandList.map(v => ({
        label: `${v.name} ${v.spell}`,
        value: v.name,
      }))}
      value={selectedBrands}
      onChange={v => {
        setSelectedBrands(v);
        onSelected && onSelected(v);
      }}
    />
  );
}
