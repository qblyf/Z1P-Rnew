'use client';
import { Drawer } from 'antd';
import Head from 'next/head';
import { useEffect, useMemo } from 'react';
import { orderSPUCate } from '@zsqk/z1-sdk/es/z1p/product';
import update from 'immutability-helper';

import { HelpTooltip } from '../../components/HelpTooltip';
import SKUManager from '../../components/SKUManager';
import { SKUEdit } from '../../components/SKUEdit';
import SPUAdd from '../../components/SPUAdd';
import SPUCateAdd from '../../components/SPUCateAdd';
import SPUCateEdit from '../../components/SPUCateEdit';
import { SPUCateListWithEdit } from '../../components/SPUCateList';
import SPUEdit from '../../components/SPUEdit';
import SPUList from '../../components/SPUList';
import { BrandListProvider } from '../../datahooks/brand';
import {
  SPUCateIDProvider,
  SPUCateListProvider,
  SPUListProvider,
  SpuIDProvider,
  useSPUCateIDContext,
  useSpuIDContext,
  useSPUCateListContext,
} from '../../datahooks/product';
import { useEditMode } from '../../datahooks/useEditMode';
import { ResponsiveProductLayout } from '../../components/Layout/ResponsiveProductLayout';
import PageWrap from '../../components/PageWrap';
import { lessAwait } from '../../error';
import { useTokenContext } from '../../datahooks/auth';

function updateSPUCateList(
  spuCateList: any[],
  changes: Array<{ id: any } & any>
) {
  if (changes.length === 0) {
    return spuCateList;
  }
  const obj: any = {};
  for (const { id, ...rest } of changes) {
    const i = spuCateList.findIndex(v => v.id === id);
    if (i === -1) {
      throw new Error('data spuCateList');
    }
    obj[i] = Object.fromEntries(
      Object.entries(rest).map(([k, v]) => [k, { $set: v }])
    );
  }
  return update(spuCateList, obj);
}

export default function ProductManagerWithHeader() {
  return (
    <PageWrap ppKey="product-manage">
      <SPUCateListProvider>
        <SPUCateIDProvider>
          <SpuIDProvider>
            <SPUListProvider>
              <div className="p-4">
                <ProductManager />
              </div>
            </SPUListProvider>
          </SpuIDProvider>
        </SPUCateIDProvider>
      </SPUCateListProvider>
    </PageWrap>
  );
}

/**
 * [页面] 商品管理页面
 *
 * 支持的编辑功能:
 * 1. 修改 SPU 分类
 * 2. 新增 SPU 分类
 * 3. 新增 SPU
 * 4. 编辑 SPU
 * 5. 新增 SKU
 * 6. 修改 SKU
 *
 * 响应式设计:
 * - 手机 (<768px): Tab 切换
 * - 平板 (768px-1024px): Tab 切换
 * - 桌面 (≥1024px): 三栏布局
 */
export function ProductManager() {
  const { mode, preSPUCateID, selectedSkuID, setMode, setPreSPUCateID, setSelectedSkuID, reset, isEditing } = useEditMode('none');
  const { spuCateID, setSpuCateID } = useSPUCateIDContext();
  const { spuID, setSpuID } = useSpuIDContext();
  const { spuCateList, setSPUCateList } = useSPUCateListContext();
  const { spuList } = useSpuListContext();
  const { token } = useTokenContext();

  // 解决 SSR 问题
  useEffect(() => {
    // 组件挂载后的初始化
  }, []);

  // SPU 分类内容 - 仅显示列表
  const spuCateContent = useMemo(() => {
    return (
      <>
        <h2 className="text-lg font-bold mb-4 text-slate-800">
          商品分类
        </h2>
        <SPUCateListWithEdit
          onAddClick={() => {
            setPreSPUCateID(spuCateID);
            setMode('spucate');
            setSpuCateID(undefined);
          }}
          onEditClick={() => setMode('spucate')}
          onMoveUp={lessAwait(async () => {
            if (!token || !spuCateID) return;
            const changes = await orderSPUCate(spuCateID, 'up', {
              auth: token,
            });
            setSPUCateList(updateSPUCateList(spuCateList, changes));
          })}
          onMoveDown={lessAwait(async () => {
            if (!token || !spuCateID) return;
            const changes = await orderSPUCate(spuCateID, 'down', {
              auth: token,
            });
            setSPUCateList(updateSPUCateList(spuCateList, changes));
          })}
        />
      </>
    );
  }, [spuCateID, setMode, setPreSPUCateID, setSpuCateID, token, spuCateList, setSPUCateList]);

  // SPU 内容 - 仅显示列表
  const spuContent = useMemo(() => {
    return (
      <>
        <h2 className="text-lg font-bold mb-4 text-slate-800">
          SPU 管理
          <HelpTooltip
            title="在非编辑 SPU 模式下, 双击可以编辑选中的 SPU."
            style={{ fontSize: '0.6em', marginLeft: '0.2em' }}
          />
        </h2>
        {!spuCateID ? (
          <div className="text-center py-8 text-slate-500">
            选择 SPU 分类以查看 SPU 列表
          </div>
        ) : (
          <BrandListProvider>
            <SPUList
              onWandEditSPU={() => {
                setMode('spu');
              }}
              onAddClick={() => {
                setMode('spu');
                setSpuID(undefined);
              }}
            />
          </BrandListProvider>
        )}
      </>
    );
  }, [spuCateID, setMode, setSpuID]);

  // SKU 内容
  const skuContent = useMemo(() => {
    return (
      <>
        <h2 className="text-lg font-bold mb-4 text-slate-800">
          SKU 管理
        </h2>
        {spuID ? (
          <SKUManager
            onWantEditSKU={(skuID) => {
              setMode('sku');
              setSelectedSkuID(skuID);
            }}
          />
        ) : (
          <div className="text-center py-8 text-slate-500">
            选择 SPU 以查看 SKU 列表
          </div>
        )}
      </>
    );
  }, [spuID]);

  // 编辑内容 - 用于 Drawer
  const editContent = useMemo(() => {
    if (mode === 'spucate') {
      return spuCateID ? <SPUCateEdit /> : <SPUCateAdd pid={preSPUCateID} />;
    }
    if (mode === 'spu') {
      if (spuID) {
        return (
          <BrandListProvider>
            <SPUEdit />
          </BrandListProvider>
        );
      } else {
        return (
          <BrandListProvider>
            <SPUAdd />
          </BrandListProvider>
        );
      }
    }
    if (mode === 'sku') {
      return selectedSkuID ? <SKUEdit selectedSkuID={selectedSkuID} /> : null;
    }
    return null;
  }, [mode, spuCateID, spuID, preSPUCateID, selectedSkuID]);

  // 获取 Drawer 标题
  const getDrawerTitle = () => {
    if (mode === 'spucate') {
      return spuCateID ? '编辑 SPU 分类' : '新增 SPU 分类';
    }
    if (mode === 'spu') {
      if (spuID) {
        const spu = spuList.find(s => s.id === spuID);
        const spuName = spu?.name || 'SPU';
        return `编辑 ${spuName}`;
      }
      return '新增 SPU';
    }
    if (mode === 'sku') {
      return '编辑 SKU';
    }
    return '';
  };

  // 获取响应式 Drawer 宽度
  const getDrawerWidth = () => {
    if (typeof window === 'undefined') return '33.33%';
    return '33.33%';
  };

  return (
    <>
      <Head>
        <title>商品管理</title>
      </Head>

      <ResponsiveProductLayout
        spuCateContent={spuCateContent}
        spuContent={spuContent}
        skuContent={skuContent}
        isEditing={isEditing}
        editContent={null}
      />

      <Drawer
        title={getDrawerTitle()}
        placement="right"
        onClose={reset}
        open={isEditing}
        width={getDrawerWidth()}
      >
        {editContent}
      </Drawer>
    </>
  );
}
