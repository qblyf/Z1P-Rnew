import { getBrandBaseList } from '@zsqk/z1-sdk/es/z1p/brand';
import { useCallback, useEffect, useState } from 'react';
import constate from 'constate';

import { lessAwait } from '../error';

/**
 * [Hook] 当前使用的 品牌 列表数据
 * @author Lian Zheren <lzr@go0356.com>
 */
function useBrandList() {
  const [brandList, setBrandList] = useState<
    Awaited<ReturnType<typeof getBrandBaseList>>
  >([]);

  const update = useCallback(
    () =>
      lessAwait(async () => {
        const d = await getBrandBaseList();
        setBrandList(d);
      })(),
    [setBrandList]
  );

  useEffect(() => {
    update();
  }, [update]);

  return { brandList, setBrandList, reUpdate: update };
}

export const [BrandListProvider, useBrandListContext] = constate(useBrandList);
