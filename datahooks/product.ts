import { SPUCateID, SpuID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUCateBaseList, getSPUListNew } from '@zsqk/z1-sdk/es/z1p/product';
import constate from 'constate';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { getAwait, lessAwait } from '../error';

/**
 * [Hook] 当前选中的 SPU 分类 ID
 * @author Lian Zheren <lzr@go0356.com>
 */
function useSPUCateID() {
  const [spuCateID, setSelected] = useState<SPUCateID | undefined>(undefined);
  const setSpuCateID = useCallback((v: SPUCateID | undefined) => setSelected(v), []);
  return { spuCateID, setSpuCateID };
}

export const [SPUCateIDProvider, useSPUCateIDContext] = constate(useSPUCateID);

/**
 * [Hook] 当前使用的 SPU 分类 列表数据
 * @author Lian Zheren <lzr@go0356.com>
 */
function useSPUCateList() {
  const [spuCateList, setSPUCateList] = useState<
    Awaited<ReturnType<typeof getSPUCateBaseList>>
  >([]);

  const update = useCallback(
    () =>
      getAwait(async () => {
        const d = await getSPUCateBaseList().catch(err => {
          console.error('可能为网络错误', err);
          return [];
        });
        setSPUCateList(d);
      })(),
    []
  );

  useEffect(() => {
    update();
  }, [update]);

  return { spuCateList, setSPUCateList, reUpdate: update };
}

export const [SPUCateListProvider, useSPUCateListContext] =
  constate(useSPUCateList);

/**
 * @author Lian Zheren <lzr@go0356.com>
 */
export function useSPUCateListUpdate() {
  const { reUpdate } = useSPUCateListContext();
  const fn = useCallback(reUpdate, []);
  return fn;
}

/**
 * [Hook] 当前选中的 SPU ID
 * @author Lian Zheren <lzr@go0356.com>
 */
function useSpuID() {
  const [spuID, setSelected] = useState<SpuID | undefined>(undefined);
  const setSpuID = useCallback((v: SpuID | undefined) => setSelected(v), []);
  return { spuID, setSpuID };
}

export const [SpuIDProvider, useSpuIDContext] = constate(useSpuID);

/**
 * [Hook] 当前使用的 SPU 列表数据
 * @author Lian Zheren <lzr@go0356.com>
 */
function useSPUList() {
  const [spuList, setSpuList] = useState<
    Awaited<ReturnType<typeof getSPUListNew>>
  >([]);
  const [isPending, startTransition] = useTransition();

  const { spuCateID } = useSPUCateIDContext();
  const { setSpuID } = useSpuIDContext();

  const update = useCallback(() => {
    // 使用startTransition标记为低优先级更新，不阻塞用户交互
    startTransition(() => {
      lessAwait(async () => {
        // 使用 getSPUListNew 获取 SPU 列表
        const d = await getSPUListNew(
          {
            ...(spuCateID ? { cateIDs: [spuCateID] } : {}),
            states: [SPUState.在用],
            limit: 10000,
            offset: 0,
            orderBy: [{ key: 'p."order"', sort: 'DESC' }],
          },
          ['id', 'name', 'brand', 'series', 'generation', 'order']
        );
        setSpuList(d as any);
        setSpuID(undefined);
      })();
    });
  }, [spuCateID, setSpuID]);

  useEffect(() => {
    update();
  }, [update]);

  return { spuList, setSpuList, isPending };
}

export const [SPUListProvider, useSpuListContext] = constate(useSPUList);
