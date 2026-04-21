import { SPUCateID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { Alert, Select } from 'antd';
import { useSPUCateListContext } from '../datahooks/product';

const { Option } = Select;

/**
 * [组件] 选择 SPU 分类
 * 
 * 功能点:
 * 
 * 1. 选择 SPU 分类.
 * 2. 可以设置受控值.
 * 3. 可以设置默认值.
 * 4. 对错误数据进行提醒.
 * 5. 默认显示名称和 ID.
 * 
 * @author Lian Zheren <lzr@go0356.com>
 */
export default function SelectSPUCate(props: {
  onSelect: (id: SPUCateID) => void;
  defaultSPUCateID?: SPUCateID;
  selectedSPUCateID?: SPUCateID;
}) {
  const { onSelect, defaultSPUCateID, selectedSPUCateID } = props;
  const { spuCateList: data } = useSPUCateListContext();

  let warn = <></>;
  if (selectedSPUCateID) {
    if (!data.some(v => v.id === selectedSPUCateID)) {
      warn = (
        <Alert message="当前选中了无效的 SPU 分类, 请注意" type="warning" />
      );
    }
  }

  return (
    <>
      <Select
        style={{ minWidth: '5em' }}
        defaultValue={defaultSPUCateID}
        value={selectedSPUCateID}
        showSearch
        placeholder="选择 SPU"
        optionFilterProp="keywords"
        onChange={v => {
          onSelect(v);
        }}
      >
        <Option key={0} value={0} keywords="top">
          顶级
        </Option>
        {data.map(v => {
          return (
            <Option
              key={v.id}
              value={v.id}
              keywords={`${v.number + v.name}`.toLowerCase()}
            >
              {v.name} <span className="number">({v.id})</span>
            </Option>
          );
        })}
      </Select>
      {warn}
      <style jsx>
        {`
          .number {
            color: cadetblue;
            font-size: 0.6em;
          }
        `}
      </style>
    </>
  );
}

export { SelectSPUCate };
