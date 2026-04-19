import { notification, message } from 'antd';

// 统一配置 notification 和 message 为侧边弹出
notification.config({
  placement: 'topRight',
  duration: 3,
});

// message.config 类型定义不包含 placement，但功能支持
(message.config as Function)({
  placement: 'topRight',
  duration: 2,
});
