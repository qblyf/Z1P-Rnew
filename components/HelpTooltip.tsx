import { QuestionCircleTwoTone } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { CSSProperties } from 'react';

/**
 * [组件] 帮助信息
 * 
 * 功能点:
 * 
 * 1. 可以一致化显示帮助信息提示.
 * 2. 可以在使用时自定义样式.
 * 
 * @author Lian Zheren <lzr@go0356.com>
 */
export function HelpTooltip(props: { title: string; style?: CSSProperties }) {
  const { style = {} } = props;
  return (
    <span style={{ cursor: 'help', ...style }}>
      <Tooltip title={props.title}>
        <QuestionCircleTwoTone />
      </Tooltip>
    </span>
  );
}
