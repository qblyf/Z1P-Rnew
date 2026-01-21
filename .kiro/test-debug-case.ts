import { smartMatcher } from './smartMatcher.js';
import { modelDisambiguator } from './modelDisambiguator.js';
import { versionExtractor } from './versionExtractor.js';

// Test case 1: 14 Ultra vs 14 Pro
console.log('=== Test Case 1: 14 Ultra vs 14 Pro ===');
const input1a = '小米14 Ultra 16GB+512GB 黑色';
const input1b = '小米14 Pro 16GB+512GB 黑色';

console.log('Input 1:', input1a);
console.log('Input 2:', input1b);

const model1a = modelDisambiguator.extractFullModel(input1a);
const model1b = modelDisambiguator.extractFullModel(input1b);
console.log('Model 1:', model1a);
console.log('Model 2:', model1b);

const modelScore1 = modelDisambiguator.calculateModelMatchScore(model1a, model1b);
console.log('Model Match Score:', modelScore1);

const finalScore1 = smartMatcher.calculateMatchScore(input1a, input1b);
console.log('Final Match Score:', finalScore1);
console.log('Expected: < 0.65');
console.log('Pass:', finalScore1 < 0.65);
console.log();

// Test case 2: Z10 Turbo+ vs Z10 Turbo
console.log('=== Test Case 2: Z10 Turbo+ vs Z10 Turbo ===');
const input2a = 'IQOO Z10 Turbo+ 12GB+256GB 黑色';
const input2b = 'IQOO Z10 Turbo 12GB+256GB 黑色';

console.log('Input 1:', input2a);
console.log('Input 2:', input2b);

const model2a = modelDisambiguator.extractFullModel(input2a);
const model2b = modelDisambiguator.extractFullModel(input2b);
console.log('Model 1:', model2a);
console.log('Model 2:', model2b);

const modelScore2 = modelDisambiguator.calculateModelMatchScore(model2a, model2b);
console.log('Model Match Score:', modelScore2);

const finalScore2 = smartMatcher.calculateMatchScore(input2a, input2b);
console.log('Final Match Score:', finalScore2);
console.log('Expected: < 0.65');
console.log('Pass:', finalScore2 < 0.65);

