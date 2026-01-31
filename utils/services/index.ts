/**
 * Services Module Index
 * 
 * Exports all service classes for the SKU matching system.
 */

export { DataPreparationService } from './DataPreparationService';
export { InfoExtractor, type ExtractionResult } from './InfoExtractor';
export { PreprocessingService } from './PreprocessingService';
export { SPUMatcher } from './SPUMatcher';
export { SKUMatcher } from './SKUMatcher';
export { ExactMatcher } from './ExactMatcher';
export { FuzzyMatcher } from './FuzzyMatcher';
export { MatchingOrchestrator, type MatchResult, type BatchMatchResult } from './MatchingOrchestrator';

// Export types
export type {
  MatchExplanation,
  SPUMatchResult,
  SKUMatchResult,
  ExtractedInfo,
} from './types';

