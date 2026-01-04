import { genCacheFunc } from '@zsqk/z1-sdk/es/z1p/cache';
import { getSKUsInfo as getSKUsInfoAPI } from '@zsqk/z1-sdk/es/z1p/product';

export const [getSKUsInfo, concatSKUsInfo] = genCacheFunc(getSKUsInfoAPI);

/**
 * 获取一个 SKU 的信息 (利用缓存)
 * @author Lian Zheren <lzr@go0356.com>
 */
export async function getSKUInfo(id: number) {
  const res = await getSKUsInfo([id]);
  const c = res.find(v => v.id === id);
  if (!c || 'errInfo' in c) {
    return undefined;
  }
  return c;
}

/**
 * 更新 SKU 信息 (强制更新缓存)
 * @author Lian Zheren <lzr@go0356.com>
 */
export async function updateSKUInfo(id: number) {
  const res = await getSKUsInfoAPI([id]);
  concatSKUsInfo(res);
}
