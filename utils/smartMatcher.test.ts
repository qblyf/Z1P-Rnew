/**
 * SimpleMatcher 测试
 * 验证型号提取逻辑，特别是带加号的型号
 */

import { SimpleMatcher } from './smartMatcher';

describe('SimpleMatcher - 型号提取', () => {
  const matcher = new SimpleMatcher();

  test('应该正确提取带加号的型号 Y300 Pro+', () => {
    const input = 'Vivo Y300 Pro+ 5G 12+512 微粉';
    const model = matcher.extractModel(input);
    
    // 应该提取为 y300pro+ 而不是 y300pro
    expect(model).toBe('y300pro+');
  });

  test('应该区分 Y300 Pro 和 Y300 Pro+', () => {
    const input1 = 'Vivo Y300 Pro 5G 12+512 微粉';
    const input2 = 'Vivo Y300 Pro+ 5G 12+512 微粉';
    
    const model1 = matcher.extractModel(input1);
    const model2 = matcher.extractModel(input2);
    
    expect(model1).toBe('y300pro');
    expect(model2).toBe('y300pro+');
    expect(model1).not.toBe(model2);
  });

  test('应该正确提取其他带加号的型号', () => {
    const testCases = [
      { input: 'iPhone 15 Pro Max+', expected: 'iphone15promax+' },
      { input: 'Xiaomi 14 Ultra+', expected: 'xiaomi14ultra+' },
      { input: 'OPPO Reno 15 Pro+', expected: 'reno15pro+' },
    ];

    testCases.forEach(({ input, expected }) => {
      const model = matcher.extractModel(input);
      expect(model).toBe(expected);
    });
  });

  test('应该正确提取不带加号的型号', () => {
    const testCases = [
      { input: 'Vivo Y300 Pro', expected: 'y300pro' },
      { input: 'iPhone 15 Pro Max', expected: 'iphone15promax' },
      { input: 'Xiaomi 14 Ultra', expected: 'xiaomi14ultra' },
    ];

    testCases.forEach(({ input, expected }) => {
      const model = matcher.extractModel(input);
      expect(model).toBe(expected);
    });
  });
});

describe('SimpleMatcher - 输入预处理', () => {
  const matcher = new SimpleMatcher();

  test('应该保留括号中的容量信息', () => {
    const input = 'OPPO A5PRO (12+256)石英白';
    const processed = matcher.preprocessInputAdvanced(input);
    
    // 应该包含容量信息
    expect(processed).toContain('12+256');
    // 应该包含型号
    expect(processed).toContain('A5PRO');
    // 应该包含颜色
    expect(processed).toContain('石英白');
  });

  test('应该正确处理带网络制式的输入', () => {
    const input = 'Vivo Y300 Pro+ 5G (12+512) 微粉';
    const processed = matcher.preprocessInputAdvanced(input);
    
    // 应该包含容量信息
    expect(processed).toContain('12+512');
    // 应该包含网络制式
    expect(processed).toContain('5G');
  });

  test('应该正确处理没有括号的输入', () => {
    const input = 'OPPO A5PRO 12+256 石英白';
    const processed = matcher.preprocessInputAdvanced(input);
    
    // 应该保持原样
    expect(processed).toContain('A5PRO');
    expect(processed).toContain('12+256');
    expect(processed).toContain('石英白');
  });
});

describe('SimpleMatcher - SPU 匹配', () => {
  const matcher = new SimpleMatcher();

  test('应该匹配正确的 SPU（Y300 Pro+ vs Y300 Pro）', () => {
    const input = 'Vivo Y300 Pro+ 5G 12+512 微粉';
    
    const spuList = [
      { id: 1, name: 'vivo Y300 Pro 全网通5G', brand: 'vivo' },
      { id: 2, name: 'vivo Y300 Pro+ 全网通5G', brand: 'vivo' },
    ];

    const { spu } = matcher.findBestSPUMatch(input, spuList, 0.5);
    
    // 应该匹配到 Y300 Pro+ 而不是 Y300 Pro
    expect(spu?.id).toBe(2);
    expect(spu?.name).toBe('vivo Y300 Pro+ 全网通5G');
  });
});

describe('SimpleMatcher - 颜色匹配', () => {
  const matcher = new SimpleMatcher();

  test('应该优先完全匹配颜色', () => {
    const color1 = '灵感紫';
    const color2 = '灵感紫';
    
    const isMatch = matcher.isColorMatch(color1, color2);
    
    expect(isMatch).toBe(true);
  });

  test('灵感紫和告白不应该通过变体匹配', () => {
    const color1 = '灵感紫';
    const color2 = '告白';
    
    const isMatch = matcher.isColorMatch(color1, color2);
    
    // 灵感紫（紫色系）和告白（白色系）不应该匹配
    expect(isMatch).toBe(false);
  });

  test('告白应该属于白色系', () => {
    const color1 = '告白';
    const color2 = '零度白';
    
    const isMatch = matcher.isColorMatch(color1, color2);
    
    // 告白和零度白都属于白色系，应该匹配
    expect(isMatch).toBe(true);
  });

  test('应该正确匹配 S50 Pro mini 的颜色（优先完全匹配）', () => {
    const input = 'Vivo S50 Promini 5G 16+512 灵感紫';
    
    const skuList = [
      { 
        id: 1, 
        name: 'vivo S50 Pro mini 全网通5G 16GB+512GB 灵感紫',
        memory: '16+512',
        color: '灵感紫',
        gtins: ['6901234567890']
      },
      { 
        id: 2, 
        name: 'vivo S50 Pro mini 全网通5G 16GB+512GB 告白',
        memory: '16+512',
        color: '告白',
        gtins: ['6901234567891']
      },
    ];

    const { sku } = matcher.findBestSKUWithVersion(input, skuList, null);
    
    // 应该匹配到灵感紫（完全匹配），而不是告白
    expect(sku?.id).toBe(1);
    expect(sku?.color).toBe('灵感紫');
  });

  test('如果没有完全匹配的颜色，应该返回最佳匹配', () => {
    const input = 'Vivo S50 Promini 5G 16+512 灵感紫';
    
    const skuList = [
      { 
        id: 1, 
        name: 'vivo S50 Pro mini 全网通5G 16GB+512GB 告白',
        memory: '16+512',
        color: '告白',
        gtins: ['6901234567890']
      },
      { 
        id: 2, 
        name: 'vivo S50 Pro mini 全网通5G 16GB+512GB 钛色',
        memory: '16+512',
        color: '钛色',
        gtins: ['6901234567891']
      },
    ];

    const { sku, similarity } = matcher.findBestSKUWithVersion(input, skuList, null);
    
    // 没有灵感紫，应该匹配容量相同的任意一个
    // 但相似度应该较低（因为颜色不匹配）
    expect(sku).not.toBeNull();
    expect(similarity).toBeLessThan(0.8); // 颜色不匹配，相似度应该低于80%
  });
});
