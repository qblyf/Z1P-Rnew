import { notification } from 'antd';
import { useEffect } from 'react';

// 统一配置 notification 为侧边弹出
export function setupNotificationConfig() {
  notification.config({
    placement: 'topRight',
    duration: 3,
  });
}

// 在组件外部配置会有 Maximum update depth exceeded 警告
// 所以改为在 ClientLayout 中通过 useEffect 调用

// 字符串形式的便捷方法（兼容原有 message API）
const notif = {
  success: (msg: string) => notification.success({ message: msg }),
  error: (msg: string) => notification.error({ message: msg }),
  warning: (msg: string) => notification.warning({ message: msg }),
  info: (msg: string) => notification.info({ message: msg }),
};

export default notif;
