import { notification } from 'antd';

// 侧边通知配置
notification.config({
  placement: 'topRight',
  duration: 3,
});

export const sideNotify = {
  success: (content: string) => {
    notification.success({ message: content });
  },
  error: (content: string) => {
    notification.error({ message: content });
  },
  warning: (content: string) => {
    notification.warning({ message: content });
  },
  info: (content: string) => {
    notification.info({ message: content });
  },
};
