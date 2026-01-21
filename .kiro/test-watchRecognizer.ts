/**
 * Simple test runner for WatchRecognizer
 * 手表识别器简单测试运行器
 */

import { watchRecognizer } from './watchRecognizer';

console.log('=== Testing WatchRecognizer ===\n');

// Test 1: isWatchProduct
console.log('Test 1: isWatchProduct');
console.log('  VIVO Watch GT:', watchRecognizer.isWatchProduct('VIVO Watch GT'));
console.log('  华为手表:', watchRecognizer.isWatchProduct('华为手表'));
console.log('  iPhone 15:', watchRecognizer.isWatchProduct('iPhone 15'));
console.log('  Expected: true, true, false\n');

// Test 2: extractWatchModelCode
console.log('Test 2: extractWatchModelCode');
console.log('  VIVO Watch GT (WA2456C):', watchRecognizer.extractWatchModelCode('VIVO Watch GT (WA2456C)'));
console.log('  华为手表（WA1234D）:', watchRecognizer.extractWatchModelCode('华为手表（WA1234D）'));
console.log('  Watch without code:', watchRecognizer.extractWatchModelCode('Apple Watch'));
console.log('  Expected: WA2456C, WA1234D, null\n');

// Test 3: extractWatchAttributes
console.log('Test 3: extractWatchAttributes');
const attrs1 = watchRecognizer.extractWatchAttributes('VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm');
console.log('  Full product:', JSON.stringify(attrs1, null, 2));
console.log('  Expected: modelCode=WA2456C, connectionType=蓝牙版, color=夏夜黑, strapMaterial=软胶, size=46mm\n');

// Test 4: normalizeWatchAttributes
console.log('Test 4: normalizeWatchAttributes');
const normalized1 = watchRecognizer.normalizeWatchAttributes({
  size: '46mm',
  color: '黑色',
  modelCode: 'WA2456C',
  strapMaterial: '软胶',
  connectionType: '蓝牙版',
});
console.log('  Normalized (mixed order):', normalized1);
console.log('  Expected: WA2456C 蓝牙版 黑色 软胶 46mm\n');

// Test 5: compareWatchProducts
console.log('Test 5: compareWatchProducts');
const match1 = watchRecognizer.compareWatchProducts(
  'VIVO Watch GT (WA2456C) 蓝牙版 黑色',
  'Watch GT (WA2456C) eSIM版 白色'
);
console.log('  Same model code, different attributes:', match1);
console.log('  Expected: true\n');

const match2 = watchRecognizer.compareWatchProducts(
  'Watch (WA2456C)',
  'Watch (WA1234D)'
);
console.log('  Different model codes:', match2);
console.log('  Expected: false\n');

// Test 6: Real-world case from requirements
console.log('Test 6: Real-world case');
const product = 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶 46mm';
console.log('  Product:', product);
console.log('  Is watch?', watchRecognizer.isWatchProduct(product));

const attrs = watchRecognizer.extractWatchAttributes(product);
console.log('  Attributes:', JSON.stringify(attrs, null, 2));

const normalized = watchRecognizer.normalizeWatchAttributes(attrs);
console.log('  Normalized:', normalized);
console.log('  Expected normalized: WA2456C 蓝牙版 夏夜黑 软胶 46mm\n');

// Test 7: Attribute order invariance
console.log('Test 7: Attribute order invariance');
const product1 = 'Watch GT 蓝牙版 夏夜黑 软胶 (WA2456C)';
const product2 = 'Watch GT (WA2456C) 软胶 夏夜黑 蓝牙版';

const attrs7a = watchRecognizer.extractWatchAttributes(product1);
const attrs7b = watchRecognizer.extractWatchAttributes(product2);

const normalized7a = watchRecognizer.normalizeWatchAttributes(attrs7a);
const normalized7b = watchRecognizer.normalizeWatchAttributes(attrs7b);

console.log('  Product 1 normalized:', normalized7a);
console.log('  Product 2 normalized:', normalized7b);
console.log('  Are they equal?', normalized7a === normalized7b);
console.log('  Expected: true\n');

console.log('=== All tests completed ===');
