'use client';

import SKUManager from './SKUManager';
import { useSpuIDContext } from '../datahooks/product';

export default function SKUList(props: {
  onWantEditSKU?: (skuID: any) => void;
}) {
  const { spuID } = useSpuIDContext();

  if (!spuID) {
    return (
      <div className="text-center py-8 text-slate-500">
        选择 SPU 以查看 SKU 列表
      </div>
    );
  }

  return (
    <SKUManager
      onWantEditSKU={props.onWantEditSKU}
    />
  );
}
