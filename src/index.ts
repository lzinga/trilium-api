// Main exports for the Trilium API client
export { 
  createTriliumClient, 
  default as createClient,
  // Mapper utilities
  TriliumMapper,
  buildSearchQuery,
  transforms,
} from './client.js';

// Re-export types
export type {
  TriliumNote,
  TriliumBranch,
  TriliumAttribute,
  TriliumAttachment,
  TriliumAppInfo,
  TriliumClientConfig,
  paths,
  components,
  // Mapper types
  MappingConfig,
  FieldMapping,
  TransformFunction,
  ComputedFunction,
  TriliumSearchHelpers,
  TriliumSearchConditions,
  TriliumSearchLogical,
  ComparisonOperator,
  ConditionValue,
  SearchValue,
} from './client.js';

// Re-export generated types for advanced usage
export type { operations } from './generated/trilium.js';