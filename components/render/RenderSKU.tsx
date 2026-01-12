import { BaseCache } from '@zsqk/z1-sdk/es/z1p/cache';
import { SKU, SkuID } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { useEffect, useState } from 'react';

import { getSKUsInfo } from '../../data/product';

/**
 * [组件] 渲染 SKU 信息
 *
 * 功能点:
 *
 * 1. 使用缓存功能进行 SKU 的数据获取.
 * 2. 可以渲染 SKU 的主要信息.
 * 3. 支持渲染数组属性.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function RenderSKU(props: {
  id: SkuID;
  propertyName: keyof SKU;
}): JSX.Element {
  const { id, propertyName } = props;
  const [sku, setSKU] = useState<BaseCache<SKU>>();

  // 当 SKU ID 变动后, 加载相关数据.
  useEffect(() => {
    (async () => {
      const sku = (await getSKUsInfo([id])).find(v => v.id === id);
      if (sku === undefined) {
        throw new Error('缓存出现额外的 未返回数据 错误');
      }
      setSKU(sku);
    })().catch(err => {
      console.error(err);
    });
  }, [id]);

  // 只要用了缓存, 应该必然会加载出数据. 如果没有 sku, 则一般是因为加载中.
  // 但是如果网络失败, 则可能刷新前不再会加载.
  if (!sku) {
    return <>未加载</>;
  }

  // 如果缓存没有错误, 则直接显示结果即可.
  if (!('errInfo' in sku)) {
    const v = sku[propertyName];
    let t = '';
    if (Array.isArray(v)) {
      t = v.join(', ');
    } else {
      t = `${v}`;
    }
    return <>{t}</>;
  }

  // 如果缓存有错, 一般是因为数据不存在.
  return <>无</>;
}
