# 需求文档：智能匹配算法优化

## 简介

本文档定义了智能匹配算法优化功能的需求。当前的智能匹配功能存在多个匹配错误问题，需要针对性优化算法以提高匹配准确率。现有功能位于 `app/smart-match/page.tsx` 和 `components/SmartMatch.tsx`，参考算法在 `.kiro/smartMatcher.ts` 和 `.kiro/matchingService.ts`。

根据用户提供的40个真实匹配错误案例，识别出以下四类主要问题：
1. 型号名称空格处理问题（8个案例）
2. 手表产品型号识别问题（4个案例）
3. 同型号多SKU混淆问题（2个案例）
4. 产品系列版本识别问题（6个案例）

## 术语表

- **Matching_Algorithm**: 智能匹配算法，用于将用户输入的产品名称与数据库中的SKU/SPU进行匹配
- **SKU**: Stock Keeping Unit，库存量单位，表示具体的产品规格（如颜色、容量）
- **SPU**: Standard Product Unit，标准产品单位，表示产品型号（不包含具体规格）
- **Normalization**: 标准化处理，将不同格式的字符串转换为统一格式以便比较
- **Space_Handler**: 空格处理器，负责处理型号名称中的空格标准化
- **Watch_Recognizer**: 手表识别器，专门处理手表类产品的型号识别
- **Version_Extractor**: 版本提取器，用于识别产品的版本标识（如"活力版"）
- **Model_Disambiguator**: 型号消歧器，用于区分相似型号（如X200 Pro vs X200 Pro mini）
- **Similarity_Score**: 相似度分数，表示两个产品名称的匹配程度（0-1之间）

## 需求

### 需求 1：型号名称空格标准化

**用户故事**：作为系统用户，我希望算法能够正确处理型号名称中缺失或多余的空格，以便准确匹配产品。

#### 验收标准

1. WHEN 输入的型号名称缺少空格（如"Vivo S30Promini"），THE Space_Handler SHALL 将其标准化为正确格式（如"vivo S30 Pro mini"）
2. WHEN 输入的型号名称包含多余空格，THE Space_Handler SHALL 将其标准化为正确格式
3. WHEN 比较两个型号名称时，THE Matching_Algorithm SHALL 使用标准化后的格式进行匹配
4. THE Space_Handler SHALL 识别常见的型号后缀（Pro、Max、Mini、Plus、Ultra、SE、Air）并在其前后添加适当空格
5. THE Space_Handler SHALL 识别品牌名称后的型号代码（如"S30"、"X200"）并在品牌与型号之间添加空格

### 需求 2：手表产品专用识别

**用户故事**：作为系统用户，我希望算法能够准确识别手表产品的型号格式和属性顺序，以便正确匹配手表SKU。

#### 验收标准

1. WHEN 输入包含手表产品（如"VIVO WatchGT"），THE Watch_Recognizer SHALL 识别其为手表类型
2. WHEN 匹配手表产品时，THE Watch_Recognizer SHALL 提取型号代码（如"WA2456C"）并与数据库中的型号代码进行匹配
3. WHEN 手表产品包含多个属性（如"蓝牙版"、"夏夜黑"、"软胶"），THE Watch_Recognizer SHALL 识别所有属性并按标准顺序排列
4. THE Watch_Recognizer SHALL 处理手表特有的属性类型（表带材质、连接方式、尺寸）
5. WHEN 输入的属性顺序与数据库不同时，THE Matching_Algorithm SHALL 仍能正确匹配

### 需求 3：同型号多SKU精确区分

**用户故事**：作为系统用户，我希望算法能够准确区分同系列的不同型号（如X200 Pro和X200 Pro mini），避免混淆匹配。

#### 验收标准

1. WHEN 输入包含完整型号名称（如"X200 Pro"），THE Model_Disambiguator SHALL 排除相似但不同的型号（如"X200 Pro mini"）
2. WHEN 比较型号时，THE Model_Disambiguator SHALL 识别型号后缀的完整性（Pro vs Pro mini）
3. THE Model_Disambiguator SHALL 为完全匹配的型号分配更高的相似度分数
4. WHEN 型号名称包含"mini"、"Plus"等后缀时，THE Model_Disambiguator SHALL 将其视为型号的一部分而非可选属性
5. THE Matching_Algorithm SHALL 在型号不完全匹配时降低相似度分数至阈值以下

### 需求 4：产品版本标识识别

**用户故事**：作为系统用户，我希望算法能够识别产品的版本标识（如"活力版"、"全网通5G版"），以便准确匹配正确的产品版本。

#### 验收标准

1. WHEN 输入包含版本标识（如"活力版"、"标准版"、"青春版"），THE Version_Extractor SHALL 提取该版本标识
2. WHEN 匹配产品时，THE Matching_Algorithm SHALL 将版本标识作为关键匹配因素
3. THE Version_Extractor SHALL 识别常见的版本标识词汇（活力版、标准版、青春版、至尊版、竞速版、极速版）
4. WHEN 输入的版本标识与候选SKU不匹配时，THE Matching_Algorithm SHALL 降低该候选项的相似度分数
5. THE Matching_Algorithm SHALL 在版本标识匹配的情况下优先选择该候选项

### 需求 5：颜色属性准确匹配

**用户故事**：作为系统用户，我希望算法能够准确匹配产品的颜色属性，避免颜色错配导致的匹配错误。

#### 验收标准

1. WHEN 输入包含颜色信息（如"玉石绿"），THE Matching_Algorithm SHALL 提取该颜色信息
2. WHEN 候选SKU的颜色与输入颜色不匹配时，THE Matching_Algorithm SHALL 降低该候选项的相似度分数
3. THE Matching_Algorithm SHALL 识别颜色的同义词和变体（如"雾凇"与"雾松"）
4. WHEN 输入和候选SKU都包含颜色信息时，THE Matching_Algorithm SHALL 将颜色匹配作为必要条件
5. THE Matching_Algorithm SHALL 从动态颜色列表中提取颜色信息以提高识别准确率

### 需求 6：匹配阈值动态调整

**用户故事**：作为系统用户，我希望算法能够根据产品类型和匹配字段动态调整匹配阈值，以提高匹配准确率。

#### 验收标准

1. WHEN 匹配不同产品类型时，THE Matching_Algorithm SHALL 使用不同的基础阈值
2. THE Matching_Algorithm SHALL 为手表类产品使用更高的匹配阈值（0.72）
3. THE Matching_Algorithm SHALL 为手机类产品使用标准匹配阈值（0.70）
4. WHEN 匹配SKU名称字段时，THE Matching_Algorithm SHALL 提高阈值（+0.05）
5. WHEN 匹配SPU名称字段时，THE Matching_Algorithm SHALL 降低阈值（-0.05）

### 需求 7：属性验证增强

**用户故事**：作为系统用户，我希望算法能够验证匹配结果的关键属性（品牌、型号、容量、颜色等），确保匹配的准确性。

#### 验收标准

1. WHEN 找到候选匹配时，THE Matching_Algorithm SHALL 验证品牌是否一致
2. WHEN 找到候选匹配时，THE Matching_Algorithm SHALL 验证产品型号是否一致
3. WHEN 输入和候选SKU都包含容量信息时，THE Matching_Algorithm SHALL 验证容量是否一致
4. WHEN 输入和候选SKU都包含颜色信息时，THE Matching_Algorithm SHALL 验证颜色是否一致
5. WHEN 输入和候选SKU都包含版本标识时，THE Matching_Algorithm SHALL 验证版本标识是否一致
6. WHEN 任何关键属性验证失败时，THE Matching_Algorithm SHALL 拒绝该候选项或显著降低其相似度分数
7. THE Matching_Algorithm SHALL 记录验证失败的原因以便调试和分析

### 需求 8：匹配结果可追溯性

**用户故事**：作为系统开发者，我希望算法能够记录匹配过程的详细信息，以便分析和优化匹配逻辑。

#### 验收标准

1. WHEN 执行匹配时，THE Matching_Algorithm SHALL 记录输入产品的提取信息（品牌、型号、容量、颜色、版本）
2. WHEN 执行匹配时，THE Matching_Algorithm SHALL 记录候选SKU的提取信息
3. WHEN 执行匹配时，THE Matching_Algorithm SHALL 记录相似度计算的详细过程
4. WHEN 执行匹配时，THE Matching_Algorithm SHALL 记录属性验证的结果和失败原因
5. THE Matching_Algorithm SHALL 在控制台输出前3行的详细匹配日志以便调试
6. THE Matching_Algorithm SHALL 每处理100行显示一次进度信息

### 需求 9：性能优化

**用户故事**：作为系统用户，我希望匹配算法能够快速处理大批量数据，提供良好的用户体验。

#### 验收标准

1. THE Matching_Algorithm SHALL 使用索引结构加速候选项查找
2. THE Matching_Algorithm SHALL 使用品牌过滤减少候选项数量
3. WHEN 处理大批量数据时，THE Matching_Algorithm SHALL 每100行显示一次进度
4. THE Matching_Algorithm SHALL 在匹配完成后显示总耗时和匹配成功率
5. THE Matching_Algorithm SHALL 支持批量处理至少1000行数据而不出现性能问题

### 需求 10：测试数据验证

**用户故事**：作为系统开发者，我希望使用真实的错误案例验证算法优化效果，确保问题得到解决。

#### 验收标准

1. THE Matching_Algorithm SHALL 正确匹配所有8个型号名称空格处理问题案例
2. THE Matching_Algorithm SHALL 正确匹配所有4个手表产品型号识别问题案例
3. THE Matching_Algorithm SHALL 正确匹配所有2个同型号多SKU混淆问题案例
4. THE Matching_Algorithm SHALL 正确匹配所有6个产品系列版本识别问题案例
5. THE Matching_Algorithm SHALL 在40个测试案例中达到至少95%的匹配准确率
