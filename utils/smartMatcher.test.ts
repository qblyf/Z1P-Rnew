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
