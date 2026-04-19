import { notification } from 'antd';

// 统一配置 notification 为侧边弹出
notification.config({
  placement: 'topRight',
  duration: 3,
});

// 创建兼容 message API 的 wrapper（统一为侧边弹出）
export const message = {
  success: (content: string) => notification.success({ message: content }),
  error: (content: string) => notification.error({ message: content }),
  warning: (content: string) => notification.warning({ message: content }),
  info: (content: string) => notification.info({ message: content }),
};
