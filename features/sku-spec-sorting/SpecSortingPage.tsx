'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Button, message, Spin, Alert, Pagination } from 'antd';
import { Save, RefreshCw } from 'lucide-react';
import type { JWT } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { SpecAttribute, SpecAttributeType } from './types';
import { SpecColumnList } from './components/SpecColumnList';
import { SpecEditDrawer } from './components/SpecEditDrawer';
import { categorizeAndSortSpecs } from './categoryUtils';
import { recalculateSortOrders, swapSortOrders } from './sortUtils';
import { validateSortOrders } from './validationUtils';
import {
  getAllSpuSpecAttributes,
  editSpuSpecAttribute,
  batchUpdateSortOrders,
  SDKError,
} from './sdkAdapter';

/**
 * SpecSortingPage 组件属性
 */
export interface SpecSortingPageProps {
  /** JWT 认证 token */
  auth: JWT;
}

/**
 * SpecSortingPage 主页面组件
 * 
 * 商品规格排序设置页面，提供：
 * - 三栏布局展示版本、配置、颜色规格
 * - 拖拽排序功能
 * - 按钮排序功能（上移/下移）
 * - 编辑规格属性功能
 * - 保存排序结果到后端
 * 
 * 需求:
 * - 1.1: 调用 SDK 接口获取所有规格属性
 * - 1.2: 按照版本、配置、颜色三个类别分组显示
 * - 3.3: 处理拖拽操作并更新排序位置
 * - 4.2: 处理上移操作
 * - 4.3: 处理下移操作
 * - 5.1: 调用 SDK 接口保存新的排序顺序
 * - 5.2: 显示成功提示信息
 * - 8.2: 打开编辑抽屉
 */
export const SpecSortingPage: React.FC<SpecSortingPageProps> = ({ auth }) => {
  // 状态管理
  const [versionSpecs, setVersionSpecs] = useState<SpecAttribute[]>([]);
  const [configSpecs, setConfigSpecs] = useState<SpecAttribute[]>([]);
  const [colorSpecs, setColorSpecs] = useState<SpecAttribute[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editingSpec, setEditingSpec] = useState<SpecAttribute | null>(null);
  const [drawerVisible, setDrawerVisible] = useState<boolean>(false);
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // 独立分页状态
  const [versionPage, setVersionPage] = useState<number>(1);
  const [configPage, setConfigPage] = useState<number>(1);
  const [colorPage, setColorPage] = useState<number>(1);
  const [pageSize] = useState<number>(100);
  
  // 全量数据（用于分页和变更追踪）
  const [allVersionSpecs, setAllVersionSpecs] = useState<SpecAttribute[]>([]);
  const [allConfigSpecs, setAllConfigSpecs] = useState<SpecAttribute[]>([]);
  const [allColorSpecs, setAllColorSpecs] = useState<SpecAttribute[]>([]);
  
  // 原始数据（用于检测变更）
  const [originalVersionSpecs, setOriginalVersionSpecs] = useState<SpecAttribute[]>([]);
  const [originalConfigSpecs, setOriginalConfigSpecs] = useState<SpecAttribute[]>([]);
  const [originalColorSpecs, setOriginalColorSpecs] = useState<SpecAttribute[]>([]);

  /**
   * 加载规格属性数据
   * 
   * 需求 1.1: 调用 allSpuSpecAttribute SDK 接口获取所有规格属性
   * 需求 1.2: 按照版本、配置、颜色三个类别分组显示
   */
  const loadSpecAttributes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 调用 SDK 接口获取数据 - 需求 1.1
      const response = await getAllSpuSpecAttributes({ auth });

      // 按类型分组并排序 - 需求 1.2
      const categorized = categorizeAndSortSpecs(response.data);

      // 保存全量数据和原始数据
      setAllVersionSpecs(categorized.version);
      setAllConfigSpecs(categorized.config);
      setAllColorSpecs(categorized.color);
      
      setOriginalVersionSpecs(JSON.parse(JSON.stringify(categorized.version)));
      setOriginalConfigSpecs(JSON.parse(JSON.stringify(categorized.config)));
      setOriginalColorSpecs(JSON.parse(JSON.stringify(categorized.color)));
      
      // 设置当前页数据
      updateVersionPageData(categorized.version, versionPage);
      updateConfigPageData(categorized.config, configPage);
      updateColorPageData(categorized.color, colorPage);
      
      setHasChanges(false);
    } catch (err) {
      // 需求 1.3: 显示错误提示信息并允许用户重试
      const errorMessage =
        err instanceof SDKError
          ? err.message
          : '加载规格属性失败，请重试';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Failed to load spec attributes:', err);
    } finally {
      setLoading(false);
    }
  }, [auth, versionPage, configPage, colorPage]);

  /**
   * 更新版本栏当前页数据
   */
  const updateVersionPageData = useCallback((allVersion: SpecAttribute[], page: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setVersionSpecs(allVersion.slice(startIndex, endIndex));
  }, [pageSize]);

  /**
   * 更新配置栏当前页数据
   */
  const updateConfigPageData = useCallback((allConfig: SpecAttribute[], page: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setConfigSpecs(allConfig.slice(startIndex, endIndex));
  }, [pageSize]);

  /**
   * 更新颜色栏当前页数据
   */
  const updateColorPageData = useCallback((allColor: SpecAttribute[], page: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    setColorSpecs(allColor.slice(startIndex, endIndex));
  }, [pageSize]);

  /**
   * 处理版本栏分页变化
   */
  const handleVersionPageChange = useCallback((page: number) => {
    setVersionPage(page);
    updateVersionPageData(allVersionSpecs, page);
  }, [allVersionSpecs, updateVersionPageData]);

  /**
   * 处理配置栏分页变化
   */
  const handleConfigPageChange = useCallback((page: number) => {
    setConfigPage(page);
    updateConfigPageData(allConfigSpecs, page);
  }, [allConfigSpecs, updateConfigPageData]);

  /**
   * 处理颜色栏分页变化
   */
  const handleColorPageChange = useCallback((page: number) => {
    setColorPage(page);
    updateColorPageData(allColorSpecs, page);
  }, [allColorSpecs, updateColorPageData]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadSpecAttributes();
  }, [loadSpecAttributes]);

  /**
   * 处理拖拽结束事件
   * 
   * 需求 3.3: 更新排序位置
   * 需求 3.6: 重新计算所有受影响项的排序序号
   */
  const handleDragEnd = useCallback(
    (category: SpecAttributeType, draggedSpec: SpecAttribute, targetIndex: number) => {
      // 获取当前类别的全量规格列表和页码
      let allSpecs: SpecAttribute[];
      let setAllSpecs: React.Dispatch<React.SetStateAction<SpecAttribute[]>>;
      let currentPage: number;
      let updatePageData: (specs: SpecAttribute[], page: number) => void;

      switch (category) {
        case 'version':
          allSpecs = allVersionSpecs;
          setAllSpecs = setAllVersionSpecs;
          currentPage = versionPage;
          updatePageData = updateVersionPageData;
          break;
        case 'config':
          allSpecs = allConfigSpecs;
          setAllSpecs = setAllConfigSpecs;
          currentPage = configPage;
          updatePageData = updateConfigPageData;
          break;
        case 'color':
          allSpecs = allColorSpecs;
          setAllSpecs = setAllColorSpecs;
          currentPage = colorPage;
          updatePageData = updateColorPageData;
          break;
        default:
          return;
      }

      // 计算在全量数据中的实际索引
      const pageStartIndex = (currentPage - 1) * pageSize;
      const actualFromIndex = allSpecs.findIndex((s) => s.id === draggedSpec.id);
      const actualTargetIndex = pageStartIndex + targetIndex;
      
      if (actualFromIndex === -1 || actualFromIndex === actualTargetIndex) {
        return;
      }

      // 重新计算排序序号 - 需求 3.6
      const reordered = recalculateSortOrders(allSpecs, actualFromIndex, actualTargetIndex);
      setAllSpecs(reordered);
      
      // 更新当前页显示
      updatePageData(reordered, currentPage);
      
      setHasChanges(true);
    },
    [allVersionSpecs, allConfigSpecs, allColorSpecs, versionPage, configPage, colorPage, pageSize, updateVersionPageData, updateConfigPageData, updateColorPageData]
  );

  /**
   * 处理上移操作
   * 
   * 需求 4.2: 将该项与上一项交换位置
   * 需求 4.6: 更新所有受影响项的排序序号
   */
  const handleMoveUp = useCallback(
    (spec: SpecAttribute) => {
      // 获取当前类别的全量规格列表和页码
      let allSpecs: SpecAttribute[];
      let setAllSpecs: React.Dispatch<React.SetStateAction<SpecAttribute[]>>;
      let currentPage: number;
      let updatePageData: (specs: SpecAttribute[], page: number) => void;

      switch (spec.type) {
        case 'version':
          allSpecs = allVersionSpecs;
          setAllSpecs = setAllVersionSpecs;
          currentPage = versionPage;
          updatePageData = updateVersionPageData;
          break;
        case 'config':
          allSpecs = allConfigSpecs;
          setAllSpecs = setAllConfigSpecs;
          currentPage = configPage;
          updatePageData = updateConfigPageData;
          break;
        case 'color':
          allSpecs = allColorSpecs;
          setAllSpecs = setAllColorSpecs;
          currentPage = colorPage;
          updatePageData = updateColorPageData;
          break;
        default:
          return;
      }

      // 找到当前项在全量数据中的索引
      const index = allSpecs.findIndex((s) => s.id === spec.id);
      if (index <= 0) {
        return; // 已经是第一项，无法上移
      }

      // 交换位置并重新计算排序序号 - 需求 4.2, 4.6
      const reordered = swapSortOrders(allSpecs, index, 'up');
      setAllSpecs(reordered);
      
      // 更新当前页显示
      updatePageData(reordered, currentPage);
      
      setHasChanges(true);
    },
    [allVersionSpecs, allConfigSpecs, allColorSpecs, versionPage, configPage, colorPage, updateVersionPageData, updateConfigPageData, updateColorPageData]
  );

  /**
   * 处理下移操作
   * 
   * 需求 4.3: 将该项与下一项交换位置
   * 需求 4.6: 更新所有受影响项的排序序号
   */
  const handleMoveDown = useCallback(
    (spec: SpecAttribute) => {
      // 获取当前类别的全量规格列表和页码
      let allSpecs: SpecAttribute[];
      let setAllSpecs: React.Dispatch<React.SetStateAction<SpecAttribute[]>>;
      let currentPage: number;
      let updatePageData: (specs: SpecAttribute[], page: number) => void;

      switch (spec.type) {
        case 'version':
          allSpecs = allVersionSpecs;
          setAllSpecs = setAllVersionSpecs;
          currentPage = versionPage;
          updatePageData = updateVersionPageData;
          break;
        case 'config':
          allSpecs = allConfigSpecs;
          setAllSpecs = setAllConfigSpecs;
          currentPage = configPage;
          updatePageData = updateConfigPageData;
          break;
        case 'color':
          allSpecs = allColorSpecs;
          setAllSpecs = setAllColorSpecs;
          currentPage = colorPage;
          updatePageData = updateColorPageData;
          break;
        default:
          return;
      }

      // 找到当前项在全量数据中的索引
      const index = allSpecs.findIndex((s) => s.id === spec.id);
      if (index === -1 || index >= allSpecs.length - 1) {
        return; // 已经是最后一项，无法下移
      }

      // 交换位置并重新计算排序序号 - 需求 4.3, 4.6
      const reordered = swapSortOrders(allSpecs, index, 'down');
      setAllSpecs(reordered);
      
      // 更新当前页显示
      updatePageData(reordered, currentPage);
      
      setHasChanges(true);
    },
    [allVersionSpecs, allConfigSpecs, allColorSpecs, versionPage, configPage, colorPage, updateVersionPageData, updateConfigPageData, updateColorPageData]
  );

  /**
   * 处理保存操作
   * 
   * 需求 5.1: 调用 editSpuSpecAttribute SDK 接口保存新的排序顺序
   * 需求 5.2: 显示成功提示信息
   * 需求 5.3: 显示错误提示并保留用户的排序操作，允许重试
   */
  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      setError(null);

      // 合并所有类型的规格属性（使用全量数据）
      const allSpecs = [...allVersionSpecs, ...allConfigSpecs, ...allColorSpecs];
      const allOriginalSpecs = [...originalVersionSpecs, ...originalConfigSpecs, ...originalColorSpecs];

      // 按类型分别验证 - 需求 9.1, 9.2, 9.4
      const versionValidation = validateSortOrders(allVersionSpecs);
      const configValidation = validateSortOrders(allConfigSpecs);
      const colorValidation = validateSortOrders(allColorSpecs);

      const allErrors = [
        ...versionValidation.errors,
        ...configValidation.errors,
        ...colorValidation.errors,
      ];

      if (allErrors.length > 0) {
        const errorMessage = `数据验证失败：\n${allErrors.join('\n')}`;
        setError(errorMessage);
        message.error('数据验证失败，请检查排序设置');
        return;
      }

      // 找出有变更的项（只提交 sortOrder 有变化的项）
      const changedSpecs = allSpecs.filter((spec) => {
        const original = allOriginalSpecs.find((o) => o.id === spec.id);
        return original && original.sortOrder !== spec.sortOrder;
      });

      if (changedSpecs.length === 0) {
        message.info('没有需要保存的更改');
        setHasChanges(false);
        return;
      }

      // 批量保存修改的规格属性 - 需求 5.1
      const result = await batchUpdateSortOrders(
        changedSpecs.map((spec) => ({
          id: spec.id,
          sortOrder: spec.sortOrder,
        })),
        auth
      );

      if (result.success) {
        // 保存成功 - 需求 5.2
        message.success(`保存成功，共更新 ${changedSpecs.length} 项`);
        setHasChanges(false);
        // 重新加载数据以确保与后端同步
        await loadSpecAttributes();
      } else {
        // 部分保存失败 - 需求 5.3
        const errorMessage = `部分规格属性保存失败（${result.failedIds.length} 项）`;
        setError(errorMessage);
        message.error(errorMessage);
      }
    } catch (err) {
      // 保存失败 - 需求 5.3
      const errorMessage =
        err instanceof SDKError ? err.message : '保存失败，请重试';
      setError(errorMessage);
      message.error(errorMessage);
      console.error('Failed to save sort orders:', err);
    } finally {
      setSaving(false);
    }
  }, [allVersionSpecs, allConfigSpecs, allColorSpecs, originalVersionSpecs, originalConfigSpecs, originalColorSpecs, auth, loadSpecAttributes]);

  /**
   * 处理编辑按钮点击
   * 
   * 需求 8.2: 打开编辑抽屉
   */
  const handleEdit = useCallback((spec: SpecAttribute) => {
    setEditingSpec(spec);
    setDrawerVisible(true);
  }, []);

  /**
   * 处理编辑保存
   * 
   * 需求 8.5: 调用 editSpuSpecAttribute SDK 接口更新数据
   * 需求 8.6: 编辑保存成功后关闭抽屉并刷新列表
   */
  const handleEditSave = useCallback(
    async (updatedSpec: SpecAttribute) => {
      try {
        // 调用 SDK 接口更新数据 - 需求 8.5
        await editSpuSpecAttribute(
          {
            ...updatedSpec,
            auth,
          },
          { maxRetries: 2 }
        );

        // 保存成功 - 需求 8.6
        setDrawerVisible(false);
        setEditingSpec(null);
        message.success('编辑成功');

        // 刷新列表显示最新数据
        await loadSpecAttributes();
      } catch (err) {
        // 保存失败 - 需求 8.7
        const errorMessage =
          err instanceof SDKError ? err.message : '编辑失败，请重试';
        throw new Error(errorMessage);
      }
    },
    [auth, loadSpecAttributes]
  );

  /**
   * 处理编辑取消
   * 
   * 需求 8.8: 关闭抽屉并放弃未保存的修改
   */
  const handleEditCancel = useCallback(() => {
    setDrawerVisible(false);
    setEditingSpec(null);
  }, []);

  // 渲染加载状态 - 需求 7.2
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="spec-sorting-page p-6">
        {/* 页面标题和操作栏 */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                商品规格排序设置
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                拖拽或使用按钮调整规格属性的显示顺序
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* 重新加载按钮 */}
              <Button
                icon={<RefreshCw size={16} />}
                onClick={loadSpecAttributes}
                disabled={loading || saving}
              >
                刷新
              </Button>

              {/* 保存按钮 - 需求 5.1, 7.3 */}
              <Button
                type="primary"
                icon={<Save size={16} />}
                onClick={handleSave}
                loading={saving}
                disabled={loading || saving || !hasChanges}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>

          {/* 错误提示 - 需求 7.5 */}
          {error && (
            <Alert
              message="错误"
              description={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              className="mt-4"
            />
          )}

          {/* 未保存更改提示 */}
          {hasChanges && !error && (
            <Alert
              message="您有未保存的更改"
              description="请点击保存按钮以保存您的排序设置"
              type="warning"
              showIcon
              className="mt-4"
            />
          )}
        </div>

        {/* 三栏布局 - 需求 2.1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 版本栏 */}
          <div className="flex flex-col">
            <SpecColumnList
              title="版本"
              specs={versionSpecs}
              category="version"
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onEdit={handleEdit}
              onDragEnd={(draggedSpec, targetIndex) =>
                handleDragEnd('version', draggedSpec, targetIndex)
              }
              loading={loading}
              disabled={saving}
              currentPage={versionPage}
              pageSize={pageSize}
            />
            {allVersionSpecs.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={versionPage}
                  pageSize={pageSize}
                  total={allVersionSpecs.length}
                  onChange={handleVersionPageChange}
                  showSizeChanger={false}
                  size="small"
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            )}
          </div>

          {/* 配置栏 */}
          <div className="flex flex-col">
            <SpecColumnList
              title="配置"
              specs={configSpecs}
              category="config"
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onEdit={handleEdit}
              onDragEnd={(draggedSpec, targetIndex) =>
                handleDragEnd('config', draggedSpec, targetIndex)
              }
              loading={loading}
              disabled={saving}
              currentPage={configPage}
              pageSize={pageSize}
            />
            {allConfigSpecs.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={configPage}
                  pageSize={pageSize}
                  total={allConfigSpecs.length}
                  onChange={handleConfigPageChange}
                  showSizeChanger={false}
                  size="small"
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            )}
          </div>

          {/* 颜色栏 */}
          <div className="flex flex-col">
            <SpecColumnList
              title="颜色"
              specs={colorSpecs}
              category="color"
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onEdit={handleEdit}
              onDragEnd={(draggedSpec, targetIndex) =>
                handleDragEnd('color', draggedSpec, targetIndex)
              }
              loading={loading}
              disabled={saving}
              currentPage={colorPage}
              pageSize={pageSize}
            />
            {allColorSpecs.length > pageSize && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  current={colorPage}
                  pageSize={pageSize}
                  total={allColorSpecs.length}
                  onChange={handleColorPageChange}
                  showSizeChanger={false}
                  size="small"
                  showTotal={(total) => `共 ${total} 条`}
                />
              </div>
            )}
          </div>
        </div>

        {/* 编辑抽屉 - 需求 8.2 */}
        <SpecEditDrawer
          visible={drawerVisible}
          spec={editingSpec}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
          saving={saving}
        />
      </div>
    </DndProvider>
  );
};

export default SpecSortingPage;
