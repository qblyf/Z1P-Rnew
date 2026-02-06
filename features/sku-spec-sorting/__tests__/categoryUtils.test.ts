/**
 * 分类工具函数单元测试
 * 
 * 测试 categoryUtils.ts 中的分类相关函数
 */

import {
  categorizeAndSortSpecs,
  mergeCategorizedSpecs,
  findSpecIndexInCategory
} from '../categoryUtils';
import { SpecAttribute, CategorizedSpecs } from '../types';

describe('categoryUtils', () => {
  describe('categorizeAndSortSpecs', () => {
    it('应该正确分类规格属性', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
        { id: '2', name: 'C1', type: 'config', sortOrder: 20 },
        { id: '3', name: 'Col1', type: 'color', sortOrder: 10 }
      ];
      
      const result = categorizeAndSortSpecs(specs);
      
      expect(result.version).toHaveLength(1);
      expect(result.config).toHaveLength(1);
      expect(result.color).toHaveLength(1);
      
      expect(result.version[0].id).toBe('1');
      expect(result.config[0].id).toBe('2');
      expect(result.color[0].id).toBe('3');
    });

    it('应该在每个类别内按 sortOrder 降序排列', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'V1', type: 'version', sortOrder: 10 },
        { id: '2', name: 'V2', type: 'version', sortOrder: 30 },
        { id: '3', name: 'V3', type: 'version', sortOrder: 20 }
      ];
      
      const result = categorizeAndSortSpecs(specs);
      
      expect(result.version).toHaveLength(3);
      expect(result.version[0].id).toBe('2'); // sortOrder 30
      expect(result.version[1].id).toBe('3'); // sortOrder 20
      expect(result.version[2].id).toBe('1'); // sortOrder 10
    });

    it('应该正确处理空列表', () => {
      const result = categorizeAndSortSpecs([]);
      
      expect(result.version).toHaveLength(0);
      expect(result.config).toHaveLength(0);
      expect(result.color).toHaveLength(0);
    });

    it('应该正确处理只有一种类型的列表', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
        { id: '2', name: 'V2', type: 'version', sortOrder: 20 }
      ];
      
      const result = categorizeAndSortSpecs(specs);
      
      expect(result.version).toHaveLength(2);
      expect(result.config).toHaveLength(0);
      expect(result.color).toHaveLength(0);
    });

    it('应该保持每个类别的项数总和等于原列表长度', () => {
      const specs: SpecAttribute[] = [
        { id: '1', name: 'V1', type: 'version', sortOrder: 50 },
        { id: '2', name: 'V2', type: 'version', sortOrder: 40 },
        { id: '3', name: 'C1', type: 'config', sortOrder: 30 },
        { id: '4', name: 'Col1', type: 'color', sortOrder: 20 },
        { id: '5', name: 'Col2', type: 'color', sortOrder: 10 }
      ];
      
      const result = categorizeAndSortSpecs(specs);
      
      const totalCount = result.version.length + result.config.length + result.color.length;
      expect(totalCount).toBe(specs.length);
    });
  });

  describe('mergeCategorizedSpecs', () => {
    it('应该按顺序合并分类后的规格属性', () => {
      const categorized: CategorizedSpecs = {
        version: [
          { id: '1', name: 'V1', type: 'version', sortOrder: 30 }
        ],
        config: [
          { id: '2', name: 'C1', type: 'config', sortOrder: 20 }
        ],
        color: [
          { id: '3', name: 'Col1', type: 'color', sortOrder: 10 }
        ]
      };
      
      const result = mergeCategorizedSpecs(categorized);
      
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1'); // version
      expect(result[1].id).toBe('2'); // config
      expect(result[2].id).toBe('3'); // color
    });

    it('应该正确处理空类别', () => {
      const categorized: CategorizedSpecs = {
        version: [
          { id: '1', name: 'V1', type: 'version', sortOrder: 30 }
        ],
        config: [],
        color: [
          { id: '3', name: 'Col1', type: 'color', sortOrder: 10 }
        ]
      };
      
      const result = mergeCategorizedSpecs(categorized);
      
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
    });

    it('应该正确处理全空的分类', () => {
      const categorized: CategorizedSpecs = {
        version: [],
        config: [],
        color: []
      };
      
      const result = mergeCategorizedSpecs(categorized);
      
      expect(result).toHaveLength(0);
    });

    it('应该保持每个类别内的顺序', () => {
      const categorized: CategorizedSpecs = {
        version: [
          { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
          { id: '2', name: 'V2', type: 'version', sortOrder: 20 }
        ],
        config: [
          { id: '3', name: 'C1', type: 'config', sortOrder: 15 },
          { id: '4', name: 'C2', type: 'config', sortOrder: 10 }
        ],
        color: []
      };
      
      const result = mergeCategorizedSpecs(categorized);
      
      expect(result).toHaveLength(4);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      expect(result[2].id).toBe('3');
      expect(result[3].id).toBe('4');
    });
  });

  describe('findSpecIndexInCategory', () => {
    const categorized: CategorizedSpecs = {
      version: [
        { id: '1', name: 'V1', type: 'version', sortOrder: 30 },
        { id: '2', name: 'V2', type: 'version', sortOrder: 20 }
      ],
      config: [
        { id: '3', name: 'C1', type: 'config', sortOrder: 15 }
      ],
      color: [
        { id: '4', name: 'Col1', type: 'color', sortOrder: 10 },
        { id: '5', name: 'Col2', type: 'color', sortOrder: 5 }
      ]
    };

    it('应该在 version 类别中找到规格属性', () => {
      const result = findSpecIndexInCategory(categorized, '2');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('version');
      expect(result?.index).toBe(1);
    });

    it('应该在 config 类别中找到规格属性', () => {
      const result = findSpecIndexInCategory(categorized, '3');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('config');
      expect(result?.index).toBe(0);
    });

    it('应该在 color 类别中找到规格属性', () => {
      const result = findSpecIndexInCategory(categorized, '5');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('color');
      expect(result?.index).toBe(1);
    });

    it('应该在找不到时返回 null', () => {
      const result = findSpecIndexInCategory(categorized, 'non-existent');
      
      expect(result).toBeNull();
    });

    it('应该正确处理空分类', () => {
      const emptyCategorized: CategorizedSpecs = {
        version: [],
        config: [],
        color: []
      };
      
      const result = findSpecIndexInCategory(emptyCategorized, '1');
      
      expect(result).toBeNull();
    });

    it('应该返回第一个匹配项的索引', () => {
      const result = findSpecIndexInCategory(categorized, '1');
      
      expect(result).not.toBeNull();
      expect(result?.category).toBe('version');
      expect(result?.index).toBe(0);
    });
  });
});
