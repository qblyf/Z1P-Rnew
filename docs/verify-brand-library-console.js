/**
 * 品牌库验证脚本
 * 在智能匹配页面的浏览器控制台中运行此脚本
 * 
 * 使用方法：
 * 1. 打开智能匹配页面
 * 2. 按 F12 打开控制台
 * 3. 复制此脚本并粘贴到控制台
 * 4. 按回车运行
 */

(async function verifyBrandLibrary() {
  console.log('=== 品牌库验证开始 ===\n');
  
  try {
    // 从页面获取品牌库数据
    // 注意：这需要在 SmartMatch 组件加载后运行
    
    // 方法1：从全局变量获取（如果有的话）
    // 方法2：重新调用 API
    const { getBrandBaseList } = await import('@zsqk/z1-sdk/es/z1p/brand');
    const brands = await getBrandBaseList();
    
    console.log(`✓ 成功加载 ${brands.length} 个品牌\n`);
    
    // 检查关键品牌
    console.log('=== 关键品牌检查 ===');
    const keyBrands = [
      { name: '红米', spell: 'redmi', required: true },
      { name: 'Redmi', spell: 'redmi', required: true },
      { name: '小米', spell: 'xiaomi', required: true },
      { name: 'Xiaomi', spell: 'xiaomi', required: false },
      { name: '一加', spell: 'oneplus', required: true },
      { name: 'OnePlus', spell: 'oneplus', required: false },
      { name: 'HUAWEI', spell: 'huawei', required: true },
      { name: '华为', spell: 'huawei', required: true },
      { name: 'HONOR', spell: 'honor', required: true },
      { name: '荣耀', spell: 'honor', required: true },
      { name: 'OPPO', spell: 'oppo', required: true },
      { name: 'vivo', spell: 'vivo', required: true },
      { name: 'Apple', spell: 'apple', required: true },
      { name: '苹果', spell: 'apple', required: false },
      { name: '三星', spell: 'samsung', required: false },
      { name: 'Samsung', spell: 'samsung', required: false },
      { name: '真我', spell: 'realme', required: false },
      { name: 'realme', spell: 'realme', required: false },
      { name: 'iQOO', spell: 'iqoo', required: false },
      { name: 'WIWU', spell: 'wiwu', required: true }
    ];
    
    let missingRequired = [];
    let missingOptional = [];
    
    keyBrands.forEach(({ name, spell, required }) => {
      const found = brands.find(b => b.name === name);
      if (found) {
        const spellMatch = found.spell === spell;
        console.log(`✓ ${name} (spell: ${found.spell || '无'}${spellMatch ? '' : ' ⚠️ 拼音不匹配'})`);
      } else {
        console.log(`✗ ${name} - 未找到`);
        if (required) {
          missingRequired.push(name);
        } else {
          missingOptional.push(name);
        }
      }
    });
    
    // 总结
    console.log('\n=== 验证结果 ===');
    if (missingRequired.length === 0) {
      console.log('✓ 所有必需品牌都已配置');
    } else {
      console.error(`❌ 缺少 ${missingRequired.length} 个必需品牌:`);
      missingRequired.forEach(name => console.error(`  - ${name}`));
    }
    
    if (missingOptional.length > 0) {
      console.warn(`⚠️ 缺少 ${missingOptional.length} 个可选品牌:`);
      missingOptional.forEach(name => console.warn(`  - ${name}`));
    }
    
    // 按拼音分组
    console.log('\n=== 拼音分组 ===');
    const spellGroups = {};
    brands.forEach(brand => {
      if (brand.spell) {
        if (!spellGroups[brand.spell]) {
          spellGroups[brand.spell] = [];
        }
        spellGroups[brand.spell].push(brand.name);
      }
    });
    
    // 只显示有多个品牌的拼音组
    Object.entries(spellGroups)
      .filter(([_, names]) => names.length > 1)
      .forEach(([spell, names]) => {
        console.log(`${spell}: ${names.join(', ')}`);
      });
    
    // 测试品牌识别
    console.log('\n=== 品牌识别测试 ===');
    
    // 注意：这里需要访问 SimpleMatcher 类
    // 如果无法访问，请跳过此部分
    try {
      const { SimpleMatcher } = await import('./utils/smartMatcher');
      const matcher = new SimpleMatcher();
      matcher.setBrandList(brands);
      
      const testCases = [
        { input: '红米15R 4+128星岩黑', expectedBrand: '红米', expectedModel: '15r' },
        { input: 'Redmi 15R 全网通5G版', expectedBrand: 'Redmi', expectedModel: '15r' },
        { input: '小米14 Ultra 16GB+512GB', expectedBrand: '小米', expectedModel: '14ultra' },
        { input: '一加 15 全网通5G版', expectedBrand: '一加', expectedModel: '15' },
        { input: 'WIWU 青春手提包电脑包15.6寸', expectedBrand: 'WIWU', expectedModel: null }
      ];
      
      let passCount = 0;
      let failCount = 0;
      
      testCases.forEach(({ input, expectedBrand, expectedModel }) => {
        const brand = matcher.extractBrand(input);
        const model = matcher.extractModel(input);
        
        const brandMatch = brand === expectedBrand;
        const modelMatch = expectedModel === null || model === expectedModel;
        const passed = brandMatch && modelMatch;
        
        if (passed) {
          passCount++;
          console.log(`✓ ${input}`);
        } else {
          failCount++;
          console.log(`✗ ${input}`);
          if (!brandMatch) {
            console.log(`  品牌: ${brand || '未识别'} (期望: ${expectedBrand})`);
          }
          if (!modelMatch) {
            console.log(`  型号: ${model || '未识别'} (期望: ${expectedModel || '任意'})`);
          }
        }
      });
      
      console.log(`\n测试结果: ${passCount}/${testCases.length} 通过`);
      
    } catch (error) {
      console.warn('⚠️ 无法运行品牌识别测试:', error.message);
      console.log('提示: 请确保在智能匹配页面运行此脚本');
    }
    
    console.log('\n=== 验证完成 ===');
    
    // 返回结果供进一步分析
    return {
      totalBrands: brands.length,
      missingRequired,
      missingOptional,
      brands
    };
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
    console.error('错误详情:', error.message);
    return null;
  }
})();
