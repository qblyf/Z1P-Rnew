import { ColProps, FormProps } from 'antd';

/**
 * 常见 antd Form props
 */
export const formColProps: FormProps = {
  labelCol: {
    xs: { span: 8 },
  },
  wrapperCol: {
    xs: { span: 16 },
  },
  labelWrap: true,
};

/**
 * 常见 antd Form Iem Col props 配置
 */
export const formItemCol: ColProps = {
  xs: { span: 24 },
  sm: { span: 12 },
  md: { span: 8 },
  xl: { span: 6 },
};
