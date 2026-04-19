import { notification } from 'antd';

// 统一配置 notification 为侧边弹出
notification.config({
  placement: 'topRight',
  duration: 3,
});

// 字符串形式的便捷方法（兼容原有 message API）
const notif = {
  success: (msg: string) => notification.success({ message: msg }),
  error: (msg: string) => notification.error({ message: msg }),
  warning: (msg: string) => notification.warning({ message: msg }),
  info: (msg: string) => notification.info({ message: msg }),
};

export default notif;
