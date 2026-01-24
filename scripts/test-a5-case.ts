import { SimpleMatcher } from '../utils/smartMatcher';

async function test() {
  const matcher = new SimpleMatcher();
  await matcher.initialize();
  
  const input = 'OPPO A5活力版(12+256)玉石绿';
  const result = matcher.preprocessInputAdvanced(input);
  
  console.log('输入:', input);
  console.log('结果:', result);
  console.log('');
  console.log('解析:');
  console.log('  品牌:', matcher.extractBrand(result));
  console.log('  型号:', matcher.extractModel(result));
  console.log('  版本:', matcher.extractVersion(result)?.name || 'null');
  console.log('  容量:', matcher.extractCapacity(result));
  console.log('  颜色:', matcher.extractColorAdvanced(result));
}

test().catch(console.error);
