'use client';
import { SPU, SPUCateID, SPUState } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { getSPUListNew, getSPUCateBaseList, editSPUInfo } from '@zsqk/z1-sdk/es/z1p/product';
import { Button, Col, Form, Row, Select, Table, Tag, Alert, Space, Cascader, Drawer, Modal, message, Card, Input, Statistic } from 'antd';
import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { PageHeader } from '@ant-design/pro-components';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, SearchOutlined, EditOutlined, SwapOutlined } from '@ant-design/icons';
import type { TableRowSelection } from 'antd/es/table/interface';

import { SelectBrands } from '../../components/SelectBrands';
import { Content } from '../../components/style/Content';
import { formColProps, formItemCol } from '../../constant/formProps';
import { BrandListProvider, useBrandListContext } from '../../datahooks/brand';
import { getAwait } from '../../error';
import { SPUCateListProvider, SpuIDProvider, SPUListProvider, useSpuIDContext } from '../../datahooks/product';
import { usePermission } from '../../datahooks/permission';
import PageWrap from '../../components/PageWrap';
import SPUEdit from '../../components/SPUEdit';
import { useTokenContext } from '../../datahooks/auth';

interface NamingIssue {
  type: 'no_space' | 'has_quanwangtong' | 'no_brand' | 'brand_mismatch' | 'lowercase_brand' | 'leading_space' | 'has_non_new_keywords' | 'has_forbidden_keywords';
  message: string;
  severity: 'error' | 'warning';
}

interface SPUWithIssues extends Pick<SPU, 'state' | 'name' | 'id' | 'brand' | 'cateID'> {
  issues: NamingIssue[];
}

/**
 * 检查SPU命名是否符合规范
 */
function checkSPUNaming(spu: Pick<SPU, 'name' | 'brand'>, brandList: string[]): NamingIssue[] {
  const issues: NamingIssue[] = [];
  const { name, brand } = spu;

  // 检查名称前面是否有空格
  if (name.startsWith(' ')) {
    issues.push({
      type: 'leading_space',
      message: '名称前面有空格',
      severity: 'error',
    });
    return issues;
  }

  // 检查是否包含非新机字样（样机、演示机、二手、老款）
  const nonNewKeywords = ['样机', '演示机', '二手', '老款'];
  const foundNonNewKeyword = nonNewKeywords.find(keyword => name.includes(keyword));
  if (foundNonNewKeyword) {
    issues.push({
      type: 'has_non_new_keywords',
      message: `名称包含非新机字样"${foundNonNewKeyword}"`,
      severity: 'error',
    });
  }

  // 检查是否包含禁用字样（专卖、金币）
  const forbiddenKeywords = ['专卖', '金币'];
  const foundForbiddenKeyword = forbiddenKeywords.find(keyword => name.includes(keyword));
  if (foundForbiddenKeyword) {
    issues.push({
      type: 'has_forbidden_keywords',
      message: `名称包含禁用字样"${foundForbiddenKeyword}"`,
      severity: 'error',
    });
  }

  // 检查是否有品牌
  if (!brand) {
    issues.push({
      type: 'no_brand',
      message: '缺少品牌信息',
      severity: 'error',
    });
    return issues;
  }

  // 检查是否包含"全网通"
  if (name.includes('全网通')) {
    issues.push({
      type: 'has_quanwangtong',
      message: '名称包含"全网通"字样',
      severity: 'warning',
    });
  }

  // 特殊品牌处理：Apple 品牌的产品使用 iPhone/iPad/MacBook 等开头
  const appleProductPrefixes = ['iPhone', 'iPad', 'MacBook', 'iMac', 'Mac', 'AirPods', 'Apple Watch', 'Apple TV'];
  const isAppleBrand = brand.toLowerCase() === 'apple' || brand === '苹果';
  
  // 特殊品牌处理：realme 品牌的产品使用"真我"或"realme"开头
  const realmeProductPrefixes = ['真我', 'realme'];
  const isRealmeBrand = brand.toLowerCase() === 'realme';
  
  // 特殊品牌处理：华为品牌的产品可以使用"华为"或"华为智选"开头
  const huaweiProductPrefixes = ['华为智选', '华为', 'HUAWEI'];
  const isHuaweiBrand = brand === '华为' || brand.toLowerCase() === 'huawei';
  
  // 特殊品牌处理：荣耀品牌后面不需要空格
  const isHonorBrand = brand === '荣耀' || brand.toLowerCase() === 'honor';
  
  if (isAppleBrand) {
    // Apple 品牌：检查是否以 Apple 产品系列名开头
    const hasValidApplePrefix = appleProductPrefixes.some(prefix => name.startsWith(prefix));
    
    if (!hasValidApplePrefix) {
      issues.push({
        type: 'brand_mismatch',
        message: `Apple 品牌产品名称应以 ${appleProductPrefixes.join('/')} 等开头`,
        severity: 'error',
      });
      return issues;
    }
    
    // 检查产品系列名后是否有空格
    const matchedPrefix = appleProductPrefixes.find(prefix => name.startsWith(prefix));
    if (matchedPrefix && name.length > matchedPrefix.length && name[matchedPrefix.length] !== ' ') {
      issues.push({
        type: 'no_space',
        message: `${matchedPrefix} 后缺少空格`,
        severity: 'error',
      });
    }
  } else if (isRealmeBrand) {
    // realme 品牌：检查是否以"真我"或"realme"开头
    const hasValidRealmePrefix = realmeProductPrefixes.some(prefix => name.startsWith(prefix));
    
    if (!hasValidRealmePrefix) {
      issues.push({
        type: 'brand_mismatch',
        message: `realme 品牌产品名称应以"真我"或"realme"开头`,
        severity: 'error',
      });
      return issues;
    }
    
    // realme 品牌特殊规则：
    // - "真我"后不需要空格
    // - "realme"后需要空格（如果后面还有内容）
    const matchedPrefix = realmeProductPrefixes.find(prefix => name.startsWith(prefix));
    if (matchedPrefix === 'realme' && name.length > matchedPrefix.length && name[matchedPrefix.length] !== ' ') {
      issues.push({
        type: 'no_space',
        message: `realme 后缺少空格`,
        severity: 'error',
      });
    }
  } else if (isHuaweiBrand) {
    // 华为品牌：检查是否以"华为智选"、"华为"或"HUAWEI"开头
    const hasValidHuaweiPrefix = huaweiProductPrefixes.some(prefix => name.startsWith(prefix));
    
    if (!hasValidHuaweiPrefix) {
      issues.push({
        type: 'brand_mismatch',
        message: `华为品牌产品名称应以"华为"、"华为智选"或"HUAWEI"开头`,
        severity: 'error',
      });
      return issues;
    }
    
    // 检查品牌后是否有空格
    const matchedPrefix = huaweiProductPrefixes.find(prefix => name.startsWith(prefix));
    if (matchedPrefix && name.length > matchedPrefix.length && name[matchedPrefix.length] !== ' ') {
      issues.push({
        type: 'no_space',
        message: `${matchedPrefix} 后缺少空格`,
        severity: 'error',
      });
    }
  } else if (isHonorBrand) {
    // 荣耀品牌：检查品牌名是否在名称开头
    if (!name.startsWith(brand)) {
      issues.push({
        type: 'brand_mismatch',
        message: `名称未以品牌"${brand}"开头`,
        severity: 'error',
      });
      return issues;
    }

    // 荣耀品牌特殊规则：品牌后不需要空格
    // 不检查空格
  } else {
    // 其他品牌：检查品牌名是否在名称开头
    if (!name.startsWith(brand)) {
      issues.push({
        type: 'brand_mismatch',
        message: `名称未以品牌"${brand}"开头`,
        severity: 'error',
      });
      return issues;
    }

    // 检查品牌后是否有空格
    if (name.length > brand.length && name[brand.length] !== ' ') {
      issues.push({
        type: 'no_space',
        message: '品牌名后缺少空格',
        severity: 'error',
      });
    }
  }

  // 检查品牌名大小写（常见品牌）
  const commonBrands: Record<string, string> = {
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'macbook': 'MacBook',
    'huawei': 'HUAWEI',
    'xiaomi': 'Xiaomi',
    'oppo': 'OPPO',
    'vivo': 'vivo',
    'samsung': 'Samsung',
  };

  const lowerBrand = brand.toLowerCase();
  if (commonBrands[lowerBrand] && brand !== commonBrands[lowerBrand]) {
    issues.push({
      type: 'lowercase_brand',
      message: `品牌名大小写可能不正确，建议使用"${commonBrands[lowerBrand]}"`,
      severity: 'warning',
    });
  }

  return issues;
}

type SPUCateData = Awaited<ReturnType<typeof getSPUCateBaseList>>[0];

interface CascaderOption {
  value: number;
  label: string;
  children?: CascaderOption[];
}

/**
 * 将 SPU 分类数据转换为级联选择器的树形结构
 */
function buildCascaderOptions(cates: SPUCateData[]): CascaderOption[] {
  if (!cates.length) {
    return [];
  }

  const cateMap = cates.map((cate) => ({
    value: cate.id,
    label: `${cate.name} (${cate.id})`,
    pid: cate.pid,
    children: [] as CascaderOption[],
  }));

  function buildTree(pid: number, data: typeof cateMap): CascaderOption[] {
    return data.reduce((acc, item) => {
      if (item.pid === pid) {
        const children = buildTree(item.value, data);
        acc.push({
          value: item.value,
          label: item.label,
          ...(children.length > 0 ? { children } : {}),
        });
      }
      return acc;
    }, [] as CascaderOption[]);
  }

  return buildTree(0, cateMap);
}

/**
 * [组件] 批量修改品牌的 Modal
 */
function BatchChangeBrandModal(props: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  allBrands: string[];
}) {
  const { visible, onClose, onSuccess, allBrands } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [affectedCount, setAffectedCount] = useState(0);
  const { token } = useTokenContext();

  const oldBrand = Form.useWatch('oldBrand', form);

  // 当选择原品牌时，获取该品牌的 SPU 数量
  useEffect(() => {
    if (!oldBrand) {
      setAffectedCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const res = await getSPUListNew(
          {
            brands: [oldBrand],
            states: [SPUState.在用],
            limit: 10000,
            offset: 0,
            orderBy: [{ key: 'p."id"', sort: 'DESC' }],
          },
          ['id']
        );
        setAffectedCount(res.length);
      } catch (error) {
        console.error('获取 SPU 数量失败:', error);
        setAffectedCount(0);
      }
    };

    fetchCount();
  }, [oldBrand]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const { oldBrand, newBrand } = values;

      if (oldBrand === newBrand) {
        message.warning('原品牌和新品牌不能相同');
        return;
      }

      if (!token) {
        message.error('未获取到认证信息');
        return;
      }

      Modal.confirm({
        title: '确认批量修改品牌',
        content: `确定要将 ${affectedCount} 个 SPU 的品牌从 "${oldBrand}" 修改为 "${newBrand}" 吗？此操作不可撤销。`,
        okText: '确认修改',
        cancelText: '取消',
        okButtonProps: { danger: true },
        onOk: async () => {
          setLoading(true);
          try {
            // 获取所有需要修改的 SPU
            const spuList = await getSPUListNew(
              {
                brands: [oldBrand],
                states: [SPUState.在用],
                limit: 10000,
                offset: 0,
                orderBy: [{ key: 'p."id"', sort: 'DESC' }],
              },
              ['id', 'name']
            );

            let successCount = 0;
            let failCount = 0;

            // 批量修改每个 SPU
            for (const spu of spuList) {
              try {
                // 修改品牌，同时更新名称（将旧品牌名替换为新品牌名）
                const newName = spu.name.replace(new RegExp(`^${oldBrand}\\s*`), `${newBrand} `);
                
                await editSPUInfo(
                  spu.id,
                  {
                    brand: newBrand,
                    name: newName,
                  },
                  { auth: token }
                );
                successCount++;
              } catch (error) {
                console.error(`修改 SPU ${spu.id} 失败:`, error);
                failCount++;
              }
            }

            setLoading(false);
            
            if (failCount === 0) {
              message.success(`批量修改完成！成功修改 ${successCount} 个 SPU`);
            } else {
              message.warning(`批量修改完成！成功 ${successCount} 个，失败 ${failCount} 个`);
            }

            form.resetFields();
            onSuccess();
            onClose();
          } catch (error) {
            setLoading(false);
            message.error('批量修改失败，请重试');
            console.error(error);
          }
        },
      });
    } catch (error) {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title="批量修改 SPU 品牌"
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="开始修改"
      cancelText="取消"
      width={600}
    >
      <Alert
        message="注意事项"
        description={
          <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
            <li>此操作将修改所有指定品牌的在用 SPU</li>
            <li>SPU 名称中的品牌名也会自动更新</li>
            <li>修改后无法撤销，请谨慎操作</li>
          </ul>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Form form={form} layout="vertical">
        <Form.Item
          label="原品牌"
          name="oldBrand"
          rules={[{ required: true, message: '请选择原品牌' }]}
        >
          <Select
            showSearch
            placeholder="请选择要修改的原品牌"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {allBrands.map((brand) => (
              <Select.Option key={brand} value={brand}>
                {brand}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {oldBrand && (
          <Alert
            message={`该品牌下有 ${affectedCount} 个在用 SPU`}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="新品牌"
          name="newBrand"
          rules={[{ required: true, message: '请选择新品牌' }]}
        >
          <Select
            showSearch
            placeholder="请选择新品牌"
            optionFilterProp="children"
            filterOption={(input, option) =>
              String(option?.children || '')?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {allBrands.map((brand) => (
              <Select.Option key={brand} value={brand}>
                {brand}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * [组件] 批量编辑 SPU Modal
 */
function BatchEditModal(props: {
  visible: boolean;
  selectedIds: number[];
  onClose: () => void;
  onSuccess: () => void;
  cates: SPUCateData[];
}) {
  const { visible, selectedIds, onClose, onSuccess, cates } = props;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { token } = useTokenContext();
  const { brandList } = useBrandListContext();

  const cascaderOptions = useMemo(() => {
    const options = buildCascaderOptions(cates);
    return options;
  }, [cates]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      if (!token) {
        message.error('未获取到认证信息');
        return;
      }

      // 检查是否至少选择了一个要修改的字段
      const hasChanges = values.brand || values.cateID || values.description || values.remark;
      if (!hasChanges) {
        message.warning('请至少选择一个要修改的字段');
        return;
      }

      Modal.confirm({
        title: '确认批量编辑',
        content: `确定要批量编辑 ${selectedIds.length} 个 SPU 吗？`,
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          setLoading(true);
          try {
            let successCount = 0;
            let failCount = 0;

            // 准备更新参数
            const updateParams: any = {};
            if (values.brand) updateParams.brand = values.brand;
            if (values.cateID) updateParams.cateID = values.cateID[values.cateID.length - 1];
            if (values.description) updateParams.description = values.description;
            if (values.remark) updateParams.remark = values.remark;

            // 批量修改每个 SPU
            for (const spuId of selectedIds) {
              try {
                await editSPUInfo(spuId, updateParams, { auth: token });
                successCount++;
              } catch (error) {
                console.error(`修改 SPU ${spuId} 失败:`, error);
                failCount++;
              }
            }

            setLoading(false);
            
            if (failCount === 0) {
              message.success(`批量编辑完成！成功修改 ${successCount} 个 SPU`);
            } else {
              message.warning(`批量编辑完成！成功 ${successCount} 个，失败 ${failCount} 个`);
            }

            form.resetFields();
            onSuccess();
            onClose();
          } catch (error) {
            setLoading(false);
            message.error('批量编辑失败，请重试');
            console.error(error);
          }
        },
      });
    } catch (error) {
      // 表单验证失败
    }
  };

  return (
    <Modal
      title={`批量编辑 SPU (已选择 ${selectedIds.length} 个)`}
      open={visible}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="开始编辑"
      cancelText="取消"
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label={`品牌 (共 ${brandList.length} 个)`}
          name="brand"
          tooltip="留空则不修改"
        >
          <Select
            showSearch
            placeholder="选择新品牌（留空不修改）"
            allowClear
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          >
            {brandList.map((brand) => (
              <Select.Option key={brand.name} value={brand.name} label={`${brand.name} ${brand.spell}`}>
                {brand.name} {brand.spell}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label="SPU 分类"
          name="cateID"
          tooltip="留空则不修改"
        >
          <Cascader
            options={cascaderOptions}
            placeholder="选择新分类（留空不修改）"
            showSearch={{
              filter: (inputValue, path) =>
                path.some(
                  (option) =>
                    option.label
                      ?.toString()
                      .toLowerCase()
                      .indexOf(inputValue.toLowerCase()) > -1
                ),
            }}
            changeOnSelect
            allowClear
          />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          tooltip="留空则不修改"
        >
          <Input.TextArea
            rows={3}
            placeholder="输入新描述（留空不修改）"
          />
        </Form.Item>

        <Form.Item
          label="备注"
          name="remark"
          tooltip="留空则不修改"
        >
          <Input.TextArea
            rows={3}
            placeholder="输入新备注（留空不修改）"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

/**
 * [页面组件] SPU 命名规范检查的搜索过滤框
 */
function QueryForm(props: {
  onQuery: (q: {
    spuCateIDs?: SPUCateID[];
    brands?: string[];
    spuState?: SPU['state'];
  }) => void;
}) {
  const { onQuery } = props;

  const [spuCateIDs, setSpuCateIDs] = useState<SPUCateID[]>();
  const [selectedBrands, setSelectedBrands] = useState<string[]>();
  const [spuState, setSPUState] = useState<SPU['state']>(SPUState.在用);
  const [cates, setCates] = useState<SPUCateData[]>([]);
  const [selectedCatePath, setSelectedCatePath] = useState<number[]>();

  // 加载 SPU 分类数据
  useEffect(() => {
    const loadCates = async () => {
      const res = await getSPUCateBaseList();
      setCates(res);
    };
    loadCates();
  }, []);

  // 构建级联选择器选项
  const cascaderOptions = useMemo(() => {
    const options = buildCascaderOptions(cates);
    return [
      {
        value: 0,
        label: '全部分类',
        children: options,
      },
    ];
  }, [cates]);

  return (
    <Card 
      style={{ marginBottom: 16 }}
      styles={{ body: { paddingBottom: 0 } }}
    >
      <Form {...formColProps}>
        <Row gutter={16}>
          <Col {...formItemCol}>
            <Form.Item label="SPU 分类" tooltip="选择 SPU 分类">
              <Cascader
                options={cascaderOptions}
                value={selectedCatePath}
                onChange={(value) => {
                  setSelectedCatePath(value as number[]);
                  if (!value || value.length === 0) {
                    // 没有选择任何分类
                    setSpuCateIDs(undefined);
                  } else if (value.length === 1 && value[0] === 0) {
                    // 只选择了"全部分类"
                    setSpuCateIDs(undefined);
                  } else {
                    // 使用最后一级的分类 ID（跳过"全部分类"这一级）
                    const lastId = value[value.length - 1] as number;
                    if (lastId === 0) {
                      setSpuCateIDs(undefined);
                    } else {
                      setSpuCateIDs([lastId]);
                    }
                  }
                }}
                placeholder="请选择 SPU 分类"
                showSearch={{
                  filter: (inputValue, path) =>
                    path.some(
                      (option) =>
                        option.label
                          ?.toString()
                          .toLowerCase()
                          .indexOf(inputValue.toLowerCase()) > -1
                    ),
                }}
                changeOnSelect
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>
          </Col>

          <Col {...formItemCol}>
            <Form.Item label="品牌" tooltip="选择要筛选的品牌">
              <BrandListProvider>
                <SelectBrands onSelected={setSelectedBrands} />
              </BrandListProvider>
            </Form.Item>
          </Col>

          <Col {...formItemCol}>
            <Form.Item label="状态" tooltip="选择要筛选的状态">
              <Select
                value={spuState}
                style={{ width: '100%' }}
                onChange={v => {
                  setSPUState(v);
                }}
                size="large"
              >
                <Select.Option value="valid">有效</Select.Option>
                <Select.Option value="invalid">无效</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row justify="end" style={{ marginTop: 8 }}>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={() => {
                let k3: string[] | undefined = selectedBrands;
                if (k3?.length === 0) {
                  k3 = undefined;
                }

                onQuery({
                  spuCateIDs,
                  brands: k3,
                  spuState,
                });
              }}
            >
              开始检查
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}

/**
 * [页面] SPU 命名规范性检查
 */
export default function () {
  const [list, setList] = useState<SPUWithIssues[]>();
  const [loading, setLoading] = useState(false);
  const [editingSpuID, setEditingSpuID] = useState<number | undefined>();
  const [editingSpuName, setEditingSpuName] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [batchBrandModalVisible, setBatchBrandModalVisible] = useState(false);
  const [batchEditVisible, setBatchEditVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [cates, setCates] = useState<SPUCateData[]>([]);

  // 加载 SPU 分类数据
  useEffect(() => {
    const loadCates = async () => {
      const res = await getSPUCateBaseList();
      setCates(res);
    };
    loadCates();
  }, []);

  // 获取权限
  const { permission, errMsg: permissionErrMsg } =
    usePermission('product-manage');
  if (permission === undefined) {
    return <>正在加载权限</>;
  }
  if (permission === null) {
    return <>没有获取到权限, {permissionErrMsg}</>;
  }

  const issueCount = list?.filter(item => item.issues.length > 0).length || 0;
  const errorCount = list?.filter(item => 
    item.issues.some(issue => issue.severity === 'error')
  ).length || 0;
  const warningCount = list?.filter(item => 
    item.issues.some(issue => issue.severity === 'warning') &&
    !item.issues.some(issue => issue.severity === 'error')
  ).length || 0;

  // 打开编辑抽屉
  const handleEdit = (spuId: number) => {
    // 从列表中找到对应的 SPU 并获取名称
    const spu = list?.find(item => item.id === spuId);
    if (spu) {
      setEditingSpuName(spu.name);
    }
    setEditingSpuID(spuId);
    setDrawerOpen(true);
  };

  // 关闭编辑抽屉
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingSpuID(undefined);
    setEditingSpuName('');
  };

  // 重新加载数据
  const reloadData = () => {
    // 触发重新检查，这里可以通过设置一个标志来触发
    message.success('数据已更新，请重新点击"开始检查"按钮');
    setSelectedRowKeys([]);
  };

  // 批量选择具有相同问题的 SPU
  const handleSelectByIssueType = (issueType: NamingIssue['type'], issueMessage: string) => {
    if (!list) return;
    
    const spusWithIssue = list
      .filter(spu => spu.issues.some(issue => issue.type === issueType && issue.message === issueMessage))
      .map(spu => spu.id);
    
    setSelectedRowKeys(spusWithIssue);
    message.success(`已选择 ${spusWithIssue.length} 个具有相同问题的 SPU`);
  };

  // 行选择配置
  const rowSelection: TableRowSelection<SPUWithIssues> = {
    selectedRowKeys,
    onChange: (selectedKeys) => {
      setSelectedRowKeys(selectedKeys);
    },
  };

  return (
    <PageWrap ppKey="product-manage">
      <SPUCateListProvider>
        <SpuIDProvider>
          <SPUListProvider>
            <BrandListProvider>
              <Head>
                <title>SPU 命名规范检查</title>
              </Head>
              <PageHeader
                title="SPU 命名规范检查"
                subTitle="检查 SPU 名称是否符合命名规范"
                extra={[
                  <Button
                    key="batch-brand"
                    type="default"
                    icon={<SwapOutlined />}
                    onClick={() => setBatchBrandModalVisible(true)}
                    disabled={allBrands.length === 0}
                  >
                    批量修改品牌
                  </Button>,
                ]}
              ></PageHeader>
              <Content>
          <Alert
            message="📋 命名规范说明"
            description={
              <div>
                <p style={{ marginBottom: 8, fontWeight: 500 }}>SPU 命名应遵循以下规范：</p>
                <ul style={{ marginBottom: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                  <li>✅ SPU 名称使用 <strong>品牌名 + 官方名称</strong>，之间留空格</li>
                  <li>✅ 使用官方名称大小写（如 <code>iPhone</code> 而不是 <code>iphone</code>）</li>
                  <li>✅ 不要有错别字</li>
                  <li>✅ 不要有"全网通"字样</li>
                  <li>⚠️ <strong>特殊规则</strong>：Apple 品牌产品使用产品系列名开头（如 <code>iPhone 15 Pro</code>、<code>iPad Air</code>、<code>MacBook Pro</code>），而不是 "Apple" 开头</li>
                  <li>⚠️ <strong>特殊规则</strong>：华为品牌产品可以使用"华为"、"华为智选"或"HUAWEI"开头，后面需要空格（如 <code>华为 Mate 60 Pro</code>、<code>华为智选 智能手表</code>）</li>
                  <li>⚠️ <strong>特殊规则</strong>：realme 品牌产品使用"真我"或"realme"开头，"真我"后不需要空格（如 <code>真我GT5 Pro</code>），"realme"后需要空格（如 <code>realme GT5 Pro</code>）</li>
                  <li>⚠️ <strong>特殊规则</strong>：荣耀品牌后面不需要空格（如 <code>荣耀Magic6 Pro</code>）</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <QueryForm
            onQuery={v => {
              const fn = getAwait(async () => {
                setLoading(true);
                const {
                  spuCateIDs: cateIDs,
                  brands,
                  spuState,
                } = v;

                // 从服务器获取数据
                const res = await getSPUListNew(
                  {
                    cateIDs,
                    brands,
                    states: spuState ? [spuState] : undefined,
                    orderBy: [
                      { key: 'p."brand"', sort: 'ASC' },
                      { key: 'p."cate_id"', sort: 'ASC' },
                      { key: 'p."order"', sort: 'ASC' },
                      { key: 'p."id"', sort: 'DESC' },
                    ],
                    limit: 10000,
                    offset: 0,
                  },
                  ['id', 'name', 'brand', 'state', 'cateID']
                );

                // 获取所有品牌列表
                const allBrands = Array.from(new Set(res.map(item => item.brand).filter(Boolean)));
                setAllBrands(allBrands);

                // 检查每个 SPU 的命名规范
                const spuWithIssues: SPUWithIssues[] = res.map(spu => ({
                  ...spu,
                  issues: checkSPUNaming(spu, allBrands),
                }));

                setList(spuWithIssues);
                setLoading(false);
              });
              fn();
            }}
          />

          {list && (
            <>
              {/* 统计卡片 */}
              <Row gutter={16} style={{ marginBottom: 16, marginTop: 16 }}>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="检查总数"
                      value={list.length}
                      prefix={<SearchOutlined />}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="错误"
                      value={errorCount}
                      prefix={<CloseCircleOutlined />}
                      valueStyle={{ color: '#ff4d4f' }}
                      suffix={`/ ${list.length}`}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="警告"
                      value={warningCount}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#faad14' }}
                      suffix={`/ ${list.length}`}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card>
                    <Statistic
                      title="正常"
                      value={list.length - issueCount}
                      prefix={<CheckCircleOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                      suffix={`/ ${list.length}`}
                    />
                  </Card>
                </Col>
              </Row>

              {/* 操作栏 */}
              {selectedRowKeys.length > 0 && (
                <Card style={{ marginBottom: 16 }}>
                  <Space>
                    <span>已选择 <strong>{selectedRowKeys.length}</strong> 项</span>
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      onClick={() => setBatchEditVisible(true)}
                    >
                      批量编辑
                    </Button>
                    <Button onClick={() => setSelectedRowKeys([])}>
                      取消选择
                    </Button>
                  </Space>
                </Card>
              )}

              {/* 问题列表 */}
              <Card 
                title={
                  <Space>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>问题列表</span>
                    <Tag color="red">{issueCount} 条异常</Tag>
                  </Space>
                }
                extra={
                  <Space>
                    <span style={{ color: '#8c8c8c' }}>
                      💡 提示：点击问题标签可批量选择同类问题的 SPU
                    </span>
                  </Space>
                }
              >
                <Table
                  rowKey={'id'}
                  size="middle"
                  dataSource={list.filter(item => item.issues.length > 0)}
                  loading={loading}
                  rowSelection={rowSelection}
                    columns={[
                      {
                        dataIndex: 'id',
                        title: 'SPU ID',
                        width: 100,
                        fixed: 'left',
                        render: (id) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{id}</span>,
                      },
                      {
                        dataIndex: 'name',
                        title: '名称',
                        width: 300,
                        ellipsis: true,
                        render: (name) => <span style={{ fontWeight: 500 }}>{name}</span>,
                      },
                      {
                        dataIndex: 'brand',
                        title: '品牌',
                        width: 120,
                        render: (brand) => brand ? <Tag color="blue">{brand}</Tag> : <Tag>未设置</Tag>,
                      },
                      {
                        dataIndex: 'issues',
                        title: '问题详情',
                        render: (_, record) => (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {record.issues.map((issue, index) => (
                              <Tag
                                key={index}
                                color={issue.severity === 'error' ? 'red' : 'orange'}
                                icon={issue.severity === 'error' ? <CloseCircleOutlined /> : <WarningOutlined />}
                                style={{ marginRight: 0, cursor: 'pointer' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectByIssueType(issue.type, issue.message);
                                }}
                                title="点击选择所有具有此问题的 SPU"
                              >
                                {issue.message}
                              </Tag>
                            ))}
                          </Space>
                        ),
                      },
                      {
                        dataIndex: 'action',
                        title: '操作',
                        width: 100,
                        fixed: 'right',
                        render: (_, record) => (
                          <Button
                            type="primary"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEdit(record.id)}
                          >
                            编辑
                          </Button>
                        ),
                      },
                    ]}
                    pagination={{
                      defaultPageSize: 20,
                      showSizeChanger: true,
                      pageSizeOptions: ['10', '20', '50', '100'],
                      showTotal: (total) => (
                        <span style={{ fontWeight: 500 }}>
                          共 <span style={{ color: '#ff4d4f' }}>{total}</span> 条异常记录
                        </span>
                      ),
                    }}
                    scroll={{ x: 'max-content' }}
                    sticky
                  />
                </Card>
              </>
            )}
          </Content>

        {/* SPU 编辑抽屉 */}
        <Drawer
          title={editingSpuName ? `编辑 SPU - ${editingSpuName}` : '编辑 SPU'}
          placement="right"
          onClose={handleCloseDrawer}
          open={drawerOpen}
          width="66%"
          destroyOnClose
        >
          {editingSpuID && (
            <SPUEditWrapper spuId={editingSpuID} />
          )}
        </Drawer>

        {/* 批量编辑 Modal */}
        <BatchEditModal
          visible={batchEditVisible}
          selectedIds={selectedRowKeys as number[]}
          onClose={() => setBatchEditVisible(false)}
          onSuccess={reloadData}
          cates={cates}
        />

        {/* 批量修改品牌 Modal */}
        <BatchChangeBrandModal
          visible={batchBrandModalVisible}
          onClose={() => setBatchBrandModalVisible(false)}
          onSuccess={reloadData}
          allBrands={allBrands}
        />
      </BrandListProvider>
    </SPUListProvider>
  </SpuIDProvider>
</SPUCateListProvider>
</PageWrap>
);
}

/**
 * SPU 编辑包装组件 - 用于设置 spuID 上下文
 */
function SPUEditWrapper({ spuId }: { spuId: number }) {
  const { setSpuID } = useSpuIDContext();
  
  useEffect(() => {
    setSpuID(spuId);
  }, [spuId, setSpuID]);

  return <SPUEdit defaultTab="basic" />;
}
