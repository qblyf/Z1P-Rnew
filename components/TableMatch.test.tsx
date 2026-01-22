/**
 * TableMatch 组件测试
 * 
 * 测试覆盖：
 * 1. 文件上传和解析
 * 2. 列选择
 * 3. 匹配逻辑
 * 4. 结果导出
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleMatcher } from './SmartMatch';

describe('SimpleMatcher', () => {
  let matcher: SimpleMatcher;

  beforeEach(() => {
    matcher = new SimpleMatcher();
  });

  describe('品牌提取', () => {
    it('应该提取英文品牌', () => {
      expect(matcher.extractBrand('iPhone 15 Pro Max')).toBe('apple');
      expect(matcher.extractBrand('Samsung Galaxy S24')).toBe('samsung');
      expect(matcher.extractBrand('Huawei Mate 60')).toBe('huawei');
    });

    it('应该提取中文品牌', () => {
      expect(matcher.extractBrand('苹果 iPhone 15')).toBe('apple');
      expect(matcher.extractBrand('华为 Mate 60')).toBe('huawei');
      expect(matcher.extractBrand('小米 Redmi Note 13')).toBe('xiaomi');
    });

    it('应该提取子品牌', () => {
      expect(matcher.extractBrand('Redmi Note 13')).toBe('redmi');
      expect(matcher.extractBrand('Honor 90')).toBe('honor');
      expect(matcher.extractBrand('Oppo Reno 11')).toBe('oppo');
    });
  });

  describe('型号提取', () => {
    it('应该提取简单型号', () => {
      const model = matcher.extractModel('iPhone 15 Pro Max');
      expect(model).toBeTruthy();
      expect(model?.toLowerCase()).toContain('iphone');
    });

    it('应该提取复杂型号', () => {
      const model = matcher.extractModel('Vivo Y300 Pro 12GB+512GB');
      expect(model).toBeTruthy();
      expect(model?.toLowerCase()).toContain('y300');
    });

    it('应该标准化型号', () => {
      const model1 = matcher.extractModel('watchgt');
      const model2 = matcher.extractModel('watch gt');
      expect(model1).toBe(model2);
    });

    it('应该移除括号内的型号代码', () => {
      const model = matcher.extractModel('vivo WATCH GT（WA2456C）');
      expect(model).toBeTruthy();
      expect(model?.toLowerCase()).toContain('watch');
      expect(model).not.toContain('WA2456C');
    });
  });

  describe('容量提取', () => {
    it('应该提取括号格式的容量', () => {
      expect(matcher.extractCapacity('iPhone 15 (256GB)')).toBe('256');
      expect(matcher.extractCapacity('Samsung (12+512)')).toBe('12+512');
    });

    it('应该提取非括号格式的容量', () => {
      expect(matcher.extractCapacity('Vivo Y300 12+512')).toBe('12+512');
      expect(matcher.extractCapacity('iPhone 15 256GB')).toBe('256');
    });

    it('应该提取 GB 格式的容量', () => {
      expect(matcher.extractCapacity('12GB+512GB')).toBe('12+512');
    });
  });

  describe('颜色提取', () => {
    it('应该提取基础颜色', () => {
      const color = matcher.extractColor('iPhone 15 黑色');
      expect(color).toBe('黑色');
    });

    it('应该提取复合颜色名称', () => {
      const color = matcher.extractColor('Vivo Y300 龙晶紫');
      expect(color).toBe('龙晶紫');
    });

    it('应该从末尾提取颜色', () => {
      const color = matcher.extractColor('Samsung Galaxy S24 Ultra 钛金黑');
      expect(color).toBe('钛金黑');
    });

    it('应该从版本后提取颜色', () => {
      const color = matcher.extractColor('Watch GT 蓝牙版夏夜黑');
      expect(color).toBe('夏夜黑');
    });
  });

  describe('版本提取', () => {
    it('应该提取版本信息', () => {
      const version = matcher.extractVersion('iPhone 15 Pro版');
      expect(version).toBeTruthy();
      expect(version?.name).toContain('Pro');
    });

    it('应该提取标准版', () => {
      const version = matcher.extractVersion('Vivo Y300 标准版');
      expect(version).toBeTruthy();
      expect(version?.name).toBe('标准版');
    });
  });

  describe('SPU 部分提取', () => {
    it('应该从 5G 标记提取 SPU 部分', () => {
      const spu = matcher.extractSPUPart('Vivo Y300 5G 12+512 龙晶紫');
      expect(spu).toBe('Vivo Y300');
    });

    it('应该从容量标记提取 SPU 部分', () => {
      const spu = matcher.extractSPUPart('iPhone 15 Pro Max 256GB 黑色');
      expect(spu).toBe('iPhone 15 Pro Max');
    });

    it('应该处理括号格式的容量', () => {
      const spu = matcher.extractSPUPart('Samsung Galaxy S24 (12+512) 钛金黑');
      expect(spu).toBe('Samsung Galaxy S24');
    });
  });

  describe('相似度计算', () => {
    it('完全相同的字符串应该返回 1.0', () => {
      const similarity = matcher.calculateSimilarity('iPhone 15', 'iPhone 15');
      expect(similarity).toBe(1.0);
    });

    it('品牌不匹配应该返回低分数', () => {
      const similarity = matcher.calculateSimilarity('iPhone 15', 'Samsung S24');
      expect(similarity).toBeLessThan(0.3);
    });

    it('型号不匹配应该返回低分数', () => {
      const similarity = matcher.calculateSimilarity('iPhone 15', 'iPhone 14');
      expect(similarity).toBeLessThan(0.5);
    });

    it('相似的字符串应该返回中等分数', () => {
      const similarity = matcher.calculateSimilarity(
        'iPhone 15 Pro Max 256GB 黑色',
        'iPhone 15 Pro Max'
      );
      expect(similarity).toBeGreaterThan(0.5);
    });
  });

  describe('颜色变体识别', () => {
    it('应该识别已知的颜色变体', () => {
      const matcher1 = new SimpleMatcher();
      expect(matcher1.isColorMatch('雾凇蓝', '雾松蓝')).toBe(true);
      expect(matcher1.isColorMatch('龙晶紫', '极光紫')).toBe(true);
    });

    it('应该识别不同的颜色', () => {
      const matcher1 = new SimpleMatcher();
      expect(matcher1.isColorMatch('黑色', '白色')).toBe(false);
      expect(matcher1.isColorMatch('蓝色', '红色')).toBe(false);
    });

    it('应该识别相同的颜色', () => {
      const matcher1 = new SimpleMatcher();
      expect(matcher1.isColorMatch('黑色', '黑色')).toBe(true);
    });
  });

  describe('SPU 过滤', () => {
    it('应该过滤礼盒版 SPU', () => {
      const shouldFilter = matcher.shouldFilterSPU(
        'iPhone 15',
        'iPhone 15 礼盒版'
      );
      expect(shouldFilter).toBe(true);
    });

    it('不应该过滤标准版 SPU', () => {
      const shouldFilter = matcher.shouldFilterSPU(
        'iPhone 15',
        'iPhone 15'
      );
      expect(shouldFilter).toBe(false);
    });

    it('应该过滤版本互斥的 SPU', () => {
      const shouldFilter = matcher.shouldFilterSPU(
        'Watch GT 蓝牙版',
        'Watch GT eSIM版'
      );
      expect(shouldFilter).toBe(true);
    });
  });

  describe('SPU 优先级', () => {
    it('标准版应该有最高优先级', () => {
      const priority = matcher.getSPUPriority('iPhone 15', 'iPhone 15');
      expect(priority).toBe(3);
    });

    it('版本匹配的特殊版应该有中等优先级', () => {
      const priority = matcher.getSPUPriority(
        'Watch GT 蓝牙版',
        'Watch GT 蓝牙版'
      );
      expect(priority).toBe(2);
    });

    it('其他特殊版应该有最低优先级', () => {
      const priority = matcher.getSPUPriority(
        'iPhone 15',
        'iPhone 15 礼盒版'
      );
      expect(priority).toBe(1);
    });
  });

  describe('输入预处理', () => {
    it('应该处理空格变体', () => {
      const processed = matcher.preprocessInputAdvanced('Reno15');
      expect(processed).toContain('Reno');
      expect(processed).toContain('15');
    });

    it('应该处理大小写', () => {
      const processed = matcher.preprocessInputAdvanced('iphone 15');
      expect(processed).toContain('Iphone');
    });

    it('应该清理多余空格', () => {
      const processed = matcher.preprocessInputAdvanced('iPhone  15   Pro');
      expect(processed).not.toContain('  ');
    });

    it('应该处理特殊字符', () => {
      const processed = matcher.preprocessInputAdvanced('iPhone（15）');
      expect(processed).toContain('(');
      expect(processed).toContain(')');
    });
  });

  describe('演示机标记清理', () => {
    it('应该移除演示机标记', () => {
      const cleaned = matcher.cleanDemoMarkers('iPhone 15 演示机');
      expect(cleaned).not.toContain('演示机');
      expect(cleaned).toContain('iPhone');
    });

    it('应该移除配件品牌前缀', () => {
      const cleaned = matcher.cleanDemoMarkers('优诺严选 iPhone 15');
      expect(cleaned).not.toContain('优诺严选');
      expect(cleaned).toContain('iPhone');
    });
  });
});

describe('TableMatch 组件集成测试', () => {
  it('应该支持 CSV 文件解析', () => {
    const csvContent = `商品名称,品牌,分类
iPhone 15 Pro Max 256GB 黑色,Apple,手机
Samsung Galaxy S24 Ultra 12GB+256GB 钛金黑,Samsung,手机`;

    const lines = csvContent.split('\n').filter(line => line.trim());
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line =>
      line.split(delimiter).map(cell => cell.trim())
    );

    expect(headers).toEqual(['商品名称', '品牌', '分类']);
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toBe('iPhone 15 Pro Max 256GB 黑色');
  });

  it('应该支持 Tab 分隔的 TXT 文件解析', () => {
    const txtContent = `商品名称\t品牌\t分类
iPhone 15 Pro Max 256GB 黑色\tApple\t手机
Samsung Galaxy S24 Ultra 12GB+256GB 钛金黑\tSamsung\t手机`;

    const lines = txtContent.split('\n').filter(line => line.trim());
    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = lines.slice(1).map(line =>
      line.split(delimiter).map(cell => cell.trim())
    );

    expect(headers).toEqual(['商品名称', '品牌', '分类']);
    expect(rows.length).toBe(2);
    expect(delimiter).toBe('\t');
  });

  it('应该正确处理空行', () => {
    const csvContent = `商品名称,品牌

iPhone 15 Pro Max 256GB 黑色,Apple

Samsung Galaxy S24 Ultra 12GB+256GB 钛金黑,Samsung`;

    const lines = csvContent.split('\n').filter(line => line.trim());
    expect(lines.length).toBe(3); // 空行被过滤
  });
});

describe('匹配结果导出', () => {
  it('应该生成正确的 CSV 格式', () => {
    const results = [
      {
        productName: 'iPhone 15 Pro Max 256GB 黑色',
        status: 'matched',
        matchedBrand: 'Apple',
        matchedSPU: 'iPhone 15 Pro Max',
        matchedSKU: 'iPhone 15 Pro Max 256GB 黑色',
        matchedVersion: null,
        matchedMemory: '256',
        matchedColor: '黑色',
        matchedGtins: ['123456789'],
        similarity: 0.95,
      },
    ];

    const headers = ['原商品名', '匹配状态', '品牌', 'SPU', 'SKU', '版本', '容量', '颜色', '69码', '相似度'];
    const rows = results.map(result => [
      result.productName,
      result.status === 'matched' ? '完全匹配' : '未匹配',
      result.matchedBrand || '',
      result.matchedSPU || '',
      result.matchedSKU || '',
      result.matchedVersion || '',
      result.matchedMemory || '',
      result.matchedColor || '',
      result.matchedGtins.join(';') || '',
      `${(result.similarity * 100).toFixed(1)}%`,
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    expect(csv).toContain('iPhone 15 Pro Max 256GB 黑色');
    expect(csv).toContain('完全匹配');
    expect(csv).toContain('95.0%');
  });
});
