import dayjs, { Dayjs } from 'dayjs';

/** 可接受的日期格式 */
type OriginalDate =
  | {
      /** UNIX 时间戳 */
      unix: number;
    }
  | {
      /** 日期对象 */
      date: Date;
    }
  | {
      /** Dayjs 对象 */
      dayjs: Dayjs;
    }
  | {
      /** ISO 格式的日期 */
      ISO: string;
    };

/** 渲染日期 */
function renderDate(v: OriginalDate, opt: { format: string }): string {
  if ('unix' in v) {
    return dayjs(v.unix * 1000).format(opt.format);
  }
  if ('date' in v) {
    return dayjs(v.date).format(opt.format);
  }
  if ('dayjs' in v) {
    return v.dayjs.format(opt.format);
  }
  if ('ISO' in v) {
    return dayjs(v.ISO).format(opt.format);
  }
  return '未知日期';
}

/**
 * [通用组件] 渲染日期精确到分钟 格式为 `YYYY-MM-DD HH:mm`
 */
export function RenderDateMinute(props: OriginalDate): JSX.Element {
  const format = 'YYYY-MM-DD HH:mm';
  return <>{renderDate(props, { format })}</>;
}

/**
 * [通用组件] 渲染时分 格式为 `HH:mm`
 */
export function RenderHourMinute(props: OriginalDate): JSX.Element {
  const format = 'HH:mm';
  return <>{renderDate(props, { format })}</>;
}
