/**
 * Integration Test for SmartMatcher with all components
 * 测试 SmartMatcher 与所有组件的集成
 */

import { smartMatcher } from './smartMatcher.js';

console.log('=== SmartMatcher Integration Tests ===\n');

// Test 1: Space Handler Integration
console.log('Test 1: Space Handler Integration');
console.log('Input: "VivoS30Promini"');
const normalized1 = smartMatcher.normalizeSpaces('VivoS30Promini');
console.log('Normalized:', normalized1);
console.log('Expected: "Vivo S30 Pro mini"');
console.log('Pass:', normalized1.includes('S30') && normalized1.includes('Pro') && normalized1.includes('mini'));
console.log();

// Test 2: Watch Recognizer Integration
console.log('Test 2: Watch Recognizer Integration');
const watch1 = 'VIVO Watch GT (WA2456C) 蓝牙版 夏夜黑 软胶';
const watch2 = 'VIVO Watch GT WA2456C 软胶 夏夜黑 蓝牙版';
const watchScore = smartMatcher.calculateMatchScore(watch1, watch2);
console.log('Product 1:', watch1);
console.log('Product 2:', watch2);
console.log('Match Score:', watchScore);
console.log('Expected: High score (>0.9)');
console.log('Pass:', watchScore > 0.9);
console.log();

// Test 3: Version Extractor Integration
console.log('Test 3: Version Extractor Integration');
const version1 = 'VIVO X200 Pro 活力版 12GB+256GB 玉石绿';
const version2 = 'VIVO X200 Pro 标准版 12GB+256GB 玉石绿';
const versionScore = smartMatcher.calculateMatchScore(version1, version2);
console.log('Product 1:', version1);
console.log('Product 2:', version2);
console.log('Match Score:', versionScore);
console.log('Expected: Low score (<0.5) due to version mismatch');
console.log('Pass:', versionScore < 0.5);
console.log();

// Test 4: Model Disambiguator Integration
console.log('Test 4: Model Disambiguator Integration');
const model1 = 'VIVO X200 Pro 12GB+256GB 玉石绿';
const model2 = 'VIVO X200 Pro mini 12GB+256GB 玉石绿';
const modelScore = smartMatcher.calculateMatchScore(model1, model2);
console.log('Product 1:', model1);
console.log('Product 2:', model2);
console.log('Match Score:', modelScore);
console.log('Expected: Very low score (<0.3) due to model mismatch');
console.log('Pass:', modelScore < 0.3);
console.log();

// Test 5: Combined Integration Test
console.log('Test 5: Combined Integration Test');
const combined1 = 'VivoS30Promini 活力版 12GB+256GB 玉石绿';
const combined2 = 'Vivo S30 Pro mini 活力版 12GB+256GB 玉石绿';
const combinedScore = smartMatcher.calculateMatchScore(combined1, combined2);
console.log('Product 1:', combined1);
console.log('Product 2:', combined2);
console.log('Match Score:', combinedScore);
console.log('Expected: High score (>0.8) - same product with space normalization');
console.log('Pass:', combinedScore > 0.8);
console.log();

// Test 6: Negative Test - Different Models
console.log('Test 6: Negative Test - Different Models');
const diff1 = 'VIVO X200 Pro 12GB+256GB 玉石绿';
const diff2 = 'VIVO X200 12GB+256GB 玉石绿';
const diffScore = smartMatcher.calculateMatchScore(diff1, diff2);
console.log('Product 1:', diff1);
console.log('Product 2:', diff2);
console.log('Match Score:', diffScore);
console.log('Expected: Low score (<0.5) - different models');
console.log('Pass:', diffScore < 0.5);
console.log();

console.log('=== Integration Tests Complete ===');
