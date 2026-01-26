'use client';
import { Drawer, message } from 'antd';
import Head from 'next/head';
import { useEffect, useMemo, useState } from 'react';
import { orderSPUCate, getSPUInfo, getSKUsInfo as getSKUsInfoAPI } from '@zsqk/z1-sdk/es/z1p/product';
import { getSKUsInfo } from '../../data/product';
import update from 'immutability-helper';

import { HelpTooltip } from '../../components/HelpTooltip';
import SKUManager from '../../components/SKUManager';
import SKUList from '../../components/SKUList';
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
  const { token } = useTokenContext();
  const [spuEditDefaultTab, setSpuEditDefaultTab] = useState<string>('basic');
  const [editingSpuName, setEditingSpuName] = useState<string>('');
  const [editingSkuName, setEditingSkuName] = useState<string>('');

  // 解决 SSR 问题
  useEffect(() => {
    // 组件挂载后的初始化
  }, []);

  // 当 SPU ID 变化时，获取 SPU 名称
  useEffect(() => {
    if (mode === 'spu' && spuID) {
      const fetchSpuName = async () => {
        try {
          const spu = await getSPUInfo(spuID);
          setEditingSpuName(spu.name);
        } catch (error) {
          console.error('获取 SPU 名称失败:', error);
          setEditingSpuName('');
        }
      };
      fetchSpuName();
    } else {
      setEditingSpuName('');
    }
  }, [mode, spuID]);

  // 当 SKU ID 变化时，获取 SKU 名称 - 使用 API 直接获取，不使用缓存
  useEffect(() => {
    if (mode === 'sku' && selectedSkuID) {
      const fetchSkuName = async () => {
        try {
          const skuInfo = await getSKUsInfoAPI([selectedSkuID]);
          if (skuInfo && skuInfo.length > 0 && !('errInfo' in skuInfo[0])) {
            setEditingSkuName(skuInfo[0].name);
          }
        } catch (error) {
          console.error('获取 SKU 名称失败:', error);
          setEditingSkuName('');
        }
      };
      fetchSkuName();
    } else {
      setEditingSkuName('');
    }
  }, [mode, selectedSkuID]);

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
        <BrandListProvider>
          <SPUList
            onWandEditSPU={() => {
              setSpuEditDefaultTab('basic');
              setMode('spu');
            }}
            onAddClick={() => {
              setSpuEditDefaultTab('basic');
              setMode('spu');
              setSpuID(undefined);
            }}
          />
        </BrandListProvider>
      </>
    );
  }, [spuCateID, setMode, setSpuID, setSpuEditDefaultTab]);

  // SKU 内容
  const skuContent = useMemo(() => {
    return (
      <>
        <h2 className="text-lg font-bold mb-4 text-slate-800">
          SKU 管理
          <HelpTooltip
            title="显示所有 SKU 或选中 SPU 的 SKU。双击可以编辑选中的 SKU。"
            style={{ fontSize: '0.6em', marginLeft: '0.2em' }}
          />
        </h2>
        <BrandListProvider>
          <SKUList
            onWantEditSKU={(skuID) => {
              setMode('sku');
              setSelectedSkuID(skuID);
            }}
            onAddClick={() => {
              if (!spuID) {
                message.warning('请在SPU管理中选择要新增SKU的载体');
                return;
              }
              // 打开SPU编辑抽屉并切换到SKU编辑标签
              setSpuEditDefaultTab('sku');
              setMode('spu');
            }}
          />
        </BrandListProvider>
      </>
    );
  }, [spuID, setMode, setSelectedSkuID, setSpuEditDefaultTab]);

  // 编辑内容 - 用于 Drawer
  const editContent = useMemo(() => {
    if (mode === 'spucate') {
      return spuCateID ? <SPUCateEdit /> : <SPUCateAdd pid={preSPUCateID} />;
    }
    if (mode === 'spu') {
      if (spuID) {
        return (
          <BrandListProvider>
            <SPUEdit defaultTab={spuEditDefaultTab} />
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
      return selectedSkuID ? (
        <SKUEdit 
          selectedSkuID={selectedSkuID}
          onNameChange={(name) => {
            setEditingSkuName(name);
          }}
        />
      ) : null;
    }
    return null;
  }, [mode, spuCateID, spuID, preSPUCateID, selectedSkuID, spuEditDefaultTab]);

  // 获取 Drawer 标题
  const getDrawerTitle = () => {
    if (mode === 'spucate') {
      return spuCateID ? '编辑 SPU 分类' : '新增 SPU 分类';
    }
    if (mode === 'spu') {
      if (spuID) {
        return editingSpuName ? `编辑 SPU - ${editingSpuName}` : '编辑 SPU (加载中...)';
      }
      return '新增 SPU';
    }
    if (mode === 'sku') {
      return editingSkuName ? `编辑 SKU - ${editingSkuName}` : '编辑 SKU (加载中...)';
    }
    return '';
  };

  // 获取响应式 Drawer 宽度
  const getDrawerWidth = () => {
    if (typeof window === 'undefined') return '33.33%';
    // 在手机上使用 100% 宽度，在桌面上使用 33.33%
    const isMobile = window.innerWidth < 768;
    return isMobile ? '100%' : '33.33%';
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
        afterOpenChange={(open) => {
          // 当抽屉打开时，刷新 SPU/SKU 名称 - 使用 API 直接获取，不使用缓存
          if (open) {
            if (mode === 'spu' && spuID) {
              const refreshSpuName = async () => {
                try {
                  const spu = await getSPUInfo(spuID);
                  setEditingSpuName(spu.name);
                } catch (error) {
                  console.error('刷新 SPU 名称失败:', error);
                }
              };
              refreshSpuName();
            } else if (mode === 'sku' && selectedSkuID) {
              const refreshSkuName = async () => {
                try {
                  const skuInfo = await getSKUsInfoAPI([selectedSkuID]);
                  if (skuInfo && skuInfo.length > 0 && !('errInfo' in skuInfo[0])) {
                    setEditingSkuName(skuInfo[0].name);
                  }
                } catch (error) {
                  console.error('刷新 SKU 名称失败:', error);
                }
              };
              refreshSkuName();
            }
          }
        }}
      >
        {editContent}
      </Drawer>
    </>
  );
}
