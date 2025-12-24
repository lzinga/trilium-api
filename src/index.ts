// Main exports for the Trilium API client
export { 
  createTriliumClient, 
  default as createClient,
  // Mapper utilities
  buildSearchQuery,
  transforms,
  // Advanced: for standalone mapper use
  TriliumMapper,
  StandardNoteMapping,
} from './client.js';

// Re-export types
export type {
  // Trilium entity types
  TriliumNote,
  TriliumBranch,
  TriliumAttribute,
  TriliumAttachment,
  TriliumAppInfo,
  // Client types
  TriliumClientConfig,
  MappingFailure,
  // Mapping types
  StandardNote,
  CustomMapping,
  // Advanced: for standalone TriliumMapper use
  MappingConfig,
  // Query builder type (for typing query objects)
  TriliumSearchHelpers,
  // OpenAPI types for advanced usage
  paths,
  components,
} from './client.js';

// Re-export generated types for advanced usage
export type { operations } from './generated/trilium.js';