# 实施计划：智能匹配准确率优化

## 概述

本实施计划将智能匹配系统的准确率从15.3%提升至85%以上。实施分为4个阶段，重点优化SPU匹配、型号识别、颜色提取和SKU参数匹配。

## 任务列表

- [ ] 1. 实现型号标准化和提取增强
  - [x] 1.1 创建型号标准化映射配置
    - 定义 MODEL_NORMALIZATIONS 常量，包含所有连写型号的映射（promini → pro mini, watchgt → watch gt等）
    - 定义版本过滤关键词常量（GIFT_BOX_KEYWORDS, VERSION_KEYWORDS, MATERIAL_KEYWORDS）
    - _Requirements: 2.3.1, 2.3.2, 2.3.3, 3.1.2_
  
  - [x] 1.2 增强 extractModel 方法
    - 实现型号标准化预处理（应用 MODEL_NORMALIZATIONS 映射）
    - 实现多层次型号匹配（优先级1: 字母+字母，优先级2: 复杂型号，优先级3: 简单型号）
    - 添加过滤逻辑（排除网络制式、容量、纯数字+g）
    - 移除括号内的型号代码（如（WA2456C））
    - _Requirements: 2.1.1, 2.1.2, 2.3.1, 2.3.2, 2.3.3, 3.1.2_
  
  - [x] 1.3 编写型号标准化的属性测试
    - **Property 1: 复合型号标准化一致性**
    - **Validates: Requirements 2.3.1, 2.3.2**
  
  - [x] 1.4 编写数字空格标准化的属性测试
    - **Property 2: 数字空格标准化一致性**
    - **Validates: Requirements 2.3.3**
  
  - [x] 1.5 编写大小写标准化的属性测试
    - **Property 3: 大小写标准化一致性**
    - **Validates: Requirements 2.3.2**


- [ ] 2. 实现SPU版本过滤
  - [x] 2.1 创建版本过滤辅助函数
    - 实现 shouldFilterSPU 函数，检查是否应该过滤某个SPU
    - 实现礼盒版过滤规则（输入不含"礼盒"时过滤礼盒版SPU）
    - 实现版本互斥过滤规则（蓝牙版 vs eSIM版）
    - _Requirements: 2.2.1, 2.2.2, 3.1.1, 3.1.2_
  
  - [x] 2.2 实现SPU优先级排序
    - 创建 getSPUPriority 函数，计算SPU的优先级分数
    - 标准版（不含特殊关键词）优先级最高
    - 版本匹配的特殊版次之
    - 其他特殊版优先级最低
    - _Requirements: 2.2.3, 3.1.3_
  
  - [x] 2.3 更新 findBestSPUMatch 方法
    - 在匹配前应用版本过滤
    - 在相似度相同时应用优先级排序
    - 添加详细的日志记录
    - _Requirements: 2.2.1, 2.2.2, 2.2.3, 3.1.1, 3.1.2, 3.1.3_
  
  - [ ] 2.4 编写礼盒版过滤的属性测试
    - **Property 4: 礼盒版过滤**
    - **Validates: Requirements 2.2.1, 3.1.1**
  
  - [ ] 2.5 编写版本互斥过滤的属性测试
    - **Property 5: 版本互斥过滤**
    - **Validates: Requirements 2.2.2, 3.1.2**
  
  - [ ] 2.6 编写标准版本优先级的属性测试
    - **Property 6: 标准版本优先级**
    - **Validates: Requirements 2.2.3, 3.1.3**

- [ ] 3. 增强颜色识别
  - [x] 3.1 优化动态颜色列表提取
    - 保持现有的从SKU数据提取颜色的逻辑
    - 确保颜色列表按长度降序排序
    - 添加提取进度日志
    - _Requirements: 2.4.1, 3.2.1, 3.2.2_
  
  - [x] 3.2 创建颜色变体映射
    - 定义 COLOR_VARIANTS 常量，包含已知的颜色变体对（雾凇蓝 ↔ 雾松蓝）
    - 实现 isColorVariant 辅助函数
    - _Requirements: 2.4.3, 3.2.4_
  
  - [ ] 3.3 增强 extractColor 方法
    - 保持现有的多方法提取策略（动态列表、末尾提取、容量后提取、基础颜色）
    - 确保支持复合颜色名称（可可黑、薄荷青）
    - 确保支持带修饰词的颜色（夏夜黑、辰夜黑）
    - _Requirements: 2.4.1, 2.4.2, 3.2.2, 3.2.3_
  
  - [ ] 3.4 编写特殊颜色识别的属性测试
    - **Property 7: 特殊颜色名称识别**
    - **Validates: Requirements 2.4.1, 3.2.2**
  
  - [ ] 3.5 编写带修饰词颜色识别的属性测试
    - **Property 8: 带修饰词颜色识别**
    - **Validates: Requirements 2.4.2, 3.2.3**
  
  - [ ] 3.6 编写颜色变体等价性的属性测试
    - **Property 9: 颜色变体等价性**
    - **Validates: Requirements 2.4.3, 3.2.4**


- [ ] 4. 优化容量提取
  - [ ] 4.1 增强 extractCapacity 方法
    - 保持现有的多格式支持（括号、无括号、单容量）
    - 确保输出统一为标准格式（12+512）
    - 添加边界情况处理
    - _Requirements: 3.2.2_
  
  - [ ] 4.2 编写容量格式标准化的属性测试
    - **Property 10: 容量格式标准化**
    - **Validates: Requirements 3.2.2**

- [ ] 5. 优化相似度计算
  - [ ] 5.1 更新 calculateSPUSimilarity 方法
    - 实现品牌匹配（权重40%，必须匹配）
    - 实现型号匹配（权重60%，必须匹配）
    - 品牌或型号不匹配时返回0
    - _Requirements: 3.3.1, 3.3.2_
  
  - [ ] 5.2 更新 calculateSKUSimilarity 方法
    - 实现容量匹配（权重70%）
    - 实现颜色匹配（权重30%）
    - 支持颜色变体匹配
    - 支持颜色包含关系和基础颜色匹配
    - _Requirements: 3.3.2_
  
  - [ ] 5.3 更新综合相似度计算
    - SPU相似度占50%
    - SKU相似度占50%
    - 更新阈值配置（SPU: 0.5, SKU: 0.7, 综合: 0.65）
    - _Requirements: 3.3.2_
  
  - [ ] 5.4 编写品牌型号匹配必要性的属性测试
    - **Property 11: 品牌型号匹配必要性**
    - **Validates: Requirements 3.3.1**
  
  - [ ] 5.5 编写参数匹配一致性的属性测试
    - **Property 12: 参数匹配一致性**
    - **Validates: Requirements 3.3.3**

- [ ] 6. 第一阶段检查点
  - 运行所有单元测试和属性测试
  - 使用1178条测试数据验证准确率
  - 分析失败案例，记录问题
  - 如有问题，与用户讨论调整方案


- [ ] 7. 添加版本信息提取（可选优化）
  - [ ] 7.1 实现 extractVersion 方法
    - 识别"蓝牙版"、"eSIM版"、"5G版"、"4G版"
    - 识别材质信息："软胶"、"硅胶"、"皮革"、"陶瓷"、"玻璃"
    - _Requirements: 3.2.3_
  
  - [ ] 7.2 在SKU匹配中考虑版本信息
    - 更新 calculateSKUSimilarity 方法，添加版本信息权重
    - 版本匹配时增加相似度分数
    - _Requirements: 3.2.3_

- [ ] 8. 改进错误处理和用户反馈
  - [ ] 8.1 增强匹配失败信息
    - SPU未匹配时，显示提取的品牌和型号
    - SKU未匹配时，显示提取的容量和颜色
    - 相似度不足时，显示计算的相似度值
    - _Requirements: 3.3.3_
  
  - [ ] 8.2 添加边界情况处理
    - 空输入检查和提示
    - 特殊字符处理
    - 超长输入处理
    - _Requirements: 通用错误处理_
  
  - [ ] 8.3 优化进度提示
    - 确保批量匹配时实时更新UI
    - 显示当前处理进度（X/总数）
    - 显示匹配状态统计（已匹配/未匹配）
    - _Requirements: 4.3 用户体验_

- [ ] 9. 性能优化
  - [ ] 9.1 优化SPU数据加载
    - 确保只加载必要字段（id, name, brand）
    - 添加加载进度提示
    - _Requirements: 4.1 性能要求_
  
  - [ ] 9.2 优化颜色列表提取
    - 确保采样数量合理（200个SPU）
    - 添加提取进度提示
    - 缓存提取结果
    - _Requirements: 4.1 性能要求_
  
  - [ ] 9.3 添加性能监控日志
    - 在SPU匹配、SKU匹配等关键操作添加计时日志
    - 记录批量处理的总时间
    - _Requirements: 4.1 性能要求_


- [ ] 10. 配置化和可维护性改进
  - [ ] 10.1 创建配置常量
    - 定义 CONFIG 对象，包含所有阈值和配置参数
    - SPU_MATCH_THRESHOLD, SKU_MATCH_THRESHOLD, FINAL_MATCH_THRESHOLD
    - COLOR_SAMPLE_SIZE
    - _Requirements: 4.3 可维护性_
  
  - [ ] 10.2 添加详细的代码注释
    - 为所有核心方法添加JSDoc注释
    - 说明每个方法的输入、输出和用途
    - 添加复杂逻辑的行内注释
    - _Requirements: 4.3 可维护性_
  
  - [ ] 10.3 优化日志输出
    - 确保所有关键步骤都有日志记录
    - 使用统一的日志格式
    - 添加日志级别控制（可选）
    - _Requirements: 4.3 可维护性_

- [ ] 11. 最终测试和验证
  - [ ] 11.1 运行完整的测试套件
    - 运行所有单元测试
    - 运行所有属性测试（每个至少100次迭代）
    - 确保测试覆盖率 ≥ 80%
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 11.2 使用真实数据验证
    - 使用1178条测试数据进行完整测试
    - 计算整体准确率
    - 分析失败案例，记录原因
    - 确认准确率达到85%以上
    - _Requirements: 4.2 准确率要求_
  
  - [ ] 11.3 性能验证
    - 测试单条匹配响应时间（目标 < 2秒）
    - 测试100条批量匹配时间（目标 < 30秒）
    - 测试SPU数据加载时间（目标 < 10秒）
    - _Requirements: 4.1 性能要求_
  
  - [ ] 11.4 编写集成测试
    - 测试完整的匹配流程（输入 → SPU匹配 → SKU匹配 → 结果输出）
    - 测试批量处理流程
    - 测试错误处理流程
    - _Requirements: 通用集成测试_

- [ ] 12. 最终检查点
  - 确认所有测试通过
  - 确认准确率达到85%以上
  - 确认性能指标达标
  - 与用户确认是否有其他问题或改进建议

## 注意事项

- 所有任务都是必需的，包括所有属性测试和集成测试
- 每个任务都引用了相关的需求编号，便于追溯
- 建议按顺序执行任务，因为后续任务可能依赖前面的实现
- 在检查点任务处，应该与用户确认进度和质量

## 测试框架配置

### 属性测试配置

使用 fast-check 库进行属性测试：

```typescript
import fc from 'fast-check';

// 每个属性测试至少运行100次
fc.assert(
  fc.property(
    // generators
    (input) => {
      // property test
    }
  ),
  { numRuns: 100 }
);
```

### 测试标签格式

每个属性测试应该包含标签注释：

```typescript
// Feature: smart-match-accuracy-improvement, Property 1: 复合型号标准化一致性
test('Property 1: Compound model normalization consistency', () => {
  // test implementation
});
```
