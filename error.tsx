import { Button, notification, Modal } from 'antd';
import {
  WarningTwoTone,
  CheckCircleTwoTone,
  ClockCircleTwoTone,
} from '@ant-design/icons';

import {
  failureInfoStayTime,
  repeatClickIntervalTime,
  successInfoStayTime,
} from './constants';

// 消息计数器，用于合并重复消息
const messageCounter: Map<string, { count: number; timer: NodeJS.Timeout | null }> = new Map();
const MESSAGE_MERGE_WINDOW = 2000; // 2秒内的相同消息会被合并

/**
 * 显示可合并的成功消息
 */
function showMergedSuccessMessage(content: string, key: string) {
  const existing = messageCounter.get(content);
  
  if (existing) {
    // 已有相同消息，增加计数
    existing.count++;
    if (existing.timer) {
      clearTimeout(existing.timer);
    }
    
    // 更新消息显示
    notification.success({
      message: existing.count > 1 ? `${content} ×${existing.count}` : content,
      key: content, // 使用内容作为key，确保相同消息会被更新而不是新建
    });

    // 设置清理定时器
    existing.timer = setTimeout(() => {
      messageCounter.delete(content);
    }, MESSAGE_MERGE_WINDOW);
  } else {
    // 新消息
    messageCounter.set(content, { count: 1, timer: null });
    notification.success({
      message: content,
      key: content,
    });
    
    // 设置清理定时器
    const timer = setTimeout(() => {
      messageCounter.delete(content);
    }, MESSAGE_MERGE_WINDOW);
    messageCounter.get(content)!.timer = timer;
  }
}

/**
 * [通用] 等待
 * @param time 要等待的毫秒
 */
export async function wait(time = 1000, v?: unknown): Promise<typeof v> {
  return new Promise((reslove, reject) => {
    setTimeout(() => reslove(v), time);
  });
}

/**
 * [通用] 等待 特定条件
 *
 * @returns 重试的次数
 */
export async function waitFor(
  fn: () => boolean,
  { interval = 1000, max = 10 }: { interval?: number; max?: number } = {}
): Promise<number> {
  let time = 0;
  while (fn() && time < max) {
    await wait(interval);
    time++;
  }
  return time;
}

/**
 * (仅限最外层使用) 异步请求的 UI 处理
 * 在外部包裹异步请求函数, 自带统一的 UI 处理.
 * @param fetchFromApi - 异步函数
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function postAwait<T extends (...args: any[]) => Promise<any>>(
  fetchFromApi: T,
  {
    timeoutThreshold = repeatClickIntervalTime,
    confirmText = '确认要执行这一请求吗?',
    successText = '请求处理成功.',
    showSuccess = true,
  }: {
    /** 超时时间, 默认为 repeatClickIntervalTime */
    timeoutThreshold?: number;
    /** 确认的文字 */
    confirmText?: string;
    /** 执行成功后的文字 */
    successText?: string;
    /** 是否显示成功提示，默认为 true */
    showSuccess?: boolean;
  } = {}
) {
  return async (...rest: Parameters<T>): Promise<void> => {
    /** 是否已超时 */
    let stop = false;
    const m = Modal.info({
      title: confirmText,
      content: (
        <>
          如要取消, 请按键盘 Ecs 键或
          <Button type="link" size="small" onClick={() => m.destroy()}>
            点此
          </Button>
        </>
      ),
      autoFocusButton: 'ok',
      okText: '确定',
      onOk: async () => {
        try {
          m.update({
            title: '处理中...',
            content: '正在处理请求, 请稍等.',
            icon: <ClockCircleTwoTone />,
            keyboard: false,
          });
          await Promise.race([
            fetchFromApi(...rest),
            new Promise((_resolve, reject) => {
              setTimeout(() => {
                stop = true;
                reject(new Error('数据获取超时.'));
              }, timeoutThreshold);
            }),
          ]);
          // 关闭 Modal
          m.destroy();
          // 使用非阻塞的 message 提示
          if (showSuccess) {
            notification.success({ message: successText });
          }
        } catch (err) {
          if (stop) {
            // 超时错误
            m.update({
              title: '超时警告',
              content: (
                <>
                  请求处理时间过长. 可以继续等待一段时间,
                  等待一段时间后可能会返回成功的结果.
                  如果等待时间过长, 也可以重新查看一下数据, 看是否已经生效.
                  如果没有生效, 可以稍后重试.
                </>
              ),
              icon: <WarningTwoTone twoToneColor="#ffc107" />,
              keyboard: true,
            });
          } else if (err instanceof Error) {
            // 正常错误处理
            m.update({
              title: '失败',
              content: `请求处理失败: ${renderErrMsg(err)}`,
              icon: <WarningTwoTone twoToneColor="red" />,
              onOk: undefined,
              keyboard: true,
            });
          } else {
            // 异常错误处理, 错误不是 Error
            console.error(err);
            m.update({
              title: '失败',
              content: '请求处理失败.',
              icon: <WarningTwoTone twoToneColor="red" />,
              onOk: undefined,
              keyboard: true,
            });
          }

          wait(failureInfoStayTime).then(() => {
            m.destroy();
          });
          throw err;
        }
      },
    });
  };
}

/**
 * 渲染错误
 * @author Lian Zheren <lzr@go0356.com>
 */
function renderErrMsg(err: Error): string {
  const errMsg = err.message;
  if (errMsg.startsWith('USER ')) {
    return errMsg.substring(5);
  }
  if (errMsg.startsWith('DB ')) {
    console.error(err);
    return `数据库发生错误`;
  }
  return err.toString();
}

/**
 * (仅限最外层使用) 异步请求的 UI 处理 (仅限 **幂等操作** 使用)
 * 在外部包裹异步请求函数, 自带统一的 UI 处理.
 * @param fetchFromApi - 异步函数
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function getAwait<
  T extends (...args: any[]) => Promise<any>,
  R extends ReturnType<T>
>(
  fetchFromApi: T,
  {
    timeoutThreshold = repeatClickIntervalTime,
    finallyCallback,
    showSuccess = true,
  }: {
    /** 超时时间, 默认为 repeatClickIntervalTime */
    timeoutThreshold?: number;
    finallyCallback?: (state?: Error, res?: Awaited<R>) => void;
    /** 是否显示成功提示，默认为 true */
    showSuccess?: boolean;
  } = {}
) {
  return async (...rest: Parameters<T>): Promise<void> => {
    /** 是否已超时 */
    let stop = false;
    const key = Math.random().toString();
    notification.info({ message: '正在处理请求, 请稍等.', key });

    try {
      const data = await Promise.race([
        fetchFromApi(...rest),
        new Promise((_resolve, reject) => {
          setTimeout(() => {
            stop = true;
            reject(new Error('数据获取超时.'));
          }, timeoutThreshold);
        }),
      ]);
      notification.destroy(key);
      if (showSuccess) {
        notification.success({ message: '请求处理成功.' });
      }
      if (typeof finallyCallback === 'function') {
        finallyCallback(undefined, data);
      }
    } catch (err) {
      notification.destroy(key);
      let errorMsg = '';
      if (stop) {
        errorMsg = '请求处理超时, 可以重试.';
        notification.warning({ message: errorMsg });
      } else if (err instanceof Error) {
        errorMsg = `请求处理失败: ${err.name} ${err.message}`;
        notification.error({ message: errorMsg });
      } else {
        errorMsg = '请求处理失败.';
        notification.error({ message: errorMsg });
        console.error(err);
      }
      if (typeof finallyCallback === 'function') {
        finallyCallback(new Error(errorMsg));
      }
    }
  };
}

/**
 * (仅限最外层使用) 异步请求的 UI 处理 (仅限 **幂等操作** 使用)
 * 在外部包裹异步请求函数, 自带统一的 UI 处理.
 * 与 getAwait 的主要区别是非侵入性的 UI 提醒.
 *
 * @param fetchFromApi - 异步函数
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function lessAwait<
  T extends (...args: any[]) => Promise<any>,
  R extends ReturnType<T>
>(
  fetchFromApi: T,
  {
    timeoutThreshold = repeatClickIntervalTime,
    finallyCallback,
    showSuccess = true,
  }: {
    /** 超时时间, 默认为 repeatClickIntervalTime */
    timeoutThreshold?: number;
    finallyCallback?: (state?: Error, res?: Awaited<R>) => void;
    /** 是否显示成功提示，默认为 true */
    showSuccess?: boolean;
  } = {}
) {
  const key = Math.random().toString();
  return async (...rest: Parameters<T>): Promise<void> => {
    /** 是否已超时 */
    let stop = false;
    notification.info({ message: '正在处理请求, 请稍等.', key });

    try {
      const data = await Promise.race([
        fetchFromApi(...rest),
        new Promise((_resolve, reject) => {
          setTimeout(() => {
            stop = true;
            reject(new Error('数据获取超时.'));
          }, timeoutThreshold);
        }),
      ]);
      notification.destroy(key); // 先销毁loading消息
      if (showSuccess) {
        showMergedSuccessMessage('请求处理成功.', key);
      }
      if (typeof finallyCallback === 'function') {
        finallyCallback(undefined, data);
      }
    } catch (err) {
      let errorMsg = '';
      let color = '';
      if (stop) {
        errorMsg = '请求处理超时, 可以重试.';
        color = '#52c41a';
      } else if (err instanceof Error) {
        errorMsg = `请求处理失败: ${err.name} ${err.message}`;
        color = 'red';
      } else {
        errorMsg = '请求处理失败.';
        color = 'red';
        console.error(err);
      }
      notification.error({
        message: (
          <>
            {errorMsg}
            {'  '}
            <a
              onClick={() => {
                notification.destroy(key);
              }}
            >
              关闭
            </a>
          </>
        ),
        key,
      });
      if (typeof finallyCallback === 'function') {
        finallyCallback(new Error(errorMsg));
      }
    }
  };
}
