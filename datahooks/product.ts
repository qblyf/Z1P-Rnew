import { SPUCateID, SpuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUCateBaseList, getSPUList } from '@zsqk/z1-sdk/es/z1p/product';
import constate from 'constate';
import { useCallback, useEffect, useState } from 'react';
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
    Awaited<ReturnType<typeof getSPUList>>
  >([]);

  const { spuCateID } = useSPUCateIDContext();
  const { setSpuID } = useSpuIDContext();

  useEffect(() => {
    lessAwait(async () => {
      // 如果 spuCateID 为空，获取所有 SPU；否则获取指定分类的 SPU
      const d = spuCateID 
        ? await getSPUList({ spuCateIDs: [spuCateID] })
        : await getSPUList({});
      setSpuList(d);
      setSpuID(undefined);
    })();
  }, [spuCateID]);

  return { spuList, setSpuList };
}

export const [SPUListProvider, useSpuListContext] = constate(useSPUList);
